import { completePreparationGuide } from './fixtures/guidedPreparation';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'check-handoff-ui');
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

test('FLOW-E-01 blocks an unchecked point and allows a current notice-only result into stratification', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `检查交接 ${seed}`;
  const pointName = `E1-${seed}`;
  const csv = standardCsv([
    [pointName, 0.5, 920],
    [pointName, 1.0, 1080],
  ]);
  await createProject(page, projectName);
  await uploadCsv(page, writeCsv(testInfo, `flow-e-01-${seed}.csv`, csv));
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();
  const uncheckedLayouts = await capture(page, 'flow-e-01-guided-check');
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成，可进入地层分层');
  await expect(page.getByTestId('explorer-stratification')).toHaveAttribute('data-handoff-state', 'warn');
  await expect(page.getByTestId('check-current-input')).not.toContainText('尚未形成');
  await expect(page.getByTestId('check-current-revisions')).toContainText('标准化');
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '当前依据');
  const layouts = await capture(page, 'flow-e-01-current-check');
  const dependencyLayouts = await captureSection(page, 'flow-e-01-current-dependency', 'check-scope');
  await page.getByTestId('check-filter-passed').click();
  await page.getByTestId('check-issue-check-required-fields').click();
  await expect(page.getByTestId('dock-return-import')).toHaveCount(0);
  const passedDockLayouts = await captureSection(page, 'flow-e-01-passed-dock', 'right-panel');

  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  const state = await readCheckWorkspaceState(page, projectName);
  expect(state.points[0]).toMatchObject({ pointName, artifactStatus: 'current', runCount: 1 });
  expect(state.points[0].activeRunInput).toEqual(state.points[0].activeDraftInput);

  await writeEvidence('flow-e-01', csv, {
    seed,
    steps: ['upload-clean-point', 'attempt-stratification', 'redirect-to-check', 'run-check', 'enter-stratification'],
    state,
    uncheckedLayouts,
    layouts,
    dependencyLayouts,
    passedDockLayouts,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

test('FLOW-E-02 locates a qc problem, uploads a corrected draft, preserves history, and recovers the gate', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `问题恢复 ${seed}`;
  const pointName = `E2-${seed}`;
  const issueCsv = standardCsv([
    [pointName, 0.5, 920],
    [pointName, 1.0, -25],
  ]);
  await createProject(page, projectName);
  await uploadCsv(page, writeCsv(testInfo, `flow-e-02-issue-${seed}.csv`, issueCsv));
  await completePreparationGuide(page);

  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题');
  await expect(page.getByTestId('check-issue-check-qc-positive')).toBeVisible();
  await expect(page.getByTestId('check-evidence-rows')).toContainText('-25');
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '当前依据');
  const problemLayouts = await capture(page, 'flow-e-02-problem-before-recovery');
  await page.getByTestId('check-locate-in-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.getByTestId('mapping-row-qckpa')).toHaveClass(/selected/);
  await expect(page.getByTestId('import-field-source-row-3')).toHaveClass(/source-row-focus/);
  await expect(page.getByTestId('flow-toast')).toContainText('qc 第 3 行');
  const sourceRowRecoveryLayouts = await captureSection(page, 'flow-e-02-source-row-recovery', 'import-selected-field-preview');

  const beforeCorrection = await readCheckWorkspaceState(page, projectName);
  const correctedCsv = standardCsv([
    [pointName, 0.5, 920],
    [pointName, 1.0, 1120],
  ]);
  await uploadCsv(page, writeCsv(testInfo, `flow-e-02-corrected-${seed}.csv`, correctedCsv));
  const afterCorrection = await readCheckWorkspaceState(page, projectName);
  expect(afterCorrection.activeImportBatchId).not.toBe(beforeCorrection.activeImportBatchId);
  expect(afterCorrection.points[0].artifactStatus).toBe('stale');
  expect(afterCorrection.points[0].staleReason).toContain('导入源文件已变化');
  expect(afterCorrection.points[0].activeDraftId).not.toBe(beforeCorrection.points[0].activeDraftId);
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('check-first-look')).toContainText('需要重新检查');
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '失效依据');

  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成，可进入地层分层');
  await expect(page.locator('[data-testid^="check-history-row-"]')).toHaveCount(2);
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '当前依据');
  await expect(page.getByTestId('check-history-row-1')).toHaveAttribute('data-run-use', '历史');
  const layouts = await capture(page, 'flow-e-02-recovered');
  const historyLayouts = await captureSection(page, 'flow-e-02-history', 'check-run-history');
  const state = await readCheckWorkspaceState(page, projectName);
  expect(state.points[0]).toMatchObject({ artifactStatus: 'current', runCount: 2 });
  expect(state.points[0].issueIds).not.toContain('check-qc-positive');

  await writeEvidence('flow-e-02', `${issueCsv}\n--- corrected ---\n${correctedCsv}`, {
    seed,
    steps: ['upload-qc-problem', 'run-problem-check', 'locate-qc', 'upload-correction', 'invalidate-old-check', 'rerun-check'],
    beforeCorrection,
    afterCorrection,
    state,
    problemLayouts,
    sourceRowRecoveryLayouts,
    layouts,
    historyLayouts,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

test('FLOW-E-03 keeps checked, unchecked, and problem states independent across three points', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `多点检查 ${seed}`;
  const pointA = `EA-${seed}`;
  const pointB = `EB-${seed}`;
  const pointC = `EC-${seed}`;
  const csv = standardCsv([
    [pointA, 0.5, 900], [pointB, 0.5, 980], [pointC, 0.5, 1020],
    [pointA, 1.0, 1100], [pointB, 1.0, 1180], [pointC, 1.0, -30],
  ]);
  await createProject(page, projectName);
  await uploadCsv(page, writeCsv(testInfo, `flow-e-03-${seed}.csv`, csv));
  await page.getByTestId('point-plan-split-all').click();
  await page.getByTestId('generate-point-drafts-primary').click();

  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await switchPoint(page, pointB);
  await expect(page.getByTestId('check-first-look')).toContainText('尚未检查');
  await switchPoint(page, pointC);
  await expect(page.getByTestId('check-first-look')).toContainText('尚未检查');
  await page.getByTestId('explorer-import').click();
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题');
  await expect(page.getByTestId('check-evidence-rows')).toContainText('-30');
  await page.getByTestId('check-locate-in-import').click();
  await expect(page.getByTestId('import-field-source-row-7')).toHaveClass(/source-row-focus/);
  await expect(page.getByTestId('flow-toast')).toContainText('qc 第 7 行');
  const interleavedRecoveryLayouts = await captureSection(page, 'flow-e-03-interleaved-source-row', 'import-selected-field-preview');
  await switchPoint(page, pointA);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '当前依据');
  const layouts = await capture(page, 'flow-e-03-point-a-current');

  const state = await readCheckWorkspaceState(page, projectName);
  expect(state.points.find((point) => point.pointName === pointA)).toMatchObject({ artifactStatus: 'current', runCount: 1 });
  expect(state.points.find((point) => point.pointName === pointB)).toMatchObject({ artifactStatus: 'empty', runCount: 0 });
  expect(state.points.find((point) => point.pointName === pointC)).toMatchObject({ artifactStatus: 'problem', runCount: 1 });

  await writeEvidence('flow-e-03', csv, {
    seed,
    steps: ['generate-three-points', 'check-a', 'inspect-unchecked-b', 'check-problem-c', 'locate-interleaved-source-row', 'return-current-a'],
    state,
    layouts,
    interleavedRecoveryLayouts,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

test('FLOW-E-04 marks an edited unit check stale, blocks navigation, and creates a new current run', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `检查失效 ${seed}`;
  const pointName = `E4-${seed}`;
  const csv = [
    'PointName,DepthM,ConeResistance,FsKpa,FinalDepthM',
    `${pointName},0.5,1.25,12,3`,
    `${pointName},1.0,1.50,14,3`,
  ].join('\n');
  await createProject(page, projectName);
  await uploadCsv(page, writeCsv(testInfo, `flow-e-04-${seed}.csv`, csv));
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'ConeResistance' }).click();
  if (await page.getByTestId('apply-import-mapping').count()) await page.getByTestId('apply-import-mapping').click();
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'ConeResistance' }).click();
  await page.getByTestId('apply-import-unit').click();
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const beforeEdit = await readCheckWorkspaceState(page, projectName);

  await page.getByTestId('explorer-import').click();
  await page.getByTestId('open-advanced-import').click();
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'ConeResistance' }).click();
  await page.getByTestId('import-source-unit-select').selectOption('kPa');
  await page.getByTestId('apply-import-unit').click();
  await expect(page.getByTestId('import-first-look')).toContainText('需要重新检查');
  await expect(page.getByTestId('explorer-stratification')).toHaveAttribute('data-handoff-state', 'deny');
  await page.getByTestId('explorer-stratification').click();
  await expect(page.getByTestId('check-first-look')).toContainText('需要重新检查');
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-summary')).toContainText('失效原因');
  await expect(page.getByTestId('check-issue-check-import-stale')).toContainText('需重新检查');
  await expect(page.getByTestId('check-summary')).not.toContainText('问题 1 项');
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '失效依据');
  await expect(page.getByTestId('check-scope')).toContainText('失效依据');
  await expect(page.getByTestId('check-profile-curves')).toHaveCount(0);
  const staleLayouts = await capture(page, 'flow-e-04-stale');
  const staleHistoryLayouts = await captureSection(page, 'flow-e-04-stale-history', 'check-run-history');

  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await expect(page.locator('[data-testid^="check-history-row-"]')).toHaveCount(2);
  await expect(page.getByTestId('check-history-row-0')).toHaveAttribute('data-run-use', '当前依据');
  await expect(page.getByTestId('check-history-row-1')).toHaveAttribute('data-run-use', '历史');
  const currentLayouts = await capture(page, 'flow-e-04-current');
  const currentHistoryLayouts = await captureSection(page, 'flow-e-04-current-history', 'check-run-history');
  const afterRerun = await readCheckWorkspaceState(page, projectName);
  expect(afterRerun.points[0]).toMatchObject({ artifactStatus: 'current', runCount: 2 });
  expect(afterRerun.points[0].activeRunInput).toEqual(afterRerun.points[0].activeDraftInput);
  expect(afterRerun.points[0].runs[0].input.revisions.unit).not.toBe(afterRerun.points[0].runs[1].input.revisions.unit);

  await writeEvidence('flow-e-04', csv, {
    seed,
    steps: ['confirm-mpa', 'run-check', 'change-to-kpa', 'attempt-stratification', 'inspect-stale-history', 'rerun-check'],
    beforeEdit,
    afterRerun,
    staleLayouts,
    staleHistoryLayouts,
    currentLayouts,
    currentHistoryLayouts,
    browserErrors: browserErrors.get(page) ?? [],
  });
});

