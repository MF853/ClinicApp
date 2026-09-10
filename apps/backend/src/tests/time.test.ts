import {test} from 'node:test';
import assert from 'node:assert/strict';
import {businessDeadline,confirmationWindow,ageAt} from '../infrastructure/time.js';
test('dias úteis incluem feriados e fim de dia local',()=>{assert.equal(businessDeadline(new Date('2026-09-04T12:00:00Z'),3,'America/Fortaleza',['2026-09-07']).toISOString(),'2026-09-11T02:59:59.999Z');});
test('confirmação abre na véspera local ou imediatamente para consulta recente',()=>{const clinic={timezone:'America/Fortaleza',confirmationHour:18,closeHours:2};assert.equal(confirmationWindow(new Date('2026-09-10T12:00:00Z'),new Date('2026-09-01T00:00:00Z'),clinic).opensAt.toISOString(),'2026-09-09T21:00:00.000Z');assert.equal(confirmationWindow(new Date('2026-09-10T12:00:00Z'),new Date('2026-09-10T09:00:00Z'),clinic).opensAt.toISOString(),'2026-09-10T09:00:00.000Z');assert.equal(ageAt(new Date('2000-09-11T00:00:00Z'),new Date('2026-09-10T00:00:00Z'),'UTC'),25);});
