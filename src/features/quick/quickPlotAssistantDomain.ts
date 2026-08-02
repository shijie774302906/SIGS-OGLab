import type { AssistantToolCall } from '../assistant/assistantTypes';
import type { ImportAssistantSource, ImportAssistantSheet } from '../import/importAssistantDomain';
import type { QuickPlotRowV1 } from './quickPlotDomain';

export const QUICK_PLOT_IMPORT_PROTOCOL = 'sigs.ai-import/1' as const;

export type QuickPlotAssistantField = 'depthM' | 'qc' | 'fs' | 'u2';
export type QuickPlotAssistantUnit = 'm' | 'cm' | 'mm' | 'kPa' | 'MPa';
export type QuickPlotHeaderMode = 'present' | 'absent';

export type QuickPlotAssistantColumn = {
  sourceColumnIndex: number;
  targetField: QuickPlotAssistantField;
  sourceUnit: QuickPlotAssistantUnit;
  headerLabel?: string;
  reason: string;
  evidenceKind?: 'source-explicit' | 'model-inferred' | 'user-corrected';
};

export type QuickPlotIgnoredColumn = {
  sourceColumnIndex: number;
  headerLabel: string;
  reason: string;
};

/** Kept for Process132 archive/test compatibility; Process134 no longer accumulates hidden authorization tuples. */
export type QuickPlotAmbiguityConfirmation = {
  sheetName: string;
  headerRow: number;
  sourceColumnIndex: number;
  targetField: QuickPlotAssistantField;
  sourceUnit: QuickPlotAssistantUnit;
};

export type QuickPlotImportProposal = {
  protocolVersion: typeof QUICK_PLOT_IMPORT_PROTOCOL;
  requestId: string;
  operationId: string;
  sourceFingerprint: string;
  contextHash: string;
  proposalId: string;
  proposalHash: string;
  sheetName: string;
  headerMode: QuickPlotHeaderMode;
  headerRow: number | null;
  dataStartRow: number;
  dataEndRow: number;
  summary: string;
  columns: QuickPlotAssistantColumn[];
  ignoredColumns: QuickPlotIgnoredColumn[];
  warnings: string[];
  ambiguityConfirmations: QuickPlotAmbiguityConfirmation[];
};

export type QuickPlotDecisionPatch = {
  decisionType:
    | 'select-sheet'
    | 'select-table'
    | 'map-column'
    | 'omit-optional'
    | 'cannot-determine';
  sheetName?: string;
  headerMode?: QuickPlotHeaderMode;
  headerRow?: number | null;
  dataStartRow?: number;
  dataEndRow?: number;
  sourceColumnIndex?: number;
  targetField?: QuickPlotAssistantField;
  sourceUnit?: QuickPlotAssistantUnit;
};

export type QuickPlotAssistantQuestion = {
  questionId: string;
  prompt: string;
  reason: string;
  options: Array<{
    optionId: string;
    recommended: boolean;
    decisionPatch: QuickPlotDecisionPatch;
  }>;
};

export type QuickPlotAssistantDecision =
  | {
      kind: 'question';
      protocolVersion: typeof QUICK_PLOT_IMPORT_PROTOCOL;
      requestId: string;
      operationId: string;
      sourceFingerprint: string;
      contextHash: string;
      question: QuickPlotAssistantQuestion;
    }
  | {
      kind: 'proposal';
      protocolVersion: typeof QUICK_PLOT_IMPORT_PROTOCOL;
      requestId: string;
      operationId: string;
      sourceFingerprint: string;
      contextHash: string;
      proposal: QuickPlotImportProposal;
      sheet: ImportAssistantSheet;
    };

export type QuickPlotRowLedger = {
  sourceRows: number;
  blankRows: number;
  acceptedRows: number;
  rejectedRows: Array<{ displayRowNumber: number; reason: string }>;
  duplicateDepthRows: number[];
  nonMonotonicRows: number[];
  optionalMissing: { fs: number; u2: number };
};

export type QuickPlotImportBuildResult = {
  rows: QuickPlotRowV1[];
  skippedRows: number;
  sourceRows: number;
  ignoredColumns: QuickPlotIgnoredColumn[];
  sheet: ImportAssistantSheet;
  ledger: QuickPlotRowLedger;
  samples: Array<{
    targetField: QuickPlotAssistantField;
    sourceValues: string[];
    normalizedValues: string[];
  }>;
};

export type QuickPlotProposalValidation =
  | { ok: true; proposal: QuickPlotImportProposal; sheet: ImportAssistantSheet }
  | { ok: false; problem: string };

