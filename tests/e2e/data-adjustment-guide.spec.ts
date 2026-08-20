import { expect, test, type Page } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process091-data-adjustment-guide');

async function resetWorkspace(page: Page) {
}

async function importPoint(page: Page, inputPath: string, hasU2: boolean) {
  await resetWorkspace(page);
  await page.getByTestId('new-project-name').fill('数据调整向导');
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(hasU2 ? 'CPTU-091' : 'CPT-091');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  if (hasU2) await page.getByTestId('water-guide-present').click();
  await page.getByTestId('water-guide-confirm').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-profile-curves')).toHaveCount(0);
  if (evidenceEnabled && hasU2) {
    mkdirSync(evidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: join(evidenceDirectory, `default-problem-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
  await page.getByTestId('check-open-adjustment-dialog').click();
  await expect(page.getByTestId('data-adjustment-dialog')).toBeVisible();
}

async function readAdjustmentState(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId)!;
    const block = loaded.dataBlocks.find((candidate) => candidate.kind === 'normalized' && candidate.dataBlockId === draft.dataBlockId);
    if (!block || block.kind !== 'normalized') throw new Error('normalized block missing');
    const current = point.dataGovernance.exclusionRevisions.find((candidate) => candidate.revisionId === point.dataGovernance.currentExclusionRevisionId);
    return {
      rawRowCount: block.rows.length,
      exclusionRevisionCount: point.dataGovernance.exclusionRevisions.length,
      permanentlyDeleted: current?.permanentlyDeletedSourceRowIds ?? [],
      decisions: current?.decisions ?? [],
      checkRunCount: point.checkState.runs.length,
    };
  });
}

async function verifyDialogLayout(page: Page, name: string) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[data-testid="data-adjustment-dialog"]')!;
      const chart = document.querySelector<HTMLElement>('[data-testid="check-profile-curves"]')!;
      const dialogRect = dialog.getBoundingClientRect();
      const chartRect = chart.getBoundingClientRect();
      return {
        bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialogWithinViewport: dialogRect.left >= 0 && dialogRect.right <= window.innerWidth && dialogRect.top >= 0 && dialogRect.bottom <= window.innerHeight,
        chartHeight: chartRect.height,
      };
    });
    expect(layout.bodyOverflowX).toBe(0);
    expect(layout.dialogWithinViewport).toBe(true);
    expect(layout.chartHeight).toBeGreaterThanOrEqual(420);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    }
  }
}

async function acceptRemainingWarnings(page: Page) {
  for (let index = 0; index < 12 && await page.getByTestId('data-adjustment-review').count() === 0; index += 1) {
    const keepAll = page.getByTestId('adjustment-keep-all-same');
    if (await keepAll.count() && await keepAll.isEnabled()) await keepAll.click();
    else await page.getByTestId('adjustment-keep-current').click();
  }
  await expect(page.getByTestId('data-adjustment-review')).toBeVisible();
}

test('cancel is mutation-free and batch delete permanently removes two equal blocking points', async ({ page }, testInfo) => {
  const rows = Array.from({ length: 401 }, (_, index) => {
    const depth = index * 0.1;
    const invalid = index === 12 || index === 28;
    return `${depth.toFixed(2)},${invalid ? '0.01' : '1.00'},${invalid ? '5' : '20'},${invalid ? '-100' : '100'}`;
  });
  const inputPath = testInfo.outputPath('two-invalid-jts-rows.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...rows].join('\n'), 'utf8');

  await importPoint(page, inputPath, true);
  await expect(page.getByTestId('same-issue-actions')).toContainText('2 个同类检查项');
  await expect(page.getByTestId('adjustment-keep-all-same')).toBeDisabled();
  await expect(page.getByTestId('adjustment-delete-all-same')).toBeEnabled();
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-total-row-count', '401');
  await verifyDialogLayout(page, 'blocking-batch-delete');

  await page.getByTestId('adjustment-delete-current').click();
  await page.getByRole('button', { name: '取消本次数据调整' }).click();
  await expect(page.getByTestId('data-adjustment-dialog')).toHaveCount(0);
  expect(await readAdjustmentState(page)).toMatchObject({ rawRowCount: 401, exclusionRevisionCount: 0, permanentlyDeleted: [], checkRunCount: 1 });

  await page.getByTestId('check-open-adjustment-dialog').click();
  await page.getByTestId('adjustment-delete-all-same').click();
  await acceptRemainingWarnings(page);
  await expect(page.getByTestId('data-adjustment-review')).toBeVisible();
  await expect(page.getByTestId('adjustment-submit')).toBeDisabled();
  await page.getByLabel('工程师说明').fill('确认是两个孤立仪器异常点');
  if (evidenceEnabled) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: join(evidenceDirectory, 'delete-review-1440x900.png'), animations: 'disabled' });
  }
  await page.getByTestId('adjustment-submit').click();
  await expect(page.getByTestId('data-adjustment-dialog')).toHaveCount(0);
  const state = await readAdjustmentState(page);
  expect(state.rawRowCount).toBe(401);
  expect(state.exclusionRevisionCount).toBe(2);
  expect(state.permanentlyDeleted).toHaveLength(2);
  expect(state.decisions.find((decision) => decision.kind === 'delete')?.sourceRowIds).toHaveLength(2);
  expect(state.decisions.find((decision) => decision.kind === 'delete')?.reason).toContain('确认是两个孤立仪器异常点');
  expect(state.decisions.find((decision) => decision.kind === 'delete')?.reason).toContain('检查证据=JTS 计算输入存在无效值@');
  expect(state.decisions.find((decision) => decision.kind === 'delete')?.reason).toContain('qc=10');
  expect(state.checkRunCount).toBe(2);
});

test('same warning points can be accepted together without changing source rows', async ({ page }, testInfo) => {
  const rows = Array.from({ length: 15 }, (_, index) => {
    const anomaly = index === 3 || index === 11;
    return `${(index * 0.25).toFixed(2)},${anomaly ? '8.00' : (1 + index * 0.001).toFixed(3)},${anomaly ? '95' : '10'}`;
  });
  const inputPath = testInfo.outputPath('two-qc-warnings.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa)', ...rows].join('\n'), 'utf8');

  await importPoint(page, inputPath, false);
  await expect(page.getByTestId('same-issue-actions')).toContainText('2 个同类检查项');
  await expect(page.getByTestId('adjustment-keep-all-same')).toBeEnabled();
  await expect(page.getByTestId('adjustment-delete-all-same')).toBeDisabled();
  await page.getByTestId('adjustment-keep-all-same').click();
  await acceptRemainingWarnings(page);
  await expect(page.getByTestId('data-adjustment-review')).toBeVisible();
  await page.getByTestId('adjustment-submit').click();
  await expect(page.getByTestId('data-adjustment-dialog')).toHaveCount(0);
  const state = await readAdjustmentState(page);
  expect(state.rawRowCount).toBe(15);
  expect(state.permanentlyDeleted).toHaveLength(0);
  expect(state.decisions.find((decision) => decision.kind === 'keep')?.sourceRowIds.length).toBeGreaterThanOrEqual(2);
  expect(state.checkRunCount).toBe(2);
});
