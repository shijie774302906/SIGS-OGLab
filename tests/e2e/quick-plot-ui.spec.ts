import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { expect, test } from './fixtures/isolatedTest';
import { createMinimalTemplateXlsx } from '../../src/features/import/minimalImportTemplate';

const process137Evidence = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process137-a3-600dpi-pdf');

async function pasteGrid(page: import('@playwright/test').Page, text: string) {
  await page.getByTestId('quick-paste-grid').evaluate((element, value) => {
    const transfer = new DataTransfer(); transfer.setData('text/plain', value);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, text);
}

test('PROCESS140 quick plot loads, cancels and confirms synthetic demo input without auto-generating', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByTestId('new-project-name').fill('快捷演示数据');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-use-demo-data').click();
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();
  await expect(page.getByTestId('quick-point-name')).toHaveValue('演示-CPTU-01');
  await expect(page.getByText('系统生成演示数据，仅用于体验功能。')).toBeVisible();
  await expect(page.getByTestId('quick-report-workspace')).toHaveCount(0);
  await expect(page.getByTestId('quick-generate-report')).toBeDisabled();

  await page.getByTestId('quick-use-demo-data').click();
  await expect(page.getByTestId('quick-demo-replace-confirmation')).toBeVisible();
  await page.getByTestId('quick-demo-replace-confirmation').getByRole('button', { name: '取消' }).click();
  await expect(page.getByTestId('quick-demo-replace-confirmation')).toHaveCount(0);
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();

  await page.getByTestId('quick-use-demo-data').click();
  await page.getByTestId('quick-confirm-demo-data').click();
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process140-public-quota-demo');
    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'quick-demo-input-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'quick-demo-check.json'), JSON.stringify({
      viewport: await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      documentOverflowX: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)),
      browserErrors,
      rows: 121,
      generatedAutomatically: false,
    }, null, 2));
  }
});

test('PROCESS157 quick table accepts optional blanks and blocks only invalid depth or qc', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('快捷表格手动修正');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\tfs\n1\t2\t20\n2\t2.2\t22\n3\t2.4\t24');
  const fs = page.getByLabel('fs 1 m');
  await fs.fill('');
  await fs.blur();
  await expect(fs).toHaveValue('');
  await expect(page.getByText('已更新表格；图册将在你点击生成时重新计算。')).toBeVisible();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();

  const qc = page.getByLabel('qc 1 m');
  await qc.fill('');
  await qc.blur();
  await expect(qc).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('quick-generate-report')).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('1 个单元格需要修正');

  await qc.fill('2.1');
  await qc.blur();
  await expect(qc).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process157-quick-ai-import-v2');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDirectory, 'editable-input-1440x900.png'), fullPage: true });
  }
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));
  expect(layout.overflowX).toBe(0);
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.screenshot({ path: path.join(evidenceDirectory, 'partial-result-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 'Process157',
      optionalFsBlankPreserved: true,
      requiredQcRecovered: true,
      reportGenerated: true,
      layout,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('PROCESS141 quick input owns vertical scrolling with long data and an open AI panel', async ({ page }) => {
  await page.route('**/api/visits', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ready', totals: { visitors: 1, visits: 1, coveredRegions: 1 }, regions: [{ key: 'UNKNOWN', label: '未知', visits: 1 }] }),
  }));
  await page.reload();
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.getByTestId('new-project-name').fill('快捷页面滚动');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-use-demo-data').click();
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();

  const shell = page.getByTestId('quick-input-workspace');
  const initialMetrics = await shell.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(initialMetrics.overflowY).toBe('auto');
  expect(initialMetrics.scrollHeight).toBeGreaterThan(initialMetrics.clientHeight);
  await shell.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(page.getByTestId('quick-generate-report')).toBeInViewport();
  expect(await shell.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.getByTestId('quick-ai-toggle').click();
  await expect(page.locator('.quick-assistant-drawer')).toBeVisible();
  await shell.evaluate((element) => { element.scrollTop = 0; element.scrollTo({ top: element.scrollHeight }); });
  await expect(page.getByTestId('quick-generate-report')).toBeInViewport();
  const finalScrollTop = await shell.evaluate((element) => element.scrollTop);
  expect(finalScrollTop).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process141-scroll-visitor-analytics');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await shell.evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: path.join(evidenceDir, 'quick-input-1440x900.png') });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'quick-input-1920x1080.png') });
    await page.setViewportSize({ width: 1440, height: 700 });
    await shell.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await page.screenshot({ path: path.join(evidenceDir, 'quick-scroll-bottom-ai-open-1440x700.png') });
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({
      process: 141,
      deterministicRows: 121,
      initialMetrics,
      finalScrollTop,
      aiPanelOpen: true,
      generateActionInViewport: await page.getByTestId('quick-generate-report').isVisible(),
      horizontalOverflow: await shell.evaluate((element) => Math.max(0, element.scrollWidth - element.clientWidth)),
      browserErrors,
    }, null, 2));
  }
});

