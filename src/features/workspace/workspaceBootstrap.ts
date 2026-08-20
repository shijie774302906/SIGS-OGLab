import { PROJECT_STORAGE_KEY, type StorageLike } from '../projects/projectStorage';
import {
  loadActiveWorkspaceV2,
  type WorkspaceDatabaseLoadResult,
} from './workspaceDatabase';
import type { ImportDataBlockV2, MigrationRecordV2, ProjectManifestV2 } from './workspaceV2';

export type WorkspaceBootstrapResult =
  | {
      ok: true;
      source: 'v3' | 'empty';
      manifest: ProjectManifestV2 | null;
      dataBlocks: ImportDataBlockV2[];
      migrationRecord: MigrationRecordV2 | null;
      notice?: string;
    }
  | {
      ok: false;
      reason: 'database-unavailable' | 'database-load-failed';
      detail: string;
      preserved: true;
      canRetry: boolean;
      canReset: boolean;
    };

/**
 * Stage 1 starts a new V3 authority store. V1/V2 data is intentionally not
 * migrated: the old browser stores remain untouched and the new workspace
 * starts empty until the user creates a project.
 */
export async function bootstrapWorkspaceV2(options: {
  factory?: IDBFactory;
  legacyStorage: StorageLike | null;
  bootStorage?: Storage | null;
  now: string;
}): Promise<WorkspaceBootstrapResult> {
  void options.legacyStorage;
  void options.bootStorage;
  void options.now;
  const loaded = await loadActiveWorkspaceV2({ factory: options.factory });
  if (loaded.ok) return asReadyV3(loaded);
  if (loaded.reason === 'empty') {
    let hasLegacyData = false;
    try { hasLegacyData = Boolean(options.legacyStorage?.getItem(PROJECT_STORAGE_KEY)); } catch { /* current workspace remains usable */ }
    return {
      ok: true,
      source: 'empty',
      manifest: null,
      dataBlocks: [],
      migrationRecord: null,
      notice: hasLegacyData ? '发现旧版浏览器数据，当前版本不会改动它。需要时请先在旧版导出，再开始新项目。' : undefined,
    };
  }
  if (loaded.reason === 'unavailable') {
    return {
      ok: true,
      source: 'empty',
      manifest: null,
      dataBlocks: [],
      migrationRecord: null,
      notice: '当前浏览器不允许使用本机项目数据库。',
    };
  }
  return {
    ok: false,
    reason: 'database-load-failed',
    detail: loaded.detail,
    preserved: true,
    canRetry: true,
    canReset: true,
  };
}

function asReadyV3(result: Extract<WorkspaceDatabaseLoadResult, { ok: true }>): WorkspaceBootstrapResult {
  return {
    ok: true,
    source: 'v3',
    manifest: result.manifest,
    dataBlocks: result.dataBlocks,
    migrationRecord: null,
  };
}
