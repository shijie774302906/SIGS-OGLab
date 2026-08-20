import { expect, test } from '@playwright/test';
import golden from '../../sample_data/jts/jts-t242-2020-golden-v1.json' with { type: 'json' };
import {
  JTS_NKT_OPTIONS,
  JTS_STANDARD_PROBE,
  JTS_SBT_IC_BOUNDARIES,
  JTS_SBT_DISPLAY_DOMAIN,
  JTS_T242_PACKAGE,
  calculateJtsIc,
  calculateJtsSbtBoundaryQtn,
  calculateJtsSbtRegionLabelPosition,
  calculateJtsCorrectedQtKpa,
  classifyJtsByIc,
  classifyJtsByPorePressure,
  compareJtsClassifications,
  deriveJtsSeries,
  evaluateCompressionIndex,
  evaluateCompressionModulus,
  evaluateDissipationParameters,
  evaluateFrictionAngleCoarse,
  evaluateFrictionAngleFine,
  evaluateGammaSat,
  evaluateNormalizedDissipation,
  evaluateOcr,
  evaluateRelativeDensity,
  evaluateSensitivity,
  evaluateShearWaveVelocity,
  evaluateSptBlowCount,
  evaluateUndrainedStrength,
  iterateJtsQtn,
  type JtsMeasuredRow,
  type JtsMethodContext,
  type JtsSeriesContext,
  type JtsValueResult,
} from '../../src/features/jts/jtsT242Domain';
import {
  JTS_SBT_ZONE_COLORS,
  isJtsSbtPointInDisplayDomain,
  isJtsSbtSampled,
  jtsSbtLayerContainsDepth,
  toJtsSbtPoint,
} from '../../src/features/stratification/JtsSbtChart';
import type { JtsClassificationEvidenceRowV4 } from '../../src/features/workspace/workspaceV2';

test('PROCESS102 SBT display boundaries round-trip through the authoritative Ic formula', () => {
  expect(JTS_SBT_IC_BOUNDARIES).toEqual([2.9, 2.6, 2.32, 1.87, 1.47]);
  expect(JTS_SBT_DISPLAY_DOMAIN).toEqual({ frMin: 0.1, frMax: 10, qtnMin: 1, qtnMax: 1000 });
  for (const ic of JTS_SBT_IC_BOUNDARIES) {
    for (const frPercent of [0.1, 0.3, 1]) {
      const qtn = calculateJtsSbtBoundaryQtn(ic, frPercent);
      if (qtn === null) continue;
      expect(calculateJtsIc(qtn, frPercent)).toBeCloseTo(ic, 10);
    }
  }
  expect(calculateJtsSbtBoundaryQtn(2.9, 0)).toBeNull();
  expect(calculateJtsSbtBoundaryQtn(Number.NaN, 1)).toBeNull();
});

test('PROCESS106 SBT labels remain inside their authoritative Ic bands and colors stay distinct', () => {
  const labeledZones = [4, 5, 6, 7, 8, 9] as const;
  for (const zone of labeledZones) {
    const label = calculateJtsSbtRegionLabelPosition(zone);
    expect(label).not.toBeNull();
    expect(label!.qtn).toBeGreaterThan(label!.lowerQtn);
    expect(label!.qtn).toBeLessThan(label!.upperQtn);
    const ic = calculateJtsIc(label!.qtn, label!.frPercent);
    expect(ic).not.toBeNull();
    if (zone === 4) expect(ic!).toBeGreaterThan(JTS_SBT_IC_BOUNDARIES[0]);
    else if (zone === 9) expect(ic!).toBeLessThan(JTS_SBT_IC_BOUNDARIES.at(-1)!);
    else {
      expect(ic!).toBeLessThan(JTS_SBT_IC_BOUNDARIES[zone - 5]);
      expect(ic!).toBeGreaterThan(JTS_SBT_IC_BOUNDARIES[zone - 4]);
    }
  }

  const colors = Array.from({ length: 9 }, (_, index) => JTS_SBT_ZONE_COLORS[index + 1]);
  expect(new Set(colors).size).toBe(9);
  const rgb = colors.map((color) => [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16)));
  const pairDistances = rgb.flatMap((left, index) => rgb.slice(index + 1).map((right) => Math.hypot(...left.map((value, channel) => value - right[channel]))));
  expect(Math.min(...pairDistances)).toBeGreaterThan(55);
});

