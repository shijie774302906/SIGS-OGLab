import { expect, test } from '@playwright/test';
import {
  buildCleanedImportCsv,
  cleanupProposalFromImportTool,
  createPipelineFromImportCleanup,
  extractImportAssistantSource,
  readImportAssistantSource,
  validateImportCleanupConfirmation,
  type ImportAssistantSource,
  type ImportCleanupProposal,
} from '../../src/features/import/importAssistantDomain';
import type { AssistantToolCall } from '../../src/features/assistant/assistantTypes';
import type { PipelineContext } from '../../src/features/import/importPipeline';
import { generateProcess129CsvCases, PROCESS129_CSV_SEED } from '../support/process129CsvCases';

const source: ImportAssistantSource = {
  operationId: 'operation-ai-import-1',
  sourceFingerprint: 'a'.repeat(64),
  fileName: 'messy.csv',
  fileType: 'CSV',
  mimeType: 'text/csv',
  sizeBytes: 128,
  sheets: [{
    sheetName: 'CSV',
    rowCount: 4,
    columnCount: 4,
    rows: [
      ['现场导出结果', '', '', ''],
      ['深度(m)', '锥尖阻力(MPa)', '侧摩阻(kPa)', '孔压(kPa)'],
      ['0.5', '1.20', '12', '20'],
      ['1.0', '1.50', '15', '25'],
    ],
    displayRowNumbers: [1, 2, 3, 4],
  }],
};

