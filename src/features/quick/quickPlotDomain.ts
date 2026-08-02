import { deriveJtsSeries, evaluateCompressionModulus, evaluateFrictionAngleCoarse, evaluateFrictionAngleFine, evaluateRelativeDensity, evaluateShearWaveVelocity, evaluateSptBlowCount, JTS_SOIL_CLASSES, JTS_STANDARD_PROBE, type JtsDerivedRow } from '../jts/jtsT242Domain';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import { classifyRobertson2016, classifySchneider2008, deriveRobertsonQtn, ROBERTSON_2016_CLASSES, schneider2008Boundaries, type Robertson2016Result, type Schneider2008Result } from './quickClassificationDomain';
import { Zlib } from 'fflate';

export const QUICK_CURVE_COLORS = Object.freeze({ qc: '#C94F4F', fs: '#246B58', u2: '#356FAE', derived: '#7158a8', ic: '#F4DC18' });
export const QUICK_SOIL_COLORS = Object.freeze({ sand: '#f2d66b', silt: '#9fd8ea', clay: '#9a7258', unknown: '#d8dee3' });
export const QUICK_FUZZY_COLORS = Object.freeze({ sand: '#f39a3f', mixed: '#76c4a0', clay: '#4e5f87' });
export const QUICK_PARAMETER_CLASSIFICATION_BASIS = '参数土类依据：JTS/T 242—2020 逐测点 Zone 分类。';
export const QUICK_PARAMETER_COMPARISON_ROLE = '参数按测点计算；Fuzzy、Modified Robertson 2016、Schneider 2008 仅作对照，不参与参数取值。';
export const QUICK_REPORT_ZONE_COLORS: Readonly<Record<number, string>> = Object.freeze({
  1: '#C94332', 2: '#C8733F', 3: '#536789', 4: '#4D9B91', 5: '#83C8AA',
  6: '#C2A35F', 7: '#EE9D36', 8: '#929292', 9: '#D8D8D8',
});
export const QUICK_REPORT_AXIS_LABELS = Object.freeze({
  qc: '锥尖阻力 qc (MPa)', qt: '修正锥尖阻力 qt (MPa)', fs: '侧壁摩阻力（套筒摩阻力） fs (kPa)',
  rf: '摩阻比 Rf (%)', fr: '归一化摩阻比 Fr (%)', u2: '孔隙水压力 u2 (kPa)', bq: '孔压参数 Bq (-)',
  qnet: '净锥尖阻力 qnet (kPa)', qtn: '归一化锥尖阻力 Qtn (-)', jtsQtn: 'JTS 归一化锥尖阻力 Qtn* (-)',
  ic: '土体行为类型指数 Ic (-)', jtsIc: 'JTS 土体行为类型指数 Ic (-)', ib: '修正土体行为类型指数 IB (-)',
  cd: '收缩–剪胀参数 CD (-)', depth: '泥面以下深度 (m)', composition: '土类组成比例 (%)',
});
export const QUICK_REPORT_STYLE = Object.freeze({
  ink: '#111719',
  axis: '#22282b',
  grid: '#bec7cc',
  gridLight: '#e1e5e7',
  tableHeader: '#e8edef',
  tableStripe: '#f6f8f8',
  frameWidth: 1.5,
  axisWidth: 1.2,
  gridWidth: 0.8,
});
export const QUICK_BQ_REFERENCE_POLYGONS = Object.freeze({
  source: 'R11', xDomain: [-.6, 1.4] as const, yDomain: [1, 1000] as const,
  zones: Object.freeze({
    1: [[.72,1],[1.4,1],[1.4,10]], 2: [[.08,1],[.72,1],[.43,3.2]],
    4: [[-.15,7],[.48,20],[.25,65],[-.3,18]], 5: [[-.3,18],[.25,65],[.10,165],[-.42,52]],
    6: [[-.42,52],[.10,165],[.02,1000],[-.52,220]], 7: [[-.52,220],[.02,1000],[-.12,1000]],
  } as const),
});

export type QuickPlotRowV1 = {
  rowId: string;
  depthM: number;
  qcMpa: number;
  fsKpa: number | null;
  u2Kpa: number | null;
};

export type QuickPlotSettingsV1 = {
  projectName: string;
  pointName: string;
  waterDepthM: number;
  effectiveAreaRatio: number;
  pressureBasisConfirmed: boolean;
  u2Usage?: 'total' | 'raw_only';
};

export type QuickPlotRevisionV1 = {
  revisionId: string;
  inputHash: string;
  createdAt: string;
  pageCount: 15;
};

export type QuickPlotWorkspaceV1 = {
  schema: 'sigs-quick-plot';
  version: 1;
  sourceName: string;
  rows: QuickPlotRowV1[];
  settings: QuickPlotSettingsV1;
  revisions: QuickPlotRevisionV1[];
  activeRevisionId: string | null;
};

export type QuickPlotReadiness =
  | { ready: true; message: string }
  | { ready: false; message: string; field: 'rows' | 'depth' | 'qc' };

export type QuickPlotPage = {
  title: string;
  methodIds: string[];
  referencePage: number;
  orientation: 'portrait' | 'landscape';
  chartTypes: readonly string[];
  canvas: HTMLCanvasElement;
  previewUrl: string;
};

export const QUICK_PDF_DPI = 600;
export const QUICK_PDF_A3_PIXELS = Object.freeze({
  portrait: Object.freeze({ width: 7016, height: 9921 }),
  landscape: Object.freeze({ width: 9921, height: 7016 }),
});

export type QuickPlotPdfProgress = {
  phase: 'rendering' | 'packaging';
  page: number;
  total: number;
};

export type QuickPlotPdfOptions = {
  onProgress?: (progress: QuickPlotPdfProgress) => void;
  shouldContinue?: () => boolean;
  signal?: AbortSignal;
};

export type QuickDerived = JtsDerivedRow & {
  plotBreakBefore: boolean;
  zone: number | null;
  robertsonSbtnZone: number | null;
  robertsonQtn: number | null;
  robertsonIc: number | null;
  robertsonExponentN: number | null;
  robertson2016: Robertson2016Result | null;
  schneider2008: Schneider2008Result | null;
  robertson2010Zone: number | null;
  robertson2010Index: number | null;
  fuzzy: QuickFuzzyMembershipV1 | null;
  major: 'sand' | 'silt' | 'clay' | 'unknown';
  permeability: number | null;
  sptN: number | null;
  esMpa: number | null;
  drPercent: number | null;
  phiDeg: number | null;
  jtsCompressionModulusMpa: number | null;
  g0Mpa: number | null;
  suKpa: number | null;
  suRemoldedKpa: number | null;
  suRatio: number | null;
  residualStrengthRatio: number | null;
  ocr: number | null;
  vsMps: number | null;
  k0: number | null;
  qtnCs: number | null;
  stateParameter: number | null;
  sensitivity: number | null;
  voidRatio: number | null;
  waterContentPercent: number | null;
  dryUnitWeight: number | null;
  porosity: number | null;
};

export type QuickFuzzyMembershipV1 = {
  u: number;
  raw: { clay: number; mixed: number; sand: number };
  percent: { clay: number; mixed: number; sand: number };
  dominant: 'clay' | 'mixed' | 'sand';
};

export const QUICK_REPORT_PAGE_SPECS = [
  { referencePage: 1, orientation: 'portrait', title: '实测 CPT/CPTU 曲线', chartTypes: ['qc-depth', 'fs-depth', 'u2-depth', 'qc-fs-correlation'] },
  { referencePage: 2, orientation: 'landscape', title: 'SBT - Bq 分类图', chartTypes: ['non-normalized-sbt', 'bq-sbt'] },
  { referencePage: 3, orientation: 'landscape', title: 'SBTn - Bq 归一化分类图', chartTypes: ['normalized-sbtn', 'normalized-bq'] },
  { referencePage: 4, orientation: 'landscape', title: 'Schneider 2008 分类证据', chartTypes: ['schneider-semiloq', 'schneider-2008-depth'] },
  { referencePage: 5, orientation: 'portrait', title: 'Fuzzy 最高概率分层与深度窗口组成', chartTypes: ['fuzzy-majority-layers', 'fuzzy-window-composition'] },
  { referencePage: 6, orientation: 'landscape', title: 'CPT 解译参考地层', chartTypes: ['qt-depth', 'rf-depth', 'u2-depth', 'ic-depth', 'jts-layer-depth'] },
  { referencePage: 7, orientation: 'landscape', title: '归一化参数与 Ic 深度图', chartTypes: ['qtn-depth', 'fr-depth', 'bq-depth', 'robertson-ic-depth', 'jts-ic-depth'] },
  { referencePage: 8, orientation: 'landscape', title: 'Modified Robertson 2016 深度分类', chartTypes: ['qtn-depth', 'fr-depth', 'ib-depth', 'cd-depth', 'robertson-2016-depth'] },
  { referencePage: 9, orientation: 'landscape', title: '多方法分类与刚度证据', chartTypes: ['jts-layer-depth', 'robertson-2016-layer-depth', 'schneider-2008-layer-depth', 'g0-depth', 'k0-depth'] },
  { referencePage: 10, orientation: 'landscape', title: '经验参数', chartTypes: ['permeability', 'spt-n', 'young-modulus', 'relative-density', 'friction-angle'] },
  { referencePage: 11, orientation: 'landscape', title: '黏性土经验参数', chartTypes: ['constrained-modulus', 'shear-modulus', 'undrained-strength', 'strength-ratio', 'ocr'] },
  { referencePage: 12, orientation: 'landscape', title: '波速与状态参数', chartTypes: ['shear-wave-velocity', 'state-parameter', 'k0', 'sensitivity', 'effective-friction-angle'] },
  { referencePage: 13, orientation: 'landscape', title: '土体物理指标', chartTypes: ['bulk-unit-weight', 'water-content', 'void-ratio', 'dry-unit-weight', 'porosity'] },
  { referencePage: 14, orientation: 'landscape', title: '归一化与修正指标', chartTypes: ['qt-depth', 'qtn-depth', 'ic-depth', 'clean-sand-equivalent', 'residual-strength-ratio'] },
  { referencePage: 16, orientation: 'portrait', title: '公式、参数与参考文献', chartTypes: ['formula-index', 'method-parameters', 'references'] },
] as const;

const QUICK_REPORT_CLASSIFICATION_CHART_TYPES = new Set([
  'non-normalized-sbt',
  'bq-sbt',
  'normalized-sbtn',
  'normalized-bq',
  'schneider-semiloq',
  'schneider-2008-depth',
  'fuzzy-majority-layers',
  'fuzzy-window-composition',
  'ic-depth',
  'robertson-ic-depth',
  'jts-ic-depth',
  'jts-layer-depth',
  'sbt-depth',
  'fuzzy-depth',
  'robertson-2016-depth',
  'robertson-2016-layer-depth',
  'schneider-2008-layer-depth',
]);

export function quickReportHasClassification(chartTypes: readonly string[]) {
  return chartTypes.some((chartType) => QUICK_REPORT_CLASSIFICATION_CHART_TYPES.has(chartType));
}

export const QUICK_PLOT_REFERENCES = [
  ['R01', 'Robertson, P.K. (1990). Soil classification using the cone penetration test. Canadian Geotechnical Journal, 27(1).'],
  ['R02', 'Robertson, P.K. (2009). Interpretation of cone penetration tests — a unified approach. Canadian Geotechnical Journal, 46(11).'],
  ['R03', 'Robertson, P.K. & Cabal, K.L. (2022). Guide to Cone Penetration Testing for Geotechnical Engineering, 7th ed.'],
  ['R05', 'Mayne, P.W., Cargill, E. & Greig, J. (2023). ConeTec CPT Interpretation Manual, Rev. 1.1.'],
  ['R06', 'JTS/T 242—2020 水运工程静力触探技术规程。'],
  ['R08', 'Zhang, Z. & Tumay, M.T. (1999). Statistical to Fuzzy Approach Toward CPT Soil Classification. Journal of Geotechnical and Geoenvironmental Engineering, 125(3).'],
  ['R09', 'Schneider, J.A., Randolph, M.F., Mayne, P.W. & Ramsey, N. (2008). Analysis of factors influencing soil classification using normalized piezocone tip resistance and pore pressure parameters. JGGE, 134(11).'],
  ['R10', 'Robertson, P.K. (2016). Cone penetration test (CPT)-based soil behaviour type classification system — an update. Canadian Geotechnical Journal, 53(12).'],
  ['R11', 'Robertson, P.K. (2010). Soil behaviour type from the CPT: an update. 2nd International Symposium on Cone Penetration Testing.'],
  ['R07', 'Jaky, J. (1944). The coefficient of earth pressure at rest.'],
  ['A01', '快捷方法包假设：土粒比重 Gs=2.65、完全饱和；只用于物理指标经验换算。'],
] as const;

export const QUICK_PLOT_FORMULAS = [
  'qt(kPa) = qc(kPa) + u2(kPa)(1-a)  [R06]',
  'Ic = [(3.47-log Qtn)²+(log Fr+1.22)²]½  [R06]',
  'γsat(kN/m³)=17.71[qt(MPa)]^0.066；qt>30 MPa→22  [R06]',
  'k(m/s)=10^(0.952-3.04Ic)，1<Ic≤3.27  [R05]',
  'k(m/s)=10^(-4.52-1.37Ic)，3.27<Ic≤4  [R05]',
  'N=0.075 qt(kPa) Ic² / pa(kPa)  [R06]',
  'Es（R05）(MPa)=0.015qnet(MPa)·10^(0.55Ic+1.68)  [R05]',
  'Dr(%)=31.78ln[qt(MPa)]-13.98；仅砂类土  [R06]',
  'φ′=3.65ln[qnet(MPa)]+27.1；Zone 7  [R06]',
  'φ′=3.3ln[qnet(MPa)]+29.5；Zone 8–9  [R06]',
  'Es（JTS 7.2.8）(MPa)=3.61[qnet(MPa)]^0.56；qnet≤3.4 MPa  [R06]',
  'Es（JTS 7.2.8）(MPa)=0.47[qnet(MPa)]^2.23；3.4<qnet≤5 MPa  [R06]',
  'Vs=157.39[qt(MPa)]^0.39；黏性土  [R06]',
  'Vs=208.83[qt(MPa)]^0.13；非黏性土  [R06]',
  'G0(MPa)=ρ(Mg/m³)Vs²/1000  [R06]',
  'Su(kPa)=qnet(kPa)/15.5；Su/σ′v0=Su÷σ′v0  [R06]',
  'OCR = 0.16 Qt  [R06]',
  'St = 6.3/Fr；仅黏性土  [R06]',
  'Qtn,cs=Kc·Qtn；Kc=1（Ic≤1.64）  [R02]',
  'Kc=clamp(5.581Ic³-0.403Ic⁴-21.63Ic²+33.75Ic-17.88, 1, 6)  [R02]',
  'ψ = 0.56-0.33log Qtn,cs；仅砂类土且 Ic<2.6  [R02]',
  'K0 = (1-sinφ′) OCR^sinφ′  [R07]',
  'r=γsat/γw；e=(Gs-r)/(r-1)；w=e/Gs；γd=Gsγw/(1+e)；n=e/(1+e)  [A01]',
  'Robertson Qtn=(qnet/pa)(pa/σ′v0)^n；n=min[1,0.381Ic+0.05(σ′v0/pa)-0.15]  [R10]',
  'IB=100(Qtn+10)/(70+Qtn·Fr)；CD=(Qtn-11)(1+0.06Fr)^17  [R10]',
  'Schneider Q=qnet/σ′v0；U2=Δu2/σ′v0；五区边界按 Table 6  [R09]',
] as const;

export function createQuickPlotWorkspace(projectName: string): QuickPlotWorkspaceV1 {
  return {
    schema: 'sigs-quick-plot', version: 1, sourceName: '', rows: [], revisions: [], activeRevisionId: null,
    settings: { projectName, pointName: 'CPT-01', waterDepthM: 0, effectiveAreaRatio: JTS_STANDARD_PROBE.effectiveAreaRatio, pressureBasisConfirmed: false },
  };
}

export function parseQuickPlotClipboard(text: string): { rows: QuickPlotRowV1[]; skipped: number } {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const rows: QuickPlotRowV1[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    const cells = line.split(line.includes('\t') ? '\t' : line.includes(',') ? ',' : /\s+/).map((cell) => cell.trim());
    const values = cells.slice(0, 4).map(readNumber);
    if (index === 0 && values[0] === null && /depth|深度/i.test(cells[0] ?? '')) return;
    const [depthM, qcMpa, fsValue, u2Value] = values;
    const fsKpa = fsValue ?? null;
    const u2Kpa = u2Value ?? null;
    if (depthM === null || qcMpa === null) { skipped += 1; return; }
    rows.push({ rowId: `quick-row-${String(index + 1).padStart(6, '0')}`, depthM, qcMpa, fsKpa, u2Kpa });
  });
  return { rows, skipped };
}

export function quickRowsFromTable(headers: string[], rows: string[][]) {
  const qcIsKpa = /kpa/i.test(headers[1] ?? '') && !/mpa/i.test(headers[1] ?? '');
  const fsIsMpa = /mpa/i.test(headers[2] ?? '');
  const u2IsMpa = /mpa/i.test(headers[3] ?? '');
  return rows.flatMap((cells, index): QuickPlotRowV1[] => {
    const depthM = readNumber(cells[0]);
    const qcSource = readNumber(cells[1]);
    if (depthM === null || qcSource === null) return [];
    const fsSource = readNumber(cells[2]);
    const u2Source = readNumber(cells[3]);
    return [{
      rowId: `quick-row-${String(index + 1).padStart(6, '0')}`,
      depthM,
      qcMpa: qcIsKpa ? qcSource / 1000 : qcSource,
      fsKpa: fsSource === null ? null : fsIsMpa ? fsSource * 1000 : fsSource,
      u2Kpa: u2Source === null ? null : u2IsMpa ? u2Source * 1000 : u2Source,
    }];
  });
}

