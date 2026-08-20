import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import { generateCurrentStratificationRevision } from './stratification-guide-helpers';

test('PROCESS107 parameter problems explain why, open the exact recovery and reuse final-layer colors', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('parameter-issue-cohesive.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '5.00,1.20,25,300',
    '5.50,1.24,26,305',
    '6.00,1.28,27,310',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  const process110EvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process110-parameter-output-handoff');
  const problemLayouts: Array<Record<string, boolean | number>> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '参数问题诊断', 'CPT-PARAM-ISSUE');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await page.getByTestId('apply-jts-classification').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-gamma-sat')).toBeVisible();
  const guideBeforeRollback = await readGuideState(page);
  await page.getByTestId('parameter-guide-back').click();
  await expect(page.getByTestId('parameter-rollback-confirmation')).toContainText('清除从该步骤起已保存的设置');
  if (process.env.PROCESS147_EVIDENCE === '1') {
    const process147EvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process147-atlas-rollback');
    mkdirSync(process147EvidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(process147EvidenceDir, `parameter-rollback-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  await page.getByTestId('parameter-rollback-cancel').click();
  await expect(page.getByTestId('parameter-guide-config-gamma-sat')).toBeVisible();
  expect(await readGuideState(page)).toEqual(guideBeforeRollback);
  await page.getByTestId('parameter-guide-back').click();
  await page.getByTestId('parameter-rollback-confirm').click();
  await expect(page.getByTestId('parameter-guide-selection')).toBeVisible();
  await expect.poll(async () => (await readGuideState(page))?.stage).toBe('select');
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-gamma-sat')).toBeVisible();
  await page.getByRole('button', { name: '退出向导，打开独立高级设置' }).click();
  await expect(page.getByTestId('parameter-guide-dialog')).toBeHidden();
  await page.getByTestId('run-jts-parameter-package').click();
  await expect(page.getByTestId('jts-parameter-selector-jts_su_nkt')).toContainText('待处理 · 点击处理');
  await expect(page.getByTestId('parameter-first-look')).toContainText('确认当前参数范围');
  await expect(page.getByTestId('parameter-guided-status')).toHaveText('试算已生成 · 待确认范围');
  await expect(page.getByTestId('parameter-guided-status')).toHaveClass(/status-warning/);
  await expect(page.getByTestId('parameter-confirm-scope')).toHaveText('确认当前参数并进入成果输出');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stripOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-first-look"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
      decisionPrimaryCount: document.querySelectorAll('[data-testid="parameter-first-look"] .toolbar-button.primary').length,
      headerPrimaryCount: document.querySelectorAll('.parameter-g2-header .toolbar-button.primary').length,
      actionInViewport: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-confirm-scope"]'); if (!node) return false; const box = node.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth; })(),
    }));
    expect(layout).toEqual({ width: viewport.width, bodyOverflow: false, stripOverflow: false, decisionPrimaryCount: 1, headerPrimaryCount: 0, actionInViewport: true });
    problemLayouts.push(layout);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      mkdirSync(process110EvidenceDir, { recursive: true });
      await page.screenshot({ path: path.join(process110EvidenceDir, `parameter-problems-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  const authorityBefore = await readParameterIssueAuthority(page);
  await page.getByTestId('parameter-confirm-scope').click();
  await expect(page.getByTestId('parameter-scope-confirm-dialog')).toBeVisible();
  await expect(page.getByTestId('parameter-scope-confirm-dialog')).toContainText('本次纳入');
  await expect(page.getByTestId('parameter-scope-confirm-dialog')).toContainText('本阶段不纳入');
  await page.getByRole('button', { name: '暂不确认' }).click();
  await expect(page.getByTestId('parameter-scope-confirm-dialog')).toBeHidden();
  expect(await readParameterIssueAuthority(page)).toEqual(authorityBefore);

  await page.getByTestId('jts-parameter-selector-jts_su_nkt').click();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeVisible();
  await expect(page.getByTestId('parameter-issue-dialog')).toContainText('Nkt');
  await expect(page.getByTestId('parameter-issue-dialog')).toContainText('影响数据');
  await expect(page.getByTestId('parameter-issue-dialog')).toContainText('参数向导');
  await expect(page.getByTestId('parameter-issue-primary')).toHaveText('去参数向导补充 Su');
  await expect(page.getByTestId('parameter-issue-skip')).toBeDisabled();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeHidden();
  expect(await readParameterIssueAuthority(page)).toEqual(authorityBefore);

  await page.getByTestId('jts-parameter-selector-jts_su_nkt').click();
  await page.getByTestId('parameter-issue-primary').click();
  await expect(page.getByTestId('parameter-guide-config-su')).toBeVisible();
  await page.getByTestId('parameter-guide-close').click();
  await page.getByTestId('jts-parameter-selector-jts_su_nkt').click();
  await page.getByTestId('parameter-issue-skip-reason').selectOption('provided-by-other-test');
  await page.getByTestId('parameter-issue-skip').click();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeHidden();
  await expect(page.getByTestId('jts-parameter-selector-jts_su_nkt')).toContainText('明确不计算');
  await expect.poll(() => readParameterIssueAuthority(page)).toMatchObject({ packageRunCount: authorityBefore.packageRunCount + 1, rawRowCount: authorityBefore.rawRowCount });

  await page.setViewportSize({ width: 1920, height: 1080 });
  const visual = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('[data-testid="jts-parameter-package-evidence"]')!;
    const curve = document.querySelector<HTMLElement>('[data-testid="jts-parameter-curve"]')!;
    const table = document.querySelector<HTMLElement>('[data-testid="jts-package-representatives"]')!;
    const band = document.querySelector<SVGGElement>('.parameter-layer-band')!;
    const row = document.querySelector<HTMLTableRowElement>('[data-testid="jts-package-representatives"] tbody tr')!;
    return {
      panelWidth: panel.getBoundingClientRect().width,
      curveWidth: curve.getBoundingClientRect().width,
      tableWidth: table.getBoundingClientRect().width,
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      bandLayer: { id: band?.dataset.layerId, name: band?.dataset.layerName, from: band?.dataset.depthFrom, to: band?.dataset.depthTo, group: band?.dataset.soilGroup, className: band?.getAttribute('class') },
      rowLayer: { id: row?.dataset.layerId, name: row?.dataset.layerName, from: row?.dataset.depthFrom, to: row?.dataset.depthTo, group: row?.dataset.soilGroup, className: row?.className },
    };
  });
  expect(visual.panelWidth).toBeLessThanOrEqual(1201);
  expect(visual.curveWidth).toBeLessThanOrEqual(745);
  expect(visual.tableWidth).toBeLessThanOrEqual(425);
  expect(visual.bodyOverflow).toBe(false);
  expect(visual.bandLayer).toMatchObject({ id: visual.rowLayer.id, name: visual.rowLayer.name, from: visual.rowLayer.from, to: visual.rowLayer.to, group: visual.rowLayer.group });
  expect(visual.bandLayer.className).toContain('soil-clay');
  expect(visual.rowLayer.className).toContain('parameter-soil-clay');
  const finalLayers = await readFinalLayers(page);
  expect(visual.bandLayer).toMatchObject({ id: finalLayers[0].layerId, name: finalLayers[0].name, from: String(finalLayers[0].depthFromM), to: String(finalLayers[0].depthToM), group: finalLayers[0].engineeringSoilGroup });

  if (process.env.PROCESS107_EVIDENCE === '1' || process.env.PROCESS125_EVIDENCE === '1') {
    const evidenceDir = path.join(
      process.cwd(),
      'process_logs',
      'playwright-mcp',
      process.env.PROCESS125_EVIDENCE === '1' ? 'process125-professional-output' : 'process107-parameter-diagnosis',
    );
    mkdirSync(evidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByTestId('jts-parameter-selector-jts_ocr').click();
      await page.getByTestId('jts-parameter-package-evidence').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, `parameter-issue-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
      await page.getByRole('button', { name: '取消', exact: true }).click();
      await page.screenshot({ path: path.join(evidenceDir, `parameter-result-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({ authorityBefore, authorityAfter: await readParameterIssueAuthority(page), visual, finalLayers, errors }, null, 2));
  }
  if (process.env.MILESTONE_EVIDENCE === '1') writeFileSync(path.join(process110EvidenceDir, 'problem-browser-check.json'), JSON.stringify({ problemLayouts, errors }, null, 2));
  const authorityBeforeRestart = await readParameterIssueAuthority(page);
  await page.getByTestId('parameter-restart-guide').click();
  await expect(page.getByTestId('restart-confirmation-dialog')).toContainText('将清空未完成的参数选择');
  await expect(page.getByTestId('restart-confirmation-dialog')).toContainText('已完成试算和历史结果会保留');
  if (process.env.PROCESS133_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process133-professional-recovery');
    mkdirSync(evidenceDir, { recursive: true });
    const layouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.getByTestId('restart-confirmation-dialog').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          viewport: { width: innerWidth, height: innerHeight },
          insideViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
          documentHorizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        };
      });
      expect(layout.insideViewport).toBe(true);
      expect(layout.documentHorizontalOverflowPx).toBeLessThanOrEqual(1);
      layouts.push(layout);
      await page.screenshot({ path: path.join(evidenceDir, `parameter-restart-confirmation-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
    }
    writeFileSync(path.join(evidenceDir, 'parameter-restart-browser-check.json'), JSON.stringify({ process: 133, layouts, errors }, null, 2), 'utf8');
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('restart-confirmation-dialog').getByRole('button', { name: '取消' }).click();
  expect(await readParameterIssueAuthority(page)).toEqual(authorityBeforeRestart);
  await page.getByTestId('parameter-restart-guide').click();
  await page.getByTestId('restart-confirmation-submit').click();
  await expect(page.getByTestId('parameter-guide-dialog')).toBeVisible();
  expect((await readParameterIssueAuthority(page)).packageRunCount).toBe(authorityBeforeRestart.packageRunCount);
  expect(errors).toEqual([]);
});

test('PROCESS111 engineer confirms the completed parameter scope once and enters output with an auditable exclusion', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('parameter-scope-confirmation.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '5.00,1.20,25,300',
    '5.50,1.24,26,305',
    '6.00,1.28,27,310',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '参数范围确认', 'CPT-SCOPE-CONFIRM');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await page.getByTestId('apply-jts-classification').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByRole('button', { name: '退出向导，打开独立高级设置' }).click();
  await page.getByTestId('run-jts-parameter-package').click();

  const before = await readParameterScopeAuthority(page);
  expect(before.eligible).toBe(false);
  expect(before.completedMethodCount).toBeGreaterThan(0);
  expect(before.unresolvedMethodIds.length).toBeGreaterThan(0);
  await page.getByTestId('parameter-confirm-scope').click();
  await expect(page.getByTestId('parameter-scope-included')).toContainText(`${before.completedMethodCount} 项`);
  await expect(page.getByTestId('parameter-scope-excluded')).toContainText(`${before.unresolvedMethodIds.length} 项`);
  await expect(page.getByTestId('parameter-scope-confirm-dialog')).toContainText('不修改原始测量、分类依据或已确认地层');
  const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process111-parameter-scope-confirmation');
  const dialogLayouts: Array<Record<string, boolean | number>> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[data-testid="parameter-scope-confirm-dialog"]');
      const submit = document.querySelector<HTMLElement>('[data-testid="parameter-scope-confirm-submit"]');
      const dialogBox = dialog?.getBoundingClientRect();
      const submitBox = submit?.getBoundingClientRect();
      return {
        width: innerWidth,
        bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        dialogOverflow: dialog ? dialog.scrollWidth > dialog.clientWidth : true,
        dialogInViewport: Boolean(dialogBox && dialogBox.top >= 0 && dialogBox.bottom <= innerHeight && dialogBox.left >= 0 && dialogBox.right <= innerWidth),
        submitInViewport: Boolean(submitBox && submitBox.top >= 0 && submitBox.bottom <= innerHeight && submitBox.left >= 0 && submitBox.right <= innerWidth),
        primaryCount: dialog?.querySelectorAll('.toolbar-button.primary').length ?? 0,
      };
    });
    expect(layout).toEqual({ width: viewport.width, bodyOverflow: false, dialogOverflow: false, dialogInViewport: true, submitInViewport: true, primaryCount: 1 });
    dialogLayouts.push(layout);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      mkdirSync(evidenceDir, { recursive: true });
      await page.screenshot({ path: path.join(evidenceDir, `parameter-scope-dialog-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  await page.getByTestId('parameter-scope-confirm-submit').dblclick();
  await expect(page.getByTestId('document-output')).toBeVisible();
  await expect(page.getByTestId('generate-output')).toBeEnabled();
  await expect(page.getByTestId('output-readiness-status')).toHaveText('可生成部分成果');
  await expect(page.getByTestId('output-generation-status')).toHaveText('部分成果条件已满足');
  await expect(page.getByTestId('output-item-parameter-result')).toContainText('范围已确认');
  await expect(page.getByTestId('output-item-parameter-result')).toContainText(`${before.completedMethodCount} 项完成参数`);
  await expect(page.getByTestId('output-item-parameter-result')).toContainText(`${before.unresolvedMethodIds.length} 项本阶段不纳入`);
  const after = await readParameterScopeAuthority(page);
  expect(after.runCount).toBe(before.runCount + 1);
  expect(after.eligible).toBe(true);
  expect(after.rawRowCount).toBe(before.rawRowCount);
  expect(after.skippedMethodIds).toEqual(expect.arrayContaining(before.unresolvedMethodIds));
  expect(after.skippedReasons).toEqual(expect.arrayContaining(before.unresolvedMethodIds.map(() => 'not-needed-this-stage')));
  expect(after.scopeConfirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(after.scopeExcludedMethodIds).toEqual(expect.arrayContaining(before.unresolvedMethodIds));
  expect(after.projectName).toBe('参数范围确认');
  expect(after.pointName).toBe('CPT-SCOPE-CONFIRM');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDir, `output-ready-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }

  await page.reload();
  await expect(page.getByTestId('document-output')).toBeVisible();
  await expect(page.getByTestId('generate-output')).toBeEnabled();
  await expect(page.getByTestId('output-readiness-status')).toHaveText('可生成部分成果');
  await expect(page.getByTestId('output-item-parameter-result')).toContainText('本阶段不纳入');
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('parameter-guided-status')).toHaveText('本次参数范围已确认');
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('可生成带排除声明的部分成果');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByTestId('parameter-open-output').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, `parameter-confirmed-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({ before, after, dialogLayouts, errors }, null, 2));
  }
  expect(errors).toEqual([]);
});

