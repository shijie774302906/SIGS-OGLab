import type { ProjectCollectionState } from '../projects/projectCollection';
import {
  IMPORT_TARGET_DEFINITIONS,
  createInitialFieldMappings,
  createSourceColumnsV2,
  createUnitDecisions,
  getSourcePointAttribution,
  type CsvImportPipelineV2,
} from '../import/importPipeline';
import type { ProjectWorkspace } from '../workflow/types';
import {
  PROJECT_MANIFEST_SCHEMA,
  PROJECT_MANIFEST_VERSION,
  computeNormalizedPointDataHash,
  createInitialRevisionVector,
  emptyArtifactState,
  type ArtifactDependency,
  type CheckStateV2,
  type ImportBatchDraftV2,
  type ImportDataBlockV2,
  type PointImportDraftV2,
  type PointWorkspaceV2,
  type ProjectMigrationBundleV2,
  type ProjectWorkspaceV2,
} from './workspaceV2';
import { createEmptyPointWorkspace, createInitialProbeProfiles } from './pointLifecycle';

export async function migrateProjectCollectionV1ToV2(
  state: ProjectCollectionState,
  options: {
    sourceSavedAt: string;
    migratedAt: string;
    pipelineByProjectId?: Record<string, CsvImportPipelineV2>;
  },
): Promise<ProjectMigrationBundleV2> {
  const sourceEnvelope = {
    schema: 'sigs-oglab.project-collection',
    version: 1,
    savedAt: options.sourceSavedAt,
    state,
  };
  const sourceFingerprint = await sha256Hex(stableStringify(sourceEnvelope));
  const migrated = await Promise.all(state.projects.map((project) =>
    migrateProject(project, options.migratedAt, options.pipelineByProjectId?.[project.projectId]),
  ));
  const manifestId = `manifest-v2-${sourceFingerprint.slice(0, 20)}`;
  const projects = migrated.map((entry) => entry.project);
  const activeProjectId = projects.some((project) => project.projectId === state.activeProjectId)
    ? state.activeProjectId
    : null;

  return {
    manifest: {
      schema: PROJECT_MANIFEST_SCHEMA,
      version: PROJECT_MANIFEST_VERSION,
      manifestId,
      manifestRevision: 1,
      savedAt: options.migratedAt,
      state: { projects, activeProjectId },
    },
    dataBlocks: migrated.flatMap((entry) => entry.dataBlocks),
    migrationRecord: {
      migrationId: `migration-v1-v2-${sourceFingerprint.slice(0, 20)}`,
      sourceSchema: 'sigs-oglab.project-collection',
      sourceVersion: 1,
      sourceFingerprint,
      targetManifestId: manifestId,
      migratorVersion: 1,
      migratedAt: options.migratedAt,
      status: 'completed',
    },
  };
}

