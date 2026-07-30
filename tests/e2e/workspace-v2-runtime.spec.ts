import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test } from './fixtures/isolatedTest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import { encodeProjectCollectionSnapshot } from '../../src/features/projects/projectSnapshot';
import { PROJECT_STORAGE_KEY } from '../../src/features/projects/projectStorage';
import { migrateProjectCollectionV1ToV2 } from '../../src/features/workspace/migrateV1ToV2';
import type { ProjectMigrationBundleV2 } from '../../src/features/workspace/workspaceV2';
import { createGeneratedCsv } from './fixtures/generatedCptu';
import { createWorkspace } from './fixtures/projectWorkspace';
import {
  applyStratificationCommand,
  commitStratificationEdit,
  createBaseStratificationScheme,
  createStratificationInput,
  emptyStratificationWorkspace,
} from '../../src/features/stratification/stratificationDomain';

test('normal user runtime commits an uploaded point and check state through V2 across refresh', async ({ page }, testInfo) => {
  const seed = String(Date.now() % 100000000);
  const projectName = `V2 运行时项目 ${seed}`;
  const pointName = `V2-P-${seed}`;
  const generated = createGeneratedCsv(pointName, seed);
  const inputPath = testInfo.outputPath(generated.fileName);
  const testStartedAt = new Date().toISOString();
  writeFileSync(inputPath, generated.csv, 'utf8');
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await expect(page.getByTestId('project-hub')).toBeVisible();
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');

  await expect
    .poll(() => readV2PointState(page, projectName, pointName))
    .toMatchObject({
      pointCount: 1,
      activePointName: pointName,
      normalizedRowCount: generated.rowCount,
      rawRowCount: generated.rowCount,
      rawCompleteness: 'full',
      sourceFingerprint: createHash('sha256').update(generated.csv).digest('hex'),
      operationIdPresent: true,
      activeRoute: 'import',
    });

  await page.reload();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectName);
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(generated.fileName);
  await expect(page.getByTestId('parsed-import-result')).toContainText(`${generated.rowCount} 行`);

  await expect(page.getByTestId('preparation-guide')).toContainText('确认探头');
  await expect(page.getByTestId('probe-guide-dialog')).toBeVisible();
  await page.getByTestId('probe-guide-recommended').click();
  await expect(page.getByTestId('water-guide-dialog')).toBeVisible();
  await page.getByTestId('water-guide-confirm').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect
    .poll(() => readV2PointState(page, projectName, pointName))
    .toMatchObject({ checkRunCount: 1, checkArtifact: 'current', activeRoute: 'check' });

  await page.reload();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');

  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'workspace-v2-runtime');
    mkdirSync(evidenceDir, { recursive: true });
    await page.getByTestId('explorer-import').click();
    await expect(page.getByTestId('document-import')).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, 'v2-runtime-import-1440x900.png'), fullPage: true });
    const layout1440 = await readRuntimeLayout(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(evidenceDir, 'v2-runtime-import-1920x1080.png'), fullPage: true });
    const layout1920 = await readRuntimeLayout(page);
    const finalState = await readV2PointState(page, projectName, pointName);
    writeFileSync(
      path.join(evidenceDir, 'flow-run.json'),
      JSON.stringify(
        {
          seed,
          testTitle: testInfo.title,
          testStartedAt,
          sourceHashes: {
            app: fileSha256(path.join(process.cwd(), 'src', 'App.tsx')),
            workspaceDatabase: fileSha256(
              path.join(process.cwd(), 'src', 'features', 'workspace', 'workspaceDatabase.ts'),
            ),
            migration: fileSha256(path.join(process.cwd(), 'src', 'features', 'workspace', 'migrateV1ToV2.ts')),
            importPipeline: fileSha256(path.join(process.cwd(), 'src', 'features', 'import', 'importPipeline.ts')),
            runtimeSpec: fileSha256(path.join(process.cwd(), 'tests', 'e2e', 'workspace-v2-runtime.spec.ts')),
          },
          generatedInput: { fileName: generated.fileName, rowCount: generated.rowCount },
          projectName,
          pointName,
          finalState,
          viewports: [layout1440, layout1920],
          consoleErrors,
          pageErrors,
        },
        null,
        2,
      ),
      'utf8',
    );
    expect(layout1440).toMatchObject({
      bodyHorizontalOverflow: false,
      mainHorizontalOverflow: false,
      dockHorizontalOverflow: false,
      feedbackOverlapCount: 0,
    });
    expect(layout1920).toMatchObject({
      bodyHorizontalOverflow: false,
      mainHorizontalOverflow: false,
      dockHorizontalOverflow: false,
      feedbackOverlapCount: 0,
    });
  }
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a terminal checked-data result is authority-bound before any stratification rule references it', async ({ page }, testInfo) => {
  const seed = `check-authority-${Date.now() % 100000000}`;
  const projectName = `检查权威项目 ${seed}`;
  const generated = createGeneratedCsv(`CHK-${seed}`, seed);
  const inputPath = testInfo.outputPath(generated.fileName);
  writeFileSync(inputPath, generated.csv, 'utf8');

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');

  const tamperResult = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const damaged = structuredClone(loaded.manifest);
    const point = damaged.state.projects[0].points[0];
    const run = point.checkState.runs.find((candidate) => candidate.runId === point.checkState.activeRunId);
    if (!run?.normalizedDataHash || point.stratificationWorkspace?.ruleRuns?.length) {
      throw new Error('Expected an unreferenced terminal hashed check run.');
    }
    run.conclusion = '存在问题';
    run.counts.issue += 1;
    point.checkState.artifact.status = 'problem';
    const internalValidation = database.validateManifestReferences(damaged, loaded.dataBlocks);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readwrite');
        transaction.objectStore('manifests').put(damaged);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    const loadedAfterDamage = await database.loadActiveWorkspaceV2();
    return { internalValidation, loadedAfterDamage };
  });

  expect(tamperResult.internalValidation).toEqual({ ok: true });
  expect(tamperResult.loadedAfterDamage).toMatchObject({
    ok: false,
    reason: 'invalid-manifest',
    detail: expect.stringContaining('Interpretation authority digest'),
    preserved: true,
  });
});