test('PROCESS102 SBT preserves JTS authority, data exclusions, and half-open layer ownership', () => {
  const baseRow: JtsClassificationEvidenceRowV4 = {
    sourceRowId: 'row-1',
    depthM: 2,
    qtKpa: 1000,
    gammaSatKnM3: 18,
    qnetKpa: 800,
    frPercent: 1,
    qtNormalized: 10,
    qtn: 100,
    ic: 2,
    porePressureRatio: 0.2,
    icClass: { soilClassId: 'zone-6', zone: 6, label: '粉砂质土', approximate: false },
    poreClass: null,
    selectedClass: { soilClassId: 'zone-9', zone: 9, label: '砂', approximate: false },
    comparison: { state: 'unavailable', zoneDifference: null },
    confidence: 'review',
    issues: [],
  };
  expect(toJtsSbtPoint(baseRow)).toMatchObject({ zone: 9, label: '砂' });
  expect(toJtsSbtPoint({ ...baseRow, qtn: 0 })).toBeNull();
  expect(toJtsSbtPoint({ ...baseRow, frPercent: null })).toBeNull();
  expect(toJtsSbtPoint({ ...baseRow, selectedClass: null })).toBeNull();
  expect(isJtsSbtPointInDisplayDomain({ ...toJtsSbtPoint(baseRow)!, qtn: 1001 })).toBe(false);
  expect(isJtsSbtPointInDisplayDomain(toJtsSbtPoint(baseRow)!)).toBe(true);
  const layer = { depthFromM: 1, depthToM: 2 };
  expect(jtsSbtLayerContainsDepth(layer, 1, false)).toBe(true);
  expect(jtsSbtLayerContainsDepth(layer, 2, false)).toBe(false);
  expect(jtsSbtLayerContainsDepth(layer, 2, true)).toBe(true);
  expect(isJtsSbtSampled(1, 1)).toBe(false);
  expect(isJtsSbtSampled(1, 2)).toBe(true);
});

const EPSILON = 1e-10;
const fullMudContext: JtsMethodContext = { route: 'full_cptu', soilClassId: 'mud' };
const fullFineSandContext: JtsMethodContext = { route: 'full_cptu', soilClassId: 'silty_fine_sand', materialScope: 'within_source' };
const fullCoarseSandContext: JtsMethodContext = { route: 'full_cptu', soilClassId: 'medium_coarse_sand', materialScope: 'within_source' };
const jtsCuNktSource = { type: 'jts_table_mean' as const, sourceRevisionId: 'JTS-T242-table-7.2.4-rev-1', confirmedAt: '2026-07-11T00:00:00.000Z' };
const dissipationEvidence = {
  testId: 'diss-test-1',
  testRevisionId: 'diss-test-1-rev-1',
  t50ConfirmationRevisionId: 't50-confirmation-rev-1',
  t50ConfirmedAt: '2026-07-11T00:00:00.000Z',
  seriesComplete: true,
};
const fullMudDissipationContext: JtsMethodContext = { ...fullMudContext, dissipationEvidence };

function expectNumber(actual: number | null | undefined, expected: number, tolerance = EPSILON) {
  expect(actual).not.toBeNull();
  expect(actual).not.toBeUndefined();
  const scale = Math.max(1, Math.abs(expected));
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(tolerance * scale);
}

function expectValue(result: JtsValueResult, expected: number) {
  expect(result.status).toBe('value');
  expectNumber(result.value, expected);
}

