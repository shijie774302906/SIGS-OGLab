import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { writeFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';

test('JTS numeric-domain problem is fixed as one traceable cell before stratification', async ({ page }, testInfo) => {
  await prepareNumericDomainProblem(page, testInfo, 'JTS-RECOVERY-MANUAL');
  await expect(page.getByTestId('check-action-queue')).toContainText('JTS 计算输入存在无效值');
  await expect(page.getByTestId('check-guided-actions')).toContainText('不使用此行并复检');
  await expect(page.getByTestId('check-guided-actions')).toContainText('修改此行数值');
  await expect(page.getByTestId('check-guided-actions')).toContainText('保留原值');
  await page.getByTestId('check-open-manual-edit').click();
  await page.getByTestId('manual-edit-field').selectOption('qcKpa');
  await page.getByTestId('manual-edit-value').fill('100');
  await page.getByTestId('manual-edit-reason-code').selectOption('source-entry-error');
  await page.getByTestId('manual-edit-reason').fill('与相邻深度趋势不符，按源记录录入错误修订');
  await page.getByTestId('manual-edit-confirm').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await expect.poll(() => readState(page)).toMatchObject({ valueOverrideRevisions: 1, checkRuns: 2, rawInvalidQcKpa: 10 });

  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-classification-tool')).toContainText('分类可以继续');
  await expect.poll(() => readState(page)).toMatchObject({ classificationRuns: 1, classificationStatus: 'completed' });
});

test('one isolated invalid row can be ignored without changing the uploaded measurement', async ({ page }, testInfo) => {
  await prepareNumericDomainProblem(page, testInfo, 'JTS-RECOVERY-EXCLUDE');
  await page.getByTestId('check-ignore-current-row').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await expect.poll(() => readState(page)).toMatchObject({ exclusionRevisions: 1, excludedRows: 1, checkRuns: 2, rawInvalidQcKpa: 10 });

  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await expect(page.getByTestId('jts-classification-tool')).toContainText('分类可以继续');
  await expect.poll(() => readState(page)).toMatchObject({ classificationRuns: 1, classificationRowCount: 100 });
});

test('ignoring one of several invalid rows does not falsely mark the check complete', async ({ page }, testInfo) => {
  await prepareNumericDomainProblem(page, testInfo, 'JTS-RECOVERY-MULTIPLE', [49, 50]);
  await page.getByTestId('check-ignore-current-row').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题');
  await expect(page.getByTestId('check-action-queue')).toContainText('JTS 计算输入存在无效值');
  await expect.poll(() => readState(page)).toMatchObject({ exclusionRevisions: 1, excludedRows: 1, checkRuns: 2, classificationRuns: 0 });
});

test('missing probe and water context are caught in data check and return to the owning page', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('context-required.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '1.00,1.00,20,100', '1.50,1.10,21,105'].join('\n'), 'utf8');
  await resetAndCreatePoint(page, 'JTS 上下文恢复', 'CPTU-CONTEXT', false);
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
  await expect(page.getByTestId('probe-guide-dialog')).toBeVisible();
});

async function prepareNumericDomainProblem(page: Page, testInfo: TestInfo, pointName: string, invalidIndexes = [50]) {
  const rows = Array.from({ length: 101 }, (_, index) => {
    const depth = 1 + index * 0.01;
    return invalidIndexes.includes(index) ? `${depth.toFixed(2)},0.01,5,-100` : `${depth.toFixed(2)},1.00,20,100`;
  });
  const inputPath = testInfo.outputPath(`${pointName}.csv`);
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...rows].join('\n'), 'utf8');
  await resetAndCreatePoint(page, 'JTS 数据检查恢复', pointName, true);
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题');
}

async function resetAndCreatePoint(page: Page, projectName: string, pointName: string, confirmProbe: boolean) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(pointName);
  await page.getByTestId('confirm-point-command').click();
  if (confirmProbe) await page.getByTestId('probe-guide-recommended').click();
}

async function readState(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId)!;
    const normalized = loaded.dataBlocks.find((block) => block.kind === 'normalized' && block.dataBlockId === draft.dataBlockId);
    const classification = point.stratificationWorkspace?.jtsClassificationRuns?.find((run) => run.runId === point.stratificationWorkspace?.activeJtsClassificationRunId) ?? null;
    const exclusion = point.dataGovernance.exclusionRevisions.find((revision) => revision.revisionId === point.dataGovernance.currentExclusionRevisionId) ?? null;
    return {
      valueOverrideRevisions: point.dataGovernance.valueOverrideRevisions?.length ?? 0,
      exclusionRevisions: point.dataGovernance.exclusionRevisions.length,
      excludedRows: exclusion?.excludedSourceRowIds.length ?? 0,
      checkRuns: point.checkState.runs.length,
      classificationRuns: point.stratificationWorkspace?.jtsClassificationRuns?.length ?? 0,
      classificationStatus: classification?.status ?? null,
      classificationRowCount: classification?.rows.length ?? 0,
      rawInvalidQcKpa: normalized?.kind === 'normalized' ? normalized.rows[50]?.qcKpa : null,
    };
  });
}
