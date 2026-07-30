import crypto from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TRANSIENT_ROOTS = ['process_logs/playwright-results', 'playwright-report'];
export const CURATED_ROOT = 'process_logs/playwright-mcp';

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalize(value) { return value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''); }
function writeJson(file, value) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }

function resolveInside(root, relative, label) {
  const normalized = normalize(relative);
  if (!normalized || path.isAbsolute(relative) || normalized === '..' || normalized.startsWith('../')) throw new Error(`${label} escapes its allowed root: ${relative}`);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, normalized);
  const relation = path.relative(absoluteRoot, absolute);
  if (!relation || relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) throw new Error(`${label} escapes its allowed root: ${relative}`);
  return absolute;
}

function assertNoSymlink(base, target, label) {
  let current = target;
  const absoluteBase = path.resolve(base);
  while (current !== absoluteBase) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`${label} contains a symbolic link: ${current}`);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function fileRecord(absolute, relative) {
  const content = readFileSync(absolute);
  const stat = statSync(absolute);
  return { path: normalize(relative), size: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256(content) };
}

function validateTransientRoot(root, requested) {
  const normalized = normalize(requested);
  if (!TRANSIENT_ROOTS.includes(normalized)) throw new Error(`Unsupported transient root: ${requested}`);
  const absolute = path.join(root, normalized);
  if (!existsSync(absolute)) throw new Error(`Transient root not found: ${normalized}`);
  assertNoSymlink(root, absolute, 'Transient root');
  return { relative: normalized, absolute };
}

export function planPromotion(root, { processId, sourceRoot, evidenceDirectory, selections }) {
  if (!/^Process\d{3}$/.test(processId)) throw new Error(`Invalid process id: ${processId}`);
  const source = validateTransientRoot(root, sourceRoot);
  const evidence = normalize(evidenceDirectory);
  if (!evidence.startsWith(`${CURATED_ROOT}/`)) throw new Error(`Evidence directory must be below ${CURATED_ROOT}: ${evidenceDirectory}`);
  const destination = resolveInside(path.join(root, CURATED_ROOT), evidence.slice(CURATED_ROOT.length + 1), 'Evidence directory');
  assertNoSymlink(path.join(root, CURATED_ROOT), destination, 'Evidence directory');
  if (existsSync(destination)) throw new Error(`Evidence destination already exists: ${evidence}`);
  if (!Array.isArray(selections) || selections.length === 0) throw new Error('Promotion requires at least one --select file.');
  const seen = new Set();
  const files = selections.map((selection) => {
    const relative = normalize(selection);
    if (seen.has(relative)) throw new Error(`Duplicate promotion selection: ${relative}`);
    seen.add(relative);
    const absolute = resolveInside(source.absolute, relative, 'Promotion selection');
    assertNoSymlink(source.absolute, absolute, 'Promotion selection');
    if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error(`Promotion selection is not a file: ${relative}`);
    return { source: fileRecord(absolute, relative), destination: relative };
  }).sort((a, b) => a.destination.localeCompare(b.destination));
  return { schemaVersion: 1, processId, sourceRoot: source.relative, evidenceDirectory: evidence, plannedAt: new Date().toISOString(), files };
}

export function applyPromotion(root, plan) {
  const source = validateTransientRoot(root, plan.sourceRoot);
  const destination = path.join(root, normalize(plan.evidenceDirectory));
  if (existsSync(destination)) throw new Error(`Evidence destination already exists: ${plan.evidenceDirectory}`);
  const parent = path.dirname(destination);
  mkdirSync(parent, { recursive: true });
  const stage = path.join(parent, `.${path.basename(destination)}.promotion-${process.pid}-${Date.now()}`);
  mkdirSync(stage, { recursive: false });
  try {
    for (const item of plan.files) {
      const sourceFile = resolveInside(source.absolute, item.source.path, 'Promotion selection');
      assertNoSymlink(source.absolute, sourceFile, 'Promotion selection');
      const current = fileRecord(sourceFile, item.source.path);
      if (current.sha256 !== item.source.sha256 || current.size !== item.source.size) throw new Error(`Promotion source changed after planning: ${item.source.path}`);
      const target = resolveInside(stage, item.destination, 'Promotion target');
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(sourceFile, target);
      const copied = fileRecord(target, item.destination);
      if (copied.sha256 !== item.source.sha256) throw new Error(`Promoted copy hash mismatch: ${item.destination}`);
    }
    const promotionManifest = { ...plan, appliedAt: new Date().toISOString(), sourceRetained: true };
    writeJson(path.join(stage, 'promotion-manifest.json'), promotionManifest);
    renameSync(stage, destination);
    return promotionManifest;
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

function walkFiles(directory, base, files, links) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    const relative = normalize(path.relative(base, absolute));
    if (entry.isSymbolicLink()) links.push(relative);
    else if (entry.isDirectory()) walkFiles(absolute, base, files, links);
    else if (entry.isFile()) files.push(relative);
  }
}

