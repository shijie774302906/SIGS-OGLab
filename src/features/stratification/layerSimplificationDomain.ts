import type { MajorGroupReviewReasonV2, StratificationBoundaryV2, StratificationLayerV2, StratificationSchemeV2 } from '../workspace/workspaceV2';
import { thinLayerSchemeSignature, type ThinLayerEvidenceRow } from './thinLayerDomain';

const AUDIT_CONFLICT_LIMITS = { qc: 0.65, fs: 0.65, u2: 0.85 } as const;

export type MajorGroupMergeChannel = {
  key: 'qc' | 'fs' | 'u2';
  valid: boolean;
  upperMedian: number | null;
  lowerMedian: number | null;
  relativeDistance: number | null;
  conflicting: boolean;
};

export type MajorGroupMergeStep = {
  stepId: string;
  boundaryId: string;
  boundaryDepthM: number;
  upperLayerId: string;
  lowerLayerId: string;
  upperDepthFromM: number;
  upperDepthToM: number;
  lowerDepthFromM: number;
  lowerDepthToM: number;
  resultingDepthFromM: number;
  resultingDepthToM: number;
  resultingSoilGroup: string;
  resultingDetailedSoilTypes: string[];
  resultingLabel: string;
  sourceLayerIds: string[];
  reason: string;
  channels: MajorGroupMergeChannel[];
};

export type MajorGroupResultLayer = {
  layerId: string;
  depthFromM: number;
  depthToM: number;
  engineeringSoilGroup: string;
  detailedSoilTypes: string[];
  displayLabel: string;
  sourceLayerIds: string[];
  mergedBoundaryCount: number;
  reviewReasons: MajorGroupReviewReasonV2[];
  requiresReview: boolean;
  conflictBoundaryCount: number;
  conflictingChannels: Array<'qc' | 'fs' | 'u2'>;
};

export type ProtectedMajorGroupBoundary = {
  boundaryId: string;
  depthM: number;
  upperLayerId: string;
  lowerLayerId: string;
  reasonCode: 'BOUNDARY-LOCKED' | 'DIFFERENT-GROUP' | 'UNCLASSIFIED';
  reason: string;
};

export type MajorGroupMergeAnalysis = {
  method: 'major-soil-group';
  sourceSignature: string;
  planSignature: string;
  currentLayerCount: number;
  plannedLayerCount: number;
  mergedBoundaryCount: number;
  steps: MajorGroupMergeStep[];
  resultLayers: MajorGroupResultLayer[];
  protectedBoundaries: ProtectedMajorGroupBoundary[];
};

export function layerSimplificationSchemeSignature(scheme: StratificationSchemeV2) {
  return [
    thinLayerSchemeSignature(scheme),
    scheme.layers.map((layer) => [
      layer.layerId,
      layer.engineeringSoilGroup,
      layer.soilDecision?.suggestedGroup ?? '',
      layer.soilDecision?.finalGroup ?? '',
      layer.soilDecision?.suggestedDetailedType ?? '',
      layer.soilDecision?.finalDetailedType ?? '',
      layer.soilConfirmationRequired ? 1 : 0,
      layer.reviewRequired ? 1 : 0,
      layer.evidenceReviewRequired ? 1 : 0,
      layer.majorGroupComposition?.engineeringSoilGroup ?? '',
      layer.majorGroupComposition?.detailedSoilTypes.join('/') ?? '',
      layer.majorGroupComposition?.sourceLayerIds.join('/') ?? '',
      JSON.stringify(reviewReasonsForLayer(layer)),
    ].join(':')).join('|'),
    scheme.boundaries.map((boundary) => `${boundary.boundaryId}:${boundary.reviewRequired ? 1 : 0}:${boundary.majorGroupMergeLocked ? 1 : 0}:${boundary.note}`).join('|'),
  ].join('::');
}

