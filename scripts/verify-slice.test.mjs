import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildVerificationPlan, captureBaseline, compareBaseline, executePlanSteps } from './verify-slice.mjs';

function write(root, relative, content = '') {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function fixture() {
  const root = path.join(tmpdir(), `verify-slice-${process.pid}-${Math.random().toString(16).slice(2)}`);
  write(root, 'plan.md', '# Process096 test selection\n');
  write(root, 'package.json', '{}\n');
  write(root, 'src/foo.ts', 'export const value = 1;\n');
  write(root, 'src/unmapped.ts', 'export const unknown = true;\n');
  write(root, 'tests/e2e/domain.spec.ts', "import { value } from '../../src/foo'; void value;\n");
  write(root, 'tests/e2e/ui.spec.ts', "import { test } from './fixtures/isolatedTest'; void test;\n");
  write(root, 'tests/e2e/real.spec.ts', "import { test } from './fixtures/isolatedTest'; void test;\n");
  write(root, 'tests/e2e/fixtures/isolatedTest.ts', 'export const test = {};\n');
  write(root, 'tests/e2e/test-tiers.json', JSON.stringify({
    'domain-fast': ['domain.spec.ts'],
    'ui-isolated': ['ui.spec.ts'],
    'real-serial': ['real.spec.ts'],
  }));
  write(root, 'docs/knowledge/problem-library.json', JSON.stringify({ schema_version: 1, problems: [] }));
  return root;
}

test('baseline comparison reports added, changed, removed and reverted files deterministically', () => {
  const root = fixture();
  const baseline = captureBaseline(root, 'Process096');
  write(root, 'src/foo.ts', 'export const value = 2;\n');
  write(root, 'src/added.ts', 'export const added = true;\n');
  rmSync(path.join(root, 'src/unmapped.ts'));
  assert.deepEqual(compareBaseline(root, baseline), [
    { path: 'src/added.ts', status: 'added' },
    { path: 'src/foo.ts', status: 'changed' },
    { path: 'src/unmapped.ts', status: 'removed' },
  ]);
  write(root, 'src/foo.ts', 'export const value = 1;\n');
  assert.equal(compareBaseline(root, baseline).some((change) => change.path === 'src/foo.ts'), false);
});

test('targeted mode maps a changed implementation to directly importing specs with reasons', () => {
  const root = fixture();
  const baseline = captureBaseline(root, 'Process096');
  const plan = buildVerificationPlan(root, {
    processId: 'Process096',
    mode: 'targeted',
    baseline,
    changes: [{ path: 'src/foo.ts', status: 'changed' }],
  });
  assert.equal(plan.selectedSpecCount, 1);
  assert.equal(plan.tiers['domain-fast'][0].path, 'tests/e2e/domain.spec.ts');
  assert.match(plan.tiers['domain-fast'][0].reasons[0], /imported implementation/);
  assert.ok(plan.commands.includes('npm.cmd run build'));
});

test('shared isolation fixture selects every browser tier but no domain spec', () => {
  const root = fixture();
  const baseline = captureBaseline(root, 'Process096');
  const plan = buildVerificationPlan(root, {
    processId: 'Process096',
    mode: 'targeted',
    baseline,
    changes: [{ path: 'tests/e2e/fixtures/isolatedTest.ts', status: 'changed' }],
  });
  assert.equal(plan.tiers['domain-fast'].length, 0);
  assert.equal(plan.tiers['ui-isolated'].length, 1);
  assert.equal(plan.tiers['real-serial'].length, 1);
});

test('unknown changed implementation fails safe instead of returning an empty pass', () => {
  const root = fixture();
  const baseline = captureBaseline(root, 'Process096');
  assert.throws(() => buildVerificationPlan(root, {
    processId: 'Process096',
    mode: 'targeted',
    baseline,
    changes: [{ path: 'src/unmapped.ts', status: 'changed' }],
  }), /No safe targeted mapping/);
});

test('knowledge matches contribute their related tests', () => {
  const root = fixture();
  write(root, 'docs/knowledge/problem-library.json', JSON.stringify({
    schema_version: 1,
    problems: [{ id: 'KPB-001', related_tests: ['tests/e2e/ui.spec.ts'] }],
  }));
  write(root, 'process_logs/knowledge-reviews/Process096.json', JSON.stringify({ matches: [{ problem_id: 'KPB-001' }] }));
  const baseline = captureBaseline(root, 'Process096');
  const plan = buildVerificationPlan(root, { processId: 'Process096', mode: 'targeted', baseline, changes: [] });
  assert.equal(plan.tiers['ui-isolated'][0].path, 'tests/e2e/ui.spec.ts');
  assert.deepEqual(plan.tiers['ui-isolated'][0].reasons, ['known problem KPB-001']);
});

test('stale knowledge related tests fail with the owning problem id and path', () => {
  const root = fixture();
  write(root, 'docs/knowledge/problem-library.json', JSON.stringify({
    schema_version: 1,
    problems: [{ id: 'KPB-009', related_tests: ['tests/e2e/missing.spec.ts'] }],
  }));
  write(root, 'process_logs/knowledge-reviews/Process096.json', JSON.stringify({ matches: [{ problem_id: 'KPB-009' }] }));
  const baseline = captureBaseline(root, 'Process096');
  assert.throws(
    () => buildVerificationPlan(root, { processId: 'Process096', mode: 'targeted', baseline, changes: [] }),
    /KPB-009 related test is stale: tests\/e2e\/missing\.spec\.ts/,
  );
});

test('execution stops on the first failed child and keeps partial results', () => {
  const visited = [];
  const outcome = executePlanSteps(
    [{ command: 'first' }, { command: 'fails' }, { command: 'must-not-run' }],
    (step) => { visited.push(step.command); return step.command === 'fails' ? 7 : 0; },
  );
  assert.deepEqual(visited, ['first', 'fails']);
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.exitCode, 7);
  assert.deepEqual(outcome.runs.map((run) => run.exitCode), [0, 7]);
});

