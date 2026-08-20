import type { CsvImportPipelineV2, NormalizedSourceRowV2 } from './importPipeline';
import type {
  ImportBatchDraftV2,
  ImportDataBlockV2,
  PointImportDraftV2,
  PointTargetDecisionV2,
  PointWorkspaceV2,
  ProjectWorkspaceV2,
  TargetFieldKey,
  WorkflowArtifactState,
} from '../workspace/workspaceV2';
import { emptyArtifactState } from '../workspace/workspaceV2';
import { markStratificationWorkspaceStale } from '../stratification/stratificationDomain';
import { markParameterWorkspaceStale } from '../parameters/parameterDomain';
import { createEmptyPointWorkspace, ensurePointLifecycleProject } from '../workspace/pointLifecycle';
import { invalidateDataGovernance } from '../check/dataGovernance';

export type PointGenerationFailureCode =
  | 'WORKSPACE-REVISION-CHANGED'
  | 'BATCH-NOT-FOUND'
  | 'PLAN-NOT-READY'
  | 'NORMALIZED-BLOCK-MISSING'
  | 'POINT-TARGET-NOT-FOUND'
  | 'POINT-TARGET-DUPLICATE'
  | 'POINT-ACTIVE-DRAFT-CHANGED'
  | 'POINT-NAME-CONFLICT'
  | 'NOTHING-TO-GENERATE';

export type PointGenerationResult =
  | {
      ok: true;
      project: ProjectWorkspaceV2;
      generated: Array<{ detectedPointKey: string; pointId: string; draftId: string; action: PointTargetDecisionV2['action'] }>;
    }
  | { ok: false; code: PointGenerationFailureCode; message: string };

