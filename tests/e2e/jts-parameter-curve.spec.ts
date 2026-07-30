import { expect, test } from '@playwright/test';
import { curveSegments, jtsParameterCurvePoints } from '../../src/features/parameters/ParameterWorkbenchDocument';
import type { JtsParameterPackageRunV5 } from '../../src/features/parameters/parameterTypes';

test('JTS parameter curve preserves a one-row problem as an explicit line break', () => {
  const classificationRowsSnapshot = [0, 0.01, 0.02].map((depthM, index) => ({
    sourceRowId: `row-${index + 1}`,
    depthM,
    qtKpa: 100,
    gammaSatKnM3: 18,
    qnetKpa: 80,
    frPercent: 1,
    qtNormalized: 10,
    qtn: 10,
    ic: 2.8,
    selectedClass: { soilClassId: 'clay', zone: 3, label: '黏性土', approximate: false },
  }));
  const values: JtsParameterPackageRunV5['values'] = [
    { valueId: 'v1', sourceRowId: 'row-1', depthM: 0, layerId: 'L1', soilClassId: 'clay', methodId: 'jts_su_nkt', status: 'value', value: 10, notices: [], reason: null },
    { valueId: 'v2', sourceRowId: 'row-2', depthM: 0.01, layerId: 'L1', soilClassId: 'clay', methodId: 'jts_su_nkt', status: 'problem', value: null, notices: [], reason: 'qnet 非正' },
    { valueId: 'v3', sourceRowId: 'row-3', depthM: 0.02, layerId: 'L1', soilClassId: 'clay', methodId: 'jts_su_nkt', status: 'value', value: 12, notices: [], reason: null },
  ];
  const points = jtsParameterCurvePoints({ classificationRowsSnapshot, values }, 'jts_su_nkt');
  expect(points.map((point) => point.value)).toEqual([10, null, 12]);
  expect(curveSegments(points)).toHaveLength(2);
  expect(curveSegments(points).flat()).not.toContainEqual(expect.objectContaining({ value: 0 }));
});
