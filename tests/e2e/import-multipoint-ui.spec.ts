import { completePreparationGuide } from './fixtures/guidedPreparation';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'import-multipoint-ui');
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
  const layout = await readLayout(page);
  expect(layout.documentOverflowX).toBeLessThanOrEqual(1);
  expect(layout.workbenchInsideViewport).toBe(true);
});

test('FLOW-D-01 splits three points, resolves one conflict, and preserves independent checks', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `多点生成 ${seed}`;
  const pointA = `A-${seed}`;
  const pointB = `B-${seed}`;
  const pointC = `C-${seed}`;
  await createProject(page, projectName);
  const single = writeCsv(testInfo, `single-${seed}.csv`, standardCsv([[pointA, 0.5], [pointA, 1.0]]));
  await uploadCsv(page, single);
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();

  await page.getByTestId('explorer-import').click();
  const multiCsv = standardCsv([
    [pointA, 0.5], [pointB, 0.5], [pointC, 0.5],
    [pointA, 1.0], [pointB, 1.0], [pointC, 1.0],
  ]);
  const multi = writeCsv(testInfo, `multi-${seed}.csv`, multiCsv);
  await uploadCsv(page, multi);
  await expect(page.getByTestId('import-point-plan')).toBeVisible();
  await expect(page.locator('[data-testid^="point-plan-row-"]')).toHaveCount(3);
  await page.getByTestId('point-plan-split-all').click();
  const rowA = page.locator('[data-testid^="point-plan-row-"]').filter({ hasText: pointA });
  await expect(rowA).toContainText('待决定');
  await rowA.click();
  await page.getByTestId('point-target-action').selectOption('append-draft');
  await page.getByTestId('confirm-point-target').click();
  await expect(rowA).toContainText('追加新草稿');
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeEnabled();
  await expect(page.getByTestId('import-point-plan').getByRole('button', { name: /生成.*点位草稿/ })).toHaveCount(0);
  const readyLayoutByViewport = await readLayoutAtViewports(page);
  await captureTop(page, 'flow-d-01-ready');
  await captureSection(page, 'flow-d-01-conflict-resolved', 'import-point-plan');

  await page.getByTestId('generate-point-drafts-primary').click();
  await expect(page.getByTestId('point-plan-summary')).toContainText('3 个');
  await expect(page.locator('[data-testid^="point-plan-row-"]').filter({ hasText: '已生成' })).toHaveCount(3);
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await captureSection(page, 'flow-d-01-generated', 'import-point-plan');

  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();
  const state = await readProjectState(page, projectName);
  expect(state.pointCount).toBe(3);
  expect(state.points.map((point) => point.pointName)).toEqual([pointA, pointB, pointC]);
  expect(state.points.find((point) => point.pointName === pointA)).toMatchObject({ draftCount: 2, checkCount: 2, rowCount: 2 });
  expect(state.points.find((point) => point.pointName === pointB)).toMatchObject({ draftCount: 1, checkCount: 0, rowCount: 2 });
  expect(state.points.find((point) => point.pointName === pointC)).toMatchObject({ draftCount: 1, checkCount: 0, rowCount: 2 });
  const generatedSourceRows = state.points.map((point) => point.sourceRowIds);
  expect(generatedSourceRows.every((rowIds) => rowIds.length === 2 && new Set(rowIds).size === 2)).toBe(true);
  expect(new Set(generatedSourceRows.flat()).size).toBe(6);
  expect(state.points.every((point) => point.provenanceSourceFields.includes('depthM'))).toBe(true);
  expect(state.points.every((point) => point.valueProvenance.depthM?.origin === 'source')).toBe(true);
  expect(state.points.every((point) => point.valueProvenance.depthM?.sourceColumnId)).toBeTruthy();
  expect(state.points.every((point) => point.valueProvenance.depthM?.sourceUnit === 'm' && point.valueProvenance.depthM?.standardUnit === 'm')).toBe(true);
  expect(state.activeBatch?.mappings.filter((mapping) => mapping.requiredLevel === 'required').every((mapping) => mapping.state === 'confirmed')).toBe(true);
  expect(state.activeBatch?.unitDecisions.every((unit) => ['confirmed', 'not-applicable'].includes(unit.state))).toBe(true);
  expect(state.activeBatch?.targetDecisions).toHaveLength(3);
  expect(state.points.find((point) => point.pointName === pointA)?.checkInput?.draftId).toBe(
    state.points.find((point) => point.pointName === pointA)?.activeDraftId,
  );

  await page.getByTestId('explorer-project').click();
  await page.locator('[data-testid^="project-point-"]').filter({ hasText: pointB }).click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('water-guide-dialog').getByRole('button', { name: '暂不确认' }).last().click();
  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('check-first-look')).toContainText('未检查');
  const afterSwitch = await readProjectState(page, projectName);
  expect(afterSwitch.points.find((point) => point.pointName === pointA)?.checkCount).toBe(2);
  expect(afterSwitch.points.find((point) => point.pointName === pointB)?.checkCount).toBe(0);

  await writeEvidence('flow-d-01', multiCsv, {
    seed,
    steps: ['create-existing-point', 'upload-three-points', 'split-all', 'append-a-draft', 'generate-three', 'check-a', 'switch-b'],
    expected: { pointCount: 3, rowsPerPoint: 2, checks: { [pointA]: 2, [pointB]: 0, [pointC]: 0 } },
    actual: afterSwitch,
    browserErrors: browserErrors.get(page) ?? [],
    readyLayoutByViewport,
    layoutByViewport: await readLayoutAtViewports(page),
  });
});