export function analyzeMajorGroupMerge(
  scheme: StratificationSchemeV2,
  rows: ThinLayerEvidenceRow[],
): MajorGroupMergeAnalysis {
  if (!scheme.layers.length) throw new Error('当前方案没有可整理的土层。');
  const sourceSignature = layerSimplificationSchemeSignature(scheme);
  const simulated = structuredClone(scheme);
  const steps: MajorGroupMergeStep[] = [];

  while (true) {
    const candidate = [...simulated.boundaries]
      .sort((left, right) => left.depthM - right.depthM || left.boundaryId.localeCompare(right.boundaryId))
      .map((boundary) => {
        const upper = simulated.layers.find((layer) => layer.layerId === boundary.upperLayerId);
        const lower = simulated.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
        return upper && lower ? { boundary, upper, lower, evaluation: evaluateBoundary(boundary, upper, lower) } : null;
      })
      .find((item) => item?.evaluation.eligible);
    if (!candidate) break;
    const step = makeStep(steps.length + 1, candidate.boundary, candidate.upper, candidate.lower, rows, simulated.depthToM);
    steps.push(step);
    mergeSimulationPair(simulated, candidate.boundary, candidate.upper, candidate.lower, step);
  }

  const resultLayers = [...simulated.layers]
    .sort((left, right) => left.depthFromM - right.depthFromM)
    .map((layer): MajorGroupResultLayer => {
      const group = finalSoilGroup(layer) ?? 'unclassified';
      const detailedSoilTypes = compositionDetailedTypes(layer);
      const sourceLayerIds = compositionSourceLayerIds(layer);
      const relevantSteps = steps.filter((step) => step.resultingDepthFromM >= layer.depthFromM - 1e-9
        && step.resultingDepthToM <= layer.depthToM + 1e-9);
      const conflictingSteps = relevantSteps.filter((step) => step.channels.some((channel) => channel.conflicting));
      const curveReasons: MajorGroupReviewReasonV2[] = conflictingSteps.map((step) => ({
        kind: 'curve-difference',
        boundaryId: step.boundaryId,
        boundaryDepthM: step.boundaryDepthM,
        channels: step.channels.filter((channel) => channel.conflicting).map((channel) => channel.key),
      }));
      const reviewReasons = normalizeMajorGroupReviewReasons([...reviewReasonsForLayer(layer), ...curveReasons]);
      const curveReviewReasons = reviewReasons.filter((reason) => reason.kind === 'curve-difference');
      const conflictingChannels = uniqueInOrder(curveReviewReasons.flatMap((reason) => reason.channels));
      return {
        layerId: layer.layerId,
        depthFromM: layer.depthFromM,
        depthToM: layer.depthToM,
        engineeringSoilGroup: group,
        detailedSoilTypes,
        displayLabel: majorGroupCompositionLabel(group, detailedSoilTypes),
        sourceLayerIds,
        mergedBoundaryCount: relevantSteps.length,
        reviewReasons,
        requiresReview: reviewReasons.length > 0,
        conflictBoundaryCount: curveReviewReasons.length,
        conflictingChannels,
      };
    });
  const protectedBoundaries = [...simulated.boundaries]
    .sort((left, right) => left.depthM - right.depthM)
    .flatMap((boundary): ProtectedMajorGroupBoundary[] => {
      const upper = simulated.layers.find((layer) => layer.layerId === boundary.upperLayerId);
      const lower = simulated.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
      if (!upper || !lower) return [];
      const evaluation = evaluateBoundary(boundary, upper, lower);
      if (evaluation.eligible) return [];
      return [{
        boundaryId: boundary.boundaryId,
        depthM: boundary.depthM,
        upperLayerId: upper.layerId,
        lowerLayerId: lower.layerId,
        reasonCode: evaluation.reasonCode,
        reason: evaluation.reason,
      }];
    });
  const analysisWithoutSignature = {
    method: 'major-soil-group' as const,
    sourceSignature,
    currentLayerCount: scheme.layers.length,
    plannedLayerCount: resultLayers.length,
    mergedBoundaryCount: steps.length,
    steps,
    resultLayers,
    protectedBoundaries,
  };
  return {
    ...analysisWithoutSignature,
    planSignature: JSON.stringify(analysisWithoutSignature),
  };
}

