import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { csrfCheck } from '../modules/identity/identity.js';
import argon2 from 'argon2';
import { createApp } from '../app.js';
import { db } from '../infrastructure/db.js';
import { fixture } from './fixture.js';

test('CSRF aceita os dois endereços locais em desenvolvimento sem liberar outras origens ou tokens', t => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NODE_ENV = 'development';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  process.env.MOBILE_ORIGINS = 'capacitor://localhost';
  const token = 'a'.repeat(64);
  const request = (origin?: string, actual = token, cookie = token) => ({
    get: (name: string) => name === 'origin' ? origin : name === 'x-csrf-token' ? actual : undefined,
    cookies: { clinic_csrf: cookie },
  }) as unknown as Request;
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'capacitor://localhost']) {
    assert.doesNotThrow(() => csrfCheck(request(origin)));
    assert.doesNotThrow(() => csrfCheck(request(origin, token, ''), token));
    for (const actual of ['', 'b'.repeat(64), 'z'.repeat(64)]) {
      assert.throws(() => csrfCheck(request(origin, actual)), ForbiddenException);
      assert.throws(() => csrfCheck(request(origin, actual), token), ForbiddenException);
    }
    assert.throws(() => csrfCheck(request(origin, token, '')), ForbiddenException);
  }
  for (const origin of [undefined, 'null', 'http://evil.test', 'http://localhost:5174', 'http://127.0.0.1:3000']) {
    assert.throws(() => csrfCheck(request(origin)), ForbiddenException);
  }
  process.env.NODE_ENV = 'production';
  assert.doesNotThrow(() => csrfCheck(request('http://localhost:5173')));
  assert.throws(() => csrfCheck(request('http://127.0.0.1:5173')), ForbiddenException);
  process.env.NODE_ENV = 'development';
  process.env.WEB_ORIGIN = 'https://clinic.example';
  assert.doesNotThrow(() => csrfCheck(request('https://clinic.example')));
  assert.throws(() => csrfCheck(request('http://127.0.0.1:5173')), ForbiddenException);
});

test('HTTP: login, sessão e logout locais preservam CSRF e autorização', async t => {
  const previous = { ...process.env };
  process.env.NODE_ENV = 'development';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  t.after(async () => { process.env = previous; await db.$disconnect(); });
  const f = await fixture();
  const password = 'Senha-ficticia!2026';
  await db.user.update({ where: { id: f.patient.userId }, data: { password: await argon2.hash(password) } });
  const app = await createApp();
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl() + '/api/v1';
  const body = JSON.stringify({ email: f.patient.user.email, password });
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
    const csrfResponse = await fetch(base + '/auth/csrf');
    assert.equal(csrfResponse.status, 200);
    const { csrf } = await csrfResponse.json();
    const cookie = csrfResponse.headers.getSetCookie()[0].split(';')[0];
    const headers = { origin, cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' };
    for (const invalid of [{ origin: 'http://evil.test' }, { 'x-csrf-token': 'b'.repeat(64) }]) {
      const response = await fetch(base + '/auth/login', { method: 'POST', headers: { ...headers, ...invalid }, body });
      assert.equal(response.status, 403);
    }
    const login = await fetch(base + '/auth/login', { method: 'POST', headers, body });
    assert.equal(login.status, 201, await login.clone().text());
    const { csrf: sessionCsrf } = await login.json();
    const sessionCookie = login.headers.getSetCookie()[0].split(';')[0];
    const session = await fetch(base + '/session', { headers: { cookie: sessionCookie } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).context.id, f.patient.id);
    const sessionHeaders = { ...headers, cookie: sessionCookie, 'x-csrf-token': sessionCsrf };
    const switchResponse = await fetch(base + '/session/switch', { method: 'POST', headers: sessionHeaders, body: JSON.stringify({ membershipId: f.other.id }) });
    assert.equal(switchResponse.status, 403);
    const blockedLogout = await fetch(base + '/session/logout', { method: 'POST', headers: { ...sessionHeaders, 'x-csrf-token': csrf }, body: '{}' });
    assert.equal(blockedLogout.status, 403);
    const logout = await fetch(base + '/session/logout', { method: 'POST', headers: sessionHeaders, body: '{}' });
    assert.equal(logout.status, 201);
    assert.equal((await fetch(base + '/session', { headers: { cookie: sessionCookie } })).status, 401);
  }
});
