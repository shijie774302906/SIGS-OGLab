import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process087-preparation-guide');

async function captureEvidence(page: import('@playwright/test').Page, name: string) {
  if (!evidenceEnabled) return;
  mkdirSync(evidenceDirectory, { recursive: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({
      path: join(evidenceDirectory, `${name}-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
      fullPage: true,
    });
  }
}

test('guided preparation fixes one invalid JTS input without changing the uploaded row', async ({ page }, testInfo) => {
  const timings: Record<string, number> = {};
  await page.addInitScript(() => {
    (window as Window & { __process087LongTasks?: Array<{ startTime: number; duration: number }> }).__process087LongTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          const target = (window as Window & { __process087LongTasks: Array<{ startTime: number; duration: number }> }).__process087LongTasks;
          for (const entry of list.getEntries()) target.push({ startTime: entry.startTime, duration: entry.duration });
        }).observe({ entryTypes: ['longtask'] });
      } catch { /* Browser may not expose long-task timing. */ }
    }
  });
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const rows = Array.from({ length: 101 }, (_, index) => {
    const depth = 1 + index * 0.01;
    return index === 50 ? `${depth.toFixed(2)},0.01,5,-100` : `${depth.toFixed(2)},1.00,20,100`;
  });
  const inputPath = testInfo.outputPath('guided-invalid-row.csv');
  writeFileSync(inputPath, ['Depth(m),qc(MPa),fs(kPa),u2(kPa)', ...rows].join('\n'), 'utf8');

  await page.getByTestId('new-project-name').fill('数据准备指南');
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('right-panel-show').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPTU-GUIDED');
  const guideOpenStarted = Date.now();
  await page.getByTestId('confirm-point-command').click();

  await expect(page.getByTestId('probe-guide-dialog')).toBeVisible();
  timings.guideOpenMs = Date.now() - guideOpenStarted;
  await captureEvidence(page, '01-probe-guide');
  await page.getByTestId('probe-guide-recommended').click();
  await expect(page.getByTestId('preparation-guide')).toContainText('已确认');
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('water-guide-dialog')).toBeVisible();
  await captureEvidence(page, '02-water-guide');
  await page.getByTestId('water-guide-present').click();
  await page.getByTestId('water-guide-depth').fill('0');
  const checkCompletionStarted = Date.now();
  await page.getByTestId('water-guide-confirm').click();

  await expect(page.getByTestId('document-check')).toBeVisible();
  timings.checkCompletionMs = Date.now() - checkCompletionStarted;
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-action-queue')).toContainText('JTS 计算输入存在无效值');
  await expect(page.getByTestId('check-selected-issue')).toContainText('1.50 m');
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-has-u2', 'true');
  await expect(page.getByTestId('check-profile-track-qc')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-fs')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-u2')).toBeVisible();
  await expect(page.getByTestId('check-profile-issue-band')).toHaveAttribute('data-depth-from', '1.500');
  await expect(page.getByTestId('check-profile-issue-point-qc')).toBeVisible();
  await expect(page.getByTestId('check-profile-issue-point-fs')).toBeVisible();
  await expect(page.getByTestId('check-profile-issue-point-u2')).toBeVisible();
  await expect(page.getByTestId('check-selected-issue').locator('tbody tr').first().locator('td').nth(3)).toHaveText('-10');
  await page.getByTestId('check-action-queue').getByRole('button', { name: /水深来源/ }).click();
  await expect(page.getByTestId('check-context-explanation')).toContainText('点位上下文');
  await expect(page.getByTestId('check-profile-issue-band')).toHaveCount(0);
  await expect(page.getByTestId('check-primary-focus-problem')).toContainText('处理第 1 项问题');
  await page.getByTestId('check-primary-focus-problem').click();
  await expect(page.getByTestId('check-profile-issue-band')).toHaveAttribute('data-depth-from', '1.500');
  await captureEvidence(page, '03-check-issue');
  await page.getByTestId('check-open-manual-edit').click();
  await expect(page.getByTestId('check-manual-edit-dialog')).toBeVisible();
  await captureEvidence(page, '04-manual-edit');
  await expect(page.getByTestId('check-manual-edit-dialog')).toContainText('原始上传值');
  await expect(page.getByTestId('manual-edit-field')).toHaveValue('qcKpa');
  await expect(page.getByTestId('manual-edit-confirm')).toBeDisabled();
  await page.getByTestId('manual-edit-value').fill('100');
  await page.getByTestId('manual-edit-reason').fill('相邻深度 qc 稳定，复核为单点录入异常');
  await expect(page.getByTestId('manual-edit-confirm')).toBeEnabled();
  await captureEvidence(page, '04b-manual-edit-ready');
  const manualRerunStarted = Date.now();
  await page.getByTestId('manual-edit-confirm').click();

  await expect(page.getByTestId('check-first-look')).toContainText('可进入地层分层');
  timings.manualRerunMs = Date.now() - manualRerunStarted;
  await expect(page.getByTestId('preparation-guide')).toContainText('可以进入');
  await captureEvidence(page, '05-check-recovered');
  const state = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId)!;
    const block = loaded.dataBlocks.find((candidate) => candidate.kind === 'normalized' && candidate.dataBlockId === draft.dataBlockId);
    if (!block || block.kind !== 'normalized') throw new Error('normalized block missing');
    return {
      rawQcKpa: block.rows[50].qcKpa,
      revisions: point.dataGovernance.valueOverrideRevisions ?? [],
      checkRuns: point.checkState.runs.length,
      probeRevision: point.probeContext.revision,
      waterRevision: point.waterContext.revision,
    };
  });
  expect(state.rawQcKpa).toBe(10);
  expect(state.revisions).toHaveLength(1);
  expect(state.revisions[0].overrides[0]).toMatchObject({ field: 'qcKpa', originalValue: 10, effectiveValue: 100 });
  expect(state.checkRuns).toBe(2);

  await page.getByTestId('explorer-project').click();
  await expect(page.getByTestId('project-first-look')).toContainText('数据检查已通过，可进入地层分层');
  await page.getByTestId('right-panel-show').click();
  await page.getByRole('button', { name: '修改点位基准' }).click();
  await page.getByTestId('confirm-jts-probe').click();
  await page.getByTestId('confirm-water-context').click();
  await expect(page.getByTestId('project-first-look')).toContainText('数据检查已通过，可进入地层分层');
  const idempotentState = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    return { artifact: point.checkState.artifact.status, checkRuns: point.checkState.runs.length, probeRevision: point.probeContext.revision, waterRevision: point.waterContext.revision };
  });
  expect(idempotentState).toMatchObject({ artifact: 'current', checkRuns: 2, probeRevision: state.probeRevision, waterRevision: state.waterRevision });
  const reloadStarted = Date.now();
  await page.reload();
  await expect(page.getByTestId('project-first-look')).toContainText('数据检查已通过，可进入地层分层');
  timings.reloadToInteractiveMs = Date.now() - reloadStarted;
  await captureEvidence(page, '06-project-ready-after-reload');
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await captureEvidence(page, '07-project-right-panel-hidden');
  await page.getByTestId('right-panel-show').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');

  if (evidenceEnabled) {
    const layouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      layouts.push(await page.evaluate(({ width, height }) => {
        const measure = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          return element ? Math.max(0, element.scrollWidth - element.clientWidth) : null;
        };
        return {
          viewport: { width, height },
          bodyOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          documentOverflowX: measure('[data-testid="active-document"]'),
          rightDockOverflowX: measure('[data-testid="right-panel"]'),
        };
      }, viewport));
    }
    writeFileSync(
      join(evidenceDirectory, 'browser-check.json'),
      JSON.stringify({ browserErrors, layouts, state, idempotentState, timings, longTasks: await page.evaluate(() => (window as Window & { __process087LongTasks?: unknown[] }).__process087LongTasks ?? []) }, null, 2),
      'utf8',
    );
    expect(browserErrors).toEqual([]);
    expect(layouts.every((layout) => layout.bodyOverflowX === 0 && layout.documentOverflowX === 0 && layout.rightDockOverflowX === 0)).toBe(true);
  }
});

test('guided keep decision persists after reload', async ({ page }, testInfo) => {
  const inputPath = testInfo.outputPath('guided-keep-warning.csv');
  writeFileSync(inputPath, [
    'Depth(m),qc(MPa),fs(kPa)',
    '0.00,1.00,10', '0.25,1.02,10.2', '0.50,1.04,10.4', '0.75,8.00,95',
    '1.00,1.06,10.6', '1.25,1.08,10.8', '1.50,1.10,11.0',
  ].join('\n'), 'utf8');
  await page.getByTestId('new-project-name').fill('保留决定持久化');
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('right-panel-show').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT-KEEP');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await page.getByTestId('water-guide-confirm').click();
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-action-queue')).toContainText('qc 孤立异常');
  await expect(page.getByTestId('check-profile-curves')).toHaveAttribute('data-has-u2', 'false');
  await expect(page.getByTestId('check-profile-track-qc')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-fs')).toBeVisible();
  await expect(page.getByTestId('check-profile-track-u2')).toHaveCount(0);
  await expect(page.getByTestId('check-profile-no-u2')).toContainText('不绘制空曲线');
  await expect(page.getByTestId('check-guided-actions')).toBeVisible();
  await page.getByTestId('check-keep-original').click();
  await expect(page.getByTestId('check-action-feedback')).toContainText('保留原值并接受');
  await expect.poll(() => readKeepDecision(page)).toMatchObject({ kind: 'keep', artifact: 'current' });
  await page.reload();
  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-action-queue')).toContainText('qc 孤立异常');
  await expect.poll(() => readKeepDecision(page)).toMatchObject({ kind: 'keep', artifact: 'current' });
});

async function readKeepDecision(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects[0];
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId)!;
    const revision = point.dataGovernance.exclusionRevisions.find((candidate) => candidate.revisionId === point.dataGovernance.currentExclusionRevisionId);
    return { kind: revision?.decisions.at(-1)?.kind ?? null, artifact: point.checkState.artifact.status };
  });
}
