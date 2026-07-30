import type { StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import {
  commitParameterSchemeEdit,
  createParameterScheme,
  emptyParameterWorkspace,
} from './parameterDomain';
import {
  configureParameterMethodSlot,
  createLayerRevisionRef,
  registerParameterMethodEvidenceRevision,
  type ParameterLayerEvidenceInputV1,
} from './parameterMethodDomain';
import type {
  DrainageApplicabilityEvidenceV1,
  MaterialApplicabilityEvidenceV1,
  NktSettingV1,
  ParameterInputDerivationRunV2,
  ParameterMethodEvidenceRevisionV1,
  ParameterRunV2,
  ParameterSchemeRevisionV2,
  ParameterSchemeV2,
  ParameterSlotV2,
  ParameterWorkspaceV2,
  PenetrationRateEvidenceV1,
} from './parameterTypes';

export type ParameterWorkbenchMethod = 'phi' | 'suc';
export type ParameterWorkbenchNktMode = 'literature' | 'site-calibrated';

export type ParameterEvidenceDraft = {
  rateStatus: PenetrationRateEvidenceV1['status'];
  nominalRateMmPerSec: number | null;
  drainageStatus: DrainageApplicabilityEvidenceV1['status'];
  materialStatus: MaterialApplicabilityEvidenceV1['status'];
  materialClass: string;
};

export const DEFAULT_PARAMETER_EVIDENCE_DRAFT: ParameterEvidenceDraft = {
  rateStatus: 'standard_confirmed',
  nominalRateMmPerSec: 20,
  drainageStatus: 'confirmed_drained',
  materialStatus: 'scope_unknown',
  materialClass: 'unknown',
};

export function createConfiguredParameterScheme(input: {
  workspace?: ParameterWorkspaceV2;
  source: ParameterSchemeV2['input'];
  stratificationRevision: StratificationSchemeRevisionV2;
  name?: string;
  nktMode?: ParameterWorkbenchNktMode;
  now?: string;
}) {
  const now = input.now ?? new Date().toISOString();
  const nktMode = input.nktMode ?? 'literature';
  if (nktMode === 'site-calibrated') {
    return {
      ok: false as const,
      problem: '当前点位还没有可用的 CAUC/CIUC 试验修订和匹配对，不能建立场地标定 Nkt。',
      recovery: 'select-literature-or-register-tests' as const,
    };
  }

  const layers = input.stratificationRevision.snapshot.layers;
  const sandLayers = layers.filter((layer) => layer.engineeringSoilGroup === 'sand');
  const clayLayers = layers.filter((layer) => layer.engineeringSoilGroup === 'clay');
  if (!sandLayers.length && !clayLayers.length) {
    return {
      ok: false as const,
      problem: '当前分层没有已分类的砂土或黏土层，请先设置工程土组。',
      recovery: 'stratification' as const,
    };
  }

  const created = createParameterScheme(
    input.workspace ?? emptyParameterWorkspace(),
    input.source,
    input.name ?? `参数方案 ${(input.workspace?.schemes.length ?? 0) + 1}`,
    now,
  );
  if (!created.ok) return created;

  let workspace = created.workspace;
  if (sandLayers.length) {
    const configured = configureParameterMethodSlot(workspace, {
      slotId: `${created.scheme.schemeId}:slot:phi`,
      parameterKey: 'PhiDeg',
      requiredForHandoff: false,
      targetScope: layerScope(sandLayers),
      settings: { kind: 'phi_peak_qtn_v1' },
      now,
    });
    if (!configured.ok) return configured;
    workspace = configured.workspace;
  }
  if (clayLayers.length) {
    const configured = configureParameterMethodSlot(workspace, {
      slotId: `${created.scheme.schemeId}:slot:suc`,
      parameterKey: 'SuKpa',
      requiredForHandoff: false,
      targetScope: layerScope(clayLayers),
      settings: {
        kind: 'suc_qnet_nkt_v1',
        requestedStrengthMode: 'triaxial_compression',
        nktByLayer: clayLayers.map((layer) => ({
          layerId: layer.layerId,
          layerRevisionRef: createLayerRevisionRef(input.stratificationRevision.revisionId, layer.layerId),
          setting: literatureNkt12(now),
        })),
      },
      now,
    });
    if (!configured.ok) return configured;
    workspace = configured.workspace;
  }

  return {
    ok: true as const,
    workspace,
    scheme: structuredClone(workspace.editSession!.working),
    slotIds: workspace.editSession!.working.slots.map((slot) => slot.slotId),
  };
}

export function commitConfiguredParameterScheme(
  workspace: ParameterWorkspaceV2,
  source: ParameterSchemeV2['input'],
  now = new Date().toISOString(),
) {
  return commitParameterSchemeEdit(workspace, source, now);
}

export function confirmParameterMethodEvidence(input: {
  workspace: ParameterWorkspaceV2;
  slot: ParameterSlotV2;
  stratificationRevision: StratificationSchemeRevisionV2;
  draft: ParameterEvidenceDraft;
  targetLayerId?: string;
  now?: string;
}) {
  const now = input.now ?? new Date().toISOString();
  if (
    input.draft.rateStatus !== 'missing'
    && (!Number.isFinite(input.draft.nominalRateMmPerSec) || (input.draft.nominalRateMmPerSec ?? 0) <= 0)
  ) return { ok: false as const, problem: '已知贯入速率必须是大于 0 mm/s 的有限数值。' };

  const layers = input.stratificationRevision.snapshot.layers.filter((layer) =>
    input.slot.targetScope.layerIds.includes(layer.layerId)
    && (!input.targetLayerId || layer.layerId === input.targetLayerId));
  if (input.targetLayerId && !input.slot.targetScope.layerIds.includes(input.targetLayerId)) {
    return { ok: false as const, problem: '选中层不属于当前方法的目标范围。' };
  }
  if (layers.length !== input.slot.targetScope.layerIds.length) {
    if (!input.targetLayerId) return { ok: false as const, problem: '方法目标层与精确分层修订不一致。' };
  }
  if (!layers.length) return { ok: false as const, problem: '选中目标层在精确分层修订中不存在。' };
  if (input.draft.materialStatus !== 'scope_unknown' && (!input.draft.materialClass || input.draft.materialClass === 'unknown')) {
    return { ok: false as const, problem: '材料适用性不能只由工程土组推断，请显式选择材料类别。' };
  }

  let workspace = structuredClone(input.workspace);
  const evidence: ParameterLayerEvidenceInputV1[] = [];
  for (const layer of layers) {
    const prefix = `${input.slot.slotId}:${layer.layerId}`;
    const conflictAuthorityId = `${prefix}:drainage-conflict:${Date.parse(now)}`;
    let conflictContextRevisionId: string | null = null;
    const currentDrainage = currentEvidenceRevision(workspace, `${prefix}:drainage`, 'drainage_applicability');
    const currentConflict = currentEvidenceRevision(workspace, `${prefix}:conflict`, 'conflict_context');
    if (
      currentDrainage?.kind === 'drainage_applicability'
      && currentDrainage.payload.status === 'conflict'
      && input.draft.drainageStatus === 'unknown'
    ) return { ok: false as const, problem: '当前排水冲突必须显式解决为排水或不排水，不能改为未知来绕过冲突链。' };
    const resolvesCurrentConflict = Boolean(
      currentDrainage?.kind === 'drainage_applicability'
      && currentDrainage.payload.status === 'conflict'
      && currentConflict?.kind === 'conflict_context'
      && ['confirmed_drained', 'confirmed_undrained'].includes(input.draft.drainageStatus),
    );
    const rate = registerParameterMethodEvidenceRevision(workspace, {
      evidenceId: `${prefix}:rate`,
      revisionId: uniqueRevisionId(`${prefix}:rate`, workspace),
      kind: 'penetration_rate',
      payload: {
        status: input.draft.rateStatus,
        nominalRateMmPerSec: input.draft.rateStatus === 'missing' ? null : input.draft.nominalRateMmPerSec,
        unit: 'mm/s',
        sourceType: input.draft.rateStatus === 'missing' ? null : 'user_confirmation',
        sourceRevisionId: input.draft.rateStatus === 'missing' ? null : `${prefix}:rate-source`,
        confirmedAt: input.draft.rateStatus === 'missing' ? null : now,
      },
      now,
    });
    if (!rate.ok) return rate;
    workspace = rate.workspace;

    if (input.draft.drainageStatus === 'conflict') {
      const conflict = registerParameterMethodEvidenceRevision(workspace, {
        evidenceId: `${prefix}:conflict`,
        revisionId: uniqueRevisionId(`${prefix}:conflict`, workspace),
        kind: 'conflict_context',
        payload: {
          currentConflictRevisionId: conflictAuthorityId,
          pointId: input.stratificationRevision.snapshot.input.pointId,
          sourceRevisionId: `${prefix}:drainage-source`,
        },
        now,
      });
      if (!conflict.ok) return conflict;
      workspace = conflict.workspace;
      conflictContextRevisionId = conflict.revision.revisionId;
    } else if (resolvesCurrentConflict && currentConflict) {
      conflictContextRevisionId = currentConflict.revisionId;
    }

    const drainage = registerParameterMethodEvidenceRevision(workspace, {
      evidenceId: `${prefix}:drainage`,
      revisionId: uniqueRevisionId(`${prefix}:drainage`, workspace),
      kind: 'drainage_applicability',
      payload: {
        status: resolvesCurrentConflict ? 'resolved_conflict' : input.draft.drainageStatus,
        evidenceType: input.draft.drainageStatus === 'unknown' ? null : 'user_confirmation',
        sourceRevisionId: input.draft.drainageStatus === 'unknown' ? null : `${prefix}:drainage-source`,
        confirmedAt: input.draft.drainageStatus === 'unknown' ? null : now,
        note: '由用户在 G2 参数工作台确认。',
        ...(input.draft.drainageStatus === 'conflict' ? { conflictRevisionId: conflictAuthorityId } : {}),
        ...(resolvesCurrentConflict && currentDrainage?.kind === 'drainage_applicability' ? {
          resolvedAs: input.draft.drainageStatus as 'confirmed_drained' | 'confirmed_undrained',
          supersedesConflictRevisionId: currentDrainage.payload.conflictRevisionId,
          resolutionRevisionId: `${prefix}:drainage-resolution:${Date.parse(now)}`,
        } : {}),
      },
      now,
    });
    if (!drainage.ok) return drainage;
    workspace = drainage.workspace;

    const material = registerParameterMethodEvidenceRevision(workspace, {
      evidenceId: `${prefix}:material`,
      revisionId: uniqueRevisionId(`${prefix}:material`, workspace),
      kind: 'material_applicability',
      payload: {
        status: input.draft.materialStatus,
        materialClass: input.draft.materialStatus === 'scope_unknown' ? 'unknown' : input.draft.materialClass,
        sourceRevisionId: `${prefix}:material-source`,
        confirmedAt: now,
        note: '由用户在 G2 参数工作台确认。',
      },
      now,
    });
    if (!material.ok) return material;
    workspace = material.workspace;

    evidence.push({
      layerId: layer.layerId,
      layerRevisionRef: createLayerRevisionRef(input.stratificationRevision.revisionId, layer.layerId),
      layerGroup: layer.engineeringSoilGroup,
      environment: 'offshore',
      evidenceRevisionRefs: {
        rate: rate.revision.revisionId,
        drainage: drainage.revision.revisionId,
        material: material.revision.revisionId,
        conflictContext: conflictContextRevisionId,
      },
    });
  }
  return { ok: true as const, workspace, evidence };
}

export function getCurrentParameterMethodEvidence(input: {
  workspace: ParameterWorkspaceV2;
  slot: ParameterSlotV2;
  stratificationRevision: StratificationSchemeRevisionV2;
  targetLayerId?: string;
}) {
  const layers = input.stratificationRevision.snapshot.layers.filter((layer) =>
    input.slot.targetScope.layerIds.includes(layer.layerId)
    && (!input.targetLayerId || layer.layerId === input.targetLayerId));
  const evidence: ParameterLayerEvidenceInputV1[] = [];
  for (const layer of layers) {
    const prefix = `${input.slot.slotId}:${layer.layerId}`;
    const rate = currentEvidenceRevision(input.workspace, `${prefix}:rate`, 'penetration_rate');
    const drainage = currentEvidenceRevision(input.workspace, `${prefix}:drainage`, 'drainage_applicability');
    const material = currentEvidenceRevision(input.workspace, `${prefix}:material`, 'material_applicability');
    if (!rate || !drainage || !material) {
      return { ok: false as const, problem: `目标层 ${layer.name} 还没有完整的速率、排水和材料证据修订。` };
    }
    const conflict = drainage.kind === 'drainage_applicability' && ['conflict', 'resolved_conflict'].includes(drainage.payload.status)
      ? currentEvidenceRevision(input.workspace, `${prefix}:conflict`, 'conflict_context')
      : null;
    if (drainage.kind === 'drainage_applicability' && ['conflict', 'resolved_conflict'].includes(drainage.payload.status) && !conflict) {
      return { ok: false as const, problem: `目标层 ${layer.name} 的排水冲突缺少当前冲突上下文修订。` };
    }
    evidence.push({
      layerId: layer.layerId,
      layerRevisionRef: createLayerRevisionRef(input.stratificationRevision.revisionId, layer.layerId),
      layerGroup: layer.engineeringSoilGroup,
      environment: 'offshore',
      evidenceRevisionRefs: {
        rate: rate.revisionId,
        drainage: drainage.revisionId,
        material: material.revisionId,
        conflictContext: conflict?.revisionId ?? null,
      },
    });
  }
  return { ok: true as const, evidence };
}

export function getParameterEvidenceDraft(
  workspace: ParameterWorkspaceV2,
  slot: ParameterSlotV2,
  layerId: string,
): ParameterEvidenceDraft | null {
  const prefix = `${slot.slotId}:${layerId}`;
  const rate = currentEvidenceRevision(workspace, `${prefix}:rate`, 'penetration_rate');
  const drainage = currentEvidenceRevision(workspace, `${prefix}:drainage`, 'drainage_applicability');
  const material = currentEvidenceRevision(workspace, `${prefix}:material`, 'material_applicability');
  if (!rate || rate.kind !== 'penetration_rate' || !drainage || drainage.kind !== 'drainage_applicability' || !material || material.kind !== 'material_applicability') return null;
  return {
    rateStatus: rate.payload.status,
    nominalRateMmPerSec: rate.payload.nominalRateMmPerSec,
    drainageStatus: drainage.payload.status === 'resolved_conflict'
      ? drainage.payload.resolvedAs ?? 'unknown'
      : drainage.payload.status,
    materialStatus: material.payload.status,
    materialClass: material.payload.materialClass,
  };
}

export function selectCurrentParameterSchemeV2(workspace: ParameterWorkspaceV2) {
  return workspace.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId) ?? null;
}

