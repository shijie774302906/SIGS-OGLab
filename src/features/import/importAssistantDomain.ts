import type { CellValue, Sheet } from 'read-excel-file/browser';
import type { AssistantToolCall } from '../assistant/assistantTypes';
import type { RawImportDataBlockV2, TargetFieldKey } from '../workspace/workspaceV2';
import {
  createTabularImportPipeline,
  setFieldMapping,
  setSourceValueOverrides,
  setUnitDecision,
  type CsvImportPipelineV2,
  type PipelineContext,
  type SourceValueOverrideV1,
} from './importPipeline';
import { decodeDelimitedText, delimiterLabel, parseDelimitedText } from './csvParsing';

const MAX_ASSISTANT_FILE_BYTES = 30 * 1024 * 1024;
const MAX_ASSISTANT_CELLS = 300_000;
const MAX_READ_ROWS = 40;
const MAX_READ_COLUMNS = 20;
const MAX_CELL_EDITS = 50;

export type ImportAssistantSheet = {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  rows: string[][];
  displayRowNumbers: number[];
  delimiter?: ',' | '\t' | ';';
};

export type ImportAssistantSource = {
  operationId: string;
  sourceFingerprint: string;
  fileName: string;
  fileType: 'Excel' | 'CSV';
  mimeType: string;
  sizeBytes: number;
  sheets: ImportAssistantSheet[];
};

export type ImportAssistantQuestion = {
  questionId: string;
  prompt: string;
  reason: string;
  options: Array<{
    optionId: string;
    label: string;
    description: string;
    recommended: boolean;
    confirmations?: Array<{
      sheetName: string;
      headerRow: number;
      sourceColumnIndex: number;
      targetField: 'depthM' | 'qc' | 'fs' | 'u2';
      sourceUnit: 'm' | 'cm' | 'mm' | 'kPa' | 'MPa';
    }>;
  }>;
};

export type ImportCleanupColumnDecision = {
  sourceColumnIndex: number;
  targetField: Extract<TargetFieldKey, 'pointName' | 'depthM' | 'qc' | 'fs' | 'u2'>;
  sourceUnit: 'text' | 'm' | 'cm' | 'mm' | 'kPa' | 'MPa';
  headerLabel?: string;
  reason: string;
};

export type ImportCleanupCellEdit = {
  displayRowNumber: number;
  sourceColumnIndex: number;
  originalValue: string;
  newValue: string;
  reason: string;
};

export type ImportCleanupProposal = {
  sourceFingerprint: string;
  sheetName: string;
  headerRow: number | null;
  summary: string;
  columns: ImportCleanupColumnDecision[];
  cellEdits: ImportCleanupCellEdit[];
};

export type ImportCleanupProposalValidation =
  | { ok: true; proposal: ImportCleanupProposal; sheet: ImportAssistantSheet }
  | { ok: false; problem: string };

export type ImportCleanupMeasurementAuthorization = {
  sourceFingerprint: string;
  allowed: boolean;
  cellEditsReviewed?: boolean;
};

export async function extractImportAssistantSource(file: File, operationId: string): Promise<ImportAssistantSource> {
  if (file.size > MAX_ASSISTANT_FILE_BYTES) {
    throw new Error('文件超过 30 MB，AI 整理暂不读取；仍可使用普通导入或先拆分工作簿。');
  }
  const lowerName = file.name.toLocaleLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
    throw new Error('AI 整理当前支持 CSV 和 .xlsx 文件。');
  }
  const buffer = await file.arrayBuffer();
  const sourceFingerprint = await sha256Buffer(buffer);
  const sheets = lowerName.endsWith('.xlsx')
    ? await extractExcelSheets(buffer)
    : [extractCsvSheet(decodeDelimitedText(buffer))];
  const totalCells = sheets.reduce(
    (total, sheet) => total + sheet.rows.reduce((sheetTotal, row) => sheetTotal + row.length, 0),
    0,
  );
  if (totalCells > MAX_ASSISTANT_CELLS) {
    throw new Error('工作簿内容过大，AI 整理暂不读取；请拆分文件后重试。');
  }
  return {
    operationId,
    sourceFingerprint,
    fileName: file.name,
    fileType: lowerName.endsWith('.xlsx') ? 'Excel' : 'CSV',
    mimeType: file.type || (lowerName.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv'),
    sizeBytes: file.size,
    sheets,
  };
}

