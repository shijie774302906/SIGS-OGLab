import { expect, test } from '@playwright/test';
import {
  applyStratificationCommand,
  beginStratificationEdit,
  commitStratificationEdit,
  createBaseStratificationScheme,
  deleteStratificationScheme,
  discardStratificationEdit,
  duplicateStratificationScheme,
  emptyStratificationWorkspace,
  getActiveStratificationScheme,
  getMergedLayerRestoreAvailability,
  getRenderableStratificationBoundaries,
  getStratificationHandoffGate,
  getStratificationIssues,
  getStratificationLayerReviewQueues,
  markStratificationWorkspaceStale,
  redoStratificationCommand,
  selectStratificationScheme,
  undoStratificationCommand,
} from '../../src/features/stratification/stratificationDomain';
import type { MajorGroupReviewReasonV2, StratificationInputDependencyV2 } from '../../src/features/workspace/workspaceV2';

const input: StratificationInputDependencyV2 = {
  pointId: 'point-a',
  draftId: 'draft-a',
  batchId: 'batch-a',
  checkRunId: 'check-a',
  revisions: { source: 1, mapping: 2, unit: 3, normalization: 4, pointPlan: 5 },
};

test('keeping the current layer structure records an explicit review without changing engineering geometry', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0.5, 12.5, '保留当前结构', '2026-08-03T08:00:00.000Z', 'scheme-keep');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const split = applyStratificationCommand(created.workspace, { kind: 'add-boundary', depthM: 4.2 }, '2026-08-03T08:00:01.000Z');
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const before = getActiveStratificationScheme(split.workspace)!;
  const geometry = { layers: structuredClone(before.layers), boundaries: structuredClone(before.boundaries) };

  const kept = applyStratificationCommand(split.workspace, { kind: 'confirm-current-layer-structure' }, '2026-08-03T08:00:02.000Z');
  expect(kept.ok).toBe(true);
  if (!kept.ok) return;
  expect(kept.scheme.layers).toEqual(geometry.layers);
  expect(kept.scheme.boundaries).toEqual(geometry.boundaries);
  expect(kept.scheme.layerStructureReviewHistory).toEqual([expect.objectContaining({ decision: 'keep-current', layerCount: 2, boundaryCount: 1, reviewedAt: '2026-08-03T08:00:02.000Z' })]);
  expect(kept.scheme.thinLayerCleanupHistory).toBeUndefined();
  expect(kept.scheme.layerSimplificationHistory).toBeUndefined();

  const undone = undoStratificationCommand(kept.workspace);
  expect(undone.ok).toBe(true);
  if (!undone.ok) return;
  const restored = getActiveStratificationScheme(undone.workspace)!;
  expect(restored.layerStructureReviewHistory).toBeUndefined();
  expect(restored.layers).toEqual(geometry.layers);
  expect(restored.boundaries).toEqual(geometry.boundaries);
});

