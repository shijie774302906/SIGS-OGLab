import type { CellValue, Sheet } from 'read-excel-file/browser';
import type { RawImportDataBlockV2 } from '../workspace/workspaceV2';

export type ExcelSheetProfileV1 = {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  headerRow: number | null;
  recognitionScore: number;
  state: 'recognized-cptu' | 'empty' | 'unrecognized';
};

export type ExcelSourceMetadataV1 = {
  sheetName: string;
  headerRow: number;
  pointName: string;
  projectName: string | null;
  waterDepthM: number;
  finalDepthM: number;
  waterUnitWeightKnM3: number | null;
  coneAreaRatio: number | null;
  workbookSheets: ExcelSheetProfileV1[];
  parseDurationMs: number;
  originalFileSize: number;
};

export type ExcelCptuParseResultV1 =
  | {
      kind: 'ready';
      sourceFingerprint: string;
      headers: string[];
      rows: string[][];
      displayRowNumbers: number[];
      sourceWorkbookExtraction: NonNullable<RawImportDataBlockV2['workbookExtraction']>;
      sourceColumnOrigins: Record<string, 'source-cell' | 'workbook-calculated-cell' | 'application-derived' | 'mixed' | 'metadata' | 'missing'>;
      metadata: ExcelSourceMetadataV1;
      notices: string[];
    }
  | {
      kind: 'sheet-selection-required';
      sourceFingerprint: string;
      candidates: ExcelSheetProfileV1[];
      workbookSheets: ExcelSheetProfileV1[];
      parseDurationMs: number;
      originalFileSize: number;
    };

export async function parseCptuExcelWorkbook(file: File, selectedSheetName?: string): Promise<ExcelCptuParseResultV1> {
  const startedAt = performance.now();
  const buffer = await file.arrayBuffer();
  const sourceFingerprint = await sha256Buffer(buffer);
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const sheets = await readXlsxFile(buffer);
  const profiles = sheets.map(profileSheet);
  const candidates = profiles.filter((profile) => profile.state === 'recognized-cptu');
  const parseDurationMs = Math.round((performance.now() - startedAt) * 10) / 10;
  if (!selectedSheetName && candidates.length > 1) {
    return { kind: 'sheet-selection-required', sourceFingerprint, candidates, workbookSheets: profiles, parseDurationMs, originalFileSize: file.size };
  }
  const selectedProfile = selectedSheetName
    ? candidates.find((profile) => profile.sheetName === selectedSheetName)
    : [...candidates].sort((left, right) => right.recognitionScore - left.recognitionScore)[0];
  if (!selectedProfile || selectedProfile.headerRow === null) throw new Error('Excel 中没有识别到 CPT/CPTU 数据表。请确认工作簿包含深度、qc、fs、u2 或 qt 表头。');
  const sheet = sheets.find((candidate) => candidate.sheet === selectedProfile.sheetName);
  if (!sheet) throw new Error(`Excel 工作表 ${selectedProfile.sheetName} 不存在。`);
  const transformed = transformRecognizedCptuSheet(sheet, selectedProfile.headerRow);
  return {
    kind: 'ready',
    sourceFingerprint,
    headers: transformed.headers,
    rows: transformed.rows,
    displayRowNumbers: transformed.displayRowNumbers,
    sourceWorkbookExtraction: transformed.sourceWorkbookExtraction,
    sourceColumnOrigins: transformed.sourceColumnOrigins,
    metadata: {
      ...transformed.metadata,
      sheetName: selectedProfile.sheetName,
      headerRow: selectedProfile.headerRow,
      workbookSheets: profiles,
      parseDurationMs,
      originalFileSize: file.size,
    },
    notices: transformed.notices,
  };
}

