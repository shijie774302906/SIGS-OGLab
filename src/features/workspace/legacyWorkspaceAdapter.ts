import { createSyntheticFlowCase, getDefaultWorkflowSelection, type SyntheticFlowCase } from '../../workflowData';
import type { CheckRunRecord, ImportDraft, ProjectWorkspace } from '../workflow/types';
import type { ParameterWorkspaceV2 } from '../parameters/parameterTypes';
import { selectCurrentCheckResult } from './workspaceV2';
import type {
  ImportBatchDraftV2,
  ImportDataBlockV2,
  PointImportDraftV2,
  PointWorkspaceV2,
  ProjectWorkspaceV2,
  StratificationWorkspaceV2,
} from './workspaceV2';

const normalizedRowsCache = new WeakMap<
  Extract<ImportDataBlockV2, { kind: 'normalized' }>,
  Map<string, SyntheticFlowCase['rows']>
>();
const rawRowsCache = new WeakMap<Extract<ImportDataBlockV2, { kind: 'raw' }>, string[][]>();
const draftSourceRowIdsCache = new WeakMap<PointImportDraftV2, string[]>();
const syntheticFlowCaseBaseCache = new Map<string, SyntheticFlowCase>();
const stratificationProjectionCache = new WeakMap<StratificationWorkspaceV2, StratificationWorkspaceV2>();
const parameterProjectionCache = new WeakMap<ParameterWorkspaceV2, ParameterWorkspaceV2>();
const checkHistoryCache = new WeakMap<PointWorkspaceV2, CheckRunRecord[]>();

export function projectV2ToLegacyView(project: ProjectWorkspaceV2, dataBlocks: ImportDataBlockV2[]): ProjectWorkspace {
  const activePoint = project.points.find((point) => point.pointId === project.activePointId) ?? project.points[0] ?? null;
  const activeBatch = getActiveBatch(project);
  const activePointDraft = activePoint
    ? activePoint.importDrafts.find((draft) => draft.draftId === activePoint.activeImportDraftId) ?? activePoint.importDrafts[0] ?? null
    : null;
  const activeDraft = activePointDraft && activeBatch
    && activePointDraft.batchId === activeBatch.batchId
    && activeBatch.generatedDraftIds.includes(activePointDraft.draftId)
    && revisionVectorsEqual(activePointDraft.revisions, activeBatch.revisions)
      ? activePointDraft
      : null;
  const normalizedRows = getNormalizedRows(
    activeDraft?.dataBlockId ?? activeBatch?.normalizedDataBlockId ?? null,
    dataBlocks,
    activeDraft?.sourcePointName,
    activePoint?.pointName,
  );
  const flowCase = createLegacyFlowCase(project, activePoint, activeBatch, normalizedRows);
  const importDraft = createLegacyImportDraft(project, activePoint, activeDraft, activeBatch, dataBlocks, normalizedRows);
  const pointSelection = activePoint?.selection;
  const defaultSelection = getDefaultWorkflowSelection();
  const checkContextPoint = activeDraft ? activePoint : null;
  const checkProjection = checkContextPoint ? selectCurrentCheckResult(checkContextPoint) : null;
  const checkRunHistory = createLegacyCheckHistory(checkContextPoint, importDraft.version);
  const checkedDraftVersion = getCheckedDraftVersion(checkContextPoint);

  return {
    projectId: project.projectId,
    projectName: project.projectName,
    mode: project.mode,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    flowCase,
    importDraft,
    selectedMappingField: pointSelection?.selectedMappingField ?? 'WaterDepthM',
    importFocusField: pointSelection?.importFocusField ?? null,
    importFocusSourceRowId: pointSelection?.importFocusSourceRowId ?? null,
    importFocusDisplayRow: pointSelection?.importFocusDisplayRow ?? null,
    checkInputDependency: checkProjection?.dependency ?? undefined,
    checkRunId: checkContextPoint?.checkState.activeRunId ?? `CHECK-${project.projectId}`,
    checkedDraftVersion,
    checkRunHistory,
    checkStaleReason: checkProjection?.artifactStatus === 'stale'
      ? checkContextPoint?.checkState.artifact.staleReason ?? '当前检查依据与活动点位、草稿或修订不一致。'
      : checkContextPoint?.checkState.artifact.staleReason,
    checkArtifactStatus: checkProjection?.artifactStatus ?? 'empty',
    checkRecoveryField: checkContextPoint?.checkState.artifact.recoveryTarget?.field,
    checkRecoveryReasonCode: checkContextPoint?.checkState.artifact.recoveryTarget?.reasonCode,
    stratificationWorkspace: activePoint?.stratificationWorkspace
      ? projectStratificationWorkspace(activePoint.stratificationWorkspace)
      : undefined,
    stratificationArtifactStatus: activePoint?.stratificationState.status ?? 'empty',
    stratificationStaleReason: activePoint?.stratificationState.staleReason,
    parameterWorkspace: activePoint?.parameterWorkspace
      ? projectParameterWorkspace(activePoint.parameterWorkspace)
      : undefined,
    parameterSiteId: activePoint?.siteId ?? null,
    parameterArtifactStatus: activePoint?.parameterState.status ?? 'empty',
    parameterStaleReason: activePoint?.parameterState.staleReason,
    selectedCheckFilter: pointSelection?.selectedCheckFilter ?? 'all',
    flowFeedback: project.flowFeedback,
    selection: {
      ...defaultSelection,
      activeRoute: project.activeRoute,
      activeBottomTab: project.activeBottomTab,
      selectedProjectId: project.projectId,
      selectedPointId: activePoint?.pointId ?? '',
      selectedImportBatchId: activeBatch?.batchId ?? '',
      selectedCheckIssueId: pointSelection?.selectedCheckIssueId ?? '',
      selectedSchemeId: pointSelection?.selectedSchemeId ?? defaultSelection.selectedSchemeId,
      selectedLayerId: pointSelection?.selectedLayerId ?? defaultSelection.selectedLayerId,
      selectedBoundaryId: pointSelection?.selectedBoundaryId ?? defaultSelection.selectedBoundaryId,
      selectedParameterSchemeId: pointSelection?.selectedParameterSchemeId ?? defaultSelection.selectedParameterSchemeId,
      selectedParameterSlotId: pointSelection?.selectedParameterSlotId ?? defaultSelection.selectedParameterSlotId,
      selectedOutputItemId: pointSelection?.selectedOutputItemId ?? defaultSelection.selectedOutputItemId,
    },
  };
}

