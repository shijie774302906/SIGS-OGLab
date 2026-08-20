import { expect, test } from '@playwright/test';
import {
  applyStratificationCommand,
  createBaseStratificationScheme,
  emptyStratificationWorkspace,
  getActiveStratificationScheme,
  undoStratificationCommand,
} from '../../src/features/stratification/stratificationDomain';
import {
  analyzeThinLayers,
  thinLayerSchemeSignature,
  type ThinLayerEvidenceRow,
} from '../../src/features/stratification/thinLayerDomain';
import type { StratificationInputDependencyV2, StratificationWorkspaceV2 } from '../../src/features/workspace/workspaceV2';

const input: StratificationInputDependencyV2 = {
  pointId: 'thin-point', draftId: 'thin-draft', batchId: 'thin-batch', checkRunId: 'thin-check',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};

function buildScheme(boundaries: number[], groups: string[]) {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '薄层方案', '2026-07-14T00:00:00.000Z', 'thin-scheme');
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(created.problem);
  let workspace = created.workspace;
  boundaries.forEach((depthM) => {
    const result = applyStratificationCommand(workspace, { kind: 'add-boundary', depthM });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.problem);
    workspace = result.workspace;
  });
  getActiveStratificationScheme(workspace)!.layers.forEach((layer, index) => {
    const result = applyStratificationCommand(workspace, { kind: 'set-layer-soil-group', layerId: layer.layerId, engineeringSoilGroup: groups[index] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.problem);
    workspace = result.workspace;
  });
  return workspace;
}

function rows(profile: Array<{ from: number; to: number; qc: number; fs: number; u2?: number }>) {
  const result: ThinLayerEvidenceRow[] = [];
  for (let depthM = 0; depthM <= 10.0001; depthM += 0.05) {
    const item = profile.find((candidate) => depthM >= candidate.from && depthM <= candidate.to) ?? profile.at(-1)!;
    result.push({ depthM: Number(depthM.toFixed(3)), qcKpa: item.qc, fsKpa: item.fs, u2Kpa: item.u2 ?? null });
  }
  return result;
}

test('same-group thin layer with consistent qc/fs/u2 is safely preselected and applies as one undo item', () => {
  const workspace = buildScheme([4, 4.3], ['sand', 'sand', 'sand']);
  const scheme = getActiveStratificationScheme(workspace)!;
  const evidence = rows([{ from: 0, to: 10, qc: 12_000, fs: 120, u2: 20 }]);
  const analysis = analyzeThinLayers(scheme, evidence, 0.5);
  expect(analysis.candidates).toHaveLength(1);
  expect(analysis.candidates[0]).toMatchObject({ recommendation: 'safe-auto', defaultDecision: 'merge-surrounding', reasonCode: 'SAFE-SAME-GROUP' });

  const beforeUndo = workspace.editSession!.undoStack.length;
  const applied = applyStratificationCommand(workspace, {
    kind: 'apply-thin-layer-plan',
    thresholdM: analysis.thresholdM,
    sourceSignature: analysis.sourceSignature,
    decisions: analysis.candidates.map((candidate) => ({ candidateId: candidate.candidateId, layerId: candidate.layerId, decision: candidate.defaultDecision, reason: candidate.reason })),
  });
  expect(applied.ok).toBe(true);
  if (!applied.ok) return;
  expect(getActiveStratificationScheme(applied.workspace)?.layers).toHaveLength(1);
  expect(getActiveStratificationScheme(applied.workspace)?.thinLayerCleanupHistory?.at(-1)).toMatchObject({ thresholdM: 0.5, beforeLayerCount: 3, afterLayerCount: 1 });
  expect(applied.workspace.editSession!.undoStack).toHaveLength(beforeUndo + 1);
  const undone = undoStratificationCommand(applied.workspace);
  expect(undone.ok).toBe(true);
  if (!undone.ok) return;
  expect(getActiveStratificationScheme(undone.workspace)?.layers).toHaveLength(3);
});

