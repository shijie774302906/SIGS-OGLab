import type { SyntheticCptuRow } from '../../workflowData';
import {
  artifactDependenciesEqual,
  type ArtifactDependency,
  type DataExclusionRevisionV3,
  type DataGovernanceWorkspaceV3,
  type DataReviewDecisionV3,
  type DataSmoothingRunV3,
  type DataSmoothingSettingsV3,
  type DataValueOverrideFieldV3,
  type DataValueOverrideReasonV3,
  type DataValueOverrideRevisionV3,
} from '../workspace/workspaceV2';

export type GovernedInputRow = { sourceRowId: string; row: SyntheticCptuRow };

export type ExclusionCommand =
  | { kind: 'keep-row' | 'exclude-row' | 'delete-row'; sourceRowId: string; reason: string }
  | { kind: 'keep-rows' | 'exclude-rows' | 'delete-rows'; sourceRowIds: string[]; reason: string }
  | { kind: 'keep-range' | 'exclude-range'; depthFromM: number; depthToM: number; reason: string };

export type ValueOverrideCommand =
  | {
      kind: 'set-value';
      sourceRowId: string;
      field: DataValueOverrideFieldV3;
      effectiveValue: number;
      reasonCode: DataValueOverrideReasonV3;
      reason: string;
    }
  | { kind: 'restore-value'; sourceRowId: string; field: DataValueOverrideFieldV3 };

export type DataAdjustmentBatch = {
  deleteSourceRowIds: string[];
  keepSourceRowIds: string[];
  overrides: Array<Extract<ValueOverrideCommand, { kind: 'set-value' }>>;
  reason: string;
};

export type GovernanceResult<T> =
  | { ok: true; workspace: DataGovernanceWorkspaceV3; value: T }
  | { ok: false; problem: string };

export const SMOOTHING_PRESETS: Record<Exclude<DataSmoothingSettingsV3['preset'], 'custom'>, number> = {
  conservative: 0.25,
  standard: 0.5,
  strong: 1,
};

export function applyDataAdjustmentBatch(
  workspace: DataGovernanceWorkspaceV3,
  input: ArtifactDependency,
  rows: GovernedInputRow[],
  batch: DataAdjustmentBatch,
  now = new Date().toISOString(),
): GovernanceResult<{ deletedSourceRowIds: string[]; keptSourceRowIds: string[]; overrideCount: number }> {
  const deleted = [...new Set(batch.deleteSourceRowIds)];
  const kept = [...new Set(batch.keepSourceRowIds)];
  const deletedSet = new Set(deleted);
  const keptSet = new Set(kept);
  if (!deleted.length && !kept.length && !batch.overrides.length) return { ok: false, problem: '本次没有需要提交的数据调整。' };
  if (!batch.reason.trim()) return { ok: false, problem: '请填写本次数据调整的工程复核说明。' };
  if (deleted.some((sourceRowId) => keptSet.has(sourceRowId)) || batch.overrides.some((command) => deletedSet.has(command.sourceRowId))) {
    return { ok: false, problem: '同一个测点不能同时删除、保留或修改。' };
  }

  let next = workspace;
  for (let index = 0; index < batch.overrides.length; index += 1) {
    const revised = createValueOverrideRevision(next, input, rows, batch.overrides[index], now, createId(`adjustment-value-${index + 1}`));
    if (!revised.ok) return revised;
    next = revised.workspace;
  }
  const adjustedRows = applyValueOverrides(next, rows);
  if (kept.length) {
    const reviewed = createExclusionRevision(next, input, adjustedRows, { kind: 'keep-rows', sourceRowIds: kept, reason: batch.reason }, now, createId('adjustment-keep'));
    if (!reviewed.ok) return reviewed;
    next = reviewed.workspace;
  }
  if (deleted.length) {
    const removed = createExclusionRevision(next, input, adjustedRows, { kind: 'delete-rows', sourceRowIds: deleted, reason: batch.reason }, now, createId('adjustment-delete'));
    if (!removed.ok) return removed;
    next = removed.workspace;
  }
  return {
    ok: true,
    workspace: next,
    value: { deletedSourceRowIds: deleted, keptSourceRowIds: kept, overrideCount: batch.overrides.length },
  };
}

