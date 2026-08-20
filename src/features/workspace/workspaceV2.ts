import type { RouteId, SyntheticFlowCase } from '../../workflowData';
import type { CheckFilter, ImportDraftProblem, ProjectWorkspaceMode } from '../workflow/types';
import type { QuickPlotWorkspaceV1 } from '../quick/quickPlotDomain';
import type { ParameterWorkspaceV2 } from '../parameters/parameterTypes';
import type { JtsSeriesContext } from '../jts/jtsT242Domain';
import { sha256HexSync, stableStringify } from './stableHash';

export const PROJECT_MANIFEST_SCHEMA = 'sigs-oglab.project-manifest';
export const PROJECT_MANIFEST_VERSION = 3;

export type TargetFieldKey =
  | 'pointName'
  | 'depthM'
  | 'qc'
  | 'qt'
  | 'fs'
  | 'u2'
  | 'fr'
  | 'waterDepth'
  | 'finalDepth';

export type RevisionVector = {
  source: number;
  mapping: number;
  unit: number;
  normalization: number;
  pointPlan: number;
};

export type ArtifactDependency = {
  pointId: string;
  draftId: string;
  batchId: string;
  revisions: RevisionVector;
};

export type WorkflowArtifactState = {
  status: 'empty' | 'current' | 'stale' | 'problem';
  input: ArtifactDependency | null;
  sourceCheckRunId?: string;
  sourceStratificationSchemeId?: string;
  sourceStratificationRevisionId?: string;
  staleReason?: string;
  invalidatedAt?: string;
  recoveryTarget?: { route: RouteId; field?: TargetFieldKey; reasonCode?: string };
};

export type CheckRunV2 = {
  runId: string;
  input: ArtifactDependency;
  probeContextRevisionId?: string;
  probeProfileRevisionId?: string;
  waterContextRevisionId?: string;
  jtsContextSnapshot?: JtsSeriesContext;
  status: 'running' | 'completed' | 'failed';
  counts: { issue: number; notice: number; passed: number };
  conclusion: '无问题' | '存在问题';
  issueIds: string[];
  exclusionRevisionId?: string | null;
  valueOverrideRevisionId?: string | null;
  smoothingRunId?: string | null;
  normalizedDataHash?: string;
  createdAt: string;
  completedAt?: string;
};

export function computeNormalizedPointDataHash(
  sourceRowIds: string[],
  rows: SyntheticFlowCase['rows'],
) {
  if (sourceRowIds.length !== rows.length || new Set(sourceRowIds).size !== sourceRowIds.length) return null;
  return sha256HexSync(stableStringify(sourceRowIds.map((sourceRowId, index) => ({ sourceRowId, row: rows[index] }))));
}

export type LegacyCheckRunSummary = {
  runId: string;
  draftVersion: number;
  createdAt: string;
  sourceFile: string;
  pointName: string;
  counts: { issue: number; notice: number; passed: number };
  conclusion: '无问题' | '存在问题' | '需重新检查';
  reason: string;
};

export type CheckStateV2 = {
  activeRunId: string | null;
  runs: CheckRunV2[];
  legacyHistory: LegacyCheckRunSummary[];
  artifact: WorkflowArtifactState;
};

export type PointWorkflowSelectionV2 = {
  selectedImportBatchId: string;
  selectedCheckIssueId: string;
  selectedSchemeId: string;
  selectedLayerId: string;
  selectedBoundaryId: string;
  selectedParameterSchemeId: string;
  selectedParameterSlotId: string;
  selectedOutputItemId: string;
  selectedMappingField: string;
  importFocusField: string | null;
  importFocusSourceRowId?: string | null;
  importFocusDisplayRow?: number | null;
  stratificationToolMode?: 'scheme' | 'layer' | 'boundary' | 'problem';
  selectedCheckFilter: CheckFilter;
};

export type ProbeProfileV3 = {
  profileId: string;
  revisionId: string;
  kind: 'jts_builtin' | 'custom';
  name: string;
  coneBaseAreaCm2: number;
  effectiveAreaRatio: number;
  porePressurePosition: 'u2_shoulder' | 'u1_cone_face' | 'u3_sleeve_end' | 'none';
  createdAt: string;
  updatedAt: string;
};

export type PointProbeContextV3 = {
  revisionId: string;
  revision: number;
  activeProfileId: string | null;
  activeProfileRevisionId: string | null;
  confirmedAt: string | null;
  updatedAt: string;
};

export type PointWaterContextV3 = {
  revisionId: string;
  revision: number;
  channelState: 'unknown' | 'present' | 'absent' | 'partial';
  waterDepthM: number | null;
  u2HydrostaticDatum: 'total' | 'u2_mudline_relative';
  testZeroDatum: 'mudline' | 'borehole_bottom';
  boreholeBottomDepthM: number | null;
  waterUnitWeightKnM3: number;
  confirmedAt: string | null;
  updatedAt: string;
};