test('PROCESS107 ignores one local calculation point in place and keeps the remaining curve and final stratification', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('parameter-local-point.csv');
  const localRows = Array.from({ length: 101 }, (_, index) => {
    const depthM = (5 + index * 0.01).toFixed(2);
    return index === 50
      ? `${depthM},0.06,0.8,0`
      : `${depthM},${(1.2 + index * 0.0008).toFixed(4)},${(25 + index * 0.01).toFixed(2)},${(300 + index * 0.1).toFixed(1)}`;
  });
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...localRows].join('\n'), 'utf8');

  await prepareCurrentPoint(page, '参数局部忽略', 'CPT-PARAM-LOCAL');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-ignore-and-create-candidate').or(page.getByTestId('jts-create-pending-review-candidate')).or(page.getByTestId('apply-jts-classification'))).toBeVisible();
  if (await page.getByTestId('jts-ignore-and-create-candidate').count()) await page.getByTestId('jts-ignore-and-create-candidate').click();
  else if (await page.getByTestId('jts-create-pending-review-candidate').count()) await page.getByTestId('jts-create-pending-review-candidate').click();
  else await page.getByTestId('apply-jts-classification').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByRole('button', { name: '退出向导，打开独立高级设置' }).click();
  await page.getByTestId('run-jts-parameter-package').click();
  await expect.poll(() => readFinalLayers(page)).not.toEqual([]);
  const layersBefore = await readFinalLayers(page);

  const selector = page.getByTestId('jts-parameter-selector-jts_compression_modulus');
  await expect(selector).toContainText('存在问题');
  const authorityBefore = await readParameterIssueAuthority(page);
  await selector.click();
  await expect(page.getByTestId('parameter-point-ignore-safety')).toContainText('可在参数阶段就地处理');
  await expect(page.getByTestId('parameter-issue-primary')).toHaveText('仅本次忽略此点并重新试算');
  const localEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process107-parameter-diagnosis');
  if (process.env.PROCESS107_EVIDENCE === '1') {
    mkdirSync(localEvidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(localEvidenceDir, `parameter-local-ignore-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
  }
  await page.getByTestId('parameter-issue-primary').click();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeHidden();
  await expect(selector).toContainText(/\d+ 个值/);
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('局部忽略 1');
  await selector.click();
  await expect(page.getByTestId('parameter-curve-track-jts-jts_compression_modulus').locator('polyline')).toHaveCount(2);
  await page.getByText('方法状态与审计依据').click();
  await expect(page.getByTestId('parameter-ignored-point-audit')).toContainText('5.50 m');
  await expect.poll(() => readParameterIssueAuthority(page)).toMatchObject({ packageRunCount: authorityBefore.packageRunCount + 1, rawRowCount: authorityBefore.rawRowCount });
  expect(await readFinalLayers(page)).toEqual(layersBefore);
  await page.reload();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('局部忽略 1');
  await page.getByTestId('jts-parameter-selector-jts_compression_modulus').click();
  await page.getByText('方法状态与审计依据').click();
  await expect(page.getByTestId('parameter-ignored-point-audit')).toContainText('5.50 m');
  expect(await readFinalLayers(page)).toEqual(layersBefore);
  if (process.env.PROCESS107_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(localEvidenceDir, `parameter-local-result-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
  }
});