test('a delayed obsolete file parse cannot overwrite the newer upload operation', async ({ page }, testInfo) => {
  const seed = String(Date.now() % 100000000);
  const projectName = `导入竞态项目 ${seed}`;
  const slow = createGeneratedCsv(`SLOW-${seed}`, `slow-${seed}`);
  const fast = createGeneratedCsv(`FAST-${seed}`, `fast-${seed}`);
  const slowUploadName = `slow-${slow.fileName}`;
  const fastUploadName = `fast-${fast.fileName}`;
  const slowPath = testInfo.outputPath(slowUploadName);
  const fastPath = testInfo.outputPath(fastUploadName);
  writeFileSync(slowPath, slow.csv, 'utf8');
  writeFileSync(fastPath, fast.csv, 'utf8');

  await page.addInitScript(() => {
    const originalText = File.prototype.text;
    let releaseSlow: (() => void) | null = null;
    Object.assign(window, {
      __slowImportWaiting: false,
      __slowImportDelivered: false,
      __releaseSlowImport: () => releaseSlow?.(),
    });
    File.prototype.text = function patchedText() {
      if (!this.name.startsWith('slow-')) return originalText.call(this);
      return originalText.call(this).then((text) => new Promise<string>((resolve) => {
        Object.assign(window, { __slowImportWaiting: true });
        releaseSlow = () => {
          Object.assign(window, { __slowImportDelivered: true });
          resolve(text);
        };
      }));
    };
  });
  await page.reload();

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();

  await page.getByTestId('import-file-input').setInputFiles(slowPath);
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __slowImportWaiting?: boolean }).__slowImportWaiting))).toBe(true);
  await page.getByTestId('import-file-input').setInputFiles(fastPath);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(fastUploadName);
  await page.evaluate(() => (window as unknown as { __releaseSlowImport: () => void }).__releaseSlowImport());
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __slowImportDelivered?: boolean }).__slowImportDelivered))).toBe(true);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  await expect(page.getByTestId('import-active-batch-name')).toHaveText(fastUploadName);
  await expect.poll(() => readActiveImportFile(page, projectName)).toBe(fastUploadName);
});

