import {BadRequestException,Body,Controller,Get,Post,Req,Res,UnauthorizedException,ForbiddenException,Injectable,CanActivate,ExecutionContext,HttpException} from '@nestjs/common';
import {IsEmail,IsString,MinLength,MaxLength,IsUUID} from 'class-validator';
import type {Request,Response} from 'express';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import argon2 from 'argon2';
import {db,type Context} from '../../infrastructure/db.js';
import {encrypt} from '../../infrastructure/crypto.js';
import {ApiTags,ApiProperty} from '@nestjs/swagger';
export interface AuthRequest extends Request {context:Context;sessionId:string;csrf:string}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const cookie={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
export function csrfCheck(req:Request,expected?:string) {
  const origin=req.get('origin');
  const allowed=[process.env.WEB_ORIGIN??'http://localhost:5173',...(process.env.MOBILE_ORIGINS?.split(',')??[])];
  if(!origin||!allowed.includes(origin))throw new ForbiddenException('Origem da solicitação não autorizada.');
  const actual=req.get('x-csrf-token')??'';const wanted=expected??String(req.cookies?.clinic_csrf??'');
  if(!/^[a-f0-9]{64}$/.test(actual)||!wanted||actual.length!==wanted.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(wanted)))throw new ForbiddenException('Atualize a página antes de tentar novamente.');
}
export async function rateLimit(key:string,max=20) {
  const rows=await db.$queryRaw<{count:number}[]>`INSERT INTO "RateLimit" (key,count,until) VALUES (${hash(key)},1,now()+interval '15 minutes') ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit".until<now() THEN 1 ELSE "RateLimit".count+1 END, until=CASE WHEN "RateLimit".until<now() THEN now()+interval '15 minutes' ELSE "RateLimit".until END RETURNING count`;
  if(rows[0].count>max)throw new HttpException('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);
}
@Injectable()
export class AuthGuard implements CanActivate {
 async canActivate(execution:ExecutionContext) {
  const req=execution.switchToHttp().getRequest<AuthRequest>();
  const token=String(req.cookies?.clinic_session??'');
  const session=token?await db.session.findUnique({where:{id:hash(token)}}):null;
  if(!session||session.expiresAt<new Date()||!session.membershipId)throw new UnauthorizedException('Sua sessão terminou. Entre novamente para continuar.');
  const membership=await db.membership.findFirst({where:{id:session.membershipId,userId:session.userId,active:true},include:{clinic:true,user:{select:{id:true,name:true,email:true}}}});
  if(!membership)throw new UnauthorizedException();
  if(!['GET','HEAD','OPTIONS'].includes(req.method))csrfCheck(req,session.csrf);
  req.context=membership;req.sessionId=session.id;req.csrf=session.csrf;return true;
 }
}
class Login { @ApiProperty() @IsEmail() email!:string; @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) password!:string; }
class Email { @ApiProperty() @IsEmail() email!:string; }
class Reset { @ApiProperty() @IsString() @MinLength(64) @MaxLength(64) token!:string; @ApiProperty() @IsString() @MinLength(12) @MaxLength(128) password!:string; }
class Switch { @ApiProperty() @IsUUID() membershipId!:string; }
@ApiTags('Identidade')
@Controller('auth')
export class IdentityController {
 @Get('csrf') csrf(@Res({passthrough:true})res:Response) {const token=secret();res.cookie('clinic_csrf',token,cookie);return {csrf:token};}
 @Post('login') async login(@Body()body:Login,@Req()req:Request,@Res({passthrough:true})res:Response) {
  csrfCheck(req);await rateLimit(`ip:${req.ip}`,60);await rateLimit(`account:${body.email.toLowerCase()}`,12);
  const user=await db.user.findUnique({where:{email:body.email.toLowerCase()},include:{memberships:{where:{active:true}}}});
  const valid=user?await argon2.verify(user.password,body.password):false;
  if(!valid||!user?.memberships.length)throw new UnauthorizedException('E-mail ou senha não conferem. Verifique os dados ou recupere sua senha.');
  const token=secret(),csrf=secret();
  const previous=String(req.cookies?.clinic_session??'');
  await db.$transaction(async tx=>{if(previous)await tx.session.deleteMany({where:{id:hash(previous)}});await tx.session.create({data:{id:hash(token),csrf,userId:user.id,membershipId:user.memberships[0].id,expiresAt:new Date(Date.now()+8*3600000)}});});
  res.cookie('clinic_session',token,{...cookie,maxAge:8*3600000});return {csrf};
 }
 @Post('forgot') async forgot(@Body()body:Email,@Req()req:Request) {
  csrfCheck(req);await rateLimit(`recovery:${req.ip}`,10);await rateLimit(`recover-account:${body.email.toLowerCase()}`,5);
  const user=await db.user.findUnique({where:{email:body.email.toLowerCase()}});
  if(user) {
   const token=secret();
   await db.$transaction(async tx=>{await tx.passwordReset.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date()}});await tx.passwordReset.create({data:{id:hash(token),userId:user.id,expiresAt:new Date(Date.now()+1800000)}});await tx.outbox.create({data:{kind:'password-reset',payload:{userId:user.id,encryptedToken:encrypt(Buffer.from(token)).toString('base64')}}});});
  }
  return {message:'Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.'};
 }
 @Post('reset') async reset(@Body()body:Reset,@Req()req:Request) {
  csrfCheck(req);await rateLimit(`reset:${req.ip}`,10);
  const password=await argon2.hash(body.password,{type:argon2.argon2id});
  await db.$transaction(async tx=>{
   const reset=await tx.passwordReset.findUnique({where:{id:hash(body.token)}});
   if(!reset||reset.usedAt||reset.expiresAt<new Date())throw new BadRequestException('Este link expirou ou já foi usado. Solicite outro link.');
   const updated=await tx.passwordReset.updateMany({where:{id:reset.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
   if(updated.count!==1)throw new BadRequestException('Este link já foi usado.');
   await tx.user.update({where:{id:reset.userId},data:{password}});await tx.session.deleteMany({where:{userId:reset.userId}});
  });return {message:'Senha atualizada. Entre com sua nova senha.'};
 }
}
// Guard aplicado em controller separado para manter /csrf, /login e recuperação públicos.
import {UseGuards} from '@nestjs/common';
@ApiTags('Sessão')
@UseGuards(AuthGuard)
@Controller('session')
export class SessionController {
 @Get() async me(@Req()req:AuthRequest) {return {context:req.context,csrf:req.csrf,memberships:await db.membership.findMany({where:{userId:req.context.userId,active:true},include:{clinic:true}})};}
 @Post('switch') async switch(@Body()body:Switch,@Req()req:AuthRequest) {
  const member=await db.membership.findFirst({where:{id:body.membershipId,userId:req.context.userId,active:true}});
  if(!member)throw new ForbiddenException();
  await db.session.update({where:{id:req.sessionId},data:{membershipId:member.id}});return {ok:true};
 }
 @Post('logout') async logout(@Req()req:AuthRequest,@Res({passthrough:true})res:Response) {await db.session.delete({where:{id:req.sessionId}});res.clearCookie('clinic_session',cookie);return {ok:true};}
}