export type QuickPlotDecisionExpectation = {
  requestId: string;
  contextHash: string;
};

export function quickPlotDecisionFromTool(
  call: AssistantToolCall,
  source: ImportAssistantSource,
  expected: QuickPlotDecisionExpectation,
  ambiguityConfirmations: QuickPlotAmbiguityConfirmation[] = [],
): { ok: true; decision: QuickPlotAssistantDecision } | { ok: false; problem: string } {
  if (call.name !== 'submit_quick_plot_import_decision') {
    return { ok: false, problem: 'AI 没有返回当前文件的整理判断。' };
  }
  const args = parseArguments(call);
  if (!args) return { ok: false, problem: 'AI 返回的判断格式不完整。' };
  const common = validateDecisionIdentity(args, source, expected);
  if (!common.ok) return common;
  const kind = boundedString(args.kind, 20);
  if (kind === 'question') {
    if (Object.keys(asRecord(args.proposal)).length) {
      return { ok: false, problem: 'AI 同时返回了问题和判断，请重新判断；文件没有改变。' };
    }
    const parsed = parseQuestion(args.question);
    if (!parsed.ok) return parsed;
    if (parsed.question.options.some((option) => !decisionPatchMatchesSource(option.decisionPatch, source))) {
      return { ok: false, problem: 'AI 问题引用了不存在的工作表、行或列，请重新判断。' };
    }
    return {
      ok: true,
      decision: {
        kind: 'question',
        ...common.identity,
        question: parsed.question,
      },
    };
  }
  if (kind !== 'proposal') {
    return { ok: false, problem: 'AI 必须给出一个问题或一份完整判断。' };
  }
  if (Object.keys(asRecord(args.question)).length) {
    return { ok: false, problem: 'AI 同时返回了问题和判断，请重新判断；文件没有改变。' };
  }
  const proposalArgs = asRecord(args.proposal);
  const proposalValidation = validateProposal({
    protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
    requestId: common.identity.requestId,
    operationId: common.identity.operationId,
    sourceFingerprint: common.identity.sourceFingerprint,
    contextHash: common.identity.contextHash,
    proposalId: boundedString(proposalArgs.proposalId, 120) || call.id,
    proposalHash: '',
    sheetName: boundedString(proposalArgs.sheetName, 120),
    headerMode: proposalArgs.headerMode as QuickPlotHeaderMode,
    headerRow: proposalArgs.headerRow === null ? null : Number(proposalArgs.headerRow),
    dataStartRow: Number(proposalArgs.dataStartRow),
    dataEndRow: Number(proposalArgs.dataEndRow),
    summary: boundedString(proposalArgs.summary, 320),
    columns: parseColumns(proposalArgs.columns),
    ignoredColumns: parseIgnoredColumns(proposalArgs.ignoredColumns),
    warnings: Array.isArray(proposalArgs.warnings)
      ? proposalArgs.warnings.slice(0, 12).map((value) => boundedString(value, 240)).filter(Boolean)
      : [],
    ambiguityConfirmations,
  }, source);
  if (!proposalValidation.ok) return proposalValidation;
  return {
    ok: true,
    decision: {
      kind: 'proposal',
      ...common.identity,
      proposal: proposalValidation.proposal,
      sheet: proposalValidation.sheet,
    },
  };
}

/**
 * Compatibility parser for the Process132 proposal tool. New UI code uses
 * quickPlotDecisionFromTool and the versioned decision protocol.
 */
export function quickPlotProposalFromTool(
  call: AssistantToolCall,
  source: ImportAssistantSource,
  ambiguityConfirmations: QuickPlotAmbiguityConfirmation[] = [],
): QuickPlotProposalValidation {
  const args = parseArguments(call);
  if (!args) return { ok: false, problem: 'AI 整理建议格式无效。' };
  const headerRow = Number(args.headerRow);
  const sheet = source.sheets.find((candidate) => candidate.sheetName === boundedString(args.sheetName, 120));
  const lastRow = sheet?.displayRowNumbers.at(-1) ?? sheet?.rowCount ?? headerRow + 1;
  return validateProposal({
    protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
    requestId: 'legacy-process132',
    operationId: source.operationId,
    sourceFingerprint: boundedString(args.sourceFingerprint, 96),
    contextHash: '',
    proposalId: call.id,
    proposalHash: '',
    sheetName: boundedString(args.sheetName, 120),
    headerMode: 'present',
    headerRow,
    dataStartRow: headerRow + 1,
    dataEndRow: lastRow,
    summary: boundedString(args.summary, 320),
    columns: parseColumns(args.columns),
    ignoredColumns: parseIgnoredColumns(args.ignoredColumns),
    warnings: [],
    ambiguityConfirmations,
  }, source);
}