function evaluateBoundary(boundary: StratificationBoundaryV2, upper: StratificationLayerV2, lower: StratificationLayerV2) {
  if (boundary.majorGroupMergeLocked) return {
    eligible: false as const,
    reasonCode: 'BOUNDARY-LOCKED' as const,
    reason: '该边界已由工程师标记为保留；即使两侧属于同一大类也不会自动合并。',
  };
  const upperGroup = finalSoilGroup(upper);
  const lowerGroup = finalSoilGroup(lower);
  if (!upperGroup || !lowerGroup) return {
    eligible: false as const,
    reasonCode: 'UNCLASSIFIED' as const,
    reason: '边界至少一侧尚未确认工程土类，不能按大类自动合并。',
  };
  if (upperGroup !== lowerGroup) return {
    eligible: false as const,
    reasonCode: 'DIFFERENT-GROUP' as const,
    reason: `边界两侧分别为${majorGroupLabel(upperGroup)}和${majorGroupLabel(lowerGroup)}，大类不同，自动保留。`,
  };
  return { eligible: true as const, reasonCode: null, reason: '' };
}

function makeStep(
  index: number,
  boundary: StratificationBoundaryV2,
  upper: StratificationLayerV2,
  lower: StratificationLayerV2,
  rows: ThinLayerEvidenceRow[],
  schemeDepthToM: number,
): MajorGroupMergeStep {
  const resultingSoilGroup = finalSoilGroup(upper) ?? 'unclassified';
  const resultingDetailedSoilTypes = uniqueInOrder([
    ...compositionDetailedTypes(upper),
    ...compositionDetailedTypes(lower),
  ]);
  const channels = comparePairChannels(upper, lower, rows, schemeDepthToM);
  const channelSummary = channels.map((channel) => {
    if (!channel.valid || channel.relativeDistance === null) return `${channel.key}无有效对比`;
    return `${channel.key}差异${Math.round(channel.relativeDistance * 100)}%`;
  }).join('、');
  return {
    stepId: `major-group:${index}:${boundary.boundaryId}`,
    boundaryId: boundary.boundaryId,
    boundaryDepthM: boundary.depthM,
    upperLayerId: upper.layerId,
    lowerLayerId: lower.layerId,
    upperDepthFromM: upper.depthFromM,
    upperDepthToM: upper.depthToM,
    lowerDepthFromM: lower.depthFromM,
    lowerDepthToM: lower.depthToM,
    resultingDepthFromM: upper.depthFromM,
    resultingDepthToM: lower.depthToM,
    resultingSoilGroup,
    resultingDetailedSoilTypes,
    resultingLabel: majorGroupCompositionLabel(resultingSoilGroup, resultingDetailedSoilTypes),
    sourceLayerIds: uniqueInOrder([...compositionSourceLayerIds(upper), ...compositionSourceLayerIds(lower)]),
    reason: `相邻层均为${majorGroupLabel(resultingSoilGroup)}，按土类大类合并。${channelSummary}仅作为规则差异提示，不改变合并结果。`,
    channels,
  };
}

function comparePairChannels(upper: StratificationLayerV2, lower: StratificationLayerV2, rows: ThinLayerEvidenceRow[], schemeDepthToM: number) {
  const definitions = [
    { key: 'qc' as const, read: (row: ThinLayerEvidenceRow) => row.qcKpa },
    { key: 'fs' as const, read: (row: ThinLayerEvidenceRow) => row.fsKpa },
    { key: 'u2' as const, read: (row: ThinLayerEvidenceRow) => row.u2Kpa ?? Number.NaN },
  ];
  return definitions.map(({ key, read }): MajorGroupMergeChannel => {
    const upperValues = valuesWithin(rows, upper, read, schemeDepthToM);
    const lowerValues = valuesWithin(rows, lower, read, schemeDepthToM);
    const upperMedian = median(upperValues);
    const lowerMedian = median(lowerValues);
    const valid = upperMedian !== null && lowerMedian !== null && (key === 'u2' || (upperValues.length >= 2 && lowerValues.length >= 2));
    const relativeDistance = valid ? normalizedDistance(upperMedian, lowerMedian) : null;
    return {
      key,
      valid,
      upperMedian,
      lowerMedian,
      relativeDistance,
      conflicting: Boolean(valid && relativeDistance !== null && relativeDistance > AUDIT_CONFLICT_LIMITS[key]),
    };
  });
}