export function summarizeImportAssistantSource(source: ImportAssistantSource, allowMeasurementEdits: boolean) {
  return {
    operationId: source.operationId,
    sourceFingerprint: source.sourceFingerprint,
    fileName: source.fileName,
    fileType: source.fileType,
    sizeBytes: source.sizeBytes,
    allowMeasurementEdits,
    sheets: source.sheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      delimiter: sheet.delimiter ? delimiterLabel(sheet.delimiter) : undefined,
      firstNonEmptyRows: sheet.rows
        .map((row, index) => ({ row, displayRowNumber: sheet.displayRowNumbers[index] }))
        .filter(({ row }) => row.some((cell) => cell.trim()))
        .slice(0, 6)
        .map(({ row, displayRowNumber }) => ({
          displayRowNumber,
          preview: row.slice(0, 8).map((cell) => cell.slice(0, 80)),
        })),
    })),
  };
}

export function readImportAssistantSource(
  source: ImportAssistantSource,
  args: Record<string, unknown>,
) {
  const requestedSheet = typeof args.sheetName === 'string' ? args.sheetName : '';
  const sheet = source.sheets.find((candidate) => candidate.sheetName === requestedSheet)
    ?? (source.sheets.length === 1 ? source.sheets[0] : null);
  if (!sheet) return { ok: false as const, problem: '请先指定要读取的工作表。' };
  const rowStart = Number.isInteger(args.rowStart) ? Number(args.rowStart) : 1;
  const rowCount = Number.isInteger(args.rowCount) ? Number(args.rowCount) : 30;
  if (rowStart < 1 || rowCount < 1 || rowCount > MAX_READ_ROWS) {
    return { ok: false as const, problem: `每次只能读取 1–${MAX_READ_ROWS} 行。` };
  }
  const startIndex = sheet.displayRowNumbers.findIndex((rowNumber) => rowNumber >= rowStart);
  const safeStart = startIndex < 0 ? sheet.rows.length : startIndex;
  const rows = sheet.rows.slice(safeStart, safeStart + rowCount).map((cells, index) => ({
    displayRowNumber: sheet.displayRowNumbers[safeStart + index],
    cells: cells.slice(0, MAX_READ_COLUMNS).map((cell) => cell.slice(0, 160)),
  }));
  return {
    ok: true as const,
    result: {
      sourceFingerprint: source.sourceFingerprint,
      sheetName: sheet.sheetName,
      totalRows: sheet.rowCount,
      totalColumns: sheet.columnCount,
      delimiter: sheet.delimiter ? delimiterLabel(sheet.delimiter) : undefined,
      returnedRows: rows.length,
      clippedColumns: sheet.columnCount > MAX_READ_COLUMNS,
      rows,
      rule: '只读来源预览；空值保留，不插值，不代表已导入。',
    },
    detail: `已读取 ${sheet.sheetName} 第 ${rowStart} 行起的 ${rows.length} 行来源预览。`,
  };
}

