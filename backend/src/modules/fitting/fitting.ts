import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { type Context, type Tx, now, audit, notify } from '../../infrastructure/db.js';
import { appointment, roles, blockedSession } from '../../infrastructure/access.js';
import { ageAt, confirmationWindow } from '../../infrastructure/time.js';
export const occupiedStates = ['SCHEDULED', 'PENDING', 'EXPIRED', 'CONFIRMED', 'ATTENDED'] as const;
export async function occupancy(tx: Tx, id: string) {
  const [appointments, reservations] = await Promise.all([tx.appointment.count({ where: { occurrenceId: id, status: { in: [...occupiedStates] } } }), tx.reservation.count({ where: { occurrenceId: id, active: true } })]); return appointments + reservations;
}
export async function eligible(tx: Tx, ctx: Context, originalId: string | null, occurrenceId: string, at = now(), excludeReservation = false, patientId = ctx.id) {
  const original = originalId ? await appointment(tx, ctx, originalId) : null;
  if (original && !['CANCELLED', 'EXCUSED'].includes(original.status)) throw new BadRequestException('A reposição está disponível para cancelamento antecipado ou falta abonada.');
  const o = await tx.occurrence.findFirst({ where: { id: occurrenceId, clinicId: ctx.clinicId } }); if (!o) throw new NotFoundException();
  const slot = await tx.slot.findUniqueOrThrow({ where: { id: o.slotId } });
  if ((original && slot.therapistId !== original.slot.therapistId) || o.blocked || slot.blocked || o.startsAt <= at || (slot.capacity > 1 && !slot.groupOffering)) throw new ConflictException('Este horário não está disponível para encaixe.');
  if (!await tx.membership.findFirst({ where: { id: slot.therapistId, clinicId: ctx.clinicId, role: 'THERAPIST', active: true } })) throw new ConflictException('O terapeuta não está ativo nesta clínica.');
  const p = await tx.membership.findFirstOrThrow({ where: { id: original?.patientId ?? patientId, clinicId: ctx.clinicId, role: 'PATIENT', active: true } });
  if (!original && !excludeReservation && !await blockedSession(tx, ctx, p.id, slot.therapistId)) throw new ConflictException('O atendimento avulso está disponível com terapeutas de suas sessões bloqueadas.');
  if (confirmationWindow(o.startsAt, at, ctx.clinic).closesAt <= at) throw new ConflictException('Não há tempo hábil de confirmação para este horário.');
  if (await tx.appointment.findUnique({ where: { occurrenceId_patientId: { occurrenceId, patientId: p.id } } })) throw new ConflictException('Esta consulta já consta no seu histórico. Escolha outro horário.');
  const age = p.birthDate ? ageAt(p.birthDate, o.startsAt, ctx.clinic.timezone) : null;
  if (age === null || age < slot.minAge || age > slot.maxAge) throw new ConflictException('Este horário não atende à faixa etária do paciente.');
  const local = DateTime.fromJSDate(o.startsAt, { zone: ctx.clinic.timezone });
  if (!await tx.availability.findFirst({ where: { patientId: p.id, clinicId: ctx.clinicId, weekday: local.weekday % 7, startMinute: { lte: local.hour * 60 + local.minute }, endMinute: { gte: local.hour * 60 + local.minute + slot.duration } } })) throw new ConflictException('O horário está fora da disponibilidade declarada.');
  if (await occupancy(tx, o.id) - (excludeReservation ? 1 : 0) >= slot.capacity) throw new ConflictException('Este horário foi ocupado durante a operação. Escolha outro encaixe.');
  const overlaps = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, startsAt: { lt: o.endsAt }, endsAt: { gt: o.startsAt } }, select: { id: true } });
  if (await tx.appointment.findFirst({ where: { patientId: p.id, status: { in: [...occupiedStates] }, occurrenceId: { in: overlaps.map(x => x.id) } } })) throw new ConflictException('Já existe uma consulta neste intervalo.');
  const held = await tx.reservation.count({ where: { patientId: p.id, active: true, occurrenceId: { in: overlaps.map(x => x.id) } } });
  if (held > (excludeReservation ? 1 : 0)) throw new ConflictException('Você já tem uma reserva neste intervalo.');
  if (originalId) {
    const perOriginal = await tx.fittingRequest.count({ where: { originalId, status: { in: ['PENDING', 'APPROVED'] } } });
    const perWindow = await tx.fittingRequest.count({ where: { patientId: p.id, clinicId: ctx.clinicId, originalId: { not: null }, status: { in: ['PENDING', 'APPROVED'] }, createdAt: { gte: DateTime.fromJSDate(at).minus({ days: ctx.clinic.evaluationDays }).toJSDate() } } });
    if (perOriginal - (excludeReservation ? 1 : 0) >= ctx.clinic.replacementPerAbsence || perWindow - (excludeReservation ? 1 : 0) >= ctx.clinic.replacementPerWindow) throw new ConflictException('O limite de reposições do período foi alcançado. Fale com a clínica.');
  }
  return { original, occurrence: o, slot, patient: p };
}
export async function suggestions(tx: Tx, ctx: Context, originalId: string, days: number, at = now()) {
  roles(ctx, 'PATIENT'); if (![7, 14].includes(days)) throw new BadRequestException('Escolha 7 ou 14 dias.');
  const a = await appointment(tx, ctx, originalId);
  const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, therapistId: a.slot.therapistId }, select: { id: true } });
  const occurrences = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: { in: slots.map(s => s.id) }, startsAt: { gt: at, lte: DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).plus({ days }).toJSDate() } }, orderBy: { startsAt: 'asc' } });
  const result = [];
  for (const o of occurrences) try { const valid = await eligible(tx, ctx, originalId, o.id, at); result.push({ ...o, slot: valid.slot }); } catch (error) { if (!(error instanceof ConflictException)) throw error; }
  return result.sort((x, y) => Math.abs(x.startsAt.getTime() - a.occurrence.startsAt.getTime()) - Math.abs(y.startsAt.getTime() - a.occurrence.startsAt.getTime()));
}
export async function reserve(tx: Tx, ctx: Context, originalId: string | null, occurrenceId: string, at = now()) {
  roles(ctx, 'PATIENT'); const existing = await tx.fittingRequest.findFirst({ where: { clinicId: ctx.clinicId, patientId: ctx.id, originalId, occurrenceId, status: 'PENDING' } }); if (existing) return existing;
  const valid = await eligible(tx, ctx, originalId, occurrenceId, at);
  const request = await tx.fittingRequest.create({ data: { clinicId: ctx.clinicId, patientId: ctx.id, originalId, occurrenceId } });
  await tx.reservation.create({ data: { requestId: request.id, clinicId: ctx.clinicId, patientId: ctx.id, occurrenceId } });
  await audit(tx, ctx, originalId ? 'fitting-reserved' : 'care-requested', request.id, { occurrenceId, patientId: ctx.id });
  if (originalId) {
    if (await blockedSession(tx, ctx, ctx.id, valid.slot.therapistId)) {
      const reception = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, role: 'RECEPTION', active: true } });
      for (const r of reception) await notify(tx, ctx, r.userId, 'fitting-reception-required', request.id);
    }
    const t = await tx.membership.findUniqueOrThrow({ where: { id: valid.slot.therapistId } }); await notify(tx, ctx, t.userId, 'fitting-requested', request.id);
  }
  return request;
}
export async function decideFitting(tx: Tx, ctx: Context, id: string, decision: 'approve' | 'reject', reason: string, at = now()) {
  roles(ctx, 'ADMIN', 'RECEPTION', 'THERAPIST'); const request = await tx.fittingRequest.findFirst({ where: { id, clinicId: ctx.clinicId } }); if (!request) throw new NotFoundException();
  const { slot } = await requestAccess(tx, ctx, request);
  if (!request.originalId) roles(ctx, 'RECEPTION');
  const blocked = await blockedSession(tx, ctx, request.patientId, slot.therapistId);
  if (decision === 'approve' && blocked) roles(ctx, 'RECEPTION');
  if (request.status !== 'PENDING') return request;
  if (decision === 'reject' && reason.trim().length < 5) throw new BadRequestException('Informe um motivo que oriente o paciente.');
  let appointmentId: string | undefined;
  if (decision === 'approve') {
    const reservation = await tx.reservation.findUnique({ where: { requestId: id } }); if (!reservation?.active) throw new ConflictException('A reserva não está ativa.');
    const valid = await eligible(tx, ctx, request.originalId, request.occurrenceId, at, true, request.patientId);
    const window = confirmationWindow(valid.occurrence.startsAt, at, ctx.clinic);
    const created = await tx.appointment.create({ data: { clinicId: ctx.clinicId, patientId: request.patientId, occurrenceId: request.occurrenceId, originalId: request.originalId, origin: request.originalId ? 'REPLACEMENT' : 'STANDALONE', status: window.opensAt <= at ? 'PENDING' : 'SCHEDULED', ...window } }); appointmentId = created.id;
    await audit(tx, ctx, 'appointment-created', created.id, { before: null, after: created.status, requestId: id });
    if (created.status === 'PENDING') await notify(tx, ctx, valid.patient.userId, 'confirmation-open', created.id);
    await settleReleased(tx, ctx, request.occurrenceId, at);
  }
  await tx.reservation.update({ where: { requestId: id }, data: { active: false } });
  const result = await tx.fittingRequest.update({ where: { id }, data: { status: decision === 'approve' ? 'APPROVED' : 'REJECTED', reason, appointmentId, decidedAt: at } });
  await audit(tx, ctx, `${request.originalId ? 'fitting' : 'care'}-${decision}`, id, { before: request.status, after: result.status, appointmentId: appointmentId ?? null });
  if (request.originalId) {
    const p = await tx.membership.findUniqueOrThrow({ where: { id: request.patientId } });
    await notify(tx, ctx, p.userId, 'fitting-decided', id);
  }
  return result;
}