export type PointDerivationDependencyV3 = {
  import: ArtifactDependency;
  probeContextRevisionId: string;
  probeProfileRevisionId: string;
  waterContextRevisionId: string;
};

export type PointDerivationStateV3 = {
  status: 'empty' | 'current' | 'stale' | 'problem';
  input: PointDerivationDependencyV3 | null;
  staleReason?: string;
  invalidatedAt?: string;
  recoveryTarget?: { route: RouteId; field?: 'probe' | 'water-depth' | 'pressure-datum'; reasonCode?: string };
};

export type DataReviewDecisionV3 = {
  decisionId: string;
  kind: 'keep' | 'exclude' | 'delete';
  scope: 'row' | 'depth-range';
  sourceRowIds: string[];
  depthFromM: number;
  depthToM: number;
  reason: string;
  createdAt: string;
};

export type DataExclusionRevisionV3 = {
  revisionId: string;
  version: number;
  input: ArtifactDependency;
  decisions: DataReviewDecisionV3[];
  excludedSourceRowIds: string[];
  /** Rows permanently removed from the current working dataset. Raw import evidence remains immutable. */
  permanentlyDeletedSourceRowIds?: string[];
  createdAt: string;
};

export type DataValueOverrideFieldV3 = 'depthM' | 'qcKpa' | 'fsKpa' | 'u2Kpa';

export type DataValueOverrideReasonV3 =
  | 'source-entry-error'
  | 'unit-conversion-error'
  | 'instrument-anomaly'
  | 'neighbor-supported-correction'
  | 'other-reviewed';

export type DataValueOverrideV3 = {
  sourceRowId: string;
  field: DataValueOverrideFieldV3;
  originalValue: number | null;
  effectiveValue: number;
  reasonCode: DataValueOverrideReasonV3;
  reason: string;
  createdAt: string;
};

export type DataValueOverrideRevisionV3 = {
  revisionId: string;
  version: number;
  input: ArtifactDependency;
  overrides: DataValueOverrideV3[];
  createdAt: string;
};

export type DataSmoothingSettingsV3 = {
  preset: 'conservative' | 'standard' | 'strong' | 'custom';
  depthWindowM: number;
};

export type DataSmoothingRowV3 = {
  sourceRowId: string;
  depthM: number;
  rawQcKpa: number;
  smoothedQcKpa: number;
  rawFsKpa: number;
  smoothedFsKpa: number;
  rawU2Kpa: number | null;
  smoothedU2Kpa: number | null;
  anomaly: boolean;
};

export type DataSmoothingRunV3 = {
  runId: string;
  input: ArtifactDependency;
  valueOverrideRevisionId?: string | null;
  exclusionRevisionId: string | null;
  settings: DataSmoothingSettingsV3;
  status: 'completed' | 'failed' | 'stale';
  rows: DataSmoothingRowV3[];
  excludedSourceRowIds: string[];
  createdAt: string;
  staleReason?: string;
};

export type DataGovernanceWorkspaceV3 = {
  /** Optional for manifests saved before Process087; absence is equivalent to an empty collection. */
  valueOverrideRevisions?: DataValueOverrideRevisionV3[];
  currentValueOverrideRevisionId?: string | null;
  exclusionRevisions: DataExclusionRevisionV3[];
  currentExclusionRevisionId: string | null;
  smoothingRuns: DataSmoothingRunV3[];
  activeSmoothingRunId: string | null;
  viewMode: 'raw' | 'smoothed' | 'overlay';
};

export function emptyDataGovernanceWorkspace(): DataGovernanceWorkspaceV3 {
  return { valueOverrideRevisions: [], currentValueOverrideRevisionId: null, exclusionRevisions: [], currentExclusionRevisionId: null, smoothingRuns: [], activeSmoothingRunId: null, viewMode: 'overlay' };
}

export type DeletedPointRecordV3 = {
  deletionId: string;
  pointId: string;
  pointName: string;
  originalIndex: number;
  snapshot: PointWorkspaceV2;
  deletedAt: string;
};

export type StratificationInputDependencyV2 = ArtifactDependency & {
  checkRunId: string;
};

export type ClassificationMethodIdV1 =
  | 'jts-t242-2020'
  | 'fuzzy-zhang-tumay-1999'
  | 'modified-robertson-2016'
  | 'schneider-2008';

export type JtsClassificationEvidenceRowV4 = {
  sourceRowId: string;
  depthM: number;
  qtKpa: number;
  gammaSatKnM3: number;
  qnetKpa: number;
  frPercent: number | null;
  qtNormalized: number | null;
  qtn: number | null;
  ic: number | null;
  porePressureRatio: number | null;
  icClass: { soilClassId: string; zone: number; label: string; approximate: boolean } | null;
  poreClass: { soilClassId: string; zone: number; label: string; approximate: false } | null;
  selectedClass: {
    soilClassId: string;
    zone: number;
    label: string;
    approximate: boolean;
    engineeringGroup?: 'sand' | 'mixed' | 'clay' | 'unclassified';
    confidenceScore?: number | null;
    confidenceReason?: string;
  } | null;
  comparison: { state: 'same' | 'adjacent' | 'unresolved' | 'unavailable'; zoneDifference: number | null };
  confidence: 'high' | 'review' | 'problem';
  issues: string[];
};

