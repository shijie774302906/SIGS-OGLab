import type {
  ArtifactDependency,
  MajorGroupReviewReasonV2,
  StratificationBoundaryV2,
  StratificationEditSessionV2,
  StratificationInputDependencyV2,
  StratificationLayerV2,
  StratificationSchemeV2,
  StratificationWorkspaceV2,
} from '../workspace/workspaceV2';
import { artifactDependenciesEqual } from '../workspace/workspaceV2';
import { PROTOTYPE_STRATIFICATION_EDIT_SPACING_M } from './stratificationConstants';
import { thinLayerSchemeSignature, type ThinLayerPlanDecision } from './thinLayerDomain';
import { analyzeMajorGroupMerge, layerSimplificationSchemeSignature, majorGroupCompositionLabel, majorGroupLabel, reviewReasonsForLayer } from './layerSimplificationDomain';
import type { ThinLayerEvidenceRow } from './thinLayerDomain';

export const PROTOTYPE_EDIT_SPACING_M = PROTOTYPE_STRATIFICATION_EDIT_SPACING_M;

export type StratificationIssue = {
  issueId: string;
  severity: 'problem' | 'notice';
  title: string;
  message: string;
  action: string;
  schemeId: string;
  layerId?: string;
  boundaryId?: string;
};

export type StratificationCommand =
  | { kind: 'add-boundary'; depthM: number }
  | { kind: 'move-boundary'; boundaryId: string; depthM: number }
  | { kind: 'remove-boundary'; boundaryId: string; reason: ManualMergeReason }
  | { kind: 'split-layer'; layerId: string; depthM?: number }
  | { kind: 'restore-merged-layer'; layerId: string }
  | { kind: 'merge-layer'; layerId: string; direction: 'above' | 'below'; reason: ManualMergeReason }
  | { kind: 'apply-thin-layer-plan'; thresholdM: number; sourceSignature: string; decisions: ThinLayerPlanDecision[] }
  | {
      kind: 'apply-major-group-merge-plan';
      sourceSignature: string;
      planSignature: string;
    }
  | { kind: 'rename-layer'; layerId: string; name: string }
  | { kind: 'describe-layer'; layerId: string; description: string }
  | { kind: 'set-layer-soil-group'; layerId: string; engineeringSoilGroup: string }
  | { kind: 'set-layer-soil-classification'; layerId: string; engineeringSoilGroup: string; detailedSoilType: string }
  | { kind: 'confirm-layer-soil-group'; layerId: string }
  | { kind: 'accept-layer-candidate'; layerId: string }
  | { kind: 'accept-clear-layer-candidates' }
  | { kind: 'defer-layer-candidate'; layerId: string; reason: StratificationDeferReason; note?: string }
  | { kind: 'set-layer-guide-review'; layerId: string; reviewRequired: boolean }
  | { kind: 'set-boundary-review'; boundaryId: string; reviewRequired: boolean; note?: string }
  | { kind: 'set-boundary-major-group-lock'; boundaryId: string; locked: boolean };

const ENGINEERING_SOIL_GROUPS = new Set(['unclassified', 'sand', 'mixed', 'clay']);
export const STRATIFICATION_SOIL_TYPE_CATALOG = [
  { label: '黏土', group: 'clay' }, { label: '粉质黏土', group: 'clay' }, { label: '淤泥', group: 'clay' }, { label: '淤泥质土', group: 'clay' },
  { label: '粉土', group: 'mixed' }, { label: '砂质粉土', group: 'mixed' }, { label: '黏质粉土', group: 'mixed' },
  { label: '粉砂', group: 'sand' }, { label: '细砂', group: 'sand' }, { label: '中砂', group: 'sand' }, { label: '粗砂', group: 'sand' },
] as const;
export const STRATIFICATION_DEFER_REASONS = [
  { id: 'insufficient-evidence', label: '当前证据不足' },
  { id: 'needs-sampling', label: '需要结合取样或试验' },
  { id: 'needs-peer-review', label: '需要其他工程师复核' },
  { id: 'other', label: '其他原因' },
] as const;

export function getMergedLayerRestoreAvailability(layer: StratificationLayerV2) {
  const sources = [...(layer.mergeSources ?? [])].sort((left, right) => left.depthFromM - right.depthFromM);
  if (sources.length < 2) {
    return { available: false as const, sourceCount: sources.length, reason: '本层没有可追溯的合并前结构，请按指定深度拆分。' };
  }
  if (new Set(sources.map((source) => source.sourceLayerId)).size !== sources.length) {
    return { available: false as const, sourceCount: sources.length, reason: '合并来源记录存在重复，不能可靠恢复；请按指定深度拆分。' };
  }
  if (sources.some((source) => !Number.isFinite(source.depthFromM) || !Number.isFinite(source.depthToM) || source.depthToM - source.depthFromM < PROTOTYPE_EDIT_SPACING_M)) {
    return { available: false as const, sourceCount: sources.length, reason: '合并来源深度无效或小于最小层厚，不能可靠恢复。' };
  }
  if (!sameDepth(sources[0].depthFromM, layer.depthFromM) || !sameDepth(sources.at(-1)!.depthToM, layer.depthToM)) {
    return { available: false as const, sourceCount: sources.length, reason: '本层外边界已与合并时不同，请按指定深度拆分。' };
  }
  for (let index = 0; index < sources.length - 1; index += 1) {
    if (!sameDepth(sources[index].depthToM, sources[index + 1].depthFromM)) {
      return { available: false as const, sourceCount: sources.length, reason: '合并来源之间存在空隙或重叠，不能可靠恢复。' };
    }
  }
  return { available: true as const, sourceCount: sources.length, sources };
}
export type StratificationDeferReason = (typeof STRATIFICATION_DEFER_REASONS)[number]['id'];
export type ManualMergeReason = 'curve-evidence' | 'classification-equivalent' | 'engineering-judgement';
const DETAILED_SOIL_GROUP = new Map<string, string>(STRATIFICATION_SOIL_TYPE_CATALOG.map((entry) => [entry.label, entry.group]));

function compatibleDetailedSoilType(group: string, ...candidates: Array<string | null | undefined>) {
  return candidates.find((candidate): candidate is string => Boolean(candidate && DETAILED_SOIL_GROUP.get(candidate) === group)) ?? null;
}

function replaceMajorGroupReviewReasons(layer: StratificationLayerV2, reasons: MajorGroupReviewReasonV2[]) {
  if (layer.majorGroupComposition) layer.majorGroupComposition.reviewReasons = structuredClone(reasons);
}

function withoutMajorGroupReviewKinds(layer: StratificationLayerV2, kinds: MajorGroupReviewReasonV2['kind'][]) {
  if (!layer.majorGroupComposition?.reviewReasons) return;
  replaceMajorGroupReviewReasons(layer, layer.majorGroupComposition.reviewReasons.filter((reason) => !kinds.includes(reason.kind)));
}

export function stratificationLayerNeedsDecision(layer: StratificationLayerV2) {
  return Boolean(
    layer.soilConfirmationRequired
    || layer.engineeringSoilGroup === 'unclassified'
    || layer.soilDecision?.reviewStatus === 'pending'
    || layer.soilDecision?.reviewStatus === 'needs-review',
  );
}

export function getStratificationLayerReviewQueues(scheme: StratificationSchemeV2 | null | undefined) {
  const ordered = [...(scheme?.layers ?? [])].sort((left, right) => left.depthFromM - right.depthFromM);
  return {
    pending: ordered.filter(stratificationLayerNeedsDecision),
    deferred: ordered.filter((layer) => layer.soilDecision?.reviewStatus === 'deferred'),
  };
}

export type StratificationGate = {
  state: 'allow' | 'warn' | 'deny';
  label: string;
  reason: string;
  recovery: 'check' | 'scheme' | 'problem' | 'parameters';
};

export function emptyStratificationWorkspace(): StratificationWorkspaceV2 {
  return {
    schemes: [],
    activeSchemeId: null,
    currentSchemeId: null,
    editSession: null,
    revisions: [],
    deletedSchemeIds: [],
    ruleRuns: [],
    activeRuleRunId: null,
    jtsClassificationRuns: [],
    activeJtsClassificationRunId: null,
  };
}

export function createStratificationInput(
  dependency: ArtifactDependency,
  checkRunId: string,
): StratificationInputDependencyV2 {
  return { ...structuredClone(dependency), checkRunId };
}

export function createBaseStratificationScheme(
  workspace: StratificationWorkspaceV2 | undefined,
  input: StratificationInputDependencyV2,
  depthFromM: number,
  depthToM: number,
  name: string,
  now = new Date().toISOString(),
  id = createIdentifier('scheme'),
) {
  const current = workspace ? structuredClone(workspace) : emptyStratificationWorkspace();
  if (!Number.isFinite(depthFromM) || !Number.isFinite(depthToM)) {
    return { ok: false as const, problem: '有效深度范围必须是有限数值。' };
  }
  const from = roundDepth(Math.min(depthFromM, depthToM));
  const to = roundDepth(Math.max(depthFromM, depthToM));
  if (to - from < PROTOTYPE_EDIT_SPACING_M) {
    return { ok: false as const, problem: '有效深度范围不足，不能建立分层方案。' };
  }
  const scheme: StratificationSchemeV2 = {
    schemeId: id,
    name: uniqueSchemeName(current, normalizeName(name) || nextSchemeName(current)),
    status: 'working',
    version: 1,
    input: structuredClone(input),
    depthFromM: from,
    depthToM: to,
    layers: [{
      layerId: `${id}:layer:1`,
      name: '未命名层 1',
      description: '',
      engineeringSoilGroup: 'unclassified',
      reviewRequired: false,
      depthFromM: from,
      depthToM: to,
    }],
    boundaries: [],
    origin: { kind: 'manual' },
    createdAt: now,
    updatedAt: now,
  };
  current.schemes.push(scheme);
  current.activeSchemeId = scheme.schemeId;
  current.editSession = createSession(scheme, now, true, true);
  return { ok: true as const, workspace: current, scheme };
}