function mergeSimulationPair(
  scheme: StratificationSchemeV2,
  boundary: StratificationBoundaryV2,
  upper: StratificationLayerV2,
  lower: StratificationLayerV2,
  step: MajorGroupMergeStep,
) {
  const reviewReasons = normalizeMajorGroupReviewReasons([
    ...reviewReasonsForLayer(upper),
    ...reviewReasonsForLayer(lower),
  ]);
  upper.depthToM = lower.depthToM;
  upper.engineeringSoilGroup = step.resultingSoilGroup;
  upper.soilDecision = {
    ...(upper.soilDecision ?? {
      suggestedGroup: step.resultingSoilGroup,
      finalGroup: step.resultingSoilGroup,
      source: 'inherited' as const,
      decidedAt: new Date(0).toISOString(),
    }),
    suggestedGroup: step.resultingSoilGroup,
    finalGroup: step.resultingSoilGroup,
    suggestedDetailedType: null,
    finalDetailedType: null,
  };
  upper.majorGroupComposition = {
    engineeringSoilGroup: step.resultingSoilGroup,
    detailedSoilTypes: [...step.resultingDetailedSoilTypes],
    sourceLayerIds: [...step.sourceLayerIds],
    reviewReasons,
  };
  upper.soilConfirmationRequired = Boolean(upper.soilConfirmationRequired || lower.soilConfirmationRequired);
  upper.reviewRequired = Boolean(upper.reviewRequired || lower.reviewRequired);
  upper.evidenceReviewRequired = upper.evidenceReviewRequired || lower.evidenceReviewRequired;
  scheme.layers = scheme.layers.filter((layer) => layer.layerId !== lower.layerId);
  scheme.boundaries = scheme.boundaries.filter((candidate) => candidate.boundaryId !== boundary.boundaryId);
  relinkScheme(scheme);
}

function relinkScheme(scheme: StratificationSchemeV2) {
  scheme.layers.sort((left, right) => left.depthFromM - right.depthFromM);
  scheme.boundaries.sort((left, right) => left.depthM - right.depthM);
  scheme.boundaries.forEach((boundary, index) => {
    boundary.upperLayerId = scheme.layers[index]?.layerId ?? boundary.upperLayerId;
    boundary.lowerLayerId = scheme.layers[index + 1]?.layerId ?? boundary.lowerLayerId;
  });
}

function finalSoilGroup(layer: StratificationLayerV2) {
  const finalGroup = layer.soilDecision?.finalGroup;
  if (finalGroup && finalGroup !== 'unclassified') return finalGroup;
  if (layer.engineeringSoilGroup && layer.engineeringSoilGroup !== 'unclassified') return layer.engineeringSoilGroup;
  return null;
}

function compositionDetailedTypes(layer: StratificationLayerV2) {
  if (layer.majorGroupComposition?.detailedSoilTypes.length) return [...layer.majorGroupComposition.detailedSoilTypes];
  const detailed = layer.soilDecision?.finalDetailedType
    ?? (layer.soilDecision?.suggestedGroup === finalSoilGroup(layer) ? layer.soilDecision?.suggestedDetailedType : null);
  return detailed ? [detailed] : [];
}

function compositionSourceLayerIds(layer: StratificationLayerV2) {
  if (layer.majorGroupComposition?.sourceLayerIds.length) return [...layer.majorGroupComposition.sourceLayerIds];
  if (layer.mergeSources?.length) return uniqueInOrder(layer.mergeSources.map((source) => source.sourceLayerId));
  return [layer.layerId];
}

