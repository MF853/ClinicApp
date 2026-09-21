import { BadRequestException, ConflictException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { type Context, type Tx, now, audit, notify } from '../../infrastructure/db.js';
import { roles, blockedSession } from '../../infrastructure/access.js';
import { confirmationWindow, ageAt } from '../../infrastructure/time.js';
import type { SlotDto } from '../api/dto.js';
import { occupiedStates, occupancy, settleReleased } from '../fitting/fitting.js';
export async function saveSlot(tx: Tx, ctx: Context, values: SlotDto, id?: string, at = now()) {
  roles(ctx, 'THERAPIST');
  if (values.endMinute <= values.startMinute || values.maxAge < values.minAge || !values.room.trim()) throw new BadRequestException('Revise horários, sala e faixa etária.');
  const before = id ? await tx.slot.findFirstOrThrow({ where: { id, clinicId: ctx.clinicId, therapistId: ctx.id } }) : null;
  const siblings = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, therapistId: ctx.id, weekday: values.weekday, ...(id ? { id: { not: id } } : {}) } });
  if (siblings.some(s => s.minute < values.endMinute && s.minute + s.duration > values.startMinute)) throw new ConflictException('Este intervalo se sobrepõe a outro horário da sua grade.');
  const data = { weekday: values.weekday, minute: values.startMinute, duration: values.endMinute - values.startMinute, room: values.room.trim(), minAge: values.minAge, maxAge: values.maxAge, capacity: values.capacity };
  if (before) {
    const fixed = await tx.fixedAssignment.findMany({ where: { clinicId: ctx.clinicId, slotId: id, active: true } });
    if (fixed.length > values.capacity) throw new ConflictException('A capacidade não pode ser menor que a quantidade de pacientes fixos.');
    const future = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: id, endsAt: { gt: at } } });
    for (const o of future) if (await occupancy(tx, o.id) > values.capacity) throw new ConflictException('A capacidade não pode ser menor que as consultas e reservas existentes.');
    const moved = before.weekday !== data.weekday || before.minute !== data.minute || before.duration !== data.duration;
    if (moved) {
      const scope = { clinicId: ctx.clinicId, occurrenceId: { in: future.map(o => o.id) } };
      if (fixed.length || future.some(o => o.blocked || o.startsAt <= at) || await tx.appointment.count({ where: scope }) || await tx.reservation.count({ where: scope }) || await tx.fittingRequest.count({ where: scope })) throw new ConflictException('Este horário tem pacientes, histórico futuro ou bloqueios. Preserve esses atendimentos e crie um novo horário.');
      await tx.occurrence.deleteMany({ where: { id: { in: future.map(o => o.id) }, clinicId: ctx.clinicId } });
    }
    if (before.minAge !== data.minAge || before.maxAge !== data.maxAge) {
      const patients = await tx.membership.findMany({ where: { id: { in: fixed.map(f => f.patientId) }, clinicId: ctx.clinicId } });
      if (patients.some(p => !p.birthDate || ageAt(p.birthDate, at, ctx.clinic.timezone) < data.minAge || ageAt(p.birthDate, at, ctx.clinic.timezone) > data.maxAge)) throw new ConflictException('A nova faixa etária exclui pacientes fixos. Revise as alocações antes de alterar a restrição.');
    }
  }
  const slot = before ? await tx.slot.update({ where: { id }, data }) : await tx.slot.create({ data: { ...data, clinicId: ctx.clinicId, therapistId: ctx.id } });
  await materialize(tx, ctx, at);
  await audit(tx, ctx, before ? 'slot-updated' : 'slot-created', slot.id, { before: before ? { weekday: before.weekday, minute: before.minute, duration: before.duration, room: before.room, minAge: before.minAge, maxAge: before.maxAge, capacity: before.capacity } : null, after: data });
  if (before && before.room !== slot.room) {
    const future = await tx.occurrence.findMany({ where: { slotId: slot.id, clinicId: ctx.clinicId, startsAt: { gt: at } }, select: { id: true } });
    const appointments = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, occurrenceId: { in: future.map(o => o.id) }, status: { in: [...occupiedStates] } } });
    const patients = await tx.membership.findMany({ where: { id: { in: appointments.map(a => a.patientId) }, clinicId: ctx.clinicId, active: true } });
    for (const p of patients) await notify(tx, ctx, p.userId, 'schedule-changed', `${slot.id}:${at.toISOString()}`);
  }
  return slot;
}