test('scheme, layer, boundary, edit-session, and handoff lifecycles remain coherent', () => {
  const created = createBaseStratificationScheme(
    emptyStratificationWorkspace(),
    input,
    0.5,
    12.5,
    '主工作方案',
    '2026-07-10T11:00:00.000Z',
    'scheme-a',
  );
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(created.workspace.editSession).toMatchObject({ dirty: true, isNew: true });
  expect(getStratificationHandoffGate(created.workspace, input)).toMatchObject({ state: 'deny', label: '尚未建立方案' });

  const firstSplit = applyStratificationCommand(created.workspace, { kind: 'add-boundary', depthM: 4.2 });
  expect(firstSplit.ok).toBe(true);
  if (!firstSplit.ok) return;
  const secondSplit = applyStratificationCommand(firstSplit.workspace, { kind: 'add-boundary', depthM: 8.7 });
  expect(secondSplit.ok).toBe(true);
  if (!secondSplit.ok) return;
  const schemeAfterSplit = getActiveStratificationScheme(secondSplit.workspace);
  expect(schemeAfterSplit?.layers).toHaveLength(3);
  expect(schemeAfterSplit?.boundaries.map((boundary) => boundary.depthM)).toEqual([4.2, 8.7]);

  const renamed = applyStratificationCommand(secondSplit.workspace, {
    kind: 'rename-layer',
    layerId: schemeAfterSplit!.layers[1].layerId,
    name: '粉质黏土层',
  });
  expect(renamed.ok).toBe(true);
  if (!renamed.ok) return;
  const review = applyStratificationCommand(renamed.workspace, {
    kind: 'set-boundary-review',
    boundaryId: getActiveStratificationScheme(renamed.workspace)!.boundaries[0].boundaryId,
    reviewRequired: true,
    note: '核对 qc 变化。',
  });
  expect(review.ok).toBe(true);
  if (!review.ok) return;
  const reviewIssues = getStratificationIssues(getActiveStratificationScheme(review.workspace)!);
  expect(reviewIssues).toContainEqual(expect.objectContaining({ severity: 'notice', title: '边界需复核' }));
  expect(reviewIssues).toContainEqual(expect.objectContaining({ severity: 'problem', title: '土类待确认' }));

  let confirmedWorkspace = review.workspace;
  for (const layer of getActiveStratificationScheme(review.workspace)!.layers) {
    const confirmed = applyStratificationCommand(confirmedWorkspace, {
      kind: 'set-layer-soil-group',
      layerId: layer.layerId,
      engineeringSoilGroup: 'sand',
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    confirmedWorkspace = confirmed.workspace;
  }

  for (const layer of getActiveStratificationScheme(confirmedWorkspace)!.layers) {
    const repeatedDescription = applyStratificationCommand(confirmedWorkspace, {
      kind: 'rename-layer',
      layerId: layer.layerId,
      name: '黏性土（组成：淤泥）',
    });
    expect(repeatedDescription.ok).toBe(true);
    if (!repeatedDescription.ok) return;
    confirmedWorkspace = repeatedDescription.workspace;
  }
  expect(getStratificationIssues(getActiveStratificationScheme(confirmedWorkspace)!)).not.toContainEqual(
    expect.objectContaining({ title: '土层名称重复' }),
  );

  const committed = commitStratificationEdit(confirmedWorkspace, input, '2026-07-10T11:10:00.000Z');
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  expect(committed.workspace).toMatchObject({ currentSchemeId: 'scheme-a', activeSchemeId: 'scheme-a', editSession: null });
  expect(committed.workspace.revisions).toHaveLength(1);
  expect(committed.workspace.revisions?.[0]).toMatchObject({ schemeId: 'scheme-a', version: 1, snapshot: { version: 1, status: 'current' } });
  expect(getStratificationHandoffGate(committed.workspace, input)).toMatchObject({ state: 'warn', recovery: 'parameters' });
});

test('invalid boundary commands are rejected while undo, redo, merge, and discard restore valid state', () => {
  expect(createBaseStratificationScheme(emptyStratificationWorkspace(), input, Number.NaN, 10, '非法范围')).toMatchObject({ ok: false });
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 1, 10, '编辑方案', undefined, 'scheme-edit');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const split = applyStratificationCommand(created.workspace, { kind: 'add-boundary', depthM: 5 });
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const boundaryId = getActiveStratificationScheme(split.workspace)!.boundaries[0].boundaryId;

  const invalid = applyStratificationCommand(split.workspace, { kind: 'move-boundary', boundaryId, depthM: 9.98 });
  expect(invalid).toMatchObject({ ok: false });
  expect(applyStratificationCommand(split.workspace, { kind: 'move-boundary', boundaryId, depthM: Number.NaN })).toMatchObject({ ok: false, problem: /有限数值/ });
  expect(getActiveStratificationScheme(split.workspace)!.boundaries[0].depthM).toBe(5);

  const moved = applyStratificationCommand(split.workspace, { kind: 'move-boundary', boundaryId, depthM: 6 });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  expect(getActiveStratificationScheme(moved.workspace)!.boundaries[0].depthM).toBe(6);
  const undone = undoStratificationCommand(moved.workspace);
  expect(undone.ok).toBe(true);
  if (!undone.ok) return;
  expect(getActiveStratificationScheme(undone.workspace)!.boundaries[0].depthM).toBe(5);
  const redone = redoStratificationCommand(undone.workspace);
  expect(redone.ok).toBe(true);
  if (!redone.ok) return;
  expect(getActiveStratificationScheme(redone.workspace)!.boundaries[0].depthM).toBe(6);

  const visible = getActiveStratificationScheme(redone.workspace)!;
  const upperSoil = applyStratificationCommand(redone.workspace, { kind: 'set-layer-soil-group', layerId: visible.layers[0].layerId, engineeringSoilGroup: 'sand' });
  expect(upperSoil.ok).toBe(true);
  if (!upperSoil.ok) return;
  const lowerSoil = applyStratificationCommand(upperSoil.workspace, { kind: 'set-layer-soil-group', layerId: visible.layers[1].layerId, engineeringSoilGroup: 'clay' });
  expect(lowerSoil.ok).toBe(true);
  if (!lowerSoil.ok) return;
  const merged = applyStratificationCommand(lowerSoil.workspace, { kind: 'remove-boundary', boundaryId, reason: 'engineering-judgement' });
  expect(merged.ok).toBe(true);
  if (!merged.ok) return;
  expect(getActiveStratificationScheme(merged.workspace)).toMatchObject({
    layers: [{ depthFromM: 1, depthToM: 10, engineeringSoilGroup: 'sand', reviewRequired: true }],
    boundaries: [],
  });
  expect(getActiveStratificationScheme(merged.workspace)?.layers[0].mergeSources).toMatchObject([
    { engineeringSoilGroup: 'sand' },
    { engineeringSoilGroup: 'clay' },
  ]);
  expect(getStratificationIssues(getActiveStratificationScheme(merged.workspace)!)).toContainEqual(expect.objectContaining({ severity: 'notice', title: '合并层需复核' }));
  const discarded = discardStratificationEdit(merged.workspace);
  expect(discarded.ok).toBe(true);
  if (!discarded.ok) return;
  expect(discarded.workspace.schemes).toHaveLength(0);
});

test('multiple schemes require an explicit replacement and stale check input denies handoff', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 20, '方案 A', undefined, 'scheme-a');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const committed = commitStratificationEdit(confirmAllLayers(created.workspace), input);
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  const duplicated = duplicateStratificationScheme(committed.workspace, 'scheme-a', input, undefined, 'scheme-b');
  expect(duplicated.ok).toBe(true);
  if (!duplicated.ok) return;
  const committedB = commitStratificationEdit(duplicated.workspace, input);
  expect(committedB.ok).toBe(true);
  if (!committedB.ok) return;

  expect(deleteStratificationScheme(committedB.workspace, 'scheme-b', input)).toMatchObject({ ok: false });
  const ineligible = structuredClone(committedB.workspace);
  ineligible.schemes.find((scheme) => scheme.schemeId === 'scheme-a')!.status = 'stale';
  expect(deleteStratificationScheme(ineligible, 'scheme-b', input, 'scheme-a')).toMatchObject({ ok: false, problem: /替代方案/ });
  const deleted = deleteStratificationScheme(committedB.workspace, 'scheme-b', input, 'scheme-a');
  expect(deleted.ok).toBe(true);
  if (!deleted.ok) return;
  expect(deleted.workspace).toMatchObject({ currentSchemeId: 'scheme-a', activeSchemeId: 'scheme-a' });
  expect(deleted.workspace.deletedSchemeIds).toContain('scheme-b');

  const changedInput = structuredClone(input);
  changedInput.checkRunId = 'check-b';
  expect(getStratificationHandoffGate(deleted.workspace, changedInput)).toMatchObject({ state: 'deny', label: '方案需更新' });
});

