import type { JtsOutputRevisionV7, JtsOutputSnapshotV7 } from '../workspace/workspaceV2';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import { JTS_SBT_ZONE_COLORS, JTS_SOIL_CLASSES } from '../jts/jtsT242Domain';
import { createJtsOutputWorkbook, splitOutputTrackSegments } from './jtsOutputWorkbook';

export function createJtsOutputRevision(snapshot: JtsOutputSnapshotV7, kind: JtsOutputRevisionV7['kind'], revisionId = createId('jts-output')): JtsOutputRevisionV7 {
  const extension = kind === 'excel-workbook' ? 'xlsx' : 'pdf';
  const suffix = kind === 'a4-report-pdf' ? 'interpretation-report' : kind === 'a3-atlas-pdf' ? 'interpretation-atlas' : 'interpretation-data';
  return {
    revisionId,
    kind,
    fileName: `${safeName(snapshot.pointName)}-${safeName(snapshot.classificationMethod?.methodId ?? 'classification')}-${suffix}.${extension}`,
    mimeType: kind === 'excel-workbook' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
    status: 'current',
    snapshot: structuredClone(snapshot),
    inputHash: sha256HexSync(stableStringify(snapshot)),
    createdAt: snapshot.generatedAt,
  };
}

export function validateJtsOutputRevision(revision: JtsOutputRevisionV7) {
  if (!revision.revisionId || !['a4-report-pdf', 'a3-atlas-pdf', 'excel-workbook'].includes(revision.kind) || !['current', 'stale'].includes(revision.status) || Number.isNaN(Date.parse(revision.createdAt))) return { ok: false as const, problem: '成果修订身份或状态无效。' };
  if (revision.inputHash !== sha256HexSync(stableStringify(revision.snapshot))) return { ok: false as const, problem: '成果快照哈希不一致。' };
  if (revision.snapshot.generatedAt !== revision.createdAt || !revision.snapshot.authority.checkRunId || !revision.snapshot.authority.classificationRunId || !revision.snapshot.authority.stratificationRevisionId || !revision.snapshot.authority.parameterPackageRunId) return { ok: false as const, problem: '成果快照缺少精确上游权威。' };
  if (revision.snapshot.parameterSource && (
    revision.snapshot.parameterSource.classificationRunId !== revision.snapshot.authority.classificationRunId
    || revision.snapshot.parameterSource.classificationResultHash !== revision.snapshot.authority.classificationResultHash
    || revision.snapshot.parameterSource.stratificationRevisionId !== revision.snapshot.authority.stratificationRevisionId
    || !revision.snapshot.parameterSource.sourceLineageHash
  )) return { ok: false as const, problem: '分类、分层和参数不属于同一来源链，不能生成成果。' };
  if (!revision.snapshot.measuredRows.length || !revision.snapshot.layers.length || !revision.snapshot.parameterValues.length) return { ok: false as const, problem: '成果快照缺少测量、分层或参数内容。' };
  if (revision.snapshot.parameterRows) {
    const layerIds = new Set(revision.snapshot.layers.map((layer) => layer.layerId));
    const measuredDepthBySourceId = new Map(revision.snapshot.measuredRows.map((row) => [row.sourceRowId, row.depthM]));
    const allowedStatuses = new Set(['value', 'pending_confirmation', 'unavailable', 'problem', 'ignored']);
    const identities = new Set<string>();
    for (const row of revision.snapshot.parameterRows) {
      const identity = `${row.sourceRowId}:${row.methodId}`;
      const valueStateMismatch = row.status === 'value' ? !Number.isFinite(row.value) : row.value !== null;
      const ignoreMismatch = row.status === 'ignored' ? !row.ignoreKind : row.ignoreKind !== null;
      const measuredDepth = measuredDepthBySourceId.get(row.sourceRowId);
      const sourceDepthMismatch = measuredDepth === undefined || Math.abs(measuredDepth - row.depthM) > 1e-6;
      if (!row.sourceRowId || sourceDepthMismatch || !Number.isFinite(row.depthM) || !layerIds.has(row.layerId) || !row.methodId || !row.label || !row.symbol || !row.unit || !allowedStatuses.has(row.status) || valueStateMismatch || ignoreMismatch || !Array.isArray(row.notices) || row.notices.some((notice) => !notice.trim()) || identities.has(identity)) return { ok: false as const, problem: '成果快照中的逐深度参数明细无效。' };
      identities.add(identity);
    }
  }
  if (revision.snapshot.parameterExclusions?.some((item) => !item.methodId || !item.label || !item.symbol || !['required', 'recommended', 'optional'].includes(item.level) || !item.reason || Number.isNaN(Date.parse(item.decidedAt)))) return { ok: false as const, problem: '成果快照中的参数排除声明无效。' };
  return { ok: true as const };
}

export type JtsOutputAuthorityContent = Pick<JtsOutputSnapshotV7, 'measuredRows' | 'classificationRows' | 'layers' | 'parameterRows' | 'parameterValues'>;

export function validateJtsOutputAuthorityContent(snapshot: JtsOutputSnapshotV7, authority: JtsOutputAuthorityContent) {
  const keys: Array<keyof JtsOutputAuthorityContent> = ['measuredRows', 'classificationRows', 'layers', 'parameterRows', 'parameterValues'];
  const mismatched = keys.find((key) => stableStringify(snapshot[key]) !== stableStringify(authority[key]));
  return mismatched
    ? { ok: false as const, problem: `成果快照的 ${mismatched} 与当前权威对象不一致，请重新生成。` }
    : { ok: true as const };
}

export type JtsOutputClassificationBand = {
  zone: number;
  classCode: string;
  label: string;
  color: string;
  engineeringGroup: string;
  approximate: boolean;
  depthFromM: number;
  depthToM: number;
};

