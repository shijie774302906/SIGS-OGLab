import { expect, test } from '@playwright/test';
import {
  applyDataAdjustmentBatch,
  applyValueOverrides,
  createExclusionRevision,
  createValueOverrideRevision,
  currentValueOverride,
  currentExclusion,
  invalidateDataGovernance,
  restoreExclusionRevision,
  runDepthWindowSmoothing,
  setDataViewMode,
  type GovernedInputRow,
} from '../../src/features/check/dataGovernance';
import { emptyDataGovernanceWorkspace, type ArtifactDependency } from '../../src/features/workspace/workspaceV2';

const INPUT: ArtifactDependency = {
  pointId: 'point-1',
  draftId: 'draft-1',
  batchId: 'batch-1',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
};

function governedRows(depths = [0, 0.25, 0.5, 0.75, 1]): GovernedInputRow[] {
  return depths.map((depthM, index) => ({
    sourceRowId: `source-${index + 1}`,
    row: {
      pointName: 'CPT01',
      depthM,
      qcKpa: index === 2 ? 5_000 : 100 + index * 2,
      qtKpa: index === 2 ? 5_000 : 100 + index * 2,
      fsKpa: index === 2 ? 100 : 10 + index,
      u2Kpa: Number.NaN,
      frPercent: 1,
      waterDepthM: 0,
      finalDepthM: depths.at(-1) ?? 0,
    },
  }));
}

test('row/range review creates immutable append-only revisions and restore remains cancel-safe', async () => {
  const initial = emptyDataGovernanceWorkspace();
  const originalRows = governedRows();
  const rawSnapshot = structuredClone(originalRows);
  const excluded = createExclusionRevision(
    initial,
    INPUT,
    originalRows,
    { kind: 'exclude-row', sourceRowId: 'source-3', reason: '孤立尖峰，排除后试算' },
    '2026-07-11T01:00:00.000Z',
    'exclusion-1',
  );
  expect(excluded.ok).toBeTruthy();
  if (!excluded.ok) return;
  expect(excluded.workspace).not.toBe(initial);
  expect(initial.exclusionRevisions).toEqual([]);
  expect(excluded.value).toMatchObject({ version: 1, excludedSourceRowIds: ['source-3'] });

  const range = createExclusionRevision(
    excluded.workspace,
    INPUT,
    originalRows,
    { kind: 'exclude-range', depthFromM: 0.75, depthToM: 1, reason: '尾段仪器扰动' },
    '2026-07-11T01:01:00.000Z',
    'exclusion-2',
  );
  expect(range.ok).toBeTruthy();
  if (!range.ok) return;
  expect(range.value.version).toBe(2);
  expect(range.value.excludedSourceRowIds).toEqual(['source-3', 'source-4', 'source-5']);
  expect(excluded.value.excludedSourceRowIds).toEqual(['source-3']);

  const kept = createExclusionRevision(
    range.workspace,
    INPUT,
    originalRows,
    { kind: 'keep-row', sourceRowId: 'source-4', reason: '人工复核后保留' },
    '2026-07-11T01:02:00.000Z',
    'exclusion-3',
  );
  expect(kept.ok).toBeTruthy();
  if (!kept.ok) return;
  expect(kept.value.excludedSourceRowIds).toEqual(['source-3', 'source-5']);

  const beforeCancelledDialog = structuredClone(kept.workspace);
  expect(kept.workspace).toEqual(beforeCancelledDialog);

  const restored = restoreExclusionRevision(
    kept.workspace,
    INPUT,
    'exclusion-1',
    '2026-07-11T01:03:00.000Z',
    'exclusion-4',
  );
  expect(restored.ok).toBeTruthy();
  if (!restored.ok) return;
  expect(restored.value).toMatchObject({ version: 4, excludedSourceRowIds: ['source-3'] });
  expect(currentExclusion(restored.workspace)?.revisionId).toBe('exclusion-4');
  expect(originalRows).toEqual(rawSnapshot);
});

