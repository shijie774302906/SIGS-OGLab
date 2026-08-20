import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import { expect, test } from './fixtures/isolatedTest';

const sourcePath = process.env.PROCESS142_GOG_PATH ?? '';
const docsImageDirectory = path.resolve('..', 'SIGS-OGLab-Docs', 'docs', 'public', 'images', 'gog6');
const firstSource = {
  displayRow: 14,
  depthM: 0.665680473372781,
  qcKpa: 66.4206642066421,
  fsKpa: 2.9520295202952,
  u2Kpa: 36.90036900369,
};
const lastSource = {
  displayRow: 73,
  depthM: 39.8520710059172,
  qcKpa: 1594.09594095941,
  fsKpa: 42.0664206642066,
  u2Kpa: 922.509225092251,
};

const headerCorrection = {
  sheetName: 'Sheet1',
  headerRow: 11,
  sourceColumnIndex: 9,
  targetField: 'qc' as const,
  sourceUnit: 'kPa' as const,
};

async function installCapabilities(page: Page) {
  await page.route('**/api/assistant/capabilities', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process142-gog6-docs',
      instanceId: 'process142-gog6-docs',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deterministic-mock',
      requiresApiKey: false,
    }),
  }));
}

function professionalQuestion() {
  return {
    kind: 'tool_calls',
    model: 'deterministic-mock',
    content: null,
    calls: [{
      id: 'gog6-header-correction',
      name: 'ask_import_question',
      arguments: JSON.stringify({
        questionId: 'gog6-qt-header',
        prompt: '源表头写着 qt，这一列实际是不是 qc？',
        reason: 'qt 和 qc 含义不同，不能由 AI 自行替换。',
        options: [
          {
            optionId: 'confirmed-qc',
            label: '是，实际是 qc',
            description: '只修正字段名称，源单元格不变。',
            recommended: true,
            confirmations: [headerCorrection],
          },
          {
            optionId: 'keep-qt',
            label: '不是，保持 qt',
            description: '当前专业导入不把 qt 当作 qc。',
            recommended: false,
          },
        ],
      }),
    }],
  };
}

function professionalProposal(sourceFingerprint: string) {
  return {
    kind: 'tool_calls',
    model: 'deterministic-mock',
    content: null,
    calls: [{
      id: 'gog6-cleanup',
      name: 'propose_import_cleanup',
      arguments: JSON.stringify({
        sourceFingerprint,
        sheetName: 'Sheet1',
        headerRow: 11,
        dataStartRow: 14,
        dataEndRow: 73,
        summary: '已按你的确认把误写为 qt 的表头修正为 qc；源单元格未修改。',
        columns: [
          { sourceColumnIndex: 8, targetField: 'depthM', sourceUnit: 'm', reason: '最终数字化测线深度。' },
          { sourceColumnIndex: 9, targetField: 'qc', sourceUnit: 'kPa', reason: '按用户确认修正表头 qt → qc；源单元格不变。' },
          { sourceColumnIndex: 10, targetField: 'fs', sourceUnit: 'kPa', reason: '最终数字化测线侧摩阻力。' },
          { sourceColumnIndex: 11, targetField: 'u2', sourceUnit: 'kPa', reason: '最终数字化测线孔隙水压力。' },
        ],
        cellEdits: [],
      }),
    }],
  };
}

async function installProfessionalMock(page: Page) {
  await installCapabilities(page);
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ toolCallId?: string }>;
      context: { importSource: { sourceFingerprint: string } };
    };
    const last = body.turns.at(-1);
    await fulfillJson(route, last?.toolCallId === 'gog6-header-correction'
      ? professionalProposal(body.context.importSource.sourceFingerprint)
      : professionalQuestion());
  });
}

