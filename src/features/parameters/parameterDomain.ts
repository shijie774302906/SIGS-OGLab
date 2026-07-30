import type { ImportDataBlockV2, PointWorkspaceV2, StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import { artifactDependenciesEqual, selectCurrentCheckResult } from '../workspace/workspaceV2';
import { getStratificationHandoffGate } from '../stratification/stratificationDomain';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import { validateParameterAuthorityCatalog, validateParameterMethodRunStructure } from './parameterMethodDomain';
import { markCustomFormulasStale, validateCustomFormulaWorkspaceStructure } from './customFormulaDomain';
import type {
  ParameterDerivedInputRowV2,
  ParameterDerivationSummaryV2,
  ParameterInputDerivationRunV2,
  ParameterInputRowV2,
  ParameterInputSettingsV2,
  ParameterIssueV2,
  ParameterSchemeEditSessionV2,
  ParameterSchemeRevisionV2,
  ParameterSchemeV2,
  ParameterSlotV2,
  ParameterSourceLineageV2,
  ParameterWorkspaceV2,
} from './parameterTypes';
import {
  PARAMETER_INPUT_DERIVATION_ALGORITHM_ID,
  PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION,
  PARAMETER_INPUT_DERIVATION_SPEC,
  PARAMETER_PHI_PEAK_METHOD_ID,
  PARAMETER_PHI_PEAK_METHOD_VERSION,
  PARAMETER_SUC_METHOD_ID,
  PARAMETER_SUC_METHOD_VERSION,
} from './parameterTypes';

export const PARAMETER_FR_DIFFERENCE_NOTICE_THRESHOLD_PERCENT = 0.1;

export const PARAMETER_INPUT_SETTING_LIMITS = {
  netAreaRatio: { min: 0.35, max: 0.95 },
  soilTotalUnitWeightKnM3: { min: 12, max: 24 },
  waterUnitWeightKnM3: { min: 9.5, max: 10.5 },
  atmosphericPressureKpa: { min: 80, max: 120 },
  minEffectiveStressKpa: { min: 1, max: 25 },
  iterationCount: { min: 2, max: 8 },
} as const;

export function createDefaultParameterInputSettings(): ParameterInputSettingsV2 {
  return {
    netAreaRatio: 0.8,
    soilTotalUnitWeightKnM3: 18,
    waterUnitWeightKnM3: 10.05,
    atmosphericPressureKpa: 100,
    minEffectiveStressKpa: 5,
    iterationCount: 4,
    qtSourcePolicy: 'derive-only-when-missing',
  };
}

export function emptyParameterWorkspace(): ParameterWorkspaceV2 {
  return {
    parameterWorkspaceSchemaVersion: 'parameter-workspace-g1b.v1',
    schemes: [],
    activeSchemeId: null,
    currentSchemeId: null,
    editSession: null,
    revisions: [],
    derivationRuns: [],
    parameterRuns: [],
    methodEvidenceRevisions: [],
    currentMethodEvidenceRefs: {},
    referenceTestRevisions: [],
    currentReferenceTestRefs: {},
    manualEntryRevisions: [],
    resultSelections: [],
    currentResultSelectionRef: null,
    customFormulas: [],
    activeCustomFormulaId: null,
    customFormulaEditSession: null,
    customFormulaRevisions: [],
    customFormulaRuns: [],
    jtsParameterPackageRuns: [],
    activeJtsParameterPackageRunId: null,
    guidedParameterDraft: null,
    jtsDissipationTests: [],
    activeJtsDissipationTestRevisionId: null,
    jtsDissipationT50Revisions: [],
    activeJtsDissipationT50RevisionId: null,
    jtsDissipationResults: [],
    activeJtsDissipationResultRevisionId: null,
  };
}

export function validateParameterInputSettings(settings: ParameterInputSettingsV2) {
  const problems: string[] = [];
  validateRange(settings.netAreaRatio, PARAMETER_INPUT_SETTING_LIMITS.netAreaRatio, '净面积比 a_net', problems);
  validateRange(settings.soilTotalUnitWeightKnM3, PARAMETER_INPUT_SETTING_LIMITS.soilTotalUnitWeightKnM3, '土总重度 gamma_t', problems);
  validateRange(settings.waterUnitWeightKnM3, PARAMETER_INPUT_SETTING_LIMITS.waterUnitWeightKnM3, '水重度 gamma_w', problems);
  validateRange(settings.atmosphericPressureKpa, PARAMETER_INPUT_SETTING_LIMITS.atmosphericPressureKpa, '大气压 pa', problems);
  validateRange(settings.minEffectiveStressKpa, PARAMETER_INPUT_SETTING_LIMITS.minEffectiveStressKpa, '最小有效应力', problems);
  validateRange(settings.iterationCount, PARAMETER_INPUT_SETTING_LIMITS.iterationCount, '迭代次数', problems);
  if (!Number.isInteger(settings.iterationCount)) problems.push('迭代次数必须是整数。');
  if (!['derive-only-when-missing', 'derive-when-imported-invalid'].includes(settings.qtSourcePolicy)) {
    problems.push('qt 来源策略无效。');
  }
  return problems;
}

export function deriveParameterInputsV1(
  inputRows: ParameterInputRowV2[],
  waterDepthM: number,
  settings: ParameterInputSettingsV2,
) {
  const setupProblems = validateParameterInputSettings(settings);
  if (!Number.isFinite(waterDepthM) || waterDepthM < 0) {
    setupProblems.push('水深必须是大于或等于 0 m 的有限数值。');
  }
  if (!inputRows.length) setupProblems.push('当前点位没有可用于前置推导的数据行。');
  if (setupProblems.length) {
    return {
      ok: false as const,
      problems: setupProblems,
      rows: [] as ParameterDerivedInputRowV2[],
      issues: setupProblems.map((message, index) => globalProblem(`PAR-SETUP-${index + 1}`, message)),
      summary: emptySummary(inputRows.length),
    };
  }

  const rows = inputRows.map((row) => deriveRow(row, waterDepthM, settings));
  const issues: ParameterIssueV2[] = [];
  rows.forEach((row) => {
    if (row.status !== 'valid') {
      issues.push({
        issueId: `par-row-${safeId(row.sourceRowId)}-${row.reasonCode ?? 'undefined'}`,
        severity: 'problem',
        reasonCode: row.reasonCode ?? 'PAR-ROW-UNDEFINED',
        message: row.message ?? '当前数据行无法完成前置推导。',
        sourceRowId: row.sourceRowId,
      });
    }
    if (
      row.status === 'valid'
      && row.frDifferencePercent !== null
      && Math.abs(row.frDifferencePercent) > PARAMETER_FR_DIFFERENCE_NOTICE_THRESHOLD_PERCENT
    ) {
      issues.push({
        issueId: `par-row-${safeId(row.sourceRowId)}-fr-difference`,
        severity: 'notice',
        reasonCode: 'PAR-FR-DIFFERENCE',
        message: `导入 Fr 与按 fs/qnet 重算值相差 ${Math.abs(row.frDifferencePercent).toFixed(3)} 个百分点。`,
        sourceRowId: row.sourceRowId,
      });
    }
  });
  return { ok: true as const, rows, issues, summary: summarizeRows(rows, issues) };
}

export function buildParameterInputRows(point: PointWorkspaceV2, dataBlock: ImportDataBlockV2) {
  const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
  if (!draft) return { ok: false as const, problem: '当前点位没有活动导入草稿。' };
  if (dataBlock.kind !== 'normalized' || dataBlock.dataBlockId !== draft.dataBlockId) {
    return { ok: false as const, problem: '当前数据块不属于活动导入草稿。' };
  }
  if (!dataBlock.rowReferences) return { ok: false as const, problem: '当前归一化数据缺少稳定来源行映射，请重新导入后再运行参数推导。' };
  const referenceBySourceRowId = new Map(dataBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]));
  if (referenceBySourceRowId.size !== dataBlock.rowReferences.length) {
    return { ok: false as const, problem: '当前归一化数据包含重复的来源行映射。' };
  }
  const rows = draft.sourceRowIds.map((sourceRowId) => {
    const reference = referenceBySourceRowId.get(sourceRowId);
    return reference ? dataBlock.rows[reference.normalizedIndex] : undefined;
  });
  if (rows.some((row) => !row)) return { ok: false as const, problem: '活动草稿引用的归一化来源行不存在。' };
  return {
    ok: true as const,
    rows: rows.map((row, index): ParameterInputRowV2 => ({
      sourceRowId: draft.sourceRowIds[index],
      depthM: row!.depthM,
      qcKpa: finiteOrNull(row!.qcKpa),
      qtKpa: finiteOrNull(row!.qtKpa),
      fsKpa: finiteOrNull(row!.fsKpa),
      u2Kpa: finiteOrNull(row!.u2Kpa),
      importedFrPercent: finiteOrNull(row!.frPercent),
    })),
  };
}