const VALUE_OVERRIDE_REASON_CODES = new Set<DataValueOverrideReasonV3>([
  'source-entry-error',
  'unit-conversion-error',
  'instrument-anomaly',
  'neighbor-supported-correction',
  'other-reviewed',
]);

export function createValueOverrideRevision(
  workspace: DataGovernanceWorkspaceV3,
  input: ArtifactDependency,
  rows: GovernedInputRow[],
  command: ValueOverrideCommand,
  now = new Date().toISOString(),
  revisionId = createId('value-override'),
): GovernanceResult<DataValueOverrideRevisionV3> {
  if (!rows.length) return { ok: false, problem: '当前导入修订没有可修改的测量行。' };
  const target = rows.find((candidate) => candidate.sourceRowId === command.sourceRowId);
  if (!target) return { ok: false, problem: '没有找到要修改的源数据行。' };
  const current = currentValueOverride(workspace);
  const baseOverrides = current && artifactDependenciesEqual(current.input, input)
    ? current.overrides.map((override) => ({ ...override }))
    : [];
  const nextOverrides = baseOverrides.filter((override) => !(override.sourceRowId === command.sourceRowId && override.field === command.field));

  if (command.kind === 'set-value') {
    if (!Number.isFinite(command.effectiveValue)) return { ok: false, problem: '请输入有限的数值。' };
    if (!VALUE_OVERRIDE_REASON_CODES.has(command.reasonCode) || !command.reason.trim()) {
      return { ok: false, problem: '请选择修改原因并补充说明。' };
    }
    const rawValue = target.row[command.field];
    const currentOverride = baseOverrides.find((override) => override.sourceRowId === command.sourceRowId && override.field === command.field);
    const currentEffectiveValue = currentOverride?.effectiveValue ?? rawValue;
    if (Number.isFinite(currentEffectiveValue) && command.effectiveValue === currentEffectiveValue) {
      return { ok: false, problem: '新的有效值与当前值相同，请输入实际调整后的数值。' };
    }
    nextOverrides.push({
      sourceRowId: command.sourceRowId,
      field: command.field,
      originalValue: Number.isFinite(rawValue) ? rawValue : null,
      effectiveValue: command.effectiveValue,
      reasonCode: command.reasonCode,
      reason: command.reason.trim(),
      createdAt: now,
    });
  }

  const candidateRows = applyValueOverrideList(rows, nextOverrides);
  const structureProblem = validateGovernedRows(candidateRows);
  if (structureProblem) return { ok: false, problem: structureProblem };

  const revisions = workspace.valueOverrideRevisions ?? [];
  const revision: DataValueOverrideRevisionV3 = {
    revisionId,
    version: Math.max(0, ...revisions.map((candidate) => candidate.version)) + 1,
    input: structuredClone(input),
    overrides: nextOverrides,
    createdAt: now,
  };
  return {
    ok: true,
    value: revision,
    workspace: {
      ...workspace,
      valueOverrideRevisions: [...revisions, revision],
      currentValueOverrideRevisionId: revision.revisionId,
      smoothingRuns: workspace.smoothingRuns.map((run) => run.status === 'completed'
        ? { ...run, status: 'stale' as const, staleReason: '人工数值修订已变化，需要重新运行平滑。' }
        : run),
      activeSmoothingRunId: null,
    },
  };
}

export function applyValueOverrides(workspace: DataGovernanceWorkspaceV3, rows: GovernedInputRow[]) {
  return applyValueOverrideList(rows, currentValueOverride(workspace)?.overrides ?? []);
}

function applyValueOverrideList(rows: GovernedInputRow[], overrides: DataValueOverrideRevisionV3['overrides']) {
  const overrideByCell = new Map(overrides.map((override) => [`${override.sourceRowId}:${override.field}`, override.effectiveValue]));
  return rows.map((item) => {
    const row = { ...item.row };
    (['depthM', 'qcKpa', 'fsKpa', 'u2Kpa'] as DataValueOverrideFieldV3[]).forEach((field) => {
      const value = overrideByCell.get(`${item.sourceRowId}:${field}`);
      if (value !== undefined) row[field] = value;
    });
    return {
      sourceRowId: item.sourceRowId,
      row: {
        ...row,
        qtKpa: Number.NaN,
        frPercent: Number.NaN,
      },
    };
  });
}

