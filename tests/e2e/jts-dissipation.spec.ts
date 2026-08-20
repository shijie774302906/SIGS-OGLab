import { expect, test } from '@playwright/test';
import { emptyParameterWorkspace } from '../../src/features/parameters/parameterDomain';
import { DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, jtsTableNktSetting, runJtsParameterPackage } from '../../src/features/parameters/jtsParameterPackageDomain';
import { appendJtsDissipationTest, calculateJtsDissipationResult, confirmJtsDissipationT50, validateJtsDissipationWorkspace } from '../../src/features/parameters/jtsDissipationDomain';
import { runJtsClassification } from '../../src/features/stratification/jtsClassificationDomain';
import { emptyStratificationWorkspace } from '../../src/features/stratification/stratificationDomain';
import type { StratificationInputDependencyV2, StratificationSchemeRevisionV2 } from '../../src/features/workspace/workspaceV2';

const INPUT: StratificationInputDependencyV2 = { pointId: 'point-dissipation', draftId: 'draft', batchId: 'batch', checkRunId: 'check', revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 } };

test('automatic t50 interpolation and JTS Ch/kh use exact immutable test, layer, and parameter-package authority', async () => {
  const { packageRun, revision, workspace } = sourcePackage();
  const appended = appendJtsDissipationTest(workspace, INPUT.pointId, validInput(), '2026-07-11T12:00:00.000Z', 'test-1', 'test-rev-1');
  expect(appended.ok).toBeTruthy();
  if (!appended.ok) return;
  const confirmed = confirmJtsDissipationT50(appended.workspace, appended.test.revisionId, 'auto-intersection', null, '2026-07-11T12:01:00.000Z', 't50-rev-1');
  expect(confirmed.ok).toBeTruthy();
  if (!confirmed.ok) return;
  expect(confirmed.revision.t50Seconds).toBeCloseTo(20, 10);
  expect(confirmed.revision.evidenceRowNumbers).toEqual([3, 4]);
  const calculated = calculateJtsDissipationResult(confirmed.workspace, INPUT.pointId, packageRun, revision.revisionId, '2026-07-11T12:02:00.000Z', 'result-rev-1');
  expect(calculated.ok).toBeTruthy();
  if (!calculated.ok) return;
  const gamma = calculated.result.inputs.naturalUnitWeightKnM3;
  const vs = calculated.result.inputs.shearWaveVelocityMps;
  const su = calculated.result.inputs.undrainedStrengthKpa;
  const g0 = gamma * vs ** 2 / 9.81;
  const ir = g0 / su;
  expect(calculated.result.formulaRevision).toBe('jts-t242-2020-si-v2');
  expect(calculated.result.chM2PerSecond).toBeCloseTo(0.245 * 1.785 ** 2 * Math.sqrt(ir) / 20 * 1e-4, 12);
  expect(calculated.result.khMPerSecond).toBeCloseTo((25 * ir * 20) ** -1.25 * 1e-2, 12);
  expect(validateJtsDissipationWorkspace(calculated.workspace)).toEqual({ ok: true });
});

test('series problems remain visible and cannot create a current t50', async () => {
  const bad = appendJtsDissipationTest(emptyParameterWorkspace(), INPUT.pointId, { ...validInput(), rows: [{ sourceRowNumber: 2, timeSeconds: 0, u2Kpa: 300 }, { sourceRowNumber: 3, timeSeconds: 10, u2Kpa: 250 }, { sourceRowNumber: 4, timeSeconds: 5, u2Kpa: 200 }] }, undefined, 'bad-test', 'bad-rev');
  expect(bad.ok).toBeTruthy();
  if (!bad.ok) return;
  expect(bad.test).toMatchObject({ status: 'problem', problem: '时间必须严格递增，不能重复或倒序。' });
  expect(confirmJtsDissipationT50(bad.workspace, bad.test.revisionId, 'auto-intersection', null)).toMatchObject({ ok: false });
});

test('long-gap automatic intersection requires explicit manual t50 alternative', async () => {
  const { workspace } = sourcePackage();
  const appended = appendJtsDissipationTest(workspace, INPUT.pointId, { ...validInput(), rows: [
    { sourceRowNumber: 2, timeSeconds: 0, u2Kpa: 300 },
    { sourceRowNumber: 3, timeSeconds: 1, u2Kpa: 280 },
    { sourceRowNumber: 4, timeSeconds: 2, u2Kpa: 260 },
    { sourceRowNumber: 5, timeSeconds: 100, u2Kpa: 180 },
  ] }, undefined, 'gap-test', 'gap-rev');
  expect(appended.ok).toBeTruthy();
  if (!appended.ok) return;
  expect(confirmJtsDissipationT50(appended.workspace, appended.test.revisionId, 'auto-intersection', null)).toMatchObject({ ok: false, problem: expect.stringContaining('长时间缺口') });
  const manual = confirmJtsDissipationT50(appended.workspace, appended.test.revisionId, 'manual-alternative', 35, undefined, 'manual-rev');
  expect(manual.ok).toBeTruthy();
  if (manual.ok) expect(manual.revision).toMatchObject({ origin: 'manual-alternative', t50Seconds: 35, evidenceRowNumbers: [] });
});

function validInput() {
  return { fileName: 'dissipation.csv', depthM: 5.2, layerId: 'layer-1', u0Kpa: 100, rows: [
    { sourceRowNumber: 2, timeSeconds: 0, u2Kpa: 300 },
    { sourceRowNumber: 3, timeSeconds: 10, u2Kpa: 250 },
    { sourceRowNumber: 4, timeSeconds: 20, u2Kpa: 200 },
    { sourceRowNumber: 5, timeSeconds: 40, u2Kpa: 140 },
  ] };
}

function sourcePackage() {
  const classificationResult = runJtsClassification(emptyStratificationWorkspace(), INPUT, [{ sourceRowId: 'row-1', depthM: 5, qcKpa: 1200, fsKpa: 25, u2Kpa: 300 }], { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 10, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline', waterUnitWeightKnM3: 10 }, { probeProfileRevisionId: 'probe', waterContextRevisionId: 'water' }, undefined, 'classification-dissipation');
  if (!classificationResult.ok) throw new Error(classificationResult.problem);
  const revision: StratificationSchemeRevisionV2 = { revisionId: 'strat-rev', schemeId: 'scheme', version: 1, snapshot: { schemeId: 'scheme', name: '黏土层', status: 'current', version: 1, input: structuredClone(INPUT), depthFromM: 5, depthToM: 5.5, layers: [{ layerId: 'layer-1', name: '黏土层', description: '', engineeringSoilGroup: 'clay', reviewRequired: false, depthFromM: 5, depthToM: 5.5 }], boundaries: [], origin: { kind: 'jts-classification', classificationRunId: classificationResult.run.runId }, createdAt: '2026-07-11T11:00:00.000Z', updatedAt: '2026-07-11T11:00:00.000Z' }, committedAt: '2026-07-11T11:00:00.000Z' };
  const packageResult = runJtsParameterPackage(emptyParameterWorkspace(), classificationResult.run, revision, { ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, ...jtsTableNktSetting('triaxial_cu')!, ocrCoefficientConfirmed: true, sensitivityCoefficientConfirmed: true, materialScope: 'within_source', selectedOptionalMethodIds: ['jts_dissipation_ch_kh'] }, undefined, 'package-dissipation');
  if (!packageResult.ok) throw new Error(packageResult.problem);
  return { packageRun: packageResult.run, revision, workspace: packageResult.workspace };
}
