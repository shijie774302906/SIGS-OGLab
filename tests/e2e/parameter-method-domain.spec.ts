import { expect, test } from '@playwright/test';
import golden from '../../sample_data/parameters/parameter-methods-g1b-golden.v1.json' with { type: 'json' };
import {
  beginParameterSchemeEdit,
  completeParameterInputDerivationRun,
  commitParameterSchemeEdit,
  createParameterScheme,
  emptyParameterWorkspace,
  markParameterWorkspaceStale,
  prepareParameterInputDerivationRun,
  startParameterInputDerivationRun,
  updateParameterSchemeSettings,
  validateParameterWorkspaceStructure,
} from '../../src/features/parameters/parameterDomain';
import {
  completeParameterMethodRun,
  configureParameterMethodSlot,
  createLayerRevisionRef,
  decodeEncodedNonFinite,
  evaluateJointApplicabilityV1,
  evaluatePhiPeakV1,
  evaluateSucV1,
  failParameterMethodRun,
  finalizeParameterMethodRunCancellation,
  prepareParameterMethodRun,
  registerParameterMethodEvidenceRevision,
  registerParameterReferenceTestRevision,
  requestParameterMethodRunCancellation,
  startParameterMethodRun,
  validateParameterMethodRunStructure,
} from '../../src/features/parameters/parameterMethodDomain';
import type {
  DrainageApplicabilityEvidenceV1,
  MaterialApplicabilityEvidenceV1,
  NktCalibrationAuthorityV1,
  NktCalibrationContextV1,
  NktSettingV1,
  ParameterConflictContextV1,
  ParameterInputRowV2,
  ParameterSourceLineageV2,
  ParameterWorkspaceV2,
  PenetrationRateEvidenceV1,
} from '../../src/features/parameters/parameterTypes';
import type { StratificationSchemeRevisionV2 } from '../../src/features/workspace/workspaceV2';
import { PARAMETER_METHOD_REASON_CODES_V1 } from '../../src/features/parameters/parameterTypes';
import type { ParameterLayerEvidenceInputV1 } from '../../src/features/parameters/parameterMethodDomain';
import { sha256HexSync, stableStringify } from '../../src/features/workspace/stableHash';

type JsonObject = Record<string, unknown>;

const source: ParameterSourceLineageV2 = {
  pointId: 'point-method-01',
  siteId: 'site-method-01',
  draftId: 'draft-method-01',
  batchId: 'batch-method-01',
  revisions: { source: 2, mapping: 3, unit: 4, normalization: 5, pointPlan: 6 },
  checkRunId: 'check-method-01',
  stratificationSchemeId: 'strat-method-01',
  stratificationRevisionId: 'strat-method-revision-01',
  stratificationVersion: 1,
};

test('G1B production evaluators match all 74 frozen formula, applicability, conflict, and calibration vectors', () => {
  expect(golden.schemaVersion).toBe('parameter-method-golden.v1');
  const evidence = golden.evidenceFixtures;

  for (const vector of golden.phiPeak.vectors) {
    const input = decodeEncodedNonFinite(vector.input as unknown as JsonObject);
    const refs = input.evidenceRefs as Record<string, string>;
    const evaluation = evaluatePhiPeakV1({
      ...(hasOwn(input, 'qtn') ? { qtn: input.qtn as number } : {}),
      ...(hasOwn(input, 'icRw') ? { icRw: input.icRw as number } : {}),
      layerGroup: input.layerGroup as string,
      rate: fixture(evidence.penetrationRate, refs.rate) as PenetrationRateEvidenceV1,
      drainage: fixture(evidence.drainageApplicability, refs.drainage) as DrainageApplicabilityEvidenceV1,
      material: fixture(evidence.materialApplicability, refs.material) as MaterialApplicabilityEvidenceV1,
      conflictContext: input.conflictContextRef
        ? fixture(evidence.conflictContext, input.conflictContextRef as string) as ParameterConflictContextV1
        : null,
    });
    expect(evaluation, vector.caseId).toEqual(vector.expected);
  }

  for (const vector of golden.suc.vectors) {
    const input = decodeEncodedNonFinite(vector.input as unknown as JsonObject);
    const refs = input.evidenceRefs as Record<string, string>;
    const nkt = fixture(evidence.nkt, refs.nkt, true) as NktSettingV1;
    const evaluation = evaluateSucV1({
      ...(hasOwn(input, 'qnetKpa') ? { qnetKpa: input.qnetKpa as number } : {}),
      ...(hasOwn(input, 'icRw') ? { icRw: input.icRw as number } : {}),
      layerGroup: input.layerGroup as string,
      ...(input.environment ? { environment: input.environment as 'onshore' | 'offshore' } : {}),
      ...(input.requestedStrengthMode ? { requestedStrengthMode: input.requestedStrengthMode as string } : {}),
      rate: fixture(evidence.penetrationRate, refs.rate) as PenetrationRateEvidenceV1,
      drainage: fixture(evidence.drainageApplicability, refs.drainage) as DrainageApplicabilityEvidenceV1,
      material: fixture(evidence.materialApplicability, refs.material) as MaterialApplicabilityEvidenceV1,
      nkt,
      conflictContext: input.conflictContextRef
        ? fixture(evidence.conflictContext, input.conflictContextRef as string) as ParameterConflictContextV1
        : null,
      calibrationContext: input.calibrationContextRef
        ? fixture(evidence.calibrationContext, input.calibrationContextRef as string) as NktCalibrationContextV1
        : null,
      calibrationAuthority: input.calibrationAuthorityRef
        ? fixture(evidence.calibrationAuthority, input.calibrationAuthorityRef as string) as NktCalibrationAuthorityV1
        : null,
    });
    expect(evaluation, vector.caseId).toEqual(vector.expected);
  }

  for (const vector of golden.jointApplicability.vectors) {
    const input = decodeEncodedNonFinite(vector.input as unknown as JsonObject);
    const refs = input.evidenceRefs as Record<string, string>;
    const evaluation = evaluateJointApplicabilityV1({
      ...(hasOwn(input, 'icRw') ? { icRw: input.icRw as number } : {}),
      layerGroup: input.layerGroup as string,
      drainage: fixture(evidence.drainageApplicability, refs.drainage) as DrainageApplicabilityEvidenceV1,
      conflictContext: input.conflictContextRef
        ? fixture(evidence.conflictContext, input.conflictContextRef as string) as ParameterConflictContextV1
        : null,
    });
    expect(evaluation, vector.caseId).toEqual(vector.expected);
  }

  expect(golden.phiPeak.vectors).toHaveLength(25);
  expect(golden.suc.vectors).toHaveLength(41);
  expect(golden.jointApplicability.vectors).toHaveLength(8);
  const frozenReasons = new Set([
    ...golden.phiPeak.vectors.flatMap((vector) => vector.expected.reasonCodes),
    ...golden.suc.vectors.flatMap((vector) => vector.expected.reasonCodes),
    ...golden.jointApplicability.vectors.flatMap((vector) => vector.expected.reasonCodes),
  ]);
  expect(frozenReasons.size).toBe(42);
  expect([...frozenReasons].sort()).toEqual([...PARAMETER_METHOD_REASON_CODES_V1].sort());
});

