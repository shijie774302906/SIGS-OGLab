import { expect, test } from '@playwright/test';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import { migrateProjectCollectionV1ToV2, stableStringify } from '../../src/features/workspace/migrateV1ToV2';
import { PROJECT_MANIFEST_SCHEMA, PROJECT_MANIFEST_VERSION } from '../../src/features/workspace/workspaceV2';
import type { ProjectWorkspace } from '../../src/features/workflow/types';
import { createWorkspace } from './fixtures/projectWorkspace';

const savedAt = '2026-07-10T08:00:00.000Z';
const migratedAt = '2026-07-10T08:05:00.000Z';

test('V1 empty projects migrate without creating placeholder points or batches', async () => {
  const project = createWorkspace('project-empty', '空项目');
  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([project], project.projectId), {
    sourceSavedAt: savedAt,
    migratedAt,
  });

  expect(bundle.manifest).toMatchObject({
    schema: PROJECT_MANIFEST_SCHEMA,
    version: PROJECT_MANIFEST_VERSION,
    savedAt: migratedAt,
    state: { activeProjectId: project.projectId },
  });
  expect(bundle.manifest.state.projects[0]).toMatchObject({
    projectId: project.projectId,
    points: [],
    activePointId: null,
    importBatches: [],
    activeImportBatchId: null,
  });
  expect(bundle.dataBlocks).toEqual([]);
});

test('V1 ready data migrates deterministically into one point, batch, draft, and shared data blocks', async () => {
  const project = createReadyWorkspace('project-ready', '已导入项目', ['P-01', 'P-01']);
  const state = createProjectCollectionState([project], project.projectId);
  const first = await migrateProjectCollectionV1ToV2(state, { sourceSavedAt: savedAt, migratedAt });
  const second = await migrateProjectCollectionV1ToV2(state, { sourceSavedAt: savedAt, migratedAt });

  expect(second).toEqual(first);
  const migrated = first.manifest.state.projects[0];
  expect(migrated.points).toHaveLength(1);
  expect(migrated.activePointId).toBe(project.flowCase.point.pointId);
  expect(migrated.importBatches).toHaveLength(1);
  const batch = migrated.importBatches[0];
  expect(batch.kind).toBe('draft');
  if (batch.kind !== 'draft') return;
  expect(batch.workflowState).toBe('generated');
  expect(batch.revisions).toEqual({ source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 });
  expect(batch.pointPlan.detectedPoints).toEqual([{ pointKey: 'p-01', pointName: 'P-01', rowCount: 2 }]);
  expect(batch.unitDecisions.find((decision) => decision.targetField === 'qc')).toMatchObject({
    selectedUnit: 'kPa',
    state: 'confirmed',
    conversion: { scale: 1, offset: 0 },
  });
  expect(first.dataBlocks.map((block) => block.kind).sort()).toEqual(['normalized', 'raw']);
  expect(migrated.points[0].importDrafts[0].dataBlockId).toBe(batch.normalizedDataBlockId);
  expect(first.migrationRecord.targetManifestId).toBe(first.manifest.manifestId);
});

test('V1 checks migrate only when their draft version can be proven', async () => {
  const project = createReadyWorkspace('project-check', '检查项目', ['P-02', 'P-02']);
  project.checkedDraftVersion = project.importDraft.version;
  project.checkRunHistory = [
    {
      runId: 'CHECK-CURRENT',
      draftVersion: project.importDraft.version,
      createdAt: '2026-07-10T07:00:00.000Z',
      sourceFile: project.importDraft.fileName,
      pointName: project.importDraft.pointName,
      counts: { issue: 0, notice: 1, passed: 4 },
      conclusion: '无问题',
    },
    {
      runId: 'CHECK-OLD',
      draftVersion: project.importDraft.version - 1,
      createdAt: '2026-07-10T06:00:00.000Z',
      sourceFile: 'old.csv',
      pointName: project.importDraft.pointName,
      counts: { issue: 1, notice: 0, passed: 2 },
      conclusion: '存在问题',
    },
  ];

  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([project], project.projectId), {
    sourceSavedAt: savedAt,
    migratedAt,
  });
  const checkState = bundle.manifest.state.projects[0].points[0].checkState;

  expect(checkState.activeRunId).toBe('CHECK-CURRENT');
  expect(checkState.runs).toHaveLength(1);
  expect(checkState.runs[0].input.revisions).toEqual({ source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 });
  expect(checkState.legacyHistory).toHaveLength(1);
  expect(checkState.legacyHistory[0].runId).toBe('CHECK-OLD');
  expect(checkState.artifact.status).toBe('current');
});