test('PROCESS108 lets the engineer force-ignore an over-threshold point after explicit confirmation', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('parameter-forced-ignore.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '5.00,1.200,25.00,300.0',
    '5.50,1.201,25.01,300.1',
    '6.00,0.060,0.80,0.0',
    '6.50,1.203,25.03,300.3',
    '7.00,1.204,25.04,300.4',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '参数强制忽略', 'CPT-PARAM-FORCED');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-ignore-and-create-candidate').or(page.getByTestId('jts-create-pending-review-candidate')).or(page.getByTestId('apply-jts-classification'))).toBeVisible();
  if (await page.getByTestId('jts-ignore-and-create-candidate').count()) await page.getByTestId('jts-ignore-and-create-candidate').click();
  else if (await page.getByTestId('jts-create-pending-review-candidate').count()) await page.getByTestId('jts-create-pending-review-candidate').click();
  else await page.getByTestId('apply-jts-classification').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByRole('button', { name: '退出向导，打开独立高级设置' }).click();
  await page.getByTestId('run-jts-parameter-package').click();

  const selector = page.getByTestId('jts-parameter-selector-jts_compression_modulus');
  await expect(selector).toContainText('存在问题');
  const authorityBefore = await readParameterIssueAuthority(page);
  const layersBefore = await readFinalLayers(page);
  await selector.click();
  await expect(page.getByTestId('parameter-point-ignore-safety')).toContainText('未满足建议条件，可由工程师确认是否强制忽略');
  await expect(page.getByTestId('parameter-point-ignore-safety')).toContainText('低于建议的 50 个');
  await expect(page.getByTestId('parameter-issue-return-check')).toBeVisible();
  await expect(page.getByTestId('parameter-issue-force')).toHaveText('查看风险并继续');
  await page.getByTestId('parameter-issue-force').click();
  await expect(page.getByTestId('parameter-force-violations')).toContainText('未满足的条件');
  await expect(page.getByTestId('parameter-force-confirm')).toHaveText('确认强制忽略并重新试算');
  await page.getByTestId('parameter-force-back').click();
  await expect(page.getByTestId('parameter-issue-force')).toHaveText('查看风险并继续');
  await page.getByTestId('parameter-issue-force').click();

  const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process108-forced-parameter-ignore');
  if (process.env.PROCESS108_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDir, `forced-ignore-confirm-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
  }

  await page.getByRole('button', { name: '关闭参数问题' }).click();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeHidden();
  expect(await readParameterIssueAuthority(page)).toEqual(authorityBefore);
  await selector.click();
  await page.getByTestId('parameter-issue-force').click();
  await page.getByTestId('parameter-force-confirm').dblclick();
  await expect(page.getByTestId('parameter-issue-dialog')).toBeHidden();
  await expect(selector).toContainText(/\d+ 个值/);
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('局部忽略 1（强制 1）');
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('含工程师强制忽略项');
  await selector.click();
  await expect(page.getByTestId('parameter-curve-track-jts-jts_compression_modulus').locator('polyline')).toHaveCount(2);
  await page.getByText('方法状态与审计依据').click();
  await expect(page.getByTestId('parameter-ignored-point-audit')).toContainText('工程师强制忽略');
  await expect(page.getByTestId('parameter-ignored-point-audit')).toContainText('6.00 m');
  await expect.poll(() => readParameterIssueAuthority(page)).toMatchObject({
    packageRunCount: authorityBefore.packageRunCount + 1,
    rawRowCount: authorityBefore.rawRowCount,
    activeClassificationRunId: authorityBefore.activeClassificationRunId,
    currentSchemeId: authorityBefore.currentSchemeId,
  });
  expect(await readFinalLayers(page)).toEqual(layersBefore);
  const forcedState = await readForcedIgnoreState(page);
  expect(forcedState).toMatchObject({
    forcedIgnoredPointCount: 1,
    forced: true,
    sourceRowId: expect.any(String),
    depthM: 6,
    thresholdViolations: expect.arrayContaining([expect.stringContaining('低于建议的 50 个')]),
  });
  expect(forcedState?.forcedConfirmedAt).toMatch(/^2026-|^20/);

  await page.reload();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('局部忽略 1（强制 1）');
  await page.getByTestId('jts-parameter-selector-jts_compression_modulus').click();
  await page.getByText('方法状态与审计依据').click();
  await expect(page.getByTestId('parameter-ignored-point-audit')).toContainText('工程师强制忽略');
  await page.getByTestId('parameter-ignored-point-audit').locator(':scope > summary').click();
  await expect(page.getByTestId('parameter-ignored-point-audit')).toHaveAttribute('open', '');
  expect(await readForcedIgnoreState(page)).toEqual(forcedState);
  expect(await readFinalLayers(page)).toEqual(layersBefore);
  const layout = await page.evaluate(() => ({
    bodyHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    packageHorizontalOverflow: (() => {
      const node = document.querySelector<HTMLElement>('[data-testid="jts-parameter-package-evidence"]');
      return node ? node.scrollWidth > node.clientWidth : true;
    })(),
  }));
  expect(layout).toEqual({ bodyHorizontalOverflow: false, packageHorizontalOverflow: false });
  if (process.env.PROCESS108_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll<HTMLElement>('*').forEach((node) => { if (node.scrollTop) node.scrollTop = 0; });
      });
      await page.screenshot({ path: path.join(evidenceDir, `forced-ignore-result-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
      await page.getByTestId('parameter-ignored-point-audit').scrollIntoViewIfNeeded();
      await page.getByTestId('parameter-ignored-point-audit').screenshot({ path: path.join(evidenceDir, `forced-ignore-audit-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({
      authorityBefore,
      authorityAfter: await readParameterIssueAuthority(page),
      forcedState,
      layersUnchanged: (await readFinalLayers(page)).length === layersBefore.length,
      layout,
      errors,
    }, null, 2));
  }
  expect(errors).toEqual([]);
});

test('parameter guide leads the engineer through defaults, resume, skip and run', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('guided-parameter-cohesive.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '5.00,1.20,25,300',
    '5.50,1.24,26,305',
    '6.00,1.28,27,310',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  let guideLayout: Record<string, boolean> | null = null;
  const resultLayouts: Array<Record<string, boolean | number>> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '参数向导流程', 'CPT-GUIDE');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await page.getByTestId('apply-jts-classification').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();

  await expect(page.getByTestId('parameter-guide-dialog')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-selection').locator('input:checked')).toHaveCount(7);
  await expect(page.getByTestId('parameter-guide-select-gamma-sat')).toBeDisabled();
  await expect(page.getByTestId('parameter-guide-optional-group')).toBeVisible();
  await page.getByTestId('parameter-guide-optional-group').click();
  await expect(page.getByTestId('parameter-guide-select-spt')).not.toBeChecked();
  await expect(page.getByTestId('parameter-guide-select-phi')).toBeDisabled();
  const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'parameter-guided-workflow');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-selection-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-selection-1920x1080.png'), animations: 'disabled' });
  }

  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-gamma-sat')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-final-step')).toBeDisabled();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-su')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-nkt')).toHaveValue('');
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-problem')).toContainText('请选择 Su 对应的目标试验');
  await expect(page.getByTestId('parameter-guide-config-su')).toBeVisible();
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-su-nkt-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-nkt').selectOption('triaxial_uu');
  await page.getByTestId('parameter-guide-close').click();
  await expect.poll(() => readGuideState(page)).toMatchObject({ stage: 'configure', currentParameterId: 'su' });

  await page.reload();
  await expect(page.getByTestId('parameter-guide-config-su')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-nkt')).toHaveValue('triaxial_uu');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-su-nkt-1440x900.png') });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-ocr')).toBeVisible();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-sensitivity')).toBeVisible();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-config-compression-modulus')).toBeVisible();
  await page.getByText('其他处理方式').click();
  await page.getByTestId('parameter-guide-defer').click();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByTestId('parameter-guide-next').click();

  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-next')).toBeDisabled();
  await expect(page.getByTestId('parameter-guide-next')).toContainText('先处理暂缓 1 项');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-deferred-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-review-compression-modulus').click();
  await page.getByTestId('parameter-guide-dialog').getByRole('button', { name: /选择参数/ }).click();
  await page.getByTestId('parameter-rollback-confirm').click();
  await page.getByTestId('parameter-guide-select-compression-modulus').uncheck();
  await page.getByTestId('parameter-guide-next').click();
  for (let index = 0; index < 12 && await page.getByTestId('parameter-guide-final-step').isDisabled(); index += 1) {
    await page.getByTestId('parameter-guide-next').click();
  }
  await expect(page.getByTestId('parameter-guide-final-step')).toBeEnabled();
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-next')).toBeEnabled();
  await expect(page.getByTestId('parameter-guide-review-compression-modulus')).toContainText('本次未选择');
  await page.getByTestId('parameter-guide-review-compression-modulus').click();
  await page.getByTestId('parameter-guide-select-compression-modulus').check();
  await page.getByTestId('parameter-guide-next').click();
  await page.locator('.parameter-guide-list button').filter({ hasText: 'Es · 压缩模量' }).click();
  await page.getByText('其他处理方式').click();
  await page.getByTestId('parameter-guide-skip').click();
  await page.getByTestId('parameter-guide-skip-reason').selectOption('provided-by-other-test');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-skip-reason-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-next').click();
  await page.getByTestId('parameter-guide-final-step').click();

  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-review-compression-modulus')).toHaveClass(/skipped/);
  await expect(page.getByTestId('parameter-guide-review-compression-modulus')).toContainText('由其他试验提供');
  await page.getByTestId('parameter-guide-review-spt').click();
  await expect(page.getByTestId('parameter-guide-selection')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-config-gamma-sat')).toBeHidden();
  await page.getByTestId('parameter-guide-next').click();
  await page.getByTestId('parameter-guide-final-step').click();
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  guideLayout = await page.evaluate(() => ({
    dialogOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-guide-dialog"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    stepListHorizontalOverflow: (() => { const node = document.querySelector<HTMLElement>('.parameter-guide-list'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    mainHorizontalOverflow: (() => { const node = document.querySelector<HTMLElement>('.parameter-guide-main'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    footerOutsideViewport: (() => { const node = document.querySelector<HTMLElement>('.parameter-guide-footer'); if (!node) return true; const box = node.getBoundingClientRect(); return box.bottom > innerHeight || box.left < 0 || box.right > innerWidth; })(),
  }));
  expect(guideLayout).toEqual({ dialogOverflow: false, stepListHorizontalOverflow: false, mainHorizontalOverflow: false, footerOutsideViewport: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-review-1920x1080.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, 'parameter-guide-review-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-next').click();

  await expect(page.getByTestId('parameter-guide-dialog')).toBeHidden();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toBeVisible();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('可生成带排除声明的部分成果');
  await expect.poll(() => readPackageState(page)).toMatchObject({
    runCount: 1,
    eligible: true,
    nktValue: 23.8,
    skippedCompressionModulus: true,
    draft: null,
  });
  await expect(page.getByTestId('parameter-primary-action')).toHaveText('修改参数配置');
  await expect(page.getByTestId('parameter-primary-action')).not.toHaveClass(/primary/);
  await expect(page.getByTestId('parameter-guided-status')).toHaveText('试算已生成 · 待确认范围');
  await expect(page.getByTestId('parameter-guided-status')).toHaveClass(/status-warning/);
  await expect(page.getByTestId('parameter-first-look')).toContainText('确认当前参数范围');
  await expect(page.getByTestId('parameter-confirm-scope')).toHaveText('确认当前参数并进入成果输出');
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('不代表正式工程采纳');
  await expect(page.getByTestId('jts-package-representatives')).toContainText('kN/m³');
  await expect(page.getByTestId('document-parameters')).not.toContainText('继续确认其他目标层');
  await expect(page.getByTestId('parameter-scheme-dock')).toHaveCount(0);
  await expect(page.getByTestId('parameter-method-dock')).toHaveCount(0);
  await expect(page.getByTestId('parameter-guided-dock')).toHaveCount(0);
  await expect(page.getByTestId('open-parameter-guide')).toHaveCount(0);
  const curveChoices = page.getByTestId('jts-parameter-selector').locator('button:not(:disabled)');
  const curveChoiceCount = await curveChoices.count();
  expect(curveChoiceCount).toBeGreaterThan(0);
  await expect(page.getByTestId('jts-parameter-selector').locator('button:disabled')).not.toHaveCount(0);
  for (let index = 0; index < curveChoiceCount; index += 1) {
    const choice = curveChoices.nth(index);
    const testId = await choice.getAttribute('data-testid');
    const methodId = testId?.replace('jts-parameter-selector-', '') ?? '';
    await choice.click();
    await expect(page.getByTestId('jts-parameter-curve')).toHaveAttribute('data-method-id', methodId);
    await expect(page.getByTestId(`parameter-curve-track-jts-${methodId}`)).toHaveAttribute('data-curve-segment-count', /^[1-9]\d*$/);
  }
  const suChoice = page.getByTestId('jts-parameter-selector-jts_su_nkt');
  if (await suChoice.isEnabled()) {
    await suChoice.click();
    await expect(page.getByTestId('parameter-curve-track-jts-jts_su_nkt')).toHaveAttribute('data-domain-min', '0');
  }
  const resultEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process110-parameter-output-handoff');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const resultLayout = await page.evaluate(() => ({
      width: innerWidth,
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      resultOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-guided-result"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
      primaryVisible: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-primary-action"]'); if (!node) return false; const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0; })(),
      decisionPrimaryCount: document.querySelectorAll('[data-testid="parameter-first-look"] .toolbar-button.primary').length,
      headerPrimaryCount: document.querySelectorAll('.parameter-g2-header .toolbar-button.primary').length,
      nextStepInViewport: (() => { const node = document.querySelector<HTMLElement>('[data-testid="parameter-confirm-scope"]'); if (!node) return false; const box = node.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth; })(),
      curveInViewport: (() => { const node = document.querySelector<HTMLElement>('[data-testid="jts-parameter-curve"]'); if (!node) return false; const box = node.getBoundingClientRect(); return box.top < window.innerHeight && box.bottom > 0; })(),
      representativesInViewport: (() => { const node = document.querySelector<HTMLElement>('[data-testid="jts-package-representatives"]'); if (!node) return false; const box = node.getBoundingClientRect(); return box.top >= 0 && box.top < window.innerHeight; })(),
    }));
    expect(resultLayout).toEqual({ width: viewport.width, bodyOverflow: false, resultOverflow: false, primaryVisible: true, decisionPrimaryCount: 1, headerPrimaryCount: 0, nextStepInViewport: true, curveInViewport: true, representativesInViewport: true });
    resultLayouts.push(resultLayout);
    if (process.env.MILESTONE_EVIDENCE === '1') {
      mkdirSync(resultEvidenceDir, { recursive: true });
      await page.screenshot({ path: path.join(resultEvidenceDir, `jts-parameter-curve-su-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }

  await page.getByTestId('parameter-confirm-scope').click();
  await page.getByTestId('parameter-scope-confirm-submit').click();
  await expect(page.getByTestId('document-output')).toBeVisible();
  await expect(page.getByTestId('generate-output')).toBeEnabled();
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('parameter-guided-status')).toHaveText('本次参数范围已确认');
  await expect(page.getByTestId('parameter-guided-status')).toHaveClass(/status-success/);
  await expect(page.getByTestId('parameter-open-output')).toBeVisible();

  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await expect(page.getByTestId('parameter-guide-dialog')).toContainText('已回填当前运行；确认后将生成新的参数运行。');
  await expect(page.getByTestId('parameter-guide-next')).toContainText('保存修改并重新运行');
  await expect(page.getByTestId('parameter-guide-review-compression-modulus')).toContainText('由其他试验提供');
  for (let index = 0; index < 10 && await page.getByTestId('parameter-guide-selection').count() === 0; index += 1) {
    await page.getByTestId('parameter-guide-back').click();
    await expect(page.getByTestId('parameter-rollback-confirmation')).toBeVisible();
    await page.getByTestId('parameter-rollback-confirm').click();
  }
  await expect(page.getByTestId('parameter-guide-selection')).toBeVisible();
  await page.getByTestId('parameter-guide-close').click();
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('generate-output')).toBeDisabled();
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('parameter-guide-selection')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('parameter-guide-selection')).toBeVisible();
  await page.getByTestId('parameter-guide-next').click();
  for (let index = 0; index < 12 && await page.getByTestId('parameter-guide-review').count() === 0; index += 1) {
    await page.getByTestId('parameter-guide-next').click();
  }
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-dialog')).toBeHidden();
  await expect(page.getByTestId('parameter-confirm-scope')).toBeVisible();

  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(resultEvidenceDir, 'jts-parameter-modify-prefilled-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await page.getByTestId('parameter-guide-review-su').click();
  await expect(page.getByTestId('parameter-guide-nkt')).toHaveValue('triaxial_uu');
  await page.getByTestId('parameter-guide-nkt').selectOption('triaxial_cu');
  await page.getByTestId('parameter-guide-final-step').click();
  await expect(page.getByTestId('parameter-guide-review')).toBeVisible();
  await page.getByTestId('parameter-guide-next').click();
  await expect(page.getByTestId('parameter-guide-dialog')).toBeHidden();
  await expect(page.getByTestId('parameter-first-look')).toContainText('确认当前参数范围');
  await expect.poll(() => readPackageState(page)).toMatchObject({
    runCount: 4,
    eligible: true,
    nktValue: 13,
    skippedCompressionModulus: false,
    draft: null,
  });
  await page.reload();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('parameter-confirm-scope')).toHaveText('确认当前参数并进入成果输出');
  await expect(page.getByTestId('jts-parameter-curve').locator('polyline')).not.toHaveCount(0);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(resultEvidenceDir, 'jts-parameter-curve-rerun-1920x1080.png'), animations: 'disabled' });
    writeFileSync(path.join(resultEvidenceDir, 'flow-run.json'), JSON.stringify({ state: await readPackageState(page), curveChoiceCount, resultLayouts, errors }, null, 2));
  }
  await page.getByTestId('parameter-confirm-scope').click();
  await page.getByTestId('parameter-scope-confirm-submit').click();
  await expect(page.getByTestId('generate-output')).toBeEnabled();
  await page.getByTestId('output-kind').selectOption('excel-workbook');
  const xlsxDownload = page.waitForEvent('download');
  await page.getByTestId('generate-output').click();
  const xlsx = await xlsxDownload;
  const xlsxPath = testInfo.outputPath(xlsx.suggestedFilename());
  await xlsx.saveAs(xlsxPath);
  const workbook = await readXlsxFile(xlsxPath);
  expect(workbook.map((sheet) => sheet.sheet)).not.toContain('参数排除');
  await page.getByTestId('output-kind').selectOption('a4-report-pdf');
  const pdfDownload = page.waitForEvent('download');
  await page.getByTestId('generate-output').click();
  const pdf = await pdfDownload;
  const pdfPath = testInfo.outputPath(pdf.suggestedFilename());
  await pdf.saveAs(pdfPath);
  expect(readFileSync(pdfPath).toString('latin1')).toContain('/Count 3');
  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    dialogOverflow: (() => {
      const node = document.querySelector<HTMLElement>('[data-testid="parameter-guide-dialog"]');
      return node ? node.scrollWidth > node.clientWidth : false;
    })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, dialogOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ state: await readPackageState(page), layout, guideLayout, errors }, null, 2));
  }
  expect(errors).toEqual([]);
});