export function createExclusionRevision(
  workspace: DataGovernanceWorkspaceV3,
  input: ArtifactDependency,
  rows: GovernedInputRow[],
  command: ExclusionCommand,
  now = new Date().toISOString(),
  revisionId = createId('exclusion'),
): GovernanceResult<DataExclusionRevisionV3> {
  const structureProblem = validateGovernedRows(rows);
  if (structureProblem) return { ok: false, problem: structureProblem };

  const current = currentExclusion(workspace);
  const currentMatchesInput = current ? artifactDependenciesEqual(current.input, input) : false;
  const baseDecisions = currentMatchesInput ? current!.decisions : [];
  const baseExcluded = new Set(currentMatchesInput ? current!.excludedSourceRowIds : []);
  const permanentlyDeleted = new Set(currentMatchesInput ? current!.permanentlyDeletedSourceRowIds ?? [] : []);

  let targets: GovernedInputRow[];
  let scope: DataReviewDecisionV3['scope'];
  if ('sourceRowIds' in command) {
    const targetIds = new Set(command.sourceRowIds);
    targets = rows.filter((candidate) => targetIds.has(candidate.sourceRowId));
    scope = 'row';
  } else if ('sourceRowId' in command) {
    targets = rows.filter((candidate) => candidate.sourceRowId === command.sourceRowId);
    scope = 'row';
  } else {
    const depthFromM = Math.min(command.depthFromM, command.depthToM);
    const depthToM = Math.max(command.depthFromM, command.depthToM);
    targets = rows.filter((candidate) => candidate.row.depthM >= depthFromM && candidate.row.depthM <= depthToM);
    scope = 'depth-range';
  }

  if (!targets.length) return { ok: false, problem: '没有找到落在当前导入修订中的源行。' };
  if (!command.reason.trim()) return { ok: false, problem: '请填写保留或排除原因。' };

  const deletePermanently = command.kind.startsWith('delete');
  const exclude = command.kind.startsWith('exclude') || deletePermanently;
  if (!exclude && targets.some((target) => permanentlyDeleted.has(target.sourceRowId))) {
    return { ok: false, problem: '已永久删除的测点不能恢复；如需恢复，请重新导入原文件。' };
  }
  targets.forEach((target) => {
    if (exclude) {
      baseExcluded.add(target.sourceRowId);
      if (deletePermanently) permanentlyDeleted.add(target.sourceRowId);
    }
    else baseExcluded.delete(target.sourceRowId);
  });
  if (baseExcluded.size >= rows.length) return { ok: false, problem: '不能排除当前点位的全部有效测量行。' };

  const decision: DataReviewDecisionV3 = {
    decisionId: createId('review'),
    kind: deletePermanently ? 'delete' : exclude ? 'exclude' : 'keep',
    scope,
    sourceRowIds: targets.map((target) => target.sourceRowId),
    depthFromM: Math.min(...targets.map((target) => target.row.depthM)),
    depthToM: Math.max(...targets.map((target) => target.row.depthM)),
    reason: command.reason.trim(),
    createdAt: now,
  };
  const revision: DataExclusionRevisionV3 = {
    revisionId,
    version: Math.max(0, ...workspace.exclusionRevisions.map((candidate) => candidate.version)) + 1,
    input: structuredClone(input),
    decisions: [...baseDecisions.map((item) => structuredClone(item)), decision],
    excludedSourceRowIds: rows.map((row) => row.sourceRowId).filter((sourceRowId) => baseExcluded.has(sourceRowId)),
    permanentlyDeletedSourceRowIds: rows.map((row) => row.sourceRowId).filter((sourceRowId) => permanentlyDeleted.has(sourceRowId)),
    createdAt: now,
  };
  return {
    ok: true,
    value: revision,
    workspace: {
      ...workspace,
      exclusionRevisions: [...workspace.exclusionRevisions, revision],
      currentExclusionRevisionId: revision.revisionId,
      smoothingRuns: workspace.smoothingRuns.map((run) => run.status === 'completed'
        ? { ...run, status: 'stale' as const, staleReason: '排除修订已变化，需要重新运行平滑。' }
        : run),
      activeSmoothingRunId: null,
    },
  };
}