export function buildQuickPlotRowsFromProposal(
  proposal: QuickPlotImportProposal,
  source: ImportAssistantSource,
): QuickPlotImportBuildResult | { problem: string } {
  const validation = validateProposal(proposal, source);
  if (!validation.ok) return { problem: validation.problem };
  const { sheet } = validation;
  const rowsInRange = sheet.rows
    .map((cells, index) => ({ cells, displayRowNumber: sheet.displayRowNumbers[index] }))
    .filter(({ displayRowNumber }) => (
      displayRowNumber >= proposal.dataStartRow && displayRowNumber <= proposal.dataEndRow
    ));
  const decisions = new Map(proposal.columns.map((column) => [column.targetField, column]));
  const depth = decisions.get('depthM')!;
  const qc = decisions.get('qc')!;
  const fs = decisions.get('fs');
  const u2 = decisions.get('u2');
  const rows: QuickPlotRowV1[] = [];
  const rejectedRows: QuickPlotRowLedger['rejectedRows'] = [];
  const duplicateDepthRows: number[] = [];
  const nonMonotonicRows: number[] = [];
  const seenDepths = new Set<number>();
  let blankRows = 0;
  let optionalFsMissing = 0;
  let optionalU2Missing = 0;
  let previousDepth: number | null = null;

  rowsInRange.forEach(({ cells, displayRowNumber }) => {
    if (!cells.some((cell) => cell.trim())) {
      blankRows += 1;
      return;
    }
    const depthValue = numericCell(cells[depth.sourceColumnIndex]);
    const qcValue = numericCell(cells[qc.sourceColumnIndex]);
    if (depthValue === null || qcValue === null) {
      rejectedRows.push({
        displayRowNumber,
        reason: depthValue === null && qcValue === null
          ? '深度和 qc 不是可读取数字'
          : depthValue === null
            ? '深度不是可读取数字'
            : 'qc 不是可读取数字',
      });
      return;
    }
    const normalizedDepth = convertDepth(depthValue, depth.sourceUnit);
    const fsValue = fs ? numericCell(cells[fs.sourceColumnIndex]) : null;
    const u2Value = u2 ? numericCell(cells[u2.sourceColumnIndex]) : null;
    if (fs && fsValue === null) optionalFsMissing += 1;
    if (u2 && u2Value === null) optionalU2Missing += 1;
    if (seenDepths.has(normalizedDepth)) duplicateDepthRows.push(displayRowNumber);
    if (previousDepth !== null && normalizedDepth < previousDepth) nonMonotonicRows.push(displayRowNumber);
    seenDepths.add(normalizedDepth);
    previousDepth = normalizedDepth;
    rows.push({
      rowId: `quick-ai-row-${String(displayRowNumber).padStart(6, '0')}`,
      depthM: normalizedDepth,
      qcMpa: convertResistance(qcValue, qc.sourceUnit, 'MPa'),
      fsKpa: fsValue === null || !fs ? null : convertResistance(fsValue, fs.sourceUnit, 'kPa'),
      u2Kpa: u2Value === null || !u2 ? null : convertResistance(u2Value, u2.sourceUnit, 'kPa'),
    });
  });
  if (rows.length < 2 || new Set(rows.map((row) => row.depthM)).size < 2) {
    return { problem: '整理后没有至少 2 个不同深度的有效 qc 数据点，请重新判断数据范围、字段或单位。' };
  }
  const ledger: QuickPlotRowLedger = {
    sourceRows: rowsInRange.filter(({ cells }) => cells.some((cell) => cell.trim())).length,
    blankRows,
    acceptedRows: rows.length,
    rejectedRows,
    duplicateDepthRows,
    nonMonotonicRows,
    optionalMissing: { fs: optionalFsMissing, u2: optionalU2Missing },
  };
  return {
    rows,
    skippedRows: rejectedRows.length,
    sourceRows: ledger.sourceRows,
    ignoredColumns: validation.proposal.ignoredColumns,
    sheet,
    ledger,
    samples: proposal.columns.map((column) => {
      const sourceValues = rowsInRange
        .map(({ cells }) => cells[column.sourceColumnIndex]?.trim() ?? '')
        .filter(Boolean)
        .slice(0, 3);
      return {
        targetField: column.targetField,
        sourceValues,
        normalizedValues: sourceValues.map((value) => {
          const parsed = numericCell(value);
          if (parsed === null) return '—';
          const normalized = column.targetField === 'depthM'
            ? convertDepth(parsed, column.sourceUnit)
            : convertResistance(parsed, column.sourceUnit, column.targetField === 'qc' ? 'MPa' : 'kPa');
          return formatNumber(normalized);
        }),
      };
    }),
  };
}

