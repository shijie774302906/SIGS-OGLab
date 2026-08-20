import jsep from 'jsep';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import type { StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import type {
  CustomFormulaDefinitionV1,
  CustomFormulaEditSessionV1,
  CustomFormulaInputRowV1,
  CustomFormulaRevisionV1,
  CustomFormulaRunSummaryV1,
  CustomFormulaRunV1,
  CustomFormulaSourceV1,
  CustomFormulaValueV1,
  ParameterDerivedInputRowV2,
  ParameterInputDerivationRunV2,
  ParameterIssueV2,
  ParameterLayerSummaryV1,
  ParameterSchemeRevisionV2,
  ParameterWorkspaceV2,
} from './parameterTypes';

export const CUSTOM_FORMULA_MAX_LENGTH = 512;
export const CUSTOM_FORMULA_MAX_NODES = 128;
export const CUSTOM_FORMULA_MAX_DEPTH = 24;
export const CUSTOM_FORMULA_MAX_ABS_VALUE = 1e15;

export const CUSTOM_FORMULA_VARIABLES = {
  depthM: { label: '深度', unit: 'm' },
  qc: { label: '原始锥阻', unit: 'kPa' },
  qt: { label: '修正锥阻', unit: 'kPa' },
  qnet: { label: '净锥阻', unit: 'kPa' },
  fs: { label: '侧摩阻', unit: 'kPa' },
  u2: { label: '孔压', unit: 'kPa' },
  Qtn: { label: '归一化锥阻', unit: '无量纲' },
  IcRW: { label: '软件筛选行为指数', unit: '无量纲' },
} as const;

export const CUSTOM_FORMULA_FUNCTIONS = {
  abs: { args: 1, example: 'abs(x)' },
  sqrt: { args: 1, example: 'sqrt(x)' },
  ln: { args: 1, example: 'ln(x)' },
  log10: { args: 1, example: 'log10(x)' },
  exp: { args: 1, example: 'exp(x)' },
  floor: { args: 1, example: 'floor(x)' },
  ceil: { args: 1, example: 'ceil(x)' },
  round: { args: 1, example: 'round(x)' },
  min: { args: 2, example: 'min(a, b)' },
  max: { args: 2, example: 'max(a, b)' },
  pow: { args: 2, example: 'pow(a, b)' },
  clamp: { args: 3, example: 'clamp(x, min, max)' },
} as const;

const ALLOWED_BINARY_OPERATORS = new Set(['+', '-', '*', '/', '%', '^']);
const ALLOWED_UNARY_OPERATORS = new Set(['+', '-']);
const CONSTANTS = { pi: Math.PI, e: Math.E } as const;

jsep.addBinaryOp('^', 11, true);

export type CustomFormulaDraftPatch = Partial<Pick<
  CustomFormulaDefinitionV1,
  'name' | 'symbol' | 'unit' | 'description' | 'expression' | 'targetLayerIds' | 'resultMinimum' | 'resultMaximum'
>>;

export type CustomFormulaExpressionValidation =
  | { ok: true; ast: jsep.Expression; astHash: string; variables: string[]; nodeCount: number; depth: number }
  | { ok: false; problem: string };

type EvaluationResult =
  | { kind: 'value'; value: number }
  | { kind: 'missing'; variable: string }
  | { kind: 'problem'; reasonCode: string; message: string };

export function ensureCustomFormulaWorkspace(workspace: ParameterWorkspaceV2): ParameterWorkspaceV2 {
  return {
    ...structuredClone(workspace),
    customFormulas: structuredClone(workspace.customFormulas ?? []),
    activeCustomFormulaId: workspace.activeCustomFormulaId ?? null,
    customFormulaEditSession: structuredClone(workspace.customFormulaEditSession ?? null),
    customFormulaRevisions: structuredClone(workspace.customFormulaRevisions ?? []),
    customFormulaRuns: structuredClone(workspace.customFormulaRuns ?? []),
  };
}

export function createCustomFormulaSource(
  parameterRevision: ParameterSchemeRevisionV2,
  derivationRun: ParameterInputDerivationRunV2,
): CustomFormulaSourceV1 {
  return {
    parameterSchemeId: parameterRevision.schemeId,
    parameterSchemeRevisionId: parameterRevision.revisionId,
    parameterDerivationRunId: derivationRun.runId,
    stratificationSchemeId: parameterRevision.snapshot.input.stratificationSchemeId,
    stratificationRevisionId: parameterRevision.snapshot.input.stratificationRevisionId,
    stratificationVersion: parameterRevision.snapshot.input.stratificationVersion,
    pointId: parameterRevision.snapshot.input.pointId,
    sourceLineageHash: derivationRun.sourceLineageHash,
  };
}

export function sameCustomFormulaSource(left: CustomFormulaSourceV1, right: CustomFormulaSourceV1) {
  return stableStringify(left) === stableStringify(right);
}

export function validateCustomFormulaExpression(expression: string): CustomFormulaExpressionValidation {
  const normalized = expression.trim();
  if (!normalized) return { ok: false, problem: '请输入公式表达式。' };
  if (normalized.length > CUSTOM_FORMULA_MAX_LENGTH) return { ok: false, problem: `公式长度不能超过 ${CUSTOM_FORMULA_MAX_LENGTH} 个字符。` };
  let ast: jsep.Expression;
  try {
    ast = jsep(normalized);
  } catch (error) {
    return { ok: false, problem: `公式语法错误：${error instanceof Error ? error.message : '无法解析表达式。'}` };
  }
  const state = { nodeCount: 0, depth: 0, variables: new Set<string>() };
  const problem = validateAstNode(ast, 1, state);
  if (problem) return { ok: false, problem };
  const astSnapshot = structuredClone(ast);
  return {
    ok: true,
    ast: astSnapshot,
    astHash: sha256HexSync(stableStringify(astSnapshot)),
    variables: [...state.variables].sort(),
    nodeCount: state.nodeCount,
    depth: state.depth,
  };
}

export function evaluateCustomFormulaExpression(
  ast: jsep.Expression,
  scope: Record<keyof typeof CUSTOM_FORMULA_VARIABLES, number | null>,
): EvaluationResult {
  const state = { nodeCount: 0, depth: 0, variables: new Set<string>() };
  const problem = validateAstNode(ast, 1, state);
  if (problem) return { kind: 'problem', reasonCode: 'CUSTOM_UNSUPPORTED_AST', message: problem };
  return evaluateNode(ast, scope);
}

export function createCustomFormula(input: {
  workspace: ParameterWorkspaceV2;
  source: CustomFormulaSourceV1;
  targetLayerIds: string[];
  name?: string;
  formulaId?: string;
  now?: string;
}) {
  const workspace = ensureCustomFormulaWorkspace(input.workspace);
  if (workspace.customFormulaEditSession?.dirty) return { ok: false as const, problem: '当前自定义公式有未提交修改，请先提交或放弃。' };
  const now = input.now ?? new Date().toISOString();
  const formulaId = input.formulaId ?? createIdentifier('custom-formula');
  const name = uniqueFormulaName(workspace, input.name ?? '自定义公式');
  const formula: CustomFormulaDefinitionV1 = {
    formulaId,
    name,
    symbol: '自定义值',
    unit: '用户声明',
    description: '',
    expression: 'Qtn',
    targetLayerIds: [...new Set(input.targetLayerIds)],
    resultMinimum: null,
    resultMaximum: null,
    status: 'working',
    version: 0,
    source: structuredClone(input.source),
    createdAt: now,
    updatedAt: now,
  };
  const next = ensureCustomFormulaWorkspace(workspace);
  next.customFormulas!.push(formula);
  next.activeCustomFormulaId = formulaId;
  next.customFormulaEditSession = createFormulaEditSession(formula, now, true, true);
  return { ok: true as const, workspace: next, formula: structuredClone(formula) };
}

export function updateCustomFormulaDraft(workspace: ParameterWorkspaceV2, patch: CustomFormulaDraftPatch, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const session = next.customFormulaEditSession;
  if (!session) return { ok: false as const, problem: '当前没有可编辑的自定义公式。' };
  if (session.staleReason) return { ok: false as const, problem: '公式编辑依据已经变化，请先放弃失效草稿。' };
  const working = session.working;
  if (patch.name !== undefined) working.name = normalizeDisplayName(patch.name);
  if (patch.symbol !== undefined) working.symbol = patch.symbol.trim();
  if (patch.unit !== undefined) working.unit = patch.unit.trim();
  if (patch.description !== undefined) working.description = patch.description.trim();
  if (patch.expression !== undefined) working.expression = patch.expression;
  if (patch.targetLayerIds !== undefined) working.targetLayerIds = [...new Set(patch.targetLayerIds)];
  if (patch.resultMinimum !== undefined) working.resultMinimum = patch.resultMinimum;
  if (patch.resultMaximum !== undefined) working.resultMaximum = patch.resultMaximum;
  working.updatedAt = now;
  session.dirty = session.isNew || stableStringify(formulaEditableContent(session.baseline)) !== stableStringify(formulaEditableContent(working));
  const stored = next.customFormulas!.find((formula) => formula.formulaId === working.formulaId);
  if (stored) Object.assign(stored, structuredClone(working));
  return { ok: true as const, workspace: next, formula: structuredClone(working), validation: validateCustomFormulaDraft(working) };
}

export function validateCustomFormulaDraft(formula: CustomFormulaDefinitionV1, allowedLayerIds?: string[]) {
  const problems: string[] = [];
  if (!formula.name.trim() || formula.name.length > 80) problems.push('公式名称应为 1 至 80 个字符。');
  if (!formula.symbol.trim() || formula.symbol.length > 24) problems.push('结果符号应为 1 至 24 个字符。');
  if (!formula.unit.trim() || formula.unit.length > 24) problems.push('请填写 1 至 24 个字符的用户声明单位。');
  if (formula.description.length > 240) problems.push('说明不能超过 240 个字符。');
  if (!formula.targetLayerIds.length) problems.push('请至少选择一个目标层。');
  if (allowedLayerIds && formula.targetLayerIds.some((layerId) => !allowedLayerIds.includes(layerId))) problems.push('目标层不属于当前精确分层修订。');
  if (formula.resultMinimum !== null && !Number.isFinite(formula.resultMinimum)) problems.push('结果下限必须是有限数值或留空。');
  if (formula.resultMaximum !== null && !Number.isFinite(formula.resultMaximum)) problems.push('结果上限必须是有限数值或留空。');
  if (formula.resultMinimum !== null && formula.resultMaximum !== null && formula.resultMinimum >= formula.resultMaximum) problems.push('结果下限必须小于结果上限。');
  const expression = validateCustomFormulaExpression(formula.expression);
  if (!expression.ok) problems.push(expression.problem);
  return { ok: problems.length === 0, problems, expression };
}

export function commitCustomFormula(
  workspace: ParameterWorkspaceV2,
  currentSource: CustomFormulaSourceV1,
  allowedLayerIds: string[],
  now = new Date().toISOString(),
) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const session = next.customFormulaEditSession;
  if (!session) return { ok: false as const, problem: '当前没有待提交的自定义公式。' };
  if (session.staleReason || !sameCustomFormulaSource(session.working.source, currentSource)) return { ok: false as const, problem: '公式草稿的精确来源已变化，请基于最新参数修订新建。' };
  const validation = validateCustomFormulaDraft(session.working, allowedLayerIds);
  if (!validation.ok || !validation.expression.ok) return { ok: false as const, problem: validation.problems[0] ?? '公式验证失败。', problems: validation.problems };
  if (hasFormulaName(next, session.working.name, session.working.formulaId)) return { ok: false as const, problem: '已存在同名自定义公式。' };
  const version = session.baseVersion + 1;
  const committed: CustomFormulaDefinitionV1 = { ...structuredClone(session.working), status: 'current', version, updatedAt: now };
  const revisionId = `${committed.formulaId}:revision:${version}`;
  if (next.customFormulaRevisions!.some((revision) => revision.revisionId === revisionId)) return { ok: false as const, problem: '公式修订版本冲突，请重新打开编辑。' };
  const contentHash = sha256HexSync(stableStringify(formulaRevisionContent(committed)));
  const revision: CustomFormulaRevisionV1 = {
    revisionId,
    formulaId: committed.formulaId,
    version,
    snapshot: structuredClone(committed),
    astSnapshot: structuredClone(validation.expression.ast),
    astHash: validation.expression.astHash,
    variables: [...validation.expression.variables],
    contentHash,
    committedAt: now,
  };
  next.customFormulas = next.customFormulas!.map((formula) => formula.formulaId === committed.formulaId ? committed : formula);
  next.customFormulaRevisions!.push(revision);
  next.customFormulaEditSession = null;
  next.activeCustomFormulaId = committed.formulaId;
  return { ok: true as const, workspace: next, formula: structuredClone(committed), revision: structuredClone(revision) };
}