test('official package identity, Appendix A probe, and Nkt table are frozen', async () => {
  expect(JTS_T242_PACKAGE).toMatchObject({
    packageId: golden.contractId,
    packageVersion: golden.contractVersion,
    referencePressureKpa: 100,
    qtnCnLimit: 1.7,
    qtnCnTolerance: 0.01,
  });
  expect(JTS_STANDARD_PROBE).toMatchObject({
    coneBaseAreaCm2: 10,
    coneAngleDeg: 60,
    nominalConeDiameterMm: 35.7,
    effectiveAreaRatio: 0.8,
    porePressurePosition: 'u2_shoulder',
    frictionSleeveAreaCm2: 150,
  });
  expect(JTS_NKT_OPTIONS.map((item) => [item.min, item.max, item.mean])).toEqual([
    [10, 25, 20],
    [12, 25, 17.9],
    [18, 35, 23.8],
    [9, 17, 13],
    [7, 14, 10],
    [22, 42, 30],
    [10, 23, 15.5],
  ]);
});

test('JTS Qtn star follows CN=1 iteration, 0.01 stopping rule, and 1.7 cap', async () => {
  for (const vector of golden.qtnCases) {
    const result = iterateJtsQtn(vector.input.qtKpa, vector.input.sigmaV0EffectiveKpa);
    expect(result, vector.id).not.toBeNull();
    expectNumber(result?.qtn, vector.expected.qtn);
    expectNumber(result?.cn, vector.expected.cn);
    expect(result?.iterations).toBe(vector.expected.iterations);
    if ('alpha' in vector.expected) expectNumber(result?.alpha, vector.expected.alpha);
  }
  expect(iterateJtsQtn(0, 10)).toBeNull();
  expect(iterateJtsQtn(1000, 0)).toBeNull();
  expect(iterateJtsQtn(1_000_000, 100)).toMatchObject({ qtn: 10_000, cn: 1, iterations: 1 });
  expect((iterateJtsQtn(1_000_000, 100)?.alpha ?? 0) < 0).toBeTruthy();
  expect(iterateJtsQtn(1260, 60)?.qtn).not.toBeCloseTo(19.333333333333332, 8);
});

test('full CPTU and no-u2 approximate routes match independent series goldens', async () => {
  for (const vector of golden.seriesCases) {
    const result = deriveJtsSeries(
      vector.rows as JtsMeasuredRow[],
      vector.context as JtsSeriesContext,
    );
    expect(result.ok, vector.id).toBeTruthy();
    const row = result.rows[0];
    const expected = vector.expectedFirstRow;
    const numericKeys = [
      'qtKpa', 'gammaSatKnM3', 'soilOverburdenKpa', 'sigmaV0Kpa', 'u0Kpa', 'sigmaV0EffectiveKpa',
      'deltaU2Kpa', 'rfPercent', 'frPercent', 'qtNormalized', 'bq', 'qnetKpa', 'qeKpa', 'qtn', 'qtnCn',
      'ic', 'porePressureRatio',
    ] as const;
    numericKeys.forEach((key) => {
      const expectedValue = expected[key as keyof typeof expected];
      if (typeof expectedValue === 'number') expectNumber(row[key], expectedValue);
      if (expectedValue === null) expect(row[key]).toBeNull();
    });
    expect(row.qtnIterations).toBe(expected.qtnIterations);
    expect(row.icClassification?.zone ?? null).toBe(expected.icZone);
    expect(row.poreClassification?.zone ?? null).toBe(expected.poreZone);
    expect(row.comparison.state).toBe(expected.comparison);
    if ('requiredNotice' in expected) expect(row.issues).toContain(expected.requiredNotice);
  }
});

test('mudline-relative u2 normalizes to the same total-pressure calculation', async () => {
  const total = deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 5, qcKpa: 1200, fsKpa: 25, u2Kpa: 300 }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 10, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline' },
  );
  const relative = deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 5, qcKpa: 1200, fsKpa: 25, u2Kpa: 200 }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 10, u2HydrostaticDatum: 'u2_mudline_relative', testZeroDatum: 'mudline' },
  );
  expect(total.ok && relative.ok).toBeTruthy();
  expect(relative.rows[0].normalizedU2Kpa).toBe(300);
  expect(relative.rows[0]).toMatchObject({
    qtKpa: total.rows[0].qtKpa,
    qnetKpa: total.rows[0].qnetKpa,
    qtn: total.rows[0].qtn,
    ic: total.rows[0].ic,
  });
});

