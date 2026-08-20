import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { completeThinLayerGuide, confirmPendingStratificationLayers } from './stratification-guide-helpers';

const process148EvidenceEnabled = process.env.PROCESS148_EVIDENCE === '1';
const process148EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process148-keep-current-layers');
const process150EvidenceEnabled = process.env.PROCESS150_EVIDENCE === '1';
const process150EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process150-stratification-origin-rollback');

test('no-u2 JTS approximate classification becomes an editable, committed, and stale-aware scheme', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const inputPath = testInfo.outputPath('jts-approx-classification.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa)',
    '1.00,0.08,8',
    '1.50,0.30,12',
    '2.00,0.70,18',
    '2.50,1.50,20',
    '3.00,6.00,22',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, 'Stage 4 JTS 分类', 'CPT-JTS-APPROX');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => readState(page)).toMatchObject({ draftCount: 1, channelState: 'absent' });
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();

  await expect.poll(() => readState(page)).toMatchObject({ probeConfirmed: true, waterConfirmed: true });

  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await expect(page.getByTestId('jts-classification-tool')).toContainText('待运行');
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-classification-tool')).toBeVisible();
  await expect(page.getByTestId('jts-classification-tool')).toContainText('CPT 近似');
  await expect(page.getByTestId('jts-guidance-summary')).toContainText('双路径一致');
  await expect(page.getByTestId('jts-classification-tool')).not.toContainText('路径不可用');
  await expect(page.getByTestId('jts-classification-evidence')).toHaveCount(0);
  await expect(page.getByTestId('jts-guidance-advanced')).not.toHaveAttribute('open', '');
  await expect.poll(() => readState(page)).toMatchObject({
    classificationRunCount: 1,
    activeClassificationRoute: 'approximate_cpt',
    activeClassificationStatus: 'completed',
    poreClassCount: 0,
  });

  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('guided-generation-dialog')).toBeVisible();
  await expect(page.getByTestId('guided-method-jts-t242-2020')).toBeEnabled();
  await expect(page.getByTestId('guided-method-fuzzy-zhang-tumay-1999')).toBeEnabled();
  await expect(page.getByTestId('guided-method-modified-robertson-2016')).toBeEnabled();
  await expect(page.getByTestId('guided-method-schneider-2008')).toBeDisabled();
  await expect(page.getByTestId('guided-method-schneider-2008')).toContainText('需要完整 CPTU');
  await expect(page.getByTestId('guided-use-rule-and-jts-unavailable')).toContainText('当前无规则边界');
  await expect(page.getByTestId('guided-use-rule-and-jts-unavailable')).toContainText('取消后打开高级工具');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process082-generic-stratification');
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'method-choice-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'method-choice-1920x1080.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('guided-use-jts').click();
  await expect(page.getByTestId('guided-use-jts')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toBeVisible();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toContainText('使用当前分层');
  const process148Layouts: Array<Record<string, unknown>> = [];
  if (process148EvidenceEnabled) {
    mkdirSync(process148EvidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.getByTestId('layer-cleanup-method-dialog').evaluate((dialog) => {
        const rect = dialog.getBoundingClientRect();
        const keep = dialog.querySelector<HTMLElement>('[data-testid="layer-cleanup-keep-current"]')?.getBoundingClientRect();
        return {
          viewport: { width: innerWidth, height: innerHeight },
          dialogFits: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
          keepCurrentVisible: Boolean(keep && keep.left >= rect.left && keep.right <= rect.right && keep.top >= rect.top && keep.bottom <= rect.bottom),
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      process148Layouts.push(layout);
      await page.screenshot({ path: path.join(process148EvidenceDirectory, `method-choice-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  const layerStructureBefore = await page.getByTestId('stratification-layer-table').locator('button').allTextContents();
  await page.getByRole('button', { name: '关闭整理分层' }).click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('先整理分层');
  await expect.poll(() => readState(page)).toMatchObject({ workingOrigin: 'jts-classification', baselineOrigin: 'jts-classification' });
  await expect.poll(async () => {
    const origins = (await readState(page)).undoOrigins;
    return Array.isArray(origins) && origins.length > 0 && origins.every((origin) => origin === 'jts-classification');
  }).toBe(true);
  await page.getByTestId('stratification-guide-back').click();
  await expect(page.getByTestId('stratification-rollback-confirmation')).toContainText('放弃本次候选并返回生成方式');
  const process150Layouts: Array<Record<string, unknown>> = [];
  if (process150EvidenceEnabled) {
    mkdirSync(process150EvidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      process150Layouts.push(await page.getByTestId('stratification-rollback-confirmation').evaluate((dialog) => {
        const rect = dialog.getBoundingClientRect();
        return {
          viewport: { width: innerWidth, height: innerHeight },
          dialogFits: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }));
      await page.screenshot({ path: path.join(process150EvidenceDirectory, `return-without-review-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-rollback-confirm').click();
  await expect(page.getByTestId('stratification-rollback-confirmation')).toHaveCount(0);
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await expect.poll(() => readState(page)).toMatchObject({ schemeCount: 0 });
  if (process150EvidenceEnabled) {
    writeFileSync(path.join(process150EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      flow: 'PROCESS150',
      layouts: process150Layouts,
      persistedAfterReturn: await readState(page),
      saveAlertCount: await page.getByTestId('project-storage-workspace-notice').count(),
      browserErrors: errors,
    }, null, 2));
  }
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-jts').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toBeVisible();
  await page.getByTestId('layer-cleanup-keep-current').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toHaveCount(0);
  await expect(page.getByTestId('stratification-first-look')).toContainText('逐层确认');
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(5);
  const layerStructureAfter = await page.getByTestId('stratification-layer-table').locator('button').allTextContents();
  expect(layerStructureAfter).toEqual(layerStructureBefore);
  await expect.poll(() => readState(page)).toMatchObject({ workingLayerStructureReviewCount: 1, workingLayerCount: 5, workingBoundaryCount: 4 });
  if (process148EvidenceEnabled) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(process148EvidenceDirectory, `current-layers-confirmed-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    writeFileSync(path.join(process148EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      flow: 'PROCESS148',
      layouts: process148Layouts,
      beforeLayerLabels: layerStructureBefore,
      afterLayerLabels: layerStructureAfter,
      state: await readState(page),
      browserErrors: errors,
    }, null, 2));
  }
  await page.reload();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toHaveCount(0);
  await expect.poll(() => readState(page)).toMatchObject({ workingLayerStructureReviewCount: 1, workingLayerCount: 5, workingBoundaryCount: 4 });
  await page.getByTestId('stratification-guide-back').click();
  await page.getByTestId('stratification-rollback-confirm').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('先整理分层');
  await expect.poll(() => readState(page)).toMatchObject({ workingLayerStructureReviewCount: 0, workingLayerCount: 5, workingBoundaryCount: 4 });
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('layer-cleanup-keep-current').click();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await confirmAllCandidateLayers(page);
  await page.getByTestId('stratification-save').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await expect(page.getByTestId('stratification-finalize-sources')).toContainText('边界来源分类候选');
  await expect(page.getByTestId('stratification-final-layer-preview')).toContainText('Zone');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'stratification-guided-flow');
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'final-preview-1920x1080.png'), animations: 'disabled' });
  }
  await page.getByTestId('stratification-guide-generate-revision').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText(/方案可进入参数解译|分层方案已就绪/);
  const current = await expect.poll(() => readState(page)).toMatchObject({
    schemeCount: 1,
    currentSchemeOrigin: 'jts-classification',
    currentSchemeStatus: 'current',
    currentSchemeBoundaryEvidenceCount: 4,
    currentSchemeCandidateMode: 'stable',
    currentSchemeSelectionPolicy: 'dual-path-with-ic-fallback',
  });
  void current;
  await expect(page.getByTestId('jts-sbt-chart')).toBeVisible();
  await expect(page.getByTestId('jts-sbt-approximate')).toContainText('无 u2，当前为 CPT 近似分类');
  const approximateSbtCounts = await page.getByTestId('jts-sbt-chart').evaluate((element) => ({
    total: Number(element.getAttribute('data-total-rows')),
    valid: Number(element.getAttribute('data-valid-points')),
    invalid: Number(element.getAttribute('data-invalid-points')),
  }));
  expect(approximateSbtCounts.total).toBe(approximateSbtCounts.valid + approximateSbtCounts.invalid);

  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage4-classification');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'jts-approx-classification-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'jts-approx-classification-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ state: await readState(page), layout, errors }, null, 2));
  }

  const completedRunId = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const runId = point?.stratificationWorkspace?.activeJtsClassificationRunId;
    if (!point?.stratificationWorkspace || !runId) throw new Error('Active JTS run not found.');
    point.stratificationWorkspace.activeJtsClassificationRunId = null;
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
    if (!saved.ok) throw new Error(saved.detail);
    return runId;
  });
  await page.reload();
  await expect(page.getByTestId('jts-sbt-panel')).toHaveAttribute('data-state', 'stale');
  await expect(page.getByTestId('jts-sbt-chart')).toHaveCount(0);
  await page.evaluate(async (runId) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    if (!point?.stratificationWorkspace) throw new Error('Stratification workspace not found.');
    point.stratificationWorkspace.activeJtsClassificationRunId = runId;
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
    if (!saved.ok) throw new Error(saved.detail);
  }, completedRunId);
  await page.reload();
  await expect(page.getByTestId('jts-sbt-panel')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('jts-sbt-chart')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await expect(async () => {
    await page.getByTestId('explorer-import').click();
    await expect(page.getByTestId('import-file-input')).toBeAttached({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });
  const replacementPath = testInfo.outputPath('jts-approx-classification-replacement.csv');
  writeFileSync(replacementPath, ['Depth(m),qc(MPa),fs(kPa)', '1.00,0.10,8', '2.00,0.80,18', '3.00,5.00,22'].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(replacementPath);
  await expect.poll(() => readState(page)).toMatchObject({ activeClassificationStatus: null, latestClassificationStatus: 'stale', currentSchemeStatus: 'stale' });
  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-rerun').click();
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('jts-sbt-panel')).toHaveAttribute('data-state', 'stale');
  await expect(page.getByTestId('jts-sbt-panel')).toContainText('分类结果已失效');
  await expect(page.getByTestId('jts-sbt-chart')).toHaveCount(0);
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-sbt-panel')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('jts-sbt-chart')).toBeVisible();
  expect(errors).toEqual([]);
});

test('data check catches missing engineering context and returns to its owner', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('guided-missing-context.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa)',
    '1.00,1.20,18',
    '1.50,1.40,20',
    '2.00,1.60,22',
  ].join('\n'), 'utf8');

  await prepareCurrentPoint(page, '分层向导前置条件', 'CPT-GUIDE-CONTEXT', false);
  await page.getByRole('button', { name: '暂不确认' }).last().click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await page.getByRole('button', { name: '暂不确认' }).last().click();
  await page.getByTestId('run-data-check').click();
  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-rerun').click();
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-action-queue')).toContainText('探头规格尚未确认');
  await page.getByTestId('check-primary-return-import').click();
  await expect(page.getByTestId('document-project')).toBeVisible();
});

test('full CPTU classification exposes both verified paths after explicit pressure-context confirmation', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('jts-full-classification.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '5.00,1.20,25,300', '5.10,1.22,25.2,302'].join('\n'), 'utf8');
  await prepareCurrentPoint(page, 'Stage 4 JTS 双路径', 'CPT-JTS-FULL');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => readState(page)).toMatchObject({ draftCount: 1, channelState: 'present' });
  await page.getByTestId('water-guide-depth').fill('10');
  await completePreparationGuide(page);
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-classification-tool')).toContainText('完整 CPTU');
  await expect(page.getByTestId('jts-guidance-summary')).toContainText('双路径一致');
  await expect.poll(() => readState(page)).toMatchObject({
    activeClassificationRoute: 'full_cptu',
    activeClassificationStatus: 'completed',
    poreClassCount: 2,
    sameClassificationCount: 2,
  });

  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('guided-generation-dialog')).toBeVisible();
  await expect(page.getByTestId('guided-method-jts-t242-2020')).toBeEnabled();
  await expect(page.getByTestId('guided-method-fuzzy-zhang-tumay-1999')).toBeEnabled();
  await expect(page.getByTestId('guided-method-modified-robertson-2016')).toBeEnabled();
  await expect(page.getByTestId('guided-method-schneider-2008')).toBeEnabled();
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process125-professional-output');
    mkdirSync(evidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `method-selection-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  await page.getByTestId('guided-method-schneider-2008').click();
  await page.getByTestId('guided-use-jts').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect.poll(() => readState(page)).toMatchObject({ activeClassificationMethod: 'schneider-2008' });
  await expect(page.getByTestId('jts-exception-dialog')).toBeVisible();
  await page.getByTestId('jts-exception-dialog').locator('button.icon-button').click();
  await expect(page.getByTestId('jts-exception-dialog')).toHaveCount(0);
});

test('pore-chart gaps offer one-click Ic fallback with reasons and keep advanced control optional', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const inputPath = testInfo.outputPath('jts-pore-chart-gap.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '10.00,20.00,100,-200',
    '10.10,20.50,102,-205',
    '10.20,21.00,104,-210',
  ].join('\n'), 'utf8');
  await prepareCurrentPoint(page, 'JTS 孔压图域外引导', 'CPTU-GUIDED');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();

  await expect(page.getByTestId('jts-classification-tool')).toContainText('分类可以继续');
  await expect(page.getByTestId('jts-classification-tool')).toContainText('孔压没有分类结果不等于孔压数据错误');
  await expect(page.getByTestId('jts-guidance-summary')).toContainText('3仅 Ic 可用');
  await expect(page.getByTestId('apply-jts-classification')).toHaveText('使用 Ic 结果生成地层');
  await expect(page.getByTestId('jts-pore-guidance')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('jts-guidance-advanced')).not.toHaveAttribute('open', '');

  const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-guided-pore-recovery');
  const layouts = [];
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDir, `ic-fallback-${viewport.width}x${viewport.height}.png`), fullPage: true });
      const layout = await readGuidedLayout(page);
      expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false, primaryCount: 1 });
      layouts.push({ viewport, layout });
    }
  }

  await page.getByTestId('jts-pore-guidance').locator('summary').click();
  await expect(page.getByTestId('jts-pore-guidance')).toContainText('超出当前 JTS 孔压分类图范围');
  await expect(page.getByTestId('jts-pore-guidance')).toContainText('不能靠修改原始孔压');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'pore-detail-1440x900.png'), fullPage: true });
  }
  await page.getByTestId('jts-guided-open-context').click();
  await expect(page.getByTestId('document-project')).toBeVisible();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    await page.getByTestId('jts-guidance-advanced').locator('summary').click();
    await page.screenshot({ path: path.join(evidenceDir, 'advanced-control-1440x900.png'), fullPage: true });
    await page.getByTestId('jts-guidance-advanced').locator('summary').click();
  }
  await page.getByTestId('apply-jts-classification').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toBeVisible();
  await completeThinLayerGuide(page);
  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await confirmAllCandidateLayers(page);
  await page.getByTestId('stratification-save').click(); if (await page.getByTestId('stratification-guide-generate-revision').count()) await page.getByTestId('stratification-guide-generate-revision').click();
  await expect.poll(() => readState(page)).toMatchObject({
    currentSchemeOrigin: 'jts-classification',
    currentSchemeCandidateMode: 'stable',
    currentSchemeSelectionPolicy: 'dual-path-with-ic-fallback',
  });
  expect(errors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({ layouts, errors, state: await readState(page) }, null, 2));
  }
});