export function questionFromImportTool(call: AssistantToolCall): { ok: true; question: ImportAssistantQuestion } | { ok: false; problem: string } {
  const args = parseArguments(call);
  if (!args) return { ok: false, problem: 'AI 问题格式无效。' };
  const options = Array.isArray(args.options) ? args.options : [];
  const question: ImportAssistantQuestion = {
    questionId: boundedString(args.questionId, 80),
    prompt: boundedString(args.prompt, 240),
    reason: boundedString(args.reason, 240),
    options: options.slice(0, 4).map((option) => ({
      optionId: boundedString((option as Record<string, unknown>)?.optionId, 80),
      label: boundedString((option as Record<string, unknown>)?.label, 80),
      description: boundedString((option as Record<string, unknown>)?.description, 160),
      recommended: Boolean((option as Record<string, unknown>)?.recommended),
      confirmations: Array.isArray((option as Record<string, unknown>)?.confirmations)
        ? ((option as Record<string, unknown>).confirmations as unknown[]).slice(0, 4).map((item) => {
          const claim = item && typeof item === 'object' && !Array.isArray(item)
            ? item as Record<string, unknown>
            : {};
          return {
            sheetName: boundedString(claim.sheetName, 120),
            headerRow: Number(claim.headerRow),
            sourceColumnIndex: Number(claim.sourceColumnIndex),
            targetField: claim.targetField as 'depthM' | 'qc' | 'fs' | 'u2',
            sourceUnit: claim.sourceUnit as 'm' | 'cm' | 'mm' | 'kPa' | 'MPa',
          };
        })
        : undefined,
    })),
  };
  if (
    !question.questionId
    || !question.prompt
    || question.options.length < 2
    || question.options.some((option) => !option.optionId || !option.label)
    || question.options.some((option) => option.confirmations?.some((claim) =>
      !claim.sheetName
      || !Number.isInteger(claim.headerRow)
      || claim.headerRow < 1
      || !Number.isInteger(claim.sourceColumnIndex)
      || claim.sourceColumnIndex < 0
      || !['depthM', 'qc', 'fs', 'u2'].includes(claim.targetField)
      || !['m', 'cm', 'mm', 'kPa', 'MPa'].includes(claim.sourceUnit)))
    || question.options.filter((option) => option.recommended).length > 1
  ) {
    return { ok: false, problem: 'AI 问题缺少可用选项。' };
  }
  return { ok: true, question };
}

