import 'reflect-metadata';
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createApp } from '../app.js';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { ensureBucket, readObject, storeObject, deleteObject, signDownload } from '../infrastructure/storage.js';
import { submitCertificate, processAttachment, purgeAttachment, appeal } from '../modules/absences/certificates.js';
import { decideCertificate } from '../modules/absences/absences.js';
import { fixture, at } from './fixture.js';
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/clinicapp_test');
assert.equal(process.env.S3_BUCKET, 'clinicapp-test');
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! } });
const Bucket = process.env.S3_BUCKET;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const clinics: string[] = [];
before(ensureBucket);
after(async () => {
  for (const clinicId of clinics) {
    const objects = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: `quarantine/${clinicId}/` }));
    for (const object of objects.Contents ?? []) await deleteObject(object.Key!);
  }
  s3.destroy(); await db.$disconnect();
});
async function setup() { const f = await fixture(); clinics.push(f.clinic.id); return f; }
function file(buffer = pdf): Express.Multer.File { return { buffer, size: buffer.length, originalname: 'ficticio.pdf', mimetype: 'application/pdf' } as Express.Multer.File; }
async function upload(f: Awaited<ReturnType<typeof fixture>>, buffer = pdf) {
  const a = await f.absence('PROVISIONAL', new Date(Date.now() + 86400000));
  const c = await submitCertificate(f.patient, { absenceId: a.id, category: 'SAUDE_PACIENTE', description: 'Documento fictício de teste' }, [file(buffer)]);
  const attachment = await db.attachment.findFirstOrThrow({ where: { certificateId: c.id } });
  return { a, c, attachment };
}
async function auth(ctx: Context) {
  const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
  await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 300000) } });
  return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' };
}

test('HTTP: upload, quarentena, arquivo cifrado, download autorizado, decisão e contestação única', async t => {
  const f = await setup(), g = await setup(), app = await createApp(); await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  const base = await app.getUrl() + '/api/v1';
  const patient = await auth(f.patient), admin = await auth(f.admin), reception = await auth(f.reception), foreign = await auth(g.admin);
  const a = await f.absence('PROVISIONAL', new Date(Date.now() + 86400000));
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'white' } }).withMetadata({ orientation: 6 }).png().toBuffer();
  const form = () => { const body = new FormData(); body.set('absenceId', a.id); body.set('category', 'SAUDE_PACIENTE'); body.set('description', 'Teste de envio e análise'); body.append('files', new Blob([new Uint8Array(png)]), 'documento.png'); return body; };
  assert.equal((await fetch(base + '/certificates', { method: 'POST', headers: { ...patient, 'x-csrf-token': '' }, body: form() })).status, 403);
  const response = await fetch(base + '/certificates', { method: 'POST', headers: patient, body: form() }); assert.equal(response.status, 201);
  const c = await response.json(), attachment = await db.attachment.findFirstOrThrow({ where: { certificateId: c.id } });
  assert.deepEqual((await db.notification.findMany({ where: { entityId: c.id, event: 'certificate-submitted' }, select: { userId: true } })).map(n => n.userId).sort(), [f.admin.userId, f.therapist.userId].sort());
  for (const files of [[Buffer.alloc(10 * 1024 * 1024 + 1)], [pdf, pdf, pdf, pdf]]) {
    const body = form(); body.delete('files');
    for (const buffer of files) body.append('files', new Blob([new Uint8Array(buffer)]), 'documento.pdf');
    const limited = await fetch(base + '/certificates', { method: 'POST', headers: patient, body });
    assert.ok([400, 413].includes(limited.status));
  }
  const post = (path: string, body = {}, headers = patient) => fetch(base + path, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post(`/attachments/${attachment.id}/url`)).status, 409);
  const encrypted = await s3.send(new GetObjectCommand({ Bucket, Key: attachment.objectKey }));
  assert.notDeepEqual(Buffer.from(await encrypted.Body!.transformToByteArray()), png);
  await Promise.all([processAttachment(attachment.id), processAttachment(attachment.id)]);
  const cleaned = await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } });
  assert.equal(cleaned.status, 'CLEAN'); assert.equal(cleaned.mime, 'image/png');
  const bytes = await readObject(attachment.objectKey), metadata = await sharp(bytes).metadata();
  assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined);
  assert.equal(cleaned.size, bytes.length); assert.equal(cleaned.hash, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(await db.audit.count({ where: { entityId: attachment.id, action: 'attachment-clean' } }), 1);
  const urlResponse = await post(`/attachments/${attachment.id}/url`); assert.equal(urlResponse.status, 201);
  const { url } = await urlResponse.json();
  assert.equal((await fetch(await app.getUrl() + url, { headers: patient })).status, 200);
  const issued = await db.audit.findFirstOrThrow({ where: { entityId: attachment.id, action: 'download-url-issued' } });
  const attempted = await db.audit.findFirstOrThrow({ where: { entityId: attachment.id, action: 'download-attempt' } });
  for (const row of [issued, attempted]) assert.match((row.context as { origin: string }).origin, /127\.0\.0\.1/);
  assert.equal((await fetch(await app.getUrl() + url, { headers: admin })).status, 403);
  const expired = Date.now() - 1;
  assert.equal((await fetch(`${base}/attachments/${attachment.id}/download?expires=${expired}&signature=${signDownload(attachment.id, f.patient.userId, expired)}`, { headers: patient })).status, 403);
  assert.equal((await post(`/attachments/${attachment.id}/url`, {}, reception)).status, 403);
  assert.equal((await post(`/attachments/${attachment.id}/url`, {}, foreign)).status, 404);
  assert.equal((await post(`/certificates/${c.id}/decision`, { decision: 'reject', reason: 'Documento necessita correção' }, patient)).status, 403);
  assert.equal((await post(`/certificates/${c.id}/decision`, { decision: 'reject', reason: 'Documento necessita correção' }, admin)).status, 201);
  assert.equal((await post(`/certificates/${c.id}/appeal`, { reason: 'Solicito reanálise do documento' })).status, 201);
  assert.equal((await post(`/certificates/${c.id}/decision`, { decision: 'reject', reason: 'Reanálise concluída com motivo' }, admin)).status, 201);
  assert.equal((await post(`/certificates/${c.id}/appeal`, { reason: 'Nova contestação não permitida' })).status, 409);
  assert.deepEqual((await db.notification.findMany({ where: { entityId: c.id, event: 'certificate-appealed' }, select: { userId: true } })).map(n => n.userId).sort(), [f.admin.userId, f.therapist.userId].sort());
  await db.membership.update({ where: { id: f.patient.id }, data: { active: false } });
  assert.equal((await fetch(await app.getUrl() + url, { headers: patient })).status, 401);
});