export function beginCustomFormulaEdit(workspace: ParameterWorkspaceV2, formulaId: string, currentSource: CustomFormulaSourceV1, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  if (next.customFormulaEditSession?.dirty) return { ok: false as const, problem: '当前自定义公式有未提交修改，请先提交或放弃。' };
  const formula = next.customFormulas!.find((candidate) => candidate.formulaId === formulaId && candidate.status !== 'deleted');
  if (!formula) return { ok: false as const, problem: '自定义公式不存在。' };
  if (!sameCustomFormulaSource(formula.source, currentSource)) return { ok: false as const, problem: '该公式不对应当前参数来源，请基于最新来源复制。' };
  const working = { ...structuredClone(formula), status: 'working' as const, updatedAt: now };
  next.customFormulas = next.customFormulas!.map((candidate) => candidate.formulaId === formulaId ? working : candidate);
  next.customFormulaEditSession = createFormulaEditSession(formula, now, false, false);
  next.customFormulaEditSession.working = structuredClone(working);
  next.activeCustomFormulaId = formulaId;
  return { ok: true as const, workspace: next, formula: structuredClone(working) };
}

export function duplicateCustomFormula(
  workspace: ParameterWorkspaceV2,
  formulaId: string,
  currentSource: CustomFormulaSourceV1,
  now = new Date().toISOString(),
) {
  const source = (workspace.customFormulas ?? []).find((formula) => formula.formulaId === formulaId && formula.status !== 'deleted');
  if (!source) return { ok: false as const, problem: '待复制的自定义公式不存在。' };
  const created = createCustomFormula({ workspace, source: currentSource, targetLayerIds: source.targetLayerIds, name: uniqueFormulaName(ensureCustomFormulaWorkspace(workspace), `${source.name} 副本`), now });
  if (!created.ok) return created;
  return updateCustomFormulaDraft(created.workspace, {
    symbol: source.symbol,
    unit: source.unit,
    description: source.description,
    expression: source.expression,
    targetLayerIds: source.targetLayerIds,
    resultMinimum: source.resultMinimum,
    resultMaximum: source.resultMaximum,
  }, now);
}

