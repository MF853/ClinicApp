import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, transaction, systemTransaction } from '../infrastructure/db.js';
import { consolidate, decideCertificate, consequence } from '../modules/absences/absences.js';
import { advanceConfirmation } from '../modules/confirmation/confirmation.js';
import { assign, materialize, reactivateAssignment } from '../modules/schedule/schedule.js';
import { reserve, decideFitting } from '../modules/fitting/fitting.js';
import { fixture, at } from './fixture.js';
after(() => db.$disconnect());

test('limiares avisam paciente e terapeutas vinculados uma vez, com outbox e sem destinatários alheios', async () => {
  const f = await fixture(), otherTherapist = await f.member('THERAPIST', 'Terapeuta vinculado');
  await f.member('THERAPIST', 'Terapeuta sem vínculo');
  const slot = await db.slot.create({ data: { clinicId: f.clinic.id, therapistId: otherTherapist.id, weekday: 4, minute: 900 } });
  await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: slot.id, patientId: f.patient.id } });
  await f.absence(); await f.absence(); await f.absence(); await f.absence();
  for (let i = 0; i < 2; i++) await systemTransaction(f.clinic.id, (tx, ctx) => consolidate(tx, ctx, at));
  for (const event of ['absence-warning', 'absence-limit']) {
    const rows = await db.notification.findMany({ where: { clinicId: f.clinic.id, event } });
    assert.deepEqual(rows.map(n => n.userId).sort(), [f.patient.userId, f.therapist.userId, otherTherapist.userId].sort());
    for (const row of rows) {
      const outbox = await db.outbox.findUniqueOrThrow({ where: { id: row.id } });
      assert.deepEqual(outbox.payload, { id: row.id });
    }
  }
  assert.equal(await db.fixedAssignment.count({ where: { clinicId: f.clinic.id, active: true } }), 1);
});
test('rejeição de atestado e consolidação compartilham limiares; aprovação automática audita a consulta', async () => {
  const f = await fixture(); await f.absence('CONSOLIDATED');
  const rejected = await f.certificate();
  for (let i = 0; i < 2; i++) await transaction(f.admin, tx => decideCertificate(tx, f.admin, rejected.id, 'reject', 'Documento insuficiente', false, at));
  assert.equal(await db.notification.count({ where: { clinicId: f.clinic.id, event: 'absence-warning' } }), 2);
  const third = await f.certificate();
  await transaction(f.admin, tx => decideCertificate(tx, f.admin, third.id, 'reject', 'Documento insuficiente', false, at));
  assert.equal(await db.notification.count({ where: { clinicId: f.clinic.id, event: 'absence-limit' } }), 2);
  const approved = await f.certificate();
  for (let i = 0; i < 2; i++) await systemTransaction(f.clinic.id, (tx, ctx) => decideCertificate(tx, ctx, approved.id, 'approve', 'Decurso de prazo', true, at));
  const absence = await db.absence.findUniqueOrThrow({ where: { id: approved.absenceId } });
  const audits = await db.audit.findMany({ where: { entityId: absence.appointmentId, action: 'certificate-appointment-status' } });
  assert.equal(audits.length, 1); assert.equal(audits[0].actor, 'SYSTEM');
  assert.deepEqual(audits[0].context, { before: 'ABSENT', after: 'EXCUSED', certificateId: approved.id });
});
test('abertura e expiração têm auditoria antes/depois e avisos idempotentes, sem falta automática', async () => {
  const f = await fixture(); const a = await f.appointment('SCHEDULED');
  for (let i = 0; i < 2; i++) await systemTransaction(f.clinic.id, (tx, ctx) => advanceConfirmation(tx, ctx, at));
  const open = await db.audit.findFirstOrThrow({ where: { entityId: a.id, action: 'confirmation-open' } });
  assert.equal(open.actor, 'SYSTEM'); assert.deepEqual(open.context, { before: 'SCHEDULED', after: 'PENDING' });
  assert.equal(await db.notification.count({ where: { entityId: a.id, event: 'confirmation-open' } }), 1);
  for (let i = 0; i < 2; i++) await systemTransaction(f.clinic.id, (tx, ctx) => advanceConfirmation(tx, ctx, new Date(a.closesAt.getTime() + 1)));
  const expired = await db.audit.findFirstOrThrow({ where: { entityId: a.id, action: 'confirmation-expired' } });
  assert.deepEqual(expired.context, { before: 'PENDING', after: 'EXPIRED' });
  assert.equal(await db.notification.count({ where: { entityId: a.id, event: 'confirmation-expired', userId: f.therapist.userId } }), 1);
  assert.equal(await db.absence.count({ where: { appointmentId: a.id } }), 0);
});
test('consultas criadas pendentes avisam imediatamente; janela já encerrada só avisa terapeuta', async () => {
  const f = await fixture();
  // Terça-feira, 15h local (18h UTC): três horas depois do relógio fixo de teste.
  await db.slot.update({ where: { id: f.slot.id }, data: { weekday: 2, minute: 900 } });
  await transaction(f.admin, tx => assign(tx, f.admin, f.slot.id, f.patient.id, false, '', at));
  const a = await db.appointment.findFirstOrThrow({ where: { clinicId: f.clinic.id, status: 'PENDING' } });
  await transaction(f.admin, tx => materialize(tx, f.admin, at));
  assert.equal(await db.notification.count({ where: { event: 'confirmation-open', entityId: a.id, userId: f.patient.userId } }), 1);
  const audit = await db.audit.findFirstOrThrow({ where: { entityId: a.id, action: 'appointment-created' } });
  assert.deepEqual(audit.context, { before: null, after: 'PENDING' });
  for (let i = 0; i < 3; i++) await f.absence('CONSOLIDATED');
  await transaction(f.admin, tx => consequence(tx, f.admin, f.patient.id, 'apply', 'Revisão humana', undefined, at));
  for (let i = 0; i < 2; i++) await transaction(f.admin, tx => reactivateAssignment(tx, f.admin, f.slot.id, f.patient.id, 'Retorno autorizado', new Date(at.getTime() + 60000)));
  const reopened = await db.notification.findMany({ where: { event: 'confirmation-open', entityId: a.id, userId: f.patient.userId } });
  assert.equal(reopened.length, 2); // Novo aviso, mas entityId permanece o UUID que o worker revalida.
  assert.notEqual(reopened[0].id, reopened[1].id);
  const g = await fixture(); await db.slot.update({ where: { id: g.slot.id }, data: { weekday: 2, minute: 780 } });
  await transaction(g.admin, tx => assign(tx, g.admin, g.slot.id, g.patient.id, false, '', at));
  const expired = await db.appointment.findFirstOrThrow({ where: { clinicId: g.clinic.id, status: 'EXPIRED' } });
  assert.equal(await db.notification.count({ where: { entityId: expired.id, event: 'confirmation-open' } }), 0);
  assert.equal(await db.notification.count({ where: { entityId: expired.id, event: 'confirmation-expired', userId: g.therapist.userId } }), 1);
  const original = await f.appointment('CANCELLED', -24, f.other), target = await f.occurrence(8); await f.availability(target.id, f.other);
  const request = await transaction(f.other, tx => reserve(tx, f.other, original.id, target.id, at));
  const result = await transaction(f.admin, tx => decideFitting(tx, f.admin, request.id, 'approve', '', at));
  assert.equal(await db.notification.count({ where: { event: 'confirmation-open', entityId: result.appointmentId!, userId: f.other.userId } }), 1);
});
