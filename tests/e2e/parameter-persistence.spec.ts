import { expect, test } from './fixtures/isolatedTest';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import {
  applyStratificationCommand,
  commitStratificationEdit,
  createBaseStratificationScheme,
  createStratificationInput,
  emptyStratificationWorkspace,
} from '../../src/features/stratification/stratificationDomain';
import {
  buildParameterInputRows,
  commitParameterSchemeEdit,
  completeParameterInputDerivationRun,
  createParameterScheme,
  emptyParameterWorkspace,
  getCurrentParameterSource,
  prepareParameterInputDerivationRun,
  startParameterInputDerivationRun,
} from '../../src/features/parameters/parameterDomain';
import {
  completeParameterMethodRun,
  configureParameterMethodSlot,
  createLayerRevisionRef,
  prepareParameterMethodRun,
  registerParameterMethodEvidenceRevision,
  startParameterMethodRun,
} from '../../src/features/parameters/parameterMethodDomain';
import { migrateProjectCollectionV1ToV2 } from '../../src/features/workspace/migrateV1ToV2';
import type { ProjectMigrationBundleV2 } from '../../src/features/workspace/workspaceV2';
import { createWorkspace } from './fixtures/projectWorkspace';

test('parameter workspace, exact source lineage, and completed derivation commit atomically in the V2 manifest', async ({ page }) => {
  const bundle = await createParameterBundle();
  const project = bundle.manifest.state.projects[0];
  const point = project.points[0];
  const expectedRun = point.parameterWorkspace?.derivationRuns[0];
  expect(expectedRun).toMatchObject({
    status: 'completed',
    algorithmVersion: 'v1',
    summary: { rowCount: 3, validCount: 3 },
  });

  await page.goto('/?storage-test=parameter-v2');
  const persisted = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const saved = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    const storedPoint = loaded.ok ? loaded.manifest.state.projects[0].points[0] : null;
    const run = storedPoint?.parameterWorkspace?.derivationRuns[0];
    return {
      saved,
      loadOk: loaded.ok,
      parameterSchemeRevisionId: storedPoint?.parameterWorkspace?.revisions[0]?.revisionId ?? null,
      run: run ? {
        runId: run.runId,
        status: run.status,
        formulaSpecHash: run.formulaSpecHash,
        settingsHash: run.settingsHash,
        inputHash: run.inputHash,
        sourceLineageHash: run.sourceLineageHash,
        rowCount: run.derivedRows.length,
        sourceRowIds: run.derivedRows.map((row) => row.sourceRowId),
      } : null,
    };
  }, bundle);

  expect(persisted.saved).toMatchObject({ ok: true });
  expect(persisted).toMatchObject({
    loadOk: true,
    parameterSchemeRevisionId: 'parameter-persistence:revision:1',
    run: {
      runId: 'parameter-persistence:derivation:1',
      status: 'completed',
      rowCount: 3,
      sourceRowIds: point.importDrafts[0].sourceRowIds,
    },
  });
  expect(persisted.run?.formulaSpecHash).toHaveLength(64);
  expect(persisted.run?.settingsHash).toHaveLength(64);
  expect(persisted.run?.inputHash).toHaveLength(64);
  expect(persisted.run?.sourceLineageHash).toHaveLength(64);

  const rejected = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/parameters/parameterDomain.ts');
    const parameterTypes = await import('/src/features/parameters/parameterTypes.ts');
    const hash = await import('/src/features/workspace/stableHash.ts');
    const cases: Array<{ name: string; bundle: ProjectMigrationBundleV2 }> = [];

    const partialFailed = structuredClone(payload);
    const partialRun = partialFailed.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (partialRun) partialRun.status = 'failed';
    cases.push({ name: 'partial-failed-run', bundle: partialFailed });

    const wrongRevision = structuredClone(payload);
    const wrongRevisionRun = wrongRevision.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (wrongRevisionRun) wrongRevisionRun.input.stratificationRevisionId = 'missing-stratification-revision';
    cases.push({ name: 'wrong-stratification-revision', bundle: wrongRevision });

    const wrongSourceRow = structuredClone(payload);
    const wrongSourceRun = wrongSourceRow.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (wrongSourceRun) wrongSourceRun.inputRowsSnapshot[0].sourceRowId = 'source-row-owned-by-nobody';
    cases.push({ name: 'wrong-source-row', bundle: wrongSourceRow });

    const coordinatedMissingSourceRow = structuredClone(payload);
    const missingRowRun = coordinatedMissingSourceRow.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (missingRowRun) {
      missingRowRun.inputRowsSnapshot.pop();
      missingRowRun.inputHash = hash.sha256HexSync(hash.stableStringify(missingRowRun.inputRowsSnapshot));
      const recomputed = domain.deriveParameterInputsV1(missingRowRun.inputRowsSnapshot, missingRowRun.waterDepthM, missingRowRun.settingsSnapshot);
      if (!recomputed.ok) throw new Error(recomputed.problems[0]);
      missingRowRun.derivedRows = recomputed.rows;
      missingRowRun.summary = recomputed.summary;
      missingRowRun.issues = recomputed.issues;
      missingRowRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
        commandId: missingRowRun.commandId,
        schemeRevisionId: missingRowRun.schemeRevisionId,
        sourceLineageHash: missingRowRun.sourceLineageHash,
        formulaSpecHash: missingRowRun.formulaSpecHash,
        settingsHash: missingRowRun.settingsHash,
        inputHash: missingRowRun.inputHash,
        waterDepthM: missingRowRun.waterDepthM,
      }));
    }
    cases.push({ name: 'coordinated-missing-source-row', bundle: coordinatedMissingSourceRow });

    const duplicateCommand = structuredClone(payload);
    const duplicateWorkspace = duplicateCommand.manifest.state.projects[0].points[0].parameterWorkspace;
    if (duplicateWorkspace) {
      const duplicate = structuredClone(duplicateWorkspace.derivationRuns[0]);
      duplicate.runId = 'duplicate-run-id-2';
      duplicate.idempotencyKey = 'different-key-with-same-command';
      duplicateWorkspace.derivationRuns.push(duplicate);
    }
    cases.push({ name: 'duplicate-command', bundle: duplicateCommand });

    const forgedHash = structuredClone(payload);
    const forgedHashRun = forgedHash.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (forgedHashRun) forgedHashRun.settingsHash = 'forged-non-empty-hash';
    cases.push({ name: 'forged-hash', bundle: forgedHash });

    const forgedResult = structuredClone(payload);
    const forgedResultRun = forgedResult.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (forgedResultRun?.derivedRows[0]?.qtn) forgedResultRun.derivedRows[0].qtn += 1;
    cases.push({ name: 'forged-result', bundle: forgedResult });

    const forgedSummary = structuredClone(payload);
    const forgedSummaryRun = forgedSummary.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (forgedSummaryRun?.summary) forgedSummaryRun.summary.validCount = 0;
    cases.push({ name: 'forged-summary', bundle: forgedSummary });

    const reorderedNormalizedRows = structuredClone(payload);
    const normalizedBlock = reorderedNormalizedRows.dataBlocks.find((block) => block.kind === 'normalized');
    if (normalizedBlock?.kind === 'normalized') normalizedBlock.rows.reverse();
    cases.push({ name: 'reordered-normalized-rows', bundle: reorderedNormalizedRows });

    const coordinatedSettingsForgery = structuredClone(payload);
    const coordinatedRun = coordinatedSettingsForgery.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (coordinatedRun) {
      coordinatedRun.settingsSnapshot.netAreaRatio = 0.85;
      coordinatedRun.settingsHash = hash.sha256HexSync(hash.stableStringify(coordinatedRun.settingsSnapshot));
      const recomputed = domain.deriveParameterInputsV1(
        coordinatedRun.inputRowsSnapshot,
        coordinatedRun.waterDepthM,
        coordinatedRun.settingsSnapshot,
      );
      if (!recomputed.ok) throw new Error(recomputed.problems[0]);
      coordinatedRun.derivedRows = recomputed.rows;
      coordinatedRun.summary = recomputed.summary;
      coordinatedRun.issues = recomputed.issues;
      coordinatedRun.formulaSpecHash = hash.sha256HexSync(parameterTypes.PARAMETER_INPUT_DERIVATION_SPEC);
      coordinatedRun.inputHash = hash.sha256HexSync(hash.stableStringify(coordinatedRun.inputRowsSnapshot));
      coordinatedRun.sourceLineageHash = hash.sha256HexSync(hash.stableStringify(coordinatedRun.input));
      coordinatedRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
        commandId: coordinatedRun.commandId,
        schemeRevisionId: coordinatedRun.schemeRevisionId,
        sourceLineageHash: coordinatedRun.sourceLineageHash,
        formulaSpecHash: coordinatedRun.formulaSpecHash,
        settingsHash: coordinatedRun.settingsHash,
        inputHash: coordinatedRun.inputHash,
        waterDepthM: coordinatedRun.waterDepthM,
      }));
    }
    cases.push({ name: 'coordinated-settings-forgery', bundle: coordinatedSettingsForgery });

    const unknownStatus = structuredClone(payload);
    const unknownStatusRun = unknownStatus.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (unknownStatusRun) {
      (unknownStatusRun as unknown as { status: string }).status = 'mystery';
      unknownStatusRun.derivedRows = [];
      unknownStatusRun.summary = null;
      unknownStatusRun.issues = [];
      delete unknownStatusRun.completedAt;
    }
    cases.push({ name: 'unknown-run-status', bundle: unknownStatus });

    const mixedTerminalEvidence = structuredClone(payload);
    const mixedTerminalRun = mixedTerminalEvidence.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (mixedTerminalRun) {
      mixedTerminalRun.status = 'failed';
      mixedTerminalRun.derivedRows = [];
      mixedTerminalRun.summary = null;
      mixedTerminalRun.issues = [];
      mixedTerminalRun.failedAt = '2026-07-10T03:20:00.000Z';
      mixedTerminalRun.errorCode = 'INJECTED';
      mixedTerminalRun.errorMessage = 'Injected mixed state';
    }
    cases.push({ name: 'mixed-terminal-evidence', bundle: mixedTerminalEvidence });

    const results = [];
    for (const candidate of cases) {
      const validation = database.validateMigrationBundleV2(candidate.bundle);
      const save = await database.saveMigrationBundleV2(candidate.bundle);
      results.push({ name: candidate.name, validation, save });
    }
    const loaded = await database.loadActiveWorkspaceV2();
    return {
      results,
      storedRunId: loaded.ok
        ? loaded.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0]?.runId ?? null
        : null,
      storedRunStatus: loaded.ok
        ? loaded.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0]?.status ?? null
        : null,
    };
  }, bundle);

  expect(rejected.results).toHaveLength(12);
  rejected.results.forEach((result) => {
    expect(result.validation.ok, result.name).toBe(false);
    expect(result.save, result.name).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  });
  expect(rejected).toMatchObject({
    storedRunId: 'parameter-persistence:derivation:1',
    storedRunStatus: 'completed',
  });

  const transactionFailure = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const expectedRevision = loaded.manifest.manifestRevision;
    const candidate = structuredClone(loaded.manifest);
    candidate.manifestRevision = expectedRevision + 1;
    candidate.savedAt = new Date().toISOString();
    const blocks = structuredClone(loaded.dataBlocks);
    const normalized = blocks.find((block) => block.kind === 'normalized');
    if (normalized?.kind === 'normalized') {
      (normalized.rows[0] as unknown as Record<string, unknown>).uncloneable = () => 'fail';
    }
    const failed = await database.saveParameterWorkspaceV2(candidate, blocks, { expectedManifestRevision: expectedRevision });
    const after = await database.loadActiveWorkspaceV2();
    return {
      failed,
      storedRevision: after.ok ? after.manifest.manifestRevision : null,
      storedRunStatus: after.ok ? after.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0]?.status : null,
    };
  });
  expect(transactionFailure).toMatchObject({
    failed: { ok: false, reason: 'write-failed', preserved: true },
    storedRevision: bundle.manifest.manifestRevision,
    storedRunStatus: 'completed',
  });

  const directCorruption = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const corrupted = structuredClone(payload.manifest);
    const run = corrupted.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
    if (run?.derivedRows[0]?.ic) run.derivedRows[0].ic += 0.5;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readwrite');
        transaction.objectStore('manifests').put(corrupted);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    const damaged = await database.loadActiveWorkspaceV2();
    const restoreManifest = structuredClone(payload.manifest);
    restoreManifest.manifestRevision = corrupted.manifestRevision + 1;
    restoreManifest.savedAt = new Date().toISOString();
    const restored = await database.saveWorkspaceV2(restoreManifest, payload.dataBlocks, {
      expectedManifestRevision: corrupted.manifestRevision,
    });
    return { damaged, restored };
  }, bundle);
  expect(directCorruption.damaged).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });
  expect(directCorruption.restored).toMatchObject({ ok: true });

});

