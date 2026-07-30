import { completePreparationGuide } from './fixtures/guidedPreparation';
import { completeThinLayerGuide, confirmPendingStratificationLayers } from './stratification-guide-helpers';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'stratification-workflow-ui');
const process092EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process092-thin-layer-guide');
const process093EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process093-dense-stratification-view');
const process103EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process103-stratification-confirmation-gate');
const process103EvidenceEnabled = process.env.PROCESS103_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process104EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process104-boundary-split');
const process104EvidenceEnabled = process.env.PROCESS104_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process105EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process105-real-layer-seams');
const process105EvidenceEnabled = process.env.PROCESS105_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process133EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process133-professional-recovery');
const process133EvidenceEnabled = process.env.PROCESS133_EVIDENCE === '1';
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
  const layout = await readLayout(page);
  expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
  expect(layout.workbenchInsideViewport).toBe(true);
});

test('FLOW-F-01 creates, edits, commits, and hands off a point-bound stratification scheme', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `分层主流程 ${seed}`;
  const pointName = `F1-${seed}`;
  const csv = standardCsv(pointName, [0.5, 2, 4, 6]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-01-${seed}.csv`, csv);
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'deny');

  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  await expect(page.getByTestId('stratification-first-look')).toContainText('请从右侧逐层确认土类');

  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-add-boundary').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByTestId('stratification-boundary-1').click();
  await page.getByTestId('stratification-boundary-depth').fill('2.500');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await expect(page.getByTestId('stratification-boundary-1')).toContainText('2.50 m');

  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-name').fill('上部砂土层');
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
  await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption('sand');
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-layer-name').fill('下部黏性土层');
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
  await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption('clay');
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);
  await expect(page.getByTestId('stratification-first-look')).toContainText('分层方案已就绪');
  await expect(page.getByTestId('stratification-primary-action')).toHaveText('进入参数解译');
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'allow');
  const layouts = await capture(page, 'flow-f-01-current-scheme');
  const state = await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({
    activeRoute: 'stratification',
    artifactStatus: 'current',
    schemeCount: 1,
    currentScheme: { layerCount: 2, boundaryCount: 1, status: 'current' },
  });
  void state;
  const persisted = await readStratificationState(page, projectName);
  expect(persisted.artifactInput).toEqual(persisted.currentScheme?.inputWithoutCheckRun);
  expect(persisted.sourceCheckRunId).toBe(persisted.currentScheme?.checkRunId);
  const invalidSave = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const invalid = structuredClone(loaded.manifest);
    const project = invalid.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const current = point?.stratificationWorkspace?.schemes.find((scheme) => scheme.schemeId === point.stratificationWorkspace?.currentSchemeId);
    if (!current?.boundaries[0]) throw new Error('Current boundary not found.');
    current.boundaries[0].lowerLayerId = 'missing-layer';
    return database.saveWorkspaceV2(invalid, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  }, projectName);
  expect(invalidSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  const invalidSnapshotSave = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const invalid = structuredClone(loaded.manifest);
    const project = invalid.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const snapshot = point?.stratificationWorkspace?.revisions?.[0]?.snapshot;
    if (!snapshot?.boundaries[0]) throw new Error('Committed boundary snapshot not found.');
    snapshot.boundaries[0].lowerLayerId = 'missing-snapshot-layer';
    return database.saveWorkspaceV2(invalid, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  }, projectName);
  expect(invalidSnapshotSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  const invalidLineageSave = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const invalid = structuredClone(loaded.manifest);
    const project = invalid.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const current = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId);
    if (!point || !current) throw new Error('Current stratification source not found.');
    point.parameterState = {
      status: 'current',
      input: {
        pointId: current.input.pointId,
        draftId: current.input.draftId,
        batchId: current.input.batchId,
        revisions: { ...current.input.revisions },
      },
      sourceCheckRunId: current.input.checkRunId,
      sourceStratificationSchemeId: 'missing-source-scheme',
    };
    return database.saveWorkspaceV2(invalid, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  }, projectName);
  expect(invalidLineageSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  const staleRevisionLineageSave = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const invalid = structuredClone(loaded.manifest);
    const project = invalid.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const current = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId);
    const revisionV1 = workspace?.revisions?.find((revision) => revision.schemeId === current?.schemeId && revision.version === current?.version);
    if (!point || !workspace || !current || !revisionV1) throw new Error('Current stratification revision not found.');
    current.version = 2;
    const revisionV2 = {
      ...structuredClone(revisionV1),
      revisionId: `${current.schemeId}:synthetic-v2`,
      version: 2,
      snapshot: { ...structuredClone(revisionV1.snapshot), version: 2 },
    };
    workspace.revisions = [...(workspace.revisions ?? []), revisionV2];
    point.stratificationState.sourceStratificationRevisionId = revisionV2.revisionId;
    point.parameterState = {
      status: 'current',
      input: {
        pointId: current.input.pointId,
        draftId: current.input.draftId,
        batchId: current.input.batchId,
        revisions: { ...current.input.revisions },
      },
      sourceCheckRunId: current.input.checkRunId,
      sourceStratificationSchemeId: current.schemeId,
      sourceStratificationRevisionId: revisionV1.revisionId,
    };
    return database.saveWorkspaceV2(invalid, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  }, projectName);
  expect(staleRevisionLineageSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });

  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await writeEvidence('flow-f-01', csv, { seed, steps: ['prepare-checked-point', 'create-base-scheme', 'add-and-move-boundary', 'rename-layers', 'commit', 'reject-invalid-live-structure', 'reject-invalid-revision-snapshot', 'reject-invalid-downstream-scheme-lineage', 'reject-stale-downstream-revision-lineage', 'enter-parameters'], persisted, layouts, invalidBundleGuards: { live: invalidSave, snapshot: invalidSnapshotSave, schemeLineage: invalidLineageSave, revisionLineage: staleRevisionLineageSave }, browserErrors: browserErrors.get(page) ?? [] });
});

test('PROCESS092 aligns the full-depth evidence and applies a safe thin-layer plan as one reversible edit', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `薄层整理 ${seed}`;
  const pointName = `TL-${seed}`;
  await prepareCheckedPoint(page, testInfo, projectName, `process092-${seed}.csv`, thinLayerCsv(pointName));

  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-add-boundary').click();
  await page.getByTestId('stratification-boundary-1').click();
  await page.getByTestId('stratification-boundary-depth').fill('4.00');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-add-boundary').click();
  await page.getByTestId('stratification-boundary-2').click();
  await page.getByTestId('stratification-boundary-depth').fill('4.30');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  for (let index = 1; index <= 3; index += 1) {
    await page.getByTestId(`stratification-layer-row-${index}`).click();
    await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption('sand');
  }

  const alignment = await page.evaluate(() => {
    const svg = document.querySelector<SVGElement>('[data-testid="stratification-qc-curve"] .jts-linked-track[data-channel="qc"] svg')?.getBoundingClientRect();
    const column = document.querySelector<HTMLElement>('[data-testid="stratification-layer-track"] .editable-layer-column')?.getBoundingClientRect();
    if (!svg || !column) return null;
    return { top: Math.abs(svg.top - (column.top + 1)), bottom: Math.abs(svg.bottom - (column.bottom - 1)), svgHeight: svg.height, columnInnerHeight: column.height - 2 };
  });
  expect(alignment).not.toBeNull();
  expect(alignment!.top).toBeLessThanOrEqual(1);
  expect(alignment!.bottom).toBeLessThanOrEqual(1);
  expect(Math.abs(alignment!.svgHeight - alignment!.columnInnerHeight)).toBeLessThanOrEqual(1);
  const workbenchLayouts = await captureProcess092(page, 'aligned-workbench');

  const originalRowCount = await currentRawRowCount(page);
  await expect.poll(async () => (await readStratificationState(page, projectName)).editSession?.undoCount).toBe(7);
  const stateBeforeCancel = await readStratificationState(page, projectName);
  await page.getByTestId('stratification-open-thin-layer-guide').click();
  await page.getByTestId('layer-cleanup-thin-method').click();
  await expect(page.getByTestId('thin-layer-threshold-input')).toHaveValue('0.50');
  const thresholdLayouts = await captureProcess092(page, 'threshold');
  await page.getByTestId('thin-layer-threshold-input').fill('0');
  await expect(page.getByTestId('thin-layer-start-review')).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('请输入大于 0 的厚度');
  await page.getByTestId('thin-layer-threshold-input').fill('0.50');
  await page.getByTestId('thin-layer-start-review').click();
  await expect(page.getByTestId('thin-layer-guide-review-step')).toContainText('已预选系统建议（待确认）');
  await expect(page.getByTestId('thin-layer-decision-merge-surrounding')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭薄层整理' }).click();
  await expect(page.getByTestId('thin-layer-guide-dialog')).toHaveCount(0);
  const stateAfterCancel = await readStratificationState(page, projectName);
  expect(stateAfterCancel.workingScheme?.layerCount).toBe(stateBeforeCancel.workingScheme?.layerCount);
  expect(stateAfterCancel.editSession?.undoCount).toBe(stateBeforeCancel.editSession?.undoCount);
  expect(await currentRawRowCount(page)).toBe(originalRowCount);

  await page.getByTestId('stratification-open-thin-layer-guide').click();
  await page.getByTestId('layer-cleanup-thin-method').click();
  await page.getByTestId('thin-layer-start-review').click();
  await expect(page.getByTestId('thin-layer-guide-review-step')).toContainText('已预选系统建议（待确认）');
  const reviewLayouts = await captureProcess092(page, 'review-safe-suggestion');
  await page.getByTestId('thin-layer-open-preview').click();
  await expect(page.getByTestId('thin-layer-guide-preview-step')).toContainText('预计整理后1 层');
  const previewLayouts = await captureProcess092(page, 'preview');
  await page.getByTestId('thin-layer-apply-plan').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  expect(await currentRawRowCount(page)).toBe(originalRowCount);

  await page.getByTestId('stratification-undo').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(3);
  await page.getByTestId('stratification-redo').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ workingScheme: { layerCount: 1, thinLayerCleanupCount: 1 }, editSession: { dirty: true, redoCount: 0 } });
  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  expect(await currentRawRowCount(page)).toBe(originalRowCount);
  const persisted = await readStratificationState(page, projectName);
  expect(persisted.workingScheme?.thinLayerCleanupCount).toBe(1);
  await writeProcess092Evidence('browser-check.json', {
    flow: 'PROCESS092',
    sourceRowsBefore: originalRowCount,
    sourceRowsAfter: await currentRawRowCount(page),
    alignment,
    workbenchLayouts,
    thresholdLayouts,
    reviewLayouts,
    previewLayouts,
    persisted,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

test('PROCESS100 merges adjacent layers by major soil group and preserves detailed composition', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `大类合并 ${seed}`;
  const pointName = `MG-${seed}`;
  await prepareCheckedPoint(page, testInfo, projectName, `process100-${seed}.csv`, layerSimplificationCsv(pointName));

  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await openAdvancedStratificationTools(page);
  for (const [index, depthM] of [2, 4, 6, 8].entries()) {
    await page.getByTestId(`stratification-layer-row-${index + 1}`).click();
    await page.getByTestId('stratification-add-boundary').click();
    await page.getByTestId(`stratification-boundary-${index + 1}`).click();
    await page.getByTestId('stratification-boundary-depth').fill(depthM.toFixed(2));
    await page.getByTestId('stratification-apply-boundary-depth').click();
  }
  const soils = [
    { group: 'sand', detailed: '粉砂' },
    { group: 'sand', detailed: '细砂' },
    { group: 'mixed', detailed: '粉土' },
    { group: 'clay', detailed: '黏土' },
    { group: 'clay', detailed: '淤泥' },
  ];
  for (let index = 1; index <= soils.length; index += 1) {
    const layerRow = page.getByTestId(`stratification-layer-row-${index}`);
    await layerRow.click();
    await expect(layerRow).toHaveClass(/selected/);
    const soilGroup = page.getByTestId('stratification-layer-tool').getByLabel('土类');
    await soilGroup.selectOption(soils[index - 1].group);
    await expect(soilGroup).toHaveValue(soils[index - 1].group);
    await page.getByTestId('stratification-layer-detailed-soil').selectOption(soils[index - 1].detailed);
  }
  await page.getByTestId('stratification-boundary-4').click();
  await page.getByTestId('stratification-boundary-tool').getByLabel('按大类合并时保留此边界').check();

  const originalRows = await currentRawRowCount(page);
  await page.getByTestId('stratification-open-thin-layer-guide').click();
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toContainText('按土类大类合并');
  await expect(page.getByTestId('layer-cleanup-method-dialog')).toContainText('按薄层厚度筛选');
  await expect(page.getByTestId('layer-cleanup-method-dialog')).not.toContainText('目标层数');
  await page.getByTestId('layer-cleanup-major-group-method').click();
  await expect(page.getByTestId('major-group-preview-step')).toBeVisible();
  await expect(page.getByTestId('major-group-planned-count')).toHaveText('4 层');
  await expect(page.getByTestId('major-group-result-list')).toContainText('砂性土（组成：粉砂、细砂）');
  await expect(page.getByTestId('major-group-result-list')).toContainText('混合土（组成：粉土）');
  await expect(page.getByTestId('major-group-result-list')).toContainText('黏性土（组成：黏土）');
  await expect(page.getByTestId('major-group-result-list')).toContainText('黏性土（组成：淤泥）');
  await expect(page.getByTestId('major-group-protected')).toContainText('工程师标记为保留');
  await expect(page.getByTestId('major-group-result-1')).toContainText('曲线差异提示');
  await page.getByTestId('major-group-result-1').click();
  await page.getByTestId('major-group-review-reasons').locator('summary').click();
  await expect(page.getByTestId('major-group-review-reasons')).toContainText('曲线差异提示（规则阈值）');
  await expect(page.getByTestId('major-group-review-reasons')).toContainText('不是正式工程判据');
  await page.getByTestId('major-group-result-4').click();
  await expect(page.getByText('当前结果层').locator('..')).toContainText('黏性土（组成：淤泥）');
  await expect(page.getByTestId('major-group-preview-step')).not.toContainText('建议目标');
  await expect(page.getByTestId('major-group-preview-step').locator('.jts-linked-evidence')).toBeVisible();
  await page.getByTestId('major-group-apply-plan').click();

  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(4);
  await expect(page.getByTestId('stratification-layer-table')).toContainText('砂性土（组成：粉砂、细砂）');
  await expect(page.getByTestId('stratification-layer-table')).toContainText('黏性土（组成：黏土）');
  await expect(page.getByTestId('stratification-layer-table')).toContainText('黏性土（组成：淤泥）');
  expect(await currentRawRowCount(page)).toBe(originalRows);
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({
    workingScheme: { layerCount: 4, layerSimplificationCount: 1, reviewReasonKinds: ['curve-difference'] },
  });
  await expect(page.getByTestId('stratification-first-look')).toContainText('1 个问题待处理');
  await expect(page.getByTestId('stratification-primary-action')).toHaveText('处理 1 个待确认层');
  const process103ProblemLayouts: Array<Record<string, unknown>> = [];
  if (process103EvidenceEnabled) {
    mkdirSync(process103EvidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.getByTestId('stratification-first-look').evaluate((node) => ({
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        text: (node as HTMLElement).innerText,
      }));
      process103ProblemLayouts.push(layout);
      await page.screenshot({ path: join(process103EvidenceDirectory, `problem-to-locate-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-undo').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(5);
  await page.getByTestId('stratification-redo').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(4);
  await page.reload();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(4);
  await expect(page.getByTestId('stratification-layer-table')).toContainText('砂性土（组成：粉砂、细砂）');
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({
    workingScheme: { layerCount: 4, layerSimplificationCount: 1, reviewReasonKinds: ['curve-difference'] },
  });

  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('stratification-inline-select-soil')).toBeVisible();
  await page.getByTestId('stratification-inline-select-soil').click();
  await page.getByTestId('stratification-inline-soil-select').selectOption('粉砂');
  await page.getByTestId('stratification-inline-save-soil').click();
  await expect(page.getByTestId('stratification-save')).toBeVisible();
  await openAdvancedStratificationTools(page);
  for (const layerIndex of [1, 3]) {
    const layerRow = page.getByTestId(`stratification-layer-row-${layerIndex}`);
    await layerRow.click();
    await expect(layerRow).toHaveClass(/selected/);
    const nameInput = page.getByTestId('stratification-layer-name');
    await nameInput.fill('重复土类描述');
    await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
    await expect.poll(async () => ((await readStratificationState(page, projectName)).workingScheme?.names ?? []).filter((name) => name === '重复土类描述').length).toBe(layerIndex === 1 ? 1 : 2);
  }
  await expect(page.getByTestId('stratification-first-look')).toContainText('4 层已确认');
  await expect(page.getByTestId('stratification-first-look')).not.toContainText('土层名称重复');
  await page.getByTestId('stratification-save').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await expect(page.getByTestId('stratification-finalize-problem-count')).toHaveText('0');
  await expect(page.getByTestId('stratification-finalize-problems')).toHaveCount(0);
  await expect(page.getByTestId('stratification-final-layer-preview').locator('tbody tr td:first-child strong')).toHaveText(['L1', 'L2', 'L3', 'L4']);
  const process103FinalLayouts: Array<Record<string, unknown>> = [];
  if (process103EvidenceEnabled) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.getByTestId('stratification-finalize-guide-dialog').evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          dialogFits: rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
          problemCount: document.querySelector('[data-testid="stratification-finalize-problem-count"]')?.textContent ?? '',
          layerIds: Array.from(node.querySelectorAll('tbody tr td:first-child strong')).map((item) => item.textContent),
        };
      });
      expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
      expect(layout.dialogFits).toBe(true);
      expect(layout.problemCount).toBe('0');
      process103FinalLayouts.push(layout);
      await page.screenshot({ path: join(process103EvidenceDirectory, `duplicate-descriptions-ready-${viewport.width}x${viewport.height}.png`), animations: 'disabled', fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-guide-generate-revision').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toHaveCount(0);
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({
    editSession: null,
    currentScheme: { status: 'current', layerCount: 4 },
  });
  const committedNames = (await readStratificationState(page, projectName)).currentScheme?.layers.map((layer) => layer.name) ?? [];
  expect(committedNames.filter((name) => name === '重复土类描述')).toHaveLength(2);
  if (process103EvidenceEnabled) writeFileSync(join(process103EvidenceDirectory, 'browser-check.json'), JSON.stringify({
    flow: 'Process103',
    problemLayouts: process103ProblemLayouts,
    finalLayouts: process103FinalLayouts,
    committedDuplicateDescriptionCount: committedNames.filter((name) => name === '重复土类描述').length,
    currentScheme: (await readStratificationState(page, projectName)).currentScheme,
    browserErrors: browserErrors.get(page) ?? [],
  }, null, 2), 'utf8');
});