test('hardening rejects forged authority rules, wrong conflict direction, duplicate calibration pairs, and numeric overflow', () => {
  const evidence = golden.evidenceFixtures;
  const rate = fixture(evidence.penetrationRate, 'rate-standard-20-meta') as PenetrationRateEvidenceV1;
  const sand = fixture(evidence.materialApplicability, 'material-quartz-silica') as MaterialApplicabilityEvidenceV1;
  const clay = fixture(evidence.materialApplicability, 'material-clay-supported') as MaterialApplicabilityEvidenceV1;
  const conflict = fixture(evidence.conflictContext, 'conflict-current-14') as ParameterConflictContextV1;
  const resolvedUndrained = fixture(evidence.drainageApplicability, 'drainage-conflict-resolved-undrained') as DrainageApplicabilityEvidenceV1;
  const resolvedDrained = fixture(evidence.drainageApplicability, 'drainage-conflict-resolved-drained') as DrainageApplicabilityEvidenceV1;

  expect(evaluateJointApplicabilityV1({ icRw: 2.2, layerGroup: 'sand', drainage: resolvedUndrained, conflictContext: conflict }))
    .toMatchObject({ status: 'ApplicabilityUnconfirmed', reasonCodes: ['SoilClassBehaviorScreenConflict'] });
  expect(evaluateJointApplicabilityV1({ icRw: 3, layerGroup: 'clay', drainage: resolvedDrained, conflictContext: conflict }))
    .toMatchObject({ status: 'ApplicabilityUnconfirmed', reasonCodes: ['SoilClassBehaviorScreenConflict'] });

  const missingEvidenceType = structuredClone(resolvedDrained);
  missingEvidenceType.evidenceType = null;
  expect(evaluatePhiPeakV1({ qtn: 100, icRw: 2.2, layerGroup: 'sand', rate, drainage: missingEvidenceType, material: sand, conflictContext: conflict }))
    .toMatchObject({ status: 'ApplicabilityUnconfirmed', reasonCodes: ['DrainageEvidenceSupersessionMismatch'] });

  const forgedLiterature = fixture(evidence.nkt, 'nkt-literature-12', true) as NktSettingV1;
  forgedLiterature.eligibleMaterialClass = 'fissured_overconsolidated_clay';
  forgedLiterature.sourceRefs = [{ environment: 'offshore', sourceRef: 'self-declared-source' }];
  expect(evaluateSucV1({
    qnetKpa: 1200, icRw: 3, layerGroup: 'clay', environment: 'offshore', rate,
    drainage: fixture(evidence.drainageApplicability, 'drainage-undrained-site') as DrainageApplicabilityEvidenceV1,
    material: fixture(evidence.materialApplicability, 'material-fissured-oc-clay') as MaterialApplicabilityEvidenceV1,
    nkt: forgedLiterature,
  })).toMatchObject({ status: 'InvalidMethodParameter', reasonCodes: ['SucDefault12NotEligible'] });

  const wrongMode = fixture(evidence.nkt, 'nkt-site-12', true) as NktSettingV1;
  wrongMode.referenceStrengthMode = 'direct_simple_shear';
  expect(evaluateSucV1({
    qnetKpa: 867.6, icRw: 3.1, layerGroup: 'clay', rate,
    drainage: fixture(evidence.drainageApplicability, 'drainage-undrained-site') as DrainageApplicabilityEvidenceV1,
    material: clay, nkt: wrongMode,
    calibrationContext: fixture(evidence.calibrationContext, 'ctx-regular') as NktCalibrationContextV1,
    calibrationAuthority: fixture(evidence.calibrationAuthority, 'authority-regular-current') as NktCalibrationAuthorityV1,
  })).toMatchObject({ status: 'InvalidMethodParameter', reasonCodes: ['SucUnsupportedStrengthMode'] });

  const duplicatePair = fixture(evidence.nkt, 'nkt-site-12', true) as NktSettingV1;
  duplicatePair.matchedPairs = [structuredClone(duplicatePair.matchedPairs![0]), structuredClone(duplicatePair.matchedPairs![0])];
  duplicatePair.derivation = { method: 'matched_pair_ratio', aggregation: 'arithmetic_mean', pairCount: 2, derivedNkt: 12 };
  expect(evaluateSucV1({
    qnetKpa: 867.6, icRw: 3.1, layerGroup: 'clay', rate,
    drainage: fixture(evidence.drainageApplicability, 'drainage-undrained-site') as DrainageApplicabilityEvidenceV1,
    material: clay, nkt: duplicatePair,
    calibrationContext: fixture(evidence.calibrationContext, 'ctx-regular') as NktCalibrationContextV1,
    calibrationAuthority: fixture(evidence.calibrationAuthority, 'authority-regular-current') as NktCalibrationAuthorityV1,
  })).toMatchObject({ status: 'InvalidMethodParameter', reasonCodes: ['SucCalibrationEvidenceIncomplete'] });

  const tinyNkt = fixture(evidence.nkt, 'nkt-user-14', true) as NktSettingV1;
  tinyNkt.value = Number.MIN_VALUE;
  expect(evaluateSucV1({
    qnetKpa: Number.MAX_VALUE, icRw: 3, layerGroup: 'clay', rate,
    drainage: fixture(evidence.drainageApplicability, 'drainage-undrained-site') as DrainageApplicabilityEvidenceV1,
    material: clay, nkt: tinyNkt,
  })).toMatchObject({ status: 'InvalidMethodParameter', reasonCodes: ['SucInvalidNkt'], value: null });
  expect(evaluatePhiPeakV1({
    qtn: 100, icRw: 2.2, layerGroup: '砂质黏土', rate,
    drainage: fixture(evidence.drainageApplicability, 'drainage-drained-cptu') as DrainageApplicabilityEvidenceV1,
    material: sand,
  })).toMatchObject({ status: 'ApplicabilityUnconfirmed', reasonCodes: ['PhiLayerGroupMismatch'] });
  expect(() => decodeEncodedNonFinite({ value: 1, encodedNonFinite: { field: 'value', kind: 'NaN' } }))
    .toThrow(/must be absent/);
  expect(registerParameterMethodEvidenceRevision(emptyParameterWorkspace(), {
    evidenceId: 'bad-rate', revisionId: 'bad-rate-rev-1', kind: 'penetration_rate',
    payload: {
      status: 'standard_confirmed', nominalRateMmPerSec: Number.NaN, unit: 'mm/s', sourceType: 'test_report',
      sourceRevisionId: 'bad-rate-source', confirmedAt: '2026-07-10T00:00:00.000Z',
    },
  })).toMatchObject({ ok: false });
});