test('commits append immutable revisions and reject stale base versions', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 15, '版本方案', undefined, 'scheme-version');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const first = commitStratificationEdit(confirmAllLayers(created.workspace), input, '2026-07-10T12:00:00.000Z');
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  const begun = beginStratificationEdit(first.workspace, 'scheme-version', input);
  expect(begun.ok).toBe(true);
  if (!begun.ok) return;
  const renamed = applyStratificationCommand(begun.workspace, { kind: 'rename-layer', layerId: begun.workspace.editSession!.working.layers[0].layerId, name: '修订层' });
  expect(renamed.ok).toBe(true);
  if (!renamed.ok) return;
  const second = commitStratificationEdit(renamed.workspace, input, '2026-07-10T12:05:00.000Z');
  expect(second.ok).toBe(true);
  if (!second.ok) return;
  expect(second.workspace.revisions?.map((revision) => revision.version)).toEqual([1, 2]);
  expect(second.workspace.revisions?.[0].snapshot.layers[0].name).toBe('未命名层 1');
  expect(second.workspace.revisions?.[1].snapshot.layers[0].name).toBe('修订层');

  const conflicted = beginStratificationEdit(second.workspace, 'scheme-version', input);
  expect(conflicted.ok).toBe(true);
  if (!conflicted.ok) return;
  conflicted.workspace.schemes[0].version += 1;
  expect(commitStratificationEdit(conflicted.workspace, input)).toMatchObject({ ok: false, problem: /版本已变化/ });
});