test('PROCESS093 keeps 43 layers readable through overview, focus, and expanded shared-axis views', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const seed = randomSeed();
  const projectName = `密集分层查看 ${seed}`;
  const pointName = `DV-${seed}`;
  const csv = standardCsv(pointName, [0.01, ...Array.from({ length: 60 }, (_, index) => index + 1)]);
  await prepareCheckedPoint(page, testInfo, projectName, `process093-${seed}.csv`, csv);
  const rawRowCount = await currentRawRowCount(page);

  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('jts-sbt-panel')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByTestId('jts-sbt-panel')).toContainText('先在右侧运行 JTS 分类');
  await expect(page.getByTestId('jts-sbt-chart')).toHaveCount(0);
  await page.getByTestId('stratification-view-focus').click();
  const thickLayerFocus = await readDenseViewLayout(page);
  expect(thickLayerFocus.depthSpanM).toBeCloseTo(59.99, 2);
  await page.getByTestId('stratification-view-overview').click();
  const seeded = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/stratification/stratificationDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    if (!point?.stratificationWorkspace?.editSession) throw new Error('Working stratification scheme not found.');
    let workspace = point.stratificationWorkspace;
    const scheme = workspace.editSession.working;
    const denseBoundaries = [0.15, ...Array.from({ length: 41 }, (_, index) => 0.15 + (scheme.depthToM - 0.15) * (index + 1) / 42)];
    for (const depthM of denseBoundaries) {
      const result = domain.applyStratificationCommand(workspace, { kind: 'add-boundary', depthM });
      if (!result.ok) throw new Error(result.problem);
      workspace = result.workspace;
    }
    point.stratificationWorkspace = workspace;
    return database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  });
  expect(seeded).toMatchObject({ ok: true });
  await page.reload();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(43);

  await page.getByTestId('stratification-view-overview').click();
  await expect(page.getByTestId('stratification-view-overview')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('stratification-layer-track')).toHaveAttribute('data-depth-from', '0.01');
  await expect(page.getByTestId('stratification-layer-track')).toHaveAttribute('data-depth-to', '60');
  const overview = await readDenseViewLayout(page);
  expect(overview.layerCount).toBe(43);
  expect(overview.compactLayerCount).toBeGreaterThan(25);
  expect(overview.visibleLayerLabelCount).toBe(0);
  expect(overview.sharedBoundaryCount).toBe(42);
  expect(overview.sharedBoundaryLeftDelta).toBeGreaterThanOrEqual(-1);
  expect(overview.sharedBoundaryLeftDelta).toBeLessThanOrEqual(1);
  expect(overview.sharedBoundaryRightError).toBeLessThanOrEqual(1);
  expect(overview.overlappingLayerLabelPairs).toBe(0);
  expect(overview.sharedAxisTopError).toBeLessThanOrEqual(1);
  expect(overview.sharedAxisBottomError).toBeLessThanOrEqual(1);
  expect(overview.selectedCalloutInsideColumn).toBe(false);
  expect(overview.selectedBandSvgHeight).toBeCloseTo(1.4, 1);
  expect(overview.selectedLocatorStrokeWidth).toBe(4);
  expect(overview.selectedLocatorY).toBeGreaterThanOrEqual(0);
  expect(overview.selectedLocatorY).toBeLessThanOrEqual(600);
  const overviewLayouts = await captureProcess093(page, 'overview-43-layers');

  await page.getByTestId('stratification-layer-row-30').click();
  await expect(page.getByTestId('stratification-view-focus')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('stratification-selected-layer-callout')).toContainText('L30');
  const focus = await readDenseViewLayout(page);
  expect(focus.depthSpanM).toBeGreaterThanOrEqual(5.99);
  expect(focus.depthSpanM).toBeLessThan(9);
  expect(focus.visibleLayerCount).toBeLessThan(43);
  expect(focus.overlappingLayerLabelPairs).toBe(0);
  expect(focus.visibleLayerTextCount).toBeGreaterThan(0);
  expect(focus.sharedAxisTopError).toBeLessThanOrEqual(1);
  expect(focus.sharedAxisBottomError).toBeLessThanOrEqual(1);
  expect(focus.curveDepthFromM).toBeCloseTo(focus.depthFromM, 2);
  expect(focus.curveDepthToM).toBeCloseTo(focus.depthToM, 2);
  expect(focus.selectedBandTopError).toBeLessThanOrEqual(1);
  expect(focus.selectedBandBottomError).toBeLessThanOrEqual(1);
  const focusLayouts = await captureProcess093(page, 'focus-layer-30');

  const visibleBoundary = page.locator('.editable-boundary-marker').first();
  await expect(visibleBoundary).toHaveAccessibleName(/边界 B\d+，深度 \d+\.\d{2} 米/);
  await visibleBoundary.click();
  const selectedBoundary = page.locator('.editable-boundary-marker.selected');
  await expect(selectedBoundary).toHaveAttribute('aria-pressed', 'true');
  const selectedSharedBoundary = page.locator('.shared-boundary-line.selected');
  const boundaryBefore = Number((await selectedBoundary.locator('span').textContent())?.replace(' m', ''));
  const sharedDepthBefore = Number(await selectedSharedBoundary.getAttribute('data-depth'));
  const boundaryBox = await visibleBoundary.boundingBox();
  if (!boundaryBox) throw new Error('Focused boundary is not visible.');
  await page.mouse.move(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + 12, { steps: 3 });
  await expect.poll(async () => Number(await selectedSharedBoundary.getAttribute('data-depth'))).not.toBe(sharedDepthBefore);
  const previewLineBox = await selectedSharedBoundary.boundingBox();
  expect(previewLineBox).not.toBeNull();
  expect(Math.abs(previewLineBox!.y - (boundaryBox.y + 12))).toBeLessThanOrEqual(2);
  await page.mouse.up();
  const boundaryAfter = Number((await page.locator('.editable-boundary-marker.selected span').textContent())?.replace(' m', ''));
  expect(boundaryAfter).not.toBe(boundaryBefore);
  expect(boundaryAfter).toBeGreaterThan(focus.depthFromM);
  expect(boundaryAfter).toBeLessThan(focus.depthToM);
  await expect.poll(async () => Number(await selectedSharedBoundary.getAttribute('data-depth'))).toBeCloseTo(boundaryAfter, 2);

  const cancelBox = await selectedBoundary.boundingBox();
  if (!cancelBox) throw new Error('Selected boundary is not visible for cancel verification.');
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + 14, { steps: 3 });
  await expect.poll(async () => Number(await selectedSharedBoundary.getAttribute('data-depth'))).not.toBeCloseTo(boundaryAfter, 2);
  await selectedBoundary.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  await expect.poll(async () => Number(await selectedSharedBoundary.getAttribute('data-depth'))).toBeCloseTo(boundaryAfter, 2);
  expect(Number((await selectedBoundary.locator('span').textContent())?.replace(' m', ''))).toBeCloseTo(boundaryAfter, 2);

  await page.getByTestId('stratification-view-expanded').click();
  await expect(page.getByTestId('stratification-view-expanded')).toHaveAttribute('aria-pressed', 'true');
  const expanded = await readDenseViewLayout(page);
  expect(expanded.plotHeight).toBeGreaterThan(1_000);
  expect(expanded.depthSpanM).toBeCloseTo(59.99, 2);
  expect(expanded.overlappingLayerLabelPairs).toBe(0);
  expect(expanded.visibleLayerLabelCount).toBe(0);
  expect(expanded.selectedCalloutInsideColumn).toBe(false);
  expect(expanded.sharedAxisTopError).toBeLessThanOrEqual(1);
  expect(expanded.sharedAxisBottomError).toBeLessThanOrEqual(1);
  const expandedLayouts = await captureProcess093(page, 'expanded-43-layers');

  await page.getByTestId('stratification-layer-row-1').click();
  const firstFocus = await readDenseViewLayout(page);
  expect(firstFocus.depthFromM).toBeCloseTo(0.01, 2);
  await page.getByTestId('stratification-layer-row-43').click();
  const lastFocus = await readDenseViewLayout(page);
  expect(lastFocus.depthToM).toBeCloseTo(60, 2);

  expect(await currentRawRowCount(page)).toBe(rawRowCount);
  await page.reload();
  await expect(page.getByTestId('stratification-view-overview')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(43);
  expect(await currentRawRowCount(page)).toBe(rawRowCount);
  const persisted = await readStratificationState(page, projectName);
  expect(persisted.workingScheme).toMatchObject({ layerCount: 43, boundaryCount: 42 });
  await writeProcess093Evidence('browser-check.json', { flow: 'PROCESS093', rawRowsBefore: rawRowCount, rawRowsAfter: await currentRawRowCount(page), thickLayerFocus, overview, focus, expanded, firstFocus, lastFocus, overviewLayouts, focusLayouts, expandedLayouts, persisted, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F-02 rejects invalid and duplicate boundaries, supports drag, and preserves review notices', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `边界恢复 ${seed}`;
  const pointName = `F2-${seed}`;
  const csv = standardCsv(pointName, [0.5, 2, 4, 6]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-02-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-add-boundary').click();
  await page.getByTestId('stratification-boundary-1').click();

  await page.getByTestId('stratification-boundary-depth').fill('5.980');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await expect(page.getByTestId('stratification-problem-tool')).toContainText('当前原型要求相邻边界至少间隔 0.05 m');
  await expect(page.getByTestId('stratification-boundary-1')).toContainText('3.25 m');
  const invalidLayouts = await capture(page, 'flow-f-02-invalid-boundary');

  await page.getByTestId('stratification-boundary-depth').fill('4.000');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await expect(page.getByTestId('stratification-boundary-1')).toContainText('4.00 m');
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-add-boundary').click();
  await expect(page.getByTestId('stratification-boundary-1')).toContainText('2.25 m');
  await page.getByTestId('stratification-boundary-1').click();
  await page.getByTestId('stratification-boundary-depth').fill('4.000');
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await expect(page.getByTestId('stratification-problem-tool')).toContainText('当前原型要求相邻边界至少间隔 0.05 m');

  const marker = page.getByTestId('stratification-boundary-1');
  const box = await marker.boundingBox();
  if (!box) throw new Error('Boundary marker is not visible.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 26, { steps: 5 });
  await page.mouse.up();
  await expect(marker).not.toContainText('2.25 m');
  for (const [row, soil] of [[1, 'sand'], [2, 'mixed'], [3, 'clay']] as const) {
    await page.getByTestId(`stratification-layer-row-${row}`).click();
    await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption(soil);
  }
  await marker.click();
  await page.getByTestId('stratification-boundary-tool').getByLabel('标记为需复核').check();
  await commitStratificationRevision(page);
  await expect(page.getByTestId('stratification-first-look')).toContainText('方案可进入参数解译');
  await expect(page.getByTestId('stratification-primary-action')).toHaveText('进入参数解译');
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'warn');
  const trackStyles = await page.locator('.editable-layer-block').evaluateAll((elements) => elements.map((element) => ({
    background: getComputedStyle(element).backgroundColor,
    selected: element.classList.contains('selected'),
    boxShadow: getComputedStyle(element).boxShadow,
  })));
  expect(new Set(trackStyles.map((style) => style.background)).size).toBe(3);
  expect(trackStyles.find((style) => style.selected)?.boxShadow).not.toBe('none');
  const layouts = await capture(page, 'flow-f-02-review-boundary');
  const persisted = await readStratificationState(page, projectName);
  expect(persisted.currentScheme).toMatchObject({ layerCount: 3, boundaryCount: 2, status: 'current' });
  expect(persisted.currentScheme?.boundaries.filter((boundary) => boundary.reviewRequired)).toHaveLength(1);
  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-rerun-secondary').click();
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('需要更新');
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'deny');
  const afterCheckRerun = await readStratificationState(page, projectName);
  expect(afterCheckRerun).toMatchObject({ artifactStatus: 'stale', currentScheme: { status: 'stale' } });
  await writeEvidence('flow-f-02', csv, { seed, steps: ['create-scheme', 'reject-out-of-range-boundary', 'apply-valid-depth', 'reject-duplicate-depth', 'drag-boundary', 'assign-sand-mixed-clay-colors', 'mark-review', 'commit-warning-gate', 'rerun-same-input-check', 'prove-scheme-stale'], persisted, afterCheckRerun, trackStyles, invalidLayouts, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F-03 keeps command history coherent across split, rename, undo, redo, merge, and discard', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `编辑会话 ${seed}`;
  const csv = standardCsv(`F3-${seed}`, [1, 3, 5, 9]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-03-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-split-layer').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-name').fill('撤销测试层');
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
  await expect(page.getByTestId('stratification-layer-row-1')).toContainText('撤销测试层');
  await page.getByTestId('stratification-undo').click();
  await expect(page.getByTestId('stratification-layer-row-1')).not.toContainText('撤销测试层');
  await page.getByTestId('stratification-redo').click();
  await expect(page.getByTestId('stratification-layer-row-1')).toContainText('撤销测试层');
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '向上合并' }).click();
  await expect(page.getByTestId('stratification-manual-merge-confirmation')).toContainText('土类继承较厚层');
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByTestId('stratification-manual-merge-confirmation')).toHaveCount(0);
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '向上合并' }).click();
  await expect(page.getByTestId('stratification-manual-merge-confirmation')).toContainText('土类继承较厚层');
  await page.getByTestId('stratification-manual-merge-reason').selectOption('engineering-judgement');
  await page.getByTestId('stratification-manual-merge-confirm').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  await expect.poll(async () => (await readStratificationState(page, projectName)).editSession?.undoCount ?? 0, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  const dirtyState = await readStratificationState(page, projectName);
  expect(dirtyState.editSession).toMatchObject({ dirty: true, isNew: true });
  expect(dirtyState.editSession?.undoCount).toBeGreaterThanOrEqual(2);

  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('stratification-transition-dialog')).toBeVisible();
  await expect(page.getByTestId('stratification-transition-dialog')).toContainText('前往数据导入前处理修改');
  await expect(page.getByTestId('stratification-commit-confirm')).toHaveCount(0);
  await expect(page.getByTestId('stratification-review-before-leave')).toHaveCount(0);
  const transitionLayouts = await capture(page, 'flow-f-03-unsaved-transition');
  await page.getByTestId('stratification-stay').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await page.getByTestId('stratification-discard').click();
  await page.getByTestId('stratification-discard-confirm').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('尚未建立分层方案');
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 0, artifactStatus: 'empty', editSession: null });
  const discarded = await readStratificationState(page, projectName);
  expect(discarded).toMatchObject({ schemeCount: 0, artifactStatus: 'empty', editSession: null });
  const layouts = await capture(page, 'flow-f-03-discarded');
  await writeEvidence('flow-f-03', csv, { seed, steps: ['create-scheme', 'split', 'rename', 'undo', 'redo', 'merge', 'attempt-route-switch-and-stay', 'confirm-discard-new-scheme'], dirtyState, discarded, transitionLayouts, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('PROCESS104 splits the selected layer in place by recorded sources or a constrained depth', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `原位拆分 ${seed}`;
  const csv = standardCsv(`P104-${seed}`, [1, 3, 5, 9]);
  await prepareCheckedPoint(page, testInfo, projectName, `process104-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();

  await page.locator('.layer-structure-actions summary').click();
  await page.getByTestId('stratification-inline-open-split').click();
  await expect(page.getByTestId('stratification-restore-merged-layer')).toBeDisabled();
  await expect(page.getByTestId('stratification-inline-split-form')).toContainText('没有可追溯的合并前结构');
  await page.getByTestId('stratification-split-depth-input').fill('4.00');
  const specifiedDepthLayouts = await captureProcess104(page, 'specified-depth-choice');
  await page.getByTestId('stratification-split-at-depth').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await expect.poll(async () => (await readStratificationState(page, projectName)).workingScheme?.layerCount).toBe(2);

  await page.locator('.layer-structure-button-grid button:not([disabled])').filter({ hasText: '合并' }).first().click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  await page.getByTestId('stratification-inline-open-split').click();
  await expect(page.getByTestId('stratification-restore-merged-layer')).toBeEnabled();
  await expect(page.getByTestId('stratification-restore-merged-layer')).toContainText('恢复为 2 层');
  const restoreLayouts = await captureProcess104(page, 'restore-merge-choice');
  await page.getByTestId('stratification-restore-merged-layer').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await expect(page.getByTestId('stratification-layer-decision-panel')).toContainText('本层土类继承自原土层');
  await expect.poll(async () => (await readStratificationState(page, projectName)).workingScheme?.layerCount).toBe(2);

  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await expect.poll(async () => (await readStratificationState(page, projectName)).workingScheme?.layerCount).toBe(2);
  await page.getByTestId('stratification-boundary-1').click();
  const boundaryMarker = page.getByTestId('stratification-boundary-1');
  const sharedBoundary = page.locator('.shared-boundary-line.selected');
  const boundaryBox = await boundaryMarker.boundingBox();
  if (!boundaryBox) throw new Error('Process104 boundary marker is not visible.');
  const committedDepthBefore = Number(await sharedBoundary.getAttribute('data-depth'));
  await page.mouse.move(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + 12, { steps: 3 });
  await expect.poll(async () => Number(await sharedBoundary.getAttribute('data-depth'))).not.toBe(committedDepthBefore);
  const previewBox = await sharedBoundary.boundingBox();
  if (!previewBox) throw new Error('Process104 shared preview line is not visible.');
  const previewFollowErrorPx = Math.abs(previewBox.y - (boundaryBox.y + 12));
  expect(previewFollowErrorPx).toBeLessThanOrEqual(2);
  await page.mouse.up();
  await expect.poll(async () => Number(await sharedBoundary.getAttribute('data-depth'))).not.toBe(committedDepthBefore);
  if (process104EvidenceEnabled) {
    mkdirSync(process104EvidenceDirectory, { recursive: true });
    writeFileSync(join(process104EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 104,
      specifiedDepthLayouts,
      restoreLayouts,
      restoredLayerCount: 2,
      previewFollowErrorPx,
      consoleAndPageErrors: browserErrors.get(page) ?? [],
    }, null, 2), 'utf8');
  }
});

test('PROCESS105 keeps every dashed line on one real layer seam during drag, cancel, merge, and reload', async ({ page }, testInfo) => {
  const seamTolerancePx = 1.25;
  const seed = randomSeed();
  const projectName = `真实边界 ${seed}`;
  await prepareCheckedPoint(page, testInfo, projectName, `process105-${seed}.csv`, standardCsv(`P105-${seed}`, [1, 3, 5, 9]));
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await page.locator('.layer-structure-actions summary').click();
  await page.getByTestId('stratification-inline-open-split').click();
  await page.getByTestId('stratification-split-depth-input').fill('4.00');
  await page.getByTestId('stratification-split-at-depth').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  const initialGeometry = await readRealBoundaryGeometry(page);
  expect(initialGeometry).toMatchObject({ layerCount: 2, visibleBoundaryCount: 1 });
  expect(initialGeometry.maxSeamErrorPx).toBeLessThanOrEqual(seamTolerancePx);

  await page.getByTestId('stratification-boundary-1').click();
  const marker = page.getByTestId('stratification-boundary-1');
  const markerBox = await marker.boundingBox();
  if (!markerBox) throw new Error('Process105 boundary marker is not visible.');
  const committedDepth = Number(await page.locator('.shared-boundary-line.selected').getAttribute('data-depth'));
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + 20, { steps: 4 });
  const dragGeometry = await readRealBoundaryGeometry(page);
  expect(dragGeometry.visibleBoundaryCount).toBe(1);
  expect(dragGeometry.maxSeamErrorPx).toBeLessThanOrEqual(seamTolerancePx);
  expect(dragGeometry.markerLineErrorPx).toBeLessThanOrEqual(1);
  if (process105EvidenceEnabled) {
    mkdirSync(process105EvidenceDirectory, { recursive: true });
    await page.screenshot({ path: join(process105EvidenceDirectory, 'drag-preview-1440x900.png'), fullPage: true, animations: 'disabled' });
  }
  await marker.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.locator('.shared-boundary-line.selected').getAttribute('data-depth'))).toBeCloseTo(committedDepth, 2);
  const cancelGeometry = await readRealBoundaryGeometry(page);
  expect(cancelGeometry.maxSeamErrorPx).toBeLessThanOrEqual(seamTolerancePx);

  const refreshedMarkerBox = await marker.boundingBox();
  if (!refreshedMarkerBox) throw new Error('Process105 boundary marker is not visible after cancel.');
  await page.mouse.move(refreshedMarkerBox.x + refreshedMarkerBox.width / 2, refreshedMarkerBox.y + 2);
  await page.mouse.down();
  await page.mouse.move(refreshedMarkerBox.x + refreshedMarkerBox.width / 2, refreshedMarkerBox.y + 16, { steps: 3 });
  await page.mouse.up();
  await expect.poll(async () => Number(await page.locator('.shared-boundary-line.selected').getAttribute('data-depth'))).not.toBeCloseTo(committedDepth, 2);
  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  const reloadGeometry = await readRealBoundaryGeometry(page);
  expect(reloadGeometry).toMatchObject({ layerCount: 2, visibleBoundaryCount: 1 });
  expect(reloadGeometry.maxSeamErrorPx).toBeLessThanOrEqual(seamTolerancePx);
  const committedLayouts = await captureProcess105(page, 'committed-real-seams');

  await page.getByTestId('stratification-layer-row-1').click();
  if (!(await page.locator('.layer-structure-actions').getAttribute('open'))) await page.locator('.layer-structure-actions summary').click();
  await page.locator('.layer-structure-button-grid button:not([disabled])').filter({ hasText: '合并' }).first().click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  const mergedGeometry = await readRealBoundaryGeometry(page);
  expect(mergedGeometry).toMatchObject({ layerCount: 1, visibleBoundaryCount: 0 });
  if (process105EvidenceEnabled) {
    await page.screenshot({ path: join(process105EvidenceDirectory, 'merged-no-internal-boundary-1440x900.png'), fullPage: true, animations: 'disabled' });
    writeFileSync(join(process105EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 105,
      initialGeometry,
      dragGeometry,
      cancelGeometry,
      reloadGeometry,
      mergedGeometry,
      committedLayouts,
      consoleAndPageErrors: browserErrors.get(page) ?? [],
    }, null, 2), 'utf8');
  }
});

test('FLOW-F-04 manages multiple schemes without losing the explicit current replacement', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `多方案 ${seed}`;
  const csv = standardCsv(`F4-${seed}`, [0.5, 2.5, 5, 7.5]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-04-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);
  await openNewSchemeChoice(page);
  await expect(page.getByTestId('new-scheme-choice-dialog')).toBeVisible();
  if (process133EvidenceEnabled) {
    mkdirSync(process133EvidenceDirectory, { recursive: true });
    const dialogLayouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await readLayout(page);
      const dialogInsideViewport = await page.getByTestId('new-scheme-choice-dialog').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
      });
      expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
      expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
      expect(dialogInsideViewport).toBe(true);
      dialogLayouts.push({ viewport, layout, dialogInsideViewport });
      await page.screenshot({ path: join(process133EvidenceDirectory, `new-scheme-choice-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    writeFileSync(join(process133EvidenceDirectory, 'stratification-browser-check.json'), JSON.stringify({
      process: 133,
      seed,
      dialogVisible: true,
      options: ['重新选择方法', '复制当前方案', '取消'],
      dialogLayouts,
      browserErrors: browserErrors.get(page) ?? [],
    }, null, 2), 'utf8');
  }
  await page.getByTestId('new-scheme-choice-dialog').getByRole('button', { name: '取消' }).click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 1 });
  await openNewSchemeChoice(page);
  await page.getByTestId('new-scheme-copy-current').click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 2 });
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-scheme-name').fill('对比方案 B');
  await page.getByTestId('stratification-scheme-tool').getByRole('button', { name: '重命名' }).click();
  await page.getByTestId('stratification-add-boundary').click();
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);
  await expect(page.getByTestId('stratification-scheme-list').locator('button').filter({ hasText: '分层方案 1' })).toBeVisible();
  await expect(page.getByTestId('stratification-scheme-list').locator('button').filter({ hasText: '对比方案 B' })).toBeVisible();
  const beforeDeletingB = await readStratificationState(page, projectName);
  const deletedBId = beforeDeletingB.currentScheme?.schemeId;
  const frozenBRevisionIds = beforeDeletingB.revisions
    .filter((revision) => revision.schemeId === deletedBId)
    .map((revision) => revision.revisionId);
  expect(deletedBId).toBeTruthy();
  if (!deletedBId) throw new Error('current scheme B was not persisted');
  expect(frozenBRevisionIds.length).toBeGreaterThan(0);

  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-scheme-tool').getByRole('button', { name: '删除' }).click();
  await expect(page.getByTestId('stratification-replacement-scheme')).toContainText('分层方案 1');
  await page.getByTestId('stratification-delete-confirm').click();
  await expect(page.getByTestId('stratification-scheme-list')).not.toContainText('对比方案 B');
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({
    schemeCount: 1,
    currentScheme: { name: '分层方案 1', status: 'current' },
    deletedSchemeIds: expect.arrayContaining([deletedBId]),
  });
  let state = await readStratificationState(page, projectName);
  expect(state.revisions.filter((revision) => revision.schemeId === deletedBId).map((revision) => revision.revisionId)).toEqual(frozenBRevisionIds);
  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  state = await readStratificationState(page, projectName);
  expect(state).toMatchObject({ schemeCount: 1, currentScheme: { name: '分层方案 1', status: 'current' } });
  expect(state.deletedSchemeIds).toEqual(expect.arrayContaining([deletedBId]));
  expect(state.revisions.filter((revision) => revision.schemeId === deletedBId).map((revision) => revision.revisionId)).toEqual(frozenBRevisionIds);

  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-duplicate').click();
  await page.getByTestId('stratification-scheme-name').fill('修订方案 C');
  await page.getByTestId('stratification-scheme-tool').getByRole('button', { name: '重命名' }).click();
  await commitStratificationRevision(page);
  await page.getByTestId('stratification-scheme-list').locator('button').filter({ hasText: '分层方案 1' }).click();
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-scheme-tool').getByRole('button', { name: '删除' }).click();
  await page.getByTestId('stratification-delete-confirm').click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 1, currentScheme: { name: '修订方案 C', status: 'current' } });
  state = await readStratificationState(page, projectName);
  expect(state).toMatchObject({ schemeCount: 1, currentScheme: { name: '修订方案 C', status: 'current' } });
  await openNewSchemeChoice(page);
  await page.getByTestId('new-scheme-choose-method').click();
  await expect(page.getByTestId('guided-generation-dialog')).toBeVisible();
  await page.getByTestId('guided-generation-dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 1 });
  const layouts = await capture(page, 'flow-f-04-current-replacement');
  await writeEvidence('flow-f-04', csv, { seed, steps: ['commit-a', 'duplicate-and-commit-b', 'delete-current-b-with-explicit-a-replacement', 'duplicate-and-commit-c', 'delete-history-a'], state, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F-05 keeps two points independent and revises only the point whose upstream check changed', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `多点分层 ${seed}`;
  const pointA = `FA-${seed}`;
  const pointB = `FB-${seed}`;
  const csv = multiPointCsv([[pointA, [0.5, 2, 4]], [pointB, [0.8, 2.8, 5.2]]]);
  await createProjectAndUpload(page, testInfo, projectName, `flow-f-05-${seed}.csv`, csv);
  await page.getByTestId('point-plan-split-all').click();
  await page.getByTestId('generate-point-drafts-primary').click();
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeHidden({ timeout: 30_000 });
  await completePreparationGuide(page);
  await page.getByTestId('flow-continue-stratification').click();
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);

  await switchPointToCheck(page, pointB);
  await page.getByTestId('flow-continue-stratification').click();
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await page.getByTestId('stratification-add-boundary').click();
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);

  const seededDownstream = await seedCurrentDownstreamArtifacts(page, projectName);
  expect(seededDownstream).toBe(true);
  await page.reload();
  await expect(page.getByTestId('stratification-document')).toBeVisible();

  await switchPointToCheck(page, pointA);
  await page.getByTestId('explorer-import').click();
  const revisedCsv = standardCsv(pointA, [0.5, 2.2, 4.4]);
  const revisedPath = testInfo.outputPath(`flow-f-05-revised-${seed}.csv`);
  writeFileSync(revisedPath, revisedCsv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(revisedPath);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(basename(revisedPath));
  await completePreparationGuide(page);
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('需要更新');
  const staleLayouts = await capture(page, 'flow-f-05-stale-point-a');
  await page.getByTestId('stratification-primary-action').click();
  await commitStratificationRevision(page);

  const state = await readProjectStratificationStates(page, projectName);
  const pointAState = state.points.find((point) => point.pointName === pointA);
  const pointBState = state.points.find((point) => point.pointName === pointB);
  expect(pointAState).toMatchObject({ schemeCount: 2, currentStatus: 'current', staleCount: 1, layerCount: 1, parameterStatus: 'stale', outputStatus: 'stale' });
  expect(pointBState).toMatchObject({ schemeCount: 1, currentStatus: 'current', staleCount: 0, layerCount: 2, parameterStatus: 'current', outputStatus: 'current' });
  expect(pointAState?.parameterSourceSchemeId).toBeTruthy();
  expect(pointAState?.outputSourceSchemeId).toBe(pointAState?.parameterSourceSchemeId);
  expect(pointAState?.parameterSourceRevisionId).toBeTruthy();
  expect(pointAState?.outputSourceRevisionId).toBe(pointAState?.parameterSourceRevisionId);
  expect(pointBState?.parameterSourceSchemeId).toBe(pointBState?.currentSchemeId);
  expect(pointBState?.outputSourceSchemeId).toBe(pointBState?.currentSchemeId);
  expect(pointBState?.parameterSourceRevisionId).toBe(pointBState?.currentRevisionId);
  expect(pointBState?.outputSourceRevisionId).toBe(pointBState?.currentRevisionId);
  const layouts = await capture(page, 'flow-f-05-revised-point-a');
  await writeEvidence('flow-f-05', `${csv}\n--- revised A ---\n${revisedCsv}`, { seed, steps: ['generate-a-b', 'commit-a', 'commit-b', 'seed-current-parameter-and-output-artifacts', 'revise-a-import', 'rerun-a-check', 'observe-a-stale', 'create-a-revision', 'prove-b-and-its-downstream-unchanged'], state, staleLayouts, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F-06 preserves the page edit on a failed save and commits it exactly once after retry', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `保存恢复 ${seed}`;
  const csv = standardCsv(`F6-${seed}`, [0.5, 2, 4, 6]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-06-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ schemeCount: 1, editSession: { dirty: true } });
  const beforeFailure = await readStratificationState(page, projectName);

  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    const storage = navigator.storage;
    const originalEstimate = storage?.estimate?.bind(storage);
    let remainingFailures = 2;
    (window as unknown as { __restoreStratificationPut?: () => void }).__restoreStratificationPut = () => {
      IDBObjectStore.prototype.put = original;
      if (storage && originalEstimate) Object.defineProperty(storage, 'estimate', { configurable: true, value: originalEstimate });
    };
    if (storage) Object.defineProperty(storage, 'estimate', { configurable: true, value: async () => ({ usage: 15 * 1024 ** 2, quota: 100 * 1024 ** 2 }) });
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error('FLOW-F-06 forced write failure');
      }
      return original.apply(this, args);
    };
  });
  await page.getByTestId('stratification-add-boundary').click();
  await expect(page.getByTestId('project-storage-workspace-notice')).toContainText('保存失败');
  await expect(page.getByTestId('project-storage-workspace-notice')).toContainText('本机数据库暂时无法写入');
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveAttribute('data-storage-failure', 'temporary');
  await expect(page.getByTestId('workspace-storage-usage')).toHaveCount(0);
  await page.getByTestId('workspace-save-help-toggle').click();
  await expect(page.getByTestId('workspace-save-help')).toContainText('不要刷新或关闭当前页面');
  await expect(page.getByTestId('workspace-save-help')).toContainText('FLOW-F-06 forced write failure');
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  const failedSaveLayouts = await captureTarget(page, 'flow-f-06-failed-save', 'project-storage-workspace-notice');
  const afterFailure = await readStratificationState(page, projectName);
  expect(afterFailure.currentScheme).toEqual(beforeFailure.currentScheme);
  expect(afterFailure.editSession?.undoCount).toBe(beforeFailure.editSession?.undoCount);

  await page.evaluate(() => (window as unknown as { __restoreStratificationPut?: () => void }).__restoreStratificationPut?.());
  await page.getByTestId('retry-workspace-save').click();
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveCount(0);
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ editSession: { dirty: true, undoCount: 1 } });
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-name').fill('恢复后提交层');
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ editSession: { dirty: true, undoCount: 2 } });
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ artifactStatus: 'current', currentScheme: { layerCount: 2, boundaryCount: 1, version: 1 }, editSession: null });
  const recovered = await readStratificationState(page, projectName);
  const layouts = await capture(page, 'flow-f-06-recovered-save');
  await writeEvidence('flow-f-06', csv, { seed, steps: ['create-base', 'force-two-write-failures', 'edit-remains-in-page', 'prove-canonical-unchanged', 'restore-storage', 'retry-save', 'make-second-edit', 'commit-once'], beforeFailure, afterFailure, recovered, failedSaveLayouts, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F-07 preserves a dirty edit as read-only when an upstream change arrives', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `编辑失效恢复 ${seed}`;
  const csv = standardCsv(`F7-${seed}`, [0.5, 2, 4, 6]);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f-07-${seed}.csv`, csv);
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await confirmPendingLayers(page);
  await commitStratificationRevision(page);
  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-name').fill('尚未提交的现场修改');
  await page.getByTestId('stratification-layer-tool').getByRole('button', { name: '更新显示名称' }).click();
  await expect.poll(() => readStratificationState(page, projectName)).toMatchObject({ editSession: { dirty: true }, revisions: [{ version: 1 }] });

  const invalidated = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/stratification/stratificationDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    if (!point?.stratificationWorkspace) throw new Error('Active stratification workspace not found.');
    const reason = '另一个上游操作已产生新的检查依据。';
    point.stratificationWorkspace = domain.markStratificationWorkspaceStale(point.stratificationWorkspace, reason);
    point.stratificationState = { ...point.stratificationState, status: 'stale', staleReason: reason, invalidatedAt: new Date().toISOString() };
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
    return saved.ok;
  }, projectName);
  expect(invalidated).toBe(true);
  await page.reload();
  await expect(page.getByTestId('stratification-first-look')).toContainText('当前编辑已保留');
  await expect(page.getByTestId('stratification-add-boundary')).toBeDisabled();
  await expect(page.getByTestId('stratification-layer-tool')).toHaveCount(0);
  await expect(page.getByTestId('stratification-commit-confirm')).toHaveCount(0);
  const preserved = await readStratificationState(page, projectName);
  expect(preserved.editSession).toMatchObject({ dirty: true, staleReason: '另一个上游操作已产生新的检查依据。' });
  const preservedLayouts = await capture(page, 'flow-f-07-dirty-edit-preserved');

  await page.getByTestId('stratification-primary-action').click();
  await expect(page.getByTestId('stratification-transition-dialog')).toContainText('上游检查已经变化');
  await expect(page.getByTestId('stratification-commit-confirm')).toHaveCount(0);
  await page.getByTestId('stratification-discard-confirm').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('需要更新');
  await page.getByTestId('stratification-primary-action').click();
  await commitStratificationRevision(page);
  const recovered = await readStratificationState(page, projectName);
  expect(recovered).toMatchObject({ schemeCount: 2, artifactStatus: 'current', revisions: [{ version: 1 }, { version: 1 }] });
  const layouts = await capture(page, 'flow-f-07-revised-after-stale-edit');
  await writeEvidence('flow-f-07', csv, { seed, steps: ['commit-base', 'make-dirty-edit', 'simulate-upstream-change', 'prove-edit-preserved-read-only', 'explicitly-discard', 'create-revision-from-latest-check', 'commit-revision'], preserved, recovered, preservedLayouts, layouts, browserErrors: browserErrors.get(page) ?? [] });
});

test('FLOW-F2-01 uploads a randomized CPT file, generates rule candidates, refines one, and commits a revision', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `规则分层 ${seed}`;
  const pointName = `RF-${seed}`;
  const csv = randomizedRuleCsv(pointName, seed);
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f2-01-${seed}.csv`, csv);

  await openAdvancedStratificationTools(page);
  await page.getByTestId('stratification-tool-mode').getByRole('button', { name: '仅生成边界候选' }).click();
  await page.getByTestId('stratification-rule-window').fill('2');
  await page.getByTestId('stratification-rule-threshold').fill('0.75');
  await page.getByTestId('stratification-rule-spacing').fill('1.50');
  await page.getByTestId('stratification-rule-limit').fill('1');
  await page.getByTestId('stratification-rule-run').click();

  await expect(page.getByTestId('stratification-rule-result')).toContainText('已完成');
  const candidateButtons = page.getByTestId('stratification-rule-candidate-list').locator('button');
  await expect(candidateButtons).not.toHaveCount(0);
  await candidateButtons.first().click();
  await expect(page.getByTestId('stratification-rule-candidate-detail')).toContainText('qc 变化');
  const previewLayouts = await capture(page, 'flow-f2-01-rule-preview');

  await page.getByTestId('stratification-rule-apply').click();
  await completeThinLayerGuide(page);
  await expect(page.getByTestId('stratification-first-look')).toContainText('请从右侧逐层确认土类');
  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await expect(page.getByTestId('stratification-layer-navigator').locator('button')).toHaveCount(2);
  await expect(page.getByTestId('jts-classification-evidence')).toHaveCount(0);
  if (evidenceEnabled) {
    await page.screenshot({ path: join(evidenceDirectory, 'process090-main-workbench-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: join(evidenceDirectory, 'process090-main-workbench-1920x1080.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-boundary-1').click();
  const originalDepthText = await page.getByTestId('stratification-boundary-1').textContent();
  const originalDepth = Number(originalDepthText?.match(/[\d.]+/)?.[0]);
  const refinedDepth = Number((originalDepth + 0.1).toFixed(2));
  await page.getByTestId('stratification-boundary-depth').fill(refinedDepth.toFixed(2));
  await page.getByTestId('stratification-apply-boundary-depth').click();
  await expect(page.getByTestId('stratification-boundary-1')).toContainText(`${refinedDepth.toFixed(2)} m`);
  await page.getByTestId('stratification-boundary-tool').getByLabel('标记为需复核').uncheck();

  await expect(page.getByTestId('stratification-layer-decision-panel')).toContainText('当前没有可直接采用的建议');
  await page.getByTestId('stratification-layer-decision-panel').getByRole('button', { name: '选择土类', exact: true }).click();
  await expect(page.getByTestId('stratification-inline-soil-form')).toBeVisible();
  if (evidenceEnabled) {
    await page.screenshot({ path: join(evidenceDirectory, 'process090-layer-decision-1440x900.png'), animations: 'disabled' });
    await page.screenshot({ path: join(evidenceDirectory, 'stratification-guide-soil-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: join(evidenceDirectory, 'process090-layer-decision-1920x1080.png'), animations: 'disabled' });
    await page.screenshot({ path: join(evidenceDirectory, 'stratification-guide-soil-1920x1080.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-inline-soil-select').selectOption('粉砂');
  await page.getByTestId('stratification-inline-save-soil').click();
  await page.getByTestId('stratification-layer-decision-panel').getByRole('button', { name: '选择土类', exact: true }).click();
  await page.getByTestId('stratification-inline-soil-select').selectOption('黏土');
  await page.getByTestId('stratification-inline-save-soil').click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('stratification-transition-dialog')).toContainText('只有最终预览会生成当前修订');
  await expect(page.getByTestId('stratification-commit-confirm')).toHaveCount(0);
  await page.getByTestId('stratification-review-before-leave').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await page.getByRole('button', { name: '返回修改分层' }).last().click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await page.getByTestId('stratification-save').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await expect(page.getByTestId('stratification-finalize-sources')).toContainText('边界来源规则候选');
  await expect(page.getByTestId('stratification-finalize-sources')).toContainText('无系统建议，工程师选择 2 层');
  await expect(page.getByTestId('stratification-final-layer-preview')).toContainText('砂土');
  await expect(page.getByTestId('stratification-final-layer-preview')).toContainText('黏性土');
  await expect(page.getByTestId('stratification-final-layer-preview')).toContainText(`${refinedDepth.toFixed(2)} m`);
  if (evidenceEnabled) {
    await page.screenshot({ path: join(evidenceDirectory, 'stratification-guide-final-1440x900.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: join(evidenceDirectory, 'stratification-guide-final-1920x1080.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('stratification-guide-generate-revision').click();
  await expect(page.getByTestId('stratification-first-look')).toContainText('分层方案已就绪');
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'allow');
  await expect.poll(() => page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { revisionCount: 0, hasScheme: false };
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    return {
      revisionCount: workspace?.revisions?.length ?? 0,
      hasScheme: Boolean(workspace?.schemes.some((candidate) => candidate.schemeId === workspace.currentSchemeId)),
    };
  }, projectName)).toEqual({ revisionCount: 1, hasScheme: true });

  const persisted = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const run = workspace?.ruleRuns?.find((candidate) => candidate.runId === workspace.activeRuleRunId);
    const scheme = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
    return {
      run: run ? { status: run.status, candidateCount: run.candidates.length, inputRowCount: run.inputRowsSnapshot.length, resultHash: run.resultHash } : null,
      scheme: scheme ? { origin: scheme.origin, boundaryDepths: scheme.boundaries.map((boundary) => boundary.depthM), version: scheme.version, soilDecisions: scheme.layers.map((layer) => layer.soilDecision) } : null,
      revisionCount: workspace?.revisions?.length ?? 0,
    };
  }, projectName);
  expect(persisted).toMatchObject({
    run: { status: 'completed', inputRowCount: 14 },
    scheme: { origin: { kind: 'rule-candidate', ruleId: 'qc_fr_change_point_v1' }, boundaryDepths: [refinedDepth], version: 1, soilDecisions: [{ finalGroup: 'sand', finalDetailedType: '粉砂', source: 'engineer-selected' }, { finalGroup: 'clay', finalDetailedType: '黏土', source: 'engineer-selected' }] },
    revisionCount: 1,
  });
  expect(persisted.run?.candidateCount).toBeGreaterThan(0);
  expect(persisted.run?.resultHash).toMatch(/^[a-f0-9]{64}$/);

  const forgedSave = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const forged = structuredClone(loaded.manifest);
    const project = forged.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const run = point?.stratificationWorkspace?.ruleRuns?.[0];
    if (!run?.candidates[0]) throw new Error('Completed rule candidate is required.');
    run.candidates[0].score = 0.999;
    forged.manifestRevision = loaded.manifest.manifestRevision + 1;
    return database.saveWorkspaceV2(forged, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
  }, projectName);
  expect(forgedSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });

  const persistenceGuards = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/stratification/stratificationRuleDomain.ts');
    const hash = await import('/src/features/workspace/stableHash.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const rewrite = structuredClone(loaded.manifest);
    const rewriteProject = rewrite.state.projects.find((candidate) => candidate.projectName === name);
    const rewritePoint = rewriteProject?.points.find((candidate) => candidate.pointId === rewriteProject.activePointId);
    const rewriteWorkspace = rewritePoint?.stratificationWorkspace;
    const rewriteRun = rewriteWorkspace?.ruleRuns?.[0];
    if (!rewriteWorkspace || !rewriteRun) throw new Error('Rule run is required.');
    rewriteRun.settingsSnapshot.scoreThreshold = 0.6;
    rewriteRun.settingsHash = hash.sha256HexSync(hash.stableStringify(rewriteRun.settingsSnapshot));
    rewriteRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
      commandId: rewriteRun.commandId,
      formulaSpecHash: rewriteRun.formulaSpecHash,
      sourceLineageHash: rewriteRun.sourceLineageHash,
      inputHash: rewriteRun.inputHash,
      settingsHash: rewriteRun.settingsHash,
    }));
    rewriteRun.status = 'running';
    rewriteRun.candidates = [];
    rewriteRun.issues = [];
    rewriteRun.summary = null;
    rewriteRun.resultHash = null;
    delete rewriteRun.completedAt;
    const rewriteCompletedAt = new Date(Math.max(Date.parse(rewriteRun.startedAt ?? rewriteRun.createdAt), Date.parse(rewriteRun.createdAt)) + 1000).toISOString();
    const recompleted = domain.completeStratificationRuleRun(rewriteWorkspace, rewriteRun.runId, rewriteCompletedAt);
    if (!recompleted.ok) throw new Error(recompleted.problem);
    rewritePoint.stratificationWorkspace = recompleted.workspace;
    rewrite.manifestRevision = loaded.manifest.manifestRevision + 1;
    const rewriteValidation = database.validateManifestReferences(rewrite, loaded.dataBlocks);
    const rewriteSave = await database.saveWorkspaceV2(rewrite, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });

    const missingRow = structuredClone(loaded.manifest);
    const missingProject = missingRow.state.projects.find((candidate) => candidate.projectName === name);
    const missingPoint = missingProject?.points.find((candidate) => candidate.pointId === missingProject.activePointId);
    const missingWorkspace = missingPoint?.stratificationWorkspace;
    const missingRun = missingWorkspace?.ruleRuns?.[0];
    if (!missingWorkspace || !missingRun) throw new Error('Rule run is required.');
    const missingDraft = missingPoint?.importDrafts.find((draft) => draft.draftId === missingRun.input.draftId);
    if (!missingDraft) throw new Error('Rule source draft is required.');
    missingDraft.sourceRowIds.pop();
    missingRun.inputRowsSnapshot.pop();
    missingRun.inputHash = hash.sha256HexSync(hash.stableStringify(missingRun.inputRowsSnapshot));
    missingRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
      commandId: missingRun.commandId,
      formulaSpecHash: missingRun.formulaSpecHash,
      sourceLineageHash: missingRun.sourceLineageHash,
      inputHash: missingRun.inputHash,
      settingsHash: missingRun.settingsHash,
    }));
    missingRun.status = 'running';
    missingRun.candidates = [];
    missingRun.issues = [];
    missingRun.summary = null;
    missingRun.resultHash = null;
    delete missingRun.completedAt;
    const missingCompletedAt = new Date(Math.max(Date.parse(missingRun.startedAt ?? missingRun.createdAt), Date.parse(missingRun.createdAt)) + 1000).toISOString();
    const missingRecompleted = domain.completeStratificationRuleRun(missingWorkspace, missingRun.runId, missingCompletedAt);
    if (!missingRecompleted.ok) throw new Error(missingRecompleted.problem);
    missingPoint.stratificationWorkspace = missingRecompleted.workspace;
    missingRow.manifestRevision = loaded.manifest.manifestRevision + 1;
    const missingValidation = database.validateManifestReferences(missingRow, loaded.dataBlocks);
    const missingSave = await database.saveWorkspaceV2(missingRow, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });

    const nonAdvancing = structuredClone(loaded.manifest);
    const nonAdvancingProject = nonAdvancing.state.projects.find((candidate) => candidate.projectName === name);
    const nonAdvancingPoint = nonAdvancingProject?.points.find((candidate) => candidate.pointId === nonAdvancingProject.activePointId);
    const nonAdvancingWorkspace = nonAdvancingPoint?.stratificationWorkspace;
    const sourceRun = nonAdvancingWorkspace?.ruleRuns?.[0];
    if (!nonAdvancingWorkspace || !sourceRun) throw new Error('Rule run is required.');
    const addedRun = domain.prepareStratificationRuleRun(
      nonAdvancingWorkspace,
      sourceRun.input,
      sourceRun.inputRowsSnapshot,
      sourceRun.settingsSnapshot,
      'non-advancing-command',
      new Date().toISOString(),
      'non-advancing-run',
    );
    if (!addedRun.ok) throw new Error(addedRun.problem);
    nonAdvancingPoint.stratificationWorkspace = addedRun.workspace;
    const nonAdvancingSave = await database.saveWorkspaceV2(nonAdvancing, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });

    const divergent = structuredClone(loaded.manifest);
    const divergentProject = divergent.state.projects.find((candidate) => candidate.projectName === name);
    const divergentPoint = divergentProject?.points.find((candidate) => candidate.pointId === divergentProject.activePointId);
    const divergentWorkspace = divergentPoint?.stratificationWorkspace;
    const divergentScheme = divergentWorkspace?.schemes.find((scheme) => scheme.schemeId === divergentWorkspace.currentSchemeId);
    if (!divergentScheme?.boundaries[0]) throw new Error('Current scheme boundary is required.');
    divergentScheme.boundaries[0].depthM += 0.05;
    divergentScheme.layers[0].depthToM += 0.05;
    divergentScheme.layers[1].depthFromM += 0.05;
    const divergentValidation = database.validateManifestReferences(divergent, loaded.dataBlocks);

    const ghost = structuredClone(loaded.manifest);
    const ghostProject = ghost.state.projects.find((candidate) => candidate.projectName === name);
    const ghostPoint = ghostProject?.points.find((candidate) => candidate.pointId === ghostProject.activePointId);
    const ghostWorkspace = ghostPoint?.stratificationWorkspace;
    const sourceRevision = ghostWorkspace?.revisions?.[0];
    if (!ghostWorkspace || !sourceRevision) throw new Error('Source revision is required.');
    const ghostRevision = structuredClone(sourceRevision);
    ghostRevision.revisionId = 'ghost-scheme:v999:revision';
    ghostRevision.schemeId = 'ghost-scheme';
    ghostRevision.version = 999;
    ghostRevision.snapshot.schemeId = 'ghost-scheme';
    ghostRevision.snapshot.version = 999;
    ghostWorkspace.revisions!.push(ghostRevision);
    ghostWorkspace.deletedSchemeIds = [...(ghostWorkspace.deletedSchemeIds ?? []), 'ghost-scheme'];
    const ghostValidation = database.validateManifestReferences(ghost, loaded.dataBlocks);

    const duplicateCandidate = structuredClone(loaded.manifest);
    const duplicateProject = duplicateCandidate.state.projects.find((candidate) => candidate.projectName === name);
    const duplicatePoint = duplicateProject?.points.find((candidate) => candidate.pointId === duplicateProject.activePointId);
    const duplicateWorkspace = duplicatePoint?.stratificationWorkspace;
    const duplicateScheme = duplicateWorkspace?.schemes.find((scheme) => scheme.schemeId === duplicateWorkspace.currentSchemeId);
    const duplicateRevision = duplicateWorkspace?.revisions?.find((revision) => revision.schemeId === duplicateScheme?.schemeId && revision.version === duplicateScheme?.version);
    const firstReference = duplicateScheme?.boundaries[0]?.ruleCandidateRef;
    const lowerLayer = duplicateScheme?.layers[1];
    if (!duplicateScheme || !duplicateRevision || !firstReference || !lowerLayer) throw new Error('Candidate-derived scheme is required.');
    const originalBottom = lowerLayer.depthToM;
    const splitDepth = Number(((lowerLayer.depthFromM + originalBottom) / 2).toFixed(3));
    lowerLayer.depthToM = splitDepth;
    const thirdLayer = { ...structuredClone(lowerLayer), layerId: `${duplicateScheme.schemeId}:duplicate-layer`, name: '重复引用层', depthFromM: splitDepth, depthToM: originalBottom };
    duplicateScheme.layers.push(thirdLayer);
    duplicateScheme.boundaries.push({
      boundaryId: `${duplicateScheme.schemeId}:duplicate-boundary`,
      depthM: splitDepth,
      upperLayerId: lowerLayer.layerId,
      lowerLayerId: thirdLayer.layerId,
      reviewRequired: true,
      note: 'Forged duplicate candidate reference.',
      ruleCandidateRef: structuredClone(firstReference),
    });
    duplicateRevision.snapshot = structuredClone(duplicateScheme);
    const duplicateCandidateValidation = database.validateManifestReferences(duplicateCandidate, loaded.dataBlocks);

    const mutatedBlocks = structuredClone(loaded.dataBlocks);
    const mutatedNormalized = mutatedBlocks.find((block) => block.kind === 'normalized');
    if (!mutatedNormalized || mutatedNormalized.kind !== 'normalized') throw new Error('Normalized block is required.');
    mutatedNormalized.rows[0].qcKpa += 500;
    const mutatedManifest = structuredClone(loaded.manifest);
    mutatedManifest.manifestRevision = loaded.manifest.manifestRevision + 1;
    const normalizedMutationSave = await database.saveWorkspaceV2(mutatedManifest, mutatedBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });

    const changedOrigin = structuredClone(loaded.manifest);
    const changedOriginProject = changedOrigin.state.projects.find((candidate) => candidate.projectName === name);
    const changedOriginPoint = changedOriginProject?.points.find((candidate) => candidate.pointId === changedOriginProject.activePointId);
    const changedOriginWorkspace = changedOriginPoint?.stratificationWorkspace;
    const changedOriginScheme = changedOriginWorkspace?.schemes.find((scheme) => scheme.schemeId === changedOriginWorkspace.currentSchemeId);
    if (!changedOriginWorkspace || !changedOriginScheme) throw new Error('Current rule scheme is required.');
    changedOriginScheme.version = 2;
    changedOriginScheme.origin = { kind: 'manual' };
    changedOriginScheme.boundaries.forEach((boundary) => { delete boundary.ruleCandidateRef; });
    changedOriginWorkspace.revisions!.push({
      revisionId: `${changedOriginScheme.schemeId}:v2:changed-origin`,
      schemeId: changedOriginScheme.schemeId,
      version: 2,
      snapshot: structuredClone(changedOriginScheme),
      committedAt: new Date().toISOString(),
    });
    const changedOriginValidation = database.validateManifestReferences(changedOrigin, loaded.dataBlocks);

    const failedCheck = structuredClone(loaded.manifest);
    const failedCheckProject = failedCheck.state.projects.find((candidate) => candidate.projectName === name);
    const failedCheckPoint = failedCheckProject?.points.find((candidate) => candidate.pointId === failedCheckProject.activePointId);
    const referencedCheckId = failedCheckPoint?.stratificationWorkspace?.ruleRuns?.[0]?.input.checkRunId;
    const failedSourceCheck = failedCheckPoint?.checkState.runs.find((run) => run.runId === referencedCheckId);
    if (!failedSourceCheck) throw new Error('Referenced check run is required.');
    failedSourceCheck.conclusion = '存在问题';
    failedCheckPoint!.checkState.artifact.status = 'problem';
    const failedCheckValidation = database.validateManifestReferences(failedCheck, loaded.dataBlocks);

    const workingDowngrade = structuredClone(loaded.manifest);
    const workingProject = workingDowngrade.state.projects.find((candidate) => candidate.projectName === name);
    const workingPoint = workingProject?.points.find((candidate) => candidate.pointId === workingProject.activePointId);
    const workingWorkspace = workingPoint?.stratificationWorkspace;
    const workingScheme = workingWorkspace?.schemes.find((scheme) => scheme.schemeId === workingWorkspace.currentSchemeId);
    if (!workingScheme) throw new Error('Committed scheme is required.');
    workingScheme.status = 'working';
    const workingDowngradeValidation = database.validateManifestReferences(workingDowngrade, loaded.dataBlocks);
    return { rewriteValidation, rewriteSave, missingValidation, missingSave, nonAdvancingSave, divergentValidation, ghostValidation, duplicateCandidateValidation, normalizedMutationSave, changedOriginValidation, failedCheckValidation, workingDowngradeValidation };
  }, projectName);
  expect(persistenceGuards.rewriteValidation).toEqual({ ok: true });
  expect(persistenceGuards.rewriteSave).toMatchObject({ ok: false, reason: 'conflict', detail: expect.stringContaining('immutable') });
  expect(persistenceGuards.missingValidation).toMatchObject({ ok: false, detail: expect.stringContaining('complete ordered normalized rows') });
  expect(persistenceGuards.missingSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  expect(persistenceGuards.nonAdvancingSave).toMatchObject({ ok: false, reason: 'conflict', detail: expect.stringContaining('exact compare-and-swap') });
  expect(persistenceGuards.divergentValidation).toMatchObject({ ok: false, detail: expect.stringContaining('diverges') });
  expect(persistenceGuards.ghostValidation).toMatchObject({ ok: false, detail: expect.stringContaining('non-contiguous') });
  expect(persistenceGuards.duplicateCandidateValidation).toMatchObject({ ok: false, detail: expect.stringContaining('same rule candidate') });
  expect(persistenceGuards.normalizedMutationSave).toMatchObject({ ok: false, reason: 'invalid-bundle', detail: expect.stringContaining('normalized-data hash') });
  expect(persistenceGuards.changedOriginValidation).toMatchObject({ ok: false, detail: expect.stringContaining('immutable input or origin') });
  expect(persistenceGuards.failedCheckValidation).toMatchObject({ ok: false, detail: expect.stringContaining('invalid check run') });
  expect(persistenceGuards.workingDowngradeValidation).toMatchObject({ ok: false, detail: expect.stringContaining('new uncommitted edit') });

  const layouts = await capture(page, 'flow-f2-01-committed-rule-scheme');
  const directStoreDamage = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const putManifestDirectly = (manifest: typeof loaded.manifest) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readwrite');
        transaction.objectStore('manifests').put(manifest);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });

    const damagedCheck = structuredClone(loaded.manifest);
    const damagedCheckProject = damagedCheck.state.projects.find((candidate) => candidate.projectName === name);
    const damagedCheckPoint = damagedCheckProject?.points.find((candidate) => candidate.pointId === damagedCheckProject.activePointId);
    const referencedCheckId = damagedCheckPoint?.stratificationWorkspace?.ruleRuns?.[0]?.input.checkRunId;
    const referencedCheck = damagedCheckPoint?.checkState.runs.find((run) => run.runId === referencedCheckId);
    if (!referencedCheck) throw new Error('Referenced check authority is required.');
    referencedCheck.counts.problem += 1;
    const checkInternalValidation = database.validateManifestReferences(damagedCheck, loaded.dataBlocks);
    await putManifestDirectly(damagedCheck);
    const loadedAfterCheckDamage = await database.loadActiveWorkspaceV2();
    await putManifestDirectly(loaded.manifest);

    const damaged = structuredClone(loaded.manifest);
    const project = damaged.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    if (!workspace?.ruleRuns?.length) throw new Error('Rule authority is required.');
    workspace.ruleRuns = [];
    workspace.activeRuleRunId = null;
    workspace.schemes.forEach((scheme) => {
      if (scheme.origin?.kind === 'rule-candidate') scheme.origin = { kind: 'manual' };
      scheme.boundaries.forEach((boundary) => { delete boundary.ruleCandidateRef; });
    });
    workspace.revisions?.forEach((revision) => {
      if (revision.snapshot.origin?.kind === 'rule-candidate') revision.snapshot.origin = { kind: 'manual' };
      revision.snapshot.boundaries.forEach((boundary) => { delete boundary.ruleCandidateRef; });
    });
    const internalValidation = database.validateManifestReferences(damaged, loaded.dataBlocks);
    await putManifestDirectly(damaged);
    const loadedAfterDamage = await database.loadActiveWorkspaceV2();
    return { checkInternalValidation, loadedAfterCheckDamage, internalValidation, loadedAfterDamage };
  }, projectName);
  expect(directStoreDamage.checkInternalValidation).toEqual({ ok: true });
  expect(directStoreDamage.loadedAfterCheckDamage).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });
  expect(directStoreDamage.internalValidation).toEqual({ ok: true });
  expect(directStoreDamage.loadedAfterDamage).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });
  await writeEvidence('flow-f2-01', csv, {
    seed,
    steps: ['upload-randomized-csv', 'run-data-check', 'configure-rule', 'generate-candidates', 'inspect-candidate', 'convert-to-editable-scheme', 'move-boundary', 'confirm-soil-groups', 'commit-revision', 'reject-forged-result'],
    persisted,
    forgedSave,
    persistenceGuards,
    directStoreDamage,
    previewLayouts,
    layouts,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

test('FLOW-F2-02 keeps a deferred layer explicit across reload and resolves it inline without a modal', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `分层暂存 ${seed}`;
  await prepareCheckedPoint(page, testInfo, projectName, `flow-f2-02-${seed}.csv`, standardCsv(`FD-${seed}`, [0.5, 2, 4, 6]));
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();

  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await expect(page.getByTestId('stratification-soil-guide-dialog')).toHaveCount(0);
  await page.getByTestId('stratification-layer-decision-panel').getByRole('button', { name: '暂时保留', exact: true }).click();
  await page.getByTestId('stratification-inline-defer-form').getByRole('combobox').selectOption('needs-sampling');
  await page.getByTestId('stratification-inline-defer-form').getByRole('textbox').fill('等待室内试验');
  await page.getByTestId('stratification-inline-confirm-defer').click();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toContainText('暂时保留');
  await expect(page.getByTestId('stratification-selected-layer-issues')).toContainText('需要结合取样或试验');
  await expect(page.getByTestId('stratification-save')).toHaveCount(0);
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'deny');

  await page.reload();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toContainText('暂时保留');
  await expect(page.getByTestId('stratification-selected-layer-issues')).toContainText('需要结合取样或试验');
  await page.getByTestId('stratification-inline-select-soil').click();
  await page.getByTestId('stratification-inline-soil-select').selectOption('粉砂');
  await page.getByTestId('stratification-inline-save-soil').click();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toContainText('已确认');
  await expect(page.getByTestId('stratification-save')).toBeVisible();
});

