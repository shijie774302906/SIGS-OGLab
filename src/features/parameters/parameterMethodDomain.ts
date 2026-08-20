import type { StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import type {
  DrainageApplicabilityEvidenceV1,
  MaterialApplicabilityEvidenceV1,
  NktCalibrationAuthorityV1,
  NktCalibrationContextV1,
  NktSettingV1,
  ParameterConflictContextV1,
  ParameterIssueV2,
  ParameterJointApplicabilityEvaluationV1,
  ParameterLayerEvidenceSnapshotV1,
  ParameterLayerSummaryV1,
  ParameterMethodEvidenceRevisionV1,
  ParameterMethodEvaluationV1,
  ParameterMethodInputRowV1,
  ParameterMethodReasonCodeV1,
  ParameterMethodRunSummaryV1,
  ParameterMethodSettingsV1,
  ParameterRunV2,
  ParameterReferenceTestRevisionV1,
  ParameterSlotV2,
  ParameterTargetScopeV2,
  ParameterValueV2,
  ParameterWorkspaceV2,
  PenetrationRateEvidenceV1,
} from './parameterTypes';
import {
  PARAMETER_PHI_PEAK_METHOD_ID,
  PARAMETER_PHI_PEAK_METHOD_VERSION,
  PARAMETER_SUC_METHOD_ID,
  PARAMETER_SUC_METHOD_VERSION,
} from './parameterTypes';

export const PARAMETER_PHI_PEAK_FORMULA_REFERENCE = 'Mayne-Cargill-Greig-2023-Rev1.1-p82-Eq5.6';
export const PARAMETER_SUC_FORMULA_REFERENCE = 'Mayne-Cargill-Greig-2023-Rev1.1-p113-Eq6.7';

export const PARAMETER_PHI_PEAK_FORMULA_SPEC = [
  `method:${PARAMETER_PHI_PEAK_METHOD_ID}@${PARAMETER_PHI_PEAK_METHOD_VERSION}`,
  'result:phi-prime-peak-degrees',
  'formula:17.6+11*log10(Qtn)',
  'domain:finite Qtn;20<Qtn<400;finite IcRW<2.60;layer=sand',
  'rate:standard_confirmed exactly 20 mm/s',
  'drainage:independently confirmed drained or current conflict resolved as drained',
  'material:source scope controls eligibility;no clipping',
].join('\n');

export const PARAMETER_SUC_FORMULA_SPEC = [
  `method:${PARAMETER_SUC_METHOD_ID}@${PARAMETER_SUC_METHOD_VERSION}`,
  'result:suc-triaxial-compression-reference-kPa',
  'formula:qnetKpa/Nkt',
  'domain:finite qnetKpa>0;finite Nkt>0;layer=clay',
  'rate:standard_confirmed exactly 20 mm/s',
  'drainage:independently confirmed undrained or current conflict resolved as undrained',
  'nkt:explicit literature assumption,user assumption,or exact-scope site calibration',
  'IcRW:screen and conflict evidence only;not a hard numeric gate',
].join('\n');

const LITERATURE_NKT_12_MATERIAL = 'soft_firm_nc_loc_intact_clay';
const LITERATURE_NKT_12_SOURCES = {
  offshore: [
    'mayne-cargill-greig-2023-rev1.1-p113',
    'mayne-peuchen-2018-table1-figure4-offshore-12.3',
  ],
  onshore: ['mayne-peuchen-2018-table1-figure4-onshore-12.0'],
} as const;

export type PhiPeakEvaluationInputV1 = {
  qtn?: number;
  icRw?: number;
  layerGroup: string;
  rate: PenetrationRateEvidenceV1;
  drainage: DrainageApplicabilityEvidenceV1;
  material: MaterialApplicabilityEvidenceV1;
  conflictContext?: ParameterConflictContextV1 | null;
};

export type SucEvaluationInputV1 = {
  qnetKpa?: number;
  icRw?: number;
  layerGroup: string;
  environment?: 'onshore' | 'offshore';
  requestedStrengthMode?: string;
  rate: PenetrationRateEvidenceV1;
  drainage: DrainageApplicabilityEvidenceV1;
  material: MaterialApplicabilityEvidenceV1;
  nkt: NktSettingV1;
  conflictContext?: ParameterConflictContextV1 | null;
  calibrationContext?: NktCalibrationContextV1 | null;
  calibrationAuthority?: NktCalibrationAuthorityV1 | null;
};

export type JointApplicabilityInputV1 = {
  icRw?: number;
  layerGroup: string;
  drainage: DrainageApplicabilityEvidenceV1;
  conflictContext?: ParameterConflictContextV1 | null;
};

export type ParameterLayerEvidenceInputV1 = {
  layerId: string;
  layerRevisionRef: string;
  layerGroup: string;
  environment: 'onshore' | 'offshore';
  evidenceRevisionRefs: {
    rate: string;
    drainage: string;
    material: string;
    conflictContext?: string | null;
  };
};

export type PrepareParameterMethodRunInputV1 = {
  projectId: string;
  workspace: ParameterWorkspaceV2;
  schemeRevisionId: string;
  derivationRunId: string;
  slotId: string;
  stratificationRevision: StratificationSchemeRevisionV2;
  layerEvidence: ParameterLayerEvidenceInputV1[];
  commandId: string;
  now?: string;
  runId?: string;
};

export function registerParameterMethodEvidenceRevision(
  workspace: ParameterWorkspaceV2,
  input: {
    evidenceId: string;
    revisionId: string;
    kind: ParameterMethodEvidenceRevisionV1['kind'];
    payload: PenetrationRateEvidenceV1 | DrainageApplicabilityEvidenceV1 | MaterialApplicabilityEvidenceV1 | ParameterConflictContextV1;
    now?: string;
  },
) {
  if (!input.evidenceId.trim() || !input.revisionId.trim()) return { ok: false as const, problem: '证据及修订标识不能为空。' };
  const next = ensureG1BWorkspace(workspace);
  if (next.methodEvidenceRevisions!.some((revision) => revision.revisionId === input.revisionId)) {
    return { ok: false as const, problem: '证据修订标识已存在。' };
  }
  if (!evidencePayloadMatchesKind(input.kind, input.payload)) return { ok: false as const, problem: '证据载荷与证据类型不一致或不完整。' };
  const existing = next.methodEvidenceRevisions!.filter((revision) => revision.evidenceId === input.evidenceId);
  if (existing.some((revision) => revision.kind !== input.kind)) return { ok: false as const, problem: '同一证据对象不能更换证据类型。' };
  const revision = {
    evidenceId: input.evidenceId,
    revisionId: input.revisionId,
    version: existing.reduce((maximum, candidate) => Math.max(maximum, candidate.version), 0) + 1,
    kind: input.kind,
    payload: structuredClone(input.payload),
    contentHash: sha256HexSync(stableStringify({ kind: input.kind, payload: input.payload })),
    createdAt: input.now ?? new Date().toISOString(),
  } as ParameterMethodEvidenceRevisionV1;
  next.methodEvidenceRevisions!.push(revision);
  next.currentMethodEvidenceRefs![input.evidenceId] = revision.revisionId;
  invalidateOpenMethodRuns(next, `参数证据 ${input.evidenceId} 已产生新修订。`, revision.createdAt);
  return { ok: true as const, workspace: next, revision: structuredClone(revision) };
}

export function registerParameterReferenceTestRevision(
  workspace: ParameterWorkspaceV2,
  input: Omit<ParameterReferenceTestRevisionV1, 'version' | 'contentHash'>,
) {
  if (!input.testId.trim() || !input.revisionId.trim()) return { ok: false as const, problem: '参考试验及修订标识不能为空。' };
  if (!validateReferenceTestContent(input)) return { ok: false as const, problem: '参考试验修订不完整或数值无效。' };
  const next = ensureG1BWorkspace(workspace);
  if (next.referenceTestRevisions!.some((revision) => revision.revisionId === input.revisionId)) {
    return { ok: false as const, problem: '参考试验修订标识已存在。' };
  }
  const existing = next.referenceTestRevisions!.filter((revision) => revision.testId === input.testId);
  const content = { ...structuredClone(input), version: existing.reduce((maximum, candidate) => Math.max(maximum, candidate.version), 0) + 1 };
  const revision: ParameterReferenceTestRevisionV1 = {
    ...content,
    contentHash: sha256HexSync(stableStringify(content)),
  };
  next.referenceTestRevisions!.push(revision);
  next.currentReferenceTestRefs![input.testId] = revision.revisionId;
  invalidateOpenMethodRuns(next, `参考试验 ${input.testId} 已产生新修订。`, input.createdAt);
  return { ok: true as const, workspace: next, revision: structuredClone(revision) };
}

export function validateParameterAuthorityCatalog(workspace: ParameterWorkspaceV2) {
  const evidenceRevisions = workspace.methodEvidenceRevisions ?? [];
  const evidenceRefs = workspace.currentMethodEvidenceRefs ?? {};
  const testRevisions = workspace.referenceTestRevisions ?? [];
  const testRefs = workspace.currentReferenceTestRefs ?? {};
  if (workspace.parameterRuns.length && workspace.parameterWorkspaceSchemaVersion !== 'parameter-workspace-g1b.v1') {
    return invalid('Parameter method runs require the G1B parameter workspace schema.');
  }
  if (new Set(evidenceRevisions.map((revision) => revision.revisionId)).size !== evidenceRevisions.length) {
    return invalid('Parameter evidence revisions contain duplicate revision IDs.');
  }
  if (new Set(evidenceRevisions.map((revision) => `${revision.evidenceId}:v${revision.version}`)).size !== evidenceRevisions.length) {
    return invalid('Parameter evidence revisions contain duplicate object versions.');
  }
  for (const revision of evidenceRevisions) {
    if (
      !revision.evidenceId || !revision.revisionId || !Number.isInteger(revision.version) || revision.version < 1
      || !evidencePayloadMatchesKind(revision.kind, revision.payload)
      || revision.contentHash !== sha256HexSync(stableStringify({ kind: revision.kind, payload: revision.payload }))
    ) return invalid(`Parameter evidence revision ${revision.revisionId} is invalid or forged.`);
  }
  for (const [evidenceId, revisionId] of Object.entries(evidenceRefs)) {
    const revision = evidenceRevisions.find((candidate) => candidate.revisionId === revisionId && candidate.evidenceId === evidenceId);
    const latestVersion = Math.max(0, ...evidenceRevisions.filter((candidate) => candidate.evidenceId === evidenceId).map((candidate) => candidate.version));
    if (!revision || revision.version !== latestVersion) return invalid(`Current parameter evidence ${evidenceId} does not point to its latest immutable revision.`);
  }
  if (evidenceRevisions.some((revision) => !evidenceRefs[revision.evidenceId])) return invalid('A parameter evidence object is missing its current revision pointer.');
  if (new Set(testRevisions.map((revision) => revision.revisionId)).size !== testRevisions.length) {
    return invalid('Reference test revisions contain duplicate revision IDs.');
  }
  if (new Set(testRevisions.map((revision) => `${revision.testId}:v${revision.version}`)).size !== testRevisions.length) {
    return invalid('Reference test revisions contain duplicate object versions.');
  }
  for (const revision of testRevisions) {
    const { contentHash, ...content } = revision;
    if (!validateReferenceTestContent(content) || contentHash !== sha256HexSync(stableStringify(content))) {
      return invalid(`Reference test revision ${revision.revisionId} is invalid or forged.`);
    }
  }
  for (const [testId, revisionId] of Object.entries(testRefs)) {
    const revision = testRevisions.find((candidate) => candidate.revisionId === revisionId && candidate.testId === testId);
    const latestVersion = Math.max(0, ...testRevisions.filter((candidate) => candidate.testId === testId).map((candidate) => candidate.version));
    if (!revision || revision.version !== latestVersion) return invalid(`Current reference test ${testId} does not point to its latest immutable revision.`);
  }
  if (testRevisions.some((revision) => !testRefs[revision.testId])) return invalid('A reference test is missing its current revision pointer.');
  return { ok: true as const };
}

export function evaluatePhiPeakV1(input: PhiPeakEvaluationInputV1): ParameterMethodEvaluationV1 {
  if (!hasOwn(input, 'qtn') || input.qtn === undefined || input.qtn === null) return result('InvalidInput', 'PhiMissingQtn');
  if (!Number.isFinite(input.qtn)) return result('InvalidInput', 'PhiNonFiniteQtn');
  if (input.qtn <= 0) return result('InvalidInput', 'PhiNonPositiveQtn');
  if (!hasOwn(input, 'icRw') || input.icRw === undefined || input.icRw === null) return result('InvalidInput', 'PhiMissingIc');
  if (!Number.isFinite(input.icRw)) return result('InvalidInput', 'PhiNonFiniteIc');
  if (input.qtn <= 20 || input.qtn >= 400) return result('NotApplicable', 'PhiOutsideSourceQtnRange');
  if (input.icRw >= 2.6) return result('ApplicabilityUnconfirmed', 'PhiTransitionIc');
  if (normalizeLayerGroup(input.layerGroup) !== 'sand') return result('ApplicabilityUnconfirmed', 'PhiLayerGroupMismatch');

  const rateProblem = evaluateRate(input.rate, 'Phi');
  if (rateProblem) return rateProblem;
  const drainageProblem = evaluateDrainage(input.drainage, 'drained', 'Phi', input.conflictContext);
  if (drainageProblem) return drainageProblem;

  if (input.material.status === 'outside_scope') return result('NotApplicable', 'PhiMaterialOutsideSource');
  const value = 17.6 + 11 * Math.log10(input.qtn);
  if (input.material.status === 'scope_unknown') {
    return result('ApplicabilityUnconfirmed', 'PhiMaterialScopeUnknown', value, false);
  }
  if (input.material.status === 'known_extrapolation') {
    return result('ApplicabilityUnconfirmed', 'PhiKnownExtrapolation', value, false);
  }
  if (input.material.status === 'engineer_confirmed_extrapolation') {
    if (!input.material.confirmationRevisionId) return result('ApplicabilityUnconfirmed', 'PhiKnownExtrapolation', value, false);
    return result('ValidWithNotice', 'PhiMaterialSourceDeviation', value, true);
  }
  return result('Valid', 'PhiValid', value, true);
}

export function evaluateSucV1(input: SucEvaluationInputV1): ParameterMethodEvaluationV1 {
  if (!hasOwn(input, 'qnetKpa') || input.qnetKpa === undefined || input.qnetKpa === null) {
    return result('InvalidInput', 'SucMissingQnet');
  }
  if (!Number.isFinite(input.qnetKpa)) return result('InvalidInput', 'SucNonFiniteQnet');
  if (input.qnetKpa <= 0) return result('InvalidInput', 'SucNonPositiveQnet');
  if (!hasOwn(input.nkt, 'value') || input.nkt.value === undefined || !Number.isFinite(input.nkt.value) || input.nkt.value <= 0) {
    return result('InvalidMethodParameter', 'SucInvalidNkt');
  }
  if (!input.nkt.origin) return result('InvalidMethodParameter', 'SucNktBasisMissing');
  if (!input.nkt.confirmedAt) return result('InvalidMethodParameter', 'SucNktConfirmationMissing');
  if ((input.requestedStrengthMode ?? input.nkt.targetStrengthMode) !== 'triaxial_compression' || input.nkt.targetStrengthMode !== 'triaxial_compression') {
    return result('InvalidMethodParameter', 'SucUnsupportedStrengthMode');
  }
  if (normalizeLayerGroup(input.layerGroup) !== 'clay') return result('ApplicabilityUnconfirmed', 'SucLayerGroupMismatch');

  const rateProblem = evaluateRate(input.rate, 'Suc');
  if (rateProblem) return rateProblem;
  const drainageProblem = evaluateDrainage(input.drainage, 'undrained', 'Suc', input.conflictContext);
  if (drainageProblem) return drainageProblem;
  if (input.material.status === 'outside_scope') return result('NotApplicable', 'SucMaterialOutsideSource');

  const nktProblem = validateNktBasis(input);
  if (nktProblem.blocking) return result('InvalidMethodParameter', nktProblem.blocking);

  const reasons: ParameterMethodReasonCodeV1[] = [];
  if (!hasOwn(input, 'icRw') || input.icRw === undefined || input.icRw === null || !Number.isFinite(input.icRw)) {
    reasons.push('SucIcScreenUnavailable');
  } else if (input.icRw <= 2.6) {
    reasons.push('SucIcScreenConflict');
  }
  if (nktProblem.notice) reasons.push(nktProblem.notice);
  if (!reasons.length) reasons.push('SucValid');
  const value = input.qnetKpa / input.nkt.value;
  if (!Number.isFinite(value)) return result('InvalidMethodParameter', 'SucInvalidNkt');
  return {
    status: reasons.length === 1 && reasons[0] === 'SucValid' ? 'Valid' : 'ValidWithNotice',
    reasonCodes: reasons,
    value,
    eligibleForCurrentResult: true,
  };
}

export function evaluateJointApplicabilityV1(input: JointApplicabilityInputV1): ParameterJointApplicabilityEvaluationV1 {
  const group = normalizeLayerGroup(input.layerGroup);
  const direction = effectiveDrainageDirection(input.drainage, input.conflictContext);
  const resolved = input.drainage.status === 'resolved_conflict'
    && direction !== null
    && validConflictSupersession(input.drainage, input.conflictContext);
  const explicitConflict = input.drainage.status === 'conflict'
    || input.drainage.supersededByConflictRevisionId !== undefined
    || (input.drainage.status === 'resolved_conflict' && !resolved);
  const icConflict = Number.isFinite(input.icRw)
    && ((group === 'sand' && (input.icRw as number) >= 2.6) || (group === 'clay' && (input.icRw as number) <= 2.6));
  const drainageConflict = (group === 'sand' && direction === 'undrained')
    || (group === 'clay' && direction === 'drained');
  const resolutionMatchesGroup = resolved
    && ((group === 'sand' && direction === 'drained') || (group === 'clay' && direction === 'undrained'));

  if (explicitConflict || ((icConflict || drainageConflict) && !resolutionMatchesGroup)) {
    return jointResult('ApplicabilityUnconfirmed', ['SoilClassBehaviorScreenConflict'], false, false);
  }
  if (group === 'clay' && resolutionMatchesGroup && Number.isFinite(input.icRw) && (input.icRw as number) <= 2.6) {
    return jointResult('ResolvedWithNotice', ['SucIcScreenConflict'], false, true);
  }
  const phiEligible = group === 'sand' && Number.isFinite(input.icRw) && (input.icRw as number) < 2.6 && direction === 'drained';
  const sucEligible = group === 'clay' && direction === 'undrained';
  return jointResult('NoProblem', [], phiEligible, sucEligible);
}

export function configureParameterMethodSlot(
  workspace: ParameterWorkspaceV2,
  input: {
    slotId: string;
    parameterKey: 'PhiDeg' | 'SuKpa';
    targetScope: ParameterTargetScopeV2;
    settings: ParameterMethodSettingsV1;
    requiredForHandoff?: boolean;
    now?: string;
  },
) {
  if (!workspace.editSession) return { ok: false as const, problem: '当前没有可编辑的参数方案。' };
  const scopeProblem = validateTargetScope(input.targetScope);
  if (scopeProblem) return { ok: false as const, problem: scopeProblem };
  const identity = methodIdentityForKey(input.parameterKey);
  if (!settingsMatchMethod(input.settings, identity.methodId)) return { ok: false as const, problem: '方法设置与参数类型不一致。' };
  if (!input.slotId.trim()) return { ok: false as const, problem: '参数槽标识不能为空。' };
  if (input.settings.kind === 'suc_qnet_nkt_v1') {
    const layerIds = new Set(input.targetScope.layerIds);
    const settingLayerIds = input.settings.nktByLayer.map((entry) => entry.layerId);
    if (new Set(settingLayerIds).size !== settingLayerIds.length || settingLayerIds.some((layerId) => !layerIds.has(layerId))) {
      return { ok: false as const, problem: 'Nkt 设置必须按目标层唯一配置。' };
    }
    if (input.settings.nktByLayer.length !== input.targetScope.layerIds.length) {
      return { ok: false as const, problem: '每个目标层都必须明确配置 Nkt 来源。' };
    }
    if (input.settings.nktByLayer.some((entry) =>
      (entry.setting.value !== undefined && !Number.isFinite(entry.setting.value))
      || (entry.setting.matchedPairs ?? []).some((pair) =>
        !Number.isFinite(pair.depthM) || !Number.isFinite(pair.qnetKpa) || !Number.isFinite(pair.sucKpa)))) {
      return { ok: false as const, problem: 'Nkt 设置和校准数据必须使用有限数值。' };
    }
  }
  const next = structuredClone(workspace);
  const session = next.editSession!;
  const slot: ParameterSlotV2 = {
    slotId: input.slotId,
    parameterKey: input.parameterKey,
    symbol: input.parameterKey === 'PhiDeg' ? 'φ′p' : 'suc',
    unit: input.parameterKey === 'PhiDeg' ? '°' : 'kPa',
    requiredForHandoff: input.requiredForHandoff ?? false,
    targetScope: structuredClone(input.targetScope),
    selectedMethodId: identity.methodId,
    selectedMethodVersion: identity.methodVersion,
    settings: structuredClone(input.settings),
  };
  const existingIndex = session.working.slots.findIndex((candidate) => candidate.slotId === input.slotId);
  if (existingIndex >= 0) session.working.slots[existingIndex] = slot;
  else session.working.slots.push(slot);
  session.working.updatedAt = input.now ?? new Date().toISOString();
  session.dirty = stableStringify(session.baseline) !== stableStringify(session.working);
  return { ok: true as const, workspace: next, slot: structuredClone(slot) };
}

export function removeParameterMethodSlot(workspace: ParameterWorkspaceV2, slotId: string, now = new Date().toISOString()) {
  if (!workspace.editSession) return { ok: false as const, problem: '当前没有可编辑的参数方案。' };
  if (!workspace.editSession.working.slots.some((slot) => slot.slotId === slotId)) {
    return { ok: false as const, problem: '参数槽不存在。' };
  }
  const next = structuredClone(workspace);
  next.editSession!.working.slots = next.editSession!.working.slots.filter((slot) => slot.slotId !== slotId);
  next.editSession!.working.updatedAt = now;
  next.editSession!.dirty = stableStringify(next.editSession!.baseline) !== stableStringify(next.editSession!.working);
  return { ok: true as const, workspace: next };
}

export function prepareParameterMethodRun(input: PrepareParameterMethodRunInputV1) {
  const now = input.now ?? new Date().toISOString();
  const runId = input.runId ?? createIdentifier('parameter-method-run');
  const workspace = ensureG1BWorkspace(input.workspace);
  const authorityValidation = validateParameterAuthorityCatalog(workspace);
  if (!authorityValidation.ok) return { ok: false as const, problem: authorityValidation.detail };
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === input.schemeRevisionId);
  if (!revision) return { ok: false as const, problem: '参数方案修订不存在。' };
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === revision.schemeId);
  if (
    !scheme || scheme.status !== 'current' || workspace.currentSchemeId !== scheme.schemeId
    || revision.version !== scheme.version
  ) {
    return { ok: false as const, problem: '只有当前参数方案的精确修订可以创建新运行。' };
  }
  const slot = revision.snapshot.slots.find((candidate) => candidate.slotId === input.slotId);
  if (!slot?.selectedMethodId || !slot.selectedMethodVersion || !isMethodSettings(slot.settings)) {
    return { ok: false as const, problem: '参数槽尚未配置受支持的方法。' };
  }
  const derivation = workspace.derivationRuns.find((candidate) => candidate.runId === input.derivationRunId);
  if (!derivation || derivation.status !== 'completed' || derivation.schemeRevisionId !== revision.revisionId) {
    return { ok: false as const, problem: '方法运行需要同一参数修订的已完成前置推导。' };
  }
  if (
    input.stratificationRevision.revisionId !== revision.snapshot.input.stratificationRevisionId
    || input.stratificationRevision.schemeId !== revision.snapshot.input.stratificationSchemeId
    || input.stratificationRevision.version !== revision.snapshot.input.stratificationVersion
  ) return { ok: false as const, problem: '分层修订与参数方案的精确来源不一致。' };
  if (!input.commandId.trim()) return { ok: false as const, problem: '运行命令标识不能为空。' };

  const snapshotResult = buildMethodSnapshots(
    input.projectId,
    revision.snapshot.input.siteId ?? null,
    workspace,
    slot,
    slot.settings,
    derivation.derivedRows,
    input.stratificationRevision,
    input.layerEvidence,
    derivation.runId,
  );
  if (!snapshotResult.ok) return snapshotResult;

  const formula = formulaIdentity(slot.selectedMethodId);
  if (!formula || formula.methodVersion !== slot.selectedMethodVersion) return { ok: false as const, problem: '参数方法身份不受支持。' };
  const sourceLineageHash = derivation.sourceLineageHash;
  const settingsHash = sha256HexSync(stableStringify(slot.settings));
  const evidenceHash = sha256HexSync(stableStringify(snapshotResult.evidenceSnapshot));
  const inputHash = sha256HexSync(stableStringify(snapshotResult.inputRowsSnapshot));
  const formulaSpecHash = sha256HexSync(formula.formulaSpec);
  const idempotencyKey = sha256HexSync(stableStringify({
    commandId: input.commandId,
    schemeRevisionId: revision.revisionId,
    derivationRunId: derivation.runId,
    slotId: slot.slotId,
    sourceLineageHash,
    formulaSpecHash,
    settingsHash,
    evidenceHash,
    inputHash,
  }));
  const sameCommand = workspace.parameterRuns.find((run) => run.commandId === input.commandId);
  if (sameCommand && sameCommand.idempotencyKey !== idempotencyKey) {
    return { ok: false as const, problem: '同一方法运行命令不能绑定不同输入、证据或设置。' };
  }
  const existing = workspace.parameterRuns.find((run) => run.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true as const, workspace: structuredClone(workspace), run: structuredClone(existing), reused: true as const };
  if (workspace.parameterRuns.some((run) => run.runId === runId)) return { ok: false as const, problem: '参数方法运行标识已存在。' };

  const run: ParameterRunV2 = {
    runId,
    commandId: input.commandId,
    idempotencyKey,
    schemeId: revision.schemeId,
    slotId: slot.slotId,
    schemeRevisionId: revision.revisionId,
    derivationRunId: derivation.runId,
    pointId: revision.snapshot.input.pointId,
    sourceLineageHash,
    methodId: slot.selectedMethodId,
    methodVersion: slot.selectedMethodVersion,
    formulaReference: formula.formulaReference,
    formulaSpecHash,
    targetScopeSnapshot: structuredClone(slot.targetScope),
    settingsSnapshot: structuredClone(slot.settings),
    settingsHash,
    evidenceSnapshot: snapshotResult.evidenceSnapshot,
    evidenceHash,
    inputRowsSnapshot: snapshotResult.inputRowsSnapshot,
    inputHash,
    resultHash: null,
    status: 'queued',
    values: [],
    layerSummaries: [],
    summary: null,
    issues: [],
    createdAt: now,
  };
  const next = structuredClone(workspace);
  next.parameterRuns.push(run);
  return { ok: true as const, workspace: next, run: structuredClone(run), reused: false as const };
}

