import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, transaction } from '../infrastructure/db.js';
import { consequence, countAbsences, attendance } from '../modules/absences/absences.js';
import { assign, materialize, reactivateAssignment } from '../modules/schedule/schedule.js';
import { releasePending, respond } from '../modules/confirmation/confirmation.js';
import { reserve, decideFitting, occupancy } from '../modules/fitting/fitting.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());
async function blockedFixture() {
  const f = await fixture();
  await transaction(f.admin, tx => assign(tx, f.admin, f.slot.id, f.patient.id, false, '', at));
  for (let i = 0; i < 3; i++) await f.absence('CONSOLIDATED');
  await transaction(f.admin, tx => consequence(tx, f.admin, f.patient.id, 'apply', 'Decisão humana de teste', undefined, at));
  return f;
}
test('sessão bloqueada persiste, reset não reativa; reativação exige administrador e restaura com auditoria', async () => {
  const f = await blockedFixture(), g = await fixture();
  const where = { slotId_patientId: { slotId: f.slot.id, patientId: f.patient.id } };
  assert.ok((await db.fixedAssignment.findUniqueOrThrow({ where })).blockedAt);
  const sibling = await db.slot.create({ data: { clinicId: f.clinic.id, therapistId: f.therapist.id, weekday: 4, minute: 900 } });
  await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: sibling.id, patientId: f.patient.id, active: false, blockedAt: at } });
  await transaction(f.admin, tx => materialize(tx, f.admin, at));
  assert.equal(await db.appointment.count({ where: { clinicId: f.clinic.id, status: 'SCHEDULED' } }), 0);
  await assert.rejects(transaction(f.therapist, tx => assign(tx, f.therapist, f.slot.id, f.patient.id, false, '', at)));
  await transaction(f.admin, tx => consequence(tx, f.admin, f.patient.id, 'reset', 'Novo período de acompanhamento', undefined, at));
  assert.equal((await countAbsences(db, f.admin, f.patient.id, at)).count, 0);
  assert.equal((await countAbsences(db, f.admin, f.patient.id, at)).blockedSessions.length, 2);
  for (const ctx of [f.therapist, f.reception, f.patient, g.admin]) await assert.rejects(transaction(ctx, tx => reactivateAssignment(tx, ctx, f.slot.id, f.patient.id, 'Retorno autorizado', at)));
  for (let i = 0; i < 2; i++) await transaction(f.admin, tx => reactivateAssignment(tx, f.admin, f.slot.id, f.patient.id, 'Retorno autorizado', at));
  const result = await db.fixedAssignment.findUniqueOrThrow({ where });
  assert.equal(result.active, true); assert.equal(result.blockedAt, null);
  assert.ok(await db.appointment.count({ where: { clinicId: f.clinic.id, status: 'SCHEDULED' } }));
  assert.equal(await db.audit.count({ where: { entityId: result.id, action: 'session-reactivated' } }), 1);
});
test('reativação disputa capacidade com nova alocação e preserva bloqueio em rollback', async () => {
  const f = await blockedFixture();
  const results = await Promise.allSettled([
    transaction(f.admin, tx => reactivateAssignment(tx, f.admin, f.slot.id, f.patient.id, 'Retorno autorizado', at)),
    transaction(f.admin, tx => assign(tx, f.admin, f.slot.id, f.other.id, false, '', at)),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.fixedAssignment.count({ where: { slotId: f.slot.id, active: true } }), 1);
  const fixed = await db.fixedAssignment.findUniqueOrThrow({ where: { slotId_patientId: { slotId: f.slot.id, patientId: f.patient.id } } });
  assert.equal(!!fixed.blockedAt, !fixed.active);
  const occurrences = await db.occurrence.findMany({ where: { slotId: f.slot.id } });
  for (const o of occurrences) assert.ok(await occupancy(db, o.id) <= 1);
});
test('paciente bloqueado solicita encaixe; só recepção aprova sem reativar sessão', async () => {
  const f = await blockedFixture();
  const original = await db.appointment.findFirstOrThrow({ where: { clinicId: f.clinic.id, status: 'CANCELLED' } });
  const target = await f.occurrence(72); await f.availability(target.id);
  const request = await transaction(f.patient, tx => reserve(tx, f.patient, original.id, target.id, at));
  for (const ctx of [f.admin, f.therapist]) await assert.rejects(transaction(ctx, tx => decideFitting(tx, ctx, request.id, 'approve', '', at)));
  await transaction(f.reception, tx => decideFitting(tx, f.reception, request.id, 'approve', '', at));
  assert.equal((await countAbsences(db, f.admin, f.patient.id, at)).blockedSessions.length, 1);
  assert.equal(await db.notification.count({ where: { clinicId: f.clinic.id, userId: f.reception.userId, event: 'fitting-reception-required' } }), 1);
});
test('liberação pontual não penaliza nem cancela até ocupação efetiva; reserva recusada preserva titular', async () => {
  const f = await fixture(), g = await fixture();
  const a = await f.appointment('EXPIRED');
  // Janela concedida antes de alteração de parâmetros: titular expirado, novo encaixe ainda pode confirmar.
  await db.appointment.update({ where: { id: a.id }, data: { closesAt: new Date(at.getTime() - 1) } });
  await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: f.slot.id, patientId: f.patient.id } });
  for (const ctx of [f.admin, f.reception, f.patient, g.therapist]) await assert.rejects(transaction(ctx, tx => releasePending(tx, ctx, a.id, 'Liberar consulta vencida', at)));
  for (let i = 0; i < 2; i++) await transaction(f.therapist, tx => releasePending(tx, f.therapist, a.id, 'Liberar consulta vencida', at));
  assert.equal(await occupancy(db, a.occurrenceId), 0);
  await assert.rejects(transaction(f.patient, tx => respond(tx, f.patient, a.id, 'confirm', at)));
  await assert.rejects(transaction(f.therapist, tx => attendance(tx, f.therapist, a.id, 'absent', new Date(at.getTime() + 2 * 86400000))));
  const original = await f.appointment('CANCELLED', -24, f.other); await f.availability(a.occurrenceId, f.other);
  const first = await transaction(f.other, tx => reserve(tx, f.other, original.id, a.occurrenceId, at));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status, 'RELEASED');
  await transaction(f.therapist, tx => decideFitting(tx, f.therapist, first.id, 'reject', 'Pedido retirado pelo paciente', at));
  const second = await transaction(f.other, tx => reserve(tx, f.other, original.id, a.occurrenceId, at));
  for (let i = 0; i < 2; i++) await transaction(f.therapist, tx => decideFitting(tx, f.therapist, second.id, 'approve', '', at));
  assert.equal((await db.appointment.findUniqueOrThrow({ where: { id: a.id } })).status, 'CANCELLED');
  assert.equal(await db.absence.count({ where: { appointmentId: a.id } }), 0);
  assert.equal(await db.fixedAssignment.count({ where: { slotId: f.slot.id, active: true } }), 1);
  assert.equal(await db.notification.count({ where: { entityId: a.id, event: 'appointment-reassigned' } }), 1);
  assert.equal(await db.audit.count({ where: { entityId: a.id, action: 'pending-released' } }), 1);
});
test('confirmação e liberação concorrentes têm um único vencedor; confirmadas não são liberadas', async () => {
  const f = await fixture(); const a = await f.appointment();
  const results = await Promise.allSettled([
    transaction(f.patient, tx => respond(tx, f.patient, a.id, 'confirm', a.closesAt)),
    transaction(f.therapist, tx => releasePending(tx, f.therapist, a.id, 'Sem resposta no prazo', new Date(a.closesAt.getTime() + 1))),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.absence.count({ where: { appointmentId: a.id } }), 0);
  const confirmed = await f.appointment('CONFIRMED');
  await assert.rejects(transaction(f.therapist, tx => releasePending(tx, f.therapist, confirmed.id, 'Sem resposta no prazo', new Date(confirmed.closesAt.getTime() + 1))));
});
