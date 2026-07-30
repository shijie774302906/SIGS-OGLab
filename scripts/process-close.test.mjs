import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildClosurePlan, parseCloseArgs, renderArchiveDraft } from './process-close.mjs';

function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function write(root, relative, content) { const absolute = path.join(root, relative); mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, content, 'utf8'); return absolute; }
function fixture({ unchecked = false, verificationStatus = 'passed', emptyEvidence = false } = {}) {
  const root = path.join(tmpdir(), `process-close-${process.pid}-${Math.random().toString(16).slice(2)}`);
  const plan = `# Active Plan - Process098\n\nStatus: \`active / confirmed\`\n\n- Goal: Close safely.\n\n- [${unchecked ? ' ' : 'x'}] [待办1] Complete work.\n`;
  write(root, 'plan.md', plan);
  write(root, 'Process.md', '# Index\n\n## Current - Process098 Closure Dry-Run\n');
  const problems = { schema_version: 1, problems: [{ id: 'KPB-016', related_updates: [] }] };
  const updates = { schema_version: 1, updates: [] };
  write(root, 'docs/knowledge/problem-library.json', JSON.stringify(problems));
  write(root, 'docs/knowledge/update-library.json', JSON.stringify(updates));
  const report = {
    status: 'reviewed',
    context_files: ['plan.md'],
    context_hash: sha(`# plan.md\n${plan}`),
    library_hash: sha(`${JSON.stringify(problems)}\n${JSON.stringify(updates)}`),
    matches: [],
  };
  write(root, 'process_logs/knowledge-reviews/Process098.json', JSON.stringify(report));
  write(root, 'process_logs/verification/Process098-targeted.json', JSON.stringify({
    processId: 'Process098', mode: 'targeted', status: verificationStatus, selectedSpecCount: 1, runs: [{ command: 'test', exitCode: verificationStatus === 'passed' ? 0 : 1 }],
  }));
  mkdirSync(path.join(root, 'process_logs/playwright-mcp/process098-close'), { recursive: true });
  if (!emptyEvidence) write(root, 'process_logs/playwright-mcp/process098-close/preflight.json', '{"ok":true}');
  return root;
}

function options() {
  return {
    processId: 'Process098',
    verificationPaths: ['process_logs/verification/Process098-targeted.json'],
    evidenceDirectory: 'process_logs/playwright-mcp/process098-close',
    problemIds: ['KPB-016'],
  };
}

test('valid preflight produces deterministic proposals and an explicit human draft', () => {
  const root = fixture();
  const before = ['plan.md', 'Process.md', 'docs/knowledge/problem-library.json', 'docs/knowledge/update-library.json'].map((file) => readFileSync(path.join(root, file), 'utf8'));
  const plan = buildClosurePlan(root, options());
  const draft = renderArchiveDraft(plan);
  assert.equal(plan.status, 'dry-run-ready');
  assert.equal(plan.proposed.archivePath, 'process_logs/Process098.md');
  assert.deepEqual(plan.proposed.updateLibraryEntry.problems, ['KPB-016']);
  assert.match(draft, /HUMAN: final title/);
  assert.match(draft, /Final manifest: pending/);
  const after = ['plan.md', 'Process.md', 'docs/knowledge/problem-library.json', 'docs/knowledge/update-library.json'].map((file) => readFileSync(path.join(root, file), 'utf8'));
  assert.deepEqual(after, before);
});

test('unchecked plan work prevents a ready closure draft', () => {
  const root = fixture({ unchecked: true });
  assert.throws(() => buildClosurePlan(root, options()), /unchecked todo/);
});

test('stale knowledge context and library hashes are rejected', () => {
  const root = fixture();
  write(root, 'plan.md', readFileSync(path.join(root, 'plan.md'), 'utf8') + '\nchanged\n');
  assert.throws(() => buildClosurePlan(root, options()), /Knowledge report is stale/);
  const second = fixture();
  write(second, 'docs/knowledge/update-library.json', JSON.stringify({ schema_version: 1, updates: [{ id: 'Process001' }] }));
  assert.throws(() => buildClosurePlan(second, options()), /library hash is stale/);
});

test('failed or wrong-process verification is rejected', () => {
  const root = fixture({ verificationStatus: 'failed' });
  assert.throws(() => buildClosurePlan(root, options()), /Verification is not passed/);
  const second = fixture();
  const file = path.join(second, 'process_logs/verification/Process098-targeted.json');
  const result = JSON.parse(readFileSync(file, 'utf8')); result.processId = 'Process097'; writeFileSync(file, JSON.stringify(result));
  assert.throws(() => buildClosurePlan(second, options()), /belongs to Process097/);
});

test('evidence must be a nonempty child of the curated root', () => {
  const root = fixture({ emptyEvidence: true });
  assert.throws(() => buildClosurePlan(root, options()), /Evidence directory is empty/);
  const second = fixture();
  assert.throws(() => buildClosurePlan(second, { ...options(), evidenceDirectory: 'process_logs/playwright-results' }), /must be a child/);
});

test('archive and update-library collisions are rejected', () => {
  const root = fixture();
  write(root, 'process_logs/Process098.md', 'existing');
  assert.throws(() => buildClosurePlan(root, options()), /Archive already exists/);
  const second = fixture();
  const updateFile = path.join(second, 'docs/knowledge/update-library.json');
  const updates = JSON.parse(readFileSync(updateFile, 'utf8')); updates.updates.push({ id: 'Process098' }); writeFileSync(updateFile, JSON.stringify(updates));
  const reportFile = path.join(second, 'process_logs/knowledge-reviews/Process098.json');
  const report = JSON.parse(readFileSync(reportFile, 'utf8')); report.library_hash = sha(`${JSON.stringify(JSON.parse(readFileSync(path.join(second, 'docs/knowledge/problem-library.json'), 'utf8')))}\n${JSON.stringify(updates)}`); writeFileSync(reportFile, JSON.stringify(report));
  assert.throws(() => buildClosurePlan(second, options()), /already contains Process098/);
});

test('unknown problems and apply mode are refused', () => {
  const root = fixture();
  assert.throws(() => buildClosurePlan(root, { ...options(), problemIds: ['KPB-999'] }), /Unknown problem ID/);
  assert.throws(() => parseCloseArgs(['--process', '098', '--apply']), /dry-run-only/);
});
