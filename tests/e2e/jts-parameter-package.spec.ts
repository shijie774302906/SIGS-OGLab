import { expect, test } from '@playwright/test';
import { emptyParameterWorkspace } from '../../src/features/parameters/parameterDomain';
import {
  DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
  finalStratificationApplicabilityClasses,
  invalidateJtsParameterPackages,
  jtsTableNktSetting,
  prepareJtsParameterOutputScopeConfirmation,
  runJtsParameterPackage,
  validateJtsParameterPackageRun,
} from '../../src/features/parameters/jtsParameterPackageDomain';
import { diagnoseJtsParameterIssue, guidedParameterIdForMethod } from '../../src/features/parameters/parameterIssueDiagnosis';
import { guidedParameterHandoffCopy } from '../../src/features/parameters/ParameterWorkbenchDocument';
import { evaluateParameterRecovery, type ParameterRecoveryIntent } from '../../src/features/parameters/parameterRecoveryFlow';
import { runJtsClassification } from '../../src/features/stratification/jtsClassificationDomain';
import { emptyStratificationWorkspace } from '../../src/features/stratification/stratificationDomain';
import type { JtsClassificationRunV4, StratificationInputDependencyV2, StratificationSchemeRevisionV2 } from '../../src/features/workspace/workspaceV2';

const INPUT: StratificationInputDependencyV2 = {
  pointId: 'point-parameter', draftId: 'draft-parameter', batchId: 'batch-parameter', checkRunId: 'check-parameter',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};

test('PROCESS138 parameter guidance follows the engineer-confirmed final layer groups', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'sand', '最终砂层');
  revision.snapshot.layers[0].soilDecision = {
    suggestedGroup: 'clay',
    finalGroup: 'sand',
    finalDetailedType: '细砂',
    source: 'engineer-overrode-jts',
    decidedAt: '2026-07-30T08:00:00.000Z',
  };
  expect([...finalStratificationApplicabilityClasses(revision)]).toEqual(['silty_fine_sand']);
  revision.snapshot.layers[0].soilDecision.finalGroup = 'mixed';
  expect([...finalStratificationApplicabilityClasses(revision)]).toEqual(['silt']);
});

test('PROCESS111 parameter handoff asks the engineer to confirm the current result scope', () => {
  expect(guidedParameterHandoffCopy(true, 0)).toMatchObject({ title: '当前参数已可用于成果', action: '确认当前参数并进入成果输出' });
  expect(guidedParameterHandoffCopy(false, 3)).toMatchObject({ title: '已完成的参数可先用于本次成果', action: '确认当前参数并进入成果输出' });
  expect(guidedParameterHandoffCopy(false, 0)).toMatchObject({ title: '当前没有可用于成果的参数结果', action: '调整参数配置' });
});

test('PROCESS111 confirms completed parameters and excludes every unresolved applicable method in one rerun', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, '2026-07-20T08:00:00.000Z', 'package-scope-initial');
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const confirmation = prepareJtsParameterOutputScopeConfirmation(initial.run, '2026-07-20T08:01:00.000Z');
  expect(confirmation.ok).toBe(true);
  if (!confirmation.ok) return;
  expect(confirmation.includedMethodIds.length).toBeGreaterThan(0);
  expect(confirmation.excludedMethodIds).toEqual(initial.run.checklist.filter((item) => item.applicableLayerIds.length > 0 && ['pending', 'problem'].includes(item.status)).map((item) => item.methodId));
  expect(confirmation.requiresRun).toBe(true);
  const confirmed = runJtsParameterPackage(initial.workspace, classification, revision, confirmation.settings, '2026-07-20T08:01:00.000Z', 'package-scope-confirmed');
  expect(confirmed.ok).toBe(true);
  if (!confirmed.ok) return;
  expect(confirmed.run.summary.eligibleForOutput).toBe(true);
  expect(confirmed.run.settingsSnapshot.outputScopeConfirmedAt).toBe('2026-07-20T08:01:00.000Z');
  expect(confirmed.run.settingsSnapshot.outputScopeIncludedMethodIds).toEqual(confirmation.includedMethodIds);
  expect(confirmed.run.settingsSnapshot.outputScopeExcludedMethodIds).toEqual(confirmation.excludedMethodIds);
  expect(confirmed.run.settingsSnapshot.skippedMethodDecisions).toEqual(expect.arrayContaining(confirmation.excludedMethodIds.map((methodId) => expect.objectContaining({ methodId, reason: 'not-needed-this-stage' }))));
  expect(confirmed.run.classificationRowsSnapshot).toEqual(initial.run.classificationRowsSnapshot);
  expect(confirmed.run.layerSnapshot).toEqual(initial.run.layerSnapshot);
  expect(initial.workspace.jtsParameterPackageRuns).toHaveLength(1);
  expect(confirmed.workspace.jtsParameterPackageRuns).toHaveLength(2);
});

