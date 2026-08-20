import { expect, test } from '@playwright/test';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import {
  clearProjectCollectionStorage,
  loadProjectCollectionStorage,
  PROJECT_STORAGE_KEY,
  saveProjectCollectionStorage,
  type StorageLike,
} from '../../src/features/projects/projectStorage';
import { createWorkspace } from './fixtures/projectWorkspace';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  failRead = false;
  failWrite = false;
  failRemove = false;

  getItem(key: string) {
    if (this.failRead) throw new Error('read denied');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('quota exceeded');
    this.values.set(key, value);
  }

  removeItem(key: string) {
    if (this.failRemove) throw new Error('remove denied');
    this.values.delete(key);
  }
}

test('local project storage saves, loads, and removes a versioned collection', () => {
  const storage = new MemoryStorage();
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  const state = createProjectCollectionState([projectA, projectB], projectB.projectId);

  expect(loadProjectCollectionStorage(storage)).toMatchObject({ ok: true, source: 'empty' });
  expect(saveProjectCollectionStorage(storage, state, '2026-07-10T05:00:00.000Z')).toEqual({
    ok: true,
    action: 'saved',
  });
  expect(storage.values.has(PROJECT_STORAGE_KEY)).toBe(true);

  const loaded = loadProjectCollectionStorage(storage);
  expect(loaded.ok).toBe(true);
  if (loaded.ok) expect(loaded.state).toEqual(state);

  expect(saveProjectCollectionStorage(storage, createProjectCollectionState([], null))).toEqual({
    ok: true,
    action: 'removed',
  });
  expect(storage.values.has(PROJECT_STORAGE_KEY)).toBe(false);

  storage.values.set(PROJECT_STORAGE_KEY, 'temporary');
  expect(clearProjectCollectionStorage(storage)).toEqual({ ok: true, action: 'removed' });
});
test('local project storage classifies read, write, remove, and invalid snapshot failures', () => {
  const storage = new MemoryStorage();
  const state = createProjectCollectionState([createWorkspace('project-a', '项目 A')], 'project-a');

  storage.failRead = true;
  expect(loadProjectCollectionStorage(storage)).toMatchObject({ ok: false, reason: 'read-failed', detail: 'read denied' });
  storage.failRead = false;

  storage.values.set(PROJECT_STORAGE_KEY, '{broken');
  expect(loadProjectCollectionStorage(storage)).toMatchObject({ ok: false, reason: 'invalid-snapshot' });

  storage.failWrite = true;
  expect(saveProjectCollectionStorage(storage, state)).toMatchObject({
    ok: false,
    reason: 'write-failed',
    detail: 'quota exceeded',
  });
  storage.failWrite = false;

  storage.failRemove = true;
  expect(clearProjectCollectionStorage(storage)).toMatchObject({
    ok: false,
    reason: 'remove-failed',
    detail: 'remove denied',
  });
});
