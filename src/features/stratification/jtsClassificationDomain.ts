import {
  JTS_T242_PACKAGE,
  deriveJtsSeries,
  type JtsClassificationResult,
  type JtsDerivedRow,
  type JtsMeasuredRow,
  type JtsSeriesContext,
} from '../jts/jtsT242Domain';
import {
  classifyRobertson2016,
  classifySchneider2008,
  deriveRobertsonQtn,
  ROBERTSON_2016_CLASSES,
  SCHNEIDER_2008_CLASSES,
  schneider2008Boundaries,
} from '../quick/quickClassificationDomain';
import { quickFuzzyMembership } from '../quick/quickPlotDomain';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import type {
  ClassificationMethodIdV1,
  JtsClassificationBoundaryCandidateV4,
  JtsClassificationEvidenceRowV4,
  JtsClassificationRunV4,
  StratificationInputDependencyV2,
  StratificationLayerV2,
  StratificationRuleCandidateV1,
  StratificationSchemeV2,
  StratificationWorkspaceV2,
} from '../workspace/workspaceV2';
import {
  applyStratificationCommand,
  createBaseStratificationScheme,
  discardStratificationEdit,
  preserveStaleStratificationEdit,
  sameStratificationInput,
} from './stratificationDomain';
import { PROTOTYPE_STRATIFICATION_EDIT_SPACING_M } from './stratificationConstants';
import { getJtsClassificationGuidance, groupJtsCandidates, JTS_GUIDED_CANDIDATE_GROUPING_M } from './jtsClassificationGuidance';

export const CLASSIFICATION_METHODS_V1 = Object.freeze({
  'jts-t242-2020': {
    label: 'JTS/T 242—2020',
    version: String(JTS_T242_PACKAGE.packageVersion),
    packageId: JTS_T242_PACKAGE.packageId,
    mappingVersion: 'engineering-group-map-v1',
    requiresFullCptu: false,
    summary: '按 JTS Ic 与孔压路径形成分类证据。',
  },
  'fuzzy-zhang-tumay-1999': {
    label: 'Zhang–Tumay Fuzzy（研究性对照）',
    version: '1999-v1',
    packageId: 'ZHANG-TUMAY-FUZZY-1999',
    mappingVersion: 'engineering-group-map-v1',
    requiresFullCptu: false,
    summary: '研究性对照：按 qc 与摩阻比形成黏性、过渡和砂性土隶属度；结果须由工程师确认。',
  },
  'modified-robertson-2016': {
    label: 'Modified Robertson 2016（研究性对照）',
    version: '2016-v1',
    packageId: 'ROBERTSON-SBT-2016',
    mappingVersion: 'engineering-group-map-v1',
    requiresFullCptu: false,
    summary: '研究性对照：按 Qtn、Fr、IB 与 CD 形成七类土体行为证据；结果须由工程师确认。',
  },
  'schneider-2008': {
    label: 'Schneider 2008（研究性对照）',
    version: '2008-v1',
    packageId: 'SCHNEIDER-CPTU-2008',
    mappingVersion: 'engineering-group-map-v1',
    requiresFullCptu: true,
    summary: '研究性对照：按归一化锥阻与超静孔压形成五类 CPTU 行为证据；结果须由工程师确认。',
  },
} satisfies Record<ClassificationMethodIdV1, {
  label: string;
  version: string;
  packageId: string;
  mappingVersion: string;
  requiresFullCptu: boolean;
  summary: string;
}>);

export function classificationMethodId(run: JtsClassificationRunV4): ClassificationMethodIdV1 {
  return run.methodId ?? 'jts-t242-2020';
}

export function classificationMethodMeta(methodId: ClassificationMethodIdV1) {
  return CLASSIFICATION_METHODS_V1[methodId];
}

export function classificationMethodAvailability(
  methodId: ClassificationMethodIdV1,
  route: JtsSeriesContext['route'],
  measuredRows: JtsMeasuredRow[],
) {
  const meta = CLASSIFICATION_METHODS_V1[methodId];
  if (!measuredRows.length) return { available: false as const, reason: '至少需要 1 行有效深度、qc 和 fs 数据。' };
  if (meta.requiresFullCptu && route !== 'full_cptu') {
    return { available: false as const, reason: '需要完整 CPTU 的 u2、水深和压力基准。如源文件包含这些信息，请回到项目/点位数据补充；否则选择其他方法。' };
  }
  const usableRows = measuredRows.filter((row) =>
    Number.isFinite(row.depthM)
    && Number.isFinite(row.qcKpa)
    && row.qcKpa > 0
    && Number.isFinite(row.fsKpa)
    && (methodId !== 'schneider-2008' || Number.isFinite(row.u2Kpa))).length;
  if (!usableRows) {
    return {
      available: false as const,
      reason: methodId === 'schneider-2008'
        ? '没有同时包含有效深度、qc、fs 和 u2 的可计算行。请先回到数据检查。'
        : '没有同时包含有效深度、正 qc 和 fs 的可计算行。请先回到数据检查。',
    };
  }
  return { available: true as const, reason: `${meta.summary} 当前可尝试 ${usableRows}/${measuredRows.length} 行。` };
}

