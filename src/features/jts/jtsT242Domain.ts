export const JTS_T242_PACKAGE = Object.freeze({
  packageId: 'JTS-T242-2020-WATER-TRANSPORT-CPTU',
  packageVersion: 1,
  standard: 'JTS/T 242-2020',
  referencePressureKpa: 100,
  qtnCnLimit: 1.7,
  qtnCnTolerance: 0.01,
  qtnMaxIterations: 100,
});

export const JTS_STANDARD_PROBE = Object.freeze({
  profileId: 'JTS-T242-2020-APPENDIX-A-STANDARD',
  version: 1,
  coneBaseAreaCm2: 10,
  coneAngleDeg: 60,
  nominalConeDiameterMm: 35.7,
  effectiveAreaRatio: 0.8,
  porePressurePosition: 'u2_shoulder' as const,
  frictionSleeveAreaCm2: 150,
});

export const JTS_SOIL_CLASSES = Object.freeze([
  { zone: 1, id: 'flow_mud', label: '流泥' },
  { zone: 2, id: 'mud', label: '淤泥' },
  { zone: 3, id: 'muddy_soil', label: '淤泥质土' },
  { zone: 4, id: 'clay', label: '黏土' },
  { zone: 5, id: 'silty_clay', label: '粉质黏土' },
  { zone: 6, id: 'silt', label: '粉土' },
  { zone: 7, id: 'silty_fine_sand', label: '粉砂～细砂' },
  { zone: 8, id: 'medium_coarse_sand', label: '中砂～粗砂' },
  { zone: 9, id: 'gravelly_sand', label: '砾砂' },
] as const);

export type JtsSoilClassId = (typeof JTS_SOIL_CLASSES)[number]['id'];
export type JtsRoute = 'full_cptu' | 'approximate_cpt';
export type JtsU2HydrostaticDatum = 'total' | 'u2_mudline_relative';
export type JtsTestZeroDatum = 'mudline' | 'borehole_bottom';
export interface JtsMethodContext {
  route: JtsRoute;
  soilClassId?: JtsSoilClassId;
  materialScope?: 'within_source' | 'unknown' | 'calcareous_sand' | 'carbonaceous_sand';
  coefficientConfirmed?: boolean;
  nktTargetTestType?: (typeof JTS_NKT_OPTIONS)[number]['testType'];
  nktSource?: {
    type: 'jts_table_mean' | 'project_experience' | 'site_calibration';
    sourceRevisionId: string;
    confirmedAt: string;
  };
  dissipationEvidence?: {
    testId: string;
    testRevisionId: string;
    t50ConfirmationRevisionId: string;
    t50ConfirmedAt: string;
    seriesComplete: boolean;
  };
}

export interface JtsMeasuredRow {
  sourceRowId: string;
  depthM: number;
  qcKpa: number;
  fsKpa: number;
  u2Kpa?: number | null;
  /** Optional already-corrected cone resistance supplied by the source. */
  qtKpa?: number | null;
}

type JtsSeriesContextBase = {
  effectiveAreaRatio: number;
  waterUnitWeightKnM3?: number;
};

export type JtsSeriesContext = JtsSeriesContextBase & ({
  route: 'full_cptu';
  waterDepthM: number;
  u2HydrostaticDatum: JtsU2HydrostaticDatum;
  testZeroDatum: JtsTestZeroDatum;
  boreholeBottomDepthM?: number | null;
} | {
  route: 'approximate_cpt';
  waterDepthM?: never;
  u2HydrostaticDatum?: never;
  testZeroDatum?: never;
  boreholeBottomDepthM?: never;
});
export type JtsPartialSeriesContext = JtsSeriesContextBase & {
  route: 'partial_cptu';
  waterDepthM: number;
  u2HydrostaticDatum: JtsU2HydrostaticDatum;
  testZeroDatum: JtsTestZeroDatum;
  boreholeBottomDepthM?: number | null;
};

/*
 * Full CPTU deliberately has no datum defaults. Both datum decisions are
 * mandatory before a current derivation can be created.
 */
export type JtsSeriesContextContract = JtsSeriesContext;

export interface JtsQtnResult {
  qtn: number;
  cn: number;
  alpha: number;
  iterations: number;
}

export interface JtsClassificationResult {
  soilClassId: JtsSoilClassId;
  zone: number;
  label: string;
  route: 'qtn_fr_ic' | 'qtn_pore_pressure';
  approximate: boolean;
  notices: string[];
}

export interface JtsClassificationComparison {
  state: 'same' | 'adjacent' | 'unresolved' | 'unavailable';
  zoneDifference: number | null;
}