export function discardCustomFormulaEdit(workspace: ParameterWorkspaceV2) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const session = next.customFormulaEditSession;
  if (!session) return { ok: true as const, workspace: next };
  if (session.isNew) next.customFormulas = next.customFormulas!.filter((formula) => formula.formulaId !== session.formulaId);
  else next.customFormulas = next.customFormulas!.map((formula) => formula.formulaId === session.formulaId ? structuredClone(session.baseline) : formula);
  next.customFormulaEditSession = null;
  next.activeCustomFormulaId = next.customFormulas!.find((formula) => formula.status !== 'deleted')?.formulaId ?? null;
  return { ok: true as const, workspace: next };
}

export function selectCustomFormula(workspace: ParameterWorkspaceV2, formulaId: string) {
  const next = ensureCustomFormulaWorkspace(workspace);
  if (!next.customFormulas!.some((formula) => formula.formulaId === formulaId && formula.status !== 'deleted')) return { ok: false as const, problem: '自定义公式不存在。' };
  if (next.customFormulaEditSession?.dirty && next.customFormulaEditSession.formulaId !== formulaId) return { ok: false as const, problem: '当前公式有未提交修改，请先提交或放弃。' };
  next.activeCustomFormulaId = formulaId;
  return { ok: true as const, workspace: next };
}

export function deleteCustomFormula(workspace: ParameterWorkspaceV2, formulaId: string, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const formula = next.customFormulas!.find((candidate) => candidate.formulaId === formulaId && candidate.status !== 'deleted');
  if (!formula) return { ok: false as const, problem: '自定义公式不存在。' };
  if (next.customFormulaEditSession?.formulaId === formulaId && next.customFormulaEditSession.dirty) return { ok: false as const, problem: '该公式有未提交修改，请先提交或放弃。' };
  next.customFormulas = next.customFormulas!.map((candidate) => candidate.formulaId === formulaId ? { ...candidate, status: 'deleted' as const, deletedAt: now, updatedAt: now } : candidate);
  if (next.activeCustomFormulaId === formulaId) next.activeCustomFormulaId = next.customFormulas.find((candidate) => candidate.status !== 'deleted')?.formulaId ?? null;
  if (next.customFormulaEditSession?.formulaId === formulaId) next.customFormulaEditSession = null;
  return { ok: true as const, workspace: next };
}

export function restoreCustomFormula(workspace: ParameterWorkspaceV2, formulaId: string, currentSource: CustomFormulaSourceV1, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const formula = next.customFormulas!.find((candidate) => candidate.formulaId === formulaId && candidate.status === 'deleted');
  if (!formula) return { ok: false as const, problem: '没有可恢复的自定义公式。' };
  if (hasFormulaName(next, formula.name, formulaId)) return { ok: false as const, problem: '已有同名公式，请先重命名当前公式。' };
  const restored = { ...formula, status: sameCustomFormulaSource(formula.source, currentSource) ? 'current' as const : 'stale' as const, updatedAt: now };
  delete restored.deletedAt;
  next.customFormulas = next.customFormulas!.map((candidate) => candidate.formulaId === formulaId ? restored : candidate);
  next.activeCustomFormulaId = formulaId;
  return { ok: true as const, workspace: next, formula: structuredClone(restored) };
}