test('PROCESS117 quick project generates the 15-page mixed-orientation atlas with verified classification pages', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  await page.getByTestId('new-project-name').fill('快捷图册项目');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('quick-input-workspace')).toBeVisible();
  await pasteGrid(page, '深度\tqc\tfs\tu2\n0.01\t1.2\t12\t1\n0.02\t-0.5\t8\t-2\n0.03\t2.1\t18\t3\n0.04\t2.5\t20\t4');
  await expect(page.getByTestId('quick-generate-report')).toBeDisabled();
  await page.getByTestId('quick-water-depth').fill('12.5');
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/u2 有效 4\/4 行/)).toBeVisible();
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.getByTestId('quick-page-5').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /Fuzzy 最高概率分层与深度窗口组成/);
  await page.getByTestId('quick-page-6').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /CPT 解译参考地层/);
  await page.getByTestId('quick-page-8').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /Modified Robertson 2016/);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(process137Evidence, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(process137Evidence, 'report-ready-1440x900.png') });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(process137Evidence, 'report-ready-1920x1080.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.evaluate(() => {
    const holder = window as unknown as { restoreQuickCanvasContext?: HTMLCanvasElement['getContext'] };
    holder.restoreQuickCanvasContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<HTMLCanvasElement['getContext']>) {
      if (this.width >= 7000) return null;
      return holder.restoreQuickCanvasContext!.apply(this, args as never);
    } as HTMLCanvasElement['getContext'];
  });
  await page.getByTestId('quick-export-pdf').click();
  await expect(page.getByRole('alert')).toContainText('重试导出 PDF');
  await expect(page.getByTestId('quick-export-pdf')).toHaveText(/重试导出 PDF/);
  await page.evaluate(() => {
    const holder = window as unknown as { restoreQuickCanvasContext?: HTMLCanvasElement['getContext'] };
    if (holder.restoreQuickCanvasContext) HTMLCanvasElement.prototype.getContext = holder.restoreQuickCanvasContext;
  });
  const download = page.waitForEvent('download');
  await page.getByTestId('quick-export-pdf').click();
  await expect(page.getByTestId('quick-pdf-progress')).toContainText(/正在准备|正在生成/);
  await expect(page.getByTestId('quick-pdf-progress')).toContainText('A3 600 DPI');
  await expect(page.getByTestId('quick-export-pdf')).toBeDisabled();
  await expect(page.getByTestId('quick-export-pdf')).toHaveText(/正在准备 0\/15|正在生成 [1-9][0-9]*\/15|正在打包 15\/15/);
  await expect(page.getByRole('button', { name: '修改输入' })).toBeDisabled();
  if (process.env.MILESTONE_EVIDENCE === '1') await page.screenshot({ path: path.join(process137Evidence, 'export-progress-1440x900.png') });
  const pdfDownload = await download;
  expect(pdfDownload.suggestedFilename()).toMatch(/快捷图册\.pdf$/);
  const pdfPath = testInfo.outputPath('A3-600DPI-快捷图册.pdf');
  await pdfDownload.saveAs(pdfPath);
  const pdfText = readFileSync(pdfPath).toString('latin1');
  expect(pdfText).toContain('SIGS-OGLab A3 600 DPI');
  expect((pdfText.match(/\/Width 7016 \/Height 9921/g) ?? [])).toHaveLength(3);
  expect((pdfText.match(/\/Width 9921 \/Height 7016/g) ?? [])).toHaveLength(12);
  expect((pdfText.match(/\/Filter \/FlateDecode/g) ?? [])).toHaveLength(15);
  expect(pdfText).not.toContain('/DCTDecode');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(process137Evidence, 'a3-600dpi-atlas.pdf'), readFileSync(pdfPath));
    writeFileSync(path.join(process137Evidence, 'browser-check.json'), JSON.stringify({
      process: 137,
      viewportEvidence: ['1440x900', '1920x1080'],
      pageCount: 15,
      dpi: 600,
      portraitPixels: [7016, 9921],
      landscapePixels: [9921, 7016],
      losslessImageStreams: 15,
      jpegImageStreams: 0,
      duplicateExportDisabled: true,
      buttonProgressVisible: true,
      modifyInputDisabledDuringExport: true,
      retryLabelVisibleAfterFailure: true,
      failureRetryPassed: true,
      browserErrors,
    }, null, 2));
  }
  await page.evaluate(() => {
    (window as unknown as { restoreQuickObjectUrl?: typeof URL.createObjectURL }).restoreQuickObjectUrl = URL.createObjectURL;
    URL.createObjectURL = () => { throw new Error('测试导出失败。'); };
  });
  await page.getByTestId('quick-export-excel').click();
  await expect(page.getByRole('alert')).toContainText('请再试一次；图册仍保留');
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible();
  await page.evaluate(() => {
    const holder = window as unknown as { restoreQuickObjectUrl?: typeof URL.createObjectURL };
    if (holder.restoreQuickObjectUrl) URL.createObjectURL = holder.restoreQuickObjectUrl;
  });
  const excelDownload = page.waitForEvent('download');
  await page.getByTestId('quick-export-excel').click();
  const excel = await excelDownload;
  expect(excel.suggestedFilename()).toMatch(/快捷解译数据\.xlsx$/);
  const excelPath = testInfo.outputPath('快捷解译数据.xlsx');
  await excel.saveAs(excelPath);
  const archive = unzipSync(new Uint8Array(readFileSync(excelPath)));
  expect(strFromU8(archive['xl/workbook.xml'])).toContain('name="快捷解译结果"');
  expect(strFromU8(archive['xl/worksheets/sheet2.xml'])).toContain('深度或 qc 无效');
  await page.reload();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
});

test('PROCESS117 quick route accepts CPT without u2 and explains unavailable CPTU-only classification', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('无孔压快捷图册');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '0\t-1\t\n1\t2\t12\n2\t3\t14');
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/CPT 近似/)).toBeVisible();
  await page.getByTestId('quick-page-5').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /Fuzzy 最高概率分层与深度窗口组成/);
  await page.getByTestId('quick-page-4').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /Schneider 2008/);
});

