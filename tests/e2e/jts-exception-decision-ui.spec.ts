import { completePreparationGuide, openStratificationTools } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { completeThinLayerGuide, confirmPendingStratificationLayers } from './stratification-guide-helpers';

test('isolated JTS anomaly offers a short reversible decision and preserves raw measurements', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('isolated-jts-anomaly.csv');
  const rows = Array.from({ length: 51 }, (_, index) => {
    const depth = 1 + index * 0.1;
    return index === 25
      ? `${depth.toFixed(2)},5.000,0,80`
      : `${depth.toFixed(2)},5.000,50,80`;
  });
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...rows].join('\n'), 'utf8');
  const errors: string[] = [];
  const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'jts-exception-decision');
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.getByTestId('new-project-name').fill('JTS 异常选择');
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPTU-ISOLATED');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('water-depth-input').fill('0');
  await page.getByTestId('confirm-water-context').click();
  await page.getByTestId('explorer-stratification').click();
  await openStratificationTools(page);
  await page.getByTestId('run-jts-classification').click();

  await expect(page.getByTestId('jts-exception-dialog')).toBeVisible();
  await expect(page.getByTestId('jts-exception-dialog')).toContainText('当前方案未改变');
  await expect(page.getByTestId('jts-exception-dialog')).toContainText('保留异常点，生成其余地层');
  await expect(page.getByTestId('jts-linked-evidence').first().locator('[data-channel]')).toHaveCount(3);
  await page.getByRole('button', { name: '暂不采用', exact: true }).click();
  await expect(page.getByTestId('jts-exception-dialog')).toHaveCount(0);
  await page.getByTestId('jts-open-exception-decision').click();
  await expect(page.getByTestId('jts-exception-dialog')).toBeVisible();

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDir, `decision-${viewport.width}x${viewport.height}.png`), fullPage: true });
      expect(await page.evaluate(() => ({
        body: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        dialog: (() => { const node = document.querySelector<HTMLElement>('[data-testid="jts-exception-dialog"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
      }))).toEqual({ body: false, dialog: false });
    }
  }

  await page.getByTestId('jts-ignore-and-create-candidate').click();
  await completeThinLayerGuide(page);
  await expect(page.getByTestId('stratification-layer-table')).toBeVisible();
  await expect(page.getByTestId('stratification-layer-decision-panel')).toBeVisible();
  await page.locator('details.layer-advanced-evidence > summary').click();
  await expect(page.getByTestId('stratification-layer-evidence-audit')).toBeVisible();
  await expect(page.getByTestId('stratification-layer-evidence-audit')).toContainText('分类路径');
  await expect(page.getByTestId('stratification-layer-evidence-audit')).toContainText('来源运行');
  await expect(page.getByTestId('stratification-layer-evidence-audit')).toContainText('本层证据');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByTestId('stratification-first-look').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(evidenceDir, `candidate-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await confirmAllCandidateLayers(page);
  await page.getByTestId('stratification-save').click(); if (await page.getByTestId('stratification-guide-generate-revision').count()) await page.getByTestId('stratification-guide-generate-revision').click();
  await expect.poll(() => page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects[0];
    if (!project) return null;
    const point = project.points.find((item) => item.pointId === project.activePointId)!;
    if (!point?.stratificationWorkspace || !point.importDrafts[0]) return null;
    const workspace = point.stratificationWorkspace!;
    const scheme = workspace.schemes.find((item) => item.schemeId === workspace.currentSchemeId)!;
    if (!scheme) return null;
    const block = loaded.dataBlocks.find((item) => item.kind === 'normalized' && item.dataBlockId === point.importDrafts[0].dataBlockId);
    return {
      accepted: scheme.origin?.kind === 'jts-classification' ? scheme.origin.selection?.acceptedUnclassifiableRows : null,
      rawFsKpa: block?.kind === 'normalized' ? block.rows[25].fsKpa : null,
    };
  })).toEqual({ accepted: 1, rawFsKpa: 0 });
  expect(errors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const browserCheck = await page.evaluate(async () => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      const channels = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="jts-linked-evidence"] [data-channel]')).map((node) => node.dataset.channel);
      return {
        loadOk: loaded.ok,
        channels: [...new Set(channels)],
        bodyHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        workbenchHorizontalOverflow: (() => { const node = document.querySelector<HTMLElement>('[data-testid="workbench-root"]'); return node ? node.scrollWidth > node.clientWidth : true; })(),
        dialogOpen: Boolean(document.querySelector('[data-testid="jts-exception-dialog"]')),
      };
    });
    writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({ browserCheck, errors }, null, 2));
  }
});

async function confirmAllCandidateLayers(page: import('@playwright/test').Page) {
  await confirmPendingStratificationLayers(page, '粉土');
}
