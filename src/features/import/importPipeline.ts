import type { SyntheticCptuRow } from '../../workflowData';
import type { ImportDraft, ImportDraftProblem } from '../workflow/types';
import type {
  FieldMappingDecisionV2,
  ImportBatchDraftV2,
  PointAttributionDecisionV2,
  PointSplitPlanV2,
  PointTargetDecisionV2,
  RawImportDataBlockV2,
  RevisionVector,
  SourceColumnV2,
  TargetFieldKey,
  UnitDecisionV2,
} from '../workspace/workspaceV2';
import { parseDelimitedText } from './csvParsing';

export const STANDARD_IMPORT_TEMPLATE_FIELDS = [
  'Depth(m)',
  'qc(MPa)',
  'fs(kPa)',
  'u2(kPa)',
] as const;

export type SourceRowV2 = {
  rowId: string;
  sourceIndex: number;
  displayRowNumber: number;
  cells: string[];
};

export type SourceValueOverrideV1 = {
  overrideId: string;
  sourceRowId: string;
  sourceColumnId: string;
  displayRowNumber: number;
  originalValue: string;
  replacementValue: string;
  reason: string;
  source: 'assistant';
  proposedAt: string;
  confirmedAt: string | null;
};

export type NormalizedValueV2 = {
  rawValue: string | null;
  normalizedValue: string | number | null;
  origin: 'source' | 'assistant-cleanup' | 'derived' | 'defaulted' | 'missing';
  sourceColumnId?: string;
  derivedFrom?: TargetFieldKey[];
  defaultReason?: string;
  sourceUnit?: string | null;
  standardUnit: UnitDecisionV2['standardUnit'];
};

export type NormalizedSourceRowV2 = {
  sourceRowId: string;
  displayRowNumber: number;
  detectedPointKey: string;
  values: Partial<Record<TargetFieldKey, NormalizedValueV2>>;
  row: SyntheticCptuRow | null;
  problems: ImportDraftProblem[];
};

export type ImportReadinessV2 = {
  canNormalize: boolean;
  canGenerateDrafts: boolean;
  canRunCheck: boolean;
  reasons: Array<{
    reasonCode: string;
    message: string;
    recovery: 'mapping' | 'unit' | 'point-plan' | 'source-file';
    targetField?: TargetFieldKey;
  }>;
};

export type CsvImportPipelineV2 = {
  batchId: string;
  operationId: string;
  baseWorkspaceRevision: number;
  sourceFingerprint: string;
  fileName: string;
  sourceKind?: 'csv' | 'excel';
  sourceSheetName?: string;
  sourceHeaderRow?: number;
  sourceWorkbookSheets?: Array<{ sheetName: string; rowCount: number; columnCount: number; state: string }>;
  sourceParseDurationMs?: number;
  sourceOriginalFileSize?: number;
  sourceWorkbookExtraction?: RawImportDataBlockV2['workbookExtraction'];
  sourceAttachment?: RawImportDataBlockV2['sourceAttachment'];
  headers: string[];
  sourceRows: SourceRowV2[];
  sourceColumns: SourceColumnV2[];
  sourceValueOverrides: SourceValueOverrideV1[];
  sourceProblems: ImportDraftProblem[];
  mappings: FieldMappingDecisionV2[];
  unitDecisions: UnitDecisionV2[];
  pointAttribution: PointAttributionDecisionV2 | null;
  normalizedRows: NormalizedSourceRowV2[];
  rows: SyntheticCptuRow[];
  pointPlan: PointSplitPlanV2;
  problems: ImportDraftProblem[];
  readiness: ImportReadinessV2;
  revisions: RevisionVector;
};

type TargetDefinition = {
  targetField: TargetFieldKey;
  standardHeader: string;
  aliases: string[];
  requiredLevel: FieldMappingDecisionV2['requiredLevel'];
  label: string;
  standardUnit: UnitDecisionV2['standardUnit'];
};

export const IMPORT_TARGET_DEFINITIONS: readonly TargetDefinition[] = [
  {
    targetField: 'pointName',
    standardHeader: 'PointName',
    aliases: ['point', 'testpoint', 'testpointname', 'pointid', '点位', '点号'],
    requiredLevel: 'optional',
    label: 'PointName',
    standardUnit: 'text',
  },
  {
    targetField: 'depthM',
    standardHeader: 'Depth(m)',
    aliases: ['depth', 'depthm', 'depthcm', 'depthmm', 'z', 'depthmeter', 'depthmetre', '深度', '深度m'],
    requiredLevel: 'required',
    label: 'DepthM',
    standardUnit: 'm',
  },
  {
    targetField: 'qc',
    standardHeader: 'qc(MPa)',
    aliases: ['qc', 'qckpa', 'qcmpa', 'cone', 'coneresistance', '锥尖阻力'],
    requiredLevel: 'required',
    label: '锥尖阻力 qc',
    standardUnit: 'kPa',
  },
  {
    targetField: 'qt',
    standardHeader: 'QtKpa',
    aliases: ['qt', 'qtmpa'],
    requiredLevel: 'optional',
    label: 'Qt',
    standardUnit: 'kPa',
  },
  {
    targetField: 'fs',
    standardHeader: 'fs(kPa)',
    aliases: ['fs', 'fskpa', 'fsmpa', 'sleeve', 'sleevekpa', 'sleevefriction', '侧壁摩阻力', '侧摩阻力'],
    requiredLevel: 'required',
    label: 'Fs',
    standardUnit: 'kPa',
  },
  {
    targetField: 'u2',
    standardHeader: 'u2(kPa)',
    aliases: ['u2', 'u2kpa', 'u2mpa', 'porepressure', '孔压', '孔隙水压力'],
    requiredLevel: 'optional',
    label: 'U2',
    standardUnit: 'kPa',
  },
  {
    targetField: 'fr',
    standardHeader: 'FrPercent',
    aliases: ['fr', 'frpct', 'frratio'],
    requiredLevel: 'optional',
    label: 'Fr',
    standardUnit: '%',
  },
  {
    targetField: 'waterDepth',
    standardHeader: 'WaterDepthM',
    aliases: ['waterdepth', 'waterdepthcm', 'waterdepthmm'],
    requiredLevel: 'optional',
    label: 'WaterDepthM',
    standardUnit: 'm',
  },
  {
    targetField: 'finalDepth',
    standardHeader: 'FinalDepthM',
    aliases: ['finaldepth', 'finaldepthcm', 'finaldepthmm', 'holedpthm', 'holedepthm'],
    requiredLevel: 'optional',
    label: 'FinalDepthM',
    standardUnit: 'm',
  },
] as const;

const initialRevisions: RevisionVector = {
  source: 1,
  mapping: 1,
  unit: 1,
  normalization: 1,
  pointPlan: 1,
};

const legacyKeyByTarget: Record<TargetFieldKey, string> = {
  pointName: 'pointName',
  depthM: 'depthM',
  qc: 'qcKpa',
  qt: 'qtKpa',
  fs: 'fsKpa',
  u2: 'u2Kpa',
  fr: 'frPercent',
  waterDepth: 'waterDepthM',
  finalDepth: 'finalDepthM',
};

export type CreateCsvImportPipelineOptions = {
  batchId: string;
  operationId: string;
  baseWorkspaceRevision?: number;
  sourceRevision?: number;
  fileName: string;
  text: string;
  currentPointName: string;
  defaultWaterDepthM: number;
  defaultFinalDepthM: number;
  allowAnyPoint?: boolean;
  pointAttribution?: PointAttributionDecisionV2 | null;
  sourceAttachment?: RawImportDataBlockV2['sourceAttachment'];
  existingPoints?: Array<{ pointId: string; pointName: string; aliases?: string[] }>;
  now?: string;
};

export type CreateTabularImportPipelineOptions = Omit<CreateCsvImportPipelineOptions, 'text'> & {
  sourceFingerprint: string;
  sourceKind: 'csv' | 'excel';
  headers: string[];
  rows: string[][];
  displayRowNumbers?: number[];
  sourceProblems?: ImportDraftProblem[];
  sourceSheetName?: string;
  sourceHeaderRow?: number;
  sourceWorkbookSheets?: Array<{ sheetName: string; rowCount: number; columnCount: number; state: string }>;
  sourceParseDurationMs?: number;
  sourceOriginalFileSize?: number;
  sourceWorkbookExtraction?: RawImportDataBlockV2['workbookExtraction'];
  sourceColumnOrigins?: Record<string, NonNullable<SourceColumnV2['extractionOrigin']>>;
};

export async function createCsvImportPipeline(options: CreateCsvImportPipelineOptions): Promise<CsvImportPipelineV2> {
  const sourceFingerprint = await sha256Hex(options.text);
  const sourceRevision = options.sourceRevision ?? initialRevisions.source;
  const sourceIdentity = sourceFingerprint.slice(0, 12);
  const parsed = parseCsvSource(options.text, options.batchId, sourceRevision, sourceIdentity);
  return initializeTabularImportPipeline({
    ...options,
    sourceFingerprint,
    sourceKind: 'csv',
    headers: parsed.headers,
    sourceRows: parsed.sourceRows,
    sourceColumns: parsed.sourceColumns,
    sourceProblems: parsed.problems,
  });
}

export async function createTabularImportPipeline(options: CreateTabularImportPipelineOptions): Promise<CsvImportPipelineV2> {
  const sourceRevision = options.sourceRevision ?? initialRevisions.source;
  const sourceIdentity = options.sourceFingerprint.slice(0, 12);
  const sourceRows: SourceRowV2[] = options.rows.map((cells, sourceIndex) => ({
    rowId: `${options.batchId}:source:${sourceRevision}:${sourceIdentity}:row:${sourceIndex}`,
    sourceIndex,
    displayRowNumber: options.displayRowNumbers?.[sourceIndex] ?? sourceIndex + 2,
    cells: [...cells],
  }));
  const sourceColumns = createSourceColumnsV2(options.batchId, sourceRevision, options.headers, options.rows, sourceIdentity)
    .map((column) => ({ ...column, extractionOrigin: options.sourceColumnOrigins?.[column.header] }));
  return initializeTabularImportPipeline({ ...options, sourceRows, sourceColumns, sourceProblems: options.sourceProblems ?? [] });
}

function initializeTabularImportPipeline(options: Omit<CreateTabularImportPipelineOptions, 'rows' | 'displayRowNumbers'> & { sourceRows: SourceRowV2[]; sourceColumns: SourceColumnV2[] }) {
  const sourceRevision = options.sourceRevision ?? initialRevisions.source;
  const sourceProblems = options.sourceProblems ?? [];
  const mappings = createInitialFieldMappings(options.sourceColumns, options.now ?? new Date().toISOString());
  const unitDecisions = createUnitDecisions(options.sourceColumns, mappings, options.sourceRows.map((row) => row.cells));
  return recomputePipeline({
    batchId: options.batchId,
    operationId: options.operationId,
    baseWorkspaceRevision: options.baseWorkspaceRevision ?? 0,
    sourceFingerprint: options.sourceFingerprint,
    fileName: options.fileName,
    sourceKind: options.sourceKind,
    sourceSheetName: options.sourceSheetName,
    sourceHeaderRow: options.sourceHeaderRow,
    sourceWorkbookSheets: options.sourceWorkbookSheets,
    sourceParseDurationMs: options.sourceParseDurationMs,
    sourceOriginalFileSize: options.sourceOriginalFileSize,
    sourceWorkbookExtraction: options.sourceWorkbookExtraction,
    sourceAttachment: options.sourceAttachment ? { ...options.sourceAttachment, bytes: [...options.sourceAttachment.bytes] } : undefined,
    headers: options.headers,
    sourceRows: options.sourceRows,
    sourceColumns: options.sourceColumns,
    sourceValueOverrides: [],
    sourceProblems,
    mappings,
    unitDecisions,
    pointAttribution: options.pointAttribution ?? getDefaultPointAttribution(options, mappings, options.sourceColumns),
    normalizedRows: [],
    rows: [],
    pointPlan: emptyPointPlan(),
    problems: sourceProblems,
    readiness: emptyReadiness(),
    revisions: { ...initialRevisions, source: sourceRevision },
  }, options);
}

