import { expect, test, type Page } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process088-check-profile-curves');
const viewports = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];

async function openImportedCheck(page: Page, inputPath: string, projectName: string, pointName: string, hasU2: boolean) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(pointName);
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  if (hasU2) await page.getByTestId('water-guide-present').click();
  await page.getByTestId('water-guide-confirm').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-profile-curves')).toHaveCount(0);
  await page.getByTestId('check-toggle-advanced').click();
}

async function inspectViewport(page: Page, viewport: { width: number; height: number }, name: string) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(350);
  const result = await page.evaluate(({ width, height }) => {
    const chart = document.querySelector<HTMLElement>('[data-testid="check-profile-curves"]');
    const actions = document.querySelector<HTMLElement>('[data-testid="check-guided-actions"]');
    const chartRect = chart?.getBoundingClientRect();
    const actionRect = actions?.getBoundingClientRect();
    const overflow = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      return element ? Math.max(0, element.scrollWidth - element.clientWidth) : null;
    };
    return {
      viewport: { width, height },
      bodyOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      documentOverflowX: overflow('[data-testid="active-document"]'),
      rightDockOverflowX: overflow('[data-testid="right-panel"]'),
      chartRect: chartRect ? { top: chartRect.top, bottom: chartRect.bottom, height: chartRect.height } : null,
      actionRect: actionRect ? { top: actionRect.top, bottom: actionRect.bottom, height: actionRect.height } : null,
      actionsVisibleWithoutScroll: Boolean(actionRect && actionRect.top >= 0 && actionRect.bottom <= height),
    };
  }, viewport);
  if (evidenceEnabled) {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
      fullPage: false,
    });
  }
  return result;
}

test('full CPTU profile keeps the current problem and its three decisions discoverable', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const rows = Array.from({ length: 601 }, (_, index) => {
    const depth = index / 10;
    const qc = index === 300 ? 0.01 : 4.4 + Math.sin(index / 18) * 1.7 + Math.cos(index / 7) * 0.25;
    const fs = index === 300 ? 5 : 58 + Math.sin(index / 14) * 20 + Math.cos(index / 9) * 6;
    const u2 = index === 300 ? -100 : 130 + Math.sin(index / 22) * 95 - Math.cos(index / 11) * 24;
    return `${depth.toFixed(2)},${qc.toFixed(3)},${fs.toFixed(2)},${u2.toFixed(2)}`;
  });
  const inputPath = testInfo.outputPath('process088-full-cptu.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...rows].join('\n'), 'utf8');

  await openImportedCheck(page, inputPath, '整孔曲线复核', 'CPTU-088', true);
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-has-u2', 'true');
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-total-row-count', '601');
  await expect(page.getByTestId('check-profile-track-qc')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-fs')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-u2')).toBeVisible();
  await expect(page.getByTestId('check-profile-issue-band')).toHaveAttribute('data-depth-from', '30.000');
  await expect(page.getByTestId('check-profile-issue-point-qc')).toHaveAttribute('data-marker-kind', 'problem');
  await expect(page.getByTestId('check-profile-issue-point-fs')).toHaveAttribute('data-marker-kind', 'reference');
  await expect(page.getByTestId('check-profile-issue-point-u2')).toHaveAttribute('data-marker-kind', 'problem');
  await expect(page.getByTestId('check-guided-actions').getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('check-ignore-current-row')).toHaveText('不使用此行并复检');
  await expect(page.getByTestId('check-open-manual-edit')).toHaveText('修改此行数值');
  await expect(page.getByTestId('check-guided-actions').getByRole('button', { name: '保留原值，暂不分类' })).toBeVisible();
  await expect(page.getByTestId('check-guided-actions')).toBeVisible();

  const layouts = [];
  for (const viewport of viewports) layouts.push(await inspectViewport(page, viewport, 'full-cptu-current-problem'));
  writeFileSync(testInfo.outputPath('viewport-layouts.json'), JSON.stringify(layouts, null, 2), 'utf8');
  await testInfo.attach('viewport-layouts', { body: JSON.stringify(layouts, null, 2), contentType: 'application/json' });
  expect(layouts.every((layout) => layout.bodyOverflowX === 0 && layout.documentOverflowX === 0 && layout.rightDockOverflowX === 0)).toBe(true);
  expect(layouts.every((layout) => layout.chartRect !== null && layout.actionRect !== null)).toBe(true);

  await page.getByTestId('check-open-manual-edit').click();
  await expect(page.getByTestId('manual-edit-reason-code')).toBeVisible();
  await expect(page.getByTestId('manual-edit-reason')).toBeVisible();
  await expect(page.getByTestId('manual-edit-confirm')).toBeDisabled();
  await page.getByRole('button', { name: '取消', exact: true }).click();

  await page.getByTestId('check-action-queue').getByRole('button', { name: /水深来源/ }).click();
  await expect(page.getByTestId('check-context-explanation')).toContainText('点位上下文');
  await expect(page.getByTestId('check-profile-issue-band')).toHaveCount(0);
  await expect(page.getByTestId('check-profile-curves')).toContainText('当前项不对应局部深度');
  await expect(page.getByTestId('check-primary-focus-problem')).toBeVisible();
  for (const viewport of viewports) await inspectViewport(page, viewport, 'full-cptu-switched-problem');
  expect(browserErrors).toEqual([]);

  if (evidenceEnabled) {
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(join(evidenceDirectory, 'full-cptu-browser-check.json'), JSON.stringify({ browserErrors, layouts }, null, 2), 'utf8');
  }
});

test('CPT profile without u2 shows only the two measured curves', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const inputPath = testInfo.outputPath('process088-no-u2.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa)',
    '0.00,1.00,10', '0.25,1.02,10.2', '0.50,1.04,10.4', '0.75,8.00,95',
    '1.00,1.06,10.6', '1.25,1.08,10.8', '1.50,1.10,11.0',
  ].join('\n'), 'utf8');

  await openImportedCheck(page, inputPath, '无孔压曲线复核', 'CPT-088', false);
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-has-u2', 'false');
  await expect(page.getByTestId('check-profile-track-qc')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-fs')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-u2')).toHaveCount(0);
  await expect(page.getByTestId('check-profile-no-u2')).toContainText('不绘制空曲线');
  await expect(page.getByTestId('check-action-queue')).toContainText('可选复核提示');
  await expect(page.getByTestId('check-action-queue')).toContainText('不影响进入地层分层');

  const layouts = [];
  for (const viewport of viewports) layouts.push(await inspectViewport(page, viewport, 'no-u2-current-problem'));
  writeFileSync(testInfo.outputPath('viewport-layouts.json'), JSON.stringify(layouts, null, 2), 'utf8');
  await testInfo.attach('viewport-layouts', { body: JSON.stringify(layouts, null, 2), contentType: 'application/json' });
  expect(layouts.every((layout) => layout.chartRect !== null && layout.actionRect !== null)).toBe(true);
  expect(browserErrors).toEqual([]);
  if (evidenceEnabled) {
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(join(evidenceDirectory, 'no-u2-browser-check.json'), JSON.stringify({ browserErrors, layouts }, null, 2), 'utf8');
  }
});