export function getCurrentParameterSource(point: PointWorkspaceV2) {
  const check = selectCurrentCheckResult(point);
  if (!check.isCurrent || !check.run || check.run.conclusion === '存在问题') {
    return { ok: false as const, problem: '当前数据检查没有可供参数解译使用的无问题结果。', recovery: 'check' as const };
  }
  const workspace = point.stratificationWorkspace;
  const scheme = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
  const revision = scheme
    ? workspace?.revisions?.find((candidate) => candidate.schemeId === scheme.schemeId && candidate.version === scheme.version)
    : undefined;
  if (!workspace || !scheme || !revision || scheme.status !== 'current') {
    return { ok: false as const, problem: '当前点位没有已提交的精确分层修订。', recovery: 'stratification' as const };
  }
  const stratificationGate = getStratificationHandoffGate(workspace, scheme.input);
  if (stratificationGate.state === 'deny') {
    return { ok: false as const, problem: stratificationGate.reason, recovery: 'stratification' as const };
  }
  if (
    point.stratificationState.status !== 'current'
    || point.stratificationState.sourceStratificationSchemeId !== scheme.schemeId
    || point.stratificationState.sourceStratificationRevisionId !== revision.revisionId
    || point.stratificationState.sourceCheckRunId !== check.run.runId
    || !artifactDependenciesEqual(point.stratificationState.input, scheme.input)
  ) {
    return { ok: false as const, problem: '当前分层状态与精确修订来源不一致。', recovery: 'stratification' as const };
  }
  const input: ParameterSourceLineageV2 = {
    pointId: point.pointId,
    siteId: point.siteId ?? null,
    draftId: scheme.input.draftId,
    batchId: scheme.input.batchId,
    revisions: { ...scheme.input.revisions },
    checkRunId: scheme.input.checkRunId,
    stratificationSchemeId: scheme.schemeId,
    stratificationRevisionId: revision.revisionId,
    stratificationVersion: revision.version,
  };
  return { ok: true as const, input, stratificationRevision: structuredClone(revision) };
}

export function createParameterScheme(
  workspace: ParameterWorkspaceV2 | undefined,
  input: ParameterSourceLineageV2,
  name = '参数方案 1',
  now = new Date().toISOString(),
  schemeId = createIdentifier('parameter-scheme'),
) {
  const next = structuredClone(workspace ?? emptyParameterWorkspace());
  if (next.editSession?.dirty) return { ok: false as const, problem: '当前方案有未提交修改，请先提交或放弃。' };
  const normalizedName = normalizeDisplayName(name);
  if (!normalizedName) return { ok: false as const, problem: '请输入参数方案名称。' };
  if (hasSchemeName(next, normalizedName)) return { ok: false as const, problem: '参数方案名称已存在。' };
  if (next.schemes.some((scheme) => scheme.schemeId === schemeId)) return { ok: false as const, problem: '参数方案标识已存在。' };
  const scheme: ParameterSchemeV2 = {
    schemeId,
    name: normalizedName,
    status: 'working',
    version: 0,
    input: cloneLineage(input),
    inputSettings: createDefaultParameterInputSettings(),
    slots: [],
    createdAt: now,
    updatedAt: now,
  };
  next.schemes.push(scheme);
  next.activeSchemeId = schemeId;
  next.editSession = createEditSession(scheme, now, true, true);
  return { ok: true as const, workspace: next, scheme: structuredClone(scheme) };
}

export function beginParameterSchemeEdit(
  workspace: ParameterWorkspaceV2,
  schemeId: string,
  currentInput: ParameterSourceLineageV2,
  now = new Date().toISOString(),
) {
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === schemeId);
  if (!scheme || scheme.status === 'deleted') return { ok: false as const, problem: '参数方案不存在。' };
  if (scheme.status === 'stale' || !sameParameterSource(scheme.input, currentInput)) {
    return { ok: false as const, problem: '参数方案不再对应当前精确分层修订，请创建修订方案。' };
  }
  if (workspace.editSession?.dirty && workspace.editSession.schemeId !== schemeId) {
    return { ok: false as const, problem: '其他参数方案有未提交修改，请先提交或放弃。' };
  }
  if (workspace.editSession?.dirty && workspace.editSession.schemeId === schemeId) {
    return { ok: true as const, workspace: structuredClone(workspace), resumed: true as const };
  }
  const next = structuredClone(workspace);
  next.activeSchemeId = schemeId;
  next.editSession = createEditSession(scheme, now, false, false);
  return { ok: true as const, workspace: next };
}

export function updateParameterSchemeSettings(
  workspace: ParameterWorkspaceV2,
  patch: Partial<ParameterInputSettingsV2>,
  now = new Date().toISOString(),
) {
  if (!workspace.editSession) return { ok: false as const, problem: '当前没有可编辑的参数方案。' };
  const next = structuredClone(workspace);
  const session = next.editSession as ParameterSchemeEditSessionV2;
  session.working.inputSettings = { ...session.working.inputSettings, ...patch };
  session.working.updatedAt = now;
  session.dirty = !parameterSchemesEqual(session.baseline, session.working);
  return { ok: true as const, workspace: next, problems: validateParameterInputSettings(session.working.inputSettings) };
}

export function renameParameterSchemeDraft(
  workspace: ParameterWorkspaceV2,
  name: string,
  now = new Date().toISOString(),
) {
  if (!workspace.editSession) return { ok: false as const, problem: '当前没有可编辑的参数方案。' };
  const normalized = normalizeDisplayName(name);
  if (!normalized) return { ok: false as const, problem: '请输入参数方案名称。' };
  if (hasSchemeName(workspace, normalized, workspace.editSession.schemeId)) {
    return { ok: false as const, problem: '参数方案名称已存在。' };
  }
  const next = structuredClone(workspace);
  const session = next.editSession as ParameterSchemeEditSessionV2;
  session.working.name = normalized;
  session.working.updatedAt = now;
  session.dirty = !parameterSchemesEqual(session.baseline, session.working);
  return { ok: true as const, workspace: next };
}