export function restoreCsvImportPipeline(options: {
  batch: ImportBatchDraftV2;
  rawBlock: RawImportDataBlockV2;
  context: PipelineContext;
  baseWorkspaceRevision: number;
}) {
  const { batch, rawBlock, context } = options;
  if (rawBlock.completeness !== 'full') return null;
  const references = rawBlock.rowReferences;
  const sourceRows: SourceRowV2[] = rawBlock.rows.map((cells, sourceIndex) => ({
    rowId: references?.[sourceIndex]?.sourceRowId
      ?? `${batch.batchId}:source:${batch.revisions.source}:${batch.sourceFingerprint.slice(0, 12)}:row:${sourceIndex}`,
    sourceIndex: references?.[sourceIndex]?.sourceIndex ?? sourceIndex,
    displayRowNumber: references?.[sourceIndex]?.displayRowNumber ?? sourceIndex + 2,
    cells: [...cells],
  }));
  const sourceProblems = batch.problems
    .filter((problemValue) => ['DI-E04', 'DI-N01'].includes(problemValue.eventId))
    .map((problemValue) => ({ ...problemValue }));
  return recomputePipeline({
    batchId: batch.batchId,
    operationId: batch.operationId,
    baseWorkspaceRevision: options.baseWorkspaceRevision,
    sourceFingerprint: batch.sourceFingerprint,
    fileName: batch.source.fileName,
    sourceKind: batch.source.mode === 'uploaded-excel' ? 'excel' : 'csv',
    sourceSheetName: batch.source.sheetName,
    sourceHeaderRow: batch.source.headerRow,
    sourceWorkbookSheets: batch.source.workbookSheets,
    sourceParseDurationMs: batch.source.parseDurationMs,
    sourceOriginalFileSize: batch.source.originalFileSize,
    sourceWorkbookExtraction: rawBlock.workbookExtraction ? structuredClone(rawBlock.workbookExtraction) : undefined,
    sourceAttachment: rawBlock.sourceAttachment ? { ...rawBlock.sourceAttachment, bytes: [...rawBlock.sourceAttachment.bytes] } : undefined,
    headers: [...batch.sourceColumns]
      .sort((left, right) => left.sourceIndex - right.sourceIndex)
      .map((column) => column.header),
    sourceRows,
    sourceColumns: batch.sourceColumns.map((column) => ({
      ...column,
      sampleValues: [...column.sampleValues],
      mappingCandidates: column.mappingCandidates.map((candidate) => ({ ...candidate })),
    })),
    sourceValueOverrides: (batch.sourceValueOverrides ?? []).map((override) => ({
      ...override,
      proposedAt: override.proposedAt ?? override.confirmedAt ?? batch.createdAt,
      confirmedAt: override.confirmedAt ?? null,
    })),
    sourceProblems,
    mappings: batch.mappings.map((mapping) => ({ ...mapping })),
    unitDecisions: batch.unitDecisions.map((decision) => ({
      ...decision,
      conversion: decision.conversion ? { ...decision.conversion } : null,
    })),
    pointAttribution: batch.pointAttribution ? { ...batch.pointAttribution } : null,
    normalizedRows: [],
    rows: [],
    pointPlan: {
      ...batch.pointPlan,
      detectedPoints: batch.pointPlan.detectedPoints.map((point) => ({ ...point })),
      selectedPointKeys: [...batch.pointPlan.selectedPointKeys],
      conflicts: batch.pointPlan.conflicts.map((conflict) => ({ ...conflict })),
      targetDecisions: batch.pointPlan.targetDecisions?.map((decision) => ({ ...decision })),
      executions: batch.pointPlan.executions.map((execution) => ({ ...execution })),
    },
    problems: [],
    readiness: emptyReadiness(),
    revisions: { ...batch.revisions },
  }, context);
}

export async function replaceCsvImportSource(
  pipeline: CsvImportPipelineV2,
  options: Omit<CreateCsvImportPipelineOptions, 'batchId' | 'baseWorkspaceRevision' | 'sourceRevision'>,
) {
  const replaced = await createCsvImportPipeline({
    ...options,
    batchId: pipeline.batchId,
    baseWorkspaceRevision: pipeline.baseWorkspaceRevision,
    sourceRevision: pipeline.revisions.source + 1,
  });
  return {
    ...replaced,
    revisions: {
      source: pipeline.revisions.source + 1,
      mapping: pipeline.revisions.mapping + 1,
      unit: pipeline.revisions.unit + 1,
      normalization: pipeline.revisions.normalization + 1,
      pointPlan: pipeline.revisions.pointPlan + 1,
    },
  };
}

export function parseCsvSource(text: string, batchId: string, sourceRevision: number, sourceIdentity?: string) {
  const problems: ImportDraftProblem[] = [];
  const parsed = parseDelimitedText(text);
  const table = parsed.rows;
  if (parsed.unclosedQuotes) {
    problems.push(problem({
      problemId: 'malformed-csv-quotes',
      eventId: 'DI-E04',
      severity: 'issue',
      title: 'CSV 引号没有闭合',
      message: '文件中存在没有闭合的引号，无法可靠识别表格边界。',
      action: '修正 CSV 引号后重新上传。',
    }));
  }

  const headers = (table[0]?.cells ?? []).map((header) => header.trim());
  const records = table.slice(1).filter((candidate) => candidate.cells.some((value) => value.trim().length > 0));
  if (!headers.length || !records.length) {
    problems.push(problem({
      problemId: 'empty-csv',
      eventId: 'DI-E04',
      severity: 'issue',
      title: 'CSV 缺少表头或数据行',
      message: 'CSV 至少需要标准表头和一行数据，当前不能用于数据检查。',
      action: '下载空模板或示例模板，补齐字段后重新上传。',
    }));
  }

  const sourceRows: SourceRowV2[] = records.map((record, sourceIndex) => ({
    rowId: `${batchId}:source:${sourceRevision}${sourceIdentity ? `:${sourceIdentity}` : ''}:row:${sourceIndex}`,
    sourceIndex,
    displayRowNumber: record.lineNumber,
    cells: record.cells.map((value) => value),
  }));
  const sourceColumns = createSourceColumnsV2(batchId, sourceRevision, headers, sourceRows.map((sourceRow) => sourceRow.cells), sourceIdentity);

  return { headers, sourceRows, sourceColumns, problems };
}

export function createSourceColumnsV2(
  batchId: string,
  sourceRevision: number,
  headers: string[],
  rows: string[][],
  sourceIdentity?: string,
) {
  return headers.map((header, sourceIndex): SourceColumnV2 => {
    const sampleValues = rows.map((sourceRow) => sourceRow[sourceIndex] ?? '').filter(Boolean).slice(0, 8);
    const normalizedHeader = normalizeImportHeader(header);
    return {
      columnId: `${batchId}:source:${sourceRevision}${sourceIdentity ? `:${sourceIdentity}` : ''}:column:${sourceIndex}`,
      sourceIndex,
      header,
      normalizedHeader,
      sampleValues,
      inferredValueType: inferValueType(sampleValues),
      mappingCandidates: getMappingCandidates(normalizedHeader, sampleValues),
    };
  });
}

export function createInitialFieldMappings(sourceColumns: SourceColumnV2[], confirmedAt: string) {
  return IMPORT_TARGET_DEFINITIONS.map((definition): FieldMappingDecisionV2 => {
    if (['qt', 'fr', 'waterDepth', 'finalDepth'].includes(definition.targetField)) {
      return mappingDecision(definition, null, 'unmapped', 'none', 'none', 'missing');
    }
    const standard = normalizeImportHeader(definition.standardHeader);
    const exactMatches = sourceColumns.filter((column) => column.normalizedHeader === standard);
    const aliasMatches = sourceColumns.filter((column) => definition.aliases.includes(column.normalizedHeader));
    if (exactMatches.length === 1) {
      return mappingDecision(definition, exactMatches[0], 'auto-exact', 'standard-header', 'high', 'confirmed', confirmedAt);
    }
    if (exactMatches.length > 1 || aliasMatches.length > 1) {
      return mappingDecision(definition, null, 'unmapped', exactMatches.length ? 'standard-header' : 'alias-dictionary', 'medium', 'conflict');
    }
    if (aliasMatches.length === 1) {
      return mappingDecision(definition, aliasMatches[0], 'auto-alias', 'alias-dictionary', 'high', 'confirmed', confirmedAt);
    }
    return mappingDecision(definition, null, 'unmapped', 'none', 'none', 'missing');
  });
}

export function setFieldMapping(
  pipeline: CsvImportPipelineV2,
  targetField: TargetFieldKey,
  sourceColumnId: string,
  context: PipelineContext,
  now = new Date().toISOString(),
) {
  if (!pipeline.sourceColumns.some((column) => column.columnId === sourceColumnId)) return pipeline;
  const current = pipeline.mappings.find((mapping) => mapping.targetField === targetField);
  if (current?.sourceColumnId === sourceColumnId && current.state === 'confirmed') return pipeline;
  const mappings = pipeline.mappings.map((mapping): FieldMappingDecisionV2 => {
    if (mapping.targetField !== targetField) return mapping;
    return {
      ...mapping,
      sourceColumnId,
      decisionSource: 'user',
      suggestionSource: 'none',
      confidence: 'high',
      state: 'confirmed',
      confirmedAt: now,
      confirmedRevision: pipeline.revisions.mapping + 1,
    };
  });
  const conflicted = markDuplicateSourceConflicts(restoreNonDuplicateStates(mappings));
  const unitDecisions = mergeUnitDecisions(pipeline, conflicted);
  return recomputeAfterDecision(pipeline, { mappings: conflicted, unitDecisions }, context, 'mapping');
}

export function confirmFieldMapping(
  pipeline: CsvImportPipelineV2,
  targetField: TargetFieldKey,
  context: PipelineContext,
  now = new Date().toISOString(),
) {
  const current = pipeline.mappings.find((mapping) => mapping.targetField === targetField);
  if (!current?.sourceColumnId || current.state === 'confirmed') return pipeline;
  return setFieldMapping(pipeline, targetField, current.sourceColumnId, context, now);
}

export function clearFieldMapping(
  pipeline: CsvImportPipelineV2,
  targetField: TargetFieldKey,
  context: PipelineContext,
) {
  const current = pipeline.mappings.find((mapping) => mapping.targetField === targetField);
  if (!current || (!current.sourceColumnId && current.state === 'missing')) return pipeline;
  const mappings = pipeline.mappings.map((mapping): FieldMappingDecisionV2 =>
    mapping.targetField === targetField
      ? { ...mapping, sourceColumnId: null, decisionSource: 'unmapped', suggestionSource: 'none', confidence: 'none', state: 'missing', confirmedAt: undefined, confirmedRevision: undefined }
      : mapping,
  );
  const restored = restoreNonDuplicateStates(mappings);
  return recomputeAfterDecision(pipeline, { mappings: restored, unitDecisions: mergeUnitDecisions(pipeline, restored) }, context, 'mapping');
}