test('corrected qt uses the shared JTS effective-area formula before and after a reviewed qc edit', async () => {
  const context: JtsSeriesContext = {
    route: 'full_cptu',
    effectiveAreaRatio: 0.8,
    waterDepthM: 0,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
  };
  expect(calculateJtsCorrectedQtKpa({ sourceRowId: 'row', depthM: 1, qcKpa: 10, fsKpa: 1, u2Kpa: -100 }, context)).toBeCloseTo(-10, 10);
  expect(calculateJtsCorrectedQtKpa({ sourceRowId: 'row', depthM: 1, qcKpa: 100, fsKpa: 1, u2Kpa: -100 }, context)).toBeCloseTo(80, 10);
});

test('structural input problems stop a current derivation while no-u2 needs no water depth', async () => {
  expect(deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 1, qcKpa: 1000, fsKpa: 10, u2Kpa: null }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 5 } as unknown as JtsSeriesContext,
  )).toMatchObject({ ok: false });
  expect(deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 1, qcKpa: 1000, fsKpa: 10, u2Kpa: 100 }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8 } as unknown as JtsSeriesContext,
  )).toMatchObject({ ok: false });
  expect(deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 1, qcKpa: 1000, fsKpa: 10 }],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
  )).toMatchObject({ ok: true });
  expect(deriveJtsSeries([
    { sourceRowId: 'a', depthM: 2, qcKpa: 1000, fsKpa: 10 },
    { sourceRowId: 'b', depthM: 1, qcKpa: 1000, fsKpa: 10 },
  ], { route: 'approximate_cpt', effectiveAreaRatio: 0.8 })).toMatchObject({ ok: false });
  expect(deriveJtsSeries(
    [{ sourceRowId: 'mudline', depthM: 0, qcKpa: 1000, fsKpa: 10 }],
    { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
  )).toMatchObject({ ok: true });
  expect(deriveJtsSeries(
    [{ sourceRowId: 'row', depthM: 1, qcKpa: 1000, fsKpa: 10, u2Kpa: 100 }],
    { route: 'full_cptu', effectiveAreaRatio: 0.8, waterDepthM: 5, u2HydrostaticDatum: 'total', testZeroDatum: 'borehole_bottom', boreholeBottomDepthM: 2 },
  )).toMatchObject({ ok: false });
});

test('all Ic and pore-pressure class boundaries preserve exact inequality ownership', async () => {
  for (const vector of golden.icClassificationCases) {
    expect(classifyJtsByIc(vector.qnetMpa, vector.ic)?.zone, vector.id).toBe(vector.zone);
  }
  for (const vector of golden.poreClassificationCases) {
    expect(classifyJtsByPorePressure(vector.qnetMpa, vector.qtn, vector.x)?.zone ?? null, vector.id).toBe(vector.zone);
  }
  expect(classifyJtsByIc(-0.01, 3)).toMatchObject({ zone: 1, notices: [expect.stringContaining('qn<0')] });
  expect(classifyJtsByPorePressure(1, 0, 0)).toBeNull();
});

test('classification comparison distinguishes same, adjacent, major conflict, and unavailable', async () => {
  const zone4 = classifyJtsByIc(1, 3);
  const zone5 = classifyJtsByIc(1, 2.7);
  const zone7 = classifyJtsByIc(1, 2);
  expect(compareJtsClassifications(zone4, zone4)).toEqual({ state: 'same', zoneDifference: 0 });
  expect(compareJtsClassifications(zone4, zone5)).toEqual({ state: 'adjacent', zoneDifference: 1 });
  expect(compareJtsClassifications(zone4, zone7)).toEqual({ state: 'unresolved', zoneDifference: 3 });
  expect(compareJtsClassifications(zone4, null)).toEqual({ state: 'unavailable', zoneDifference: null });
});

