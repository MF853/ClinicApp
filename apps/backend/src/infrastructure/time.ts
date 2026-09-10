import {DateTime} from 'luxon';
import type {Clinic} from '@prisma/client';
export function businessDeadline(date:Date,days:number,zone:string,holidays:string[]):Date {
  let d=DateTime.fromJSDate(date,{zone}).startOf('day');
  for(let left=days;left>0;) {d=d.plus({days:1});if(d.weekday<6&&!holidays.includes(d.toISODate()!))left--;}
  return d.endOf('day').toJSDate();
}
export function confirmationWindow(start:Date,created:Date,clinic:Pick<Clinic,'timezone'|'confirmationHour'|'closeHours'>) {
  const local=DateTime.fromJSDate(start,{zone:clinic.timezone});
  const close=local.minus({hours:clinic.closeHours}).toJSDate();
  const open=start.getTime()-created.getTime()<86400000?created:local.minus({days:1}).startOf('day').set({hour:clinic.confirmationHour}).toJSDate();
  return {opensAt:open,closesAt:close};
}
export function ageAt(birth:Date,at:Date,zone:string) {
  return Math.floor(DateTime.fromJSDate(at,{zone}).diff(DateTime.fromISO(birth.toISOString().slice(0,10),{zone}),'years').years);
}
