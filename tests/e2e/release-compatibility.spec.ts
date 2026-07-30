import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures/isolatedTest';

const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process138-release-readiness');

test('public-readiness browser smoke keeps the first-run workflow operable and contained', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });

  await expect(page.getByRole('heading', { name: '项目', exact: true })).toBeVisible();
  await expect(page.getByTestId('new-project-name')).toBeVisible();
  await page.getByTestId('new-project-name').fill(`兼容性检查-${testInfo.project.name}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await expect(page.getByTestId('preparation-guide')).toContainText('确认探头');
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');
  await page.getByTestId('right-panel-hide').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await page.getByTestId('right-panel-show').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');

  const viewports = ['chromium', 'edge'].includes(testInfo.project.name)
    ? [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]
    : [{ width: 1440, height: 900 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId('workbench-root')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.body, `${testInfo.project.name} body overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(2);
    expect(overflow.document, `${testInfo.project.name} document overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(2);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `${testInfo.project.name}-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
      });
    }
  }

  expect(browserErrors).toEqual([]);
});
