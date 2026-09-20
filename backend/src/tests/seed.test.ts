import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { db } from '../infrastructure/db.js';
import { assertSeedTarget, seedDatabase } from '../seed.js';
after(() => db.$disconnect());
assert.equal(new URL(process.env.DATABASE_URL!).pathname, '/clinicapp_test', 'Teste destrutivo exige banco clinicapp_test');

test('seed bloqueia destinos externos e produção antes de limpar dados', () => {
  const environment = process.env.NODE_ENV, url = process.env.DATABASE_URL;
  try {
    for (const [mode, target] of [['production', 'postgresql://localhost/clinicapp'], ['development', 'postgresql://remote.example/clinicapp'], ['development', 'postgresql://localhost/other']]) {
      process.env.NODE_ENV = mode; process.env.DATABASE_URL = target;
      assert.throws(assertSeedTarget);
    }
  } finally { process.env.NODE_ENV = environment; process.env.DATABASE_URL = url; }
});

test('seed limpa dados e jobs antigos e recria cenários sem acumular horários', async () => {
  await seedDatabase();
  const clinics = await db.clinic.count(), slots = await db.slot.count(), appointments = await db.appointment.count();
  assert.equal(clinics, 3); assert.equal(slots, 84); assert.ok(appointments > 0);
  const old = await db.user.create({ data: { name: 'Registro antigo', email: 'old-seed@example.test', password: 'fictício' } });
  await db.audit.create({ data: { clinicId: '00000000-0000-4000-8000-000000000001', actor: 'SYSTEM', action: 'seed-test', entityId: old.id } });
  await db.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS pgboss');
  await db.$executeRawUnsafe('CREATE TABLE pgboss.seed_test_job (id integer)');
  await seedDatabase();
  assert.equal(await db.user.count({ where: { id: old.id } }), 0);
  assert.equal(await db.audit.count({ where: { action: 'seed-test' } }), 0);
  assert.equal(await db.clinic.count(), clinics); assert.equal(await db.slot.count(), slots);
  assert.equal(await db.appointment.count(), appointments);
  assert.equal(await db.absence.count(), 3); assert.equal(await db.alert.count(), 3);
  const schemas = await db.$queryRaw<unknown[]>`SELECT 1 FROM pg_namespace WHERE nspname = 'pgboss'`;
  assert.equal(schemas.length, 0);
});

test('falha na população reverte a limpeza e preserva os dados anteriores', async () => {
  const old = await db.user.create({ data: { name: 'Preservar no rollback', email: 'rollback-seed@example.test', password: 'fictício' } });
  await db.$executeRawUnsafe("CREATE FUNCTION seed_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'seed-test-failure'; END; $$");
  await db.$executeRawUnsafe('CREATE TRIGGER seed_test_failure BEFORE INSERT ON "Slot" FOR EACH ROW EXECUTE FUNCTION seed_test_failure()');
  try {
    await assert.rejects(seedDatabase());
    assert.ok(await db.user.findUnique({ where: { id: old.id } }));
    assert.equal(await db.slot.count(), 84);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER seed_test_failure ON "Slot"');
    await db.$executeRawUnsafe('DROP FUNCTION seed_test_failure()');
  }
});

test('seed recusa banco em uso antes de apagar registros', async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await assert.rejects(seedDatabase(), /Encerre API/);
    assert.equal(await db.slot.count(), 84);
  } finally { await client.end(); }
});
