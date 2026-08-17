import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { completeThinLayerGuide, generateCurrentStratificationRevision } from './stratification-guide-helpers';

const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'custom-formula-ui');

test.beforeEach(async ({ page }) => {
});

test('FLOW-G1D-01 builds, cancels, reruns, and inspects a custom curve from a randomized upload', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `Custom curve ${seed}`;
  const csv = randomizedParameterCsv(`CF-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);

  await prepareParameterSource(page, testInfo, projectName, `flow-g1d-01-${seed}.csv`, csv);
  await page.getByTestId('parameter-mode-custom').click();
  await page.getByTestId('custom-formula-create').click();
  await defineFormula(page, {
    name: 'Normalized combined index',
    symbol: 'CI',
    unit: 'user-unit',
    expression: 'qnet / 100 + Qtn',
    minimum: '0',
    maximum: '500',
  });
  await page.getByTestId('custom-formula-target-layers').getByRole('checkbox').nth(1).uncheck();
  await expect(page.getByTestId('custom-formula-validation-ok')).toBeVisible();
  const editorLayouts = await capture(page, 'flow-g1d-01-editor');

  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('custom-formula-definition')).toBeVisible();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('custom-formula-cancel')).toBeVisible();
  await page.getByTestId('custom-formula-cancel').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['cancelled']);

  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['cancelled', 'completed']);
  await expect(page.locator('[data-testid^="parameter-curve-point-result-"]')).not.toHaveCount(0);
  await page.locator('[data-testid^="parameter-curve-point-result-"]').nth(2).click();
  await expect(page.getByTestId('parameter-selected-row-summary')).toBeVisible();
  const curveLayouts = await capture(page, 'flow-g1d-01-curves');

  await page.locator('.parameter-view-tabs button').nth(1).click();
  await expect(page.getByTestId('parameter-result-table')).toBeVisible();
  await expect(page.getByTestId('parameter-result-table').locator('tbody tr')).toHaveCount(14);
  const rowLayouts = await capture(page, 'flow-g1d-01-rows');
  await page.locator('.parameter-view-tabs button').nth(2).click();
  await expect(page.getByTestId('parameter-layer-summary-list').locator('button')).toHaveCount(2);
  const layerLayouts = await capture(page, 'flow-g1d-01-layers');
  await page.locator('.parameter-view-tabs button').nth(3).click();
  await expect(page.getByTestId('parameter-run-summary')).toBeVisible();
  await page.locator('.parameter-view-tabs button').nth(0).click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['cancelled', 'completed', 'completed']);
  await expect(page.getByTestId('parameter-history-compare-legend')).toBeVisible();
  const historyLayouts = await capture(page, 'flow-g1d-01-history-compare');

  const persisted = await readCustomWorkspace(page, projectName);
  expect(persisted.formulas).toMatchObject([{ name: 'Normalized combined index', status: 'current', version: 1 }]);
  expect(persisted.revisions).toHaveLength(1);
  expect(persisted.runs).toHaveLength(3);
  expect(persisted.runs[0]).toMatchObject({ status: 'cancelled', valueCount: 0, resultHash: null });
  expect(persisted.runs[1]).toMatchObject({ status: 'completed', validCount: 7, nonTargetCount: 7, problemCount: 0 });
  expect(persisted.runs[2]).toMatchObject({ status: 'completed', validCount: 7, nonTargetCount: 7, problemCount: 0 });
  expect(persisted.runs[1].resultHash).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.locator('[data-testid="project-storage-workspace-notice"][role="alert"]')).toHaveCount(0);
  expect(browserErrors).toEqual([]);

  await page.reload();
  await page.getByTestId('parameter-mode-custom').click();
  await expect(page.getByTestId('parameter-mode-custom')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('custom-formula-select').locator('option:checked')).toContainText('Normalized combined index');
  await expect(page.getByTestId('custom-formula-definition')).toContainText('qnet / 100 + Qtn');

  writeEvidence('flow-g1d-01', csv, { seed, steps: ['upload-random-csv', 'check', 'rule-stratify', 'derive-parameter-inputs', 'define-and-commit', 'cancel', 'rerun', 'link-curve-row', 'inspect-rows-layers-issues', 'rerun-and-compare-history', 'reload'], persisted, editorLayouts, curveLayouts, rowLayouts, layerLayouts, historyLayouts, browserErrors });
});

test('FLOW-G1D-02 rejects executable syntax and preserves a runtime divide-by-zero as a problem null', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `Formula safety ${seed}`;
  const csv = randomizedParameterCsv(`SAFE-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);

  await prepareParameterSource(page, testInfo, projectName, `flow-g1d-02-${seed}.csv`, csv);
  await page.getByTestId('parameter-mode-custom').click();
  await page.getByTestId('custom-formula-create').click();
  await page.getByTestId('custom-formula-expression').fill('qt.constructor');
  await expect(page.getByTestId('custom-formula-validation-problems')).toBeVisible();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-command-problem')).toBeVisible();
  await expect.poll(async () => (await readCustomWorkspace(page, projectName)).revisions.length).toBe(0);

  await defineFormula(page, {
    name: 'Depth singularity check',
    symbol: 'DS',
    unit: 'user-unit',
    expression: 'qt / (depthM - 1)',
    minimum: '',
    maximum: '',
  });
  await expect(page.getByTestId('custom-formula-validation-ok')).toBeVisible();
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['completed']);

  const persisted = await readCustomWorkspace(page, projectName);
  expect(persisted.runs[0]).toMatchObject({ status: 'completed', problemCount: 1, nullCount: 1, zeroCount: 0 });
  expect(persisted.runs[0].reasonCodes).toContain('CUSTOM_DIVIDE_BY_ZERO');
  await page.locator('.parameter-view-tabs button').nth(3).click();
  await expect(page.getByTestId('parameter-run-summary')).toBeVisible();
  await expect(page.getByTestId('parameter-current-result-issues')).toContainText('公式发生除零。');
  await expect(page.getByTestId('parameter-upstream-issues')).not.toHaveAttribute('open', '');
  const issueLayouts = await capture(page, 'flow-g1d-02-runtime-problem');
  await page.locator('[data-testid^="parameter-issue-locate-"]').first().click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.locator('.source-row-focus')).toHaveCount(1);
  await expect(page.locator('[data-testid="project-storage-workspace-notice"][role="alert"]')).toHaveCount(0);
  expect(browserErrors).toEqual([]);
  writeEvidence('flow-g1d-02', csv, { seed, steps: ['reject-property-access', 'prove-no-revision', 'commit-legal-arithmetic', 'run-divide-by-zero', 'prove-null-not-zero', 'inspect-issue', 'locate-exact-source-row'], persisted, issueLayouts, browserErrors });
});

