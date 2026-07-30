import { createProjectCollectionState, type ProjectCollectionState } from './projectCollection';
import type { ProjectWorkspace } from '../workflow/types';

export const PROJECT_SNAPSHOT_SCHEMA = 'sigs-oglab.project-collection';
export const PROJECT_SNAPSHOT_VERSION = 1;

export type ProjectCollectionSnapshotV1 = {
  schema: typeof PROJECT_SNAPSHOT_SCHEMA;
  version: typeof PROJECT_SNAPSHOT_VERSION;
  savedAt: string;
  state: ProjectCollectionState;
};

export type ProjectSnapshotDecodeResult =
  | { ok: true; snapshot: ProjectCollectionSnapshotV1; state: ProjectCollectionState }
  | {
      ok: false;
      reason: 'empty' | 'invalid-json' | 'invalid-shape' | 'unsupported-version';
      detail: string;
      version?: number;
    };

export function encodeProjectCollectionSnapshot(state: ProjectCollectionState, savedAt = new Date().toISOString()) {
  if (!isValidProjectCollectionState(state, true)) {
    throw new Error('Project collection state is not valid for snapshot encoding.');
  }
  if (!isIsoTimestamp(savedAt)) {
    throw new Error('Snapshot savedAt must be a valid ISO timestamp.');
  }
  const snapshot: ProjectCollectionSnapshotV1 = {
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt,
    state,
  };
  return JSON.stringify(snapshot);
}

export function decodeProjectCollectionSnapshot(input: string | null | undefined): ProjectSnapshotDecodeResult {
  if (!input?.trim()) {
    return { ok: false, reason: 'empty', detail: 'No project collection snapshot was supplied.' };
  }

  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return { ok: false, reason: 'invalid-json', detail: 'Project collection snapshot is not valid JSON.' };
  }

  if (!isRecord(value) || value.schema !== PROJECT_SNAPSHOT_SCHEMA) {
    return { ok: false, reason: 'invalid-shape', detail: 'Project collection snapshot schema is missing or invalid.' };
  }

  if (typeof value.version !== 'number' || value.version !== PROJECT_SNAPSHOT_VERSION) {
    return {
      ok: false,
      reason: 'unsupported-version',
      detail: `Project collection snapshot version ${String(value.version)} is not supported.`,
      version: typeof value.version === 'number' ? value.version : undefined,
    };
  }

  if (!isIsoTimestamp(value.savedAt) || !isValidProjectCollectionState(value.state, false)) {
    return { ok: false, reason: 'invalid-shape', detail: 'Project collection snapshot contains malformed state.' };
  }

  const rawState = value.state;
  const state = createProjectCollectionState(rawState.projects, rawState.activeProjectId);
  const snapshot: ProjectCollectionSnapshotV1 = {
    schema: PROJECT_SNAPSHOT_SCHEMA,
    version: PROJECT_SNAPSHOT_VERSION,
    savedAt: value.savedAt,
    state,
  };
  return { ok: true, snapshot, state };
}

function isValidProjectCollectionState(value: unknown, requireActiveProject: boolean): value is ProjectCollectionState {
  if (!isRecord(value) || !Array.isArray(value.projects) || !value.projects.every(isProjectWorkspace)) {
    return false;
  }
  const ids = value.projects.map((project) => project.projectId);
  if (new Set(ids).size !== ids.length) return false;
  if (!(value.activeProjectId === null || typeof value.activeProjectId === 'string')) return false;
  return !requireActiveProject || value.activeProjectId === null || ids.includes(value.activeProjectId);
}

function isProjectWorkspace(value: unknown): value is ProjectWorkspace {
  if (!isRecord(value)) return false;
  if (
    !isNonemptyString(value.projectId) ||
    !isNonemptyString(value.projectName) ||
    !['user', 'demo'].includes(String(value.mode)) ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    !isFlowCase(value.flowCase) ||
    !isImportDraft(value.importDraft) ||
    typeof value.selectedMappingField !== 'string' ||
    !(value.importFocusField === null || typeof value.importFocusField === 'string') ||
    typeof value.checkRunId !== 'string' ||
    !(value.checkedDraftVersion === null || isFiniteNumber(value.checkedDraftVersion)) ||
    !Array.isArray(value.checkRunHistory) ||
    !value.checkRunHistory.every(isCheckRunRecord) ||
    !['all', 'issue', 'notice', 'passed'].includes(String(value.selectedCheckFilter)) ||
    typeof value.flowFeedback !== 'string' ||
    !isWorkflowSelection(value.selection)
  ) {
    return false;
  }
  return (
    value.flowCase.project.projectId === value.projectId &&
    value.flowCase.project.projectName === value.projectName &&
    value.selection.selectedProjectId === value.projectId
  );
}