test('method runs bind exact scheme, derivation, layer evidence, statistics, lifecycle, and immutable recomputation', async () => {
  const stratificationRevision = createStratificationRevision();
  const sandLayer = stratificationRevision.snapshot.layers[0];
  const clayLayer = stratificationRevision.snapshot.layers[1];
  const sandRef = createLayerRevisionRef(stratificationRevision.revisionId, sandLayer.layerId);
  const clayRef = createLayerRevisionRef(stratificationRevision.revisionId, clayLayer.layerId);

  const created = createParameterScheme(
    emptyParameterWorkspace(),
    source,
    '参数方法完整流程',
    '2026-07-10T10:00:00.000Z',
    'parameter-method-scheme',
  );
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const withPhi = configureParameterMethodSlot(created.workspace, {
    slotId: 'slot-phi-peak',
    parameterKey: 'PhiDeg',
    targetScope: { layerIds: [sandLayer.layerId], depthFromM: 0, depthToM: 5, excludedIntervals: [] },
    settings: { kind: 'phi_peak_qtn_v1' },
  });
  expect(withPhi.ok).toBe(true);
  if (!withPhi.ok) return;
  const withSuc = configureParameterMethodSlot(withPhi.workspace, {
    slotId: 'slot-suc',
    parameterKey: 'SuKpa',
    targetScope: { layerIds: [clayLayer.layerId], depthFromM: 5, depthToM: 10, excludedIntervals: [] },
    settings: {
      kind: 'suc_qnet_nkt_v1',
      requestedStrengthMode: 'triaxial_compression',
      nktByLayer: [{
        layerId: clayLayer.layerId,
        layerRevisionRef: clayRef,
        setting: literatureNkt12(),
      }],
    },
  });
  expect(withSuc.ok).toBe(true);
  if (!withSuc.ok) return;
  const withSiteSuc = configureParameterMethodSlot(withSuc.workspace, {
    slotId: 'slot-suc-site',
    parameterKey: 'SuKpa',
    targetScope: { layerIds: [clayLayer.layerId], depthFromM: 5, depthToM: 10, excludedIntervals: [] },
    settings: {
      kind: 'suc_qnet_nkt_v1',
      requestedStrengthMode: 'triaxial_compression',
      nktByLayer: [{ layerId: clayLayer.layerId, layerRevisionRef: clayRef, setting: siteNkt12(clayRef) }],
    },
  });
  expect(withSiteSuc.ok).toBe(true);
  if (!withSiteSuc.ok) return;
  const committed = commitParameterSchemeEdit(
    withSiteSuc.workspace,
    source,
    '2026-07-10T10:01:00.000Z',
    'parameter-method-revision',
  );
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;

  const inputRows: ParameterInputRowV2[] = [
    { sourceRowId: 'row-sand-200', depthM: 2, qcKpa: 5300, qtKpa: 5500, fsKpa: 50, u2Kpa: 200, importedFrPercent: 0.95 },
    { sourceRowId: 'row-layer-interface-500', depthM: 5, qcKpa: 2500, qtKpa: 2600, fsKpa: 100, u2Kpa: 500, importedFrPercent: 4.3 },
    { sourceRowId: 'row-clay-600', depthM: 6, qcKpa: 2500, qtKpa: null, fsKpa: 100, u2Kpa: 500, importedFrPercent: 4.4 },
  ];
  const preparedDerivation = await prepareParameterInputDerivationRun(
    committed.workspace,
    committed.revision.revisionId,
    inputRows,
    20,
    'command-derive-method',
    '2026-07-10T10:02:00.000Z',
    'derivation-method-current',
  );
  expect(preparedDerivation.ok).toBe(true);
  if (!preparedDerivation.ok) return;
  const startedDerivation = startParameterInputDerivationRun(preparedDerivation.workspace, preparedDerivation.run.runId, '2026-07-10T10:03:00.000Z');
  expect(startedDerivation.ok).toBe(true);
  if (!startedDerivation.ok) return;
  const completedDerivation = completeParameterInputDerivationRun(startedDerivation.workspace, preparedDerivation.run.runId, '2026-07-10T10:04:00.000Z');
  expect(completedDerivation.ok).toBe(true);
  if (!completedDerivation.ok) return;
  expect(completedDerivation.run.derivedRows[0]).toMatchObject({ status: 'valid' });
  expect(completedDerivation.run.derivedRows[2].ic).toBeGreaterThan(2.6);
  const sandAuthority = addLayerEvidence(
    completedDerivation.workspace, sandLayer.layerId, sandRef, 'sand', 'drained', 'base-sand',
  );
  const clayAuthority = addLayerEvidence(
    sandAuthority.workspace, clayLayer.layerId, clayRef, 'clay', 'undrained', 'base-clay',
  );
  const referenceAuthority = registerParameterReferenceTestRevision(clayAuthority.workspace, {
    testId: 'CAUC-METHOD-01',
    revisionId: 'CAUC-METHOD-01@rev-1',
    projectId: 'project-method-01',
    siteId: 'site-method-01',
    pointId: source.pointId,
    materialClass: 'soft_firm_nc_loc_intact_clay',
    depthM: 6,
    testType: 'CAUC',
    strengthMode: 'triaxial_compression',
    failureCriterion: 'half_maximum_deviator_stress',
    sucKpa: 2291 / 12,
    createdAt: '2026-07-10T10:04:30.000Z',
  });
  expect(referenceAuthority.ok).toBe(true);
  if (!referenceAuthority.ok) return;

  const phiPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01',
    workspace: referenceAuthority.workspace,
    schemeRevisionId: committed.revision.revisionId,
    derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak',
    stratificationRevision,
    layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-phi',
    now: '2026-07-10T10:05:00.000Z',
    runId: 'method-run-phi',
  });
  expect(phiPrepared.ok).toBe(true);
  if (!phiPrepared.ok) return;
  const phiStarted = startParameterMethodRun(phiPrepared.workspace, phiPrepared.run.runId, '2026-07-10T10:06:00.000Z');
  expect(phiStarted.ok).toBe(true);
  if (!phiStarted.ok) return;
  const phiCompleted = completeParameterMethodRun(phiStarted.workspace, phiPrepared.run.runId, '2026-07-10T10:07:00.000Z');
  expect(phiCompleted.ok).toBe(true);
  if (!phiCompleted.ok) return;
  expect(phiCompleted.run.values).toHaveLength(1);
  expect(phiCompleted.run.inputRowsSnapshot.map((row) => row.sourceRowId)).not.toContain('row-layer-interface-500');
  expect(phiCompleted.run.values[0]).toMatchObject({ status: 'Valid', reasonCodes: ['PhiValid'], eligibleForCurrentResult: true });
  expect(phiCompleted.run.layerSummaries[0]).toMatchObject({ eligibleValueCount: 1, problemValueCount: 0, trialOnlyValueCount: 0 });
  const phiReused = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: phiCompleted.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision,
    layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-phi', runId: 'ignored-reused-id',
  });
  expect(phiReused).toMatchObject({ ok: true, reused: true, run: { runId: 'method-run-phi' } });

  const sucPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01',
    workspace: phiCompleted.workspace,
    schemeRevisionId: committed.revision.revisionId,
    derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-suc',
    stratificationRevision,
    layerEvidence: [clayAuthority.evidence],
    commandId: 'command-method-suc',
    now: '2026-07-10T10:08:00.000Z',
    runId: 'method-run-suc',
  });
  expect(sucPrepared.ok).toBe(true);
  if (!sucPrepared.ok) return;
  const sucStarted = startParameterMethodRun(sucPrepared.workspace, sucPrepared.run.runId, '2026-07-10T10:09:00.000Z');
  expect(sucStarted.ok).toBe(true);
  if (!sucStarted.ok) return;
  const sucCompleted = completeParameterMethodRun(sucStarted.workspace, sucPrepared.run.runId, '2026-07-10T10:10:00.000Z');
  expect(sucCompleted.ok).toBe(true);
  if (!sucCompleted.ok) return;
  expect(sucCompleted.run.values.find((value) => value.sourceRowId === 'row-clay-600')).toMatchObject({
    status: 'ValidWithNotice',
    reasonCodes: ['SucLiteratureAssumptionUncalibrated'],
    eligibleForCurrentResult: true,
  });
  expect(sucCompleted.run.inputRowsSnapshot.find((row) => row.sourceRowId === 'row-layer-interface-500'))
    .toMatchObject({ layerId: clayLayer.layerId, layerRevisionRef: clayRef });
  expect(sucCompleted.run.layerSummaries[0]).toMatchObject({ eligibleValueCount: 1, noticeValueCount: 1, problemValueCount: 1 });
  expect(sucCompleted.run.resultHash).toHaveLength(64);
  expect(validateParameterWorkspaceStructure(sucCompleted.workspace)).toEqual({ ok: true });
  expect(validateParameterMethodRunStructure(sucCompleted.run, sucCompleted.workspace, stratificationRevision)).toEqual({ ok: true });

  const sitePrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: sucCompleted.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-suc-site', stratificationRevision, layerEvidence: [clayAuthority.evidence],
    commandId: 'command-method-suc-site', runId: 'method-run-suc-site',
  });
  expect(sitePrepared.ok).toBe(true);
  if (!sitePrepared.ok) return;
  const siteStarted = startParameterMethodRun(sitePrepared.workspace, sitePrepared.run.runId);
  expect(siteStarted.ok).toBe(true);
  if (!siteStarted.ok) return;
  const siteCompleted = completeParameterMethodRun(siteStarted.workspace, sitePrepared.run.runId);
  expect(siteCompleted.ok).toBe(true);
  if (!siteCompleted.ok) return;
  expect(siteCompleted.run.values.find((value) => value.sourceRowId === 'row-clay-600'))
    .toMatchObject({ status: 'Valid', reasonCodes: ['SucValid'], eligibleForCurrentResult: true });
  const deletedInputWorkspace = structuredClone(siteCompleted.workspace);
  const deletedInputRun = deletedInputWorkspace.parameterRuns.find((run) => run.runId === 'method-run-phi')!;
  deletedInputRun.inputRowsSnapshot = [];
  deletedInputRun.inputHash = sha256HexSync(stableStringify(deletedInputRun.inputRowsSnapshot));
  deletedInputRun.idempotencyKey = sha256HexSync(stableStringify({
    commandId: deletedInputRun.commandId,
    schemeRevisionId: deletedInputRun.schemeRevisionId,
    derivationRunId: deletedInputRun.derivationRunId,
    slotId: deletedInputRun.slotId,
    sourceLineageHash: deletedInputRun.sourceLineageHash,
    formulaSpecHash: deletedInputRun.formulaSpecHash,
    settingsHash: deletedInputRun.settingsHash,
    evidenceHash: deletedInputRun.evidenceHash,
    inputHash: deletedInputRun.inputHash,
  }));
  deletedInputRun.status = 'running';
  deletedInputRun.values = [];
  deletedInputRun.layerSummaries = [];
  deletedInputRun.summary = null;
  deletedInputRun.issues = [];
  deletedInputRun.resultHash = null;
  delete deletedInputRun.completedAt;
  const deletedInputCompleted = completeParameterMethodRun(deletedInputWorkspace, deletedInputRun.runId);
  expect(deletedInputCompleted).toMatchObject({ ok: false, problem: /complete ordered input row set/ });
  const forgedCalibration = structuredClone(siteCompleted.workspace);
  const forgedRevision = forgedCalibration.revisions.find((revision) => revision.revisionId === committed.revision.revisionId);
  const forgedSiteSlot = forgedRevision?.snapshot.slots.find((slot) => slot.slotId === 'slot-suc-site');
  if (!forgedSiteSlot || !('kind' in forgedSiteSlot.settings) || forgedSiteSlot.settings.kind !== 'suc_qnet_nkt_v1') {
    throw new Error('Site calibration slot is required.');
  }
  forgedSiteSlot.settings.nktByLayer[0].setting.matchedPairs![0].qnetKpa += 1;
  expect(prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: forgedCalibration,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-suc-site', stratificationRevision, layerEvidence: [clayAuthority.evidence],
    commandId: 'command-method-forged-calibration', runId: 'method-run-forged-calibration',
  })).toMatchObject({ ok: false, problem: /校准数据对/ });

  const trialAuthority = addLayerEvidence(
    siteCompleted.workspace, sandLayer.layerId, sandRef, 'sand', 'drained', 'trial-sand', 'scope_unknown',
  );
  const trialPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: trialAuthority.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision, layerEvidence: [trialAuthority.evidence],
    commandId: 'command-method-phi-trial', runId: 'method-run-phi-trial',
  });
  expect(trialPrepared.ok).toBe(true);
  if (!trialPrepared.ok) return;
  const trialStarted = startParameterMethodRun(trialPrepared.workspace, trialPrepared.run.runId);
  expect(trialStarted.ok).toBe(true);
  if (!trialStarted.ok) return;
  const trialCompleted = completeParameterMethodRun(trialStarted.workspace, trialPrepared.run.runId);
  expect(trialCompleted.ok).toBe(true);
  if (!trialCompleted.ok) return;
  expect(trialCompleted.run.layerSummaries[0]).toMatchObject({
    numericValueCount: 1,
    eligibleValueCount: 0,
    trialOnlyValueCount: 1,
    eligibleMinimum: null,
    eligibleMaximum: null,
    eligibleMean: null,
  });

  const blockedAuthority = addLayerEvidence(
    trialCompleted.workspace, sandLayer.layerId, sandRef, 'sand', 'drained', 'blocked-sand',
    'within_source_scope', 'known_nonstandard',
  );
  const blockedPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: blockedAuthority.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision, layerEvidence: [blockedAuthority.evidence],
    commandId: 'command-method-phi-blocked', runId: 'method-run-phi-blocked',
  });
  expect(blockedPrepared.ok).toBe(true);
  if (!blockedPrepared.ok) return;
  const blockedStarted = startParameterMethodRun(blockedPrepared.workspace, blockedPrepared.run.runId);
  expect(blockedStarted.ok).toBe(true);
  if (!blockedStarted.ok) return;
  const blockedCompleted = completeParameterMethodRun(blockedStarted.workspace, blockedPrepared.run.runId);
  expect(blockedCompleted.ok).toBe(true);
  if (!blockedCompleted.ok) return;
  expect(blockedCompleted.run.layerSummaries[0]).toMatchObject({
    numericValueCount: 0, eligibleValueCount: 0, problemValueCount: 1, eligibleMean: null,
  });

  const cancelPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: blockedCompleted.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision,
    layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-cancel', runId: 'method-run-cancel',
  });
  expect(cancelPrepared.ok).toBe(true);
  if (!cancelPrepared.ok) return;
  const cancelStarted = startParameterMethodRun(cancelPrepared.workspace, cancelPrepared.run.runId);
  expect(cancelStarted.ok).toBe(true);
  if (!cancelStarted.ok) return;
  const cancelRequested = requestParameterMethodRunCancellation(cancelStarted.workspace, cancelPrepared.run.runId);
  expect(cancelRequested.ok).toBe(true);
  if (!cancelRequested.ok) return;
  const cancelled = finalizeParameterMethodRunCancellation(cancelRequested.workspace, cancelPrepared.run.runId);
  expect(cancelled).toMatchObject({ ok: true, run: { status: 'cancelled', values: [], resultHash: null } });
  if (!cancelled.ok) return;

  const failPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: cancelled.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision,
    layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-fail', runId: 'method-run-fail',
  });
  expect(failPrepared.ok).toBe(true);
  if (!failPrepared.ok) return;
  const failed = failParameterMethodRun(failPrepared.workspace, failPrepared.run.runId, 'INJECTED', 'Injected failure');
  expect(failed).toMatchObject({ ok: true, run: { status: 'failed', values: [], resultHash: null } });
  if (!failed.ok) return;

  const historyEdit = beginParameterSchemeEdit(failed.workspace, committed.scheme.schemeId, source, '2026-07-10T10:11:10.000Z');
  expect(historyEdit.ok).toBe(true);
  if (!historyEdit.ok) return;
  const historyChanged = updateParameterSchemeSettings(historyEdit.workspace, { netAreaRatio: 0.81 }, '2026-07-10T10:11:20.000Z');
  expect(historyChanged.ok).toBe(true);
  if (!historyChanged.ok) return;
  const historyCommitted = commitParameterSchemeEdit(
    historyChanged.workspace, source, '2026-07-10T10:11:30.000Z', 'parameter-method-revision-v2',
  );
  expect(historyCommitted.ok).toBe(true);
  if (!historyCommitted.ok) return;
  expect(prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: historyCommitted.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision, layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-history-rejected', runId: 'method-run-history-rejected',
  })).toMatchObject({ ok: false, problem: /当前参数方案/ });

  const openPrepared = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: failed.workspace,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision, layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-open-at-stale', runId: 'method-run-open-at-stale',
  });
  expect(openPrepared.ok).toBe(true);
  if (!openPrepared.ok) return;
  const openStarted = startParameterMethodRun(openPrepared.workspace, openPrepared.run.runId);
  expect(openStarted.ok).toBe(true);
  if (!openStarted.ok) return;
  const stale = markParameterWorkspaceStale(openStarted.workspace, '上游精确分层修订已变化。', '2026-07-10T10:12:00.000Z');
  expect(stale?.schemes.find((scheme) => scheme.schemeId === committed.scheme.schemeId)?.status).toBe('stale');
  expect(stale?.parameterRuns).toHaveLength(8);
  expect(stale?.parameterRuns.find((run) => run.runId === 'method-run-open-at-stale')).toMatchObject({
    status: 'invalidated', resultHash: null, invalidationReason: '上游精确分层修订已变化。',
  });
  expect(completeParameterMethodRun(stale!, 'method-run-open-at-stale')).toMatchObject({ ok: false });
  const staleAttempt = prepareParameterMethodRun({
    projectId: 'project-method-01', workspace: stale!,
    schemeRevisionId: committed.revision.revisionId, derivationRunId: completedDerivation.run.runId,
    slotId: 'slot-phi-peak', stratificationRevision,
    layerEvidence: [sandAuthority.evidence],
    commandId: 'command-method-after-stale', runId: 'method-run-after-stale',
  });
  expect(staleAttempt).toMatchObject({ ok: false });

  const forgedResult = structuredClone(sucCompleted.workspace);
  forgedResult.parameterRuns[1].values[0].value = 999;
  expect(validateParameterWorkspaceStructure(forgedResult)).toMatchObject({ ok: false });
  const forgedEvidence = structuredClone(sucCompleted.workspace);
  forgedEvidence.parameterRuns[1].evidenceSnapshot[0].rate.nominalRateMmPerSec = 10;
  expect(validateParameterWorkspaceStructure(forgedEvidence)).toMatchObject({ ok: false });
  const forgedSettings = structuredClone(sucCompleted.workspace);
  if (forgedSettings.parameterRuns[1].settingsSnapshot.kind === 'suc_qnet_nkt_v1') {
    forgedSettings.parameterRuns[1].settingsSnapshot.nktByLayer[0].setting.value = 99;
  }
  expect(validateParameterWorkspaceStructure(forgedSettings)).toMatchObject({ ok: false });
});