test('FLOW-D-02 cancelling a split preserves every existing point state', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `取消拆分 ${seed}`;
  const pointA = `KEEP-${seed}`;
  await createProject(page, projectName);
  const single = writeCsv(testInfo, `keep-${seed}.csv`, standardCsv([[pointA, 0.5], [pointA, 1.0]]));
  await uploadCsv(page, single);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-import').click();
  const beforeUpload = await readCanonicalExistingPoints(page, projectName);
  const multiCsv = standardCsv([[`N1-${seed}`, 0.5], [`N2-${seed}`, 0.5], [`N1-${seed}`, 1], [`N2-${seed}`, 1]]);
  const multi = writeCsv(testInfo, `cancel-${seed}.csv`, multiCsv);
  await uploadCsv(page, multi);
  const afterUpload = await readCanonicalExistingPoints(page, projectName);
  expect(afterUpload).toEqual(beforeUpload);
  const batchBeforeCancel = await readCandidateBatchCanonical(page, projectName);
  await page.getByTestId('cancel-point-plan').click();
  await expect(page.getByTestId('cancel-point-plan-confirmation')).toBeVisible();
  await page.getByTestId('confirm-cancel-point-plan').click();
  await expect(page.getByTestId('import-first-look')).toContainText('已取消');
  const after = await readCanonicalExistingPoints(page, projectName);
  expect(after).toEqual(beforeUpload);
  const batchAfterCancel = await readCandidateBatchCanonical(page, projectName);
  expect(batchAfterCancel).toEqual(batchBeforeCancel);
  const cancelled = await readProjectState(page, projectName);
  expect(cancelled.activeBatch?.workflowState).toBe('cancelled');
  expect(cancelled.pointCount).toBe(1);
  await expect(page.getByTestId('cancel-point-plan')).toHaveCount(0);
  await expect(page.getByTestId('point-decision-actions')).toHaveCount(0);
  await page.getByRole('button', { name: '返回字段工具' }).click();
  await expect(page.getByTestId('import-readiness-dock')).toContainText('已冻结');
  await expect(page.getByTestId('import-mapping-editor-dock')).toHaveCount(0);
  await expect(page.getByTestId('run-data-check-dock')).toHaveCount(0);
  await captureTop(page, 'flow-d-02-cancelled-top');
  await captureSection(page, 'flow-d-02-cancelled', 'import-point-plan');
  await page.getByTestId('reopen-point-plan').click();
  await expect(page.getByTestId('point-plan-split-all')).toHaveClass(/active/);

  await writeEvidence('flow-d-02', multiCsv, {
    seed,
    steps: ['create-checked-point', 'upload-multi', 'cancel-confirm', 'compare-existing-state', 'reopen'],
    existingStateBeforeUpload: beforeUpload,
    existingStateAfterUpload: afterUpload,
    existingStateAfter: after,
    candidateBatchBeforeCancel: batchBeforeCancel,
    candidateBatchAfterCancel: batchAfterCancel,
    batchAfterCancel: cancelled.activeBatch,
    browserErrors: browserErrors.get(page) ?? [],
    layoutByViewport: await readLayoutAtViewports(page),
  });
});

