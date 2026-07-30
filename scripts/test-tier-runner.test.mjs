import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditTierManifest } from './test-tier-runner.mjs';

function fixture() {
  const root = path.join(tmpdir(), `test-tier-runner-${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true });
  writeFileSync(path.join(root, 'tests', 'e2e', 'domain.spec.ts'), "import { test } from '@playwright/test'; test('domain', () => {});\n");
  writeFileSync(path.join(root, 'tests', 'e2e', 'ui.spec.ts'), "import { test } from './fixtures/isolatedTest'; test('ui', async ({ page }) => page.goto('/'));\n");
  writeFileSync(path.join(root, 'playwright.domain.config.ts'), 'export default {};\n');
  writeFileSync(path.join(root, 'playwright.real.config.ts'), 'export default { workers: 1, fullyParallel: false };\n');
  return root;
}

test('accepts complete, unique and constrained tier ownership', () => {
  const root = fixture();
  const result = auditTierManifest(root, {
    'domain-fast': ['domain.spec.ts'],
    'ui-isolated': ['ui.spec.ts'],
    'real-serial': [],
  });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.specCount, 2);
});

test('reports missing, duplicate and stale entries together', () => {
  const root = fixture();
  const result = auditTierManifest(root, {
    'domain-fast': ['domain.spec.ts', 'missing.spec.ts'],
    'ui-isolated': ['domain.spec.ts'],
    'real-serial': [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('重复归属')));
  assert.ok(result.errors.some((message) => message.includes('未分层：ui.spec.ts')));
  assert.ok(result.errors.some((message) => message.includes('不存在：missing.spec.ts')));
});

test('rejects browser fixtures in domain and missing isolation imports in UI', () => {
  const root = fixture();
  writeFileSync(path.join(root, 'tests', 'e2e', 'domain.spec.ts'), "test('bad', async ({ page }) => page.goto('/'));\n");
  writeFileSync(path.join(root, 'tests', 'e2e', 'ui.spec.ts'), "import { test } from '@playwright/test';\n");
  const result = auditTierManifest(root, {
    'domain-fast': ['domain.spec.ts'],
    'ui-isolated': ['ui.spec.ts'],
    'real-serial': [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('domain-fast 依赖浏览器')));
  assert.ok(result.errors.some((message) => message.includes('ui-isolated 未使用统一隔离')));
});

test('rejects direct browser authority resets in UI specs', () => {
  const root = fixture();
  writeFileSync(
    path.join(root, 'tests', 'e2e', 'ui.spec.ts'),
    "import { test } from './fixtures/isolatedTest'; test('bad', async ({ page }) => page.evaluate(() => localStorage.clear()));\n",
  );
  const result = auditTierManifest(root, {
    'domain-fast': ['domain.spec.ts'],
    'ui-isolated': ['ui.spec.ts'],
    'real-serial': [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('绕过统一隔离 helper')));
});

test('rejects webServer in domain config and parallel real config', () => {
  const root = fixture();
  writeFileSync(path.join(root, 'playwright.domain.config.ts'), 'export default { webServer: {} };\n');
  writeFileSync(path.join(root, 'playwright.real.config.ts'), 'export default { workers: 2, fullyParallel: true };\n');
  const result = auditTierManifest(root, {
    'domain-fast': ['domain.spec.ts'],
    'ui-isolated': ['ui.spec.ts'],
    'real-serial': [],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('domain-fast 配置不得声明 webServer'));
  assert.ok(result.errors.some((message) => message.includes('workers: 1')));
});
