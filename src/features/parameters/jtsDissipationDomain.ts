import { evaluateDissipationParameters, evaluateNormalizedDissipation, type JtsMethodContext } from '../jts/jtsT242Domain';
import { sha256HexSync, stableStringify } from '../workspace/stableHash';
import type {
  JtsDissipationResultRevisionV6,
  JtsDissipationT50RevisionV6,
  JtsDissipationTestRevisionV6,
  JtsParameterMethodIdV5,
  JtsParameterPackageRunV5,
  ParameterWorkspaceV2,
} from './parameterTypes';

export const JTS_DISSIPATION_FORMULA_REVISION = 'jts-t242-2020-si-v2' as const;

export type DissipationSeriesInputV6 = {
  fileName: string;
  depthM: number;
  layerId: string;
  u0Kpa: number;
  rows: Array<{ sourceRowNumber: number; timeSeconds: number; u2Kpa: number }>;
};

export function appendJtsDissipationTest(
  workspace: ParameterWorkspaceV2,
  pointId: string,
  input: DissipationSeriesInputV6,
  now = new Date().toISOString(),
  testId = createId('jts-dissipation-test'),
  revisionId = createId('jts-dissipation-test-revision'),
) {
  const problem = testInputProblem(input);
  const snapshot = {
    fileName: input.fileName.trim(),
    depthM: input.depthM,
    layerId: input.layerId,
    u0Kpa: input.u0Kpa,
    rows: input.rows.map((row) => ({ ...row })),
  };
  const test: JtsDissipationTestRevisionV6 = {
    testId,
    revisionId,
    pointId,
    ...snapshot,
    status: problem ? 'problem' : 'ready',
    problem,
    inputHash: sha256HexSync(stableStringify({ pointId, ...snapshot })),
    createdAt: now,
  };
  const tests = workspace.jtsDissipationTests ?? [];
  if (tests.some((candidate) => candidate.revisionId === revisionId)) return { ok: false as const, problem: '消散试验修订标识已经存在。' };
  return {
    ok: true as const,
    test,
    workspace: {
      ...workspace,
      jtsDissipationTests: [...tests, test],
      activeJtsDissipationTestRevisionId: test.revisionId,
      activeJtsDissipationT50RevisionId: null,
      activeJtsDissipationResultRevisionId: null,
    },
  };
}

export function confirmJtsDissipationT50(
  workspace: ParameterWorkspaceV2,
  testRevisionId: string,
  mode: 'auto-intersection' | 'manual-alternative',
  manualT50Seconds: number | null,
  now = new Date().toISOString(),
  revisionId = createId('jts-dissipation-t50'),
) {
  const test = (workspace.jtsDissipationTests ?? []).find((candidate) => candidate.revisionId === testRevisionId);
  if (!test || test.status !== 'ready') return { ok: false as const, problem: '请选择结构完整、仍为当前来源的消散试验。' };
  const crossing = findT50Crossing(test);
  if (mode === 'auto-intersection' && !crossing.ok) return crossing;
  if (mode === 'manual-alternative' && (!manualT50Seconds || !Number.isFinite(manualT50Seconds) || manualT50Seconds <= 0)) {
    return { ok: false as const, problem: '手工 t50 必须是大于 0 的有限秒数。' };
  }
  const t50Seconds = mode === 'auto-intersection' && crossing.ok ? crossing.t50Seconds : manualT50Seconds as number;
  const uiKpa = test.rows[0].u2Kpa;
  const snapshot = {
    testRevisionId: test.revisionId,
    layerId: test.layerId,
    origin: mode,
    t50Seconds,
    uiKpa,
    u50Kpa: (uiKpa + test.u0Kpa) / 2,
    evidenceRowNumbers: mode === 'auto-intersection' && crossing.ok ? crossing.evidenceRowNumbers : [],
  };
  const revision: JtsDissipationT50RevisionV6 = {
    revisionId,
    ...snapshot,
    inputHash: sha256HexSync(stableStringify(snapshot)),
    createdAt: now,
  };
  return {
    ok: true as const,
    revision,
    workspace: {
      ...workspace,
      jtsDissipationT50Revisions: [...(workspace.jtsDissipationT50Revisions ?? []), revision],
      activeJtsDissipationTestRevisionId: test.revisionId,
      activeJtsDissipationT50RevisionId: revision.revisionId,
      activeJtsDissipationResultRevisionId: null,
    },
  };
}

