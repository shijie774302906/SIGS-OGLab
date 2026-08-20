import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import { unzipSync } from 'fflate';
import { generateCurrentStratificationRevision } from './stratification-guide-helpers';

test('PROCESS125 professional PDF and Excel share one source, overwrite together, and retain authority when generation fails', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const inputPath = testInfo.outputPath('output-cptu.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '5.00,1.20,25,300', '5.50,1.24,26,305', '6.00,1.28,27,310'].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await prepareCurrentPoint(page);
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => readState(page)).toMatchObject({ draftCount: 1 });
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('right-panel-show').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-method-fuzzy-zhang-tumay-1999').click();
  await page.getByTestId('guided-use-jts').click();
  await page.getByTestId('guided-generation-confirm').click();
  await page.getByTestId('jts-exception-dialog').waitFor({ state: 'visible', timeout: 2_000 }).catch(() => undefined);
  if (await page.getByTestId('jts-exception-dialog').count()) await page.getByTestId('jts-create-pending-review-candidate').click();
  await generateCurrentStratificationRevision(page);
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-guide-close').click();
  await page.getByTestId('right-panel-show').click();
  await page.getByTestId('jts-package-nkt').selectOption('triaxial_cu');
  await page.getByTestId('jts-package-material-scope').selectOption('within_source');
  await page.getByTestId('jts-package-confirm-ocr').check();
  await page.getByTestId('jts-package-confirm-sensitivity').check();
  await page.getByTestId('run-jts-parameter-package').click();
  await page.getByTestId('parameter-confirm-scope').click();
  await page.getByTestId('parameter-scope-confirm-submit').click();
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('right-panel-tools-tab')).toHaveText('成果工具');
  const process156EvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process156-output-dock');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(process156EvidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(process156EvidenceDir, 'output-tools-open-1440x900.png'), fullPage: true });
  }
  await page.getByTestId('right-panel-hide').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await page.waitForTimeout(100);
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('right-panel-tools-tab')).toHaveText('成果工具');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(process156EvidenceDir, 'output-tools-reopened-1920x1080.png'), fullPage: true });
    const process156Check = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      return {
        route: document.querySelector('[data-testid="document-output"]') ? 'output' : 'unknown',
        rightPanelState: panel?.dataset.state ?? null,
        bodyOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        rightPanelOverflowX: panel ? Math.max(0, panel.scrollWidth - panel.clientWidth) : null,
      };
    });
    writeFileSync(path.join(process156EvidenceDir, 'browser-check.json'), JSON.stringify({ ...process156Check, errors }, null, 2));
  }
  await expect(page.getByTestId('generate-output')).toBeEnabled();

  const firstPair = await generatePairAndSave(page, testInfo, 'a3-atlas-pdf');
  await expect(page.getByTestId('output-current-summary')).toContainText('PDF 与 Excel 已生成');
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  const a3Path = firstPair.pdf;
  const a3 = readFileSync(a3Path);
  const a3Text = a3.toString('latin1');
  expect(a3.subarray(0, 8).toString()).toBe('%PDF-1.7');
  expect(a3Text).toContain('/MediaBox [0 0 1190.55 841.89]');
  expect(Number(a3Text.match(/\/Count (\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(2);
  expect(a3.length).toBeGreaterThan(50_000);
  const xlsxPath = firstPair.xlsx;
  const workbook = await readXlsxFile(xlsxPath);
  expect(workbook.map((sheet) => sheet.sheet)).toEqual(['元数据', '测量数据', '分类结果', '地层分层', '参数结果', '参数代表值', '公式与参考', '地层图', '消散试验']);
  expect(workbook.find((sheet) => sheet.sheet === '元数据')?.data).toContainEqual(['点位', 'CPTU-OUTPUT']);
  expect(workbook.find((sheet) => sheet.sheet === '元数据')?.data).toContainEqual(['报告来源方案', 'Zhang–Tumay Fuzzy（研究性对照） 方案 1']);
  expect(workbook.find((sheet) => sheet.sheet === '测量数据')?.data).toHaveLength(4);
  expect(workbook.find((sheet) => sheet.sheet === '分类结果')?.data).toHaveLength(4);
  expect(workbook.find((sheet) => sheet.sheet === '参数结果')?.data[0]).toEqual(['源行', '深度(m)', '层号', '层名', '工程土组', '方法ID', '参数', '单位', '状态', '结果', '原因/说明']);
  expect(workbook.find((sheet) => sheet.sheet === '参数结果')?.data.length).toBeGreaterThan(1);
  expect(workbook.find((sheet) => sheet.sheet === '参数代表值')?.data[0]).toEqual(['层号', '层ID', '层名', '顶深(m)', '底深(m)', '工程土组', '方法ID', '符号', '单位', '有效数', '最小值', '中位数', '最大值']);
  const formulaAndReferenceText = workbook.find((sheet) => sheet.sheet === '公式与参考')?.data.flat().join(' ') ?? '';
  expect(formulaAndReferenceText).toContain('JTS/T 242—2020《水运工程静力触探技术规程》');
  expect(formulaAndReferenceText).toMatch(/qt\(MPa\)|qnet\(MPa\)|Qt\(-\)/);
  expect(formulaAndReferenceText).not.toContain('水运工程地质勘察规范');
  expect(workbook.find((sheet) => sheet.sheet === '地层图')?.data).toContainEqual(['轨道', 'qc / fs / u2 / 地层柱']);
  const archive = unzipSync(new Uint8Array(readFileSync(xlsxPath)));
  expect(Object.keys(archive)).toEqual(expect.arrayContaining(['xl/media/stratigraphy.png', 'xl/drawings/drawing1.xml', 'xl/drawings/_rels/drawing1.xml.rels']));
  const workbookStyles = new TextDecoder().decode(archive['xl/styles.xml']);
  const measurementSheetXml = new TextDecoder().decode(archive['xl/worksheets/sheet2.xml']);
  expect(workbookStyles).toContain('Microsoft YaHei');
  expect(workbookStyles).toContain('<borders count="2">');
  expect(workbookStyles).toContain('horizontal="center"');
  expect(measurementSheetXml).toContain('<cols>');
  const png = Buffer.from(archive['xl/media/stratigraphy.png']);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1800);
  expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(1400);
  await expect.poll(() => readState(page)).toMatchObject({ outputCount: 2, currentOutputCount: 2, outputState: 'current' });
  const generatedState = await readState(page);
  expect(workbook.find((sheet) => sheet.sheet === '参数结果')?.data.length - 1).toBe(generatedState.latestExcelParameterRowCount);
  const noticeRendering = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const output = await import('/src/features/output/jtsOutputDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.reason);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const snapshot = structuredClone(point.outputWorkspace!.revisions.find((revision) => revision.kind === 'excel-workbook')!.snapshot);
    const originalPageCount = output.renderJtsOutputPreviewDataUrls(snapshot, 'a3-atlas-pdf').length;
    const longNotice = '参数强制忽略：φ′，深度 48.21 m，源行 source-row-3326；原失败原因：qnet 小于或等于零；未满足的建议条件：相邻有效点不足、当前层有效覆盖不足；确认时间：2026-07-23T20:30:00.000Z；仅影响本次参数试算。';
    snapshot.notices = [...snapshot.notices, ...Array.from({ length: 14 }, (_, index) => `${longNotice} 记录 ${index + 1}。`)];
    const calls: string[] = [];
    const prototype = CanvasRenderingContext2D.prototype;
    const originalFillText = prototype.fillText;
    prototype.fillText = function capture(value: string, x: number, y: number, maxWidth?: number) {
      calls.push(String(value));
      if (maxWidth === undefined) return originalFillText.call(this, value, x, y);
      return originalFillText.call(this, value, x, y, maxWidth);
    };
    try {
      const expandedPageCount = output.renderJtsOutputPreviewDataUrls(snapshot, 'a3-atlas-pdf').length;
      return { originalPageCount, expandedPageCount, renderedText: calls.join('') };
    } finally {
      prototype.fillText = originalFillText;
    }
  });
  expect(noticeRendering.expandedPageCount).toBeGreaterThan(noticeRendering.originalPageCount);
  expect(noticeRendering.renderedText).toContain('源行 source-row-3326；原失败原因：qnet 小于或等于零；未满足的建议条件：相邻有效点不足、当前层有效覆盖不足；确认时间：2026-07-23T20:30:00.000Z');

  const historicalWorkbookBytes = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const output = await import('/src/features/output/jtsOutputDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.reason);
    const point = loaded.manifest.state.projects[0].points.find((candidate) => candidate.pointId === loaded.manifest.state.projects[0].activePointId)!;
    const snapshot = structuredClone(point.outputWorkspace!.revisions.find((revision) => revision.kind === 'excel-workbook')!.snapshot);
    delete snapshot.parameterRows;
    const bytes = await output.createJtsOutputXlsx(snapshot);
    return Array.from(bytes);
  });
  const historicalParameterSheet = new TextDecoder().decode(unzipSync(Uint8Array.from(historicalWorkbookBytes))['xl/worksheets/sheet5.xml']);
  expect(historicalParameterSheet).toContain('历史成果未冻结逐深度参数明细');

  await page.getByTestId('output-kind').selectOption('a4-report-pdf');
  await page.evaluate(() => { const proto = HTMLCanvasElement.prototype as typeof HTMLCanvasElement.prototype & { __originalToDataURL?: typeof HTMLCanvasElement.prototype.toDataURL }; proto.__originalToDataURL = proto.toDataURL; proto.toDataURL = () => { throw new Error('simulated-canvas-failure'); }; });
  await page.getByTestId('generate-output').click();
  await expect(page.getByText(/成果生成失败/)).toBeVisible();
  await expect.poll(() => readState(page)).toMatchObject({ outputCount: 2, currentOutputCount: 2, outputState: 'current' });
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await page.evaluate(() => { const proto = HTMLCanvasElement.prototype as typeof HTMLCanvasElement.prototype & { __originalToDataURL?: typeof HTMLCanvasElement.prototype.toDataURL }; if (proto.__originalToDataURL) proto.toDataURL = proto.__originalToDataURL; });
  const secondPair = await generatePairAndSave(page, testInfo, 'a4-report-pdf');
  expect(readFileSync(secondPair.pdf).toString('latin1')).toContain('/MediaBox [0 0 595.28 841.89]');
  await expect.poll(() => readState(page)).toMatchObject({ outputCount: 2, currentOutputCount: 2, staleOutputCount: 0, outputState: 'current' });
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);

  const layout = await page.evaluate(() => ({ bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(), rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })() }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const dir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process125-professional-output'); mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'professional-a3-atlas.pdf'), a3);
    writeFileSync(path.join(dir, 'professional-output.xlsx'), readFileSync(xlsxPath));
    writeFileSync(path.join(dir, 'sample-stratigraphy.png'), archive['xl/media/stratigraphy.png']);
    const pagePreviews = await page.evaluate(async () => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const output = await import('/src/features/output/jtsOutputDomain.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) throw new Error(loaded.reason);
      const project = loaded.manifest.state.projects[0];
      const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
      const snapshot = point.outputWorkspace!.revisions.find((revision) => revision.kind === 'excel-workbook')!.snapshot;
      return output.renderJtsOutputPreviewDataUrls(snapshot, 'a3-atlas-pdf');
    });
    const representativeIndexes = [...new Set([0, 1, Math.min(2, pagePreviews.length - 1), Math.max(1, pagePreviews.length - 2), pagePreviews.length - 1])];
    representativeIndexes.forEach((pageIndex) => {
      const base64 = pagePreviews[pageIndex].slice(pagePreviews[pageIndex].indexOf(',') + 1);
      writeFileSync(path.join(dir, `pdf-page-${String(pageIndex + 1).padStart(2, '0')}.png`), Buffer.from(base64, 'base64'));
    });
    writeFileSync(path.join(dir, 'workbook-style-audit.json'), JSON.stringify({
      font: workbookStyles.includes('Microsoft YaHei'),
      blackBorders: workbookStyles.includes('<borders count="2">'),
      centeredHeaders: workbookStyles.includes('horizontal="center"'),
      explicitColumnWidths: measurementSheetXml.includes('<cols>'),
    }, null, 2));
    await expect(page.getByTestId('output-generation-tool')).toContainText('PDF + Excel');
    await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: path.join(dir, 'output-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 }); await page.screenshot({ path: path.join(dir, 'output-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(dir, 'flow-run.json'), JSON.stringify({ state: await readState(page), files: { a3: { bytes: a3.length }, xlsx: { sheets: workbook.map((sheet) => sheet.sheet) } }, layout, errors }, null, 2));
  }
  await page.reload();
  await expect(page.getByTestId('output-history')).toContainText('2 个');
  const replacementPath = testInfo.outputPath('output-cptu-replacement.csv');
  writeFileSync(replacementPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '5.00,1.30,27,315', '6.00,1.36,28,320'].join('\n'), 'utf8');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(replacementPath);
  await expect.poll(() => readState(page)).toMatchObject({ outputCount: 2, currentOutputCount: 0, staleOutputCount: 2, outputState: 'stale' });
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('output-generation-tool')).toContainText('当前成果需要重新生成');
  await expect(page.getByTestId('output-history')).toContainText('历史成果文件');
  await expect(page.getByTestId('output-history')).toContainText('历史 · 下载');
  await expect(page.getByTestId('output-history')).toContainText('需要更新 · 原生成于');
  expect(errors).toEqual([]);
});