export function quickPlotReadiness(rows: QuickPlotRowV1[]): QuickPlotReadiness {
  if (!rows.length) return { ready: false, field: 'rows', message: '请先粘贴数据。' };
  const finiteDepth = rows.filter((row) => Number.isFinite(row.depthM));
  if (finiteDepth.length < 2) return { ready: false, field: 'depth', message: '没有足够的深度数据，请重新粘贴。' };
  const finiteQc = finiteDepth.filter((row) => Number.isFinite(row.qcMpa));
  if (finiteQc.length < 2) return { ready: false, field: 'qc', message: '没有足够的 qc 数据，请重新粘贴。' };
  return { ready: true, message: `已收到 ${finiteQc.length.toLocaleString('zh-CN')} 行数据，可以生成图册。` };
}

export function quickPlotInputHash(workspace: Pick<QuickPlotWorkspaceV1, 'rows' | 'settings'>) {
  return sha256HexSync(stableStringify({ rows: workspace.rows, settings: workspace.settings, methodPackage: 'QP-1.0' }));
}

export function quickPlotRoute(rows: QuickPlotRowV1[], settings?: Pick<QuickPlotSettingsV1, 'u2Usage'>) {
  const usable = rows.filter((row) => Number.isFinite(row.depthM) && Number.isFinite(row.qcMpa));
  const withU2 = usable.filter((row) => row.u2Kpa !== null && Number.isFinite(row.u2Kpa));
  if (settings?.u2Usage === 'raw_only' || usable.length < 2 || withU2.length < 2) return 'approximate_cpt' as const;
  return withU2.length === usable.length ? 'full_cptu' as const : 'partial_cptu' as const;
}

/** Robertson (1990) normalized Qt-Fr chart, including the non-Ic Zones 1, 8 and 9. */
export function quickRobertsonSbtnZone(qtNormalized: number | null, frPercent: number | null) {
  if (qtNormalized === null || frPercent === null || !Number.isFinite(qtNormalized) || !Number.isFinite(frPercent)) return null;
  if (qtNormalized < 1 || qtNormalized > 1000 || frPercent < 0.1 || frPercent > 10) return null;
  const qtnA = 12 * Math.exp(-1.4 * frPercent);
  const icBoundary = (ic: number) => {
    const radicand = ic ** 2 - (1.22 + Math.log10(frPercent)) ** 2;
    return radicand < 0 ? null : 10 ** (3.47 - Math.sqrt(radicand));
  };
  const below = (boundary: number | null) => boundary !== null && Number.isFinite(boundary) && qtNormalized <= boundary;
  const bA = qtNormalized <= qtnA;
  const bB = below(icBoundary(3.60));
  const bC = below(icBoundary(2.95));
  const bD = below(icBoundary(2.60));
  const bE = frPercent >= 10 ** (2.05 - 1.22) || below(icBoundary(2.05));
  const bF = frPercent >= 10 ** (1.31 - 1.22) || below(icBoundary(1.31));
  const gThreshold = 28 / 3 - Math.sqrt(2260 / 36);
  const gDenominator = 0.005 * (frPercent - 1) - 0.0003 * (frPercent - 1) ** 2 - 0.002;
  const qtnG = gDenominator > 0 ? 1 / gDenominator : null;
  const bG = frPercent <= gThreshold || below(qtnG);
  const leftH = frPercent <= 4.5;
  if (bA) return 1;
  if (bG && bB) return 2;
  if (bG && !bB && bC) return 3;
  if (bG && !bC && bD) return 4;
  if (bG && !bD && bE) return 5;
  if (bG && !bE && bF) return 6;
  if (bG && !bF) return 7;
  if (!bG && leftH) return 8;
  if (!bG && !leftH) return 9;
  return null;
}

/**
 * Robertson (2010) non-normalized SBT chart used by the basic CPT depth page.
 * It intentionally owns a separate implementation and source identity from the
 * Robertson (1990) normalized Qt-Fr classifier, even though both charts retain
 * the familiar nine-zone contour construction.
 */
export function quickRobertson2010SbtZone(qcOverPa: number | null, rfPercent: number | null) {
  if (qcOverPa === null || rfPercent === null || !Number.isFinite(qcOverPa) || !Number.isFinite(rfPercent)) return null;
  if (qcOverPa < 1 || qcOverPa > 1000 || rfPercent < 0.1 || rfPercent > 10) return null;
  const zoneOneBoundary = 12 * Math.exp(-1.4 * rfPercent);
  const contour = (index: number) => {
    const radicand = index ** 2 - (1.22 + Math.log10(rfPercent)) ** 2;
    return radicand < 0 ? null : 10 ** (3.47 - Math.sqrt(radicand));
  };
  const below = (boundary: number | null) => boundary !== null && Number.isFinite(boundary) && qcOverPa <= boundary;
  const contours = [3.60, 2.95, 2.60, 2.05, 1.31].map(contour);
  const highFrictionThreshold = 28 / 3 - Math.sqrt(2260 / 36);
  const highFrictionDenominator = 0.005 * (rfPercent - 1) - 0.0003 * (rfPercent - 1) ** 2 - 0.002;
  const highFrictionBoundary = highFrictionDenominator > 0 ? 1 / highFrictionDenominator : null;
  const withinMainContour = rfPercent <= highFrictionThreshold || below(highFrictionBoundary);
  if (qcOverPa <= zoneOneBoundary) return 1;
  if (withinMainContour && below(contours[0])) return 2;
  if (withinMainContour && !below(contours[0]) && below(contours[1])) return 3;
  if (withinMainContour && !below(contours[1]) && below(contours[2])) return 4;
  if (withinMainContour && !below(contours[2]) && (rfPercent >= 10 ** (2.05 - 1.22) || below(contours[3]))) return 5;
  if (withinMainContour && !(rfPercent >= 10 ** (2.05 - 1.22) || below(contours[3])) && (rfPercent >= 10 ** (1.31 - 1.22) || below(contours[4]))) return 6;
  if (withinMainContour && !(rfPercent >= 10 ** (1.31 - 1.22) || below(contours[4]))) return 7;
  return rfPercent <= 4.5 ? 8 : 9;
}

/** Zhang & Tumay (1999) CPT fuzzy classification using qc in MPa and Rf in percent. */
export function quickFuzzyMembershipFromU(u: number): Omit<QuickFuzzyMembershipV1, 'u'> | null {
  if (!Number.isFinite(u)) return null;
  const clay = u < -0.1775 ? 1 : Math.exp(-0.5 * ((u + 0.1775) / 0.86332) ** 2);
  const mixed = Math.exp(-0.5 * ((u - 1.35) / 0.724307) ** 2);
  const sand = u > 2.6575 ? 1 : Math.exp(-0.5 * ((u - 2.6575) / 0.834586) ** 2);
  const total = clay + mixed + sand;
  if (!Number.isFinite(total) || total <= 0) return null;
  const percent = { clay: clay / total * 100, mixed: mixed / total * 100, sand: sand / total * 100 };
  const dominant = sand >= mixed && sand >= clay ? 'sand' : mixed >= clay ? 'mixed' : 'clay';
  return { raw: { clay, mixed, sand }, percent, dominant };
}

export function quickFuzzyMembership(qcMpa: number | null, rfPercent: number | null): QuickFuzzyMembershipV1 | null {
  if (qcMpa === null || rfPercent === null || !Number.isFinite(qcMpa) || !Number.isFinite(rfPercent) || qcMpa <= 0 || rfPercent <= 0) return null;
  const x = 0.1539 * rfPercent + 0.8870 * Math.log10(qcMpa) - 3.35;
  const y = -0.2957 * rfPercent + 0.4617 * Math.log10(qcMpa) - 0.37;
  const a1 = -11.345, a2 = -3.795, b1 = 15.202, b2 = 5.085;
  const c1 = -0.296, c2 = -0.759, d1 = 2.960, d2 = 2.477;
  const p = c1 * x - c2 * y + d1;
  const q = c2 * x + c1 * y + d2;
  const denominator = p ** 2 + q ** 2;
  if (!Number.isFinite(denominator) || denominator <= Number.EPSILON) return null;
  const u = ((a1 * x - a2 * y + b1) * p - (a2 * x + a1 * y + b2) * q) / denominator;
  if (!Number.isFinite(u)) return null;
  const membership = quickFuzzyMembershipFromU(u);
  return membership ? { u, ...membership } : null;
}

export function quickRobustDisplayRange(values: number[], fractions: [number, number] = [0.01, 0.99]) {
  const ordered = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!ordered.length) return { min: 0, max: 1, outsideCount: 0 };
  let min = ordered[0];
  let max = ordered[ordered.length - 1];
  if (ordered.length >= 20) {
    min = quantile(ordered, fractions[0]);
    max = quantile(ordered, fractions[1]);
  }
  if (min === max) { min -= 0.5; max += 0.5; }
  return { min, max, outsideCount: ordered.filter((value) => value < min || value > max).length };
}

export function quickRelativeDensityPercent(value: number | null) {
  return value === null || !Number.isFinite(value) ? null : value * 100;
}

export function quickCrossCorrelation(rows: QuickPlotRowV1[], maximumLag = 20) {
  const pairs = rows.flatMap((row) => row.fsKpa === null || !Number.isFinite(row.qcMpa) || !Number.isFinite(row.fsKpa) ? [] : [{ qc: row.qcMpa, fs: row.fsKpa }]);
  const correlation = (left: number[], right: number[]) => {
    if (left.length < 2 || left.length !== right.length) return null;
    const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length; const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
    let numerator = 0, leftSquare = 0, rightSquare = 0;
    left.forEach((value, index) => { const a = value - leftMean; const b = right[index] - rightMean; numerator += a * b; leftSquare += a * a; rightSquare += b * b; });
    const denominator = Math.sqrt(leftSquare * rightSquare);
    return denominator > 0 ? numerator / denominator : null;
  };
  return Array.from({ length: maximumLag * 2 + 1 }, (_, index) => index - maximumLag).flatMap((lag) => {
    const qc: number[] = []; const fs: number[] = [];
    pairs.forEach((pair, index) => { const shifted = pairs[index + lag]; if (!shifted) return; qc.push(pair.qc); fs.push(shifted.fs); });
    const value = correlation(qc, fs); return value === null ? [] : [{ lag, correlation: value }];
  });
}

export function quickPermeabilityFromIc(ic: number | null) {
  if (ic === null || !Number.isFinite(ic) || ic <= 1 || ic > 4) return null;
  return ic <= 3.27 ? 10 ** (0.952 - 3.04 * ic) : 10 ** (-4.52 - 1.37 * ic);
}

export function quickSandStateParameter(major: 'sand' | 'silt' | 'clay' | 'unknown', ic: number | null, qtnCs: number | null) {
  return major === 'sand' && ic !== null && ic < 2.6 && qtnCs !== null && qtnCs > 0
    ? 0.56 - 0.33 * Math.log10(qtnCs)
    : null;
}

export function quickSaturatedPhysicalIndices(gammaSatKnM3: number, waterUnitWeightKnM3 = 10, grainSpecificGravity = 2.65) {
  const densityRatio = gammaSatKnM3 / waterUnitWeightKnM3;
  const voidRatio = densityRatio > 1.01 ? (grainSpecificGravity - densityRatio) / (densityRatio - 1) : null;
  return {
    voidRatio: finite(voidRatio),
    waterContentPercent: finite(voidRatio === null ? null : voidRatio / grainSpecificGravity * 100),
    dryUnitWeight: finite(voidRatio === null ? null : grainSpecificGravity * waterUnitWeightKnM3 / (1 + voidRatio)),
    porosity: finite(voidRatio === null ? null : voidRatio / (1 + voidRatio)),
  };
}

export function createQuickPlotRevision(workspace: QuickPlotWorkspaceV1, now = new Date().toISOString()): QuickPlotRevisionV1 {
  return { revisionId: `quick-output-${Date.now().toString(36)}`, inputHash: quickPlotInputHash(workspace), createdAt: now, pageCount: 15 };
}

export function quickPlotPdfAuthority(workspace: QuickPlotWorkspaceV1) {
  const active = workspace.revisions.find((revision) => revision.revisionId === workspace.activeRevisionId);
  return active ? `${active.revisionId}:${active.inputHash}:${quickPlotInputHash(workspace)}` : '';
}

function prepareQuickPlotReport(workspace: QuickPlotWorkspaceV1) {
  const rows = [...workspace.rows].sort((a, b) => a.depthM - b.depthM);
  const derived = deriveQuickPlotRows(rows, workspace.settings);
  const builders: Array<(ctx: CanvasRenderingContext2D, box: PlotBox) => void> = [
    (ctx, box) => drawMeasuredPortraitPage(ctx, box, rows),
    (ctx, box) => drawSbtAndBqPage(ctx, box, derived),
    (ctx, box) => drawNormalizedSbtPairPage(ctx, box, derived),
    (ctx, box) => drawSchneider2008Page(ctx, box, derived),
    (ctx, box) => drawClassificationPortraitPage(ctx, box, derived),
    (ctx, box) => drawReferenceLayerPage(ctx, box, derived),
    (ctx, box) => drawNormalizedDepthPage(ctx, box, derived),
    (ctx, box) => drawRobertson2016DepthPage(ctx, box, derived),
    (ctx, box) => drawClassificationLayerComparisonPage(ctx, box, derived),
    (ctx, box) => drawParameterDepthPage(ctx, box, derived, [
      ['渗透系数 k', 'm/s', QUICK_CURVE_COLORS.derived, (r) => r.major === 'sand' ? r.permeability : null, { scale: 'log' }],
      ['标准贯入击数 N', '击/0.30 m', '#68768a', (r) => r.sptN],
      ['压缩模量 Es（R05）', 'MPa', '#a06a42', (r) => r.major === 'sand' ? r.esMpa : null],
      ['相对密实度 Dr', '%', '#bd7d24', (r) => r.major === 'sand' ? r.drPercent : null],
      ['有效摩擦角 φ′', '°', QUICK_SOIL_COLORS.sand, (r) => r.major === 'sand' ? r.phiDeg : null],
    ]),
    (ctx, box) => drawClayParameterPage(ctx, box, derived),
    (ctx, box) => drawParameterDepthPage(ctx, box, derived, [
      ['剪切波速 Vs', 'm/s', '#456d91', (r) => r.vsMps],
      ['状态参数 ψ', '-', '#8b6c43', (r) => r.stateParameter],
      ['静止土压力系数 K0', '-', '#895d74', (r) => r.k0],
      ['灵敏度 St', '-', '#a2665c', (r) => r.major === 'clay' ? r.sensitivity : null],
      ['有效摩擦角 φ′', '°', QUICK_SOIL_COLORS.silt, (r) => r.major !== 'clay' ? r.phiDeg : null],
    ]),
    (ctx, box) => drawParameterDepthPage(ctx, box, derived, [
      ['饱和重度 γsat', 'kN/m³', '#5e7080', (r) => r.gammaSatKnM3],
      ['含水率 w', '%', QUICK_CURVE_COLORS.u2, (r) => r.waterContentPercent],
      ['孔隙比 e', '-', '#97705c', (r) => r.voidRatio],
      ['干重度 γd', 'kN/m³', '#8c7448', (r) => r.dryUnitWeight],
      ['孔隙率 n', '-', '#4f8a7a', (r) => r.porosity],
    ]),
    (ctx, box) => drawCorrectedIndexPage(ctx, box, derived),
    (ctx, box) => drawReferencesPage(ctx, box, workspace.settings, derived),
  ];
  const methodIds = [['实测'], ['R11'], ['R01', 'R02'], ['R09'], ['R08'], ['R06'], ['R01', 'R06'], ['R10'], ['R06', 'R07', 'R09', 'R10', 'A02'], ['R03', 'R05', 'R06'], ['R06', 'A02'], ['R02', 'R06', 'R07', 'A02'], ['R03', 'R06', 'A01'], ['R02', 'R06', 'A02'], ['索引页']];
  return { builders, methodIds };
}

function renderQuickPlotPage(
  workspace: QuickPlotWorkspaceV1,
  prepared: ReturnType<typeof prepareQuickPlotReport>,
  index: number,
  pixelSize?: { width: number; height: number },
) {
  const spec = QUICK_REPORT_PAGE_SPECS[index];
  const logicalSize = spec.orientation === 'portrait' ? { width: 1080, height: 1528 } : { width: 1920, height: 1080 };
  const canvas = document.createElement('canvas');
  canvas.width = pixelSize?.width ?? logicalSize.width;
  canvas.height = pixelSize?.height ?? logicalSize.height;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!ctx) throw new Error('QUICK_PDF_CANVAS_UNAVAILABLE');
  ctx.setTransform(canvas.width / logicalSize.width, 0, 0, canvas.height / logicalSize.height, 0, 0);
  const box = pageFrame(ctx, logicalSize, spec.title, workspace, index + 1, prepared.methodIds[index]);
  prepared.builders[index](ctx, box);
  return { canvas, spec, methodIds: prepared.methodIds[index] };
}

export function renderQuickPlotReport(workspace: QuickPlotWorkspaceV1): QuickPlotPage[] {
  const prepared = prepareQuickPlotReport(workspace);
  return QUICK_REPORT_PAGE_SPECS.map((spec, index) => {
    const rendered = renderQuickPlotPage(workspace, prepared, index);
    return { ...spec, methodIds: rendered.methodIds, canvas: rendered.canvas, previewUrl: rendered.canvas.toDataURL('image/jpeg', 0.9) };
  });
}

export async function createQuickPlotPdf(workspace: QuickPlotWorkspaceV1, projectName: string, pointName: string, options: QuickPlotPdfOptions = {}) {
  const prepared = prepareQuickPlotReport(workspace);
  const encoded: PdfImagePage[] = [];
  const total = QUICK_REPORT_PAGE_SPECS.length;
  for (let index = 0; index < total; index += 1) {
    assertQuickPdfCurrent(options);
    const spec = QUICK_REPORT_PAGE_SPECS[index];
    const pixelSize = QUICK_PDF_A3_PIXELS[spec.orientation];
    const rendered = renderQuickPlotPage(workspace, prepared, index, pixelSize);
    try {
      const rgb = await encodeCanvasRgb(rendered.canvas, options);
      encoded.push({ rgb, width: pixelSize.width, height: pixelSize.height, orientation: spec.orientation });
    } finally {
      rendered.canvas.width = 1;
      rendered.canvas.height = 1;
    }
    options.onProgress?.({ phase: 'rendering', page: index + 1, total });
    await yieldQuickPdf();
  }
  assertQuickPdfCurrent(options);
  options.onProgress?.({ phase: 'packaging', page: total, total });
  return buildPdf(encoded, `${projectName} / ${pointName}`);
}

