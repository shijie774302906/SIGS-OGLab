import type { StratificationLayerV2, StratificationSchemeV2 } from '../workspace/workspaceV2';

export const DEFAULT_THIN_LAYER_THRESHOLD_M = 0.5;
export const THIN_LAYER_RELIABILITY_REFERENCE_M = 0.15;

export type ThinLayerEvidenceRow = {
  depthM: number;
  qcKpa: number;
  fsKpa: number;
  u2Kpa?: number | null;
};

export type ThinLayerDecision = 'preserve' | 'merge-above' | 'merge-below' | 'merge-surrounding';
export type ThinLayerRecommendation = 'safe-auto' | 'engineer-review' | 'preserve';

export type ThinLayerChannelSummary = {
  key: 'qc' | 'fs' | 'u2';
  valid: boolean;
  thinMedian: number | null;
  upperMedian: number | null;
  lowerMedian: number | null;
  neighborMedian: number | null;
  relativeDistance: number | null;
  conflicting: boolean;
};

export type ThinLayerCandidate = {
  candidateId: string;
  layerId: string;
  layerIndex: number;
  depthFromM: number;
  depthToM: number;
  thicknessM: number;
  upperLayerId: string | null;
  lowerLayerId: string | null;
  upperLabel: string | null;
  lowerLabel: string | null;
  suggestedGroup: string | null;
  neighborGroup: string | null;
  recommendation: ThinLayerRecommendation;
  defaultDecision: ThinLayerDecision;
  allowedDecisions: ThinLayerDecision[];
  reasonCode:
    | 'SAFE-SAME-GROUP'
    | 'EDGE-LAYER'
    | 'DIFFERENT-GROUP'
    | 'UNCLASSIFIED'
    | 'IMPORTANT-EVIDENCE'
    | 'INSUFFICIENT-EVIDENCE'
    | 'CHANNEL-CONFLICT'
    | 'OVERLAPPING-SAFE-CANDIDATE';
  reason: string;
  channels: ThinLayerChannelSummary[];
};

export type ThinLayerAnalysis = {
  thresholdM: number;
  sourceSignature: string;
  candidates: ThinLayerCandidate[];
  safeCount: number;
  reviewCount: number;
  preserveCount: number;
};

export type ThinLayerPlanDecision = {
  candidateId: string;
  layerId: string;
  decision: ThinLayerDecision;
  reason: string;
};

export function thinLayerSchemeSignature(scheme: StratificationSchemeV2) {
  return [
    scheme.schemeId,
    scheme.version,
    scheme.layers.map((layer) => `${layer.layerId}:${round(layer.depthFromM)}:${round(layer.depthToM)}:${suggestedGroup(layer) ?? 'unclassified'}`).join('|'),
    scheme.boundaries.map((boundary) => `${boundary.boundaryId}:${round(boundary.depthM)}:${boundary.upperLayerId}:${boundary.lowerLayerId}`).join('|'),
  ].join('::');
}