test('JTS physical parameter formulas match independent goldens and do not hide extrapolation', async () => {
  const evaluators: Record<string, (input: number[]) => JtsValueResult> = {
    gamma: ([qt]) => evaluateGammaSat({ route: 'full_cptu' }, qt),
    dr: ([qt]) => evaluateRelativeDensity(fullFineSandContext, qt),
    su: ([qnet, nkt]) => evaluateUndrainedStrength({ ...fullMudContext, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, qnet, nkt),
    phiFine: ([qnet]) => evaluateFrictionAngleFine(fullFineSandContext, qnet),
    phiCoarse: ([qnet]) => evaluateFrictionAngleCoarse(fullCoarseSandContext, qnet),
    ocr: ([qt, coefficient]) => evaluateOcr({ ...fullMudContext, coefficientConfirmed: true }, qt, coefficient),
    st: ([fr, coefficient]) => evaluateSensitivity({ ...fullMudContext, coefficientConfirmed: true }, fr, coefficient),
    es: ([qnet]) => evaluateCompressionModulus(fullMudContext, qnet),
    cc: ([qt]) => evaluateCompressionIndex(fullMudContext, qt),
    vsCohesive: ([qt]) => evaluateShearWaveVelocity(fullMudContext, qt, 'cohesive'),
    vsNoncohesive: ([qt]) => evaluateShearWaveVelocity(fullCoarseSandContext, qt, 'noncohesive'),
    sptN: ([qt, ic]) => evaluateSptBlowCount(fullFineSandContext, qt, ic),
    normalizedDissipation: ([ut, u0, ui]) => evaluateNormalizedDissipation(fullMudContext, ut, u0, ui),
  };
  for (const vector of golden.parameterCases) {
    expectValue(evaluators[vector.method](vector.input), vector.expected);
  }
  expect(evaluateGammaSat({ route: 'full_cptu' }, 30).status).toBe('value');
  expect(evaluateRelativeDensity(fullFineSandContext, 0.5).status).toBe('unavailable');
  expect(evaluateCompressionModulus(fullMudContext, 5.000001).status).toBe('unavailable');
  expect(evaluateUndrainedStrength({ ...fullMudContext, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 100, 0).status).toBe('problem');
  expect(evaluateNormalizedDissipation(fullMudContext, 100, 50, 50).status).toBe('problem');
  expectNumber(calculateJtsIc(18.93229932247961, 2.1551724137931036), 2.687315292234471);
});

test('Ch and kh retain Ir in both official formulas', async () => {
  for (const vector of golden.dissipationCases) {
    const result = evaluateDissipationParameters(fullMudDissipationContext, vector.input);
    expectNumber(result.smallStrainModulusKpa, vector.expected.smallStrainModulusKpa);
    expectNumber(result.rigidityIndex, vector.expected.rigidityIndex);
    expectValue(result.ch, vector.expected.ch);
    expectValue(result.kh, vector.expected.kh);
  }
  expect(evaluateDissipationParameters(fullMudDissipationContext, {
    t50Seconds: 0,
    naturalUnitWeightKnM3: 18,
    shearWaveVelocityMps: 200,
    undrainedStrengthKpa: 50,
  }).ch.status).toBe('problem');
});

test('method applicability is enforced for cohesive and noncohesive scopes, material scope, and no-u2 route', async () => {
  for (const soilClassId of ['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'] as const) {
    expect(evaluateCompressionIndex({ route: 'full_cptu', soilClassId }, 10).status, soilClassId).toBe('value');
    expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId }, 1, 'cohesive').status, soilClassId).toBe('value');
  }
  expect(evaluateCompressionIndex({ route: 'full_cptu', soilClassId: 'silt' }, 10).status).toBe('unavailable');
  expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId: 'silt' }, 1, 'cohesive').status).toBe('value');
  expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId: 'silt' }, 1, 'noncohesive').status).toBe('unavailable');
  expect(evaluateFrictionAngleFine({ ...fullFineSandContext, materialScope: 'calcareous_sand' }, 5).status).toBe('unavailable');
  expect(evaluateFrictionAngleFine({ ...fullFineSandContext, materialScope: 'unknown' }, 5)).toMatchObject({ status: 'pending_confirmation' });
  const approximate = evaluateCompressionIndex({ route: 'approximate_cpt', soilClassId: 'mud' }, 10);
  expect(approximate).toMatchObject({ status: 'value' });
  expect(approximate.notices).toContain('无 u2，仅按 CPT 近似路线计算。');
  expect(evaluateDissipationParameters({ route: 'approximate_cpt', soilClassId: 'mud' }, golden.dissipationCases[0].input).ch.status).toBe('unavailable');
  expect(evaluateUndrainedStrength({ route: 'full_cptu', soilClassId: 'mud' }, 100, 13).status).toBe('pending_confirmation');
  expect(evaluateOcr(fullMudContext, 10, 0.16).status).toBe('pending_confirmation');
  expect(evaluateSensitivity(fullMudContext, 1, 6.3).status).toBe('pending_confirmation');
});