export async function releaseAssignment(tx: Tx, ctx: Context, slotId: string, patientId: string, reason: string, at = now()) {
  roles(ctx, 'ADMIN', 'THERAPIST');
  if (reason.trim().length < 5) throw new BadRequestException('Informe o motivo da liberação.');
  const slot = await tx.slot.findFirstOrThrow({ where: { id: slotId, clinicId: ctx.clinicId, ...(ctx.role === 'THERAPIST' ? { therapistId: ctx.id } : {}) } });
  const fixed = await tx.fixedAssignment.findFirstOrThrow({ where: { slotId, patientId, clinicId: ctx.clinicId } });
  if (!fixed.active) return { ok: true };
  await tx.fixedAssignment.update({ where: { id: fixed.id }, data: { active: false } });
  const future = await tx.occurrence.findMany({ where: { slotId, clinicId: ctx.clinicId, startsAt: { gt: at } }, select: { id: true } });
  const pending = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, patientId, occurrenceId: { in: future.map(o => o.id) }, origin: 'FIXED', status: { in: ['SCHEDULED', 'PENDING', 'EXPIRED', 'RELEASED'] } } });
  for (const a of pending) {
    await tx.appointment.update({ where: { id: a.id }, data: { status: 'CANCELLED', cancelledAt: at } });
    await audit(tx, ctx, 'fixed-appointment-cancelled', a.id, { before: a.status, after: 'CANCELLED', assignmentId: fixed.id });
  }
  await audit(tx, ctx, 'fixed-released', fixed.id, { reason: reason.trim(), cancelled: pending.length });
  const recipients = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, id: { in: [patientId, slot.therapistId] }, active: true } });
  for (const p of recipients) await notify(tx, ctx, p.userId, 'fixed-released', `${fixed.id}:${at.toISOString()}`);
  return { ok: true };
}

