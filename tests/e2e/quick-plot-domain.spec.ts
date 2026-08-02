import { expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { createQuickPlotRevision, createQuickPlotWorkspace, deriveQuickPlotRows, parseQuickPlotClipboard, QUICK_BQ_REFERENCE_POLYGONS, QUICK_PARAMETER_CLASSIFICATION_BASIS, QUICK_PARAMETER_COMPARISON_ROLE, QUICK_PDF_A3_PIXELS, QUICK_PDF_DPI, QUICK_REPORT_AXIS_LABELS, QUICK_REPORT_PAGE_SPECS, QUICK_REPORT_STYLE, QUICK_REPORT_ZONE_COLORS, QUICK_SOIL_COLORS, quickCrossCorrelation, quickFuzzyMembership, quickFuzzyMembershipFromU, quickPermeabilityFromIc, quickPlotAssistantPageEvidence, quickPlotClassificationEvidence, quickPlotFormulaAudit, quickPlotInputHash, quickPlotPdfAuthority, quickPlotReadiness, quickPlotRoute, quickRelativeDensityPercent, quickRobertson2010SbtZone, quickRobertsonSbtnZone, quickRobustDisplayRange, quickRowsFromTable, quickSandStateParameter, quickSaturatedPhysicalIndices } from '../../src/features/quick/quickPlotDomain';
import { classifyRobertson2016, classifySchneider2008, deriveRobertsonQtn, schneider2008Boundaries } from '../../src/features/quick/quickClassificationDomain';
import { createQuickPlotXlsx } from '../../src/features/quick/quickPlotWorkbook';
import { buildQuickPlotRowsFromProposal, QUICK_PLOT_IMPORT_PROTOCOL, quickPlotDecisionFromTool, quickPlotProposalFromTool, quickPlotQuestionOptionLabel } from '../../src/features/quick/quickPlotAssistantDomain';
import { buildQuickReportExplanation, executeQuickReportReadTool, hasQuickReportEvidenceForQuestion, QUICK_REPORT_HISTORY_ANSWER_LIMIT, quickReportSourceDetail, trimQuickReportTurns } from '../../src/features/quick/QuickPlotAssistantPanel';
import type { AssistantContextSnapshot, AssistantWireTurn } from '../../src/features/assistant/assistantTypes';
import type { ImportAssistantSource } from '../../src/features/import/importAssistantDomain';
import {
  createSyntheticCptuDemoCsv,
  createSyntheticCptuDemoRows,
  SYNTHETIC_CPTU_DEMO_NAME,
} from '../../src/features/demo/syntheticCptuDemo';

test('PROCESS140 synthetic CPTU demo is deterministic, complete and explicitly non-project data', () => {
  const rows = createSyntheticCptuDemoRows();
  expect(rows).toHaveLength(121);
  expect(createSyntheticCptuDemoRows()).toEqual(rows);
  expect(rows[0]).toMatchObject({ depthM: 0, rowId: 'synthetic-cptu-001' });
  expect(rows.at(-1)?.depthM).toBe(30);
  expect(rows.every((row) => Number.isFinite(row.qcMpa) && Number.isFinite(row.fsKpa) && Number.isFinite(row.u2Kpa))).toBe(true);
  expect(createSyntheticCptuDemoCsv()).toContain('Depth(m),qc(MPa),fs(kPa),u2(kPa)');
  expect(`${SYNTHETIC_CPTU_DEMO_NAME}${createSyntheticCptuDemoCsv()}`).not.toMatch(/营口|CPT09|CPT-09|yingkou/i);
});

test('PROCESS145 report tools expose the exact generated Fuzzy, JTS and comparison layers', () => {
  const workspace = createQuickPlotWorkspace('process145-evidence');
  workspace.rows = createSyntheticCptuDemoRows();
  workspace.settings.pressureBasisConfirmed = true;
  workspace.settings.u2Usage = 'total';
  const before = structuredClone(workspace);

  const fuzzy = quickPlotAssistantPageEvidence(workspace, 5) as {
    generatedFromSameRowsAsAtlas: boolean;
    method: string;
    inputs: string[];
    outputClasses: string[];
    layers: Array<{ depthFromM: number; depthToM: number; label: string; confidencePercent?: number }>;
  };
  const jts = quickPlotAssistantPageEvidence(workspace, 6) as {
    method: string;
    inputs: string[];
    zoneSystem: string;
    layers: Array<{ depthFromM: number; depthToM: number; label: string; confidencePercent?: number }>;
  };
  const sbt = quickPlotAssistantPageEvidence(workspace, 2) as {
    definitions: { sbt: { inputs: string[]; doesNotUse: string[] }; bq: { formula: string } };
  };
  const comparison = quickPlotAssistantPageEvidence(workspace, 9) as {
    classificationComparison: { jts: unknown[]; robertson2016: unknown[]; schneider2008: unknown[] };
  };
  const sandParameters = quickPlotAssistantPageEvidence(workspace, 10) as {
    applicableJtsLayers: Array<{ category: string }>;
    parameterGroups: Array<{ title: string; validCount: number; applicability: string; formulas: string[] }>;
    statistics: Array<{ field: string; minimum: number | null; maximum: number | null }>;
    references: Array<[string, string]>;
  };
  const clayParameters = quickPlotAssistantPageEvidence(workspace, 11) as {
    applicableJtsLayers: Array<{ category: string }>;
    parameterGroups: Array<{ title: string; validCount: number; applicability: string; formulas: string[] }>;
  };

  expect(fuzzy.generatedFromSameRowsAsAtlas).toBe(true);
  expect(fuzzy.method).toContain('Fuzzy');
  expect(fuzzy.inputs).toEqual(['qc（MPa）', 'Rf = fs / qc × 100%']);
  expect(fuzzy.outputClasses).toEqual(['黏土', '粉土/过渡土', '砂土']);
  expect(fuzzy.layers.length).toBeGreaterThan(0);
  expect(fuzzy.layers.every((layer) => layer.depthToM > layer.depthFromM && /土/.test(layer.label))).toBe(true);
  expect(fuzzy.layers.every((layer) => typeof layer.confidencePercent === 'number')).toBe(true);
  expect(jts.method).toContain('JTS/T 242');
  expect(jts.inputs).toEqual(['JTS 土体行为类型指数 Ic', '净锥尖阻力 qnet']);
  expect(jts.zoneSystem).toContain('Zone 1–9');
  expect(sbt.definitions.sbt.inputs).toEqual(['qc', 'fs']);
  expect(sbt.definitions.sbt.doesNotUse).toEqual(['u2']);
  expect(sbt.definitions.bq.formula).toBe('Bq = (u2 - u0) / (qt - σv0)');
  expect(jts.layers.length).toBeGreaterThan(0);
  expect(jts.layers.every((layer) => /Zone \d/.test(layer.label))).toBe(true);
  expect(jts.layers.every((layer) => typeof layer.confidencePercent === 'number')).toBe(true);
  expect(comparison.classificationComparison.jts).toEqual(jts.layers);
  expect(comparison.classificationComparison.robertson2016.length).toBeGreaterThan(0);
  expect(comparison.classificationComparison.schneider2008.length).toBeGreaterThan(0);
  expect(sandParameters.applicableJtsLayers.length).toBeGreaterThan(0);
  expect(sandParameters.applicableJtsLayers.every((layer) => Number(layer.category) >= 7)).toBe(true);
  expect(sandParameters.parameterGroups.some((group) => group.title.includes('相对密实度') && group.validCount > 0)).toBe(true);
  expect(sandParameters.statistics.find((stat) => stat.field === 'permeability')?.minimum).toBeGreaterThan(0);
  expect(sandParameters.references.map(([id]) => id)).toEqual(['R03', 'R05', 'R06']);
  expect(clayParameters.applicableJtsLayers.length).toBeGreaterThan(0);
  expect(clayParameters.applicableJtsLayers.every((layer) => Number(layer.category) <= 5)).toBe(true);
  expect(clayParameters.parameterGroups.some((group) => group.title.includes('不排水强度') && group.formulas.length > 0)).toBe(true);
  expect(workspace).toEqual(before);
});

test('PROCESS113 clipboard parser keeps readable negative values and only skips rows without depth or qc', () => {
  const parsed = parseQuickPlotClipboard('深度\tqc\tfs\tu2\n0.01\t1.2\t15\t2\n0.02\t-0.4\t-1\t\n坏行\t2\t3\t4\n0.03\t3\t\t-5');
  expect(parsed.skipped).toBe(1);
  expect(parsed.rows).toHaveLength(3);
  expect(parsed.rows[1]).toMatchObject({ depthM: 0.02, qcMpa: -0.4, fsKpa: -1, u2Kpa: null });
  expect(parsed.rows[2]).toMatchObject({ depthM: 0.03, qcMpa: 3, fsKpa: null, u2Kpa: -5 });
});

test('PROCESS132 AI quick import accepts Chinese synonyms, converts units, and excludes unrelated columns', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-1',
    sourceFingerprint: 'a'.repeat(64),
    fileName: '中文字段.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 200,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 4,
      columnCount: 6,
      rows: [
        ['说明', '设备导出'],
        ['贯入深度(cm)', '锥尖阻力(kPa)', '侧摩阻力(kPa)', '孔隙水压力(MPa)', '倾角', '温度'],
        ['1', '2000', '12', '', '0.1', '22'],
        ['2', '3500', '14', '0.004', '0.2', '23'],
      ],
      displayRowNumbers: [1, 2, 3, 4],
      delimiter: ',',
    }],
  };
  const call = {
    id: 'quick-proposal',
    name: 'propose_quick_plot_import',
    arguments: JSON.stringify({
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: 2,
      summary: '已识别四个出图字段，排除倾角和温度。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'cm', reason: '贯入深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'kPa', reason: '锥尖阻力。' },
        { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻力。' },
        { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'MPa', reason: '孔隙水压力。' },
      ],
      ignoredColumns: [
        { sourceColumnIndex: 4, headerLabel: '倾角', reason: '不用于快速出图。' },
        { sourceColumnIndex: 5, headerLabel: '温度', reason: '不用于快速出图。' },
      ],
    }),
  };
  const validation = quickPlotProposalFromTool(call, source);
  expect(validation.ok).toBe(true);
  if (!validation.ok) return;
  const result = buildQuickPlotRowsFromProposal(validation.proposal, source);
  expect('problem' in result).toBe(false);
  if ('problem' in result) return;
  expect(result.rows).toEqual([
    { rowId: 'quick-ai-row-000003', depthM: 0.01, qcMpa: 2, fsKpa: 12, u2Kpa: null },
    { rowId: 'quick-ai-row-000004', depthM: 0.02, qcMpa: 3.5, fsKpa: 14, u2Kpa: 4 },
  ]);
  expect(result.ignoredColumns.map((column) => column.headerLabel)).toEqual(['倾角', '温度']);
});

