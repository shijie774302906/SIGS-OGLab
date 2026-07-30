import type { ArtifactDependency } from '../workspace/workspaceV2';

export const PARAMETER_INPUT_DERIVATION_ALGORITHM_ID = 'CPTU-Input-Derivation-Mayne-FirstPass';
export const PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION = 'v1';

export const PARAMETER_PHI_PEAK_METHOD_ID = 'CPTU-Param-PhiSand-Qtn-Mayne';
export const PARAMETER_PHI_PEAK_METHOD_VERSION = 'v1';
export const PARAMETER_SUC_METHOD_ID = 'CPTU-Param-Su-Nkt-MayneLunne';
export const PARAMETER_SUC_METHOD_VERSION = 'v1';

export const PARAMETER_METHOD_REASON_CODES_V1 = [
  'DrainageEvidenceSuperseded',
  'DrainageEvidenceSupersessionMismatch',
  'PhiDrainageBasisMissing',
  'PhiDrainageResolutionMismatch',
  'PhiKnownExtrapolation',
  'PhiKnownNonstandardRate',
  'PhiLayerGroupMismatch',
  'PhiMaterialOutsideSource',
  'PhiMaterialScopeUnknown',
  'PhiMaterialSourceDeviation',
  'PhiMissingIc',
  'PhiMissingQtn',
  'PhiNonFiniteIc',
  'PhiNonFiniteQtn',
  'PhiNonPositiveQtn',
  'PhiOutsideSourceQtnRange',
  'PhiRateBasisMissing',
  'PhiTransitionIc',
  'PhiValid',
  'SoilClassBehaviorScreenConflict',
  'SucCalibrationEvidenceIncomplete',
  'SucCalibrationScopeMismatch',
  'SucCalibrationSourceStale',
  'SucDefault12NotEligible',
  'SucDrainageResolutionMismatch',
  'SucIcScreenConflict',
  'SucIcScreenUnavailable',
  'SucInvalidNkt',
  'SucKnownNonstandardRate',
  'SucLayerGroupMismatch',
  'SucLiteratureAssumptionUncalibrated',
  'SucMaterialOutsideSource',
  'SucMissingQnet',
  'SucNktBasisMissing',
  'SucNktConfirmationMissing',
  'SucNonFiniteQnet',
  'SucNonPositiveQnet',
  'SucRateBasisMissing',
  'SucUndrainedBasisMissing',
  'SucUnsupportedStrengthMode',
  'SucUserDefinedAssumptionUncalibrated',
  'SucValid',
] as const;

export type ParameterMethodReasonCodeV1 = typeof PARAMETER_METHOD_REASON_CODES_V1[number];

export const PARAMETER_INPUT_DERIVATION_SPEC = [
  'input-units:z,waterDepth=m;qc,qt,u2,fs,pa,sigma,qnet=kPa;gamma=kN/m3;Fr,Qtn,Ic,n=dimensionless',
  'valid-domains:z>=0;waterDepth>=0;fs>0;qnet>0;Fr>0;Qtn>0;all-consumed-values-finite',
  'settings:a_net=[0.35,0.95];gamma_t=[12,24];gamma_w=[9.5,10.5];pa=[80,120];effective-floor=[1,25];iterations=integer[2,8]',
  'qt=imported-valid-positive-or-qc+(1-a_net)*u2',
  'qt-policy:missing-imported-may-derive;invalid-imported-is-problem-unless-explicit-derive-when-imported-invalid',
  'imported-Fr=is-comparison-evidence-only;calculation-Fr=100*fs/qnet',
  'sigma_v0=waterDepth*gamma_w+z*gamma_t',
  'u0=(waterDepth+z)*gamma_w',
  "sigma_v0_effective=max(minEffectiveStress,sigma_v0-u0)",
  'qnet=qt-sigma_v0',
  'Fr=100*fs/qnet',
  'n0=1',
  'repeat:Qtn=(qnet/pa)/(sigma_v0_effective/pa)^n;Ic=sqrt((3.47-log10(Qtn))^2+(1.22+log10(Fr))^2);n=min(1,0.381*Ic+0.05*(sigma_v0_effective/pa)-0.15)',
  'return-Qtn-and-Ic-from-last-completed-iteration',
  'row-status:invalid-input-for-depth,qt,fs;undefined-for-nonpositive-qnet,Fr,Qtn-or-invalid-Ic-domain',
].join('\n');