test('viewing history never presents the current scheme handoff as ready', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 20, '方案 A', undefined, 'scheme-history-a');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const committedA = commitStratificationEdit(confirmAllLayers(created.workspace), input);
  expect(committedA.ok).toBe(true);
  if (!committedA.ok) return;
  const copied = duplicateStratificationScheme(committedA.workspace, 'scheme-history-a', input, undefined, 'scheme-history-b');
  expect(copied.ok).toBe(true);
  if (!copied.ok) return;
  const committedB = commitStratificationEdit(copied.workspace, input);
  expect(committedB.ok).toBe(true);
  if (!committedB.ok) return;
  const selectedHistory = selectStratificationScheme(committedB.workspace, 'scheme-history-a');
  expect(selectedHistory.ok).toBe(true);
  if (!selectedHistory.ok) return;
  expect(getStratificationHandoffGate(selectedHistory.workspace, input)).toMatchObject({ state: 'deny', label: '正在查看其他方案' });
  const newerCheck = { ...structuredClone(input), checkRunId: 'check-newer' };
  expect(beginStratificationEdit(selectedHistory.workspace, 'scheme-history-a', newerCheck)).toMatchObject({ ok: false, problem: /不对应最新数据检查/ });

  const editingCurrent = beginStratificationEdit(committedB.workspace, 'scheme-history-b', input);
  expect(editingCurrent.ok).toBe(true);
  if (!editingCurrent.ok) return;
  expect(commitStratificationEdit(editingCurrent.workspace, newerCheck)).toMatchObject({ ok: false, problem: /不再对应最新数据检查/ });
});

test('upstream changes preserve dirty edits, reject further commands, and require explicit discard', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '保留编辑', undefined, 'scheme-stale-edit');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const committed = commitStratificationEdit(confirmAllLayers(created.workspace), input);
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  const begun = beginStratificationEdit(committed.workspace, 'scheme-stale-edit', input);
  expect(begun.ok).toBe(true);
  if (!begun.ok) return;
  const renamed = applyStratificationCommand(begun.workspace, { kind: 'rename-layer', layerId: begun.workspace.editSession!.working.layers[0].layerId, name: '尚未提交层' });
  expect(renamed.ok).toBe(true);
  if (!renamed.ok) return;
  const stale = markStratificationWorkspaceStale(renamed.workspace, '检查已重新运行。')!;
  expect(stale.editSession).toMatchObject({ dirty: true, staleReason: '检查已重新运行。', working: { layers: [{ name: '尚未提交层' }] } });
  expect(stale.schemes[0].status).toBe('stale');
  expect(applyStratificationCommand(stale, { kind: 'add-boundary', depthM: 5 })).toMatchObject({ ok: false });
  expect(commitStratificationEdit(stale, input)).toMatchObject({ ok: false, problem: /不能提交/ });
  const discarded = discardStratificationEdit(stale);
  expect(discarded.ok).toBe(true);
  if (!discarded.ok) return;
  expect(discarded.workspace.editSession).toBeNull();
  expect(discarded.workspace.schemes[0]).toMatchObject({ status: 'stale', layers: [{ name: '未命名层 1' }] });
});

test('every check dependency component invalidates the stratification handoff', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 8, '依赖方案', undefined, 'scheme-dependency');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const committed = commitStratificationEdit(confirmAllLayers(created.workspace), input);
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  for (const key of ['source', 'mapping', 'unit', 'normalization', 'pointPlan'] as const) {
    const changed = structuredClone(input);
    changed.revisions[key] += 1;
    expect(getStratificationHandoffGate(committed.workspace, changed), key).toMatchObject({ state: 'deny', label: '方案需更新' });
  }
  const changedRun = { ...structuredClone(input), checkRunId: 'check-next' };
  expect(getStratificationHandoffGate(committed.workspace, changedRun)).toMatchObject({ state: 'deny', label: '方案需更新' });
});

