import { expect, test } from '@playwright/test';
import { splitOutputTrackSegments, stratigraphyPixelsPerMetreForRange, stratigraphyPlotHeightForRange } from '../../src/features/output/jtsOutputWorkbook';
import { buildJtsOutputClassificationBands, createJtsOutputRevision, layoutJtsOutputLayerLabelYs, validateJtsOutputAuthorityContent, validateJtsOutputRevision } from '../../src/features/output/jtsOutputDomain';
import type { JtsOutputSnapshotV7 } from '../../src/features/workspace/workspaceV2';

const rows: JtsOutputSnapshotV7['measuredRows'] = [
  { sourceRowId: 'r1', depthM: 0, qcKpa: 100, fsKpa: 10, u2Kpa: 1 },
  { sourceRowId: 'r2', depthM: 0.01, qcKpa: 110, fsKpa: 11, u2Kpa: 2 },
  { sourceRowId: 'r3', depthM: 0.02, qcKpa: 120, fsKpa: 12, u2Kpa: null },
  { sourceRowId: 'r4', depthM: 0.03, qcKpa: 130, fsKpa: 13, u2Kpa: 4 },
  { sourceRowId: 'r5', depthM: 0.5, qcKpa: 140, fsKpa: 14, u2Kpa: 5 },
  { sourceRowId: 'r6', depthM: 0.51, qcKpa: 150, fsKpa: 15, u2Kpa: 6 },
];

test('output curve segments break at missing values and real depth gaps without adding zero evidence', () => {
  expect(splitOutputTrackSegments(rows, 'qc').map((segment) => segment.map((point) => point.depthM))).toEqual([[0, 0.01, 0.02, 0.03], [0.5, 0.51]]);
  const u2 = splitOutputTrackSegments(rows, 'u2');
  expect(u2.map((segment) => segment.map((point) => point.depthM))).toEqual([[0, 0.01], [0.03], [0.5, 0.51]]);
  expect(u2.flat().map((point) => point.value)).toEqual([1, 2, 4, 5, 6]);
});

test('output long chart keeps the fixed scale and rejects unsafe canvas height', () => {
  expect(stratigraphyPlotHeightForRange(1)).toBe(1200);
  expect(stratigraphyPixelsPerMetreForRange(1)).toBe(1200);
  expect(stratigraphyPixelsPerMetreForRange(10)).toBe(120);
  expect(stratigraphyPixelsPerMetreForRange(30)).toBe(40);
  expect(stratigraphyPixelsPerMetreForRange(60)).toBe(40);
  expect(stratigraphyPlotHeightForRange(60)).toBe(2400);
  expect(stratigraphyPlotHeightForRange(100)).toBe(4000);
  expect(() => stratigraphyPlotHeightForRange(301)).toThrow(/安全上限/);
});

test('output authority content rejects a changed parameter value, representative value, or layer boundary', () => {
  const authority = {
    measuredRows: rows,
    classificationRows: [{ sourceRowId: 'r1', depthM: 0, qtn: 1, ic: 2, soilClassId: 'z1', label: '土类', approximate: false }],
    layers: [{ layerId: 'l1', name: '黏性土 1', depthFromM: 0, depthToM: 0.51, engineeringSoilGroup: 'clay' }],
    parameterRows: [{ sourceRowId: 'r1', depthM: 0, layerId: 'l1', methodId: 'm1', label: '参数', symbol: 'P', unit: 'kPa', status: 'value' as const, value: 10, reason: '有效', notices: [], ignoreKind: null }],
    parameterValues: [{ layerId: 'l1', methodId: 'm1', symbol: 'P', unit: 'kPa', count: 1, median: 10, minimum: 10, maximum: 10 }],
  };
  const snapshot = authority as unknown as JtsOutputSnapshotV7;
  expect(validateJtsOutputAuthorityContent(snapshot, authority)).toEqual({ ok: true });
  for (const changed of [
    { ...authority, parameterRows: [{ ...authority.parameterRows[0], value: 11 }] },
    { ...authority, parameterValues: [{ ...authority.parameterValues[0], median: 11 }] },
    { ...authority, layers: [{ ...authority.layers[0], depthToM: 0.5 }] },
  ]) expect(validateJtsOutputAuthorityContent(changed as unknown as JtsOutputSnapshotV7, authority).ok).toBe(false);
});

test('PROCESS125 output revision rejects a parameter package from another classification or stratification lineage', () => {
  const snapshot: JtsOutputSnapshotV7 = {
    projectId: 'project',
    projectName: '项目',
    pointId: 'point',
    pointName: '点位',
    generatedAt: '2026-07-24T10:00:00.000Z',
    authority: {
      checkRunId: 'check',
      classificationRunId: 'classification-current',
      classificationResultHash: 'classification-hash',
      stratificationRevisionId: 'stratification-current',
      parameterPackageRunId: 'parameter',
      parameterPackageResultHash: 'parameter-hash',
      dissipationResultRevisionId: null,
    },
    parameterSource: {
      classificationRunId: 'classification-current',
      classificationResultHash: 'classification-hash',
      stratificationRevisionId: 'stratification-current',
      sourceLineageHash: 'lineage-hash',
    },
    measuredRows: rows,
    classificationRows: [{ sourceRowId: 'r1', depthM: 0, qtn: 1, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false }],
    layers: [{ layerId: 'l1', name: '黏土层', depthFromM: 0, depthToM: 0.51, engineeringSoilGroup: 'clay' }],
    parameterValues: [{ layerId: 'l1', methodId: 'm1', symbol: 'P', unit: 'kPa', count: 1, median: 10, minimum: 10, maximum: 10 }],
    dissipation: null,
    notices: ['原型成果'],
  };
  expect(validateJtsOutputRevision(createJtsOutputRevision(snapshot, 'a3-atlas-pdf', 'output-valid'))).toEqual({ ok: true });
  const mismatched = structuredClone(snapshot);
  mismatched.parameterSource!.classificationRunId = 'classification-old';
  expect(validateJtsOutputRevision(createJtsOutputRevision(mismatched, 'a3-atlas-pdf', 'output-mismatch'))).toMatchObject({ ok: false, problem: expect.stringContaining('同一来源链') });
});