function projectStratificationWorkspace(workspace: StratificationWorkspaceV2): StratificationWorkspaceV2 {
  const cached = stratificationProjectionCache.get(workspace);
  if (cached) return cached;
  const projected = {
    ...workspace,
    schemes: workspace.schemes.map((scheme) => structuredClone(scheme)),
    editSession: workspace.editSession ? structuredClone(workspace.editSession) : null,
    revisions: workspace.revisions?.map((revision) => structuredClone(revision)),
    deletedSchemeIds: [...(workspace.deletedSchemeIds ?? [])],
    // Completed runs are immutable, tamper-checked evidence and can be shared safely.
    ruleRuns: workspace.ruleRuns,
    jtsClassificationRuns: workspace.jtsClassificationRuns,
  };
  stratificationProjectionCache.set(workspace, projected);
  return projected;
}

function projectParameterWorkspace(workspace: ParameterWorkspaceV2) {
  const cached = parameterProjectionCache.get(workspace);
  if (cached) return cached;
  const projected = structuredClone(workspace);
  parameterProjectionCache.set(workspace, projected);
  return projected;
}

function createLegacyFlowCase(
  project: ProjectWorkspaceV2,
  point: PointWorkspaceV2 | null,
  batch: ImportBatchDraftV2 | null,
  rows: SyntheticFlowCase['rows'],
): SyntheticFlowCase {
  const base = syntheticFlowCaseBaseCache.get(project.projectId) ?? createSyntheticFlowCase(project.projectId);
  if (!syntheticFlowCaseBaseCache.has(project.projectId)) syntheticFlowCaseBaseCache.set(project.projectId, base);
  return {
    ...base,
    seed: project.projectId,
    caseId: `CASE-${project.projectId}`,
    generatedAt: project.updatedAt,
    sourceType: normalizeSourceType(batch?.source.mode),
    project: { ...base.project, projectId: project.projectId, projectName: project.projectName },
    point: point
      ? {
          pointId: point.pointId,
          pointName: point.pointName,
          pointAlias: point.aliases[0] ?? '',
          waterDepthM: point.waterDepthM,
          finalDepthM: point.finalDepthM,
        }
      : {
          pointId: 'pending-point',
          pointName: '待导入点位',
          pointAlias: '',
          waterDepthM: 0,
          finalDepthM: 0,
        },
    importBatch: {
      batchId: batch?.batchId ?? `empty-${project.projectId}`,
      batchName: batch?.source.fileName ?? '尚未导入数据',
    },
    rows,
  };
}

