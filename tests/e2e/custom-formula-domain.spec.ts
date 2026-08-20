import { expect, test } from '@playwright/test';
import {
  beginCustomFormulaEdit,
  commitCustomFormula,
  completeCustomFormulaRun,
  createCustomFormula,
  createCustomFormulaSource,
  deleteCustomFormula,
  discardCustomFormulaEdit,
  duplicateCustomFormula,
  evaluateCustomFormulaExpression,
  finalizeCustomFormulaRunCancellation,
  prepareCustomFormulaRun,
  requestCustomFormulaRunCancellation,
  restoreCustomFormula,
  startCustomFormulaRun,
  updateCustomFormulaDraft,
  validateCustomFormulaExpression,
  validateCustomFormulaWorkspaceStructure,
} from '../../src/features/parameters/customFormulaDomain';
import {
  completeParameterInputDerivationRun,
  emptyParameterWorkspace,
  prepareParameterInputDerivationRun,
  startParameterInputDerivationRun,
} from '../../src/features/parameters/parameterDomain';
import { commitConfiguredParameterScheme, createConfiguredParameterScheme } from '../../src/features/parameters/parameterWorkbenchDomain';
import type { ParameterInputRowV2, ParameterSourceLineageV2 } from '../../src/features/parameters/parameterTypes';
import type { StratificationSchemeRevisionV2 } from '../../src/features/workspace/workspaceV2';
import { sha256HexSync, stableStringify } from '../../src/features/workspace/stableHash';

test('G1D parser accepts only the frozen arithmetic language and matches independent precedence oracles', () => {
  const arithmetic = validateCustomFormulaExpression('2 + 3 * 4');
  expect(arithmetic.ok).toBe(true);
  if (!arithmetic.ok) return;
  expect(evaluateCustomFormulaExpression(arithmetic.ast, emptyScope())).toEqual({ kind: 'value', value: 14 });

  const power = validateCustomFormulaExpression('2 ^ 3 ^ 2');
  expect(power.ok).toBe(true);
  if (!power.ok) return;
  expect(evaluateCustomFormulaExpression(power.ast, emptyScope())).toEqual({ kind: 'value', value: 512 });

  const functions = validateCustomFormulaExpression('clamp(log10(Qtn) * 10, 0, 25)');
  expect(functions.ok).toBe(true);
  if (!functions.ok) return;
  expect(evaluateCustomFormulaExpression(functions.ast, { ...emptyScope(), Qtn: 100 })).toEqual({ kind: 'value', value: 20 });
  expect(evaluateCustomFormulaExpression(functions.ast, emptyScope())).toEqual({ kind: 'missing', variable: 'Qtn' });

  for (const expression of ['window.location', 'qt.constructor', 'constructor', 'toString', '[qt]', '"qt"', 'unknown + 1', 'Math.max(qt, 1)', 'max(qt)', 'qt > 1', 'qt && qnet', 'true']) {
    expect(validateCustomFormulaExpression(expression), expression).toMatchObject({ ok: false });
  }
  const divide = validateCustomFormulaExpression('qt / qnet');
  expect(divide.ok).toBe(true);
  if (divide.ok) expect(evaluateCustomFormulaExpression(divide.ast, { ...emptyScope(), qt: 10, qnet: 0 })).toMatchObject({ kind: 'problem', reasonCode: 'CUSTOM_DIVIDE_BY_ZERO' });
});