export function prepareCustomFormulaRun(input: {
  workspace: ParameterWorkspaceV2;
  formulaRevisionId: string;
  parameterRevision: ParameterSchemeRevisionV2;
  derivationRun: ParameterInputDerivationRunV2;
  stratificationRevision: StratificationSchemeRevisionV2;
  commandId: string;
  runId?: string;
  now?: string;
}) {
  const workspace = ensureCustomFormulaWorkspace(input.workspace);
  const revision = workspace.customFormulaRevisions!.find((candidate) => candidate.revisionId === input.formulaRevisionId);
  if (!revision) return { ok: false as const, problem: '自定义公式修订不存在。' };
  const formula = workspace.customFormulas!.find((candidate) => candidate.formulaId === revision.formulaId);
  if (!formula || formula.status !== 'current' || formula.version !== revision.version) return { ok: false as const, problem: '只有当前有效公式修订可以创建运行。' };
  if (input.parameterRevision.revisionId !== revision.snapshot.source.parameterSchemeRevisionId || input.derivationRun.runId !== revision.snapshot.source.parameterDerivationRunId) return { ok: false as const, problem: '公式修订与参数方案或前置推导的精确来源不一致。' };
  if (input.derivationRun.status !== 'completed' || input.derivationRun.schemeRevisionId !== input.parameterRevision.revisionId) return { ok: false as const, problem: '公式运行需要同一参数修订的已完成前置推导。' };
  if (input.stratificationRevision.revisionId !== revision.snapshot.source.stratificationRevisionId) return { ok: false as const, problem: '公式修订与精确分层修订不一致。' };
  if (!input.commandId.trim()) return { ok: false as const, problem: '运行命令标识不能为空。' };
  const inputRows = buildCustomFormulaInputRows(input.derivationRun.derivedRows, input.stratificationRevision);
  const inputHash = sha256HexSync(stableStringify(inputRows));
  const idempotencyKey = sha256HexSync(stableStringify({ commandId: input.commandId, formulaRevisionId: revision.revisionId, parameterSchemeRevisionId: input.parameterRevision.revisionId, derivationRunId: input.derivationRun.runId, inputHash, astHash: revision.astHash }));
  const sameCommand = workspace.customFormulaRuns!.find((run) => run.commandId === input.commandId);
  if (sameCommand && sameCommand.idempotencyKey !== idempotencyKey) return { ok: false as const, problem: '同一公式运行命令不能绑定不同输入或修订。' };
  const existing = workspace.customFormulaRuns!.find((run) => run.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true as const, workspace, run: structuredClone(existing), reused: true as const };
  const now = input.now ?? new Date().toISOString();
  const runId = input.runId ?? createIdentifier('custom-formula-run');
  if (workspace.customFormulaRuns!.some((run) => run.runId === runId)) return { ok: false as const, problem: '公式运行标识已存在。' };
  const run: CustomFormulaRunV1 = {
    runId,
    commandId: input.commandId,
    idempotencyKey,
    formulaId: revision.formulaId,
    formulaRevisionId: revision.revisionId,
    formulaVersion: revision.version,
    parameterSchemeRevisionId: input.parameterRevision.revisionId,
    parameterDerivationRunId: input.derivationRun.runId,
    stratificationRevisionId: input.stratificationRevision.revisionId,
    pointId: revision.snapshot.source.pointId,
    sourceLineageHash: revision.snapshot.source.sourceLineageHash,
    nameSnapshot: revision.snapshot.name,
    symbolSnapshot: revision.snapshot.symbol,
    unitSnapshot: revision.snapshot.unit,
    expressionSnapshot: revision.snapshot.expression,
    astSnapshot: structuredClone(revision.astSnapshot),
    astHash: revision.astHash,
    variablesSnapshot: [...revision.variables],
    targetLayerIdsSnapshot: [...revision.snapshot.targetLayerIds],
    resultMinimumSnapshot: revision.snapshot.resultMinimum,
    resultMaximumSnapshot: revision.snapshot.resultMaximum,
    inputRowsSnapshot: inputRows,
    inputHash,
    resultHash: null,
    status: 'queued',
    values: [],
    layerSummaries: [],
    summary: null,
    issues: [],
    createdAt: now,
  };
  workspace.customFormulaRuns!.push(run);
  return { ok: true as const, workspace, run: structuredClone(run), reused: false as const };
}

export function startCustomFormulaRun(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionCustomFormulaRun(workspace, runId, ['queued'], (run) => { run.status = 'running'; run.startedAt = now; });
}

export function requestCustomFormulaRunCancellation(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionCustomFormulaRun(workspace, runId, ['queued', 'running'], (run) => { run.status = 'cancel-requested'; run.cancelRequestedAt = now; });
}

export function finalizeCustomFormulaRunCancellation(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  return transitionCustomFormulaRun(workspace, runId, ['cancel-requested'], (run) => {
    run.status = 'cancelled';
    run.cancelledAt = now;
    run.values = [];
    run.layerSummaries = [];
    run.summary = null;
    run.issues = [];
    run.resultHash = null;
  });
}

export function completeCustomFormulaRun(workspace: ParameterWorkspaceV2, runId: string, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const run = next.customFormulaRuns!.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '自定义公式运行不存在。' };
  if (run.status !== 'running') return { ok: false as const, problem: `当前运行状态 ${run.status} 不能完成。` };
  const evaluated = evaluateCustomFormulaRun(run);
  run.status = 'completed';
  run.completedAt = now;
  run.values = evaluated.values;
  run.layerSummaries = evaluated.layerSummaries;
  run.summary = evaluated.summary;
  run.issues = evaluated.issues;
  run.resultHash = customFormulaResultHash(run);
  return { ok: true as const, workspace: next, run: structuredClone(run) };
}

export function selectActiveCustomFormula(workspace: ParameterWorkspaceV2) {
  const formulas = workspace.customFormulas ?? [];
  return formulas.find((formula) => formula.formulaId === workspace.activeCustomFormulaId && formula.status !== 'deleted') ?? formulas.find((formula) => formula.status !== 'deleted') ?? null;
}

export function selectCustomFormulaRevision(workspace: ParameterWorkspaceV2, formula: CustomFormulaDefinitionV1 | null | undefined) {
  if (!formula) return null;
  return (workspace.customFormulaRevisions ?? []).find((revision) => revision.formulaId === formula.formulaId && revision.version === formula.version) ?? null;
}

export function selectCustomFormulaRuns(workspace: ParameterWorkspaceV2, formulaId: string | null | undefined) {
  if (!formulaId) return [];
  return [...(workspace.customFormulaRuns ?? [])].filter((run) => run.formulaId === formulaId).reverse();
}

export function markCustomFormulasStale(workspace: ParameterWorkspaceV2, reason: string, now = new Date().toISOString()) {
  const next = ensureCustomFormulaWorkspace(workspace);
  next.customFormulas = next.customFormulas!.map((formula) => ['working', 'deleted'].includes(formula.status) ? formula : { ...formula, status: 'stale' as const, updatedAt: now });
  if (next.customFormulaEditSession) next.customFormulaEditSession.staleReason = reason;
  next.customFormulaRuns!.forEach((run) => {
    if (['queued', 'running', 'cancel-requested'].includes(run.status)) {
      run.status = 'invalidated';
      run.invalidatedAt = now;
      run.invalidationReason = reason;
      run.values = [];
      run.layerSummaries = [];
      run.summary = null;
      run.issues = [];
      run.resultHash = null;
    }
  });
  return next;
}

