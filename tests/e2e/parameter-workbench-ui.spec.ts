import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { completeThinLayerGuide, generateCurrentStratificationRevision } from './stratification-guide-helpers';

const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'parameter-workbench-ui');

test.beforeEach(async ({ page }) => {
});

test('FLOW-G2-01 runs phi and suc from a randomized upload and links curves, rows, layers, and history', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `参数曲线 ${seed}`;
  const pointName = `G2-${seed}`;
  const csv = randomizedParameterCsv(pointName, seed);
  const browserErrors = monitorBrowserErrors(page);

  await prepareCommittedRuleStratification(page, testInfo, projectName, `flow-g2-01-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('parameter-first-look')).toContainText('先建立参数方案');

  await page.getByTestId('create-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('参数方案尚未提交');
  await page.getByTestId('parameter-setting-anet').fill('0.82');
  await page.getByTestId('commit-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('下一步运行');

  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('前置推导已完成', { timeout: 5000 });
  await expect(page.getByTestId('parameter-curve-track-qtn')).toBeVisible();

  await expect(page.getByTestId('parameter-method-phi')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('parameter-evidence-material').selectOption('within_source_scope');
  await page.getByTestId('parameter-evidence-material-class').selectOption('quartz_silica_uncemented_sand');
  await page.getByTestId('confirm-parameter-evidence').click();
  await expect(page.getByTestId('parameter-evidence-dock')).toContainText('证据修订齐全');
  await page.getByTestId('parameter-evidence-drainage').selectOption('unknown');
  await page.getByTestId('parameter-evidence-drainage').selectOption('confirmed_drained');
  await expect(page.getByTestId('parameter-evidence-dock')).toContainText('有未保存修改');
  await expect(page.getByTestId('parameter-primary-action')).toHaveText('保存证据新修订');
  const evidenceLayerBeforeInspection = await page.getByTestId('parameter-evidence-layer').inputValue();
  await page.locator('[data-testid^="parameter-curve-point-qtn-"]').nth(10).click();
  await expect(page.getByTestId('parameter-evidence-layer')).toHaveValue(evidenceLayerBeforeInspection);
  await expect(page.getByTestId('parameter-evidence-transition-dialog')).toHaveCount(0);
  await page.getByTestId('parameter-method-suc').click();
  await expect(page.getByTestId('parameter-evidence-transition-dialog')).toBeVisible();
  const dirtyTransitionLayouts = await capture(page, 'flow-g2-01-dirty-evidence-transition');
  await page.getByTestId('parameter-evidence-stay').click();
  await expect(page.getByTestId('parameter-method-phi')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('parameter-method-suc').click();
  await page.getByTestId('parameter-evidence-save-transition').click();
  await expect(page.getByTestId('parameter-evidence-transition-dialog')).toBeHidden();
  await expect(page.getByTestId('parameter-method-suc')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('parameter-evidence-dock')).toContainText('方案修订已冻结');
  await page.getByTestId('parameter-method-authority').click();
  await expect(page.getByTestId('parameter-method-authority')).toContainText('p113，式 (6.7)');
  const authorityLayouts = await capture(page, 'flow-g2-01-method-authority');
  await page.getByTestId('parameter-method-phi').click();
  await expect(page.getByTestId('parameter-evidence-dock')).toContainText('证据修订齐全');
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('cancel-parameter-run').click();
  await expect(page.locator('[data-testid^="parameter-run-history-"]').first()).toContainText('已取消');
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('φ′p 曲线已生成', { timeout: 5000 });

  const qtnPoints = page.locator('[data-testid^="parameter-curve-point-qtn-"]');
  await expect(qtnPoints).not.toHaveCount(0);
  await qtnPoints.nth(3).click();
  await expect(page.getByTestId('parameter-selected-row-summary')).toBeVisible();
  await expect(page.getByTestId('parameter-row-inspector')).toBeVisible();
  const curveLayouts = await capture(page, 'flow-g2-01-phi-curves');

  await page.getByRole('tab', { name: '数据行' }).click();
  await expect(page.getByTestId('parameter-result-table')).toBeVisible();
  await expect(page.getByTestId('parameter-result-table').locator('tbody tr.selected')).toHaveCount(1);
  const rowLayouts = await capture(page, 'flow-g2-01-linked-rows');

  await page.getByTestId('parameter-method-suc').click();
  await expect(page.getByTestId('parameter-evidence-drainage')).toHaveValue('confirmed_undrained');
  await page.getByTestId('parameter-evidence-material').selectOption('within_source_scope');
  await page.getByTestId('parameter-evidence-material-class').selectOption('soft_firm_nc_loc_intact_clay');
  await page.getByTestId('confirm-parameter-evidence').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('suc 曲线已生成', { timeout: 5000 });
  await expect(page.getByTestId('parameter-run-authority-snapshot')).toContainText('12 / 文献起始假设');
  await expect(page.getByTestId('parameter-run-authority-snapshot')).toContainText('已确认不排水');
  await page.getByRole('tab', { name: '层统计' }).click();
  await expect(page.getByTestId('parameter-layer-summary-list')).toBeVisible();
  await expect(page.getByTestId('parameter-layer-summary-list').locator('button')).toHaveCount(2);
  const layerLayouts = await capture(page, 'flow-g2-01-suc-layer-summary');

  await page.getByTestId('parameter-method-phi').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(async () => page.locator('[data-testid^="parameter-run-history-"]').count()).toBe(3);
  await expect(page.getByTestId('parameter-first-look')).toContainText('φ′p 曲线已生成', { timeout: 5000 });
  await page.getByRole('tab', { name: '曲线' }).click();
  await expect(page.getByTestId('parameter-curve-workbench')).toContainText('对比运行');
  const historyLayouts = await capture(page, 'flow-g2-01-phi-history-compare');
  await page.getByRole('tab', { name: '问题详情' }).click();
  await expect(page.getByTestId('parameter-run-summary')).toContainText('已完成');
  const issueLayouts = await capture(page, 'flow-g2-01-issue-detail');

  await page.getByTestId('parameter-evidence-drainage').selectOption('unknown');
  await page.getByTestId('parameter-row-inspector').getByRole('button', { name: '定位来源行' }).click();
  await expect(page.getByTestId('parameter-evidence-transition-dialog')).toContainText('数据导入来源行');
  await page.getByTestId('parameter-evidence-stay').click();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await page.getByTestId('parameter-row-inspector').getByRole('button', { name: '定位来源行' }).click();
  await page.getByTestId('parameter-evidence-discard-transition').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await page.getByTestId('explorer-parameters').click();
  await page.getByRole('tab', { name: '曲线' }).click();
  await expect(page.getByTestId('parameter-curve-workbench')).toBeVisible();

  const persisted = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.parameterWorkspace;
    return {
      schema: workspace?.parameterWorkspaceSchemaVersion,
      schemeVersion: workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId)?.version,
      netAreaRatio: workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId)?.inputSettings.netAreaRatio,
      derivationRuns: workspace?.derivationRuns.map((run) => ({ status: run.status, rowCount: run.derivedRows.length })),
      methodRuns: workspace?.parameterRuns.map((run) => ({ methodId: run.methodId, status: run.status, values: run.values.length, resultHash: run.resultHash })),
      evidenceRevisionCount: workspace?.methodEvidenceRevisions?.length ?? 0,
    };
  }, projectName);
  expect(persisted).toMatchObject({
    schema: 'parameter-workspace-g1b.v1',
    schemeVersion: 1,
    netAreaRatio: 0.82,
    derivationRuns: [{ status: 'completed', rowCount: 14 }],
  });
  expect(persisted.methodRuns).toHaveLength(4);
  expect(persisted.methodRuns?.filter((run) => run.status === 'completed')).toHaveLength(3);
  expect(persisted.methodRuns?.filter((run) => run.status === 'cancelled')).toHaveLength(1);
  persisted.methodRuns?.filter((run) => run.status === 'completed').forEach((run) => {
    expect(run.values).toBeGreaterThan(0);
    expect(run.resultHash).toMatch(/^[a-f0-9]{64}$/);
  });
  expect(persisted.methodRuns?.find((run) => run.status === 'cancelled')).toMatchObject({ values: 0, resultHash: null });
  expect(persisted.evidenceRevisionCount).toBe(9);
  expect(browserErrors).toEqual([]);

  await page.reload();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('parameter-first-look')).toContainText('φ′p 曲线已生成');
  await expect(page.getByTestId('parameter-curve-workbench')).toBeVisible();

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'flow-g2-01.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-01-run.json'), JSON.stringify({
      seed,
      sourceHashes: {
        app: fileSha256('src/App.tsx'),
        workbenchDocument: fileSha256('src/features/parameters/ParameterWorkbenchDocument.tsx'),
        workbenchDomain: fileSha256('src/features/parameters/parameterWorkbenchDomain.ts'),
        styles: fileSha256('src/styles.css'),
        spec: fileSha256('tests/e2e/parameter-workbench-ui.spec.ts'),
      },
      steps: ['upload-randomized-csv', 'run-check', 'run-rule-stratification', 'refine-and-commit-stratification', 'create-and-commit-parameter-scheme', 'run-derivation', 'confirm-phi-evidence', 'protect-dirty-evidence-transition', 'cancel-phi', 'rerun-phi', 'link-curve-row-and-inspector', 'confirm-suc-evidence', 'run-suc', 'view-layer-summary', 'rerun-phi-and-compare-history', 'protect-dirty-source-row-navigation', 'locate-source-row-and-return'],
      persisted,
      curveLayouts,
      rowLayouts,
      layerLayouts,
      historyLayouts,
      issueLayouts,
      dirtyTransitionLayouts,
      authorityLayouts,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('FLOW-G2-02 does not silently fall back when site-calibrated Nkt lacks CAUC or CIUC evidence', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `Nkt 条件 ${seed}`;
  const pointName = `NKT-${seed}`;
  const csv = randomizedParameterCsv(pointName, seed);
  const browserErrors = monitorBrowserErrors(page);
  await prepareCommittedRuleStratification(page, testInfo, projectName, `flow-g2-02-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-nkt-mode-before-create').selectOption('site-calibrated');
  await expect(page.getByTestId('parameter-scheme-dock')).toContainText('不能建立场地标定 Nkt');
  await page.getByTestId('create-parameter-scheme').click();
  await expect(page.getByTestId('parameter-command-problem')).toContainText('CAUC/CIUC');
  await expect(page.getByTestId('parameter-first-look')).toContainText('先建立参数方案');
  const blockedLayouts = await capture(page, 'flow-g2-02-site-nkt-blocked');

  await page.getByTestId('parameter-nkt-mode-before-create').selectOption('literature');
  await page.getByTestId('create-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('参数方案尚未提交');
  await page.getByTestId('discard-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('先建立参数方案');
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDir, 'flow-g2-02.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-02-run.json'), JSON.stringify({ seed, steps: ['upload-randomized-csv', 'select-site-calibrated-nkt', 'prove-cauc-ciuc-block', 'select-literature', 'discard-draft'], blockedLayouts, browserErrors }, null, 2), 'utf8');
  }
});

