import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures/isolatedTest';

const docsImageDirectory = path.resolve('..', 'SIGS-OGLab-Docs', 'docs', 'public', 'images', 'workflow');

function prepareOutputDirectory() {
  mkdirSync(docsImageDirectory, { recursive: true });
}

test('Process142 captures the quick plot input and generated atlas without private data', async ({ page }) => {
  test.setTimeout(90_000);
  prepareOutputDirectory();
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('手册演示');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-use-demo-data').click();
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.screenshot({ path: path.join(docsImageDirectory, 'quick-input-location.png'), fullPage: true });
  await page.getByTestId('quick-paste-grid').screenshot({ path: path.join(docsImageDirectory, 'quick-input-grid.png') });

  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.screenshot({ path: path.join(docsImageDirectory, 'quick-report-location.png'), fullPage: true });
  expect(browserErrors).toEqual([]);
});

test('Process142 captures professional import, check and stratification guide locations', async ({ page }) => {
  test.setTimeout(90_000);
  prepareOutputDirectory();
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('手册演示');
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('DEMO-CPTU-01');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-use-demo-data').click();
  await expect(page.getByTestId('parsed-import-result')).toContainText('121 行');
  await page.getByTestId('water-guide-dialog').screenshot({ path: path.join(docsImageDirectory, 'professional-water-guide.png') });
  await page.getByTestId('water-guide-dialog').getByRole('button', { name: '暂不确认', exact: true }).last().click();
  await page.screenshot({ path: path.join(docsImageDirectory, 'professional-import-location.png'), fullPage: true });

  await page.getByTestId('run-data-check').click();
  await expect(page.getByTestId('water-guide-dialog')).toBeVisible();
  await page.getByTestId('water-guide-confirm').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-first-look')).toContainText('可进入地层分层');
  await page.screenshot({ path: path.join(docsImageDirectory, 'professional-check-location.png'), fullPage: true });
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await page.screenshot({ path: path.join(docsImageDirectory, 'professional-stratification-location.png'), fullPage: true });
  await page.getByRole('button', { name: '选择地层生成方式' }).click();
  await expect(page.getByRole('heading', { name: '如何生成本次地层候选？' })).toBeVisible();
  await page.screenshot({ path: path.join(docsImageDirectory, 'professional-stratification-method.png'), fullPage: true });
  expect(browserErrors).toEqual([]);
});
