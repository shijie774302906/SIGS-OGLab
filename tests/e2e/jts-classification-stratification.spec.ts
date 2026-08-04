import { expect, test } from '@playwright/test';
import {
  classificationMethodAvailability,
  createSchemeFromJtsClassification,
  invalidateJtsClassificationRuns,
  resolveJtsClassificationRunForLayer,
  runJtsClassification,
  validateJtsClassificationRun,
} from '../../src/features/stratification/jtsClassificationDomain';
import { emptyStratificationWorkspace } from '../../src/features/stratification/stratificationDomain';
import { applyStratificationCommand, commitStratificationEdit, getStratificationHandoffGate, markStratificationWorkspaceStale } from '../../src/features/stratification/stratificationDomain';
import { validateStratificationAuthorityAppendOnly } from '../../src/features/workspace/workspaceDatabase';
import type { StratificationInputDependencyV2 } from '../../src/features/workspace/workspaceV2';

const INPUT: StratificationInputDependencyV2 = {
  pointId: 'point-jts',
  draftId: 'draft-jts',
  batchId: 'batch-jts',
  checkRunId: 'check-jts',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};

test('PROCESS125 selected classification method is frozen, independently reproducible, and creates a separate candidate scheme', () => {
  const measured = [
    { sourceRowId: 'row-a', depthM: 1, qcKpa: 1_200, fsKpa: 25, u2Kpa: 130 },
    { sourceRowId: 'row-b', depthM: 2, qcKpa: 5_000, fsKpa: 35, u2Kpa: 150 },
    { sourceRowId: 'row-c', depthM: 3, qcKpa: 900, fsKpa: 45, u2Kpa: 280 },
  ];
  let workspace = emptyStratificationWorkspace();
  for (const [index, methodId] of ([
    'fuzzy-zhang-tumay-1999',
    'modified-robertson-2016',
    'schneider-2008',
  ] as const).entries()) {
    const run = runJtsClassification(
      workspace,
      INPUT,
      measured,
      { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 0, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline', waterUnitWeightKnM3: 10 },
      { probeProfileRevisionId: 'probe-process125', waterContextRevisionId: 'water-process125' },
      `2026-07-24T08:0${index}:00.000Z`,
      `classification-process125-${index}`,
      methodId,
    );
    expect(run.ok).toBeTruthy();
    if (!run.ok) continue;
    expect(run.run).toMatchObject({ methodId, mappingVersion: 'engineering-group-map-v1' });
    expect(run.run.rows.some((row) => row.selectedClass?.engineeringGroup)).toBeTruthy();
    expect(validateJtsClassificationRun(run.run)).toEqual({ ok: true });
    const scheme = createSchemeFromJtsClassification(
      run.workspace,
      run.run.runId,
      INPUT,
      `方法候选 ${index + 1}`,
      `2026-07-24T08:1${index}:00.000Z`,
      `scheme-process125-${index}`,
    );
    expect(scheme.ok).toBeTruthy();
    if (scheme.ok) {
      const accepted = applyStratificationCommand(scheme.workspace, { kind: 'accept-clear-layer-candidates' }, `2026-07-24T08:1${index}:30.000Z`);
      expect(accepted.ok).toBeTruthy();
      if (!accepted.ok) continue;
      let reviewedWorkspace = accepted.workspace;
      const pendingLayers = reviewedWorkspace.editSession?.working.layers.filter((layer) => layer.reviewRequired || layer.evidenceReviewRequired) ?? [];
      for (const layer of pendingLayers) {
        const reviewed = applyStratificationCommand(reviewedWorkspace, { kind: 'accept-layer-candidate', layerId: layer.layerId }, `2026-07-24T08:1${index}:40.000Z`);
        expect(reviewed.ok).toBeTruthy();
        if (reviewed.ok) reviewedWorkspace = reviewed.workspace;
      }
      const pendingBoundaries = reviewedWorkspace.editSession?.working.boundaries.filter((boundary) => boundary.reviewRequired) ?? [];
      for (const boundary of pendingBoundaries) {
        const reviewed = applyStratificationCommand(reviewedWorkspace, { kind: 'set-boundary-review', boundaryId: boundary.boundaryId, reviewRequired: false }, `2026-07-24T08:1${index}:50.000Z`);
        expect(reviewed.ok).toBeTruthy();
        if (reviewed.ok) reviewedWorkspace = reviewed.workspace;
      }
      const committed = commitStratificationEdit(reviewedWorkspace, INPUT, `2026-07-24T08:2${index}:00.000Z`);
      expect(committed.ok).toBeTruthy();
      if (!committed.ok) continue;
      workspace = committed.workspace;
      expect(scheme.scheme.origin).toMatchObject({ kind: 'jts-classification', classificationRunId: run.run.runId });
    }
  }
  expect(workspace.schemes).toHaveLength(3);
  expect(workspace.jtsClassificationRuns).toHaveLength(3);
  expect(classificationMethodAvailability('schneider-2008', 'approximate_cpt', measured)).toEqual({
    available: false,
    reason: '需要完整 CPTU 的 u2、水深和压力基准。如源文件包含这些信息，请回到项目/点位数据补充；否则选择其他方法。',
  });
});

test('layer evidence resolves its frozen source run and never falls back to the active or unrelated run', () => {
  const measured = [
    { sourceRowId: 'row-1', depthM: 1, qcKpa: 1_200, fsKpa: 25 },
    { sourceRowId: 'row-2', depthM: 2, qcKpa: 1_500, fsKpa: 28 },
  ];
  const first = runJtsClassification(
    emptyStratificationWorkspace(), INPUT, measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-1', waterContextRevisionId: 'water-1' },
    '2026-07-14T08:00:00.000Z', 'classification-source',
  );
  expect(first.ok).toBeTruthy();
  if (!first.ok) return;
  const converted = createSchemeFromJtsClassification(
    first.workspace,
    first.run.runId,
    INPUT,
    '来源绑定方案',
    '2026-07-14T08:02:00.000Z',
    'scheme-source-binding',
  );
  expect(converted.ok).toBeTruthy();
  if (!converted.ok) return;
  const second = runJtsClassification(
    converted.workspace, INPUT, measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-1', waterContextRevisionId: 'water-1' },
    '2026-07-14T08:03:00.000Z', 'classification-active-later',
  );
  expect(second.ok).toBeTruthy();
  if (!second.ok) return;
  const layer = converted.scheme.layers[0];
  expect(resolveJtsClassificationRunForLayer(second.workspace.jtsClassificationRuns ?? [], converted.scheme, layer)?.runId).toBe(first.run.runId);

  const ruleScheme = structuredClone(converted.scheme);
  ruleScheme.origin = { kind: 'rule-candidate', ruleRunId: 'rule-run', ruleId: 'rule-id', candidateIds: [] };
  ruleScheme.layers[0].soilDecision = { ...ruleScheme.layers[0].soilDecision!, classificationRunId: undefined };
  expect(resolveJtsClassificationRunForLayer(second.workspace.jtsClassificationRuns ?? [], ruleScheme, ruleScheme.layers[0])).toBeNull();

  ruleScheme.layers[0].soilDecision = { ...ruleScheme.layers[0].soilDecision!, classificationRunId: 'missing-run' };
  expect(resolveJtsClassificationRunForLayer(second.workspace.jtsClassificationRuns ?? [], ruleScheme, ruleScheme.layers[0])).toBeNull();
});

test('approximate CPT classification freezes source rows, marks pore path unavailable, and emits traceable boundaries', async () => {
  const measured = [
    { sourceRowId: 'row-1', depthM: 1, qcKpa: 80, fsKpa: 8 },
    { sourceRowId: 'row-2', depthM: 1.5, qcKpa: 300, fsKpa: 12 },
    { sourceRowId: 'row-3', depthM: 2, qcKpa: 700, fsKpa: 18 },
    { sourceRowId: 'row-4', depthM: 2.5, qcKpa: 1_500, fsKpa: 20 },
    { sourceRowId: 'row-5', depthM: 3, qcKpa: 6_000, fsKpa: 22 },
  ];
  const snapshot = structuredClone(measured);
  const result = runJtsClassification(
    emptyStratificationWorkspace(),
    INPUT,
    measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8, waterUnitWeightKnM3: 10 },
    { probeProfileRevisionId: 'probe-rev-1', waterContextRevisionId: 'water-rev-1' },
    '2026-07-11T05:00:00.000Z',
    'classification-approx',
  );
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(measured).toEqual(snapshot);
  expect(result.run).toMatchObject({ route: 'approximate_cpt', status: 'completed' });
  expect(result.run.rows.every((row) => row.poreClass === null && row.comparison.state === 'unavailable')).toBeTruthy();
  expect(result.run.rows.every((row) => row.icClass?.approximate === true && row.confidence === 'review')).toBeTruthy();
  expect(result.run.candidates.length).toBeGreaterThan(0);
  expect(result.run.candidates.every((candidate) => candidate.upperSourceRowId && candidate.lowerSourceRowId)).toBeTruthy();
  expect(validateJtsClassificationRun(result.run)).toEqual({ ok: true });

  const converted = createSchemeFromJtsClassification(
    result.workspace,
    result.run.runId,
    INPUT,
    'JTS 近似分类候选',
    '2026-07-11T05:01:00.000Z',
    'scheme-jts-approx',
  );
  expect(converted.ok).toBeTruthy();
  if (!converted.ok) return;
  expect(converted.scheme.origin).toEqual({ kind: 'jts-classification', classificationRunId: result.run.runId });
  expect(converted.scheme.boundaries).toHaveLength(result.run.candidates.length);
  expect(converted.scheme.boundaries.every((boundary) => boundary.jtsCandidateRef)).toBeTruthy();
  expect(converted.scheme.boundaries.every((boundary) => !boundary.reviewRequired)).toBeTruthy();
  expect(converted.scheme.layers.every((layer) => layer.engineeringSoilGroup && !layer.reviewRequired && layer.soilDecision?.reviewStatus === 'pending')).toBeTruthy();
  const editSession = converted.workspace.editSession;
  expect(editSession?.undoStack.length).toBeGreaterThan(0);
  const frozenOrigin = JSON.stringify(converted.scheme.origin);
  expect([
    editSession?.baseline,
    editSession?.working,
    ...(editSession?.undoStack ?? []),
    ...(editSession?.redoStack ?? []),
  ].every((snapshot) => JSON.stringify(snapshot?.origin) === frozenOrigin)).toBeTruthy();
});