export function layoutJtsOutputLayerLabelYs(anchorYs: number[], minY: number, maxY: number, preferredGap = 34) {
  if (!anchorYs.length || !Number.isFinite(minY) || !Number.isFinite(maxY) || maxY < minY) return [];
  if (anchorYs.length === 1) return [Math.min(maxY, Math.max(minY, anchorYs[0]))];
  const gap = Math.min(preferredGap, (maxY - minY) / (anchorYs.length - 1));
  const positions = anchorYs.map((anchorY) => Math.min(maxY, Math.max(minY, anchorY)));
  for (let index = 1; index < positions.length; index += 1) positions[index] = Math.max(positions[index], positions[index - 1] + gap);
  if (positions.at(-1)! > maxY) positions[positions.length - 1] = maxY;
  for (let index = positions.length - 2; index >= 0; index -= 1) positions[index] = Math.min(positions[index], positions[index + 1] - gap);
  if (positions[0] < minY) {
    const shift = minY - positions[0];
    positions.forEach((position, index) => { positions[index] = position + shift; });
  }
  return positions;
}

export function buildJtsOutputClassificationBands(
  rows: JtsOutputSnapshotV7['classificationRows'],
  depthFromM: number,
  depthToM: number,
): JtsOutputClassificationBand[] {
  if (!Number.isFinite(depthFromM) || !Number.isFinite(depthToM) || depthToM <= depthFromM) return [];
  rows.forEach((row, index) => {
    if (!Number.isFinite(row.depthM) || (index > 0 && row.depthM <= rows[index - 1].depthM)) throw new Error('分类深度必须为严格递增的有限值。');
  });
  const positiveSteps = rows.slice(1).map((row, index) => row.depthM - rows[index].depthM).filter((step) => step > 0).sort((left, right) => left - right);
  const middle = Math.floor(positiveSteps.length / 2);
  const typicalStepM = positiveSteps.length
    ? positiveSteps.length % 2 ? positiveSteps[middle] : (positiveSteps[middle - 1] + positiveSteps[middle]) / 2
    : 0.01;
  const gapThresholdM = Math.max(0.05, typicalStepM * 3);
  const soilById = new Map(JTS_SOIL_CLASSES.map((soil) => [soil.id as string, soil]));
  const bands: JtsOutputClassificationBand[] = [];

  rows.forEach((row, index) => {
    if (!row.soilClassId || !row.label) return;
    const soil = soilById.get(row.soilClassId);
    const visual = classificationVisual(row, soil?.zone, soil?.label);
    const previousDepthM = rows[index - 1]?.depthM;
    const nextDepthM = rows[index + 1]?.depthM;
    const cellFromM = previousDepthM !== undefined && row.depthM - previousDepthM <= gapThresholdM
      ? (previousDepthM + row.depthM) / 2
      : row.depthM - typicalStepM / 2;
    const cellToM = nextDepthM !== undefined && nextDepthM - row.depthM <= gapThresholdM
      ? (row.depthM + nextDepthM) / 2
      : row.depthM + typicalStepM / 2;
    const clippedFromM = Math.max(depthFromM, cellFromM);
    const clippedToM = Math.min(depthToM, cellToM);
    if (clippedToM <= clippedFromM) return;
    const previous = bands.at(-1);
    if (
      previous
      && previous.classCode === visual.classCode
      && previous.approximate === row.approximate
      && Math.abs(previous.depthToM - clippedFromM) <= Math.max(1e-6, typicalStepM * 0.05)
    ) {
      previous.depthToM = clippedToM;
      return;
    }
    bands.push({
      zone: visual.zone,
      classCode: visual.classCode,
      label: visual.label,
      color: visual.color,
      engineeringGroup: visual.engineeringGroup,
      approximate: row.approximate,
      depthFromM: clippedFromM,
      depthToM: clippedToM,
    });
  });
  return bands;
}

const GENERIC_CLASSIFICATION_COLORS = [
  '#c4473a', '#c9753d', '#d99b3d', '#c5aa63', '#8bbf9f',
  '#4fa091', '#397f83', '#53678f', '#7c668f',
] as const;

function classificationVisual(
  row: JtsOutputSnapshotV7['classificationRows'][number],
  jtsZone?: number,
  jtsLabel?: string,
) {
  const rawCode = row.classCode?.trim() || (jtsZone ? `Z${jtsZone}` : row.soilClassId ?? 'CLASS');
  const numericCode = Number(rawCode.replace(/[^\d]/g, ''));
  const zone = jtsZone ?? (Number.isFinite(numericCode) && numericCode > 0 ? numericCode : classificationCodeIndex(rawCode) + 1);
  const engineeringGroup = row.engineeringGroup ?? (row.soilClassId?.includes('sand') ? 'sand' : row.soilClassId?.includes('clay') ? 'clay' : 'mixed');
  return {
    zone,
    classCode: jtsZone ? `Z${jtsZone}` : rawCode,
    label: jtsLabel ?? row.label ?? rawCode,
    color: jtsZone ? JTS_SBT_ZONE_COLORS[jtsZone] : GENERIC_CLASSIFICATION_COLORS[(zone - 1) % GENERIC_CLASSIFICATION_COLORS.length],
    engineeringGroup,
  };
}

function classificationCodeIndex(value: string) {
  const candidates = ['CLAY', 'MIXED', 'SAND', 'CCS', 'CC', 'CD', 'TC', 'TD', 'SC', 'SD', '1A', '1B', '1C', '2', '3'];
  const index = candidates.indexOf(value.toUpperCase());
  return index >= 0 ? index % GENERIC_CLASSIFICATION_COLORS.length : 0;
}

export async function createJtsOutputXlsx(snapshot: JtsOutputSnapshotV7) { return createJtsOutputWorkbook(snapshot); }

