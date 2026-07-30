import { expect, resetWorkspaceAuthority, test } from './fixtures/isolatedTest';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import { encodeProjectCollectionSnapshot } from '../../src/features/projects/projectSnapshot';
import { migrateProjectCollectionV1ToV2 } from '../../src/features/workspace/migrateV1ToV2';
import type { ProjectMigrationBundleV2 } from '../../src/features/workspace/workspaceV2';
import { createWorkspace } from './fixtures/projectWorkspace';

test('V2 migration bundle commits and loads manifest plus data blocks atomically in IndexedDB', async ({ page }) => {
  const project = createWorkspace('project-idb', 'IndexedDB 项目');
  const row = {
    pointName: 'IDB-01',
    depthM: 0.1,
    qcKpa: 1500,
    qtKpa: 1550,
    fsKpa: 15,
    u2Kpa: 35,
    frPercent: 1,
    waterDepthM: 18,
    finalDepthM: 20,
  };
  project.flowCase.point = {
    pointId: 'point-idb-01',
    pointName: row.pointName,
    pointAlias: 'IDB-01-A',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
  };
  project.flowCase.rows = [row];
  project.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName: 'idb.csv',
    fileType: 'CSV',
    status: 'ready',
    message: 'CSV 已解析。',
    version: 11,
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
    rawPreview: [['IDB-01', '0.1', '1500', '1550', '15', '35', '1', '18', '20']],
    rows: [row],
    problems: [],
    pointName: row.pointName,
    filePointNames: [row.pointName],
    pointDecision: 'matches-current',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
    generatedAt: '2026-07-10T09:00:00.000Z',
  };
  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([project], project.projectId), {
    sourceSavedAt: '2026-07-10T09:00:00.000Z',
    migratedAt: '2026-07-10T09:05:00.000Z',
  });

  await page.goto('/?storage-test=v2');
  const result = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const saved = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    return {
      saved,
      loaded,
      bootPointer: localStorage.getItem(database.WORKSPACE_BOOT_POINTER_KEY),
    };
  }, bundle);

  expect(result.saved).toMatchObject({ ok: true, manifestId: bundle.manifest.manifestId, bootPointerSaved: true });
  expect(result.loaded).toMatchObject({
    ok: true,
    manifest: { manifestId: bundle.manifest.manifestId },
    migrationRecord: { targetManifestId: bundle.manifest.manifestId },
  });
  if (result.loaded.ok) {
    expect(result.loaded.dataBlocks.map((block) => block.kind).sort()).toEqual(['normalized', 'raw']);
  }
  expect(result.bootPointer).toBe(bundle.manifest.manifestId);

  const invalidBundle = structuredClone(bundle);
  invalidBundle.dataBlocks = invalidBundle.dataBlocks.filter((block) => block.kind !== 'normalized');
  const atomicResult = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const failed = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    return { failed, loadedManifestId: loaded.ok ? loaded.manifest.manifestId : null };
  }, invalidBundle);

  expect(atomicResult.failed).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  expect(atomicResult.loadedManifestId).toBe(bundle.manifest.manifestId);

  const transactionFailure = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const broken = structuredClone(payload) as ProjectMigrationBundleV2;
    broken.manifest.state.projects[0].projectName = 'project-name-that-must-rollback';
    const normalized = broken.dataBlocks.find((block) => block.kind === 'normalized');
    if (normalized?.kind === 'normalized') {
      (normalized.rows[0] as unknown as Record<string, unknown>).uncloneable = () => 'fail';
    }
    const beforePointer = localStorage.getItem(database.WORKSPACE_BOOT_POINTER_KEY);
    const failed = await database.saveMigrationBundleV2(broken);
    const loaded = await database.loadActiveWorkspaceV2();
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readonly');
        const keyRequest = transaction.objectStore('manifests').getAllKeys();
        keyRequest.onsuccess = () => {
          db.close();
          resolve(keyRequest.result);
        };
        keyRequest.onerror = () => reject(keyRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
    return {
      failed,
      activeManifestId: loaded.ok ? loaded.manifest.manifestId : null,
      activeProjectName: loaded.ok ? loaded.manifest.state.projects[0].projectName : null,
      beforePointer,
      afterPointer: localStorage.getItem(database.WORKSPACE_BOOT_POINTER_KEY),
      keys,
    };
  }, bundle);

  expect(transactionFailure.failed).toMatchObject({ ok: false, reason: 'write-failed', preserved: true });
  expect(transactionFailure.activeManifestId).toBe(bundle.manifest.manifestId);
  expect(transactionFailure.activeProjectName).toBe(bundle.manifest.state.projects[0].projectName);
  expect(transactionFailure.afterPointer).toBe(transactionFailure.beforePointer);
  expect(transactionFailure.keys).not.toContain('manifest-that-must-rollback');

  const conflictResult = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const first = structuredClone(payload);
    first.manifest.manifestRevision = 2;
    first.manifest.state.projects[0].projectName = 'first-tab-update';
    const firstWrite = await database.saveWorkspaceV2(first.manifest, first.dataBlocks, {
      expectedManifestRevision: 1,
    });
    const stale = structuredClone(payload);
    stale.manifest.manifestRevision = 2;
    stale.manifest.state.projects[0].projectName = 'stale-second-tab-update';
    const staleWrite = await database.saveWorkspaceV2(stale.manifest, stale.dataBlocks, {
      expectedManifestRevision: 1,
    });
    const loaded = await database.loadActiveWorkspaceV2();
    return {
      firstWrite,
      staleWrite,
      storedProjectName: loaded.ok ? loaded.manifest.state.projects[0].projectName : null,
      storedRevision: loaded.ok ? loaded.manifest.manifestRevision : null,
    };
  }, bundle);

  expect(conflictResult.firstWrite).toMatchObject({ ok: true });
  expect(conflictResult.staleWrite).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(conflictResult).toMatchObject({ storedProjectName: 'first-tab-update', storedRevision: 2 });

  const referenceValidation = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const mutations: ProjectMigrationBundleV2[] = [];
    const wrongPoint = structuredClone(payload);
    wrongPoint.manifest.state.projects[0].points[0].importDrafts[0].pointId = 'missing-point';
    mutations.push(wrongPoint);
    const missingRun = structuredClone(payload);
    missingRun.manifest.state.projects[0].points[0].checkState.activeRunId = 'missing-run';
    mutations.push(missingRun);
    const wrongFingerprint = structuredClone(payload);
    wrongFingerprint.dataBlocks[0].sourceFingerprint = 'wrong-fingerprint';
    mutations.push(wrongFingerprint);
    const wrongSelection = structuredClone(payload);
    wrongSelection.manifest.state.projects[0].points[0].selection.selectedImportBatchId = 'missing-batch';
    mutations.push(wrongSelection);
    const missingSourceRow = structuredClone(payload);
    missingSourceRow.manifest.state.projects[0].points[0].importDrafts[0].sourceRowIds = ['missing-source-row'];
    mutations.push(missingSourceRow);
    return mutations.map((candidate) => database.validateMigrationBundleV2(candidate));
  }, bundle);

  expect(referenceValidation).toHaveLength(5);
  referenceValidation.forEach((result) => expect(result.ok).toBe(false));

  const corruptedLoad = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const corrupted = structuredClone(payload.manifest);
    corrupted.manifestRevision = 3;
    corrupted.state.projects[0].points[0].importDrafts[0].pointId = 'corrupted-point-reference';
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readwrite');
        transaction.objectStore('manifests').put(corrupted);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    return database.loadActiveWorkspaceV2();
  }, bundle);
  expect(corruptedLoad).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });

});