export function deriveQuickPlotRows(rows: QuickPlotRowV1[], settings: QuickPlotSettingsV1): QuickDerived[] {
  const route = quickPlotRoute(rows, settings);
  const hasU2 = route !== 'approximate_cpt';
  const sortedRows = [...rows].sort((left, right) => left.depthM - right.depthM);
  const rawIndex = new Map(sortedRows.map((row, index) => [row.rowId, index]));
  const seenDepths = new Set<number>();
  const usable = rows.filter((row) => {
    if (row.depthM < 0 || row.qcMpa <= 0 || (row.fsKpa ?? 0) <= 0 || seenDepths.has(row.depthM)) return false;
    const correctedQtKpa = row.qcMpa * 1000 + (hasU2 && row.u2Kpa !== null ? (1 - settings.effectiveAreaRatio) * row.u2Kpa : 0);
    if (!Number.isFinite(correctedQtKpa) || correctedQtKpa <= 0) return false;
    seenDepths.add(row.depthM);
    return true;
  });
  const measured = usable.map((row) => ({ sourceRowId: row.rowId, depthM: row.depthM, qcKpa: row.qcMpa * 1000, fsKpa: row.fsKpa!, u2Kpa: row.u2Kpa }));
  if (measured.length < 2) return [];
  const result = deriveJtsSeries(measured, hasU2 ? {
    route, effectiveAreaRatio: settings.effectiveAreaRatio, waterDepthM: settings.waterDepthM,
    u2HydrostaticDatum: 'total', testZeroDatum: 'mudline', waterUnitWeightKnM3: 10,
  } : { route: 'approximate_cpt', effectiveAreaRatio: settings.effectiveAreaRatio, waterUnitWeightKnM3: 10 });
  if (!result.ok) return [];
  let previousSourceIndex: number | null = null;
  return result.rows.map((row): QuickDerived => {
    const sourceIndex = rawIndex.get(row.sourceRowId) ?? null;
    const plotBreakBefore = previousSourceIndex !== null && (sourceIndex === null || sourceIndex !== previousSourceIndex + 1);
    previousSourceIndex = sourceIndex;
    const classification = row.icClassification;
    const zone = classification?.zone ?? null;
    const robertsonSbtnZone = quickRobertsonSbtnZone(row.qtNormalized, row.frPercent);
    const rawNormalizedTip = row.qcKpa > 0 ? row.qcKpa / 100 : null;
    const rawFrictionRatio = row.qcKpa > 0 ? row.fsKpa / row.qcKpa * 100 : null;
    const robertson2010Zone = rawNormalizedTip === null ? null : quickRobertson2010SbtZone(rawNormalizedTip, rawFrictionRatio);
    const robertson2010Index = rawNormalizedTip !== null && rawFrictionRatio !== null && rawFrictionRatio > 0
      ? Math.sqrt((3.47 - Math.log10(rawNormalizedTip)) ** 2 + (1.22 + Math.log10(rawFrictionRatio)) ** 2)
      : null;
    const robertsonNormalized = row.frPercent === null ? null : deriveRobertsonQtn(row.qnetKpa, row.sigmaV0EffectiveKpa, row.frPercent);
    const robertson2016 = robertsonNormalized && row.frPercent !== null ? classifyRobertson2016(robertsonNormalized.qtn, row.frPercent) : null;
    const schneider2008 = hasU2 && row.qtNormalized !== null && row.porePressureRatio !== null
      ? classifySchneider2008(row.qtNormalized, row.porePressureRatio)
      : null;
    const fuzzyRfPercent = row.qcKpa > 0 ? row.fsKpa / row.qcKpa * 100 : null;
    const fuzzy = quickFuzzyMembership(row.qcKpa / 1000, fuzzyRfPercent);
    const major = zone === null ? 'unknown' : zone >= 7 ? 'sand' : zone === 6 ? 'silt' : 'clay';
    const context = { route: row.route, soilClassId: classification?.soilClassId, materialScope: 'within_source' as const, coefficientConfirmed: false };
    const permeability = major === 'sand' ? quickPermeabilityFromIc(row.ic) : null;
    const sptNResult = zone !== null && row.ic !== null ? evaluateSptBlowCount(context, row.qtKpa, row.ic) : null;
    const esMpa = major !== 'sand' || row.ic === null || row.qnetKpa <= 0 ? null : 0.015 * (row.qnetKpa / 1000) * 10 ** (0.55 * row.ic + 1.68);
    const drResult = major === 'sand' ? evaluateRelativeDensity(context, row.qtKpa / 1000) : null;
    const phiResult = zone === 7 ? evaluateFrictionAngleFine(context, row.qnetKpa / 1000) : evaluateFrictionAngleCoarse(context, row.qnetKpa / 1000);
    const mResult = major === 'clay' ? evaluateCompressionModulus(context, row.qnetKpa / 1000) : null;
    const g0Mpa = row.ic === null || row.qnetKpa <= 0 ? null : 0.0188 * (row.qnetKpa / 1000) * 10 ** (0.55 * row.ic + 1.68);
    const suKpa = major === 'clay' && row.qnetKpa > 0 ? row.qnetKpa / 15.5 : null;
    const ocr = major === 'clay' && row.qtNormalized !== null && row.qtNormalized > 0 ? 0.16 * row.qtNormalized : null;
    const sensitivity = major === 'clay' && row.frPercent !== null && row.frPercent > 0 ? 6.3 / row.frPercent : null;
    const suRemoldedKpa = suKpa !== null && sensitivity !== null && sensitivity > 0 ? suKpa / sensitivity : null;
    const qtnCs = robertsonNormalized === null ? null : robertsonNormalized.qtn * cleanSandCorrection(robertsonNormalized.ic);
    const stateParameter = quickSandStateParameter(major, robertsonNormalized?.ic ?? null, qtnCs);
    const phiDeg = valueOf(phiResult);
    const vsResult = evaluateShearWaveVelocity(context, row.qtKpa / 1000, major === 'clay' ? 'cohesive' : 'noncohesive');
    const vsMps = valueOf(vsResult);
    const density = row.gammaSatKnM3 / 9.81;
    const g0FromVsMpa = vsMps !== null && density > 0 ? density * vsMps ** 2 / 1000 : null;
    // The reference atlas evaluates K0 for cohesive rows. The quick route has no
    // laboratory clay friction angle, so the documented 30° preset is used only
    // for this K0 estimate; the plotted friction-angle track remains method-derived.
    const k0PhiDeg = phiDeg ?? (major === 'clay' ? 30 : null);
    const sinPhi = k0PhiDeg === null ? null : Math.sin(k0PhiDeg * Math.PI / 180);
    const k0 = sinPhi === null || ocr === null ? null : (1 - sinPhi) * ocr ** sinPhi;
    const physical = quickSaturatedPhysicalIndices(row.gammaSatKnM3);
    return {
      ...row, plotBreakBefore, zone, robertsonSbtnZone, robertson2010Zone, robertson2010Index: finite(robertson2010Index),
      robertsonQtn: robertsonNormalized?.qtn ?? null,
      robertsonIc: robertsonNormalized?.ic ?? null,
      robertsonExponentN: robertsonNormalized?.exponentN ?? null,
      robertson2016, schneider2008,
      fuzzy, major, permeability: finite(permeability), sptN: valueOf(sptNResult), esMpa: finite(esMpa), drPercent: quickRelativeDensityPercent(valueOf(drResult)), phiDeg,
      jtsCompressionModulusMpa: valueOf(mResult), g0Mpa: finite(g0FromVsMpa ?? g0Mpa), suKpa, suRemoldedKpa: finite(suRemoldedKpa), suRatio: suKpa !== null && row.sigmaV0EffectiveKpa > 0 ? suKpa / row.sigmaV0EffectiveKpa : null,
      residualStrengthRatio: suRemoldedKpa !== null && row.sigmaV0EffectiveKpa > 0 ? suRemoldedKpa / row.sigmaV0EffectiveKpa : null,
      ocr: finite(ocr), vsMps: finite(vsMps), k0: finite(k0), qtnCs: finite(qtnCs), stateParameter: finite(stateParameter), sensitivity: finite(sensitivity),
      ...physical,
    };
  });
}

export function quickPlotClassificationEvidence(workspace: QuickPlotWorkspaceV1) {
  const derived = deriveQuickPlotRows(workspace.rows, workspace.settings);
  const jtsZones = derived.flatMap((row) => row.zone === null ? [] : [row.zone]);
  const robertsonZones = derived.flatMap((row) => row.robertsonSbtnZone === null ? [] : [row.robertsonSbtnZone]);
  const fuzzyClasses = derived.flatMap((row) => row.fuzzy ? [row.fuzzy.dominant] : []);
  const robertson2016Classes = derived.flatMap((row) => row.robertson2016 ? [row.robertson2016.code] : []);
  const schneider2008Classes = derived.flatMap((row) => row.schneider2008 ? [row.schneider2008.code] : []);
  return {
    parameterBasis: QUICK_PARAMETER_CLASSIFICATION_BASIS,
    comparisonRole: QUICK_PARAMETER_COMPARISON_ROLE,
    sourceRows: workspace.rows.length,
    derivedRows: derived.length,
    jtsValid: jtsZones.length,
    robertsonValid: robertsonZones.length,
    fuzzyValid: fuzzyClasses.length,
    jtsDistinctZones: new Set(jtsZones).size,
    robertsonDistinctZones: new Set(robertsonZones).size,
    fuzzyDistinctClasses: new Set(fuzzyClasses).size,
    robertson2016Valid: robertson2016Classes.length,
    robertson2016DistinctClasses: new Set(robertson2016Classes).size,
    schneider2008Valid: schneider2008Classes.length,
    schneider2008DistinctClasses: new Set(schneider2008Classes).size,
    gapCount: derived.filter((row) => row.plotBreakBefore).length,
  };
}

function cleanSandCorrection(ic: number) {
  if (ic <= 1.64) return 1;
  const value = 5.581 * ic ** 3 - 0.403 * ic ** 4 - 21.63 * ic ** 2 + 33.75 * ic - 17.88;
  return Math.max(1, Math.min(6, value));
}

function valueOf(result: { status: string; value: number | null } | null) { return result?.status === 'value' && Number.isFinite(result.value) ? result.value : null; }
function finite(value: number | null) { return value !== null && Number.isFinite(value) ? value : null; }
function readNumber(value: unknown) { const text = String(value ?? '').trim().replace(/,/g, ''); if (!text) return null; const parsed = Number(text); return Number.isFinite(parsed) ? parsed : null; }

type PlotBox = { x: number; y: number; width: number; height: number };
type Track = [string, string, string, (row: QuickDerived) => number | null, { xQuantiles?: [number, number]; xRange?: [number, number]; colorByRow?: (row: QuickDerived) => string; scale?: 'linear' | 'log' }?];

function pageFrame(ctx: CanvasRenderingContext2D, canvas: { width: number; height: number }, title: string, workspace: QuickPlotWorkspaceV1, page: number, methods: string[]): PlotBox {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const margin = canvas.width * .052;
  const headerLineY = canvas.height * .078;
  const footerLineY = canvas.height - 45;
  drawSigsReportMark(ctx, margin, 22);
  text(ctx, `项目：${workspace.settings.projectName} · 孔位：${workspace.settings.pointName}`, canvas.width - margin, 42, 16, '#26343a', '700', 'right');
  const route = quickPlotRoute(workspace.rows, workspace.settings); const u2Count = workspace.rows.filter((row) => row.u2Kpa !== null && Number.isFinite(row.u2Kpa)).length;
  const routeLabel = route === 'full_cptu' ? `CPTU · u2 ${u2Count}/${workspace.rows.length} 行` : route === 'partial_cptu' ? `CPTU · u2 ${u2Count}/${workspace.rows.length} 行（局部）` : workspace.settings.u2Usage === 'raw_only' ? `CPT · u2 仅展示 ${u2Count}/${workspace.rows.length} 行` : 'CPT 近似（u2 不足）';
  text(ctx, `${routeLabel} · 页面 ${String(page).padStart(2, '0')}/15`, canvas.width - margin, 65, 13, '#67757b', '500', 'right');
  reportLine(ctx, margin, headerLineY, canvas.width - margin, headerLineY, 'axis');
  fitCenteredText(ctx, title, canvas.width / 2, headerLineY + 37, canvas.width - margin * 2 - 310, 27, '#111719', '700', 20);
  text(ctx, page === 15 ? '本次实际方法与来源' : `方法 ${methods.join(' · ')}`, canvas.width - margin, headerLineY + 61, 12, '#526168', '600', 'right');
  reportLine(ctx, margin, footerLineY, canvas.width - margin, footerLineY, 'grid');
  text(ctx, 'SIGS-OGLab · 快捷经验解译，需工程复核，不作为设计值直接采用', margin, canvas.height - 18, 12, '#68777d');
  text(ctx, String(page).padStart(2, '0'), canvas.width - margin, canvas.height - 18, 12, '#526168', '700', 'right');
  const bodyY = headerLineY + 82;
  return { x: margin, y: bodyY, width: canvas.width - margin * 2, height: footerLineY - bodyY - 20 };
}

function drawSigsReportMark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#18323b'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, 36, 36);
  const layers = [[QUICK_SOIL_COLORS.sand, 8, 5], [QUICK_SOIL_COLORS.silt, 17, -4], [QUICK_SOIL_COLORS.clay, 26, 4]] as const;
  layers.forEach(([color, offset, bend]) => { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 6, y + offset); ctx.lineTo(x + 18, y + offset + bend); ctx.lineTo(x + 30, y + offset); ctx.stroke(); });
  text(ctx, 'SIGS-OGLab', x + 47, y + 18, 17, '#18323b', '700');
  text(ctx, 'support', x + 47, y + 34, 10, '#60737b', '600');
}

const ROBERTSON_2016_COLORS: Record<Robertson2016Result['code'], string> = {
  CCS: '#6f4c3e', CC: '#9a7258', CD: '#b88a62', TC: '#9fd8ea', TD: '#6fb8c8', SC: '#e6be55', SD: '#f2d66b',
};
const REPORT_ROBERTSON_LABELS = Object.freeze({ CCS: '类黏土—收缩性—敏感', CC: '类黏土—收缩性', CD: '类黏土—剪胀性', TC: '过渡土—收缩性', TD: '过渡土—剪胀性', SC: '类砂土—收缩性', SD: '类砂土—剪胀性' });
const REPORT_SCHNEIDER_LABELS = Object.freeze({ '1a': '粉土及低刚度指数（Ir）黏土', '1b': '黏土', '1c': '敏感黏土', '2': '基本排水砂土', '3': '过渡土' });

function drawMeasuredPortraitPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickPlotRowV1[]) {
  const top = { x: box.x, y: box.y, width: box.width, height: box.height * 0.68 };
  drawMeasuredPage(ctx, top, rows);
  const bottom = { x: box.x + 58, y: box.y + box.height * 0.73, width: box.width - 116, height: box.height * 0.22 };
  panelTitle(ctx, bottom.x, bottom.y - 18, bottom.width, '锥尖阻力与侧壁摩阻力相关图');
  const points = rows.flatMap((row) => row.fsKpa === null ? [] : [{ x: row.qcMpa, y: row.fsKpa, color: depthColor(row.depthM, rows) }]);
  drawScatter(ctx, bottom, points, QUICK_REPORT_AXIS_LABELS.qc, QUICK_REPORT_AXIS_LABELS.fs, false, false);
  const depths = rows.map((row) => row.depthM); const minDepth = Math.min(...depths); const maxDepth = Math.max(...depths);
  const legendWidth = 180; const legendX = bottom.x + bottom.width / 2 - legendWidth / 2; const legendY = bottom.y + bottom.height + 62;
  const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0); gradient.addColorStop(0, depthColor(minDepth, rows)); gradient.addColorStop(1, depthColor(maxDepth, rows));
  ctx.fillStyle = gradient; ctx.fillRect(legendX, legendY, legendWidth, 9); reportFrame(ctx, { x: legendX, y: legendY, width: legendWidth, height: 9 });
  text(ctx, `${minDepth.toFixed(1)} m`, legendX - 8, legendY + 8, 10, '#526168', '500', 'right'); text(ctx, `${maxDepth.toFixed(1)} m`, legendX + legendWidth + 8, legendY + 8, 10, '#526168', '500'); text(ctx, '深度颜色', legendX + legendWidth / 2, legendY - 8, 10, '#526168', '600', 'center');
}

function drawNormalizedSbtPairPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const gap = 56; const half = (box.width - gap) / 2;
  panelTitle(ctx, box.x, box.y + 12, half, '归一化 SBTn（Robertson 1990）');
  drawRobertsonZoneChart(ctx, { x: box.x, y: box.y + 40, width: half, height: box.height - 170 }, rows, true);
  const pore = rows.filter((row) => row.bq !== null && row.robertsonQtn !== null);
  panelTitle(ctx, box.x + half + gap, box.y + 12, half, '归一化孔压响应');
  if (pore.length) drawBqClassificationChart(ctx, { x: box.x + half + gap, y: box.y + 40, width: half, height: box.height - 170 }, pore, true);
  else drawEmptyPanel(ctx, { x: box.x + half + gap, y: box.y + 40, width: half, height: box.height - 170 }, '缺少可靠 u2，本图未计算');
  drawSbtLegendGrid(ctx, box.x, box.y + box.height - 78, box.width);
}