export function commitParameterSchemeEdit(
  workspace: ParameterWorkspaceV2,
  currentInput: ParameterSourceLineageV2,
  now = new Date().toISOString(),
  revisionId = createIdentifier('parameter-revision'),
) {
  const session = workspace.editSession;
  if (!session) return { ok: false as const, problem: '当前没有可提交的参数方案修改。' };
  if (session.staleReason || !sameParameterSource(session.working.input, currentInput)) {
    return { ok: false as const, problem: '上游精确来源已变化，当前修改已保留但不能提交。' };
  }
  const stored = workspace.schemes.find((scheme) => scheme.schemeId === session.schemeId);
  if (!stored || stored.version !== session.baseVersion) {
    return { ok: false as const, problem: '参数方案版本已变化，不能覆盖较新的版本。' };
  }
  const settingsProblems = validateParameterInputSettings(session.working.inputSettings);
  if (settingsProblems.length) return { ok: false as const, problem: settingsProblems[0], problems: settingsProblems };
  if (hasSchemeName(workspace, session.working.name, session.schemeId)) {
    return { ok: false as const, problem: '参数方案名称已存在。' };
  }
  if (workspace.revisions.some((revision) => revision.revisionId === revisionId)) {
    return { ok: false as const, problem: '参数方案修订标识已存在。' };
  }
  const committed: ParameterSchemeV2 = {
    ...structuredClone(session.working),
    status: 'current',
    version: session.baseVersion + 1,
    input: cloneLineage(currentInput),
    updatedAt: now,
  };
  const next = structuredClone(workspace);
  next.schemes = next.schemes.map((scheme) => {
    if (scheme.schemeId === committed.schemeId) return structuredClone(committed);
    if (scheme.status === 'current') return { ...scheme, status: 'history' as const };
    return scheme;
  });
  next.activeSchemeId = committed.schemeId;
  next.currentSchemeId = committed.schemeId;
  next.editSession = null;
  const revision: ParameterSchemeRevisionV2 = {
    revisionId,
    schemeId: committed.schemeId,
    version: committed.version,
    snapshot: structuredClone(committed),
    committedAt: now,
  };
  next.revisions.push(revision);
  return { ok: true as const, workspace: next, scheme: committed, revision };
}

export function discardParameterSchemeEdit(workspace: ParameterWorkspaceV2) {
  if (!workspace.editSession) return { ok: true as const, workspace: structuredClone(workspace) };
  const next = structuredClone(workspace);
  if (next.editSession?.isNew) {
    next.schemes = next.schemes.filter((scheme) => scheme.schemeId !== next.editSession?.schemeId);
    next.activeSchemeId = next.currentSchemeId ?? next.schemes.find((scheme) => scheme.status !== 'deleted')?.schemeId ?? null;
  }
  next.editSession = null;
  return { ok: true as const, workspace: next };
}

export function duplicateParameterScheme(
  workspace: ParameterWorkspaceV2,
  sourceSchemeId: string,
  currentInput: ParameterSourceLineageV2,
  name?: string,
  now = new Date().toISOString(),
  schemeId = createIdentifier('parameter-scheme'),
) {
  const source = workspace.schemes.find((scheme) => scheme.schemeId === sourceSchemeId && scheme.status !== 'deleted');
  if (!source) return { ok: false as const, problem: '待复制的参数方案不存在。' };
  if (!sameParameterSource(source.input, currentInput)) {
    return { ok: false as const, problem: '待复制方案不对应当前精确分层修订。' };
  }
  const created = createParameterScheme(workspace, currentInput, name ?? uniqueSchemeName(workspace, `${source.name} 副本`), now, schemeId);
  if (!created.ok) return created;
  const next = created.workspace;
  const session = next.editSession as ParameterSchemeEditSessionV2;
  session.working.inputSettings = structuredClone(source.inputSettings);
  session.working.slots = source.slots.map((slot) => ({ ...structuredClone(slot), slotId: `${schemeId}:slot:${createIdentifier('slot')}` }));
  const stored = next.schemes.find((scheme) => scheme.schemeId === schemeId);
  if (stored) {
    stored.inputSettings = structuredClone(session.working.inputSettings);
    stored.slots = structuredClone(session.working.slots);
  }
  return { ok: true as const, workspace: next, scheme: structuredClone(session.working) };
}

export function softDeleteParameterScheme(
  workspace: ParameterWorkspaceV2,
  schemeId: string,
  replacementSchemeId?: string,
  now = new Date().toISOString(),
) {
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === schemeId && candidate.status !== 'deleted');
  if (!scheme) return { ok: false as const, problem: '参数方案不存在。' };
  if (workspace.editSession?.schemeId === schemeId && workspace.editSession.dirty) {
    return { ok: false as const, problem: '该方案有未提交修改，请先提交或放弃。' };
  }
  const replacement = replacementSchemeId
    ? workspace.schemes.find((candidate) => candidate.schemeId === replacementSchemeId && candidate.status !== 'deleted')
    : undefined;
  if (replacementSchemeId && !replacement) return { ok: false as const, problem: '替代参数方案不存在。' };
  if (replacement?.schemeId === schemeId) return { ok: false as const, problem: '待删除方案不能作为自己的替代方案。' };
  if (replacement?.status === 'working') return { ok: false as const, problem: '替代参数方案必须已经提交。' };
  if (workspace.currentSchemeId !== schemeId && replacementSchemeId) {
    return { ok: false as const, problem: '只有删除当前参数方案时才需要指定替代方案。' };
  }
  if (workspace.currentSchemeId === schemeId && !replacement && workspace.schemes.some((candidate) => candidate.schemeId !== schemeId && candidate.status !== 'deleted')) {
    return { ok: false as const, problem: '删除当前参数方案前，请明确选择替代方案。' };
  }
  const next = structuredClone(workspace);
  next.schemes = next.schemes.map((candidate) => {
    if (candidate.schemeId === schemeId) return { ...candidate, status: 'deleted' as const, deletedAt: now, updatedAt: now };
    if (replacement && candidate.schemeId === replacement.schemeId) return { ...candidate, status: 'current' as const };
    if (replacement && candidate.status === 'current') return { ...candidate, status: 'history' as const };
    return candidate;
  });
  if (next.currentSchemeId === schemeId) next.currentSchemeId = replacement?.schemeId ?? null;
  if (next.activeSchemeId === schemeId) next.activeSchemeId = next.currentSchemeId ?? next.schemes.find((candidate) => candidate.status !== 'deleted')?.schemeId ?? null;
  if (next.editSession?.schemeId === schemeId) next.editSession = null;
  const currentSelection = next.currentResultSelectionRef
    ? next.resultSelections.find((selection) =>
        selection.selectionId === next.currentResultSelectionRef?.selectionId
        && selection.selectionRevisionId === next.currentResultSelectionRef?.selectionRevisionId)
    : null;
  if (currentSelection?.parameterSchemeId === schemeId) next.currentResultSelectionRef = null;
  return { ok: true as const, workspace: next };
}