export type JtsClassificationBoundaryCandidateV4 = {
  candidateId: string;
  depthM: number;
  upperSourceRowId: string;
  lowerSourceRowId: string;
  upperZone: number;
  lowerZone: number;
  confidence: 'high' | 'review' | 'problem';
  reason: string;
};

export type JtsClassificationRunV4 = {
  runId: string;
  /** Optional on historical Process082-124 records; absence means JTS/T 242-2020. */
  methodId?: ClassificationMethodIdV1;
  methodLabel?: string;
  methodVersion?: string;
  mappingVersion?: string;
  input: StratificationInputDependencyV2;
  probeProfileRevisionId: string;
  waterContextRevisionId: string;
  route: 'full_cptu' | 'approximate_cpt';
  measuredRowsSnapshot: Array<{ sourceRowId: string; depthM: number; qcKpa: number; fsKpa: number; u2Kpa?: number | null }>;
  seriesContextSnapshot: {
    route: 'full_cptu' | 'approximate_cpt';
    effectiveAreaRatio: number;
    waterUnitWeightKnM3?: number;
    waterDepthM?: number;
    u2HydrostaticDatum?: 'total' | 'u2_mudline_relative';
    testZeroDatum?: 'mudline' | 'borehole_bottom';
    boreholeBottomDepthM?: number | null;
  };
  formulaPackageId: string;
  formulaPackageVersion: number;
  status: 'completed' | 'stale' | 'failed';
  rows: JtsClassificationEvidenceRowV4[];
  candidates: JtsClassificationBoundaryCandidateV4[];
  summary: { rowCount: number; sameCount: number; adjacentCount: number; unresolvedCount: number; unavailableCount: number; candidateCount: number };
  inputHash: string;
  resultHash: string;
  createdAt: string;
  staleReason?: string;
};

export type StratificationRuleIdV1 = 'qc_fr_change_point_v1';

export type StratificationRuleSettingsV1 = {
  kind: StratificationRuleIdV1;
  windowRows: number;
  scoreThreshold: number;
  minSpacingM: number;
  maxBoundaries: number;
};

export type StratificationRuleInputRowV1 = {
  sourceRowId: string;
  depthM: number;
  qcKpa: number | null;
  frPercent: number | null;
};

export type StratificationRuleCandidateV1 = {
  candidateId: string;
  depthM: number;
  score: number;
  qcComponent: number;
  frComponent: number | null;
  qcMedianAboveKpa: number;
  qcMedianBelowKpa: number;
  frMedianAbovePercent: number | null;
  frMedianBelowPercent: number | null;
  sourceRowIds: string[];
};

export type StratificationRuleIssueCodeV1 =
  | 'StrRuleInputTooShort'
  | 'StrRuleDepthOrderInvalid'
  | 'StrRuleQcInvalid'
  | 'StrRuleCandidateOutsideEditableRange'
  | 'StrRuleFrUnavailable'
  | 'StrRuleNoCandidates';

export type StratificationRuleIssueV1 = {
  code: StratificationRuleIssueCodeV1;
  severity: 'problem' | 'notice';
  message: string;
  recovery: 'data-check' | 'rule-settings' | 'manual-stratification';
  sourceRowIds: string[];
};