async function prepareCheckedPoint(page: Page, testInfo: TestInfo, projectName: string, fileName: string, csv: string) {
  await createProjectAndUpload(page, testInfo, projectName, fileName, csv);
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
}

async function openAdvancedStratificationTools(page: Page) {
  const show = page.getByTestId('right-panel-show');
  if (await show.isVisible().catch(() => false)) await show.click();
  const tools = page.getByTestId('stratification-advanced-tools');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) await page.getByTestId('stratification-advanced-tools-toggle').click();
}

async function createProjectAndUpload(page: Page, testInfo: TestInfo, projectName: string, fileName: string, csv: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const path = testInfo.outputPath(fileName);
  writeFileSync(path, csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(path);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(basename(path));
}

async function switchPointToCheck(page: Page, pointName: string) {
  await page.getByTestId('explorer-project').click();
  await page.locator('[data-testid^="project-point-"]').filter({ hasText: pointName }).click();
  const probeDialog = page.getByTestId('probe-guide-dialog');
  if (await probeDialog.isVisible().catch(() => false)) {
    await page.getByTestId('probe-guide-recommended').click();
    await expect(probeDialog).toBeHidden();
    await completePreparationGuide(page);
    await expect(page.getByTestId('document-check')).toBeVisible();
    return;
  }
  await page.getByTestId('explorer-check').click();
}

async function seedCurrentDownstreamArtifacts(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    for (const point of project.points) {
      const workspace = point.stratificationWorkspace;
      const current = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId);
      const revision = workspace?.revisions?.find((candidate) => candidate.schemeId === current?.schemeId && candidate.version === current?.version);
      if (!current || !revision) continue;
      const artifact = {
        status: 'current' as const,
        input: {
          pointId: current.input.pointId,
          draftId: current.input.draftId,
          batchId: current.input.batchId,
          revisions: { ...current.input.revisions },
        },
        sourceCheckRunId: current.input.checkRunId,
        sourceStratificationSchemeId: current.schemeId,
        sourceStratificationRevisionId: revision.revisionId,
      };
      point.parameterState = structuredClone(artifact);
      point.outputState = structuredClone(artifact);
    }
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
    return saved.ok;
  }, projectName);
}