export function restoreParameterScheme(
  workspace: ParameterWorkspaceV2,
  schemeId: string,
  now = new Date().toISOString(),
) {
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === schemeId && candidate.status === 'deleted');
  if (!scheme) return { ok: false as const, problem: '没有可恢复的参数方案。' };
  if (hasSchemeName(workspace, scheme.name, schemeId)) return { ok: false as const, problem: '当前已有同名参数方案，请先重命名。' };
  const next = structuredClone(workspace);
  const restored = next.schemes.find((candidate) => candidate.schemeId === schemeId) as ParameterSchemeV2;
  restored.status = 'history';
  restored.updatedAt = now;
  delete restored.deletedAt;
  next.activeSchemeId = schemeId;
  return { ok: true as const, workspace: next };
}

export function selectParameterScheme(workspace: ParameterWorkspaceV2, schemeId: string) {
  if (!workspace.schemes.some((scheme) => scheme.schemeId === schemeId && scheme.status !== 'deleted')) {
    return { ok: false as const, problem: '参数方案不存在。' };
  }
  if (workspace.editSession?.dirty && workspace.editSession.schemeId !== schemeId) {
    return { ok: false as const, problem: '当前参数方案有未提交修改，请先提交或放弃。' };
  }
  return { ok: true as const, workspace: { ...structuredClone(workspace), activeSchemeId: schemeId } };
}

export function markParameterWorkspaceStale(
  workspace: ParameterWorkspaceV2 | undefined,
  reason: string,
  now = new Date().toISOString(),
) {
  if (!workspace) return workspace;
  const next = structuredClone(workspace);
  next.schemes = next.schemes.map((scheme) => ['working', 'deleted'].includes(scheme.status) ? scheme : { ...scheme, status: 'stale' as const });
  if (next.editSession) next.editSession.staleReason = reason;
  next.derivationRuns.forEach((run) => {
    if (['queued', 'running', 'cancel-requested'].includes(run.status)) {
      run.status = 'invalidated';
      run.derivedRows = [];
      run.summary = null;
      run.issues = [];
      run.invalidatedAt = now;
      run.invalidationReason = reason;
    }
  });
  next.parameterRuns.forEach((run) => {
    if (['queued', 'running', 'cancel-requested'].includes(run.status)) {
      run.status = 'invalidated';
      run.values = [];
      run.layerSummaries = [];
      run.summary = null;
      run.issues = [];
      run.resultHash = null;
      run.invalidatedAt = now;
      run.invalidationReason = reason;
    }
  });
  next.currentResultSelectionRef = null;
  next.jtsParameterPackageRuns = (next.jtsParameterPackageRuns ?? []).map((run) => run.status === 'completed'
    ? { ...run, status: 'stale' as const, staleReason: reason }
    : run);
  next.activeJtsParameterPackageRunId = null;
  next.jtsDissipationTests = (next.jtsDissipationTests ?? []).map((test) => test.status !== 'stale'
    ? { ...test, status: 'stale' as const, staleReason: reason }
    : test);
  next.jtsDissipationResults = (next.jtsDissipationResults ?? []).map((result) => result.status === 'completed'
    ? { ...result, status: 'stale' as const, staleReason: reason }
    : result);
  next.activeJtsDissipationTestRevisionId = null;
  next.activeJtsDissipationT50RevisionId = null;
  next.activeJtsDissipationResultRevisionId = null;
  return markCustomFormulasStale(next, reason, now);
}

export async function prepareParameterInputDerivationRun(
  workspace: ParameterWorkspaceV2,
  schemeRevisionId: string,
  inputRows: ParameterInputRowV2[],
  waterDepthM: number,
  commandId: string,
  now = new Date().toISOString(),
  runId = createIdentifier('parameter-derivation-run'),
) {
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === schemeRevisionId);
  if (!revision) return { ok: false as const, problem: '参数方案修订不存在。' };
  const currentScheme = workspace.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
  if (
    !currentScheme
    || currentScheme.status !== 'current'
    || revision.schemeId !== currentScheme.schemeId
    || revision.version !== currentScheme.version
  ) return { ok: false as const, problem: '只有当前参数方案的最新精确修订可以创建前置推导。' };
  if (!commandId.trim()) return { ok: false as const, problem: '运行命令标识不能为空。' };
  const setupProblems = validateParameterInputSettings(revision.snapshot.inputSettings);
  if (!Number.isFinite(waterDepthM) || waterDepthM < 0) setupProblems.push('水深必须是大于或等于 0 m 的有限数值。');
  if (!inputRows.length) setupProblems.push('当前点位没有可用于前置推导的数据行。');
  if (setupProblems.length) return { ok: false as const, problem: setupProblems[0], problems: setupProblems };

  const formulaSpecHash = sha256HexSync(PARAMETER_INPUT_DERIVATION_SPEC);
  const settingsHash = sha256HexSync(stableStringify(revision.snapshot.inputSettings));
  const inputHash = sha256HexSync(stableStringify(inputRows));
  const sourceLineageHash = sha256HexSync(stableStringify(revision.snapshot.input));
  const idempotencyKey = sha256HexSync(stableStringify({
    commandId,
    schemeRevisionId,
    sourceLineageHash,
    formulaSpecHash,
    settingsHash,
    inputHash,
    waterDepthM,
  }));
  const sameCommand = workspace.derivationRuns.find((run) => run.commandId === commandId);
  if (sameCommand && sameCommand.idempotencyKey !== idempotencyKey) {
    return { ok: false as const, problem: '同一运行命令不能绑定不同的输入或设置。' };
  }
  const existing = workspace.derivationRuns.find((run) => run.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true as const, workspace: structuredClone(workspace), run: structuredClone(existing), reused: true as const };
  if (workspace.derivationRuns.some((run) => run.runId === runId)) return { ok: false as const, problem: '前置推导运行标识已存在。' };
  const run: ParameterInputDerivationRunV2 = {
    runId,
    commandId,
    idempotencyKey,
    schemeId: revision.schemeId,
    schemeRevisionId,
    pointId: revision.snapshot.input.pointId,
    input: cloneLineage(revision.snapshot.input),
    sourceLineageHash,
    algorithmId: PARAMETER_INPUT_DERIVATION_ALGORITHM_ID,
    algorithmVersion: PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION,
    formulaSpecHash,
    settingsSnapshot: structuredClone(revision.snapshot.inputSettings),
    settingsHash,
    inputRowsSnapshot: structuredClone(inputRows),
    inputHash,
    waterDepthM,
    status: 'queued',
    derivedRows: [],
    summary: null,
    issues: [],
    createdAt: now,
  };
  const next = structuredClone(workspace);
  next.derivationRuns.push(run);
  return { ok: true as const, workspace: next, run: structuredClone(run), reused: false as const };
}

export function startParameterInputDerivationRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionDerivationRun(workspace, runId, ['queued'], (run) => {
    run.status = 'running';
    run.startedAt = now;
  });
}