test('PROCESS111 rejects damaged or contradictory confirmed output scopes', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, '2026-07-20T08:00:00.000Z', 'package-scope-validation');
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const confirmation = prepareJtsParameterOutputScopeConfirmation(initial.run, '2026-07-20T08:01:00.000Z');
  expect(confirmation.ok).toBe(true);
  if (!confirmation.ok) return;
  const firstIncluded = confirmation.includedMethodIds[0];
  const firstExcluded = confirmation.excludedMethodIds[0];
  const cases = [
    { ...structuredClone(confirmation.settings), outputScopeConfirmedAt: 'not-a-time' },
    { ...structuredClone(confirmation.settings), outputScopeIncludedMethodIds: [firstIncluded, firstIncluded] },
    { ...structuredClone(confirmation.settings), outputScopeExcludedMethodIds: [firstExcluded, firstIncluded] },
    { ...structuredClone(confirmation.settings), skippedMethodDecisions: (confirmation.settings.skippedMethodDecisions ?? []).filter((item) => item.methodId !== firstExcluded) },
  ];
  cases.forEach((settings, index) => {
    const result = runJtsParameterPackage(initial.workspace, classification, revision, settings, '2026-07-20T08:02:00.000Z', `package-scope-invalid-${index}`);
    expect(result.ok).toBe(false);
  });
});

test('PROCESS111 rejects scope confirmation when no completed parameter remains', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS);
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const withoutCompleted = structuredClone(initial.run);
  withoutCompleted.checklist = withoutCompleted.checklist.map((item) => item.applicableLayerIds.length ? { ...item, status: 'pending' as const, valueCount: 0 } : item);
  expect(prepareJtsParameterOutputScopeConfirmation(withoutCompleted)).toMatchObject({ ok: false, problem: expect.stringContaining('没有已完成') });
});

test('PROCESS107 parameter diagnosis explains the real owner, affected evidence and guided target', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const pending = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, undefined, 'package-diagnosis');
  expect(pending.ok).toBeTruthy();
  if (!pending.ok) return;
  const confirmation = diagnoseJtsParameterIssue(pending.run, 'jts_su_nkt');
  expect(confirmation).toMatchObject({ owner: 'parameter-guide', affectedRowCount: 1, affectedLayerIds: [revision.snapshot.layers[0].layerId] });
  expect(confirmation?.cause).toContain('Nkt');
  expect(guidedParameterIdForMethod('jts_su_nkt')).toBe('su');

  const dataProblem = structuredClone(pending.run);
  const item = dataProblem.checklist.find((candidate) => candidate.methodId === 'jts_compression_modulus')!;
  item.status = 'problem';
  const value = dataProblem.values.find((candidate) => candidate.methodId === 'jts_compression_modulus')!;
  value.status = 'problem';
  value.value = null;
  value.reason = 'qnet 必须是大于 0 MPa 的有限值。';
  const diagnosis = diagnoseJtsParameterIssue(dataProblem, 'jts_compression_modulus');
  expect(diagnosis).toMatchObject({ owner: 'parameter-local', affectedRowCount: 1, pointIgnore: { available: false, forceAllowed: false } });
  expect(diagnosis?.recommendation).toContain('不能通过强制忽略绕过');
  expect(diagnoseJtsParameterIssue(dataProblem, 'jts_gamma_sat')).toBeNull();
});

