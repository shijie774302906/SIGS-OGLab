import { expect, test } from './fixtures/isolatedTest';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import { migrateProjectCollectionV1ToV2 } from '../../src/features/workspace/migrateV1ToV2';
import type { ImportDataBlockV2, ProjectWorkspaceV2 } from '../../src/features/workspace/workspaceV2';
import { createWorkspace } from './fixtures/projectWorkspace';

test('V2 adapter preserves the empty-project view without inventing a point', async ({ page }) => {
  const legacy = createWorkspace('adapter-empty', '适配空项目');
  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([legacy], legacy.projectId), {
    sourceSavedAt: '2026-07-10T11:00:00.000Z',
    migratedAt: '2026-07-10T11:05:00.000Z',
  });
  await page.goto('/?adapter-test=empty');
  const projected = await projectInBrowser(page, bundle.manifest.state.projects[0], bundle.dataBlocks);

  expect(projected.importDraft.sourceMode).toBe('project-empty');
  expect(projected.importDraft.rows).toEqual([]);
  expect(projected.selection.selectedPointId).toBe('');
  expect(projected.flowCase.point.pointName).toBe('待导入点位');
});

test('V2 adapter reconstructs the active point, batch, rows, and current check view', async ({ page }) => {
  const legacy = createWorkspace('adapter-ready', '适配数据项目');
  const row = {
    pointName: 'ADP-01',
    depthM: 0.1,
    qcKpa: 1800,
    qtKpa: 1850,
    fsKpa: 18,
    u2Kpa: 40,
    frPercent: 1,
    waterDepthM: 20,
    finalDepthM: 25,
  };
  legacy.flowCase.point = {
    pointId: 'point-adp-01',
    pointName: row.pointName,
    pointAlias: 'ADP-A',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
  };
  legacy.flowCase.rows = [row];
  legacy.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName: 'adapter.csv',
    fileType: 'CSV',
    status: 'ready',
    message: 'ready',
    version: 4,
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
    rawPreview: [['ADP-01', '0.1', '1800', '1850', '18', '40', '1', '20', '25']],
    rows: [row],
    problems: [],
    pointName: row.pointName,
    filePointNames: [row.pointName],
    pointDecision: 'matches-current',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
    generatedAt: '2026-07-10T11:00:00.000Z',
  };
  legacy.checkedDraftVersion = 4;
  legacy.checkRunHistory = [
    {
      runId: 'CHECK-ADAPTER',
      draftVersion: 4,
      createdAt: '2026-07-10T11:02:00.000Z',
      sourceFile: 'adapter.csv',
      pointName: row.pointName,
      counts: { issue: 0, notice: 1, passed: 4 },
      conclusion: '无问题',
    },
  ];
  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([legacy], legacy.projectId), {
    sourceSavedAt: '2026-07-10T11:00:00.000Z',
    migratedAt: '2026-07-10T11:05:00.000Z',
  });
  await page.goto('/?adapter-test=ready');
  const projected = await projectInBrowser(page, bundle.manifest.state.projects[0], bundle.dataBlocks);

  expect(projected.selection.selectedPointId).toBe('point-adp-01');
  expect(projected.importDraft.fileName).toBe('adapter.csv');
  expect(projected.importDraft.rows).toEqual([row]);
  expect(projected.checkedDraftVersion).toBe(1);
  expect(projected.checkRunHistory[0]).toMatchObject({ runId: 'CHECK-ADAPTER', draftVersion: 1, conclusion: '无问题' });
});

async function projectInBrowser(
  page: import('@playwright/test').Page,
  project: ProjectWorkspaceV2,
  dataBlocks: ImportDataBlockV2[],
) {
  return page.evaluate(
    async ({ projectValue, blockValues }) => {
      const adapter = await import('/src/features/workspace/legacyWorkspaceAdapter.ts');
      return adapter.projectV2ToLegacyView(projectValue, blockValues);
    },
    { projectValue: project, blockValues: dataBlocks },
  );
}