test('completed parameter method runs persist atomically and reject forged result, evidence, layer, and direct-store corruption', async ({ page }) => {
  const bundle = await createParameterBundle(true);
  const expectedRun = bundle.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
  expect(expectedRun).toMatchObject({
    runId: 'parameter-persistence:method-run:1',
    status: 'completed',
    summary: { rowCount: 3, eligibleValueCount: 3, problemValueCount: 0 },
  });

  await page.goto('/?storage-test=parameter-method-v2');
  const result = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const methods = await import('/src/features/parameters/parameterMethodDomain.ts');
    const hash = await import('/src/features/workspace/stableHash.ts');
    const saved = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    if (!saved.ok || !loaded.ok) throw new Error('Method run fixture did not persist.');

    const cases: Array<{ name: string; bundle: ProjectMigrationBundleV2 }> = [];
    const forgedValue = structuredClone(payload);
    const valueRun = forgedValue.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
    if (valueRun) valueRun.values[0].value = 89.5;
    cases.push({ name: 'forged-method-value', bundle: forgedValue });

    const forgedSummary = structuredClone(payload);
    const summaryRun = forgedSummary.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
    if (summaryRun?.summary) summaryRun.summary.eligibleValueCount = 0;
    cases.push({ name: 'forged-method-summary', bundle: forgedSummary });

    const forgedEvidence = structuredClone(payload);
    const evidenceRun = forgedEvidence.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
    if (evidenceRun) evidenceRun.evidenceSnapshot[0].rate.nominalRateMmPerSec = 10;
    cases.push({ name: 'forged-method-evidence', bundle: forgedEvidence });

    const forgedLayer = structuredClone(payload);
    const layerRun = forgedLayer.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
    if (layerRun) layerRun.inputRowsSnapshot[0].layerRevisionRef = 'other-revision:other-layer';
    cases.push({ name: 'forged-method-layer', bundle: forgedLayer });

    const orphanAuthority = structuredClone(payload);
    const orphanPoint = orphanAuthority.manifest.state.projects[0].points[0];
    const orphanWorkspace = orphanPoint.parameterWorkspace;
    if (!orphanWorkspace) throw new Error('Orphan-authority workspace is required.');
    delete orphanPoint.stratificationWorkspace;
    orphanPoint.stratificationState = { status: 'empty', input: null };
    orphanPoint.parameterState = { status: 'empty', input: null };
    orphanPoint.outputState = { status: 'empty', input: null };
    orphanWorkspace.schemes = [];
    orphanWorkspace.revisions = [];
    orphanWorkspace.derivationRuns = [];
    orphanWorkspace.parameterRuns = [];
    orphanWorkspace.activeSchemeId = null;
    orphanWorkspace.currentSchemeId = null;
    orphanWorkspace.editSession = null;
    cases.push({ name: 'orphan-parameter-authority', bundle: orphanAuthority });

    const rejected = [];
    for (const candidate of cases) {
      const validation = database.validateMigrationBundleV2(candidate.bundle);
      const save = await database.saveMigrationBundleV2(candidate.bundle);
      rejected.push({ name: candidate.name, validation, save });
    }

    const coordinated = structuredClone(loaded.manifest);
    const coordinatedWorkspace = coordinated.state.projects[0].points[0].parameterWorkspace;
    if (!coordinatedWorkspace) throw new Error('Coordinated-forgery workspace is required.');
    const materialRevision = coordinatedWorkspace.methodEvidenceRevisions?.find((revision) => revision.kind === 'material_applicability');
    const methodRun = coordinatedWorkspace.parameterRuns[0];
    if (!materialRevision || materialRevision.kind !== 'material_applicability' || !methodRun) throw new Error('Method authority fixtures are required.');
    materialRevision.payload.status = 'scope_unknown';
    materialRevision.payload.materialClass = 'unknown';
    materialRevision.contentHash = hash.sha256HexSync(hash.stableStringify({ kind: materialRevision.kind, payload: materialRevision.payload }));
    methodRun.evidenceSnapshot[0].material = structuredClone(materialRevision.payload);
    methodRun.evidenceHash = hash.sha256HexSync(hash.stableStringify(methodRun.evidenceSnapshot));
    methodRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
      commandId: methodRun.commandId,
      schemeRevisionId: methodRun.schemeRevisionId,
      derivationRunId: methodRun.derivationRunId,
      slotId: methodRun.slotId,
      sourceLineageHash: methodRun.sourceLineageHash,
      formulaSpecHash: methodRun.formulaSpecHash,
      settingsHash: methodRun.settingsHash,
      evidenceHash: methodRun.evidenceHash,
      inputHash: methodRun.inputHash,
    }));
    methodRun.status = 'running';
    methodRun.values = [];
    methodRun.layerSummaries = [];
    methodRun.summary = null;
    methodRun.issues = [];
    methodRun.resultHash = null;
    delete methodRun.completedAt;
    const recompleted = methods.completeParameterMethodRun(coordinatedWorkspace, methodRun.runId, '2026-07-10T03:20:00.000Z');
    if (!recompleted.ok) throw new Error(recompleted.problem);
    coordinated.state.projects[0].points[0].parameterWorkspace = recompleted.workspace;
    coordinated.manifestRevision = loaded.manifest.manifestRevision + 1;
    coordinated.savedAt = '2026-07-10T03:20:00.000Z';
    const coordinatedBundle = { manifest: coordinated, dataBlocks: loaded.dataBlocks, migrationRecord: loaded.migrationRecord };
    const coordinatedValidation = database.validateMigrationBundleV2(coordinatedBundle);
    const coordinatedSave = await database.saveParameterWorkspaceV2(coordinated, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });

    const terminalRewrite = structuredClone(loaded.manifest);
    const terminalWorkspace = terminalRewrite.state.projects[0].points[0].parameterWorkspace;
    if (!terminalWorkspace) throw new Error('Terminal-rewrite workspace is required.');
    const appendedMaterial = methods.registerParameterMethodEvidenceRevision(terminalWorkspace, {
      evidenceId: 'parameter-persistence:material',
      revisionId: 'parameter-persistence:material:rev:2',
      kind: 'material_applicability',
      payload: {
        status: 'scope_unknown',
        materialClass: 'unknown',
        sourceRevisionId: 'material-persistence-source-rev-2',
        confirmedAt: '2026-07-10T03:21:00.000Z',
        note: 'Append-only terminal rewrite probe.',
      },
      now: '2026-07-10T03:21:00.000Z',
    });
    if (!appendedMaterial.ok) throw new Error(appendedMaterial.problem);
    const rewrittenRun = appendedMaterial.workspace.parameterRuns[0];
    rewrittenRun.evidenceSnapshot[0].material = structuredClone(appendedMaterial.revision.payload);
    rewrittenRun.evidenceSnapshot[0].evidenceRevisionRefs.material = appendedMaterial.revision.revisionId;
    rewrittenRun.evidenceHash = hash.sha256HexSync(hash.stableStringify(rewrittenRun.evidenceSnapshot));
    rewrittenRun.idempotencyKey = hash.sha256HexSync(hash.stableStringify({
      commandId: rewrittenRun.commandId,
      schemeRevisionId: rewrittenRun.schemeRevisionId,
      derivationRunId: rewrittenRun.derivationRunId,
      slotId: rewrittenRun.slotId,
      sourceLineageHash: rewrittenRun.sourceLineageHash,
      formulaSpecHash: rewrittenRun.formulaSpecHash,
      settingsHash: rewrittenRun.settingsHash,
      evidenceHash: rewrittenRun.evidenceHash,
      inputHash: rewrittenRun.inputHash,
    }));
    rewrittenRun.status = 'running';
    rewrittenRun.values = [];
    rewrittenRun.layerSummaries = [];
    rewrittenRun.summary = null;
    rewrittenRun.issues = [];
    rewrittenRun.resultHash = null;
    delete rewrittenRun.completedAt;
    const terminalRecompleted = methods.completeParameterMethodRun(
      appendedMaterial.workspace,
      rewrittenRun.runId,
      '2026-07-10T03:22:00.000Z',
    );
    if (!terminalRecompleted.ok) throw new Error(terminalRecompleted.problem);
    terminalRewrite.state.projects[0].points[0].parameterWorkspace = terminalRecompleted.workspace;
    terminalRewrite.manifestRevision = loaded.manifest.manifestRevision + 1;
    terminalRewrite.savedAt = '2026-07-10T03:22:00.000Z';
    const terminalBundle = { manifest: terminalRewrite, dataBlocks: loaded.dataBlocks, migrationRecord: loaded.migrationRecord };
    const terminalValidation = database.validateMigrationBundleV2(terminalBundle);
    const terminalSave = await database.saveParameterWorkspaceV2(terminalRewrite, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });

    const schemeRewrite = structuredClone(loaded.manifest);
    const schemeWorkspace = schemeRewrite.state.projects[0].points[0].parameterWorkspace;
    if (!schemeWorkspace) throw new Error('Scheme-rewrite workspace is required.');
    const scheme = schemeWorkspace.schemes[0];
    const schemeRevision = schemeWorkspace.revisions.find((revision) => revision.schemeId === scheme.schemeId);
    if (!schemeRevision) throw new Error('Scheme revision is required.');
    scheme.name = 'Forged renamed scheme';
    schemeRevision.snapshot.name = scheme.name;
    schemeRewrite.manifestRevision = loaded.manifest.manifestRevision + 1;
    schemeRewrite.savedAt = '2026-07-10T03:23:00.000Z';
    const schemeBundle = { manifest: schemeRewrite, dataBlocks: loaded.dataBlocks, migrationRecord: loaded.migrationRecord };
    const schemeValidation = database.validateMigrationBundleV2(schemeBundle);
    const schemeSave = await database.saveParameterWorkspaceV2(schemeRewrite, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });

    const wrongSite = structuredClone(loaded.manifest);
    const wrongSiteWorkspace = wrongSite.state.projects[0].points[0].parameterWorkspace;
    if (!wrongSiteWorkspace) throw new Error('Wrong-site workspace is required.');
    const registeredWrongSite = methods.registerParameterReferenceTestRevision(wrongSiteWorkspace, {
      testId: 'parameter-persistence:test:wrong-site',
      revisionId: 'parameter-persistence:test:wrong-site:rev:1',
      projectId: wrongSite.state.projects[0].projectId,
      siteId: 'site-other',
      pointId: wrongSite.state.projects[0].points[0].pointId,
      materialClass: 'clay',
      depthM: 2,
      testType: 'CAUC',
      strengthMode: 'triaxial_compression',
      failureCriterion: 'peak_deviator_stress',
      sucKpa: 50,
      createdAt: '2026-07-10T03:24:00.000Z',
    });
    if (!registeredWrongSite.ok) throw new Error(registeredWrongSite.problem);
    wrongSite.state.projects[0].points[0].parameterWorkspace = registeredWrongSite.workspace;
    wrongSite.manifestRevision = loaded.manifest.manifestRevision + 1;
    wrongSite.savedAt = '2026-07-10T03:24:00.000Z';
    const wrongSiteBundle = { manifest: wrongSite, dataBlocks: loaded.dataBlocks, migrationRecord: loaded.migrationRecord };
    const wrongSiteValidation = database.validateMigrationBundleV2(wrongSiteBundle);
    const wrongSiteSave = await database.saveParameterWorkspaceV2(wrongSite, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });

    const swappedManifest = structuredClone(loaded.manifest);
    swappedManifest.manifestId = `${loaded.manifest.manifestId}:swapped`;
    swappedManifest.manifestRevision = loaded.manifest.manifestRevision + 1;
    const swappedSave = await database.saveParameterWorkspaceV2(swappedManifest, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });
    const swappedGenericSave = await database.saveWorkspaceV2(swappedManifest, loaded.dataBlocks);

    const deletedAuthorityProject = structuredClone(loaded.manifest);
    deletedAuthorityProject.state.projects = [];
    deletedAuthorityProject.state.activeProjectId = null;
    deletedAuthorityProject.manifestRevision = loaded.manifest.manifestRevision + 1;
    const deletedAuthorityProjectSave = await database.saveParameterWorkspaceV2(
      deletedAuthorityProject,
      [],
      { expectedManifestRevision: loaded.manifest.manifestRevision },
    );

    const putManifestDirectly = (manifest: ProjectMigrationBundleV2['manifest']) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readwrite');
        transaction.objectStore('manifests').put(manifest);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    const removedAuthority = structuredClone(loaded.manifest);
    const removedAuthorityPoint = removedAuthority.state.projects[0].points[0];
    delete removedAuthorityPoint.parameterWorkspace;
    removedAuthorityPoint.parameterState = { status: 'empty', input: null };
    removedAuthorityPoint.outputState = { status: 'empty', input: null };
    await putManifestDirectly(removedAuthority);
    const removedAuthorityDamaged = await database.loadActiveWorkspaceV2();
    await putManifestDirectly(terminalRewrite);
    const damaged = await database.loadActiveWorkspaceV2();
    return {
      saved,
      loadedRun: loaded.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0] ?? null,
      rejected,
      coordinatedValidation,
      coordinatedSave,
      terminalValidation,
      terminalSave,
      schemeValidation,
      schemeSave,
      wrongSiteValidation,
      wrongSiteSave,
      swappedSave,
      swappedGenericSave,
      deletedAuthorityProjectSave,
      removedAuthorityDamaged,
      damaged,
    };
  }, bundle);

  expect(result.saved).toMatchObject({ ok: true });
  expect(result.loadedRun).toMatchObject({ status: 'completed', summary: { eligibleValueCount: 3 } });
  expect(result.rejected).toHaveLength(5);
  result.rejected.forEach((entry) => {
    expect(entry.validation.ok, entry.name).toBe(false);
    expect(entry.save, entry.name).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  });
  expect(result.coordinatedValidation).toEqual({ ok: true });
  expect(result.coordinatedSave).toMatchObject({ ok: false, reason: 'conflict', detail: expect.stringContaining('append-only') });
  expect(result.terminalValidation).toEqual({ ok: true });
  expect(result.terminalSave).toMatchObject({ ok: false, reason: 'conflict', detail: expect.stringContaining('immutable') });
  expect(result.schemeValidation).toEqual({ ok: true });
  expect(result.schemeSave).toMatchObject({ ok: false, reason: 'conflict', detail: expect.stringContaining('immutable') });
  expect(result.wrongSiteValidation).toMatchObject({ ok: false, detail: expect.stringContaining('site') });
  expect(result.wrongSiteSave).toMatchObject({ ok: false, reason: 'invalid-bundle', preserved: true });
  expect(result.swappedSave).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(result.swappedGenericSave).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(result.deletedAuthorityProjectSave).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(result.removedAuthorityDamaged).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });
  expect(result.damaged).toMatchObject({ ok: false, reason: 'invalid-manifest', preserved: true });

});