export function validateCustomFormulaWorkspaceStructure(
  workspace: ParameterWorkspaceV2,
  stratificationRevisions: StratificationSchemeRevisionV2[] = [],
) {
  const custom = ensureCustomFormulaWorkspace(workspace);
  const formulas = custom.customFormulas!;
  const revisions = custom.customFormulaRevisions!;
  const runs = custom.customFormulaRuns!;
  const allowedFormulaStatuses = new Set(['working', 'current', 'stale', 'deleted']);
  const allowedRunStatuses = new Set(['queued', 'running', 'cancel-requested', 'completed', 'failed', 'cancelled', 'invalidated']);
  if (new Set(formulas.map((formula) => formula.formulaId)).size !== formulas.length) return invalid('Custom formula workspace contains duplicate formula IDs.');
  if (formulas.some((formula) => !allowedFormulaStatuses.has(formula.status))) return invalid('Custom formula workspace contains an unsupported formula status.');
  if (custom.activeCustomFormulaId && !formulas.some((formula) => formula.formulaId === custom.activeCustomFormulaId && formula.status !== 'deleted')) return invalid('Active custom formula is missing or deleted.');
  if (new Set(formulas.filter((formula) => formula.status !== 'deleted').map((formula) => normalizeDisplayName(formula.name).toLocaleLowerCase())).size !== formulas.filter((formula) => formula.status !== 'deleted').length) return invalid('Custom formula workspace contains duplicate active names.');
  if (custom.customFormulaEditSession) {
    const session = custom.customFormulaEditSession;
    const stored = formulas.find((formula) => formula.formulaId === session.formulaId);
    if (!stored || session.working.formulaId !== session.formulaId || session.baseline.formulaId !== session.formulaId || stored.status !== 'working' || session.working.status !== 'working' || stableStringify(stored) !== stableStringify(session.working)) return invalid('Custom formula edit session is inconsistent.');
    const expectedDirty = session.isNew || stableStringify(formulaEditableContent(session.baseline)) !== stableStringify(formulaEditableContent(session.working));
    if (session.baseVersion !== session.baseline.version || session.working.version !== session.baseVersion || session.dirty !== expectedDirty) return invalid('Custom formula edit session version or dirty state is invalid.');
    if (session.isNew !== (session.baseVersion === 0)) return invalid('Custom formula edit session new-object state is invalid.');
    if (!session.isNew) {
      const baseRevision = revisions.find((revision) => revision.formulaId === session.formulaId && revision.version === session.baseVersion);
      if (!baseRevision || stableStringify(formulaRevisionContent(session.baseline)) !== stableStringify(formulaRevisionContent(baseRevision.snapshot))) return invalid('Custom formula edit baseline does not match its immutable revision.');
    }
  }
  if (new Set(revisions.map((revision) => revision.revisionId)).size !== revisions.length) return invalid('Custom formula workspace contains duplicate revision IDs.');
  for (const revision of revisions) {
    if (revision.revisionId !== `${revision.formulaId}:revision:${revision.version}` || revision.snapshot.formulaId !== revision.formulaId || revision.snapshot.version !== revision.version || revision.snapshot.status !== 'current') return invalid(`Custom formula revision ${revision.revisionId} has invalid identity.`);
    const expression = validateCustomFormulaExpression(revision.snapshot.expression);
    if (!expression.ok || expression.astHash !== revision.astHash || stableStringify(expression.ast) !== stableStringify(revision.astSnapshot) || stableStringify(expression.variables) !== stableStringify(revision.variables)) return invalid(`Custom formula revision ${revision.revisionId} has invalid expression authority.`);
    if (revision.contentHash !== sha256HexSync(stableStringify(formulaRevisionContent(revision.snapshot)))) return invalid(`Custom formula revision ${revision.revisionId} content hash is invalid.`);
    const parameterRevision = workspace.revisions.find((candidate) => candidate.revisionId === revision.snapshot.source.parameterSchemeRevisionId);
    const derivation = workspace.derivationRuns.find((candidate) => candidate.runId === revision.snapshot.source.parameterDerivationRunId);
    const expectedSource = parameterRevision && derivation ? createCustomFormulaSource(parameterRevision, derivation) : null;
    if (!parameterRevision || !derivation || derivation.schemeRevisionId !== parameterRevision.revisionId || derivation.status !== 'completed' || !expectedSource || !sameCustomFormulaSource(revision.snapshot.source, expectedSource)) return invalid(`Custom formula revision ${revision.revisionId} has invalid exact source lineage.`);
  }
  for (const formula of formulas) {
    if (formula.status === 'working') {
      if (custom.customFormulaEditSession?.formulaId !== formula.formulaId) return invalid(`Working custom formula ${formula.formulaId} has no edit session.`);
      continue;
    }
    const revision = revisions.find((candidate) => candidate.formulaId === formula.formulaId && candidate.version === formula.version);
    if (!revision || stableStringify(formulaRevisionContent(formula)) !== stableStringify(formulaRevisionContent(revision.snapshot))) return invalid(`Custom formula ${formula.formulaId} does not match its immutable revision.`);
  }
  if (new Set(runs.map((run) => run.runId)).size !== runs.length) return invalid('Custom formula workspace contains duplicate run IDs.');
  if (new Set(runs.map((run) => run.commandId)).size !== runs.length || new Set(runs.map((run) => run.idempotencyKey)).size !== runs.length) return invalid('Custom formula workspace contains duplicate run commands or idempotency keys.');
  for (const run of runs) {
    const revision = revisions.find((candidate) => candidate.revisionId === run.formulaRevisionId);
    const parameterRevision = workspace.revisions.find((candidate) => candidate.revisionId === run.parameterSchemeRevisionId);
    const derivation = workspace.derivationRuns.find((candidate) => candidate.runId === run.parameterDerivationRunId);
    const stratificationRevision = stratificationRevisions.find((candidate) => candidate.revisionId === run.stratificationRevisionId);
    if (!revision || !parameterRevision || !derivation || !stratificationRevision || !allowedRunStatuses.has(run.status) || !run.commandId.trim() || run.formulaId !== revision.formulaId || run.formulaVersion !== revision.version || run.astHash !== revision.astHash || stableStringify(run.astSnapshot) !== stableStringify(revision.astSnapshot) || run.parameterSchemeRevisionId !== revision.snapshot.source.parameterSchemeRevisionId || run.parameterDerivationRunId !== revision.snapshot.source.parameterDerivationRunId || run.stratificationRevisionId !== revision.snapshot.source.stratificationRevisionId || run.pointId !== revision.snapshot.source.pointId || run.sourceLineageHash !== revision.snapshot.source.sourceLineageHash) return invalid(`Custom formula run ${run.runId} has invalid authority references.`);
    const expectedMetadata = {
      nameSnapshot: revision.snapshot.name,
      symbolSnapshot: revision.snapshot.symbol,
      unitSnapshot: revision.snapshot.unit,
      expressionSnapshot: revision.snapshot.expression,
      variablesSnapshot: revision.variables,
      targetLayerIdsSnapshot: revision.snapshot.targetLayerIds,
      resultMinimumSnapshot: revision.snapshot.resultMinimum,
      resultMaximumSnapshot: revision.snapshot.resultMaximum,
    };
    const actualMetadata = {
      nameSnapshot: run.nameSnapshot,
      symbolSnapshot: run.symbolSnapshot,
      unitSnapshot: run.unitSnapshot,
      expressionSnapshot: run.expressionSnapshot,
      variablesSnapshot: run.variablesSnapshot,
      targetLayerIdsSnapshot: run.targetLayerIdsSnapshot,
      resultMinimumSnapshot: run.resultMinimumSnapshot,
      resultMaximumSnapshot: run.resultMaximumSnapshot,
    };
    if (stableStringify(actualMetadata) !== stableStringify(expectedMetadata)) return invalid(`Custom formula run ${run.runId} has invalid formula metadata.`);
    const expectedRows = buildCustomFormulaInputRows(derivation.derivedRows, stratificationRevision);
    if (run.inputHash !== sha256HexSync(stableStringify(expectedRows)) || stableStringify(run.inputRowsSnapshot) !== stableStringify(expectedRows)) return invalid(`Custom formula run ${run.runId} has invalid input snapshot.`);
    const expectedIdempotencyKey = sha256HexSync(stableStringify({ commandId: run.commandId, formulaRevisionId: run.formulaRevisionId, parameterSchemeRevisionId: run.parameterSchemeRevisionId, derivationRunId: run.parameterDerivationRunId, inputHash: run.inputHash, astHash: run.astHash }));
    if (run.idempotencyKey !== expectedIdempotencyKey) return invalid(`Custom formula run ${run.runId} has invalid idempotency authority.`);
    if (!validCustomRunLifecycle(run)) return invalid(`Custom formula run ${run.runId} has invalid lifecycle evidence.`);
    if (['queued', 'running', 'cancel-requested', 'failed', 'cancelled', 'invalidated'].includes(run.status) && (run.values.length || run.layerSummaries.length || run.summary || run.resultHash)) return invalid(`Custom formula run ${run.runId} retains partial or unauthorized results.`);
    if (run.status === 'completed') {
      const evaluated = evaluateCustomFormulaRun(run);
      if (stableStringify(run.values) !== stableStringify(evaluated.values) || stableStringify(run.layerSummaries) !== stableStringify(evaluated.layerSummaries) || stableStringify(run.summary) !== stableStringify(evaluated.summary) || stableStringify(run.issues) !== stableStringify(evaluated.issues) || run.resultHash !== customFormulaResultHash(run)) return invalid(`Custom formula run ${run.runId} result snapshot is invalid.`);
    }
  }
  return { ok: true as const };
}

