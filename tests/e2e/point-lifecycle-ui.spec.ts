import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test('point tree and right dock complete the independent point lifecycle across refresh', async ({ page }) => {
  const projectName = `点位生命周期 ${Date.now() % 100000}`;
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('point-tree-empty')).toBeVisible();

  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT-01');
  await page.getByTestId('cancel-point-command').click();
  await expect(page.locator('[data-testid^="point-tree-point-"]')).toHaveCount(0);

  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT-01');
  await page.getByTestId('confirm-point-command').click();
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-01');
  await expect(page.getByTestId('active-point-routes')).toBeVisible();
  await expect(page.getByTestId('probe-context-card')).toContainText('待确认');

  await page.getByTestId('probe-guide-recommended').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await page.getByTestId('explorer-project').click();

  await page.getByTestId('rename-point').click();
  await page.getByTestId('point-name-input').fill('CPT-01-取消');
  await page.getByTestId('cancel-point-command').click();
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-01');
  await page.getByTestId('rename-point').click();
  await page.getByTestId('point-name-input').fill('CPT-01A');
  await page.getByTestId('confirm-point-command').click();
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-01A');

  await page.getByTestId('duplicate-point').click();
  await expect(page.getByTestId('point-lifecycle-dialog')).toContainText('源文件、检查、分层、参数及成果不会复制');
  await page.getByTestId('point-name-input').fill('CPT-02');
  await page.getByTestId('confirm-point-command').click();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(2);
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-02');

  await page.getByTestId('delete-point').click();
  await page.getByTestId('cancel-point-command').click();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(2);
  await page.getByTestId('delete-point').click();
  await page.getByTestId('confirm-point-command').click();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(1);
  await expect(page.getByTestId('deleted-point-records')).toContainText('CPT-02');
  await page.locator('[data-testid^="restore-point-"]').click();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(2);
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-02');

  await expect.poll(() => readPointLifecycleState(page)).toMatchObject({
    pointNames: ['CPT-01A', 'CPT-02'],
    activePointName: 'CPT-02',
    deletedCount: 0,
    activeProbeConfirmed: true,
    activeWaterDepthM: null,
    activeDraftCount: 0,
  });

  await page.reload();
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-02');
  await expect(page.getByTestId('workspace-point-tree')).toContainText('CPT-01A');
  await expect(page.getByTestId('workspace-point-tree')).toContainText('CPT-02');
  await page.locator('[data-testid^="point-tree-"]').filter({ hasText: 'CPT-01A' }).click();
  await expect(page.getByTestId('project-current-point')).toHaveText('CPT-01A');
  await expect.poll(() => readPointLifecycleState(page)).toMatchObject({ activePointName: 'CPT-01A' });
  await expect(page.getByTestId('project-storage-notice')).toHaveCount(0);
  await page.getByTestId('explorer-stratification').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('explorer-stratification')).toHaveAttribute('data-handoff-state', 'deny');
  await page.getByTestId('explorer-project').click();
  await expect(page.getByTestId('document-project')).toBeVisible();

  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-stage1-point-workspace');
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'point-workspace-1440x900.png'), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'point-workspace-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify(await readPointLifecycleState(page), null, 2));
  }

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

async function readPointLifecycleState(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { reason: loaded.reason };
    const project = loaded.manifest.state.projects[0];
    const activePoint = project.points.find((point) => point.pointId === project.activePointId);
    return {
      pointNames: project.points.map((point) => point.pointName),
      activePointName: activePoint?.pointName ?? null,
      deletedCount: project.deletedPoints.length,
      activeProbeConfirmed: Boolean(activePoint?.probeContext.confirmedAt),
      activeWaterDepthM: activePoint?.waterContext.waterDepthM ?? null,
      activeDraftCount: activePoint?.importDrafts.length ?? -1,
    };
  });
}