export type ParameterKeyV2 = 'PhiDeg' | 'SuKpa';

export type ParameterQtSourcePolicyV2 = 'derive-only-when-missing' | 'derive-when-imported-invalid';

export type ParameterInputSettingsV2 = {
  netAreaRatio: number;
  soilTotalUnitWeightKnM3: number;
  waterUnitWeightKnM3: number;
  atmosphericPressureKpa: number;
  minEffectiveStressKpa: number;
  iterationCount: number;
  qtSourcePolicy: ParameterQtSourcePolicyV2;
};

export type ParameterSourceLineageV2 = ArtifactDependency & {
  siteId: string | null;
  checkRunId: string;
  stratificationSchemeId: string;
  stratificationRevisionId: string;
  stratificationVersion: number;
};

export type ParameterInputRowV2 = {
  sourceRowId: string;
  depthM: number;
  qcKpa: number | null;
  qtKpa: number | null;
  fsKpa: number | null;
  u2Kpa: number | null;
  importedFrPercent: number | null;
};

export type ParameterDerivationIterationV2 = {
  iteration: number;
  exponentN: number;
  qtn: number;
  ic: number;
  nextExponentN: number;
};

export type ParameterDerivedInputRowV2 = {
  sourceRowId: string;
  depthM: number;
  status: 'valid' | 'invalid-input' | 'undefined';
  reasonCode: string | null;
  message: string | null;
  qtSource: 'imported' | 'derived' | null;
  qcKpa: number | null;
  qtKpa: number | null;
  fsKpa: number | null;
  u2Kpa: number | null;
  sigmaV0Kpa: number | null;
  u0Kpa: number | null;
  sigmaV0EffectiveKpa: number | null;
  qnetKpa: number | null;
  frPercent: number | null;
  importedFrPercent: number | null;
  frDifferencePercent: number | null;
  qtn: number | null;
  ic: number | null;
  finalExponentN: number | null;
  floorApplied: boolean;
  iterations: ParameterDerivationIterationV2[];
};

export type ParameterIssueV2 = {
  issueId: string;
  severity: 'problem' | 'notice';
  reasonCode: string;
  message: string;
  sourceRowId?: string;
  linkedObjectId?: string;
};

export type ParameterDerivationSummaryV2 = {
  rowCount: number;
  validCount: number;
  invalidInputCount: number;
  undefinedCount: number;
  importedQtCount: number;
  derivedQtCount: number;
  floorAppliedCount: number;
  frDifferenceNoticeCount: number;
};

export type ParameterTargetScopeV2 = {
  layerIds: string[];
  depthFromM: number;
  depthToM: number;
  excludedIntervals: Array<{ depthFromM: number; depthToM: number }>;
};

export type ParameterSlotV2 = {
  slotId: string;
  parameterKey: ParameterKeyV2;
  symbol: string;
  unit: string;
  requiredForHandoff: boolean;
  targetScope: ParameterTargetScopeV2;
  selectedMethodId: string | null;
  selectedMethodVersion: string | null;
  settings: ParameterMethodSettingsV1 | Record<string, never>;
};