export function completeParameterInputDerivationRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  const run = workspace.derivationRuns.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '前置推导运行不存在。' };
  if (run.status !== 'running') return { ok: false as const, problem: '只有计算中的运行可以提交完成结果。' };
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === run.schemeRevisionId);
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
  if (!revision || !scheme || scheme.status !== 'current' || revision.schemeId !== scheme.schemeId || revision.version !== scheme.version) {
    return { ok: false as const, problem: '参数方案或上游来源已失效，当前推导不能完成。' };
  }
  const result = deriveParameterInputsV1(run.inputRowsSnapshot, run.waterDepthM, run.settingsSnapshot);
  if (!result.ok) return { ok: false as const, problem: result.problems[0], problems: result.problems };
  const next = structuredClone(workspace);
  const target = next.derivationRuns.find((candidate) => candidate.runId === runId) as ParameterInputDerivationRunV2;
  target.status = 'completed';
  target.derivedRows = structuredClone(result.rows);
  target.summary = structuredClone(result.summary);
  target.issues = structuredClone(result.issues);
  target.completedAt = now;
  return { ok: true as const, workspace: next, run: structuredClone(target) };
}

export function requestParameterInputDerivationCancellation(
  workspace: ParameterWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionDerivationRun(workspace, runId, ['queued', 'running'], (run) => {
    run.status = 'cancel-requested';
    run.cancelRequestedAt = now;
  });
}

export function finalizeParameterInputDerivationCancellation(
  workspace: ParameterWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionDerivationRun(workspace, runId, ['cancel-requested'], (run) => {
    run.status = 'cancelled';
    run.derivedRows = [];
    run.summary = null;
    run.issues = [];
    run.cancelledAt = now;
  });
}

export function failParameterInputDerivationRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  errorCode: string,
  errorMessage: string,
  now = new Date().toISOString(),
) {
  return transitionDerivationRun(workspace, runId, ['queued', 'running'], (run) => {
    run.status = 'failed';
    run.derivedRows = [];
    run.summary = null;
    run.issues = [];
    run.errorCode = errorCode;
    run.errorMessage = errorMessage;
    run.failedAt = now;
  });
}

export async function findReusableCompletedDerivationRun(
  workspace: ParameterWorkspaceV2,
  schemeRevisionId: string,
  inputRows: ParameterInputRowV2[],
  waterDepthM: number,
) {
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === schemeRevisionId);
  if (!revision) return null;
  const formulaSpecHash = sha256HexSync(PARAMETER_INPUT_DERIVATION_SPEC);
  const settingsHash = sha256HexSync(stableStringify(revision.snapshot.inputSettings));
  const inputHash = sha256HexSync(stableStringify(inputRows));
  const sourceLineageHash = sha256HexSync(stableStringify(revision.snapshot.input));
  return workspace.derivationRuns.find((run) =>
    run.status === 'completed'
    && run.schemeRevisionId === schemeRevisionId
    && run.formulaSpecHash === formulaSpecHash
    && run.settingsHash === settingsHash
    && run.inputHash === inputHash
    && run.sourceLineageHash === sourceLineageHash
    && run.waterDepthM === waterDepthM,
  ) ?? null;
}