export interface JtsDerivedRow extends JtsMeasuredRow {
  route: JtsRoute;
  approximate: boolean;
  normalizedU2Kpa: number | null;
  qtKpa: number;
  gammaSatKnM3: number;
  soilOverburdenKpa: number;
  sigmaV0Kpa: number;
  u0Kpa: number;
  sigmaV0EffectiveKpa: number;
  deltaU2Kpa: number | null;
  rfPercent: number | null;
  frPercent: number | null;
  qtNormalized: number | null;
  bq: number | null;
  qnetKpa: number;
  qeKpa: number | null;
  qtn: number | null;
  qtnCn: number | null;
  qtnAlpha: number | null;
  qtnIterations: number | null;
  ic: number | null;
  porePressureRatio: number | null;
  icClassification: JtsClassificationResult | null;
  poreClassification: JtsClassificationResult | null;
  comparison: JtsClassificationComparison;
  issues: string[];
}

export type JtsValueResult =
  | { status: 'value'; value: number; notices: string[] }
  | { status: 'pending_confirmation'; value: number | null; reason: string; notices: string[] }
  | { status: 'unavailable' | 'problem'; value: null; reason: string; notices: string[] };

export const JTS_NKT_OPTIONS = Object.freeze([
  { testType: 'direct_shear_quick', label: '直剪快剪', min: 10, max: 25, mean: 20 },
  { testType: 'consolidated_direct_shear_quick', label: '固结快剪', min: 12, max: 25, mean: 17.9 },
  { testType: 'triaxial_uu', label: '三轴不固结不排水剪（UU）', min: 18, max: 35, mean: 23.8 },
  { testType: 'triaxial_cu', label: '三轴固结不排水剪（CU）', min: 9, max: 17, mean: 13 },
  { testType: 'triaxial_ck0u', label: 'K0 三轴固结不排水剪（CK0U）', min: 7, max: 14, mean: 10 },
  { testType: 'unconfined_compression', label: '无侧限抗压试验', min: 22, max: 42, mean: 30 },
  { testType: 'field_vane', label: '现场十字板剪切', min: 10, max: 23, mean: 15.5 },
] as const);

export function deriveJtsSeries(rows: JtsMeasuredRow[], context: JtsSeriesContext | JtsPartialSeriesContext) {
  const setupProblems = validateSeriesSetup(rows, context);
  if (setupProblems.length) return { ok: false as const, problems: setupProblems, rows: [] as JtsDerivedRow[] };

  const gammaWater = context.waterUnitWeightKnM3 ?? 10;
  const poreRoute = context.route !== 'approximate_cpt';
  const waterDepth = poreRoute ? context.waterDepthM : 0;
  const u2HydrostaticDatum = poreRoute ? context.u2HydrostaticDatum : 'total';
  const prepared = rows.map((row) => {
    const hasRowU2 = poreRoute && Number.isFinite(row.u2Kpa);
    const normalizedU2Kpa = hasRowU2
      ? row.u2Kpa as number + (u2HydrostaticDatum === 'u2_mudline_relative' ? gammaWater * waterDepth : 0)
      : null;
    const qtKpa = calculateJtsCorrectedQtKpa(row, context);
    const gamma = evaluateGammaSat({ route: poreRoute ? 'full_cptu' : 'approximate_cpt' }, qtKpa / 1000);
    return { row, normalizedU2Kpa, qtKpa, gammaSatKnM3: gamma.status === 'value' ? gamma.value : Number.NaN };
  });
  if (prepared.some((row) => !Number.isFinite(row.qtKpa) || row.qtKpa <= 0 || !Number.isFinite(row.gammaSatKnM3))) {
    return { ok: false as const, problems: ['锥尖阻力或饱和重度进入无效数值域。'], rows: [] as JtsDerivedRow[] };
  }

  let soilOverburdenKpa = 0;
  const derivedRows: JtsDerivedRow[] = [];
  prepared.forEach((preparedRow, index) => {
    const previous = prepared[index - 1];
    const depthDelta = index === 0 ? preparedRow.row.depthM : preparedRow.row.depthM - previous.row.depthM;
    const intervalGamma = index === 0
      ? preparedRow.gammaSatKnM3
      : (previous.gammaSatKnM3 + preparedRow.gammaSatKnM3) / 2;
    soilOverburdenKpa += intervalGamma * depthDelta;
    const sigmaV0Kpa = waterDepth * gammaWater + soilOverburdenKpa;
    const u0Kpa = (waterDepth + preparedRow.row.depthM) * gammaWater;
    const rowRoute: JtsRoute = context.route === 'partial_cptu' ? (preparedRow.normalizedU2Kpa === null ? 'approximate_cpt' : 'full_cptu') : context.route;
    derivedRows.push(deriveJtsRow({
      ...preparedRow,
      route: rowRoute,
      soilOverburdenKpa,
      sigmaV0Kpa,
      u0Kpa,
    }));
  });
  return { ok: true as const, problems: [] as string[], rows: derivedRows };
}

