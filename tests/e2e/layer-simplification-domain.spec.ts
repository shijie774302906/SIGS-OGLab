import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  applyStratificationCommand,
  createBaseStratificationScheme,
  emptyStratificationWorkspace,
  getActiveStratificationScheme,
  getStratificationIssues,
  undoStratificationCommand,
} from '../../src/features/stratification/stratificationDomain';
import { analyzeMajorGroupMerge, normalizeMajorGroupReviewReasons, reviewReasonsForLayer, type MajorGroupMergeAnalysis } from '../../src/features/stratification/layerSimplificationDomain';
import type { ThinLayerEvidenceRow } from '../../src/features/stratification/thinLayerDomain';
import type { StratificationInputDependencyV2, StratificationSchemeV2 } from '../../src/features/workspace/workspaceV2';

const input: StratificationInputDependencyV2 = {
  pointId: 'simplify-point', draftId: 'simplify-draft', batchId: 'simplify-batch', checkRunId: 'simplify-check',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};

type Soil = { group: 'sand' | 'mixed' | 'clay' | 'unclassified'; detailed?: string };

function buildScheme(boundaries: number[], soils: Soil[]) {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '大类合并方案', '2026-07-15T00:00:00.000Z', 'simplify-scheme');
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(created.problem);
  let workspace = created.workspace;
  for (const depthM of boundaries) {
    const result = applyStratificationCommand(workspace, { kind: 'add-boundary', depthM });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.problem);
    workspace = result.workspace;
  }
  for (const [index, layer] of getActiveStratificationScheme(workspace)!.layers.entries()) {
    const soil = soils[index];
    const result = soil.detailed
      ? applyStratificationCommand(workspace, { kind: 'set-layer-soil-classification', layerId: layer.layerId, engineeringSoilGroup: soil.group, detailedSoilType: soil.detailed })
      : applyStratificationCommand(workspace, { kind: 'set-layer-soil-group', layerId: layer.layerId, engineeringSoilGroup: soil.group });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.problem);
    workspace = result.workspace;
  }
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

function command(analysis: MajorGroupMergeAnalysis) {
  return {
    kind: 'apply-major-group-merge-plan' as const,
    sourceSignature: analysis.sourceSignature,
    planSignature: analysis.planSignature,
  };
}

