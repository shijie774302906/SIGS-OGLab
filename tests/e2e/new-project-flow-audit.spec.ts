import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from './fixtures/isolatedTest';
import { completePreparationGuide } from './fixtures/guidedPreparation';

const sourceWorkbook = path.join(process.cwd(), 'sample_data', 'source', 'yingkou', 'CPT09数据.xlsx');
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'new-project-flow-audit');

test('AUDIT-084 new project can check a renamed Yingkou workbook without persisting a placeholder point', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await resetWorkspace(page);
  await page.getByTestId('new-project-name').fill(`新项目交接审计 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();

  const renamedWorkbook = testInfo.outputPath('yingkou.xlsx');
  mkdirSync(path.dirname(renamedWorkbook), { recursive: true });
  copyFileSync(sourceWorkbook, renamedWorkbook);
  await page.getByTestId('import-file-input').setInputFiles(renamedWorkbook);
  await expect(page.getByTestId('point-identity-dialog')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('point-identity-source')).toContainText('4282 行');
  const afterUpload = await readAuditState(page);
  const layouts: Array<{ viewport: { width: number; height: number }; state: string; bodyOverflow: boolean; mainOverflow: boolean }> = [];
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `point-identity-dialog-${viewport.width}x${viewport.height}.png`), fullPage: true });
      layouts.push({ viewport, state: 'identity-dialog', ...(await readOverflow(page)) });
    }
  }

  await page.getByRole('button', { name: '暂不创建点位' }).click();
  await expect(page.getByTestId('point-identity-dialog')).toHaveCount(0);
  await expect(page.getByTestId('import-first-look')).toContainText('请确认点位');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `point-identity-deferred-${viewport.width}x${viewport.height}.png`), fullPage: true });
      layouts.push({ viewport, state: 'identity-deferred', ...(await readOverflow(page)) });
    }
  }
  await page.getByTestId('open-point-identity').click();
  await page.getByTestId('point-identity-name').fill('CPT09-AUDIT');
  await page.getByTestId('confirm-point-identity-and-check').click();
  await completePreparationGuide(page);
  await resolveCurrentYingkouCheck(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成', { timeout: 30_000 });
  const afterCheckClick = await readAuditState(page);
  const ui = {
    checkDocumentVisible: await page.getByTestId('document-check').isVisible().catch(() => false),
    importDocumentVisible: await page.getByTestId('document-import').isVisible().catch(() => false),
    storageNotice: await optionalText(page, 'project-storage-workspace-notice'),
    feedback: await optionalText(page, 'flow-toast'),
  };
  writeFileSync(testInfo.outputPath('audit-state.json'), JSON.stringify({ afterUpload, afterCheckClick, ui }, null, 2), 'utf8');

  expect(afterUpload.pointCount).toBe(0);
  expect(afterUpload.checkRunCount).toBe(0);
  expect(afterCheckClick.activePointName).toBe('CPT09-AUDIT');
  expect(afterCheckClick.activePointName).not.toBe('待导入点位');
  expect(afterCheckClick.activeRoute).toBe('check');
  expect(afterCheckClick.checkRunCount).toBe(2);
  expect(ui.checkDocumentVisible).toBe(true);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({ path: path.join(evidenceDirectory, `point-created-check-complete-${viewport.width}x${viewport.height}.png`), fullPage: true });
      layouts.push({ viewport, state: 'check-complete', ...(await readOverflow(page)) });
    }
    writeFileSync(path.join(evidenceDirectory, 'flow-run.json'), JSON.stringify({
      source: 'CPT09数据.xlsx renamed to yingkou.xlsx',
      steps: ['create-project', 'upload-renamed-workbook', 'defer-point-name', 'reopen-point-dialog', 'confirm-point-name-and-check'],
      afterUpload,
      afterCheckClick,
      ui,
      layouts,
    }, null, 2), 'utf8');
    expect(layouts.every((layout) => !layout.bodyOverflow && !layout.mainOverflow)).toBe(true);
  }
});

test('AUDIT-084 repairs an existing placeholder point before creating its first check', async ({ page }) => {
  await resetWorkspace(page);
  await page.getByTestId('new-project-name').fill(`占位点位恢复 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT09-SEED');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(sourceWorkbook);
  await expect(page.getByTestId('parsed-import-result')).toContainText('4282 行', { timeout: 30_000 });
  await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) throw new Error(loaded.detail);
      const manifest = structuredClone(loaded.manifest);
      const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId)!;
      const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
      point.pointName = '待导入点位';
      point.aliases = [];
      project.workspaceRevision += 1;
      project.updatedAt = new Date().toISOString();
      manifest.manifestRevision += 1;
      manifest.savedAt = project.updatedAt;
      const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
      if (saved.ok) return;
      if (saved.reason !== 'conflict' || attempt === 4) throw new Error(saved.detail);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });
  await page.reload();
  await expect(page.getByTestId('point-identity-dialog')).toBeVisible();
  await expect(page.getByTestId('confirm-point-identity-and-check')).toHaveText('确认点位名称并继续');
  await page.getByTestId('point-identity-name').fill('CPT09-RECOVERED');
  await page.getByTestId('confirm-point-identity-and-check').click();
  await completePreparationGuide(page);
  await resolveCurrentYingkouCheck(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成', { timeout: 30_000 });
  const recovered = await readAuditState(page);
  expect(recovered).toMatchObject({ activePointName: 'CPT09-RECOVERED', activePointAliases: [], activeRoute: 'check', checkRunCount: 2 });
});

