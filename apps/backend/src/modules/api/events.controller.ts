import { Controller, Req, Sse, UseGuards, type MessageEvent } from '@nestjs/common';
import { interval, from, startWith, concatMap, takeWhile } from 'rxjs';
import { db } from '../../infrastructure/db.js';
import { AuthGuard, type AuthRequest } from '../identity/identity.js';
@UseGuards(AuthGuard)
@Controller('events')
export class EventsController {
  @Sse() events(@Req() req: AuthRequest) { return interval(5000).pipe(startWith(0), concatMap(() => from(this.current(req))), takeWhile(event => event.type !== 'session-expired', true)); }
  private async current(req: AuthRequest): Promise<MessageEvent> {
    const session = await db.session.findFirst({ where: { id: req.sessionId, membershipId: req.context.id, expiresAt: { gt: new Date() } } });
    const active = await db.membership.findFirst({ where: { id: req.context.id, active: true } });
    if (!session || !active) return { type: 'session-expired', data: {} };
    const latest = await db.audit.findFirst({ where: { clinicId: req.context.clinicId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    return { type: 'changed', data: { revision: latest?.createdAt.toISOString() ?? '0' } };
  }
}