export function analyzeThinLayers(
  scheme: StratificationSchemeV2,
  rows: ThinLayerEvidenceRow[],
  thresholdM = DEFAULT_THIN_LAYER_THRESHOLD_M,
): ThinLayerAnalysis {
  if (!Number.isFinite(thresholdM) || thresholdM <= 0 || thresholdM >= scheme.depthToM - scheme.depthFromM) {
    throw new Error('薄层筛选厚度必须大于 0，且小于当前有效深度范围。');
  }
  const ordered = [...scheme.layers].sort((left, right) => left.depthFromM - right.depthFromM);
  const baseCandidates = ordered
    .map((layer, index) => ({ layer, index, thicknessM: layer.depthToM - layer.depthFromM }))
    .filter(({ thicknessM }) => thicknessM < thresholdM - 1e-9)
    .sort((left, right) => left.thicknessM - right.thicknessM || left.layer.depthFromM - right.layer.depthFromM);
  const reservedForSafeMerge = new Set<string>();
  const byLayerId = new Map<string, ThinLayerCandidate>();

  baseCandidates.forEach(({ layer, index, thicknessM }) => {
    const upper = ordered[index - 1] ?? null;
    const lower = ordered[index + 1] ?? null;
    const layerGroup = suggestedGroup(layer);
    const upperGroup = upper ? suggestedGroup(upper) : null;
    const lowerGroup = lower ? suggestedGroup(lower) : null;
    const channels = evidenceComparison(layer, upper, lower, rows);
    let recommendation: ThinLayerRecommendation = 'engineer-review';
    let defaultDecision: ThinLayerDecision = 'preserve';
    let reasonCode: ThinLayerCandidate['reasonCode'] = 'DIFFERENT-GROUP';
    let reason = '上下层建议土组不同，需要工程师结合三条曲线判断。';

    if (!upper || !lower) {
      reasonCode = 'EDGE-LAYER';
      reason = '位于孔顶或孔底，只有一侧邻层，系统不会自动合并。';
    } else if (layer.evidenceReviewRequired || layer.soilDecision?.reviewStatus === 'needs-review' || layer.soilDecision?.reviewStatus === 'deferred') {
      recommendation = 'preserve';
      reasonCode = 'IMPORTANT-EVIDENCE';
      reason = '该层已有证据复核或暂存标记，默认保留。';
    } else if (!layerGroup || !upperGroup || !lowerGroup) {
      reasonCode = 'UNCLASSIFIED';
      reason = '当前层或邻层没有可用的建议工程土组，不能自动判断。';
    } else if (layerGroup !== upperGroup || layerGroup !== lowerGroup) {
      reasonCode = 'DIFFERENT-GROUP';
      reason = '薄层与上下邻层的建议工程土组不一致，默认保留。';
    } else if (channels.filter((channel) => channel.key !== 'u2').some((channel) => !channel.valid)) {
      reasonCode = 'INSUFFICIENT-EVIDENCE';
      reason = 'qc 或 fs 在该区间缺少足够有效点，不能自动判断。';
    } else if (channels.some((channel) => channel.conflicting)) {
      recommendation = 'preserve';
      reasonCode = 'CHANNEL-CONFLICT';
      reason = '至少一条可用曲线与邻层存在明显差异，建议保留并人工确认。';
    } else if ([upper.layerId, layer.layerId, lower.layerId].some((layerId) => reservedForSafeMerge.has(layerId))) {
      reasonCode = 'OVERLAPPING-SAFE-CANDIDATE';
      reason = '该层与另一项安全合并范围重叠，已取消自动预选，避免级联合并。';
    } else {
      recommendation = 'safe-auto';
      defaultDecision = 'merge-surrounding';
      reasonCode = 'SAFE-SAME-GROUP';
      reason = `上下三层均建议为${soilGroupLabel(layerGroup)}，且可用曲线未见明显冲突，可合并为一个候选层。`;
      reservedForSafeMerge.add(upper.layerId);
      reservedForSafeMerge.add(layer.layerId);
      reservedForSafeMerge.add(lower.layerId);
    }

    const allowedDecisions: ThinLayerDecision[] = !upper
      ? ['preserve', 'merge-below']
      : !lower
        ? ['preserve', 'merge-above']
        : recommendation === 'safe-auto'
          ? ['merge-surrounding', 'preserve', 'merge-above', 'merge-below']
          : ['preserve', 'merge-above', 'merge-below'];
    byLayerId.set(layer.layerId, {
      candidateId: `thin:${layer.layerId}`,
      layerId: layer.layerId,
      layerIndex: index,
      depthFromM: layer.depthFromM,
      depthToM: layer.depthToM,
      thicknessM,
      upperLayerId: upper?.layerId ?? null,
      lowerLayerId: lower?.layerId ?? null,
      upperLabel: upper ? layerLabel(upper, index - 1) : null,
      lowerLabel: lower ? layerLabel(lower, index + 1) : null,
      suggestedGroup: layerGroup,
      neighborGroup: upperGroup && upperGroup === lowerGroup ? upperGroup : null,
      recommendation,
      defaultDecision,
      allowedDecisions,
      reasonCode,
      reason,
      channels,
    });
  });

  const candidates = ordered.flatMap((layer) => byLayerId.get(layer.layerId) ?? []);
  return {
    thresholdM,
    sourceSignature: thinLayerSchemeSignature(scheme),
    candidates,
    safeCount: candidates.filter((candidate) => candidate.recommendation === 'safe-auto').length,
    reviewCount: candidates.filter((candidate) => candidate.recommendation === 'engineer-review').length,
    preserveCount: candidates.filter((candidate) => candidate.recommendation === 'preserve').length,
  };
}