test('typed and legacy major-group review reasons keep the parameter handoff closed until explicitly cleared', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 8, '归并复核门禁', undefined, 'major-group-gate');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const committed = commitStratificationEdit(confirmAllLayers(created.workspace), input);
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  const layerId = committed.workspace.schemes[0].layers[0].layerId;
  const cases: Array<{ label: string; reasons: MajorGroupReviewReasonV2[] }> = [
    { label: 'source soil', reasons: [{ kind: 'source-soil-confirmation', sourceLayerIds: [layerId] }] },
    { label: 'source evidence', reasons: [{ kind: 'source-evidence', sourceLayerIds: [layerId] }] },
    { label: 'curve difference', reasons: [{ kind: 'curve-difference', boundaryId: 'legacy-boundary', boundaryDepthM: 4, channels: ['qc', 'fs'] }] },
    { label: 'legacy untyped', reasons: [{ kind: 'legacy-untyped', sourceLayerIds: [layerId] }] },
    {
      label: 'combined',
      reasons: [
        { kind: 'source-soil-confirmation', sourceLayerIds: [layerId] },
        { kind: 'source-evidence', sourceLayerIds: [layerId] },
        { kind: 'curve-difference', boundaryId: 'combined-boundary', boundaryDepthM: 4, channels: ['u2'] },
      ],
    },
  ];
  for (const currentCase of cases) {
    const workspace = structuredClone(committed.workspace);
    const layer = workspace.schemes[0].layers[0];
    layer.majorGroupComposition = {
      engineeringSoilGroup: 'sand',
      detailedSoilTypes: ['粉砂'],
      sourceLayerIds: [layerId],
      reviewReasons: currentCase.reasons,
    };
    expect(getStratificationHandoffGate(workspace, input), currentCase.label).toMatchObject({ state: 'deny', recovery: 'problem' });
    const reloaded = JSON.parse(JSON.stringify(workspace));
    expect(getStratificationHandoffGate(reloaded, input), `${currentCase.label} after reload`).toMatchObject({ state: 'deny', recovery: 'problem' });
  }

  const cleared = structuredClone(committed.workspace);
  const clearedLayer = cleared.schemes[0].layers[0];
  clearedLayer.majorGroupComposition = {
    engineeringSoilGroup: 'sand',
    detailedSoilTypes: ['粉砂'],
    sourceLayerIds: [layerId],
    reviewReasons: [],
  };
  clearedLayer.reviewRequired = true;
  clearedLayer.soilConfirmationRequired = true;
  clearedLayer.evidenceReviewRequired = true;
  expect(getStratificationHandoffGate(cleared, input)).toMatchObject({ state: 'allow' });
});

test('guided split and merge preserve inherited two-level soil provenance deterministically', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '继承规则', '2026-07-13T10:00:00.000Z', 'inheritance');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(applyStratificationCommand(created.workspace, { kind: 'set-layer-soil-classification', layerId: 'inheritance:layer:1', engineeringSoilGroup: 'sand', detailedSoilType: '自由填写土类' })).toMatchObject({ ok: false, problem: /固定目录/ });
  let result = applyStratificationCommand(created.workspace, { kind: 'set-layer-soil-classification', layerId: 'inheritance:layer:1', engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' }, '2026-07-13T10:00:01.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'split-layer', layerId: 'inheritance:layer:1', depthM: 3 }, '2026-07-13T10:00:02.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  let scheme = getActiveStratificationScheme(result.workspace)!;
  expect(scheme.layers).toHaveLength(2);
  expect(scheme.layers.every((layer) => layer.soilDecision?.reviewAction === 'split-inherited' && layer.soilDecision?.finalDetailedType === '粉砂')).toBe(true);
  expect(getStratificationIssues(scheme).filter((issue) => issue.title === '拆分继承需确认')).toHaveLength(2);
  const lowerId = scheme.layers[1].layerId;
  result = applyStratificationCommand(result.workspace, { kind: 'set-layer-soil-classification', layerId: lowerId, engineeringSoilGroup: 'clay', detailedSoilType: '粉质黏土' }, '2026-07-13T10:00:03.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'merge-layer', layerId: 'inheritance:layer:1', direction: 'below', reason: 'engineering-judgement' }, '2026-07-13T10:00:04.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  scheme = getActiveStratificationScheme(result.workspace)!;
  expect(scheme.layers).toHaveLength(1);
  expect(scheme.layers[0]).toMatchObject({ engineeringSoilGroup: 'clay', reviewRequired: true, soilDecision: { finalDetailedType: '粉质黏土', reviewStatus: 'pending', reviewAction: 'merged-inherited', source: 'inherited' } });
  expect(getStratificationIssues(scheme).some((issue) => issue.title === '合并层需复核')).toBe(true);
  const combinedRiskScheme = structuredClone(scheme);
  combinedRiskScheme.layers[0].evidenceReviewRequired = true;
  expect(getStratificationIssues(combinedRiskScheme).some((issue) => issue.title === '来源证据待复核')).toBe(true);
});