function createLegacyImportDraft(
  project: ProjectWorkspaceV2,
  point: PointWorkspaceV2 | null,
  pointDraft: PointImportDraftV2 | null,
  batch: ImportBatchDraftV2 | null,
  dataBlocks: ImportDataBlockV2[],
  rows: SyntheticFlowCase['rows'],
): ImportDraft {
  if (!batch) return createEmptyLegacyImportDraft(project, point);
  const rawBlock = batch.rawDataBlockId
    ? dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId && block.kind === 'raw')
    : null;
  const issues = pointDraft?.problems ?? batch.problems;
  const status = getLegacyDraftStatus(batch, pointDraft, rows.length);
  const pointName = pointDraft
    ? point?.pointName ?? pointDraft.sourcePointName
    : batch.pointPlan.detectedPoints[0]?.pointName ?? point?.pointName ?? '待导入点位';
  return {
    sourceMode: normalizeLegacySourceMode(batch.source.mode),
    fileName: batch.source.fileName,
    fileType: batch.source.fileType,
    sourceFingerprint: batch.sourceFingerprint,
    operationId: batch.operationId,
    excelSource: batch.source.mode === 'uploaded-excel' && batch.source.sheetName && batch.source.headerRow
      ? {
          sheetName: batch.source.sheetName,
          headerRow: batch.source.headerRow,
          workbookSheets: batch.source.workbookSheets?.map((sheet) => ({ ...sheet })) ?? [],
          parseDurationMs: batch.source.parseDurationMs ?? 0,
          originalFileSize: batch.source.originalFileSize ?? 0,
        }
      : undefined,
    status,
    message: getLegacyDraftMessage(batch, status),
    version: batch.revisions.normalization,
    headers: [...batch.sourceColumns].sort((left, right) => left.sourceIndex - right.sourceIndex).map((column) => column.header),
    rawPreview: rawBlock?.kind === 'raw' ? rawBlock.rows.slice(0, 5).map((row) => [...row]) : [],
    rawRows: rawBlock?.kind === 'raw' && rawBlock.completeness === 'full' ? getLegacyRawRows(rawBlock) : undefined,
    sourceRowIds: pointDraft ? getLegacySourceRowIds(pointDraft) : undefined,
    rows,
    valueProvenance: pointDraft
      ? Object.fromEntries(Object.entries(pointDraft.valueProvenance).map(([field, value]) => [field, {
          ...value,
          derivedFrom: value.derivedFrom ? [...value.derivedFrom] : undefined,
        }]))
      : undefined,
    problems: issues.map((problem) => ({ ...problem })),
    pointName,
    filePointNames: batch.pointPlan.detectedPoints.map((detected) => detected.pointName),
    pointDecision:
      batch.pointPlan.state === 'needs-decision'
        ? 'pending'
        : pointDraft
          ? 'matches-current'
          : batch.pointPlan.state === 'cancelled'
            ? 'cancelled'
            : 'pending',
    waterDepthM: point?.waterDepthM ?? rows[0]?.waterDepthM ?? 0,
    finalDepthM: point?.finalDepthM ?? rows[0]?.finalDepthM ?? 0,
    generatedAt: batch.updatedAt,
  };
}

function createEmptyLegacyImportDraft(project: ProjectWorkspaceV2, point: PointWorkspaceV2 | null): ImportDraft {
  return {
    sourceMode: 'project-empty',
    fileName: '尚未导入数据',
    fileType: '未导入',
    status: 'error',
    message: '当前项目暂无 CPT/CPTU 数据，请进入数据导入上传 CSV 或 Excel。',
    version: 1,
    headers: [],
    rawPreview: [],
    rows: [],
    problems: [
      {
        problemId: 'project-no-data',
        eventId: 'PRJ-E01',
        severity: 'notice',
        title: '暂无点位数据',
        message: '项目已创建，但还没有导入 CPT/CPTU 数据。',
        action: '进入数据导入后上传 CSV 或 Excel。',
      },
    ],
    pointName: point?.pointName ?? '待导入点位',
    filePointNames: [],
    pointDecision: 'matches-current',
    waterDepthM: point?.waterDepthM ?? 0,
    finalDepthM: point?.finalDepthM ?? 0,
    generatedAt: project.updatedAt,
  };
}

function createLegacyCheckHistory(point: PointWorkspaceV2 | null, fallbackVersion: number): CheckRunRecord[] {
  if (!point) return [];
  const cached = checkHistoryCache.get(point);
  if (cached) return cached;
  const current = point.checkState.runs.map((run) => ({
    runId: run.runId,
    draftVersion: run.input.revisions.normalization,
    createdAt: run.createdAt,
    sourceFile: point.importDrafts.find((draft) => draft.draftId === run.input.draftId)?.sourcePointName ?? point.pointName,
    pointName: point.pointName,
    counts: { ...run.counts },
    conclusion: run.conclusion,
    issueIds: [...run.issueIds],
    input: structuredClone(run.input),
  }));
  const legacy = point.checkState.legacyHistory.map((run) => ({
    runId: run.runId,
    draftVersion: Number.isFinite(run.draftVersion) ? run.draftVersion : fallbackVersion,
    createdAt: run.createdAt,
    sourceFile: run.sourceFile,
    pointName: run.pointName,
    counts: { ...run.counts },
    conclusion: run.conclusion,
  }));
  const projected = [...current, ...legacy].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  checkHistoryCache.set(point, projected);
  return projected;
}

