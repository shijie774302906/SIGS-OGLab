import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { completePreparationGuide } from './fixtures/guidedPreparation';

test('CPT09, CPT19, and SCPT1 remain isolated across visible import, check, reload, and point switching', async ({ page }, testInfo) => {
  const pointSwitchMs: Record<string, number> = {};
  const points = [
    { name: 'CPT09', rows: ['0.50,1.20,20,80', '1.00,1.30,21,85'] },
    { name: 'CPT19', rows: ['0.50,2.20,30,90', '1.00,2.30,31,95'] },
    { name: 'SCPT1', rows: ['0.50,3.20,40,100', '1.00,3.30,41,105'] },
  ];
  await page.getByTestId('new-project-name').fill('Stage 8 三点隔离'); await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  for (const [index, point] of points.entries()) {
    await page.getByTestId('create-point').click(); await page.getByTestId('point-name-input').fill(point.name); await page.getByTestId('confirm-point-command').click(); await page.getByTestId('probe-guide-recommended').click();
    const filePath = testInfo.outputPath(`${point.name}.csv`); writeFileSync(filePath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...point.rows].join('\n'), 'utf8');
    await expect(page.getByTestId('document-import')).toBeVisible(); await page.getByTestId('import-file-input').setInputFiles(filePath); await completePreparationGuide(page); await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
    if (index < points.length - 1) await page.getByTestId('explorer-project').click();
  }
  await page.reload(); await page.getByTestId('explorer-project').click();
  for (const point of points) {
    const switchStarted = Date.now(); await page.locator('[data-testid^="project-point-"]').filter({ hasText: point.name }).click(); await expect(page.getByTestId('project-current-point')).toContainText(point.name); pointSwitchMs[point.name] = Date.now() - switchStarted; await completePreparationGuide(page); await page.getByTestId('explorer-import').click(); await expect(page.getByTestId('import-active-batch-name')).toHaveText(`${point.name}.csv`); await page.getByTestId('explorer-check').click(); await expect(page.getByTestId('check-first-look')).toContainText('检查完成'); await page.getByTestId('explorer-project').click();
  }
  const state = await page.evaluate(async () => { const database = await import('/src/features/workspace/workspaceDatabase.ts'); const loaded = await database.loadActiveWorkspaceV2(); if (!loaded.ok) throw new Error(loaded.detail); const project = loaded.manifest.state.projects[0]; return { activePointName: project.points.find((point) => point.pointId === project.activePointId)?.pointName ?? null, workspaceRevision: project.workspaceRevision, points: project.points.map((point) => ({ name: point.pointName, activeDraftId: point.activeImportDraftId, activeBatchId: point.selection.selectedImportBatchId, drafts: point.importDrafts.length, runs: point.checkState.runs.length, check: point.checkState.artifact.status })) }; });
  expect(state.activePointName).toBe('SCPT1');
  expect(state.points.map(({ name, drafts, runs, check }) => ({ name, drafts, runs, check }))).toEqual(points.map((point) => ({ name: point.name, drafts: 1, runs: 1, check: 'current' })));
  expect(state.points.every((point) => point.activeDraftId && point.activeBatchId)).toBeTruthy();
  if (process.env.MILESTONE_EVIDENCE === '1') { const dir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process087-preparation-guide'); mkdirSync(dir, { recursive: true }); await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: path.join(dir, '06-three-point-after-reload-1440x900.png'), fullPage: true }); await page.setViewportSize({ width: 1920, height: 1080 }); await page.screenshot({ path: path.join(dir, '06-three-point-after-reload-1920x1080.png'), fullPage: true }); writeFileSync(path.join(dir, 'cross-point-reload.json'), JSON.stringify({ ...state, pointSwitchMs }, null, 2)); }
});
