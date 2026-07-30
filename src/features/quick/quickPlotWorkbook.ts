import { strToU8, zipSync } from 'fflate';
import {
  deriveQuickPlotRows,
  QUICK_PLOT_FORMULAS,
  QUICK_PLOT_REFERENCES,
  quickPlotInputHash,
  quickPlotRoute,
  type QuickDerived,
  type QuickPlotRevisionV1,
  type QuickPlotWorkspaceV1,
} from './quickPlotDomain';

type Cell = string | number | null;
type Sheet = { name: string; rows: Cell[][] };

export async function createQuickPlotXlsx(workspace: QuickPlotWorkspaceV1, revision: QuickPlotRevisionV1) {
  if (revision.inputHash !== quickPlotInputHash(workspace)) throw new Error('快捷图册已过期，请重新生成后再导出 Excel。');
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
  const derived = deriveQuickPlotRows(workspace.rows, workspace.settings);
  const derivedBySource = new Map(derived.map((row) => [row.sourceRowId, row]));
  return buildSimpleWorkbook([
    { name: '原始数据', rows: [
      ['源行ID', '深度(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)'],
      ...workspace.rows.map((row) => [row.rowId, row.depthM, row.qcMpa, row.fsKpa, row.u2Kpa]),
    ] },
    { name: '快捷解译结果', rows: [
      ['源行ID', '深度(m)', '状态', '路线', 'qt(kPa)', 'qnet(kPa)', 'Rf(%)', 'Fr(%)', 'JTS Qtn* (-)', 'Bq (-)', 'JTS Ic (-)', 'JTS Zone (-)', 'Robertson Qtn (-)', 'Robertson Ic (-)', 'Robertson n (-)', 'Modified Robertson 2016', 'IB (-)', 'CD (-)', 'Schneider 2008', '土类大类', 'k(m/s)', 'N(击/0.30m)', 'Es(R05)(MPa)', 'Dr(%)', 'φ′(°)', 'Es(JTS 7.2.8)(MPa)', 'G0(MPa)', 'Su峰值(kPa)', 'Su重塑后(kPa)', 'Su/σ′v0 (-)', 'Su(r)/σ′v0 (-)', 'OCR (-)', 'Vs(m/s)', 'K0 (-)', 'Qtn,cs (-)', 'ψ (-)', 'St (-)', 'γsat(kN/m³)', 'e (-)', 'w(%)', 'γd(kN/m³)', 'n (-)'],
      ...workspace.rows.map((row) => interpretationRow(row.rowId, row.depthM, derivedBySource.get(row.rowId) ?? null)),
    ] },
    { name: '设置与方法', rows: settingsAndMethods(workspace, revision, derived.length) },
  ]);
}

function interpretationRow(sourceRowId: string, depthM: number, row: QuickDerived | null): Cell[] {
  if (!row) return [sourceRowId, depthM, '本行无有效解译结果', null];
  return [
    sourceRowId, depthM, '已解译', row.route === 'full_cptu' ? 'CPTU（该行 u2 有效）' : 'CPT（该行未使用 u2）', row.qtKpa, row.qnetKpa,
    row.rfPercent, row.frPercent, row.qtn, row.bq, row.ic, row.zone,
    row.robertsonQtn, row.robertsonIc, row.robertsonExponentN, row.robertson2016?.code ?? null, row.robertson2016?.ib ?? null, row.robertson2016?.cd ?? null, row.schneider2008?.code ?? null,
    majorLabel(row.major), row.permeability,
    row.sptN, row.esMpa, row.drPercent, row.phiDeg, row.jtsCompressionModulusMpa, row.g0Mpa, row.suKpa, row.suRemoldedKpa, row.suRatio, row.residualStrengthRatio,
    row.ocr, row.vsMps, row.k0, row.qtnCs, row.stateParameter, row.sensitivity, row.gammaSatKnM3,
    row.voidRatio, row.waterContentPercent, row.dryUnitWeight, row.porosity,
  ];
}

function settingsAndMethods(workspace: QuickPlotWorkspaceV1, revision: QuickPlotRevisionV1, interpretedRows: number): Cell[][] {
  const route = quickPlotRoute(workspace.rows, workspace.settings); const u2Count = workspace.rows.filter((row) => row.u2Kpa !== null && Number.isFinite(row.u2Kpa)).length;
  return [
    ['项目', workspace.settings.projectName],
    ['孔位', workspace.settings.pointName],
    ['来源', workspace.sourceName],
    ['原始行数', workspace.rows.length],
    ['有效解译行数', interpretedRows],
    ['路线', route === 'full_cptu' ? `CPTU：u2 有效 ${u2Count}/${workspace.rows.length} 行` : route === 'partial_cptu' ? `CPTU：u2 有效 ${u2Count}/${workspace.rows.length} 行（孔压方法逐行计算）` : workspace.settings.u2Usage === 'raw_only' ? `CPT：u2 仅展示 ${u2Count}/${workspace.rows.length} 行` : 'CPT近似（u2不足）'],
    ['水深(m)', workspace.settings.waterDepthM],
    ['u2 使用方式', workspace.settings.u2Usage === 'total' ? '总孔压；泥面零点' : workspace.settings.u2Usage === 'raw_only' ? '仅展示，不参与孔压方法' : '未提供足够 u2'],
    ['u2 基准已确认', workspace.settings.pressureBasisConfirmed ? '是' : '否'],
    ['试验深度零点', '泥面向下'],
    ['有效面积比 a', workspace.settings.effectiveAreaRatio],
    ['参考压力 pa(kPa)', 100],
    ['水重度 γw(kN/m³)', 10],
    ['土粒比重 Gs(-)', 2.65],
    ['不排水强度系数 Nkt(-)', 15.5],
    ['灵敏度系数 Ns(-)', 6.3],
    ['方法包', 'QP-1.0'],
    ['图册修订', revision.revisionId],
    ['输入哈希', revision.inputHash],
    ['生成时间', revision.createdAt],
    [],
    ['方法库公式索引（含本次未使用项）'],
    ...QUICK_PLOT_FORMULAS.map((formula) => [formula]),
    [],
    ['参考文献'],
    ...QUICK_PLOT_REFERENCES.map(([id, reference]) => [id, reference]),
  ];
}

function buildSimpleWorkbook(sheets: Sheet[]) {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    '_rels/.rels': xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': xml('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'),
  };
  sheets.forEach((sheet, index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet.rows); });
  return zipSync(files, { level: 6 });
}

function worksheetXml(rows: Cell[][]) {
  const lastColumn = columnName(Math.max(0, ...rows.map((row) => row.length - 1)));
  const lastRow = Math.max(rows.length, 1);
  return xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cellXml(value, columnIndex, rowIndex)).join('')}</row>`).join('')}</sheetData>${rows.length > 1 && rows[0].length > 1 ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` : ''}</worksheet>`);
}

function cellXml(value: Cell, columnIndex: number, rowIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${rowIndex === 0 ? ' s="1"' : ''}><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ''}><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function majorLabel(major: QuickDerived['major']) { return major === 'sand' ? '砂土' : major === 'silt' ? '粉土' : major === 'clay' ? '黏土' : '未分类'; }
function columnName(index: number) { let value = index + 1; let name = ''; while (value) { const remainder = (value - 1) % 26; name = String.fromCharCode(65 + remainder) + name; value = Math.floor((value - 1) / 26); } return name; }
function xml(value: string) { return strToU8(value); }
function escapeXml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