test('ambiguous units and multi-point V1 drafts remain editable instead of creating false points', async () => {
  const ambiguous = createReadyWorkspace('project-unit', '单位待确认', ['U-01', 'U-01']);
  ambiguous.importDraft.headers = ['PointName', 'DepthM', 'Qc', 'FinalDepthM'];
  ambiguous.importDraft.rawPreview = [
    ['U-01', '0.1', '1.2', '20'],
    ['U-01', '0.2', '1.4', '20'],
  ];
  const multi = createReadyWorkspace('project-multi', '多点待拆分', ['M-01', 'M-02']);
  const state = createProjectCollectionState([ambiguous, multi], multi.projectId);

  const bundle = await migrateProjectCollectionV1ToV2(state, { sourceSavedAt: savedAt, migratedAt });
  const unitProject = bundle.manifest.state.projects[0];
  const multiProject = bundle.manifest.state.projects[1];
  const unitBatch = unitProject.importBatches[0];
  const multiBatch = multiProject.importBatches[0];

  expect(unitProject.points).toEqual([]);
  expect(unitBatch.kind).toBe('draft');
  if (unitBatch.kind === 'draft') {
    expect(unitBatch.workflowState).toBe('editing');
    expect(unitBatch.unitDecisions.find((decision) => decision.targetField === 'qc')?.state).toBe('needs-confirmation');
  }
  expect(multiProject.points).toEqual([]);
  expect(multiBatch.kind).toBe('draft');
  if (multiBatch.kind === 'draft') {
    expect(multiBatch.pointPlan).toMatchObject({ strategy: 'pending', state: 'needs-decision' });
    expect(multiBatch.pointPlan.detectedPoints.map((point) => point.rowCount)).toEqual([1, 1]);
  }
});

test('stable stringify makes object key order irrelevant for migration fingerprints', () => {
  expect(stableStringify({ b: 2, a: { d: 4, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 4 }, b: 2 }));
});

test('entity IDs stay unique across projects and repeated imports with identical content', async () => {
  const projectA = createReadyWorkspace('collision-a', '碰撞项目 A', ['SAME', 'SAME']);
  const projectB = createReadyWorkspace('collision-b', '碰撞项目 B', ['SAME', 'SAME']);
  projectA.importDraft.fileName = 'same.csv';
  projectB.importDraft.fileName = 'same.csv';
  const combined = await migrateProjectCollectionV1ToV2(
    createProjectCollectionState([projectA, projectB], projectA.projectId),
    { sourceSavedAt: savedAt, migratedAt },
  );
  expect(new Set(combined.dataBlocks.map((block) => block.dataBlockId)).size).toBe(combined.dataBlocks.length);
  const batchIds = combined.manifest.state.projects.flatMap((project) => project.importBatches.map((batch) => batch.batchId));
  expect(new Set(batchIds).size).toBe(batchIds.length);

  const repeated = structuredClone(projectA);
  repeated.importDraft.version += 1;
  const first = await migrateProjectCollectionV1ToV2(createProjectCollectionState([projectA], projectA.projectId), {
    sourceSavedAt: savedAt,
    migratedAt,
  });
  const second = await migrateProjectCollectionV1ToV2(createProjectCollectionState([repeated], repeated.projectId), {
    sourceSavedAt: savedAt,
    migratedAt,
  });
  expect(second.manifest.state.projects[0].importBatches[0].batchId).not.toBe(
    first.manifest.state.projects[0].importBatches[0].batchId,
  );
});

function createReadyWorkspace(projectId: string, projectName: string, pointNames: string[]): ProjectWorkspace {
  const project = createWorkspace(projectId, projectName);
  const pointName = pointNames[0];
  const rows = pointNames.map((name, index) => ({
    pointName: name,
    depthM: (index + 1) / 10,
    qcKpa: 1200 + index * 100,
    qtKpa: 1250 + index * 100,
    fsKpa: 12 + index,
    u2Kpa: 30 + index,
    frPercent: 1 + index / 10,
    waterDepthM: 18,
    finalDepthM: 20,
  }));
  const headers = ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'];
  project.flowCase.point = {
    pointId: `${projectId}-point-id`,
    pointName,
    pointAlias: `${pointName}-alias`,
    waterDepthM: 18,
    finalDepthM: 20,
  };
  project.flowCase.rows = rows;
  project.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName: `${projectId}.csv`,
    fileType: 'CSV',
    status: 'ready',
    message: 'CSV 已解析。',
    version: 7,
    headers,
    rawPreview: rows.map((row) => [
      row.pointName,
      String(row.depthM),
      String(row.qcKpa),
      String(row.qtKpa),
      String(row.fsKpa),
      String(row.u2Kpa),
      String(row.frPercent),
      String(row.waterDepthM),
      String(row.finalDepthM),
    ]),
    rows,
    problems: [],
    pointName,
    filePointNames: Array.from(new Set(pointNames)),
    pointDecision: pointNames.length > 1 ? 'pending' : 'matches-current',
    waterDepthM: 18,
    finalDepthM: 20,
    generatedAt: '2026-07-10T07:30:00.000Z',
  };
  project.selection.selectedPointId = pointName;
  return project;
}