test('V3 bootstrap starts empty without migrating and preserves every legacy payload', async ({ page }) => {
  const project = createWorkspace('project-bootstrap', '迁移项目');
  const legacyRaw = encodeProjectCollectionSnapshot(
    createProjectCollectionState([project], project.projectId),
    '2026-07-10T10:00:00.000Z',
  );
  await page.goto('/?storage-test=bootstrap');

  const migrated = await page.evaluate(async (raw) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const bootstrap = await import('/src/features/workspace/workspaceBootstrap.ts');
    const legacy = await import('/src/features/projects/projectStorage.ts');
    localStorage.setItem(legacy.PROJECT_STORAGE_KEY, raw);
    const result = await bootstrap.bootstrapWorkspaceV2({
      legacyStorage: localStorage,
      bootStorage: localStorage,
      now: '2026-07-10T10:05:00.000Z',
    });
    const verified = await database.loadActiveWorkspaceV2();
    return {
      result,
      verifiedManifestId: verified.ok ? verified.manifest.manifestId : null,
      legacyAfter: localStorage.getItem(legacy.PROJECT_STORAGE_KEY),
    };
  }, legacyRaw);

  expect(migrated.result).toMatchObject({ ok: true, source: 'empty', manifest: null });
  expect(migrated.verifiedManifestId).toBeNull();
  expect(migrated.legacyAfter).toBe(legacyRaw);

  await resetWorkspaceAuthority(page, { reload: false });
  const invalidRaw = '{damaged-v1';
  const failed = await page.evaluate(async (raw) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const bootstrap = await import('/src/features/workspace/workspaceBootstrap.ts');
    const legacy = await import('/src/features/projects/projectStorage.ts');
    localStorage.setItem(legacy.PROJECT_STORAGE_KEY, raw);
    const result = await bootstrap.bootstrapWorkspaceV2({
      legacyStorage: localStorage,
      bootStorage: localStorage,
      now: '2026-07-10T10:10:00.000Z',
    });
    const verified = await database.loadActiveWorkspaceV2();
    return {
      result,
      databaseState: verified.ok ? 'ready' : verified.reason,
      legacyAfter: localStorage.getItem(legacy.PROJECT_STORAGE_KEY),
    };
  }, invalidRaw);

  expect(failed.result).toMatchObject({ ok: true, source: 'empty', manifest: null });
  expect(failed.databaseState).toBe('empty');
  expect(failed.legacyAfter).toBe(invalidRaw);

});