test('validação de anexos, prazo, categoria, isolamento e duplicidade concorrente sem objetos órfãos', async () => {
  const f = await setup(), g = await setup(), a = await f.absence('PROVISIONAL', new Date(Date.now() + 86400000));
  const body = { absenceId: a.id, category: 'SAUDE_PACIENTE', description: 'Teste de validação' };
  for (const files of [[], [file(Buffer.from('falso PDF'))], [file(), file(), file(), file()], [{ ...file(), size: 11 * 1024 * 1024 }]]) await assert.rejects(submitCertificate(f.patient, body, files));
  await assert.rejects(submitCertificate(g.patient, body, [file()]));
  await assert.rejects(submitCertificate(f.reception, body, [file()]));
  await assert.rejects(submitCertificate(f.patient, { ...body, category: 'INVALID' }, [file()]));
  const results = await Promise.allSettled([submitCertificate(f.patient, body, [file()]), submitCertificate(f.patient, body, [file()])]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const objects = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: `quarantine/${f.clinic.id}/` }));
  assert.equal(objects.KeyCount, 1);
  const overdue = await f.absence('PROVISIONAL', new Date(Date.now() - 1000));
  await assert.rejects(submitCertificate(f.patient, { ...body, absenceId: overdue.id }, [file()]));
  const optional = await f.absence('PROVISIONAL', new Date(Date.now() + 86400000));
  await submitCertificate(f.patient, { ...body, absenceId: optional.id, category: 'OUTRO' }, []);
});

test('scanner e armazenamento indisponíveis mantêm quarentena e permitem reprocessamento', async () => {
  const f = await setup(), { attachment } = await upload(f);
  await deleteObject(attachment.objectKey);
  await assert.rejects(processAttachment(attachment.id), /ATTACHMENT_PROCESSING_PENDING/);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'QUARANTINED');
  await storeObject(attachment.objectKey, pdf);
  const previous = process.env.CLAMAV_PORT;
  const server = createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port; await new Promise<void>(r => server.close(() => r()));
  try { process.env.CLAMAV_PORT = String(port); await assert.rejects(processAttachment(attachment.id), /ATTACHMENT_PROCESSING_PENDING/); }
  finally { process.env.CLAMAV_PORT = previous; }
  await processAttachment(attachment.id);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'CLEAN');
  const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).jpeg().toBuffer();
  const converted = await upload(f, jpeg); await processAttachment(converted.attachment.id);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: converted.attachment.id } })).mime, 'image/png');
});

