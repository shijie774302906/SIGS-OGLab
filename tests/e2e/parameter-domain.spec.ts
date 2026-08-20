import { expect, test } from '@playwright/test';
import golden from '../../sample_data/parameters/parameter-input-derivation-v1-golden.json' with { type: 'json' };
import {
  beginParameterSchemeEdit,
  commitParameterSchemeEdit,
  completeParameterInputDerivationRun,
  createDefaultParameterInputSettings,
  createParameterScheme,
  deriveParameterInputsV1,
  discardParameterSchemeEdit,
  duplicateParameterScheme,
  emptyParameterWorkspace,
  failParameterInputDerivationRun,
  finalizeParameterInputDerivationCancellation,
  findReusableCompletedDerivationRun,
  markParameterWorkspaceStale,
  prepareParameterInputDerivationRun,
  renameParameterSchemeDraft,
  requestParameterInputDerivationCancellation,
  restoreParameterScheme,
  softDeleteParameterScheme,
  startParameterInputDerivationRun,
  updateParameterSchemeSettings,
  validateParameterInputSettings,
  validateParameterWorkspaceStructure,
} from '../../src/features/parameters/parameterDomain';
import type {
  ParameterInputRowV2,
  ParameterInputSettingsV2,
  ParameterSourceLineageV2,
} from '../../src/features/parameters/parameterTypes';
import {
  PARAMETER_INPUT_DERIVATION_ALGORITHM_ID,
  PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION,
} from '../../src/features/parameters/parameterTypes';
import { sha256HexSync } from '../../src/features/workspace/stableHash';

const source: ParameterSourceLineageV2 = {
  pointId: 'point-parameter-01',
  draftId: 'draft-parameter-01',
  batchId: 'batch-parameter-01',
  revisions: { source: 2, mapping: 3, unit: 4, normalization: 5, pointPlan: 6 },
  checkRunId: 'check-parameter-01',
  stratificationSchemeId: 'stratification-parameter-01',
  stratificationRevisionId: 'stratification-parameter-01:revision:1',
  stratificationVersion: 1,
};

