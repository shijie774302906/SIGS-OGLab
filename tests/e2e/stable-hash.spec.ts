import { expect, test } from '@playwright/test';
import { sha256HexSync, stableStringify } from '../../src/features/workspace/stableHash';

function legacyStableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}

test('stable serialization stays byte-compatible with persisted authority hashes', () => {
  const fixtures: unknown[] = [
    { z: 1, a: 'text', nested: { c: Number.NaN, b: -0, a: null }, list: [3, undefined, { y: true, x: false }] },
    Array.from({ length: 250 }, (_, index) => ({
      sourceRowId: `row-${index}`,
      row: { u2Kpa: index % 7 ? index * -0.25 : Number.NaN, fsKpa: index / 3, qcKpa: 1000 + index, depthM: index / 100 },
    })),
  ];

  for (const fixture of fixtures) {
    const legacy = legacyStableStringify(fixture);
    const current = stableStringify(fixture);
    expect(current).toBe(legacy);
    expect(sha256HexSync(current)).toBe(sha256HexSync(legacy));
  }
});