test('FLOW-D-03 generates only clean points and leaves the problem point in the batch', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `部分生成 ${seed}`;
  const pointA = `PA-${seed}`;
  const pointB = `PB-${seed}`;
  const pointC = `PC-${seed}`;
  await createProject(page, projectName);
  const csv = standardCsv([
    [pointA, 0.5], [pointB, 0.5], [pointC, 1.0],
    [pointA, 1.0], [pointB, 1.0], [pointC, 0.8],
  ]);
  const input = writeCsv(testInfo, `partial-${seed}.csv`, csv);
  await uploadCsv(page, input);
  const rowC = page.locator('[data-testid^="point-plan-row-"]').filter({ hasText: pointC });
  await expect(rowC).toContainText('1 个问题');
  await page.getByTestId('point-plan-split-selected').click();
  await expect(page.getByTestId('point-plan-summary')).toContainText('2 个');
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeEnabled();
  await page.getByTestId('generate-point-drafts-primary').click();
  await expect.poll(() => readProjectState(page, projectName)).toMatchObject({ pointCount: 2 });
  const state = await readProjectState(page, projectName);
  expect(state.pointCount).toBe(2);
  expect(state.points.map((point) => point.pointName)).toEqual([pointA, pointB]);
  expect(state.activeBatch?.workflowState).toBe('partially-generated');
  expect(state.activeBatch?.executions).toEqual([
    { pointKey: pointA.toLocaleLowerCase(), status: 'generated' },
    { pointKey: pointB.toLocaleLowerCase(), status: 'generated' },
    { pointKey: pointC.toLocaleLowerCase(), status: 'problem' },
  ]);
  await expect(rowC).toContainText('1 个问题');
  await expect(page.getByTestId('import-first-look')).toContainText('另有 1 个点位待处理');
  await expect(page.getByTestId('document-import').locator('.analysis-title-row')).toContainText('剩余点位 1 个');
  await expect(page.getByTestId('point-decision-dock')).toContainText(pointC);
  await expect(page.getByTestId('point-problem-dock')).toContainText('深度不递增');
  const probeDialog = page.getByTestId('probe-guide-dialog');
  if (await probeDialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '暂不确认' }).last().click();
  }
  await captureTop(page, 'flow-d-03-partially-generated-top');
  await captureSection(page, 'flow-d-03-partially-generated', 'import-point-plan', 'point-problem-dock');
  await page.getByTestId('point-problem-dock').getByRole('button', { name: '定位字段或源行' }).click();
  await expect(page.getByTestId('import-source-problem-dock')).toContainText('深度');

  await writeEvidence('flow-d-03', csv, {
    seed,
    steps: ['upload-one-problem-point', 'select-clean-points', 'generate-two', 'preserve-problem-point'],
    oracle: { generated: [pointA, pointB], problem: pointC, rowsPerPoint: 2 },
    actual: state,
    browserErrors: browserErrors.get(page) ?? [],
    layoutByViewport: await readLayoutAtViewports(page),
  });
});

test('FLOW-D-04 rejects a stale plan and succeeds once after refresh', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `版本冲突 ${seed}`;
  const pointA = `RA-${seed}`;
  const pointB = `RB-${seed}`;
  await createProject(page, projectName);
  const csv = standardCsv([[pointA, 0.5], [pointB, 0.5], [pointA, 1], [pointB, 1]]);
  const input = writeCsv(testInfo, `retry-${seed}.csv`, csv);
  await uploadCsv(page, input);
  await page.getByTestId('point-plan-split-all').click();
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeEnabled();
  await advanceWorkspaceExternally(page, projectName);
  await page.getByTestId('generate-point-drafts-primary').click();
  await expect(page.getByTestId('project-storage-workspace-notice')).toContainText('另一个标签页已更新');
  await expect(page.getByTestId('refresh-point-plan')).toBeVisible();
  await expect(page.getByTestId('point-plan-split-all')).toBeDisabled();
  await expect(page.getByTestId('point-target-action')).toBeDisabled();
  await expect(page.getByTestId('point-plan-summary')).toContainText('待重新确认');
  await expect(page.locator('[data-testid^="point-plan-row-"]').filter({ hasText: '待重新确认' })).toHaveCount(2);
  const rejected = await readProjectState(page, projectName);
  expect(rejected.pointCount).toBe(0);
  expect(rejected.activeBatch?.generatedDraftIds).toEqual([]);
  await captureTop(page, 'flow-d-04-stale-rejected-top');
  await captureSection(page, 'flow-d-04-stale-rejected', 'import-point-plan');

  await page.getByTestId('refresh-point-plan').click();
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeEnabled();
  await page.getByTestId('generate-point-drafts-primary').click();
  await expect(page.getByTestId('generate-point-drafts-primary')).toBeHidden({ timeout: 30_000 });
  const generated = await expect.poll(() => readProjectState(page, projectName)).toMatchObject({ pointCount: 2 }).then(() => readProjectState(page, projectName));
  expect(generated.pointCount).toBe(2);
  expect(generated.activeBatch?.generatedDraftIds).toHaveLength(2);
  expect(new Set(generated.activeBatch?.generatedDraftIds).size).toBe(2);
  await capture(page, 'flow-d-04-retry-generated');

  await writeEvidence('flow-d-04', csv, {
    seed,
    steps: ['prepare-ready-plan', 'external-revision-change', 'reject-stale-plan', 'reload', 'generate-once'],
    rejected,
    generated,
    browserErrors: browserErrors.get(page) ?? [],
    layoutByViewport: await readLayoutAtViewports(page),
  });
});

