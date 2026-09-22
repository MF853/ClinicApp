import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { createApp } from '../app.js';
import { careSuggestions, reserve, decideFitting, listFittings, occupancy } from '../modules/fitting/fitting.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());
async function blockedFixture() {
  const f = await fixture();
  const fixed = await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: f.slot.id, patientId: f.patient.id, active: false, blockedAt: at } });
  const target = await f.occurrence(48); await f.availability(target.id);
  return { ...f, fixed, target };
}
test('atendimento avulso sem histórico, só recepção decide; aprovação preserva bloqueio e não consome reposições', async () => {
  const f = await blockedFixture(), g = await fixture();
  assert.equal(await db.appointment.count({ where: { patientId: f.patient.id } }), 0);
  assert.equal((await careSuggestions(db, f.patient, 7, at))[0].id, f.target.id);
  const request = await transaction(f.patient, tx => reserve(tx, f.patient, null, f.target.id, at));
  assert.equal(request.originalId, null);
  assert.equal((await transaction(f.patient, tx => reserve(tx, f.patient, null, f.target.id, at))).id, request.id);
  assert.equal((await listFittings(db, f.patient))[0].patientName, f.patient.user.name);
  assert.equal((await listFittings(db, f.other)).length, 0);
  assert.equal((await listFittings(db, g.reception)).length, 0);
  for (const ctx of [f.admin, f.therapist, f.patient, g.reception]) {
    await assert.rejects(transaction(ctx, tx => decideFitting(tx, ctx, request.id, 'approve', '', at)));
    await assert.rejects(transaction(ctx, tx => decideFitting(tx, ctx, request.id, 'reject', 'Motivo administrativo', at)));
  }
  await assert.rejects(transaction(f.reception, tx => decideFitting(tx, f.reception, request.id, 'reject', '', at)));
  for (let i = 0; i < 2; i++) await transaction(f.reception, tx => decideFitting(tx, f.reception, request.id, 'approve', '', at));
  const a = await db.appointment.findUniqueOrThrow({ where: { occurrenceId_patientId: { occurrenceId: f.target.id, patientId: f.patient.id } } });
  assert.equal(a.origin, 'STANDALONE'); assert.equal(a.originalId, null);
  assert.equal((await db.fixedAssignment.findUniqueOrThrow({ where: { id: f.fixed.id } })).active, false);
  assert.equal(await db.audit.count({ where: { entityId: request.id, action: 'care-approve', actor: f.reception.id } }), 1);
  assert.equal(await db.reservation.count({ where: { requestId: request.id, active: true } }), 0);
  // Atendimento avulso aprovado não ocupa o limite de reposições da janela.
  await db.clinic.update({ where: { id: f.clinic.id }, data: { replacementPerWindow: 1 } });
  const original = await f.appointment('CANCELLED', -24), next = await f.occurrence(96); await f.availability(next.id);
  await transaction(f.patient, tx => reserve(tx, f.patient, original.id, next.id, at));
});
test('avulso exige sessão bloqueada com terapeuta, disponibilidade, idade, grupo aberto e tempo hábil', async () => {
  const f = await blockedFixture(), g = await blockedFixture();
  await assert.rejects(careSuggestions(db, f.admin, 7, at));
  await assert.rejects(careSuggestions(db, f.patient, 8, at));
  await assert.rejects(transaction(f.other, tx => reserve(tx, f.other, null, f.target.id, at)));
  await assert.rejects(transaction(f.patient, tx => reserve(tx, f.patient, null, g.target.id, at)));
  await db.availability.deleteMany({ where: { patientId: f.patient.id } });
  assert.deepEqual(await careSuggestions(db, f.patient, 7, at), []);
  await f.availability(f.target.id);
  for (const data of [{ minAge: 0, maxAge: 10 }, { blocked: true }, { capacity: 2, groupOffering: false }]) {
    await db.slot.update({ where: { id: f.slot.id }, data });
    await assert.rejects(transaction(f.patient, tx => reserve(tx, f.patient, null, f.target.id, at)));
    await db.slot.update({ where: { id: f.slot.id }, data: { minAge: 18, maxAge: 90, blocked: false, capacity: 1 } });
  }
  await assert.rejects(transaction(f.patient, tx => reserve(tx, f.patient, null, f.target.id, new Date(f.target.startsAt.getTime() - 3600000))));
  await db.membership.update({ where: { id: f.therapist.id }, data: { active: false } });
  assert.deepEqual(await careSuggestions(db, f.patient, 7, at), []);
});
test('duas solicitações avulsas disputam a última vaga; recusa libera reserva e decisão revalida restrições', async () => {
  const f = await blockedFixture();
  await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: f.slot.id, patientId: f.other.id, active: false, blockedAt: at } }); await f.availability(f.target.id, f.other);
  const results = await Promise.allSettled([f.patient, f.other].map(ctx => transaction(ctx, tx => reserve(tx, ctx, null, f.target.id, at))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await occupancy(db, f.target.id), 1);
  const request = await db.fittingRequest.findFirstOrThrow({ where: { occurrenceId: f.target.id, status: 'PENDING' } });
  await db.slot.update({ where: { id: f.slot.id }, data: { blocked: true } });
  await assert.rejects(transaction(f.reception, tx => decideFitting(tx, f.reception, request.id, 'approve', '', at)));
  assert.equal(await db.appointment.count({ where: { occurrenceId: f.target.id } }), 0);
  await transaction(f.reception, tx => decideFitting(tx, f.reception, request.id, 'reject', 'Horário indisponível; escolha outro', at));
  assert.equal(await occupancy(db, f.target.id), 0);
  await db.slot.update({ where: { id: f.slot.id }, data: { blocked: false } });
  const second = await transaction(f.patient, tx => reserve(tx, f.patient, null, f.target.id, at));
  // A reativação posterior não transforma o pedido avulso em aprovação livre.
  await db.fixedAssignment.update({ where: { id: f.fixed.id }, data: { blockedAt: null, active: true } });
  await assert.rejects(transaction(f.admin, tx => decideFitting(tx, f.admin, second.id, 'approve', '', at)));
  await transaction(f.reception, tx => decideFitting(tx, f.reception, second.id, 'approve', '', at));
  assert.equal(await occupancy(db, f.target.id), 1);
});
test('HTTP de avulso valida sessão, CSRF, identificadores e isolamento sem aceitar paciente enviado pelo cliente', async t => {
  const f = await blockedFixture(), app = await createApp(); await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  async function auth(ctx: Context) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 300000) } });
    return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', 'content-type': 'application/json' };
  }
  const base = await app.getUrl() + '/api/v1', headers = await auth(f.patient), reception = await auth(f.reception), admin = await auth(f.admin);
  const post = (path: string, body: unknown, h = headers) => fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  assert.equal((await post('/fittings', { occurrenceId: f.target.id }, { ...headers, 'x-csrf-token': '' })).status, 403);
  for (const body of [{ occurrenceId: 'invalid' }, { occurrenceId: f.target.id, originalId: 'invalid' }, { occurrenceId: f.target.id, patientId: f.other.id }]) assert.equal((await post('/fittings', body)).status, 400);
  const response = await post('/fittings', { occurrenceId: f.target.id }); assert.equal(response.status, 201); const request = await response.json();
  assert.equal(request.patientId, f.patient.id); assert.equal(request.originalId, null);
  const listed = await fetch(base + '/fittings', { headers: reception }); assert.equal(listed.status, 200);
  assert.equal((await listed.json())[0].receptionRequired, true);
  assert.equal((await post(`/fittings/${request.id}/decision`, { decision: 'approve', reason: '' }, admin)).status, 403);
  assert.equal((await post(`/fittings/${request.id}/decision`, { decision: 'approve', reason: '' }, reception)).status, 201);
  await db.membership.update({ where: { id: f.patient.id }, data: { active: false } });
  assert.equal((await fetch(base + '/care/suggestions?days=7', { headers })).status, 401);
});