function getCheckedDraftVersion(point: PointWorkspaceV2 | null) {
  if (!point || point.checkState.artifact.status === 'empty') return null;
  return point.checkState.artifact.input?.revisions.normalization ?? null;
}

function getActiveBatch(project: ProjectWorkspaceV2) {
  const record = project.importBatches.find((batch) => batch.batchId === project.activeImportBatchId) ?? null;
  return record?.kind === 'draft' ? record : null;
}

function getNormalizedRows(
  dataBlockId: string | null,
  blocks: ImportDataBlockV2[],
  sourcePointName?: string,
  targetPointName?: string,
) {
  if (!dataBlockId) return [];
  const block = blocks.find((candidate) => candidate.dataBlockId === dataBlockId);
  if (block?.kind !== 'normalized') return [];
  const cacheKey = `${normalizePointKey(sourcePointName ?? '')}\u0000${targetPointName ?? ''}`;
  const cached = normalizedRowsCache.get(block)?.get(cacheKey);
  if (cached) return cached;
  const rows = sourcePointName
    ? block.rows.filter((row) => normalizePointKey(row.pointName) === normalizePointKey(sourcePointName))
    : block.rows;
  const projected = rows.map((row) => ({ ...row, pointName: targetPointName ?? row.pointName }));
  const blockCache = normalizedRowsCache.get(block) ?? new Map<string, SyntheticFlowCase['rows']>();
  blockCache.set(cacheKey, projected);
  normalizedRowsCache.set(block, blockCache);
  return projected;
}

function getLegacyRawRows(block: Extract<ImportDataBlockV2, { kind: 'raw' }>) {
  const cached = rawRowsCache.get(block);
  if (cached) return cached;
  const rows = block.rows.map((row) => [...row]);
  rawRowsCache.set(block, rows);
  return rows;
}

function getLegacySourceRowIds(draft: PointImportDraftV2) {
  const cached = draftSourceRowIdsCache.get(draft);
  if (cached) return cached;
  const sourceRowIds = [...draft.sourceRowIds];
  draftSourceRowIdsCache.set(draft, sourceRowIds);
  return sourceRowIds;
}

function normalizePointKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function revisionVectorsEqual(
  left: PointImportDraftV2['revisions'],
  right: ImportBatchDraftV2['revisions'],
) {
  return left.source === right.source
    && left.mapping === right.mapping
    && left.unit === right.unit
    && left.normalization === right.normalization
    && left.pointPlan === right.pointPlan;
}

function getLegacyDraftStatus(
  batch: ImportBatchDraftV2,
  pointDraft: PointImportDraftV2 | null,
  rowCount: number,
): ImportDraft['status'] {
  if (batch.source.mode === 'excel-pending') return 'needs-parser';
  if (batch.pointPlan.state === 'needs-decision') return 'needs-decision';
  if (pointDraft?.status === 'ready' && rowCount > 0) return 'ready';
  return 'error';
}

function getLegacyDraftMessage(batch: ImportBatchDraftV2, status: ImportDraft['status']) {
  if (batch.workflowState === 'partially-generated') return '当前已生成点位可进入数据检查；其余点位保留在本批次中继续处理。';
  if (status === 'ready') return '导入草稿已读取，可用于数据检查。';
  if (status === 'needs-parser') return '文件已选择，正在等待可用解析器。';
  if (status === 'needs-decision') return '文件已解析，需要先完成点位归属或拆分决策。';
  return batch.problems.find((problem) => problem.severity === 'issue')?.message ?? '导入批次存在需要处理的问题。';
}

function normalizeLegacySourceMode(mode: string): ImportDraft['sourceMode'] {
  if (mode === 'project-empty' || mode === 'built-in-random' || mode === 'uploaded-csv' || mode === 'uploaded-excel' || mode === 'excel-pending') {
    return mode;
  }
  return 'uploaded-csv';
}

function normalizeSourceType(mode: string | undefined): SyntheticFlowCase['sourceType'] {
  if (mode === 'excel-pending') return 'synthetic-excel';
  return 'synthetic-csv';
}
