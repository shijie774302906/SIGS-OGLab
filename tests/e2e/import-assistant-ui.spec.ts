import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';
import { generateProcess129CsvCases, PROCESS129_CSV_SEED } from '../support/process129CsvCases';

const evidenceEnabled = process.env.PROCESS128_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process128-import-assistant');
const process129EvidenceEnabled = process.env.PROCESS129_EVIDENCE === '1';
const process129EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process129-import-csv');
const process131EvidenceEnabled = process.env.PROCESS131_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process131EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process131-import-integrity');
const process155EvidenceEnabled = process.env.PROCESS155_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process155EvidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process155-ai-timeout-copy');

test('AI import asks one structured question, previews a new draft, and imports only after confirmation', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'question');
  await page.reload();

  const projectName = `AI 导入 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('right-panel-assistant-tab')).toHaveCount(0);

  const csv = [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-AI,0.50,1.20,12,20',
    'CPT-AI,1.00,1.50,15,25',
  ].join('\n');
  const filePath = testInfo.outputPath('messy-ai-import.csv');
  writeFileSync(filePath, csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('import-ai-entry')).toBeVisible();
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await expect(page.getByTestId('import-assistant-panel')).toBeVisible();
  await expect(page.getByTestId('import-assistant-provider')).toContainText('测试模型');

  await page.getByTestId('import-assistant-start').click();
  await expect(page.getByTestId('import-assistant-question')).toContainText('哪一行是数据表头');
  await page.getByTestId('import-assistant-option-header-2').click();
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('AI 草稿待确认');
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('原始单元格未修改');
  await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('qc (MPa → kPa)');
  await expect(page.getByTestId('import-first-look')).toContainText('AI 新草稿等待确认');
  await expect(page.getByTestId('import-primary-fix-field')).toHaveCount(0);

  const beforeConfirm = await readActiveImportBatch(page, projectName);
  expect(beforeConfirm?.sourceHeaderRow).not.toBe(2);
  expect(beforeConfirm?.assistantOverrides).toBe(0);

  await page.getByTestId('import-assistant-cleanup').getByRole('button', { name: '查看字段与改动' }).click();
  await expect(page.getByTestId('import-assistant-preview')).toContainText('Depth');
  await expect(page.getByTestId('import-assistant-preview')).toContainText('测量值未修改');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('import-assistant-preview').getByRole('button', { name: '下载整理后 CSV' }).click(),
  ]);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const downloadedCsv = readFileSync(downloadedPath!, 'utf8').replace(/^\uFEFF/, '');
  expect(downloadedCsv).toContain('PointName,Depth(m),qc(kPa),fs(kPa),u2(kPa)');
  expect(downloadedCsv.split(/\r?\n/)[2]).toBe('CPT-AI,1,1500,15,25');
  await page.getByTestId('import-assistant-preview').getByRole('button', { name: '返回确认' }).click();
  expect((await readActiveImportBatch(page, projectName))?.sourceHeaderRow).not.toBe(2);

  if (evidenceEnabled) {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'cleanup-review-1440x900.png'), fullPage: true });
  }

  await page.getByTestId('import-assistant-confirm-import').click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  const afterConfirm = await expect.poll(() => readActiveImportBatch(page, projectName)).toMatchObject({
    sourceHeaderRow: 2,
    selectedSheet: 'CSV',
    assistantOverrides: 0,
    firstRow: {
      depthM: 0.5,
      qcKpa: 1200,
      fsKpa: 12,
      u2Kpa: 20,
    },
  });
  void afterConfirm;

  await page.setViewportSize({ width: 1920, height: 1080 });
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    dockOverflowX: (() => {
      const dock = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      return dock ? Math.max(0, dock.scrollWidth - dock.clientWidth) : -1;
    })(),
  }));
  expect(layout.documentOverflowX).toBe(0);
  expect(layout.dockOverflowX).toBe(0);
  expect(browserErrors).toEqual([]);
  expect(turnBodies).toHaveLength(3);

  if (evidenceEnabled) {
    await page.screenshot({ path: path.join(evidenceDirectory, 'confirmed-import-1920x1080.png'), fullPage: true });
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 'Process128',
      provider: 'deterministic-mock',
      originalSourceRows: 4,
      unconfirmedImports: 0,
      confirmedImports: 1,
      turnCount: turnBodies.length,
      browserErrors,
      layout,
    }, null, 2), 'utf8');
  }
});

test('PROCESS155 professional import stays active beyond 55 seconds and then shows the draft', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));

  await page.route('**/api/assistant/capabilities', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process155-slow-import',
      instanceId: 'playwright-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deepseek-v4-pro',
      taskModels: { professional: 'deepseek-v4-pro', import: 'deepseek-v4-flash' },
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      context: { importSource: { sourceFingerprint: string } };
    };
    await new Promise((resolve) => setTimeout(resolve, 56_000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deepseek-v4-flash',
        content: null,
        calls: [{
          id: 'process155-cleanup',
          name: 'propose_import_cleanup',
          arguments: JSON.stringify({
            sourceFingerprint: body.context.importSource.sourceFingerprint,
            sheetName: 'CSV',
            headerRow: 1,
            summary: '已识别深度、qc、fs 和 u2；测量值保持不变。',
            columns: [
              { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。' },
              { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '锥尖阻力列。' },
              { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻列。' },
              { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa', reason: '孔压列。' },
            ],
            cellEdits: [],
          }),
        }],
      }),
    });
  });
  await page.reload();

  const projectName = `AI 慢响应 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();

  const filePath = testInfo.outputPath('process155-slow.csv');
  writeFileSync(filePath, ['深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)', '0.5,1.2,12,20', '1.0,1.5,15,25'].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('import-template-actions')).not.toBeVisible();
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await expect(page.getByTestId('import-assistant-provider')).toContainText('测试模型');
  await page.getByTestId('import-assistant-start').click();

  const running = page.getByTestId('import-assistant-running');
  await expect(running).toBeVisible();
  await expect(page.getByTestId('import-assistant-start')).toHaveCount(0);
  await expect(running.getByRole('button', { name: '停止' })).toBeVisible();
  await page.waitForTimeout(55_200);
  await expect(running).toContainText(/已等待 5[45] 秒/);
  await expect(running).toContainText('AI 正在分析文件');
  await expect(page.getByTestId('import-assistant-error')).toHaveCount(0);
  const layouts: Array<{ viewport: string; bodyOverflowX: boolean; panelOverflowX: boolean }> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-testid="import-assistant-panel"]');
      return {
        bodyOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        panelOverflowX: Boolean(panel && panel.scrollWidth > panel.clientWidth),
      };
    });
    expect(layout).toEqual({ bodyOverflowX: false, panelOverflowX: false });
    layouts.push({ viewport: `${viewport.width}x${viewport.height}`, ...layout });
    if (process155EvidenceEnabled) {
      mkdirSync(process155EvidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(process155EvidenceDirectory, `slow-import-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('AI 草稿待确认', { timeout: 5_000 });
  expect(browserErrors).toEqual([]);
  if (process155EvidenceEnabled) {
    writeFileSync(path.join(process155EvidenceDirectory, 'slow-import-browser-check.json'), JSON.stringify({
      process: 'Process155',
      simulatedUpstreamDelayMs: 56_000,
      stillRunningAfterMs: 55_200,
      completed: true,
      layouts,
      browserErrors,
    }, null, 2), 'utf8');
  }
});

test('measurement edits require review, persist with confirmed provenance, and keep the original source', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'value-edit');
  await page.reload();

  const projectName = `AI 数值授权 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const csv = [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-AI,0.50,1.20,12,20',
    'CPT-AI,1.00,1.50,15,25',
  ].join('\n');
  const filePath = testInfo.outputPath('value-edit-ai-import.csv');
  writeFileSync(filePath, csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();

  const advanced = page.locator('details.import-assistant-advanced');
  await expect(advanced).not.toHaveAttribute('open', '');
  await advanced.locator('summary').click();
  await page.getByTestId('import-assistant-allow-value-edits').check();
  await page.getByTestId('import-assistant-start').click();
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('待复核 1 项');
  const confirm = page.getByTestId('import-assistant-confirm-import');
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveText('先查看测量值改动');
  await page.getByTestId('import-assistant-cleanup').getByRole('button', { name: '查看并确认 1 项改动' }).click();
  const preview = page.getByTestId('import-assistant-preview');
  await expect(preview).toContainText('1.20');
  await expect(preview).toContainText('1.25');
  await expect(preview).toContainText('用户明确指出该源单元格是录入错误');
  const previewChecks: Array<Record<string, unknown>> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const check = await inspectPreviewLayout(page);
    expect(check.documentOverflowX).toBe(0);
    expect(check.dialogOverflowX).toBe(0);
    expect(check.dialogInsideViewport).toBe(true);
    previewChecks.push(check);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `value-edit-preview-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }
  await preview.getByRole('button', { name: '返回确认' }).click();
  await expect(confirm).toBeEnabled();
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('已查看全部测量值改动');

  await confirm.click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  const current = await readActiveImportBatch(page, projectName);
  expect(current).toMatchObject({
    sourceHeaderRow: 2,
    assistantOverrides: 1,
    firstRow: { qcKpa: 1250 },
    firstOverride: {
      originalValue: '1.20',
      replacementValue: '1.25',
      source: 'assistant',
    },
  });
  expect(current?.firstOverride?.confirmedAt).toMatch(/^20\d{2}-/);
  expect(current?.firstOverride?.proposedAt).toMatch(/^20\d{2}-/);
  expect(current?.attachmentMatchesSource).toBe(true);
  await page.reload();
  await expect.poll(() => readActiveImportBatch(page, projectName)).toMatchObject({
    assistantOverrides: 1,
    firstRow: { qcKpa: 1250 },
    firstOverride: { originalValue: '1.20', replacementValue: '1.25' },
  });
  expect(browserErrors).toEqual([]);
  expect(turnBodies).toHaveLength(2);
  if (evidenceEnabled) {
    writeFileSync(path.join(evidenceDirectory, 'preview-browser-check.json'), JSON.stringify({
      process: 'Process128',
      previewChecks,
      browserErrors,
      valueEdit: {
        reviewedBeforeCommit: true,
        originalValue: current?.firstOverride?.originalValue,
        workingValueKpa: current?.firstRow?.qcKpa,
        confirmedAt: current?.firstOverride?.confirmedAt,
      },
    }, null, 2), 'utf8');
  }
});

test('an uncertain structured question can return to manual tools without changing the current draft', async ({ page }, testInfo) => {
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'question');
  await page.reload();
  const projectName = `AI 安全返回 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const filePath = testInfo.outputPath('manual-fallback-ai-import.csv');
  writeFileSync(filePath, [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-AI,0.50,1.20,12,20',
  ].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect.poll(() => readActiveImportBatch(page, projectName)).not.toBeNull();
  const before = await readActiveImportBatch(page, projectName);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await page.getByTestId('import-assistant-start').click();
  await expect(page.getByTestId('import-assistant-question')).toBeVisible();
  await page.getByRole('button', { name: /都不是，手动选择/ }).click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  await expect(page.getByTestId('import-ai-entry')).toBeVisible();
  expect(await readActiveImportBatch(page, projectName)).toEqual(before);
  expect(turnBodies).toHaveLength(2);
});

test('a late AI response is discarded after the user returns to manual import', async ({ page }, testInfo) => {
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'slow');
  await page.reload();
  const projectName = `AI 迟到响应 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const filePath = testInfo.outputPath('late-response.csv');
  writeFileSync(filePath, [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-AI,0.5,1.2,12,20',
  ].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('import-ai-entry')).toBeVisible();
  await expect.poll(() => readActiveImportBatch(page, projectName)).not.toBeNull();
  const before = await readActiveImportBatch(page, projectName);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await page.getByTestId('import-assistant-start').click();
  await expect(page.getByTestId('import-assistant-running')).toBeVisible();
  await page.getByRole('button', { name: '返回导入工具' }).click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  await page.waitForTimeout(700);
  expect(await readActiveImportBatch(page, projectName)).toEqual(before);
  await expect(page.getByTestId('import-assistant-cleanup')).toHaveCount(0);
});

test('a workspace revision conflict leaves the AI proposal and current import authority unchanged', async ({ page }, testInfo) => {
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'value-edit');
  await page.reload();
  const projectName = `AI 保存冲突 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const filePath = testInfo.outputPath('workspace-conflict.csv');
  writeFileSync(filePath, [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-AI,0.50,1.20,12,20',
  ].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  const advanced = page.locator('details.import-assistant-advanced');
  await advanced.locator('summary').click();
  await page.getByTestId('import-assistant-allow-value-edits').check();
  await page.getByTestId('import-assistant-start').click();
  await page.getByRole('button', { name: '查看并确认 1 项改动' }).click();
  await page.getByTestId('import-assistant-preview').getByRole('button', { name: '返回确认' }).click();
  const before = await readActiveImportBatch(page, projectName);
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
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });
    if (!saved.ok) throw new Error(saved.detail);
  });
  await page.getByTestId('import-assistant-confirm-import').click();
  await expect(page.getByTestId('import-assistant-error')).toContainText('先处理保存冲突');
  await expect(page.getByTestId('import-assistant-error')).toContainText('请先解决其他标签页的保存冲突');
  await expect(page.getByTestId('import-first-look')).toContainText('先处理保存冲突');
  await expect(page.getByTestId('import-first-look')).toContainText('草稿已保留');
  await expect(page.getByTestId('import-assistant-retry-confirm')).toHaveCount(0);
  await expect(page.getByTestId('import-assistant-open-save-help')).toBeVisible();
  await expect(page.getByTestId('import-assistant-cleanup')).toBeVisible();
  const layoutChecks: Array<Record<string, unknown>> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const dock = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      const recoveryAction = document.querySelector<HTMLElement>('[data-testid="import-assistant-retry-confirm"], [data-testid="import-assistant-open-save-help"]');
      const recoveryActionRect = recoveryAction?.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        dockOverflowX: dock ? Math.max(0, dock.scrollWidth - dock.clientWidth) : -1,
        recoveryActionInsideViewport: Boolean(recoveryActionRect && recoveryActionRect.left >= 0 && recoveryActionRect.right <= innerWidth),
      };
    });
    expect(layout.documentOverflowX).toBe(0);
    expect(layout.dockOverflowX).toBe(0);
    expect(layout.recoveryActionInsideViewport).toBe(true);
    layoutChecks.push(layout);
    if (process131EvidenceEnabled) {
      mkdirSync(process131EvidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(process131EvidenceDirectory, `conflict-recovery-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }
  const after = await readActiveImportBatch(page, projectName);
  expect(after?.assistantOverrides).toBe(before?.assistantOverrides);
  expect(after?.sourceHeaderRow).toBe(before?.sourceHeaderRow);
  const aiTurnCount = turnBodies.length;
  await page.getByTestId('import-assistant-open-save-help').click();
  await expect(page.getByTestId('workspace-save-help')).toBeVisible();
  expect(turnBodies).toHaveLength(aiTurnCount);
  if (process131EvidenceEnabled) {
    writeFileSync(path.join(process131EvidenceDirectory, 'conflict-browser-check.json'), JSON.stringify({
      process: 'Process131',
      recoveryState: 'AI proposal preserved after workspace revision conflict',
      proposalPreserved: true,
      conflictRequiresResolution: true,
      aiTurnCountBeforeRecovery: aiTurnCount,
      aiTurnCountAfterRecovery: turnBodies.length,
      layoutChecks,
    }, null, 2), 'utf8');
  }
});

test('a temporary AI import save failure keeps the proposal and succeeds without another AI turn', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const turnBodies: Array<Record<string, unknown>> = [];
  await installImportAssistantMock(page, turnBodies, 'question');
  await page.reload();
  const projectName = `AI 保存重试 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const filePath = testInfo.outputPath('temporary-save-failure.csv');
  writeFileSync(filePath, [
    '现场导出结果,,,,',
    '点位,深度(m),锥尖阻力(MPa),侧摩阻(kPa),孔压(kPa)',
    'CPT-RETRY,0.50,1.20,12,20',
    'CPT-RETRY,1.00,1.50,15,25',
  ].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await page.getByTestId('import-assistant-start').click();
  await page.getByTestId('import-assistant-option-header-2').click();
  await expect(page.getByTestId('import-assistant-cleanup')).toContainText('AI 草稿待确认');
  const before = await readActiveImportBatch(page, projectName);
  const aiTurnCount = turnBodies.length;

  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    const storage = navigator.storage;
    const originalEstimate = storage?.estimate?.bind(storage);
    let remainingFailures = 2;
    (window as unknown as { __restoreProcess131Put?: () => void }).__restoreProcess131Put = () => {
      IDBObjectStore.prototype.put = original;
      if (storage && originalEstimate) {
        Object.defineProperty(storage, 'estimate', { configurable: true, value: originalEstimate });
      }
    };
    if (storage) {
      Object.defineProperty(storage, 'estimate', {
        configurable: true,
        value: async () => ({ usage: 15 * 1024 ** 2, quota: 100 * 1024 ** 2 }),
      });
    }
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error('Process131 forced temporary write failure');
      }
      return original.apply(this, args);
    };
  });
  await page.getByTestId('import-assistant-confirm-import').click();
  await expect(page.getByTestId('import-assistant-error')).toContainText('本次导入尚未保存');
  await expect(page.getByTestId('import-assistant-error')).toContainText('无需重新调用 AI');
  await expect(page.getByTestId('import-assistant-retry-confirm')).toBeVisible();
  await expect(page.getByTestId('import-assistant-cleanup')).toBeVisible();
  await expect(page.getByTestId('project-storage-workspace-notice')).toHaveAttribute('data-storage-failure', 'temporary');
  await expect(page.getByTestId('retry-workspace-save')).toHaveCount(0);
  await expect(page.getByTestId('open-import-assistant-save-recovery')).toHaveText('查看右侧恢复');
  await page.getByTestId('open-import-assistant-save-recovery').click();
  await expect(page.getByTestId('import-assistant-retry-confirm')).toBeFocused();
  expect(await readActiveImportBatch(page, projectName)).toEqual(before);
  expect(turnBodies).toHaveLength(aiTurnCount);

  const layoutChecks: Array<Record<string, unknown>> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const dock = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      const recoveryAction = document.querySelector<HTMLElement>('[data-testid="import-assistant-retry-confirm"]');
      const recoveryActionRect = recoveryAction?.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        dockOverflowX: dock ? Math.max(0, dock.scrollWidth - dock.clientWidth) : -1,
        recoveryActionInsideViewport: Boolean(
          recoveryActionRect
          && recoveryActionRect.left >= 0
          && recoveryActionRect.right <= innerWidth
          && recoveryActionRect.top >= 0
          && recoveryActionRect.bottom <= innerHeight
        ),
      };
    });
    expect(layout.documentOverflowX).toBe(0);
    expect(layout.dockOverflowX).toBe(0);
    expect(layout.recoveryActionInsideViewport).toBe(true);
    layoutChecks.push(layout);
    if (process131EvidenceEnabled) {
      mkdirSync(process131EvidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(process131EvidenceDirectory, `save-recovery-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }

  await page.evaluate(() => (window as unknown as { __restoreProcess131Put?: () => void }).__restoreProcess131Put?.());
  await page.getByTestId('import-assistant-retry-confirm').click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  await expect.poll(() => readActiveImportBatch(page, projectName)).toMatchObject({
    sourceHeaderRow: 2,
    selectedSheet: 'CSV',
    assistantOverrides: 0,
    firstRow: {
      depthM: 0.5,
      qcKpa: 1200,
      fsKpa: 12,
      u2Kpa: 20,
    },
  });
  expect(turnBodies).toHaveLength(aiTurnCount);
  await page.reload();
  await expect.poll(() => readActiveImportBatch(page, projectName)).toMatchObject({
    sourceHeaderRow: 2,
    selectedSheet: 'CSV',
    firstRow: { depthM: 0.5, qcKpa: 1200, fsKpa: 12, u2Kpa: 20 },
  });
  expect(browserErrors).toEqual([]);
  if (process131EvidenceEnabled) {
    writeFileSync(path.join(process131EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 'Process131',
      recoveryState: 'temporary AI import save failure recovered in place',
      proposalPreserved: true,
      persistedAfterRetryAndReload: true,
      aiTurnCountBeforeRecovery: aiTurnCount,
      aiTurnCountAfterRecovery: turnBodies.length,
      browserErrors,
      layoutChecks,
    }, null, 2), 'utf8');
  }
});

test(`Process129 sends five generated 100-row CSV layouts through the AI review without changing values (${PROCESS129_CSV_SEED})`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const generatedCases = generateProcess129CsvCases();
  const caseByFileName = new Map(generatedCases.map((generated) => [generated.fileName, generated]));
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.route('**/api/assistant/capabilities', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process134-ai-import-v1',
      instanceId: 'playwright-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deepseek-v4-pro',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string }>;
      context: {
        importSource: {
          fileName: string;
          sourceFingerprint: string;
        };
      };
    };
    const generated = caseByFileName.get(body.context.importSource.fileName);
    if (!generated) throw new Error(`未知测试文件：${body.context.importSource.fileName}`);
    if (body.turns.at(-1)?.role !== 'tool') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deepseek-v4-pro',
          content: null,
          calls: [{
            id: `read-${generated.id}`,
            name: 'read_import_source',
            arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 1, rowCount: 12 }),
          }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deepseek-v4-pro',
        content: null,
        calls: [{
          id: `cleanup-${generated.id}`,
          name: 'propose_import_cleanup',
          arguments: JSON.stringify({
            sourceFingerprint: body.context.importSource.sourceFingerprint,
            sheetName: 'CSV',
            headerRow: generated.headerRow,
            summary: '只整理字段、顺序、单位和分隔符；测量值保持不变。',
            columns: generated.targets.map((target) => ({
              ...target,
              reason: '由表头和单位唯一识别。',
            })),
            cellEdits: [],
          }),
        }],
      }),
    });
  });
  await page.reload();

  const projectName = `AI 五类 CSV ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT-P129');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();

  for (const [index, generated] of generatedCases.entries()) {
    const filePath = testInfo.outputPath(generated.fileName);
    writeFileSync(filePath, generated.text, 'utf8');
    await page.getByTestId('import-file-input').setInputFiles(filePath);
    await dismissWaterGuideIfVisible(page);
    await expect(page.getByTestId('import-ai-entry')).toBeVisible();
    await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
    await page.getByTestId('import-assistant-start').click();
    const cleanup = page.getByTestId('import-assistant-cleanup');
    await expect(cleanup).toContainText('100 行');
    await expect(cleanup).toContainText('原始单元格未修改');
    await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('Depth');
    await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('qc');
    await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('fs');
    await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('u2');

    if (index < generatedCases.length - 1) {
      await cleanup.getByRole('button', { name: '取消' }).click();
      await page.getByRole('button', { name: '返回导入工具' }).click();
      await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
      continue;
    }
    if (process129EvidenceEnabled) {
      mkdirSync(path.join(process129EvidenceDirectory, 'input'), { recursive: true });
      writeFileSync(
        path.join(process129EvidenceDirectory, 'input', generated.fileName),
        generated.text,
        'utf8',
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: path.join(process129EvidenceDirectory, 'five-layout-cleanup-1440x900.png'),
        fullPage: true,
      });
    }
    await page.getByTestId('import-assistant-confirm-import').click();
    await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
    const expectedFirst = generated.rows[0];
    await expect.poll(() => readActiveImportBatch(page, projectName)).toMatchObject({
      sourceHeaderRow: generated.headerRow,
      normalizedRows: 100,
      assistantOverrides: 0,
      firstRow: {
        depthM: expectedFirst.depthM,
        qcKpa: expectedFirst.qcKpa,
        fsKpa: expectedFirst.fsKpa,
        u2Kpa: expectedFirst.u2Kpa,
      },
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    dockOverflowX: (() => {
      const dock = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      return dock ? Math.max(0, dock.scrollWidth - dock.clientWidth) : -1;
    })(),
  }));
  expect(layout.documentOverflowX).toBe(0);
  expect(layout.dockOverflowX).toBe(0);
  expect(browserErrors).toEqual([]);
  if (process129EvidenceEnabled) {
    await page.screenshot({
      path: path.join(process129EvidenceDirectory, 'confirmed-import-1920x1080.png'),
      fullPage: true,
    });
    writeFileSync(path.join(process129EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 'Process129',
      seed: PROCESS129_CSV_SEED,
      model: 'deepseek-v4-pro',
      generatedCases: generatedCases.map(({ id, fileName, delimiter, headerRow }) => ({
        id,
        fileName,
        delimiter,
        headerRow,
        sourceRows: 100,
        assistantOverrides: 0,
      })),
      confirmedImports: 1,
      browserErrors,
      layout,
    }, null, 2), 'utf8');
  }
});