async function createProject(page: Page, projectName: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
}

async function uploadCsv(page: Page, path: string) {
  await page.getByTestId('import-file-input').setInputFiles(path);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(basename(path));
}

async function switchPoint(page: Page, pointName: string) {
  await page.getByTestId('explorer-project').click();
  await page.locator('[data-testid^="project-point-"]').filter({ hasText: pointName }).click();
  await expect(page.getByTestId('project-current-point')).toHaveText(pointName);
  const probeDialog = page.getByTestId('probe-guide-dialog');
  await probeDialog.waitFor({ state: 'visible', timeout: 500 }).catch(() => undefined);
  if (await probeDialog.isVisible().catch(() => false)) {
    await page.getByTestId('probe-guide-recommended').click();
    await expect(probeDialog).toBeHidden();
  }
  const waterDialog = page.getByTestId('water-guide-dialog');
  await waterDialog.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined);
  if (await waterDialog.isVisible().catch(() => false)) {
    await waterDialog.getByRole('button', { name: '暂不确认' }).last().click();
  }
  await page.getByTestId('explorer-check').click();
}

function writeCsv(testInfo: TestInfo, fileName: string, csv: string) {
  const path = testInfo.outputPath(fileName);
  writeFileSync(path, csv, 'utf8');
  return path;
}

