import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
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

test('real Yingkou first-run guide visibly selects JTS and explains why generation cannot continue', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const sourceWorkbook = path.join(process.cwd(), 'sample_data', 'source', 'yingkou', 'CPT09数据.xlsx');
  test.skip(!existsSync(sourceWorkbook), '营口真实样本未获公开授权，干净发布环境按预期跳过。');
  const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process086-guided-generation');
  const process093EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process093-dense-stratification-view');
  const process102EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process102-shared-boundary-sbt');
  const process106EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process106-sbt-zone-clarity');
  const process106EvidenceEnabled = process.env.PROCESS106_EVIDENCE === '1';
  const process100EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process100-major-group-merge');
  const process100EvidenceEnabled = process.env.PROCESS100_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
  const process101EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process101-review-semantics');
  const process101EvidenceEnabled = process.env.PROCESS101_EVIDENCE === '1';
  const majorGroupEvidenceDirectories = [
    ...(process100EvidenceEnabled ? [process100EvidenceDirectory] : []),
    ...(process101EvidenceEnabled ? [process101EvidenceDirectory] : []),
  ];
  const errors: string[] = [];
  const layouts: Array<{ state: string; viewport: { width: number; height: number }; bodyOverflow: boolean; dialogFits: boolean }> = [];
  const process106Layouts: Array<Record<string, unknown>> = [];
  let runningObserved = false;
  let ariaBusyObserved = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, '营口首次向导分类', 'CPT09');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(sourceWorkbook);
  await expect(page.getByTestId('parsed-import-result')).toContainText('4282 行', { timeout: 30_000 });
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题', { timeout: 30_000 });
  await expect(page.getByTestId('check-action-queue')).toContainText('JTS 计算输入存在无效值');
  await page.getByTestId('check-ignore-current-row').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成', { timeout: 30_000 });

  await page.getByTestId('explorer-stratification').click();
  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('guided-generation-confirm')).toBeDisabled();
  await expect(page.getByTestId('guided-use-jts')).toContainText('按 JTS/T 242—2020 的原生类别变化');
  await page.getByTestId('guided-use-jts').click();
  await expect(page.getByTestId('guided-use-jts')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('guided-generation-confirm')).toBeEnabled();

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `method-selected-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
      layouts.push({ state: 'method-selected', viewport, ...(await readGenerationDialogLayout(page)) });
    }
  }

  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('guided-generation-running')).toContainText('正在检查 4281 行数据');
  await expect(page.getByTestId('guided-generation-dialog')).toHaveAttribute('aria-busy', 'true');
  runningObserved = true;
  ariaBusyObserved = true;
  await expect(page.getByTestId('guided-generation-dialog')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('jts-exception-dialog')).toBeVisible();
  await page.getByTestId('jts-create-pending-review-candidate').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toBeVisible();
  if (majorGroupEvidenceDirectories.length) {
    majorGroupEvidenceDirectories.forEach((directory) => mkdirSync(directory, { recursive: true }));
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      for (const directory of majorGroupEvidenceDirectories) await page.screenshot({ path: path.join(directory, `method-choice-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await expect(page.getByTestId('layer-cleanup-method-dialog')).not.toContainText('目标层数');
  const majorGroupMergeStartedAt = Date.now();
  await page.getByTestId('layer-cleanup-major-group-method').click();
  await expect(page.getByTestId('major-group-preview-step')).toBeVisible({ timeout: 5_000 });
  const majorGroupMergeMs = Date.now() - majorGroupMergeStartedAt;
  expect(majorGroupMergeMs).toBeLessThan(2_500);
  const majorGroupPreviewText = await page.getByTestId('major-group-preview-step').innerText();
  expect(majorGroupPreviewText).toContain('整理前');
  expect(majorGroupPreviewText).toContain('合并后');
  expect(majorGroupPreviewText).toContain('需复核');
  expect(majorGroupPreviewText).toContain('曲线差异提示');
  expect(majorGroupPreviewText).not.toContain('曲线突变');
  await expect(page.getByTestId('major-group-guide-dialog')).toContainText('按土类大类合并');
  expect(majorGroupPreviewText).not.toContain('建议目标');
  await expect(page.locator('body')).not.toContainText('选择按目标层数简化');
  await expect(page.getByTestId('major-group-preview-step').locator('.jts-linked-evidence')).toBeVisible();
  await expect(page.getByTestId('major-group-review-reasons')).toBeVisible();
  await page.getByTestId('major-group-review-reasons').locator('summary').click();
  await expect(page.getByTestId('major-group-review-reasons')).toContainText('曲线差异提示（规则阈值）');
  await expect(page.getByTestId('major-group-review-reasons')).toContainText(/来源层 \d+\.\d{2}–\d+\.\d{2} m/);
  await expect(page.getByTestId('major-group-result-list').locator('article.active')).toBeInViewport();
  if (majorGroupEvidenceDirectories.length) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      for (const directory of majorGroupEvidenceDirectories) await page.screenshot({ path: path.join(directory, `review-reasons-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  if (process101EvidenceEnabled) {
    await page.getByTestId('major-group-result-19').click();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(process101EvidenceDirectory, `thin-layer-locator-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.locator('[data-testid="major-group-result-list"] article.active').scrollIntoViewIfNeeded();
  const majorGroupLayout = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('[data-testid="major-group-guide-dialog"]')?.getBoundingClientRect();
    const action = document.querySelector<HTMLElement>('[data-testid="major-group-apply-plan"]')?.getBoundingClientRect();
    const planList = document.querySelector<HTMLElement>('[data-testid="major-group-result-list"]')?.getBoundingClientRect();
    const selectedSuggestionNode = document.querySelector<HTMLElement>('[data-testid="major-group-result-list"] article.active');
    const selectedSuggestion = selectedSuggestionNode?.getBoundingClientRect();
    const currentEvidenceText = document.querySelector<HTMLElement>('.target-layer-current-evidence strong')?.innerText ?? '';
    const selectedSuggestionText = selectedSuggestionNode?.innerText ?? '';
    const tracks = [...document.querySelectorAll<SVGElement>('[data-testid="major-group-preview-step"] .jts-linked-track svg')].map((node) => node.getBoundingClientRect());
    const curveMarks = Object.fromEntries(['qc', 'fs', 'u2'].map((channel) => [channel, document.querySelectorAll(`[data-testid="major-group-preview-step"] [data-channel="${channel}"] path, [data-testid="major-group-preview-step"] [data-channel="${channel}"] polyline`).length]));
    const selectedBand = document.querySelector<SVGGraphicsElement>('[data-testid="major-group-preview-step"] [data-channel="qc"] .jts-selected-layer-band');
    const selectedLocator = document.querySelector<SVGGraphicsElement>('[data-testid="major-group-preview-step"] [data-channel="qc"] .jts-selected-layer-locator');
    return {
      bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialogFits: Boolean(dialog && dialog.top >= 0 && dialog.left >= 0 && dialog.right <= innerWidth && dialog.bottom <= innerHeight),
      actionVisible: Boolean(action && action.top >= 0 && action.bottom <= innerHeight),
      planListHeight: planList?.height ?? 0,
      selectedSuggestionVisible: Boolean(selectedSuggestion && planList && selectedSuggestion.top >= planList.top && selectedSuggestion.bottom <= planList.bottom),
      currentEvidenceText,
      selectedSuggestionText,
      sharedTrackTopError: tracks.length ? Math.max(...tracks.map((rect) => Math.abs(rect.top - tracks[0].top))) : 999,
      sharedTrackBottomError: tracks.length ? Math.max(...tracks.map((rect) => Math.abs(rect.bottom - tracks[0].bottom))) : 999,
      curveMarks,
      selectedBandSvgHeight: Number(selectedBand?.getAttribute('height') ?? Number.NaN),
      selectedLocatorStrokeWidth: selectedLocator ? Number.parseFloat(getComputedStyle(selectedLocator).strokeWidth) : Number.NaN,
    };
  });
  expect(majorGroupLayout.bodyOverflowX).toBeLessThanOrEqual(1);
  expect(majorGroupLayout.dialogFits).toBe(true);
  expect(majorGroupLayout.actionVisible).toBe(true);
  expect(majorGroupLayout.planListHeight).toBeGreaterThan(50);
  expect(majorGroupLayout.selectedSuggestionVisible).toBe(true);
  expect(majorGroupLayout.selectedSuggestionText).toContain(majorGroupLayout.currentEvidenceText.split(' · ')[0]);
  expect(majorGroupLayout.currentEvidenceText).toMatch(/砂性土|混合土|黏性土/);
  expect(majorGroupLayout.sharedTrackTopError).toBeLessThanOrEqual(1);
  expect(majorGroupLayout.sharedTrackBottomError).toBeLessThanOrEqual(1);
  expect(majorGroupLayout.curveMarks.qc).toBeGreaterThan(0);
  expect(majorGroupLayout.curveMarks.fs).toBeGreaterThan(0);
  expect(majorGroupLayout.curveMarks.u2).toBeGreaterThan(0);
  if (process101EvidenceEnabled) {
    expect(majorGroupLayout.selectedBandSvgHeight).toBeCloseTo(1.38, 1);
    expect(majorGroupLayout.selectedLocatorStrokeWidth).toBe(4);
  }
  await page.getByRole('button', { name: '关闭大类合并' }).click();
  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toBeVisible();
  await page.getByTestId('layer-cleanup-thin-method').click();
  await expect(page.getByTestId('thin-layer-guide-dialog')).toBeVisible();
  const thinLayerAnalysisStartedAt = Date.now();
  await page.getByTestId('thin-layer-start-review').click();
  await expect.poll(async () => await page.getByTestId('thin-layer-guide-review-step').count() + await page.getByTestId('thin-layer-guide-preview-step').count(), { timeout: 3_000 }).toBe(1);
  const thinLayerAnalysisMs = Date.now() - thinLayerAnalysisStartedAt;
  expect(thinLayerAnalysisMs).toBeLessThan(1_500);
  let thinLayerCandidateCount = 0;
  let thinLayerPreservePreview = '';
  const realReview = page.getByTestId('thin-layer-guide-review-step');
  if (await realReview.count()) {
    const heading = await realReview.locator('.thin-layer-review-heading span').innerText();
    thinLayerCandidateCount = Number(heading.match(/\/\s*(\d+)/)?.[1] ?? 0);
    const reviewStartedAt = Date.now();
    for (let index = 0; index < thinLayerCandidateCount; index += 1) {
      await page.getByTestId('thin-layer-decision-preserve').click();
      if (index < thinLayerCandidateCount - 1) await page.getByTestId('thin-layer-next-candidate').click();
      else await page.getByTestId('thin-layer-open-preview').click();
    }
    await expect(page.getByTestId('thin-layer-guide-preview-step')).toBeVisible();
    thinLayerPreservePreview = await page.getByTestId('thin-layer-guide-preview-step').innerText();
    expect(thinLayerPreservePreview).toContain(`保留薄层\n${thinLayerCandidateCount} 项`);
    expect(Date.now() - reviewStartedAt).toBeLessThan(15_000);
  }
  await page.getByRole('button', { name: '关闭薄层整理' }).click();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  const realLayerCount = await page.getByTestId('stratification-layer-table').locator('button').count();
  expect(realLayerCount).toBeGreaterThan(40);
  await page.getByTestId('stratification-view-overview').click();
  const realOverview = await readDenseStratificationLayout(page);
  expect(realOverview.compactLayerCount).toBeGreaterThan(20);
  expect(realOverview.visibleLayerLabelCount).toBe(0);
  expect(realOverview.sharedBoundaryCount).toBe(realLayerCount - 1);
  expect(realOverview.sharedBoundaryLeftError).toBeLessThanOrEqual(1);
  expect(realOverview.sharedBoundaryRightError).toBeLessThanOrEqual(1);
  expect(realOverview.overlappingLayerLabelPairs).toBe(0);
  expect(realOverview.sharedAxisTopError).toBeLessThanOrEqual(1);
  expect(realOverview.sharedAxisBottomError).toBeLessThanOrEqual(1);
  const middleLayer = Math.ceil(realLayerCount / 2);
  await page.getByTestId(`stratification-layer-row-${middleLayer}`).click();
  await expect(page.getByTestId('stratification-view-focus')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('stratification-selected-layer-callout')).toBeVisible();
  const realFocus = await readDenseStratificationLayout(page);
  expect(realFocus.visibleLayerCount).toBeLessThan(realLayerCount);
  expect(realFocus.overlappingLayerLabelPairs).toBe(0);
  expect(realFocus.curveDepthFromM).toBeCloseTo(realFocus.layerDepthFromM, 2);
  expect(realFocus.curveDepthToM).toBeCloseTo(realFocus.layerDepthToM, 2);
  await page.getByTestId('stratification-view-expanded').click();
  const realExpanded = await readDenseStratificationLayout(page);
  expect(realExpanded.plotHeight).toBeGreaterThan(1_000);
  expect(realExpanded.visibleLayerLabelCount).toBe(0);
  expect(realExpanded.overlappingLayerLabelPairs).toBe(0);
  const sbt = page.getByTestId('jts-sbt-chart');
  await expect(sbt).toBeVisible();
  await expect(page.locator('.jts-sbt-legend span')).toHaveCount(9);
  await expect(page.getByTestId('jts-sbt-region-label')).toHaveCount(6);
  await expect(page.getByTestId('jts-sbt-region-label')).toHaveText(['Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9']);
  const sbtZoneVisuals = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll<SVGTextElement>('[data-testid="jts-sbt-region-label"]')).map((node) => ({
      zone: Number(node.dataset.zone),
      color: getComputedStyle(node).fill,
      box: node.getBoundingClientRect().toJSON(),
    }));
    const legend = Array.from(document.querySelectorAll<HTMLElement>('.jts-sbt-legend span')).map((node) => ({
      zone: Number(node.dataset.zone),
      color: getComputedStyle(node.querySelector('i')!).backgroundColor,
    }));
    const chart = document.querySelector<SVGElement>('[data-testid="jts-sbt-chart"]')!.getBoundingClientRect();
    return { labels, legend, chart: chart.toJSON() };
  });
  expect(sbtZoneVisuals.labels.map(({ zone }) => zone)).toEqual([4, 5, 6, 7, 8, 9]);
  expect(new Set(sbtZoneVisuals.legend.map(({ color }) => color)).size).toBe(9);
  sbtZoneVisuals.labels.forEach((label) => {
    expect(label.color).toBe(sbtZoneVisuals.legend.find((item) => item.zone === label.zone)?.color);
    expect(label.box.left).toBeGreaterThanOrEqual(sbtZoneVisuals.chart.left);
    expect(label.box.right).toBeLessThanOrEqual(sbtZoneVisuals.chart.right);
    expect(label.box.top).toBeGreaterThanOrEqual(sbtZoneVisuals.chart.top);
    expect(label.box.bottom).toBeLessThanOrEqual(sbtZoneVisuals.chart.bottom);
  });
  if (process106EvidenceEnabled) {
    mkdirSync(process106EvidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const panel = page.getByTestId('jts-sbt-panel');
      await panel.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const chart = document.querySelector<SVGElement>('[data-testid="jts-sbt-chart"]')!;
        const panelNode = document.querySelector<HTMLElement>('[data-testid="jts-sbt-panel"]')!;
        const chartBox = chart.getBoundingClientRect();
        const labels = Array.from(document.querySelectorAll<SVGTextElement>('[data-testid="jts-sbt-region-label"]'));
        const legend = Array.from(document.querySelectorAll<HTMLElement>('.jts-sbt-legend span'));
        const legendColors = new Map(legend.map((node) => [Number(node.dataset.zone), getComputedStyle(node.querySelector('i')!).backgroundColor]));
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          panelOverflowX: panelNode.scrollWidth - panelNode.clientWidth,
          labelCount: labels.length,
          legendColorCount: new Set(legendColors.values()).size,
          selectedPointCount: document.querySelectorAll('.jts-sbt-selected-point').length,
          labelsInsideChart: labels.every((node) => {
            const box = node.getBoundingClientRect();
            return box.left >= chartBox.left && box.right <= chartBox.right && box.top >= chartBox.top && box.bottom <= chartBox.bottom;
          }),
          labelColorsMatchLegend: labels.every((node) => getComputedStyle(node).fill === legendColors.get(Number(node.dataset.zone))),
          axisLabels: Array.from(document.querySelectorAll('.jts-sbt-axis-label')).map((node) => node.textContent),
        };
      });
      expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
      expect(layout.panelOverflowX).toBeLessThanOrEqual(1);
      expect(layout.labelCount).toBe(6);
      expect(layout.legendColorCount).toBe(9);
      expect(layout.labelsInsideChart).toBe(true);
      expect(layout.labelColorsMatchLegend).toBe(true);
      expect(layout.axisLabels).toEqual(['Fr (%) · log10', 'Qtn* · log10']);
      process106Layouts.push(layout);
      await panel.screenshot({ path: path.join(process106EvidenceDirectory, `yingkou-sbt-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  const sbtCounts = await sbt.evaluate((element) => ({
    total: Number(element.getAttribute('data-total-rows')),
    valid: Number(element.getAttribute('data-valid-points')),
    inDomain: Number(element.getAttribute('data-in-domain-points')),
    displayed: Number(element.getAttribute('data-displayed-points')),
    invalid: Number(element.getAttribute('data-invalid-points')),
    outOfRange: Number(element.getAttribute('data-out-of-range-points')),
  }));
  expect(sbtCounts.total).toBe(sbtCounts.valid + sbtCounts.invalid);
  expect(sbtCounts.valid).toBe(sbtCounts.inDomain + sbtCounts.outOfRange);
  expect(sbtCounts.displayed).toBeLessThanOrEqual(sbtCounts.inDomain);
  expect(sbtCounts.displayed).toBeLessThanOrEqual(900);
  await expect(page.getByTestId('jts-sbt-selected-summary')).toContainText('当前层');
  const selectedSummaryBefore = await page.getByTestId('jts-sbt-selected-summary').innerText();
  const selectedPointsBefore = await page.locator('.jts-sbt-selected-point').evaluateAll((nodes) => nodes.map((node) => `${node.getAttribute('cx')},${node.getAttribute('cy')}`).join('|'));
  await page.getByTestId(`stratification-layer-row-${Math.min(realLayerCount, middleLayer + 1)}`).click();
  await expect.poll(() => page.getByTestId('jts-sbt-selected-summary').innerText()).not.toBe(selectedSummaryBefore);
  const selectedPointsAfter = await page.locator('.jts-sbt-selected-point').evaluateAll((nodes) => nodes.map((node) => `${node.getAttribute('cx')},${node.getAttribute('cy')}`).join('|'));
  expect(selectedPointsAfter).not.toBe(selectedPointsBefore);
  await page.getByTestId(`stratification-layer-row-${middleLayer}`).click();
  if (process.env.PROCESS102_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(process102EvidenceDirectory, { recursive: true });
    await page.getByTestId('stratification-view-overview').click();
    const process102Layouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByTestId('jts-sbt-panel').scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => {
        const documentNode = document.querySelector<HTMLElement>('[data-testid="stratification-document"]');
        const plotNode = document.querySelector<HTMLElement>('[data-testid="stratification-shared-plot"]');
        const sbtNode = document.querySelector<HTMLElement>('[data-testid="jts-sbt-panel"]');
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          workbenchOverflowX: documentNode ? documentNode.scrollWidth - documentNode.clientWidth : Number.POSITIVE_INFINITY,
          plotWidth: plotNode?.getBoundingClientRect().width ?? 0,
          sbtWidth: sbtNode?.getBoundingClientRect().width ?? 0,
          visibleBoundaryCount: document.querySelectorAll('.shared-boundary-line').length,
          duplicateBoundaryStrokeCount: Array.from(document.querySelectorAll('.editable-boundary-marker')).filter((node) => Number.parseFloat(getComputedStyle(node).borderTopWidth) > 0).length,
          overviewLayerTextCount: document.querySelectorAll('.editable-layer-block.has-label strong, [data-testid="stratification-selected-layer-callout"]').length,
          domNodeCount: documentNode?.querySelectorAll('*').length ?? 0,
        };
      });
      expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
      expect(layout.workbenchOverflowX).toBeLessThanOrEqual(1);
      expect(layout.duplicateBoundaryStrokeCount).toBe(0);
      expect(layout.overviewLayerTextCount).toBe(0);
      expect(layout.domNodeCount).toBeLessThan(2_500);
      process102Layouts.push(layout);
      await page.screenshot({ path: path.join(process102EvidenceDirectory, `yingkou-overview-sbt-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
    await page.getByTestId('stratification-view-focus').click();
    const process102FocusLayouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByTestId('stratification-shared-plot').scrollIntoViewIfNeeded();
      const focusLayout = await page.evaluate(() => {
        const callout = document.querySelector<HTMLElement>('[data-testid="stratification-selected-layer-callout"]');
        const soil = callout?.querySelector<HTMLElement>('em');
        return {
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          layerTextColor: soil ? getComputedStyle(soil).color : '',
          visibleLayerTextCount: document.querySelectorAll('.editable-layer-block.has-label strong, [data-testid="stratification-selected-layer-callout"]').length,
        };
      });
      expect(focusLayout.documentOverflowX).toBeLessThanOrEqual(1);
      expect(focusLayout.layerTextColor).toBe('rgb(17, 24, 39)');
      expect(focusLayout.visibleLayerTextCount).toBeGreaterThan(0);
      process102FocusLayouts.push({ viewport, ...focusLayout });
      await page.screenshot({ path: path.join(process102EvidenceDirectory, `yingkou-focus-layer-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
    await page.getByTestId('stratification-view-overview').click();
    writeFileSync(path.join(process102EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      flow: 'Process102',
      source: 'CPT09数据.xlsx',
      sourceRows: 4282,
      layerCount: realLayerCount,
      overview: realOverview,
      focus: realFocus,
      expanded: realExpanded,
      sbt: sbtCounts,
      layouts: process102Layouts,
      focusLayouts: process102FocusLayouts,
      browserErrors: errors,
    }, null, 2), 'utf8');
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  const switchPerformance = await page.evaluate(async () => {
    const longTasks: number[] = [];
    const observer = typeof PerformanceObserver === 'undefined' ? null : new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => longTasks.push(entry.duration));
    });
    try { observer?.observe({ type: 'longtask' }); } catch { /* unsupported browser entry type */ }
    const samples: number[] = [];
    const modes = ['overview', 'focus', 'expanded', 'overview', 'focus', 'expanded', 'overview', 'focus', 'expanded', 'overview'];
    for (const mode of modes) {
      const button = document.querySelector<HTMLButtonElement>(`[data-testid="stratification-view-${mode}"]`);
      if (!button) throw new Error(`Missing ${mode} view control.`);
      const startedAt = performance.now();
      button.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      samples.push(performance.now() - startedAt);
    }
    observer?.disconnect();
    const sorted = [...samples].sort((left, right) => left - right);
    return {
      samplesMs: samples,
      p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      maxMs: sorted.at(-1) ?? 0,
      longTaskCount: longTasks.length,
      longTaskMaxMs: longTasks.length ? Math.max(...longTasks) : 0,
      workbenchDomNodeCount: document.querySelector('[data-testid="stratification-document"]')?.querySelectorAll('*').length ?? 0,
    };
  });
  expect(switchPerformance.p95Ms).toBeLessThan(500);
  expect(switchPerformance.longTaskMaxMs).toBeLessThan(250);
  expect(switchPerformance.workbenchDomNodeCount).toBeLessThan(2_500);
  if (process.env.PROCESS102_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1') {
    const receiptPath = path.join(process102EvidenceDirectory, 'browser-check.json');
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>;
    writeFileSync(receiptPath, JSON.stringify({ ...receipt, switchPerformance }, null, 2), 'utf8');
  }
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(process093EvidenceDirectory, { recursive: true });
    for (const mode of ['overview', 'focus', 'expanded'] as const) {
      await page.getByTestId(`stratification-view-${mode}`).click();
      for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
        await page.setViewportSize(viewport);
        await page.getByTestId('stratification-shared-plot').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(process093EvidenceDirectory, `real-yingkou-${mode}-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
      }
    }
  }
  await page.getByTestId('stratification-view-overview').click();
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `generation-complete-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  const finalOutcome = 'pending-review-candidate';
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `recovery-${finalOutcome}-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
    writeFileSync(path.join(evidenceDirectory, 'flow-run.json'), JSON.stringify({ source: 'CPT09数据.xlsx', rowCount: 4282, errors, layouts, runningObserved, ariaBusyObserved, thinLayerAnalysisMs, thinLayerCandidateCount, thinLayerPreservePreview, denseStratificationView: { realLayerCount, overview: realOverview, focus: realFocus, expanded: realExpanded, switchPerformance }, recovery: { action: 'exclude-invalid-row-in-check', ignoredRows: 1, finalOutcome } }, null, 2), 'utf8');
  }
  majorGroupEvidenceDirectories.forEach((directory) => writeFileSync(path.join(directory, 'browser-check.json'), JSON.stringify({ source: 'CPT09数据.xlsx', rowCount: 4282, majorGroupMergeMs, majorGroupPreviewText, majorGroupLayout, originalSchemePreserved: true, errors }, null, 2), 'utf8'));
  if (process106EvidenceEnabled) writeFileSync(path.join(process106EvidenceDirectory, 'browser-check.json'), JSON.stringify({
    process: 'Process106',
    source: 'CPT09数据.xlsx',
    sourceRows: 4282,
    zoneLabels: [4, 5, 6, 7, 8, 9],
    zoneColors: sbtZoneVisuals.legend,
    sbtCounts,
    layouts: process106Layouts,
    classificationRunUnchangedByChart: true,
    originalMeasurementsUnchangedByChart: true,
    browserErrors: errors,
  }, null, 2), 'utf8');
  expect(errors).toEqual([]);
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