export function beginStratificationEdit(
  workspace: StratificationWorkspaceV2,
  schemeId: string,
  currentCheckInput: StratificationInputDependencyV2 | null,
  now = new Date().toISOString(),
) {
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === schemeId);
  if (!scheme) return { ok: false as const, problem: '分层方案不存在。' };
  if (scheme.status === 'stale') return { ok: false as const, problem: '该方案对应的上游检查已变化，请先创建修订方案。' };
  if (!sameStratificationInput(scheme.input, currentCheckInput)) {
    return { ok: false as const, problem: '该历史方案不对应最新数据检查，只能查看或基于最新检查创建修订方案。' };
  }
  const next = structuredClone(workspace);
  next.activeSchemeId = schemeId;
  next.editSession = createSession(scheme, now, false, false);
  return { ok: true as const, workspace: next };
}

export function applyStratificationCommand(
  workspace: StratificationWorkspaceV2,
  command: StratificationCommand,
  now = new Date().toISOString(),
  simplificationEvidenceRows?: ThinLayerEvidenceRow[],
) {
  const session = workspace.editSession;
  if (!session) return { ok: false as const, problem: '请先打开一个方案的编辑会话。' };
  if (session.staleReason) {
    return { ok: false as const, problem: '上游检查已变化。当前编辑已保留，但不能继续修改；请放弃本次编辑后创建修订方案。' };
  }
  // applyCommandToScheme creates the next immutable scheme. Keep the current
  // snapshot by reference for undo instead of cloning the same evidence-rich
  // scheme three times during every inline layer decision.
  const applied = applyCommandToScheme(session.working, command, now, simplificationEvidenceRows);
  if (!applied.ok) return applied;
  const nextSession: StratificationEditSessionV2 = {
    ...session,
    undoStack: [...session.undoStack, session.working],
    redoStack: [],
    working: applied.scheme,
    dirty: true,
  };
  const next: StratificationWorkspaceV2 = {
    ...workspace,
    editSession: nextSession,
    activeSchemeId: applied.scheme.schemeId,
  };
  return { ok: true as const, workspace: next, scheme: applied.scheme };
}

export function undoStratificationCommand(workspace: StratificationWorkspaceV2) {
  const session = workspace.editSession;
  if (session?.staleReason) return { ok: false as const, problem: '上游检查已变化，当前编辑只能放弃或保留在页面中查看。' };
  const previous = session?.undoStack.at(-1);
  if (!session || !previous) return { ok: false as const, problem: '没有可撤销的操作。' };
  const next = structuredClone(workspace);
  const nextSession = next.editSession as StratificationEditSessionV2;
  nextSession.redoStack.push(structuredClone(nextSession.working));
  nextSession.working = structuredClone(previous);
  nextSession.undoStack.pop();
  nextSession.dirty = nextSession.isNew || !schemesEqual(nextSession.working, nextSession.baseline);
  return { ok: true as const, workspace: next };
}

export function redoStratificationCommand(workspace: StratificationWorkspaceV2) {
  const session = workspace.editSession;
  if (session?.staleReason) return { ok: false as const, problem: '上游检查已变化，当前编辑只能放弃或保留在页面中查看。' };
  const following = session?.redoStack.at(-1);
  if (!session || !following) return { ok: false as const, problem: '没有可重做的操作。' };
  const next = structuredClone(workspace);
  const nextSession = next.editSession as StratificationEditSessionV2;
  nextSession.undoStack.push(structuredClone(nextSession.working));
  nextSession.working = structuredClone(following);
  nextSession.redoStack.pop();
  nextSession.dirty = true;
  return { ok: true as const, workspace: next };
}

export function discardStratificationEdit(workspace: StratificationWorkspaceV2) {
  const session = workspace.editSession;
  if (!session) return { ok: false as const, problem: '当前没有编辑会话。' };
  const next = structuredClone(workspace);
  if (session.isNew) {
    next.schemes = next.schemes.filter((scheme) => scheme.schemeId !== session.schemeId);
    next.activeSchemeId = next.currentSchemeId ?? next.schemes[0]?.schemeId ?? null;
  } else {
    next.activeSchemeId = session.schemeId;
  }
  next.editSession = null;
  return { ok: true as const, workspace: next };
}

export function preserveStaleStratificationEdit(
  workspace: StratificationWorkspaceV2,
  now = new Date().toISOString(),
  archiveId = createIdentifier('scheme-archive'),
) {
  const session = workspace.editSession;
  if (!session?.staleReason) return { ok: false as const, problem: '当前没有需要保留的失效编辑。' };
  const id = session.isNew ? session.schemeId : archiveId;
  const layerIds = new Map(session.working.layers.map((layer, index) => [layer.layerId, `${id}:layer:${index + 1}`]));
  const archived: StratificationSchemeV2 = {
    ...structuredClone(session.working),
    schemeId: id,
    name: uniqueSchemeName(workspace, `${session.working.name}（上游变化前）`),
    status: 'stale',
    version: session.isNew ? session.working.version : 1,
    layers: session.working.layers.map((layer, index) => ({ ...structuredClone(layer), layerId: `${id}:layer:${index + 1}` })),
    boundaries: session.working.boundaries.map((boundary, index) => ({
      ...structuredClone(boundary),
      boundaryId: `${id}:boundary:${index + 1}`,
      upperLayerId: layerIds.get(boundary.upperLayerId) ?? `${id}:layer:${index + 1}`,
      lowerLayerId: layerIds.get(boundary.lowerLayerId) ?? `${id}:layer:${index + 2}`,
    })),
    updatedAt: now,
  };
  const next = structuredClone(workspace);
  next.schemes = session.isNew
    ? next.schemes.map((scheme) => scheme.schemeId === session.schemeId ? archived : scheme)
    : [...next.schemes, archived];
  next.revisions = [
    ...(next.revisions ?? []),
    {
      revisionId: `${archived.schemeId}:v${archived.version}:${createIdentifier('preserved')}`,
      schemeId: archived.schemeId,
      version: archived.version,
      snapshot: structuredClone(archived),
      committedAt: now,
    },
  ];
  next.activeSchemeId = archived.schemeId;
  next.editSession = null;
  return { ok: true as const, workspace: next, scheme: archived };
}

export function commitStratificationEdit(
  workspace: StratificationWorkspaceV2,
  currentCheckInput: StratificationInputDependencyV2 | null,
  now = new Date().toISOString(),
) {
  const session = workspace.editSession;
  if (!session) return { ok: false as const, problem: '当前没有可提交的编辑。', issues: [] as StratificationIssue[] };
  if (session.staleReason) {
    return { ok: false as const, problem: '上游检查已变化。当前编辑已保留但不能提交，请放弃本次编辑后创建修订方案。', issues: [] as StratificationIssue[] };
  }
  if (!sameStratificationInput(session.working.input, currentCheckInput)) {
    return { ok: false as const, problem: '当前编辑不再对应最新数据检查，不能提交；请创建修订方案。', issues: [] as StratificationIssue[] };
  }
  const stored = workspace.schemes.find((scheme) => scheme.schemeId === session.schemeId);
  if (!stored || stored.version !== session.baseVersion) {
    return { ok: false as const, problem: '方案版本已变化，当前编辑不能覆盖较新的版本。', issues: [] as StratificationIssue[] };
  }
  const issues = getStratificationIssues(session.working);
  const problem = issues.find((issue) => issue.severity === 'problem');
  if (problem) return { ok: false as const, problem: problem.message, issues };
  const committed: StratificationSchemeV2 = {
    ...structuredClone(session.working),
    status: 'current',
    version: session.isNew ? 1 : session.baseVersion + 1,
    updatedAt: now,
  };
  const next = structuredClone(workspace);
  next.schemes = next.schemes.map((scheme) => {
    if (scheme.schemeId === committed.schemeId) return committed;
    if (scheme.schemeId === next.currentSchemeId && scheme.status === 'current') {
      return {
        ...scheme,
        status: sameStratificationInput(scheme.input, committed.input) ? 'history' as const : 'stale' as const,
      };
    }
    return scheme;
  });
  next.currentSchemeId = committed.schemeId;
  next.activeSchemeId = committed.schemeId;
  next.editSession = null;
  next.revisions = [
    ...(next.revisions ?? []),
    {
      revisionId: `${committed.schemeId}:v${committed.version}:${createIdentifier('revision')}`,
      schemeId: committed.schemeId,
      version: committed.version,
      snapshot: structuredClone(committed),
      committedAt: now,
    },
  ];
  return { ok: true as const, workspace: next, scheme: committed, issues };
}

export function duplicateStratificationScheme(
  workspace: StratificationWorkspaceV2,
  schemeId: string,
  input: StratificationInputDependencyV2,
  now = new Date().toISOString(),
  id = createIdentifier('scheme'),
) {
  const source = getVisibleScheme(workspace, schemeId);
  if (!source) return { ok: false as const, problem: '待复制的方案不存在。' };
  const copy: StratificationSchemeV2 = {
    ...structuredClone(source),
    schemeId: id,
    name: uniqueSchemeName(workspace, `${source.name} 副本`),
    status: 'working',
    version: 1,
    input: structuredClone(input),
    layers: source.layers.map((layer, index) => ({ ...layer, layerId: `${id}:layer:${index + 1}` })),
    boundaries: [],
    createdAt: now,
    updatedAt: now,
  };
  copy.boundaries = source.boundaries.map((boundary, index) => ({
    ...boundary,
    boundaryId: `${id}:boundary:${index + 1}`,
    upperLayerId: copy.layers[index]?.layerId ?? '',
    lowerLayerId: copy.layers[index + 1]?.layerId ?? '',
  }));
  const next = structuredClone(workspace);
  next.schemes.push(copy);
  next.activeSchemeId = copy.schemeId;
  next.editSession = createSession(copy, now, true, true);
  return { ok: true as const, workspace: next, scheme: copy };
}

