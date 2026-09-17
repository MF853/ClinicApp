import { randomUUID } from 'node:crypto';
import { db, type Context } from '../infrastructure/db.js';
import type { Role, AppointmentState } from '@prisma/client';
import { DateTime } from 'luxon';
export const at = new Date('2030-09-10T15:00:00Z');
export async function fixture() {
  const clinic = await db.clinic.create({ data: { name: `Teste ${randomUUID()}` } });
  async function member(role: Role, name: string): Promise<Context> { const user = await db.user.create({ data: { name, email: `${randomUUID()}@example.test`, password: 'not-a-login-hash' } }); return db.membership.create({ data: { userId: user.id, clinicId: clinic.id, role, birthDate: new Date('1990-01-01'), canReview: role === 'ADMIN' }, include: { clinic: true, user: { select: { id: true, name: true, email: true } } } }); }
  const patient = await member('PATIENT', 'Lia Fictícia'), other = await member('PATIENT', 'Caio Fictício'), therapist = await member('THERAPIST', 'Ana Fictícia'), admin = await member('ADMIN', 'Avaliadora Fictícia'), reception = await member('RECEPTION', 'Recepção Fictícia');
  const slot = await db.slot.create({ data: { clinicId: clinic.id, therapistId: therapist.id, weekday: 3, minute: 900, minAge: 18, maxAge: 90 } });
  let offset = 0;
  async function occurrence(hours = 24) { const start = new Date(at.getTime() + hours * 3600000 + offset++ * 60000); return db.occurrence.create({ data: { clinicId: clinic.id, slotId: slot.id, startsAt: start, endsAt: new Date(start.getTime() + 3000000) } }); }
  async function appointment(status: AppointmentState = 'PENDING', hours = 24, p = patient) { const o = await occurrence(hours); return db.appointment.create({ data: { clinicId: clinic.id, occurrenceId: o.id, patientId: p.id, status, opensAt: new Date(at.getTime() - 3600000), closesAt: new Date(o.startsAt.getTime() - 7200000) } }); }
  async function availability(occurrenceId: string, p = patient) { const o = await db.occurrence.findUniqueOrThrow({ where: { id: occurrenceId } }); const day = DateTime.fromJSDate(o.startsAt, { zone: clinic.timezone }).weekday % 7; await db.availability.upsert({ where: { patientId_weekday_startMinute: { patientId: p.id, weekday: day, startMinute: 0 } }, create: { clinicId: clinic.id, patientId: p.id, weekday: day, startMinute: 0, endMinute: 1440 }, update: {} }); }
  async function absence(state = 'PROVISIONAL', deadline = new Date(at.getTime() - 1)) { const a = await appointment('ABSENT', -24); return db.absence.create({ data: { clinicId: clinic.id, appointmentId: a.id, patientId: patient.id, occurredAt: new Date(at.getTime() - 86400000), deadline, state, reason: 'NO_SHOW' } }); }
  async function certificate() { const a = await absence(); return db.certificate.create({ data: { clinicId: clinic.id, absenceId: a.id, patientId: patient.id, category: 'OUTRO', description: 'Justificativa fictícia', reviewAt: new Date(at.getTime() - 1) } }); }
  return { clinic, patient, other, therapist, admin, reception, slot, occurrence, appointment, availability, absence, certificate, member };
}