test('malware é rejeitado pelo ClamAV real; conversão inválida permanece em quarentena', async () => {
  const f = await setup(), { attachment } = await upload(f);
  // Assinatura inofensiva padrão de teste de antimalware (EICAR), nunca código executável.
  const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  await storeObject(attachment.objectKey, eicar);
  await processAttachment(attachment.id);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'REJECTED');
  await processAttachment(attachment.id);
  const invalid = await upload(f);
  await db.attachment.update({ where: { id: invalid.attachment.id }, data: { mime: 'image/heic' } });
  await assert.rejects(processAttachment(invalid.attachment.id), /ATTACHMENT_PROCESSING_PENDING/);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: invalid.attachment.id } })).status, 'QUARANTINED');
});

test('expurgo concorre com processamento sem recriar objetos e respeita retenção e contestação', async () => {
  const f = await setup(), { c, attachment } = await upload(f);
  await purgeAttachment(attachment.id, at);
  assert.ok(await readObject(attachment.objectKey));
  await transaction(f.admin, tx => decideCertificate(tx, f.admin, c.id, 'reject', 'Teste de retenção', false, new Date()));
  await purgeAttachment(attachment.id);
  assert.ok(await readObject(attachment.objectKey));
  await appeal(f.patient, c.id, 'Contestação dentro do prazo');
  await purgeAttachment(attachment.id, at);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).purgedAt, null);
  await transaction(f.admin, tx => decideCertificate(tx, f.admin, c.id, 'approve', '', false, new Date('2020-01-01')));
  await Promise.all([processAttachment(attachment.id), purgeAttachment(attachment.id), purgeAttachment(attachment.id)]);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'PURGED');
  await assert.rejects(readObject(attachment.objectKey));
  await processAttachment(attachment.id); await assert.rejects(readObject(attachment.objectKey));
  assert.equal(await db.audit.count({ where: { entityId: attachment.id, action: 'attachment-purged' } }), 1);
  const revoked = await upload(f); await db.membership.update({ where: { id: f.patient.id }, data: { active: false } });
  await processAttachment(revoked.attachment.id);
  assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: revoked.attachment.id } })).status, 'QUARANTINED');
});

test('expurgo aguarda scanner em andamento e nenhum objeto reaparece após a exclusão', async () => {
  const f = await setup(), { c, attachment } = await upload(f);
  await transaction(f.admin, tx => decideCertificate(tx, f.admin, c.id, 'approve', '', false, new Date('2020-01-01')));
  let reached!: () => void, release!: () => void;
  const scanning = new Promise<void>(resolve => { reached = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const server = createServer(socket => { socket.once('data', () => { reached(); void gate.then(() => socket.end('stream: OK\0')); }); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const previous = process.env.CLAMAV_PORT;
  process.env.CLAMAV_PORT = String((server.address() as { port: number }).port);
  const processing = processAttachment(attachment.id);
  let purging: Promise<void> | undefined;
  try {
    await scanning;
    purging = purgeAttachment(attachment.id);
    await until(async () => {
      const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory'`;
      return Number(rows[0].count) > 0;
    }, 5000);
    assert.ok(await readObject(attachment.objectKey));
    release(); await Promise.all([processing, purging]);
    await assert.rejects(readObject(attachment.objectKey));
    assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'PURGED');
  } finally {
    release(); await Promise.allSettled([processing, ...(purging ? [purging] : [])]);
    process.env.CLAMAV_PORT = previous; await new Promise<void>(r => server.close(() => r()));
  }
});

async function until(check: () => Promise<boolean>, timeout = 90000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(500); }
  assert.fail('Condição do worker não atingida dentro do prazo');
}
test('worker real consome outbox, repete falha de scanner e conclui após recuperação', { timeout: 120000 }, async () => {
  const f = await setup(), { attachment } = await upload(f);
  const server = createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port; await new Promise<void>(r => server.close(() => r()));
  const start = (badScanner: boolean) => spawn(process.execPath, ['dist/worker.js'], { env: { ...process.env, ...(badScanner ? { CLAMAV_PORT: String(port) } : {}) }, stdio: 'ignore' });
  let child = start(true);
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = once(child, 'exit'); child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 15000);
    try { await closed; } finally { clearTimeout(force); }
  }
  try {
    await until(async () => await db.audit.count({ where: { entityId: attachment.id, action: 'attachment-processing-pending' } }) > 0);
    assert.equal((await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status, 'QUARANTINED');
    await stop(); child = start(false);
    await until(async () => (await db.attachment.findUniqueOrThrow({ where: { id: attachment.id } })).status === 'CLEAN');
    assert.equal(await db.audit.count({ where: { entityId: attachment.id, action: 'attachment-clean' } }), 1);
    assert.ok(await db.outbox.findFirst({ where: { clinicId: f.clinic.id, kind: 'attachment', dispatchedAt: { not: null } } }));
  } finally { await stop(); }
});
