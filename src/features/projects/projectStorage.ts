import { createProjectCollectionState, type ProjectCollectionState } from './projectCollection';
import {
  decodeProjectCollectionSnapshot,
  encodeProjectCollectionSnapshot,
  type ProjectSnapshotDecodeResult,
} from './projectSnapshot';

export const PROJECT_STORAGE_KEY = 'sigs-oglab.project-collection.v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getBrowserProjectStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type ProjectStorageLoadResult =
  | { ok: true; source: 'empty' | 'snapshot'; state: ProjectCollectionState }
  | {
      ok: false;
      reason: 'read-failed' | 'invalid-snapshot' | 'unsupported-version';
      detail: string;
      decode?: ProjectSnapshotDecodeResult;
    };

export type ProjectStorageWriteResult =
  | { ok: true; action: 'saved' | 'removed' }
  | { ok: false; reason: 'write-failed' | 'remove-failed'; detail: string };

export function loadProjectCollectionStorage(storage: StorageLike): ProjectStorageLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PROJECT_STORAGE_KEY);
  } catch (error) {
    return { ok: false, reason: 'read-failed', detail: errorMessage(error, '无法读取本机项目。') };
  }

  const decoded = decodeProjectCollectionSnapshot(raw);
  if (!decoded.ok) {
    if (decoded.reason === 'empty') {
      return { ok: true, source: 'empty', state: createProjectCollectionState([], null) };
    }
    return {
      ok: false,
      reason: decoded.reason === 'unsupported-version' ? 'unsupported-version' : 'invalid-snapshot',
      detail: decoded.detail,
      decode: decoded,
    };
  }
  return { ok: true, source: 'snapshot', state: decoded.state };
}

export function saveProjectCollectionStorage(
  storage: StorageLike,
  state: ProjectCollectionState,
  savedAt = new Date().toISOString(),
): ProjectStorageWriteResult {
  if (!state.projects.length) {
    return clearProjectCollectionStorage(storage);
  }
  try {
    storage.setItem(PROJECT_STORAGE_KEY, encodeProjectCollectionSnapshot(state, savedAt));
    return { ok: true, action: 'saved' };
  } catch (error) {
    return { ok: false, reason: 'write-failed', detail: errorMessage(error, '无法保存本机项目。') };
  }
}

export function clearProjectCollectionStorage(storage: StorageLike): ProjectStorageWriteResult {
  try {
    storage.removeItem(PROJECT_STORAGE_KEY);
    return { ok: true, action: 'removed' };
  } catch (error) {
    return { ok: false, reason: 'remove-failed', detail: errorMessage(error, '无法清除本机项目。') };
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