test('PROCESS107 sparse row problems can be ignored inside the parameter trial without changing source rows or stratification', () => {
  const classification = fullCptuClassification();
  const base = classification.rows[0];
  classification.rows = Array.from({ length: 101 }, (_, index) => ({
    ...base,
    sourceRowId: index === 50 ? 'row-local-problem' : `row-valid-${index}`,
    depthM: Number((5 + index * 0.01).toFixed(2)),
    qnetKpa: index === 50 ? -1 : 900 + index * 2,
  }));
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, '2026-07-16T12:00:00.000Z', 'package-local-problem');
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const originalProblem = initial.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-local-problem');
  expect(originalProblem).toMatchObject({ status: 'problem', value: null });
  const diagnosis = diagnoseJtsParameterIssue(initial.run, 'jts_compression_modulus');
  expect(diagnosis).toMatchObject({ owner: 'parameter-local', pointIgnore: { available: true, sourceRowIds: ['row-local-problem'], maximumConsecutiveRows: 1 } });

  const rerun = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: [{
      methodId: 'jts_compression_modulus',
      sourceRowId: 'row-local-problem',
      depthM: 5.50,
      reason: 'local-calculation-domain',
      originalReason: originalProblem?.reason ?? '',
      decidedAt: '2026-07-16T12:01:00.000Z',
    }],
  }, '2026-07-16T12:01:00.000Z', 'package-local-problem-ignored');
  expect(rerun.ok).toBe(true);
  if (!rerun.ok) return;
  expect(rerun.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-local-problem')).toMatchObject({ status: 'ignored', value: null, reason: originalProblem?.reason });
  expect(rerun.run.checklist.find((item) => item.methodId === 'jts_compression_modulus')).toMatchObject({ status: 'complete', valueCount: 100 });
  expect(rerun.run.representativeValues.find((item) => item.methodId === 'jts_compression_modulus')).toMatchObject({ validValueCount: 100 });
  expect(rerun.run.summary).toMatchObject({ ignoredPointCount: 1 });
  expect(rerun.run.classificationRowsSnapshot).toEqual(initial.run.classificationRowsSnapshot);
  expect(rerun.run.layerSnapshot).toEqual(initial.run.layerSnapshot);
  expect(validateJtsParameterPackageRun(rerun.run)).toEqual({ ok: true });
});

test('PROCESS108 domain keeps the recommendation gate but accepts an audited forced ignore', () => {
  const classification = fullCptuClassification();
  const base = classification.rows[0];
  classification.rows = Array.from({ length: 5 }, (_, index) => ({
    ...base,
    sourceRowId: index === 2 ? 'row-problem' : `row-valid-${index}`,
    depthM: 5 + index * 0.01,
    qnetKpa: index === 2 ? -1 : 1_000,
  }));
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS);
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const problem = initial.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-problem');
  const rejected = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: [{
      methodId: 'jts_compression_modulus',
      sourceRowId: 'row-problem',
      depthM: 5.02,
      reason: 'local-calculation-domain',
      originalReason: problem?.reason ?? '',
      decidedAt: '2026-07-16T12:02:00.000Z',
    }],
  });
  expect(rejected).toMatchObject({ ok: false });
  if (!rejected.ok) expect(rejected.problem).toContain('未满足建议条件');

  const assessment = diagnoseJtsParameterIssue(initial.run, 'jts_compression_modulus')?.pointIgnore;
  expect(assessment).toMatchObject({ available: false, forceAllowed: true });
  expect(assessment?.thresholdViolations).toEqual(expect.arrayContaining([
    expect.stringContaining('低于建议的 50 个'),
    expect.stringContaining('少于 5 个有效值'),
  ]));
  const forced = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: [{
      methodId: 'jts_compression_modulus',
      sourceRowId: 'row-problem',
      depthM: 5.02,
      reason: 'local-calculation-domain',
      originalReason: problem?.reason ?? '',
      decidedAt: '2026-07-17T09:00:00.000Z',
      forced: true,
      thresholdViolations: ['来自界面的陈旧或伪造原因'],
      forcedConfirmedAt: '2026-07-17T09:00:00.000Z',
    }],
  }, '2026-07-17T09:00:00.000Z', 'package-forced-ignore');
  expect(forced.ok).toBe(true);
  if (!forced.ok) return;
  expect(forced.run.summary).toMatchObject({ ignoredPointCount: 1, forcedIgnoredPointCount: 1, valueCount: expect.any(Number) });
  expect(forced.run.settingsSnapshot.ignoredPointDecisions?.[0].thresholdViolations).toEqual(assessment?.thresholdViolations);
  expect(forced.run.settingsSnapshot.ignoredPointDecisions?.[0].thresholdViolations).not.toContain('来自界面的陈旧或伪造原因');
  expect(forced.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-problem')?.notices.join(' ')).toContain('强制忽略');
  expect(forced.run.representativeValues.find((value) => value.methodId === 'jts_compression_modulus')).toMatchObject({ validValueCount: 4 });
  expect(forced.run.classificationRowsSnapshot).toEqual(initial.run.classificationRowsSnapshot);
  expect(forced.run.layerSnapshot).toEqual(initial.run.layerSnapshot);
  expect(validateJtsParameterPackageRun(forced.run)).toEqual({ ok: true });
});

