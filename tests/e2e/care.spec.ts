import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { hash } from 'argon2';
Object.assign(process.env, parseEnv(readFileSync('.env', 'utf8')));
const { db } = await import('../../backend/dist/infrastructure/db.js');
const { fixture } = await import('../../backend/dist/tests/fixture.js');
test.afterAll(() => db.$disconnect());

test('paciente sem consulta anterior pede avulso; recepção recusa e aprova com acompanhamento', async ({ page }, info) => {
  const f = await fixture(), now = new Date(), password = 'Teste-atendimento!2026', encoded = await hash(password);
  for (const ctx of [f.patient, f.therapist, f.reception]) await db.user.update({ where: { id: ctx.userId }, data: { password: encoded } });
  await db.fixedAssignment.create({ data: { clinicId: f.clinic.id, slotId: f.slot.id, patientId: f.patient.id, active: false, blockedAt: now } });
  const start = new Date(now); start.setUTCDate(start.getUTCDate() + 2); start.setUTCHours(15, 0, 0, 0);
  const o = await db.occurrence.create({ data: { clinicId: f.clinic.id, slotId: f.slot.id, startsAt: start, endsAt: new Date(start.getTime() + 3000000) } });
  await f.availability(o.id);
  async function login(email: string) {
    await page.context().clearCookies(); await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('link', { name: 'Encaixes', exact: true }).click();
  }
  async function request() {
    await page.getByLabel('Tipo de solicitação').selectOption('care');
    await page.getByRole('button', { name: 'Buscar nos próximos 7 dias' }).click();
    await expect(page.getByRole('button', { name: 'Solicitar este horário' })).toBeVisible();
    await page.getByRole('button', { name: 'Solicitar este horário' }).click();
    await expect(page.locator('article').filter({ hasText: 'Pendente' })).toHaveCount(1);
  }
  expect(await db.appointment.count({ where: { patientId: f.patient.id } })).toBe(0);
  await login(f.patient.user.email);
  await page.getByLabel('Tipo de solicitação').selectOption('care');
  await page.getByRole('button', { name: 'Buscar nos próximos 7 dias' }).click();
  await expect(page.getByRole('button', { name: 'Solicitar este horário' })).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/avulso-busca-${info.project.name}-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Solicitar este horário' }).click();
  await expect(page.locator('article')).toContainText('Pendente');
  await login(f.therapist.user.email);
  await expect(page.getByRole('button', { name: 'Aprovar atendimento' })).toBeDisabled();
  await page.getByLabel('Motivo da recusa, quando necessário').fill('Motivo que não autoriza este perfil');
  await expect(page.getByRole('button', { name: 'Recusar com motivo' })).toBeDisabled();
  await login(f.reception.user.email);
  await expect(page.locator('article')).toContainText(f.patient.user.name);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/avulso-recepcao-${info.project.name}-${width}.png`, fullPage: true });
  }
  await page.getByLabel('Motivo da recusa, quando necessário').fill('Paciente solicitou outro horário');
  await page.getByRole('button', { name: 'Recusar com motivo' }).click();
  await expect(page.getByText('Rejeitado', { exact: true })).toBeVisible();
  await login(f.patient.user.email);
  await expect(page.locator('article')).toContainText('Paciente solicitou outro horário');
  await request();
  await login(f.reception.user.email);
  await page.getByRole('button', { name: 'Aprovar atendimento' }).click();
  await expect(page.getByText('Aprovado', { exact: true })).toBeVisible();
  await login(f.patient.user.email);
  await page.getByRole('link', { name: 'Ver consulta na agenda' }).click();
  await expect(page.getByRole('button', { name: 'Ver consulta' })).toHaveCount(1);
  const a = await db.appointment.findUniqueOrThrow({ where: { occurrenceId_patientId: { occurrenceId: o.id, patientId: f.patient.id } } });
  expect(a.origin).toBe('STANDALONE'); expect(a.originalId).toBeNull();
  expect(await db.fixedAssignment.count({ where: { clinicId: f.clinic.id, patientId: f.patient.id, active: true } })).toBe(0);
});