test('all adjacent sand layers merge into one group layer with ordered detailed composition', () => {
  const workspace = buildScheme([2, 4, 6, 8], [
    { group: 'sand', detailed: '粉砂' },
    { group: 'sand', detailed: '细砂' },
    { group: 'sand', detailed: '细砂' },
    { group: 'sand', detailed: '中砂' },
    { group: 'sand', detailed: '粗砂' },
  ]);
  const evidence = rows([{ from: 0, to: 10, qc: 10_000, fs: 100, u2: 20 }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, evidence);
  expect(analysis).toMatchObject({ method: 'major-soil-group', currentLayerCount: 5, plannedLayerCount: 1, mergedBoundaryCount: 4 });
  expect(analysis.resultLayers[0]).toMatchObject({
    engineeringSoilGroup: 'sand',
    detailedSoilTypes: ['粉砂', '细砂', '中砂', '粗砂'],
    displayLabel: '砂性土（组成：粉砂、细砂、中砂、粗砂）',
  });
  expect(analysis.steps).toHaveLength(4);
});

test('sand, mixed and clay remain separate while adjacent layers inside each group merge', () => {
  const workspace = buildScheme([2, 4, 6, 8], [
    { group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' },
    { group: 'mixed', detailed: '粉土' }, { group: 'mixed', detailed: '砂质粉土' },
    { group: 'clay', detailed: '黏土' },
  ]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([{ from: 0, to: 10, qc: 500, fs: 50, u2: 10 }]));
  expect(analysis.plannedLayerCount).toBe(3);
  expect(analysis.resultLayers.map((layer) => layer.displayLabel)).toEqual([
    '砂性土（组成：粉砂、细砂）', '混合土（组成：粉土、砂质粉土）', '黏性土（组成：黏土）',
  ]);
  expect(analysis.protectedBoundaries.map((item) => item.reasonCode)).toEqual(['DIFFERENT-GROUP', 'DIFFERENT-GROUP']);

  const evidence = rows([{ from: 0, to: 10, qc: 500, fs: 50, u2: 10 }]);
  const applied = applyStratificationCommand(workspace, command(analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, evidence)), undefined, evidence);
  expect(applied.ok).toBe(true);
  if (!applied.ok) return;
  expect(applied.scheme.layers.map((layer) => ({
    group: layer.engineeringSoilGroup,
    decisionGroup: layer.soilDecision?.finalGroup,
    compositionGroup: layer.majorGroupComposition?.engineeringSoilGroup,
  }))).toEqual([
    { group: 'sand', decisionGroup: 'sand', compositionGroup: 'sand' },
    { group: 'mixed', decisionGroup: 'mixed', compositionGroup: 'mixed' },
    { group: 'clay', decisionGroup: 'clay', compositionGroup: 'clay' },
  ]);

  const clayLayer = applied.scheme.layers.find((layer) => layer.engineeringSoilGroup === 'clay');
  expect(clayLayer).toBeTruthy();
  const reclassified = applyStratificationCommand(applied.workspace, {
    kind: 'set-layer-soil-classification',
    layerId: clayLayer!.layerId,
    engineeringSoilGroup: 'mixed',
    detailedSoilType: '粉土',
  });
  expect(reclassified.ok).toBe(true);
  if (!reclassified.ok) return;
  const changedLayer = reclassified.scheme.layers.find((layer) => layer.layerId === clayLayer!.layerId)!;
  expect(changedLayer).toMatchObject({
    name: '粉土',
    engineeringSoilGroup: 'mixed',
    majorGroupComposition: undefined,
    soilDecision: { finalGroup: 'mixed', finalDetailedType: '粉土' },
  });
});

test('large qc fs and u2 differences are audited but never block a same-group merge', () => {
  const workspace = buildScheme([5], [{ group: 'clay', detailed: '黏土' }, { group: 'clay', detailed: '淤泥质土' }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([
    { from: 0, to: 4.999, qc: 100, fs: 10, u2: 10 },
    { from: 5, to: 10, qc: 1_000, fs: 100, u2: 200 },
  ]));
  expect(analysis).toMatchObject({ plannedLayerCount: 1, mergedBoundaryCount: 1 });
  expect(analysis.steps[0].channels).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'qc', conflicting: true }),
    expect.objectContaining({ key: 'fs', conflicting: true }),
    expect.objectContaining({ key: 'u2', conflicting: true }),
  ]));
  expect(analysis.steps[0].reason).toContain('仅作为规则差异提示，不改变合并结果');
  expect(analysis.resultLayers[0]).toMatchObject({ requiresReview: true, conflictBoundaryCount: 1, conflictingChannels: ['qc', 'fs', 'u2'] });
  expect(analysis.resultLayers[0].reviewReasons).toEqual([{
    kind: 'curve-difference',
    boundaryId: analysis.steps[0].boundaryId,
    boundaryDepthM: 5,
    channels: ['qc', 'fs', 'u2'],
  }]);
});

test('curve conflicts remain review-required after the merge is applied', () => {
  const workspace = buildScheme([5], [{ group: 'clay', detailed: '黏土' }, { group: 'clay', detailed: '淤泥质土' }]);
  const evidence = rows([
    { from: 0, to: 4.999, qc: 100, fs: 10, u2: 10 },
    { from: 5, to: 10, qc: 1_000, fs: 100, u2: 200 },
  ]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, evidence);
  const applied = applyStratificationCommand(workspace, command(analysis), undefined, evidence);
  expect(applied.ok).toBe(true);
  if (!applied.ok) return;
  expect(applied.scheme.layers[0]).toMatchObject({
    reviewRequired: true,
    evidenceReviewRequired: true,
    majorGroupComposition: { reviewReasons: [{ kind: 'curve-difference', boundaryDepthM: 5, channels: ['qc', 'fs', 'u2'] }] },
    soilDecision: { reviewStatus: 'needs-review' },
  });
  expect(applied.scheme.layers[0].majorGroupComposition).not.toHaveProperty('requiresReview');
  expect(applied.scheme.layers[0].majorGroupComposition).not.toHaveProperty('conflictBoundaryCount');
});

