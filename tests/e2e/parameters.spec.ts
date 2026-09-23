import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { hash } from 'argon2';
Object.assign(process.env, parseEnv(readFileSync('.env', 'utf8')));
const { db } = await import('../../backend/dist/infrastructure/db.js');
const { fixture } = await import('../../backend/dist/tests/fixture.js');
test.afterAll(() => db.$disconnect());
test('administrador configura regras e paciente vê exigência atualizada', async ({ page }, info) => {
  const f = await fixture(), password = 'Teste-parametros!2026', encoded = await hash(password);
  for (const ctx of [f.admin, f.patient]) await db.user.update({ where: { id: ctx.userId }, data: { password: encoded } });
  const absence = await f.absence('PROVISIONAL', new Date(Date.now() + 86400000));
  await db.absence.update({ where: { id: absence.id }, data: { occurredAt: new Date(Date.now() - 86400000) } });
  async function login(email: string) {
    await page.context().clearCookies(); await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
  }
  await login(f.admin.user.email); await page.goto('/configuracoes');
  await page.getByLabel('Janela de avaliação em dias', { exact: true }).fill('90');
  await page.getByLabel('Reposições por falta', { exact: true }).fill('3');
  await page.getByLabel('Reposições por janela de avaliação', { exact: true }).fill('6');
  await page.getByLabel('Data do feriado').fill('2030-12-25'); await page.getByRole('button', { name: 'Adicionar feriado' }).click();
  await page.getByLabel('Data do feriado').fill('2030-12-25'); await expect(page.getByRole('button', { name: 'Adicionar feriado' })).toBeDisabled();
  await page.getByLabel('Data do feriado').fill('');
  await page.getByLabel('Outro', { exact: true }).check();
  await page.getByRole('button', { name: 'Salvar parâmetros' }).click(); await expect(page.getByText('Parâmetros atualizados.', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Janela de avaliação em dias', { exact: true })).toHaveValue('90'); await expect(page.getByLabel('Outro', { exact: true })).toBeChecked();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/parametros-${info.project.name}-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Remover feriado 2030-12-25' }).click();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
  await page.getByRole('button', { name: 'Salvar parâmetros' }).click(); await expect(page.getByText('Parâmetros atualizados.', { exact: true })).toBeVisible();
  const clinic = await db.clinic.findUniqueOrThrow({ where: { id: f.clinic.id } }); expect(clinic.holidays).toEqual([]); expect(clinic.requiredCategories).toEqual([]); expect(clinic.replacementPerWindow).toBe(6);
  await login(f.patient.user.email); await page.goto('/justificativas'); await page.getByRole('button', { name: 'Enviar justificativa', exact: true }).click();
  await expect(page.getByText(/Documento opcional em todas as categorias/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/parametros-documento-${info.project.name}.png`, fullPage: true });
  await page.locator('select[name=category]').selectOption('OUTRO'); await page.getByLabel('Descrição', { exact: true }).fill('Justificativa fictícia sem documento');
  await page.getByRole('button', { name: 'Enviar para análise' }).click(); await expect(page.getByText('Justificativa fictícia sem documento', { exact: true })).toBeVisible();
  expect(await db.certificate.count({ where: { absenceId: absence.id } })).toBe(1);
  await page.goto('/configuracoes'); await expect(page.getByText('Este perfil não pode alterar os parâmetros da clínica.')).toBeVisible();
});
