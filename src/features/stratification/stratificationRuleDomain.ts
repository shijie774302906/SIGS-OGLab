import type {
  StratificationInputDependencyV2,
  StratificationRuleCandidateV1,
  StratificationRuleInputRowV1,
  StratificationRuleIssueV1,
  StratificationRuleRunV1,
  StratificationRuleSettingsV1,
  StratificationWorkspaceV2,
} from '../workspace/workspaceV2';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import { PROTOTYPE_STRATIFICATION_EDIT_SPACING_M } from './stratificationConstants';
import {
  applyStratificationCommand,
  createBaseStratificationScheme,
  sameStratificationInput,
} from './stratificationDomain';

export const STRATIFICATION_CHANGE_POINT_SPEC_V1 = Object.freeze({
  ruleId: 'qc_fr_change_point_v1' as const,
  version: 1,
  label: 'qc / Fr 变化点',
  formula: '0.7 * (1 - exp(-abs(ln(qcBelow/qcAbove)))) + 0.3 * (1 - exp(-abs(ln(frBelow/frAbove))))',
  missingFrFormula: '1 - exp(-abs(ln(qcBelow/qcAbove)))',
  depthDefinition: 'midpoint_between_adjacent_windows',
  selection: 'score_descending_then_min_spacing_then_depth_ascending',
});

export const DEFAULT_STRATIFICATION_RULE_SETTINGS_V1: StratificationRuleSettingsV1 = Object.freeze({
  kind: 'qc_fr_change_point_v1',
  windowRows: 3,
  scoreThreshold: 0.28,
  minSpacingM: 0.5,
  maxBoundaries: 8,
});

export function buildStratificationRuleInputRows(
  sourceRowIds: string[] | undefined,
  rows: Array<{ depthM: number; qcKpa: number; frPercent: number }>,
) {
  if (sourceRowIds && sourceRowIds.length !== rows.length) {
    return { ok: false as const, problem: '规则分层输入行与来源行标识数量不一致。' };
  }
  const inputRows = rows.map((row, index): StratificationRuleInputRowV1 => ({
    sourceRowId: sourceRowIds?.[index] ?? `visible-row:${index + 1}`,
    depthM: finiteOrNaN(row.depthM),
    qcKpa: finiteOrNull(row.qcKpa),
    frPercent: finiteOrNull(row.frPercent),
  }));
  if (new Set(inputRows.map((row) => row.sourceRowId)).size !== inputRows.length) {
    return { ok: false as const, problem: '规则分层输入包含重复来源行。' };
  }
  return { ok: true as const, rows: inputRows };
}

export function validateStratificationRuleSettings(settings: StratificationRuleSettingsV1) {
  const problems: string[] = [];
  if (settings.kind !== 'qc_fr_change_point_v1') problems.push('规则版本不受支持。');
  if (!Number.isInteger(settings.windowRows) || settings.windowRows < 2 || settings.windowRows > 12) problems.push('窗口行数必须是 2 至 12 的整数。');
  if (!Number.isFinite(settings.scoreThreshold) || settings.scoreThreshold < 0.05 || settings.scoreThreshold > 0.95) problems.push('变化阈值必须在 0.05 至 0.95 之间。');
  if (!Number.isFinite(settings.minSpacingM) || settings.minSpacingM < 0.05 || settings.minSpacingM > 20) problems.push('最小边界间距必须在 0.05 m 至 20 m 之间。');
  if (!Number.isInteger(settings.maxBoundaries) || settings.maxBoundaries < 1 || settings.maxBoundaries > 30) problems.push('候选边界上限必须是 1 至 30 的整数。');
  return problems;
}