export function reviewReasonsForLayer(layer: StratificationLayerV2): MajorGroupReviewReasonV2[] {
  const sourceLayerIds = compositionSourceLayerIds(layer);
  const composition = layer.majorGroupComposition;
  if (composition?.reviewReasons !== undefined) return normalizeMajorGroupReviewReasons(composition.reviewReasons);
  if (composition) {
    const hasLegacyCompositionReview = Boolean(
      layer.reviewRequired
      || layer.soilConfirmationRequired
      || layer.evidenceReviewRequired
      || composition.requiresReview
      || composition.sourceReviewRequired
      || (composition.conflictBoundaryCount ?? 0) > 0
      || composition.conflictingChannels?.length,
    );
    return hasLegacyCompositionReview
      ? [{ kind: 'legacy-untyped', sourceLayerIds }]
      : [];
  }
  const reasons: MajorGroupReviewReasonV2[] = [];
  if (layer.soilConfirmationRequired) reasons.push({ kind: 'source-soil-confirmation', sourceLayerIds });
  if (layer.evidenceReviewRequired) reasons.push({ kind: 'source-evidence', sourceLayerIds });
  const hasTypedLegacyLayerReason = Boolean(layer.soilConfirmationRequired || layer.evidenceReviewRequired);
  const hasUntypedLegacyReason = Boolean(
    layer.reviewRequired && !hasTypedLegacyLayerReason,
  );
  if (hasUntypedLegacyReason) reasons.push({ kind: 'legacy-untyped', sourceLayerIds });
  return normalizeMajorGroupReviewReasons(reasons);
}

export function normalizeMajorGroupReviewReasons(reasons: MajorGroupReviewReasonV2[]) {
  const sourceBuckets = new Map<'source-soil-confirmation' | 'source-evidence' | 'legacy-untyped', Set<string>>();
  const curveBuckets = new Map<string, { boundaryId: string; boundaryDepthM: number; channels: Set<'qc' | 'fs' | 'u2'> }>();
  for (const reason of reasons) {
    if (reason.kind === 'curve-difference') {
      const boundaryDepthM = Number(reason.boundaryDepthM.toFixed(6));
      const key = `${reason.boundaryId}:${boundaryDepthM.toFixed(6)}`;
      const bucket = curveBuckets.get(key) ?? { boundaryId: reason.boundaryId, boundaryDepthM, channels: new Set() };
      reason.channels.forEach((channel) => bucket.channels.add(channel));
      curveBuckets.set(key, bucket);
      continue;
    }
    const bucket = sourceBuckets.get(reason.kind) ?? new Set<string>();
    reason.sourceLayerIds.forEach((layerId) => { if (layerId) bucket.add(layerId); });
    sourceBuckets.set(reason.kind, bucket);
  }
  const result: MajorGroupReviewReasonV2[] = [];
  (['source-soil-confirmation', 'source-evidence'] as const).forEach((kind) => {
    const sourceLayerIds = [...(sourceBuckets.get(kind) ?? [])].sort();
    if (sourceLayerIds.length) result.push({ kind, sourceLayerIds });
  });
  [...curveBuckets.values()]
    .sort((left, right) => left.boundaryDepthM - right.boundaryDepthM || left.boundaryId.localeCompare(right.boundaryId))
    .forEach((reason) => result.push({
      kind: 'curve-difference',
      boundaryId: reason.boundaryId,
      boundaryDepthM: reason.boundaryDepthM,
      channels: (['qc', 'fs', 'u2'] as const).filter((channel) => reason.channels.has(channel)),
    }));
  const legacySourceLayerIds = [...(sourceBuckets.get('legacy-untyped') ?? [])].sort();
  if (legacySourceLayerIds.length) result.push({ kind: 'legacy-untyped', sourceLayerIds: legacySourceLayerIds });
  return result;
}

export function majorGroupLabel(group: string) {
  if (group === 'sand') return '砂性土';
  if (group === 'mixed') return '混合土';
  if (group === 'clay') return '黏性土';
  return '未确认土类';
}

export function majorGroupCompositionLabel(group: string, detailedSoilTypes: string[]) {
  return `${majorGroupLabel(group)}（组成：${detailedSoilTypes.length ? detailedSoilTypes.join('、') : '未细分'}）`;
}

function valuesWithin(rows: ThinLayerEvidenceRow[], layer: StratificationLayerV2, read: (row: ThinLayerEvidenceRow) => number, schemeDepthToM: number) {
  const includesFinalDepth = Math.abs(layer.depthToM - schemeDepthToM) <= 1e-9;
  return rows
    .filter((row) => row.depthM >= layer.depthFromM - 1e-9
      && (row.depthM < layer.depthToM - 1e-9 || (includesFinalDepth && row.depthM <= layer.depthToM + 1e-9)))
    .map(read)
    .filter(Number.isFinite);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizedDistance(left: number, right: number) {
  return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right), 1);
}

function uniqueInOrder<T extends string>(values: T[]) {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}