function standardCsv(rows: Array<[string, number, number]>) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...rows.map(([pointName, depth, qc], index) => [
      pointName,
      depth.toFixed(2),
      qc,
      Math.max(1, qc + 80),
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

async function readCheckWorkspaceState(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    if (!project) throw new Error(`Project ${name} not found.`);
    return {
      projectId: project.projectId,
      activePointId: project.activePointId,
      activeRoute: project.activeRoute,
      activeImportBatchId: project.activeImportBatchId,
      points: project.points.map((point) => {
        const activeDraft = point.importDrafts.find((draft) => draft.draftId === point.activeImportDraftId) ?? null;
        const activeRun = point.checkState.runs.find((run) => run.runId === point.checkState.activeRunId) ?? null;
        return {
          pointId: point.pointId,
          pointName: point.pointName,
          activeDraftId: point.activeImportDraftId,
          activeDraftInput: activeDraft ? {
            pointId: point.pointId,
            draftId: activeDraft.draftId,
            batchId: activeDraft.batchId,
            revisions: { ...activeDraft.revisions },
          } : null,
          artifactStatus: point.checkState.artifact.status,
          staleReason: point.checkState.artifact.staleReason ?? null,
          artifactInput: point.checkState.artifact.input ? structuredClone(point.checkState.artifact.input) : null,
          activeRunId: point.checkState.activeRunId,
          activeRunInput: activeRun ? structuredClone(activeRun.input) : null,
          runCount: point.checkState.runs.length,
          issueIds: activeRun ? [...activeRun.issueIds] : [],
          runs: point.checkState.runs.map((run) => ({
            runId: run.runId,
            conclusion: run.conclusion,
            counts: { ...run.counts },
            issueIds: [...run.issueIds],
            input: structuredClone(run.input),
          })),
        };
      }),
    };
  }, projectName);
}