test('PROCESS108 forced ignore still rejects a method with no remaining valid value', () => {
  const classification = fullCptuClassification();
  const base = classification.rows[0];
  classification.rows = Array.from({ length: 5 }, (_, index) => ({
    ...base,
    sourceRowId: `row-problem-${index}`,
    depthM: 5 + index * 0.01,
    qnetKpa: -1,
  }));
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS);
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const diagnosis = diagnoseJtsParameterIssue(initial.run, 'jts_compression_modulus');
  expect(diagnosis?.pointIgnore).toMatchObject({ available: false, forceAllowed: false });
  expect(diagnosis?.pointIgnore?.blockingReason).toContain('无剩余有效值');
  const problem = initial.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-problem-0');
  const forced = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: [{
      methodId: 'jts_compression_modulus',
      sourceRowId: 'row-problem-0',
      depthM: 5,
      reason: 'local-calculation-domain',
      originalReason: problem?.reason ?? '',
      decidedAt: '2026-07-17T09:10:00.000Z',
      forced: true,
      thresholdViolations: ['适用值仅 5 个，低于建议的 50 个'],
      forcedConfirmedAt: '2026-07-17T09:10:00.000Z',
    }],
  });
  expect(forced).toMatchObject({ ok: false });
  if (!forced.ok) expect(forced.problem).toContain('无剩余有效值');
});

test('PROCESS108 forced ignore cannot remove the last valid value from one affected layer even when another layer remains valid', () => {
  const classification = fullCptuClassification();
  const base = classification.rows[0];
  classification.rows = [
    { ...base, sourceRowId: 'row-layer-empty', depthM: 5, qnetKpa: -1 },
    { ...base, sourceRowId: 'row-other-layer-valid', depthM: 6, qnetKpa: 1_000 },
  ];
  const revision = singleLayerRevision(classification, 'clay', '两层黏土');
  revision.snapshot.layers = [
    { ...revision.snapshot.layers[0], layerId: 'layer-empty', name: '上层', depthFromM: 5, depthToM: 5.5 },
    { ...revision.snapshot.layers[0], layerId: 'layer-valid', name: '下层', depthFromM: 5.5, depthToM: 6.5 },
  ];
  revision.snapshot.boundaries = [{ boundaryId: 'boundary-two-layers', depthM: 5.5, source: 'manual', status: 'current' }];
  revision.snapshot.depthToM = 6.5;
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS);
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const diagnosis = diagnoseJtsParameterIssue(initial.run, 'jts_compression_modulus');
  expect(diagnosis?.pointIgnore).toMatchObject({ available: false, forceAllowed: false });
  expect(diagnosis?.pointIgnore?.blockingReason).toContain('1 个受影响土层已无剩余有效值');
  const problem = initial.run.values.find((value) => value.methodId === 'jts_compression_modulus' && value.sourceRowId === 'row-layer-empty');
  const rejected = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: [{
      methodId: 'jts_compression_modulus',
      sourceRowId: 'row-layer-empty',
      depthM: 5,
      reason: 'local-calculation-domain',
      originalReason: problem?.reason ?? '',
      decidedAt: '2026-07-17T09:15:00.000Z',
      forced: true,
      thresholdViolations: ['适用值低于建议数量'],
      forcedConfirmedAt: '2026-07-17T09:15:00.000Z',
    }],
  });
  expect(rejected).toMatchObject({ ok: false });
  if (!rejected.ok) expect(rejected.problem).toContain('1 个受影响土层已无剩余有效值');
});