async function prepareCurrentPoint(page: import('@playwright/test').Page, projectName: string, pointName: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(pointName);
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
}

async function currentPoint(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.reason);
    const project = loaded.manifest.state.projects[0];
    return project.points.find((candidate) => candidate.pointId === project.activePointId)!;
  });
}

async function readGuideState(page: import('@playwright/test').Page) {
  const point = await currentPoint(page);
  return point.parameterWorkspace?.guidedParameterDraft ?? null;
}

async function readPackageState(page: import('@playwright/test').Page) {
  const point = await currentPoint(page);
  const runs = point.parameterWorkspace?.jtsParameterPackageRuns ?? [];
  const run = runs.find((candidate) => candidate.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId) ?? null;
  return {
    runCount: runs.length,
    eligible: run?.summary.eligibleForOutput ?? false,
    nktValue: run?.settingsSnapshot.nktValue ?? null,
    skippedCompressionModulus: run?.settingsSnapshot.skippedMethodDecisions?.some((item) => item.methodId === 'jts_compression_modulus' && item.reason === 'provided-by-other-test') ?? false,
    draft: point.parameterWorkspace?.guidedParameterDraft ?? null,
  };
}

async function readParameterIssueAuthority(page: import('@playwright/test').Page) {
  const point = await currentPoint(page);
  return {
    packageRunCount: point.parameterWorkspace?.jtsParameterPackageRuns.length ?? 0,
    rawRowCount: point.importDrafts.at(-1)?.sourceRowIds.length ?? 0,
    activeClassificationRunId: point.stratificationWorkspace?.activeJtsClassificationRunId ?? null,
    currentSchemeId: point.stratificationWorkspace?.currentSchemeId ?? null,
  };
}

