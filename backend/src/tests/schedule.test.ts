import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, transaction } from '../infrastructure/db.js';
import { saveSlot, assign, releaseAssignment, materialize } from '../modules/schedule/schedule.js';
import { reserve } from '../modules/fitting/fitting.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());
const values = { weekday: 2, startMinute: 600, endMinute: 650, minAge: 18, maxAge: 90, capacity: 2, room: 'Sala de teste' };

test('grade própria: criação/edição, sobreposição, isolamento e proteção dos atendimentos', async () => {
  const f = await fixture(), g = await fixture();
  const slot = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, undefined, at));
  await assert.rejects(transaction(f.admin, tx => saveSlot(tx, f.admin, values, undefined, at)));
  await assert.rejects(transaction(g.therapist, tx => saveSlot(tx, g.therapist, values, slot.id, at)));
  await assert.rejects(transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...values, startMinute: 620 }, undefined, at)));
  const moved = { ...values, startMinute: 700, endMinute: 750 };
  await transaction(f.therapist, tx => saveSlot(tx, f.therapist, moved, slot.id, at));
  assert.equal((await db.slot.findUniqueOrThrow({ where: { id: slot.id } })).minute, 700);
  await transaction(f.therapist, tx => assign(tx, f.therapist, slot.id, f.patient.id, false, '', at));
  await assert.rejects(transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, slot.id, at)));
  await assert.rejects(transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...moved, maxAge: 20 }, slot.id, at)));
  const first = await db.appointment.findFirstOrThrow({ where: { clinicId: f.clinic.id, patientId: f.patient.id } });
  await db.appointment.update({ where: { id: first.id }, data: { status: 'CONFIRMED' } });
  await transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...moved, room: 'Sala atualizada' }, slot.id, at));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: first.id } })).status, 'CONFIRMED');
  assert.ok(await db.notification.count({ where: { clinicId: f.clinic.id, userId: f.patient.userId, event: 'schedule-changed' } }));
  assert.equal(await db.audit.count({ where: { entityId: slot.id, action: 'slot-updated' } }), 2);
});

test('alocação rejeita conflito recorrente e consulta avulsa; exceção etária é explícita e auditada', async () => {
  const f = await fixture();
  const slot = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, undefined, at));
  await transaction(f.therapist, tx => assign(tx, f.therapist, slot.id, f.patient.id, false, '', at));
  const secondTherapist = await f.member('THERAPIST', 'Outra terapeuta fictícia');
  const conflict = await transaction(secondTherapist, tx => saveSlot(tx, secondTherapist, { ...values, startMinute: 610 }, undefined, at));
  await assert.rejects(transaction(f.admin, tx => assign(tx, f.admin, conflict.id, f.patient.id, false, '', at)));
  const child = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...values, weekday: 4, minAge: 0, maxAge: 10 }, undefined, at));
  await assert.rejects(transaction(f.therapist, tx => assign(tx, f.therapist, child.id, f.other.id, false, '', at)));
  await assert.rejects(transaction(f.admin, tx => assign(tx, f.admin, child.id, f.other.id, true, 'Exceção solicitada', at)));
  const fixed = await transaction(f.therapist, tx => assign(tx, f.therapist, child.id, f.other.id, true, 'Exceção clínica confirmada', at));
  assert.equal(await db.audit.count({ where: { entityId: fixed.id, action: 'fixed-assigned' } }), 1);
  const target = await db.occurrence.findFirstOrThrow({ where: { slotId: conflict.id, startsAt: { gt: at } }, orderBy: { startsAt: 'asc' } });
  const original = await db.occurrence.findFirstOrThrow({ where: { slotId: slot.id, startsAt: { lt: target.endsAt }, endsAt: { gt: target.startsAt } } });
  await db.appointment.create({ data: { clinicId: f.clinic.id, patientId: f.other.id, occurrenceId: original.id, status: 'CONFIRMED', origin: 'FITTING', opensAt: at, closesAt: target.startsAt } });
  await assert.rejects(transaction(secondTherapist, tx => assign(tx, secondTherapist, conflict.id, f.other.id, false, '', at)));
});

