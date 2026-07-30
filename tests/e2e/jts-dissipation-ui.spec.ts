import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateCurrentStratificationRevision } from './stratification-guide-helpers';

test('multi-test dissipation flow confirms automatic and manual t50, recalculates, reloads, and preserves authority', async ({ page }, testInfo) => {
  const cptuPath = testInfo.outputPath('cptu.csv');
  writeFileSync(cptuPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', '5.00,1.20,25,300', '5.50,1.24,26,305', '6.00,1.28,27,310'].join('\n'), 'utf8');
  const autoPath = testInfo.outputPath('dissipation-auto.csv');
  writeFileSync(autoPath, ['Time(s),u2(kPa)', '0,300', '10,250', '20,200', '40,140'].join('\n'), 'utf8');
  const manualPath = testInfo.outputPath('dissipation-gap.csv');
  writeFileSync(manualPath, ['Time(s),u2(kPa)', '0,300', '1,280', '2,260', '100,180'].join('\n'), 'utf8');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await prepareCurrentPoint(page);
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(cptuPath);
  await expect.poll(() => readState(page)).toMatchObject({ draftCount: 1 });
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
  await page.getByTestId('parameter-guide-close').click();
  await page.getByTestId('jts-package-nkt').selectOption('triaxial_cu');
  await page.getByTestId('jts-package-material-scope').selectOption('within_source');
  await page.getByTestId('jts-package-confirm-ocr').check();
  await page.getByTestId('jts-package-confirm-sensitivity').check();
  await page.getByTestId('jts-package-select-dissipation').check();
  await page.getByTestId('run-jts-parameter-package').click();

  await page.getByTestId('dissipation-depth').fill('5.2');
  await page.getByTestId('dissipation-u0').fill('100');
  await page.getByTestId('dissipation-layer').selectOption({ index: 1 });
  await page.getByTestId('dissipation-file-input').setInputFiles(autoPath);
  await expect.poll(() => readState(page)).toMatchObject({ testCount: 1, activeTestStatus: 'ready' });
  await page.getByTestId('confirm-dissipation-t50').click();
  await page.getByTestId('calculate-dissipation').click();
  await expect(page.getByTestId('jts-dissipation-evidence')).toContainText('20.00 s');
  await expect.poll(() => readState(page)).toMatchObject({ t50Count: 1, resultCount: 1, activeResultStatus: 'completed', activeT50: 20 });

  await page.getByText('导入时间序列').click();
  await page.getByTestId('dissipation-file-input').setInputFiles(manualPath);
  await expect.poll(() => readState(page)).toMatchObject({ testCount: 2, activeTestStatus: 'ready', activeResultStatus: null });
  await page.getByTestId('confirm-dissipation-t50').click();
  await expect(page.getByTestId('parameter-command-problem')).toContainText('长时间缺口');
  await page.getByTestId('dissipation-t50-mode').selectOption('manual-alternative');
  await page.getByTestId('dissipation-manual-t50').fill('35');
  await page.getByTestId('confirm-dissipation-t50').click();
  await page.getByTestId('calculate-dissipation').click();
  await expect.poll(() => readState(page)).toMatchObject({ testCount: 2, t50Count: 2, resultCount: 2, activeT50: 35, activeT50Origin: 'manual-alternative', activeResultStatus: 'completed' });

  const layout = await page.evaluate(() => ({
    bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    workbenchOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
    rightPanelOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="right-panel"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
  }));
  expect(layout).toEqual({ bodyOverflow: false, workbenchOverflow: false, rightPanelOverflow: false });
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage6-dissipation');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'dissipation-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'dissipation-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify({ state: await readState(page), layout, errors }, null, 2));
  }
  await page.reload();
  await expect(page.getByTestId('jts-dissipation-evidence')).toContainText('35.00 s');
  await expect(page.getByTestId('dissipation-result-summary')).toBeVisible();
  expect(errors).toEqual([]);
});

async function prepareCurrentPoint(page: import('@playwright/test').Page) {
  await page.getByTestId('new-project-name').fill('Stage 6 消散试验');
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPTU-DIS');
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
    const workspace = point.parameterWorkspace;
    const test = workspace?.jtsDissipationTests?.find((item) => item.revisionId === workspace.activeJtsDissipationTestRevisionId) ?? null;
    const t50 = workspace?.jtsDissipationT50Revisions?.find((item) => item.revisionId === workspace.activeJtsDissipationT50RevisionId) ?? null;
    const result = workspace?.jtsDissipationResults?.find((item) => item.revisionId === workspace.activeJtsDissipationResultRevisionId) ?? null;
    return { draftCount: point.importDrafts.length, testCount: workspace?.jtsDissipationTests?.length ?? 0, t50Count: workspace?.jtsDissipationT50Revisions?.length ?? 0, resultCount: workspace?.jtsDissipationResults?.length ?? 0, activeTestStatus: test?.status ?? null, activeT50: t50?.t50Seconds ?? null, activeT50Origin: t50?.origin ?? null, activeResultStatus: result?.status ?? null };
  });
}