export function cleanupProposalFromImportTool(
  call: AssistantToolCall,
  source: ImportAssistantSource,
  allowMeasurementEdits: boolean,
): ImportCleanupProposalValidation {
  const args = parseArguments(call);
  if (!args) return { ok: false, problem: 'AI 整理建议格式无效。' };
  const proposal: ImportCleanupProposal = {
    sourceFingerprint: boundedString(args.sourceFingerprint, 96),
    sheetName: boundedString(args.sheetName, 120),
    headerRow: args.headerRow === null ? null : Number(args.headerRow),
    summary: boundedString(args.summary, 320),
    columns: Array.isArray(args.columns) ? args.columns.slice(0, 8).map((column) => {
      const value = column as Record<string, unknown>;
      return {
        sourceColumnIndex: Number(value.sourceColumnIndex),
        targetField: value.targetField as ImportCleanupColumnDecision['targetField'],
        sourceUnit: value.sourceUnit as ImportCleanupColumnDecision['sourceUnit'],
        headerLabel: boundedString(value.headerLabel, 80) || undefined,
        reason: boundedString(value.reason, 240),
      };
    }) : [],
    cellEdits: Array.isArray(args.cellEdits) ? args.cellEdits.slice(0, MAX_CELL_EDITS + 1).map((edit) => {
      const value = edit as Record<string, unknown>;
      return {
        displayRowNumber: Number(value.displayRowNumber),
        sourceColumnIndex: Number(value.sourceColumnIndex),
        originalValue: boundedString(value.originalValue, 160),
        newValue: boundedString(value.newValue, 160),
        reason: boundedString(value.reason, 240),
      };
    }) : [],
  };
  if (proposal.sourceFingerprint !== source.sourceFingerprint) return { ok: false, problem: 'AI 建议引用了旧来源，请重新整理当前文件。' };
  const sheet = source.sheets.find((candidate) => candidate.sheetName === proposal.sheetName);
  if (!sheet) return { ok: false, problem: 'AI 建议引用了不存在的工作表。' };
  if (proposal.headerRow !== null && (!Number.isInteger(proposal.headerRow) || proposal.headerRow < 1 || proposal.headerRow >= sheet.rowCount)) {
    return { ok: false, problem: 'AI 建议的表头行无效。' };
  }
  const allowedTargets = new Set(['pointName', 'depthM', 'qc', 'fs', 'u2']);
  const allowedUnits = new Set(['text', 'm', 'cm', 'mm', 'kPa', 'MPa']);
  const targetCounts = new Map<string, number>();
  const columnIndexes = new Set<number>();
  for (const column of proposal.columns) {
    if (
      !Number.isInteger(column.sourceColumnIndex)
      || column.sourceColumnIndex < 0
      || column.sourceColumnIndex >= sheet.columnCount
      || !allowedTargets.has(column.targetField)
      || !allowedUnits.has(column.sourceUnit)
      || !column.reason
      || columnIndexes.has(column.sourceColumnIndex)
    ) return { ok: false, problem: 'AI 字段建议包含无效或重复的源列。' };
    columnIndexes.add(column.sourceColumnIndex);
    targetCounts.set(column.targetField, (targetCounts.get(column.targetField) ?? 0) + 1);
    if (column.targetField === 'pointName' && column.sourceUnit !== 'text') return { ok: false, problem: '点位字段单位必须为文本。' };
    if (column.targetField !== 'pointName' && column.sourceUnit === 'text') return { ok: false, problem: '测量字段缺少可用单位。' };
  }
  if (['depthM', 'qc', 'fs'].some((target) => targetCounts.get(target) !== 1) || [...targetCounts.values()].some((count) => count > 1)) {
    return { ok: false, problem: 'AI 建议必须唯一识别 Depth、qc 和 fs；u2 与 PointName 可选。' };
  }
  if (proposal.cellEdits.length > MAX_CELL_EDITS) return { ok: false, problem: `一次最多确认 ${MAX_CELL_EDITS} 个测量值修改。` };
  if (proposal.cellEdits.length && !allowMeasurementEdits) return { ok: false, problem: '当前未允许修改测量值，请保持原值或先明确授权。' };
  const editedCells = new Set<string>();
  for (const edit of proposal.cellEdits) {
    const rowIndex = sheet.displayRowNumbers.indexOf(edit.displayRowNumber);
    const mappedTarget = proposal.columns.find((column) => column.sourceColumnIndex === edit.sourceColumnIndex)?.targetField;
    const originalCell = rowIndex >= 0 ? sheet.rows[rowIndex]?.[edit.sourceColumnIndex]?.trim() ?? '' : '';
    const key = `${edit.displayRowNumber}:${edit.sourceColumnIndex}`;
    if (
      rowIndex < 0
      || !['depthM', 'qc', 'fs', 'u2'].includes(mappedTarget ?? '')
      || !originalCell
      || originalCell !== edit.originalValue.trim()
      || parseStrictNumeric(edit.newValue) === null
      || !edit.reason
      || editedCells.has(key)
    ) return { ok: false, problem: 'AI 测量值建议与当前源单元格不一致，已拒绝。' };
    editedCells.add(key);
  }
  return { ok: true, proposal, sheet };
}