async function installQuickMock(page: Page) {
  await installCapabilities(page);
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ toolCallId?: string }>;
      context: {
        scope: { authorityHash: string };
        importSource: {
          protocolVersion: string;
          requestId: string;
          operationId: string;
          sourceFingerprint: string;
          contextHash: string;
        };
      };
    };
    const identity = body.context.importSource;
    const last = body.turns.at(-1);
    const common = {
      protocolVersion: identity.protocolVersion,
      requestId: identity.requestId,
      operationId: identity.operationId,
      sourceFingerprint: identity.sourceFingerprint,
      contextHash: identity.contextHash,
    };
    const decision = last?.toolCallId === 'gog6-quick-header-correction'
      ? {
          ...common,
          kind: 'proposal',
          proposal: {
            proposalId: 'gog6-quick-proposal',
            sheetName: 'Sheet1',
            headerMode: 'present',
            headerRow: 11,
            dataStartRow: 14,
            dataEndRow: 73,
            summary: '已按你的确认把误写为 qt 的表头修正为 qc；源单元格未修改。',
            columns: [
              { sourceColumnIndex: 8, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。', evidenceKind: 'source-explicit' },
              { sourceColumnIndex: 9, targetField: 'qc', sourceUnit: 'kPa', reason: '按用户确认修正表头 qt → qc；源单元格不变。', evidenceKind: 'user-corrected' },
              { sourceColumnIndex: 10, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻力列。', evidenceKind: 'source-explicit' },
              { sourceColumnIndex: 11, targetField: 'u2', sourceUnit: 'kPa', reason: '孔隙水压力列。', evidenceKind: 'source-explicit' },
            ],
            ignoredColumns: [],
            warnings: ['源表头 qt 已按你的确认修正为 qc；源单元格未改，qc 工作值按 kPa → MPa 标准化。'],
          },
        }
      : {
          ...common,
          kind: 'question',
          question: {
            questionId: 'gog6-quick-qt-header',
            prompt: '源表头写着 qt，这一列实际是不是 qc？',
            reason: 'qt 和 qc 含义不同，必须由你确认。',
            options: [
              {
                optionId: 'confirmed-qc',
                recommended: true,
                decisionPatch: {
                  decisionType: 'map-column',
                  sheetName: 'Sheet1',
                  headerRow: 11,
                  sourceColumnIndex: 9,
                  targetField: 'qc',
                  sourceUnit: 'kPa',
                },
              },
              {
                optionId: 'cannot-determine',
                recommended: false,
                decisionPatch: { decisionType: 'cannot-determine' },
              },
            ],
          },
        };
    await fulfillJson(route, {
      kind: 'tool_calls',
      model: 'deterministic-mock',
      content: null,
      calls: [{
        id: last?.toolCallId === 'gog6-quick-header-correction' ? 'gog6-quick-proposal-call' : 'gog6-quick-header-correction',
        name: 'submit_quick_plot_import_decision',
        arguments: JSON.stringify(decision),
      }],
    });
  });
}

async function fulfillJson(route: Route, value: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
}

