import { Body, Controller, Get, Post, Param, Query, Req, Res, UseGuards, UseInterceptors, UploadedFiles, ParseUUIDPipe, ForbiddenException, ConflictException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiTags, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { db, audit } from '../../infrastructure/db.js';
import { certificate } from '../../infrastructure/access.js';
import { readObject, signDownload, verifyDownload } from '../../infrastructure/storage.js';
import { AuthGuard, type AuthRequest, rateLimit } from '../identity/identity.js';
import { submitCertificate, appeal, categories } from './certificates.js';
class Submission { @ApiProperty() @IsUUID() absenceId!: string; @ApiProperty({ enum: categories }) @IsIn(categories) category!: string; @ApiProperty() @IsString() @MinLength(5) @MaxLength(2000) description!: string; @ApiPropertyOptional() @IsOptional() @IsDateString() declaredDate?: string; }
class Appeal { @ApiProperty() @IsString() @MinLength(5) @MaxLength(2000) reason!: string; }
@ApiTags('Anexos privados')
@UseGuards(AuthGuard)
@Controller()
export class AttachmentsController {
  @Post('certificates') @ApiConsumes('multipart/form-data') @UseInterceptors(FilesInterceptor('files', 3, { limits: { fileSize: 10 * 1024 * 1024, files: 3, fields: 4, fieldSize: 8000 } }))
  async submit(@Req() r: AuthRequest, @Body() b: Submission, @UploadedFiles() files: Express.Multer.File[]) { await rateLimit(`upload:${r.context.id}`, 15); return submitCertificate(r.context, b, files ?? []); }
  @Post('certificates/:id/appeal') appeal(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() b: Appeal) { return appeal(r.context, id, b.reason); }
  @Get('certificates/:id/attachments') async list(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { await certificate(db, r.context, id); return db.attachment.findMany({ where: { certificateId: id, clinicId: r.context.clinicId }, select: { id: true, mime: true, size: true, status: true, failure: true } }); }
  @Post('attachments/:id/url') async url(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { const a = await db.attachment.findFirstOrThrow({ where: { id, clinicId: r.context.clinicId } }); await certificate(db, r.context, a.certificateId); if (a.status !== 'CLEAN' || a.purgedAt) throw new ConflictException('Arquivo não está disponível: verificação pendente ou retenção encerrada.'); const expires = Date.now() + 60000; await audit(db, r.context, 'download-url-issued', id, { origin: r.ip ?? r.socket.remoteAddress ?? 'unknown' }); return { url: `/api/v1/attachments/${id}/download?expires=${expires}&signature=${signDownload(id, r.context.userId, expires)}` }; }
  @Get('attachments/:id/download') async download(@Req() r: AuthRequest, @Res() res: Response, @Param('id', ParseUUIDPipe) id: string, @Query('expires') expires: string, @Query('signature') signature: string) { await audit(db, r.context, 'download-attempt', id, { origin: r.ip ?? r.socket.remoteAddress ?? 'unknown' }); if (!verifyDownload(id, r.context.userId, Number(expires), signature ?? '')) throw new ForbiddenException('O link expirou. Solicite um novo acesso.'); const a = await db.attachment.findFirstOrThrow({ where: { id, clinicId: r.context.clinicId } }); await certificate(db, r.context, a.certificateId); if (a.status !== 'CLEAN' || a.purgedAt) throw new ForbiddenException(); const bytes = await readObject(a.objectKey); res.set({ 'Content-Type': a.mime, 'Content-Disposition': 'attachment; filename="documento"', 'Cache-Control': 'no-store' }); res.on('finish', () => { void audit(db, r.context, 'download-response-finished', id, { bytes: bytes.length, origin: r.ip ?? r.socket.remoteAddress ?? 'unknown' }).catch(() => console.error('{"event":"download-audit-failed"}')); }); res.send(bytes); }
}
