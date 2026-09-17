import { BadRequestException } from '@nestjs/common';
import { audit, now, type Context, type Tx } from '../../infrastructure/db.js';
import { roles } from '../../infrastructure/access.js';
import type { AlertDto } from '../api/dto.js';

export function listAlerts(tx: Tx, ctx: Context, at = now()) {
  return tx.alert.findMany({ where: { clinicId: ctx.clinicId, endsAt: { gt: at }, ...(ctx.role === 'ADMIN' ? {} : { audience: { in: ['ALL', ctx.role] } }) }, orderBy: [{ endsAt: 'asc' }, { id: 'asc' }] });
}

export async function publishAlert(tx: Tx, ctx: Context, values: AlertDto, at = now()) {
  roles(ctx, 'ADMIN');
  const endsAt = new Date(values.endsAt), text = values.text.trim();
  if (!Number.isFinite(endsAt.getTime()) || endsAt <= at || text.length < 5) throw new BadRequestException('Informe uma mensagem e uma data de término futura.');
  const alert = await tx.alert.create({ data: { clinicId: ctx.clinicId, audience: values.audience, text, endsAt } });
  await audit(tx, ctx, 'alert-created', alert.id, { audience: alert.audience, startsAt: at.toISOString(), endsAt: endsAt.toISOString() });
  return alert;
}