export type JtsClassificationRunResult =
  | { ok: true; workspace: StratificationWorkspaceV2; run: JtsClassificationRunV4 }
  | { ok: false; problem: string };

export function resolveJtsClassificationRunForLayer(
  runs: JtsClassificationRunV4[],
  scheme: StratificationSchemeV2,
  layer: StratificationLayerV2,
) {
  const sourceRunId = layer.soilDecision?.classificationRunId
    ?? (scheme.origin?.kind === 'jts-classification' ? scheme.origin.classificationRunId : null);
  if (!sourceRunId) return null;
  return runs.find((run) => run.runId === sourceRunId) ?? null;
}

export function runJtsClassification(
  workspace: StratificationWorkspaceV2,
  input: StratificationInputDependencyV2,
  measuredRows: JtsMeasuredRow[],
  context: JtsSeriesContext,
  authority: { probeProfileRevisionId: string; waterContextRevisionId: string },
  now = new Date().toISOString(),
  runId = createId('jts-classification'),
  methodId: ClassificationMethodIdV1 = 'jts-t242-2020',
): JtsClassificationRunResult {
  const method = CLASSIFICATION_METHODS_V1[methodId];
  if (!authority.probeProfileRevisionId || (methodId !== 'fuzzy-zhang-tumay-1999' && !authority.waterContextRevisionId)) {
    return { ok: false, problem: methodId === 'fuzzy-zhang-tumay-1999'
      ? `${method.label} 必须绑定已确认的探头修订。`
      : `${method.label} 必须绑定已确认的探头和水/压力上下文修订。` };
  }
  if (!measuredRows.length || new Set(measuredRows.map((row) => row.sourceRowId)).size !== measuredRows.length) {
    return { ok: false, problem: `${method.label} 输入缺少唯一、完整的源行引用。` };
  }
  const availability = classificationMethodAvailability(methodId, context.route, measuredRows);
  if (!availability.available) return { ok: false, problem: availability.reason };
  const evaluation = evaluateClassification(measuredRows, context, methodId);
  if (!evaluation.ok) return evaluation;
  const inputHash = classificationInputHash(input, measuredRows, context, authority, methodId);
  const resultHash = classificationResultHash(evaluation.rows, evaluation.candidates, evaluation.summary);
  const run: JtsClassificationRunV4 = {
    runId,
    methodId,
    methodLabel: method.label,
    methodVersion: method.version,
    mappingVersion: method.mappingVersion,
    input: structuredClone(input),
    probeProfileRevisionId: authority.probeProfileRevisionId,
    waterContextRevisionId: authority.waterContextRevisionId,
    route: context.route,
    measuredRowsSnapshot: structuredClone(measuredRows),
    seriesContextSnapshot: structuredClone(context),
    formulaPackageId: method.packageId,
    formulaPackageVersion: methodId === 'jts-t242-2020' ? JTS_T242_PACKAGE.packageVersion : 1,
    status: 'completed',
    rows: evaluation.rows,
    candidates: evaluation.candidates,
    summary: evaluation.summary,
    inputHash,
    resultHash,
    createdAt: now,
  };
  const validation = validateJtsClassificationRun(run);
  if (!validation.ok) return { ok: false, problem: validation.problem };
  const next = ensureJtsWorkspace(workspace);
  if (next.jtsClassificationRuns!.some((candidate) => candidate.runId === runId)) {
    return { ok: false, problem: '分类运行标识已经存在。' };
  }
  next.jtsClassificationRuns!.push(run);
  next.activeJtsClassificationRunId = run.runId;
  return { ok: true, workspace: next, run: structuredClone(run) };
}