function drawSchneider2008Page(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const valid = rows.filter((row) => row.schneider2008 && row.qtNormalized !== null && row.porePressureRatio !== null);
  const gap = 56; const half = (box.width - gap) / 2;
  panelTitle(ctx, box.x, box.y + 12, half, '归一化孔压—锥阻证据');
  panelTitle(ctx, box.x + half + gap, box.y + 12, half, 'Schneider 2008 分类分层');
  if (!valid.length) {
    drawEmptyPanel(ctx, { x: box.x, y: box.y + 42, width: half, height: box.height - 90 }, '缺少可靠 u2，Schneider 2008 未计算');
    drawEmptyPanel(ctx, { x: box.x + half + gap, y: box.y + 42, width: half, height: box.height - 90 }, '需要完整 CPTU 孔压数据');
    return;
  }
  const { minDepth, maxDepth } = reportDepthDomain(rows);
  const layers = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.schneider2008?.code ?? null, ['1a', '1b', '1c', '2', '3'] as const));
  drawSchneiderChart(ctx, { x: box.x, y: box.y + 42, width: half, height: box.height - 90 }, valid, false);
  drawCategoricalLayerTrack(ctx, { x: box.x + half + gap, y: box.y + 42, width: half, height: box.height - 145 }, layers, minDepth, maxDepth, (code) => REPORT_SCHNEIDER_COLORS[code], (code) => `${code} · ${REPORT_SCHNEIDER_LABELS[code]}`, { depthLabels: true, directLabels: true, labelMinM: 1.2 });
  drawMethodLegend(ctx, box.x + half + gap, box.y + box.height - 80, half, 'Schneider 2008 五类', ['1a', '1b', '1c', '2', '3'] as const, (code) => REPORT_SCHNEIDER_COLORS[code], (code) => `${code} · ${REPORT_SCHNEIDER_LABELS[code]}`);
}

function drawSchneiderChart(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[], logX: boolean) {
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.width, box.height);
  const xMin = logX ? .1 : -2, xMax = logX ? 100 : 10, qMin = 1, qMax = 1000;
  const mapX = (value: number) => box.x + ((logX ? Math.log10(value) : value) - (logX ? -1 : xMin)) / ((logX ? 2 : xMax) - (logX ? -1 : xMin)) * box.width;
  const mapY = (q: number) => box.y + box.height - Math.log10(q / qMin) / Math.log10(qMax / qMin) * box.height;
  (logX ? [.1, 1, 10, 100] : [-2, 0, 2, 4, 6, 8, 10]).forEach((tick) => { const x = mapX(tick); reportLine(ctx, x, box.y, x, box.y + box.height, 'light'); text(ctx, String(tick), x, box.y + box.height + 21, 12, '#59666b', '400', 'center'); });
  [1, 10, 100, 1000].forEach((tick) => { const y = mapY(tick); reportLine(ctx, box.x, y, box.x + box.width, y, 'grid'); text(ctx, tick === 1000 ? '1k' : String(tick), box.x - 8, y + 4, 12, '#59666b', '400', 'right'); });
  const qs = Array.from({ length: 140 }, (_, index) => 10 ** (index * 3 / 139));
  ([['lowIr', '#4e9bb0'], ['clay', '#ef572f'], ['sensitive', '#344f96']] as const).forEach(([key, color]) => { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.1; let open = false; qs.forEach((q) => { const boundary = schneider2008Boundaries(q)?.[key]; if (boundary === null || boundary === undefined || (logX && boundary <= 0) || boundary < xMin || boundary > xMax) { open = false; return; } const x = mapX(boundary), y = mapY(q); if (!open) { ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y); }); ctx.stroke(); });
  (['drainedLower', 'drainedUpper'] as const).forEach((key) => { ctx.beginPath(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2.1; let open = false; qs.forEach((q) => { const boundary = schneider2008Boundaries(q)?.[key]; if (boundary === null || boundary === undefined || (logX && boundary <= 0) || boundary < xMin || boundary > xMax) { open = false; return; } const px = mapX(boundary), py = mapY(q); if (!open) { ctx.moveTo(px, py); open = true; } else ctx.lineTo(px, py); }); ctx.stroke(); });
  const annotations: Array<[string, number, number]> = logX
    ? [['2 · 基本排水砂土', .22, 420], ['3 · 过渡土', 1.5, 110], ['1a · 粉土/低 Ir 黏土', 3.2, 38], ['1b · 黏土', 11, 17], ['1c · 敏感黏土', 30, 9]]
    : [['2 · 基本排水砂土', -.9, 420], ['3 · 过渡土', 2.4, 110], ['1a · 粉土/低 Ir 黏土', 3.2, 38], ['1b · 黏土', 6.7, 17], ['1c · 敏感黏土', 9, 9]];
  annotations.forEach(([label, px, q]) => text(ctx, label, mapX(px), mapY(q), 13, '#202426', '700', 'center'));
  rows.forEach((row) => { const xValue = row.porePressureRatio!; const q = row.qtNormalized!; if (q < qMin || q > qMax || xValue < xMin || xValue > xMax || (logX && xValue <= 0)) return; ctx.fillStyle = '#e31b17'; ctx.strokeStyle = '#111'; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(mapX(xValue), mapY(q), 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  reportFrame(ctx, box); text(ctx, '归一化超静孔压 Δu2/σ′v0 (-)', box.x + box.width / 2, box.y + box.height + 38, 15, '#27353b', '600', 'center'); ctx.save(); ctx.translate(box.x - 42, box.y + box.height / 2); ctx.rotate(-Math.PI / 2); text(ctx, '归一化净锥尖阻力 Q=qnet/σ′v0 (-)', 0, 0, 15, '#27353b', '600', 'center'); ctx.restore();
}

type ReportLayer<T extends string | number> = { top: number; bottom: number; category: T };

function reportDepthDomain(rows: Array<{ depthM: number }>) {
  const depths = rows.map((row) => row.depthM).filter(Number.isFinite);
  return { minDepth: Math.min(...depths, 0), maxDepth: Math.max(...depths, 1) };
}

function mergeCategorySamples<T extends string | number>(samples: Array<{ depth: number; category: T | null; breakBefore?: boolean }>) {
  const valid = samples.filter((sample) => sample.category !== null);
  if (!valid.length) return [] as ReportLayer<T>[];
  const steps = samples.slice(1).map((sample, index) => sample.depth - samples[index].depth).filter((value) => value > 0).sort((a, b) => a - b);
  const gap = Math.max(.10, (steps[Math.floor(steps.length / 2)] ?? .01) * 5);
  const layers: ReportLayer<T>[] = [];
  let start = -1;
  for (let index = 0; index <= samples.length; index += 1) {
    const current = samples[index]; const first = start < 0 ? null : samples[start];
    const closes = index === samples.length || current.category === null || current.breakBefore || (index > 0 && current.depth - samples[index - 1].depth > gap) || first?.category !== current.category;
    if (start >= 0 && closes) {
      const end = index - 1; const before = samples[start - 1]; const after = samples[end + 1];
      const top = before && !samples[start].breakBefore && samples[start].depth - before.depth <= gap ? (before.depth + samples[start].depth) / 2 : samples[start].depth;
      const bottom = after && !after.breakBefore && after.depth - samples[end].depth <= gap ? (samples[end].depth + after.depth) / 2 : samples[end].depth;
      if (bottom > top) layers.push({ top, bottom, category: samples[start].category as T });
      start = -1;
    }
    if (index < samples.length && current.category !== null && start < 0) start = index;
  }
  return layers;
}

function continuousSegments(rows: QuickDerived[]) {
  const segments: Array<{ start: number; end: number }> = []; let start = 0;
  rows.forEach((row, index) => { if (index > 0 && row.plotBreakBefore) { segments.push({ start, end: index }); start = index; } });
  if (rows.length) segments.push({ start, end: rows.length });
  return segments;
}

function majorWindowEvidence(rows: QuickDerived[], radius = .5) {
  const values = rows.map((row) => row.fuzzy ? [row.fuzzy.percent.clay, row.fuzzy.percent.mixed, row.fuzzy.percent.sand] as [number, number, number] : null);
  const prefix = [new Array(rows.length + 1).fill(0), new Array(rows.length + 1).fill(0), new Array(rows.length + 1).fill(0), new Array(rows.length + 1).fill(0)];
  rows.forEach((_, index) => { for (let group = 0; group < 3; group += 1) prefix[group][index + 1] = prefix[group][index] + (values[index]?.[group] ?? 0); prefix[3][index + 1] = prefix[3][index] + (values[index] ? 1 : 0); });
  const output = rows.map((row) => ({ depth: row.depthM, shares: [0, 0, 0] as [number, number, number], dominant: null as number | null, breakBefore: row.plotBreakBefore }));
  continuousSegments(rows).forEach((segment) => { let left = segment.start, right = segment.start; for (let index = segment.start; index < segment.end; index += 1) { const row = rows[index]; while (left < segment.end && rows[left].depthM < row.depthM - radius) left += 1; while (right < segment.end && rows[right].depthM <= row.depthM + radius) right += 1; const count = prefix[3][right] - prefix[3][left]; if (!count) continue; const shares = [0, 1, 2].map((group) => (prefix[group][right] - prefix[group][left]) / count) as [number, number, number]; output[index].shares = shares; output[index].dominant = shares.indexOf(Math.max(...shares)); } });
  return output;
}

function drawClassificationPortraitPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const { minDepth, maxDepth } = reportDepthDomain(rows); const samples = majorWindowEvidence(rows);
  const layers = mergeCategorySamples(samples.map((sample) => ({ depth: sample.depth, category: sample.dominant, breakBefore: sample.breakBefore })));
  const gap = 52; const leftWidth = (box.width - gap) * .46; const rightWidth = box.width - gap - leftWidth; const y = box.y + 52; const height = box.height - 150;
  const left = { x: box.x, y, width: leftWidth, height }; const right = { x: box.x + leftWidth + gap, y, width: rightWidth, height };
  panelTitle(ctx, left.x, box.y + 19, left.width, `Fuzzy 最高概率分类分层（${layers.length} 层）`);
  panelTitle(ctx, right.x, box.y + 19, right.width, 'Fuzzy 深度窗口土类组成');
  drawTrackFrame(ctx, left, '', '', minDepth, maxDepth, true); drawTrackFrame(ctx, right, '', '', minDepth, maxDepth, false);
  const colors = [QUICK_SOIL_COLORS.clay, QUICK_SOIL_COLORS.silt, QUICK_SOIL_COLORS.sand]; const labels = ['黏性土', '粉土', '砂性土'];
  layers.forEach((layer) => { const top = left.y + (layer.top - minDepth) / (maxDepth - minDepth) * left.height; const h = Math.max(1, (layer.bottom - layer.top) / (maxDepth - minDepth) * left.height); ctx.fillStyle = colors[layer.category]; ctx.fillRect(left.x, top, left.width, h); reportLine(ctx, left.x, top, left.x + left.width, top, 'light'); if (h >= 18) text(ctx, labels[layer.category], left.x + left.width / 2, top + h / 2 + 5, 12, '#243238', '700', 'center'); });
  samples.forEach((sample, index) => { if (!sample.shares.some(Boolean)) return; const range = depthCellRange(rows, index, minDepth, maxDepth); if (!range) return; const top = right.y + (range.from - minDepth) / (maxDepth - minDepth) * right.height; const h = Math.max(1, (range.to - range.from) / (maxDepth - minDepth) * right.height); let x = right.x; sample.shares.forEach((share, category) => { const width = right.width * share / 100; ctx.fillStyle = colors[category]; ctx.fillRect(x, top, width, h); x += width; }); });
  reportFrame(ctx, left); reportFrame(ctx, right);
  [0,25,50,75,100].forEach((value) => text(ctx, `${value}%`, right.x + right.width * value / 100, right.y + right.height + 22, 11, '#526168', '500', 'center'));
  drawSoilLegendHorizontal(ctx, box.x + box.width / 2 - 170, box.y + box.height - 46);
  drawPageNote(ctx, box, '左右两图均来自 Zhang–Tumay Fuzzy 概率；1.0 m 窗口只在连续数据段内汇总，相邻同类自动合并。');
}

function rollingZoneSamples(rows: QuickDerived[], radius = .5) {
  const prefixes = Array.from({ length: 10 }, () => new Array(rows.length + 1).fill(0));
  rows.forEach((row, index) => prefixes.forEach((values, zone) => { values[index + 1] = values[index] + (row.zone === zone ? 1 : 0); }));
  const output = rows.map((row) => ({ depth: row.depthM, category: null as number | null, breakBefore: row.plotBreakBefore, share: 0 }));
  continuousSegments(rows).forEach((segment) => { let left = segment.start, right = segment.start; for (let index = segment.start; index < segment.end; index += 1) { const row = rows[index]; while (left < segment.end && rows[left].depthM < row.depthM - radius) left += 1; while (right < segment.end && rows[right].depthM <= row.depthM + radius) right += 1; let zone: number | null = null, count = 0, total = 0; for (let candidate = 1; candidate <= 9; candidate += 1) { const current = prefixes[candidate][right] - prefixes[candidate][left]; total += current; if (current > count) { zone = candidate; count = current; } } output[index].category = zone; output[index].share = total ? count / total : 0; } });
  return output;
}

function rollingCategorySamples<T extends string | number>(rows: QuickDerived[], read: (row: QuickDerived) => T | null, categories: readonly T[], radius = .5) {
  const prefixes = categories.map(() => new Array(rows.length + 1).fill(0));
  rows.forEach((row, index) => prefixes.forEach((values, categoryIndex) => { values[index + 1] = values[index] + (read(row) === categories[categoryIndex] ? 1 : 0); }));
  const output = rows.map((row) => ({ depth: row.depthM, category: null as T | null, breakBefore: row.plotBreakBefore }));
  continuousSegments(rows).forEach((segment) => { let left = segment.start, right = segment.start; for (let rowIndex = segment.start; rowIndex < segment.end; rowIndex += 1) { const row = rows[rowIndex]; while (left < segment.end && rows[left].depthM < row.depthM - radius) left += 1; while (right < segment.end && rows[right].depthM <= row.depthM + radius) right += 1; let category: T | null = null, count = 0; categories.forEach((candidate, index) => { const current = prefixes[index][right] - prefixes[index][left]; if (current > count) { category = candidate; count = current; } }); output[rowIndex].category = category; } });
  return output;
}

type QuickPlotAssistantLayer = {
  layer: string;
  depthFromM: number;
  depthToM: number;
  category: string;
  label: string;
  confidencePercent?: number;
};

type QuickPlotAssistantStat = {
  field: string;
  label: string;
  unit: string;
  validCount: number;
  missingCount: number;
  minimum: number | null;
  maximum: number | null;
  median: number | null;
};

function assistantRound(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function assistantStatValue(value: number) {
  return value !== 0 && Math.abs(value) < 0.001
    ? Number(value.toPrecision(4))
    : assistantRound(value);
}

function assistantLayers<T extends string | number>(
  layers: ReportLayer<T>[],
  label: (category: T) => string,
  confidence?: (layer: ReportLayer<T>) => number | undefined,
): QuickPlotAssistantLayer[] {
  return layers.slice(0, 120).map((layer, index) => ({
    layer: `L${String(index + 1).padStart(3, '0')}`,
    depthFromM: assistantRound(layer.top),
    depthToM: assistantRound(layer.bottom),
    category: String(layer.category),
    label: label(layer.category),
    ...(confidence?.(layer) === undefined
      ? {}
      : { confidencePercent: assistantRound(confidence(layer) as number, 1) }),
  }));
}

function assistantStat(
  rows: QuickDerived[],
  field: string,
  label: string,
  unit: string,
  read: (row: QuickDerived) => number | null,
): QuickPlotAssistantStat {
  const values = rows.map(read).filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
  const median = values.length
    ? values.length % 2
      ? values[Math.floor(values.length / 2)]
      : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : null;
  return {
    field,
    label,
    unit,
    validCount: values.length,
    missingCount: Math.max(0, rows.length - values.length),
    minimum: values.length ? assistantStatValue(values[0]) : null,
    maximum: values.length ? assistantStatValue(values[values.length - 1]) : null,
    median: median === null ? null : assistantStatValue(median),
  };
}

/**
 * Returns bounded, read-only evidence from the exact derived rows and merging
 * helpers used to draw the atlas. The assistant never infers layers from pixels.
 */
export function quickPlotAssistantPageEvidence(workspace: QuickPlotWorkspaceV1, pageNumber: number) {
  const rows = deriveQuickPlotRows(workspace.rows, workspace.settings);
  const spec = QUICK_REPORT_PAGE_SPECS.find((candidate) => candidate.referencePage === pageNumber)
    ?? QUICK_REPORT_PAGE_SPECS[pageNumber - 1];
  const rawDepths = workspace.rows.map((row) => row.depthM).filter(Number.isFinite);
  const base = {
    generatedFromSameRowsAsAtlas: true,
    pageNumber,
    pageTitle: spec?.title ?? `第 ${pageNumber} 页`,
    validDerivedRows: rows.length,
    sourceRows: workspace.rows.length,
    depthFromM: rawDepths.length ? assistantRound(Math.min(...rawDepths)) : null,
    depthToM: rawDepths.length ? assistantRound(Math.max(...rawDepths)) : null,
    omittedDerivedRows: Math.max(0, workspace.rows.length - rows.length),
    omissionMeaning: '未进入解译的行可能缺少必要值、深度重复、qc/fs 非正或修正锥阻无效；图册不补值、不跨数据断点合并。',
  };
  if (!rows.length) return { ...base, available: false, reason: '没有可用于本页解译的有效测点。' };

  const jtsSamples = rollingZoneSamples(rows);
  const jts = mergeCategorySamples(jtsSamples);
  const jtsLayers = assistantLayers(jts, (zone) => {
    const soil = JTS_SOIL_CLASSES.find((item) => item.zone === Number(zone));
    return `Zone ${zone} · ${soil?.label ?? '未定义'}`;
  }, (layer) => {
    const matching = jtsSamples.filter((sample) => sample.depth >= layer.top && sample.depth <= layer.bottom && sample.category === layer.category);
    return matching.length ? matching.reduce((sum, sample) => sum + sample.share, 0) / matching.length * 100 : undefined;
  });
  const robertson = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.robertson2016?.code ?? null, ['CCS', 'CC', 'CD', 'TC', 'TD', 'SC', 'SD'] as const));
  const robertsonLayers = assistantLayers(robertson, (code) => `${code} · ${REPORT_ROBERTSON_LABELS[code]}`);
  const schneider = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.schneider2008?.code ?? null, ['1a', '1b', '1c', '2', '3'] as const));
  const schneiderLayers = assistantLayers(schneider, (code) => `${code} · ${REPORT_SCHNEIDER_LABELS[code]}`);
  const fuzzySamples = majorWindowEvidence(rows);
  const fuzzy = mergeCategorySamples(fuzzySamples.map((sample) => ({ depth: sample.depth, category: sample.dominant, breakBefore: sample.breakBefore })));
  const fuzzyLabels = ['黏土', '粉土/过渡土', '砂土'] as const;
  const fuzzyLayers = assistantLayers(fuzzy, (category) => fuzzyLabels[Number(category)] ?? '未分类', (layer) => {
    const matching = fuzzySamples.filter((sample) => sample.depth >= layer.top && sample.depth <= layer.bottom && sample.dominant === layer.category);
    return matching.length ? matching.reduce((sum, sample) => sum + sample.shares[Number(layer.category)], 0) / matching.length : undefined;
  });

  const statsByPage: Record<number, QuickPlotAssistantStat[]> = {
    1: [
      assistantStat(rows, 'qc', '锥尖阻力 qc', 'MPa', (row) => row.qcKpa / 1000),
      assistantStat(rows, 'fs', '侧壁摩阻力 fs', 'kPa', (row) => row.fsKpa),
      assistantStat(rows, 'u2', '孔隙水压力 u2', 'kPa', (row) => row.u2Kpa ?? null),
    ],
    2: [assistantStat(rows, 'robertson2010Index', '非归一化 SBT 指数', '-', (row) => row.robertson2010Index), assistantStat(rows, 'bq', '孔压参数 Bq', '-', (row) => row.bq)],
    3: [assistantStat(rows, 'robertsonQtn', '归一化锥尖阻力 Qtn', '-', (row) => row.robertsonQtn), assistantStat(rows, 'bq', '孔压参数 Bq', '-', (row) => row.bq)],
    4: [assistantStat(rows, 'schneiderQ', 'Schneider 归一化锥阻 Q', '-', (row) => row.schneider2008?.q ?? null), assistantStat(rows, 'schneiderExcessPorePressure', 'Schneider 归一化超静孔压', '-', (row) => row.schneider2008?.normalizedExcessPorePressure ?? null)],
    6: [assistantStat(rows, 'qt', '修正锥尖阻力 qt', 'MPa', (row) => row.qtKpa / 1000), assistantStat(rows, 'rf', '摩阻比 Rf', '%', (row) => row.rfPercent), assistantStat(rows, 'u2', '孔隙水压力 u2', 'kPa', (row) => row.u2Kpa ?? null), assistantStat(rows, 'ic', 'JTS 土体行为类型指数 Ic', '-', (row) => row.ic)],
    7: [assistantStat(rows, 'qtn', '归一化锥尖阻力 Qtn', '-', (row) => row.robertsonQtn), assistantStat(rows, 'fr', '归一化摩阻比 Fr', '%', (row) => row.frPercent), assistantStat(rows, 'bq', '孔压参数 Bq', '-', (row) => row.bq), assistantStat(rows, 'robertsonIc', 'Robertson Ic', '-', (row) => row.robertsonIc), assistantStat(rows, 'jtsIc', 'JTS Ic', '-', (row) => row.ic)],
    8: [assistantStat(rows, 'qtn', '归一化锥尖阻力 Qtn', '-', (row) => row.robertsonQtn), assistantStat(rows, 'fr', '归一化摩阻比 Fr', '%', (row) => row.frPercent), assistantStat(rows, 'ib', '修正土体行为类型指数 IB', '-', (row) => row.robertson2016?.ib ?? null), assistantStat(rows, 'cd', '收缩–剪胀参数 CD', '-', (row) => row.robertson2016?.cd ?? null)],
    9: [assistantStat(rows, 'g0', '小应变剪切模量 G0', 'MPa', (row) => row.g0Mpa), assistantStat(rows, 'k0', '静止土压力系数 K0', '-', (row) => row.k0)],
    10: [assistantStat(rows, 'permeability', '渗透系数 k', 'm/s', (row) => row.major === 'sand' ? row.permeability : null), assistantStat(rows, 'sptN', '标准贯入击数 N', '击/0.30 m', (row) => row.sptN), assistantStat(rows, 'es', '压缩模量 Es（R05）', 'MPa', (row) => row.major === 'sand' ? row.esMpa : null), assistantStat(rows, 'dr', '相对密实度 Dr', '%', (row) => row.major === 'sand' ? row.drPercent : null), assistantStat(rows, 'phi', '有效摩擦角 φ′', '°', (row) => row.major === 'sand' ? row.phiDeg : null)],
    11: [assistantStat(rows, 'jtsEs', '压缩模量 Es（JTS）', 'MPa', (row) => row.major === 'clay' ? row.jtsCompressionModulusMpa : null), assistantStat(rows, 'g0', '小应变剪切模量 G0', 'MPa', (row) => row.major === 'clay' ? row.g0Mpa : null), assistantStat(rows, 'su', '不排水强度 Su', 'kPa', (row) => row.major === 'clay' ? row.suKpa : null), assistantStat(rows, 'suRatio', '归一化不排水强度', '-', (row) => row.major === 'clay' ? row.suRatio : null), assistantStat(rows, 'ocr', '超固结比 OCR', '-', (row) => row.major === 'clay' ? row.ocr : null)],
    12: [assistantStat(rows, 'vs', '剪切波速 Vs', 'm/s', (row) => row.vsMps), assistantStat(rows, 'stateParameter', '状态参数 ψ', '-', (row) => row.stateParameter), assistantStat(rows, 'k0', '静止土压力系数 K0', '-', (row) => row.k0), assistantStat(rows, 'sensitivity', '灵敏度 St', '-', (row) => row.sensitivity), assistantStat(rows, 'phi', '有效摩擦角 φ′', '°', (row) => row.major !== 'clay' ? row.phiDeg : null)],
    13: [assistantStat(rows, 'gammaSat', '饱和重度 γsat', 'kN/m³', (row) => row.gammaSatKnM3), assistantStat(rows, 'waterContent', '含水率 w', '%', (row) => row.waterContentPercent), assistantStat(rows, 'voidRatio', '孔隙比 e', '-', (row) => row.voidRatio), assistantStat(rows, 'dryUnitWeight', '干重度 γd', 'kN/m³', (row) => row.dryUnitWeight), assistantStat(rows, 'porosity', '孔隙率 n', '-', (row) => row.porosity)],
    14: [assistantStat(rows, 'qt', '修正锥尖阻力 qt', 'MPa', (row) => row.qtKpa / 1000), assistantStat(rows, 'qtn', '归一化锥尖阻力 Qtn', '-', (row) => row.robertsonQtn), assistantStat(rows, 'ic', '土体行为类型指数 Ic', '-', (row) => row.robertsonIc), assistantStat(rows, 'qtnCs', '等效洁净砂 Qtn,cs', '-', (row) => row.qtnCs), assistantStat(rows, 'residualStrengthRatio', '残余不排水强度比', '-', (row) => row.residualStrengthRatio)],
  };
  const pageStats = statsByPage[pageNumber] ?? [];
  if (pageNumber === 10 || pageNumber === 11) {
    const audit = quickPlotFormulaAudit(workspace.settings, rows);
    const sandPage = pageNumber === 10;
    const groupTitles = sandPage
      ? new Set(['渗透系数 k (m/s)', '标准贯入击数 N', '压缩模量 Es（R05）(MPa)', '相对密实度 Dr (%)', '有效内摩擦角 φ′ (°)'])
      : new Set(['压缩模量 Es（JTS 7.2.8）(MPa)', '剪切波速与小应变模量', '不排水强度与归一化强度', '超固结比与静止土压力']);
    return {
      ...base,
      available: true,
      statistics: pageStats,
      classificationBasis: QUICK_PARAMETER_CLASSIFICATION_BASIS,
      applicableJtsLayers: jtsLayers.filter((layer) => {
        const zone = Number(layer.category);
        return sandPage ? zone >= 7 && zone <= 9 : zone >= 1 && zone <= 5;
      }),
      parameterGroups: audit.groups.filter((group) => groupTitles.has(group.title)),
      references: QUICK_PLOT_REFERENCES.filter(([id]) => (
        sandPage ? ['R03', 'R05', 'R06'].includes(id) : ['R06', 'A02'].includes(id)
      )),
      unavailableMeaning: '参数只在对应 JTS 土类和公式适用条件内生成；其他深度留空，不补零、不跨段连线。',
    };
  }
  if (pageNumber === 2) return {
    ...base,
    available: true,
    method: 'Robertson 2010 非归一化 SBT 与孔压参数 Bq',
    definitions: {
      sbt: { inputs: ['qc', 'fs'], normalizedTip: 'qc / pa', frictionRatio: 'Rf = fs / qc × 100%', doesNotUse: ['u2'] },
      bq: { inputs: ['u2', 'u0', 'qt', 'σv0'], formula: 'Bq = (u2 - u0) / (qt - σv0)' },
    },
    statistics: pageStats,
  };
  if (pageNumber === 4) return { ...base, available: schneiderLayers.length > 0, method: 'Schneider 2008', inputs: ['Q = (qt - σv0) / σ′v0', 'Δu2 / σ′v0 = (u2 - u0) / σ′v0'], layers: schneiderLayers, statistics: pageStats, unavailableReason: schneiderLayers.length ? null : '缺少可靠 u2 或归一化孔压证据，无法形成 Schneider 分类层。' };
  if (pageNumber === 5) return { ...base, available: fuzzyLayers.length > 0, method: 'Zhang–Tumay Fuzzy（1.0 m 连续深度窗口最高概率）', inputs: ['qc（MPa）', 'Rf = fs / qc × 100%'], outputClasses: ['黏土', '粉土/过渡土', '砂土'], layers: fuzzyLayers, windowRadiusM: 0.5, unavailableReason: fuzzyLayers.length ? null : '没有形成有效 Fuzzy 概率层。' };
  if (pageNumber === 6) return { ...base, available: jtsLayers.length > 0, method: 'JTS/T 242—2020（1.0 m 深度窗口最高占比 Zone）', inputs: ['JTS 土体行为类型指数 Ic', '净锥尖阻力 qnet'], zoneSystem: 'JTS/T 242—2020 Zone 1–9；本孔仅显示实际命中的 Zone', layers: jtsLayers, statistics: pageStats };
  if (pageNumber === 8) return { ...base, available: robertsonLayers.length > 0, method: 'Modified Robertson 2016', layers: robertsonLayers, statistics: pageStats, unavailableReason: robertsonLayers.length ? null : '缺少有效应力或归一化分类证据。' };
  if (pageNumber === 9) return { ...base, available: true, classificationComparison: { jts: jtsLayers, robertson2016: robertsonLayers, schneider2008: schneiderLayers }, statistics: pageStats };
  if (pageNumber === 15 || pageNumber === 16) {
    const audit = quickPlotFormulaAudit(workspace.settings, rows);
    return { ...base, available: true, parameterClassificationBasis: QUICK_PARAMETER_CLASSIFICATION_BASIS, comparisonRole: QUICK_PARAMETER_COMPARISON_ROLE, settings: workspace.settings, formulaGroups: audit.groups, references: QUICK_PLOT_REFERENCES };
  }
  return {
    ...base,
    available: true,
    statistics: pageStats,
    classificationCounts: {
      jts: Object.fromEntries([...new Set(rows.flatMap((row) => row.zone === null ? [] : [row.zone]))].map((zone) => [String(zone), rows.filter((row) => row.zone === zone).length])),
      robertson2010: Object.fromEntries([...new Set(rows.flatMap((row) => row.robertson2010Zone === null ? [] : [row.robertson2010Zone]))].map((zone) => [String(zone), rows.filter((row) => row.robertson2010Zone === zone).length])),
    },
  };
}

