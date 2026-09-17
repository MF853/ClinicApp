import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { createApp } from '../app.js';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { createMember, memberStatus, patientParameters } from '../modules/members/members.js';
import { assign } from '../modules/schedule/schedule.js';
import { countAbsences, recordAbsence } from '../modules/absences/absences.js';
import { appointment } from '../infrastructure/access.js';
import { businessDeadline } from '../infrastructure/time.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());
const input = () => ({ name: 'Pessoa fictícia', email: `${randomUUID()}@example.test`, phone: '81999990000', password: 'Senha-ficticia!2026', role: 'PATIENT' as const, birthDate: '1990-01-01' });

test('cadastro auditado, senha protegida e terapeuta limitado ao paciente da própria grade', async () => {
  const f = await fixture(), g = await fixture(), data = input();
  const created = await createMember(f.admin, data);
  const user = await db.user.findUniqueOrThrow({ where: { email: data.email } });
  assert.ok(await argon2.verify(user.password, data.password));
  assert.equal(await db.audit.count({ where: { entityId: created.id, action: 'member-created' } }), 1);
  await assert.rejects(createMember(f.reception, input()));
  await assert.rejects(createMember(f.patient, input()));
  await assert.rejects(createMember(f.therapist, input()));
  await assert.rejects(createMember(f.therapist, { ...input(), role: 'THERAPIST', registration: 'CRP teste', slotId: f.slot.id }));
  const foreign = input();
  await assert.rejects(createMember(f.therapist, { ...foreign, slotId: g.slot.id }));
  assert.equal(await db.user.count({ where: { email: foreign.email } }), 0);
  const own = await createMember(f.therapist, { ...input(), slotId: f.slot.id });
  assert.equal(await db.fixedAssignment.count({ where: { patientId: own.id, slotId: f.slot.id, active: true } }), 1);
  const duplicate = await Promise.allSettled([createMember(f.admin, data), createMember(f.admin, data)]);
  assert.ok(duplicate.every(r => r.status === 'rejected'));
  assert.equal(await db.user.count({ where: { email: data.email } }), 1);
});

test('parâmetros individuais sobrepõem padrão, podem herdar novamente e preservam prazos existentes', async () => {
  const f = await fixture(), g = await fixture(), old = await f.absence();
  const values = { absenceLimit: 5, justificationDays: 6 };
  await transaction(f.admin, tx => patientParameters(tx, f.admin, f.patient.id, values));
  assert.equal((await countAbsences(db, f.patient, f.patient.id, at)).limit, 5);
  assert.equal((await db.absence.findUniqueOrThrow({ where: { id: old.id } })).deadline.getTime(), old.deadline.getTime());
  const a = await f.appointment('ABSENT', -48);
  const newAbsence = await transaction(f.therapist, async tx => recordAbsence(tx, f.therapist, await appointment(tx, f.therapist, a.id), 'NO_SHOW', at));
  const occurrence = await db.occurrence.findUniqueOrThrow({ where: { id: a.occurrenceId } });
  assert.equal(newAbsence.deadline.getTime(), businessDeadline(occurrence.startsAt, 6, f.clinic.timezone, []).getTime());
  await assert.rejects(transaction(f.therapist, tx => patientParameters(tx, f.therapist, f.patient.id, values)));
  await assert.rejects(transaction(g.admin, tx => patientParameters(tx, g.admin, f.patient.id, values)));
  await transaction(f.admin, tx => patientParameters(tx, f.admin, f.patient.id, { absenceLimit: null, justificationDays: null }));
  assert.equal((await countAbsences(db, f.patient, f.patient.id, at)).limit, f.clinic.absenceLimit);
});

test('desvinculação preserva atendimentos, compete com alocação pelo mesmo lock e permite reativação segura', async () => {
  const f = await fixture(), g = await fixture();
  await assert.rejects(transaction(f.reception, tx => memberStatus(tx, f.reception, f.patient.id, false, 'Solicitado pelo paciente')));
  await assert.rejects(transaction(g.admin, tx => memberStatus(tx, g.admin, f.patient.id, false, 'Solicitado pelo paciente')));
  const results = await Promise.allSettled([
    transaction(f.admin, tx => memberStatus(tx, f.admin, f.patient.id, false, 'Encerramento solicitado', at)),
    transaction(f.therapist, tx => assign(tx, f.therapist, f.slot.id, f.patient.id, false, '', at)),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const member = await db.membership.findUniqueOrThrow({ where: { id: f.patient.id } });
  assert.equal(await db.fixedAssignment.count({ where: { patientId: member.id, active: true } }), member.active ? 1 : 0);
  if (!member.active) await transaction(f.admin, tx => memberStatus(tx, f.admin, member.id, true, 'Retorno solicitado', at));
  const confirmed = await f.appointment('CONFIRMED');
  await assert.rejects(transaction(f.admin, tx => memberStatus(tx, f.admin, f.patient.id, false, 'Encerramento solicitado', at)));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: confirmed.id } })).status, 'CONFIRMED');
  await assert.rejects(transaction(f.admin, tx => memberStatus(tx, f.admin, f.therapist.id, false, 'Encerramento solicitado', at)));
});

test('HTTP valida cadastro e parâmetros, revoga somente sessões do vínculo e mantém isolamento', async t => {
  const f = await fixture(), g = await fixture();
  const app = await createApp(); await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  const base = await app.getUrl() + '/api/v1';
  async function headers(ctx: Context) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 60000) } });
    return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', 'content-type': 'application/json' };
  }
  const admin = await headers(f.admin), patient = await headers(f.patient);
  const post = (path: string, body: unknown, auth = admin) => fetch(base + path, { method: 'POST', headers: auth, body: JSON.stringify(body) });
  for (const invalid of [{ clinicId: g.clinic.id }, { role: 'ADMIN' }, { birthDate: '2026-02-31' }, { password: 'curta' }]) assert.equal((await post('/members', { ...input(), ...invalid })).status, 400);
  for (const values of [{}, { absenceLimit: 0, justificationDays: 3 }, { absenceLimit: 3, justificationDays: 31 }, { absenceLimit: 3.5, justificationDays: 3 }]) assert.equal((await post(`/patients/${f.patient.id}/parameters`, values)).status, 400);
  assert.equal((await post(`/patients/${f.patient.id}/parameters`, { absenceLimit: null, justificationDays: null })).status, 201);
  assert.equal((await post(`/patients/${f.patient.id}/parameters`, { absenceLimit: 4, justificationDays: 4 }, patient)).status, 403);
  const linked = await db.membership.create({ data: { userId: f.patient.userId, clinicId: g.clinic.id, role: 'PATIENT' }, include: { clinic: true, user: { select: { id: true, name: true, email: true } } } });
  const otherSession = await headers(linked);
  assert.equal((await post(`/members/${f.patient.id}/status`, { active: false, reason: 'Encerramento solicitado' })).status, 201);
  assert.equal((await fetch(base + '/session', { headers: patient })).status, 401);
  assert.equal((await fetch(base + '/session', { headers: otherSession })).status, 200);
  assert.equal((await post(`/members/${f.patient.id}/status`, { active: true, reason: 'Retorno solicitado' })).status, 201);
  assert.equal((await fetch(base + '/session', { headers: patient })).status, 401);
  assert.equal(await db.fixedAssignment.count({ where: { patientId: f.patient.id } }), 0);
});