export function calculateJtsCorrectedQtKpa(row: JtsMeasuredRow, context: JtsSeriesContext | JtsPartialSeriesContext) {
  if (Number.isFinite(row.qtKpa)) return row.qtKpa as number;
  if (context.route === 'approximate_cpt' || !Number.isFinite(row.u2Kpa)) return row.qcKpa;
  const normalizedU2Kpa = (row.u2Kpa as number)
    + (context.u2HydrostaticDatum === 'u2_mudline_relative'
      ? (context.waterUnitWeightKnM3 ?? 10) * context.waterDepthM
      : 0);
  return row.qcKpa + (1 - context.effectiveAreaRatio) * normalizedU2Kpa;
}

export function iterateJtsQtn(qtKpa: number, sigmaV0EffectiveKpa: number): JtsQtnResult | null {
  if (!isPositiveFinite(qtKpa) || !isPositiveFinite(sigmaV0EffectiveKpa)) return null;
  let cn = 1;
  for (let iteration = 1; iteration <= JTS_T242_PACKAGE.qtnMaxIterations; iteration += 1) {
    const qtn = cn * qtKpa / JTS_T242_PACKAGE.referencePressureKpa;
    if (!isPositiveFinite(qtn)) return null;
    const alpha = 1.338 - 0.249 * qtn ** 0.264;
    const nextCn = Math.min(
      JTS_T242_PACKAGE.qtnCnLimit,
      (JTS_T242_PACKAGE.referencePressureKpa / sigmaV0EffectiveKpa) ** alpha,
    );
    if (!Number.isFinite(alpha) || !isPositiveFinite(nextCn)) return null;
    if (Math.abs(nextCn - cn) < JTS_T242_PACKAGE.qtnCnTolerance) {
      const finalQtn = nextCn * qtKpa / JTS_T242_PACKAGE.referencePressureKpa;
      const finalAlpha = 1.338 - 0.249 * finalQtn ** 0.264;
      return { qtn: finalQtn, cn: nextCn, alpha: finalAlpha, iterations: iteration };
    }
    cn = nextCn;
  }
  return null;
}

export function calculateJtsIc(qtn: number, frPercent: number) {
  if (!isPositiveFinite(qtn) || !isPositiveFinite(frPercent)) return null;
  const value = Math.sqrt((3.47 - Math.log10(qtn)) ** 2 + (Math.log10(frPercent) + 1.22) ** 2);
  return Number.isFinite(value) ? value : null;
}

/** JTS/T 242-2020 Figure 7.1.2(a) Ic boundaries used by the Qtn*–Fr evidence chart. */
export const JTS_SBT_IC_BOUNDARIES = Object.freeze([2.9, 2.6, 2.32, 1.87, 1.47] as const);
export const JTS_SBT_DISPLAY_DOMAIN = Object.freeze({ frMin: 0.1, frMax: 10, qtnMin: 1, qtnMax: 1000 });
export const JTS_SBT_ZONE_COLORS: Readonly<Record<number, string>> = Object.freeze({
  1: '#6548a8',
  2: '#245fb3',
  3: '#007f91',
  4: '#087a57',
  5: '#61780f',
  6: '#9a6b00',
  7: '#c54412',
  8: '#a83770',
  9: '#674537',
});
export const JTS_SBT_REGION_LABEL_FR_PERCENT = Object.freeze({
  4: 2.1,
  5: 0.7,
  6: 0.34,
  7: 0.22,
  8: 0.18,
  9: 0.16,
} as const);

export type JtsSbtLabeledZone = keyof typeof JTS_SBT_REGION_LABEL_FR_PERCENT;

/**
 * Returns the lower Qtn* branch of one Ic isoline for chart display only.
 * Classification remains authoritative in classifyJtsByIc because Zones 1–3 also require qnet.
 */
export function calculateJtsSbtBoundaryQtn(ic: number, frPercent: number) {
  if (!isPositiveFinite(ic) || !isPositiveFinite(frPercent)) return null;
  const frictionTerm = Math.log10(frPercent) + 1.22;
  const radicand = ic ** 2 - frictionTerm ** 2;
  if (radicand < 0) return null;
  const qtn = 10 ** (3.47 - Math.sqrt(radicand));
  return isPositiveFinite(qtn) ? qtn : null;
}

/**
 * Places a Zone 4–9 label at the logarithmic midpoint of its authoritative Ic band.
 * Zones 1–3 are intentionally excluded because their final class also depends on qnet.
 */
