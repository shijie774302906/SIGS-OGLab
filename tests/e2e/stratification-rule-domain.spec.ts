import { expect, test } from '@playwright/test';
import {
  DEFAULT_STRATIFICATION_RULE_SETTINGS_V1,
  completeStratificationRuleRun,
  createSchemeFromStratificationRuleRun,
  failStratificationRuleRun,
  prepareStratificationRuleRun,
  requestStratificationRuleRunCancellation,
  startStratificationRuleRun,
  validateStratificationRuleRunStructure,
} from '../../src/features/stratification/stratificationRuleDomain';
import {
  applyStratificationCommand,
  commitStratificationEdit,
  createStratificationInput,
  emptyStratificationWorkspace,
  markStratificationWorkspaceStale,
} from '../../src/features/stratification/stratificationDomain';
import type { ArtifactDependency, StratificationRuleInputRowV1 } from '../../src/features/workspace/workspaceV2';

const dependency: ArtifactDependency = {
  pointId: 'point-rule-01',
  draftId: 'draft-rule-01',
  batchId: 'batch-rule-01',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};
const input = createStratificationInput(dependency, 'check-rule-01');
const stepRows: StratificationRuleInputRowV1[] = [1000, 1000, 1000, 1000, 8000, 8000, 8000, 8000].map((qcKpa, index) => ({
  sourceRowId: `row-${index + 1}`,
  depthM: index,
  qcKpa,
  frPercent: index < 4 ? 1 : 3,
}));