export function renameStratificationScheme(
  workspace: StratificationWorkspaceV2,
  schemeId: string,
  name: string,
  now = new Date().toISOString(),
) {
  const normalized = normalizeName(name);
  if (!normalized) return { ok: false as const, problem: '请输入方案名称。' };
  if (workspace.schemes.some((scheme) => scheme.schemeId !== schemeId && normalizeName(scheme.name) === normalized)) {
    return { ok: false as const, problem: '方案名称已存在。' };
  }
  const next = structuredClone(workspace);
  const scheme = next.schemes.find((candidate) => candidate.schemeId === schemeId);
  if (!scheme) return { ok: false as const, problem: '分层方案不存在。' };
  if (scheme.status === 'stale') return { ok: false as const, problem: '需更新方案为只读状态，不能重命名。' };
  if (next.editSession?.schemeId !== schemeId && scheme.status !== 'working') {
    next.editSession = createSession(scheme, now, false, false);
  }
  if (scheme.status === 'working') {
    scheme.name = normalized;
    scheme.updatedAt = now;
  }
  if (next.editSession?.schemeId === schemeId) {
    next.editSession.working.name = normalized;
    next.editSession.working.updatedAt = now;
    next.editSession.dirty = true;
  }
  return { ok: true as const, workspace: next };
}

export function deleteStratificationScheme(
  workspace: StratificationWorkspaceV2,
  schemeId: string,
  currentCheckInput: StratificationInputDependencyV2 | null,
  replacementSchemeId?: string,
) {
  if (!workspace.schemes.some((scheme) => scheme.schemeId === schemeId)) {
    return { ok: false as const, problem: '分层方案不存在。' };
  }
  if (workspace.editSession?.schemeId === schemeId && workspace.editSession.dirty) {
    return { ok: false as const, problem: '该方案有未提交修改，请先提交或放弃后再删除。' };
  }
  if (workspace.currentSchemeId === schemeId && !replacementSchemeId && workspace.schemes.length > 1) {
    return { ok: false as const, problem: '删除当前工作方案前，请明确选择替代方案。' };
  }
  const replacement = replacementSchemeId
    ? workspace.schemes.find((scheme) => scheme.schemeId === replacementSchemeId && scheme.schemeId !== schemeId)
    : undefined;
  if (replacementSchemeId && !replacement) {
    return { ok: false as const, problem: '替代方案不存在。' };
  }
  if (workspace.currentSchemeId === schemeId && replacement && !isEligibleStratificationReplacement(replacement, currentCheckInput)) {
    return { ok: false as const, problem: '替代方案必须对应最新数据检查、已提交且结构无问题。' };
  }
  const next = structuredClone(workspace);
  next.schemes = next.schemes.filter((scheme) => scheme.schemeId !== schemeId);
  next.deletedSchemeIds = [...new Set([...(next.deletedSchemeIds ?? []), schemeId])];
  next.currentSchemeId = workspace.currentSchemeId === schemeId ? replacementSchemeId ?? null : workspace.currentSchemeId;
  if (next.currentSchemeId) {
    next.schemes = next.schemes.map((scheme) => ({
      ...scheme,
      status: scheme.schemeId === next.currentSchemeId ? 'current' as const : scheme.status === 'current' ? 'history' as const : scheme.status,
    }));
  }
  next.activeSchemeId = workspace.activeSchemeId === schemeId
    ? next.currentSchemeId ?? next.schemes[0]?.schemeId ?? null
    : workspace.activeSchemeId;
  if (next.editSession?.schemeId === schemeId) next.editSession = null;
  return { ok: true as const, workspace: next };
}

export function selectStratificationScheme(workspace: StratificationWorkspaceV2, schemeId: string) {
  if (!workspace.schemes.some((scheme) => scheme.schemeId === schemeId)) {
    return { ok: false as const, problem: '分层方案不存在。' };
  }
  if (workspace.editSession?.dirty && workspace.editSession.schemeId !== schemeId) {
    return { ok: false as const, problem: '当前方案有未提交修改，请先提交或放弃。' };
  }
  return { ok: true as const, workspace: { ...structuredClone(workspace), activeSchemeId: schemeId } };
}

export function markStratificationWorkspaceStale(
  workspace: StratificationWorkspaceV2 | undefined,
  reason = '上游数据或检查结果已变化。',
) {
  if (!workspace) return workspace;
  const next = structuredClone(workspace);
  next.schemes = next.schemes.map((scheme) => scheme.status === 'working' ? scheme : { ...scheme, status: 'stale' as const });
  if (next.editSession) next.editSession.staleReason = reason;
  next.ruleRuns = (next.ruleRuns ?? []).map((run) => ['queued', 'running', 'cancel-requested'].includes(run.status)
    ? {
        ...run,
        status: 'invalidated' as const,
        invalidatedAt: new Date(Math.max(Date.now(), Date.parse(run.startedAt ?? run.createdAt), Date.parse(run.createdAt))).toISOString(),
        invalidationReason: reason,
      }
    : run);
  next.jtsClassificationRuns = (next.jtsClassificationRuns ?? []).map((run) => run.status === 'completed'
    ? { ...run, status: 'stale' as const, staleReason: reason }
    : run);
  next.activeJtsClassificationRunId = null;
  return next;
}

export function getActiveStratificationScheme(workspace: StratificationWorkspaceV2 | undefined) {
  if (!workspace) return null;
  if (workspace.editSession?.schemeId === workspace.activeSchemeId) return workspace.editSession.working;
  return workspace.schemes.find((scheme) => scheme.schemeId === workspace.activeSchemeId)
    ?? workspace.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId)
    ?? workspace.schemes[0]
    ?? null;
}

export function getCurrentStratificationScheme(workspace: StratificationWorkspaceV2 | undefined) {
  return workspace?.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId) ?? null;
}

export function getRenderableStratificationBoundaries(scheme: StratificationSchemeV2) {
  const layers = [...scheme.layers].sort((left, right) => left.depthFromM - right.depthFromM);
  const boundaries = [...scheme.boundaries].sort((left, right) => left.depthM - right.depthM);
  const used = new Set<string>();
  return layers.slice(0, -1).flatMap((upper, index) => {
    const lower = layers[index + 1];
    if (!sameDepth(upper.depthToM, lower.depthFromM)) return [];
    const boundary = boundaries.find((candidate) => (
      !used.has(candidate.boundaryId)
      && candidate.upperLayerId === upper.layerId
      && candidate.lowerLayerId === lower.layerId
      && sameDepth(candidate.depthM, upper.depthToM)
    ));
    if (!boundary) return [];
    used.add(boundary.boundaryId);
    return [boundary];
  });
}

