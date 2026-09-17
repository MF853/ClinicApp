import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('calendário: horários alinhados, lacunas e atendimentos simultâneos', async ({ page }) => {
  const occurrence = (id: string, startsAt: string, name: string) => ({
    id, startsAt, endsAt: startsAt, therapist: 'Ana · fictícia', occupied: 1, reserved: 0, blocked: false,
    slot: { room: 'Sala 1', minAge: 18, maxAge: 90, capacity: 1 },
    appointments: [{ id: `a-${id}`, patientId: 'patient', patientName: name, status: 'SCHEDULED', opensAt: startsAt, closesAt: startsAt }],
  });
  await page.route('**/api/v1/agenda?*', route => route.fulfill({ json: [
    occurrence('mon', '2026-09-14T12:00:00Z', 'Lia · fictícia'),
    occurrence('tue', '2026-09-15T14:00:00Z', 'Rafael de Vasconcelos e Albuquerque · fictício'),
    occurrence('thu-a', '2026-09-17T12:00:00Z', 'Beatriz · fictícia'),
    occurrence('thu-b', '2026-09-17T12:00:00Z', 'Caio · fictício'),
    occurrence('late', '2026-09-15T02:30:00Z', 'Consulta noturna · fictícia'),
  ] }));
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('terapeuta2@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('ClinicApp!2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('Data de referência').fill('2026-09-16');
  for (const width of [1440, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('thead th:visible')).toHaveCount(8);
    await expect(page.locator('tbody th')).toHaveText(['09:00', '11:00', '23:30']);
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(1)).toHaveText('Sem horário');
    await expect(firstRow.locator('td').nth(3).locator('article')).toHaveCount(2);
    await expect(page.locator('tbody tr').last().locator('td').first()).toContainText('Consulta noturna');
    const boxes = await firstRow.locator('td').evaluateAll(cells => cells.map(cell => {
      const { y, height, width } = cell.getBoundingClientRect(); return { y, height, width };
    }));
    for (const box of boxes) {
      expect(Math.abs(box.y - boxes[0].y)).toBeLessThan(1);
      expect(Math.abs(box.height - boxes[0].height)).toBeLessThan(1);
      expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/calendar-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator('thead th:visible')).toHaveCount(2);
  await page.getByRole('button', { name: 'seg., 14' }).click();
  await expect(page.locator('td:visible article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ver consulta' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Lia');
  await page.keyboard.press('Escape');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/calendar-390.png', fullPage: true });
});
