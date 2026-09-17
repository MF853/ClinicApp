import { BadRequestException, ConflictException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { type Context, type Tx, now, audit, notify } from '../../infrastructure/db.js';
import { appointment, patient, roles, certificate } from '../../infrastructure/access.js';
import { businessDeadline } from '../../infrastructure/time.js';
export async function countAbsences(tx: Tx, ctx: Context, patientId: string, at = now()) {
  const p = await patient(tx, ctx, patientId);
  const from = DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).minus({ days: ctx.clinic.evaluationDays }).toJSDate();
  return { count: await tx.absence.count({ where: { clinicId: ctx.clinicId, patientId, state: 'CONSOLIDATED', occurredAt: { gte: p.resetAt && p.resetAt > from ? p.resetAt : from } } }), limit: p.absenceLimit ?? ctx.clinic.absenceLimit, suspendedUntil: p.suspendedUntil };
}
export async function recordAbsence(tx: Tx, ctx: Context, a: Awaited<ReturnType<typeof appointment>>, reason: string, _at = now()) {
  const p = await tx.membership.findUniqueOrThrow({ where: { id: a.patientId } });
  return tx.absence.upsert({ where: { appointmentId: a.id }, update: {}, create: { clinicId: ctx.clinicId, appointmentId: a.id, patientId: a.patientId, occurredAt: a.occurrence.startsAt, deadline: businessDeadline(a.occurrence.startsAt, p.justificationDays ?? ctx.clinic.justificationDays, ctx.clinic.timezone, ctx.clinic.holidays), reason } });
}
export async function attendance(tx: Tx, ctx: Context, id: string, outcome: 'attended' | 'absent', at = now()) {
  roles(ctx, 'THERAPIST'); const a = await appointment(tx, ctx, id);
  const status = outcome === 'attended' ? 'ATTENDED' : 'ABSENT';
  if (a.status === status) return a;
  if (at < a.occurrence.startsAt || !['CONFIRMED', 'EXPIRED', 'PENDING', 'SCHEDULED'].includes(a.status)) throw new ConflictException('O comparecimento só pode ser registrado após o início de uma consulta ativa.');
  const updated = await tx.appointment.update({ where: { id }, data: { status } });
  if (outcome === 'absent') await recordAbsence(tx, ctx, a, 'NO_SHOW', at);
  await audit(tx, ctx, 'attendance', id, { before: a.status, after: status }); return updated;
}
export async function consequence(tx: Tx, ctx: Context, patientId: string, action: 'apply' | 'suspend' | 'reset' | 'reactivate', reason: string, until?: string, at = now()) {
  roles(ctx, 'ADMIN', 'THERAPIST'); if (reason.trim().length < 5) throw new BadRequestException('Descreva o motivo da decisão.');
  const p = await patient(tx, ctx, patientId);
  const current = await countAbsences(tx, ctx, patientId, at);
  if (action === 'apply' && (current.count < current.limit || (current.suspendedUntil && current.suspendedUntil > at))) throw new ConflictException('A consequência não está disponível para este paciente.');
  if (action === 'suspend') {
    const date = until ? new Date(until) : null; if (!date || !Number.isFinite(date.getTime()) || date <= at) throw new BadRequestException('Informe uma data futura para a suspensão.');
    await tx.membership.update({ where: { id: patientId }, data: { suspendedUntil: date } });
  } else if (action === 'reset') await tx.membership.update({ where: { id: patientId }, data: { resetAt: at } });
  else if (action === 'apply') {
    const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, ...(ctx.role === 'THERAPIST' ? { therapistId: ctx.id } : {}) }, select: { id: true } });
    await tx.fixedAssignment.updateMany({ where: { clinicId: ctx.clinicId, patientId, slotId: { in: slots.map(s => s.id) } }, data: { active: false } });
    const occurrences = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: { in: slots.map(s => s.id) }, startsAt: { gt: at } }, select: { id: true } });
    await tx.appointment.updateMany({ where: { clinicId: ctx.clinicId, patientId, occurrenceId: { in: occurrences.map(o => o.id) }, status: { in: ['SCHEDULED', 'PENDING', 'EXPIRED'] } }, data: { status: 'CANCELLED', cancelledAt: at } });
  } else {
    // Reativação exige alocação explícita com nova verificação de capacidade; nunca reocupar o slot às cegas.
    await tx.membership.update({ where: { id: patientId }, data: { suspendedUntil: null } });
  }
  await audit(tx, ctx, `consequence-${action}`, patientId, { reason, count: current.count, until: until ?? null });
  await notify(tx, ctx, p.userId, `consequence-${action}`, `${patientId}:${at.toISOString()}`); return { ok: true };
}
export async function decideCertificate(tx: Tx, ctx: Context, id: string, decision: 'approve' | 'reject', reason: string, automatic = false, at = now()) {
  const c = automatic ? await tx.certificate.findFirstOrThrow({ where: { id, clinicId: ctx.clinicId } }) : await certificate(tx, ctx, id, true);
  if (c.status !== 'PENDING') return c;
  if (automatic && at < c.reviewAt) throw new ConflictException('O prazo de análise ainda está em curso.');
  if (decision === 'reject' && reason.trim().length < 5) throw new BadRequestException('Informe o motivo da rejeição para orientar o paciente.');
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const result = await tx.certificate.update({ where: { id }, data: { status, decidedAt: at, decidedBy: automatic ? 'SYSTEM' : ctx.id, reason } });
  const absence = await tx.absence.update({ where: { id: c.absenceId }, data: { state: decision === 'approve' ? 'EXCUSED' : 'CONSOLIDATED' } });
  await tx.appointment.update({ where: { id: absence.appointmentId }, data: { status: decision === 'approve' ? 'EXCUSED' : 'ABSENT' } });
  await audit(tx, { ...ctx, id: automatic ? 'SYSTEM' : ctx.id }, `certificate-${status}`, id, { reason: automatic ? reason : 'Decisão registrada no atestado', reviewAt: c.reviewAt.toISOString() });
  const p = await tx.membership.findUniqueOrThrow({ where: { id: c.patientId } }); await notify(tx, ctx, p.userId, 'certificate-decided', `${id}:${at.toISOString()}`); return result;
}
export async function consolidate(tx: Tx, ctx: Context, at = now()) {
  const due = await tx.absence.findMany({ where: { clinicId: ctx.clinicId, state: 'PROVISIONAL', deadline: { lt: at } } });
  for (const absence of due) {
    const c = await tx.certificate.findUnique({ where: { absenceId: absence.id } });
    if (c?.status === 'PENDING' || c?.status === 'APPROVED') continue;
    await tx.absence.update({ where: { id: absence.id }, data: { state: 'CONSOLIDATED' } }); await audit(tx, { ...ctx, id: 'SYSTEM' }, 'absence-consolidated', absence.id);
    const p = await tx.membership.findUniqueOrThrow({ where: { id: absence.patientId } });
    const count = await countAbsences(tx, ctx, absence.patientId, at);
    await notify(tx, ctx, p.userId, count.count >= count.limit ? 'absence-limit' : count.count === count.limit - 1 ? 'absence-warning' : 'absence-consolidated', absence.id);
  }
  const certificates = await tx.certificate.findMany({ where: { clinicId: ctx.clinicId, status: 'PENDING', reviewAt: { lte: at } } });
  for (const c of certificates) await decideCertificate(tx, ctx, c.id, 'approve', `Aprovação por decurso de ${ctx.clinic.reviewDays} dias corridos desde o envio válido; sem avaliação humana de mérito.`, true, at);
}