function fixture<T extends object>(bucket: T, key: string, decode = false) {
  const raw = (bucket as Record<string, JsonObject>)[key];
  if (!raw) throw new Error(`Missing golden fixture ${key}`);
  return decode ? decodeEncodedNonFinite(raw) : structuredClone(raw);
}

function hasOwn(value: object, property: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, property);
}

function createStratificationRevision(): StratificationSchemeRevisionV2 {
  return {
    revisionId: source.stratificationRevisionId,
    schemeId: source.stratificationSchemeId,
    version: source.stratificationVersion,
    committedAt: '2026-07-10T09:59:00.000Z',
    snapshot: {
      schemeId: source.stratificationSchemeId,
      name: '方法测试分层',
      status: 'current',
      version: source.stratificationVersion,
      input: {
        pointId: source.pointId,
        draftId: source.draftId,
        batchId: source.batchId,
        revisions: { ...source.revisions },
        checkRunId: source.checkRunId,
      },
      depthFromM: 0,
      depthToM: 10,
      layers: [
        { layerId: 'layer-sand', name: '砂层', description: '', engineeringSoilGroup: 'sand', reviewRequired: false, depthFromM: 0, depthToM: 5 },
        { layerId: 'layer-clay', name: '黏土层', description: '', engineeringSoilGroup: 'clay', reviewRequired: false, depthFromM: 5, depthToM: 10 },
      ],
      boundaries: [{ boundaryId: 'boundary-5', depthM: 5, upperLayerId: 'layer-sand', lowerLayerId: 'layer-clay', reviewRequired: false, note: '' }],
      createdAt: '2026-07-10T09:50:00.000Z',
      updatedAt: '2026-07-10T09:59:00.000Z',
    },
  };
}