export function calculateJtsDissipationResult(
  workspace: ParameterWorkspaceV2,
  pointId: string,
  packageRun: JtsParameterPackageRunV5,
  stratificationRevisionId: string,
  now = new Date().toISOString(),
  revisionId = createId('jts-dissipation-result'),
) {
  const test = (workspace.jtsDissipationTests ?? []).find((candidate) => candidate.revisionId === workspace.activeJtsDissipationTestRevisionId);
  const t50 = (workspace.jtsDissipationT50Revisions ?? []).find((candidate) => candidate.revisionId === workspace.activeJtsDissipationT50RevisionId);
  if (!test || test.status !== 'ready' || !t50 || t50.testRevisionId !== test.revisionId) return { ok: false as const, problem: '请先确认当前消散试验的 t50。' };
  if (packageRun.status !== 'completed' || packageRun.stratificationRevisionId !== stratificationRevisionId || packageRun.pointId !== pointId) {
    return { ok: false as const, problem: '当前 JTS 参数包与点位或分层修订不一致，请重新运行参数包。' };
  }
  const layer = packageRun.layerSnapshot.find((candidate) => candidate.layerId === test.layerId);
  if (!layer || layer.engineeringSoilGroup !== 'clay' || test.depthM < layer.depthFromM || test.depthM > layer.depthToM) {
    return { ok: false as const, problem: '消散试验必须关联当前黏性土层且深度位于该层范围内。' };
  }
  const gamma = representative(packageRun, test.layerId, 'jts_gamma_sat');
  const vs = representative(packageRun, test.layerId, 'jts_shear_wave_velocity');
  const su = representative(packageRun, test.layerId, 'jts_su_nkt');
  if (![gamma, vs, su].every((value) => value !== null && Number.isFinite(value) && value > 0)) {
    return { ok: false as const, problem: '当前层缺少有效 γsat、Vs 或 Su 代表值，不能计算 Ch/kh。' };
  }
  const row = packageRun.classificationRowsSnapshot.find((candidate) => candidate.depthM >= layer.depthFromM && candidate.depthM <= layer.depthToM && candidate.selectedClass);
  const context: JtsMethodContext = {
    route: row?.selectedClass?.approximate ? 'approximate_cpt' : 'full_cptu',
    soilClassId: row?.selectedClass?.soilClassId as JtsMethodContext['soilClassId'],
    dissipationEvidence: {
      testId: test.testId,
      testRevisionId: test.revisionId,
      t50ConfirmationRevisionId: t50.revisionId,
      t50ConfirmedAt: t50.createdAt,
      seriesComplete: test.status === 'ready',
    },
  };
  const inputs = { t50Seconds: t50.t50Seconds, naturalUnitWeightKnM3: gamma as number, shearWaveVelocityMps: vs as number, undrainedStrengthKpa: su as number };
  const evaluated = evaluateDissipationParameters(context, inputs);
  if (evaluated.ch.status !== 'value' || evaluated.kh.status !== 'value' || evaluated.ch.value === null || evaluated.kh.value === null || evaluated.rigidityIndex === null || evaluated.smallStrainModulusKpa === null) {
    const evaluationProblem = evaluated.ch.status !== 'value'
      ? evaluated.ch.reason
      : evaluated.kh.status !== 'value'
        ? evaluated.kh.reason
        : 'Ch/kh 计算输入不适用。';
    return { ok: false as const, problem: evaluationProblem };
  }
  const authority = {
    formulaRevision: JTS_DISSIPATION_FORMULA_REVISION,
    pointId,
    testRevisionId: test.revisionId,
    t50RevisionId: t50.revisionId,
    parameterPackageRunId: packageRun.runId,
    parameterPackageResultHash: packageRun.resultHash,
    stratificationRevisionId,
    layerId: test.layerId,
    inputs,
  };
  const resultBody = {
    rigidityIndex: evaluated.rigidityIndex,
    smallStrainModulusKpa: evaluated.smallStrainModulusKpa,
    chM2PerSecond: evaluated.ch.value,
    khMPerSecond: evaluated.kh.value,
  };
  const result: JtsDissipationResultRevisionV6 = {
    revisionId,
    ...authority,
    ...resultBody,
    status: 'completed',
    inputHash: sha256HexSync(stableStringify(authority)),
    resultHash: sha256HexSync(stableStringify(resultBody)),
    createdAt: now,
  };
  return {
    ok: true as const,
    result,
    workspace: {
      ...workspace,
      jtsDissipationResults: [...(workspace.jtsDissipationResults ?? []), result],
      activeJtsDissipationResultRevisionId: result.revisionId,
    },
  };
}

