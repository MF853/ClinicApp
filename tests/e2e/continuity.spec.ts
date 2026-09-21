import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { hash } from 'argon2';
Object.assign(process.env, parseEnv(readFileSync('.env', 'utf8')));
const { db, transaction } = await import('../../backend/dist/infrastructure/db.js');
const { fixture } = await import('../../backend/dist/tests/fixture.js');
const { assign } = await import('../../backend/dist/modules/schedule/schedule.js');
const { consequence } = await import('../../backend/dist/modules/absences/absences.js');

test('continuidade: bloqueio visível, reset justificado, reativação e liberação pontual', async ({ page }, info) => {
  const f = await fixture(), now = new Date(), password = 'Teste-continuidade!2026';
  const encoded = await hash(password);
  for (const ctx of [f.admin, f.therapist, f.reception]) await db.user.update({ where: { id: ctx.userId }, data: { password: encoded } });
  await transaction(f.admin, tx => assign(tx, f.admin, f.slot.id, f.patient.id, false, '', now));
  for (let i = 0; i < 3; i++) {
    const absence = await f.absence('CONSOLIDATED');
    await db.absence.update({ where: { id: absence.id }, data: { occurredAt: new Date(now.getTime() - (i + 1) * 86400000) } });
  }
  await transaction(f.admin, tx => consequence(tx, f.admin, f.patient.id, 'apply', 'Avaliação humana fictícia', undefined, now));
  async function login(email: string) {
    await page.context().clearCookies(); await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Pacientes', exact: true })).toBeVisible();
  }
  const { reserve } = await import('../../backend/dist/modules/fitting/fitting.js');
  const original = await db.appointment.findFirstOrThrow({ where: { clinicId: f.clinic.id, status: 'CANCELLED' } });
  const target = await f.occurrence(72); await f.availability(target.id);
  await transaction(f.patient, tx => reserve(tx, f.patient, original.id, target.id, now));
  await login(f.therapist.user.email);
  await page.getByRole('link', { name: 'Encaixes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aprovar encaixe' })).toBeDisabled();
  await expect(page.getByText('Esta sessão está bloqueada. A aprovação cabe à recepção.')).toBeVisible();
  await page.screenshot({ path: `test-results/encaixe-bloqueado-${info.project.name}.png`, fullPage: true });
  await login(f.reception.user.email);
  await page.getByRole('link', { name: 'Encaixes', exact: true }).click();
  await page.getByRole('button', { name: 'Aprovar encaixe' }).click();
  await expect(page.getByText('Aprovado', { exact: true })).toBeVisible();
  await login(f.admin.user.email);
  await page.getByRole('link', { name: 'Pacientes', exact: true }).click();
  await page.getByLabel('Buscar por nome ou e-mail').fill(f.patient.user.email);
  await page.getByRole('button', { name: 'Ver acompanhamento' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Sessão bloqueada', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Zerar contador com justificativa' })).toBeDisabled();
  await dialog.getByLabel('Justificativa da decisão').fill('Novo período de acompanhamento');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dialog.evaluate(el => { el.scrollTop = 0; });
    await dialog.screenshot({ path: `test-results/continuidade-topo-${info.project.name}-${width}.png` });
    await dialog.getByRole('button', { name: 'Zerar contador com justificativa' }).scrollIntoViewIfNeeded();
    await dialog.screenshot({ path: `test-results/continuidade-${info.project.name}-${width}.png` });
  }
  await dialog.getByRole('button', { name: 'Zerar contador com justificativa' }).click();
  await expect(dialog).toContainText('0 de 3 faltas');
  await expect(dialog.getByText('Sessão bloqueada', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Reativar esta sessão' }).click();
  await expect(dialog.getByText('Sessão bloqueada', { exact: true })).toHaveCount(0);
  const a = await db.appointment.findFirstOrThrow({ where: { clinicId: f.clinic.id, patientId: f.patient.id, status: 'SCHEDULED' }, orderBy: { opensAt: 'asc' } });
  await db.appointment.update({ where: { id: a.id }, data: { status: 'EXPIRED', closesAt: new Date(now.getTime() - 1000) } });
  const o = await db.occurrence.findUniqueOrThrow({ where: { id: a.occurrenceId } });
  await login(f.therapist.user.email);
  await page.getByLabel('Data de referência').fill(new Intl.DateTimeFormat('en-CA', { timeZone: f.clinic.timezone }).format(o.startsAt));
  await page.locator('article').filter({ hasText: 'Confirmação encerrada' }).getByRole('button', { name: 'Ver consulta' }).click();
  await dialog.getByLabel('Motivo da liberação pontual').fill('Sem resposta no prazo concedido');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await dialog.screenshot({ path: `test-results/liberacao-${info.project.name}-${width}.png` });
  }
  await dialog.getByRole('button', { name: 'Confirmar liberação desta consulta' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Horário liberado', { exact: true })).toBeVisible();
  expect(await db.absence.count({ where: { appointmentId: a.id } })).toBe(0);
});

test.afterAll(() => db.$disconnect());