function validateAstNode(node: jsep.Expression, depth: number, state: { nodeCount: number; depth: number; variables: Set<string> }): string | null {
  state.nodeCount += 1;
  state.depth = Math.max(state.depth, depth);
  if (state.nodeCount > CUSTOM_FORMULA_MAX_NODES) return `公式节点不能超过 ${CUSTOM_FORMULA_MAX_NODES} 个。`;
  if (depth > CUSTOM_FORMULA_MAX_DEPTH) return `公式嵌套不能超过 ${CUSTOM_FORMULA_MAX_DEPTH} 层。`;
  if (node.type === 'Literal') {
    const value = (node as jsep.Literal).value;
    return typeof value === 'number' && Number.isFinite(value) ? null : '公式只允许有限数值字面量。';
  }
  if (node.type === 'Identifier') {
    const name = (node as jsep.Identifier).name;
    if (Object.hasOwn(CUSTOM_FORMULA_VARIABLES, name)) { state.variables.add(name); return null; }
    if (Object.hasOwn(CONSTANTS, name)) return null;
    return `不允许的变量或常量：${name}。`;
  }
  if (node.type === 'UnaryExpression') {
    const unary = node as jsep.UnaryExpression;
    if (!ALLOWED_UNARY_OPERATORS.has(unary.operator)) return `不允许的一元运算符：${unary.operator}。`;
    return validateAstNode(unary.argument, depth + 1, state);
  }
  if (node.type === 'BinaryExpression') {
    const binary = node as jsep.BinaryExpression;
    if (!ALLOWED_BINARY_OPERATORS.has(binary.operator)) return `不允许的二元运算符：${binary.operator}。`;
    return validateAstNode(binary.left, depth + 1, state) ?? validateAstNode(binary.right, depth + 1, state);
  }
  if (node.type === 'CallExpression') {
    const call = node as jsep.CallExpression;
    if (call.callee.type !== 'Identifier') return '函数必须直接使用白名单函数名，不能调用属性或动态表达式。';
    const name = (call.callee as jsep.Identifier).name;
    const spec = CUSTOM_FORMULA_FUNCTIONS[name as keyof typeof CUSTOM_FORMULA_FUNCTIONS];
    if (!spec) return `不允许的函数：${name}。`;
    if (call.arguments.length !== spec.args) return `${name} 需要 ${spec.args} 个参数。`;
    for (const argument of call.arguments) {
      const problem = validateAstNode(argument, depth + 1, state);
      if (problem) return problem;
    }
    return null;
  }
  return `不允许的表达式结构：${node.type}。`;
}