async function createProject(page: Page, projectName: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
}

async function uploadCsv(page: Page, path: string) {
  await page.getByTestId('import-file-input').setInputFiles(path);
  await expect(page.getByTestId('import-active-batch-name')).not.toHaveText('尚未导入数据');
  await expect.poll(() => page.evaluate(async (fileName) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.importBatches.some((batch) => batch.kind === 'draft' && batch.source.fileName === fileName));
    const batch = project?.importBatches.find((candidate) => candidate.kind === 'draft' && candidate.source.fileName === fileName);
    return batch?.kind === 'draft' ? batch.source.fileName : null;
  }, basename(path))).toBe(basename(path));
}

function writeCsv(testInfo: TestInfo, fileName: string, csv: string) {
  const path = testInfo.outputPath(fileName);
  writeFileSync(path, csv, 'utf8');
  return path;
}

function standardCsv(rows: Array<[string, number]>) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...rows.map(([pointName, depth], index) => [
      pointName,
      depth.toFixed(2),
      900 + index * 80,
      980 + index * 80,
      12 + index,
      60 + index * 5,
      '1.20',
      '12.4',
      '3.0',
    ].join(',')),
  ].join('\n');
}

function randomSeed() {
  return String(Date.now() % 100000000).padStart(8, '0');
}

async function readProjectState(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    const blockById = new Map(loaded.dataBlocks.map((block) => [block.dataBlockId, block]));
    const activeBatch = project.importBatches.find((batch) => batch.batchId === project.activeImportBatchId);
    return {
      projectId: project.projectId,
      workspaceRevision: project.workspaceRevision,
      pointCount: project.points.length,
      activePointId: project.activePointId,
      points: project.points.map((point) => {
        const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId) ?? point.importDrafts[0];
        const block = draft ? blockById.get(draft.dataBlockId) : null;
        const activeRun = point.checkState.runs.find((run) => run.runId === point.checkState.activeRunId) ?? null;
        return {
          pointId: point.pointId,
          pointName: point.pointName,
          draftCount: point.importDrafts.length,
          activeDraftId: point.activeImportDraftId,
          checkCount: point.checkState.runs.length,
          checkStatus: point.checkState.artifact.status,
          rowCount: draft?.sourceRowIds.length ?? 0,
          sourceRowIds: draft ? [...draft.sourceRowIds] : [],
          sourcePointName: draft?.sourcePointName ?? null,
          provenanceSourceFields: draft ? Object.keys(draft.valueProvenance).sort() : [],
          valueProvenance: draft ? structuredClone(draft.valueProvenance) : {},
          normalizedBlockRowCount: block?.kind === 'normalized' ? block.rows.length : 0,
          checkInput: activeRun ? structuredClone(activeRun.input) : null,
        };
      }),
      activeBatch: activeBatch?.kind === 'draft' ? {
        batchId: activeBatch.batchId,
        workflowState: activeBatch.workflowState,
        generatedDraftIds: [...activeBatch.generatedDraftIds],
        revisions: { ...activeBatch.revisions },
        mappings: activeBatch.mappings.map((mapping) => ({
          targetField: mapping.targetField,
          sourceColumnId: mapping.sourceColumnId,
          state: mapping.state,
        })),
        unitDecisions: activeBatch.unitDecisions.map((unit) => ({
          targetField: unit.targetField,
          sourceColumnId: unit.sourceColumnId,
          selectedUnit: unit.selectedUnit,
          standardUnit: unit.standardUnit,
          state: unit.state,
          conversion: unit.conversion ? { ...unit.conversion } : null,
        })),
        targetDecisions: activeBatch.pointPlan.targetDecisions?.map((decision) => ({ ...decision })) ?? [],
        executions: activeBatch.pointPlan.executions.map((execution) => ({ pointKey: execution.detectedPointKey, status: execution.status })),
      } : null,
    };
  }, projectName);
}