export function startParameterMethodRun(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionMethodRun(workspace, runId, ['queued'], (run) => {
    run.status = 'running';
    run.startedAt = now;
  });
}

export function completeParameterMethodRun(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  const run = workspace.parameterRuns.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '参数方法运行不存在。' };
  if (run.status !== 'running') return { ok: false as const, problem: '只有计算中的参数方法运行可以完成。' };
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === run.schemeRevisionId);
  const scheme = workspace.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
  if (!revision || !scheme || scheme.status !== 'current' || revision.schemeId !== scheme.schemeId || revision.version !== scheme.version) {
    return { ok: false as const, problem: '参数方案或上游来源已失效，当前方法运行不能完成。' };
  }
  const preflight = validateParameterMethodRunStructure(run, workspace);
  if (!preflight.ok) return { ok: false as const, problem: preflight.detail };
  const calculated = calculateMethodRun(run);
  if (!calculated.ok) return calculated;
  const next = structuredClone(workspace);
  const target = next.parameterRuns.find((candidate) => candidate.runId === runId)!;
  target.status = 'completed';
  target.values = calculated.values;
  target.layerSummaries = calculated.layerSummaries;
  target.summary = calculated.summary;
  target.issues = calculated.issues;
  target.resultHash = methodResultHash(target);
  target.completedAt = now;
  return { ok: true as const, workspace: next, run: structuredClone(target) };
}