test('PROCESS108 an engineer may force-ignore a consecutive interval while the audit keeps every exceeded recommendation', () => {
  const classification = fullCptuClassification();
  const base = classification.rows[0];
  const problemIndexes = new Set([50, 51, 52, 53]);
  classification.rows = Array.from({ length: 101 }, (_, index) => ({
    ...base,
    sourceRowId: problemIndexes.has(index) ? `row-problem-${index}` : `row-valid-${index}`,
    depthM: Number((5 + index * 0.01).toFixed(2)),
    qnetKpa: problemIndexes.has(index) ? -1 : 1_000,
  }));
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const initial = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS);
  expect(initial.ok).toBe(true);
  if (!initial.ok) return;
  const diagnosis = diagnoseJtsParameterIssue(initial.run, 'jts_compression_modulus');
  expect(diagnosis?.pointIgnore).toMatchObject({
    available: false,
    forceAllowed: true,
    maximumConsecutiveRows: 4,
  });
  expect(diagnosis?.pointIgnore?.thresholdViolations).toEqual(expect.arrayContaining([
    expect.stringContaining('累计忽略比例'),
    expect.stringContaining('连续忽略 4 行'),
  ]));
  const problemValues = initial.run.values.filter((value) => value.methodId === 'jts_compression_modulus' && problemIndexes.has(Number(value.sourceRowId.split('-').at(-1))));
  const forcedAt = '2026-07-17T09:20:00.000Z';
  const forced = runJtsParameterPackage(initial.workspace, classification, revision, {
    ...initial.run.settingsSnapshot,
    ignoredPointDecisions: problemValues.map((value) => ({
      methodId: 'jts_compression_modulus' as const,
      sourceRowId: value.sourceRowId,
      depthM: value.depthM,
      reason: 'local-calculation-domain' as const,
      originalReason: value.reason ?? '',
      decidedAt: forcedAt,
      forced: true,
      thresholdViolations: diagnosis?.pointIgnore?.thresholdViolations ?? [],
      forcedConfirmedAt: forcedAt,
    })),
  }, forcedAt, 'package-forced-consecutive');
  expect(forced.ok).toBe(true);
  if (!forced.ok) return;
  expect(forced.run.summary).toMatchObject({ ignoredPointCount: 4, forcedIgnoredPointCount: 4 });
  expect(forced.run.representativeValues.find((value) => value.methodId === 'jts_compression_modulus')).toMatchObject({ validValueCount: 97 });
});

test('PROCESS107 data recovery waits for recheck and exact new JTS stratification before returning', () => {
  const intent: ParameterRecoveryIntent = { methodId: 'jts_compression_modulus', stage: 'check', sourceCheckRunId: 'check-old', sourceStratificationRevisionId: 'revision-old' };
  expect(evaluateParameterRecovery(intent, { checkRunId: 'check-old', checkAllowed: true, stratificationRevisionId: 'revision-old', activeClassificationRunId: 'class-old', stratificationClassificationRunId: 'class-old' })).toEqual({ state: 'waiting-check' });
  expect(evaluateParameterRecovery(intent, { checkRunId: 'check-new', checkAllowed: false, stratificationRevisionId: null, activeClassificationRunId: null, stratificationClassificationRunId: null })).toEqual({ state: 'waiting-check' });
  const advanced = evaluateParameterRecovery(intent, { checkRunId: 'check-new', checkAllowed: true, stratificationRevisionId: null, activeClassificationRunId: null, stratificationClassificationRunId: null });
  expect(advanced).toMatchObject({ state: 'advance-to-stratification', intent: { stage: 'stratification' } });
  if (advanced.state !== 'advance-to-stratification') return;
  expect(evaluateParameterRecovery(advanced.intent, { checkRunId: 'check-new', checkAllowed: true, stratificationRevisionId: 'revision-new', activeClassificationRunId: 'class-new', stratificationClassificationRunId: 'class-old' })).toEqual({ state: 'waiting-stratification' });
  expect(evaluateParameterRecovery(advanced.intent, { checkRunId: 'check-new', checkAllowed: true, stratificationRevisionId: 'revision-new', activeClassificationRunId: 'class-new', stratificationClassificationRunId: 'class-new' })).toEqual({ state: 'return-to-parameters', methodId: 'jts_compression_modulus' });
});

test('cohesive JTS package keeps Nkt and coefficients pending, then produces valid row and representative values after confirmation', async () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const pending = runJtsParameterPackage(
    emptyParameterWorkspace(), classification, revision,
    DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    '2026-07-11T09:00:00.000Z', 'package-pending',
  );
  expect(pending.ok).toBeTruthy();
  if (!pending.ok) return;
  expect(pending.run.checklist.find((item) => item.methodId === 'jts_gamma_sat')).toMatchObject({ status: 'complete', level: 'required' });
  expect(pending.run.checklist.find((item) => item.methodId === 'jts_su_nkt')).toMatchObject({ status: 'pending', level: 'required' });
  expect(pending.run.summary).toMatchObject({ eligibleForOutput: false, requiredPending: 1 });

  const nkt = jtsTableNktSetting('triaxial_cu', '2026-07-11T09:01:00.000Z');
  expect(nkt).not.toBeNull();
  const configured = runJtsParameterPackage(
    pending.workspace,
    classification,
    revision,
    {
      ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
      ...nkt!,
      ocrCoefficientConfirmed: true,
      sensitivityCoefficientConfirmed: true,
      materialScope: 'within_source',
      selectedOptionalMethodIds: ['jts_spt_n'],
    },
    '2026-07-11T09:02:00.000Z',
    'package-configured',
  );
  expect(configured.ok).toBeTruthy();
  if (!configured.ok) return;
  const su = configured.run.values.find((value) => value.methodId === 'jts_su_nkt');
  expect(su?.status).toBe('value');
  expect(su?.value).toBeCloseTo(classification.rows[0].qnetKpa / 13, 10);
  expect(configured.run.representativeValues.find((value) => value.methodId === 'jts_su_nkt')).toMatchObject({ validValueCount: 1, median: su?.value });
  expect(configured.run.summary.eligibleForOutput).toBeTruthy();
  expect(configured.run.checklist.find((item) => item.methodId === 'jts_spt_n')).toMatchObject({ status: 'complete', level: 'optional' });
  expect(validateJtsParameterPackageRun(configured.run)).toEqual({ ok: true });
});

