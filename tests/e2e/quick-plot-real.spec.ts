import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { expect, test } from './fixtures/isolatedTest';

const sourceWorkbook = path.join(process.cwd(), 'sample_data', 'source', 'yingkou', 'CPT09数据.xlsx');
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process120-report-migration');
const parameterBasisEvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process122-parameter-basis');
const process137EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process137-a3-600dpi-pdf');

test('PROCESS120 Yingkou workbook renders the accepted 15-page atlas with traceable classifications', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const timings: Record<string, number> = {};
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    mkdirSync(parameterBasisEvidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `mode-choice-${viewport.width}x${viewport.height}.png`) });
    }
  }
  await page.getByTestId('new-project-name').fill('营口快捷图册');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('quick-paste-grid').evaluate((element) => { const transfer = new DataTransfer(); transfer.setData('text/plain', '不是数据'); element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })); });
  await expect(page.getByRole('alert')).toContainText('没有读到数据');
  if (process.env.MILESTONE_EVIDENCE === '1') await page.screenshot({ path: path.join(evidenceDirectory, 'fatal-input-recovery-1440x900.png') });
  await page.getByTestId('quick-paste-grid').evaluate((element) => { const transfer = new DataTransfer(); transfer.setData('text/plain', '深度\tqc\tfs\n0.01\t0.3\t3.2\n0.03\t0.01\t0.4\n0.05\t0.01\t'); element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })); });
  await expect(page.getByText('3 行 · 粘贴的数据')).toBeVisible();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await page.getByRole('button', { name: '修改输入' }).click();
  await expect(page.getByTestId('quick-generate-report')).toHaveText('返回当前图册');
  await page.getByTestId('quick-clear-input').click();
  await expect(page.getByText('数据和已生成图册已清空，可以重新粘贴或导入。')).toBeVisible();
  await expect(page.getByTestId('quick-clear-input')).toBeDisabled();
  await expect(page.getByTestId('quick-report-workspace')).toHaveCount(0);
  if (process.env.MILESTONE_EVIDENCE === '1') await page.screenshot({ path: path.join(evidenceDirectory, 'cleared-input-1440x900.png') });
  const importStarted = Date.now();
  await page.getByTestId('quick-import-excel').click();
  await page.getByRole('main').locator('input[type="file"]').setInputFiles(sourceWorkbook);
  await expect(page.getByText('已显示前 120 行，共 4,282 行')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-pressure-basis-confirm').check();
  timings.importMs = Date.now() - importStarted;
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `quick-input-${viewport.width}x${viewport.height}.png`) });
    }
  }
  const firstGenerateStarted = Date.now();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 60_000 });
  timings.firstGenerateMs = Date.now() - firstGenerateStarted;
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);

  await page.getByRole('button', { name: '150%' }).click();
  await expect(page.getByTestId('quick-page-stage')).toHaveClass(/is-zoomed/);
  await expect(page.getByTestId('quick-page-stage').locator('img')).toHaveAttribute('style', /150%/);
  await page.getByRole('button', { name: '适合页面' }).click();

  await page.getByRole('button', { name: '修改输入' }).click();
  await expect(page.getByTestId('quick-generate-report')).toHaveText('返回当前图册');
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible();
  await page.getByRole('button', { name: '修改输入' }).click();
  await page.getByTestId('quick-point-name').fill('CPT09-修订');
  await expect(page.getByText('图册需要更新')).toBeVisible();
  await expect(page.getByTestId('quick-generate-report')).toHaveText(/重新生成图册/);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `stale-output-${viewport.width}x${viewport.height}.png`) });
    }
  }
  const regenerateStarted = Date.now();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: /CPT09-修订/ })).toBeVisible();
  timings.regenerateMs = Date.now() - regenerateStarted;
  const pageOne = page.getByTestId('quick-page-stage').locator('img');
  await expect(pageOne).toHaveAttribute('alt', /实测 CPT\/CPTU 曲线/);
  await page.getByTestId('quick-page-5').click();
  await expect(pageOne).toHaveAttribute('alt', /Fuzzy 最高概率分层与深度窗口组成/);
  await expect(pageOne).toHaveJSProperty('naturalWidth', 1080);
  await expect(pageOne).toHaveJSProperty('naturalHeight', 1528);
  await page.getByTestId('quick-page-6').click();
  await expect(pageOne).toHaveAttribute('alt', /CPT 解译参考地层/);
  await page.getByTestId('quick-page-7').click();
  await expect(pageOne).toHaveAttribute('alt', /归一化参数与 Ic 深度图/);
  await page.getByTestId('quick-page-8').click();
  await expect(pageOne).toHaveAttribute('alt', /Modified Robertson 2016/);
  await expect(pageOne).toHaveJSProperty('naturalWidth', 1920);
  await expect(pageOne).toHaveJSProperty('naturalHeight', 1080);
  await page.getByTestId('quick-page-9').click();
  await expect(pageOne).toHaveAttribute('alt', /多方法分类与刚度证据/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('quick-export-pdf').click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath('营口快捷图册.pdf');
  await download.saveAs(outputPath);
  const pdf = readFileSync(outputPath).toString('latin1');
  expect((pdf.match(/\/Type \/Page\b/g) ?? [])).toHaveLength(15);
  expect((pdf.match(/\/MediaBox \[0 0 841\.89 1190\.55\]/g) ?? [])).toHaveLength(3);
  expect((pdf.match(/\/MediaBox \[0 0 1190\.55 841\.89\]/g) ?? [])).toHaveLength(12);
  expect((pdf.match(/\/Width 7016 \/Height 9921/g) ?? [])).toHaveLength(3);
  expect((pdf.match(/\/Width 9921 \/Height 7016/g) ?? [])).toHaveLength(12);
  expect((pdf.match(/\/Filter \/FlateDecode/g) ?? [])).toHaveLength(15);
  expect(pdf).not.toContain('/DCTDecode');
  expect(readFileSync(outputPath).subarray(0, 8).toString('ascii')).toBe('%PDF-1.7');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    copyFileSync(outputPath, path.join(evidenceDirectory, 'generated-cpet-parity.pdf'));
    mkdirSync(process137EvidenceDirectory, { recursive: true });
    copyFileSync(outputPath, path.join(process137EvidenceDirectory, 'yingkou-a3-600dpi-atlas.pdf'));
  }

  const excelStarted = Date.now();
  const excelDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('quick-export-excel').click();
  const excelDownload = await excelDownloadPromise;
  const excelPath = testInfo.outputPath('营口快捷解译数据.xlsx');
  await excelDownload.saveAs(excelPath);
  const workbook = unzipSync(new Uint8Array(readFileSync(excelPath)));
  const workbookXml = strFromU8(workbook['xl/workbook.xml']);
  const rawSheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);
  const interpretationSheet = strFromU8(workbook['xl/worksheets/sheet2.xml']);
  expect(workbookXml).toContain('name="原始数据"');
  expect(workbookXml).toContain('name="快捷解译结果"');
  expect(workbookXml).toContain('name="设置与方法"');
  expect((rawSheet.match(/<row\b/g) ?? [])).toHaveLength(4283);
  expect((interpretationSheet.match(/<row\b/g) ?? [])).toHaveLength(4283);
  expect(interpretationSheet).toContain('Modified Robertson 2016');
  expect(interpretationSheet).toContain('Schneider 2008');
  if (process.env.MILESTONE_EVIDENCE === '1') copyFileSync(excelPath, path.join(evidenceDirectory, 'generated-interpretation.xlsx'));
  timings.excelExportMs = Date.now() - excelStarted;

  await page.reload();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);
  const formulaEvidence = JSON.parse((await page.getByTestId('quick-report-workspace').getAttribute('data-formula-evidence')) ?? '{}') as { formulaIds?: string[]; formulas?: string[] };
  expect(formulaEvidence.formulas).toContain('G0(MPa)=ρ(Mg/m³)Vs²/1000  [R06]');
  expect(formulaEvidence.formulas).toContain('ψ = 0.56-0.33log Qtn,cs；仅砂类土且 Ic<2.6  [R02]');
  expect(formulaEvidence.formulas).toContain('Schneider Q=qnet/σ′v0；U2=Δu2/σ′v0；五区边界按 Table 6  [R09]');

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    const layouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      for (const pageNumber of Array.from({ length: 15 }, (_, index) => index + 1)) {
        await page.getByTestId(`quick-page-${pageNumber}`).click();
        if (viewport.width === 1920) {
          const source = await page.getByTestId('quick-page-stage').locator('img').getAttribute('src');
          if (source?.startsWith('data:image/jpeg;base64,')) writeFileSync(path.join(evidenceDirectory, `report-page-${String(pageNumber).padStart(2, '0')}.jpg`), Buffer.from(source.slice(source.indexOf(',') + 1), 'base64'));
        }
        const screenshotPath = path.join(evidenceDirectory, `atlas-page-${String(pageNumber).padStart(2, '0')}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        if ([10, 11, 12, 15].includes(pageNumber)) copyFileSync(screenshotPath, path.join(parameterBasisEvidenceDirectory, `atlas-page-${String(pageNumber).padStart(2, '0')}-${viewport.width}x${viewport.height}.png`));
      }
      layouts.push(await page.evaluate(({ width, height }) => ({ width, height, bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, errors: [] as string[] }), viewport));
    }
    const classificationEvidence = JSON.parse((await page.getByTestId('quick-report-workspace').getAttribute('data-classification-evidence')) ?? '{}') as Record<string, number | string>;
    expect(classificationEvidence.parameterBasis).toBe('参数土类依据：JTS/T 242—2020 逐测点 Zone 分类。');
    expect(classificationEvidence.comparisonRole).toBe('参数按测点计算；Fuzzy、Modified Robertson 2016、Schneider 2008 仅作对照，不参与参数取值。');
    expect(classificationEvidence.jtsValid).toBeGreaterThan(0);
    expect(classificationEvidence.robertsonValid).toBeGreaterThan(0);
    expect(classificationEvidence.fuzzyValid).toBeGreaterThan(0);
    expect(classificationEvidence.jtsDistinctZones).toBeGreaterThan(1);
    expect(classificationEvidence.robertsonDistinctZones).toBeGreaterThan(1);
    expect(classificationEvidence.fuzzyDistinctClasses).toBeGreaterThan(1);
    expect(classificationEvidence.robertson2016Valid).toBeGreaterThan(0);
    expect(classificationEvidence.robertson2016DistinctClasses).toBeGreaterThan(1);
    expect(classificationEvidence.schneider2008Valid).toBeGreaterThan(0);
    expect(classificationEvidence.gapCount).toBeGreaterThanOrEqual(0);
    const pageManifest = await page.getByLabel('图册页面').locator('button').evaluateAll((buttons) => buttons.map((button) => ({ referencePage: Number(button.getAttribute('data-reference-page')), orientation: button.getAttribute('data-orientation'), chartTypes: button.getAttribute('data-chart-types')?.split(',') ?? [] })));
    expect(pageManifest.map((entry) => entry.referencePage)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,16]);
    expect(pageManifest[3].chartTypes).toEqual(['schneider-semiloq', 'schneider-2008-depth']);
    expect(pageManifest[7].chartTypes).toContain('robertson-2016-depth');
    expect(pageManifest[8].chartTypes).toEqual(['jts-layer-depth', 'robertson-2016-layer-depth', 'schneider-2008-layer-depth', 'g0-depth', 'k0-depth']);
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({ rows: 4282, pages: 15, clearInputVerified: true, referencePages: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,16], classificationPages: [4,5,6,8,9], classificationEvidence, formulaEvidence, pageManifest, canvas: { landscape: [1920, 1080], portrait: [1080, 1528] }, timings, layouts, pdfPageCount: 15, pdfMedia: { portrait: 3, landscape: 12 }, excelSheets: ['原始数据', '快捷解译结果', '设置与方法'], excelSheetCodepoints: ['原始数据', '快捷解译结果', '设置与方法'].map((name) => [...name].map((character) => character.codePointAt(0)?.toString(16))), excelRows: { raw: 4282, interpreted: 4282 }, browserErrors }, null, 2), 'utf8');
    writeFileSync(path.join(parameterBasisEvidenceDirectory, 'real-browser-check.json'), JSON.stringify({ rows: 4282, pages: 15, parameterPages: [10, 11, 12], methodPage: 15, classificationEvidence, formulaEvidence, layouts, pdfPageCount: 15, browserErrors }, null, 2), 'utf8');
    writeFileSync(path.join(evidenceDirectory, 'pdf-parity.json'), JSON.stringify({ reference: 'CPeT-IT data report.pdf', excludedReferencePages: [15], mapping: pageManifest.map((entry, index) => ({ outputPage: index + 1, ...entry })), geometry: { pageCount: 15, portraitPages: [1,5,15], landscapePages: [2,3,4,6,7,8,9,10,11,12,13,14] }, formulaEvidence, measuredEvidence: { schneiderZones: classificationEvidence.schneider2008DistinctClasses, robertson2016Zones: classificationEvidence.robertson2016DistinctClasses, fuzzyClasses: classificationEvidence.fuzzyDistinctClasses, plotBreakCount: classificationEvidence.gapCount, sourceRows: classificationEvidence.sourceRows, derivedRows: classificationEvidence.derivedRows } }, null, 2), 'utf8');
  }
  expect(browserErrors).toEqual([]);
});
