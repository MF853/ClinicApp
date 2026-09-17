import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import argon2 from 'argon2';
import { DateTime } from 'luxon';
import { audit, transaction, now, type Context, type Tx } from '../../infrastructure/db.js';
import { roles, patient } from '../../infrastructure/access.js';
import { assign } from '../schedule/schedule.js';
import { occupiedStates } from '../fitting/fitting.js';
import type { MemberDto, PatientParametersDto } from '../api/dto.js';

export async function createMember(ctx: Context, body: MemberDto) {
  roles(ctx, 'ADMIN', 'THERAPIST');
  if (ctx.role === 'THERAPIST' && (body.role !== 'PATIENT' || !body.slotId)) throw new ForbiddenException('O terapeuta cadastra pacientes em um horário da própria grade.');
  if (!body.name.trim() || !body.phone.trim() || (body.role === 'THERAPIST' && !body.registration?.trim())) throw new BadRequestException('Preencha nome, telefone e registro profissional quando aplicável.');
  if (body.birthDate && body.birthDate > DateTime.now().setZone(ctx.clinic.timezone).toISODate()!) throw new BadRequestException('A data de nascimento não pode estar no futuro.');
  if (body.slotId && body.role !== 'PATIENT') throw new BadRequestException('Somente pacientes podem ser alocados em um horário.');
  const password = await argon2.hash(body.password, { type: argon2.argon2id });
  return transaction(ctx, async tx => {
    const user = await tx.user.create({ data: { name: body.name.trim(), email: body.email.toLowerCase(), phone: body.phone.trim(), password } });
    const member = await tx.membership.create({ data: { userId: user.id, clinicId: ctx.clinicId, role: body.role, birthDate: body.birthDate ? new Date(body.birthDate) : null, registration: body.registration?.trim() ?? '' } });
    if (body.slotId) await assign(tx, ctx, body.slotId, member.id, body.exception ?? false, body.reason ?? '');
    await audit(tx, ctx, 'member-created', member.id, { role: member.role });
    return { id: member.id };
  });
}

export async function memberStatus(tx: Tx, ctx: Context, id: string, active: boolean, reason: string, at = now()) {
  roles(ctx, 'ADMIN');
  const member = await tx.membership.findFirstOrThrow({ where: { id, clinicId: ctx.clinicId, role: { in: ['PATIENT', 'THERAPIST', 'RECEPTION'] } } });
  if (reason.trim().length < 5) throw new BadRequestException('Informe o motivo da alteração do vínculo.');
  if (member.active === active) return { id, active };
  if (!active) {
    const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, ...(member.role === 'THERAPIST' ? { therapistId: id } : {}) }, select: { id: true } });
    const occurrences = await tx.occurrence.findMany({ where: { clinicId: ctx.clinicId, slotId: { in: slots.map(s => s.id) }, endsAt: { gt: at } }, select: { id: true } });
    const scope = { clinicId: ctx.clinicId, occurrenceId: { in: occurrences.map(o => o.id) }, ...(member.role === 'PATIENT' ? { patientId: id } : {}) };
    if (member.role !== 'RECEPTION' && (
      await tx.fixedAssignment.count({ where: { clinicId: ctx.clinicId, active: true, slotId: { in: slots.map(s => s.id) }, ...(member.role === 'PATIENT' ? { patientId: id } : {}) } }) ||
      await tx.appointment.count({ where: { ...scope, status: { in: [...occupiedStates] } } }) ||
      await tx.reservation.count({ where: { ...scope, active: true } })
    )) throw new ConflictException('Resolva os horários fixos, consultas futuras e reservas antes de desvincular. Nenhum atendimento foi cancelado.');
  }
  await tx.membership.update({ where: { id }, data: { active } });
  // Sessões dos outros vínculos do mesmo usuário continuam válidas.
  if (!active) await tx.session.deleteMany({ where: { membershipId: id } });
  await audit(tx, ctx, active ? 'member-linked' : 'member-unlinked', id, { reason: reason.trim() });
  return { id, active };
}

export async function patientParameters(tx: Tx, ctx: Context, id: string, values: PatientParametersDto) {
  roles(ctx, 'ADMIN');
  const before = await patient(tx, ctx, id);
  await tx.membership.update({ where: { id }, data: values });
  await audit(tx, ctx, 'patient-parameters-updated', id, { before: { absenceLimit: before.absenceLimit, justificationDays: before.justificationDays }, after: { ...values } });
  return { id, ...values };
}