export function requestParameterMethodRunCancellation(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionMethodRun(workspace, runId, ['queued', 'running'], (run) => {
    run.status = 'cancel-requested';
    run.cancelRequestedAt = now;
  });
}

export function finalizeParameterMethodRunCancellation(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionMethodRun(workspace, runId, ['cancel-requested'], (run) => {
    run.status = 'cancelled';
    clearMethodRunResults(run);
    run.cancelledAt = now;
  });
}

export function failParameterMethodRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  errorCode: string,
  errorMessage: string,
  now = new Date().toISOString(),
) {
  return transitionMethodRun(workspace, runId, ['queued', 'running'], (run) => {
    run.status = 'failed';
    clearMethodRunResults(run);
    run.errorCode = errorCode;
    run.errorMessage = errorMessage;
    run.failedAt = now;
  });
}

export function validateParameterMethodRunStructure(
  run: ParameterRunV2,
  workspace: ParameterWorkspaceV2,
  stratificationRevision?: StratificationSchemeRevisionV2,
) {
  const authorityValidation = validateParameterAuthorityCatalog(workspace);
  if (!authorityValidation.ok) return authorityValidation;
  const revision = workspace.revisions.find((candidate) => candidate.revisionId === run.schemeRevisionId);
  const derivation = workspace.derivationRuns.find((candidate) => candidate.runId === run.derivationRunId);
  const slot = revision?.snapshot.slots.find((candidate) => candidate.slotId === run.slotId);
  const formula = formulaIdentity(run.methodId);
  if (!revision || !derivation || !slot || !formula) return invalid(`Parameter method run ${run.runId} has an invalid revision, derivation, slot, or method reference.`);
  if (
    run.schemeId !== revision.schemeId
    || run.pointId !== revision.snapshot.input.pointId
    || derivation.schemeRevisionId !== revision.revisionId
    || derivation.status !== 'completed'
    || run.sourceLineageHash !== derivation.sourceLineageHash
    || run.methodId !== slot.selectedMethodId
    || run.methodVersion !== slot.selectedMethodVersion
    || run.methodVersion !== formula.methodVersion
    || run.formulaReference !== formula.formulaReference
    || run.formulaSpecHash !== sha256HexSync(formula.formulaSpec)
    || stableStringify(run.targetScopeSnapshot) !== stableStringify(slot.targetScope)
    || stableStringify(run.settingsSnapshot) !== stableStringify(slot.settings)
  ) return invalid(`Parameter method run ${run.runId} does not match its immutable scheme and derivation sources.`);
  if (
    run.settingsHash !== sha256HexSync(stableStringify(run.settingsSnapshot))
    || run.evidenceHash !== sha256HexSync(stableStringify(run.evidenceSnapshot))
    || run.inputHash !== sha256HexSync(stableStringify(run.inputRowsSnapshot))
  ) return invalid(`Parameter method run ${run.runId} contains a forged settings, evidence, or input hash.`);
  const expectedIdempotencyKey = sha256HexSync(stableStringify({
    commandId: run.commandId,
    schemeRevisionId: run.schemeRevisionId,
    derivationRunId: run.derivationRunId,
    slotId: run.slotId,
    sourceLineageHash: run.sourceLineageHash,
    formulaSpecHash: run.formulaSpecHash,
    settingsHash: run.settingsHash,
    evidenceHash: run.evidenceHash,
    inputHash: run.inputHash,
  }));
  if (!run.commandId || run.idempotencyKey !== expectedIdempotencyKey) return invalid(`Parameter method run ${run.runId} has an invalid idempotency identity.`);
  if (!isMethodSettings(run.settingsSnapshot) || !settingsMatchMethod(run.settingsSnapshot, run.methodId)) {
    return invalid(`Parameter method run ${run.runId} has invalid method settings.`);
  }
  const evidenceIds = run.evidenceSnapshot.map((evidence) => evidence.layerId);
  if (new Set(evidenceIds).size !== evidenceIds.length || evidenceIds.length !== run.targetScopeSnapshot.layerIds.length) {
    return invalid(`Parameter method run ${run.runId} has incomplete or duplicate layer evidence.`);
  }
  if (run.evidenceSnapshot.some((evidence) =>
    !run.targetScopeSnapshot.layerIds.includes(evidence.layerId)
    || !validateEvidenceSnapshot(evidence)
  )) return invalid(`Parameter method run ${run.runId} has invalid evidence objects.`);
  for (const evidence of run.evidenceSnapshot) {
    const expected = [
      ['penetration_rate', evidence.evidenceRevisionRefs.rate, evidence.rate],
      ['drainage_applicability', evidence.evidenceRevisionRefs.drainage, evidence.drainage],
      ['material_applicability', evidence.evidenceRevisionRefs.material, evidence.material],
      ['conflict_context', evidence.evidenceRevisionRefs.conflictContext, evidence.conflictContext],
    ] as const;
    for (const [kind, revisionId, snapshot] of expected) {
      if (!revisionId && snapshot === null) continue;
      const authority = revisionId ? resolveEvidenceRevision(workspace, revisionId, kind) : null;
      if (!authority || stableStringify(authority.payload) !== stableStringify(snapshot)) {
        return invalid(`Parameter method run ${run.runId} evidence snapshot does not match revision ${revisionId ?? 'missing'}.`);
      }
    }
  }
  const sourceRows = new Map(derivation.derivedRows.map((row) => [row.sourceRowId, row]));
  if (new Set(run.inputRowsSnapshot.map((row) => row.sourceRowId)).size !== run.inputRowsSnapshot.length) {
    return invalid(`Parameter method run ${run.runId} contains duplicate source rows.`);
  }
  for (const row of run.inputRowsSnapshot) {
    const source = sourceRows.get(row.sourceRowId);
    const evidence = run.evidenceSnapshot.find((candidate) => candidate.layerId === row.layerId);
    if (
      !source
      || !evidence
      || row.layerRevisionRef !== evidence.layerRevisionRef
      || row.layerGroup !== evidence.layerGroup
      || row.depthM !== source.depthM
      || row.derivationStatus !== source.status
      || row.derivationReasonCode !== source.reasonCode
      || row.qtn !== source.qtn
      || row.icRw !== source.ic
      || row.qnetKpa !== source.qnetKpa
    ) return invalid(`Parameter method run ${run.runId} input rows do not match the immutable derivation result.`);
  }
  const expectedInputRows = buildExpectedRowsFromEvidence(derivation.derivedRows, run.targetScopeSnapshot, run.evidenceSnapshot);
  if (stableStringify(run.inputRowsSnapshot) !== stableStringify(expectedInputRows)) {
    return invalid(`Parameter method run ${run.runId} does not contain the complete ordered input row set for its exact scope.`);
  }
  if (stratificationRevision) {
    if (
      stratificationRevision.revisionId !== revision.snapshot.input.stratificationRevisionId
      || stratificationRevision.schemeId !== revision.snapshot.input.stratificationSchemeId
      || stratificationRevision.version !== revision.snapshot.input.stratificationVersion
    ) return invalid(`Parameter method run ${run.runId} does not match its exact stratification revision.`);
    for (const evidence of run.evidenceSnapshot) {
      const layer = stratificationRevision.snapshot.layers.find((candidate) => candidate.layerId === evidence.layerId);
      if (
        !layer
        || evidence.layerRevisionRef !== createLayerRevisionRef(stratificationRevision.revisionId, layer.layerId)
        || evidence.layerGroup !== normalizeLayerGroup(layer.engineeringSoilGroup)
        || evidence.depthFromM !== layer.depthFromM
        || evidence.depthToM !== layer.depthToM
        || evidence.includesLowerBoundary !== (layer.depthToM === stratificationRevision.snapshot.depthToM)
      ) {
        return invalid(`Parameter method run ${run.runId} references a layer outside its exact revision.`);
      }
    }
    for (const row of run.inputRowsSnapshot) {
      const layer = stratificationRevision.snapshot.layers.find((candidate) => candidate.layerId === row.layerId);
      const includeTo = layer?.depthToM === stratificationRevision.snapshot.depthToM;
      if (
        !layer
        || !insideTargetScope(row.depthM, run.targetScopeSnapshot)
        || !depthInsideLayer(row.depthM, layer.depthFromM, layer.depthToM, includeTo)
      ) return invalid(`Parameter method run ${run.runId} assigns a source row outside its exact layer or target scope.`);
    }
  }
  if (run.settingsSnapshot.kind === 'suc_qnet_nkt_v1') {
    for (const entry of run.settingsSnapshot.nktByLayer.filter((candidate) => candidate.setting.origin === 'site_calibrated')) {
      const evidence = run.evidenceSnapshot.find((candidate) => candidate.layerId === entry.layerId);
      if (!evidence?.calibrationContext || !evidence.calibrationAuthority) {
        return invalid(`Parameter method run ${run.runId} is missing site-calibration authority.`);
      }
      const testProblem = validateCalibrationReferenceTests(
        entry.setting,
        workspace,
        evidence.calibrationContext.projectId,
        evidence.calibrationContext.siteId,
        evidence.calibrationContext.pointId,
        false,
      );
      if (testProblem) return invalid(`Parameter method run ${run.runId}: ${testProblem}`);
    }
  }
  const allowed = ['queued', 'running', 'cancel-requested', 'completed', 'failed', 'cancelled', 'invalidated'];
  if (!allowed.includes(run.status)) return invalid(`Parameter method run ${run.runId} has an unknown status.`);
  if (run.status === 'completed') {
    if (!run.startedAt || !run.completedAt || !run.summary || run.values.length !== run.inputRowsSnapshot.length) {
      return invalid(`Completed parameter method run ${run.runId} is incomplete.`);
    }
    const calculated = calculateMethodRun(run);
    if (
      !calculated.ok
      || stableStringify(run.values) !== stableStringify(calculated.values)
      || stableStringify(run.layerSummaries) !== stableStringify(calculated.layerSummaries)
      || stableStringify(run.summary) !== stableStringify(calculated.summary)
      || stableStringify(run.issues) !== stableStringify(calculated.issues)
      || run.resultHash !== methodResultHash(run)
    ) return invalid(`Completed parameter method run ${run.runId} does not match its immutable snapshots.`);
  } else if (run.values.length || run.layerSummaries.length || run.summary || run.issues.length || run.resultHash) {
    return invalid(`Unfinished parameter method run ${run.runId} contains partial results.`);
  }
  if (run.status === 'queued' && hasMethodRunStateEvidence(run)) return invalid(`Queued parameter method run ${run.runId} contains premature state evidence.`);
  if (run.status === 'running' && (!run.startedAt || run.cancelRequestedAt || run.invalidatedAt || run.invalidationReason || hasMethodRunTerminalEvidence(run))) {
    return invalid(`Running parameter method run ${run.runId} contains inconsistent state evidence.`);
  }
  if (run.status === 'cancel-requested' && (!run.cancelRequestedAt || run.invalidatedAt || run.invalidationReason || hasMethodRunTerminalEvidence(run))) {
    return invalid(`Parameter method run ${run.runId} has inconsistent cancellation-request evidence.`);
  }
  if (run.status === 'completed' && (run.cancelRequestedAt || run.failedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage)) {
    return invalid(`Completed parameter method run ${run.runId} mixes terminal evidence.`);
  }
  if (run.status === 'failed' && (!run.failedAt || !run.errorCode || run.cancelRequestedAt || run.completedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason)) {
    return invalid(`Failed parameter method run ${run.runId} has incomplete terminal evidence.`);
  }
  if (run.status === 'cancelled' && (!run.cancelRequestedAt || !run.cancelledAt || run.completedAt || run.failedAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage)) {
    return invalid(`Cancelled parameter method run ${run.runId} has incomplete terminal evidence.`);
  }
  if (run.status === 'invalidated' && (!run.invalidatedAt || !run.invalidationReason || run.completedAt || run.failedAt || run.cancelledAt || run.errorCode || run.errorMessage)) {
    return invalid(`Invalidated parameter method run ${run.runId} has incomplete invalidation evidence.`);
  }
  return { ok: true as const };
}

