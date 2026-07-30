import { expect, test } from '@playwright/test';
import {
  diagnoseJtsClassificationRecovery,
  inspectJtsNumericDomain,
} from '../../src/features/stratification/jtsClassificationRecovery';

const CONTEXT = {
  route: 'full_cptu' as const,
  effectiveAreaRatio: 0.8,
  waterDepthM: 0,
  u2HydrostaticDatum: 'total' as const,
  testZeroDatum: 'mudline' as const,
  waterUnitWeightKnM3: 10,
};

test('numeric-domain diagnosis enumerates invalid rows and offers only bounded append-only recovery', async () => {
  const rows = Array.from({ length: 200 }, (_, index) => ({
    sourceRowId: `row-${index + 1}`,
    depthM: 1 + index * 0.01,
    qcKpa: index === 20 ? 10 : 1_000,
    fsKpa: 20,
    u2Kpa: index === 20 ? -100 : 100,
  }));
  const inspection = inspectJtsNumericDomain(rows, CONTEXT);
  expect(inspection.invalidRows).toHaveLength(1);
  expect(inspection.invalidRows[0]).toMatchObject({ sourceRowId: 'row-21', depthM: 1.2, reason: 'invalid-qt' });
  expect(inspection.invalidRows[0].qtKpa).toBeCloseTo(-10, 10);
  const issue = diagnoseJtsClassificationRecovery({
    checkCurrentAndClear: true,
    checkCanRerun: true,
    checkStale: false,
    probeConfirmed: true,
    waterContextConfirmed: true,
    rows,
    context: CONTEXT,
    activeSmoothingDepthWindowM: null,
  });
  expect(issue).toMatchObject({ code: 'JTS-NUMERIC-DOMAIN', totalRowCount: 200 });
  expect(issue?.options.find((option) => option.optionId === 'standard-smoothing')).toMatchObject({ kind: 'automatic', enabled: true });
  expect(issue?.options.find((option) => option.optionId === 'exclude-invalid-rows')).toMatchObject({ kind: 'automatic', enabled: true });
  expect(issue?.options.find((option) => option.optionId === 'open-check')).toMatchObject({ kind: 'navigate', enabled: true });
});

test('bulk exclusion is unavailable when the affected set exceeds the safe percentage', async () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({ sourceRowId: `row-${index}`, depthM: index / 10, qcKpa: index < 2 ? 10 : 1_000, fsKpa: 20, u2Kpa: index < 2 ? -100 : 100 }));
  const issue = diagnoseJtsClassificationRecovery({ checkCurrentAndClear: true, checkCanRerun: true, checkStale: false, probeConfirmed: true, waterContextConfirmed: true, rows, context: CONTEXT, activeSmoothingDepthWindowM: null });
  expect(issue?.options.find((option) => option.optionId === 'exclude-invalid-rows')).toMatchObject({ enabled: false });
});

test('stale checks may rerun in place while engineering context remains a manual navigation decision', async () => {
  const stale = diagnoseJtsClassificationRecovery({ checkCurrentAndClear: false, checkCanRerun: true, checkStale: true, probeConfirmed: true, waterContextConfirmed: true, rows: [], context: null, activeSmoothingDepthWindowM: null });
  expect(stale?.options.find((option) => option.optionId === 'rerun-check')).toMatchObject({ enabled: true, kind: 'automatic' });
  const water = diagnoseJtsClassificationRecovery({ checkCurrentAndClear: true, checkCanRerun: true, checkStale: false, probeConfirmed: true, waterContextConfirmed: false, rows: [], context: null, activeSmoothingDepthWindowM: null });
  expect(water).toMatchObject({ code: 'JTS-WATER-CONTEXT-REQUIRED' });
  expect(water?.options).toEqual([expect.objectContaining({ optionId: 'open-point-context', kind: 'navigate' })]);
});
