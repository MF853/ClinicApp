import 'reflect-metadata';
import { Module, ValidationPipe, Catch, HttpException, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { IdentityController, SessionController, AuthGuard } from './modules/identity/identity.js';
import { ApiController } from './modules/api/api.controller.js';
import { EventsController } from './modules/api/events.controller.js';
import { AttachmentsController } from './modules/absences/attachments.controller.js';
import { HealthController } from './infrastructure/health.js';
@Catch()
class Errors implements ExceptionFilter { catch(error: unknown, host: ArgumentsHost) { const response = host.switchToHttp().getResponse<Response>(); if (error instanceof HttpException) return response.status(error.getStatus()).json(error.getResponse()); if (error instanceof Prisma.PrismaClientKnownRequestError) { const status = error.code === 'P2025' ? 404 : 409; return response.status(status).json({ message: status === 404 ? 'Registro não encontrado neste contexto.' : 'Os dados mudaram ou conflitam com outro registro. Atualize e tente novamente.' }); } console.error(JSON.stringify({ event: 'request-error', type: error instanceof Error ? error.name : 'Unknown' })); return response.status(500).json({ message: 'Houve uma instabilidade temporária. Tente novamente em alguns instantes.' }); } }
@Module({ controllers: [IdentityController, SessionController, ApiController, HealthController, AttachmentsController, EventsController], providers: [AuthGuard] })
export class AppModule { }
export async function createApp() { const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] }); app.setGlobalPrefix('api/v1'); app.use(helmet()); app.use(cookieParser()); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); app.useGlobalFilters(new Errors()); const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('ClinicApp').setVersion('1').addCookieAuth('clinic_session').build()); SwaggerModule.setup('api/v1/docs', app, doc); app.enableShutdownHooks(); return app; }