export function validateJtsClassificationRun(run: JtsClassificationRunV4) {
  const methodId = classificationMethodId(run);
  const method = CLASSIFICATION_METHODS_V1[methodId];
  if (
    !run.runId
    || !run.probeProfileRevisionId
    || !run.waterContextRevisionId
    || !['full_cptu', 'approximate_cpt'].includes(run.route)
    || !['completed', 'stale', 'failed'].includes(run.status)
    || Number.isNaN(Date.parse(run.createdAt))
    || run.formulaPackageId !== method.packageId
    || run.formulaPackageVersion !== (methodId === 'jts-t242-2020' ? JTS_T242_PACKAGE.packageVersion : 1)
    || (run.methodLabel !== undefined && run.methodLabel !== method.label)
    || (run.methodVersion !== undefined && run.methodVersion !== method.version)
    || (run.mappingVersion !== undefined && run.mappingVersion !== method.mappingVersion)
  ) return { ok: false as const, problem: '分类运行身份、上下文、模型版本或映射版本无效。' };
  const context = run.seriesContextSnapshot as JtsSeriesContext;
  if (context.route !== run.route) return { ok: false as const, problem: '分类路线与上下文快照不一致。' };
  const authority = { probeProfileRevisionId: run.probeProfileRevisionId, waterContextRevisionId: run.waterContextRevisionId };
  if (run.inputHash !== classificationInputHash(run.input, run.measuredRowsSnapshot, context, authority, methodId)) {
    return { ok: false as const, problem: '分类输入或权威上下文哈希不一致。' };
  }
  const evaluation = evaluateClassification(run.measuredRowsSnapshot, context, methodId);
  if (!evaluation.ok) return { ok: false as const, problem: evaluation.problem };
  if (
    stableStringify(evaluation.rows) !== stableStringify(run.rows)
    || stableStringify(evaluation.candidates) !== stableStringify(run.candidates)
    || stableStringify(evaluation.summary) !== stableStringify(run.summary)
    || run.resultHash !== classificationResultHash(run.rows, run.candidates, run.summary)
  ) return { ok: false as const, problem: '分类结果不能由冻结输入重建。' };
  return { ok: true as const };
}