export async function createJtsOutputPdf(snapshot: JtsOutputSnapshotV7, kind: 'a4-report-pdf' | 'a3-atlas-pdf') {
  const canvases = kind === 'a4-report-pdf' ? renderA4Pages(snapshot) : renderA3AtlasPages(snapshot);
  const pages = canvases.map((canvas) => ({ jpeg: dataUrlBytes(canvas.toDataURL('image/jpeg', 0.9)), pixelWidth: canvas.width, pixelHeight: canvas.height }));
  const media = kind === 'a4-report-pdf' ? { width: 595.28, height: 841.89 } : { width: 1190.55, height: 841.89 };
  return buildPdf(pages, media, snapshot);
}

export function renderJtsOutputPreviewDataUrls(snapshot: JtsOutputSnapshotV7, kind: 'a4-report-pdf' | 'a3-atlas-pdf') {
  const canvases = kind === 'a4-report-pdf' ? renderA4Pages(snapshot) : renderA3AtlasPages(snapshot);
  return canvases.map((canvas) => canvas.toDataURL('image/png'));
}

function renderA4Pages(snapshot: JtsOutputSnapshotV7) {
  const outcomeRows = outputOutcomeRows(snapshot);
  const outcomeLayouts = layoutOutputOutcomePages(outcomeRows, 656, 18, 1200);
  const outcomePageCount = outcomeLayouts.length;
  const totalPages = 2 + outcomePageCount;
  const first = pageCanvas(1400, 1980);
  const ctx = first.getContext('2d')!;
  pageBase(ctx, first.width, first.height, 'CPT/CPTU 专业解译报告', snapshot, '当前成果 · 冻结快照');
  sectionTitle(ctx, 100, 330, '1  当前成果权威');
  textRows(ctx, 100, 390, [
    ['检查运行', compactId(snapshot.authority.checkRunId)], ['分类运行', compactId(snapshot.authority.classificationRunId)], ['分层修订', compactId(snapshot.authority.stratificationRevisionId)], ['参数包', compactId(snapshot.authority.parameterPackageRunId)],
  ], 1200);
  sectionTitle(ctx, 100, 680, '2  地层分层');
  drawTable(ctx, 100, 740, ['地层', '深度范围（m）', '工程土组'], snapshot.layers.map((layer) => [layer.name, `${layer.depthFromM.toFixed(2)} – ${layer.depthToM.toFixed(2)}`, layer.engineeringSoilGroup]), [500, 380, 320]);
  sectionTitle(ctx, 100, 1120, '3  参数代表值');
  drawTable(ctx, 100, 1180, ['地层', '参数', '中位数', '单位'], snapshot.parameterValues.slice(0, 10).map((item) => [snapshot.layers.find((layer) => layer.layerId === item.layerId)?.name ?? item.layerId, item.symbol, item.median === null ? '—' : formatNumber(item.median), item.unit]), [420, 260, 260, 260]);
  footer(ctx, first.width, first.height, 1, totalPages);
  const second = pageCanvas(1400, 1980);
  const ctx2 = second.getContext('2d')!;
  pageBase(ctx2, second.width, second.height, '测量、分类与消散证据', snapshot, 'A4 报告 · 证据页');
  sectionTitle(ctx2, 100, 330, `4  深度曲线与 ${snapshot.classificationMethod?.label ?? '分类'} 证据`);
  drawDepthPlot(ctx2, 100, 400, 1200, 900, snapshot);
  sectionTitle(ctx2, 100, 1390, '5  孔压消散');
  if (snapshot.dissipation) textRows(ctx2, 100, 1450, [['t50', `${formatNumber(snapshot.dissipation.t50Seconds)} s · ${snapshot.dissipation.t50Origin}`], ['Ch', `${snapshot.dissipation.chM2PerSecond.toExponential(5)} m²/s`], ['kh', `${snapshot.dissipation.khMPerSecond.toExponential(5)} m/s`]], 1200);
  else drawText(ctx2, '当前点位未配置消散结果。', 100, 1480, 32, '#6c7d89');
  footer(ctx2, second.width, second.height, 2, totalPages);
  const outcomePages = Array.from({ length: outcomePageCount }, (_, pageIndex) => {
    const canvas = pageCanvas(1400, 1980);
    const outcomeContext = canvas.getContext('2d')!;
    pageBase(outcomeContext, canvas.width, canvas.height, '成果范围与排除声明', snapshot, `A4 报告 · 第 ${pageIndex + 1}/${outcomePageCount} 页`);
    sectionTitle(outcomeContext, 100, 330, '6  本次成果说明');
    drawText(outcomeContext, '所有局部忽略、强制忽略和明确不计算决定均属于本次冻结成果。', 100, 390, 25, '#a04452', '600');
    drawOutcomeTable(outcomeContext, 100, 500, outcomeLayouts[pageIndex], [220, 300, 680]);
    footer(outcomeContext, canvas.width, canvas.height, 3 + pageIndex, totalPages, snapshot);
    return canvas;
  });
  return [first, second, ...outcomePages];
}

