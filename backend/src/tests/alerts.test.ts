import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { createApp } from '../app.js';
import { db, transaction, type Context } from '../infrastructure/db.js';
import { listAlerts, publishAlert } from '../modules/alerts/alerts.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());

test('avisos respeitam público, clínica, expiração exata e publicação auditada', async () => {
  const f = await fixture(), g = await fixture(), endsAt = new Date(at.getTime() + 60000).toISOString();
  for (const audience of ['ALL', 'PATIENT', 'THERAPIST']) await transaction(f.admin, tx => publishAlert(tx, f.admin, { audience, text: 'Aviso fictício', endsAt }, at));
  assert.equal((await listAlerts(db, f.admin, at)).length, 3);
  for (const ctx of [f.patient, f.therapist, f.reception]) {
    const visible = await listAlerts(db, ctx, at);
    assert.deepEqual(visible.map(a => a.audience).sort(), ctx.role === 'RECEPTION' ? ['ALL'] : ['ALL', ctx.role]);
    await assert.rejects(transaction(ctx, tx => publishAlert(tx, ctx, { audience: 'ALL', text: 'Aviso fictício', endsAt }, at)));
  }
  assert.equal((await listAlerts(db, g.admin, at)).length, 0);
  assert.equal((await listAlerts(db, f.admin, new Date(endsAt))).length, 0);
  for (const input of [{ endsAt: at.toISOString(), text: 'Aviso fictício' }, { endsAt, text: '     ' }]) await assert.rejects(transaction(f.admin, tx => publishAlert(tx, f.admin, { audience: 'ALL', ...input }, at)));
  assert.equal(await db.audit.count({ where: { clinicId: f.clinic.id, action: 'alert-created' } }), 3);
});

test('HTTP de avisos valida entradas, CSRF e autorização de leitura e escrita', async t => {
  const f = await fixture(), g = await fixture(), app = await createApp();
  await app.listen(0, '127.0.0.1'); t.after(() => app.close());
  const base = await app.getUrl() + '/api/v1/alerts';
  async function headers(ctx: Context) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(32).toString('hex');
    await db.session.create({ data: { id: createHash('sha256').update(token).digest('hex'), csrf, userId: ctx.userId, membershipId: ctx.id, expiresAt: new Date(Date.now() + 60000) } });
    return { cookie: `clinic_session=${token}`, 'x-csrf-token': csrf, origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', 'content-type': 'application/json' };
  }
  const admin = await headers(f.admin), patient = await headers(f.patient), therapist = await headers(f.therapist), foreign = await headers(g.admin);
  const input = { audience: 'PATIENT', text: 'Aviso exclusivo aos pacientes', endsAt: new Date(Date.now() + 60000).toISOString() };
  const post = (body: unknown, auth = admin) => fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body) });
  for (const invalid of [{ audience: 'ADMIN' }, { endsAt: 'invalid' }, { clinicId: g.clinic.id }, { text: '     ' }]) assert.equal((await post({ ...input, ...invalid })).status, 400);
  assert.equal((await post(input, patient)).status, 403);
  assert.equal((await post(input, { ...admin, 'x-csrf-token': '' })).status, 403);
  assert.equal((await post(input)).status, 201);
  assert.equal((await (await fetch(base, { headers: patient })).json()).length, 1);
  for (const auth of [therapist, foreign]) assert.equal((await (await fetch(base, { headers: auth })).json()).length, 0);
  assert.equal((await fetch(base)).status, 401);
});