export function resetFieldMappings(pipeline: CsvImportPipelineV2, context: PipelineContext, now = new Date().toISOString()) {
  const mappings = createInitialFieldMappings(pipeline.sourceColumns, now);
  if (stableStringify(mappings.map(mappingSemantics)) === stableStringify(pipeline.mappings.map(mappingSemantics))) return pipeline;
  return recomputeAfterDecision(pipeline, { mappings, unitDecisions: createUnitDecisions(pipeline.sourceColumns, mappings) }, context, 'mapping');
}

export function setUnitDecision(
  pipeline: CsvImportPipelineV2,
  targetField: TargetFieldKey,
  selectedUnit: string,
  context: PipelineContext,
) {
  const current = pipeline.unitDecisions.find((decision) => decision.targetField === targetField);
  if (!current) return pipeline;
  if (current.state === 'conflict') return pipeline;
  const conversion = getConversion(targetField, selectedUnit);
  if (!conversion) return pipeline;
  if (current.selectedUnit === selectedUnit && current.state === 'confirmed') return pipeline;
  const unitDecisions = pipeline.unitDecisions.map((decision): UnitDecisionV2 =>
    decision.targetField === targetField
      ? {
          ...decision,
          selectedUnit,
          decisionSource: 'user',
          confidence: 'high',
          state: 'confirmed',
          conversion,
        }
      : decision,
  );
  return recomputeAfterDecision(pipeline, { mappings: pipeline.mappings, unitDecisions }, context, 'unit');
}

export function setSourceValueOverrides(
  pipeline: CsvImportPipelineV2,
  overrides: SourceValueOverrideV1[],
  context: PipelineContext,
) {
  const uniqueCells = new Set<string>();
  for (const override of overrides) {
    const row = pipeline.sourceRows.find((candidate) => candidate.rowId === override.sourceRowId);
    const column = pipeline.sourceColumns.find((candidate) => candidate.columnId === override.sourceColumnId);
    if (!row || !column || row.displayRowNumber !== override.displayRowNumber) return pipeline;
    const current = row.cells[column.sourceIndex]?.trim() ?? '';
    if (!current || current !== override.originalValue.trim()) return pipeline;
    if (parseNumericCell(override.replacementValue) === null || !override.reason.trim()) return pipeline;
    const cellKey = `${override.sourceRowId}:${override.sourceColumnId}`;
    if (uniqueCells.has(cellKey)) return pipeline;
    uniqueCells.add(cellKey);
  }
  const nextOverrides = overrides.map((override) => ({
    ...override,
    originalValue: override.originalValue.trim(),
    replacementValue: override.replacementValue.trim(),
    reason: override.reason.trim().slice(0, 240),
  }));
  if (stableStringify(nextOverrides) === stableStringify(pipeline.sourceValueOverrides)) return pipeline;
  const previousNormalization = stableStringify(pipeline.normalizedRows);
  const previousPlan = stableStringify(pipeline.pointPlan);
  const preliminary = recomputePipeline({ ...pipeline, sourceValueOverrides: nextOverrides }, context);
  const rowsChanged = stableStringify(preliminary.normalizedRows) !== previousNormalization;
  const planChanged = stableStringify(preliminary.pointPlan) !== previousPlan;
  return {
    ...preliminary,
    revisions: {
      ...pipeline.revisions,
      normalization: pipeline.revisions.normalization + (rowsChanged ? 1 : 0),
      pointPlan: pipeline.revisions.pointPlan + (planChanged ? 1 : 0),
    },
  };
}

export function setPointSplitPlan(
  pipeline: CsvImportPipelineV2,
  strategy: 'split-all' | 'split-selected' | 'cancelled',
  selectedPointKeys: string[],
  context: PipelineContext,
) {
  if (strategy === 'cancelled') {
    if (pipeline.pointPlan.state === 'cancelled') return pipeline;
    const pointPlan: PointSplitPlanV2 = {
      ...pipeline.pointPlan,
      strategy: 'cancelled',
      state: 'cancelled',
      selectedPointKeys: [...pipeline.pointPlan.selectedPointKeys],
      targetDecisions: pipeline.pointPlan.targetDecisions?.map((decision) => ({ ...decision })),
      executions: pipeline.pointPlan.executions.map((execution) => ({ ...execution })),
    };
    return {
      ...pipeline,
      pointPlan,
      readiness: getReadiness(
        pipeline.mappings,
        pipeline.unitDecisions,
        pipeline.pointAttribution,
        pointPlan,
        pipeline.problems,
        pipeline.rows,
      ),
    };
  }
  const detectedKeys = pipeline.pointPlan.detectedPoints.map((point) => point.pointKey);
  const selected = strategy === 'split-all'
    ? detectedKeys
    : uniqueBy(selectedPointKeys.map(normalizePointKey).filter((key) => detectedKeys.includes(key)), (key) => key);
  const nextSelection = selected;
  if (
    pipeline.pointPlan.strategy === strategy
    && stableStringify(pipeline.pointPlan.selectedPointKeys) === stableStringify(nextSelection)
  ) return pipeline;
  if (strategy === 'split-selected' && !nextSelection.length) return pipeline;

  const nextBase: CsvImportPipelineV2 = {
    ...pipeline,
    pointPlan: {
      ...pipeline.pointPlan,
      strategy,
      selectedPointKeys: nextSelection,
      state: pipeline.pointPlan.state,
    },
  };
  const recomputed = recomputePipeline(nextBase, context);
  return {
    ...recomputed,
    revisions: { ...pipeline.revisions, pointPlan: pipeline.revisions.pointPlan + 1 },
  };
}

export function setPointTargetDecision(
  pipeline: CsvImportPipelineV2,
  detectedPointKey: string,
  action: Exclude<PointTargetDecisionV2['action'], 'pending'>,
  options: { targetPointId?: string; proposedPointName?: string } | undefined,
  context: PipelineContext,
) {
  const pointKey = normalizePointKey(detectedPointKey);
  const detectedPoint = pipeline.pointPlan.detectedPoints.find((point) => point.pointKey === pointKey);
  if (!detectedPoint) return pipeline;
  const currentDecision = pipeline.pointPlan.targetDecisions?.find((decision) => decision.detectedPointKey === pointKey);
  const existingPoint = options?.targetPointId
    ? context.existingPoints?.find((point) => point.pointId === options.targetPointId)
    : pipeline.pointPlan.conflicts.find((conflict) => conflict.detectedPointKey === pointKey)
      ? context.existingPoints?.find((point) => point.pointId === pipeline.pointPlan.conflicts.find((conflict) => conflict.detectedPointKey === pointKey)?.existingPointId)
      : undefined;
  const proposedPointName = (options?.proposedPointName ?? detectedPoint.pointName).trim();
  let reasonCode: PointTargetDecisionV2['reasonCode'];
  const targetAlreadyUsed = existingPoint && (pipeline.pointPlan.targetDecisions ?? []).some((decision) =>
    decision.detectedPointKey !== pointKey
    && decision.state === 'confirmed'
    && ['append-draft', 'replace-active-draft'].includes(decision.action)
    && decision.targetPointId === existingPoint.pointId,
  );

  if (['append-draft', 'replace-active-draft'].includes(action) && !existingPoint) {
    reasonCode = options?.targetPointId ? 'POINT-TARGET-NOT-FOUND' : 'POINT-TARGET-REQUIRED';
  } else if (['append-draft', 'replace-active-draft'].includes(action) && targetAlreadyUsed) {
    reasonCode = 'POINT-TARGET-DUPLICATE';
  } else if (['create-point', 'rename-and-create'].includes(action) && !proposedPointName) {
    reasonCode = 'POINT-NAME-REQUIRED';
  } else if (
    ['create-point', 'rename-and-create'].includes(action)
    && pointNameConflicts(proposedPointName, context, pipeline.pointPlan.targetDecisions ?? [], pointKey)
  ) {
    reasonCode = 'POINT-NAME-CONFLICT';
  }

  const nextDecision: PointTargetDecisionV2 = {
    detectedPointKey: pointKey,
    action,
    state: reasonCode ? 'conflict' : 'confirmed',
    targetPointId: ['append-draft', 'replace-active-draft'].includes(action) ? existingPoint?.pointId : undefined,
    proposedPointName: ['create-point', 'rename-and-create'].includes(action) ? proposedPointName : detectedPoint.pointName,
    expectedActiveDraftId: action === 'replace-active-draft' ? existingPoint?.activeImportDraftId ?? undefined : undefined,
    reasonCode,
  };
  if (stableStringify(currentDecision) === stableStringify(nextDecision)) return pipeline;

  const existingDecisions = pipeline.pointPlan.targetDecisions ?? [];
  const nextBase: CsvImportPipelineV2 = {
    ...pipeline,
    pointPlan: {
      ...pipeline.pointPlan,
      targetDecisions: pipeline.pointPlan.detectedPoints.map((point) =>
        point.pointKey === pointKey
          ? nextDecision
          : existingDecisions.find((decision) => decision.detectedPointKey === point.pointKey)
            ?? { detectedPointKey: point.pointKey, action: 'pending', state: 'pending', proposedPointName: point.pointName },
      ),
    },
  };
  const recomputed = recomputePipeline(nextBase, context);
  return {
    ...recomputed,
    revisions: { ...pipeline.revisions, pointPlan: pipeline.revisions.pointPlan + 1 },
  };
}

export function setPointAttributionDecision(
  pipeline: CsvImportPipelineV2,
  pointAttribution: PointAttributionDecisionV2,
  context: PipelineContext,
) {
  if (
    pointAttribution.source === 'source-column'
    && !pipeline.sourceColumns.some((column) => column.columnId === pointAttribution.sourceColumnId)
  ) return pipeline;
  if (
    pointAttribution.source === 'existing-point'
    && !context.existingPoints?.some((point) => point.pointId === pointAttribution.pointId)
  ) return pipeline;
  if (stableStringify(pipeline.pointAttribution) === stableStringify(pointAttribution)) return pipeline;
  const recomputed = recomputePipeline({ ...pipeline, pointAttribution }, context);
  const normalizationChanged = stableStringify(recomputed.normalizedRows) !== stableStringify(pipeline.normalizedRows);
  return {
    ...recomputed,
    revisions: {
      ...pipeline.revisions,
      normalization: pipeline.revisions.normalization + (normalizationChanged ? 1 : 0),
      pointPlan: pipeline.revisions.pointPlan + 1,
    },
  };
}

export function isCurrentImportOperation(activeOperationId: string, completedOperationId: string) {
  return activeOperationId === completedOperationId;
}

export function acceptImportOperationResult(
  pipeline: CsvImportPipelineV2,
  current: { activeOperationId: string | null; workspaceRevision?: number },
): { accepted: true; pipeline: CsvImportPipelineV2 } | { accepted: false; reason: 'obsolete-operation' | 'workspace-revision-changed' } {
  if (!current.activeOperationId || current.activeOperationId !== pipeline.operationId) {
    return { accepted: false, reason: 'obsolete-operation' };
  }
  if (
    current.workspaceRevision !== undefined
    && pipeline.baseWorkspaceRevision > 0
    && current.workspaceRevision !== pipeline.baseWorkspaceRevision
  ) {
    return { accepted: false, reason: 'workspace-revision-changed' };
  }
  return { accepted: true, pipeline };
}