test.describe('Process142 public GoG 6 documentation case', () => {
  test.skip(!sourcePath || !existsSync(sourcePath), 'Set PROCESS142_GOG_PATH to the local public GoG 6 workbook.');

  test('professional import preserves exact GoG source values and hands corrected qc to downstream qt derivation', async ({ page }) => {
    test.setTimeout(120_000);
    const browserErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await installProfessionalMock(page);
    await page.reload();

    const projectName = 'GoG 6 手册示例';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('new-project-name').fill(projectName);
    await page.getByTestId('project-mode-professional').click();
    await page.getByTestId('create-project-submit').click();
    await page.getByTestId('create-point').click();
    await page.getByTestId('point-name-input').fill('GoG 6');
    await page.getByTestId('confirm-point-command').click();
    await page.getByTestId('probe-guide-recommended').click();
    await page.getByTestId('import-file-input').setInputFiles(sourcePath);
    await expect(page.getByTestId('import-assistant-source')).toContainText('GoG 6 from NGI-UWA 2006.xlsx', { timeout: 30_000 });

    const question = page.getByTestId('import-assistant-question');
    await expect(question).toContainText('实际是不是 qc', { timeout: 30_000 });
    await page.getByTestId('import-assistant-option-confirmed-qc').click();
    const cleanup = page.getByTestId('import-assistant-cleanup');
    await expect(cleanup).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('import-assistant-mapping-summary')).toContainText('qc (kPa → kPa)');
    await expect(page.getByTestId('import-assistant-mapping-summary')).not.toContainText('qt (');
    await cleanup.getByRole('button', { name: '查看字段与改动' }).click();
    await expect(page.getByTestId('import-assistant-preview')).toContainText('按用户确认修正表头 qt → qc；源单元格不变。');
    await page.getByTestId('import-assistant-preview').getByRole('button', { name: '关闭预览' }).click();

    if (process.env.PROCESS142_DOCS_ASSETS === '1') {
      mkdirSync(docsImageDirectory, { recursive: true });
      await page.screenshot({ path: path.join(docsImageDirectory, 'professional-import-location.png'), fullPage: true });
      await cleanup.screenshot({ path: path.join(docsImageDirectory, 'professional-ai-review.png') });
    }

    await page.getByTestId('import-assistant-confirm-import').click();
    await expect(page.getByTestId('import-assistant-panel')).toHaveCount(0);
    await expect(page.getByTestId('import-readiness-summary')).toContainText('60 行', { timeout: 30_000 });

    const evidence = await readProfessionalEvidence(page, projectName);
    expect(evidence).not.toBeNull();
    expect(evidence?.sourceHeader).toBe('qt');
    expect(evidence?.sourceFingerprintMatchesAttachment).toBe(true);
    expect(evidence?.sourceValueOverrides).toBe(0);
    expect(evidence?.sourceDisplayRows).toEqual([firstSource.displayRow, lastSource.displayRow]);
    expect(evidence?.normalizedRowCount).toBe(60);
    expect(evidence?.firstRow).toMatchObject({
      depthM: firstSource.depthM,
      qcKpa: firstSource.qcKpa,
      fsKpa: firstSource.fsKpa,
      u2Kpa: firstSource.u2Kpa,
    });
    expect(evidence?.lastRow).toMatchObject({
      depthM: lastSource.depthM,
      qcKpa: lastSource.qcKpa,
      fsKpa: lastSource.fsKpa,
      u2Kpa: lastSource.u2Kpa,
    });
    expect(evidence?.firstDerivedQtKpa).toBeCloseTo(
      firstSource.qcKpa + (1 - (evidence?.effectiveAreaRatio ?? 0)) * firstSource.u2Kpa,
      9,
    );

    const waterGuide = page.getByTestId('water-guide-dialog');
    await expect(waterGuide).toBeVisible();
    await waterGuide.getByRole('button', { name: '确认并运行数据检查' }).click();
    await expect(page.getByTestId('document-check')).toBeVisible();
    await expect(page.getByTestId('check-first-look')).toContainText('检查完成', { timeout: 30_000 });
    expect(browserErrors).toEqual([]);
  });

  test('quick import preserves GoG source meaning, standardizes qc units, and generates a report', async ({ page }) => {
    test.setTimeout(120_000);
    const browserErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await installQuickMock(page);
    await page.reload();

    const projectName = 'GoG 6 快捷示例';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('new-project-name').fill(projectName);
    await page.getByTestId('project-mode-quick').click();
    await page.getByTestId('create-project-submit').click();
    await page.getByTestId('quick-ai-toggle').click();
    const assistant = page.getByTestId('quick-ai-assistant');
    await assistant.locator('input[type="file"]').setInputFiles(sourcePath);
    const question = page.getByTestId('quick-ai-question');
    await expect(question).toContainText('实际是不是 qc', { timeout: 30_000 });
    await question.getByRole('button', { name: /J 列“qt” → 锥尖阻力 qc.*推荐/ }).click();
    const proposal = page.getByTestId('quick-ai-proposal');
    await expect(proposal).toContainText('按你的修正', { timeout: 30_000 });
    await expect(proposal).toContainText('60 行');
    await expect(proposal).toContainText('66.4206642066421、88.5608856088561、110.70110701107 → 0.066421、0.088561、0.110701');
    await expect(proposal).toContainText('源单元格未改，qc 工作值按 kPa → MPa 标准化。');

    if (process.env.PROCESS142_DOCS_ASSETS === '1') {
      mkdirSync(docsImageDirectory, { recursive: true });
      await page.screenshot({ path: path.join(docsImageDirectory, 'quick-ai-review.png'), fullPage: true });
    }

    await page.getByTestId('quick-ai-confirm-import').click();
    await expect(page.getByText(/60 行 · GoG 6 from NGI-UWA 2006\.xlsx/)).toBeVisible({ timeout: 30_000 });
    const evidence = await readQuickEvidence(page, projectName);
    expect(evidence?.rowCount).toBe(60);
    expect(evidence?.firstRow).toMatchObject({
      depthM: firstSource.depthM,
      qcMpa: firstSource.qcKpa / 1000,
      fsKpa: firstSource.fsKpa,
      u2Kpa: firstSource.u2Kpa,
    });
    expect(evidence?.lastRow).toMatchObject({
      depthM: lastSource.depthM,
      qcMpa: lastSource.qcKpa / 1000,
      fsKpa: lastSource.fsKpa,
      u2Kpa: lastSource.u2Kpa,
    });
    expect(evidence?.firstDerivedQtKpa).toBeCloseTo(
      firstSource.qcKpa + (1 - (evidence?.effectiveAreaRatio ?? 0)) * firstSource.u2Kpa,
      9,
    );

    await page.getByTestId('quick-ai-toggle').click();
    await page.getByTestId('quick-pressure-basis-confirm').check();
    await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
    await page.getByTestId('quick-generate-report').click();
    await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 60_000 });
    expect(browserErrors).toEqual([]);
  });
});