function profileSheet(sheet: Sheet): ExcelSheetProfileV1 {
  const rows = sheet.data as CellValue[][];
  const columnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  if (!rows.length || !rows.some((row) => row.some((value) => value !== null && value !== ''))) {
    return { sheetName: sheet.sheet, rowCount: rows.length, columnCount, headerRow: null, recognitionScore: 0, state: 'empty' };
  }
  let best = { row: null as number | null, score: 0 };
  rows.slice(0, 50).forEach((row, index) => {
    const cells = row.map(normalizeCellLabel);
    const score = [
      cells.some((cell) => cell.includes('深度') && cell.includes('m')),
      cells.some((cell) => cell.includes('锥尖') || cell.includes('qc')),
      cells.some((cell) => cell.includes('侧摩') || cell.includes('fs')),
      cells.some((cell) => cell.includes('孔压') || cell.includes('u2')),
      cells.some((cell) => cell.includes('摩阻比') || cell.includes('fr')),
    ].filter(Boolean).length;
    if (score > best.score) best = { row: index + 1, score };
  });
  return {
    sheetName: sheet.sheet,
    rowCount: rows.length,
    columnCount,
    headerRow: best.score >= 3 ? best.row : null,
    recognitionScore: best.score,
    state: best.score >= 3 ? 'recognized-cptu' : 'unrecognized',
  };
}

