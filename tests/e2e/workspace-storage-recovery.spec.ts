import { expect, test } from '@playwright/test';
import {
  diagnoseWorkspaceStorageFailure,
  formatBrowserStorageStatus,
  inspectBrowserStorage,
} from '../../src/features/workspace/workspaceStorageRecovery';

test('storage failures distinguish quota, availability, conflict, invalid data, and temporary writes', () => {
  const quota = diagnoseWorkspaceStorageFailure({ reason: 'write-failed', detail: 'QuotaExceededError: storage quota exceeded' });
  expect(quota).toMatchObject({ code: 'quota', canRetry: true, actionLabel: '重试保存' });
  expect(quota.steps.join(' ')).toContain('不要刷新');

  expect(diagnoseWorkspaceStorageFailure({ reason: 'unavailable', detail: 'IndexedDB is not available.' })).toMatchObject({ code: 'unavailable', canRetry: true });
  expect(diagnoseWorkspaceStorageFailure({ reason: 'open-failed', detail: 'SecurityError' })).toMatchObject({ code: 'unavailable', canRetry: true });
  expect(diagnoseWorkspaceStorageFailure({ reason: 'conflict', detail: 'Expected revision 2, found 3.' })).toMatchObject({ code: 'conflict', canRetry: false });
  expect(diagnoseWorkspaceStorageFailure({ reason: 'invalid-bundle', detail: 'Missing immutable revision.' })).toMatchObject({
    code: 'invalid-data',
    canRetry: false,
    title: '项目内部记录没有对上，尚未保存',
  });
  expect(diagnoseWorkspaceStorageFailure({ reason: 'write-failed', detail: 'AbortError' })).toMatchObject({ code: 'temporary', canRetry: true });
});

test('deleted-point identity conflicts are explained without blaming CPT values', () => {
  const diagnosis = diagnoseWorkspaceStorageFailure({
    reason: 'invalid-bundle',
    detail: 'Project project-1 contains an invalid deleted-point record.',
  });
  expect(diagnosis).toMatchObject({
    code: 'invalid-data',
    title: '点位记录没有对上，尚未保存',
    canRetry: false,
  });
  expect(diagnosis.summary).toContain('不是 qc、fs、u2 的数值问题');
  expect(diagnosis.steps.join(' ')).toContain('再次确认导入');
  expect(diagnosis.technicalDetail).toContain('invalid deleted-point record');
});

test('stratification origin conflicts name the failed return without blaming measurements', () => {
  const diagnosis = diagnoseWorkspaceStorageFailure({
    reason: 'invalid-bundle',
    detail: 'Point point-1 stratification edit session changed its scheme origin.',
  });
  expect(diagnosis).toMatchObject({
    code: 'invalid-data',
    title: '分层来源没有对上，尚未保存',
    canRetry: false,
  });
  expect(diagnosis.summary).toContain('返回的分层快照');
  expect(diagnosis.summary).toContain('不是 qc、fs、u2');
});

test('near-full browser estimate upgrades an opaque write failure to a quota diagnosis', () => {
  const diagnosis = diagnoseWorkspaceStorageFailure(
    { reason: 'write-failed', detail: 'AbortError' },
    { usageBytes: 96, quotaBytes: 100, usageRatio: 0.96, persisted: false },
  );
  expect(diagnosis).toMatchObject({ code: 'quota' });
});

test('browser storage inspection and formatting are bounded and optional', async () => {
  const manager = {
    estimate: async () => ({ usage: 15 * 1024 ** 2, quota: 100 * 1024 ** 2 }),
    persisted: async () => false,
  } as unknown as StorageManager;
  const status = await inspectBrowserStorage(manager);
  expect(status).toEqual({ usageBytes: 15 * 1024 ** 2, quotaBytes: 100 * 1024 ** 2, usageRatio: 0.15, persisted: false });
  expect(formatBrowserStorageStatus(status)).toBe('本站已用 15.0 MB / 可用配额 100.0 MB（15%）');
  expect(await inspectBrowserStorage({} as StorageManager)).toBeNull();
  expect(formatBrowserStorageStatus(null)).toBeNull();
});