function evaluateNode(node: jsep.Expression, scope: Record<keyof typeof CUSTOM_FORMULA_VARIABLES, number | null>): EvaluationResult {
  if (node.type === 'Literal') return checkedNumber((node as jsep.Literal).value as number, '数值字面量无效。');
  if (node.type === 'Identifier') {
    const name = (node as jsep.Identifier).name;
    if (Object.hasOwn(CONSTANTS, name)) return { kind: 'value', value: CONSTANTS[name as keyof typeof CONSTANTS] };
    const value = scope[name as keyof typeof CUSTOM_FORMULA_VARIABLES];
    return value === null || value === undefined ? { kind: 'missing', variable: name } : checkedNumber(value, `${name} 不是有限数值。`);
  }
  if (node.type === 'UnaryExpression') {
    const unary = node as jsep.UnaryExpression;
    const value = evaluateNode(unary.argument, scope);
    if (value.kind !== 'value') return value;
    return checkedNumber(unary.operator === '-' ? -value.value : value.value, '一元运算结果无效。');
  }
  if (node.type === 'BinaryExpression') {
    const binary = node as jsep.BinaryExpression;
    const left = evaluateNode(binary.left, scope);
    if (left.kind !== 'value') return left;
    const right = evaluateNode(binary.right, scope);
    if (right.kind !== 'value') return right;
    if ((binary.operator === '/' || binary.operator === '%') && right.value === 0) return { kind: 'problem', reasonCode: 'CUSTOM_DIVIDE_BY_ZERO', message: '公式发生除零。' };
    const value = ({
      '+': () => left.value + right.value,
      '-': () => left.value - right.value,
      '*': () => left.value * right.value,
      '/': () => left.value / right.value,
      '%': () => left.value % right.value,
      '^': () => Math.pow(left.value, right.value),
    } as Record<string, () => number>)[binary.operator]?.();
    return checkedNumber(value, `运算 ${binary.operator} 产生无效结果。`);
  }
  if (node.type === 'CallExpression') {
    const call = node as jsep.CallExpression;
    const name = (call.callee as jsep.Identifier).name;
    const values: number[] = [];
    for (const argument of call.arguments) {
      const evaluated = evaluateNode(argument, scope);
      if (evaluated.kind !== 'value') return evaluated;
      values.push(evaluated.value);
    }
    if (name === 'sqrt' && values[0] < 0) return { kind: 'problem', reasonCode: 'CUSTOM_FUNCTION_DOMAIN', message: 'sqrt 的输入不能为负数。' };
    if ((name === 'ln' || name === 'log10') && values[0] <= 0) return { kind: 'problem', reasonCode: 'CUSTOM_FUNCTION_DOMAIN', message: `${name} 的输入必须大于零。` };
    if (name === 'clamp' && values[1] > values[2]) return { kind: 'problem', reasonCode: 'CUSTOM_FUNCTION_DOMAIN', message: 'clamp 的下限不能大于上限。' };
    const result = ({
      abs: () => Math.abs(values[0]), sqrt: () => Math.sqrt(values[0]), ln: () => Math.log(values[0]), log10: () => Math.log10(values[0]), exp: () => Math.exp(values[0]), floor: () => Math.floor(values[0]), ceil: () => Math.ceil(values[0]), round: () => Math.round(values[0]), min: () => Math.min(values[0], values[1]), max: () => Math.max(values[0], values[1]), pow: () => Math.pow(values[0], values[1]), clamp: () => Math.min(Math.max(values[0], values[1]), values[2]),
    } as Record<string, () => number>)[name]?.();
    return checkedNumber(result, `${name} 产生无效结果。`);
  }
  return { kind: 'problem', reasonCode: 'CUSTOM_UNSUPPORTED_AST', message: `运行时拒绝表达式结构 ${node.type}。` };
}

function checkedNumber(value: unknown, message: string): EvaluationResult {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= CUSTOM_FORMULA_MAX_ABS_VALUE
    ? { kind: 'value', value }
    : { kind: 'problem', reasonCode: 'CUSTOM_NON_FINITE', message };
}

function buildCustomFormulaInputRows(rows: ParameterDerivedInputRowV2[], stratificationRevision: StratificationSchemeRevisionV2): CustomFormulaInputRowV1[] {
  return rows.map((row) => ({
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    layerId: layerAtDepth(stratificationRevision, row.depthM)?.layerId ?? null,
    qc: row.qcKpa,
    qt: row.qtKpa,
    qnet: row.qnetKpa,
    fs: row.fsKpa,
    u2: row.u2Kpa,
    Qtn: row.qtn,
    IcRW: row.ic,
  }));
}

function evaluateCustomFormulaRun(run: CustomFormulaRunV1) {
  const ast = run.astSnapshot as jsep.Expression;
  const values: CustomFormulaValueV1[] = run.inputRowsSnapshot.map((row) => {
    if (!row.layerId || !run.targetLayerIdsSnapshot.includes(row.layerId)) return formulaValue(row, null, 'not_target', false, null);
    const evaluated = evaluateNode(ast, rowScope(row));
    if (evaluated.kind === 'missing') return formulaValue(row, null, 'missing_input', false, `缺少变量 ${evaluated.variable}`);
    if (evaluated.kind === 'problem') return formulaValue(row, null, 'numeric_problem', false, evaluated.reasonCode);
    if ((run.resultMinimumSnapshot !== null && evaluated.value < run.resultMinimumSnapshot) || (run.resultMaximumSnapshot !== null && evaluated.value > run.resultMaximumSnapshot)) return formulaValue(row, evaluated.value, 'out_of_range', false, 'CUSTOM_OUT_OF_RANGE');
    return formulaValue(row, evaluated.value, 'valid', true, null);
  });
  const issues: ParameterIssueV2[] = values.filter((value) => ['numeric_problem', 'out_of_range'].includes(value.status)).map((value) => ({ issueId: `${run.runId}:${value.sourceRowId}:${value.reasonCode}`, severity: 'problem', reasonCode: value.reasonCode ?? 'CUSTOM_NUMERIC_PROBLEM', message: value.status === 'out_of_range' ? '公式结果超出用户声明范围。' : customReasonMessage(value.reasonCode), sourceRowId: value.sourceRowId }));
  const summary: CustomFormulaRunSummaryV1 = {
    rowCount: values.length,
    validCount: values.filter((value) => value.status === 'valid').length,
    missingInputCount: values.filter((value) => value.status === 'missing_input').length,
    nonTargetCount: values.filter((value) => value.status === 'not_target').length,
    numericProblemCount: values.filter((value) => value.status === 'numeric_problem').length,
    outOfRangeCount: values.filter((value) => value.status === 'out_of_range').length,
  };
  const layerSummaries = summarizeCustomFormulaLayers(run.inputRowsSnapshot, values, run.targetLayerIdsSnapshot);
  return { values, issues, summary, layerSummaries };
}

function summarizeCustomFormulaLayers(rows: CustomFormulaInputRowV1[], values: CustomFormulaValueV1[], targetLayerIds: string[]): ParameterLayerSummaryV1[] {
  const valuesByRow = new Map(values.map((value) => [value.sourceRowId, value]));
  const layerIds = [...new Set(rows.map((row) => row.layerId).filter((layerId): layerId is string => Boolean(layerId)))];
  return layerIds.map((layerId) => {
    const layerRows = rows.filter((row) => row.layerId === layerId);
    const layerValues = layerRows.map((row) => valuesByRow.get(row.sourceRowId)).filter((value): value is CustomFormulaValueV1 => Boolean(value));
    const numeric = layerValues.filter((value) => value.value !== null).map((value) => value.value as number);
    const eligible = layerValues.filter((value) => value.eligibleForCurrentResult).map((value) => value.value as number);
    return {
      layerId,
      layerRevisionRef: `${layerId}:custom-formula`,
      rowCount: layerRows.length,
      numericValueCount: numeric.length,
      eligibleValueCount: eligible.length,
      trialOnlyValueCount: 0,
      noticeValueCount: layerValues.filter((value) => value.status === 'missing_input').length,
      problemValueCount: layerValues.filter((value) => ['numeric_problem', 'out_of_range'].includes(value.status)).length,
      eligibleMinimum: eligible.length ? Math.min(...eligible) : null,
      eligibleMaximum: eligible.length ? Math.max(...eligible) : null,
      eligibleMean: eligible.length ? eligible.reduce((sum, value) => sum + value, 0) / eligible.length : null,
    };
  }).filter((summary) => targetLayerIds.includes(summary.layerId) || summary.rowCount > 0);
}