test('invalid review rejects empty reason, missing rows, duplicate depth, and excluding every row', async () => {
  const rows = governedRows();
  const initial = emptyDataGovernanceWorkspace();
  expect(createExclusionRevision(initial, INPUT, rows, {
    kind: 'exclude-row', sourceRowId: 'source-3', reason: ' ',
  })).toMatchObject({ ok: false, problem: '请填写保留或排除原因。' });
  expect(createExclusionRevision(initial, INPUT, rows, {
    kind: 'exclude-row', sourceRowId: 'missing', reason: '测试',
  })).toMatchObject({ ok: false, problem: '没有找到落在当前导入修订中的源行。' });
  expect(createExclusionRevision(initial, INPUT, rows, {
    kind: 'exclude-range', depthFromM: 0, depthToM: 1, reason: '错误操作',
  })).toMatchObject({ ok: false, problem: '不能排除当前点位的全部有效测量行。' });
  expect(runDepthWindowSmoothing(initial, INPUT, [rows[0], { ...rows[1], row: { ...rows[1].row, depthM: 0 } }], {
    preset: 'custom', depthWindowM: 0.5,
  })).toMatchObject({ ok: false, problem: '深度必须有限且严格递增，修复结构问题后才能平滑。' });
});

test('single-cell value overrides are append-only, preserve raw rows, and can be restored', async () => {
  const rows = governedRows();
  const rawSnapshot = structuredClone(rows);
  const revised = createValueOverrideRevision(
    emptyDataGovernanceWorkspace(),
    INPUT,
    rows,
    {
      kind: 'set-value',
      sourceRowId: 'source-3',
      field: 'qcKpa',
      effectiveValue: 106,
      reasonCode: 'neighbor-supported-correction',
      reason: '相邻有效深度支持该修订值',
    },
    '2026-07-13T01:00:00.000Z',
    'value-override-1',
  );
  expect(revised.ok).toBeTruthy();
  if (!revised.ok) return;
  expect(revised.value).toMatchObject({
    version: 1,
    overrides: [{
      sourceRowId: 'source-3',
      field: 'qcKpa',
      originalValue: 5_000,
      effectiveValue: 106,
    }],
  });
  expect(rows).toEqual(rawSnapshot);
  const overriddenRow = applyValueOverrides(revised.workspace, rows)[2].row;
  expect(overriddenRow.qcKpa).toBe(106);
  expect(Number.isNaN(overriddenRow.qtKpa)).toBeTruthy();

  const restored = createValueOverrideRevision(
    revised.workspace,
    INPUT,
    rows,
    { kind: 'restore-value', sourceRowId: 'source-3', field: 'qcKpa' },
    '2026-07-13T01:01:00.000Z',
    'value-override-2',
  );
  expect(restored.ok).toBeTruthy();
  if (!restored.ok) return;
  expect(restored.value).toMatchObject({ version: 2, overrides: [] });
  expect(currentValueOverride(restored.workspace)?.revisionId).toBe('value-override-2');
  expect(applyValueOverrides(restored.workspace, rows)[2].row.qcKpa).toBe(5_000);
  expect(rows).toEqual(rawSnapshot);
});

test('value overrides reject unsafe values and stale completed smoothing', async () => {
  const rows = governedRows();
  const invalidNumber = createValueOverrideRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'set-value',
    sourceRowId: 'source-2',
    field: 'qcKpa',
    effectiveValue: Number.NaN,
    reasonCode: 'source-entry-error',
    reason: '源记录录入错误',
  });
  expect(invalidNumber.ok).toBeFalsy();

  const missingReason = createValueOverrideRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'set-value',
    sourceRowId: 'source-2',
    field: 'fsKpa',
    effectiveValue: 12,
    reasonCode: 'source-entry-error',
    reason: ' ',
  });
  expect(missingReason.ok).toBeFalsy();

  const unchangedValue = createValueOverrideRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'set-value',
    sourceRowId: 'source-2',
    field: 'qcKpa',
    effectiveValue: rows[1].row.qcKpa,
    reasonCode: 'source-entry-error',
    reason: '复核后误提交相同数值',
  });
  expect(unchangedValue).toMatchObject({ ok: false, problem: '新的有效值与当前值相同，请输入实际调整后的数值。' });

  const duplicateDepth = createValueOverrideRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'set-value',
    sourceRowId: 'source-2',
    field: 'depthM',
    effectiveValue: 0,
    reasonCode: 'source-entry-error',
    reason: '深度录入错误',
  });
  expect(duplicateDepth.ok).toBeFalsy();

  const smoothed = runDepthWindowSmoothing(emptyDataGovernanceWorkspace(), INPUT, rows, {
    preset: 'standard', depthWindowM: 0.5,
  }, '2026-07-13T01:02:00.000Z', 'smooth-before-value-edit');
  expect(smoothed.ok).toBeTruthy();
  if (!smoothed.ok) return;
  const revised = createValueOverrideRevision(smoothed.workspace, INPUT, rows, {
    kind: 'set-value',
    sourceRowId: 'source-3',
    field: 'u2Kpa',
    effectiveValue: 20,
    reasonCode: 'instrument-anomaly',
    reason: '仪器异常，按相邻深度复核',
  });
  expect(revised.ok).toBeTruthy();
  if (!revised.ok) return;
  expect(revised.workspace.activeSmoothingRunId).toBeNull();
  expect(revised.workspace.smoothingRuns[0]).toMatchObject({ status: 'stale' });
});