export function getStratificationIssues(scheme: StratificationSchemeV2): StratificationIssue[] {
  const issues: StratificationIssue[] = [];
  const layers = [...scheme.layers].sort((left, right) => left.depthFromM - right.depthFromM);
  if (new Set(layers.map((layer) => layer.layerId)).size !== layers.length) {
    issues.push(problemIssue(scheme, 'str-duplicate-layer-id', '土层引用重复', '当前方案存在重复的土层标识。', '恢复到上一个有效版本。'));
  }
  if (!layers.length) {
    issues.push(problemIssue(scheme, 'str-no-layers', '没有土层', '当前方案没有土层，不能作为参数输入。', '新建基础土层。'));
    return issues;
  }
  if (!sameDepth(layers[0].depthFromM, scheme.depthFromM) || !sameDepth(layers.at(-1)?.depthToM ?? 0, scheme.depthToM)) {
    issues.push(problemIssue(scheme, 'str-coverage', '覆盖范围不完整', '土层没有覆盖当前方案的完整有效深度。', '调整首层或末层边界。'));
  }
  layers.forEach((layer, index) => {
    const majorGroupReviewReasons = reviewReasonsForLayer(layer);
    const hasAuthoritativeMajorGroupReasons = Boolean(layer.majorGroupComposition);
    const effectiveSoilConfirmationRequired = hasAuthoritativeMajorGroupReasons
      ? majorGroupReviewReasons.some((reason) => reason.kind === 'source-soil-confirmation')
      : Boolean(layer.soilConfirmationRequired);
    const effectiveEvidenceReviewRequired = hasAuthoritativeMajorGroupReasons
      ? majorGroupReviewReasons.some((reason) => reason.kind === 'source-evidence' || reason.kind === 'curve-difference' || reason.kind === 'legacy-untyped')
      : Boolean(layer.evidenceReviewRequired);
    const effectiveReviewRequired = hasAuthoritativeMajorGroupReasons
      ? majorGroupReviewReasons.length > 0
      : Boolean(layer.reviewRequired);
    const thickness = layer.depthToM - layer.depthFromM;
    if (thickness < PROTOTYPE_EDIT_SPACING_M) {
      issues.push(problemIssue(scheme, `str-thickness-${layer.layerId}`, '土层结构无法编辑', `${layer.name} 小于原型结构编辑间距 ${PROTOTYPE_EDIT_SPACING_M.toFixed(2)} m。`, '移动或删除相邻边界。', layer.layerId));
    }
    const nextLayer = layers[index + 1];
    if (nextLayer && !sameDepth(layer.depthToM, nextLayer.depthFromM)) {
      issues.push(problemIssue(scheme, `str-continuity-${layer.layerId}`, '土层不连续', `${layer.name} 与 ${nextLayer.name} 之间存在空隙或重叠。`, '调整共享边界。', layer.layerId));
    }
    if (effectiveReviewRequired && layer.soilDecision?.reviewStatus !== 'deferred') {
      const sourceSummary = layer.mergeSources?.map((source) => `${source.name}（${source.engineeringSoilGroup}）`).join('、');
      const reviewAction = layer.soilDecision?.reviewAction;
      const evidenceReasonLabels = layer.majorGroupComposition ? [
        majorGroupReviewReasons.some((reason) => reason.kind === 'source-evidence') ? '来源证据' : '',
        majorGroupReviewReasons.some((reason) => reason.kind === 'curve-difference') ? '曲线差异提示（规则阈值）' : '',
        majorGroupReviewReasons.some((reason) => reason.kind === 'legacy-untyped') ? '历史未分型复核状态' : '',
      ].filter(Boolean) : [];
      const notice = effectiveEvidenceReviewRequired
        ? {
            title: evidenceReasonLabels.length ? '归并复核依据已保留' : '来源证据待复核',
            message: evidenceReasonLabels.length
              ? `${layer.name} 仍保留：${evidenceReasonLabels.join('、')}。`
              : `${layer.name} 的来源分类证据需要工程师判断。`,
            action: '核对 qc、fs、u2 和来源分类证据后，接受、修改或继续留待复核。',
          }
        : sourceSummary || reviewAction === 'merged-inherited'
        ? {
            title: '合并层需复核',
            message: sourceSummary ? `${layer.name} 由 ${sourceSummary} 合并，土类或描述需要确认。` : `${layer.name} 的合并继承结果需要确认。`,
            action: '核对合并前各层信息，并确认继承土类是否适用于新深度范围。',
          }
        : reviewAction === 'split-inherited'
          ? {
              title: '拆分继承需确认',
              message: `${layer.name} 继承了拆分前土层的土类，尚未针对新深度范围单独确认。`,
              action: '核对新区间的 qc、fs、u2 与方法分类证据，再接受或修改具体土类。',
            }
          : reviewAction === 'boundary-adjusted'
            ? {
                title: '调界后需确认',
                message: `${layer.name} 的深度范围已经变化，原土类决定需要针对新区间重新确认。`,
                action: '核对调整后范围内的 qc、fs、u2，再接受或修改具体土类。',
              }
          : reviewAction === 'marked-for-review'
              ? {
                  title: '工程师标记待复核',
                  message: `${layer.name} 已由工程师标记为待复核。`,
                  action: '完成判断后接受或修改具体土类；如暂不确定，可继续保留该标记。',
                }
              : {
                  title: '土层需复核',
                  message: `${layer.name} 仍需工程师核对后确认。`,
                  action: '查看当前层证据并确认处理方式。',
                };
      issues.push({
        issueId: `str-layer-review-${layer.layerId}`,
        severity: 'notice',
        ...notice,
        schemeId: scheme.schemeId,
        layerId: layer.layerId,
      });
    }
    if (layer.engineeringSoilGroup === 'unclassified' || effectiveSoilConfirmationRequired) {
      issues.push(problemIssue(
        scheme,
        `str-soil-group-${layer.layerId}`,
        '土类待确认',
        `${layer.name} 尚未确认工程土类，不能进入参数解译。`,
        '从固定类别中选择砂土、混合土或黏性土。',
        layer.layerId,
      ));
    }
    if (layer.soilDecision?.reviewStatus === 'pending' || layer.soilDecision?.reviewStatus === 'needs-review' || layer.soilDecision?.reviewStatus === 'deferred') {
      const deferred = layer.soilDecision.reviewStatus === 'deferred';
      const deferredReason = STRATIFICATION_DEFER_REASONS.find((reason) => reason.id === layer.soilDecision?.decisionReason)?.label;
      issues.push(problemIssue(
        scheme,
        `str-guide-review-${layer.layerId}`,
        deferred ? '土层暂时保留' : '土层候选待确认',
        deferred ? `${layer.name} 已暂时保留${deferredReason ? `：${deferredReason}` : ''}，完成判断前不能进入参数解译。` : `${layer.name} 尚未由工程师确认，不能进入参数解译。`,
        deferred ? '重新选择该层后采用建议或修改土类。' : layer.soilDecision.reviewStatus === 'needs-review' ? '检查当前层证据后接受、调整或继续标记待复核。' : '接受当前建议，或合并、拆分、调界和修改土类。',
        layer.layerId,
      ));
    }
    const reviewStatusAlreadyBlocks = layer.soilDecision?.reviewStatus === 'pending'
      || layer.soilDecision?.reviewStatus === 'needs-review'
      || layer.soilDecision?.reviewStatus === 'deferred';
    if (majorGroupReviewReasons.length && !reviewStatusAlreadyBlocks && layer.engineeringSoilGroup !== 'unclassified' && !effectiveSoilConfirmationRequired) {
      const hasLegacyUntyped = majorGroupReviewReasons.some((reason) => reason.kind === 'legacy-untyped');
      issues.push(problemIssue(
        scheme,
        `str-major-group-review-${layer.layerId}`,
        hasLegacyUntyped ? '历史复核原因未分型' : '归并复核尚未完成',
        hasLegacyUntyped
          ? `${layer.name} 来自旧版归并记录，复核原因未分型，系统不会猜测或自动清除。`
          : `${layer.name} 仍保留 ${majorGroupReviewReasons.length} 项归并复核原因，不能进入参数解译。`,
        '在当前层查看复核依据，确认后再进入参数解译。',
        layer.layerId,
      ));
    }
  });
  const sortedBoundaries = [...scheme.boundaries].sort((left, right) => left.depthM - right.depthM);
  if (sortedBoundaries.length !== Math.max(0, layers.length - 1)) {
    issues.push(problemIssue(
      scheme,
      'str-boundary-count',
      '边界数量与土层不一致',
      `当前 ${layers.length} 层应有 ${Math.max(0, layers.length - 1)} 条层间边界，但记录了 ${sortedBoundaries.length} 条。`,
      '恢复到上一个有效版本，或重新应用一次层结构调整。',
    ));
  }
  if (new Set(sortedBoundaries.map((boundary) => boundary.boundaryId)).size !== sortedBoundaries.length) {
    issues.push(problemIssue(scheme, 'str-duplicate-boundary-id', '边界引用重复', '当前方案存在重复的边界标识。', '恢复到上一个有效版本。'));
  }
  sortedBoundaries.forEach((boundary, index) => {
    if (boundary.depthM <= scheme.depthFromM || boundary.depthM >= scheme.depthToM) {
      issues.push(problemIssue(scheme, `str-boundary-range-${boundary.boundaryId}`, '边界超出范围', `边界 ${boundary.depthM.toFixed(2)} m 不在有效深度范围内。`, '修改或删除该边界。', undefined, boundary.boundaryId));
    }
    if (index > 0 && boundary.depthM - sortedBoundaries[index - 1].depthM < PROTOTYPE_EDIT_SPACING_M) {
      issues.push(problemIssue(scheme, `str-boundary-order-${boundary.boundaryId}`, '边界重复或过近', '相邻边界不能形成有效厚度的土层。', '移动或删除该边界。', undefined, boundary.boundaryId));
    }
    if (
      boundary.upperLayerId !== layers[index]?.layerId
      || boundary.lowerLayerId !== layers[index + 1]?.layerId
      || !sameDepth(boundary.depthM, layers[index]?.depthToM ?? Number.NaN)
    ) {
      issues.push(problemIssue(scheme, `str-boundary-reference-${boundary.boundaryId}`, '边界引用不一致', '边界与上下土层的深度或引用不一致。', '恢复到上一个有效版本。', undefined, boundary.boundaryId));
    }
    if (boundary.reviewRequired) {
      issues.push({
        issueId: `str-review-${boundary.boundaryId}`,
        severity: 'notice',
        title: '边界需复核',
        message: boundary.note || `${boundary.depthM.toFixed(2)} m 边界标记为需复核。`,
        action: '核对曲线和相邻层描述；提示不禁止继续。',
        schemeId: scheme.schemeId,
        boundaryId: boundary.boundaryId,
      });
    }
  });
  return issues;
}

export function getStratificationHandoffGate(
  workspace: StratificationWorkspaceV2 | undefined,
  currentCheckInput: StratificationInputDependencyV2 | null,
): StratificationGate {
  const scheme = getCurrentStratificationScheme(workspace);
  if (!scheme) return { state: 'deny', label: '尚未建立方案', reason: '创建并提交当前点位的分层方案后才能进入参数解译。', recovery: 'scheme' };
  if (workspace?.editSession?.dirty) {
    return {
      state: 'deny',
      label: workspace.editSession.staleReason ? '编辑依据已变化' : '有未提交修改',
      reason: workspace.editSession.staleReason
        ? '当前编辑已保留，但其上游检查已变化。请放弃本次编辑后创建修订方案。'
        : '提交或放弃当前编辑后再进入参数解译。',
      recovery: 'scheme',
    };
  }
  if (workspace?.activeSchemeId && workspace.activeSchemeId !== workspace.currentSchemeId) {
    return { state: 'deny', label: '正在查看其他方案', reason: '参数解译使用当前工作方案。请切回当前工作方案，或将正在查看的方案提交为当前工作方案。', recovery: 'scheme' };
  }
  if (!currentCheckInput || scheme.status === 'stale' || !sameStratificationInput(scheme.input, currentCheckInput)) {
    return { state: 'deny', label: '方案需更新', reason: '当前工作方案不再对应最新数据检查，请基于最新检查创建修订方案。', recovery: currentCheckInput ? 'scheme' : 'check' };
  }
  const issues = getStratificationIssues(scheme);
  const problem = issues.find((issue) => issue.severity === 'problem');
  if (problem) return { state: 'deny', label: '结构存在问题', reason: problem.message, recovery: 'problem' };
  const notices = issues.filter((issue) => issue.severity === 'notice');
  if (notices.length) return { state: 'warn', label: '可继续，保留提示', reason: `当前方案保留 ${notices.length} 项复核提示。`, recovery: 'parameters' };
  return { state: 'allow', label: '可进入参数解译', reason: '当前工作方案与最新检查一致，结构完整。', recovery: 'parameters' };
}

export function isEligibleStratificationReplacement(
  scheme: StratificationSchemeV2,
  currentCheckInput: StratificationInputDependencyV2 | null,
) {
  return Boolean(
    currentCheckInput
    && (scheme.status === 'current' || scheme.status === 'history')
    && sameStratificationInput(scheme.input, currentCheckInput)
    && !getStratificationIssues(scheme).some((issue) => issue.severity === 'problem' && issue.title !== '土类待确认'),
  );
}