async function migrateProject(
  project: ProjectWorkspace,
  migratedAt: string,
  pipeline?: CsvImportPipelineV2,
) {
  if (project.importDraft.sourceMode === 'project-empty' && project.importDraft.rows.length === 0) {
    return {
      project: createEmptyProjectV2(project),
      dataBlocks: [] as ImportDataBlockV2[],
    };
  }

  const draft = project.importDraft;
  const rawRows = pipeline?.sourceRows.map((row) => [...row.cells]) ?? draft.rawRows ?? draft.rawPreview;
  const normalizedRows = pipeline?.rows.map((row) => ({ ...row })) ?? (draft.rows.length ? draft.rows : project.flowCase.rows);
  const sourceFingerprint = pipeline?.sourceFingerprint ?? draft.sourceFingerprint ?? await sha256Hex(
    stableStringify({
      fileName: draft.fileName,
      fileType: draft.fileType,
      headers: draft.headers,
      rawRows,
      rows: normalizedRows,
    }),
  );
  const entityFingerprint = await sha256Hex(
    stableStringify({ projectId: project.projectId, draftVersion: draft.version, sourceFingerprint }),
  );
  const idSuffix = entityFingerprint.slice(0, 16);
  const batchId = pipeline?.batchId ?? `batch-v2-${safeId(project.projectId)}-${idSuffix}`;
  const rawDataBlockId = rawRows.length ? `${batchId}:raw:${pipeline?.revisions.source ?? 1}` : null;
  const normalizedDataBlockId = normalizedRows.length ? `${batchId}:normalized:${pipeline?.revisions.normalization ?? 1}` : null;
  const sourceColumns = pipeline?.sourceColumns.map((column) => ({
    ...column,
    sampleValues: [...column.sampleValues],
    mappingCandidates: column.mappingCandidates.map((candidate) => ({ ...candidate })),
  })) ?? createSourceColumnsV2(batchId, 1, draft.headers, rawRows);
  const mappings = pipeline?.mappings.map((mapping) => ({ ...mapping }))
    ?? createInitialFieldMappings(sourceColumns, migratedAt);
  const unitDecisions = pipeline?.unitDecisions.map((decision) => ({
    ...decision,
    conversion: decision.conversion ? { ...decision.conversion } : null,
  })) ?? createUnitDecisions(sourceColumns, mappings, rawRows);
  const revisions = pipeline ? { ...pipeline.revisions } : createInitialRevisionVector();
  const detectedPointNames = Array.from(new Set(normalizedRows.map((row) => row.pointName.trim()).filter(Boolean)));
  const canGeneratePoint =
    (pipeline ? pipeline.readiness.canGenerateDrafts : draft.status === 'ready') &&
    normalizedRows.length > 0 &&
    detectedPointNames.length <= 1 &&
    mappings.filter((mapping) => mapping.requiredLevel === 'required').every((mapping) => mapping.state === 'confirmed') &&
    unitDecisions.every((decision) => decision.state === 'confirmed' || decision.state === 'not-applicable');
  const pointName = detectedPointNames[0] || draft.pointName || project.flowCase.point.pointName;
  const pointId = canGeneratePoint
    ? getStablePointId(project, pointName, draft.pointDecision === 'new-point', idSuffix)
    : null;
  const pointDraftId = pointId ? `draft-v2-${safeId(pointId)}-${idSuffix}` : null;
  const pointPlanState = detectedPointNames.length > 1 ? 'needs-decision' : canGeneratePoint ? 'ready' : 'conflict';
  const pointPlanStrategy = detectedPointNames.length > 1 ? 'pending' : 'single';
  const batch: ImportBatchDraftV2 = {
    kind: 'draft',
    batchId,
    operationId: pipeline?.operationId ?? draft.operationId ?? `migration-operation-${idSuffix}`,
    baseWorkspaceRevision: pipeline?.baseWorkspaceRevision ?? 0,
    sourceFingerprint,
    source: {
      mode: draft.sourceMode,
      fileName: draft.fileName,
      fileType: draft.fileType,
      sheetName: pipeline?.sourceSheetName ?? draft.excelSource?.sheetName,
      headerRow: pipeline?.sourceHeaderRow ?? draft.excelSource?.headerRow,
      workbookSheets: pipeline?.sourceWorkbookSheets?.map((sheet) => ({ ...sheet }))
        ?? draft.excelSource?.workbookSheets.map((sheet) => ({ ...sheet })),
      parseDurationMs: pipeline?.sourceParseDurationMs ?? draft.excelSource?.parseDurationMs,
      originalFileSize: pipeline?.sourceOriginalFileSize ?? draft.excelSource?.originalFileSize,
    },
    parseState: draft.sourceMode === 'excel-pending' ? 'selected' : draft.sourceMode === 'uploaded-csv' ? 'parsed' : 'parsed',
    workflowState: canGeneratePoint
      ? 'generated'
      : pipeline?.pointPlan.state === 'cancelled'
        ? 'cancelled'
        : pipeline?.readiness.canGenerateDrafts
          ? 'ready-to-generate'
          : 'editing',
    sourceColumns,
    sourceValueOverrides: pipeline?.sourceValueOverrides.map((override) => ({ ...override })) ?? [],
    rawDataBlockId,
    mappings,
    unitDecisions,
    normalizedDataBlockId,
    pointAttribution: pipeline?.pointAttribution
      ? { ...pipeline.pointAttribution }
      : getSourcePointAttribution(mappings, sourceColumns) ?? (pointName ? { source: 'constant-name', pointName } : null),
    pointPlan: pipeline ? {
      ...pipeline.pointPlan,
      detectedPoints: pipeline.pointPlan.detectedPoints.map((detected) => ({ ...detected })),
      selectedPointKeys: [...pipeline.pointPlan.selectedPointKeys],
      conflicts: pipeline.pointPlan.conflicts.map((conflict) => ({ ...conflict })),
      targetDecisions: pipeline.pointPlan.targetDecisions?.map((decision) => ({
        ...decision,
        action: canGeneratePoint
          ? (draft.pointDecision === 'new-point' || ['待导入点位', 'pending-point'].includes(project.flowCase.point.pointId)
              ? 'create-point'
              : 'append-draft')
          : decision.action,
        state: canGeneratePoint ? 'confirmed' : decision.state,
        targetPointId: canGeneratePoint ? pointId ?? undefined : decision.targetPointId,
      })),
      executions: pipeline.pointPlan.executions.map((execution) => ({
        ...execution,
        status: canGeneratePoint ? 'generated' : execution.status,
        resultPointId: canGeneratePoint ? pointId ?? undefined : execution.resultPointId,
        resultDraftId: canGeneratePoint ? pointDraftId ?? undefined : execution.resultDraftId,
      })),
    } : {
      detectedPoints: detectedPointNames.map((name) => ({
        pointKey: normalizePointKey(name),
        pointName: name,
        rowCount: normalizedRows.filter((row) => normalizePointKey(row.pointName) === normalizePointKey(name)).length,
      })),
      selectedPointKeys: canGeneratePoint ? [normalizePointKey(pointName)] : [],
      strategy: pointPlanStrategy,
      state: pointPlanState,
      conflicts: [],
      targetDecisions: detectedPointNames.map((name) => ({
        detectedPointKey: normalizePointKey(name),
        action: canGeneratePoint ? 'append-draft' : 'pending',
        state: canGeneratePoint ? 'confirmed' : 'pending',
        targetPointId: canGeneratePoint ? pointId ?? undefined : undefined,
      })),
      executions: detectedPointNames.map((name) => ({
        detectedPointKey: normalizePointKey(name),
        status: canGeneratePoint ? 'generated' : detectedPointNames.length > 1 ? 'pending' : 'problem',
        idempotencyKey: `migration-${idSuffix}-${normalizePointKey(name)}`,
        sourceFingerprint,
        resultPointId: canGeneratePoint ? pointId ?? undefined : undefined,
        resultDraftId: canGeneratePoint ? pointDraftId ?? undefined : undefined,
      })),
    },
    problems: (pipeline?.problems ?? draft.problems).map((problem) => ({ ...problem })),
    generatedDraftIds: pointDraftId ? [pointDraftId] : [],
    revisions,
    createdAt: draft.generatedAt,
    updatedAt: migratedAt,
  };

  const pointDraft = pointId && pointDraftId && normalizedDataBlockId
    ? createPointDraft(project, batch, pointId, pointDraftId, pointName, normalizedRows.length, pipeline)
    : null;
  const pointRows = pointDraft
    ? normalizedRows.filter((row) => normalizePointKey(row.pointName) === normalizePointKey(pointDraft.sourcePointName))
    : [];
  const normalizedDataHash = pointDraft ? computeNormalizedPointDataHash(pointDraft.sourceRowIds, pointRows) ?? undefined : undefined;
  const point = pointDraft ? createPoint(project, pointDraft, batch, migratedAt, normalizedDataHash, pipeline) : null;
  const projectV2: ProjectWorkspaceV2 = {
    projectId: project.projectId,
    projectName: project.projectName,
    mode: project.mode,
    workspaceRevision: 1,
    points: point ? [point] : [],
    probeProfiles: createInitialProbeProfiles(migratedAt),
    deletedPoints: [],
    activePointId: point?.pointId ?? null,
    importBatches: [batch],
    activeImportBatchId: batch.batchId,
    activeRoute: point ? project.selection.activeRoute : normalizeEmptyRoute(project.selection.activeRoute),
    activeBottomTab: project.selection.activeBottomTab,
    flowFeedback: project.flowFeedback,
    createdAt: project.createdAt,
    updatedAt: migratedAt,
  };
  const dataBlocks: ImportDataBlockV2[] = [];
  if (rawDataBlockId) {
    dataBlocks.push({
      kind: 'raw',
      dataBlockId: rawDataBlockId,
      batchId,
      sourceFingerprint,
      rows: rawRows.map((row) => [...row]),
      rowReferences: pipeline?.sourceRows.map((row) => ({
        sourceRowId: row.rowId,
        sourceIndex: row.sourceIndex,
        displayRowNumber: row.displayRowNumber,
      })) ?? rawRows.map((_, index) => ({
        sourceRowId: `${batchId}:source:${revisions.source}:row:${index}`,
        sourceIndex: index,
        displayRowNumber: index + 2,
      })),
      workbookExtraction: pipeline?.sourceWorkbookExtraction ? structuredClone(pipeline.sourceWorkbookExtraction) : undefined,
      sourceAttachment: pipeline?.sourceAttachment ? { ...pipeline.sourceAttachment, bytes: [...pipeline.sourceAttachment.bytes] } : undefined,
      completeness: pipeline || draft.rawRows || rawRows.length === normalizedRows.length ? 'full' : 'preview-only',
    });
  }
  if (normalizedDataBlockId) {
    const normalizedRowReferences = pipeline
      ? pipeline.normalizedRows
          .filter((row) => row.row)
          .map((row, normalizedIndex) => ({ sourceRowId: row.sourceRowId, normalizedIndex }))
      : normalizedRows.map((_, normalizedIndex) => ({
          sourceRowId: `${batchId}:source:${revisions.source}:row:${normalizedIndex}`,
          normalizedIndex,
        }));
    dataBlocks.push({
      kind: 'normalized',
      dataBlockId: normalizedDataBlockId,
      batchId,
      sourceFingerprint,
      rows: normalizedRows.map((row) => ({ ...row })),
      rowReferences: normalizedRowReferences,
    });
  }
  return { project: projectV2, dataBlocks };
}