export async function createPipelineFromImportCleanup(input: {
  proposal: ImportCleanupProposal;
  source: ImportAssistantSource;
  sourceAttachment: RawImportDataBlockV2['sourceAttachment'];
  context: PipelineContext;
  baseWorkspaceRevision: number;
  measurementAuthorization: ImportCleanupMeasurementAuthorization;
  now?: string;
}): Promise<CsvImportPipelineV2> {
  const validation = validateConfirmedProposal(input.proposal, input.source, input.measurementAuthorization);
  if (!validation.ok) throw new Error(validation.problem);
  const { proposal, sheet } = validation;
  const headerIndex = proposal.headerRow === null ? -1 : proposal.headerRow - 1;
  const sourceHeader = headerIndex >= 0 ? sheet.rows[headerIndex] ?? [] : [];
  const labelByIndex = new Map(proposal.columns.map((column) => [column.sourceColumnIndex, column.headerLabel]));
  const headers = Array.from({ length: sheet.columnCount }, (_, index) => (
    sourceHeader[index]?.trim() || labelByIndex.get(index)?.trim() || `第 ${index + 1} 列`
  ));
  const dataRows = sheet.rows.slice(headerIndex + 1)
    .map((row, offset) => ({ row, displayRowNumber: sheet.displayRowNumbers[headerIndex + 1 + offset] }))
    .filter(({ row }) => row.some((cell) => cell.trim()));
  const workbookExtraction = input.source.fileType === 'Excel'
    ? {
        sheetName: sheet.sheetName,
        fidelity: 'cached-values' as const,
        headerRows: sheet.rows.slice(0, proposal.headerRow ?? 0).map((row) => [...row]),
        rows: dataRows.map(({ row }) => [...row]),
        displayRowNumbers: dataRows.map(({ displayRowNumber }) => displayRowNumber),
        formulaDefinitionsRequireOriginalFile: true as const,
      }
    : undefined;
  let pipeline = await createTabularImportPipeline({
    batchId: `batch-ai-${safeId(input.source.operationId)}`,
    operationId: input.source.operationId,
    baseWorkspaceRevision: input.baseWorkspaceRevision,
    fileName: input.source.fileName,
    currentPointName: input.context.currentPointName,
    defaultWaterDepthM: input.context.defaultWaterDepthM,
    defaultFinalDepthM: input.context.defaultFinalDepthM,
    allowAnyPoint: input.context.allowAnyPoint,
    existingPoints: input.context.existingPoints,
    sourceFingerprint: input.source.sourceFingerprint,
    sourceKind: input.source.fileType === 'Excel' ? 'excel' : 'csv',
    headers,
    rows: dataRows.map(({ row }) => [...row]),
    displayRowNumbers: dataRows.map(({ displayRowNumber }) => displayRowNumber),
    sourceSheetName: sheet.sheetName,
    sourceHeaderRow: proposal.headerRow ?? undefined,
    sourceWorkbookSheets: input.source.sheets.map((candidate) => ({
      sheetName: candidate.sheetName,
      rowCount: candidate.rowCount,
      columnCount: candidate.columnCount,
      state: candidate.sheetName === sheet.sheetName ? 'assistant-selected' : 'not-selected',
    })),
    sourceOriginalFileSize: input.source.sizeBytes,
    sourceWorkbookExtraction: workbookExtraction,
    sourceAttachment: input.sourceAttachment,
    now: input.now,
  });
  for (const decision of proposal.columns) {
    const column = pipeline.sourceColumns.find((candidate) => candidate.sourceIndex === decision.sourceColumnIndex);
    if (!column) throw new Error('整理建议中的字段已经变化，请重新整理。');
    pipeline = setFieldMapping(pipeline, decision.targetField, column.columnId, input.context, input.now);
    if (decision.targetField !== 'pointName') {
      pipeline = setUnitDecision(pipeline, decision.targetField, decision.sourceUnit, input.context);
    }
  }
  if (proposal.cellEdits.length) {
    const overrides: SourceValueOverrideV1[] = proposal.cellEdits.map((edit, index) => {
      const row = pipeline.sourceRows.find((candidate) => candidate.displayRowNumber === edit.displayRowNumber);
      const column = pipeline.sourceColumns.find((candidate) => candidate.sourceIndex === edit.sourceColumnIndex);
      if (!row || !column) throw new Error('测量值建议引用的源行已经变化，请重新整理。');
      return {
        overrideId: `assistant-cleanup:${input.source.sourceFingerprint.slice(0, 12)}:${edit.displayRowNumber}:${edit.sourceColumnIndex}:${index}`,
        sourceRowId: row.rowId,
        sourceColumnId: column.columnId,
        displayRowNumber: edit.displayRowNumber,
        originalValue: edit.originalValue,
        replacementValue: edit.newValue,
        reason: edit.reason,
        source: 'assistant',
        proposedAt: input.now ?? new Date().toISOString(),
        confirmedAt: null,
      };
    });
    pipeline = setSourceValueOverrides(pipeline, overrides, input.context);
  }
  return pipeline;
}