function standardCsv(pointName: string, depths: number[]) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...depths.map((depth, index) => [
      pointName,
      depth.toFixed(2),
      900 + index * 240,
      980 + index * 250,
      12 + index * 2,
      60 + index * 5,
      (1.2 + index * 0.1).toFixed(2),
      '12.4',
      Math.max(...depths).toFixed(1),
    ].join(',')),
  ].join('\n');
}

function thinLayerCsv(pointName: string) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...Array.from({ length: 101 }, (_, index) => {
      const depth = index / 10;
      const qc = 10_000 + Math.round(Math.sin(index / 7) * 120);
      const fs = 100 + Math.round(Math.sin(index / 9) * 2);
      const u2 = 40 + Math.round(Math.cos(index / 8) * 2);
      return [pointName, depth.toFixed(2), qc, qc + 80, fs, u2, (fs / (qc + 80) * 100).toFixed(3), '12.4', '10.0'].join(',');
    }),
  ].join('\n');
}

function layerSimplificationCsv(pointName: string) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...Array.from({ length: 101 }, (_, index) => {
      const depth = index / 10;
      const values = depth < 2 ? { qc: 100, fs: 10, u2: 10 }
        : depth < 4 ? { qc: 1_500, fs: 150, u2: 200 }
          : depth < 6 ? { qc: 300, fs: 30, u2: 60 }
            : depth < 8 ? { qc: 320, fs: 31, u2: 62 }
              : { qc: 340, fs: 32, u2: 64 };
      return [pointName, depth.toFixed(2), values.qc, values.qc + 50, values.fs, values.u2, (values.fs / (values.qc + 50) * 100).toFixed(3), '12.4', '10.0'].join(',');
    }),
  ].join('\n');
}