test('change-point rule matches an independent step oracle and creates an editable candidate scheme', () => {
  const settings = { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.75, minSpacingM: 1.5 };
  const prepared = prepareStratificationRuleRun(emptyStratificationWorkspace(), input, stepRows, settings, 'command-step', '2026-07-10T05:00:00.000Z', 'run-step');
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  const started = startStratificationRuleRun(prepared.workspace, prepared.run.runId, '2026-07-10T05:00:01.000Z');
  expect(started.ok).toBe(true);
  if (!started.ok) return;
  const completed = completeStratificationRuleRun(started.workspace, started.run.runId, '2026-07-10T05:00:02.000Z');
  expect(completed.ok).toBe(true);
  if (!completed.ok) return;

  expect(completed.run.summary).toEqual({ inputRowCount: 8, evaluatedSplitCount: 5, thresholdMatchCount: 1, selectedBoundaryCount: 1 });
  expect(completed.run.candidates).toHaveLength(1);
  expect(completed.run.candidates[0]).toMatchObject({
    depthM: 3.5,
    qcComponent: 0.875,
    frComponent: 0.666666666667,
    score: 0.8125,
    qcMedianAboveKpa: 1000,
    qcMedianBelowKpa: 8000,
    frMedianAbovePercent: 1,
    frMedianBelowPercent: 3,
  });
  expect(validateStratificationRuleRunStructure(completed.run)).toEqual({ ok: true });

  const converted = createSchemeFromStratificationRuleRun(completed.workspace, completed.run.runId, input, '规则候选方案', '2026-07-10T05:00:03.000Z', 'scheme-step');
  expect(converted.ok).toBe(true);
  if (!converted.ok) return;
  expect(converted.scheme).toMatchObject({
    origin: { kind: 'rule-candidate', ruleRunId: 'run-step', ruleId: 'qc_fr_change_point_v1' },
    layers: [{ name: '规则层 1', reviewRequired: true }, { name: '规则层 2', reviewRequired: true }],
    boundaries: [{ depthM: 3.5, reviewRequired: true }],
  });
  expect(converted.scheme.boundaries[0].ruleCandidateRef).toMatchObject({
    ruleRunId: 'run-step',
    candidateId: completed.run.candidates[0].candidateId,
    originalDepthM: 3.5,
    sourceRowIds: completed.run.candidates[0].sourceRowIds,
  });
  const moved = applyStratificationCommand(converted.workspace, { kind: 'move-boundary', boundaryId: converted.scheme.boundaries[0].boundaryId, depthM: 3.75 });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  let confirmedWorkspace = moved.workspace;
  for (const layer of moved.workspace.editSession?.working.layers ?? []) {
    const confirmed = applyStratificationCommand(confirmedWorkspace, { kind: 'set-layer-soil-classification', layerId: layer.layerId, engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    confirmedWorkspace = confirmed.workspace;
  }
  const committed = commitStratificationEdit(confirmedWorkspace, input, '2026-07-10T05:00:04.000Z');
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  expect(committed.scheme.boundaries[0].depthM).toBe(3.75);
  expect(committed.workspace.revisions).toHaveLength(1);
});

test('rule issues distinguish missing Fr, no candidates, insufficient rows, and invalid depth order', () => {
  const missingFrRows = stepRows.map((row, index) => ({ ...row, frPercent: index === 2 ? null : row.frPercent }));
  const missingFr = runRule(missingFrRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.75 });
  expect(missingFr.status).toBe('completed');
  expect(missingFr.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleFrUnavailable', severity: 'notice' }));
  expect(missingFr.candidates.find((candidate) => candidate.depthM === 3.5)).toMatchObject({ depthM: 3.5, score: 0.875, frComponent: null });

  const noCandidateResult = runRuleWithWorkspace(stepRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.9 });
  const noCandidates = noCandidateResult.run;
  expect(noCandidates.candidates).toHaveLength(0);
  expect(noCandidates.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleNoCandidates', recovery: 'rule-settings' }));
  expect(createSchemeFromStratificationRuleRun(noCandidateResult.workspace, noCandidates.runId, input, '空候选')).toMatchObject({ ok: false });

  const tooShort = runRule(stepRows.slice(0, 3), { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2 });
  expect(tooShort.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleInputTooShort', severity: 'problem' }));

  const invalidDepth = runRule(stepRows.map((row, index) => index === 4 ? { ...row, depthM: 3 } : row), { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2 });
  expect(invalidDepth.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleDepthOrderInvalid', severity: 'problem' }));
});

test('cancellation is terminal, idempotency is stable, and forged completed results are rejected', () => {
  const settings = { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.75 };
  const prepared = prepareStratificationRuleRun(emptyStratificationWorkspace(), input, stepRows, settings, 'command-cancel', '2026-07-10T05:10:00.000Z', 'run-cancel');
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  const duplicate = prepareStratificationRuleRun(prepared.workspace, input, stepRows, settings, 'command-cancel', '2026-07-10T05:10:00.500Z', 'run-other');
  expect(duplicate).toMatchObject({ ok: true, idempotent: true, run: { runId: 'run-cancel' } });
  const damagedIdempotentWorkspace = structuredClone(prepared.workspace);
  damagedIdempotentWorkspace.ruleRuns![0].status = 'mystery' as never;
  expect(prepareStratificationRuleRun(damagedIdempotentWorkspace, input, stepRows, settings, 'command-cancel', '2026-07-10T05:10:00.500Z', 'run-damaged')).toMatchObject({ ok: false, problem: expect.stringContaining('已损坏') });
  const started = startStratificationRuleRun(prepared.workspace, 'run-cancel', '2026-07-10T05:10:01.000Z');
  expect(started.ok).toBe(true);
  if (!started.ok) return;
  const requested = requestStratificationRuleRunCancellation(started.workspace, 'run-cancel');
  expect(requested.ok).toBe(true);
  if (!requested.ok) return;
  const lateCompletion = completeStratificationRuleRun(requested.workspace, 'run-cancel', '2026-07-10T05:10:02.000Z');
  expect(lateCompletion).toMatchObject({ ok: true, run: { status: 'cancelled', candidates: [], summary: null } });
  if (!lateCompletion.ok) return;
  expect(completeStratificationRuleRun(lateCompletion.workspace, 'run-cancel')).toMatchObject({ ok: false });

  const completed = runRuleWithWorkspace(stepRows, settings);
  const forged = structuredClone(completed.run);
  forged.candidates[0].score = 0.99;
  expect(validateStratificationRuleRunStructure(forged)).toMatchObject({ ok: false });
  const forgedWorkspace = structuredClone(completed.workspace);
  forgedWorkspace.ruleRuns![0] = forged;
  expect(createSchemeFromStratificationRuleRun(forgedWorkspace, forged.runId, input, '伪造候选')).toMatchObject({ ok: false, problem: expect.stringContaining('完整性') });
});

test('edge spacing, exact threshold, deterministic tie ordering, spacing, and boundary caps are independently frozen', () => {
  const edgeRows: StratificationRuleInputRowV1[] = [1000, 1000, 8000, 8000].map((qcKpa, index) => ({
    sourceRowId: `edge-${index + 1}`,
    depthM: index * 0.02,
    qcKpa,
    frPercent: null,
  }));
  const edge = runRule(edgeRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.8 });
  expect(edge.candidates).toHaveLength(0);
  expect(edge.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleCandidateOutsideEditableRange', severity: 'notice' }));

  const oscillating = [1000, 1000, 8000, 8000, 1000, 1000, 8000, 8000, 1000, 1000].map((qcKpa, index): StratificationRuleInputRowV1 => ({
    sourceRowId: `osc-${index + 1}`,
    depthM: index,
    qcKpa,
    frPercent: null,
  }));
  const exact = runRule(oscillating, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.875, minSpacingM: 2.5, maxBoundaries: 2 });
  expect(exact.candidates.map((candidate) => candidate.depthM)).toEqual([1.5, 5.5]);
  expect(exact.candidates.map((candidate) => candidate.score)).toEqual([0.875, 0.875]);
  expect(exact.summary).toMatchObject({ thresholdMatchCount: 4, selectedBoundaryCount: 2 });
  const aboveExact = runRule(oscillating, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.8750000000001, minSpacingM: 2.5, maxBoundaries: 2 });
  expect(aboveExact.candidates).toHaveLength(0);
});

test('qc problems, failure, invalidation, unknown states, and contradictory terminal evidence are rejected', () => {
  const invalidQc = runRule(stepRows.map((row, index) => index === 3 ? { ...row, qcKpa: 0 } : row), { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2 });
  expect(invalidQc.issues).toContainEqual(expect.objectContaining({ code: 'StrRuleQcInvalid', severity: 'problem', sourceRowIds: ['row-4'] }));

  const prepared = prepareStratificationRuleRun(emptyStratificationWorkspace(), input, stepRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2 }, 'command-state', '2026-07-10T07:00:00.000Z', 'run-state');
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepareStratificationRuleRun(emptyStratificationWorkspace(), input, stepRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2 }, 'bad-time', 'July 10 2026', 'bad-time-run')).toMatchObject({ ok: false });
  expect(startStratificationRuleRun(prepared.workspace, prepared.run.runId, '2026-07-10T06:59:59.000Z')).toMatchObject({ ok: false });
  const validStarted = startStratificationRuleRun(prepared.workspace, prepared.run.runId, '2026-07-10T07:00:01.000Z');
  expect(validStarted.ok).toBe(true);
  if (!validStarted.ok) return;
  expect(completeStratificationRuleRun(validStarted.workspace, validStarted.run.runId, '2026-07-10T07:00:00.500Z')).toMatchObject({ ok: false });
  expect(failStratificationRuleRun(prepared.workspace, prepared.run.runId, '', '')).toMatchObject({ ok: false });
  const failed = failStratificationRuleRun(prepared.workspace, prepared.run.runId, 'WorkerFailure', 'Rule worker stopped.', '2026-07-10T07:00:01.000Z');
  expect(failed.ok).toBe(true);
  if (!failed.ok) return;
  expect(validateStratificationRuleRunStructure(failed.run)).toEqual({ ok: true });

  const invalidatedWorkspace = markStratificationWorkspaceStale(prepared.workspace, 'Check revision changed.')!;
  const invalidated = invalidatedWorkspace.ruleRuns?.[0];
  expect(invalidated).toMatchObject({ status: 'invalidated', invalidationReason: 'Check revision changed.' });
  expect(validateStratificationRuleRunStructure(invalidated!)).toEqual({ ok: true });

  const unknown = structuredClone(prepared.run) as typeof prepared.run & { status: string };
  unknown.status = 'mystery';
  expect(validateStratificationRuleRunStructure(unknown as typeof prepared.run)).toMatchObject({ ok: false, problem: expect.stringContaining('状态') });

  const completed = runRuleWithWorkspace(stepRows, { ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1, windowRows: 2, scoreThreshold: 0.75 }).run;
  const contradictory = { ...structuredClone(completed), cancelledAt: completed.completedAt };
  expect(validateStratificationRuleRunStructure(contradictory)).toMatchObject({ ok: false, problem: expect.stringContaining('矛盾') });
});

function runRule(rows: StratificationRuleInputRowV1[], settings: typeof DEFAULT_STRATIFICATION_RULE_SETTINGS_V1) {
  return runRuleWithWorkspace(rows, settings).run;
}

function runRuleWithWorkspace(rows: StratificationRuleInputRowV1[], settings: typeof DEFAULT_STRATIFICATION_RULE_SETTINGS_V1) {
  const prepared = prepareStratificationRuleRun(emptyStratificationWorkspace(), input, rows, settings, `command-${Math.random()}`);
  if (!prepared.ok) throw new Error(prepared.problem);
  const started = startStratificationRuleRun(prepared.workspace, prepared.run.runId);
  if (!started.ok) throw new Error(started.problem);
  const completed = completeStratificationRuleRun(started.workspace, started.run.runId);
  if (!completed.ok) throw new Error(completed.problem);
  return completed;
}