export function createLayerRevisionRef(stratificationRevisionId: string, layerId: string) {
  return `${stratificationRevisionId}:${layerId}`;
}

export function decodeEncodedNonFinite<T extends Record<string, unknown>>(value: T): T {
  const clone = structuredClone(value) as T & { encodedNonFinite?: { field?: string; kind?: string } };
  const marker = clone.encodedNonFinite;
  if (!marker) return clone;
  if (!marker.field) throw new Error('encodedNonFinite must name the absent numeric field.');
  if (hasOwn(clone, marker.field)) throw new Error(`encodedNonFinite field ${marker.field} must be absent before decoding.`);
  const decoded = marker.kind === 'NaN'
    ? Number.NaN
    : marker.kind === 'PositiveInfinity'
      ? Number.POSITIVE_INFINITY
      : marker.kind === 'NegativeInfinity'
        ? Number.NEGATIVE_INFINITY
        : undefined;
  if (decoded === undefined) throw new Error(`Unsupported encodedNonFinite kind ${marker.kind ?? 'missing'}.`);
  (clone as Record<string, unknown>)[marker.field] = decoded;
  delete clone.encodedNonFinite;
  return clone;
}

function buildMethodSnapshots(
  projectId: string,
  siteId: string | null,
  workspace: ParameterWorkspaceV2,
  slot: ParameterSlotV2,
  settings: ParameterMethodSettingsV1,
  derivedRows: Array<{
    sourceRowId: string;
    depthM: number;
    status: 'valid' | 'invalid-input' | 'undefined';
    reasonCode: string | null;
    qtn: number | null;
    ic: number | null;
    qnetKpa: number | null;
  }>,
  stratificationRevision: StratificationSchemeRevisionV2,
  layerEvidence: ParameterLayerEvidenceInputV1[],
  derivationRunId: string,
) {
  const targetLayers = slot.targetScope.layerIds.map((layerId) =>
    stratificationRevision.snapshot.layers.find((candidate) => candidate.layerId === layerId));
  if (targetLayers.some((layer) => !layer)) return { ok: false as const, problem: '参数槽引用了精确分层修订以外的层。' };
  if (new Set(layerEvidence.map((evidence) => evidence.layerId)).size !== layerEvidence.length) {
    return { ok: false as const, problem: '目标层证据存在重复。' };
  }
  const evidenceSnapshot: ParameterLayerEvidenceSnapshotV1[] = [];
  for (const layer of targetLayers) {
    const evidenceInput = layerEvidence.find((candidate) => candidate.layerId === layer!.layerId);
    const expectedRef = createLayerRevisionRef(stratificationRevision.revisionId, layer!.layerId);
    if (!evidenceInput || evidenceInput.layerRevisionRef !== expectedRef || evidenceInput.layerGroup !== normalizeLayerGroup(layer!.engineeringSoilGroup)) {
      return { ok: false as const, problem: `目标层 ${layer!.name} 缺少与精确修订一致的证据。` };
    }
    const rateRevision = resolveCurrentEvidenceRevision(workspace, evidenceInput.evidenceRevisionRefs.rate, 'penetration_rate');
    const drainageRevision = resolveCurrentEvidenceRevision(workspace, evidenceInput.evidenceRevisionRefs.drainage, 'drainage_applicability');
    const materialRevision = resolveCurrentEvidenceRevision(workspace, evidenceInput.evidenceRevisionRefs.material, 'material_applicability');
    const conflictRevision = evidenceInput.evidenceRevisionRefs.conflictContext
      ? resolveCurrentEvidenceRevision(workspace, evidenceInput.evidenceRevisionRefs.conflictContext, 'conflict_context')
      : null;
    if (!rateRevision || !drainageRevision || !materialRevision || (evidenceInput.evidenceRevisionRefs.conflictContext && !conflictRevision)) {
      return { ok: false as const, problem: `目标层 ${layer!.name} 的证据引用不是当前权威修订。` };
    }
    const material = materialRevision.payload as MaterialApplicabilityEvidenceV1;
    const nkt = settings.kind === 'suc_qnet_nkt_v1'
      ? settings.nktByLayer.find((candidate) => candidate.layerId === layer!.layerId)?.setting
      : undefined;
    const usesSiteCalibration = nkt?.origin === 'site_calibrated';
    if (usesSiteCalibration && !siteId) return { ok: false as const, problem: `目标层 ${layer!.name} 缺少点位的 canonical 场地归属。` };
    const calibrationContext: NktCalibrationContextV1 | null = usesSiteCalibration ? {
      projectId,
      siteId: siteId as string,
      pointId: stratificationRevision.snapshot.input.pointId,
      environment: evidenceInput.environment,
      targetLayerRevisionRef: expectedRef,
      targetMaterialClass: material.materialClass,
      inputDerivationRunId: derivationRunId,
    } : null;
    const calibrationAuthority: NktCalibrationAuthorityV1 | null = usesSiteCalibration ? {
      inputDerivationRunId: derivationRunId,
      currentSourceRowIds: derivedRows.map((row) => row.sourceRowId),
      currentReferenceTestRevisions: structuredClone(workspace.currentReferenceTestRefs ?? {}),
    } : null;
    const evidence: ParameterLayerEvidenceSnapshotV1 = {
      layerId: evidenceInput.layerId,
      layerRevisionRef: evidenceInput.layerRevisionRef,
      layerGroup: evidenceInput.layerGroup,
      depthFromM: layer!.depthFromM,
      depthToM: layer!.depthToM,
      includesLowerBoundary: layer!.depthToM === stratificationRevision.snapshot.depthToM,
      environment: evidenceInput.environment,
      evidenceRevisionRefs: {
        rate: rateRevision.revisionId,
        drainage: drainageRevision.revisionId,
        material: materialRevision.revisionId,
        conflictContext: conflictRevision?.revisionId ?? null,
      },
      rate: structuredClone(rateRevision.payload as PenetrationRateEvidenceV1),
      drainage: structuredClone(drainageRevision.payload as DrainageApplicabilityEvidenceV1),
      material: structuredClone(material),
      conflictContext: conflictRevision ? structuredClone(conflictRevision.payload as ParameterConflictContextV1) : null,
      calibrationContext,
      calibrationAuthority,
    };
    if (!validateEvidenceSnapshot(evidence)) return { ok: false as const, problem: `目标层 ${layer!.name} 的证据对象不完整。` };
    if (evidence.conflictContext && evidence.conflictContext.pointId !== stratificationRevision.snapshot.input.pointId) {
      return { ok: false as const, problem: `目标层 ${layer!.name} 的冲突证据不属于当前点位。` };
    }
    if (evidence.calibrationContext && (
      evidence.calibrationContext.projectId !== projectId
      || evidence.calibrationContext.siteId !== siteId
      || evidence.calibrationContext.pointId !== stratificationRevision.snapshot.input.pointId
      || evidence.calibrationContext.targetLayerRevisionRef !== expectedRef
      || evidence.calibrationContext.inputDerivationRunId !== derivationRunId
    )) return { ok: false as const, problem: `目标层 ${layer!.name} 的校准上下文不属于当前运行。` };
    evidenceSnapshot.push(evidence);
  }
  if (settings.kind === 'suc_qnet_nkt_v1') {
    for (const layer of targetLayers) {
      const entry = settings.nktByLayer.find((candidate) => candidate.layerId === layer!.layerId);
      if (!entry || entry.layerRevisionRef !== createLayerRevisionRef(stratificationRevision.revisionId, layer!.layerId)) {
        return { ok: false as const, problem: `目标层 ${layer!.name} 的 Nkt 设置不属于当前精确修订。` };
      }
      if (entry.setting.origin === 'site_calibrated' && entry.setting.matchedPairs?.some((pair) => {
        const source = derivedRows.find((row) => row.sourceRowId === pair.sourceRowId);
        return !source
          || source.status !== 'valid'
          || source.depthM !== pair.depthM
          || source.qnetKpa !== pair.qnetKpa
          || !depthInsideLayer(pair.depthM, layer!.depthFromM, layer!.depthToM, layer!.depthToM === stratificationRevision.snapshot.depthToM);
      })) return { ok: false as const, problem: `目标层 ${layer!.name} 的 Nkt 校准数据对不属于该层或当前推导运行。` };
      if (entry.setting.origin === 'site_calibrated') {
        const testProblem = validateCalibrationReferenceTests(
          entry.setting,
          workspace,
          projectId,
          siteId as string,
          stratificationRevision.snapshot.input.pointId,
        );
        if (testProblem) return { ok: false as const, problem: testProblem };
      }
    }
  }
  const inputRowsSnapshot = buildExpectedMethodInputRows(derivedRows, slot.targetScope, stratificationRevision);
  if (!inputRowsSnapshot.length) return { ok: false as const, problem: '参数槽目标范围内没有可试算的数据行。' };
  const derivationSourceRowIds = new Set(derivedRows.map((row) => row.sourceRowId));
  if (evidenceSnapshot.some((evidence) => evidence.calibrationAuthority?.currentSourceRowIds.some((sourceRowId) => !derivationSourceRowIds.has(sourceRowId)))) {
    return { ok: false as const, problem: '校准权威目录引用了当前推导运行以外的来源行。' };
  }
  return { ok: true as const, evidenceSnapshot, inputRowsSnapshot };
}