export type ParameterSchemeV2 = {
  schemeId: string;
  name: string;
  status: 'working' | 'current' | 'history' | 'stale' | 'deleted';
  version: number;
  input: ParameterSourceLineageV2;
  inputSettings: ParameterInputSettingsV2;
  slots: ParameterSlotV2[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ParameterSchemeRevisionV2 = {
  revisionId: string;
  schemeId: string;
  version: number;
  snapshot: ParameterSchemeV2;
  committedAt: string;
};

export type ParameterSchemeEditSessionV2 = {
  sessionId: string;
  schemeId: string;
  baseVersion: number;
  baseline: ParameterSchemeV2;
  working: ParameterSchemeV2;
  dirty: boolean;
  isNew: boolean;
  startedAt: string;
  staleReason?: string;
};

export type ParameterRunStatusV2 =
  | 'queued'
  | 'running'
  | 'cancel-requested'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'invalidated';

export type ParameterInputDerivationRunV2 = {
  runId: string;
  commandId: string;
  idempotencyKey: string;
  schemeId: string;
  schemeRevisionId: string;
  pointId: string;
  input: ParameterSourceLineageV2;
  sourceLineageHash: string;
  algorithmId: typeof PARAMETER_INPUT_DERIVATION_ALGORITHM_ID;
  algorithmVersion: typeof PARAMETER_INPUT_DERIVATION_ALGORITHM_VERSION;
  formulaSpecHash: string;
  settingsSnapshot: ParameterInputSettingsV2;
  settingsHash: string;
  inputRowsSnapshot: ParameterInputRowV2[];
  inputHash: string;
  waterDepthM: number;
  status: ParameterRunStatusV2;
  derivedRows: ParameterDerivedInputRowV2[];
  summary: ParameterDerivationSummaryV2 | null;
  issues: ParameterIssueV2[];
  createdAt: string;
  startedAt?: string;
  cancelRequestedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type ParameterMethodResultStatusV1 =
  | 'Valid'
  | 'ValidWithNotice'
  | 'ApplicabilityUnconfirmed'
  | 'NotApplicable'
  | 'InvalidInput'
  | 'InvalidMethodParameter';

export type PenetrationRateEvidenceV1 = {
  status: 'standard_confirmed' | 'known_nonstandard' | 'missing';
  nominalRateMmPerSec: number | null;
  unit: 'mm/s';
  sourceType: 'point_metadata' | 'test_report' | 'user_confirmation' | null;
  sourceRevisionId: string | null;
  confirmedAt: string | null;
};

export type DrainageApplicabilityEvidenceV1 = {
  status: 'confirmed_drained' | 'confirmed_undrained' | 'unknown' | 'conflict' | 'resolved_conflict';
  evidenceType:
    | 'cptu_pore_pressure_response'
    | 'site_characterization'
    | 'laboratory_or_field_assessment'
    | 'user_confirmation'
    | null;
  sourceRevisionId: string | null;
  confirmedAt: string | null;
  note: string;
  conflictRevisionId?: string;
  resolvedAs?: 'confirmed_drained' | 'confirmed_undrained';
  supersedesConflictRevisionId?: string;
  resolutionRevisionId?: string;
  supersededByConflictRevisionId?: string;
};

export type MaterialApplicabilityEvidenceV1 = {
  status:
    | 'within_source_scope'
    | 'scope_unknown'
    | 'known_extrapolation'
    | 'engineer_confirmed_extrapolation'
    | 'outside_scope';
  materialClass: string;
  sourceRevisionId: string;
  confirmedAt: string;
  note: string;
  confirmationRevisionId?: string;
};

export type ParameterConflictContextV1 = {
  currentConflictRevisionId: string;
  pointId: string;
  sourceRevisionId: string;
};

type ParameterMethodEvidenceRevisionBaseV1 = {
  evidenceId: string;
  revisionId: string;
  version: number;
  contentHash: string;
  createdAt: string;
};

export type ParameterMethodEvidenceRevisionV1 =
  | (ParameterMethodEvidenceRevisionBaseV1 & { kind: 'penetration_rate'; payload: PenetrationRateEvidenceV1 })
  | (ParameterMethodEvidenceRevisionBaseV1 & { kind: 'drainage_applicability'; payload: DrainageApplicabilityEvidenceV1 })
  | (ParameterMethodEvidenceRevisionBaseV1 & { kind: 'material_applicability'; payload: MaterialApplicabilityEvidenceV1 })
  | (ParameterMethodEvidenceRevisionBaseV1 & { kind: 'conflict_context'; payload: ParameterConflictContextV1 });

export type ParameterReferenceTestRevisionV1 = {
  testId: string;
  revisionId: string;
  version: number;
  projectId: string;
  siteId: string;
  pointId: string;
  materialClass: string;
  depthM: number;
  testType: 'CAUC' | 'CIUC';
  strengthMode: 'triaxial_compression';
  failureCriterion: string;
  sucKpa: number;
  contentHash: string;
  createdAt: string;
};

export type NktMatchedPairV1 = {
  pairId: string;
  depthM: number;
  qnetKpa: number;
  sucKpa: number;
  sourceRowId: string;
  inputDerivationRunId: string;
  referenceTestId: string;
  referenceTestRevisionId: string;
  matchBasis: string;
};

export type NktSettingV1 = {
  value?: number;
  origin?: 'literature_starting_assumption' | 'user_defined_assumption' | 'site_calibrated';
  targetStrengthMode: string;
  assumptionRationale?: string;
  eligibleMaterialClass?: string;
  eligibleEnvironments?: Array<'onshore' | 'offshore'>;
  sourceRefs?: Array<{ environment: 'onshore' | 'offshore'; sourceRef: string }>;
  referenceTestIds: string[];
  confirmedAt?: string;
  projectId?: string;
  siteId?: string;
  pointId?: string;
  materialClass?: string;
  calibrationRevisionId?: string;
  referenceStrengthMode?: 'CAUC' | 'CIUC' | string;
  failureCriterion?: string;
  applicableLayerRevisionRefs?: string[];
  inputDerivationRunId?: string;
  matchedPairs?: NktMatchedPairV1[];
  derivation?: {
    method: string;
    aggregation: string;
    pairCount: number;
    derivedNkt: number;
  };
};

export type NktCalibrationContextV1 = {
  projectId: string;
  siteId: string;
  pointId: string;
  environment: 'onshore' | 'offshore';
  targetLayerRevisionRef: string;
  targetMaterialClass: string;
  inputDerivationRunId: string;
};

export type NktCalibrationAuthorityV1 = {
  inputDerivationRunId: string;
  currentSourceRowIds: string[];
  currentReferenceTestRevisions: Record<string, string>;
};

export type ParameterMethodEvaluationV1 = {
  status: ParameterMethodResultStatusV1;
  reasonCodes: ParameterMethodReasonCodeV1[];
  value: number | null;
  eligibleForCurrentResult: boolean;
};

export type ParameterJointApplicabilityEvaluationV1 = {
  status: 'NoProblem' | 'ResolvedWithNotice' | 'ApplicabilityUnconfirmed';
  reasonCodes: ParameterMethodReasonCodeV1[];
  reasonPriority: 'joint_before_method';
  phiEligible: boolean;
  sucEligible: boolean;
};

export type ParameterPhiMethodSettingsV1 = {
  kind: 'phi_peak_qtn_v1';
};

export type ParameterSucMethodSettingsV1 = {
  kind: 'suc_qnet_nkt_v1';
  requestedStrengthMode: 'triaxial_compression';
  nktByLayer: Array<{
    layerId: string;
    layerRevisionRef: string;
    setting: NktSettingV1;
  }>;
};

export type ParameterMethodSettingsV1 = ParameterPhiMethodSettingsV1 | ParameterSucMethodSettingsV1;

export type ParameterLayerEvidenceSnapshotV1 = {
  layerId: string;
  layerRevisionRef: string;
  layerGroup: string;
  depthFromM: number;
  depthToM: number;
  includesLowerBoundary: boolean;
  environment: 'onshore' | 'offshore';
  evidenceRevisionRefs: {
    rate: string;
    drainage: string;
    material: string;
    conflictContext: string | null;
  };
  rate: PenetrationRateEvidenceV1;
  drainage: DrainageApplicabilityEvidenceV1;
  material: MaterialApplicabilityEvidenceV1;
  conflictContext: ParameterConflictContextV1 | null;
  calibrationContext: NktCalibrationContextV1 | null;
  calibrationAuthority: NktCalibrationAuthorityV1 | null;
};

export type ParameterMethodInputRowV1 = {
  sourceRowId: string;
  depthM: number;
  layerId: string;
  layerRevisionRef: string;
  layerGroup: string;
  derivationStatus: ParameterDerivedInputRowV2['status'];
  derivationReasonCode: string | null;
  qtn: number | null;
  icRw: number | null;
  qnetKpa: number | null;
};

export type ParameterValueV2 = {
  sourceRowId: string;
  depthM: number;
  layerId: string;
  layerRevisionRef: string;
  value: number | null;
  status: ParameterMethodResultStatusV1;
  reasonCodes: string[];
  eligibleForCurrentResult: boolean;
};

export type ParameterLayerSummaryV1 = {
  layerId: string;
  layerRevisionRef: string;
  rowCount: number;
  numericValueCount: number;
  eligibleValueCount: number;
  trialOnlyValueCount: number;
  noticeValueCount: number;
  problemValueCount: number;
  eligibleMinimum: number | null;
  eligibleMaximum: number | null;
  eligibleMean: number | null;
};

export type ParameterMethodRunSummaryV1 = {
  rowCount: number;
  numericValueCount: number;
  eligibleValueCount: number;
  trialOnlyValueCount: number;
  noticeValueCount: number;
  problemValueCount: number;
};

export type ParameterRunV2 = {
  runId: string;
  commandId: string;
  idempotencyKey: string;
  schemeId: string;
  slotId: string;
  schemeRevisionId: string;
  derivationRunId: string;
  pointId: string;
  sourceLineageHash: string;
  methodId: string;
  methodVersion: string;
  formulaReference: string;
  formulaSpecHash: string;
  targetScopeSnapshot: ParameterTargetScopeV2;
  settingsSnapshot: ParameterMethodSettingsV1;
  settingsHash: string;
  evidenceSnapshot: ParameterLayerEvidenceSnapshotV1[];
  evidenceHash: string;
  inputRowsSnapshot: ParameterMethodInputRowV1[];
  inputHash: string;
  resultHash: string | null;
  status: ParameterRunStatusV2;
  values: ParameterValueV2[];
  layerSummaries: ParameterLayerSummaryV1[];
  summary: ParameterMethodRunSummaryV1 | null;
  issues: ParameterIssueV2[];
  createdAt: string;
  startedAt?: string;
  cancelRequestedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type ManualParameterEntryRevisionV2 = {
  manualEntryId: string;
  revisionId: string;
  version: number;
  slotId: string;
  sourceLineageHash: string;
  derivationRunId: string;
  targetScope: ParameterTargetScopeV2;
  originalValue: number;
  originalUnit: string;
  standardValue: number;
  standardUnit: string;
  conversionRule: string;
  reason: string;
  status: 'current' | 'history' | 'deleted' | 'stale';
  createdAt: string;
};

export type ParameterResultSelectionMemberV2 = {
  slotId: string;
  sourceType: 'calculated' | 'manual';
  parameterRunId?: string;
  manualEntryRevisionId?: string;
  targetScopeSnapshot: ParameterTargetScopeV2;
  validValueCount: number;
  targetLayerIds: string[];
};

export type ParameterResultSelectionV2 = {
  selectionId: string;
  selectionRevisionId: string;
  parameterSchemeId: string;
  parameterSchemeRevisionId: string;
  pointId: string;
  sourceLineageHash: string;
  derivationRunId: string;
  members: ParameterResultSelectionMemberV2[];
  issues: ParameterIssueV2[];
  notices: ParameterIssueV2[];
  createdAt: string;
};

export type CustomFormulaStatusV1 = 'working' | 'current' | 'stale' | 'deleted';

export type CustomFormulaSourceV1 = {
  parameterSchemeId: string;
  parameterSchemeRevisionId: string;
  parameterDerivationRunId: string;
  stratificationSchemeId: string;
  stratificationRevisionId: string;
  stratificationVersion: number;
  pointId: string;
  sourceLineageHash: string;
};

export type CustomFormulaDefinitionV1 = {
  formulaId: string;
  name: string;
  symbol: string;
  unit: string;
  description: string;
  expression: string;
  targetLayerIds: string[];
  resultMinimum: number | null;
  resultMaximum: number | null;
  status: CustomFormulaStatusV1;
  version: number;
  source: CustomFormulaSourceV1;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CustomFormulaRevisionV1 = {
  revisionId: string;
  formulaId: string;
  version: number;
  snapshot: CustomFormulaDefinitionV1;
  astSnapshot: unknown;
  astHash: string;
  variables: string[];
  contentHash: string;
  committedAt: string;
};

export type CustomFormulaEditSessionV1 = {
  sessionId: string;
  formulaId: string;
  baseVersion: number;
  baseline: CustomFormulaDefinitionV1;
  working: CustomFormulaDefinitionV1;
  dirty: boolean;
  isNew: boolean;
  startedAt: string;
  staleReason?: string;
};

export type CustomFormulaInputRowV1 = {
  sourceRowId: string;
  depthM: number;
  layerId: string | null;
  qc: number | null;
  qt: number | null;
  qnet: number | null;
  fs: number | null;
  u2: number | null;
  Qtn: number | null;
  IcRW: number | null;
};

export type CustomFormulaValueStatusV1 = 'valid' | 'missing_input' | 'not_target' | 'numeric_problem' | 'out_of_range';

export type CustomFormulaValueV1 = {
  sourceRowId: string;
  depthM: number;
  layerId: string | null;
  value: number | null;
  status: CustomFormulaValueStatusV1;
  eligibleForCurrentResult: boolean;
  reasonCode: string | null;
};

export type CustomFormulaRunSummaryV1 = {
  rowCount: number;
  validCount: number;
  missingInputCount: number;
  nonTargetCount: number;
  numericProblemCount: number;
  outOfRangeCount: number;
};

export type CustomFormulaRunV1 = {
  runId: string;
  commandId: string;
  idempotencyKey: string;
  formulaId: string;
  formulaRevisionId: string;
  formulaVersion: number;
  parameterSchemeRevisionId: string;
  parameterDerivationRunId: string;
  stratificationRevisionId: string;
  pointId: string;
  sourceLineageHash: string;
  nameSnapshot: string;
  symbolSnapshot: string;
  unitSnapshot: string;
  expressionSnapshot: string;
  astSnapshot: unknown;
  astHash: string;
  variablesSnapshot: string[];
  targetLayerIdsSnapshot: string[];
  resultMinimumSnapshot: number | null;
  resultMaximumSnapshot: number | null;
  inputRowsSnapshot: CustomFormulaInputRowV1[];
  inputHash: string;
  resultHash: string | null;
  status: ParameterRunStatusV2;
  values: CustomFormulaValueV1[];
  layerSummaries: ParameterLayerSummaryV1[];
  summary: CustomFormulaRunSummaryV1 | null;
  issues: ParameterIssueV2[];
  createdAt: string;
  startedAt?: string;
  cancelRequestedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type JtsParameterMethodIdV5 =
  | 'jts_gamma_sat'
  | 'jts_su_nkt'
  | 'jts_phi_fine'
  | 'jts_phi_coarse'
  | 'jts_relative_density'
  | 'jts_ocr'
  | 'jts_sensitivity'
  | 'jts_compression_modulus'
  | 'jts_compression_index'
  | 'jts_shear_wave_velocity'
  | 'jts_spt_n'
  | 'jts_dissipation_ch_kh'
  | 'manual_silt_phi'
  | 'manual_silt_su';

export type JtsParameterPackageSettingsV5 = {
  nktTargetTestType: string | null;
  nktValue: number | null;
  nktSourceType: 'jts_table_mean' | 'project_experience' | 'site_calibration' | null;
  nktSourceRevisionId: string | null;
  nktConfirmedAt?: string | null;
  siltDrainageDecision: 'drained' | 'undrained' | 'pending';
  siltManualValue: number | null;
  siltManualSource: string;
  materialScope: 'within_source' | 'unknown' | 'calcareous_sand' | 'carbonaceous_sand';
  ocrCoefficient: number;
  ocrCoefficientConfirmed: boolean;
  sensitivityCoefficient: number;
  sensitivityCoefficientConfirmed: boolean;
  selectedOptionalMethodIds: JtsParameterMethodIdV5[];
  selectedMethodIds?: JtsParameterMethodIdV5[];
  outputScopeConfirmedAt?: string | null;
  outputScopeIncludedMethodIds?: JtsParameterMethodIdV5[];
  outputScopeExcludedMethodIds?: JtsParameterMethodIdV5[];
  skippedMethodDecisions?: Array<{
    methodId: JtsParameterMethodIdV5;
    reason: 'not-needed-this-stage' | 'insufficient-data' | 'provided-by-other-test';
    decidedAt?: string;
  }>;
  ignoredPointDecisions?: Array<{
    methodId: JtsParameterMethodIdV5;
    sourceRowId: string;
    depthM: number;
    reason: 'local-calculation-domain';
    originalReason: string;
    decidedAt: string;
    forced?: boolean;
    thresholdViolations?: string[];
    forcedConfirmedAt?: string;
  }>;
};

export type GuidedParameterStageV1 = 'select' | 'configure' | 'review';

export type GuidedParameterDecisionV1 = {
  parameterId: string;
  choice: 'recommended' | 'alternative' | 'deferred' | 'skipped';
  skipReason?: 'not-needed-this-stage' | 'insufficient-data' | 'provided-by-other-test';
  decidedAt?: string;
  manuallyAdjusted?: boolean;
};

export type GuidedParameterDraftV1 = {
  draftId: string;
  pointId: string;
  classificationRunId: string;
  classificationResultHash: string;
  stratificationRevisionId: string;
  stage: GuidedParameterStageV1;
  selectedParameterIds: string[];
  currentParameterId: string | null;
  completedParameterIds: string[];
  decisions: GuidedParameterDecisionV1[];
  settings: JtsParameterPackageSettingsV5;
  status: 'active' | 'stale';
  createdAt: string;
  updatedAt: string;
  staleReason?: string;
};

export type JtsParameterChecklistItemV5 = {
  methodId: JtsParameterMethodIdV5;
  label: string;
  symbol: string;
  unit: string;
  level: 'required' | 'recommended' | 'optional';
  status: 'complete' | 'pending' | 'unavailable' | 'problem' | 'not-selected';
  applicableLayerIds: string[];
  valueCount: number;
  reason: string;
};

export type JtsParameterValueV5 = {
  valueId: string;
  sourceRowId: string;
  depthM: number;
  layerId: string;
  soilClassId: string;
  methodId: JtsParameterMethodIdV5;
  status: 'value' | 'pending_confirmation' | 'unavailable' | 'problem' | 'ignored';
  value: number | null;
  notices: string[];
  reason: string | null;
};

export type JtsParameterRepresentativeValueV5 = {
  layerId: string;
  methodId: JtsParameterMethodIdV5;
  validValueCount: number;
  minimum: number | null;
  maximum: number | null;
  median: number | null;
};

export type JtsParameterPackageRunV5 = {
  runId: string;
  pointId: string;
  classificationRunId: string;
  classificationResultHash: string;
  stratificationSchemeId: string;
  stratificationRevisionId: string;
  stratificationVersion: number;
  sourceLineageHash: string;
  formulaPackageId: string;
  formulaPackageVersion: number;
  settingsSnapshot: JtsParameterPackageSettingsV5;
  classificationRowsSnapshot: Array<{
    sourceRowId: string;
    depthM: number;
    qtKpa: number;
    gammaSatKnM3: number;
    qnetKpa: number;
    frPercent: number | null;
    qtNormalized: number | null;
    qtn: number | null;
    ic: number | null;
    route: 'full_cptu' | 'approximate_cpt';
    selectedClass: { soilClassId: string; zone: number; label: string; approximate: boolean } | null;
  }>;
  layerSnapshot: Array<{ layerId: string; name: string; depthFromM: number; depthToM: number; engineeringSoilGroup: string; finalDetailedType: string | null; decisionSource: string | null }>;
  status: 'completed' | 'stale' | 'failed' | 'cancelled';
  checklist: JtsParameterChecklistItemV5[];
  values: JtsParameterValueV5[];
  representativeValues: JtsParameterRepresentativeValueV5[];
  summary: { requiredComplete: number; requiredPending: number; requiredSkipped?: number; totalSkipped?: number; recommendedComplete: number; optionalComplete: number; valueCount: number; ignoredPointCount?: number; forcedIgnoredPointCount?: number; classificationConflictCount: number; eligibleForOutput: boolean };
  inputHash: string;
  resultHash: string;
  createdAt: string;
  staleReason?: string;
};

export type JtsDissipationTestRevisionV6 = {
  testId: string;
  revisionId: string;
  pointId: string;
  fileName: string;
  depthM: number;
  layerId: string;
  u0Kpa: number;
  rows: Array<{ sourceRowNumber: number; timeSeconds: number; u2Kpa: number }>;
  status: 'ready' | 'problem' | 'stale';
  problem: string | null;
  inputHash: string;
  createdAt: string;
  staleReason?: string;
};

export type JtsDissipationT50RevisionV6 = {
  revisionId: string;
  testRevisionId: string;
  layerId: string;
  origin: 'auto-intersection' | 'manual-alternative';
  t50Seconds: number;
  uiKpa: number;
  u50Kpa: number;
  evidenceRowNumbers: number[];
  inputHash: string;
  createdAt: string;
};

export type JtsDissipationResultRevisionV6 = {
  revisionId: string;
  /** Historical records without this field used the pre-Process125 centimetre result as SI. */
  formulaRevision?: 'jts-t242-2020-si-v2';
  pointId: string;
  testRevisionId: string;
  t50RevisionId: string;
  parameterPackageRunId: string;
  parameterPackageResultHash: string;
  stratificationRevisionId: string;
  layerId: string;
  inputs: { t50Seconds: number; naturalUnitWeightKnM3: number; shearWaveVelocityMps: number; undrainedStrengthKpa: number };
  rigidityIndex: number;
  smallStrainModulusKpa: number;
  chM2PerSecond: number;
  khMPerSecond: number;
  status: 'completed' | 'stale';
  inputHash: string;
  resultHash: string;
  createdAt: string;
  staleReason?: string;
};

export type ParameterWorkspaceV2 = {
  parameterWorkspaceSchemaVersion?: 'parameter-workspace-g1b.v1';
  schemes: ParameterSchemeV2[];
  activeSchemeId: string | null;
  currentSchemeId: string | null;
  editSession: ParameterSchemeEditSessionV2 | null;
  revisions: ParameterSchemeRevisionV2[];
  derivationRuns: ParameterInputDerivationRunV2[];
  parameterRuns: ParameterRunV2[];
  methodEvidenceRevisions?: ParameterMethodEvidenceRevisionV1[];
  currentMethodEvidenceRefs?: Record<string, string>;
  referenceTestRevisions?: ParameterReferenceTestRevisionV1[];
  currentReferenceTestRefs?: Record<string, string>;
  manualEntryRevisions: ManualParameterEntryRevisionV2[];
  resultSelections: ParameterResultSelectionV2[];
  currentResultSelectionRef: { selectionId: string; selectionRevisionId: string } | null;
  customFormulas?: CustomFormulaDefinitionV1[];
  activeCustomFormulaId?: string | null;
  customFormulaEditSession?: CustomFormulaEditSessionV1 | null;
  customFormulaRevisions?: CustomFormulaRevisionV1[];
  customFormulaRuns?: CustomFormulaRunV1[];
  jtsParameterPackageRuns?: JtsParameterPackageRunV5[];
  activeJtsParameterPackageRunId?: string | null;
  guidedParameterDraft?: GuidedParameterDraftV1 | null;
  jtsDissipationTests?: JtsDissipationTestRevisionV6[];
  activeJtsDissipationTestRevisionId?: string | null;
  jtsDissipationT50Revisions?: JtsDissipationT50RevisionV6[];
  activeJtsDissipationT50RevisionId?: string | null;
  jtsDissipationResults?: JtsDissipationResultRevisionV6[];
  activeJtsDissipationResultRevisionId?: string | null;
};