async function currentRawRowCount(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return -1;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const currentDraft = point?.importDrafts.find((draft) => draft.draftId === point.activeImportDraftId);
    const block = loaded.dataBlocks.find((candidate) => candidate.dataBlockId === currentDraft?.dataBlockId);
    return block?.kind === 'normalized' ? block.rows.length : -1;
  });
}

function randomizedRuleCsv(pointName: string, seed: number) {
  let state = seed || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const rows = Array.from({ length: 14 }, (_, index) => {
    const depth = 0.5 + index * 0.5;
    const lowerLayer = index >= 7;
    const qcBase = lowerLayer ? 7800 : 1050;
    const frBase = lowerLayer ? 3.1 : 1.05;
    const qc = Math.round(qcBase * (0.96 + random() * 0.08));
    const fr = frBase * (0.96 + random() * 0.08);
    return [pointName, depth.toFixed(2), qc, qc + 90, Math.round(qc * fr / 100), 70 + index * 3, fr.toFixed(3), '15.2', '7.0'].join(',');
  });
  return ['PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM', ...rows].join('\n');
}

function multiPointCsv(points: Array<[string, number[]]>) {
  const rows: string[] = [];
  const maxDepth = Math.max(...points.flatMap(([, depths]) => depths));
  const maxRows = Math.max(...points.map(([, depths]) => depths.length));
  for (let index = 0; index < maxRows; index += 1) {
    points.forEach(([pointName, depths], pointIndex) => {
      const depth = depths[index];
      if (depth === undefined) return;
      const qc = 900 + pointIndex * 180 + index * 220;
      rows.push([pointName, depth.toFixed(2), qc, qc + 80, 12 + index, 60 + index * 4, (1.1 + index * 0.12).toFixed(2), '12.4', maxDepth.toFixed(1)].join(','));
    });
  }
  return ['PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM', ...rows].join('\n');
}