export function prepareStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  input: StratificationInputDependencyV2,
  inputRows: StratificationRuleInputRowV1[],
  settings: StratificationRuleSettingsV1,
  commandId: string,
  now = new Date().toISOString(),
  runId = createIdentifier('str-rule-run'),
) {
  const settingProblems = validateStratificationRuleSettings(settings);
  if (settingProblems.length) return { ok: false as const, problem: settingProblems.join(' ') };
  if (!commandId.trim() || !runId.trim()) return { ok: false as const, problem: '规则运行命令和运行标识不能为空。' };
  if (!inputRows.length) return { ok: false as const, problem: '规则运行没有可冻结的输入行。' };
  if (new Set(inputRows.map((row) => row.sourceRowId)).size !== inputRows.length) {
    return { ok: false as const, problem: '规则运行输入包含重复来源行。' };
  }
  const next = ensureRuleWorkspace(workspace);
  if (next.ruleRuns!.some((run) => run.runId === runId)) return { ok: false as const, problem: '规则运行标识已存在。' };
  const formulaSpecHash = sha256HexSync(stableStringify(STRATIFICATION_CHANGE_POINT_SPEC_V1));
  const sourceLineageHash = sha256HexSync(stableStringify(input));
  const inputHash = sha256HexSync(stableStringify(inputRows));
  const settingsHash = sha256HexSync(stableStringify(settings));
  const idempotencyKey = sha256HexSync(stableStringify({
    commandId,
    formulaSpecHash,
    sourceLineageHash,
    inputHash,
    settingsHash,
  }));
  const duplicate = next.ruleRuns!.find((run) => run.idempotencyKey === idempotencyKey);
  if (duplicate) {
    const duplicateValidation = validateStratificationRuleRunStructure(duplicate);
    if (!duplicateValidation.ok) return { ok: false as const, problem: `幂等规则运行已损坏：${duplicateValidation.problem}` };
    return { ok: true as const, workspace: next, run: structuredClone(duplicate), idempotent: true as const };
  }
  const run: StratificationRuleRunV1 = {
    runId,
    commandId,
    idempotencyKey,
    status: 'queued',
    input: structuredClone(input),
    inputRowsSnapshot: structuredClone(inputRows),
    settingsSnapshot: structuredClone(settings),
    formulaSpecHash,
    sourceLineageHash,
    inputHash,
    settingsHash,
    candidates: [],
    issues: [],
    summary: null,
    resultHash: null,
    createdAt: now,
  };
  const runValidation = validateStratificationRuleRunStructure(run);
  if (!runValidation.ok) return { ok: false as const, problem: runValidation.problem };
  next.ruleRuns!.push(run);
  next.activeRuleRunId = run.runId;
  return { ok: true as const, workspace: next, run: structuredClone(run), idempotent: false as const };
}

export function startStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionRuleRun(workspace, runId, (run) => {
    if (run.status !== 'queued') return { ok: false as const, problem: '只有排队中的规则运行可以开始。' };
    run.status = 'running';
    run.startedAt = now;
    return { ok: true as const };
  });
}

export function requestStratificationRuleRunCancellation(workspace: StratificationWorkspaceV2, runId: string) {
  return transitionRuleRun(workspace, runId, (run) => {
    if (!['queued', 'running'].includes(run.status)) return { ok: false as const, problem: '当前规则运行不能请求取消。' };
    run.status = 'cancel-requested';
    return { ok: true as const };
  });
}

export function cancelStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionRuleRun(workspace, runId, (run) => {
    if (!['queued', 'running', 'cancel-requested'].includes(run.status)) return { ok: false as const, problem: '当前规则运行不能取消。' };
    run.status = 'cancelled';
    run.cancelledAt = now;
    return { ok: true as const };
  });
}

export function completeStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  now = new Date().toISOString(),
) {
  return transitionRuleRun(workspace, runId, (run) => {
    if (run.status === 'cancel-requested') {
      run.status = 'cancelled';
      run.cancelledAt = now;
      return { ok: true as const };
    }
    if (run.status !== 'running') return { ok: false as const, problem: '只有运行中的规则任务可以完成。' };
    const result = evaluateChangePointRule(run.inputRowsSnapshot, run.settingsSnapshot);
    run.status = 'completed';
    run.candidates = result.candidates;
    run.issues = result.issues;
    run.summary = result.summary;
    run.resultHash = ruleResultHash(run);
    run.completedAt = now;
    return { ok: true as const };
  });
}

export function failStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  errorCode: string,
  errorMessage: string,
  now = new Date().toISOString(),
) {
  if (!errorCode.trim() || !errorMessage.trim()) return { ok: false as const, problem: '失败规则运行必须提供错误码和错误信息。' };
  return transitionRuleRun(workspace, runId, (run) => {
    if (!['queued', 'running'].includes(run.status)) return { ok: false as const, problem: '当前规则运行不能标记失败。' };
    run.status = 'failed';
    run.errorCode = errorCode;
    run.errorMessage = errorMessage;
    run.failedAt = now;
    return { ok: true as const };
  });
}