test('PROCESS112 classification bands merge equal zones and preserve null cells, real gaps, and approximate routes', () => {
  const classificationRows: JtsOutputSnapshotV7['classificationRows'] = [
    { sourceRowId: 'c1', depthM: 0, qtn: 10, ic: 2, soilClassId: 'silty_fine_sand', label: '粉砂～细砂', approximate: false },
    { sourceRowId: 'c2', depthM: 0.01, qtn: 11, ic: 2, soilClassId: 'silty_fine_sand', label: '粉砂～细砂', approximate: false },
    { sourceRowId: 'c3', depthM: 0.02, qtn: null, ic: null, soilClassId: null, label: null, approximate: false },
    { sourceRowId: 'c4', depthM: 0.03, qtn: 12, ic: 1.7, soilClassId: 'medium_coarse_sand', label: '中砂～粗砂', approximate: true },
    { sourceRowId: 'c5', depthM: 1, qtn: 13, ic: 1.7, soilClassId: 'medium_coarse_sand', label: '中砂～粗砂', approximate: true },
    { sourceRowId: 'c6', depthM: 1.01, qtn: 14, ic: 1.7, soilClassId: 'medium_coarse_sand', label: '中砂～粗砂', approximate: true },
    { sourceRowId: 'c7', depthM: 1.02, qtn: 15, ic: 1.5, soilClassId: 'gravelly_sand', label: '砾砂', approximate: false },
  ];
  const bands = buildJtsOutputClassificationBands(classificationRows, 0, 1.02);
  expect(bands).toHaveLength(4);
  expect(bands[0]).toMatchObject({ zone: 7, approximate: false, depthFromM: 0, depthToM: 0.015 });
  expect(bands[1]).toMatchObject({ zone: 8, approximate: true, depthFromM: 0.025, depthToM: 0.035 });
  expect(bands[2]).toMatchObject({ zone: 8, approximate: true });
  expect(bands[2].depthFromM).toBeCloseTo(0.995, 6);
  expect(bands[2].depthToM).toBeCloseTo(1.015, 6);
  expect(bands[3]).toMatchObject({ zone: 9, approximate: false });
  expect(bands[3].depthFromM).toBeCloseTo(1.015, 6);
  expect(bands[3].depthToM).toBeCloseTo(1.02, 6);
  expect(bands[0].depthToM).toBeLessThan(bands[1].depthFromM);
  expect(bands[1].depthToM).toBeLessThan(bands[2].depthFromM);
});

test('PROCESS112 classification bands reject unordered depth instead of drawing false evidence', () => {
  const invalid: JtsOutputSnapshotV7['classificationRows'] = [
    { sourceRowId: 'c1', depthM: 1, qtn: 10, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false },
    { sourceRowId: 'c2', depthM: 0.5, qtn: 11, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false },
  ];
  expect(() => buildJtsOutputClassificationBands(invalid, 0, 2)).toThrow(/严格递增/);
});

test('PROCESS112 page clipping preserves one midpoint-owned cell across a 20 m atlas boundary', () => {
  const classificationRows: JtsOutputSnapshotV7['classificationRows'] = [
    { sourceRowId: 'p1', depthM: 19.99, qtn: 10, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false },
    { sourceRowId: 'p2', depthM: 20.01, qtn: 11, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false },
    { sourceRowId: 'p3', depthM: 20.03, qtn: 12, ic: 2, soilClassId: 'clay', label: '黏土', approximate: false },
  ];
  const firstPage = buildJtsOutputClassificationBands(classificationRows, 0.01, 20.01);
  const secondPage = buildJtsOutputClassificationBands(classificationRows, 20.01, 40.01);
  expect(firstPage).toHaveLength(1);
  expect(secondPage).toHaveLength(1);
  expect(firstPage[0].depthToM).toBeCloseTo(20.01, 6);
  expect(secondPage[0].depthFromM).toBeCloseTo(20.01, 6);
  expect(firstPage[0].zone).toBe(4);
  expect(secondPage[0].zone).toBe(4);
});

test('PROCESS112 thin-layer labels keep depth order and a readable non-overlapping track', () => {
  const positions = layoutJtsOutputLayerLabelYs([100, 104, 109, 240], 90, 260, 34);
  expect(positions).toHaveLength(4);
  expect(positions[0]).toBeGreaterThanOrEqual(90);
  expect(positions.at(-1)).toBeLessThanOrEqual(260);
  positions.slice(1).forEach((position, index) => expect(position - positions[index]).toBeGreaterThanOrEqual(34));
});