// Só a ocupação efetiva cancela titulares liberados; reservas não são atendimentos.
export async function settleReleased(tx: Tx, ctx: Context, occurrenceId: string, at = now()) {
  const o = await tx.occurrence.findUniqueOrThrow({ where: { id: occurrenceId } });
  const slot = await tx.slot.findUniqueOrThrow({ where: { id: o.slotId } });
  const occupied = await tx.appointment.count({ where: { occurrenceId, status: { in: [...occupiedStates] } } });
  const released = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, occurrenceId, status: 'RELEASED' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  for (const a of released.slice(0, Math.max(0, released.length - Math.max(0, slot.capacity - occupied)))) {
    await tx.appointment.update({ where: { id: a.id }, data: { status: 'CANCELLED', cancelledAt: at } });
    await audit(tx, ctx, 'released-appointment-reassigned', a.id, { before: 'RELEASED', after: 'CANCELLED' });
    const p = await tx.membership.findUniqueOrThrow({ where: { id: a.patientId } });
    await notify(tx, ctx, p.userId, 'appointment-reassigned', a.id);
  }
}

export async function careSuggestions(tx: Tx, ctx: Context, days: number, at = now()) {
  roles(ctx, 'PATIENT');
  if (![7, 14].includes(days)) throw new BadRequestException('Escolha 7 ou 14 dias.');
  const blocked = await tx.fixedAssignment.findMany({ where: { clinicId: ctx.clinicId, patientId: ctx.id, blockedAt: { not: null } } });
  const previous = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, id: { in: blocked.map(a => a.slotId) } } });
  const therapists = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, id: { in: previous.map(s => s.therapistId) }, role: 'THERAPIST', active: true }, include: { user: { select: { name: true } } } });
  const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, therapistId: { in: therapists.map(t => t.id) }, blocked: false } });
  const occurrences = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: { in: slots.map(s => s.id) }, startsAt: { gt: at, lte: DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).plus({ days }).toJSDate() } }, orderBy: { startsAt: 'asc' } });
  const result = [];
  for (const o of occurrences) {
    try {
      const valid = await eligible(tx, ctx, null, o.id, at);
      result.push({ ...o, slot: valid.slot, therapist: therapists.find(t => t.id === valid.slot.therapistId)!.user.name });
    } catch (error) { if (!(error instanceof ConflictException)) throw error; }
  }
  return result;
}