export function calculateJtsSbtRegionLabelPosition(zone: JtsSbtLabeledZone) {
  const frPercent = JTS_SBT_REGION_LABEL_FR_PERCENT[zone];
  let lowerQtn: number | null;
  let upperQtn: number | null;
  if (zone === 4) {
    lowerQtn = JTS_SBT_DISPLAY_DOMAIN.qtnMin;
    upperQtn = calculateJtsSbtBoundaryQtn(JTS_SBT_IC_BOUNDARIES[0], frPercent);
  } else if (zone === 9) {
    lowerQtn = calculateJtsSbtBoundaryQtn(JTS_SBT_IC_BOUNDARIES.at(-1)!, frPercent);
    upperQtn = JTS_SBT_DISPLAY_DOMAIN.qtnMax;
  } else {
    lowerQtn = calculateJtsSbtBoundaryQtn(JTS_SBT_IC_BOUNDARIES[zone - 5], frPercent);
    upperQtn = calculateJtsSbtBoundaryQtn(JTS_SBT_IC_BOUNDARIES[zone - 4], frPercent);
  }
  if (lowerQtn === null || upperQtn === null) return null;
  const bandMinQtn = Math.min(lowerQtn, upperQtn);
  const bandMaxQtn = Math.max(lowerQtn, upperQtn);
  const qtn = 10 ** ((Math.log10(bandMinQtn) + Math.log10(bandMaxQtn)) / 2);
  if (!isPositiveFinite(qtn)) return null;
  return { zone, frPercent, qtn, lowerQtn: bandMinQtn, upperQtn: bandMaxQtn };
}

export function classifyJtsByIc(qnetMpa: number, ic: number, approximate = false): JtsClassificationResult | null {
  const softClass = classifySoftSoil(qnetMpa, 'qtn_fr_ic', approximate);
  if (softClass || !Number.isFinite(qnetMpa) || !Number.isFinite(ic)) return softClass;
  if (qnetMpa <= 0.68) return null;
  if (ic >= JTS_SBT_IC_BOUNDARIES[0]) return classification(4, 'qtn_fr_ic', approximate);
  if (ic >= JTS_SBT_IC_BOUNDARIES[1]) return classification(5, 'qtn_fr_ic', approximate);
  if (ic >= JTS_SBT_IC_BOUNDARIES[2]) return classification(6, 'qtn_fr_ic', approximate);
  if (ic >= JTS_SBT_IC_BOUNDARIES[3]) return classification(7, 'qtn_fr_ic', approximate);
  if (ic >= JTS_SBT_IC_BOUNDARIES[4]) return classification(8, 'qtn_fr_ic', approximate);
  return classification(9, 'qtn_fr_ic', approximate);
}

export function classifyJtsByPorePressure(qnetMpa: number, qtn: number, porePressureRatio: number): JtsClassificationResult | null {
  const softClass = classifySoftSoil(qnetMpa, 'qtn_pore_pressure', false);
  if (softClass || !Number.isFinite(qnetMpa) || !isPositiveFinite(qtn) || !Number.isFinite(porePressureRatio)) {
    return softClass;
  }
  if (qnetMpa <= 0.68) return null;
  const x = porePressureRatio;
  const clayBoundary = 20.3 - 7.6 * Math.exp(-x / 6.23);
  const siltyClayBoundary = 31 - 11.6 * Math.exp(-x / 6.23);
  if (qtn <= clayBoundary) return classification(4, 'qtn_pore_pressure', false);
  if (qtn <= siltyClayBoundary) return classification(5, 'qtn_pore_pressure', false);
  const absoluteX = Math.abs(x);
  if (x > 2 || qtn <= 30 * Math.exp(0.255 * absoluteX)) return classification(6, 'qtn_pore_pressure', false);
  if (x < -2) return null;
  if (qtn <= 70 * Math.exp(0.226 * absoluteX)) return classification(7, 'qtn_pore_pressure', false);
  if (qtn <= 140 * Math.exp(0.226 * absoluteX)) return classification(8, 'qtn_pore_pressure', false);
  return classification(9, 'qtn_pore_pressure', false);
}

export function compareJtsClassifications(
  first: JtsClassificationResult | null,
  second: JtsClassificationResult | null,
): JtsClassificationComparison {
  if (!first || !second) return { state: 'unavailable', zoneDifference: null };
  const difference = Math.abs(first.zone - second.zone);
  return {
    state: difference === 0 ? 'same' : difference === 1 ? 'adjacent' : 'unresolved',
    zoneDifference: difference,
  };
}

export function evaluateGammaSat(context: JtsMethodContext, qtMpa: number): JtsValueResult {
  if (!isPositiveFinite(qtMpa)) return problem('qt 必须是大于 0 MPa 的有限值。');
  if (qtMpa > 30) return value(22, withRouteNotice(context, ['qt>30 MPa，采用 JTS 7.2.2“可取 22 kN/m3”的产品默认选择。']));
  return finiteValue(17.71 * qtMpa ** 0.066, withRouteNotice(context));
}

export function evaluateRelativeDensity(context: JtsMethodContext, qtMpa: number): JtsValueResult {
  const applicability = requireClasses(context, ['silty_fine_sand', 'medium_coarse_sand', 'gravelly_sand']);
  if (applicability) return applicability;
  const material = requireSilicaSandScope(context);
  if (material?.status !== 'value') return material;
  if (!isPositiveFinite(qtMpa)) return problem('qt 必须是大于 0 MPa 的有限值。');
  const result = (31.78 * Math.log(qtMpa) - 13.98) / 100;
  if (!Number.isFinite(result)) return problem('Dr 进入无效数值域。');
  if (result < 0 || result > 1) return unavailable('Dr 超出 JTS 相关式可解释的 0–1 范围，不进行裁剪或外推。');
  return value(result, withRouteNotice(context, material.notices));
}

