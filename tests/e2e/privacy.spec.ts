import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { hash } from 'argon2';
Object.assign(process.env, parseEnv(readFileSync('.env', 'utf8')));
const { db } = await import('../../backend/dist/infrastructure/db.js');
const { fixture } = await import('../../backend/dist/tests/fixture.js');
test.afterAll(() => db.$disconnect());
test('privacidade: titular solicita, administrador analisa e responde; titular acompanha', async ({ page }, info) => {
  const f = await fixture(), password = 'Teste-privacidade!2026', encoded = await hash(password);
  for (const ctx of [f.patient, f.admin, f.reception]) await db.user.update({ where: { id: ctx.userId }, data: { password: encoded } });
  async function login(email: string) {
    await page.context().clearCookies(); await page.goto('/entrar'); await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
  }
  async function capture(name: string) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/privacidade-${name}-${info.project.name}-${width}.png`, fullPage: true });
    }
  }
  await login(f.patient.user.email);
  await expect(page.getByText('Nenhum pedido registrado neste contexto.')).toBeVisible();
  await page.locator('form select').selectOption('DELETE'); await page.getByLabel('O que você precisa?').fill('Solicito análise da exclusão dos meus dados nesta clínica.');
  await page.getByRole('button', { name: 'Enviar pedido', exact: true }).click(); await expect(page.locator('article')).toContainText('Recebido');
  await capture('titular');
  const request = await db.privacyRequest.findFirstOrThrow({ where: { userId: f.patient.userId } });
  await login(f.reception.user.email); await expect(page.getByRole('button', { name: 'Pedidos da clínica', exact: true })).toHaveCount(0); await expect(page.locator('article')).toHaveCount(0);
  await login(f.admin.user.email); await page.getByRole('button', { name: 'Pedidos da clínica', exact: true }).click();
  await expect(page.locator('article')).toContainText(f.patient.user.name); await page.getByRole('button', { name: 'Iniciar análise' }).click(); await expect(page.locator('article')).toContainText('Em análise');
  await capture('administracao');
  await page.getByRole('button', { name: 'Responder pedido' }).click(); await page.getByLabel('Resposta ao titular').fill('Pedido recebido. A administração está verificando as obrigações de retenção e orientará os próximos passos.');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Registrar resposta', exact: true }).click(); await expect(page.locator('article')).toContainText('Resposta registrada');
  await expect(page.getByRole('button', { name: 'Responder pedido' })).toHaveCount(0);
  await login(f.patient.user.email); await expect(page.locator('article')).toContainText('A administração está verificando'); await expect(page.locator('article')).toContainText(request.id);
  expect(await db.user.count({ where: { id: f.patient.userId } })).toBe(1);
  expect(await db.audit.count({ where: { entityId: request.id } })).toBe(3);
});
