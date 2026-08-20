export const PROCESS129_CSV_SEED = 'process129-csv-20260725';

export type Process129Row = {
  depthM: number;
  qcKpa: number;
  fsKpa: number;
  u2Kpa: number;
};

export type Process129CsvCase = {
  id: 'shuffled' | 'preamble-bom' | 'tab' | 'semicolon' | 'aliases';
  fileName: string;
  text: string;
  delimiter: ',' | '\t' | ';';
  headerRow: number;
  headers: string[];
  targets: Array<{
    sourceColumnIndex: number;
    targetField: 'depthM' | 'qc' | 'fs' | 'u2';
    sourceUnit: 'm' | 'kPa';
  }>;
  sourceRows: string[][];
  rows: Process129Row[];
};

export function generateProcess129CsvCases(): Process129CsvCase[] {
  const rows = generateRows(PROCESS129_CSV_SEED, 100);
  return [
    createCase({
      id: 'shuffled',
      fileName: '01-表头乱序.csv',
      delimiter: ',',
      preamble: [],
      columns: [
        ['fs(kPa)', 'fs', 'kPa'],
        ['u2(kPa)', 'u2', 'kPa'],
        ['Depth(m)', 'depthM', 'm'],
        ['qc(kPa)', 'qc', 'kPa'],
      ],
      rows,
    }),
    createCase({
      id: 'preamble-bom',
      fileName: '02-前置说明与BOM.csv',
      delimiter: ',',
      bom: true,
      preamble: [
        ['现场导出文件'],
        ['项目', 'Process129'],
        ['以下为 CPTU 测量数据'],
      ],
      columns: [
        ['Depth (m)', 'depthM', 'm'],
        ['qc (kPa)', 'qc', 'kPa'],
        ['fs (kPa)', 'fs', 'kPa'],
        ['u2 (kPa)', 'u2', 'kPa'],
      ],
      rows,
    }),
    createCase({
      id: 'tab',
      fileName: '03-制表符分隔.csv',
      delimiter: '\t',
      preamble: [['CPTU export']],
      columns: [
        ['qc [kPa]', 'qc', 'kPa'],
        ['Depth [m]', 'depthM', 'm'],
        ['u2 [kPa]', 'u2', 'kPa'],
        ['fs [kPa]', 'fs', 'kPa'],
      ],
      rows,
    }),
    createCase({
      id: 'semicolon',
      fileName: '04-分号分隔.csv',
      delimiter: ';',
      preamble: [],
      columns: [
        ['u2(kPa)', 'u2', 'kPa'],
        ['fs(kPa)', 'fs', 'kPa'],
        ['qc(kPa)', 'qc', 'kPa'],
        ['Depth(m)', 'depthM', 'm'],
      ],
      rows,
    }),
    createCase({
      id: 'aliases',
      fileName: '05-别名与单位混排.csv',
      delimiter: ',',
      preamble: [['设备输出', '字段顺序未经整理']],
      columns: [
        ['孔隙水压力 u2 / kPa', 'u2', 'kPa'],
        ['锥尖阻力 qc / kPa', 'qc', 'kPa'],
        ['贯入深度 Depth / m', 'depthM', 'm'],
        ['套管侧摩阻 fs / kPa', 'fs', 'kPa'],
      ],
      rows,
    }),
  ];
}

function createCase(options: {
  id: Process129CsvCase['id'];
  fileName: string;
  delimiter: Process129CsvCase['delimiter'];
  preamble: string[][];
  columns: Array<[string, Process129CsvCase['targets'][number]['targetField'], Process129CsvCase['targets'][number]['sourceUnit']]>;
  rows: Process129Row[];
  bom?: boolean;
}): Process129CsvCase {
  const sourceRows = options.rows.map((row) => options.columns.map(([, target]) => sourceValue(row, target)));
  const lines = [
    ...options.preamble.map((row) => joinRow(row, options.delimiter)),
    joinRow(options.columns.map(([header]) => header), options.delimiter),
    ...sourceRows.map((row) => joinRow(row, options.delimiter)),
  ];
  return {
    id: options.id,
    fileName: options.fileName,
    text: `${options.bom ? '\uFEFF' : ''}${lines.join('\r\n')}`,
    delimiter: options.delimiter,
    headerRow: options.preamble.length + 1,
    headers: options.columns.map(([header]) => header),
    targets: options.columns.map(([, targetField, sourceUnit], sourceColumnIndex) => ({
      sourceColumnIndex,
      targetField,
      sourceUnit,
    })),
    sourceRows,
    rows: options.rows,
  };
}

function generateRows(seed: string, count: number): Process129Row[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => ({
    depthM: round((index + 1) * 0.02, 2),
    qcKpa: round(1_200 + random() * 18_000 + index * 2.5, 3),
    fsKpa: round(8 + random() * 210, 3),
    u2Kpa: round(5 + random() * 480, 3),
  }));
}

function sourceValue(row: Process129Row, target: Process129CsvCase['targets'][number]['targetField']) {
  if (target === 'depthM') return row.depthM.toFixed(2);
  if (target === 'qc') return row.qcKpa.toFixed(3);
  if (target === 'fs') return row.fsKpa.toFixed(3);
  return row.u2Kpa.toFixed(3);
}

function joinRow(cells: string[], delimiter: Process129CsvCase['delimiter']) {
  return cells.map((cell) => (
    cell.includes(delimiter) || /["\r\n]/.test(cell)
      ? `"${cell.replace(/"/g, '""')}"`
      : cell
  )).join(delimiter);
}

function seededRandom(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
