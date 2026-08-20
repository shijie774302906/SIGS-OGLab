import type {
  JtsClassificationBoundaryCandidateV4,
  JtsClassificationEvidenceRowV4,
  JtsClassificationRunV4,
} from '../workspace/workspaceV2';

export const JTS_GUIDED_CANDIDATE_GROUPING_M = 0.5;

export type JtsGuidanceKind =
  | 'agreement'
  | 'ic-fallback'
  | 'pore-fallback'
  | 'adjacent'
  | 'conflict'
  | 'unclassifiable';

export type JtsGuidanceInterval = {
  intervalId: string;
  kind: Exclude<JtsGuidanceKind, 'agreement'>;
  depthFromM: number;
  depthToM: number;
  rowCount: number;
  reason: string;
  userMeaning: string;
};

export type JtsClassificationGuidance = {
  rowCount: number;
  agreementRows: number;
  icFallbackRows: number;
  poreFallbackRows: number;
  adjacentRows: number;
  conflictRows: number;
  unclassifiableRows: number;
  intervals: JtsGuidanceInterval[];
  reviewIntervals: JtsGuidanceInterval[];
  repairableRows: number;
  rawCandidateCount: number;
  stableCandidates: JtsClassificationBoundaryCandidateV4[];
  canUseIcFallback: boolean;
  canContinueWithBoundedGaps: boolean;
  canIgnoreIsolatedAnomalies: boolean;
  isolatedAnomalyIntervalCount: number;
  affectedThicknessM: number;
  maximumAnomalyThicknessM: number;
  ignoreReason: string;
  recommendedTitle: string;
  recommendedReason: string;
};

const guidanceCache = new WeakMap<JtsClassificationRunV4, JtsClassificationGuidance>();