export function dissipationNormalizedRows(test: JtsDissipationTestRevisionV6) {
  const ui = test.rows[0]?.u2Kpa;
  return test.rows.map((row) => ({
    ...row,
    normalized: ui === undefined ? null : evaluateNormalizedDissipation({ route: 'full_cptu' }, row.u2Kpa, test.u0Kpa, ui).value,
  }));
}

export function validateJtsDissipationWorkspace(workspace: ParameterWorkspaceV2) {
  const tests = workspace.jtsDissipationTests ?? [];
  const t50s = workspace.jtsDissipationT50Revisions ?? [];
  const results = workspace.jtsDissipationResults ?? [];
  if (new Set(tests.map((item) => item.revisionId)).size !== tests.length || new Set(t50s.map((item) => item.revisionId)).size !== t50s.length || new Set(results.map((item) => item.revisionId)).size !== results.length) return { ok: false as const, problem: '消散工作区包含重复修订标识。' };
  for (const test of tests) {
    const snapshot = { fileName: test.fileName, depthM: test.depthM, layerId: test.layerId, u0Kpa: test.u0Kpa, rows: test.rows };
    if (test.inputHash !== sha256HexSync(stableStringify({ pointId: test.pointId, ...snapshot })) || test.problem !== testInputProblem(snapshot)) return { ok: false as const, problem: `消散试验 ${test.revisionId} 快照或问题状态无效。` };
  }
  for (const revision of t50s) {
    const test = tests.find((candidate) => candidate.revisionId === revision.testRevisionId);
    const snapshot = { testRevisionId: revision.testRevisionId, layerId: revision.layerId, origin: revision.origin, t50Seconds: revision.t50Seconds, uiKpa: revision.uiKpa, u50Kpa: revision.u50Kpa, evidenceRowNumbers: revision.evidenceRowNumbers };
    if (!test || revision.layerId !== test.layerId || revision.inputHash !== sha256HexSync(stableStringify(snapshot))) return { ok: false as const, problem: `t50 修订 ${revision.revisionId} 来源无效。` };
  }
  for (const result of results) {
    if (result.formulaRevision && result.formulaRevision !== JTS_DISSIPATION_FORMULA_REVISION) return { ok: false as const, problem: `消散结果 ${result.revisionId} 使用了未知公式修订。` };
    const authority = {
      ...(result.formulaRevision ? { formulaRevision: result.formulaRevision } : {}),
      pointId: result.pointId,
      testRevisionId: result.testRevisionId,
      t50RevisionId: result.t50RevisionId,
      parameterPackageRunId: result.parameterPackageRunId,
      parameterPackageResultHash: result.parameterPackageResultHash,
      stratificationRevisionId: result.stratificationRevisionId,
      layerId: result.layerId,
      inputs: result.inputs,
    };
    const body = { rigidityIndex: result.rigidityIndex, smallStrainModulusKpa: result.smallStrainModulusKpa, chM2PerSecond: result.chM2PerSecond, khMPerSecond: result.khMPerSecond };
    if (!tests.some((item) => item.revisionId === result.testRevisionId) || !t50s.some((item) => item.revisionId === result.t50RevisionId) || result.inputHash !== sha256HexSync(stableStringify(authority)) || result.resultHash !== sha256HexSync(stableStringify(body))) return { ok: false as const, problem: `消散结果 ${result.revisionId} 权威或哈希无效。` };
  }
  if (workspace.activeJtsDissipationTestRevisionId && !tests.some((item) => item.revisionId === workspace.activeJtsDissipationTestRevisionId && item.status !== 'stale')) return { ok: false as const, problem: '活动消散试验不存在或已失效。' };
  if (workspace.activeJtsDissipationT50RevisionId && !t50s.some((item) => item.revisionId === workspace.activeJtsDissipationT50RevisionId)) return { ok: false as const, problem: '活动 t50 修订不存在。' };
  if (workspace.activeJtsDissipationResultRevisionId && !results.some((item) => item.revisionId === workspace.activeJtsDissipationResultRevisionId && item.status === 'completed')) return { ok: false as const, problem: '活动消散结果不存在或已失效。' };
  return { ok: true as const };
}