function calculateMethodRun(run: ParameterRunV2) {
  const values: ParameterValueV2[] = [];
  for (const row of run.inputRowsSnapshot) {
    const evidence = run.evidenceSnapshot.find((candidate) => candidate.layerId === row.layerId);
    if (!evidence) return { ok: false as const, problem: `数据行 ${row.sourceRowId} 缺少目标层证据快照。` };
    const joint = evaluateJointApplicabilityV1({
      ...(row.icRw === null ? {} : { icRw: row.icRw }),
      layerGroup: row.layerGroup,
      drainage: evidence.drainage,
      conflictContext: evidence.conflictContext,
    });
    let evaluation: ParameterMethodEvaluationV1;
    if (joint.status === 'ApplicabilityUnconfirmed') {
      evaluation = { status: 'ApplicabilityUnconfirmed', reasonCodes: joint.reasonCodes, value: null, eligibleForCurrentResult: false };
    } else if (run.methodId === PARAMETER_PHI_PEAK_METHOD_ID) {
      evaluation = evaluatePhiPeakV1({
        ...(row.qtn === null ? {} : { qtn: row.qtn }),
        ...(row.icRw === null ? {} : { icRw: row.icRw }),
        layerGroup: row.layerGroup,
        rate: evidence.rate,
        drainage: evidence.drainage,
        material: evidence.material,
        conflictContext: evidence.conflictContext,
      });
    } else if (run.methodId === PARAMETER_SUC_METHOD_ID && run.settingsSnapshot.kind === 'suc_qnet_nkt_v1') {
      const nkt = run.settingsSnapshot.nktByLayer.find((candidate) => candidate.layerId === row.layerId)?.setting;
      if (!nkt) return { ok: false as const, problem: `数据行 ${row.sourceRowId} 缺少目标层 Nkt 设置。` };
      evaluation = evaluateSucV1({
        ...(row.qnetKpa === null ? {} : { qnetKpa: row.qnetKpa }),
        ...(row.icRw === null ? {} : { icRw: row.icRw }),
        layerGroup: row.layerGroup,
        environment: evidence.environment,
        requestedStrengthMode: run.settingsSnapshot.requestedStrengthMode,
        rate: evidence.rate,
        drainage: evidence.drainage,
        material: evidence.material,
        nkt,
        conflictContext: evidence.conflictContext,
        calibrationContext: evidence.calibrationContext,
        calibrationAuthority: evidence.calibrationAuthority,
      });
    } else {
      return { ok: false as const, problem: `参数方法 ${run.methodId} 与设置不一致。` };
    }
    values.push({
      sourceRowId: row.sourceRowId,
      depthM: row.depthM,
      layerId: row.layerId,
      layerRevisionRef: row.layerRevisionRef,
      value: evaluation.value,
      status: evaluation.status,
      reasonCodes: evaluation.reasonCodes,
      eligibleForCurrentResult: evaluation.eligibleForCurrentResult,
    });
  }
  const layerSummaries = run.evidenceSnapshot.map((evidence) => summarizeLayer(evidence.layerId, evidence.layerRevisionRef, values));
  const summary = summarizeMethodValues(values);
  const issues = values.flatMap((value) => value.reasonCodes
    .filter((reasonCode) => !['PhiValid', 'SucValid'].includes(reasonCode))
    .map((reasonCode): ParameterIssueV2 => ({
      issueId: `parameter-method-${safeId(run.runId)}-${safeId(value.sourceRowId)}-${safeId(reasonCode)}`,
      severity: value.value === null ? 'problem' : 'notice',
      reasonCode,
      message: methodReasonMessage(reasonCode),
      sourceRowId: value.sourceRowId,
      linkedObjectId: value.layerId,
    })));
  return { ok: true as const, values, layerSummaries, summary, issues };
}