export function getJtsClassificationGuidance(run: JtsClassificationRunV4): JtsClassificationGuidance {
  const cached = guidanceCache.get(run);
  if (cached) return cached;
  const classifiedRows = run.rows.map((row) => ({ row, kind: guidanceKind(row, run.route) }));
  const intervals = groupGuidanceIntervals(classifiedRows.filter(isGuidanceIntervalItem));
  const count = (kind: JtsGuidanceKind) => classifiedRows.filter((item) => item.kind === kind).length;
  const icFallbackRows = count('ic-fallback');
  const poreFallbackRows = count('pore-fallback');
  const unclassifiableRows = count('unclassifiable');
  const unclassifiableIntervals = intervals.filter((interval) => interval.kind === 'unclassifiable');
  const positiveSteps = run.rows.slice(1).map((row, index) => row.depthM - run.rows[index].depthM).filter((step) => step > 0).sort((a, b) => a - b);
  const representativeStepM = positiveSteps.length ? positiveSteps[Math.floor(positiveSteps.length / 2)] : 0;
  const anomalyThicknesses = unclassifiableIntervals.map((interval) => Math.max(representativeStepM, interval.depthToM - interval.depthFromM + representativeStepM));
  const affectedThicknessM = anomalyThicknesses.reduce((total, thickness) => total + thickness, 0);
  const maximumAnomalyThicknessM = Math.max(0, ...anomalyThicknesses);
  const firstDepthM = run.rows[0]?.depthM ?? 0;
  const lastDepthM = run.rows.at(-1)?.depthM ?? firstDepthM;
  let usesEndContextAllowance = false;
  const boundedByStableClass = unclassifiableIntervals.every((interval) => {
    const before = [...run.rows].reverse().find((row) => row.depthM < interval.depthFromM && row.selectedClass);
    const after = run.rows.find((row) => row.depthM > interval.depthToM && row.selectedClass);
    if (before?.selectedClass && after?.selectedClass) {
      if (before.selectedClass.soilClassId === after.selectedClass.soilClassId) return true;
      const nearEnd = interval.depthFromM - firstDepthM <= 0.1 || lastDepthM - interval.depthToM <= 0.1;
      if (nearEnd) usesEndContextAllowance = true;
      return nearEnd;
    }
    if (before?.selectedClass || after?.selectedClass) return true;
    return false;
  });
  const canIgnoreIsolatedAnomalies = unclassifiableRows > 0
    && unclassifiableRows / Math.max(run.rows.length, 1) <= 0.05
    && unclassifiableIntervals.length <= 24
    && maximumAnomalyThicknessM <= 0.75
    && affectedThicknessM <= 2;
  const stableCandidates = groupJtsCandidates(run.candidates, JTS_GUIDED_CANDIDATE_GROUPING_M);
  const canUseIcFallback = icFallbackRows > 0 && unclassifiableRows === 0;
  const canContinueWithBoundedGaps = unclassifiableRows > 0
    && unclassifiableRows <= 50
    && unclassifiableRows / Math.max(run.rows.length, 1) <= 0.01;
  const reviewIntervals = mergeReviewIntervals(
    intervals.filter((interval) => ['pore-fallback', 'adjacent', 'conflict', 'unclassifiable'].includes(interval.kind)),
  );
  const guidance: JtsClassificationGuidance = {
    rowCount: run.rows.length,
    agreementRows: count('agreement'),
    icFallbackRows,
    poreFallbackRows,
    adjacentRows: count('adjacent'),
    conflictRows: count('conflict'),
    unclassifiableRows,
    intervals,
    reviewIntervals,
    repairableRows: poreFallbackRows + unclassifiableRows,
    rawCandidateCount: run.candidates.length,
    stableCandidates,
    canUseIcFallback,
    canContinueWithBoundedGaps,
    canIgnoreIsolatedAnomalies,
    isolatedAnomalyIntervalCount: unclassifiableIntervals.length,
    affectedThicknessM,
    maximumAnomalyThicknessM,
    ignoreReason: canIgnoreIsolatedAnomalies
      ? !boundedByStableClass
        ? `异常区间物理范围有限，但相邻分类不同；候选会保留复核提示。`
        : usesEndContextAllowance
        ? `异常位于孔段端部，单段最长 ${maximumAnomalyThicknessM.toFixed(2)} m；候选会保留复核提示。`
        : `异常已合并为 ${unclassifiableIntervals.length} 个短区间，单段最长 ${maximumAnomalyThicknessM.toFixed(2)} m；相邻有效分类稳定。`
      : unclassifiableRows
        ? '异常区间较厚、位于孔段端部或上下分类不一致，不建议直接忽略。'
        : '当前没有需要忽略的不可分类点。',
    recommendedTitle: unclassifiableRows > 0
      ? '先检查未识别土类的区间'
      : canUseIcFallback
        ? '使用 Ic 结果生成地层'
        : '生成可编辑地层方案',
    recommendedReason: unclassifiableRows > 0
      ? `${unclassifiableRows} 行两条路径都没有分类结果，处理后再生成候选更可靠。`
      : canUseIcFallback
        ? `仅在孔压路径没有结果的 ${icFallbackRows} 行采用已有 Ic 分类；其他区间继续保留双路径对照。`
        : stableCandidates.length < run.candidates.length
          ? `把 ${run.candidates.length} 条原始分类变化整理为 ${stableCandidates.length} 条候选，不修改原始分类证据。`
          : '保留当前分类证据并生成可编辑候选，提交前仍可人工调整。',
  };
  guidanceCache.set(run, guidance);
  return guidance;
}

function mergeReviewIntervals(intervals: JtsGuidanceInterval[], maximumGapM = 0.5) {
  const groups: JtsGuidanceInterval[][] = [];
  intervals.forEach((interval) => {
    const group = groups.at(-1);
    if (!group || interval.depthFromM - group.at(-1)!.depthToM > maximumGapM) groups.push([interval]);
    else group.push(interval);
  });
  const rank: Record<JtsGuidanceInterval['kind'], number> = {
    'ic-fallback': 0,
    adjacent: 1,
    'pore-fallback': 2,
    conflict: 3,
    unclassifiable: 4,
  };
  return groups.map((group, index): JtsGuidanceInterval => {
    const first = group[0];
    const last = group.at(-1) as JtsGuidanceInterval;
    const worst = [...group].sort((left, right) => rank[right.kind] - rank[left.kind])[0];
    const rowCount = group.reduce((total, interval) => total + interval.rowCount, 0);
    return {
      ...worst,
      intervalId: `review-${index}-${first.intervalId}-${last.intervalId}`,
      depthFromM: first.depthFromM,
      depthToM: last.depthToM,
      rowCount,
      reason: group.length === 1 ? worst.reason : `${group.length} 个相邻提示已合并，最高关注项：${worst.reason}`,
      userMeaning: worst.kind === 'unclassifiable'
        ? '区间内存在未识别土类的测点，建议先选择处理方式。'
        : worst.kind === 'conflict'
          ? '区间内存在双路径重大差异，系统不会自动确认土类。'
          : '按一个连续区间复核即可，不需要逐行处理。',
    };
  });
}

