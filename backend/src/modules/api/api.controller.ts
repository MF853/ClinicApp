import { Controller, Get, Post, Body, Req, Param, Query, UseGuards, ParseUUIDPipe, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthRequest, rateLimit } from '../identity/identity.js';
import { db, transaction, audit } from '../../infrastructure/db.js';
import { roles, appointment, patient, certificate } from '../../infrastructure/access.js';
import { respond, releasePending } from '../confirmation/confirmation.js';
import { attendance, countAbsences, consequence, decideCertificate } from '../absences/absences.js';
import { suggestions, reserve, decideFitting, occupancy, careSuggestions, listFittings } from '../fitting/fitting.js';
import { schedule, assign, saveSlot, releaseAssignment, reactivateAssignment } from '../schedule/schedule.js';
import { ResponseDto, AttendanceDto, DecisionDto, ReserveDto, ConsequenceDto, AvailabilityDto, SlotDto, AssignDto, MemberDto, ParametersDto, AlertDto, PrivacyDto, ConsentDto, MemberStatusDto, PatientParametersDto, ReasonDto } from './dto.js';
import { listAlerts, publishAlert } from '../alerts/alerts.js';
import { createMember, memberStatus, patientParameters } from '../members/members.js';
@ApiTags('Clínica')
@UseGuards(AuthGuard)
@Controller()
export class ApiController {
  @Get('agenda') agenda(@Req() r: AuthRequest, @Query('from') from: string, @Query('to') to: string) { return schedule(db, r.context, from, to); }
  @Get('appointments/:id') one(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return appointment(db, r.context, id); }
  @Post('appointments/:id/respond') async respond(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: ResponseDto) { await rateLimit(`respond:${r.context.id}`, 60); return transaction(r.context, tx => respond(tx, r.context, id, b.action)); }
  @Post('appointments/:id/release') releasePending(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: ReasonDto) { return transaction(r.context, tx => releasePending(tx, r.context, id, b.reason)); }
  @Post('appointments/:id/attendance') attendance(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: AttendanceDto) { return transaction(r.context, tx => attendance(tx, r.context, id, b.outcome)); }
  @Get('patients/:id/absences') async absences(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { await patient(db, r.context, id); return { summary: await countAbsences(db, r.context, id), items: await db.absence.findMany({ where: { clinicId: r.context.clinicId, patientId: id }, orderBy: { occurredAt: 'desc' } }) }; }
  @Post('patients/:id/consequence') consequence(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: ConsequenceDto) { return transaction(r.context, tx => consequence(tx, r.context, id, b.action, b.reason, b.until)); }
  @Get('fittings/suggestions') suggestions(@Req() r: AuthRequest, @Query('originalId', ParseUUIDPipe) id: string, @Query('days') days: string) { return suggestions(db, r.context, id, Number(days ?? 7)); }
  @Post('fittings') reserve(@Req() r: AuthRequest, @Body() b: ReserveDto) { return transaction(r.context, tx => reserve(tx, r.context, b.originalId ?? null, b.occurrenceId)); }
  @Get('care/suggestions') careSuggestions(@Req() r: AuthRequest, @Query('days') days: string) { return careSuggestions(db, r.context, Number(days ?? 7)); }
  @Get('fittings') fittings(@Req() r: AuthRequest) { return listFittings(db, r.context); }
  @Post('fittings/:id/decision') decide(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: DecisionDto) { return transaction(r.context, tx => decideFitting(tx, r.context, id, b.decision, b.reason)); }
  @Get('certificates') async certificates(@Req() r: AuthRequest) { roles(r.context, 'PATIENT', 'THERAPIST', 'ADMIN'); if (r.context.role === 'ADMIN' && !r.context.canReview) throw new ForbiddenException(); const rows = await db.certificate.findMany({ where: { clinicId: r.context.clinicId, ...(r.context.role === 'PATIENT' ? { patientId: r.context.id } : {}) }, orderBy: { submittedAt: 'asc' } }); const result = []; for (const row of rows) { try { result.push(await certificate(db, r.context, row.id)); } catch (e) { if (!(e instanceof ForbiddenException)) throw e; } } return result; }
  @Get('certificates/:id') certificate(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return certificate(db, r.context, id); }
  @Post('certificates/:id/decision') decideCertificate(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: DecisionDto) { return transaction(r.context, tx => decideCertificate(tx, r.context, id, b.decision, b.reason)); }
  @Get('availability') availability(@Req() r: AuthRequest) { roles(r.context, 'PATIENT'); return db.availability.findMany({ where: { patientId: r.context.id, clinicId: r.context.clinicId }, orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] }); }
  @Post('availability') availabilitySave(@Req() r: AuthRequest, @Body() b: AvailabilityDto) { roles(r.context, 'PATIENT'); if (b.endMinute <= b.startMinute) throw new BadRequestException('O fim deve ser posterior ao início.'); return transaction(r.context, tx => tx.availability.upsert({ where: { patientId_weekday_startMinute: { patientId: r.context.id, weekday: b.weekday, startMinute: b.startMinute } }, create: { ...b, clinicId: r.context.clinicId, patientId: r.context.id }, update: { endMinute: b.endMinute } })); }
  @Get('members') async members(@Req() r: AuthRequest) { roles(r.context, 'ADMIN', 'THERAPIST', 'RECEPTION'); const rows = await db.membership.findMany({ where: { clinicId: r.context.clinicId, ...(r.context.role === 'ADMIN' ? {} : { active: true }) }, orderBy: { user: { name: 'asc' } }, include: { user: { select: { name: true, email: true, phone: true } } } }); if (r.context.role !== 'THERAPIST') return rows; const permitted = []; for (const row of rows) { if (row.id === r.context.id) { permitted.push(row); continue; } if (row.role !== 'PATIENT') continue; try { await patient(db, r.context, row.id); permitted.push(row); } catch (e) { if (!(e instanceof ForbiddenException)) throw e; } } return permitted; }
  @Post('members') createMember(@Req() r: AuthRequest, @Body() b: MemberDto) { return createMember(r.context, b); }
  @Post('members/:id/status') memberStatus(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: MemberStatusDto) { return transaction(r.context, tx => memberStatus(tx, r.context, id, b.active, b.reason)); }
  @Post('patients/:id/parameters') patientParameters(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: PatientParametersDto) { return transaction(r.context, tx => patientParameters(tx, r.context, id, b)); }
  @Get('slots') async slots(@Req() r: AuthRequest) {
    roles(r.context, 'ADMIN', 'THERAPIST', 'RECEPTION');
    const therapists = await db.membership.findMany({ where: { clinicId: r.context.clinicId, role: 'THERAPIST', active: true }, include: { user: { select: { name: true } } } });
    const slots = await db.slot.findMany({ where: { clinicId: r.context.clinicId, therapistId: r.context.role === 'THERAPIST' ? r.context.id : { in: therapists.map(t => t.id) } }, orderBy: [{ weekday: 'asc' }, { minute: 'asc' }] });
    const assignments = await db.fixedAssignment.findMany({ where: { clinicId: r.context.clinicId, slotId: { in: slots.map(s => s.id) }, active: true } });
    const patients = await db.membership.findMany({ where: { clinicId: r.context.clinicId, id: { in: assignments.map(a => a.patientId) } }, include: { user: { select: { name: true } } } });
    return slots.map(s => ({ ...s, therapist: therapists.find(t => t.id === s.therapistId)?.user.name, assignments: assignments.filter(a => a.slotId === s.id).map(a => ({ patientId: a.patientId, name: patients.find(p => p.id === a.patientId)?.user.name })) }));
  }
  @Post('slots') slot(@Req() r: AuthRequest, @Body() b: SlotDto) { return transaction(r.context, tx => saveSlot(tx, r.context, b)); }
  @Post('slots/:id') updateSlot(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: SlotDto) { return transaction(r.context, tx => saveSlot(tx, r.context, b, id)); }
  @Post('slots/:id/assignments/:patientId/release') release(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('patientId', ParseUUIDPipe) patientId: string, @Body() b: ReasonDto) { return transaction(r.context, tx => releaseAssignment(tx, r.context, id, patientId, b.reason)); }
  @Post('slots/:id/assignments/:patientId/reactivate') reactivate(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('patientId', ParseUUIDPipe) patientId: string, @Body() b: ReasonDto) { return transaction(r.context, tx => reactivateAssignment(tx, r.context, id, patientId, b.reason)); }
  @Post('slots/:id/assign') assign(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: AssignDto) { return transaction(r.context, tx => assign(tx, r.context, id, b.patientId, b.exception, b.reason)); }
  @Post('occurrences/:id/block') block(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { roles(r.context, 'THERAPIST'); return transaction(r.context, async tx => { const o = await tx.occurrence.findFirstOrThrow({ where: { id, clinicId: r.context.clinicId } }); await tx.slot.findFirstOrThrow({ where: { id: o.slotId, therapistId: r.context.id, clinicId: r.context.clinicId } }); if (await occupancy(tx, id) > 0) throw new BadRequestException('Resolva consultas e reservas antes de bloquear.'); const result = await tx.occurrence.update({ where: { id }, data: { blocked: !o.blocked } }); await audit(tx, r.context, 'occurrence-block', id, { blocked: result.blocked }); return result; }); }
  @Post('parameters') parameters(@Req() r: AuthRequest, @Body() b: ParametersDto) { roles(r.context, 'ADMIN'); return transaction(r.context, async tx => { const result = await tx.clinic.update({ where: { id: r.context.clinicId }, data: b }); await audit(tx, r.context, 'parameters-updated', r.context.clinicId, { ...b }); return result; }); }
  @Get('alerts') alerts(@Req() r: AuthRequest) { return listAlerts(db, r.context); }
  @Post('alerts') alert(@Req() r: AuthRequest, @Body() b: AlertDto) { return transaction(r.context, tx => publishAlert(tx, r.context, b)); }
  @Get('notifications') notifications(@Req() r: AuthRequest) { return db.notification.findMany({ where: { clinicId: r.context.clinicId, userId: r.context.userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  @Post('privacy/requests') privacy(@Req() r: AuthRequest, @Body() b: PrivacyDto) { return db.privacyRequest.create({ data: { userId: r.context.userId, type: b.type } }); }
  @Post('consents') consent(@Req() r: AuthRequest, @Body() b: ConsentDto) { return db.consent.upsert({ where: { userId_document_version: { userId: r.context.userId, ...b } }, create: { userId: r.context.userId, ...b }, update: {} }); }
}