function randomSeed() {
  return String(Date.now() % 100000000).padStart(8, '0');
}

async function readStratificationState(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId);
    if (!point) throw new Error('Active point not found.');
    const workspace = point.stratificationWorkspace;
    const current = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId) ?? null;
    const active = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.activeSchemeId) ?? null;
    return {
      activeRoute: project.activeRoute,
      pointId: point.pointId,
      checkRunId: point.checkState.activeRunId,
      artifactStatus: point.stratificationState.status,
      artifactInput: point.stratificationState.input ? structuredClone(point.stratificationState.input) : null,
      sourceCheckRunId: point.stratificationState.sourceCheckRunId ?? null,
      parameterStatus: point.parameterState.status,
      outputStatus: point.outputState.status,
      schemeCount: workspace?.schemes.length ?? 0,
      activeSchemeId: workspace?.activeSchemeId ?? null,
      currentSchemeId: workspace?.currentSchemeId ?? null,
      editSession: workspace?.editSession ? { dirty: workspace.editSession.dirty, isNew: workspace.editSession.isNew, staleReason: workspace.editSession.staleReason ?? null, undoCount: workspace.editSession.undoStack.length, redoCount: workspace.editSession.redoStack.length } : null,
      workingScheme: workspace?.editSession?.working ? {
        schemeId: workspace.editSession.working.schemeId,
        status: workspace.editSession.working.status,
        layerCount: workspace.editSession.working.layers.length,
        boundaryCount: workspace.editSession.working.boundaries.length,
        thinLayerCleanupCount: workspace.editSession.working.thinLayerCleanupHistory?.length ?? 0,
        layerSimplificationCount: workspace.editSession.working.layerSimplificationHistory?.length ?? 0,
        manualMergeCount: workspace.editSession.working.manualMergeHistory?.length ?? 0,
        names: workspace.editSession.working.layers.map((layer) => layer.name),
        reviewReasonKinds: workspace.editSession.working.layers.flatMap((layer) => layer.majorGroupComposition?.reviewReasons?.map((reason) => reason.kind) ?? []),
      } : null,
      revisions: structuredClone(workspace?.revisions ?? []),
      deletedSchemeIds: [...(workspace?.deletedSchemeIds ?? [])],
      activeScheme: active ? {
        schemeId: active.schemeId,
        status: active.status,
        layerCount: active.layers.length,
        boundaryCount: active.boundaries.length,
        thinLayerCleanupCount: active.thinLayerCleanupHistory?.length ?? 0,
        layerSimplificationCount: active.layerSimplificationHistory?.length ?? 0,
        manualMergeCount: active.manualMergeHistory?.length ?? 0,
      } : null,
      currentScheme: current ? {
        schemeId: current.schemeId,
        name: current.name,
        status: current.status,
        version: current.version,
        layerCount: current.layers.length,
        boundaryCount: current.boundaries.length,
        thinLayerCleanupCount: current.thinLayerCleanupHistory?.length ?? 0,
        layerSimplificationCount: current.layerSimplificationHistory?.length ?? 0,
        manualMergeCount: current.manualMergeHistory?.length ?? 0,
        layers: structuredClone(current.layers),
        boundaries: structuredClone(current.boundaries),
        checkRunId: current.input.checkRunId,
        inputWithoutCheckRun: {
          pointId: current.input.pointId,
          draftId: current.input.draftId,
          batchId: current.input.batchId,
          revisions: { ...current.input.revisions },
        },
      } : null,
    };
  }, projectName);
}