test('PROCESS132 AI quick import rejects duplicate targets and never invents optional values', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-2',
    sourceFingerprint: 'b'.repeat(64),
    fileName: 'ambiguous.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 100,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 3,
      columnCount: 3,
      rows: [['深度', '锥阻', '修正锥阻'], ['0', '1', '2'], ['1', '3', '4']],
      displayRowNumbers: [1, 2, 3],
      delimiter: ',',
    }],
  };
  const validation = quickPlotProposalFromTool({
    id: 'duplicate-qc',
    name: 'propose_quick_plot_import',
    arguments: JSON.stringify({
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: 1,
      summary: '存在两个 qc 候选。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '锥阻。' },
        { sourceColumnIndex: 2, targetField: 'qc', sourceUnit: 'MPa', reason: '修正锥阻。' },
      ],
      ignoredColumns: [],
    }),
  }, source);
  expect(validation).toMatchObject({ ok: false, problem: expect.stringContaining('唯一识别') });
});

test('PROCESS132 AI quick import rejects a semantically wrong measurement column', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-semantic-conflict',
    sourceFingerprint: 'c'.repeat(64),
    fileName: 'wrong-field.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 80,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 3,
      columnCount: 2,
      rows: [['深度(m)', '温度(kPa)'], ['0', '20'], ['1', '21']],
      displayRowNumbers: [1, 2, 3],
      delimiter: ',',
    }],
  };
  const validation = quickPlotProposalFromTool({
    id: 'wrong-qc-field',
    name: 'propose_quick_plot_import',
    arguments: JSON.stringify({
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: 1,
      summary: '错误地把温度当成 qc。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'kPa', reason: 'AI 猜测。' },
      ],
      ignoredColumns: [],
    }),
  }, source);
  expect(validation).toMatchObject({ ok: false, problem: expect.stringContaining('明确不是') });
});

test('PROCESS132 AI quick import rejects a source unit that conflicts with the header', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-unit-conflict',
    sourceFingerprint: 'd'.repeat(64),
    fileName: 'wrong-unit.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 80,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 3,
      columnCount: 2,
      rows: [['深度(m)', 'qc(MPa)'], ['0', '2'], ['1', '3']],
      displayRowNumbers: [1, 2, 3],
      delimiter: ',',
    }],
  };
  const validation = quickPlotProposalFromTool({
    id: 'wrong-qc-unit',
    name: 'propose_quick_plot_import',
    arguments: JSON.stringify({
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: 1,
      summary: '错误单位建议。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'kPa', reason: '错误单位。' },
      ],
      ignoredColumns: [],
    }),
  }, source);
  expect(validation).toMatchObject({ ok: false, problem: expect.stringContaining('与 AI 判断的 kPa 不一致') });
});

test('PROCESS132 one fixed choice cannot authorize a different ambiguous field or unit', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-scoped-confirmation',
    sourceFingerprint: 'e'.repeat(64),
    fileName: 'scoped-confirmation.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 100,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 3,
      columnCount: 3,
      rows: [['深度(m)', '温度', '侧摩阻力(kPa)'], ['0', '20', '5'], ['1', '21', '6']],
      displayRowNumbers: [1, 2, 3],
      delimiter: ',',
    }],
  };
  const validation = quickPlotProposalFromTool({
    id: 'scoped-confirmation',
    name: 'propose_quick_plot_import',
    arguments: JSON.stringify({
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: 1,
      summary: '确认了 fs，但 qc 仍然不明确。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'kPa', reason: '错误猜测。' },
        { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '用户确认。' },
      ],
      ignoredColumns: [],
    }),
  }, source, [{
    sheetName: 'CSV',
    headerRow: 1,
    sourceColumnIndex: 2,
    targetField: 'fs',
    sourceUnit: 'kPa',
  }]);
  expect(validation).toMatchObject({ ok: false, problem: expect.stringContaining('温度') });
});

test('PROCESS134 versioned AI decision keeps the first numeric row in a headerless file', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-headerless',
    sourceFingerprint: 'f'.repeat(64),
    fileName: '无表头.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 120,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 4,
      columnCount: 4,
      rows: [
        ['0.01', '1.2', '12', '3'],
        ['0.02', '1.4', '13', '4'],
        ['0.03', '1.6', '', '5'],
        ['0.04', '1.8', '15', ''],
      ],
      displayRowNumbers: [1, 2, 3, 4],
      delimiter: ',',
    }],
  };
  const expected = { requestId: 'request-headerless', contextHash: 'context-headerless' };
  const validation = quickPlotDecisionFromTool({
    id: 'decision-headerless',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify({
      protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
      requestId: expected.requestId,
      operationId: source.operationId,
      sourceFingerprint: source.sourceFingerprint,
      contextHash: expected.contextHash,
      kind: 'proposal',
      proposal: {
        proposalId: 'proposal-headerless',
        sheetName: 'CSV',
        headerMode: 'absent',
        headerRow: null,
        dataStartRow: 1,
        dataEndRow: 4,
        summary: '四列依次为深度、qc、fs、u2。',
        columns: [
          { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '首列随行递增。' },
          { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '第二列为锥尖阻力。' },
          { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '第三列为侧摩阻力。' },
          { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa', reason: '第四列为孔压。' },
        ],
        ignoredColumns: [],
        warnings: [],
      },
    }),
  }, source, expected);
  expect(validation.ok).toBe(true);
  if (!validation.ok || validation.decision.kind !== 'proposal') return;
  const result = buildQuickPlotRowsFromProposal(validation.decision.proposal, source);
  expect('problem' in result).toBe(false);
  if ('problem' in result) return;
  expect(result.rows).toHaveLength(4);
  expect(result.rows[0]).toMatchObject({ rowId: 'quick-ai-row-000001', depthM: 0.01, qcMpa: 1.2 });
  expect(result.ledger).toMatchObject({
    sourceRows: 4,
    acceptedRows: 4,
    optionalMissing: { fs: 1, u2: 1 },
  });
});

