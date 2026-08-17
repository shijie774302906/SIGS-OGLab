import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssistantQuotaService } from '../assistant/quota.mjs';
import { createVisitorAnalyticsService } from '../analytics/visitor-analytics.mjs';
import {
  createCloudBasePostgresQuotaStore,
  createCloudBasePostgresRpcClient,
  createCloudBasePostgresVisitorAnalyticsStore,
} from './cloudbase-postgres.mjs';

const subject = 'a'.repeat(64);

test('CloudBase RPC client sends only the service token and admitted RPC parameters', async () => {
  let request;
  const client = createCloudBasePostgresRpcClient({
    envId: 'env-example-123',
    apiKey: 'service-role-test-token',
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ accepted: true, used: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  assert.deepEqual(await client.call('sigs_quota_reserve', {
    p_subject: subject,
    p_quota_date: '2026-08-14',
    p_limit: 100,
  }), { accepted: true, used: 1 });
  assert.equal(request.url, 'https://env-example-123.api.tcloudbasegateway.com/v1/rdb/rest/rpc/sigs_quota_reserve');
  assert.equal(request.init.headers.Authorization, 'Bearer service-role-test-token');
  assert.deepEqual(JSON.parse(request.init.body), {
    p_subject: subject,
    p_quota_date: '2026-08-14',
    p_limit: 100,
  });
  assert.equal(request.init.body.includes('qc'), false);
  assert.equal(request.init.body.includes('project'), false);
  assert.equal(request.init.body.includes('file'), false);
});

test('CloudBase quota adapter preserves atomic 100/101 behavior and visitor isolation', async () => {
  const counters = new Map();
  const rpc = {
    async call(name, params) {
      const key = `${params.p_quota_date}:${params.p_subject}`;
      if (name === 'sigs_quota_read') return { used: counters.get(key) ?? 0 };
      if (name === 'sigs_quota_release') {
        const next = Math.max(0, (counters.get(key) ?? 0) - 1);
        counters.set(key, next);
        return { used: next };
      }
      const used = counters.get(key) ?? 0;
      if (used >= params.p_limit) return { accepted: false, used };
      counters.set(key, used + 1);
      return { accepted: true, used: used + 1 };
    },
  };
  const quota = createAssistantQuotaService({
    config: { publicQuotaLimit: 100 },
    store: createCloudBasePostgresQuotaStore({ rpc }),
    now: () => new Date('2026-08-14T12:00:00.000Z'),
  });
  const results = await Promise.all(Array.from({ length: 140 }, () => quota.reserve(subject)));
  assert.equal(results.filter((result) => result.accepted).length, 100);
  assert.equal(results.filter((result) => result.reason === 'exhausted').length, 40);
  assert.equal((await quota.status(subject)).remaining, 0);
  assert.equal((await quota.status('b'.repeat(64))).remaining, 100);
});

test('CloudBase analytics adapter returns aggregates without returning visitor identity', async () => {
  let sent;
  const store = createCloudBasePostgresVisitorAnalyticsStore({
    rpc: {
      async call(name, params) {
        sent = { name, params };
        return { visitors: 2, visits: 7, regions: { 'CN-44': 6, UNKNOWN: 1 } };
      },
    },
  });
  const service = createVisitorAnalyticsService({ store });
  const snapshot = await service.record(subject, { key: 'CN-44' });
  assert.deepEqual(sent, {
    name: 'sigs_record_visit',
    params: { p_subject: subject, p_region_key: 'CN-44' },
  });
  assert.deepEqual(snapshot.totals, { visitors: 2, visits: 7, coveredRegions: 2 });
  assert.equal(JSON.stringify(snapshot).includes(subject), false);
});

test('CloudBase storage failure fails public quota closed and hides analytics', async () => {
  const brokenRpc = { async call() { throw new Error('sensitive storage detail'); } };
  const quota = createAssistantQuotaService({
    config: { publicQuotaLimit: 100 },
    store: createCloudBasePostgresQuotaStore({ rpc: brokenRpc }),
  });
  const analytics = createVisitorAnalyticsService({
    store: createCloudBasePostgresVisitorAnalyticsStore({ rpc: brokenRpc }),
  });
  const reservation = await quota.reserve(subject);
  assert.equal(reservation.accepted, false);
  assert.equal(reservation.reason, 'unavailable');
  assert.equal(reservation.quota.status, 'unavailable');
  assert.deepEqual(await analytics.record(subject, { key: 'CN-44' }), {
    status: 'unavailable', totals: null, regions: [],
  });
});