async function readParameterScopeAuthority(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.reason);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const runs = point.parameterWorkspace?.jtsParameterPackageRuns ?? [];
    const run = runs.find((candidate) => candidate.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId) ?? null;
    const applicable = run?.checklist.filter((item) => item.applicableLayerIds.length > 0) ?? [];
    return {
      projectName: project.projectName,
      pointName: point.pointName,
      runCount: runs.length,
      eligible: run?.summary.eligibleForOutput ?? false,
      completedMethodCount: applicable.filter((item) => item.status === 'complete').length,
      unresolvedMethodIds: applicable.filter((item) => item.status === 'pending' || item.status === 'problem').map((item) => item.methodId),
      skippedMethodIds: run?.settingsSnapshot.skippedMethodDecisions?.map((item) => item.methodId) ?? [],
      skippedReasons: run?.settingsSnapshot.skippedMethodDecisions?.map((item) => item.reason) ?? [],
      scopeConfirmedAt: run?.settingsSnapshot.outputScopeConfirmedAt ?? null,
      scopeExcludedMethodIds: run?.settingsSnapshot.outputScopeExcludedMethodIds ?? [],
      rawRowCount: point.importDrafts.at(-1)?.sourceRowIds.length ?? 0,
    };
  });
}

async function readFinalLayers(page: import('@playwright/test').Page) {
  const point = await currentPoint(page);
  const workspace = point.stratificationWorkspace;
  const scheme = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
  const revision = scheme ? workspace?.revisions.find((candidate) => candidate.schemeId === scheme.schemeId && candidate.version === scheme.version) : null;
  return revision?.snapshot.layers.map((layer) => ({
    layerId: layer.layerId,
    name: layer.name,
    depthFromM: layer.depthFromM,
    depthToM: layer.depthToM,
    engineeringSoilGroup: layer.engineeringSoilGroup,
  })) ?? [];
}

async function readForcedIgnoreState(page: import('@playwright/test').Page) {
  const point = await currentPoint(page);
  const workspace = point.parameterWorkspace;
  const run = workspace?.jtsParameterPackageRuns.find((candidate) => candidate.runId === workspace.activeJtsParameterPackageRunId);
  const decision = run?.settingsSnapshot.ignoredPointDecisions?.find((candidate) => candidate.forced);
  return decision ? {
    forcedIgnoredPointCount: run?.summary.forcedIgnoredPointCount ?? 0,
    forced: decision.forced,
    sourceRowId: decision.sourceRowId,
    depthM: decision.depthM,
    thresholdViolations: decision.thresholdViolations,
    forcedConfirmedAt: decision.forcedConfirmedAt,
  } : null;
}