test('JTS 7.2 matrix covers numeric boundaries, missing inputs, wrong classes, and no-u2 behavior', async () => {
  expect(evaluateGammaSat({ route: 'full_cptu' }, 0).status).toBe('problem');
  expect(evaluateGammaSat({ route: 'full_cptu' }, 30)).toMatchObject({ status: 'value' });
  expect(evaluateGammaSat({ route: 'full_cptu' }, 30.000001)).toMatchObject({ status: 'value', value: 22 });

  expect(evaluateRelativeDensity(fullMudContext, 10).status).toBe('unavailable');
  expect(evaluateRelativeDensity({ ...fullFineSandContext, materialScope: 'carbonaceous_sand' }, 10).status).toBe('unavailable');
  expect(evaluateRelativeDensity({ ...fullFineSandContext, materialScope: 'unknown' }, 10).status).toBe('pending_confirmation');
  expect(evaluateRelativeDensity(fullFineSandContext, 0).status).toBe('problem');

  for (const soilClassId of ['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'] as const) {
    expect(evaluateUndrainedStrength({ route: 'full_cptu', soilClassId, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 100, 13).status).toBe('value');
  }
  expect(evaluateUndrainedStrength({ route: 'full_cptu', soilClassId: 'silt', nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 100, 13).status).toBe('unavailable');
  expect(evaluateUndrainedStrength({ ...fullMudContext, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 0, 13).status).toBe('problem');
  expect(evaluateUndrainedStrength({ ...fullMudContext, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 100, 12).status).toBe('problem');

  expect(evaluateFrictionAngleFine(fullCoarseSandContext, 5).status).toBe('unavailable');
  expect(evaluateFrictionAngleCoarse(fullFineSandContext, 5).status).toBe('unavailable');
  expect(evaluateFrictionAngleFine(fullFineSandContext, 0).status).toBe('problem');

  expect(evaluateOcr({ ...fullMudContext, coefficientConfirmed: true }, 0, 0.16).status).toBe('problem');
  expect(evaluateSensitivity({ ...fullMudContext, coefficientConfirmed: true }, 0, 6.3).status).toBe('problem');
  expect(evaluateOcr({ route: 'full_cptu', soilClassId: 'silt', coefficientConfirmed: true }, 10, 0.16).status).toBe('unavailable');
  expect(evaluateSensitivity({ route: 'full_cptu', soilClassId: 'silty_fine_sand', coefficientConfirmed: true }, 1, 6.3).status).toBe('unavailable');

  expect(evaluateCompressionModulus(fullMudContext, 3.4).status).toBe('value');
  expect(evaluateCompressionModulus(fullMudContext, 3.400001).status).toBe('value');
  expect(evaluateCompressionModulus(fullMudContext, 5).status).toBe('value');
  expect(evaluateCompressionModulus(fullMudContext, 5.000001).status).toBe('unavailable');
  expect(evaluateCompressionModulus(fullFineSandContext, 2).status).toBe('unavailable');
  expect(evaluateCompressionIndex(fullMudContext, 0).status).toBe('problem');
  expect(evaluateCompressionIndex(fullFineSandContext, 10).status).toBe('unavailable');

  expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId: 'silt' }, 1, 'cohesive').status).toBe('value');
  expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId: 'silty_fine_sand' }, 1, 'cohesive').status).toBe('unavailable');
  expect(evaluateShearWaveVelocity({ route: 'full_cptu', soilClassId: 'mud' }, 1, 'noncohesive').status).toBe('unavailable');

  expect(evaluateDissipationParameters({ route: 'full_cptu', soilClassId: 'silty_fine_sand' }, golden.dissipationCases[0].input).ch.status).toBe('unavailable');
  expect(evaluateDissipationParameters(fullMudContext, golden.dissipationCases[0].input).ch.status).toBe('pending_confirmation');
  expect(evaluateDissipationParameters(fullMudDissipationContext, { ...golden.dissipationCases[0].input, t50Seconds: 0 }).kh.status).toBe('problem');

  expect(evaluateSptBlowCount({ route: 'full_cptu' }, 1000, 2).status).toBe('unavailable');
  expect(evaluateSptBlowCount(fullFineSandContext, 1000, -1).status).toBe('problem');
  const approximateN = evaluateSptBlowCount({ route: 'approximate_cpt', soilClassId: 'silty_fine_sand' }, 1000, 2);
  expect(approximateN).toMatchObject({ status: 'value' });
  expect(approximateN.notices).toContain('无 u2，仅按 CPT 近似路线计算。');
  expect(evaluateNormalizedDissipation({ route: 'approximate_cpt', soilClassId: 'mud' }, 100, 50, 200).status).toBe('unavailable');

  const approximateResults = [
    evaluateGammaSat({ route: 'approximate_cpt' }, 1.26),
    evaluateRelativeDensity({ ...fullFineSandContext, route: 'approximate_cpt' }, 10),
    evaluateUndrainedStrength({ ...fullMudContext, route: 'approximate_cpt', nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, 1160, 13),
    evaluateFrictionAngleFine({ ...fullFineSandContext, route: 'approximate_cpt' }, 5),
    evaluateFrictionAngleCoarse({ ...fullCoarseSandContext, route: 'approximate_cpt' }, 8),
    evaluateOcr({ ...fullMudContext, route: 'approximate_cpt', coefficientConfirmed: true }, 10, 0.16),
    evaluateSensitivity({ ...fullMudContext, route: 'approximate_cpt', coefficientConfirmed: true }, 2, 6.3),
    evaluateCompressionModulus({ ...fullMudContext, route: 'approximate_cpt' }, 2.5),
    evaluateCompressionIndex({ ...fullMudContext, route: 'approximate_cpt' }, 10),
    evaluateShearWaveVelocity({ ...fullMudContext, route: 'approximate_cpt' }, 1.26, 'cohesive'),
    evaluateShearWaveVelocity({ ...fullCoarseSandContext, route: 'approximate_cpt' }, 8, 'noncohesive'),
    approximateN,
  ];
  approximateResults.forEach((result) => {
    expect(result.status).toBe('value');
    expect(result.notices).toContain('无 u2，仅按 CPT 近似路线计算。');
  });

  const missingNumericResults = [
    evaluateGammaSat({ route: 'full_cptu' }, Number.NaN),
    evaluateRelativeDensity(fullFineSandContext, Number.NaN),
    evaluateUndrainedStrength({ ...fullMudContext, nktTargetTestType: 'triaxial_cu', nktSource: jtsCuNktSource }, Number.NaN, 13),
    evaluateFrictionAngleFine(fullFineSandContext, Number.NaN),
    evaluateFrictionAngleCoarse(fullCoarseSandContext, Number.NaN),
    evaluateOcr({ ...fullMudContext, coefficientConfirmed: true }, Number.NaN, 0.16),
    evaluateSensitivity({ ...fullMudContext, coefficientConfirmed: true }, Number.NaN, 6.3),
    evaluateCompressionModulus(fullMudContext, Number.NaN),
    evaluateCompressionIndex(fullMudContext, Number.NaN),
    evaluateShearWaveVelocity(fullMudContext, Number.NaN, 'cohesive'),
    evaluateSptBlowCount(fullFineSandContext, Number.NaN, 2),
  ];
  missingNumericResults.forEach((result) => expect(result.status).toBe('problem'));
});