async function readProfessionalEvidence(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const jts = await import('/src/features/jts/jtsT242Domain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    if (!project || batch?.kind !== 'draft') return null;
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId) ?? project.points[0];
    const normalized = loaded.dataBlocks.find((block) => block.dataBlockId === batch.normalizedDataBlockId);
    const raw = loaded.dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId);
    if (!point || normalized?.kind !== 'normalized' || raw?.kind !== 'raw') return null;
    const qcMapping = batch.mappings.find((mapping) => mapping.targetField === 'qc');
    const qcColumn = batch.sourceColumns.find((column) => column.columnId === qcMapping?.sourceColumnId);
    const firstRow = normalized.rows[0] ?? null;
    const lastRow = normalized.rows.at(-1) ?? null;
    const probeProfile = project.probeProfiles.find((profile) => profile.profileId === point.probeContext.activeProfileId);
    const effectiveAreaRatio = probeProfile?.effectiveAreaRatio ?? 0.8;
    const derived = jts.deriveJtsSeries(normalized.rows.map((row, index) => ({
      sourceRowId: normalized.rowReferences?.[index]?.sourceRowId ?? `row-${index}`,
      depthM: row.depthM,
      qcKpa: row.qcKpa,
      fsKpa: row.fsKpa,
      u2Kpa: row.u2Kpa ?? null,
    })), {
      route: 'full_cptu',
      effectiveAreaRatio,
      waterDepthM: 0,
      u2HydrostaticDatum: 'total',
      testZeroDatum: 'mudline',
      waterUnitWeightKnM3: 10,
    });
    return {
      sourceHeader: qcColumn?.header ?? null,
      sourceFingerprintMatchesAttachment: raw.sourceAttachment?.sha256 === batch.sourceFingerprint,
      sourceValueOverrides: batch.sourceValueOverrides?.length ?? 0,
      sourceDisplayRows: [raw.workbookExtraction?.displayRowNumbers[0] ?? null, raw.workbookExtraction?.displayRowNumbers.at(-1) ?? null],
      normalizedRowCount: normalized.rows.length,
      firstRow,
      lastRow,
      effectiveAreaRatio,
      firstDerivedQtKpa: derived.ok ? derived.rows[0]?.qtKpa ?? null : null,
    };
  }, projectName);
}

async function readQuickEvidence(page: Page, projectName: string) {
  return page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const quick = await import('/src/features/quick/quickPlotDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const workspace = project?.quickPlotWorkspace;
    if (!workspace) return null;
    const derived = quick.deriveQuickPlotRows(workspace.rows, workspace.settings);
    return {
      rowCount: workspace.rows.length,
      firstRow: workspace.rows[0] ?? null,
      lastRow: workspace.rows.at(-1) ?? null,
      effectiveAreaRatio: workspace.settings.effectiveAreaRatio,
      firstDerivedQtKpa: derived[0]?.qtKpa ?? null,
    };
  }, projectName);
}
