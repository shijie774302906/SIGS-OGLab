import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMemoryVisitorAnalyticsStore,
  createUpstashVisitorAnalyticsStore,
  createVisitorAnalyticsService,
  resolveVisitorRegion,
} from './visitor-analytics.mjs';

test('visitor region uses province-level Vercel headers and never reads raw IP', () => {
  assert.deepEqual(resolveVisitorRegion({
    'x-vercel-ip-country': 'CN',
    'x-vercel-ip-country-region': '44',
    'x-forwarded-for': '203.0.113.8',
  }), { key: 'CN-44', label: '广东' });
  assert.deepEqual(resolveVisitorRegion({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'CA' }), { key: 'US', label: '美国' });
  assert.deepEqual(resolveVisitorRegion({ 'x-vercel-ip-country': '../../CN' }), { key: 'UNKNOWN', label: '未知' });
  assert.deepEqual(resolveVisitorRegion({}), { key: 'UNKNOWN', label: '未知' });
});

test('same visitor increments visits but not visitors and regions stay aggregated', async () => {
  const service = createVisitorAnalyticsService({ store: createMemoryVisitorAnalyticsStore() });
  let snapshot;
  for (let index = 0; index < 10; index += 1) snapshot = await service.record('visitor-a', { key: 'CN-44' });
  snapshot = await service.record('visitor-b', { key: 'US' });
  assert.deepEqual(snapshot.totals, { visitors: 2, visits: 11, coveredRegions: 2 });
  assert.deepEqual(snapshot.regions, [
    { key: 'CN-44', label: '广东', visits: 10 },
    { key: 'US', label: '美国', visits: 1 },
  ]);
  const browserPayload = JSON.stringify(snapshot);
  assert.equal(browserPayload.includes('visitor-a'), false);
  assert.equal(browserPayload.includes('visitor-b'), false);
  assert.equal(browserPayload.includes('203.0.113.8'), false);
});

test('concurrent first visits are de-duplicated atomically by subject', async () => {
  const service = createVisitorAnalyticsService({ store: createMemoryVisitorAnalyticsStore() });
  const results = await Promise.all(Array.from({ length: 50 }, () => service.record('visitor-concurrent', { key: 'CN-11' })));
  const final = results.at(-1);
  assert.equal(final.totals.visitors, 1);
  assert.equal(final.totals.visits, 50);
  assert.equal(final.regions[0].label, '北京');
  assert.equal(final.regions[0].visits, 50);
});

test('analytics failure degrades to unavailable without exposing storage errors', async () => {
  const service = createVisitorAnalyticsService({
    store: { kind: 'broken', async record() { throw new Error('redis-secret-detail'); } },
  });
  assert.deepEqual(await service.record('visitor-a', { key: 'CN-44' }), {
    status: 'unavailable', totals: null, regions: [],
  });
});

test('Upstash store sends one atomic Lua command and normalizes the returned snapshot', async () => {
  let sentBody;
  const store = createUpstashVisitorAnalyticsStore({
    url: 'https://example.upstash.io',
    token: 'secret-token',
    fetchImpl: async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ result: [3, 8, ['CN-44', '6', 'US', '2']] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const snapshot = await store.record('derived-subject', 'CN-44');
  assert.equal(sentBody[0], 'EVAL');
  assert.match(sentBody[1], /SETNX/);
  assert.match(sentBody[1], /EXPIRE/);
  assert.match(sentBody[1], /HINCRBY/);
  assert.equal(sentBody[2], 3);
  assert.ok(String(sentBody[3]).endsWith('derived-subject'));
  assert.deepEqual(snapshot.totals, { visitors: 3, visits: 8, coveredRegions: 2 });
  assert.deepEqual(snapshot.regions.map(({ label, visits }) => [label, visits]), [['广东', 6], ['美国', 2]]);
});
