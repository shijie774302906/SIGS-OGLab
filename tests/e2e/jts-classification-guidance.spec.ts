import { expect, test } from '@playwright/test';
import { getJtsClassificationGuidance, groupJtsCandidates } from '../../src/features/stratification/jtsClassificationGuidance';
import type { JtsClassificationBoundaryCandidateV4, JtsClassificationEvidenceRowV4, JtsClassificationRunV4 } from '../../src/features/workspace/workspaceV2';

test('guided classification distinguishes usable Ic fallback from repair and groups rows into review intervals', () => {
  const run = fixtureRun([
    row('same', 1, 4, 4),
    row('unavailable', 1.1, 7, null, -3),
    row('unavailable', 1.2, 7, null, -3.2),
    row('adjacent', 2, 6, 7),
    row('unresolved', 2.1, 5, 8),
    row('unavailable', 3, null, null, null, ['侧壁摩阻力必须大于 0 才能计算 Ic。']),
  ]);
  const guidance = getJtsClassificationGuidance(run);
  expect(guidance).toMatchObject({
    agreementRows: 1,
    icFallbackRows: 2,
    adjacentRows: 1,
    conflictRows: 1,
    unclassifiableRows: 1,
    canUseIcFallback: false,
  });
  expect(guidance.intervals.find((interval) => interval.kind === 'ic-fallback')).toMatchObject({
    depthFromM: 1.1,
    depthToM: 1.2,
    rowCount: 2,
    reason: '孔压比超出当前 JTS 孔压分类图范围',
  });
  expect(guidance.reviewIntervals).toHaveLength(2);
  expect(guidance.reviewIntervals[0]).toMatchObject({ depthFromM: 2, depthToM: 2.1, kind: 'conflict' });
});

test('guided classification recommends Ic only when every otherwise-unavailable row still has Ic evidence', () => {
  const run = fixtureRun([
    row('same', 1, 4, 4),
    row('unavailable', 1.1, 7, null, -3),
    row('unavailable', 1.2, 7, null, -3.2),
  ]);
  expect(getJtsClassificationGuidance(run)).toMatchObject({
    canUseIcFallback: true,
    recommendedTitle: '使用 Ic 结果生成地层',
  });
});

test('stable candidate grouping keeps exact-window changes and preserves the worst evidence inside a short cluster', () => {
  const candidates = [
    candidate('a', 1, 'high'),
    candidate('b', 1.1, 'problem'),
    candidate('c', 1.5, 'review'),
    candidate('d', 2, 'high'),
  ];
  expect(groupJtsCandidates(candidates, 0.5).map((item) => item.candidateId)).toEqual(['b', 'c', 'd']);
});

test('guided classification only offers explicit gap continuation for a bounded one-percent remainder', () => {
  const ordinary = Array.from({ length: 100 }, (_, index) => row('same', 1 + index * 0.1, 4, 4));
  const oneGap = row('unavailable', 11.1, null, null, null, ['两条分类路径都没有结果。']);
  expect(getJtsClassificationGuidance(fixtureRun([...ordinary, oneGap])).canContinueWithBoundedGaps).toBe(true);
  expect(getJtsClassificationGuidance(fixtureRun([...ordinary, oneGap, row('unavailable', 11.2, null, null)])).canContinueWithBoundedGaps).toBe(false);
});

test('quick ignore is limited to short anomalies with bounded physical impact', () => {
  const safeRows = [
    row('same', 1, 4, 4),
    row('same', 1.1, 4, 4),
    row('unavailable', 1.2, null, null, null, ['两条分类路径都没有结果。']),
    row('same', 1.3, 4, 4),
    row('same', 1.4, 4, 4),
    ...Array.from({ length: 30 }, (_, index) => row('same', 1.5 + index * 0.1, 4, 4)),
  ];
  const safeGuidance = getJtsClassificationGuidance(fixtureRun(safeRows));
  expect(safeGuidance).toMatchObject({
    canIgnoreIsolatedAnomalies: true,
    isolatedAnomalyIntervalCount: 1,
  });
  expect(safeGuidance.maximumAnomalyThicknessM).toBeCloseTo(0.1);
  const thickEdgeGap = [
    ...Array.from({ length: 9 }, (_, index) => row('unavailable', 1 + index * 0.1, null, null)),
    ...safeRows.slice(3),
  ];
  expect(getJtsClassificationGuidance(fixtureRun(thickEdgeGap))).toMatchObject({
    canIgnoreIsolatedAnomalies: false,
  });
});

function fixtureRun(rows: JtsClassificationEvidenceRowV4[]): JtsClassificationRunV4 {
  const candidates = [candidate('a', 1.05, 'high'), candidate('b', 1.15, 'review'), candidate('c', 2, 'problem'), candidate('d', 3, 'review')];
  return {
    runId: 'run-guidance',
    input: { projectId: 'project', pointId: 'point', batchId: 'batch', draftId: 'draft', dataBlockId: 'block', checkRunId: 'check', revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 } },
    probeProfileRevisionId: 'probe', waterContextRevisionId: 'water', route: 'full_cptu', measuredRowsSnapshot: [],
    seriesContextSnapshot: { route: 'full_cptu', effectiveAreaRatio: 0.75, waterDepthM: 0, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline' },
    formulaPackageId: 'jts', formulaPackageVersion: 1, status: 'completed', rows, candidates,
    summary: { rowCount: rows.length, sameCount: 1, adjacentCount: 1, unresolvedCount: 1, unavailableCount: 3, candidateCount: candidates.length },
    inputHash: 'input', resultHash: 'result', createdAt: '2026-07-12T00:00:00.000Z',
  };
}

function row(
  state: JtsClassificationEvidenceRowV4['comparison']['state'],
  depthM: number,
  icZone: number | null,
  poreZone: number | null,
  porePressureRatio: number | null = 0,
  issues: string[] = [],
): JtsClassificationEvidenceRowV4 {
  const snapshot = (zone: number | null) => zone === null ? null : { soilClassId: 'clay' as const, zone, label: `Zone ${zone}`, approximate: false };
  return {
    sourceRowId: `row-${depthM}`, depthM, qtKpa: 1000, gammaSatKnM3: 18, qnetKpa: 1000, frPercent: 1,
    qtNormalized: 10, qtn: 10, ic: icZone === null ? null : 2, porePressureRatio,
    icClass: snapshot(icZone), poreClass: snapshot(poreZone), selectedClass: snapshot(icZone ?? poreZone),
    comparison: { state, zoneDifference: icZone !== null && poreZone !== null ? Math.abs(icZone - poreZone) : null },
    confidence: state === 'same' ? 'high' : state === 'unresolved' ? 'problem' : 'review', issues,
  };
}

function candidate(id: string, depthM: number, confidence: JtsClassificationBoundaryCandidateV4['confidence']): JtsClassificationBoundaryCandidateV4 {
  return { candidateId: id, depthM, upperSourceRowId: `${id}-up`, lowerSourceRowId: `${id}-down`, upperZone: 4, lowerZone: 5, confidence, reason: id };
}