test('liberação manual é auditada e idempotente, preserva confirmadas e reposições e não rematerializa', async () => {
  const f = await fixture(), g = await fixture();
  const slot = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, undefined, at));
  await transaction(f.admin, tx => assign(tx, f.admin, slot.id, f.patient.id, false, '', at));
  const appointments = await db.appointment.findMany({ where: { clinicId: f.clinic.id, patientId: f.patient.id }, orderBy: { opensAt: 'asc' } });
  assert.ok(appointments.length >= 3);
  await db.appointment.update({ where: { id: appointments[0].id }, data: { status: 'CONFIRMED' } });
  await db.appointment.update({ where: { id: appointments[1].id }, data: { origin: 'FITTING' } });
  await assert.rejects(transaction(f.reception, tx => releaseAssignment(tx, f.reception, slot.id, f.patient.id, 'Encerramento solicitado', at)));
  await assert.rejects(transaction(g.admin, tx => releaseAssignment(tx, g.admin, slot.id, f.patient.id, 'Encerramento solicitado', at)));
  for (let i = 0; i < 2; i++) await transaction(f.admin, tx => releaseAssignment(tx, f.admin, slot.id, f.patient.id, 'Encerramento solicitado', at));
  await transaction(f.admin, tx => materialize(tx, f.admin, at));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: appointments[0].id } })).status, 'CONFIRMED');
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: appointments[1].id } })).origin, 'FITTING');
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: appointments[2].id } })).status, 'CANCELLED');
  assert.equal(await db.fixedAssignment.count({ where: { slotId: slot.id, active: true } }), 0);
  assert.equal(await db.audit.count({ where: { clinicId: f.clinic.id, action: 'fixed-released' } }), 1);
  assert.equal(await db.notification.count({ where: { clinicId: f.clinic.id, event: 'fixed-released' } }), 2);
});

test('redução de capacidade e alocação concorrentes preservam limite e reservas', async () => {
  const f = await fixture();
  const slot = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, undefined, at));
  await transaction(f.admin, tx => assign(tx, f.admin, slot.id, f.patient.id, false, '', at));
  const results = await Promise.allSettled([
    transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...values, capacity: 1 }, slot.id, at)),
    transaction(f.admin, tx => assign(tx, f.admin, slot.id, f.other.id, false, '', at)),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const saved = await db.slot.findUniqueOrThrow({ where: { id: slot.id } });
  assert.ok(await db.fixedAssignment.count({ where: { slotId: slot.id, active: true } }) <= saved.capacity);
});

test('redução de capacidade disputa com reserva de encaixe sem exceder vagas', async () => {
  const f = await fixture();
  const slot = await transaction(f.therapist, tx => saveSlot(tx, f.therapist, values, undefined, at));
  await db.slot.update({ where: { id: slot.id }, data: { groupOffering: true } });
  await transaction(f.admin, tx => assign(tx, f.admin, slot.id, f.patient.id, false, '', at));
  const original = await f.appointment('CANCELLED', -24, f.other);
  const target = await db.occurrence.findFirstOrThrow({ where: { slotId: slot.id }, orderBy: { startsAt: 'asc' } });
  await f.availability(target.id, f.other);
  const results = await Promise.allSettled([
    transaction(f.other, tx => reserve(tx, f.other, original.id, target.id, at)),
    transaction(f.therapist, tx => saveSlot(tx, f.therapist, { ...values, capacity: 1 }, slot.id, at)),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const saved = await db.slot.findUniqueOrThrow({ where: { id: slot.id } });
  assert.ok(1 + await db.reservation.count({ where: { occurrenceId: target.id, active: true } }) <= saved.capacity);
});