export function sameStratificationInput(
  left: StratificationInputDependencyV2 | null | undefined,
  right: StratificationInputDependencyV2 | null | undefined,
) {
  return Boolean(left && right && left.checkRunId === right.checkRunId && artifactDependenciesEqual(left, right));
}

function markLayerAfterBoundaryChange(layer: StratificationLayerV2, now: string) {
  layer.soilDecision = {
    ...(layer.soilDecision ?? { suggestedGroup: null, finalGroup: layer.engineeringSoilGroup, source: 'manual' as const, decidedAt: now }),
    reviewStatus: 'pending',
    reviewAction: 'boundary-adjusted',
    decisionReason: undefined,
    decisionNote: undefined,
    deferredAt: undefined,
    decidedAt: now,
  };
  layer.reviewRequired = true;
}

function applyCommandToScheme(
  scheme: StratificationSchemeV2,
  command: StratificationCommand,
  now: string,
  simplificationEvidenceRows?: ThinLayerEvidenceRow[],
) {
  if (command.kind === 'accept-layer-candidate') {
    const sourceLayer = scheme.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!sourceLayer) return { ok: false as const, problem: '待确认土层不存在。' };
    if (!sourceLayer.engineeringSoilGroup || sourceLayer.engineeringSoilGroup === 'unclassified') return { ok: false as const, problem: '当前土层没有可接受的建议土类。' };
    if (!ENGINEERING_SOIL_GROUPS.has(sourceLayer.engineeringSoilGroup)) return { ok: false as const, problem: '建议土类不在固定类别中，请重新选择。' };
    const layer = structuredClone(sourceLayer);
    layer.soilDecision = {
      suggestedGroup: layer.soilDecision?.suggestedGroup ?? layer.engineeringSoilGroup,
      finalGroup: layer.engineeringSoilGroup,
      suggestedDetailedType: layer.soilDecision?.suggestedDetailedType ?? null,
      finalDetailedType: compatibleDetailedSoilType(layer.engineeringSoilGroup, layer.soilDecision?.finalDetailedType, layer.soilDecision?.suggestedDetailedType),
      reviewStatus: 'accepted',
      reviewAction: layer.soilDecision?.source === 'inherited' ? layer.soilDecision.reviewAction ?? 'accepted' : 'accepted',
      source: layer.soilDecision?.source === 'jts-suggested' ? 'jts-accepted' : layer.soilDecision?.source ?? 'manual',
      ...(layer.soilDecision?.methodClassification ? { methodClassification: structuredClone(layer.soilDecision.methodClassification) } : {}),
      ...(layer.soilDecision?.classificationRunId ? { classificationRunId: layer.soilDecision.classificationRunId } : {}),
      decidedAt: now,
    };
    layer.soilConfirmationRequired = false;
    layer.evidenceReviewRequired = false;
    replaceMajorGroupReviewReasons(layer, []);
    layer.reviewRequired = false;
    const next: StratificationSchemeV2 = {
      ...scheme,
      layers: scheme.layers.map((candidate) => candidate.layerId === layer.layerId ? layer : candidate),
      boundaries: [...scheme.boundaries],
    };
    return { ok: true as const, scheme: finalizeScheme(next, now) };
  }
  const next = structuredClone(scheme);
  if (command.kind === 'add-boundary') return splitAtDepth(next, command.depthM, now);
  if (command.kind === 'apply-major-group-merge-plan') {
    if (layerSimplificationSchemeSignature(scheme) !== command.sourceSignature) {
      return { ok: false as const, problem: '当前分层已经变化，请重新生成大类合并预览后再应用。' };
    }
    if (!simplificationEvidenceRows) {
      return { ok: false as const, problem: '缺少当前检查的曲线证据，不能记录本次大类合并依据。' };
    }
    let validated;
    try {
      validated = analyzeMajorGroupMerge(scheme, simplificationEvidenceRows);
    } catch (error) {
      return { ok: false as const, problem: error instanceof Error ? error.message : '当前方案无法重新验证大类合并结果。' };
    }
    if (validated.planSignature !== command.planSignature) {
      return { ok: false as const, problem: '当前分层、土类或曲线证据已经变化，请重新生成大类合并预览。' };
    }
    if (!validated.steps.length) return { ok: false as const, problem: '当前没有相邻且同属一个土类大类的可合并层。' };
    for (const step of validated.steps) {
      const boundary = next.boundaries.find((candidate) => candidate.boundaryId === step.boundaryId);
      if (!boundary || boundary.upperLayerId !== step.upperLayerId || boundary.lowerLayerId !== step.lowerLayerId) {
        return { ok: false as const, problem: '简化方案引用的相邻层已经变化，请重新分析。' };
      }
      mergeAcrossBoundary(next, boundary, now);
      const mergedLayer = next.layers.find((layer) => layer.layerId === step.upperLayerId);
      if (!mergedLayer) return { ok: false as const, problem: '合并后的结果层无法定位，请重新生成预览。' };
      mergedLayer.name = step.resultingLabel;
      mergedLayer.engineeringSoilGroup = step.resultingSoilGroup;
      mergedLayer.majorGroupComposition = {
        engineeringSoilGroup: step.resultingSoilGroup,
        detailedSoilTypes: [...step.resultingDetailedSoilTypes],
        sourceLayerIds: [...step.sourceLayerIds],
      };
      mergedLayer.soilConfirmationRequired = false;
      mergedLayer.reviewRequired = false;
      mergedLayer.soilDecision = {
        ...(mergedLayer.soilDecision ?? { suggestedGroup: step.resultingSoilGroup, finalGroup: step.resultingSoilGroup, source: 'inherited' as const, decidedAt: now }),
        suggestedGroup: step.resultingSoilGroup,
        finalGroup: step.resultingSoilGroup,
        suggestedDetailedType: null,
        finalDetailedType: null,
        reviewStatus: 'accepted',
        reviewAction: 'merged-inherited',
        decisionReason: '按相邻土类大类合并；细分类作为组成说明保留。',
        source: 'inherited',
        decidedAt: now,
      };
      finalizeScheme(next, now);
    }
    for (const resultLayer of validated.resultLayers) {
      const persistedLayer = next.layers.find((layer) => layer.layerId === resultLayer.layerId);
      if (!persistedLayer || resultLayer.engineeringSoilGroup === 'unclassified') continue;
      persistedLayer.name = resultLayer.displayLabel;
      persistedLayer.engineeringSoilGroup = resultLayer.engineeringSoilGroup;
      persistedLayer.majorGroupComposition = {
        engineeringSoilGroup: resultLayer.engineeringSoilGroup,
        detailedSoilTypes: [...resultLayer.detailedSoilTypes],
        sourceLayerIds: [...resultLayer.sourceLayerIds],
        reviewReasons: structuredClone(resultLayer.reviewReasons),
      };
      const sourceSoilConfirmationRequired = resultLayer.reviewReasons.some((reason) => reason.kind === 'source-soil-confirmation');
      const evidenceReviewRequired = resultLayer.reviewReasons.some((reason) => reason.kind === 'source-evidence' || reason.kind === 'curve-difference' || reason.kind === 'legacy-untyped');
      persistedLayer.soilConfirmationRequired = sourceSoilConfirmationRequired;
      persistedLayer.evidenceReviewRequired = evidenceReviewRequired;
      persistedLayer.reviewRequired = resultLayer.requiresReview;
      if (persistedLayer.soilDecision) {
        persistedLayer.soilDecision.suggestedGroup = resultLayer.engineeringSoilGroup;
        persistedLayer.soilDecision.finalGroup = resultLayer.engineeringSoilGroup;
        persistedLayer.soilDecision.suggestedDetailedType = null;
        persistedLayer.soilDecision.finalDetailedType = null;
        persistedLayer.soilDecision.reviewStatus = resultLayer.requiresReview ? 'needs-review' : 'accepted';
        persistedLayer.soilDecision.decisionReason = resultLayer.requiresReview
          ? '已按相邻工程大类归并；复核原因已分项保留，需由工程师确认。'
          : '按相邻工程大类归并；细分类仅作为组成说明保留。';
      }
    }
    next.layerSimplificationHistory = [
      ...(next.layerSimplificationHistory ?? []),
      {
        simplificationId: createIdentifier('layer-simplification'),
        method: 'major-soil-group',
        sourceSignature: command.sourceSignature,
        beforeLayerCount: scheme.layers.length,
        afterLayerCount: next.layers.length,
        resultLayers: validated.resultLayers.map((resultLayer) => ({
          layerId: resultLayer.layerId,
          depthFromM: resultLayer.depthFromM,
          depthToM: resultLayer.depthToM,
          engineeringSoilGroup: resultLayer.engineeringSoilGroup,
          detailedSoilTypes: [...resultLayer.detailedSoilTypes],
          displayLabel: resultLayer.displayLabel,
          sourceLayerIds: [...resultLayer.sourceLayerIds],
          mergedBoundaryCount: resultLayer.mergedBoundaryCount,
          reviewReasons: structuredClone(resultLayer.reviewReasons),
        })),
        steps: structuredClone(validated.steps),
        appliedAt: now,
      },
    ];
    return { ok: true as const, scheme: finalizeScheme(next, now) };
  }
  if (command.kind === 'apply-thin-layer-plan') {
    if (thinLayerSchemeSignature(scheme) !== command.sourceSignature) {
      return { ok: false as const, problem: '当前分层已经变化，请重新分析薄层后再应用。' };
    }
    if (!Number.isFinite(command.thresholdM) || command.thresholdM <= 0 || command.thresholdM >= scheme.depthToM - scheme.depthFromM) {
      return { ok: false as const, problem: '薄层筛选厚度无效，请返回第一步修改。' };
    }
    const consumed = new Set<string>();
    const orderedDecisions = [...command.decisions].sort((left, right) => {
      const leftLayer = scheme.layers.find((layer) => layer.layerId === left.layerId);
      const rightLayer = scheme.layers.find((layer) => layer.layerId === right.layerId);
      const leftThickness = leftLayer ? leftLayer.depthToM - leftLayer.depthFromM : Number.POSITIVE_INFINITY;
      const rightThickness = rightLayer ? rightLayer.depthToM - rightLayer.depthFromM : Number.POSITIVE_INFINITY;
      return leftThickness - rightThickness || (leftLayer?.depthFromM ?? 0) - (rightLayer?.depthFromM ?? 0);
    });
    for (const item of orderedDecisions) {
      if (item.decision === 'preserve') continue;
      const layerIndex = next.layers.findIndex((layer) => layer.layerId === item.layerId);
      if (layerIndex < 0) return { ok: false as const, problem: '薄层整理方案引用的土层已经不存在，请重新分析。' };
      const layer = next.layers[layerIndex];
      const upper = next.layers[layerIndex - 1] ?? null;
      const lower = next.layers[layerIndex + 1] ?? null;
      const affectedIds = item.decision === 'merge-surrounding'
        ? [upper?.layerId, layer.layerId, lower?.layerId].filter(Boolean) as string[]
        : item.decision === 'merge-above'
          ? [upper?.layerId, layer.layerId].filter(Boolean) as string[]
          : [layer.layerId, lower?.layerId].filter(Boolean) as string[];
      if (affectedIds.some((layerId) => consumed.has(layerId))) {
        return { ok: false as const, problem: '两个薄层决定使用了同一个相邻层，请返回确认步骤调整。' };
      }
      if (item.decision === 'merge-surrounding') {
        if (!upper || !lower) return { ok: false as const, problem: '孔顶或孔底薄层不能自动合并上下层。' };
        const upperBoundary = next.boundaries.find((boundary) => boundary.upperLayerId === upper.layerId && boundary.lowerLayerId === layer.layerId);
        if (!upperBoundary) return { ok: false as const, problem: '薄层上边界已经变化，请重新分析。' };
        mergeAcrossBoundary(next, upperBoundary, now);
        finalizeScheme(next, now);
        const lowerBoundary = next.boundaries.find((boundary) => boundary.upperLayerId === upper.layerId && boundary.lowerLayerId === lower.layerId);
        if (!lowerBoundary) return { ok: false as const, problem: '薄层下边界已经变化，请重新分析。' };
        mergeAcrossBoundary(next, lowerBoundary, now);
      } else {
        const boundary = item.decision === 'merge-above'
          ? next.boundaries.find((candidate) => candidate.lowerLayerId === layer.layerId)
          : next.boundaries.find((candidate) => candidate.upperLayerId === layer.layerId);
        if (!boundary) return { ok: false as const, problem: `当前薄层${item.decision === 'merge-above' ? '上方' : '下方'}没有可合并土层。` };
        mergeAcrossBoundary(next, boundary, now, item.decision === 'merge-below' ? 'lower' : 'upper', 'retained');
      }
      affectedIds.forEach((layerId) => consumed.add(layerId));
    }
    next.thinLayerCleanupHistory = [
      ...(next.thinLayerCleanupHistory ?? []),
      {
        cleanupId: createIdentifier('thin-cleanup'),
        thresholdM: Number(command.thresholdM.toFixed(3)),
        sourceSignature: command.sourceSignature,
        beforeLayerCount: scheme.layers.length,
        afterLayerCount: next.layers.length,
        decisions: command.decisions.map((item) => ({ candidateId: item.candidateId, sourceLayerId: item.layerId, decision: item.decision, reason: item.reason })),
        appliedAt: now,
      },
    ];
    return { ok: true as const, scheme: finalizeScheme(next, now) };
  }
  if (command.kind === 'split-layer') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待拆分土层不存在。' };
    return splitAtDepth(next, command.depthM ?? (layer.depthFromM + layer.depthToM) / 2, now, layer.layerId);
  }
  if (command.kind === 'restore-merged-layer') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待恢复土层不存在。' };
    return restoreMergedLayerSources(next, layer, now);
  }
  if (command.kind === 'move-boundary') {
    const boundary = next.boundaries.find((candidate) => candidate.boundaryId === command.boundaryId);
    if (!boundary) return { ok: false as const, problem: '待移动边界不存在。' };
    const upper = next.layers.find((layer) => layer.layerId === boundary.upperLayerId);
    const lower = next.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
    const depth = roundDepth(command.depthM);
    if (!Number.isFinite(depth)) return { ok: false as const, problem: '边界深度必须是有限数值。' };
    if (!upper || !lower) return { ok: false as const, problem: '边界引用的相邻土层不存在。' };
    if (depth - upper.depthFromM < PROTOTYPE_EDIT_SPACING_M || lower.depthToM - depth < PROTOTYPE_EDIT_SPACING_M) {
      return { ok: false as const, problem: `当前原型要求相邻边界至少间隔 ${PROTOTYPE_EDIT_SPACING_M.toFixed(2)} m，请调整边界位置。` };
    }
    boundary.depthM = depth;
    upper.depthToM = depth;
    lower.depthFromM = depth;
    markLayerAfterBoundaryChange(upper, now);
    markLayerAfterBoundaryChange(lower, now);
  } else if (command.kind === 'remove-boundary') {
    if (!isManualMergeReason(command.reason)) return { ok: false as const, problem: '请选择本次合并的固定理由。' };
    const boundary = next.boundaries.find((candidate) => candidate.boundaryId === command.boundaryId);
    if (!boundary) return { ok: false as const, problem: '待删除边界不存在。' };
    const sourceLayerIds = [boundary.upperLayerId, boundary.lowerLayerId];
    const beforeLayerCount = next.layers.length;
    mergeAcrossBoundary(next, boundary, now);
    recordManualMerge(next, boundary.boundaryId, sourceLayerIds, command.reason, beforeLayerCount, now);
  } else if (command.kind === 'merge-layer') {
    if (!isManualMergeReason(command.reason)) return { ok: false as const, problem: '请选择本次合并的固定理由。' };
    const index = next.layers.findIndex((layer) => layer.layerId === command.layerId);
    if (index < 0) return { ok: false as const, problem: '待合并土层不存在。' };
    const boundary = command.direction === 'above'
      ? next.boundaries.find((candidate) => candidate.lowerLayerId === command.layerId)
      : next.boundaries.find((candidate) => candidate.upperLayerId === command.layerId);
    if (!boundary) return { ok: false as const, problem: `当前土层${command.direction === 'above' ? '上方' : '下方'}没有可合并土层。` };
    const sourceLayerIds = [boundary.upperLayerId, boundary.lowerLayerId];
    const beforeLayerCount = next.layers.length;
    mergeAcrossBoundary(next, boundary, now);
    recordManualMerge(next, boundary.boundaryId, sourceLayerIds, command.reason, beforeLayerCount, now);
  } else if (command.kind === 'rename-layer') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    const name = normalizeName(command.name);
    if (!layer) return { ok: false as const, problem: '待重命名土层不存在。' };
    if (!name) return { ok: false as const, problem: '请输入土层名称。' };
    layer.name = name;
  } else if (command.kind === 'describe-layer') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待修改土层不存在。' };
    layer.description = command.description.trim();
  } else if (command.kind === 'set-layer-soil-group') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待修改土层不存在。' };
    if (!ENGINEERING_SOIL_GROUPS.has(command.engineeringSoilGroup)) return { ok: false as const, problem: '请选择砂土、混合土或黏性土。' };
    const previousDecision = layer.soilDecision;
    const compatibleFinalDetailedType = compatibleDetailedSoilType(command.engineeringSoilGroup, previousDecision?.finalDetailedType);
    const requiresConfirmation = command.engineeringSoilGroup === 'unclassified'
      || Boolean(previousDecision?.finalDetailedType && !compatibleFinalDetailedType);
    const previousComposition = layer.majorGroupComposition;
    const previousCompositionLabel = previousComposition
      ? majorGroupCompositionLabel(previousComposition.engineeringSoilGroup, previousComposition.detailedSoilTypes)
      : null;
    layer.engineeringSoilGroup = command.engineeringSoilGroup;
    layer.majorGroupComposition = undefined;
    if (previousCompositionLabel && layer.name === previousCompositionLabel) layer.name = majorGroupLabel(command.engineeringSoilGroup);
    layer.soilDecision = {
      suggestedGroup: previousDecision?.suggestedGroup ?? null,
      finalGroup: command.engineeringSoilGroup,
      source: previousDecision?.suggestedGroup
        ? previousDecision.suggestedGroup === command.engineeringSoilGroup ? 'jts-accepted' : 'engineer-overrode-jts'
        : 'engineer-selected',
      suggestedDetailedType: previousDecision?.suggestedDetailedType ?? null,
      finalDetailedType: compatibleFinalDetailedType,
      reviewStatus: requiresConfirmation ? 'needs-review' : 'accepted',
      reviewAction: previousDecision?.suggestedGroup === command.engineeringSoilGroup ? 'accepted' : 'engineer-overrode',
      ...(previousDecision?.methodClassification ? { methodClassification: structuredClone(previousDecision.methodClassification) } : {}),
      ...(previousDecision?.classificationRunId ? { classificationRunId: previousDecision.classificationRunId } : {}),
      decidedAt: now,
    };
    layer.soilConfirmationRequired = requiresConfirmation;
    layer.reviewRequired = layer.soilConfirmationRequired || Boolean(layer.evidenceReviewRequired);
  } else if (command.kind === 'set-layer-soil-classification') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    const detailedSoilType = command.detailedSoilType.trim();
    if (!layer) return { ok: false as const, problem: '待修改土层不存在。' };
    if (!ENGINEERING_SOIL_GROUPS.has(command.engineeringSoilGroup) || command.engineeringSoilGroup === 'unclassified') return { ok: false as const, problem: '具体土类必须映射到砂土、混合土或黏性土。' };
    if (!detailedSoilType) return { ok: false as const, problem: '请选择固定目录中的具体土类。' };
    if (DETAILED_SOIL_GROUP.get(detailedSoilType) !== command.engineeringSoilGroup) return { ok: false as const, problem: '具体土类不在固定目录中，或与工程分组映射不一致。' };
    const previousDecision = layer.soilDecision;
    const previousComposition = layer.majorGroupComposition;
    const previousCompositionLabel = previousComposition
      ? majorGroupCompositionLabel(previousComposition.engineeringSoilGroup, previousComposition.detailedSoilTypes)
      : null;
    layer.engineeringSoilGroup = command.engineeringSoilGroup;
    if (layer.majorGroupComposition?.engineeringSoilGroup !== command.engineeringSoilGroup) {
      layer.majorGroupComposition = undefined;
      if (previousCompositionLabel && layer.name === previousCompositionLabel) layer.name = detailedSoilType;
    }
    layer.soilDecision = {
      suggestedGroup: previousDecision?.suggestedGroup ?? null,
      finalGroup: command.engineeringSoilGroup,
      suggestedDetailedType: previousDecision?.suggestedDetailedType ?? null,
      finalDetailedType: detailedSoilType,
      reviewStatus: 'accepted',
      reviewAction: previousDecision?.suggestedDetailedType === detailedSoilType ? 'accepted' : 'engineer-overrode',
      source: previousDecision?.suggestedGroup ? previousDecision.suggestedGroup === command.engineeringSoilGroup ? 'jts-accepted' : 'engineer-overrode-jts' : 'engineer-selected',
      ...(previousDecision?.methodClassification ? { methodClassification: structuredClone(previousDecision.methodClassification) } : {}),
      ...(previousDecision?.classificationRunId ? { classificationRunId: previousDecision.classificationRunId } : {}),
      decidedAt: now,
    };
    layer.soilConfirmationRequired = false;
    layer.evidenceReviewRequired = false;
    layer.reviewRequired = false;
    replaceMajorGroupReviewReasons(layer, []);
  } else if (command.kind === 'confirm-layer-soil-group') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待确认土层不存在。' };
    if (!layer.engineeringSoilGroup || layer.engineeringSoilGroup === 'unclassified') return { ok: false as const, problem: '当前土层没有可接受的建议土类。' };
    if (!ENGINEERING_SOIL_GROUPS.has(layer.engineeringSoilGroup)) return { ok: false as const, problem: '建议土类不在固定类别中，请重新选择。' };
    layer.soilDecision = {
      suggestedGroup: layer.soilDecision?.suggestedGroup ?? layer.engineeringSoilGroup,
      finalGroup: layer.engineeringSoilGroup,
      suggestedDetailedType: layer.soilDecision?.suggestedDetailedType ?? null,
      finalDetailedType: compatibleDetailedSoilType(layer.engineeringSoilGroup, layer.soilDecision?.finalDetailedType, layer.soilDecision?.suggestedDetailedType),
      reviewStatus: 'accepted',
      reviewAction: layer.soilDecision?.source === 'inherited' ? layer.soilDecision.reviewAction ?? 'accepted' : 'accepted',
      source: layer.soilDecision?.source === 'jts-suggested' ? 'jts-accepted' : layer.soilDecision?.source ?? 'manual',
      ...(layer.soilDecision?.methodClassification ? { methodClassification: structuredClone(layer.soilDecision.methodClassification) } : {}),
      ...(layer.soilDecision?.classificationRunId ? { classificationRunId: layer.soilDecision.classificationRunId } : {}),
      decidedAt: now,
    };
    layer.soilConfirmationRequired = false;
    withoutMajorGroupReviewKinds(layer, ['source-soil-confirmation']);
    layer.reviewRequired = Boolean(layer.evidenceReviewRequired || layer.majorGroupComposition?.reviewReasons?.length);
    if (layer.reviewRequired && layer.soilDecision) layer.soilDecision.reviewStatus = 'needs-review';
  } else if (command.kind === 'accept-clear-layer-candidates') {
    next.layers.forEach((layer) => {
      if (layer.engineeringSoilGroup === 'unclassified' || layer.soilConfirmationRequired || layer.reviewRequired || layer.evidenceReviewRequired || layer.soilDecision?.reviewStatus !== 'pending' || layer.soilDecision?.reviewAction === 'merged-inherited' || layer.soilDecision?.reviewAction === 'split-inherited') return;
      layer.soilDecision = {
        ...(layer.soilDecision ?? { suggestedGroup: layer.engineeringSoilGroup, finalGroup: layer.engineeringSoilGroup, source: 'manual' as const, decidedAt: now }),
        finalGroup: layer.engineeringSoilGroup,
        finalDetailedType: compatibleDetailedSoilType(layer.engineeringSoilGroup, layer.soilDecision?.finalDetailedType, layer.soilDecision?.suggestedDetailedType),
        reviewStatus: 'accepted',
        reviewAction: 'batch-accepted',
        decidedAt: now,
      };
      layer.reviewRequired = false;
    });
  } else if (command.kind === 'defer-layer-candidate') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待暂留土层不存在。' };
    if (!STRATIFICATION_DEFER_REASONS.some((reason) => reason.id === command.reason)) return { ok: false as const, problem: '请选择暂时保留的原因。' };
    if (command.reason === 'other' && !command.note?.trim()) return { ok: false as const, problem: '选择其他原因时，请补充一句说明。' };
    layer.soilDecision = {
      ...(layer.soilDecision ?? { suggestedGroup: null, finalGroup: layer.engineeringSoilGroup, source: 'manual' as const, decidedAt: now }),
      reviewStatus: 'deferred',
      reviewAction: 'deferred',
      decisionReason: command.reason,
      decisionNote: command.note?.trim() || undefined,
      deferredAt: now,
      decidedAt: now,
    };
    layer.reviewRequired = true;
    if (layer.majorGroupComposition?.reviewReasons && !layer.majorGroupComposition.reviewReasons.some((reason) => reason.kind === 'legacy-untyped')) {
      layer.majorGroupComposition.reviewReasons.push({ kind: 'legacy-untyped', sourceLayerIds: [...layer.majorGroupComposition.sourceLayerIds] });
    }
  } else if (command.kind === 'set-layer-guide-review') {
    const layer = next.layers.find((candidate) => candidate.layerId === command.layerId);
    if (!layer) return { ok: false as const, problem: '待标记土层不存在。' };
    layer.soilDecision = {
      ...(layer.soilDecision ?? { suggestedGroup: null, finalGroup: layer.engineeringSoilGroup, source: 'manual' as const, decidedAt: now }),
      reviewStatus: command.reviewRequired ? 'needs-review' : 'accepted',
      reviewAction: command.reviewRequired ? 'marked-for-review' : 'accepted',
      decidedAt: now,
    };
    if (!command.reviewRequired) withoutMajorGroupReviewKinds(layer, ['legacy-untyped']);
    else if (layer.majorGroupComposition?.reviewReasons && !layer.majorGroupComposition.reviewReasons.some((reason) => reason.kind === 'legacy-untyped')) {
      layer.majorGroupComposition.reviewReasons.push({ kind: 'legacy-untyped', sourceLayerIds: [...layer.majorGroupComposition.sourceLayerIds] });
    }
    layer.reviewRequired = command.reviewRequired || Boolean(layer.majorGroupComposition?.reviewReasons?.length || layer.soilConfirmationRequired || layer.evidenceReviewRequired);
    if (layer.soilDecision) layer.soilDecision.reviewStatus = layer.reviewRequired ? 'needs-review' : 'accepted';
  } else if (command.kind === 'set-boundary-review') {
    const boundary = next.boundaries.find((candidate) => candidate.boundaryId === command.boundaryId);
    if (!boundary) return { ok: false as const, problem: '待修改边界不存在。' };
    boundary.reviewRequired = command.reviewRequired;
    boundary.note = command.note?.trim() ?? boundary.note;
  } else if (command.kind === 'set-boundary-major-group-lock') {
    const boundary = next.boundaries.find((candidate) => candidate.boundaryId === command.boundaryId);
    if (!boundary) return { ok: false as const, problem: '待修改边界不存在。' };
    boundary.majorGroupMergeLocked = command.locked;
  }
  return { ok: true as const, scheme: finalizeScheme(next, now) };
}