test('a parse result is rejected when the workspace revision changes before commit', async ({ page }, testInfo) => {
  const seed = String(Date.now() % 100000000);
  const projectName = `Revision 竞态项目 ${seed}`;
  const generated = createGeneratedCsv(`REV-${seed}`, `revision-${seed}`);
  const uploadName = `slow-revision-${generated.fileName}`;
  const inputPath = testInfo.outputPath(uploadName);
  writeFileSync(inputPath, generated.csv, 'utf8');

  await page.addInitScript(() => {
    const originalText = File.prototype.text;
    let releaseSlow: (() => void) | null = null;
    Object.assign(window, {
      __slowRevisionWaiting: false,
      __slowRevisionDelivered: false,
      __releaseSlowRevision: () => releaseSlow?.(),
    });
    File.prototype.text = function patchedText() {
      if (!this.name.startsWith('slow-revision-')) return originalText.call(this);
      return originalText.call(this).then((text) => new Promise<string>((resolve) => {
        Object.assign(window, { __slowRevisionWaiting: true });
        releaseSlow = () => {
          Object.assign(window, { __slowRevisionDelivered: true });
          resolve(text);
        };
      }));
    };
  });
  await page.reload();

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __slowRevisionWaiting?: boolean }).__slowRevisionWaiting))).toBe(true);

  await page.getByTestId('explorer-project').click();
  await expect(page.getByTestId('document-project')).toBeVisible();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill(`MANUAL-${seed}`);
  await page.getByTestId('confirm-point-command').click();
  await expect(page.getByTestId('project-current-point')).toHaveText(`MANUAL-${seed}`);
  await page.evaluate(() => (window as unknown as { __releaseSlowRevision: () => void }).__releaseSlowRevision());
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __slowRevisionDelivered?: boolean }).__slowRevisionDelivered))).toBe(true);
  await expect(page.getByTestId('project-storage-workspace-notice')).toContainText('项目状态已经变化');

  expect(await readActiveImportFile(page, projectName)).toBeNull();
  await expect(page.getByTestId('document-project')).toBeVisible();
});

test('the uploaded pipeline remains authoritative in the V2 batch, row IDs, and provenance', async ({ page }, testInfo) => {
  const seed = String(Date.now() % 100000000);
  const projectName = `领域权威项目 ${seed}`;
  const pointName = `AUTH-${seed}`;
  const fileName = `authoritative-${seed}.csv`;
  const csv = [
    'PointName,DepthM,QcKpa,FsKpa,FinalDepthM',
    '',
    `${pointName},0.5,900,12,3`,
    `${pointName},1.0,980,13,3`,
  ].join('\n');
  const inputPath = testInfo.outputPath(fileName);
  writeFileSync(inputPath, csv, 'utf8');

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputPath);

  await expect.poll(() => readAuthoritativeImportState(page, projectName, pointName)).toMatchObject({
    sourceFingerprint: createHash('sha256').update(csv).digest('hex'),
    baseWorkspaceRevisionPositive: true,
    mappingStates: {
      pointName: 'confirmed',
      depthM: 'confirmed',
      qc: 'confirmed',
      qt: 'missing',
      fs: 'confirmed',
      u2: 'missing',
      fr: 'missing',
      waterDepth: 'missing',
      finalDepth: 'missing',
    },
    qcUnit: { selectedUnit: 'kPa', state: 'confirmed' },
    sourceRowCount: 2,
    sourceRowIdsUseBatchRevision: true,
    rawRowReferenceNumbers: [3, 4],
    provenance: {
      qc: { origin: 'source', sourceUnit: 'kPa', standardUnit: 'kPa' },
      qt: { origin: 'derived', derivedFrom: ['qc'], standardUnit: 'kPa' },
      fs: { origin: 'source', sourceUnit: 'kPa', standardUnit: 'kPa' },
      u2: { origin: 'defaulted', standardUnit: 'kPa' },
      fr: { origin: 'derived', derivedFrom: ['fs', 'qt'], standardUnit: '%' },
      waterDepth: { origin: 'defaulted', standardUnit: 'm' },
    },
    targetAction: 'create-point',
    targetDecisionState: 'confirmed',
  });
});

test('normal app starts the V3 workspace empty and leaves a valid V1 payload untouched', async ({ page }) => {
  const project = createWorkspace('legacy-runtime', 'V1 迁移项目');
  const row = {
    pointName: 'LEG-01',
    depthM: 0.1,
    qcKpa: 1200,
    qtKpa: 1240,
    fsKpa: 12,
    u2Kpa: 30,
    frPercent: 1,
    waterDepthM: 16,
    finalDepthM: 22,
  };
  project.flowCase.point = {
    pointId: 'legacy-point-01',
    pointName: row.pointName,
    pointAlias: 'LEG-A',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
  };
  project.flowCase.rows = [row];
  project.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName: 'legacy-runtime.csv',
    fileType: 'CSV',
    status: 'ready',
    message: 'ready',
    version: 5,
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
    rawPreview: [['LEG-01', '0.1', '1200', '1240', '12', '30', '1', '16', '22']],
    rows: [row],
    problems: [],
    pointName: row.pointName,
    filePointNames: [row.pointName],
    pointDecision: 'matches-current',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
    generatedAt: '2026-07-10T12:00:00.000Z',
  };
  project.selection.activeRoute = 'import';
  const legacyRaw = encodeProjectCollectionSnapshot(
    createProjectCollectionState([project], project.projectId),
    '2026-07-10T12:00:00.000Z',
  );

  await page.goto('/');
  await page.evaluate(
    async ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: PROJECT_STORAGE_KEY, value: legacyRaw },
  );
  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-storage-notice')).toContainText('发现旧版浏览器数据');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), PROJECT_STORAGE_KEY)).toBe(legacyRaw);
  await expect.poll(() => page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    return loaded.ok ? 'ready' : loaded.reason;
  })).toBe('empty');

  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), PROJECT_STORAGE_KEY)).toBe(legacyRaw);
});

