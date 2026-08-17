export type AssistantRoute =
  | 'project'
  | 'import'
  | 'check'
  | 'stratification'
  | 'parameters'
  | 'output'
  | 'quick-input'
  | 'quick-report';

export type AssistantProfile =
  | 'professional-governed'
  | 'quick-import-governed'
  | 'report-reader';

export type AssistantScope = {
  projectId: string;
  projectName: string;
  pointId: string;
  pointName: string;
  route: AssistantRoute;
  routeLabel: string;
  workspaceRevision: number;
  checkRunId: string | null;
  classificationRunId: string | null;
  stratificationRevisionId: string | null;
  hasWorkingDraft: boolean;
  parameterRunId: string | null;
  authorityHash: string;
};

export type AssistantLayerSummary = {
  layerId: string;
  name: string;
  depthFromM: number;
  depthToM: number;
  engineeringSoilGroup: string;
  reviewRequired: boolean;
};

export type AssistantBoundarySummary = {
  boundaryId: string;
  depthM: number;
  reviewRequired: boolean;
};

export type AssistantContextSnapshot = {
  assistantProfile: AssistantProfile;
  scope: AssistantScope;
  status: {
    check: string;
    classification: string;
    stratification: string;
    parameters: string;
    output: string;
  };
  counts: {
    measuredRows: number;
    layers: number;
    boundaries: number;
    pendingLayers: number;
    parameterProblems: number;
    outputs: number;
  };
  selectedLayer: AssistantLayerSummary | null;
  selectedBoundary: AssistantBoundarySummary | null;
  layers: AssistantLayerSummary[];
  boundaries: AssistantBoundarySummary[];
  notices: string[];
  importSource?: {
    operationId: string;
    protocolVersion?: string;
    requestId?: string;
    contextHash?: string;
    sourceFingerprint: string;
    fileName: string;
    fileType: 'Excel' | 'CSV';
    sizeBytes: number;
    allowMeasurementEdits: boolean;
    sheets: Array<{
      sheetName: string;
      rowCount: number;
      columnCount: number;
      firstNonEmptyRows: Array<{ displayRowNumber: number; preview: string[] }>;
    }>;
  };
  quickPlotReport?: {
    revisionId: string;
    authorityHash: string;
    pageNumber: number;
    pageCount: number;
    pageTitle: string;
    methodIds: string[];
    chartTypes: string[];
    route: 'full_cptu' | 'partial_cptu' | 'approximate_cpt';
    measuredRows: number;
    depthFromM: number | null;
    depthToM: number | null;
    sourceName: string;
    notices: string[];
    currentPageEvidenceJson?: string;
    evidenceOnly?: boolean;
    pages: Array<{
      pageNumber: number;
      title: string;
      methodIds: string[];
      chartTypes: string[];
      referencePage: number;
      orientation: 'portrait' | 'landscape';
    }>;
  };
};

export type AssistantDepthField = 'qc' | 'fs' | 'u2';

export type AssistantDepthWindowRequest = {
  depthFromM: number;
  depthToM: number;
  fields: AssistantDepthField[];
};

export type AssistantDepthWindowRow = {
  sourceRowId: string;
  depthM: number;
  qcKpa?: number | null;
  fsKpa?: number | null;
  u2Kpa?: number | null;
};

export type AssistantDepthWindowResult =
  | {
      ok: true;
      depthFromM: number;
      depthToM: number;
      depthReference: 'below-mudline-positive-down';
      depthUnit: 'm';
      units: Partial<Record<AssistantDepthField, 'kPa'>>;
      dataBasis: 'current-governed-working-data';
      requestedFields: AssistantDepthField[];
      totalMatchingRows: number;
      returnedRowCount: number;
      rows: AssistantDepthWindowRow[];
      clipped: boolean;
      samplingMethod: 'all-source-rows' | 'even-source-index';
      gapSemantics: 'all-source-depths-preserved' | 'not-assessable-from-sample';
      missingCounts: Partial<Record<AssistantDepthField, number>>;
      interpolated: false;
    }
  | { ok: false; problem: string };

