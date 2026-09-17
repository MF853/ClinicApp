import { ConflictException } from '@nestjs/common';
import { type Context, type Tx, now, audit, notify } from '../../infrastructure/db.js';
import { appointment, roles } from '../../infrastructure/access.js';
import { recordAbsence } from '../absences/absences.js';
export async function respond(tx: Tx, ctx: Context, id: string, action: 'confirm' | 'cancel', at = now()) {
  roles(ctx, 'PATIENT'); const a = await appointment(tx, ctx, id);
  if (action === 'confirm' && a.status === 'CONFIRMED') return a;
  if (action === 'cancel' && ['CANCELLED', 'ABSENT'].includes(a.status)) return a;
  if (!['SCHEDULED', 'PENDING', 'EXPIRED', 'CONFIRMED'].includes(a.status) || a.occurrence.blocked) throw new ConflictException('Este horário não está disponível. Consulte a agenda ou fale com a recepção.');
  if (action === 'confirm' && (at < a.opensAt || at > a.closesAt)) {
    throw new ConflictException('A janela de confirmação está encerrada. Fale com o terapeuta para verificar seu horário.');
  }
  if (at >= a.occurrence.startsAt) throw new ConflictException('A consulta já começou. Entre em contato com a clínica.');
  const late = action === 'cancel' && at > a.closesAt;
  const updated = await tx.appointment.update({ where: { id }, data: action === 'confirm' ? { status: 'CONFIRMED', confirmedAt: at } : { status: late ? 'ABSENT' : 'CANCELLED', cancelledAt: at } });
  if (late) await recordAbsence(tx, ctx, a, 'LATE_CANCEL', at);
  await audit(tx, ctx, action, id, { before: a.status, after: updated.status });
  const therapist = await tx.membership.findUniqueOrThrow({ where: { id: a.slot.therapistId } });
  await notify(tx, ctx, therapist.userId, action, id);
  return updated;
}
export async function advanceConfirmation(tx: Tx, ctx: Context, at = now()) {
  const appointments = await tx.appointment.findMany({ where: { clinicId: ctx.clinicId, status: { in: ['SCHEDULED', 'PENDING'] } } });
  for (const a of appointments) {
    const o = await tx.occurrence.findUniqueOrThrow({ where: { id: a.occurrenceId } });
    if (o.blocked) continue;
    if (at > a.closesAt) {
      await tx.appointment.update({ where: { id: a.id }, data: { status: 'EXPIRED' } });
      await audit(tx, { ...ctx, id: 'SYSTEM' }, 'confirmation-expired', a.id);
      const slot = await tx.slot.findUniqueOrThrow({ where: { id: o.slotId } });
      const therapist = await tx.membership.findUniqueOrThrow({ where: { id: slot.therapistId } });
      await notify(tx, ctx, therapist.userId, 'confirmation-expired', a.id);
    } else if (a.status === 'SCHEDULED' && at >= a.opensAt) {
      await tx.appointment.update({ where: { id: a.id }, data: { status: 'PENDING' } });
      const p = await tx.membership.findUniqueOrThrow({ where: { id: a.patientId } });
      await notify(tx, ctx, p.userId, 'confirmation-open', a.id);
    }
  }
}