export function createSchemeFromStratificationRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  currentInput: StratificationInputDependencyV2,
  name: string,
  now = new Date().toISOString(),
  schemeId = createIdentifier('rule-scheme'),
) {
  const run = workspace.ruleRuns?.find((candidate) => candidate.runId === runId);
  if (!run || run.status !== 'completed' || !run.summary) return { ok: false as const, problem: '请选择一个已完成的规则候选运行。' };
  const runValidation = validateStratificationRuleRunStructure(run);
  if (!runValidation.ok) return { ok: false as const, problem: `规则运行完整性校验失败：${runValidation.problem}` };
  if (!sameStratificationInput(run.input, currentInput)) return { ok: false as const, problem: '规则候选不再对应最新检查，请重新运行。' };
  if (run.issues.some((issue) => issue.severity === 'problem')) return { ok: false as const, problem: '规则运行存在输入问题，不能转为方案。' };
  if (!run.candidates.length) return { ok: false as const, problem: '当前运行没有候选边界，请调整设置或继续手动分层。' };
  if (workspace.editSession?.dirty) return { ok: false as const, problem: '当前方案有未提交修改，请先提交或放弃。' };
  const depths = run.inputRowsSnapshot.map((row) => row.depthM);
  const created = createBaseStratificationScheme(
    ensureRuleWorkspace(workspace),
    currentInput,
    Math.min(...depths),
    Math.max(...depths),
    name,
    now,
    schemeId,
  );
  if (!created.ok) return created;
  let nextWorkspace = created.workspace;
  for (const candidate of run.candidates) {
    const applied = applyStratificationCommand(nextWorkspace, { kind: 'add-boundary', depthM: candidate.depthM }, now);
    if (!applied.ok) return { ok: false as const, problem: applied.problem };
    nextWorkspace = applied.workspace;
  }
  const session = nextWorkspace.editSession;
  if (!session) return { ok: false as const, problem: '候选方案没有建立编辑会话。' };
  session.working.origin = { kind: 'rule-candidate', ruleRunId: run.runId, ruleId: run.settingsSnapshot.kind };
  session.baseline.origin = structuredClone(session.working.origin);
  session.working.layers.forEach((layer, index) => {
    layer.name = `规则层 ${index + 1}`;
    layer.reviewRequired = true;
    layer.soilDecision = {
      suggestedGroup: null,
      finalGroup: 'unclassified',
      suggestedDetailedType: null,
      finalDetailedType: null,
      reviewStatus: 'needs-review',
      reviewAction: 'method-suggested',
      source: 'manual',
      decidedAt: now,
    };
  });
  session.working.boundaries.forEach((boundary, index) => {
    const candidate = run.candidates[index];
    boundary.reviewRequired = true;
    if (candidate) {
      boundary.ruleCandidateRef = {
        ruleRunId: run.runId,
        candidateId: candidate.candidateId,
        originalDepthM: candidate.depthM,
        sourceRowIds: [...candidate.sourceRowIds],
      };
    }
    boundary.note = candidate
      ? `规则候选：变化点评分 ${candidate.score.toFixed(3)}，需结合曲线人工确认。`
      : '规则候选边界，需结合曲线人工确认。';
  });
  const stored = nextWorkspace.schemes.find((scheme) => scheme.schemeId === session.schemeId);
  if (stored) stored.origin = structuredClone(session.working.origin);
  return { ok: true as const, workspace: nextWorkspace, scheme: structuredClone(session.working), run: structuredClone(run) };
}