test('sand package requires explicit material scope and excludes calcareous or carbonaceous sand', async () => {
  const classification = approximateClassification([{ sourceRowId: 'sand', depthM: 3, qcKpa: 8_000, fsKpa: 20 }]);
  const revision = singleLayerRevision(classification, 'sand', '砂层');
  const unknown = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, undefined, 'package-sand-unknown');
  expect(unknown.ok).toBeTruthy();
  if (!unknown.ok) return;
  expect(unknown.run.checklist.filter((item) => ['jts_phi_fine', 'jts_phi_coarse'].includes(item.methodId)).some((item) => item.status === 'pending')).toBeTruthy();
  expect(unknown.run.summary.eligibleForOutput).toBeFalsy();

  const confirmed = runJtsParameterPackage(unknown.workspace, classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    materialScope: 'within_source',
  }, undefined, 'package-sand-confirmed');
  expect(confirmed.ok).toBeTruthy();
  if (!confirmed.ok) return;
  expect(confirmed.run.checklist.find((item) => item.methodId === 'jts_phi_coarse')).toMatchObject({ status: 'complete' });
  expect(confirmed.run.summary.eligibleForOutput).toBeTruthy();

  const excluded = runJtsParameterPackage(confirmed.workspace, classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    materialScope: 'calcareous_sand',
  }, undefined, 'package-sand-excluded');
  expect(excluded.ok).toBeTruthy();
  if (!excluded.ok) return;
  expect(excluded.run.checklist.find((item) => item.methodId === 'jts_phi_coarse')).toMatchObject({ status: 'unavailable' });
  expect(excluded.run.summary.eligibleForOutput).toBeFalsy();
});

test('PROCESS125 broad sand from an alternative classifier never defaults to the fine-sand formula', () => {
  const classification = fullCptuClassification();
  classification.methodId = 'fuzzy-zhang-tumay-1999';
  classification.methodLabel = 'Zhang–Tumay Fuzzy';
  classification.rows[0].selectedClass = {
    soilClassId: 'fuzzy-sand',
    zone: 3,
    label: '砂性土',
    approximate: false,
    engineeringGroup: 'sand',
    confidenceScore: 80,
    confidenceReason: 'test fixture',
  };
  const revision = singleLayerRevision(classification, 'sand', '砂性土');
  const result = runJtsParameterPackage(
    emptyParameterWorkspace(),
    classification,
    revision,
    { ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, materialScope: 'within_source' },
    '2026-07-24T10:00:00.000Z',
    'package-alternative-broad-sand',
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.run.values.filter((value) => value.methodId === 'jts_phi_fine' || value.methodId === 'jts_phi_coarse')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ methodId: 'jts_phi_fine', status: 'pending_confirmation', value: null, reason: expect.stringContaining('不能默认') }),
      expect.objectContaining({ methodId: 'jts_phi_coarse', status: 'pending_confirmation', value: null, reason: expect.stringContaining('不能默认') }),
    ]),
  );
  expect(result.run.values.some((value) => (value.methodId === 'jts_phi_fine' || value.methodId === 'jts_phi_coarse') && value.status === 'value')).toBe(false);
});

test('silt drainage decision never silently extends a JTS cohesive or sand correlation', async () => {
  const classification = approximateClassification([{ sourceRowId: 'silt', depthM: 2, qcKpa: 900, fsKpa: 30 }]);
  classification.rows[0].selectedClass = { soilClassId: 'silt', zone: 6, label: '粉土', approximate: true };
  const revision = singleLayerRevision(classification, 'mixed', '粉土层');
  for (const decision of ['pending', 'drained', 'undrained'] as const) {
    const result = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
      ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
      siltDrainageDecision: decision,
      materialScope: 'within_source',
      ...jtsTableNktSetting('triaxial_cu')!,
    }, undefined, `package-silt-${decision}`);
    expect(result.ok).toBeTruthy();
    if (!result.ok) continue;
    expect(result.run.summary.eligibleForOutput).toBeFalsy();
    expect(result.run.values.some((value) => value.soilClassId === 'silt' && value.status === 'pending_confirmation')).toBeTruthy();
  }
});