export function restoreExclusionRevision(
  workspace: DataGovernanceWorkspaceV3,
  input: ArtifactDependency,
  targetRevisionId: string | null,
  now = new Date().toISOString(),
  revisionId = createId('exclusion'),
): GovernanceResult<DataExclusionRevisionV3> {
  const target = targetRevisionId
    ? workspace.exclusionRevisions.find((revision) => revision.revisionId === targetRevisionId)
    : null;
  if (targetRevisionId && !target) return { ok: false, problem: '没有找到要恢复的排除修订。' };
  if (target && !artifactDependenciesEqual(target.input, input)) {
    return { ok: false, problem: '目标排除修订属于其他导入依据，不能恢复。' };
  }
  const current = currentExclusion(workspace);
  const permanentlyDeleted = new Set(current?.permanentlyDeletedSourceRowIds ?? []);
  const targetExcluded = new Set(target?.excludedSourceRowIds ?? []);
  permanentlyDeleted.forEach((sourceRowId) => targetExcluded.add(sourceRowId));
  const targetDecisions = target?.decisions.map((decision) => structuredClone(decision)) ?? [];
  const permanentDecisions = (current?.decisions ?? []).filter((decision) => decision.kind === 'delete' && decision.sourceRowIds.some((sourceRowId) => permanentlyDeleted.has(sourceRowId)));
  const decisionIds = new Set(targetDecisions.map((decision) => decision.decisionId));
  const revision: DataExclusionRevisionV3 = {
    revisionId,
    version: Math.max(0, ...workspace.exclusionRevisions.map((candidate) => candidate.version)) + 1,
    input: structuredClone(input),
    decisions: [...targetDecisions, ...permanentDecisions.filter((decision) => !decisionIds.has(decision.decisionId)).map((decision) => structuredClone(decision))],
    excludedSourceRowIds: [...targetExcluded],
    permanentlyDeletedSourceRowIds: [...permanentlyDeleted],
    createdAt: now,
  };
  return {
    ok: true,
    value: revision,
    workspace: {
      ...workspace,
      exclusionRevisions: [...workspace.exclusionRevisions, revision],
      currentExclusionRevisionId: revision.revisionId,
      smoothingRuns: workspace.smoothingRuns.map((run) => run.status === 'completed'
        ? { ...run, status: 'stale' as const, staleReason: '排除修订已恢复，需要重新运行平滑。' }
        : run),
      activeSmoothingRunId: null,
    },
  };
}