export function createSchemeFromJtsClassification(
  workspace: StratificationWorkspaceV2,
  runId: string,
  currentInput: StratificationInputDependencyV2,
  name: string,
  now = new Date().toISOString(),
  schemeId = createId('jts-scheme'),
  options: {
    policy: 'dual-path-with-ic-fallback';
    candidateMode: 'stable' | 'all';
    groupingWindowM?: number;
    acceptedUnclassifiableRows?: number;
    pendingUnclassifiableRows?: number;
    unclassifiablePolicy?: 'none' | 'accepted-gap' | 'pending-review';
    boundarySource?: 'jts' | 'rule';
    ruleRunId?: string;
    ruleCandidates?: StratificationRuleCandidateV1[];
  } | null = null,
) {
  const run = workspace.jtsClassificationRuns?.find((candidate) => candidate.runId === runId);
  if (!run || run.status !== 'completed') return { ok: false as const, problem: '请选择当前已完成的分类运行。' };
  const method = CLASSIFICATION_METHODS_V1[classificationMethodId(run)];
  const validation = validateJtsClassificationRun(run);
  if (!validation.ok) return validation;
  if (!sameStratificationInput(run.input, currentInput)) return { ok: false as const, problem: `${method.label} 分类不再对应当前数据检查，请重新运行。` };
  const guidance = getJtsClassificationGuidance(run);
  const unclassifiablePolicy = options?.unclassifiablePolicy
    ?? ((options?.acceptedUnclassifiableRows ?? 0) > 0 ? 'accepted-gap' : 'none');
  if (unclassifiablePolicy === 'accepted-gap'
    && (options?.acceptedUnclassifiableRows ?? 0) > 0
    && (!guidance.canIgnoreIsolatedAnomalies || options?.acceptedUnclassifiableRows !== guidance.unclassifiableRows)) {
    return { ok: false as const, problem: '这些异常区间不能安全快捷忽略，请查看三曲线证据后再决定。' };
  }
  if (unclassifiablePolicy === 'pending-review'
    && (options?.pendingUnclassifiableRows ?? 0) !== guidance.unclassifiableRows) {
    return { ok: false as const, problem: '待确认区间与当前分类结果不一致，请重新打开工程判断。' };
  }
  let sourceWorkspace = workspace;
  if (workspace.editSession?.dirty) {
    const replaceMatchingRuleCandidate = options?.boundarySource === 'rule'
      && workspace.editSession.isNew
      && workspace.editSession.working.origin?.kind === 'rule-candidate'
      && workspace.editSession.working.origin.ruleRunId === options.ruleRunId;
    if (replaceMatchingRuleCandidate) {
      const discarded = discardStratificationEdit(workspace);
      if (!discarded.ok) return discarded;
      sourceWorkspace = discarded.workspace;
    } else {
      if (!workspace.editSession.staleReason) return { ok: false as const, problem: '当前分层方案有未提交修改，请先提交或放弃。' };
      const preserved = preserveStaleStratificationEdit(workspace, now);
      if (!preserved.ok) return preserved;
      sourceWorkspace = preserved.workspace;
    }
  }
  const depths = run.rows.map((row) => row.depthM);
  const selectedCandidates = options?.candidateMode === 'stable'
    ? groupJtsCandidates(run.candidates, options.groupingWindowM ?? JTS_GUIDED_CANDIDATE_GROUPING_M)
    : run.candidates;
  const selectedRuleCandidates = options?.boundarySource === 'rule' ? options.ruleCandidates ?? [] : [];
  if (options?.boundarySource === 'rule' && (!options.ruleRunId || !selectedRuleCandidates.length)) {
    return { ok: false as const, problem: '没有可用于组合候选的当前规则边界。' };
  }
  const boundaryCandidates = selectedRuleCandidates.length ? selectedRuleCandidates : selectedCandidates;
  const created = createBaseStratificationScheme(
    ensureJtsWorkspace(sourceWorkspace),
    currentInput,
    Math.min(...depths),
    Math.max(...depths),
    name.trim() || `${method.label} 候选方案`,
    now,
    schemeId,
  );
  if (!created.ok) return created;
  const candidateOrigin: NonNullable<StratificationSchemeV2['origin']> = {
    kind: 'jts-classification',
    classificationRunId: run.runId,
    ...(options ? {
      selection: {
        policy: options.policy,
        candidateMode: options.candidateMode,
        groupingWindowM: options.candidateMode === 'stable' ? options.groupingWindowM ?? JTS_GUIDED_CANDIDATE_GROUPING_M : null,
        rawCandidateCount: run.candidates.length,
        selectedCandidateCount: boundaryCandidates.length,
        acceptedUnclassifiableRows: options.acceptedUnclassifiableRows ?? 0,
        pendingUnclassifiableRows: options.pendingUnclassifiableRows ?? 0,
        unclassifiablePolicy,
        boundarySource: selectedRuleCandidates.length ? 'rule' : 'jts',
        ...(selectedRuleCandidates.length ? {
          ruleRunId: options.ruleRunId,
          ruleCandidateIds: selectedRuleCandidates.map((candidate) => candidate.candidateId),
        } : {}),
        confirmedAt: now,
      },
    } : {}),
  };
  const initialSession = created.workspace.editSession;
  if (!initialSession) return { ok: false as const, problem: '候选方案没有建立编辑会话。' };
  initialSession.working.origin = structuredClone(candidateOrigin);
  initialSession.baseline.origin = structuredClone(candidateOrigin);
  const initialStored = created.workspace.schemes.find((scheme) => scheme.schemeId === initialSession.schemeId);
  if (initialStored) initialStored.origin = structuredClone(candidateOrigin);
  let next = created.workspace;
  for (const candidate of boundaryCandidates) {
    const applied = applyStratificationCommand(next, { kind: 'add-boundary', depthM: candidate.depthM }, now);
    if (!applied.ok) return { ok: false as const, problem: applied.problem };
    next = applied.workspace;
  }
  const session = next.editSession;
  if (!session) return { ok: false as const, problem: '候选方案没有建立编辑会话。' };
  session.working.boundaries.forEach((boundary, index) => {
    const ruleCandidate = selectedRuleCandidates[index];
    const candidate = selectedCandidates[index];
    if (ruleCandidate) {
      boundary.reviewRequired = true;
      boundary.note = `规则变化强度 ${ruleCandidate.score.toFixed(3)}；边界来自规则变化点，土类建议来自 ${method.label}。`;
      boundary.ruleCandidateRef = {
        ruleRunId: options?.ruleRunId as string,
        candidateId: ruleCandidate.candidateId,
        originalDepthM: ruleCandidate.depthM,
        sourceRowIds: [...ruleCandidate.sourceRowIds],
      };
      return;
    }
    if (!candidate) return;
    const boundaryEvidence = run.rows.filter((row) => row.sourceRowId === candidate.upperSourceRowId || row.sourceRowId === candidate.lowerSourceRowId);
    const acceptedIcFallback = boundaryEvidence.length > 0
      && boundaryEvidence.every((row) => row.icClass && row.comparison.state === 'unavailable');
    boundary.reviewRequired = candidate.confidence !== 'high' && !acceptedIcFallback;
    boundary.note = options?.candidateMode === 'stable' && run.candidates.length > selectedCandidates.length
      ? `${candidate.reason} 已按原型建议的 ${(options.groupingWindowM ?? JTS_GUIDED_CANDIDATE_GROUPING_M).toFixed(2)} m 整理窗口合并邻近变化；原始候选保持不变。`
      : candidate.reason;
    boundary.jtsCandidateRef = {
      classificationRunId: run.runId,
      candidateId: candidate.candidateId,
      originalDepthM: candidate.depthM,
      sourceRowIds: [candidate.upperSourceRowId, candidate.lowerSourceRowId],
    };
  });
  session.working.layers.forEach((layer, index) => {
    const evidence = run.rows.filter((row) => row.depthM >= layer.depthFromM && row.depthM <= layer.depthToM && row.selectedClass);
    const unclassifiable = run.rows.filter((row) => row.depthM >= layer.depthFromM && row.depthM <= layer.depthToM && !row.selectedClass);
    const selected = modalClass(evidence);
    layer.name = selected ? `${selected.label} ${index + 1}` : `待复核层 ${index + 1}`;
    layer.engineeringSoilGroup = selected ? selected.engineeringGroup ?? (selected.zone <= 5 ? 'clay' : selected.zone === 6 ? 'mixed' : 'sand') : 'unclassified';
    layer.soilDecision = selected ? {
      suggestedGroup: layer.engineeringSoilGroup,
      finalGroup: layer.engineeringSoilGroup,
      suggestedDetailedType: selected.label,
      finalDetailedType: selected.label,
      reviewStatus: unclassifiablePolicy === 'pending-review' && unclassifiable.length > 0 ? 'needs-review' : 'pending',
      reviewAction: 'method-suggested',
      methodClassification: {
        methodId: method.label,
        classCode: nativeClassCode(selected),
        classLabel: selected.label,
      },
      source: 'jts-suggested',
      classificationRunId: run.runId,
      decidedAt: now,
    } : undefined;
    layer.soilConfirmationRequired = !selected || (unclassifiablePolicy === 'pending-review' && unclassifiable.length > 0);
    // Any non-high-confidence evidence must remain an explicit engineering
    // decision. In particular, fuzzy near-ties and method-boundary cases must
    // not be swept into the "accept all clear layers" action.
    layer.evidenceReviewRequired = evidence.some((row) =>
      row.confidence !== 'high'
      && !(classificationMethodId(run) === 'jts-t242-2020' && row.icClass && row.comparison.state === 'unavailable'));
    layer.reviewRequired = layer.soilConfirmationRequired || layer.evidenceReviewRequired;
  });
  const stored = next.schemes.find((scheme) => scheme.schemeId === session.schemeId);
  if (stored) stored.origin = structuredClone(session.working.origin);
  return { ok: true as const, workspace: next, scheme: structuredClone(session.working), run: structuredClone(run) };
}

