import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import { createMinimalTemplateXlsx } from '../../src/features/import/minimalImportTemplate';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { createHash } from 'node:crypto';

test('current point accepts a four-column CPTU CSV without exposing routine mapping', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('cpt09-minimal.csv');
  const csv = [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '0.5,0.92,12.5,62',
    '1.0,0.98,13.8,67',
    '1.5,1.06,15.1,74',
  ].join('\n');
  writeFileSync(inputPath, csv, 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '最小导入项目', 'CPT-09');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);

  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect(page.getByTestId('minimal-import-contract')).toBeVisible();
  await expect(page.getByTestId('advanced-import-mapping')).toHaveCount(0);
  await expect(page.getByTestId('import-readiness-dock')).toContainText('CPTU（含 u2）');
  await expect(page.getByTestId('parsed-import-result')).toContainText('3 行');
  await expect.poll(() => readImportState(page)).toMatchObject({
    pointCount: 1,
    activePointName: 'CPT-09',
    draftCount: 1,
    normalizedRowCount: 3,
    rawRowCount: 3,
    sourceHeaders: ['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)'],
    channelState: 'present',
    waterConfirmed: false,
    finalDepthM: 1.5,
    attachmentFileName: 'cpt09-minimal.csv',
    attachmentSize: Buffer.byteLength(csv),
    attachmentHash: createHash('sha256').update(csv).digest('hex'),
  });
  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage2-minimal-import');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'minimal-cptu-import-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'minimal-cptu-import-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ state: await readImportState(page), layout, errors }, null, 2));
  }
  expect(errors).toEqual([]);
});

test('PROCESS140 professional import loads synthetic demo through the existing draft pipeline', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareCurrentPoint(page, '演示数据专业导入', 'DEMO-PRO-01');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-use-demo-data').click();
  await expect(page.getByTestId('parsed-import-result')).toContainText('121 行');
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect(page.getByTestId('import-upload-summary')).toContainText('SIGS-OGLab-系统生成演示数据.csv');
  await expect.poll(() => readImportState(page)).toMatchObject({
    pointCount: 1,
    activePointName: 'DEMO-PRO-01',
    draftCount: 1,
    normalizedRowCount: 121,
    rawRowCount: 121,
    channelState: 'present',
  });
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process140-public-quota-demo');
    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'professional-demo-import-1440x900.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'professional-import-check.json'), JSON.stringify({
      viewport: await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      documentOverflowX: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)),
      browserErrors,
      rows: 121,
    }, null, 2));
  }
});

test('no-u2 CSV follows the CPT approximate route without asking for water depth', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('cpt-no-u2.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa)', '0.5,0.92,12.5', '1.0,0.98,13.8'].join('\n'), 'utf8');
  await prepareCurrentPoint(page, '无孔压导入项目', 'CPT-NO-U2');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-readiness-dock')).toContainText('CPT 近似（无 u2）');
  await expect.poll(() => readImportState(page)).toMatchObject({ channelState: 'absent', waterConfirmed: false });
  await expect(page.getByTestId('water-guide-dialog')).toBeVisible();
  await expect(page.getByTestId('water-guide-depth')).toHaveCount(0);
  await page.getByTestId('water-guide-confirm').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect.poll(() => readImportState(page)).toMatchObject({ channelState: 'absent', waterConfirmed: true });
});

test('ambiguous units reveal the advanced dock and recover through explicit confirmation', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('ambiguous-units.csv');
  writeFileSync(inputPath, ['Depth,qc,fs', '0.5,0.92,12.5', '1.0,0.98,13.8'].join('\n'), 'utf8');
  await prepareCurrentPoint(page, '单位确认项目', 'CPT-UNIT');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('advanced-import-mapping')).toBeVisible();
  await confirmSourceUnit(page, 'Depth', 'm');
  await confirmSourceUnit(page, 'qc', 'MPa');
  await confirmSourceUnit(page, 'fs', 'kPa');
  await expect(page.getByTestId('minimal-import-contract')).toBeVisible();
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
});

test('minimal Excel template downloads, reopens, uploads, and retains worksheet evidence', async ({ page }, testInfo) => {
  await prepareCurrentPoint(page, 'Excel 最小导入项目', 'CPT-XLSX');
  await page.getByTestId('explorer-import').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('detail-download-example-xlsx').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('jts-cpt-minimal-example.xlsx');
  const downloadedPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadedPath);
  const sheets = await readXlsxFile(downloadedPath);
  expect(sheets[0].data[0]).toEqual(['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)']);

  const generatedPath = testInfo.outputPath('generated-minimal.xlsx');
  writeFileSync(generatedPath, Buffer.from(createMinimalTemplateXlsx('example')));
  await page.getByTestId('import-file-input').setInputFiles(generatedPath);
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect(page.getByTestId('excel-source-sheet')).toContainText('CPT数据 / 表头第 1 行');
  await expect.poll(() => readImportState(page)).toMatchObject({ normalizedRowCount: 3, rawRowCount: 3, channelState: 'present' });
});