function verifyRecordedFile(root, record) {
  const absolute = path.join(root, normalize(record.path));
  if (!existsSync(absolute)) return `missing: ${record.path}`;
  if (!statSync(absolute).isFile()) return `not a file: ${record.path}`;
  const current = fileRecord(absolute, record.path);
  if (current.size !== record.size || current.sha256 !== record.sha256) return `changed: ${record.path}`;
  return null;
}

function auditFinalManifest(root, manifestPath, currentProcess, errors, warnings) {
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (error) { errors.push(`invalid final manifest ${normalize(path.relative(root, manifestPath))}: ${error.message}`); return; }
  const isCurrent = manifest.processId === currentProcess;
  const contextError = verifyRecordedFile(root, manifest.context ?? {});
  if (contextError) errors.push(`${manifest.processId} context ${contextError}`);
  for (const record of manifest.artifacts?.files ?? []) {
    const error = verifyRecordedFile(root, record);
    if (error) errors.push(`${manifest.processId} artifact ${error}`);
  }
  for (const record of manifest.inputs?.files ?? []) {
    const error = verifyRecordedFile(root, record);
    if (error) (isCurrent ? errors : warnings).push(`${manifest.processId} ${isCurrent ? 'current' : 'historical'} input ${error}`);
  }
  if (!manifest.finalClosure) errors.push(`${manifest.processId} manifest is not final closure evidence.`);
}

function auditPromotionManifest(root, manifestPath, errors) {
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (error) { errors.push(`invalid promotion manifest ${normalize(path.relative(root, manifestPath))}: ${error.message}`); return; }
  const directory = path.dirname(manifestPath);
  for (const item of manifest.files ?? []) {
    const absolute = path.join(directory, normalize(item.destination));
    if (!existsSync(absolute)) errors.push(`promoted artifact missing: ${normalize(path.relative(root, absolute))}`);
    else if (sha256(readFileSync(absolute)) !== item.source.sha256) errors.push(`promoted artifact changed: ${normalize(path.relative(root, absolute))}`);
  }
}

function inventory(root, relative) {
  const absolute = path.join(root, relative);
  const files = []; const links = [];
  walkFiles(absolute, absolute, files, links);
  let bytes = 0;
  for (const file of files) bytes += statSync(path.join(absolute, file)).size;
  return { root: relative, files: files.length, bytes, symbolicLinks: links };
}

export function auditEvidence(root, { currentProcess = null } = {}) {
  const curated = path.join(root, CURATED_ROOT);
  const all = []; const links = [];
  walkFiles(curated, curated, all, links);
  const finalManifests = all.filter((file) => file.endsWith('evidence-manifest.json'));
  const promotionManifests = all.filter((file) => file.endsWith('promotion-manifest.json'));
  const errors = links.map((link) => `symbolic link inside curated evidence: ${link}`);
  const warnings = [];
  for (const relative of finalManifests) auditFinalManifest(root, path.join(curated, relative), currentProcess, errors, warnings);
  for (const relative of promotionManifests) auditPromotionManifest(root, path.join(curated, relative), errors);
  const legacyDirectories = existsSync(curated)
    ? readdirSync(curated, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).filter((name) => !finalManifests.some((file) => file.startsWith(`${name}/`)) && !promotionManifests.some((file) => file.startsWith(`${name}/`))).sort()
    : [];
  if (legacyDirectories.length > 0) warnings.push(`${legacyDirectories.length} legacy curated directories have no manifest.`);
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    ok: errors.length === 0,
    currentProcess,
    finalManifestCount: finalManifests.length,
    promotionManifestCount: promotionManifests.length,
    legacyDirectories,
    transient: TRANSIENT_ROOTS.filter((relative) => existsSync(path.join(root, relative))).map((relative) => inventory(root, relative)),
    errors,
    warnings,
  };
}