test('new-point decision appends a second point and preserves both check histories', async ({ page }, testInfo) => {
  const seed = String(Date.now() % 100000000);
  const projectName = `新增点位项目 ${seed}`;
  const pointA = `ADD-A-${seed}`;
  const pointB = `ADD-B-${seed}`;
  const generatedA = createGeneratedCsv(pointA, `${seed}1`);
  const generatedB = createGeneratedCsv(pointB, `${seed}2`);
  const inputA = testInfo.outputPath(generatedA.fileName);
  const inputB = testInfo.outputPath(generatedB.fileName);
  writeFileSync(inputA, generatedA.csv, 'utf8');
  writeFileSync(inputB, generatedB.csv, 'utf8');

  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputA);
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();

  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputB);
  await expect(page.getByTestId('point-decision-actions')).toBeVisible();
  await page.getByTestId('point-decision-new').click();
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await expect(page.getByTestId('run-data-check')).toHaveAttribute('data-draft-checkable', 'true');
  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({
    pointAChecks: 1,
    pointBChecks: 0,
    activePointName: pointB,
  });
  await completePreparationGuide(page);
  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({
    pointBChecks: 1,
    activeRoute: 'check',
  });
  await expect(page.getByTestId('document-check')).toBeVisible();

  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({
    pointCount: 2,
    activePointName: pointB,
    pointAChecks: 1,
    pointBChecks: 1,
  });

  await page.getByTestId('explorer-project').click();
  const pointARow = page.locator('[data-testid^="project-point-"]').filter({ hasText: pointA });
  await pointARow.click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(generatedA.fileName);
  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({ activeRoute: 'check' });
  await page.reload();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({
    pointCount: 2,
    activePointName: pointA,
    pointAChecks: 1,
    pointBChecks: 1,
  });

  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(inputB);
  await page.getByTestId('point-decision-new').click();
  await expect(page.getByTestId('import-problem-point-existing-conflict')).toContainText('点位已存在');
  await expect.poll(() => readChecksByPointName(page, projectName, pointA, pointB)).toMatchObject({
    pointCount: 2,
    activePointName: pointA,
    pointAChecks: 1,
    pointBChecks: 1,
  });
});

test('V2 project switches real points and keeps their check states independent', async ({ page }) => {
  const projectId = 'multi-runtime-project';
  const projectName = '多点独立状态项目';
  const legacyA = createReadyLegacyPoint(projectId, projectName, 'point-real-a', 'REAL-A', 'real-a.csv', 1300);
  const legacyB = createReadyLegacyPoint(projectId, projectName, 'point-real-b', 'REAL-B', 'real-b.csv', 2300);
  const bundleA = await migrateProjectCollectionV1ToV2(createProjectCollectionState([legacyA], projectId), {
    sourceSavedAt: '2026-07-10T13:00:00.000Z',
    migratedAt: '2026-07-10T13:05:00.000Z',
  });
  const bundleB = await migrateProjectCollectionV1ToV2(createProjectCollectionState([legacyB], projectId), {
    sourceSavedAt: '2026-07-10T13:01:00.000Z',
    migratedAt: '2026-07-10T13:05:00.000Z',
  });
  const projectA = bundleA.manifest.state.projects[0];
  const projectB = bundleB.manifest.state.projects[0];
  const combined: ProjectMigrationBundleV2 = {
    manifest: {
      ...bundleA.manifest,
      state: {
        activeProjectId: projectId,
        projects: [
          {
            ...projectA,
            points: [...projectA.points, ...projectB.points],
            importBatches: [...projectA.importBatches, ...projectB.importBatches],
            activePointId: projectA.points[0].pointId,
            activeImportBatchId: projectA.importBatches[0].batchId,
            activeRoute: 'project',
          },
        ],
      },
    },
    dataBlocks: [...bundleA.dataBlocks, ...bundleB.dataBlocks],
    migrationRecord: bundleA.migrationRecord,
  };

  await page.goto('/');
  await page.evaluate(async (payload) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const saved = await database.saveMigrationBundleV2(payload);
    if (!saved.ok) throw new Error(saved.detail);
  }, combined);
  await page.reload();

  await expect(page.getByTestId('document-project')).toBeVisible();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(2);
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('water-guide-dialog').getByRole('button', { name: '暂不确认' }).last().click();
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('project-point-point-real-b').click();
  await page.getByTestId('probe-guide-recommended').click();
  await expect(page.getByTestId('import-active-batch-name')).toHaveText('real-b.csv');
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();

  await expect.poll(() => readV2MultiPointChecks(page, projectId)).toEqual({
    activePointId: 'point-real-b',
    pointCount: 2,
    pointAChecks: 0,
    pointBChecks: 1,
  });

  await page.getByTestId('explorer-project').click();
  await page.getByTestId('project-point-point-real-a').click();
  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('check-first-look')).toContainText('尚未检查');
});