export function validateParameterWorkspaceStructure(workspace: ParameterWorkspaceV2, stratificationRevisions: StratificationSchemeRevisionV2[] = []) {
  const authorityValidation = validateParameterAuthorityCatalog(workspace);
  if (!authorityValidation.ok) return authorityValidation;
  const schemeIds = workspace.schemes.map((scheme) => scheme.schemeId);
  if (new Set(schemeIds).size !== schemeIds.length) return invalid('Parameter workspace contains duplicate scheme IDs.');
  if (workspace.activeSchemeId && !workspace.schemes.some((scheme) => scheme.schemeId === workspace.activeSchemeId && scheme.status !== 'deleted')) {
    return invalid('Parameter workspace active scheme is missing or deleted.');
  }
  if (workspace.currentSchemeId && !workspace.schemes.some((scheme) =>
    scheme.schemeId === workspace.currentSchemeId && ['current', 'stale'].includes(scheme.status),
  )) {
    return invalid('Parameter workspace current scheme is invalid.');
  }
  const currentSchemes = workspace.schemes.filter((scheme) => scheme.status === 'current');
  const pointedCurrent = workspace.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId);
  if (
    (!workspace.currentSchemeId && currentSchemes.length)
    || (pointedCurrent?.status === 'current' && (currentSchemes.length !== 1 || currentSchemes[0].schemeId !== workspace.currentSchemeId))
    || (pointedCurrent?.status === 'stale' && currentSchemes.length)
  ) return invalid('Parameter workspace current scheme pointer is ambiguous.');
  const revisionIds = workspace.revisions.map((revision) => revision.revisionId);
  const revisionVersions = workspace.revisions.map((revision) => `${revision.schemeId}:v${revision.version}`);
  if (new Set(revisionIds).size !== revisionIds.length || new Set(revisionVersions).size !== revisionVersions.length) {
    return invalid('Parameter workspace contains duplicate scheme revisions.');
  }
  for (const revision of workspace.revisions) {
    if (
      revision.snapshot.schemeId !== revision.schemeId
      || revision.snapshot.version !== revision.version
      || revision.snapshot.status !== 'current'
    ) return invalid(`Parameter revision ${revision.revisionId} does not match its immutable snapshot.`);
    if (validateParameterInputSettings(revision.snapshot.inputSettings).length) {
      return invalid(`Parameter revision ${revision.revisionId} contains invalid input settings.`);
    }
    for (const slot of revision.snapshot.slots) {
      const methodProblem = validateAuthorizedParameterSlot(slot);
      if (methodProblem) return invalid(`Parameter revision ${revision.revisionId}: ${methodProblem}`);
    }
  }
  for (const scheme of workspace.schemes) {
    if (validateParameterInputSettings(scheme.inputSettings).length) {
      return invalid(`Parameter scheme ${scheme.schemeId} contains invalid input settings.`);
    }
    const slotIds = scheme.slots.map((slot) => slot.slotId);
    if (new Set(slotIds).size !== slotIds.length) return invalid(`Parameter scheme ${scheme.schemeId} contains duplicate slot IDs.`);
    for (const slot of scheme.slots) {
      if (!['PhiDeg', 'SuKpa'].includes(slot.parameterKey)) return invalid(`Parameter slot ${slot.slotId} uses an unsupported parameter key.`);
      const methodProblem = validateAuthorizedParameterSlot(slot);
      if (methodProblem) return invalid(methodProblem);
      const scope = slot.targetScope;
      if (
        !Number.isFinite(scope.depthFromM)
        || !Number.isFinite(scope.depthToM)
        || scope.depthToM <= scope.depthFromM
        || !scope.layerIds.length
        || new Set(scope.layerIds).size !== scope.layerIds.length
      ) return invalid(`Parameter slot ${slot.slotId} contains an invalid target scope.`);
      const sortedExclusions = [...scope.excludedIntervals].sort((left, right) => left.depthFromM - right.depthFromM);
      if (sortedExclusions.some((interval, index) =>
        !Number.isFinite(interval.depthFromM)
        || !Number.isFinite(interval.depthToM)
        || interval.depthToM <= interval.depthFromM
        || interval.depthFromM < scope.depthFromM
        || interval.depthToM > scope.depthToM
        || (index > 0 && interval.depthFromM < sortedExclusions[index - 1].depthToM)
      )) return invalid(`Parameter slot ${slot.slotId} contains invalid or overlapping exclusions.`);
    }
    if (scheme.status !== 'working' && scheme.status !== 'deleted' && !workspace.revisions.some((revision) => revision.schemeId === scheme.schemeId && revision.version === scheme.version)) {
      return invalid(`Parameter scheme ${scheme.schemeId} is missing its immutable revision.`);
    }
    if (scheme.status !== 'working') {
      const revisions = workspace.revisions.filter((revision) => revision.schemeId === scheme.schemeId);
      const latest = revisions.reduce<ParameterSchemeRevisionV2 | null>(
        (current, revision) => !current || revision.version > current.version ? revision : current,
        null,
      );
      if (
        !latest
        || scheme.version !== latest.version
        || stableStringify(parameterSchemeRevisionContent(scheme)) !== stableStringify(parameterSchemeRevisionContent(latest.snapshot))
      ) return invalid(`Parameter scheme ${scheme.schemeId} does not match its latest immutable revision.`);
    }
  }
  if (workspace.editSession) {
    const session = workspace.editSession;
    const stored = workspace.schemes.find((scheme) => scheme.schemeId === session.schemeId);
    if (
      !stored
      || stored.version !== session.baseVersion
      || session.baseline.version !== session.baseVersion
      || session.working.version !== session.baseVersion
      || session.baseline.schemeId !== session.schemeId
      || session.working.schemeId !== session.schemeId
    ) return invalid('Parameter edit session has an invalid base version or scheme identity.');
  }
  const runIds = workspace.derivationRuns.map((run) => run.runId);
  const commandIds = workspace.derivationRuns.map((run) => run.commandId);
  const idempotencyKeys = workspace.derivationRuns.map((run) => run.idempotencyKey);
  if (new Set(runIds).size !== runIds.length || new Set(commandIds).size !== commandIds.length || new Set(idempotencyKeys).size !== idempotencyKeys.length) {
    return invalid('Parameter derivation runs contain duplicate identities.');
  }
  for (const run of workspace.derivationRuns) {
    const revision = workspace.revisions.find((candidate) => candidate.revisionId === run.schemeRevisionId);
    if (!revision || revision.schemeId !== run.schemeId || revision.snapshot.input.pointId !== run.pointId) {
      return invalid(`Parameter derivation run ${run.runId} references an invalid scheme revision.`);
    }
    if (
      !sameParameterSource(run.input, revision.snapshot.input)
      || stableStringify(run.settingsSnapshot) !== stableStringify(revision.snapshot.inputSettings)
    ) return invalid(`Parameter derivation run ${run.runId} does not match its immutable scheme revision settings or source.`);
    if (run.algorithmId !== PARAMETER_INPUT_DERIVATION_ALGORITHM_ID || run.algorithmVersion !== PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION) {
      return invalid(`Parameter derivation run ${run.runId} uses an unsupported algorithm identity.`);
    }
    if (
      run.formulaSpecHash !== sha256HexSync(PARAMETER_INPUT_DERIVATION_SPEC)
      || run.settingsHash !== sha256HexSync(stableStringify(run.settingsSnapshot))
      || run.inputHash !== sha256HexSync(stableStringify(run.inputRowsSnapshot))
      || run.sourceLineageHash !== sha256HexSync(stableStringify(run.input))
      || !Number.isFinite(run.waterDepthM)
      || run.waterDepthM < 0
      || run.inputRowsSnapshot.some((row) =>
        !row.sourceRowId
        || !Number.isFinite(row.depthM)
        || [row.qcKpa, row.qtKpa, row.fsKpa, row.u2Kpa, row.importedFrPercent]
          .some((value) => value !== null && !Number.isFinite(value)),
      )
    ) return invalid(`Parameter derivation run ${run.runId} contains an invalid input snapshot or hash.`);
    const expectedIdempotencyKey = sha256HexSync(stableStringify({
      commandId: run.commandId,
      schemeRevisionId: run.schemeRevisionId,
      sourceLineageHash: run.sourceLineageHash,
      formulaSpecHash: run.formulaSpecHash,
      settingsHash: run.settingsHash,
      inputHash: run.inputHash,
      waterDepthM: run.waterDepthM,
    }));
    if (run.idempotencyKey !== expectedIdempotencyKey) {
      return invalid(`Parameter derivation run ${run.runId} has an invalid idempotency key.`);
    }
    const allowedRunStatuses: ParameterInputDerivationRunV2['status'][] = [
      'queued', 'running', 'cancel-requested', 'completed', 'failed', 'cancelled', 'invalidated',
    ];
    if (!allowedRunStatuses.includes(run.status)) return invalid(`Parameter derivation run ${run.runId} has an unknown status.`);
    if (run.status === 'completed') {
      if (!run.completedAt || !run.summary || run.derivedRows.length !== run.inputRowsSnapshot.length) {
        return invalid(`Completed parameter derivation run ${run.runId} is incomplete.`);
      }
      const recomputed = deriveParameterInputsV1(run.inputRowsSnapshot, run.waterDepthM, run.settingsSnapshot);
      if (
        !recomputed.ok
        || stableStringify(run.derivedRows) !== stableStringify(recomputed.rows)
        || stableStringify(run.summary) !== stableStringify(recomputed.summary)
        || stableStringify(run.issues) !== stableStringify(recomputed.issues)
      ) return invalid(`Completed parameter derivation run ${run.runId} does not match its immutable inputs.`);
    } else if (run.derivedRows.length || run.summary) {
      return invalid(`Unfinished parameter derivation run ${run.runId} contains partial results.`);
    }
    if (run.status === 'queued' && hasAnyRunEvidence(run)) return invalid(`Queued parameter derivation run ${run.runId} contains premature state evidence.`);
    if (run.status === 'running' && (
      !run.startedAt || run.cancelRequestedAt || run.completedAt || run.failedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage || run.issues.length
    )) return invalid(`Running parameter derivation run ${run.runId} contains inconsistent state evidence.`);
    if (run.status === 'cancel-requested' && (
      !run.cancelRequestedAt || run.completedAt || run.failedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage || run.issues.length
    )) return invalid(`Parameter derivation run ${run.runId} has inconsistent cancellation-request evidence.`);
    if (run.status === 'completed' && (
      !run.startedAt || run.cancelRequestedAt || run.failedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage
    )) return invalid(`Completed parameter derivation run ${run.runId} contains conflicting terminal evidence.`);
    if (run.status === 'failed' && (
      !run.failedAt || !run.errorCode || run.cancelRequestedAt || run.completedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.issues.length
    )) return invalid(`Failed parameter derivation run ${run.runId} is missing or mixing terminal evidence.`);
    if (run.status === 'cancelled' && (
      !run.cancelRequestedAt || !run.cancelledAt || run.completedAt || run.failedAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage || run.issues.length
    )) return invalid(`Cancelled parameter derivation run ${run.runId} is missing or mixing terminal evidence.`);
    if (run.status === 'invalidated' && (
      !run.invalidatedAt || !run.invalidationReason || run.completedAt || run.failedAt || run.cancelledAt || run.errorCode || run.errorMessage || run.issues.length
    )) return invalid(`Invalidated parameter derivation run ${run.runId} is missing or mixing invalidation evidence.`);
  }
  const parameterRunIds = workspace.parameterRuns.map((run) => run.runId);
  const parameterCommandIds = workspace.parameterRuns.map((run) => run.commandId);
  const parameterIdempotencyKeys = workspace.parameterRuns.map((run) => run.idempotencyKey);
  if (
    new Set(parameterRunIds).size !== parameterRunIds.length
    || new Set(parameterCommandIds).size !== parameterCommandIds.length
    || new Set(parameterIdempotencyKeys).size !== parameterIdempotencyKeys.length
  ) return invalid('Parameter method runs contain duplicate identities.');
  for (const run of workspace.parameterRuns) {
    const validation = validateParameterMethodRunStructure(run, workspace);
    if (!validation.ok) return validation;
  }
  if (
    workspace.manualEntryRevisions.length
    || workspace.resultSelections.length
    || workspace.currentResultSelectionRef
  ) return invalid('Manual parameter values and result selections remain disabled until their later confirmation gate.');
  const customFormulaValidation = validateCustomFormulaWorkspaceStructure(workspace, stratificationRevisions);
  if (!customFormulaValidation.ok) return customFormulaValidation;
  return { ok: true as const };
}

