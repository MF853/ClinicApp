import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { type Context, type Tx } from './db.js';
export function roles(ctx: Context, ...allowed: Role[]) { if (!allowed.includes(ctx.role)) throw new ForbiddenException('Seu perfil não tem permissão para esta ação.'); }
export async function appointment(tx: Tx, ctx: Context, id: string) {
  const a = await tx.appointment.findFirst({ where: { id, clinicId: ctx.clinicId } });
  if (!a) throw new NotFoundException('Consulta não encontrada neste perfil.');
  const occurrence = await tx.occurrence.findFirstOrThrow({ where: { id: a.occurrenceId, clinicId: ctx.clinicId } });
  const slot = await tx.slot.findFirstOrThrow({ where: { id: occurrence.slotId, clinicId: ctx.clinicId } });
  if ((ctx.role === 'PATIENT' && a.patientId !== ctx.id) || (ctx.role === 'THERAPIST' && slot.therapistId !== ctx.id)) throw new ForbiddenException('Esta consulta não pertence ao seu atendimento.');
  return { ...a, occurrence, slot };
}
export async function patient(tx: Tx, ctx: Context, id: string) {
  const p = await tx.membership.findFirst({ where: { id, clinicId: ctx.clinicId, role: 'PATIENT', active: true }, include: { user: { select: { id: true, name: true, email: true } } } });
  if (!p) throw new NotFoundException('Paciente não encontrado nesta clínica.');
  if (ctx.role === 'PATIENT' && id !== ctx.id) throw new ForbiddenException();
  if (ctx.role === 'THERAPIST') {
    const slots = await tx.slot.findMany({ where: { clinicId: ctx.clinicId, therapistId: ctx.id }, select: { id: true } });
    const occurrences = await tx.occurrence.findMany({ where: { slotId: { in: slots.map(s => s.id) } }, select: { id: true } });
    if (!await tx.appointment.findFirst({ where: { patientId: id, clinicId: ctx.clinicId, occurrenceId: { in: occurrences.map(o => o.id) } } })) throw new ForbiddenException();
  }
  return p;
}
export async function certificate(tx: Tx, ctx: Context, id: string, decision = false) {
  roles(ctx, 'PATIENT', 'THERAPIST', 'ADMIN');
  const c = await tx.certificate.findFirst({ where: { id, clinicId: ctx.clinicId } });
  if (!c) throw new NotFoundException();
  const absence = await tx.absence.findFirstOrThrow({ where: { id: c.absenceId, clinicId: ctx.clinicId } });
  const a = await appointment(tx, ctx, absence.appointmentId);
  if (ctx.role === 'ADMIN' && !ctx.canReview) throw new ForbiddenException('Somente avaliadores designados podem acessar atestados.');
  if (decision && (ctx.role === 'PATIENT' || (ctx.role === 'THERAPIST' && !ctx.clinic.particular))) throw new ForbiddenException('A decisão cabe ao avaliador designado da clínica.');
  return { ...c, absence, appointment: a };
}
