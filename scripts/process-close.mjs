import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalize(value) { return value.replaceAll('\\', '/').replace(/^\.\//, ''); }
function readJson(absolute, label) {
  if (!existsSync(absolute)) throw new Error(`${label} not found: ${absolute}`);
  try { return JSON.parse(readFileSync(absolute, 'utf8')); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); }
}
function hashFile(absolute, root) {
  const content = readFileSync(absolute);
  return { path: normalize(path.relative(root, absolute)), size: statSync(absolute).size, sha256: sha256(content) };
}
function writeText(absolute, content) { mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, content, 'utf8'); }

function formalHashesUnchanged(root, records) {
  return records.every((record) => {
    const absolute = path.join(root, record.path);
    if (!existsSync(absolute)) return false;
    const current = hashFile(absolute, root);
    return current.size === record.size && current.sha256 === record.sha256;
  });
}

function currentLibraryHash(problemLibrary, updateLibrary) {
  return sha256(`${JSON.stringify(problemLibrary)}\n${JSON.stringify(updateLibrary)}`);
}

function planContextHash(planContent) { return sha256(`# plan.md\n${planContent}`); }

function listEvidenceFiles(directory, root) {
  const output = [];
  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Evidence directory contains a symbolic link: ${normalize(path.relative(root, absolute))}`);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) output.push(hashFile(absolute, root));
    }
  }
  walk(directory);
  return output;
}

function extractGoal(planContent) {
  const line = planContent.split(/\r?\n/).find((value) => /^- Goal:|^- 本轮目标：|^- Goal：/.test(value.trim()));
  return line ? line.replace(/^-[^:：]+[:：]\s*/, '').trim() : 'Copy the confirmed goal from plan.md and edit for the final archive.';
}

export function buildClosurePlan(root, { processId, verificationPaths, evidenceDirectory, problemIds }) {
  if (!/^Process\d{3}$/.test(processId)) throw new Error(`Invalid process id: ${processId}`);
  const number = processId.slice(-3);
  const planPath = path.join(root, 'plan.md');
  const indexPath = path.join(root, 'Process.md');
  const reportPath = path.join(root, 'process_logs', 'knowledge-reviews', `${processId}.json`);
  const problemPath = path.join(root, 'docs', 'knowledge', 'problem-library.json');
  const updatePath = path.join(root, 'docs', 'knowledge', 'update-library.json');
  for (const [absolute, label] of [[planPath, 'active plan'], [indexPath, 'Process index'], [reportPath, 'knowledge report'], [problemPath, 'problem library'], [updatePath, 'update library']]) if (!existsSync(absolute)) throw new Error(`${label} not found: ${normalize(path.relative(root, absolute))}`);
  const planContent = readFileSync(planPath, 'utf8');
  const indexContent = readFileSync(indexPath, 'utf8');
  if (!planContent.includes(processId) || !/Status:\s*`active\b/.test(planContent)) throw new Error(`plan.md is not the active ${processId} slice.`);
  const unchecked = [...planContent.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].trim());
  if (unchecked.length > 0) throw new Error(`Active plan has ${unchecked.length} unchecked todo(s): ${unchecked.join(' | ')}`);
  if (!new RegExp(`^## Current - ${processId}\\b`, 'm').test(indexContent)) throw new Error(`Process.md current entry does not own ${processId}.`);
  if (existsSync(path.join(root, 'process_logs', `${processId}.md`))) throw new Error(`Archive already exists: process_logs/${processId}.md`);

  const report = readJson(reportPath, 'knowledge report');
  const problems = readJson(problemPath, 'problem library');
  const updates = readJson(updatePath, 'update library');
  if (report.status !== 'reviewed') throw new Error(`Knowledge report is ${report.status ?? 'invalid'}, not reviewed.`);
  if (JSON.stringify(report.context_files) !== JSON.stringify(['plan.md']) || report.context_hash !== planContextHash(planContent)) throw new Error('Knowledge report is stale or does not belong to plan.md.');
  if (report.library_hash !== currentLibraryHash(problems, updates)) throw new Error('Knowledge report library hash is stale.');
  const pendingMatches = (report.matches ?? []).filter((match) => match.closure_gate && !['covered', 'not-applicable'].includes(match.disposition));
  if (pendingMatches.length > 0) throw new Error(`Knowledge report has pending closure gates: ${pendingMatches.map((match) => match.problem_id).join(', ')}`);

  if (!Array.isArray(verificationPaths) || verificationPaths.length === 0) throw new Error('At least one --verification result is required.');
  const verification = verificationPaths.map((relative) => {
    const normalized = normalize(relative);
    const result = readJson(path.join(root, normalized), 'verification result');
    if (result.processId !== processId) throw new Error(`Verification belongs to ${result.processId ?? 'unknown'}, not ${processId}: ${normalized}`);
    if (result.status !== 'passed') throw new Error(`Verification is not passed (${result.status ?? 'unknown'}): ${normalized}`);
    if (!Array.isArray(result.runs) || result.runs.length === 0 || result.runs.some((run) => run.exitCode !== 0)) throw new Error(`Verification has missing or failed runs: ${normalized}`);
    return { file: hashFile(path.join(root, normalized), root), mode: result.mode, selectedSpecCount: result.selectedSpecCount, runs: result.runs };
  });

  const curatedRoot = path.resolve(root, 'process_logs', 'playwright-mcp');
  const evidenceAbsolute = path.resolve(root, normalize(evidenceDirectory));
  const relation = path.relative(curatedRoot, evidenceAbsolute);
  if (!relation || relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) throw new Error('Evidence directory must be a child of process_logs/playwright-mcp.');
  if (!existsSync(evidenceAbsolute) || !statSync(evidenceAbsolute).isDirectory()) throw new Error(`Evidence directory not found: ${normalize(evidenceDirectory)}`);
  const evidenceFiles = listEvidenceFiles(evidenceAbsolute, root);
  if (evidenceFiles.length === 0) throw new Error(`Evidence directory is empty: ${normalize(evidenceDirectory)}`);
  const finalManifest = evidenceFiles.find((file) => file.path.endsWith('/evidence-manifest.json')) ?? null;

  const knownProblemIds = new Set((problems.problems ?? []).map((problem) => problem.id));
  const uniqueProblemIds = [...new Set(problemIds ?? [])].sort();
  if (uniqueProblemIds.length === 0) throw new Error('At least one explicit --problem ID is required for the update-library draft.');
  for (const id of uniqueProblemIds) if (!knownProblemIds.has(id)) throw new Error(`Unknown problem ID: ${id}`);
  if ((updates.updates ?? []).some((update) => update.id === processId)) throw new Error(`Update library already contains ${processId}.`);

  const formalFiles = [planPath, indexPath, problemPath, updatePath, reportPath].map((file) => hashFile(file, root));
  return {
    schemaVersion: 1,
    processId,
    processNumber: number,
    generatedAt: new Date().toISOString(),
    status: 'dry-run-ready',
    goal: extractGoal(planContent),
    sources: { formalFiles, verification, evidenceDirectory: normalize(evidenceDirectory), evidenceFiles, finalManifest },
    proposed: {
      archivePath: `process_logs/${processId}.md`,
      indexCurrent: `${processId} closed / implemented / verified`,
      updateLibraryEntry: { id: processId, date: new Date().toISOString().slice(0, 10), title: 'HUMAN: final title', status: 'closed', record: `process_logs/${processId}.md`, problems: uniqueProblemIds },
      problemLibraryLinks: uniqueProblemIds.map((id) => ({ problemId: id, addRelatedUpdate: processId })),
      finalPlan: 'rewrite plan.md to no active slice or the next separately confirmed slice only after strict closure passes',
    },
    requiredOrder: [
      'Human completes archive title, result, professional conclusion, boundaries and not-applicable reasoning.',
      'Write the archive and bidirectional knowledge-library links; update Process.md current/recent entry.',
      'Regenerate knowledge report against the archive and pass the knowledge gate.',
      finalManifest ? 'Audit the current final evidence manifest.' : 'Create and audit the final evidence manifest against the archive and final inputs.',
      'Rewrite plan.md only after all prior closure steps pass.',
      `Run process:doctor -- --process ${number} --phase closure.`,
    ],
    humanRequired: [
      'Confirm the final title and outcome.',
      'Confirm professional/engineering correctness and boundaries.',
      'Confirm each not-applicable disposition remains justified.',
      'Confirm the selected evidence proves the user action and semantics.',
    ],
  };
}

