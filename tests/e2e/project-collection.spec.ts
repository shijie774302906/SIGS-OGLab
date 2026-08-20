import { expect, test } from '@playwright/test';
import {
  createProjectCollectionState,
  projectCollectionReducer,
  selectActiveProject,
} from '../../src/features/projects/projectCollection';
import { createWorkspace } from './fixtures/projectWorkspace';

test('project collection add/open/hub actions preserve the active-project invariant', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  let state = createProjectCollectionState([projectA], 'missing-project');
  expect(state.activeProjectId).toBeNull();

  state = projectCollectionReducer(state, { type: 'add', project: projectB });
  expect(state.activeProjectId).toBe(projectB.projectId);
  expect(selectActiveProject(state)?.projectName).toBe('项目 B');

  state = projectCollectionReducer(state, { type: 'return-to-hub' });
  expect(state.activeProjectId).toBeNull();
  expect(state.projects).toHaveLength(2);

  state = projectCollectionReducer(state, { type: 'open', projectId: projectA.projectId });
  expect(selectActiveProject(state)?.projectId).toBe(projectA.projectId);

  state = projectCollectionReducer(state, { type: 'open', projectId: 'missing-project' });
  expect(state.activeProjectId).toBeNull();
});

test('project collection update and rename only change the targeted workspace', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  let state = createProjectCollectionState([projectA, projectB], projectA.projectId);

  state = projectCollectionReducer(state, {
    type: 'update',
    projectId: projectA.projectId,
    updatedAt: '2026-07-10T01:00:00.000Z',
    updater: (project) => ({ ...project, selectedMappingField: 'QcKpa' }),
  });
  expect(state.projects[0]).toMatchObject({ selectedMappingField: 'QcKpa', updatedAt: '2026-07-10T01:00:00.000Z' });
  expect(state.projects[1]).toEqual(projectB);

  state = projectCollectionReducer(state, {
    type: 'rename',
    projectId: projectA.projectId,
    projectName: '项目 A-改名',
    updatedAt: '2026-07-10T02:00:00.000Z',
  });
  const renamed = state.projects[0];
  expect(renamed.projectName).toBe('项目 A-改名');
  expect(renamed.flowCase.project.projectName).toBe('项目 A-改名');
  expect(renamed.flowFeedback).toContain('项目 A-改名');
  expect(state.projects[1]).toEqual(projectB);
});

test('project collection delete returns to hub only when the active project is removed', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  let state = createProjectCollectionState([projectA, projectB], projectA.projectId);

  state = projectCollectionReducer(state, { type: 'delete', projectId: projectB.projectId });
  expect(state.activeProjectId).toBe(projectA.projectId);
  expect(state.projects.map((project) => project.projectId)).toEqual([projectA.projectId]);

  state = projectCollectionReducer(state, { type: 'delete', projectId: projectA.projectId });
  expect(state.activeProjectId).toBeNull();
  expect(state.projects).toEqual([]);
});

test('project collection clear removes every workspace and active project', () => {
  const projectA = createWorkspace('project-a', '项目 A');
  const projectB = createWorkspace('project-b', '项目 B');
  const state = projectCollectionReducer(
    createProjectCollectionState([projectA, projectB], projectB.projectId),
    { type: 'clear' },
  );
  expect(state).toEqual({ projects: [], activeProjectId: null });
});
