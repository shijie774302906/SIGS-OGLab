import { JTS_STANDARD_PROBE } from '../jts/jtsT242Domain';
import { markParameterWorkspaceStale } from '../parameters/parameterDomain';
import { markStratificationWorkspaceStale } from '../stratification/stratificationDomain';
import {
  emptyArtifactState,
  emptyDataGovernanceWorkspace,
  type DeletedPointRecordV3,
  type PointProbeContextV3,
  type PointWaterContextV3,
  type PointWorkspaceV2,
  type ProbeProfileV3,
  type ProjectWorkspaceV2,
  type WorkflowArtifactState,
} from './workspaceV2';

export const BUILTIN_JTS_PROBE_PROFILE_ID = 'probe-profile-jts-t242-standard';
export const BUILTIN_JTS_PROBE_REVISION_ID = 'probe-profile-jts-t242-standard-rev-1';
const RESERVED_POINT_NAMES = new Set(['待导入点位', 'pending-point']);

export function isReservedPointName(value: string) {
  return RESERVED_POINT_NAMES.has(normalizeKey(value));
}

export function withoutReservedPointAliases(aliases: readonly string[]) {
  return unique(aliases.filter((alias) => !isReservedPointName(alias)));
}

export type PointLifecycleResult =
  | { ok: true; project: ProjectWorkspaceV2; point: PointWorkspaceV2; notice?: string }
  | { ok: false; problem: string; field?: 'point-name' | 'probe' | 'water-depth' | 'pressure-datum' | 'test-zero' };

export function createInitialProbeProfiles(now: string): ProbeProfileV3[] {
  return [{
    profileId: BUILTIN_JTS_PROBE_PROFILE_ID,
    revisionId: BUILTIN_JTS_PROBE_REVISION_ID,
    kind: 'jts_builtin',
    name: 'JTS 标准 10 cm² 探头',
    coneBaseAreaCm2: JTS_STANDARD_PROBE.coneBaseAreaCm2,
    effectiveAreaRatio: JTS_STANDARD_PROBE.effectiveAreaRatio,
    porePressurePosition: JTS_STANDARD_PROBE.porePressurePosition,
    createdAt: now,
    updatedAt: now,
  }];
}

export function ensurePointLifecycleProject(project: ProjectWorkspaceV2, now = new Date().toISOString()) {
  const probeProfiles = project.probeProfiles?.length ? project.probeProfiles : createInitialProbeProfiles(now);
  const deletedPoints = project.deletedPoints ?? [];
  let pointsChanged = false;
  const points = project.points.map((point) => {
    const prepared = ensurePointContexts(point, now);
    const aliases = withoutReservedPointAliases(prepared.aliases ?? []);
    const aliasesUnchanged = aliases.length === (point.aliases?.length ?? 0)
      && aliases.every((alias, index) => alias === point.aliases[index]);
    if (
      prepared.probeContext === point.probeContext
      && prepared.waterContext === point.waterContext
      && prepared.derivationState === point.derivationState
      && prepared.dataGovernance === point.dataGovernance
      && aliasesUnchanged
    ) return point;
    pointsChanged = true;
    return {
      ...prepared,
      aliases,
    };
  });
  if (
    probeProfiles === project.probeProfiles
    && deletedPoints === project.deletedPoints
    && !pointsChanged
  ) return project;
  return {
    ...project,
    probeProfiles,
    deletedPoints,
    points,
  };
}

export function createNameOnlyPoint(
  project: ProjectWorkspaceV2,
  pointName: string,
  now = new Date().toISOString(),
  pointId = createIdentifier('point'),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const normalized = normalizeName(pointName);
  const nameProblem = validateNewPointName(prepared, normalized);
  if (nameProblem) return { ok: false, problem: nameProblem, field: 'point-name' };
  if (!pointId.trim() || prepared.points.some((point) => point.pointId === pointId)) {
    return { ok: false, problem: '点位标识为空或已经存在。' };
  }
  const point = createEmptyPointWorkspace(pointId, normalized, now);
  return {
    ok: true,
    point,
    project: touchProject({
      ...prepared,
      points: [...prepared.points, point],
      activePointId: point.pointId,
      activeImportBatchId: null,
      activeRoute: 'project',
      flowFeedback: `已创建点位 ${point.pointName}，请确认探头后导入数据。`,
    }, now),
  };
}