export function sameParameterSource(left: ParameterSourceLineageV2, right: ParameterSourceLineageV2) {
  return (left.siteId ?? null) === (right.siteId ?? null)
    && left.checkRunId === right.checkRunId
    && left.stratificationSchemeId === right.stratificationSchemeId
    && left.stratificationRevisionId === right.stratificationRevisionId
    && left.stratificationVersion === right.stratificationVersion
    && artifactDependenciesEqual(left, right);
}

function deriveRow(
  row: ParameterInputRowV2,
  waterDepthM: number,
  settings: ParameterInputSettingsV2,
): ParameterDerivedInputRowV2 {
  if (!Number.isFinite(row.depthM) || row.depthM < 0) {
    return invalidDerivedRow(row, 'invalid-input', 'PAR-DEPTH-INVALID', '贯入深度必须是大于或等于 0 m 的有限数值。');
  }
  const importedQtPresent = row.qtKpa !== null;
  const importedQtValid = isPositiveFinite(row.qtKpa);
  const canDeriveQt = Number.isFinite(row.qcKpa) && Number.isFinite(row.u2Kpa);
  let qtKpa: number | null = null;
  let qtSource: 'imported' | 'derived' | null = null;
  if (importedQtValid) {
    qtKpa = row.qtKpa;
    qtSource = 'imported';
  } else if (
    canDeriveQt
    && (!importedQtPresent || settings.qtSourcePolicy === 'derive-when-imported-invalid')
  ) {
    const candidate = (row.qcKpa as number) + (1 - settings.netAreaRatio) * (row.u2Kpa as number);
    if (isPositiveFinite(candidate)) {
      qtKpa = candidate;
      qtSource = 'derived';
    }
  }
  if (qtKpa === null) {
    const reason = importedQtPresent && !importedQtValid ? 'PAR-QT-IMPORTED-INVALID' : 'PAR-QT-MISSING';
    const message = importedQtPresent && !importedQtValid
      ? '导入 qt 非法；当前策略不允许静默使用派生值。'
      : '缺少有效 qt，且无法由 qc/u2/a_net 推导。';
    return invalidDerivedRow(row, 'invalid-input', reason, message);
  }
  if (!isPositiveFinite(row.fsKpa)) {
    return invalidDerivedRow(row, 'invalid-input', 'PAR-FS-INVALID', 'fs 必须是大于 0 kPa 的有限数值。', qtKpa, qtSource);
  }
  const sigmaV0Kpa = waterDepthM * settings.waterUnitWeightKnM3 + row.depthM * settings.soilTotalUnitWeightKnM3;
  const u0Kpa = (waterDepthM + row.depthM) * settings.waterUnitWeightKnM3;
  const rawEffectiveStress = sigmaV0Kpa - u0Kpa;
  const sigmaV0EffectiveKpa = Math.max(settings.minEffectiveStressKpa, rawEffectiveStress);
  const floorApplied = rawEffectiveStress < settings.minEffectiveStressKpa;
  const qnetKpa = qtKpa - sigmaV0Kpa;
  if (!isPositiveFinite(qnetKpa)) {
    return invalidDerivedRow(
      row,
      'undefined',
      'PAR-QNET-NON-POSITIVE',
      'qnet 必须大于 0 kPa 才能继续归一化。',
      qtKpa,
      qtSource,
      { sigmaV0Kpa, u0Kpa, sigmaV0EffectiveKpa, qnetKpa, floorApplied },
    );
  }
  const frPercent = 100 * (row.fsKpa as number) / qnetKpa;
  if (!isPositiveFinite(frPercent)) {
    return invalidDerivedRow(
      row,
      'undefined',
      'PAR-FR-NON-POSITIVE',
      '按 fs/qnet 重算的 Fr 必须大于 0。',
      qtKpa,
      qtSource,
      { sigmaV0Kpa, u0Kpa, sigmaV0EffectiveKpa, qnetKpa, frPercent, floorApplied },
    );
  }
  let exponentN = 1;
  const iterations = [] as ParameterDerivedInputRowV2['iterations'];
  let qtn: number | null = null;
  let ic: number | null = null;
  for (let index = 0; index < settings.iterationCount; index += 1) {
    qtn = (qnetKpa / settings.atmosphericPressureKpa)
      / Math.pow(sigmaV0EffectiveKpa / settings.atmosphericPressureKpa, exponentN);
    if (!isPositiveFinite(qtn)) {
      return invalidDerivedRow(
        row,
        'undefined',
        'PAR-QTN-INVALID',
        'Qtn 进入了无效数值域。',
        qtKpa,
        qtSource,
        { sigmaV0Kpa, u0Kpa, sigmaV0EffectiveKpa, qnetKpa, frPercent, floorApplied, iterations },
      );
    }
    ic = Math.sqrt(
      Math.pow(3.47 - Math.log10(qtn), 2)
      + Math.pow(1.22 + Math.log10(frPercent), 2),
    );
    const nextExponentN = Math.min(
      1,
      0.381 * ic + 0.05 * (sigmaV0EffectiveKpa / settings.atmosphericPressureKpa) - 0.15,
    );
    if (!Number.isFinite(ic) || !Number.isFinite(nextExponentN)) {
      return invalidDerivedRow(
        row,
        'undefined',
        'PAR-IC-INVALID',
        'Ic 或下一轮指数进入了无效数值域。',
        qtKpa,
        qtSource,
        { sigmaV0Kpa, u0Kpa, sigmaV0EffectiveKpa, qnetKpa, frPercent, floorApplied, iterations },
      );
    }
    iterations.push({ iteration: index + 1, exponentN, qtn, ic, nextExponentN });
    exponentN = nextExponentN;
  }
  const importedFr = finiteOrNull(row.importedFrPercent);
  return {
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    status: 'valid',
    reasonCode: null,
    message: null,
    qtSource,
    qcKpa: finiteOrNull(row.qcKpa),
    qtKpa,
    fsKpa: finiteOrNull(row.fsKpa),
    u2Kpa: finiteOrNull(row.u2Kpa),
    sigmaV0Kpa,
    u0Kpa,
    sigmaV0EffectiveKpa,
    qnetKpa,
    frPercent,
    importedFrPercent: importedFr,
    frDifferencePercent: importedFr === null ? null : importedFr - frPercent,
    qtn,
    ic,
    finalExponentN: exponentN,
    floorApplied,
    iterations,
  };
}