test('full CPTU classification preserves both paths and exact authority revisions', async () => {
  const result = runJtsClassification(
    emptyStratificationWorkspace(),
    INPUT,
    [{ sourceRowId: 'row-1', depthM: 5, qcKpa: 1_200, fsKpa: 25, u2Kpa: 300 }],
    {
      route: 'full_cptu',
      effectiveAreaRatio: 0.8,
      waterDepthM: 10,
      u2HydrostaticDatum: 'total',
      testZeroDatum: 'mudline',
      waterUnitWeightKnM3: 10,
    },
    { probeProfileRevisionId: 'probe-rev-full', waterContextRevisionId: 'water-rev-full' },
    '2026-07-11T06:00:00.000Z',
    'classification-full',
  );
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.run.rows[0]).toMatchObject({
    icClass: { zone: 5, approximate: false },
    poreClass: { zone: 5, approximate: false },
    comparison: { state: 'same', zoneDifference: 0 },
    confidence: 'high',
  });
  expect(result.run).toMatchObject({
    probeProfileRevisionId: 'probe-rev-full',
    waterContextRevisionId: 'water-rev-full',
  });
});

test('classification run validation rejects rewritten evidence and stale invalidation keeps history', async () => {
  const result = runJtsClassification(
    emptyStratificationWorkspace(),
    INPUT,
    [{ sourceRowId: 'row-1', depthM: 5, qcKpa: 1_200, fsKpa: 25 }],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-rev-1', waterContextRevisionId: 'water-rev-1' },
    '2026-07-11T07:00:00.000Z',
    'classification-validation',
  );
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  const damaged = structuredClone(result.run);
  damaged.rows[0].qtKpa += 1;
  expect(validateJtsClassificationRun(damaged)).toMatchObject({ ok: false });

  const stale = invalidateJtsClassificationRuns(result.workspace, '检查修订已变化');
  expect(stale?.activeJtsClassificationRunId).toBeNull();
  expect(stale?.jtsClassificationRuns?.[0]).toMatchObject({ status: 'stale', staleReason: '检查修订已变化' });
  expect(stale?.jtsClassificationRuns?.[0].rows).toEqual(result.run.rows);
});