test('G1D commits immutable formula authority and evaluates target rows without zero filling', async () => {
  const fixture = await createFixture();
  const source = createCustomFormulaSource(fixture.parameterRevision, fixture.derivationRun);
  const created = createCustomFormula({ workspace: fixture.workspace, source, targetLayerIds: ['layer-sand'], name: '砂层综合指标', now: '2026-07-11T04:00:00.000Z' });
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const updated = updateCustomFormulaDraft(created.workspace, { symbol: 'CI', unit: '用户声明值', expression: 'qnet / 100 + Qtn', resultMinimum: 0, resultMaximum: 500 }, '2026-07-11T04:01:00.000Z');
  expect(updated.ok).toBe(true);
  if (!updated.ok) return;
  const committed = commitCustomFormula(updated.workspace, source, ['layer-sand', 'layer-clay'], '2026-07-11T04:02:00.000Z');
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  expect(committed.formula).toMatchObject({ status: 'current', version: 1, symbol: 'CI' });
  expect(committed.revision.variables).toEqual(['Qtn', 'qnet']);

  const prepared = prepareCustomFormulaRun({
    workspace: committed.workspace,
    formulaRevisionId: committed.revision.revisionId,
    parameterRevision: fixture.parameterRevision,
    derivationRun: fixture.derivationRun,
    stratificationRevision: fixture.stratificationRevision,
    commandId: 'custom-command-1',
    runId: 'custom-run-1',
    now: '2026-07-11T04:03:00.000Z',
  });
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  const started = startCustomFormulaRun(prepared.workspace, prepared.run.runId, '2026-07-11T04:04:00.000Z');
  expect(started.ok).toBe(true);
  if (!started.ok) return;
  const completed = completeCustomFormulaRun(started.workspace, prepared.run.runId, '2026-07-11T04:05:00.000Z');
  expect(completed.ok).toBe(true);
  if (!completed.ok) return;

  const expected = fixture.derivationRun.derivedRows.slice(0, 3).map((row) => Number(((row.qnetKpa as number) / 100 + (row.qtn as number)).toFixed(12)));
  const actual = completed.run.values.filter((value) => value.status === 'valid').map((value) => Number((value.value as number).toFixed(12)));
  expect(actual).toEqual(expected);
  expect(completed.run.values.slice(3).every((value) => value.status === 'not_target' && value.value === null)).toBe(true);
  expect(completed.run.summary).toMatchObject({ rowCount: 6, validCount: 3, nonTargetCount: 3, numericProblemCount: 0 });
  expect(completed.run.resultHash).toMatch(/^[a-f0-9]{64}$/);
  expect(validateCustomFormulaWorkspaceStructure(completed.workspace, [fixture.stratificationRevision])).toEqual({ ok: true });

  const forged = structuredClone(completed.workspace);
  forged.customFormulaRuns![0].values[0].value = 999;
  expect(validateCustomFormulaWorkspaceStructure(forged, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedInput = structuredClone(completed.workspace);
  forgedInput.customFormulaRuns![0].inputRowsSnapshot[0].qc = 999999;
  forgedInput.customFormulaRuns![0].inputHash = sha256HexSync(stableStringify(forgedInput.customFormulaRuns![0].inputRowsSnapshot));
  expect(validateCustomFormulaWorkspaceStructure(forgedInput, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedMetadata = structuredClone(completed.workspace);
  forgedMetadata.customFormulaRuns![0].targetLayerIdsSnapshot = ['layer-clay'];
  expect(validateCustomFormulaWorkspaceStructure(forgedMetadata, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedFormula = structuredClone(completed.workspace);
  forgedFormula.customFormulas![0].expression = 'Qtn + 999';
  expect(validateCustomFormulaWorkspaceStructure(forgedFormula, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedLifecycle = structuredClone(completed.workspace);
  forgedLifecycle.customFormulaRuns![0].status = 'failed';
  forgedLifecycle.customFormulaRuns![0].failedAt = '2026-07-11T04:06:00.000Z';
  forgedLifecycle.customFormulaRuns![0].errorCode = 'FORGED';
  forgedLifecycle.customFormulaRuns![0].errorMessage = 'forged';
  expect(validateCustomFormulaWorkspaceStructure(forgedLifecycle, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedIdempotency = structuredClone(completed.workspace);
  forgedIdempotency.customFormulaRuns![0].idempotencyKey = 'forged';
  expect(validateCustomFormulaWorkspaceStructure(forgedIdempotency, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedPoint = structuredClone(completed.workspace);
  forgedPoint.customFormulaRuns![0].pointId = 'another-point';
  expect(validateCustomFormulaWorkspaceStructure(forgedPoint, [fixture.stratificationRevision])).toMatchObject({ ok: false });

  const forgedMixedLifecycle = structuredClone(completed.workspace);
  forgedMixedLifecycle.customFormulaRuns![0].cancelRequestedAt = '2026-07-11T04:04:30.000Z';
  expect(validateCustomFormulaWorkspaceStructure(forgedMixedLifecycle, [fixture.stratificationRevision])).toMatchObject({ ok: false });
});

test('G1D preserves cancellation and formula delete or restore lifecycles', async () => {
  const fixture = await createFixture();
  const source = createCustomFormulaSource(fixture.parameterRevision, fixture.derivationRun);
  const created = createCustomFormula({ workspace: fixture.workspace, source, targetLayerIds: ['layer-sand', 'layer-clay'] });
  if (!created.ok) throw new Error(created.problem);
  const committed = commitCustomFormula(created.workspace, source, ['layer-sand', 'layer-clay']);
  if (!committed.ok) throw new Error(committed.problem);
  const duplicated = duplicateCustomFormula(committed.workspace, committed.formula.formulaId, source);
  expect(duplicated.ok).toBe(true);
  if (!duplicated.ok) return;
  const duplicateCommit = commitCustomFormula(duplicated.workspace, source, ['layer-sand', 'layer-clay']);
  expect(duplicateCommit.ok).toBe(true);
  if (!duplicateCommit.ok) return;

  const prepared = prepareCustomFormulaRun({ workspace: duplicateCommit.workspace, formulaRevisionId: duplicateCommit.revision.revisionId, parameterRevision: fixture.parameterRevision, derivationRun: fixture.derivationRun, stratificationRevision: fixture.stratificationRevision, commandId: 'cancel-command' });
  if (!prepared.ok) throw new Error(prepared.problem);
  const started = startCustomFormulaRun(prepared.workspace, prepared.run.runId);
  if (!started.ok) throw new Error(started.problem);
  const requested = requestCustomFormulaRunCancellation(started.workspace, prepared.run.runId);
  if (!requested.ok) throw new Error(requested.problem);
  const cancelled = finalizeCustomFormulaRunCancellation(requested.workspace, prepared.run.runId);
  expect(cancelled.ok).toBe(true);
  if (!cancelled.ok) return;
  expect(cancelled.run).toMatchObject({ status: 'cancelled', values: [], resultHash: null });

  const deleted = deleteCustomFormula(cancelled.workspace, committed.formula.formulaId);
  expect(deleted.ok).toBe(true);
  if (!deleted.ok) return;
  const restored = restoreCustomFormula(deleted.workspace, committed.formula.formulaId, source);
  expect(restored.ok).toBe(true);
  if (restored.ok) expect(restored.formula.status).toBe('current');
  expect(validateCustomFormulaWorkspaceStructure(restored.workspace, [fixture.stratificationRevision])).toEqual({ ok: true });

  const begun = beginCustomFormulaEdit(restored.workspace, committed.formula.formulaId, source);
  expect(begun.ok).toBe(true);
  if (!begun.ok) return;
  const edited = updateCustomFormulaDraft(begun.workspace, { description: 'discard me' });
  expect(edited.ok).toBe(true);
  if (!edited.ok) return;
  const discarded = discardCustomFormulaEdit(edited.workspace);
  expect(discarded.workspace.customFormulas?.find((formula) => formula.formulaId === committed.formula.formulaId)?.status).toBe('current');
  expect(validateCustomFormulaWorkspaceStructure(discarded.workspace, [fixture.stratificationRevision])).toEqual({ ok: true });
});

async function createFixture() {
  const stratificationRevision = createStratificationRevision();
  const created = createConfiguredParameterScheme({ workspace: emptyParameterWorkspace(), source, stratificationRevision, now: '2026-07-11T03:00:00.000Z' });
  if (!created.ok) throw new Error(created.problem);
  const committed = commitConfiguredParameterScheme(created.workspace, source, '2026-07-11T03:01:00.000Z');
  if (!committed.ok) throw new Error(committed.problem);
  const parameterRevision = committed.workspace.revisions[0];
  const prepared = await prepareParameterInputDerivationRun(committed.workspace, parameterRevision.revisionId, inputRows, 6, 'derive-custom', '2026-07-11T03:02:00.000Z', 'derive-custom-run');
  if (!prepared.ok) throw new Error(prepared.problem);
  const started = startParameterInputDerivationRun(prepared.workspace, prepared.run.runId, '2026-07-11T03:03:00.000Z');
  if (!started.ok) throw new Error(started.problem);
  const completed = completeParameterInputDerivationRun(started.workspace, prepared.run.runId, '2026-07-11T03:04:00.000Z');
  if (!completed.ok) throw new Error(completed.problem);
  return { workspace: completed.workspace, parameterRevision, derivationRun: completed.run, stratificationRevision };
}

const source: ParameterSourceLineageV2 = {
  pointId: 'point-custom', siteId: null, draftId: 'draft-custom', batchId: 'batch-custom', revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 }, checkRunId: 'check-custom', stratificationSchemeId: 'strat-custom', stratificationRevisionId: 'strat-custom:revision:1', stratificationVersion: 1,
};

const inputRows: ParameterInputRowV2[] = [
  { sourceRowId: 'row-1', depthM: 1, qcKpa: 6500, qtKpa: 6700, fsKpa: 45, u2Kpa: 140, importedFrPercent: null },
  { sourceRowId: 'row-2', depthM: 2, qcKpa: 6300, qtKpa: 6500, fsKpa: 44, u2Kpa: 145, importedFrPercent: null },
  { sourceRowId: 'row-3', depthM: 3, qcKpa: 6100, qtKpa: 6320, fsKpa: 43, u2Kpa: 150, importedFrPercent: null },
  { sourceRowId: 'row-4', depthM: 4, qcKpa: 1800, qtKpa: 2150, fsKpa: 95, u2Kpa: 450, importedFrPercent: null },
  { sourceRowId: 'row-5', depthM: 5, qcKpa: 1700, qtKpa: 2050, fsKpa: 98, u2Kpa: 470, importedFrPercent: null },
  { sourceRowId: 'row-6', depthM: 6, qcKpa: 1600, qtKpa: 1980, fsKpa: 100, u2Kpa: 490, importedFrPercent: null },
];

function createStratificationRevision(): StratificationSchemeRevisionV2 {
  return {
    revisionId: source.stratificationRevisionId,
    schemeId: source.stratificationSchemeId,
    version: 1,
    committedAt: '2026-07-11T02:59:00.000Z',
    snapshot: {
      schemeId: source.stratificationSchemeId, name: '自定义公式分层', status: 'current', version: 1,
      input: { pointId: source.pointId, draftId: source.draftId, batchId: source.batchId, revisions: { ...source.revisions }, checkRunId: source.checkRunId },
      depthFromM: 1, depthToM: 6,
      layers: [
        { layerId: 'layer-sand', name: '砂层', description: '', engineeringSoilGroup: 'sand', reviewRequired: false, depthFromM: 1, depthToM: 3.5 },
        { layerId: 'layer-clay', name: '黏土层', description: '', engineeringSoilGroup: 'clay', reviewRequired: false, depthFromM: 3.5, depthToM: 6 },
      ],
      boundaries: [{ boundaryId: 'boundary-1', depthM: 3.5, upperLayerId: 'layer-sand', lowerLayerId: 'layer-clay', reviewRequired: false, note: '' }],
      createdAt: '2026-07-11T02:58:00.000Z', updatedAt: '2026-07-11T02:59:00.000Z',
    },
  };
}

function emptyScope() {
  return { depthM: 1, qc: null, qt: null, qnet: null, fs: null, u2: null, Qtn: null, IcRW: null };
}