test('parameter input derivation v1 matches independent golden vectors at every iteration', () => {
  expect(golden.algorithmId).toBe(PARAMETER_INPUT_DERIVATION_ALGORITHM_ID);
  expect(golden.algorithmVersion).toBe(PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION);
  expect(sha256HexSync('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const settings = golden.settings as ParameterInputSettingsV2;
  for (const vector of golden.vectors) {
    const result = deriveParameterInputsV1([vector.input as ParameterInputRowV2], vector.waterDepthM, settings);
    expect(result.ok, vector.caseId).toBe(true);
    if (!result.ok) continue;
    const row = result.rows[0];
    expect(row.status, vector.caseId).toBe('valid');
    expect(row.qtSource, vector.caseId).toBe(vector.expected.qtSource);
    expect(row.floorApplied, vector.caseId).toBe(vector.expected.floorApplied);
    for (const key of [
      'qtKpa',
      'sigmaV0Kpa',
      'u0Kpa',
      'sigmaV0EffectiveKpa',
      'qnetKpa',
      'frPercent',
      'qtn',
      'ic',
      'finalExponentN',
    ] as const) {
      expect(Math.abs((row[key] as number) - vector.expected[key]), `${vector.caseId}:${key}`)
        .toBeLessThanOrEqual(golden.oracle.finalTolerance);
    }
    expect(row.iterations).toHaveLength(settings.iterationCount);
    row.iterations.forEach((iteration, index) => {
      const expected = vector.expected.iterations[index];
      expect(iteration.iteration).toBe(expected.iteration);
      expect(Math.abs(iteration.exponentN - expected.exponentN), `${vector.caseId}:n:${index}`).toBeLessThanOrEqual(golden.oracle.intermediateTolerance);
      expect(Math.abs(iteration.qtn - expected.qtn), `${vector.caseId}:qtn:${index}`).toBeLessThanOrEqual(golden.oracle.intermediateTolerance);
      expect(Math.abs(iteration.ic - expected.ic), `${vector.caseId}:ic:${index}`).toBeLessThanOrEqual(golden.oracle.intermediateTolerance);
      expect(Math.abs(iteration.nextExponentN - expected.nextExponentN), `${vector.caseId}:next-n:${index}`).toBeLessThanOrEqual(golden.oracle.intermediateTolerance);
    });
  }
  for (const vector of golden.invalidVectors) {
    const result = deriveParameterInputsV1([vector.input as ParameterInputRowV2], vector.waterDepthM, settings);
    expect(result.ok, vector.caseId).toBe(true);
    if (result.ok) expect(result.rows[0], vector.caseId).toMatchObject(vector.expected);
  }
  for (const vector of golden.invalidSetupVectors) {
    const result = deriveParameterInputsV1([vector.input as ParameterInputRowV2], vector.waterDepthM, settings);
    expect(result).toMatchObject({ ok: false, problems: expect.arrayContaining([vector.expectedProblem]) });
  }
});

test('parameter input contracts reject invalid settings and expose row-level recovery without silent fallback', () => {
  const defaults = createDefaultParameterInputSettings();
  expect(validateParameterInputSettings(defaults)).toEqual([]);
  expect(validateParameterInputSettings({ ...defaults, netAreaRatio: 0.2 })).toContainEqual(expect.stringContaining('0.35'));
  expect(validateParameterInputSettings({ ...defaults, iterationCount: 3.5 })).toContain('迭代次数必须是整数。');
  expect(validateParameterInputSettings({
    ...defaults,
    netAreaRatio: 0.35,
    soilTotalUnitWeightKnM3: 12,
    waterUnitWeightKnM3: 9.5,
    atmosphericPressureKpa: 80,
    minEffectiveStressKpa: 1,
    iterationCount: 2,
  })).toEqual([]);
  expect(validateParameterInputSettings({
    ...defaults,
    netAreaRatio: 0.95,
    soilTotalUnitWeightKnM3: 24,
    waterUnitWeightKnM3: 10.5,
    atmosphericPressureKpa: 120,
    minEffectiveStressKpa: 25,
    iterationCount: 8,
  })).toEqual([]);
  expect(deriveParameterInputsV1([], -1, defaults)).toMatchObject({ ok: false });

  const invalidImportedQt: ParameterInputRowV2 = {
    sourceRowId: 'row-invalid-imported-qt',
    depthM: 2,
    qcKpa: 2500,
    qtKpa: -10,
    fsKpa: 25,
    u2Kpa: 300,
    importedFrPercent: 99,
  };
  const strict = deriveParameterInputsV1([invalidImportedQt], 20, defaults);
  expect(strict.ok).toBe(true);
  if (strict.ok) {
    expect(strict.rows[0]).toMatchObject({
      status: 'invalid-input',
      reasonCode: 'PAR-QT-IMPORTED-INVALID',
      qtSource: null,
    });
  }
  const explicitFallback = deriveParameterInputsV1(
    [invalidImportedQt],
    20,
    { ...defaults, qtSourcePolicy: 'derive-when-imported-invalid' },
  );
  expect(explicitFallback.ok).toBe(true);
  if (explicitFallback.ok) {
    expect(explicitFallback.rows[0]).toMatchObject({ status: 'valid', qtSource: 'derived', qtKpa: 2560 });
    expect(explicitFallback.issues).toContainEqual(expect.objectContaining({ reasonCode: 'PAR-FR-DIFFERENCE', severity: 'notice' }));
  }

  const nonPositiveQnet = deriveParameterInputsV1([{
    ...invalidImportedQt,
    sourceRowId: 'row-qnet-zero',
    qtKpa: 100,
    importedFrPercent: 1,
  }], 20, defaults);
  expect(nonPositiveQnet.ok).toBe(true);
  if (nonPositiveQnet.ok) {
    expect(nonPositiveQnet.rows[0]).toMatchObject({ status: 'undefined', reasonCode: 'PAR-QNET-NON-POSITIVE' });
  }
  const zeroFs = deriveParameterInputsV1([{ ...invalidImportedQt, qtKpa: 3000, fsKpa: 0 }], 20, defaults);
  expect(zeroFs.ok && zeroFs.rows[0]).toMatchObject({ status: 'invalid-input', reasonCode: 'PAR-FS-INVALID' });
  const nonFiniteDepth = deriveParameterInputsV1([{ ...invalidImportedQt, depthM: Number.NaN }], 20, defaults);
  expect(nonFiniteDepth.ok && nonFiniteDepth.rows[0]).toMatchObject({ status: 'invalid-input', reasonCode: 'PAR-DEPTH-INVALID' });
});

test('parameter scheme revisions preserve lifecycle, exact source, copy boundaries, soft delete, and restore', () => {
  const created = createParameterScheme(emptyParameterWorkspace(), source, '参数方案 A', '2026-07-10T01:00:00.000Z', 'parameter-a');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const renamed = renameParameterSchemeDraft(created.workspace, '参数方案 主方案', '2026-07-10T01:01:00.000Z');
  expect(renamed.ok).toBe(true);
  if (!renamed.ok) return;
  const configured = updateParameterSchemeSettings(renamed.workspace, { netAreaRatio: 0.82 }, '2026-07-10T01:02:00.000Z');
  expect(configured.ok).toBe(true);
  if (!configured.ok) return;
  const committedA = commitParameterSchemeEdit(
    configured.workspace,
    source,
    '2026-07-10T01:03:00.000Z',
    'parameter-a:revision:1',
  );
  expect(committedA.ok).toBe(true);
  if (!committedA.ok) return;
  expect(committedA.scheme).toMatchObject({ name: '参数方案 主方案', status: 'current', version: 1 });
  expect(committedA.revision.snapshot.inputSettings.netAreaRatio).toBe(0.82);

  const editingA = beginParameterSchemeEdit(committedA.workspace, 'parameter-a', source, '2026-07-10T01:04:00.000Z');
  expect(editingA.ok).toBe(true);
  if (!editingA.ok) return;
  const changedA = updateParameterSchemeSettings(editingA.workspace, { netAreaRatio: 0.84 }, '2026-07-10T01:05:00.000Z');
  expect(changedA.ok).toBe(true);
  if (!changedA.ok) return;
  const resumedA = beginParameterSchemeEdit(changedA.workspace, 'parameter-a', source, '2026-07-10T01:05:30.000Z');
  expect(resumedA).toMatchObject({ ok: true, resumed: true });
  if (!resumedA.ok) return;
  expect(resumedA.workspace.editSession?.working.inputSettings.netAreaRatio).toBe(0.84);
  const committedA2 = commitParameterSchemeEdit(
    resumedA.workspace,
    source,
    '2026-07-10T01:06:00.000Z',
    'parameter-a:revision:2',
  );
  expect(committedA2.ok).toBe(true);
  if (!committedA2.ok) return;
  expect(committedA2.workspace.revisions.find((revision) => revision.revisionId === 'parameter-a:revision:1')?.snapshot.inputSettings.netAreaRatio).toBe(0.82);
  expect(committedA2.workspace.revisions.find((revision) => revision.revisionId === 'parameter-a:revision:2')?.snapshot.inputSettings.netAreaRatio).toBe(0.84);

  const copied = duplicateParameterScheme(
    committedA2.workspace,
    'parameter-a',
    source,
    '参数方案 B',
    '2026-07-10T01:07:00.000Z',
    'parameter-b',
  );
  expect(copied.ok).toBe(true);
  if (!copied.ok) return;
  expect(copied.workspace.derivationRuns).toEqual([]);
  expect(copied.scheme.inputSettings.netAreaRatio).toBe(0.84);
  const committedB = commitParameterSchemeEdit(
    copied.workspace,
    source,
    '2026-07-10T01:08:00.000Z',
    'parameter-b:revision:1',
  );
  expect(committedB.ok).toBe(true);
  if (!committedB.ok) return;
  expect(committedB.workspace.schemes.find((scheme) => scheme.schemeId === 'parameter-a')?.status).toBe('history');
  expect(softDeleteParameterScheme(committedB.workspace, 'parameter-a', 'parameter-b')).toMatchObject({ ok: false, problem: /只有删除当前/ });
  expect(softDeleteParameterScheme(committedB.workspace, 'parameter-b', 'parameter-b')).toMatchObject({ ok: false, problem: /不能作为自己的替代/ });
  expect(softDeleteParameterScheme(committedB.workspace, 'parameter-b')).toMatchObject({ ok: false });
  const deleted = softDeleteParameterScheme(
    committedB.workspace,
    'parameter-b',
    'parameter-a',
    '2026-07-10T01:09:00.000Z',
  );
  expect(deleted.ok).toBe(true);
  if (!deleted.ok) return;
  expect(deleted.workspace.schemes.find((scheme) => scheme.schemeId === 'parameter-b')?.status).toBe('deleted');
  const restored = restoreParameterScheme(deleted.workspace, 'parameter-b', '2026-07-10T01:10:00.000Z');
  expect(restored.ok).toBe(true);
  if (!restored.ok) return;
  expect(restored.workspace.schemes.find((scheme) => scheme.schemeId === 'parameter-b')?.status).toBe('history');
  expect(validateParameterWorkspaceStructure(restored.workspace)).toEqual({ ok: true });

  const newDraft = createParameterScheme(undefined, source, '放弃方案', '2026-07-10T01:11:00.000Z', 'parameter-discard');
  expect(newDraft.ok).toBe(true);
  if (newDraft.ok) expect(discardParameterSchemeEdit(newDraft.workspace).workspace.schemes).toEqual([]);

  const rolledBack = structuredClone(committedA2.workspace);
  const oldRevision = rolledBack.revisions.find((revision) => revision.revisionId === 'parameter-a:revision:1');
  if (!oldRevision) throw new Error('Old revision is required.');
  rolledBack.schemes = [{ ...structuredClone(oldRevision.snapshot), status: 'current' }];
  rolledBack.currentSchemeId = 'parameter-a';
  rolledBack.activeSchemeId = 'parameter-a';
  expect(validateParameterWorkspaceStructure(rolledBack)).toMatchObject({ ok: false, detail: /latest immutable revision/ });
});

test('derivation runs are immutable, idempotent, cancellable, and never retain partial results', async () => {
  const committed = committedWorkspace();
  const rows = golden.vectors.map((vector) => vector.input as ParameterInputRowV2);
  const prepared = await prepareParameterInputDerivationRun(
    committed,
    'parameter-run-scheme:revision:1',
    rows,
    20,
    'command-derive-001',
    '2026-07-10T02:00:00.000Z',
    'derivation-run-001',
  );
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepared.reused).toBe(false);
  const retry = await prepareParameterInputDerivationRun(
    prepared.workspace,
    'parameter-run-scheme:revision:1',
    rows,
    20,
    'command-derive-001',
    '2026-07-10T02:00:01.000Z',
    'must-not-be-created',
  );
  expect(retry).toMatchObject({ ok: true, reused: true, run: { runId: 'derivation-run-001' } });
  if (!retry.ok) return;
  expect(retry.workspace.derivationRuns).toHaveLength(1);
  const changedCommandInput = await prepareParameterInputDerivationRun(
    retry.workspace,
    'parameter-run-scheme:revision:1',
    [{ ...rows[0], depthM: 9 }],
    20,
    'command-derive-001',
  );
  expect(changedCommandInput).toMatchObject({ ok: false, problem: /同一运行命令/ });

  const started = startParameterInputDerivationRun(retry.workspace, 'derivation-run-001', '2026-07-10T02:01:00.000Z');
  expect(started.ok).toBe(true);
  if (!started.ok) return;
  const completed = completeParameterInputDerivationRun(started.workspace, 'derivation-run-001', '2026-07-10T02:02:00.000Z');
  expect(completed.ok).toBe(true);
  if (!completed.ok) return;
  expect(completed.run).toMatchObject({ status: 'completed', summary: { rowCount: 3, validCount: 3 } });
  expect(completed.run.derivedRows).toHaveLength(3);
  expect(requestParameterInputDerivationCancellation(completed.workspace, 'derivation-run-001')).toMatchObject({ ok: false });
  expect(await findReusableCompletedDerivationRun(
    completed.workspace,
    'parameter-run-scheme:revision:1',
    rows,
    20,
  )).toMatchObject({ runId: 'derivation-run-001' });
  const stale = markParameterWorkspaceStale(completed.workspace, '分层修订已变化。');
  expect(stale?.schemes.find((scheme) => scheme.schemeId === 'parameter-run-scheme')?.status).toBe('stale');
  expect(stale?.derivationRuns[0]).toMatchObject({ runId: 'derivation-run-001', status: 'completed' });
  expect(stale?.currentResultSelectionRef).toBeNull();
  if (stale) expect(validateParameterWorkspaceStructure(stale)).toEqual({ ok: true });

  const cancelPrepared = await prepareParameterInputDerivationRun(
    completed.workspace,
    'parameter-run-scheme:revision:1',
    [rows[0]],
    20,
    'command-cancel-001',
    '2026-07-10T02:03:00.000Z',
    'derivation-run-cancel',
  );
  expect(cancelPrepared.ok).toBe(true);
  if (!cancelPrepared.ok) return;
  const cancelStarted = startParameterInputDerivationRun(cancelPrepared.workspace, 'derivation-run-cancel');
  expect(cancelStarted.ok).toBe(true);
  if (!cancelStarted.ok) return;
  const requested = requestParameterInputDerivationCancellation(cancelStarted.workspace, 'derivation-run-cancel');
  expect(requested.ok).toBe(true);
  if (!requested.ok) return;
  expect(completeParameterInputDerivationRun(requested.workspace, 'derivation-run-cancel')).toMatchObject({ ok: false });
  const cancelled = finalizeParameterInputDerivationCancellation(requested.workspace, 'derivation-run-cancel');
  expect(cancelled).toMatchObject({ ok: true, run: { status: 'cancelled', derivedRows: [], summary: null } });
  if (!cancelled.ok) return;

  const failPrepared = await prepareParameterInputDerivationRun(
    cancelled.workspace,
    'parameter-run-scheme:revision:1',
    [rows[1]],
    20,
    'command-fail-001',
    '2026-07-10T02:04:00.000Z',
    'derivation-run-failed',
  );
  expect(failPrepared.ok).toBe(true);
  if (!failPrepared.ok) return;
  const failed = failParameterInputDerivationRun(failPrepared.workspace, 'derivation-run-failed', 'SAVE-FAILED', 'Injected failure');
  expect(failed).toMatchObject({ ok: true, run: { status: 'failed', derivedRows: [], summary: null } });
  if (!failed.ok) return;
  expect(validateParameterWorkspaceStructure(failed.workspace)).toEqual({ ok: true });

  const openPrepared = await prepareParameterInputDerivationRun(
    failed.workspace,
    'parameter-run-scheme:revision:1',
    [rows[2]],
    20,
    'command-open-at-stale',
    '2026-07-10T02:05:00.000Z',
    'derivation-run-open-at-stale',
  );
  expect(openPrepared.ok).toBe(true);
  if (!openPrepared.ok) return;
  const openStarted = startParameterInputDerivationRun(openPrepared.workspace, openPrepared.run.runId);
  expect(openStarted.ok).toBe(true);
  if (!openStarted.ok) return;
  const invalidated = markParameterWorkspaceStale(openStarted.workspace, '分层修订已变化。', '2026-07-10T02:06:00.000Z');
  expect(invalidated?.derivationRuns.find((run) => run.runId === openPrepared.run.runId)).toMatchObject({
    status: 'invalidated', invalidationReason: '分层修订已变化。', derivedRows: [], summary: null,
  });
  expect(completeParameterInputDerivationRun(invalidated!, openPrepared.run.runId)).toMatchObject({ ok: false });
  expect(validateParameterWorkspaceStructure(invalidated!)).toEqual({ ok: true });

  const editV2 = beginParameterSchemeEdit(failed.workspace, 'parameter-run-scheme', source, '2026-07-10T02:07:00.000Z');
  expect(editV2.ok).toBe(true);
  if (!editV2.ok) return;
  const changedV2 = updateParameterSchemeSettings(editV2.workspace, { netAreaRatio: 0.81 }, '2026-07-10T02:08:00.000Z');
  expect(changedV2.ok).toBe(true);
  if (!changedV2.ok) return;
  const committedV2 = commitParameterSchemeEdit(changedV2.workspace, source, '2026-07-10T02:09:00.000Z', 'parameter-run-scheme:revision:2');
  expect(committedV2.ok).toBe(true);
  if (!committedV2.ok) return;
  expect(await prepareParameterInputDerivationRun(
    committedV2.workspace,
    'parameter-run-scheme:revision:1',
    [rows[0]],
    20,
    'command-history-rejected',
  )).toMatchObject({ ok: false, problem: /最新精确修订/ });

  const malformed = structuredClone(completed.workspace);
  malformed.parameterRuns.push({
    runId: 'forbidden-phi-run',
    slotId: 'forbidden-slot',
    schemeRevisionId: 'parameter-run-scheme:revision:1',
    derivationRunId: 'derivation-run-001',
    methodId: 'CPTU-Param-PhiSand-Qtn-Mayne',
    methodVersion: 'v1',
    formulaReference: 'Mayne Eq. 5.6',
    settingsSnapshot: {},
    settingsHash: 'not-authorized',
    status: 'completed',
    values: [],
    createdAt: '2026-07-10T02:05:00.000Z',
    completedAt: '2026-07-10T02:05:00.000Z',
  });
  expect(validateParameterWorkspaceStructure(malformed)).toMatchObject({ ok: false });

  const unsupportedMethod = structuredClone(completed.workspace);
  const scheme = unsupportedMethod.schemes.find((candidate) => candidate.schemeId === 'parameter-run-scheme');
  if (!scheme) throw new Error('Parameter scheme is required.');
  scheme.slots.push({
    slotId: 'forbidden-phi-slot',
    parameterKey: 'PhiDeg',
    symbol: "φ'",
    unit: 'deg',
    requiredForHandoff: true,
    targetScope: { layerIds: [], depthFromM: 0, depthToM: 10, excludedIntervals: [] },
    selectedMethodId: 'CPTU-Param-PhiSand-Qtn-Mayne',
    selectedMethodVersion: 'v1',
    settings: {},
  });
  expect(validateParameterWorkspaceStructure(unsupportedMethod)).toMatchObject({ ok: false });
});

function committedWorkspace() {
  const created = createParameterScheme(
    emptyParameterWorkspace(),
    source,
    '运行方案',
    '2026-07-10T02:00:00.000Z',
    'parameter-run-scheme',
  );
  if (!created.ok) throw new Error(created.problem);
  const committed = commitParameterSchemeEdit(
    created.workspace,
    source,
    '2026-07-10T02:00:00.000Z',
    'parameter-run-scheme:revision:1',
  );
  if (!committed.ok) throw new Error(committed.problem);
  return committed.workspace;
}
