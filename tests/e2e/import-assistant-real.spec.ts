import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures/isolatedTest';

const sourcePath = path.join(process.cwd(), 'sample_data', 'source', 'yingkou', 'CPT09数据.xlsx');
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process128-import-assistant');
const evidenceEnabled = process.env.PROCESS128_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';

test.describe.configure({ mode: 'serial' });

test('Process128 keeps the real 4,282-row Yingkou workbook bounded and imports the AI-selected sheet through the existing pipeline', async ({ page }) => {
  test.setTimeout(180_000);
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
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deterministic-mock',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      context: { importSource: { sourceFingerprint: string } };
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        content: null,
        calls: [{
          id: 'yingkou-cleanup',
          name: 'propose_import_cleanup',
          arguments: JSON.stringify({
            sourceFingerprint: body.context.importSource.sourceFingerprint,
            sheetName: 'Sheet1',
            headerRow: 9,
            summary: '已识别营口 CPT09 工作表、表头、字段和单位。',
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

  const projectName = `AI 营口实测 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('CPT09');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('import-file-input').setInputFiles(sourcePath);
  await expect(page.getByTestId('parsed-import-result')).toContainText('4282 行', { timeout: 60_000 });
  if (await page.getByTestId('water-guide-dialog').count()) {
    await page.getByTestId('water-guide-dialog').locator('.confirmation-dialog-actions').getByRole('button', { name: '暂不确认' }).click();
  }

  await page.getByTestId('import-ai-entry').getByRole('button', { name: 'AI 整理数据' }).click();
  await page.getByTestId('import-assistant-start').click();
  const cleanup = page.getByTestId('import-assistant-cleanup');
  await expect(cleanup).toContainText('4282 行', { timeout: 60_000 });
  await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('qc (MPa → kPa)');
  if (evidenceEnabled) {
    mkdirSync(evidenceDirectory, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDirectory, 'yingkou-real-cleanup-1920x1080.png'), fullPage: true });
  }
  await page.getByTestId('import-assistant-confirm-import').click();
  await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);

  const persisted = await expect.poll(() => page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    const normalized = loaded.dataBlocks.find((block) => block.dataBlockId === (batch?.kind === 'draft' ? batch.normalizedDataBlockId : null));
    return batch?.kind === 'draft' && normalized?.kind === 'normalized'
      ? {
          headerRow: batch.source.headerRow,
          sheetName: batch.source.sheetName,
          normalizedRows: normalized.rows.length,
          originalFileSize: batch.source.originalFileSize,
        }
      : null;
  }, projectName), { timeout: 60_000 }).toMatchObject({
    headerRow: 9,
    sheetName: 'Sheet1',
    normalizedRows: 4282,
    originalFileSize: 2303900,
  });
  void persisted;
  expect(browserErrors).toEqual([]);
});