test('UI-only navigation preserves unprojected drafts, check evidence, and downstream dependencies', async ({ page }) => {
  const legacy = createReadyLegacyPoint('deep-state-project', '深状态项目', 'deep-point', 'DEEP-01', 'deep.csv', 1900);
  const bundle = await migrateProjectCollectionV1ToV2(createProjectCollectionState([legacy], legacy.projectId), {
    sourceSavedAt: '2026-07-10T14:00:00.000Z',
    migratedAt: '2026-07-10T14:05:00.000Z',
  });
  const project = bundle.manifest.state.projects[0];
  const point = project.points[0];
  const activeDraft = point.importDrafts[0];
  const historyDraft = { ...structuredClone(activeDraft), draftId: `${activeDraft.draftId}-history`, status: 'stale' as const };
  point.importDrafts = [historyDraft, activeDraft];
  const batch = project.importBatches[0];
  if (batch.kind !== 'draft') throw new Error('Expected a draft batch.');
  batch.generatedDraftIds = [historyDraft.draftId, activeDraft.draftId];
  const dependency = {
    pointId: point.pointId,
    draftId: activeDraft.draftId,
    batchId: activeDraft.batchId,
    revisions: { ...activeDraft.revisions },
  };
  point.checkState = {
    activeRunId: 'CHECK-DEEP',
    runs: [
      {
        runId: 'CHECK-DEEP',
        input: dependency,
        status: 'failed',
        counts: { issue: 1, notice: 2, passed: 3 },
        conclusion: '存在问题',
        issueIds: ['CHK-DEEP-01'],
        createdAt: '2026-07-10T14:02:00.000Z',
        completedAt: '2026-07-10T14:03:00.000Z',
      },
    ],
    legacyHistory: [],
    artifact: {
      status: 'stale',
      input: dependency,
      staleReason: '上次检查运行失败，需要重新运行。',
      recoveryTarget: { route: 'check', reasonCode: 'CHECK-RUN-FAILED' },
    },
  };
  const stratificationInput = createStratificationInput(dependency, 'CHECK-DEEP');
  const createdScheme = createBaseStratificationScheme(
    emptyStratificationWorkspace(),
    stratificationInput,
    0.5,
    Math.max(1, point.finalDepthM),
    '深层状态恢复方案',
  );
  if (!createdScheme.ok) throw new Error(createdScheme.problem);
  const layerId = createdScheme.workspace.editSession?.working.layers[0]?.layerId;
  if (!layerId) throw new Error('Stratification layer is required.');
  const confirmedScheme = applyStratificationCommand(createdScheme.workspace, { kind: 'set-layer-soil-classification', layerId, engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' });
  if (!confirmedScheme.ok) throw new Error(confirmedScheme.problem);
  const committedScheme = commitStratificationEdit(confirmedScheme.workspace, stratificationInput);
  if (!committedScheme.ok) throw new Error(committedScheme.problem);
  const committedRevision = committedScheme.workspace.revisions?.find((revision) => revision.schemeId === committedScheme.scheme.schemeId && revision.version === committedScheme.scheme.version);
  if (!committedRevision) throw new Error('Committed stratification revision is required.');
  point.stratificationWorkspace = committedScheme.workspace;
  const downstreamArtifact = {
    status: 'current' as const,
    input: dependency,
    sourceCheckRunId: 'CHECK-DEEP',
    sourceStratificationSchemeId: committedScheme.scheme.schemeId,
    sourceStratificationRevisionId: committedRevision.revisionId,
  };
  point.stratificationState = structuredClone(downstreamArtifact);
  point.parameterState = structuredClone(downstreamArtifact);
  point.outputState = structuredClone(downstreamArtifact);
  project.activeRoute = 'project';

  await page.goto('/');
  await page.evaluate(async (payload) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const saved = await database.saveMigrationBundleV2(payload);
    if (!saved.ok) throw new Error(saved.detail);
  }, bundle);
  await page.reload();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('water-guide-dialog').getByRole('button', { name: '暂不确认' }).last().click();
  await page.getByTestId('explorer-parameters').click();
  await expect(page.getByTestId('document-parameters')).toBeVisible();
  await expect(page.getByTestId('explorer-parameters')).toHaveAttribute('data-handoff-state', 'deny');

  await expect.poll(() => readDeepPointState(page, project.projectId, point.pointId)).toEqual({
    activeRoute: 'parameters',
    draftIds: [historyDraft.draftId, activeDraft.draftId],
    activeRunId: 'CHECK-DEEP',
    runStatus: 'failed',
    issueIds: ['CHK-DEEP-01'],
    completedAt: '2026-07-10T14:03:00.000Z',
    artifactStates: ['stale', 'stale', 'stale', 'stale'],
  });

  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-rerun').click();
  await expect.poll(() => readDeepCheckAfterRerun(page, project.projectId, point.pointId)).toMatchObject({
    runCount: 2,
    activeIsOld: false,
    oldRun: {
      status: 'failed',
      issueIds: ['CHK-DEEP-01'],
      completedAt: '2026-07-10T14:03:00.000Z',
      draftId: activeDraft.draftId,
    },
  });
  await page.reload();
  await expect.poll(() => readDeepCheckAfterRerun(page, project.projectId, point.pointId)).toMatchObject({
    runCount: 2,
    activeIsOld: false,
    oldRun: { status: 'failed', issueIds: ['CHK-DEEP-01'] },
  });
});

async function readV2PointState(page: import('@playwright/test').Page, projectName: string, pointName: string) {
  return page.evaluate(
    async ({ projectNameValue, pointNameValue }) => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) return null;
      const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
      const point = project?.points.find((candidate) => candidate.pointName === pointNameValue);
      const activeDraft = point?.importDrafts.find((draft) => draft.draftId === point.activeImportDraftId);
      const block = loaded.dataBlocks.find((candidate) => candidate.dataBlockId === activeDraft?.dataBlockId);
      const batch = project?.importBatches.find((candidate) => candidate.batchId === activeDraft?.batchId);
      const rawBlock = batch?.kind === 'draft'
        ? loaded.dataBlocks.find((candidate) => candidate.dataBlockId === batch.rawDataBlockId)
        : null;
      return {
        pointCount: project?.points.length ?? 0,
        activePointName: project?.points.find((candidate) => candidate.pointId === project.activePointId)?.pointName ?? null,
        normalizedRowCount: block?.kind === 'normalized' ? block.rows.length : 0,
        rawRowCount: rawBlock?.kind === 'raw' ? rawBlock.rows.length : 0,
        rawCompleteness: rawBlock?.kind === 'raw' ? rawBlock.completeness : null,
        sourceFingerprint: batch?.sourceFingerprint ?? null,
        operationIdPresent: batch?.kind === 'draft' ? Boolean(batch.operationId) : false,
        activeRoute: project?.activeRoute ?? null,
        checkRunCount: point?.checkState.runs.length ?? 0,
        checkArtifact: point?.checkState.artifact.status ?? null,
      };
    },
    { projectNameValue: projectName, pointNameValue: pointName },
  );
}