export function generatePointDrafts(
  project: ProjectWorkspaceV2,
  pipeline: CsvImportPipelineV2,
  dataBlocks: ImportDataBlockV2[],
  now = new Date().toISOString(),
): PointGenerationResult {
  project = ensurePointLifecycleProject(project, now);
  if (project.workspaceRevision !== pipeline.baseWorkspaceRevision) {
    return failure('WORKSPACE-REVISION-CHANGED', '项目状态已经变化，请刷新点位计划后重新确认。');
  }
  const batch = project.importBatches.find(
    (candidate): candidate is ImportBatchDraftV2 => candidate.kind === 'draft' && candidate.batchId === pipeline.batchId,
  );
  if (!batch) return failure('BATCH-NOT-FOUND', '当前导入批次不存在，请重新打开数据导入。');
  if (pipeline.pointPlan.state !== 'ready' || !pipeline.readiness.canGenerateDrafts) {
    return failure('PLAN-NOT-READY', '点位计划仍有问题，请完成拆分范围和逐点目标决策。');
  }
  const normalizedBlock = dataBlocks.find(
    (block) => block.kind === 'normalized'
      && block.dataBlockId === batch.normalizedDataBlockId
      && block.batchId === batch.batchId
      && block.sourceFingerprint === batch.sourceFingerprint,
  );
  if (!normalizedBlock || normalizedBlock.kind !== 'normalized') {
    return failure('NORMALIZED-BLOCK-MISSING', '标准化数据块缺失，不能生成点位草稿。');
  }

  const decisions = (pipeline.pointPlan.targetDecisions ?? []).filter((decision) =>
    pipeline.pointPlan.selectedPointKeys.includes(decision.detectedPointKey)
    && decision.state === 'confirmed'
    && !['pending', 'skip'].includes(decision.action),
  );
  const assignedTargetIds = decisions
    .filter((decision) => ['append-draft', 'replace-active-draft'].includes(decision.action))
    .map((decision) => decision.targetPointId)
    .filter((pointId): pointId is string => Boolean(pointId));
  if (new Set(assignedTargetIds).size !== assignedTargetIds.length) {
    return failure('POINT-TARGET-DUPLICATE', '同一批次中的多个来源点位不能写入同一个目标点位，请重新确认目标。');
  }
  const pendingDecisions = decisions.filter((decision) =>
    !pipeline.pointPlan.executions.some((execution) =>
      execution.detectedPointKey === decision.detectedPointKey && execution.status === 'generated',
    ),
  );
  if (!pendingDecisions.length) {
    return failure('NOTHING-TO-GENERATE', '当前批次没有尚未生成的就绪点位。');
  }

  const prepared: Array<{
    decision: PointTargetDecisionV2;
    point: PointWorkspaceV2;
    draft: PointImportDraftV2;
    isNewPoint: boolean;
  }> = [];
  const reservedIdentities = new Map<string, string>();
  const reservedPointIds = new Set([
    ...project.points.map((point) => point.pointId),
    ...project.deletedPoints.map((record) => record.pointId),
  ]);
  project.points.forEach((point) => {
    [point.pointName, ...point.aliases].forEach((identity) => reservedIdentities.set(normalizePointKey(identity), point.pointId));
  });

  for (const decision of pendingDecisions) {
    const detected = pipeline.pointPlan.detectedPoints.find((point) => point.pointKey === decision.detectedPointKey);
    if (!detected) return failure('PLAN-NOT-READY', '点位计划引用了无法识别的源点位。');
    const sourceRows = pipeline.normalizedRows.filter((row) => row.detectedPointKey === decision.detectedPointKey && row.row);
    if (!sourceRows.length) return failure('PLAN-NOT-READY', `点位 ${detected.pointName} 没有可生成的数据行。`);

    const target = decision.targetPointId
      ? project.points.find((point) => point.pointId === decision.targetPointId)
      : undefined;
    if (['append-draft', 'replace-active-draft'].includes(decision.action) && !target) {
      return failure('POINT-TARGET-NOT-FOUND', `点位 ${detected.pointName} 的目标点位已经不存在，请重新选择。`);
    }
    if (
      decision.action === 'replace-active-draft'
      && decision.expectedActiveDraftId !== target?.activeImportDraftId
    ) {
      return failure('POINT-ACTIVE-DRAFT-CHANGED', `点位 ${target?.pointName ?? detected.pointName} 的活动草稿已经变化，请重新确认替换。`);
    }

    const targetName = ['create-point', 'rename-and-create'].includes(decision.action)
      ? (decision.proposedPointName ?? detected.pointName).trim()
      : target!.pointName;
    const pointId = target?.pointId ?? allocateStablePointId(
      project.projectId,
      targetName,
      batch.batchId,
      decision.detectedPointKey,
      reservedPointIds,
    );
    if (!target) {
      const identityOwner = reservedIdentities.get(normalizePointKey(targetName));
      if (identityOwner && identityOwner !== pointId) {
        return failure('POINT-NAME-CONFLICT', `点位名称 ${targetName} 已被占用，请重新命名。`);
      }
      reservedIdentities.set(normalizePointKey(targetName), pointId);
      reservedPointIds.add(pointId);
    }

    const draftId = stableDraftId(batch.batchId, pointId, decision.detectedPointKey);
    const draft = createPointDraft(pipeline, batch, pointId, draftId, detected.pointName, sourceRows);
    const point = target
      ? withGeneratedDraft(target, draft, sourceRows, batch.source.fileName, now)
      : createPointWorkspace(pointId, targetName, draft, sourceRows, now);
    prepared.push({ decision, point, draft, isNewPoint: !target });
  }

  const pointById = new Map(project.points.map((point) => [point.pointId, point]));
  prepared.forEach(({ point }) => pointById.set(point.pointId, point));
  const existingOrder = project.points.map((point) => pointById.get(point.pointId)!);
  const newPoints = prepared.filter((item) => item.isNewPoint).map((item) => item.point);
  const generated = prepared.map(({ decision, point, draft }) => ({
    detectedPointKey: decision.detectedPointKey,
    pointId: point.pointId,
    draftId: draft.draftId,
    action: decision.action,
  }));
  const generatedByKey = new Map(generated.map((item) => [item.detectedPointKey, item]));
  const executions = pipeline.pointPlan.executions.map((execution) => {
    const result = generatedByKey.get(execution.detectedPointKey);
    return result
      ? { ...execution, status: 'generated' as const, resultPointId: result.pointId, resultDraftId: result.draftId, errorCode: undefined }
      : { ...execution };
  });
  const generatedDraftIds = unique([...batch.generatedDraftIds, ...generated.map((item) => item.draftId)]);
  const hasRemaining = executions.some((execution) => execution.status !== 'generated');
  const nextBatch: ImportBatchDraftV2 = {
    ...batch,
    baseWorkspaceRevision: project.workspaceRevision + 1,
    workflowState: hasRemaining ? 'partially-generated' : 'generated',
    generatedDraftIds,
    pointPlan: {
      ...pipeline.pointPlan,
      detectedPoints: pipeline.pointPlan.detectedPoints.map((point) => ({ ...point })),
      selectedPointKeys: [...pipeline.pointPlan.selectedPointKeys],
      conflicts: pipeline.pointPlan.conflicts.map((conflict) => ({ ...conflict })),
      targetDecisions: pipeline.pointPlan.targetDecisions?.map((decision) => ({ ...decision })),
      executions,
    },
    updatedAt: now,
  };
  const firstGeneratedPoint = prepared[0].point;
  return {
    ok: true,
    generated,
    project: {
      ...project,
      points: [...existingOrder, ...newPoints],
      activePointId: firstGeneratedPoint.pointId,
      importBatches: project.importBatches.map((candidate) => candidate.batchId === batch.batchId ? nextBatch : candidate),
      activeImportBatchId: batch.batchId,
      activeRoute: 'import',
      workspaceRevision: project.workspaceRevision + 1,
      flowFeedback: `已生成 ${generated.length} 个点位草稿，当前点位为 ${firstGeneratedPoint.pointName}。`,
      updatedAt: now,
    },
  };
}