export function validateStratificationRuleRunStructure(run: StratificationRuleRunV1) {
  if (!run.runId || !run.commandId || !run.idempotencyKey || !run.inputRowsSnapshot.length) return { ok: false as const, problem: '规则运行身份或输入快照不完整。' };
  if (validateStratificationRuleSettings(run.settingsSnapshot).length) return { ok: false as const, problem: '规则运行设置无效。' };
  const formulaSpecHash = sha256HexSync(stableStringify(STRATIFICATION_CHANGE_POINT_SPEC_V1));
  const sourceLineageHash = sha256HexSync(stableStringify(run.input));
  const inputHash = sha256HexSync(stableStringify(run.inputRowsSnapshot));
  const settingsHash = sha256HexSync(stableStringify(run.settingsSnapshot));
  const idempotencyKey = sha256HexSync(stableStringify({ commandId: run.commandId, formulaSpecHash, sourceLineageHash, inputHash, settingsHash }));
  if (
    run.formulaSpecHash !== formulaSpecHash
    || run.sourceLineageHash !== sourceLineageHash
    || run.inputHash !== inputHash
    || run.settingsHash !== settingsHash
    || run.idempotencyKey !== idempotencyKey
  ) return { ok: false as const, problem: '规则运行输入、设置或公式哈希不一致。' };
  const statuses: StratificationRuleRunV1['status'][] = ['queued', 'running', 'cancel-requested', 'completed', 'cancelled', 'failed', 'invalidated'];
  if (!statuses.includes(run.status)) return { ok: false as const, problem: '规则运行状态不受支持。' };
  if (!isValidIsoTime(run.createdAt)) return { ok: false as const, problem: '规则运行创建时间无效。' };
  const timestampProblem = validateRunTimestamps(run);
  if (timestampProblem) return { ok: false as const, problem: timestampProblem };
  if (run.status === 'completed') {
    const expected = evaluateChangePointRule(run.inputRowsSnapshot, run.settingsSnapshot);
    if (
      stableStringify(run.candidates) !== stableStringify(expected.candidates)
      || stableStringify(run.issues) !== stableStringify(expected.issues)
      || stableStringify(run.summary) !== stableStringify(expected.summary)
      || run.resultHash !== ruleResultHash(run)
      || !run.startedAt
      || !run.completedAt
    ) return { ok: false as const, problem: '规则运行结果不能由冻结输入重建。' };
  } else if (run.candidates.length || run.issues.length || run.summary || run.resultHash) {
    return { ok: false as const, problem: '未完成规则运行不能持有部分结果。' };
  }
  return { ok: true as const };
}