export function quickPlotQuestionOptionLabel(
  patch: QuickPlotDecisionPatch,
  source: ImportAssistantSource,
) {
  if (patch.decisionType === 'cannot-determine') return '我不知道';
  if (patch.decisionType === 'select-sheet') return `使用工作表“${patch.sheetName || '未指定'}”`;
  if (patch.decisionType === 'select-table') {
    const header = patch.headerMode === 'absent'
      ? '没有表头'
      : `表头第 ${patch.headerRow ?? '—'} 行`;
    return `${header}，数据第 ${patch.dataStartRow ?? '—'}–${patch.dataEndRow ?? '—'} 行`;
  }
  if (patch.decisionType === 'omit-optional') {
    return `本次不导入 ${patch.targetField === 'u2' ? 'u2 孔压' : 'fs 侧摩阻力'}`;
  }
  const sheet = source.sheets.find((candidate) => candidate.sheetName === patch.sheetName)
    ?? (source.sheets.length === 1 ? source.sheets[0] : null);
  const header = patch.headerRow && sheet
    ? sheet.rows[sheet.displayRowNumbers.indexOf(patch.headerRow)]?.[patch.sourceColumnIndex ?? -1]?.trim()
    : '';
  const column = Number.isInteger(patch.sourceColumnIndex)
    ? `${excelColumnLabel(Number(patch.sourceColumnIndex))} 列`
    : '未指定列';
  return `${column}${header ? `“${header}”` : ''} → ${patch.targetField ? quickPlotFieldLabel(patch.targetField) : '未指定字段'}${patch.sourceUnit ? `（${patch.sourceUnit}）` : ''}`;
}

export function quickPlotFieldLabel(field: QuickPlotAssistantField) {
  if (field === 'depthM') return '深度';
  if (field === 'qc') return '锥尖阻力 qc';
  if (field === 'fs') return '侧摩阻力 fs';
  return '孔隙水压力 u2';
}

export function quickPlotStandardUnit(field: QuickPlotAssistantField) {
  if (field === 'depthM') return 'm';
  if (field === 'qc') return 'MPa';
  return 'kPa';
}

export function sourceHeader(
  source: ImportAssistantSource | null,
  proposal: QuickPlotImportProposal,
  sourceColumnIndex: number,
) {
  const sheet = source?.sheets.find((candidate) => candidate.sheetName === proposal.sheetName);
  const headerIndex = proposal.headerRow === null
    ? -1
    : sheet?.displayRowNumbers.indexOf(proposal.headerRow) ?? -1;
  const label = headerIndex >= 0 ? sheet?.rows[headerIndex]?.[sourceColumnIndex]?.trim() : '';
  return `${excelColumnLabel(sourceColumnIndex)} 列${label ? `“${label}”` : ''}`;
}

function validateDecisionIdentity(
  args: Record<string, unknown>,
  source: ImportAssistantSource,
  expected: QuickPlotDecisionExpectation,
):
  | {
      ok: true;
      identity: {
        protocolVersion: typeof QUICK_PLOT_IMPORT_PROTOCOL;
        requestId: string;
        operationId: string;
        sourceFingerprint: string;
        contextHash: string;
      };
    }
  | { ok: false; problem: string } {
  const protocolVersion = boundedString(args.protocolVersion, 80);
  const requestId = boundedString(args.requestId, 160);
  const operationId = boundedString(args.operationId, 160);
  const sourceFingerprint = boundedString(args.sourceFingerprint, 96);
  const contextHash = boundedString(args.contextHash, 160);
  if (protocolVersion !== QUICK_PLOT_IMPORT_PROTOCOL) {
    return { ok: false, problem: 'AI 服务版本与当前网页不一致，请重新启动 AI 服务后再试。' };
  }
  if (
    requestId !== expected.requestId
    || operationId !== source.operationId
    || sourceFingerprint !== source.sourceFingerprint
    || contextHash !== expected.contextHash
  ) {
    return { ok: false, problem: 'AI 返回的是旧文件或旧请求的判断，已自动丢弃，请重新判断当前文件。' };
  }
  return {
    ok: true,
    identity: {
      protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
      requestId,
      operationId,
      sourceFingerprint,
      contextHash,
    },
  };
}

