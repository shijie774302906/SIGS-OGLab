import { expect, test } from './fixtures/isolatedTest';

test('large JTS evidence is classified once and repeated guidance stays interactive', async ({ page }) => {
  await page.goto('/');
  const timing = await page.evaluate(async () => {
    const classification = await import('/src/features/stratification/jtsClassificationDomain.ts');
    const guidance = await import('/src/features/stratification/jtsClassificationGuidance.ts');
    const domain = await import('/src/features/stratification/stratificationDomain.ts');
    const input = {
      pointId: 'point-perf', draftId: 'draft-perf', batchId: 'batch-perf', checkRunId: 'check-perf',
      revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
    };
    const rows = Array.from({ length: 7_832 }, (_, index) => ({
      sourceRowId: `perf-${index}`,
      depthM: 0.01 + index * 0.01,
      qcKpa: 500 + ((index * 47) % 18_000),
      fsKpa: index % 907 === 0 ? 0 : 8 + ((index * 13) % 240),
      u2Kpa: 20 + ((index * 17) % 1_200),
    }));
    const started = performance.now();
    const result = classification.runJtsClassification(
      domain.emptyStratificationWorkspace(), input, rows,
      { route: 'approximate_cpt', effectiveAreaRatio: 0.8 },
      { probeProfileRevisionId: 'probe-perf', waterContextRevisionId: 'water-perf' },
      '2026-07-12T02:00:00.000Z', 'classification-perf',
    );
    const classifiedMs = performance.now() - started;
    if (!result.ok) throw new Error(result.problem);
    const repeatedStarted = performance.now();
    for (let index = 0; index < 100; index += 1) guidance.getJtsClassificationGuidance(result.run);
    return {
      classifiedMs,
      repeatedGuidanceMs: performance.now() - repeatedStarted,
      rowCount: result.run.rows.length,
    };
  });
  expect(timing.rowCount).toBe(7_832);
  // The full Chromium project runs this CPU-bound 7,832-row classification
  // alongside up to eleven workers. Keep headroom for scheduler contention;
  // the repeated user-facing guidance calculation remains capped at 25 ms.
  expect(timing.classifiedMs).toBeLessThan(1_800);
  expect(timing.repeatedGuidanceMs).toBeLessThan(25);
  test.info().annotations.push({ type: 'performance', description: JSON.stringify(timing) });
});