function drawCategoricalLayerTrack<T extends string | number>(ctx: CanvasRenderingContext2D, box: PlotBox, layers: ReportLayer<T>[], minDepth: number, maxDepth: number, color: (category: T) => string, label: (category: T) => string, options: { depthLabels?: boolean; directLabels?: boolean; labelMinM?: number } = {}) {
  drawTrackFrame(ctx, box, '', '', minDepth, maxDepth, Boolean(options.depthLabels));
  layers.forEach((layer, index) => {
    const y = box.y + (layer.top - minDepth) / (maxDepth - minDepth) * box.height; const h = Math.max(1, (layer.bottom - layer.top) / (maxDepth - minDepth) * box.height);
    const fill = color(layer.category); ctx.fillStyle = fill; ctx.fillRect(box.x, y, box.width, h); reportLine(ctx, box.x, y, box.x + box.width, y, 'light');
    if (options.directLabels && layer.bottom - layer.top >= (options.labelMinM ?? 1.4)) fitCenteredText(ctx, `L${String(index + 1).padStart(3, '0')} · ${label(layer.category)}`, box.x + box.width / 2, y + Math.min(h - 4, Math.max(13, h / 2 + 4)), box.width - 12, 11, contrastText(fill), '700', 8);
  });
  reportFrame(ctx, box);
}

function contrastText(hex: string) { const value = hex.replace('#', ''); const r = parseInt(value.slice(0, 2), 16), g = parseInt(value.slice(2, 4), 16), b = parseInt(value.slice(4, 6), 16); return (r * 299 + g * 587 + b * 114) / 1000 < 138 ? '#fff' : '#17232b'; }

function drawJtsLayerBarTrack(ctx: CanvasRenderingContext2D, box: PlotBox, layers: ReportLayer<number>[], samples: ReturnType<typeof rollingZoneSamples>, minDepth: number, maxDepth: number) {
  const plotWidth = box.width * .66; const plot = { x: box.x, y: box.y, width: plotWidth, height: box.height };
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.width, box.height);
  for (let zone = 0; zone <= 9; zone += 1) { const x = plot.x + plot.width * zone / 9; reportLine(ctx, x, plot.y, x, plot.y + plot.height, zone === 0 || zone === 9 ? 'axis' : 'grid'); text(ctx, String(zone), x, plot.y + plot.height + 21, 11, '#526168', '500', 'center'); }
  layers.forEach((layer, index) => {
    const top = plot.y + (layer.top - minDepth) / (maxDepth - minDepth) * plot.height; const bottom = plot.y + (layer.bottom - minDepth) / (maxDepth - minDepth) * plot.height; const h = Math.max(2, bottom - top);
    ctx.fillStyle = QUICK_REPORT_ZONE_COLORS[layer.category]; ctx.fillRect(plot.x, top + .5, plot.width * layer.category / 9, Math.max(1, h - 1));
    reportLine(ctx, plot.x, top, box.x + box.width, top, 'light');
    const evidence = samples.filter((sample) => sample.depth >= layer.top && sample.depth <= layer.bottom && sample.category === layer.category); const confidence = evidence.length ? Math.round(evidence.reduce((sum, sample) => sum + sample.share, 0) / evidence.length * 100) : 0;
    const soil = JTS_SOIL_CLASSES.find((item) => item.zone === layer.category)?.label ?? `Zone ${layer.category}`;
    if (h >= 10) { const labelY = top + Math.min(h - 2, Math.max(10, h / 2 + 4)); reportLine(ctx, plot.x + plot.width, labelY - 4, box.x + box.width * .70, labelY - 4, 'grid'); fitLeftText(ctx, `L${String(index + 1).padStart(3, '0')}  ${soil}  ${confidence}%`, box.x + box.width * .71, labelY, box.width * .28, 10, '#17232b', '600', 8); }
  });
  reportFrame(ctx, plot); reportFrame(ctx, box);
  fitCenteredText(ctx, 'JTS 土体行为类型分区（Zone）', plot.x + plot.width / 2, plot.y + plot.height + 40, plot.width, 12, '#26343a', '600', 10);
}

function drawReferenceLayerPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const { minDepth, maxDepth } = reportDepthDomain(rows); const gap = 20; const weights = [1, 1, 1, 1.05, 1.55]; const total = weights.reduce((sum, value) => sum + value, 0); const usable = box.width - gap * 4;
  const widths = weights.map((weight) => usable * weight / total); const tracks: PlotBox[] = []; let x = box.x;
  widths.forEach((width) => { tracks.push({ x, y: box.y + 48, width, height: box.height - 138 }); x += width + gap; });
  const trackSpecs: Array<[string, string, string, (row: QuickDerived) => number | null, [number, number]?]> = [
    ['修正锥尖阻力 qt', 'MPa', QUICK_CURVE_COLORS.qc, (row) => row.qtKpa / 1000, [0, 45]],
    ['摩阻比 Rf', '%', QUICK_CURVE_COLORS.fs, (row) => row.rfPercent, [0, 50]],
    ['孔隙水压力 u2', 'kPa', QUICK_CURVE_COLORS.u2, (row) => row.u2Kpa ?? null, [-1000, 3500]],
  ];
  trackSpecs.forEach(([label, unit, color, read, fixed], index) => { const track = tracks[index]; drawTrackFrame(ctx, track, label, unit, minDepth, maxDepth, index === 0); const values = rows.map(read).filter((value): value is number => value !== null && Number.isFinite(value)); if (!values.length) { drawEmptyPanel(ctx, track, `无${label}有效值`); return; } const range = fixed ? { min: fixed[0], max: fixed[1] } : quickRobustDisplayRange(values); drawDepthLine(ctx, track, rows, read, range.min, range.max, minDepth, maxDepth, color); });
  const icTrack = tracks[3]; drawTrackFrame(ctx, icTrack, '土体行为类型指数 Ic', '-', minDepth, maxDepth, false);
  const thresholds = [1, 1.47, 1.87, 2.32, 2.60, 2.90, 4.20]; const bandZones = [9, 8, 7, 6, 5, 4];
  thresholds.slice(0, -1).forEach((from, index) => { const to = thresholds[index + 1]; const left = icTrack.x + (from - 1) / 3.2 * icTrack.width; const right = icTrack.x + (to - 1) / 3.2 * icTrack.width; ctx.fillStyle = QUICK_REPORT_ZONE_COLORS[bandZones[index]]; ctx.globalAlpha = .70; ctx.fillRect(left, icTrack.y, right - left, icTrack.height); }); ctx.globalAlpha = 1;
  drawDepthLine(ctx, icTrack, rows, (row) => row.ic, 1, 4.2, minDepth, maxDepth, QUICK_CURVE_COLORS.ic); reportFrame(ctx, icTrack);
  const zoneSamples = rollingZoneSamples(rows); const zoneLayers = mergeCategorySamples(zoneSamples);
  const zoneTrack = tracks[4]; panelTitle(ctx, zoneTrack.x, box.y + 18, zoneTrack.width, '归一化土体行为类型');
  drawJtsLayerBarTrack(ctx, zoneTrack, zoneLayers, zoneSamples, minDepth, maxDepth);
  drawSbtLegendGrid(ctx, box.x, box.y + box.height - 72, box.width);
  drawPageNote(ctx, box, '分类层由 1.0 m 深度窗口的最高占比 Zone 生成；相邻同类自动合并，原始曲线未修改。');
}