async function readProjectStratificationStates(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    return {
      activePointId: project.activePointId,
      points: project.points.map((point) => {
        const workspace = point.stratificationWorkspace;
        const current = workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId) ?? null;
        return {
          pointId: point.pointId,
          pointName: point.pointName,
          artifactStatus: point.stratificationState.status,
          parameterStatus: point.parameterState.status,
          outputStatus: point.outputState.status,
          parameterSourceSchemeId: point.parameterState.sourceStratificationSchemeId ?? null,
          outputSourceSchemeId: point.outputState.sourceStratificationSchemeId ?? null,
          parameterSourceRevisionId: point.parameterState.sourceStratificationRevisionId ?? null,
          outputSourceRevisionId: point.outputState.sourceStratificationRevisionId ?? null,
          schemeCount: workspace?.schemes.length ?? 0,
          staleCount: workspace?.schemes.filter((scheme) => scheme.status === 'stale').length ?? 0,
          currentStatus: current?.status ?? null,
          currentSchemeId: current?.schemeId ?? null,
          currentRevisionId: workspace?.revisions?.find((revision) => revision.schemeId === current?.schemeId && revision.version === current?.version)?.revisionId ?? null,
          layerCount: current?.layers.length ?? 0,
          checkRunId: point.checkState.activeRunId,
          schemeCheckRunId: current?.input.checkRunId ?? null,
          revisions: structuredClone(workspace?.revisions ?? []),
        };
      }),
    };
  }, projectName);
}