export function selectActiveParameterSchemeV2(workspace: ParameterWorkspaceV2) {
  if (workspace.editSession) return workspace.editSession.working;
  return workspace.schemes.find((scheme) => scheme.schemeId === workspace.activeSchemeId)
    ?? selectCurrentParameterSchemeV2(workspace);
}

export function selectCurrentParameterSchemeRevisionV2(workspace: ParameterWorkspaceV2) {
  const scheme = selectCurrentParameterSchemeV2(workspace);
  return scheme
    ? workspace.revisions.find((revision) => revision.schemeId === scheme.schemeId && revision.version === scheme.version) ?? null
    : null;
}

export function selectLatestCompletedDerivationRun(
  workspace: ParameterWorkspaceV2,
  schemeRevisionId?: string | null,
): ParameterInputDerivationRunV2 | null {
  return [...workspace.derivationRuns]
    .reverse()
    .find((run) => run.status === 'completed' && (!schemeRevisionId || run.schemeRevisionId === schemeRevisionId)) ?? null;
}

export function selectParameterMethodRuns(
  workspace: ParameterWorkspaceV2,
  slotId: string | null | undefined,
  schemeRevisionId?: string | null,
): ParameterRunV2[] {
  if (!slotId) return [];
  return workspace.parameterRuns
    .filter((run) => run.slotId === slotId && (!schemeRevisionId || run.schemeRevisionId === schemeRevisionId))
    .reverse();
}