function validateConfirmedProposal(
  proposal: ImportCleanupProposal,
  source: ImportAssistantSource,
  authorization: ImportCleanupMeasurementAuthorization,
): ImportCleanupProposalValidation {
  if (authorization.sourceFingerprint !== source.sourceFingerprint) {
    return { ok: false, problem: '测量值修改权限已随来源变化失效，请重新整理当前文件。' };
  }
  return cleanupProposalFromImportTool({
    id: 'confirmed-import-cleanup',
    name: 'propose_import_cleanup',
    arguments: JSON.stringify(proposal),
  }, source, authorization.allowed);
}

export function validateImportCleanupConfirmation(
  proposal: ImportCleanupProposal,
  source: ImportAssistantSource,
  authorization: ImportCleanupMeasurementAuthorization,
): ImportCleanupProposalValidation {
  const validation = validateConfirmedProposal(proposal, source, authorization);
  if (!validation.ok) return validation;
  if (proposal.cellEdits.length > 0 && !authorization.cellEditsReviewed) {
    return { ok: false, problem: `请先查看并确认 ${proposal.cellEdits.length} 项测量值改动。` };
  }
  return validation;
}

export function buildCleanedImportCsv(pipeline: CsvImportPipelineV2) {
  const hasU2 = pipeline.mappings.some((mapping) => mapping.targetField === 'u2' && mapping.state === 'confirmed');
  const normalizedRows = pipeline.normalizedRows.filter((candidate) => candidate.row);
  const rows = [
    ['PointName', 'Depth(m)', 'qc(kPa)', 'fs(kPa)', ...(hasU2 ? ['u2(kPa)'] : [])],
    ...normalizedRows.map((candidate) => {
      const row = candidate.row!;
      return [
        row.pointName,
        String(row.depthM),
        String(row.qcKpa),
        String(row.fsKpa),
        ...(hasU2 ? [candidate.values.u2?.origin === 'missing' ? '' : String(row.u2Kpa)] : []),
      ];
    }),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

async function extractExcelSheets(buffer: ArrayBuffer): Promise<ImportAssistantSheet[]> {
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const sheets = await readXlsxFile(buffer);
  return sheets.map((sheet) => normalizeSheet(sheet));
}

function normalizeSheet(sheet: Sheet): ImportAssistantSheet {
  const rows = (sheet.data as CellValue[][]).map((row) => row.map(cellText));
  return {
    sheetName: sheet.sheet,
    rowCount: rows.length,
    columnCount: rows.reduce((maximum, row) => Math.max(maximum, row.length), 0),
    rows,
    displayRowNumbers: rows.map((_, index) => index + 1),
  };
}

function extractCsvSheet(text: string): ImportAssistantSheet {
  const parsed = parseDelimitedText(text);
  return {
    sheetName: 'CSV',
    rowCount: parsed.rows.length,
    columnCount: parsed.rows.reduce((maximum, candidate) => Math.max(maximum, candidate.cells.length), 0),
    rows: parsed.rows.map((row) => row.cells),
    displayRowNumbers: parsed.rows.map((row) => row.lineNumber),
    delimiter: parsed.delimiter,
  };
}

function parseArguments(call: AssistantToolCall): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(call.arguments);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function boundedString(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function parseStrictNumeric(value: string) {
  const normalized = value.trim();
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellText(value: CellValue) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function safeId(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'source';
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function sha256Buffer(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