function evidenceComparison(
  thin: StratificationLayerV2,
  upper: StratificationLayerV2 | null,
  lower: StratificationLayerV2 | null,
  rows: ThinLayerEvidenceRow[],
): ThinLayerChannelSummary[] {
  const definitions = [
    { key: 'qc' as const, read: (row: ThinLayerEvidenceRow) => row.qcKpa, limit: 0.65 },
    { key: 'fs' as const, read: (row: ThinLayerEvidenceRow) => row.fsKpa, limit: 0.65 },
    { key: 'u2' as const, read: (row: ThinLayerEvidenceRow) => row.u2Kpa ?? Number.NaN, limit: 0.85 },
  ];
  return definitions.map(({ key, read, limit }) => {
    const thinValues = valuesWithin(rows, thin, read);
    const upperValues = upper ? valuesWithin(rows, upper, read) : [];
    const lowerValues = lower ? valuesWithin(rows, lower, read) : [];
    const neighborValues = [...upperValues, ...lowerValues];
    const thinMedian = median(thinValues);
    const upperMedian = median(upperValues);
    const lowerMedian = median(lowerValues);
    const neighborMedian = median(neighborValues);
    const valid = thinMedian !== null && upperMedian !== null && lowerMedian !== null
      && (key === 'u2' || (thinValues.length >= 2 && upperValues.length >= 2 && lowerValues.length >= 2));
    const distances = valid ? [
      normalizedDistance(thinMedian as number, upperMedian as number),
      normalizedDistance(thinMedian as number, lowerMedian as number),
      normalizedDistance(upperMedian as number, lowerMedian as number),
    ] : [];
    const relativeDistance = distances.length ? Math.max(...distances) : null;
    return {
      key,
      valid,
      thinMedian,
      upperMedian,
      lowerMedian,
      neighborMedian,
      relativeDistance,
      conflicting: Boolean(valid && distances.some((distance) => distance > limit)),
    };
  });
}

function valuesWithin(
  rows: ThinLayerEvidenceRow[],
  layer: StratificationLayerV2,
  read: (row: ThinLayerEvidenceRow) => number,
) {
  return rows
    .filter((row) => row.depthM >= layer.depthFromM - 1e-9 && row.depthM <= layer.depthToM + 1e-9)
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

function suggestedGroup(layer: StratificationLayerV2) {
  const group = layer.soilDecision?.suggestedGroup ?? layer.soilDecision?.finalGroup ?? layer.engineeringSoilGroup;
  return group && group !== 'unclassified' ? group : null;
}

function layerLabel(layer: StratificationLayerV2, index: number) {
  return `L${index + 1} ${layer.soilDecision?.suggestedDetailedType ?? layer.soilDecision?.finalDetailedType ?? soilGroupLabel(suggestedGroup(layer))}`;
}

export function thinLayerDecisionLabel(decision: ThinLayerDecision) {
  if (decision === 'merge-above') return '并入上层';
  if (decision === 'merge-below') return '并入下层';
  if (decision === 'merge-surrounding') return '合并上下同类层';
  return '保留薄层';
}

export function soilGroupLabel(group: string | null) {
  if (group === 'sand') return '砂土';
  if (group === 'mixed') return '混合土';
  if (group === 'clay') return '黏性土';
  return '未确定土组';
}

function round(value: number) {
  return Number(value.toFixed(3));
}
