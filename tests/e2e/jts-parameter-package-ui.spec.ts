import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateCurrentStratificationRevision } from './stratification-guide-helpers';

test('JTS parameter package moves from pending confirmations to current output authority and stale recovery', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('jts-parameter-cohesive.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '5.00,1.20,25,300',
    '5.50,1.24,26,305',
    '6.00,1.28,27,310',
  ].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page, 'Stage 5 JTS 参数包', 'CPT-JTS-PARAM');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => readState(page)).toMatchObject({ draftCount: 1, channelState: 'present' });
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('10');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();
  await page.getByTestId('apply-jts-classification').click();
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(1);
  await generateCurrentStratificationRevision(page);
  await expect.poll(() => readState(page)).toMatchObject({ currentSchemeStatus: 'current', currentSchemeOrigin: 'jts-classification' });

  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('parameter-guide-dialog')).toBeVisible();
  await page.getByTestId('parameter-guide-close').click();
  await expect(page.getByTestId('jts-parameter-package-tool')).toContainText('待运行');
  await page.getByTestId('run-jts-parameter-package').click();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toBeVisible();
  await expect(page.getByTestId('jts-package-pending-methods')).toContainText('3 项尚未完成');
  await expect.poll(() => readState(page)).toMatchObject({
    packageRunCount: 1,
    activePackageStatus: 'completed',
    activePackageEligible: false,
    parameterArtifact: 'problem',
  });

  await page.getByText('运行设置与确认').click();
  await page.getByTestId('jts-package-nkt').selectOption('triaxial_cu');
  await page.getByTestId('jts-package-material-scope').selectOption('within_source');
  await page.getByTestId('jts-package-confirm-ocr').check();
  await page.getByTestId('jts-package-confirm-sensitivity').check();
  await page.getByTestId('jts-package-select-spt').check();
  await page.getByTestId('run-jts-parameter-package').click();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toContainText('原型成果预检已满足');
  await expect(page.getByTestId('jts-package-checklist')).toContainText('Su');
  await page.getByTestId('jts-parameter-selector-jts_su_nkt').click();
  await expect(page.getByTestId('parameter-curve-track-jts-jts_su_nkt')).toHaveAttribute('data-curve-segment-count', /^[1-9]\d*$/);
  await expect(page.getByTestId('jts-package-representatives')).toContainText('Su');
  const current = await expect.poll(() => readState(page)).toMatchObject({
    packageRunCount: 2,
    activePackageStatus: 'completed',
    activePackageEligible: true,
    activePackageRequiredPending: 0,
    activePackageHasNkt13: true,
    activePackageHasSpt: true,
    parameterArtifact: 'current',
  });
  void current;

  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage5-parameter-package');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'jts-parameter-package-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'jts-parameter-package-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ state: await readState(page), layout, errors }, null, 2));
  }

  await page.reload();
  await expect(page.getByTestId('jts-parameter-package-evidence')).toBeVisible();
  await page.getByTestId('explorer-import').click();
  const replacementPath = testInfo.outputPath('jts-parameter-cohesive-replacement.csv');
  writeFileSync(replacementPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '5.00,1.30,27,315', '6.00,1.36,28,320'].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(replacementPath);
  await expect.poll(() => readState(page)).toMatchObject({ activePackageStatus: null, latestPackageStatus: 'stale', parameterArtifact: 'stale' });
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

async function readState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { reason: loaded.reason };
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const stratification = point.stratificationWorkspace;
    const currentScheme = stratification?.schemes.find((scheme) => scheme.schemeId === stratification.currentSchemeId) ?? null;
    const packages = point.parameterWorkspace?.jtsParameterPackageRuns ?? [];
    const activePackage = packages.find((run) => run.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId) ?? null;
    const latestPackage = packages.at(-1) ?? null;
    return {
      draftCount: point.importDrafts.length,
      channelState: point.waterContext.channelState,
      currentSchemeStatus: currentScheme?.status ?? null,
      currentSchemeOrigin: currentScheme?.origin?.kind ?? null,
      packageRunCount: packages.length,
      activePackageStatus: activePackage?.status ?? null,
      latestPackageStatus: latestPackage?.status ?? null,
      activePackageEligible: activePackage?.summary.eligibleForOutput ?? false,
      activePackageRequiredPending: activePackage?.summary.requiredPending ?? null,
      activePackageHasNkt13: activePackage?.settingsSnapshot.nktValue === 13,
      activePackageHasSpt: activePackage?.checklist.find((item) => item.methodId === 'jts_spt_n')?.status === 'complete',
      parameterArtifact: point.parameterState.status,
    };
  });
}