async function readActiveImportFile(page: import('@playwright/test').Page, projectName: string) {
  return page.evaluate(async (projectNameValue) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    return batch?.kind === 'draft' ? batch.source.fileName : null;
  }, projectName);
}

async function readActiveProjectRoute(page: import('@playwright/test').Page, projectName: string) {
  return page.evaluate(async (projectNameValue) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    if (!project) return null;
    const raw = localStorage.getItem(`sigs-oglab:legacy-ui-state:v1:${project.projectId}`);
    if (!raw) return project.activeRoute;
    try {
      const snapshot = JSON.parse(raw) as { pointId?: string; selection?: { activeRoute?: string } };
      return snapshot.pointId === (project.activePointId ?? '')
        ? snapshot.selection?.activeRoute ?? project.activeRoute
        : project.activeRoute;
    } catch {
      return project.activeRoute;
    }
  }, projectName);
}

async function readAuthoritativeImportState(
  page: import('@playwright/test').Page,
  projectName: string,
  pointName: string,
) {
  return page.evaluate(async ({ projectNameValue, pointNameValue }) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    const point = project?.points.find((candidate) => candidate.pointName === pointNameValue);
    const draft = point?.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === draft?.batchId);
    if (!project || !point || !draft || batch?.kind !== 'draft') return null;
    const mappingStates = Object.fromEntries(batch.mappings.map((mapping) => [mapping.targetField, mapping.state]));
    const qcUnit = batch.unitDecisions.find((unit) => unit.targetField === 'qc');
    const rawBlock = loaded.dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId);
    return {
      sourceFingerprint: batch.sourceFingerprint,
      baseWorkspaceRevisionPositive: batch.baseWorkspaceRevision > 0,
      mappingStates,
      qcUnit: qcUnit ? { selectedUnit: qcUnit.selectedUnit, state: qcUnit.state } : null,
      sourceRowCount: draft.sourceRowIds.length,
      sourceRowIdsUseBatchRevision: draft.sourceRowIds.every((rowId, index) =>
        rowId === `${batch.batchId}:source:${batch.revisions.source}:${batch.sourceFingerprint.slice(0, 12)}:row:${index}`,
      ),
      rawRowReferenceNumbers: rawBlock?.kind === 'raw'
        ? rawBlock.rowReferences?.map((reference) => reference.displayRowNumber) ?? []
        : [],
      provenance: draft.valueProvenance,
      targetAction: batch.pointPlan.targetDecisions?.[0]?.action ?? null,
      targetDecisionState: batch.pointPlan.targetDecisions?.[0]?.state ?? null,
    };
  }, { projectNameValue: projectName, pointNameValue: pointName });
}

