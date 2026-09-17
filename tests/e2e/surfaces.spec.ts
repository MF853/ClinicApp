import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('superfícies compartilhadas: formulários, navegação e contraste', async ({ page }) => {
  test.setTimeout(90000);
  for (const [role, routes] of [
    ['paciente2', ['/justificativas', '/encaixes', '/disponibilidade']],
    ['admin2', ['/pacientes', '/configuracoes']],
  ] as const) {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(`${role}@example.test`);
    await page.getByLabel('Senha', { exact: true }).fill('ClinicApp!2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL('/');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('[aria-busy=true]')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.screenshot({ path: `test-results/${role}-${route.slice(1)}-${width}.png`, fullPage: true });
      }
    }
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page).toHaveURL('/entrar');
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `test-results/login-${width}.png`, fullPage: true });
  }
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar acesso' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