export function transformRecognizedCptuSheet(sheet: Sheet, headerRow: number) {
  const allRows = sheet.data as CellValue[][];
  const header = allRows[headerRow - 1] ?? [];
  const labels = header.map(normalizeCellLabel);
  const metadataRows = allRows.slice(0, headerRow - 1);
  const workbookDataRows = allRows.slice(headerRow)
    .map((row, index) => ({ row, displayRowNumber: headerRow + index + 1 }))
    .filter(({ row }) => row.some((value) => value !== null && value !== ''));
  const sourceWorkbookExtraction: NonNullable<RawImportDataBlockV2['workbookExtraction']> = {
    sheetName: sheet.sheet,
    fidelity: 'cached-values',
    headerRows: allRows.slice(0, headerRow).map((row) => row.map(cellText)),
    rows: workbookDataRows.map(({ row }) => row.map(cellText)),
    displayRowNumbers: workbookDataRows.map(({ displayRowNumber }) => displayRowNumber),
    formulaDefinitionsRequireOriginalFile: true,
  };
  const metadata = {
    pointName: metadataValue(metadataRows, ['孔位名称', '孔号']) || sheet.sheet,
    projectName: metadataValue(metadataRows, ['项目名称', '项目']) || null,
    waterDepthM: parseMetadataNumber(metadataValue(metadataRows, ['孔位水深', '水深'])) ?? 0,
    finalDepthM: parseMetadataNumber(metadataValue(metadataRows, ['终孔深度', '锥进深度'])) ?? 0,
    waterUnitWeightKnM3: parseMetadataNumber(metadataValue(metadataRows, ['水重度取值', '水重度'])),
    coneAreaRatio: parseMetadataNumber(metadataValue(metadataRows, ['探头面积比', '面积比'])),
  };
  const columns = {
    depth: findColumn(labels, (label) => (label.includes('深度') || label.includes('depth')) && label.includes('m')),
    qcKpa: findColumn(labels, (label) => (label.includes('qc') || label.includes('锥尖')) && label.includes('kpa') && !label.includes('qt')),
    qcMpa: findColumn(labels, (label) => (label.includes('qc') || label.includes('锥尖')) && label.includes('mpa') && !label.includes('qt')),
    fsKpa: findColumn(labels, (label) => (label.includes('侧摩') || label.includes('fs')) && label.includes('kpa')),
    fsMpa: findColumn(labels, (label) => (label.includes('侧摩') || label.includes('fs')) && label.includes('mpa')),
    u2Kpa: findColumn(labels, (label) => (label.includes('孔压') || label.includes('u2')) && label.includes('kpa')),
    u2Mpa: findColumn(labels, (label) => (label.includes('孔压') || label.includes('u2')) && label.includes('mpa')),
  };
  const qcColumn = columns.qcMpa >= 0 ? columns.qcMpa : columns.qcKpa;
  const fsColumn = columns.fsKpa >= 0 ? columns.fsKpa : columns.fsMpa;
  const u2Column = columns.u2Kpa >= 0 ? columns.u2Kpa : columns.u2Mpa;
  if (columns.depth < 0 || fsColumn < 0 || qcColumn < 0) throw new Error('Excel 数据表缺少可识别的深度、qc 或 fs 实测列。');
  const headers = [
    'Depth(m)',
    columns.qcMpa >= 0 ? 'qc(MPa)' : 'qc(kPa)',
    columns.fsMpa >= 0 && columns.fsKpa < 0 ? 'fs(MPa)' : 'fs(kPa)',
    ...(u2Column >= 0 ? [columns.u2Mpa >= 0 && columns.u2Kpa < 0 ? 'u2(MPa)' : 'u2(kPa)'] : []),
  ];
  const rows: string[][] = [];
  const displayRowNumbers: number[] = [];
  const validDepths: number[] = [];
  allRows.slice(headerRow).forEach((sourceRow, index) => {
    const excelRowNumber = headerRow + index + 1;
    const depth = numericCell(sourceRow[columns.depth]);
    const qc = numericCell(sourceRow[qcColumn]);
    const fs = numericCell(sourceRow[fsColumn]);
    const u2 = u2Column >= 0 ? numericCell(sourceRow[u2Column]) : null;
    const measurementColumnIndexes = [columns.depth, qcColumn, fsColumn, u2Column].filter((columnIndex) => columnIndex >= 0);
    const hasMeasurementCell = measurementColumnIndexes.some((columnIndex) => hasCellContent(sourceRow[columnIndex]));
    if (depth === null && !hasMeasurementCell) return;
    if (depth !== null) validDepths.push(depth);
    rows.push([
      cellNumber(depth),
      cellNumber(qc),
      cellNumber(fs),
      ...(u2Column >= 0 ? [cellNumber(u2)] : []),
    ]);
    displayRowNumbers.push(excelRowNumber);
  });
  if (!validDepths.length) throw new Error('Excel 数据表没有可读取的数值深度行。');
  const finalDepthM = Math.max(...validDepths);
  return {
    headers,
    rows,
    displayRowNumbers,
    sourceWorkbookExtraction,
    sourceColumnOrigins: {
      [headers[0]]: 'source-cell' as const,
      [headers[1]]: 'source-cell' as const,
      [headers[2]]: 'source-cell' as const,
      ...(headers[3] ? { [headers[3]]: 'source-cell' as const } : {}),
    },
    metadata: { ...metadata, finalDepthM },
    notices: [
      `已从 ${sheet.sheet} 的第 ${headerRow} 行识别 CPT/CPTU 表头。`,
      '普通导入只读取 Depth/qc/fs/u2 实测列；点名、水深、探头及派生列不作为行输入。',
    ],
  };
}

function metadataValue(rows: CellValue[][], labels: string[]) {
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      const label = normalizeCellLabel(row[index]);
      if (labels.some((candidate) => label.includes(normalizeCellLabel(candidate)))) {
        const adjacent = row.slice(index + 1).find((value) => value !== null && value !== '');
        if (adjacent !== undefined) return String(adjacent);
      }
    }
  }
  return '';
}

function findColumn(labels: string[], predicate: (label: string) => boolean) {
  return labels.findIndex(predicate);
}

function normalizeCellLabel(value: CellValue) {
  return String(value ?? '').replace(/&#10;|\r|\n/g, '').replace(/[\s：:（）()_\-]/g, '').toLocaleLowerCase();
}

function numericCell(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return parseMetadataNumber(String(value ?? ''));
}

function parseMetadataNumber(value: string) {
  const match = value.replace(/,/g, '').match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellNumber(value: number | null) {
  return value === null || !Number.isFinite(value) ? '' : String(Number(value.toPrecision(15)));
}

function cellText(value: CellValue) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function hasCellContent(value: CellValue) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

async function sha256Buffer(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
