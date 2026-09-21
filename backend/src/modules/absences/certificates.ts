import { BadRequestException, ConflictException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID, createHash } from 'node:crypto';
import { DateTime } from 'luxon';
import sharp from 'sharp';
import { db, transaction, audit, notify, now, type Context } from '../../infrastructure/db.js';
import { certificate, roles } from '../../infrastructure/access.js';
import { storeObject, readObject, deleteObject, scan } from '../../infrastructure/storage.js';
export const categories = ['SAUDE_PACIENTE', 'SAUDE_DEPENDENTE', 'EMERGENCIA_FAMILIAR', 'COMPROMISSO_PROFISSIONAL', 'DESLOCAMENTO', 'FORCA_MAIOR', 'OUTRO'];
export interface Submission { absenceId: string; category: string; description: string; declaredDate?: string }
export async function submitCertificate(ctx: Context, body: Submission, files: Express.Multer.File[], at = now()) {
  roles(ctx, 'PATIENT');
  if (!categories.includes(body.category) || body.description.trim().length < 5) throw new BadRequestException('Selecione a categoria e descreva o motivo.');
  if (files.length > 3 || files.some(f => f.size > 10 * 1024 * 1024 || !f.size)) throw new BadRequestException('Envie até três arquivos, cada um com no máximo 10 MB.');
  if (ctx.clinic.requiredCategories.includes(body.category) && !files.length) throw new BadRequestException('Esta categoria exige um documento comprobatório.');
  const absence = await db.absence.findFirst({ where: { id: body.absenceId, clinicId: ctx.clinicId, patientId: ctx.id } });
  if (!absence || at > absence.deadline) throw new ConflictException('O prazo terminou ou a falta não pertence a este perfil. Fale com a clínica.');
  const prepared: { id: string; objectKey: string; mime: string; size: number; hash: string; buffer: Buffer }[] = [];
  for (const file of files) {
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(detected.mime)) throw new BadRequestException('O conteúdo do arquivo deve ser PDF, JPG, PNG ou HEIC.');
    const id = randomUUID(), objectKey = `quarantine/${ctx.clinicId}/${id}`;
    prepared.push({ id, objectKey, mime: detected.mime, size: file.size, hash: createHash('sha256').update(file.buffer).digest('hex'), buffer: file.buffer });
  }
  // S3 fora da transação curta; falha remove objetos preparados, mantendo a operação repetível.
  try {
    for (const file of prepared) await storeObject(file.objectKey, file.buffer);
    const result = await transaction(ctx, async tx => {
      const a = await tx.absence.findFirst({ where: { id: body.absenceId, clinicId: ctx.clinicId, patientId: ctx.id } });
      if (!a || now() > a.deadline) throw new ConflictException('O prazo de envio terminou.');
      if (await tx.certificate.findUnique({ where: { absenceId: a.id } })) throw new ConflictException('Esta falta já possui justificativa. Consulte o acompanhamento.');
      const c = await tx.certificate.create({ data: { clinicId: ctx.clinicId, absenceId: a.id, patientId: ctx.id, category: body.category, description: body.description, declaredDate: body.declaredDate, submittedAt: at, reviewAt: DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).plus({ days: ctx.clinic.reviewDays }).toJSDate() } });
      for (const { buffer: _buffer, ...file } of prepared) { await tx.attachment.create({ data: { ...file, clinicId: ctx.clinicId, certificateId: c.id } }); await tx.outbox.create({ data: { kind: 'attachment', clinicId: ctx.clinicId, payload: { id: file.id } } }); }
      await audit(tx, ctx, 'certificate-submitted', c.id, { prevalidation: 'Data declarada; não extraída do arquivo. Verificação inconclusiva.' });
      const reviewers = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, active: true, role: 'ADMIN', canReview: true } });
      for (const reviewer of reviewers) await notify(tx, ctx, reviewer.userId, 'certificate-submitted', c.id);
      return c;
    }); return result;
  } catch (error) { await Promise.allSettled(prepared.map(f => deleteObject(f.objectKey))); throw error; }
}
export async function appeal(ctx: Context, id: string, reason: string, at = now()) {
  roles(ctx, 'PATIENT'); return transaction(ctx, async tx => {
    const c = await certificate(tx, ctx, id);
    if (c.status === 'PENDING' && c.appealAt) return c;
    if (c.status !== 'REJECTED' || c.appealAt || !c.decidedAt || at > DateTime.fromJSDate(c.decidedAt, { zone: ctx.clinic.timezone }).plus({ days: 7 }).toJSDate()) throw new ConflictException('A contestação única está indisponível ou fora do prazo.');
    await tx.absence.update({ where: { id: c.absenceId }, data: { state: 'PROVISIONAL' } });
    const updated = await tx.certificate.update({ where: { id }, data: { status: 'PENDING', appealAt: at, reason, reviewAt: DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).plus({ days: ctx.clinic.reviewDays }).toJSDate() } });
    await audit(tx, ctx, 'certificate-appealed', id); return updated;
  });
}
export async function processAttachment(id: string) {
  const retry = await db.$transaction(async tx => {
    // ponytail: lock por anexo durante I/O; usar lease se o volume exigir transações menores.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attachment:${id}`}))`;
    const a = await tx.attachment.findUnique({ where: { id } });
    if (!a || a.status === 'CLEAN' || a.status === 'REJECTED' || a.purgedAt) return false;
    const c = await tx.certificate.findFirstOrThrow({ where: { id: a.certificateId, clinicId: a.clinicId } });
    const active = () => tx.membership.findFirst({ where: { id: c.patientId, clinicId: a.clinicId, active: true, role: 'PATIENT' } });
    if (!await active()) return false;
    try {
      let bytes = await readObject(a.objectKey); await scan(bytes);
      if (a.mime.startsWith('image/')) bytes = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().png().toBuffer();
      if (!await active()) return false;
      if (bytes.length > 10 * 1024 * 1024) throw new Error('CONVERTED_FILE_TOO_LARGE');
      await storeObject(a.objectKey, bytes);
      await tx.attachment.update({ where: { id }, data: { status: 'CLEAN', mime: a.mime.startsWith('image/') ? 'image/png' : a.mime, size: bytes.length, hash: createHash('sha256').update(bytes).digest('hex'), failure: null } });
      await audit(tx, { clinicId: a.clinicId, id: 'SYSTEM' }, 'attachment-clean', id);
      return false;
    } catch (error) {
      const malware = error instanceof Error && error.message === 'MALWARE_FOUND';
      await tx.attachment.update({ where: { id }, data: { status: malware ? 'REJECTED' : 'QUARANTINED', failure: malware ? 'Arquivo inseguro. Solicite orientação à clínica.' : 'Verificação pendente: scanner, armazenamento ou conversão indisponível.' } });
      await audit(tx, { clinicId: a.clinicId, id: 'SYSTEM' }, malware ? 'attachment-rejected' : 'attachment-processing-pending', id);
      return !malware;
    }
  }, { timeout: 60000 });
  if (retry) throw new Error('ATTACHMENT_PROCESSING_PENDING');
}

export async function purgeAttachment(id: string, at = now()) {
  const original = await db.attachment.findUnique({ where: { id } });
  if (!original || original.purgedAt) return;
  await db.$transaction(async tx => {
    // Decisão/contestação e expurgo compartilham o lock da clínica; processamento usa o do anexo.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${original.clinicId}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attachment:${id}`}))`;
    const a = await tx.attachment.findUniqueOrThrow({ where: { id } });
    if (a.purgedAt) return;
    const clinic = await tx.clinic.findUniqueOrThrow({ where: { id: a.clinicId } });
    const c = await tx.certificate.findFirstOrThrow({ where: { id: a.certificateId, clinicId: a.clinicId } });
    if (c.status === 'PENDING' || !c.decidedAt || c.decidedAt >= DateTime.fromJSDate(at).minus({ days: clinic.retentionDays }).toJSDate()) return;
    await deleteObject(a.objectKey);
    await tx.attachment.update({ where: { id }, data: { purgedAt: at, status: 'PURGED' } });
    await audit(tx, { clinicId: a.clinicId, id: 'SYSTEM' }, 'attachment-purged', id);
  }, { timeout: 60000 });
}