export function createUnitDecisions(
  sourceColumns: SourceColumnV2[],
  mappings: FieldMappingDecisionV2[],
  rows?: string[][],
) {
  return mappings.flatMap((mapping): UnitDecisionV2[] => {
    if (!mapping.sourceColumnId) return [];
    const source = sourceColumns.find((column) => column.columnId === mapping.sourceColumnId);
    if (!source) return [];
    const definition = getDefinition(mapping.targetField);
    if (mapping.targetField === 'pointName') {
      return [{
        targetField: mapping.targetField,
        sourceColumnId: source.columnId,
        detectedUnit: null,
        selectedUnit: null,
        standardUnit: 'text',
        decisionSource: 'not-applicable',
        confidence: 'high',
        state: 'not-applicable',
        conversion: null,
      }];
    }
    const values = rows?.map((row) => row[source.sourceIndex] ?? '') ?? source.sampleValues;
    const sampledUnits = detectCellUnits(values, mapping.targetField);
    const headerUnit = detectHeaderUnit(source.header, mapping.targetField);
    const sampledUnitUnsupported = ['single', 'partial'].includes(sampledUnits.state)
      && sampledUnits.unit !== null
      && !getConversion(mapping.targetField, sampledUnits.unit);
    const headerCellConflict = headerUnit.state === 'supported'
      && ['single', 'partial'].includes(sampledUnits.state)
      && sampledUnits.unit !== null
      && headerUnit.unit !== sampledUnits.unit;
    if (sampledUnits.state === 'mixed' || sampledUnitUnsupported || headerCellConflict || headerUnit.state === 'unsupported') {
      return [{
        targetField: mapping.targetField,
        sourceColumnId: source.columnId,
        detectedUnit: headerUnit.unit,
        selectedUnit: null,
        standardUnit: definition.standardUnit,
        decisionSource: 'header',
        confidence: 'none',
        state: 'conflict',
        conversion: null,
      }];
    }
    if (headerUnit.state === 'none' && sampledUnits.state === 'partial') {
      return [{
        targetField: mapping.targetField,
        sourceColumnId: source.columnId,
        detectedUnit: sampledUnits.unit,
        selectedUnit: null,
        standardUnit: definition.standardUnit,
        decisionSource: 'value-range',
        confidence: 'none',
        state: 'conflict',
        conversion: null,
      }];
    }
    const explicitUnit = headerUnit.unit ?? (sampledUnits.state === 'single' ? sampledUnits.unit : null);
    const conversion = explicitUnit ? getConversion(mapping.targetField, explicitUnit) : null;
    if (explicitUnit && conversion) {
      return [{
        targetField: mapping.targetField,
        sourceColumnId: source.columnId,
        detectedUnit: explicitUnit,
        selectedUnit: explicitUnit,
        standardUnit: definition.standardUnit,
        decisionSource: 'header',
        confidence: 'high',
        state: 'confirmed',
        conversion,
      }];
    }
    const inferred = inferUnitFromValues(mapping.targetField, values);
    return [{
      targetField: mapping.targetField,
      sourceColumnId: source.columnId,
      detectedUnit: inferred,
      selectedUnit: null,
      standardUnit: definition.standardUnit,
      decisionSource: 'value-range',
      confidence: inferred ? 'low' : 'none',
      state: 'needs-confirmation',
      conversion: null,
    }];
  });
}

export function getImportHeaderMatches(headers: string[]) {
  const normalized = headers.map((header) => normalizeImportHeader(header));
  return Object.fromEntries(IMPORT_TARGET_DEFINITIONS.map((definition) => {
    const standard = normalizeImportHeader(definition.standardHeader);
    const index = normalized.findIndex((header) => header === standard || definition.aliases.includes(header));
    return [definition.targetField, index >= 0 ? headers[index] : ''];
  })) as Record<TargetFieldKey, string>;
}

export function getImportFieldLabel(field: TargetFieldKey | string) {
  const byLegacyKey = IMPORT_TARGET_DEFINITIONS.find((definition) => legacyKeyByTarget[definition.targetField] === field);
  return IMPORT_TARGET_DEFINITIONS.find((definition) => definition.targetField === field)?.label ?? byLegacyKey?.label ?? field;
}

export function getSupportedSourceUnits(targetField: TargetFieldKey) {
  if (isLength(targetField)) return ['m', 'cm', 'mm'];
  if (isPressure(targetField)) return ['kPa', 'MPa'];
  if (targetField === 'fr') return ['%', 'ratio'];
  return [];
}

