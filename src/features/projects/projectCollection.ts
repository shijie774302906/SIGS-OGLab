import type { ProjectWorkspace } from '../workflow/types';

export type ProjectCollectionState = {
  projects: ProjectWorkspace[];
  activeProjectId: string | null;
};

export type ProjectCollectionAction =
  | { type: 'add'; project: ProjectWorkspace }
  | { type: 'open'; projectId: string }
  | { type: 'return-to-hub' }
  | {
      type: 'update';
      projectId: string;
      updater: (project: ProjectWorkspace) => ProjectWorkspace;
      updatedAt: string;
    }
  | { type: 'rename'; projectId: string; projectName: string; updatedAt: string }
  | { type: 'delete'; projectId: string }
  | { type: 'clear' };

export function createProjectCollectionState(
  projects: ProjectWorkspace[],
  activeProjectId: string | null,
): ProjectCollectionState {
  return {
    projects,
    activeProjectId: activeProjectId && projects.some((project) => project.projectId === activeProjectId)
      ? activeProjectId
      : null,
  };
}

export function projectCollectionReducer(
  state: ProjectCollectionState,
  action: ProjectCollectionAction,
): ProjectCollectionState {
  switch (action.type) {
    case 'add':
      return {
        projects: [...state.projects, action.project],
        activeProjectId: action.project.projectId,
      };
    case 'open':
      return {
        ...state,
        activeProjectId: state.projects.some((project) => project.projectId === action.projectId)
          ? action.projectId
          : null,
      };
    case 'return-to-hub':
      return { ...state, activeProjectId: null };
    case 'update':
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.projectId === action.projectId
            ? { ...action.updater(project), updatedAt: action.updatedAt }
            : project,
        ),
      };
    case 'rename':
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.projectId === action.projectId
            ? {
                ...project,
                projectName: action.projectName,
                updatedAt: action.updatedAt,
                flowCase: {
                  ...project.flowCase,
                  project: {
                    ...project.flowCase.project,
                    projectName: action.projectName,
                  },
                },
                flowFeedback: `项目已重命名为 ${action.projectName}。`,
              }
            : project,
        ),
      };
    case 'delete': {
      const projects = state.projects.filter((project) => project.projectId !== action.projectId);
      return {
        projects,
        activeProjectId:
          state.activeProjectId === action.projectId ||
          (state.activeProjectId !== null && !projects.some((project) => project.projectId === state.activeProjectId))
            ? null
            : state.activeProjectId,
      };
    }
    case 'clear':
      return { projects: [], activeProjectId: null };
  }
}

export function selectActiveProject(state: ProjectCollectionState) {
  return state.activeProjectId
    ? state.projects.find((project) => project.projectId === state.activeProjectId) ?? null
    : null;
}