export function evaluateUndrainedStrength(context: JtsMethodContext, qnetKpa: number, nkt: number): JtsValueResult {
  const applicability = requireCohesiveBehavior(context);
  if (applicability) return applicability;
  if (
    !context.nktTargetTestType
    || !context.nktSource
    || !context.nktSource.sourceRevisionId.trim()
    || !context.nktSource.confirmedAt.trim()
  ) {
    return pendingConfirmation('必须确认目标强度试验类型和对应 Nkt 来源。');
  }
  if (!isPositiveFinite(qnetKpa)) return problem('qnet 必须是大于 0 kPa 的有限值。');
  if (!isPositiveFinite(nkt)) return problem('Nkt 必须是大于 0 的有限值并具有已确认来源。');
  if (context.nktSource.type === 'jts_table_mean') {
    const option = JTS_NKT_OPTIONS.find((candidate) => candidate.testType === context.nktTargetTestType);
    if (!option || option.mean !== nkt) return problem('Nkt 与所选 JTS 表 7.2.4 统计平均值不一致。');
  }
  return finiteValue(qnetKpa / nkt, withRouteNotice(context));
}

export function evaluateFrictionAngleFine(context: JtsMethodContext, qnetMpa: number): JtsValueResult {
  const applicability = requireClasses(context, ['silty_fine_sand']);
  if (applicability) return applicability;
  const material = requireSilicaSandScope(context);
  if (material?.status !== 'value') return material;
  if (!isPositiveFinite(qnetMpa)) return problem('qnet 必须是大于 0 MPa 的有限值。');
  return finiteValue(3.65 * Math.log(qnetMpa) + 27.1, withRouteNotice(context, material.notices));
}

export function evaluateFrictionAngleCoarse(context: JtsMethodContext, qnetMpa: number): JtsValueResult {
  const applicability = requireClasses(context, ['medium_coarse_sand', 'gravelly_sand']);
  if (applicability) return applicability;
  const material = requireSilicaSandScope(context);
  if (material?.status !== 'value') return material;
  if (!isPositiveFinite(qnetMpa)) return problem('qnet 必须是大于 0 MPa 的有限值。');
  return finiteValue(3.3 * Math.log(qnetMpa) + 29.5, withRouteNotice(context, material.notices));
}

export function evaluateOcr(context: JtsMethodContext, qtNormalized: number, coefficient: number): JtsValueResult {
  const applicability = requireCohesiveBehavior(context);
  if (applicability) return applicability;
  if (!context.coefficientConfirmed) return pendingConfirmation('必须确认项目或层级 kOCR；无地区资料时可显式选择 0.16。');
  if (!isPositiveFinite(qtNormalized)) return problem('Qt 必须是大于 0 的有限值。');
  if (!isPositiveFinite(coefficient)) return problem('kOCR 必须是大于 0 的有限值并具有已确认来源。');
  return finiteValue(coefficient * qtNormalized, withRouteNotice(context));
}

export function evaluateSensitivity(context: JtsMethodContext, frPercent: number, coefficient: number): JtsValueResult {
  const applicability = requireCohesiveBehavior(context);
  if (applicability) return applicability;
  if (!context.coefficientConfirmed) return pendingConfirmation('必须确认项目或层级 Ns；无地区资料时可显式选择 6.3。');
  if (!isPositiveFinite(frPercent)) return problem('Fr 必须是大于 0 的百分数分子。');
  if (!isPositiveFinite(coefficient)) return problem('Ns 必须是大于 0 的有限值并具有已确认来源。');
  return finiteValue(coefficient / frPercent, withRouteNotice(context));
}

export function evaluateCompressionModulus(context: JtsMethodContext, qnetMpa: number): JtsValueResult {
  const applicability = requireCohesiveBehavior(context);
  if (applicability) return applicability;
  if (!isPositiveFinite(qnetMpa)) return problem('qnet 必须是大于 0 MPa 的有限值。');
  if (qnetMpa > 5) return unavailable('JTS 7.2.8 未给出 qnet>5 MPa 的公式，不外推。');
  return finiteValue(qnetMpa <= 3.4 ? 3.61 * qnetMpa ** 0.56 : 0.47 * qnetMpa ** 2.23, withRouteNotice(context));
}

export function evaluateCompressionIndex(context: JtsMethodContext, qtNormalized: number): JtsValueResult {
  const applicability = requireCohesiveBehavior(context);
  if (applicability) return applicability;
  if (!isPositiveFinite(qtNormalized)) return problem('Qt 必须是大于 0 的有限值。');
  return finiteValue(1.05 * qtNormalized ** -0.4, withRouteNotice(context));
}

