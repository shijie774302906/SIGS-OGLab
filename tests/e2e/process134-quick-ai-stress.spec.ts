import { expect, test } from '@playwright/test';
import type { ImportAssistantSource } from '../../src/features/import/importAssistantDomain';
import {
  buildQuickPlotRowsFromProposal,
  QUICK_PLOT_IMPORT_PROTOCOL,
  quickPlotDecisionFromTool,
} from '../../src/features/quick/quickPlotAssistantDomain';

type Random = () => number;
type Field = 'depthM' | 'qc' | 'fs' | 'u2';
type Unit = 'm' | 'cm' | 'mm' | 'kPa' | 'MPa';

const stressSeed = Number(process.env.PROCESS134_STRESS_SEED ?? 134_072_027) >>> 0;
const stressCases = Math.max(50, Math.min(1_000, Number(process.env.PROCESS134_STRESS_CASES ?? 300)));

function createRandom(seed: number): Random {
  let state = seed || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function integer(random: Random, minimum: number, maximum: number) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function pick<T>(random: Random, values: readonly T[]) {
  return values[integer(random, 0, values.length - 1)];
}

function shuffle<T>(random: Random, values: T[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = integer(random, 0, index);
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function sourceValue(field: Field, unit: Unit, depthM: number, rowIndex: number) {
  if (field === 'depthM') {
    if (unit === 'cm') return depthM * 100;
    if (unit === 'mm') return depthM * 1_000;
    return depthM;
  }
  const normalized = field === 'qc'
    ? 1.1 + rowIndex * 0.017
    : field === 'fs'
      ? 12 + rowIndex * 0.13
      : -3 + rowIndex * 0.19;
  if (field === 'qc') return unit === 'kPa' ? normalized * 1_000 : normalized;
  return unit === 'MPa' ? normalized / 1_000 : normalized;
}

function normalizedValue(field: Field, value: number, unit: Unit) {
  if (field === 'depthM') {
    if (unit === 'cm') return value / 100;
    if (unit === 'mm') return value / 1_000;
    return value;
  }
  if (field === 'qc') return unit === 'kPa' ? value / 1_000 : value;
  return unit === 'MPa' ? value * 1_000 : value;
}

function headerLabel(field: Field, unit: Unit, style: 'known' | 'unknown' | 'encoded') {
  if (style === 'unknown') return `CH-${field}-${Math.round(unit.length * 17)}`;
  if (field === 'depthM') return style === 'encoded' ? `深度&#10;(${unit})` : `Depth(${unit})`;
  if (field === 'qc') return style === 'encoded' ? `锥尖&#10;(${unit})` : `qc(${unit})`;
  if (field === 'fs') return style === 'encoded' ? `侧摩&#10;(${unit})` : `fs(${unit})`;
  return style === 'encoded' ? `孔压&#10;(${unit})` : `u2(${unit})`;
}

test('PROCESS134 fixed-seed randomized full-file decisions preserve source rows and normalization', () => {
  const random = createRandom(stressSeed);
  for (let caseIndex = 0; caseIndex < stressCases; caseIndex += 1) {
    const headerMode = random() < 0.45 ? 'absent' as const : 'present' as const;
    const style = pick(random, ['known', 'unknown', 'encoded'] as const);
    const included: Field[] = ['depthM', 'qc'];
    if (random() < 0.8) included.push('fs');
    if (random() < 0.72) included.push('u2');
    const units = new Map<Field, Unit>([
      ['depthM', pick(random, ['m', 'cm', 'mm'] as const)],
      ['qc', pick(random, ['MPa', 'kPa'] as const)],
      ['fs', pick(random, ['kPa', 'MPa'] as const)],
      ['u2', pick(random, ['kPa', 'MPa'] as const)],
    ]);
    const extraCount = integer(random, 0, 4);
    const columns = shuffle(random, [
      ...included.map((field) => ({ kind: 'field' as const, field })),
      ...Array.from({ length: extraCount }, (_, index) => ({ kind: 'extra' as const, index })),
    ]);
    const rowCount = integer(random, 8, 120);
    const preambleCount = headerMode === 'present' ? integer(random, 0, 3) : 0;
    const rows: string[][] = Array.from({ length: preambleCount }, (_, index) =>
      columns.map((_, columnIndex) => columnIndex === 0 ? `说明 ${index + 1}` : ''));
    if (headerMode === 'present') {
      rows.push(columns.map((column) => column.kind === 'field'
        ? headerLabel(column.field, units.get(column.field)!, style)
        : `Extra-${column.index + 1}`));
    }
    const expected: Array<Record<Field, number | null>> = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const invalidKind = rowIndex < 2 ? 'valid' : pick(random, ['valid', 'valid', 'valid', 'valid', 'blank', 'bad-qc', 'bad-depth'] as const);
      const depthM = Number(((rowIndex + 1) * 0.01).toFixed(6));
      const row = columns.map((column) => {
        if (invalidKind === 'blank') return '';
        if (column.kind === 'extra') return `note-${caseIndex}-${rowIndex}-${column.index}`;
        if (invalidKind === 'bad-qc' && column.field === 'qc') return 'N/A';
        if (invalidKind === 'bad-depth' && column.field === 'depthM') return '—';
        return String(sourceValue(column.field, units.get(column.field)!, depthM, rowIndex));
      });
      rows.push(row);
      if (invalidKind === 'valid') {
        const values = Object.fromEntries((['depthM', 'qc', 'fs', 'u2'] as Field[]).map((field) => {
          if (!included.includes(field)) return [field, null];
          const value = sourceValue(field, units.get(field)!, depthM, rowIndex);
          return [field, normalizedValue(field, value, units.get(field)!)];
        })) as Record<Field, number | null>;
        expected.push(values);
      }
    }
    const headerRow = headerMode === 'present' ? preambleCount + 1 : null;
    const dataStartRow = headerMode === 'present' ? preambleCount + 2 : 1;
    const source: ImportAssistantSource = {
      operationId: `stress-operation-${stressSeed}-${caseIndex}`,
      sourceFingerprint: `${(stressSeed + caseIndex).toString(16).padStart(8, '0')}`.repeat(8).slice(0, 64),
      fileName: `stress-${caseIndex}.csv`,
      fileType: 'CSV',
      mimeType: 'text/csv',
      sizeBytes: JSON.stringify(rows).length,
      sheets: [{
        sheetName: 'CSV',
        rowCount: rows.length,
        columnCount: columns.length,
        rows,
        displayRowNumbers: rows.map((_, index) => index + 1),
        delimiter: ',',
      }],
    };
    const sourceBefore = JSON.stringify(source);
    const requestId = `stress-request-${caseIndex}`;
    const contextHash = `stress-context-${stressSeed}-${caseIndex}`;
    const mappedIndexes = new Set<number>();
    const mappedColumns = columns.flatMap((column, sourceColumnIndex) => {
      if (column.kind === 'extra') return [];
      mappedIndexes.add(sourceColumnIndex);
      return [{
        sourceColumnIndex,
        targetField: column.field,
        sourceUnit: units.get(column.field),
        reason: style === 'unknown' || headerMode === 'absent' ? '根据数值与列结构判断。' : '表头明确。',
        evidenceKind: style === 'unknown' || headerMode === 'absent' ? 'model-inferred' : 'source-explicit',
      }];
    });
    const decision = quickPlotDecisionFromTool({
      id: `stress-decision-${caseIndex}`,
      name: 'submit_quick_plot_import_decision',
      arguments: JSON.stringify({
        protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
        requestId,
        operationId: source.operationId,
        sourceFingerprint: source.sourceFingerprint,
        contextHash,
        kind: 'proposal',
        proposal: {
          proposalId: `stress-proposal-${caseIndex}`,
          sheetName: 'CSV',
          headerMode,
          headerRow,
          dataStartRow,
          dataEndRow: rows.length,
          summary: '随机压力测试判断。',
          columns: mappedColumns,
          ignoredColumns: columns.flatMap((column, sourceColumnIndex) => mappedIndexes.has(sourceColumnIndex)
            ? []
            : [{ sourceColumnIndex, headerLabel: column.kind === 'extra' ? `Extra-${column.index + 1}` : '', reason: '不用于快速出图。' }]),
          warnings: headerMode === 'absent' || style === 'unknown' ? ['字段由结构推测，需用户确认。'] : [],
        },
      }),
    }, source, { requestId, contextHash });
    expect(decision.ok, `seed=${stressSeed} case=${caseIndex}`).toBe(true);
    if (!decision.ok || decision.decision.kind !== 'proposal') continue;
    const built = buildQuickPlotRowsFromProposal(decision.decision.proposal, source);
    expect('problem' in built, `seed=${stressSeed} case=${caseIndex}`).toBe(false);
    if ('problem' in built) continue;
    expect(built.rows, `seed=${stressSeed} case=${caseIndex}`).toHaveLength(expected.length);
    built.rows.forEach((row, index) => {
      expect(row.depthM).toBeCloseTo(expected[index].depthM!, 10);
      expect(row.qcMpa).toBeCloseTo(expected[index].qc!, 10);
      if (expected[index].fs === null) expect(row.fsKpa).toBeNull();
      else expect(row.fsKpa).toBeCloseTo(expected[index].fs!, 10);
      if (expected[index].u2 === null) expect(row.u2Kpa).toBeNull();
      else expect(row.u2Kpa).toBeCloseTo(expected[index].u2!, 10);
    });
    expect(new Set(built.rows.map((row) => row.rowId)).size).toBe(built.rows.length);
    expect(JSON.stringify(source)).toBe(sourceBefore);
  }
});

test('PROCESS134 randomized stale identities and explicit field conflicts never form an import proposal', () => {
  const random = createRandom(stressSeed ^ 0xa5a5a5a5);
  const conflicts = [
    { header: 'qt(kPa)', targetField: 'qc', sourceUnit: 'kPa' },
    { header: 'Rf(%)', targetField: 'fs', sourceUnit: 'kPa' },
    { header: 'u1(kPa)', targetField: 'u2', sourceUnit: 'kPa' },
    { header: 'Elevation(m)', targetField: 'depthM', sourceUnit: 'm' },
  ] as const;
  for (let caseIndex = 0; caseIndex < Math.min(stressCases, 300); caseIndex += 1) {
    const conflict = pick(random, conflicts);
    const optionalConflict = conflict.targetField === 'fs' || conflict.targetField === 'u2';
    const targetIndex = conflict.targetField === 'depthM' ? 0 : optionalConflict ? 2 : 1;
    const headers = conflict.targetField === 'depthM'
      ? [conflict.header, 'qc(MPa)']
      : optionalConflict
        ? ['Depth(m)', 'qc(MPa)', conflict.header]
        : ['Depth(m)', conflict.header];
    const values = optionalConflict ? [['0.01', '1', '10'], ['0.02', '2', '11']] : [['0.01', '1'], ['0.02', '2']];
    const source: ImportAssistantSource = {
      operationId: `conflict-${caseIndex}`,
      sourceFingerprint: 'c'.repeat(64),
      fileName: 'conflict.csv',
      fileType: 'CSV',
      mimeType: 'text/csv',
      sizeBytes: 80,
      sheets: [{
        sheetName: 'CSV',
        rowCount: 3,
        columnCount: headers.length,
        rows: [headers, ...values],
        displayRowNumbers: [1, 2, 3],
        delimiter: ',',
      }],
    };
    const requestId = `conflict-request-${caseIndex}`;
    const contextHash = `conflict-context-${caseIndex}`;
    const fields = conflict.targetField === 'depthM'
      ? [
          { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: conflict.sourceUnit, reason: '错误判断。' },
          { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: 'qc。' },
        ]
      : [
          { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
          { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: conflict.targetField === 'qc' ? conflict.sourceUnit : 'MPa', reason: conflict.targetField === 'qc' ? '错误判断。' : 'qc。' },
          ...(optionalConflict ? [{ sourceColumnIndex: targetIndex, targetField: conflict.targetField, sourceUnit: conflict.sourceUnit, reason: '错误判断。' }] : []),
        ];
    const argumentsValue = {
      protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
      requestId,
      operationId: source.operationId,
      sourceFingerprint: source.sourceFingerprint,
      contextHash,
      kind: 'proposal',
      proposal: {
        proposalId: `conflict-proposal-${caseIndex}`,
        sheetName: 'CSV',
        headerMode: 'present',
        headerRow: 1,
        dataStartRow: 2,
        dataEndRow: 3,
        summary: '对抗判断。',
        columns: fields,
        ignoredColumns: [],
        warnings: [],
      },
    };
    const stale = quickPlotDecisionFromTool({
      id: `stale-${caseIndex}`,
      name: 'submit_quick_plot_import_decision',
      arguments: JSON.stringify({ ...argumentsValue, requestId: `${requestId}-old` }),
    }, source, { requestId, contextHash });
    expect(stale.ok).toBe(false);
    const rejected = quickPlotDecisionFromTool({
      id: `conflict-${caseIndex}`,
      name: 'submit_quick_plot_import_decision',
      arguments: JSON.stringify(argumentsValue),
    }, source, { requestId, contextHash });
    expect(rejected.ok).toBe(false);
  }
});

test('PROCESS134 full-range ledger exposes invalid, blank, duplicate and non-monotonic source rows', () => {
  const source: ImportAssistantSource = {
    operationId: 'ledger-operation',
    sourceFingerprint: '9'.repeat(64),
    fileName: 'ledger.csv',
    fileType: 'CSV',
    mimeType: 'text/csv',
    sizeBytes: 200,
    sheets: [{
      sheetName: 'CSV',
      rowCount: 6,
      columnCount: 3,
      rows: [
        ['Depth(m)', 'qc(MPa)', 'fs(kPa)'],
        ['0.10', '1.0', '10'],
        ['0.10', '1.1', ''],
        ['0.05', '1.2', '12'],
        ['0.20', 'bad', '13'],
        ['', '', ''],
      ],
      displayRowNumbers: [1, 2, 3, 4, 5, 6],
      delimiter: ',',
    }],
  };
  const requestId = 'ledger-request';
  const contextHash = 'ledger-context';
  const decision = quickPlotDecisionFromTool({
    id: 'ledger-decision',
    name: 'submit_quick_plot_import_decision',
    arguments: JSON.stringify({
      protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
      requestId,
      operationId: source.operationId,
      sourceFingerprint: source.sourceFingerprint,
      contextHash,
      kind: 'proposal',
      proposal: {
        proposalId: 'ledger-proposal',
        sheetName: 'CSV',
        headerMode: 'present',
        headerRow: 1,
        dataStartRow: 2,
        dataEndRow: 6,
        summary: '完整数据范围。',
        columns: [
          { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度。' },
          { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: 'qc。' },
          { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: 'fs。' },
        ],
        ignoredColumns: [],
        warnings: [],
      },
    }),
  }, source, { requestId, contextHash });
  expect(decision.ok).toBe(true);
  if (!decision.ok || decision.decision.kind !== 'proposal') return;
  const built = buildQuickPlotRowsFromProposal(decision.decision.proposal, source);
  expect('problem' in built).toBe(false);
  if ('problem' in built) return;
  expect(built.ledger).toEqual({
    sourceRows: 4,
    blankRows: 1,
    acceptedRows: 3,
    rejectedRows: [{ displayRowNumber: 5, reason: 'qc 不是可读取数字' }],
    duplicateDepthRows: [3],
    nonMonotonicRows: [4],
    optionalMissing: { fs: 1, u2: 0 },
  });
});