export function invalidateJtsClassificationRuns(workspace: StratificationWorkspaceV2 | undefined, reason: string) {
  if (!workspace) return workspace;
  return {
    ...workspace,
    jtsClassificationRuns: (workspace.jtsClassificationRuns ?? []).map((run) => run.status === 'completed'
      ? { ...run, status: 'stale' as const, staleReason: reason }
      : run),
    activeJtsClassificationRunId: null,
  };
}

function evaluateClassification(
  measuredRows: JtsMeasuredRow[],
  context: JtsSeriesContext,
  methodId: ClassificationMethodIdV1 = 'jts-t242-2020',
) {
  const derived = deriveJtsSeries(measuredRows, context);
  if (!derived.ok) return { ok: false as const, problem: derived.problems.join(' ') };
  const rows: JtsClassificationEvidenceRowV4[] = derived.rows.map((row) => {
    if (methodId !== 'jts-t242-2020') return evaluateAlternativeClassificationRow(row, methodId, context.route);
    const selected = row.icClassification ?? row.poreClassification;
    return {
      sourceRowId: row.sourceRowId,
      depthM: row.depthM,
      qtKpa: row.qtKpa,
      gammaSatKnM3: row.gammaSatKnM3,
      qnetKpa: row.qnetKpa,
      frPercent: row.frPercent,
      qtNormalized: row.qtNormalized,
      qtn: row.qtn,
      ic: row.ic,
      porePressureRatio: row.porePressureRatio,
      icClass: classificationSnapshot(row.icClassification),
      poreClass: row.poreClassification ? { ...classificationSnapshot(row.poreClassification)!, approximate: false as const } : null,
      selectedClass: classificationSnapshot(selected),
      comparison: { ...row.comparison },
      confidence: row.comparison.state === 'same'
        ? 'high'
        : row.comparison.state === 'unresolved'
          ? 'problem'
          : 'review',
      issues: [...row.issues],
    };
  });
  const candidates = classificationCandidates(rows, methodId);
  const summary = {
    rowCount: rows.length,
    sameCount: rows.filter((row) => row.comparison.state === 'same').length,
    adjacentCount: rows.filter((row) => row.comparison.state === 'adjacent').length,
    unresolvedCount: rows.filter((row) => row.comparison.state === 'unresolved').length,
    unavailableCount: rows.filter((row) => row.comparison.state === 'unavailable').length,
    candidateCount: candidates.length,
  };
  return { ok: true as const, rows, candidates, summary };
}