export function methodFromSlot(slot: ParameterSlotV2 | null | undefined): ParameterWorkbenchMethod | null {
  if (slot?.parameterKey === 'PhiDeg') return 'phi';
  if (slot?.parameterKey === 'SuKpa') return 'suc';
  return null;
}

function layerScope(layers: StratificationSchemeRevisionV2['snapshot']['layers']) {
  return {
    layerIds: layers.map((layer) => layer.layerId),
    depthFromM: Math.min(...layers.map((layer) => layer.depthFromM)),
    depthToM: Math.max(...layers.map((layer) => layer.depthToM)),
    excludedIntervals: [],
  };
}

function literatureNkt12(now: string): NktSettingV1 {
  return {
    value: 12,
    origin: 'literature_starting_assumption',
    targetStrengthMode: 'triaxial_compression',
    eligibleMaterialClass: 'soft_firm_nc_loc_intact_clay',
    eligibleEnvironments: ['onshore', 'offshore'],
    sourceRefs: [
      { environment: 'offshore', sourceRef: 'mayne-cargill-greig-2023-rev1.1-p113' },
      { environment: 'offshore', sourceRef: 'mayne-peuchen-2018-table1-figure4-offshore-12.3' },
      { environment: 'onshore', sourceRef: 'mayne-peuchen-2018-table1-figure4-onshore-12.0' },
    ],
    assumptionRationale: '用户在 G2 工作台显式选择文献起始假设。',
    referenceTestIds: [],
    confirmedAt: now,
  };
}

function uniqueRevisionId(prefix: string, workspace: ParameterWorkspaceV2) {
  const nextVersion = (workspace.methodEvidenceRevisions ?? [])
    .filter((revision) => revision.evidenceId === prefix)
    .reduce((maximum, revision) => Math.max(maximum, revision.version), 0) + 1;
  return `${prefix}:rev:${nextVersion}`;
}

function currentEvidenceRevision(
  workspace: ParameterWorkspaceV2,
  evidenceId: string,
  kind: ParameterMethodEvidenceRevisionV1['kind'],
) {
  const revisionId = workspace.currentMethodEvidenceRefs?.[evidenceId];
  return workspace.methodEvidenceRevisions?.find((revision) => revision.revisionId === revisionId && revision.kind === kind) ?? null;
}

export type { ParameterSchemeRevisionV2 };