function literatureNkt12(): NktSettingV1 {
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
    assumptionRationale: 'User explicitly selected the literature starting assumption.',
    referenceTestIds: [],
    confirmedAt: '2026-07-10T09:58:00.000Z',
  };
}

function siteNkt12(layerRevisionRef: string): NktSettingV1 {
  return {
    value: 12,
    origin: 'site_calibrated',
    targetStrengthMode: 'triaxial_compression',
    projectId: 'project-method-01',
    siteId: 'site-method-01',
    pointId: source.pointId,
    materialClass: 'soft_firm_nc_loc_intact_clay',
    calibrationRevisionId: 'nkt-method-cal-rev-1',
    referenceStrengthMode: 'CAUC',
    failureCriterion: 'half_maximum_deviator_stress',
    applicableLayerRevisionRefs: [layerRevisionRef],
    inputDerivationRunId: 'derivation-method-current',
    matchedPairs: [{
      pairId: 'pair-method-1',
      depthM: 6,
      qnetKpa: 2291,
      sucKpa: 2291 / 12,
      sourceRowId: 'row-clay-600',
      inputDerivationRunId: 'derivation-method-current',
      referenceTestId: 'CAUC-METHOD-01',
      referenceTestRevisionId: 'CAUC-METHOD-01@rev-1',
      matchBasis: 'same_site_matched_elevation',
    }],
    referenceTestIds: ['CAUC-METHOD-01'],
    derivation: { method: 'matched_pair_ratio', aggregation: 'single_pair', pairCount: 1, derivedNkt: 12 },
    confirmedAt: '2026-07-10T10:04:20.000Z',
  };
}