export function selectPoint(project: ProjectWorkspaceV2, pointId: string, now = new Date().toISOString()): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const point = prepared.points.find((candidate) => candidate.pointId === pointId);
  if (!point) return { ok: false, problem: '目标点位已经不存在，请刷新点位树。' };
  const activeDraft = point.importDrafts.find((draft) => draft.draftId === point.activeImportDraftId);
  return {
    ok: true,
    point,
    project: touchProject({
      ...prepared,
      activePointId: point.pointId,
      activeImportBatchId: activeDraft?.batchId || point.selection.selectedImportBatchId || null,
      flowFeedback: `已选择点位 ${point.pointName}。`,
    }, now),
  };
}

export function renamePoint(
  project: ProjectWorkspaceV2,
  pointId: string,
  nextName: string,
  now = new Date().toISOString(),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const point = prepared.points.find((candidate) => candidate.pointId === pointId);
  if (!point) return { ok: false, problem: '待重命名点位已经不存在。' };
  const normalized = normalizeName(nextName);
  if (!normalized) return { ok: false, problem: '请输入点位名称。', field: 'point-name' };
  if (isReservedPointName(normalized)) return { ok: false, problem: '请输入真实点位名称，不能使用“待导入点位”。', field: 'point-name' };
  if (prepared.points.some((candidate) => candidate.pointId !== pointId && normalizeKey(candidate.pointName) === normalizeKey(normalized))) {
    return { ok: false, problem: '点位名称已存在，请使用其他名称。', field: 'point-name' };
  }
  const aliases = withoutReservedPointAliases(point.aliases ?? []);
  const renamed = {
    ...point,
    pointName: normalized,
    aliases: unique(isReservedPointName(point.pointName) ? aliases : [...aliases, point.pointName]),
    updatedAt: now,
  };
  return {
    ok: true,
    point: renamed,
    project: touchProject({
      ...prepared,
      points: prepared.points.map((candidate) => candidate.pointId === pointId ? renamed : candidate),
      flowFeedback: `点位已重命名为 ${normalized}。`,
    }, now),
  };
}

export function duplicatePoint(
  project: ProjectWorkspaceV2,
  sourcePointId: string,
  nextName: string,
  now = new Date().toISOString(),
  pointId = createIdentifier('point'),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const source = prepared.points.find((candidate) => candidate.pointId === sourcePointId);
  if (!source) return { ok: false, problem: '待复制点位已经不存在。' };
  const normalized = normalizeName(nextName);
  const nameProblem = validateNewPointName(prepared, normalized);
  if (nameProblem) return { ok: false, problem: nameProblem, field: 'point-name' };
  if (!pointId.trim() || prepared.points.some((point) => point.pointId === pointId)) {
    return { ok: false, problem: '复制点位标识为空或已经存在。' };
  }
  const duplicate = createEmptyPointWorkspace(pointId, normalized, now);
  // Aliases are import identity authority, not reusable point settings. Copying
  // them would make the new point collide with its source on the next save.
  duplicate.aliases = [];
  duplicate.probeContext = cloneProbeContextForPoint(source.probeContext, pointId, now);
  duplicate.waterContext = cloneWaterContextForPoint(source.waterContext, pointId, now);
  duplicate.waterDepthM = duplicate.waterContext.waterDepthM ?? 0;
  return {
    ok: true,
    point: duplicate,
    notice: '已复制点位上下文；源文件、检查、分层、参数和输出不会复制，请为新点位导入数据。',
    project: touchProject({
      ...prepared,
      points: [...prepared.points, duplicate],
      activePointId: duplicate.pointId,
      activeImportBatchId: null,
      activeRoute: 'project',
      flowFeedback: `已复制 ${source.pointName} 的点位设置为 ${duplicate.pointName}；测量与解译结果未复制。`,
    }, now),
  };
}

export function deletePoint(
  project: ProjectWorkspaceV2,
  pointId: string,
  now = new Date().toISOString(),
  deletionId = createIdentifier('point-deletion'),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const originalIndex = prepared.points.findIndex((candidate) => candidate.pointId === pointId);
  if (originalIndex < 0) return { ok: false, problem: '待删除点位已经不存在。' };
  const point = prepared.points[originalIndex];
  const record: DeletedPointRecordV3 = {
    deletionId,
    pointId: point.pointId,
    pointName: point.pointName,
    originalIndex,
    snapshot: structuredClone(point),
    deletedAt: now,
  };
  const remaining = prepared.points.filter((candidate) => candidate.pointId !== pointId);
  const nextActive = prepared.activePointId === pointId
    ? remaining[Math.min(originalIndex, Math.max(remaining.length - 1, 0))]?.pointId ?? null
    : prepared.activePointId;
  const nextActivePoint = remaining.find((candidate) => candidate.pointId === nextActive);
  const nextActiveDraft = nextActivePoint?.importDrafts.find((draft) => draft.draftId === nextActivePoint.activeImportDraftId);
  return {
    ok: true,
    point,
    notice: '点位已移入项目回收记录，可从点位工具恢复。',
    project: touchProject({
      ...prepared,
      points: remaining,
      deletedPoints: [...(prepared.deletedPoints ?? []), record],
      activePointId: nextActive,
      activeImportBatchId: nextActiveDraft?.batchId || nextActivePoint?.selection.selectedImportBatchId || null,
      activeRoute: nextActive ? prepared.activeRoute : 'project',
      flowFeedback: `点位 ${point.pointName} 已删除，可从回收记录恢复。`,
    }, now),
  };
}

