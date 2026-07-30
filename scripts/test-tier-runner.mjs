import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TIER_NAMES = ['domain-fast', 'ui-isolated', 'real-serial'];

export function auditTierManifest(rootDir, manifest) {
  const testDir = path.join(rootDir, 'tests', 'e2e');
  const errors = [];
  const actual = readdirSync(testDir).filter((name) => name.endsWith('.spec.ts')).sort();
  const owners = new Map();

  for (const key of Object.keys(manifest)) {
    if (!TIER_NAMES.includes(key)) errors.push(`未知测试层：${key}`);
  }
  for (const tier of TIER_NAMES) {
    if (!Array.isArray(manifest[tier])) {
      errors.push(`缺少测试层数组：${tier}`);
      continue;
    }
    for (const file of manifest[tier]) {
      const prior = owners.get(file);
      if (prior) errors.push(`重复归属：${file} 同时位于 ${prior} 和 ${tier}`);
      else owners.set(file, tier);
      const absolute = path.join(testDir, file);
      try {
        if (!statSync(absolute).isFile()) errors.push(`清单路径不是文件：${file}`);
      } catch {
        errors.push(`清单文件不存在：${file}`);
      }
    }
  }

  for (const file of actual) {
    if (!owners.has(file)) errors.push(`未分层：${file}`);
  }
  for (const file of owners.keys()) {
    if (!actual.includes(file)) errors.push(`失效清单项：${file}`);
  }

  for (const file of manifest['domain-fast'] ?? []) {
    if (!actual.includes(file)) continue;
    const source = readFileSync(path.join(testDir, file), 'utf8');
    if (/async\s*\(\s*\{[^}]*\b(page|browser|context)\b/.test(source)) {
      errors.push(`domain-fast 依赖浏览器 fixture：${file}`);
    }
  }
  for (const tier of ['ui-isolated', 'real-serial']) {
    for (const file of manifest[tier] ?? []) {
      if (!actual.includes(file)) continue;
      const source = readFileSync(path.join(testDir, file), 'utf8');
      if (!source.includes("from './fixtures/isolatedTest'")) {
        errors.push(`${tier} 未使用统一隔离 fixture：${file}`);
      }
      if (/localStorage\.clear\s*\(|deleteWorkspaceDatabase\s*\(/.test(source)) {
        errors.push(`${tier} 绕过统一隔离 helper：${file}`);
      }
    }
  }

  const realConfig = readFileSync(path.join(rootDir, 'playwright.real.config.ts'), 'utf8');
  if (!/workers:\s*1\b/.test(realConfig) || !/fullyParallel:\s*false\b/.test(realConfig)) {
    errors.push('real-serial 配置必须使用 workers: 1 且 fullyParallel: false');
  }
  const domainConfig = readFileSync(path.join(rootDir, 'playwright.domain.config.ts'), 'utf8');
  if (/webServer\s*:/.test(domainConfig)) errors.push('domain-fast 配置不得声明 webServer');

  return {
    ok: errors.length === 0,
    errors,
    specCount: actual.length,
    counts: Object.fromEntries(TIER_NAMES.map((tier) => [tier, manifest[tier]?.length ?? 0])),
  };
}

export function loadAndAudit(rootDir) {
  const manifestPath = path.join(rootDir, 'tests', 'e2e', 'test-tiers.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return { manifest, result: auditTierManifest(rootDir, manifest) };
}

function printAudit(result) {
  if (!result.ok) {
    for (const error of result.errors) process.stderr.write(`- ${error}\n`);
    return;
  }
  process.stdout.write(
    `测试分层检查通过：${result.specCount} 个 spec；`
    + TIER_NAMES.map((tier) => `${tier}=${result.counts[tier]}`).join('，')
    + '\n',
  );
}

function runTier(rootDir, tier, files, extraArgs) {
  const configByTier = {
    'domain-fast': 'playwright.domain.config.ts',
    'ui-isolated': 'playwright.ui.config.ts',
    'real-serial': 'playwright.real.config.ts',
  };
  const executable = process.execPath;
  const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const fileArgs = files.map((file) => `tests/e2e/${file}`);
  const outcome = spawnSync(executable, [
    playwrightCli, 'test',
    ...fileArgs,
    `--config=${configByTier[tier]}`,
    ...extraArgs,
  ], { cwd: rootDir, stdio: 'inherit', shell: false });
  if (outcome.error) throw outcome.error;
  return outcome.status ?? 1;
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const [command = 'audit', tier, ...extraArgs] = process.argv.slice(2);
  const { manifest, result } = loadAndAudit(rootDir);
  printAudit(result);
  if (!result.ok) process.exitCode = 1;
  else if (command === 'run') {
    if (!TIER_NAMES.includes(tier)) {
      process.stderr.write(`未知测试层：${tier ?? '(missing)'}\n`);
      process.exitCode = 1;
    } else process.exitCode = runTier(rootDir, tier, manifest[tier], extraArgs);
  } else if (command !== 'audit') {
    process.stderr.write(`未知命令：${command}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