test('silt becomes output-eligible only through an explicit manual value with frozen provenance', async () => {
  const classification = approximateClassification([{ sourceRowId: 'silt-manual', depthM: 2, qcKpa: 900, fsKpa: 30 }]);
  classification.rows[0].selectedClass = { soilClassId: 'silt', zone: 6, label: '粉土', approximate: true };
  const revision = singleLayerRevision(classification, 'mixed', '粉土层');
  const result = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    siltDrainageDecision: 'drained',
    siltManualValue: 30,
    siltManualSource: '项目试验 · 室内试验审查记录 v1',
  }, undefined, 'package-silt-manual');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.run.summary).toMatchObject({ requiredPending: 0, eligibleForOutput: true });
  expect(result.run.checklist.find((item) => item.methodId === 'manual_silt_phi')).toMatchObject({ status: 'complete', unit: '°' });
  expect(result.run.values.find((value) => value.methodId === 'manual_silt_phi')).toMatchObject({
    status: 'value',
    value: 30,
    reason: '人工来源：项目试验 · 室内试验审查记录 v1',
  });
  expect(result.run.values.find((value) => value.methodId === 'manual_silt_phi')?.notices).toContain('人工输入值，不属于 JTS 相关式计算结果。');
  expect(validateJtsParameterPackageRun(result.run)).toEqual({ ok: true });

  for (const [settings, problem] of [
    [{ siltDrainageDecision: 'drained' as const, siltManualValue: 61, siltManualSource: '项目试验 · R03' }, '粉土排水参数 φ′ 必须大于 0° 且不超过 60°。'],
    [{ siltDrainageDecision: 'undrained' as const, siltManualValue: 501, siltManualSource: '项目试验 · R03' }, '粉土不排水参数 Su 必须大于 0kPa 且不超过 500kPa。'],
    [{ siltDrainageDecision: 'drained' as const, siltManualValue: 30, siltManualSource: ' · R03' }, '粉土人工参数必须包含固定来源类别和具体报告、试验或审查编号。'],
    [{ siltDrainageDecision: 'drained' as const, siltManualValue: 30, siltManualSource: '项目试验 · ' }, '粉土人工参数必须包含固定来源类别和具体报告、试验或审查编号。'],
  ] as const) {
    expect(runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, { ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, ...settings })).toMatchObject({ ok: false, problem });
  }
});

test('guided method selection omits unselected values and keeps an explicit required skip auditable', async () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const result = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    ...jtsTableNktSetting('triaxial_cu')!,
    selectedMethodIds: ['jts_gamma_sat', 'jts_su_nkt'],
    skippedMethodDecisions: [{ methodId: 'jts_gamma_sat', reason: 'provided-by-other-test' }],
  }, undefined, 'package-guided-selection');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.run.values.map((value) => value.methodId)).toEqual(['jts_su_nkt']);
  expect(result.run.values.some((value) => value.methodId === 'jts_ocr')).toBeFalsy();
  expect(result.run.checklist.find((item) => item.methodId === 'jts_gamma_sat')).toMatchObject({
    status: 'not-selected',
    reason: '工程师已选择本次不计算：由其他试验提供。',
  });
  expect(result.run.summary).toMatchObject({ requiredComplete: 1, requiredSkipped: 1, requiredPending: 0, eligibleForOutput: true });
  expect(validateJtsParameterPackageRun(result.run)).toEqual({ ok: true });

  const invalid = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    selectedMethodIds: ['not-a-method' as 'jts_gamma_sat'],
  });
  expect(invalid).toMatchObject({ ok: false, problem: '参数方法选择无效或重复。' });

  const unresolvedRecommended = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    ...jtsTableNktSetting('triaxial_cu')!,
    selectedMethodIds: ['jts_gamma_sat', 'jts_su_nkt', 'jts_ocr'],
  });
  expect(unresolvedRecommended.ok).toBeTruthy();
  if (unresolvedRecommended.ok) expect(unresolvedRecommended.run.summary.eligibleForOutput).toBeFalsy();
});