function testInputProblem(input: DissipationSeriesInputV6) {
  if (!input.fileName.trim() || !input.layerId || !Number.isFinite(input.depthM) || input.depthM < 0 || !Number.isFinite(input.u0Kpa)) return '文件、深度、地层与静水孔压必须完整。';
  if (input.rows.length < 3) return '消散时间序列至少需要 3 行。';
  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index];
    if (!Number.isFinite(row.timeSeconds) || row.timeSeconds < 0 || !Number.isFinite(row.u2Kpa)) return `第 ${row.sourceRowNumber} 行包含无效时间或孔压。`;
    if (index > 0 && row.timeSeconds <= input.rows[index - 1].timeSeconds) return '时间必须严格递增，不能重复或倒序。';
  }
  if (input.rows[0].u2Kpa === input.u0Kpa) return '起始超孔压不能为 0。';
  if (Math.abs(input.rows.at(-1)!.u2Kpa - input.u0Kpa) >= Math.abs(input.rows[0].u2Kpa - input.u0Kpa)) return '序列没有向静水孔压方向消散。';
  return null;
}

function findT50Crossing(test: JtsDissipationTestRevisionV6): { ok: true; t50Seconds: number; evidenceRowNumbers: number[] } | { ok: false; problem: string } {
  const normalized = dissipationNormalizedRows(test);
  const intervals = test.rows.slice(1).map((row, index) => row.timeSeconds - test.rows[index].timeSeconds).sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)] ?? 0;
  for (let index = 1; index < normalized.length; index += 1) {
    const left = normalized[index - 1];
    const right = normalized[index];
    if (left.normalized === null || right.normalized === null || (left.normalized - 0.5) * (right.normalized - 0.5) > 0) continue;
    const gap = right.timeSeconds - left.timeSeconds;
    if (medianInterval > 0 && gap > medianInterval * 5) return { ok: false, problem: '50% 交点跨越长时间缺口，请使用有依据的手工 t50 备选。' };
    if (right.normalized === left.normalized) return { ok: false, problem: '50% 交点区间孔压无变化，不能自动插值。' };
    const ratio = (0.5 - left.normalized) / (right.normalized - left.normalized);
    return { ok: true, t50Seconds: left.timeSeconds + ratio * gap, evidenceRowNumbers: [left.sourceRowNumber, right.sourceRowNumber] };
  }
  return { ok: false, problem: '当前序列没有覆盖 50% 归一化消散交点，可改用手工 t50 备选并保留来源。' };
}

function representative(run: JtsParameterPackageRunV5, layerId: string, methodId: JtsParameterMethodIdV5) {
  return run.representativeValues.find((item) => item.layerId === layerId && item.methodId === methodId)?.median ?? null;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