export async function materialize(tx: Tx, ctx: Context, at = now()) {
  const therapists = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, role: 'THERAPIST', active: true }, select: { id: true } });
  const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, blocked: false, therapistId: { in: therapists.map(t => t.id) } } });
  for (let day = 0; day < 28; day++) {
    const date = DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).startOf('day').plus({ days: day });
    for (const slot of slots.filter(s => s.weekday === date.weekday % 7)) {
      const start = date.plus({ minutes: slot.minute }); if (start.toMillis() <= at.getTime()) continue;
      const o = await tx.occurrence.upsert({ where: { slotId_startsAt: { slotId: slot.id, startsAt: start.toJSDate() } }, create: { clinicId: ctx.clinicId, slotId: slot.id, startsAt: start.toJSDate(), endsAt: start.plus({ minutes: slot.duration }).toJSDate() }, update: {} });
      if (o.blocked) continue;
      const assignments = await tx.fixedAssignment.findMany({ where: { slotId: slot.id, clinicId: ctx.clinicId, active: true } });
      for (const a of assignments) {
        if (await tx.appointment.findUnique({ where: { occurrenceId_patientId: { occurrenceId: o.id, patientId: a.patientId } } })) continue;
        if (await occupancy(tx, o.id) >= slot.capacity) continue;
        const window = confirmationWindow(o.startsAt, at, ctx.clinic);
        const created = await tx.appointment.create({ data: { clinicId: ctx.clinicId, occurrenceId: o.id, patientId: a.patientId, status: window.closesAt < at ? 'EXPIRED' : window.opensAt <= at ? 'PENDING' : 'SCHEDULED', ...window } });
        await audit(tx, ctx, 'appointment-created', created.id, { before: null, after: created.status });
        if (created.status === 'PENDING') {
          const p = await tx.membership.findUniqueOrThrow({ where: { id: a.patientId } });
          await notify(tx, ctx, p.userId, 'confirmation-open', created.id);
        }
        if (created.status === 'EXPIRED') {
          const member = await tx.membership.findUniqueOrThrow({ where: { id: slot.therapistId } });
          await notify(tx, ctx, member.userId, 'confirmation-expired', created.id);
        }
        await settleReleased(tx, ctx, o.id, at);
      }
    }
  }
}
export async function assign(tx: Tx, ctx: Context, slotId: string, patientId: string, exception: boolean, reason: string, at = now(), reactivating = false) {
  roles(ctx, 'THERAPIST', 'ADMIN', 'RECEPTION');
  if (reactivating) roles(ctx, 'ADMIN');
  const p = await tx.membership.findFirstOrThrow({ where: { id: patientId, clinicId: ctx.clinicId, role: 'PATIENT', active: true } });
  const slot = await tx.slot.findFirstOrThrow({ where: { id: slotId, clinicId: ctx.clinicId, ...(ctx.role === 'THERAPIST' ? { therapistId: ctx.id } : {}) } });
  await tx.membership.findFirstOrThrow({ where: { id: slot.therapistId, clinicId: ctx.clinicId, role: 'THERAPIST', active: true } });
  const age = p.birthDate ? ageAt(p.birthDate, at, ctx.clinic.timezone) : null;
  const existing = await tx.fixedAssignment.findUnique({ where: { slotId_patientId: { slotId, patientId } } }); if (existing?.blockedAt) throw new ConflictException('A sessão está bloqueada. Solicite reativação ao administrador.'); if (existing?.active) return existing;
  if (!reactivating && await blockedSession(tx, ctx, patientId, slot.therapistId)) throw new ConflictException('Há uma sessão bloqueada com este terapeuta. Solicite reativação ao administrador ou um atendimento pela recepção.');
  const mismatch = age === null || age < slot.minAge || age > slot.maxAge;
  if (mismatch && (!exception || ctx.role !== 'THERAPIST' || reason.trim().length < 5)) throw new ConflictException('Restrição de idade. A exceção exige confirmação explícita e justificativa do terapeuta.');
  if (slot.blocked || await tx.fixedAssignment.count({ where: { slotId, active: true } }) >= slot.capacity) throw new ConflictException('Este slot está bloqueado ou com capacidade esgotada.');
  const occurrences = await tx.occurrence.findMany({ where: { slotId, clinicId: ctx.clinicId, startsAt: { gt: at }, blocked: false } });
  for (const o of occurrences) if (await occupancy(tx, o.id) - await tx.appointment.count({ where: { occurrenceId: o.id, patientId, status: { in: [...occupiedStates] } } }) >= slot.capacity) throw new ConflictException('Uma ocorrência futura já está ocupada ou reservada.');
  const otherFixed = await tx.fixedAssignment.findMany({ where: { patientId, clinicId: ctx.clinicId, active: true, slotId: { not: slotId } } });
  const otherSlots = await tx.slot.findMany({ where: { id: { in: otherFixed.map(f => f.slotId) }, weekday: slot.weekday } });
  if (otherSlots.some(s => s.minute < slot.minute + slot.duration && s.minute + s.duration > slot.minute)) throw new ConflictException('O paciente já possui outro horário fixo neste intervalo.');
  for (const o of occurrences) {
    const overlaps = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, id: { not: o.id }, startsAt: { lt: o.endsAt }, endsAt: { gt: o.startsAt } }, select: { id: true } });
    const scope = { clinicId: ctx.clinicId, patientId, occurrenceId: { in: overlaps.map(x => x.id) } };
    if (await tx.appointment.count({ where: { ...scope, status: { in: [...occupiedStates] } } }) || await tx.reservation.count({ where: { ...scope, active: true } })) throw new ConflictException('O paciente já possui consulta ou reserva neste intervalo.');
  }
  const result = await tx.fixedAssignment.upsert({ where: { slotId_patientId: { slotId, patientId } }, create: { slotId, patientId, clinicId: ctx.clinicId }, update: { active: true } });
  await materialize(tx, ctx, at); await audit(tx, ctx, 'fixed-assigned', result.id, { exception: mismatch, reason }); return result;
}
export async function schedule(tx: Tx, ctx: Context, from: string, to: string) {
  const parse = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? DateTime.fromISO(value, { zone: ctx.clinic.timezone }).toJSDate() : new Date(value);
  const start = parse(from), end = parse(to);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 32 * 86400000) throw new BadRequestException('Informe um intervalo de até 32 dias.');
  const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, ...(ctx.role === 'THERAPIST' ? { therapistId: ctx.id } : {}) } });
  const occurrences = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: { in: slots.map(s => s.id) }, startsAt: { gte: start, lt: end } }, orderBy: { startsAt: 'asc' } });
  const all = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, occurrenceId: { in: occurrences.map(o => o.id) } } });
  const appointments = all.filter(a => ctx.role !== 'PATIENT' || a.patientId === ctx.id);
  const members = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, id: { in: [...appointments.map(a => a.patientId), ...slots.map(s => s.therapistId)] } }, include: { user: { select: { name: true } } } });
  const reservations = await tx.reservation.findMany({ where: { clinicId: ctx.clinicId, active: true, occurrenceId: { in: occurrences.map(o => o.id) } } });
  return occurrences.filter(o => ctx.role !== 'PATIENT' || appointments.some(a => a.occurrenceId === o.id)).map(o => {
    const slot = slots.find(s => s.id === o.slotId)!;
    return { ...o, slot, therapist: members.find(m => m.id === slot.therapistId)?.user.name, appointments: appointments.filter(a => a.occurrenceId === o.id).map(a => ({ ...a, patientName: members.find(m => m.id === a.patientId)?.user.name })), reserved: reservations.filter(r => r.occurrenceId === o.id).length, occupied: all.filter(a => a.occurrenceId === o.id && occupiedStates.some(status => status === a.status)).length };
  });
}