test('different groups, conflicting curves, and edge layers remain manual', () => {
  const different = buildScheme([4, 4.3], ['sand', 'clay', 'sand']);
  expect(analyzeThinLayers(getActiveStratificationScheme(different)!, rows([{ from: 0, to: 10, qc: 10_000, fs: 100 }]), 0.5).candidates[0]).toMatchObject({ defaultDecision: 'preserve', reasonCode: 'DIFFERENT-GROUP' });

  const conflict = buildScheme([4, 4.3], ['sand', 'sand', 'sand']);
  const conflictEvidence = rows([
    { from: 0, to: 3.999, qc: 10_000, fs: 100, u2: 10 },
    { from: 4, to: 4.3, qc: 500, fs: 5, u2: 500 },
    { from: 4.301, to: 10, qc: 10_000, fs: 100, u2: 10 },
  ]);
  expect(analyzeThinLayers(getActiveStratificationScheme(conflict)!, conflictEvidence, 0.5).candidates[0]).toMatchObject({ defaultDecision: 'preserve', reasonCode: 'CHANNEL-CONFLICT' });

  const edge = buildScheme([0.3, 5], ['sand', 'sand', 'sand']);
  expect(analyzeThinLayers(getActiveStratificationScheme(edge)!, rows([{ from: 0, to: 10, qc: 10_000, fs: 100 }]), 0.5).candidates[0]).toMatchObject({ defaultDecision: 'preserve', reasonCode: 'EDGE-LAYER', allowedDecisions: ['preserve', 'merge-below'] });
});

test('opposite upper and lower trends cannot be hidden by a combined neighbor median', () => {
  const workspace = buildScheme([4.85, 5.15], ['sand', 'sand', 'sand']);
  const evidence = rows([
    { from: 0, to: 4.849, qc: 100, fs: 10, u2: 20 },
    { from: 4.85, to: 5.15, qc: 550, fs: 55, u2: 20 },
    { from: 5.151, to: 10, qc: 1_000, fs: 100, u2: 20 },
  ]);
  const candidate = analyzeThinLayers(getActiveStratificationScheme(workspace)!, evidence, 0.5).candidates[0];
  expect(candidate).toMatchObject({ recommendation: 'preserve', defaultDecision: 'preserve', reasonCode: 'CHANNEL-CONFLICT' });
  expect(candidate.channels.find((channel) => channel.key === 'qc')).toMatchObject({ upperMedian: 100, thinMedian: 550, lowerMedian: 1000, conflicting: true });
});

test('merge-below retains the selected lower neighbor identity and keeps provenance', () => {
  const workspace = buildScheme([0.4, 0.6], ['sand', 'clay', 'clay']);
  const scheme = getActiveStratificationScheme(workspace)!;
  const lowerNeighborId = scheme.layers[1].layerId;
  const analysis = analyzeThinLayers(scheme, rows([{ from: 0, to: 10, qc: 10_000, fs: 100, u2: 20 }]), 0.5);
  const edge = analysis.candidates.find((candidate) => candidate.layerId === scheme.layers[0].layerId)!;
  const applied = applyStratificationCommand(workspace, {
    kind: 'apply-thin-layer-plan', thresholdM: 0.5, sourceSignature: analysis.sourceSignature,
    decisions: [{ candidateId: edge.candidateId, layerId: edge.layerId, decision: 'merge-below', reason: edge.reason }],
  });
  expect(applied.ok).toBe(true);
  if (!applied.ok) return;
  const merged = getActiveStratificationScheme(applied.workspace)!.layers[0];
  expect(merged.layerId).toBe(lowerNeighborId);
  expect(merged).toMatchObject({ depthFromM: 0, depthToM: 0.6, engineeringSoilGroup: 'clay', reviewRequired: true, soilDecision: { finalGroup: 'clay', reviewStatus: 'pending' } });
  expect(merged.mergeSources?.map((source) => source.sourceLayerId)).toContain(edge.layerId);
});