function parseQuestion(value: unknown):
  | { ok: true; question: QuickPlotAssistantQuestion }
  | { ok: false; problem: string } {
  const record = asRecord(value);
  const options = Array.isArray(record.options) ? record.options.slice(0, 4) : [];
  const question: QuickPlotAssistantQuestion = {
    questionId: boundedString(record.questionId, 120),
    prompt: boundedString(record.prompt, 240),
    reason: boundedString(record.reason, 240),
    options: options.map((option) => {
      const item = asRecord(option);
      return {
        optionId: boundedString(item.optionId, 120),
        recommended: Boolean(item.recommended),
        decisionPatch: parseDecisionPatch(item.decisionPatch),
      };
    }),
  };
  if (
    !question.questionId
    || !question.prompt
    || question.options.length < 2
    || question.options.some((option) => !option.optionId || !validDecisionPatch(option.decisionPatch))
    || new Set(question.options.map((option) => option.optionId)).size !== question.options.length
    || question.options.filter((option) => option.recommended).length > 1
  ) {
    return { ok: false, problem: 'AI 提出的问题不完整，请重新判断；文件没有改变。' };
  }
  return { ok: true, question };
}

function parseDecisionPatch(value: unknown): QuickPlotDecisionPatch {
  const record = asRecord(value);
  return {
    decisionType: record.decisionType as QuickPlotDecisionPatch['decisionType'],
    ...(boundedString(record.sheetName, 120) ? { sheetName: boundedString(record.sheetName, 120) } : {}),
    ...(record.headerMode === 'present' || record.headerMode === 'absent'
      ? { headerMode: record.headerMode }
      : {}),
    ...(record.headerRow === null || Number.isInteger(Number(record.headerRow))
      ? { headerRow: record.headerRow === null ? null : Number(record.headerRow) }
      : {}),
    ...(Number.isInteger(Number(record.dataStartRow)) ? { dataStartRow: Number(record.dataStartRow) } : {}),
    ...(Number.isInteger(Number(record.dataEndRow)) ? { dataEndRow: Number(record.dataEndRow) } : {}),
    ...(Number.isInteger(Number(record.sourceColumnIndex))
      ? { sourceColumnIndex: Number(record.sourceColumnIndex) }
      : {}),
    ...(['depthM', 'qc', 'fs', 'u2'].includes(String(record.targetField))
      ? { targetField: record.targetField as QuickPlotAssistantField }
      : {}),
    ...(['m', 'cm', 'mm', 'kPa', 'MPa'].includes(String(record.sourceUnit))
      ? { sourceUnit: record.sourceUnit as QuickPlotAssistantUnit }
      : {}),
  };
}

function validDecisionPatch(patch: QuickPlotDecisionPatch) {
  if (patch.decisionType === 'cannot-determine') return true;
  if (patch.decisionType === 'select-sheet') return Boolean(patch.sheetName);
  if (patch.decisionType === 'select-table') {
    return Boolean(
      patch.sheetName
      && (patch.headerMode === 'present' || patch.headerMode === 'absent')
      && (patch.headerMode === 'absent' ? patch.headerRow === null : Number.isInteger(patch.headerRow))
      && Number.isInteger(patch.dataStartRow)
      && Number.isInteger(patch.dataEndRow),
    );
  }
  if (patch.decisionType === 'omit-optional') return patch.targetField === 'fs' || patch.targetField === 'u2';
  if (patch.decisionType === 'map-column') {
    return Boolean(
      patch.sheetName
      && Number.isInteger(patch.sourceColumnIndex)
      && patch.targetField
      && patch.sourceUnit,
    );
  }
  return false;
}

function decisionPatchMatchesSource(patch: QuickPlotDecisionPatch, source: ImportAssistantSource) {
  if (patch.decisionType === 'cannot-determine' || patch.decisionType === 'omit-optional') return true;
  const sheet = source.sheets.find((candidate) => candidate.sheetName === patch.sheetName);
  if (!sheet) return false;
  if (patch.decisionType === 'select-sheet') return true;
  if (patch.decisionType === 'map-column') {
    return Number.isInteger(patch.sourceColumnIndex)
      && Number(patch.sourceColumnIndex) >= 0
      && Number(patch.sourceColumnIndex) < sheet.columnCount;
  }
  const firstRow = sheet.displayRowNumbers[0] ?? 1;
  const lastRow = sheet.displayRowNumbers.at(-1) ?? sheet.rowCount;
  return Number(patch.dataStartRow) >= firstRow
    && Number(patch.dataEndRow) <= lastRow
    && Number(patch.dataStartRow) <= Number(patch.dataEndRow)
    && (patch.headerMode === 'absent'
      ? patch.headerRow === null
      : Number.isInteger(patch.headerRow) && Number(patch.headerRow) < Number(patch.dataStartRow));
}

