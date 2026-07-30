import { expect, test } from '@playwright/test';
import { buildCheckProfilePath, sampleCheckProfileRows, type CheckProfileRow } from '../../src/features/check/checkProfileChart';

test('profile sampling stays within budget while preserving issue rows and channel extrema', () => {
  const rows: CheckProfileRow[] = Array.from({ length: 5000 }, (_, index) => ({
    sourceRowId: `row-${index}`,
    depthM: index * 0.01,
    qcKpa: index === 1234 ? 80_000 : 1000 + (index % 90),
    fsKpa: index === 2345 ? -900 : 10 + (index % 30),
    u2Kpa: index === 3456 ? 5000 : -50 + (index % 120),
  }));
  const sampled = sampleCheckProfileRows(rows, 540, ['row-4000']);
  const ids = new Set(sampled.rows.map((row) => row.sourceRowId));

  expect(sampled.hasU2).toBe(true);
  expect(sampled.totalRowCount).toBe(5000);
  expect(sampled.rows.length).toBeLessThanOrEqual(540);
  expect(ids.has('row-1234')).toBe(true);
  expect(ids.has('row-2345')).toBe(true);
  expect(ids.has('row-3456')).toBe(true);
  expect(ids.has('row-4000')).toBe(true);
});

test('profile sampling omits an unavailable u2 channel and path generation breaks at invalid values', () => {
  const rows: CheckProfileRow[] = [
    { sourceRowId: 'row-1', depthM: 1, qcKpa: 1000, fsKpa: 10, u2Kpa: Number.NaN },
    { sourceRowId: 'row-2', depthM: 2, qcKpa: Number.NaN, fsKpa: 11, u2Kpa: Number.NaN },
    { sourceRowId: 'row-3', depthM: 3, qcKpa: 1200, fsKpa: 12, u2Kpa: Number.NaN },
  ];
  const sampled = sampleCheckProfileRows(rows, 20);
  const path = buildCheckProfilePath(sampled.rows, 'qcKpa', (value) => value / 10, (depth) => depth * 10);

  expect(sampled.hasU2).toBe(false);
  expect(path.match(/M /g)).toHaveLength(2);
  expect(path).not.toContain('NaN');
});

test('large profile sampling preserves missing-channel breaks outside the current problem', () => {
  const rows: CheckProfileRow[] = Array.from({ length: 5000 }, (_, index) => ({
    sourceRowId: `row-${index}`,
    depthM: index / 100,
    qcKpa: index >= 2111 && index <= 2120 ? Number.NaN : 1000 + Math.sin(index / 31) * 120,
    fsKpa: index >= 3222 && index <= 3230 ? Number.NaN : 50 + Math.cos(index / 17) * 12,
    u2Kpa: index >= 4333 && index <= 4340 ? Number.NaN : 80 + Math.sin(index / 23) * 40,
  }));

  const sampled = sampleCheckProfileRows(rows, 540);
  expect(sampled.rows.length).toBeLessThanOrEqual(540);
  for (const field of ['qcKpa', 'fsKpa', 'u2Kpa'] as const) {
    const path = buildCheckProfilePath(sampled.rows, field, (value) => value, (depth) => depth);
    expect(path.match(/M /g)?.length).toBeGreaterThan(1);
  }
});

test('extreme missing-value transitions stay within budget without drawing across gaps', () => {
  const rows: CheckProfileRow[] = Array.from({ length: 5000 }, (_, index) => ({
    sourceRowId: `row-${index}`,
    depthM: index / 100,
    qcKpa: index % 2 === 0 ? 1000 + index : Number.NaN,
    fsKpa: index % 3 === 0 ? Number.NaN : 40 + index / 100,
    u2Kpa: index % 5 === 0 ? Number.NaN : 80 + index / 50,
  }));

  const sampled = sampleCheckProfileRows(rows, 120);
  expect(sampled.rows.length).toBeLessThanOrEqual(120);
  const qcPath = buildCheckProfilePath(sampled.rows, 'qcKpa', (value) => value, (depth) => depth);
  expect(qcPath).not.toContain(' L ');
  expect(qcPath.match(/M /g)?.length).toBeGreaterThan(1);
});

test('measured curves restart after a real depth gap even when all channels are finite', () => {
  const rows: CheckProfileRow[] = [0, 0.01, 0.02, 0.5, 0.51].map((depthM, index) => ({
    sourceRowId: `row-${index}`,
    depthM,
    qcKpa: 1000 + index,
    fsKpa: 40 + index,
    u2Kpa: 80 + index,
  }));

  const sampled = sampleCheckProfileRows(rows, 20);
  expect(sampled.rows.filter((row) => row.depthBreakBefore)).toHaveLength(1);
  for (const field of ['qcKpa', 'fsKpa', 'u2Kpa'] as const) {
    const path = buildCheckProfilePath(sampled.rows, field, (value) => value, (depth) => depth);
    expect(path.match(/M /g)).toHaveLength(2);
  }
});