test('FLOW-G2-03 deletes and restores a historical scheme without replacing the current scheme', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const csv = randomizedParameterCsv(`LIFE-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);
  await prepareCommittedRuleStratification(page, testInfo, `方案生命周期 ${seed}`, `flow-g2-03-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('create-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();
  await page.getByTestId('parameter-duplicate-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();

  const schemeSelect = page.getByTestId('parameter-scheme-select');
  await expect(schemeSelect.locator('option')).toHaveCount(2);
  const currentValue = await schemeSelect.locator('option').filter({ hasText: '/ 当前' }).getAttribute('value');
  const historyValue = await schemeSelect.locator('option').filter({ hasText: '/ 历史' }).getAttribute('value');
  expect(currentValue).toBeTruthy();
  expect(historyValue).toBeTruthy();
  await schemeSelect.selectOption(historyValue!);
  await expect(page.getByTestId('parameter-scheme-dock')).toContainText('历史');
  await page.getByTestId('parameter-delete-scheme').click();
  await expect(schemeSelect).toHaveValue(currentValue!);
  await expect(schemeSelect.locator('option')).toHaveCount(1);
  await page.getByText('已删除方案', { exact: true }).click();
  await page.locator('[data-testid^="parameter-restore-scheme-"]').click();
  await expect(schemeSelect.locator('option')).toHaveCount(2);
  await expect(schemeSelect.locator(`option[value="${currentValue}"]`)).toContainText('/ 当前');
  await expect(schemeSelect.locator(`option[value="${historyValue}"]`)).toContainText('/ 历史');
  const layouts = await capture(page, 'flow-g2-03-scheme-lifecycle');
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    writeFileSync(path.join(evidenceDir, 'flow-g2-03.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-03-run.json'), JSON.stringify({ seed, steps: ['upload-randomized-csv', 'commit-v1', 'duplicate-and-commit', 'select-history', 'delete-history-without-replacement', 'restore-history'], layouts, browserErrors }, null, 2), 'utf8');
  }
});

test('FLOW-G2-04 reopens an old run with its frozen scheme and stratification revision', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `修订历史 ${seed}`;
  const csv = randomizedParameterCsv(`REV-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);
  await prepareCommittedRuleStratification(page, testInfo, projectName, `flow-g2-04-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('create-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('前置推导已完成', { timeout: 5000 });
  await page.getByTestId('parameter-evidence-material').selectOption('within_source_scope');
  await page.getByTestId('parameter-evidence-material-class').selectOption('quartz_silica_uncemented_sand');
  await page.getByTestId('confirm-parameter-evidence').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('φ′p 曲线已生成', { timeout: 5000 });
  await expect(page.locator('[data-testid^="parameter-run-history-"]').first()).toContainText('v1');

  await page.getByTestId('edit-parameter-scheme').click();
  await page.getByTestId('parameter-setting-anet').fill('0.83');
  await page.getByTestId('commit-parameter-scheme').click();
  await expect(page.getByTestId('parameter-scheme-dock')).toContainText('v2');
  await expect(page.getByTestId('parameter-first-look')).toContainText('正在查看参数方案 v1');
  await expect(page.getByTestId('parameter-history-revision-note')).toBeVisible();
  await expect(page.getByTestId('parameter-evidence-dock')).toHaveCount(0);
  await expect(page.getByTestId('parameter-method-authority')).toContainText('方法依据');
  await expect(page.getByTestId('parameter-input-settings-dock')).toContainText('0.80 / 18.0');
  await expect(page.getByTestId('parameter-run-authority-snapshot')).toContainText('标准速率已确认');
  await expect(page.getByTestId('parameter-run-authority-snapshot')).toContainText('已确认排水');
  await expect(page.getByTestId('parameter-run-authority-snapshot')).toContainText('未胶结石英质/硅质砂');
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('output-item-parameter-result')).toContainText('需确认');
  await expect(page.getByTestId('document-output').locator('.analysis-title-row .status-pill')).toHaveText('待补全');
  await page.getByTestId('explorer-parameters').click();
  const layouts = await capture(page, 'flow-g2-04-historical-revision');
  expect(browserErrors).toEqual([]);

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'flow-g2-04.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-04-run.json'), JSON.stringify({
      seed,
      projectName,
      steps: ['upload-randomized-csv', 'commit-stratification', 'commit-parameter-v1', 'run-v1', 'edit-and-commit-v2', 'reopen-v1-run-read-only'],
      layouts,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('FLOW-G2-05 rebuilds a stale parameter scheme from a revised multi-layer stratification', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `上游恢复 ${seed}`;
  const csv = randomizedParameterCsv(`STALE-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);
  await prepareCommittedRuleStratification(page, testInfo, projectName, `flow-g2-05-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('create-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();

  await page.getByTestId('explorer-stratification').click();
  const reopenTools = page.getByTestId('right-panel-show');
  if (await reopenTools.isVisible().catch(() => false)) await reopenTools.click();
  if ((await page.getByTestId('stratification-advanced-tools').getAttribute('open')) === null) await page.getByTestId('stratification-advanced-tools-toggle').click();
  await page.getByTestId('stratification-duplicate').click();
  await page.getByTestId('stratification-add-boundary').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('仅供历史查看');
  await expect(page.getByTestId('rebuild-parameter-scheme')).toBeVisible();
  const staleLayouts = await capture(page, 'flow-g2-05-stale-parameter-scheme');
  await page.getByTestId('rebuild-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('参数方案尚未提交');
  const methodDock = page.getByTestId('parameter-method-dock');
  const methodTabs = methodDock.locator('[data-testid^="parameter-method-"]');
  const methodCount = await methodTabs.count();
  expect(methodCount).toBeGreaterThan(0);
  for (let index = 0; index < methodCount; index += 1) {
    await methodTabs.nth(index).click();
    if (/([2-9]|[1-9]\d+)\s*层/.test((await methodDock.textContent()) ?? '')) break;
  }
  await expect(methodDock).toContainText(/([2-9]|[1-9]\d+)\s*层/);
  await page.getByTestId('commit-parameter-scheme').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('下一步运行');
  const recoveredLayouts = await capture(page, 'flow-g2-05-rebuilt-multi-layer-scheme');
  expect(browserErrors).toEqual([]);

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'flow-g2-05.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-05-run.json'), JSON.stringify({
      seed,
      projectName,
      steps: ['upload-randomized-csv', 'commit-stratification', 'commit-parameter-scheme', 'duplicate-stratification', 'add-third-layer', 'commit-revised-stratification', 'prove-parameter-stale', 'rebuild-multi-layer-parameter-scheme'],
      staleLayouts,
      recoveredLayouts,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('FLOW-G2-06 resolves a drainage conflict through explicit evidence revisions', async ({ page }, testInfo) => {
  const seed = Number(randomSeed());
  const projectName = `证据冲突 ${seed}`;
  const csv = randomizedParameterCsv(`CONFLICT-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);
  await prepareCommittedRuleStratification(page, testInfo, projectName, `flow-g2-06-${seed}.csv`, csv);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('create-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-first-look')).toContainText('前置推导已完成', { timeout: 5000 });
  await page.getByTestId('parameter-evidence-material').selectOption('within_source_scope');
  await page.getByTestId('parameter-evidence-material-class').selectOption('quartz_silica_uncemented_sand');
  await page.getByTestId('parameter-evidence-drainage').selectOption('conflict');
  await page.getByTestId('confirm-parameter-evidence').click();
  await expect(page.getByTestId('parameter-evidence-drainage')).toHaveValue('conflict');
  await expect(page.getByTestId('parameter-evidence-dock')).toContainText('冲突待解决');
  await expect(page.getByTestId('parameter-primary-action')).toHaveText('先解决排水冲突');
  const conflictLayouts = await capture(page, 'flow-g2-06-drainage-conflict');
  await page.getByTestId('parameter-evidence-drainage').selectOption('confirmed_drained');
  await page.getByTestId('confirm-parameter-evidence').click();
  await expect(page.getByTestId('parameter-evidence-drainage')).toHaveValue('confirmed_drained');

  await expect.poll(async () => (await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return 0;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    return point?.parameterWorkspace.methodEvidenceRevisions.filter((revision) => revision.kind === 'drainage_applicability').length ?? 0;
  }, projectName))).toBe(2);
  const authority = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const revisions = point?.parameterWorkspace?.methodEvidenceRevisions ?? [];
    const drainage = revisions.filter((revision) => revision.kind === 'drainage_applicability');
    const context = revisions.filter((revision) => revision.kind === 'conflict_context');
    return { drainage: drainage.map((revision) => revision.payload), contextCount: context.length };
  }, projectName);
  expect(authority.contextCount).toBe(1);
  expect(authority.drainage).toHaveLength(2);
  expect(authority.drainage[0]).toMatchObject({ status: 'conflict', conflictRevisionId: expect.any(String) });
  expect(authority.drainage[1]).toMatchObject({ status: 'resolved_conflict', resolvedAs: 'confirmed_drained', supersedesConflictRevisionId: authority.drainage[0].conflictRevisionId, resolutionRevisionId: expect.any(String) });
  expect(browserErrors).toEqual([]);

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'flow-g2-06.csv'), csv, 'utf8');
    writeFileSync(path.join(evidenceDir, 'flow-g2-06-run.json'), JSON.stringify({ seed, projectName, steps: ['upload-randomized-csv', 'commit-stratification', 'run-derivation', 'record-conflict', 'resolve-as-drained'], authority, conflictLayouts, browserErrors }, null, 2), 'utf8');
  }
});

async function prepareCommittedRuleStratification(page: Page, testInfo: TestInfo, projectName: string, fileName: string, csv: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const inputPath = testInfo.outputPath(fileName);
  writeFileSync(inputPath, csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await page.getByTestId('flow-continue-stratification').click();
  const show = page.getByTestId('right-panel-show');
  if (await show.isVisible().catch(() => false)) await show.click();
  if ((await page.getByTestId('stratification-advanced-tools').getAttribute('open')) === null) {
    await page.getByTestId('stratification-advanced-tools-toggle').click();
  }
  await page.getByTestId('stratification-tool-mode').getByRole('button', { name: '仅生成边界候选' }).click();
  await page.getByTestId('stratification-rule-window').fill('2');
  await page.getByTestId('stratification-rule-threshold').fill('0.72');
  await page.getByTestId('stratification-rule-spacing').fill('1.50');
  await page.getByTestId('stratification-rule-limit').fill('3');
  await page.getByTestId('stratification-rule-run').click();
  await expect(page.getByTestId('stratification-rule-result')).toContainText('已完成');
  await page.getByTestId('stratification-rule-apply').click();
  await completeThinLayerGuide(page);
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByTestId('stratification-boundary-1').click();
  await page.getByTestId('stratification-boundary-tool').getByLabel('标记为需复核').uncheck();
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption('sand');
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-layer-tool').getByLabel('土类').selectOption('clay');
  await generateCurrentStratificationRevision(page);
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'allow');
}

async function capture(page: Page, name: string) {
  if (process.env.MILESTONE_EVIDENCE !== '1') return [];
  mkdirSync(evidenceDir, { recursive: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: path.join(evidenceDir, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    const layout = await page.evaluate(() => {
      const body = document.documentElement;
      const workbench = document.querySelector<HTMLElement>('.workbench');
      const documentPanel = document.querySelector<HTMLElement>('[data-testid="document-parameters"]');
      const curveGrid = document.querySelector<HTMLElement>('.parameter-curve-grid');
      const rightPanel = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentOverflowX: Math.max(0, body.scrollWidth - body.clientWidth),
        workbenchOverflowX: workbench ? Math.max(0, workbench.scrollWidth - workbench.clientWidth) : -1,
        documentPanelOverflowX: documentPanel ? Math.max(0, documentPanel.scrollWidth - documentPanel.clientWidth) : -1,
        curveGridOverflowX: curveGrid ? Math.max(0, curveGrid.scrollWidth - curveGrid.clientWidth) : 0,
        rightPanelOverflowX: rightPanel ? Math.max(0, rightPanel.scrollWidth - rightPanel.clientWidth) : -1,
      };
    });
    expect(layout.documentOverflowX).toBe(0);
    expect(layout.workbenchOverflowX).toBe(0);
    expect(layout.documentPanelOverflowX).toBe(0);
    expect(layout.curveGridOverflowX).toBe(0);
    expect(layout.rightPanelOverflowX).toBe(0);
    results.push(layout);
  }
  return results;
}

function randomizedParameterCsv(pointName: string, seed: number) {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const rows = Array.from({ length: 14 }, (_, index) => {
    const depth = Number(((index + 1) * 0.5).toFixed(2));
    const sand = index < 7;
    const qc = sand ? 6200 + random() * 700 : 1500 + random() * 300;
    const qt = qc + (sand ? 220 : 380);
    const fs = sand ? 38 + random() * 8 : 88 + random() * 16;
    const u2 = sand ? 120 + random() * 25 : 420 + random() * 60;
    const fr = (100 * fs) / qt;
    return [pointName, depth.toFixed(2), qc.toFixed(2), qt.toFixed(2), fs.toFixed(2), u2.toFixed(2), fr.toFixed(4), '20', '7'];
  });
  return ['PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM', ...rows.map((row) => row.join(','))].join('\n');
}

function monitorBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function randomSeed() {
  return `${Date.now() % 10000000}${Math.floor(Math.random() * 1000)}`.slice(-9);
}

function fileSha256(relativePath: string) {
  return createHash('sha256').update(readFileSync(path.join(process.cwd(), relativePath))).digest('hex');
}