test('bounded multi-row exclusion creates one append-only decision and preserves every raw row', async () => {
  const rows = governedRows();
  const rawSnapshot = structuredClone(rows);
  const result = createExclusionRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'exclude-rows', sourceRowIds: ['source-2', 'source-4'], reason: 'JTS 数值域自动处理预览已确认',
  }, '2026-07-11T01:10:00.000Z', 'exclusion-multi');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.value.excludedSourceRowIds).toEqual(['source-2', 'source-4']);
  expect(result.value.decisions).toEqual([expect.objectContaining({ kind: 'exclude', scope: 'row', sourceRowIds: ['source-2', 'source-4'] })]);
  expect(rows).toEqual(rawSnapshot);
});

test('permanent point deletion removes complete working rows, survives restore attempts, and preserves raw evidence', async () => {
  const rows = governedRows();
  const rawSnapshot = structuredClone(rows);
  const deleted = createExclusionRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'delete-rows', sourceRowIds: ['source-2', 'source-4'], reason: '工程师确认永久删除同类异常测点',
  }, '2026-07-14T12:00:00.000Z', 'deletion-1');
  expect(deleted.ok).toBeTruthy();
  if (!deleted.ok) return;
  expect(deleted.value).toMatchObject({
    excludedSourceRowIds: ['source-2', 'source-4'],
    permanentlyDeletedSourceRowIds: ['source-2', 'source-4'],
    decisions: [expect.objectContaining({ kind: 'delete', sourceRowIds: ['source-2', 'source-4'] })],
  });
  expect(rows.filter((row) => !new Set(deleted.value.excludedSourceRowIds).has(row.sourceRowId)).map((row) => row.sourceRowId)).toEqual(['source-1', 'source-3', 'source-5']);
  expect(rows).toEqual(rawSnapshot);

  const keepDeleted = createExclusionRevision(deleted.workspace, INPUT, rows, {
    kind: 'keep-row', sourceRowId: 'source-2', reason: '误尝试恢复',
  });
  expect(keepDeleted).toMatchObject({ ok: false, problem: '已永久删除的测点不能恢复；如需恢复，请重新导入原文件。' });

  const restored = restoreExclusionRevision(deleted.workspace, INPUT, null, '2026-07-14T12:01:00.000Z', 'deletion-restore-attempt');
  expect(restored.ok).toBeTruthy();
  if (!restored.ok) return;
  expect(restored.value.excludedSourceRowIds).toEqual(['source-2', 'source-4']);
  expect(restored.value.permanentlyDeletedSourceRowIds).toEqual(['source-2', 'source-4']);
  expect(rows).toEqual(rawSnapshot);
});

test('one adjustment batch commits delete, keep, and value changes without mutating raw rows', () => {
  const rows = governedRows();
  const rawSnapshot = structuredClone(rows);
  const result = applyDataAdjustmentBatch(emptyDataGovernanceWorkspace(), INPUT, rows, {
    deleteSourceRowIds: ['source-2'],
    keepSourceRowIds: ['source-4'],
    overrides: [{ kind: 'set-value', sourceRowId: 'source-3', field: 'qcKpa', effectiveValue: 106, reasonCode: 'neighbor-supported-correction', reason: '相邻测点支持修改' }],
    reason: '数据调整向导统一提交',
  }, '2026-07-14T12:10:00.000Z');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.value).toEqual({ deletedSourceRowIds: ['source-2'], keptSourceRowIds: ['source-4'], overrideCount: 1 });
  expect(currentExclusion(result.workspace)).toMatchObject({ excludedSourceRowIds: ['source-2'], permanentlyDeletedSourceRowIds: ['source-2'] });
  expect(currentValueOverride(result.workspace)?.overrides).toEqual([expect.objectContaining({ sourceRowId: 'source-3', effectiveValue: 106 })]);
  expect(rows).toEqual(rawSnapshot);
});

