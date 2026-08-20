import { expect, test } from '@playwright/test';
import { createProjectCollectionState } from '../../src/features/projects/projectCollection';
import {
  decodeProjectCollectionSnapshot,
  encodeProjectCollectionSnapshot,
  PROJECT_SNAPSHOT_SCHEMA,
  PROJECT_SNAPSHOT_VERSION,
} from '../../src/features/projects/projectSnapshot';
import { createWorkspace } from './fixtures/projectWorkspace';

test('project snapshot round-trips independent nested workspace state', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  projectA.selectedMappingField = 'QcKpa';
  projectA.selection.activeRoute = 'check';
  projectA.checkedDraftVersion = 7;
  projectA.checkRunHistory = [
    {
      runId: 'CHECK-A-1',
      draftVersion: 7,
      createdAt: '2026-07-10T03:00:00.000Z',
      sourceFile: 'project-a.csv',
      pointName: projectA.importDraft.pointName,
      counts: { issue: 0, notice: 2, passed: 4 },
      conclusion: '无问题',
    },
  ];
  projectB.selection.activeRoute = 'import';
  projectB.importFocusField = 'DepthM';

  const state = createProjectCollectionState([projectA, projectB], projectB.projectId);
  const encoded = encodeProjectCollectionSnapshot(state, '2026-07-10T04:00:00.000Z');
  const decoded = decodeProjectCollectionSnapshot(encoded);

  expect(decoded.ok).toBe(true);
  if (!decoded.ok) return;
  expect(decoded.snapshot).toMatchObject({
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt: '2026-07-10T04:00:00.000Z',
  });
  expect(decoded.state).toEqual(state);
  expect(decoded.state.projects[0]).not.toBe(state.projects[0]);

  decoded.state.projects[0].selectedMappingField = 'WaterDepthM';
  expect(state.projects[0].selectedMappingField).toBe('QcKpa');
});
test('project snapshot classifies empty, invalid JSON, schema, shape, and version failures', () => {
  expect(decodeProjectCollectionSnapshot(null)).toMatchObject({ ok: false, reason: 'empty' });
  expect(decodeProjectCollectionSnapshot('{broken')).toMatchObject({ ok: false, reason: 'invalid-json' });
  expect(decodeProjectCollectionSnapshot(JSON.stringify({ schema: 'wrong', version: 1 }))).toMatchObject({
    ok: false,
    reason: 'invalid-shape',
  });
  expect(
    decodeProjectCollectionSnapshot(
      JSON.stringify({ schema: PROJECT_SNAPSHOT_SCHEMA, version: 99, savedAt: '2026-07-10T00:00:00.000Z', state: {} }),
    ),
  ).toMatchObject({ ok: false, reason: 'unsupported-version', version: 99 });

  const project = createWorkspace('project-a', '项目 A');
  const malformed = {
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt: '2026-07-10T00:00:00.000Z',
    state: createProjectCollectionState([project], project.projectId),
  };
  (malformed.state.projects[0].selection as { activeRoute: string }).activeRoute = 'unknown';
  expect(decodeProjectCollectionSnapshot(JSON.stringify(malformed))).toMatchObject({
    ok: false,
    reason: 'invalid-shape',
  });
});

test('project snapshot rejects duplicate IDs and normalizes an unknown active project', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  const duplicate = createWorkspace('project-a', '项目 A 副本');

  const duplicateSnapshot = JSON.stringify({
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt: '2026-07-10T00:00:00.000Z',
    state: { projects: [projectA, duplicate], activeProjectId: projectA.projectId },
  });
  expect(decodeProjectCollectionSnapshot(duplicateSnapshot)).toMatchObject({ ok: false, reason: 'invalid-shape' });

  const unknownActiveSnapshot = JSON.stringify({
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt: '2026-07-10T00:00:00.000Z',
    state: { projects: [projectA, projectB], activeProjectId: 'missing-project' },
  });
  const decoded = decodeProjectCollectionSnapshot(unknownActiveSnapshot);
  expect(decoded.ok).toBe(true);
  if (decoded.ok) {
    expect(decoded.state.activeProjectId).toBeNull();
    expect(decoded.state.projects).toHaveLength(2);
  }
});

test('project snapshot encoder rejects invalid active state and invalid timestamps', () => {
  const project = createWorkspace('project-a', '项目 A');
  const invalidState = { projects: [project], activeProjectId: 'missing-project' };
  expect(() => encodeProjectCollectionSnapshot(invalidState)).toThrow(/not valid/);

  const validState = createProjectCollectionState([project], project.projectId);
  expect(() => encodeProjectCollectionSnapshot(validState, 'not-a-date')).toThrow(/timestamp/);
});