test('classification setup rejects missing authority and duplicate source rows without mutation', async () => {
  const workspace = emptyStratificationWorkspace();
  const missingAuthority = runJtsClassification(
    workspace,
    INPUT,
    [{ sourceRowId: 'row-1', depthM: 1, qcKpa: 1_000, fsKpa: 10 }],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: '', waterContextRevisionId: '' },
  );
  expect(missingAuthority).toMatchObject({ ok: false });
  const duplicate = runJtsClassification(
    workspace,
    INPUT,
    [
      { sourceRowId: 'same', depthM: 1, qcKpa: 1_000, fsKpa: 10 },
      { sourceRowId: 'same', depthM: 2, qcKpa: 1_100, fsKpa: 11 },
    ],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe', waterContextRevisionId: 'water' },
  );
  expect(duplicate).toMatchObject({ ok: false });
  expect(workspace).toEqual(emptyStratificationWorkspace());
});

test('dense classification changes merge to editable boundary spacing before scheme conversion', async () => {
  const measured = Array.from({ length: 41 }, (_, index) => ({
    sourceRowId: `dense-${index + 1}`,
    depthM: 1 + index * 0.01,
    qcKpa: index % 2 ? 6_000 : 80,
    fsKpa: index % 2 ? 22 : 8,
  }));
  const run = runJtsClassification(
    emptyStratificationWorkspace(),
    INPUT,
    measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-dense', waterContextRevisionId: 'water-dense' },
    '2026-07-11T07:30:00.000Z',
    'classification-dense',
  );
  expect(run.ok).toBeTruthy();
  if (!run.ok) return;
  expect(run.run.candidates.length).toBeGreaterThan(0);
  expect(run.run.candidates.every((candidate, index, candidates) =>
    candidate.depthM - measured[0].depthM >= 0.05
    && measured.at(-1)!.depthM - candidate.depthM >= 0.05
    && (index === 0 || candidate.depthM - candidates[index - 1].depthM >= 0.05))).toBeTruthy();
  expect(createSchemeFromJtsClassification(run.workspace, run.run.runId, INPUT, 'Dense JTS', '2026-07-11T07:31:00.000Z').ok).toBeTruthy();
  const guided = createSchemeFromJtsClassification(
    run.workspace,
    run.run.runId,
    INPUT,
    'Guided dense JTS',
    '2026-07-11T07:32:00.000Z',
    'scheme-guided-dense',
    { policy: 'dual-path-with-ic-fallback', candidateMode: 'stable', groupingWindowM: 0.5 },
  );
  expect(guided.ok).toBeTruthy();
  if (!guided.ok) return;
  expect(guided.scheme.boundaries.length).toBeLessThanOrEqual(run.run.candidates.length);
  expect(guided.scheme.origin).toMatchObject({
    kind: 'jts-classification',
    selection: {
      policy: 'dual-path-with-ic-fallback',
      candidateMode: 'stable',
      rawCandidateCount: run.run.candidates.length,
      selectedCandidateCount: guided.scheme.boundaries.length,
    },
  });
});