export function previewSourceUnitConversion(targetField: TargetFieldKey, rawValue: string, sourceUnit: string) {
  const value = parseNumericCell(rawValue);
  const conversion = getConversion(targetField, sourceUnit);
  if (value === null || !conversion) return null;
  const normalizedValue = value * conversion.scale + conversion.offset;
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

export function projectPipelineToLegacyDraft(
  pipeline: CsvImportPipelineV2,
  options: {
    currentPointName: string;
    defaultWaterDepthM: number;
    defaultFinalDepthM: number;
  },
): Omit<ImportDraft, 'version' | 'generatedAt'> {
  const projectedRows = getSelectedPointRows(pipeline);
  const projectedProblems = getBlockingProblemsForPointPlan(pipeline.problems, pipeline.pointPlan);
  const issues = projectedProblems.filter((candidate) => candidate.severity === 'issue');
  const pointIssue = issues.find((candidate) => candidate.eventId === 'DI-E10' || candidate.eventId === 'DI-E11');
  const status: ImportDraft['status'] = pointIssue ? 'needs-decision' : issues.length || !projectedRows.length ? 'error' : 'ready';
  const first = projectedRows[0];
  const selectedKeys = new Set(pipeline.pointPlan.selectedPointKeys);
  const names = pipeline.pointPlan.detectedPoints
    .filter((point) => !['split-all', 'split-selected'].includes(pipeline.pointPlan.strategy) || selectedKeys.has(point.pointKey))
    .map((point) => point.pointName);
  const pointName = first?.pointName || names[0] || options.currentPointName;
  const selectedNormalizedRow = pipeline.normalizedRows.find((row) =>
    !selectedKeys.size || selectedKeys.has(row.detectedPointKey),
  ) ?? pipeline.normalizedRows[0];
  return {
    sourceMode: pipeline.sourceKind === 'excel' ? 'uploaded-excel' : 'uploaded-csv',
    fileName: pipeline.fileName,
    fileType: pipeline.sourceKind === 'excel' ? 'Excel' : 'CSV',
    sourceFingerprint: pipeline.sourceFingerprint,
    operationId: pipeline.operationId,
    excelSource: pipeline.sourceKind === 'excel' && pipeline.sourceSheetName && pipeline.sourceHeaderRow
      ? {
          sheetName: pipeline.sourceSheetName,
          headerRow: pipeline.sourceHeaderRow,
          workbookSheets: pipeline.sourceWorkbookSheets?.map((sheet) => ({ ...sheet })) ?? [],
          parseDurationMs: pipeline.sourceParseDurationMs ?? 0,
          originalFileSize: pipeline.sourceOriginalFileSize ?? 0,
        }
      : undefined,
    status,
    message: status === 'ready'
      ? `${pipeline.sourceKind === 'excel' ? 'Excel' : 'CSV'} 已解析为导入草稿，字段和单位已经通过当前导入规则。`
      : status === 'needs-decision'
        ? `${pipeline.sourceKind === 'excel' ? 'Excel' : 'CSV'} 已解析，但需要先确认点位归属。`
        : issues[0]?.title ?? `${pipeline.sourceKind === 'excel' ? 'Excel' : 'CSV'} 已解析，但存在需要处理的问题。`,
    headers: pipeline.headers,
    rawPreview: pipeline.sourceRows.slice(0, 5).map((row) => [...row.cells]),
    rawRows: pipeline.sourceRows.map((row) => [...row.cells]),
    rows: projectedRows,
    valueProvenance: selectedNormalizedRow
      ? Object.fromEntries(Object.entries(selectedNormalizedRow.values).map(([field, value]) => [field, {
          origin: value.origin,
          sourceColumnId: value.sourceColumnId,
          derivedFrom: value.derivedFrom ? [...value.derivedFrom] : undefined,
          defaultReason: value.defaultReason,
          sourceUnit: value.sourceUnit,
          standardUnit: value.standardUnit,
        }]))
      : undefined,
    problems: projectedProblems,
    pointName,
    filePointNames: names.length ? names : [pointName],
    pointDecision: status === 'needs-decision' ? 'pending' : 'matches-current',
    waterDepthM: first?.waterDepthM ?? options.defaultWaterDepthM,
    finalDepthM: first?.finalDepthM ?? options.defaultFinalDepthM,
  };
}

export type PipelineContext = {
  currentPointName: string;
  defaultWaterDepthM: number;
  defaultFinalDepthM: number;
  allowAnyPoint?: boolean;
  existingPoints?: Array<{
    pointId: string;
    pointName: string;
    aliases?: string[];
    activeImportDraftId?: string | null;
  }>;
};

function recomputeAfterDecision(
  pipeline: CsvImportPipelineV2,
  decisions: Pick<CsvImportPipelineV2, 'mappings' | 'unitDecisions'>,
  context: PipelineContext,
  changed: 'mapping' | 'unit',
) {
  const previousNormalization = stableStringify(pipeline.normalizedRows);
  const previousPlan = stableStringify(pipeline.pointPlan);
  const pointAttribution = pipeline.pointAttribution?.source === 'constant-name' || pipeline.pointAttribution?.source === 'existing-point'
    ? pipeline.pointAttribution
    : getSourcePointAttribution(decisions.mappings, pipeline.sourceColumns);
  const nextBase = { ...pipeline, ...decisions, pointAttribution };
  const preliminary = recomputePipeline(nextBase, context);
  const rowsChanged = stableStringify(preliminary.normalizedRows) !== previousNormalization;
  const planChanged = stableStringify(preliminary.pointPlan) !== previousPlan;
  return {
    ...preliminary,
    revisions: {
      ...pipeline.revisions,
      [changed]: pipeline.revisions[changed] + 1,
      normalization: pipeline.revisions.normalization + (rowsChanged ? 1 : 0),
      pointPlan: pipeline.revisions.pointPlan + (planChanged ? 1 : 0),
    },
  };
}

function recomputePipeline(
  base: CsvImportPipelineV2,
  context: PipelineContext,
): CsvImportPipelineV2 {
  const parseProblems = base.sourceProblems;
  const decisionProblems = getDecisionProblems(base.mappings, base.unitDecisions, base.pointAttribution);
  const canNormalize = ![...parseProblems, ...decisionProblems].some((candidate) => candidate.severity === 'issue');
  const normalized = canNormalize
    ? normalizeRows(base.sourceRows, base.sourceColumns, base.sourceValueOverrides, base.mappings, base.unitDecisions, base.pointAttribution, context)
    : { normalizedRows: [] as NormalizedSourceRowV2[], rows: [] as SyntheticCptuRow[], problems: [] as ImportDraftProblem[] };
  const pointResult = validatePoints(normalized.rows, normalized.normalizedRows, context, base.pointAttribution);
  const problems = deduplicateProblems([...parseProblems, ...decisionProblems, ...normalized.problems, ...pointResult.problems]);
  const pointPlan = finalizePointPlan(base.pointPlan, pointResult.pointPlan, problems, base.sourceFingerprint);
  const blockingProblems = getBlockingProblemsForPointPlan(problems, pointPlan);
  const readiness = getReadiness(base.mappings, base.unitDecisions, base.pointAttribution, pointPlan, blockingProblems, normalized.rows);
  return {
    ...base,
    normalizedRows: normalized.normalizedRows,
    rows: normalized.rows,
    pointPlan,
    problems,
    readiness,
  };
}

function normalizeRows(
  sourceRows: SourceRowV2[],
  sourceColumns: SourceColumnV2[],
  sourceValueOverrides: SourceValueOverrideV1[],
  mappings: FieldMappingDecisionV2[],
  unitDecisions: UnitDecisionV2[],
  pointAttribution: PointAttributionDecisionV2 | null,
  context: PipelineContext,
) {
  const problems: ImportDraftProblem[] = [];
  const overrideByCell = new Map(
    sourceValueOverrides.map((override) => [`${override.sourceRowId}:${override.sourceColumnId}`, override]),
  );
  const normalizedRows = sourceRows.map((sourceRow): NormalizedSourceRowV2 => {
    const rowProblems: ImportDraftProblem[] = [];
    const values: Partial<Record<TargetFieldKey, NormalizedValueV2>> = {};
    const readTextValue = (target: TargetFieldKey) => {
      const mapping = confirmedMapping(mappings, target);
      const column = mapping ? sourceColumns.find((candidate) => candidate.columnId === mapping.sourceColumnId) : null;
      const rawValue = column ? sourceRow.cells[column.sourceIndex]?.trim() ?? '' : '';
      values[target] = {
        rawValue: rawValue || null,
        normalizedValue: rawValue || null,
        origin: rawValue ? 'source' : 'missing',
        sourceColumnId: column?.columnId,
        standardUnit: 'text',
      };
      return rawValue;
    };
    const readNumberValue = (target: TargetFieldKey) => {
      const mapping = confirmedMapping(mappings, target);
      const column = mapping ? sourceColumns.find((candidate) => candidate.columnId === mapping.sourceColumnId) : null;
      const unit = unitDecisions.find((candidate) => candidate.targetField === target && candidate.sourceColumnId === column?.columnId);
      if (!column || !unit?.conversion) return null;
      const rawValue = sourceRow.cells[column.sourceIndex]?.trim() ?? '';
      const override = overrideByCell.get(`${sourceRow.rowId}:${column.columnId}`);
      const effectiveValue = override?.replacementValue ?? rawValue;
      const parsed = parseNumericCell(effectiveValue);
      if (parsed === null) {
        rowProblems.push(nonNumericProblem(target, column, sourceRow, effectiveValue));
        values[target] = { rawValue: rawValue || null, normalizedValue: null, origin: 'missing', sourceColumnId: column.columnId, sourceUnit: unit.selectedUnit, standardUnit: unit.standardUnit };
        return null;
      }
      const normalizedValue = parsed * unit.conversion.scale + unit.conversion.offset;
      if (!Number.isFinite(normalizedValue)) {
        rowProblems.push(nonNumericProblem(target, column, sourceRow, effectiveValue, '换算结果超过有效数值范围'));
        values[target] = { rawValue, normalizedValue: null, origin: 'missing', sourceColumnId: column.columnId, sourceUnit: unit.selectedUnit, standardUnit: unit.standardUnit };
        return null;
      }
      values[target] = {
        rawValue,
        normalizedValue,
        origin: override ? 'assistant-cleanup' : 'source',
        sourceColumnId: column.columnId,
        sourceUnit: unit.selectedUnit,
        standardUnit: unit.standardUnit,
        defaultReason: override?.reason,
      };
      return normalizedValue;
    };

    const mappedSourcePointName = readTextValue('pointName');
    const sourcePointName = pointAttribution?.source === 'source-column' ? mappedSourcePointName : '';
    const pointName = sourcePointName || (pointAttribution?.source === 'source-column' ? '' : pointNameFromAttribution(context, pointAttribution));
    const depthM = readNumberValue('depthM');
    const qcKpa = readNumberValue('qc');
    const finalDepthSource = readNumberValue('finalDepth');
    const qtMapped = Boolean(confirmedMapping(mappings, 'qt'));
    const u2Mapped = Boolean(confirmedMapping(mappings, 'u2'));
    const frMapped = Boolean(confirmedMapping(mappings, 'fr'));
    const waterDepthMapped = Boolean(confirmedMapping(mappings, 'waterDepth'));
    const qtSource = readNumberValue('qt');
    const fsSource = readNumberValue('fs');
    const u2Source = readNumberValue('u2');
    const frSource = readNumberValue('fr');
    const waterDepthSource = readNumberValue('waterDepth');

    const qtKpa = qtSource ?? qcKpa;
    if (qtSource === null && qcKpa !== null && !qtMapped) values.qt = derivedValue(qcKpa, 'kPa', ['qc']);
    const fsKpa = fsSource ?? 0;
    const u2Kpa = u2Source ?? 0;
    if (u2Source === null && !u2Mapped) values.u2 = defaultedValue(0, 'kPa');
    const frPercent = frSource ?? (qtKpa && fsKpa ? Math.round((100 * fsKpa * 1000) / Math.max(1, qtKpa)) / 1000 : 0);
    if (frSource === null && !frMapped) values.fr = fsKpa && qtKpa ? derivedValue(frPercent, '%', ['fs', 'qt']) : defaultedValue(0, '%');
    const waterDepthM = waterDepthSource ?? context.defaultWaterDepthM;
    if (waterDepthSource === null && !waterDepthMapped) values.waterDepth = defaultedValue(context.defaultWaterDepthM, 'm');
    if (!sourcePointName && pointName && pointAttribution && pointAttribution.source !== 'source-column') {
      values.pointName = {
        rawValue: null,
        normalizedValue: pointName,
        origin: 'defaulted',
        standardUnit: 'text',
        defaultReason: pointAttribution.source === 'constant-name' ? '固定点位归属' : '已有点位归属',
      };
    }

    if (!pointName) {
      rowProblems.push(problem({
        problemId: `blank-point-${sourceRow.displayRowNumber}`,
        eventId: 'DI-E10',
        severity: 'issue',
        title: '点位名称为空',
        message: `第 ${sourceRow.displayRowNumber} 行没有可用的点位名称。`,
        action: '补充 PointName，或为本批次指定固定点位。',
        fieldName: 'PointName',
        rowIndex: sourceRow.displayRowNumber,
        evidence: '空值',
      }));
    }
    const finalDepthM = finalDepthSource ?? depthM;
    if (finalDepthSource === null && depthM !== null && !confirmedMapping(mappings, 'finalDepth')) {
      values.finalDepth = derivedValue(depthM, 'm', ['depthM']);
    }
    const requiredNumbers = [depthM, qcKpa, fsSource, finalDepthM];
    const rowValue = pointName && requiredNumbers.every((value) => value !== null)
      ? { pointName, depthM: depthM!, qcKpa: qcKpa!, qtKpa: qtKpa!, fsKpa, u2Kpa, frPercent, waterDepthM, finalDepthM: finalDepthM! }
      : null;
    const detectedPointKey = normalizePointKey(pointName);
    const locatedRowProblems = rowProblems.map((candidate) => ({ ...candidate, detectedPointKey }));
    problems.push(...locatedRowProblems);
    return {
      sourceRowId: sourceRow.rowId,
      displayRowNumber: sourceRow.displayRowNumber,
      detectedPointKey,
      values,
      row: rowValue,
      problems: locatedRowProblems,
    };
  });
  if (!confirmedMapping(mappings, 'finalDepth')) {
    const maxDepthByPoint = new Map<string, number>();
    normalizedRows.forEach((candidate) => {
      if (!candidate.row) return;
      maxDepthByPoint.set(candidate.detectedPointKey, Math.max(maxDepthByPoint.get(candidate.detectedPointKey) ?? Number.NEGATIVE_INFINITY, candidate.row.depthM));
    });
    normalizedRows.forEach((candidate) => {
      if (!candidate.row) return;
      const finalDepthM = maxDepthByPoint.get(candidate.detectedPointKey);
      if (!Number.isFinite(finalDepthM)) return;
      candidate.row = { ...candidate.row, finalDepthM: finalDepthM! };
      candidate.values.finalDepth = derivedValue(finalDepthM!, 'm', ['depthM']);
    });
  }
  return { normalizedRows, rows: normalizedRows.flatMap((candidate) => candidate.row ? [candidate.row] : []), problems };
}

function validatePoints(
  rows: SyntheticCptuRow[],
  normalizedRows: NormalizedSourceRowV2[],
  context: PipelineContext,
  pointAttribution: PointAttributionDecisionV2 | null,
) {
  const problems: ImportDraftProblem[] = [];
  const groups = new Map<string, {
    pointName: string;
    rows: SyntheticCptuRow[];
    rowSources: NormalizedSourceRowV2[];
    sourceRows: NormalizedSourceRowV2[];
  }>();
  normalizedRows.forEach((candidate) => {
    if (!candidate.detectedPointKey) return;
    const pointName = candidate.row?.pointName ?? String(candidate.values.pointName?.normalizedValue ?? '');
    const current = groups.get(candidate.detectedPointKey) ?? { pointName, rows: [], rowSources: [], sourceRows: [] };
    if (candidate.row) {
      current.rows.push(candidate.row);
      current.rowSources.push(candidate);
    }
    current.sourceRows.push(candidate);
    groups.set(candidate.detectedPointKey, current);
  });
  groups.forEach((group, pointKey) => {
    if (!group.rows.length) {
      problems.push(problem({
        problemId: `point-no-readable-rows-${safeId(pointKey)}`,
        eventId: 'DI-E12',
        severity: 'issue',
        title: `点位 ${group.pointName} 没有可读取的数据行`,
        message: `点位 ${group.pointName} 的源行都存在数值或单位问题。`,
        action: '定位该点位的问题行并修正源文件。',
        detectedPointKey: pointKey,
        recoveryTarget: 'source-file',
      }));
      return;
    }
    const badIndex = group.rows.findIndex((row, index) => index > 0 && row.depthM <= group.rows[index - 1].depthM);
    if (badIndex >= 0) {
      const source = group.rowSources[badIndex];
      problems.push(problem({
        problemId: groups.size === 1 ? 'nonmonotonic-depth' : `nonmonotonic-depth-${safeId(pointKey)}`,
        eventId: 'DI-E13',
        severity: 'issue',
        title: '深度不递增',
        message: `点位 ${group.pointName} 第 ${source.displayRowNumber} 行附近深度没有向下递增。`,
        action: '返回源文件修正该点位的深度顺序后重新上传。',
        fieldName: 'DepthM',
        rowIndex: source.displayRowNumber,
        evidence: `${group.rows[badIndex - 1].depthM.toFixed(2)} -> ${group.rows[badIndex].depthM.toFixed(2)} m`,
        sourceRowId: source.sourceRowId,
        detectedPointKey: pointKey,
        recoveryTarget: 'source-file',
      }));
    }
    const finalDepths = Array.from(new Set(group.rows.map((row) => row.finalDepthM)));
    if (finalDepths.length > 1) {
      problems.push(problem({
        problemId: `inconsistent-final-depth-${safeId(pointKey)}`,
        eventId: 'DI-E14',
        severity: 'issue',
        title: '最终孔深不一致',
        message: `点位 ${group.pointName} 存在多个最终孔深：${finalDepths.join('、')} m。`,
        action: '确认该点位唯一的 FinalDepthM 后重新上传。',
        fieldName: 'FinalDepthM',
        detectedPointKey: pointKey,
        recoveryTarget: 'source-file',
      }));
    }
    const negativeDepth = group.rows.findIndex((row) => row.depthM < 0);
    if (negativeDepth >= 0) {
      const source = group.rowSources[negativeDepth];
      problems.push(problem({
        problemId: `negative-depth-${safeId(pointKey)}`,
        eventId: 'DI-E13',
        severity: 'issue',
        title: '深度不能为负值',
        message: `点位 ${group.pointName} 第 ${source.displayRowNumber} 行深度小于 0 m。`,
        action: '修正该点位的深度值后重新上传。',
        fieldName: 'DepthM',
        rowIndex: source.displayRowNumber,
        sourceRowId: source.sourceRowId,
        detectedPointKey: pointKey,
        recoveryTarget: 'source-file',
      }));
    }
    const maxDepth = Math.max(...group.rows.map((row) => row.depthM));
    const finalDepth = group.rows[0].finalDepthM;
    if (maxDepth > finalDepth) {
      problems.push(problem({
        problemId: groups.size === 1 ? 'depth-exceeds-final' : `depth-exceeds-final-${safeId(pointKey)}`,
        eventId: 'DI-E14',
        severity: 'issue',
        title: '深度超过最终孔深',
        message: `点位 ${group.pointName} 最大深度 ${maxDepth.toFixed(2)} m 超过最终孔深 ${finalDepth.toFixed(1)} m。`,
        action: '修正 FinalDepthM 或该点位深度数据后重新上传。',
        fieldName: 'FinalDepthM',
        evidence: `${maxDepth.toFixed(2)} m > ${finalDepth.toFixed(1)} m`,
        detectedPointKey: pointKey,
        recoveryTarget: 'source-file',
      }));
    }
  });

  const detectedPoints = Array.from(groups.entries()).map(([pointKey, group]) => ({ pointKey, pointName: group.pointName, rowCount: group.sourceRows.length }));
  const pointConflicts = detectedPoints.flatMap((detected) => {
    const existing = context.existingPoints?.find((point) =>
      normalizePointKey(point.pointName) === detected.pointKey
      || point.aliases?.some((alias) => normalizePointKey(alias) === detected.pointKey),
    );
    if (!existing) return [];
    return [{
      detectedPointKey: detected.pointKey,
      existingPointId: existing.pointId,
      reason: normalizePointKey(existing.pointName) === detected.pointKey ? 'name' as const : 'alias' as const,
    }];
  });
  if (!rows.length) {
    problems.push(problem({
      problemId: 'no-readable-rows',
      eventId: 'DI-E12',
      severity: 'issue',
      title: '没有可读取的数据行',
      message: '文件有表头，但没有可生成草稿的数据行。',
      action: '按问题定位修正数据后重新上传。',
    }));
  }
  if (detectedPoints.length > 1) {
    problems.push(problem({
      problemId: 'multi-point-file',
      eventId: 'DI-E11',
      severity: 'issue',
      title: '文件包含多个点位',
      message: `文件中识别到 ${detectedPoints.length} 个点位：${detectedPoints.slice(0, 3).map((point) => point.pointName).join('、')}。`,
      action: '选择全部拆分、部分拆分或取消本批次。',
      fieldName: 'PointName',
      evidence: detectedPoints.map((point) => point.pointName).join(' / '),
    }));
    pointConflicts.forEach((conflict) => {
      const detected = detectedPoints.find((point) => point.pointKey === conflict.detectedPointKey)!;
      problems.push(problem({
        problemId: `point-existing-conflict-${safeId(conflict.detectedPointKey)}`,
        eventId: 'DI-E10',
        severity: 'issue',
        title: '点位已存在',
        message: `点位 ${detected.pointName} 与项目中的已有点位${conflict.reason === 'alias' ? '别名' : '名称'}冲突。`,
        action: '为该点位选择追加草稿、替换活动草稿、重命名或跳过。',
        fieldName: 'PointName',
        detectedPointKey: conflict.detectedPointKey,
        recoveryTarget: 'point-plan',
      }));
    });
  } else if (
    detectedPoints.length === 1
    && !context.allowAnyPoint
    && (!pointAttribution || pointAttribution.source === 'source-column')
    && normalizePointKey(detectedPoints[0].pointName) !== normalizePointKey(context.currentPointName)
  ) {
    problems.push(problem({
      problemId: 'point-mismatch',
      eventId: 'DI-E10',
      severity: 'issue',
      title: '点位与当前点位不一致',
      message: `当前点位是 ${context.currentPointName}，文件点位是 ${detectedPoints[0].pointName}。`,
      action: '选择作为新点位草稿、指向已有点位或取消导入。',
      fieldName: 'PointName',
      evidence: `${context.currentPointName} -> ${detectedPoints[0].pointName}`,
    }));
  }
  const hasPointIssues = problems.some((candidate) => candidate.severity === 'issue');
  const strategy = detectedPoints.length > 1 ? 'pending' : 'single';
  const state = detectedPoints.length > 1 ? 'needs-decision' : hasPointIssues || !detectedPoints.length ? 'conflict' : 'ready';
  return {
    problems,
    pointPlan: {
      detectedPoints,
      selectedPointKeys: state === 'ready' ? detectedPoints.map((point) => point.pointKey) : [],
      strategy,
      state,
      conflicts: pointConflicts,
      targetDecisions: detectedPoints.map((point) => ({
        detectedPointKey: point.pointKey,
        action: 'pending',
        state: pointConflicts.some((conflict) => conflict.detectedPointKey === point.pointKey) ? 'conflict' : 'pending',
        targetPointId: pointConflicts.find((conflict) => conflict.detectedPointKey === point.pointKey)?.existingPointId,
      })),
      executions: detectedPoints.map((point) => ({
        detectedPointKey: point.pointKey,
        status: state === 'ready' ? 'pending' : 'problem',
        idempotencyKey: `${safeId(point.pointKey)}:${point.rowCount}`,
        sourceFingerprint: '',
      })),
    } satisfies PointSplitPlanV2,
  };
}

function getDecisionProblems(
  mappings: FieldMappingDecisionV2[],
  units: UnitDecisionV2[],
  pointAttribution: PointAttributionDecisionV2 | null,
) {
  const problems: ImportDraftProblem[] = [];
  mappings.forEach((mapping) => {
    const definition = getDefinition(mapping.targetField);
    if (mapping.state === 'confirmed') return;
    if (mapping.targetField === 'pointName' && pointAttribution && pointAttribution.source !== 'source-column') return;
    if (mapping.requiredLevel !== 'required' && mapping.state === 'missing') {
      if (mapping.targetField === 'u2') problems.push(optionalFieldNotice(definition));
      return;
    }
    const conflict = mapping.state === 'conflict';
    problems.push(problem({
      problemId: conflict ? `mapping-conflict-${definition.targetField.toLowerCase()}` : `missing-${normalizeImportHeader(definition.standardHeader)}`,
      eventId: mappingEventId(mapping.targetField),
      severity: 'issue',
      title: conflict ? `${definition.label} 存在映射冲突` : mapping.state === 'candidate' ? `${definition.label} 映射需要确认` : `缺少必需字段 ${definition.label}`,
      message: conflict
        ? `${definition.label} 对应多个源列或与其他目标字段共用了源列。`
        : mapping.state === 'candidate'
          ? `${definition.label} 只通过别名识别，确认映射后才能继续。`
          : `上传文件没有确认 ${definition.label} 对应的源列，当前不能用于数据检查。`,
      action: conflict ? '选择唯一源列并解除重复映射。' : '确认候选源列、手动映射，或按模板整理后重新上传。',
      fieldName: definition.label,
    }));
  });
  units.forEach((unit) => {
    if (unit.state === 'confirmed' || unit.state === 'not-applicable') return;
    const definition = getDefinition(unit.targetField);
    problems.push(problem({
      problemId: `unit-${unit.targetField.toLowerCase()}`,
      eventId: 'DI-E15',
      severity: 'issue',
      title: unit.state === 'conflict' ? `${definition.label} 单位存在冲突` : `${definition.label} 单位需要确认`,
      message: unit.state === 'conflict' ? '表头或单元格中出现不支持或混合单位。' : `只能根据数值范围推测单位，不能自动采用 ${unit.detectedUnit ?? '未知单位'}。`,
      action: unit.state === 'conflict' ? '修正源文件为统一支持单位后重新上传。' : '选择源单位并核对标准化样例。',
      fieldName: definition.label,
      evidence: unit.detectedUnit ?? '未确认',
    }));
  });
  return problems;
}

function getReadiness(
  mappings: FieldMappingDecisionV2[],
  units: UnitDecisionV2[],
  pointAttribution: PointAttributionDecisionV2 | null,
  pointPlan: PointSplitPlanV2,
  problems: ImportDraftProblem[],
  rows: SyntheticCptuRow[],
): ImportReadinessV2 {
  const reasons: ImportReadinessV2['reasons'] = [];
  mappings.filter((mapping) =>
    mapping.state !== 'confirmed'
    && (mapping.requiredLevel === 'required' || mapping.state !== 'missing')
    && !(mapping.targetField === 'pointName' && pointAttribution && pointAttribution.source !== 'source-column')
  ).forEach((mapping) => {
    reasons.push({ reasonCode: `MAPPING-${mapping.state.toUpperCase()}`, message: `${getDefinition(mapping.targetField).label} 映射尚未确认。`, recovery: 'mapping', targetField: mapping.targetField });
  });
  units.filter((unit) => !['confirmed', 'not-applicable'].includes(unit.state)).forEach((unit) => {
    reasons.push({ reasonCode: `UNIT-${unit.state.toUpperCase()}`, message: `${getDefinition(unit.targetField).label} 单位尚未确认。`, recovery: 'unit', targetField: unit.targetField });
  });
  if (pointPlan.state !== 'ready') reasons.push({ reasonCode: `POINT-${pointPlan.state.toUpperCase()}`, message: '点位生成计划尚未就绪。', recovery: 'point-plan' });
  if (!rows.length) reasons.push({ reasonCode: 'SOURCE-NO-ROWS', message: '没有可用的数据行。', recovery: 'source-file' });
  const issueProblems = problems.filter((candidate) => candidate.severity === 'issue');
  issueProblems.forEach((candidate) => {
    reasons.push({
      reasonCode: candidate.reasonCode ?? candidate.problemId,
      message: candidate.message,
      recovery: candidate.recoveryTarget ?? inferProblemRecovery(candidate),
      targetField: targetFieldFromProblem(candidate),
    });
  });
  const canNormalize = rows.length > 0 && !reasons.some((reason) => reason.recovery === 'mapping' || reason.recovery === 'unit');
  const canGenerateDrafts = canNormalize && pointPlan.state === 'ready' && issueProblems.length === 0 && rows.length > 0;
  return { canNormalize, canGenerateDrafts, canRunCheck: canGenerateDrafts, reasons: uniqueBy(reasons, (reason) => `${reason.reasonCode}:${reason.targetField ?? ''}`) };
}

function inferProblemRecovery(problemValue: ImportDraftProblem): ImportReadinessV2['reasons'][number]['recovery'] {
  if (problemValue.eventId === 'DI-E15') return 'unit';
  if (['DI-E05', 'DI-E06', 'DI-E07', 'DI-E08', 'DI-E09'].includes(problemValue.eventId)) return 'mapping';
  if (['DI-E10', 'DI-E11'].includes(problemValue.eventId)) return 'point-plan';
  return 'source-file';
}

function targetFieldFromProblem(problemValue: ImportDraftProblem): TargetFieldKey | undefined {
  return IMPORT_TARGET_DEFINITIONS.find((definition) => definition.label === problemValue.fieldName)?.targetField;
}

function finalizePointPlan(
  requested: PointSplitPlanV2,
  detected: PointSplitPlanV2,
  problems: ImportDraftProblem[],
  sourceFingerprint: string,
): PointSplitPlanV2 {
  const detectedKeys = detected.detectedPoints.map((point) => point.pointKey);
  const requestedStrategy = requested.strategy;
  if (requestedStrategy === 'cancelled') {
    return {
      ...detected,
      strategy: 'cancelled',
      state: 'cancelled',
      selectedPointKeys: requested.selectedPointKeys.filter((pointKey) => detectedKeys.includes(pointKey)),
      targetDecisions: requested.targetDecisions?.filter((decision) => detectedKeys.includes(decision.detectedPointKey)).map((decision) => ({ ...decision })),
      executions: requested.executions
        .filter((execution) => detectedKeys.includes(execution.detectedPointKey) && execution.sourceFingerprint === sourceFingerprint)
        .map((execution) => ({ ...execution })),
    };
  }
  if (detected.detectedPoints.length > 1 && ['split-all', 'split-selected'].includes(requestedStrategy)) {
    const selectedPointKeys = requestedStrategy === 'split-all'
      ? detectedKeys
      : requested.selectedPointKeys.filter((key) => detectedKeys.includes(key));
    const requestedDecisions = new Map(
      (requested.targetDecisions ?? []).map((decision) => [decision.detectedPointKey, decision]),
    );
    const targetDecisions = detectedKeys.map((pointKey): PointTargetDecisionV2 => {
      const selected = selectedPointKeys.includes(pointKey);
      const hasProblem = problems.some((candidate) =>
        candidate.severity === 'issue'
        && candidate.eventId !== 'DI-E10'
        && candidate.eventId !== 'DI-E11'
        && candidate.detectedPointKey === pointKey,
      );
      const conflict = detected.conflicts.find((candidate) => candidate.detectedPointKey === pointKey);
      const requestedDecision = requestedDecisions.get(pointKey);
      if (!selected) {
        return { detectedPointKey: pointKey, action: 'skip', state: 'confirmed', proposedPointName: detected.detectedPoints.find((point) => point.pointKey === pointKey)?.pointName };
      }
      if (hasProblem) {
        return {
          ...(requestedDecision ?? { detectedPointKey: pointKey, action: conflict ? 'pending' : 'create-point' }),
          detectedPointKey: pointKey,
          state: 'conflict',
          proposedPointName: requestedDecision?.proposedPointName ?? detected.detectedPoints.find((point) => point.pointKey === pointKey)?.pointName,
        };
      }
      if (requestedDecision && requestedDecision.action !== 'pending') {
        return { ...requestedDecision, state: requestedDecision.reasonCode ? 'conflict' : 'confirmed' };
      }
      return {
        detectedPointKey: pointKey,
        action: conflict ? 'pending' : 'create-point',
        state: conflict ? 'conflict' : 'confirmed',
        targetPointId: conflict?.existingPointId,
        proposedPointName: detected.detectedPoints.find((point) => point.pointKey === pointKey)?.pointName,
      };
    });
    const requestedExecutions = new Map(requested.executions.map((execution) => [execution.detectedPointKey, execution]));
    const executions = createPointExecutions(detectedKeys, selectedPointKeys, problems, sourceFingerprint).map((execution) => {
      const previous = requestedExecutions.get(execution.detectedPointKey);
      if (previous?.status === 'generated' && previous.sourceFingerprint === sourceFingerprint) return { ...previous };
      const decision = targetDecisions.find((candidate) => candidate.detectedPointKey === execution.detectedPointKey);
      const hasBlockingProblem = problems.some((problemValue) =>
        problemValue.severity === 'issue'
        && problemValue.eventId !== 'DI-E11'
        && problemValue.detectedPointKey === execution.detectedPointKey
        && !(problemValue.eventId === 'DI-E10' && decision?.state === 'confirmed' && decision.action !== 'pending'),
      );
      return {
        ...execution,
        status: hasBlockingProblem
          ? ('problem' as const)
          : selectedPointKeys.includes(execution.detectedPointKey) && decision?.action !== 'skip'
            ? ('pending' as const)
            : ('skipped' as const),
      };
    });
    const provisionalPlan: PointSplitPlanV2 = {
      ...detected,
      strategy: requestedStrategy,
      selectedPointKeys,
      targetDecisions,
      executions,
    };
    const blocking = getBlockingProblemsForPointPlan(problems, provisionalPlan)
      .filter((candidate) => candidate.severity === 'issue');
    const unresolvedDecision = targetDecisions.some((decision) =>
      selectedPointKeys.includes(decision.detectedPointKey)
      && decision.action !== 'skip'
      && decision.state !== 'confirmed',
    );
    const actionableCount = targetDecisions.filter((decision) =>
      selectedPointKeys.includes(decision.detectedPointKey) && decision.action !== 'skip' && decision.state === 'confirmed',
    ).length;
    return {
      ...provisionalPlan,
      state: actionableCount > 0 && !unresolvedDecision && blocking.length === 0 ? 'ready' : 'conflict',
    };
  }
  if (detected.detectedPoints.length === 1) {
    const pointKey = detected.detectedPoints[0].pointKey;
    const requestedDecision = requested.targetDecisions?.find((decision) => decision.detectedPointKey === pointKey);
    if (requestedDecision && requestedDecision.action !== 'pending') {
      const previousExecution = requested.executions.find((execution) => execution.detectedPointKey === pointKey);
      const execution = previousExecution?.status === 'generated' && previousExecution.sourceFingerprint === sourceFingerprint
        ? { ...previousExecution }
        : {
            ...createPointExecutions([pointKey], requestedDecision.action === 'skip' ? [] : [pointKey], problems, sourceFingerprint)[0],
            status: requestedDecision.state !== 'confirmed'
              ? ('problem' as const)
              : requestedDecision.action === 'skip'
                ? ('skipped' as const)
                : ('pending' as const),
          };
      const provisionalPlan: PointSplitPlanV2 = {
        ...detected,
        strategy: 'single',
        selectedPointKeys: requestedDecision.action === 'skip' ? [] : [pointKey],
        targetDecisions: [{ ...requestedDecision }],
        executions: [execution],
      };
      const blocking = getBlockingProblemsForPointPlan(problems, provisionalPlan)
        .filter((problemValue) => problemValue.severity === 'issue');
      return {
        ...provisionalPlan,
        state: requestedDecision.state === 'confirmed' && requestedDecision.action !== 'skip' && blocking.length === 0
          ? 'ready'
          : 'conflict',
      };
    }
  }
  const restoredGeneratedExecutions = requested.executions.filter((execution) =>
    execution.status === 'generated'
    && execution.sourceFingerprint === sourceFingerprint
    && detectedKeys.includes(execution.detectedPointKey),
  );
  if (detected.detectedPoints.length === 1 && restoredGeneratedExecutions.length === 1) {
    const generatedExecution = restoredGeneratedExecutions[0];
    const targetDecision = requested.targetDecisions?.find(
      (decision) => decision.detectedPointKey === generatedExecution.detectedPointKey,
    );
    return {
      ...detected,
      strategy: 'single',
      state: 'ready',
      selectedPointKeys: [generatedExecution.detectedPointKey],
      conflicts: detected.conflicts.filter((conflict) => conflict.existingPointId !== generatedExecution.resultPointId),
      targetDecisions: targetDecision ? [{ ...targetDecision, state: 'confirmed' }] : detected.targetDecisions,
      executions: [{ ...generatedExecution }],
    };
  }
  return {
    ...detected,
    executions: createPointExecutions(detectedKeys, detected.selectedPointKeys, problems, sourceFingerprint).map((execution) =>
      detected.state === 'needs-decision' && execution.status === 'skipped'
        ? { ...execution, status: 'pending' as const }
        : execution,
    ),
  };
}

function createPointExecutions(
  detectedKeys: string[],
  selectedKeys: string[],
  problems: ImportDraftProblem[],
  sourceFingerprint: string,
) {
  return detectedKeys.map((pointKey) => {
    const hasProblem = problems.some((candidate) => candidate.severity === 'issue' && candidate.detectedPointKey === pointKey);
    const selected = selectedKeys.includes(pointKey);
    return {
      detectedPointKey: pointKey,
      status: hasProblem ? ('problem' as const) : selected ? ('pending' as const) : ('skipped' as const),
      idempotencyKey: `${sourceFingerprint}:${pointKey}`,
      sourceFingerprint,
    };
  });
}

function getBlockingProblemsForPointPlan(problems: ImportDraftProblem[], pointPlan: PointSplitPlanV2) {
  return problems.filter((candidate) =>
    !(['split-all', 'split-selected'].includes(pointPlan.strategy) && candidate.eventId === 'DI-E11')
    && !(
      candidate.eventId === 'DI-E10'
      && isPointConflictResolved(
        pointPlan,
        candidate.detectedPointKey ?? (pointPlan.detectedPoints.length === 1 ? pointPlan.detectedPoints[0].pointKey : ''),
      )
    )
    && (
      !['split-all', 'split-selected'].includes(pointPlan.strategy)
      || !candidate.detectedPointKey
      || pointPlan.selectedPointKeys.includes(candidate.detectedPointKey)
    ),
  );
}

function isPointConflictResolved(pointPlan: PointSplitPlanV2, pointKey: string) {
  const decision = pointPlan.targetDecisions?.find((candidate) => candidate.detectedPointKey === pointKey);
  return decision?.state === 'confirmed' && decision.action !== 'pending';
}

function pointNameConflicts(
  proposedPointName: string,
  context: PipelineContext,
  decisions: PointTargetDecisionV2[],
  currentPointKey: string,
) {
  const normalized = normalizePointKey(proposedPointName);
  if (!normalized) return true;
  const existingConflict = context.existingPoints?.some((point) =>
    [point.pointName, ...(point.aliases ?? [])].some((identity) => normalizePointKey(identity) === normalized),
  );
  if (existingConflict) return true;
  return decisions.some((decision) =>
    decision.detectedPointKey !== currentPointKey
    && decision.state === 'confirmed'
    && ['create-point', 'rename-and-create'].includes(decision.action)
    && normalizePointKey(decision.proposedPointName ?? '') === normalized,
  );
}

function getSelectedPointRows(pipeline: CsvImportPipelineV2) {
  if (!['split-all', 'split-selected'].includes(pipeline.pointPlan.strategy)) return pipeline.rows;
  const selected = new Set(pipeline.pointPlan.selectedPointKeys);
  return pipeline.rows.filter((row) => selected.has(normalizePointKey(row.pointName)));
}

function getMappingCandidates(
  normalizedHeader: string,
  sampleValues: string[],
): SourceColumnV2['mappingCandidates'] {
  const direct: SourceColumnV2['mappingCandidates'] = IMPORT_TARGET_DEFINITIONS.flatMap<SourceColumnV2['mappingCandidates'][number]>((definition) => {
    const standard = normalizeImportHeader(definition.standardHeader);
    if (normalizedHeader === standard) return [{ targetField: definition.targetField, confidence: 'high' as const }];
    if (definition.aliases.includes(normalizedHeader)) return [{ targetField: definition.targetField, confidence: 'high' as const }];
    return [];
  });
  if (direct.length) return direct;
  const inferred = inferValueType(sampleValues);
  return inferred === 'text'
    ? [{ targetField: 'pointName' as const, confidence: 'low' as const }]
    : inferred === 'number'
      ? IMPORT_TARGET_DEFINITIONS.filter((definition) => definition.standardUnit !== 'text').map((definition) => ({ targetField: definition.targetField, confidence: 'low' as const }))
      : [];
}

function mappingDecision(
  definition: TargetDefinition,
  source: SourceColumnV2 | null,
  decisionSource: FieldMappingDecisionV2['decisionSource'],
  suggestionSource: FieldMappingDecisionV2['suggestionSource'],
  confidence: FieldMappingDecisionV2['confidence'],
  state: FieldMappingDecisionV2['state'],
  confirmedAt?: string,
): FieldMappingDecisionV2 {
  return {
    targetField: definition.targetField,
    sourceColumnId: source?.columnId ?? null,
    requiredLevel: definition.requiredLevel,
    decisionSource,
    suggestionSource,
    confidence,
    state,
    confirmedAt: state === 'confirmed' ? confirmedAt : undefined,
    confirmedRevision: state === 'confirmed' ? 1 : undefined,
  };
}

function markDuplicateSourceConflicts(mappings: FieldMappingDecisionV2[]) {
  const counts = new Map<string, number>();
  mappings.forEach((mapping) => {
    if (mapping.sourceColumnId) counts.set(mapping.sourceColumnId, (counts.get(mapping.sourceColumnId) ?? 0) + 1);
  });
  return mappings.map((mapping): FieldMappingDecisionV2 =>
    mapping.sourceColumnId && (counts.get(mapping.sourceColumnId) ?? 0) > 1 ? { ...mapping, state: 'conflict' } : mapping,
  );
}

function restoreNonDuplicateStates(mappings: FieldMappingDecisionV2[]) {
  const counts = new Map<string, number>();
  mappings.forEach((mapping) => {
    if (mapping.sourceColumnId) counts.set(mapping.sourceColumnId, (counts.get(mapping.sourceColumnId) ?? 0) + 1);
  });
  return mappings.map((mapping): FieldMappingDecisionV2 => {
    if (!mapping.sourceColumnId || (counts.get(mapping.sourceColumnId) ?? 0) > 1 || mapping.state !== 'conflict') return mapping;
    return { ...mapping, state: 'confirmed' };
  });
}

function mappingSemantics(mapping: FieldMappingDecisionV2) {
  const { confirmedAt: _confirmedAt, ...semantic } = mapping;
  return semantic;
}

function mergeUnitDecisions(pipeline: CsvImportPipelineV2, mappings: FieldMappingDecisionV2[]) {
  const suggested = createUnitDecisions(pipeline.sourceColumns, mappings, pipeline.sourceRows.map((row) => row.cells));
  return suggested.map((decision) => {
    const prior = pipeline.unitDecisions.find((candidate) => candidate.targetField === decision.targetField && candidate.sourceColumnId === decision.sourceColumnId);
    return prior?.decisionSource === 'user' ? prior : decision;
  });
}

function confirmedMapping(mappings: FieldMappingDecisionV2[], target: TargetFieldKey) {
  return mappings.find((mapping) => mapping.targetField === target && mapping.state === 'confirmed' && mapping.sourceColumnId);
}

function detectHeaderUnit(header: string, target: TargetFieldKey): { state: 'supported' | 'unsupported' | 'none'; unit: string | null } {
  const normalized = normalizeImportHeader(header);
  const lower = header.toLocaleLowerCase();
  if (/\b(psi|bar|ft|feet|inch|inches)\b/i.test(lower) || /(psi|bar)$/.test(normalized)) return { state: 'unsupported', unit: lower.match(/psi|bar|ft|feet|inch(?:es)?/)?.[0] ?? '不支持单位' };
  if (isLength(target)) {
    if (normalized.endsWith('mm')) return { state: 'supported', unit: 'mm' };
    if (normalized.endsWith('cm')) return { state: 'supported', unit: 'cm' };
    if (normalized.endsWith('m')) return { state: 'supported', unit: 'm' };
  }
  if (isPressure(target)) {
    if (normalized.endsWith('mpa')) return { state: 'supported', unit: 'MPa' };
    if (normalized.endsWith('kpa')) return { state: 'supported', unit: 'kPa' };
  }
  if (target === 'fr') {
    if (normalized.includes('percent') || normalized.includes('pct') || header.includes('%')) return { state: 'supported', unit: '%' };
    if (normalized.includes('ratio')) return { state: 'supported', unit: 'ratio' };
  }
  return { state: 'none', unit: null };
}

function detectCellUnits(values: string[], target: TargetFieldKey): { state: 'none' | 'single' | 'partial' | 'mixed'; unit: string | null } {
  const numericValues = values.filter((value) => parseNumericCell(value) !== null);
  const detected = numericValues.map((value) => extractCellUnit(value, target));
  const units = new Set(detected.filter((unit): unit is string => Boolean(unit)));
  if (units.size > 1) return { state: 'mixed', unit: null };
  if (units.size === 1 && detected.some((unit) => unit === null)) return { state: 'partial', unit: Array.from(units)[0] };
  return units.size === 1 ? { state: 'single', unit: Array.from(units)[0] } : { state: 'none', unit: null };
}

function extractCellUnit(value: string, target: TargetFieldKey) {
  if (parseNumericCell(value) === null) return null;
  const compact = value.trim().toLocaleLowerCase().replace(/\s+/g, '');
  if (isLength(target)) return compact.match(/([a-z%]+)$/)?.[1] ?? null;
  if (isPressure(target)) {
    const unit = compact.match(/([a-z%]+)$/)?.[1];
    return unit === 'mpa' ? 'MPa' : unit === 'kpa' ? 'kPa' : unit ?? null;
  }
  if (target === 'fr') return compact.endsWith('%') ? '%' : compact.match(/([a-z]+)$/)?.[1] ?? null;
  return null;
}

function inferUnitFromValues(target: TargetFieldKey, values: string[]) {
  const numeric = values.map(parseNumericCell).filter((value): value is number => value !== null);
  if (!numeric.length) return null;
  if (target === 'fr') return numeric.every((value) => value >= 0 && value <= 1) ? 'ratio' : '%';
  if (isPressure(target)) return Math.max(...numeric.map(Math.abs)) <= 100 ? 'MPa' : 'kPa';
  if (isLength(target)) return 'm';
  return null;
}

function getConversion(target: TargetFieldKey, unit: string) {
  if (isLength(target)) {
    if (unit === 'm') return { scale: 1, offset: 0 };
    if (unit === 'cm') return { scale: 0.01, offset: 0 };
    if (unit === 'mm') return { scale: 0.001, offset: 0 };
  }
  if (isPressure(target)) {
    if (unit === 'kPa') return { scale: 1, offset: 0 };
    if (unit === 'MPa') return { scale: 1000, offset: 0 };
  }
  if (target === 'fr') {
    if (unit === '%') return { scale: 1, offset: 0 };
    if (unit === 'ratio') return { scale: 100, offset: 0 };
  }
  return null;
}

function nonNumericProblem(
  target: TargetFieldKey,
  column: SourceColumnV2,
  sourceRow: SourceRowV2,
  raw: string,
  detail?: string,
) {
  const label = getDefinition(target).label;
  return problem({
    problemId: `non-numeric-${legacyKeyByTarget[target].toLowerCase()}-${sourceRow.displayRowNumber}`,
    eventId: 'DI-E12',
    severity: 'issue',
    title: `${label} 不是有效数字`,
    message: detail
      ? `第 ${sourceRow.displayRowNumber} 行字段 ${column.header} 的值为 "${raw || '空值'}"，${detail}。`
      : `第 ${sourceRow.displayRowNumber} 行字段 ${column.header} 的值为 "${raw || '空值'}"，当前不能用于数据检查。`,
    action: '修正该单元格后重新上传 CSV。',
    fieldName: label,
    rowIndex: sourceRow.displayRowNumber,
    evidence: raw || '空值',
    sourceRowId: sourceRow.rowId,
    sourceColumnId: column.columnId,
    recoveryTarget: 'source-file',
  });
}

function optionalFieldNotice(definition: TargetDefinition) {
  return problem({
    problemId: `notice-missing-${legacyKeyByTarget[definition.targetField].toLowerCase()}`,
    eventId: 'DI-E09',
    severity: 'notice',
    title: `建议字段缺失 ${definition.label}`,
    message: `${definition.label} 未映射；继续时会明确记录派生值、默认值或缺失来源。`,
    action: '可补充字段，也可在标准化预览中核对当前来源。',
    fieldName: definition.label,
  });
}

function mappingEventId(target: TargetFieldKey) {
  if (target === 'depthM') return 'DI-E06';
  if (target === 'finalDepth') return 'DI-E07';
  if (target === 'qc') return 'DI-E08';
  return 'DI-E05';
}

function pointNameFromAttribution(context: PipelineContext, attribution: PointAttributionDecisionV2 | null) {
  if (attribution?.source === 'constant-name') return attribution.pointName.trim();
  if (attribution?.source === 'existing-point') {
    return context.existingPoints?.find((point) => point.pointId === attribution.pointId)?.pointName.trim() ?? '';
  }
  return context.currentPointName.trim();
}

export function getSourcePointAttribution(
  mappings: FieldMappingDecisionV2[],
  columns: SourceColumnV2[],
): PointAttributionDecisionV2 | null {
  const mapping = confirmedMapping(mappings, 'pointName');
  return mapping?.sourceColumnId && columns.some((column) => column.columnId === mapping.sourceColumnId)
    ? { source: 'source-column', sourceColumnId: mapping.sourceColumnId }
    : null;
}

function getDefaultPointAttribution(
  context: Pick<PipelineContext, 'currentPointName' | 'existingPoints'>,
  mappings: FieldMappingDecisionV2[],
  columns: SourceColumnV2[],
): PointAttributionDecisionV2 | null {
  const current = context.existingPoints?.find((point) => normalizePointKey(point.pointName) === normalizePointKey(context.currentPointName));
  if (current) return { source: 'existing-point', pointId: current.pointId };
  return getSourcePointAttribution(mappings, columns)
    ?? (context.currentPointName.trim() ? { source: 'constant-name', pointName: context.currentPointName.trim() } : null);
}

function parseNumericCell(value: string) {
  const match = value.trim().replace(/,/g, '').match(/^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(?:[a-z%]+)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function derivedValue(value: number, standardUnit: UnitDecisionV2['standardUnit'], sourceFields: TargetFieldKey[]): NormalizedValueV2 {
  return { rawValue: null, normalizedValue: value, origin: 'derived', standardUnit, derivedFrom: [...sourceFields] };
}

function defaultedValue(value: number, standardUnit: UnitDecisionV2['standardUnit']): NormalizedValueV2 {
  return { rawValue: null, normalizedValue: value, origin: 'defaulted', standardUnit, defaultReason: '建议字段未映射' };
}

function getDefinition(target: TargetFieldKey) {
  return IMPORT_TARGET_DEFINITIONS.find((definition) => definition.targetField === target)!;
}

function normalizeImportHeader(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function normalizePointKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function inferValueType(values: string[]): SourceColumnV2['inferredValueType'] {
  if (!values.length) return 'empty';
  const numericCount = values.filter((value) => parseNumericCell(value) !== null && !/[a-z%]/i.test(value.replace(/[eE][+-]?\d+$/, ''))).length;
  if (numericCount === values.length) return 'number';
  if (numericCount === 0) return 'text';
  return 'mixed';
}

function isLength(target: TargetFieldKey) {
  return target === 'depthM' || target === 'waterDepth' || target === 'finalDepth';
}

function isPressure(target: TargetFieldKey) {
  return target === 'qc' || target === 'qt' || target === 'fs' || target === 'u2';
}

function problem(value: ImportDraftProblem) {
  return { reasonCode: value.reasonCode ?? value.problemId, ...value };
}

function emptyPointPlan(): PointSplitPlanV2 {
  return { detectedPoints: [], selectedPointKeys: [], strategy: 'pending', state: 'conflict', conflicts: [], targetDecisions: [], executions: [] };
}

function emptyReadiness(): ImportReadinessV2 {
  return { canNormalize: false, canGenerateDrafts: false, canRunCheck: false, reasons: [] };
}

function deduplicateProblems(problems: ImportDraftProblem[]) {
  return uniqueBy(problems, (candidate) => candidate.problemId);
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const candidate = key(value);
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

function safeId(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const ascii = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return ascii;
  const identity = Array.from(normalized)
    .map((character) => character.codePointAt(0)!.toString(16))
    .join('-');
  return `${ascii}-x-${identity}`;
}

async function sha256Hex(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
