import { expect, test } from '@playwright/test';
import readXlsxFile from 'read-excel-file/node';
import {
  createCsvImportPipeline,
  setUnitDecision,
  type PipelineContext,
} from '../../src/features/import/importPipeline';
import { createMinimalTemplateCsv, createMinimalTemplateXlsx } from '../../src/features/import/minimalImportTemplate';

const currentPointContext: PipelineContext = {
  currentPointName: 'CPT-09',
  defaultWaterDepthM: 18.5,
  defaultFinalDepthM: 0,
  existingPoints: [{ pointId: 'point-cpt-09', pointName: 'CPT-09' }],
};

test('four-column CPTU import uses the current point and derives final depth only', async () => {
  const pipeline = await createMinimalPipeline([
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '0.5,0.92,12.5,62',
    '1.0,0.98,13.8,67',
    '1.5,1.06,15.1,74',
  ].join('\n'));

  expect(pipeline.pointAttribution).toEqual({ source: 'existing-point', pointId: 'point-cpt-09' });
  expect(pipeline.rows).toHaveLength(3);
  expect(pipeline.rows[0]).toMatchObject({ pointName: 'CPT-09', depthM: 0.5, qcKpa: 920, fsKpa: 12.5, u2Kpa: 62, finalDepthM: 1.5 });
  expect(pipeline.rows[2].finalDepthM).toBe(1.5);
  expect(pipeline.normalizedRows[0].values).toMatchObject({
    pointName: { origin: 'defaulted', normalizedValue: 'CPT-09' },
    qc: { origin: 'source', sourceUnit: 'MPa', normalizedValue: 920 },
    fs: { origin: 'source', sourceUnit: 'kPa', normalizedValue: 12.5 },
    u2: { origin: 'source', sourceUnit: 'kPa', normalizedValue: 62 },
    qt: { origin: 'derived', derivedFrom: ['qc'] },
    finalDepth: { origin: 'derived', derivedFrom: ['depthM'], normalizedValue: 1.5 },
  });
  expect(pipeline.readiness).toMatchObject({ canNormalize: true, canGenerateDrafts: true, canRunCheck: true });
});

test('three-column CPT remains checkable while partial u2 is an explicit problem', async () => {
  const cpt = await createMinimalPipeline([
    'Depth(m),qc(MPa),fs(kPa)',
    '0.5,0.92,12.5',
    '1.0,0.98,13.8',
  ].join('\n'));
  expect(cpt.readiness.canRunCheck).toBe(true);
  expect(cpt.normalizedRows.every((row) => row.values.u2?.origin === 'defaulted')).toBe(true);
  expect(cpt.problems).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 'notice', fieldName: 'U2' })]));

  const partial = await createMinimalPipeline([
    'Depth(m),qc(MPa),fs(kPa),u2(kPa)',
    '0.5,0.92,12.5,62',
    '1.0,0.98,13.8,',
  ].join('\n'));
  expect(partial.rows).toHaveLength(2);
  expect(partial.readiness.canRunCheck).toBe(false);
  expect(partial.problems).toEqual(expect.arrayContaining([expect.objectContaining({ eventId: 'DI-E12', fieldName: 'U2' })]));
});

test('unitless common headers reveal advanced confirmation and recover without guessing', async () => {
  let pipeline = await createMinimalPipeline([
    'Depth,qc,fs',
    '0.5,0.92,12.5',
    '1.0,0.98,13.8',
  ].join('\n'));
  expect(pipeline.mappings.filter((mapping) => ['depthM', 'qc', 'fs'].includes(mapping.targetField)).every((mapping) => mapping.state === 'confirmed')).toBe(true);
  expect(pipeline.readiness.canRunCheck).toBe(false);
  expect(pipeline.readiness.reasons.some((reason) => reason.recovery === 'unit')).toBe(true);

  pipeline = setUnitDecision(pipeline, 'depthM', 'm', currentPointContext);
  pipeline = setUnitDecision(pipeline, 'qc', 'MPa', currentPointContext);
  pipeline = setUnitDecision(pipeline, 'fs', 'kPa', currentPointContext);
  expect(pipeline.readiness.canRunCheck).toBe(true);
  expect(pipeline.rows[0]).toMatchObject({ qcKpa: 920, fsKpa: 12.5 });
});

test('a current-point import ignores source point and derived columns but preserves every raw cell', async () => {
  const pipeline = await createMinimalPipeline([
    'PointName,Depth(m),qc(MPa),qt(kPa),fs(kPa),u2(kPa),Fr(%),WaterDepthM,FinalDepthM,OperatorNote',
    'WRONG-POINT,0.5,0.92,999,12.5,62,8.8,999,999,original evidence',
  ].join('\n'));
  expect(pipeline.rows[0]).toMatchObject({ pointName: 'CPT-09', qtKpa: 920, waterDepthM: 18.5, finalDepthM: 0.5 });
  expect(pipeline.sourceRows[0].cells).toContain('original evidence');
  expect(pipeline.mappings.filter((mapping) => ['qt', 'fr', 'waterDepth', 'finalDepth'].includes(mapping.targetField)).every((mapping) => mapping.state === 'missing')).toBe(true);
  expect(pipeline.readiness.canRunCheck).toBe(true);
});

test('minimal CSV and Excel templates reopen with the exact four-column contract', async () => {
  expect(createMinimalTemplateCsv('blank')).toContain('Depth(m),qc(MPa),fs(kPa),u2(kPa)');
  expect(createMinimalTemplateCsv('example').trim().split(/\r?\n/)).toHaveLength(4);

  const sheets = await readXlsxFile(Buffer.from(createMinimalTemplateXlsx('example')));
  expect(sheets).toHaveLength(1);
  expect(sheets[0].sheet).toBe('CPT数据');
  expect(sheets[0].data).toEqual([
    ['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)'],
    [0.5, 0.92, 12.5, 62],
    [1, 0.98, 13.8, 67],
    [1.5, 1.06, 15.1, 74],
  ]);
});

function createMinimalPipeline(text: string) {
  return createCsvImportPipeline({
    batchId: 'batch-minimal',
    operationId: crypto.randomUUID(),
    baseWorkspaceRevision: 1,
    fileName: 'minimal.csv',
    text,
    ...currentPointContext,
    now: '2026-07-11T12:00:00.000Z',
  });
}
