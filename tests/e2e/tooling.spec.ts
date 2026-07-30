import { expect, test } from './fixtures/isolatedTest';

test('Playwright browser tooling is available', async ({ page }) => {
  await page.setContent(`
    <main data-testid="tooling-smoke">
      <h1>Playwright ready</h1>
      <button type="button">工作台检查</button>
    </main>
  `);

  await expect(page.getByTestId('tooling-smoke')).toBeVisible();
  await expect(page.getByRole('button', { name: '工作台检查' })).toBeVisible();
});