function evaluateAlternativeClassificationRow(
  row: JtsDerivedRow,
  methodId: Exclude<ClassificationMethodIdV1, 'jts-t242-2020'>,
  route: JtsSeriesContext['route'],
): JtsClassificationEvidenceRowV4 {
  let selectedClass: JtsClassificationEvidenceRowV4['selectedClass'] = null;
  let confidence: JtsClassificationEvidenceRowV4['confidence'] = 'high';
  const issues: string[] = [];
  let qtn = row.qtn;
  let ic = row.ic;

  if (methodId === 'fuzzy-zhang-tumay-1999') {
    const rfPercent = row.qcKpa > 0 ? row.fsKpa / row.qcKpa * 100 : null;
    const result = quickFuzzyMembership(row.qcKpa / 1000, rfPercent);
    if (result) {
      const ordered = Object.entries(result.percent).sort((left, right) => right[1] - left[1]);
      const margin = ordered[0][1] - ordered[1][1];
      const labels = { clay: '黏性土', mixed: '粉土/过渡土', sand: '砂性土' } as const;
      const zones = { clay: 1, mixed: 2, sand: 3 } as const;
      selectedClass = {
        soilClassId: `fuzzy-${result.dominant}`,
        zone: zones[result.dominant],
        label: labels[result.dominant],
        approximate: route === 'approximate_cpt',
        engineeringGroup: result.dominant,
        confidenceScore: ordered[0][1],
        confidenceReason: `最高隶属度 ${ordered[0][1].toFixed(1)}%，与第二项相差 ${margin.toFixed(1)}%。`,
      };
      if (margin < 15) {
        confidence = 'review';
        issues.push(`前两项隶属度仅相差 ${margin.toFixed(1)}%，需要工程师确认。`);
      }
    }
  } else if (methodId === 'modified-robertson-2016') {
    const normalized = row.frPercent === null ? null : deriveRobertsonQtn(row.qnetKpa, row.sigmaV0EffectiveKpa, row.frPercent);
    const result = normalized && row.frPercent !== null ? classifyRobertson2016(normalized.qtn, row.frPercent) : null;
    qtn = normalized?.qtn ?? null;
    ic = normalized?.ic ?? null;
    if (result) {
      const group = result.family === 'sand-like' ? 'sand' : result.family === 'transitional' ? 'mixed' : 'clay';
      const labels = {
        CCS: '类黏土—收缩性—敏感',
        CC: '类黏土—收缩性',
        CD: '类黏土—剪胀性',
        TC: '过渡土—收缩性',
        TD: '过渡土—剪胀性',
        SC: '类砂土—收缩性',
        SD: '类砂土—剪胀性',
      } as const;
      selectedClass = {
        soilClassId: `robertson-2016-${result.code.toLowerCase()}`,
        zone: result.zone,
        label: labels[result.code],
        approximate: route === 'approximate_cpt',
        engineeringGroup: group,
        confidenceScore: null,
        confidenceReason: `IB=${result.ib.toFixed(2)}，CD=${result.cd.toFixed(2)}；按 ${ROBERTSON_2016_CLASSES[result.code].label} 映射。`,
      };
      const nearFamilyBoundary = Math.min(Math.abs(result.ib - 22), Math.abs(result.ib - 32)) <= 1;
      const nearResponseBoundary = Math.abs(result.cd - 70) <= 5;
      const nearSensitiveBoundary = result.family === 'clay-like' && Math.abs(row.frPercent! - 2) <= 0.2;
      if (nearFamilyBoundary || nearResponseBoundary || nearSensitiveBoundary) {
        confidence = 'review';
        issues.push('当前点接近 Modified Robertson 2016 分类边界，需要工程师确认。');
      }
    }
  } else {
    const result = row.qtNormalized !== null && row.porePressureRatio !== null
      ? classifySchneider2008(row.qtNormalized, row.porePressureRatio)
      : null;
    if (result) {
      const group = result.code === '2' ? 'sand' : result.code === '3' || result.code === '1a' ? 'mixed' : 'clay';
      const labels = {
        '1a': '粉土及低刚度指数黏土',
        '1b': '黏土',
        '1c': '敏感黏土',
        '2': '基本排水砂土',
        '3': '过渡土',
      } as const;
      selectedClass = {
        soilClassId: `schneider-2008-${result.code}`,
        zone: ['1a', '1b', '1c', '2', '3'].indexOf(result.code) + 1,
        label: labels[result.code],
        approximate: false,
        engineeringGroup: group,
        confidenceScore: null,
        confidenceReason: `${SCHNEIDER_2008_CLASSES[result.code].label}；按固定映射归入${group === 'sand' ? '砂性土' : group === 'mixed' ? '粉土/过渡土' : '黏性土'}。`,
      };
      const boundaries = schneider2008Boundaries(result.q);
      const candidateBoundaries = boundaries ? [
        boundaries.lowIr,
        boundaries.clay,
        boundaries.sensitive,
        boundaries.drainedLower,
        boundaries.drainedUpper,
      ].filter((value): value is number => value !== null) : [];
      const nearBoundary = candidateBoundaries.some((value) =>
        Math.abs(result.normalizedExcessPorePressure - value) <= Math.max(0.05, Math.abs(value) * 0.05));
      if (result.code === '1a' || nearBoundary) {
        confidence = 'review';
        issues.push(result.code === '1a'
          ? '1a 同时包含粉土与低刚度指数黏土，工程土类必须人工确认。'
          : '当前点接近 Schneider 2008 分类边界，需要工程师确认。');
      }
    }
  }

  if (!selectedClass) {
    confidence = 'problem';
    issues.push(`${CLASSIFICATION_METHODS_V1[methodId].label} 当前行缺少有效输入或超出方法数值域。`);
  }
  return {
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    qtKpa: row.qtKpa,
    gammaSatKnM3: row.gammaSatKnM3,
    qnetKpa: row.qnetKpa,
    frPercent: row.frPercent,
    qtNormalized: row.qtNormalized,
    qtn,
    ic,
    porePressureRatio: row.porePressureRatio,
    icClass: null,
    poreClass: null,
    selectedClass,
    comparison: {
      state: !selectedClass ? 'unavailable' : confidence === 'high' ? 'same' : confidence === 'review' ? 'adjacent' : 'unresolved',
      zoneDifference: null,
    },
    confidence,
    issues,
  };
}