async function readLayout(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="workbench-root"]');
    const documentNode = document.querySelector('[data-testid^="document-"]');
    const decision = document.querySelector('[data-testid="check-first-look"]');
    const right = document.querySelector('[data-testid="right-panel"]');
    const historyTableWrap = document.querySelector('[data-testid="check-run-history"] .point-table-wrap');
    const issueTableWrap = document.querySelector('[data-testid="check-issue-list"]');
    const evidenceTableWrap = document.querySelector('[data-testid="check-evidence-rows"]');
    const rect = root?.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      workbenchInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      activeDocumentOverflowX: documentNode ? Math.max(0, documentNode.scrollWidth - documentNode.clientWidth) : 0,
      decisionOverflowX: decision ? Math.max(0, decision.scrollWidth - decision.clientWidth) : 0,
      rightPanelOverflowX: right ? Math.max(0, right.scrollWidth - right.clientWidth) : 0,
      historyTableOverflowX: historyTableWrap ? Math.max(0, historyTableWrap.scrollWidth - historyTableWrap.clientWidth) : 0,
      issueTableOverflowX: issueTableWrap ? Math.max(0, issueTableWrap.scrollWidth - issueTableWrap.clientWidth) : 0,
      evidenceTableOverflowX: evidenceTableWrap ? Math.max(0, evidenceTableWrap.scrollWidth - evidenceTableWrap.clientWidth) : 0,
    };
  });
}

async function capture(page: Page, name: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('[data-testid="active-document"]').evaluate((element) => element.scrollTo({ top: 0, left: 0 }));
    const rightPanel = page.locator('[data-testid="right-panel"]');
    if (await rightPanel.count()) await rightPanel.evaluate((element) => element.scrollTo({ top: 0, left: 0 }));
    const layout = await readLayout(page);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.decisionOverflowX).toBeLessThanOrEqual(1);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    expect(layout.historyTableOverflowX).toBeLessThanOrEqual(1);
    expect(layout.evidenceTableOverflowX).toBeLessThanOrEqual(1);
    layouts.push(layout);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function captureSection(page: Page, name: string, testId: string) {
  const layouts = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByTestId(testId).scrollIntoViewIfNeeded();
    const layout = await readLayout(page);
    expect(layout.activeDocumentOverflowX).toBeLessThanOrEqual(1);
    expect(layout.rightPanelOverflowX).toBeLessThanOrEqual(1);
    expect(layout.historyTableOverflowX).toBeLessThanOrEqual(1);
    expect(layout.evidenceTableOverflowX).toBeLessThanOrEqual(1);
    layouts.push(layout);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return layouts;
}

async function writeEvidence(flow: string, csv: string, payload: Record<string, unknown>) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  const sourceFingerprint = createHash('sha256').update(csv).digest('hex');
  writeFileSync(join(evidenceDirectory, `${flow}.csv`), csv, 'utf8');
  writeFileSync(join(evidenceDirectory, `${flow}-run.json`), JSON.stringify({ flow, sourceFingerprint, ...payload }, null, 2), 'utf8');
}