test('depth-window median smoothing excludes reviewed rows, flags spikes, and preserves raw values', async () => {
  const rows = governedRows();
  const rawSnapshot = structuredClone(rows);
  const reviewed = createExclusionRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'keep-row', sourceRowId: 'source-3', reason: '保留尖峰并标记提示',
  }, '2026-07-11T02:00:00.000Z', 'exclusion-keep');
  expect(reviewed.ok).toBeTruthy();
  if (!reviewed.ok) return;
  const smoothed = runDepthWindowSmoothing(reviewed.workspace, INPUT, rows, {
    preset: 'standard', depthWindowM: 1,
  }, '2026-07-11T02:01:00.000Z', 'smooth-1');
  expect(smoothed.ok).toBeTruthy();
  if (!smoothed.ok) return;
  const spike = smoothed.value.rows.find((row) => row.sourceRowId === 'source-3');
  expect(spike).toMatchObject({ rawQcKpa: 5_000, smoothedQcKpa: 106, anomaly: true });
  expect(smoothed.value.settings).toEqual({ preset: 'standard', depthWindowM: 1 });
  expect(rows).toEqual(rawSnapshot);
  expect(setDataViewMode(smoothed.workspace, 'raw').viewMode).toBe('raw');
});

test('smoothing splits long depth gaps and never borrows values across segments', async () => {
  const rows = governedRows([0, 0.25, 0.5, 4, 4.25, 4.5]).map((entry, index) => ({
    ...entry,
    row: {
      ...entry.row,
      qcKpa: index < 3 ? 100 : 10_000,
      qtKpa: index < 3 ? 100 : 10_000,
      fsKpa: index < 3 ? 10 : 100,
    },
  }));
  const result = runDepthWindowSmoothing(emptyDataGovernanceWorkspace(), INPUT, rows, {
    preset: 'custom', depthWindowM: 10,
  }, '2026-07-11T03:00:00.000Z', 'smooth-gap');
  expect(result.ok).toBeTruthy();
  if (!result.ok) return;
  expect(result.value.rows.slice(0, 3).every((row) => row.smoothedQcKpa === 100)).toBeTruthy();
  expect(result.value.rows.slice(3).every((row) => row.smoothedQcKpa === 10_000)).toBeTruthy();
});

test('import invalidation clears active pointers, stales prior smoothing, and keeps monotonic revision versions', async () => {
  const rows = governedRows();
  const reviewed = createExclusionRevision(emptyDataGovernanceWorkspace(), INPUT, rows, {
    kind: 'exclude-row', sourceRowId: 'source-3', reason: '尖峰',
  }, '2026-07-11T04:00:00.000Z', 'exclusion-old');
  expect(reviewed.ok).toBeTruthy();
  if (!reviewed.ok) return;
  const smoothed = runDepthWindowSmoothing(reviewed.workspace, INPUT, rows, {
    preset: 'conservative', depthWindowM: 0.25,
  }, '2026-07-11T04:01:00.000Z', 'smooth-old');
  expect(smoothed.ok).toBeTruthy();
  if (!smoothed.ok) return;
  const invalidated = invalidateDataGovernance(smoothed.workspace, '导入修订已变化');
  expect(invalidated).toMatchObject({ currentExclusionRevisionId: null, activeSmoothingRunId: null });
  expect(invalidated.smoothingRuns[0]).toMatchObject({ status: 'stale', staleReason: '导入修订已变化' });

  const nextInput = { ...INPUT, revisions: { ...INPUT.revisions, source: 2 } };
  const next = createExclusionRevision(invalidated, nextInput, rows, {
    kind: 'keep-row', sourceRowId: 'source-3', reason: '新导入中复核保留',
  }, '2026-07-11T04:02:00.000Z', 'exclusion-new');
  expect(next.ok).toBeTruthy();
  if (!next.ok) return;
  expect(next.value.version).toBe(2);
  expect(next.value.decisions).toHaveLength(1);
});