export function restorePoint(
  project: ProjectWorkspaceV2,
  deletionId: string,
  now = new Date().toISOString(),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const record = prepared.deletedPoints?.find((candidate) => candidate.deletionId === deletionId);
  if (!record) return { ok: false, problem: '没有找到可恢复的点位记录。' };
  if (prepared.points.some((point) => point.pointId === record.pointId)) return { ok: false, problem: '原点位标识已被占用，不能恢复。' };
  if (prepared.points.some((point) => normalizeKey(point.pointName) === normalizeKey(record.pointName))) {
    return { ok: false, problem: '当前已有同名点位，请先重命名后再恢复。', field: 'point-name' };
  }
  const restored = ensurePointContexts(structuredClone(record.snapshot), now);
  restored.aliases = withoutReservedPointAliases(restored.aliases ?? []);
  restored.updatedAt = now;
  const points = [...prepared.points];
  points.splice(Math.min(record.originalIndex, points.length), 0, restored);
  const restoredDraft = restored.importDrafts.find((draft) => draft.draftId === restored.activeImportDraftId);
  return {
    ok: true,
    point: restored,
    project: touchProject({
      ...prepared,
      points,
      deletedPoints: prepared.deletedPoints?.filter((candidate) => candidate.deletionId !== deletionId) ?? [],
      activePointId: restored.pointId,
      activeImportBatchId: restoredDraft?.batchId || restored.selection.selectedImportBatchId || null,
      flowFeedback: `已恢复点位 ${restored.pointName}。`,
    }, now),
  };
}