test('merged layers restore their recorded source structure atomically and remain reviewable', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '恢复合并来源', '2026-07-16T08:00:00.000Z', 'restore-merge');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  let result = applyStratificationCommand(created.workspace, { kind: 'set-layer-soil-classification', layerId: 'restore-merge:layer:1', engineeringSoilGroup: 'sand', detailedSoilType: '细砂' }, '2026-07-16T08:00:01.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'split-layer', layerId: 'restore-merge:layer:1', depthM: 3 }, '2026-07-16T08:00:02.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  let scheme = getActiveStratificationScheme(result.workspace)!;
  const secondId = scheme.layers[1].layerId;
  result = applyStratificationCommand(result.workspace, { kind: 'set-layer-soil-classification', layerId: secondId, engineeringSoilGroup: 'clay', detailedSoilType: '黏土' }, '2026-07-16T08:00:03.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'split-layer', layerId: secondId, depthM: 7 }, '2026-07-16T08:00:04.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  scheme = getActiveStratificationScheme(result.workspace)!;
  const thirdId = scheme.layers[2].layerId;
  result = applyStratificationCommand(result.workspace, { kind: 'set-layer-soil-classification', layerId: thirdId, engineeringSoilGroup: 'mixed', detailedSoilType: '粉土' }, '2026-07-16T08:00:05.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'merge-layer', layerId: 'restore-merge:layer:1', direction: 'below', reason: 'engineering-judgement' }, '2026-07-16T08:00:06.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  result = applyStratificationCommand(result.workspace, { kind: 'merge-layer', layerId: 'restore-merge:layer:1', direction: 'below', reason: 'engineering-judgement' }, '2026-07-16T08:00:07.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  scheme = getActiveStratificationScheme(result.workspace)!;
  expect(scheme.layers).toHaveLength(1);
  expect(getMergedLayerRestoreAvailability(scheme.layers[0])).toMatchObject({ available: true, sourceCount: 3 });

  const restored = applyStratificationCommand(result.workspace, { kind: 'restore-merged-layer', layerId: scheme.layers[0].layerId }, '2026-07-16T08:00:08.000Z');
  expect(restored.ok).toBe(true);
  if (!restored.ok) return;
  scheme = getActiveStratificationScheme(restored.workspace)!;
  expect(scheme.layers.map((layer) => [layer.depthFromM, layer.depthToM, layer.engineeringSoilGroup, layer.soilDecision?.finalDetailedType])).toEqual([
    [0, 3, 'sand', '细砂'],
    [3, 7, 'clay', '黏土'],
    [7, 10, 'mixed', '粉土'],
  ]);
  expect(scheme.layers.every((layer) => layer.reviewRequired && layer.soilDecision?.reviewStatus === 'pending' && layer.soilDecision.reviewAction === 'split-inherited')).toBe(true);
  expect(scheme.boundaries.map((boundary) => boundary.depthM)).toEqual([3, 7]);

  const undone = undoStratificationCommand(restored.workspace);
  expect(undone.ok).toBe(true);
  if (!undone.ok) return;
  expect(getActiveStratificationScheme(undone.workspace)!.layers).toHaveLength(1);
  const redone = redoStratificationCommand(undone.workspace);
  expect(redone.ok).toBe(true);
  if (!redone.ok) return;
  expect(getActiveStratificationScheme(redone.workspace)!.layers).toHaveLength(3);
});

test('merged-layer restoration refuses missing or non-contiguous provenance without partial edits', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 6, '拒绝不可靠恢复', '2026-07-16T09:00:00.000Z', 'reject-restore');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const initialLayer = getActiveStratificationScheme(created.workspace)!.layers[0];
  expect(getMergedLayerRestoreAvailability(initialLayer)).toMatchObject({ available: false, sourceCount: 0 });
  expect(applyStratificationCommand(created.workspace, { kind: 'restore-merged-layer', layerId: initialLayer.layerId })).toMatchObject({ ok: false, problem: /没有可追溯/ });

  const split = applyStratificationCommand(created.workspace, { kind: 'split-layer', layerId: initialLayer.layerId, depthM: 3 }, '2026-07-16T09:00:01.000Z');
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const merged = applyStratificationCommand(split.workspace, { kind: 'merge-layer', layerId: initialLayer.layerId, direction: 'below', reason: 'engineering-judgement' }, '2026-07-16T09:00:02.000Z');
  expect(merged.ok).toBe(true);
  if (!merged.ok) return;
  const corrupted = structuredClone(merged.workspace);
  corrupted.editSession!.working.layers[0].mergeSources![1].depthFromM = 3.2;
  const before = JSON.stringify(corrupted.editSession!.working);
  const rejected = applyStratificationCommand(corrupted, { kind: 'restore-merged-layer', layerId: initialLayer.layerId }, '2026-07-16T09:00:03.000Z');
  expect(rejected).toMatchObject({ ok: false, problem: /空隙或重叠/ });
  expect(JSON.stringify(corrupted.editSession!.working)).toBe(before);
});

