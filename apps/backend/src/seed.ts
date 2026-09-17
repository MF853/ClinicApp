import { db, transaction, type Context } from './infrastructure/db.js';
import argon2 from 'argon2';
import { DateTime } from 'luxon';
import type { Role } from '@prisma/client';
import { materialize } from './modules/schedule/schedule.js';
import { ensureBucket } from './infrastructure/storage.js';
if (process.env.NODE_ENV === 'production') throw new Error('Seed demonstrativo proibido em produção');
const password = await argon2.hash('ClinicApp!2026', { type: argon2.argon2id });
async function member(clinicId: string, email: string, name: string, role: Role): Promise<Context> {
  const user = await db.user.upsert({ where: { email }, create: { email, name, password, phone: 'Contato demonstrativo' }, update: {} });
  return db.membership.upsert({ where: { userId_clinicId_role: { userId: user.id, clinicId, role } }, create: { userId: user.id, clinicId, role, birthDate: role === 'PATIENT' ? new Date('1994-04-16') : null, registration: role === 'THERAPIST' ? 'CRP DEMO' : undefined, canReview: role === 'ADMIN' }, update: {}, include: { clinic: true, user: { select: { id: true, name: true, email: true } } } });
}
for (const [index, name, particular] of [[1, 'Clínica Horizonte', false], [2, 'Clínica Ipê', false], [3, 'Atendimento particular · Ana', true]] as const) {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const clinic = await db.clinic.upsert({ where: { id }, create: { id, name, particular }, update: {} });
  const suffix = index === 1 ? '' : String(index);
  const therapist = await member(id, particular ? 'ana@example.test' : `terapeuta${suffix}@example.test`, 'Ana Rodrigues · fictícia', 'THERAPIST');
  const admin = await member(id, particular ? 'ana@example.test' : `admin${suffix}@example.test`, 'Marina Freitas · fictícia', 'ADMIN');
  await member(id, `recepcao${suffix}@example.test`, 'Joana Alves · fictícia', 'RECEPTION');
  const patient = await member(id, `paciente${suffix}@example.test`, 'Beatriz Albuquerque · fictícia', 'PATIENT');
  const other = await member(id, `paciente-extra${suffix}@example.test`, 'Rafael de Vasconcelos e Albuquerque · fictício', 'PATIENT');
  await transaction(admin, async tx => {
    for (let weekday = 0; weekday < 7; weekday++) {
      for (const minute of [540, 660, 840, 960]) {
        const slot = await tx.slot.upsert({ where: { therapistId_weekday_minute: { therapistId: therapist.id, weekday, minute } }, create: { clinicId: id, therapistId: therapist.id, weekday, minute, capacity: minute === 960 ? 3 : 1, minAge: 18, maxAge: 90, room: minute < 800 ? 'Sala 1' : 'Sala 2' }, update: {} });
        if (minute === 540 || minute === 840) await tx.fixedAssignment.upsert({ where: { slotId_patientId: { slotId: slot.id, patientId: minute === 540 ? patient.id : other.id } }, create: { clinicId: id, slotId: slot.id, patientId: minute === 540 ? patient.id : other.id }, update: {} });
      }
      for (const p of [patient, other]) await tx.availability.upsert({ where: { patientId_weekday_startMinute: { patientId: p.id, weekday, startMinute: 480 } }, create: { clinicId: id, patientId: p.id, weekday, startMinute: 480, endMinute: 1080 }, update: {} });
    }
    await materialize(tx, admin);
    if (!await tx.absence.findFirst({ where: { clinicId: id } })) {
      const slot = await tx.slot.findFirstOrThrow({ where: { clinicId: id, therapistId: therapist.id } });
      const start = DateTime.now().setZone(clinic.timezone).minus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
      const occurrence = await tx.occurrence.create({ data: { clinicId: id, slotId: slot.id, startsAt: start.toJSDate(), endsAt: start.plus({ minutes: 50 }).toJSDate() } });
      const appointment = await tx.appointment.create({ data: { clinicId: id, occurrenceId: occurrence.id, patientId: patient.id, status: 'ABSENT', opensAt: start.minus({ days: 1 }).toJSDate(), closesAt: start.minus({ hours: 2 }).toJSDate() } });
      await tx.absence.create({ data: { clinicId: id, appointmentId: appointment.id, patientId: patient.id, occurredAt: start.toJSDate(), deadline: DateTime.now().plus({ days: 3 }).endOf('day').toJSDate(), reason: 'NO_SHOW' } });
      const future = await tx.appointment.findFirst({ where: { clinicId: id, patientId: patient.id }, orderBy: { closesAt: 'desc' } });
      if (future) await tx.appointment.update({ where: { id: future.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      const nearest = await tx.appointment.findFirst({ where: { clinicId: id, patientId: patient.id, closesAt: { gt: new Date() }, status: 'SCHEDULED' }, orderBy: { closesAt: 'asc' } });
      if (nearest) await tx.appointment.update({ where: { id: nearest.id }, data: { status: 'PENDING', opensAt: new Date(Date.now() - 60000) } });
      await tx.alert.create({ data: { clinicId: id, audience: 'ALL', text: 'Bem-vindo. Estes são cenários fictícios para conhecer os fluxos da clínica.', endsAt: DateTime.now().plus({ years: 1 }).toJSDate() } });
    }
  });
}
await ensureBucket(); await db.$disconnect();
console.log('Seed fictício pronto. Contas e senha demonstrativas estão no README.');