export function evaluateShearWaveVelocity(
  context: JtsMethodContext,
  qtMpa: number,
  behavior: 'cohesive' | 'noncohesive',
): JtsValueResult {
  const applicability = behavior === 'cohesive'
    ? requireVsCohesiveBehavior(context)
    : requireNoncohesiveBehavior(context);
  if (applicability) return applicability;
  if (!isPositiveFinite(qtMpa)) return problem('qt 必须是大于 0 MPa 的有限值。');
  return finiteValue(
    behavior === 'cohesive' ? 157.39 * qtMpa ** 0.39 : 208.83 * qtMpa ** 0.13,
    withRouteNotice(context),
  );
}

export function evaluateDissipationParameters(context: JtsMethodContext, input: {
  t50Seconds: number;
  naturalUnitWeightKnM3: number;
  shearWaveVelocityMps: number;
  undrainedStrengthKpa: number;
}): { ch: JtsValueResult; kh: JtsValueResult; rigidityIndex: number | null; smallStrainModulusKpa: number | null } {
  const applicability = requireCohesiveBehavior(context);
  if (applicability || context.route !== 'full_cptu') {
    const unavailableResult = applicability ?? unavailable('无 u2 的 CPT 路线不能计算 Ch 或 kh。');
    return { ch: unavailableResult, kh: unavailableResult, rigidityIndex: null, smallStrainModulusKpa: null };
  }
  const evidence = context.dissipationEvidence;
  if (
    !evidence
    || !evidence.testId.trim()
    || !evidence.testRevisionId.trim()
    || !evidence.t50ConfirmationRevisionId.trim()
    || !evidence.t50ConfirmedAt.trim()
    || !evidence.seriesComplete
  ) {
    const pending = pendingConfirmation('必须绑定完整消散试验修订，并确认当前 t50 修订。');
    return { ch: pending, kh: pending, rigidityIndex: null, smallStrainModulusKpa: null };
  }
  const values = [input.t50Seconds, input.naturalUnitWeightKnM3, input.shearWaveVelocityMps, input.undrainedStrengthKpa];
  if (values.some((item) => !isPositiveFinite(item))) {
    const invalid = problem('t50、天然重度、Vs 和 Su 必须是大于 0 的有限值。');
    return { ch: invalid, kh: invalid, rigidityIndex: null, smallStrainModulusKpa: null };
  }
  const smallStrainModulusKpa = input.naturalUnitWeightKnM3 * input.shearWaveVelocityMps ** 2 / 9.81;
  const rigidityIndex = smallStrainModulusKpa / input.undrainedStrengthKpa;
  // JTS/T 242—2020 7.2.11 and 7.2.12 return centimetre-based units
  // because the standard cone radius is 1.785 cm. Persist and display SI only.
  const chCm2PerSecond = 0.245 * 1.785 ** 2 * Math.sqrt(rigidityIndex) / input.t50Seconds;
  const khCmPerSecond = (25 * rigidityIndex * input.t50Seconds) ** -1.25;
  const chM2PerSecond = chCm2PerSecond * 1e-4;
  const khMPerSecond = khCmPerSecond * 1e-2;
  return {
    ch: finiteValue(chM2PerSecond, withRouteNotice(context)),
    kh: finiteValue(khMPerSecond, withRouteNotice(context)),
    rigidityIndex,
    smallStrainModulusKpa,
  };
}

export function evaluateSptBlowCount(context: JtsMethodContext, qtKpa: number, ic: number): JtsValueResult {
  if (!context.soilClassId) return unavailable('标准贯入击数相关式必须绑定当前 JTS 土类。');
  if (!isPositiveFinite(qtKpa)) return problem('qt 必须是大于 0 kPa 的有限值。');
  if (!Number.isFinite(ic) || ic < 0) return problem('Ic 必须是大于或等于 0 的有限值。');
  return finiteValue(0.075 * qtKpa * ic ** 2 / JTS_T242_PACKAGE.referencePressureKpa, withRouteNotice(context));
}

export function evaluateNormalizedDissipation(
  context: JtsMethodContext,
  utKpa: number,
  u0Kpa: number,
  uiKpa: number,
): JtsValueResult {
  if (context.route !== 'full_cptu') return unavailable('无 u2 的 CPT 路线不能计算归一化超孔压比。');
  if (![utKpa, u0Kpa, uiKpa].every(Number.isFinite)) return problem('消散孔压必须是有限值。');
  if (uiKpa === u0Kpa) return problem('消散起始超孔压不能为 0。');
  return finiteValue((utKpa - u0Kpa) / (uiKpa - u0Kpa));
}

