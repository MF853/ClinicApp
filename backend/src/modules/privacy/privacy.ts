import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { audit, now, type Context, type Tx } from '../../infrastructure/db.js';
import { roles } from '../../infrastructure/access.js';
import type { PrivacyDto, PrivacyResponseDto } from '../api/dto.js';

export async function createPrivacyRequest(tx: Tx, ctx: Context, values: PrivacyDto, at = now()) {
  const details = values.details.trim();
  if (details.length < 5) throw new BadRequestException('Descreva o que você precisa, com pelo menos cinco caracteres.');
  const existing = await tx.privacyRequest.findUnique({ where: { userId_requestKey: { userId: ctx.userId, requestKey: values.requestKey } } });
  if (existing) {
    if (existing.clinicId !== ctx.clinicId || existing.type !== values.type || existing.details !== details) throw new ConflictException('Este envio já foi usado. Atualize a página para iniciar outro pedido.');
    return existing;
  }
  const request = await tx.privacyRequest.create({ data: { userId: ctx.userId, clinicId: ctx.clinicId, type: values.type, details, requestKey: values.requestKey, createdAt: at, dueAt: DateTime.fromJSDate(at, { zone: ctx.clinic.timezone }).plus({ days: 15 }).toJSDate() } });
  await audit(tx, ctx, 'privacy-requested', request.id, { type: request.type, status: request.status, dueAt: request.dueAt.toISOString() });
  return request;
}
export async function listPrivacyRequests(tx: Tx, ctx: Context, inbox = false) {
  if (inbox) roles(ctx, 'ADMIN');
  const requests = await tx.privacyRequest.findMany({ where: inbox ? { clinicId: ctx.clinicId } : { userId: ctx.userId, OR: [{ clinicId: ctx.clinicId }, { clinicId: null }] }, orderBy: inbox ? { dueAt: 'asc' } : { createdAt: 'desc' } });
  const users = inbox ? await tx.user.findMany({ where: { id: { in: requests.map(r => r.userId) } }, select: { id: true, name: true } }) : [];
  return requests.map(({ requestKey: _key, userId, respondedBy: _actor, ...r }) => ({ ...r, ...(inbox ? { requesterName: users.find(u => u.id === userId)?.name ?? 'Titular' } : {}) }));
}
export async function respondPrivacyRequest(tx: Tx, ctx: Context, id: string, values: PrivacyResponseDto, at = now()) {
  roles(ctx, 'ADMIN');
  const request = await tx.privacyRequest.findFirst({ where: { id, clinicId: ctx.clinicId } });
  if (!request) throw new NotFoundException();
  const response = values.response.trim();
  if (values.status === 'RESPONDED' && response.length < 10) throw new BadRequestException('Descreva a resposta e as providências em pelo menos dez caracteres.');
  if (values.status === 'IN_REVIEW' && response) throw new BadRequestException('Use Registrar resposta para enviar uma orientação ao titular.');
  if (request.status === values.status && request.response === response) return request;
  if (request.status === 'RESPONDED') throw new ConflictException('Este pedido já recebeu uma resposta. Ela não pode ser sobrescrita.');
  const result = await tx.privacyRequest.update({ where: { id }, data: { status: values.status, response, ...(values.status === 'RESPONDED' ? { respondedBy: ctx.id, respondedAt: at } : {}) } });
  await audit(tx, ctx, 'privacy-status-updated', id, { before: request.status, after: result.status });
  return result;
}
