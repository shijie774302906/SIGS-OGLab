import { strToU8, zipSync } from 'fflate';
import type { JtsOutputSnapshotV7 } from '../workspace/workspaceV2';

const STRATIGRAPHY_PIXELS_PER_METRE = 40;
const STRATIGRAPHY_MIN_PLOT_HEIGHT = 1200;
const STRATIGRAPHY_MAX_PLOT_HEIGHT = 12_000;
const STRATIGRAPHY_IMAGE_WIDTH = 1800;
const STRATIGRAPHY_HEADER_HEIGHT = 210;
const STRATIGRAPHY_FOOTER_HEIGHT = 64;
const EXCEL_EMU_PER_PIXEL = 9525;

type WorkbookSheet = {
  name: string;
  rows: Array<Array<string | number | null>>;
  drawing?: { image: Uint8Array; width: number; height: number; anchorRow: number };
};

type Track = {
  key: 'qc' | 'fs' | 'u2';
  label: string;
  unit: string;
  color: string;
  x: number;
  width: number;
  value: (row: JtsOutputSnapshotV7['measuredRows'][number]) => number | null;
};

export function splitOutputTrackSegments(rows: JtsOutputSnapshotV7['measuredRows'], key: Track['key']) {
  const value = key === 'qc' ? (row: JtsOutputSnapshotV7['measuredRows'][number]) => row.qcKpa
    : key === 'fs' ? (row: JtsOutputSnapshotV7['measuredRows'][number]) => row.fsKpa
      : (row: JtsOutputSnapshotV7['measuredRows'][number]) => row.u2Kpa;
  const ordered = [...rows].sort((left, right) => left.depthM - right.depthM);
  const gapThreshold = measuredGapThreshold(ordered.map((row) => row.depthM));
  const segments: Array<Array<{ depthM: number; value: number }>> = [];
  let current: Array<{ depthM: number; value: number }> = [];
  let previousDepth: number | null = null;
  const flush = () => { if (current.length) segments.push(current); current = []; };
  ordered.forEach((row) => {
    const currentValue = value(row);
    if (!Number.isFinite(currentValue) || (previousDepth !== null && row.depthM - previousDepth > gapThreshold)) flush();
    if (Number.isFinite(currentValue)) current.push({ depthM: row.depthM, value: currentValue as number });
    previousDepth = row.depthM;
  });
  flush();
  return segments;
}

export function stratigraphyPlotHeightForRange(rangeM: number) {
  if (!Number.isFinite(rangeM) || rangeM <= 0) throw new Error('地层图深度范围无效。');
  const height = Math.max(STRATIGRAPHY_MIN_PLOT_HEIGHT, Math.round(rangeM * STRATIGRAPHY_PIXELS_PER_METRE));
  if (height > STRATIGRAPHY_MAX_PLOT_HEIGHT) throw new Error(`地层图深度范围 ${rangeM.toFixed(2)} m 超过单张长图安全上限，请缩小导出范围后重试。`);
  return height;
}

export function stratigraphyPixelsPerMetreForRange(rangeM: number) {
  return stratigraphyPlotHeightForRange(rangeM) / rangeM;
}