function splitAtDepth(
  scheme: StratificationSchemeV2,
  requestedDepth: number,
  now: string,
  expectedLayerId?: string,
) {
  const depth = roundDepth(requestedDepth);
  if (!Number.isFinite(depth)) return { ok: false as const, problem: '边界深度必须是有限数值。' };
  const layer = scheme.layers.find((candidate) =>
    (!expectedLayerId || candidate.layerId === expectedLayerId)
    && depth > candidate.depthFromM
    && depth < candidate.depthToM,
  );
  if (!layer) return { ok: false as const, problem: '该深度不在可拆分土层内。' };
  if (depth - layer.depthFromM < PROTOTYPE_EDIT_SPACING_M || layer.depthToM - depth < PROTOTYPE_EDIT_SPACING_M) {
    return { ok: false as const, problem: `当前原型要求相邻边界至少间隔 ${PROTOTYPE_EDIT_SPACING_M.toFixed(2)} m，请调整新边界位置。` };
  }
  const originalBottom = layer.depthToM;
  const inheritedDecision = layer.soilDecision ? {
    ...structuredClone(layer.soilDecision),
    reviewStatus: 'pending' as const,
    reviewAction: 'split-inherited' as const,
    source: 'inherited' as const,
    decidedAt: now,
  } : undefined;
  layer.depthToM = depth;
  layer.soilDecision = inheritedDecision ? structuredClone(inheritedDecision) : undefined;
  layer.reviewRequired = true;
  const newLayer: StratificationLayerV2 = {
    layerId: `${scheme.schemeId}:layer:${createIdentifier('layer')}`,
    name: `未命名层 ${scheme.layers.length + 1}`,
    description: '',
    engineeringSoilGroup: layer.engineeringSoilGroup,
    soilDecision: inheritedDecision ? structuredClone(inheritedDecision) : undefined,
    reviewRequired: true,
    mergeSources: layer.mergeSources ? structuredClone(layer.mergeSources) : undefined,
    depthFromM: depth,
    depthToM: originalBottom,
  };
  scheme.layers.push(newLayer);
  scheme.boundaries.push({
    boundaryId: `${scheme.schemeId}:boundary:${createIdentifier('boundary')}`,
    depthM: depth,
    upperLayerId: layer.layerId,
    lowerLayerId: newLayer.layerId,
    reviewRequired: false,
    note: '',
  });
  return { ok: true as const, scheme: finalizeScheme(scheme, now) };
}