export type StratificationRuleRunV1 = {
  runId: string;
  commandId: string;
  idempotencyKey: string;
  status: 'queued' | 'running' | 'cancel-requested' | 'completed' | 'cancelled' | 'failed' | 'invalidated';
  input: StratificationInputDependencyV2;
  inputRowsSnapshot: StratificationRuleInputRowV1[];
  settingsSnapshot: StratificationRuleSettingsV1;
  formulaSpecHash: string;
  sourceLineageHash: string;
  inputHash: string;
  settingsHash: string;
  candidates: StratificationRuleCandidateV1[];
  issues: StratificationRuleIssueV1[];
  summary: {
    inputRowCount: number;
    evaluatedSplitCount: number;
    thresholdMatchCount: number;
    selectedBoundaryCount: number;
  } | null;
  resultHash: string | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type StratificationLayerV2 = {
  layerId: string;
  name: string;
  description: string;
  engineeringSoilGroup: string;
  reviewRequired: boolean;
  soilConfirmationRequired?: boolean;
  evidenceReviewRequired?: boolean;
  soilDecision?: {
    suggestedGroup: string | null;
    finalGroup: string;
    suggestedDetailedType?: string | null;
    finalDetailedType?: string | null;
    reviewStatus?: 'pending' | 'accepted' | 'needs-review' | 'deferred';
    reviewAction?: 'method-suggested' | 'accepted' | 'batch-accepted' | 'engineer-overrode' | 'merged-inherited' | 'split-inherited' | 'boundary-adjusted' | 'marked-for-review' | 'deferred';
    decisionReason?: string;
    decisionNote?: string;
    deferredAt?: string;
    methodClassification?: {
      methodId: string;
      classCode: string;
      classLabel: string;
    };
    source: 'jts-suggested' | 'jts-accepted' | 'engineer-overrode-jts' | 'engineer-selected' | 'manual' | 'inherited';
    classificationRunId?: string;
    decidedAt: string;
  };
  mergeSources?: Array<{
    sourceLayerId: string;
    name: string;
    engineeringSoilGroup: string;
    detailedSoilType?: string | null;
    methodClassification?: {
      methodId: string;
      classCode: string;
      classLabel: string;
    };
    description: string;
    depthFromM: number;
    depthToM: number;
  }>;
  majorGroupComposition?: {
    engineeringSoilGroup: string;
    detailedSoilTypes: string[];
    sourceLayerIds: string[];
    /** Process101+: the only authoritative review state for newly written major-group compositions. */
    reviewReasons?: MajorGroupReviewReasonV2[];
    /** Legacy Process100 summary fields; read-only compatibility only. */
    requiresReview?: boolean;
    sourceReviewRequired?: boolean;
    conflictBoundaryCount?: number;
    conflictingChannels?: Array<'qc' | 'fs' | 'u2'>;
  };
  depthFromM: number;
  depthToM: number;
};

export type StratificationBoundaryV2 = {
  boundaryId: string;
  depthM: number;
  upperLayerId: string;
  lowerLayerId: string;
  reviewRequired: boolean;
  majorGroupMergeLocked?: boolean;
  note: string;
  ruleCandidateRef?: {
    ruleRunId: string;
    candidateId: string;
    originalDepthM: number;
    sourceRowIds: string[];
  };
  jtsCandidateRef?: {
    classificationRunId: string;
    candidateId: string;
    originalDepthM: number;
    sourceRowIds: string[];
  };
};

export type StratificationSchemeV2 = {
  schemeId: string;
  name: string;
  status: 'working' | 'current' | 'history' | 'stale';
  version: number;
  input: StratificationInputDependencyV2;
  depthFromM: number;
  depthToM: number;
  layers: StratificationLayerV2[];
  boundaries: StratificationBoundaryV2[];
  layerStructureReviewHistory?: Array<{
    reviewId: string;
    decision: 'keep-current';
    layerCount: number;
    boundaryCount: number;
    reviewedAt: string;
  }>;
  thinLayerCleanupHistory?: Array<{
    cleanupId: string;
    thresholdM: number;
    sourceSignature: string;
    beforeLayerCount: number;
    afterLayerCount: number;
    decisions: Array<{
      candidateId: string;
      sourceLayerId: string;
      decision: 'preserve' | 'merge-above' | 'merge-below' | 'merge-surrounding';
      reason: string;
    }>;
    appliedAt: string;
  }>;
  layerSimplificationHistory?: Array<{
    simplificationId: string;
    sourceSignature: string;
    method?: 'target-count' | 'major-soil-group';
    requestedTargetCount?: number;
    recommendedTargetCount?: number;
    minimumRecommendedLayerCount?: number;
    beforeLayerCount: number;
    afterLayerCount: number;
    reachedRequestedTarget?: boolean;
    resultLayers?: Array<{
      layerId: string;
      depthFromM: number;
      depthToM: number;
      engineeringSoilGroup: string;
      detailedSoilTypes: string[];
      displayLabel: string;
      sourceLayerIds: string[];
      mergedBoundaryCount: number;
      reviewReasons?: MajorGroupReviewReasonV2[];
      /** Legacy Process100 summary fields; read-only compatibility only. */
      requiresReview?: boolean;
      sourceReviewRequired?: boolean;
      conflictBoundaryCount?: number;
      conflictingChannels?: Array<'qc' | 'fs' | 'u2'>;
    }>;
    steps: Array<{
      stepId: string;
      boundaryId: string;
      boundaryDepthM: number;
      upperLayerId: string;
      lowerLayerId: string;
      upperDepthFromM: number;
      upperDepthToM: number;
      lowerDepthFromM: number;
      lowerDepthToM: number;
      upperSoilGroup?: string;
      lowerSoilGroup?: string;
      upperDetailedSoilType?: string | null;
      lowerDetailedSoilType?: string | null;
      inheritedLayerId?: string;
      inheritedSoilGroup?: string;
      inheritedDetailedSoilType?: string | null;
      resultingSoilGroup?: string;
      resultingDetailedSoilTypes?: string[];
      resultingLabel?: string;
      sourceLayerIds?: string[];
      confidence?: 'high' | 'acceptable';
      score?: number;
      reason: string;
      channels: Array<{
        key: 'qc' | 'fs' | 'u2';
        valid: boolean;
        upperMedian: number | null;
        lowerMedian: number | null;
        relativeDistance: number | null;
        conflicting: boolean;
      }>;
    }>;
    appliedAt: string;
  }>;
  manualMergeHistory?: Array<{
    mergeId: string;
    sourceLayerIds: string[];
    sourceBoundaryId: string;
    reason: 'curve-evidence' | 'classification-equivalent' | 'engineering-judgement';
    beforeLayerCount: number;
    afterLayerCount: number;
    appliedAt: string;
  }>;
  origin?:
    | { kind: 'manual' }
    | { kind: 'rule-candidate'; ruleRunId: string; ruleId: StratificationRuleIdV1 }
    | {
        kind: 'jts-classification';
        classificationRunId: string;
        selection?: {
          policy: 'dual-path-with-ic-fallback';
          candidateMode: 'stable' | 'all';
          groupingWindowM: number | null;
          rawCandidateCount: number;
          selectedCandidateCount: number;
          acceptedUnclassifiableRows: number;
          pendingUnclassifiableRows?: number;
          unclassifiablePolicy?: 'none' | 'accepted-gap' | 'pending-review';
          boundarySource?: 'jts' | 'rule';
          ruleRunId?: string;
          ruleCandidateIds?: string[];
          confirmedAt: string;
        };
      };
  createdAt: string;
  updatedAt: string;
};

export type MajorGroupReviewReasonV2 =
  | {
      kind: 'source-soil-confirmation';
      sourceLayerIds: string[];
    }
  | {
      kind: 'source-evidence';
      sourceLayerIds: string[];
    }
  | {
      kind: 'curve-difference';
      boundaryId: string;
      boundaryDepthM: number;
      channels: Array<'qc' | 'fs' | 'u2'>;
    }
  | {
      /** Compatibility-only reason for an old record whose single boolean cannot be safely reclassified. */
      kind: 'legacy-untyped';
      sourceLayerIds: string[];
    };

export type StratificationEditSessionV2 = {
  sessionId: string;
  schemeId: string;
  baseVersion: number;
  baseline: StratificationSchemeV2;
  working: StratificationSchemeV2;
  undoStack: StratificationSchemeV2[];
  redoStack: StratificationSchemeV2[];
  dirty: boolean;
  isNew: boolean;
  staleReason?: string;
  startedAt: string;
};

export type StratificationSchemeRevisionV2 = {
  revisionId: string;
  schemeId: string;
  version: number;
  snapshot: StratificationSchemeV2;
  committedAt: string;
};

export type StratificationWorkspaceV2 = {
  schemes: StratificationSchemeV2[];
  activeSchemeId: string | null;
  currentSchemeId: string | null;
  editSession: StratificationEditSessionV2 | null;
  revisions?: StratificationSchemeRevisionV2[];
  deletedSchemeIds?: string[];
  ruleRuns?: StratificationRuleRunV1[];
  activeRuleRunId?: string | null;
  jtsClassificationRuns?: JtsClassificationRunV4[];
  activeJtsClassificationRunId?: string | null;
};

export type JtsOutputSnapshotV7 = {
  projectId: string;
  projectName: string;
  pointId: string;
  pointName: string;
  generatedAt: string;
  classificationMethod?: {
    methodId: ClassificationMethodIdV1;
    label: string;
    version: string;
    packageId?: string;
    reference?: string;
    mappingVersion: string;
    nativeMappings?: Array<{ classCode: string; classLabel: string; engineeringGroup: string }>;
  };
  reportSource?: {
    schemeId: string;
    schemeName: string;
    stratificationRevisionId: string;
  };
  authority: { checkRunId: string; classificationRunId: string; classificationResultHash: string; stratificationRevisionId: string; parameterPackageRunId: string; parameterPackageResultHash: string; dissipationResultRevisionId: string | null };
  parameterSource?: {
    classificationRunId: string;
    classificationResultHash: string;
    stratificationRevisionId: string;
    sourceLineageHash: string;
  };
  measuredRows: Array<{ sourceRowId: string; depthM: number; qcKpa: number; fsKpa: number; u2Kpa: number | null }>;
  classificationRows: Array<{
    sourceRowId: string;
    depthM: number;
    qtn: number | null;
    ic: number | null;
    soilClassId: string | null;
    classCode?: string | null;
    label: string | null;
    engineeringGroup?: string | null;
    confidence?: 'high' | 'review' | 'problem';
    approximate: boolean;
  }>;
  layers: Array<{ layerId: string; name: string; depthFromM: number; depthToM: number; engineeringSoilGroup: string }>;
  parameterRows?: Array<{
    sourceRowId: string;
    depthM: number;
    layerId: string;
    methodId: string;
    label: string;
    symbol: string;
    unit: string;
    status: 'value' | 'pending_confirmation' | 'unavailable' | 'problem' | 'ignored';
    value: number | null;
    reason: string | null;
    notices: string[];
    ignoreKind: 'ordinary' | 'forced' | null;
  }>;
  parameterValues: Array<{ layerId: string; methodId: string; symbol: string; unit: string; count: number; median: number | null; minimum: number | null; maximum: number | null }>;
  parameterExclusions?: Array<{ methodId: string; label: string; symbol: string; level: 'required' | 'recommended' | 'optional'; applicableLayerIds: string[]; reason: string; decidedAt: string }>;
  dissipation: { testRevisionId: string; t50Seconds: number; t50Origin: string; rigidityIndex?: number; smallStrainModulusKpa?: number; chM2PerSecond: number; khMPerSecond: number } | null;
  formulaReferences?: Array<{ methodId: string; symbol: string; formula: string; reference: string }>;
  notices: string[];
};

export type JtsOutputRevisionV7 = {
  revisionId: string;
  kind: 'a4-report-pdf' | 'a3-atlas-pdf' | 'excel-workbook';
  fileName: string;
  mimeType: string;
  status: 'current' | 'stale';
  snapshot: JtsOutputSnapshotV7;
  inputHash: string;
  createdAt: string;
  staleReason?: string;
};

export type JtsOutputWorkspaceV7 = {
  revisions: JtsOutputRevisionV7[];
  activeRevisionIds: Partial<Record<JtsOutputRevisionV7['kind'], string>>;
};

export type PointWorkspaceV2 = {
  pointId: string;
  siteId?: string | null;
  pointName: string;
  aliases: string[];
  waterDepthM: number;
  finalDepthM: number;
  importDrafts: PointImportDraftV2[];
  activeImportDraftId: string | null;
  checkState: CheckStateV2;
  stratificationWorkspace?: StratificationWorkspaceV2;
  parameterWorkspace?: ParameterWorkspaceV2;
  stratificationState: WorkflowArtifactState;
  parameterState: WorkflowArtifactState;
  outputState: WorkflowArtifactState;
  outputWorkspace?: JtsOutputWorkspaceV7;
  probeContext: PointProbeContextV3;
  waterContext: PointWaterContextV3;
  derivationState: PointDerivationStateV3;
  dataGovernance: DataGovernanceWorkspaceV3;
  selection: PointWorkflowSelectionV2;
  createdAt: string;
  updatedAt: string;
};

export type ProjectWorkspaceV2 = {
  projectId: string;
  projectName: string;
  mode: ProjectWorkspaceMode;
  quickPlotWorkspace?: QuickPlotWorkspaceV1;
  workspaceRevision: number;
  points: PointWorkspaceV2[];
  probeProfiles: ProbeProfileV3[];
  deletedPoints: DeletedPointRecordV3[];
  activePointId: string | null;
  importBatches: ImportBatchRecordV2[];
  activeImportBatchId: string | null;
  activeRoute: RouteId;
  activeBottomTab: 'issues' | 'log' | 'exports';
  flowFeedback: string;
  createdAt: string;
  updatedAt: string;
};

export function artifactDependenciesEqual(
  left: ArtifactDependency | null | undefined,
  right: ArtifactDependency | null | undefined,
) {
  if (!left || !right) return false;
  return left.pointId === right.pointId
    && left.draftId === right.draftId
    && left.batchId === right.batchId
    && left.revisions.source === right.revisions.source
    && left.revisions.mapping === right.revisions.mapping
    && left.revisions.unit === right.revisions.unit
    && left.revisions.normalization === right.revisions.normalization
    && left.revisions.pointPlan === right.revisions.pointPlan;
}

export function getActiveImportDependency(point: PointWorkspaceV2): ArtifactDependency | null {
  const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
  if (!draft) return null;
  return {
    pointId: point.pointId,
    draftId: draft.draftId,
    batchId: draft.batchId,
    revisions: { ...draft.revisions },
  };
}

export function selectCurrentCheckResult(point: PointWorkspaceV2) {
  const dependency = getActiveImportDependency(point);
  const artifact = point.checkState.artifact;
  const run = point.checkState.runs.find((candidate) => candidate.runId === point.checkState.activeRunId) ?? null;
  const expectedArtifactStatus = run?.conclusion === '存在问题' ? 'problem' : 'current';
  const hasFrozenContext = Boolean(
    run?.probeContextRevisionId
    || run?.probeProfileRevisionId
    || run?.waterContextRevisionId,
  );
  const contextIsCurrent = !hasFrozenContext || Boolean(
    run?.probeContextRevisionId === point.probeContext.revisionId
    && (run?.probeProfileRevisionId ?? null) === (point.probeContext.activeProfileRevisionId ?? null)
    && run?.waterContextRevisionId === point.waterContext.revisionId,
  );
  const isCurrent = Boolean(
    dependency
    && run
    && run.status === 'completed'
    && artifact.status === expectedArtifactStatus
    && artifactDependenciesEqual(run.input, dependency)
    && artifactDependenciesEqual(artifact.input, dependency)
    && artifactDependenciesEqual(artifact.input, run.input)
    && (run.valueOverrideRevisionId ?? null) === (point.dataGovernance?.currentValueOverrideRevisionId ?? null)
    && (run.exclusionRevisionId ?? null) === (point.dataGovernance?.currentExclusionRevisionId ?? null)
    && (run.smoothingRunId ?? null) === (point.dataGovernance?.activeSmoothingRunId ?? null)
    && contextIsCurrent
  );
  return {
    dependency,
    run: isCurrent ? run : null,
    artifactStatus: artifact.status === 'empty' ? 'empty' as const : isCurrent ? artifact.status : 'stale' as const,
    isCurrent,
  };
}

export function selectCheckCommitTarget(project: ProjectWorkspaceV2, requestedInput: ArtifactDependency) {
  if (project.activePointId !== requestedInput.pointId) return null;
  const point = project.points.find((candidate) => candidate.pointId === requestedInput.pointId) ?? null;
  if (!point || !artifactDependenciesEqual(getActiveImportDependency(point), requestedInput)) return null;
  return point;
}

export type ProjectCollectionStateV2 = {
  projects: ProjectWorkspaceV2[];
  activeProjectId: string | null;
};

export type ProjectManifestV2 = {
  schema: typeof PROJECT_MANIFEST_SCHEMA;
  version: typeof PROJECT_MANIFEST_VERSION;
  manifestId: string;
  manifestRevision: number;
  savedAt: string;
  state: ProjectCollectionStateV2;
};

export type SourceColumnV2 = {
  columnId: string;
  sourceIndex: number;
  header: string;
  normalizedHeader: string;
  sampleValues: string[];
  inferredValueType: 'text' | 'number' | 'mixed' | 'empty';
  extractionOrigin?: 'source-cell' | 'workbook-calculated-cell' | 'application-derived' | 'mixed' | 'metadata' | 'missing';
  mappingCandidates: Array<{ targetField: TargetFieldKey; confidence: 'high' | 'medium' | 'low' }>;
};

export type FieldMappingDecisionV2 = {
  targetField: TargetFieldKey;
  sourceColumnId: string | null;
  requiredLevel: 'required' | 'recommended' | 'optional';
  decisionSource: 'auto-exact' | 'auto-alias' | 'user' | 'unmapped';
  suggestionSource: 'standard-header' | 'alias-dictionary' | 'value-shape' | 'none';
  confidence: 'high' | 'medium' | 'low' | 'none';
  state: 'candidate' | 'confirmed' | 'missing' | 'conflict';
  confirmedAt?: string;
  confirmedRevision?: number;
};

export type PointAttributionDecisionV2 =
  | { source: 'source-column'; sourceColumnId: string }
  | { source: 'constant-name'; pointName: string }
  | { source: 'existing-point'; pointId: string };

export type UnitDecisionV2 = {
  targetField: TargetFieldKey;
  sourceColumnId: string;
  detectedUnit: string | null;
  selectedUnit: string | null;
  standardUnit: 'm' | 'kPa' | '%' | 'text';
  decisionSource: 'header' | 'value-range' | 'user' | 'not-applicable';
  confidence: 'high' | 'medium' | 'low' | 'none';
  state: 'confirmed' | 'needs-confirmation' | 'conflict' | 'not-applicable';
  conversion: { scale: number; offset: number } | null;
};

export type PointExecutionRecordV2 = {
  detectedPointKey: string;
  status: 'pending' | 'generated' | 'skipped' | 'problem' | 'failed';
  idempotencyKey: string;
  sourceFingerprint: string;
  resultPointId?: string;
  resultDraftId?: string;
  errorCode?: string;
};

export type PointTargetDecisionV2 = {
  detectedPointKey: string;
  action: 'create-point' | 'append-draft' | 'replace-active-draft' | 'rename-and-create' | 'skip' | 'pending';
  state: 'pending' | 'confirmed' | 'conflict';
  targetPointId?: string;
  proposedPointName?: string;
  expectedActiveDraftId?: string;
  reasonCode?:
    | 'POINT-TARGET-REQUIRED'
    | 'POINT-TARGET-NOT-FOUND'
    | 'POINT-TARGET-DUPLICATE'
    | 'POINT-NAME-REQUIRED'
    | 'POINT-NAME-CONFLICT'
    | 'POINT-ACTIVE-DRAFT-CHANGED';
};

export type PointSplitPlanV2 = {
  detectedPoints: Array<{ pointKey: string; pointName: string; rowCount: number }>;
  selectedPointKeys: string[];
  strategy: 'single' | 'split-all' | 'split-selected' | 'pending' | 'cancelled';
  state: 'ready' | 'needs-decision' | 'conflict' | 'cancelled';
  conflicts: Array<{
    detectedPointKey: string;
    existingPointId: string;
    reason: 'name' | 'alias' | 'id';
  }>;
  targetDecisions?: PointTargetDecisionV2[];
  executions: PointExecutionRecordV2[];
};

export type ImportBatchDraftV2 = {
  kind: 'draft';
  batchId: string;
  operationId: string;
  baseWorkspaceRevision: number;
  sourceFingerprint: string;
  source: {
    mode: string;
    fileName: string;
    fileType: string;
    sheetName?: string;
    headerRow?: number;
    workbookSheets?: Array<{ sheetName: string; rowCount: number; columnCount: number; state: string }>;
    parseDurationMs?: number;
    originalFileSize?: number;
  };
  parseState: 'selected' | 'parsing' | 'parsed' | 'error';
  workflowState:
    | 'editing'
    | 'ready-to-generate'
    | 'generating'
    | 'generated'
    | 'partially-generated'
    | 'failed'
    | 'cancelled';
  sourceColumns: SourceColumnV2[];
  sourceValueOverrides?: Array<{
    overrideId: string;
    sourceRowId: string;
    sourceColumnId: string;
    displayRowNumber: number;
    originalValue: string;
    replacementValue: string;
    reason: string;
    source: 'assistant';
    proposedAt?: string;
    confirmedAt: string | null;
  }>;
  rawDataBlockId: string | null;
  mappings: FieldMappingDecisionV2[];
  unitDecisions: UnitDecisionV2[];
  normalizedDataBlockId: string | null;
  pointAttribution: PointAttributionDecisionV2 | null;
  pointPlan: PointSplitPlanV2;
  problems: ImportDraftProblem[];
  generatedDraftIds: string[];
  revisions: RevisionVector;
  createdAt: string;
  updatedAt: string;
};

export type ImportBatchTombstoneV2 = {
  kind: 'tombstone';
  batchId: string;
  sourceFingerprint: string;
  sourceSummary: { fileName: string; fileType: string; rowCount: number };
  revisions: RevisionVector;
  generatedDraftIds: string[];
  archivedAt: string;
};

export type ImportBatchRecordV2 = ImportBatchDraftV2 | ImportBatchTombstoneV2;

export type PointImportDraftV2 = {
  draftId: string;
  batchId: string;
  pointId: string;
  sourcePointName: string;
  sourceRowIds: string[];
  dataBlockId: string;
  valueProvenance: Partial<
    Record<TargetFieldKey, {
      origin: 'source' | 'assistant-cleanup' | 'derived' | 'defaulted' | 'missing';
      sourceColumnId?: string;
      derivedFrom?: TargetFieldKey[];
      defaultReason?: string;
      sourceUnit?: string | null;
      standardUnit?: UnitDecisionV2['standardUnit'];
    }>
  >;
  revisions: RevisionVector;
  problems: ImportDraftProblem[];
  status: 'ready' | 'issue' | 'stale';
};

export type RawImportDataBlockV2 = {
  kind: 'raw';
  dataBlockId: string;
  batchId: string;
  sourceFingerprint: string;
  rows: string[][];
  rowReferences?: Array<{ sourceRowId: string; sourceIndex: number; displayRowNumber: number }>;
  sourceAttachment?: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    bytes: number[];
  };
  workbookExtraction?: {
    sheetName: string;
    fidelity: 'cached-values';
    headerRows: string[][];
    rows: string[][];
    displayRowNumbers: number[];
    formulaDefinitionsRequireOriginalFile: true;
  };
  completeness: 'full' | 'preview-only';
};

export type NormalizedImportDataBlockV2 = {
  kind: 'normalized';
  dataBlockId: string;
  batchId: string;
  sourceFingerprint: string;
  rows: SyntheticFlowCase['rows'];
  rowReferences?: Array<{ sourceRowId: string; normalizedIndex: number }>;
};

export type ImportDataBlockV2 = RawImportDataBlockV2 | NormalizedImportDataBlockV2;

export type MigrationRecordV2 = {
  migrationId: string;
  sourceSchema: 'sigs-oglab.project-collection';
  sourceVersion: 1;
  sourceFingerprint: string;
  targetManifestId: string;
  migratorVersion: 1;
  migratedAt: string;
  status: 'completed';
};

export type ProjectMigrationBundleV2 = {
  manifest: ProjectManifestV2;
  dataBlocks: ImportDataBlockV2[];
  migrationRecord: MigrationRecordV2;
};

export function emptyArtifactState(): WorkflowArtifactState {
  return { status: 'empty', input: null };
}

export function createInitialRevisionVector(): RevisionVector {
  return { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 };
}