async function readGuidedLayout(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    primaryCount: document.querySelectorAll('[data-testid="jts-classification-tool"] .primary:not(:disabled)').length,
  }));
}

async function readGenerationDialogLayout(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('[data-testid="guided-generation-dialog"]');
    const rect = dialog?.getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      dialogFits: Boolean(rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight),
    };
  });
}

async function readDenseStratificationLayout(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const column = document.querySelector<HTMLElement>('[data-testid="stratification-layer-track"] .editable-layer-column');
    const svg = document.querySelector<SVGElement>('[data-testid="stratification-qc-curve"] .jts-linked-track[data-channel="qc"] svg');
    const plot = document.querySelector<HTMLElement>('[data-testid="stratification-shared-plot"]');
    const layerTrack = document.querySelector<HTMLElement>('[data-testid="stratification-layer-track"]');
    const overlay = document.querySelector<HTMLElement>('[data-testid="stratification-shared-boundary-overlay"]');
    const curveDepthLabels = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="stratification-qc-curve"] .jts-linked-depth-axis span')).map((element) => Number.parseFloat(element.textContent ?? ''));
    const labels = Array.from(document.querySelectorAll<HTMLElement>('.editable-layer-block.has-label strong')).map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
    let overlappingLayerLabelPairs = 0;
    for (let left = 0; left < labels.length; left += 1) for (let right = left + 1; right < labels.length; right += 1) {
      const a = labels[left]; const b = labels[right];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlappingLayerLabelPairs += 1;
    }
    const columnRect = column?.getBoundingClientRect();
    const svgRect = svg?.getBoundingClientRect();
    return {
      visibleLayerCount: column?.querySelectorAll('.editable-layer-block').length ?? 0,
      compactLayerCount: column?.querySelectorAll('.editable-layer-block.compact').length ?? 0,
      visibleLayerLabelCount: labels.length,
      sharedBoundaryCount: overlay?.querySelectorAll('.shared-boundary-line').length ?? 0,
      overlappingLayerLabelPairs,
      plotHeight: plot?.getBoundingClientRect().height ?? 0,
      curveDepthFromM: curveDepthLabels[0] ?? Number.NaN,
      curveDepthToM: curveDepthLabels[2] ?? Number.NaN,
      layerDepthFromM: Number(layerTrack?.dataset.depthFrom ?? Number.NaN),
      layerDepthToM: Number(layerTrack?.dataset.depthTo ?? Number.NaN),
      sharedAxisTopError: columnRect && svgRect ? Math.abs(svgRect.top - (columnRect.top + 1)) : Number.POSITIVE_INFINITY,
      sharedAxisBottomError: columnRect && svgRect ? Math.abs(svgRect.bottom - (columnRect.bottom - 1)) : Number.POSITIVE_INFINITY,
      sharedBoundaryLeftError: overlay && svgRect ? Math.abs(overlay.getBoundingClientRect().left - svgRect.left) : Number.POSITIVE_INFINITY,
      sharedBoundaryRightError: overlay && columnRect ? Math.abs(overlay.getBoundingClientRect().right - columnRect.right) : Number.POSITIVE_INFINITY,
    };
  });
}