function restoreMergedLayerSources(
  scheme: StratificationSchemeV2,
  layer: StratificationLayerV2,
  now: string,
) {
  const availability = getMergedLayerRestoreAvailability(layer);
  if (!availability.available) return { ok: false as const, problem: availability.reason };
  const originalRange = { depthFromM: layer.depthFromM, depthToM: layer.depthToM };
  for (const source of availability.sources.slice(0, -1)) {
    const split = splitAtDepth(scheme, source.depthToM, now);
    if (!split.ok) return split;
  }
  const restoredLayers = scheme.layers
    .filter((candidate) => candidate.depthFromM >= originalRange.depthFromM && candidate.depthToM <= originalRange.depthToM)
    .sort((left, right) => left.depthFromM - right.depthFromM);
  if (restoredLayers.length !== availability.sources.length) {
    return { ok: false as const, problem: '恢复后的土层数量与合并来源不一致，当前结构未应用。' };
  }
  restoredLayers.forEach((restoredLayer, index) => {
    const source = availability.sources[index];
    restoredLayer.name = source.name;
    restoredLayer.description = source.description;
    restoredLayer.engineeringSoilGroup = source.engineeringSoilGroup;
    restoredLayer.reviewRequired = true;
    restoredLayer.soilConfirmationRequired = source.engineeringSoilGroup === 'unclassified';
    restoredLayer.evidenceReviewRequired = false;
    restoredLayer.majorGroupComposition = undefined;
    restoredLayer.mergeSources = [structuredClone(source)];
    restoredLayer.soilDecision = {
      suggestedGroup: source.engineeringSoilGroup === 'unclassified' ? null : source.engineeringSoilGroup,
      finalGroup: source.engineeringSoilGroup,
      suggestedDetailedType: source.detailedSoilType ?? null,
      finalDetailedType: source.detailedSoilType ?? null,
      reviewStatus: 'pending',
      reviewAction: 'split-inherited',
      decisionReason: '已恢复合并前结构；来源深度和土类已还原，请结合 qc、fs、u2 重新确认。',
      ...(source.methodClassification ? { methodClassification: structuredClone(source.methodClassification) } : {}),
      source: 'inherited',
      decidedAt: now,
    };
  });
  return { ok: true as const, scheme: finalizeScheme(scheme, now) };
}