export function planTransientCleanup(root, { transientRoot, olderThanHours = 24, nowMs = Date.now() }) {
  const source = validateTransientRoot(root, transientRoot);
  const files = []; const links = [];
  walkFiles(source.absolute, source.absolute, files, links);
  const cutoffMs = nowMs - Number(olderThanHours) * 3_600_000;
  const eligible = files.map((file) => fileRecord(path.join(source.absolute, file), file)).filter((file) => file.mtimeMs <= cutoffMs).sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    transientRoot: source.relative,
    plannedAt: new Date(nowMs).toISOString(),
    olderThanHours: Number(olderThanHours),
    files: eligible,
    skippedSymbolicLinks: links,
    totalBytes: eligible.reduce((sum, file) => sum + file.size, 0),
  };
}

export function applyTransientCleanup(root, plan) {
  const source = validateTransientRoot(root, plan.transientRoot);
  for (const record of plan.files) {
    const absolute = resolveInside(source.absolute, record.path, 'Cleanup target');
    assertNoSymlink(source.absolute, absolute, 'Cleanup target');
    if (!existsSync(absolute)) throw new Error(`Cleanup target disappeared after planning: ${record.path}`);
    const current = fileRecord(absolute, record.path);
    if (current.sha256 !== record.sha256 || current.size !== record.size || current.mtimeMs !== record.mtimeMs) throw new Error(`Cleanup target changed after planning: ${record.path}`);
  }
  for (const record of plan.files) rmSync(path.join(source.absolute, record.path), { force: false });
  const directories = [];
  function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) if (entry.isDirectory() && !entry.isSymbolicLink()) { const child = path.join(directory, entry.name); collect(child); directories.push(child); }
  }
  collect(source.absolute);
  for (const directory of directories) if (readdirSync(directory).length === 0) rmdirSync(directory);
  return { ...plan, appliedAt: new Date().toISOString(), removedFiles: plan.files.length, removedBytes: plan.totalBytes };
}

function parseArgs(argv) {
  const command = argv[0] ?? 'audit';
  const options = { select: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    if (key === 'apply' || key === 'transient' || key === 'json') { options[key] = true; continue; }
    const value = argv[++index];
    if (!value) throw new Error(`Missing value for --${key}`);
    if (key === 'select') options.select.push(value); else options[key] = value;
  }
  return { command, options };
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === 'promote') {
    const processId = `Process${String(options.process ?? '').replace(/^Process/i, '').padStart(3, '0')}`;
    const plan = planPromotion(root, { processId, sourceRoot: options.source, evidenceDirectory: options.evidence, selections: options.select });
    const result = options.apply ? applyPromotion(root, plan) : { ...plan, status: 'dry-run' };
    if (options.output) writeJson(path.join(root, options.output), result);
    process.stdout.write(`Evidence promotion ${options.apply ? 'applied' : 'dry-run'}: ${plan.files.length} files -> ${plan.evidenceDirectory}; source retained.\n`);
    return;
  }
  if (command === 'audit') {
    const currentProcess = options.process ? `Process${String(options.process).replace(/^Process/i, '').padStart(3, '0')}` : null;
    const result = auditEvidence(root, { currentProcess });
    if (options.output) writeJson(path.join(root, options.output), result);
    process.stdout.write(`Evidence audit: final=${result.finalManifestCount}, promoted=${result.promotionManifestCount}, legacy=${result.legacyDirectories.length}, errors=${result.errors.length}, warnings=${result.warnings.length}.\n`);
    for (const error of result.errors) process.stderr.write(`- ${error}\n`);
    for (const warning of result.warnings) process.stdout.write(`- warning: ${warning}\n`);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === 'clean') {
    if (!options.transient) throw new Error('Cleanup requires --transient. Curated or historical cleanup is not supported.');
    const plan = planTransientCleanup(root, { transientRoot: options.root, olderThanHours: Number(options['older-than-hours'] ?? 24) });
    const result = options.apply ? applyTransientCleanup(root, plan) : { ...plan, status: 'dry-run' };
    const output = options.output ?? `process_logs/evidence-cleanups/${Date.now()}-${options.apply ? 'applied' : 'dry-run'}.json`;
    writeJson(path.join(root, output), result);
    process.stdout.write(`Transient cleanup ${options.apply ? 'applied' : 'dry-run'}: ${plan.files.length} files, ${plan.totalBytes} bytes in ${plan.transientRoot}.\n`);
    return;
  }
  throw new Error(`Unknown evidence lifecycle command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