export async function createJtsOutputWorkbook(snapshot: JtsOutputSnapshotV7) {
  // Give React a frame to paint the running/disabled state before the
  // comparatively expensive long-chart rasterisation starts.
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const chart = renderStratigraphyChart(snapshot);
  const sheets = workbookSheets(snapshot, chart);
  const drawingSheetIndex = sheets.findIndex((sheet) => sheet.drawing);
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${drawingSheetIndex >= 0 ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''}</Types>`),
    '_rels/.rels': xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><sz val="10"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EDF1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF20282D"/></left><right style="thin"><color rgb="FF20282D"/></right><top style="thin"><color rgb="FF20282D"/></top><bottom style="thin"><color rgb="FF20282D"/></bottom><diagonal/></border></borders><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>'),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet.rows, Boolean(sheet.drawing));
  });
  if (drawingSheetIndex >= 0) {
    const drawing = sheets[drawingSheetIndex].drawing!;
    const sheetNumber = drawingSheetIndex + 1;
    files[`xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`] = xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
    files['xl/drawings/drawing1.xml'] = drawingXml(drawing.width, drawing.height, drawing.anchorRow);
    files['xl/drawings/_rels/drawing1.xml.rels'] = xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/stratigraphy.png"/></Relationships>');
    files['xl/media/stratigraphy.png'] = drawing.image;
  }
  return zipSync(files, { level: 6 });
}

function workbookSheets(snapshot: JtsOutputSnapshotV7, chart: { image: Uint8Array; width: number; height: number; from: number; to: number; hasU2: boolean; pixelsPerMetre: number; shortRangeEnlarged: boolean }) {
  const layerById = new Map(snapshot.layers.map((layer, index) => [layer.layerId, { ...layer, number: index + 1 }]));
  const parameterRows = snapshot.parameterRows?.length
    ? [['源行', '深度(m)', '层号', '层名', '工程土组', '方法ID', '参数', '单位', '状态', '结果', '原因/说明'], ...[...snapshot.parameterRows]
      .sort((left, right) => left.depthM - right.depthM || left.methodId.localeCompare(right.methodId))
      .map((item) => {
        const layer = layerById.get(item.layerId);
        return [
          item.sourceRowId,
          item.depthM,
          layer ? `L${layer.number}` : item.layerId,
          layer?.name ?? item.layerId,
          soilGroupLabel(layer?.engineeringSoilGroup),
          item.methodId,
          `${item.symbol} · ${item.label}`,
          item.unit,
          parameterStatusLabel(item.status, item.ignoreKind),
          item.status === 'value' ? item.value : null,
          [item.reason, ...item.notices].filter(Boolean).join('；'),
        ];
      })]
    : [['状态'], ['历史成果未冻结逐深度参数明细；未使用当前参数结果回填。']];
  const sheets: WorkbookSheet[] = [
    { name: '元数据', rows: [
      ['项目', snapshot.projectName], ['点位', snapshot.pointName], ['生成时间', snapshot.generatedAt], ['成果声明', '原型解译成果，不作为设计值或正式采纳文件。'],
      ['分类方法', snapshot.classificationMethod?.label ?? '历史分类'], ['分类版本', snapshot.classificationMethod?.version ?? '历史版本'], ['分类映射版本', snapshot.classificationMethod?.mappingVersion ?? '历史版本'],
      ['报告来源方案', snapshot.reportSource?.schemeName ?? '当前确认方案'], ['报告来源方案ID', snapshot.reportSource?.schemeId ?? '历史记录'],
      ['检查运行', snapshot.authority.checkRunId], ['分类运行', snapshot.authority.classificationRunId], ['分类结果哈希', snapshot.authority.classificationResultHash], ['分层修订', snapshot.authority.stratificationRevisionId], ['参数包运行', snapshot.authority.parameterPackageRunId], ['参数结果哈希', snapshot.authority.parameterPackageResultHash], ['消散结果修订', snapshot.authority.dissipationResultRevisionId ?? '未配置'],
      ...snapshot.notices.map((notice) => ['说明', notice]),
    ] },
    { name: '测量数据', rows: [['源行', '深度(m)', 'qc(kPa)', 'fs(kPa)', 'u2(kPa)'], ...snapshot.measuredRows.map((row) => [row.sourceRowId, row.depthM, row.qcKpa, row.fsKpa, row.u2Kpa])] },
    { name: '分类结果', rows: [['源行', '深度(m)', 'Qtn', 'Ic', '原生类别ID', '类别代码', '原生类别', '工程大类映射', '置信状态', '路线'], ...snapshot.classificationRows.map((row) => [row.sourceRowId, row.depthM, row.qtn, row.ic, row.soilClassId, row.classCode ?? null, row.label, soilGroupLabel(row.engineeringGroup ?? undefined), row.confidence ?? '历史结果', row.approximate ? 'CPT 近似路线' : '完整 CPTU 路线'])] },
    { name: '地层分层', rows: [['层号', '层ID', '名称', '顶深(m)', '底深(m)', '厚度(m)', '工程土组'], ...snapshot.layers.map((layer, index) => [`L${index + 1}`, layer.layerId, layer.name, layer.depthFromM, layer.depthToM, layer.depthToM - layer.depthFromM, soilGroupLabel(layer.engineeringSoilGroup)])] },
    { name: '参数结果', rows: parameterRows },
    { name: '参数代表值', rows: [['层号', '层ID', '层名', '顶深(m)', '底深(m)', '工程土组', '方法ID', '符号', '单位', '有效数', '最小值', '中位数', '最大值'], ...snapshot.parameterValues.map((item) => {
      const layer = layerById.get(item.layerId);
      return [layer ? `L${layer.number}` : item.layerId, item.layerId, layer?.name ?? item.layerId, layer?.depthFromM ?? null, layer?.depthToM ?? null, soilGroupLabel(layer?.engineeringSoilGroup), item.methodId, item.symbol, item.unit, item.count, item.minimum, item.median, item.maximum];
    })] },
    { name: '公式与参考', rows: [
      ['类型', '标识', '本次公式、类别或映射', '参考/版本'],
      ['分类方法', snapshot.classificationMethod?.methodId ?? '历史分类', snapshot.classificationMethod?.label ?? '历史分类', `${snapshot.classificationMethod?.reference ?? '未冻结'}；${snapshot.classificationMethod?.version ?? '历史版本'}`],
      ...(snapshot.classificationMethod?.nativeMappings?.map((item) => ['类别映射', item.classCode, `${item.classLabel} → ${soilGroupLabel(item.engineeringGroup)}`, snapshot.classificationMethod?.mappingVersion ?? '历史版本']) ?? []),
      ...(snapshot.formulaReferences?.map((item) => ['参数公式', `${item.methodId} / ${item.symbol}`, item.formula, item.reference]) ?? []),
    ] },
    { name: '地层图', rows: [
      ['地层图', `${snapshot.projectName} / ${snapshot.pointName}`],
      ['冻结分层修订', snapshot.authority.stratificationRevisionId],
      ['深度范围(m)', `${chart.from.toFixed(2)}–${chart.to.toFixed(2)}`],
      ['显示方式', chart.shortRangeEnlarged ? '短孔适读放大（各轨道共享深度轴）' : '按深度同比例长图'],
      ['轨道', chart.hasU2 ? 'qc / fs / u2 / 地层柱' : 'qc / fs / 地层柱；u2 不可用，未绘制零值曲线'],
      ['说明', '图片在点击生成时由冻结快照创建；后续修改不会改变本文件。'],
    ], drawing: { image: chart.image, width: chart.width, height: chart.height, anchorRow: 7 } },
    { name: '消散试验', rows: snapshot.dissipation ? [['试验修订', 't50(s)', 't50来源', 'Ch(m2/s)', 'kh(m/s)'], [snapshot.dissipation.testRevisionId, snapshot.dissipation.t50Seconds, snapshot.dissipation.t50Origin, snapshot.dissipation.chM2PerSecond, snapshot.dissipation.khMPerSecond]] : [['状态'], ['未配置当前消散结果']] },
  ];
  if (snapshot.parameterExclusions?.length) sheets.splice(sheets.length - 1, 0, { name: '参数排除', rows: [
    ['方法ID', '参数', '范围等级', '适用层ID', '不计算原因', '决定时间'],
    ...snapshot.parameterExclusions.map((item) => [item.methodId, `${item.symbol} ${item.label}`, item.level === 'required' ? '本次默认纳入' : item.level === 'recommended' ? '建议纳入' : '按需纳入', item.applicableLayerIds.join('、'), item.reason, item.decidedAt]),
  ] });
  return sheets;
}

function renderStratigraphyChart(snapshot: JtsOutputSnapshotV7) {
  const depths = [...snapshot.measuredRows.map((row) => row.depthM), ...snapshot.layers.flatMap((layer) => [layer.depthFromM, layer.depthToM])].filter(Number.isFinite);
  if (!depths.length) throw new Error('地层图缺少有效深度，未生成成果修订');
  const from = Math.min(...depths);
  const to = Math.max(...depths);
  const range = Math.max(to - from, 0.1);
  const desiredHeight = stratigraphyPlotHeightForRange(range);
  const pixelsPerMetre = desiredHeight / range;
  const shortRangeEnlarged = pixelsPerMetre > STRATIGRAPHY_PIXELS_PER_METRE + 0.05;
  const canvas = document.createElement('canvas');
  canvas.width = STRATIGRAPHY_IMAGE_WIDTH;
  canvas.height = STRATIGRAPHY_HEADER_HEIGHT + desiredHeight + STRATIGRAPHY_FOOTER_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器无法创建地层图画布');
  const hasU2 = snapshot.measuredRows.some((row) => Number.isFinite(row.u2Kpa));
  const plotTop = STRATIGRAPHY_HEADER_HEIGHT;
  const plotBottom = plotTop + desiredHeight;
  const plotLeft = 126;
  const plotRight = canvas.width - 54;
  const gap = 18;
  const curveWidth = hasU2 ? 390 : 500;
  const layerX = plotLeft + curveWidth * (hasU2 ? 3 : 2) + gap * (hasU2 ? 3 : 2);
  const layerWidth = plotRight - layerX;
  const tracks: Track[] = [
    { key: 'qc', label: '锥尖阻力 qc', unit: 'kPa', color: '#c94f4f', x: plotLeft, width: curveWidth, value: (row) => row.qcKpa },
    { key: 'fs', label: '侧壁摩阻力 fs', unit: 'kPa', color: '#246b58', x: plotLeft + curveWidth + gap, width: curveWidth, value: (row) => row.fsKpa },
    ...(hasU2 ? [{ key: 'u2' as const, label: '孔隙水压力 u2', unit: 'kPa', color: '#356fae', x: plotLeft + (curveWidth + gap) * 2, width: curveWidth, value: (row: JtsOutputSnapshotV7['measuredRows'][number]) => row.u2Kpa }] : []),
  ];
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCanvasText(ctx, 'CPT/CPTU 曲线与地层柱', 42, 46, 30, '#18222a', '700');
  drawCanvasText(ctx, `点位 ${snapshot.pointName} · 深度 ${from.toFixed(2)}–${to.toFixed(2)} m`, 42, 82, 18, '#66737e', '500');
  drawCanvasText(ctx, `原型解译成果；来源快照已冻结${shortRangeEnlarged ? '；短孔适读放大' : ''}`, 42, 116, 16, '#a83b52', '600');
  tracks.forEach((track) => drawTrackFrame(ctx, track, plotTop, desiredHeight, snapshot.measuredRows, from, to));
  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(layerX, plotTop, layerWidth, desiredHeight);
  ctx.strokeStyle = '#cbd9e2';
  ctx.strokeRect(layerX, plotTop, layerWidth, desiredHeight);
  drawCanvasText(ctx, '地层柱', layerX + 12, plotTop - 48, 20, '#18222a', '700');
  drawCanvasText(ctx, '层号 / 土类 / 深度', layerX + 12, plotTop - 20, 15, '#66737e', '500');
  const depthY = (depth: number) => plotTop + (depth - from) / range * desiredHeight;
  const tickStep = depthTickStep(range);
  const firstTick = Math.ceil(from / tickStep) * tickStep;
  const endpointLabelClearanceM = range * 22 / desiredHeight;
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.lineWidth = 1;
  for (let depth = firstTick; depth <= to + 1e-8; depth += tickStep) {
    const y = depthY(depth);
    ctx.strokeStyle = '#e2eaf0';
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    if (Math.abs(depth - from) > endpointLabelClearanceM && Math.abs(to - depth) > endpointLabelClearanceM) {
      drawCanvasText(ctx, `${depth.toFixed(tickStep < 1 ? 1 : 0)} m`, plotLeft - 14, y + 5, 14, '#66737e', '500', 'right');
    }
  }
  ctx.restore();
  snapshot.layers.forEach((layer, index) => {
    const top = depthY(layer.depthFromM);
    const bottom = depthY(layer.depthToM);
    const height = Math.max(1, bottom - top);
    const colors = soilGroupColors(layer.engineeringSoilGroup);
    ctx.fillStyle = colors.fill;
    ctx.fillRect(layerX + 1, top, layerWidth - 2, height);
    if (height >= 14) drawCanvasText(ctx, `L${index + 1}`, layerX + 14, top + Math.min(23, height - 3), 15, colors.ink, '700');
    if (height >= 34) drawCanvasText(ctx, `${layer.name} · ${soilGroupLabel(layer.engineeringSoilGroup)}`, layerX + 62, top + 22, 15, colors.ink, '600');
    if (height >= 52) drawCanvasText(ctx, `${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)} m`, layerX + 62, top + 43, 13, colors.ink, '500');
  });
  const seams = [...new Set(snapshot.layers.slice(0, -1).map((layer) => layer.depthToM))].filter((depth) => depth > from && depth < to);
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7c68d7';
  seams.forEach((depth) => {
    const y = depthY(depth);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
  });
  ctx.restore();
  drawCanvasText(ctx, `${from.toFixed(2)} m`, plotLeft - 14, plotTop + 5, 14, '#66737e', '500', 'right');
  drawCanvasText(ctx, `${to.toFixed(2)} m`, plotLeft - 14, plotBottom, 14, '#66737e', '500', 'right');
  drawCanvasText(ctx, '砂土', plotLeft, plotBottom + 38, 14, '#7a621e', '600');
  drawCanvasText(ctx, '粉土/过渡土', plotLeft + 76, plotBottom + 38, 14, '#276575', '600');
  drawCanvasText(ctx, '黏性土', plotLeft + 204, plotBottom + 38, 14, '#6d4a37', '600');
  drawCanvasText(ctx, '曲线断开＝该通道缺测或真实深度间断；未用零值补线', plotLeft + 270, plotBottom + 38, 14, '#66737e', '500');
  const image = dataUrlBytes(canvas.toDataURL('image/png'));
  return { image, width: canvas.width, height: canvas.height, from, to, hasU2, pixelsPerMetre, shortRangeEnlarged };
}

function drawTrackFrame(ctx: CanvasRenderingContext2D, track: Track, top: number, height: number, rows: JtsOutputSnapshotV7['measuredRows'], depthMinimum: number, depthMaximum: number) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(track.x, top, track.width, height);
  ctx.strokeStyle = '#cbd9e2';
  ctx.strokeRect(track.x, top, track.width, height);
  drawCanvasText(ctx, track.label, track.x + 10, top - 48, 20, track.color, '700');
  drawCanvasText(ctx, track.unit, track.x + track.width - 8, top - 48, 14, '#66737e', '500', 'right');
  const finite = rows.map(track.value).filter((value): value is number => Number.isFinite(value));
  if (!finite.length) {
    drawCanvasText(ctx, '无有效测量', track.x + track.width / 2, top + 42, 16, '#98a5ae', '500', 'center');
    return;
  }
  let minimum = Math.min(...finite);
  let maximum = Math.max(...finite);
  if (minimum >= 0) minimum = 0;
  if (maximum <= 0) maximum = 0;
  if (maximum === minimum) maximum = minimum + 1;
  const padding = (maximum - minimum) * 0.04;
  minimum -= padding;
  maximum += padding;
  const depthRange = Math.max(depthMaximum - depthMinimum, 0.1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(track.x, top, track.width, height);
  ctx.clip();
  ctx.beginPath();
  splitOutputTrackSegments(rows, track.key).forEach((segment) => {
    segment.forEach((point, index) => {
      const x = track.x + 8 + (point.value - minimum) / (maximum - minimum) * (track.width - 16);
      const y = top + (point.depthM - depthMinimum) / depthRange * height;
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
  });
  ctx.strokeStyle = track.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
  drawCanvasText(ctx, compactNumber(minimum), track.x + 4, top - 18, 12, '#66737e', '500');
  drawCanvasText(ctx, compactNumber(maximum), track.x + track.width - 4, top - 18, 12, '#66737e', '500', 'right');
}

function worksheetXml(rows: Array<Array<string | number | null>>, hasDrawing: boolean) {
  const lastColumn = columnName(Math.max(0, ...rows.map((row) => row.length - 1)));
  const lastRow = Math.max(rows.length, 1);
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
    const width = Math.min(42, Math.max(10, ...rows.map((row) => String(row[columnIndex] ?? '').length + 2)));
    return `<col min="${columnIndex + 1}" max="${columnIndex + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cellXml(value, columnIndex, rowIndex)).join('')}</row>`).join('')}</sheetData>${rows.length > 1 && rows[0].length > 1 && !hasDrawing ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` : ''}${hasDrawing ? '<drawing r:id="rId1"/>' : ''}</worksheet>`);
}