function drawRobertson2016DepthPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const { minDepth, maxDepth } = reportDepthDomain(rows); const gap = 24; const width = (box.width - gap * 4) / 5; const y = box.y + 48; const height = box.height - 145;
  const panel = (index: number): PlotBox => ({ x: box.x + index * (width + gap), y, width, height });
  const tracks: Array<[string, string, string, (row: QuickDerived) => number | null, [number, number]]> = [
    ['归一化锥尖阻力 Qtn', '-', '#68768a', (row) => row.robertsonQtn, [0, 400]],
    ['归一化摩阻比 Fr', '%', QUICK_CURVE_COLORS.fs, (row) => row.frPercent, [0, 20]],
    ['修正土体行为类型指数 IB', '-', '#C2A35F', (row) => row.robertson2016?.ib ?? null, [0, 200]],
    ['收缩–剪胀参数 CD', '-', '#C8733F', (row) => row.robertson2016?.cd ?? null, [-100, 100]],
  ];
  tracks.forEach(([label, unit, color, read, range], index) => { const target = panel(index); drawTrackFrame(ctx, target, label, unit, minDepth, maxDepth, index === 0); drawDepthLine(ctx, target, rows, read, range[0], range[1], minDepth, maxDepth, color); text(ctx, formatAxis(range[0]), target.x + 4, target.y + target.height + 22, 11, '#65747b'); text(ctx, formatAxis(range[1]), target.x + target.width - 4, target.y + target.height + 22, 11, '#65747b', '400', 'right'); });
  const layers = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.robertson2016?.code ?? null, ['CCS', 'CC', 'CD', 'TC', 'TD', 'SC', 'SD'] as const));
  panelTitle(ctx, panel(4).x, box.y + 18, width, 'Modified Robertson 2016 七类分层');
  drawCategoricalLayerTrack(ctx, panel(4), layers, minDepth, maxDepth, (code) => REPORT_ROBERTSON_COLORS[code], (code) => `${code} · ${REPORT_ROBERTSON_LABELS[code]}`, { depthLabels: false, directLabels: true, labelMinM: 1.2 });
  drawRobertson2016Legend(ctx, box.x, box.y + box.height - 72, box.width);
}

function drawRobertson2016Legend(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const entries = Object.entries(ROBERTSON_2016_CLASSES) as Array<[Robertson2016Result['code'], { label: string; color: string }]>;
  const itemWidth = width / 4;
  entries.forEach(([code], index) => { const left = x + (index % 4) * itemWidth; const top = y + Math.floor(index / 4) * 20; ctx.fillStyle = ROBERTSON_2016_COLORS[code]; ctx.fillRect(left, top, 12, 12); fitLeftText(ctx, `${code} · ${REPORT_ROBERTSON_LABELS[code]}`, left + 18, top + 11, itemWidth - 20, 11, '#263239', '700', 8); });
}

const REPORT_PARAMETER_COLORS = ['#536789', '#4D9B91', '#C2A35F', '#C8733F', '#7C668A'] as const;
const REPORT_ROBERTSON_COLORS = Object.freeze({ CCS: QUICK_REPORT_ZONE_COLORS[2], CC: QUICK_REPORT_ZONE_COLORS[3], CD: QUICK_REPORT_ZONE_COLORS[4], TC: QUICK_REPORT_ZONE_COLORS[5], TD: QUICK_REPORT_ZONE_COLORS[6], SC: QUICK_REPORT_ZONE_COLORS[7], SD: QUICK_REPORT_ZONE_COLORS[8] });
const REPORT_SCHNEIDER_COLORS = Object.freeze({ '1a': REPORT_PARAMETER_COLORS[0], '1b': REPORT_PARAMETER_COLORS[1], '1c': REPORT_PARAMETER_COLORS[2], '2': REPORT_PARAMETER_COLORS[3], '3': REPORT_PARAMETER_COLORS[4] });

function drawMethodLegend<T extends string | number>(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, title: string, categories: T[], color: (category: T) => string, label: (category: T) => string, columns = 1) {
  fitLeftText(ctx, title, x, y, width, 11, '#26343a', '700', 9);
  const safeColumns = Math.max(1, columns); const rowsPerColumn = Math.ceil(categories.length / safeColumns); const columnWidth = width / safeColumns;
  categories.forEach((category, index) => { const column = Math.floor(index / rowsPerColumn); const row = index % rowsPerColumn; const left = x + column * columnWidth; const top = y + 16 + row * 15; ctx.fillStyle = color(category); ctx.fillRect(left, top, 10, 10); fitLeftText(ctx, label(category), left + 15, top + 9, columnWidth - 17, 9, '#33464e', '500', 7); });
}

function drawClassificationLayerComparisonPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const { minDepth, maxDepth } = reportDepthDomain(rows); const gap = 28; const width = (box.width - gap * 4) / 5; const panelY = box.y + 50; const panelHeight = box.height - 190;
  const panel = (index: number): PlotBox => ({ x: box.x + index * (width + gap), y: panelY, width, height: panelHeight });
  const jtsLayers = mergeCategorySamples(rollingZoneSamples(rows));
  const robertsonLayers = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.robertson2016?.code ?? null, ['CCS', 'CC', 'CD', 'TC', 'TD', 'SC', 'SD'] as const));
  const schneiderLayers = mergeCategorySamples(rollingCategorySamples(rows, (row) => row.schneider2008?.code ?? null, ['1a', '1b', '1c', '2', '3'] as const));
  panelTitle(ctx, panel(0).x, box.y + 18, width, 'JTS/T 242—2020 九区分层');
  panelTitle(ctx, panel(1).x, box.y + 18, width, 'Modified Robertson 2016 七类分层');
  panelTitle(ctx, panel(2).x, box.y + 18, width, 'Schneider 2008 五类分层');
  panelTitle(ctx, panel(3).x, box.y + 18, width, '小应变剪切模量 G0 (MPa)');
  panelTitle(ctx, panel(4).x, box.y + 18, width, '静止土压力系数 K0 (-)');
  const jtsName = (zone: number) => `Z${zone} · ${JTS_SOIL_CLASSES.find((soil) => soil.zone === zone)?.label ?? '未定义'}`;
  drawCategoricalLayerTrack(ctx, panel(0), jtsLayers, minDepth, maxDepth, (zone) => QUICK_REPORT_ZONE_COLORS[Number(zone)], (zone) => jtsName(Number(zone)), { depthLabels: true, directLabels: true, labelMinM: 1.4 });
  drawCategoricalLayerTrack(ctx, panel(1), robertsonLayers, minDepth, maxDepth, (code) => REPORT_ROBERTSON_COLORS[code as keyof typeof REPORT_ROBERTSON_COLORS], (code) => `${code} · ${REPORT_ROBERTSON_LABELS[code as keyof typeof REPORT_ROBERTSON_LABELS]}`, { directLabels: true, labelMinM: 1.4 });
  drawCategoricalLayerTrack(ctx, panel(2), schneiderLayers, minDepth, maxDepth, (code) => REPORT_SCHNEIDER_COLORS[code as keyof typeof REPORT_SCHNEIDER_COLORS], (code) => `${code} · ${REPORT_SCHNEIDER_LABELS[code as keyof typeof REPORT_SCHNEIDER_LABELS]}`, { directLabels: true, labelMinM: 1.4 });
  const drawParameter = (target: PlotBox, read: (row: QuickDerived) => number | null, color: string) => { drawTrackFrame(ctx, target, '', '', minDepth, maxDepth, false); const values = rows.map(read).filter((value): value is number => value !== null && Number.isFinite(value)); if (!values.length) return; const range = quickRobustDisplayRange(values); drawDepthLine(ctx, target, rows, read, range.min, range.max, minDepth, maxDepth, color); text(ctx, formatAxis(range.min), target.x, target.y + target.height + 20, 10, '#65747b'); text(ctx, formatAxis(range.max), target.x + target.width, target.y + target.height + 20, 10, '#65747b', '400', 'right'); };
  drawParameter(panel(3), (row) => row.g0Mpa, REPORT_PARAMETER_COLORS[0]); drawParameter(panel(4), (row) => row.k0, REPORT_PARAMETER_COLORS[1]);
  const legendY = box.y + box.height - 125;
  drawMethodLegend(ctx, panel(0).x, legendY, width, 'JTS/T 242—2020', [...new Set(jtsLayers.map((layer) => Number(layer.category)))], (zone) => QUICK_REPORT_ZONE_COLORS[Number(zone)], (zone) => jtsName(Number(zone)), 2);
  drawMethodLegend(ctx, panel(1).x, legendY, width, 'Modified Robertson 2016', [...new Set(robertsonLayers.map((layer) => String(layer.category)))], (code) => REPORT_ROBERTSON_COLORS[code as keyof typeof REPORT_ROBERTSON_COLORS], (code) => `${code} · ${REPORT_ROBERTSON_LABELS[code as keyof typeof REPORT_ROBERTSON_LABELS]}`, 2);
  drawMethodLegend(ctx, panel(2).x, legendY, width, 'Schneider 2008', [...new Set(schneiderLayers.map((layer) => String(layer.category)))], (code) => REPORT_SCHNEIDER_COLORS[code as keyof typeof REPORT_SCHNEIDER_COLORS], (code) => `${code} · ${REPORT_SCHNEIDER_LABELS[code as keyof typeof REPORT_SCHNEIDER_LABELS]}`);
}

function drawCorrectedIndexPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  drawDepthTracks(ctx, box, rows, [
    ['修正锥尖阻力 qt', 'MPa', QUICK_CURVE_COLORS.qc, (row) => row.qtKpa / 1000], ['归一化锥尖阻力 Qtn', '-', '#68768a', (row) => row.robertsonQtn],
    ['土体行为类型指数 Ic', '-', QUICK_CURVE_COLORS.ic, (row) => row.robertsonIc], ['等效洁净砂归一化锥尖阻力 Qtn,cs', '-', '#a07443', (row) => row.qtnCs],
    ['残余不排水强度比 Su(r)/σ′v0', '-', QUICK_SOIL_COLORS.clay, (row) => row.residualStrengthRatio],
  ]);
}

function drawClayParameterPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const tracks: Track[] = [
    ['压缩模量 Es（JTS）', 'MPa', '#68768a', (r) => r.major === 'clay' ? r.jtsCompressionModulusMpa : null],
    ['小应变剪切模量 G0', 'MPa', '#7c62a8', (r) => r.major === 'clay' ? r.g0Mpa : null],
    ['不排水强度 Su', 'kPa', QUICK_SOIL_COLORS.clay, (r) => r.major === 'clay' ? r.suKpa : null],
    ['归一化不排水抗剪强度 Su/σ′v0', '-', '#ab6a54', (r) => r.major === 'clay' ? r.suRatio : null],
    ['超固结比 OCR', '-', '#4f789c', (r) => r.major === 'clay' ? r.ocr : null],
  ];
  const plotBox = { ...box, height: box.height - 12 };
  drawDepthTracks(ctx, plotBox, rows, tracks);
  const depthValues = rows.map((row) => row.depthM); const minDepth = Math.min(...depthValues, 0); const maxDepth = Math.max(...depthValues, 1);
  const gap = 24; const width = (plotBox.width - gap * 4) / 5; const suBox = { x: plotBox.x + 2 * (width + gap), y: plotBox.y + 48, width, height: plotBox.height - 82 };
  const peak = rows.flatMap((row) => row.suKpa === null ? [] : [row.suKpa]); if (peak.length) { const range = quickRobustDisplayRange(peak, [0, 1]); drawDepthLine(ctx, suBox, rows, (row) => row.suRemoldedKpa, range.min, range.max, minDepth, maxDepth, '#2f6fb0'); text(ctx, '棕：峰值 · 蓝：重塑后', suBox.x + suBox.width / 2, suBox.y + 18, 12, '#33464e', '600', 'center'); }
  drawParameterBasisNote(ctx, box, 'Su(r)=Su/St；空白=不适用/无有效值/数据断点；未补零、未跨段连线。');
}

function drawMeasuredPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickPlotRowV1[]) {
  drawDepthTracks(ctx, box, rows, [
    ['锥尖阻力 qc', 'MPa', QUICK_CURVE_COLORS.qc, (r) => r.qcMpa],
    ['侧壁摩阻力（套筒摩阻力） fs', 'kPa', QUICK_CURVE_COLORS.fs, (r) => r.fsKpa],
    ['孔隙水压力 u2', 'kPa', QUICK_CURVE_COLORS.u2, (r) => r.u2Kpa],
  ]);
}

function drawSbtAndBqPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  const gap = 56; const half = (box.width - gap) / 2;
  drawRobertsonZoneChart(ctx, { x: box.x, y: box.y + 34, width: half, height: box.height - 164 }, rows, false);
  const poreRows = rows.filter((row) => row.bq !== null && row.qtKpa > 0);
  if (poreRows.length) drawBqClassificationChart(ctx, { x: box.x + half + gap, y: box.y + 34, width: half, height: box.height - 164 }, poreRows, false);
  else drawEmptyPanel(ctx, { x: box.x + half + gap, y: box.y + 34, width: half, height: box.height - 164 }, '无 u2，本图不生成');
  panelTitle(ctx, box.x, box.y + 12, half, '土体行为类型分类图 SBT'); panelTitle(ctx, box.x + half + gap, box.y + 12, half, '孔压参数 Bq 响应参考图');
  drawSbtLegendGrid(ctx, box.x, box.y + box.height - 78, box.width);
}

function drawNormalizedDepthPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[]) {
  drawDepthTracks(ctx, box, rows, [
    ['归一化锥尖阻力 Qtn', '-', '#6b7482', (r) => r.robertsonQtn, { xRange: [0, 400] }], ['归一化摩阻比 Fr', '%', QUICK_CURVE_COLORS.fs, (r) => r.frPercent, { xRange: [0, 10] }], ['孔压参数 Bq', '-', QUICK_CURVE_COLORS.u2, (r) => r.bq, { xRange: [-0.2, 1] }], ['土体行为类型指数 Ic', '-', QUICK_CURVE_COLORS.ic, (r) => r.robertsonIc, { xRange: [1, 4], colorByRow: (r) => r.robertsonSbtnZone ? QUICK_REPORT_ZONE_COLORS[r.robertsonSbtnZone] : QUICK_SOIL_COLORS.unknown }],
    ['JTS 土体行为类型指数 Ic', '-', '#A76A3A', (r) => r.ic, { xRange: [1, 4.2] }],
  ]);
  drawPageNote(ctx, box, 'Robertson Ic 与 JTS Ic 分列显示；空白表示当前方法无有效值或存在真实数据断点。');
}

function drawParameterDepthPage(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[], tracks: Track[]) {
  drawDepthTracks(ctx, { ...box, height: box.height - 12 }, rows, tracks);
  drawParameterBasisNote(ctx, box, '空白=不适用/无有效值/数据断点；未补零、未跨段连线。');
}

export function quickPlotFormulaAudit(_settings: QuickPlotSettingsV1, rows: QuickDerived[]) {
  const count = (...readers: Array<(row: QuickDerived) => number | null>) => Math.max(...readers.map((read) => rows.filter((row) => { const value = read(row); return value !== null && Number.isFinite(value); }).length), 0);
  const hasPoreCorrectedRows = rows.some((row) => row.route === 'full_cptu');
  const hasApproximateRows = rows.some((row) => row.route === 'approximate_cpt');
  const qtFormulas = hasPoreCorrectedRows
    ? [`qt(kPa) = qc(kPa) + u2(kPa)(1-a)${hasApproximateRows ? '（有 u2 行）' : ''}  [R06]`, ...(hasApproximateRows ? ['缺失 u2 行：qt(kPa) = qc(kPa)  [A02]'] : [])]
    : ['本次未使用 u2：qt(kPa) = qc(kPa)  [A02]'];
  const basicApplicability = hasPoreCorrectedRows
    ? hasApproximateRows ? '全部有效 qc、fs 行；有 u2 行修正，缺失行 qt=qc' : '全部有效 qc、fs、u2 行；逐行进行孔压修正'
    : '全部有效 qc、fs 行；本次未使用 u2，qt=qc';
  const vsCount = count((row) => row.vsMps), g0Count = count((row) => row.g0Mpa), suCount = count((row) => row.suKpa), residualCount = count((row) => row.residualStrengthRatio);
  const ocrCount = count((row) => row.ocr), k0Count = count((row) => row.k0), cleanSandCount = count((row) => row.qtnCs), stateCount = count((row) => row.stateParameter);
  const robertsonCount = count((row) => row.robertsonQtn), robertson2016Count = count((row) => row.robertson2016?.ib ?? null), schneiderCount = count((row) => row.schneider2008?.q ?? null);
  const specs: Array<[string, number, string, string[]]> = [
    ['基础修正与土类指数', count((row) => row.ic), basicApplicability, ['Ic =']],
    ['饱和重度 γsat (kN/m³)', count((row) => row.gammaSatKnM3), '全部有效解译行', ['γsat(kN/m³)']],
    ['渗透系数 k (m/s)', count((row) => row.permeability), 'JTS Zone 7–9 土类筛选；相关式来源 R05', ['k(m/s)']],
    ['标准贯入击数 N', count((row) => row.sptN), 'JTS 已分类土体（Zone 1–9）', ['N=']],
    ['压缩模量 Es（R05）(MPa)', count((row) => row.esMpa), 'JTS Zone 7–9 土类筛选；相关式来源 R05', ['Es（R05）']],
    ['相对密实度 Dr (%)', count((row) => row.drPercent), 'JTS 砂性土', ['Dr(%)']],
    ['有效内摩擦角 φ′ (°)', count((row) => row.phiDeg), 'JTS 砂性土（Zone 7–9）；按分区公式', ['φ′=']],
    ['压缩模量 Es（JTS 7.2.8）(MPa)', count((row) => row.jtsCompressionModulusMpa), 'JTS Zone 1–5；0<qnet≤5 MPa', ['Es（JTS 7.2.8）']],
    ['剪切波速与小应变模量', Math.max(vsCount, g0Count), '按 JTS 大类分别采用经验式', [...(vsCount ? ['Vs='] : []), ...(g0Count ? ['G0(MPa)'] : [])]],
    ['不排水强度与归一化强度', Math.max(suCount, residualCount), 'JTS 黏性土', suCount ? ['Su(kPa)'] : []],
    ['超固结比与静止土压力', Math.max(ocrCount, k0Count), 'JTS 黏性土；K0 可用 30° 预设', [...(ocrCount ? ['OCR ='] : []), ...(k0Count ? ['K0 ='] : [])]],
    ['灵敏度 St', count((row) => row.sensitivity), 'JTS 黏性土', ['St =']],
    ['等效洁净砂与状态参数', Math.max(cleanSandCount, stateCount), '状态参数仅 JTS 砂性土', [...(cleanSandCount ? ['Qtn,cs=', 'Kc='] : []), ...(stateCount ? ['ψ ='] : [])]],
    ['饱和物理指标', count((row) => row.voidRatio, (row) => row.waterContentPercent, (row) => row.dryUnitWeight, (row) => row.porosity), '全部有效解译行；Gs=2.65、完全饱和', ['r=γsat']],
    ['归一化与分类判据', Math.max(robertsonCount, robertson2016Count, schneiderCount), 'Robertson 需有效应力；Schneider 仅有效 u2 行', [...(robertsonCount ? ['Robertson Qtn='] : []), ...(robertson2016Count ? ['IB='] : []), ...(schneiderCount ? ['Schneider Q='] : [])]],
  ];
  const groups: Array<{ title: string; validCount: number; applicability: string; formulas: string[] }> = specs.flatMap(([title, validCount, applicability, prefixes]) => validCount <= 0 ? [] : [{ title, validCount, applicability, formulas: QUICK_PLOT_FORMULAS.filter((formula) => prefixes.some((prefix) => formula.startsWith(prefix))).map(String) }]);
  const basic = groups.find((group) => group.title === '基础修正与土类指数'); if (basic) basic.formulas = [...qtFormulas, ...basic.formulas];
  const su = groups.find((group) => group.title === '不排水强度与归一化强度'); if (su && residualCount) su.formulas = [...su.formulas, 'Su(rem)=Su/St；Su(r)/σ′v0=Su(rem)/σ′v0  [A02]'];
  const k0 = groups.find((group) => group.title === '超固结比与静止土压力'); if (k0 && k0Count) k0.formulas = [...k0.formulas, '黏性土 φ′ 无有效值时，K0 采用 30° 预设  [A02]'];
  const formulaIds = [...new Set(groups.flatMap((group) => group.formulas.flatMap((formula) => [...formula.matchAll(/\[([A-Z]\d{2})\]/g)].map((match) => match[1]))))];
  return { hasPoreCorrectedRows, hasApproximateRows, groups, formulaIds };
}

