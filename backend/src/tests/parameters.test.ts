import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { createApp } from '../app.js';
import { attendance, countAbsences } from '../modules/absences/absences.js';
import { submitCertificate } from '../modules/absences/certificates.js';
import { reserve } from '../modules/fitting/fitting.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());
test('parâmetros HTTP: validação, perfis, isolamento, auditoria e efeitos nas regras sem reescrever prazos', async t => {
  const f = await fixture(), g = await fixture(), app = await createApp(); await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  async function auth(ctx: Context) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 300000) } });
    return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', 'content-type': 'application/json' };
  }
  const headers = await auth(f.admin), base = await app.getUrl() + '/api/v1';
  const basic = { absenceLimit: 4, justificationDays: 1, confirmationHour: 9, closeHours: 3 };
  const config = { ...basic, evaluationDays: 1, replacementPerAbsence: 1, replacementPerWindow: 1, holidays: ['2030-09-10'], requiredCategories: ['OUTRO'] };
  const post = (body: unknown, h = headers) => fetch(base + '/parameters', { method: 'POST', headers: h, body: JSON.stringify(body) });
  for (const ctx of [f.patient, f.therapist, f.reception]) assert.equal((await post(config, await auth(ctx))).status, 403);
  assert.equal((await post(config, { ...headers, 'x-csrf-token': '' })).status, 403);
  for (const patch of [{ evaluationDays: 0 }, { evaluationDays: null }, { evaluationDays: 1.5 }, { replacementPerAbsence: 0 }, { replacementPerWindow: 1001 }, { holidays: ['2030-02-30'] }, { holidays: ['2030-09-10T00:00:00Z'] }, { holidays: ['2030-09-10', '2030-09-10'] }, { holidays: null }, { requiredCategories: ['INVALID'] }, { requiredCategories: ['OUTRO', 'OUTRO'] }, { clinicId: g.clinic.id }]) assert.equal((await post({ ...config, ...patch })).status, 400, JSON.stringify(patch));
  const oldAbsence = await f.absence('CONSOLIDATED'), oldAppointment = await f.appointment();
  await db.absence.update({ where: { id: oldAbsence.id }, data: { occurredAt: new Date(at.getTime() - 2 * 86400000) } });
  assert.equal((await post(config)).status, 201);
  assert.deepEqual(await db.clinic.findUnique({ where: { id: g.clinic.id } }), g.clinic);
  assert.equal((await db.absence.findUniqueOrThrow({ where: { id: oldAbsence.id } })).deadline.getTime(), oldAbsence.deadline.getTime());
  assert.deepEqual(await db.appointment.findUnique({ where: { id: oldAppointment.id } }), oldAppointment);
  const entry = await db.audit.findFirstOrThrow({ where: { clinicId: f.clinic.id, action: 'parameters-updated' } });
  const context = entry.context as { before: typeof config; after: typeof config };
  assert.equal(context.before.evaluationDays, 180); assert.deepEqual(context.after, config);
  assert.equal((await transaction(f.patient, tx => countAbsences(tx, f.patient, f.patient.id, at))).count, 0);
  const visit = await f.appointment('CONFIRMED', -24);
  await transaction(f.therapist, tx => attendance(tx, f.therapist, visit.id, 'absent', at));
  const absence = await db.absence.findUniqueOrThrow({ where: { appointmentId: visit.id } });
  assert.equal(absence.deadline.toISOString(), '2030-09-12T02:59:59.999Z');
  const original = await f.appointment('CANCELLED', -72), target = await f.occurrence(48), otherTarget = await f.occurrence(96);
  await f.availability(target.id); await f.availability(otherTarget.id);
  await transaction(f.patient, tx => reserve(tx, f.patient, original.id, target.id, at));
  await assert.rejects(transaction(f.patient, tx => reserve(tx, f.patient, original.id, otherTarget.id, at)));
  // O contexto antigo dizia que OUTRO não exigia documento; a transação relê a configuração.
  f.patient.clinic = f.clinic;
  await assert.rejects(submitCertificate(f.patient, { absenceId: absence.id, category: 'OUTRO', description: 'Justificativa sem anexo' }, [], at), /exige um documento/);
  assert.equal((await post({ ...config, holidays: [], requiredCategories: [] })).status, 201);
  const certificate = await submitCertificate(f.patient, { absenceId: absence.id, category: 'OUTRO', description: 'Justificativa sem anexo' }, [], at);
  assert.equal(certificate.category, 'OUTRO');
  assert.equal((await post(basic)).status, 201); // Clientes antigos preservam os campos adicionais.
  assert.deepEqual((await db.clinic.findUniqueOrThrow({ where: { id: f.clinic.id } })).requiredCategories, []);
});