test('committed JTS scheme and classification authority may transition to stale without rewriting history', async () => {
  const run = runJtsClassification(
    emptyStratificationWorkspace(), INPUT,
    [
      { sourceRowId: 'row-1', depthM: 1, qcKpa: 100, fsKpa: 8 },
      { sourceRowId: 'row-2', depthM: 2, qcKpa: 1_000, fsKpa: 12 },
    ],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe', waterContextRevisionId: 'water' },
    '2026-07-11T08:00:00.000Z', 'classification-stale',
  );
  expect(run.ok).toBeTruthy();
  if (!run.ok) return;
  const converted = createSchemeFromJtsClassification(run.workspace, run.run.runId, INPUT, 'JTS', '2026-07-11T08:01:00.000Z', 'scheme-stale');
  expect(converted.ok).toBeTruthy();
  if (!converted.ok) return;
  const accepted = applyStratificationCommand(converted.workspace, { kind: 'accept-clear-layer-candidates' }, '2026-07-11T08:01:30.000Z');
  expect(accepted.ok).toBeTruthy();
  if (!accepted.ok) return;
  const committed = commitStratificationEdit(accepted.workspace, INPUT, '2026-07-11T08:02:00.000Z');
  expect(committed.ok).toBeTruthy();
  if (!committed.ok) return;
  const stale = markStratificationWorkspaceStale(committed.workspace, '导入变化')!;
  expect(validateStratificationAuthorityAppendOnly(committed.workspace, stale, 'point-jts')).toEqual({ ok: true });
});