function mergeAcrossBoundary(
  scheme: StratificationSchemeV2,
  boundary: StratificationBoundaryV2,
  now: string,
  retain: 'upper' | 'lower' = 'upper',
  inherit: 'thicker' | 'retained' = 'thicker',
) {
  const upper = scheme.layers.find((layer) => layer.layerId === boundary.upperLayerId);
  const lower = scheme.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
  if (!upper || !lower) return;
  const sources = [
    ...(upper.mergeSources ?? [layerMergeSource(upper)]),
    ...(lower.mergeSources ?? [layerMergeSource(lower)]),
  ];
  const upperThickness = upper.depthToM - upper.depthFromM;
  const lowerThickness = lower.depthToM - lower.depthFromM;
  const retained = retain === 'lower' ? lower : upper;
  const inherited = inherit === 'retained' ? retained : lowerThickness > upperThickness ? lower : upper;
  const removed = retain === 'lower' ? upper : lower;
  retained.depthFromM = upper.depthFromM;
  retained.depthToM = lower.depthToM;
  retained.description = [upper.description, lower.description].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join('；');
  retained.mergeSources = sources;
  retained.majorGroupComposition = undefined;
  retained.engineeringSoilGroup = inherited.engineeringSoilGroup;
  retained.soilConfirmationRequired = inherited.engineeringSoilGroup === 'unclassified';
  retained.evidenceReviewRequired = upper.evidenceReviewRequired || lower.evidenceReviewRequired;
  retained.soilDecision = {
    ...(inherited.soilDecision ?? { suggestedGroup: inherited.engineeringSoilGroup === 'unclassified' ? null : inherited.engineeringSoilGroup, finalGroup: inherited.engineeringSoilGroup, source: 'manual' as const, decidedAt: now }),
    finalGroup: inherited.engineeringSoilGroup,
    reviewStatus: 'pending',
    reviewAction: 'merged-inherited',
    source: 'inherited',
    decidedAt: now,
  };
  retained.reviewRequired = true;
  scheme.layers = scheme.layers.filter((layer) => layer.layerId !== removed.layerId);
  scheme.boundaries = scheme.boundaries.filter((candidate) => candidate.boundaryId !== boundary.boundaryId);
}

function finalizeScheme(scheme: StratificationSchemeV2, now: string) {
  scheme.layers.sort((left, right) => left.depthFromM - right.depthFromM);
  scheme.layers.forEach((layer, index) => {
    if (/^未命名层 \d+$/.test(layer.name)) layer.name = `未命名层 ${index + 1}`;
  });
  scheme.boundaries = normalizeBoundariesToLayerSeams(scheme);
  scheme.status = 'working';
  scheme.updatedAt = now;
  return scheme;
}

function normalizeBoundariesToLayerSeams(scheme: StratificationSchemeV2) {
  const candidates = [...scheme.boundaries].sort((left, right) => left.depthM - right.depthM);
  const used = new Set<string>();
  return scheme.layers.slice(0, -1).map((upper, index) => {
    const lower = scheme.layers[index + 1];
    const sharedDepthM = roundDepth(upper.depthToM);
    const exactReference = candidates.find((candidate) => (
      !used.has(candidate.boundaryId)
      && candidate.upperLayerId === upper.layerId
      && candidate.lowerLayerId === lower.layerId
    ));
    const matchingDepth = candidates.find((candidate) => !used.has(candidate.boundaryId) && sameDepth(candidate.depthM, sharedDepthM));
    const source = exactReference ?? matchingDepth;
    const boundary: StratificationBoundaryV2 = source
      ? structuredClone(source)
      : {
          boundaryId: `${scheme.schemeId}:boundary:${createIdentifier('boundary')}`,
          depthM: sharedDepthM,
          upperLayerId: upper.layerId,
          lowerLayerId: lower.layerId,
          reviewRequired: true,
          note: '边界对象已按相邻土层接缝恢复，请工程师复核。',
        };
    if (source) used.add(source.boundaryId);
    boundary.depthM = sharedDepthM;
    boundary.upperLayerId = upper.layerId;
    boundary.lowerLayerId = lower.layerId;
    return boundary;
  });
}

function layerMergeSource(layer: StratificationLayerV2) {
  return {
    sourceLayerId: layer.layerId,
    name: layer.name,
    engineeringSoilGroup: layer.engineeringSoilGroup,
    detailedSoilType: layer.soilDecision?.finalDetailedType ?? layer.soilDecision?.suggestedDetailedType ?? null,
    ...(layer.soilDecision?.methodClassification ? { methodClassification: structuredClone(layer.soilDecision.methodClassification) } : {}),
    description: layer.description,
    depthFromM: layer.depthFromM,
    depthToM: layer.depthToM,
  };
}

function recordManualMerge(
  scheme: StratificationSchemeV2,
  boundaryId: string,
  sourceLayerIds: string[],
  reason: ManualMergeReason,
  beforeLayerCount: number,
  now: string,
) {
  scheme.manualMergeHistory = [
    ...(scheme.manualMergeHistory ?? []),
    {
      mergeId: createIdentifier('manual-merge'),
      sourceLayerIds,
      sourceBoundaryId: boundaryId,
      reason,
      beforeLayerCount,
      afterLayerCount: scheme.layers.length,
      appliedAt: now,
    },
  ];
}

function isManualMergeReason(reason: unknown): reason is ManualMergeReason {
  return reason === 'curve-evidence' || reason === 'classification-equivalent' || reason === 'engineering-judgement';
}

function createSession(
  scheme: StratificationSchemeV2,
  now: string,
  isNew: boolean,
  dirty: boolean,
): StratificationEditSessionV2 {
  return {
    sessionId: createIdentifier('edit'),
    schemeId: scheme.schemeId,
    baseVersion: scheme.version,
    baseline: structuredClone(scheme),
    working: structuredClone(scheme),
    undoStack: [],
    redoStack: [],
    dirty,
    isNew,
    startedAt: now,
  };
}

function getVisibleScheme(workspace: StratificationWorkspaceV2, schemeId: string) {
  if (workspace.editSession?.schemeId === schemeId) return workspace.editSession.working;
  return workspace.schemes.find((scheme) => scheme.schemeId === schemeId) ?? null;
}

function problemIssue(
  scheme: StratificationSchemeV2,
  issueId: string,
  title: string,
  message: string,
  action: string,
  layerId?: string,
  boundaryId?: string,
): StratificationIssue {
  return { issueId, severity: 'problem', title, message, action, schemeId: scheme.schemeId, layerId, boundaryId };
}

function nextSchemeName(workspace: StratificationWorkspaceV2) {
  return uniqueSchemeName(workspace, `分层方案 ${workspace.schemes.length + 1}`);
}

function uniqueSchemeName(workspace: StratificationWorkspaceV2, preferred: string) {
  const names = new Set(workspace.schemes.map((scheme) => normalizeName(scheme.name)));
  if (!names.has(normalizeName(preferred))) return preferred;
  let index = 2;
  while (names.has(normalizeName(`${preferred} ${index}`))) index += 1;
  return `${preferred} ${index}`;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function roundDepth(value: number) {
  return Number(value.toFixed(3));
}

function sameDepth(left: number, right: number) {
  return Math.abs(left - right) < 0.0005;
}

function schemesEqual(left: StratificationSchemeV2, right: StratificationSchemeV2) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createIdentifier(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}