test('insufficient or explicitly important evidence never receives an automatic merge', () => {
  const insufficient = buildScheme([4, 4.3], ['sand', 'sand', 'sand']);
  const sparseRows: ThinLayerEvidenceRow[] = [
    { depthM: 1, qcKpa: 10_000, fsKpa: 100 },
    { depthM: 4.1, qcKpa: 10_000, fsKpa: 100 },
    { depthM: 8, qcKpa: 10_000, fsKpa: 100 },
  ];
  expect(analyzeThinLayers(getActiveStratificationScheme(insufficient)!, sparseRows, 0.5).candidates[0]).toMatchObject({ defaultDecision: 'preserve', reasonCode: 'INSUFFICIENT-EVIDENCE' });

  const important = buildScheme([4, 4.3], ['sand', 'sand', 'sand']);
  getActiveStratificationScheme(important)!.layers[1].evidenceReviewRequired = true;
  expect(analyzeThinLayers(getActiveStratificationScheme(important)!, rows([{ from: 0, to: 10, qc: 10_000, fs: 100 }]), 0.5).candidates[0]).toMatchObject({ defaultDecision: 'preserve', reasonCode: 'IMPORTANT-EVIDENCE' });
});

test('missing u2 is not fabricated and invalid or stale plans are rejected', () => {
  const workspace = buildScheme([4, 4.3], ['clay', 'clay', 'clay']);
  const scheme = getActiveStratificationScheme(workspace)!;
  const analysis = analyzeThinLayers(scheme, rows([{ from: 0, to: 10, qc: 1_500, fs: 90 }]), 0.5);
  expect(analysis.candidates[0].channels.find((channel) => channel.key === 'u2')).toMatchObject({ valid: false, conflicting: false, thinMedian: null });
  expect(analysis.candidates[0].recommendation).toBe('safe-auto');
  expect(() => analyzeThinLayers(scheme, [], 0)).toThrow(/必须大于 0/);

  const staleSignature = thinLayerSchemeSignature(scheme);
  const moved = applyStratificationCommand(workspace, { kind: 'move-boundary', boundaryId: scheme.boundaries[0].boundaryId, depthM: 3.9 });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  const rejected = applyStratificationCommand(moved.workspace, {
    kind: 'apply-thin-layer-plan', thresholdM: 0.5, sourceSignature: staleSignature,
    decisions: analysis.candidates.map((candidate) => ({ candidateId: candidate.candidateId, layerId: candidate.layerId, decision: candidate.defaultDecision, reason: candidate.reason })),
  });
  expect(rejected).toMatchObject({ ok: false, problem: /已经变化/ });
});

test('overlapping safe ranges are downgraded and overlapping submitted decisions are rejected atomically', () => {
  const workspace = buildScheme([2, 2.2, 2.4, 6], ['sand', 'sand', 'sand', 'sand', 'sand']);
  const scheme = getActiveStratificationScheme(workspace)!;
  const analysis = analyzeThinLayers(scheme, rows([{ from: 0, to: 10, qc: 9_000, fs: 90, u2: 0 }]), 0.5);
  expect(analysis.candidates.filter((candidate) => candidate.recommendation === 'safe-auto')).toHaveLength(1);
  expect(analysis.candidates.some((candidate) => candidate.reasonCode === 'OVERLAPPING-SAFE-CANDIDATE')).toBe(true);
  const thin = analysis.candidates.slice(0, 2);
  const rejected = applyStratificationCommand(workspace, {
    kind: 'apply-thin-layer-plan', thresholdM: 0.5, sourceSignature: analysis.sourceSignature,
    decisions: thin.map((candidate) => ({ candidateId: candidate.candidateId, layerId: candidate.layerId, decision: 'merge-surrounding', reason: candidate.reason })),
  });
  expect(rejected).toMatchObject({ ok: false, problem: /同一个相邻层/ });
  expect(getActiveStratificationScheme(workspace)?.layers).toHaveLength(5);
});