async function readLayout(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="workbench-root"]');
    const documentNode = document.querySelector('[data-testid="stratification-document"]');
    const editor = document.querySelector('[data-testid="stratification-editor"]');
    const layerTableWrap = document.querySelector('[data-testid="stratification-layer-table"]')?.closest('.point-table-wrap');
    const right = document.querySelector('[data-testid="right-panel"]');
    const numericCells = Array.from(document.querySelectorAll('[data-testid="stratification-layer-table"] tbody td:nth-child(2)'));
    const rect = root?.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      workbenchInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      activeDocumentOverflowX: documentNode ? Math.max(0, documentNode.scrollWidth - documentNode.clientWidth) : 0,
      editorOverflowX: editor ? Math.max(0, editor.scrollWidth - editor.clientWidth) : 0,
      layerTableOverflowX: layerTableWrap ? Math.max(0, layerTableWrap.scrollWidth - layerTableWrap.clientWidth) : 0,
      clippedNumericLayerCells: numericCells.filter((cell) => cell.scrollWidth > cell.clientWidth + 1).length,
      rightPanelOverflowX: right ? Math.max(0, right.scrollWidth - right.clientWidth) : 0,
    };
  });
}

async function confirmPendingLayers(page: Page) {
  await confirmPendingStratificationLayers(page, '粉砂');
}

async function commitStratificationRevision(page: Page) {
  await page.getByTestId('stratification-save').click();
  const finalDialog = page.getByTestId('stratification-finalize-guide-dialog');
  await expect(finalDialog).toBeVisible();
  await page.getByTestId('stratification-guide-generate-revision').click();
  await expect(finalDialog).toHaveCount(0);
  await expect(page.getByTestId('stratification-save')).toBeHidden({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const current = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
    return { dirty: workspace?.editSession?.dirty ?? false, currentStatus: current?.status ?? null };
  }), { timeout: 30_000 }).toEqual({ dirty: false, currentStatus: 'current' });
}

async function capture(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('[data-testid="active-document"]').evaluate((element) => element.scrollTo({ top: 0, left: 0 }));
    const layout = await readLayout(page);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.editorOverflowX).toBeLessThanOrEqual(1);
    expect(layout.layerTableOverflowX).toBeLessThanOrEqual(1);
    expect(layout.clippedNumericLayerCells).toBe(0);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    layouts.push(layout);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureProcess092(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await readLayout(page);
    expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.workbenchInsideViewport).toBe(true);
    layouts.push(layout);
    if (evidenceEnabled) {
      mkdirSync(process092EvidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(process092EvidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function readDenseViewLayout(page: Page) {
  return page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('[data-testid="stratification-layer-track"]');
    const column = track?.querySelector<HTMLElement>('.editable-layer-column');
    const svg = document.querySelector<SVGElement>('[data-testid="stratification-qc-curve"] .jts-linked-track[data-channel="qc"] svg');
    const plot = document.querySelector<HTMLElement>('[data-testid="stratification-shared-plot"]');
    const callout = document.querySelector<HTMLElement>('[data-testid="stratification-selected-layer-callout"]');
    const selectedLayerBlock = column?.querySelector<HTMLElement>('.editable-layer-block.selected');
    const selectedBand = document.querySelector<SVGGraphicsElement>('[data-testid="stratification-qc-curve"] .jts-linked-track[data-channel="qc"] .jts-selected-layer-band');
    const selectedLocator = document.querySelector<SVGGraphicsElement>('[data-testid="stratification-qc-curve"] .jts-linked-track[data-channel="qc"] .jts-selected-layer-locator');
    const overlay = document.querySelector<HTMLElement>('[data-testid="stratification-shared-boundary-overlay"]');
    const curveDepthLabels = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="stratification-qc-curve"] .jts-linked-depth-axis span')).map((element) => Number.parseFloat(element.textContent ?? ''));
    const labels = Array.from(document.querySelectorAll<HTMLElement>('.editable-layer-block.has-label strong')).map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
    let overlappingLayerLabelPairs = 0;
    for (let left = 0; left < labels.length; left += 1) {
      for (let right = left + 1; right < labels.length; right += 1) {
        const a = labels[left];
        const b = labels[right];
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlappingLayerLabelPairs += 1;
      }
    }
    const columnRect = column?.getBoundingClientRect() ?? null;
    const svgRect = svg?.getBoundingClientRect() ?? null;
    const calloutRect = callout?.getBoundingClientRect() ?? null;
    const selectedLayerRect = selectedLayerBlock?.getBoundingClientRect() ?? null;
    const selectedBandRect = selectedBand?.getBoundingClientRect() ?? null;
    const depthFromM = Number(track?.dataset.depthFrom ?? Number.NaN);
    const depthToM = Number(track?.dataset.depthTo ?? Number.NaN);
    return {
      layerCount: document.querySelectorAll('[data-testid="stratification-layer-table"] button').length,
      visibleLayerCount: column?.querySelectorAll('.editable-layer-block').length ?? 0,
      compactLayerCount: column?.querySelectorAll('.editable-layer-block.compact').length ?? 0,
      visibleLayerLabelCount: labels.length,
      visibleLayerTextCount: labels.length + (calloutRect && calloutRect.width > 0 && calloutRect.height > 0 ? 1 : 0),
      sharedBoundaryCount: overlay?.querySelectorAll('.shared-boundary-line').length ?? 0,
      overlappingLayerLabelPairs,
      depthFromM,
      depthToM,
      curveDepthFromM: curveDepthLabels[0] ?? Number.NaN,
      curveDepthToM: curveDepthLabels[2] ?? Number.NaN,
      depthSpanM: depthToM - depthFromM,
      plotHeight: plot?.getBoundingClientRect().height ?? 0,
      sharedAxisTopError: columnRect && svgRect ? Math.abs(svgRect.top - (columnRect.top + 1)) : Number.POSITIVE_INFINITY,
      sharedAxisBottomError: columnRect && svgRect ? Math.abs(svgRect.bottom - (columnRect.bottom - 1)) : Number.POSITIVE_INFINITY,
      sharedBoundaryLeftError: overlay && svgRect ? Math.abs(overlay.getBoundingClientRect().left - svgRect.left) : Number.POSITIVE_INFINITY,
      sharedBoundaryLeftDelta: overlay && svgRect ? overlay.getBoundingClientRect().left - svgRect.left : Number.POSITIVE_INFINITY,
      sharedBoundaryRightError: overlay && columnRect ? Math.abs(overlay.getBoundingClientRect().right - columnRect.right) : Number.POSITIVE_INFINITY,
      selectedBandTopError: selectedLayerRect && selectedBandRect ? Math.abs(selectedLayerRect.top - selectedBandRect.top) : Number.POSITIVE_INFINITY,
      selectedBandBottomError: selectedLayerRect && selectedBandRect ? Math.abs(selectedLayerRect.bottom - selectedBandRect.bottom) : Number.POSITIVE_INFINITY,
      selectedBandSvgHeight: Number(selectedBand?.getAttribute('height') ?? Number.NaN),
      selectedLocatorY: Number(selectedLocator?.getAttribute('y1') ?? Number.NaN),
      selectedLocatorStrokeWidth: selectedLocator ? Number.parseFloat(getComputedStyle(selectedLocator).strokeWidth) : Number.NaN,
      selectedCalloutInsideColumn: Boolean(columnRect && calloutRect && calloutRect.left >= columnRect.left - 1 && calloutRect.right <= columnRect.right + 1 && calloutRect.top >= columnRect.top - 1 && calloutRect.bottom <= columnRect.bottom + 1),
    };
  });
}

async function readRealBoundaryGeometry(page: Page) {
  return page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.editable-layer-block'))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .sort((left, right) => left.top - right.top);
    const lines = Array.from(document.querySelectorAll<HTMLElement>('.shared-boundary-line'))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0);
    const seamErrors = lines.map((line, index) => {
      const upper = blocks[index];
      const lower = blocks[index + 1];
      if (!upper || !lower) return Number.POSITIVE_INFINITY;
      return Math.max(Math.abs(line.top - upper.bottom), Math.abs(line.top - lower.top));
    });
    const selectedLine = document.querySelector<HTMLElement>('.shared-boundary-line.selected')?.getBoundingClientRect() ?? null;
    const marker = document.querySelector<HTMLElement>('.editable-boundary-marker.selected')?.getBoundingClientRect() ?? null;
    return {
      layerCount: blocks.length,
      visibleBoundaryCount: lines.length,
      maxSeamErrorPx: seamErrors.length ? Math.max(...seamErrors) : 0,
      markerLineErrorPx: selectedLine && marker ? Math.abs(selectedLine.top - (marker.top + 5)) : 0,
    };
  });
}

async function captureProcess093(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId('stratification-shared-plot').scrollIntoViewIfNeeded();
    const pageLayout = await readLayout(page);
    const denseLayout = await readDenseViewLayout(page);
    expect(pageLayout.documentOverflowX).toBeLessThanOrEqual(1);
    expect(pageLayout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(pageLayout.editorOverflowX).toBeLessThanOrEqual(1);
    expect(denseLayout.sharedAxisTopError).toBeLessThanOrEqual(1);
    expect(denseLayout.sharedAxisBottomError).toBeLessThanOrEqual(1);
    expect(denseLayout.overlappingLayerLabelPairs).toBe(0);
    layouts.push({ viewport, pageLayout, denseLayout });
    if (evidenceEnabled) {
      mkdirSync(process093EvidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(process093EvidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureProcess104(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId('stratification-inline-split-form').scrollIntoViewIfNeeded();
    const layout = await readLayout(page);
    const splitForm = await page.getByTestId('stratification-inline-split-form').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { visible: rect.width > 0 && rect.height > 0, width: rect.width, right: rect.right, viewportWidth: window.innerWidth };
    });
    expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    expect(splitForm.visible).toBe(true);
    expect(splitForm.right).toBeLessThanOrEqual(splitForm.viewportWidth + 1);
    layouts.push({ viewport, layout, splitForm });
    if (process104EvidenceEnabled) {
      mkdirSync(process104EvidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(process104EvidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureProcess105(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId('stratification-shared-plot').scrollIntoViewIfNeeded();
    const layout = await readLayout(page);
    const geometry = await readRealBoundaryGeometry(page);
    expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    expect(geometry.visibleBoundaryCount).toBe(Math.max(0, geometry.layerCount - 1));
    expect(geometry.maxSeamErrorPx).toBeLessThanOrEqual(1);
    layouts.push({ viewport, layout, geometry });
    if (process105EvidenceEnabled) {
      mkdirSync(process105EvidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(process105EvidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureTarget(page: Page, name: string, testId: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId(testId).scrollIntoViewIfNeeded();
    const layout = await readLayout(page);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.editorOverflowX).toBeLessThanOrEqual(1);
    expect(layout.layerTableOverflowX).toBeLessThanOrEqual(1);
    expect(layout.clippedNumericLayerCells).toBe(0);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    layouts.push(layout);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function openNewSchemeChoice(page: Page) {
  if (await page.getByTestId('right-panel-show').isVisible().catch(() => false)) {
    await page.getByTestId('right-panel-show').click();
  }
  await page.getByTestId('right-panel-tools-tab').click();
  await page.getByTestId('stratification-create-scheme').click();
}

async function writeEvidence(flow: string, csv: string, payload: Record<string, unknown>) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(join(evidenceDirectory, `${flow}.csv`), csv, 'utf8');
  writeFileSync(join(evidenceDirectory, `${flow}-run.json`), JSON.stringify({ flow, sourceFingerprint: createHash('sha256').update(csv).digest('hex'), ...payload }, null, 2), 'utf8');
}

async function writeProcess092Evidence(name: string, payload: Record<string, unknown>) {
  if (!evidenceEnabled) return;
  mkdirSync(process092EvidenceDirectory, { recursive: true });
  writeFileSync(join(process092EvidenceDirectory, name), JSON.stringify(payload, null, 2), 'utf8');
}

async function writeProcess093Evidence(name: string, payload: Record<string, unknown>) {
  if (!evidenceEnabled) return;
  mkdirSync(process093EvidenceDirectory, { recursive: true });
  writeFileSync(join(process093EvidenceDirectory, name), JSON.stringify(payload, null, 2), 'utf8');
}