function createPointDraft(
  pipeline: CsvImportPipelineV2,
  batch: ImportBatchDraftV2,
  pointId: string,
  draftId: string,
  sourcePointName: string,
  rows: NormalizedSourceRowV2[],
): PointImportDraftV2 {
  const representative = rows[0];
  const fields: TargetFieldKey[] = ['pointName', 'depthM', 'qc', 'qt', 'fs', 'u2', 'fr', 'waterDepth', 'finalDepth'];
  const problems = pipeline.problems.filter((problemValue) =>
    problemValue.eventId !== 'DI-E11'
    && (!problemValue.detectedPointKey || problemValue.detectedPointKey === rows[0].detectedPointKey)
    && problemValue.eventId !== 'DI-E10',
  );
  return {
    draftId,
    batchId: batch.batchId,
    pointId,
    sourcePointName,
    sourceRowIds: rows.map((row) => row.sourceRowId),
    dataBlockId: batch.normalizedDataBlockId!,
    valueProvenance: Object.fromEntries(fields.map((field) => {
      const value = representative.values[field];
      return [field, value
        ? {
            origin: value.origin,
            sourceColumnId: value.sourceColumnId,
            derivedFrom: value.derivedFrom ? [...value.derivedFrom] : undefined,
            defaultReason: value.defaultReason,
            sourceUnit: value.sourceUnit,
            standardUnit: value.standardUnit,
          }
        : { origin: 'missing' as const }];
    })),
    revisions: { ...pipeline.revisions },
    problems: problems.map((problemValue) => ({ ...problemValue })),
    status: problems.some((problemValue) => problemValue.severity === 'issue') ? 'issue' : 'ready',
  };
}

