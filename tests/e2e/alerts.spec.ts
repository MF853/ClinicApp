import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('clínica publica aviso segmentado, paciente recebe e terapeuta não recebe', async ({ page }, info) => {
  const message = `Comunicado fictício ${info.project.name}-${Date.now()}`;
  async function login(email: string) {
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('ClinicApp!2026');
    const response = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    expect((await response).status()).toBe(201);
    await page.getByRole('link', { name: 'Avisos da clínica' }).click();
  }
  await page.goto('/entrar');
  await login('admin@example.test');
  await page.getByRole('button', { name: 'Publicar aviso', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Público' }).selectOption('PATIENT');
  await dialog.getByLabel('Mensagem', { exact: true }).fill(message);
  const end = new Date(Date.now() + 3600000);
  const local = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await dialog.getByLabel('Exibir até').fill(local);
  await page.setViewportSize({ width: 390, height: 1000 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/aviso-form-${info.project.name}-390.png` });
  await dialog.getByRole('button', { name: 'Confirmar publicação' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  const session = await (await page.request.get('/api/v1/session')).json();
  const expiring = `${message} — expiração`;
  const created = await page.request.post('/api/v1/alerts', { headers: { 'x-csrf-token': session.csrf, origin: 'http://localhost:5173' }, data: { audience: 'ALL', text: expiring, endsAt: new Date(Date.now() + 5000).toISOString() } });
  expect(created.ok()).toBe(true);
  await page.reload();
  await expect(page.getByText(expiring, { exact: true })).toBeVisible();
  await expect(page.getByText(expiring, { exact: true })).toHaveCount(0, { timeout: 10000 });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/entrar');
  await login('paciente@example.test');
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publicar aviso', exact: true })).toHaveCount(0);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/avisos-${info.project.name}-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/entrar');
  await login('terapeuta@example.test');
  await expect(page.getByRole('heading', { name: 'Avisos da clínica' })).toBeVisible();
  await expect(page.getByText(message, { exact: true })).toHaveCount(0);
});
