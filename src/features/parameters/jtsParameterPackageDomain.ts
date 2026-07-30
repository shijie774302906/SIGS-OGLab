import {
  JTS_NKT_OPTIONS,
  JTS_T242_PACKAGE,
  evaluateCompressionIndex,
  evaluateCompressionModulus,
  evaluateFrictionAngleCoarse,
  evaluateFrictionAngleFine,
  evaluateGammaSat,
  evaluateOcr,
  evaluateRelativeDensity,
  evaluateSensitivity,
  evaluateShearWaveVelocity,
  evaluateSptBlowCount,
  evaluateUndrainedStrength,
  type JtsMethodContext,
  type JtsValueResult,
} from '../jts/jtsT242Domain';
import type { JtsClassificationRunV4, StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import type {
  JtsParameterChecklistItemV5,
  JtsParameterMethodIdV5,
  JtsParameterPackageRunV5,
  JtsParameterPackageSettingsV5,
  JtsParameterRepresentativeValueV5,
  JtsParameterValueV5,
  ParameterWorkspaceV2,
} from './parameterTypes';
import { assessJtsParameterPointIgnore } from './parameterIssueDiagnosis';

export function finalStratificationApplicabilityClasses(revision: StratificationSchemeRevisionV2) {
  const classes = new Set<string>();
  for (const layer of revision.snapshot.layers) {
    const finalGroup = layer.soilDecision?.finalGroup ?? layer.engineeringSoilGroup;
    if (finalGroup === 'clay') classes.add('clay');
    if (finalGroup === 'mixed') classes.add('silt');
    if (finalGroup === 'sand') classes.add('silty_fine_sand');
  }
  return classes;
}

export const JTS_PARAMETER_METHOD_META: Record<JtsParameterMethodIdV5, { label: string; symbol: string; unit: string; level: 'required' | 'recommended' | 'optional' }> = {
  jts_gamma_sat: { label: '饱和重度', symbol: 'γsat', unit: 'kN/m³', level: 'required' },
  jts_su_nkt: { label: '不排水抗剪强度', symbol: 'Su', unit: 'kPa', level: 'required' },
  jts_phi_fine: { label: '粉细砂有效内摩擦角', symbol: 'φ′', unit: '°', level: 'required' },
  jts_phi_coarse: { label: '中粗砂/砾砂有效内摩擦角', symbol: 'φ′', unit: '°', level: 'required' },
  jts_relative_density: { label: '相对密实度', symbol: 'Dr', unit: '1', level: 'recommended' },
  jts_ocr: { label: '超固结比', symbol: 'OCR', unit: '1', level: 'recommended' },
  jts_sensitivity: { label: '灵敏度', symbol: 'St', unit: '1', level: 'recommended' },
  jts_compression_modulus: { label: '压缩模量', symbol: 'Es', unit: 'MPa', level: 'recommended' },
  jts_compression_index: { label: '压缩指数', symbol: 'Cc', unit: '1', level: 'recommended' },
  jts_shear_wave_velocity: { label: '剪切波速', symbol: 'Vs', unit: 'm/s', level: 'recommended' },
  jts_spt_n: { label: '标准贯入击数', symbol: 'N', unit: '击', level: 'optional' },
  jts_dissipation_ch_kh: { label: '固结/渗透参数', symbol: 'Ch/kh', unit: 'm²/s · m/s', level: 'optional' },
  manual_silt_phi: { label: '粉土人工排水参数', symbol: 'φ′', unit: '°', level: 'required' },
  manual_silt_su: { label: '粉土人工不排水参数', symbol: 'Su', unit: 'kPa', level: 'required' },
};

export const DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS: JtsParameterPackageSettingsV5 = {
  nktTargetTestType: null,
  nktValue: null,
  nktSourceType: null,
  nktSourceRevisionId: null,
  nktConfirmedAt: null,
  siltDrainageDecision: 'pending',
  siltManualValue: null,
  siltManualSource: '',
  materialScope: 'unknown',
  ocrCoefficient: 0.16,
  ocrCoefficientConfirmed: false,
  sensitivityCoefficient: 6.3,
  sensitivityCoefficientConfirmed: false,
  selectedOptionalMethodIds: [],
};

export function prepareJtsParameterOutputScopeConfirmation(
  run: JtsParameterPackageRunV5,
  decidedAt = new Date().toISOString(),
) {
  if (run.status !== 'completed') {
    return { ok: false as const, problem: '当前参数试算已经失效，请重新生成后再确认本次成果范围。' };
  }
  const applicable = run.checklist.filter((item) => item.applicableLayerIds.length > 0);
  const includedMethodIds = applicable.filter((item) => item.status === 'complete').map((item) => item.methodId);
  if (!includedMethodIds.length) {
    return { ok: false as const, problem: '当前没有已完成的参数结果，请先调整参数配置。' };
  }
  const skipped = new Set((run.settingsSnapshot.skippedMethodDecisions ?? []).map((item) => item.methodId));
  const excludedMethodIds = applicable
    .filter((item) => item.status === 'pending' || item.status === 'problem' || skipped.has(item.methodId))
    .map((item) => item.methodId);
  const sameConfirmedScope = Boolean(run.settingsSnapshot.outputScopeConfirmedAt)
    && stableStringify(run.settingsSnapshot.outputScopeIncludedMethodIds ?? []) === stableStringify(includedMethodIds)
    && stableStringify(run.settingsSnapshot.outputScopeExcludedMethodIds ?? []) === stableStringify(excludedMethodIds);
  if (sameConfirmedScope && run.summary.eligibleForOutput) {
    return { ok: true as const, includedMethodIds, excludedMethodIds, settings: structuredClone(run.settingsSnapshot), requiresRun: false as const };
  }
  const newlyExcludedMethodIds = applicable
    .filter((item) => item.status === 'pending' || item.status === 'problem')
    .map((item) => item.methodId);
  const settings: JtsParameterPackageSettingsV5 = {
    ...structuredClone(run.settingsSnapshot),
    outputScopeConfirmedAt: decidedAt,
    outputScopeIncludedMethodIds: [...includedMethodIds],
    outputScopeExcludedMethodIds: [...excludedMethodIds],
    skippedMethodDecisions: [
      ...(run.settingsSnapshot.skippedMethodDecisions ?? []).filter((item) => !new Set(newlyExcludedMethodIds).has(item.methodId)),
      ...newlyExcludedMethodIds.map((methodId) => ({ methodId, reason: 'not-needed-this-stage' as const, decidedAt })),
    ],
  };
  if (!excludedMethodIds.length && !run.summary.eligibleForOutput) {
    return { ok: false as const, problem: '当前参数范围仍不满足成果条件，请先调整参数配置。' };
  }
  return { ok: true as const, includedMethodIds, excludedMethodIds, settings, requiresRun: true as const };
}

export function jtsTableNktSetting(testType: string, now = new Date().toISOString()) {
  const option = JTS_NKT_OPTIONS.find((candidate) => candidate.testType === testType);
  return option ? {
    nktTargetTestType: option.testType,
    nktValue: option.mean,
    nktSourceType: 'jts_table_mean' as const,
    nktSourceRevisionId: `JTS-T242-table-7.2.4:${option.testType}:${now}`,
    nktConfirmedAt: now,
  } : null;
}

export function runJtsParameterPackage(
  workspace: ParameterWorkspaceV2,
  classificationRun: JtsClassificationRunV4,
  stratificationRevision: StratificationSchemeRevisionV2,
  settings: JtsParameterPackageSettingsV5,
  now = new Date().toISOString(),
  runId = createId('jts-parameter-package'),
) {
  if (classificationRun.status !== 'completed') return { ok: false as const, problem: '所选分类方法不是当前完成状态。' };
  if (
    stratificationRevision.snapshot.origin?.kind !== 'jts-classification'
    || stratificationRevision.snapshot.origin.classificationRunId !== classificationRun.runId
  ) return { ok: false as const, problem: '当前分层修订没有绑定所选分类运行。' };
  const settingsProblem = validateSettings(settings);
  if (settingsProblem) return { ok: false as const, problem: settingsProblem };
  const classificationRowsSnapshot = classificationRun.rows.map((row) => ({
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    qtKpa: row.qtKpa,
    gammaSatKnM3: row.gammaSatKnM3,
    qnetKpa: row.qnetKpa,
    frPercent: row.frPercent,
    qtNormalized: row.qtNormalized,
    qtn: row.qtn,
    ic: row.ic,
    route: classificationRun.route,
    selectedClass: row.selectedClass ? { ...row.selectedClass } : null,
  }));
  const layerSnapshot = stratificationRevision.snapshot.layers.map((layer) => ({
    layerId: layer.layerId,
    name: layer.name,
    depthFromM: layer.depthFromM,
    depthToM: layer.depthToM,
    engineeringSoilGroup: layer.engineeringSoilGroup,
    finalDetailedType: layer.soilDecision?.finalDetailedType ?? layer.soilDecision?.suggestedDetailedType ?? null,
    decisionSource: layer.soilDecision?.source ?? null,
  }));
  const source = {
    pointId: classificationRun.input.pointId,
    classificationRunId: classificationRun.runId,
    classificationResultHash: classificationRun.resultHash,
    stratificationSchemeId: stratificationRevision.schemeId,
    stratificationRevisionId: stratificationRevision.revisionId,
    stratificationVersion: stratificationRevision.version,
  };
  const sourceLineageHash = sha256HexSync(stableStringify(source));
  const canonicalSettings = structuredClone(settings);
  const evaluation = evaluatePackage(classificationRowsSnapshot, layerSnapshot, canonicalSettings);
  const ignoredByMethod = new Map<JtsParameterMethodIdV5, NonNullable<JtsParameterPackageSettingsV5['ignoredPointDecisions']>>();
  for (const decision of settings.ignoredPointDecisions ?? []) {
    const decisions = ignoredByMethod.get(decision.methodId) ?? [];
    decisions.push(decision);
    ignoredByMethod.set(decision.methodId, decisions);
  }
  for (const [methodId, decisions] of ignoredByMethod) {
    const assessment = assessJtsParameterPointIgnore(evaluation.values.filter((value) => value.methodId === methodId), decisions.map((decision) => decision.sourceRowId));
    if (!assessment) return { ok: false as const, problem: '局部忽略决定无法对应到当前参数问题值，请重新打开问题后选择。' };
    if (!assessment.available) {
      const forced = decisions.some((decision) => decision.forced);
      if (!forced) return { ok: false as const, problem: `局部忽略未满足建议条件：${assessment.detail}` };
      if (!assessment.forceAllowed) return { ok: false as const, problem: `强制忽略不可用：${assessment.blockingReason ?? assessment.detail}` };
      canonicalSettings.ignoredPointDecisions = (canonicalSettings.ignoredPointDecisions ?? []).map((decision) => decision.methodId === methodId && decision.forced ? {
        ...decision,
        thresholdViolations: [...assessment.thresholdViolations],
      } : decision);
    }
  }
  if ((settings.ignoredPointDecisions?.length ?? 0) !== evaluation.values.filter((value) => value.status === 'ignored').length) {
    return { ok: false as const, problem: '局部忽略决定与当前参数问题不一致，请重新打开问题后选择。' };
  }
  const inputHash = sha256HexSync(stableStringify({ source, settings: canonicalSettings, classificationRowsSnapshot, layerSnapshot, package: JTS_T242_PACKAGE }));
  const resultHash = sha256HexSync(stableStringify(evaluation));
  const run: JtsParameterPackageRunV5 = {
    runId,
    ...source,
    sourceLineageHash,
    formulaPackageId: JTS_T242_PACKAGE.packageId,
    formulaPackageVersion: JTS_T242_PACKAGE.packageVersion,
    settingsSnapshot: structuredClone(canonicalSettings),
    classificationRowsSnapshot,
    layerSnapshot,
    status: 'completed',
    ...evaluation,
    inputHash,
    resultHash,
    createdAt: now,
  };
  const validation = validateJtsParameterPackageRun(run);
  if (!validation.ok) return { ok: false as const, problem: validation.problem };
  const runs = workspace.jtsParameterPackageRuns ?? [];
  if (runs.some((candidate) => candidate.runId === runId)) return { ok: false as const, problem: 'JTS 参数包运行标识已经存在。' };
  return {
    ok: true as const,
    run,
    workspace: { ...workspace, jtsParameterPackageRuns: [...runs, run], activeJtsParameterPackageRunId: run.runId },
  };
}

export function validateJtsParameterPackageRun(run: JtsParameterPackageRunV5) {
  if (
    !run.runId
    || !['completed', 'stale', 'failed', 'cancelled'].includes(run.status)
    || run.formulaPackageId !== JTS_T242_PACKAGE.packageId
    || run.formulaPackageVersion !== JTS_T242_PACKAGE.packageVersion
    || Number.isNaN(Date.parse(run.createdAt))
  ) return { ok: false as const, problem: 'JTS 参数包运行身份或公式包无效。' };
  const settingsProblem = validateSettings(run.settingsSnapshot);
  if (settingsProblem) return { ok: false as const, problem: settingsProblem };
  const source = {
    pointId: run.pointId,
    classificationRunId: run.classificationRunId,
    classificationResultHash: run.classificationResultHash,
    stratificationSchemeId: run.stratificationSchemeId,
    stratificationRevisionId: run.stratificationRevisionId,
    stratificationVersion: run.stratificationVersion,
  };
  if (run.sourceLineageHash !== sha256HexSync(stableStringify(source))) return { ok: false as const, problem: 'JTS 参数包来源哈希不一致。' };
  if (run.inputHash !== sha256HexSync(stableStringify({ source, settings: run.settingsSnapshot, classificationRowsSnapshot: run.classificationRowsSnapshot, layerSnapshot: run.layerSnapshot, package: JTS_T242_PACKAGE }))) {
    return { ok: false as const, problem: 'JTS 参数包输入快照或设置哈希不一致。' };
  }
  const evaluation = evaluatePackage(run.classificationRowsSnapshot, run.layerSnapshot, run.settingsSnapshot);
  if (run.settingsSnapshot.outputScopeConfirmedAt) {
    const skippedMethodIds = new Set((run.settingsSnapshot.skippedMethodDecisions ?? []).map((item) => item.methodId));
    const expectedIncluded = evaluation.checklist
      .filter((item) => item.applicableLayerIds.length > 0 && item.status === 'complete')
      .map((item) => item.methodId);
    const expectedExcluded = evaluation.checklist
      .filter((item) => item.applicableLayerIds.length > 0 && skippedMethodIds.has(item.methodId))
      .map((item) => item.methodId);
    if (
      stableStringify(run.settingsSnapshot.outputScopeIncludedMethodIds) !== stableStringify(expectedIncluded)
      || stableStringify(run.settingsSnapshot.outputScopeExcludedMethodIds) !== stableStringify(expectedExcluded)
      || !evaluation.summary.eligibleForOutput
    ) return { ok: false as const, problem: '已确认的成果参数范围与当前运行结果不一致。' };
  }
  if (
    stableStringify(evaluation.checklist) !== stableStringify(run.checklist)
    || stableStringify(evaluation.values) !== stableStringify(run.values)
    || stableStringify(evaluation.representativeValues) !== stableStringify(run.representativeValues)
    || stableStringify(evaluation.summary) !== stableStringify(run.summary)
    || run.resultHash !== sha256HexSync(stableStringify(evaluation))
  ) return { ok: false as const, problem: 'JTS 参数包结果不能由冻结输入重建。' };
  return { ok: true as const };
}

export function invalidateJtsParameterPackages(workspace: ParameterWorkspaceV2 | undefined, reason: string) {
  if (!workspace) return workspace;
  return {
    ...workspace,
    jtsParameterPackageRuns: (workspace.jtsParameterPackageRuns ?? []).map((run) => run.status === 'completed'
      ? { ...run, status: 'stale' as const, staleReason: reason }
      : run),
    activeJtsParameterPackageRunId: null,
  };
}

function evaluatePackage(
  rows: JtsParameterPackageRunV5['classificationRowsSnapshot'],
  layers: JtsParameterPackageRunV5['layerSnapshot'],
  settings: JtsParameterPackageSettingsV5,
) {
  const values: JtsParameterValueV5[] = [];
  rows.forEach((row) => {
    const layer = layers.find((candidate, index) => row.depthM >= candidate.depthFromM && (row.depthM < candidate.depthToM || (index === layers.length - 1 && row.depthM <= candidate.depthToM)));
    if (!layer) return;
    const classId = finalLayerSoilClassId(layer, row.selectedClass?.soilClassId ?? null);
    if (!classId) {
      if (layer.engineeringSoilGroup === 'sand') {
        const reason = '当前层只确认到砂性土大类，不能默认套用粉细砂或中粗/砾砂公式。请回到地层分层选择具体砂土类别，或在本次参数范围中明确不计算。';
        (['jts_phi_fine', 'jts_phi_coarse', 'jts_relative_density'] as JtsParameterMethodIdV5[]).forEach((methodId) => {
          values.push({
            valueId: `${row.sourceRowId}:${methodId}`,
            sourceRowId: row.sourceRowId,
            depthM: row.depthM,
            layerId: layer.layerId,
            soilClassId: 'unclassified-sand',
            methodId,
            status: 'pending_confirmation',
            value: null,
            notices: [],
            reason,
          });
        });
      }
      return;
    }
    const route: JtsMethodContext['route'] = row.route;
    const classificationConflict = Boolean(row.selectedClass && soilClassGroup(row.selectedClass.soilClassId) !== soilClassGroup(classId));
    const context: JtsMethodContext = {
      route,
      soilClassId: classId as JtsMethodContext['soilClassId'],
      materialScope: settings.materialScope,
      coefficientConfirmed: settings.ocrCoefficientConfirmed,
      ...(settings.nktTargetTestType && settings.nktSourceType && settings.nktSourceRevisionId ? {
        nktTargetTestType: settings.nktTargetTestType as NonNullable<JtsMethodContext['nktTargetTestType']>,
        nktSource: { type: settings.nktSourceType, sourceRevisionId: settings.nktSourceRevisionId, confirmedAt: 'frozen-in-settings' },
      } : {}),
    };
    const cohesive = ['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'].includes(classId);
    const silt = classId === 'silt';
    const sand = ['silty_fine_sand', 'medium_coarse_sand', 'gravelly_sand'].includes(classId);
    pushValue(values, row, layer.layerId, classId, 'jts_gamma_sat', evaluateGammaSat(context, row.qtKpa / 1000));
    if (cohesive) {
      pushValue(values, row, layer.layerId, classId, 'jts_su_nkt', evaluateUndrainedStrength(context, row.qnetKpa, settings.nktValue ?? Number.NaN));
      pushValue(values, row, layer.layerId, classId, 'jts_ocr', evaluateOcr({ ...context, coefficientConfirmed: settings.ocrCoefficientConfirmed }, row.qtNormalized ?? Number.NaN, settings.ocrCoefficient));
      pushValue(values, row, layer.layerId, classId, 'jts_sensitivity', evaluateSensitivity({ ...context, coefficientConfirmed: settings.sensitivityCoefficientConfirmed }, row.frPercent ?? Number.NaN, settings.sensitivityCoefficient));
      pushValue(values, row, layer.layerId, classId, 'jts_compression_modulus', evaluateCompressionModulus(context, row.qnetKpa / 1000));
      pushValue(values, row, layer.layerId, classId, 'jts_compression_index', evaluateCompressionIndex(context, row.qtNormalized ?? Number.NaN));
    }
    if (silt) {
      const methodId: JtsParameterMethodIdV5 = settings.siltDrainageDecision === 'drained' ? 'manual_silt_phi' : 'manual_silt_su';
      const manualReady = settings.siltDrainageDecision !== 'pending'
        && Number.isFinite(settings.siltManualValue)
        && (settings.siltManualValue ?? 0) > 0
        && settings.siltManualSource.trim().length > 0;
      values.push({
        valueId: `${row.sourceRowId}:${methodId}`,
        sourceRowId: row.sourceRowId,
        depthM: row.depthM,
        layerId: layer.layerId,
        soilClassId: classId,
        methodId,
        status: manualReady ? 'value' : 'pending_confirmation',
        value: manualReady ? settings.siltManualValue : null,
        notices: manualReady ? ['人工输入值，不属于 JTS 相关式计算结果。'] : [],
        reason: settings.siltDrainageDecision === 'pending'
          ? '粉土排水判断尚未确认。'
          : manualReady
            ? `人工来源：${settings.siltManualSource.trim()}`
            : 'JTS 未将粉土纳入该相关式默认适用类别，需要录入有来源的人工值。',
      });
    }
    if (sand) {
      const phiMethod = classId === 'silty_fine_sand' ? 'jts_phi_fine' : 'jts_phi_coarse';
      pushValue(values, row, layer.layerId, classId, phiMethod, classId === 'silty_fine_sand'
        ? evaluateFrictionAngleFine(context, row.qnetKpa / 1000)
        : evaluateFrictionAngleCoarse(context, row.qnetKpa / 1000));
      pushValue(values, row, layer.layerId, classId, 'jts_relative_density', evaluateRelativeDensity(context, row.qtKpa / 1000));
    }
    pushValue(values, row, layer.layerId, classId, 'jts_shear_wave_velocity', evaluateShearWaveVelocity(context, row.qtKpa / 1000, cohesive || silt ? 'cohesive' : 'noncohesive'));
    if (settings.selectedOptionalMethodIds.includes('jts_spt_n')) {
      pushValue(values, row, layer.layerId, classId, 'jts_spt_n', evaluateSptBlowCount(context, row.qtKpa, row.ic ?? Number.NaN));
    }
    if (settings.selectedOptionalMethodIds.includes('jts_dissipation_ch_kh')) {
      values.push({ valueId: `${row.sourceRowId}:jts_dissipation_ch_kh`, sourceRowId: row.sourceRowId, depthM: row.depthM, layerId: layer.layerId, soilClassId: classId, methodId: 'jts_dissipation_ch_kh', status: 'pending_confirmation', value: null, notices: [], reason: '需要在孔压消散工作区绑定试验和确认 t50。' });
    }
    if (classificationConflict) {
      values.filter((value) => value.sourceRowId === row.sourceRowId).forEach((value) => value.notices.push(`行级分类 ${row.selectedClass?.label ?? row.selectedClass?.soilClassId} 与工程师确认土类 ${layer.finalDetailedType ?? layer.engineeringSoilGroup} 不一致；本次按工程师确认土类选择方法。`));
    }
  });

  const ignoredDecisionByValue = new Map((settings.ignoredPointDecisions ?? []).map((decision) => [`${decision.sourceRowId}:${decision.methodId}`, decision]));
  const allValues = values.map((value): JtsParameterValueV5 => {
    const decision = ignoredDecisionByValue.get(`${value.sourceRowId}:${value.methodId}`);
    if (!decision || value.status !== 'problem' || value.reason !== decision.originalReason || Math.abs(value.depthM - decision.depthM) > 0.000_001) return value;
    return {
      ...value,
      status: 'ignored',
      value: null,
      notices: [...value.notices, decision.forced
        ? `工程师已确认超过建议门槛仍在本次参数试算中强制忽略该点；原始失败原因：${value.reason}`
        : `工程师已选择仅在本次参数试算中忽略该点；原始失败原因：${value.reason}`],
    };
  });
  const defaultSelectedMethodIds = (Object.keys(JTS_PARAMETER_METHOD_META) as JtsParameterMethodIdV5[]).filter((methodId) =>
    JTS_PARAMETER_METHOD_META[methodId].level !== 'optional' || settings.selectedOptionalMethodIds.includes(methodId));
  const selectedMethodIds = new Set(settings.selectedMethodIds ?? defaultSelectedMethodIds);
  const skippedMethodIds = new Set((settings.skippedMethodDecisions ?? []).map((item) => item.methodId));
  const effectiveValues = allValues.filter((value) => selectedMethodIds.has(value.methodId) && !skippedMethodIds.has(value.methodId));
  const applicableMethods = new Set(allValues.map((value) => value.methodId));
  const checklist = (Object.keys(JTS_PARAMETER_METHOD_META) as JtsParameterMethodIdV5[]).map((methodId): JtsParameterChecklistItemV5 => {
    const meta = JTS_PARAMETER_METHOD_META[methodId];
    const methodValues = effectiveValues.filter((value) => value.methodId === methodId);
    const applicableLayerIds = [...new Set(allValues.filter((value) => value.methodId === methodId).map((value) => value.layerId))];
    const selected = selectedMethodIds.has(methodId) && !skippedMethodIds.has(methodId);
    const status = !selected
      ? 'not-selected' as const
      : !applicableMethods.has(methodId)
          ? 'unavailable' as const
          : methodValues.some((value) => value.status === 'problem')
            ? 'problem' as const
            : methodValues.some((value) => value.status === 'pending_confirmation')
              ? 'pending' as const
              : methodValues.some((value) => value.status === 'value')
                ? 'complete' as const
                : 'unavailable' as const;
    return {
      methodId,
      ...meta,
      status,
      applicableLayerIds,
      valueCount: methodValues.filter((value) => value.status === 'value').length,
      reason: checklistReason(methodId, status, settings, methodValues.filter((value) => value.status === 'ignored').length),
    };
  });
  const representativeValues = representative(effectiveValues, layers);
  const required = checklist.filter((item) => item.level === 'required' && item.applicableLayerIds.length > 0);
  const selectedRecommended = checklist.filter((item) => item.level === 'recommended' && item.applicableLayerIds.length > 0 && selectedMethodIds.has(item.methodId));
  const summary = {
    requiredComplete: required.filter((item) => item.status === 'complete').length,
    requiredPending: required.filter((item) => item.status !== 'complete' && !skippedMethodIds.has(item.methodId)).length,
    requiredSkipped: required.filter((item) => skippedMethodIds.has(item.methodId)).length,
    totalSkipped: checklist.filter((item) => item.applicableLayerIds.length > 0 && skippedMethodIds.has(item.methodId)).length,
    recommendedComplete: checklist.filter((item) => item.level === 'recommended' && item.status === 'complete').length,
    optionalComplete: checklist.filter((item) => item.level === 'optional' && item.status === 'complete').length,
    valueCount: effectiveValues.filter((value) => value.status === 'value').length,
    ignoredPointCount: effectiveValues.filter((value) => value.status === 'ignored').length,
    forcedIgnoredPointCount: effectiveValues.filter((value) => value.status === 'ignored' && ignoredDecisionByValue.get(`${value.sourceRowId}:${value.methodId}`)?.forced).length,
    classificationConflictCount: rows.filter((row) => {
      const layer = layers.find((candidate, index) => row.depthM >= candidate.depthFromM && (row.depthM < candidate.depthToM || (index === layers.length - 1 && row.depthM <= candidate.depthToM)));
      if (!layer || !row.selectedClass) return false;
      const finalClassId = finalLayerSoilClassId(layer, row.selectedClass.soilClassId);
      return Boolean(finalClassId && soilClassGroup(row.selectedClass.soilClassId) !== soilClassGroup(finalClassId));
    }).length,
    eligibleForOutput: required.length > 0
      && required.every((item) => item.status === 'complete' || skippedMethodIds.has(item.methodId))
      && selectedRecommended.every((item) => item.status === 'complete' || skippedMethodIds.has(item.methodId))
      && checklist.some((item) => item.status === 'complete'),
  };
  return { checklist, values: effectiveValues, representativeValues, summary };
}

function finalLayerSoilClassId(
  layer: JtsParameterPackageRunV5['layerSnapshot'][number],
  rowClassId: string | null,
): JtsMethodContext['soilClassId'] | null {
  const detailed = layer.finalDetailedType;
  const exact: Record<string, JtsMethodContext['soilClassId']> = {
    淤泥: 'mud',
    淤泥质土: 'muddy_soil',
    黏土: 'clay',
    粉质黏土: 'silty_clay',
    粉土: 'silt',
    砂质粉土: 'silt',
    黏质粉土: 'silt',
    粉砂: 'silty_fine_sand',
    细砂: 'silty_fine_sand',
    中砂: 'medium_coarse_sand',
    粗砂: 'medium_coarse_sand',
  };
  if (detailed && exact[detailed]) return exact[detailed];
  if (layer.engineeringSoilGroup === 'clay') return 'clay';
  if (layer.engineeringSoilGroup === 'mixed') return 'silt';
  if (layer.engineeringSoilGroup === 'sand') {
    return rowClassId && soilClassGroup(rowClassId) === 'sand'
      ? rowClassId as JtsMethodContext['soilClassId']
      : null;
  }
  return null;
}

function soilClassGroup(classId: string) {
  if (['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'].includes(classId)) return 'clay';
  if (classId === 'silt') return 'mixed';
  if (['silty_fine_sand', 'medium_coarse_sand', 'gravelly_sand'].includes(classId)) return 'sand';
  return 'unclassified';
}

function pushValue(
  values: JtsParameterValueV5[],
  row: JtsParameterPackageRunV5['classificationRowsSnapshot'][number],
  layerId: string,
  soilClassId: string,
  methodId: JtsParameterMethodIdV5,
  result: JtsValueResult,
) {
  values.push({
    valueId: `${row.sourceRowId}:${methodId}`,
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    layerId,
    soilClassId,
    methodId,
    status: result.status,
    value: result.value,
    notices: [...result.notices],
    reason: 'reason' in result ? result.reason : null,
  });
}

function representative(values: JtsParameterValueV5[], layers: JtsParameterPackageRunV5['layerSnapshot']) {
  const methods = [...new Set(values.map((value) => value.methodId))];
  return layers.flatMap((layer) => methods.map((methodId): JtsParameterRepresentativeValueV5 => {
    const numbers = values.filter((value) => value.layerId === layer.layerId && value.methodId === methodId && value.status === 'value' && value.value !== null).map((value) => value.value as number).sort((left, right) => left - right);
    return {
      layerId: layer.layerId,
      methodId,
      validValueCount: numbers.length,
      minimum: numbers[0] ?? null,
      maximum: numbers.at(-1) ?? null,
      median: numbers.length ? numericMedian(numbers) : null,
    };
  })).filter((item) => item.validValueCount > 0);
}

function validateSettings(settings: JtsParameterPackageSettingsV5) {
  if (!['drained', 'undrained', 'pending'].includes(settings.siltDrainageDecision)) return '粉土排水判断无效。';
  if (settings.siltManualValue != null && (!Number.isFinite(settings.siltManualValue) || settings.siltManualValue <= 0)) return '粉土人工参数必须为空或有限正值。';
  if (settings.siltDrainageDecision === 'drained' && settings.siltManualValue != null && settings.siltManualValue > 60) return '粉土排水参数 φ′ 必须大于 0° 且不超过 60°。';
  if (settings.siltDrainageDecision === 'undrained' && settings.siltManualValue != null && settings.siltManualValue > 500) return '粉土不排水参数 Su 必须大于 0kPa 且不超过 500kPa。';
  if (settings.siltDrainageDecision !== 'pending' && (settings.siltManualValue != null || settings.siltManualSource.trim()) && !/^(项目试验|项目经验|审查记录) · \S.+$/.test(settings.siltManualSource.trim())) return '粉土人工参数必须包含固定来源类别和具体报告、试验或审查编号。';
  if (!['within_source', 'unknown', 'calcareous_sand', 'carbonaceous_sand'].includes(settings.materialScope)) return '材料适用范围无效。';
  if (!Number.isFinite(settings.ocrCoefficient) || settings.ocrCoefficient <= 0 || !Number.isFinite(settings.sensitivityCoefficient) || settings.sensitivityCoefficient <= 0) return 'OCR 或灵敏度系数必须为有限正值。';
  if (new Set(settings.selectedOptionalMethodIds).size !== settings.selectedOptionalMethodIds.length) return '可选方法不能重复。';
  const methodIds = new Set(Object.keys(JTS_PARAMETER_METHOD_META));
  if (settings.selectedMethodIds && (new Set(settings.selectedMethodIds).size !== settings.selectedMethodIds.length || settings.selectedMethodIds.some((methodId) => !methodIds.has(methodId)))) return '参数方法选择无效或重复。';
  if (settings.skippedMethodDecisions && (new Set(settings.skippedMethodDecisions.map((item) => item.methodId)).size !== settings.skippedMethodDecisions.length || settings.skippedMethodDecisions.some((item) => !methodIds.has(item.methodId) || !['not-needed-this-stage', 'insufficient-data', 'provided-by-other-test'].includes(item.reason) || (item.decidedAt !== undefined && Number.isNaN(Date.parse(item.decidedAt)))))) return '不计算参数的原因无效或重复。';
  const scopeConfirmed = settings.outputScopeConfirmedAt != null;
  const included = settings.outputScopeIncludedMethodIds ?? [];
  const excluded = settings.outputScopeExcludedMethodIds ?? [];
  const includedSet = new Set(included);
  const excludedSet = new Set(excluded);
  const skippedSet = new Set((settings.skippedMethodDecisions ?? []).map((item) => item.methodId));
  if (scopeConfirmed && Number.isNaN(Date.parse(settings.outputScopeConfirmedAt as string))) return '成果参数范围的确认时间无效。';
  if (
    includedSet.size !== included.length
    || excludedSet.size !== excluded.length
    || included.some((methodId) => !methodIds.has(methodId))
    || excluded.some((methodId) => !methodIds.has(methodId))
    || included.some((methodId) => excludedSet.has(methodId))
  ) return '成果参数范围包含未知、重复或互相冲突的方法。';
  if (scopeConfirmed) {
    if (!included.length || settings.outputScopeIncludedMethodIds === undefined || settings.outputScopeExcludedMethodIds === undefined) return '已确认的成果参数范围必须包含明确的纳入和排除清单。';
    if (excluded.some((methodId) => !skippedSet.has(methodId)) || [...skippedSet].some((methodId) => !excludedSet.has(methodId))) return '成果参数排除清单与不计算决定不一致。';
  } else if (included.length || excluded.length) return '未确认成果参数范围时不能保留纳入或排除清单。';
  if (settings.ignoredPointDecisions) {
    const keys = settings.ignoredPointDecisions.map((item) => `${item.methodId}:${item.sourceRowId}`);
    if (new Set(keys).size !== keys.length || settings.ignoredPointDecisions.some((item) => {
      const invalidBase = !methodIds.has(item.methodId) || !item.sourceRowId || !Number.isFinite(item.depthM) || item.reason !== 'local-calculation-domain' || !item.originalReason.trim() || Number.isNaN(Date.parse(item.decidedAt));
      const invalidForced = item.forced === true && (!item.thresholdViolations?.length || item.thresholdViolations.some((reason) => !reason.trim()) || !item.forcedConfirmedAt || Number.isNaN(Date.parse(item.forcedConfirmedAt)));
      const invalidOrdinary = item.forced !== true && (item.thresholdViolations !== undefined || item.forcedConfirmedAt !== undefined);
      return invalidBase || invalidForced || invalidOrdinary;
    })) return '局部忽略点的来源、原因、强制确认或决定时间无效或重复。';
  }
  if (settings.nktSourceType === 'jts_table_mean') {
    const option = JTS_NKT_OPTIONS.find((candidate) => candidate.testType === settings.nktTargetTestType);
    if (!option || option.mean !== settings.nktValue || !settings.nktSourceRevisionId || !settings.nktConfirmedAt || Number.isNaN(Date.parse(settings.nktConfirmedAt))) return 'JTS 表 7.2.4 的 Nkt、目标试验、来源修订或确认时间不一致。';
  }
  return null;
}

function checklistReason(methodId: JtsParameterMethodIdV5, status: JtsParameterChecklistItemV5['status'], settings: JtsParameterPackageSettingsV5, ignoredPointCount = 0) {
  const skipped = settings.skippedMethodDecisions?.find((item) => item.methodId === methodId);
  if (skipped) return `工程师已选择本次不计算：${skipped.reason === 'not-needed-this-stage' ? '本阶段不需要' : skipped.reason === 'insufficient-data' ? '数据不足' : '由其他试验提供'}。`;
  if (['manual_silt_phi', 'manual_silt_su'].includes(methodId) && status === 'complete') return `人工输入，来源：${settings.siltManualSource.trim()}。`;
  if (status === 'complete') return ignoredPointCount ? `其余适用行已形成有效值；本次参数试算忽略 ${ignoredPointCount} 个局部不可计算点。` : '当前适用行已形成有效值。';
  if (status === 'not-selected') return '可选方法尚未选择。';
  if (methodId === 'jts_su_nkt' && !settings.nktSourceType) return '需要确认目标强度试验与 Nkt 来源。';
  if (methodId === 'jts_su_nkt' && settings.siltDrainageDecision === 'pending') return '粉土排水判断尚未确认。';
  if (['manual_silt_phi', 'manual_silt_su'].includes(methodId)) return settings.siltDrainageDecision === 'pending' ? '粉土排水判断尚未确认。' : '需要录入人工值并说明来源；不会套用 JTS 适用域外相关式。';
  if (['jts_phi_fine', 'jts_phi_coarse', 'jts_relative_density'].includes(methodId) && settings.materialScope !== 'within_source') return '需要确认材料处于公式来源适用范围。';
  if (methodId === 'jts_dissipation_ch_kh') return '需要孔压消散试验与 t50 确认。';
  return status === 'unavailable' ? '当前土类没有适用行或公式域不适用。' : '存在待确认或数值问题。';
}

function numericMedian(values: number[]) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}