test('an overridden JTS detailed suggestion cannot leak into a different final major group', () => {
  const workspace = buildScheme([5], [{ group: 'clay' }, { group: 'clay', detailed: '黏土' }]);
  const first = getActiveStratificationScheme(workspace)!.layers[0];
  first.soilDecision = {
    ...(first.soilDecision!),
    suggestedGroup: 'sand',
    suggestedDetailedType: '粉砂～细砂',
    finalGroup: 'clay',
    finalDetailedType: null,
    source: 'engineer-overrode-jts',
  };
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([{ from: 0, to: 10, qc: 500, fs: 50 }]));
  expect(analysis.resultLayers[0]).toMatchObject({
    engineeringSoilGroup: 'clay',
    detailedSoilTypes: ['黏土'],
    displayLabel: '黏性土（组成：黏土）',
  });
});

test('an engineer-locked boundary splits an otherwise continuous major group', () => {
  let workspace = buildScheme([3, 6], [
    { group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }, { group: 'sand', detailed: '中砂' },
  ]);
  const boundaryId = getActiveStratificationScheme(workspace)!.boundaries[0].boundaryId;
  const locked = applyStratificationCommand(workspace, { kind: 'set-boundary-major-group-lock', boundaryId, locked: true });
  expect(locked.ok).toBe(true);
  if (!locked.ok) return;
  workspace = locked.workspace;
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([{ from: 0, to: 10, qc: 500, fs: 50 }]));
  expect(analysis.plannedLayerCount).toBe(2);
  expect(analysis.protectedBoundaries).toContainEqual(expect.objectContaining({ boundaryId, reasonCode: 'BOUNDARY-LOCKED' }));
  expect(analysis.resultLayers.map((layer) => layer.displayLabel)).toEqual(['砂性土（组成：粉砂）', '砂性土（组成：细砂、中砂）']);
});