function classificationCandidates(rows: JtsClassificationEvidenceRowV4[], methodId: ClassificationMethodIdV1 = 'jts-t242-2020') {
  const method = CLASSIFICATION_METHODS_V1[methodId];
  const editableSpacingM = PROTOTYPE_STRATIFICATION_EDIT_SPACING_M + 0.001;
  const steps = rows.slice(1).map((row, index) => row.depthM - rows[index].depthM).filter((step) => step > 0);
  const gapThreshold = Math.max(0.1, (steps.length ? median(steps) : 0) * 5);
  const rawCandidates = rows.slice(1).flatMap((row, index): JtsClassificationBoundaryCandidateV4[] => {
    const previous = rows[index];
    if (
      !previous.selectedClass
      || !row.selectedClass
      || previous.selectedClass.soilClassId === row.selectedClass.soilClassId
      || row.depthM - previous.depthM > gapThreshold
    ) return [];
    const confidence = worstConfidence(previous.confidence, row.confidence);
    return [{
      candidateId: `classification-boundary-${index + 1}-${previous.sourceRowId}-${row.sourceRowId}`,
      depthM: (previous.depthM + row.depthM) / 2,
      upperSourceRowId: previous.sourceRowId,
      lowerSourceRowId: row.sourceRowId,
      upperZone: previous.selectedClass.zone,
      lowerZone: row.selectedClass.zone,
      confidence,
      reason: `${method.label} 由 ${previous.selectedClass.label} 变化为 ${row.selectedClass.label}${confidence === 'high' ? '。' : confidence === 'problem' ? '；相邻证据存在问题，必须人工复核。' : '；分类接近判定边界，需要人工复核。'}`,
    }];
  });
  const firstDepth = rows[0]?.depthM ?? 0;
  const lastDepth = rows.at(-1)?.depthM ?? firstDepth;
  const editable = rawCandidates.filter((candidate) =>
    candidate.depthM - firstDepth >= editableSpacingM
    && lastDepth - candidate.depthM >= editableSpacingM);
  const clusters: JtsClassificationBoundaryCandidateV4[][] = [];
  editable.forEach((candidate) => {
    const cluster = clusters.at(-1);
    if (!cluster || candidate.depthM - cluster.at(-1)!.depthM >= editableSpacingM) {
      clusters.push([candidate]);
    } else {
      cluster.push(candidate);
    }
  });
  return clusters.map((cluster) => {
    const representative = cluster[Math.floor(cluster.length / 2)];
    if (cluster.length === 1) return representative;
    return {
      ...representative,
      confidence: cluster.reduce<JtsClassificationBoundaryCandidateV4['confidence']>(
        (confidence, candidate) => worstConfidence(confidence, candidate.confidence),
        'high',
      ),
      reason: `${representative.reason} 附近 ${cluster.length} 个分类变化已按 ${PROTOTYPE_STRATIFICATION_EDIT_SPACING_M.toFixed(2)} m 编辑间距合并。`,
    };
  });
}