function renderA3AtlasPages(snapshot: JtsOutputSnapshotV7) {
  const minDepth = Math.min(...snapshot.measuredRows.map((row) => row.depthM));
  const maxDepth = Math.max(...snapshot.measuredRows.map((row) => row.depthM));
  const depthPageCount = Math.max(1, Math.ceil((maxDepth - minDepth || 1) / 20));
  const parameterGroups = [...new Set(snapshot.parameterValues.map((item) => item.methodId))];
  const outcomeRows = outputOutcomeRows(snapshot);
  const outcomeLayouts = layoutOutputOutcomePages(outcomeRows, 1296, 18, 970);
  const outcomePageCount = outcomeLayouts.length;
  const totalPages = 1 + depthPageCount + parameterGroups.length + 1 + outcomePageCount;
  const pages: HTMLCanvasElement[] = [];

  const summary = pageCanvas(2400, 1697);
  const summaryContext = summary.getContext('2d')!;
  pageBase(summaryContext, summary.width, summary.height, 'CPT/CPTU 专业解译图册', snapshot, '成果来源与范围');
  sectionTitle(summaryContext, 120, 340, '本次成果来源');
  textRows(summaryContext, 120, 410, [
    ['分类方法', `${snapshot.classificationMethod?.label ?? '历史分类'} / ${snapshot.classificationMethod?.version ?? '历史版本'}`],
    ['方法参考', snapshot.classificationMethod?.reference ?? '历史成果未冻结方法参考'],
    ['分层方案', `${snapshot.reportSource?.schemeName ?? '当前确认方案'} / ${compactId(snapshot.authority.stratificationRevisionId)}`],
    ['深度范围', `${minDepth.toFixed(2)}–${maxDepth.toFixed(2)} m`],
    ['纳入参数', parameterGroups.length ? parameterGroups.map((id) => snapshot.formulaReferences?.find((item) => item.methodId === id)?.symbol ?? id).join('、') : '无'],
    ['成果边界', snapshot.notices.join('；')],
  ], 2160);
  sectionTitle(summaryContext, 120, 850, '工程师确认分层（原型成果，非设计值）');
  drawTable(summaryContext, 120, 920, ['层', '深度范围（m）', '工程土组'], snapshot.layers.slice(0, 10).map((layer) => [layer.name, `${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)}`, soilGroupLabel(layer.engineeringSoilGroup)]), [840, 620, 700]);
  footer(summaryContext, summary.width, summary.height, 1, totalPages, snapshot);
  pages.push(summary);

  Array.from({ length: depthPageCount }, (_, index) => {
    const canvas = pageCanvas(2400, 1697);
    const ctx = canvas.getContext('2d')!;
    const from = minDepth + index * 20;
    const to = Math.min(maxDepth, from + 20);
    pageBase(ctx, canvas.width, canvas.height, '测量曲线、分类与最终分层', snapshot, `深度 ${from.toFixed(2)}–${to.toFixed(2)} m`);
    drawDepthPlot(ctx, 120, 330, 2160, 1170, snapshot, from, to);
    footer(ctx, canvas.width, canvas.height, index + 2, totalPages, snapshot);
    pages.push(canvas);
  });

  parameterGroups.forEach((methodId, groupIndex) => {
    const canvas = pageCanvas(2400, 1697);
    const ctx = canvas.getContext('2d')!;
    const reference = snapshot.formulaReferences?.find((item) => item.methodId === methodId);
    const rows = snapshot.parameterRows?.filter((item) => item.methodId === methodId && item.status === 'value' && item.value !== null) ?? [];
    const representatives = snapshot.parameterValues.filter((item) => item.methodId === methodId);
    pageBase(ctx, canvas.width, canvas.height, `${reference?.symbol ?? representatives[0]?.symbol ?? methodId} 参数结果`, snapshot, '逐深度曲线与层代表值');
    drawParameterPage(ctx, snapshot, rows, representatives, reference);
    footer(ctx, canvas.width, canvas.height, 2 + depthPageCount + groupIndex, totalPages, snapshot);
    pages.push(canvas);
  });

  const formulaPage = pageCanvas(2400, 1697);
  const formulaContext = formulaPage.getContext('2d')!;
  pageBase(formulaContext, formulaPage.width, formulaPage.height, '本次实际采用的公式与参考', snapshot, '仅列入本次成果范围');
  sectionTitle(formulaContext, 120, 340, '公式、系数与来源');
  const formulaRows = [
    ['分类', `${snapshot.classificationMethod?.label ?? '历史分类'} / ${snapshot.classificationMethod?.version ?? '历史版本'}`, snapshot.classificationMethod?.reference ?? '历史成果未冻结方法参考'],
    ...(snapshot.formulaReferences?.map((item) => [item.symbol, item.formula, item.reference]) ?? []),
  ];
  drawTable(formulaContext, 120, 420, ['参数', '本次公式或系数', '参考'], formulaRows.length ? formulaRows : [['—', '本次未纳入参数公式', '—']], [280, 1160, 720]);
  const mappingSummary = snapshot.classificationMethod?.nativeMappings?.map((item) => `${item.classCode} ${item.classLabel}→${soilGroupLabel(item.engineeringGroup)}`).join('；');
  if (mappingSummary) drawText(formulaContext, truncateCanvasText(formulaContext, `类别映射（${snapshot.classificationMethod?.mappingVersion}）：${mappingSummary}`, 2160), 120, 990, 18, '#566771', '500');
  sectionTitle(formulaContext, 120, 1040, '成果范围');
  textRows(formulaContext, 120, 1110, [
    ['忽略与说明', `${outcomeRows.filter((row) => row[0] === '成果说明').length} 项，完整列于后续成果说明页`],
    ['明确不计算', `${snapshot.parameterExclusions?.length ?? 0} 项，完整列于后续成果说明页`],
  ], 2160);
  footer(formulaContext, formulaPage.width, formulaPage.height, 2 + depthPageCount + parameterGroups.length, totalPages, snapshot);
  pages.push(formulaPage);
  Array.from({ length: outcomePageCount }, (_, pageIndex) => {
    const canvas = pageCanvas(2400, 1697);
    const outcomeContext = canvas.getContext('2d')!;
    pageBase(outcomeContext, canvas.width, canvas.height, '成果范围与排除声明', snapshot, `完整记录 · 第 ${pageIndex + 1}/${outcomePageCount} 页`);
    sectionTitle(outcomeContext, 120, 340, '本次冻结成果的完整说明');
    drawText(outcomeContext, '参数曲线只绘制有效值；下列说明完整保留未绘制、忽略和排除的工程决定。', 120, 405, 22, '#a04452', '600');
    drawOutcomeTable(outcomeContext, 120, 500, outcomeLayouts[pageIndex], [320, 520, 1320]);
    footer(outcomeContext, canvas.width, canvas.height, 3 + depthPageCount + parameterGroups.length + pageIndex, totalPages, snapshot);
    pages.push(canvas);
  });
  return pages;
}