function rowScope(row: CustomFormulaInputRowV1): Record<keyof typeof CUSTOM_FORMULA_VARIABLES, number | null> {
  return { depthM: row.depthM, qc: row.qc, qt: row.qt, qnet: row.qnet, fs: row.fs, u2: row.u2, Qtn: row.Qtn, IcRW: row.IcRW };
}

function formulaValue(row: CustomFormulaInputRowV1, value: number | null, status: CustomFormulaValueV1['status'], eligibleForCurrentResult: boolean, reasonCode: string | null): CustomFormulaValueV1 {
  return { sourceRowId: row.sourceRowId, depthM: row.depthM, layerId: row.layerId, value, status, eligibleForCurrentResult, reasonCode };
}

function customFormulaResultHash(run: CustomFormulaRunV1) {
  return sha256HexSync(stableStringify({ values: run.values, layerSummaries: run.layerSummaries, summary: run.summary, issues: run.issues }));
}

function transitionCustomFormulaRun(workspace: ParameterWorkspaceV2, runId: string, statuses: CustomFormulaRunV1['status'][], update: (run: CustomFormulaRunV1) => void) {
  const next = ensureCustomFormulaWorkspace(workspace);
  const run = next.customFormulaRuns!.find((candidate) => candidate.runId === runId);
  if (!run) return { ok: false as const, problem: '自定义公式运行不存在。' };
  if (!statuses.includes(run.status)) return { ok: false as const, problem: `当前运行状态 ${run.status} 不允许此操作。` };
  update(run);
  return { ok: true as const, workspace: next, run: structuredClone(run) };
}

function validCustomRunLifecycle(run: CustomFormulaRunV1) {
  const time = (value?: string) => value ? Date.parse(value) : null;
  const created = time(run.createdAt);
  const started = time(run.startedAt);
  const cancelRequested = time(run.cancelRequestedAt);
  const completed = time(run.completedAt);
  const failed = time(run.failedAt);
  const cancelled = time(run.cancelledAt);
  const invalidated = time(run.invalidatedAt);
  if (created === null || !Number.isFinite(created)) return false;
  const orderedAfterCreated = [started, cancelRequested, completed, failed, cancelled, invalidated].every((value) => value === null || (Number.isFinite(value) && value >= created));
  if (!orderedAfterCreated || (started !== null && [completed, failed, cancelled, invalidated].some((value) => value !== null && value < started)) || (cancelRequested !== null && cancelled !== null && cancelled < cancelRequested)) return false;
  const hasError = Boolean(run.errorCode || run.errorMessage);
  const hasInvalidation = Boolean(run.invalidationReason);
  if (run.status === 'queued') return started === null && completed === null && failed === null && cancelRequested === null && cancelled === null && invalidated === null && !hasError && !hasInvalidation;
  if (run.status === 'running') return started !== null && completed === null && failed === null && cancelRequested === null && cancelled === null && invalidated === null && !hasError && !hasInvalidation;
  if (run.status === 'cancel-requested') return cancelRequested !== null && completed === null && failed === null && cancelled === null && invalidated === null && !hasError && !hasInvalidation;
  if (run.status === 'completed') return started !== null && completed !== null && failed === null && cancelRequested === null && cancelled === null && invalidated === null && !hasError && !hasInvalidation;
  if (run.status === 'failed') return started !== null && failed !== null && Boolean(run.errorCode && run.errorMessage) && completed === null && cancelRequested === null && cancelled === null && invalidated === null && !hasInvalidation;
  if (run.status === 'cancelled') return cancelRequested !== null && cancelled !== null && completed === null && failed === null && invalidated === null && !hasError && !hasInvalidation;
  if (run.status === 'invalidated') return invalidated !== null && Boolean(run.invalidationReason) && completed === null && failed === null && cancelRequested === null && cancelled === null && !hasError;
  return false;
}

function layerAtDepth(revision: StratificationSchemeRevisionV2, depthM: number) {
  return revision.snapshot.layers.find((layer, index, layers) => depthM >= layer.depthFromM && (depthM < layer.depthToM || (index === layers.length - 1 && depthM <= layer.depthToM)));
}

function createFormulaEditSession(formula: CustomFormulaDefinitionV1, now: string, isNew: boolean, dirty: boolean): CustomFormulaEditSessionV1 {
  return { sessionId: createIdentifier('custom-formula-edit'), formulaId: formula.formulaId, baseVersion: formula.version, baseline: structuredClone(formula), working: structuredClone(formula), dirty, isNew, startedAt: now };
}

function formulaRevisionContent(formula: CustomFormulaDefinitionV1) {
  const { status: _status, updatedAt: _updatedAt, deletedAt: _deletedAt, ...content } = formula;
  return content;
}

function formulaEditableContent(formula: CustomFormulaDefinitionV1) {
  return {
    name: formula.name,
    symbol: formula.symbol,
    unit: formula.unit,
    description: formula.description,
    expression: formula.expression,
    targetLayerIds: formula.targetLayerIds,
    resultMinimum: formula.resultMinimum,
    resultMaximum: formula.resultMaximum,
  };
}

function hasFormulaName(workspace: ParameterWorkspaceV2, name: string, exceptFormulaId?: string) {
  const normalized = normalizeDisplayName(name).toLocaleLowerCase();
  return (workspace.customFormulas ?? []).some((formula) => formula.status !== 'deleted' && formula.formulaId !== exceptFormulaId && normalizeDisplayName(formula.name).toLocaleLowerCase() === normalized);
}

function uniqueFormulaName(workspace: ParameterWorkspaceV2, preferred: string) {
  if (!hasFormulaName(workspace, preferred)) return preferred;
  let index = 2;
  while (hasFormulaName(workspace, `${preferred} ${index}`)) index += 1;
  return `${preferred} ${index}`;
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function customReasonMessage(reasonCode: string | null) {
  return ({ CUSTOM_DIVIDE_BY_ZERO: '公式发生除零。', CUSTOM_FUNCTION_DOMAIN: '函数输入超出定义域。', CUSTOM_NON_FINITE: '公式产生非有限或过大的结果。', CUSTOM_OUT_OF_RANGE: '公式结果超出用户声明范围。' } as Record<string, string>)[reasonCode ?? ''] ?? '公式产生数值问题。';
}

function invalid(detail: string) {
  return { ok: false as const, detail };
}

function createIdentifier(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}