test('replacing a source preserves the old draft and marks its checked downstream state stale', async ({ page }, testInfo) => {
  const firstPath = testInfo.outputPath('source-a.csv');
  const secondPath = testInfo.outputPath('source-b.csv');
  writeFileSync(firstPath, ['Depth(m),qc(MPa),fs(kPa)', '0.5,0.92,12.5', '1.0,0.98,13.8'].join('\n'), 'utf8');
  writeFileSync(secondPath, ['Depth(m),qc(MPa),fs(kPa)', '0.5,1.20,16.5', '1.0,1.28,17.2', '1.5,1.35,18.0'].join('\n'), 'utf8');
  await prepareCurrentPoint(page, '来源替换项目', 'CPT-REPLACE');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(firstPath);
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(secondPath);
  await expect(page.getByTestId('import-first-look')).toContainText('需要重新检查');
  await expect.poll(() => readImportState(page)).toMatchObject({ draftCount: 2, normalizedRowCount: 3, checkArtifact: 'stale', checkRunCount: 1 });
});

test('partial u2 stays a source problem and a corrected retry creates the first valid draft', async ({ page }, testInfo) => {
  const partialPath = testInfo.outputPath('partial-u2.csv');
  const correctedPath = testInfo.outputPath('corrected-u2.csv');
  writeFileSync(partialPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '0.5,0.92,12.5,62', '1.0,0.98,13.8,'].join('\n'), 'utf8');
  writeFileSync(correctedPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '0.5,0.92,12.5,62', '1.0,0.98,13.8,67'].join('\n'), 'utf8');
  await prepareCurrentPoint(page, 'partial u2 项目', 'CPT-PARTIAL');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(partialPath);
  await expect(page.getByTestId('import-source-problem-dock')).toContainText('U2 不是有效数字');
  await expect.poll(() => readImportState(page)).toMatchObject({ draftCount: 0 });
  await page.getByTestId('import-file-input').setInputFiles(correctedPath);
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect.poll(() => readImportState(page)).toMatchObject({ draftCount: 1, channelState: 'present', normalizedRowCount: 2 });
});

test('multi-sheet Excel selection cancels without mutation and imports only the chosen sheet', async ({ page }, testInfo) => {
  const workbookPath = testInfo.outputPath('two-cpt-sheets.xlsx');
  writeFileSync(workbookPath, Buffer.from(createTwoSheetMinimalWorkbook()));
  await prepareCurrentPoint(page, '多工作表项目', 'CPT-SHEET');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(workbookPath);
  await expect(page.getByTestId('excel-sheet-selection-dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消选择' }).click();
  await expect(page.getByTestId('excel-sheet-selection-dialog')).toHaveCount(0);
  await expect.poll(() => readImportState(page)).toMatchObject({ draftCount: 0 });

  await page.getByTestId('import-file-input').setInputFiles(workbookPath);
  await page.getByTestId('excel-sheet-choice-CPT复核').click();
  await expect(page.getByTestId('excel-source-sheet')).toContainText('CPT复核 / 表头第 1 行');
  await expect.poll(() => readImportState(page)).toMatchObject({ draftCount: 1, normalizedRowCount: 3 });
});

async function prepareCurrentPoint(page: import('@playwright/test').Page, projectName: string, pointName: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(pointName);
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
}

async function readImportState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { reason: loaded.reason };
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
    const batch = draft ? project.importBatches.find((candidate) => candidate.batchId === draft.batchId) : null;
    const raw = batch?.kind === 'draft' ? loaded.dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId) : null;
    const normalized = draft ? loaded.dataBlocks.find((block) => block.dataBlockId === draft.dataBlockId) : null;
    return {
      pointCount: project.points.length,
      activePointName: point.pointName,
      draftCount: point.importDrafts.length,
      normalizedRowCount: normalized?.kind === 'normalized' ? normalized.rows.length : -1,
      rawRowCount: raw?.kind === 'raw' ? raw.rows.length : -1,
      sourceHeaders: batch?.kind === 'draft' ? batch.sourceColumns.map((column) => column.header) : [],
      channelState: point.waterContext.channelState,
      waterConfirmed: Boolean(point.waterContext.confirmedAt),
      finalDepthM: point.finalDepthM,
      checkArtifact: point.checkState.artifact.status,
      checkRunCount: point.checkState.runs.length,
      attachmentFileName: raw?.kind === 'raw' ? raw.sourceAttachment?.fileName ?? null : null,
      attachmentSize: raw?.kind === 'raw' ? raw.sourceAttachment?.sizeBytes ?? -1 : -1,
      attachmentHash: raw?.kind === 'raw' ? raw.sourceAttachment?.sha256 ?? null : null,
    };
  });
}

async function confirmSourceUnit(page: import('@playwright/test').Page, header: string, unit: string) {
  await page.getByTestId('import-field-picker').getByRole('button', { name: header, exact: true }).click();
  await page.getByTestId('import-source-unit-select').selectOption(unit);
  await page.getByTestId('apply-import-unit').click();
}

function createTwoSheetMinimalWorkbook() {
  const files = unzipSync(createMinimalTemplateXlsx('example'));
  const workbook = strFromU8(files['xl/workbook.xml']).replace('</sheets>', '<sheet name="CPT复核" sheetId="2" r:id="rId3"/></sheets>');
  const relationships = strFromU8(files['xl/_rels/workbook.xml.rels']).replace('</Relationships>', '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>');
  const contentTypes = strFromU8(files['[Content_Types].xml']).replace('</Types>', '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  return zipSync({
    ...files,
    '[Content_Types].xml': strToU8(contentTypes),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(relationships),
    'xl/worksheets/sheet2.xml': files['xl/worksheets/sheet1.xml'],
  });
}