async function readRuntimeLayout(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('[data-testid="active-document"]');
    const dock = document.querySelector<HTMLElement>('.right-panel');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      mainHorizontalOverflow: main ? main.scrollWidth > main.clientWidth + 2 : true,
      dockHorizontalOverflow: dock ? dock.scrollWidth > dock.clientWidth + 2 : true,
      feedbackOverlapCount: (() => {
        const feedback = document.querySelector<HTMLElement>(
          '[data-testid="flow-toast"], [data-testid="project-storage-workspace-notice"]',
        );
        if (!feedback) return 0;
        const feedbackRect = feedback.getBoundingClientRect();
        return [...document.querySelectorAll<HTMLElement>('table, .file-drop-zone')].filter((element) => {
          const rect = element.getBoundingClientRect();
          return !(
            feedbackRect.right <= rect.left ||
            feedbackRect.left >= rect.right ||
            feedbackRect.bottom <= rect.top ||
            feedbackRect.top >= rect.bottom
          );
        }).length;
      })(),
    };
  });
}

function fileSha256(filePath: string) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function readV2MultiPointChecks(page: import('@playwright/test').Page, projectId: string) {
  return page.evaluate(async (id) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === id);
    const pointA = project?.points.find((point) => point.pointId === 'point-real-a');
    const pointB = project?.points.find((point) => point.pointId === 'point-real-b');
    return {
      activePointId: project?.activePointId ?? null,
      pointCount: project?.points.length ?? 0,
      pointAChecks: pointA?.checkState.runs.length ?? 0,
      pointBChecks: pointB?.checkState.runs.length ?? 0,
    };
  }, projectId);
}

async function readChecksByPointName(
  page: import('@playwright/test').Page,
  projectName: string,
  pointAName: string,
  pointBName: string,
) {
  return page.evaluate(
    async ({ projectNameValue, pointAValue, pointBValue }) => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) return null;
      const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
      const pointAState = project?.points.find((point) => point.pointName === pointAValue);
      const pointBState = project?.points.find((point) => point.pointName === pointBValue);
      let activeRoute = project?.activeRoute ?? null;
      if (project) {
        const raw = localStorage.getItem(`sigs-oglab:legacy-ui-state:v1:${project.projectId}`);
        if (raw) {
          try {
            const snapshot = JSON.parse(raw) as { pointId?: string; selection?: { activeRoute?: typeof project.activeRoute } };
            if (snapshot.pointId === (project.activePointId ?? '') && snapshot.selection?.activeRoute) activeRoute = snapshot.selection.activeRoute;
          } catch { /* Use the durable manifest route. */ }
        }
      }
      return {
        pointCount: project?.points.length ?? 0,
        activePointName: project?.points.find((point) => point.pointId === project.activePointId)?.pointName ?? null,
        activeRoute,
        pointAChecks: pointAState?.checkState.runs.length ?? 0,
        pointBChecks: pointBState?.checkState.runs.length ?? 0,
      };
    },
    { projectNameValue: projectName, pointAValue: pointAName, pointBValue: pointBName },
  );
}