export function confirmPointProbe(
  project: ProjectWorkspaceV2,
  pointId: string,
  profileId: string,
  now = new Date().toISOString(),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const point = prepared.points.find((candidate) => candidate.pointId === pointId);
  if (!point) return { ok: false, problem: '目标点位已经不存在。' };
  const profile = prepared.probeProfiles?.find((candidate) => candidate.profileId === profileId);
  if (!profile) return { ok: false, problem: '探头配置已经不存在，请重新选择。', field: 'probe' };
  if (!isValidProbeProfile(profile)) return { ok: false, problem: '探头面积、有效面积比或孔压位置存在问题。', field: 'probe' };
  const current = point.probeContext as PointProbeContextV3;
  if (current.activeProfileId === profile.profileId && current.activeProfileRevisionId === profile.revisionId && current.confirmedAt) {
    return { ok: true, project: prepared, point, notice: '当前探头已经确认。' };
  }
  const nextPoint = invalidatePointInterpretation({
    ...point,
    probeContext: {
      revisionId: `${point.pointId}:probe-context:${current.revision + 1}`,
      revision: current.revision + 1,
      activeProfileId: profile.profileId,
      activeProfileRevisionId: profile.revisionId,
      confirmedAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  }, `探头已切换为 ${profile.name}，依赖结果需要更新。`, now, 'probe');
  return replacePoint(prepared, nextPoint, now, `已确认 ${profile.name}。`);
}

export function updatePointWaterContext(
  project: ProjectWorkspaceV2,
  pointId: string,
  patch: Pick<PointWaterContextV3, 'channelState' | 'waterDepthM' | 'u2HydrostaticDatum' | 'testZeroDatum' | 'boreholeBottomDepthM' | 'waterUnitWeightKnM3'>,
  now = new Date().toISOString(),
): PointLifecycleResult {
  const prepared = ensurePointLifecycleProject(project, now);
  const point = prepared.points.find((candidate) => candidate.pointId === pointId);
  if (!point) return { ok: false, problem: '目标点位已经不存在。' };
  if (!Number.isFinite(patch.waterUnitWeightKnM3) || patch.waterUnitWeightKnM3 <= 0) {
    return { ok: false, problem: '水重度必须是大于 0 的有限值。', field: 'pressure-datum' };
  }
  if (patch.channelState === 'partial') return { ok: false, problem: 'u2 通道只有部分行，需排除、修复或重新上传后才能确认。', field: 'pressure-datum' };
  if (patch.channelState === 'present' && (!Number.isFinite(patch.waterDepthM) || (patch.waterDepthM as number) < 0)) {
    return { ok: false, problem: '完整 u2 通道必须确认非负有限水深。', field: 'water-depth' };
  }
  if (patch.testZeroDatum === 'borehole_bottom') {
    return { ok: false, problem: '当前版本不接收引孔底部测试零点；请先按 JTS 6.1.5 同时修正 qc 和 u2。', field: 'test-zero' };
  }
  const current = point.waterContext as PointWaterContextV3;
  const normalizedWaterDepthM = patch.channelState === 'absent' ? null : patch.waterDepthM;
  const unchanged = current.confirmedAt
    && current.channelState === patch.channelState
    && current.waterDepthM === normalizedWaterDepthM
    && current.u2HydrostaticDatum === patch.u2HydrostaticDatum
    && current.testZeroDatum === patch.testZeroDatum
    && current.boreholeBottomDepthM === null
    && current.waterUnitWeightKnM3 === patch.waterUnitWeightKnM3;
  if (unchanged) {
    return { ok: true, project: prepared, point, notice: '当前水深与孔压基准已经确认。' };
  }
  const nextWater: PointWaterContextV3 = {
    ...patch,
    waterDepthM: normalizedWaterDepthM,
    boreholeBottomDepthM: null,
    revisionId: `${point.pointId}:water-context:${current.revision + 1}`,
    revision: current.revision + 1,
    confirmedAt: patch.channelState === 'unknown' ? null : now,
    updatedAt: now,
  };
  const nextPoint = invalidatePointInterpretation({
    ...point,
    waterContext: nextWater,
    waterDepthM: nextWater.waterDepthM ?? 0,
    updatedAt: now,
  }, '水深或孔压基准已变化，依赖结果需要更新。', now, patch.channelState === 'present' ? 'water-depth' : 'pressure-datum');
  return replacePoint(prepared, nextPoint, now, patch.channelState === 'absent'
    ? '已确认无 u2，点位使用 CPT 近似路线。'
    : '已确认点位水深与孔压基准。');
}

export function createEmptyPointWorkspace(pointId: string, pointName: string, now: string): PointWorkspaceV2 {
  return {
    pointId,
    pointName,
    aliases: [],
    waterDepthM: 0,
    finalDepthM: 0,
    importDrafts: [],
    activeImportDraftId: null,
    checkState: { activeRunId: null, runs: [], legacyHistory: [], artifact: emptyArtifactState() },
    stratificationState: emptyArtifactState(),
    parameterState: emptyArtifactState(),
    outputState: emptyArtifactState(),
    probeContext: createEmptyProbeContext(pointId, now),
    waterContext: createEmptyWaterContext(pointId, now),
    derivationState: { status: 'empty', input: null },
    dataGovernance: emptyDataGovernanceWorkspace(),
    selection: {
      selectedImportBatchId: '',
      selectedCheckIssueId: '',
      selectedSchemeId: '',
      selectedLayerId: '',
      selectedBoundaryId: '',
      selectedParameterSchemeId: '',
      selectedParameterSlotId: '',
      selectedOutputItemId: '',
      selectedMappingField: 'DepthM',
      importFocusField: null,
      selectedCheckFilter: 'all',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function ensurePointContexts(point: PointWorkspaceV2, now: string): PointWorkspaceV2 {
  return {
    ...point,
    probeContext: point.probeContext ?? createEmptyProbeContext(point.pointId, now),
    waterContext: point.waterContext ?? {
      ...createEmptyWaterContext(point.pointId, now),
      channelState: point.importDrafts.length ? 'unknown' : 'unknown',
      waterDepthM: point.waterDepthM > 0 ? point.waterDepthM : null,
    },
    derivationState: point.derivationState ?? { status: 'empty', input: null },
    dataGovernance: point.dataGovernance ?? emptyDataGovernanceWorkspace(),
  };
}

function createEmptyProbeContext(pointId: string, now: string): PointProbeContextV3 {
  return {
    revisionId: `${pointId}:probe-context:1`,
    revision: 1,
    activeProfileId: null,
    activeProfileRevisionId: null,
    confirmedAt: null,
    updatedAt: now,
  };
}

function createEmptyWaterContext(pointId: string, now: string): PointWaterContextV3 {
  return {
    revisionId: `${pointId}:water-context:1`,
    revision: 1,
    channelState: 'unknown',
    waterDepthM: null,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
    confirmedAt: null,
    updatedAt: now,
  };
}

function cloneProbeContextForPoint(context: PointProbeContextV3 | undefined, pointId: string, now: string): PointProbeContextV3 {
  const source = context ?? createEmptyProbeContext(pointId, now);
  return { ...source, revisionId: `${pointId}:probe-context:1`, revision: 1, confirmedAt: source.confirmedAt ? now : null, updatedAt: now };
}

function cloneWaterContextForPoint(context: PointWaterContextV3 | undefined, pointId: string, now: string): PointWaterContextV3 {
  const source = context ?? createEmptyWaterContext(pointId, now);
  return { ...source, revisionId: `${pointId}:water-context:1`, revision: 1, confirmedAt: source.confirmedAt ? now : null, updatedAt: now };
}

function invalidatePointInterpretation(
  point: PointWorkspaceV2,
  reason: string,
  now: string,
  field: 'probe' | 'water-depth' | 'pressure-datum',
): PointWorkspaceV2 {
  const derivationState = point.derivationState ?? { status: 'empty' as const, input: null };
  const checkArtifact = point.checkState.artifact;
  return {
    ...point,
    checkState: {
      ...point.checkState,
      artifact: checkArtifact.status === 'empty' && !checkArtifact.input
        ? checkArtifact
        : {
            ...checkArtifact,
            status: 'stale',
            staleReason: reason,
            invalidatedAt: now,
            recoveryTarget: { route: 'check', reasonCode: 'POINT-CONTEXT-CHANGED' },
          },
    },
    derivationState: derivationState.status === 'empty' && !derivationState.input
      ? derivationState
      : { ...derivationState, status: 'stale', staleReason: reason, invalidatedAt: now, recoveryTarget: { route: 'project', field } },
    stratificationWorkspace: markStratificationWorkspaceStale(point.stratificationWorkspace, reason),
    parameterWorkspace: markParameterWorkspaceStale(point.parameterWorkspace, reason),
    stratificationState: staleArtifact(point.stratificationState, reason, now),
    parameterState: staleArtifact(point.parameterState, reason, now),
    outputState: staleArtifact(point.outputState, reason, now),
    outputWorkspace: invalidateOutputWorkspace(point.outputWorkspace, reason),
  };
}

function invalidateOutputWorkspace(
  workspace: PointWorkspaceV2['outputWorkspace'],
  reason: string,
): PointWorkspaceV2['outputWorkspace'] {
  if (!workspace) return workspace;
  return {
    revisions: workspace.revisions.map((revision) => revision.status === 'current'
      ? { ...revision, status: 'stale' as const, staleReason: reason }
      : revision),
    activeRevisionIds: {},
  };
}

function staleArtifact(state: WorkflowArtifactState, reason: string, now: string): WorkflowArtifactState {
  if (state.status === 'empty' && !state.input) return state;
  return {
    ...state,
    status: 'stale',
    staleReason: reason,
    invalidatedAt: now,
    recoveryTarget: { route: 'project', reasonCode: 'POINT-CONTEXT-CHANGED' },
  };
}

function replacePoint(project: ProjectWorkspaceV2, point: PointWorkspaceV2, now: string, feedback: string): PointLifecycleResult {
  return {
    ok: true,
    point,
    project: touchProject({
      ...project,
      points: project.points.map((candidate) => candidate.pointId === point.pointId ? point : candidate),
      flowFeedback: feedback,
    }, now),
  };
}

function touchProject(project: ProjectWorkspaceV2, now: string): ProjectWorkspaceV2 {
  return { ...project, workspaceRevision: project.workspaceRevision + 1, updatedAt: now };
}

function validateNewPointName(project: ProjectWorkspaceV2, name: string) {
  if (!name) return '请输入点位名称。';
  if (isReservedPointName(name)) return '请输入真实点位名称，不能使用“待导入点位”。';
  if (name.length > 80) return '点位名称不能超过 80 个字符。';
  if (project.points.some((point) => normalizeKey(point.pointName) === normalizeKey(name))) return '点位名称已存在，请使用其他名称。';
  return null;
}

function isValidProbeProfile(profile: ProbeProfileV3) {
  return Number.isFinite(profile.coneBaseAreaCm2)
    && profile.coneBaseAreaCm2 > 0
    && Number.isFinite(profile.effectiveAreaRatio)
    && profile.effectiveAreaRatio > 0
    && profile.effectiveAreaRatio <= 1
    && profile.porePressurePosition !== 'none';
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeKey(value: string) {
  return normalizeName(value).toLocaleLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function createIdentifier(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}