test('batch acceptance confirms only clear method candidates and keeps review layers pending', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 8, '批量确认', '2026-07-13T11:00:00.000Z', 'batch-review');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const workspace = structuredClone(created.workspace);
  const first = workspace.editSession!.working.layers[0];
  first.engineeringSoilGroup = 'sand';
  first.soilDecision = { suggestedGroup: 'sand', finalGroup: 'sand', suggestedDetailedType: '粉砂', finalDetailedType: '粉砂', reviewStatus: 'pending', reviewAction: 'method-suggested', methodClassification: { methodId: 'JTS-T242-2020', classCode: 'Zone 7', classLabel: '粉砂' }, source: 'jts-suggested', classificationRunId: 'run-clear', decidedAt: '2026-07-13T11:00:00.000Z' };
  const split = applyStratificationCommand(workspace, { kind: 'split-layer', layerId: first.layerId, depthM: 4 }, '2026-07-13T11:00:01.000Z');
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const prepared = structuredClone(split.workspace);
  const [clearLayer, reviewLayer] = prepared.editSession!.working.layers;
  clearLayer.reviewRequired = false;
  clearLayer.evidenceReviewRequired = false;
  clearLayer.soilDecision!.reviewStatus = 'pending';
  clearLayer.soilDecision!.reviewAction = 'method-suggested';
  reviewLayer.reviewRequired = true;
  reviewLayer.evidenceReviewRequired = true;
  reviewLayer.soilDecision!.reviewStatus = 'needs-review';
  prepared.editSession!.working.boundaries.forEach((boundary) => { boundary.reviewRequired = true; boundary.note = '边界复核提示保留，但不阻止批量确认土类。'; });
  const accepted = applyStratificationCommand(prepared, { kind: 'accept-clear-layer-candidates' }, '2026-07-13T11:00:02.000Z');
  expect(accepted.ok).toBe(true);
  if (!accepted.ok) return;
  const scheme = getActiveStratificationScheme(accepted.workspace)!;
  expect(scheme.layers[0].soilDecision).toMatchObject({ reviewStatus: 'accepted', reviewAction: 'batch-accepted', finalDetailedType: '粉砂' });
  expect(scheme.layers[0].soilDecision?.methodClassification).toEqual({ methodId: 'JTS-T242-2020', classCode: 'Zone 7', classLabel: '粉砂' });
  expect(scheme.layers[1].soilDecision).toMatchObject({ reviewStatus: 'needs-review' });
  expect(getStratificationIssues(scheme).some((issue) => issue.title === '来源证据待复核')).toBe(true);
});

test('pending layer candidates cannot create a current revision', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 6, '待确认不能提交', undefined, 'pending-commit');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const rejected = commitStratificationEdit(created.workspace, input);
  expect(rejected).toMatchObject({ ok: false, problem: /尚未确认工程土类/ });
  if (rejected.ok) return;
  expect(created.workspace.currentSchemeId).toBeNull();
  expect(created.workspace.revisions).toHaveLength(0);
});

test('deferred layers persist with a reason, leave the normal queue, and still block revision generation', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 6, '暂存队列', '2026-07-14T08:00:00.000Z', 'deferred-queue');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const layerId = getActiveStratificationScheme(created.workspace)!.layers[0].layerId;
  const classified = applyStratificationCommand(created.workspace, { kind: 'set-layer-soil-classification', layerId, engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' }, '2026-07-14T08:01:00.000Z');
  expect(classified.ok).toBe(true);
  if (!classified.ok) return;
  const reopened = applyStratificationCommand(classified.workspace, { kind: 'set-layer-guide-review', layerId, reviewRequired: true }, '2026-07-14T08:02:00.000Z');
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  const deferred = applyStratificationCommand(reopened.workspace, { kind: 'defer-layer-candidate', layerId, reason: 'needs-sampling', note: '等待室内试验' }, '2026-07-14T08:03:00.000Z');
  expect(deferred.ok).toBe(true);
  if (!deferred.ok) return;
  const scheme = getActiveStratificationScheme(deferred.workspace)!;
  expect(scheme.layers[0].soilDecision).toMatchObject({ reviewStatus: 'deferred', decisionReason: 'needs-sampling', decisionNote: '等待室内试验', deferredAt: '2026-07-14T08:03:00.000Z' });
  expect(getStratificationLayerReviewQueues(scheme)).toMatchObject({ pending: [], deferred: [expect.objectContaining({ layerId })] });
  expect(getStratificationIssues(scheme)).toContainEqual(expect.objectContaining({ severity: 'problem', title: '土层暂时保留', layerId }));
  expect(commitStratificationEdit(deferred.workspace, input)).toMatchObject({ ok: false, problem: /暂时保留/ });
});