function invalidDerivedRow(
  row: ParameterInputRowV2,
  status: 'invalid-input' | 'undefined',
  reasonCode: string,
  message: string,
  qtKpa: number | null = null,
  qtSource: 'imported' | 'derived' | null = null,
  partial: Partial<ParameterDerivedInputRowV2> = {},
): ParameterDerivedInputRowV2 {
  return {
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    status,
    reasonCode,
    message,
    qtSource,
    qcKpa: finiteOrNull(row.qcKpa),
    qtKpa,
    fsKpa: finiteOrNull(row.fsKpa),
    u2Kpa: finiteOrNull(row.u2Kpa),
    sigmaV0Kpa: null,
    u0Kpa: null,
    sigmaV0EffectiveKpa: null,
    qnetKpa: null,
    frPercent: null,
    importedFrPercent: finiteOrNull(row.importedFrPercent),
    frDifferencePercent: null,
    qtn: null,
    ic: null,
    finalExponentN: null,
    floorApplied: false,
    iterations: [],
    ...partial,
  };
}

function summarizeRows(rows: ParameterDerivedInputRowV2[], issues: ParameterIssueV2[]): ParameterDerivationSummaryV2 {
  return {
    rowCount: rows.length,
    validCount: rows.filter((row) => row.status === 'valid').length,
    invalidInputCount: rows.filter((row) => row.status === 'invalid-input').length,
    undefinedCount: rows.filter((row) => row.status === 'undefined').length,
    importedQtCount: rows.filter((row) => row.qtSource === 'imported').length,
    derivedQtCount: rows.filter((row) => row.qtSource === 'derived').length,
    floorAppliedCount: rows.filter((row) => row.floorApplied).length,
    frDifferenceNoticeCount: issues.filter((issue) => issue.reasonCode === 'PAR-FR-DIFFERENCE').length,
  };
}

function emptySummary(rowCount: number): ParameterDerivationSummaryV2 {
  return {
    rowCount,
    validCount: 0,
    invalidInputCount: 0,
    undefinedCount: 0,
    importedQtCount: 0,
    derivedQtCount: 0,
    floorAppliedCount: 0,
    frDifferenceNoticeCount: 0,
  };
}

function transitionDerivationRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  allowedStatuses: ParameterInputDerivationRunV2['status'][],
  update: (run: ParameterInputDerivationRunV2) => void,
) {
  const run = workspace.derivationRuns.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '前置推导运行不存在。' };
  if (!allowedStatuses.includes(run.status)) return { ok: false as const, problem: `当前运行状态 ${run.status} 不允许执行该操作。` };
  const next = structuredClone(workspace);
  const target = next.derivationRuns.find((candidate) => candidate.runId === runId) as ParameterInputDerivationRunV2;
  update(target);
  return { ok: true as const, workspace: next, run: structuredClone(target) };
}

function hasAnyRunEvidence(run: ParameterInputDerivationRunV2) {
  return Boolean(
    run.startedAt
    || run.cancelRequestedAt
    || run.completedAt
    || run.failedAt
    || run.cancelledAt
    || run.invalidatedAt
    || run.invalidationReason
    || run.errorCode
    || run.errorMessage
    || run.issues.length,
  );
}

function createEditSession(
  scheme: ParameterSchemeV2,
  now: string,
  isNew: boolean,
  dirty: boolean,
): ParameterSchemeEditSessionV2 {
  return {
    sessionId: createIdentifier('parameter-edit'),
    schemeId: scheme.schemeId,
    baseVersion: scheme.version,
    baseline: structuredClone(scheme),
    working: structuredClone(scheme),
    dirty,
    isNew,
    startedAt: now,
  };
}

function hasSchemeName(workspace: ParameterWorkspaceV2, name: string, exceptSchemeId?: string) {
  const normalized = normalizeName(name);
  return workspace.schemes.some((scheme) =>
    scheme.status !== 'deleted'
    && scheme.schemeId !== exceptSchemeId
    && normalizeName(scheme.name) === normalized,
  );
}

function uniqueSchemeName(workspace: ParameterWorkspaceV2, preferred: string) {
  if (!hasSchemeName(workspace, preferred)) return preferred;
  let index = 2;
  while (hasSchemeName(workspace, `${preferred} ${index}`)) index += 1;
  return `${preferred} ${index}`;
}

function cloneLineage(input: ParameterSourceLineageV2): ParameterSourceLineageV2 {
  return { ...structuredClone(input), revisions: { ...input.revisions } };
}

function parameterSchemesEqual(left: ParameterSchemeV2, right: ParameterSchemeV2) {
  return stableStringify(left) === stableStringify(right);
}

function parameterSchemeRevisionContent(scheme: ParameterSchemeV2) {
  const { status: _status, updatedAt: _updatedAt, deletedAt: _deletedAt, ...content } = scheme;
  return content;
}

function validateAuthorizedParameterSlot(slot: ParameterSlotV2) {
  if (slot.selectedMethodId === null || slot.selectedMethodVersion === null) {
    if (slot.selectedMethodId !== null || slot.selectedMethodVersion !== null) {
      return `Parameter slot ${slot.slotId} has a partial method identity.`;
    }
    if (Object.keys(slot.settings).length) return `Parameter slot ${slot.slotId} has settings without a selected method.`;
    return null;
  }
  if (
    slot.parameterKey === 'PhiDeg'
    && slot.selectedMethodId === PARAMETER_PHI_PEAK_METHOD_ID
    && slot.selectedMethodVersion === PARAMETER_PHI_PEAK_METHOD_VERSION
    && 'kind' in slot.settings
    && slot.settings.kind === 'phi_peak_qtn_v1'
  ) return null;
  if (
    slot.parameterKey === 'SuKpa'
    && slot.selectedMethodId === PARAMETER_SUC_METHOD_ID
    && slot.selectedMethodVersion === PARAMETER_SUC_METHOD_VERSION
    && 'kind' in slot.settings
    && slot.settings.kind === 'suc_qnet_nkt_v1'
    && slot.settings.requestedStrengthMode === 'triaxial_compression'
    && Array.isArray(slot.settings.nktByLayer)
    && slot.settings.nktByLayer.length === slot.targetScope.layerIds.length
    && new Set(slot.settings.nktByLayer.map((entry) => entry.layerId)).size === slot.settings.nktByLayer.length
    && slot.settings.nktByLayer.every((entry) =>
      slot.targetScope.layerIds.includes(entry.layerId)
      && entry.layerRevisionRef
      && (entry.setting.value === undefined || Number.isFinite(entry.setting.value))
      && (entry.setting.matchedPairs ?? []).every((pair) =>
        Number.isFinite(pair.depthM) && Number.isFinite(pair.qnetKpa) && Number.isFinite(pair.sucKpa)))
  ) return null;
  return `Parameter slot ${slot.slotId} uses an unsupported method identity or settings contract.`;
}

function validateRange(
  value: number,
  limits: { min: number; max: number },
  label: string,
  problems: string[],
) {
  if (!Number.isFinite(value) || value < limits.min || value > limits.max) {
    problems.push(`${label} 必须位于 ${limits.min} 至 ${limits.max} 之间。`);
  }
}

function globalProblem(reasonCode: string, message: string): ParameterIssueV2 {
  return { issueId: reasonCode.toLocaleLowerCase(), severity: 'problem', reasonCode, message };
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function finiteOrNull(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeName(value: string) {
  return normalizeDisplayName(value).toLocaleLowerCase();
}

function safeId(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'row';
}

function invalid(detail: string) {
  return { ok: false as const, detail };
}

function createIdentifier(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export type ParameterSourceResult = ReturnType<typeof getCurrentParameterSource>;
export type ParameterStratificationRevision = StratificationSchemeRevisionV2;
