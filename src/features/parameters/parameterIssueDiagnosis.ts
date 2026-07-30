import type {
  JtsParameterChecklistItemV5,
  JtsParameterMethodIdV5,
  JtsParameterPackageRunV5,
} from './parameterTypes';

export type ParameterIssueOwner = 'parameter-guide' | 'parameter-local' | 'data-check' | 'advanced-parameter';

export type ParameterPointIgnoreAssessment = {
  available: boolean;
  forceAllowed: boolean;
  sourceRowIds: string[];
  reason: string;
  affectedPercent: number;
  maximumConsecutiveRows: number;
  maximumConsecutiveDepthSpanM: number;
  thresholdViolations: string[];
  blockingReason: string | null;
  detail: string;
};

export type ParameterIssueDiagnosis = {
  item: JtsParameterChecklistItemV5;
  owner: ParameterIssueOwner;
  ownerLabel: string;
  title: string;
  cause: string;
  consequence: string;
  recommendation: string;
  affectedLayerIds: string[];
  affectedRowCount: number;
  reasons: Array<{ reason: string; count: number }>;
  pointIgnore: ParameterPointIgnoreAssessment | null;
};

const PARAMETER_CONFIRMATION_PATTERN = /Nkt|kOCR|Ns|材料|排水|人工值|来源|尚未确认|需要确认|系数/;
const DATA_INPUT_PATTERN = /原始|源文件|列映射|单位|深度无效|缺少.*输入|非有限|无法解析/;

export function guidedParameterIdForMethod(methodId: JtsParameterMethodIdV5) {
  const mapping: Record<JtsParameterMethodIdV5, string> = {
    jts_gamma_sat: 'gamma-sat',
    jts_su_nkt: 'su',
    jts_phi_fine: 'phi',
    jts_phi_coarse: 'phi',
    manual_silt_phi: 'silt-strength',
    manual_silt_su: 'silt-strength',
    jts_relative_density: 'relative-density',
    jts_ocr: 'ocr',
    jts_sensitivity: 'sensitivity',
    jts_compression_modulus: 'compression-modulus',
    jts_compression_index: 'compression-index',
    jts_shear_wave_velocity: 'shear-wave',
    jts_spt_n: 'spt',
    jts_dissipation_ch_kh: 'dissipation',
  };
  return mapping[methodId];
}

