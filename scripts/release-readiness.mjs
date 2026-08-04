import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SECRET_FILE_PATTERNS = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)mishi\.md$/i,
  /\.(pem|p12|pfx|key)$/i,
  /(^|\/)(id_rsa|id_ed25519)$/i,
];
const SECRET_CONTENT_PATTERNS = [
  { id: 'deepseek-key', pattern: /\bsk-[a-f0-9]{32,}\b/gi },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.svg', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const REQUIRED_SCRIPTS = [
  'build',
  'test:assistant-server',
  'test:domain-fast',
  'test:ui-isolated',
  'test:real-serial',
  'knowledge:gate',
  'process:doctor',
];

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function pushFinding(findings, severity, id, message, detail = undefined) {
  findings.push({ severity, id, message, ...(detail ? { detail } : {}) });
}

function listFiles(root, relativeRoot) {
  const start = resolve(root, relativeRoot);
  if (!existsSync(start)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(normalizePath(relative(root, absolute)));
    }
  };
  visit(start);
  return files.sort();
}

function readJson(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

export function hasUnapprovedYingkouSourceData(root) {
  const yingkouSourceRoot = resolve(root, 'sample_data/source/yingkou');
  if (!existsSync(yingkouSourceRoot)) return false;
  const approvalFiles = [
    resolve(yingkouSourceRoot, 'PUBLIC-DISTRIBUTION.md'),
    resolve(yingkouSourceRoot, 'PUBLIC-DISTRIBUTION.json'),
  ];
  return (
    listFiles(root, 'sample_data/source/yingkou').some((file) => /\.(csv|xlsx?|zip)$/i.test(file))
    && !approvalFiles.some((file) => existsSync(file))
  );
}

export function scanTrackedSecrets(root, trackedFiles) {
  const findings = [];
  for (const trackedFile of trackedFiles) {
    const normalized = normalizePath(trackedFile);
    const isEnvironmentExample = /(^|\/)\.env\.example$/i.test(normalized);
    if (!isEnvironmentExample && SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      pushFinding(findings, 'error', 'tracked-secret-file', '发现不应提交的敏感文件。', { file: normalized });
      continue;
    }
    if (!isEnvironmentExample && !TEXT_EXTENSIONS.has(extname(normalized).toLowerCase())) continue;
    const absolute = resolve(root, normalized);
    if (!existsSync(absolute) || statSync(absolute).size > 2_000_000) continue;
    const content = readFileSync(absolute, 'utf8');
    for (const candidate of SECRET_CONTENT_PATTERNS) {
      const matches = [...content.matchAll(candidate.pattern)];
      for (const match of matches) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        pushFinding(findings, 'error', candidate.id, '发现疑似真实密钥内容；报告不会输出密钥值。', {
          file: normalized,
          line,
        });
      }
    }
  }
  return findings;
}