async function requestAccess(tx: Tx, ctx: Context, request: { clinicId: string; patientId: string; occurrenceId: string }) {
  if (request.clinicId !== ctx.clinicId || (ctx.role === 'PATIENT' && request.patientId !== ctx.id)) throw new ForbiddenException();
  const occurrence = await tx.occurrence.findFirstOrThrow({ where: { id: request.occurrenceId, clinicId: ctx.clinicId } });
  const slot = await tx.slot.findFirstOrThrow({ where: { id: occurrence.slotId, clinicId: ctx.clinicId } });
  if (ctx.role === 'THERAPIST' && slot.therapistId !== ctx.id) throw new ForbiddenException();
  return { occurrence, slot };
}

export async function listFittings(tx: Tx, ctx: Context) {
  const rows = await tx.fittingRequest.findMany({ where: { clinicId: ctx.clinicId, ...(ctx.role === 'PATIENT' ? { patientId: ctx.id } : {}) }, orderBy: { createdAt: 'desc' } });
  const result = [];
  for (const row of rows) {
    try {
      const { occurrence, slot } = await requestAccess(tx, ctx, row);
      const patient = await tx.membership.findUniqueOrThrow({ where: { id: row.patientId }, include: { user: { select: { name: true } } } });
      const therapist = await tx.membership.findUniqueOrThrow({ where: { id: slot.therapistId }, include: { user: { select: { name: true } } } });
      result.push({ ...row, patientName: patient.user.name, therapist: therapist.user.name, startsAt: occurrence.startsAt, room: slot.room, receptionRequired: !row.originalId || !!await blockedSession(tx, ctx, row.patientId, slot.therapistId) });
    } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
  }
  return result;
}