test('PROCESS134 unknown labels may be model-inferred, while stale identity and explicit qt conflict are rejected', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-unknown-labels',
    sourceFingerprint: '1'.repeat(64),
    fileName: '仪器编码.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 100,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 3,
      columnCount: 2,
      rows: [['CH-A', 'CH-B'], ['0.1', '2'], ['0.2', '3']],
      displayRowNumbers: [1, 2, 3],
      delimiter: ',',
    }],
  };
  const expected = { requestId: 'request-unknown', contextHash: 'context-unknown' };
  const decisionArguments = {
    protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
    requestId: expected.requestId,
    operationId: source.operationId,
    sourceFingerprint: source.sourceFingerprint,
    contextHash: expected.contextHash,
    kind: 'proposal',
    proposal: {
      proposalId: 'proposal-unknown',
      sheetName: 'CSV',
      headerMode: 'present',
      headerRow: 1,
      dataStartRow: 2,
      dataEndRow: 3,
      summary: '根据数值尺度判断两列。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '单调递增。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '数值尺度符合 qc。' },
      ],
      ignoredColumns: [],
      warnings: ['表头为仪器编码，需用户确认。'],
    },
  };
  expect(quickPlotDecisionFromTool({
    id: 'decision-unknown',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(decisionArguments),
  }, source, expected)).toMatchObject({ ok: true, decision: { kind: 'proposal' } });
  expect(quickPlotDecisionFromTool({
    id: 'decision-stale',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify({ ...decisionArguments, requestId: 'old-request' }),
  }, source, expected)).toMatchObject({ ok: false, problem: expect.stringContaining('旧文件或旧请求') });

  const explicitSource: ImportAssistantSource = {
    ...source,
    operationId: 'quick-ai-explicit-conflict',
    sourceFingerprint: '2'.repeat(64),
    sheets: [{ ...source.sheets[0], rows: [['Depth(m)', 'qt(kPa)'], ['0.1', '2000'], ['0.2', '2500']] }],
  };
  const explicitExpected = { requestId: 'request-conflict', contextHash: 'context-conflict' };
  const explicitDecision = {
    ...decisionArguments,
    requestId: explicitExpected.requestId,
    operationId: explicitSource.operationId,
    sourceFingerprint: explicitSource.sourceFingerprint,
    contextHash: explicitExpected.contextHash,
    proposal: {
      ...decisionArguments.proposal,
      proposalId: 'proposal-conflict',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
        { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'kPa', reason: '错误地把 qt 当作 qc。' },
      ],
      warnings: [],
    },
  };
  expect(quickPlotDecisionFromTool({
    id: 'decision-conflict',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(explicitDecision),
  }, explicitSource, explicitExpected)).toMatchObject({ ok: false, problem: expect.stringContaining('明确冲突') });

  const userCorrectedDecision = structuredClone(explicitDecision);
  userCorrectedDecision.proposal.columns[1].evidenceKind = 'user-corrected';
  expect(quickPlotDecisionFromTool({
    id: 'decision-user-corrected-without-confirmation',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(userCorrectedDecision),
  }, explicitSource, explicitExpected)).toMatchObject({ ok: false, problem: expect.stringContaining('明确冲突') });

  const exactConfirmation = [{
    sheetName: 'CSV',
    headerRow: 1,
    sourceColumnIndex: 1,
    targetField: 'qc' as const,
    sourceUnit: 'kPa' as const,
  }];
  const confirmed = quickPlotDecisionFromTool({
    id: 'decision-user-corrected-confirmed',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(userCorrectedDecision),
  }, explicitSource, explicitExpected, exactConfirmation);
  expect(confirmed).toMatchObject({
    ok: true,
    decision: {
      kind: 'proposal',
      proposal: { ambiguityConfirmations: exactConfirmation },
    },
  });
  if (!confirmed.ok || confirmed.decision.kind !== 'proposal') return;
  const built = buildQuickPlotRowsFromProposal(confirmed.decision.proposal, explicitSource);
  expect('problem' in built).toBe(false);
  if ('problem' in built) return;
  expect(built.rows.map((row) => row.qcMpa)).toEqual([2, 2.5]);
});

