import { expect, test } from '@playwright/test';
import { createTabularImportPipeline } from '../../src/features/import/importPipeline';
import { transformRecognizedCptuSheet } from '../../src/features/import/excelImport';

test('Excel extraction preserves a measurement row with invalid depth for row-level recovery', async () => {
  const rows = Array.from({ length: 8 }, () => [] as unknown[]);
  rows[3] = ['孔位名称', 'INVALID-DEPTH'];
  rows[5] = ['终孔深度', 10];
  rows[6] = ['孔位水深', 8];
  rows.push(['深度(m)', '锥尖 qc(MPa)', '侧摩 fs(kPa)', '孔压(kPa)', '', '锥尖 qc(kPa)', '孔压 u2(kPa)', '锥尖 qt(kPa)', '摩阻比 Fr(%)']);
  rows.push(['bad-depth', 1, 2, 3, null, 1000, 4, 1001, 0.2]);
  rows.push([0.02, 1.1, 2.1, 3.1, null, 1100, 4.1, 1101, 0.21]);
  rows.push(['depth-error', 'qc-error', 'fs-error', 'u2-error', null, 'qc-cache-error', 'u2-cache-error', 'qt-error', 'fr-error']);

  const transformed = transformRecognizedCptuSheet({ sheet: 'Sheet1', data: rows } as never, 9);
  expect(transformed.rows).toHaveLength(3);
  expect(transformed.headers).toEqual(['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)']);
  expect(transformed.rows[0][0]).toBe('');
  expect(transformed.displayRowNumbers).toEqual([10, 11, 12]);
  expect(transformed.sourceWorkbookExtraction).toMatchObject({
    sheetName: 'Sheet1',
    fidelity: 'cached-values',
    displayRowNumbers: [10, 11, 12],
    formulaDefinitionsRequireOriginalFile: true,
  });
  expect(transformed.sourceWorkbookExtraction.rows[0][0]).toBe('bad-depth');

  const pipeline = await createTabularImportPipeline({
    batchId: 'excel-invalid-depth',
    operationId: 'excel-invalid-depth-operation',
    sourceFingerprint: 'a'.repeat(64),
    sourceKind: 'excel',
    fileName: 'invalid-depth.xlsx',
    headers: transformed.headers,
    rows: transformed.rows,
    displayRowNumbers: transformed.displayRowNumbers,
    sourceWorkbookExtraction: transformed.sourceWorkbookExtraction,
    currentPointName: 'INVALID-DEPTH',
    defaultWaterDepthM: 8,
    defaultFinalDepthM: 10,
    allowAnyPoint: true,
  });

  expect(pipeline.sourceRows).toHaveLength(3);
  expect(pipeline.sourceWorkbookExtraction?.rows[0][0]).toBe('bad-depth');
  expect(pipeline.problems.some((problem) => problem.fieldName === 'DepthM' && problem.rowIndex === 10)).toBe(true);
  expect(pipeline.readiness.canRunCheck).toBe(false);
});
