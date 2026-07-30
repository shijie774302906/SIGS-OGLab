import type {
  ArtifactDependency,
  ImportBatchDraftV2,
  ImportDataBlockV2,
  JtsClassificationRunV4,
  MigrationRecordV2,
  ProjectManifestV2,
  ProjectMigrationBundleV2,
  ProjectWorkspaceV2,
  StratificationRuleRunV1,
  StratificationSchemeV2,
  StratificationWorkspaceV2,
} from './workspaceV2';
import { artifactDependenciesEqual, computeNormalizedPointDataHash, getActiveImportDependency, PROJECT_MANIFEST_SCHEMA, PROJECT_MANIFEST_VERSION, selectCurrentCheckResult } from './workspaceV2';
import { PROTOTYPE_STRATIFICATION_EDIT_SPACING_M } from '../stratification/stratificationConstants';
import { validateStratificationRuleRunStructure } from '../stratification/stratificationRuleDomain';
import { validateJtsClassificationRun } from '../stratification/jtsClassificationDomain';
import { sameParameterSource, validateParameterWorkspaceStructure } from '../parameters/parameterDomain';
import { createLayerRevisionRef, validateParameterMethodRunStructure } from '../parameters/parameterMethodDomain';
import { validateJtsParameterPackageRun } from '../parameters/jtsParameterPackageDomain';
import { validateJtsDissipationWorkspace } from '../parameters/jtsDissipationDomain';
import { validateJtsOutputRevision } from '../output/jtsOutputDomain';
import type { ParameterInputDerivationRunV2, ParameterRunV2, ParameterSourceLineageV2 } from '../parameters/parameterTypes';
import { sha256HexSync, stableStringify } from './stableHash';
import { calculateJtsCorrectedQtKpa, deriveJtsSeries, type JtsSeriesContext } from '../jts/jtsT242Domain';

export const WORKSPACE_DATABASE_NAME = 'sigs-oglab-workspace-v3';
export const WORKSPACE_DATABASE_VERSION = 1;
export const WORKSPACE_BOOT_POINTER_KEY = 'sigs-oglab.workspace-v3.pointer';

const stores = {
  manifests: 'manifests',
  dataBlocks: 'data-blocks',
  migrations: 'migration-records',
  metadata: 'metadata',
} as const;

const activeManifestMetadataKey = 'active-manifest-id';

type WorkspaceMetadataRecord = { key: string; value: string; updatedAt: string };

export type WorkspaceDatabaseLoadResult =
  | {
      ok: true;
      manifest: ProjectManifestV2;
      dataBlocks: ImportDataBlockV2[];
      migrationRecord: MigrationRecordV2 | null;
    }
  | {
      ok: false;
      reason: 'unavailable' | 'empty' | 'open-failed' | 'read-failed' | 'invalid-manifest' | 'missing-data-block';
      detail: string;
      preserved: true;
    };

export type WorkspaceDatabaseWriteResult =
  | { ok: true; manifestId: string; bootPointerSaved: boolean }
  | {
      ok: false;
      reason: 'unavailable' | 'open-failed' | 'invalid-bundle' | 'write-failed' | 'conflict';
      detail: string;
      preserved: true;
    };

export async function saveMigrationBundleV2(
  bundle: ProjectMigrationBundleV2,
  options: { factory?: IDBFactory; bootStorage?: Storage | null } = {},
): Promise<WorkspaceDatabaseWriteResult> {
  const validation = validateMigrationBundleV2(bundle);
  if (!validation.ok) {
    return { ok: false, reason: 'invalid-bundle', detail: validation.detail, preserved: true };
  }
  return saveWorkspaceV2(bundle.manifest, bundle.dataBlocks, {
    ...options,
    migrationRecord: bundle.migrationRecord,
  });
}

export async function saveWorkspaceV2(
  manifest: ProjectManifestV2,
  dataBlocks: ImportDataBlockV2[],
  options: {
    factory?: IDBFactory;
    bootStorage?: Storage | null;
    migrationRecord?: MigrationRecordV2 | null;
    expectedManifestRevision?: number;
    writeDataBlocks?: boolean;
  } = {},
): Promise<WorkspaceDatabaseWriteResult> {
  const validation = validateManifestReferences(manifest, dataBlocks);
  if (!validation.ok) {
    return { ok: false, reason: 'invalid-bundle', detail: validation.detail, preserved: true };
  }
  if (options.migrationRecord && options.migrationRecord.targetManifestId !== manifest.manifestId) {
    return { ok: false, reason: 'invalid-bundle', detail: 'Migration record target does not match the manifest.', preserved: true };
  }
  const factory = options.factory ?? getIndexedDbFactory();
  if (!factory) return { ok: false, reason: 'unavailable', detail: 'IndexedDB is not available.', preserved: true };

  let database: IDBDatabase;
  try {
    database = await openWorkspaceDatabase(factory);
  } catch (error) {
    return { ok: false, reason: 'open-failed', detail: errorMessage(error), preserved: true };
  }

  let transaction: IDBTransaction | null = null;
  try {
    const activeTransaction = database.transaction(Object.values(stores), 'readwrite');
    transaction = activeTransaction;
    const activeMetadata = await requestResult<WorkspaceMetadataRecord | undefined>(
      activeTransaction.objectStore(stores.metadata).get(activeManifestMetadataKey),
    );
    const currentManifest = activeMetadata?.value
      ? await requestResult<ProjectManifestV2 | undefined>(activeTransaction.objectStore(stores.manifests).get(activeMetadata.value))
      : undefined;
    if (currentManifest && currentManifest.manifestId !== manifest.manifestId) {
      activeTransaction.abort();
      database.close();
      return {
        ok: false,
        reason: 'conflict',
        detail: `An active workspace cannot replace manifest ${currentManifest.manifestId} with ${manifest.manifestId} through a normal save.`,
        preserved: true,
      };
    }
    if (currentManifest && currentManifest.manifestId === manifest.manifestId) {
      const storedAuthorityDigest = await requestResult<WorkspaceMetadataRecord | undefined>(
        activeTransaction.objectStore(stores.metadata).get(interpretationAuthorityDigestKey(currentManifest.manifestId)),
      );
      const currentAuthorityDigestRequired = Boolean(storedAuthorityDigest) || manifestHasImmutableInterpretationAuthority(currentManifest);
      const currentAuthorityDamaged = currentAuthorityDigestRequired
        && storedAuthorityDigest?.value !== interpretationAuthorityDigest(currentManifest);
      const authorityMutation = currentAuthorityDamaged
        ? storedAuthorityDigest?.value === interpretationAuthorityDigest(manifest)
          ? { ok: true as const }
          : { ok: false as const, detail: 'Damaged parameter authority can only be restored to its last external digest.' }
        : validateInterpretationAuthorityAppendOnly(currentManifest, manifest);
      if (!authorityMutation.ok) {
        activeTransaction.abort();
        database.close();
        return { ok: false, reason: 'conflict', detail: authorityMutation.detail, preserved: true };
      }
    }
    if (options.expectedManifestRevision !== undefined) {
      if (currentManifest && currentManifest.manifestRevision !== options.expectedManifestRevision) {
        activeTransaction.abort();
        database.close();
        return {
          ok: false,
          reason: 'conflict',
          detail: `Expected manifest revision ${options.expectedManifestRevision}, found ${currentManifest.manifestRevision}.`,
          preserved: true,
        };
      }
    }
    const interpretationAuthorityChanged = Boolean(
      currentManifest
      && currentManifest.manifestId === manifest.manifestId
      && stableStringify(immutableInterpretationProjection(currentManifest)) !== stableStringify(immutableInterpretationProjection(manifest)),
    );
    if (interpretationAuthorityChanged && (
      options.expectedManifestRevision === undefined
      || manifest.manifestRevision <= options.expectedManifestRevision
    )) {
      activeTransaction.abort();
      database.close();
      return {
        ok: false,
        reason: 'conflict',
        detail: 'Immutable interpretation changes require an exact compare-and-swap manifest revision.',
        preserved: true,
      };
    }
    const referencedBlockIds = new Set(collectReferencedDataBlockIds(manifest));
    const storedBlockIds = await requestResult<IDBValidKey[]>(activeTransaction.objectStore(stores.dataBlocks).getAllKeys());
    storedBlockIds.forEach((blockId) => {
      if (typeof blockId === 'string' && !referencedBlockIds.has(blockId)) {
        activeTransaction.objectStore(stores.dataBlocks).delete(blockId);
      }
    });
    activeTransaction.objectStore(stores.manifests).put(manifest);
    if (options.writeDataBlocks !== false) {
      dataBlocks
        .filter((block) => referencedBlockIds.has(block.dataBlockId))
        .forEach((block) => activeTransaction.objectStore(stores.dataBlocks).put(block));
    }
    if (options.migrationRecord) activeTransaction.objectStore(stores.migrations).put(options.migrationRecord);
    const metadata: WorkspaceMetadataRecord = {
      key: activeManifestMetadataKey,
      value: manifest.manifestId,
      updatedAt: manifest.savedAt,
    };
    activeTransaction.objectStore(stores.metadata).put(metadata);
    const authorityDigest: WorkspaceMetadataRecord = {
      key: interpretationAuthorityDigestKey(manifest.manifestId),
      value: interpretationAuthorityDigest(manifest),
      updatedAt: manifest.savedAt,
    };
    activeTransaction.objectStore(stores.metadata).put(authorityDigest);
    await transactionDone(activeTransaction);
  } catch (error) {
    try {
      transaction?.abort();
    } catch {
      // The transaction may already have aborted after a failed request.
    }
    database.close();
    return { ok: false, reason: 'write-failed', detail: errorMessage(error), preserved: true };
  }
  database.close();

  let bootPointerSaved = false;
  const bootStorage = options.bootStorage === undefined ? getBootStorage() : options.bootStorage;
  if (bootStorage) {
    try {
      bootStorage.setItem(WORKSPACE_BOOT_POINTER_KEY, manifest.manifestId);
      bootPointerSaved = true;
    } catch {
      bootPointerSaved = false;
    }
  }
  return { ok: true, manifestId: manifest.manifestId, bootPointerSaved };
}

export async function saveParameterWorkspaceV2(
  manifest: ProjectManifestV2,
  dataBlocks: ImportDataBlockV2[],
  options: {
    expectedManifestRevision: number;
    factory?: IDBFactory;
    bootStorage?: Storage | null;
  },
): Promise<WorkspaceDatabaseWriteResult> {
  if (manifest.manifestRevision !== options.expectedManifestRevision + 1) {
    return {
      ok: false,
      reason: 'conflict',
      detail: `Parameter workspace commit must advance manifest revision ${options.expectedManifestRevision} exactly once.`,
      preserved: true,
    };
  }
  return saveWorkspaceV2(manifest, dataBlocks, options);
}

export async function loadActiveWorkspaceV2(
  options: { factory?: IDBFactory } = {},
): Promise<WorkspaceDatabaseLoadResult> {
  const factory = options.factory ?? getIndexedDbFactory();
  if (!factory) return { ok: false, reason: 'unavailable', detail: 'IndexedDB is not available.', preserved: true };

  let database: IDBDatabase;
  try {
    database = await openWorkspaceDatabase(factory);
  } catch (error) {
    return { ok: false, reason: 'open-failed', detail: errorMessage(error), preserved: true };
  }

  try {
    const transaction = database.transaction(Object.values(stores), 'readonly');
    const metadata = await requestResult<WorkspaceMetadataRecord | undefined>(
      transaction.objectStore(stores.metadata).get(activeManifestMetadataKey),
    );
    if (!metadata?.value) {
      await transactionDone(transaction);
      database.close();
      return { ok: false, reason: 'empty', detail: 'No active V3 manifest exists.', preserved: true };
    }
    const manifest = await requestResult<ProjectManifestV2 | undefined>(
      transaction.objectStore(stores.manifests).get(metadata.value),
    );
    if (!manifest) {
      await transactionDone(transaction);
      database.close();
      return { ok: false, reason: 'invalid-manifest', detail: 'The active V3 manifest record is missing.', preserved: true };
    }
    const authorityDigest = await requestResult<WorkspaceMetadataRecord | undefined>(
      transaction.objectStore(stores.metadata).get(interpretationAuthorityDigestKey(manifest.manifestId)),
    );
    const referencedBlockIds = collectReferencedDataBlockIds(manifest);
    const dataBlocks = await Promise.all(
      referencedBlockIds.map((blockId) =>
        requestResult<ImportDataBlockV2 | undefined>(transaction.objectStore(stores.dataBlocks).get(blockId)),
      ),
    );
    const missingBlockId = referencedBlockIds.find((_, index) => !dataBlocks[index]);
    if (missingBlockId) {
      await transactionDone(transaction);
      database.close();
      return {
        ok: false,
        reason: 'missing-data-block',
        detail: `Referenced data block ${missingBlockId} is missing.`,
        preserved: true,
      };
    }
    const migrationRecord = await findMigrationRecord(transaction.objectStore(stores.migrations), manifest.manifestId);
    await transactionDone(transaction);
    database.close();
    const resolvedBlocks = dataBlocks.filter((block): block is ImportDataBlockV2 => Boolean(block));
    const validation = validateManifestReferences(manifest, resolvedBlocks);
    if (!validation.ok) {
      return { ok: false, reason: 'invalid-manifest', detail: validation.detail, preserved: true };
    }
    if ((authorityDigest || manifestHasImmutableInterpretationAuthority(manifest)) && authorityDigest?.value !== interpretationAuthorityDigest(manifest)) {
      return {
        ok: false,
        reason: 'invalid-manifest',
        detail: 'Interpretation authority digest is missing or does not match the active manifest.',
        preserved: true,
      };
    }
    return { ok: true, manifest, dataBlocks: resolvedBlocks, migrationRecord };
  } catch (error) {
    database.close();
    return { ok: false, reason: 'read-failed', detail: errorMessage(error), preserved: true };
  }
}

export async function deleteWorkspaceDatabase(factory: IDBFactory = indexedDB) {
  await new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(WORKSPACE_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete workspace database.'));
    request.onblocked = () => {
      // Open/load/save helpers close their short-lived connections. Let deletion
      // continue once those transactions finish instead of treating this as data loss.
    };
  });
}

export function validateMigrationBundleV2(bundle: ProjectMigrationBundleV2) {
  if (bundle.migrationRecord.targetManifestId !== bundle.manifest.manifestId) {
    return { ok: false as const, detail: 'Migration record target does not match the manifest.' };
  }
  return validateManifestReferences(bundle.manifest, bundle.dataBlocks);
}

