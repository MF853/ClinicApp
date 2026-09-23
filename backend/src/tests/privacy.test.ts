import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { fixture, at } from './fixture.js';
import { createPrivacyRequest, listPrivacyRequests, respondPrivacyRequest } from '../modules/privacy/privacy.js';
import { createApp } from '../app.js';
after(() => db.$disconnect());
test('privacidade: reenvio idempotente, escopo por clínica/titular, prazo, auditoria mínima e resposta concorrente', async () => {
  const f = await fixture(), g = await fixture();
  const values = { type: 'CORRECT', details: 'Corrigir meu telefone cadastrado', requestKey: randomUUID() };
  const [a, b] = await Promise.all([1, 2].map(() => transaction(f.patient, tx => createPrivacyRequest(tx, f.patient, values, at))));
  assert.equal(a.id, b.id); assert.equal(a.dueAt.toISOString(), '2030-09-25T15:00:00.000Z');
  assert.equal(await db.audit.count({ where: { entityId: a.id, action: 'privacy-requested' } }), 1);
  await assert.rejects(transaction(f.patient, tx => createPrivacyRequest(tx, f.patient, { ...values, details: 'Outro pedido diferente' }, at)));
  const own = await listPrivacyRequests(db, f.patient); assert.equal(own.length, 1); assert.ok(!('requestKey' in own[0]));
  assert.equal((await listPrivacyRequests(db, f.other)).length, 0);
  assert.equal((await listPrivacyRequests(db, g.admin, true)).length, 0);
  assert.equal((await listPrivacyRequests(db, f.admin, true))[0].requesterName, f.patient.user.name);
  for (const ctx of [f.patient, f.therapist, f.reception]) {
    await assert.rejects(listPrivacyRequests(db, ctx, true));
    await assert.rejects(transaction(ctx, tx => respondPrivacyRequest(tx, ctx, a.id, { status: 'IN_REVIEW', response: '' }, at)));
  }
  await assert.rejects(transaction(g.admin, tx => respondPrivacyRequest(tx, g.admin, a.id, { status: 'RESPONDED', response: 'Não pode responder nesta clínica.' }, at)));
  const legacy = await db.privacyRequest.create({ data: { userId: f.patient.userId, type: 'EXPORT', dueAt: at } });
  assert.equal((await listPrivacyRequests(db, f.patient)).length, 2);
  assert.equal((await listPrivacyRequests(db, f.admin, true)).length, 1);
  await assert.rejects(transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, legacy.id, { status: 'IN_REVIEW', response: '' }, at)));
  const membership = await db.membership.create({ data: { userId: f.patient.userId, clinicId: g.clinic.id, role: 'PATIENT' }, include: { clinic: true, user: true } });
  const otherClinic = await listPrivacyRequests(db, membership); assert.deepEqual(otherClinic.map(r => r.id), [legacy.id]);
  await transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, a.id, { status: 'IN_REVIEW', response: '' }, at));
  await assert.rejects(transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, a.id, { status: 'RESPONDED', response: '   ' }, at)));
  const decisions = await Promise.allSettled(['O titular recebeu orientação para corrigir o telefone.', 'Pedido precisa de informações complementares.'].map(response => transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, a.id, { status: 'RESPONDED', response }, at))));
  assert.equal(decisions.filter(d => d.status === 'fulfilled').length, 1);
  const saved = await db.privacyRequest.findUniqueOrThrow({ where: { id: a.id } });
  await transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, a.id, { status: 'RESPONDED', response: saved.response }, at));
  await assert.rejects(transaction(f.admin, tx => respondPrivacyRequest(tx, f.admin, a.id, { status: 'IN_REVIEW', response: '' }, at)));
  const audits = await db.audit.findMany({ where: { entityId: a.id } });
  assert.equal(audits.length, 3); assert.ok(!JSON.stringify(audits.map(entry => entry.context)).includes(values.details)); assert.ok(!JSON.stringify(audits.map(entry => entry.context)).includes(saved.response));
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: f.patient.userId } })).name, f.patient.user.name);
});
test('HTTP de privacidade valida entradas, CSRF, vínculo ativo e não aceita escopo enviado pelo cliente', async t => {
  const f = await fixture(), app = await createApp(); await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  async function auth(ctx: Context) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 300000) } });
    return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', 'content-type': 'application/json' };
  }
  const base = await app.getUrl() + '/api/v1', headers = await auth(f.patient), admin = await auth(f.admin);
  const post = (path: string, body: unknown, h = headers) => fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const body = { type: 'DELETE', details: 'Solicito análise da exclusão dos meus dados', requestKey: randomUUID() };
  for (const patch of [{ type: 'OTHER' }, { details: '  ' }, { details: 'x'.repeat(2001) }, { requestKey: 'invalid' }, { userId: f.other.userId }, { clinicId: f.clinic.id }, { status: 'RESPONDED' }]) assert.equal((await post('/privacy/requests', { ...body, ...patch })).status, 400);
  assert.equal((await post('/privacy/requests', body, { ...headers, 'x-csrf-token': '' })).status, 403);
  const res = await post('/privacy/requests', body); assert.equal(res.status, 201); const request = await res.json();
  assert.equal(request.userId, f.patient.userId); assert.equal(request.clinicId, f.clinic.id);
  assert.equal((await fetch(base + '/privacy/inbox', { headers })).status, 403);
  assert.equal((await fetch(base + '/privacy/requests', { headers })).status, 200);
  assert.equal((await post(`/privacy/requests/${request.id}/response`, { status: 'RESPONDED', response: 'A exclusão depende de análise das obrigações de retenção.' }, admin)).status, 201);
  assert.equal(await db.user.count({ where: { id: f.patient.userId } }), 1);
  await db.membership.update({ where: { id: f.patient.id }, data: { active: false } });
  assert.equal((await fetch(base + '/privacy/requests', { headers })).status, 401);
});
