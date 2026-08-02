import { readFileSync } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { expect, test } from './fixtures/isolatedTest';

const sourcePath = path.join(process.cwd(), 'sample_data', 'source', 'yingkou', 'SCPT1数据.xlsx');
test.skip(!existsSync(sourcePath), '营口真实样本未获公开授权，干净发布环境按预期跳过。');

test('Process131 reproduces an empty-project AI import of the real 7,832-row SCPT1 workbook', async ({ page }) => {
  test.setTimeout(300_000);
  await page.route('**/__process131_scpt1.xlsx', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: readFileSync(sourcePath),
  }));
  await page.route('**/api/assistant/capabilities', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      serviceId: 'sigs-oglab-assistant',
      buildId: 'process134-ai-import-v1',
      instanceId: 'playwright-mock-instance',
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
      serviceAvailable: true,
      provider: 'mock',
      model: 'deterministic-mock',
      requiresApiKey: false,
    }),
  }));
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      context: { importSource: { sourceFingerprint: string } };
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        content: null,
        calls: [{
          id: 'scpt1-cleanup',
          name: 'propose_import_cleanup',
          arguments: JSON.stringify({
            sourceFingerprint: body.context.importSource.sourceFingerprint,
            sheetName: 'Sheet1',
            headerRow: 9,
            summary: '已识别营口 SCPT1 工作表、表头、字段和单位。',
            columns: [
              { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。' },
              { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: '锥尖阻力列。' },
              { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: '侧摩阻列。' },
              { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa', reason: '孔压列。' },
            ],
            cellEdits: [],
          }),
        }],
      }),
    });
  });
  await page.reload();

  const projectName = `Process131 SCPT1 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('create-point').click();
  await page.getByTestId('point-name-input').fill('SCPT1');
  await page.getByTestId('confirm-point-command').click();
  await page.getByTestId('probe-guide-recommended').click();
  await page.getByTestId('explorer-project').click();
  await page.getByTestId('delete-point').click();
  await page.getByTestId('confirm-point-command').click();
  await expect(page.locator('[data-testid^="project-point-"]')).toHaveCount(0);
  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles({
    name: '中间.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('ZoomXY Data\nTotal Group = 64 / Version=100\n', 'utf8'),
  });
  await expect.poll(() => page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    return batch?.kind === 'draft' ? batch.source.fileName : null;
  }, projectName), { timeout: 60_000 }).toBe('中间.csv');
  const result = await page.evaluate(async (name) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const adapter = await import('/src/features/workspace/legacyWorkspaceAdapter.ts');
    const assistant = await import('/src/features/import/importAssistantDomain.ts');
    const pipelineDomain = await import('/src/features/import/importPipeline.ts');
    const migration = await import('/src/features/workspace/migrateV1ToV2.ts');
    const collection = await import('/src/features/projects/projectCollection.ts');
    const lifecycle = await import('/src/features/workspace/pointLifecycle.ts');
    const pointGeneration = await import('/src/features/import/pointGeneration.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return { load: loaded, validation: null };
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name) ?? null;
    if (!project) return { load: { ok: true }, validation: null };
    const legacy = adapter.projectV2ToLegacyView(project, loaded.dataBlocks);
    const response = await fetch('/__process131_scpt1.xlsx');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const file = new File(
      [bytes],
      'SCPT1数据.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
    const operationId = 'process131-scpt1';
    const source = await assistant.extractImportAssistantSource(file, operationId);
    const proposal = {
      sourceFingerprint: source.sourceFingerprint,
      sheetName: 'Sheet1',
      headerRow: 9,
      summary: '已识别营口 SCPT1 工作表、表头、字段和单位。',
      columns: [
        { sourceColumnIndex: 0, targetField: 'depthM' as const, sourceUnit: 'm' as const, reason: '深度列。' },
        { sourceColumnIndex: 1, targetField: 'qc' as const, sourceUnit: 'MPa' as const, reason: '锥尖阻力列。' },
        { sourceColumnIndex: 2, targetField: 'fs' as const, sourceUnit: 'kPa' as const, reason: '侧摩阻列。' },
        { sourceColumnIndex: 3, targetField: 'u2' as const, sourceUnit: 'kPa' as const, reason: '孔压列。' },
      ],
      cellEdits: [],
    };
    const representativeRows = (rows: Array<{
      depthM: number;
      qcKpa: number;
      fsKpa: number;
      u2Kpa?: number | null;
    }>) => {
      const indices = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
      return indices.map((index) => {
        const row = rows[index];
        return row ? {
          depthM: row.depthM,
          qcKpa: row.qcKpa,
          fsKpa: row.fsKpa,
          u2Kpa: row.u2Kpa ?? null,
        } : null;
      });
    };
    const context = {
      currentPointName: legacy.flowCase.point.pointName,
      defaultWaterDepthM: legacy.flowCase.point.waterDepthM,
      defaultFinalDepthM: legacy.flowCase.point.finalDepthM,
      allowAnyPoint: true,
      existingPoints: [],
    };
    let pipeline = await assistant.createPipelineFromImportCleanup({
      proposal,
      source,
      sourceAttachment: {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256: source.sourceFingerprint,
        bytes: Array.from(bytes),
      },
      context,
      baseWorkspaceRevision: project.workspaceRevision,
      measurementAuthorization: { sourceFingerprint: source.sourceFingerprint, allowed: false },
    });
    pipeline = pipelineDomain.setPointAttributionDecision(
      pipeline,
      { source: 'constant-name', pointName: 'SCPT1' },
      context,
    );
    const detected = pipeline.pointPlan.detectedPoints[0];
    if (!detected) return { load: { ok: true }, validation: { ok: false, detail: 'No detected point.' } };
    pipeline = pipelineDomain.setPointTargetDecision(
      pipeline,
      detected.pointKey,
      'create-point',
      { proposedPointName: 'SCPT1' },
      context,
    );
    const draft = {
      ...pipelineDomain.projectPipelineToLegacyDraft(pipeline, {
        currentPointName: 'SCPT1',
        defaultWaterDepthM: context.defaultWaterDepthM,
        defaultFinalDepthM: context.defaultFinalDepthM,
      }),
      pointName: 'SCPT1',
      pointDecision: 'new-point' as const,
      version: Date.now(),
      generatedAt: new Date().toISOString(),
    };
    const nextLegacy = { ...legacy, importDraft: draft, updatedAt: new Date().toISOString() };
    const bundle = await migration.migrateProjectCollectionV1ToV2(
      collection.createProjectCollectionState([nextLegacy], nextLegacy.projectId),
      {
        sourceSavedAt: nextLegacy.updatedAt,
        migratedAt: new Date().toISOString(),
        pipelineByProjectId: { [nextLegacy.projectId]: pipeline },
      },
    );
    const migratedProject = bundle.manifest.state.projects[0];
    const incomingBatchIds = new Set(migratedProject.importBatches.map((batch) => batch.batchId));
    const incomingPoint = migratedProject.points.find((point) => point.pointId === migratedProject.activePointId)
      ?? migratedProject.points[0];
    const patchedProject = {
      ...project,
      points: incomingPoint ? [...project.points, incomingPoint] : project.points,
      activePointId: incomingPoint?.pointId ?? project.activePointId,
      importBatches: [
        ...project.importBatches.filter((batch) => !incomingBatchIds.has(batch.batchId)),
        ...migratedProject.importBatches,
      ],
      activeImportBatchId: migratedProject.activeImportBatchId,
      activeRoute: 'import' as const,
      updatedAt: new Date().toISOString(),
    };
    const nextManifest = {
      ...loaded.manifest,
      manifestRevision: loaded.manifest.manifestRevision + 1,
      savedAt: new Date().toISOString(),
      state: {
        ...loaded.manifest.state,
        projects: loaded.manifest.state.projects.map((candidate) =>
          candidate.projectId === patchedProject.projectId ? patchedProject : candidate
        ),
        activeProjectId: patchedProject.projectId,
      },
    };
    const incomingBlockIds = new Set(bundle.dataBlocks.map((block) => block.dataBlockId));
    const nextBlocks = [
      ...loaded.dataBlocks.filter((block) => !incomingBlockIds.has(block.dataBlockId)),
      ...bundle.dataBlocks,
    ];
    const firstImportedProject = bundle.manifest.state.projects[0];
    const firstImportedPoint = firstImportedProject.points[0];
    const deleted = firstImportedPoint
      ? lifecycle.deletePoint(firstImportedProject, firstImportedPoint.pointId, new Date().toISOString())
      : null;
    const reimportedAfterDelete = deleted?.ok
      ? pointGeneration.generatePointDrafts(
          deleted.project,
          { ...pipeline, baseWorkspaceRevision: deleted.project.workspaceRevision },
          bundle.dataBlocks,
          new Date().toISOString(),
        )
      : null;
    const reimportedManifest = reimportedAfterDelete?.ok
      ? {
          ...bundle.manifest,
          manifestRevision: bundle.manifest.manifestRevision + 1,
          savedAt: new Date().toISOString(),
          state: {
            projects: [reimportedAfterDelete.project],
            activeProjectId: reimportedAfterDelete.project.projectId,
          },
        }
      : null;
    const persistedReimport = reimportedManifest
      ? await (async () => {
          const persistenceManifest = {
            ...loaded.manifest,
            manifestRevision: loaded.manifest.manifestRevision + 1,
            savedAt: new Date().toISOString(),
            state: {
              ...loaded.manifest.state,
              projects: loaded.manifest.state.projects.map((candidate) =>
                candidate.projectId === reimportedAfterDelete!.project.projectId
                  ? reimportedAfterDelete!.project
                  : candidate
              ),
              activeProjectId: reimportedAfterDelete!.project.projectId,
            },
          };
          const saved = await database.saveWorkspaceV2(persistenceManifest, nextBlocks, {
            expectedManifestRevision: loaded.manifest.manifestRevision,
          });
          if (!saved.ok) return { saved };
          const reloaded = await database.loadActiveWorkspaceV2();
          if (!reloaded.ok) return { saved, reloaded };
          const persistedProject = reloaded.manifest.state.projects[0];
          const persistedBatch = persistedProject.importBatches[0];
          const persistedLegacy = adapter.projectV2ToLegacyView(persistedProject, reloaded.dataBlocks);
          return {
            saved,
            reloaded: { ok: true },
            validation: database.validateManifestReferences(reloaded.manifest, reloaded.dataBlocks),
            pointIds: persistedProject.points.map((point) => point.pointId),
            deletedPointIds: persistedProject.deletedPoints.map((record) => record.pointId),
            sourceFingerprint: persistedBatch?.sourceFingerprint ?? null,
            representativeRows: representativeRows(persistedLegacy.importDraft.rows),
            normalizedRows: persistedBatch?.kind === 'draft'
              ? reloaded.dataBlocks.find((block) => block.dataBlockId === persistedBatch.normalizedDataBlockId && block.kind === 'normalized')?.rows.length ?? 0
              : 0,
          };
        })()
      : null;
    return {
      load: { ok: true },
      source: {
        sheetCount: source.sheets.length,
        sheetNames: source.sheets.map((sheet) => sheet.sheetName),
        sheetRows: source.sheets.find((sheet) => sheet.sheetName === 'Sheet1')?.rowCount,
        headerRow: source.sheets.find((sheet) => sheet.sheetName === 'Sheet1')?.rows[8]?.slice(0, 4) ?? [],
        sourceFingerprint: source.sourceFingerprint,
      },
      pipeline: {
        rows: pipeline.rows.length,
        normalizedRows: pipeline.normalizedRows.length,
        sourceRows: pipeline.sourceRows.length,
        ready: pipeline.readiness.canGenerateDrafts,
        mapping: proposal.columns.map((column) => ({
          sourceColumnIndex: column.sourceColumnIndex,
          targetField: column.targetField,
          sourceUnit: column.sourceUnit,
        })),
        representativeRows: representativeRows(pipeline.rows),
      },
      bundle: {
        pointCount: bundle.manifest.state.projects[0].points.length,
        batchCount: bundle.manifest.state.projects[0].importBatches.length,
        rawRows: bundle.dataBlocks.find((block) => block.kind === 'raw')?.rows.length,
        normalizedRows: bundle.dataBlocks.find((block) => block.kind === 'normalized')?.rows.length,
      },
      validation: database.validateMigrationBundleV2(bundle),
      patchedValidation: database.validateManifestReferences(nextManifest, nextBlocks),
      reimport: reimportedAfterDelete?.ok ? {
        ok: true,
        pointIds: reimportedAfterDelete.project.points.map((point) => point.pointId),
        deletedPointIds: reimportedAfterDelete.project.deletedPoints.map((record) => record.pointId),
      } : reimportedAfterDelete,
      reimportedValidation: reimportedManifest
        ? database.validateManifestReferences(reimportedManifest, bundle.dataBlocks)
        : null,
      persistedReimport,
    };
  }, projectName);

  console.log(JSON.stringify(result, null, 2));
  expect(result.validation).toEqual({ ok: true });
  expect(result.source).toMatchObject({
    sheetCount: 3,
    sheetNames: ['Sheet1', 'Sheet2', 'Sheet3'],
    sheetRows: 7841,
  });
  expect(result.source?.headerRow[0]).toContain('深度');
  expect(result.source?.headerRow[1]).toContain('锥尖');
  expect(result.source?.headerRow[2]).toContain('侧摩');
  expect(result.source?.headerRow[3]).toContain('孔压');
  expect(result.pipeline?.rows).toBe(7832);
  expect(result.pipeline?.sourceRows).toBe(7832);
  expect(result.pipeline?.normalizedRows).toBe(7832);
  expect(result.pipeline?.mapping).toEqual([
    { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm' },
    { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa' },
    { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa' },
    { sourceColumnIndex: 3, targetField: 'u2', sourceUnit: 'kPa' },
  ]);
  expect(result.pipeline?.representativeRows[0]).toEqual({
    depthM: 0.01,
    qcKpa: 20,
    fsKpa: 0.3,
    u2Kpa: -2.2,
  });
  expect(result.pipeline?.representativeRows[1]).toEqual({
    depthM: 49.97,
    qcKpa: 36780,
    fsKpa: 828.2,
    u2Kpa: 83.3,
  });
  expect(result.pipeline?.representativeRows.at(-1)).toEqual({
    depthM: 100.3,
    qcKpa: 11610,
    fsKpa: 659.3,
    u2Kpa: -147.9,
  });
  expect(result.patchedValidation).toEqual({ ok: true });
  expect(result.reimport?.ok).toBe(true);
  expect(result.reimport?.pointIds).toHaveLength(1);
  expect(result.reimport?.deletedPointIds).toHaveLength(1);
  expect(result.reimport?.pointIds[0]).not.toBe(result.reimport?.deletedPointIds[0]);
  expect(result.reimportedValidation).toEqual({ ok: true });
  expect(result.persistedReimport?.saved.ok).toBe(true);
  expect(result.persistedReimport?.reloaded).toEqual({ ok: true });
  expect(result.persistedReimport?.validation).toEqual({ ok: true });
  expect(result.persistedReimport?.pointIds[0]).not.toBe(result.persistedReimport?.deletedPointIds[0]);
  expect(result.persistedReimport?.sourceFingerprint).toBeTruthy();
  expect(result.persistedReimport?.sourceFingerprint).toBe(result.source?.sourceFingerprint);
  expect(result.persistedReimport?.representativeRows).toEqual(result.pipeline?.representativeRows);
  expect(result.persistedReimport?.normalizedRows).toBe(7832);
});