export type AssistantToolName =
  | 'read_workflow_summary'
  | 'read_depth_window'
  | 'propose_set_layer_soil_group'
  | 'propose_move_boundary'
  | 'read_import_source'
  | 'ask_import_question'
  | 'propose_import_cleanup'
  | 'read_quick_plot_source'
  | 'ask_quick_plot_question'
  | 'propose_quick_plot_import'
  | 'submit_quick_plot_import_decision'
  | 'list_quick_plot_pages'
  | 'read_quick_plot_page'
  | 'read_quick_plot_chart'
  | 'read_quick_plot_method'
  | 'read_quick_plot_depth_window';

export type AssistantToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type AssistantWireTurn =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      toolCalls?: AssistantToolCall[];
      reasoningContent?: string;
    }
  | { role: 'tool'; toolCallId: string; content: string };

export type AssistantProviderTurn =
  | {
      kind: 'message';
      content: string;
      model: string;
      serviceInstanceId?: string;
      protocolVersions?: string[];
      publicQuota?: AssistantPublicQuota;
      usage?: { inputTokens?: number; outputTokens?: number };
    }
  | {
      kind: 'tool_calls';
      calls: AssistantToolCall[];
      content: string | null;
      reasoningContent?: string;
      model: string;
      serviceInstanceId?: string;
      protocolVersions?: string[];
      publicQuota?: AssistantPublicQuota;
    };

export type AssistantPublicQuota = {
  status: 'available' | 'exhausted' | 'unavailable';
  limit: number;
  used: number | null;
  remaining: number | null;
  resetAt: string;
};

export type AssistantTaskModels = {
  professional: string;
  import: string;
};

export type AssistantCapability =
  | {
      serviceAvailable: true;
      provider: 'deepseek' | 'mock';
      model: string;
      taskModels?: AssistantTaskModels;
      requiresApiKey: boolean;
      publicAccess?: boolean;
      publicQuota?: AssistantPublicQuota;
      serviceId: string;
      buildId: string;
      instanceId: string;
      protocolVersions: string[];
    }
  | {
      serviceAvailable: false;
      provider: 'deepseek' | 'mock';
      model: string | null;
      taskModels?: AssistantTaskModels;
      requiresApiKey: boolean;
      publicAccess?: boolean;
      publicQuota?: AssistantPublicQuota;
      reason: string;
      serviceId?: string;
      buildId?: string;
      instanceId?: string;
      protocolVersions?: string[];
    };

export type AssistantConnectionStatus = 'checking-service' | 'idle' | 'validating' | 'connected' | 'service-error';

export type AssistantConnectionResult =
  | { ok: true }
  | { ok: false; problem: string };

export type AssistantProposalKind = 'set-layer-soil-group' | 'move-boundary';

export type AssistantProposal = {
  proposalId: string;
  commandId: string;
  toolCallId: string;
  kind: AssistantProposalKind;
  title: string;
  reason: string;
  before: string;
  after: string;
  impact: string;
  risk: 'normal' | 'upstream';
  draftAction: 'create' | 'update';
  scope: AssistantScope;
  payload:
    | { kind: 'set-layer-soil-group'; layerId: string; engineeringSoilGroup: 'sand' | 'mixed' | 'clay' }
    | { kind: 'move-boundary'; boundaryId: string; depthM: number };
};

export type AssistantProposalValidation =
  | { ok: true; proposal: AssistantProposal }
  | { ok: false; reason: 'stale' | 'invalid' | 'locked'; problem: string };

export type AssistantProposalResult =
  | { ok: true; message: string; authorityHash: string }
  | { ok: false; problem: string };

export type AssistantWorkspacePort = {
  getContext: () => AssistantContextSnapshot;
  readDepthWindow: (request: AssistantDepthWindowRequest) => AssistantDepthWindowResult;
  validateProposal: (proposal: AssistantProposal) => AssistantProposalValidation;
  executeProposal: (proposal: AssistantProposal) => Promise<AssistantProposalResult>;
  locateLayer: (layerId: string) => void;
  locateBoundary: (boundaryId: string) => void;
};

export type AssistantUiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  detail?: string;
};