function isFlowCase(value: unknown): value is ProjectWorkspace['flowCase'] {
  if (!isRecord(value)) return false;
  return (
    value.flowId === 'flow-1-data-prep-check' &&
    value.scenario === 'valid-with-notice' &&
    typeof value.seed === 'string' &&
    typeof value.caseId === 'string' &&
    isIsoTimestamp(value.generatedAt) &&
    ['synthetic-csv', 'synthetic-excel', 'synthetic-paste'].includes(String(value.sourceType)) &&
    isRecord(value.project) &&
    isNonemptyString(value.project.projectId) &&
    isNonemptyString(value.project.projectName) &&
    isRecord(value.point) &&
    isNonemptyString(value.point.pointId) &&
    isNonemptyString(value.point.pointName) &&
    typeof value.point.pointAlias === 'string' &&
    isFiniteNumber(value.point.waterDepthM) &&
    isFiniteNumber(value.point.finalDepthM) &&
    isRecord(value.importBatch) &&
    isNonemptyString(value.importBatch.batchId) &&
    isNonemptyString(value.importBatch.batchName) &&
    Array.isArray(value.rows) &&
    value.rows.every(isCptuRow)
  );
}

function isImportDraft(value: unknown): value is ProjectWorkspace['importDraft'] {
  if (!isRecord(value)) return false;
  const pointDecision = value.pointDecision;
  return (
    ['project-empty', 'built-in-random', 'uploaded-csv', 'uploaded-excel', 'excel-pending'].includes(String(value.sourceMode)) &&
    typeof value.fileName === 'string' &&
    typeof value.fileType === 'string' &&
    (value.sourceFingerprint === undefined || typeof value.sourceFingerprint === 'string') &&
    (value.operationId === undefined || typeof value.operationId === 'string') &&
    ['ready', 'needs-parser', 'needs-decision', 'error'].includes(String(value.status)) &&
    typeof value.message === 'string' &&
    isFiniteNumber(value.version) &&
    Array.isArray(value.headers) &&
    value.headers.every((header) => typeof header === 'string') &&
    Array.isArray(value.rawPreview) &&
    value.rawPreview.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string')) &&
    (value.rawRows === undefined ||
      (Array.isArray(value.rawRows) &&
        value.rawRows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string')))) &&
    Array.isArray(value.rows) &&
    value.rows.every(isCptuRow) &&
    Array.isArray(value.problems) &&
    value.problems.every(isImportProblem) &&
    typeof value.pointName === 'string' &&
    Array.isArray(value.filePointNames) &&
    value.filePointNames.every((pointName) => typeof pointName === 'string') &&
    (pointDecision === undefined ||
      ['matches-current', 'pending', 'new-point', 'replace-current', 'cancelled'].includes(String(pointDecision))) &&
    isFiniteNumber(value.waterDepthM) &&
    isFiniteNumber(value.finalDepthM) &&
    isIsoTimestamp(value.generatedAt)
  );
}

function isImportProblem(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.problemId === 'string' &&
    typeof value.eventId === 'string' &&
    (value.reasonCode === undefined || typeof value.reasonCode === 'string') &&
    ['issue', 'notice'].includes(String(value.severity)) &&
    typeof value.title === 'string' &&
    typeof value.message === 'string' &&
    typeof value.action === 'string' &&
    (value.fieldName === undefined || typeof value.fieldName === 'string') &&
    (value.rowIndex === undefined || isFiniteNumber(value.rowIndex)) &&
    (value.evidence === undefined || typeof value.evidence === 'string') &&
    (value.sourceRowId === undefined || typeof value.sourceRowId === 'string') &&
    (value.sourceColumnId === undefined || typeof value.sourceColumnId === 'string') &&
    (value.detectedPointKey === undefined || typeof value.detectedPointKey === 'string') &&
    (value.recoveryTarget === undefined ||
      ['mapping', 'unit', 'point-plan', 'source-file'].includes(String(value.recoveryTarget)))
  );
}

function isCheckRunRecord(value: unknown): value is ProjectWorkspace['checkRunHistory'][number] {
  if (!isRecord(value) || !isRecord(value.counts)) return false;
  return (
    typeof value.runId === 'string' &&
    isFiniteNumber(value.draftVersion) &&
    isIsoTimestamp(value.createdAt) &&
    typeof value.sourceFile === 'string' &&
    typeof value.pointName === 'string' &&
    isFiniteNumber(value.counts.issue) &&
    isFiniteNumber(value.counts.notice) &&
    isFiniteNumber(value.counts.passed) &&
    ['无问题', '存在问题', '需重新检查'].includes(String(value.conclusion))
  );
}

function isWorkflowSelection(value: unknown): value is ProjectWorkspace['selection'] {
  if (!isRecord(value)) return false;
  return (
    ['project', 'import', 'check', 'stratification', 'parameters', 'output'].includes(String(value.activeRoute)) &&
    ['issues', 'log', 'exports'].includes(String(value.activeBottomTab)) &&
    [
      'selectedProjectId',
      'selectedPointId',
      'selectedImportBatchId',
      'selectedCheckIssueId',
      'selectedSchemeId',
      'selectedLayerId',
      'selectedBoundaryId',
      'selectedParameterSchemeId',
      'selectedParameterSlotId',
      'selectedOutputItemId',
    ].every((key) => typeof value[key] === 'string')
  );
}

function isCptuRow(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.pointName === 'string' &&
    ['depthM', 'qcKpa', 'qtKpa', 'fsKpa', 'u2Kpa', 'frPercent', 'waterDepthM', 'finalDepthM'].every((key) =>
      isFiniteNumber(value[key]),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}