function drawReferencesPage(ctx: CanvasRenderingContext2D, box: PlotBox, settings: QuickPlotSettingsV1, rows: QuickDerived[]) {
  const audit = quickPlotFormulaAudit(settings, rows); const groups = audit.groups;
  fitCenteredText(ctx, '本次产生有效结果的方法、适用条件与公式', box.x + box.width / 2, box.y + 18, box.width, 20, '#111719', '700', 16);
  fitCenteredText(ctx, QUICK_PARAMETER_CLASSIFICATION_BASIS, box.x + box.width / 2, box.y + 42, box.width, 12, '#132a35', '700', 10);
  fitCenteredText(ctx, QUICK_PARAMETER_COMPARISON_ROLE, box.x + box.width / 2, box.y + 58, box.width, 11, '#596b72', '500', 9);
  const totalPorePressure = settings.u2Usage === 'total' || (!settings.u2Usage && settings.pressureBasisConfirmed);
  const coefficients = [['有效面积比', `a = ${settings.effectiveAreaRatio.toFixed(2)}`], ['水深 / u2 基准', `${settings.waterDepthM.toFixed(2)} m · ${totalPorePressure ? '总孔压' : '未用于计算'}`], ['参考压力', 'pa = 100 kPa'], ['水重度', 'γw = 10.00 kN/m³'], ['土粒比重', 'Gs = 2.65'], ['不排水强度系数', 'Nkt = 15.5'], ['灵敏度系数', 'Ns = 6.3'], ['超固结系数', 'kOCR = 0.16'], ['K0 黏土预设', 'φ′ = 30°']];
  const coefficientBox = { x: box.x, y: box.y + 78, width: box.width, height: 114 }; const cellWidth = coefficientBox.width / 3; const cellHeight = coefficientBox.height / 3;
  coefficients.forEach(([label, value], index) => { const column = index % 3, row = Math.floor(index / 3), x = coefficientBox.x + column * cellWidth, y = coefficientBox.y + row * cellHeight; ctx.fillStyle = row ? '#f6f7f7' : '#fff'; ctx.fillRect(x, y, cellWidth, cellHeight); reportFrame(ctx, { x, y, width: cellWidth, height: cellHeight }); text(ctx, label, x + 10, y + 18, 10, '#526168'); text(ctx, value, x + cellWidth - 10, y + 31, 11, '#26343a', '700', 'right'); });
  const formulaBox = { x: box.x, y: coefficientBox.y + coefficientBox.height + 18, width: box.width, height: 744 }; const columnGap = 18; const columnWidth = (formulaBox.width - columnGap) / 2; const columns = [groups.slice(0, 8), groups.slice(8)];
  columns.forEach((columnGroups, columnIndex) => { const left = formulaBox.x + columnIndex * (columnWidth + columnGap); const rowHeight = formulaBox.height / Math.max(1, columnGroups.length); columnGroups.forEach((group, index) => { const y = formulaBox.y + index * rowHeight; ctx.fillStyle = index % 2 ? '#f8f9f9' : '#fff'; ctx.fillRect(left, y, columnWidth, rowHeight - 2); ctx.fillStyle = '#9d6c45'; ctx.fillRect(left, y, 4, rowHeight - 2); reportFrame(ctx, { x: left, y, width: columnWidth, height: rowHeight - 2 }); fitLeftText(ctx, group.title, left + 12, y + 17, columnWidth - 120, 11, '#111719', '700', 9); text(ctx, `${group.validCount.toLocaleString('zh-CN')} 个值`, left + columnWidth - 10, y + 17, 9, '#65747b', '500', 'right'); fitLeftText(ctx, `适用：${group.applicability}`, left + 12, y + 32, columnWidth - 24, 8, '#6a777c', '500', 7); group.formulas.forEach((formula, formulaIndex) => fitLeftText(ctx, formula, left + 12, y + 49 + formulaIndex * 14, columnWidth - 24, 8, '#26343a', '500', 6.2)); }); });
  const usedIds = audit.formulaIds;
  const referenceMap = new Map<string, string>(QUICK_PLOT_REFERENCES as unknown as Array<readonly [string, string]>); referenceMap.set('A02', '快捷方法包实现约定：未使用或缺失 u2 的行取 qt=qc；Su(rem)=Su/St；K0 的黏性土 φ′ 缺失时采用 30° 预设。');
  const referenceY = formulaBox.y + formulaBox.height + 26; text(ctx, '参考来源', box.x, referenceY, 13, '#111719', '700'); reportLine(ctx, box.x, referenceY + 10, box.x + box.width, referenceY + 10, 'axis');
  const refColumns = [usedIds.filter((_, index) => index % 2 === 0), usedIds.filter((_, index) => index % 2 === 1)];
  refColumns.forEach((ids, columnIndex) => ids.forEach((id, index) => { const left = box.x + columnIndex * (box.width / 2 + 9); const top = referenceY + 30 + index * 50; text(ctx, id, left, top, 10, '#9d6c45', '700'); drawWrappedLines(ctx, referenceMap.get(id) ?? '来源条目缺失', left + 34, top, box.width / 2 - 48, 9, 12, '#33464e', 3); }));
  drawPageNote(ctx, box, '公式、系数和来源来自当前快捷方法包；未选择、未计算或没有有效结果的方法不占用本页。');
}

function drawDepthTracks<T extends { depthM: number; plotBreakBefore?: boolean }>(ctx: CanvasRenderingContext2D, box: PlotBox, rows: T[], tracks: Array<[string, string, string, (row: T) => number | null, { xQuantiles?: [number, number]; xRange?: [number, number]; colorByRow?: (row: T) => string; scale?: 'linear' | 'log' }?]>, soilBand: false | 'major' | 'zone' | 'robertson' | 'robertson2010' = false) {
  const depthValues = rows.map((r) => r.depthM).filter(Number.isFinite); const minDepth = Math.min(...depthValues, 0); const maxDepth = Math.max(...depthValues, 1);
  const gap = 24; const bandWidth = soilBand ? 210 : 0; const trackWidth = (box.width - bandWidth - gap * (tracks.length - 1) - (soilBand ? gap : 0)) / tracks.length;
  tracks.forEach(([label, unit, color, getValue, display], index) => {
    const track = { x: box.x + index * (trackWidth + gap), y: box.y + 48, width: trackWidth, height: box.height - 82 };
    drawTrackFrame(ctx, track, label, unit, minDepth, maxDepth, index === 0);
    const values = rows.map(getValue); const rawFiniteValues = values.filter((v): v is number => v !== null && Number.isFinite(v)); const logScale = display?.scale === 'log'; const finiteValues = rawFiniteValues.filter((value) => !logScale || value > 0).map((value) => logScale ? Math.log10(value) : value);
    if (!finiteValues.length) return;
    const fixedRange = display?.xRange ? (logScale ? display.xRange.map((value) => Math.log10(value)) as [number, number] : display.xRange) : null;
    const range = fixedRange ? { min: fixedRange[0], max: fixedRange[1], outsideCount: finiteValues.filter((value) => value < fixedRange[0] || value > fixedRange[1]).length } : display?.xQuantiles ? quickRobustDisplayRange(finiteValues, display.xQuantiles) : quickRobustDisplayRange(finiteValues, [0, 1]);
    const lo = range.min, hi = range.max;
    const plotValue = logScale ? (row: T) => { const value = getValue(row); return value !== null && value > 0 ? Math.log10(value) : null; } : getValue;
    if (display?.colorByRow) drawDepthLineByRowColor(ctx, track, rows, plotValue, lo, hi, minDepth, maxDepth, display.colorByRow);
    else drawDepthLine(ctx, track, rows, plotValue, lo, hi, minDepth, maxDepth, color);
    if (range.outsideCount) text(ctx, `${range.outsideCount} 个超范围点已标在边缘`, track.x + track.width - 2, track.y - 34, 12, '#7b5c45', '600', 'right');
    text(ctx, formatAxis(logScale ? 10 ** lo : lo), track.x + 4, track.y + track.height + 24, 13, '#65747b'); text(ctx, formatAxis(logScale ? 10 ** hi : hi), track.x + track.width - 4, track.y + track.height + 24, 13, '#65747b', '400', 'right');
  });
  if (soilBand) {
    const x = box.x + tracks.length * (trackWidth + gap); const track = { x, y: box.y + 48, width: bandWidth, height: box.height - 82 };
    drawTrackFrame(ctx, track, '', '', minDepth, maxDepth, false); drawSoilDepthBand(ctx, track, rows as unknown as QuickDerived[], minDepth, maxDepth, soilBand);
  }
}

function drawTrackFrame(ctx: CanvasRenderingContext2D, box: PlotBox, label: string, unit: string, minDepth: number, maxDepth: number, depthLabels: boolean) {
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.width, box.height);
  for (let i = 1; i < 5; i += 1) { const x = box.x + box.width * i / 5; reportLine(ctx, x, box.y, x, box.y + box.height, 'light'); }
  for (let i = 0; i <= 5; i += 1) { const y = box.y + box.height * i / 5; reportLine(ctx, box.x, y, box.x + box.width, y, i === 0 || i === 5 ? 'axis' : 'grid'); if (depthLabels) text(ctx, `${(minDepth + (maxDepth - minDepth) * i / 5).toFixed(1)} m`, box.x - 10, y + 5, 13, '#526168', '400', 'right'); }
  reportFrame(ctx, box);
  if (label) fitCenteredText(ctx, unit ? `${label} (${unit})` : label, box.x + box.width / 2, box.y - 16, box.width, 18, QUICK_REPORT_STYLE.ink, '700', 12);
}

function drawDepthLine<T extends { depthM: number; plotBreakBefore?: boolean }>(ctx: CanvasRenderingContext2D, box: PlotBox, rows: T[], getValue: (row: T) => number | null, min: number, max: number, minDepth: number, maxDepth: number, color: string) {
  const steps = rows.slice(1).map((r, i) => r.depthM - rows[i].depthM).filter((v) => v > 0).sort((a, b) => a - b); const typical = steps[Math.floor(steps.length / 2)] ?? 0.01;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; let open = false; let previousDepth: number | null = null;
  rows.forEach((row) => { const value = getValue(row); if (row.plotBreakBefore || value === null || !Number.isFinite(value) || (previousDepth !== null && row.depthM - previousDepth > Math.max(0.08, typical * 4))) { if (open) ctx.stroke(); open = false; previousDepth = value === null ? null : row.depthM; if (value === null || !Number.isFinite(value)) return; } const bounded = Math.max(min, Math.min(max, value)); const x = box.x + (bounded - min) / (max - min) * box.width; const y = box.y + (row.depthM - minDepth) / (maxDepth - minDepth) * box.height; if (!open) { ctx.beginPath(); ctx.moveTo(x, y); open = true; } else ctx.lineTo(x, y); previousDepth = row.depthM; }); if (open) ctx.stroke();
  ctx.restore();
}