async function readCanonicalExistingPoints(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    return project.points.map((point) => ({
      pointId: point.pointId,
      pointName: point.pointName,
      aliases: [...point.aliases],
      activeImportDraftId: point.activeImportDraftId,
      importDrafts: point.importDrafts.map((draft) => ({
        draftId: draft.draftId,
        batchId: draft.batchId,
        sourceRowIds: [...draft.sourceRowIds],
        revisions: { ...draft.revisions },
        status: draft.status,
      })),
      checkState: point.checkState,
      stratificationState: point.stratificationState,
      parameterState: point.parameterState,
      outputState: point.outputState,
    }));
  }, projectName);
}

async function readCandidateBatchCanonical(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    if (!batch || batch.kind !== 'draft') throw new Error('Active draft batch not found.');
    return {
      revisions: { ...batch.revisions },
      selectedPointKeys: [...batch.pointPlan.selectedPointKeys],
      targetDecisions: batch.pointPlan.targetDecisions?.map((decision) => structuredClone(decision)) ?? [],
      executions: batch.pointPlan.executions.map((execution) => structuredClone(execution)),
      mappings: batch.mappings.map((mapping) => structuredClone(mapping)),
      unitDecisions: batch.unitDecisions.map((unit) => structuredClone(unit)),
    };
  }, projectName);
}

async function advanceWorkspaceExternally(page: Page, projectName: string) {
  await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) throw new Error(loaded.detail);
      const now = new Date().toISOString();
      const manifest = {
        ...loaded.manifest,
        manifestRevision: loaded.manifest.manifestRevision + 1,
        savedAt: now,
        state: {
          ...loaded.manifest.state,
          projects: loaded.manifest.state.projects.map((project) => project.projectName === name
            ? { ...project, workspaceRevision: project.workspaceRevision + 1, updatedAt: now }
            : project),
        },
      };
      const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, {
        expectedManifestRevision: loaded.manifest.manifestRevision,
      });
      if (saved.ok) return;
      if (!saved.detail.includes('Expected manifest revision')) throw new Error(saved.detail);
    }
    throw new Error('Could not create the external revision after three current-state retries.');
  }, projectName);
}

async function readLayout(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="workbench-root"]');
    const rightPanel = document.querySelector('[data-testid="right-panel"]');
    const pointPlan = document.querySelector('[data-testid="import-point-plan"]');
    const pointTableWrap = pointPlan?.querySelector('.point-table-wrap');
    const rect = root?.getBoundingClientRect();
    const rightRect = rightPanel?.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      workbenchInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      workbench: rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null,
      rightPanel: rightRect ? { left: rightRect.left, right: rightRect.right, width: rightRect.width, height: rightRect.height } : null,
      pointPlanTable: pointTableWrap ? {
        clientWidth: pointTableWrap.clientWidth,
        scrollWidth: pointTableWrap.scrollWidth,
        overflowX: Math.max(0, pointTableWrap.scrollWidth - pointTableWrap.clientWidth),
      } : null,
    };
  });
}

async function readLayoutAtViewports(page: Page) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(50);
    layouts.push(await readLayout(page));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureTop(page: Page, name: string) {
  if (!evidenceEnabled) return;
  await page.locator('[data-testid="active-document"]').evaluate((element) => element.scrollTo({ top: 0, left: 0 }));
  const rightPanel = page.locator('[data-testid="right-panel"]');
  if (await rightPanel.count()) await rightPanel.evaluate((element) => element.scrollTo({ top: 0, left: 0 }));
  await capture(page, name);
}

async function captureSection(page: Page, name: string, sectionTestId: string, dockTestId?: string) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId(sectionTestId).scrollIntoViewIfNeeded();
    if (dockTestId && await page.getByTestId(dockTestId).count()) {
      await page.getByTestId(dockTestId).scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function capture(page: Page, name: string) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: join(evidenceDirectory, `${name}-1440x900.png`), fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: join(evidenceDirectory, `${name}-1920x1080.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function writeEvidence(flow: string, csv: string, payload: Record<string, unknown>) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  const sourceFingerprint = createHash('sha256').update(csv).digest('hex');
  writeFileSync(join(evidenceDirectory, `${flow}.csv`), csv, 'utf8');
  writeFileSync(join(evidenceDirectory, `${flow}-parsed-import-result.json`), JSON.stringify({ sourceFingerprint, sourceRowCount: csv.split('\n').length - 1 }, null, 2), 'utf8');
  writeFileSync(join(evidenceDirectory, `${flow}-run.json`), JSON.stringify({ flow, sourceFingerprint, ...payload }, null, 2), 'utf8');
}