export async function reactivateAssignment(tx: Tx, ctx: Context, slotId: string, patientId: string, reason: string, at = now()) {
  roles(ctx, 'ADMIN');
  if (reason.trim().length < 5) throw new BadRequestException('Informe o motivo da reativação.');
  const fixed = await tx.fixedAssignment.findFirstOrThrow({ where: { clinicId: ctx.clinicId, slotId, patientId } });
  if (!fixed.blockedAt) { if (fixed.active) return fixed; throw new ConflictException('Esta sessão não está bloqueada.'); }
  await tx.fixedAssignment.update({ where: { id: fixed.id }, data: { blockedAt: null } });
  const result = await assign(tx, ctx, slotId, patientId, false, reason, at, true);
  const future = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId, startsAt: { gt: at }, blocked: false } });
  const cancelled = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, patientId, occurrenceId: { in: future.map(o => o.id) }, origin: 'FIXED', status: 'CANCELLED', cancelledAt: fixed.blockedAt } });
  for (const a of cancelled) {
    const o = future.find(o => o.id === a.occurrenceId)!;
    const window = confirmationWindow(o.startsAt, at, ctx.clinic);
    if (window.closesAt <= at) continue;
    const status = window.opensAt <= at ? 'PENDING' : 'SCHEDULED';
    await tx.appointment.update({ where: { id: a.id }, data: { status, cancelledAt: null, ...window } });
    if (status === 'PENDING') {
      const p = await tx.membership.findUniqueOrThrow({ where: { id: patientId } });
      await notify(tx, ctx, p.userId, 'confirmation-open', a.id, `${a.id}:${fixed.blockedAt.toISOString()}`);
    }
    await settleReleased(tx, ctx, o.id, at);
    await audit(tx, ctx, 'appointment-reactivated', a.id, { before: a.status, after: status, assignmentId: fixed.id });
  }
  await audit(tx, ctx, 'session-reactivated', fixed.id, { reason });
  const slot = await tx.slot.findUniqueOrThrow({ where: { id: slotId } });
  const recipients = await tx.membership.findMany({ where: { clinicId: ctx.clinicId, id: { in: [patientId, slot.therapistId] }, active: true } });
  for (const p of recipients) await notify(tx, ctx, p.userId, 'session-reactivated', `${fixed.id}:${fixed.blockedAt.toISOString()}`);
  return result;
}