test('an unclassified layer is never absorbed into a classified neighbor', () => {
  const workspace = buildScheme([5], [{ group: 'sand', detailed: '粉砂' }, { group: 'unclassified' }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([{ from: 0, to: 10, qc: 500, fs: 50 }]));
  expect(analysis).toMatchObject({ plannedLayerCount: 2, mergedBoundaryCount: 0 });
  expect(analysis.protectedBoundaries[0].reasonCode).toBe('UNCLASSIFIED');
});

test('missing u2 remains unavailable while qc and fs audit evidence stays valid', () => {
  const workspace = buildScheme([5], [{ group: 'clay', detailed: '黏土' }, { group: 'clay', detailed: '淤泥' }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, rows([{ from: 0, to: 10, qc: 500, fs: 50 }]));
  expect(analysis.plannedLayerCount).toBe(1);
  expect(analysis.steps[0].channels.find((channel) => channel.key === 'u2')).toMatchObject({ valid: false, relativeDistance: null, conflicting: false });
});

test('a boundary measurement belongs only to the lower layer in the channel audit', () => {
  const workspace = buildScheme([5], [{ group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, [
    { depthM: 3, qcKpa: 100, fsKpa: 10, u2Kpa: 10 },
    { depthM: 4, qcKpa: 100, fsKpa: 10, u2Kpa: 10 },
    { depthM: 5, qcKpa: 1_000, fsKpa: 100, u2Kpa: 100 },
    { depthM: 6, qcKpa: 1_000, fsKpa: 100, u2Kpa: 100 },
  ]);
  expect(analysis.steps[0].channels.find((channel) => channel.key === 'qc')).toMatchObject({ upperMedian: 100, lowerMedian: 1_000, conflicting: true });
});

test('one apply stores composition without inventing a formal detailed type and is fully undoable', () => {
  const workspace = buildScheme([3, 6], [
    { group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }, { group: 'sand', detailed: '中砂' },
  ]);
  const evidence = rows([{ from: 0, to: 10, qc: 500, fs: 50, u2: 10 }]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, evidence);
  const undoCount = workspace.editSession!.undoStack.length;
  const applied = applyStratificationCommand(workspace, command(analysis), '2026-07-15T00:01:00.000Z', evidence);
  expect(applied.ok).toBe(true);
  if (!applied.ok) return;
  expect(applied.scheme.layers).toHaveLength(1);
  expect(applied.scheme.layers[0]).toMatchObject({
    name: '砂性土（组成：粉砂、细砂、中砂）', engineeringSoilGroup: 'sand', reviewRequired: false,
    majorGroupComposition: { engineeringSoilGroup: 'sand', detailedSoilTypes: ['粉砂', '细砂', '中砂'] },
  });
  expect(applied.scheme.layers[0].soilDecision).toMatchObject({ finalGroup: 'sand', finalDetailedType: null, suggestedDetailedType: null, reviewStatus: 'accepted' });
  expect(applied.scheme.layerSimplificationHistory?.at(-1)).toMatchObject({ method: 'major-soil-group', beforeLayerCount: 3, afterLayerCount: 1 });
  expect(applied.workspace.editSession!.undoStack).toHaveLength(undoCount + 1);
  const undone = undoStratificationCommand(applied.workspace);
  expect(undone.ok).toBe(true);
  if (undone.ok) expect(getActiveStratificationScheme(undone.workspace)?.layers).toHaveLength(3);
});

test('the domain recomputes current curve evidence and rejects an old preview signature', () => {
  const workspace = buildScheme([5], [{ group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }]);
  const evidence = rows([{ from: 0, to: 10, qc: 100, fs: 10, u2: 10 }]);
  const changedEvidence = rows([
    { from: 0, to: 4.999, qc: 100, fs: 10, u2: 10 },
    { from: 5, to: 10, qc: 1_000, fs: 100, u2: 100 },
  ]);
  const analysis = analyzeMajorGroupMerge(getActiveStratificationScheme(workspace)!, evidence);
  const rejected = applyStratificationCommand(workspace, command(analysis), undefined, changedEvidence);
  expect(rejected).toMatchObject({ ok: false, problem: /曲线证据已经变化/ });
  expect(getActiveStratificationScheme(workspace)?.layers).toHaveLength(2);
});

test('a scheme change makes the preview stale without a partial merge', () => {
  const workspace = buildScheme([3, 6], [
    { group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }, { group: 'sand', detailed: '中砂' },
  ]);
  const evidence = rows([{ from: 0, to: 10, qc: 500, fs: 50 }]);
  const scheme = getActiveStratificationScheme(workspace)!;
  const analysis = analyzeMajorGroupMerge(scheme, evidence);
  const changed = applyStratificationCommand(workspace, { kind: 'set-boundary-major-group-lock', boundaryId: scheme.boundaries[0].boundaryId, locked: true });
  expect(changed.ok).toBe(true);
  if (!changed.ok) return;
  const rejected = applyStratificationCommand(changed.workspace, command(analysis), undefined, evidence);
  expect(rejected).toMatchObject({ ok: false, problem: /已经变化/ });
  expect(getActiveStratificationScheme(changed.workspace)?.layers).toHaveLength(3);
});

test('source soil, source evidence and curve differences remain separate and normalized', () => {
  const workspace = buildScheme([3, 6], [
    { group: 'sand', detailed: '粉砂' }, { group: 'sand', detailed: '细砂' }, { group: 'sand', detailed: '中砂' },
  ]);
  const scheme = getActiveStratificationScheme(workspace)!;
  scheme.layers[0].soilConfirmationRequired = true;
  scheme.layers[0].reviewRequired = true;
  scheme.layers[1].evidenceReviewRequired = true;
  scheme.layers[1].reviewRequired = true;
  const evidence = rows([
    { from: 0, to: 2.999, qc: 100, fs: 10, u2: 10 },
    { from: 3, to: 5.999, qc: 1_000, fs: 100, u2: 200 },
    { from: 6, to: 10, qc: 100, fs: 10, u2: 10 },
  ]);
  const analysis = analyzeMajorGroupMerge(scheme, evidence);
  expect(analysis.resultLayers[0].reviewReasons.map((reason) => reason.kind)).toEqual([
    'source-soil-confirmation', 'source-evidence', 'curve-difference',
  ]);
  expect(analysis.resultLayers[0].reviewReasons.filter((reason) => reason.kind === 'curve-difference')).toEqual([
    expect.objectContaining({ channels: ['qc', 'fs', 'u2'] }),
  ]);
});

test('new empty reasons are authoritative while legacy review summaries stay safely gated', () => {
  const workspace = buildScheme([5], [{ group: 'sand', detailed: '粉砂' }, { group: 'mixed', detailed: '粉土' }]);
  const scheme = getActiveStratificationScheme(workspace)!;
  const layer = scheme.layers[0];
  layer.majorGroupComposition = {
    engineeringSoilGroup: 'sand', detailedSoilTypes: ['粉砂'], sourceLayerIds: [layer.layerId], reviewReasons: [],
    requiresReview: true, sourceReviewRequired: true, conflictBoundaryCount: 2, conflictingChannels: ['qc'],
  };
  layer.reviewRequired = true;
  layer.soilConfirmationRequired = true;
  layer.evidenceReviewRequired = true;
  layer.soilDecision!.reviewStatus = 'accepted';
  expect(reviewReasonsForLayer(layer)).toEqual([]);
  expect(getStratificationIssues(scheme).filter((issue) => issue.layerId === layer.layerId && issue.severity === 'problem')).toEqual([]);

  delete layer.majorGroupComposition.reviewReasons;
  layer.reviewRequired = true;
  layer.soilConfirmationRequired = true;
  layer.evidenceReviewRequired = true;
  expect(reviewReasonsForLayer(layer)).toEqual([{ kind: 'legacy-untyped', sourceLayerIds: [layer.layerId] }]);
  expect(getStratificationIssues(scheme)).toContainEqual(expect.objectContaining({
    issueId: `str-major-group-review-${layer.layerId}`, severity: 'problem', title: '历史复核原因未分型',
  }));

  delete layer.majorGroupComposition;
  expect(reviewReasonsForLayer(layer).map((reason) => reason.kind)).toEqual([
    'source-soil-confirmation', 'source-evidence',
  ]);
});

test('review reason normalization is stable, deduplicated and signature-safe', () => {
  expect(normalizeMajorGroupReviewReasons([
    { kind: 'curve-difference', boundaryId: 'b2', boundaryDepthM: 3.00000004, channels: ['u2', 'qc'] },
    { kind: 'source-evidence', sourceLayerIds: ['l2', 'l1'] },
    { kind: 'curve-difference', boundaryId: 'b2', boundaryDepthM: 3, channels: ['fs', 'qc'] },
    { kind: 'source-evidence', sourceLayerIds: ['l1'] },
    { kind: 'source-soil-confirmation', sourceLayerIds: ['l3'] },
  ])).toEqual([
    { kind: 'source-soil-confirmation', sourceLayerIds: ['l3'] },
    { kind: 'source-evidence', sourceLayerIds: ['l1', 'l2'] },
    { kind: 'curve-difference', boundaryId: 'b2', boundaryDepthM: 3, channels: ['qc', 'fs', 'u2'] },
  ]);
});

function deterministicLargeScheme(layerCount: number) {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, layerCount, `压力方案-${layerCount}`, '2026-07-15T00:00:00.000Z', `stress-${layerCount}`);
  if (!created.ok) throw new Error(created.problem);
  const scheme = structuredClone(getActiveStratificationScheme(created.workspace)!) as StratificationSchemeV2;
  const baseLayer = scheme.layers[0];
  const groups = ['sand', 'mixed', 'clay'] as const;
  scheme.layers = Array.from({ length: layerCount }, (_, index) => {
    const group = groups[Math.floor(index / 4) % groups.length];
    const sourceSoil = index > 0 && index % 41 === 0;
    const sourceEvidence = index > 0 && index % 67 === 0;
    return {
      ...structuredClone(baseLayer),
      layerId: `stress-layer-${String(index).padStart(4, '0')}`,
      name: `压力层 ${index + 1}`,
      depthFromM: index,
      depthToM: index + 1,
      engineeringSoilGroup: group,
      reviewRequired: sourceSoil || sourceEvidence,
      soilConfirmationRequired: sourceSoil,
      evidenceReviewRequired: sourceEvidence,
      majorGroupComposition: undefined,
      mergeSources: undefined,
      soilDecision: {
        suggestedGroup: group,
        finalGroup: group,
        suggestedDetailedType: group === 'sand' ? '细砂' : group === 'mixed' ? '粉土' : '黏土',
        finalDetailedType: group === 'sand' ? '细砂' : group === 'mixed' ? '粉土' : '黏土',
        reviewStatus: sourceSoil || sourceEvidence ? 'needs-review' : 'accepted',
        reviewAction: sourceSoil || sourceEvidence ? 'marked-for-review' : 'accepted',
        source: 'manual',
        decidedAt: '2026-07-15T00:00:00.000Z',
      },
    };
  });
  scheme.boundaries = Array.from({ length: layerCount - 1 }, (_, index) => ({
    boundaryId: `stress-boundary-${String(index + 1).padStart(4, '0')}`,
    depthM: index + 1,
    upperLayerId: scheme.layers[index].layerId,
    lowerLayerId: scheme.layers[index + 1].layerId,
    reviewRequired: false,
    note: '',
  }));
  const evidenceRows: ThinLayerEvidenceRow[] = scheme.layers.flatMap((layer, index) => {
    const groupOffset = (Math.floor(index / 4) % groups.length + 1) * 100;
    return [0.25, 0.75].map((offset) => ({
      depthM: layer.depthFromM + offset,
      qcKpa: groupOffset + (index % 4) * 5,
      fsKpa: groupOffset / 10 + (index % 4),
      u2Kpa: groupOffset / 5 + (index % 4),
    }));
  });
  return { scheme, evidenceRows };
}

test('200 and 500 layer analysis is deterministic and stays inside the recorded budget', () => {
  const receipts = [200, 500].map((layerCount) => {
    const fixture = deterministicLargeScheme(layerCount);
    const startedAt = performance.now();
    const first = analyzeMajorGroupMerge(fixture.scheme, fixture.evidenceRows);
    const firstElapsedMs = performance.now() - startedAt;
    const repeatedAt = performance.now();
    const second = analyzeMajorGroupMerge(fixture.scheme, fixture.evidenceRows);
    const secondElapsedMs = performance.now() - repeatedAt;
    expect(second.planSignature).toBe(first.planSignature);
    expect(second.resultLayers).toEqual(first.resultLayers);
    return {
      layerCount,
      plannedLayerCount: first.plannedLayerCount,
      reviewReasonCount: first.resultLayers.reduce((total, layer) => total + layer.reviewReasons.length, 0),
      planSignatureLength: first.planSignature.length,
      planSignatureSha256: createHash('sha256').update(first.planSignature).digest('hex'),
      elapsedMs: Number(firstElapsedMs.toFixed(2)),
      repeatedElapsedMs: Number(secondElapsedMs.toFixed(2)),
    };
  });
  expect(Math.max(receipts.find((receipt) => receipt.layerCount === 500)!.elapsedMs, receipts.find((receipt) => receipt.layerCount === 500)!.repeatedElapsedMs)).toBeLessThan(1500);
  if (process.env.PROCESS101_STRESS_EVIDENCE === '1') {
    const directory = 'process_logs/playwright-mcp/process101-review-semantics';
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${directory}/stress-check.json`, `${JSON.stringify({ process: 'Process101', budgetMs: 1500, receipts }, null, 2)}\n`, 'utf8');
  }
});