function drawDepthLineByRowColor<T extends { depthM: number; plotBreakBefore?: boolean }>(ctx: CanvasRenderingContext2D, box: PlotBox, rows: T[], getValue: (row: T) => number | null, min: number, max: number, minDepth: number, maxDepth: number, colorByRow: (row: T) => string) {
  const steps = rows.slice(1).map((row, index) => row.depthM - rows[index].depthM).filter((value) => value > 0).sort((left, right) => left - right);
  const typical = steps[Math.floor(steps.length / 2)] ?? 0.01;
  let previous: { row: T; value: number; x: number; y: number } | null = null;
  ctx.save(); ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  rows.forEach((row) => {
    const value = getValue(row);
    const valid = value !== null && Number.isFinite(value);
    const separated = row.plotBreakBefore || (previous !== null && row.depthM - previous.row.depthM > Math.max(0.08, typical * 4));
    if (!valid) { previous = null; return; }
    const x = box.x + (Math.max(min, Math.min(max, value)) - min) / (max - min) * box.width;
    const y = box.y + (row.depthM - minDepth) / (maxDepth - minDepth) * box.height;
    ctx.strokeStyle = colorByRow(row);
    if (previous && !separated) { ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(x, y); ctx.stroke(); }
    else { ctx.fillStyle = colorByRow(row); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    previous = { row, value, x, y };
  });
  ctx.restore();
}

function drawSoilDepthBand(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[], minDepth: number, maxDepth: number, mode: 'major' | 'zone' | 'robertson' | 'robertson2010') {
  const readZone = (row: QuickDerived) => mode === 'robertson' ? row.robertsonSbtnZone : mode === 'robertson2010' ? row.robertson2010Zone : row.zone;
  const sorted = rows; if (!sorted.some((row) => readZone(row) !== null)) return;
  sorted.forEach((row, index) => {
    const displayZone = readZone(row);
    if (displayZone === null) return;
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const from = !previous ? minDepth : row.plotBreakBefore || readZone(previous) === null ? row.depthM : (previous.depthM + row.depthM) / 2;
    const to = !next ? maxDepth : next.plotBreakBefore || readZone(next) === null ? row.depthM : (row.depthM + next.depthM) / 2;
    if (to <= from) return;
    const y = box.y + (from - minDepth) / (maxDepth - minDepth) * box.height;
    const h = Math.max(1, (to - from) / (maxDepth - minDepth) * box.height);
    ctx.fillStyle = mode === 'major' ? majorColor(row.major) : QUICK_REPORT_ZONE_COLORS[displayZone]; ctx.globalAlpha = 0.82; ctx.fillRect(box.x, y, box.width, h); ctx.globalAlpha = 1;
  });
}

function depthCellRange<T extends { depthM: number; plotBreakBefore?: boolean }>(rows: T[], index: number, minDepth: number, maxDepth: number) {
  const row = rows[index]; const previous = rows[index - 1]; const next = rows[index + 1];
  const from = !previous || row.plotBreakBefore ? row.depthM : (previous.depthM + row.depthM) / 2;
  const to = !next || next.plotBreakBefore ? row.depthM : (row.depthM + next.depthM) / 2;
  const boundedFrom = Math.max(minDepth, from); const boundedTo = Math.min(maxDepth, to);
  return boundedTo > boundedFrom ? { from: boundedFrom, to: boundedTo } : null;
}

function drawRobertsonZoneChart(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[], normalized: boolean) {
  const xMin = .1, xMax = 10, yMin = 1, yMax = 1000;
  const x = (value: number) => box.x + Math.log10(value / xMin) / Math.log10(xMax / xMin) * box.width;
  const y = (value: number) => box.y + box.height - Math.log10(value / yMin) / Math.log10(yMax / yMin) * box.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.width, box.height);
  const columns = 84, rowCount = 96;
  for (let yi = 0; yi < rowCount; yi += 1) for (let xi = 0; xi < columns; xi += 1) {
    const fr = 10 ** (Math.log10(xMin) + (xi + .5) / columns * Math.log10(xMax / xMin));
    const q = 10 ** (Math.log10(yMin) + (yi + .5) / rowCount * Math.log10(yMax / yMin));
    const zone = normalized ? quickRobertsonSbtnZone(q, fr) : quickRobertson2010SbtZone(q, fr); if (!zone) continue;
    ctx.fillStyle = QUICK_REPORT_ZONE_COLORS[zone]; ctx.globalAlpha = .78;
    ctx.fillRect(box.x + xi / columns * box.width, box.y + box.height - (yi + 1) / rowCount * box.height, box.width / columns + 1, box.height / rowCount + 1);
  }
  ctx.globalAlpha = 1;
  [0.1, 1, 10].forEach((tick) => { reportLine(ctx, x(tick), box.y, x(tick), box.y + box.height, 'grid'); text(ctx, String(tick), x(tick), box.y + box.height + 21, 12, '#46545a', '500', 'center'); });
  [1, 10, 100, 1000].forEach((tick) => { reportLine(ctx, box.x, y(tick), box.x + box.width, y(tick), 'grid'); text(ctx, tick === 1000 ? '1k' : String(tick), box.x - 8, y(tick) + 4, 12, '#46545a', '500', 'right'); });
  const labels: Array<[number, number, number]> = [[1,.3,2.5],[2,6,2.2],[3,5,12],[4,1.2,12],[5,.55,35],[6,.28,110],[7,.22,500],[8,2.5,500],[9,7,350]];
  labels.forEach(([zone, fr, q]) => text(ctx, String(zone), x(fr), y(q), 21, '#1f2629', '700', 'center'));
  rows.forEach((row) => { const fr = normalized ? row.frPercent : row.qcKpa > 0 ? row.fsKpa / row.qcKpa * 100 : null; const q = normalized ? row.robertsonQtn : row.qcKpa / 100; if (fr === null || q === null || fr < xMin || fr > xMax || q < yMin || q > yMax) return; ctx.fillStyle = '#e31b17'; ctx.strokeStyle = '#111'; ctx.lineWidth = .65; ctx.beginPath(); ctx.arc(x(fr), y(q), 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  reportFrame(ctx, box); text(ctx, normalized ? '归一化摩阻比 Fr (%)' : '摩阻比 Rf=fs/qc×100 (%)', box.x + box.width / 2, box.y + box.height + 39, 14, '#27353b', '600', 'center'); ctx.save(); ctx.translate(box.x - 43, box.y + box.height / 2); ctx.rotate(-Math.PI / 2); text(ctx, normalized ? '归一化锥尖阻力 Qtn (-)' : '锥尖阻力比 qc/pa (-)', 0, 0, 14, '#27353b', '600', 'center'); ctx.restore();
}

function drawBqClassificationChart(ctx: CanvasRenderingContext2D, box: PlotBox, rows: QuickDerived[], normalized: boolean) {
  const [xMin, xMax] = QUICK_BQ_REFERENCE_POLYGONS.xDomain, [yMin, yMax] = QUICK_BQ_REFERENCE_POLYGONS.yDomain;
  const x = (value: number) => box.x + (value - xMin) / (xMax - xMin) * box.width;
  const y = (value: number) => box.y + box.height - Math.log10(value / yMin) / Math.log10(yMax / yMin) * box.height;
  const polygon = (zone: number, points: Array<[number, number]>) => { ctx.fillStyle = QUICK_REPORT_ZONE_COLORS[zone]; ctx.beginPath(); points.forEach(([px, py], index) => index ? ctx.lineTo(x(px), y(py)) : ctx.moveTo(x(px), y(py))); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke(); };
  ctx.fillStyle = QUICK_REPORT_ZONE_COLORS[3]; ctx.fillRect(box.x, box.y, box.width, box.height);
  Object.entries(QUICK_BQ_REFERENCE_POLYGONS.zones).forEach(([zone, points]) => polygon(Number(zone), points.map((point) => [...point] as [number, number])));
  for (let i = 0; i <= 5; i += 1) { const tick = xMin + (xMax - xMin) * i / 5; reportLine(ctx, x(tick), box.y, x(tick), box.y + box.height, 'light'); text(ctx, tick.toFixed(2), x(tick), box.y + box.height + 21, 12, '#46545a', '500', 'center'); }
  [1,10,100,1000].forEach((tick) => { reportLine(ctx, box.x, y(tick), box.x + box.width, y(tick), 'grid'); text(ctx, tick === 1000 ? '1k' : String(tick), box.x - 8, y(tick) + 4, 12, '#46545a', '500', 'right'); });
  [[1,1.22,2],[2,.40,1.45],[3,.55,8],[4,.10,30],[5,-.10,65],[6,-.17,190],[7,-.06,420]].forEach(([zone, px, py]) => text(ctx, String(zone), x(px), y(py), 19, '#1f2629', '700', 'center'));
  rows.forEach((row) => { const px = row.bq; const py = normalized ? row.robertsonQtn : row.qtKpa / 100; if (px === null || py === null || px < xMin || px > xMax || py < yMin || py > yMax) return; ctx.fillStyle = '#e31b17'; ctx.strokeStyle = '#111'; ctx.lineWidth = .65; ctx.beginPath(); ctx.arc(x(px), y(py), 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  reportFrame(ctx, box); text(ctx, '孔压参数 Bq (-)', box.x + box.width / 2, box.y + box.height + 39, 14, '#27353b', '600', 'center'); ctx.save(); ctx.translate(box.x - 43, box.y + box.height / 2); ctx.rotate(-Math.PI / 2); text(ctx, normalized ? '归一化锥尖阻力 Qtn (-)' : '修正锥尖阻力比 qt/pa (-)', 0, 0, 14, '#27353b', '600', 'center'); ctx.restore();
}

function drawScatter(ctx: CanvasRenderingContext2D, box: PlotBox, points: Array<{ x: number; y: number; color: string }>, xLabel: string, yLabel: string, logX: boolean, logY: boolean, connect = false, display?: { xQuantiles?: [number, number] }) {
  ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.width, box.height);
  const usable = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!logX || p.x > 0) && (!logY || p.y > 0));
  const xs = usable.map((p) => logX ? Math.log10(p.x) : p.x); const ys = usable.map((p) => logY ? Math.log10(p.y) : p.y);
  let minX = Math.min(...xs, logX ? -1 : 0), maxX = Math.max(...xs, logX ? 1 : 1), minY = Math.min(...ys, logY ? 0 : 0), maxY = Math.max(...ys, logY ? 3 : 1);
  if (display?.xQuantiles && xs.length >= 20) {
    const ordered = [...xs].sort((left, right) => left - right);
    minX = quantile(ordered, display.xQuantiles[0]);
    maxX = quantile(ordered, display.xQuantiles[1]);
  }
  if (minX === maxX) maxX += 1; if (minY === maxY) maxY += 1;
  for (let i = 1; i < 5; i += 1) { const x = box.x + box.width * i / 5; const y = box.y + box.height * i / 5; reportLine(ctx, x, box.y, x, box.y + box.height, 'light'); reportLine(ctx, box.x, y, box.x + box.width, y, 'grid'); }
  for (let index = 0; index <= 5; index += 1) { const xValue = minX + (maxX - minX) * index / 5; const yValue = minY + (maxY - minY) * index / 5; text(ctx, formatAxis(logX ? 10 ** xValue : xValue), box.x + box.width * index / 5, box.y + box.height + 20, 12, '#65747b', '400', 'center'); text(ctx, formatAxis(logY ? 10 ** yValue : yValue), box.x - 8, box.y + box.height - box.height * index / 5 + 4, 12, '#65747b', '400', 'right'); }
  if (connect && usable.length) { ctx.strokeStyle = usable[0].color; ctx.globalAlpha = .5; ctx.lineWidth = 2; ctx.beginPath(); usable.forEach((p, i) => { const x = box.x + ((logX ? Math.log10(p.x) : p.x) - minX) / (maxX - minX) * box.width; const y = box.y + box.height - ((logY ? Math.log10(p.y) : p.y) - minY) / (maxY - minY) * box.height; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1; }
  let clipped = 0;
  usable.forEach((p) => {
    const xValue = logX ? Math.log10(p.x) : p.x;
    const yValue = logY ? Math.log10(p.y) : p.y;
    const outside = xValue < minX || xValue > maxX;
    if (outside) clipped += 1;
    const x = box.x + (Math.max(minX, Math.min(maxX, xValue)) - minX) / (maxX - minX) * box.width;
    const y = box.y + box.height - (yValue - minY) / (maxY - minY) * box.height;
    ctx.fillStyle = p.color; ctx.globalAlpha = outside ? .95 : .72; ctx.beginPath();
    if (outside) { const direction = xValue < minX ? 1 : -1; ctx.moveTo(x, y); ctx.lineTo(x + direction * 8, y - 5); ctx.lineTo(x + direction * 8, y + 5); ctx.closePath(); }
    else ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (clipped) text(ctx, `${clipped} 个超范围点已标在边缘`, box.x + box.width, box.y - 10, 13, '#7b5c45', '600', 'right');
  reportFrame(ctx, box);
  text(ctx, xLabel, box.x + box.width / 2, box.y + box.height + 32, 16, '#40545c', '600', 'center'); ctx.save(); ctx.translate(box.x - 42, box.y + box.height / 2); ctx.rotate(-Math.PI / 2); text(ctx, yLabel, 0, 0, 16, '#40545c', '600', 'center'); ctx.restore();
}

function quantile(ordered: number[], fraction: number) {
  if (!ordered.length) return 0;
  const position = Math.max(0, Math.min(ordered.length - 1, (ordered.length - 1) * fraction));
  const lower = Math.floor(position); const upper = Math.ceil(position); const mix = position - lower;
  return ordered[lower] * (1 - mix) + ordered[upper] * mix;
}

function drawSbtLegendGrid(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const columnWidth = width / 3;
  JTS_SOIL_CLASSES.forEach((soil, index) => { const left=x+(index%3)*columnWidth,top=y+Math.floor(index/3)*22;ctx.fillStyle=QUICK_REPORT_ZONE_COLORS[soil.zone];ctx.fillRect(left,top,13,13);fitLeftText(ctx,`${soil.zone}. ${soil.label}`,left+19,top+12,columnWidth-23,11,'#263239','600',9); });
}

function drawEmptyPanel(ctx: CanvasRenderingContext2D, box: PlotBox, message: string) { ctx.fillStyle = '#f1f4f5'; ctx.fillRect(box.x, box.y, box.width, box.height); reportFrame(ctx, box); text(ctx, message, box.x + box.width / 2, box.y + box.height / 2, 22, '#65747b', '600', 'center'); }
function drawSoilLegendHorizontal(ctx: CanvasRenderingContext2D, x: number, y: number) { ([['砂土', 'sand'], ['粉土', 'silt'], ['黏土', 'clay']] as const).forEach(([label, major], i) => { const left = x + i * 112; ctx.fillStyle = majorColor(major); ctx.fillRect(left, y, 18, 18); text(ctx, label, left + 27, y + 15, 15, '#33484f', '600'); }); }
function panelTitle(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, value: string) { fitCenteredText(ctx, value, x + width / 2, y, width, 20, QUICK_REPORT_STYLE.ink, '700', 14); }
function majorColor(major: QuickDerived['major']) { return QUICK_SOIL_COLORS[major]; }
function depthColor(depth: number, rows: QuickPlotRowV1[]) { const values = rows.map((r) => r.depthM); const min = Math.min(...values), max = Math.max(...values); const t = max > min ? (depth - min) / (max - min) : 0; return `hsl(${205 - t * 165} 58% ${42 + t * 8}%)`; }
function formatAxis(value: number) { const abs = Math.abs(value); return abs >= 1000 ? `${(value / 1000).toFixed(1)}k` : abs > 0 && abs < .01 ? value.toExponential(1) : value.toFixed(abs < 10 ? 2 : 0); }
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight = '400', align: CanvasTextAlign = 'left') { ctx.font = `${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y); }
function fitCenteredText(ctx: CanvasRenderingContext2D, value: string, centerX: number, y: number, maxWidth: number, preferredSize: number, color: string, weight = '700', minimumSize = 11) { let size = preferredSize; while (size > minimumSize) { ctx.font = `${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; if (ctx.measureText(value).width <= maxWidth) break; size -= 1; } text(ctx, value, centerX, y, size, color, weight, 'center'); }
function fitLeftText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, preferredSize: number, color: string, weight = '400', minimumSize = 11) { let size = preferredSize; while (size > minimumSize) { ctx.font = `${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; if (ctx.measureText(value).width <= maxWidth) break; size -= 1; } text(ctx, value, x, y, size, color, weight); }
function drawPageNote(ctx: CanvasRenderingContext2D, box: PlotBox, value: string) { fitCenteredText(ctx, value, box.x + box.width / 2, box.y + box.height + 18, box.width, 13, '#596b72', '500', 11); }
function drawParameterBasisNote(ctx: CanvasRenderingContext2D, box: PlotBox, emptyValue: string) {
  fitLeftText(ctx, QUICK_PARAMETER_CLASSIFICATION_BASIS, box.x, box.y + box.height + 1, box.width, 15, '#132a35', '700', 12);
  fitLeftText(ctx, `${QUICK_PARAMETER_COMPARISON_ROLE} ${emptyValue}`, box.x, box.y + box.height + 18, box.width, 12, '#596b72', '500', 9);
}
function reportLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, kind: 'axis' | 'grid' | 'light') { ctx.save(); ctx.strokeStyle = kind === 'axis' ? QUICK_REPORT_STYLE.axis : kind === 'grid' ? QUICK_REPORT_STYLE.grid : QUICK_REPORT_STYLE.gridLight; ctx.lineWidth = kind === 'axis' ? QUICK_REPORT_STYLE.axisWidth : kind === 'grid' ? QUICK_REPORT_STYLE.gridWidth : 0.8; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function reportFrame(ctx: CanvasRenderingContext2D, box: PlotBox) { ctx.save(); ctx.strokeStyle = QUICK_REPORT_STYLE.ink; ctx.lineWidth = QUICK_REPORT_STYLE.frameWidth; ctx.setLineDash([]); ctx.strokeRect(box.x, box.y, box.width, box.height); ctx.restore(); }
function drawWrappedLines(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, lineHeight: number, color: string, maxLines: number) { ctx.font=`400 ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';const tokens=value.split(/(?<=\s)|(?=[，；：。])/);const lines:string[]=[];let line='';for(const token of tokens){const next=line+token;if(ctx.measureText(next).width>width&&line){lines.push(line.trim());line=token.trimStart();if(lines.length===maxLines-1)break;}else line=next;}if(line&&lines.length<maxLines)lines.push(line.trim());lines.forEach((item,index)=>{let display=item;if(index===maxLines-1&&ctx.measureText(display).width>width){while(display.length>1&&ctx.measureText(`${display}…`).width>width)display=display.slice(0,-1);display=`${display}…`;}ctx.fillText(display,x,y+index*lineHeight);});}

function ascii(value: string) { return new TextEncoder().encode(value); }
function concat(parts: Uint8Array[]) { const size = parts.reduce((sum, p) => sum + p.length, 0); const result = new Uint8Array(size); let offset = 0; parts.forEach((p) => { result.set(p, offset); offset += p.length; }); return result; }
function pdfEscape(value: string) { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
type PdfImagePage = { rgb: Uint8Array; width: number; height: number; orientation: 'portrait' | 'landscape' };
type PdfObject = Uint8Array | { header: Uint8Array; data: Uint8Array; footer: Uint8Array };

function assertQuickPdfCurrent(options: QuickPlotPdfOptions) {
  if (options.signal?.aborted) throw new Error('QUICK_PDF_ABORTED');
  if (options.shouldContinue && !options.shouldContinue()) throw new Error('QUICK_PDF_STALE');
}

function yieldQuickPdf() { return new Promise<void>((resolve) => window.setTimeout(resolve, 0)); }

async function encodeCanvasRgb(canvas: HTMLCanvasElement, options: QuickPlotPdfOptions) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('QUICK_PDF_CANVAS_UNAVAILABLE');
  const chunks: Uint8Array[] = [];
  const stream = new Zlib({ level: 6 }, (chunk) => chunks.push(chunk));
  const stripHeight = 16;
  for (let y = 0; y < canvas.height; y += stripHeight) {
    assertQuickPdfCurrent(options);
    const height = Math.min(stripHeight, canvas.height - y);
    const rgba = ctx.getImageData(0, y, canvas.width, height).data;
    const rgb = new Uint8Array(canvas.width * height * 3);
    for (let source = 0, target = 0; source < rgba.length; source += 4) {
      rgb[target++] = rgba[source];
      rgb[target++] = rgba[source + 1];
      rgb[target++] = rgba[source + 2];
    }
    stream.push(rgb, y + height >= canvas.height);
    if ((y / stripHeight) % 32 === 31) await yieldQuickPdf();
  }
  return concat(chunks);
}

function pdfObjectLength(object: PdfObject) {
  return object instanceof Uint8Array ? object.length : object.header.length + object.data.length + object.footer.length;
}

function pdfObjectParts(object: PdfObject): BlobPart[] {
  return object instanceof Uint8Array
    ? [object as unknown as BlobPart]
    : [object.header, object.data, object.footer].map((part) => part as unknown as BlobPart);
}

function streamObject(header: string, data: Uint8Array): PdfObject {
  return { header: ascii(`${header}\nstream\n`), data, footer: ascii('\nendstream') };
}

function buildPdf(pages: PdfImagePage[], identity: string) {
  const objects: PdfObject[] = []; const count = 2 + pages.length * 3;
  objects[1] = ascii('<< /Type /Catalog /Pages 2 0 R >>'); const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' '); objects[2] = ascii(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => { const media = page.orientation === 'portrait' ? { width: 841.89, height: 1190.55 } : { width: 1190.55, height: 841.89 }; const pageId = 3 + index * 3, imageId = pageId + 1, contentId = pageId + 2; const content = `q ${media.width} 0 0 ${media.height} 0 0 cm /Im${index} Do Q\nBT /F1 6 Tf 3 Tr 20 20 Td (${pdfEscape(`SIGS-OGLab ${identity} Page=${index + 1}/${pages.length}`)}) Tj ET`; objects[pageId] = ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${media.width} ${media.height}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`); objects[imageId] = streamObject(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${page.rgb.length} >>`, page.rgb); objects[contentId] = streamObject(`<< /Length ${ascii(content).length} >>`, ascii(content)); });
  const header = ascii(`%PDF-1.7\n%SIGS-OGLab A3 ${QUICK_PDF_DPI} DPI\n`); const parts: BlobPart[] = [header]; const offsets = [0]; let offset = header.length;
  for (let id = 1; id <= count; id += 1) { offsets[id] = offset; const objectHeader = ascii(`${id} 0 obj\n`); const objectFooter = ascii('\nendobj\n'); parts.push(objectHeader, ...pdfObjectParts(objects[id]), objectFooter); offset += objectHeader.length + pdfObjectLength(objects[id]) + objectFooter.length; }
  const xrefOffset = offset; parts.push(ascii(`xref\n0 ${count + 1}\n0000000000 65535 f \n${offsets.slice(1).map((v) => `${String(v).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)); return new Blob(parts, { type: 'application/pdf' });
}