function validateProposal(
  input: QuickPlotImportProposal,
  source: ImportAssistantSource,
): QuickPlotProposalValidation {
  if (input.sourceFingerprint !== source.sourceFingerprint || input.operationId !== source.operationId) {
    return { ok: false, problem: 'AI 建议引用了旧文件，请重新判断当前文件。' };
  }
  const sheet = source.sheets.find((candidate) => candidate.sheetName === input.sheetName);
  if (!sheet) return { ok: false, problem: 'AI 建议引用了不存在的工作表。' };
  if (!input.summary) return { ok: false, problem: 'AI 判断缺少简短说明。' };
  if (!['present', 'absent'].includes(input.headerMode)) {
    return { ok: false, problem: 'AI 没有说明文件是否包含表头。' };
  }
  const firstRow = sheet.displayRowNumbers[0] ?? 1;
  const lastRow = sheet.displayRowNumbers.at(-1) ?? sheet.rowCount;
  if (
    !Number.isInteger(input.dataStartRow)
    || !Number.isInteger(input.dataEndRow)
    || input.dataStartRow < firstRow
    || input.dataEndRow > lastRow
    || input.dataStartRow > input.dataEndRow
  ) {
    return { ok: false, problem: 'AI 判断的数据起止行超出当前工作表。' };
  }
  if (
    input.headerMode === 'present'
      ? (!Number.isInteger(input.headerRow) || Number(input.headerRow) < firstRow || Number(input.headerRow) >= input.dataStartRow)
      : input.headerRow !== null
  ) {
    return { ok: false, problem: 'AI 判断的表头位置与数据起始行不一致。' };
  }

  const allowedTargets = new Set<QuickPlotAssistantField>(['depthM', 'qc', 'fs', 'u2']);
  const allowedUnits = new Set<QuickPlotAssistantUnit>(['m', 'cm', 'mm', 'kPa', 'MPa']);
  const targetCounts = new Map<QuickPlotAssistantField, number>();
  const mappedIndexes = new Set<number>();
  for (const column of input.columns) {
    if (
      !Number.isInteger(column.sourceColumnIndex)
      || column.sourceColumnIndex < 0
      || column.sourceColumnIndex >= sheet.columnCount
      || !allowedTargets.has(column.targetField)
      || !allowedUnits.has(column.sourceUnit)
      || !column.reason
      || mappedIndexes.has(column.sourceColumnIndex)
    ) {
      return { ok: false, problem: 'AI 字段判断包含无效或重复的源列。' };
    }
    if (column.targetField === 'depthM' && !['m', 'cm', 'mm'].includes(column.sourceUnit)) {
      return { ok: false, problem: '深度列必须使用 m、cm 或 mm。' };
    }
    if (column.targetField !== 'depthM' && !['kPa', 'MPa'].includes(column.sourceUnit)) {
      return { ok: false, problem: '阻力或孔压列必须使用 kPa 或 MPa。' };
    }
    mappedIndexes.add(column.sourceColumnIndex);
    targetCounts.set(column.targetField, (targetCounts.get(column.targetField) ?? 0) + 1);
  }
  if (
    targetCounts.get('depthM') !== 1
    || targetCounts.get('qc') !== 1
    || [...targetCounts.values()].some((count) => count > 1)
  ) {
    return { ok: false, problem: 'AI 必须唯一识别深度和 qc；fs、u2 可以不导入。' };
  }

  const header = input.headerRow === null
    ? []
    : sheet.rows[sheet.displayRowNumbers.indexOf(input.headerRow)] ?? [];
  for (const column of input.columns) {
    const headerLabel = header[column.sourceColumnIndex]?.trim() ?? '';
    const evidence = inspectQuickPlotHeader(headerLabel);
    if (evidence.knownNonMeasurement) {
      return {
        ok: false,
        problem: `${headerLabel || `${excelColumnLabel(column.sourceColumnIndex)} 列`}明确不是深度、qc、fs 或 u2，不能导入。`,
      };
    }
    const userConfirmedCorrection = column.evidenceKind === 'user-corrected'
      && input.headerRow !== null
      && input.ambiguityConfirmations.some((confirmation) => (
        confirmation.sheetName === input.sheetName
        && confirmation.headerRow === input.headerRow
        && confirmation.sourceColumnIndex === column.sourceColumnIndex
        && confirmation.targetField === column.targetField
        && confirmation.sourceUnit === column.sourceUnit
      ));
    if (evidence.explicitConflictTargets.has(column.targetField) && !userConfirmedCorrection) {
      return {
        ok: false,
        problem: `${headerLabel || `${excelColumnLabel(column.sourceColumnIndex)} 列`}与 ${quickPlotFieldLabel(column.targetField)} 的含义明确冲突，不能导入。`,
      };
    }
    if (evidence.fields.size && !evidence.fields.has(column.targetField) && !userConfirmedCorrection) {
      return {
        ok: false,
        problem: `${headerLabel || `${excelColumnLabel(column.sourceColumnIndex)} 列`}与 ${quickPlotFieldLabel(column.targetField)} 不一致，不能导入。`,
      };
    }
    if (evidence.unit && evidence.unit !== column.sourceUnit) {
      return {
        ok: false,
        problem: `${headerLabel}标注为 ${evidence.unit}，与 AI 判断的 ${column.sourceUnit} 不一致。`,
      };
    }
    const rangeUnits = new Set(
      sheet.rows
        .map((cells, index) => ({ value: cells[column.sourceColumnIndex] ?? '', row: sheet.displayRowNumbers[index] }))
        .filter(({ row }) => row >= input.dataStartRow && row <= input.dataEndRow)
        .map(({ value }) => explicitUnit(value))
        .filter((unit): unit is QuickPlotAssistantUnit => Boolean(unit)),
    );
    if (rangeUnits.size > 1 || (rangeUnits.size === 1 && !rangeUnits.has(column.sourceUnit))) {
      return {
        ok: false,
        problem: `${quickPlotFieldLabel(column.targetField)}列在数据范围内出现了与判断不一致的单位，不能按一个单位导入。`,
      };
    }
  }

  const ignoredIndexes = new Set<number>();
  for (const ignored of input.ignoredColumns) {
    if (
      !Number.isInteger(ignored.sourceColumnIndex)
      || ignored.sourceColumnIndex < 0
      || ignored.sourceColumnIndex >= sheet.columnCount
      || mappedIndexes.has(ignored.sourceColumnIndex)
      || ignoredIndexes.has(ignored.sourceColumnIndex)
      || !ignored.reason
    ) {
      return { ok: false, problem: 'AI 的未使用列清单与字段判断冲突。' };
    }
    ignoredIndexes.add(ignored.sourceColumnIndex);
  }
  const ignoredColumns = Array.from({ length: sheet.columnCount }, (_, sourceColumnIndex) => sourceColumnIndex)
    .filter((sourceColumnIndex) => !mappedIndexes.has(sourceColumnIndex))
    .map((sourceColumnIndex) => {
      const declared = input.ignoredColumns.find((candidate) => candidate.sourceColumnIndex === sourceColumnIndex);
      return {
        sourceColumnIndex,
        headerLabel: declared?.headerLabel || header[sourceColumnIndex]?.trim() || `${excelColumnLabel(sourceColumnIndex)} 列`,
        reason: declared?.reason || '未用于快速出图。',
      };
    });
  const proposalWithoutHash = { ...input, ignoredColumns, proposalHash: '' };
  const proposalHash = stableHash(JSON.stringify(canonicalize(proposalWithoutHash)));
  return { ok: true, proposal: { ...proposalWithoutHash, proposalHash }, sheet };
}