function deriveJtsRow(input: {
  row: JtsMeasuredRow;
  route: JtsRoute;
  normalizedU2Kpa: number | null;
  qtKpa: number;
  gammaSatKnM3: number;
  soilOverburdenKpa: number;
  sigmaV0Kpa: number;
  u0Kpa: number;
}): JtsDerivedRow {
  const { row, route, normalizedU2Kpa, qtKpa, gammaSatKnM3, soilOverburdenKpa, sigmaV0Kpa, u0Kpa } = input;
  const approximate = route === 'approximate_cpt';
  const sigmaV0EffectiveKpa = sigmaV0Kpa - u0Kpa;
  const qnetKpa = qtKpa - sigmaV0Kpa;
  const deltaU2Kpa = normalizedU2Kpa === null ? null : normalizedU2Kpa - u0Kpa;
  const rfPercent = qtKpa > 0 ? row.fsKpa / qtKpa * 100 : null;
  const frPercent = qnetKpa > 0 ? row.fsKpa / qnetKpa * 100 : null;
  const qtNormalized = qnetKpa > 0 && sigmaV0EffectiveKpa > 0 ? qnetKpa / sigmaV0EffectiveKpa : null;
  const bq = deltaU2Kpa !== null && qnetKpa > 0 ? deltaU2Kpa / qnetKpa : null;
  const qeKpa = normalizedU2Kpa === null ? null : qtKpa - normalizedU2Kpa;
  const qtnResult = frPercent !== null && frPercent > 0
    ? iterateJtsQtn(qtKpa, sigmaV0EffectiveKpa)
    : null;
  const ic = qtnResult && frPercent !== null ? calculateJtsIc(qtnResult.qtn, frPercent) : null;
  const porePressureRatio = deltaU2Kpa !== null && sigmaV0EffectiveKpa > 0 ? deltaU2Kpa / sigmaV0EffectiveKpa : null;
  const qnetMpa = qnetKpa / 1000;
  const icClassification = ic === null ? null : classifyJtsByIc(qnetMpa, ic, approximate);
  const poreClassification = route === 'full_cptu' && qtnResult && porePressureRatio !== null
    ? classifyJtsByPorePressure(qnetMpa, qtnResult.qtn, porePressureRatio)
    : null;
  const issues: string[] = [];
  if (approximate) issues.push('未使用孔压证据');
  if (sigmaV0EffectiveKpa <= 0) issues.push('有效上覆应力必须大于 0。');
  if (qnetKpa <= 0) issues.push('净锥尖阻力必须大于 0 才能进行归一化和参数计算。');
  if (row.fsKpa <= 0) issues.push('侧壁摩阻力必须大于 0 才能计算 Ic。');
  if (!qtnResult && sigmaV0EffectiveKpa > 0 && qnetKpa > 0 && row.fsKpa > 0) issues.push('JTS Qtn* 迭代未得到有限收敛值。');
  return {
    ...row,
    route,
    approximate,
    normalizedU2Kpa,
    qtKpa,
    gammaSatKnM3,
    soilOverburdenKpa,
    sigmaV0Kpa,
    u0Kpa,
    sigmaV0EffectiveKpa,
    deltaU2Kpa,
    rfPercent,
    frPercent,
    qtNormalized,
    bq,
    qnetKpa,
    qeKpa,
    qtn: qtnResult?.qtn ?? null,
    qtnCn: qtnResult?.cn ?? null,
    qtnAlpha: qtnResult?.alpha ?? null,
    qtnIterations: qtnResult?.iterations ?? null,
    ic,
    porePressureRatio,
    icClassification,
    poreClassification,
    comparison: compareJtsClassifications(icClassification, poreClassification),
    issues,
  };
}

function validateSeriesSetup(rows: JtsMeasuredRow[], context: JtsSeriesContext | JtsPartialSeriesContext) {
  const problems: string[] = [];
  if (!rows.length) problems.push('没有可推导的数据行。');
  if (!Number.isFinite(context.effectiveAreaRatio) || context.effectiveAreaRatio <= 0 || context.effectiveAreaRatio > 1) {
    problems.push('探头有效面积比必须在 0–1 之间且大于 0。');
  }
  const gammaWater = context.waterUnitWeightKnM3 ?? 10;
  if (!isPositiveFinite(gammaWater)) problems.push('水重度必须是大于 0 的有限值。');
  if (context.route !== 'approximate_cpt' && (!Number.isFinite(context.waterDepthM) || context.waterDepthM < 0)) {
    problems.push('完整 CPTU 路线必须确认非负有限水深。');
  }
  if (context.route !== 'approximate_cpt' && !['total', 'u2_mudline_relative'].includes(context.u2HydrostaticDatum)) {
    problems.push('完整 CPTU 路线必须确认 u2 静水柱基准。');
  }
  if (context.route !== 'approximate_cpt' && !['mudline', 'borehole_bottom'].includes(context.testZeroDatum)) {
    problems.push('完整 CPTU 路线必须确认测试零点。');
  }
  if (context.route !== 'approximate_cpt' && context.testZeroDatum === 'borehole_bottom') {
    problems.push('当前版本不接收以引孔底部为测试零点的数据；请先按 JTS 6.1.5 同时修正 qc 和 u2 到泥面零点。');
  }
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    if (!row.sourceRowId.trim() || ids.has(row.sourceRowId)) problems.push(`第 ${index + 1} 行来源标识为空或重复。`);
    ids.add(row.sourceRowId);
    if (![row.depthM, row.qcKpa, row.fsKpa].every(Number.isFinite)) problems.push(`第 ${index + 1} 行必需测量值不是有限数。`);
    if (row.depthM < 0 || row.qcKpa <= 0) problems.push(`第 ${index + 1} 行深度必须大于或等于 0，qc 必须大于 0。`);
    if (index > 0 && row.depthM <= rows[index - 1].depthM) problems.push(`第 ${index + 1} 行深度未严格递增。`);
    if (context.route === 'full_cptu' && !Number.isFinite(row.u2Kpa)) problems.push(`第 ${index + 1} 行缺少完整 u2。`);
  });
  return [...new Set(problems)];
}