export function diagnoseJtsParameterIssue(run: JtsParameterPackageRunV5, methodId: JtsParameterMethodIdV5): ParameterIssueDiagnosis | null {
  const item = run.checklist.find((candidate) => candidate.methodId === methodId);
  if (!item || !['problem', 'pending'].includes(item.status)) return null;
  const methodValues = run.values.filter((value) => value.methodId === methodId);
  const affectedValues = methodValues.filter((value) => ['problem', 'pending_confirmation', 'unavailable'].includes(value.status));
  const reasonCounts = new Map<string, number>();
  affectedValues.forEach((value) => {
    const reason = value.reason?.trim() || item.reason;
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  });
  if (!reasonCounts.size) reasonCounts.set(item.reason, Math.max(affectedValues.length, 1));
  const reasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
    .slice(0, 3);
  const combinedReason = reasons.map((entry) => entry.reason).join('；');
  const affectedLayerIds = [...new Set(affectedValues.map((value) => value.layerId).filter(Boolean))];
  const candidateSourceRowIds = methodValues
    .filter((value) => value.status === 'problem' && value.reason === (reasons[0]?.reason ?? item.reason))
    .map((value) => value.sourceRowId);
  const pointIgnore = assessJtsParameterPointIgnore(methodValues, candidateSourceRowIds);
  const owner = DATA_INPUT_PATTERN.test(combinedReason || item.reason)
    ? 'data-check'
    : pointIgnore
      ? 'parameter-local'
      : issueOwner(methodId, combinedReason || item.reason);
  const validValueCount = methodValues.filter((value) => value.status === 'value').length;
  return {
    item,
    owner,
    ownerLabel: owner === 'parameter-local' ? '当前参数试算' : owner === 'data-check' ? '数据检查' : owner === 'advanced-parameter' ? '参数高级设置' : '参数向导',
    title: pointIgnore
      ? `${item.symbol} · ${item.label}有 ${candidateSourceRowIds.length} 个点无法计算`
      : `${item.symbol} · ${item.label}为什么不能计算？`,
    cause: reasons[0]?.reason ?? item.reason,
    consequence: pointIgnore
      ? `这些局部参数值不会进入本次层代表值；其余 ${validValueCount} 个有效值仍可继续试算。`
      : affectedValues.length
      ? `当前有 ${affectedValues.length} 行、${affectedLayerIds.length || item.applicableLayerIds.length} 个土层未形成有效值；这些位置不会进入本次层代表值。`
      : `当前方法缺少运行所需的确认或输入，因此没有形成可用曲线和层代表值。`,
    recommendation: owner === 'parameter-local'
      ? pointIgnore?.available
        ? `当前有 ${pointIgnore.sourceRowIds.length} 个局部不可计算参数值，满足本次试算的局部忽略门槛。忽略后其他有效点和当前分层保持不变，曲线在这些深度保留断点。`
        : pointIgnore?.forceAllowed
          ? '当前问题未满足建议的局部忽略条件。系统不建议直接排除；如果工程师确认剩余数据仍可用于本次试算，可以查看风险后强制忽略，或返回检查。'
          : '当前问题无法安全对应到可继续计算的参数数据，不能通过强制忽略绕过。可选择本次整项不计算，或返回检查当前参数条件。'
      : owner === 'data-check'
      ? '建议返回数据检查定位原始输入。复检会使旧分类、分层和参数结果失效；完成新的最终分层后，系统再回到这一参数。'
      : owner === 'advanced-parameter'
        ? '该方法依赖独立试验或高级设置。请补充并确认对应证据后重新运行；不能用默认值代替。'
        : '建议打开参数向导，补齐工程师必须确认的固定选项，然后重新运行本次参数包。',
    affectedLayerIds: affectedLayerIds.length ? affectedLayerIds : [...item.applicableLayerIds],
    affectedRowCount: affectedValues.length,
    reasons,
    pointIgnore,
  };
}