export function runDepthWindowSmoothing(
  workspace: DataGovernanceWorkspaceV3,
  input: ArtifactDependency,
  rows: GovernedInputRow[],
  settings: DataSmoothingSettingsV3,
  now = new Date().toISOString(),
  runId = createId('smoothing'),
): GovernanceResult<DataSmoothingRunV3> {
  const problem = validateGovernedRows(rows);
  if (problem) return { ok: false, problem };
  if (!Number.isFinite(settings.depthWindowM) || settings.depthWindowM <= 0 || settings.depthWindowM > 10) {
    return { ok: false, problem: '平滑深度窗口必须大于 0 m 且不超过 10 m。' };
  }
  const exclusion = currentExclusion(workspace);
  if (exclusion && !artifactDependenciesEqual(exclusion.input, input)) {
    return { ok: false, problem: '当前排除修订已经失效，请先返回数据检查。' };
  }
  const excluded = new Set(exclusion?.excludedSourceRowIds ?? []);
  const included = rows.filter((row) => !excluded.has(row.sourceRowId));
  if (!included.length) return { ok: false, problem: '排除后没有可用于平滑的测量行。' };

  const output = splitAtLongGaps(included).flatMap((segment) => segment.map((candidate) => {
    const neighbors = segment.filter((other) => Math.abs(other.row.depthM - candidate.row.depthM) <= settings.depthWindowM / 2);
    const qcMedian = median(neighbors.map((row) => row.row.qcKpa));
    const fsMedian = median(neighbors.map((row) => row.row.fsKpa));
    const u2Values = neighbors.map((row) => row.row.u2Kpa).filter((value) => Number.isFinite(value));
    const u2Median = u2Values.length ? median(u2Values) : null;
    const qcMad = median(neighbors.map((row) => Math.abs(row.row.qcKpa - qcMedian)));
    const fsMad = median(neighbors.map((row) => Math.abs(row.row.fsKpa - fsMedian)));
    const anomaly = neighbors.length >= 3 && (
      Math.abs(candidate.row.qcKpa - qcMedian) > Math.max(100, qcMad * 6)
      || Math.abs(candidate.row.fsKpa - fsMedian) > Math.max(5, fsMad * 6)
    );
    return {
      sourceRowId: candidate.sourceRowId,
      depthM: candidate.row.depthM,
      rawQcKpa: candidate.row.qcKpa,
      smoothedQcKpa: qcMedian,
      rawFsKpa: candidate.row.fsKpa,
      smoothedFsKpa: fsMedian,
      rawU2Kpa: Number.isFinite(candidate.row.u2Kpa) ? candidate.row.u2Kpa : null,
      smoothedU2Kpa: u2Median,
      anomaly,
    };
  }));
  const run: DataSmoothingRunV3 = {
    runId,
    input: structuredClone(input),
    valueOverrideRevisionId: currentValueOverride(workspace)?.revisionId ?? null,
    exclusionRevisionId: exclusion?.revisionId ?? null,
    settings: { ...settings },
    status: 'completed',
    rows: output,
    excludedSourceRowIds: [...excluded],
    createdAt: now,
  };
  return {
    ok: true,
    value: run,
    workspace: { ...workspace, smoothingRuns: [...workspace.smoothingRuns, run], activeSmoothingRunId: run.runId },
  };
}

export function setDataViewMode(workspace: DataGovernanceWorkspaceV3, viewMode: DataGovernanceWorkspaceV3['viewMode']) {
  return { ...workspace, viewMode };
}

export function invalidateDataGovernance(workspace: DataGovernanceWorkspaceV3, reason: string) {
  return {
    ...workspace,
    currentValueOverrideRevisionId: null,
    currentExclusionRevisionId: null,
    activeSmoothingRunId: null,
    smoothingRuns: workspace.smoothingRuns.map((run) => run.status === 'completed'
      ? { ...run, status: 'stale' as const, staleReason: reason }
      : run),
  };
}

export function currentExclusion(workspace: DataGovernanceWorkspaceV3) {
  return workspace.exclusionRevisions.find((revision) => revision.revisionId === workspace.currentExclusionRevisionId) ?? null;
}

export function currentValueOverride(workspace: DataGovernanceWorkspaceV3) {
  return (workspace.valueOverrideRevisions ?? []).find((revision) => revision.revisionId === workspace.currentValueOverrideRevisionId) ?? null;
}

export function activeSmoothing(workspace: DataGovernanceWorkspaceV3) {
  return workspace.smoothingRuns.find((run) => run.runId === workspace.activeSmoothingRunId && run.status === 'completed') ?? null;
}

export function validateGovernedRows(rows: GovernedInputRow[]) {
  if (!rows.length) return '当前导入修订没有可治理的测量行。';
  if (new Set(rows.map((row) => row.sourceRowId)).size !== rows.length) {
    return '源行引用重复，不能创建治理修订。';
  }
  if (rows.some((row, index) => (
    !row.sourceRowId
    || !Number.isFinite(row.row.depthM)
    || (index > 0 && row.row.depthM <= rows[index - 1].row.depthM)
  ))) {
    return '深度必须有限且严格递增，修复结构问题后才能平滑。';
  }
  return null;
}

function splitAtLongGaps(rows: GovernedInputRow[]) {
  const steps = rows.slice(1)
    .map((row, index) => row.row.depthM - rows[index].row.depthM)
    .filter((step) => step > 0);
  const threshold = Math.max(0.1, (steps.length ? median(steps) : 0) * 5);
  const segments: GovernedInputRow[][] = [];
  rows.forEach((row, index) => {
    if (!index || row.row.depthM - rows[index - 1].row.depthM > threshold) segments.push([]);
    segments.at(-1)!.push(row);
  });
  return segments;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}
