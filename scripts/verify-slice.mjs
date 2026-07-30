import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TIERS = ['domain-fast', 'ui-isolated', 'real-serial'];
const CONFIGS = {
  'domain-fast': 'playwright.domain.config.ts',
  'ui-isolated': 'playwright.ui.config.ts',
  'real-serial': 'playwright.real.config.ts',
};
const SCAN_ROOTS = ['src', 'tests', 'scripts', 'docs/process'];
const ROOT_FILES = ['package.json', 'playwright.config.ts', ...Object.values(CONFIGS), 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts'];
const MAINTAINED_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.json', '.md', '.css']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function walk(directory, root, output) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, root, output);
    else if (entry.isFile() && MAINTAINED_EXTENSIONS.has(path.extname(entry.name))) output.push(normalizePath(path.relative(root, absolute)));
  }
}

export function listMaintainedFiles(root) {
  const files = [];
  for (const directory of SCAN_ROOTS) walk(path.join(root, directory), root, files);
  for (const file of ROOT_FILES) if (existsSync(path.join(root, file))) files.push(file);
  return [...new Set(files)].sort();
}

function hashFile(root, relative) {
  const absolute = path.join(root, relative);
  const content = readFileSync(absolute);
  return { path: relative, size: statSync(absolute).size, sha256: sha256(content) };
}

function packageRuntimeSha256(root) {
  const packagePath = path.join(root, 'package.json');
  if (!existsSync(packagePath)) return null;
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  return sha256(JSON.stringify({
    type: manifest.type ?? null,
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {},
    overrides: manifest.overrides ?? {},
  }));
}

export function captureBaseline(root, processId) {
  if (!/^Process\d{3}$/.test(processId)) throw new Error(`Invalid process id: ${processId}`);
  const files = listMaintainedFiles(root).map((file) => hashFile(root, file));
  return {
    schemaVersion: 1,
    processId,
    capturedAt: new Date().toISOString(),
    files,
    aggregateSha256: sha256(files.map((file) => `${file.path}\0${file.sha256}`).join('\n')),
    packageRuntimeSha256: packageRuntimeSha256(root),
  };
}

export function compareBaseline(root, baseline) {
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.files)) throw new Error('Verification baseline is invalid.');
  const before = new Map(baseline.files.map((file) => [normalizePath(file.path), file]));
  const afterFiles = listMaintainedFiles(root);
  const after = new Map(afterFiles.map((file) => [file, hashFile(root, file)]));
  const changes = [];
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (!before.has(file)) changes.push({ path: file, status: 'added' });
    else if (!after.has(file)) changes.push({ path: file, status: 'removed' });
    else if (before.get(file).sha256 !== after.get(file).sha256) changes.push({
      path: file,
      status: 'changed',
      ...(file === 'package.json' ? { runtimeDependenciesChanged: baseline.packageRuntimeSha256 !== packageRuntimeSha256(root) } : {}),
    });
  }
  return changes;
}