function summarizeLayer(layerId: string, layerRevisionRef: string, values: ParameterValueV2[]): ParameterLayerSummaryV1 {
  const rows = values.filter((value) => value.layerId === layerId);
  const eligible = rows.filter((value) => value.eligibleForCurrentResult && value.value !== null).map((value) => value.value as number);
  const numeric = rows.filter((value) => value.value !== null);
  return {
    layerId,
    layerRevisionRef,
    rowCount: rows.length,
    numericValueCount: numeric.length,
    eligibleValueCount: eligible.length,
    trialOnlyValueCount: numeric.filter((value) => !value.eligibleForCurrentResult).length,
    noticeValueCount: rows.filter((value) => value.value !== null && value.reasonCodes.some((code) => !['PhiValid', 'SucValid'].includes(code))).length,
    problemValueCount: rows.filter((value) => value.value === null).length,
    eligibleMinimum: eligible.length ? Math.min(...eligible) : null,
    eligibleMaximum: eligible.length ? Math.max(...eligible) : null,
    eligibleMean: eligible.length ? eligible.reduce((sum, value) => sum + value, 0) / eligible.length : null,
  };
}

function summarizeMethodValues(values: ParameterValueV2[]): ParameterMethodRunSummaryV1 {
  const numeric = values.filter((value) => value.value !== null);
  return {
    rowCount: values.length,
    numericValueCount: numeric.length,
    eligibleValueCount: numeric.filter((value) => value.eligibleForCurrentResult).length,
    trialOnlyValueCount: numeric.filter((value) => !value.eligibleForCurrentResult).length,
    noticeValueCount: numeric.filter((value) => value.reasonCodes.some((code) => !['PhiValid', 'SucValid'].includes(code))).length,
    problemValueCount: values.filter((value) => value.value === null).length,
  };
}

function validateNktBasis(input: SucEvaluationInputV1): {
  blocking: ParameterMethodReasonCodeV1 | null;
  notice: ParameterMethodReasonCodeV1 | null;
} {
  const nkt = input.nkt;
  if (nkt.origin === 'literature_starting_assumption') {
    const environment = input.environment;
    const requiredSources = environment ? LITERATURE_NKT_12_SOURCES[environment] : [];
    if (
      nkt.value !== 12
      || !environment
      || input.material.materialClass !== LITERATURE_NKT_12_MATERIAL
      || nkt.eligibleMaterialClass !== LITERATURE_NKT_12_MATERIAL
      || stableStringify(nkt.eligibleEnvironments) !== stableStringify(['onshore', 'offshore'])
      || requiredSources.some((sourceRef) => !nkt.sourceRefs?.some((source) => source.environment === environment && source.sourceRef === sourceRef))
    ) return { blocking: 'SucDefault12NotEligible', notice: null };
    return { blocking: null, notice: 'SucLiteratureAssumptionUncalibrated' };
  }
  if (nkt.origin === 'user_defined_assumption') {
    if (!nkt.assumptionRationale?.trim()) return { blocking: 'SucNktBasisMissing', notice: null };
    return { blocking: null, notice: 'SucUserDefinedAssumptionUncalibrated' };
  }
  if (nkt.origin !== 'site_calibrated') return { blocking: 'SucNktBasisMissing', notice: null };
  if (!completeCalibrationEvidence(nkt)) return { blocking: 'SucCalibrationEvidenceIncomplete', notice: null };
  if (!['CAUC', 'CIUC'].includes(nkt.referenceStrengthMode ?? '')) {
    return { blocking: 'SucUnsupportedStrengthMode', notice: null };
  }
  const context = input.calibrationContext;
  const authority = input.calibrationAuthority;
  if (!context || !authority) return { blocking: 'SucCalibrationEvidenceIncomplete', notice: null };
  if (
    nkt.projectId !== context.projectId
    || nkt.siteId !== context.siteId
    || nkt.pointId !== context.pointId
    || context.targetMaterialClass !== input.material.materialClass
    || nkt.materialClass !== context.targetMaterialClass
    || !nkt.applicableLayerRevisionRefs?.includes(context.targetLayerRevisionRef)
  ) return { blocking: 'SucCalibrationScopeMismatch', notice: null };
  if (
    nkt.inputDerivationRunId !== context.inputDerivationRunId
    || authority.inputDerivationRunId !== context.inputDerivationRunId
    || nkt.matchedPairs!.some((pair) =>
      pair.inputDerivationRunId !== context.inputDerivationRunId
      || !authority.currentSourceRowIds.includes(pair.sourceRowId)
      || authority.currentReferenceTestRevisions[pair.referenceTestId] !== pair.referenceTestRevisionId)
  ) return { blocking: 'SucCalibrationSourceStale', notice: null };
  return { blocking: null, notice: null };
}