test('Process129 turns an unusable AI operation into plain recovery choices', async ({ page }, testInfo) => {
  await page.route('**/api/assistant/capabilities', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process134-ai-import-v1',
      instanceId: 'playwright-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deepseek-v4-pro',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      kind: 'tool_calls',
      model: 'deepseek-v4-pro',
      content: null,
      calls: [{ id: 'wrong-page-tool', name: 'read_workflow_summary', arguments: '{}' }],
    }),
  }));
  await page.reload();
  await page.getByTestId('new-project-name').fill(`AI 失败恢复 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT-P129');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  const generated = generateProcess129CsvCases()[0];
  const filePath = testInfo.outputPath(generated.fileName);
  writeFileSync(filePath, generated.text, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await dismissWaterGuideIfVisible(page);
  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await page.getByTestId('import-assistant-start').click();
  const error = page.getByTestId('import-assistant-error');
  await expect(error).toContainText('没有生成可确认的字段整理草稿');
  await expect(error).toContainText('原始文件未修改');
  await expect(error.getByRole('button', { name: '重试' })).toBeVisible();
  await expect(error.getByRole('button', { name: '手动映射或换文件' })).toBeVisible();
  await page.getByTestId('import-assistant-manual-fallback').click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
  await expect(page.getByTestId('import-file-input')).toBeVisible();
});

async function installImportAssistantMock(
  page: Page,
  turnBodies: Array<Record<string, unknown>>,
  mode: 'question' | 'value-edit' | 'slow',
) {
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string; toolCallId?: string; reasoningContent?: string }>;
      context: { importSource: { sourceFingerprint: string } };
    };
    turnBodies.push(body as unknown as Record<string, unknown>);
    if (mode === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'message',
          model: 'deterministic-mock',
          content: '迟到响应不应写入页面。',
        }),
      }).catch(() => {});
      return;
    }
    const last = body.turns.at(-1);
    if (last?.toolCallId === 'question-header' || (mode === 'value-edit' && last?.toolCallId === 'read-source')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          content: null,
          calls: [{
            id: 'cleanup-proposal',
            name: 'propose_import_cleanup',
            arguments: JSON.stringify({
              sourceFingerprint: body.context.importSource.sourceFingerprint,
              sheetName: 'CSV',
              headerRow: 2,
              summary: '已识别点位、深度、qc、fs 和 u2。',
              columns: [
                { sourceColumnIndex: 0, targetField: 'pointName', sourceUnit: 'text', reason: '点位名称列。' },
                { sourceColumnIndex: 1, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。' },
                { sourceColumnIndex: 2, targetField: 'qc', sourceUnit: 'MPa', reason: '锥尖阻力列。' },
                { sourceColumnIndex: 3, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻列。' },
                { sourceColumnIndex: 4, targetField: 'u2', sourceUnit: 'kPa', reason: '孔压列。' },
              ],
              cellEdits: mode === 'value-edit' ? [{
                displayRowNumber: 3,
                sourceColumnIndex: 2,
                originalValue: '1.20',
                newValue: '1.25',
                reason: '用户明确指出该源单元格是录入错误；AI 仅整理当前文件中的这一处格式值，原始上传附件和源单元格保持不变，确认后工作值按新值进入导入草稿。',
              }] : [],
            }),
          }],
        }),
      });
      return;
    }
    if (last?.toolCallId === 'read-source') {
      expect(body.turns.at(-2)?.reasoningContent).toBe('provider-thinking-state');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          content: null,
          calls: [{
            id: 'question-header',
            name: 'ask_import_question',
            arguments: JSON.stringify({
              questionId: 'header-row',
              prompt: '哪一行是数据表头？',
              reason: '文件前面有一行标题，需要你确认。',
              options: [
                { optionId: 'header-2', label: '第 2 行', description: '点位、深度、qc、fs、u2', recommended: true },
                { optionId: 'keep-looking', label: '继续查看', description: '读取后续行再判断', recommended: false },
              ],
            }),
          }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        content: null,
        reasoningContent: 'provider-thinking-state',
        calls: [{
          id: 'read-source',
          name: 'read_import_source',
          arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 1, rowCount: 10 }),
        }],
      }),
    });
  });
}

async function dismissWaterGuideIfVisible(page: Page) {
  const dialog = page.getByTestId('water-guide-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: '暂不确认' }).last().click();
    await expect(dialog).toHaveCount(0);
  }
}

async function readActiveImportBatch(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    if (!project || batch?.kind !== 'draft') return null;
    const normalized = loaded.dataBlocks.find((block) => block.dataBlockId === batch.normalizedDataBlockId);
    const raw = loaded.dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId);
    const firstOverride = batch.sourceValueOverrides?.[0] ?? null;
    return {
      sourceHeaderRow: batch.source.headerRow ?? null,
      selectedSheet: batch.source.sheetName ?? null,
      assistantOverrides: batch.sourceValueOverrides?.length ?? 0,
      firstOverride,
      normalizedRows: normalized?.kind === 'normalized' ? normalized.rows.length : 0,
      attachmentMatchesSource: raw?.kind === 'raw'
        ? raw.sourceAttachment?.sha256 === batch.sourceFingerprint
        : false,
      firstRow: normalized?.kind === 'normalized' ? normalized.rows[0] ?? null : null,
    };
  }, projectName);
}

async function inspectPreviewLayout(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('[data-testid="import-assistant-preview"]');
    const rect = dialog?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      dialogOverflowX: dialog ? Math.max(0, dialog.scrollWidth - dialog.clientWidth) : -1,
      dialogInsideViewport: Boolean(rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight),
    };
  });
}