async function confirmAllCandidateLayers(page: import('@playwright/test').Page) {
  await confirmPendingStratificationLayers(page, '粉土');
}

async function prepareCurrentPoint(page: import('@playwright/test').Page, projectName: string, pointName: string, confirmProbe = true) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(pointName);
  await page.getByTestId('confirm-point-command').click();
  if (confirmProbe) await page.getByTestId('probe-guide-recommended').click();
}

async function readState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { reason: loaded.reason };
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const workspace = point.stratificationWorkspace;
    const activeRun = workspace?.jtsClassificationRuns?.find((run) => run.runId === workspace.activeJtsClassificationRunId) ?? null;
    const latestRun = workspace?.jtsClassificationRuns?.at(-1) ?? null;
    const currentScheme = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId) ?? null;
    return {
      draftCount: point.importDrafts.length,
      channelState: point.waterContext.channelState,
      probeConfirmed: Boolean(point.probeContext.confirmedAt),
      waterConfirmed: Boolean(point.waterContext.confirmedAt),
      classificationRunCount: workspace?.jtsClassificationRuns?.length ?? 0,
      activeClassificationMethod: activeRun?.methodId ?? null,
      activeClassificationRoute: activeRun?.route ?? null,
      activeClassificationStatus: activeRun?.status ?? null,
      latestClassificationStatus: latestRun?.status ?? null,
      poreClassCount: activeRun?.rows.filter((row) => row.poreClass).length ?? 0,
      sameClassificationCount: activeRun?.summary.sameCount ?? 0,
      schemeCount: workspace?.schemes.length ?? 0,
      workingLayerStructureReviewCount: workspace?.editSession?.working.layerStructureReviewHistory?.length ?? 0,
      workingLayerCount: workspace?.editSession?.working.layers.length ?? 0,
      workingBoundaryCount: workspace?.editSession?.working.boundaries.length ?? 0,
      workingOrigin: workspace?.editSession?.working.origin?.kind ?? null,
      baselineOrigin: workspace?.editSession?.baseline.origin?.kind ?? null,
      undoOrigins: workspace?.editSession?.undoStack.map((snapshot) => snapshot.origin?.kind ?? null) ?? [],
      currentSchemeOrigin: currentScheme?.origin?.kind ?? null,
      currentSchemeStatus: currentScheme?.status ?? null,
      currentSchemeBoundaryEvidenceCount: currentScheme?.boundaries.filter((boundary) => boundary.jtsCandidateRef).length ?? 0,
      currentSchemeCandidateMode: currentScheme?.origin?.kind === 'jts-classification' ? currentScheme.origin.selection?.candidateMode ?? null : null,
      currentSchemeSelectionPolicy: currentScheme?.origin?.kind === 'jts-classification' ? currentScheme.origin.selection?.policy ?? null : null,
    };
  });
}