test('guided conversion preserves a stale dirty edit before opening the latest classification scheme', async () => {
  const measured = [
    { sourceRowId: 'row-1', depthM: 1, qcKpa: 100, fsKpa: 8 },
    { sourceRowId: 'row-2', depthM: 2, qcKpa: 1_000, fsKpa: 12 },
    { sourceRowId: 'row-3', depthM: 3, qcKpa: 6_000, fsKpa: 22 },
  ];
  const firstRun = runJtsClassification(
    emptyStratificationWorkspace(), INPUT, measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-1', waterContextRevisionId: 'water-1' },
    '2026-07-11T09:00:00.000Z', 'classification-before-change',
  );
  expect(firstRun.ok).toBeTruthy();
  if (!firstRun.ok) return;
  const firstScheme = createSchemeFromJtsClassification(firstRun.workspace, firstRun.run.runId, INPUT, '旧分类草稿', '2026-07-11T09:01:00.000Z', 'scheme-old');
  expect(firstScheme.ok).toBeTruthy();
  if (!firstScheme.ok) return;
  const stale = markStratificationWorkspaceStale(firstScheme.workspace, '检查修订已变化。')!;
  const latestInput = { ...INPUT, checkRunId: 'check-jts-2', revisions: { ...INPUT.revisions, normalization: 2 } };
  const latestRun = runJtsClassification(
    stale, latestInput, measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-1', waterContextRevisionId: 'water-1' },
    '2026-07-11T09:02:00.000Z', 'classification-after-change',
  );
  expect(latestRun.ok).toBeTruthy();
  if (!latestRun.ok) return;
  const guided = createSchemeFromJtsClassification(
    latestRun.workspace, latestRun.run.runId, latestInput, '最新 JTS 候选',
    '2026-07-11T09:03:00.000Z', 'scheme-latest',
    { policy: 'dual-path-with-ic-fallback', candidateMode: 'stable', groupingWindowM: 0.5 },
  );
  expect(guided.ok).toBeTruthy();
  if (!guided.ok) return;
  expect(guided.workspace.schemes.find((scheme) => scheme.schemeId === 'scheme-old')).toMatchObject({ status: 'stale' });
  expect(guided.workspace.revisions?.some((revision) => revision.schemeId === 'scheme-old')).toBeTruthy();
  expect(guided.workspace.editSession).toMatchObject({ schemeId: 'scheme-latest', dirty: true, isNew: true });
});