function classifySoftSoil(
  qnetMpa: number,
  route: JtsClassificationResult['route'],
  approximate: boolean,
) {
  if (!Number.isFinite(qnetMpa)) return null;
  if (qnetMpa <= 0.08) return classification(
    1,
    route,
    approximate,
    qnetMpa < 0 ? ['qn<0：按表 7.1.2 字面边界归入流泥，同时必须核对 qc、测试零点、压力基准和上覆应力。'] : [],
  );
  if (qnetMpa <= 0.35) return classification(2, route, approximate);
  if (qnetMpa <= 0.68) return classification(3, route, approximate);
  return null;
}

function classification(
  zone: number,
  route: JtsClassificationResult['route'],
  approximate: boolean,
  notices: string[] = [],
): JtsClassificationResult {
  const soilClass = JTS_SOIL_CLASSES.find((candidate) => candidate.zone === zone);
  if (!soilClass) throw new Error(`Unsupported JTS soil class zone ${zone}.`);
  return { soilClassId: soilClass.id, zone, label: soilClass.label, route, approximate, notices };
}

function value(result: number, notices: string[] = []): JtsValueResult {
  return { status: 'value', value: result, notices };
}

function finiteValue(result: number, notices: string[] = []): JtsValueResult {
  return Number.isFinite(result) ? value(result, notices) : problem('公式结果不是有限值。');
}

function requireClasses(context: JtsMethodContext, allowed: JtsSoilClassId[]): JtsValueResult | null {
  if (!context.soilClassId) return unavailable('方法必须绑定当前 JTS 土类。');
  return allowed.includes(context.soilClassId)
    ? null
    : unavailable(`当前 JTS 土类 ${context.soilClassId} 不适用该方法。`);
}

function requireCohesiveBehavior(context: JtsMethodContext): JtsValueResult | null {
  if (!context.soilClassId) return unavailable('黏性土方法必须绑定当前 JTS 土类。');
  if (['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'].includes(context.soilClassId)) return null;
  return unavailable(context.soilClassId === 'silt'
    ? '粉土不属于该 JTS 黏性土相关式的默认适用类别；排水解释可用于选择其他已验证方法，但不能扩展本公式。'
    : '当前 JTS 土类不属于本方法的黏性土适用范围。');
}

function requireVsCohesiveBehavior(context: JtsMethodContext): JtsValueResult | null {
  if (!context.soilClassId) return unavailable('黏性土 Vs 方法必须绑定当前 JTS 土类。');
  return ['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay', 'silt'].includes(context.soilClassId)
    ? null
    : unavailable('当前 JTS 土类不属于黏性土 Vs 相关式的适用范围。');
}

function requireNoncohesiveBehavior(context: JtsMethodContext): JtsValueResult | null {
  if (!context.soilClassId) return unavailable('无黏性土方法必须绑定当前 JTS 土类。');
  if (['silty_fine_sand', 'medium_coarse_sand', 'gravelly_sand'].includes(context.soilClassId)) return null;
  return unavailable('当前 JTS 土类不属于本方法的无黏性土适用范围。');
}

function requireSilicaSandScope(context: JtsMethodContext): JtsValueResult {
  if (context.materialScope === 'calcareous_sand' || context.materialScope === 'carbonaceous_sand') {
    return unavailable('JTS 条文说明明确排除钙质砂和碳质砂。');
  }
  if (context.materialScope === 'unknown' || !context.materialScope) {
    return pendingConfirmation('砂土矿物与胶结范围待确认；结果不能作为已确认输出。');
  }
  return value(0);
}

function withRouteNotice(context: JtsMethodContext, notices: string[] = []) {
  return context.route === 'approximate_cpt'
    ? [...notices, '无 u2，仅按 CPT 近似路线计算。']
    : [...notices];
}

function unavailable(reason: string): JtsValueResult {
  return { status: 'unavailable', value: null, reason, notices: [] };
}

function pendingConfirmation(reason: string, trialValue: number | null = null): JtsValueResult {
  return { status: 'pending_confirmation', value: trialValue, reason, notices: [] };
}

function problem(reason: string): JtsValueResult {
  return { status: 'problem', value: null, reason, notices: [] };
}

function isPositiveFinite(input: number) {
  return Number.isFinite(input) && input > 0;
}