test('FLOW-G1D-03 preserves revisions and runs through edit, duplicate, delete, restore, transition, and reload', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `Formula lifecycle ${seed}`;
  const csv = randomizedParameterCsv(`LIFE-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);

  await prepareParameterSource(page, testInfo, projectName, `flow-g1d-03-${seed}.csv`, csv);
  await page.getByTestId('parameter-mode-custom').click();
  await page.getByTestId('custom-formula-create').click();
  await defineFormula(page, { name: 'Lifecycle formula', symbol: 'LF', unit: 'u', expression: 'Qtn + 1', minimum: '', maximum: '' });
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['completed']);

  await page.getByTestId('custom-formula-edit').click();
  await page.getByTestId('custom-formula-expression').fill('Qtn + 2');
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['completed', 'completed']);
  await page.getByTestId('custom-formula-edit').click();
  await page.getByTestId('custom-formula-expression').fill('Qtn + 3');
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('custom-formula-revision-3')).toBeVisible();
  await page.getByTestId('custom-formula-revision-3').click();
  await expect(page.getByTestId('custom-formula-revision-3')).toContainText('Qtn + 3');
  if (process.env.PROCESS155_EVIDENCE === '1') {
    const process155Directory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process155-ai-timeout-copy');
    mkdirSync(process155Directory, { recursive: true });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const workbenchText = await page.getByTestId('workbench-root').innerText();
      expect(workbenchText).not.toMatch(/内容哈希|技术标识|sourceRowId|runId|revisionId|astHash|formulaSpecHash/i);
      await page.screenshot({ path: path.join(process155Directory, `professional-formula-revisions-${viewport.width}x${viewport.height}.png`), fullPage: true });
    }
  }
  await page.getByTestId('custom-formula-run-history').locator('.parameter-run-history-list button').last().click();
  await expect(page.getByTestId('custom-formula-run-authority')).toContainText('Qtn + 1');
  await expect(page.getByTestId('custom-formula-definition')).toContainText('Qtn + 1');
  await expect(page.getByTestId('custom-formula-historical-definition')).toBeVisible();
  await expect(page.getByTestId('parameter-primary-action')).toHaveText('运行当前公式');

  await page.getByTestId('custom-formula-duplicate').click();
  await page.getByTestId('custom-formula-name').fill('Lifecycle formula copy');
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('custom-formula-delete').click();
  await expect(page.getByTestId('custom-formula-delete-confirmation')).toBeVisible();
  await page.getByTestId('custom-formula-delete-confirm').click();
  await expect(page.locator('[data-testid^="custom-formula-restore-"]')).toHaveCount(1);
  await page.getByTestId('custom-formula-collection').locator('details summary').click();
  await page.locator('[data-testid^="custom-formula-restore-"]').click();

  await page.getByTestId('custom-formula-edit').click();
  await page.getByTestId('custom-formula-name').fill('Lifecycle formula restored');
  await expect(page.getByTestId('custom-formula-name')).toHaveValue('Lifecycle formula restored');
  await expect(page.getByTestId('parameter-primary-action')).toBeEnabled();
  await page.getByTestId('parameter-mode-builtin').click();
  await expect(page.getByTestId('custom-formula-transition-dialog')).toBeVisible();
  await page.getByTestId('custom-formula-stay').click();
  await expect(page.getByTestId('parameter-mode-custom')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('parameter-mode-builtin').click();
  await page.getByTestId('custom-formula-save-transition').click();
  await expect(page.getByTestId('parameter-mode-builtin')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('parameter-mode-custom').click();

  await page.getByTestId('custom-formula-edit').click();
  await page.getByTestId('custom-formula-description').fill('dirty formula switch');
  const currentFormulaId = await page.getByTestId('custom-formula-select').inputValue();
  const otherFormulaId = await page.getByTestId('custom-formula-select').locator('option').evaluateAll((options, current) => options.map((option) => (option as HTMLOptionElement).value).find((value) => value !== current) ?? '', currentFormulaId);
  await page.getByTestId('custom-formula-select').selectOption(otherFormulaId);
  await expect(page.getByTestId('custom-formula-transition-dialog')).toBeVisible();
  await page.getByTestId('custom-formula-stay').click();
  await page.getByTestId('custom-formula-discard').click();

  await page.getByTestId('custom-formula-edit').click();
  await page.getByTestId('custom-formula-description').fill('dirty route draft');
  await expect(page.getByTestId('custom-formula-description')).toHaveValue('dirty route draft');
  await expect(page.getByTestId('parameter-primary-action')).toBeEnabled();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('custom-formula-transition-dialog')).toBeVisible();
  await page.getByTestId('custom-formula-discard-transition').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('parameter-mode-custom').click();

  const persisted = await readCustomWorkspace(page, projectName);
  expect(persisted.formulas).toHaveLength(2);
  expect(persisted.formulas.filter((formula: { status: string }) => formula.status === 'deleted')).toHaveLength(0);
  expect(persisted.formulas.filter((formula: { status: string }) => formula.status === 'current')).toHaveLength(2);
  expect(persisted.revisions).toHaveLength(5);
  expect(persisted.runs).toHaveLength(2);
  await expect(page.locator('[data-testid="project-storage-workspace-notice"][role="alert"]')).toHaveCount(0);
  const lifecycleLayouts = await capture(page, 'flow-g1d-03-lifecycle');
  expect(browserErrors).toEqual([]);

  await page.reload();
  await page.getByTestId('parameter-mode-custom').click();
  await expect(page.getByTestId('parameter-mode-custom')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('custom-formula-select').locator('option')).toHaveCount(2);
  writeEvidence('flow-g1d-03', csv, { seed, steps: ['commit-v1-run', 'commit-v2-run', 'commit-v3-without-run', 'open-unrun-revision', 'reopen-v1-frozen-run', 'duplicate', 'delete', 'restore', 'protect-dirty-mode-change-stay-and-save', 'protect-dirty-route-discard', 'reload'], persisted, lifecycleLayouts, browserErrors });
});

test('FLOW-G1D-04 rebuilds a stale formula only after its parameter source is rebuilt', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `Formula stale recovery ${seed}`;
  const csv = randomizedParameterCsv(`STALE-CF-${seed}`, seed);
  const browserErrors = monitorBrowserErrors(page);

  await prepareParameterSource(page, testInfo, projectName, `flow-g1d-04-${seed}.csv`, csv);
  await page.getByTestId('parameter-mode-custom').click();
  await page.getByTestId('custom-formula-create').click();
  await defineFormula(page, { name: 'Source-bound formula', symbol: 'SB', unit: 'u', expression: 'Qtn + qnet / 100', minimum: '', maximum: '' });
  await page.getByTestId('parameter-primary-action').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['completed']);

  await page.getByTestId('explorer-stratification').click();
  const reopenTools = page.getByTestId('right-panel-show');
  if (await reopenTools.isVisible().catch(() => false)) await reopenTools.click();
  if ((await page.getByTestId('stratification-advanced-tools').getAttribute('open')) === null) await page.getByTestId('stratification-advanced-tools-toggle').click();
  await page.getByTestId('stratification-duplicate').click();
  await page.getByTestId('stratification-add-boundary').click();
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('custom-formula-collection')).toContainText('已失效');
  await expect(page.getByTestId('parameter-primary-action')).toHaveText('先完成前置推导');
  await expect(page.getByTestId('custom-formula-rebuild')).toBeDisabled();
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('document-output').locator('.analysis-title-row .status-pill')).toHaveText('待补全');
  await expect(page.getByTestId('output-item-parameter-result')).toContainText('需确认');
  await expect(page.getByTestId('output-item-custom-formula-result')).toContainText('已排除');
  await expect(page.getByTestId('output-item-custom-formula-result')).toContainText('明确选择“纳入成果”');
  await page.getByTestId('explorer-parameters').click();
  const staleLayouts = await capture(page, 'flow-g1d-04-stale');

  await page.getByTestId('parameter-mode-builtin').click();
  await expect(page.getByTestId('rebuild-parameter-scheme')).toBeVisible();
  await page.getByTestId('rebuild-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-curve-track-qtn')).toBeVisible();
  await page.getByTestId('parameter-mode-custom').click();
  await expect(page.getByTestId('custom-formula-rebuild')).toBeVisible();
  await page.getByTestId('custom-formula-rebuild').click();
  await expect(page.getByTestId('custom-formula-editor')).toBeVisible();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('custom-formula-definition')).toBeVisible();
  await page.getByTestId('parameter-primary-action').click();
  await expect.poll(() => customRunStatuses(page)).toEqual(['completed', 'completed']);
  await page.getByTestId('explorer-output').click();
  await expect(page.getByTestId('document-output').locator('.analysis-title-row .status-pill')).toHaveText('可生成');
  await page.getByTestId('explorer-parameters').click();

  const persisted = await readCustomWorkspace(page, projectName);
  expect(persisted.formulas).toHaveLength(2);
  expect(persisted.formulas.filter((formula: { status: string }) => formula.status === 'stale')).toHaveLength(1);
  expect(persisted.formulas.filter((formula: { status: string }) => formula.status === 'current')).toHaveLength(1);
  expect(persisted.revisions).toHaveLength(2);
  expect(persisted.runs).toHaveLength(2);
  expect(persisted.runs.every((run: { status: string }) => run.status === 'completed')).toBe(true);
  await expect(page.locator('[data-testid="project-storage-workspace-notice"][role="alert"]')).toHaveCount(0);
  const recoveredLayouts = await capture(page, 'flow-g1d-04-recovered');
  expect(browserErrors).toEqual([]);
  writeEvidence('flow-g1d-04', csv, { seed, steps: ['commit-and-run-formula', 'revise-stratification', 'prove-formula-stale-and-old-run-readable', 'block-formula-rebuild-without-current-parameter-source', 'rebuild-parameter-scheme', 'rerun-input-derivation', 'copy-formula-from-latest-source', 'commit-and-run-new-formula'], persisted, staleLayouts, recoveredLayouts, browserErrors });
});

async function prepareParameterSource(page: Page, testInfo: TestInfo, projectName: string, fileName: string, csv: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const inputPath = testInfo.outputPath(fileName);
  writeFileSync(inputPath, csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
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
  await expect(page.getByTestId('stratification-rule-result')).toBeVisible();
  await page.getByTestId('stratification-rule-apply').click();
  await completeThinLayerGuide(page);
  await expect(page.getByTestId('stratification-layer-table').locator('button')).toHaveCount(2);
  await page.getByTestId('stratification-boundary-1').click();
  await page.getByTestId('stratification-boundary-tool').getByRole('checkbox', { name: '标记为需复核' }).uncheck();
  await page.getByTestId('stratification-layer-row-1').click();
  await page.getByTestId('stratification-layer-tool').locator('select').first().selectOption('sand');
  await page.getByTestId('stratification-layer-row-2').click();
  await page.getByTestId('stratification-layer-tool').locator('select').first().selectOption('clay');
  await generateCurrentStratificationRevision(page);
  await page.getByTestId('explorer-parameters').click();
  await page.getByTestId('create-parameter-scheme').click();
  await page.getByTestId('commit-parameter-scheme').click();
  await page.getByTestId('parameter-primary-action').click();
  await expect(page.getByTestId('parameter-curve-track-qtn')).toBeVisible();
}

async function defineFormula(page: Page, definition: { name: string; symbol: string; unit: string; expression: string; minimum: string; maximum: string }) {
  await page.getByTestId('custom-formula-name').fill(definition.name);
  await page.getByTestId('custom-formula-symbol').fill(definition.symbol);
  await page.getByTestId('custom-formula-unit').fill(definition.unit);
  await page.getByTestId('custom-formula-expression').fill(definition.expression);
  await page.getByTestId('custom-formula-min').fill(definition.minimum);
  await page.getByTestId('custom-formula-max').fill(definition.maximum);
}

async function customRunStatuses(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    return (point?.parameterWorkspace?.customFormulaRuns ?? []).map((run) => run.status);
  });
}

async function readCustomWorkspace(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.parameterWorkspace;
    return {
      formulas: (workspace?.customFormulas ?? []).map((formula) => ({ name: formula.name, status: formula.status, version: formula.version })),
      revisions: (workspace?.customFormulaRevisions ?? []).map((revision) => ({ version: revision.version, astHash: revision.astHash, expression: revision.snapshot.expression })),
      runs: (workspace?.customFormulaRuns ?? []).map((run) => ({
        status: run.status,
        formulaVersion: run.formulaVersion,
        expression: run.expressionSnapshot,
        valueCount: run.values.length,
        validCount: run.summary?.validCount ?? 0,
        nonTargetCount: run.summary?.nonTargetCount ?? 0,
        problemCount: (run.summary?.numericProblemCount ?? 0) + (run.summary?.outOfRangeCount ?? 0),
        nullCount: run.values.filter((value) => value.value === null).length,
        zeroCount: run.values.filter((value) => value.value === 0).length,
        reasonCodes: run.values.map((value) => value.reasonCode).filter(Boolean),
        resultHash: run.resultHash,
      })),
    };
  }, projectName);
}

async function capture(page: Page, name: string) {
  if (process.env.MILESTONE_EVIDENCE !== '1') return [];
  mkdirSync(evidenceDir, { recursive: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: path.join(evidenceDir, `${name}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    const layout = await page.evaluate(() => ({
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      workbenchOverflowX: Math.max(0, (document.querySelector<HTMLElement>('.workbench')?.scrollWidth ?? 0) - (document.querySelector<HTMLElement>('.workbench')?.clientWidth ?? 0)),
      rightPanelOverflowX: Math.max(0, (document.querySelector<HTMLElement>('[data-testid="right-panel"]')?.scrollWidth ?? 0) - (document.querySelector<HTMLElement>('[data-testid="right-panel"]')?.clientWidth ?? 0)),
    }));
    expect(layout.documentOverflowX).toBe(0);
    expect(layout.workbenchOverflowX).toBe(0);
    expect(layout.rightPanelOverflowX).toBe(0);
    results.push({ viewport, ...layout });
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
    const depth = (index + 1) * 0.5;
    const sand = index < 7;
    const qc = sand ? 6200 + random() * 700 : 1500 + random() * 300;
    const qt = qc + (sand ? 220 : 380);
    const fs = sand ? 38 + random() * 8 : 88 + random() * 16;
    const u2 = sand ? 120 + random() * 25 : 420 + random() * 60;
    return [pointName, depth.toFixed(2), qc.toFixed(2), qt.toFixed(2), fs.toFixed(2), u2.toFixed(2), ((100 * fs) / qt).toFixed(4), '20', '7'];
  });
  return ['PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM', ...rows.map((row) => row.join(','))].join('\n');
}

function monitorBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  return errors;
}

function writeEvidence(name: string, csv: string, data: unknown) {
  if (process.env.MILESTONE_EVIDENCE !== '1') return;
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, `${name}.csv`), csv, 'utf8');
  writeFileSync(path.join(evidenceDir, `${name}-run.json`), JSON.stringify({
    ...data as object,
    sourceHashes: {
      app: fileSha256('src/App.tsx'),
      domain: fileSha256('src/features/parameters/customFormulaDomain.ts'),
      document: fileSha256('src/features/parameters/ParameterWorkbenchDocument.tsx'),
      contract: fileSha256('docs/prototype/参数解译G1D受限自定义公式合同.md'),
      spec: fileSha256('tests/e2e/custom-formula-ui.spec.ts'),
    },
  }, null, 2), 'utf8');
}

function fileSha256(relativePath: string) {
  return createHash('sha256').update(readFileSync(path.join(process.cwd(), relativePath))).digest('hex');
}

function randomSeed() {
  return Number(`${Date.now() % 10000000}${Math.floor(Math.random() * 1000)}`.slice(-9));
}