test('PROCESS134 a structured question renders local choices and cannot point outside the source', () => {
  const source: ImportAssistantSource = {
    operationId: 'quick-ai-question',
    sourceFingerprint: '3'.repeat(64),
    fileName: '多表.xlsx',
    fileType: 'Excel',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 500,
    sheets: [{
      sheetName: 'Sheet1',
      rowCount: 3,
      columnCount: 3,
      rows: [['A', 'B', 'C'], ['0', '1', '2'], ['1', '3', '4']],
      displayRowNumbers: [1, 2, 3],
    }],
  };
  const expected = { requestId: 'request-question', contextHash: 'context-question' };
  const base = {
    protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
    requestId: expected.requestId,
    operationId: source.operationId,
    sourceFingerprint: source.sourceFingerprint,
    contextHash: expected.contextHash,
    kind: 'question',
    question: {
      questionId: 'q-qc',
      prompt: '哪一列是 qc？',
      reason: 'B、C 两列都可能是锥尖阻力。',
      options: [
        { optionId: 'b', recommended: true, decisionPatch: { decisionType: 'map-column', sheetName: 'Sheet1', sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa' } },
        { optionId: 'c', recommended: false, decisionPatch: { decisionType: 'map-column', sheetName: 'Sheet1', sourceColumnIndex: 2, targetField: 'qc', sourceUnit: 'MPa' } },
      ],
    },
  };
  const validation = quickPlotDecisionFromTool({
    id: 'decision-question',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(base),
  }, source, expected);
  expect(validation.ok).toBe(true);
  if (!validation.ok || validation.decision.kind !== 'question') return;
  expect(quickPlotQuestionOptionLabel(validation.decision.question.options[0].decisionPatch, source))
    .toContain('B 列');
  const outside = structuredClone(base);
  outside.question.options[1].decisionPatch.sourceColumnIndex = 9;
  expect(quickPlotDecisionFromTool({
    id: 'decision-question-outside',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify(outside),
  }, source, expected)).toMatchObject({ ok: false, problem: expect.stringContaining('不存在') });
});

test('PROCESS136 current-page explanation preserves the model answer instead of replacing it with a fixed summary', () => {
  const report = {
    revisionId: 'quick-revision',
    authorityHash: 'quick-authority',
    pageNumber: 6,
    pageCount: 15,
    pageTitle: 'CPT 解译参考地层',
    methodIds: ['JTS-T242-2020'],
    chartTypes: ['qc-depth', 'rf-depth', 'u2-depth', 'ic-depth', 'jts-layer-depth'],
    route: 'full_cptu' as const,
    measuredRows: 3,
    depthFromM: 0.01,
    depthToM: 20.01,
    sourceName: 'test.csv',
    notices: [],
    pages: [],
  };
  const modelAnswer = 'SBT 是土体行为类型分类；这和“当前页怎么看”是两个不同问题。';
  expect(buildQuickReportExplanation(report, '什么是 SBT？', modelAnswer)).toBe(modelAnswer);
});

test('PROCESS145 report source label keeps the question page and lists extra pages read by tools', () => {
  const report = {
    revisionId: 'quick-revision',
    authorityHash: 'quick-authority',
    pageNumber: 6,
    pageCount: 15,
    pageTitle: 'CPT 解译参考地层',
    methodIds: ['JTS-T242-2020'],
    chartTypes: ['qc-depth', 'jts-layer-depth'],
    route: 'full_cptu' as const,
    measuredRows: 3,
    depthFromM: 0.01,
    depthToM: 20.01,
    sourceName: 'test.csv',
    notices: [],
    pages: [],
  };
  expect(quickReportSourceDetail(report, [])).toBe(`来源：提问时第 ${report.pageNumber} 页 · ${report.pageTitle}`);
  expect(quickReportSourceDetail(report, [{
    toolName: 'read_quick_plot_method',
    payload: {
      pages: [
        { pageNumber: report.pageNumber, title: report.pageTitle },
        { pageNumber: 4, title: 'Schneider 2008 分类证据' },
        { pageNumber: 9, title: '多方法分类与刚度证据' },
      ],
    },
  }])).toBe(`来源：提问时第 ${report.pageNumber} 页 · ${report.pageTitle}；另读取第 4、9 页`);
});

test('PROCESS136 long report conversations keep complete recent exchanges without orphaning tool results', () => {
  const turns: AssistantWireTurn[] = [];
  for (let index = 1; index <= 8; index += 1) {
    turns.push(
      { role: 'user', content: `问题 ${index}` },
      {
        role: 'assistant',
        content: null,
        toolCalls: [{ id: `read-${index}`, name: 'read_quick_plot_page', arguments: '{}' }],
      },
      { role: 'tool', toolCallId: `read-${index}`, content: `{"page":${index}}` },
      { role: 'assistant', content: `回答 ${index}` },
    );
  }

  const trimmed = trimQuickReportTurns(turns, 12);
  expect(trimmed).toHaveLength(12);
  expect(trimmed[0]).toEqual({ role: 'user', content: '问题 4' });
  expect(trimmed.at(-1)).toEqual({ role: 'assistant', content: '回答 8' });
  for (const [index, turn] of trimmed.entries()) {
    if (turn.role !== 'tool') continue;
    const preceding = trimmed[index - 1];
    expect(preceding?.role).toBe('assistant');
    expect(preceding?.role === 'assistant' ? preceding.toolCalls?.some((call) => call.id === turn.toolCallId) : false).toBe(true);
  }
});

test('PROCESS136 one question with five four-tool rounds stays bounded and retry-safe', () => {
  const turns: AssistantWireTurn[] = [{ role: 'user', content: '请综合读取相关页面。' }];
  for (let round = 1; round <= 5; round += 1) {
    const toolCalls = Array.from({ length: 4 }, (_, index) => ({
      id: `round-${round}-tool-${index + 1}`,
      name: 'read_quick_plot_chart',
      arguments: '{}',
    }));
    turns.push({ role: 'assistant', content: null, toolCalls });
    turns.push(...toolCalls.map((call): AssistantWireTurn => ({
      role: 'tool',
      toolCallId: call.id,
      content: `{"ok":true,"round":${round}}`,
    })));
  }

  const trimmed = trimQuickReportTurns(turns, 24);
  expect(trimmed.length).toBeLessThanOrEqual(24);
  expect(trimmed[0]).toEqual({ role: 'user', content: '请综合读取相关页面。' });
  expect(trimmed.some((turn) => turn.role === 'tool' && turn.toolCallId.startsWith('round-1-'))).toBe(false);
  expect(trimmed.some((turn) => turn.role === 'tool' && turn.toolCallId.startsWith('round-5-'))).toBe(true);
  for (const [index, turn] of trimmed.entries()) {
    if (turn.role !== 'tool') continue;
    const blockStart = trimmed.slice(0, index).findLastIndex((candidate) => candidate.role === 'assistant');
    const owner = trimmed[blockStart];
    expect(owner?.role).toBe('assistant');
    expect(owner?.role === 'assistant' ? owner.toolCalls?.some((call) => call.id === turn.toolCallId) : false).toBe(true);
  }
});

test('PROCESS145 completed exchanges keep their answers but drop old raw tool payloads before the next question', () => {
  const turns: AssistantWireTurn[] = [
    { role: 'user', content: '第一个问题' },
    { role: 'assistant', content: null, toolCalls: [{ id: 'old-read', name: 'read_quick_plot_page', arguments: '{}' }] },
    { role: 'tool', toolCallId: 'old-read', content: JSON.stringify({ rows: 'x'.repeat(50_000) }) },
    { role: 'assistant', content: '第一个回答中的关键结论' },
    { role: 'user', content: '承接上问的新问题' },
  ];
  const trimmed = trimQuickReportTurns(turns, 24);
  expect(trimmed).toEqual([
    { role: 'user', content: '第一个问题' },
    { role: 'assistant', content: '第一个回答中的关键结论' },
    { role: 'user', content: '承接上问的新问题' },
  ]);
});

test('PROCESS145 completed long answers are compacted while retaining their start, end and follow-up', () => {
  const longAnswer = `关键结论：第 5 页有 6 层。${'中间证据'.repeat(1_000)}来源：第 5 页。`;
  const trimmed = trimQuickReportTurns([
    { role: 'user', content: '先解释第 5 页' },
    { role: 'assistant', content: longAnswer },
    { role: 'user', content: '承接上问比较第 6 页' },
  ], 24);
  const compacted = trimmed[1];
  expect(compacted.role).toBe('assistant');
  expect(compacted.role === 'assistant' ? compacted.content?.length : 0).toBeLessThanOrEqual(QUICK_REPORT_HISTORY_ANSWER_LIMIT + 2);
  expect(compacted.role === 'assistant' ? compacted.content : '').toContain('关键结论');
  expect(compacted.role === 'assistant' ? compacted.content : '').toContain('来源：第 5 页');
  expect(trimmed.at(-1)).toEqual({ role: 'user', content: '承接上问比较第 6 页' });
});

test('PROCESS145 default sliding context keeps only the five prior exchanges plus current question', () => {
  const turns: AssistantWireTurn[] = [];
  for (let index = 1; index <= 10; index += 1) {
    turns.push({ role: 'user', content: `问题 ${index}` }, { role: 'assistant', content: `回答 ${index}` });
  }
  turns.push({ role: 'user', content: '当前问题' });
  const trimmed = trimQuickReportTurns(turns);
  expect(trimmed).toHaveLength(11);
  expect(trimmed[0]).toEqual({ role: 'user', content: '问题 6' });
  expect(trimmed.at(-1)).toEqual({ role: 'user', content: '当前问题' });
});

test('PROCESS135 report-reader returns a bounded, unit-explicit depth window without modifying source rows', () => {
  const workspace = createQuickPlotWorkspace('只读图册');
  workspace.rows = Array.from({ length: 201 }, (_, index) => ({
    rowId: `r-${index}`,
    depthM: index / 10,
    qcMpa: 1 + index / 100,
    fsKpa: index % 5 === 0 ? null : 10 + index,
    u2Kpa: index % 7 === 0 ? null : index,
  }));
  workspace.activeRevisionId = 'revision-135';
  const context: AssistantContextSnapshot = {
    assistantProfile: 'report-reader',
    scope: {
      projectId: 'p-135',
      projectName: '只读图册',
      pointId: 'quick-plot',
      pointName: 'CPT-01',
      route: 'quick-report',
      routeLabel: '快捷出图图册',
      workspaceRevision: 1,
      checkRunId: null,
      classificationRunId: null,
      stratificationRevisionId: null,
      hasWorkingDraft: false,
      parameterRunId: null,
      authorityHash: 'authority-135',
    },
    status: { check: '不适用', classification: '已生成', stratification: '已生成', parameters: '已生成', output: '已生成' },
    counts: { measuredRows: 201, layers: 0, boundaries: 0, pendingLayers: 0, parameterProblems: 0, outputs: 1 },
    selectedLayer: null,
    selectedBoundary: null,
    layers: [],
    boundaries: [],
    notices: [],
    quickPlotReport: {
      revisionId: 'revision-135',
      authorityHash: 'authority-135',
      pageNumber: 1,
      pageCount: 1,
      pageTitle: '实测 CPT/CPTU 曲线',
      methodIds: ['R03'],
      chartTypes: ['qc-depth', 'fs-depth', 'u2-depth'],
      route: 'full_cptu',
      measuredRows: 201,
      depthFromM: 0,
      depthToM: 20,
      sourceName: 'readonly.csv',
      notices: [],
      pages: [{
        pageNumber: 1,
        title: '实测 CPT/CPTU 曲线',
        methodIds: ['R03'],
        chartTypes: ['qc-depth', 'fs-depth', 'u2-depth'],
        referencePage: 1,
        orientation: 'portrait',
      }],
    },
  };
  const before = structuredClone(workspace.rows);
  const read = executeQuickReportReadTool({
    id: 'depth-read',
    name: 'read_quick_plot_depth_window',
    arguments: JSON.stringify({ depthFromM: 0, depthToM: 20, fields: ['qc', 'fs', 'u2'] }),
  }, context, workspace);
  expect(read.establishesRevisionRead).toBe(true);
  expect(read.establishesCurrentPageRead).toBe(false);
  expect(read.payload).toMatchObject({
    ok: true,
    readOnly: true,
    revisionId: 'revision-135',
    depthUnit: 'm',
    units: { qc: 'kPa', fs: 'kPa', u2: 'kPa' },
    totalMatchingRows: 201,
    returnedRowCount: 120,
    clipped: true,
    interpolated: false,
  });
  expect(workspace.rows).toEqual(before);
  const depthAnswer = buildQuickReportExplanation(
    context.quickPlotReport,
    '0–20 m 的 qc、fs 和 u2 数据是什么情况？',
    '我读取了 0–20 m 的源测点，以下只解释读取结果。',
    [{ toolName: 'read_quick_plot_depth_window', payload: read.payload }],
  );
  expect(depthAnswer).toBe('我读取了 0–20 m 的源测点，以下只解释读取结果。');
  const depthEvidence = [{ toolName: 'read_quick_plot_depth_window', payload: read.payload }];
  expect(hasQuickReportEvidenceForQuestion(
    context.quickPlotReport,
    '0–20 m 的 qc、fs 和 u2 数据是什么情况？',
    depthEvidence,
  )).toBe(true);
  expect(hasQuickReportEvidenceForQuestion(
    context.quickPlotReport,
    '5–10 m 的 fs 数据是什么情况？',
    depthEvidence,
  )).toBe(false);
  const qcOnlyDepthEvidence = [{
    toolName: 'read_quick_plot_depth_window',
    payload: { ...read.payload, requestedFields: ['qc'] },
  }];
  expect(hasQuickReportEvidenceForQuestion(
    context.quickPlotReport,
    '0–20 m 的摩阻力怎么样？',
    qcOnlyDepthEvidence,
  )).toBe(false);
  expect(hasQuickReportEvidenceForQuestion(
    context.quickPlotReport,
    '0–20 m 的摩阻比怎么样？',
    depthEvidence,
  )).toBe(false);
  expect(hasQuickReportEvidenceForQuestion(
    context.quickPlotReport,
    '10 m 的 qc 是多少？',
    depthEvidence,
  )).toBe(false);
  const currentPageAnswer = buildQuickReportExplanation(
    context.quickPlotReport,
    '当前页有土类分类吗？',
    '当前页没有土类分类带。',
    [{
      toolName: 'read_quick_plot_page',
      payload: {
        ok: true,
        authorityHash: 'authority-135',
        revisionId: 'revision-135',
        pageNumber: 1,
        chartTypes: ['qc-depth', 'fs-depth', 'u2-depth'],
        methodIds: ['R03'],
      },
    }],
  );
  expect(currentPageAnswer).toBe('当前页没有土类分类带。');

  const overwide = executeQuickReportReadTool({
    id: 'overwide-read',
    name: 'read_quick_plot_depth_window',
    arguments: JSON.stringify({ depthFromM: 0, depthToM: 21, fields: ['qc'] }),
  }, context, workspace);
  expect(overwide.payload).toMatchObject({ ok: false });
});

test('PROCESS135 report evidence stays bound to a requested page and recognizes every classification page family', () => {
  const baseReport = {
    revisionId: 'revision-page',
    authorityHash: 'authority-page',
    pageNumber: 1,
    pageCount: 15,
    pageTitle: '实测 CPT/CPTU 曲线',
    methodIds: ['R03'],
    chartTypes: ['qc-depth', 'fs-depth', 'u2-depth'],
    route: 'full_cptu' as const,
    measuredRows: 3,
    depthFromM: 0.01,
    depthToM: 20.01,
    sourceName: 'test.csv',
    notices: [],
    pages: [],
  };
  const classificationPages = [
    { pageNumber: 4, title: 'Schneider 2008 分类证据', chartTypes: ['schneider-semiloq', 'schneider-2008-depth'] },
    { pageNumber: 5, title: 'Fuzzy 最高概率分层与深度窗口组成', chartTypes: ['fuzzy-majority-layers', 'fuzzy-window-composition'] },
    { pageNumber: 8, title: 'Modified Robertson 2016 深度分类', chartTypes: ['robertson-2016-depth'] },
    { pageNumber: 9, title: '多方法分类与刚度证据', chartTypes: ['robertson-2016-layer-depth', 'schneider-2008-layer-depth'] },
  ];
  for (const page of classificationPages) {
    const evidence = [{
      toolName: 'read_quick_plot_page',
      payload: {
        ok: true,
        authorityHash: 'authority-page',
        revisionId: 'revision-page',
        pageNumber: page.pageNumber,
        title: page.title,
        chartTypes: page.chartTypes,
        methodIds: ['R09'],
      },
    }];
    const question = `第 ${page.pageNumber} 页有分类结果吗？`;
    expect(hasQuickReportEvidenceForQuestion(baseReport, question, evidence)).toBe(true);
    expect(buildQuickReportExplanation(baseReport, question, `${page.title}有分类结果。`, evidence))
      .toBe(`${page.title}有分类结果。`);
  }
  const onlyPageFour = [{
    toolName: 'read_quick_plot_page',
    payload: {
      ok: true,
      authorityHash: 'authority-page',
      revisionId: 'revision-page',
      pageNumber: 4,
      title: 'Schneider 2008 分类证据',
      chartTypes: ['schneider-2008-depth'],
      methodIds: ['R09'],
    },
  }];
  expect(hasQuickReportEvidenceForQuestion(baseReport, '第 6 页是什么？', onlyPageFour)).toBe(false);

  const methodEvidence = [{
    toolName: 'read_quick_plot_method',
    payload: {
      ok: true,
      authorityHash: 'authority-page',
      revisionId: 'revision-page',
      methodId: 'R09',
      pages: [
        { pageNumber: 4, title: 'Schneider 2008 分类证据', chartTypes: ['schneider-2008-depth'] },
        { pageNumber: 9, title: '多方法分类与刚度证据', chartTypes: ['schneider-2008-layer-depth'] },
      ],
    },
  }];
  expect(hasQuickReportEvidenceForQuestion(baseReport, 'R09 出现在哪些页？', methodEvidence)).toBe(true);
  expect(hasQuickReportEvidenceForQuestion(baseReport, 'R06 出现在哪些页？', methodEvidence)).toBe(false);
  expect(hasQuickReportEvidenceForQuestion(baseReport, 'Schneider 出现在哪些页？', methodEvidence)).toBe(true);
  expect(hasQuickReportEvidenceForQuestion(baseReport, 'JTS 出现在哪些页？', methodEvidence)).toBe(false);
  expect(buildQuickReportExplanation(baseReport, 'R09 出现在哪些页？', 'R09 出现在第 4 页和第 9 页。', methodEvidence))
    .toBe('R09 出现在第 4 页和第 9 页。');

  const chartEvidence = [{
    toolName: 'read_quick_plot_chart',
    payload: {
      ok: true,
      authorityHash: 'authority-page',
      revisionId: 'revision-page',
      pageNumber: 1,
      pageTitle: '实测 CPT/CPTU 曲线',
      chartType: 'qc-depth',
      chartLabel: '锥尖阻力',
      methodIds: ['R03'],
      depthFromM: 0.01,
      depthToM: 20.01,
    },
  }];
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页 qc 曲线是什么？', chartEvidence)).toBe(true);
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页 fs 曲线是什么？', chartEvidence)).toBe(false);
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页 u2 曲线是什么？', chartEvidence)).toBe(false);
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页曲线是什么？', chartEvidence)).toBe(false);
  expect(buildQuickReportExplanation(baseReport, '当前页 qc 曲线是什么？', 'qc 是锥尖阻力曲线。', chartEvidence))
    .toBe('qc 是锥尖阻力曲线。');
  const rfEvidence = [{
    toolName: 'read_quick_plot_chart',
    payload: {
      ...chartEvidence[0].payload,
      chartType: 'rf-depth',
      chartLabel: '摩阻比',
    },
  }];
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页 Rf 是什么？', rfEvidence)).toBe(true);
  expect(hasQuickReportEvidenceForQuestion(baseReport, '当前页 Fr 是什么？', rfEvidence)).toBe(false);

  const directoryEvidence = [{
    toolName: 'list_quick_plot_pages',
    payload: {
      ok: true,
      authorityHash: 'authority-page',
      revisionId: 'revision-page',
      pages: [
        { pageNumber: 1, title: '实测 CPT/CPTU 曲线' },
        { pageNumber: 2, title: 'SBT - Bq 分类图' },
      ],
    },
  }];
  expect(hasQuickReportEvidenceForQuestion(baseReport, '图册目录有哪些页？', directoryEvidence)).toBe(true);
  expect(buildQuickReportExplanation(baseReport, '图册目录有哪些页？', '当前图册共 2 页。', directoryEvidence))
    .toBe('当前图册共 2 页。');
});

test('PROCESS113 readiness checks only whether a chart can be drawn', () => {
  expect(quickPlotReadiness([])).toMatchObject({ ready: false, field: 'rows' });
  expect(quickPlotReadiness([{ rowId: 'r1', depthM: 0, qcMpa: -1, fsKpa: null, u2Kpa: null }, { rowId: 'r2', depthM: 1, qcMpa: 2, fsKpa: null, u2Kpa: null }])).toMatchObject({ ready: true });
});

test('PROCESS113 Excel normalization respects fixed display units without creating u2 zeroes', () => {
  const rows = quickRowsFromTable(['Depth(m)', 'qc(kPa)', 'fs(MPa)', 'u2(kPa)'], [['1', '2500', '0.012', ''], ['2', '3000', '0.014', '-3']]);
  expect(rows).toEqual([
    { rowId: 'quick-row-000001', depthM: 1, qcMpa: 2.5, fsKpa: 12, u2Kpa: null },
    { rowId: 'quick-row-000002', depthM: 2, qcMpa: 3, fsKpa: 14, u2Kpa: -3 },
  ]);
});

test('PROCESS113 immutable input hash changes with a value or site setting', () => {
  const workspace = createQuickPlotWorkspace('项目');
  workspace.rows = [{ rowId: 'r1', depthM: 0, qcMpa: 1, fsKpa: 10, u2Kpa: null }, { rowId: 'r2', depthM: 1, qcMpa: 2, fsKpa: 12, u2Kpa: null }];
  const first = quickPlotInputHash(workspace);
  expect(quickPlotInputHash({ ...workspace, settings: { ...workspace.settings, waterDepthM: 10 } })).not.toBe(first);
  expect(quickPlotInputHash({ ...workspace, rows: workspace.rows.map((row, index) => index ? { ...row, qcMpa: 3 } : row) })).not.toBe(first);
});

test('PROCESS113 relative density ratio is displayed as percent', () => {
  expect(quickRelativeDensityPercent(0.65)).toBe(65);
  expect(quickRelativeDensityPercent(null)).toBeNull();
});

test('PROCESS113 fewer than two u2 values stays approximate while partial CPTU preserves gaps', () => {
  const rows = [
    { rowId: 'r1', depthM: 0, qcMpa: 1, fsKpa: 10, u2Kpa: 5 },
    { rowId: 'r2', depthM: 1, qcMpa: 2, fsKpa: 12, u2Kpa: null },
  ];
  expect(quickPlotRoute(rows)).toBe('approximate_cpt');
  expect(quickPlotRoute([...rows, { rowId: 'r3', depthM: 2, qcMpa: 3, fsKpa: 14, u2Kpa: 8 }])).toBe('partial_cptu');
  expect(quickPlotRoute(rows.map((row, index) => ({ ...row, u2Kpa: index + 5 })))).toBe('full_cptu');
});

test('PROCESS114 robust display range keeps isolated Ir extremes at the chart edge', () => {
  const range = quickRobustDisplayRange([...Array.from({ length: 98 }, (_, index) => 10 + index / 10), -1000, 170_500]);
  expect(range.min).toBeGreaterThan(-1000);
  expect(range.max).toBeLessThan(170_500);
  expect(range.outsideCount).toBe(2);
});

test('PROCESS113 quick correlations remain empty outside their stated soil and Ic domains', () => {
  expect(quickPermeabilityFromIc(1)).toBeNull();
  expect(quickPermeabilityFromIc(2)).toBeCloseTo(10 ** (0.952 - 3.04 * 2));
  expect(quickPermeabilityFromIc(4.01)).toBeNull();
  expect(quickSandStateParameter('clay', 2, 100)).toBeNull();
  expect(quickSandStateParameter('sand', 2.6, 100)).toBeNull();
  expect(quickSandStateParameter('sand', 2, 100)).toBeCloseTo(0.56 - 0.33 * 2);
});

test('PROCESS113 saturated physical indices use the published 10 kN/m³ water unit weight', () => {
  const result = quickSaturatedPhysicalIndices(20);
  expect(result.voidRatio).toBeCloseTo(0.65);
  expect(result.waterContentPercent).toBeCloseTo(24.5283);
  expect(result.dryUnitWeight).toBeCloseTo(16.0606);
  expect(result.porosity).toBeCloseTo(0.393939);
});

test('PROCESS114 silt uses a distinct light blue while sand and clay retain engineering colors', () => {
  expect(QUICK_SOIL_COLORS).toEqual({ sand: '#f2d66b', silt: '#9fd8ea', clay: '#9a7258', unknown: '#d8dee3' });
});

test('PROCESS120 report drawing uses the accepted atlas frame, axis, and grid hierarchy', () => {
  expect(QUICK_REPORT_STYLE).toMatchObject({ ink: '#111719', axis: '#22282b', grid: '#bec7cc', gridLight: '#e1e5e7', frameWidth: 1.5, axisWidth: 1.2, gridWidth: 0.8 });
  expect(QUICK_REPORT_STYLE.frameWidth).toBeGreaterThan(QUICK_REPORT_STYLE.axisWidth);
  expect(QUICK_REPORT_STYLE.axisWidth).toBeGreaterThan(QUICK_REPORT_STYLE.gridWidth);
  expect(QUICK_REPORT_ZONE_COLORS).toEqual({ 1: '#C94332', 2: '#C8733F', 3: '#536789', 4: '#4D9B91', 5: '#83C8AA', 6: '#C2A35F', 7: '#EE9D36', 8: '#929292', 9: '#D8D8D8' });
  expect(QUICK_REPORT_AXIS_LABELS).toMatchObject({ qc: '锥尖阻力 qc (MPa)', fs: '侧壁摩阻力（套筒摩阻力） fs (kPa)', u2: '孔隙水压力 u2 (kPa)', depth: '泥面以下深度 (m)' });
});

test('PROCESS116 Robertson 1990 Qt-Fr classifier reaches all nine zones without reusing JTS Qtn', () => {
  const samples: Array<[number, number]> = [[1, 0.1], [1.423, 1.55], [4.993, 0.65], [8.646, 0.25], [10.52, 0.1], [28.044, 0.1], [151.449, 0.1], [920.028, 1.65], [84.094, 4.55]];
  expect(samples.map(([qt, fr]) => quickRobertsonSbtnZone(qt, fr))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(quickRobertsonSbtnZone(0.99, 1)).toBeNull();
  expect(quickRobertsonSbtnZone(100, 0)).toBeNull();
  expect(quickRobertsonSbtnZone(null, 1)).toBeNull();
});

test('PROCESS116 Robertson boundary equality stays on the lower-side zone and epsilon crosses once', () => {
  const icBoundary = (ic: number, fr: number) => 10 ** (3.47 - Math.sqrt(ic ** 2 - (1.22 + Math.log10(fr)) ** 2));
  const expectBoundary = (boundary: number, fr: number, at: number, above: number) => {
    expect(quickRobertsonSbtnZone(boundary, fr)).toBe(at);
    expect(quickRobertsonSbtnZone(boundary * (1 + 1e-8), fr)).toBe(above);
  };
  const fr = 2;
  expectBoundary(icBoundary(3.60, fr), fr, 2, 3);
  expectBoundary(icBoundary(2.95, fr), fr, 3, 4);
  expectBoundary(icBoundary(2.60, fr), fr, 4, 5);
  expectBoundary(icBoundary(2.05, fr), fr, 5, 6);
  expectBoundary(icBoundary(1.31, 0.5), 0.5, 6, 7);
  const g = 1 / (0.005 * (fr - 1) - 0.0003 * (fr - 1) ** 2 - 0.002);
  expectBoundary(g, fr, 6, 8);
  const a = 12 * Math.exp(-1.4);
  expect(quickRobertsonSbtnZone(a, 1)).toBe(1);
  expect(quickRobertsonSbtnZone(a * (1 + 1e-8), 1)).not.toBe(1);
  expect(quickRobertsonSbtnZone(500, 4.5)).toBe(8);
  expect(quickRobertsonSbtnZone(500, 4.5 + 1e-8)).toBe(9);
});

test('PROCESS116 Zhang-Tumay fuzzy membership preserves raw values and only normalizes the plotted shares', () => {
  const sand = quickFuzzyMembership(20, 0.5)!;
  const mixed = quickFuzzyMembership(5, 2)!;
  const clay = quickFuzzyMembership(1, 5)!;
  expect(sand.u).toBeCloseTo(3.1830, 3);
  expect(sand.dominant).toBe('sand');
  expect(mixed.dominant).toBe('mixed');
  expect(clay.dominant).toBe('clay');
  [sand, mixed, clay].forEach((result) => expect(result.percent.sand + result.percent.mixed + result.percent.clay).toBeCloseTo(100));
  expect(quickFuzzyMembership(0, 1)).toBeNull();
  expect(quickFuzzyMembership(1, null)).toBeNull();
});

test('PROCESS116 Zhang-Tumay raw memberships are exact and continuous at both capped thresholds', () => {
  const clayThreshold = quickFuzzyMembershipFromU(-0.1775)!;
  const clayLeft = quickFuzzyMembershipFromU(-0.1775 - 1e-8)!;
  const clayRight = quickFuzzyMembershipFromU(-0.1775 + 1e-8)!;
  expect(clayThreshold.raw.clay).toBe(1);
  expect(clayLeft.raw.clay).toBe(1);
  expect(clayRight.raw.clay).toBeCloseTo(1, 12);

  const sandThreshold = quickFuzzyMembershipFromU(2.6575)!;
  const sandLeft = quickFuzzyMembershipFromU(2.6575 - 1e-8)!;
  const sandRight = quickFuzzyMembershipFromU(2.6575 + 1e-8)!;
  expect(sandThreshold.raw.sand).toBe(1);
  expect(sandLeft.raw.sand).toBeCloseTo(1, 12);
  expect(sandRight.raw.sand).toBe(1);

  expect(clayThreshold.raw.mixed).toBeCloseTo(Math.exp(-0.5 * ((-0.1775 - 1.35) / 0.724307) ** 2), 12);
  expect(sandThreshold.raw.mixed).toBeCloseTo(Math.exp(-0.5 * ((2.6575 - 1.35) / 0.724307) ** 2), 12);
  expect(quickFuzzyMembershipFromU(Number.NaN)).toBeNull();
});

test('PROCESS114 Excel binds the current atlas revision and contains three traceable sheets', async () => {
  const workspace = createQuickPlotWorkspace('快捷项目');
  workspace.settings = { ...workspace.settings, pointName: 'CPT-114' };
  workspace.rows = [
    { rowId: 'r1', depthM: 0.01, qcMpa: 1.2, fsKpa: 12, u2Kpa: null },
    { rowId: 'r2', depthM: 0.02, qcMpa: 1.4, fsKpa: 14, u2Kpa: null },
  ];
  const revision = createQuickPlotRevision(workspace, '2026-07-21T00:00:00.000Z');
  const archive = unzipSync(await createQuickPlotXlsx(workspace, revision));
  const workbook = strFromU8(archive['xl/workbook.xml']);
  expect(workbook).toContain('name="原始数据"');
  expect(workbook).toContain('name="快捷解译结果"');
  expect(workbook).toContain('name="设置与方法"');
  expect(strFromU8(archive['xl/worksheets/sheet1.xml'])).toContain('r1');
  expect(strFromU8(archive['xl/worksheets/sheet3.xml'])).toContain('CPT-114');
  expect(strFromU8(archive['xl/worksheets/sheet3.xml'])).toContain(revision.inputHash);
  const stale = { ...workspace, settings: { ...workspace.settings, pointName: '已修改' } };
  await expect(createQuickPlotXlsx(stale, revision)).rejects.toThrow('快捷图册已过期');
});

test('PROCESS117 Robertson variable-stress Qtn is independent, iterative, and rejects invalid stress domains', () => {
  const normalized = deriveRobertsonQtn(1000, 100, 1)!;
  expect(normalized.qtn).toBeCloseTo(10, 10);
  expect(normalized.ic).toBeCloseTo(Math.sqrt((3.47 - 1) ** 2 + 1.22 ** 2), 10);
  expect(normalized.iterations).toBeGreaterThan(0);
  expect(deriveRobertsonQtn(0, 100, 1)).toBeNull();
  expect(deriveRobertsonQtn(1000, 0, 1)).toBeNull();
  expect(deriveRobertsonQtn(1000, 100, 0)).toBeNull();
});

test('PROCESS117 Modified Robertson 2016 reaches all seven behavior classes', () => {
  const samples: Array<[number, number]> = [
    [5, 1], [5, 3], [100, 5], [10, 1], [50, 3], [20, 1], [100, 1],
  ];
  expect(samples.map(([qtn, fr]) => classifyRobertson2016(qtn, fr)?.code))
    .toEqual(['CCS', 'CC', 'CD', 'TC', 'TD', 'SC', 'SD']);
  expect(classifyRobertson2016(Number.NaN, 1)).toBeNull();
  expect(classifyRobertson2016(10, 0)).toBeNull();
});

test('PROCESS117 Modified Robertson 2016 boundary equality is conservative and crosses once', () => {
  const qtn = 20;
  const frAtIb32 = (100 * (qtn + 10) / 32 - 70) / qtn;
  const frAtIb22 = (100 * (qtn + 10) / 22 - 70) / qtn;
  expect(classifyRobertson2016(qtn, frAtIb32)?.family).toBe('transitional');
  expect(classifyRobertson2016(qtn, frAtIb32 - 1e-8)?.family).toBe('sand-like');
  expect(classifyRobertson2016(qtn, frAtIb22)?.family).toBe('clay-like');
  expect(classifyRobertson2016(qtn, frAtIb22 - 1e-8)?.family).toBe('transitional');
  const fr = 3;
  const qAtCd70 = 11 + 70 / Math.pow(1 + 0.06 * fr, 17);
  expect(classifyRobertson2016(qAtCd70, fr)?.response).toBe('contractive');
  expect(classifyRobertson2016(qAtCd70 + 1e-8, fr)?.response).toBe('dilative');
  expect(classifyRobertson2016(5, 2)?.code).toBe('CC');
  expect(classifyRobertson2016(5, 2 - 1e-8)?.code).toBe('CCS');
});

test('PROCESS117 Schneider 2008 Table 6 equations classify five zones without u2 substitution', () => {
  expect(classifySchneider2008(100, 0)?.code).toBe('2');
  expect(classifySchneider2008(10, 0)?.code).toBe('3');
  expect(classifySchneider2008(10, 1.5)?.code).toBe('1a');
  expect(classifySchneider2008(10, 4)?.code).toBe('1b');
  expect(classifySchneider2008(10, 10)?.code).toBe('1c');
  expect(classifySchneider2008(10, Number.NaN)).toBeNull();
  expect(classifySchneider2008(0.9, 1)).toBeNull();
});

test('PROCESS117 Schneider drained-band equality belongs to sand and epsilon exits once', () => {
  const boundary = schneider2008Boundaries(100)!;
  expect(classifySchneider2008(100, boundary.drainedLower!)?.code).toBe('2');
  expect(classifySchneider2008(100, boundary.drainedUpper!)?.code).toBe('2');
  expect(classifySchneider2008(100, boundary.drainedUpper! + 1e-8)?.code).not.toBe('2');
});

test('PROCESS120 report page contract keeps 15 shared preview/PDF pages and accepted comparison panels', () => {
  expect(QUICK_REPORT_PAGE_SPECS.map((page) => page.referencePage)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,16]);
  expect(QUICK_REPORT_PAGE_SPECS.flatMap((page, index) => page.orientation === 'portrait' ? [index + 1] : [])).toEqual([1,5,15]);
  expect(QUICK_REPORT_PAGE_SPECS[3].chartTypes).toEqual(['schneider-semiloq', 'schneider-2008-depth']);
  expect(QUICK_REPORT_PAGE_SPECS[6].chartTypes).toEqual(['qtn-depth', 'fr-depth', 'bq-depth', 'robertson-ic-depth', 'jts-ic-depth']);
  expect(QUICK_REPORT_PAGE_SPECS[7].chartTypes).toEqual(['qtn-depth', 'fr-depth', 'ib-depth', 'cd-depth', 'robertson-2016-depth']);
  expect(QUICK_REPORT_PAGE_SPECS[8].chartTypes).toEqual(['jts-layer-depth', 'robertson-2016-layer-depth', 'schneider-2008-layer-depth', 'g0-depth', 'k0-depth']);
});

test('PROCESS137 PDF export owns exact A3 600 DPI raster dimensions', () => {
  expect(QUICK_PDF_DPI).toBe(600);
  expect(QUICK_PDF_A3_PIXELS).toEqual({
    portrait: { width: 7016, height: 9921 },
    landscape: { width: 9921, height: 7016 },
  });
});

test('PROCESS137 PDF export authority changes when current rows or settings change', () => {
  const workspace = createQuickPlotWorkspace('PDF authority');
  workspace.rows = [
    { rowId: 'r1', depthM: 0.01, qcMpa: 1.2, fsKpa: 12, u2Kpa: 1 },
    { rowId: 'r2', depthM: 0.02, qcMpa: 1.8, fsKpa: 14, u2Kpa: 2 },
  ];
  const revision = createQuickPlotRevision(workspace, '2026-07-30T00:00:00.000Z');
  workspace.revisions = [revision];
  workspace.activeRevisionId = revision.revisionId;
  const original = quickPlotPdfAuthority(workspace);
  const changedRows = { ...workspace, rows: workspace.rows.map((row, index) => index ? row : { ...row, qcMpa: 9.9 }) };
  const changedSettings = { ...workspace, settings: { ...workspace.settings, waterDepthM: 8 } };
  expect(quickPlotPdfAuthority(changedRows)).not.toBe(original);
  expect(quickPlotPdfAuthority(changedSettings)).not.toBe(original);
});

test('PROCESS120 Bq response reference owns fixed source-bound polygons', () => {
  expect(QUICK_BQ_REFERENCE_POLYGONS.source).toBe('R11');
  expect(QUICK_BQ_REFERENCE_POLYGONS.xDomain).toEqual([-.6, 1.4]);
  expect(QUICK_BQ_REFERENCE_POLYGONS.yDomain).toEqual([1, 1000]);
  expect(Object.keys(QUICK_BQ_REFERENCE_POLYGONS.zones).map(Number)).toEqual([1, 2, 4, 5, 6, 7]);
  expect(QUICK_BQ_REFERENCE_POLYGONS.zones[1][0]).toEqual([.72, 1]);
  expect(QUICK_BQ_REFERENCE_POLYGONS.zones[7].at(-1)).toEqual([-.12, 1000]);
});

test('PROCESS117 qc-fs lag chart calculates correlation rather than plotting raw qc against fs', () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({ rowId: `r${index}`, depthM: index / 10, qcMpa: index + 1, fsKpa: (index + 1) * 2, u2Kpa: null }));
  const correlation = quickCrossCorrelation(rows, 3);
  expect(correlation).toHaveLength(7);
  expect(correlation.find((point) => point.lag === 0)?.correlation).toBeCloseTo(1, 12);
  expect(correlation.every((point) => point.correlation <= 1 && point.correlation >= -1)).toBe(true);
});