export function renderArchiveDraft(plan) {
  return `# ${plan.processId} - HUMAN: final title\n\nDate: ${plan.proposed.updateLibraryEntry.date}\n\nStatus: \`draft / dry-run / not closed\`\n\n## Goal\n\n${plan.goal}\n\n## Result\n\n- [ ] HUMAN: describe the actual implemented outcome.\n- [ ] HUMAN: confirm professional/engineering correctness and boundaries.\n\n## Verification\n\n${plan.sources.verification.map((item) => `- ${item.file.path}: ${item.mode}, ${item.selectedSpecCount} selected specs, ${item.runs.length} successful runs.`).join('\n')}\n\n## Evidence\n\n- Directory: \`${plan.sources.evidenceDirectory}\`\n- Files: ${plan.sources.evidenceFiles.length}\n- Final manifest: ${plan.sources.finalManifest ? `\`${plan.sources.finalManifest.path}\`` : 'pending; must be created after formal archive content is final'}\n\n## Known Problems\n\n${plan.proposed.updateLibraryEntry.problems.map((id) => `- ${id}`).join('\n')}\n\n## Human Closure Checks\n\n${plan.humanRequired.map((item) => `- [ ] ${item}`).join('\n')}\n\n## Mechanical Order\n\n${plan.requiredOrder.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n`;
}

export function parseCloseArgs(argv) {
  const options = { verification: [], problem: [], dryRun: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    if (key === 'dry-run') continue;
    if (key === 'apply') throw new Error('process:close is dry-run-only; automatic apply is intentionally unsupported.');
    const value = argv[++index];
    if (!value) throw new Error(`Missing value for --${key}`);
    if (key === 'verification' || key === 'problem') options[key].push(value); else options[key] = value;
  }
  return options;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const options = parseCloseArgs(process.argv.slice(2));
  const processId = `Process${String(options.process ?? '').replace(/^Process/i, '').padStart(3, '0')}`;
  const output = options.output ?? `process_logs/closure-drafts/${processId}.json`;
  const draft = options.draft ?? `process_logs/closure-drafts/${processId}.md`;
  try {
    const plan = buildClosurePlan(root, { processId, verificationPaths: options.verification, evidenceDirectory: options.evidence, problemIds: options.problem });
    writeText(path.join(root, draft), renderArchiveDraft(plan));
    plan.formalFilesUnchanged = formalHashesUnchanged(root, plan.sources.formalFiles);
    if (!plan.formalFilesUnchanged) throw new Error('Formal files changed while producing the dry-run draft.');
    writeText(path.join(root, output), `${JSON.stringify(plan, null, 2)}\n`);
    process.stdout.write(`Closure dry-run ready: ${processId}; JSON=${output}; draft=${draft}. Formal records unchanged.\n`);
  } catch (error) {
    if (options.output) writeText(path.join(root, output), `${JSON.stringify({ processId, status: 'failed', error: error.message, generatedAt: new Date().toISOString() }, null, 2)}\n`);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
