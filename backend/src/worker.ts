import { PgBoss } from 'pg-boss';
import nodemailer from 'nodemailer';
import { DateTime } from 'luxon';
import { db, systemTransaction } from './infrastructure/db.js';
import { decrypt } from './infrastructure/crypto.js';
import { ensureBucket, deleteObject } from './infrastructure/storage.js';
import { advanceConfirmation } from './modules/confirmation/confirmation.js';
import { consolidate } from './modules/absences/absences.js';
import { materialize } from './modules/schedule/schedule.js';
import { processAttachment } from './modules/absences/certificates.js';
const boss = new PgBoss(process.env.DATABASE_URL!);
boss.on('error', () => console.error('{"event":"queue-error"}'));
const mail = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 1025), secure: false, disableFileAccess: true, disableUrlAccess: true });
await boss.start();
for (const name of ['tick', 'outbox', 'notification', 'attachment', 'password-reset']) await boss.createQueue(name, { retryLimit: 8, retryDelay: 15, retryBackoff: true });
await ensureBucket();
await boss.work<{ id: string }>('attachment', async jobs => { for (const job of jobs) await processAttachment(job.data.id); });
await boss.work<{ id: string }>('notification', async jobs => {
for (const job of jobs) {
    const n = await db.notification.findUnique({ where: { id: job.data.id } }); if (!n || n.sentAt) continue;
    const member = await db.membership.findFirst({ where: { clinicId: n.clinicId, userId: n.userId, active: true } }); if (!member) continue;
    if (n.event === 'confirmation-open') { const a = await db.appointment.findFirst({ where: { id: n.entityId, clinicId: n.clinicId, status: 'PENDING', closesAt: { gt: new Date() } } }); if (!a) continue; }
    const user = await db.user.findUniqueOrThrow({ where: { id: n.userId } });
    await db.notification.update({ where: { id: n.id }, data: { attempts: { increment: 1 } } });
    try { await mail.sendMail({ from: 'ClinicApp <avisos@clinicapp.example.test>', to: user.email, subject: 'Uma atualização no ClinicApp', text: `Há uma atualização no seu atendimento. Acesse ${process.env.APP_URL} para consultar os detalhes.`, messageId: `<${Buffer.from(n.id).toString('base64url')}@clinicapp.example.test>` }); await db.notification.update({ where: { id: n.id }, data: { sentAt: new Date(), failure: null } }); } catch { await db.notification.update({ where: { id: n.id }, data: { failure: 'Falha no provedor de e-mail' } }); throw new Error('EMAIL_RETRY'); }
  }
});
await boss.work<{ id: string }>('password-reset', async jobs => { for (const job of jobs) { const row = await db.outbox.findUnique({ where: { id: job.data.id } }); const data = row?.payload as { userId?: string; encryptedToken?: string } | undefined; if (!data?.userId || !data.encryptedToken) continue; const token = decrypt(Buffer.from(data.encryptedToken, 'base64')).toString(); const user = await db.user.findUniqueOrThrow({ where: { id: data.userId } }); await mail.sendMail({ from: 'ClinicApp <avisos@clinicapp.example.test>', to: user.email, subject: 'Recuperar sua senha', text: `Para criar uma nova senha, acesse ${process.env.APP_URL}/recuperar#token=${token}. O link vale por 30 minutos e só pode ser usado uma vez.` }); await db.outbox.update({ where: { id: row!.id }, data: { payload: { userId: user.id, delivered: true } } }); } });
await boss.work('outbox', async () => {
  const rows = await db.outbox.findMany({ where: { dispatchedAt: null }, orderBy: { createdAt: 'asc' }, take: 100 });
  for (const row of rows) { if (!['notification', 'attachment', 'password-reset'].includes(row.kind)) throw new Error('UNKNOWN_OUTBOX_KIND'); const payload = row.kind === 'password-reset' ? { id: row.id } : row.payload as { id: string }; await boss.send(row.kind, payload, { id: row.id.includes(':') ? undefined : row.id, singletonKey: row.id }); await db.outbox.update({ where: { id: row.id }, data: { dispatchedAt: new Date() } }); }
});
await boss.work('tick', async () => {
  for (const clinic of await db.clinic.findMany()) {
    await systemTransaction(clinic.id, async (tx, ctx) => { await materialize(tx, ctx); await advanceConfirmation(tx, ctx); await consolidate(tx, ctx); });
    const expired = await db.certificate.findMany({ where: { clinicId: clinic.id, decidedAt: { lt: DateTime.now().minus({ days: clinic.retentionDays }).toJSDate() }, status: { not: 'PENDING' } }, select: { id: true } });
    const attachments = await db.attachment.findMany({ where: { clinicId: clinic.id, certificateId: { in: expired.map(c => c.id) }, purgedAt: null } });
    for (const a of attachments) { await deleteObject(a.objectKey); await db.attachment.update({ where: { id: a.id }, data: { purgedAt: new Date(), status: 'PURGED' } }); await db.audit.create({ data: { clinicId: clinic.id, actor: 'SYSTEM', action: 'attachment-purged', entityId: a.id } }); }
  }
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
});
await boss.schedule('tick', '* * * * *'); await boss.schedule('outbox', '* * * * *'); await boss.send('tick'); await boss.send('outbox');
console.log('{"event":"worker-ready"}');
let stopping = false; for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { if (stopping) return; stopping = true; await boss.stop(); await db.$disconnect(); process.exit(0); });