function createPointWorkspace(
  pointId: string,
  pointName: string,
  draft: PointImportDraftV2,
  rows: NormalizedSourceRowV2[],
  now: string,
): PointWorkspaceV2 {
  const firstRow = rows.find((row) => row.row)?.row;
  const base = createEmptyPointWorkspace(pointId, pointName, now);
  const channelState = getU2ChannelState(rows);
  return {
    ...base,
    waterDepthM: firstRow?.waterDepthM ?? 0,
    finalDepthM: firstRow?.finalDepthM ?? 0,
    importDrafts: [draft],
    activeImportDraftId: draft.draftId,
    waterContext: {
      ...base.waterContext!,
      channelState,
      waterDepthM: null,
      confirmedAt: null,
    },
    selection: {
      selectedImportBatchId: draft.batchId,
      selectedCheckIssueId: '',
      selectedSchemeId: '',
      selectedLayerId: '',
      selectedBoundaryId: '',
      selectedParameterSchemeId: '',
      selectedParameterSlotId: '',
      selectedOutputItemId: '',
      selectedMappingField: 'PointName',
      importFocusField: null,
      selectedCheckFilter: 'all',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function withGeneratedDraft(
  point: PointWorkspaceV2,
  draft: PointImportDraftV2,
  rows: NormalizedSourceRowV2[],
  sourceFileName: string,
  now: string,
): PointWorkspaceV2 {
  const previousDrafts = point.importDrafts.some((candidate) => candidate.draftId === draft.draftId)
    ? point.importDrafts
    : [...point.importDrafts, draft];
  const staleReason = `活动导入草稿已切换为 ${sourceFileName}，需要重新运行数据检查。`;
  const channelState = getU2ChannelState(rows);
  const channelChanged = channelState !== point.waterContext.channelState;
  return {
    ...point,
    importDrafts: previousDrafts,
    activeImportDraftId: draft.draftId,
    waterContext: channelChanged || point.waterContext.channelState === 'unknown'
      ? {
          ...point.waterContext,
          revisionId: `${point.pointId}:water-context:${point.waterContext.revision + 1}`,
          revision: point.waterContext.revision + 1,
          channelState,
          waterDepthM: channelState === 'present' ? point.waterContext.waterDepthM : null,
          confirmedAt: null,
          updatedAt: now,
        }
      : point.waterContext,
    checkState: {
      ...point.checkState,
      activeRunId: null,
      artifact: emptyArtifactState(),
    },
    dataGovernance: invalidateDataGovernance(point.dataGovernance, staleReason),
    derivationState: point.derivationState.status === 'empty'
      ? point.derivationState
      : {
          ...point.derivationState,
          status: 'stale',
          staleReason,
          invalidatedAt: now,
          recoveryTarget: { route: 'import', reasonCode: 'ACTIVE-DRAFT-CHANGED' },
        },
    stratificationWorkspace: markStratificationWorkspaceStale(point.stratificationWorkspace, staleReason),
    parameterWorkspace: markParameterWorkspaceStale(point.parameterWorkspace, staleReason),
    stratificationState: staleAfterDraftSwitch(point.stratificationState, staleReason, now),
    parameterState: staleAfterDraftSwitch(point.parameterState, staleReason, now),
    outputState: staleAfterDraftSwitch(point.outputState, staleReason, now),
    selection: { ...point.selection, selectedImportBatchId: draft.batchId, importFocusField: null },
    updatedAt: now,
  };
}

function getU2ChannelState(rows: NormalizedSourceRowV2[]): PointWorkspaceV2['waterContext']['channelState'] {
  const sourceCount = rows.filter((row) => row.values.u2?.origin === 'source' && row.values.u2.normalizedValue !== null).length;
  if (sourceCount === 0) return 'absent';
  if (sourceCount === rows.length) return 'present';
  return 'partial';
}

function staleAfterDraftSwitch(state: WorkflowArtifactState, staleReason: string, now: string): WorkflowArtifactState {
  if (state.status === 'empty' && !state.input) return state;
  return {
    ...state,
    status: 'stale',
    input: state.input ? { ...state.input, revisions: { ...state.input.revisions } } : null,
    staleReason,
    invalidatedAt: now,
    recoveryTarget: { route: 'check', reasonCode: 'ACTIVE-DRAFT-CHANGED' },
  };
}

function stablePointId(projectId: string, pointName: string) {
  return `point-v2-${safeId(projectId)}-${safeId(pointName)}-${identityToken(normalizePointKey(pointName))}`;
}

function allocateStablePointId(
  projectId: string,
  pointName: string,
  batchId: string,
  pointKey: string,
  reservedPointIds: ReadonlySet<string>,
) {
  const baseId = stablePointId(projectId, pointName);
  if (!reservedPointIds.has(baseId)) return baseId;
  const importToken = shortIdentityToken(`${batchId}:${pointKey}`);
  let candidate = `${baseId}-${importToken}`;
  let counter = 2;
  while (reservedPointIds.has(candidate)) {
    candidate = `${baseId}-${importToken}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function stableDraftId(batchId: string, pointId: string, pointKey: string) {
  return `draft-v2-${safeId(batchId)}-${safeId(pointId)}-${safeId(pointKey)}-${identityToken(pointKey)}`;
}

function normalizePointKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function safeId(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const ascii = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (ascii) return ascii;
  const unicode = Array.from(normalized, (character) => character.codePointAt(0)?.toString(36) ?? '0').join('-');
  return unicode ? `u-${unicode}` : 'item';
}

function identityToken(value: string) {
  const normalized = value.normalize('NFKC');
  return Array.from(normalized, (character) => character.codePointAt(0)?.toString(36) ?? '0').join('_') || '0';
}

function shortIdentityToken(value: string) {
  let hash = 2166136261;
  for (const character of value.normalize('NFKC')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function failure(code: PointGenerationFailureCode, message: string): PointGenerationResult {
  return { ok: false, code, message };
}