function drawingXml(width: number, height: number, anchorRow: number) {
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${anchorRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${width * EXCEL_EMU_PER_PIXEL}" cy="${height * EXCEL_EMU_PER_PIXEL}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="CPT-CPTU-Stratigraphy" descr="qc fs u2 and final stratigraphy at a shared depth scale"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width * EXCEL_EMU_PER_PIXEL}" cy="${height * EXCEL_EMU_PER_PIXEL}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
}

function cellXml(value: string | number | null, columnIndex: number, rowIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
  if (value === null) return '';
  const style = rowIndex === 0 ? 1 : 2;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function columnName(index: number) { let value = index + 1; let name = ''; while (value) { const remainder = (value - 1) % 26; name = String.fromCharCode(65 + remainder) + name; value = Math.floor((value - 1) / 26); } return name; }
function xml(value: string) { return strToU8(value); }
function escapeXml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function dataUrlBytes(value: string) { const binary = atob(value.slice(value.indexOf(',') + 1)); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); }
function drawCanvasText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, weight = '400', align: CanvasTextAlign = 'left') { ctx.font = `${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y); }
function soilGroupLabel(group: string | undefined) { return ({ sand: '砂土', mixed: '混合土', clay: '黏性土', unclassified: '未分类' } as Record<string, string>)[group ?? ''] ?? group ?? '未分类'; }
function soilGroupColors(group: string) { return group === 'sand' ? { fill: '#f2d66b', ink: '#5d4915' } : group === 'mixed' ? { fill: '#9fd8ea', ink: '#174b5b' } : group === 'clay' ? { fill: '#9a7258', ink: '#ffffff' } : { fill: '#f1f6f9', ink: '#66737e' }; }
function parameterStatusLabel(status: NonNullable<JtsOutputSnapshotV7['parameterRows']>[number]['status'], ignoreKind: 'ordinary' | 'forced' | null) { if (status === 'value') return '有效'; if (status === 'ignored') return ignoreKind === 'forced' ? '工程师强制忽略' : '本次局部忽略'; return status === 'pending_confirmation' ? '待确认' : status === 'problem' ? '存在问题' : '无法计算'; }
function compactNumber(value: number) { return Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.abs(value) < 0.1 && value !== 0 ? value.toExponential(1) : value.toFixed(1); }
function depthTickStep(range: number) { const target = range / 16; return [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find((step) => step >= target) ?? 200; }
function measuredGapThreshold(depths: number[]) { const sorted = [...new Set(depths.filter(Number.isFinite))].sort((a, b) => a - b); const gaps = sorted.slice(1).map((depth, index) => depth - sorted[index]).filter((gap) => gap > 1e-8); if (!gaps.length) return 0.05; const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]; return Math.max(0.05, median * 5); }