function createReadyLegacyPoint(
  projectId: string,
  projectName: string,
  pointId: string,
  pointName: string,
  fileName: string,
  qcKpa: number,
) {
  const project = createWorkspace(projectId, projectName);
  const row = {
    pointName,
    depthM: 0.1,
    qcKpa,
    qtKpa: qcKpa + 40,
    fsKpa: 12,
    u2Kpa: 30,
    frPercent: 1,
    waterDepthM: 16,
    finalDepthM: 22,
  };
  project.flowCase.point = {
    pointId,
    pointName,
    pointAlias: `${pointName}-A`,
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
  };
  project.flowCase.rows = [row];
  project.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName,
    fileType: 'CSV',
    status: 'ready',
    message: 'ready',
    version: 1,
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
    rawPreview: [[pointName, '0.1', String(qcKpa), String(qcKpa + 40), '12', '30', '1', '16', '22']],
    rows: [row],
    problems: [],
    pointName,
    filePointNames: [pointName],
    pointDecision: 'matches-current',
    waterDepthM: row.waterDepthM,
    finalDepthM: row.finalDepthM,
    generatedAt: '2026-07-10T13:00:00.000Z',
  };
  project.selection.activeRoute = 'project';
  project.selection.selectedPointId = pointId;
  return project;
}

async function readDeepPointState(page: import('@playwright/test').Page, projectId: string, pointId: string) {
  return page.evaluate(
    async ({ projectIdValue, pointIdValue }) => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) return null;
      const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === projectIdValue);
      const point = project?.points.find((candidate) => candidate.pointId === pointIdValue);
      const run = point?.checkState.runs.find((candidate) => candidate.runId === point.checkState.activeRunId);
      let activeRoute = project?.activeRoute ?? null;
      if (project) {
        const raw = localStorage.getItem(`sigs-oglab:legacy-ui-state:v1:${project.projectId}`);
        if (raw) {
          try {
            const snapshot = JSON.parse(raw) as { pointId?: string; selection?: { activeRoute?: typeof project.activeRoute } };
            if (snapshot.pointId === (project.activePointId ?? '') && snapshot.selection?.activeRoute) activeRoute = snapshot.selection.activeRoute;
          } catch { /* Use the durable manifest route. */ }
        }
      }
      return {
        activeRoute,
        draftIds: point?.importDrafts.map((draft) => draft.draftId) ?? [],
        activeRunId: point?.checkState.activeRunId ?? null,
        runStatus: run?.status ?? null,
        issueIds: run?.issueIds ?? [],
        completedAt: run?.completedAt ?? null,
        artifactStates: point
          ? [
              point.checkState.artifact.status,
              point.stratificationState.status,
              point.parameterState.status,
              point.outputState.status,
            ]
          : [],
      };
    },
    { projectIdValue: projectId, pointIdValue: pointId },
  );
}

async function readDeepCheckAfterRerun(page: import('@playwright/test').Page, projectId: string, pointId: string) {
  return page.evaluate(
    async ({ projectIdValue, pointIdValue }) => {
      const database = await import('/src/features/workspace/workspaceDatabase.ts');
      const loaded = await database.loadActiveWorkspaceV2();
      if (!loaded.ok) return null;
      const point = loaded.manifest.state.projects
        .find((project) => project.projectId === projectIdValue)
        ?.points.find((candidate) => candidate.pointId === pointIdValue);
      const oldRun = point?.checkState.runs.find((run) => run.runId === 'CHECK-DEEP');
      return {
        runCount: point?.checkState.runs.length ?? 0,
        activeIsOld: point?.checkState.activeRunId === 'CHECK-DEEP',
        oldRun: oldRun
          ? {
              status: oldRun.status,
              issueIds: oldRun.issueIds,
              completedAt: oldRun.completedAt,
              draftId: oldRun.input.draftId,
            }
          : null,
      };
    },
    { projectIdValue: projectId, pointIdValue: pointId },
  );
}