function createEmptyProjectV2(project: ProjectWorkspace): ProjectWorkspaceV2 {
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    mode: project.mode,
    workspaceRevision: 1,
    points: [],
    probeProfiles: createInitialProbeProfiles(project.updatedAt),
    deletedPoints: [],
    activePointId: null,
    importBatches: [],
    activeImportBatchId: null,
    activeRoute: normalizeEmptyRoute(project.selection.activeRoute),
    activeBottomTab: project.selection.activeBottomTab,
    flowFeedback: project.flowFeedback,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function createPointDraft(
  project: ProjectWorkspace,
  batch: ImportBatchDraftV2,
  pointId: string,
  draftId: string,
  pointName: string,
  rowCount: number,
  pipeline?: CsvImportPipelineV2,
): PointImportDraftV2 {
  const sourceColumnByTarget = new Map(
    batch.mappings.filter((mapping) => mapping.sourceColumnId).map((mapping) => [mapping.targetField, mapping.sourceColumnId!]),
  );
  const pointKey = normalizePointKey(pointName);
  const pipelineRows = pipeline?.normalizedRows.filter((row) => row.detectedPointKey === pointKey) ?? [];
  const resolvedPointTarget = pipeline?.pointPlan.targetDecisions?.find((decision) =>
    decision.detectedPointKey === pointKey
    && decision.state === 'confirmed'
    && decision.action !== 'pending',
  );
  const pointProblems = (pipeline?.problems ?? project.importDraft.problems).filter(
    (problem) => {
      if (problem.eventId === 'DI-E11') return false;
      if (problem.eventId === 'DI-E10' && resolvedPointTarget) return false;
      return !problem.detectedPointKey || problem.detectedPointKey === pointKey;
    },
  );
  return {
    draftId,
    batchId: batch.batchId,
    pointId,
    sourcePointName: pointName,
    sourceRowIds: pipelineRows.length
      ? pipelineRows.map((row) => row.sourceRowId)
      : Array.from({ length: rowCount }, (_, index) => `${batch.batchId}:source:${batch.revisions.source}:row:${index}`),
    dataBlockId: batch.normalizedDataBlockId!,
    valueProvenance: Object.fromEntries(
      IMPORT_TARGET_DEFINITIONS.map(({ targetField }) => {
        const pipelineValue = pipelineRows.map((row) => row.values[targetField]).find(Boolean);
        if (pipelineValue) {
          return [targetField, {
            origin: pipelineValue.origin,
            sourceColumnId: pipelineValue.sourceColumnId,
            derivedFrom: pipelineValue.derivedFrom ? [...pipelineValue.derivedFrom] : undefined,
            defaultReason: pipelineValue.defaultReason,
            sourceUnit: pipelineValue.sourceUnit,
            standardUnit: pipelineValue.standardUnit,
          }];
        }
        const sourceColumnId = sourceColumnByTarget.get(targetField);
        return [targetField, sourceColumnId ? { origin: 'source' as const, sourceColumnId } : { origin: 'missing' as const }];
      }),
    ),
    revisions: { ...batch.revisions },
    problems: pointProblems.map((problem) => ({ ...problem })),
    status: pointProblems.some((problem) => problem.severity === 'issue') ? 'issue' : 'ready',
  };
}

function createPoint(
  project: ProjectWorkspace,
  pointDraft: PointImportDraftV2,
  batch: ImportBatchDraftV2,
  migratedAt: string,
  normalizedDataHash?: string,
  pipeline?: CsvImportPipelineV2,
): PointWorkspaceV2 {
  const dependency: ArtifactDependency = {
    pointId: pointDraft.pointId,
    draftId: pointDraft.draftId,
    batchId: batch.batchId,
    revisions: { ...pointDraft.revisions },
  };
  const hasCurrentImportedCheck = Boolean(
    project.checkRunId
    && project.checkedDraftVersion === project.importDraft.version
    && project.checkRunHistory.some((record) =>
      record.runId === project.checkRunId
      && record.draftVersion === project.importDraft.version
      && record.conclusion !== '需重新检查',
    ),
  );
  const checkState = project.importDraft.pointDecision === 'new-point' && !hasCurrentImportedCheck
    ? { activeRunId: null, runs: [], legacyHistory: [], artifact: emptyArtifactState() }
    : migrateCheckState(project, dependency, normalizedDataHash);
  const base = createEmptyPointWorkspace(pointDraft.pointId, pointDraft.sourcePointName, migratedAt);
  const u2Count = pipeline
    ? pipeline.normalizedRows.filter(
        (row) =>
          (row.values.u2?.origin === 'source' || row.values.u2?.origin === 'assistant-cleanup') &&
          row.values.u2.normalizedValue !== null,
      ).length
    : project.importDraft.valueProvenance?.u2?.origin === 'source'
      ? project.importDraft.rows.length
      : 0;
  return {
    ...base,
    aliases:
      project.importDraft.pointDecision === 'new-point'
        ? []
        : project.flowCase.point.pointAlias
          ? [project.flowCase.point.pointAlias]
          : [],
    waterDepthM: project.importDraft.waterDepthM,
    finalDepthM: project.importDraft.finalDepthM,
    importDrafts: [pointDraft],
    activeImportDraftId: pointDraft.draftId,
    checkState,
    stratificationState: emptyArtifactState(),
    parameterState: emptyArtifactState(),
    outputState: emptyArtifactState(),
    waterContext: {
      ...base.waterContext!,
      channelState: u2Count === 0 ? 'absent' : u2Count === project.importDraft.rows.length ? 'present' : 'partial',
      waterDepthM: u2Count === project.importDraft.rows.length ? project.importDraft.waterDepthM : null,
      confirmedAt: null,
    },
    selection: {
      selectedImportBatchId: batch.batchId,
      selectedCheckIssueId: project.selection.selectedCheckIssueId,
      selectedSchemeId: project.selection.selectedSchemeId,
      selectedLayerId: project.selection.selectedLayerId,
      selectedBoundaryId: project.selection.selectedBoundaryId,
      selectedParameterSchemeId: project.selection.selectedParameterSchemeId,
      selectedParameterSlotId: project.selection.selectedParameterSlotId,
      selectedOutputItemId: project.selection.selectedOutputItemId,
      selectedMappingField: project.selectedMappingField,
      importFocusField: project.importFocusField,
      selectedCheckFilter: project.selectedCheckFilter,
    },
    createdAt: project.createdAt,
    updatedAt: migratedAt,
  };
}

function migrateCheckState(project: ProjectWorkspace, dependency: ArtifactDependency, normalizedDataHash?: string): CheckStateV2 {
  const currentRuns = project.checkRunHistory.filter(
    (record) =>
      project.checkedDraftVersion === project.importDraft.version &&
      record.draftVersion === project.importDraft.version &&
      record.conclusion !== '需重新检查',
  );
  const runs = currentRuns.map((record) => ({
    runId: record.runId,
    input: { ...dependency, revisions: { ...dependency.revisions } },
    status: 'completed' as const,
    counts: { ...record.counts },
    conclusion: record.conclusion as '无问题' | '存在问题',
    issueIds: [...(record.issueIds ?? [])],
    normalizedDataHash,
    createdAt: record.createdAt,
    completedAt: record.createdAt,
  }));
  const currentIds = new Set(runs.map((run) => run.runId));
  const legacyHistory = project.checkRunHistory
    .filter((record) => !currentIds.has(record.runId))
    .map((record) => ({ ...record, counts: { ...record.counts }, reason: 'V1 记录无法唯一绑定到迁移后的活动草稿。' }));
  const activeRun = runs.find((run) => run.runId === project.checkRunId) ?? runs[0] ?? null;
  return {
    activeRunId: activeRun?.runId ?? null,
    runs,
    legacyHistory,
    artifact: activeRun
      ? {
          status: activeRun.conclusion === '存在问题' ? 'problem' : 'current',
          input: { ...dependency, revisions: { ...dependency.revisions } },
        }
      : legacyHistory.length
        ? {
            status: 'stale',
            input: null,
            staleReason: 'V1 检查记录无法证明与当前草稿版本一致。',
            recoveryTarget: { route: 'check', reasonCode: 'MIGRATION-CHECK-STALE' },
          }
        : emptyArtifactState(),
  };
}

function getStablePointId(
  project: ProjectWorkspace,
  pointName: string,
  forceNewPoint: boolean,
  importIdentity: string,
) {
  if (forceNewPoint) {
    return `point-v2-${safeId(project.projectId)}-${safeId(pointName)}-${safeId(importIdentity)}`;
  }
  const existing = project.flowCase.point.pointId.trim();
  return existing && !['待导入点位', 'pending-point'].includes(existing)
    ? existing
    : `point-v2-${safeId(project.projectId)}-${safeId(pointName)}`;
}

function normalizeEmptyRoute(route: ProjectWorkspace['selection']['activeRoute']) {
  return ['project', 'import'].includes(route) ? route : 'project';
}

function normalizePointKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function safeId(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

export async function sha256Hex(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}