test('package evidence is deterministic, tamper-evident, append-only on invalidation, and old current pointers clear', async () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'clay', '黏土层');
  const result = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    ...jtsTableNktSetting('triaxial_cu')!,
  }, '2026-07-11T10:00:00.000Z', 'package-authority');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  const damaged = structuredClone(result.run);
  damaged.values[0].value = (damaged.values[0].value ?? 0) + 1;
  expect(validateJtsParameterPackageRun(damaged)).toMatchObject({ ok: false });
  const stale = invalidateJtsParameterPackages(result.workspace, '分层修订已变化')!;
  expect(stale.activeJtsParameterPackageRunId).toBeNull();
  expect(stale.jtsParameterPackageRuns?.[0]).toMatchObject({ status: 'stale', staleReason: '分层修订已变化' });
  expect(stale.jtsParameterPackageRuns?.[0].values).toEqual(result.run.values);
});

test('engineer-confirmed final layer soil controls method applicability while row JTS differences remain auditable', () => {
  const classification = fullCptuClassification();
  const revision = singleLayerRevision(classification, 'sand', '工程师确认砂层');
  revision.snapshot.layers[0].soilDecision = {
    suggestedGroup: 'clay',
    finalGroup: 'sand',
    suggestedDetailedType: '黏土',
    finalDetailedType: '中砂',
    reviewStatus: 'accepted',
    reviewAction: 'manual-classification',
    source: 'manual',
    decidedAt: '2026-07-14T09:00:00.000Z',
  };
  const result = runJtsParameterPackage(emptyParameterWorkspace(), classification, revision, {
    ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
    materialScope: 'within_source',
  }, '2026-07-14T09:01:00.000Z', 'package-final-layer-authority');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.run.layerSnapshot[0]).toMatchObject({ finalDetailedType: '中砂', decisionSource: 'manual' });
  expect(result.run.checklist.find((item) => item.methodId === 'jts_phi_coarse')).toMatchObject({ status: 'complete', applicableLayerIds: ['layer-1'] });
  expect(result.run.checklist.find((item) => item.methodId === 'jts_su_nkt')?.applicableLayerIds).toEqual([]);
  expect(result.run.summary.classificationConflictCount).toBe(1);
  expect(result.run.values.some((value) => value.notices.some((notice) => notice.includes('按工程师确认土类选择方法')))).toBe(true);
  expect(validateJtsParameterPackageRun(result.run)).toEqual({ ok: true });
});

function fullCptuClassification() {
  const result = runJtsClassification(
    emptyStratificationWorkspace(), INPUT,
    [{ sourceRowId: 'row-full', depthM: 5, qcKpa: 1_200, fsKpa: 25, u2Kpa: 300 }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 10, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline', waterUnitWeightKnM3: 10 },
    { probeProfileRevisionId: 'probe', waterContextRevisionId: 'water' },
    '2026-07-11T08:30:00.000Z', 'classification-full-parameter',
  );
  if (!result.ok) throw new Error(result.problem);
  return result.run;
}

function approximateClassification(rows: Array<{ sourceRowId: string; depthM: number; qcKpa: number; fsKpa: number }>) {
  const result = runJtsClassification(
    emptyStratificationWorkspace(), INPUT, rows,
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
    { probeProfileRevisionId: 'probe', waterContextRevisionId: 'water' },
    '2026-07-11T08:31:00.000Z', `classification-${rows[0].sourceRowId}`,
  );
  if (!result.ok) throw new Error(result.problem);
  return result.run;
}

function singleLayerRevision(classification: JtsClassificationRunV4, engineeringSoilGroup: string, name: string): StratificationSchemeRevisionV2 {
  const depths = classification.rows.map((row) => row.depthM);
  const depthFromM = Math.min(...depths);
  const depthToM = Math.max(...depths) + (depths.length === 1 ? 0.5 : 0);
  return {
    revisionId: `revision-${classification.runId}`,
    schemeId: `scheme-${classification.runId}`,
    version: 1,
    snapshot: {
      schemeId: `scheme-${classification.runId}`,
      name,
      status: 'current',
      version: 1,
      input: structuredClone(INPUT),
      depthFromM,
      depthToM,
      layers: [{ layerId: 'layer-1', name, description: '', engineeringSoilGroup, reviewRequired: false, depthFromM, depthToM }],
      boundaries: [],
      origin: { kind: 'jts-classification', classificationRunId: classification.runId },
      createdAt: '2026-07-11T08:40:00.000Z',
      updatedAt: '2026-07-11T08:40:00.000Z',
    },
    committedAt: '2026-07-11T08:40:00.000Z',
  };
}