function addLayerEvidence(
  workspace: ParameterWorkspaceV2,
  layerId: string,
  layerRevisionRef: string,
  layerGroup: 'sand' | 'clay',
  drainageMode: 'drained' | 'undrained',
  prefix: string,
  materialStatus: MaterialApplicabilityEvidenceV1['status'] = 'within_source_scope',
  rateStatus: PenetrationRateEvidenceV1['status'] = 'standard_confirmed',
): { workspace: ParameterWorkspaceV2; evidence: ParameterLayerEvidenceInputV1 } {
  const rate = registerParameterMethodEvidenceRevision(workspace, {
    evidenceId: `${prefix}:rate`,
    revisionId: `${prefix}:rate:rev:1`,
    kind: 'penetration_rate',
    payload: {
      status: rateStatus,
      nominalRateMmPerSec: rateStatus === 'known_nonstandard' ? 10 : rateStatus === 'missing' ? null : 20,
      unit: 'mm/s',
      sourceType: rateStatus === 'missing' ? null : 'test_report',
      sourceRevisionId: rateStatus === 'missing' ? null : `${prefix}:rate-source:1`,
      confirmedAt: rateStatus === 'missing' ? null : '2026-07-10T09:55:00.000Z',
    },
  });
  if (!rate.ok) throw new Error(rate.problem);
  const drainage = registerParameterMethodEvidenceRevision(rate.workspace, {
    evidenceId: `${prefix}:drainage`,
    revisionId: `${prefix}:drainage:rev:1`,
    kind: 'drainage_applicability',
    payload: {
      status: drainageMode === 'drained' ? 'confirmed_drained' : 'confirmed_undrained',
      evidenceType: 'cptu_pore_pressure_response',
      sourceRevisionId: `${prefix}:drainage-source:1`,
      confirmedAt: '2026-07-10T09:56:00.000Z',
      note: 'Independent CPTU evidence for the method-domain flow.',
    },
  });
  if (!drainage.ok) throw new Error(drainage.problem);
  const material = registerParameterMethodEvidenceRevision(drainage.workspace, {
    evidenceId: `${prefix}:material`,
    revisionId: `${prefix}:material:rev:1`,
    kind: 'material_applicability',
    payload: {
      status: materialStatus,
      materialClass: materialStatus === 'scope_unknown'
        ? 'unknown'
        : layerGroup === 'sand' ? 'quartz_silica_uncemented_sand' : 'soft_firm_nc_loc_intact_clay',
      sourceRevisionId: `${prefix}:material-source:1`,
      confirmedAt: '2026-07-10T09:57:00.000Z',
      note: 'Material evidence for the method-domain flow.',
    },
  });
  if (!material.ok) throw new Error(material.problem);
  return { workspace: material.workspace, evidence: {
    layerId,
    layerRevisionRef,
    layerGroup,
    environment: 'offshore',
    evidenceRevisionRefs: {
      rate: rate.revision.revisionId,
      drainage: drainage.revision.revisionId,
      material: material.revision.revisionId,
      conflictContext: null,
    },
  } };
}