function classificationSnapshot(classification: JtsClassificationResult | null) {
  return classification ? {
    soilClassId: classification.soilClassId,
    zone: classification.zone,
    label: classification.label,
    approximate: classification.approximate,
  } : null;
}

function modalClass(rows: JtsClassificationEvidenceRowV4[]) {
  const counts = new Map<number, { count: number; value: NonNullable<JtsClassificationEvidenceRowV4['selectedClass']> }>();
  rows.forEach((row) => {
    if (!row.selectedClass) return;
    const current = counts.get(row.selectedClass.zone);
    counts.set(row.selectedClass.zone, { count: (current?.count ?? 0) + 1, value: row.selectedClass });
  });
  return [...counts.values()].sort((left, right) => right.count - left.count || left.value.zone - right.value.zone)[0]?.value ?? null;
}

function classificationInputHash(
  input: StratificationInputDependencyV2,
  rows: JtsMeasuredRow[],
  context: JtsSeriesContext,
  authority: { probeProfileRevisionId: string; waterContextRevisionId: string },
  methodId: ClassificationMethodIdV1 = 'jts-t242-2020',
) {
  const method = CLASSIFICATION_METHODS_V1[methodId];
  return sha256HexSync(stableStringify({
    input,
    rows,
    context,
    authority,
    packageId: method.packageId,
    packageVersion: methodId === 'jts-t242-2020' ? JTS_T242_PACKAGE.packageVersion : 1,
    ...(methodId === 'jts-t242-2020' ? {} : { methodId, methodVersion: method.version, mappingVersion: method.mappingVersion }),
  }));
}

function classificationResultHash(
  rows: JtsClassificationEvidenceRowV4[],
  candidates: JtsClassificationBoundaryCandidateV4[],
  summary: JtsClassificationRunV4['summary'],
) {
  return sha256HexSync(stableStringify({ rows, candidates, summary }));
}

function ensureJtsWorkspace(workspace: StratificationWorkspaceV2): StratificationWorkspaceV2 {
  return {
    ...structuredClone(workspace),
    jtsClassificationRuns: structuredClone(workspace.jtsClassificationRuns ?? []),
    activeJtsClassificationRunId: workspace.activeJtsClassificationRunId ?? null,
  };
}

function worstConfidence(...values: JtsClassificationEvidenceRowV4['confidence'][]) {
  return values.includes('problem') ? 'problem' as const : values.includes('review') ? 'review' as const : 'high' as const;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function nativeClassCode(selected: NonNullable<JtsClassificationEvidenceRowV4['selectedClass']>) {
  if (selected.soilClassId.startsWith('fuzzy-')) return selected.soilClassId.replace('fuzzy-', '').toUpperCase();
  if (selected.soilClassId.startsWith('robertson-2016-')) return selected.soilClassId.replace('robertson-2016-', '').toUpperCase();
  if (selected.soilClassId.startsWith('schneider-2008-')) return selected.soilClassId.replace('schneider-2008-', '');
  return `Zone ${selected.zone}`;
}