function evaluateChangePointRule(
  rows: StratificationRuleInputRowV1[],
  settings: StratificationRuleSettingsV1,
) {
  const issues: StratificationRuleIssueV1[] = [];
  const minimumRows = settings.windowRows * 2;
  if (rows.length < minimumRows) {
    issues.push(issue('StrRuleInputTooShort', 'problem', `至少需要 ${minimumRows} 行数据才能形成前后窗口。`, 'data-check', rows.map((row) => row.sourceRowId)));
    return result([], issues, rows.length, 0, 0);
  }
  if (rows.some((row, index) => !Number.isFinite(row.depthM) || (index > 0 && row.depthM <= rows[index - 1].depthM))) {
    issues.push(issue('StrRuleDepthOrderInvalid', 'problem', '深度必须为有限值并严格递增，重复或逆序深度需返回数据检查。', 'data-check', rows.map((row) => row.sourceRowId)));
    return result([], issues, rows.length, 0, 0);
  }
  const invalidQcRows = rows.filter((row) => row.qcKpa === null || !Number.isFinite(row.qcKpa) || row.qcKpa <= 0);
  if (invalidQcRows.length) {
    issues.push(issue('StrRuleQcInvalid', 'problem', 'qc 必须为有限正值，不能用缺失或非正值生成变化点。', 'data-check', invalidQcRows.map((row) => row.sourceRowId)));
    return result([], issues, rows.length, 0, 0);
  }
  const frAvailable = rows.every((row) => row.frPercent !== null && Number.isFinite(row.frPercent) && row.frPercent > 0);
  if (!frAvailable) {
    issues.push(issue('StrRuleFrUnavailable', 'notice', '部分 Fr 缺失或非正，本次只使用 qc 变化项并保留提示。', 'manual-stratification', rows.filter((row) => row.frPercent === null || !Number.isFinite(row.frPercent) || row.frPercent <= 0).map((row) => row.sourceRowId)));
  }
  const evaluated: Array<{ candidate: StratificationRuleCandidateV1; rawScore: number }> = [];
  for (let split = settings.windowRows; split <= rows.length - settings.windowRows; split += 1) {
    const above = rows.slice(split - settings.windowRows, split);
    const below = rows.slice(split, split + settings.windowRows);
    const qcAbove = median(above.map((row) => row.qcKpa as number));
    const qcBelow = median(below.map((row) => row.qcKpa as number));
    const qcComponent = boundedLogChange(qcAbove, qcBelow);
    const frAboveValues = above.map((row) => row.frPercent).filter(isFinitePositive);
    const frBelowValues = below.map((row) => row.frPercent).filter(isFinitePositive);
    const localFrAvailable = frAvailable && frAboveValues.length === settings.windowRows && frBelowValues.length === settings.windowRows;
    const frAbove = localFrAvailable ? median(frAboveValues) : null;
    const frBelow = localFrAvailable ? median(frBelowValues) : null;
    const frComponent = frAbove !== null && frBelow !== null ? boundedLogChange(frAbove, frBelow) : null;
    const rawScore = frComponent === null ? qcComponent : 0.7 * qcComponent + 0.3 * frComponent;
    const depthM = roundDepth((above.at(-1)!.depthM + below[0].depthM) / 2);
    evaluated.push({ candidate: {
      candidateId: `candidate:${above.at(-1)!.sourceRowId}:${below[0].sourceRowId}`,
      depthM,
      score: roundScore(rawScore),
      qcComponent: roundScore(qcComponent),
      frComponent: frComponent === null ? null : roundScore(frComponent),
      qcMedianAboveKpa: roundMetric(qcAbove),
      qcMedianBelowKpa: roundMetric(qcBelow),
      frMedianAbovePercent: frAbove === null ? null : roundMetric(frAbove),
      frMedianBelowPercent: frBelow === null ? null : roundMetric(frBelow),
      sourceRowIds: [...above, ...below].map((row) => row.sourceRowId),
    }, rawScore });
  }
  const thresholdMatches = evaluated.filter((entry) => entry.rawScore >= settings.scoreThreshold).map((entry) => entry.candidate);
  const depthFromM = rows[0].depthM;
  const depthToM = rows.at(-1)!.depthM;
  const editableMatches = thresholdMatches.filter((candidate) =>
    candidate.depthM - depthFromM >= PROTOTYPE_STRATIFICATION_EDIT_SPACING_M
    && depthToM - candidate.depthM >= PROTOTYPE_STRATIFICATION_EDIT_SPACING_M);
  if (editableMatches.length !== thresholdMatches.length) {
    issues.push(issue(
      'StrRuleCandidateOutsideEditableRange',
      'notice',
      `有 ${thresholdMatches.length - editableMatches.length} 个阈值命中点距有效深度端点不足 ${PROTOTYPE_STRATIFICATION_EDIT_SPACING_M.toFixed(2)} m，未纳入候选。`,
      'manual-stratification',
      [],
    ));
  }
  const selected: StratificationRuleCandidateV1[] = [];
  for (const candidate of [...editableMatches].sort((left, right) => right.score - left.score || left.depthM - right.depthM)) {
    if (selected.length >= settings.maxBoundaries) break;
    if (selected.every((existing) => Math.abs(existing.depthM - candidate.depthM) >= settings.minSpacingM)) selected.push(candidate);
  }
  selected.sort((left, right) => left.depthM - right.depthM);
  if (!selected.length) {
    issues.push(issue('StrRuleNoCandidates', 'notice', '当前阈值下没有候选边界，可调整设置或继续手动分层。', 'rule-settings', []));
  }
  return result(selected, issues, rows.length, evaluated.length, thresholdMatches.length);
}

function result(
  candidates: StratificationRuleCandidateV1[],
  issues: StratificationRuleIssueV1[],
  inputRowCount: number,
  evaluatedSplitCount: number,
  thresholdMatchCount: number,
) {
  return {
    candidates,
    issues,
    summary: { inputRowCount, evaluatedSplitCount, thresholdMatchCount, selectedBoundaryCount: candidates.length },
  };
}

function ruleResultHash(run: Pick<StratificationRuleRunV1, 'candidates' | 'issues' | 'summary'>) {
  return sha256HexSync(stableStringify({ candidates: run.candidates, issues: run.issues, summary: run.summary }));
}

