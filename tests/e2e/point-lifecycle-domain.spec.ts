import { expect, test } from '@playwright/test';
import {
  BUILTIN_JTS_PROBE_PROFILE_ID,
  confirmPointProbe,
  createInitialProbeProfiles,
  createNameOnlyPoint,
  deletePoint,
  duplicatePoint,
  ensurePointLifecycleProject,
  renamePoint,
  restorePoint,
  selectPoint,
  updatePointWaterContext,
  withoutReservedPointAliases,
} from '../../src/features/workspace/pointLifecycle';
import type { ArtifactDependency, ProjectWorkspaceV2 } from '../../src/features/workspace/workspaceV2';

const NOW = '2026-07-11T00:00:00.000Z';
const LATER = '2026-07-11T01:00:00.000Z';

function emptyProject(): ProjectWorkspaceV2 {
  return {
    projectId: 'project-stage1',
    projectName: 'Stage 1 项目',
    mode: 'user',
    workspaceRevision: 1,
    points: [],
    activePointId: null,
    probeProfiles: createInitialProbeProfiles(NOW),
    deletedPoints: [],
    importBatches: [],
    activeImportBatchId: null,
    activeRoute: 'project',
    activeBottomTab: 'issues',
    flowFeedback: '',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

test('name-only point lifecycle covers create, select, rename, duplicate, delete, cancel-safe purity, and restore', async () => {
  const initial = emptyProject();
  const createdA = createNameOnlyPoint(initial, ' CPT09 ', NOW, 'point-a');
  expect(createdA.ok).toBeTruthy();
  if (!createdA.ok) return;
  expect(initial.points).toEqual([]);
  expect(createdA.point).toMatchObject({ pointId: 'point-a', pointName: 'CPT09', importDrafts: [], activeImportDraftId: null });
  expect(createdA.point.probeContext).toMatchObject({ activeProfileId: null, confirmedAt: null });
  expect(createdA.point.waterContext).toMatchObject({ channelState: 'unknown', waterDepthM: null, testZeroDatum: 'mudline' });

  const duplicateName = createNameOnlyPoint(createdA.project, 'cpt09', NOW, 'point-conflict');
  expect(duplicateName).toMatchObject({ ok: false, field: 'point-name' });
  expect(createNameOnlyPoint(createdA.project, '   ', NOW, 'point-empty')).toMatchObject({ ok: false, field: 'point-name' });
  expect(createNameOnlyPoint(createdA.project, '待导入点位', NOW, 'point-placeholder')).toMatchObject({ ok: false, field: 'point-name' });
  expect(createNameOnlyPoint(createdA.project, 'pending-point', NOW, 'point-placeholder-en')).toMatchObject({ ok: false, field: 'point-name' });
  expect(withoutReservedPointAliases(['待导入点位', 'CPT09-LEGACY', 'pending-point'])).toEqual(['CPT09-LEGACY']);

  const createdB = createNameOnlyPoint(createdA.project, 'CPT19', NOW, 'point-b');
  expect(createdB.ok).toBeTruthy();
  if (!createdB.ok) return;
  const selected = selectPoint(createdB.project, 'point-a', LATER);
  expect(selected.ok && selected.project.activePointId).toBe('point-a');
  expect(selectPoint(createdB.project, 'missing')).toMatchObject({ ok: false });

  const renamed = renamePoint(selected.ok ? selected.project : createdB.project, 'point-a', 'CPT09-R1', LATER);
  expect(renamed.ok && renamed.point).toMatchObject({ pointName: 'CPT09-R1', aliases: ['CPT09'] });
  expect(renamePoint(renamed.ok ? renamed.project : createdB.project, 'point-a', 'CPT19')).toMatchObject({ ok: false, field: 'point-name' });
  expect(renamePoint(renamed.ok ? renamed.project : createdB.project, 'point-a', '待导入点位')).toMatchObject({ ok: false, field: 'point-name' });

  const placeholderProject = structuredClone(createdA.project);
  placeholderProject.points[0].pointName = '待导入点位';
  placeholderProject.points[0].aliases = ['pending-point', 'CPT09-LEGACY'];
  const recoveredPlaceholder = renamePoint(placeholderProject, 'point-a', 'CPT09-RECOVERED', LATER);
  expect(recoveredPlaceholder.ok && recoveredPlaceholder.point).toMatchObject({
    pointName: 'CPT09-RECOVERED',
    aliases: ['CPT09-LEGACY'],
  });

  const duplicated = duplicatePoint(renamed.ok ? renamed.project : createdB.project, 'point-a', 'CPT09-COPY', LATER, 'point-copy');
  expect(duplicated.ok).toBeTruthy();
  if (!duplicated.ok) return;
  expect(duplicated.point).toMatchObject({ pointId: 'point-copy', pointName: 'CPT09-COPY', importDrafts: [], activeImportDraftId: null });
  expect(duplicated.notice).toContain('源文件、检查、分层、参数和输出不会复制');
  expect(duplicated.project.points.find((point) => point.pointId === 'point-a')?.pointName).toBe('CPT09-R1');

  const beforeCancel = structuredClone(duplicated.project);
  expect(duplicated.project).toEqual(beforeCancel);

  const deleted = deletePoint(duplicated.project, 'point-a', LATER, 'delete-a');
  expect(deleted.ok).toBeTruthy();
  if (!deleted.ok) return;
  expect(deleted.project.points.some((point) => point.pointId === 'point-a')).toBeFalsy();
  expect(deleted.project.deletedPoints).toHaveLength(1);
  expect(deleted.project.deletedPoints?.[0].snapshot.pointName).toBe('CPT09-R1');
  deleted.project.deletedPoints![0].snapshot.aliases = ['CPT09', '待导入点位', 'pending-point'];

  const restored = restorePoint(deleted.project, 'delete-a', LATER);
  expect(restored.ok).toBeTruthy();
  if (!restored.ok) return;
  expect(restored.project.points.map((point) => point.pointId)).toEqual(['point-a', 'point-b', 'point-copy']);
  expect(restored.project.activePointId).toBe('point-a');
  expect(restored.project.deletedPoints).toEqual([]);
  expect(restored.point.aliases).toEqual(['CPT09']);
});

test('probe and water context require explicit confirmation and invalidate exact downstream states', async () => {
  const created = createNameOnlyPoint(emptyProject(), 'SCPT1', NOW, 'point-scpt1');
  expect(created.ok).toBeTruthy();
  if (!created.ok) return;
  const dependency: ArtifactDependency = {
    pointId: 'point-scpt1',
    draftId: 'draft-1',
    batchId: 'batch-1',
    revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
  };
  const projectWithCurrent = structuredClone(created.project);
  const currentPoint = projectWithCurrent.points[0];
  currentPoint.derivationState = {
    status: 'current',
    input: {
      import: dependency,
      probeContextRevisionId: currentPoint.probeContext!.revisionId,
      probeProfileRevisionId: 'old-probe-revision',
      waterContextRevisionId: currentPoint.waterContext!.revisionId,
    },
  };
  currentPoint.stratificationState = { status: 'current', input: dependency };
  currentPoint.parameterState = { status: 'current', input: dependency };
  currentPoint.outputState = { status: 'current', input: dependency };
  currentPoint.outputWorkspace = {
    revisions: [
      {
        revisionId: 'output-current',
        kind: 'excel-workbook',
        fileName: 'current.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        status: 'current',
        snapshot: {} as never,
        inputHash: 'current-input',
        createdAt: NOW,
      },
      {
        revisionId: 'output-history',
        kind: 'a4-report-pdf',
        fileName: 'history.pdf',
        mimeType: 'application/pdf',
        status: 'stale',
        staleReason: 'older source',
        snapshot: {} as never,
        inputHash: 'history-input',
        createdAt: NOW,
      },
    ],
    activeRevisionIds: { 'excel-workbook': 'output-current' },
  };
  currentPoint.checkState.artifact = { status: 'current', input: dependency, sourceCheckRunId: 'check-run-1' };
  const unaffectedPoint = structuredClone(currentPoint);
  unaffectedPoint.pointId = 'point-unaffected';
  unaffectedPoint.pointName = 'CPT-UNAFFECTED';
  projectWithCurrent.points.push(unaffectedPoint);
  const unaffectedReference = projectWithCurrent.points[1];

  const confirmedProbe = confirmPointProbe(projectWithCurrent, 'point-scpt1', BUILTIN_JTS_PROBE_PROFILE_ID, LATER);
  expect(confirmedProbe.ok).toBeTruthy();
  if (!confirmedProbe.ok) return;
  expect(confirmedProbe.point.probeContext).toMatchObject({
    activeProfileId: BUILTIN_JTS_PROBE_PROFILE_ID,
    activeProfileRevisionId: 'probe-profile-jts-t242-standard-rev-1',
    revision: 2,
    confirmedAt: LATER,
  });
  expect(confirmedProbe.point.derivationState).toMatchObject({ status: 'stale', recoveryTarget: { field: 'probe' } });
  expect(confirmedProbe.point.checkState.artifact).toMatchObject({ status: 'stale', recoveryTarget: { route: 'check', reasonCode: 'POINT-CONTEXT-CHANGED' } });
  expect(confirmedProbe.point.stratificationState.status).toBe('stale');
  expect(confirmedProbe.point.parameterState.status).toBe('stale');
  expect(confirmedProbe.point.outputState.status).toBe('stale');
  expect(confirmedProbe.point.outputWorkspace?.activeRevisionIds).toEqual({});
  expect(confirmedProbe.point.outputWorkspace?.revisions).toMatchObject([
    { revisionId: 'output-current', status: 'stale' },
    { revisionId: 'output-history', status: 'stale', staleReason: 'older source' },
  ]);
  expect(confirmedProbe.project.points[1]).toBe(unaffectedReference);
  expect(confirmedProbe.project.points[1].outputWorkspace?.activeRevisionIds).toEqual({ 'excel-workbook': 'output-current' });
  expect(confirmPointProbe(confirmedProbe.project, 'point-scpt1', BUILTIN_JTS_PROBE_PROFILE_ID, LATER)).toMatchObject({ ok: true, notice: '当前探头已经确认。' });

  expect(updatePointWaterContext(confirmedProbe.project, 'point-scpt1', {
    channelState: 'partial',
    waterDepthM: 10,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
  })).toMatchObject({ ok: false });
  expect(updatePointWaterContext(confirmedProbe.project, 'point-scpt1', {
    channelState: 'present',
    waterDepthM: null,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
  })).toMatchObject({ ok: false, field: 'water-depth' });
  expect(updatePointWaterContext(confirmedProbe.project, 'point-scpt1', {
    channelState: 'present',
    waterDepthM: 10,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'borehole_bottom',
    boreholeBottomDepthM: 2,
    waterUnitWeightKnM3: 10,
  })).toMatchObject({ ok: false, field: 'test-zero' });

  const confirmedWater = updatePointWaterContext(confirmedProbe.project, 'point-scpt1', {
    channelState: 'present',
    waterDepthM: 10,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
  }, LATER);
  expect(confirmedWater.ok).toBeTruthy();
  if (!confirmedWater.ok) return;
  expect(confirmedWater.point.waterContext).toMatchObject({ channelState: 'present', waterDepthM: 10, revision: 2, confirmedAt: LATER });
  expect(confirmedWater.point.derivationState).toMatchObject({ status: 'stale', recoveryTarget: { field: 'water-depth' } });
  expect(confirmedWater.point.checkState.artifact).toMatchObject({ status: 'stale', recoveryTarget: { route: 'check', reasonCode: 'POINT-CONTEXT-CHANGED' } });

  const noU2 = updatePointWaterContext(confirmedWater.project, 'point-scpt1', {
    channelState: 'absent',
    waterDepthM: null,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
  }, LATER);
  expect(noU2.ok).toBeTruthy();
  if (!noU2.ok) return;
  expect(noU2.point.waterContext).toMatchObject({ channelState: 'absent', waterDepthM: null });
  expect(noU2.project.flowFeedback).toContain('CPT 近似路线');
});

test('ensure lifecycle state adds the reusable JTS probe without mutating the source project', async () => {
  const source = { ...emptyProject(), probeProfiles: undefined, deletedPoints: undefined };
  const ensured = ensurePointLifecycleProject(source, NOW);
  expect(source.probeProfiles).toBeUndefined();
  expect(ensured.probeProfiles).toEqual(createInitialProbeProfiles(NOW));
  expect(ensured.deletedPoints).toEqual([]);
});

test('current lifecycle state preserves unchanged project, batch, and point collection references', async () => {
  const created = createNameOnlyPoint(emptyProject(), 'CPT09', NOW, 'point-cpt09');
  expect(created.ok).toBeTruthy();
  if (!created.ok) return;
  const current = created.project;
  const batches = current.importBatches;
  const drafts = current.points[0].importDrafts;

  expect(ensurePointLifecycleProject(current, LATER)).toBe(current);

  const confirmed = updatePointWaterContext(current, 'point-cpt09', {
    channelState: 'absent',
    waterDepthM: null,
    u2HydrostaticDatum: 'total',
    testZeroDatum: 'mudline',
    boreholeBottomDepthM: null,
    waterUnitWeightKnM3: 10,
  }, LATER);
  expect(confirmed.ok).toBeTruthy();
  if (!confirmed.ok) return;
  expect(confirmed.project.importBatches).toBe(batches);
  expect(confirmed.point.importDrafts).toBe(drafts);
});