function completeCalibrationEvidence(nkt: NktSettingV1) {
  if (
    !nkt.projectId || !nkt.siteId || !nkt.pointId || !nkt.materialClass || !nkt.calibrationRevisionId
    || !nkt.referenceStrengthMode || !nkt.failureCriterion || !nkt.applicableLayerRevisionRefs?.length
    || !nkt.inputDerivationRunId || !nkt.matchedPairs?.length || !nkt.derivation
    || nkt.derivation.pairCount !== nkt.matchedPairs.length
    || nkt.referenceTestIds.length !== new Set(nkt.referenceTestIds).size
  ) return false;
  if (!Number.isFinite(nkt.derivation.derivedNkt)) return false;
  const pairsValid = nkt.matchedPairs.every((pair) =>
    pair.pairId && Number.isFinite(pair.depthM) && pair.depthM >= 0
    && Number.isFinite(pair.qnetKpa) && pair.qnetKpa > 0
    && Number.isFinite(pair.sucKpa) && pair.sucKpa > 0
    && pair.sourceRowId && pair.inputDerivationRunId && pair.referenceTestId && pair.referenceTestRevisionId && pair.matchBasis
    && nkt.referenceTestIds.includes(pair.referenceTestId));
  if (!pairsValid || !nkt.referenceTestIds.every((testId) => nkt.matchedPairs!.some((pair) => pair.referenceTestId === testId))) return false;
  const pairIds = nkt.matchedPairs.map((pair) => pair.pairId);
  const pairKeys = nkt.matchedPairs.map((pair) => `${pair.sourceRowId}:${pair.referenceTestRevisionId}:${pair.depthM}`);
  if (new Set(pairIds).size !== pairIds.length || new Set(pairKeys).size !== pairKeys.length) return false;
  if (nkt.derivation.method !== 'matched_pair_ratio') return false;
  const ratios = nkt.matchedPairs.map((pair) => pair.qnetKpa / pair.sucKpa);
  let derived: number;
  if (nkt.derivation.aggregation === 'single_pair' && ratios.length === 1) {
    [derived] = ratios;
  } else if (nkt.derivation.aggregation === 'arithmetic_mean') {
    derived = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  } else if (nkt.derivation.aggregation === 'median') {
    const ordered = [...ratios].sort((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    derived = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  } else {
    return false;
  }
  return Math.abs(derived - nkt.derivation.derivedNkt) <= 1e-12
    && Math.abs(nkt.derivation.derivedNkt - (nkt.value as number)) <= 1e-12;
}

function evaluateRate(rate: PenetrationRateEvidenceV1, prefix: 'Phi' | 'Suc'): ParameterMethodEvaluationV1 | null {
  if (
    rate.status === 'missing'
    || rate.nominalRateMmPerSec === null
    || !rate.sourceType
    || !rate.sourceRevisionId
    || !rate.confirmedAt
  ) return result('ApplicabilityUnconfirmed', `${prefix}RateBasisMissing`);
  if (rate.status === 'known_nonstandard' || rate.nominalRateMmPerSec !== 20 || rate.unit !== 'mm/s') {
    return result('NotApplicable', `${prefix}KnownNonstandardRate`);
  }
  return null;
}

function evaluateDrainage(
  drainage: DrainageApplicabilityEvidenceV1,
  required: 'drained' | 'undrained',
  prefix: 'Phi' | 'Suc',
  conflictContext?: ParameterConflictContextV1 | null,
): ParameterMethodEvaluationV1 | null {
  if (drainage.supersededByConflictRevisionId) return result('ApplicabilityUnconfirmed', 'DrainageEvidenceSuperseded');
  if (drainage.status === 'resolved_conflict') {
    if (!validConflictSupersession(drainage, conflictContext)) {
      return result('ApplicabilityUnconfirmed', 'DrainageEvidenceSupersessionMismatch');
    }
    if (drainage.resolvedAs !== `confirmed_${required}`) {
      return result('ApplicabilityUnconfirmed', `${prefix}DrainageResolutionMismatch`);
    }
    return null;
  }
  if (drainage.status === 'unknown' || drainage.status === 'conflict') {
    return result('ApplicabilityUnconfirmed', prefix === 'Phi' ? 'PhiDrainageBasisMissing' : 'SucUndrainedBasisMissing');
  }
  if (drainage.status !== `confirmed_${required}`) {
    return result('ApplicabilityUnconfirmed', `${prefix}DrainageResolutionMismatch`);
  }
  if (!drainage.sourceRevisionId || !drainage.confirmedAt || !drainage.evidenceType) {
    return result('ApplicabilityUnconfirmed', prefix === 'Phi' ? 'PhiDrainageBasisMissing' : 'SucUndrainedBasisMissing');
  }
  return null;
}

function effectiveDrainageDirection(
  drainage: DrainageApplicabilityEvidenceV1,
  conflictContext?: ParameterConflictContextV1 | null,
): 'drained' | 'undrained' | null {
  if (drainage.supersededByConflictRevisionId) return null;
  if (drainage.status === 'confirmed_drained') return 'drained';
  if (drainage.status === 'confirmed_undrained') return 'undrained';
  if (drainage.status === 'resolved_conflict' && validConflictSupersession(drainage, conflictContext)) {
    return drainage.resolvedAs === 'confirmed_drained' ? 'drained' : drainage.resolvedAs === 'confirmed_undrained' ? 'undrained' : null;
  }
  return null;
}

function validConflictSupersession(
  drainage: DrainageApplicabilityEvidenceV1,
  context?: ParameterConflictContextV1 | null,
) {
  return drainage.status === 'resolved_conflict'
    && Boolean(context?.currentConflictRevisionId)
    && drainage.supersedesConflictRevisionId === context?.currentConflictRevisionId
    && Boolean(drainage.evidenceType)
    && Boolean(drainage.resolutionRevisionId)
    && Boolean(drainage.sourceRevisionId)
    && Boolean(drainage.confirmedAt);
}

function validateEvidenceSnapshot(evidence: ParameterLayerEvidenceSnapshotV1) {
  if (
    !evidence.layerId || !evidence.layerRevisionRef || !evidence.layerGroup
    || !Number.isFinite(evidence.depthFromM) || !Number.isFinite(evidence.depthToM) || evidence.depthToM <= evidence.depthFromM
    || typeof evidence.includesLowerBoundary !== 'boolean'
    || !['onshore', 'offshore'].includes(evidence.environment)
  ) return false;
  if (!['standard_confirmed', 'known_nonstandard', 'missing'].includes(evidence.rate.status) || evidence.rate.unit !== 'mm/s') return false;
  if (!['confirmed_drained', 'confirmed_undrained', 'unknown', 'conflict', 'resolved_conflict'].includes(evidence.drainage.status)) return false;
  if (!['within_source_scope', 'scope_unknown', 'known_extrapolation', 'engineer_confirmed_extrapolation', 'outside_scope'].includes(evidence.material.status)) return false;
  if (!evidence.material.materialClass || !evidence.material.sourceRevisionId || !evidence.material.confirmedAt) return false;
  if (evidence.drainage.status === 'conflict' && !evidence.drainage.conflictRevisionId) return false;
  if (evidence.drainage.status === 'resolved_conflict' && (
    !evidence.drainage.resolvedAs || !evidence.drainage.evidenceType || !evidence.drainage.sourceRevisionId
    || !evidence.drainage.confirmedAt || !evidence.drainage.supersedesConflictRevisionId || !evidence.drainage.resolutionRevisionId
  )) return false;
  if (evidence.conflictContext && (!evidence.conflictContext.currentConflictRevisionId || !evidence.conflictContext.pointId || !evidence.conflictContext.sourceRevisionId)) return false;
  if (evidence.calibrationAuthority && new Set(evidence.calibrationAuthority.currentSourceRowIds).size !== evidence.calibrationAuthority.currentSourceRowIds.length) return false;
  return true;
}

function validateTargetScope(scope: ParameterTargetScopeV2) {
  if (!Number.isFinite(scope.depthFromM) || !Number.isFinite(scope.depthToM) || scope.depthToM <= scope.depthFromM) {
    return '参数槽目标深度范围无效。';
  }
  if (!scope.layerIds.length || new Set(scope.layerIds).size !== scope.layerIds.length) return '参数槽必须引用至少一个唯一目标层。';
  const exclusions = [...scope.excludedIntervals].sort((left, right) => left.depthFromM - right.depthFromM);
  if (exclusions.some((interval, index) =>
    !Number.isFinite(interval.depthFromM) || !Number.isFinite(interval.depthToM)
    || interval.depthToM <= interval.depthFromM
    || interval.depthFromM < scope.depthFromM || interval.depthToM > scope.depthToM
    || (index > 0 && interval.depthFromM < exclusions[index - 1].depthToM))) return '参数槽排除区间无效或互相重叠。';
  return null;
}

function buildExpectedMethodInputRows(
  derivedRows: Array<{
    sourceRowId: string;
    depthM: number;
    status: 'valid' | 'invalid-input' | 'undefined';
    reasonCode: string | null;
    qtn: number | null;
    ic: number | null;
    qnetKpa: number | null;
  }>,
  scope: ParameterTargetScopeV2,
  stratificationRevision: StratificationSchemeRevisionV2,
) {
  const targetLayerIds = new Set(scope.layerIds);
  const layers = [...stratificationRevision.snapshot.layers].sort((left, right) => left.depthFromM - right.depthFromM);
  const rows: ParameterMethodInputRowV1[] = [];
  for (const row of derivedRows) {
    if (!insideTargetScope(row.depthM, scope)) continue;
    const layer = layers.find((candidate) => depthInsideLayer(
      row.depthM,
      candidate.depthFromM,
      candidate.depthToM,
      candidate.depthToM === stratificationRevision.snapshot.depthToM,
    ));
    if (!layer || !targetLayerIds.has(layer.layerId)) continue;
    rows.push({
      sourceRowId: row.sourceRowId,
      depthM: row.depthM,
      layerId: layer.layerId,
      layerRevisionRef: createLayerRevisionRef(stratificationRevision.revisionId, layer.layerId),
      layerGroup: normalizeLayerGroup(layer.engineeringSoilGroup),
      derivationStatus: row.status,
      derivationReasonCode: row.reasonCode,
      qtn: row.qtn,
      icRw: row.ic,
      qnetKpa: row.qnetKpa,
    });
  }
  return rows;
}

function buildExpectedRowsFromEvidence(
  derivedRows: Array<{
    sourceRowId: string;
    depthM: number;
    status: 'valid' | 'invalid-input' | 'undefined';
    reasonCode: string | null;
    qtn: number | null;
    ic: number | null;
    qnetKpa: number | null;
  }>,
  scope: ParameterTargetScopeV2,
  evidenceSnapshot: ParameterLayerEvidenceSnapshotV1[],
) {
  const layers = [...evidenceSnapshot].sort((left, right) => left.depthFromM - right.depthFromM);
  const rows: ParameterMethodInputRowV1[] = [];
  for (const row of derivedRows) {
    if (!insideTargetScope(row.depthM, scope)) continue;
    const layer = layers.find((candidate) => depthInsideLayer(
      row.depthM,
      candidate.depthFromM,
      candidate.depthToM,
      candidate.includesLowerBoundary,
    ));
    if (!layer) continue;
    rows.push({
      sourceRowId: row.sourceRowId,
      depthM: row.depthM,
      layerId: layer.layerId,
      layerRevisionRef: layer.layerRevisionRef,
      layerGroup: layer.layerGroup,
      derivationStatus: row.status,
      derivationReasonCode: row.reasonCode,
      qtn: row.qtn,
      icRw: row.ic,
      qnetKpa: row.qnetKpa,
    });
  }
  return rows;
}

function ensureG1BWorkspace(workspace: ParameterWorkspaceV2) {
  const next = structuredClone(workspace);
  next.parameterWorkspaceSchemaVersion = 'parameter-workspace-g1b.v1';
  next.methodEvidenceRevisions ??= [];
  next.currentMethodEvidenceRefs ??= {};
  next.referenceTestRevisions ??= [];
  next.currentReferenceTestRefs ??= {};
  return next;
}

function invalidateOpenMethodRuns(workspace: ParameterWorkspaceV2, reason: string, now: string) {
  workspace.parameterRuns.forEach((run) => {
    if (!['queued', 'running', 'cancel-requested'].includes(run.status)) return;
    run.status = 'invalidated';
    clearMethodRunResults(run);
    run.invalidatedAt = now;
    run.invalidationReason = reason;
  });
}

function resolveCurrentEvidenceRevision(
  workspace: ParameterWorkspaceV2,
  revisionId: string,
  kind: ParameterMethodEvidenceRevisionV1['kind'],
) {
  const revision = resolveEvidenceRevision(workspace, revisionId, kind);
  return revision && workspace.currentMethodEvidenceRefs?.[revision.evidenceId] === revision.revisionId ? revision : null;
}

function resolveEvidenceRevision(
  workspace: ParameterWorkspaceV2,
  revisionId: string,
  kind: ParameterMethodEvidenceRevisionV1['kind'],
) {
  return (workspace.methodEvidenceRevisions ?? []).find((revision) => revision.revisionId === revisionId && revision.kind === kind) ?? null;
}

function evidencePayloadMatchesKind(
  kind: ParameterMethodEvidenceRevisionV1['kind'],
  payload: PenetrationRateEvidenceV1 | DrainageApplicabilityEvidenceV1 | MaterialApplicabilityEvidenceV1 | ParameterConflictContextV1,
) {
  if (kind === 'penetration_rate') {
    const rate = payload as PenetrationRateEvidenceV1;
    if (!['standard_confirmed', 'known_nonstandard', 'missing'].includes(rate.status) || rate.unit !== 'mm/s') return false;
    if (rate.status === 'missing') return rate.nominalRateMmPerSec === null;
    return Number.isFinite(rate.nominalRateMmPerSec)
      && (rate.nominalRateMmPerSec as number) > 0
      && (rate.status !== 'standard_confirmed' || rate.nominalRateMmPerSec === 20)
      && Boolean(rate.sourceType && rate.sourceRevisionId && rate.confirmedAt);
  }
  if (kind === 'drainage_applicability') {
    const drainage = payload as DrainageApplicabilityEvidenceV1;
    if (!['confirmed_drained', 'confirmed_undrained', 'unknown', 'conflict', 'resolved_conflict'].includes(drainage.status)) return false;
    if (drainage.status === 'unknown') return true;
    if (!drainage.evidenceType || !drainage.sourceRevisionId || !drainage.confirmedAt) return false;
    if (drainage.status === 'conflict') return Boolean(drainage.conflictRevisionId);
    if (drainage.status === 'resolved_conflict') {
      return Boolean(drainage.resolvedAs && drainage.supersedesConflictRevisionId && drainage.resolutionRevisionId);
    }
    return true;
  }
  if (kind === 'material_applicability') {
    const material = payload as MaterialApplicabilityEvidenceV1;
    return ['within_source_scope', 'scope_unknown', 'known_extrapolation', 'engineer_confirmed_extrapolation', 'outside_scope'].includes(material.status)
      && Boolean(material.materialClass && material.sourceRevisionId && material.confirmedAt)
      && (material.status !== 'engineer_confirmed_extrapolation' || Boolean(material.confirmationRevisionId));
  }
  const conflict = payload as ParameterConflictContextV1;
  return Boolean(conflict.currentConflictRevisionId && conflict.pointId && conflict.sourceRevisionId);
}

function validateReferenceTestContent(input: Partial<ParameterReferenceTestRevisionV1>) {
  return Boolean(
    input.testId && input.revisionId && input.projectId && input.siteId && input.pointId && input.materialClass
    && Number.isFinite(input.depthM) && (input.depthM as number) >= 0
    && ['CAUC', 'CIUC'].includes(input.testType ?? '')
    && input.strengthMode === 'triaxial_compression'
    && input.failureCriterion
    && Number.isFinite(input.sucKpa) && (input.sucKpa as number) > 0
    && input.createdAt
    && (input.version === undefined || (Number.isInteger(input.version) && input.version > 0))
  );
}

function validateCalibrationReferenceTests(
  nkt: NktSettingV1,
  workspace: ParameterWorkspaceV2,
  projectId: string,
  siteId: string,
  pointId: string,
  requireCurrent = true,
) {
  if (!nkt.matchedPairs?.length) return null;
  const pairIds = nkt.matchedPairs.map((pair) => pair.pairId);
  const pairKeys = nkt.matchedPairs.map((pair) => `${pair.sourceRowId}:${pair.referenceTestRevisionId}:${pair.depthM}`);
  if (new Set(pairIds).size !== pairIds.length || new Set(pairKeys).size !== pairKeys.length) return 'Nkt 校准包含重复的数据对。';
  for (const pair of nkt.matchedPairs) {
    const test = (workspace.referenceTestRevisions ?? []).find((candidate) => candidate.revisionId === pair.referenceTestRevisionId);
    if (!test) continue;
    if (
      test.testId !== pair.referenceTestId
      || (requireCurrent && workspace.currentReferenceTestRefs?.[test.testId] !== test.revisionId)
      || test.projectId !== projectId || test.siteId !== siteId || test.pointId !== pointId
      || test.materialClass !== nkt.materialClass
      || test.depthM !== pair.depthM || test.sucKpa !== pair.sucKpa
      || test.testType !== nkt.referenceStrengthMode
      || test.strengthMode !== 'triaxial_compression'
      || test.failureCriterion !== nkt.failureCriterion
    ) return `参考试验修订 ${pair.referenceTestRevisionId} 与 Nkt 校准数据对不一致。`;
  }
  return null;
}

function transitionMethodRun(
  workspace: ParameterWorkspaceV2,
  runId: string,
  allowedStatuses: ParameterRunV2['status'][],
  update: (run: ParameterRunV2) => void,
) {
  const run = workspace.parameterRuns.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '参数方法运行不存在。' };
  if (!allowedStatuses.includes(run.status)) return { ok: false as const, problem: `当前运行状态 ${run.status} 不允许执行该操作。` };
  const next = structuredClone(workspace);
  const target = next.parameterRuns.find((candidate) => candidate.runId === runId)!;
  update(target);
  return { ok: true as const, workspace: next, run: structuredClone(target) };
}

function clearMethodRunResults(run: ParameterRunV2) {
  run.values = [];
  run.layerSummaries = [];
  run.summary = null;
  run.issues = [];
  run.resultHash = null;
}

function methodResultHash(run: ParameterRunV2) {
  return sha256HexSync(stableStringify({
    values: run.values,
    layerSummaries: run.layerSummaries,
    summary: run.summary,
    issues: run.issues,
  }));
}

function hasMethodRunStateEvidence(run: ParameterRunV2) {
  return Boolean(run.startedAt || run.cancelRequestedAt || run.completedAt || run.failedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason || run.errorCode || run.errorMessage);
}

function hasMethodRunTerminalEvidence(run: ParameterRunV2) {
  return Boolean(run.completedAt || run.failedAt || run.cancelledAt || run.errorCode || run.errorMessage);
}

function methodIdentityForKey(parameterKey: 'PhiDeg' | 'SuKpa') {
  return parameterKey === 'PhiDeg'
    ? { methodId: PARAMETER_PHI_PEAK_METHOD_ID, methodVersion: PARAMETER_PHI_PEAK_METHOD_VERSION }
    : { methodId: PARAMETER_SUC_METHOD_ID, methodVersion: PARAMETER_SUC_METHOD_VERSION };
}

function formulaIdentity(methodId: string) {
  if (methodId === PARAMETER_PHI_PEAK_METHOD_ID) return {
    methodVersion: PARAMETER_PHI_PEAK_METHOD_VERSION,
    formulaReference: PARAMETER_PHI_PEAK_FORMULA_REFERENCE,
    formulaSpec: PARAMETER_PHI_PEAK_FORMULA_SPEC,
  };
  if (methodId === PARAMETER_SUC_METHOD_ID) return {
    methodVersion: PARAMETER_SUC_METHOD_VERSION,
    formulaReference: PARAMETER_SUC_FORMULA_REFERENCE,
    formulaSpec: PARAMETER_SUC_FORMULA_SPEC,
  };
  return null;
}

function settingsMatchMethod(settings: ParameterMethodSettingsV1, methodId: string) {
  return (methodId === PARAMETER_PHI_PEAK_METHOD_ID && settings.kind === 'phi_peak_qtn_v1')
    || (methodId === PARAMETER_SUC_METHOD_ID && settings.kind === 'suc_qnet_nkt_v1');
}

function isMethodSettings(value: unknown): value is ParameterMethodSettingsV1 {
  if (!value || typeof value !== 'object' || !('kind' in value)) return false;
  const settings = value as ParameterMethodSettingsV1;
  return settings.kind === 'phi_peak_qtn_v1'
    || (settings.kind === 'suc_qnet_nkt_v1' && settings.requestedStrengthMode === 'triaxial_compression' && Array.isArray(settings.nktByLayer));
}

function insideTargetScope(depthM: number, scope: ParameterTargetScopeV2) {
  return depthM >= scope.depthFromM && depthM <= scope.depthToM
    && !scope.excludedIntervals.some((interval) => depthM >= interval.depthFromM && depthM <= interval.depthToM);
}

function depthInsideLayer(depthM: number, from: number, to: number, includeTo: boolean) {
  return depthM >= from && (depthM < to || (includeTo && depthM === to));
}

function result(
  status: ParameterMethodEvaluationV1['status'],
  reasonCode: ParameterMethodReasonCodeV1,
  value: number | null = null,
  eligibleForCurrentResult = false,
): ParameterMethodEvaluationV1 {
  return { status, reasonCodes: [reasonCode], value, eligibleForCurrentResult };
}

function jointResult(
  status: ParameterJointApplicabilityEvaluationV1['status'],
  reasonCodes: ParameterMethodReasonCodeV1[],
  phiEligible: boolean,
  sucEligible: boolean,
): ParameterJointApplicabilityEvaluationV1 {
  return { status, reasonCodes, reasonPriority: 'joint_before_method', phiEligible, sucEligible };
}

function methodReasonMessage(reasonCode: string) {
  const messages: Record<string, string> = {
    SoilClassBehaviorScreenConflict: '工程土类与行为筛选或独立排水证据冲突，请先完成证据复核。',
    PhiMaterialScopeUnknown: '材料适用范围尚未确认，当前数值只能作为试算。',
    PhiKnownExtrapolation: '材料已知偏离来源数据库，当前数值只能作为试算。',
    PhiMaterialSourceDeviation: '工程确认允许偏离来源数据库，结果保留适用性提示。',
    SucLiteratureAssumptionUncalibrated: '当前使用未经场地校准的文献 Nkt 起始假设。',
    SucUserDefinedAssumptionUncalibrated: '当前使用未经场地校准的用户 Nkt 假设。',
    SucIcScreenConflict: 'IcRW 软件筛选值与不排水解释存在冲突，已保留独立证据提示。',
    SucIcScreenUnavailable: 'IcRW 软件筛选值不可用，结果依赖独立不排水证据。',
  };
  return messages[reasonCode] ?? `参数方法存在问题：${reasonCode}`;
}

function normalizeLayerGroup(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const aliases: Record<string, string> = {
    sand: 'sand',
    '砂': 'sand',
    '砂土': 'sand',
    clay: 'clay',
    '黏土': 'clay',
    '粘土': 'clay',
    mixed: 'mixed',
    '混合土': 'mixed',
    unclassified: 'unclassified',
    '未分类': 'unclassified',
    unknown: 'unknown',
    '未知': 'unknown',
  };
  return aliases[normalized] ?? 'unknown';
}

function hasOwn(value: object, property: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, property);
}

function safeId(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
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