test('PROCESS117 Robertson 2010 non-normalized SBT owns an independent nine-zone contract', () => {
  const samples: Array<[number, number]> = [[1, 0.1], [1.423, 1.55], [4.993, 0.65], [8.646, 0.25], [10.52, 0.1], [28.044, 0.1], [151.449, 0.1], [920.028, 1.65], [84.094, 4.55]];
  expect(samples.map(([qcOverPa, rf]) => quickRobertson2010SbtZone(qcOverPa, rf))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(quickRobertson2010SbtZone(0.99, 1)).toBeNull();
  expect(quickRobertson2010SbtZone(100, 0)).toBeNull();
});

test('PROCESS117 Robertson 2010 scatter and depth band share qc-over-pa and fs-over-qc inputs', () => {
  const rows = [
    { rowId: 'r1', depthM: 1, qcMpa: 2, fsKpa: 30, u2Kpa: 1800 },
    { rowId: 'r2', depthM: 2, qcMpa: 3, fsKpa: 45, u2Kpa: 1900 },
  ];
  const workspace = createQuickPlotWorkspace('robertson-2010-inputs');
  workspace.settings.pressureBasisConfirmed = true;
  const derived = deriveQuickPlotRows(rows, workspace.settings);
  expect(derived).toHaveLength(2);
  derived.forEach((row) => {
    const qcOverPa = row.qcKpa / 100;
    const rf = row.fsKpa / row.qcKpa * 100;
    expect(row.robertson2010Zone).toBe(quickRobertson2010SbtZone(qcOverPa, rf));
    expect(row.robertson2010Index).toBeCloseTo(Math.sqrt((3.47 - Math.log10(qcOverPa)) ** 2 + (1.22 + Math.log10(rf)) ** 2), 12);
  });
});

test('PROCESS120 partial u2 keeps every qc-fs row and limits pore methods row by row', () => {
  const rows = [
    { rowId: 'r1', depthM: 1, qcMpa: 1, fsKpa: 10, u2Kpa: 5 },
    { rowId: 'r2', depthM: 2, qcMpa: 2, fsKpa: 12, u2Kpa: null },
    { rowId: 'r3', depthM: 3, qcMpa: 3, fsKpa: 14, u2Kpa: 8 },
  ];
  expect(quickPlotRoute(rows)).toBe('partial_cptu');
  const workspace = createQuickPlotWorkspace('partial-u2');
  workspace.rows = rows;
  workspace.settings.pressureBasisConfirmed = true;
  workspace.settings.u2Usage = 'total';
  const derived = deriveQuickPlotRows(rows, workspace.settings);
  expect(derived.map((row) => row.sourceRowId)).toEqual(['r1', 'r2', 'r3']);
  expect(derived.map((row) => row.route)).toEqual(['full_cptu', 'approximate_cpt', 'full_cptu']);
  expect(derived[1].bq).toBeNull();
  expect(derived[1].schneider2008).toBeNull();
  expect(derived[1].plotBreakBefore).toBe(false);
});

test('PROCESS122 parameter evidence names JTS point Zones as the sole soil basis', () => {
  const workspace = createQuickPlotWorkspace('parameter-basis');
  workspace.rows = [
    { rowId: 'r1', depthM: 1, qcMpa: 1, fsKpa: 10, u2Kpa: 5 },
    { rowId: 'r2', depthM: 2, qcMpa: 2, fsKpa: 12, u2Kpa: null },
    { rowId: 'r3', depthM: 3, qcMpa: 3, fsKpa: 14, u2Kpa: 8 },
  ];
  workspace.settings.pressureBasisConfirmed = true;
  workspace.settings.u2Usage = 'total';
  const evidence = quickPlotClassificationEvidence(workspace);
  expect(evidence.parameterBasis).toBe(QUICK_PARAMETER_CLASSIFICATION_BASIS);
  expect(evidence.comparisonRole).toBe(QUICK_PARAMETER_COMPARISON_ROLE);
  expect(evidence.parameterBasis).toContain('逐测点 Zone 分类');
  expect(evidence.comparisonRole).toContain('不参与参数取值');
});

test('PROCESS120 formula audit lists every calculated branch and matches the selected u2 route', () => {
  const rows = [
    { rowId: 'r1', depthM: 1, qcMpa: 1, fsKpa: 10, u2Kpa: 5 },
    { rowId: 'r2', depthM: 2, qcMpa: 2, fsKpa: 12, u2Kpa: null },
    { rowId: 'r3', depthM: 3, qcMpa: 3, fsKpa: 14, u2Kpa: 8 },
  ];
  const workspace = createQuickPlotWorkspace('formula-audit');
  workspace.settings.pressureBasisConfirmed = true;
  workspace.settings.u2Usage = 'total';
  const partialAudit = quickPlotFormulaAudit(workspace.settings, deriveQuickPlotRows(rows, workspace.settings));
  const partialFormulas = partialAudit.groups.flatMap((group) => group.formulas);
  const frictionAngle = partialAudit.groups.find((group) => group.title === '有效内摩擦角 φ′ (°)');
  const sptN = partialAudit.groups.find((group) => group.title === '标准贯入击数 N');
  expect(frictionAngle?.applicability).toBe('JTS 砂性土（Zone 7–9）；按分区公式');
  expect(sptN?.applicability).toBe('JTS 已分类土体（Zone 1–9）');
  expect(sptN?.formulas).toContain('N=0.075 qt(kPa) Ic² / pa(kPa)  [R06]');
  expect(partialAudit.groups.some((group) => /N60|约束模量 M/.test(group.title))).toBe(false);
  expect(partialFormulas).toContain('缺失 u2 行：qt(kPa) = qc(kPa)  [A02]');
  expect(partialFormulas.some((formula) => formula.startsWith('qt(kPa) = qc(kPa) + u2'))).toBe(true);
  expect(partialFormulas).toContain('G0(MPa)=ρ(Mg/m³)Vs²/1000  [R06]');
  expect(partialFormulas).toContain('ψ = 0.56-0.33log Qtn,cs；仅砂类土且 Ic<2.6  [R02]');
  expect(partialFormulas).toContain('Schneider Q=qnet/σ′v0；U2=Δu2/σ′v0；五区边界按 Table 6  [R09]');

  workspace.settings.u2Usage = 'raw_only';
  const rawOnlyFormulas = quickPlotFormulaAudit(workspace.settings, deriveQuickPlotRows(rows, workspace.settings)).groups.flatMap((group) => group.formulas);
  expect(rawOnlyFormulas).toContain('本次未使用 u2：qt(kPa) = qc(kPa)  [A02]');
  expect(rawOnlyFormulas.some((formula) => formula.includes('u2(kPa)(1-a)'))).toBe(false);
  expect(rawOnlyFormulas.some((formula) => formula.startsWith('Schneider Q='))).toBe(false);

  const clayAudit = quickPlotFormulaAudit(
    workspace.settings,
    deriveQuickPlotRows([
      { rowId: 'clay-1', depthM: 1, qcMpa: 0.5, fsKpa: 10, u2Kpa: null },
      { rowId: 'clay-2', depthM: 2, qcMpa: 0.5, fsKpa: 10, u2Kpa: null },
    ], workspace.settings),
  );
  const jtsCompressionModulus = clayAudit.groups.find((group) => group.title === '压缩模量 Es（JTS 7.2.8）(MPa)');
  expect(jtsCompressionModulus?.applicability).toBe('JTS Zone 1–5；0<qnet≤5 MPa');
  expect(jtsCompressionModulus?.formulas.some((formula) => formula.startsWith('Es（JTS 7.2.8）'))).toBe(true);
});