function parseColumns(value: unknown): QuickPlotAssistantColumn[] {
  return Array.isArray(value) ? value.slice(0, 4).map((candidate) => {
    const record = asRecord(candidate);
    return {
      sourceColumnIndex: Number(record.sourceColumnIndex),
      targetField: record.targetField as QuickPlotAssistantField,
      sourceUnit: record.sourceUnit as QuickPlotAssistantUnit,
      headerLabel: boundedString(record.headerLabel, 80) || undefined,
      reason: boundedString(record.reason, 240),
      evidenceKind: ['source-explicit', 'model-inferred', 'user-corrected'].includes(String(record.evidenceKind))
        ? record.evidenceKind as QuickPlotAssistantColumn['evidenceKind']
        : 'model-inferred',
    };
  }) : [];
}

function parseIgnoredColumns(value: unknown): QuickPlotIgnoredColumn[] {
  return Array.isArray(value) ? value.slice(0, 40).map((candidate) => {
    const record = asRecord(candidate);
    return {
      sourceColumnIndex: Number(record.sourceColumnIndex),
      headerLabel: boundedString(record.headerLabel, 80),
      reason: boundedString(record.reason, 240),
    };
  }) : [];
}

function inspectQuickPlotHeader(header: string) {
  const decoded = header
    .replace(/&#(?:10|13);/gi, ' ')
    .replace(/_x000a_/gi, ' ');
  const compact = decoded
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\s_\-–—()[\]{}（）【】/\\·.,，。:：]+/g, '');
  const fields = new Set<QuickPlotAssistantField>();
  const explicitConflictTargets = new Set<QuickPlotAssistantField>();
  const includesAny = (values: string[]) => values.some((value) => compact.includes(value));
  const knownNonMeasurement = includesAny([
    'temperature', 'temp', '温度', 'inclination', 'inclinationangle', 'tilt', '倾角',
    'timestamp', 'datetime', 'date', 'time', '时间', '日期',
  ]);
  if (includesAny(['depth', 'penetrationdepth', 'belowmudline', '贯入深度', '泥面以下深度', '深度']) || compact === 'z') fields.add('depthM');
  if (includesAny(['elevation', 'elev', '标高', '高程'])) explicitConflictTargets.add('depthM');
  if (includesAny(['coneresistance', 'tipresistance', '锥尖阻力', '锥头阻力', '锥阻']) || /^qc(?:kpa|mpa)?$/.test(compact)) fields.add('qc');
  if (/^(?:qt|qnet|qtn)(?:kpa|mpa)?$/i.test(compact) || includesAny(['净锥阻', '修正锥阻'])) explicitConflictTargets.add('qc');
  if (includesAny(['sleevefriction', 'sidefriction', '侧壁摩阻力', '侧摩阻力', '侧摩', '套筒摩阻', '套管摩阻', '摩阻力']) || /^fs(?:kpa|mpa)?$/.test(compact)) fields.add('fs');
  if (/^(?:rf|fr)(?:%|percent)?$/i.test(compact) || includesAny(['摩阻比', '摩擦比'])) explicitConflictTargets.add('fs');
  if (includesAny(['porepressure', '孔隙水压力', '孔压']) || /^u2(?:kpa|mpa)?$/.test(compact)) fields.add('u2');
  if (/^u[013](?:kpa|mpa)?$/i.test(compact)) explicitConflictTargets.add('u2');
  const unit: QuickPlotAssistantUnit | null = /mpa/i.test(decoded)
    ? 'MPa'
    : /kpa/i.test(decoded)
      ? 'kPa'
      : /(?:^|[^a-z])mm(?:$|[^a-z])/i.test(decoded)
        ? 'mm'
        : /(?:^|[^a-z])cm(?:$|[^a-z])/i.test(decoded)
          ? 'cm'
          : /(?:^|[^a-z])m(?:$|[^a-z])/i.test(decoded)
            ? 'm'
            : null;
  return { fields, explicitConflictTargets, unit, knownNonMeasurement };
}

function convertDepth(value: number, unit: QuickPlotAssistantUnit) {
  if (unit === 'cm') return value / 100;
  if (unit === 'mm') return value / 1000;
  return value;
}

function convertResistance(value: number, unit: QuickPlotAssistantUnit, target: 'kPa' | 'MPa') {
  if (target === unit) return value;
  return target === 'kPa' ? value * 1000 : value / 1000;
}

function numericCell(value: string | undefined) {
  const normalized = String(value ?? '').trim().replace(/,/g, '');
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function explicitUnit(value: string): QuickPlotAssistantUnit | null {
  const text = String(value ?? '');
  if (/\bmpa\b/i.test(text)) return 'MPa';
  if (/\bkpa\b/i.test(text)) return 'kPa';
  if (/(?:^|[^a-z])mm(?:$|[^a-z])/i.test(text)) return 'mm';
  if (/(?:^|[^a-z])cm(?:$|[^a-z])/i.test(text)) return 'cm';
  if (/(?:^|[^a-z])m(?:$|[^a-z])/i.test(text)) return 'm';
  return null;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedString(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function excelColumnLabel(index: number) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label || '?';
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)
    ? value.toExponential(3)
    : Number(value.toFixed(6)).toString();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `p134-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