function validateRunTimestamps(run: StratificationRuleRunV1) {
  const terminalFields = [run.completedAt, run.cancelledAt, run.failedAt, run.invalidatedAt].filter(Boolean);
  if (run.startedAt && (!isValidIsoTime(run.startedAt) || Date.parse(run.startedAt) < Date.parse(run.createdAt))) return '规则运行开始时间早于创建时间或格式无效。';
  for (const value of terminalFields) {
    if (!isValidIsoTime(value!) || Date.parse(value!) < Date.parse(run.createdAt) || (run.startedAt && Date.parse(value!) < Date.parse(run.startedAt))) {
      return '规则运行终态时间早于创建/开始时间或格式无效。';
    }
  }
  if (run.status === 'queued' && (run.startedAt || terminalFields.length || run.errorCode || run.errorMessage || run.invalidationReason)) return '排队中的规则运行携带了不允许的执行或终态证据。';
  if (run.status === 'running' && (!run.startedAt || terminalFields.length || run.errorCode || run.errorMessage || run.invalidationReason)) return '运行中的规则任务缺少开始时间或携带终态证据。';
  if (run.status === 'cancel-requested' && (terminalFields.length || run.errorCode || run.errorMessage || run.invalidationReason)) return '正在取消的规则运行携带了终态证据。';
  if (run.status === 'completed' && (!run.startedAt || !run.completedAt || run.cancelledAt || run.failedAt || run.invalidatedAt || run.errorCode || run.errorMessage || run.invalidationReason)) return '已完成规则运行的终态证据互相矛盾。';
  if (run.status === 'cancelled' && (!run.cancelledAt || run.completedAt || run.failedAt || run.invalidatedAt || run.errorCode || run.errorMessage || run.invalidationReason)) return '已取消规则运行的终态证据互相矛盾。';
  if (run.status === 'failed' && (!run.failedAt || !run.errorCode?.trim() || !run.errorMessage?.trim() || run.completedAt || run.cancelledAt || run.invalidatedAt || run.invalidationReason)) return '失败规则运行缺少错误证据或终态证据互相矛盾。';
  if (run.status === 'invalidated' && (!run.invalidatedAt || !run.invalidationReason?.trim() || run.completedAt || run.cancelledAt || run.failedAt || run.errorCode || run.errorMessage)) return '失效规则运行缺少失效证据或终态证据互相矛盾。';
  return '';
}

function isValidIsoTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function transitionRuleRun(
  workspace: StratificationWorkspaceV2,
  runId: string,
  transition: (run: StratificationRuleRunV1) => { ok: true } | { ok: false; problem: string },
) {
  const next = ensureRuleWorkspace(workspace);
  const run = next.ruleRuns!.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '规则运行不存在。' };
  const outcome = transition(run);
  if (!outcome.ok) return outcome;
  const runValidation = validateStratificationRuleRunStructure(run);
  if (!runValidation.ok) return { ok: false as const, problem: runValidation.problem };
  next.activeRuleRunId = run.runId;
  return { ok: true as const, workspace: next, run: structuredClone(run) };
}

function ensureRuleWorkspace(workspace: StratificationWorkspaceV2) {
  const next = structuredClone(workspace);
  next.ruleRuns ??= [];
  next.activeRuleRunId ??= null;
  return next;
}

function issue(
  code: StratificationRuleIssueV1['code'],
  severity: StratificationRuleIssueV1['severity'],
  message: string,
  recovery: StratificationRuleIssueV1['recovery'],
  sourceRowIds: string[],
): StratificationRuleIssueV1 {
  return { code, severity, message, recovery, sourceRowIds };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function boundedLogChange(left: number, right: number) {
  return 1 - Math.exp(-Math.abs(Math.log(right / left)));
}

function finiteOrNull(value: number) {
  return Number.isFinite(value) ? value : null;
}

function finiteOrNaN(value: number) {
  return Number.isFinite(value) ? value : Number.NaN;
}

function isFinitePositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function roundDepth(value: number) {
  return Number(value.toFixed(3));
}

function roundScore(value: number) {
  return Number(value.toFixed(12));
}

function roundMetric(value: number) {
  return Number(value.toFixed(6));
}

function createIdentifier(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}
