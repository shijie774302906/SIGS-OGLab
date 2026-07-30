import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  applyPromotion,
  applyTransientCleanup,
  auditEvidence,
  planPromotion,
  planTransientCleanup,
} from './evidence-lifecycle.mjs';

function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function write(root, relative, content) { const absolute = path.join(root, relative); mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, content); return absolute; }
function fixture() {
  const root = path.join(tmpdir(), `evidence-lifecycle-${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(path.join(root, 'process_logs/playwright-results'), { recursive: true });
  mkdirSync(path.join(root, 'playwright-report'), { recursive: true });
  mkdirSync(path.join(root, 'process_logs/playwright-mcp'), { recursive: true });
  return root;
}

test('promotion dry plan is bounded, deterministic and rejects traversal', () => {
  const root = fixture();
  write(root, 'process_logs/playwright-results/run/a.png', 'image');
  const plan = planPromotion(root, {
    processId: 'Process097',
    sourceRoot: 'process_logs/playwright-results',
    evidenceDirectory: 'process_logs/playwright-mcp/process097-selected',
    selections: ['run/a.png'],
  });
  assert.equal(plan.files[0].source.sha256, sha('image'));
  assert.equal(existsSync(path.join(root, plan.evidenceDirectory)), false);
  assert.throws(() => planPromotion(root, {
    processId: 'Process097', sourceRoot: 'process_logs/playwright-results', evidenceDirectory: 'process_logs/playwright-mcp/safe', selections: ['../outside.txt'],
  }), /escapes/);
  assert.throws(() => planPromotion(root, {
    processId: 'Process097', sourceRoot: 'process_logs/playwright-mcp', evidenceDirectory: 'process_logs/playwright-mcp/safe', selections: ['anything'],
  }), /Unsupported transient root/);
});

test('applied promotion copies atomically, records hashes and retains source', () => {
  const root = fixture();
  const source = write(root, 'process_logs/playwright-results/run/browser-check.json', '{"ok":true}');
  const plan = planPromotion(root, {
    processId: 'Process097', sourceRoot: 'process_logs/playwright-results', evidenceDirectory: 'process_logs/playwright-mcp/process097-selected', selections: ['run/browser-check.json'],
  });
  const applied = applyPromotion(root, plan);
  assert.equal(applied.sourceRetained, true);
  assert.equal(existsSync(source), true);
  assert.equal(readFileSync(path.join(root, 'process_logs/playwright-mcp/process097-selected/run/browser-check.json'), 'utf8'), '{"ok":true}');
  assert.equal(existsSync(path.join(root, 'process_logs/playwright-mcp/process097-selected/promotion-manifest.json')), true);
  assert.throws(() => applyPromotion(root, plan), /already exists/);
});

test('promotion refuses a source changed after planning', () => {
  const root = fixture();
  const source = write(root, 'process_logs/playwright-results/run/result.json', 'before');
  const plan = planPromotion(root, {
    processId: 'Process097', sourceRoot: 'process_logs/playwright-results', evidenceDirectory: 'process_logs/playwright-mcp/process097-selected', selections: ['run/result.json'],
  });
  writeFileSync(source, 'after');
  assert.throws(() => applyPromotion(root, plan), /changed after planning/);
  assert.equal(existsSync(path.join(root, 'process_logs/playwright-mcp/process097-selected')), false);
});

function createFinalManifest(root, processId) {
  const context = write(root, `process_logs/${processId}.md`, 'context');
  const input = write(root, 'src/value.ts', 'input-v1');
  const artifact = write(root, `process_logs/playwright-mcp/${processId.toLowerCase()}/result.json`, 'artifact');
  const record = (absolute, relative) => ({ path: relative, size: readFileSync(absolute).length, sha256: sha(readFileSync(absolute)) });
  write(root, `process_logs/playwright-mcp/${processId.toLowerCase()}/evidence-manifest.json`, JSON.stringify({
    processId,
    finalClosure: true,
    context: record(context, `process_logs/${processId}.md`),
    inputs: { files: [record(input, 'src/value.ts')] },
    artifacts: { files: [record(artifact, `process_logs/playwright-mcp/${processId.toLowerCase()}/result.json`)] },
  }));
  return { input, artifact };
}

test('audit treats historical input drift as a warning but current input or artifact drift as an error', () => {
  const root = fixture();
  const { input, artifact } = createFinalManifest(root, 'Process096');
  writeFileSync(input, 'input-v2');
  const historical = auditEvidence(root, { currentProcess: 'Process097' });
  assert.equal(historical.ok, true);
  assert.ok(historical.warnings.some((message) => message.includes('historical input changed')));
  const current = auditEvidence(root, { currentProcess: 'Process096' });
  assert.equal(current.ok, false);
  assert.ok(current.errors.some((message) => message.includes('current input changed')));
  writeFileSync(artifact, 'damaged');
  const damaged = auditEvidence(root, { currentProcess: 'Process097' });
  assert.equal(damaged.ok, false);
  assert.ok(damaged.errors.some((message) => message.includes('artifact changed')));
});

test('audit detects a changed promoted artifact', () => {
  const root = fixture();
  const source = write(root, 'process_logs/playwright-results/run/value.json', 'original');
  const plan = planPromotion(root, {
    processId: 'Process097', sourceRoot: 'process_logs/playwright-results', evidenceDirectory: 'process_logs/playwright-mcp/process097-selected', selections: ['run/value.json'],
  });
  applyPromotion(root, plan);
  writeFileSync(path.join(root, 'process_logs/playwright-mcp/process097-selected/run/value.json'), 'damaged');
  const audit = auditEvidence(root, { currentProcess: 'Process097' });
  assert.equal(audit.ok, false);
  assert.ok(audit.errors.some((message) => message.includes('promoted artifact changed')));
  assert.equal(existsSync(source), true);
});

test('cleanup plans only old transient files and apply retains root and new files', () => {
  const root = fixture();
  const oldFile = write(root, 'process_logs/playwright-results/old/trace.zip', 'old');
  const newFile = write(root, 'process_logs/playwright-results/new/result.json', 'new');
  const now = Date.now();
  utimesSync(oldFile, new Date(now - 48 * 3_600_000), new Date(now - 48 * 3_600_000));
  const plan = planTransientCleanup(root, { transientRoot: 'process_logs/playwright-results', olderThanHours: 24, nowMs: now });
  assert.deepEqual(plan.files.map((file) => file.path), ['old/trace.zip']);
  assert.equal(existsSync(oldFile), true);
  const result = applyTransientCleanup(root, plan);
  assert.equal(result.removedFiles, 1);
  assert.equal(existsSync(oldFile), false);
  assert.equal(existsSync(newFile), true);
  assert.equal(existsSync(path.join(root, 'process_logs/playwright-results')), true);
});

test('cleanup refuses curated and changed-after-plan targets', () => {
  const root = fixture();
  assert.throws(() => planTransientCleanup(root, { transientRoot: 'process_logs/playwright-mcp' }), /Unsupported transient root/);
  const file = write(root, 'playwright-report/data/result.txt', 'before');
  const old = new Date(Date.now() - 48 * 3_600_000);
  utimesSync(file, old, old);
  const plan = planTransientCleanup(root, { transientRoot: 'playwright-report', olderThanHours: 24 });
  writeFileSync(file, 'after');
  assert.throws(() => applyTransientCleanup(root, plan), /changed after planning/);
  assert.equal(existsSync(file), true);
});
