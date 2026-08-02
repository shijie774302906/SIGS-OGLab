import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import {
  buildSourceReachability,
  hasUnapprovedYingkouSourceData,
  scanTrackedSecrets,
} from './release-readiness.mjs';

test('secret scanner reports location without returning the secret value', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-audit-secret-'));
  const secret = `sk-${'a'.repeat(40)}`;
  writeFileSync(join(root, 'sample.ts'), `export const key = '${secret}';\n`, 'utf8');
  const findings = scanTrackedSecrets(root, ['sample.ts']);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'deepseek-key');
  assert.deepEqual(findings[0].detail, { file: 'sample.ts', line: 1 });
  assert.equal(JSON.stringify(findings).includes(secret), false);
});

test('secret scanner rejects tracked environment and private-key files', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-audit-files-'));
  writeFileSync(join(root, '.env.local'), 'SAFE_PLACEHOLDER=true\n', 'utf8');
  writeFileSync(join(root, 'identity.pem'), 'placeholder\n', 'utf8');
  const findings = scanTrackedSecrets(root, ['.env.local', 'identity.pem']);
  assert.deepEqual(findings.map((item) => item.id), ['tracked-secret-file', 'tracked-secret-file']);
});

test('secret scanner allows the documented environment example but still scans its content', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-audit-env-example-'));
  writeFileSync(join(root, '.env.example'), 'DEEPSEEK_API_KEY=replace-me\n', 'utf8');
  assert.deepEqual(scanTrackedSecrets(root, ['.env.example']), []);

  writeFileSync(join(root, '.env.example'), `DEEPSEEK_API_KEY=sk-${'a'.repeat(40)}\n`, 'utf8');
  assert.equal(scanTrackedSecrets(root, ['.env.example'])[0]?.id, 'deepseek-key');
});

test('source reachability follows static, re-export and dynamic relative imports', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-audit-graph-'));
  mkdirSync(join(root, 'src', 'feature'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'main.tsx'),
    "import './feature/static';\nexport { value } from './feature/exported';\nvoid import('./feature/lazy');\n",
    'utf8',
  );
  writeFileSync(join(root, 'src', 'feature', 'static.ts'), 'export const staticValue = 1;\n', 'utf8');
  writeFileSync(join(root, 'src', 'feature', 'exported.ts'), 'export const value = 2;\n', 'utf8');
  writeFileSync(join(root, 'src', 'feature', 'lazy.ts'), 'export const lazyValue = 3;\n', 'utf8');
  writeFileSync(join(root, 'src', 'feature', 'unused.ts'), 'export const unused = 4;\n', 'utf8');

  const graph = buildSourceReachability(root);
  assert.deepEqual(graph.unreachable, ['src/feature/unused.ts']);
  assert.equal(graph.reachable.length, 4);
  assert.deepEqual(graph.unresolvedImports, []);
});

test('real Yingkou source data needs an explicit public-distribution record', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-audit-yingkou-'));
  const sourceRoot = join(root, 'sample_data', 'source', 'yingkou');
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(join(sourceRoot, 'sample.xlsx'), 'placeholder\n', 'utf8');
  assert.equal(hasUnapprovedYingkouSourceData(root), true);

  writeFileSync(join(sourceRoot, 'PUBLIC-DISTRIBUTION.md'), '# Approval record\n', 'utf8');
  assert.equal(hasUnapprovedYingkouSourceData(root), false);
});