export function validateManifestReferences(manifest: ProjectManifestV2, dataBlocks: ImportDataBlockV2[]) {
  if (
    manifest.schema !== PROJECT_MANIFEST_SCHEMA ||
    manifest.version !== PROJECT_MANIFEST_VERSION ||
    !manifest.manifestId ||
    !Number.isInteger(manifest.manifestRevision) ||
    manifest.manifestRevision < 1 ||
    Number.isNaN(Date.parse(manifest.savedAt))
  ) {
    return { ok: false as const, detail: 'V3 manifest envelope is invalid.' };
  }
  const projectIds = manifest.state.projects.map((project) => project.projectId);
  if (new Set(projectIds).size !== projectIds.length) {
    return { ok: false as const, detail: 'V3 manifest contains duplicate project IDs.' };
  }
  if (manifest.state.activeProjectId !== null && !projectIds.includes(manifest.state.activeProjectId)) {
    return { ok: false as const, detail: 'V3 active project does not exist.' };
  }
  const blockById = new Map(dataBlocks.map((block) => [block.dataBlockId, block]));
  if (blockById.size !== dataBlocks.length) {
    return { ok: false as const, detail: 'V3 data blocks contain duplicate IDs.' };
  }

  for (const project of manifest.state.projects) {
    if (!Array.isArray(project.probeProfiles) || !Array.isArray(project.deletedPoints)) {
      return { ok: false as const, detail: `Project ${project.projectId} is missing its V3 point-lifecycle collections.` };
    }
    const pointIds = project.points.map((point) => point.pointId);
    const historicalPointIds = project.deletedPoints.map((record) => record.pointId);
    const knownPointIds = new Set([...pointIds, ...historicalPointIds]);
    const pointById = new Map(project.points.map((point) => [point.pointId, point]));
    const batchIds = project.importBatches.map((batch) => batch.batchId);
    const batchById = new Map(project.importBatches.map((batch) => [batch.batchId, batch]));
    if (new Set(pointIds).size !== pointIds.length || new Set(batchIds).size !== batchIds.length) {
      return { ok: false as const, detail: `Project ${project.projectId} contains duplicate nested IDs.` };
    }
    const profileIds = project.probeProfiles.map((profile) => profile.profileId);
    const profileRevisionIds = project.probeProfiles.map((profile) => profile.revisionId);
    if (
      new Set(profileIds).size !== profileIds.length
      || new Set(profileRevisionIds).size !== profileRevisionIds.length
      || project.probeProfiles.some((profile) =>
        !profile.profileId
        || !profile.revisionId
        || !profile.name.trim()
        || !Number.isFinite(profile.coneBaseAreaCm2)
        || profile.coneBaseAreaCm2 <= 0
        || !Number.isFinite(profile.effectiveAreaRatio)
        || profile.effectiveAreaRatio < 0
        || profile.effectiveAreaRatio > 1
      )
    ) return { ok: false as const, detail: `Project ${project.projectId} contains an invalid probe profile collection.` };
    const deletionIds = project.deletedPoints.map((record) => record.deletionId);
    const deletedPointIds = project.deletedPoints.map((record) => record.pointId);
    if (
      new Set(deletionIds).size !== deletionIds.length
      || new Set(deletedPointIds).size !== deletedPointIds.length
      || project.deletedPoints.some((record) =>
        !record.deletionId
        || record.snapshot.pointId !== record.pointId
        || record.snapshot.pointName !== record.pointName
        || pointIds.includes(record.pointId)
        || !Number.isInteger(record.originalIndex)
        || record.originalIndex < 0
        || Number.isNaN(Date.parse(record.deletedAt))
      )
    ) return { ok: false as const, detail: `Project ${project.projectId} contains an invalid deleted-point record.` };
    const pointIdentityOwner = new Map<string, string>();
    for (const point of project.points) {
      for (const identity of [point.pointName, ...point.aliases].map(normalizePointIdentity).filter(Boolean)) {
        const owner = pointIdentityOwner.get(identity);
        if (owner && owner !== point.pointId) {
          return {
            ok: false as const,
            detail: `Project ${project.projectId} point identity ${identity} is shared by ${owner} and ${point.pointId}.`,
          };
        }
        pointIdentityOwner.set(identity, point.pointId);
      }
    }
    if (project.activePointId !== null && !pointIds.includes(project.activePointId)) {
      return { ok: false as const, detail: `Project ${project.projectId} active point does not exist.` };
    }
    if (project.activeImportBatchId !== null && !batchIds.includes(project.activeImportBatchId)) {
      return { ok: false as const, detail: `Project ${project.projectId} active batch does not exist.` };
    }
    const draftById = new Map<string, (typeof project.points)[number]['importDrafts'][number]>();
    const pointsWithHistory = [
      ...project.points,
      ...project.deletedPoints.map((record) => record.snapshot),
    ];
    for (const point of pointsWithHistory) {
      for (const draft of point.importDrafts) {
        if (draftById.has(draft.draftId)) {
          return { ok: false as const, detail: `Project ${project.projectId} contains duplicate draft ${draft.draftId}.` };
        }
        draftById.set(draft.draftId, draft);
      }
    }
    for (const batch of project.importBatches) {
      for (const draftId of batch.generatedDraftIds) {
        if (!draftById.has(draftId)) {
          return { ok: false as const, detail: `Batch ${batch.batchId} references missing generated draft ${draftId}.` };
        }
      }
      if (batch.kind !== 'draft') continue;
      const batchValidation = validateBatchBlocks(batch, blockById);
      if (!batchValidation.ok) return batchValidation;
      for (const execution of batch.pointPlan.executions) {
        if (execution.resultPointId && !knownPointIds.has(execution.resultPointId)) {
          return { ok: false as const, detail: `Batch ${batch.batchId} execution references missing point ${execution.resultPointId}.` };
        }
        if (execution.resultDraftId && !draftById.has(execution.resultDraftId)) {
          return { ok: false as const, detail: `Batch ${batch.batchId} execution references missing draft ${execution.resultDraftId}.` };
        }
      }
      for (const decision of batch.pointPlan.targetDecisions ?? []) {
        if (decision.targetPointId && !pointIds.includes(decision.targetPointId)) {
          return { ok: false as const, detail: `Batch ${batch.batchId} target decision references missing point ${decision.targetPointId}.` };
        }
        if (['append-draft', 'replace-active-draft'].includes(decision.action) && !decision.targetPointId) {
          return { ok: false as const, detail: `Batch ${batch.batchId} target decision ${decision.action} is missing its target point.` };
        }
        if (decision.expectedActiveDraftId) {
          const target = decision.targetPointId ? pointById.get(decision.targetPointId) : null;
          if (!target?.importDrafts.some((draft) => draft.draftId === decision.expectedActiveDraftId)) {
            return { ok: false as const, detail: `Batch ${batch.batchId} target decision references an invalid expected draft.` };
          }
        }
      }
    }
    for (const point of project.points) {
      const draftIds = point.importDrafts.map((draft) => draft.draftId);
      if (new Set(draftIds).size !== draftIds.length) {
        return { ok: false as const, detail: `Point ${point.pointId} contains duplicate draft IDs.` };
      }
      if (point.activeImportDraftId !== null && !draftIds.includes(point.activeImportDraftId)) {
        return { ok: false as const, detail: `Point ${point.pointId} active draft does not exist.` };
      }
      if (point.selection.selectedImportBatchId && !batchIds.includes(point.selection.selectedImportBatchId)) {
        return { ok: false as const, detail: `Point ${point.pointId} selection references an unknown batch.` };
      }
      if (
        !point.probeContext
        || !point.waterContext
        || !point.derivationState
        || !point.probeContext.revisionId
        || !Number.isInteger(point.probeContext.revision)
        || point.probeContext.revision < 1
        || !point.waterContext.revisionId
        || !Number.isInteger(point.waterContext.revision)
        || point.waterContext.revision < 1
        || !Number.isFinite(point.waterContext.waterUnitWeightKnM3)
        || point.waterContext.waterUnitWeightKnM3 <= 0
        || point.waterContext.testZeroDatum === 'borehole_bottom'
        || point.waterContext.boreholeBottomDepthM !== null
      ) return { ok: false as const, detail: `Point ${point.pointId} contains an invalid V3 probe or water context.` };
      if (point.probeContext.confirmedAt) {
        const profile = project.probeProfiles.find((candidate) => candidate.profileId === point.probeContext.activeProfileId);
        if (!profile || profile.revisionId !== point.probeContext.activeProfileRevisionId) {
          return { ok: false as const, detail: `Point ${point.pointId} confirmed probe does not match a project profile revision.` };
        }
      } else if (point.probeContext.activeProfileId !== null || point.probeContext.activeProfileRevisionId !== null) {
        return { ok: false as const, detail: `Point ${point.pointId} has an unconfirmed active probe revision.` };
      }
      if (
        point.waterContext.confirmedAt
        && (
          ['unknown', 'partial'].includes(point.waterContext.channelState)
          || (point.waterContext.channelState === 'present' && (
            point.waterContext.waterDepthM === null
            || !Number.isFinite(point.waterContext.waterDepthM)
            || point.waterContext.waterDepthM < 0
          ))
          || (point.waterContext.channelState === 'absent' && point.waterContext.waterDepthM !== null)
        )
      ) return { ok: false as const, detail: `Point ${point.pointId} has an invalid confirmed water context.` };
      if (point.derivationState.status === 'current') {
        const input = point.derivationState.input;
        const profile = project.probeProfiles.find((candidate) => candidate.revisionId === input?.probeProfileRevisionId);
        if (
          !input
          || input.import.pointId !== point.pointId
          || input.probeContextRevisionId !== point.probeContext.revisionId
          || input.waterContextRevisionId !== point.waterContext.revisionId
          || input.probeProfileRevisionId !== point.probeContext.activeProfileRevisionId
          || !profile
        ) return { ok: false as const, detail: `Point ${point.pointId} current derivation is stale against its point contexts.` };
      }
      for (const draft of point.importDrafts) {
        if (draft.pointId !== point.pointId) {
          return { ok: false as const, detail: `Point ${point.pointId} owns draft ${draft.draftId} for another point.` };
        }
        if (!batchIds.includes(draft.batchId)) {
          return { ok: false as const, detail: `Draft ${draft.draftId} references an unknown batch.` };
        }
        const block = blockById.get(draft.dataBlockId);
        const batch = batchById.get(draft.batchId);
        if (
          !block ||
          block.kind !== 'normalized' ||
          block.batchId !== draft.batchId ||
          !batch ||
          block.sourceFingerprint !== batch.sourceFingerprint
        ) {
          return { ok: false as const, detail: `Draft ${draft.draftId} references an invalid normalized block.` };
        }
        if (batch.kind === 'draft') {
          const rawBlock = batch.rawDataBlockId ? blockById.get(batch.rawDataBlockId) : null;
          const sourceRows = validatePointDraftSourceRows(draft, batch, rawBlock, block);
          if (!sourceRows.ok) return sourceRows;
        }
      }
      const governanceValidation = validateDataGovernanceWorkspace(
        project.projectId,
        point,
        batchById,
        draftById,
      );
      if (!governanceValidation.ok) return governanceValidation;
      const runIds = point.checkState.runs.map((run) => run.runId);
      if (new Set(runIds).size !== runIds.length) {
        return { ok: false as const, detail: `Point ${point.pointId} contains duplicate check run IDs.` };
      }
      if (point.checkState.activeRunId !== null && !runIds.includes(point.checkState.activeRunId)) {
        return { ok: false as const, detail: `Point ${point.pointId} active check run does not exist.` };
      }
      for (const run of point.checkState.runs) {
        const dependency = validateDependency(run.input, project.projectId, point.pointId, batchById, draftById);
        if (!dependency.ok) return dependency;
        const hasFrozenContext = Boolean(run.probeContextRevisionId || run.probeProfileRevisionId || run.waterContextRevisionId || run.jtsContextSnapshot);
        if (hasFrozenContext && (!run.probeContextRevisionId || !run.waterContextRevisionId || (run.jtsContextSnapshot && !run.probeProfileRevisionId))) {
          return { ok: false as const, detail: `Check run ${run.runId} contains an incomplete frozen probe or water context.` };
        }
        const exclusionRevision = run.exclusionRevisionId
          ? point.dataGovernance.exclusionRevisions.find((revision) => revision.revisionId === run.exclusionRevisionId)
          : null;
        const valueOverrideRevision = run.valueOverrideRevisionId
          ? (point.dataGovernance.valueOverrideRevisions ?? []).find((revision) => revision.revisionId === run.valueOverrideRevisionId)
          : null;
        const smoothingRun = run.smoothingRunId
          ? point.dataGovernance.smoothingRuns.find((candidate) => candidate.runId === run.smoothingRunId)
          : null;
        if (
          (run.valueOverrideRevisionId && (!valueOverrideRevision || !artifactDependenciesEqual(valueOverrideRevision.input, run.input)))
          ||
          (run.exclusionRevisionId && (!exclusionRevision || !artifactDependenciesEqual(exclusionRevision.input, run.input)))
          || (run.smoothingRunId && (
            !smoothingRun
            || !artifactDependenciesEqual(smoothingRun.input, run.input)
            || (smoothingRun.valueOverrideRevisionId ?? null) !== (run.valueOverrideRevisionId ?? null)
            || smoothingRun.exclusionRevisionId !== (run.exclusionRevisionId ?? null)
          ))
        ) return { ok: false as const, detail: `Check run ${run.runId} references invalid data-governance evidence.` };
        if (run.normalizedDataHash) {
          const runDraft = draftById.get(run.input.draftId);
          const runBlock = runDraft ? blockById.get(runDraft.dataBlockId) : null;
          const currentHash = runDraft && runBlock?.kind === 'normalized' ? computeDraftNormalizedDataHash(runDraft, runBlock) : null;
          if (!currentHash || run.normalizedDataHash !== currentHash) {
            return { ok: false as const, detail: `Check run ${run.runId} normalized-data hash does not match its source draft.` };
          }
        }
      }
      if (['current', 'problem'].includes(point.checkState.artifact.status)) {
        const currentCheck = selectCurrentCheckResult(point);
        if (!currentCheck.isCurrent) {
          return { ok: false as const, detail: `Point ${point.pointId} current check does not match its active draft and complete revision vector.` };
        }
      }
      if (point.parameterWorkspace) {
        const parameterValidation = validateParameterWorkspaceStructure(point.parameterWorkspace, point.stratificationWorkspace?.revisions ?? []);
        if (!parameterValidation.ok) return parameterValidation;
        const dissipationValidation = validateJtsDissipationWorkspace(point.parameterWorkspace);
        if (!dissipationValidation.ok) return { ok: false as const, detail: `Point ${point.pointId}: ${dissipationValidation.problem}` };
        const packageRuns = point.parameterWorkspace.jtsParameterPackageRuns ?? [];
        const packageRunIds = packageRuns.map((run) => run.runId);
        if (new Set(packageRunIds).size !== packageRunIds.length) {
          return { ok: false as const, detail: `Point ${point.pointId} contains duplicate JTS parameter package run IDs.` };
        }
        if (point.parameterWorkspace.activeJtsParameterPackageRunId && !packageRunIds.includes(point.parameterWorkspace.activeJtsParameterPackageRunId)) {
          return { ok: false as const, detail: `Point ${point.pointId} active JTS parameter package run does not exist.` };
        }
        for (const run of packageRuns) {
          const structure = validateJtsParameterPackageRun(run);
          if (!structure.ok) return { ok: false as const, detail: `JTS parameter package ${run.runId}: ${structure.problem}` };
          const classification = point.stratificationWorkspace?.jtsClassificationRuns?.find((candidate) => candidate.runId === run.classificationRunId);
          const stratificationRevision = point.stratificationWorkspace?.revisions?.find((revision) => revision.revisionId === run.stratificationRevisionId);
          if (
            run.pointId !== point.pointId
            || !classification
            || classification.resultHash !== run.classificationResultHash
            || !stratificationRevision
            || stratificationRevision.schemeId !== run.stratificationSchemeId
            || stratificationRevision.version !== run.stratificationVersion
            || stratificationRevision.snapshot.origin?.kind !== 'jts-classification'
            || stratificationRevision.snapshot.origin.classificationRunId !== classification.runId
          ) return { ok: false as const, detail: `JTS parameter package ${run.runId} has invalid classification or stratification authority.` };
        }
        const activePackage = packageRuns.find((run) => run.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId) ?? null;
        if (activePackage) {
          const activeClassification = point.stratificationWorkspace?.jtsClassificationRuns?.find((run) => run.runId === point.stratificationWorkspace?.activeJtsClassificationRunId);
          const activeScheme = point.stratificationWorkspace?.schemes.find((scheme) => scheme.schemeId === point.stratificationWorkspace?.currentSchemeId);
          const activeRevision = point.stratificationWorkspace?.revisions?.find((revision) => revision.revisionId === activePackage.stratificationRevisionId);
          if (
            activePackage.status !== 'completed'
            || !activeClassification
            || activePackage.classificationRunId !== activeClassification.runId
            || !activeScheme
            || activeScheme.status !== 'current'
            || activePackage.stratificationSchemeId !== activeScheme.schemeId
            || !activeRevision
            || activeRevision.version !== activeScheme.version
          ) return { ok: false as const, detail: `Point ${point.pointId} active JTS parameter package is stale against current classification or stratification.` };
        }
        for (const test of point.parameterWorkspace.jtsDissipationTests ?? []) {
          const revision = point.stratificationWorkspace?.revisions?.find((candidate) => candidate.snapshot.layers.some((layer) => layer.layerId === test.layerId));
          if (test.pointId !== point.pointId || !revision) return { ok: false as const, detail: `Dissipation test ${test.revisionId} has invalid point or layer authority.` };
        }
        for (const result of point.parameterWorkspace.jtsDissipationResults ?? []) {
          const sourcePackage = packageRuns.find((candidate) => candidate.runId === result.parameterPackageRunId);
          if (!sourcePackage || sourcePackage.resultHash !== result.parameterPackageResultHash || sourcePackage.stratificationRevisionId !== result.stratificationRevisionId || result.pointId !== point.pointId) {
            return { ok: false as const, detail: `Dissipation result ${result.revisionId} has invalid parameter-package authority.` };
          }
        }
        for (const evidenceRevision of point.parameterWorkspace.methodEvidenceRevisions ?? []) {
          if (evidenceRevision.kind === 'conflict_context' && evidenceRevision.payload.pointId !== point.pointId) {
            return { ok: false as const, detail: `Parameter conflict evidence ${evidenceRevision.revisionId} belongs to another point.` };
          }
        }
        for (const referenceTest of point.parameterWorkspace.referenceTestRevisions ?? []) {
          if (
            referenceTest.projectId !== project.projectId
            || !point.siteId
            || referenceTest.siteId !== point.siteId
            || referenceTest.pointId !== point.pointId
          ) return { ok: false as const, detail: `Reference test revision ${referenceTest.revisionId} has invalid project, site, or point ownership.` };
        }
      }
      if (point.stratificationWorkspace) {
        const workspace = point.stratificationWorkspace;
        const schemeIds = workspace.schemes.map((scheme) => scheme.schemeId);
        if (new Set(schemeIds).size !== schemeIds.length) {
          return { ok: false as const, detail: `Point ${point.pointId} contains duplicate stratification scheme IDs.` };
        }
        if (workspace.activeSchemeId !== null && !schemeIds.includes(workspace.activeSchemeId)) {
          return { ok: false as const, detail: `Point ${point.pointId} active stratification scheme does not exist.` };
        }
        if (workspace.currentSchemeId !== null && !schemeIds.includes(workspace.currentSchemeId)) {
          return { ok: false as const, detail: `Point ${point.pointId} current stratification scheme does not exist.` };
        }
        const deletedSchemeIds = workspace.deletedSchemeIds ?? [];
        if (
          new Set(deletedSchemeIds).size !== deletedSchemeIds.length
          || deletedSchemeIds.some((schemeId) => schemeIds.includes(schemeId))
        ) return { ok: false as const, detail: `Point ${point.pointId} has invalid stratification scheme tombstones.` };
        const ruleRuns = workspace.ruleRuns ?? [];
        const ruleRunIds = ruleRuns.map((run) => run.runId);
        const ruleIdempotencyKeys = ruleRuns.map((run) => run.idempotencyKey);
        if (new Set(ruleRunIds).size !== ruleRunIds.length || new Set(ruleIdempotencyKeys).size !== ruleIdempotencyKeys.length) {
          return { ok: false as const, detail: `Point ${point.pointId} contains duplicate stratification rule run IDs or idempotency keys.` };
        }
        if (workspace.activeRuleRunId && !ruleRunIds.includes(workspace.activeRuleRunId)) {
          return { ok: false as const, detail: `Point ${point.pointId} active stratification rule run does not exist.` };
        }
        const classificationRuns = workspace.jtsClassificationRuns ?? [];
        const classificationRunIds = classificationRuns.map((run) => run.runId);
        if (new Set(classificationRunIds).size !== classificationRunIds.length) {
          return { ok: false as const, detail: `Point ${point.pointId} contains duplicate JTS classification run IDs.` };
        }
        if (workspace.activeJtsClassificationRunId && !classificationRunIds.includes(workspace.activeJtsClassificationRunId)) {
          return { ok: false as const, detail: `Point ${point.pointId} active JTS classification run does not exist.` };
        }
        for (const run of classificationRuns) {
          const structure = validateJtsClassificationRun(run);
          if (!structure.ok) return { ok: false as const, detail: `JTS classification run ${run.runId}: ${structure.problem}` };
          const dependency = validateDependency(run.input, project.projectId, point.pointId, batchById, draftById);
          if (!dependency.ok) return dependency;
          const sourceCheckRun = point.checkState.runs.find((checkRun) => checkRun.runId === run.input.checkRunId && artifactDependenciesEqual(checkRun.input, run.input));
          if (!sourceCheckRun || sourceCheckRun.status !== 'completed' || sourceCheckRun.conclusion !== '无问题') {
            return { ok: false as const, detail: `JTS classification run ${run.runId} references an invalid data-check run.` };
          }
          const sourceDraft = draftById.get(run.input.draftId) as (typeof point.importDrafts)[number] | undefined;
          const exclusion = sourceCheckRun.exclusionRevisionId
            ? point.dataGovernance.exclusionRevisions.find((revision) => revision.revisionId === sourceCheckRun.exclusionRevisionId)
            : null;
          const smoothing = sourceCheckRun.smoothingRunId
            ? point.dataGovernance.smoothingRuns.find((candidate) => candidate.runId === sourceCheckRun.smoothingRunId)
            : null;
          const expectedSourceRowIds = smoothing?.rows.map((row) => row.sourceRowId)
            ?? sourceDraft?.sourceRowIds.filter((sourceRowId) => !exclusion?.excludedSourceRowIds.includes(sourceRowId))
            ?? [];
          if (stableStringify(run.measuredRowsSnapshot.map((row) => row.sourceRowId)) !== stableStringify(expectedSourceRowIds)) {
            return { ok: false as const, detail: `JTS classification run ${run.runId} does not contain the exact checked governance rows.` };
          }
          const normalizedBlock = sourceDraft ? blockById.get(sourceDraft.dataBlockId) : null;
          const checkedRows = sourceDraft && normalizedBlock?.kind === 'normalized'
            ? getCheckedGovernanceRows(point, sourceCheckRun, sourceDraft, normalizedBlock)
            : null;
          if (!checkedRows || run.measuredRowsSnapshot.some((inputRow, index) => {
            const checked = checkedRows[index];
            const expectedU2 = run.route === 'approximate_cpt' || !Number.isFinite(checked?.row.u2Kpa)
              ? null
              : checked.row.u2Kpa;
            return !checked
              || inputRow.sourceRowId !== checked.sourceRowId
              || !sameParameterInputNumber(inputRow.depthM, checked.row.depthM)
              || !sameParameterInputNumber(inputRow.qcKpa, checked.row.qcKpa)
              || !sameParameterInputNumber(inputRow.fsKpa, checked.row.fsKpa)
              || !sameParameterInputNumber(inputRow.u2Kpa ?? null, expectedU2);
          })) return { ok: false as const, detail: `JTS classification run ${run.runId} input snapshot does not match the checked governance values.` };
        }
        const activeClassification = classificationRuns.find((run) => run.runId === workspace.activeJtsClassificationRunId) ?? null;
        const currentCheck = selectCurrentCheckResult(point);
        if (activeClassification && (
          activeClassification.status !== 'completed'
          || !currentCheck.run
          || activeClassification.input.checkRunId !== currentCheck.run.runId
          || !artifactDependenciesEqual(activeClassification.input, currentCheck.run.input)
          || activeClassification.probeProfileRevisionId !== point.probeContext.activeProfileRevisionId
          || activeClassification.waterContextRevisionId !== point.waterContext.revisionId
        )) return { ok: false as const, detail: `Point ${point.pointId} active JTS classification is stale against current authority.` };
        for (const run of ruleRuns) {
          const runValidation = validateStratificationRuleRunStructure(run);
          if (!runValidation.ok) return { ok: false as const, detail: `Stratification rule run ${run.runId}: ${runValidation.problem}` };
          const dependency = validateDependency(run.input, project.projectId, point.pointId, batchById, draftById);
          if (!dependency.ok) return dependency;
          const sourceCheckRun = point.checkState.runs.find((checkRun) => checkRun.runId === run.input.checkRunId && artifactDependenciesEqual(checkRun.input, run.input));
          if (!sourceCheckRun || sourceCheckRun.status !== 'completed' || sourceCheckRun.conclusion !== '无问题') {
            return { ok: false as const, detail: `Stratification rule run ${run.runId} references an invalid check run.` };
          }
          const sourceDraft = draftById.get(run.input.draftId);
          if (!sourceDraft) return { ok: false as const, detail: `Stratification rule run ${run.runId} has no source draft.` };
          const normalizedBlock = blockById.get(sourceDraft.dataBlockId);
          if (!normalizedBlock || normalizedBlock.kind !== 'normalized' || !normalizedBlock.rowReferences) {
            return { ok: false as const, detail: `Stratification rule run ${run.runId} cannot verify its normalized source rows.` };
          }
          const checkedDataHash = computeDraftNormalizedDataHash(sourceDraft, normalizedBlock);
          if (!sourceCheckRun.normalizedDataHash || !checkedDataHash || sourceCheckRun.normalizedDataHash !== checkedDataHash) {
            return { ok: false as const, detail: `Stratification rule run ${run.runId} is not bound to the normalized data checked by ${sourceCheckRun.runId}.` };
          }
          const checkedRows = getCheckedGovernanceRows(point, sourceCheckRun, sourceDraft, normalizedBlock);
          if (!checkedRows || run.inputRowsSnapshot.length !== checkedRows.length) {
            return { ok: false as const, detail: `Stratification rule run ${run.runId} does not contain the exact checked governance rows.` };
          }
          for (let index = 0; index < run.inputRowsSnapshot.length; index += 1) {
            const inputRow = run.inputRowsSnapshot[index];
            const checked = checkedRows[index];
            if (
              inputRow.sourceRowId !== checked.sourceRowId
              || !sameParameterInputNumber(inputRow.depthM, checked.row.depthM)
              || !sameParameterInputNumber(inputRow.qcKpa, checked.row.qcKpa)
              || !sameParameterInputNumber(inputRow.frPercent, checked.row.frPercent)
            ) return { ok: false as const, detail: `Stratification rule run ${run.runId} input snapshot does not match its checked governance row.` };
          }
        }
        const revisions = workspace.revisions ?? [];
        const revisionIds = revisions.map((revision) => revision.revisionId);
        const revisionVersions = revisions.map((revision) => `${revision.schemeId}:v${revision.version}`);
        if (new Set(revisionIds).size !== revisionIds.length || new Set(revisionVersions).size !== revisionVersions.length) {
          return { ok: false as const, detail: `Point ${point.pointId} contains duplicate stratification revision records.` };
        }
        const revisionGroups = new Map<string, typeof revisions>();
        for (const revision of revisions) revisionGroups.set(revision.schemeId, [...(revisionGroups.get(revision.schemeId) ?? []), revision]);
        for (const [schemeId, schemeRevisions] of revisionGroups) {
          const orderedRevisions = [...schemeRevisions].sort((left, right) => left.version - right.version);
          const versions = orderedRevisions.map((revision) => revision.version);
          if (versions.some((version, index) => version !== index + 1)) {
            return { ok: false as const, detail: `Stratification scheme ${schemeId} has a non-contiguous revision history.` };
          }
          const firstInput = orderedRevisions[0].snapshot.input;
          const firstOrigin = orderedRevisions[0].snapshot.origin ?? { kind: 'manual' as const };
          if (orderedRevisions.some((revision) =>
            !sameStratificationRuleInput(revision.snapshot.input, firstInput)
            || stableStringify(revision.snapshot.origin ?? { kind: 'manual' }) !== stableStringify(firstOrigin))) {
            return { ok: false as const, detail: `Stratification scheme ${schemeId} changed its immutable input or origin across revisions.` };
          }
          if (!schemeIds.includes(schemeId) && !deletedSchemeIds.includes(schemeId)) {
            return { ok: false as const, detail: `Stratification revision history ${schemeId} has no live scheme or deletion tombstone.` };
          }
          const liveScheme = workspace.schemes.find((scheme) => scheme.schemeId === schemeId);
          if (liveScheme && liveScheme.status !== 'working' && liveScheme.version !== versions.at(-1)) {
            return { ok: false as const, detail: `Stratification scheme ${schemeId} does not reference its latest immutable revision.` };
          }
        }
        for (const revision of revisions) {
          if (
            revision.snapshot.schemeId !== revision.schemeId
            || revision.snapshot.version !== revision.version
            || revision.snapshot.status !== 'current'
          ) {
            return { ok: false as const, detail: `Stratification revision ${revision.revisionId} does not match its immutable snapshot identity.` };
          }
          const dependency = validateDependency(revision.snapshot.input, project.projectId, point.pointId, batchById, draftById);
          if (!dependency.ok) return dependency;
          if (!point.checkState.runs.some((run) => run.runId === revision.snapshot.input.checkRunId && artifactDependenciesEqual(run.input, revision.snapshot.input))) {
            return { ok: false as const, detail: `Stratification revision ${revision.revisionId} references an invalid check run.` };
          }
          const structure = validateStratificationStructure(revision.snapshot, `Stratification revision ${revision.revisionId}`);
          if (!structure.ok) return structure;
          if (revision.snapshot.origin?.kind === 'rule-candidate') {
            const ruleOrigin = revision.snapshot.origin;
            const resolvedRun = ruleRuns.find((run) => run.runId === ruleOrigin.ruleRunId && run.status === 'completed');
            if (!isUsableRuleOriginRun(resolvedRun) || resolvedRun.settingsSnapshot.kind !== ruleOrigin.ruleId || !sameStratificationRuleInput(resolvedRun.input, revision.snapshot.input)) {
              return { ok: false as const, detail: `Stratification revision ${revision.revisionId} has an invalid rule-candidate origin.` };
            }
            const boundaryEvidence = validateRuleBoundaryEvidence(revision.snapshot, resolvedRun, `Stratification revision ${revision.revisionId}`);
            if (!boundaryEvidence.ok) return boundaryEvidence;
          } else if (revision.snapshot.origin?.kind === 'jts-classification') {
            const classificationOrigin = revision.snapshot.origin;
            const resolvedRun = classificationRuns.find((run) => run.runId === classificationOrigin.classificationRunId);
            const boundaryEvidence = validateJtsBoundaryEvidence(revision.snapshot, resolvedRun, `Stratification revision ${revision.revisionId}`);
            if (!boundaryEvidence.ok) return boundaryEvidence;
          } else if (revision.snapshot.boundaries.some((boundary) => boundary.ruleCandidateRef)) {
            return { ok: false as const, detail: `Stratification revision ${revision.revisionId} has rule evidence without a rule origin.` };
          } else if (revision.snapshot.boundaries.some((boundary) => boundary.jtsCandidateRef)) {
            return { ok: false as const, detail: `Stratification revision ${revision.revisionId} has JTS evidence without a JTS origin.` };
          }
        }
        for (const scheme of workspace.schemes) {
          const dependency = validateDependency(scheme.input, project.projectId, point.pointId, batchById, draftById);
          if (!dependency.ok) return dependency;
          if (!point.checkState.runs.some((run) => run.runId === scheme.input.checkRunId && artifactDependenciesEqual(run.input, scheme.input))) {
            return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} references an invalid check run.` };
          }
          const structure = validateStratificationStructure(scheme, `Stratification scheme ${scheme.schemeId}`);
          if (!structure.ok) return structure;
          const schemeRevisions = revisions.filter((revision) => revision.schemeId === scheme.schemeId);
          if (scheme.status === 'working' && (
            schemeRevisions.length
            || workspace.editSession?.schemeId !== scheme.schemeId
            || !workspace.editSession.isNew
          )) return { ok: false as const, detail: `Working stratification scheme ${scheme.schemeId} must be a new uncommitted edit without revisions.` };
          if (scheme.origin?.kind === 'rule-candidate') {
            const ruleOrigin = scheme.origin;
            const resolvedRun = ruleRuns.find((run) => run.runId === ruleOrigin.ruleRunId && run.status === 'completed');
            if (!isUsableRuleOriginRun(resolvedRun) || resolvedRun.settingsSnapshot.kind !== ruleOrigin.ruleId || !sameStratificationRuleInput(resolvedRun.input, scheme.input)) {
              return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} has an invalid rule-candidate origin.` };
            }
            const boundaryEvidence = validateRuleBoundaryEvidence(scheme, resolvedRun, `Stratification scheme ${scheme.schemeId}`);
            if (!boundaryEvidence.ok) return boundaryEvidence;
          } else if (scheme.origin?.kind === 'jts-classification') {
            const classificationOrigin = scheme.origin;
            const resolvedRun = classificationRuns.find((run) => run.runId === classificationOrigin.classificationRunId);
            const boundaryEvidence = validateJtsBoundaryEvidence(scheme, resolvedRun, `Stratification scheme ${scheme.schemeId}`);
            if (!boundaryEvidence.ok) return boundaryEvidence;
          } else if (scheme.boundaries.some((boundary) => boundary.ruleCandidateRef)) {
            return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} has rule evidence without a rule origin.` };
          } else if (scheme.boundaries.some((boundary) => boundary.jtsCandidateRef)) {
            return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} has JTS evidence without a JTS origin.` };
          }
          if (
            workspace.revisions
            && scheme.status !== 'working'
            && !revisions.some((revision) => revision.schemeId === scheme.schemeId && revision.version === scheme.version)
          ) {
            return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} is missing its committed revision snapshot.` };
          }
          if (scheme.status !== 'working') {
            const exactRevision = revisions.find((revision) => revision.schemeId === scheme.schemeId && revision.version === scheme.version);
            if (!exactRevision || stableStringify(committedStratificationProjection(scheme)) !== stableStringify(committedStratificationProjection(exactRevision.snapshot))) {
              return { ok: false as const, detail: `Stratification scheme ${scheme.schemeId} diverges from its immutable revision snapshot.` };
            }
          }
        }
        if (workspace.editSession) {
          const session = workspace.editSession;
          if (session.schemeId !== session.working.schemeId || session.schemeId !== session.baseline.schemeId) {
            return { ok: false as const, detail: `Point ${point.pointId} stratification edit session references inconsistent schemes.` };
          }
          if (!session.isNew && !schemeIds.includes(session.schemeId)) {
            return { ok: false as const, detail: `Point ${point.pointId} stratification edit session references a missing scheme.` };
          }
          const storedScheme = workspace.schemes.find((scheme) => scheme.schemeId === session.schemeId);
          if (
            !storedScheme
            || storedScheme.version !== session.baseVersion
            || session.baseline.version !== session.baseVersion
            || session.working.version !== session.baseVersion
          ) {
            return { ok: false as const, detail: `Point ${point.pointId} stratification edit session has an invalid base version.` };
          }
          if (
            stableStringify(session.baseline.origin ?? { kind: 'manual' }) !== stableStringify(storedScheme.origin ?? { kind: 'manual' })
            || stableStringify(session.working.origin ?? { kind: 'manual' }) !== stableStringify(storedScheme.origin ?? { kind: 'manual' })
          ) return { ok: false as const, detail: `Point ${point.pointId} stratification edit session changed its scheme origin.` };
          const baselineStructure = validateStratificationStructure(session.baseline, `Point ${point.pointId} stratification edit baseline`);
          if (!baselineStructure.ok) return baselineStructure;
          const workingStructure = validateStratificationStructure(session.working, `Point ${point.pointId} stratification edit working copy`);
          if (!workingStructure.ok) return workingStructure;
        }
        if (['current', 'problem'].includes(point.stratificationState.status)) {
          const currentScheme = workspace.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId);
          const currentRevision = currentScheme
            ? workspace.revisions?.find((revision) => revision.schemeId === currentScheme.schemeId && revision.version === currentScheme.version)
            : undefined;
          if (
            !currentScheme
            || currentScheme.status !== 'current'
            || point.checkState.activeRunId !== currentScheme.input.checkRunId
            || point.stratificationState.sourceCheckRunId !== currentScheme.input.checkRunId
            || point.stratificationState.sourceStratificationSchemeId !== currentScheme.schemeId
            || (workspace.revisions && (!currentRevision || (point.stratificationState.sourceStratificationRevisionId !== undefined && point.stratificationState.sourceStratificationRevisionId !== currentRevision.revisionId)))
            || !artifactDependenciesEqual(point.stratificationState.input, currentScheme.input)
          ) {
            return { ok: false as const, detail: `Point ${point.pointId} current stratification artifact is inconsistent with its current scheme.` };
          }
        }
        for (const [artifactName, artifact] of Object.entries({ parameters: point.parameterState, output: point.outputState })) {
          if (!['current', 'problem'].includes(artifact.status)) continue;
          const sourceScheme = workspace.schemes.find((scheme) => scheme.schemeId === artifact.sourceStratificationSchemeId);
          const sourceRevision = workspace.revisions?.find((revision) => revision.revisionId === artifact.sourceStratificationRevisionId);
          if (
            !sourceScheme
            || !sourceRevision
            || sourceScheme.schemeId !== workspace.currentSchemeId
            || sourceScheme.status !== 'current'
            || sourceRevision.schemeId !== sourceScheme.schemeId
            || sourceRevision.version !== sourceScheme.version
            || artifact.sourceCheckRunId !== sourceScheme.input.checkRunId
            || !artifactDependenciesEqual(artifact.input, sourceScheme.input)
            || (workspace.revisions && !workspace.revisions.some((revision) => revision.schemeId === sourceScheme.schemeId && revision.version === sourceScheme.version))
          ) {
            return { ok: false as const, detail: `Point ${point.pointId} current ${artifactName} artifact has an invalid stratification source lineage.` };
          }
        }
        if (point.parameterWorkspace) {
          const parameterWorkspace = point.parameterWorkspace;
          for (const scheme of parameterWorkspace.schemes) {
            if ((scheme.input.siteId ?? null) !== (point.siteId ?? null)) {
              return { ok: false as const, detail: `Parameter scheme ${scheme.schemeId} has a non-canonical site ownership.` };
            }
            const source = validateParameterSourceLineage(
              scheme.input,
              `Parameter scheme ${scheme.schemeId}`,
              project.projectId,
              point,
              batchById,
              draftById,
            );
            if (!source.ok) return source;
            const sourceRevision = workspace.revisions?.find((revision) => revision.revisionId === scheme.input.stratificationRevisionId);
            const sourceLayerIds = new Set(sourceRevision?.snapshot.layers.map((layer) => layer.layerId) ?? []);
            for (const slot of scheme.slots) {
              if (slot.targetScope.layerIds.some((layerId) => !sourceLayerIds.has(layerId))) {
                return { ok: false as const, detail: `Parameter slot ${slot.slotId} references a layer outside its exact stratification revision.` };
              }
            }
          }
          for (const revision of parameterWorkspace.revisions) {
            if ((revision.snapshot.input.siteId ?? null) !== (point.siteId ?? null)) {
              return { ok: false as const, detail: `Parameter revision ${revision.revisionId} has a non-canonical site ownership.` };
            }
            const source = validateParameterSourceLineage(
              revision.snapshot.input,
              `Parameter revision ${revision.revisionId}`,
              project.projectId,
              point,
              batchById,
              draftById,
            );
            if (!source.ok) return source;
            const sourceStratificationRevision = workspace.revisions?.find((candidate) => candidate.revisionId === revision.snapshot.input.stratificationRevisionId);
            const sourceLayerIds = new Set(sourceStratificationRevision?.snapshot.layers.map((layer) => layer.layerId) ?? []);
            for (const slot of revision.snapshot.slots) {
              if (slot.targetScope.layerIds.some((layerId) => !sourceLayerIds.has(layerId))) {
                return { ok: false as const, detail: `Parameter revision ${revision.revisionId} references a layer outside its exact stratification revision.` };
              }
              if ('kind' in slot.settings && slot.settings.kind === 'suc_qnet_nkt_v1' && slot.settings.nktByLayer.some((entry) =>
                !sourceLayerIds.has(entry.layerId)
                || entry.layerRevisionRef !== createLayerRevisionRef(revision.snapshot.input.stratificationRevisionId, entry.layerId))) {
                return { ok: false as const, detail: `Parameter revision ${revision.revisionId} has an invalid exact-layer Nkt configuration.` };
              }
            }
          }
          for (const run of parameterWorkspace.derivationRuns) {
            const source = validateParameterSourceLineage(
              run.input,
              `Parameter derivation run ${run.runId}`,
              project.projectId,
              point,
              batchById,
              draftById,
            );
            if (!source.ok) return source;
            const schemeRevision = parameterWorkspace.revisions.find((revision) => revision.revisionId === run.schemeRevisionId);
            if (!schemeRevision || !sameParameterSource(run.input, schemeRevision.snapshot.input)) {
              return { ok: false as const, detail: `Parameter derivation run ${run.runId} does not match its scheme revision source.` };
            }
            const sourceDraft = draftById.get(run.input.draftId);
            const availableSourceRows = new Set(sourceDraft?.sourceRowIds ?? []);
            const runSourceRows = run.inputRowsSnapshot.map((row) => row.sourceRowId);
            if (
              new Set(runSourceRows).size !== runSourceRows.length
              || stableStringify(runSourceRows) !== stableStringify(sourceDraft?.sourceRowIds ?? [])
              || runSourceRows.some((sourceRowId) => !availableSourceRows.has(sourceRowId))
            ) {
              return { ok: false as const, detail: `Parameter derivation run ${run.runId} does not contain the complete ordered active-draft source rows.` };
            }
            const normalizedBlock = sourceDraft ? blockById.get(sourceDraft.dataBlockId) : null;
            if (!normalizedBlock || normalizedBlock.kind !== 'normalized' || !normalizedBlock.rowReferences) {
              return { ok: false as const, detail: `Parameter derivation run ${run.runId} cannot verify its normalized source rows.` };
            }
            const normalizedReferenceById = new Map(
              normalizedBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]),
            );
            for (const inputRow of run.inputRowsSnapshot) {
              const reference = normalizedReferenceById.get(inputRow.sourceRowId);
              const normalizedRow = reference ? normalizedBlock.rows[reference.normalizedIndex] : null;
              if (
                !normalizedRow
                || !sameParameterInputNumber(inputRow.depthM, normalizedRow.depthM)
                || !sameParameterInputNumber(inputRow.qcKpa, normalizedRow.qcKpa)
                || !sameParameterInputNumber(inputRow.qtKpa, normalizedRow.qtKpa)
                || !sameParameterInputNumber(inputRow.fsKpa, normalizedRow.fsKpa)
                || !sameParameterInputNumber(inputRow.u2Kpa, normalizedRow.u2Kpa)
                || !sameParameterInputNumber(inputRow.importedFrPercent, normalizedRow.frPercent)
                || !sameParameterInputNumber(run.waterDepthM, normalizedRow.waterDepthM)
              ) {
                return { ok: false as const, detail: `Parameter derivation run ${run.runId} input snapshot does not match its normalized source row.` };
              }
            }
          }
          for (const run of parameterWorkspace.parameterRuns) {
            const parameterRevision = parameterWorkspace.revisions.find((revision) => revision.revisionId === run.schemeRevisionId);
            const stratificationRevision = parameterRevision
              ? workspace.revisions?.find((revision) => revision.revisionId === parameterRevision.snapshot.input.stratificationRevisionId)
              : undefined;
            if (!stratificationRevision) {
              return { ok: false as const, detail: `Parameter method run ${run.runId} cannot resolve its exact stratification revision.` };
            }
            const methodValidation = validateParameterMethodRunStructure(run, parameterWorkspace, stratificationRevision);
            if (!methodValidation.ok) return methodValidation;
            const derivation = parameterWorkspace.derivationRuns.find((candidate) => candidate.runId === run.derivationRunId);
            const derivationSourceRows = new Set(derivation?.inputRowsSnapshot.map((row) => row.sourceRowId) ?? []);
            for (const evidence of run.evidenceSnapshot) {
              if (evidence.conflictContext && evidence.conflictContext.pointId !== point.pointId) {
                return { ok: false as const, detail: `Parameter method run ${run.runId} conflict evidence belongs to another point.` };
              }
              if (evidence.calibrationContext && (
                evidence.calibrationContext.projectId !== project.projectId
                || !point.siteId
                || evidence.calibrationContext.siteId !== point.siteId
                || evidence.calibrationContext.pointId !== point.pointId
                || evidence.calibrationContext.inputDerivationRunId !== run.derivationRunId
              )) {
                return { ok: false as const, detail: `Parameter method run ${run.runId} calibration context belongs to another project, point, or derivation run.` };
              }
              if (evidence.calibrationAuthority && (
                evidence.calibrationAuthority.inputDerivationRunId !== run.derivationRunId
                || evidence.calibrationAuthority.currentSourceRowIds.some((sourceRowId) => !derivationSourceRows.has(sourceRowId))
              )) {
                return { ok: false as const, detail: `Parameter method run ${run.runId} calibration authority references stale source rows.` };
              }
            }
          }
          for (const referenceTest of parameterWorkspace.referenceTestRevisions ?? []) {
            if (
              referenceTest.projectId !== project.projectId
              || !point.siteId
              || referenceTest.siteId !== point.siteId
              || referenceTest.pointId !== point.pointId
            ) return { ok: false as const, detail: `Reference test revision ${referenceTest.revisionId} has invalid project, site, or point ownership.` };
          }
          const currentParameterScheme = parameterWorkspace.schemes.find((scheme) => scheme.schemeId === parameterWorkspace.currentSchemeId);
          if (currentParameterScheme && currentParameterScheme.status === 'current') {
            const currentStratificationRevision = workspace.revisions?.find((revision) =>
              revision.schemeId === workspace.currentSchemeId
              && revision.version === workspace.schemes.find((scheme) => scheme.schemeId === workspace.currentSchemeId)?.version,
            );
            if (!currentStratificationRevision || currentParameterScheme.input.stratificationRevisionId !== currentStratificationRevision.revisionId) {
              return { ok: false as const, detail: `Point ${point.pointId} current parameter scheme does not use the current stratification revision.` };
            }
          }
          if (
            ['current', 'problem'].includes(point.parameterState.status)
            && !parameterWorkspace.currentResultSelectionRef
            && !parameterWorkspace.activeJtsParameterPackageRunId
          ) {
            return { ok: false as const, detail: `Point ${point.pointId} current parameter artifact is missing its exact result selection or JTS parameter package.` };
          }
        }
      } else if (['current', 'problem'].includes(point.parameterState.status) || ['current', 'problem'].includes(point.outputState.status)) {
        return { ok: false as const, detail: `Point ${point.pointId} has a current downstream artifact without a stratification workspace.` };
      } else if (point.parameterWorkspace && hasParameterAuthorityHistory(point.parameterWorkspace)) {
        return { ok: false as const, detail: `Point ${point.pointId} has parameter records without a stratification workspace.` };
      }
      if (point.outputWorkspace) {
        const outputIds = point.outputWorkspace.revisions.map((revision) => revision.revisionId);
        if (new Set(outputIds).size !== outputIds.length) return { ok: false as const, detail: `Point ${point.pointId} contains duplicate output revision IDs.` };
        for (const revision of point.outputWorkspace.revisions) {
          const structure = validateJtsOutputRevision(revision);
          if (!structure.ok) return { ok: false as const, detail: `Output revision ${revision.revisionId}: ${structure.problem}` };
          const classification = point.stratificationWorkspace?.jtsClassificationRuns?.find((item) => item.runId === revision.snapshot.authority.classificationRunId);
          const stratificationRevision = point.stratificationWorkspace?.revisions?.find((item) => item.revisionId === revision.snapshot.authority.stratificationRevisionId);
          const parameterPackage = point.parameterWorkspace?.jtsParameterPackageRuns?.find((item) => item.runId === revision.snapshot.authority.parameterPackageRunId);
          if (
            revision.snapshot.projectId !== project.projectId
            || revision.snapshot.pointId !== point.pointId
            || !classification
            || classification.resultHash !== revision.snapshot.authority.classificationResultHash
            || classification.input.checkRunId !== revision.snapshot.authority.checkRunId
            || !stratificationRevision
            || !parameterPackage
            || parameterPackage.resultHash !== revision.snapshot.authority.parameterPackageResultHash
          ) return { ok: false as const, detail: `Output revision ${revision.revisionId} has invalid upstream authority.` };
        }
        for (const [kind, revisionId] of Object.entries(point.outputWorkspace.activeRevisionIds)) {
          if (!point.outputWorkspace.revisions.some((revision) => revision.revisionId === revisionId && revision.kind === kind && revision.status === 'current')) return { ok: false as const, detail: `Point ${point.pointId} active ${kind} output revision does not exist or is stale.` };
        }
        if (point.outputWorkspace.revisions.length && point.outputState.status === 'current' && !Object.keys(point.outputWorkspace.activeRevisionIds).length) return { ok: false as const, detail: `Point ${point.pointId} current JTS output artifact has no active output revision.` };
      }
      for (const [artifactName, artifact] of Object.entries({
        check: point.checkState.artifact,
        stratification: point.stratificationState,
        parameters: point.parameterState,
        output: point.outputState,
      })) {
        if (['current', 'problem'].includes(artifact.status) && !artifact.input) {
          return { ok: false as const, detail: `Point ${point.pointId} ${artifactName} artifact is missing its input.` };
        }
        if (artifact.input) {
          const dependency = validateDependency(artifact.input, project.projectId, point.pointId, batchById, draftById);
          if (!dependency.ok) return dependency;
        }
      }
    }
  }
  return { ok: true as const };
}

type ReferenceValidationResult = { ok: true } | { ok: false; detail: string };

type BatchBlockValidationCache = {
  rawBlock: ImportDataBlockV2 | undefined;
  normalizedBlock: ImportDataBlockV2 | undefined;
  result: ReferenceValidationResult;
};

const batchBlockValidationCache = new WeakMap<ImportBatchDraftV2, BatchBlockValidationCache>();

function validateBatchBlocks(batch: ImportBatchDraftV2, blockById: Map<string, ImportDataBlockV2>) {
  const rawBlock = batch.rawDataBlockId ? blockById.get(batch.rawDataBlockId) : undefined;
  const normalizedBlock = batch.normalizedDataBlockId ? blockById.get(batch.normalizedDataBlockId) : undefined;
  const cached = batchBlockValidationCache.get(batch);
  if (cached && cached.rawBlock === rawBlock && cached.normalizedBlock === normalizedBlock) return cached.result;
  const result = validateBatchBlocksUncached(batch, blockById);
  batchBlockValidationCache.set(batch, { rawBlock, normalizedBlock, result });
  return result;
}

function validateBatchBlocksUncached(batch: ImportBatchDraftV2, blockById: Map<string, ImportDataBlockV2>): ReferenceValidationResult {
  if (batch.source.mode === 'uploaded-excel') {
    const workbookSheets = batch.source.workbookSheets;
    if (
      !batch.source.sheetName?.trim()
      || !Number.isInteger(batch.source.headerRow)
      || (batch.source.headerRow ?? 0) < 1
      || !Number.isFinite(batch.source.originalFileSize)
      || (batch.source.originalFileSize ?? 0) <= 0
      || !Number.isFinite(batch.source.parseDurationMs)
      || (batch.source.parseDurationMs ?? -1) < 0
      || !Array.isArray(workbookSheets)
      || !workbookSheets.length
      || !workbookSheets.some((sheet) => sheet.sheetName === batch.source.sheetName)
      || workbookSheets.some((sheet) => !sheet.sheetName.trim() || sheet.rowCount < 0 || sheet.columnCount < 0)
    ) {
      return { ok: false as const, detail: `Batch ${batch.batchId} contains invalid Excel source metadata.` };
    }
  }
  if (batch.rawDataBlockId) {
    const rawBlock = blockById.get(batch.rawDataBlockId);
    if (
      !rawBlock ||
      rawBlock.kind !== 'raw' ||
      rawBlock.batchId !== batch.batchId ||
      rawBlock.sourceFingerprint !== batch.sourceFingerprint
    ) {
      return { ok: false as const, detail: `Batch ${batch.batchId} references an invalid raw block.` };
    }
    if (rawBlock.rowReferences && (
      rawBlock.rowReferences.length !== rawBlock.rows.length
      || new Set(rawBlock.rowReferences.map((reference) => reference.sourceRowId)).size !== rawBlock.rowReferences.length
    )) {
      return { ok: false as const, detail: `Batch ${batch.batchId} raw row references are invalid.` };
    }
    const attachment = rawBlock.sourceAttachment;
    if (attachment && (
      !attachment.fileName.trim()
      || !attachment.mimeType.trim()
      || !Number.isInteger(attachment.sizeBytes)
      || attachment.sizeBytes < 0
      || attachment.bytes.length !== attachment.sizeBytes
      || attachment.bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
      || !/^[a-f0-9]{64}$/i.test(attachment.sha256)
      || attachment.fileName !== batch.source.fileName
      || (batch.source.mode === 'uploaded-excel' && attachment.sizeBytes !== batch.source.originalFileSize)
    )) return { ok: false as const, detail: `Batch ${batch.batchId} contains an invalid source attachment.` };
    const extraction = rawBlock.workbookExtraction;
    if (batch.source.mode === 'uploaded-excel' && !extraction) {
      return { ok: false as const, detail: `Batch ${batch.batchId} is missing its Excel workbook extraction.` };
    }
    if (extraction && (
      batch.source.mode !== 'uploaded-excel'
      || extraction.sheetName !== batch.source.sheetName
      || extraction.fidelity !== 'cached-values'
      || extraction.formulaDefinitionsRequireOriginalFile !== true
      || extraction.headerRows.length !== batch.source.headerRow
      || extraction.rows.length !== extraction.displayRowNumbers.length
      || extraction.displayRowNumbers.some((rowNumber, index) => !Number.isInteger(rowNumber) || rowNumber <= (batch.source.headerRow ?? 0) || (index > 0 && rowNumber <= extraction.displayRowNumbers[index - 1]))
    )) {
      return { ok: false as const, detail: `Batch ${batch.batchId} contains an invalid Excel workbook extraction.` };
    }
  }
  if (batch.normalizedDataBlockId) {
    const normalizedBlock = blockById.get(batch.normalizedDataBlockId);
    if (
      !normalizedBlock ||
      normalizedBlock.kind !== 'normalized' ||
      normalizedBlock.batchId !== batch.batchId ||
      normalizedBlock.sourceFingerprint !== batch.sourceFingerprint
    ) {
      return { ok: false as const, detail: `Batch ${batch.batchId} references an invalid normalized block.` };
    }
    if (normalizedBlock.rowReferences && (
      normalizedBlock.rowReferences.length !== normalizedBlock.rows.length
      || new Set(normalizedBlock.rowReferences.map((reference) => reference.sourceRowId)).size !== normalizedBlock.rowReferences.length
      || new Set(normalizedBlock.rowReferences.map((reference) => reference.normalizedIndex)).size !== normalizedBlock.rowReferences.length
      || normalizedBlock.rowReferences.some((reference) =>
        !reference.sourceRowId
        || !Number.isInteger(reference.normalizedIndex)
        || reference.normalizedIndex < 0
        || reference.normalizedIndex >= normalizedBlock.rows.length)
    )) {
      return { ok: false as const, detail: `Batch ${batch.batchId} normalized row references are invalid.` };
    }
  }
  return { ok: true as const };
}

type DraftSourceValidationCache = {
  batch: ImportBatchDraftV2;
  rawBlock: ImportDataBlockV2 | null | undefined;
  normalizedBlock: ImportDataBlockV2;
  result: ReferenceValidationResult;
};

const draftSourceValidationCache = new WeakMap<
  ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  DraftSourceValidationCache
>();

function validatePointDraftSourceRows(
  draft: ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  batch: ImportBatchDraftV2,
  rawBlock: ImportDataBlockV2 | null | undefined,
  normalizedBlock: ImportDataBlockV2,
) {
  const cached = draftSourceValidationCache.get(draft);
  if (
    cached
    && cached.batch === batch
    && cached.rawBlock === rawBlock
    && cached.normalizedBlock === normalizedBlock
  ) return cached.result;
  const result = validatePointDraftSourceRowsUncached(draft, batch, rawBlock, normalizedBlock);
  draftSourceValidationCache.set(draft, { batch, rawBlock, normalizedBlock, result });
  return result;
}

function validatePointDraftSourceRowsUncached(
  draft: ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  batch: ImportBatchDraftV2,
  rawBlock: ImportDataBlockV2 | null | undefined,
  normalizedBlock: ImportDataBlockV2,
): ReferenceValidationResult {
  if (!draft.sourceRowIds.length || new Set(draft.sourceRowIds).size !== draft.sourceRowIds.length) {
    return { ok: false as const, detail: `Draft ${draft.draftId} contains empty or duplicate source-row references.` };
  }
  if (rawBlock?.kind !== 'raw' || rawBlock.completeness !== 'full' || !rawBlock.rowReferences) {
    return { ok: false as const, detail: `Draft ${draft.draftId} cannot verify its source-row references.` };
  }
  const referenceById = new Map(rawBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]));
  if (referenceById.size !== rawBlock.rowReferences.length) {
    return { ok: false as const, detail: `Batch ${batch.batchId} contains duplicate raw source-row references.` };
  }
  const pointMapping = batch.mappings.find((mapping) => mapping.targetField === 'pointName' && mapping.sourceColumnId);
  const pointColumn = pointMapping
    ? batch.sourceColumns.find((column) => column.columnId === pointMapping.sourceColumnId)
    : null;
  for (const sourceRowId of draft.sourceRowIds) {
    const reference = referenceById.get(sourceRowId);
    if (!reference || reference.sourceIndex < 0 || reference.sourceIndex >= rawBlock.rows.length) {
      return { ok: false as const, detail: `Draft ${draft.draftId} references missing source row ${sourceRowId}.` };
    }
    if (pointColumn) {
      const sourcePointName = rawBlock.rows[reference.sourceIndex]?.[pointColumn.sourceIndex] ?? '';
      if (normalizePointIdentity(sourcePointName) !== normalizePointIdentity(draft.sourcePointName)) {
        return { ok: false as const, detail: `Draft ${draft.draftId} references a source row owned by another point.` };
      }
    }
  }
  if (normalizedBlock.kind !== 'normalized') {
    return { ok: false as const, detail: `Draft ${draft.draftId} cannot verify its normalized rows.` };
  }
  if (normalizedBlock.rowReferences) {
    const normalizedReferenceById = new Map(
      normalizedBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]),
    );
    for (const sourceRowId of draft.sourceRowIds) {
      const reference = normalizedReferenceById.get(sourceRowId);
      const normalizedRow = reference ? normalizedBlock.rows[reference.normalizedIndex] : null;
      if (!reference || !normalizedRow) {
        return { ok: false as const, detail: `Draft ${draft.draftId} references a missing normalized source row.` };
      }
      if (normalizePointIdentity(normalizedRow.pointName) !== normalizePointIdentity(draft.sourcePointName)) {
        return { ok: false as const, detail: `Draft ${draft.draftId} normalized source row belongs to another point.` };
      }
    }
    const expectedSourceRowIds = normalizedBlock.rowReferences
      .filter((reference) => normalizePointIdentity(normalizedBlock.rows[reference.normalizedIndex]?.pointName ?? '') === normalizePointIdentity(draft.sourcePointName))
      .sort((left, right) => left.normalizedIndex - right.normalizedIndex)
      .map((reference) => reference.sourceRowId);
    if (stableStringify(expectedSourceRowIds) !== stableStringify(draft.sourceRowIds)) {
      return { ok: false as const, detail: `Draft ${draft.draftId} does not cover the complete ordered normalized rows for its point.` };
    }
    return { ok: true as const };
  }
  const normalizedPointRowCount = normalizedBlock.rows.filter(
    (row) => normalizePointIdentity(row.pointName) === normalizePointIdentity(draft.sourcePointName),
  ).length;
  if (normalizedPointRowCount !== draft.sourceRowIds.length) {
    return { ok: false as const, detail: `Draft ${draft.draftId} source-row count does not match its normalized point rows.` };
  }
  return { ok: true as const };
}

type DraftDataHashCache = {
  normalizedBlock: Extract<ImportDataBlockV2, { kind: 'normalized' }>;
  hash: string | null;
};

const draftDataHashCache = new WeakMap<
  ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  DraftDataHashCache
>();

export function computeDraftNormalizedDataHash(
  draft: ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  normalizedBlock: Extract<ImportDataBlockV2, { kind: 'normalized' }>,
) {
  const cached = draftDataHashCache.get(draft);
  if (cached?.normalizedBlock === normalizedBlock) return cached.hash;
  if (!normalizedBlock.rowReferences) return null;
  const referenceById = new Map(normalizedBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]));
  const rows = draft.sourceRowIds.map((sourceRowId) => {
    const reference = referenceById.get(sourceRowId);
    return reference ? normalizedBlock.rows[reference.normalizedIndex] : undefined;
  });
  const hash = rows.some((row) => !row)
    ? null
    : computeNormalizedPointDataHash(draft.sourceRowIds, rows as typeof normalizedBlock.rows);
  draftDataHashCache.set(draft, { normalizedBlock, hash });
  return hash;
}

function getCheckedGovernanceRows(
  point: ProjectWorkspaceV2['points'][number],
  checkRun: ProjectWorkspaceV2['points'][number]['checkState']['runs'][number],
  draft: ProjectWorkspaceV2['points'][number]['importDrafts'][number],
  normalizedBlock: Extract<ImportDataBlockV2, { kind: 'normalized' }>,
) {
  if (!normalizedBlock.rowReferences) return null;
  const referenceById = new Map(normalizedBlock.rowReferences.map((reference) => [reference.sourceRowId, reference]));
  const valueOverride = checkRun.valueOverrideRevisionId
    ? (point.dataGovernance.valueOverrideRevisions ?? []).find((revision) => revision.revisionId === checkRun.valueOverrideRevisionId)
    : null;
  const exclusion = checkRun.exclusionRevisionId
    ? point.dataGovernance.exclusionRevisions.find((revision) => revision.revisionId === checkRun.exclusionRevisionId)
    : null;
  const smoothing = checkRun.smoothingRunId
    ? point.dataGovernance.smoothingRuns.find((run) => run.runId === checkRun.smoothingRunId)
    : null;
  const overridesByCell = new Map((valueOverride?.overrides ?? []).map((override) => [
    `${override.sourceRowId}:${override.field}`,
    override.effectiveValue,
  ]));
  const excluded = new Set(exclusion?.excludedSourceRowIds ?? []);
  const smoothingById = new Map(smoothing?.rows.map((row) => [row.sourceRowId, row]) ?? []);
  const expectedIds = smoothing?.rows.map((row) => row.sourceRowId)
    ?? draft.sourceRowIds.filter((sourceRowId) => !excluded.has(sourceRowId));

  const rows = expectedIds.map((sourceRowId) => {
    const reference = referenceById.get(sourceRowId);
    const source = reference ? normalizedBlock.rows[reference.normalizedIndex] : null;
    if (!source) return null;
    const row = { ...source };
    (['depthM', 'qcKpa', 'fsKpa', 'u2Kpa'] as const).forEach((field) => {
      const value = overridesByCell.get(`${sourceRowId}:${field}`);
      if (value !== undefined) row[field] = value;
    });
    const smoothed = smoothingById.get(sourceRowId);
    if (smoothed) {
      row.qcKpa = smoothed.smoothedQcKpa;
      row.fsKpa = smoothed.smoothedFsKpa;
      row.u2Kpa = smoothed.smoothedU2Kpa ?? Number.NaN;
    }
    row.qtKpa = row.qcKpa;
    row.frPercent = row.qcKpa > 0 ? (row.fsKpa / row.qcKpa) * 100 : row.frPercent;
    return { sourceRowId, row };
  });
  if (rows.some((row) => row === null)) return null;
  const checkedRows = rows as Array<{ sourceRowId: string; row: (typeof normalizedBlock.rows)[number] }>;
  const context: JtsSeriesContext | undefined = checkRun.jtsContextSnapshot;
  if (!context) return checkedRows;
  if (context.route === 'approximate_cpt') checkedRows.forEach((item) => { item.row.u2Kpa = Number.NaN; });
  const measuredRows = checkedRows.map((item) => ({
    sourceRowId: item.sourceRowId,
    depthM: item.row.depthM,
    qcKpa: item.row.qcKpa,
    fsKpa: item.row.fsKpa,
    u2Kpa: Number.isFinite(item.row.u2Kpa) ? item.row.u2Kpa : null,
  }));
  const derived = deriveJtsSeries(measuredRows, context);
  const derivedById = new Map(derived.ok ? derived.rows.map((row) => [row.sourceRowId, row]) : []);
  checkedRows.forEach((item, index) => {
    const formal = derivedById.get(item.sourceRowId);
    item.row.qtKpa = formal?.qtKpa ?? calculateJtsCorrectedQtKpa(measuredRows[index], context);
    item.row.frPercent = formal?.frPercent ?? Number.NaN;
  });
  return checkedRows;
}

function validateDataGovernanceWorkspace(
  projectId: string,
  point: ProjectWorkspaceV2['points'][number],
  batchById: Map<string, { batchId: string }>,
  draftById: Map<string, { draftId: string; pointId: string; batchId: string }>,
) {
  const workspace = point.dataGovernance;
  if (
    !workspace
    || !Array.isArray(workspace.exclusionRevisions)
    || !Array.isArray(workspace.smoothingRuns)
    || !['raw', 'smoothed', 'overlay'].includes(workspace.viewMode)
  ) return { ok: false as const, detail: `Point ${point.pointId} is missing its V3 data-governance workspace.` };

  const valueOverrideRevisions = workspace.valueOverrideRevisions ?? [];
  const valueOverrideIds = valueOverrideRevisions.map((revision) => revision.revisionId);
  const valueOverrideVersions = valueOverrideRevisions.map((revision) => revision.version);
  if (
    new Set(valueOverrideIds).size !== valueOverrideIds.length
    || new Set(valueOverrideVersions).size !== valueOverrideVersions.length
    || [...valueOverrideVersions].sort((left, right) => left - right).some((version, index) => version !== index + 1)
  ) return { ok: false as const, detail: `Point ${point.pointId} contains invalid value-override revision IDs or versions.` };
  for (const revision of valueOverrideRevisions) {
    const dependency = validateDependency(revision.input, projectId, point.pointId, batchById, draftById);
    if (!dependency.ok) return dependency;
    const sourceDraft = point.importDrafts.find((draft) => draft.draftId === revision.input.draftId);
    const sourceIds = new Set(sourceDraft?.sourceRowIds ?? []);
    const cellKeys = revision.overrides.map((override) => `${override.sourceRowId}:${override.field}`);
    if (
      !revision.revisionId
      || !Number.isInteger(revision.version)
      || revision.version < 1
      || Number.isNaN(Date.parse(revision.createdAt))
      || new Set(cellKeys).size !== cellKeys.length
      || revision.overrides.some((override) => (
        !sourceIds.has(override.sourceRowId)
        || !['depthM', 'qcKpa', 'fsKpa', 'u2Kpa'].includes(override.field)
        || (override.originalValue !== null && !Number.isFinite(override.originalValue))
        || !Number.isFinite(override.effectiveValue)
        || !['source-entry-error', 'unit-conversion-error', 'instrument-anomaly', 'neighbor-supported-correction', 'other-reviewed'].includes(override.reasonCode)
        || !override.reason.trim()
        || Number.isNaN(Date.parse(override.createdAt))
      ))
    ) return { ok: false as const, detail: `Point ${point.pointId} contains a malformed value-override revision.` };
  }
  const currentValueOverride = workspace.currentValueOverrideRevisionId
    ? valueOverrideRevisions.find((revision) => revision.revisionId === workspace.currentValueOverrideRevisionId)
    : null;
  if (workspace.currentValueOverrideRevisionId && !currentValueOverride) {
    return { ok: false as const, detail: `Point ${point.pointId} current value-override revision does not exist.` };
  }

  const revisionIds = workspace.exclusionRevisions.map((revision) => revision.revisionId);
  const versions = workspace.exclusionRevisions.map((revision) => revision.version);
  if (
    new Set(revisionIds).size !== revisionIds.length
    || new Set(versions).size !== versions.length
    || [...versions].sort((left, right) => left - right).some((version, index) => version !== index + 1)
  ) return { ok: false as const, detail: `Point ${point.pointId} contains invalid exclusion revision IDs or versions.` };

  for (const revision of workspace.exclusionRevisions) {
    const dependency = validateDependency(revision.input, projectId, point.pointId, batchById, draftById);
    if (!dependency.ok) return dependency;
    const sourceDraft = point.importDrafts.find((draft) => draft.draftId === revision.input.draftId);
    const sourceIds = new Set(sourceDraft?.sourceRowIds ?? []);
    const decisionIds = revision.decisions.map((decision) => decision.decisionId);
    if (
      !revision.revisionId
      || !Number.isInteger(revision.version)
      || revision.version < 1
      || Number.isNaN(Date.parse(revision.createdAt))
      || new Set(decisionIds).size !== decisionIds.length
      || new Set(revision.excludedSourceRowIds).size !== revision.excludedSourceRowIds.length
      || new Set(revision.permanentlyDeletedSourceRowIds ?? []).size !== (revision.permanentlyDeletedSourceRowIds ?? []).length
      || revision.excludedSourceRowIds.length >= sourceIds.size
      || revision.excludedSourceRowIds.some((sourceRowId) => !sourceIds.has(sourceRowId))
      || (revision.permanentlyDeletedSourceRowIds ?? []).some((sourceRowId) => !sourceIds.has(sourceRowId) || !revision.excludedSourceRowIds.includes(sourceRowId))
      || revision.decisions.some((decision) => (
        !decision.decisionId
        || !['keep', 'exclude', 'delete'].includes(decision.kind)
        || !['row', 'depth-range'].includes(decision.scope)
        || !decision.reason.trim()
        || !decision.sourceRowIds.length
        || new Set(decision.sourceRowIds).size !== decision.sourceRowIds.length
        || decision.sourceRowIds.some((sourceRowId) => !sourceIds.has(sourceRowId))
        || !Number.isFinite(decision.depthFromM)
        || !Number.isFinite(decision.depthToM)
        || decision.depthFromM > decision.depthToM
        || Number.isNaN(Date.parse(decision.createdAt))
      ))
    ) return { ok: false as const, detail: `Point ${point.pointId} contains a malformed exclusion revision.` };
  }

  const currentExclusion = workspace.currentExclusionRevisionId
    ? workspace.exclusionRevisions.find((revision) => revision.revisionId === workspace.currentExclusionRevisionId)
    : null;
  if (workspace.currentExclusionRevisionId && !currentExclusion) {
    return { ok: false as const, detail: `Point ${point.pointId} current exclusion revision does not exist.` };
  }
  const activeInput = getActiveImportDependency(point);
  if (currentValueOverride && (
    currentValueOverride.version !== Math.max(...valueOverrideVersions)
    || !artifactDependenciesEqual(currentValueOverride.input, activeInput)
  )) return { ok: false as const, detail: `Point ${point.pointId} current value-override revision is stale against its active import.` };
  if (currentExclusion && (
    currentExclusion.version !== Math.max(...versions)
    || !artifactDependenciesEqual(currentExclusion.input, activeInput)
  )) return { ok: false as const, detail: `Point ${point.pointId} current exclusion revision is stale against its active import.` };

  const smoothingIds = workspace.smoothingRuns.map((run) => run.runId);
  if (new Set(smoothingIds).size !== smoothingIds.length) {
    return { ok: false as const, detail: `Point ${point.pointId} contains duplicate smoothing run IDs.` };
  }
  for (const run of workspace.smoothingRuns) {
    const dependency = validateDependency(run.input, projectId, point.pointId, batchById, draftById);
    if (!dependency.ok) return dependency;
    const sourceDraft = point.importDrafts.find((draft) => draft.draftId === run.input.draftId);
    const exclusion = run.exclusionRevisionId
      ? workspace.exclusionRevisions.find((revision) => revision.revisionId === run.exclusionRevisionId)
      : null;
    const valueOverride = run.valueOverrideRevisionId
      ? valueOverrideRevisions.find((revision) => revision.revisionId === run.valueOverrideRevisionId)
      : null;
    const excludedIds = exclusion?.excludedSourceRowIds ?? [];
    const expectedIds = sourceDraft?.sourceRowIds.filter((sourceRowId) => !excludedIds.includes(sourceRowId)) ?? [];
    if (
      !run.runId
      || !['completed', 'failed', 'stale'].includes(run.status)
      || !['conservative', 'standard', 'strong', 'custom'].includes(run.settings.preset)
      || !Number.isFinite(run.settings.depthWindowM)
      || run.settings.depthWindowM <= 0
      || run.settings.depthWindowM > 10
      || Number.isNaN(Date.parse(run.createdAt))
      || (run.valueOverrideRevisionId !== null && run.valueOverrideRevisionId !== undefined && !valueOverride)
      || (valueOverride && !artifactDependenciesEqual(valueOverride.input, run.input))
      || (run.exclusionRevisionId !== null && !exclusion)
      || (exclusion && !artifactDependenciesEqual(exclusion.input, run.input))
      || stableStringify(run.excludedSourceRowIds) !== stableStringify(excludedIds)
      || new Set(run.rows.map((row) => row.sourceRowId)).size !== run.rows.length
      || (run.status === 'completed' && stableStringify(run.rows.map((row) => row.sourceRowId)) !== stableStringify(expectedIds))
      || run.rows.some((row) => (
        !Number.isFinite(row.depthM)
        || !Number.isFinite(row.rawQcKpa)
        || !Number.isFinite(row.smoothedQcKpa)
        || !Number.isFinite(row.rawFsKpa)
        || !Number.isFinite(row.smoothedFsKpa)
        || (row.rawU2Kpa !== null && !Number.isFinite(row.rawU2Kpa))
        || (row.smoothedU2Kpa !== null && !Number.isFinite(row.smoothedU2Kpa))
      ))
    ) return { ok: false as const, detail: `Point ${point.pointId} contains a malformed smoothing run.` };
  }

  const activeSmoothing = workspace.activeSmoothingRunId
    ? workspace.smoothingRuns.find((run) => run.runId === workspace.activeSmoothingRunId)
    : null;
  if (workspace.activeSmoothingRunId && !activeSmoothing) {
    return { ok: false as const, detail: `Point ${point.pointId} active smoothing run does not exist.` };
  }
  if (activeSmoothing && (
    activeSmoothing.status !== 'completed'
    || !artifactDependenciesEqual(activeSmoothing.input, activeInput)
    || (activeSmoothing.valueOverrideRevisionId ?? null) !== (currentValueOverride?.revisionId ?? null)
    || activeSmoothing.exclusionRevisionId !== (currentExclusion?.revisionId ?? null)
  )) return { ok: false as const, detail: `Point ${point.pointId} active smoothing run is stale against its active governance input.` };

  return { ok: true as const };
}

function validateStratificationStructure(scheme: StratificationSchemeV2, label: string) {
  const depths = [
    scheme.depthFromM,
    scheme.depthToM,
    ...scheme.layers.flatMap((layer) => [layer.depthFromM, layer.depthToM]),
    ...scheme.boundaries.map((boundary) => boundary.depthM),
  ];
  if (depths.some((depth) => !Number.isFinite(depth))) {
    return { ok: false as const, detail: `${label} contains a non-finite depth value.` };
  }
  if (!scheme.layers.length || scheme.depthToM <= scheme.depthFromM) {
    return { ok: false as const, detail: `${label} has an invalid depth range or no layers.` };
  }
  const layers = [...scheme.layers].sort((left, right) => left.depthFromM - right.depthFromM);
  const boundaries = [...scheme.boundaries].sort((left, right) => left.depthM - right.depthM);
  if (new Set(layers.map((layer) => layer.layerId)).size !== layers.length) {
    return { ok: false as const, detail: `${label} contains duplicate layer IDs.` };
  }
  if (new Set(boundaries.map((boundary) => boundary.boundaryId)).size !== boundaries.length) {
    return { ok: false as const, detail: `${label} contains duplicate boundary IDs.` };
  }
  if (
    Math.abs(layers[0].depthFromM - scheme.depthFromM) > 0.0005
    || Math.abs((layers.at(-1)?.depthToM ?? 0) - scheme.depthToM) > 0.0005
    || layers.some((layer, index) =>
      layer.depthToM - layer.depthFromM < PROTOTYPE_STRATIFICATION_EDIT_SPACING_M
      || (index > 0 && Math.abs(layers[index - 1].depthToM - layer.depthFromM) > 0.0005),
    )
  ) {
    return { ok: false as const, detail: `${label} contains invalid or discontinuous layers.` };
  }
  if (boundaries.length !== layers.length - 1) {
    return { ok: false as const, detail: `${label} boundary count does not match its layers.` };
  }
  for (let index = 0; index < boundaries.length; index += 1) {
    const boundary = boundaries[index];
    if (
      boundary.upperLayerId !== layers[index].layerId
      || boundary.lowerLayerId !== layers[index + 1].layerId
      || Math.abs(boundary.depthM - layers[index].depthToM) > 0.0005
    ) {
      return { ok: false as const, detail: `${label} boundary ${boundary.boundaryId} has invalid layer references.` };
    }
  }
  return { ok: true as const };
}

function validateParameterSourceLineage(
  source: ParameterSourceLineageV2,
  label: string,
  projectId: string,
  point: ProjectWorkspaceV2['points'][number],
  batchById: Map<string, { batchId: string }>,
  draftById: Map<string, { draftId: string; pointId: string; batchId: string }>,
) {
  const dependency = validateDependency(source, projectId, point.pointId, batchById, draftById);
  if (!dependency.ok) return dependency;
  const checkRun = point.checkState.runs.find((run) => run.runId === source.checkRunId);
  if (
    !checkRun
    || checkRun.status !== 'completed'
    || checkRun.conclusion !== '无问题'
    || !artifactDependenciesEqual(checkRun.input, source)
  ) {
    return { ok: false as const, detail: `${label} references an invalid data-check run.` };
  }
  const stratificationRevision = point.stratificationWorkspace?.revisions?.find(
    (revision) => revision.revisionId === source.stratificationRevisionId,
  );
  if (
    !stratificationRevision
    || stratificationRevision.schemeId !== source.stratificationSchemeId
    || stratificationRevision.version !== source.stratificationVersion
    || stratificationRevision.snapshot.input.checkRunId !== source.checkRunId
    || !artifactDependenciesEqual(stratificationRevision.snapshot.input, source)
  ) {
    return { ok: false as const, detail: `${label} references an invalid exact stratification revision.` };
  }
  return { ok: true as const };
}

function validateDependency(
  dependency: ArtifactDependency,
  projectId: string,
  pointId: string,
  batchById: Map<string, { batchId: string }>,
  draftById: Map<string, { draftId: string; pointId: string; batchId: string }>,
) {
  if (dependency.pointId !== pointId) {
    return { ok: false as const, detail: `Project ${projectId} dependency points to unknown point ${dependency.pointId}.` };
  }
  const draft = draftById.get(dependency.draftId);
  if (!draft || draft.pointId !== pointId || draft.batchId !== dependency.batchId) {
    return { ok: false as const, detail: `Point ${pointId} dependency references an invalid draft ${dependency.draftId}.` };
  }
  if (!batchById.has(dependency.batchId)) {
    return { ok: false as const, detail: `Point ${pointId} dependency references an unknown batch ${dependency.batchId}.` };
  }
  const revisions = Object.values(dependency.revisions);
  if (revisions.length !== 5 || revisions.some((revision) => !Number.isInteger(revision) || revision < 1)) {
    return { ok: false as const, detail: `Point ${pointId} dependency contains an invalid revision vector.` };
  }
  return { ok: true as const };
}

function normalizePointIdentity(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function sameParameterInputNumber(left: number | null, right: number | null | undefined) {
  if (left === null || right === null || right === undefined) return left === null && (right === null || right === undefined);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function collectReferencedDataBlockIds(manifest: ProjectManifestV2) {
  const ids = new Set<string>();
  manifest.state.projects.forEach((project) => {
    project.importBatches.forEach((batch) => {
      if (batch.kind !== 'draft') return;
      if (batch.rawDataBlockId) ids.add(batch.rawDataBlockId);
      if (batch.normalizedDataBlockId) ids.add(batch.normalizedDataBlockId);
    });
    project.points.forEach((point) => point.importDrafts.forEach((draft) => ids.add(draft.dataBlockId)));
  });
  return [...ids];
}

function immutableInterpretationProjection(manifest: ProjectManifestV2) {
  return manifest.state.projects.flatMap((project) => project.points.flatMap((point) => {
    const ruleRuns = point.stratificationWorkspace?.ruleRuns ?? [];
    const classificationRuns = point.stratificationWorkspace?.jtsClassificationRuns ?? [];
    const terminalHashedCheckRuns = point.checkState.runs.filter((run) =>
      Boolean(run.normalizedDataHash) && (run.status === 'completed' || run.status === 'failed'),
    );
    if (!point.parameterWorkspace && !ruleRuns.length && !classificationRuns.length && !terminalHashedCheckRuns.length) return [];
    const projection: Record<string, unknown> = {
      projectId: project.projectId,
      pointId: point.pointId,
    };
    if (terminalHashedCheckRuns.length) projection.checkAuthority = terminalHashedCheckRuns;
    if (point.parameterWorkspace) projection.parameterWorkspace = point.parameterWorkspace;
    if (ruleRuns.length) {
      projection.stratificationRuleAuthority = {
        ruleRuns,
        schemes: (point.stratificationWorkspace?.schemes ?? []).filter((scheme) => scheme.origin?.kind === 'rule-candidate'),
        revisions: (point.stratificationWorkspace?.revisions ?? []).filter((revision) => revision.snapshot.origin?.kind === 'rule-candidate'),
        editSession: point.stratificationWorkspace?.editSession?.working.origin?.kind === 'rule-candidate'
          ? point.stratificationWorkspace.editSession
          : null,
      };
    }
    if (classificationRuns.length) {
      projection.jtsClassificationAuthority = {
        classificationRuns,
        schemes: (point.stratificationWorkspace?.schemes ?? []).filter((scheme) => scheme.origin?.kind === 'jts-classification'),
        revisions: (point.stratificationWorkspace?.revisions ?? []).filter((revision) => revision.snapshot.origin?.kind === 'jts-classification'),
        editSession: point.stratificationWorkspace?.editSession?.working.origin?.kind === 'jts-classification'
          ? point.stratificationWorkspace.editSession
          : null,
      };
    }
    return [projection];
  }));
}

function sameStratificationRuleInput(
  left: StratificationRuleRunV1['input'],
  right: StratificationRuleRunV1['input'],
) {
  return left.checkRunId === right.checkRunId && artifactDependenciesEqual(left, right);
}

function isUsableRuleOriginRun(run: StratificationRuleRunV1 | undefined): run is StratificationRuleRunV1 {
  return Boolean(
    run
    && run.status === 'completed'
    && run.candidates.length
    && !run.issues.some((issue) => issue.severity === 'problem'),
  );
}

function committedStratificationProjection(scheme: StratificationSchemeV2) {
  const { status: _status, ...committed } = scheme;
  return committed;
}

function validateRuleBoundaryEvidence(
  scheme: StratificationSchemeV2,
  run: StratificationRuleRunV1,
  label: string,
) {
  const candidateById = new Map(run.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const referencedCandidateIds = scheme.boundaries.flatMap((boundary) => boundary.ruleCandidateRef ? [boundary.ruleCandidateRef.candidateId] : []);
  if (new Set(referencedCandidateIds).size !== referencedCandidateIds.length) {
    return { ok: false as const, detail: `${label} declares the same rule candidate on multiple boundaries.` };
  }
  for (const boundary of scheme.boundaries) {
    const reference = boundary.ruleCandidateRef;
    if (!reference) continue;
    const candidate = candidateById.get(reference.candidateId);
    if (
      reference.ruleRunId !== run.runId
      || !candidate
      || reference.originalDepthM !== candidate.depthM
      || stableStringify(reference.sourceRowIds) !== stableStringify(candidate.sourceRowIds)
    ) return { ok: false as const, detail: `${label} boundary ${boundary.boundaryId} has invalid rule-candidate evidence.` };
  }
  return { ok: true as const };
}

function validateJtsBoundaryEvidence(
  scheme: StratificationSchemeV2,
  run: JtsClassificationRunV4 | undefined,
  label: string,
) {
  if (!run || !['completed', 'stale'].includes(run.status) || !sameStratificationRuleInput(run.input, scheme.input)) {
    return { ok: false as const, detail: `${label} has an invalid JTS classification origin.` };
  }
  const selection = scheme.origin?.kind === 'jts-classification' ? scheme.origin.selection : undefined;
  if (selection) {
    const invalidSelectionFields = [
      selection.policy !== 'dual-path-with-ic-fallback' ? 'policy' : '',
      !['stable', 'all'].includes(selection.candidateMode) ? 'candidateMode' : '',
      !selection.confirmedAt ? 'confirmedAt' : '',
      selection.rawCandidateCount !== run.candidates.length ? 'rawCandidateCount' : '',
      !Number.isInteger(selection.selectedCandidateCount) || selection.selectedCandidateCount < 0 ? 'selectedCandidateCount' : '',
      !Number.isInteger(selection.acceptedUnclassifiableRows ?? 0)
        || (selection.acceptedUnclassifiableRows ?? 0) < 0
        || (selection.acceptedUnclassifiableRows ?? 0) > run.rows.filter((row) => !row.selectedClass).length
        ? 'acceptedUnclassifiableRows' : '',
      selection.candidateMode === 'stable' && !(selection.groupingWindowM && selection.groupingWindowM > 0) ? 'groupingWindowM' : '',
      selection.candidateMode === 'all' && selection.groupingWindowM !== null ? 'groupingWindowM' : '',
    ].filter(Boolean);
    if (invalidSelectionFields.length) {
      return { ok: false as const, detail: `${label} has an invalid JTS classification selection record (${invalidSelectionFields.join(', ')}).` };
    }
  }
  const candidateById = new Map(run.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const referencedIds = scheme.boundaries.flatMap((boundary) => boundary.jtsCandidateRef ? [boundary.jtsCandidateRef.candidateId] : []);
  if (new Set(referencedIds).size !== referencedIds.length) {
    return { ok: false as const, detail: `${label} declares the same JTS candidate on multiple boundaries.` };
  }
  for (const boundary of scheme.boundaries) {
    const reference = boundary.jtsCandidateRef;
    if (!reference) continue;
    const candidate = candidateById.get(reference.candidateId);
    if (
      reference.classificationRunId !== run.runId
      || !candidate
      || reference.originalDepthM !== candidate.depthM
      || stableStringify(reference.sourceRowIds) !== stableStringify([candidate.upperSourceRowId, candidate.lowerSourceRowId])
    ) return { ok: false as const, detail: `${label} boundary ${boundary.boundaryId} has invalid JTS candidate evidence.` };
  }
  return { ok: true as const };
}

function hasStratificationRuleHistory(workspace: StratificationWorkspaceV2 | undefined) {
  return Boolean(workspace?.ruleRuns?.length || workspace?.jtsClassificationRuns?.length);
}

export function validateStratificationAuthorityAppendOnly(
  current: StratificationWorkspaceV2 | undefined,
  candidate: StratificationWorkspaceV2 | undefined,
  pointId: string,
) {
  if (!current) return { ok: true as const };
  if (!candidate) {
    return hasStratificationRuleHistory(current)
      ? { ok: false as const, detail: `Point ${pointId} cannot discard its stratification rule history.` }
      : { ok: true as const };
  }
  const currentTombstones = new Set(current.deletedSchemeIds ?? []);
  const candidateTombstones = new Set(candidate.deletedSchemeIds ?? []);
  for (const schemeId of currentTombstones) {
    if (!candidateTombstones.has(schemeId)) return { ok: false as const, detail: `Stratification scheme tombstone ${schemeId} is append-only.` };
  }
  for (const schemeId of candidateTombstones) {
    if (currentTombstones.has(schemeId)) continue;
    if (!current.schemes.some((scheme) => scheme.schemeId === schemeId) || candidate.schemes.some((scheme) => scheme.schemeId === schemeId)) {
      return { ok: false as const, detail: `Stratification scheme tombstone ${schemeId} does not represent a real deletion.` };
    }
  }
  for (const schemeId of candidateTombstones) {
    const currentRevisionCount = (current.revisions ?? []).filter((revision) => revision.schemeId === schemeId).length;
    const candidateRevisionCount = (candidate.revisions ?? []).filter((revision) => revision.schemeId === schemeId).length;
    if (candidateRevisionCount !== currentRevisionCount) {
      return { ok: false as const, detail: `Deleted stratification scheme ${schemeId} cannot receive new revisions.` };
    }
  }
  const candidateRevisions = new Map((candidate.revisions ?? []).map((revision) => [revision.revisionId, revision]));
  for (const revision of current.revisions ?? []) {
    if (stableStringify(candidateRevisions.get(revision.revisionId)) !== stableStringify(revision)) {
      return { ok: false as const, detail: `Stratification revision ${revision.revisionId} is immutable and append-only.` };
    }
  }
  const candidateRuns = new Map((candidate.ruleRuns ?? []).map((run) => [run.runId, run]));
  for (const run of current.ruleRuns ?? []) {
    const nextRun = candidateRuns.get(run.runId);
    if (!nextRun) return { ok: false as const, detail: `Stratification rule run ${run.runId} is append-only and cannot disappear.` };
    if (isTerminalStratificationRuleStatus(run.status)) {
      if (stableStringify(nextRun) !== stableStringify(run)) {
        return { ok: false as const, detail: `Terminal stratification rule run ${run.runId} is immutable.` };
      }
      continue;
    }
    if (stableStringify(stratificationRuleImmutableProjection(nextRun)) !== stableStringify(stratificationRuleImmutableProjection(run))) {
      return { ok: false as const, detail: `Stratification rule run ${run.runId} changed its immutable command input.` };
    }
    if (!allowedStratificationRuleTransition(run.status, nextRun.status)) {
      return { ok: false as const, detail: `Stratification rule run ${run.runId} has an invalid state transition.` };
    }
  }
  const candidateClassificationRuns = new Map((candidate.jtsClassificationRuns ?? []).map((run) => [run.runId, run]));
  for (const run of current.jtsClassificationRuns ?? []) {
    const nextRun = candidateClassificationRuns.get(run.runId);
    if (!nextRun) return { ok: false as const, detail: `JTS classification run ${run.runId} is append-only and cannot disappear.` };
    if (run.status === 'completed' && nextRun.status === 'stale') {
      const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = run;
      const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = nextRun;
      if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !nextRun.staleReason) {
        return { ok: false as const, detail: `JTS classification run ${run.runId} changed immutable evidence while becoming stale.` };
      }
    } else if (stableStringify(nextRun) !== stableStringify(run)) {
      return { ok: false as const, detail: `JTS classification run ${run.runId} is immutable after completion.` };
    }
  }
  return { ok: true as const };
}

function isTerminalStratificationRuleStatus(status: StratificationRuleRunV1['status']) {
  return ['completed', 'cancelled', 'failed', 'invalidated'].includes(status);
}

function allowedStratificationRuleTransition(
  current: StratificationRuleRunV1['status'],
  candidate: StratificationRuleRunV1['status'],
) {
  if (current === candidate) return true;
  const allowed: Record<'queued' | 'running' | 'cancel-requested', StratificationRuleRunV1['status'][]> = {
    queued: ['running', 'cancel-requested', 'completed', 'cancelled', 'failed', 'invalidated'],
    running: ['cancel-requested', 'completed', 'cancelled', 'failed', 'invalidated'],
    'cancel-requested': ['cancelled', 'invalidated'],
  };
  return current in allowed && allowed[current as keyof typeof allowed].includes(candidate);
}

function stratificationRuleImmutableProjection(run: StratificationRuleRunV1) {
  const {
    status: _status,
    candidates: _candidates,
    issues: _issues,
    summary: _summary,
    resultHash: _resultHash,
    startedAt: _startedAt,
    completedAt: _completedAt,
    cancelledAt: _cancelledAt,
    failedAt: _failedAt,
    invalidatedAt: _invalidatedAt,
    invalidationReason: _invalidationReason,
    errorCode: _errorCode,
    errorMessage: _errorMessage,
    ...immutable
  } = run;
  return immutable;
}

export function validateInterpretationAuthorityAppendOnly(current: ProjectManifestV2, candidate: ProjectManifestV2) {
  const candidateProjects = new Map(candidate.state.projects.map((project) => [project.projectId, project]));
  for (const currentProject of current.state.projects) {
    const candidateProject = candidateProjects.get(currentProject.projectId);
    if (!candidateProject) {
      const ownsImmutableAuthority = currentProject.points.some((point) =>
        (point.parameterWorkspace && hasParameterAuthorityHistory(point.parameterWorkspace))
        || hasStratificationRuleHistory(point.stratificationWorkspace)
        || point.dataGovernance.exclusionRevisions.length > 0
        || point.dataGovernance.smoothingRuns.length > 0
        || (point.outputWorkspace?.revisions.length ?? 0) > 0);
      if (ownsImmutableAuthority) {
        return { ok: false as const, detail: `Project ${currentProject.projectId} cannot discard its immutable interpretation history through a normal save.` };
      }
      continue;
    }
    const candidatePoints = new Map(candidateProject.points.map((point) => [point.pointId, point]));
    for (const currentPoint of currentProject.points) {
      const candidatePoint = candidatePoints.get(currentPoint.pointId);
      const currentWorkspace = currentPoint.parameterWorkspace;
      const candidateWorkspace = candidatePoint?.parameterWorkspace;
      if (!candidatePoint) {
        if (
          (currentWorkspace && hasParameterAuthorityHistory(currentWorkspace))
          || hasStratificationRuleHistory(currentPoint.stratificationWorkspace)
          || currentPoint.dataGovernance.exclusionRevisions.length > 0
          || currentPoint.dataGovernance.smoothingRuns.length > 0
          || (currentPoint.outputWorkspace?.revisions.length ?? 0) > 0
        ) {
          return { ok: false as const, detail: `Point ${currentPoint.pointId} cannot discard its immutable interpretation history through a normal save.` };
        }
        continue;
      }
      const candidateCheckRuns = new Map(candidatePoint.checkState.runs.map((run) => [run.runId, run]));
      for (const checkRun of currentPoint.checkState.runs) {
        const candidateCheckRun = candidateCheckRuns.get(checkRun.runId);
        if (!candidateCheckRun) return { ok: false as const, detail: `Check run ${checkRun.runId} is append-only and cannot disappear.` };
        if (checkRun.status !== 'running' && stableStringify(candidateCheckRun) !== stableStringify(checkRun)) {
          return { ok: false as const, detail: `Terminal check run ${checkRun.runId} is immutable.` };
        }
        if (checkRun.status === 'running' && (
          stableStringify(checkRun.input) !== stableStringify(candidateCheckRun.input)
          || checkRun.createdAt !== candidateCheckRun.createdAt
          || !['running', 'completed', 'failed'].includes(candidateCheckRun.status)
        )) return { ok: false as const, detail: `Check run ${checkRun.runId} changed immutable input or has an invalid transition.` };
      }
      const candidateExclusions = new Map(candidatePoint.dataGovernance.exclusionRevisions.map((revision) => [revision.revisionId, revision]));
      for (const revision of currentPoint.dataGovernance.exclusionRevisions) {
        if (stableStringify(candidateExclusions.get(revision.revisionId)) !== stableStringify(revision)) {
          return { ok: false as const, detail: `Exclusion revision ${revision.revisionId} is immutable and append-only.` };
        }
      }
      const candidateSmoothingRuns = new Map(candidatePoint.dataGovernance.smoothingRuns.map((run) => [run.runId, run]));
      for (const run of currentPoint.dataGovernance.smoothingRuns) {
        const next = candidateSmoothingRuns.get(run.runId);
        if (!next) return { ok: false as const, detail: `Smoothing run ${run.runId} is append-only and cannot disappear.` };
        if (run.status === 'completed' && next.status === 'stale') {
          const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = run;
          const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = next;
          if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !next.staleReason) {
            return { ok: false as const, detail: `Smoothing run ${run.runId} changed immutable evidence while becoming stale.` };
          }
        } else if (stableStringify(next) !== stableStringify(run)) {
          return { ok: false as const, detail: `Smoothing run ${run.runId} is immutable after completion.` };
        }
      }
      const stratificationMutation = validateStratificationAuthorityAppendOnly(
        currentPoint.stratificationWorkspace,
        candidatePoint.stratificationWorkspace,
        currentPoint.pointId,
      );
      if (!stratificationMutation.ok) return stratificationMutation;
      const candidateOutputRevisions = candidatePoint.outputWorkspace?.revisions ?? [];
      const candidateOutputs = new Map(candidateOutputRevisions.map((revision) => [revision.revisionId, revision]));
      const replacementPdf = candidateOutputRevisions.find((revision) => revision.kind === 'a3-atlas-pdf' || revision.kind === 'a4-report-pdf');
      const replacementWorkbook = candidateOutputRevisions.find((revision) => revision.kind === 'excel-workbook');
      const completeCurrentReplacementPair = candidateOutputRevisions.length === 2
        && replacementPdf?.status === 'current'
        && replacementWorkbook?.status === 'current'
        && replacementPdf.inputHash === replacementWorkbook.inputHash
        && stableStringify(replacementPdf.snapshot) === stableStringify(replacementWorkbook.snapshot);
      for (const revision of currentPoint.outputWorkspace?.revisions ?? []) {
        const next = candidateOutputs.get(revision.revisionId);
        if (!next) {
          if (revision.status === 'current' && completeCurrentReplacementPair) continue;
          return { ok: false as const, detail: `Output revision ${revision.revisionId} is append-only and cannot disappear without a complete current PDF/Excel replacement pair.` };
        }
        if (revision.status === 'current' && next.status === 'stale') {
          const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = revision;
          const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = next;
          if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !next.staleReason) return { ok: false as const, detail: `Output revision ${revision.revisionId} changed immutable evidence while becoming stale.` };
        } else if (stableStringify(next) !== stableStringify(revision)) return { ok: false as const, detail: `Output revision ${revision.revisionId} is immutable.` };
      }
      if (!currentWorkspace) continue;
      if (!candidateWorkspace && hasParameterAuthorityHistory(currentWorkspace)) {
        return { ok: false as const, detail: `Point ${currentPoint.pointId} cannot discard its parameter authority history.` };
      }
      if (!candidateWorkspace) continue;
      const candidateSchemeRevisions = new Map(candidateWorkspace.revisions.map((revision) => [revision.revisionId, revision]));
      for (const revision of currentWorkspace.revisions) {
        if (stableStringify(candidateSchemeRevisions.get(revision.revisionId)) !== stableStringify(revision)) {
          return { ok: false as const, detail: `Parameter scheme revision ${revision.revisionId} is immutable and append-only.` };
        }
      }
      const candidateEvidence = new Map((candidateWorkspace.methodEvidenceRevisions ?? []).map((revision) => [revision.revisionId, revision]));
      for (const revision of currentWorkspace.methodEvidenceRevisions ?? []) {
        if (stableStringify(candidateEvidence.get(revision.revisionId)) !== stableStringify(revision)) {
          return { ok: false as const, detail: `Parameter evidence revision ${revision.revisionId} is immutable and append-only.` };
        }
      }
      const candidateTests = new Map((candidateWorkspace.referenceTestRevisions ?? []).map((revision) => [revision.revisionId, revision]));
      for (const revision of currentWorkspace.referenceTestRevisions ?? []) {
        if (stableStringify(candidateTests.get(revision.revisionId)) !== stableStringify(revision)) {
          return { ok: false as const, detail: `Reference test revision ${revision.revisionId} is immutable and append-only.` };
        }
      }
      const candidateDerivations = new Map(candidateWorkspace.derivationRuns.map((run) => [run.runId, run]));
      for (const run of currentWorkspace.derivationRuns) {
        const next = candidateDerivations.get(run.runId);
        const transition = validateAppendOnlyRunTransition(run, next, derivationRunImmutableProjection);
        if (!transition.ok) return transition;
      }
      const candidateMethods = new Map(candidateWorkspace.parameterRuns.map((run) => [run.runId, run]));
      for (const run of currentWorkspace.parameterRuns) {
        const next = candidateMethods.get(run.runId);
        const transition = validateAppendOnlyRunTransition(run, next, methodRunImmutableProjection);
        if (!transition.ok) return transition;
      }
      const candidateJtsPackages = new Map((candidateWorkspace.jtsParameterPackageRuns ?? []).map((run) => [run.runId, run]));
      for (const run of currentWorkspace.jtsParameterPackageRuns ?? []) {
        const next = candidateJtsPackages.get(run.runId);
        if (!next) return { ok: false as const, detail: `JTS parameter package ${run.runId} is append-only and cannot disappear.` };
        if (run.status === 'completed' && next.status === 'stale') {
          const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = run;
          const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = next;
          if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !next.staleReason) {
            return { ok: false as const, detail: `JTS parameter package ${run.runId} changed immutable evidence while becoming stale.` };
          }
        } else if (stableStringify(next) !== stableStringify(run)) {
          return { ok: false as const, detail: `JTS parameter package ${run.runId} is immutable after completion.` };
        }
      }
      const candidateDissipationTests = new Map((candidateWorkspace.jtsDissipationTests ?? []).map((item) => [item.revisionId, item]));
      for (const item of currentWorkspace.jtsDissipationTests ?? []) {
        const next = candidateDissipationTests.get(item.revisionId);
        if (!next) return { ok: false as const, detail: `Dissipation test ${item.revisionId} is append-only and cannot disappear.` };
        if (item.status !== 'stale' && next.status === 'stale') {
          const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = item;
          const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = next;
          if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !next.staleReason) return { ok: false as const, detail: `Dissipation test ${item.revisionId} changed immutable evidence while becoming stale.` };
        } else if (stableStringify(next) !== stableStringify(item)) return { ok: false as const, detail: `Dissipation test ${item.revisionId} is immutable.` };
      }
      const candidateT50s = new Map((candidateWorkspace.jtsDissipationT50Revisions ?? []).map((item) => [item.revisionId, item]));
      for (const item of currentWorkspace.jtsDissipationT50Revisions ?? []) {
        if (stableStringify(candidateT50s.get(item.revisionId)) !== stableStringify(item)) return { ok: false as const, detail: `Dissipation t50 revision ${item.revisionId} is immutable and append-only.` };
      }
      const candidateDissipationResults = new Map((candidateWorkspace.jtsDissipationResults ?? []).map((item) => [item.revisionId, item]));
      for (const item of currentWorkspace.jtsDissipationResults ?? []) {
        const next = candidateDissipationResults.get(item.revisionId);
        if (!next) return { ok: false as const, detail: `Dissipation result ${item.revisionId} is append-only and cannot disappear.` };
        if (item.status === 'completed' && next.status === 'stale') {
          const { status: _currentStatus, staleReason: _currentReason, ...currentImmutable } = item;
          const { status: _nextStatus, staleReason: _nextReason, ...nextImmutable } = next;
          if (stableStringify(currentImmutable) !== stableStringify(nextImmutable) || !next.staleReason) return { ok: false as const, detail: `Dissipation result ${item.revisionId} changed immutable evidence while becoming stale.` };
        } else if (stableStringify(next) !== stableStringify(item)) return { ok: false as const, detail: `Dissipation result ${item.revisionId} is immutable.` };
      }
      const changedEvidenceRevisions = changedCurrentRevisionIds(
        currentWorkspace.currentMethodEvidenceRefs ?? {},
        candidateWorkspace.currentMethodEvidenceRefs ?? {},
      );
      const changedTestRevisions = changedCurrentRevisionIds(
        currentWorkspace.currentReferenceTestRefs ?? {},
        candidateWorkspace.currentReferenceTestRefs ?? {},
      );
      for (const run of currentWorkspace.parameterRuns.filter((candidate) => isOpenRunStatus(candidate.status))) {
        const referencesChangedEvidence = run.evidenceSnapshot.some((evidence) =>
          changedEvidenceRevisions.has(evidence.evidenceRevisionRefs.rate)
          || changedEvidenceRevisions.has(evidence.evidenceRevisionRefs.drainage)
          || changedEvidenceRevisions.has(evidence.evidenceRevisionRefs.material)
          || (evidence.evidenceRevisionRefs.conflictContext !== null && changedEvidenceRevisions.has(evidence.evidenceRevisionRefs.conflictContext)));
        const referencesChangedTest = run.settingsSnapshot.kind === 'suc_qnet_nkt_v1'
          && run.settingsSnapshot.nktByLayer.some((entry) =>
            entry.setting.matchedPairs?.some((pair) => changedTestRevisions.has(pair.referenceTestRevisionId)));
        if ((referencesChangedEvidence || referencesChangedTest) && candidateMethods.get(run.runId)?.status !== 'invalidated') {
          return { ok: false as const, detail: `Open parameter method run ${run.runId} must be invalidated when its authority revision changes.` };
        }
      }
    }
  }
  return { ok: true as const };
}

function hasParameterAuthorityHistory(workspace: NonNullable<ProjectWorkspaceV2['points'][number]['parameterWorkspace']>) {
  return Boolean(
    workspace.revisions.length || workspace.derivationRuns.length || workspace.parameterRuns.length || (workspace.jtsParameterPackageRuns?.length ?? 0)
    || (workspace.jtsDissipationTests?.length ?? 0) || (workspace.jtsDissipationT50Revisions?.length ?? 0) || (workspace.jtsDissipationResults?.length ?? 0)
    || (workspace.methodEvidenceRevisions?.length ?? 0) || (workspace.referenceTestRevisions?.length ?? 0),
  );
}

function isOpenRunStatus(status: string) {
  return ['queued', 'running', 'cancel-requested'].includes(status);
}

function validateAppendOnlyRunTransition<T extends { runId: string; status: string }>(
  current: T,
  candidate: T | undefined,
  immutableProjection: (run: T) => unknown,
) {
  if (!candidate) return { ok: false as const, detail: `Parameter run ${current.runId} is append-only and cannot disappear.` };
  if (!isOpenRunStatus(current.status)) {
    return stableStringify(candidate) === stableStringify(current)
      ? { ok: true as const }
      : { ok: false as const, detail: `Terminal parameter run ${current.runId} is immutable.` };
  }
  if (stableStringify(immutableProjection(candidate)) !== stableStringify(immutableProjection(current))) {
    return { ok: false as const, detail: `Parameter run ${current.runId} changed its immutable command or input snapshot.` };
  }
  if (candidate.status === current.status) {
    return stableStringify(candidate) === stableStringify(current)
      ? { ok: true as const }
      : { ok: false as const, detail: `Open parameter run ${current.runId} changed without a state transition.` };
  }
  const allowed: Record<string, string[]> = {
    queued: ['running', 'cancel-requested', 'completed', 'cancelled', 'failed', 'invalidated'],
    running: ['cancel-requested', 'completed', 'cancelled', 'failed', 'invalidated'],
    'cancel-requested': ['cancelled', 'invalidated'],
  };
  return allowed[current.status]?.includes(candidate.status)
    ? { ok: true as const }
    : { ok: false as const, detail: `Parameter run ${current.runId} cannot transition from ${current.status} to ${candidate.status}.` };
}

function derivationRunImmutableProjection(run: ParameterInputDerivationRunV2) {
  const {
    status: _status, derivedRows: _derivedRows, summary: _summary, issues: _issues,
    startedAt: _startedAt, cancelRequestedAt: _cancelRequestedAt, completedAt: _completedAt,
    failedAt: _failedAt, cancelledAt: _cancelledAt, invalidatedAt: _invalidatedAt,
    invalidationReason: _invalidationReason, errorCode: _errorCode, errorMessage: _errorMessage,
    ...immutable
  } = run;
  return immutable;
}

function methodRunImmutableProjection(run: ParameterRunV2) {
  const {
    status: _status, values: _values, layerSummaries: _layerSummaries, summary: _summary, issues: _issues, resultHash: _resultHash,
    startedAt: _startedAt, cancelRequestedAt: _cancelRequestedAt, completedAt: _completedAt,
    failedAt: _failedAt, cancelledAt: _cancelledAt, invalidatedAt: _invalidatedAt,
    invalidationReason: _invalidationReason, errorCode: _errorCode, errorMessage: _errorMessage,
    ...immutable
  } = run;
  return immutable;
}

function changedCurrentRevisionIds(current: Record<string, string>, candidate: Record<string, string>) {
  const changed = new Set<string>();
  for (const [objectId, revisionId] of Object.entries(current)) {
    if (candidate[objectId] !== revisionId) changed.add(revisionId);
  }
  return changed;
}

function interpretationAuthorityDigestKey(manifestId: string) {
  return `parameter-authority-digest:${manifestId}`;
}

function interpretationAuthorityDigest(manifest: ProjectManifestV2) {
  return sha256HexSync(stableStringify(immutableInterpretationProjection(manifest)));
}

function manifestHasImmutableInterpretationAuthority(manifest: ProjectManifestV2) {
  return manifest.state.projects.some((project) => project.points.some((point) =>
    (
      point.parameterWorkspace?.parameterWorkspaceSchemaVersion === 'parameter-workspace-g1b.v1'
      && hasParameterAuthorityHistory(point.parameterWorkspace)
    )
    || hasStratificationRuleHistory(point.stratificationWorkspace)
    || point.checkState.runs.some((run) =>
      Boolean(run.normalizedDataHash) && (run.status === 'completed' || run.status === 'failed'),
    )));
}

async function findMigrationRecord(store: IDBObjectStore, manifestId: string) {
  const records = await requestResult<MigrationRecordV2[]>(store.getAll());
  return records.find((record) => record.targetManifestId === manifestId) ?? null;
}

function openWorkspaceDatabase(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(WORKSPACE_DATABASE_NAME, WORKSPACE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(stores.manifests)) {
        database.createObjectStore(stores.manifests, { keyPath: 'manifestId' });
      }
      if (!database.objectStoreNames.contains(stores.dataBlocks)) {
        database.createObjectStore(stores.dataBlocks, { keyPath: 'dataBlockId' });
      }
      if (!database.objectStoreNames.contains(stores.migrations)) {
        database.createObjectStore(stores.migrations, { keyPath: 'migrationId' });
      }
      if (!database.objectStoreNames.contains(stores.metadata)) {
        database.createObjectStore(stores.metadata, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open workspace database.'));
    request.onblocked = () => reject(new Error('Workspace database open was blocked.'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Workspace database transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Workspace database transaction failed.'));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Workspace database request failed.'));
  });
}

function getIndexedDbFactory() {
  return typeof indexedDB === 'undefined' ? null : indexedDB;
}

function getBootStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