export function assessJtsParameterPointIgnore(values: JtsParameterPackageRunV5['values'], candidateSourceRowIds: string[]): ParameterPointIgnoreAssessment | null {
  const candidateIds = new Set(candidateSourceRowIds);
  const problemValues = values.filter((value) => candidateIds.has(value.sourceRowId) && (value.status === 'problem' || value.status === 'ignored'));
  if (!problemValues.length || problemValues.length !== candidateIds.size) return null;
  const existingIgnoredIds = new Set(values.filter((value) => value.status === 'ignored').map((value) => value.sourceRowId));
  const ignoredIds = new Set([...existingIgnoredIds, ...candidateIds]);
  const applicableValues = values.filter((value) => ['value', 'problem', 'ignored'].includes(value.status));
  const validValues = values.filter((value) => value.status === 'value');
  const ignoredValues = applicableValues.filter((value) => ignoredIds.has(value.sourceRowId));
  const affectedPercent = applicableValues.length ? ignoredValues.length / applicableValues.length : 1;
  const validByLayer = new Map<string, number>();
  validValues.forEach((value) => validByLayer.set(value.layerId, (validByLayer.get(value.layerId) ?? 0) + 1));
  const totalByLayer = new Map<string, number>();
  applicableValues.forEach((value) => totalByLayer.set(value.layerId, (totalByLayer.get(value.layerId) ?? 0) + 1));
  const affectedLayerIds = [...new Set(ignoredValues.map((value) => value.layerId))];
  const layersWithoutRemainingValues = affectedLayerIds.filter((layerId) => (validByLayer.get(layerId) ?? 0) === 0);
  const everyLayerRetainsEnoughValues = affectedLayerIds.every((layerId) => (validByLayer.get(layerId) ?? 0) >= 5);
  const everyLayerStaysWithinRatio = affectedLayerIds.every((layerId) => {
    const ignored = ignoredValues.filter((value) => value.layerId === layerId).length;
    return ignored / Math.max(totalByLayer.get(layerId) ?? 0, 1) <= 0.05;
  });
  const ordered = [...applicableValues].sort((left, right) => left.depthM - right.depthM || left.sourceRowId.localeCompare(right.sourceRowId));
  let run = 0;
  let maximumConsecutiveRows = 0;
  let runStartDepthM = 0;
  let maximumConsecutiveDepthSpanM = 0;
  ordered.forEach((value) => {
    if (ignoredIds.has(value.sourceRowId)) {
      if (run === 0) runStartDepthM = value.depthM;
      run += 1;
      maximumConsecutiveDepthSpanM = Math.max(maximumConsecutiveDepthSpanM, value.depthM - runStartDepthM);
    } else run = 0;
    maximumConsecutiveRows = Math.max(maximumConsecutiveRows, run);
  });
  const available = validValues.length > 0
    && applicableValues.length >= 50
    && affectedPercent <= 0.02
    && everyLayerRetainsEnoughValues
    && everyLayerStaysWithinRatio
    && maximumConsecutiveRows <= 3
    && maximumConsecutiveDepthSpanM <= 0.1;
  const thresholdViolations = [
    ...(applicableValues.length < 50 ? [`适用值仅 ${applicableValues.length} 个，低于建议的 50 个`] : []),
    ...(affectedPercent > 0.02 ? [`累计忽略比例 ${(affectedPercent * 100).toFixed(2)}%，超过建议的 2%`] : []),
    ...(!everyLayerRetainsEnoughValues ? ['至少一个受影响土层忽略后少于 5 个有效值'] : []),
    ...(!everyLayerStaysWithinRatio ? ['至少一个受影响土层的忽略比例超过 5%'] : []),
    ...(maximumConsecutiveRows > 3 ? [`连续忽略 ${maximumConsecutiveRows} 行，超过建议的 3 行`] : []),
    ...(maximumConsecutiveDepthSpanM > 0.1 ? [`连续忽略跨度 ${maximumConsecutiveDepthSpanM.toFixed(2)} m，超过建议的 0.10 m`] : []),
  ];
  const blockingReason = layersWithoutRemainingValues.length
    ? `${layersWithoutRemainingValues.length} 个受影响土层已无剩余有效值，不能形成该层代表值。`
    : !validValues.length
      ? '该方法没有其他有效点；忽略后无法形成曲线或层代表值。'
    : null;
  const forceAllowed = blockingReason === null;
  const detail = blockingReason
    ? blockingReason
    : applicableValues.length < 50
      ? `当前方法仅有 ${applicableValues.length} 个适用值，样本量不足，不能安全局部忽略。`
      : affectedPercent > 0.02
        ? `累计局部忽略 ${ignoredValues.length} 个，占 ${applicableValues.length} 个适用值的 ${(affectedPercent * 100).toFixed(2)}%，超过 2% 门槛。`
        : !everyLayerRetainsEnoughValues
          ? '至少一个受影响土层在忽略后少于 5 个有效值，不能生成可靠层代表值。'
          : !everyLayerStaysWithinRatio
            ? '至少一个受影响土层的局部忽略比例超过 5%，不能安全继续。'
            : maximumConsecutiveRows > 3 || maximumConsecutiveDepthSpanM > 0.1
              ? `问题连续 ${maximumConsecutiveRows} 行、跨度 ${maximumConsecutiveDepthSpanM.toFixed(2)} m，已不是孤立点。`
              : `本次新增 ${problemValues.length} 个，累计忽略 ${ignoredValues.length} 个，占 ${applicableValues.length} 个适用值的 ${(affectedPercent * 100).toFixed(2)}%；每个受影响土层仍保留至少 5 个有效值。`;
  return {
    available,
    forceAllowed,
    sourceRowIds: problemValues.map((value) => value.sourceRowId),
    reason: problemValues[0]?.reason ?? '',
    affectedPercent,
    maximumConsecutiveRows,
    maximumConsecutiveDepthSpanM,
    thresholdViolations,
    blockingReason,
    detail,
  };
}

function issueOwner(methodId: JtsParameterMethodIdV5, reason: string): ParameterIssueOwner {
  if (methodId === 'jts_dissipation_ch_kh') return 'advanced-parameter';
  if (PARAMETER_CONFIRMATION_PATTERN.test(reason)) return 'parameter-guide';
  if (DATA_INPUT_PATTERN.test(reason)) return 'data-check';
  return 'parameter-guide';
}