function readJson(root, relative, label) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) throw new Error(`${label} not found: ${relative}`);
  try { return JSON.parse(readFileSync(absolute, 'utf8')); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${relative}; ${error.message}`); }
}

function parseImports(root, specPath) {
  const source = readFileSync(path.join(root, specPath), 'utf8');
  const imports = [];
  for (const match of source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/g)) {
    const target = match[2];
    if (target.startsWith('/src/')) imports.push(normalizePath(target.slice(1)));
    else if (target.startsWith('.')) {
      const resolved = normalizePath(path.relative(root, path.resolve(root, path.dirname(specPath), target)));
      imports.push(resolved.replace(/\.(js|ts|tsx)$/, ''));
    }
  }
  return imports;
}

function withoutExtension(value) {
  return normalizePath(value).replace(/\.(ts|tsx|js|mjs)$/, '');
}

function addReason(selection, spec, reason) {
  const reasons = selection.get(spec) ?? new Set();
  reasons.add(reason);
  selection.set(spec, reasons);
}

function tierOwnerMap(tiers) {
  const owners = new Map();
  for (const tier of TIERS) for (const file of tiers[tier] ?? []) owners.set(`tests/e2e/${file}`, tier);
  return owners;
}

function testsFromPlan(root, selection) {
  const planPath = path.join(root, 'plan.md');
  if (!existsSync(planPath)) return;
  const text = readFileSync(planPath, 'utf8');
  for (const match of text.matchAll(/tests\/e2e\/[A-Za-z0-9._/-]+\.spec\.ts/g)) addReason(selection, match[0], 'explicitly referenced by plan.md');
}

function testsFromKnowledge(root, processId, selection) {
  const reportPath = `process_logs/knowledge-reviews/${processId}.json`;
  if (!existsSync(path.join(root, reportPath))) return;
  const report = readJson(root, reportPath, 'knowledge report');
  const library = readJson(root, 'docs/knowledge/problem-library.json', 'problem library');
  const problems = new Map((library.problems ?? []).map((problem) => [problem.id, problem]));
  for (const match of report.matches ?? []) {
    const problem = problems.get(match.problem_id);
    if (!problem) throw new Error(`Knowledge report references unknown problem: ${match.problem_id}`);
    for (const testPath of problem.related_tests ?? []) {
      const normalized = normalizePath(testPath);
      if (!existsSync(path.join(root, normalized))) throw new Error(`${match.problem_id} related test is stale: ${normalized}`);
      if (normalized.startsWith('tests/e2e/') && normalized.endsWith('.spec.ts')) addReason(selection, normalized, `known problem ${match.problem_id}`);
    }
  }
}

function impactForChanges(root, changes, owners, selection, nodeCommands) {
  const specs = [...owners.keys()];
  const importMap = new Map(specs.map((spec) => [spec, parseImports(root, spec)]));
  const unknown = [];
  for (const change of changes) {
    const file = normalizePath(change.path);
    if (owners.has(file)) {
      addReason(selection, file, `${change.status} test file`);
      continue;
    }
    if (file === 'tests/e2e/test-tiers.json' || file.startsWith('playwright.') || file === 'playwright.config.ts') {
      for (const spec of specs) addReason(selection, spec, `${change.status} test configuration ${file}`);
      continue;
    }
    if (file === 'tests/e2e/fixtures/isolatedTest.ts') {
      for (const spec of specs.filter((item) => owners.get(item) !== 'domain-fast')) addReason(selection, spec, `${change.status} shared isolation fixture`);
      continue;
    }
    if (file.startsWith('tests/e2e/fixtures/') || file.startsWith('tests/e2e/') && !file.endsWith('.spec.ts')) {
      const target = withoutExtension(file);
      let matched = false;
      for (const [spec, imports] of importMap) if (imports.includes(target)) {
        addReason(selection, spec, `${change.status} imported test helper ${file}`);
        matched = true;
      }
      if (!matched && file !== 'tests/e2e/test-tiers.json') unknown.push(file);
      continue;
    }
    if (file === 'src/App.tsx' || file === 'src/styles.css') {
      for (const spec of specs.filter((item) => owners.get(item) !== 'domain-fast')) addReason(selection, spec, `${change.status} application shell ${file}`);
      continue;
    }
    if (file.startsWith('src/')) {
      const target = withoutExtension(file);
      let matched = false;
      for (const [spec, imports] of importMap) if (imports.includes(target)) {
        addReason(selection, spec, `${change.status} imported implementation ${file}`);
        matched = true;
      }
      if (!matched) unknown.push(file);
      continue;
    }
    if (file === 'scripts/test-tier-runner.mjs' || file === 'scripts/test-tier-runner.test.mjs') nodeCommands.add('npm.cmd run test:tiers:test');
    else if (file === 'scripts/verify-slice.mjs' || file === 'scripts/verify-slice.test.mjs') nodeCommands.add('npm.cmd run verify:slice:test');
    else if (file === 'scripts/process-close.mjs' || file === 'scripts/process-close.test.mjs') nodeCommands.add('npm.cmd run process:close:test');
    else if (file.startsWith('scripts/process-') || file.startsWith('scripts/evidence-')) nodeCommands.add('npm.cmd run process:test');
    else if (file.startsWith('scripts/knowledge-') || file.startsWith('docs/knowledge/')) nodeCommands.add('npm.cmd run knowledge:test');
    else if (file === 'package.json' && change.runtimeDependenciesChanged === false) {
      nodeCommands.add('npm.cmd run build');
    } else if (file === 'package.json' || file.startsWith('tsconfig') || file === 'vite.config.ts') {
      for (const spec of specs) addReason(selection, spec, `${change.status} shared build configuration ${file}`);
    } else if (file.startsWith('docs/process/')) nodeCommands.add('npm.cmd run process:test');
    else unknown.push(file);
  }
  return unknown;
}

export function buildVerificationPlan(root, { processId, mode, baseline, changes: suppliedChanges }) {
  if (!['targeted', 'closure'].includes(mode)) throw new Error(`Invalid verification mode: ${mode}`);
  const tiers = readJson(root, 'tests/e2e/test-tiers.json', 'test tier manifest');
  const owners = tierOwnerMap(tiers);
  const selection = new Map();
  const nodeCommands = new Set(['npm.cmd run test:tiers:audit']);
  const changes = suppliedChanges ?? compareBaseline(root, baseline);
  let unknown = [];
  if (mode === 'closure') {
    for (const spec of owners.keys()) addReason(selection, spec, 'closure mode');
    nodeCommands.add('npm.cmd run test:tiers:test');
    nodeCommands.add('npm.cmd run build');
    nodeCommands.add('npm.cmd run process:test');
    nodeCommands.add('npm.cmd run knowledge:validate');
  } else {
    testsFromPlan(root, selection);
    testsFromKnowledge(root, processId, selection);
    unknown = impactForChanges(root, changes, owners, selection, nodeCommands);
    if (changes.some((change) => change.path.startsWith('src/') || change.path === 'package.json' || change.path.startsWith('playwright.') || change.path.startsWith('tsconfig') || change.path === 'vite.config.ts')) nodeCommands.add('npm.cmd run build');
  }
  const reportPath = `process_logs/knowledge-reviews/${processId}.json`;
  if (existsSync(path.join(root, reportPath))) nodeCommands.add(`npm.cmd run knowledge:gate -- --context plan.md --report ${reportPath}`);
  nodeCommands.add(`npm.cmd run process:doctor -- --process ${processId.slice(-3)}`);

  if (unknown.length > 0 && mode === 'targeted') throw new Error(`No safe targeted mapping for: ${unknown.join(', ')}. Add an impact rule or use closure mode.`);
  for (const spec of selection.keys()) if (!owners.has(spec)) throw new Error(`Selected spec is not tiered: ${spec}`);
  const selectedByTier = Object.fromEntries(TIERS.map((tier) => [tier, [...selection.keys()].filter((spec) => owners.get(spec) === tier).sort()]));
  return {
    schemaVersion: 1,
    processId,
    mode,
    baselineSha256: baseline.aggregateSha256,
    changes,
    tiers: Object.fromEntries(TIERS.map((tier) => [tier, selectedByTier[tier].map((spec) => ({ path: spec, reasons: [...selection.get(spec)].sort() }))])),
    commands: [...nodeCommands],
    selectedSpecCount: selection.size,
    fullSpecCount: owners.size,
  };
}

function parseArgs(argv) {
  const options = { changed: [] };
  let command = 'verify';
  let index = 0;
  if (argv[0] && !argv[0].startsWith('--')) { command = argv[0]; index = 1; }
  for (; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    if (key === 'dry-run') { options.dryRun = true; continue; }
    const value = argv[++index];
    if (!value) throw new Error(`Missing value for --${key}`);
    if (key === 'changed') options.changed.push({ path: normalizePath(value), status: 'explicit' });
    else options[key] = value;
  }
  return { command, options };
}

function writeJson(absolute, value) {
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runShell(root, command) {
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], { cwd: root, stdio: 'inherit' })
    : spawnSync('/bin/sh', ['-c', command], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function runPlaywrightTier(root, tier, items) {
  if (items.length === 0) return 0;
  const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  const result = spawnSync(
    process.execPath,
    [cli, 'test', ...items.map((item) => item.path), `--config=${CONFIGS[tier]}`, '--reporter=dot'],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export function executePlanSteps(steps, executor) {
  const runs = [];
  for (const step of steps) {
    const exitCode = executor(step);
    runs.push({ ...step, exitCode });
    if (exitCode !== 0) return { status: 'failed', exitCode, runs };
  }
  return { status: 'passed', exitCode: 0, runs };
}

function printPlan(plan) {
  process.stdout.write(`verify:slice ${plan.processId} ${plan.mode}: ${plan.selectedSpecCount}/${plan.fullSpecCount} specs\n`);
  for (const tier of TIERS) process.stdout.write(`- ${tier}: ${plan.tiers[tier].length}\n`);
  for (const change of plan.changes) process.stdout.write(`  change ${change.status}: ${change.path}\n`);
  for (const command of plan.commands) process.stdout.write(`  command: ${command}\n`);
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { command, options } = parseArgs(process.argv.slice(2));
  const processId = options.process ? `Process${String(options.process).replace(/^Process/i, '').padStart(3, '0')}` : null;
  if (!processId || !/^Process\d{3}$/.test(processId)) throw new Error('--process NNN is required.');
  const baselinePath = options.baseline ?? `process_logs/verification/${processId}-baseline.json`;
  if (command === 'baseline') {
    const baseline = captureBaseline(root, processId);
    writeJson(path.join(root, baselinePath), baseline);
    process.stdout.write(`Verification baseline captured: ${baselinePath}; ${baseline.files.length} files.\n`);
    return;
  }
  if (command !== 'verify') throw new Error(`Unknown command: ${command}`);
  if (!existsSync(path.join(root, baselinePath))) throw new Error(`Verification baseline not found: ${baselinePath}. Run verify:slice baseline first.`);
  const baseline = readJson(root, baselinePath, 'verification baseline');
  if (baseline.processId !== processId) throw new Error(`Baseline belongs to ${baseline.processId}, not ${processId}.`);
  const plan = buildVerificationPlan(root, {
    processId,
    mode: options.mode ?? 'targeted',
    baseline,
    changes: options.changed.length > 0 ? options.changed : undefined,
  });
  printPlan(plan);
  const outputPath = options.output ?? `process_logs/verification/${processId}-${plan.mode}.json`;
  const result = { ...plan, startedAt: new Date().toISOString(), status: options.dryRun ? 'dry-run' : 'running', runs: [] };
  writeJson(path.join(root, outputPath), result);
  if (!options.dryRun) {
    const steps = [
      ...plan.commands.map((commandText) => ({ kind: 'shell', command: commandText })),
      ...TIERS.filter((tier) => plan.tiers[tier].length > 0).map((tier) => ({ kind: 'playwright', command: `playwright ${tier}`, tier, specCount: plan.tiers[tier].length })),
    ];
    const outcome = executePlanSteps(steps, (step) => step.kind === 'shell'
      ? runShell(root, step.command)
      : runPlaywrightTier(root, step.tier, plan.tiers[step.tier]));
    result.runs = outcome.runs;
    result.status = outcome.status;
    if (outcome.exitCode !== 0) process.exitCode = outcome.exitCode;
  }
  result.finishedAt = new Date().toISOString();
  writeJson(path.join(root, outputPath), result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