test('closure mode selects the complete tier manifest and all mechanical gates', () => {
  const root = fixture();
  const baseline = captureBaseline(root, 'Process096');
  const plan = buildVerificationPlan(root, { processId: 'Process096', mode: 'closure', baseline, changes: [] });
  assert.equal(plan.selectedSpecCount, 3);
  assert.deepEqual(Object.fromEntries(Object.entries(plan.tiers).map(([tier, items]) => [tier, items.length])), {
    'domain-fast': 1,
    'ui-isolated': 1,
    'real-serial': 1,
  });
  assert.ok(plan.commands.includes('npm.cmd run build'));
  assert.ok(plan.commands.includes('npm.cmd run process:test'));
  assert.ok(plan.commands.includes('npm.cmd run knowledge:validate'));
});

test('process close tooling selects its dedicated constraint suite', () => {
  const root = fixture();
  write(root, 'scripts/process-close.mjs', 'export {};\n');
  const baseline = captureBaseline(root, 'Process096');
  const plan = buildVerificationPlan(root, {
    processId: 'Process096',
    mode: 'targeted',
    baseline,
    changes: [{ path: 'scripts/process-close.mjs', status: 'changed' }],
  });
  assert.ok(plan.commands.includes('npm.cmd run process:close:test'));
});

test('package script-only changes do not select all Playwright specs', () => {
  const root = fixture();
  write(root, 'package.json', JSON.stringify({ type: 'module', dependencies: { react: '1' }, scripts: { test: 'old' } }));
  const baseline = captureBaseline(root, 'Process096');
  write(root, 'package.json', JSON.stringify({ type: 'module', dependencies: { react: '1' }, scripts: { test: 'new' } }));
  const changes = compareBaseline(root, baseline);
  const packageChange = changes.find((change) => change.path === 'package.json');
  assert.equal(packageChange.runtimeDependenciesChanged, false);
  const plan = buildVerificationPlan(root, { processId: 'Process096', mode: 'targeted', baseline, changes });
  assert.equal(plan.selectedSpecCount, 0);
  assert.ok(plan.commands.includes('npm.cmd run build'));
});

test('package dependency changes remain a full Playwright impact', () => {
  const root = fixture();
  write(root, 'package.json', JSON.stringify({ dependencies: { react: '1' } }));
  const baseline = captureBaseline(root, 'Process096');
  write(root, 'package.json', JSON.stringify({ dependencies: { react: '2' } }));
  const changes = compareBaseline(root, baseline);
  assert.equal(changes.find((change) => change.path === 'package.json').runtimeDependenciesChanged, true);
  const plan = buildVerificationPlan(root, { processId: 'Process096', mode: 'targeted', baseline, changes });
  assert.equal(plan.selectedSpecCount, 3);
});