test('guided combination keeps rule boundaries, fills JTS soil suggestions, and gates pending anomaly intervals', () => {
  const measured = [
    { sourceRowId: 'combined-1', depthM: 1, qcKpa: 100, fsKpa: 8 },
    { sourceRowId: 'combined-2', depthM: 2, qcKpa: 800, fsKpa: 14 },
    { sourceRowId: 'combined-3', depthM: 3, qcKpa: 1_500, fsKpa: 0 },
    { sourceRowId: 'combined-4', depthM: 4, qcKpa: 4_000, fsKpa: 20 },
    { sourceRowId: 'combined-5', depthM: 5, qcKpa: 7_000, fsKpa: 24 },
  ];
  const run = runJtsClassification(
    emptyStratificationWorkspace(), INPUT, measured,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe-combined', waterContextRevisionId: 'water-combined' },
    '2026-07-12T01:00:00.000Z', 'classification-combined',
  );
  expect(run.ok).toBeTruthy();
  if (!run.ok) return;
  const unclassifiableRows = run.run.rows.filter((row) => !row.selectedClass).length;
  expect(unclassifiableRows).toBeGreaterThan(0);

  const converted = createSchemeFromJtsClassification(
    run.workspace, run.run.runId, INPUT, '规则边界 + JTS 土类候选',
    '2026-07-12T01:01:00.000Z', 'scheme-combined',
    {
      policy: 'dual-path-with-ic-fallback',
      candidateMode: 'stable',
      boundarySource: 'rule',
      ruleRunId: 'rule-combined',
      ruleCandidates: [{
        candidateId: 'rule-boundary-1', depthM: 3.5, score: 0.92,
        qcComponent: 0.92, frComponent: 0.78,
        qcMedianAboveKpa: 800, qcMedianBelowKpa: 4_000,
        frMedianAbovePercent: 1.4, frMedianBelowPercent: 0.5,
        sourceRowIds: ['combined-3', 'combined-4'],
      }],
      pendingUnclassifiableRows: unclassifiableRows,
      unclassifiablePolicy: 'pending-review',
    },
  );
  expect(converted.ok).toBeTruthy();
  if (!converted.ok) return;
  expect(converted.scheme.boundaries).toHaveLength(1);
  expect(converted.scheme.boundaries[0].ruleCandidateRef).toMatchObject({ ruleRunId: 'rule-combined', candidateId: 'rule-boundary-1' });
  expect(converted.scheme.origin).toMatchObject({
    kind: 'jts-classification',
    selection: { boundarySource: 'rule', unclassifiablePolicy: 'pending-review', pendingUnclassifiableRows: unclassifiableRows },
  });
  expect(converted.scheme.layers.some((layer) => layer.soilConfirmationRequired)).toBeTruthy();
  const suggestedLayer = converted.scheme.layers.find((layer) => layer.soilConfirmationRequired && layer.engineeringSoilGroup !== 'unclassified');
  expect(suggestedLayer).toBeTruthy();
  if (!suggestedLayer) return;
  const accepted = applyStratificationCommand(converted.workspace, { kind: 'confirm-layer-soil-group', layerId: suggestedLayer.layerId });
  expect(accepted.ok).toBeTruthy();
  if (!accepted.ok) return;
  const acceptedLayer = accepted.workspace.editSession?.working.layers.find((layer) => layer.layerId === suggestedLayer.layerId);
  expect(acceptedLayer).toMatchObject({ soilConfirmationRequired: false, reviewRequired: false });
  expect(applyStratificationCommand(accepted.workspace, { kind: 'set-layer-soil-group', layerId: suggestedLayer.layerId, engineeringSoilGroup: 'free-text-soil' })).toMatchObject({ ok: false });

  const committed = commitStratificationEdit(converted.workspace, INPUT, '2026-07-12T01:02:00.000Z');
  expect(committed).toMatchObject({ ok: false });
  expect(getStratificationHandoffGate(converted.workspace, INPUT)).toMatchObject({ state: 'deny', recovery: 'scheme' });
});