async function generatePairAndSave(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, kind: 'a4-report-pdf' | 'a3-atlas-pdf') {
  await page.getByTestId('output-kind').selectOption(kind);
  const downloads: import('@playwright/test').Download[] = [];
  const onDownload = (download: import('@playwright/test').Download) => downloads.push(download);
  page.on('download', onDownload);
  await page.getByTestId('generate-output').click();
  await expect.poll(() => downloads.length, { timeout: 30_000 }).toBe(2);
  page.off('download', onDownload);
  const output: { pdf?: string; xlsx?: string } = {};
  for (const download of downloads) {
    const filePath = testInfo.outputPath(`${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(filePath);
    if (download.suggestedFilename().endsWith('.pdf')) output.pdf = filePath;
    if (download.suggestedFilename().endsWith('.xlsx')) output.xlsx = filePath;
  }
  expect(output.pdf).toBeTruthy();
  expect(output.xlsx).toBeTruthy();
  return output as { pdf: string; xlsx: string };
}

async function prepareCurrentPoint(page: import('@playwright/test').Page) {
  await page.getByTestId('new-project-name').fill('Stage 7 成果输出');
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('right-panel-show').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPTU-OUTPUT');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
}

async function readState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => { const database = await import('/src/features/workspace/workspaceDatabase.ts'); const loaded = await database.loadActiveWorkspaceV2(); if (!loaded.ok) return { reason: loaded.reason }; const project = loaded.manifest.state.projects[0]; const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!; const outputs = point.outputWorkspace?.revisions ?? []; const latestExcel = [...outputs].reverse().find((item) => item.kind === 'excel-workbook'); return { draftCount: point.importDrafts.length, outputCount: outputs.length, currentOutputCount: outputs.filter((item) => item.status === 'current').length, staleOutputCount: outputs.filter((item) => item.status === 'stale').length, outputState: point.outputState.status, latestExcelParameterRowCount: latestExcel?.snapshot.parameterRows?.length ?? null }; });
}
