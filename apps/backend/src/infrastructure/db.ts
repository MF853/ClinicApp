import {PrismaClient, Prisma, type Membership, type Clinic} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {ForbiddenException} from '@nestjs/common';
export const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
export type Tx = Prisma.TransactionClient;
export type Context = Membership & {clinic:Clinic; user:{id:string;name:string;email:string}};
export type Clock = () => Date;
export const now:Clock = () => new Date();
export async function transaction<T>(ctx:Context, fn:(tx:Tx)=>Promise<T>):Promise<T> {
  return db.$transaction(async tx => {
    // ponytail: serialização por clínica; migrar para locks por paciente/ocorrência se a contenção medida exigir.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ctx.clinicId}))`;
    const active=await tx.membership.findFirst({where:{id:ctx.id,clinicId:ctx.clinicId,userId:ctx.userId,role:ctx.role,active:true},include:{clinic:true}});
    if(!active) throw new ForbiddenException('Seu vínculo não está ativo. Entre em contato com a clínica.');
    Object.assign(ctx,active);
    return fn(tx);
  },{timeout:10000});
}
export async function audit(tx:Tx,ctx:Pick<Context,'clinicId'|'id'>,action:string,entityId:string,context:Prisma.InputJsonObject={}) {
  await tx.audit.create({data:{clinicId:ctx.clinicId,actor:ctx.id,action,entityId,context}});
}
export async function notify(tx:Tx,ctx:Pick<Context,'clinicId'>,userId:string,event:string,entityId:string) {
  const id=`${event}:${entityId}:${userId}`;
  await tx.notification.upsert({where:{id},create:{id,clinicId:ctx.clinicId,userId,event,entityId},update:{}});
  await tx.outbox.upsert({where:{id},create:{id,clinicId:ctx.clinicId,kind:'notification',payload:{id}},update:{}});
}