function extractRelativeSpecifiers(content) {
  const specifiers = new Set();
  const patterns = [
    /\b(?:import|export)\s+[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/g,
    /\bimport\s*['"](\.[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function resolveSourceImport(root, importer, specifier, sourceFiles) {
  const importerDirectory = dirname(resolve(root, importer));
  const unresolved = resolve(importerDirectory, specifier);
  const candidates = [
    unresolved,
    ...SOURCE_EXTENSIONS.map((extension) => `${unresolved}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(unresolved, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    const normalized = normalizePath(relative(root, candidate));
    if (sourceFiles.has(normalized)) return normalized;
  }
  return null;
}

export function buildSourceReachability(root, entryFiles = ['src/main.tsx']) {
  const sourceFiles = new Set(
    listFiles(root, 'src').filter((file) => SOURCE_EXTENSIONS.includes(extname(file)) && !file.endsWith('.d.ts')),
  );
  const reachable = new Set();
  const unresolvedImports = [];
  const queue = entryFiles.filter((entry) => sourceFiles.has(entry));

  while (queue.length) {
    const current = queue.shift();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    const content = readFileSync(resolve(root, current), 'utf8');
    for (const specifier of extractRelativeSpecifiers(content)) {
      const target = resolveSourceImport(root, current, specifier, sourceFiles);
      if (!target) {
        const importedExtension = extname(specifier);
        if (!importedExtension || SOURCE_EXTENSIONS.includes(importedExtension)) {
          unresolvedImports.push({ importer: current, specifier });
        }
        continue;
      }
      if (!reachable.has(target)) queue.push(target);
    }
  }

  return {
    entries: entryFiles,
    reachable: [...reachable].sort(),
    unreachable: [...sourceFiles].filter((file) => !reachable.has(file)).sort(),
    unresolvedImports,
  };
}

function trackedFilesFromGit(root) {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

export function auditReleaseIndex(root, trackedFiles) {
  const findings = [];
  const indexPath = resolve(root, 'docs/process/release-index.json');
  if (!existsSync(indexPath)) {
    pushFinding(findings, 'error', 'release-index-missing', '缺少机器可读上线索引 docs/process/release-index.json。');
    return findings;
  }
  let index;
  try {
    index = JSON.parse(readFileSync(indexPath, 'utf8'));
  } catch {
    pushFinding(findings, 'error', 'release-index-invalid', '上线索引不是有效 JSON。');
    return findings;
  }
  const include = index.current_release?.include_processes;
  const exclude = index.current_release?.exclude_processes;
  if (index.schema_version !== 1 || !index.current_release?.process_id || !Array.isArray(include) || !Array.isArray(exclude)) {
    pushFinding(findings, 'error', 'release-index-invalid', '上线索引缺少版本、当前发布、上线 Process 或排除 Process。');
    return findings;
  }
  const excludedIds = new Set(exclude.map((item) => item?.id).filter(Boolean));
  for (const processId of include) {
    if (excludedIds.has(processId)) {
      pushFinding(findings, 'error', 'release-index-conflict', `${processId} 同时出现在上线和排除列表。`);
    }
    if (!existsSync(resolve(root, `process_logs/${processId}.md`))) {
      pushFinding(findings, 'error', 'release-record-missing', `${processId} 缺少关闭归档。`);
    }
  }
  const tracked = new Set(trackedFiles.map(normalizePath));
  for (const file of index.forbidden_tracked_files ?? []) {
    const normalized = normalizePath(file);
    if (tracked.has(normalized)) pushFinding(findings, 'error', 'release-forbidden-file', '禁止上线的文件进入了 Git 发布候选。', { file: normalized });
  }
  for (const prefix of index.forbidden_tracked_prefixes ?? []) {
    const normalized = normalizePath(prefix);
    for (const file of tracked) {
      if (file.startsWith(normalized)) pushFinding(findings, 'error', 'release-forbidden-prefix', '禁止上线的路径进入了 Git 发布候选。', { file, prefix: normalized });
    }
  }
  for (const rawPattern of index.forbidden_tracked_patterns ?? []) {
    let pattern;
    try {
      pattern = new RegExp(rawPattern, 'i');
    } catch {
      pushFinding(findings, 'error', 'release-index-invalid-pattern', '上线索引包含无效的禁止路径正则。', { pattern: rawPattern });
      continue;
    }
    for (const file of tracked) {
      if (pattern.test(file)) pushFinding(findings, 'error', 'release-forbidden-pattern', '禁止上线的路径模式进入了 Git 发布候选。', { file, pattern: rawPattern });
    }
  }
  return findings;
}

function checkPublicMetadata(root, mode, findings) {
  const packageJson = readJson(root, 'package.json');
  for (const script of REQUIRED_SCRIPTS) {
    if (!packageJson.scripts?.[script]) {
      pushFinding(findings, 'error', 'missing-script', `缺少发布门禁脚本：${script}`);
    }
  }
  for (const configPath of ['tsconfig.app.json', 'tsconfig.node.json']) {
    const config = readJson(root, configPath);
    if (config.compilerOptions?.noUnusedLocals !== true || config.compilerOptions?.noUnusedParameters !== true) {
      pushFinding(findings, 'error', 'typescript-unused-gate', `${configPath} 未启用 noUnusedLocals/noUnusedParameters。`);
    }
  }

  const publicSeverity = mode === 'public' ? 'error' : 'warning';
  if (packageJson.private === true) {
    pushFinding(findings, publicSeverity, 'package-private', 'package.json 仍标记为 private；正式公开前需确认是否保留。');
  }
  if (!packageJson.license || packageJson.license === 'UNLICENSED') {
    pushFinding(findings, publicSeverity, 'license-missing', '项目尚未选择开源许可证。');
  }
  if (!existsSync(resolve(root, 'LICENSE')) && !existsSync(resolve(root, 'LICENSE.md'))) {
    pushFinding(findings, publicSeverity, 'license-file-missing', '缺少 LICENSE 文件。');
  }
  if (hasUnapprovedYingkouSourceData(root)) {
    pushFinding(
      findings,
      publicSeverity,
      'sample-data-permission-missing',
      '营口真实源数据缺少公开分发许可与脱敏记录；正式公开前必须移除数据或补齐 PUBLIC-DISTRIBUTION 记录。',
    );
  }
  if (!existsSync(resolve(root, 'SECURITY.md'))) {
    pushFinding(findings, publicSeverity, 'security-doc-missing', '缺少公开漏洞报告说明 SECURITY.md。');
  }
  if (!existsSync(resolve(root, '.env.example'))) {
    pushFinding(findings, publicSeverity, 'env-example-missing', '缺少不含密钥的 .env.example。');
  }
  const readme = existsSync(resolve(root, 'README.md')) ? readFileSync(resolve(root, 'README.md'), 'utf8') : '';
  if (readme.trim().length < 800) {
    pushFinding(findings, publicSeverity, 'readme-incomplete', 'README 尚不足以支持陌生用户安装、启动、理解数据边界和 AI 密钥边界。');
  }
}

function checkLargeFiles(root, findings) {
  for (const file of listFiles(root, 'src')) {
    const sizeBytes = statSync(resolve(root, file)).size;
    if (sizeBytes >= 500_000) {
      pushFinding(findings, 'warning', 'very-large-source-file', '源文件超过 500 KB，复查和维护成本较高。', { file, sizeBytes });
    } else if (sizeBytes >= 200_000) {
      pushFinding(findings, 'info', 'large-source-file', '源文件超过 200 KB。', { file, sizeBytes });
    }
  }
}

export function auditWorkspace(root, { mode = 'local', trackedFiles } = {}) {
  const findings = [];
  const resolvedTrackedFiles = trackedFiles ?? trackedFilesFromGit(root);
  findings.push(...auditReleaseIndex(root, resolvedTrackedFiles));
  findings.push(...scanTrackedSecrets(root, resolvedTrackedFiles));
  checkPublicMetadata(root, mode, findings);
  checkLargeFiles(root, findings);

  const sourceGraph = buildSourceReachability(root);
  for (const file of sourceGraph.unreachable) {
    pushFinding(findings, 'warning', 'unreachable-source-module', '该源模块不在生产入口依赖图中，删除前仍需核查测试、迁移和脚本用途。', { file });
  }
  for (const item of sourceGraph.unresolvedImports) {
    pushFinding(findings, 'error', 'unresolved-relative-import', '生产依赖图存在无法解析的相对导入。', item);
  }

  const counts = findings.reduce(
    (result, finding) => ({ ...result, [finding.severity]: result[finding.severity] + 1 }),
    { error: 0, warning: 0, info: 0 },
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    counts,
    findings,
    sourceGraph: {
      entries: sourceGraph.entries,
      reachableCount: sourceGraph.reachable.length,
      unreachableCount: sourceGraph.unreachable.length,
    },
  };
}

function parseCli(args) {
  const options = { mode: 'local', report: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--mode') options.mode = args[index + 1] ?? 'local';
    if (args[index] === '--report') options.report = args[index + 1] ?? null;
  }
  if (!['local', 'public'].includes(options.mode)) throw new Error('--mode must be local or public.');
  return options;
}

function printReport(report) {
  process.stdout.write(`Release readiness (${report.mode}): ${report.counts.error} errors, ${report.counts.warning} warnings, ${report.counts.info} info\n`);
  for (const finding of report.findings) {
    const location = finding.detail?.file
      ? ` ${finding.detail.file}${finding.detail.line ? `:${finding.detail.line}` : ''}`
      : '';
    process.stdout.write(`[${finding.severity.toUpperCase()}] ${finding.id}${location} — ${finding.message}\n`);
  }
  process.stdout.write(`Source graph: ${report.sourceGraph.reachableCount} reachable, ${report.sourceGraph.unreachableCount} unreachable\n`);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = process.cwd();
  const options = parseCli(process.argv.slice(2));
  const report = auditWorkspace(root, options);
  if (options.report) {
    const reportPath = resolve(root, options.report);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  printReport(report);
  process.exitCode = report.counts.error > 0 ? 1 : 0;
}
