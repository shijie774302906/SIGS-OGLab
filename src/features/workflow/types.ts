import type { SyntheticFlowCase, WorkflowSelectionState } from '../../workflowData';
import type { ParameterWorkspaceV2 } from '../parameters/parameterTypes';
import type { StratificationWorkspaceV2 } from '../workspace/workspaceV2';

export type ImportDraftStatus = 'ready' | 'needs-parser' | 'needs-decision' | 'error';

export type ImportDraftProblem = {
  problemId: string;
  eventId: string;
  reasonCode?: string;
  severity: 'issue' | 'notice';
  title: string;
  message: string;
  action: string;
  fieldName?: string;
  rowIndex?: number;
  evidence?: string;
  sourceRowId?: string;
  sourceColumnId?: string;
  detectedPointKey?: string;
  recoveryTarget?: 'mapping' | 'unit' | 'point-plan' | 'source-file';
};

export type ImportDraft = {
  sourceMode: 'project-empty' | 'built-in-random' | 'uploaded-csv' | 'uploaded-excel' | 'excel-pending';
  fileName: string;
  fileType: string;
  sourceFingerprint?: string;
  operationId?: string;
  excelSource?: {
    sheetName: string;
    headerRow: number;
    workbookSheets: Array<{ sheetName: string; rowCount: number; columnCount: number; state: string }>;
    parseDurationMs: number;
    originalFileSize: number;
  };
  status: ImportDraftStatus;
  message: string;
  version: number;
  headers: string[];
  rawPreview: string[][];
  rawRows?: string[][];
  sourceRowIds?: string[];
  rows: SyntheticFlowCase['rows'];
  valueProvenance?: Record<string, {
    origin: 'source' | 'assistant-cleanup' | 'derived' | 'defaulted' | 'missing';
    sourceColumnId?: string;
    derivedFrom?: string[];
    defaultReason?: string;
    sourceUnit?: string | null;
    standardUnit?: string;
  }>;
  problems: ImportDraftProblem[];
  pointName: string;
  filePointNames: string[];
  pointDecision?: 'matches-current' | 'pending' | 'new-point' | 'replace-current' | 'cancelled';
  waterDepthM: number;
  finalDepthM: number;
  generatedAt: string;
};

export type TemplateKind = 'blank' | 'example';

export type ProjectWorkspaceMode = 'user' | 'demo' | 'quick';

export type CheckFilter = 'all' | 'issue' | 'notice' | 'passed';

export type CheckRunRecord = {
  runId: string;
  draftVersion: number;
  createdAt: string;
  sourceFile: string;
  pointName: string;
  counts: {
    issue: number;
    notice: number;
    passed: number;
  };
  conclusion: '无问题' | '存在问题' | '需重新检查';
  issueIds?: string[];
  input?: {
    pointId: string;
    draftId: string;
    batchId: string;
    revisions: {
      source: number;
      mapping: number;
      unit: number;
      normalization: number;
      pointPlan: number;
    };
  };
};

export type ProjectWorkspace = {
  projectId: string;
  projectName: string;
  mode: ProjectWorkspaceMode;
  createdAt: string;
  updatedAt: string;
  flowCase: SyntheticFlowCase;
  importDraft: ImportDraft;
  selectedMappingField: string;
  importFocusField: string | null;
  importFocusSourceRowId?: string | null;
  importFocusDisplayRow?: number | null;
  checkInputDependency?: CheckRunRecord['input'];
  checkRunId: string;
  checkedDraftVersion: number | null;
  checkRunHistory: CheckRunRecord[];
  checkStaleReason?: string;
  checkArtifactStatus?: 'empty' | 'current' | 'problem' | 'stale';
  checkRecoveryField?: string;
  checkRecoveryReasonCode?: string;
  stratificationWorkspace?: StratificationWorkspaceV2;
  stratificationArtifactStatus?: 'empty' | 'current' | 'problem' | 'stale';
  stratificationStaleReason?: string;
  parameterWorkspace?: ParameterWorkspaceV2;
  parameterSiteId?: string | null;
  parameterArtifactStatus?: 'empty' | 'current' | 'problem' | 'stale';
  parameterStaleReason?: string;
  selectedCheckFilter: CheckFilter;
  flowFeedback: string;
  selection: WorkflowSelectionState;
};
