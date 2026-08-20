import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test('check governance keeps raw evidence immutable across cancel, keep, exclude, smoothing, rerun, and restore', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('cpt-governance-spike.csv');
  const csv = [
    'Depth(m),qc(MPa),fs(kPa)',
    '0.00,1.00,10',
    '0.25,1.02,10.2',
    '0.50,1.04,10.4',
    '0.75,8.00,95',
    '1.00,1.06,10.6',
    '1.25,1.08,10.8',
    '1.50,1.10,11.0',
  ].join('\n');
  writeFileSync(inputPath, csv, 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, 'Stage 3 数据治理', 'CPT-GOV');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => readGovernanceState(page)).toMatchObject({ draftCount: 1, rawRowCount: 7 });
  const sourceBefore = await readGovernanceState(page);
  expect(sourceBefore).toMatchObject({ exclusionRevisionCount: 0, smoothingRunCount: 0, rawRowCount: 7 });

  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-data-evidence')).toBeVisible();
  await expect(page.getByTestId('check-issue-check-isolated-qc-anomaly')).toBeVisible();
  await page.getByTestId('check-issue-check-isolated-qc-anomaly').click();
  await page.getByTestId('check-advanced-governance').locator('summary').click();

  await page.getByTestId('check-keep-row').click();
  await page.getByTestId('check-review-reason').fill('现场复核前先取消');
  await page.getByTestId('check-review-cancel').click();
  await expect(page.getByTestId('check-review-confirmation')).toHaveCount(0);
  await expect.poll(() => readGovernanceState(page)).toMatchObject({ exclusionRevisionCount: 0, excludedSourceRowIds: [] });

  await page.getByTestId('check-keep-row').click();
  await page.getByTestId('check-review-reason').fill('人工复核认为可能为真实硬夹层响应，先保留');
  await page.getByTestId('check-review-confirm').click();
  await expect.poll(() => readGovernanceState(page)).toMatchObject({
    exclusionRevisionCount: 1,
    currentExclusionVersion: 1,
    excludedSourceRowIds: [],
    checkArtifact: 'stale',
  });

  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-issue-check-isolated-qc-anomaly')).toBeVisible();
  await page.getByTestId('check-issue-check-isolated-qc-anomaly').click();
  await page.getByTestId('check-exclude-row').click();
  await page.getByTestId('check-review-reason').fill('局部偏离过大，排除后试算并保留原始证据');
  await page.getByTestId('check-review-confirm').click();
  await expect.poll(() => readGovernanceState(page)).toMatchObject({
    exclusionRevisionCount: 2,
    currentExclusionVersion: 2,
    excludedSourceRowIds: [sourceBefore.sourceRowIds[3]],
    checkArtifact: 'stale',
  });

  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-issue-check-isolated-qc-anomaly')).toHaveCount(0);
  await page.getByTestId('check-smooth-standard').click();
  await expect.poll(() => readGovernanceState(page)).toMatchObject({
    smoothingRunCount: 1,
    activeSmoothingStatus: 'completed',
    smoothingRowCount: 6,
    checkArtifact: 'stale',
  });
  await page.getByTestId('check-view-raw').click();
  await expect(page.getByTestId('check-data-evidence')).toHaveAttribute('data-view-mode', 'raw');
  await page.getByTestId('check-view-smoothed').click();
  await expect(page.getByTestId('check-data-evidence')).toHaveAttribute('data-view-mode', 'smoothed');
  await page.getByTestId('check-view-overlay').click();
  await expect(page.getByTestId('check-data-evidence')).toHaveAttribute('data-view-mode', 'overlay');

  await page.getByTestId('check-rerun').click();
  await expect.poll(() => readGovernanceState(page)).toMatchObject({
    checkArtifact: 'current',
    checkBoundToCurrentExclusion: true,
    checkBoundToActiveSmoothing: true,
  });
  const settled = await readGovernanceState(page);
  expect(settled.rawRows).toEqual(sourceBefore.rawRows);
  expect(settled.sourceAttachmentHash).toBe(sourceBefore.sourceAttachmentHash);

  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });

  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage3-data-governance');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'data-governance-overlay-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'data-governance-overlay-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ sourceBefore, settled, layout, errors }, null, 2));
  }

  await page.getByTestId('check-restore-exclusion').click();
  await expect.poll(() => readGovernanceState(page)).toMatchObject({
    exclusionRevisionCount: 3,
    currentExclusionVersion: 3,
    excludedSourceRowIds: [],
    activeSmoothingStatus: null,
    checkArtifact: 'stale',
  });
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
async function readGovernanceState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { reason: loaded.reason };
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
    if (!draft) return { draftCount: point.importDrafts.length, rawRowCount: -1 };
    const batch = project.importBatches.find((candidate) => candidate.batchId === draft.batchId);
    const raw = batch?.kind === 'draft' ? loaded.dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId) : null;
    const currentExclusion = point.dataGovernance.exclusionRevisions.find((revision) => revision.revisionId === point.dataGovernance.currentExclusionRevisionId) ?? null;
    const activeSmoothing = point.dataGovernance.smoothingRuns.find((run) => run.runId === point.dataGovernance.activeSmoothingRunId) ?? null;
    const activeCheck = point.checkState.runs.find((run) => run.runId === point.checkState.activeRunId) ?? null;
    return {
      exclusionRevisionCount: point.dataGovernance.exclusionRevisions.length,
      draftCount: point.importDrafts.length,
      currentExclusionVersion: currentExclusion?.version ?? null,
      excludedSourceRowIds: currentExclusion?.excludedSourceRowIds ?? [],
      smoothingRunCount: point.dataGovernance.smoothingRuns.length,
      activeSmoothingStatus: activeSmoothing?.status ?? null,
      smoothingRowCount: activeSmoothing?.rows.length ?? 0,
      checkArtifact: point.checkState.artifact.status,
      checkBoundToCurrentExclusion: Boolean(activeCheck && (activeCheck.exclusionRevisionId ?? null) === point.dataGovernance.currentExclusionRevisionId),
      checkBoundToActiveSmoothing: Boolean(activeCheck && (activeCheck.smoothingRunId ?? null) === point.dataGovernance.activeSmoothingRunId),
      rawRowCount: raw?.kind === 'raw' ? raw.rows.length : -1,
      rawRows: raw?.kind === 'raw' ? raw.rows : [],
      sourceAttachmentHash: raw?.kind === 'raw' ? raw.sourceAttachment?.sha256 ?? null : null,
      sourceRowIds: draft.sourceRowIds,
    };
  });
}