const proposal: ImportCleanupProposal = {
  sourceFingerprint: source.sourceFingerprint,
  sheetName: 'CSV',
  headerRow: 2,
  summary: '已识别表头、字段和单位，原始测量值保持不变。',
  columns: [
    { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。' },
    { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '锥尖阻力列。' },
    { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻列。' },
    { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa', reason: '孔压列。' },
  ],
  cellEdits: [],
};

const pipelineContext: PipelineContext = {
  currentPointName: 'CPT-01',
  defaultWaterDepthM: 0,
  defaultFinalDepthM: 1,
};

function toolCall(value: ImportCleanupProposal): AssistantToolCall {
  return {
    id: 'tool-import-cleanup',
    name: 'propose_import_cleanup',
    arguments: JSON.stringify(value),
  };
}

test('AI import reads bounded source windows and rejects stale or unauthorized edits', () => {
  const read = readImportAssistantSource(source, { sheetName: 'CSV', rowStart: 2, rowCount: 2 });
  expect(read.ok).toBe(true);
  if (read.ok) {
    expect(read.result.rows).toEqual([
      { displayRowNumber: 2, cells: source.sheets[0].rows[1] },
      { displayRowNumber: 3, cells: source.sheets[0].rows[2] },
    ]);
  }

  const stale = cleanupProposalFromImportTool(toolCall({
    ...proposal,
    sourceFingerprint: 'b'.repeat(64),
  }), source, false);
  expect(stale.ok).toBe(false);

  const withEdit: ImportCleanupProposal = {
    ...proposal,
    cellEdits: [{
      displayRowNumber: 3,
      sourceColumnIndex: 1,
      originalValue: '1.20',
      newValue: '1.25',
      reason: '用户明确要求修正录入错误。',
    }],
  };
  expect(cleanupProposalFromImportTool(toolCall(withEdit), source, false).ok).toBe(false);
  expect(cleanupProposalFromImportTool(toolCall(withEdit), source, true).ok).toBe(true);
});

test('cleaned CSV preserves a mapped missing u2 cell as blank instead of inventing zero', async () => {
  const sourceWithMissingU2: ImportAssistantSource = {
    ...source,
    sourceFingerprint: 'c'.repeat(64),
    sheets: [{
      ...source.sheets[0],
      rows: source.sheets[0].rows.map((row, index) => index === 3 ? [...row.slice(0, 3), ''] : [...row]),
    }],
  };
  const proposalWithMissingU2: ImportCleanupProposal = {
    ...proposal,
    sourceFingerprint: sourceWithMissingU2.sourceFingerprint,
  };
  const pipeline = await createPipelineFromImportCleanup({
    proposal: proposalWithMissingU2,
    source: sourceWithMissingU2,
    sourceAttachment: null,
    context: pipelineContext,
    baseWorkspaceRevision: 8,
    measurementAuthorization: {
      sourceFingerprint: sourceWithMissingU2.sourceFingerprint,
      allowed: false,
    },
  });
  const csv = buildCleanedImportCsv(pipeline);
  expect(csv.split(/\r?\n/)[2]).toBe('CPT-01,1,1500,15,');
  expect(pipeline.normalizedRows[1].values.u2?.origin).toBe('missing');
});

test('confirmed AI cleanup creates a new draft while preserving original cells and attachment bytes', async () => {
  const withEdit: ImportCleanupProposal = {
    ...proposal,
    cellEdits: [{
      displayRowNumber: 3,
      sourceColumnIndex: 1,
      originalValue: '1.20',
      newValue: '1.25',
      reason: '用户明确要求修正录入错误。',
    }],
  };
  const sourceAttachment = {
    fileName: 'messy.csv',
    mimeType: 'text/csv',
    sizeBytes: 3,
    sha256: source.sourceFingerprint,
    bytes: [1, 2, 3],
  };
  const pipeline = await createPipelineFromImportCleanup({
    proposal: withEdit,
    source,
    sourceAttachment,
    context: pipelineContext,
    baseWorkspaceRevision: 7,
    measurementAuthorization: {
      sourceFingerprint: source.sourceFingerprint,
      allowed: true,
    },
    now: '2026-07-25T00:00:00.000Z',
  });

  expect(pipeline.readiness.canGenerateDrafts).toBe(true);
  expect(pipeline.sourceRows[0].cells[1]).toBe('1.20');
  expect(pipeline.sourceAttachment?.bytes).toEqual([1, 2, 3]);
  expect(pipeline.sourceValueOverrides).toHaveLength(1);
  expect(pipeline.sourceValueOverrides[0]).toMatchObject({
    proposedAt: '2026-07-25T00:00:00.000Z',
    confirmedAt: null,
  });
  expect(pipeline.normalizedRows[0].values.qc).toMatchObject({
    rawValue: '1.20',
    normalizedValue: 1250,
    origin: 'assistant-cleanup',
    defaultReason: '用户明确要求修正录入错误。',
  });
  expect(pipeline.rows[0].qcKpa).toBe(1250);
  expect(validateImportCleanupConfirmation(withEdit, source, {
    sourceFingerprint: source.sourceFingerprint,
    allowed: true,
    cellEditsReviewed: false,
  })).toMatchObject({ ok: false });
  expect(validateImportCleanupConfirmation(withEdit, source, {
    sourceFingerprint: source.sourceFingerprint,
    allowed: true,
    cellEditsReviewed: true,
  })).toMatchObject({ ok: true });
});

test(`Process129 parses five deterministic 100-row CSV layouts without changing measurements (${PROCESS129_CSV_SEED})`, async () => {
  const cases = generateProcess129CsvCases();
  expect(cases).toHaveLength(5);
  for (const generated of cases) {
    const file = new File([generated.text], generated.fileName, { type: 'text/csv' });
    const extracted = await extractImportAssistantSource(file, `operation-${generated.id}`);
    const sheet = extracted.sheets[0];
    expect(sheet.delimiter, generated.id).toBe(generated.delimiter);
    expect(sheet.rows[generated.headerRow - 1], generated.id).toEqual(generated.headers);
    expect(sheet.rows.slice(generated.headerRow), generated.id).toEqual(generated.sourceRows);

    const generatedProposal: ImportCleanupProposal = {
      sourceFingerprint: extracted.sourceFingerprint,
      sheetName: 'CSV',
      headerRow: generated.headerRow,
      summary: '固定种子测试：仅整理表头、字段、顺序和分隔符。',
      columns: generated.targets.map((target) => ({
        ...target,
        reason: '由表头和单位唯一识别。',
      })),
      cellEdits: [],
    };
    const pipeline = await createPipelineFromImportCleanup({
      proposal: generatedProposal,
      source: extracted,
      sourceAttachment: null,
      context: { ...pipelineContext, defaultFinalDepthM: 2 },
      baseWorkspaceRevision: 9,
      measurementAuthorization: {
        sourceFingerprint: extracted.sourceFingerprint,
        allowed: false,
      },
    });
    expect(pipeline.rows, generated.id).toHaveLength(100);
    expect(pipeline.sourceRows.map((row) => row.cells), generated.id).toEqual(generated.sourceRows);
    expect(pipeline.sourceValueOverrides, generated.id).toHaveLength(0);
    pipeline.rows.forEach((row, index) => {
      expect(row.depthM, `${generated.id}:depth:${index}`).toBe(generated.rows[index].depthM);
      expect(row.qcKpa, `${generated.id}:qc:${index}`).toBe(generated.rows[index].qcKpa);
      expect(row.fsKpa, `${generated.id}:fs:${index}`).toBe(generated.rows[index].fsKpa);
      expect(row.u2Kpa, `${generated.id}:u2:${index}`).toBe(generated.rows[index].u2Kpa);
    });
  }
});
