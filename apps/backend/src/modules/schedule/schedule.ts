import {BadRequestException,ConflictException} from '@nestjs/common';
import {DateTime} from 'luxon';
import {type Context,type Tx,now,audit} from '../../infrastructure/db.js';
import {roles} from '../../infrastructure/access.js';
import {confirmationWindow,ageAt} from '../../infrastructure/time.js';
import {occupancy} from '../fitting/fitting.js';
export async function materialize(tx:Tx,ctx:Context,at=now()) {
 const slots=await tx.slot.findMany({where:{clinicId:ctx.clinicId,blocked:false}});
 for(let day=0;day<28;day++) {
  const date=DateTime.fromJSDate(at,{zone:ctx.clinic.timezone}).startOf('day').plus({days:day});
  for(const slot of slots.filter(s=>s.weekday===date.weekday%7)) {
   const start=date.plus({minutes:slot.minute});if(start.toMillis()<=at.getTime())continue;
   const o=await tx.occurrence.upsert({where:{slotId_startsAt:{slotId:slot.id,startsAt:start.toJSDate()}},create:{clinicId:ctx.clinicId,slotId:slot.id,startsAt:start.toJSDate(),endsAt:start.plus({minutes:slot.duration}).toJSDate()},update:{}});
   if(o.blocked)continue;
   const assignments=await tx.fixedAssignment.findMany({where:{slotId:slot.id,clinicId:ctx.clinicId,active:true}});
   for(const a of assignments) {
    if(await tx.appointment.findUnique({where:{occurrenceId_patientId:{occurrenceId:o.id,patientId:a.patientId}}}))continue;
    if(await occupancy(tx,o.id)>=slot.capacity)continue;
    const window=confirmationWindow(o.startsAt,at,ctx.clinic);
    await tx.appointment.create({data:{clinicId:ctx.clinicId,occurrenceId:o.id,patientId:a.patientId,...window}});
   }
  }
 }
}
export async function assign(tx:Tx,ctx:Context,slotId:string,patientId:string,exception:boolean,reason:string,at=now()) {
 roles(ctx,'THERAPIST','ADMIN','RECEPTION');
 const p=await tx.membership.findFirstOrThrow({where:{id:patientId,clinicId:ctx.clinicId,role:'PATIENT',active:true}});
 const slot=await tx.slot.findFirstOrThrow({where:{id:slotId,clinicId:ctx.clinicId,...(ctx.role==='THERAPIST'?{therapistId:ctx.id}:{})}});
 const age=p.birthDate?ageAt(p.birthDate,at,ctx.clinic.timezone):null;
 const existing=await tx.fixedAssignment.findUnique({where:{slotId_patientId:{slotId,patientId}}});if(existing?.active)return existing;
 const mismatch=age===null||age<slot.minAge||age>slot.maxAge;
 if(mismatch&&(!exception||ctx.role!=='THERAPIST'||reason.trim().length<5))throw new ConflictException('Restrição de idade. A exceção exige confirmação explícita e justificativa do terapeuta.');
 if(slot.blocked||await tx.fixedAssignment.count({where:{slotId,active:true}})>=slot.capacity)throw new ConflictException('Este slot está bloqueado ou com capacidade esgotada.');
 const occurrences=await tx.occurrence.findMany({where:{slotId,clinicId:ctx.clinicId,startsAt:{gt:at},blocked:false}});
 for(const o of occurrences)if(await occupancy(tx,o.id)>=slot.capacity)throw new ConflictException('Uma ocorrência futura já está ocupada ou reservada.');
 const result=await tx.fixedAssignment.upsert({where:{slotId_patientId:{slotId,patientId}},create:{slotId,patientId,clinicId:ctx.clinicId},update:{active:true}});
 await materialize(tx,ctx,at);await audit(tx,ctx,'fixed-assigned',result.id,{exception:mismatch,reason});return result;
}
export async function schedule(tx:Tx,ctx:Context,from:string,to:string) {
 const start=new Date(from),end=new Date(to);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||end.getTime()-start.getTime()>32*86400000)throw new BadRequestException('Informe um intervalo de até 32 dias.');
 const slots=await tx.slot.findMany({where:{clinicId:ctx.clinicId,...(ctx.role==='THERAPIST'?{therapistId:ctx.id}:{})}});
 const occurrences=await tx.occurrence.findMany({where:{clinicId:ctx.clinicId,slotId:{in:slots.map(s=>s.id)},startsAt:{gte:start,lt:end}},orderBy:{startsAt:'asc'}});
 const all=await tx.appointment.findMany({where:{clinicId:ctx.clinicId,occurrenceId:{in:occurrences.map(o=>o.id)}}});
 const appointments=all.filter(a=>ctx.role!=='PATIENT'||a.patientId===ctx.id);
 const members=await tx.membership.findMany({where:{clinicId:ctx.clinicId,id:{in:[...appointments.map(a=>a.patientId),...slots.map(s=>s.therapistId)]}},include:{user:{select:{name:true}}}});
 const reservations=await tx.reservation.findMany({where:{clinicId:ctx.clinicId,active:true,occurrenceId:{in:occurrences.map(o=>o.id)}}});
 return occurrences.filter(o=>ctx.role!=='PATIENT'||appointments.some(a=>a.occurrenceId===o.id)).map(o=>{
  const slot=slots.find(s=>s.id===o.slotId)!;
  return {...o,slot,therapist:members.find(m=>m.id===slot.therapistId)?.user.name,appointments:appointments.filter(a=>a.occurrenceId===o.id).map(a=>({...a,patientName:members.find(m=>m.id===a.patientId)?.user.name})),reserved:reservations.filter(r=>r.occurrenceId===o.id).length,occupied:all.filter(a=>a.occurrenceId===o.id&&!['CANCELLED','ABSENT','EXCUSED'].includes(a.status)).length};
 });
}