test('parameter method cancellation wins against a stale completion through the same mandatory CAS boundary', async ({ page }) => {
  const bundle = await createParameterBundle(true);
  const run = bundle.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0];
  if (!run) throw new Error('Parameter method run is required.');
  run.status = 'running';
  run.values = [];
  run.layerSummaries = [];
  run.summary = null;
  run.issues = [];
  run.resultHash = null;
  delete run.completedAt;

  await page.goto('/?storage-test=parameter-method-race');
  const race = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const methods = await import('/src/features/parameters/parameterMethodDomain.ts');
    const initial = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    if (!initial.ok || !loaded.ok) throw new Error('Initial method-running snapshot was not stored.');
    const expectedRevision = loaded.manifest.manifestRevision;
    const baseline = structuredClone(loaded.manifest);
    const workspace = baseline.state.projects[0].points[0].parameterWorkspace;
    if (!workspace) throw new Error('Parameter workspace is required.');

    const requested = methods.requestParameterMethodRunCancellation(workspace, 'parameter-persistence:method-run:1', '2026-07-10T03:11:00.000Z');
    if (!requested.ok) throw new Error(requested.problem);
    const cancelled = methods.finalizeParameterMethodRunCancellation(requested.workspace, 'parameter-persistence:method-run:1', '2026-07-10T03:12:00.000Z');
    if (!cancelled.ok) throw new Error(cancelled.problem);
    const cancellationManifest = structuredClone(baseline);
    cancellationManifest.state.projects[0].points[0].parameterWorkspace = cancelled.workspace;
    cancellationManifest.manifestRevision = expectedRevision + 1;
    cancellationManifest.savedAt = '2026-07-10T03:12:00.000Z';
    const cancellationSave = await database.saveParameterWorkspaceV2(cancellationManifest, loaded.dataBlocks, { expectedManifestRevision: expectedRevision });

    const staleWorkspace = baseline.state.projects[0].points[0].parameterWorkspace;
    if (!staleWorkspace) throw new Error('Stale parameter workspace is required.');
    const completed = methods.completeParameterMethodRun(staleWorkspace, 'parameter-persistence:method-run:1', '2026-07-10T03:13:00.000Z');
    if (!completed.ok) throw new Error(completed.problem);
    const staleManifest = structuredClone(baseline);
    staleManifest.state.projects[0].points[0].parameterWorkspace = completed.workspace;
    staleManifest.manifestRevision = expectedRevision + 1;
    staleManifest.savedAt = '2026-07-10T03:13:00.000Z';
    const staleSave = await database.saveParameterWorkspaceV2(staleManifest, loaded.dataBlocks, { expectedManifestRevision: expectedRevision });
    const final = await database.loadActiveWorkspaceV2();
    return {
      cancellationSave,
      staleSave,
      finalRun: final.ok ? final.manifest.state.projects[0].points[0].parameterWorkspace?.parameterRuns[0] : null,
    };
  }, bundle);

  expect(race.cancellationSave).toMatchObject({ ok: true });
  expect(race.staleSave).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(race.finalRun).toMatchObject({ status: 'cancelled', values: [], resultHash: null });
});