test('moving a shared boundary returns both adjacent layers to the confirmation queue', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '调界复核', undefined, 'boundary-reconfirm');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const split = applyStratificationCommand(created.workspace, { kind: 'split-layer', layerId: getActiveStratificationScheme(created.workspace)!.layers[0].layerId, depthM: 5 });
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const confirmed = confirmAllLayers(split.workspace);
  const boundary = getActiveStratificationScheme(confirmed)!.boundaries[0];
  const moved = applyStratificationCommand(confirmed, { kind: 'move-boundary', boundaryId: boundary.boundaryId, depthM: 5.5 });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  const layers = getActiveStratificationScheme(moved.workspace)!.layers;
  expect(layers).toHaveLength(2);
  expect(layers.every((layer) => layer.reviewRequired && layer.soilDecision?.reviewStatus === 'pending' && layer.soilDecision.reviewAction === 'boundary-adjusted')).toBe(true);
  expect(getStratificationLayerReviewQueues(getActiveStratificationScheme(moved.workspace)!).pending).toHaveLength(2);
});

test('only real adjacent-layer seams are renderable and the next edit removes ghost boundaries', () => {
  const created = createBaseStratificationScheme(emptyStratificationWorkspace(), input, 0, 10, '边界一一对应', '2026-07-16T10:00:00.000Z', 'real-seams');
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  const split = applyStratificationCommand(created.workspace, { kind: 'split-layer', layerId: 'real-seams:layer:1', depthM: 5 }, '2026-07-16T10:00:01.000Z');
  expect(split.ok).toBe(true);
  if (!split.ok) return;
  const corrupted = structuredClone(split.workspace);
  const scheme = corrupted.editSession!.working;
  const [upper, lower] = scheme.layers;
  scheme.boundaries.push({
    boundaryId: 'ghost-boundary-inside-lower-layer',
    depthM: 7,
    upperLayerId: upper.layerId,
    lowerLayerId: lower.layerId,
    reviewRequired: false,
    note: '',
  });
  expect(scheme.layers).toHaveLength(2);
  expect(scheme.boundaries).toHaveLength(2);
  expect(getRenderableStratificationBoundaries(scheme)).toEqual([
    expect.objectContaining({ depthM: 5, upperLayerId: upper.layerId, lowerLayerId: lower.layerId }),
  ]);
  expect(getStratificationIssues(scheme)).toContainEqual(expect.objectContaining({ issueId: 'str-boundary-count', title: '边界数量与土层不一致' }));

  const repaired = applyStratificationCommand(corrupted, { kind: 'set-layer-guide-review', layerId: upper.layerId, reviewRequired: true }, '2026-07-16T10:00:02.000Z');
  expect(repaired.ok).toBe(true);
  if (!repaired.ok) return;
  const repairedScheme = getActiveStratificationScheme(repaired.workspace)!;
  expect(repairedScheme.boundaries).toHaveLength(repairedScheme.layers.length - 1);
  expect(repairedScheme.boundaries).toEqual([
    expect.objectContaining({ depthM: 5, upperLayerId: repairedScheme.layers[0].layerId, lowerLayerId: repairedScheme.layers[1].layerId }),
  ]);
  expect(getRenderableStratificationBoundaries(repairedScheme)).toHaveLength(1);

  const wrongDepth = structuredClone(repairedScheme);
  wrongDepth.boundaries[0].depthM = 7;
  expect(getRenderableStratificationBoundaries(wrongDepth)).toEqual([]);
  expect(getStratificationIssues(wrongDepth)).toContainEqual(expect.objectContaining({ title: '边界引用不一致' }));
});

function confirmAllLayers(workspace: ReturnType<typeof emptyStratificationWorkspace>) {
  let next = structuredClone(workspace);
  for (const layer of getActiveStratificationScheme(next)?.layers ?? []) {
    const confirmed = applyStratificationCommand(next, { kind: 'set-layer-soil-classification', layerId: layer.layerId, engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' });
    if (!confirmed.ok) throw new Error(confirmed.problem);
    next = confirmed.workspace;
  }
  return next;
}