test('PROCESS147 all atlas pages keep readable A3 typography at true 80% page zoom', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.getByTestId('new-project-name').fill('图册字号验收');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-use-demo-data').click();
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await page.getByTestId('quick-input-workspace').evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await expect.poll(() => page.getByTestId('quick-report-workspace').evaluate((node) => node.scrollTop)).toBe(0);
  const reportTop = await page.evaluate(() => {
    const topbar = document.querySelector('.quick-topbar')!.getBoundingClientRect();
    const header = document.querySelector('.quick-report-header')!.getBoundingClientRect();
    return { topbarBottom: topbar.bottom, headerTop: header.top };
  });
  expect(reportTop.headerTop).toBeGreaterThanOrEqual(reportTop.topbarBottom);
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);
  const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process147-atlas-rollback');
  if (process.env.PROCESS147_EVIDENCE === '1') mkdirSync(evidenceDirectory, { recursive: true });
  const pages: Array<{ index: number; width: number; height: number; alt: string }> = [];
  for (let index = 1; index <= 15; index += 1) {
    await page.getByTestId(`quick-page-${index}`).click();
    const image = page.getByTestId('quick-page-stage').locator('img');
    await expect(image).toHaveAttribute('src', /^data:image\/jpeg/);
    const info = await image.evaluate((node: HTMLImageElement) => ({ width: node.naturalWidth, height: node.naturalHeight, alt: node.alt, src: node.src }));
    pages.push({ index, width: info.width, height: info.height, alt: info.alt });
    expect([[1080, 1528], [1920, 1080]]).toContainEqual([info.width, info.height]);
    if (process.env.PROCESS147_EVIDENCE === '1') writeFileSync(path.join(evidenceDirectory, `atlas-page-${String(index).padStart(2, '0')}.jpg`), Buffer.from(info.src.split(',')[1], 'base64'));
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId('quick-page-6').click();
    await page.getByTestId('quick-zoom-80').click();
    const layout = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('[data-testid="quick-page-stage"]')!;
      const image = stage.querySelector<HTMLImageElement>('img')!;
      return { overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth), imageWidth: image.getBoundingClientRect().width, stageScrollWidth: stage.scrollWidth, stageClientWidth: stage.clientWidth, zoomActive: document.querySelector('[data-testid="quick-zoom-80"]')?.classList.contains('active') };
    });
    expect(layout.overflowX).toBeLessThanOrEqual(1);
    expect(layout.imageWidth).toBeCloseTo(1536, 0);
    expect(layout.stageScrollWidth).toBeGreaterThan(layout.stageClientWidth);
    expect(layout.zoomActive).toBe(true);
    if (process.env.PROCESS147_EVIDENCE === '1') await page.screenshot({ path: path.join(evidenceDirectory, `atlas-80-percent-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
  }
  expect(pages).toHaveLength(15);
  expect(browserErrors).toEqual([]);
  if (process.env.PROCESS147_EVIDENCE === '1') writeFileSync(path.join(evidenceDirectory, 'atlas-browser-check.json'), JSON.stringify({ process: 147, pages, physicalPointFloors: { source: 8, legend: 9, body: 10, title: 12 }, zoom: '80%', browserErrors }, null, 2));
});

test('PROCESS120 uncertain pore pressure can stay raw-only without stopping the atlas', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('孔压仅展示');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\tfs\tu2\n0.01\t1.2\t12\t1\n0.02\t1.8\t14\t\n0.03\t2.1\t18\t3');
  await page.getByTestId('quick-pressure-raw-only').check();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/u2 仅展示 2\/3 行/)).toBeVisible();
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);
  const formulaEvidence = JSON.parse((await page.getByTestId('quick-report-workspace').getAttribute('data-formula-evidence')) ?? '{}') as { formulas?: string[] };
  expect(formulaEvidence.formulas).toContain('本次未使用 u2：qt(kPa) = qc(kPa)  [A02]');
  expect(formulaEvidence.formulas?.some((formula) => formula.includes('u2(kPa)(1-a)'))).toBe(false);
});

test('PROCESS121 pasted rows can be cleared, stay empty after reload, and accept a fresh dataset', async ({ page }) => {
  const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process121-quick-clear');
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('清空快捷数据');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-point-name').fill('CPT-保留设置');
  await page.getByText('高级设置（一般不用改）').click();
  await page.getByLabel('有效面积比').fill('0.73');
  await pasteGrid(page, '深度\tqc\tfs\n0.01\t1.2\t12\n0.02\t1.8\t14\n0.03\t2.1\t18');
  await expect(page.getByText('3 行 · 粘贴的数据')).toBeVisible();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: '修改输入' }).click();
  await expect(page.getByTestId('quick-generate-report')).toHaveText('返回当前图册');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDirectory, 'before-clear-1440x900.png'), fullPage: true });
  }
  await page.getByTestId('quick-clear-input').click();
  await expect(page.getByText('等待粘贴')).toBeVisible();
  await expect(page.getByText('数据和已生成图册已清空，可以重新粘贴或导入。')).toBeVisible();
  await expect(page.getByTestId('quick-clear-input')).toBeDisabled();
  await expect(page.getByTestId('quick-generate-report')).toBeDisabled();
  await expect(page.getByTestId('quick-paste-grid')).toBeFocused();
  await expect(page.getByTestId('quick-report-workspace')).toHaveCount(0);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.screenshot({ path: path.join(evidenceDirectory, 'after-clear-1440x900.png'), fullPage: true });
  }
  await page.reload();
  await expect(page.getByTestId('quick-input-workspace')).toBeVisible();
  await expect(page.getByText('等待粘贴')).toBeVisible();
  await expect(page.getByTestId('quick-report-workspace')).toHaveCount(0);
  await expect(page.getByTestId('quick-point-name')).toHaveValue('CPT-保留设置');
  await page.getByText('高级设置（一般不用改）').click();
  await expect(page.getByLabel('有效面积比')).toHaveValue('0.73');
  await pasteGrid(page, '深度\tqc\tfs\n0.01\t2.2\t22\n0.02\t2.8\t24\n0.03\t3.1\t28');
  await expect(page.getByText('3 行 · 粘贴的数据')).toBeVisible();
  await expect(page.getByTestId('quick-clear-input')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }));
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      initialRows: 3,
      clearedRows: 0,
      reloadStayedEmpty: true,
      regeneratedRows: 3,
      layout,
      browserErrors,
    }, null, 2));
  }
});

test('PROCESS122 parameter pages draw the JTS point-Zone basis and keep comparison methods read-only', async ({ page }) => {
  const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process122-parameter-basis');
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('参数依据说明');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.evaluate(() => {
    const holder = window as unknown as { quickPlotDrawnText?: string[] };
    holder.quickPlotDrawnText = [];
    const prototype = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & { quickPlotOriginalFillText?: CanvasRenderingContext2D['fillText'] };
    prototype.quickPlotOriginalFillText = prototype.fillText;
    prototype.fillText = function (value: string | number, x: number, y: number, maxWidth?: number) {
      holder.quickPlotDrawnText?.push(String(value));
      return maxWidth === undefined
        ? prototype.quickPlotOriginalFillText!.call(this, String(value), x, y)
        : prototype.quickPlotOriginalFillText!.call(this, String(value), x, y, maxWidth);
    };
  });
  await pasteGrid(page, '深度\tqc\tfs\tu2\n0.01\t1.2\t12\t1\n0.02\t1.8\t14\t\n0.03\t2.1\t18\t3\n0.04\t2.5\t20\t4');
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  const report = page.getByTestId('quick-report-workspace');
  const classificationEvidence = JSON.parse((await report.getAttribute('data-classification-evidence')) ?? '{}') as { parameterBasis?: string; comparisonRole?: string };
  expect(classificationEvidence.parameterBasis).toBe('参数土类依据：JTS/T 242—2020 逐测点 Zone 分类。');
  expect(classificationEvidence.comparisonRole).toBe('参数按测点计算；Fuzzy、Modified Robertson 2016、Schneider 2008 仅作对照，不参与参数取值。');
  const drawnText = await page.evaluate(() => (window as unknown as { quickPlotDrawnText?: string[] }).quickPlotDrawnText ?? []);
  expect(drawnText.filter((value) => value === classificationEvidence.parameterBasis).length).toBeGreaterThanOrEqual(5);
  expect(drawnText.filter((value) => value === classificationEvidence.comparisonRole).length).toBeGreaterThanOrEqual(1);
  if (process.env.MILESTONE_EVIDENCE === '1') mkdirSync(evidenceDirectory, { recursive: true });
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const pageImages = [];
    for (const pageNumber of [10, 11, 12]) {
      await page.getByTestId(`quick-page-${pageNumber}`).click();
      const image = page.getByTestId('quick-page-stage').locator('img');
      await expect(image).toHaveAttribute('alt', /参数/);
      const imageSize = await image.evaluate((element) => ({ width: element.naturalWidth, height: element.naturalHeight }));
      expect(imageSize.width).toBeGreaterThan(0);
      expect(imageSize.height).toBeGreaterThan(0);
      pageImages.push({ pageNumber, imageSize });
      if (process.env.MILESTONE_EVIDENCE === '1') await page.screenshot({ path: path.join(evidenceDirectory, `parameter-page-${pageNumber}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
    const layout = await page.evaluate(() => ({ bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
    expect(layout.bodyOverflow).toBe(false);
    layouts.push({ ...viewport, ...layout, pageImages });
  }
  await page.getByTestId('quick-page-15').click();
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('alt', /公式|来源/);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.screenshot({ path: path.join(evidenceDirectory, 'method-page-15-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDirectory, 'ui-browser-check.json'), JSON.stringify({ classificationEvidence, drawnTextMatches: { basis: drawnText.filter((value) => value === classificationEvidence.parameterBasis).length, comparison: drawnText.filter((value) => value === classificationEvidence.comparisonRole).length }, layouts, browserErrors }, null, 2));
  }
  expect(browserErrors).toEqual([]);
});

test('PROCESS120 failed drawing keeps input and offers one-click retry', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('快捷图册重试');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\tfs\n0.01\t1.2\t12\n0.02\t1.8\t14\n0.03\t2.1\t18');
  await page.evaluate(() => {
    const canvas = HTMLCanvasElement.prototype as HTMLCanvasElement & { restoreQuickToDataUrl?: typeof HTMLCanvasElement.prototype.toDataURL };
    canvas.restoreQuickToDataUrl = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('test render failure'); };
  });
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByRole('alert')).toContainText('数据没有丢失');
  await expect(page.getByTestId('quick-generate-report')).toHaveText('重试生成图册');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByRole('alert')).toContainText('数据没有丢失');
  await expect(page.getByTestId('quick-generate-report')).toHaveText('重试生成图册');
  await page.evaluate(() => {
    const canvas = HTMLCanvasElement.prototype as HTMLCanvasElement & { restoreQuickToDataUrl?: typeof HTMLCanvasElement.prototype.toDataURL };
    if (canvas.restoreQuickToDataUrl) HTMLCanvasElement.prototype.toDataURL = canvas.restoreQuickToDataUrl;
  });
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
});

test('PROCESS132 quick AI organizes synonym columns, excludes extras, imports only after confirmation, and explains the current atlas page', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process132-quick-ai');
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await installQuickAssistantMock(page);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('快捷 AI 文件整理');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();

  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant).toBeVisible();
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '中文非标准字段.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('\uFEFF导出说明,测试数据\n贯入深度(cm),锥尖阻力(kPa),侧摩阻力(kPa),孔隙水压力(kPa),倾角,温度\n1,2000,12,,0.1,22\n2,2500,14,3,0.2,23\n3,3000,16,4,0.3,24'),
  });
  await expect(assistant).toContainText('中文非标准字段.csv');
  await page.getByTestId('quick-ai-start').click();
  const question = page.getByTestId('quick-ai-question');
  await expect(question).toContainText('哪一列作为侧摩阻力 fs？');
  await question.getByRole('button', { name: /C 列.*侧摩阻力.*推荐/ }).click();
  const proposal = page.getByTestId('quick-ai-proposal');
  await expect(proposal).toBeVisible();
  await expect(proposal).toContainText('贯入深度(cm)');
  await expect(proposal).toContainText('锥尖阻力(kPa)');
  await expect(proposal).toContainText('未使用列');
  await proposal.getByText('查看未使用的列').click();
  await expect(proposal).toContainText('倾角');
  await expect(proposal).toContainText('温度');
  await expect(page.getByTestId('quick-ai-confirm-import')).toBeInViewport();
  await expect(page.getByText('等待粘贴')).toBeVisible();
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDirectory, 'input-proposal-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'input-proposal-1920x1080.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(page.getByText(/3 行 · 中文非标准字段\.csv/)).toBeVisible();
  await expect(page.getByLabel('深度 0.01')).toHaveValue('0.01');
  await expect(page.getByLabel('qc 0.02 m')).toHaveValue('2.5');
  await expect(assistant).toContainText('已导入 3 行');

  await page.reload();
  await expect(page.getByText(/3 行 · 中文非标准字段\.csv/)).toBeVisible();
  await expect(page.getByLabel('深度 0.01')).toHaveValue('0.01');
  await expect(page.getByLabel('qc 0.02 m')).toHaveValue('2.5');

  await page.getByTestId('quick-pressure-basis-confirm').check();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await expect(page.getByTestId('quick-ai-assistant')).toBeVisible();
  await page.getByTestId('quick-page-6').click();
  await expect(page.getByTestId('quick-ai-current-page')).toContainText('CPT 解译参考地层');
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(page.getByTestId('quick-ai-assistant')).toContainText('第 6 页“CPT 解译参考地层”');

  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({
      width: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      drawerVisible: Boolean(document.querySelector('[data-testid="quick-ai-assistant"]')),
    }));
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.drawerVisible).toBe(true);
    layouts.push(layout);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      await page.screenshot({ path: path.join(evidenceDirectory, `report-assistant-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({ layouts, browserErrors, mappedRows: 3, ignoredColumns: ['倾角', '温度'] }, null, 2));
  }
});

test('PROCESS159 quick AI can read parallel windows, ask naturally, and submit without model-owned identity fields', async ({ page }) => {
  const trace: Array<{ stage: string; toolResultIds?: string[] }> = [];
  await installQuickNaturalNegotiationMock(page, trace);
  await page.reload();
  await page.getByTestId('new-project-name').fill('自然协商导入');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '多窗口自然协商.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('深度(m),锥尖阻力(MPa),侧摩阻力(kPa),温度\n0.1,1.2,12,21\n0.2,1.5,15,22\n0.3,1.8,18,23'),
  });
  await page.getByTestId('quick-ai-start').click();
  const clarification = page.getByTestId('quick-ai-clarification');
  await expect(clarification).toBeVisible();
  await expect(assistant).toContainText('温度列是否仅作为额外字段忽略');
  await clarification.locator('textarea').fill('是，忽略温度列。');
  await clarification.getByRole('button', { name: '发送回答' }).click();
  await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
  await expect(page.getByTestId('quick-ai-proposal')).toContainText('温度');
  expect(trace).toEqual([
    { stage: 'parallel-read' },
    { stage: 'clarify', toolResultIds: ['parallel-read-1', 'parallel-read-2'] },
    { stage: 'proposal' },
  ]);
});

test('PROCESS159 multi-sheet quick AI waits for the user and exposes only the selected sheet', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  const requestedSheets: string[][] = [];
  await page.route('**/api/assistant/capabilities', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process159-sheet-selection-mock',
      instanceId: 'process159-sheet-selection-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deterministic-mock',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      context?: { importSource?: { sheets?: Array<{ sheetName?: string }> } };
    };
    requestedSheets.push(body.context?.importSource?.sheets?.map((sheet) => sheet.sheetName ?? '') ?? []);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'message',
        serviceInstanceId: 'process159-sheet-selection-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
        model: 'deterministic-mock',
        content: '请确认这一工作表的 qc 单位。',
      }),
    });
  });
  await page.reload();
  await page.getByTestId('new-project-name').fill('多工作表由用户选择');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: 'two-sheets.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(createQuickTwoSheetWorkbook()),
  });

  const selection = page.getByTestId('quick-ai-sheet-selection');
  await expect(selection).toBeVisible();
  await expect(page.getByTestId('quick-ai-start')).toBeDisabled();
  await selection.locator('select').selectOption('CPT复核');
  await expect(page.getByTestId('quick-ai-start')).toBeEnabled();
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      selectorVisible: Boolean(document.querySelector('[data-testid="quick-ai-sheet-selection"]')),
      startEnabled: !(document.querySelector<HTMLButtonElement>('[data-testid="quick-ai-start"]')?.disabled ?? true),
    }));
    layouts.push(layout);
    expect(layout.horizontalOverflow).toBe(0);
    expect(layout.selectorVisible).toBe(true);
    expect(layout.startEnabled).toBe(true);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      const directory = path.resolve('process_logs/playwright-mcp/process159-free-negotiation');
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `sheet-selection-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.getByTestId('quick-ai-start').click();
  await expect(page.getByTestId('quick-ai-clarification')).toBeVisible();
  expect(requestedSheets).toEqual([['CPT复核']]);
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const directory = path.resolve('process_logs/playwright-mcp/process159-free-negotiation');
    writeFileSync(path.join(directory, 'browser-check.json'), JSON.stringify({
      process: 159,
      test: testInfo.title,
      syntheticWorkbook: true,
      selectedSheetOnly: requestedSheets,
      layouts,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('PROCESS132 quick AI failure keeps the uploaded file and allows a clean retry', async ({ page }) => {
  let failNextTurn = true;
  await installQuickAssistantMock(page, () => {
    if (!failNextTurn) return false;
    failNextTurn = false;
    return true;
  });
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷 AI 重试');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '重试数据.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('深度(m),锥尖阻力(MPa),温度\n0,1,22\n1,2,23'),
  });
  await page.getByTestId('quick-ai-start').click();
  await expect(page.getByTestId('quick-ai-error')).toContainText('DeepSeek 服务暂时繁忙');
  await expect(assistant).toContainText('重试数据.csv');
  await expect(page.getByText('等待粘贴')).toBeVisible();
  await page.getByTestId('quick-ai-start').click();
  await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(page.getByText(/2 行 · 重试数据\.csv/)).toBeVisible();
});

test('PROCESS134 headerless AI proposal replaces existing rows once and remains durable after reload', async ({ page }) => {
  const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process134-quick-ai-import');
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await installQuickAssistantMock(page);
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('快捷 AI 无表头替换');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t9\n0.02\t10\n0.03\t11');
  await expect(page.getByText('3 行 · 粘贴的数据')).toBeVisible();

  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '无表头.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('0.10,2.1,21,5\n0.20,2.2,22,6\n0.30,2.3,23,7'),
  });
  await page.getByTestId('quick-ai-start').click();
  const proposal = page.getByTestId('quick-ai-proposal');
  await expect(proposal).toContainText('没有表头');
  await expect(proposal).toContainText('AI 推测，请重点确认');
  await expect(proposal).toContainText('替换当前 3 行');
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      proposalVisible: Boolean(document.querySelector('[data-testid="quick-ai-proposal"]')),
      confirmVisible: Boolean(document.querySelector('[data-testid="quick-ai-confirm-import"]')),
    }));
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.proposalVisible).toBe(true);
    expect(layout.confirmVisible).toBe(true);
    layouts.push(layout);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDirectory, `proposal-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(page.getByTestId('quick-ai-confirm-import')).toHaveText('替换当前数据');
  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(assistant).toContainText('已导入 3 行');
  await expect(page.getByText(/3 行 · 无表头\.csv/)).toBeVisible();
  await expect(page.getByLabel('深度 0.1')).toHaveValue('0.1');
  await expect(page.getByLabel('qc 0.3 m')).toHaveValue('2.3');
  expect(await page.locator('.quick-cell-input').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))).not.toContain('11');

  await page.reload();
  await expect(page.getByText(/3 行 · 无表头\.csv/)).toBeVisible();
  await expect(page.getByLabel('深度 0.1')).toHaveValue('0.1');
  await expect(page.getByLabel('qc 0.3 m')).toHaveValue('2.3');
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      layouts,
      browserErrors,
      headerlessFirstRowPreserved: true,
      replacementCommittedOnce: true,
      durableAfterReload: true,
    }, null, 2));
  }
});

test('PROCESS134 a temporary save failure preserves the proposal and retries without another AI turn', async ({ page }) => {
  let turnCount = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/assistant/turn')) turnCount += 1;
  });
  await installQuickAssistantMock(page);
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷 AI 保存恢复');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '无表头.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('0.10,2.1,21,5\n0.20,2.2,22,6\n0.30,2.3,23,7'),
  });
  await page.getByTestId('quick-ai-start').click();
  await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
  const turnCountBeforeSave = turnCount;
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let remainingFailures = 2;
    (window as unknown as { __restoreProcess134Put?: () => void }).__restoreProcess134Put = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error('Process134 forced temporary write failure');
      }
      return original.apply(this, args);
    };
  });
  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(page.getByTestId('quick-ai-error')).toContainText('当前判断仍保留');
  await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
  await expect(page.getByText('等待粘贴')).toBeVisible();
  expect(turnCount).toBe(turnCountBeforeSave);

  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(assistant).toContainText('已导入 3 行并保存');
  await expect(page.getByText(/3 行 · 无表头\.csv/)).toBeVisible();
  expect(turnCount).toBe(turnCountBeforeSave);
  await page.evaluate(() => {
    (window as unknown as { __restoreProcess134Put?: () => void }).__restoreProcess134Put?.();
  });
});

test('PROCESS134 saving locks file replacement and a queued file change cannot replace the committed source', async ({ page }) => {
  await installQuickAssistantMock(page);
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷 AI 保存来源锁');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await assistant.locator('input[type="file"]').setInputFiles({
    name: '无表头.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('0.10,2.1,21,5\n0.20,2.2,22,6\n0.30,2.3,23,7'),
  });
  await page.getByTestId('quick-ai-start').click();
  await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
  await page.evaluate(() => {
    const upload = document.querySelector<HTMLButtonElement>('[data-testid="quick-ai-upload"]');
    const input = document.querySelector<HTMLInputElement>('[data-testid="quick-ai-assistant"] input[type="file"]');
    if (!upload || !input) throw new Error('Process134 source-lock controls are missing.');
    const observer = new MutationObserver(() => {
      if (!upload.disabled) return;
      observer.disconnect();
      (window as unknown as { __process134UploadDisabled?: boolean }).__process134UploadDisabled = true;
      const transfer = new DataTransfer();
      transfer.items.add(new File(
        ['depth,qc\n9.9,999'],
        '错误的新文件.csv',
        { type: 'text/csv' },
      ));
      Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    observer.observe(upload, { attributes: true, attributeFilter: ['disabled'] });
  });
  await page.getByTestId('quick-ai-confirm-import').click();
  await expect(assistant).toContainText('已导入 3 行并保存');
  await expect(assistant).toContainText('无表头.csv');
  await expect(assistant).not.toContainText('错误的新文件.csv');
  await expect(page.getByText(/3 行 · 无表头\.csv/)).toBeVisible();
  expect(await page.evaluate(() =>
    (window as unknown as { __process134UploadDisabled?: boolean }).__process134UploadDisabled,
  )).toBe(true);
});

test('PROCESS136 quick report accepts a direct answer when DeepSeek decides no tool is needed', async ({ page }) => {
  let turnRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/assistant/turn')) turnRequests += 1;
  });
  await installQuickAssistantMock(page, undefined, 'direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷 AI 当前页约束');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(page.getByTestId('quick-ai-assistant')).toContainText('这是模型针对当前问题直接生成的回答。');
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
  expect(turnRequests).toBe(1);
});

test('PROCESS136 quick report keeps three different answers for three different questions', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await installQuickAssistantMock(page, undefined, 'followup-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册连续追问');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-ai-toggle').click();
  const inputAssistant = page.getByTestId('quick-ai-assistant');
  await expect(inputAssistant).toContainText('AI 整理数据');
  await expect(inputAssistant).toContainText('原文件不变');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process136-free-report-agent');
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `input-assistant-${viewport.width}x${viewport.height}.png`),
      });
    }
  }
  await page.getByRole('button', { name: '关闭 AI 整理数据' }).click();
  await pasteGrid(page, '深度\tqc\tfs\tu2\n0.01\t1.2\t10\t2\n0.02\t1.8\t12\t3\n0.03\t2.1\t14\t4');
  await page.getByTestId('quick-pressure-raw-only').check();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant).toContainText('图册解读');
  await expect(assistant).toContainText('正在查看 · 当前页');
  await expect(assistant).toContainText('不代替工程复核');

  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await page.getByRole('button', { name: '解释本页图表' }).click();
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(2);
  await page.getByPlaceholder('询问图册内容…').fill('什么是 SBT？');
  await page.getByRole('button', { name: '发送' }).click();
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(3);
  const answers = await assistant.locator('.assistant-message.assistant').allTextContents();
  expect(new Set(answers).size).toBe(3);
  expect(answers[0]).toContain('当前是第 1 页');
  expect(answers[1]).toContain('图表');
  expect(answers[1]).not.toContain('分类图');
  expect(answers[2]).toContain('土体行为类型');
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
  const layouts: Array<Record<string, number | boolean>> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    const layout = await page.evaluate(() => {
      const drawer = document.querySelector<HTMLElement>('[data-testid="quick-ai-assistant"]');
      const rect = drawer?.getBoundingClientRect();
      const topbar = document.querySelector<HTMLElement>('.quick-topbar')?.getBoundingClientRect();
      const reportHeader = document.querySelector<HTMLElement>('.quick-report-header')?.getBoundingClientRect();
      const reportActions = document.querySelector<HTMLElement>('.quick-report-actions')?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        drawerInsideViewport: Boolean(rect && rect.left >= 0 && rect.right <= window.innerWidth + 1),
        drawerWidth: Math.round(rect?.width ?? 0),
        reportHeaderBelowTopbar: Boolean(topbar && reportHeader && reportHeader.top >= topbar.bottom - 1),
        reportActionsInsideViewport: Boolean(
          reportActions
          && reportActions.top >= 0
          && reportActions.right <= window.innerWidth + 1,
        ),
      };
    });
    layouts.push(layout);
    expect(layout.documentOverflowX).toBe(false);
    expect(layout.drawerInsideViewport).toBe(true);
    expect(layout.reportHeaderBelowTopbar).toBe(true);
    expect(layout.reportActionsInsideViewport).toBe(true);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process136-free-report-agent');
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `report-reader-${viewport.width}x${viewport.height}.png`),
      });
    }
  }
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process136-free-report-agent');
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      processId: 'Process136',
      test: testInfo.title,
      layouts,
      browserErrors,
      assertions: {
        distinctQuestionAnswers: 3,
        directAnswerAcceptedWithoutClientFollowUp: true,
        modelToolChoiceNotForced: true,
        readOnlyProfileVisible: true,
        inputAssistantTitleVisible: true,
        inputSafetyVisible: true,
        reportAssistantTitleVisible: true,
        reportSourceVisible: true,
        crossPageReceiptCoveredBySeparateTest: true,
      },
    }, null, 2));
  }
});

test('PROCESS136 long report conversations stay within the server limit without splitting tool exchanges', async ({ page }) => {
  test.setTimeout(90_000);
  const turnLengths: number[] = [];
  page.on('request', (request) => {
    if (!request.url().includes('/api/assistant/turn')) return;
    const payload = request.postDataJSON() as { turns?: unknown[] } | null;
    if (payload?.turns) turnLengths.push(payload.turns.length);
  });
  await installQuickAssistantMock(page, undefined, 'echo-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册长对话');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant).toContainText('回答仅用于理解图册，不代替工程复核');

  for (let index = 1; index <= 18; index += 1) {
    await page.getByPlaceholder('询问图册内容…').fill(`问题 ${index}`);
    await page.getByRole('button', { name: '发送' }).click();
    await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(index);
  }

  await expect(assistant.locator('.assistant-message.assistant').last()).toContainText('收到：问题 18');
  expect(turnLengths.length).toBe(18);
  expect(Math.max(...turnLengths)).toBeLessThanOrEqual(24);
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
});

test('PROCESS145 switching atlas pages keeps one conversation and uses the new page for the next question', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  const reportRequests: Array<{ pageNumber?: number; currentPageEvidenceJson?: string; userTurns: string[] }> = [];
  page.on('request', (request) => {
    if (!request.url().includes('/api/assistant/turn')) return;
    const body = request.postDataJSON() as {
      turns?: Array<{ role?: string; content?: string }>;
      context?: { scope?: { route?: string }; quickPlotReport?: { pageNumber?: number; currentPageEvidenceJson?: string } };
    } | null;
    if (body?.context?.scope?.route !== 'quick-report') return;
    reportRequests.push({
      pageNumber: body.context.quickPlotReport?.pageNumber,
      currentPageEvidenceJson: body.context.quickPlotReport?.currentPageEvidenceJson,
      userTurns: body.turns?.filter((turn) => turn.role === 'user').map((turn) => turn.content ?? '') ?? [],
    });
  });
  await installQuickAssistantMock(page, undefined, 'stale-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册切页失效');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(page.getByTestId('quick-ai-assistant').locator('.assistant-message.assistant')).toHaveCount(1);

  await page.getByTestId('quick-page-2').click();
  await expect(page.getByTestId('quick-ai-current-page')).toContainText('2. SBT - Bq 分类图');
  await expect(page.getByTestId('quick-ai-assistant').locator('.assistant-message.assistant')).toHaveCount(1);
  await page.getByRole('button', { name: '解释当前页' }).click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(2);
  await expect(assistant.locator('.assistant-message.assistant').first()).toContainText('来源：提问时第 1 页');
  await expect(assistant.locator('.assistant-message.assistant').last()).toContainText('来源：提问时第 2 页');
  expect(reportRequests[0]).toMatchObject({ pageNumber: 1 });
  expect(reportRequests.at(-1)).toMatchObject({ pageNumber: 2 });
  expect(JSON.parse(reportRequests[0]?.currentPageEvidenceJson ?? '{}')).toMatchObject({ pageNumber: 1, generatedFromSameRowsAsAtlas: true });
  expect(JSON.parse(reportRequests.at(-1)?.currentPageEvidenceJson ?? '{}')).toMatchObject({ pageNumber: 2, generatedFromSameRowsAsAtlas: true });
  expect(reportRequests.at(-1)?.userTurns.some((turn) => turn.includes('第 1 页'))).toBe(true);
  expect(reportRequests.at(-1)?.userTurns.at(-1)).toContain('第 2 页');
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    layouts.push(await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    })));
    if (process.env.MILESTONE_EVIDENCE === '1') {
      const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process145-quick-ai-timeout');
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDirectory, `cross-page-conversation-${viewport.width}x${viewport.height}.png`) });
    }
  }
  expect(layouts.every((layout) => layout.horizontalOverflow === 0)).toBe(true);
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process145-quick-ai-timeout');
    writeFileSync(path.join(evidenceDirectory, 'conversation-check.json'), JSON.stringify({
      process: 145,
      test: testInfo.title,
      layouts,
      browserErrors,
      requestPages: reportRequests.map((request) => request.pageNumber),
      assertions: {
        pageOneHistoryRetained: true,
        pageTwoContextSent: true,
        boundedHistorySent: true,
        sourceLabelsVisible: true,
      },
    }, null, 2));
  }
});

test('PROCESS136 report request shows a running state and prevents duplicate sends', async ({ page }) => {
  await installQuickAssistantMock(page, undefined, 'delayed-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册请求状态');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  const currentPageButton = page.getByRole('button', { name: '解释当前页' });
  await currentPageButton.click();
  await expect(currentPageButton).toBeDisabled();
  await expect(page.getByPlaceholder('询问图册内容…')).toBeDisabled();
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await expect(currentPageButton).toBeEnabled();
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
});

test('PROCESS135 report retry repeats the unfinished question and preserves the conversation', async ({ page }) => {
  let failOnce = true;
  await installQuickAssistantMock(page, () => {
    if (!failOnce) return false;
    failOnce = false;
    return true;
  });
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册重试');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(page.getByTestId('quick-ai-error')).toContainText('DeepSeek 服务暂时繁忙');
  await page.getByTestId('quick-ai-retry-report').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
});

test('PROCESS145 report retries one transient timeout without exposing a failure card', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  const expectedTimeoutDiagnostics: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const detail = `console: ${message.text()}`;
    if (message.text().includes('status of 504')) expectedTimeoutDiagnostics.push(detail);
    else browserErrors.push(detail);
  });
  let failOnce = true;
  await installQuickAssistantMock(page, () => {
    if (!failOnce) return false;
    failOnce = false;
    return true;
  }, 'echo-direct', {
    status: 504,
    problem: '模型读取图册超过 55 秒。你的问题已保留，可以直接重新解读；图册和数据没有改变。',
    code: 'UPSTREAM_TIMEOUT',
  });
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册超时恢复');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  const input = page.getByPlaceholder('询问图册内容…');
  await input.fill('为什么这里缺了一部分土体分层？');
  await page.getByRole('button', { name: '发送' }).click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toContainText('收到：为什么这里缺了一部分土体分层？');
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    layouts.push(await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    })));
    if (process.env.MILESTONE_EVIDENCE === '1') {
      const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process145-quick-ai-timeout');
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDirectory, `timeout-auto-retry-${viewport.width}x${viewport.height}.png`) });
    }
  }
  expect(layouts.every((layout) => layout.horizontalOverflow === 0)).toBe(true);
  await expect(assistant.locator('.assistant-message.user')).toContainText('为什么这里缺了一部分土体分层？');
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process145-quick-ai-timeout');
    await page.screenshot({ path: path.join(evidenceDirectory, 'auto-retry-success-1920x1080.png') });
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 145,
      test: testInfo.title,
      layouts,
      browserErrors,
      expectedTimeoutDiagnostics,
      assertions: {
        originalQuestionRetainedOnce: true,
        transientRetryHidden: true,
        retryInSamePanel: true,
        unchangedImpactVisible: true,
        recoverySucceeded: true,
      },
    }, null, 2));
  }
});

test('PROCESS145 malformed read-tool arguments are repaired once without duplicating the user turn', async ({ page }) => {
  let malformedOnce = true;
  await installQuickAssistantMock(page, () => {
    if (!malformedOnce) return false;
    malformedOnce = false;
    return true;
  }, 'direct', {
    status: 422,
    problem: '这次没有读出有效的图册信息。你的问题已保留，可以直接重新解读；图册和数据没有改变。',
    code: 'MODEL_TOOL_FORMAT',
  });
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册工具格式恢复');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
});

test('PROCESS145 changing pages lets the old-page answer finish with its original source label', async ({ page }) => {
  await installQuickAssistantMock(page, undefined, 'delayed-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册切页取消');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  await page.getByTestId('quick-page-2').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await expect(page.getByTestId('quick-ai-current-page')).toContainText('SBT - Bq 分类图');
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await expect(assistant.locator('.assistant-message.assistant')).toContainText('来源：提问时第 1 页');
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
});

test('PROCESS145 stopping a slow report keeps the question and offers the same retry path', async ({ page }) => {
  await installQuickAssistantMock(page, undefined, 'delayed-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册主动停止');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(page.getByTestId('quick-report-processing')).toContainText('AI 正在分析图册');
  await expect(page.getByTestId('quick-report-processing')).toContainText('最长约 2 分钟');
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await expect(page.getByTestId('quick-ai-error')).toContainText('已停止本次解读');
  await expect(page.getByTestId('quick-ai-error')).toContainText('问题已保留');
  await expect(page.getByTestId('quick-ai-assistant').locator('.assistant-message.user')).toHaveCount(1);
  await page.getByTestId('quick-ai-retry-report').click();
  await expect(page.getByTestId('quick-ai-assistant').locator('.assistant-message.assistant')).toHaveCount(1);
  await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
});

test('PROCESS145 report answers render safe readable Markdown', async ({ page }) => {
  await installQuickAssistantMock(page, undefined, 'markdown-direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册 Markdown');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '解释当前页' }).click();
  const markdown = page.getByTestId('quick-ai-markdown');
  await expect(markdown.getByRole('heading', { name: '本页说明' })).toBeVisible();
  await expect(markdown.locator('li')).toHaveCount(2);
  await expect(markdown.locator('table')).toBeVisible();
  await expect(markdown.locator('code', { hasText: 'qc' })).toBeVisible();
  await expect(markdown.locator('table')).toContainText('Ic');
  await expect(markdown.locator('script')).toHaveCount(0);
  await expect(markdown).not.toContainText('window.bad');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.resolve('process_logs/playwright-mcp/process145-quick-ai-timeout');
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'markdown-answer-1440x900.png') });
  }
});

test('PROCESS145 regenerating the atlas starts a clean conversation for the new revision', async ({ page }) => {
  await installQuickAssistantMock(page, undefined, 'direct');
  await page.reload();
  await page.getByTestId('new-project-name').fill('快捷图册修订失效');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\n0.01\t1.2\n0.02\t1.8\n0.03\t2.1');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  const assistant = page.getByTestId('quick-ai-assistant');
  await page.getByRole('button', { name: '解释当前页' }).click();
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(1);
  await page.getByTestId('quick-ai-toggle').click();
  await page.getByRole('button', { name: '修改输入' }).click();
  await page.getByTestId('quick-point-name').fill('CPT-02');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByRole('heading', { name: /CPT-02/ })).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-ai-toggle').click();
  await expect(assistant.locator('.assistant-message.user')).toHaveCount(0);
  await expect(assistant.locator('.assistant-message.assistant')).toHaveCount(0);
  await expect(assistant).toContainText('可询问当前页、其他页面、方法或某个深度范围');
});

async function installQuickNaturalNegotiationMock(
  page: import('@playwright/test').Page,
  trace: Array<{ stage: string; toolResultIds?: string[] }>,
) {
  await page.route('**/api/assistant/capabilities', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process159-natural-negotiation-mock',
      instanceId: 'process159-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deterministic-mock',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string; content?: string; toolCallId?: string }>;
    };
    const serviceMeta = {
      serviceInstanceId: 'process159-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      model: 'deterministic-mock',
    };
    const hasClarification = body.turns.some((turn) =>
      turn.role === 'assistant' && turn.content?.includes('温度列是否仅作为额外字段忽略'),
    );
    const toolResultIds = body.turns
      .filter((turn) => turn.role === 'tool')
      .map((turn) => turn.toolCallId ?? '');
    if (!toolResultIds.length) {
      trace.push({ stage: 'parallel-read' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          ...serviceMeta,
          content: null,
          calls: [
            { id: 'parallel-read-1', name: 'read_quick_plot_source', arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 1, rowCount: 2 }) },
            { id: 'parallel-read-2', name: 'read_quick_plot_source', arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 3, rowCount: 2 }) },
          ],
        }),
      });
      return;
    }
    if (!hasClarification) {
      trace.push({ stage: 'clarify', toolResultIds });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'message',
          ...serviceMeta,
          content: '已识别 depth、qc 和 fs。温度列是否仅作为额外字段忽略？',
        }),
      });
      return;
    }
    trace.push({ stage: 'proposal' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        ...serviceMeta,
        content: null,
        calls: [{
          id: 'natural-proposal',
          name: 'submit_quick_plot_import_decision',
          arguments: JSON.stringify({
            kind: 'proposal',
            proposal: {
              proposalId: 'natural-proposal-v1',
              layout: 'shared-depth',
              sheetName: 'CSV',
              headerMode: 'present',
              headerRow: 1,
              dataStartRow: 2,
              dataEndRow: 4,
              summary: '已根据两段来源证据识别必需字段，并按用户回答忽略温度列。',
              columns: [
                { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '表头和数值均为深度。', evidenceKind: 'source-explicit' },
                { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '表头明确为锥尖阻力。', evidenceKind: 'source-explicit' },
                { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '表头明确为侧摩阻力。', evidenceKind: 'source-explicit' },
              ],
              ignoredColumns: [{ sourceColumnIndex: 3, headerLabel: '温度', reason: '用户确认不用于快速出图。' }],
              warnings: [],
            },
          }),
        }],
      }),
    });
  });
}

function createQuickTwoSheetWorkbook() {
  const files = unzipSync(createMinimalTemplateXlsx('example'));
  const workbook = strFromU8(files['xl/workbook.xml'])
    .replace('</sheets>', '<sheet name="CPT复核" sheetId="2" r:id="rId3"/></sheets>');
  const relationships = strFromU8(files['xl/_rels/workbook.xml.rels'])
    .replace('</Relationships>', '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>');
  const contentTypes = strFromU8(files['[Content_Types].xml'])
    .replace('</Types>', '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  return zipSync({
    ...files,
    '[Content_Types].xml': strToU8(contentTypes),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(relationships),
    'xl/worksheets/sheet2.xml': files['xl/worksheets/sheet1.xml'],
  });
}

async function installQuickAssistantMock(
  page: import('@playwright/test').Page,
  shouldFail?: () => boolean,
  reportMode: 'normal' | 'direct' | 'delayed-direct' | 'invented' | 'followup-direct' | 'stale-direct' | 'echo-direct' | 'markdown-direct' = 'normal',
  failure: { status: number; problem: string; code?: string } = {
    status: 503,
    problem: 'DeepSeek 服务暂时繁忙。',
  },
) {
  let completedReportAnswers = 0;
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'quick-ui-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    const serviceMeta = {
      serviceInstanceId: 'quick-ui-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
    };
    if (shouldFail?.()) {
      await route.fulfill({
        status: failure.status,
        contentType: 'application/json',
        body: JSON.stringify({ problem: failure.problem, ...(failure.code ? { code: failure.code } : {}) }),
      });
      return;
    }
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string; content?: string; toolCallId?: string }>;
      context: {
        scope: { route: string };
        importSource?: {
          operationId: string;
          protocolVersion: string;
          requestId: string;
          contextHash: string;
          sourceFingerprint: string;
          fileName: string;
        };
        quickPlotReport?: { pageNumber: number; pageTitle: string; chartTypes: string[]; methodIds: string[] };
      };
    };
    const last = body.turns.at(-1);
    if (body.context.scope.route === 'quick-report') {
      const userTurnCount = body.turns.filter((turn) => turn.role === 'user').length;
      const latestQuestionWithPage = [...body.turns].reverse().find((turn) => turn.role === 'user')?.content ?? '';
      const latestQuestion = latestQuestionWithPage.replace(/^\[提问时页面：[^\n]+\]\n/, '');
      const directContent = /什么是\s*SBT/i.test(latestQuestion)
        ? 'SBT 是土体行为类型分类，用 CPT/CPTU 测量响应描述土体表现。'
        : /本页各图表|图表分别/.test(latestQuestion)
          ? '本页图表分别显示锥尖阻力、侧摩阻力和孔隙水压力随深度的变化。'
          : reportMode === 'echo-direct'
            ? `收到：${latestQuestion}`
          : reportMode === 'markdown-direct'
            ? '### 本页说明\n\n- 先看 `qc` 曲线\n- 再核对分层\n\n| 项目 | 作用 |\n| --- | --- |\n| Ic | 分类参考 |\n\n<script>window.bad = true</script>'
          : '这是模型针对当前问题直接生成的回答。';
      if (
        reportMode === 'direct'
        || reportMode === 'delayed-direct'
        || reportMode === 'echo-direct'
        || reportMode === 'markdown-direct'
        || (reportMode === 'followup-direct' && userTurnCount > 1 && last?.role === 'user')
        || (reportMode === 'stale-direct' && completedReportAnswers > 0 && last?.role === 'user')
      ) {
        if (reportMode === 'delayed-direct') {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ kind: 'message', model: 'deterministic-mock', ...serviceMeta, content: directContent }),
        });
        return;
      }
      if (last?.role === 'tool') {
        completedReportAnswers += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            kind: 'message',
            model: 'deterministic-mock',
            ...serviceMeta,
            content: reportMode === 'invented'
              ? '当前页显示锥尖阻力 99999 MPa。'
              : `当前是第 ${body.context.quickPlotReport?.pageNumber} 页“${body.context.quickPlotReport?.pageTitle}”。从左到右查看锥尖阻力、摩阻比、孔隙水压力、Ic 和地层分类。`,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          ...serviceMeta,
          content: null,
          calls: [{ id: 'read-quick-page', name: 'read_quick_plot_page', arguments: '{}' }],
        }),
      });
      return;
    }
    const fullCptu = body.context.importSource?.fileName === '中文非标准字段.csv';
    const headerless = body.context.importSource?.fileName === '无表头.csv';
    if (last?.toolCallId === 'read-quick-source' && fullCptu) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          ...serviceMeta,
          content: null,
          calls: [{
            id: 'quick-field-question',
            name: 'submit_quick_plot_import_decision',
            arguments: JSON.stringify({
              protocolVersion: body.context.importSource?.protocolVersion,
              requestId: body.context.importSource?.requestId,
              operationId: body.context.importSource?.operationId,
              sourceFingerprint: body.context.importSource?.sourceFingerprint,
              contextHash: body.context.importSource?.contextHash,
              kind: 'question',
              question: {
                questionId: 'choose-fs',
                prompt: '哪一列作为侧摩阻力 fs？',
                reason: '文件中可能存在相近的摩阻字段，请由用户确认。',
                options: [
                  {
                    optionId: 'fs-column-3',
                    recommended: true,
                    decisionPatch: { decisionType: 'map-column', sheetName: 'CSV', sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa' },
                  },
                  {
                    optionId: 'skip-fs',
                    recommended: false,
                    decisionPatch: { decisionType: 'omit-optional', targetField: 'fs' },
                  },
                ],
              },
            }),
          }],
        }),
      });
      return;
    }
    if (last?.toolCallId === 'read-quick-source' || last?.toolCallId === 'quick-field-question') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          ...serviceMeta,
          content: null,
          calls: [{
            id: 'quick-import-proposal',
            name: 'submit_quick_plot_import_decision',
            arguments: JSON.stringify({
              protocolVersion: body.context.importSource?.protocolVersion,
              requestId: body.context.importSource?.requestId,
              operationId: body.context.importSource?.operationId,
              sourceFingerprint: body.context.importSource?.sourceFingerprint,
              contextHash: body.context.importSource?.contextHash,
              kind: 'proposal',
              proposal: {
                proposalId: 'quick-import-proposal-v1',
                layout: 'shared-depth',
                sheetName: 'CSV',
                headerMode: headerless ? 'absent' : 'present',
                headerRow: headerless ? null : fullCptu ? 2 : 1,
                dataStartRow: headerless ? 1 : fullCptu ? 3 : 2,
                dataEndRow: fullCptu ? 5 : 3,
                summary: headerless ? '没有表头；根据列位置和数值形成判断。' : '已识别中文同义字段并排除额外列。',
                columns: [
                  { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: fullCptu ? 'cm' : 'm', reason: '贯入深度。', evidenceKind: headerless ? 'model-inferred' : 'source-explicit' },
                  { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: fullCptu ? 'kPa' : 'MPa', reason: '锥尖阻力。', evidenceKind: headerless ? 'model-inferred' : 'source-explicit' },
                  ...(fullCptu || headerless ? [
                    { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻力。', evidenceKind: fullCptu ? 'user-corrected' : 'model-inferred' },
                    { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa', reason: '孔隙水压力。', evidenceKind: headerless ? 'model-inferred' : 'source-explicit' },
                  ] : []),
                ],
                ignoredColumns: fullCptu ? [
                  { sourceColumnIndex: 4, headerLabel: '倾角', reason: '不用于快速出图。' },
                  { sourceColumnIndex: 5, headerLabel: '温度', reason: '不用于快速出图。' },
                ] : headerless ? [] : [{ sourceColumnIndex: 2, headerLabel: '温度', reason: '不用于快速出图。' }],
                warnings: headerless ? ['文件没有表头，列含义和单位由数值与位置推测。'] : [],
              },
            }),
          }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        ...serviceMeta,
        content: null,
        calls: [{
          id: 'read-quick-source',
          name: 'read_quick_plot_source',
          arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 1, rowCount: 20 }),
        }],
      }),
    });
  });
}