test('parameter cancellation wins against a stale completion through mandatory manifest CAS', async ({ page }) => {
  const bundle = await createParameterBundle();
  const run = bundle.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0];
  if (!run) throw new Error('Parameter derivation run is required.');
  run.status = 'running';
  run.derivedRows = [];
  run.summary = null;
  run.issues = [];
  delete run.completedAt;

  await page.goto('/?storage-test=parameter-race');
  const race = await page.evaluate(async (payload: ProjectMigrationBundleV2) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/parameters/parameterDomain.ts');
    const initial = await database.saveMigrationBundleV2(payload);
    const loaded = await database.loadActiveWorkspaceV2();
    if (!initial.ok || !loaded.ok) throw new Error('Initial running snapshot was not stored.');
    const expectedRevision = loaded.manifest.manifestRevision;
    const baseline = structuredClone(loaded.manifest);
    const point = baseline.state.projects[0].points[0];
    if (!point.parameterWorkspace) throw new Error('Parameter workspace is required.');

    const requested = domain.requestParameterInputDerivationCancellation(
      point.parameterWorkspace,
      'parameter-persistence:derivation:1',
      '2026-07-10T03:10:00.000Z',
    );
    if (!requested.ok) throw new Error(requested.problem);
    const cancelled = domain.finalizeParameterInputDerivationCancellation(
      requested.workspace,
      'parameter-persistence:derivation:1',
      '2026-07-10T03:11:00.000Z',
    );
    if (!cancelled.ok) throw new Error(cancelled.problem);
    const cancellationManifest = structuredClone(baseline);
    cancellationManifest.state.projects[0].points[0].parameterWorkspace = cancelled.workspace;
    cancellationManifest.manifestRevision = expectedRevision + 1;
    cancellationManifest.savedAt = '2026-07-10T03:11:00.000Z';
    const cancellationSave = await database.saveParameterWorkspaceV2(
      cancellationManifest,
      loaded.dataBlocks,
      { expectedManifestRevision: expectedRevision },
    );

    const stalePoint = baseline.state.projects[0].points[0];
    if (!stalePoint.parameterWorkspace) throw new Error('Stale parameter workspace is required.');
    const completed = domain.completeParameterInputDerivationRun(
      stalePoint.parameterWorkspace,
      'parameter-persistence:derivation:1',
      '2026-07-10T03:12:00.000Z',
    );
    if (!completed.ok) throw new Error(completed.problem);
    const staleCompletionManifest = structuredClone(baseline);
    staleCompletionManifest.state.projects[0].points[0].parameterWorkspace = completed.workspace;
    staleCompletionManifest.manifestRevision = expectedRevision + 1;
    staleCompletionManifest.savedAt = '2026-07-10T03:12:00.000Z';
    const staleCompletionSave = await database.saveParameterWorkspaceV2(
      staleCompletionManifest,
      loaded.dataBlocks,
      { expectedManifestRevision: expectedRevision },
    );
    const generalSaveBypass = await database.saveWorkspaceV2(staleCompletionManifest, loaded.dataBlocks);
    const final = await database.loadActiveWorkspaceV2();
    return {
      cancellationSave,
      staleCompletionSave,
      generalSaveBypass,
      finalRevision: final.ok ? final.manifest.manifestRevision : null,
      finalRun: final.ok ? final.manifest.state.projects[0].points[0].parameterWorkspace?.derivationRuns[0] : null,
    };
  }, bundle);

  expect(race.cancellationSave).toMatchObject({ ok: true });
  expect(race.staleCompletionSave).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(race.generalSaveBypass).toMatchObject({ ok: false, reason: 'conflict', preserved: true });
  expect(race.finalRevision).toBe(bundle.manifest.manifestRevision + 1);
  expect(race.finalRun).toMatchObject({ status: 'cancelled', derivedRows: [], summary: null });

});