function outputOutcomeRows(snapshot: JtsOutputSnapshotV7) {
  const generalNotices = snapshot.notices
    .filter((notice) => !notice.startsWith('参数排除：'))
    .map((notice) => ['成果说明', notice.startsWith('参数局部忽略：') || notice.startsWith('参数强制忽略：') ? '参数点处理' : '适用边界', notice]);
  const exclusions = (snapshot.parameterExclusions ?? []).map((item) => [
    '明确不计算',
    `${item.symbol} ${item.label}`,
    `${item.reason}；决定时间：${item.decidedAt.slice(0, 19).replace('T', ' ')}`,
  ]);
  const rows = [...generalNotices, ...exclusions];
  return rows.length ? rows : [['成果说明', '无', '本次没有额外的忽略或排除决定。']];
}

type OutputOutcomeLayout = { cells: string[]; lines: string[]; height: number };

function layoutOutputOutcomePages(rows: string[][], descriptionWidth: number, fontSize: number, availableHeight: number) {
  const measure = pageCanvas(10, 10).getContext('2d')!;
  measure.font = `500 ${fontSize}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
  const lineHeight = fontSize + 8;
  const maximumLinesPerRecord = Math.max(1, Math.floor((availableHeight - 42) / lineHeight));
  const layouts = rows.flatMap((row): OutputOutcomeLayout[] => {
    const wrapped = wrapCanvasText(measure, row[2], descriptionWidth);
    const chunks: string[][] = [];
    for (let index = 0; index < wrapped.length; index += maximumLinesPerRecord) chunks.push(wrapped.slice(index, index + maximumLinesPerRecord));
    return chunks.map((lines, index) => ({
      cells: [index ? `${row[0]}（续）` : row[0], index ? `${row[1]}（续）` : row[1], row[2]],
      lines,
      height: Math.max(60, 24 + lines.length * lineHeight),
    }));
  });
  const pages: OutputOutcomeLayout[][] = [];
  layouts.forEach((layout) => {
    const current = pages.at(-1);
    const used = current?.reduce((sum, item) => sum + item.height, 0) ?? 0;
    if (!current || used + layout.height > availableHeight) pages.push([layout]);
    else current.push(layout);
  });
  return pages.length ? pages : [[{ cells: ['成果说明', '无', '本次没有额外的忽略或排除决定。'], lines: ['本次没有额外的忽略或排除决定。'], height: 60 }]];
}

function drawOutcomeTable(ctx: CanvasRenderingContext2D, x: number, y: number, rows: OutputOutcomeLayout[], widths: number[]) {
  const headers = ['类型', '项目', '说明'];
  const totalWidth = widths.reduce((sum, value) => sum + value, 0);
  let px = x;
  headers.forEach((header, index) => {
    ctx.fillStyle = '#edf1f2';
    ctx.fillRect(px, y - 42, widths[index], 56);
    ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1.5; ctx.strokeRect(px, y - 42, widths[index], 56);
    drawText(ctx, header, px + widths[index] / 2, y - 4, 21, '#172b33', '700', 'center');
    px += widths[index];
  });
  let rowTop = y + 14;
  rows.forEach((row) => {
    let cellX = x;
    row.cells.forEach((cell, index) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cellX, rowTop, widths[index], row.height);
      ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1; ctx.strokeRect(cellX, rowTop, widths[index], row.height);
      if (index < 2) {
        drawText(ctx, cell, cellX + widths[index] / 2, rowTop + Math.min(row.height / 2 + 6, 30), 18, '#243640', '500', 'center');
      } else {
        row.lines.forEach((line, lineIndex) => drawText(ctx, line, cellX + 12, rowTop + 27 + lineIndex * 26, 18, '#243640', '500'));
      }
      cellX += widths[index];
    });
    rowTop += row.height;
  });
  ctx.strokeStyle = '#20282d'; ctx.lineWidth = 2; ctx.strokeRect(x, y - 42, totalWidth, 56 + rows.reduce((sum, row) => sum + row.height, 0));
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, value: string, width: number) {
  if (!value) return [''];
  const lines: string[] = [];
  let current = '';
  Array.from(value).forEach((character) => {
    const candidate = `${current}${character}`;
    if (current && ctx.measureText(candidate).width > width) {
      lines.push(current);
      current = character;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function pageCanvas(width: number, height: number) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; }
function pageBase(ctx: CanvasRenderingContext2D, width: number, _height: number, title: string, snapshot: JtsOutputSnapshotV7, subtitle: string) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, ctx.canvas.height);
  ctx.strokeStyle = '#9aa9b1';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 48, 62, 62);
  ctx.beginPath();
  ctx.moveTo(74, 92); ctx.lineTo(91, 82); ctx.lineTo(109, 88);
  ctx.moveTo(74, 105); ctx.lineTo(91, 96); ctx.lineTo(109, 101);
  ctx.strokeStyle = '#4f8390'; ctx.lineWidth = 5; ctx.stroke();
  drawText(ctx, 'SIGS-OGLab', 142, 83, 30, '#17313b', '700');
  drawText(ctx, 'support', 142, 111, 18, '#71828a', '500');
  drawText(ctx, title, 90, 202, 44, '#172b33', '700');
  drawText(ctx, `${snapshot.projectName} · ${snapshot.pointName}`, width - 90, 74, 24, '#172b33', '700', 'right');
  drawText(ctx, subtitle, width - 90, 112, 20, '#71828a', '500', 'right');
  drawText(ctx, `${snapshot.classificationMethod?.label ?? '历史分类'} · ${snapshot.reportSource?.schemeName ?? '当前确认分层'}`, width - 90, 149, 18, '#71828a', '500', 'right');
  drawText(ctx, '原型成果 · 非设计值', width - 90, 210, 18, '#a04452', '700', 'right');
  ctx.fillStyle = '#d6dfe3';
  ctx.fillRect(90, 242, width - 180, 2);
}
function sectionTitle(ctx: CanvasRenderingContext2D, x: number, y: number, value: string) { drawText(ctx, value, x, y, 28, '#172b33', '700'); ctx.fillStyle = '#d6dfe3'; ctx.fillRect(x, y + 16, Math.min(2160, ctx.canvas.width - x * 2), 2); }
function drawText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight = '400', align: CanvasTextAlign = 'left') { ctx.font = `${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y); }
function textRows(ctx: CanvasRenderingContext2D, x: number, y: number, rows: string[][], width: number) { rows.forEach((row, index) => { const rowY = y + index * 62; ctx.fillStyle = index % 2 ? '#f7f9fa' : '#ffffff'; ctx.fillRect(x, rowY - 38, width, 54); drawText(ctx, row[0], x + 18, rowY, 24, '#647580'); drawText(ctx, row[1], x + 330, rowY, 24, '#14212b', '600'); }); }
function drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, headers: string[], rows: string[][], widths: number[]) {
  const totalWidth = widths.reduce((sum, value) => sum + value, 0);
  const rowHeight = 54;
  let px = x;
  headers.forEach((header, index) => {
    ctx.fillStyle = '#edf1f2';
    ctx.fillRect(px, y - 42, widths[index], 56);
    ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1.5; ctx.strokeRect(px, y - 42, widths[index], 56);
    drawText(ctx, header, px + widths[index] / 2, y - 4, 21, '#172b33', '700', 'center');
    px += widths[index];
  });
  rows.forEach((row, rowIndex) => {
    let cx = x;
    const rowY = y + 56 + rowIndex * rowHeight;
    row.forEach((cell, index) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, rowY - 40, widths[index], rowHeight);
      ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1; ctx.strokeRect(cx, rowY - 40, widths[index], rowHeight);
      drawText(ctx, truncateCanvasText(ctx, cell, widths[index] - 20), cx + widths[index] / 2, rowY - 5, 18, '#243640', '500', 'center');
      cx += widths[index];
    });
  });
  ctx.strokeStyle = '#20282d'; ctx.lineWidth = 2; ctx.strokeRect(x, y - 42, totalWidth, 56 + rows.length * rowHeight);
}
function drawDepthPlot(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, snapshot: JtsOutputSnapshotV7, fromOverride?: number, toOverride?: number) {
  const rows = snapshot.measuredRows.filter((row) => row.depthM >= (fromOverride ?? -Infinity) && row.depthM <= (toOverride ?? Infinity));
  const from = fromOverride ?? Math.min(...rows.map((row) => row.depthM));
  const to = toOverride ?? Math.max(...rows.map((row) => row.depthM));
  const range = Math.max(to - from, .1);
  const hasU2 = rows.some((row) => Number.isFinite(row.u2Kpa));
  const gap = 24;
  const curveCount = hasU2 ? 3 : 2;
  const curveWidth = hasU2 ? width * .205 : width * .26;
  const classificationWidth = width * .11;
  const classificationX = x + curveCount * (curveWidth + gap);
  const layerX = classificationX + classificationWidth + gap;
  const layerWidth = x + width - layerX;
  const visibleLayers = snapshot.layers.filter((layer) => layer.depthToM >= from && layer.depthFromM <= to);
  const curveTracks = [
    { key: 'qc' as const, title: '锥尖阻力 qc', unit: 'kPa', color: '#c94f4f', x },
    { key: 'fs' as const, title: '侧壁摩阻力 fs', unit: 'kPa', color: '#246b58', x: x + curveWidth + gap },
    ...(hasU2 ? [{ key: 'u2' as const, title: '孔隙水压力 u2', unit: 'kPa', color: '#356fae', x: x + (curveWidth + gap) * 2 }] : []),
  ];
  curveTracks.forEach((track) => drawOutputCurveTrack(ctx, track, rows, track.x, y, curveWidth, height, from, to));

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(classificationX, y, classificationWidth, height);
  const bands = buildJtsOutputClassificationBands(snapshot.classificationRows, from, to);
  bands.forEach((band) => {
    const top = y + (band.depthFromM - from) / range * height;
    const bottom = y + (band.depthToM - from) / range * height;
    const bandHeight = Math.max(0, bottom - top);
    ctx.save();
    ctx.globalAlpha = band.approximate ? .58 : 1;
    ctx.fillStyle = band.color;
    ctx.fillRect(classificationX, top, classificationWidth, bandHeight);
    ctx.restore();
    if (band.approximate) {
      ctx.fillStyle = '#efb75d';
      ctx.fillRect(classificationX, top, 4, bandHeight);
    }
    if (bandHeight >= 28) drawText(ctx, `${band.classCode}${band.approximate ? '*' : ''}`, classificationX + classificationWidth / 2, top + bandHeight / 2 + 7, 18, '#ffffff', '700', 'center');
  });
  ctx.strokeStyle = '#20282d';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(classificationX, y, classificationWidth, height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(layerX, y, layerWidth, height);
  ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1.5; ctx.strokeRect(layerX, y, layerWidth, height);
  visibleLayers.forEach((layer) => {
    const top = y + (Math.max(layer.depthFromM, from) - from) / range * height;
    const bottom = y + (Math.min(layer.depthToM, to) - from) / range * height;
    const colors = soilGroupColors(layer.engineeringSoilGroup);
    ctx.fillStyle = colors.fill; ctx.fillRect(layerX + 1, top, layerWidth - 2, Math.max(1, bottom - top));
    ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(layerX, top); ctx.lineTo(layerX + layerWidth, top); ctx.stroke();
    const layerHeight = bottom - top;
    if (layerHeight >= 30) drawText(ctx, `L${snapshot.layers.indexOf(layer) + 1} ${layer.name}`, layerX + 14, top + Math.min(24, layerHeight / 2 + 6), 17, colors.ink, '700');
    if (layerHeight >= 54) drawText(ctx, `${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)} m`, layerX + 14, top + 47, 15, colors.ink, '500');
  });

  drawText(ctx, snapshot.classificationMethod?.label ?? '分类证据', classificationX + classificationWidth / 2, y - 30, 18, '#172b33', '700', 'center');
  drawText(ctx, '工程师确认的最终分层', layerX + layerWidth / 2, y - 30, 18, '#172b33', '700', 'center');
  drawText(ctx, `${from.toFixed(2)} m`, x - 10, y + 10, 19, '#647580', '400', 'right');
  drawText(ctx, `${to.toFixed(2)} m`, x - 10, y + height, 19, '#647580', '400', 'right');
  drawClassificationLegend(ctx, x + 10, y + height + 46, width - 20, bands, bands.some((band) => band.approximate));
}

function drawOutputCurveTrack(
  ctx: CanvasRenderingContext2D,
  track: { key: 'qc' | 'fs' | 'u2'; title: string; unit: string; color: string },
  rows: JtsOutputSnapshotV7['measuredRows'],
  x: number,
  y: number,
  width: number,
  height: number,
  from: number,
  to: number,
) {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#20282d'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, width, height);
  const segments = splitOutputTrackSegments(rows, track.key);
  const values = segments.flat().map((point) => point.value);
  if (!values.length) return;
  let minimum = Math.min(...values); let maximum = Math.max(...values);
  if (minimum >= 0) minimum = 0;
  if (maximum === minimum) maximum = minimum + 1;
  const range = Math.max(to - from, .1);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  segments.forEach((segment) => {
    ctx.beginPath();
    segment.forEach((point, index) => {
      const px = x + 7 + (point.value - minimum) / (maximum - minimum) * (width - 14);
      const py = y + (point.depthM - from) / range * height;
      if (index) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.strokeStyle = track.color; ctx.lineWidth = 3; ctx.stroke();
  });
  ctx.restore();
  drawText(ctx, track.title, x + width / 2, y - 30, 18, '#172b33', '700', 'center');
  drawText(ctx, `${compactNumber(minimum)}–${compactNumber(maximum)} ${track.unit}`, x + width / 2, y + height + 24, 14, '#647580', '500', 'center');
}

function drawClassificationLegend(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, bands: JtsOutputClassificationBand[], hasApproximate: boolean) {
  const unique = [...new Map(bands.map((band) => [band.classCode, band])).values()];
  const itemWidth = width / Math.max(1, unique.length);
  const fontSize = Math.max(13, Math.min(18, width / 100));
  unique.forEach((band, index) => {
    const itemX = x + index * itemWidth;
    ctx.fillStyle = band.color;
    ctx.fillRect(itemX, y - 14, 12, 12);
    drawText(ctx, `${band.classCode} ${band.label}`, itemX + 18, y - 3, fontSize, '#566771', '600');
  });
  if (hasApproximate) drawText(ctx, '* 近似 CPT 分类（仅使用 Ic）', x + width, y + 25, fontSize - 1, '#9a6518', '500', 'right');
}

function drawParameterPage(
  ctx: CanvasRenderingContext2D,
  snapshot: JtsOutputSnapshotV7,
  rows: NonNullable<JtsOutputSnapshotV7['parameterRows']>,
  representatives: JtsOutputSnapshotV7['parameterValues'],
  reference?: NonNullable<JtsOutputSnapshotV7['formulaReferences']>[number],
) {
  sectionTitle(ctx, 120, 340, '逐深度结果');
  const plotX = 120; const plotY = 410; const plotWidth = 1120; const plotHeight = 980;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(plotX, plotY, plotWidth, plotHeight);
  ctx.strokeStyle = '#20282d'; ctx.lineWidth = 2; ctx.strokeRect(plotX, plotY, plotWidth, plotHeight);
  const depths = rows.map((row) => row.depthM);
  const values = rows.map((row) => row.value).filter((value): value is number => value !== null && Number.isFinite(value));
  if (depths.length && values.length) {
    const minDepth = Math.min(...snapshot.measuredRows.map((row) => row.depthM));
    const maxDepth = Math.max(...snapshot.measuredRows.map((row) => row.depthM));
    const dataMinimum = Math.min(...values);
    const dataMaximum = Math.max(...values);
    const valueSpan = dataMaximum - dataMinimum;
    const padding = valueSpan > 0
      ? valueSpan * .05
      : Math.max(Math.abs(dataMinimum) * .05, .5);
    const minimum = dataMinimum - padding;
    const maximum = dataMaximum + padding;
    const axisLeft = plotX + 100;
    const axisRight = plotX + plotWidth - 28;
    const axisWidth = axisRight - axisLeft;
    const depthSpan = Math.max(.1, maxDepth - minDepth);
    const depthTickCount = 6;
    ctx.save();
    ctx.strokeStyle = '#d7e0e4';
    ctx.lineWidth = 1;
    for (let tick = 0; tick <= depthTickCount; tick += 1) {
      const ratio = tick / depthTickCount;
      const py = plotY + ratio * plotHeight;
      ctx.beginPath(); ctx.moveTo(axisLeft, py); ctx.lineTo(axisRight, py); ctx.stroke();
      drawText(ctx, (minDepth + ratio * depthSpan).toFixed(2), axisLeft - 14, py + 6, 16, '#647580', '500', 'right');
    }
    for (let tick = 0; tick <= 4; tick += 1) {
      const ratio = tick / 4;
      const px = axisLeft + ratio * axisWidth;
      ctx.beginPath(); ctx.moveTo(px, plotY); ctx.lineTo(px, plotY + plotHeight); ctx.stroke();
      drawText(ctx, parameterAxisNumber(minimum + ratio * (maximum - minimum), maximum - minimum), px, plotY + plotHeight + 26, 15, '#647580', '500', 'center');
    }
    ctx.translate(plotX + 28, plotY + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    drawText(ctx, '深度（m）', 0, 0, 18, '#42545e', '600', 'center');
    ctx.restore();
    ctx.beginPath();
    let penDown = false;
    rows.forEach((row) => {
      if (row.value === null || !Number.isFinite(row.value)) {
        penDown = false;
        return;
      }
      const px = axisLeft + (row.value - minimum) / (maximum - minimum) * axisWidth;
      const py = plotY + (row.depthM - minDepth) / depthSpan * plotHeight;
      if (penDown) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      penDown = true;
    });
    ctx.strokeStyle = '#4f8390'; ctx.lineWidth = 4; ctx.stroke();
    drawText(ctx, `${rows[0]?.label ?? reference?.symbol ?? '参数'}（${rows[0]?.unit ?? ''}）`, axisLeft + axisWidth / 2, plotY + plotHeight + 58, 18, '#42545e', '600', 'center');
  } else {
    drawText(ctx, '本次没有可绘制的有效逐深度值。', plotX + plotWidth / 2, plotY + 80, 24, '#71828a', '500', 'center');
  }
  sectionTitle(ctx, 1320, 340, '层代表值');
  drawTable(ctx, 1320, 420, ['层', 'n', '中位数', '范围'], representatives.slice(0, 13).map((item) => {
    const layer = snapshot.layers.find((candidate) => candidate.layerId === item.layerId);
    return [layer?.name ?? item.layerId, String(item.count), item.median === null ? '—' : formatNumber(item.median), item.minimum === null || item.maximum === null ? '—' : `${formatNumber(item.minimum)}–${formatNumber(item.maximum)}`];
  }), [360, 120, 250, 350]);
  if (reference) {
    drawText(ctx, `公式：${reference.formula}`, 1320, 1260, 20, '#172b33', '600');
    drawText(ctx, `参考：${reference.reference}`, 1320, 1300, 18, '#647580', '500');
  }
}

function footer(ctx: CanvasRenderingContext2D, width: number, height: number, page: number, total: number, snapshot?: JtsOutputSnapshotV7) { ctx.fillStyle = '#dce5ea'; ctx.fillRect(90, height - 100, width - 180, 2); drawText(ctx, `SIGS-OGLab · ${snapshot?.classificationMethod?.label ?? 'CPT/CPTU 专业解译'} · ${page}/${total}`, 90, height - 52, 20, '#6a7c87'); }

function buildPdf(pages: Array<{ jpeg: Uint8Array; pixelWidth: number; pixelHeight: number }>, media: { width: number; height: number }, snapshot: JtsOutputSnapshotV7) {
  const objects: Uint8Array[] = [];
  const pageObjectIds = pages.map((_, index) => 3 + index * 3);
  objects[1] = ascii('<< /Type /Catalog /Pages 2 0 R >>');
  objects[2] = ascii(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  pages.forEach((page, index) => { const pageId = 3 + index * 3; const imageId = pageId + 1; const contentId = pageId + 2; const content = `q ${media.width} 0 0 ${media.height} 0 0 cm /Im${index} Do Q\nBT /F1 6 Tf 3 Tr 20 20 Td (${pdfEscape(`SIGS-OGLab JTS-T242 Project=${snapshot.projectId} Point=${snapshot.pointId} Page=${index + 1}/${pages.length}`)}) Tj ET`; objects[pageId] = ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${media.width} ${media.height}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`); objects[imageId] = streamObject(`<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`, page.jpeg); objects[contentId] = streamObject(`<< /Length ${ascii(content).length} >>`, ascii(content)); });
  const chunks: Uint8Array[] = [ascii('%PDF-1.7\n%SIGS-OGLab\n')]; const offsets = [0]; let offset = chunks[0].length; for (let id = 1; id < objects.length; id += 1) { offsets[id] = offset; const chunk = concat([ascii(`${id} 0 obj\n`), objects[id], ascii('\nendobj\n')]); chunks.push(chunk); offset += chunk.length; } const xrefOffset = offset; chunks.push(ascii(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)); return concat(chunks);
}

function ascii(value: string) { return new TextEncoder().encode(value); }
function concat(chunks: Uint8Array[]) { const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0)); let offset = 0; chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.length; }); return result; }
function streamObject(dictionary: string, bytes: Uint8Array) { return concat([ascii(`${dictionary}\nstream\n`), bytes, ascii('\nendstream')]); }
function dataUrlBytes(value: string) { const binary = atob(value.slice(value.indexOf(',') + 1)); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
function pdfEscape(value: string) { return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function formatNumber(value: number) { return Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < .001) ? value.toExponential(4) : value.toFixed(3); }
function compactNumber(value: number) { return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.abs(value) < 0.1 && value !== 0 ? value.toExponential(1) : value.toFixed(1); }
function parameterAxisNumber(value: number, span: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(span < 100 ? 2 : 1)}k`;
  if (span < 0.1) return value.toFixed(3);
  if (span < 1) return value.toFixed(2);
  if (span < 10) return value.toFixed(1);
  return value.toFixed(0);
}
function soilGroupLabel(group: string) { return group === 'sand' ? '砂土' : group === 'mixed' ? '粉土/过渡土' : group === 'clay' ? '黏性土' : '未分类'; }
function soilGroupColors(group: string) { return group === 'sand' ? { fill: '#f2d66b', ink: '#5d4915' } : group === 'mixed' ? { fill: '#9fd8ea', ink: '#174b5b' } : group === 'clay' ? { fill: '#9a7258', ink: '#ffffff' } : { fill: '#d9dfe2', ink: '#394950' }; }
function truncateCanvasText(ctx: CanvasRenderingContext2D, value: string, width: number) { if (ctx.measureText(value).width <= width) return value; let text = value; while (text.length > 1 && ctx.measureText(`${text}…`).width > width) text = text.slice(0, -1); return `${text}…`; }
function compactId(value: string) { return value.length > 56 ? `${value.slice(0, 28)}…${value.slice(-20)}` : value; }
function safeName(value: string) { return value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_') || 'point'; }
function createId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
