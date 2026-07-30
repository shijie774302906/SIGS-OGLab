export type RobertsonNormalizationV1 = {
  qtn: number;
  ic: number;
  exponentN: number;
  iterations: number;
};

export type Robertson2016Code = 'CCS' | 'CC' | 'CD' | 'TC' | 'TD' | 'SC' | 'SD';

export type Robertson2016Result = {
  code: Robertson2016Code;
  zone: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  family: 'clay-like' | 'transitional' | 'sand-like';
  response: 'contractive-sensitive' | 'contractive' | 'dilative';
  ib: number;
  cd: number;
};

export type Schneider2008Code = '1a' | '1b' | '1c' | '2' | '3';

export type Schneider2008Result = {
  code: Schneider2008Code;
  label: string;
  q: number;
  normalizedExcessPorePressure: number;
};

export const ROBERTSON_2016_CLASSES = Object.freeze({
  CCS: { zone: 1, label: 'Clay-like - Contractive - Sensitive', color: '#e2574c' },
  CC: { zone: 2, label: 'Clay-like - Contractive', color: '#3492db' },
  CD: { zone: 3, label: 'Clay-like - Dilative', color: '#2f287d' },
  TC: { zone: 4, label: 'Transitional - Contractive', color: '#66c990' },
  TD: { zone: 5, label: 'Transitional - Dilative', color: '#4b9b88' },
  SC: { zone: 6, label: 'Sand-like - Contractive', color: '#f29b38' },
  SD: { zone: 7, label: 'Sand-like - Dilative', color: '#c5a963' },
} satisfies Record<Robertson2016Code, { zone: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string; color: string }>);

export const SCHNEIDER_2008_CLASSES = Object.freeze({
  '1a': { label: 'Silts and Low Ir Clays', color: '#7bb8c7' },
  '1b': { label: 'Clays', color: '#ef6848' },
  '1c': { label: 'Sensitive Clays', color: '#405a9c' },
  '2': { label: 'Essentially Drained Sands', color: '#b6b6b6' },
  '3': { label: 'Transitional Soils', color: '#8fc99a' },
} satisfies Record<Schneider2008Code, { label: string; color: string }>);

/**
 * Robertson (2009/2016) variable-stress normalization used by the updated Qtn-Fr chart.
 * This is intentionally independent of the JTS/T 242 Qtn* iteration.
 */
export function deriveRobertsonQtn(
  qnetKpa: number,
  sigmaV0EffectiveKpa: number,
  frPercent: number,
  atmosphericPressureKpa = 100,
  iterationCount = 20,
): RobertsonNormalizationV1 | null {
  if (![qnetKpa, sigmaV0EffectiveKpa, frPercent, atmosphericPressureKpa].every(Number.isFinite)
    || qnetKpa <= 0 || sigmaV0EffectiveKpa <= 0 || frPercent <= 0 || atmosphericPressureKpa <= 0
    || !Number.isInteger(iterationCount) || iterationCount < 1) return null;
  let exponentN = 1;
  let qtn = Number.NaN;
  let ic = Number.NaN;
  let completed = 0;
  for (let index = 0; index < iterationCount; index += 1) {
    qtn = (qnetKpa / atmosphericPressureKpa)
      / Math.pow(sigmaV0EffectiveKpa / atmosphericPressureKpa, exponentN);
    if (!Number.isFinite(qtn) || qtn <= 0) return null;
    ic = Math.sqrt((3.47 - Math.log10(qtn)) ** 2 + (1.22 + Math.log10(frPercent)) ** 2);
    const nextExponent = Math.min(1, 0.381 * ic + 0.05 * (sigmaV0EffectiveKpa / atmosphericPressureKpa) - 0.15);
    if (!Number.isFinite(ic) || !Number.isFinite(nextExponent)) return null;
    completed = index + 1;
    if (Math.abs(nextExponent - exponentN) < 1e-6) {
      exponentN = nextExponent;
      qtn = (qnetKpa / atmosphericPressureKpa)
        / Math.pow(sigmaV0EffectiveKpa / atmosphericPressureKpa, exponentN);
      ic = Math.sqrt((3.47 - Math.log10(qtn)) ** 2 + (1.22 + Math.log10(frPercent)) ** 2);
      break;
    }
    exponentN = nextExponent;
  }
  return Number.isFinite(qtn) && qtn > 0 && Number.isFinite(ic)
    ? { qtn, ic, exponentN, iterations: completed }
    : null;
}

/** Robertson (2016), Qtn-Fr updated SBTn chart. Boundary equality stays conservative. */
export function classifyRobertson2016(qtn: number, frPercent: number): Robertson2016Result | null {
  if (!Number.isFinite(qtn) || !Number.isFinite(frPercent) || qtn <= 0 || frPercent <= 0) return null;
  const ib = 100 * (qtn + 10) / (70 + qtn * frPercent);
  const cd = (qtn - 11) * Math.pow(1 + 0.06 * frPercent, 17);
  if (!Number.isFinite(ib) || !Number.isFinite(cd)) return null;
  const family: Robertson2016Result['family'] = ib <= 22 ? 'clay-like' : ib <= 32 ? 'transitional' : 'sand-like';
  const dilative = cd > 70;
  let code: Robertson2016Code;
  if (family === 'clay-like') {
    code = dilative ? 'CD' : frPercent < 2 ? 'CCS' : 'CC';
  } else if (family === 'transitional') {
    code = dilative ? 'TD' : 'TC';
  } else {
    code = dilative ? 'SD' : 'SC';
  }
  const meta = ROBERTSON_2016_CLASSES[code];
  return {
    code,
    zone: meta.zone,
    label: meta.label,
    family,
    response: code === 'CCS' ? 'contractive-sensitive' : dilative ? 'dilative' : 'contractive',
    ib,
    cd,
  };
}

/** Schneider et al. (2008) Table 6 boundaries in Q-Δu2/σ′v0 space. */
export function schneider2008Boundaries(q: number) {
  if (!Number.isFinite(q) || q < 1) return null;
  return {
    lowIr: Math.pow(q, 1.25) / 100 + 0.99,
    clay: Math.pow(q, 0.95) / 5 + 1.05,
    sensitive: Math.pow(q, 0.91) / 1.5 + 1.1,
    drainedLower: q >= 20 ? Math.max(-0.5 * Math.log(q / 20), -1) : null,
    drainedUpper: q >= 20 ? Math.min(0.5 * Math.log(q / 20), 1) : null,
  };
}

/**
 * Schneider et al. (2008) five-zone classifier.
 * The method is admitted only for complete CPTU rows with reliable normalized excess u2.
 */
export function classifySchneider2008(q: number, normalizedExcessPorePressure: number): Schneider2008Result | null {
  if (!Number.isFinite(normalizedExcessPorePressure)) return null;
  const boundaries = schneider2008Boundaries(q);
  if (!boundaries) return null;
  let code: Schneider2008Code;
  if (boundaries.drainedLower !== null && boundaries.drainedUpper !== null
    && normalizedExcessPorePressure >= boundaries.drainedLower
    && normalizedExcessPorePressure <= boundaries.drainedUpper) code = '2';
  else if (normalizedExcessPorePressure < boundaries.lowIr) code = '3';
  else if (normalizedExcessPorePressure < boundaries.clay) code = '1a';
  else if (normalizedExcessPorePressure < boundaries.sensitive) code = '1b';
  else code = '1c';
  return { code, label: SCHNEIDER_2008_CLASSES[code].label, q, normalizedExcessPorePressure };
}