async function createParameterBundle(withMethodRun = false) {
  const legacy = createWorkspace('project-parameter-persistence', '参数持久化项目');
  const rows = [
    { pointName: 'PAR-01', depthM: 0.1, qcKpa: 1900, qtKpa: 2000, fsKpa: 20, u2Kpa: 150, frPercent: 1.05, waterDepthM: 20, finalDepthM: 10 },
    { pointName: 'PAR-01', depthM: 2, qcKpa: 5300, qtKpa: 5500, fsKpa: 50, u2Kpa: 200, frPercent: 0.95, waterDepthM: 20, finalDepthM: 10 },
    { pointName: 'PAR-01', depthM: 6, qcKpa: 2500, qtKpa: 2600, fsKpa: 35, u2Kpa: 500, frPercent: 1.6, waterDepthM: 20, finalDepthM: 10 },
  ];
  legacy.flowCase.point = {
    pointId: 'point-parameter-persistence',
    pointName: 'PAR-01',
    pointAlias: 'PAR-01-A',
    waterDepthM: 20,
    finalDepthM: 10,
  };
  legacy.flowCase.rows = rows;
  legacy.importDraft = {
    sourceMode: 'uploaded-csv',
    fileName: 'parameter-persistence.csv',
    fileType: 'CSV',
    status: 'ready',
    message: 'CSV 已解析。',
    version: 3,
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
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
    pointName: 'PAR-01',
    filePointNames: ['PAR-01'],
    pointDecision: 'matches-current',
    waterDepthM: 20,
    finalDepthM: 10,
    generatedAt: '2026-07-10T03:00:00.000Z',
  };
  const bundle = await migrateProjectCollectionV1ToV2(
    createProjectCollectionState([legacy], legacy.projectId),
    { sourceSavedAt: '2026-07-10T03:00:00.000Z', migratedAt: '2026-07-10T03:01:00.000Z' },
  );
  const point = bundle.manifest.state.projects[0].points[0];
  point.siteId = 'site-parameter-persistence';
  const draft = point.importDrafts[0];
  const dependency = {
    pointId: point.pointId,
    draftId: draft.draftId,
    batchId: draft.batchId,
    revisions: { ...draft.revisions },
  };
  point.checkState = {
    activeRunId: 'check-parameter-persistence',
    runs: [{
      runId: 'check-parameter-persistence',
      input: dependency,
      status: 'completed',
      counts: { issue: 0, notice: 0, passed: rows.length },
      conclusion: '无问题',
      issueIds: [],
      createdAt: '2026-07-10T03:02:00.000Z',
      completedAt: '2026-07-10T03:02:00.000Z',
    }],
    legacyHistory: [],
    artifact: { status: 'current', input: dependency },
  };

  const stratificationInput = createStratificationInput(dependency, 'check-parameter-persistence');
  const createdStratification = createBaseStratificationScheme(
    emptyStratificationWorkspace(),
    stratificationInput,
    0,
    10,
    '参数来源分层',
    '2026-07-10T03:03:00.000Z',
    'stratification-parameter-persistence',
  );
  if (!createdStratification.ok) throw new Error(createdStratification.problem);
  const configuredStratification = applyStratificationCommand(createdStratification.workspace, {
    kind: 'set-layer-soil-group',
    layerId: createdStratification.scheme.layers[0].layerId,
    engineeringSoilGroup: 'sand',
  });
  if (!configuredStratification.ok) throw new Error(configuredStratification.problem);
  const committedStratification = commitStratificationEdit(
    configuredStratification.workspace,
    stratificationInput,
    '2026-07-10T03:04:00.000Z',
  );
  if (!committedStratification.ok) throw new Error(committedStratification.problem);
  const stratificationRevision = committedStratification.workspace.revisions?.find((revision) =>
    revision.schemeId === committedStratification.scheme.schemeId
    && revision.version === committedStratification.scheme.version,
  );
  if (!stratificationRevision) throw new Error('Exact stratification revision is required.');
  point.stratificationWorkspace = committedStratification.workspace;
  point.stratificationState = {
    status: 'current',
    input: dependency,
    sourceCheckRunId: 'check-parameter-persistence',
    sourceStratificationSchemeId: committedStratification.scheme.schemeId,
    sourceStratificationRevisionId: stratificationRevision.revisionId,
  };

  const parameterSource = getCurrentParameterSource(point);
  if (!parameterSource.ok) throw new Error(parameterSource.problem);
  const createdParameter = createParameterScheme(
    emptyParameterWorkspace(),
    parameterSource.input,
    '参数持久化方案',
    '2026-07-10T03:05:00.000Z',
    'parameter-persistence',
  );
  if (!createdParameter.ok) throw new Error(createdParameter.problem);
  const parameterDraft = withMethodRun
    ? configureParameterMethodSlot(createdParameter.workspace, {
        slotId: 'parameter-persistence:slot:phi',
        parameterKey: 'PhiDeg',
        targetScope: {
          layerIds: [stratificationRevision.snapshot.layers[0].layerId],
          depthFromM: 0,
          depthToM: 10,
          excludedIntervals: [],
        },
        settings: { kind: 'phi_peak_qtn_v1' },
      })
    : { ok: true as const, workspace: createdParameter.workspace };
  if (!parameterDraft.ok) throw new Error(parameterDraft.problem);
  const committedParameter = commitParameterSchemeEdit(
    parameterDraft.workspace,
    parameterSource.input,
    '2026-07-10T03:06:00.000Z',
    'parameter-persistence:revision:1',
  );
  if (!committedParameter.ok) throw new Error(committedParameter.problem);
  const block = bundle.dataBlocks.find((candidate) => candidate.dataBlockId === draft.dataBlockId);
  if (!block) throw new Error('Normalized data block is required.');
  const inputRows = buildParameterInputRows(point, block);
  if (!inputRows.ok) throw new Error(inputRows.problem);
  const prepared = await prepareParameterInputDerivationRun(
    committedParameter.workspace,
    'parameter-persistence:revision:1',
    inputRows.rows,
    point.waterDepthM,
    'parameter-persistence:command:1',
    '2026-07-10T03:07:00.000Z',
    'parameter-persistence:derivation:1',
  );
  if (!prepared.ok) throw new Error(prepared.problem);
  const started = startParameterInputDerivationRun(prepared.workspace, prepared.run.runId, '2026-07-10T03:08:00.000Z');
  if (!started.ok) throw new Error(started.problem);
  const completed = completeParameterInputDerivationRun(started.workspace, prepared.run.runId, '2026-07-10T03:09:00.000Z');
  if (!completed.ok) throw new Error(completed.problem);
  if (withMethodRun) {
    const layer = stratificationRevision.snapshot.layers[0];
    const rate = registerParameterMethodEvidenceRevision(completed.workspace, {
      evidenceId: 'parameter-persistence:rate', revisionId: 'parameter-persistence:rate:rev:1', kind: 'penetration_rate',
      payload: {
        status: 'standard_confirmed', nominalRateMmPerSec: 20, unit: 'mm/s', sourceType: 'test_report',
        sourceRevisionId: 'rate-persistence-source-rev-1', confirmedAt: '2026-07-10T03:09:10.000Z',
      },
    });
    if (!rate.ok) throw new Error(rate.problem);
    const drainage = registerParameterMethodEvidenceRevision(rate.workspace, {
      evidenceId: 'parameter-persistence:drainage', revisionId: 'parameter-persistence:drainage:rev:1', kind: 'drainage_applicability',
      payload: {
        status: 'confirmed_drained', evidenceType: 'cptu_pore_pressure_response',
        sourceRevisionId: 'drainage-persistence-source-rev-1', confirmedAt: '2026-07-10T03:09:20.000Z', note: 'Persistence fixture.',
      },
    });
    if (!drainage.ok) throw new Error(drainage.problem);
    const material = registerParameterMethodEvidenceRevision(drainage.workspace, {
      evidenceId: 'parameter-persistence:material', revisionId: 'parameter-persistence:material:rev:1', kind: 'material_applicability',
      payload: {
        status: 'within_source_scope', materialClass: 'quartz_silica_uncemented_sand',
        sourceRevisionId: 'material-persistence-source-rev-1', confirmedAt: '2026-07-10T03:09:30.000Z', note: 'Persistence fixture.',
      },
    });
    if (!material.ok) throw new Error(material.problem);
    const preparedMethod = prepareParameterMethodRun({
      projectId: bundle.manifest.state.projects[0].projectId,
      workspace: material.workspace,
      schemeRevisionId: committedParameter.revision.revisionId,
      derivationRunId: completed.run.runId,
      slotId: 'parameter-persistence:slot:phi',
      stratificationRevision,
      layerEvidence: [{
        layerId: layer.layerId,
        layerRevisionRef: createLayerRevisionRef(stratificationRevision.revisionId, layer.layerId),
        layerGroup: 'sand',
        environment: 'offshore',
        evidenceRevisionRefs: {
          rate: rate.revision.revisionId,
          drainage: drainage.revision.revisionId,
          material: material.revision.revisionId,
          conflictContext: null,
        },
      }],
      commandId: 'parameter-persistence:method-command:1',
      now: '2026-07-10T03:09:40.000Z',
      runId: 'parameter-persistence:method-run:1',
    });
    if (!preparedMethod.ok) throw new Error(preparedMethod.problem);
    const startedMethod = startParameterMethodRun(preparedMethod.workspace, preparedMethod.run.runId, '2026-07-10T03:09:50.000Z');
    if (!startedMethod.ok) throw new Error(startedMethod.problem);
    const completedMethod = completeParameterMethodRun(startedMethod.workspace, preparedMethod.run.runId, '2026-07-10T03:10:00.000Z');
    if (!completedMethod.ok) throw new Error(completedMethod.problem);
    point.parameterWorkspace = completedMethod.workspace;
  } else {
    point.parameterWorkspace = completed.workspace;
  }
  return bundle;
}