function isGuidanceIntervalItem(
  item: { row: JtsClassificationEvidenceRowV4; kind: JtsGuidanceKind },
): item is { row: JtsClassificationEvidenceRowV4; kind: Exclude<JtsGuidanceKind, 'agreement'> } {
  return item.kind !== 'agreement';
}

export function groupJtsCandidates(
  candidates: JtsClassificationBoundaryCandidateV4[],
  groupingWindowM = JTS_GUIDED_CANDIDATE_GROUPING_M,
) {
  if (!candidates.length) return [];
  const ordered = [...candidates].sort((left, right) => left.depthM - right.depthM);
  const clusters: JtsClassificationBoundaryCandidateV4[][] = [];
  ordered.forEach((candidate) => {
    const cluster = clusters.at(-1);
    if (!cluster || candidate.depthM - cluster[0].depthM >= groupingWindowM) clusters.push([candidate]);
    else cluster.push(candidate);
  });
  const confidenceRank = { high: 0, review: 1, problem: 2 } as const;
  return clusters.map((cluster) => {
    const worstRank = Math.max(...cluster.map((candidate) => confidenceRank[candidate.confidence]));
    const worst = cluster.filter((candidate) => confidenceRank[candidate.confidence] === worstRank);
    return worst[Math.floor(worst.length / 2)];
  });
}

function guidanceKind(row: JtsClassificationEvidenceRowV4, route: JtsClassificationRunV4['route']): JtsGuidanceKind {
  if (row.icClass && row.poreClass) {
    if (row.comparison.state === 'same') return 'agreement';
    if (row.comparison.state === 'adjacent') return 'adjacent';
    return 'conflict';
  }
  if (row.icClass && !row.poreClass) return route === 'approximate_cpt' ? 'agreement' : 'ic-fallback';
  if (!row.icClass && row.poreClass) return 'pore-fallback';
  return 'unclassifiable';
}

function groupGuidanceIntervals(items: Array<{ row: JtsClassificationEvidenceRowV4; kind: Exclude<JtsGuidanceKind, 'agreement'> }>) {
  const positiveSteps = items.slice(1).map((item, index) => item.row.depthM - items[index].row.depthM).filter((step) => step > 0);
  const sortedSteps = [...positiveSteps].sort((left, right) => left - right);
  const medianStep = sortedSteps.length ? sortedSteps[Math.floor(sortedSteps.length / 2)] : 0;
  const maximumGapM = Math.max(0.1, medianStep * 5);
  const groups: typeof items[] = [];
  items.forEach((item) => {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    if (!group || !previous || previous.kind !== item.kind || item.row.depthM - previous.row.depthM > maximumGapM) groups.push([item]);
    else group.push(item);
  });
  return groups.map((group, index): JtsGuidanceInterval => {
    const first = group[0];
    const last = group.at(-1) as typeof first;
    return {
      intervalId: `${first.kind}-${index}-${first.row.sourceRowId}-${last.row.sourceRowId}`,
      kind: first.kind,
      depthFromM: first.row.depthM,
      depthToM: last.row.depthM,
      rowCount: group.length,
      ...intervalCopy(first.kind, group.map((item) => item.row)),
    };
  });
}

function intervalCopy(kind: Exclude<JtsGuidanceKind, 'agreement'>, rows: JtsClassificationEvidenceRowV4[]) {
  if (kind === 'ic-fallback') {
    const outsideChart = rows.every((row) => row.porePressureRatio !== null && row.porePressureRatio < -2 && row.qnetKpa > 680);
    return outsideChart
      ? { reason: '孔压比超出当前 JTS 孔压分类图范围', userMeaning: '孔压数据不一定错误，当前区间仍有 Ic 分类可用。' }
      : { reason: '孔压路径没有形成分类', userMeaning: '当前区间仍有 Ic 分类可用，可检查水深和压力基准。' };
  }
  if (kind === 'pore-fallback') return { reason: rows[0]?.issues[0] ?? 'Ic 路径没有形成分类', userMeaning: '孔压分类仍可查看，建议检查 qc、fs 和归一化条件。' };
  if (kind === 'adjacent') return { reason: '两条路径给出相邻土类', userMeaning: '可以生成候选，但该区间需要人工确认。' };
  if (kind === 'conflict') return { reason: '两条路径的土类差异较大', userMeaning: '系统不会自动决定土类，必须人工确认。' };
  return { reason: rows[0]?.issues[0] ?? '两条分类路径都没有结果', userMeaning: '需要检查数据或上下文后再继续。' };
}