test('AUDIT-084 keeps point creation atomic when another tab changes the project', async ({ page }, testInfo) => {
  await resetWorkspace(page);
  await page.getByTestId('new-project-name').fill(`点位提交冲突 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();

  const renamedWorkbook = testInfo.outputPath('yingkou.xlsx');
  mkdirSync(path.dirname(renamedWorkbook), { recursive: true });
  copyFileSync(sourceWorkbook, renamedWorkbook);
  await page.getByTestId('import-file-input').setInputFiles(renamedWorkbook);
  await expect(page.getByTestId('point-identity-dialog')).toBeVisible({ timeout: 30_000 });

  await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId)!;
    project.workspaceRevision += 1;
    project.updatedAt = new Date().toISOString();
    manifest.manifestRevision += 1;
    manifest.savedAt = project.updatedAt;
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, { expectedManifestRevision: loaded.manifest.manifestRevision });
    if (!saved.ok) throw new Error(saved.detail);
  });

  await page.getByTestId('point-identity-name').fill('CPT09-CONFLICT');
  await page.getByTestId('confirm-point-identity-and-check').click();
  await expect(page.getByTestId('point-identity-problem')).toContainText('本次未创建点位');
  await expect(page.getByTestId('point-identity-save-diagnosis')).toContainText('其他标签页已有更新');
  await expect(page.getByTestId('confirm-point-identity-and-check')).toHaveText('查看解决方法');
  await page.getByTestId('confirm-point-identity-and-check').click();
  await expect(page.getByTestId('point-identity-save-diagnosis')).toContainText('关闭重复标签页后刷新当前页');
  await expect(page.getByTestId('point-identity-dialog')).toBeVisible();
  if (process.env.PROCESS125_EVIDENCE === '1') {
    const process125Evidence = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process125-professional-output');
    mkdirSync(process125Evidence, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: path.join(process125Evidence, `point-save-conflict-${viewport.width}x${viewport.height}.png`),
        animations: 'disabled',
        fullPage: true,
      });
    }
  }
  const afterConflict = await readAuditState(page);
  expect(afterConflict.pointCount).toBe(0);
  expect(afterConflict.checkRunCount).toBe(0);
});

async function resetWorkspace(page: Page) {
}

async function optionalText(page: Page, testId: string) {
  const locator = page.getByTestId(testId);
  return await locator.count() ? await locator.textContent() : null;
}

async function resolveCurrentYingkouCheck(page: Page) {
  const ignore = page.getByTestId('check-ignore-current-row');
  if (await ignore.isVisible().catch(() => false)) await ignore.click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成', { timeout: 30_000 });
}

async function readAuditState(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { loadError: loaded };
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const activeDraft = point?.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
    return {
      projectName: project?.projectName ?? null,
      workspaceRevision: project?.workspaceRevision ?? null,
      activeRoute: project?.activeRoute ?? null,
      activePointId: project?.activePointId ?? null,
      activePointName: point?.pointName ?? '待导入点位',
      activePointAliases: point?.aliases ?? [],
      pointCount: project?.points.length ?? 0,
      activeBatchId: project?.activeImportBatchId ?? null,
      importBatchCount: project?.importBatches.length ?? 0,
      activeDraftId: activeDraft?.draftId ?? null,
      draftCount: point?.importDrafts.length ?? 0,
      checkRunCount: point?.checkState.runs.length ?? 0,
      checkArtifact: point?.checkState.artifact.status ?? null,
    };
  });
}

async function readOverflow(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      bodyOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      mainOverflow: Boolean(main && main.scrollWidth > main.clientWidth + 1),
    };
  });
}
