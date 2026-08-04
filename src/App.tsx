import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ClipboardList,
  Copy,
  Database,
  FileInput,
  FileText,
  FolderOpen,
  Layers,
  ListChecks,
  PackageCheck,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Redo2,
  Search,
  TableProperties,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { startTransition, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ProjectFeedbackLauncher } from './components/ProjectFeedbackLauncher';
import { ProjectHubFirstUseGuide } from './components/ProjectHubFirstUseGuide';
import { FlowCaseBanner } from './components/workbench/FlowCaseBanner';
import { MetricInline } from './components/workbench/MetricInline';
import { PageDecisionBand } from './components/workbench/PageDecisionBand';
import { ProfessionalAssistantPanel } from './features/assistant/ProfessionalAssistantPanel';
import { createAssistantContextSnapshot, readBoundedAssistantDepthWindow } from './features/assistant/assistantContext';
import type { AssistantProposal, AssistantWorkspacePort } from './features/assistant/assistantTypes';
import { ImportAssistantPanel } from './features/import/ImportAssistantPanel';
import {
  extractImportAssistantSource,
  type ImportAssistantSource,
} from './features/import/importAssistantDomain';
import { QuickPlotWorkspace } from './features/quick/QuickPlotWorkspace';
import { createQuickPlotWorkspace, quickPlotInputHash } from './features/quick/quickPlotDomain';
import { CheckDocument } from './features/check/CheckDocument';
import {
  activeSmoothing,
  applyDataAdjustmentBatch,
  applyValueOverrides,
  createExclusionRevision,
  createValueOverrideRevision,
  currentExclusion,
  invalidateDataGovernance,
  restoreExclusionRevision,
  runDepthWindowSmoothing,
  setDataViewMode,
  SMOOTHING_PRESETS,
  type ExclusionCommand,
  type DataAdjustmentBatch,
  type GovernedInputRow,
  type ValueOverrideCommand,
} from './features/check/dataGovernance';
import {
  filterCheckIssues,
  formatIssueEvidence,
  getCheckHandoffGate,
  getImportDraftCheckIssues,
  getIssueCounts,
  issueSeverityLabel,
  type CheckArtifactStatus,
} from './features/check/checkDomain';
import {
  hasPointDecisionProblem,
  isImportDraftCheckable,
} from './features/import/importDomain';
import {
  IMPORT_TARGET_DEFINITIONS,
  STANDARD_IMPORT_TEMPLATE_FIELDS,
  acceptImportOperationResult,
  clearFieldMapping,
  confirmFieldMapping,
  createCsvImportPipeline,
  createTabularImportPipeline,
  getImportHeaderMatches,
  getSupportedSourceUnits,
  previewSourceUnitConversion,
  projectPipelineToLegacyDraft,
  resetFieldMappings,
  setFieldMapping,
  setPointAttributionDecision,
  setPointSplitPlan,
  setPointTargetDecision,
  setUnitDecision,
  type CsvImportPipelineV2,
  type PipelineContext,
} from './features/import/importPipeline';
import { createEditableImportPipeline } from './features/import/editableImportPipeline';
import { parseCptuExcelWorkbook, type ExcelSheetProfileV1 } from './features/import/excelImport';
import { createMinimalTemplateCsv, createMinimalTemplateXlsx } from './features/import/minimalImportTemplate';
import { createSyntheticCptuDemoFile } from './features/demo/syntheticCptuDemo';
import {
  generatePointDrafts,
  type PointGenerationResult,
} from './features/import/pointGeneration';
import { ParameterWorkbenchDocument, builtinParameterDisplayRun, builtinParameterDisplaySlot, type ParameterWorkbenchView } from './features/parameters/ParameterWorkbenchDocument';
import { ParameterGuidedWizard } from './features/parameters/ParameterGuidedWizard';
import {
  CUSTOM_FORMULA_FUNCTIONS,
  CUSTOM_FORMULA_VARIABLES,
  beginCustomFormulaEdit,
  commitCustomFormula,
  completeCustomFormulaRun,
  createCustomFormula,
  createCustomFormulaSource,
  deleteCustomFormula,
  discardCustomFormulaEdit,
  duplicateCustomFormula,
  evaluateCustomFormulaExpression,
  finalizeCustomFormulaRunCancellation,
  prepareCustomFormulaRun,
  requestCustomFormulaRunCancellation,
  restoreCustomFormula,
  sameCustomFormulaSource,
  selectActiveCustomFormula,
  selectCustomFormula,
  selectCustomFormulaRevision,
  selectCustomFormulaRuns,
  startCustomFormulaRun,
  updateCustomFormulaDraft,
  validateCustomFormulaDraft,
  type CustomFormulaDraftPatch,
} from './features/parameters/customFormulaDomain';
import {
  beginParameterSchemeEdit,
  completeParameterInputDerivationRun,
  discardParameterSchemeEdit,
  duplicateParameterScheme,
  emptyParameterWorkspace,
  markParameterWorkspaceStale,
  prepareParameterInputDerivationRun,
  renameParameterSchemeDraft,
  requestParameterInputDerivationCancellation,
  restoreParameterScheme,
  sameParameterSource,
  selectParameterScheme as selectParameterSchemeV2Domain,
  softDeleteParameterScheme,
  finalizeParameterInputDerivationCancellation,
  startParameterInputDerivationRun,
  updateParameterSchemeSettings,
} from './features/parameters/parameterDomain';
import {
  completeParameterMethodRun,
  finalizeParameterMethodRunCancellation,
  prepareParameterMethodRun,
  requestParameterMethodRunCancellation,
  startParameterMethodRun,
} from './features/parameters/parameterMethodDomain';
import {
  DEFAULT_PARAMETER_EVIDENCE_DRAFT,
  commitConfiguredParameterScheme,
  confirmParameterMethodEvidence,
  createConfiguredParameterScheme,
  getCurrentParameterMethodEvidence,
  getParameterEvidenceDraft,
  selectActiveParameterSchemeV2,
  selectCurrentParameterSchemeRevisionV2,
  selectLatestCompletedDerivationRun,
  selectParameterMethodRuns,
  type ParameterEvidenceDraft,
  type ParameterWorkbenchNktMode,
} from './features/parameters/parameterWorkbenchDomain';
import {
  DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS,
  JTS_PARAMETER_METHOD_META,
  jtsTableNktSetting,
  prepareJtsParameterOutputScopeConfirmation,
  runJtsParameterPackage,
} from './features/parameters/jtsParameterPackageDomain';
import { appendJtsDissipationTest, calculateJtsDissipationResult, confirmJtsDissipationT50, JTS_DISSIPATION_FORMULA_REVISION, type DissipationSeriesInputV6 } from './features/parameters/jtsDissipationDomain';
import { diagnoseJtsParameterIssue } from './features/parameters/parameterIssueDiagnosis';
import { evaluateParameterRecovery, type ParameterRecoveryIntent } from './features/parameters/parameterRecoveryFlow';
import { createJtsOutputPdf, createJtsOutputRevision, createJtsOutputXlsx, validateJtsOutputAuthorityContent, validateJtsOutputRevision } from './features/output/jtsOutputDomain';
import {
  calculateJtsCorrectedQtKpa,
  deriveJtsSeries,
  type JtsSeriesContext,
} from './features/jts/jtsT242Domain';
import type { CustomFormulaDefinitionV1, CustomFormulaRevisionV1, CustomFormulaRunV1, GuidedParameterDraftV1, JtsDissipationResultRevisionV6, JtsDissipationT50RevisionV6, JtsDissipationTestRevisionV6, JtsParameterMethodIdV5, JtsParameterPackageRunV5, JtsParameterPackageSettingsV5, ParameterDerivedInputRowV2, ParameterInputRowV2, ParameterInputSettingsV2, ParameterRunV2, ParameterSchemeRevisionV2, ParameterSlotV2, ParameterValueV2, ParameterWorkspaceV2 } from './features/parameters/parameterTypes';
import {
  applyStratificationCommand,
  beginStratificationEdit,
  commitStratificationEdit,
  createBaseStratificationScheme,
  createStratificationInput,
  deleteStratificationScheme,
  discardStratificationEdit,
  duplicateStratificationScheme,
  emptyStratificationWorkspace,
  getActiveStratificationScheme,
  getCurrentStratificationScheme,
  getMergedLayerRestoreAvailability,
  getRenderableStratificationBoundaries,
  getStratificationLayerReviewQueues,
  getStratificationHandoffGate,
  getStratificationIssues,
  isEligibleStratificationReplacement,
  markStratificationWorkspaceStale,
  PROTOTYPE_EDIT_SPACING_M,
  redoStratificationCommand,
  renameStratificationScheme,
  selectStratificationScheme,
  sameStratificationInput,
  stratificationLayerNeedsDecision,
  STRATIFICATION_DEFER_REASONS,
  STRATIFICATION_SOIL_TYPE_CATALOG,
  undoStratificationCommand,
  type StratificationCommand,
  type StratificationGate,
  type StratificationIssue,
  type StratificationDeferReason,
  type ManualMergeReason,
} from './features/stratification/stratificationDomain';
import {
  DEFAULT_STRATIFICATION_RULE_SETTINGS_V1,
  STRATIFICATION_CHANGE_POINT_SPEC_V1,
  buildStratificationRuleInputRows,
  completeStratificationRuleRun,
  createSchemeFromStratificationRuleRun,
  prepareStratificationRuleRun,
  startStratificationRuleRun,
} from './features/stratification/stratificationRuleDomain';
import {
  CLASSIFICATION_METHODS_V1,
  classificationMethodAvailability,
  classificationMethodId,
  classificationMethodMeta,
  createSchemeFromJtsClassification,
  resolveJtsClassificationRunForLayer,
  runJtsClassification,
} from './features/stratification/jtsClassificationDomain';
import { JtsSbtChart } from './features/stratification/JtsSbtChart';
import {
  getJtsClassificationGuidance,
  type JtsGuidanceInterval,
} from './features/stratification/jtsClassificationGuidance';
import {
  diagnoseJtsClassificationRecovery,
  inspectJtsNumericDomain,
  type JtsClassificationRecoveryIssue,
  type JtsInvalidMeasuredRow,
  type JtsRecoveryOptionId,
} from './features/stratification/jtsClassificationRecovery';
import {
  DEFAULT_THIN_LAYER_THRESHOLD_M,
  THIN_LAYER_RELIABILITY_REFERENCE_M,
  analyzeThinLayers,
  soilGroupLabel as thinLayerSoilGroupLabel,
  thinLayerDecisionLabel,
  type ThinLayerAnalysis,
  type ThinLayerDecision,
  type ThinLayerEvidenceRow,
  type ThinLayerPlanDecision,
} from './features/stratification/thinLayerDomain';
import {
  analyzeMajorGroupMerge,
  majorGroupCompositionLabel,
  type MajorGroupMergeAnalysis,
} from './features/stratification/layerSimplificationDomain';
import {
  createProjectCollectionState,
  projectCollectionReducer,
  selectActiveProject,
} from './features/projects/projectCollection';
import {
  clearProjectCollectionStorage,
  getBrowserProjectStorage,
  loadProjectCollectionStorage,
  saveProjectCollectionStorage,
} from './features/projects/projectStorage';
import { projectV2ToLegacyView } from './features/workspace/legacyWorkspaceAdapter';
import { migrateProjectCollectionV1ToV2 } from './features/workspace/migrateV1ToV2';
import {
  confirmPointProbe,
  createInitialProbeProfiles,
  createNameOnlyPoint,
  deletePoint,
  duplicatePoint,
  isReservedPointName,
  renamePoint,
  restorePoint,
  selectPoint,
  updatePointWaterContext,
  withoutReservedPointAliases,
  type PointLifecycleResult,
} from './features/workspace/pointLifecycle';
import { bootstrapWorkspaceV2, type WorkspaceBootstrapResult } from './features/workspace/workspaceBootstrap';
import {
  computeDraftNormalizedDataHash,
  deleteWorkspaceDatabase,
  saveWorkspaceV2,
  WORKSPACE_BOOT_POINTER_KEY,
  type WorkspaceDatabaseWriteResult,
} from './features/workspace/workspaceDatabase';
import {
  diagnoseWorkspaceStorageFailure,
  formatBrowserStorageStatus,
  inspectBrowserStorage,
  type WorkspaceStorageFailureDiagnosis,
} from './features/workspace/workspaceStorageRecovery';
import {
  PROJECT_MANIFEST_SCHEMA,
  PROJECT_MANIFEST_VERSION,
  computeNormalizedPointDataHash,
  getActiveImportDependency,
  selectCheckCommitTarget,
  selectCurrentCheckResult,
  type ImportDataBlockV2,
  type RawImportDataBlockV2,
  type PointTargetDecisionV2,
  type SourceColumnV2,
  type TargetFieldKey,
  type MigrationRecordV2,
  type ProjectManifestV2,
  type ProjectWorkspaceV2,
  type PointWaterContextV3,
  type DataSmoothingSettingsV3,
  type MajorGroupReviewReasonV2,
  type StratificationSchemeV2,
  type StratificationInputDependencyV2,
  type StratificationLayerV2,
  type StratificationBoundaryV2,
  type StratificationRuleCandidateV1,
  type StratificationRuleRunV1,
  type StratificationRuleSettingsV1,
  type StratificationSchemeRevisionV2,
  type StratificationWorkspaceV2,
  type JtsClassificationRunV4,
  type ClassificationMethodIdV1,
  type JtsOutputRevisionV7,
  type JtsOutputSnapshotV7,
} from './features/workspace/workspaceV2';
import type {
  CheckFilter,
  CheckRunRecord,
  ImportDraft,
  ImportDraftProblem,
  ProjectWorkspace,
  ProjectWorkspaceMode,
  TemplateKind,
} from './features/workflow/types';
import {
  createSyntheticFlowCase,
  getDefaultWorkflowSelection,
  getImportFieldMappings,
  getRouteStatus,
  getSyntheticProjectPointSummary,
  pointScope,
  projectContext,
  projectName,
  routeTitle,
  selectBoundary,
  selectLayer,
  selectLayerScheme,
  selectParameterScheme,
  selectParameterSlot,
  workflowRoutes,
  type CheckIssue,
  type ImportPreviewRow,
  type OutputItem,
  type ProjectPointSummary,
  type RouteId,
  type SyntheticFlowCase,
  type WorkflowSelectionState,
} from './workflowData';

const workflowItems: Array<{
  id: RouteId;
  label: string;
  status: string;
  icon: typeof FileText;
}> = workflowRoutes.map((route) => ({
  id: route.id,
  label: route.label,
  status: getRouteStatus(route.id),
  icon: {
    project: FolderOpen,
    import: FileInput,
    check: ClipboardList,
    stratification: Layers,
    parameters: TableProperties,
    output: PackageCheck,
  }[route.id],
}));

type ProjectStorageNotice = {
  kind: 'recovery' | 'save-error';
  message: string;
  context?: string;
  failure?: WorkspaceStorageFailureDiagnosis;
};

async function createWorkspaceSaveFailureNotice(
  failure: Extract<WorkspaceDatabaseWriteResult, { ok: false }>,
  context?: string,
): Promise<ProjectStorageNotice> {
  const storage = await inspectBrowserStorage();
  const diagnosis = diagnoseWorkspaceStorageFailure(failure, storage);
  return {
    kind: 'save-error',
    message: diagnosis.summary,
    context,
    failure: diagnosis,
  };
}

let importDraftVersionCounter = Date.now();

function createDraftVersion() {
  importDraftVersionCounter += 1;
  return importDraftVersionCounter;
}

function shouldAutoOpenInitialProject() {
  const params = new URLSearchParams(window.location.search);
  return params.has('flow') || params.get('case') === 'random' || params.has('seed');
}

function createProjectWorkspace({
  projectName,
  seed,
  mode,
  withDemoData,
}: {
  projectName: string;
  seed: string | number;
  mode: ProjectWorkspaceMode;
  withDemoData: boolean;
}): ProjectWorkspace {
  const flowCaseBase = createSyntheticFlowCase(seed);
  const now = new Date().toISOString();
  const safeName = projectName.trim() || flowCaseBase.project.projectName;
  const projectId =
    mode === 'demo'
      ? flowCaseBase.project.projectId
      : `project-${normalizeProjectId(safeName)}-${String(Date.now() % 1000000).padStart(6, '0')}`;
  const flowCase: SyntheticFlowCase = {
    ...flowCaseBase,
    project: {
      ...flowCaseBase.project,
      projectId,
      projectName: safeName,
    },
  };
  const importDraft = withDemoData ? createBuiltInImportDraft(flowCase) : createEmptyProjectImportDraft();
  return {
    projectId,
    projectName: safeName,
    mode,
    createdAt: now,
    updatedAt: now,
    flowCase,
    importDraft,
    selectedMappingField: 'WaterDepthM',
    importFocusField: null,
    checkRunId: `CHECK-${flowCase.seed}`,
    checkedDraftVersion: null,
    checkRunHistory: [],
    selectedCheckFilter: 'all',
    flowFeedback: withDemoData ? '当前点位已选择，可进入数据导入。' : '项目已创建，当前暂无点位数据，可进入数据导入。',
    selection: {
      ...getDefaultWorkflowSelection(),
      activeRoute: 'project',
      selectedProjectId: projectId,
      selectedPointId: importDraft.pointName,
      selectedImportBatchId: flowCase.importBatch.batchId,
      selectedCheckIssueId: 'check-water-depth-source',
    },
  };
}

function normalizeProjectId(value: string) {
  const ascii = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ascii || `cpt-project-${Math.floor(Math.random() * 100000)}`;
}

function createEmptyProjectImportDraft(): ImportDraft {
  return {
    sourceMode: 'project-empty',
    fileName: '尚未导入数据',
    fileType: '未导入',
    status: 'error',
    message: '当前项目暂无 CPT/CPTU 数据，请进入数据导入上传 CSV 或 Excel。',
    version: createDraftVersion(),
    headers: [],
    rawPreview: [],
    rows: [],
    problems: [
      createImportProblem({
        problemId: 'project-no-data',
        eventId: 'PRJ-E01',
        severity: 'notice',
        title: '暂无点位数据',
        message: '项目已创建，但还没有导入 CPT/CPTU 数据。',
        action: '进入数据导入后上传 CSV 或 Excel。',
      }),
    ],
    pointName: '待导入点位',
    filePointNames: [],
    pointDecision: 'matches-current',
    waterDepthM: 0,
    finalDepthM: 0,
    generatedAt: new Date().toISOString(),
  };
}

function ProjectHub({
  projects,
  storageNotice,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
  onClearProjects,
  onDismissStorageNotice,
}: {
  projects: Array<ProjectWorkspace & { quickPlotWorkspace?: ProjectWorkspaceV2['quickPlotWorkspace'] }>;
  storageNotice: ProjectStorageNotice | null;
  onCreateProject: (projectName: string, mode: 'quick' | 'user') => void;
  onOpenProject: (projectId: string) => void;
  onRenameProject: (projectId: string, projectName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onClearProjects: () => boolean | void | Promise<boolean | void>;
  onDismissStorageNotice: () => void;
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMode, setNewProjectMode] = useState<'quick' | 'user'>('quick');
  const [newProjectError, setNewProjectError] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [clearProjectsPending, setClearProjectsPending] = useState(false);
  const [clearProjectsRunning, setClearProjectsRunning] = useState(false);
  const [clearProjectsProblem, setClearProjectsProblem] = useState('');
  const [onboardingReplayToken, setOnboardingReplayToken] = useState(0);
  const selectedProject = projects.find((project) => project.projectId === pendingDeleteId || project.projectId === renamingProjectId) ?? projects[0] ?? null;
  const checkableCount = projects.filter((project) => isImportDraftCheckable(project.importDraft)).length;
  const emptyCount = projects.filter((project) => project.importDraft.sourceMode === 'project-empty').length;

  function submitNewProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setNewProjectError('请输入项目名称。');
      return;
    }
    setNewProjectError('');
    setNewProjectName('');
    onCreateProject(trimmed, newProjectMode);
  }

  function startRename(project: ProjectWorkspace) {
    setPendingDeleteId(null);
    setRenamingProjectId(project.projectId);
    setRenameValue(project.projectName);
    setRenameError('');
  }

  function submitRename(projectId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('请输入项目名称。');
      return;
    }
    onRenameProject(projectId, trimmed);
    setRenamingProjectId(null);
    setRenameValue('');
    setRenameError('');
  }

  function confirmDelete(projectId: string) {
    onDeleteProject(projectId);
    setPendingDeleteId(null);
    if (renamingProjectId === projectId) {
      setRenamingProjectId(null);
      setRenameValue('');
    }
  }

  async function confirmClearProjects() {
    setClearProjectsRunning(true);
    setClearProjectsProblem('');
    try {
      const cleared = await onClearProjects();
      if (cleared === false) {
        setClearProjectsProblem('本机数据尚未清空，请保留当前页面后重试。');
        return;
      }
      setClearProjectsPending(false);
    } catch (error) {
      setClearProjectsProblem(`本机数据尚未清空。${error instanceof Error ? ` ${error.message}` : ''}`);
    } finally {
      setClearProjectsRunning(false);
    }
  }

  return (
    <div className="project-hub-shell" data-testid="project-hub">
      <main className="project-hub-main">
        <header className="project-hub-header">
          <div>
            <div className="analysis-kicker">项目集合 / CPT 数据解译工作台</div>
            <h1>项目</h1>
            <p>选择一种方式开始；创建后可继续上次工作。</p>
          </div>
          <div className="project-hub-stat-row" data-testid="project-hub-summary">
            <MetricInline label="项目" value={`${projects.length} 个`} />
            <MetricInline label="暂无数据" value={`${emptyCount} 个`} tone={emptyCount ? 'warn' : 'ok'} />
            <MetricInline label="可检查" value={`${checkableCount} 个`} tone={checkableCount ? 'ok' : 'warn'} />
          </div>
        </header>

        <div className="project-storage-notice-slot">
          {storageNotice ? (
            <div className={`project-storage-notice ${storageNotice.kind}`} data-testid="project-storage-notice" role="status">
              <span>{storageNotice.message}</span>
              <button
                type="button"
                className="toolbar-button"
                data-testid="dismiss-project-storage-notice"
                onClick={onDismissStorageNotice}
              >
                关闭
              </button>
            </div>
          ) : null}
        </div>

        <section className="project-hub-grid">
          <div className="project-main-panel pro-panel project-create-panel" data-testid="project-create-panel">
            <div className="section-header">
              <div>
                <h2>新建项目</h2>
                <span>给这次工作起个名字，之后可以回来继续。</span>
              </div>
            </div>
            <div className="project-mode-choice" role="radiogroup" aria-label="项目使用方式" data-testid="project-mode-choice">
              <button type="button" role="radio" aria-checked={newProjectMode === 'quick'} className={newProjectMode === 'quick' ? 'selected' : ''} onClick={() => setNewProjectMode('quick')} data-testid="project-mode-quick"><strong>快捷出图（推荐）</strong><span>粘贴数据，直接出图</span></button>
              <button type="button" role="radio" aria-checked={newProjectMode === 'user'} className={newProjectMode === 'user' ? 'selected' : ''} onClick={() => setNewProjectMode('user')} data-testid="project-mode-professional"><strong>专业解译</strong><span>检查数据、调整分层和参数</span></button>
            </div>
            <div className="project-form-row">
              <label htmlFor="new-project-name">项目名称</label>
              <input
                id="new-project-name"
                data-testid="new-project-name"
                value={newProjectName}
                onChange={(event) => {
                  setNewProjectName(event.currentTarget.value);
                  setNewProjectError('');
                }}
                placeholder="例如：海风场 A CPT 解译"
              />
              <button type="button" className="toolbar-button primary" data-testid="create-project-submit" onClick={submitNewProject}>
                <Plus className="button-icon" />
                {newProjectMode === 'quick' ? '开始快捷出图' : '进入专业解译'}
              </button>
            </div>
            {newProjectError ? (
              <p className="form-error" data-testid="create-project-error">
                {newProjectError}
              </p>
            ) : null}
          </div>

          <div className="project-main-panel pro-panel project-list-panel">
            <div className="section-header">
              <div>
                <h2>项目列表</h2>
                <span>{projects.length ? '打开项目继续上次工作。' : '暂无项目，先选择一种使用方式。'}</span>
              </div>
            </div>
            {projects.length ? (
              <div className="point-table-wrap" data-testid="project-list">
                <table className="point-table project-list-table">
                  <thead>
                    <tr>
                      <th>项目名称</th>
                      <th>数据状态</th>
                      <th>点位</th>
                      <th>更新时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const summary = getImportDraftProjectPointSummary(project.flowCase, project.importDraft);
                      const quickWorkspace = project.quickPlotWorkspace;
                      const quickRevision = quickWorkspace?.revisions.find((revision) => revision.revisionId === quickWorkspace.activeRevisionId) ?? null;
                      const quickStatus = !quickWorkspace?.rows.length
                        ? '待粘贴'
                        : !quickRevision
                          ? '可生成'
                          : quickRevision.inputHash === quickPlotInputHash(quickWorkspace)
                            ? '已生成'
                            : '需重新生成';
                      const isRenaming = renamingProjectId === project.projectId;
                      const isPendingDelete = pendingDeleteId === project.projectId;
                      return (
                        <tr key={project.projectId} data-testid={`project-row-${project.projectId}`}>
                          <td>
                            {isRenaming ? (
                              <div className="inline-edit">
                                <input
                                  data-testid={`rename-project-input-${project.projectId}`}
                                  value={renameValue}
                                  onChange={(event) => {
                                    setRenameValue(event.currentTarget.value);
                                    setRenameError('');
                                  }}
                                />
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  data-testid={`rename-project-confirm-${project.projectId}`}
                                  onClick={() => submitRename(project.projectId)}
                                >
                                  确认
                                </button>
                                <button type="button" className="toolbar-button" onClick={() => setRenamingProjectId(null)}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <strong>{project.projectName} <small className="project-mode-label">{project.mode === 'quick' ? '快捷出图' : '专业解译'}</small></strong>
                            )}
                            {isRenaming && renameError ? <p className="form-error">{renameError}</p> : null}
                          </td>
                          <td>
                            <span className={`inline-state ${project.mode === 'quick' ? quickStatus === '已生成' || quickStatus === '可生成' ? 'ok' : 'warn' : isImportDraftCheckable(project.importDraft) ? 'ok' : 'warn'}`}>
                              {project.mode === 'quick'
                                ? quickStatus
                                : project.importDraft.sourceMode === 'project-empty'
                                ? '暂无数据'
                                : isImportDraftCheckable(project.importDraft)
                                  ? '可检查'
                                  : '需处理'}
                            </span>
                          </td>
                          <td>{project.mode === 'quick' ? quickWorkspace?.settings.pointName ?? 'CPT-01' : summary.pointName}</td>
                          <td>{formatDateTime(project.updatedAt)}</td>
                          <td>
                            {isPendingDelete ? (
                              <div className="row-action-group">
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  data-testid={`delete-project-confirm-${project.projectId}`}
                                  onClick={() => confirmDelete(project.projectId)}
                                >
                                  确认删除
                                </button>
                                <button type="button" className="toolbar-button" onClick={() => setPendingDeleteId(null)}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <div className="row-action-group">
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  data-testid={`open-project-${project.projectId}`}
                                  onClick={() => onOpenProject(project.projectId)}
                                >
                                  打开
                                </button>
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  data-testid={`rename-project-${project.projectId}`}
                                  onClick={() => startRename(project)}
                                  aria-label={`重命名 ${project.projectName}`}
                                >
                                  <Pencil className="button-icon" />
                                  重命名
                                </button>
                                <button
                                  type="button"
                                  className="toolbar-button"
                                  data-testid={`delete-project-${project.projectId}`}
                                  onClick={() => {
                                    setRenamingProjectId(null);
                                    setPendingDeleteId(project.projectId);
                                  }}
                                  aria-label={`删除 ${project.projectName}`}
                                >
                                  <Trash2 className="button-icon" />
                                  删除
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="project-empty-state" data-testid="project-empty-state">
                <FolderOpen className="empty-state-icon" />
                <strong>暂无项目</strong>
                <span>创建后会继续你选择的快捷出图或专业解译。</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <aside className="project-hub-dock" data-testid="project-hub-dock">
        <RightPanelShell title="本机数据">
          {selectedProject ? (
            <section className="query-card">
              <div className="query-card-heading">
                <h2>当前项目</h2>
              </div>
              <>
                <PropertyRow label="名称" value={selectedProject.projectName} />
                <PropertyRow label="状态" value={selectedProject.importDraft.sourceMode === 'project-empty' ? '暂无数据' : '已有草稿'} />
                <PropertyRow label="更新时间" value={formatDateTime(selectedProject.updatedAt)} />
              </>
            </section>
          ) : null}
          <section className="query-card" data-testid="local-project-tools">
            <div className="query-card-heading">
              <h2>本机项目</h2>
            </div>
            <p className="short-note">项目会保留在当前浏览器，刷新后可继续。</p>
            {clearProjectsPending ? (
              <div className="local-project-clear-confirm" data-testid="clear-local-projects-confirmation">
                <p>将永久清除当前浏览器中的全部项目、点位、原始数据和解释记录。源码与样例文件不会删除。</p>
                {clearProjectsProblem ? <p className="form-error" role="alert" data-testid="clear-local-projects-problem">{clearProjectsProblem}</p> : null}
                <div className="row-action-group">
                  <button
                    type="button"
                    className="toolbar-button"
                    data-testid="clear-local-projects-confirm"
                    disabled={clearProjectsRunning}
                    onClick={() => void confirmClearProjects()}
                  >
                    {clearProjectsRunning ? '正在重置…' : '确认全部清除'}
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    data-testid="clear-local-projects-cancel"
                    disabled={clearProjectsRunning}
                    onClick={() => { setClearProjectsPending(false); setClearProjectsProblem(''); }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="toolbar-button dock-action"
                data-testid="clear-local-projects"
                disabled={!projects.length || clearProjectsRunning}
                onClick={() => { setClearProjectsPending(true); setClearProjectsProblem(''); }}
              >
                清空全部本机数据
              </button>
            )}
          </section>
        </RightPanelShell>
      </aside>
      <ProjectFeedbackLauncher
        pageLabel="项目集合"
        onOpenOnboarding={() => setOnboardingReplayToken((current) => current + 1)}
      />
      <ProjectHubFirstUseGuide hasProjects={projects.length > 0} replayToken={onboardingReplayToken} />
    </div>
  );
}

type WorkspaceRuntimeV2 = {
  manifest: ProjectManifestV2;
  dataBlocks: ImportDataBlockV2[];
  migrationRecord: MigrationRecordV2 | null;
};

type PointLifecycleCommand =
  | { kind: 'create'; pointName: string }
  | { kind: 'select'; pointId: string }
  | { kind: 'rename'; pointId: string; pointName: string }
  | { kind: 'duplicate'; pointId: string; pointName: string }
  | { kind: 'delete'; pointId: string }
  | { kind: 'restore'; deletionId: string }
  | { kind: 'confirm-probe'; pointId: string; profileId: string }
  | {
      kind: 'confirm-water';
      pointId: string;
      water: Pick<PointWaterContextV3, 'channelState' | 'waterDepthM' | 'u2HydrostaticDatum' | 'testZeroDatum' | 'boreholeBottomDepthM' | 'waterUnitWeightKnM3'>;
    };

type DataGovernanceCommand =
  | { kind: 'override-value'; command: ValueOverrideCommand }
  | { kind: 'review'; command: ExclusionCommand }
  | { kind: 'adjust-batch'; batch: DataAdjustmentBatch }
  | { kind: 'restore-exclusion'; revisionId: string | null }
  | { kind: 'run-smoothing'; settings: DataSmoothingSettingsV3 }
  | { kind: 'set-view'; viewMode: ProjectWorkspaceV2['points'][number]['dataGovernance']['viewMode'] };

type DataGovernanceCommandResult = { ok: true } | { ok: false; problem: string };

type JtsClassificationCommand =
  | { kind: 'run'; methodId?: ClassificationMethodIdV1 }
  | {
      kind: 'convert-to-scheme';
      runId: string;
      name: string;
      policy: 'dual-path-with-ic-fallback';
      candidateMode: 'stable' | 'all';
      groupingWindowM?: number;
      acceptedUnclassifiableRows?: number;
      pendingUnclassifiableRows?: number;
      unclassifiablePolicy?: 'none' | 'accepted-gap' | 'pending-review';
      boundarySource?: 'jts' | 'rule';
      ruleRunId?: string;
    };

type JtsClassificationCommandResult = { ok: true } | { ok: false; problem: string };

type JtsAutoRecoveryState = {
  optionId: Extract<JtsRecoveryOptionId, 'rerun-check' | 'standard-smoothing' | 'exclude-invalid-rows'>;
  phase: 'awaiting-governance' | 'awaiting-check' | 'running-classification' | 'completed' | 'failed';
  baselineGovernanceKey: string;
  baselineCheckRunId: string | null;
  message: string;
};

type JtsParameterPackageCommand =
  | { kind: 'run'; settings: JtsParameterPackageSettingsV5 }
  | { kind: 'confirm-current-scope' }
  | { kind: 'save-guide'; draft: GuidedParameterDraftV1 }
  | { kind: 'clear-guide' };
type JtsParameterPackageCommandResult = { ok: true; run?: JtsParameterPackageRunV5; workspace?: ParameterWorkspaceV2; createdRun?: boolean } | { ok: false; problem: string };
type JtsDissipationCommand =
  | { kind: 'append-test'; input: DissipationSeriesInputV6 }
  | { kind: 'select-test'; testRevisionId: string }
  | { kind: 'confirm-t50'; mode: 'auto-intersection' | 'manual-alternative'; manualT50Seconds: number | null }
  | { kind: 'calculate' };
type JtsDissipationCommandResult = { ok: true } | { ok: false; problem: string };
type JtsOutputCommand = { kind: 'replace-output-pair'; revisions: [JtsOutputRevisionV7, JtsOutputRevisionV7] };
type JtsOutputCommandResult = { ok: true } | { ok: false; problem: string };

type WorkspaceBootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; runtime: WorkspaceRuntimeV2 }
  | { status: 'error'; result: Extract<WorkspaceBootstrapResult, { ok: false }> };

function waitForWorkspaceSaveScheduling() {
  return new Promise<void>((resolve) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      // Let the user-visible state paint before migration/hash/persistence work starts.
      // Two frames keep large real-world CPT projects responsive without weakening durability.
      globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => globalThis.setTimeout(resolve, 0)));
    } else {
      globalThis.setTimeout(resolve, 0);
    }
  });
}

function App() {
  const transientFlow = useMemo(() => shouldAutoOpenInitialProject(), []);
  return transientFlow ? <LegacyTransientApp /> : <PersistentWorkspaceV2App />;
}

function PersistentWorkspaceV2App() {
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [bootstrapState, setBootstrapState] = useState<WorkspaceBootstrapState>({ status: 'loading' });
  const [storageNotice, setStorageNotice] = useState<ProjectStorageNotice | null>(null);
  const [writeFrozen, setWriteFrozen] = useState(false);
  const commitQueue = useRef<Promise<void>>(Promise.resolve());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const quickPlotCommitReceipts = useRef(new Map<string, number>());
  const persistedManifestRevision = useRef(0);
  const persistedDataBlocks = useRef<ImportDataBlockV2[] | null>(null);
  const scheduledManifestRevision = useRef(0);
  const workspaceWriteFrozen = useRef(false);
  const componentMounted = useRef(true);
  const runtimeRef = useRef<WorkspaceRuntimeV2 | null>(null);

  useEffect(() => {
    componentMounted.current = true;
    return () => {
      componentMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBootstrapState({ status: 'loading' });
    const now = new Date().toISOString();
    void bootstrapWorkspaceV2({
      legacyStorage: getBrowserProjectStorage(),
      bootStorage: typeof window === 'undefined' ? null : window.localStorage,
      now,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setBootstrapState({ status: 'error', result });
        return;
      }
      const manifest = result.manifest ?? createEmptyManifestV2(now);
      persistedManifestRevision.current = manifest.manifestRevision;
      persistedDataBlocks.current = result.dataBlocks;
      scheduledManifestRevision.current = manifest.manifestRevision;
      workspaceWriteFrozen.current = false;
      setWriteFrozen(false);
      setBootstrapState({
        status: 'ready',
        runtime: {
          manifest,
          dataBlocks: result.dataBlocks,
          migrationRecord: result.migrationRecord,
        },
      });
      runtimeRef.current = { manifest, dataBlocks: result.dataBlocks, migrationRecord: result.migrationRecord };
      setStorageNotice(result.notice ? { kind: 'recovery', message: result.notice } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt]);

  const runtime = bootstrapState.status === 'ready' ? bootstrapState.runtime : null;

  useEffect(() => {
    if (!runtime) return;
    if (runtime.manifest.manifestRevision <= scheduledManifestRevision.current) return;
    const snapshot = runtime;
    scheduledManifestRevision.current = snapshot.manifest.manifestRevision;
    saveQueue.current = saveQueue.current.then(async () => {
      if (workspaceWriteFrozen.current) {
        if (componentMounted.current) setWriteFrozen(true);
        return;
      }
      const dataBlocksChanged = !sameDataBlockReferences(persistedDataBlocks.current, snapshot.dataBlocks);
      let result = await saveWorkspaceV2(snapshot.manifest, snapshot.dataBlocks, {
        migrationRecord: snapshot.migrationRecord,
        bootStorage: typeof window === 'undefined' ? null : window.localStorage,
        expectedManifestRevision: persistedManifestRevision.current,
        writeDataBlocks: dataBlocksChanged,
      });
      if (!result.ok && result.reason === 'write-failed') {
        result = await saveWorkspaceV2(snapshot.manifest, snapshot.dataBlocks, {
          migrationRecord: snapshot.migrationRecord,
          bootStorage: typeof window === 'undefined' ? null : window.localStorage,
          expectedManifestRevision: persistedManifestRevision.current,
          writeDataBlocks: dataBlocksChanged,
        });
      }
      if (!result.ok) {
        if (result.reason === 'conflict') {
          workspaceWriteFrozen.current = true;
          if (componentMounted.current) {
            setWriteFrozen(true);
            const notice = await createWorkspaceSaveFailureNotice(result);
            if (componentMounted.current) setStorageNotice(notice);
          }
          return;
        }
        if (!componentMounted.current) return;
        const notice = await createWorkspaceSaveFailureNotice(result);
        if (!componentMounted.current) return;
        setStorageNotice((current) => current?.kind === 'save-error' && current.message.includes('项目状态已经变化') ? current : notice);
      } else {
        persistedManifestRevision.current = snapshot.manifest.manifestRevision;
        persistedDataBlocks.current = snapshot.dataBlocks;
        if (!componentMounted.current) return;
        setStorageNotice((current) => (current?.kind === 'save-error' ? null : current));
      }
    });
  }, [runtime]);

  if (bootstrapState.status === 'loading') return <WorkspaceLoadingState />;
  if (bootstrapState.status === 'error') {
    return (
      <WorkspaceRecoveryState
        result={bootstrapState.result}
        onRetry={() => setBootstrapAttempt((attempt) => attempt + 1)}
        onReset={async () => {
          try {
            await deleteWorkspaceDatabase();
            const storage = getBrowserProjectStorage();
            const cleared = storage ? clearProjectCollectionStorage(storage) : { ok: true as const, action: 'removed' as const };
            if (!cleared.ok) throw new Error(cleared.detail);
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(WORKSPACE_BOOT_POINTER_KEY);
              clearLegacyUiStates();
            }
            setBootstrapAttempt((attempt) => attempt + 1);
          } catch (error) {
            setBootstrapState({
              status: 'error',
              result: {
                ok: false,
                reason: 'database-load-failed',
                detail: `重置本机项目失败，原数据仍保留。${error instanceof Error ? ` ${error.message}` : ''}`,
                preserved: true,
                canRetry: true,
                canReset: true,
              },
            });
          }
        }}
      />
    );
  }

  const legacyProjects = bootstrapState.runtime.manifest.state.projects.map((project) => ({
    ...projectV2ToLegacyViewCached(project, bootstrapState.runtime.dataBlocks),
    quickPlotWorkspace: project.quickPlotWorkspace,
  }));
  const activeProject = bootstrapState.runtime.manifest.state.projects.find(
    (project) => project.projectId === bootstrapState.runtime.manifest.state.activeProjectId,
  );
  const visibleStorageNotice = writeFrozen
    ? {
        kind: 'save-error' as const,
        message: '当前标签已停止自动保存，避免覆盖其他标签页中的较新项目。',
        failure: storageNotice?.failure?.code === 'conflict'
          ? storageNotice.failure
          : diagnoseWorkspaceStorageFailure({ reason: 'conflict', detail: 'Another browser tab updated the active workspace.' }),
      }
    : storageNotice;

  function updateRuntime(updater: (runtime: WorkspaceRuntimeV2) => WorkspaceRuntimeV2) {
    const current = runtimeRef.current;
    if (!current) return;
    const next = updater(current);
    runtimeRef.current = next;
    setBootstrapState({ status: 'ready', runtime: next });
  }

  function createProjectV2(projectNameValue: string, mode: 'quick' | 'user' = 'user') {
    const now = new Date().toISOString();
    const projectId = `project-${normalizeProjectId(projectNameValue)}-${String(Date.now() % 1000000).padStart(6, '0')}`;
    const project = createEmptyProjectWorkspaceV2(projectId, projectNameValue, now, mode);
    updateRuntime((current) => ({
      ...current,
      manifest: touchManifest(current.manifest, {
        projects: [...current.manifest.state.projects, project],
        activeProjectId: projectId,
      }),
    }));
  }

  function openProjectV2(projectId: string) {
    updateRuntime((current) => ({
      ...current,
      manifest: touchManifest(current.manifest, {
        ...current.manifest.state,
        activeProjectId: current.manifest.state.projects.some((project) => project.projectId === projectId) ? projectId : null,
      }),
    }));
  }

  function renameProjectV2(projectId: string, projectNameValue: string) {
    const trimmed = projectNameValue.trim();
    if (!trimmed) return;
    updateRuntime((current) => ({
      ...current,
      manifest: touchManifest(current.manifest, {
        ...current.manifest.state,
        projects: current.manifest.state.projects.map((project) =>
          project.projectId === projectId
            ? { ...project, projectName: trimmed, workspaceRevision: project.workspaceRevision + 1, updatedAt: new Date().toISOString() }
            : project,
        ),
      }),
    }));
  }

  function deleteProjectV2(projectId: string) {
    updateRuntime((current) => {
      const removed = current.manifest.state.projects.find((project) => project.projectId === projectId);
      const removedBlockIds = removed ? collectProjectDataBlockIds(removed) : new Set<string>();
      return {
        ...current,
        manifest: touchManifest(current.manifest, {
          projects: current.manifest.state.projects.filter((project) => project.projectId !== projectId),
          activeProjectId: current.manifest.state.activeProjectId === projectId ? null : current.manifest.state.activeProjectId,
        }),
        dataBlocks: current.dataBlocks.filter((block) => !removedBlockIds.has(block.dataBlockId)),
      };
    });
  }

  function applyPointLifecycleV2(projectId: string, command: PointLifecycleCommand): PointLifecycleResult {
    let outcome: PointLifecycleResult = { ok: false, problem: '当前项目不存在，请返回项目集合后重试。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      if (!project) return current;
      const now = new Date().toISOString();
      switch (command.kind) {
        case 'create': outcome = createNameOnlyPoint(project, command.pointName, now); break;
        case 'select': outcome = selectPoint(project, command.pointId, now); break;
        case 'rename': outcome = renamePoint(project, command.pointId, command.pointName, now); break;
        case 'duplicate': outcome = duplicatePoint(project, command.pointId, command.pointName, now); break;
        case 'delete': outcome = deletePoint(project, command.pointId, now); break;
        case 'restore': outcome = restorePoint(project, command.deletionId, now); break;
        case 'confirm-probe': outcome = confirmPointProbe(project, command.pointId, command.profileId, now); break;
        case 'confirm-water': outcome = updatePointWaterContext(project, command.pointId, command.water, now); break;
      }
      if (!outcome.ok) return current;
      const nextProject = outcome.project;
      return {
        ...current,
        manifest: touchManifest(current.manifest, {
          ...current.manifest.state,
          projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
        }),
      };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function applyDataGovernanceV3(projectId: string, command: DataGovernanceCommand): DataGovernanceCommandResult {
    let outcome: DataGovernanceCommandResult = { ok: false, problem: '当前点位不存在，请重新选择点位。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
      if (!project || !point) return current;
      const input = getActiveImportDependency(point);
      const rawRows = getGovernedInputRows(point, current.dataBlocks);
      if (!input || !rawRows.length) {
        outcome = { ok: false, problem: '当前点位没有可治理的活动导入修订。' };
        return current;
      }
      if (command.kind === 'set-view') {
        outcome = { ok: true };
        const nextPoint = { ...point, dataGovernance: setDataViewMode(point.dataGovernance, command.viewMode), updatedAt: new Date().toISOString() };
        const nextProject = {
          ...project,
          points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate),
          workspaceRevision: project.workspaceRevision + 1,
          updatedAt: nextPoint.updatedAt,
        };
        return {
          ...current,
          manifest: touchManifest(current.manifest, {
            ...current.manifest.state,
            projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
          }),
        };
      }

      const now = new Date().toISOString();
      const adjustedRows = applyValueOverrides(point.dataGovernance, rawRows);
      const result = command.kind === 'override-value'
        ? createValueOverrideRevision(point.dataGovernance, input, rawRows, command.command, now)
        : command.kind === 'adjust-batch'
          ? applyDataAdjustmentBatch(point.dataGovernance, input, rawRows, command.batch, now)
        : command.kind === 'review'
        ? createExclusionRevision(point.dataGovernance, input, adjustedRows, command.command, now)
        : command.kind === 'restore-exclusion'
          ? restoreExclusionRevision(point.dataGovernance, input, command.revisionId, now)
          : runDepthWindowSmoothing(point.dataGovernance, input, adjustedRows, command.settings, now);
      if (!result.ok) {
        outcome = { ok: false, problem: result.problem };
        return current;
      }
      outcome = { ok: true };
      const reason = command.kind === 'run-smoothing'
        ? '平滑试算依据已变化，需要重新运行数据检查。'
        : command.kind === 'override-value'
          ? '人工数值修订已变化，需要重新运行数据检查。'
          : command.kind === 'adjust-batch'
            ? '数据调整会话已提交，需要重新运行数据检查。'
          : '排除修订已变化，需要重新运行数据检查。';
      const invalidation: ImportInvalidation = { reason, reasonCode: 'DATA-GOVERNANCE-CHANGED' };
      const nextPoint = invalidatePointForGovernance(point, result.workspace, invalidation, now);
      const nextProject = {
        ...project,
        points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate),
        workspaceRevision: project.workspaceRevision + 1,
        updatedAt: now,
      };
      return {
        ...current,
        manifest: touchManifest(current.manifest, {
          ...current.manifest.state,
          projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
        }),
      };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function applyJtsClassificationV4(projectId: string, command: JtsClassificationCommand): JtsClassificationCommandResult {
    let outcome: JtsClassificationCommandResult = { ok: false, problem: '当前点位不存在，请重新选择点位。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
      if (!project || !point) return current;
      const currentCheck = selectCurrentCheckResult(point);
      if (!currentCheck.run || currentCheck.run.conclusion !== '\u65e0\u95ee\u9898' || !currentCheck.dependency) {
        outcome = { ok: false, problem: '请先完成当前治理依据的数据检查，再运行 JTS 分类。' };
        return current;
      }
      const profile = project.probeProfiles.find((candidate) => candidate.revisionId === point.probeContext.activeProfileRevisionId);
      if (!point.probeContext.confirmedAt || !profile) {
        outcome = { ok: false, problem: '请先在项目/点位数据页确认探头配置。' };
        return current;
      }
      if (!point.waterContext.confirmedAt || ['unknown', 'partial'].includes(point.waterContext.channelState)) {
        outcome = { ok: false, problem: '请先确认当前点位的 u2 通道与水/压力上下文。' };
        return current;
      }
      const input = { ...currentCheck.dependency, checkRunId: currentCheck.run.runId };
      const workspace = point.stratificationWorkspace ?? emptyStratificationWorkspace();
      const now = new Date().toISOString();
      const operation = command.kind === 'run'
        ? (() => {
            const rows = getJtsMeasuredRows(point, current.dataBlocks);
            if (!rows.length) return { ok: false as const, problem: '当前治理依据没有可用于 JTS 分类的测量行。' };
            const context = point.waterContext.channelState === 'present'
              ? {
                  route: 'full_cptu' as const,
                  effectiveAreaRatio: profile.effectiveAreaRatio,
                  waterDepthM: point.waterContext.waterDepthM as number,
                  u2HydrostaticDatum: point.waterContext.u2HydrostaticDatum,
                  testZeroDatum: point.waterContext.testZeroDatum,
                  boreholeBottomDepthM: point.waterContext.boreholeBottomDepthM,
                  waterUnitWeightKnM3: point.waterContext.waterUnitWeightKnM3,
                }
              : {
                  route: 'approximate_cpt' as const,
                  effectiveAreaRatio: profile.effectiveAreaRatio,
                  waterUnitWeightKnM3: point.waterContext.waterUnitWeightKnM3,
                };
            return runJtsClassification(workspace, input, rows, context, {
              probeProfileRevisionId: profile.revisionId,
              waterContextRevisionId: point.waterContext.revisionId,
            }, now, undefined, command.methodId ?? 'jts-t242-2020');
          })()
        : createSchemeFromJtsClassification(workspace, command.runId, input, command.name, now, undefined, {
            policy: command.policy,
            candidateMode: command.candidateMode,
            groupingWindowM: command.groupingWindowM,
            acceptedUnclassifiableRows: command.acceptedUnclassifiableRows,
            pendingUnclassifiableRows: command.pendingUnclassifiableRows,
            unclassifiablePolicy: command.unclassifiablePolicy,
            boundarySource: command.boundarySource,
            ruleRunId: command.ruleRunId,
            ruleCandidates: command.boundarySource === 'rule'
              ? workspace.ruleRuns?.find((run) => run.runId === command.ruleRunId && run.status === 'completed')?.candidates
              : undefined,
          });
      if (!operation.ok) {
        outcome = { ok: false, problem: operation.problem };
        return current;
      }
      outcome = { ok: true };
      const nextPoint = {
        ...point,
        stratificationWorkspace: operation.workspace,
        parameterWorkspace: markParameterWorkspaceStale(point.parameterWorkspace, command.kind === 'run' ? '分类方法运行已变化。' : '分层候选方案已变化。'),
        derivationState: command.kind === 'run'
          ? {
              status: 'current' as const,
              input: {
                import: structuredClone(currentCheck.dependency),
                probeContextRevisionId: point.probeContext.revisionId,
                probeProfileRevisionId: profile.revisionId,
                waterContextRevisionId: point.waterContext.revisionId,
              },
            }
          : point.derivationState,
        selection: point.selection,
        updatedAt: now,
      };
      const nextProject = {
        ...project,
        points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate),
        workspaceRevision: project.workspaceRevision + 1,
        updatedAt: now,
      };
      return {
        ...current,
        manifest: touchManifest(current.manifest, {
          ...current.manifest.state,
          projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
        }),
      };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function applyJtsParameterPackageV5(projectId: string, command: JtsParameterPackageCommand): JtsParameterPackageCommandResult {
    let outcome: JtsParameterPackageCommandResult = { ok: false, problem: '当前点位不存在，请重新选择点位。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
      if (!project || !point) return current;
      const stratification = point.stratificationWorkspace;
      const classification = stratification?.jtsClassificationRuns?.find((run) => run.runId === stratification.activeJtsClassificationRunId);
      const scheme = stratification?.schemes.find((candidate) => candidate.schemeId === stratification.currentSchemeId);
      const revision = scheme && stratification?.revisions?.find((candidate) => candidate.schemeId === scheme.schemeId && candidate.version === scheme.version);
      if (!classification || !scheme || scheme.status !== 'current' || !revision) {
        outcome = { ok: false, problem: '请先完成当前 JTS 分类并提交对应的地层分层修订。' };
        return current;
      }
      if (command.kind === 'save-guide' || command.kind === 'clear-guide') {
        if (command.kind === 'save-guide' && (
          command.draft.pointId !== point.pointId
          || command.draft.classificationRunId !== classification.runId
          || command.draft.classificationResultHash !== classification.resultHash
          || command.draft.stratificationRevisionId !== revision.revisionId
        )) {
          outcome = { ok: false, problem: '参数向导不再对应当前分类或分层修订，请重新开始。' };
          return current;
        }
        const now = new Date().toISOString();
        const nextPoint = {
          ...point,
          parameterWorkspace: {
            ...(point.parameterWorkspace ?? emptyParameterWorkspace()),
            guidedParameterDraft: command.kind === 'save-guide' ? structuredClone(command.draft) : null,
          },
          updatedAt: now,
        };
        outcome = { ok: true };
        const nextProject = {
          ...project,
          points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate),
          workspaceRevision: project.workspaceRevision + 1,
          updatedAt: now,
        };
        return {
          ...current,
          manifest: touchManifest(current.manifest, {
            ...current.manifest.state,
            projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
          }),
        };
      }
      const currentPackage = point.parameterWorkspace?.jtsParameterPackageRuns?.find((run) => run.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId) ?? null;
      const scopeConfirmation = command.kind === 'confirm-current-scope'
        ? currentPackage
          && currentPackage.classificationRunId === classification.runId
          && currentPackage.classificationResultHash === classification.resultHash
          && currentPackage.stratificationRevisionId === revision.revisionId
            ? prepareJtsParameterOutputScopeConfirmation(currentPackage, new Date().toISOString())
            : { ok: false as const, problem: '当前参数试算不再对应最新分类或分层，请重新生成后再确认。' }
        : null;
      if (scopeConfirmation && !scopeConfirmation.ok) {
        outcome = scopeConfirmation;
        return current;
      }
      if (scopeConfirmation?.ok && !scopeConfirmation.requiresRun) {
        outcome = { ok: true, run: currentPackage ?? undefined, workspace: point.parameterWorkspace, createdRun: false };
        return current;
      }
      const settings = command.kind === 'run'
        ? {
            ...command.settings,
            outputScopeConfirmedAt: null,
            outputScopeIncludedMethodIds: [],
            outputScopeExcludedMethodIds: [],
          }
        : scopeConfirmation?.ok ? scopeConfirmation.settings : null;
      if (!settings) {
        outcome = { ok: false, problem: '当前参数命令无效，请重新打开页面后再试。' };
        return current;
      }
      const result = runJtsParameterPackage(
        point.parameterWorkspace ?? emptyParameterWorkspace(),
        classification,
        revision,
        settings,
        new Date().toISOString(),
      );
      if (!result.ok) {
        outcome = { ok: false, problem: result.problem };
        return current;
      }
      if (command.kind === 'confirm-current-scope' && !result.run.summary.eligibleForOutput) {
        outcome = { ok: false, problem: '确认后的参数范围仍不能生成成果，原参数试算未改变。请返回参数配置检查。' };
        return current;
      }
      const now = new Date().toISOString();
      const nextParameterWorkspace: ParameterWorkspaceV2 = {
        ...result.workspace,
        guidedParameterDraft: null,
        jtsDissipationResults: (result.workspace.jtsDissipationResults ?? []).map((item) => item.status === 'completed'
          ? { ...item, status: 'stale' as const, staleReason: 'JTS 参数包运行已变化。' }
          : item),
        activeJtsDissipationResultRevisionId: null,
      };
      outcome = { ok: true, run: result.run, workspace: nextParameterWorkspace, createdRun: true };
      const nextPoint = {
        ...point,
        parameterWorkspace: nextParameterWorkspace,
        parameterState: {
          status: result.run.summary.eligibleForOutput ? 'current' as const : 'problem' as const,
          input: {
            pointId: classification.input.pointId,
            draftId: classification.input.draftId,
            batchId: classification.input.batchId,
            revisions: { ...classification.input.revisions },
          },
          sourceCheckRunId: classification.input.checkRunId,
          sourceStratificationSchemeId: revision.schemeId,
          sourceStratificationRevisionId: revision.revisionId,
          ...(result.run.summary.eligibleForOutput ? {} : { staleReason: 'JTS 参数包仍有已选参数待处理。' }),
        },
        outputState: invalidateArtifactState(point.outputState, { reason: 'JTS 参数包运行已变化。', reasonCode: 'JTS-PARAMETER-PACKAGE-CHANGED', route: 'parameters' }),
        outputWorkspace: invalidateOutputWorkspace(point.outputWorkspace, 'JTS 参数包运行已变化。'),
        updatedAt: now,
      };
      const nextProject = {
        ...project,
        points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate),
        workspaceRevision: project.workspaceRevision + 1,
        updatedAt: now,
      };
      return {
        ...current,
        manifest: touchManifest(current.manifest, {
          ...current.manifest.state,
          projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
        }),
      };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function applyJtsDissipationV6(projectId: string, command: JtsDissipationCommand): JtsDissipationCommandResult {
    let outcome: JtsDissipationCommandResult = { ok: false, problem: '当前点位不存在，请重新选择点位。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
      if (!project || !point) return current;
      const stratification = point.stratificationWorkspace;
      const scheme = stratification?.schemes.find((candidate) => candidate.schemeId === stratification.currentSchemeId);
      const revision = scheme && stratification?.revisions?.find((candidate) => candidate.schemeId === scheme.schemeId && candidate.version === scheme.version);
      const workspace = point.parameterWorkspace ?? emptyParameterWorkspace();
      if (!revision || !scheme || scheme.status !== 'current') {
        outcome = { ok: false, problem: '请先提交当前地层分层修订。' };
        return current;
      }
      let nextWorkspace: ParameterWorkspaceV2 | null = null;
      if (command.kind === 'append-test') {
        if (point.waterContext.channelState !== 'present') {
          outcome = { ok: false, problem: '无 u2 的 CPT 路线不能建立孔压消散试验。' };
          return current;
        }
        const layer = revision.snapshot.layers.find((candidate) => candidate.layerId === command.input.layerId);
        if (!layer || command.input.depthM < layer.depthFromM || command.input.depthM > layer.depthToM) {
          outcome = { ok: false, problem: '试验深度必须位于所选当前地层内。' };
          return current;
        }
        const result = appendJtsDissipationTest(workspace, point.pointId, command.input);
        if (!result.ok) { outcome = result; return current; }
        nextWorkspace = result.workspace;
      } else if (command.kind === 'select-test') {
        const test = (workspace.jtsDissipationTests ?? []).find((candidate) => candidate.revisionId === command.testRevisionId && candidate.status !== 'stale');
        if (!test) { outcome = { ok: false, problem: '所选消散试验不存在或需要更新。' }; return current; }
        nextWorkspace = { ...workspace, activeJtsDissipationTestRevisionId: test.revisionId, activeJtsDissipationT50RevisionId: null, activeJtsDissipationResultRevisionId: null };
      } else if (command.kind === 'confirm-t50') {
        if (!workspace.activeJtsDissipationTestRevisionId) { outcome = { ok: false, problem: '请先选择消散试验。' }; return current; }
        const result = confirmJtsDissipationT50(workspace, workspace.activeJtsDissipationTestRevisionId, command.mode, command.manualT50Seconds);
        if (!result.ok) { outcome = result; return current; }
        nextWorkspace = result.workspace;
      } else {
        const packageRun = (workspace.jtsParameterPackageRuns ?? []).find((candidate) => candidate.runId === workspace.activeJtsParameterPackageRunId);
        if (!packageRun) { outcome = { ok: false, problem: '请先完成当前 JTS 参数包。' }; return current; }
        const result = calculateJtsDissipationResult(workspace, point.pointId, packageRun, revision.revisionId);
        if (!result.ok) { outcome = result; return current; }
        nextWorkspace = result.workspace;
      }
      outcome = { ok: true };
      const now = new Date().toISOString();
      const nextPoint = { ...point, parameterWorkspace: nextWorkspace, outputWorkspace: invalidateOutputWorkspace(point.outputWorkspace, '消散试验或 Ch/kh 修订已变化。'), outputState: invalidateArtifactState(point.outputState, { reason: '消散试验或 Ch/kh 修订已变化。', reasonCode: 'JTS-DISSIPATION-CHANGED', route: 'parameters' }), updatedAt: now };
      const nextProject = { ...project, points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate), workspaceRevision: project.workspaceRevision + 1, updatedAt: now };
      return { ...current, manifest: touchManifest(current.manifest, { ...current.manifest.state, projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate) }) };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function applyJtsOutputV7(projectId: string, command: JtsOutputCommand): JtsOutputCommandResult {
    let outcome: JtsOutputCommandResult = { ok: false, problem: '当前点位不存在，请重新选择点位。' };
    updateRuntime((current) => {
      const project = current.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
      if (!project || !point) return current;
      const [pdfRevision, workbookRevision] = command.revisions;
      const validations = command.revisions.map(validateJtsOutputRevision);
      const invalid = validations.find((validation) => !validation.ok);
      if (invalid && !invalid.ok) { outcome = invalid; return current; }
      if (!['a4-report-pdf', 'a3-atlas-pdf'].includes(pdfRevision.kind) || workbookRevision.kind !== 'excel-workbook' || pdfRevision.inputHash !== workbookRevision.inputHash) {
        outcome = { ok: false, problem: '成果必须由同一冻结快照生成一份 PDF 和一份 Excel。' };
        return current;
      }
      const snapshot = pdfRevision.snapshot;
      const stratification = point.stratificationWorkspace;
      const classification = stratification?.jtsClassificationRuns?.find((item) => item.runId === stratification.activeJtsClassificationRunId);
      const packageRun = point.parameterWorkspace?.jtsParameterPackageRuns?.find((item) => item.runId === point.parameterWorkspace?.activeJtsParameterPackageRunId);
      const scheme = stratification?.schemes.find((item) => item.schemeId === stratification.currentSchemeId);
      const stratificationRevision = scheme && stratification?.revisions?.find((item) => item.schemeId === scheme.schemeId && item.version === scheme.version);
      if (
        snapshot.projectId !== project.projectId
        || snapshot.pointId !== point.pointId
        || !classification
        || classification.status !== 'completed'
        || snapshot.authority.classificationRunId !== classification.runId
        || snapshot.authority.classificationResultHash !== classification.resultHash
        || !packageRun
        || packageRun.status !== 'completed'
        || !packageRun.summary.eligibleForOutput
        || snapshot.authority.parameterPackageRunId !== packageRun.runId
        || snapshot.authority.parameterPackageResultHash !== packageRun.resultHash
        || !stratificationRevision
        || snapshot.authority.stratificationRevisionId !== stratificationRevision.revisionId
        || snapshot.reportSource?.schemeId !== stratificationRevision.schemeId
        || snapshot.reportSource?.stratificationRevisionId !== stratificationRevision.revisionId
        || snapshot.classificationMethod?.methodId !== classificationMethodId(classification)
        || snapshot.authority.checkRunId !== classification.input.checkRunId
      ) {
        outcome = { ok: false, problem: '成果快照不再对应当前检查、分类、分层或参数包，请刷新后重试。' };
        return current;
      }
      const ignoredDecisionByValue = new Map((packageRun.settingsSnapshot.ignoredPointDecisions ?? []).map((decision) => [`${decision.sourceRowId}:${decision.methodId}`, decision]));
      const includedMethodIds = new Set(packageRun.settingsSnapshot.outputScopeIncludedMethodIds ?? []);
      const authorityContent = {
        measuredRows: classification.measuredRowsSnapshot.map((row) => ({ sourceRowId: row.sourceRowId, depthM: row.depthM, qcKpa: row.qcKpa, fsKpa: row.fsKpa, u2Kpa: classification.route === 'approximate_cpt' ? null : row.u2Kpa ?? null })),
        classificationRows: classification.rows.map((row) => ({
          sourceRowId: row.sourceRowId,
          depthM: row.depthM,
          qtn: row.qtn,
          ic: row.ic,
          soilClassId: row.selectedClass?.soilClassId ?? null,
          classCode: row.selectedClass ? classificationNativeCode(row.selectedClass.soilClassId, row.selectedClass.zone) : null,
          label: row.selectedClass?.label ?? null,
          engineeringGroup: row.selectedClass
            ? row.selectedClass.engineeringGroup ?? (row.selectedClass.zone <= 5 ? 'clay' : row.selectedClass.zone === 6 ? 'mixed' : 'sand')
            : null,
          confidence: row.confidence,
          approximate: row.selectedClass?.approximate ?? classification.route === 'approximate_cpt',
        })),
        layers: stratificationRevision.snapshot.layers.map((layer) => ({ layerId: layer.layerId, name: layer.name, depthFromM: layer.depthFromM, depthToM: layer.depthToM, engineeringSoilGroup: layer.engineeringSoilGroup })),
        parameterRows: packageRun.values.filter((item) => includedMethodIds.has(item.methodId)).map((item) => {
          const meta = packageRun.checklist.find((candidate) => candidate.methodId === item.methodId);
          const ignoreDecision = item.status === 'ignored' ? ignoredDecisionByValue.get(`${item.sourceRowId}:${item.methodId}`) : null;
          return { sourceRowId: item.sourceRowId, depthM: item.depthM, layerId: item.layerId, methodId: item.methodId, label: meta?.label ?? item.methodId, symbol: meta?.symbol ?? item.methodId, unit: meta?.unit ?? '1', status: item.status, value: item.value, reason: item.reason, notices: [...item.notices], ignoreKind: item.status === 'ignored' ? ignoreDecision?.forced ? 'forced' as const : 'ordinary' as const : null };
        }),
        parameterValues: packageRun.representativeValues.filter((item) => includedMethodIds.has(item.methodId)).map((item) => { const meta = packageRun.checklist.find((candidate) => candidate.methodId === item.methodId); return { layerId: item.layerId, methodId: item.methodId, symbol: meta?.symbol ?? item.methodId, unit: meta?.unit ?? '', count: item.validValueCount, median: item.median, minimum: item.minimum, maximum: item.maximum }; }),
      };
      const contentValidation = validateJtsOutputAuthorityContent(snapshot, authorityContent);
      if (!contentValidation.ok) { outcome = contentValidation; return current; }
      const revisions = command.revisions;
      const activeRevisionIds = {
        [pdfRevision.kind]: pdfRevision.revisionId,
        [workbookRevision.kind]: workbookRevision.revisionId,
      };
      outcome = { ok: true };
      const now = new Date().toISOString();
      const nextPoint = { ...point, outputWorkspace: { revisions, activeRevisionIds }, outputState: { status: 'current' as const, input: structuredClone(classification.input), sourceCheckRunId: classification.input.checkRunId, sourceStratificationSchemeId: stratificationRevision.schemeId, sourceStratificationRevisionId: stratificationRevision.revisionId }, updatedAt: now };
      const nextProject = { ...project, points: project.points.map((candidate) => candidate.pointId === point.pointId ? nextPoint : candidate), workspaceRevision: project.workspaceRevision + 1, updatedAt: now };
      return { ...current, manifest: touchManifest(current.manifest, { ...current.manifest.state, projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate) }) };
    });
    if (!outcome.ok) setStorageNotice({ kind: 'recovery', message: outcome.problem });
    else setStorageNotice(null);
    return outcome;
  }

  function setActiveRouteV2(projectId: string, route: RouteId) {
    updateRuntime((current) => ({
      ...current,
      manifest: touchManifest(current.manifest, {
        ...current.manifest.state,
        projects: current.manifest.state.projects.map((project) =>
          project.projectId === projectId
            ? { ...project, activeRoute: route, workspaceRevision: project.workspaceRevision + 1, updatedAt: new Date().toISOString() }
            : project,
        ),
      }),
    }));
  }

  function commitDataCheckV2(projectId: string, record: CheckRunRecord): Promise<boolean> {
    const requestedInput = record.input ? structuredClone(record.input) : null;
    const task = commitQueue.current.then(async () => {
      await waitForWorkspaceSaveScheduling();
      await saveQueue.current;
      const current = runtimeRef.current;
      const project = current?.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      const point = project && requestedInput ? selectCheckCommitTarget(project, requestedInput) : null;
      const draft = point?.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
      if (
        !current
        || !project
        || !point
        || !draft
        || !requestedInput
      ) {
        setStorageNotice({ kind: 'save-error', message: '数据检查未提交：活动点位或导入草稿已变化，请在当前点位重新运行检查。' });
        return false;
      }
      const checkProbeProfile = project.probeProfiles.find((profile) => profile.revisionId === point.probeContext.activeProfileRevisionId) ?? null;
      const checkJtsContext: JtsSeriesContext | undefined = point.probeContext.confirmedAt && checkProbeProfile && point.waterContext.confirmedAt
        ? point.waterContext.channelState === 'absent'
          ? { route: 'approximate_cpt', effectiveAreaRatio: checkProbeProfile.effectiveAreaRatio }
          : point.waterContext.channelState === 'present' && Number.isFinite(point.waterContext.waterDepthM)
            ? {
                route: 'full_cptu',
                effectiveAreaRatio: checkProbeProfile.effectiveAreaRatio,
                waterDepthM: point.waterContext.waterDepthM as number,
                u2HydrostaticDatum: point.waterContext.u2HydrostaticDatum,
                testZeroDatum: point.waterContext.testZeroDatum,
                boreholeBottomDepthM: point.waterContext.boreholeBottomDepthM,
                waterUnitWeightKnM3: point.waterContext.waterUnitWeightKnM3,
              }
            : undefined
        : undefined;
      const run = {
        runId: record.runId,
        input: requestedInput,
        probeContextRevisionId: point.probeContext.revisionId,
        probeProfileRevisionId: point.probeContext.activeProfileRevisionId ?? undefined,
        waterContextRevisionId: point.waterContext.revisionId,
        jtsContextSnapshot: checkJtsContext ? structuredClone(checkJtsContext) : undefined,
        status: 'completed' as const,
        counts: { ...record.counts },
        conclusion: record.conclusion === '存在问题' ? '存在问题' as const : '无问题' as const,
        issueIds: [...(record.issueIds ?? [])],
        exclusionRevisionId: point.dataGovernance.currentExclusionRevisionId,
        valueOverrideRevisionId: point.dataGovernance.currentValueOverrideRevisionId ?? null,
        smoothingRunId: point.dataGovernance.activeSmoothingRunId,
        normalizedDataHash: (() => {
          const block = current.dataBlocks.find((candidate) => candidate.dataBlockId === draft.dataBlockId && candidate.kind === 'normalized');
          return block?.kind === 'normalized'
            ? computeDraftNormalizedDataHash(draft, block) ?? undefined
            : undefined;
        })(),
        createdAt: record.createdAt,
        completedAt: record.createdAt,
      };
      const now = new Date().toISOString();
      const checkRunChanged = Boolean(
        point.stratificationState.sourceCheckRunId
        && point.stratificationState.sourceCheckRunId !== run.runId,
      );
      const checkInvalidation = {
        reason: '数据检查已重新运行，旧分层方案需要基于最新检查创建修订。',
        reasonCode: 'CHECK-RUN-CHANGED',
        route: 'stratification' as const,
      };
      const nextPoint = {
        ...point,
        checkState: {
          ...point.checkState,
          activeRunId: run.runId,
          runs: [...point.checkState.runs.filter((candidate) => candidate.runId !== run.runId), run],
          artifact: {
            status: run.conclusion === '存在问题' ? 'problem' as const : 'current' as const,
            input: requestedInput,
          },
        },
        stratificationWorkspace: checkRunChanged
          ? markStratificationWorkspaceStale(point.stratificationWorkspace, checkInvalidation.reason)
          : point.stratificationWorkspace,
        parameterWorkspace: checkRunChanged
          ? markParameterWorkspaceStale(point.parameterWorkspace, checkInvalidation.reason)
          : point.parameterWorkspace,
        stratificationState: checkRunChanged
          ? invalidateArtifactState(point.stratificationState, checkInvalidation)
          : point.stratificationState,
        parameterState: checkRunChanged
          ? invalidateArtifactState(point.parameterState, checkInvalidation)
          : point.parameterState,
        outputState: checkRunChanged
          ? invalidateArtifactState(point.outputState, checkInvalidation)
          : point.outputState,
        outputWorkspace: checkRunChanged ? invalidateOutputWorkspace(point.outputWorkspace, checkInvalidation.reason) : point.outputWorkspace,
        selection: {
          ...point.selection,
          selectedCheckIssueId: record.issueIds?.[0] ?? point.selection.selectedCheckIssueId,
        },
        updatedAt: now,
      };
      const nextProject = {
        ...project,
        points: project.points.map((candidate) => candidate.pointId === nextPoint.pointId ? nextPoint : candidate),
        activeRoute: 'check' as const,
        workspaceRevision: project.workspaceRevision + 1,
        flowFeedback: run.conclusion === '存在问题'
          ? `数据检查已完成，发现 ${run.counts.issue} 项问题。`
          : `数据检查已完成，${run.counts.notice} 项提示保留。`,
        updatedAt: now,
      };
      const nextManifest = touchManifest(current.manifest, {
        ...current.manifest.state,
        projects: current.manifest.state.projects.map((candidate) => candidate.projectId === projectId ? nextProject : candidate),
      });
      const nextRuntime = { ...current, manifest: nextManifest };
      let saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
        migrationRecord: nextRuntime.migrationRecord,
        bootStorage: typeof window === 'undefined' ? null : window.localStorage,
        expectedManifestRevision: persistedManifestRevision.current,
        writeDataBlocks: false,
      });
      if (!saved.ok && saved.reason === 'write-failed') {
        saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
          migrationRecord: nextRuntime.migrationRecord,
          bootStorage: typeof window === 'undefined' ? null : window.localStorage,
          expectedManifestRevision: persistedManifestRevision.current,
          writeDataBlocks: false,
        });
      }
      if (!saved.ok) {
        setStorageNotice(await createWorkspaceSaveFailureNotice(saved, '数据检查尚未提交，当前项目没有改变。'));
        return false;
      }
      persistedManifestRevision.current = nextManifest.manifestRevision;
      scheduledManifestRevision.current = nextManifest.manifestRevision;
      runtimeRef.current = nextRuntime;
      setBootstrapState({ status: 'ready', runtime: nextRuntime });
      setStorageNotice(null);
      return true;
    });
    commitQueue.current = task.then(() => undefined, () => undefined);
    return task;
  }

  function commitPointGenerationV2(projectId: string, pipeline: CsvImportPipelineV2): Promise<PointGenerationResult> {
    const task = commitQueue.current.then(async () => {
      await waitForWorkspaceSaveScheduling();
      await saveQueue.current;
      const current = runtimeRef.current;
      const project = current?.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      if (!current || !project) {
        return { ok: false as const, code: 'BATCH-NOT-FOUND' as const, message: '当前项目不存在，请返回项目集合后重新打开。' };
      }
      const generated = generatePointDrafts(project, pipeline, current.dataBlocks);
      if (!generated.ok) return generated;
      const nextManifest = touchManifest(current.manifest, {
        ...current.manifest.state,
        projects: current.manifest.state.projects.map((candidate) =>
          candidate.projectId === projectId ? generated.project : candidate,
        ),
      });
      const nextRuntime = { ...current, manifest: nextManifest };
      let saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
        migrationRecord: nextRuntime.migrationRecord,
        bootStorage: typeof window === 'undefined' ? null : window.localStorage,
        expectedManifestRevision: persistedManifestRevision.current,
      });
      if (!saved.ok && saved.reason === 'write-failed') {
        saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
          migrationRecord: nextRuntime.migrationRecord,
          bootStorage: typeof window === 'undefined' ? null : window.localStorage,
          expectedManifestRevision: persistedManifestRevision.current,
        });
      }
      if (!saved.ok) {
        if (saved.reason === 'conflict') {
          workspaceWriteFrozen.current = true;
          setWriteFrozen(true);
        }
        setStorageNotice(await createWorkspaceSaveFailureNotice(saved, '点位草稿尚未生成，项目状态没有改变。'));
        return {
          ok: false as const,
          code: 'WORKSPACE-REVISION-CHANGED' as const,
          message: saved.reason === 'conflict'
            ? '另一个标签页已更新项目，请刷新后重新确认点位计划。'
            : '本机存储提交失败，本次没有生成任何点位草稿，请重试。',
        };
      }
      persistedManifestRevision.current = nextManifest.manifestRevision;
      scheduledManifestRevision.current = nextManifest.manifestRevision;
      runtimeRef.current = nextRuntime;
      setBootstrapState({ status: 'ready', runtime: nextRuntime });
      setStorageNotice(null);
      return generated;
    });
    commitQueue.current = task.then(() => undefined, () => undefined);
    return task;
  }

  function commitLegacyProject(
    previousLegacy: ProjectWorkspace,
    nextLegacy: ProjectWorkspace,
    pipeline?: CsvImportPipelineV2,
  ): Promise<boolean> {
    writeLegacyUiState(nextLegacy);
    if (!pipeline && isLegacyUiOnlyChange(previousLegacy, nextLegacy)) {
      updateRuntime((current) => ({
        ...current,
        manifest: {
          ...current.manifest,
          state: {
            ...current.manifest.state,
            projects: current.manifest.state.projects.map((project) =>
              project.projectId === nextLegacy.projectId
                ? applyLegacyTransientUiPatch(project, nextLegacy)
                : project,
            ),
          },
        },
      }));
      return Promise.resolve(true);
    }
    const task = commitQueue.current.then(async () => {
        await waitForWorkspaceSaveScheduling();
        await saveQueue.current;
        const currentProject = runtimeRef.current?.manifest.state.projects.find(
          (project) => project.projectId === nextLegacy.projectId,
        );
        const activeBatch = currentProject?.importBatches.find(
          (batch) => batch.kind === 'draft' && batch.batchId === currentProject.activeImportBatchId,
        );
        const canContinueActiveImport = Boolean(
          pipeline
          && currentProject
          && activeBatch?.kind === 'draft'
          && activeBatch.batchId === pipeline.batchId
          && activeBatch.operationId === pipeline.operationId
          && activeBatch.sourceFingerprint === pipeline.sourceFingerprint,
        );
        const effectivePipeline = pipeline && currentProject && canContinueActiveImport
          ? { ...pipeline, baseWorkspaceRevision: currentProject.workspaceRevision }
          : pipeline;
        if (effectivePipeline && (!currentProject || (
          currentProject.workspaceRevision !== effectivePipeline.baseWorkspaceRevision
          && !canContinueActiveImport
        ))) {
          setStorageNotice({
            kind: 'save-error',
            message: '文件解析期间项目状态已经变化，本次迟到结果未写入；请重新选择文件。',
          });
          return false;
        }
        const importChanged = legacyImportDraftChanged(previousLegacy.importDraft, nextLegacy.importDraft);
        const checkChanged =
          previousLegacy.checkRunId !== nextLegacy.checkRunId ||
          previousLegacy.checkedDraftVersion !== nextLegacy.checkedDraftVersion ||
          previousLegacy.checkRunHistory !== nextLegacy.checkRunHistory;
        if (!importChanged && checkChanged) {
          updateRuntime((current) => ({
            ...current,
            manifest: touchManifest(current.manifest, {
              ...current.manifest.state,
              projects: current.manifest.state.projects.map((project) =>
                project.projectId === nextLegacy.projectId ? applyLegacyCheckPatch(project, nextLegacy) : project,
              ),
            }),
          }));
          return true;
        }
        if (!importChanged && !checkChanged) {
          updateRuntime((current) => ({
            ...current,
            manifest: touchManifest(current.manifest, {
              ...current.manifest.state,
              projects: current.manifest.state.projects.map((project) =>
                project.projectId === nextLegacy.projectId ? applyLegacyUiPatch(project, nextLegacy) : project,
              ),
            }),
          }));
          return true;
        }
        const now = new Date().toISOString();
        const bundle = await migrateProjectCollectionV1ToV2(
          createProjectCollectionState([nextLegacy], nextLegacy.projectId),
          {
            sourceSavedAt: nextLegacy.updatedAt,
            migratedAt: now,
            pipelineByProjectId: effectivePipeline ? { [nextLegacy.projectId]: effectivePipeline } : undefined,
          },
        );
        const migratedProject = bundle.manifest.state.projects[0];
        {
          const current = runtimeRef.current;
          const existing = current?.manifest.state.projects.find((project) => project.projectId === nextLegacy.projectId);
          if (!current || !existing) return false;
          const patchedProject = applyLegacyDomainPatch({
            existing,
            migrated: migratedProject,
            nextLegacy,
            importChanged,
            checkChanged,
          });
          const nextProject = checkChanged ? { ...patchedProject, activeRoute: 'check' as const } : patchedProject;
          const nextRuntime = {
            ...current,
            manifest: touchManifest(current.manifest, {
              ...current.manifest.state,
              projects: current.manifest.state.projects.map((project) =>
                project.projectId === nextProject.projectId ? nextProject : project,
              ),
            }),
            dataBlocks: mergeDataBlocks(current.dataBlocks, bundle.dataBlocks),
          };
          let saved = await saveWorkspaceV2(nextRuntime.manifest, nextRuntime.dataBlocks, {
            migrationRecord: nextRuntime.migrationRecord,
            bootStorage: typeof window === 'undefined' ? null : window.localStorage,
            expectedManifestRevision: persistedManifestRevision.current,
          });
          if (!saved.ok && saved.reason === 'write-failed') {
            saved = await saveWorkspaceV2(nextRuntime.manifest, nextRuntime.dataBlocks, {
              migrationRecord: nextRuntime.migrationRecord,
              bootStorage: typeof window === 'undefined' ? null : window.localStorage,
              expectedManifestRevision: persistedManifestRevision.current,
            });
          }
          if (!saved.ok) {
            if (saved.reason === 'conflict') {
              workspaceWriteFrozen.current = true;
              setWriteFrozen(true);
            }
            setStorageNotice(await createWorkspaceSaveFailureNotice(
              saved,
              checkChanged
                ? '点位与检查均未提交，当前页面保留文件和点位名称，可稍后重试。'
                : '点位与导入草稿均未提交，当前页面保留文件和点位名称，可稍后重试。',
            ));
            return false;
          }
          persistedManifestRevision.current = nextRuntime.manifest.manifestRevision;
          scheduledManifestRevision.current = nextRuntime.manifest.manifestRevision;
          runtimeRef.current = nextRuntime;
          setBootstrapState({ status: 'ready', runtime: nextRuntime });
          setStorageNotice(null);
          return true;
        }
      });
    const handled = task.catch(() => {
        setStorageNotice({ kind: 'save-error', message: '项目状态转换失败，当前页面仍保留本次操作。' });
        return false;
      });
    commitQueue.current = handled.then(() => undefined);
    return handled;
  }

  async function getSettledWorkspaceRevision(projectId: string) {
    await commitQueue.current;
    await waitForWorkspaceSaveScheduling();
    await saveQueue.current;
    return runtimeRef.current?.manifest.state.projects.find((project) => project.projectId === projectId)?.workspaceRevision ?? 0;
  }

  async function waitForWorkspaceDurability() {
    await commitQueue.current;
    await waitForWorkspaceSaveScheduling();
    await saveQueue.current;
    const targetRevision = runtimeRef.current?.manifest.manifestRevision ?? 0;
    return !workspaceWriteFrozen.current && persistedManifestRevision.current >= targetRevision;
  }

  function commitQuickPlotProjectV2(
    projectId: string,
    expectedWorkspaceRevision: number,
    commitKey: string,
    updater: (project: ProjectWorkspaceV2) => ProjectWorkspaceV2,
  ): Promise<{ ok: true } | { ok: false; problem: string }> {
    const task = commitQueue.current.then(async () => {
      await waitForWorkspaceSaveScheduling();
      await saveQueue.current;
      const current = runtimeRef.current;
      const project = current?.manifest.state.projects.find((candidate) => candidate.projectId === projectId);
      if (!current || !project) {
        return { ok: false as const, problem: '当前快捷项目不存在，请返回项目集合后重新打开。' };
      }
      const receiptRevision = quickPlotCommitReceipts.current.get(commitKey);
      if (receiptRevision !== undefined && project.workspaceRevision >= receiptRevision) {
        return { ok: true as const };
      }
      if (project.workspaceRevision !== expectedWorkspaceRevision) {
        return { ok: false as const, problem: '判断期间当前项目已经变化，旧判断没有导入；请重新确认当前文件。' };
      }
      const nextProject = updater(project);
      const nextManifest = touchManifest(current.manifest, {
        ...current.manifest.state,
        projects: current.manifest.state.projects.map((candidate) =>
          candidate.projectId === projectId ? nextProject : candidate,
        ),
      });
      const nextRuntime = { ...current, manifest: nextManifest };
      let saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
        migrationRecord: nextRuntime.migrationRecord,
        bootStorage: typeof window === 'undefined' ? null : window.localStorage,
        expectedManifestRevision: persistedManifestRevision.current,
      });
      if (!saved.ok && saved.reason === 'write-failed') {
        saved = await saveWorkspaceV2(nextManifest, nextRuntime.dataBlocks, {
          migrationRecord: nextRuntime.migrationRecord,
          bootStorage: typeof window === 'undefined' ? null : window.localStorage,
          expectedManifestRevision: persistedManifestRevision.current,
        });
      }
      if (!saved.ok) {
        if (saved.reason === 'conflict') {
          workspaceWriteFrozen.current = true;
          setWriteFrozen(true);
        }
        setStorageNotice(await createWorkspaceSaveFailureNotice(
          saved,
          'AI 判断和当前快捷数据仍保留在页面，本次没有替换已保存的数据。',
        ));
        return {
          ok: false as const,
          problem: saved.reason === 'conflict'
            ? '另一个标签页已经更新项目；本次没有替换当前数据，请刷新后重试。'
            : '本机没有保存成功；当前判断仍保留，可以再次导入。',
        };
      }
      persistedManifestRevision.current = nextManifest.manifestRevision;
      scheduledManifestRevision.current = nextManifest.manifestRevision;
      runtimeRef.current = nextRuntime;
      setBootstrapState({ status: 'ready', runtime: nextRuntime });
      setStorageNotice(null);
      quickPlotCommitReceipts.current.set(commitKey, nextProject.workspaceRevision);
      return { ok: true as const };
    }).catch(() => ({ ok: false as const, problem: '本机没有保存成功；当前判断仍保留，可以再次导入。' }));
    commitQueue.current = task.then(() => undefined, () => undefined);
    return task;
  }

  async function resetLocalWorkspaceV2() {
    workspaceWriteFrozen.current = true;
    setWriteFrozen(true);
    try {
      await commitQueue.current;
      await saveQueue.current;
      await deleteWorkspaceDatabase();
      const storage = getBrowserProjectStorage();
      const legacyCleared = storage ? clearProjectCollectionStorage(storage) : { ok: true as const };
      if (!legacyCleared.ok) throw new Error(legacyCleared.detail);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(WORKSPACE_BOOT_POINTER_KEY);
        clearLegacyUiStates();
      }
      runtimeRef.current = null;
      persistedManifestRevision.current = 0;
      scheduledManifestRevision.current = 0;
      workspaceWriteFrozen.current = false;
      setWriteFrozen(false);
      setStorageNotice(null);
      setBootstrapState({ status: 'loading' });
      setBootstrapAttempt((attempt) => attempt + 1);
      return true;
    } catch (error) {
      workspaceWriteFrozen.current = false;
      setWriteFrozen(false);
      setStorageNotice({
        kind: 'save-error',
        message: `本机数据清空失败，系统没有显示成功。${error instanceof Error ? ` ${error.message}` : ''}`,
      });
      return false;
    }
  }

  if (!activeProject) {
    return (
      <ProjectHub
        projects={legacyProjects}
        storageNotice={visibleStorageNotice}
        onCreateProject={createProjectV2}
        onOpenProject={openProjectV2}
        onRenameProject={renameProjectV2}
        onDeleteProject={deleteProjectV2}
        onClearProjects={resetLocalWorkspaceV2}
        onDismissStorageNotice={() => setStorageNotice(null)}
      />
    );
  }

  if (activeProject.mode === 'quick') {
    return (
      <QuickPlotWorkspace
        project={activeProject}
        onUpdateProject={(updater) => updateRuntime((current) => ({
          ...current,
          manifest: touchManifest(current.manifest, {
            ...current.manifest.state,
            projects: current.manifest.state.projects.map((project) => project.projectId === activeProject.projectId ? updater(project) : project),
          }),
        }))}
        onOpenProjectHub={() => updateRuntime((current) => ({
          ...current,
          manifest: touchManifest(current.manifest, { ...current.manifest.state, activeProjectId: null }),
        }))}
        onCommitProject={(expectedWorkspaceRevision, commitKey, updater) =>
          commitQuickPlotProjectV2(activeProject.projectId, expectedWorkspaceRevision, commitKey, updater)}
      />
    );
  }

  return (
    <PersistentProjectWorkspaceBridge
      project={activeProject}
      projectViews={legacyProjects}
      dataBlocks={bootstrapState.runtime.dataBlocks}
      storageNotice={visibleStorageNotice}
      onCommitLegacy={commitLegacyProject}
      onWaitForDurability={waitForWorkspaceDurability}
      getImportBaseWorkspaceRevision={() => getSettledWorkspaceRevision(activeProject.projectId)}
      onPointLifecycle={(command) => applyPointLifecycleV2(activeProject.projectId, command)}
      onDataGovernance={(command) => applyDataGovernanceV3(activeProject.projectId, command)}
      onJtsClassification={(command) => applyJtsClassificationV4(activeProject.projectId, command)}
      onJtsParameterPackage={(command) => applyJtsParameterPackageV5(activeProject.projectId, command)}
      onJtsDissipation={(command) => applyJtsDissipationV6(activeProject.projectId, command)}
      onJtsOutput={(command) => applyJtsOutputV7(activeProject.projectId, command)}
      onSetActiveRoute={(route) => setActiveRouteV2(activeProject.projectId, route)}
      onCommitDataCheck={(record) => commitDataCheckV2(activeProject.projectId, record)}
      onGeneratePointDrafts={(pipeline) => commitPointGenerationV2(activeProject.projectId, pipeline)}
      onOpenProjectHub={() =>
        updateRuntime((current) => ({
          ...current,
          manifest: touchManifest(current.manifest, { ...current.manifest.state, activeProjectId: null }),
        }))
      }
      onOpenProject={openProjectV2}
      onRenameProject={renameProjectV2}
      onDeleteProject={deleteProjectV2}
    />
  );
}

const legacyProjectionCache = new WeakMap<
  ProjectWorkspaceV2,
  { dataBlocks: ImportDataBlockV2[]; view: ProjectWorkspace }
>();
const restoredLegacyUiProjectIds = new Set<string>();

const LEGACY_UI_STATE_KEY_PREFIX = 'sigs-oglab:legacy-ui-state:v1:';

type LegacyUiStateSnapshot = {
  projectId: string;
  pointId: string;
  selection: Pick<
    WorkflowSelectionState,
    | 'activeRoute'
    | 'activeBottomTab'
    | 'selectedCheckIssueId'
    | 'selectedSchemeId'
    | 'selectedLayerId'
    | 'selectedBoundaryId'
    | 'selectedParameterSchemeId'
    | 'selectedParameterSlotId'
    | 'selectedOutputItemId'
  >;
  selectedCheckFilter: ProjectWorkspace['selectedCheckFilter'];
  selectedMappingField: ProjectWorkspace['selectedMappingField'];
  importFocusField: ProjectWorkspace['importFocusField'];
  importFocusSourceRowId: ProjectWorkspace['importFocusSourceRowId'];
  importFocusDisplayRow: ProjectWorkspace['importFocusDisplayRow'];
};

function legacyUiStateKey(projectId: string) {
  return `${LEGACY_UI_STATE_KEY_PREFIX}${projectId}`;
}

function writeLegacyUiState(project: ProjectWorkspace) {
  if (typeof window === 'undefined') return;
  const snapshot: LegacyUiStateSnapshot = {
    projectId: project.projectId,
    pointId: project.selection.selectedPointId,
    selection: {
      activeRoute: project.selection.activeRoute,
      activeBottomTab: project.selection.activeBottomTab,
      selectedCheckIssueId: project.selection.selectedCheckIssueId,
      selectedSchemeId: project.selection.selectedSchemeId,
      selectedLayerId: project.selection.selectedLayerId,
      selectedBoundaryId: project.selection.selectedBoundaryId,
      selectedParameterSchemeId: project.selection.selectedParameterSchemeId,
      selectedParameterSlotId: project.selection.selectedParameterSlotId,
      selectedOutputItemId: project.selection.selectedOutputItemId,
    },
    selectedCheckFilter: project.selectedCheckFilter,
    selectedMappingField: project.selectedMappingField,
    importFocusField: project.importFocusField,
    importFocusSourceRowId: project.importFocusSourceRowId ?? null,
    importFocusDisplayRow: project.importFocusDisplayRow ?? null,
  };
  try {
    window.localStorage.setItem(legacyUiStateKey(project.projectId), JSON.stringify(snapshot));
  } catch {
    // UI location is recoverable and must never stop engineering-state saves.
  }
}

function clearLegacyUiStates() {
  if (typeof window === 'undefined') return;
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(LEGACY_UI_STATE_KEY_PREFIX)) window.localStorage.removeItem(key);
    }
    restoredLegacyUiProjectIds.clear();
  } catch {
    // The durable workspace reset still proceeds when optional UI state is unavailable.
  }
}

function restoreLegacyUiState(project: ProjectWorkspace) {
  if (typeof window === 'undefined') return project;
  try {
    const raw = window.localStorage.getItem(legacyUiStateKey(project.projectId));
    if (!raw) return project;
    const snapshot = JSON.parse(raw) as Partial<LegacyUiStateSnapshot>;
    if (
      snapshot.projectId !== project.projectId
      || snapshot.pointId !== project.selection.selectedPointId
      || !snapshot.selection
    ) return project;
    return {
      ...project,
      selection: {
        ...project.selection,
        ...snapshot.selection,
        selectedProjectId: project.selection.selectedProjectId,
        selectedPointId: project.selection.selectedPointId,
        selectedImportBatchId: project.selection.selectedImportBatchId,
      },
      selectedMappingField: snapshot.selectedMappingField ?? project.selectedMappingField,
      selectedCheckFilter: snapshot.selectedCheckFilter ?? project.selectedCheckFilter,
      importFocusField: snapshot.importFocusField ?? project.importFocusField,
      importFocusSourceRowId: snapshot.importFocusSourceRowId ?? null,
      importFocusDisplayRow: snapshot.importFocusDisplayRow ?? null,
    };
  } catch {
    return project;
  }
}

function projectV2ToLegacyViewCached(project: ProjectWorkspaceV2, dataBlocks: ImportDataBlockV2[]) {
  const cached = legacyProjectionCache.get(project);
  if (cached?.dataBlocks === dataBlocks) return cached.view;
  const projected = projectV2ToLegacyView(project, dataBlocks);
  const view = restoredLegacyUiProjectIds.has(project.projectId)
    ? projected
    : restoreLegacyUiState(projected);
  restoredLegacyUiProjectIds.add(project.projectId);
  legacyProjectionCache.set(project, { dataBlocks, view });
  return view;
}

const LEGACY_UI_ONLY_KEYS = new Set<keyof ProjectWorkspace>([
  'selection',
  'flowFeedback',
  'selectedMappingField',
  'importFocusField',
  'importFocusSourceRowId',
  'importFocusDisplayRow',
]);

function isLegacyUiOnlyChange(previous: ProjectWorkspace, next: ProjectWorkspace) {
  if (
    previous.selection.selectedProjectId !== next.selection.selectedProjectId
    || previous.selection.selectedPointId !== next.selection.selectedPointId
    || previous.selection.selectedImportBatchId !== next.selection.selectedImportBatchId
  ) return false;
  return (Object.keys(next) as Array<keyof ProjectWorkspace>)
    .filter((key) => previous[key] !== next[key])
    .every((key) => LEGACY_UI_ONLY_KEYS.has(key));
}

function legacyImportDraftChanged(previous: ImportDraft, next: ImportDraft) {
  if (previous === next) return false;
  return previous.sourceMode !== next.sourceMode
    || previous.fileName !== next.fileName
    || previous.fileType !== next.fileType
    || previous.sourceFingerprint !== next.sourceFingerprint
    || previous.operationId !== next.operationId
    || previous.status !== next.status
    || previous.message !== next.message
    || previous.version !== next.version
    || previous.pointName !== next.pointName
    || previous.pointDecision !== next.pointDecision
    || previous.waterDepthM !== next.waterDepthM
    || previous.finalDepthM !== next.finalDepthM
    || previous.generatedAt !== next.generatedAt;
}

function isPendingStratificationEdit(previous: ProjectWorkspace, next: ProjectWorkspace) {
  const previousSession = previous.stratificationWorkspace?.editSession;
  const nextSession = next.stratificationWorkspace?.editSession;
  if (!previousSession?.dirty || !nextSession?.dirty || previousSession.schemeId !== nextSession.schemeId) return false;

  // Only coalesce rapid metadata/confirmation edits. Structural edits define
  // the visible layer geometry and must be durable before a reload or another
  // browser context reads the scheme.
  const previousLayers = previousSession.working.layers;
  const nextLayers = nextSession.working.layers;
  if (previousLayers.length !== nextLayers.length) return false;
  return previousLayers.every((layer, index) => {
    const candidate = nextLayers[index];
    return candidate?.layerId === layer.layerId
      && candidate.depthFromM === layer.depthFromM
      && candidate.depthToM === layer.depthToM;
  });
}

function PersistentProjectWorkspaceBridge({
  project,
  projectViews,
  dataBlocks,
  storageNotice,
  onCommitLegacy,
  onWaitForDurability,
  getImportBaseWorkspaceRevision,
  onPointLifecycle,
  onDataGovernance,
  onJtsClassification,
  onJtsParameterPackage,
  onJtsDissipation,
  onJtsOutput,
  onSetActiveRoute,
  onCommitDataCheck,
  onGeneratePointDrafts,
  onOpenProjectHub,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: {
  project: ProjectWorkspaceV2;
  projectViews: ProjectWorkspace[];
  dataBlocks: ImportDataBlockV2[];
  storageNotice: ProjectStorageNotice | null;
  onCommitLegacy: (previous: ProjectWorkspace, next: ProjectWorkspace, pipeline?: CsvImportPipelineV2) => Promise<boolean>;
  onWaitForDurability: () => Promise<boolean>;
  getImportBaseWorkspaceRevision: () => Promise<number>;
  onPointLifecycle: (command: PointLifecycleCommand) => PointLifecycleResult;
  onDataGovernance: (command: DataGovernanceCommand) => DataGovernanceCommandResult;
  onJtsClassification: (command: JtsClassificationCommand) => JtsClassificationCommandResult;
  onJtsParameterPackage: (command: JtsParameterPackageCommand) => JtsParameterPackageCommandResult;
  onJtsDissipation: (command: JtsDissipationCommand) => JtsDissipationCommandResult;
  onJtsOutput: (command: JtsOutputCommand) => JtsOutputCommandResult;
  onSetActiveRoute: (route: RouteId) => void;
  onCommitDataCheck: (record: CheckRunRecord) => Promise<boolean>;
  onGeneratePointDrafts: (pipeline: CsvImportPipelineV2) => Promise<PointGenerationResult>;
  onOpenProjectHub: () => void;
  onOpenProject: (projectId: string) => void;
  onRenameProject: (projectId: string, projectName: string) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const projected = useMemo(() => projectV2ToLegacyViewCached(project, dataBlocks), [dataBlocks, project]);
  const activeBridgePoint = project.points.find((candidate) => candidate.pointId === project.activePointId) ?? null;
  const governedInputRows = useMemo(() => {
    return activeBridgePoint ? getGovernedInputRows(activeBridgePoint, dataBlocks) : [];
  }, [
    activeBridgePoint?.activeImportDraftId,
    activeBridgePoint?.dataGovernance,
    activeBridgePoint?.importDrafts,
    dataBlocks,
  ]);
  const importPipelineContext = useMemo(() => createImportPipelineContext(project, projected), [project, projected]);
  const editableImportPipeline = useMemo(
    () => createEditableImportPipeline(project, dataBlocks, importPipelineContext),
    [dataBlocks, importPipelineContext, project],
  );
  const pointSummaries = useMemo(
    () => createV2PointSummaries(project, dataBlocks),
    [dataBlocks, project.points],
  );
  const [legacyProject, setLegacyProject] = useState(projected);
  const legacyRef = useRef(projected);
  const pendingRapidLayerCommit = useRef<{ previous: ProjectWorkspace; next: ProjectWorkspace; journal: StratificationEditJournalHandle | null } | null>(null);
  const pendingRapidLayerTimer = useRef<number | null>(null);
  const pendingUiCommit = useRef<{ previous: ProjectWorkspace; next: ProjectWorkspace } | null>(null);
  const pendingUiTimer = useRef<number | null>(null);
  const recoveringJournalSnapshot = useRef<string | null>(null);
  const liveJournal = useRef<StratificationEditJournalHandle | null>(null);

  function commitJournaledEdit(previous: ProjectWorkspace, next: ProjectWorkspace, journal: StratificationEditJournalHandle | null) {
    return onCommitLegacy(previous, next).then(async (saved) => {
      if (saved && await onWaitForDurability()) {
        clearStratificationEditJournal(journal);
        if (liveJournal.current?.snapshot === journal?.snapshot) liveJournal.current = null;
        return true;
      }
      return false;
    });
  }

  useEffect(() => {
    const nextProjected = project.activePointId
      ? projected
      : { ...projected, selectedMappingField: legacyRef.current.selectedMappingField };
    if (pendingRapidLayerCommit.current) return;
    if (pendingUiCommit.current) {
      if (pendingUiTimer.current !== null) globalThis.clearTimeout(pendingUiTimer.current);
      pendingUiTimer.current = null;
      pendingUiCommit.current = null;
    }
    const recovered = recoverStratificationEditJournal(nextProjected);
    if (recovered && liveJournal.current?.snapshot !== recovered.snapshot && recoveringJournalSnapshot.current !== recovered.snapshot) {
      recoveringJournalSnapshot.current = recovered.snapshot;
      legacyRef.current = recovered.project;
      setLegacyProject(recovered.project);
      void commitJournaledEdit(nextProjected, recovered.project, recovered).then(() => {
        recoveringJournalSnapshot.current = null;
      });
      return;
    }
    legacyRef.current = nextProjected;
    setLegacyProject(nextProjected);
  }, [project.activePointId, project.projectId, project.workspaceRevision, projected]);

  useEffect(() => () => {
    if (pendingRapidLayerTimer.current !== null) globalThis.clearTimeout(pendingRapidLayerTimer.current);
    if (pendingUiTimer.current !== null) globalThis.clearTimeout(pendingUiTimer.current);
    const pending = pendingRapidLayerCommit.current;
    pendingRapidLayerCommit.current = null;
    if (pending) void commitJournaledEdit(pending.previous, pending.next, pending.journal);
    const pendingUi = pendingUiCommit.current;
    pendingUiCommit.current = null;
    if (pendingUi) void onCommitLegacy(pendingUi.previous, pendingUi.next);
  }, []);

  function updateLegacyProject(updater: (project: ProjectWorkspace) => ProjectWorkspace) {
    const previous = legacyRef.current;
    const next = updater(previous);
    legacyRef.current = next;
    setLegacyProject(next);
    if (isLegacyUiOnlyChange(previous, next)) {
      return onCommitLegacy(previous, next);
    }
    const pendingUi = pendingUiCommit.current;
    if (pendingUiTimer.current !== null) globalThis.clearTimeout(pendingUiTimer.current);
    pendingUiTimer.current = null;
    pendingUiCommit.current = null;
    // Keep the recovery journal aligned with every dirty stratification edit,
    // not only rapid layer acceptance. Undo, redo, merge, and batch cleanup can
    // otherwise overtake an older journal and restore stale UI after reload.
    const nextJournal = next.stratificationWorkspace?.editSession?.dirty
      ? writeStratificationEditJournal(next, next.stratificationWorkspace)
      : liveJournal.current;
    if (nextJournal) liveJournal.current = nextJournal;
    if (isPendingStratificationEdit(previous, next) && next.stratificationWorkspace) {
      const journal = nextJournal;
      if (!journal) return onCommitLegacy(previous, next);
      pendingRapidLayerCommit.current = pendingRapidLayerCommit.current
        ? { previous: pendingRapidLayerCommit.current.previous, next, journal }
        : { previous, next, journal };
      if (pendingRapidLayerTimer.current !== null) globalThis.clearTimeout(pendingRapidLayerTimer.current);
      pendingRapidLayerTimer.current = globalThis.setTimeout(() => {
        const pending = pendingRapidLayerCommit.current;
        pendingRapidLayerCommit.current = null;
        pendingRapidLayerTimer.current = null;
        if (pending) void commitJournaledEdit(pending.previous, pending.next, pending.journal);
      }, 350);
      return Promise.resolve(true);
    }
    const pending = pendingRapidLayerCommit.current;
    if (pendingRapidLayerTimer.current !== null) globalThis.clearTimeout(pendingRapidLayerTimer.current);
    pendingRapidLayerTimer.current = null;
    pendingRapidLayerCommit.current = null;
    if (pending) {
      return commitJournaledEdit(pending.previous, next, nextJournal ?? pending.journal);
    }
    const commitPrevious = pendingUi?.previous ?? previous;
    return nextJournal
      ? commitJournaledEdit(commitPrevious, next, nextJournal)
      : onCommitLegacy(commitPrevious, next);
  }

  async function commitImportPipeline(pipeline: CsvImportPipelineV2, draft: ImportDraft) {
    const previous = legacyRef.current;
    const next = { ...previous, importDraft: draft };
    const accepted = await onCommitLegacy(previous, next, pipeline);
    if (!accepted) return false;
    return true;
  }

  async function commitEditedImportPipeline(pipeline: CsvImportPipelineV2) {
    const now = new Date().toISOString();
    const projectedDraft = projectPipelineToLegacyDraft(pipeline, {
      currentPointName: importPipelineContext.currentPointName,
      defaultWaterDepthM: importPipelineContext.defaultWaterDepthM,
      defaultFinalDepthM: importPipelineContext.defaultFinalDepthM,
    });
    const singleTargetDecision = pipeline.pointPlan.detectedPoints.length === 1
      ? pipeline.pointPlan.targetDecisions?.[0]
      : null;
    const singleExecutionGenerated = pipeline.pointPlan.detectedPoints.length === 1
      && pipeline.pointPlan.executions[0]?.status === 'generated';
    const pointDecision: ImportDraft['pointDecision'] = singleExecutionGenerated
      ? 'matches-current'
      : singleTargetDecision?.state === 'confirmed'
      ? ['create-point', 'rename-and-create'].includes(singleTargetDecision.action)
        ? 'new-point'
        : ['append-draft', 'replace-active-draft'].includes(singleTargetDecision.action)
          ? 'replace-current'
          : projectedDraft.pointDecision
      : projectedDraft.pointDecision;
    const draft: ImportDraft = {
      ...projectedDraft,
      pointDecision,
      version: pipeline.revisions.normalization,
      generatedAt: now,
    };
    return commitImportPipeline(pipeline, draft);
  }

  const visibleProjects = projectViews.map((candidate) =>
    candidate.projectId === legacyProject.projectId ? legacyProject : candidate,
  );
  return (
    <ProjectWorkspaceApp
      project={legacyProject}
      projects={visibleProjects}
      onUpdateProject={updateLegacyProject}
      onImportPipelineReady={commitImportPipeline}
      getImportBaseWorkspaceRevision={getImportBaseWorkspaceRevision}
      importPipeline={editableImportPipeline}
      importPipelineContext={importPipelineContext}
      onUpdateImportPipeline={commitEditedImportPipeline}
      onOpenProjectHub={onOpenProjectHub}
      onOpenProject={onOpenProject}
      onRenameProject={onRenameProject}
      onDeleteProject={onDeleteProject}
      storageNotice={storageNotice}
      workspacePointSummaries={pointSummaries}
      workspaceProject={project}
      onPointLifecycle={onPointLifecycle}
      onDataGovernance={onDataGovernance}
      onJtsClassification={onJtsClassification}
      onJtsParameterPackage={onJtsParameterPackage}
      onJtsDissipation={onJtsDissipation}
      onJtsOutput={onJtsOutput}
      governedInputRows={governedInputRows}
      onWaitForDurability={onWaitForDurability}
      onSetActiveRoute={onSetActiveRoute}
      onCommitDataCheck={onCommitDataCheck}
      onGeneratePointDrafts={onGeneratePointDrafts}
    />
  );
}

function createImportPipelineContext(project: ProjectWorkspaceV2, legacy: ProjectWorkspace): PipelineContext {
  const activePoint = project.points.find((point) => point.pointId === project.activePointId) ?? project.points[0] ?? null;
  return {
    currentPointName: activePoint?.pointName ?? legacy.flowCase.point.pointName,
    defaultWaterDepthM: activePoint?.waterDepthM ?? legacy.flowCase.point.waterDepthM,
    defaultFinalDepthM: activePoint?.finalDepthM ?? legacy.flowCase.point.finalDepthM,
    allowAnyPoint: project.points.length === 0,
    existingPoints: project.points.map((point) => ({
      pointId: point.pointId,
      pointName: point.pointName,
      aliases: withoutReservedPointAliases(point.aliases ?? []),
      activeImportDraftId: point.activeImportDraftId,
    })),
  };
}

function WorkspaceLoadingState() {
  return (
    <div className="project-hub-shell" data-testid="workspace-v2-loading">
      <main className="project-hub-main">
        <header className="project-hub-header">
          <div>
            <div className="analysis-kicker">本机项目 / 点位工作区</div>
            <h1>正在读取项目</h1>
            <p>正在校验项目清单、点位状态和数据引用。</p>
          </div>
        </header>
      </main>
    </div>
  );
}

function WorkspaceRecoveryState({
  result,
  onRetry,
  onReset,
}: {
  result: Extract<WorkspaceBootstrapResult, { ok: false }>;
  onRetry: () => void;
  onReset: () => Promise<void>;
}) {
  const [resetPending, setResetPending] = useState(false);
  return (
    <div className="project-hub-shell" data-testid="workspace-v2-recovery">
      <main className="project-hub-main">
        <header className="project-hub-header">
          <div>
            <div className="analysis-kicker">本机项目 / 数据恢复</div>
            <h1>项目数据需要处理</h1>
            <p>{result.detail}</p>
          </div>
        </header>
        <PageDecisionBand
          testId="workspace-v2-recovery-decision"
          tone="issue"
          title="旧项目数据仍保留在浏览器中"
          description="可以重试读取；重置操作只有再次确认后才会删除本机项目。"
          primaryAction={(
            <button type="button" className="toolbar-button primary" data-testid="workspace-v2-retry" onClick={onRetry}>
              重试读取
            </button>
          )}
          secondaryActions={(
            resetPending ? (
              <>
                <button
                  type="button"
                  className="toolbar-button danger"
                  data-testid="workspace-v2-reset-confirm"
                  onClick={() => void onReset()}
                >
                  确认重置
                </button>
                <button type="button" className="toolbar-button" onClick={() => setResetPending(false)}>
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                className="toolbar-button"
                data-testid="workspace-v2-reset"
                onClick={() => setResetPending(true)}
              >
                重置本机项目
              </button>
            )
          )}
          stateLabel="存在问题"
          stateMeta={result.reason}
        />
      </main>
    </div>
  );
}

function createEmptyManifestV2(now: string): ProjectManifestV2 {
  return {
    schema: PROJECT_MANIFEST_SCHEMA,
    version: PROJECT_MANIFEST_VERSION,
    manifestId: 'manifest-v3-primary',
    manifestRevision: 1,
    savedAt: now,
    state: { projects: [], activeProjectId: null },
  };
}

function createEmptyProjectWorkspaceV2(projectId: string, projectNameValue: string, now: string, mode: 'quick' | 'user' = 'user'): ProjectWorkspaceV2 {
  return {
    projectId,
    projectName: projectNameValue.trim(),
    mode,
    ...(mode === 'quick' ? { quickPlotWorkspace: createQuickPlotWorkspace(projectNameValue.trim()) } : {}),
    workspaceRevision: 1,
    points: [],
    probeProfiles: createInitialProbeProfiles(now),
    deletedPoints: [],
    activePointId: null,
    importBatches: [],
    activeImportBatchId: null,
    activeRoute: 'project',
    activeBottomTab: 'issues',
    flowFeedback: '项目已创建，当前暂无点位数据，可进入数据导入。',
    createdAt: now,
    updatedAt: now,
  };
}

function touchManifest(manifest: ProjectManifestV2, state: ProjectManifestV2['state']): ProjectManifestV2 {
  return { ...manifest, manifestRevision: manifest.manifestRevision + 1, savedAt: new Date().toISOString(), state };
}

function collectProjectDataBlockIds(project: ProjectWorkspaceV2) {
  const ids = new Set<string>();
  project.importBatches.forEach((batch) => {
    if (batch.kind !== 'draft') return;
    if (batch.rawDataBlockId) ids.add(batch.rawDataBlockId);
    if (batch.normalizedDataBlockId) ids.add(batch.normalizedDataBlockId);
  });
  project.points.forEach((point) => point.importDrafts.forEach((draft) => ids.add(draft.dataBlockId)));
  return ids;
}

function stratificationWorkspaceFingerprint(workspace: StratificationWorkspaceV2 | undefined) {
  if (!workspace) return 'none';
  return JSON.stringify({
    schemes: workspace.schemes,
    activeSchemeId: workspace.activeSchemeId,
    currentSchemeId: workspace.currentSchemeId,
    editSession: workspace.editSession,
    revisions: workspace.revisions,
    deletedSchemeIds: workspace.deletedSchemeIds,
    activeRuleRunId: workspace.activeRuleRunId,
    ruleRuns: workspace.ruleRuns?.map((run) => [run.runId, run.status, run.resultHash]),
    activeJtsClassificationRunId: workspace.activeJtsClassificationRunId,
    jtsClassificationRuns: workspace.jtsClassificationRuns?.map((run) => [run.runId, run.status, run.resultHash, run.staleReason]),
  });
}

const STRATIFICATION_EDIT_JOURNAL_PREFIX = 'sigs-oglab:stratification-edit:v1';

type StratificationEditJournal = {
  schema: 'sigs-oglab:stratification-edit';
  version: 1;
  projectId: string;
  pointId: string;
  input: StratificationSchemeV2['input'];
  workspace: Omit<StratificationWorkspaceV2, 'ruleRuns' | 'jtsClassificationRuns'>;
};

type StratificationEditJournalHandle = { key: string; snapshot: string };

function stratificationEditJournalKey(projectId: string, pointId: string) {
  return `${STRATIFICATION_EDIT_JOURNAL_PREFIX}:${projectId}:${pointId}`;
}

function writeStratificationEditJournal(project: ProjectWorkspace, workspace: StratificationWorkspaceV2) {
  if (typeof window === 'undefined') return null;
  const pointId = project.selection.selectedPointId;
  const input = workspace.editSession?.working.input;
  if (!pointId || !input) return null;
  const { ruleRuns: _ruleRuns, jtsClassificationRuns: _jtsRuns, ...mutableWorkspace } = workspace;
  const journal: StratificationEditJournal = {
    schema: 'sigs-oglab:stratification-edit',
    version: 1,
    projectId: project.projectId,
    pointId,
    input: structuredClone(input),
    workspace: mutableWorkspace,
  };
  const key = stratificationEditJournalKey(project.projectId, pointId);
  try {
    const snapshot = JSON.stringify(journal);
    window.localStorage.setItem(key, snapshot);
    return { key, snapshot };
  } catch {
    return null;
  }
}

function recoverStratificationEditJournal(project: ProjectWorkspace) {
  if (typeof window === 'undefined' || !project.selection.selectedPointId) return null;
  const key = stratificationEditJournalKey(project.projectId, project.selection.selectedPointId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const journal = JSON.parse(raw) as Partial<StratificationEditJournal>;
    if (journal.schema !== 'sigs-oglab:stratification-edit'
      || journal.version !== 1
      || journal.projectId !== project.projectId
      || journal.pointId !== project.selection.selectedPointId
      || !journal.input
      || !journal.workspace
      || !Array.isArray(journal.workspace.schemes)
      || !journal.workspace.editSession
      || !sameStratificationInput(journal.workspace.editSession.working.input, journal.input)
      || !project.checkInputDependency
      || project.checkArtifactStatus !== 'current'
      || project.checkRunHistory.find((run) => run.runId === project.checkRunId)?.conclusion !== '无问题'
      || !sameStratificationInput(journal.input, createStratificationInput(project.checkInputDependency, project.checkRunId))) return null;
    const base = project.stratificationWorkspace ?? emptyStratificationWorkspace();
    return {
      key,
      snapshot: raw,
      project: {
        ...project,
        stratificationWorkspace: {
          ...journal.workspace,
          ruleRuns: base.ruleRuns,
          jtsClassificationRuns: base.jtsClassificationRuns,
        },
      },
    };
  } catch {
    return null;
  }
}

function clearStratificationEditJournal(handle: StratificationEditJournalHandle | null) {
  if (!handle || typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(handle.key) === handle.snapshot) window.localStorage.removeItem(handle.key);
  } catch { /* Preserve normal workflow when storage is unavailable. */ }
}

function applyLegacyTransientUiPatch(project: ProjectWorkspaceV2, legacy: ProjectWorkspace): ProjectWorkspaceV2 {
  return {
    ...project,
    activeRoute: legacy.selection.activeRoute,
    activeBottomTab: legacy.selection.activeBottomTab,
    flowFeedback: legacy.flowFeedback,
    points: project.points.map((point) => point.pointId !== project.activePointId
      ? point
      : {
          ...point,
          selection: {
            ...point.selection,
            selectedImportBatchId: project.importBatches.some((batch) => batch.batchId === legacy.selection.selectedImportBatchId)
              ? legacy.selection.selectedImportBatchId
              : point.selection.selectedImportBatchId,
            selectedCheckIssueId: legacy.selection.selectedCheckIssueId,
            selectedSchemeId: legacy.selection.selectedSchemeId,
            selectedLayerId: legacy.selection.selectedLayerId,
            selectedBoundaryId: legacy.selection.selectedBoundaryId,
            selectedParameterSchemeId: legacy.selection.selectedParameterSchemeId,
            selectedParameterSlotId: legacy.selection.selectedParameterSlotId,
            selectedOutputItemId: legacy.selection.selectedOutputItemId,
            selectedMappingField: legacy.selectedMappingField,
            importFocusField: legacy.importFocusField,
            importFocusSourceRowId: legacy.importFocusSourceRowId ?? null,
            importFocusDisplayRow: legacy.importFocusDisplayRow ?? null,
            selectedCheckFilter: legacy.selectedCheckFilter,
          },
        }),
  };
}

function applyLegacyUiPatch(project: ProjectWorkspaceV2, legacy: ProjectWorkspace): ProjectWorkspaceV2 {
  return {
    ...project,
    projectName: legacy.projectName,
    activeRoute: legacy.selection.activeRoute,
    activeBottomTab: legacy.selection.activeBottomTab,
    flowFeedback: legacy.flowFeedback,
    workspaceRevision: project.workspaceRevision + 1,
    updatedAt: new Date().toISOString(),
    points: project.points.map((point) => {
      if (point.pointId !== project.activePointId) return point;
      const legacyCurrentStratificationScheme = getCurrentStratificationScheme(legacy.stratificationWorkspace);
      const storedCurrentStratificationScheme = getCurrentStratificationScheme(point.stratificationWorkspace);
      const explicitStaleStratificationRecovery = Boolean(
        (legacy.stratificationWorkspace?.editSession && !legacy.stratificationWorkspace.editSession.staleReason)
        || (point.stratificationWorkspace?.editSession?.staleReason && !legacy.stratificationWorkspace?.editSession)
        || (
          legacyCurrentStratificationScheme?.status === 'current'
          && legacyCurrentStratificationScheme.schemeId !== storedCurrentStratificationScheme?.schemeId
        ),
      );
      const candidateStratificationWorkspace = legacy.stratificationWorkspace && (point.stratificationState.status !== 'stale' || explicitStaleStratificationRecovery)
        ? legacy.stratificationWorkspace
        : point.stratificationWorkspace;
      const workspaceChanged = stratificationWorkspaceFingerprint(point.stratificationWorkspace)
        !== stratificationWorkspaceFingerprint(candidateStratificationWorkspace);
      const nextStratificationWorkspace = workspaceChanged && candidateStratificationWorkspace
        ? cloneStratificationEditingState(candidateStratificationWorkspace)
        : point.stratificationWorkspace;
      const nextParameterWorkspace = legacy.parameterWorkspace && point.parameterState.status !== 'stale'
        ? structuredClone(legacy.parameterWorkspace)
        : point.parameterWorkspace;
      const previousCurrentScheme = getCurrentStratificationScheme(point.stratificationWorkspace);
      const nextCurrentScheme = getCurrentStratificationScheme(nextStratificationWorkspace);
      const nextCurrentRevision = nextCurrentScheme
        ? nextStratificationWorkspace?.revisions?.find((revision) => revision.schemeId === nextCurrentScheme.schemeId && revision.version === nextCurrentScheme.version)
        : undefined;
      const committedSchemeChanged = JSON.stringify(previousCurrentScheme) !== JSON.stringify(nextCurrentScheme);
      const stratificationIssues = nextCurrentScheme ? getStratificationIssues(nextCurrentScheme) : [];
      const nextStratificationState = committedSchemeChanged
        ? nextCurrentScheme
          ? {
              status: stratificationIssues.some((issue) => issue.severity === 'problem') ? 'problem' as const : 'current' as const,
              input: {
                pointId: nextCurrentScheme.input.pointId,
                draftId: nextCurrentScheme.input.draftId,
                batchId: nextCurrentScheme.input.batchId,
                revisions: { ...nextCurrentScheme.input.revisions },
              },
              sourceCheckRunId: nextCurrentScheme.input.checkRunId,
              sourceStratificationSchemeId: nextCurrentScheme.schemeId,
              sourceStratificationRevisionId: nextCurrentRevision?.revisionId,
            }
          : { status: 'empty' as const, input: null }
        : point.stratificationState;
      const downstreamInvalidation = {
        reason: '当前工作分层方案已变化，需要重新确认参数解译。',
        reasonCode: 'STRATIFICATION-SCHEME-CHANGED',
      };
      return {
            ...point,
            stratificationWorkspace: workspaceChanged ? nextStratificationWorkspace : point.stratificationWorkspace,
            parameterWorkspace: committedSchemeChanged
              ? markParameterWorkspaceStale(point.parameterWorkspace, downstreamInvalidation.reason)
              : nextParameterWorkspace,
            stratificationState: nextStratificationState,
            parameterState: committedSchemeChanged ? invalidateArtifactState(point.parameterState, downstreamInvalidation) : point.parameterState,
            outputState: committedSchemeChanged ? invalidateArtifactState(point.outputState, downstreamInvalidation) : point.outputState,
            outputWorkspace: committedSchemeChanged ? invalidateOutputWorkspace(point.outputWorkspace, downstreamInvalidation.reason) : point.outputWorkspace,
            selection: {
              selectedImportBatchId: project.importBatches.some(
                (batch) => batch.batchId === legacy.selection.selectedImportBatchId,
              )
                ? legacy.selection.selectedImportBatchId
                : point.selection.selectedImportBatchId,
              selectedCheckIssueId: legacy.selection.selectedCheckIssueId,
              selectedSchemeId: legacy.selection.selectedSchemeId,
              selectedLayerId: legacy.selection.selectedLayerId,
              selectedBoundaryId: legacy.selection.selectedBoundaryId,
              selectedParameterSchemeId: legacy.selection.selectedParameterSchemeId,
              selectedParameterSlotId: legacy.selection.selectedParameterSlotId,
              selectedOutputItemId: legacy.selection.selectedOutputItemId,
              selectedMappingField: legacy.selectedMappingField,
              importFocusField: legacy.importFocusField,
              importFocusSourceRowId: legacy.importFocusSourceRowId ?? null,
              importFocusDisplayRow: legacy.importFocusDisplayRow ?? null,
              stratificationToolMode: point.selection.stratificationToolMode,
              selectedCheckFilter: legacy.selectedCheckFilter,
            },
            updatedAt: new Date().toISOString(),
          };
    }),
  };
}

function cloneStratificationEditingState(workspace: StratificationWorkspaceV2): StratificationWorkspaceV2 {
  return {
    ...workspace,
    schemes: workspace.schemes.map((scheme) => structuredClone(scheme)),
    editSession: workspace.editSession ? structuredClone(workspace.editSession) : null,
    revisions: workspace.revisions?.map((revision) => structuredClone(revision)),
    deletedSchemeIds: [...(workspace.deletedSchemeIds ?? [])],
    // Completed rule and JTS runs are immutable evidence. Retaining them avoids cloning
    // thousands of frozen rows for every layer click or confirmation.
    ruleRuns: workspace.ruleRuns,
    jtsClassificationRuns: workspace.jtsClassificationRuns,
  };
}

function applyLegacyCheckPatch(project: ProjectWorkspaceV2, legacy: ProjectWorkspace): ProjectWorkspaceV2 {
  const base = applyLegacyUiPatch(project, legacy);
  const point = base.points.find((candidate) => candidate.pointId === base.activePointId);
  const draft = point?.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
  const record = legacy.checkRunHistory.find((candidate) => candidate.runId === legacy.checkRunId);
  if (!point || !draft || !record || legacy.checkedDraftVersion !== legacy.importDraft.version) return base;

  const dependency = {
    pointId: point.pointId,
    draftId: draft.draftId,
    batchId: draft.batchId,
    revisions: { ...draft.revisions },
  };
  const issues = getImportDraftCheckIssues(
    legacy.flowCase,
    legacy.importDraft,
    record.runId,
    legacy.checkedDraftVersion,
  );
  const run = {
    runId: record.runId,
    input: dependency,
    status: 'completed' as const,
    counts: { ...record.counts },
    conclusion: record.conclusion === '存在问题' ? '存在问题' as const : '无问题' as const,
    issueIds: issues.map((issue) => issue.issueId),
    normalizedDataHash: computeNormalizedPointDataHash(legacy.importDraft.sourceRowIds ?? [], legacy.importDraft.rows) ?? undefined,
    createdAt: record.createdAt,
    completedAt: record.createdAt,
  };
  const nextPoint = {
    ...point,
    checkState: {
      ...point.checkState,
      activeRunId: run.runId,
      runs: [...point.checkState.runs.filter((candidate) => candidate.runId !== run.runId), run],
      artifact: {
        status: run.conclusion === '存在问题' ? 'problem' as const : 'current' as const,
        input: dependency,
      },
    },
    updatedAt: record.createdAt,
  };
  return {
    ...base,
    activeRoute: 'check',
    points: base.points.map((candidate) => candidate.pointId === nextPoint.pointId ? nextPoint : candidate),
  };
}

function applyLegacyDomainPatch({
  existing,
  migrated,
  nextLegacy,
  importChanged,
  checkChanged,
}: {
  existing: ProjectWorkspaceV2;
  migrated: ProjectWorkspaceV2;
  nextLegacy: ProjectWorkspace;
  importChanged: boolean;
  checkChanged: boolean;
}) {
  const base = applyLegacyUiPatch(existing, nextLegacy);
  const importInvalidation = importChanged ? describeImportInvalidation(existing, migrated) : null;
  const sharedEditedBatchId = importChanged
    && existing.activeImportBatchId
    && existing.activeImportBatchId === migrated.activeImportBatchId
      ? existing.activeImportBatchId
      : null;
  const incomingBatchIds = new Set(migrated.importBatches.map((batch) => batch.batchId));
  const importBatches = importChanged
    ? [
        ...existing.importBatches.filter((batch) => !incomingBatchIds.has(batch.batchId)),
        ...migrated.importBatches,
      ]
    : existing.importBatches;
  const incomingPoint = migrated.points.find((point) => point.pointId === migrated.activePointId) ?? migrated.points[0] ?? null;
  if (!incomingPoint) {
    const points = importChanged
      ? base.points.map((point) => {
          const affected = sharedEditedBatchId
            ? point.importDrafts.some((draft) => draft.batchId === sharedEditedBatchId)
            : false;
          return affected ? invalidatePointForImportEdit(point, importInvalidation) : point;
        })
      : base.points;
    return {
      ...base,
      points,
      importBatches,
      activeImportBatchId: migrated.activeImportBatchId ?? existing.activeImportBatchId,
    };
  }

  if (nextLegacy.importDraft.pointDecision === 'new-point') {
    const conflict = findPointIdentityConflict(existing.points, incomingPoint);
    if (conflict) {
      const conflictedBatches = migrated.importBatches.map((batch) => {
        if (batch.kind !== 'draft') return batch;
        return {
          ...batch,
          workflowState: 'editing' as const,
          generatedDraftIds: [],
          pointPlan: {
            ...batch.pointPlan,
            state: 'conflict' as const,
            selectedPointKeys: [],
            conflicts: [
              {
                detectedPointKey: normalizeWorkspacePointKey(incomingPoint.pointName),
                existingPointId: conflict.pointId,
                reason: conflict.reason,
              },
            ],
            targetDecisions: batch.pointPlan.targetDecisions?.map((decision) => ({
              ...decision,
              action: 'pending' as const,
              state: 'conflict' as const,
              targetPointId: conflict.pointId,
              expectedActiveDraftId: conflict.activeImportDraftId ?? undefined,
            })),
            executions: batch.pointPlan.executions.map((execution) => ({
              ...execution,
              status: 'problem' as const,
              resultPointId: undefined,
              resultDraftId: undefined,
              errorCode: 'POINT-IDENTITY-CONFLICT',
            })),
          },
          problems: [
            ...batch.problems.filter((problem) => problem.problemId !== 'point-existing-conflict'),
            {
              problemId: 'point-existing-conflict',
              eventId: 'DI-E10',
              severity: 'issue' as const,
              title: '点位已存在',
              message: `项目中已经存在点位 ${conflict.pointName}，不能作为新点位静默替换。`,
              action: '选择保留为该点位的新草稿、修改点位名称或取消。',
              fieldName: 'PointName',
              evidence: `${incomingPoint.pointName} -> ${conflict.pointName}`,
            },
          ],
        };
      });
      const conflictedBatchIds = new Set(conflictedBatches.map((batch) => batch.batchId));
      return {
        ...base,
        flowFeedback: `点位 ${incomingPoint.pointName} 已存在，请重新选择处理方式。`,
        points: existing.points,
        activePointId: existing.activePointId,
        importBatches: [
          ...existing.importBatches.filter((batch) => !conflictedBatchIds.has(batch.batchId)),
          ...conflictedBatches,
        ],
        activeImportBatchId: migrated.activeImportBatchId ?? existing.activeImportBatchId,
      };
    }
    return {
      ...base,
      points: [...existing.points, incomingPoint],
      activePointId: incomingPoint.pointId,
      importBatches,
      activeImportBatchId: migrated.activeImportBatchId,
    };
  }

  const activePoint = existing.points.find((point) => point.pointId === existing.activePointId);
  const mergedPoint = activePoint
    ? mergePatchedPoint(activePoint, incomingPoint, importChanged, checkChanged, importInvalidation)
    : incomingPoint;
  const points = base.points.map((point) => {
    if (point.pointId === mergedPoint.pointId) return mergedPoint;
    if (sharedEditedBatchId && point.importDrafts.some((draft) => draft.batchId === sharedEditedBatchId)) {
      return invalidatePointForImportEdit(point, importInvalidation);
    }
    return point;
  });
  if (!points.some((point) => point.pointId === mergedPoint.pointId)) points.push(mergedPoint);
  return {
    ...base,
    points,
    activePointId: mergedPoint.pointId,
    importBatches,
    activeImportBatchId: importChanged ? migrated.activeImportBatchId ?? existing.activeImportBatchId : existing.activeImportBatchId,
  };
}

type ImportInvalidation = {
  reason: string;
  reasonCode: string;
  field?: TargetFieldKey;
  route?: RouteId;
};

function describeImportInvalidation(existing: ProjectWorkspaceV2, migrated: ProjectWorkspaceV2): ImportInvalidation {
  const before = existing.importBatches.find((batch) => batch.batchId === existing.activeImportBatchId);
  const after = migrated.importBatches.find((batch) => batch.batchId === migrated.activeImportBatchId) ?? migrated.importBatches.at(-1);
  if (!before || !after || before.kind !== 'draft' || after.kind !== 'draft') {
    return { reason: '活动导入草稿已变化。', reasonCode: 'IMPORT-DRAFT-CHANGED' };
  }
  if (before.sourceFingerprint !== after.sourceFingerprint || before.revisions.source !== after.revisions.source) {
    return { reason: '导入源文件已变化，需要重新运行数据检查。', reasonCode: 'IMPORT-SOURCE-CHANGED' };
  }
  if (before.revisions.mapping !== after.revisions.mapping) {
    const changedAfter = after.mappings.find((mapping) => {
      const prior = before.mappings.find((candidate) => candidate.targetField === mapping.targetField);
      return !prior || prior.sourceColumnId !== mapping.sourceColumnId || prior.state !== mapping.state;
    });
    const removedBefore = before.mappings.find(
      (mapping) => !after.mappings.some((candidate) => candidate.targetField === mapping.targetField),
    );
    const changed = changedAfter ?? removedBefore;
    return {
      reason: `${formatImportChangeSubject(changed?.targetField)}映射已变化，需要重新运行数据检查。`,
      reasonCode: 'IMPORT-MAPPING-CHANGED',
      field: changed?.targetField,
    };
  }
  if (before.revisions.unit !== after.revisions.unit) {
    const changed = after.unitDecisions.find((unit) => {
      const prior = before.unitDecisions.find((candidate) => candidate.targetField === unit.targetField);
      return !prior || prior.selectedUnit !== unit.selectedUnit || prior.state !== unit.state;
    });
    return {
      reason: `${formatImportChangeSubject(changed?.targetField)}单位已变化，需要重新运行数据检查。`,
      reasonCode: 'IMPORT-UNIT-CHANGED',
      field: changed?.targetField,
    };
  }
  return { reason: '活动导入草稿已变化，需要重新运行数据检查。', reasonCode: 'IMPORT-DRAFT-CHANGED' };
}

function formatImportChangeSubject(field?: TargetFieldKey) {
  const label = field ? importTargetFieldLabelV2(field) : '字段';
  return /[a-z]/i.test(label) ? `${label} 的` : `${label}的`;
}

function invalidatePointForImportEdit(
  point: ProjectWorkspaceV2['points'][number],
  invalidation: ImportInvalidation | null,
) {
  const now = new Date().toISOString();
  const reason: ImportInvalidation = invalidation
    ?? { reason: '活动导入批次的映射或单位尚未完成。', reasonCode: 'IMPORT-DECISION-CHANGED' };
  return {
    ...point,
    dataGovernance: invalidateDataGovernance(point.dataGovernance, reason.reason),
    checkState: {
      ...point.checkState,
      artifact: point.checkState.artifact.status === 'empty'
        ? point.checkState.artifact
        : {
            ...point.checkState.artifact,
            status: 'stale' as const,
            staleReason: reason.reason,
            invalidatedAt: now,
            recoveryTarget: { route: 'import' as const, reasonCode: reason.reasonCode, field: reason.field },
          },
    },
    stratificationWorkspace: markStratificationWorkspaceStale(point.stratificationWorkspace, reason.reason),
    parameterWorkspace: markParameterWorkspaceStale(point.parameterWorkspace, reason.reason),
    stratificationState: invalidateArtifactState(point.stratificationState, reason),
    parameterState: invalidateArtifactState(point.parameterState, reason),
    outputState: invalidateArtifactState(point.outputState, reason),
    outputWorkspace: invalidateOutputWorkspace(point.outputWorkspace, reason.reason),
    updatedAt: now,
  };
}

function getGovernedInputRows(
  point: ProjectWorkspaceV2['points'][number],
  dataBlocks: ImportDataBlockV2[],
): GovernedInputRow[] {
  const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId);
  const block = draft
    ? dataBlocks.find((candidate) => candidate.kind === 'normalized' && candidate.dataBlockId === draft.dataBlockId)
    : null;
  if (!draft || !block || block.kind !== 'normalized' || !block.rowReferences) return [];
  const referenceById = new Map(block.rowReferences.map((reference) => [reference.sourceRowId, reference]));
  return draft.sourceRowIds.flatMap((sourceRowId) => {
    const reference = referenceById.get(sourceRowId);
    const row = reference ? block.rows[reference.normalizedIndex] : null;
    return row ? [{ sourceRowId, row }] : [];
  });
}

function applyGovernanceToImportDraft(
  draft: ImportDraft,
  governance: ProjectWorkspaceV2['points'][number]['dataGovernance'] | null,
  governedRows: GovernedInputRow[],
  jtsContext: JtsSeriesContext | null,
): ImportDraft {
  if (!governance || !governedRows.length || governedRows.length !== draft.sourceRowIds?.length) return draft;
  const valueAdjustedRows = applyValueOverrides(governance, governedRows);
  const exclusion = currentExclusion(governance);
  const smoothing = activeSmoothing(governance);
  const excluded = new Set(exclusion?.excludedSourceRowIds ?? []);
  const smoothBySourceRowId = new Map(smoothing?.rows.map((row) => [row.sourceRowId, row]) ?? []);
  const included = valueAdjustedRows.filter((item) => !excluded.has(item.sourceRowId));
  if (!included.length) return draft;
  const prepared = included.map((item) => {
      const smoothed = smoothBySourceRowId.get(item.sourceRowId);
      const row = smoothed ? {
        ...item.row,
        qcKpa: smoothed.smoothedQcKpa,
        fsKpa: smoothed.smoothedFsKpa,
        u2Kpa: smoothed.smoothedU2Kpa ?? Number.NaN,
      } : { ...item.row };
      if (jtsContext?.route === 'approximate_cpt') row.u2Kpa = Number.NaN;
      return { sourceRowId: item.sourceRowId, row };
  });
  const measuredRows = prepared.map((item) => ({
    sourceRowId: item.sourceRowId,
    depthM: item.row.depthM,
    qcKpa: item.row.qcKpa,
    fsKpa: item.row.fsKpa,
    u2Kpa: Number.isFinite(item.row.u2Kpa) ? item.row.u2Kpa : null,
  }));
  const derived = jtsContext ? deriveJtsSeries(measuredRows, jtsContext) : null;
  const derivedById = new Map(derived?.ok ? derived.rows.map((row) => [row.sourceRowId, row]) : []);
  return {
    ...draft,
    sourceRowIds: prepared.map((item) => item.sourceRowId),
    rows: prepared.map((item, index) => {
      const formal = derivedById.get(item.sourceRowId);
      const qtKpa = formal?.qtKpa
        ?? (jtsContext ? calculateJtsCorrectedQtKpa(measuredRows[index], jtsContext) : item.row.qtKpa);
      return {
        ...item.row,
        qtKpa,
        frPercent: formal?.frPercent ?? Number.NaN,
      };
    }),
  };
}

function getJtsMeasuredRows(
  point: ProjectWorkspaceV2['points'][number],
  dataBlocks: ImportDataBlockV2[],
) {
  return getJtsMeasuredRowsFromGovernedRows(point, getGovernedInputRows(point, dataBlocks));
}

function getJtsMeasuredRowsFromGovernedRows(
  point: ProjectWorkspaceV2['points'][number],
  rows: GovernedInputRow[],
) {
  const valueAdjustedRows = applyValueOverrides(point.dataGovernance, rows);
  const exclusion = currentExclusion(point.dataGovernance);
  const smoothing = activeSmoothing(point.dataGovernance);
  const excluded = new Set(exclusion?.excludedSourceRowIds ?? []);
  const smoothById = new Map(smoothing?.rows.map((row) => [row.sourceRowId, row]) ?? []);
  return valueAdjustedRows.filter((item) => !excluded.has(item.sourceRowId)).map((item) => {
    const smoothed = smoothById.get(item.sourceRowId);
    return {
      sourceRowId: item.sourceRowId,
      depthM: item.row.depthM,
      qcKpa: smoothed?.smoothedQcKpa ?? item.row.qcKpa,
      fsKpa: smoothed?.smoothedFsKpa ?? item.row.fsKpa,
      u2Kpa: point.waterContext.channelState === 'absent'
        ? null
        : smoothed ? smoothed.smoothedU2Kpa : Number.isFinite(item.row.u2Kpa) ? item.row.u2Kpa : null,
    };
  });
}

function invalidatePointForGovernance(
  point: ProjectWorkspaceV2['points'][number],
  dataGovernance: ProjectWorkspaceV2['points'][number]['dataGovernance'],
  invalidation: ImportInvalidation,
  now: string,
) {
  return {
    ...point,
    dataGovernance,
    checkState: {
      ...point.checkState,
      artifact: point.checkState.artifact.status === 'empty'
        ? point.checkState.artifact
        : {
            ...point.checkState.artifact,
            status: 'stale' as const,
            staleReason: invalidation.reason,
            invalidatedAt: now,
            recoveryTarget: { route: 'check' as const, reasonCode: invalidation.reasonCode },
          },
    },
    stratificationWorkspace: markStratificationWorkspaceStale(point.stratificationWorkspace, invalidation.reason),
    parameterWorkspace: markParameterWorkspaceStale(point.parameterWorkspace, invalidation.reason),
    stratificationState: invalidateArtifactState(point.stratificationState, invalidation),
    parameterState: invalidateArtifactState(point.parameterState, invalidation),
    outputState: invalidateArtifactState(point.outputState, invalidation),
    outputWorkspace: invalidateOutputWorkspace(point.outputWorkspace, invalidation.reason),
    updatedAt: now,
  };
}

function findPointIdentityConflict(
  points: ProjectWorkspaceV2['points'],
  incoming: ProjectWorkspaceV2['points'][number],
) {
  const incomingName = normalizeWorkspacePointKey(incoming.pointName);
  const incomingAliases = new Set(incoming.aliases.map(normalizeWorkspacePointKey).filter(Boolean));
  for (const point of points) {
    if (point.pointId === incoming.pointId) return { ...point, reason: 'id' as const };
    const pointName = normalizeWorkspacePointKey(point.pointName);
    const pointAliases = new Set(point.aliases.map(normalizeWorkspacePointKey).filter(Boolean));
    if (pointName === incomingName) return { ...point, reason: 'name' as const };
    if (pointAliases.has(incomingName) || incomingAliases.has(pointName)) return { ...point, reason: 'alias' as const };
    if ([...incomingAliases].some((alias) => pointAliases.has(alias))) return { ...point, reason: 'alias' as const };
  }
  return null;
}

function normalizeWorkspacePointKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function mergePatchedPoint(
  existing: ProjectWorkspaceV2['points'][number],
  incoming: ProjectWorkspaceV2['points'][number],
  importChanged: boolean,
  checkChanged: boolean,
  invalidation: ImportInvalidation | null,
) {
  const incomingDraft = incoming.importDrafts.find((draft) => draft.draftId === incoming.activeImportDraftId) ?? incoming.importDrafts[0];
  const importDrafts = importChanged && incomingDraft
    ? [...existing.importDrafts.filter((draft) => draft.draftId !== incomingDraft.draftId), incomingDraft]
    : existing.importDrafts;
  const incomingCheckState = checkChanged && !importChanged
    ? rebindCheckState(incoming.checkState, existing)
    : incoming.checkState;
  const mergedCheckState = importChanged || checkChanged
    ? mergeCheckStates(existing.checkState, incomingCheckState)
    : existing.checkState;
  const checkState = importChanged && existing.checkState.artifact.status !== 'empty'
    ? {
        ...mergedCheckState,
        activeRunId: existing.checkState.activeRunId,
        artifact: {
          ...existing.checkState.artifact,
          status: 'stale' as const,
          staleReason: invalidation?.reason ?? '活动导入草稿已变化，需要重新运行数据检查。',
          invalidatedAt: new Date().toISOString(),
          recoveryTarget: {
            route: 'import' as const,
            reasonCode: invalidation?.reasonCode ?? 'IMPORT-DRAFT-CHANGED',
            field: invalidation?.field,
          },
        },
      }
    : mergedCheckState;
  const importedChannelState = incoming.waterContext.channelState;
  const waterContextChanged = importChanged && importedChannelState !== existing.waterContext.channelState;
  const nextWaterContext = importChanged && (waterContextChanged || existing.waterContext.channelState === 'unknown')
    ? {
        ...existing.waterContext,
        revisionId: `${existing.pointId}:water-context:${existing.waterContext.revision + 1}`,
        revision: existing.waterContext.revision + 1,
        channelState: importedChannelState,
        waterDepthM: importedChannelState === 'present' ? existing.waterContext.waterDepthM : null,
        confirmedAt: null,
        updatedAt: incoming.updatedAt,
      }
    : existing.waterContext;
  return {
    ...existing,
    pointName: existing.pointName,
    aliases: existing.aliases,
    waterDepthM: existing.waterDepthM,
    finalDepthM: importChanged ? incoming.finalDepthM : existing.finalDepthM,
    importDrafts,
    activeImportDraftId: importChanged ? incoming.activeImportDraftId : existing.activeImportDraftId,
    checkState,
    dataGovernance: importChanged
      ? invalidateDataGovernance(existing.dataGovernance, invalidation?.reason ?? '活动导入草稿已变化，需要重新检查数据。')
      : existing.dataGovernance,
    waterContext: nextWaterContext,
    derivationState: importChanged && existing.derivationState.status !== 'empty'
      ? {
          ...existing.derivationState,
          status: 'stale' as const,
          staleReason: invalidation?.reason ?? '活动导入草稿已变化。',
          invalidatedAt: incoming.updatedAt,
          recoveryTarget: { route: 'import' as const, reasonCode: invalidation?.reasonCode ?? 'IMPORT-DRAFT-CHANGED' },
        }
      : existing.derivationState,
    stratificationWorkspace: importChanged
      ? markStratificationWorkspaceStale(existing.stratificationWorkspace, invalidation?.reason)
      : existing.stratificationWorkspace,
    parameterWorkspace: importChanged
      ? markParameterWorkspaceStale(existing.parameterWorkspace, invalidation?.reason ?? '活动导入草稿已变化。')
      : existing.parameterWorkspace,
    stratificationState: importChanged ? invalidateArtifactState(existing.stratificationState, invalidation) : existing.stratificationState,
    parameterState: importChanged ? invalidateArtifactState(existing.parameterState, invalidation) : existing.parameterState,
    outputState: importChanged ? invalidateArtifactState(existing.outputState, invalidation) : existing.outputState,
    outputWorkspace: importChanged ? invalidateOutputWorkspace(existing.outputWorkspace, invalidation?.reason ?? '活动导入草稿已变化。') : existing.outputWorkspace,
    selection: importChanged ? incoming.selection : existing.selection,
    updatedAt: incoming.updatedAt,
  };
}

function rebindCheckState(
  checkState: ProjectWorkspaceV2['points'][number]['checkState'],
  point: ProjectWorkspaceV2['points'][number],
): ProjectWorkspaceV2['points'][number]['checkState'] {
  const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId) ?? point.importDrafts[0];
  if (!draft) return checkState;
  const bind = () => ({
    pointId: point.pointId,
    draftId: draft.draftId,
    batchId: draft.batchId,
    revisions: { ...draft.revisions },
  });
  return {
    ...checkState,
    runs: checkState.runs.map((run) => ({ ...run, input: bind() })),
    artifact: checkState.artifact.input ? { ...checkState.artifact, input: bind() } : checkState.artifact,
  };
}

function mergeCheckStates(
  existing: ProjectWorkspaceV2['points'][number]['checkState'],
  incoming: ProjectWorkspaceV2['points'][number]['checkState'],
) {
  const incomingLegacyIds = new Set(incoming.legacyHistory.map((run) => run.runId));
  const existingRunIds = new Set(existing.runs.map((run) => run.runId));
  return {
    ...incoming,
    runs: [...existing.runs, ...incoming.runs.filter((run) => !existingRunIds.has(run.runId))],
    legacyHistory: [
      ...existing.legacyHistory.filter((run) => !incomingLegacyIds.has(run.runId)),
      ...incoming.legacyHistory.filter((run) => !existingRunIds.has(run.runId)),
    ],
  };
}

function invalidateArtifactState(
  state: ProjectWorkspaceV2['points'][number]['stratificationState'],
  invalidation?: ImportInvalidation | null,
): ProjectWorkspaceV2['points'][number]['stratificationState'] {
  if (state.status === 'empty') return state;
  return {
    ...state,
    status: 'stale',
    staleReason: invalidation?.reason ?? '活动导入草稿已变化。',
    invalidatedAt: new Date().toISOString(),
    recoveryTarget: {
      route: invalidation?.route ?? 'import',
      reasonCode: invalidation?.reasonCode ?? 'IMPORT-DRAFT-CHANGED',
      field: invalidation?.field,
    },
  };
}

function invalidateOutputWorkspace(workspace: ProjectWorkspaceV2['points'][number]['outputWorkspace'], reason: string) {
  if (!workspace) return workspace;
  return {
    revisions: workspace.revisions.map((revision) => revision.status === 'current' ? { ...revision, status: 'stale' as const, staleReason: reason } : revision),
    activeRevisionIds: {},
  };
}

function mergeDataBlocks(current: ImportDataBlockV2[], incoming: ImportDataBlockV2[]) {
  const incomingIds = new Set(incoming.map((block) => block.dataBlockId));
  return [...current.filter((block) => !incomingIds.has(block.dataBlockId)), ...incoming];
}

function sameDataBlockReferences(
  previous: ImportDataBlockV2[] | null,
  next: ImportDataBlockV2[],
) {
  return previous !== null
    && previous.length === next.length
    && previous.every((block, index) => block === next[index]);
}

function createV2PointSummaries(
  project: ProjectWorkspaceV2,
  dataBlocks: ImportDataBlockV2[],
): ProjectPointSummary['availablePoints'] {
  return project.points.map((point) => {
    const draft = point.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId) ?? point.importDrafts[0];
    const block = draft ? dataBlocks.find((candidate) => candidate.dataBlockId === draft.dataBlockId) : null;
    const rows = block?.kind === 'normalized'
      ? block.rows.filter((row) => normalizePointDisplayKey(row.pointName) === normalizePointDisplayKey(draft?.sourcePointName ?? point.pointName))
      : [];
    const depths = rows.map((row) => row.depthM);
    const depthRange = depths.length ? `${Math.min(...depths).toFixed(2)}-${Math.max(...depths).toFixed(2)} m` : '待导入';
    return {
      pointId: point.pointId,
      pointName: point.pointName,
      alias: point.aliases[0] ?? '',
      status:
        point.checkState.artifact.status === 'current'
          ? '已检查'
          : draft?.status === 'ready'
            ? '可检查'
            : draft?.status === 'stale'
              ? '需重新检查'
              : draft
                ? '存在问题'
                : '未开始',
      recordCount: String(rows.length),
      depthRange,
    };
  });
}

function LegacyTransientApp() {
  const initialSeed = useMemo(() => readInitialFlowSeed(), []);
  const autoOpenDemo = useMemo(() => shouldAutoOpenInitialProject(), []);
  const initialProjectSetup = useMemo(() => {
    if (autoOpenDemo) {
      const projects = [createProjectWorkspace({ projectName: '', seed: initialSeed, mode: 'demo', withDemoData: true })];
      return { state: createProjectCollectionState(projects, projects[0].projectId), notice: null as ProjectStorageNotice | null };
    }
    const storage = getBrowserProjectStorage();
    if (!storage) {
      return {
        state: createProjectCollectionState([], null),
        notice: { kind: 'recovery', message: '当前浏览器不允许读取本机项目，本次更改只保留在当前页面。' } as ProjectStorageNotice,
      };
    }
    const loaded = loadProjectCollectionStorage(storage);
    if (loaded.ok) return { state: loaded.state, notice: null as ProjectStorageNotice | null };
    return {
      state: createProjectCollectionState([], null),
      notice: {
        kind: 'recovery',
        message:
          loaded.reason === 'unsupported-version'
            ? '本机项目版本暂不支持，已返回空项目集合。'
            : '本机项目数据无法恢复，已返回空项目集合。',
      } as ProjectStorageNotice,
    };
  }, [autoOpenDemo, initialSeed]);
  const [projectCollection, dispatchProjectCollection] = useReducer(
    projectCollectionReducer,
    initialProjectSetup.state,
  );
  const [storageNotice, setStorageNotice] = useState<ProjectStorageNotice | null>(initialProjectSetup.notice);
  const projectWorkspaces = projectCollection.projects;
  const activeProject = selectActiveProject(projectCollection);

  useEffect(() => {
    if (autoOpenDemo) return;
    const storage = getBrowserProjectStorage();
    if (!storage) {
      setStorageNotice({ kind: 'save-error', message: '当前浏览器不允许保存本机项目，本次更改只保留在当前页面。' });
      return;
    }
    const result = saveProjectCollectionStorage(storage, projectCollection);
    if (!result.ok) {
      setStorageNotice({ kind: 'save-error', message: '本机项目保存失败，本次更改仍保留在当前页面。' });
      return;
    }
    setStorageNotice((current) => (current?.kind === 'save-error' ? null : current));
  }, [autoOpenDemo, projectCollection]);

  function createProject(projectName: string, mode: 'quick' | 'user' = 'user') {
    const project = createProjectWorkspace({
      projectName,
      seed: Date.now(),
      mode,
      withDemoData: false,
    });
    dispatchProjectCollection({ type: 'add', project });
  }

  function openProject(projectId: string) {
    dispatchProjectCollection({ type: 'open', projectId });
  }

  function updateProject(projectId: string, updater: (project: ProjectWorkspace) => ProjectWorkspace) {
    dispatchProjectCollection({
      type: 'update',
      projectId,
      updater,
      updatedAt: new Date().toISOString(),
    });
  }

  function renameProject(projectId: string, projectName: string) {
    dispatchProjectCollection({
      type: 'rename',
      projectId,
      projectName,
      updatedAt: new Date().toISOString(),
    });
  }

  function deleteProject(projectId: string) {
    dispatchProjectCollection({ type: 'delete', projectId });
  }

  function clearProjects() {
    const storage = getBrowserProjectStorage();
    const result = storage ? clearProjectCollectionStorage(storage) : null;
    dispatchProjectCollection({ type: 'clear' });
    setStorageNotice(
      result && !result.ok
        ? { kind: 'save-error', message: '本机项目已从当前页面清除，但浏览器存储清除失败。' }
        : null,
    );
  }

  if (!activeProject) {
    return (
      <ProjectHub
        projects={projectWorkspaces}
        storageNotice={storageNotice}
        onCreateProject={createProject}
        onOpenProject={openProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onClearProjects={clearProjects}
        onDismissStorageNotice={() => setStorageNotice(null)}
      />
    );
  }

  return (
    <ProjectWorkspaceApp
      project={activeProject}
      projects={projectWorkspaces}
      onUpdateProject={(updater) => updateProject(activeProject.projectId, updater)}
      onOpenProjectHub={() => dispatchProjectCollection({ type: 'return-to-hub' })}
      onOpenProject={openProject}
      onRenameProject={renameProject}
      onDeleteProject={deleteProject}
      storageNotice={storageNotice}
    />
  );
}

function ProjectWorkspaceApp({
  project,
  projects,
  onUpdateProject,
  onImportPipelineReady,
  getImportBaseWorkspaceRevision,
  importPipeline,
  importPipelineContext,
  onUpdateImportPipeline,
  onOpenProjectHub,
  onOpenProject,
  storageNotice,
  workspacePointSummaries,
  workspaceProject,
  onPointLifecycle,
  onDataGovernance,
  onJtsClassification,
  onJtsParameterPackage,
  onJtsDissipation,
  onJtsOutput,
  governedInputRows,
  onWaitForDurability,
  onSetActiveRoute,
  onCommitDataCheck,
  onGeneratePointDrafts,
}: {
  project: ProjectWorkspace;
  projects: ProjectWorkspace[];
  onUpdateProject: (updater: (project: ProjectWorkspace) => ProjectWorkspace) => void | Promise<boolean>;
  onImportPipelineReady?: (pipeline: CsvImportPipelineV2, draft: ImportDraft) => Promise<boolean>;
  getImportBaseWorkspaceRevision?: () => Promise<number>;
  importPipeline?: CsvImportPipelineV2 | null;
  importPipelineContext?: PipelineContext;
  onUpdateImportPipeline?: (pipeline: CsvImportPipelineV2) => Promise<boolean>;
  onOpenProjectHub: () => void;
  onOpenProject: (projectId: string) => void;
  onRenameProject: (projectId: string, projectName: string) => void;
  onDeleteProject: (projectId: string) => void;
  storageNotice: ProjectStorageNotice | null;
  workspacePointSummaries?: ProjectPointSummary['availablePoints'];
  workspaceProject?: ProjectWorkspaceV2;
  onPointLifecycle?: (command: PointLifecycleCommand) => PointLifecycleResult;
  onDataGovernance?: (command: DataGovernanceCommand) => DataGovernanceCommandResult;
  onJtsClassification?: (command: JtsClassificationCommand) => JtsClassificationCommandResult;
  onJtsParameterPackage?: (command: JtsParameterPackageCommand) => JtsParameterPackageCommandResult;
  onJtsDissipation?: (command: JtsDissipationCommand) => JtsDissipationCommandResult;
  onJtsOutput?: (command: JtsOutputCommand) => JtsOutputCommandResult;
  governedInputRows?: GovernedInputRow[];
  onWaitForDurability?: () => Promise<boolean>;
  onSetActiveRoute?: (route: RouteId) => void;
  onCommitDataCheck?: (record: CheckRunRecord) => Promise<boolean>;
  onGeneratePointDrafts?: (pipeline: CsvImportPipelineV2) => Promise<PointGenerationResult>;
}) {
  const flowCase = project.flowCase;
  const importDraft = project.importDraft;
  const selectedMappingField = project.selectedMappingField;
  const importFocusField = project.importFocusField;
  const importFocusSourceRowId = project.importFocusSourceRowId ?? null;
  const importFocusDisplayRow = project.importFocusDisplayRow ?? null;
  const checkInputDependency = project.checkInputDependency;
  const checkRunId = project.checkRunId;
  const checkedDraftVersion = project.checkedDraftVersion;
  const checkRunHistory = project.checkRunHistory;
  const checkStaleReason = project.checkStaleReason;
  const checkArtifactStatus: CheckArtifactStatus = project.checkArtifactStatus
    ?? (project.checkedDraftVersion === null ? 'empty' : project.checkStaleReason ? 'stale' : 'current');
  const checkRecoveryField = project.checkRecoveryField;
  const checkRecoveryReasonCode = project.checkRecoveryReasonCode;
  const activeWorkspacePoint = workspaceProject?.points.find((point) => point.pointId === workspaceProject.activePointId) ?? null;
  const dataGovernance = activeWorkspacePoint?.dataGovernance ?? null;
  const activeProbeProfile = workspaceProject?.probeProfiles.find((profile) => profile.revisionId === activeWorkspacePoint?.probeContext.activeProfileRevisionId) ?? null;
  const jtsEvidenceContext = useMemo<JtsSeriesContext | null>(() => {
    if (!activeWorkspacePoint?.probeContext.confirmedAt || !activeProbeProfile || !activeWorkspacePoint.waterContext.confirmedAt) return null;
    if (activeWorkspacePoint.waterContext.channelState === 'absent') {
      return { route: 'approximate_cpt', effectiveAreaRatio: activeProbeProfile.effectiveAreaRatio };
    }
    if (activeWorkspacePoint.waterContext.channelState !== 'present' || !Number.isFinite(activeWorkspacePoint.waterContext.waterDepthM)) return null;
    return {
      route: 'full_cptu',
      effectiveAreaRatio: activeProbeProfile.effectiveAreaRatio,
      waterDepthM: activeWorkspacePoint.waterContext.waterDepthM as number,
      u2HydrostaticDatum: activeWorkspacePoint.waterContext.u2HydrostaticDatum,
      testZeroDatum: activeWorkspacePoint.waterContext.testZeroDatum,
      boreholeBottomDepthM: activeWorkspacePoint.waterContext.boreholeBottomDepthM,
      waterUnitWeightKnM3: activeWorkspacePoint.waterContext.waterUnitWeightKnM3,
    };
  }, [activeProbeProfile, activeWorkspacePoint?.probeContext.revisionId, activeWorkspacePoint?.waterContext.revisionId]);
  const governedCheckDraft = useMemo(
    () => applyGovernanceToImportDraft(importDraft, dataGovernance, governedInputRows ?? [], jtsEvidenceContext),
    [dataGovernance, governedInputRows, importDraft, jtsEvidenceContext],
  );
  const selectedCheckFilter = project.selectedCheckFilter;
  const flowFeedback = project.flowFeedback;
  const selection = project.selection;
  const [localSelectedCheckIssueId, setLocalSelectedCheckIssueId] = useState(selection.selectedCheckIssueId);
  useEffect(() => {
    setLocalSelectedCheckIssueId(selection.selectedCheckIssueId);
  }, [activeWorkspacePoint?.pointId, checkRunId]);
  const activeRoute = selection.activeRoute;
  const selectedScheme = selectLayerScheme(selection.selectedSchemeId);
  const selectedLayer = selectLayer(selectedScheme, selection.selectedLayerId);
  const selectedBoundary = selectBoundary(selectedScheme, selection.selectedBoundaryId);
  const selectedParameterScheme = selectParameterScheme(selection.selectedParameterSchemeId);
  const selectedParameterSlot = selectParameterSlot(selectedParameterScheme, selection.selectedParameterSlotId);
  const stratificationWorkspace = project.stratificationWorkspace ?? emptyStratificationWorkspace();
  const currentStratificationInput = checkInputDependency
    && ['current', 'problem'].includes(checkArtifactStatus)
    && checkedDraftVersion === importDraft.version
      ? createStratificationInput(checkInputDependency, checkRunId)
      : null;
  const activeStratificationScheme = getActiveStratificationScheme(stratificationWorkspace);
  const [localStratificationSelection, setLocalStratificationSelection] = useState(() => ({
    layerId: selection.selectedLayerId,
    boundaryId: selection.selectedBoundaryId,
  }));
  useEffect(() => {
    setLocalStratificationSelection({
      layerId: selection.selectedLayerId || activeStratificationScheme?.layers[0]?.layerId || '',
      boundaryId: selection.selectedBoundaryId,
    });
  }, [activeStratificationScheme?.schemeId, activeWorkspacePoint?.pointId, selection.selectedBoundaryId, selection.selectedLayerId]);
  const selectedStratificationLayer = activeStratificationScheme?.layers.find((layer) => layer.layerId === localStratificationSelection.layerId)
    ?? activeStratificationScheme?.layers[0]
    ?? null;
  const selectedStratificationBoundary = activeStratificationScheme?.boundaries.find((boundary) => boundary.boundaryId === localStratificationSelection.boundaryId)
    ?? null;
  const stratificationIssues = activeStratificationScheme ? getStratificationIssues(activeStratificationScheme) : [];
  const stratificationBlockingIssues = stratificationActionableProblems(stratificationIssues);
  const stratificationHandoffGate = getStratificationHandoffGate(stratificationWorkspace, currentStratificationInput);
  const activeStratificationRuleRun = stratificationWorkspace.ruleRuns?.find((run) => run.runId === stratificationWorkspace.activeRuleRunId)
    ?? stratificationWorkspace.ruleRuns?.at(-1)
    ?? null;
  const activeJtsClassificationRun = stratificationWorkspace.activeJtsClassificationRunId
    ? stratificationWorkspace.jtsClassificationRuns?.find((run) => run.runId === stratificationWorkspace.activeJtsClassificationRunId) ?? null
    : null;
  const activeJtsGuidance = useMemo(
    () => activeJtsClassificationRun?.status === 'completed' ? getJtsClassificationGuidance(activeJtsClassificationRun) : null,
    [activeJtsClassificationRun],
  );
  const persistedParameterWorkspace = useMemo(
    () => project.parameterWorkspace ?? emptyParameterWorkspace(),
    [project.parameterWorkspace],
  );
  const [parameterWorkspace, setOptimisticParameterWorkspace] = useState(persistedParameterWorkspace);
  const parameterWorkspacePendingUpdateCountRef = useRef(0);
  useEffect(() => {
    setOptimisticParameterWorkspace((current) => {
      const currentEdit = current.customFormulaEditSession;
      if (parameterWorkspacePendingUpdateCountRef.current > 0 || currentEdit?.dirty) return current;
      return persistedParameterWorkspace;
    });
  }, [persistedParameterWorkspace]);
  const parameterWorkspaceUpdateRef = useRef(parameterWorkspace);
  const parameterWorkspaceUpdateQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    const currentEdit = parameterWorkspaceUpdateRef.current.customFormulaEditSession;
    const incomingEdit = parameterWorkspace.customFormulaEditSession;
    if (currentEdit?.dirty && incomingEdit?.dirty && currentEdit.formulaId === incomingEdit.formulaId) return;
    parameterWorkspaceUpdateRef.current = parameterWorkspace;
  }, [parameterWorkspace]);
  const activeJtsParameterPackage = parameterWorkspace.jtsParameterPackageRuns?.find((run) => run.runId === parameterWorkspace.activeJtsParameterPackageRunId)
    ?? parameterWorkspace.jtsParameterPackageRuns?.at(-1)
    ?? null;
  const activeJtsDissipationTest = parameterWorkspace.jtsDissipationTests?.find((item) => item.revisionId === parameterWorkspace.activeJtsDissipationTestRevisionId)
    ?? parameterWorkspace.jtsDissipationTests?.at(-1)
    ?? null;
  const activeJtsDissipationT50 = parameterWorkspace.jtsDissipationT50Revisions?.find((item) => item.revisionId === parameterWorkspace.activeJtsDissipationT50RevisionId) ?? null;
  const activeJtsDissipationResult = parameterWorkspace.jtsDissipationResults?.find((item) =>
    item.revisionId === parameterWorkspace.activeJtsDissipationResultRevisionId
    && item.formulaRevision === JTS_DISSIPATION_FORMULA_REVISION)
    ?? [...(parameterWorkspace.jtsDissipationResults ?? [])].reverse().find((item) => item.formulaRevision === JTS_DISSIPATION_FORMULA_REVISION)
    ?? null;
  const activeCheckRecord = checkRunHistory.find((record) => record.runId === checkRunId) ?? null;
  const currentSmoothing = activeWorkspacePoint ? activeSmoothing(activeWorkspacePoint.dataGovernance) : null;
  const jtsMeasuredRows = useMemo(
    () => activeWorkspacePoint ? getJtsMeasuredRowsFromGovernedRows(activeWorkspacePoint, governedInputRows ?? []) : [],
    [activeWorkspacePoint, governedInputRows],
  );
  const jtsSeriesContext = activeWorkspacePoint && activeProbeProfile && activeWorkspacePoint.waterContext.confirmedAt
    && !['unknown', 'partial'].includes(activeWorkspacePoint.waterContext.channelState)
      ? activeWorkspacePoint.waterContext.channelState === 'present'
        ? {
            route: 'full_cptu' as const,
            effectiveAreaRatio: activeProbeProfile.effectiveAreaRatio,
            waterDepthM: activeWorkspacePoint.waterContext.waterDepthM as number,
            u2HydrostaticDatum: activeWorkspacePoint.waterContext.u2HydrostaticDatum,
            testZeroDatum: activeWorkspacePoint.waterContext.testZeroDatum,
            boreholeBottomDepthM: activeWorkspacePoint.waterContext.boreholeBottomDepthM,
            waterUnitWeightKnM3: activeWorkspacePoint.waterContext.waterUnitWeightKnM3,
          }
        : {
            route: 'approximate_cpt' as const,
            effectiveAreaRatio: activeProbeProfile.effectiveAreaRatio,
            waterUnitWeightKnM3: activeWorkspacePoint.waterContext.waterUnitWeightKnM3,
          }
      : null;
  const jtsRecoveryDiagnosticInput = useMemo(() => ({
    checkCurrentAndClear: checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题',
    checkCanRerun: isImportDraftCheckable(importDraft),
    checkStale: checkArtifactStatus === 'stale',
    probeConfirmed: Boolean(activeWorkspacePoint?.probeContext.confirmedAt && activeProbeProfile),
    waterContextConfirmed: Boolean(activeWorkspacePoint?.waterContext.confirmedAt && !['unknown', 'partial'].includes(activeWorkspacePoint.waterContext.channelState)),
    rows: jtsMeasuredRows,
    context: jtsSeriesContext,
    activeSmoothingDepthWindowM: currentSmoothing?.settings.depthWindowM ?? null,
  }), [activeCheckRecord?.conclusion, activeProbeProfile, activeWorkspacePoint, checkArtifactStatus, currentSmoothing?.settings.depthWindowM, importDraft, jtsMeasuredRows, jtsSeriesContext]);
  const currentJtsRecoveryDiagnosis = useMemo(
    () => diagnoseJtsClassificationRecovery(jtsRecoveryDiagnosticInput),
    [jtsRecoveryDiagnosticInput],
  );
  const guidedGenerationRecoveryOption = currentJtsRecoveryDiagnosis?.options.find((option) => option.enabled && option.recommended)
    ?? currentJtsRecoveryDiagnosis?.options.find((option) => option.enabled && option.kind === 'automatic')
    ?? currentJtsRecoveryDiagnosis?.options.find((option) => option.enabled)
    ?? null;
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelView, setRightPanelView] = useState<'tools' | 'assistant'>('tools');
  const assistantExecutedCommandIdsRef = useRef(new Set<string>());
  useEffect(() => {
    if (activeRoute === 'stratification') setRightPanelOpen(false);
  }, [activeRoute]);
  const [excelParsing, setExcelParsing] = useState(false);
  const [pendingExcelSheetSelection, setPendingExcelSheetSelection] = useState<{ file: File; candidates: ExcelSheetProfileV1[] } | null>(null);
  const [importDockMode, setImportDockMode] = useState<'tools' | 'assistant'>('tools');
  const [importAssistantSource, setImportAssistantSource] = useState<ImportAssistantSource | null>(null);
  const [importAssistantAttachment, setImportAssistantAttachment] = useState<RawImportDataBlockV2['sourceAttachment'] | null>(null);
  const [importAssistantBaseRevision, setImportAssistantBaseRevision] = useState<number | null>(null);
  const [importAssistantSourceProblem, setImportAssistantSourceProblem] = useState('');
  const [importAssistantDraftPending, setImportAssistantDraftPending] = useState(false);
  const [importPageRestarted, setImportPageRestarted] = useState(false);
  const [pendingPointIdentityImport, setPendingPointIdentityImport] = useState<{
    parsedImport: { draft: ImportDraft; pipeline: CsvImportPipelineV2 };
    fileName: string;
  } | null>(null);
  const [pointIdentityDialogOpen, setPointIdentityDialogOpen] = useState(false);
  const [pointIdentityDraft, setPointIdentityDraft] = useState('');
  const [pointIdentityProblem, setPointIdentityProblem] = useState('');
  const [pointIdentitySaveFailed, setPointIdentitySaveFailed] = useState(false);
  const [pointIdentitySubmitting, setPointIdentitySubmitting] = useState(false);
  const [stratificationCommandProblem, setStratificationCommandProblem] = useState('');
  const [jtsRecoveryIssue, setJtsRecoveryIssue] = useState<JtsClassificationRecoveryIssue | null>(null);
  const [jtsAutoRecovery, setJtsAutoRecovery] = useState<JtsAutoRecoveryState | null>(null);
  const [jtsDecisionDialogRunId, setJtsDecisionDialogRunId] = useState<string | null>(null);
  const [handledJtsDecisionRunId, setHandledJtsDecisionRunId] = useState<string | null>(null);
  const [guidedGenerationOpen, setGuidedGenerationOpen] = useState(false);
  const [newSchemeChoiceOpen, setNewSchemeChoiceOpen] = useState(false);
  const [restartConfirmation, setRestartConfirmation] = useState<'import' | 'parameters' | null>(null);
  const [guidedGenerationChoice, setGuidedGenerationChoice] = useState<'jts' | 'rule-jts' | 'manual' | null>(null);
  const [guidedClassificationMethodId, setGuidedClassificationMethodId] = useState<ClassificationMethodIdV1>('jts-t242-2020');
  const [guidedGenerationRunning, setGuidedGenerationRunning] = useState(false);
  const [guidedGenerationProblem, setGuidedGenerationProblem] = useState('');
  const guidedGenerationInFlightRef = useRef(false);
  const [stratificationFinalizeGuideOpen, setStratificationFinalizeGuideOpen] = useState(false);
  const [thinLayerGuideOpen, setThinLayerGuideOpen] = useState(false);
  const [pendingThinLayerGuide, setPendingThinLayerGuide] = useState<string | null>(null);
  const [stratificationAdvancedToolsOpen, setStratificationAdvancedToolsOpen] = useState(false);
  const [pendingGuidedGeneration, setPendingGuidedGeneration] = useState<'jts' | 'rule-jts' | null>(null);
  const jtsRecoveryInFlightRef = useRef(false);
  const [stratificationDockMode, setStratificationDockMode] = useState<'manual' | 'rule' | 'jts'>('manual');
  const [selectedRuleCandidateId, setSelectedRuleCandidateId] = useState('');
  const [parameterView, setParameterView] = useState<ParameterWorkbenchView>('curves');
  const [parameterGuideOpen, setParameterGuideOpen] = useState(false);
  const [parameterGuideFocusMethodId, setParameterGuideFocusMethodId] = useState<JtsParameterMethodIdV5 | null>(null);
  const [parameterIssueRecoveryIntent, setParameterIssueRecoveryIntent] = useState<ParameterRecoveryIntent | null>(null);
  const [dismissedParameterGuideSource, setDismissedParameterGuideSource] = useState<string | null>(null);
  const [parameterToolMode, setParameterToolMode] = useState<'builtin' | 'custom'>('builtin');
  const [selectedParameterRunId, setSelectedParameterRunId] = useState('');
  const [selectedCustomFormulaRunId, setSelectedCustomFormulaRunId] = useState('');
  const [selectedParameterSourceRowId, setSelectedParameterSourceRowId] = useState<string | null>(null);
  const [selectedParameterLayerId, setSelectedParameterLayerId] = useState<string | null>(null);
  const [inspectedParameterLayerId, setInspectedParameterLayerId] = useState<string | null>(null);
  const [parameterCommandProblem, setParameterCommandProblem] = useState('');
  const [parameterEvidenceDraft, setParameterEvidenceDraft] = useState<ParameterEvidenceDraft>(DEFAULT_PARAMETER_EVIDENCE_DRAFT);
  const [parameterEvidenceDirty, setParameterEvidenceDirty] = useState(false);
  const [parameterNktMode, setParameterNktMode] = useState<ParameterWorkbenchNktMode>('literature');
  const [pendingParameterEvidenceTransition, setPendingParameterEvidenceTransition] = useState<
    | { kind: 'mode'; mode: 'builtin' | 'custom' }
    | { kind: 'route'; route: RouteId }
    | { kind: 'scheme'; schemeId: string }
    | { kind: 'slot'; slotId: string }
    | { kind: 'layer'; layerId: string }
    | { kind: 'locate-source-row'; sourceRowId: string; displayRow: number | null }
    | null
  >(null);
  const [pendingCustomFormulaTransition, setPendingCustomFormulaTransition] = useState<
    | { kind: 'mode'; mode: 'builtin' | 'custom' }
    | { kind: 'formula'; formulaId: string }
    | { kind: 'route'; route: RouteId }
    | { kind: 'locate-source-row'; sourceRowId: string; displayRow: number | null }
    | null
  >(null);
  const [pendingStratificationTransition, setPendingStratificationTransition] = useState<
    | { kind: 'route'; route: RouteId }
    | { kind: 'scheme'; schemeId: string }
    | { kind: 'discard' }
    | null
  >(null);
  const [storageAlertDismissed, setStorageAlertDismissed] = useState(false);
  const [storageHelpOpen, setStorageHelpOpen] = useState(false);
  const [storageRetrying, setStorageRetrying] = useState(false);
  const storageFailure = storageNotice?.kind === 'save-error'
    ? storageNotice.failure ?? fallbackWorkspaceStorageDiagnosis(storageNotice.message)
    : null;
  const currentGovernanceKey = `${activeWorkspacePoint?.dataGovernance.currentValueOverrideRevisionId ?? 'none'}:${activeWorkspacePoint?.dataGovernance.currentExclusionRevisionId ?? 'none'}:${activeWorkspacePoint?.dataGovernance.activeSmoothingRunId ?? 'none'}`;
  const activePointNeedsIdentity = Boolean(activeWorkspacePoint && isReservedPointName(activeWorkspacePoint.pointName));
  const pendingPointIdentitySummary = pendingPointIdentityImport
    ? { fileName: pendingPointIdentityImport.fileName, rowCount: pendingPointIdentityImport.parsedImport.pipeline.rows.length }
    : activePointNeedsIdentity
      ? { fileName: importDraft.fileName, rowCount: importDraft.rows.length }
      : null;
  useEffect(() => {
    if (activeRoute !== 'import' || !activePointNeedsIdentity || pendingPointIdentityImport) return;
    setPointIdentityDraft('');
    setPointIdentityProblem('');
    setPointIdentitySaveFailed(false);
    setPointIdentityDialogOpen(true);
  }, [activePointNeedsIdentity, activeRoute, activeWorkspacePoint?.pointId, pendingPointIdentityImport]);
  useEffect(() => {
    setPointIdentitySaveFailed(false);
  }, [pendingPointIdentityImport?.parsedImport.pipeline.operationId]);
  useEffect(() => {
    setStorageAlertDismissed(false);
    setStorageHelpOpen(false);
    setStorageRetrying(false);
  }, [storageNotice?.message, storageNotice?.failure?.code]);
  useEffect(() => {
    setSelectedRuleCandidateId(activeStratificationRuleRun?.candidates[0]?.candidateId ?? '');
  }, [activeStratificationRuleRun?.runId]);
  useEffect(() => {
    setJtsRecoveryIssue(null);
    setJtsAutoRecovery(null);
    setJtsDecisionDialogRunId(null);
    setHandledJtsDecisionRunId(null);
    setGuidedGenerationOpen(false);
    setGuidedGenerationChoice(null);
    setGuidedClassificationMethodId('jts-t242-2020');
    setGuidedGenerationRunning(false);
    setGuidedGenerationProblem('');
    guidedGenerationInFlightRef.current = false;
    setPendingGuidedGeneration(null);
    setThinLayerGuideOpen(false);
    setPendingThinLayerGuide(null);
  }, [activeWorkspacePoint?.pointId]);
  useEffect(() => {
    if (!pendingThinLayerGuide || activeRoute !== 'stratification' || !activeStratificationScheme || activeStratificationScheme.schemeId === pendingThinLayerGuide) return;
    setPendingThinLayerGuide(null);
    setThinLayerGuideOpen(true);
  }, [activeRoute, activeStratificationScheme?.schemeId, pendingThinLayerGuide]);
  useEffect(() => {
    if (activeRoute !== 'stratification'
      || !activeJtsClassificationRun
      || activeJtsClassificationRun.status !== 'completed'
      || !activeJtsGuidance?.unclassifiableRows
      || handledJtsDecisionRunId === activeJtsClassificationRun.runId) return;
    setJtsDecisionDialogRunId(activeJtsClassificationRun.runId);
  }, [activeJtsClassificationRun, activeJtsGuidance?.unclassifiableRows, activeRoute, handledJtsDecisionRunId]);
  useEffect(() => {
    if (!pendingGuidedGeneration
      || !activeJtsClassificationRun
      || activeJtsClassificationRun.status !== 'completed'
      || !currentStratificationInput
      || !sameStratificationInput(activeJtsClassificationRun.input, currentStratificationInput)) return;
    if (activeJtsGuidance?.unclassifiableRows) {
      setJtsDecisionDialogRunId(activeJtsClassificationRun.runId);
      return;
    }
    const ruleRunId = pendingGuidedGeneration === 'rule-jts'
      ? activeStratificationScheme?.origin?.kind === 'rule-candidate'
        ? activeStratificationScheme.origin.ruleRunId
        : activeStratificationRuleRun?.runId
      : undefined;
    convertJtsClassificationToScheme('stable', 0, {
      unclassifiablePolicy: 'none',
      boundarySource: pendingGuidedGeneration === 'rule-jts' ? 'rule' : 'jts',
      ruleRunId,
    });
    setPendingGuidedGeneration(null);
  }, [
    activeJtsClassificationRun?.runId,
    activeJtsGuidance?.unclassifiableRows,
    activeStratificationRuleRun?.runId,
    activeStratificationScheme?.schemeId,
    activeStratificationScheme?.origin,
    currentStratificationInput,
    pendingGuidedGeneration,
  ]);
  useEffect(() => {
    if (!jtsRecoveryIssue || (jtsAutoRecovery && ['awaiting-governance', 'awaiting-check', 'running-classification'].includes(jtsAutoRecovery.phase))) return;
    if (currentJtsRecoveryDiagnosis?.code === jtsRecoveryIssue.code && currentJtsRecoveryDiagnosis.summary === jtsRecoveryIssue.summary) return;
    setJtsRecoveryIssue(currentJtsRecoveryDiagnosis);
  }, [currentJtsRecoveryDiagnosis, jtsAutoRecovery, jtsRecoveryIssue]);
  useEffect(() => {
    if (jtsAutoRecovery?.phase !== 'awaiting-governance' || currentGovernanceKey === jtsAutoRecovery.baselineGovernanceKey) return;
    void rerunCheckAndJtsClassification();
  }, [currentGovernanceKey, jtsAutoRecovery?.baselineGovernanceKey, jtsAutoRecovery?.phase]);
  const currentStratificationScheme = getCurrentStratificationScheme(stratificationWorkspace);
  const currentStratificationRevision = currentStratificationScheme
    ? stratificationWorkspace.revisions?.find((revision) =>
        revision.schemeId === currentStratificationScheme.schemeId && revision.version === currentStratificationScheme.version) ?? null
    : null;
  const parameterGuideSourceKey = activeJtsClassificationRun?.status === 'completed'
    && currentStratificationRevision?.snapshot.origin?.kind === 'jts-classification'
    && currentStratificationRevision.snapshot.origin.classificationRunId === activeJtsClassificationRun.runId
      ? `${activeJtsClassificationRun.runId}:${currentStratificationRevision.revisionId}`
      : null;
  const currentGuidedJtsPackage = activeJtsParameterPackage?.status === 'completed'
    && activeJtsClassificationRun?.status === 'completed'
    && currentStratificationRevision
    && activeJtsParameterPackage.classificationRunId === activeJtsClassificationRun.runId
    && activeJtsParameterPackage.classificationResultHash === activeJtsClassificationRun.resultHash
    && activeJtsParameterPackage.stratificationRevisionId === currentStratificationRevision.revisionId
      ? activeJtsParameterPackage
      : null;
  const jtsGuidedParameterMode = parameterToolMode === 'builtin' && Boolean(parameterGuideSourceKey);
  useEffect(() => {
    if (activeRoute !== 'parameters') {
      setDismissedParameterGuideSource(null);
      return;
    }
    if (parameterGuideSourceKey
      && (!currentGuidedJtsPackage || parameterWorkspace.guidedParameterDraft)
      && dismissedParameterGuideSource !== parameterGuideSourceKey) setParameterGuideOpen(true);
  }, [activeRoute, currentGuidedJtsPackage, dismissedParameterGuideSource, parameterGuideSourceKey, parameterWorkspace.guidedParameterDraft]);
  const parameterSource = currentStratificationInput && currentStratificationScheme && currentStratificationRevision
    && stratificationHandoffGate.state !== 'deny'
    ? {
        pointId: currentStratificationScheme.input.pointId,
        siteId: project.parameterSiteId ?? null,
        draftId: currentStratificationScheme.input.draftId,
        batchId: currentStratificationScheme.input.batchId,
        revisions: { ...currentStratificationScheme.input.revisions },
        checkRunId: currentStratificationScheme.input.checkRunId,
        stratificationSchemeId: currentStratificationScheme.schemeId,
        stratificationRevisionId: currentStratificationRevision.revisionId,
        stratificationVersion: currentStratificationRevision.version,
      }
    : null;
  const parameterSourceProblem = parameterSource
    ? null
    : stratificationHandoffGate.state === 'deny'
      ? stratificationHandoffGate.reason
      : !currentStratificationRevision
        ? '当前点位没有已提交的精确分层修订。'
        : '当前分层来源与最新数据检查不一致。';
  const activeParameterSchemeV2 = selectActiveParameterSchemeV2(parameterWorkspace);
  const parameterSchemeStale = Boolean(
    activeParameterSchemeV2
    && (activeParameterSchemeV2.status === 'stale' || !parameterSource || !sameParameterSource(activeParameterSchemeV2.input, parameterSource)),
  );
  const currentParameterSchemeRevisionV2 = selectCurrentParameterSchemeRevisionV2(parameterWorkspace);
  const activeParameterSchemeRevisionV2 = activeParameterSchemeV2
    ? parameterWorkspace.revisions.find((revision) => revision.schemeId === activeParameterSchemeV2.schemeId && revision.version === activeParameterSchemeV2.version) ?? null
    : null;
  const selectedParameterSlotV2 = activeParameterSchemeV2?.slots.find((slot) => slot.slotId === selection.selectedParameterSlotId)
    ?? activeParameterSchemeV2?.slots[0]
    ?? null;
  const latestParameterDerivation = selectLatestCompletedDerivationRun(parameterWorkspace, activeParameterSchemeRevisionV2?.revisionId);
  const selectedSlotRuns = selectParameterMethodRuns(parameterWorkspace, selectedParameterSlotV2?.slotId);
  const selectedParameterRun = selectedSlotRuns.find((run) => run.runId === selectedParameterRunId)
    ?? selectedSlotRuns.find((run) => run.status === 'completed')
    ?? selectedSlotRuns[0]
    ?? null;
  const selectedParameterRunIndex = selectedParameterRun ? selectedSlotRuns.findIndex((run) => run.runId === selectedParameterRun.runId) : -1;
  const previousParameterRun = selectedParameterRun && selectedParameterRunIndex >= 0
    ? selectedSlotRuns.slice(selectedParameterRunIndex + 1).find((run) =>
        run.status === 'completed'
        && run.derivationRunId === selectedParameterRun.derivationRunId
        && run.inputHash === selectedParameterRun.inputHash
        && run.formulaSpecHash === selectedParameterRun.formulaSpecHash) ?? null
    : null;
  const displayedParameterDerivation = selectedParameterRun
    ? parameterWorkspace.derivationRuns.find((run) => run.runId === selectedParameterRun.derivationRunId) ?? latestParameterDerivation
    : latestParameterDerivation;
  const displayedParameterSchemeRevision = selectedParameterRun
    ? parameterWorkspace.revisions.find((revision) => revision.revisionId === selectedParameterRun.schemeRevisionId) ?? activeParameterSchemeRevisionV2
    : activeParameterSchemeRevisionV2;
  const displayedStratificationRevision = displayedParameterSchemeRevision
    ? stratificationWorkspace.revisions?.find((revision) =>
        revision.revisionId === displayedParameterSchemeRevision.snapshot.input.stratificationRevisionId) ?? currentStratificationRevision
    : currentStratificationRevision;
  const viewingHistoricalParameterRevision = Boolean(
    selectedParameterRun
    && activeParameterSchemeRevisionV2
    && selectedParameterRun.schemeRevisionId !== activeParameterSchemeRevisionV2.revisionId,
  );
  const displayedParameterSlotV2 = selectedParameterRun
    ? displayedParameterSchemeRevision?.snapshot.slots.find((slot) => slot.slotId === selectedParameterRun.slotId) ?? selectedParameterSlotV2
    : selectedParameterSlotV2;
  const inspectedParameterRow = displayedParameterDerivation?.derivedRows.find((row) => row.sourceRowId === selectedParameterSourceRowId) ?? null;
  const inspectedParameterValue = selectedParameterRun?.values.find((value) => value.sourceRowId === selectedParameterSourceRowId) ?? null;
  const inspectedParameterLayer = inspectedParameterRow
    ? displayedStratificationRevision?.snapshot.layers.find((layer, index, layers) =>
        inspectedParameterRow.depthM >= layer.depthFromM
        && (inspectedParameterRow.depthM < layer.depthToM || (index === layers.length - 1 && inspectedParameterRow.depthM <= layer.depthToM))) ?? null
    : null;
  const currentCustomFormulaSource = !parameterSchemeStale && currentParameterSchemeRevisionV2 && latestParameterDerivation
    ? createCustomFormulaSource(currentParameterSchemeRevisionV2, latestParameterDerivation)
    : null;
  const activeCustomFormula = selectActiveCustomFormula(parameterWorkspace);
  const activeCustomFormulaRevision = selectCustomFormulaRevision(parameterWorkspace, activeCustomFormula);
  const selectedCustomFormulaRuns = selectCustomFormulaRuns(parameterWorkspace, activeCustomFormula?.formulaId);
  const selectedCustomFormulaRun = selectedCustomFormulaRuns.find((run) => run.runId === selectedCustomFormulaRunId)
    ?? selectedCustomFormulaRuns.find((run) => run.status === 'completed')
    ?? selectedCustomFormulaRuns[0]
    ?? null;
  const selectedCustomFormulaRunIndex = selectedCustomFormulaRun ? selectedCustomFormulaRuns.findIndex((run) => run.runId === selectedCustomFormulaRun.runId) : -1;
  const previousCustomFormulaRun = selectedCustomFormulaRun && selectedCustomFormulaRunIndex >= 0
    ? selectedCustomFormulaRuns.slice(selectedCustomFormulaRunIndex + 1).find((run) => run.status === 'completed' && run.formulaRevisionId === selectedCustomFormulaRun.formulaRevisionId && run.inputHash === selectedCustomFormulaRun.inputHash) ?? null
    : null;
  const displayedCustomFormulaRevision = selectedCustomFormulaRun
    ? parameterWorkspace.customFormulaRevisions?.find((revision) => revision.revisionId === selectedCustomFormulaRun.formulaRevisionId) ?? activeCustomFormulaRevision
    : activeCustomFormulaRevision;
  const displayedCustomParameterRevision = displayedCustomFormulaRevision
    ? parameterWorkspace.revisions.find((revision) => revision.revisionId === displayedCustomFormulaRevision.snapshot.source.parameterSchemeRevisionId) ?? currentParameterSchemeRevisionV2
    : currentParameterSchemeRevisionV2;
  const displayedCustomDerivation = selectedCustomFormulaRun
    ? parameterWorkspace.derivationRuns.find((run) => run.runId === selectedCustomFormulaRun.parameterDerivationRunId) ?? latestParameterDerivation
    : latestParameterDerivation;
  const displayedCustomStratificationRevision = displayedCustomFormulaRevision
    ? stratificationWorkspace.revisions?.find((revision) => revision.revisionId === displayedCustomFormulaRevision.snapshot.source.stratificationRevisionId) ?? currentStratificationRevision
    : currentStratificationRevision;
  const viewingHistoricalCustomFormula = Boolean(
    selectedCustomFormulaRun
    && activeCustomFormulaRevision
    && selectedCustomFormulaRun.formulaRevisionId !== activeCustomFormulaRevision.revisionId,
  );
  const customFormulaValidation = activeCustomFormula ? validateCustomFormulaDraft(activeCustomFormula, currentStratificationRevision?.snapshot.layers.map((layer) => layer.layerId)) : null;
  const customFormulaStale = Boolean(
    activeCustomFormula
    && (activeCustomFormula.status === 'stale' || !currentCustomFormulaSource || !sameCustomFormulaSource(activeCustomFormula.source, currentCustomFormulaSource)),
  );
  const parameterInputRows: ParameterInputRowV2[] | null = useMemo(() => importDraft.sourceRowIds
    && importDraft.sourceRowIds.length === importDraft.rows.length
    ? importDraft.rows.map((row, index) => ({
        sourceRowId: importDraft.sourceRowIds![index],
        depthM: row.depthM,
        qcKpa: Number.isFinite(row.qcKpa) ? row.qcKpa : null,
        qtKpa: Number.isFinite(row.qtKpa) ? row.qtKpa : null,
        fsKpa: Number.isFinite(row.fsKpa) ? row.fsKpa : null,
        u2Kpa: Number.isFinite(row.u2Kpa) ? row.u2Kpa : null,
        importedFrPercent: Number.isFinite(row.frPercent) ? row.frPercent : null,
      }))
    : null, [importDraft.rows, importDraft.sourceRowIds]);
  useEffect(() => {
    setSelectedParameterRunId(selectedSlotRuns.find((run) => run.status === 'completed')?.runId ?? selectedSlotRuns[0]?.runId ?? '');
  }, [selectedParameterSlotV2?.slotId, parameterWorkspace.parameterRuns.length]);
  useEffect(() => {
    setSelectedCustomFormulaRunId(selectedCustomFormulaRuns.find((run) => run.status === 'completed')?.runId ?? selectedCustomFormulaRuns[0]?.runId ?? '');
  }, [activeCustomFormula?.formulaId, parameterWorkspace.customFormulaRuns?.length]);
  useEffect(() => {
    const visibleDerivation = parameterToolMode === 'custom' ? displayedCustomDerivation : displayedParameterDerivation;
    setSelectedParameterSourceRowId((current) => current && visibleDerivation?.derivedRows.some((row) => row.sourceRowId === current)
      ? current
      : visibleDerivation?.derivedRows[0]?.sourceRowId ?? null);
  }, [displayedCustomDerivation?.runId, displayedParameterDerivation?.runId, parameterToolMode]);
  useEffect(() => {
    setSelectedParameterLayerId((current) => current && displayedStratificationRevision?.snapshot.layers.some((layer) => layer.layerId === current)
      && selectedParameterSlotV2?.targetScope.layerIds.includes(current)
      ? current
      : selectedParameterSlotV2?.targetScope.layerIds[0] ?? displayedStratificationRevision?.snapshot.layers[0]?.layerId ?? null);
  }, [displayedStratificationRevision?.revisionId, selectedParameterSlotV2?.slotId]);
  useEffect(() => {
    setInspectedParameterLayerId((current) => current && displayedStratificationRevision?.snapshot.layers.some((layer) => layer.layerId === current)
      ? current
      : selectedParameterSlotV2?.targetScope.layerIds[0] ?? displayedStratificationRevision?.snapshot.layers[0]?.layerId ?? null);
  }, [displayedStratificationRevision?.revisionId, selectedParameterSlotV2?.slotId]);
  useEffect(() => {
    if (!selectedParameterSlotV2 || !selectedParameterLayerId) return;
    const savedDraft = getParameterEvidenceDraft(parameterWorkspace, selectedParameterSlotV2, selectedParameterLayerId);
    setParameterEvidenceDraft(savedDraft ?? {
      ...DEFAULT_PARAMETER_EVIDENCE_DRAFT,
      drainageStatus: selectedParameterSlotV2.parameterKey === 'PhiDeg' ? 'confirmed_drained' : 'confirmed_undrained',
    });
    setParameterEvidenceDirty(false);
  }, [selectedParameterLayerId, selectedParameterSlotV2?.slotId, parameterWorkspace.methodEvidenceRevisions?.length]);
  const [selectedImportPointKey, setSelectedImportPointKey] = useState<string | null>(null);
  const [pointPlanFeedback, setPointPlanFeedback] = useState('');
  const [pointPlanStale, setPointPlanStale] = useState(false);
  const [importActionPending, setImportActionPending] = useState(false);
  const [pendingPointActivationName, setPendingPointActivationName] = useState<string | null>(null);
  const [singlePointTargetProblem, setSinglePointTargetProblem] = useState<ImportDraftProblem | null>(null);
  const activeImportOperation = useRef<string | null>(null);
  useEffect(() => {
    setImportAssistantSource(null);
    setImportAssistantAttachment(null);
    setImportAssistantBaseRevision(null);
    setImportAssistantSourceProblem('');
    setImportAssistantDraftPending(false);
    setImportDockMode('tools');
  }, [activeWorkspacePoint?.pointId, project.projectId]);
  const restartedImportDraft = useMemo(
    () => createEmptyProjectImportDraft(),
    [flowCase.project.projectId, flowCase.point.pointName],
  );
  const visibleImportDraft = importPageRestarted
    ? restartedImportDraft
    : pendingPointIdentityImport?.parsedImport.draft ?? importDraft;
  const visibleImportPipeline = importPageRestarted
    ? null
    : pendingPointIdentityImport?.parsedImport.pipeline ?? importPipeline;
  const projectSummary = useMemo(() => {
    const summary = getImportDraftProjectPointSummary(flowCase, visibleImportDraft);
    return workspacePointSummaries
      ? { ...summary, pointScope: summary.pointName, totalPointCount: workspacePointSummaries.length, availablePoints: workspacePointSummaries }
      : summary;
  }, [flowCase, visibleImportDraft, workspacePointSummaries]);
  const importMappings = useMemo(() => getImportDraftFieldMappings(visibleImportDraft), [visibleImportDraft]);
  const importPreviewRows = useMemo(() => getImportDraftPreviewRows(visibleImportDraft), [visibleImportDraft]);
  const needsRecheck = checkedDraftVersion !== null
    && (checkArtifactStatus === 'stale' || checkedDraftVersion !== importDraft.version);
  const checkIssues = useMemo(() => augmentPreparationCheckIssues(getImportDraftCheckIssues(flowCase, governedCheckDraft, checkRunId, checkedDraftVersion, {
    reason: checkStaleReason,
    field: checkRecoveryField,
    reasonCode: checkRecoveryReasonCode,
    stale: checkArtifactStatus === 'stale',
  }), importDraft, governedCheckDraft), [
    checkArtifactStatus,
    activeCheckRecord?.conclusion,
    checkRecoveryField,
    checkRecoveryReasonCode,
    checkStaleReason,
    checkedDraftVersion,
    flowCase,
    governedCheckDraft,
    checkRunId,
    activeWorkspacePoint?.probeContext.revisionId,
    activeWorkspacePoint?.waterContext.revisionId,
    governedInputRows,
    workspaceProject?.mode,
    workspaceProject?.probeProfiles,
  ]);
  const currentParameterDerivationForOutput = selectLatestCompletedDerivationRun(parameterWorkspace, currentParameterSchemeRevisionV2?.revisionId);
  const currentParameterSchemeForOutput = parameterWorkspace.schemes.find((scheme) => scheme.schemeId === parameterWorkspace.currentSchemeId) ?? null;
  const currentFormulaSourceForOutput = currentParameterSchemeRevisionV2 && currentParameterDerivationForOutput
    ? createCustomFormulaSource(currentParameterSchemeRevisionV2, currentParameterDerivationForOutput)
    : null;
  const currentFormulaDefinitionsForOutput = (parameterWorkspace.customFormulas ?? []).filter((formula) => formula.status === 'current');
  const formulaDefinitionsForOutput = currentFormulaDefinitionsForOutput.length
    ? currentFormulaDefinitionsForOutput
    : (parameterWorkspace.customFormulas ?? []).filter((formula) => formula.status === 'stale');
  const currentFormulaResultsForOutput = formulaDefinitionsForOutput.map((formula) => {
    const revision = parameterWorkspace.customFormulaRevisions?.find((candidate) => candidate.formulaId === formula.formulaId && candidate.version === formula.version) ?? null;
    const run = revision && currentParameterSchemeRevisionV2 && currentParameterDerivationForOutput
      ? [...(parameterWorkspace.customFormulaRuns ?? [])].reverse().find((candidate) =>
          candidate.status === 'completed'
          && candidate.formulaRevisionId === revision.revisionId
          && candidate.parameterSchemeRevisionId === currentParameterSchemeRevisionV2.revisionId
          && candidate.parameterDerivationRunId === currentParameterDerivationForOutput.runId) ?? null
      : null;
    return { formula, revision, run, sourceCurrent: Boolean(currentFormulaSourceForOutput && sameCustomFormulaSource(formula.source, currentFormulaSourceForOutput)) };
  });
  const customFormulaValidCount = currentFormulaResultsForOutput.reduce((sum, result) => sum + (result.run?.summary?.validCount ?? 0), 0);
  const customFormulaMissingInputCount = currentFormulaResultsForOutput.reduce((sum, result) => sum + (result.run?.summary?.missingInputCount ?? 0), 0);
  const customFormulaProblemCount = currentFormulaResultsForOutput.reduce((sum, result) => sum + (result.run?.summary?.numericProblemCount ?? 0) + (result.run?.summary?.outOfRangeCount ?? 0), 0);
  const customFormulaNonTargetCount = currentFormulaResultsForOutput.reduce((sum, result) => sum + (result.run?.summary?.nonTargetCount ?? 0), 0);
  const stratificationReadyForOutput = Boolean(currentStratificationScheme && currentStratificationRevision && stratificationHandoffGate.state !== 'deny');
  const parameterAuthorityCurrentForOutput = Boolean(
    currentParameterSchemeRevisionV2
    && currentParameterSchemeForOutput?.status === 'current'
    && parameterSource
    && sameParameterSource(currentParameterSchemeForOutput.input, parameterSource)
    && currentParameterDerivationForOutput?.status === 'completed',
  );
  const parameterInvalidInputCount = currentParameterDerivationForOutput?.summary?.invalidInputCount ?? 0;
  const parameterUndefinedCount = currentParameterDerivationForOutput?.summary?.undefinedCount ?? 0;
  const parameterProblemCount = parameterInvalidInputCount + parameterUndefinedCount;
  const parameterScopeConfirmedForOutput = Boolean(currentGuidedJtsPackage?.settingsSnapshot.outputScopeConfirmedAt);
  const parameterScopeIncludedMethodIds = currentGuidedJtsPackage?.settingsSnapshot.outputScopeIncludedMethodIds ?? [];
  const jtsParameterReadyForOutput = Boolean(currentGuidedJtsPackage?.status === 'completed' && !parameterWorkspace.guidedParameterDraft && parameterScopeConfirmedForOutput && parameterScopeIncludedMethodIds.length > 0);
  const parameterScopeIncludedMethodLabels = parameterScopeIncludedMethodIds.map((methodId) => JTS_PARAMETER_METHOD_META[methodId].symbol);
  const parameterScopeExcludedMethodLabels = (currentGuidedJtsPackage?.settingsSnapshot.outputScopeExcludedMethodIds ?? []).map((methodId) => JTS_PARAMETER_METHOD_META[methodId].symbol);
  const parametersReadyForOutput = jtsParameterReadyForOutput || (parameterAuthorityCurrentForOutput && parameterProblemCount === 0);
  // Custom formula results are excluded by default. They may only enter a
  // future output snapshot through an explicit "纳入成果" decision.
  const customFormulaReadyForOutput = true;
  const outputRuntime: OutputRuntimeSummary = {
    projectName: project.projectName,
    pointName: flowCase.point.pointName,
    checkReady: checkArtifactStatus === 'current',
    checkedRowCount: importDraft.rows.length,
    stratificationReady: stratificationReadyForOutput,
    layerCount: currentStratificationScheme?.layers.length ?? 0,
    parametersReady: parametersReadyForOutput,
    parameterAuthorityCurrent: jtsParameterReadyForOutput || parameterAuthorityCurrentForOutput,
    parameterRowCount: activeJtsParameterPackage?.classificationRowsSnapshot.length ?? currentParameterDerivationForOutput?.derivedRows.length ?? 0,
    parameterInvalidInputCount,
    parameterUndefinedCount,
    parameterProblemCount,
    parameterScopeConfirmed: parameterScopeConfirmedForOutput,
    parameterScopeIncludedMethodLabels,
    parameterScopeExcludedMethodLabels,
    customFormulaCount: currentFormulaResultsForOutput.length,
    customFormulaReady: customFormulaReadyForOutput,
    customFormulaValidCount,
    customFormulaMissingInputCount,
    customFormulaProblemCount,
    customFormulaNonTargetCount,
  };
  const outputItems = useMemo((): OutputItem[] => [
    { itemId: 'checked-data', label: '数据检查记录', status: outputRuntime.checkReady ? 'Completed' : 'NeedsConfirmation', note: outputRuntime.checkReady ? `${outputRuntime.checkedRowCount} 行数据已有当前检查记录。` : '当前点位尚无可用的数据检查记录。' },
    { itemId: 'stratification-result', label: '地层分层结果', status: outputRuntime.stratificationReady ? 'Current' : 'NeedsConfirmation', note: outputRuntime.stratificationReady ? `当前分层修订包含 ${outputRuntime.layerCount} 层。` : outputRuntime.layerCount ? '分层结果不再绑定当前检查，需要重新确认。' : '当前点位尚无已提交分层修订。' },
    { itemId: 'parameter-result', label: '参数解译结果', status: outputRuntime.parameterScopeConfirmed ? 'ScopeConfirmed' : outputRuntime.parametersReady ? 'Completed' : outputRuntime.parameterAuthorityCurrent && outputRuntime.parameterProblemCount ? 'Problem' : 'NeedsConfirmation', note: outputRuntime.parameterScopeConfirmed ? `纳入 ${outputRuntime.parameterScopeIncludedMethodLabels.length} 项完成参数${outputRuntime.parameterScopeExcludedMethodLabels.length ? `；${outputRuntime.parameterScopeExcludedMethodLabels.length} 项本阶段不纳入：${outputRuntime.parameterScopeExcludedMethodLabels.join('、')}` : '；无排除项'}。` : outputRuntime.parametersReady ? `当前参数推导包含 ${outputRuntime.parameterRowCount} 行有效结果。` : outputRuntime.parameterAuthorityCurrent && outputRuntime.parameterProblemCount ? `当前参数推导有 ${outputRuntime.parameterInvalidInputCount} 行无效输入、${outputRuntime.parameterUndefinedCount} 行未定义，需处理后重新运行。` : outputRuntime.parameterRowCount ? '参数结果不再绑定当前分层，需要重新运行。' : '当前点位尚无已完成参数推导。' },
    { itemId: 'custom-formula-result', label: '自定义公式结果', status: outputRuntime.customFormulaCount ? 'Excluded' : 'NotConfigured', note: outputRuntime.customFormulaCount ? '默认不纳入本次成果；只有工程师明确选择“纳入成果”后才可进入报告。' : '当前点位没有自定义公式结果。' },
    { itemId: 'excluded-direct-inputs', label: '排除对象', status: 'Excluded', note: '候选、调试和中间运行对象不进入本次成果文件。' },
  ], [outputRuntime.checkReady, outputRuntime.checkedRowCount, outputRuntime.customFormulaCount, outputRuntime.customFormulaMissingInputCount, outputRuntime.customFormulaNonTargetCount, outputRuntime.customFormulaProblemCount, outputRuntime.customFormulaReady, outputRuntime.customFormulaValidCount, outputRuntime.layerCount, outputRuntime.parameterAuthorityCurrent, outputRuntime.parameterInvalidInputCount, outputRuntime.parameterProblemCount, outputRuntime.parameterRowCount, outputRuntime.parameterScopeConfirmed, outputRuntime.parameterScopeExcludedMethodLabels, outputRuntime.parameterScopeIncludedMethodLabels, outputRuntime.parametersReady, outputRuntime.parameterUndefinedCount, outputRuntime.stratificationReady]);
  const selectedOutputItem = outputItems.find((item) => item.itemId === selection.selectedOutputItemId) ?? outputItems[0] ?? null;
  const [outputGenerationKind, setOutputGenerationKind] = useState<JtsOutputRevisionV7['kind'] | null>(null);
  const outputGenerationGuard = useRef(false);
  const selectedCheckIssue =
    checkIssues.find((issue) => issue.issueId === localSelectedCheckIssueId) ?? checkIssues[0] ?? null;
  const filteredCheckIssuesForPanel = useMemo(
    () => filterCheckIssues(checkIssues, selectedCheckFilter),
    [checkIssues, selectedCheckFilter],
  );
  const selectedFilteredCheckIssue =
    filteredCheckIssuesForPanel.find((issue) => issue.issueId === localSelectedCheckIssueId) ??
    filteredCheckIssuesForPanel[0] ??
    null;
  const checkHandoffGate = useMemo(
    () => getCheckHandoffGate(importDraft, checkIssues, checkedDraftVersion, checkArtifactStatus),
    [checkArtifactStatus, checkIssues, checkedDraftVersion, importDraft],
  );

  useEffect(() => {
    if (!parameterIssueRecoveryIntent || parameterIssueRecoveryIntent.stage !== 'check') return;
    const transition = evaluateParameterRecovery(parameterIssueRecoveryIntent, {
      checkRunId,
      checkAllowed: checkHandoffGate.state !== 'deny',
      stratificationRevisionId: currentStratificationRevision?.revisionId ?? null,
      activeClassificationRunId: activeJtsClassificationRun?.status === 'completed' ? activeJtsClassificationRun.runId : null,
      stratificationClassificationRunId: currentStratificationRevision?.snapshot.origin?.kind === 'jts-classification' ? currentStratificationRevision.snapshot.origin.classificationRunId : null,
    });
    if (transition.state !== 'advance-to-stratification') return;
    setParameterIssueRecoveryIntent(transition.intent);
    void onUpdateProject((current) => ({
      ...current,
      flowFeedback: '数据已复检。旧分类、分层和参数结果已失效；请在地层分层生成新的最终修订，系统随后返回原参数。',
      selection: { ...current.selection, activeRoute: 'stratification' },
    }));
  }, [activeJtsClassificationRun, checkHandoffGate.state, checkRunId, currentStratificationRevision, onUpdateProject, parameterIssueRecoveryIntent]);

  useEffect(() => {
    if (!parameterIssueRecoveryIntent || parameterIssueRecoveryIntent.stage !== 'stratification') return;
    const transition = evaluateParameterRecovery(parameterIssueRecoveryIntent, {
      checkRunId,
      checkAllowed: checkHandoffGate.state !== 'deny',
      stratificationRevisionId: currentStratificationRevision?.revisionId ?? null,
      activeClassificationRunId: activeJtsClassificationRun?.status === 'completed' ? activeJtsClassificationRun.runId : null,
      stratificationClassificationRunId: currentStratificationRevision?.snapshot.origin?.kind === 'jts-classification' ? currentStratificationRevision.snapshot.origin.classificationRunId : null,
    });
    if (transition.state !== 'return-to-parameters') return;
    const methodId = transition.methodId;
    setParameterIssueRecoveryIntent(null);
    setParameterGuideFocusMethodId(methodId);
    setParameterGuideOpen(true);
    void onUpdateProject((current) => ({
      ...current,
      flowFeedback: '新的最终分层已就绪，已返回原参数。请确认配置并重新运行。',
      selection: { ...current.selection, activeRoute: 'parameters' },
    }));
  }, [activeJtsClassificationRun, checkHandoffGate.state, checkRunId, currentStratificationRevision, onUpdateProject, parameterIssueRecoveryIntent]);

  useEffect(() => {
    if (!pendingPointActivationName) return;
    const activePointReady = normalizePointDisplayKey(flowCase.point.pointName) === normalizePointDisplayKey(pendingPointActivationName);
    const generatedExecutionReady = importPipeline?.pointPlan.executions.some((execution) => execution.status === 'generated') ?? false;
    if (activePointReady && generatedExecutionReady) {
      setImportActionPending(false);
      setPendingPointActivationName(null);
    }
  }, [flowCase.point.pointName, importPipeline, pendingPointActivationName]);

  function setImportDraft(next: ImportDraft | ((current: ImportDraft) => ImportDraft)) {
    onUpdateProject((current) => ({
      ...current,
      importDraft: typeof next === 'function' ? next(current.importDraft) : next,
    }));
  }

  function setSelectedMappingField(next: string) {
    onUpdateProject((current) => ({
      ...current,
      selectedMappingField: next,
    }));
  }

  function selectImportMappingField(next: string) {
    setSelectedImportPointKey(null);
    onUpdateProject((current) => ({
      ...current,
      selectedMappingField: next,
      importFocusSourceRowId: null,
      importFocusDisplayRow: null,
    }));
  }

  function setImportFocusField(next: string | null) {
    onUpdateProject((current) => ({
      ...current,
      importFocusField: next,
    }));
  }

  function setSelectedCheckFilter(next: CheckFilter) {
    const filtered = filterCheckIssues(checkIssues, next);
    setLocalSelectedCheckIssueId(filtered[0]?.issueId ?? '');
    onUpdateProject((current) => ({
      ...current,
      selectedCheckFilter: next,
    }));
  }

  function setFlowFeedback(next: string) {
    return onUpdateProject((current) => ({
      ...current,
      flowFeedback: next,
    }));
  }

  async function commitPipelineEdit(next: CsvImportPipelineV2, feedback: string) {
    if (!onUpdateImportPipeline || next === importPipeline) return false;
    const accepted = await onUpdateImportPipeline(next);
    if (accepted) {
      setPointPlanStale(false);
      await Promise.resolve(setFlowFeedback(feedback));
    }
    return accepted;
  }

  async function applyImportMapping(sourceColumnId: string, targetField: TargetFieldKey) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = setFieldMapping(importPipeline, targetField, sourceColumnId, importPipelineContext);
    return commitPipelineEdit(next, `${importTargetFieldLabelV2(targetField)} 映射已更新，标准化结果已重新计算。`);
  }

  async function confirmImportMapping(targetField: TargetFieldKey) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = confirmFieldMapping(importPipeline, targetField, importPipelineContext);
    return commitPipelineEdit(next, `${importTargetFieldLabelV2(targetField)} 映射已确认。`);
  }

  async function clearImportMapping(targetField: TargetFieldKey) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = clearFieldMapping(importPipeline, targetField, importPipelineContext);
    return commitPipelineEdit(next, `${importTargetFieldLabelV2(targetField)} 映射已清除。`);
  }

  async function resetImportMappings() {
    if (!importPipeline || !importPipelineContext) return false;
    const next = resetFieldMappings(importPipeline, importPipelineContext);
    return commitPipelineEdit(next, '字段映射已恢复为本批次的自动建议。');
  }

  async function applyImportUnit(targetField: TargetFieldKey, unit: string) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = setUnitDecision(importPipeline, targetField, unit, importPipelineContext);
    return commitPipelineEdit(next, `${importTargetFieldLabelV2(targetField)} 源单位已确认为 ${unit}。`);
  }

  async function applyPointSplitStrategy(
    strategy: 'split-all' | 'split-selected' | 'cancelled',
    selectedPointKeys: string[],
  ) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = setPointSplitPlan(importPipeline, strategy, selectedPointKeys, importPipelineContext);
    const accepted = await commitPipelineEdit(
      next,
      strategy === 'cancelled'
        ? '本批次点位生成已取消，既有点位和检查状态没有改变。'
        : strategy === 'split-all'
          ? `已选择拆分全部 ${next.pointPlan.selectedPointKeys.length} 个点位。`
          : `已选择生成 ${next.pointPlan.selectedPointKeys.length} 个点位。`,
    );
    if (accepted) {
      setSelectedImportPointKey(
        next.pointPlan.targetDecisions?.find((decision) => decision.state !== 'confirmed')?.detectedPointKey
          ?? next.pointPlan.selectedPointKeys[0]
          ?? null,
      );
      setPointPlanFeedback('');
    }
    return accepted;
  }

  async function applyPointTarget(
    detectedPointKey: string,
    action: Exclude<PointTargetDecisionV2['action'], 'pending'>,
    options?: { targetPointId?: string; proposedPointName?: string },
  ) {
    if (!importPipeline || !importPipelineContext) return false;
    const next = setPointTargetDecision(importPipeline, detectedPointKey, action, options, importPipelineContext);
    const decision = next.pointPlan.targetDecisions?.find((candidate) => candidate.detectedPointKey === detectedPointKey);
    const accepted = await commitPipelineEdit(
      next,
      decision?.state === 'confirmed' ? '当前点位目标已确认。' : '当前点位目标仍有问题，请核对名称或目标点位。',
    );
    if (accepted) setPointPlanFeedback(decision?.state === 'confirmed' ? '' : pointDecisionReason(decision?.reasonCode));
    return accepted;
  }

  async function generateCurrentPointPlan() {
    if (!importPipeline || !onGeneratePointDrafts || importActionPending) return false;
    setImportActionPending(true);
    try {
      const result = await onGeneratePointDrafts(importPipeline);
      if (!result.ok) {
        if (result.code === 'WORKSPACE-REVISION-CHANGED') setPointPlanStale(true);
        setPointPlanFeedback(result.message);
        return false;
      }
      const generatedPointKeys = new Set(result.generated.map((item) => item.detectedPointKey));
      const nextPointKey = getImportPointPlanRows(importPipeline).find((row) =>
        !generatedPointKeys.has(row.pointKey)
        && (row.problemCount > 0 || row.execution?.status !== 'generated'),
      )?.pointKey
        ?? result.generated[0]?.detectedPointKey
        ?? selectedImportPointKey;
      setSelectedImportPointKey(nextPointKey);
      setPointPlanFeedback(`已生成 ${result.generated.length} 个点位草稿。`);
      return true;
    } finally {
      setImportActionPending(false);
    }
  }

  function setSelection(next: WorkflowSelectionState | ((current: WorkflowSelectionState) => WorkflowSelectionState)) {
    onUpdateProject((current) => ({
      ...current,
      selection: typeof next === 'function' ? next(current.selection) : next,
    }));
  }

  useEffect(() => {
    document.querySelector('[data-testid="active-document"]')?.scrollTo({ top: 0, left: 0 });
    document.querySelector('[data-testid="right-panel"]')?.scrollTo({ top: 0, left: 0 });
  }, [activeRoute, selectedScheme.schemeId]);

  function openRoute(route: RouteId) {
    if (route === 'stratification' && checkHandoffGate.state === 'deny') {
      void onUpdateProject((current) => ({ ...current, flowFeedback: `暂不能进入地层分层：${checkHandoffGate.reason}`, selection: { ...current.selection, activeRoute: 'check' } }));
      return;
    }
    if (
      activeRoute === 'stratification'
      && route !== 'stratification'
      && stratificationWorkspace.editSession?.dirty
    ) {
      setPendingStratificationTransition({ kind: 'route', route });
      return;
    }
    if (activeRoute === 'parameters' && parameterToolMode === 'builtin' && route !== 'parameters' && parameterEvidenceDirty) {
      setPendingParameterEvidenceTransition({ kind: 'route', route });
      return;
    }
    if (activeRoute === 'parameters' && parameterToolMode === 'custom' && route !== 'parameters' && parameterWorkspace.customFormulaEditSession?.dirty) {
      setPendingCustomFormulaTransition({ kind: 'route', route });
      return;
    }
    navigateRoute(route);
  }

  function navigateRoute(route: RouteId) {
    setSelection((current) => ({
      ...current,
      activeRoute: route,
      selectedLayerId:
        route === 'stratification' && selectedScheme?.layers.length && !selectedLayer
          ? selectedScheme.layers[0].layerId
          : current.selectedLayerId,
    }));
  }

  useEffect(() => {
    if (pendingStratificationTransition?.kind !== 'route' || stratificationWorkspace.editSession?.dirty) return;
    const route = pendingStratificationTransition.route;
    setPendingStratificationTransition(null);
    navigateRoute(route);
  }, [pendingStratificationTransition, stratificationWorkspace.editSession?.dirty]);

  function selectProjectPoint(pointId: string) {
    if (onPointLifecycle) {
      onPointLifecycle({ kind: 'select', pointId });
      return;
    }
    setSelection((current) => ({
      ...current,
      selectedPointId: pointId,
    }));
    setFlowFeedback(`已选择点位 ${pointId}，右侧点位工具已更新。`);
  }

  async function prepareImportAssistantSource(
    file: File,
    operationId: string,
    sourceAttachment: RawImportDataBlockV2['sourceAttachment'],
  ) {
    try {
      const source = await extractImportAssistantSource(file, operationId);
      if (activeImportOperation.current !== operationId) return;
      setImportAssistantSource(source);
      setImportAssistantAttachment(sourceAttachment);
      setImportAssistantSourceProblem('');
    } catch (error) {
      if (activeImportOperation.current !== operationId) return;
      setImportAssistantSource(null);
      setImportAssistantAttachment(sourceAttachment);
      setImportAssistantSourceProblem(error instanceof Error ? error.message : 'AI 暂时不能读取当前文件。');
    }
  }

  async function markImportAssistantSourceReady(operationId: string) {
    const revision = await getImportBaseWorkspaceRevision?.() ?? 0;
    if (activeImportOperation.current === operationId) setImportAssistantBaseRevision(revision);
  }

  async function handleImportFile(file: File | null, selectedExcelSheet?: string) {
    if (!file) {
      return;
    }

    const operationId = globalThis.crypto.randomUUID();
    setImportPageRestarted(false);
    setSinglePointTargetProblem(null);
    activeImportOperation.current = operationId;
    setExcelParsing(false);
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    setImportFocusField(null);
    setImportAssistantSource(null);
    setImportAssistantAttachment(null);
    setImportAssistantBaseRevision(null);
    setImportAssistantSourceProblem('');
    setImportDockMode('tools');

    if (lowerName.endsWith('.xls')) {
      const errorDraft = createImportErrorDraft(flowCase, fileName, '旧版 .xls 暂不能可靠解析，请另存为 .xlsx 后重新上传。', { sourceMode: 'uploaded-excel', fileType: 'Excel', eventId: 'DI-E02', title: '旧版 Excel 格式不支持', action: '在 Excel 中另存为 .xlsx 后重新上传。', evidence: fileName });
      setSinglePointTargetProblem(errorDraft.problems[0] ?? null);
      setFlowFeedback('旧版 .xls 暂不能解析，请另存为 .xlsx。');
      return;
    }

    if (lowerName.endsWith('.xlsx')) {
      setExcelParsing(true);
      try {
        const baseWorkspaceRevision = await getImportBaseWorkspaceRevision?.() ?? 0;
        if (activeImportOperation.current !== operationId) return;
        const sourceAttachment = await createSourceAttachment(file);
        if (activeImportOperation.current !== operationId) return;
        await prepareImportAssistantSource(file, operationId, sourceAttachment);
        if (activeImportOperation.current !== operationId) return;
        const parsed = await parseCptuExcelWorkbook(file, selectedExcelSheet);
        if (activeImportOperation.current !== operationId) return;
        if (parsed.kind === 'sheet-selection-required') {
          setPendingExcelSheetSelection({ file, candidates: parsed.candidates });
          setFlowFeedback(`工作簿识别到 ${parsed.candidates.length} 个 CPT/CPTU 数据表，请选择要导入的 sheet。`);
          await markImportAssistantSourceReady(operationId);
          return;
        }
        setPendingExcelSheetSelection(null);
        const parsedImport = await parseCptuExcelImportDraft(flowCase, file, parsed, {
          allowAnyPoint: importDraft.sourceMode === 'project-empty',
          operationId,
          baseWorkspaceRevision,
          sourceAttachment,
        });
        await acceptParsedImport(parsedImport, fileName);
        await markImportAssistantSourceReady(operationId);
      } catch (error) {
        if (activeImportOperation.current !== operationId) return;
        const message = error instanceof Error ? error.message : 'Excel 解析失败。';
        const errorDraft = createImportErrorDraft(flowCase, fileName, message, { sourceMode: 'uploaded-excel', fileType: 'Excel', eventId: 'DI-E03', title: 'Excel 无法解析', action: '确认工作簿未损坏且包含 CPT/CPTU 数据表后重新上传。', evidence: fileName });
        setSinglePointTargetProblem(errorDraft.problems[0] ?? null);
        setFlowFeedback(`Excel 导入存在问题：${message}`);
        setImportDockMode('assistant');
        await markImportAssistantSourceReady(operationId);
      } finally {
        if (activeImportOperation.current === operationId) setExcelParsing(false);
      }
      return;
    }

    if (!lowerName.endsWith('.csv')) {
      const errorDraft = createImportErrorDraft(flowCase, fileName, '当前支持 CSV 和 .xlsx 文件，请重新选择受支持的数据文件。', {
          fileType: '不支持的文件',
          eventId: 'DI-E02',
          title: '文件类型暂不能解析',
          action: '重新选择 CSV 或 .xlsx，或下载模板后重新整理文件。',
          evidence: fileName,
        });
      setSinglePointTargetProblem(errorDraft.problems[0] ?? null);
      setFlowFeedback('文件类型暂不能解析，请上传 CSV 或 .xlsx。');
      return;
    }

    try {
      const baseWorkspaceRevision = await getImportBaseWorkspaceRevision?.() ?? 0;
      if (activeImportOperation.current !== operationId) return;
      const [text, sourceAttachment] = await Promise.all([file.text(), createSourceAttachment(file)]);
      if (activeImportOperation.current !== operationId) return;
      await prepareImportAssistantSource(file, operationId, sourceAttachment);
      if (activeImportOperation.current !== operationId) return;
      const parsedImport = await parseCptuCsvImportDraft(flowCase, fileName, text, {
        allowAnyPoint: importDraft.sourceMode === 'project-empty',
        operationId,
        baseWorkspaceRevision,
        sourceAttachment,
      });
      await acceptParsedImport(parsedImport, fileName);
      await markImportAssistantSourceReady(operationId);
    } catch (error) {
      if (activeImportOperation.current !== operationId) return;
      const message = error instanceof Error ? error.message : 'CSV 解析失败。';
      const errorDraft = createImportErrorDraft(flowCase, fileName, message, {
          eventId: 'DI-E04',
          title: 'CSV 无法解析',
          action: '重新上传，或下载模板后重新整理文件。',
          evidence: fileName,
        });
      setSinglePointTargetProblem(errorDraft.problems[0] ?? null);
      setFlowFeedback(`导入草稿存在问题：${message}`);
      setImportDockMode('assistant');
      await markImportAssistantSourceReady(operationId);
    }
  }

  async function acceptParsedImport(parsedImport: { draft: ImportDraft; pipeline: CsvImportPipelineV2 }, fileName: string) {
    const { draft, pipeline } = parsedImport;
    const acceptance = acceptImportOperationResult(pipeline, { activeOperationId: activeImportOperation.current });
    if (!acceptance.accepted) return false;
    setImportPageRestarted(false);
    if (importPipelineContext?.allowAnyPoint && pipeline.pointPlan.detectedPoints.some((point) => isReservedPointName(point.pointName))) {
      setPendingPointIdentityImport({ parsedImport, fileName });
      setPointIdentityDraft('');
      setPointIdentityProblem('');
      setPointIdentityDialogOpen(true);
      return true;
    }
    const canCheckDraft = isImportDraftCheckable(draft);
    if (onImportPipelineReady) {
      const accepted = await onImportPipelineReady(pipeline, draft);
      if (!accepted) return false;
    } else {
      setImportDraft(draft);
    }
    setSelectedMappingField('WaterDepthM');
    setSelection((current) => ({
      ...current,
      selectedProjectId: flowCase.project.projectId,
      selectedPointId: hasPointDecisionProblem(draft) ? current.selectedPointId : draft.pointName,
      selectedImportBatchId: pipeline.batchId,
      selectedCheckIssueId: 'check-water-depth-source',
    }));
    setFlowFeedback(canCheckDraft
      ? `导入草稿已生成：${fileName} / ${draft.rows.length} 行，可用于数据检查。`
      : `导入草稿存在问题：${draft.problems.find((problem) => problem.severity === 'issue')?.title ?? draft.message}。`);
    return true;
  }

  function restartImportPage() {
    activeImportOperation.current = globalThis.crypto.randomUUID();
    setImportPageRestarted(true);
    setExcelParsing(false);
    setPendingExcelSheetSelection(null);
    setPendingPointIdentityImport(null);
    setPointIdentityDialogOpen(false);
    setPointIdentityDraft('');
    setPointIdentityProblem('');
    setPointIdentitySaveFailed(false);
    setPointIdentitySubmitting(false);
    setImportAssistantSource(null);
    setImportAssistantAttachment(null);
    setImportAssistantBaseRevision(null);
    setImportAssistantSourceProblem('');
    setImportAssistantDraftPending(false);
    setImportDockMode('tools');
    setSelectedImportPointKey(null);
    setSinglePointTargetProblem(null);
    setPointPlanFeedback('');
    setPointPlanStale(false);
    setImportFocusField(null);
    void setFlowFeedback('本页已清空。已保存的上一版来源仍保留；上传并确认新文件后才会替换当前版本。');
  }

  async function confirmAssistantImportPipeline(pipeline: CsvImportPipelineV2) {
    if (
      !importAssistantSource
      || pipeline.operationId !== importAssistantSource.operationId
      || pipeline.sourceFingerprint !== importAssistantSource.sourceFingerprint
    ) return false;
    activeImportOperation.current = pipeline.operationId;
    const now = new Date().toISOString();
    const confirmedPipeline: CsvImportPipelineV2 = {
      ...pipeline,
      sourceValueOverrides: pipeline.sourceValueOverrides.map((override) => ({
        ...override,
        confirmedAt: now,
      })),
    };
    const draft: ImportDraft = {
      ...projectPipelineToLegacyDraft(confirmedPipeline, {
        currentPointName: flowCase.point.pointName,
        defaultWaterDepthM: flowCase.point.waterDepthM,
        defaultFinalDepthM: flowCase.point.finalDepthM,
      }),
      version: createDraftVersion(),
      generatedAt: now,
    };
    const accepted = await acceptParsedImport({ draft, pipeline: confirmedPipeline }, confirmedPipeline.fileName);
    if (accepted) {
      setImportDockMode('tools');
      setImportAssistantDraftPending(false);
      setSinglePointTargetProblem(null);
    }
    return accepted;
  }

  function createJtsNumericCheckIssues(
    invalidRows: JtsInvalidMeasuredRow[],
    targetDraft: ImportDraft,
    checkDraft: ImportDraft,
  ): CheckIssue[] {
    if (!invalidRows.length) return [];
    const first = invalidRows[0];
    const rowsToExpose = invalidRows.length <= 50 ? invalidRows : [first];
    return rowsToExpose.map((invalidRow, index) => {
      const rowIndex = checkDraft.sourceRowIds?.findIndex((sourceRowId) => sourceRowId === invalidRow.sourceRowId) ?? -1;
      const fieldName = invalidRow.reason === 'missing-u2' ? 'u2' : invalidRow.reason === 'invalid-qt' ? 'qc / u2' : 'qc';
      return {
        issueId: index === 0 ? 'check-jts-numeric-domain' : `check-jts-numeric-domain:${invalidRow.sourceRowId}`,
        title: 'JTS 计算输入存在无效值',
        severity: 'blocking',
        route: 'check',
        source: targetDraft.fileName,
        detail: invalidRows.length <= 50
          ? `该测点不能形成有效的 qt 或饱和重度；位置 ${invalidRow.depthM.toFixed(2)} m。`
          : `${invalidRows.length} 行不能形成有效的 qt 或饱和重度；首个位置 ${first.depthM.toFixed(2)} m。`,
        nextAction: invalidRows.length <= 50
          ? '删除这个测点、手动修正数值，或保留原值并停止后续分类。'
          : '问题范围较大，请返回导入页核对字段、单位或重新上传文件。',
        fieldName,
        depthFromM: invalidRow.depthM,
        depthToM: invalidRow.depthM,
        rowIndexFrom: rowIndex >= 0 ? rowIndex + 1 : undefined,
        rowIndexTo: rowIndex >= 0 ? rowIndex + 1 : undefined,
        sourceRowId: invalidRow.sourceRowId,
        workflowImpact: '修复后才能进入地层分层',
        evidenceScope: 'single-row',
        evidenceGroupKey: `jts-numeric-domain:${invalidRow.reason}`,
      } satisfies CheckIssue;
    });
  }

  function augmentPreparationCheckIssues(nextIssues: CheckIssue[], targetDraft: ImportDraft, checkDraft: ImportDraft) {
    if (nextIssues.some((issue) => ['check-not-run', 'check-import-stale', 'check-import-draft'].includes(issue.issueId))) return nextIssues;
    const point = activeWorkspacePoint;
    if (!point) return nextIssues;
    if (workspaceProject?.mode === 'demo') return nextIssues;
    const profile = workspaceProject?.probeProfiles.find((candidate) => candidate.revisionId === point.probeContext.activeProfileRevisionId) ?? null;
    if (!profile || !point.probeContext.confirmedAt) {
      nextIssues.unshift({ issueId: 'check-probe-context', title: '探头规格尚未确认', severity: 'blocking', route: 'project', source: point.pointName, detail: 'JTS 修正与后续分类需要已确认的探头面积和有效面积比。', nextAction: '返回点位指南，使用推荐探头或打开高级设置。', fieldName: 'ProbeProfile', workflowImpact: '需要先确认工程上下文' });
      return nextIssues;
    }
    if (!point.waterContext.confirmedAt || ['unknown', 'partial'].includes(point.waterContext.channelState)) {
      nextIssues.unshift({ issueId: 'check-water-context', title: '水深与孔压基准尚未确认', severity: 'blocking', route: 'project', source: point.pointName, detail: '需要确认文件是否包含 u2；完整 CPTU 还需要水深与孔压基准。', nextAction: '返回导入指南确认水与孔压上下文。', fieldName: 'WaterContext', workflowImpact: '需要先确认工程上下文' });
      return nextIssues;
    }
    const context = point.waterContext.channelState === 'present'
      ? { route: 'full_cptu' as const, effectiveAreaRatio: profile.effectiveAreaRatio, waterDepthM: point.waterContext.waterDepthM as number, u2HydrostaticDatum: point.waterContext.u2HydrostaticDatum, testZeroDatum: point.waterContext.testZeroDatum, boreholeBottomDepthM: point.waterContext.boreholeBottomDepthM, waterUnitWeightKnM3: point.waterContext.waterUnitWeightKnM3 }
      : { route: 'approximate_cpt' as const, effectiveAreaRatio: profile.effectiveAreaRatio, waterUnitWeightKnM3: point.waterContext.waterUnitWeightKnM3 };
    const measuredRows = getJtsMeasuredRowsFromGovernedRows(point, governedInputRows ?? []);
    const inspection = inspectJtsNumericDomain(measuredRows, context);
    if (!inspection.invalidRows.length) return nextIssues;
    nextIssues.unshift(...createJtsNumericCheckIssues(inspection.invalidRows, targetDraft, checkDraft));
    return nextIssues;
  }

  function buildDataCheckRecord(
    targetFlowCase: SyntheticFlowCase,
    targetDraft: ImportDraft,
    checkDraft: ImportDraft,
    input = checkInputDependency,
  ) {
    const nextRunId = `CHECK-${flowCase.seed}-${String(Date.now() % 1000000).padStart(6, '0')}`;
    const nextIssues = getImportDraftCheckIssues(targetFlowCase, checkDraft, nextRunId, targetDraft.version);
    const enforcePreparation = workspaceProject?.mode !== 'demo';
    if (enforcePreparation && activeWorkspacePoint && (!activeProbeProfile || !activeWorkspacePoint.probeContext.confirmedAt)) {
      nextIssues.unshift({
        issueId: 'check-probe-context',
        title: '探头规格尚未确认',
        severity: 'blocking',
        route: 'project',
        source: activeWorkspacePoint.pointName,
        detail: 'JTS 修正与后续分类需要已确认的探头面积和有效面积比。',
        nextAction: '返回点位指南，使用推荐探头或打开高级设置。',
        fieldName: 'ProbeProfile',
        workflowImpact: '需要先确认工程上下文',
      });
    }
    if (enforcePreparation && activeWorkspacePoint && (!activeWorkspacePoint.waterContext.confirmedAt || ['unknown', 'partial'].includes(activeWorkspacePoint.waterContext.channelState))) {
      nextIssues.unshift({
        issueId: 'check-water-context',
        title: '水深与孔压基准尚未确认',
        severity: 'blocking',
        route: 'project',
        source: activeWorkspacePoint.pointName,
        detail: '需要确认文件是否包含 u2；完整 CPTU 还需要水深与孔压基准。',
        nextAction: '返回导入指南确认水与孔压上下文。',
        fieldName: 'WaterContext',
        workflowImpact: '需要先确认工程上下文',
      });
    }
    if (enforcePreparation && jtsSeriesContext && jtsMeasuredRows.length) {
      const numericInspection = inspectJtsNumericDomain(jtsMeasuredRows, jtsSeriesContext);
      if (numericInspection.invalidRows.length) {
        nextIssues.unshift(...createJtsNumericCheckIssues(numericInspection.invalidRows, targetDraft, checkDraft));
      }
    }
    const firstIssue =
      nextIssues.find((issue) => issue.severity === 'blocking') ??
      nextIssues.find((issue) => issue.severity === 'warning') ??
      nextIssues[0];
    const counts = getIssueCounts(nextIssues);
    const record: CheckRunRecord = {
      runId: nextRunId,
      draftVersion: targetDraft.version,
      createdAt: new Date().toISOString(),
      sourceFile: targetDraft.fileName,
      pointName: targetDraft.pointName,
      counts: {
        issue: counts.blocking,
        notice: counts.warning,
        passed: counts.passed,
      },
      conclusion: counts.blocking ? '存在问题' : '无问题',
      issueIds: nextIssues.filter((issue) => issue.severity !== 'passed').map((issue) => issue.issueId),
      input: input ? structuredClone(input) : undefined,
    };
    return { record, firstIssue, counts };
  }

  async function runDataCheck() {
    if (!isImportDraftCheckable(importDraft) || activePointNeedsIdentity) {
      if (activePointNeedsIdentity) {
        setPointIdentityDraft('');
        setPointIdentityProblem('请先输入真实点位名称。');
        setPointIdentityDialogOpen(true);
        return false;
      }
      const firstIssue = importDraft.problems.find((problem) => problem.severity === 'issue');
      setFlowFeedback(`当前导入草稿存在问题：${firstIssue?.title ?? importDraft.message}，需要先处理后再用于数据检查。`);
      return false;
    }

    const { record: nextRecord, firstIssue, counts } = buildDataCheckRecord(flowCase, importDraft, governedCheckDraft);
    if (onCommitDataCheck) {
      return await onCommitDataCheck(nextRecord);
    }
    await Promise.resolve(onUpdateProject((current) => ({
      ...current,
      checkRunId: nextRecord.runId,
      checkedDraftVersion: importDraft.version,
      checkRunHistory: [nextRecord, ...current.checkRunHistory].slice(0, 8),
      selection: {
        ...current.selection,
        activeRoute: 'check',
        selectedCheckIssueId: firstIssue?.issueId ?? current.selection.selectedCheckIssueId,
      },
      flowFeedback: counts.blocking
        ? `数据检查已完成，发现 ${counts.blocking} 项问题。`
        : `数据检查已完成，${counts.warning} 项提示保留。`,
    })));
    if (onSetActiveRoute) onSetActiveRoute('check');
    else setSelection((current) => ({ ...current, activeRoute: 'check' }));
    return true;
  }

  async function confirmPointIdentityAndCheck() {
    const pointName = pointIdentityDraft.trim().replace(/\s+/g, ' ');
    if (!pointName || isReservedPointName(pointName)) {
      setPointIdentityProblem('请输入真实点位名称，不能使用“待导入点位”。');
      return;
    }
    const duplicate = importPipelineContext?.existingPoints?.find((point) =>
      !activePointNeedsIdentity
      && [point.pointName, ...(point.aliases ?? [])].some((identity) => identity.trim().toLocaleLowerCase() === pointName.toLocaleLowerCase()),
    );
    if (duplicate) {
      setPointIdentityProblem(`项目中已存在点位 ${duplicate.pointName}，请使用其他名称。`);
      return;
    }
    setPointIdentityProblem('');
    setPointIdentitySaveFailed(false);
    setPointIdentitySubmitting(true);

    if (pendingPointIdentityImport) {
      if (!onImportPipelineReady || !importPipelineContext) {
        setPointIdentityProblem('当前项目暂时不能提交点位，请重新打开项目后重试。');
        setPointIdentitySubmitting(false);
        return;
      }
      const context: PipelineContext = {
        ...importPipelineContext,
        currentPointName: pointName,
        allowAnyPoint: true,
      };
      const attributed = setPointAttributionDecision(
        pendingPointIdentityImport.parsedImport.pipeline,
        { source: 'constant-name', pointName },
        context,
      );
      const detectedPoint = attributed.pointPlan.detectedPoints[0];
      const planned = detectedPoint
        ? setPointTargetDecision(attributed, detectedPoint.pointKey, 'create-point', { proposedPointName: pointName }, context)
        : attributed;
      const generatedAt = new Date().toISOString();
      const confirmedDraft: ImportDraft = {
        ...projectPipelineToLegacyDraft(planned, {
          currentPointName: pointName,
          defaultWaterDepthM: context.defaultWaterDepthM,
          defaultFinalDepthM: context.defaultFinalDepthM,
        }),
        pointName,
        pointDecision: 'new-point',
        version: createDraftVersion(),
        generatedAt,
      };
      if (!isImportDraftCheckable(confirmedDraft) || !planned.readiness.canRunCheck) {
        setPointIdentityProblem(planned.readiness.reasons[0]?.message ?? '点位已填写，但导入草稿仍有需要处理的问题。');
        setPointIdentitySubmitting(false);
        return;
      }
      const accepted = await onImportPipelineReady(planned, confirmedDraft);
      if (!accepted) {
        setPointIdentityProblem('未保存。文件和点位名称已保留，本次未创建点位。');
        setPointIdentitySaveFailed(true);
        setPointIdentitySubmitting(false);
        return;
      }
      setPendingPointIdentityImport(null);
      setPointIdentityDialogOpen(false);
      setPointIdentitySubmitting(false);
      if (onSetActiveRoute) onSetActiveRoute('project');
      return;
    }

    if (activeWorkspacePoint && activePointNeedsIdentity && onPointLifecycle) {
      const renamed = onPointLifecycle({ kind: 'rename', pointId: activeWorkspacePoint.pointId, pointName });
      if (!renamed.ok) {
        setPointIdentityProblem(renamed.problem);
        setPointIdentitySubmitting(false);
        return;
      }
      if (checkArtifactStatus === 'current' || checkArtifactStatus === 'problem') {
        setPointIdentityDialogOpen(false);
        setPointIdentitySubmitting(false);
        if (onSetActiveRoute) onSetActiveRoute('check');
        return;
      }
      setPointIdentityDialogOpen(false);
      setPointIdentitySubmitting(false);
      if (onSetActiveRoute) onSetActiveRoute('import');
      else setSelection((current) => ({ ...current, activeRoute: 'import' }));
      return;
    }

    setPointIdentityProblem('当前没有可确认的点位草稿，请重新选择文件。');
    setPointIdentitySubmitting(false);
  }

  function downloadImportTemplate(kind: TemplateKind, format: 'csv' | 'xlsx' = 'csv') {
    const content = format === 'xlsx' ? createMinimalTemplateXlsx(kind) : createMinimalTemplateCsv(kind);
    const blob = new Blob([content], { type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jts-cpt-minimal-${kind === 'blank' ? 'template' : 'example'}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFlowFeedback(`${format === 'xlsx' ? 'Excel' : 'CSV'} ${kind === 'blank' ? '空模板' : '示例模板'}已生成；点名、水深和探头由当前点位上下文提供。`);
  }

  async function copyImportTemplateHeader() {
    const header = STANDARD_IMPORT_TEMPLATE_FIELDS.join(',');
    try {
      await navigator.clipboard.writeText(header);
      setFlowFeedback('标准表头已复制，可粘贴到 Excel 或 CSV 第一行。');
    } catch {
      setFlowFeedback(`标准表头：${header}`);
    }
  }

  async function resolvePointDecision(decision: 'new-point' | 'replace-current') {
    if (importPipeline && importPipelineContext && onGeneratePointDrafts && getImportBaseWorkspaceRevision) {
      const detectedPoint = importPipeline.pointPlan.detectedPoints[0];
      const currentPoint = importPipelineContext.existingPoints?.find((pointValue) =>
        normalizePointDisplayKey(pointValue.pointName) === normalizePointDisplayKey(importPipelineContext.currentPointName),
      );
      if (detectedPoint) {
        setImportActionPending(true);
        setPendingPointActivationName(detectedPoint.pointName);
        let accepted = false;
        try {
          const action = decision === 'new-point' ? 'create-point' as const : 'replace-active-draft' as const;
          const planned = setPointTargetDecision(importPipeline, detectedPoint.pointKey, action, {
            targetPointId: action === 'replace-active-draft' ? currentPoint?.pointId : undefined,
            proposedPointName: action === 'create-point' ? detectedPoint.pointName : undefined,
          }, importPipelineContext);
          const target = planned.pointPlan.targetDecisions?.find((candidate) => candidate.detectedPointKey === detectedPoint.pointKey);
          if (target?.state !== 'confirmed' || !planned.readiness.canGenerateDrafts) {
            setPointPlanFeedback(pointDecisionReason(target?.reasonCode));
            setSinglePointTargetProblem({
              problemId: 'point-existing-conflict',
              eventId: 'DI-E10',
              severity: 'issue',
              title: target?.reasonCode === 'POINT-NAME-CONFLICT' ? '点位已存在' : '点位目标尚未确认',
              message: target?.reasonCode === 'POINT-NAME-CONFLICT'
                ? `项目中已经存在点位 ${detectedPoint.pointName}，不能作为新点位静默覆盖。`
                : pointDecisionReason(target?.reasonCode),
              action: '选择替换已有点位草稿、修改点位名称或取消。',
              fieldName: 'PointName',
              detectedPointKey: detectedPoint.pointKey,
              evidence: detectedPoint.pointName,
            });
            return;
          }
          accepted = await commitPipelineEdit(planned, '点位目标已确认，正在生成点位草稿。');
          if (!accepted) return;
          setSinglePointTargetProblem(null);
          setPointPlanFeedback('点位草稿已生成，可运行数据检查。');
          return;
        } finally {
          if (!accepted) {
            setImportActionPending(false);
            setPendingPointActivationName(null);
          }
        }
      }
    }
    setImportDraft((current) => {
      const remainingProblems = current.problems.filter((problem) => !['DI-E10', 'DI-E11'].includes(problem.eventId));
      const resolvedNotice: ImportDraftProblem = {
        problemId: `point-decision-${decision}`,
        eventId: 'DI-E10',
        severity: 'notice',
        title: decision === 'new-point' ? '已作为新点位草稿' : '已替换当前点位草稿',
        message:
          decision === 'new-point'
            ? `${current.pointName} 已作为浏览器内新点位草稿继续预览。`
            : `${current.pointName} 已用于当前点位草稿预览。`,
        action: '可重新运行数据检查。',
        fieldName: 'PointName',
      };
      const nextProblems = [...remainingProblems, resolvedNotice];
      return {
        ...current,
        status: nextProblems.some((problem) => problem.severity === 'issue') ? 'error' : 'ready',
        message: decision === 'new-point' ? '点位归属已确认，可用于数据检查。' : '当前点位草稿已替换，可用于数据检查。',
        problems: nextProblems,
        pointDecision: decision,
        version: createDraftVersion(),
      };
    });
    setSelection((current) => ({
      ...current,
      selectedPointId: importDraft.pointName,
    }));
    setFlowFeedback(decision === 'new-point' ? '已作为新点位草稿继续预览。' : '已替换当前点位草稿。');
  }

  function cancelImportDraft() {
    const fallbackDraft = createBuiltInImportDraft(flowCase);
    setImportDraft({
      ...fallbackDraft,
      problems: [
        {
          problemId: 'import-cancelled',
          eventId: 'DI-E10',
          severity: 'notice',
          title: '已取消上一份导入草稿',
          message: '页面已回到内置随机数据，可重新上传 CSV。',
          action: '重新选择文件或下载模板。',
        },
      ],
    });
    setSelection((current) => ({
      ...current,
      selectedProjectId: flowCase.project.projectId,
      selectedPointId: flowCase.point.pointName,
      selectedImportBatchId: flowCase.importBatch.batchId,
    }));
    setFlowFeedback('已取消上一份导入草稿，可重新上传。');
  }

  function returnToImportFromIssue(issue: CheckIssue | null) {
    const fieldName = issue?.fieldName?.split(/[ /]+/)[0] ?? 'WaterDepthM';
    const ownerRoute: RouteId = issue?.route === 'project' ? 'project' : 'import';
    const ownerLabel = ownerRoute === 'project' ? '项目/点位数据' : '数据导入';
    const sourceDisplayRow = issue?.sourceRowId
      ? importPipeline?.normalizedRows.find((row) => row.sourceRowId === issue.sourceRowId)?.displayRowNumber
      : undefined;
    const displayRow = sourceDisplayRow ?? issue?.rowIndexFrom ?? null;
    void onUpdateProject((current) => ({
      ...current,
      selectedMappingField: fieldName,
      importFocusField: fieldName,
      importFocusSourceRowId: issue?.sourceRowId ?? null,
      importFocusDisplayRow: displayRow,
      selection: {
        ...current.selection,
        activeRoute: ownerRoute,
        selectedCheckIssueId: issue?.issueId ?? current.selection.selectedCheckIssueId,
      },
      flowFeedback: displayRow
        ? `已返回${ownerLabel}，定位到 ${fieldName} 第 ${displayRow} 行。`
        : `已返回${ownerLabel}，并定位到 ${fieldName}。`,
    }));
  }

  function updateStratificationWorkspace(
    workspace: StratificationWorkspaceV2,
    feedback: string,
    selectionPatch?: Partial<WorkflowSelectionState>,
  ) {
    setStratificationCommandProblem('');
    return onUpdateProject((current) => ({
      ...current,
      stratificationWorkspace: workspace,
      selection: { ...current.selection, activeRoute: 'stratification', ...selectionPatch },
      flowFeedback: feedback,
    }));
  }

  function reportStratificationProblem(problem: string) {
    setStratificationCommandProblem(problem);
    void setFlowFeedback(problem);
  }

  async function rerunCheckAndJtsClassification() {
    if (jtsRecoveryInFlightRef.current) return;
    jtsRecoveryInFlightRef.current = true;
    try {
      setJtsAutoRecovery((current) => current ? { ...current, phase: 'awaiting-check', message: '治理修订已生成，正在重新运行数据检查…' } : null);
      const checked = await runDataCheck();
      if (!checked) {
        setJtsAutoRecovery((current) => current ? { ...current, phase: 'failed', message: '数据检查没有保存，请重试或查看数据检查。' } : null);
        return;
      }
      if (onSetActiveRoute) onSetActiveRoute('stratification');
      else navigateRoute('stratification');
      const recoveryMethodId = activeJtsClassificationRun ? classificationMethodId(activeJtsClassificationRun) : guidedClassificationMethodId;
      const recoveryMethodLabel = classificationMethodMeta(recoveryMethodId).label;
      setJtsAutoRecovery((current) => current ? { ...current, phase: 'running-classification', message: `检查已保存，正在重新运行 ${recoveryMethodLabel}…` } : null);
      const result = onJtsClassification?.({ kind: 'run', methodId: recoveryMethodId });
      if (!result?.ok) {
        const problem = result && !result.ok ? result.problem : '当前工作区未启用持久化分类。';
        setJtsRecoveryIssue(diagnoseJtsClassificationRecovery({ ...jtsRecoveryDiagnosticInput, fallbackProblem: problem }));
        setJtsAutoRecovery((current) => current ? { ...current, phase: 'failed', message: problem } : null);
        return;
      }
      setJtsRecoveryIssue(null);
      setStratificationCommandProblem('');
      setJtsAutoRecovery((current) => current ? { ...current, phase: 'completed', message: `自动处理完成，${recoveryMethodLabel} 已重新运行。` } : null);
    } finally {
      jtsRecoveryInFlightRef.current = false;
    }
  }

  function executeJtsRecoveryOption(optionId: JtsRecoveryOptionId) {
    if (optionId === 'open-check') {
      navigateRoute('check');
      void setFlowFeedback('已打开数据检查，可查看原始行、平滑证据和治理历史。');
      return;
    }
    if (optionId === 'open-point-context') {
      navigateRoute('project');
      void setFlowFeedback('已打开当前点位配置，请确认探头、水深和压力基准。');
      return;
    }
    if (optionId === 'rerun-check') {
      setJtsAutoRecovery({ optionId, phase: 'awaiting-check', baselineGovernanceKey: currentGovernanceKey, baselineCheckRunId: checkRunId, message: '正在使用当前治理修订重新运行数据检查…' });
      void rerunCheckAndJtsClassification();
      return;
    }
    if (!onDataGovernance || (optionId === 'exclude-invalid-rows' && !jtsRecoveryIssue)) {
      setJtsAutoRecovery({ optionId, phase: 'failed', baselineGovernanceKey: currentGovernanceKey, baselineCheckRunId: checkRunId, message: '当前工作区不能创建数据治理修订。' });
      return;
    }
    const result = optionId === 'standard-smoothing'
      ? onDataGovernance({ kind: 'run-smoothing', settings: { preset: 'standard', depthWindowM: SMOOTHING_PRESETS.standard } })
      : onDataGovernance({
          kind: 'review',
          command: {
            kind: 'exclude-rows',
            sourceRowIds: (jtsRecoveryIssue as JtsClassificationRecoveryIssue).invalidRows.map((row) => row.sourceRowId),
            reason: `JTS 分类就地处理：排除 ${(jtsRecoveryIssue as JtsClassificationRecoveryIssue).invalidRows.length} 行明确进入无效数值域的测量行。`,
          },
        });
    if (!result.ok) {
      setJtsAutoRecovery({ optionId, phase: 'failed', baselineGovernanceKey: currentGovernanceKey, baselineCheckRunId: checkRunId, message: result.problem });
      return;
    }
    setJtsAutoRecovery({
      optionId,
      phase: 'awaiting-governance',
      baselineGovernanceKey: currentGovernanceKey,
      baselineCheckRunId: checkRunId,
      message: optionId === 'standard-smoothing' ? '正在生成 0.50 m 标准平滑修订…' : '正在生成无效行排除修订…',
    });
  }

  function createBaseScheme() {
    if (!currentStratificationInput || !governedCheckDraft.rows.length) {
      reportStratificationProblem('当前点位还没有可用于分层的有效检查结果。');
      return;
    }
    const depths = governedCheckDraft.rows.map((row) => row.depthM);
    const created = createBaseStratificationScheme(
      stratificationWorkspace,
      currentStratificationInput,
      Math.min(...depths),
      Math.max(...depths),
      `分层方案 ${stratificationWorkspace.schemes.length + 1}`,
    );
    if (!created.ok) {
      reportStratificationProblem(created.problem);
      return;
    }
    void updateStratificationWorkspace(created.workspace, '已创建一层基础方案，可添加边界并编辑土层。', {
      selectedSchemeId: created.scheme.schemeId,
      selectedLayerId: created.scheme.layers[0].layerId,
      selectedBoundaryId: '',
    });
  }

  function executeStratificationCommand(command: StratificationCommand): StratificationSchemeV2 | null {
    if (!activeStratificationScheme) {
      reportStratificationProblem('请先创建或选择分层方案。');
      return null;
    }
    let editableWorkspace = stratificationWorkspace;
    if (editableWorkspace.editSession?.schemeId !== activeStratificationScheme.schemeId) {
      const begun = beginStratificationEdit(editableWorkspace, activeStratificationScheme.schemeId, currentStratificationInput);
      if (!begun.ok) {
        reportStratificationProblem(begun.problem);
        return null;
      }
      editableWorkspace = begun.workspace;
    }
    const applied = applyStratificationCommand(editableWorkspace, command, undefined, governedCheckDraft.rows);
    if (!applied.ok) {
      reportStratificationProblem(applied.problem);
      return null;
    }
    const nextScheme = getActiveStratificationScheme(applied.workspace);
    const selectedLayerId = command.kind === 'add-boundary'
      ? nextScheme?.layers.find((layer) => layer.depthFromM === Number(command.depthM.toFixed(3)))?.layerId ?? selection.selectedLayerId
      : command.kind === 'split-layer'
        ? nextScheme?.layers.find((layer) => layer.depthFromM > (activeStratificationScheme.layers.find((candidate) => candidate.layerId === command.layerId)?.depthFromM ?? Number.POSITIVE_INFINITY)
          && layer.depthToM <= (activeStratificationScheme.layers.find((candidate) => candidate.layerId === command.layerId)?.depthToM ?? Number.NEGATIVE_INFINITY))?.layerId ?? selection.selectedLayerId
        : command.kind === 'restore-merged-layer'
          ? nextScheme?.layers.find((layer) => layer.layerId === command.layerId)?.layerId
            ?? nextScheme?.layers.find((layer) => Math.abs(layer.depthFromM - (activeStratificationScheme.layers.find((candidate) => candidate.layerId === command.layerId)?.depthFromM ?? Number.NaN)) < 0.001)?.layerId
            ?? selection.selectedLayerId
        : command.kind === 'apply-thin-layer-plan'
          ? nextScheme?.layers.some((layer) => layer.layerId === selection.selectedLayerId)
            ? selection.selectedLayerId
            : nextScheme?.layers.find((layer) => stratificationLayerNeedsDecision(layer))?.layerId ?? nextScheme?.layers[0]?.layerId ?? ''
          : selection.selectedLayerId;
    void updateStratificationWorkspace(applied.workspace, '分层编辑已更新，提交前可继续撤销或调整。', {
      selectedSchemeId: nextScheme?.schemeId ?? selection.selectedSchemeId,
      selectedLayerId,
      selectedBoundaryId: command.kind === 'remove-boundary' || command.kind === 'merge-layer' || command.kind === 'restore-merged-layer' || command.kind === 'apply-thin-layer-plan'
        ? ''
        : command.kind === 'add-boundary'
          ? nextScheme?.boundaries.find((boundary) => Math.abs(boundary.depthM - command.depthM) < 0.001)?.boundaryId ?? ''
        : command.kind === 'move-boundary' || command.kind === 'set-boundary-review' || command.kind === 'set-boundary-major-group-lock'
          ? command.boundaryId
          : selection.selectedBoundaryId,
    });
    return nextScheme ?? null;
  }

  function runStratificationRule(settings: StratificationRuleSettingsV1) {
    if (!currentStratificationInput) {
      reportStratificationProblem('当前点位还没有可用于规则分层的有效检查结果。');
      return;
    }
    const inputRows = buildStratificationRuleInputRows(governedCheckDraft.sourceRowIds, governedCheckDraft.rows);
    if (!inputRows.ok) return reportStratificationProblem(inputRows.problem);
    const commandId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `str-rule-command:${crypto.randomUUID()}`
      : `str-rule-command:${Date.now()}`;
    const prepared = prepareStratificationRuleRun(
      stratificationWorkspace,
      currentStratificationInput,
      inputRows.rows,
      settings,
      commandId,
    );
    if (!prepared.ok) return reportStratificationProblem(prepared.problem);
    const started = startStratificationRuleRun(prepared.workspace, prepared.run.runId);
    if (!started.ok) return reportStratificationProblem(started.problem);
    const completed = completeStratificationRuleRun(started.workspace, started.run.runId);
    if (!completed.ok) return reportStratificationProblem(completed.problem);
    setSelectedRuleCandidateId(completed.run.candidates[0]?.candidateId ?? '');
    void updateStratificationWorkspace(
      completed.workspace,
      completed.run.candidates.length
        ? `已生成 ${completed.run.candidates.length} 条规则候选边界，请在曲线中复核。`
        : '规则运行已完成，当前设置下没有候选边界。',
    );
  }

  function convertRuleRunToScheme() {
    if (!activeStratificationRuleRun || !currentStratificationInput) {
      reportStratificationProblem('没有可用于创建方案的当前规则运行。');
      return;
    }
    const converted = createSchemeFromStratificationRuleRun(
      stratificationWorkspace,
      activeStratificationRuleRun.runId,
      currentStratificationInput,
      `规则分层方案 ${(stratificationWorkspace.schemes.length + 1)}`,
    );
    if (!converted.ok) return reportStratificationProblem(converted.problem);
    setStratificationDockMode('manual');
    setPendingThinLayerGuide(activeStratificationScheme?.schemeId ?? 'none');
    void updateStratificationWorkspace(converted.workspace, '规则候选已转为可编辑方案；请人工复核后再提交。', {
      selectedSchemeId: converted.scheme.schemeId,
      selectedLayerId: converted.scheme.layers[0]?.layerId ?? '',
      selectedBoundaryId: converted.scheme.boundaries[0]?.boundaryId ?? '',
    });
  }

  function runCurrentJtsClassification(requestedMethodId?: ClassificationMethodIdV1) {
    const methodId = typeof requestedMethodId === 'string' && requestedMethodId in CLASSIFICATION_METHODS_V1
      ? requestedMethodId
      : guidedClassificationMethodId;
    setJtsAutoRecovery(null);
    if (currentJtsRecoveryDiagnosis) {
      setJtsRecoveryIssue(currentJtsRecoveryDiagnosis);
      setStratificationCommandProblem('');
      void setFlowFeedback(`${currentJtsRecoveryDiagnosis.title}：${currentJtsRecoveryDiagnosis.summary}`);
      return false;
    }
    if (!onJtsClassification) {
      reportStratificationProblem('当前工作区未启用持久化分类。');
      return false;
    }
    const result = onJtsClassification({ kind: 'run', methodId });
    if (!result.ok) {
      const diagnosis = diagnoseJtsClassificationRecovery({ ...jtsRecoveryDiagnosticInput, fallbackProblem: result.problem });
      setJtsRecoveryIssue(diagnosis);
      if (!diagnosis) reportStratificationProblem(result.problem);
      return false;
    }
    setJtsRecoveryIssue(null);
    setStratificationCommandProblem('');
    return true;
  }

  function convertJtsClassificationToScheme(
    candidateMode: 'stable' | 'all' = 'stable',
    acceptedUnclassifiableRows = 0,
    guided?: {
      pendingUnclassifiableRows?: number;
      unclassifiablePolicy?: 'none' | 'accepted-gap' | 'pending-review';
      boundarySource?: 'jts' | 'rule';
      ruleRunId?: string;
    },
  ) {
    if (!onJtsClassification || !activeJtsClassificationRun) {
      reportStratificationProblem('没有可转换的当前 JTS 分类运行。');
      return false;
    }
    const result = onJtsClassification({
      kind: 'convert-to-scheme',
      runId: activeJtsClassificationRun.runId,
      name: `${classificationMethodMeta(classificationMethodId(activeJtsClassificationRun)).label} 方案 ${stratificationWorkspace.schemes.length + 1}`,
      policy: 'dual-path-with-ic-fallback',
      candidateMode,
      groupingWindowM: candidateMode === 'stable' ? 0.5 : undefined,
      acceptedUnclassifiableRows,
      pendingUnclassifiableRows: guided?.pendingUnclassifiableRows,
      unclassifiablePolicy: guided?.unclassifiablePolicy,
      boundarySource: guided?.boundarySource,
      ruleRunId: guided?.ruleRunId,
    });
    if (!result.ok) {
      reportStratificationProblem(result.problem);
      return false;
    }
    setStratificationCommandProblem('');
    setStratificationDockMode('manual');
    setPendingThinLayerGuide(activeStratificationScheme?.schemeId ?? 'none');
    setHandledJtsDecisionRunId(activeJtsClassificationRun.runId);
    setJtsDecisionDialogRunId(null);
    return true;
  }

  function closeJtsDecisionDialog() {
    if (jtsDecisionDialogRunId) setHandledJtsDecisionRunId(jtsDecisionDialogRunId);
    setJtsDecisionDialogRunId(null);
    setPendingGuidedGeneration(null);
  }

  function guidedRuleRunId() {
    return activeStratificationScheme?.origin?.kind === 'rule-candidate'
      ? activeStratificationScheme.origin.ruleRunId
      : activeStratificationRuleRun?.status === 'completed'
        ? activeStratificationRuleRun.runId
        : undefined;
  }

  function beginGuidedGeneration(choice: 'jts' | 'rule-jts' | 'manual') {
    if (choice === 'manual') {
      setGuidedGenerationOpen(false);
      setStratificationDockMode('manual');
      setStratificationAdvancedToolsOpen(true);
      if (!activeStratificationScheme) createBaseScheme();
      return { ok: true as const };
    }
    const currentRun = activeJtsClassificationRun?.status === 'completed'
      && currentStratificationInput
      && sameStratificationInput(activeJtsClassificationRun.input, currentStratificationInput)
      && classificationMethodId(activeJtsClassificationRun) === guidedClassificationMethodId;
    setPendingGuidedGeneration(choice);
    if (!currentRun && currentJtsRecoveryDiagnosis) {
      setJtsRecoveryIssue(currentJtsRecoveryDiagnosis);
      return { ok: false as const, problem: `${currentJtsRecoveryDiagnosis.title}：${currentJtsRecoveryDiagnosis.summary}` };
    }
    setStratificationAdvancedToolsOpen(false);
    setStratificationDockMode('jts');
    if (!currentRun) {
      const started = runCurrentJtsClassification(guidedClassificationMethodId);
      if (!started) {
        setPendingGuidedGeneration(null);
        return { ok: false as const, problem: `${classificationMethodMeta(guidedClassificationMethodId).label} 未能开始，请处理当前提示后重试。` };
      }
      setGuidedGenerationOpen(false);
      return { ok: true as const };
    }
    if (activeJtsGuidance?.unclassifiableRows) {
      setJtsDecisionDialogRunId(activeJtsClassificationRun.runId);
      setGuidedGenerationOpen(false);
      return { ok: true as const };
    }
    const created = convertJtsClassificationToScheme('stable', 0, {
        unclassifiablePolicy: 'none',
        boundarySource: choice === 'rule-jts' ? 'rule' : 'jts',
        ruleRunId: choice === 'rule-jts' ? guidedRuleRunId() : undefined,
    });
    if (!created) {
      setPendingGuidedGeneration(null);
      return { ok: false as const, problem: '候选生成失败，请检查当前分类依据后重试。' };
    }
    setPendingGuidedGeneration(null);
    setGuidedGenerationOpen(false);
    return { ok: true as const };
  }

  async function confirmGuidedGenerationChoice() {
    if (!guidedGenerationChoice || guidedGenerationInFlightRef.current) return;
    guidedGenerationInFlightRef.current = true;
    setGuidedGenerationRunning(true);
    setGuidedGenerationProblem('');
    if (guidedGenerationChoice !== 'manual') {
      await waitForWorkspaceSaveScheduling();
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 120));
    }
    try {
      const result = beginGuidedGeneration(guidedGenerationChoice);
      if (!result.ok) setGuidedGenerationProblem(result.problem);
    } catch {
      setGuidedGenerationProblem('候选生成失败，原数据未修改。请重新尝试。');
    } finally {
      guidedGenerationInFlightRef.current = false;
      setGuidedGenerationRunning(false);
    }
  }

  function openGuidedGenerationRecovery() {
    if (!guidedGenerationRecoveryOption) return;
    setGuidedGenerationOpen(false);
    if (guidedGenerationRecoveryOption.kind === 'automatic') {
      setRightPanelOpen(true);
      setStratificationAdvancedToolsOpen(true);
      setStratificationDockMode('jts');
    }
    executeJtsRecoveryOption(guidedGenerationRecoveryOption.optionId);
  }

  function openGuidedStratificationIssue(issue: StratificationIssue) {
    focusStratificationIssue(issue, selectLayerId, selectBoundaryId);
    if (issue.layerId) return;
    setRightPanelOpen(true);
    setStratificationDockMode('manual');
    setStratificationAdvancedToolsOpen(true);
  }

  function createGuidedPendingReviewCandidate() {
    if (!activeJtsGuidance) return;
    const useRuleBoundaries = pendingGuidedGeneration === 'rule-jts'
      || activeStratificationScheme?.origin?.kind === 'rule-candidate';
    const created = convertJtsClassificationToScheme('stable', 0, {
      pendingUnclassifiableRows: activeJtsGuidance.unclassifiableRows,
      unclassifiablePolicy: 'pending-review',
      boundarySource: useRuleBoundaries ? 'rule' : 'jts',
      ruleRunId: useRuleBoundaries ? guidedRuleRunId() : undefined,
    });
    if (created) setPendingGuidedGeneration(null);
  }

  function acceptGuidedGapsAndCreateCandidate() {
    if (!activeJtsGuidance) return;
    const useRuleBoundaries = pendingGuidedGeneration === 'rule-jts'
      || activeStratificationScheme?.origin?.kind === 'rule-candidate';
    const created = convertJtsClassificationToScheme('stable', activeJtsGuidance.unclassifiableRows, {
      unclassifiablePolicy: 'accepted-gap',
      boundarySource: useRuleBoundaries ? 'rule' : 'jts',
      ruleRunId: useRuleBoundaries ? guidedRuleRunId() : undefined,
    });
    if (created) setPendingGuidedGeneration(null);
  }

  function showJtsEvidenceDetails() {
    closeJtsDecisionDialog();
    window.requestAnimationFrame(() => document.querySelector('[data-testid="jts-linked-evidence"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }

  function runJtsDecisionSmoothing() {
    closeJtsDecisionDialog();
    executeJtsRecoveryOption('standard-smoothing');
  }

  function commitCurrentStratificationEdit() {
    const committed = commitStratificationEdit(stratificationWorkspace, currentStratificationInput);
    if (!committed.ok) {
      reportStratificationProblem(committed.problem);
      return;
    }
    const pending = pendingStratificationTransition;
    let nextWorkspace = committed.workspace;
    let nextRoute: RouteId = 'stratification';
    if (pending?.kind === 'scheme') {
      const selected = selectStratificationScheme(nextWorkspace, pending.schemeId);
      if (!selected.ok) {
        reportStratificationProblem(selected.problem);
        return;
      }
      nextWorkspace = selected.workspace;
    } else if (pending?.kind === 'route') {
      nextRoute = pending.route;
      if (nextRoute === 'parameters' && getStratificationHandoffGate(nextWorkspace, currentStratificationInput).state === 'deny') nextRoute = 'stratification';
    }
    const nextScheme = getActiveStratificationScheme(nextWorkspace) ?? committed.scheme;
    setPendingStratificationTransition(null);
    void updateStratificationWorkspace(nextWorkspace, pending ? '已从最终预览生成当前分层修订并继续。' : '当前分层方案已提交，可判断是否进入参数解译。', {
      activeRoute: nextRoute,
      selectedSchemeId: nextScheme.schemeId,
      selectedLayerId: nextScheme.layers[0]?.layerId ?? '',
      selectedBoundaryId: nextScheme.boundaries[0]?.boundaryId ?? '',
    });
  }

  function discardCurrentStratificationEdit() {
    setPendingStratificationTransition({ kind: 'discard' });
  }

  function undoCurrentStratificationEdit() {
    const undone = undoStratificationCommand(stratificationWorkspace);
    if (!undone.ok) return reportStratificationProblem(undone.problem);
    void updateStratificationWorkspace(undone.workspace, '已撤销上一步分层编辑。');
  }

  function redoCurrentStratificationEdit() {
    const redone = redoStratificationCommand(stratificationWorkspace);
    if (!redone.ok) return reportStratificationProblem(redone.problem);
    void updateStratificationWorkspace(redone.workspace, '已重做分层编辑。');
  }

  async function rollbackCurrentStratificationGuideStep(): Promise<boolean> {
    const session = stratificationWorkspace.editSession;
    if (!session) {
      reportStratificationProblem('当前没有可返回的分层步骤。');
      return false;
    }
    if (session.staleReason) {
      reportStratificationProblem('上游检查已经变化，请先放弃当前编辑，再基于最新检查创建修订。');
      return false;
    }
    const persistRollback = async (
      workspace: StratificationWorkspaceV2,
      feedback: string,
      selectionPatch?: Partial<WorkflowSelectionState>,
    ) => {
      const accepted = await Promise.resolve(updateStratificationWorkspace(workspace, feedback, selectionPatch));
      if (accepted === false) return false;
      return onWaitForDurability ? onWaitForDurability() : true;
    };
    const structureReviewCount = session.working.layerStructureReviewHistory?.length ?? 0;
    const cleanupCount = session.working.thinLayerCleanupHistory?.length ?? 0;
    const simplificationCount = session.working.layerSimplificationHistory?.length ?? 0;
    let targetIndex = -1;
    for (let index = session.undoStack.length - 1; index >= 0; index -= 1) {
      const snapshot = session.undoStack[index];
      if ((snapshot.layerStructureReviewHistory?.length ?? 0) < structureReviewCount
        || (snapshot.thinLayerCleanupHistory?.length ?? 0) < cleanupCount
        || (snapshot.layerSimplificationHistory?.length ?? 0) < simplificationCount) {
        targetIndex = index;
        break;
      }
    }
    if (targetIndex >= 0) {
      const next = structuredClone(stratificationWorkspace);
      const nextSession = next.editSession!;
      nextSession.working = structuredClone(nextSession.undoStack[targetIndex]);
      nextSession.undoStack = nextSession.undoStack.slice(0, targetIndex);
      nextSession.redoStack = [];
      nextSession.dirty = nextSession.isNew || JSON.stringify(nextSession.working) !== JSON.stringify(nextSession.baseline);
      return persistRollback(next, '已返回整理分层步骤；后续逐层确认已撤销，请重新选择整理方式。');
    }
    if (session.isNew) {
      const discarded = discardStratificationEdit(stratificationWorkspace);
      if (!discarded.ok) {
        reportStratificationProblem(discarded.problem);
        return false;
      }
      return persistRollback(discarded.workspace, '已撤销本次候选，可重新选择分层生成方式。', {
        selectedSchemeId: discarded.workspace.activeSchemeId ?? '',
        selectedLayerId: '',
        selectedBoundaryId: '',
      });
    }
    reportStratificationProblem('当前步骤之前没有可恢复的编辑快照。');
    return false;
  }

  function duplicateCurrentStratificationScheme() {
    if (!activeStratificationScheme || !currentStratificationInput) {
      reportStratificationProblem('没有可复制的方案或最新检查依据。');
      return;
    }
    const duplicated = duplicateStratificationScheme(
      stratificationWorkspace,
      activeStratificationScheme.schemeId,
      currentStratificationInput,
    );
    if (!duplicated.ok) return reportStratificationProblem(duplicated.problem);
    void updateStratificationWorkspace(duplicated.workspace, '已复制为新的工作方案，提交前可继续编辑。', {
      selectedSchemeId: duplicated.scheme.schemeId,
      selectedLayerId: duplicated.scheme.layers[0]?.layerId ?? '',
      selectedBoundaryId: duplicated.scheme.boundaries[0]?.boundaryId ?? '',
    });
  }

  function openNewStratificationSchemeChoice() {
    setGuidedGenerationProblem('');
    setGuidedGenerationRunning(false);
    guidedGenerationInFlightRef.current = false;
    setNewSchemeChoiceOpen(true);
  }

  function startNewStratificationSchemeFromMethod() {
    setNewSchemeChoiceOpen(false);
    setGuidedGenerationChoice(null);
    setStratificationAdvancedToolsOpen(false);
    setGuidedGenerationOpen(true);
  }

  function copyCurrentStratificationSchemeFromChoice() {
    setNewSchemeChoiceOpen(false);
    duplicateCurrentStratificationScheme();
  }

  function renameCurrentStratificationScheme(name: string) {
    if (!activeStratificationScheme) return reportStratificationProblem('请先选择分层方案。');
    const renamed = renameStratificationScheme(stratificationWorkspace, activeStratificationScheme.schemeId, name);
    if (!renamed.ok) return reportStratificationProblem(renamed.problem);
    void updateStratificationWorkspace(renamed.workspace, '方案名称已更新。');
  }

  function deleteCurrentStratificationScheme(replacementSchemeId?: string) {
    if (!activeStratificationScheme) return reportStratificationProblem('请先选择分层方案。');
    const replacement = replacementSchemeId
      ? stratificationWorkspace.schemes.find((scheme) => scheme.schemeId === replacementSchemeId)
      : undefined;
    const deleted = deleteStratificationScheme(
      stratificationWorkspace,
      activeStratificationScheme.schemeId,
      currentStratificationInput,
      replacement?.schemeId,
    );
    if (!deleted.ok) return reportStratificationProblem(deleted.problem);
    const nextScheme = getActiveStratificationScheme(deleted.workspace);
    void updateStratificationWorkspace(deleted.workspace, replacement ? `已删除方案，并将 ${replacement.name} 设为当前工作方案。` : '已删除方案。', {
      selectedSchemeId: nextScheme?.schemeId ?? '',
      selectedLayerId: nextScheme?.layers[0]?.layerId ?? '',
      selectedBoundaryId: nextScheme?.boundaries[0]?.boundaryId ?? '',
    });
  }

  function selectWorkspaceStratificationScheme(scheme: StratificationSchemeV2) {
    if (stratificationWorkspace.editSession?.dirty && stratificationWorkspace.editSession.schemeId !== scheme.schemeId) {
      setPendingStratificationTransition({ kind: 'scheme', schemeId: scheme.schemeId });
      return;
    }
    const selected = selectStratificationScheme(stratificationWorkspace, scheme.schemeId);
    if (!selected.ok) return reportStratificationProblem(selected.problem);
    void updateStratificationWorkspace(selected.workspace, `已切换到 ${scheme.name}。`, {
      selectedSchemeId: scheme.schemeId,
      selectedLayerId: scheme.layers[0]?.layerId ?? '',
      selectedBoundaryId: scheme.boundaries[0]?.boundaryId ?? '',
    });
  }

  function resolvePendingStratificationTransition(mode: 'commit' | 'discard' | 'stay') {
    const pending = pendingStratificationTransition;
    if (!pending || mode === 'stay') {
      setPendingStratificationTransition(null);
      return;
    }
    if (mode === 'commit') {
      if (stratificationWorkspace.editSession?.staleReason || stratificationIssues.some((issue) => issue.severity === 'problem')) {
        reportStratificationProblem('请先完成当前分层中的待确认事项，再查看最终预览。');
        return;
      }
      setStratificationFinalizeGuideOpen(true);
      return;
    }
    const resolved = discardStratificationEdit(stratificationWorkspace);
    if (!resolved.ok) {
      setPendingStratificationTransition(null);
      reportStratificationProblem(resolved.problem);
      return;
    }
    let nextWorkspace = resolved.workspace;
    let nextRoute: RouteId = 'stratification';
    if (pending.kind === 'scheme') {
      const selected = selectStratificationScheme(nextWorkspace, pending.schemeId);
      if (!selected.ok) {
        setPendingStratificationTransition(null);
        reportStratificationProblem(selected.problem);
        return;
      }
      nextWorkspace = selected.workspace;
    } else if (pending.kind === 'route') {
      nextRoute = pending.route;
      if (nextRoute === 'parameters' && getStratificationHandoffGate(nextWorkspace, currentStratificationInput).state === 'deny') {
        nextRoute = 'stratification';
      }
    }
    const nextScheme = getActiveStratificationScheme(nextWorkspace);
    setPendingStratificationTransition(null);
    void updateStratificationWorkspace(
      nextWorkspace,
      '已放弃未提交编辑并继续。',
      {
        activeRoute: nextRoute,
        selectedSchemeId: nextScheme?.schemeId ?? '',
        selectedLayerId: nextScheme?.layers[0]?.layerId ?? '',
        selectedBoundaryId: nextScheme?.boundaries[0]?.boundaryId ?? '',
      },
    );
  }

  function reportParameterProblem(problem: string) {
    setParameterCommandProblem(problem);
    void setFlowFeedback(problem);
  }

  function updateParameterWorkspace(
    workspace: ParameterWorkspaceV2,
    feedback: string,
    selectionPatch?: Partial<WorkflowSelectionState>,
  ) {
    setParameterCommandProblem('');
    parameterWorkspaceUpdateRef.current = workspace;
    setOptimisticParameterWorkspace(workspace);
    parameterWorkspacePendingUpdateCountRef.current += 1;
    const update = parameterWorkspaceUpdateQueueRef.current.then(async () => {
      const pending = onUpdateProject((current) => ({
        ...current,
        parameterWorkspace: workspace,
        selection: { ...current.selection, activeRoute: 'parameters', ...selectionPatch },
        flowFeedback: feedback,
      }));
      return pending ? await pending : undefined;
    });
    const trackedUpdate = update.finally(() => {
      parameterWorkspacePendingUpdateCountRef.current = Math.max(0, parameterWorkspacePendingUpdateCountRef.current - 1);
    });
    parameterWorkspaceUpdateQueueRef.current = trackedUpdate.then(() => undefined, () => undefined);
    return trackedUpdate;
  }

  function changeParameterToolMode(mode: 'builtin' | 'custom') {
    if (mode === parameterToolMode) return;
    if (parameterToolMode === 'builtin' && parameterEvidenceDirty) {
      setPendingParameterEvidenceTransition({ kind: 'mode', mode });
      return;
    }
    if (parameterToolMode === 'custom' && parameterWorkspace.customFormulaEditSession?.dirty) {
      setPendingCustomFormulaTransition({ kind: 'mode', mode });
      return;
    }
    setParameterToolMode(mode);
    setParameterCommandProblem('');
  }

  function createCustomFormulaDraft() {
    if (!currentCustomFormulaSource || !currentStratificationRevision) return reportParameterProblem('请先提交参数方案并完成前置推导。');
    const created = createCustomFormula({ workspace: parameterWorkspace, source: currentCustomFormulaSource, targetLayerIds: currentStratificationRevision.snapshot.layers.map((layer) => layer.layerId) });
    if (!created.ok) return reportParameterProblem(created.problem);
    setParameterToolMode('custom');
    void updateParameterWorkspace(created.workspace, '已建立自定义公式草稿，请定义表达式、单位和目标层。');
  }

  function updateCurrentCustomFormula(patch: CustomFormulaDraftPatch) {
    const updated = updateCustomFormulaDraft(parameterWorkspaceUpdateRef.current, patch);
    if (!updated.ok) return reportParameterProblem(updated.problem);
    void updateParameterWorkspace(updated.workspace, updated.validation.ok ? '公式草稿已更新，当前验证通过。' : updated.validation.problems[0] ?? '公式草稿已更新。');
  }

  async function saveCurrentCustomFormula() {
    if (!currentCustomFormulaSource || !currentStratificationRevision) {
      reportParameterProblem('当前参数或分层来源不可用，不能提交公式。');
      return null;
    }
    const committed = commitCustomFormula(parameterWorkspaceUpdateRef.current, currentCustomFormulaSource, currentStratificationRevision.snapshot.layers.map((layer) => layer.layerId));
    if (!committed.ok) {
      reportParameterProblem(committed.problem);
      return null;
    }
    const saved = await updateParameterWorkspace(committed.workspace, `已提交自定义公式 ${committed.formula.name} v${committed.formula.version}。`);
    if (saved === false) return null;
    return committed.workspace;
  }

  function commitCurrentCustomFormula() {
    void saveCurrentCustomFormula();
  }

  function beginCurrentCustomFormulaEdit() {
    if (!activeCustomFormula || !currentCustomFormulaSource) return reportParameterProblem('当前没有可编辑的有效公式。');
    const begun = beginCustomFormulaEdit(parameterWorkspace, activeCustomFormula.formulaId, currentCustomFormulaSource);
    if (!begun.ok) return reportParameterProblem(begun.problem);
    void updateParameterWorkspace(begun.workspace, '已打开公式编辑，修改后需提交新修订。');
  }

  function discardCurrentCustomFormulaEdit() {
    const discarded = discardCustomFormulaEdit(parameterWorkspace);
    void updateParameterWorkspace(discarded.workspace, '已放弃未提交的公式修改。');
  }

  function applyCustomFormulaSelection(formulaId: string, sourceWorkspace = parameterWorkspace) {
    const selected = selectCustomFormula(sourceWorkspace, formulaId);
    if (!selected.ok) return reportParameterProblem(selected.problem);
    void updateParameterWorkspace(selected.workspace, '已切换自定义公式。');
  }

  function selectCustomFormulaV1(formulaId: string) {
    if (parameterWorkspace.customFormulaEditSession?.dirty && formulaId !== activeCustomFormula?.formulaId) {
      setPendingCustomFormulaTransition({ kind: 'formula', formulaId });
      return;
    }
    applyCustomFormulaSelection(formulaId);
  }

  function duplicateCurrentCustomFormula() {
    if (!activeCustomFormula || !currentCustomFormulaSource || !currentStratificationRevision) return reportParameterProblem('当前没有可复制的公式或最新参数来源。');
    const duplicated = duplicateCustomFormula(parameterWorkspace, activeCustomFormula.formulaId, currentCustomFormulaSource);
    if (!duplicated.ok) return reportParameterProblem(duplicated.problem);
    const availableLayerIds = currentStratificationRevision.snapshot.layers.map((layer) => layer.layerId);
    const retainedLayerIds = activeCustomFormula.targetLayerIds.filter((layerId) => availableLayerIds.includes(layerId));
    const rebased = updateCustomFormulaDraft(duplicated.workspace, {
      targetLayerIds: retainedLayerIds.length ? retainedLayerIds : availableLayerIds,
    });
    if (!rebased.ok) return reportParameterProblem(rebased.problem);
    void updateParameterWorkspace(rebased.workspace, retainedLayerIds.length
      ? '已复制为公式草稿，并保留仍存在的目标层。'
      : '已复制为公式草稿；原目标层已变化，现暂按最新全部层重绑，请核对后提交。');
  }

  function deleteCurrentCustomFormula() {
    if (!activeCustomFormula) return reportParameterProblem('当前没有可删除的公式。');
    const deleted = deleteCustomFormula(parameterWorkspace, activeCustomFormula.formulaId);
    if (!deleted.ok) return reportParameterProblem(deleted.problem);
    void updateParameterWorkspace(deleted.workspace, '已删除自定义公式，历史修订和运行仍保留。');
  }

  function restoreDeletedCustomFormula(formulaId: string) {
    if (!currentCustomFormulaSource) return reportParameterProblem('当前没有可用于恢复判断的参数来源。');
    const restored = restoreCustomFormula(parameterWorkspace, formulaId, currentCustomFormulaSource);
    if (!restored.ok) return reportParameterProblem(restored.problem);
    void updateParameterWorkspace(restored.workspace, restored.formula.status === 'current' ? '已恢复自定义公式。' : '已恢复为失效历史，请基于最新来源复制。');
  }

  async function runSelectedCustomFormula() {
    if (!activeCustomFormulaRevision || !currentParameterSchemeRevisionV2 || !latestParameterDerivation || !currentStratificationRevision) return reportParameterProblem('公式运行需要已提交公式、当前参数修订和已完成前置推导。');
    if (customFormulaStale) return reportParameterProblem('当前公式来源已失效，请基于最新参数来源复制并提交。');
    const prepared = prepareCustomFormulaRun({ workspace: parameterWorkspace, formulaRevisionId: activeCustomFormulaRevision.revisionId, parameterRevision: currentParameterSchemeRevisionV2, derivationRun: latestParameterDerivation, stratificationRevision: currentStratificationRevision, commandId: `custom-formula-command:${createUiIdentifier()}` });
    if (!prepared.ok) return reportParameterProblem(prepared.problem);
    const started = startCustomFormulaRun(prepared.workspace, prepared.run.runId);
    if (!started.ok) return reportParameterProblem(started.problem);
    setSelectedCustomFormulaRunId(prepared.run.runId);
    await updateParameterWorkspace(started.workspace, `${activeCustomFormula?.name ?? '自定义公式'} 正在计算，可在右侧取消。`);
    globalThis.setTimeout(() => {
      setSelectedCustomFormulaRunId(prepared.run.runId);
      void onUpdateProject((current) => {
        const completed = completeCustomFormulaRun(current.parameterWorkspace ?? emptyParameterWorkspace(), prepared.run.runId);
        if (!completed.ok) return current;
        return { ...current, parameterWorkspace: completed.workspace, selection: { ...current.selection, activeRoute: 'parameters' }, flowFeedback: `自定义公式运行完成：${completed.run.summary?.validCount ?? 0} 行当前可用。` };
      });
    }, 750);
  }

  function cancelActiveCustomFormulaRun() {
    const openRun = [...(parameterWorkspace.customFormulaRuns ?? [])].reverse().find((run) => ['queued', 'running'].includes(run.status));
    if (!openRun) return reportParameterProblem('当前没有可取消的自定义公式运行。');
    const requested = requestCustomFormulaRunCancellation(parameterWorkspace, openRun.runId);
    if (!requested.ok) return reportParameterProblem(requested.problem);
    const cancelled = finalizeCustomFormulaRunCancellation(requested.workspace, openRun.runId);
    if (!cancelled.ok) return reportParameterProblem(cancelled.problem);
    void updateParameterWorkspace(cancelled.workspace, '已取消自定义公式运行，未保留部分结果。');
  }

  function createParameterWorkbenchScheme() {
    if (!parameterSource || !currentStratificationRevision) {
      reportParameterProblem(parameterSourceProblem ?? '当前分层来源不可用。');
      return;
    }
    const created = createConfiguredParameterScheme({
      workspace: parameterWorkspace,
      source: parameterSource,
      stratificationRevision: currentStratificationRevision,
      nktMode: parameterNktMode,
    });
    if (!created.ok) return reportParameterProblem(created.problem);
    void updateParameterWorkspace(created.workspace, '已建立参数方案草稿，请核对方法目标层和输入设置。', {
      selectedParameterSchemeId: created.scheme.schemeId,
      selectedParameterSlotId: created.slotIds[0] ?? '',
    });
  }

  function beginCurrentParameterSchemeEdit() {
    if (!activeParameterSchemeV2 || !parameterSource) return reportParameterProblem('当前没有可编辑的参数方案。');
    const begun = beginParameterSchemeEdit(parameterWorkspace, activeParameterSchemeV2.schemeId, parameterSource);
    if (!begun.ok) return reportParameterProblem(begun.problem);
    void updateParameterWorkspace(begun.workspace, '已打开参数方案编辑，修改后需提交新修订。');
  }

  function selectParameterSchemeV2(schemeId: string) {
    if (parameterEvidenceDirty && schemeId !== activeParameterSchemeV2?.schemeId) {
      setPendingParameterEvidenceTransition({ kind: 'scheme', schemeId });
      return;
    }
    applyParameterSchemeSelection(schemeId);
  }

  function applyParameterSchemeSelection(schemeId: string, sourceWorkspace = parameterWorkspace) {
    const selected = selectParameterSchemeV2Domain(sourceWorkspace, schemeId);
    if (!selected.ok) return reportParameterProblem(selected.problem);
    const scheme = selected.workspace.schemes.find((candidate) => candidate.schemeId === schemeId);
    void updateParameterWorkspace(selected.workspace, `已切换到 ${scheme?.name ?? '参数方案'}。`, {
      selectedParameterSchemeId: schemeId,
      selectedParameterSlotId: scheme?.slots[0]?.slotId ?? '',
    });
  }

  function duplicateCurrentParameterScheme() {
    if (!activeParameterSchemeV2 || !parameterSource) return reportParameterProblem('当前没有可复制的参数方案。');
    const duplicated = duplicateParameterScheme(parameterWorkspace, activeParameterSchemeV2.schemeId, parameterSource);
    if (!duplicated.ok) return reportParameterProblem(duplicated.problem);
    void updateParameterWorkspace(duplicated.workspace, '已复制为新参数方案，提交前可继续编辑。', {
      selectedParameterSchemeId: duplicated.scheme.schemeId,
      selectedParameterSlotId: duplicated.scheme.slots[0]?.slotId ?? '',
    });
  }

  function discardCurrentParameterSchemeEdit() {
    const discarded = discardParameterSchemeEdit(parameterWorkspace);
    void updateParameterWorkspace(discarded.workspace, '已放弃未提交的参数方案修改。');
  }

  function renameCurrentParameterScheme(name: string) {
    const renamed = renameParameterSchemeDraft(parameterWorkspace, name);
    if (!renamed.ok) return reportParameterProblem(renamed.problem);
    void updateParameterWorkspace(renamed.workspace, '参数方案名称已更新，需要提交新修订。');
  }

  function deleteCurrentParameterScheme() {
    if (!activeParameterSchemeV2) return reportParameterProblem('当前没有可删除的参数方案。');
    const replacement = parameterWorkspace.currentSchemeId === activeParameterSchemeV2.schemeId
      ? parameterWorkspace.schemes.find((scheme) =>
          scheme.schemeId !== activeParameterSchemeV2.schemeId && !['working', 'deleted', 'stale'].includes(scheme.status))
      : undefined;
    const deleted = softDeleteParameterScheme(parameterWorkspace, activeParameterSchemeV2.schemeId, replacement?.schemeId);
    if (!deleted.ok) return reportParameterProblem(deleted.problem);
    const next = selectActiveParameterSchemeV2(deleted.workspace);
    void updateParameterWorkspace(deleted.workspace, replacement ? `已删除方案，并切换到 ${replacement.name}。` : '已删除参数方案。', {
      selectedParameterSchemeId: next?.schemeId ?? '',
      selectedParameterSlotId: next?.slots[0]?.slotId ?? '',
    });
  }

  function restoreDeletedParameterScheme(schemeId: string) {
    const restored = restoreParameterScheme(parameterWorkspace, schemeId);
    if (!restored.ok) return reportParameterProblem(restored.problem);
    void updateParameterWorkspace(restored.workspace, '已恢复参数方案，保留原修订和运行历史。');
  }

  function updateCurrentParameterInputSettings(patch: Partial<ParameterInputSettingsV2>) {
    const updated = updateParameterSchemeSettings(parameterWorkspace, patch);
    if (!updated.ok) return reportParameterProblem(updated.problem);
    if (updated.problems.length) return reportParameterProblem(updated.problems[0]);
    void updateParameterWorkspace(updated.workspace, '参数输入设置已更新，提交前可继续调整。');
  }

  function commitCurrentParameterScheme() {
    if (!parameterSource) return reportParameterProblem(parameterSourceProblem ?? '当前参数来源不可用。');
    const committed = commitConfiguredParameterScheme(parameterWorkspace, parameterSource);
    if (!committed.ok) return reportParameterProblem(committed.problem);
    void updateParameterWorkspace(committed.workspace, '参数方案已提交，下一步运行前置推导。', {
      selectedParameterSchemeId: committed.scheme.schemeId,
      selectedParameterSlotId: committed.scheme.slots[0]?.slotId ?? '',
    });
  }

  async function runParameterDerivation() {
    if (!currentParameterSchemeRevisionV2 || !parameterInputRows) {
      reportParameterProblem('前置推导缺少已提交参数修订或完整有序的来源行。');
      return;
    }
    const commandId = `parameter-derive-command:${createUiIdentifier()}`;
    const prepared = await prepareParameterInputDerivationRun(
      parameterWorkspace,
      currentParameterSchemeRevisionV2.revisionId,
      parameterInputRows,
      flowCase.point.waterDepthM,
      commandId,
    );
    if (!prepared.ok) return reportParameterProblem(prepared.problem);
    const started = startParameterInputDerivationRun(prepared.workspace, prepared.run.runId);
    if (!started.ok) return reportParameterProblem(started.problem);
    await updateParameterWorkspace(started.workspace, '前置推导正在计算，可在右侧取消。');
    globalThis.setTimeout(() => {
      void onUpdateProject((current) => {
        const completed = completeParameterInputDerivationRun(current.parameterWorkspace ?? emptyParameterWorkspace(), prepared.run.runId);
        if (!completed.ok) return current;
        return {
          ...current,
          parameterWorkspace: completed.workspace,
          selection: { ...current.selection, activeRoute: 'parameters' },
          flowFeedback: `前置推导已完成：${completed.run.summary?.validCount ?? 0} 行有效，${completed.run.summary?.undefinedCount ?? 0} 行未定义。`,
        };
      });
    }, 650);
  }

  async function saveSelectedParameterEvidence() {
    if (!selectedParameterSlotV2 || !currentStratificationRevision || !selectedParameterLayerId) {
      reportParameterProblem('请先选择方法槽并确认精确分层修订。');
      return null;
    }
    const confirmed = confirmParameterMethodEvidence({
      workspace: parameterWorkspace,
      slot: selectedParameterSlotV2,
      stratificationRevision: currentStratificationRevision,
      draft: parameterEvidenceDraft,
      targetLayerId: selectedParameterLayerId,
    });
    if (!confirmed.ok) {
      reportParameterProblem(confirmed.problem);
      return null;
    }
    const saved = await updateParameterWorkspace(confirmed.workspace, `已为 ${selectedParameterSlotV2.symbol} 的选中层创建新证据修订。`);
    if (saved === false) return null;
    setParameterEvidenceDirty(false);
    return confirmed.workspace;
  }

  function confirmSelectedParameterEvidence() {
    void saveSelectedParameterEvidence();
  }

  async function runSelectedParameterMethod() {
    if (parameterSchemeStale) return reportParameterProblem('当前参数方案已失效，请基于最新分层新建方案。');
    if (!selectedParameterSlotV2 || !currentParameterSchemeRevisionV2 || !currentStratificationRevision || !latestParameterDerivation) {
      reportParameterProblem('方法运行需要已提交参数修订、已完成前置推导和精确分层修订。');
      return;
    }
    if (selectedParameterSlotV2.parameterKey === 'SuKpa' && selectedParameterSlotV2.settings.kind !== 'suc_qnet_nkt_v1') {
      return reportParameterProblem('suc 方法缺少已冻结的 Nkt 来源设置，不能运行。');
    }
    const evidence = getCurrentParameterMethodEvidence({
      workspace: parameterWorkspace,
      slot: selectedParameterSlotV2,
      stratificationRevision: currentStratificationRevision,
    });
    if (!evidence.ok) return reportParameterProblem(evidence.problem);
    if (evidence.evidence.some((item) => parameterWorkspace.methodEvidenceRevisions?.some((revision) =>
      revision.revisionId === item.evidenceRevisionRefs.drainage
      && revision.kind === 'drainage_applicability'
      && revision.payload.status === 'conflict'))) {
      return reportParameterProblem('当前目标层存在尚未解决的排水冲突，请先选择明确的排水结论并保存新证据修订。');
    }
    const prepared = prepareParameterMethodRun({
      projectId: project.projectId,
      workspace: parameterWorkspace,
      schemeRevisionId: currentParameterSchemeRevisionV2.revisionId,
      derivationRunId: latestParameterDerivation.runId,
      slotId: selectedParameterSlotV2.slotId,
      stratificationRevision: currentStratificationRevision,
      layerEvidence: evidence.evidence,
      commandId: `parameter-method-command:${createUiIdentifier()}`,
    });
    if (!prepared.ok) return reportParameterProblem(prepared.problem);
    const started = startParameterMethodRun(prepared.workspace, prepared.run.runId);
    if (!started.ok) return reportParameterProblem(started.problem);
    setSelectedParameterRunId(prepared.run.runId);
    await updateParameterWorkspace(started.workspace, `${selectedParameterSlotV2.symbol} 正在计算，可在右侧取消。`);
    globalThis.setTimeout(() => {
      setSelectedParameterRunId(prepared.run.runId);
      void onUpdateProject((current) => {
        const completed = completeParameterMethodRun(current.parameterWorkspace ?? emptyParameterWorkspace(), prepared.run.runId);
        if (!completed.ok) return current;
        return {
          ...current,
          parameterWorkspace: completed.workspace,
          selection: { ...current.selection, activeRoute: 'parameters', selectedParameterSlotId: selectedParameterSlotV2.slotId },
          flowFeedback: `${selectedParameterSlotV2.symbol} 运行已完成：${completed.run.summary?.eligibleValueCount ?? 0} 个有效结果。`,
        };
      });
    }, 750);
  }

  function cancelActiveParameterRun() {
    const openMethodRun = [...parameterWorkspace.parameterRuns].reverse().find((run) => ['queued', 'running'].includes(run.status));
    if (openMethodRun) {
      const requested = requestParameterMethodRunCancellation(parameterWorkspace, openMethodRun.runId);
      if (!requested.ok) return reportParameterProblem(requested.problem);
      const cancelled = finalizeParameterMethodRunCancellation(requested.workspace, openMethodRun.runId);
      if (!cancelled.ok) return reportParameterProblem(cancelled.problem);
      void updateParameterWorkspace(cancelled.workspace, '已取消方法运行，未保留部分结果。');
      return;
    }
    const openDerivation = [...parameterWorkspace.derivationRuns].reverse().find((run) => ['queued', 'running'].includes(run.status));
    if (openDerivation) {
      const requested = requestParameterInputDerivationCancellation(parameterWorkspace, openDerivation.runId);
      if (!requested.ok) return reportParameterProblem(requested.problem);
      const cancelled = finalizeParameterInputDerivationCancellation(requested.workspace, openDerivation.runId);
      if (!cancelled.ok) return reportParameterProblem(cancelled.problem);
      void updateParameterWorkspace(cancelled.workspace, '已取消前置推导，未保留部分结果。');
      return;
    }
    reportParameterProblem('当前没有可取消的开放运行。');
  }

  function selectParameterSlotV2(slotId: string) {
    if (parameterEvidenceDirty && slotId !== selectedParameterSlotV2?.slotId) {
      setPendingParameterEvidenceTransition({ kind: 'slot', slotId });
      return;
    }
    applyParameterSlotSelection(slotId);
  }

  function applyParameterSlotSelection(slotId: string) {
    const slot = activeParameterSchemeV2?.slots.find((candidate) => candidate.slotId === slotId);
    if (!slot) return;
    setSelectedParameterLayerId(slot.targetScope.layerIds[0] ?? null);
    setInspectedParameterLayerId(slot.targetScope.layerIds[0] ?? null);
    setSelectedParameterRunId('');
    void onUpdateProject((current) => ({
      ...current,
      selection: { ...current.selection, activeRoute: 'parameters', selectedParameterSlotId: slotId },
      flowFeedback: `已选择 ${slot.symbol} 方法槽。`,
    }));
  }

  function selectParameterLayerV2(layerId: string) {
    if (parameterEvidenceDirty && layerId !== selectedParameterLayerId) {
      setPendingParameterEvidenceTransition({ kind: 'layer', layerId });
      return;
    }
    setSelectedParameterLayerId(layerId);
    setInspectedParameterLayerId(layerId);
  }

  function selectParameterRowV2(sourceRowId: string, layerId?: string) {
    setSelectedParameterSourceRowId(sourceRowId);
    if (layerId) setInspectedParameterLayerId(layerId);
  }

  async function resolvePendingParameterEvidenceTransition(mode: 'save' | 'discard' | 'stay') {
    const pending = pendingParameterEvidenceTransition;
    if (!pending || mode === 'stay') {
      setPendingParameterEvidenceTransition(null);
      return;
    }
    let savedWorkspace: ParameterWorkspaceV2 | null = null;
    if (mode === 'save') {
      savedWorkspace = await saveSelectedParameterEvidence();
      if (!savedWorkspace) return;
    } else {
      setParameterEvidenceDirty(false);
    }
    setPendingParameterEvidenceTransition(null);
    if (pending.kind === 'mode') setParameterToolMode(pending.mode);
    if (pending.kind === 'route') navigateRoute(pending.route);
    if (pending.kind === 'scheme') applyParameterSchemeSelection(pending.schemeId, savedWorkspace ?? parameterWorkspace);
    if (pending.kind === 'slot') applyParameterSlotSelection(pending.slotId);
    if (pending.kind === 'layer') {
      setSelectedParameterLayerId(pending.layerId);
      setInspectedParameterLayerId(pending.layerId);
    }
    if (pending.kind === 'locate-source-row') applyParameterSourceRowLocation(pending.sourceRowId, pending.displayRow);
  }

  async function resolvePendingCustomFormulaTransition(mode: 'save' | 'discard' | 'stay') {
    const pending = pendingCustomFormulaTransition;
    if (!pending || mode === 'stay') {
      setPendingCustomFormulaTransition(null);
      return;
    }
    let resolvedWorkspace: ParameterWorkspaceV2;
    if (mode === 'save') {
      const saved = await saveCurrentCustomFormula();
      if (!saved) return;
      resolvedWorkspace = saved;
    } else {
      resolvedWorkspace = discardCustomFormulaEdit(parameterWorkspace).workspace;
    }
    setPendingCustomFormulaTransition(null);
    if (pending.kind === 'mode') {
      setParameterToolMode(pending.mode);
      void updateParameterWorkspace(resolvedWorkspace, mode === 'save' ? '已提交公式修订并切换工具。' : '已放弃公式修改并切换工具。');
    }
    if (pending.kind === 'formula') applyCustomFormulaSelection(pending.formulaId, resolvedWorkspace);
    if (pending.kind === 'route') {
      void onUpdateProject((current) => ({ ...current, parameterWorkspace: resolvedWorkspace, selection: { ...current.selection, activeRoute: pending.route }, flowFeedback: mode === 'save' ? '已提交公式修订并继续。' : '已放弃公式修改并继续。' }));
    }
    if (pending.kind === 'locate-source-row') {
      void onUpdateProject((current) => ({ ...current, parameterWorkspace: resolvedWorkspace, importFocusSourceRowId: pending.sourceRowId, importFocusDisplayRow: pending.displayRow, selection: { ...current.selection, activeRoute: 'import' }, flowFeedback: pending.displayRow ? `已定位到第 ${pending.displayRow} 行。` : '已返回数据导入并保留来源行标识。' }));
    }
  }

  function locateParameterSourceRow(sourceRowId: string) {
    const displayRow = importPipeline?.normalizedRows.find((row) => row.sourceRowId === sourceRowId)?.displayRowNumber ?? null;
    if (parameterToolMode === 'custom' && parameterWorkspace.customFormulaEditSession?.dirty) {
      setPendingCustomFormulaTransition({ kind: 'locate-source-row', sourceRowId, displayRow });
      return;
    }
    if (parameterToolMode === 'builtin' && parameterEvidenceDirty) {
      setPendingParameterEvidenceTransition({ kind: 'locate-source-row', sourceRowId, displayRow });
      return;
    }
    applyParameterSourceRowLocation(sourceRowId, displayRow);
  }

  function locateSelectedParameterSourceRow() {
    if (!selectedParameterSourceRowId) return reportParameterProblem('当前没有选中可定位的来源行。');
    locateParameterSourceRow(selectedParameterSourceRowId);
  }

  function applyParameterSourceRowLocation(sourceRowId: string, displayRow: number | null) {
    void onUpdateProject((current) => ({
      ...current,
      importFocusSourceRowId: sourceRowId,
      importFocusDisplayRow: displayRow,
      selection: { ...current.selection, activeRoute: 'import' },
      flowFeedback: displayRow ? `已返回数据导入并定位到第 ${displayRow} 行。` : '已返回数据导入并保留来源行标识。',
    }));
  }

  const selectedParameterEvidence = selectedParameterSlotV2 && currentStratificationRevision
    ? getCurrentParameterMethodEvidence({
        workspace: parameterWorkspace,
        slot: selectedParameterSlotV2,
        stratificationRevision: currentStratificationRevision,
      })
    : null;
  const selectedParameterLayerEvidence = selectedParameterSlotV2 && currentStratificationRevision && selectedParameterLayerId
    ? getCurrentParameterMethodEvidence({
        workspace: parameterWorkspace,
        slot: selectedParameterSlotV2,
        stratificationRevision: currentStratificationRevision,
        targetLayerId: selectedParameterLayerId,
      })
    : null;
  const selectedParameterLayerConflict = Boolean(
    selectedParameterLayerEvidence?.ok
    && selectedParameterLayerEvidence.evidence.some((item) => parameterWorkspace.methodEvidenceRevisions?.some((revision) =>
      revision.revisionId === item.evidenceRevisionRefs.drainage
      && revision.kind === 'drainage_applicability'
      && revision.payload.status === 'conflict')),
  );
  const selectedParameterEvidenceConflict = Boolean(
    selectedParameterEvidence?.ok
    && selectedParameterEvidence.evidence.some((item) => parameterWorkspace.methodEvidenceRevisions?.some((revision) =>
      revision.revisionId === item.evidenceRevisionRefs.drainage
      && revision.kind === 'drainage_applicability'
      && revision.payload.status === 'conflict')),
  );
  const nextMissingParameterEvidenceLayerId = selectedParameterSlotV2 && currentStratificationRevision
    ? selectedParameterSlotV2.targetScope.layerIds.find((layerId) => !getCurrentParameterMethodEvidence({
        workspace: parameterWorkspace,
        slot: selectedParameterSlotV2,
        stratificationRevision: currentStratificationRevision,
        targetLayerId: layerId,
      }).ok) ?? null
    : null;
  const openParameterRun = [...parameterWorkspace.parameterRuns, ...parameterWorkspace.derivationRuns]
    .reverse()
    .find((run) => ['queued', 'running', 'cancel-requested'].includes(run.status)) ?? null;
  const parameterPrimary = parameterSourceProblem
    ? { label: '返回地层分层', action: () => openRoute('stratification' as RouteId) }
    : !activeParameterSchemeV2
      ? { label: '建立参数方案', action: createParameterWorkbenchScheme }
      : parameterSchemeStale
        ? { label: '基于最新分层新建方案', action: createParameterWorkbenchScheme }
      : activeParameterSchemeV2.status === 'history'
        ? { label: '基于历史方案创建新修订', action: beginCurrentParameterSchemeEdit }
      : parameterWorkspace.editSession
        ? { label: '提交参数方案', action: commitCurrentParameterScheme }
        : !latestParameterDerivation
          ? { label: '运行前置推导', action: () => { void runParameterDerivation(); } }
          : parameterEvidenceDirty || (selectedParameterLayerEvidence && !selectedParameterLayerEvidence.ok)
            ? { label: selectedParameterLayerEvidence?.ok ? '保存证据新修订' : '确认选中层证据', action: confirmSelectedParameterEvidence }
            : selectedParameterLayerConflict || selectedParameterEvidenceConflict
              ? { label: '先解决排水冲突', action: () => reportParameterProblem('当前目标层存在尚未解决的排水冲突，请在右侧选择明确的排水结论并保存新修订。') }
              : nextMissingParameterEvidenceLayerId
              ? { label: '继续确认其他目标层', action: () => selectParameterLayerV2(nextMissingParameterEvidenceLayerId) }
            : { label: selectedParameterRun?.status === 'completed' ? '重跑当前方法' : '运行当前方法', action: () => { void runSelectedParameterMethod(); } };
  const openCustomFormulaRun = [...(parameterWorkspace.customFormulaRuns ?? [])].reverse().find((run) => ['queued', 'running', 'cancel-requested'].includes(run.status)) ?? null;
  const customFormulaPrimary = !currentCustomFormulaSource
    ? { label: '先完成前置推导', action: () => setParameterToolMode('builtin') }
    : !activeCustomFormula
      ? { label: '新建自定义公式', action: createCustomFormulaDraft }
      : customFormulaStale
        ? { label: '基于最新来源复制公式', action: duplicateCurrentCustomFormula }
        : parameterWorkspace.customFormulaEditSession
          ? customFormulaValidation?.ok
            ? { label: '提交公式修订', action: commitCurrentCustomFormula }
            : { label: '修正公式问题', action: () => reportParameterProblem(customFormulaValidation?.problems[0] ?? '当前公式存在问题。') }
          : !activeCustomFormulaRevision
            ? { label: '编辑并提交公式', action: beginCurrentCustomFormulaEdit }
            : viewingHistoricalCustomFormula
              ? { label: '运行当前公式', action: () => { void runSelectedCustomFormula(); } }
            : { label: selectedCustomFormulaRun?.status === 'completed' ? '重跑自定义公式' : '运行自定义公式', action: () => { void runSelectedCustomFormula(); } };

  function selectLayerId(layerId: string) {
    startTransition(() => setLocalStratificationSelection({ layerId, boundaryId: '' }));
  }

  function selectCheckIssue(issueId: string) {
    setLocalSelectedCheckIssueId(issueId);
  }

  function selectBoundaryId(boundaryId: string) {
    const boundary = activeStratificationScheme?.boundaries.find((candidate) => candidate.boundaryId === boundaryId);
    setLocalStratificationSelection((current) => ({
      boundaryId,
      layerId: boundary?.upperLayerId ?? current.layerId,
    }));
  }

  function selectOutputItemId(outputItemId: string) {
    setSelection((current) => ({
      ...current,
      selectedOutputItemId: outputItemId,
    }));
  }

  function runCurrentJtsParameterPackage(settings: JtsParameterPackageSettingsV5): JtsParameterPackageCommandResult {
    if (!onJtsParameterPackage) {
      const result = { ok: false as const, problem: '当前工作区未启用持久化 JTS 参数包。' };
      setParameterCommandProblem(result.problem);
      return result;
    }
    const result = onJtsParameterPackage({ kind: 'run', settings });
    if (result.ok && result.workspace) {
      parameterWorkspaceUpdateRef.current = result.workspace;
      setOptimisticParameterWorkspace(result.workspace);
    }
    setParameterCommandProblem(result.ok ? '' : result.problem);
    return result;
  }

  function configureCurrentJtsParameterMethod(methodId: JtsParameterMethodIdV5) {
    setParameterGuideFocusMethodId(methodId);
    setParameterGuideOpen(true);
  }

  function openCurrentJtsParameterAdvanced() {
    setParameterToolMode('builtin');
    setRightPanelOpen(true);
  }

  function startCurrentJtsParameterDataRecovery(methodId: JtsParameterMethodIdV5) {
    setParameterIssueRecoveryIntent({
      methodId,
      stage: 'check',
      sourceCheckRunId: checkRunId,
      sourceStratificationRevisionId: currentStratificationRevision?.revisionId ?? null,
    });
    openRoute('check');
  }

  function skipCurrentJtsParameterMethod(methodId: JtsParameterMethodIdV5, reason: 'not-needed-this-stage' | 'insufficient-data' | 'provided-by-other-test'): JtsParameterPackageCommandResult {
    const source = currentGuidedJtsPackage ?? activeJtsParameterPackage;
    if (!source) return { ok: false, problem: '当前没有可以修改的参数包，请先完成参数向导。' };
    const next: JtsParameterPackageSettingsV5 = {
      ...source.settingsSnapshot,
      skippedMethodDecisions: [
        ...(source.settingsSnapshot.skippedMethodDecisions ?? []).filter((item) => item.methodId !== methodId),
        { methodId, reason, decidedAt: new Date().toISOString() },
      ],
    };
    return runCurrentJtsParameterPackage(next);
  }

  function confirmCurrentJtsParameterScope(): JtsParameterPackageCommandResult {
    if (!onJtsParameterPackage) {
      const result = { ok: false as const, problem: '当前工作区未启用持久化 JTS 参数包。' };
      setParameterCommandProblem(result.problem);
      return result;
    }
    const result = onJtsParameterPackage({ kind: 'confirm-current-scope' });
    if (result.ok && result.workspace) {
      parameterWorkspaceUpdateRef.current = result.workspace;
      setOptimisticParameterWorkspace(result.workspace);
    }
    setParameterCommandProblem(result.ok ? '' : result.problem);
    return result;
  }

  function ignoreCurrentJtsParameterProblemPoints(methodId: JtsParameterMethodIdV5, sourceRowIds: string[], mode: 'standard' | 'forced' = 'standard'): JtsParameterPackageCommandResult {
    const source = currentGuidedJtsPackage ?? activeJtsParameterPackage;
    if (!source) return { ok: false, problem: '当前没有可以修改的参数试算，请先完成参数向导。' };
    const diagnosis = diagnoseJtsParameterIssue(source, methodId);
    const assessment = diagnosis?.pointIgnore;
    const canApply = mode === 'forced' ? assessment?.forceAllowed && !assessment.available : assessment?.available;
    const allowed = canApply && assessment ? new Set(assessment.sourceRowIds) : null;
    if (!allowed || sourceRowIds.length !== allowed.size || sourceRowIds.some((sourceRowId) => !allowed.has(sourceRowId))) {
      return { ok: false, problem: assessment?.blockingReason ?? assessment?.detail ?? '当前问题不满足局部忽略条件，请重新打开问题查看处理建议。' };
    }
    const decidedAt = new Date().toISOString();
    const problemValues = source.values.filter((value) => value.methodId === methodId && value.status === 'problem' && allowed.has(value.sourceRowId));
    if (problemValues.length !== allowed.size || problemValues.some((value) => !value.reason)) return { ok: false, problem: '局部问题证据已经变化，请重新打开问题后选择。' };
    const replacementKeys = new Set(problemValues.map((value) => `${value.methodId}:${value.sourceRowId}`));
    const next: JtsParameterPackageSettingsV5 = {
      ...source.settingsSnapshot,
      ignoredPointDecisions: [
        ...(source.settingsSnapshot.ignoredPointDecisions ?? []).filter((item) => !replacementKeys.has(`${item.methodId}:${item.sourceRowId}`)),
        ...problemValues.map((value) => ({
          methodId,
          sourceRowId: value.sourceRowId,
          depthM: value.depthM,
          reason: 'local-calculation-domain' as const,
          originalReason: value.reason as string,
          decidedAt,
          ...(mode === 'forced' ? {
            forced: true,
            thresholdViolations: [...(assessment?.thresholdViolations ?? [])],
            forcedConfirmedAt: decidedAt,
          } : {}),
        })),
      ],
    };
    return runCurrentJtsParameterPackage(next);
  }

  function saveParameterGuide(draft: GuidedParameterDraftV1): JtsParameterPackageCommandResult {
    if (!onJtsParameterPackage) return { ok: false, problem: '当前工作区未启用参数向导保存。' };
    const result = onJtsParameterPackage({ kind: 'save-guide', draft });
    setParameterCommandProblem(result.ok ? '' : result.problem);
    return result;
  }

  function clearParameterGuide() {
    if (!onJtsParameterPackage) return;
    const result = onJtsParameterPackage({ kind: 'clear-guide' });
    setParameterCommandProblem(result.ok ? '' : result.problem);
  }

  function runJtsDissipationCommand(command: JtsDissipationCommand) {
    if (!onJtsDissipation) return setParameterCommandProblem('当前工作区未启用持久化消散试验。');
    const result = onJtsDissipation(command);
    setParameterCommandProblem(result.ok ? '' : result.problem);
  }

  function downloadBytes(bytes: Uint8Array, revision: JtsOutputRevisionV7) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: revision.mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = revision.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function generateJtsOutput(kind: JtsOutputRevisionV7['kind']) {
    if (outputGenerationGuard.current) return;
    if (!onJtsOutput) { setFlowFeedback('当前工作区未启用持久化成果输出。'); return; }
    if (!activeJtsClassificationRun || activeJtsClassificationRun.status !== 'completed' || !currentStratificationRevision || !currentGuidedJtsPackage || !currentGuidedJtsPackage.settingsSnapshot.outputScopeConfirmedAt || !(currentGuidedJtsPackage.settingsSnapshot.outputScopeIncludedMethodIds?.length) || !workspaceProject || !activeWorkspacePoint) {
      setFlowFeedback('请先完成当前数据检查、分类、地层分层和本次参数试算。');
      return;
    }
    const outputPackage = currentGuidedJtsPackage;
    const includedMethodIds = new Set(outputPackage.settingsSnapshot.outputScopeIncludedMethodIds ?? []);
    const dissipation = includedMethodIds.has('jts_dissipation_ch_kh') && activeJtsDissipationResult?.status === 'completed' && activeJtsDissipationT50
      ? { testRevisionId: activeJtsDissipationResult.testRevisionId, t50Seconds: activeJtsDissipationT50.t50Seconds, t50Origin: activeJtsDissipationT50.origin, rigidityIndex: activeJtsDissipationResult.rigidityIndex, smallStrainModulusKpa: activeJtsDissipationResult.smallStrainModulusKpa, chM2PerSecond: activeJtsDissipationResult.chM2PerSecond, khMPerSecond: activeJtsDissipationResult.khMPerSecond }
      : null;
    const parameterExclusions = (outputPackage.settingsSnapshot.skippedMethodDecisions ?? []).map((decision) => {
      const item = outputPackage.checklist.find((candidate) => candidate.methodId === decision.methodId);
      return {
        methodId: decision.methodId,
        label: item?.label ?? decision.methodId,
        symbol: item?.symbol ?? decision.methodId,
        level: item?.level ?? 'optional' as const,
        applicableLayerIds: item?.applicableLayerIds ?? [],
        reason: decision.reason === 'insufficient-data' ? '数据不足' : decision.reason === 'provided-by-other-test' ? '由其他试验提供' : '本阶段不需要',
        decidedAt: decision.decidedAt ?? outputPackage.createdAt,
      };
    }).filter((item) => item.applicableLayerIds.length > 0);
    const ignoredPointNotices = (outputPackage.settingsSnapshot.ignoredPointDecisions ?? []).map((decision) => {
      const item = outputPackage.checklist.find((candidate) => candidate.methodId === decision.methodId);
      return `${decision.forced ? '参数强制忽略' : '参数局部忽略'}：${item?.symbol ?? decision.methodId}，深度 ${decision.depthM.toFixed(2)} m，源行 ${decision.sourceRowId}；原失败原因：${decision.originalReason}${decision.forced ? `；未满足的建议条件：${decision.thresholdViolations?.join('；') ?? '已由工程师确认'}；确认时间：${decision.forcedConfirmedAt ?? decision.decidedAt}` : ''}；仅影响本次参数试算。`;
    });
    const includedParameterValues = outputPackage.values.filter((item) => includedMethodIds.has(item.methodId));
    const includedRepresentativeValues = outputPackage.representativeValues.filter((item) => includedMethodIds.has(item.methodId));
    const selectedClassificationMethod = classificationMethodMeta(classificationMethodId(activeJtsClassificationRun));
    const ignoredDecisionByValue = new Map((outputPackage.settingsSnapshot.ignoredPointDecisions ?? []).map((decision) => [`${decision.sourceRowId}:${decision.methodId}`, decision]));
    const nativeMappings = [...new Map(activeJtsClassificationRun.rows
      .filter((row) => row.selectedClass)
      .map((row) => {
        const selected = row.selectedClass!;
        const classCode = classificationNativeCode(selected.soilClassId, selected.zone);
        return [classCode, { classCode, classLabel: selected.label, engineeringGroup: selected.engineeringGroup ?? (selected.zone <= 5 ? 'clay' : selected.zone === 6 ? 'mixed' : 'sand') }] as const;
      })).values()];
    const snapshot: JtsOutputSnapshotV7 = {
      projectId: workspaceProject.projectId,
      projectName: workspaceProject.projectName,
      pointId: activeWorkspacePoint.pointId,
      pointName: activeWorkspacePoint.pointName,
      generatedAt: new Date().toISOString(),
      classificationMethod: {
        methodId: classificationMethodId(activeJtsClassificationRun),
        label: selectedClassificationMethod.label,
        version: selectedClassificationMethod.version,
        packageId: selectedClassificationMethod.packageId,
        reference: classificationMethodReference(classificationMethodId(activeJtsClassificationRun)),
        mappingVersion: selectedClassificationMethod.mappingVersion,
        nativeMappings,
      },
      reportSource: {
        schemeId: currentStratificationRevision.schemeId,
        schemeName: currentStratificationRevision.snapshot.name,
        stratificationRevisionId: currentStratificationRevision.revisionId,
      },
      authority: { checkRunId: activeJtsClassificationRun.input.checkRunId, classificationRunId: activeJtsClassificationRun.runId, classificationResultHash: activeJtsClassificationRun.resultHash, stratificationRevisionId: currentStratificationRevision.revisionId, parameterPackageRunId: outputPackage.runId, parameterPackageResultHash: outputPackage.resultHash, dissipationResultRevisionId: dissipation ? activeJtsDissipationResult!.revisionId : null },
      parameterSource: {
        classificationRunId: outputPackage.classificationRunId,
        classificationResultHash: outputPackage.classificationResultHash,
        stratificationRevisionId: outputPackage.stratificationRevisionId,
        sourceLineageHash: outputPackage.sourceLineageHash,
      },
      measuredRows: activeJtsClassificationRun.measuredRowsSnapshot.map((row) => ({ sourceRowId: row.sourceRowId, depthM: row.depthM, qcKpa: row.qcKpa, fsKpa: row.fsKpa, u2Kpa: activeJtsClassificationRun.route === 'approximate_cpt' ? null : row.u2Kpa ?? null })),
      classificationRows: activeJtsClassificationRun.rows.map((row) => ({ sourceRowId: row.sourceRowId, depthM: row.depthM, qtn: row.qtn, ic: row.ic, soilClassId: row.selectedClass?.soilClassId ?? null, classCode: row.selectedClass ? classificationNativeCode(row.selectedClass.soilClassId, row.selectedClass.zone) : null, label: row.selectedClass?.label ?? null, engineeringGroup: row.selectedClass ? row.selectedClass.engineeringGroup ?? (row.selectedClass.zone <= 5 ? 'clay' : row.selectedClass.zone === 6 ? 'mixed' : 'sand') : null, confidence: row.confidence, approximate: row.selectedClass?.approximate ?? activeJtsClassificationRun.route === 'approximate_cpt' })),
      layers: currentStratificationRevision.snapshot.layers.map((layer) => ({ layerId: layer.layerId, name: layer.name, depthFromM: layer.depthFromM, depthToM: layer.depthToM, engineeringSoilGroup: layer.engineeringSoilGroup })),
      parameterRows: includedParameterValues.map((item) => {
        const meta = outputPackage.checklist.find((candidate) => candidate.methodId === item.methodId);
        const ignoreDecision = item.status === 'ignored' ? ignoredDecisionByValue.get(`${item.sourceRowId}:${item.methodId}`) : null;
        return { sourceRowId: item.sourceRowId, depthM: item.depthM, layerId: item.layerId, methodId: item.methodId, label: meta?.label ?? item.methodId, symbol: meta?.symbol ?? item.methodId, unit: meta?.unit ?? '1', status: item.status, value: item.value, reason: item.reason, notices: [...item.notices], ignoreKind: item.status === 'ignored' ? ignoreDecision?.forced ? 'forced' : 'ordinary' : null };
      }),
      parameterValues: includedRepresentativeValues.map((item) => { const meta = outputPackage.checklist.find((candidate) => candidate.methodId === item.methodId); return { layerId: item.layerId, methodId: item.methodId, symbol: meta?.symbol ?? item.methodId, unit: meta?.unit ?? '', count: item.validValueCount, median: item.median, minimum: item.minimum, maximum: item.maximum }; }),
      parameterExclusions,
      dissipation,
      formulaReferences: [...includedMethodIds].map((methodId) => parameterFormulaReference(methodId, outputPackage.settingsSnapshot, dissipation)),
      notices: ['原型解译成果，不作为设计值或正式采纳文件。', ...(activeJtsClassificationRun.route === 'approximate_cpt' ? ['当前分类为无 u2 的 CPT 近似路线，压力相关成果不可用。'] : []), ...parameterExclusions.map((item) => `参数排除：${item.symbol} ${item.label}；原因：${item.reason}；决定时间：${item.decidedAt}`), ...ignoredPointNotices],
    };
    outputGenerationGuard.current = true;
    setOutputGenerationKind(kind);
    const pdfKind: 'a4-report-pdf' | 'a3-atlas-pdf' = kind === 'a4-report-pdf' ? 'a4-report-pdf' : 'a3-atlas-pdf';
    setFlowFeedback('正在从同一冻结快照生成 PDF 和 Excel…');
    try {
      const pdfRevision = createJtsOutputRevision(snapshot, pdfKind);
      const workbookRevision = createJtsOutputRevision(snapshot, 'excel-workbook');
      const [pdfBytes, workbookBytes] = await Promise.all([
        createJtsOutputPdf(snapshot, pdfKind),
        createJtsOutputXlsx(snapshot),
      ]);
      const result = onJtsOutput({ kind: 'replace-output-pair', revisions: [pdfRevision, workbookRevision] });
      if (!result.ok) { setFlowFeedback(result.problem); return; }
      if (kind === 'excel-workbook') {
        downloadBytes(workbookBytes, workbookRevision);
        window.setTimeout(() => downloadBytes(pdfBytes, pdfRevision), 120);
      } else {
        downloadBytes(pdfBytes, pdfRevision);
        window.setTimeout(() => downloadBytes(workbookBytes, workbookRevision), 120);
      }
      setFlowFeedback('当前 PDF 和 Excel 已一起更新并下载；旧成果已被当前结果覆盖。');
    } catch (error) {
      setFlowFeedback(`成果生成失败：${error instanceof Error ? error.message : '未知错误'}。当前成果权威未改变，可重试。`);
    } finally {
      outputGenerationGuard.current = false;
      setOutputGenerationKind(null);
    }
  }

  async function downloadExistingJtsOutput(revision: JtsOutputRevisionV7) {
    if (outputGenerationGuard.current) return;
    outputGenerationGuard.current = true;
    setOutputGenerationKind(revision.kind);
    try {
      const bytes = revision.kind === 'excel-workbook' ? await createJtsOutputXlsx(revision.snapshot) : await createJtsOutputPdf(revision.snapshot, revision.kind);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: revision.mimeType }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = revision.fileName; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setFlowFeedback(`${revision.fileName} 已从成果修订重新生成。`);
    } catch (error) {
      setFlowFeedback(`历史成果下载失败：${error instanceof Error ? error.message : '未知错误'}。`);
    } finally {
      outputGenerationGuard.current = false;
      setOutputGenerationKind(null);
    }
  }

  const assistantContextSnapshot = useMemo(() => createAssistantContextSnapshot({
    projectId: workspaceProject?.projectId ?? project.projectId,
    projectName: workspaceProject?.projectName ?? project.projectName,
    pointId: activeWorkspacePoint?.pointId ?? flowCase.point.pointId,
    pointName: activeWorkspacePoint?.pointName ?? flowCase.point.pointName,
    route: activeRoute,
    workspaceRevision: workspaceProject?.workspaceRevision ?? importDraft.version,
    checkRunId,
    classificationRunId: activeJtsClassificationRun?.runId ?? null,
    stratificationRevisionId: currentStratificationRevision?.revisionId ?? null,
    hasWorkingDraft: Boolean(
      stratificationWorkspace.editSession?.schemeId
      && stratificationWorkspace.editSession.schemeId === activeStratificationScheme?.schemeId
    ),
    parameterRunId: currentGuidedJtsPackage?.runId ?? selectedParameterRun?.runId ?? null,
    statuses: {
      check: checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题' ? '已通过' : checkArtifactStatus === 'stale' ? '需重新检查' : '尚未通过',
      classification: activeJtsClassificationRun?.status === 'completed' ? '已完成' : activeJtsClassificationRun?.status ?? '尚未运行',
      stratification: stratificationHandoffGate.label,
      parameters: currentGuidedJtsPackage ? '已有当前参数结果' : parameterWorkspace.guidedParameterDraft ? '配置中' : '尚未生成',
      output: activeWorkspacePoint?.outputWorkspace?.revisions?.length ? '已有成果' : '尚未生成',
    },
    counts: {
      measuredRows: governedInputRows?.length ?? governedCheckDraft.rows.length,
      pendingLayers: activeStratificationScheme?.layers.filter(stratificationLayerNeedsDecision).length ?? 0,
      parameterProblems: parameterProblemCount,
      outputs: activeWorkspacePoint?.outputWorkspace?.revisions?.length ?? 0,
    },
    layers: (activeStratificationScheme?.layers ?? []).map((layer) => ({
      layerId: layer.layerId,
      name: layer.name,
      depthFromM: layer.depthFromM,
      depthToM: layer.depthToM,
      engineeringSoilGroup: layer.engineeringSoilGroup,
      reviewRequired: stratificationLayerNeedsDecision(layer),
    })),
    boundaries: (activeStratificationScheme?.boundaries ?? []).map((boundary) => ({
      boundaryId: boundary.boundaryId,
      depthM: boundary.depthM,
      reviewRequired: boundary.reviewRequired,
    })),
    selectedLayerId: selectedStratificationLayer?.layerId ?? null,
    selectedBoundaryId: selectedStratificationBoundary?.boundaryId ?? null,
    notices: [
      ...(stratificationHandoffGate.state === 'deny' ? [stratificationHandoffGate.reason] : []),
      ...(parameterProblemCount ? [`参数结果仍有 ${parameterProblemCount} 项问题。`] : []),
      ...(currentStratificationRevision ? ['当前存在已确认分层；助手修改会先进入工作草稿。'] : []),
    ],
  }), [
    activeCheckRecord?.conclusion,
    activeJtsClassificationRun,
    activeRoute,
    activeStratificationScheme,
    activeWorkspacePoint,
    checkArtifactStatus,
    checkRunId,
    currentGuidedJtsPackage,
    currentStratificationRevision,
    flowCase.point,
    governedCheckDraft.rows.length,
    governedInputRows,
    importDraft.version,
    parameterProblemCount,
    parameterWorkspace.guidedParameterDraft,
    project.projectId,
    project.projectName,
    selectedParameterRun?.runId,
    selectedStratificationBoundary?.boundaryId,
    selectedStratificationLayer?.layerId,
    stratificationHandoffGate,
    stratificationWorkspace.editSession?.schemeId,
    workspaceProject,
  ]);

  const assistantWorkspacePort = useMemo<AssistantWorkspacePort>(() => ({
    getContext: () => assistantContextSnapshot,
    readDepthWindow: (request) => readBoundedAssistantDepthWindow(
      (governedInputRows ?? []).map((item) => ({
        sourceRowId: item.sourceRowId,
        depthM: item.row.depthM,
        qcKpa: item.row.qcKpa,
        fsKpa: item.row.fsKpa,
        u2Kpa: item.row.u2Kpa,
      })),
      request,
    ),
    validateProposal: (proposal: AssistantProposal) => {
      if (assistantExecutedCommandIdsRef.current.has(proposal.commandId)) {
        return { ok: false, reason: 'invalid', problem: '这项修改已经执行过，不会重复执行。' };
      }
      if (
        proposal.scope.projectId !== assistantContextSnapshot.scope.projectId
        || proposal.scope.pointId !== assistantContextSnapshot.scope.pointId
        || proposal.scope.authorityHash !== assistantContextSnapshot.scope.authorityHash
      ) {
        return { ok: false, reason: 'stale', problem: '项目、点位或当前修订已经变化，请重新生成建议。' };
      }
      if (!activeStratificationScheme) {
        return { ok: false, reason: 'locked', problem: '当前还没有可编辑的分层方案，请先完成分层候选。' };
      }
      const payload = proposal.payload;
      if (payload.kind === 'set-layer-soil-group') {
        const layer = activeStratificationScheme.layers.find((candidate) => candidate.layerId === payload.layerId);
        if (!layer) return { ok: false, reason: 'stale', problem: '目标土层已变化，请重新生成建议。' };
        if (layer.engineeringSoilGroup === payload.engineeringSoilGroup) {
          return { ok: false, reason: 'invalid', problem: '当前土层已经是建议的大类，不需要重复修改。' };
        }
      } else {
        const boundary = activeStratificationScheme.boundaries.find((candidate) => candidate.boundaryId === payload.boundaryId);
        if (!boundary || selectedStratificationBoundary?.boundaryId !== boundary.boundaryId) {
          return { ok: false, reason: 'stale', problem: '当前选中边界已经变化，请重新选择后生成建议。' };
        }
      }
      return { ok: true, proposal };
    },
    executeProposal: async (proposal: AssistantProposal) => {
      if (assistantExecutedCommandIdsRef.current.has(proposal.commandId)) {
        return { ok: false, problem: '这项修改已经执行过，不会重复执行。' };
      }
      const currentHash = assistantContextSnapshot.scope.authorityHash;
      if (proposal.scope.authorityHash !== currentHash) {
        return { ok: false, problem: '建议已经过期，请重新生成。' };
      }
      assistantExecutedCommandIdsRef.current.add(proposal.commandId);
      const command: StratificationCommand = proposal.payload.kind === 'set-layer-soil-group'
        ? {
            kind: 'set-layer-soil-group',
            layerId: proposal.payload.layerId,
            engineeringSoilGroup: proposal.payload.engineeringSoilGroup,
          }
        : {
            kind: 'move-boundary',
            boundaryId: proposal.payload.boundaryId,
            depthM: proposal.payload.depthM,
          };
      const updated = executeStratificationCommand(command);
      if (!updated) {
        assistantExecutedCommandIdsRef.current.delete(proposal.commandId);
        return { ok: false, problem: stratificationCommandProblem || '现有分层规则拒绝了这项修改。' };
      }
      if (proposal.payload.kind === 'set-layer-soil-group') selectLayerId(proposal.payload.layerId);
      else selectBoundaryId(proposal.payload.boundaryId);
      openRoute('stratification');
      const durable = onWaitForDurability ? await onWaitForDurability() : true;
      return {
        ok: true,
        message: !durable
          ? '修改已应用到当前工作草稿，但本机保存尚未成功。请按页面保存提示重试；不要重复执行本次修改。'
          : proposal.scope.stratificationRevisionId && proposal.draftAction === 'create'
            ? '已基于当前确认分层创建工作草稿并应用修改；旧确认修订未覆盖。尚未提交为新分层修订，也未成为参数或成果输入。'
            : proposal.scope.stratificationRevisionId
              ? '已更新当前工作草稿；旧确认修订未覆盖。尚未提交为新分层修订，也未成为参数或成果输入。'
            : '已应用到当前分层工作草稿。尚未设为当前分层修订，也未成为参数或成果输入。',
        authorityHash: currentHash,
      };
    },
    locateLayer: (layerId) => {
      selectLayerId(layerId);
      openRoute('stratification');
    },
    locateBoundary: (boundaryId) => {
      selectBoundaryId(boundaryId);
      openRoute('stratification');
    },
  }), [
    activeStratificationScheme,
    assistantContextSnapshot,
    currentStratificationRevision,
    governedInputRows,
    onWaitForDurability,
    selectedStratificationBoundary?.boundaryId,
    stratificationCommandProblem,
  ]);

  const rightPanelContent = useMemo(() => {
    if (activeRoute === 'stratification') {
      return (
        <StratificationWorkbenchRightPanel
          workspace={stratificationWorkspace}
          currentCheckInput={currentStratificationInput}
          scheme={activeStratificationScheme}
          selectedLayer={selectedStratificationLayer}
          selectedBoundary={selectedStratificationBoundary}
          commandProblem={stratificationCommandProblem}
          recoveryIssue={jtsRecoveryIssue}
          autoRecovery={jtsAutoRecovery}
          mode={stratificationDockMode}
          activeRuleRun={activeStratificationRuleRun}
          activeJtsRun={activeJtsClassificationRun}
          selectedRuleCandidateId={selectedRuleCandidateId}
          advancedToolsOpen={stratificationAdvancedToolsOpen}
          onAdvancedToolsOpenChange={setStratificationAdvancedToolsOpen}
          onModeChange={setStratificationDockMode}
          onSelectRuleCandidate={setSelectedRuleCandidateId}
          onRunRule={runStratificationRule}
          onApplyRule={convertRuleRunToScheme}
          onRunJts={runCurrentJtsClassification}
          onApplyJts={convertJtsClassificationToScheme}
          onReviewJtsDecision={() => activeJtsClassificationRun && setJtsDecisionDialogRunId(activeJtsClassificationRun.runId)}
          onExecuteRecovery={executeJtsRecoveryOption}
          onRenameScheme={renameCurrentStratificationScheme}
          onDuplicateScheme={duplicateCurrentStratificationScheme}
          onDeleteScheme={deleteCurrentStratificationScheme}
          onCommand={executeStratificationCommand}
        />
      );
    }

    if (activeRoute === 'project') {
      return (
        <ProjectRightPanel
          summary={projectSummary}
          flowCase={flowCase}
          workspaceProject={workspaceProject}
          onPointLifecycle={onPointLifecycle}
        />
      );
    }

    if (activeRoute === 'import') {
      if (importDockMode === 'assistant') {
        return (
          <ImportAssistantPanel
            source={importAssistantSource}
            sourceAttachment={importAssistantAttachment}
            context={assistantContextSnapshot}
            pipelineContext={importPipelineContext ?? null}
            baseWorkspaceRevision={importAssistantBaseRevision}
            onClose={() => {
              setImportAssistantDraftPending(false);
              setImportDockMode('tools');
            }}
            onConfirmPipeline={confirmAssistantImportPipeline}
            onPendingDraftChange={setImportAssistantDraftPending}
            saveFailure={storageFailure}
            onOpenSaveFailureHelp={() => {
              setStorageHelpOpen(true);
              document.querySelector('[data-testid="project-storage-workspace-notice"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }}
          />
        );
      }
      return (
        <ImportRightPanel
          draft={visibleImportDraft}
          pipeline={visibleImportPipeline}
          mappings={importMappings}
          needsRecheck={needsRecheck}
          selectedMappingField={selectedMappingField}
          onSelectMappingField={selectImportMappingField}
          onDownloadTemplate={downloadImportTemplate}
          onCopyTemplateHeader={copyImportTemplateHeader}
          onRestartImport={() => setRestartConfirmation('import')}
          onApplyMapping={applyImportMapping}
          onConfirmMapping={confirmImportMapping}
          onClearMapping={clearImportMapping}
          onResetMappings={resetImportMappings}
          onApplyUnit={applyImportUnit}
          selectedPointKey={selectedImportPointKey}
          existingPoints={importPipelineContext?.existingPoints ?? []}
          onSelectPointKey={setSelectedImportPointKey}
          onApplyPointTarget={applyPointTarget}
          pointPlanStale={pointPlanStale}
          pendingPointIdentity={pendingPointIdentitySummary}
          aiSourceAvailable={Boolean(importAssistantSource && importAssistantAttachment)}
          aiSourceProblem={importAssistantSourceProblem}
          onOpenAssistant={() => {
            setRightPanelOpen(true);
            setImportDockMode('assistant');
          }}
        />
      );
    }

    if (activeRoute === 'check') {
      return (
        <CheckRightPanel
          selectedIssue={selectedFilteredCheckIssue}
          artifactStatus={checkArtifactStatus}
          governance={dataGovernance}
          governedRows={governedInputRows ?? []}
          onDataGovernance={onDataGovernance}
        />
      );
    }

    if (activeRoute === 'parameters') {
      return parameterToolMode === 'custom' ? (
        <CustomFormulaRightPanel
          workspace={parameterWorkspace}
          formula={activeCustomFormula}
          revision={displayedCustomFormulaRevision}
          revisions={(parameterWorkspace.customFormulaRevisions ?? []).filter((candidate) => candidate.formulaId === activeCustomFormula?.formulaId).sort((left, right) => right.version - left.version)}
          sampleRow={inspectedParameterRow}
          run={selectedCustomFormulaRun}
          runs={selectedCustomFormulaRuns}
          validation={customFormulaValidation}
          stale={customFormulaStale}
          sourceReady={Boolean(currentCustomFormulaSource && currentStratificationRevision)}
          stratificationRevision={currentStratificationRevision}
          openRun={openCustomFormulaRun}
          commandProblem={parameterCommandProblem}
          onToolModeChange={changeParameterToolMode}
          onCreate={createCustomFormulaDraft}
          onSelect={selectCustomFormulaV1}
          onUpdate={updateCurrentCustomFormula}
          onDiscard={discardCurrentCustomFormulaEdit}
          onBeginEdit={beginCurrentCustomFormulaEdit}
          onDuplicate={duplicateCurrentCustomFormula}
          onDelete={deleteCurrentCustomFormula}
          onRestore={restoreDeletedCustomFormula}
          onCancel={cancelActiveCustomFormulaRun}
          onSelectRun={setSelectedCustomFormulaRunId}
          onLocateSourceRow={locateSelectedParameterSourceRow}
        />
      ) : (
        <ParameterRightPanel
          toolMode={parameterToolMode}
          onToolModeChange={changeParameterToolMode}
          workspace={parameterWorkspace}
          guidedMode={jtsGuidedParameterMode}
          jtsPackage={jtsGuidedParameterMode ? currentGuidedJtsPackage : activeJtsParameterPackage}
          onRunJtsPackage={runCurrentJtsParameterPackage}
          dissipationTest={activeJtsDissipationTest}
          dissipationT50={activeJtsDissipationT50}
          dissipationResult={activeJtsDissipationResult}
          dissipationLayers={currentStratificationRevision?.snapshot.layers ?? []}
          onDissipationCommand={runJtsDissipationCommand}
          scheme={activeParameterSchemeV2}
          schemeRevision={displayedParameterSchemeRevision}
          schemeStale={parameterSchemeStale}
          viewingHistoricalRevision={viewingHistoricalParameterRevision}
          slot={displayedParameterSlotV2}
          runs={selectedSlotRuns}
          selectedRun={selectedParameterRun}
          inspectedRow={inspectedParameterRow}
          inspectedValue={inspectedParameterValue}
          inspectedLayer={inspectedParameterLayer}
          evidenceReady={(selectedParameterLayerEvidence?.ok ?? false) && !selectedParameterLayerConflict}
          evidenceConflict={selectedParameterLayerConflict}
          allEvidenceReady={(selectedParameterEvidence?.ok ?? false) && !selectedParameterEvidenceConflict}
          evidenceDirty={parameterEvidenceDirty}
          evidenceProblem={selectedParameterLayerEvidence && !selectedParameterLayerEvidence.ok ? selectedParameterLayerEvidence.problem : ''}
          evidenceDraft={parameterEvidenceDraft}
          selectedLayerId={selectedParameterLayerId}
          stratificationRevision={currentStratificationRevision}
          nktMode={parameterNktMode}
          commandProblem={parameterCommandProblem}
          openRun={openParameterRun}
          onCreateScheme={createParameterWorkbenchScheme}
          onSelectScheme={selectParameterSchemeV2}
          onBeginEdit={beginCurrentParameterSchemeEdit}
          onCommitScheme={commitCurrentParameterScheme}
          onDiscardEdit={discardCurrentParameterSchemeEdit}
          onRenameScheme={renameCurrentParameterScheme}
          onDuplicateScheme={duplicateCurrentParameterScheme}
          onDeleteScheme={deleteCurrentParameterScheme}
          onRestoreScheme={restoreDeletedParameterScheme}
          onUpdateSettings={updateCurrentParameterInputSettings}
          onSelectSlot={selectParameterSlotV2}
          onSelectLayer={selectParameterLayerV2}
          onUpdateEvidence={(updater) => {
            setParameterEvidenceDirty(true);
            setParameterEvidenceDraft(updater);
          }}
          onSetNktMode={setParameterNktMode}
          onConfirmEvidence={confirmSelectedParameterEvidence}
          onCancelRun={cancelActiveParameterRun}
          onSelectRun={setSelectedParameterRunId}
          onLocateSourceRow={locateSelectedParameterSourceRow}
          onShowIssues={() => setParameterView('issues')}
        />
      );
    }

    if (activeRoute === 'output') {
      return <OutputRightPanel selectedItem={selectedOutputItem} runtime={outputRuntime} ready={outputRuntime.checkReady && outputRuntime.stratificationReady && outputRuntime.parametersReady && outputRuntime.customFormulaReady} sourceLabel={currentStratificationRevision?.snapshot.name ?? '尚未选择'} classificationLabel={activeJtsClassificationRun ? classificationMethodMeta(classificationMethodId(activeJtsClassificationRun)).label : '尚未运行'} revisions={activeWorkspacePoint?.outputWorkspace?.revisions ?? []} generationKind={outputGenerationKind} onGenerate={(kind) => void generateJtsOutput(kind)} onDownload={(revision) => void downloadExistingJtsOutput(revision)} />;
    }

    return <GenericRightPanel route={activeRoute} pointName={projectSummary.pointName} />;
  }, [
    activeRoute,
    checkIssues,
    checkArtifactStatus,
    checkRunHistory,
    checkRunId,
    checkedDraftVersion,
    importMappings,
    importDraft,
    importPreviewRows,
    importPipeline,
    importDockMode,
    importAssistantSource,
    importAssistantAttachment,
    importAssistantBaseRevision,
    importAssistantSourceProblem,
    importAssistantDraftPending,
    assistantContextSnapshot,
    visibleImportDraft,
    visibleImportPipeline,
    pendingPointIdentitySummary,
    needsRecheck,
    outputItems,
    projectSummary,
    selectedBoundary,
    selectedCheckIssue,
    selectedCheckFilter,
    selectedLayer,
    selectedOutputItem,
    selectedParameterScheme,
    selectedParameterSlot,
    parameterWorkspace,
    activeJtsParameterPackage,
    activeJtsDissipationTest,
    activeJtsDissipationT50,
    activeJtsDissipationResult,
    activeWorkspacePoint,
    currentStratificationRevision,
    outputRuntime.checkReady,
    outputRuntime.stratificationReady,
    outputRuntime.parametersReady,
    outputRuntime.customFormulaReady,
    outputGenerationKind,
    onJtsOutput,
    parameterToolMode,
    activeParameterSchemeV2,
    activeCustomFormula,
    displayedCustomFormulaRevision,
    selectedCustomFormulaRun,
    selectedCustomFormulaRuns,
    customFormulaValidation,
    customFormulaStale,
    currentCustomFormulaSource,
    openCustomFormulaRun,
    selectedParameterSlotV2,
    selectedSlotRuns,
    selectedParameterRun,
    selectedParameterEvidence,
    selectedParameterLayerEvidence,
    parameterEvidenceDirty,
    parameterEvidenceDraft,
    parameterNktMode,
    parameterCommandProblem,
    openParameterRun,
    selectedScheme,
    activeStratificationScheme,
    activeJtsClassificationRun,
    activeStratificationRuleRun,
    selectedRuleCandidateId,
    stratificationDockMode,
    jtsRecoveryIssue,
    jtsAutoRecovery,
    selectedStratificationBoundary,
    selectedStratificationLayer,
    stratificationCommandProblem,
    stratificationIssues,
    stratificationWorkspace,
    currentStratificationInput,
    workspaceProject,
    onPointLifecycle,
    dataGovernance,
    governedInputRows,
    onDataGovernance,
  ]);
  const rightPanelLabel: Record<RouteId, string> = {
    project: '点位工具',
    import: '导入工具',
    check: '检查工具',
    stratification: '分层工具',
    parameters: '参数工具',
    output: '成果工具',
  };
  const pendingTransitionTarget = pendingStratificationTransition?.kind === 'route'
    ? routeTitle[pendingStratificationTransition.route]
    : pendingStratificationTransition?.kind === 'scheme'
      ? stratificationWorkspace.schemes.find((scheme) => scheme.schemeId === pendingStratificationTransition.schemeId)?.name ?? '目标方案'
      : '当前分层方案';
  const pendingParameterEvidenceTarget = pendingParameterEvidenceTransition?.kind === 'mode'
    ? pendingParameterEvidenceTransition.mode === 'custom' ? '自定义公式' : '内置方法'
    : pendingParameterEvidenceTransition?.kind === 'route'
    ? routeTitle[pendingParameterEvidenceTransition.route]
    : pendingParameterEvidenceTransition?.kind === 'scheme'
      ? parameterWorkspace.schemes.find((scheme) => scheme.schemeId === pendingParameterEvidenceTransition.schemeId)?.name ?? '其他参数方案'
      : pendingParameterEvidenceTransition?.kind === 'slot'
        ? activeParameterSchemeV2?.slots.find((slot) => slot.slotId === pendingParameterEvidenceTransition.slotId)?.symbol ?? '其他方法'
        : pendingParameterEvidenceTransition?.kind === 'layer'
          ? currentStratificationRevision?.snapshot.layers.find((layer) => layer.layerId === pendingParameterEvidenceTransition.layerId)?.name ?? '其他目标层'
          : pendingParameterEvidenceTransition?.kind === 'locate-source-row'
            ? '数据导入来源行'
          : '其他上下文';
  const pendingCustomFormulaTarget = pendingCustomFormulaTransition?.kind === 'mode'
    ? pendingCustomFormulaTransition.mode === 'builtin' ? '内置方法' : '自定义公式'
    : pendingCustomFormulaTransition?.kind === 'formula'
      ? parameterWorkspace.customFormulas?.find((formula) => formula.formulaId === pendingCustomFormulaTransition.formulaId)?.name ?? '其他公式'
      : pendingCustomFormulaTransition?.kind === 'route'
        ? routeTitle[pendingCustomFormulaTransition.route]
        : pendingCustomFormulaTransition?.kind === 'locate-source-row'
          ? '数据导入来源行'
          : '其他上下文';
  const transitionCanOpenFinalPreview = pendingStratificationTransition?.kind !== 'discard'
    && !stratificationWorkspace.editSession?.staleReason
    && !stratificationIssues.some((issue) => issue.severity === 'problem');
  const assistantImportSaveRecovery = activeRoute === 'import'
    && importAssistantDraftPending
    && storageFailure?.canRetry;
  const storageAlert = storageNotice?.kind === 'save-error' && storageFailure && !storageAlertDismissed ? (
    <div className={`workspace-save-alert ${storageHelpOpen ? 'expanded' : ''}`} role="alert" data-testid="project-storage-workspace-notice" data-storage-failure={storageFailure.code}>
      <div className="workspace-save-alert-summary">
        <strong>保存失败：{storageFailure.title}</strong>
        {storageNotice.context ? <span className="workspace-save-context">{storageNotice.context}</span> : null}
        <span>{storageNotice.failure || !storageNotice.message.includes('状态已经变化') ? storageFailure.summary : storageNotice.message}</span>
        {storageFailure.code === 'quota' && formatBrowserStorageStatus(storageFailure.storage)
          ? <small data-testid="workspace-storage-usage">{formatBrowserStorageStatus(storageFailure.storage)}</small>
          : null}
        {storageFailure.canRetry ? (
          <button type="button" className="workspace-save-help-toggle" onClick={() => setStorageHelpOpen((open) => !open)} aria-expanded={storageHelpOpen} data-testid="workspace-save-help-toggle">{storageHelpOpen ? '收起解决方法' : '查看解决方法'}</button>
        ) : null}
      </div>
      <div className="workspace-save-alert-actions">
        <button type="button" className="toolbar-button" onClick={() => setStorageAlertDismissed(true)}>暂时隐藏提示</button>
        <button
          type="button"
          className={assistantImportSaveRecovery ? 'toolbar-button' : 'toolbar-button primary'}
          data-testid={assistantImportSaveRecovery
            ? 'open-import-assistant-save-recovery'
            : storageFailure.canRetry ? 'retry-workspace-save' : 'open-workspace-save-help'}
          disabled={storageRetrying}
          onClick={async () => {
            if (assistantImportSaveRecovery) {
              const target = document.querySelector<HTMLElement>('[data-testid="import-assistant-retry-confirm"]');
              target?.scrollIntoView({ block: 'center' });
              target?.focus();
              return;
            }
            if (!storageFailure.canRetry) {
              setStorageHelpOpen((open) => !open);
              return;
            }
            setStorageRetrying(true);
            try {
              await onUpdateProject((current) => ({ ...current, updatedAt: new Date().toISOString() }));
            } finally {
              setStorageRetrying(false);
            }
          }}
        >
          {assistantImportSaveRecovery ? '查看右侧恢复' : storageRetrying ? '正在保存…' : storageFailure.canRetry
            ? storageFailure.actionLabel
            : storageHelpOpen ? '收起解决方法' : storageFailure.actionLabel}
        </button>
      </div>
      {storageHelpOpen ? (
        <div className="workspace-save-help" data-testid="workspace-save-help">
          <ol>{storageFailure.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <details><summary>技术详情</summary><code>{storageFailure.technicalDetail}</code></details>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`workbench ${rightPanelOpen ? '' : 'right-panel-collapsed'}`} data-testid="workbench-root">
      <Explorer
        activeRoute={activeRoute}
        summary={projectSummary}
        project={project}
        projects={projects}
        onOpenRoute={openRoute}
        onOpenProjectHub={onOpenProjectHub}
        onOpenProject={onOpenProject}
        checkHandoffState={checkHandoffGate.state}
        stratificationHandoffState={stratificationHandoffGate.state}
        workspaceProject={workspaceProject}
        onPointLifecycle={onPointLifecycle}
      />
      <main className="editor-shell" data-testid="editor-shell">
        <section className="document-host" data-testid="active-document">
          {storageAlert}
          {activeRoute === 'stratification' ? (
            <StratificationWorkbenchDocument
              pointName={projectSummary.pointName}
              draft={governedCheckDraft}
              workspace={stratificationWorkspace}
              currentCheckInput={currentStratificationInput}
              scheme={activeStratificationScheme}
              selectedLayer={selectedStratificationLayer}
              selectedBoundary={selectedStratificationBoundary}
              issues={stratificationIssues}
              gate={stratificationHandoffGate}
              activeRuleRun={activeStratificationRuleRun}
              activeJtsRun={activeJtsClassificationRun}
              selectedRuleCandidateId={selectedRuleCandidateId}
              ruleOverlayVisible={stratificationDockMode === 'rule'}
              onCreateScheme={openNewStratificationSchemeChoice}
              onCommit={commitCurrentStratificationEdit}
              onDiscard={discardCurrentStratificationEdit}
              onUndo={undoCurrentStratificationEdit}
              onRedo={redoCurrentStratificationEdit}
              onRollbackGuide={rollbackCurrentStratificationGuideStep}
              onDuplicate={duplicateCurrentStratificationScheme}
              onSelectLayer={selectLayerId}
              onSelectBoundary={selectBoundaryId}
              onSelectScheme={selectWorkspaceStratificationScheme}
              onCommand={executeStratificationCommand}
              onOpenRoute={openRoute}
              onOpenGuidedGeneration={() => {
                setStratificationAdvancedToolsOpen(false);
                setGuidedGenerationChoice(null);
                setGuidedGenerationProblem('');
                setGuidedGenerationRunning(false);
                guidedGenerationInFlightRef.current = false;
                setGuidedGenerationOpen(true);
              }}
              onOpenThinLayerGuide={() => setThinLayerGuideOpen(true)}
              onOpenFinalizeGuide={() => setStratificationFinalizeGuideOpen(true)}
              onAcceptAllClear={() => executeStratificationCommand({ kind: 'accept-clear-layer-candidates' })}
              onOpenJtsDecision={() => { setStratificationAdvancedToolsOpen(false); if (activeJtsClassificationRun) setJtsDecisionDialogRunId(activeJtsClassificationRun.runId); }}
              onFocusGuidedIssue={openGuidedStratificationIssue}
              onSelectRuleCandidate={setSelectedRuleCandidateId}
              onApplyRule={convertRuleRunToScheme}
            />
          ) : activeRoute === 'project' ? (
            <ProjectPointDocument
              flowCase={flowCase}
              summary={projectSummary}
              selectedPointId={selection.selectedPointId}
              onOpenRoute={openRoute}
              onSelectPoint={selectProjectPoint}
              isPersistentWorkspace={Boolean(workspacePointSummaries)}
              workspaceProject={workspaceProject}
              onPointLifecycle={onPointLifecycle}
              checkReady={checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题'}
            />
          ) : activeRoute === 'import' ? (
            <ImportDocument
              flowCase={flowCase}
              draft={visibleImportDraft}
              pipeline={visibleImportPipeline}
              mappings={importMappings}
              previewRows={importPreviewRows}
              pointSummary={projectSummary}
              needsRecheck={needsRecheck}
              selectedMappingField={selectedMappingField}
              focusField={importFocusField}
              focusSourceRowId={importFocusSourceRowId}
              focusDisplayRow={importFocusDisplayRow}
              onSelectMappingField={selectImportMappingField}
              onOpenRoute={openRoute}
              onImportFile={handleImportFile}
              onRunDataCheck={runDataCheck}
              onDownloadTemplate={downloadImportTemplate}
              onCopyTemplateHeader={copyImportTemplateHeader}
              onResolvePointDecision={resolvePointDecision}
              onCancelImportDraft={cancelImportDraft}
              selectedPointKey={selectedImportPointKey}
              pointPlanFeedback={pointPlanFeedback}
              pointPlanStale={pointPlanStale}
              onSelectPointKey={setSelectedImportPointKey}
              onApplyPointSplitStrategy={applyPointSplitStrategy}
              onGeneratePointPlan={generateCurrentPointPlan}
              actionPending={importActionPending}
              excelParsing={excelParsing}
              additionalProblem={singlePointTargetProblem}
              pendingPointIdentity={pendingPointIdentitySummary}
              assistantDraftPending={importAssistantDraftPending}
              saveFailure={storageFailure}
              onOpenPointIdentity={() => {
                setPointIdentityProblem('');
                setPointIdentityDialogOpen(true);
              }}
              workspaceProject={workspaceProject}
              onPointLifecycle={onPointLifecycle}
              checkReady={checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题'}
            />
          ) : activeRoute === 'check' ? (
            <CheckDocument
              flowCase={flowCase}
              draft={governedCheckDraft}
              issues={checkIssues}
              selectedIssue={selectedFilteredCheckIssue}
              checkRunId={checkRunId}
              checkedDraftVersion={checkedDraftVersion}
              artifactStatus={checkArtifactStatus}
              checkRunHistory={checkRunHistory}
              selectedCheckFilter={selectedCheckFilter}
              onSelectIssue={selectCheckIssue}
              onSelectCheckFilter={setSelectedCheckFilter}
              onOpenRoute={openRoute}
              onReturnToImport={returnToImportFromIssue}
              onRunDataCheck={runDataCheck}
              governance={dataGovernance}
              governedRows={governedInputRows ?? []}
              guide={<PreparationGuide
                currentStep={checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题' ? 5 : 4}
                probeConfirmed={workspaceProject?.mode === 'demo' || Boolean(activeWorkspacePoint?.probeContext.confirmedAt)}
                importReady={isImportDraftCheckable(importDraft)}
                waterConfirmed={workspaceProject?.mode === 'demo' || Boolean(activeWorkspacePoint?.waterContext.confirmedAt && !['unknown', 'partial'].includes(activeWorkspacePoint.waterContext.channelState))}
                checkReady={checkArtifactStatus === 'current' && activeCheckRecord?.conclusion === '无问题'}
              />}
              onExcludeRow={(sourceRowId, reason) => onDataGovernance?.({ kind: 'review', command: { kind: 'exclude-row', sourceRowId, reason } }) ?? { ok: false, problem: '当前项目不能写入忽略修订。' }}
              onKeepRow={(sourceRowId, reason) => onDataGovernance?.({ kind: 'review', command: { kind: 'keep-row', sourceRowId, reason } }) ?? { ok: false, problem: '当前项目不能写入保留决定。' }}
              onOverrideValue={(command) => onDataGovernance?.({ kind: 'override-value', command }) ?? { ok: false, problem: '当前项目不能写入数值修订。' }}
              onApplyAdjustments={(batch) => onDataGovernance?.({ kind: 'adjust-batch', batch }) ?? { ok: false, problem: '当前项目不能提交数据调整。' }}
            />
          ) : activeRoute === 'parameters' ? (
            <>
            <ParameterWorkbenchDocument
              projectName={project.projectName}
              pointName={flowCase.point.pointName}
              jtsPackage={jtsGuidedParameterMode ? currentGuidedJtsPackage : activeJtsParameterPackage}
              dissipationTest={activeJtsDissipationTest}
              dissipationT50={activeJtsDissipationT50}
              dissipationResult={activeJtsDissipationResult}
              sourceProblem={parameterSourceProblem}
              scheme={jtsGuidedParameterMode ? null : activeParameterSchemeV2}
              schemeRevision={jtsGuidedParameterMode ? null : parameterToolMode === 'custom' ? displayedCustomParameterRevision : displayedParameterSchemeRevision}
              historicalRevision={parameterToolMode === 'custom' ? viewingHistoricalCustomFormula : viewingHistoricalParameterRevision}
              statusOverride={parameterToolMode === 'custom' ? customFormulaWorkbenchStatus(activeCustomFormula, selectedCustomFormulaRun, Boolean(latestParameterDerivation), customFormulaStale, Boolean(parameterWorkspace.customFormulaEditSession), viewingHistoricalCustomFormula) : undefined}
              stratificationRevision={jtsGuidedParameterMode ? currentStratificationRevision : parameterToolMode === 'custom' ? displayedCustomStratificationRevision : displayedStratificationRevision}
              derivationRun={jtsGuidedParameterMode ? null : parameterToolMode === 'custom' ? displayedCustomDerivation : displayedParameterDerivation}
              slot={jtsGuidedParameterMode ? null : parameterToolMode === 'custom' ? customFormulaDisplaySlot(activeCustomFormula, selectedCustomFormulaRun) : builtinParameterDisplaySlot(displayedParameterSlotV2)}
              run={jtsGuidedParameterMode ? null : parameterToolMode === 'custom' ? customFormulaDisplayRun(selectedCustomFormulaRun) : builtinParameterDisplayRun(selectedParameterRun)}
              previousRun={jtsGuidedParameterMode ? null : parameterToolMode === 'custom' ? customFormulaDisplayRun(previousCustomFormulaRun) : builtinParameterDisplayRun(previousParameterRun)}
              view={parameterView}
              selectedSourceRowId={selectedParameterSourceRowId}
              selectedLayerId={inspectedParameterLayerId ?? selectedParameterLayerId}
              guidedMode={jtsGuidedParameterMode}
              guidedDraftActive={Boolean(parameterWorkspace.guidedParameterDraft)}
              guidedOutputReady={Boolean(currentGuidedJtsPackage?.checklist.some((item) => item.status === 'complete'))}
              guidedProblemCount={currentGuidedJtsPackage?.checklist.filter((item) => item.applicableLayerIds.length > 0 && (item.status === 'pending' || item.status === 'problem')).length ?? 0}
              primaryLabel={jtsGuidedParameterMode
                ? currentGuidedJtsPackage ? '修改参数配置' : parameterWorkspace.guidedParameterDraft ? '继续参数配置' : '开始参数配置'
                : parameterToolMode === 'custom' ? openCustomFormulaRun ? '运行处理中' : customFormulaPrimary.label : openParameterRun ? '运行处理中' : parameterPrimary.label}
              primaryDisabled={jtsGuidedParameterMode ? false : parameterToolMode === 'custom' ? Boolean(openCustomFormulaRun) : Boolean(openParameterRun)}
              onPrimary={jtsGuidedParameterMode
                ? () => setParameterGuideOpen(true)
                : parameterToolMode === 'custom' ? customFormulaPrimary.action : parameterPrimary.action}
              onOpenRoute={openRoute}
              onChangeView={setParameterView}
              onSelectRow={selectParameterRowV2}
              onSelectLayer={setInspectedParameterLayerId}
              onLocateIssueRow={locateParameterSourceRow}
              onConfigureJtsMethod={configureCurrentJtsParameterMethod}
              onOpenJtsAdvanced={openCurrentJtsParameterAdvanced}
              onStartJtsDataRecovery={startCurrentJtsParameterDataRecovery}
              onIgnoreJtsProblemPoints={ignoreCurrentJtsParameterProblemPoints}
              onSkipJtsMethod={skipCurrentJtsParameterMethod}
              onConfirmJtsOutputScope={confirmCurrentJtsParameterScope}
            />
            {parameterGuideSourceKey && activeJtsClassificationRun?.status === 'completed' && currentStratificationRevision ? <ParameterGuidedWizard
              open={parameterGuideOpen}
              pointId={activeWorkspacePoint?.pointId ?? activeJtsClassificationRun.input.pointId}
              classificationRun={activeJtsClassificationRun}
              stratificationRevision={currentStratificationRevision}
              completedRun={currentGuidedJtsPackage}
              persistedDraft={parameterWorkspace.guidedParameterDraft ?? null}
              onSave={saveParameterGuide}
              onClear={clearParameterGuide}
              onRun={runCurrentJtsParameterPackage}
              onClose={() => {
                setParameterGuideOpen(false);
                setParameterGuideFocusMethodId(null);
                setDismissedParameterGuideSource(parameterGuideSourceKey);
              }}
              onOpenAdvanced={() => {
                setParameterGuideOpen(false);
                setDismissedParameterGuideSource(parameterGuideSourceKey);
                setParameterToolMode('builtin');
                setRightPanelOpen(true);
              }}
              onOpenRoute={(route) => openRoute(route)}
              focusMethodId={parameterGuideFocusMethodId}
            /> : null}
            </>
          ) : activeRoute === 'output' ? (
            <OutputDocument
              items={outputItems}
              selectedItem={selectedOutputItem}
              runtime={outputRuntime}
              revisions={activeWorkspacePoint?.outputWorkspace?.revisions ?? []}
              onSelectItem={selectOutputItemId}
              onOpenRoute={openRoute}
            />
          ) : (
            <SupportingDocument route={activeRoute} />
          )}
          {parameterIssueRecoveryIntent && activeRoute !== 'parameters' ? (
            <div className="parameter-recovery-banner" data-testid="parameter-recovery-banner" role="status">
              <div><strong>{parameterIssueRecoveryIntent.stage === 'check' ? '正在处理参数所需的数据' : '数据已复检，等待新的最终分层'}</strong><span>{parameterIssueRecoveryIntent.stage === 'check' ? '复检通过后将进入地层分层；不会继续使用旧参数结果。' : '重新分类并生成最终分层后，系统会返回原参数。'}</span></div>
              <button type="button" className="toolbar-button" onClick={() => setParameterIssueRecoveryIntent(null)} data-testid="parameter-recovery-cancel">取消返回任务</button>
            </div>
          ) : null}
          {storageNotice && storageNotice.kind !== 'save-error' ? (
            <div className="flow-toast" data-testid="project-storage-workspace-notice" role="status">
              {storageNotice.message}
            </div>
          ) : flowFeedback ? (
            <div className="flow-toast" data-testid="flow-toast" role="status">
              {flowFeedback}
            </div>
          ) : null}
        </section>
      </main>
      <aside className={`right-panel ${rightPanelOpen ? 'is-open' : 'is-collapsed'}`} data-testid="right-panel" data-state={rightPanelOpen ? 'open' : 'collapsed'}>
        {rightPanelOpen ? (
          <>
            <div className="right-panel-control">
              <div className="right-panel-view-switch" role="group" aria-label="右侧功能" data-testid="right-panel-view-switch">
                <button type="button" className={rightPanelView === 'tools' || activeRoute === 'import' ? 'selected' : ''} onClick={() => setRightPanelView('tools')} data-testid="right-panel-tools-tab">{rightPanelLabel[activeRoute]}</button>
                {activeRoute !== 'import' ? <button type="button" className={rightPanelView === 'assistant' ? 'selected' : ''} onClick={() => setRightPanelView('assistant')} data-testid="right-panel-assistant-tab">AI 助手</button> : null}
              </div>
              <button
                type="button"
                className="right-panel-control-button"
                data-testid="right-panel-hide"
                onClick={() => setRightPanelOpen(false)}
              >
                隐藏
              </button>
            </div>
            {rightPanelView === 'assistant' && activeRoute !== 'import'
              ? <ProfessionalAssistantPanel port={assistantWorkspacePort} />
              : <>
                {activeRoute === 'check' ? (
                  <section className="query-card workflow-restart-card" data-testid="check-restart-actions">
                    <div className="query-card-heading"><h2>重新处理</h2><span className="inline-state">保留历史</span></div>
                    <div className="dock-editor-actions">
                      <button type="button" className="toolbar-button" onClick={() => void runDataCheck()}>重新运行检查</button>
                      <button type="button" className="toolbar-button" onClick={() => openRoute('import')}>返回数据导入</button>
                    </div>
                  </section>
                ) : activeRoute === 'stratification' ? (
                  <section className="query-card workflow-restart-card" data-testid="stratification-restart-actions">
                    <div className="query-card-heading"><h2>方案处理</h2><span className="inline-state">可并行</span></div>
                    <div className="dock-editor-actions">
                      <button type="button" className="toolbar-button" data-testid="stratification-create-scheme" onClick={openNewStratificationSchemeChoice}>新建分层方案</button>
                      {stratificationWorkspace.editSession?.dirty ? <button type="button" className="toolbar-button" onClick={discardCurrentStratificationEdit}>放弃当前编辑</button> : null}
                    </div>
                  </section>
                ) : activeRoute === 'parameters' ? (
                  <section className="query-card workflow-restart-card" data-testid="parameter-restart-actions">
                    <div className="query-card-heading"><h2>重新处理</h2><span className="inline-state">保留已算结果</span></div>
                    <div className="dock-editor-actions">
                      <button type="button" className="toolbar-button" data-testid="parameter-restart-guide" onClick={() => setRestartConfirmation('parameters')}>重新配置参数</button>
                      <button type="button" className="toolbar-button" onClick={() => openRoute('stratification')}>返回地层分层</button>
                    </div>
                  </section>
                ) : activeRoute === 'output' ? (
                  <section className="query-card workflow-restart-card" data-testid="output-return-actions">
                    <div className="query-card-heading"><h2>返回修改</h2><span className="inline-state">旧成果保留</span></div>
                    <div className="dock-editor-actions">
                      <button type="button" className="toolbar-button" onClick={() => openRoute('parameters')}>返回参数解译</button>
                      <button type="button" className="toolbar-button" onClick={() => openRoute('stratification')}>返回地层分层</button>
                    </div>
                  </section>
                ) : null}
                {rightPanelContent}
              </>}
          </>
        ) : (
          <div className="right-panel-rail" data-testid="right-panel-collapsed-actions">
            <button
              type="button"
              className="right-panel-rail-button"
              data-testid="right-panel-show"
              onClick={() => setRightPanelOpen(true)}
              title={`打开${rightPanelView === 'assistant' && activeRoute !== 'import' ? 'AI 助手' : rightPanelLabel[activeRoute]}`}
            >
              <span>{rightPanelView === 'assistant' && activeRoute !== 'import' ? 'AI 助手' : rightPanelLabel[activeRoute]}</span>
            </button>
            {rightPanelView !== 'assistant' && activeRoute !== 'import' ? (
              <button
                type="button"
                className="right-panel-rail-assistant"
                data-testid="right-panel-assistant-shortcut"
                onClick={() => {
                  setRightPanelView('assistant');
                  setRightPanelOpen(true);
                }}
                title="打开 AI 助手"
                aria-label="打开 AI 助手"
              >
                <Bot aria-hidden="true" />
                <span>AI</span>
              </button>
            ) : null}
          </div>
        )}
      </aside>
      {thinLayerGuideOpen && activeStratificationScheme ? <LayerCleanupGuideDialog
        scheme={activeStratificationScheme}
        rows={governedCheckDraft.rows}
        onClose={() => setThinLayerGuideOpen(false)}
        onKeepCurrent={() => Boolean(executeStratificationCommand({ kind: 'confirm-current-layer-structure' }))}
        onApplyThin={(analysis, decisions) => Boolean(executeStratificationCommand({
          kind: 'apply-thin-layer-plan',
          thresholdM: analysis.thresholdM,
          sourceSignature: analysis.sourceSignature,
          decisions,
        }))}
        onApplySimplification={(analysis) => Boolean(executeStratificationCommand({
          kind: 'apply-major-group-merge-plan',
          sourceSignature: analysis.sourceSignature,
          planSignature: analysis.planSignature,
        }))}
      /> : null}
      {newSchemeChoiceOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog guided-choice-dialog compact-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="new-scheme-choice-title" data-testid="new-scheme-choice-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>地层分层 · 新建方案</span><h2 id="new-scheme-choice-title">这次从哪里开始？</h2></div>
              <button type="button" className="icon-button" aria-label="关闭" onClick={() => setNewSchemeChoiceOpen(false)}><X /></button>
            </div>
            <p>原方案会保留。请选择重新走一遍方法指南，或复制当前方案后再修改。</p>
            <div className="guided-choice-list">
              <button type="button" className="guided-choice recommended" onClick={startNewStratificationSchemeFromMethod} data-testid="new-scheme-choose-method">
                <span>推荐</span><strong>重新选择方法</strong><em>重新选择分类方法和边界来源，再生成一套并行方案。</em>
              </button>
              <button type="button" className="guided-choice" disabled={!activeStratificationScheme} onClick={copyCurrentStratificationSchemeFromChoice} data-testid="new-scheme-copy-current">
                <span>{activeStratificationScheme ? '可用' : '不可用'}</span><strong>复制当前方案</strong><em>{activeStratificationScheme ? '保留当前层和边界，复制后独立调整。' : '当前还没有可复制的方案。'}</em>
              </button>
            </div>
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setNewSchemeChoiceOpen(false)}>取消</button>
            </div>
          </section>
        </div>
      ) : null}
      {restartConfirmation ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirmation-dialog compact-choice-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restart-confirmation-title"
            data-testid="restart-confirmation-dialog"
          >
            <div className="confirmation-dialog-heading">
              <div>
                <span>{restartConfirmation === 'import' ? '数据导入 · 重新处理' : '参数解译 · 重新配置'}</span>
                <h2 id="restart-confirmation-title">
                  {restartConfirmation === 'import' ? '清空当前导入草稿？' : '重新配置参数？'}
                </h2>
              </div>
              <button type="button" className="icon-button" aria-label="关闭" onClick={() => setRestartConfirmation(null)}><X /></button>
            </div>
            {restartConfirmation === 'import' ? (
              <>
                <p>将清空当前文件、字段与单位调整、AI 草稿和未确认点位。</p>
                <p className="short-note">不会删除已保存来源、检查记录和历史结果；重新载入页面仍可恢复上一版。</p>
              </>
            ) : (
              <>
                <p>将清空未完成的参数选择并重新打开向导。</p>
                <p className="short-note">已完成试算和历史结果会保留。</p>
              </>
            )}
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setRestartConfirmation(null)}>取消</button>
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="restart-confirmation-submit"
                onClick={() => {
                  if (restartConfirmation === 'import') {
                    restartImportPage();
                  } else {
                    clearParameterGuide();
                    setParameterGuideFocusMethodId(null);
                    setDismissedParameterGuideSource(null);
                    setParameterGuideOpen(true);
                  }
                  setRestartConfirmation(null);
                }}
              >
                {restartConfirmation === 'import' ? '清空当前草稿' : '清空并重新配置'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {guidedGenerationOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog guided-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="guided-generation-title" aria-busy={guidedGenerationRunning} data-testid="guided-generation-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>地层分层 · 工程判断</span><h2 id="guided-generation-title">如何生成本次地层候选？</h2></div>
              <button type="button" className="icon-button" aria-label="关闭" disabled={guidedGenerationRunning} onClick={() => setGuidedGenerationOpen(false)}><X /></button>
            </div>
            <StratificationGuideProgress current={guidedGenerationRunning ? 3 : 2} />
            <p>先选择一种分类方法，再选择边界来源。每次只运行当前方法，原始测量不会修改。</p>
            <div className="guided-choice-section-label"><strong>1. 选择分类方法</strong><span>本次只运行一种方法</span></div>
            <div className="guided-method-selector" data-testid="guided-classification-methods">
              {(Object.keys(CLASSIFICATION_METHODS_V1) as ClassificationMethodIdV1[]).map((methodId) => {
                const method = classificationMethodMeta(methodId);
                const availability = classificationMethodAvailability(methodId, jtsSeriesContext?.route ?? 'approximate_cpt', jtsMeasuredRows);
                const selected = guidedClassificationMethodId === methodId;
                return <button
                  type="button"
                  key={methodId}
                  className={selected ? 'selected' : ''}
                  disabled={guidedGenerationRunning || !availability.available}
                  aria-pressed={selected}
                  onClick={() => { setGuidedClassificationMethodId(methodId); setGuidedGenerationProblem(''); }}
                  data-testid={`guided-method-${methodId}`}
                >
                  <span>{availability.available ? selected ? '已选择' : '可用' : '不可用'}</span>
                  <strong>{method.label}</strong>
                  <em>{availability.reason}</em>
                </button>;
              })}
            </div>
            <div className="guided-choice-section-label"><strong>2. 选择边界来源</strong><span>{guidedGenerationChoice ? '已选择' : '还需选择一项'}</span></div>
            <div className="guided-choice-list">
              {guidedRuleRunId() ? (
                <button type="button" className={`guided-choice recommended ${guidedGenerationChoice === 'rule-jts' ? 'selected' : ''}`} aria-pressed={guidedGenerationChoice === 'rule-jts'} disabled={guidedGenerationRunning} onClick={() => { setGuidedGenerationChoice('rule-jts'); setGuidedGenerationProblem(''); }} data-testid="guided-use-rule-and-jts">
                  <span>推荐</span><strong>采用现有规则边界，并用所选模型填写土类</strong><em>保留当前 {activeStratificationRuleRun?.candidates.length ?? activeStratificationScheme?.boundaries.length ?? 0} 条边界；由 {classificationMethodMeta(guidedClassificationMethodId).label} 给出工程土类建议。</em>
                </button>
              ) : <button type="button" className="guided-choice" disabled data-testid="guided-use-rule-and-jts-unavailable"><span>不可用</span><strong>规则边界 + 所选模型土类</strong><em>当前无规则边界。可选择下方推荐方式继续；如需规则边界，请取消后打开高级工具。</em></button>}
              <button type="button" className={`guided-choice ${guidedRuleRunId() ? '' : 'recommended'} ${guidedGenerationChoice === 'jts' ? 'selected' : ''}`} aria-pressed={guidedGenerationChoice === 'jts'} disabled={guidedGenerationRunning} onClick={() => { setGuidedGenerationChoice('jts'); setGuidedGenerationProblem(''); }} data-testid="guided-use-jts">
                <span>{guidedRuleRunId() ? '可用' : '推荐'}</span><strong>由所选模型同时建议边界和土类</strong><em>{guidedRuleRunId() ? '' : '当前没有规则候选；'}按 {classificationMethodMeta(guidedClassificationMethodId).label} 的原生类别变化生成细分候选，再进入整理分层。</em>
              </button>
              <button type="button" className={`guided-choice ${guidedGenerationChoice === 'manual' ? 'selected' : ''}`} aria-pressed={guidedGenerationChoice === 'manual'} disabled={guidedGenerationRunning} onClick={() => { setGuidedGenerationChoice('manual'); setGuidedGenerationProblem(''); }} data-testid="guided-use-manual">
                <span>高级手动</span><strong>自行添加边界并选择土类</strong><em>使用受约束的深度输入和固定土类类别。</em>
              </button>
            </div>
            {guidedGenerationRunning ? <div className="guided-generation-running" role="status" aria-live="polite" data-testid="guided-generation-running"><strong>正在分析数据并生成候选…</strong><span>正在检查 {jtsMeasuredRows.length} 行数据，请勿重复操作。</span></div> : null}
            {guidedGenerationProblem ? <div className="guided-generation-problem" role="alert" data-testid="guided-generation-problem"><strong>暂时无法继续</strong><span>{guidedGenerationProblem}</span>{currentJtsRecoveryDiagnosis?.evidence[0] ? <span>首个位置：{currentJtsRecoveryDiagnosis.evidence[0]}</span> : null}<span>{currentJtsRecoveryDiagnosis?.consequence ?? '本次没有写入分类结果，原始测量和当前方案均未改变。'}</span>{guidedGenerationRecoveryOption?.recommendationReason ? <span>建议理由：{guidedGenerationRecoveryOption.recommendationReason} {guidedGenerationRecoveryOption.impact}</span> : null}</div> : null}
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" disabled={guidedGenerationRunning} onClick={() => setGuidedGenerationOpen(false)}>取消</button>
              {guidedGenerationProblem ? (
                guidedGenerationRecoveryOption
                  ? <button type="button" className="toolbar-button primary" disabled={guidedGenerationRunning} onClick={openGuidedGenerationRecovery} data-testid="guided-generation-recovery">{guidedGenerationRecoveryOption.label}</button>
                  : <button type="button" className="toolbar-button primary" disabled={guidedGenerationRunning} onClick={() => void confirmGuidedGenerationChoice()} data-testid="guided-generation-retry">重新尝试</button>
              ) : <>
                {!guidedGenerationChoice ? <span className="guided-choice-required">还需选择边界来源</span> : null}
                <button type="button" className="toolbar-button primary" disabled={!guidedGenerationChoice || guidedGenerationRunning} onClick={() => void confirmGuidedGenerationChoice()} data-testid="guided-generation-confirm">
                  {guidedGenerationRunning ? '正在分析数据并生成候选…' : guidedGenerationChoice === 'manual' ? '进入手动编辑' : '生成候选并继续'}
                </button>
              </>}
            </div>
          </section>
        </div>
      ) : null}
      {jtsDecisionDialogRunId
        && activeJtsClassificationRun?.runId === jtsDecisionDialogRunId
        && activeJtsGuidance ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog jts-exception-dialog" role="dialog" aria-modal="true" aria-labelledby="jts-exception-title" data-testid="jts-exception-dialog">
            <div className="confirmation-dialog-heading">
              <div>
                <span>分类已完成 · 当前方案未改变</span>
                <h2 id="jts-exception-title">这些异常点怎么处理？</h2>
              </div>
              <button type="button" className="icon-button" aria-label="暂不采用本次分类" onClick={closeJtsDecisionDialog}><X /></button>
            </div>
            <StratificationGuideProgress current={3} />
            <p><strong>{activeJtsGuidance.unclassifiableRows} 个点</strong>，已合并为 <strong>{activeJtsGuidance.isolatedAnomalyIntervalCount} 个短区间</strong>。系统不会修改原始测量。</p>
            <JtsLinkedEvidence
              rows={activeJtsClassificationRun.measuredRowsSnapshot}
              intervals={activeJtsGuidance.intervals.filter((interval) => interval.kind === 'unclassifiable')}
              compact
            />
            <div className={`jts-dialog-recommendation ${activeJtsGuidance.canIgnoreIsolatedAnomalies ? 'safe' : 'review'}`}>
              <strong>{activeJtsGuidance.canIgnoreIsolatedAnomalies ? '建议：保留异常点并生成其余地层' : `建议：保留 ${activeJtsGuidance.isolatedAnomalyIntervalCount} 个区间待确认`}</strong>
              <span>{activeJtsGuidance.canIgnoreIsolatedAnomalies
                ? `${activeJtsGuidance.ignoreReason} 原始测量不会修改。`
                : '系统不会猜测这些区间的土类；其他有效区间先生成建议土类，待确认区间会阻止进入参数解译。'}</span>
            </div>
            <div className="confirmation-dialog-actions jts-dialog-actions">
              <button type="button" className="toolbar-button" onClick={closeJtsDecisionDialog}>暂不采用</button>
              <button type="button" className="toolbar-button" onClick={() => { closeJtsDecisionDialog(); executeJtsRecoveryOption('open-check'); }} data-testid="jts-return-to-check">返回数据检查</button>
              {!activeJtsGuidance.canIgnoreIsolatedAnomalies && jtsAutoRecovery?.optionId !== 'standard-smoothing' && activeJtsGuidance.repairableRows ? (
                <button type="button" className="toolbar-button" onClick={runJtsDecisionSmoothing} data-testid="jts-exception-auto-fix">自动平滑后再判断</button>
              ) : null}
              {activeJtsGuidance.canIgnoreIsolatedAnomalies ? (
                <>
                  <button type="button" className="toolbar-button" onClick={showJtsEvidenceDetails}>查看异常深度</button>
                  <button type="button" className="toolbar-button primary" onClick={acceptGuidedGapsAndCreateCandidate} data-testid="jts-ignore-and-create-candidate">保留异常点，生成其余地层</button>
                </>
              ) : (
                <button type="button" className="toolbar-button primary" onClick={createGuidedPendingReviewCandidate} data-testid="jts-create-pending-review-candidate">保留 {activeJtsGuidance.isolatedAnomalyIntervalCount} 个区间待确认，生成其余地层</button>
              )}
            </div>
          </section>
        </div>
      ) : null}
      {stratificationFinalizeGuideOpen && activeStratificationScheme ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog stratification-finalize-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="stratification-finalize-guide-title" data-testid="stratification-finalize-guide-dialog">
            <div className="confirmation-dialog-heading"><div><span>地层分层 · 最终预览</span><h2 id="stratification-finalize-guide-title">确认以下分层并生成当前修订？</h2></div><button type="button" className="icon-button" aria-label="返回修改分层" onClick={() => { setStratificationFinalizeGuideOpen(false); setPendingStratificationTransition(null); }}><X /></button></div>
            <StratificationGuideProgress current={6} />
            <p>这是本次指南的唯一生成动作。生成后将成为当前参数试算引用的分层修订，无需再次提交；不代表正式工程采纳。</p>
            <div className="stratification-finalize-summary"><div><span>土层</span><strong>{activeStratificationScheme.layers.length}</strong></div><div><span>边界</span><strong>{activeStratificationScheme.boundaries.length}</strong></div><div><span>问题</span><strong data-testid="stratification-finalize-problem-count">{stratificationBlockingIssues.length}</strong></div><div><span>复核提示</span><strong>{stratificationIssues.filter((issue) => issue.severity === 'notice').length}</strong></div></div>
            {stratificationBlockingIssues.length ? <div className="stratification-finalize-problems" data-testid="stratification-finalize-problems">
              <div><strong>还有 {stratificationBlockingIssues.length} 个问题需要处理</strong><span>处理后再生成当前修订；原始测量和本次编辑不会丢失。</span></div>
              {stratificationBlockingIssues.slice(0, 4).map((issue) => <button type="button" key={issue.issueId} onClick={() => { setStratificationFinalizeGuideOpen(false); setPendingStratificationTransition(null); openGuidedStratificationIssue(issue); }}>
                <span>{stratificationIssueLocationLabel(issue, activeStratificationScheme)}</span><strong>{issue.title}</strong><em>{issue.message}</em>
              </button>)}
            </div> : null}
            <div className="stratification-finalize-sources" data-testid="stratification-finalize-sources"><span><strong>边界来源</strong>{stratificationBoundarySourceLabel(activeStratificationScheme)}</span><span><strong>土类来源</strong>{stratificationSoilSourceSummary(activeStratificationScheme.layers)}</span></div>
            <div className="stratification-final-layer-preview" data-testid="stratification-final-layer-preview">
              <table><thead><tr><th>层</th><th>深度范围</th><th>具体土类 / 工程分组</th><th>判断来源</th></tr></thead><tbody>{activeStratificationScheme.layers.map((layer, index) => <tr key={layer.layerId}><td><strong>L{index + 1}</strong><span>{layer.name}</span></td><td>{layer.depthFromM.toFixed(2)}–{layer.depthToM.toFixed(2)} m</td><td>{stratificationLayerDisplayLabel(layer)} / {stratificationSoilGroupLabel(layer.engineeringSoilGroup)}</td><td>{stratificationSoilDecisionLabel(layer)}</td></tr>)}</tbody></table>
            </div>
            <div className="confirmation-dialog-actions"><button type="button" className="toolbar-button" onClick={() => { setStratificationFinalizeGuideOpen(false); setPendingStratificationTransition(null); }}>返回修改分层</button>{stratificationBlockingIssues.length ? <button type="button" className="toolbar-button primary" onClick={() => { const issue = stratificationBlockingIssues[0]; setStratificationFinalizeGuideOpen(false); setPendingStratificationTransition(null); openGuidedStratificationIssue(issue); }} data-testid="stratification-finalize-locate-problem">返回并定位第一个问题</button> : <button type="button" className="toolbar-button primary" onClick={() => { setStratificationFinalizeGuideOpen(false); commitCurrentStratificationEdit(); }} data-testid="stratification-guide-generate-revision">生成当前分层修订</button>}</div>
          </section>
        </div>
      ) : null}
      {pendingStratificationTransition && !stratificationFinalizeGuideOpen ? (
        <div className="modal-backdrop stratification-transition-backdrop" role="presentation">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="stratification-transition-title" data-testid="stratification-transition-dialog">
            <div className="confirmation-dialog-heading">
              <div>
                <span>未提交编辑</span>
                <h2 id="stratification-transition-title">{pendingStratificationTransition.kind === 'discard' ? '确认放弃当前分层修改' : `前往${pendingTransitionTarget}前处理修改`}</h2>
              </div>
              <button type="button" className="icon-button" aria-label="留在当前页" onClick={() => resolvePendingStratificationTransition('stay')}><X /></button>
            </div>
            <p>{stratificationWorkspace.editSession?.staleReason
              ? `上游检查已经变化，当前修改只读保留。放弃后仍停留在${pendingTransitionTarget}，再创建修订方案。`
              : pendingStratificationTransition.kind === 'discard'
                ? '放弃后将恢复到最近一次提交的方案；新建但尚未提交的方案会被移除。'
                : transitionCanOpenFinalPreview
                  ? `当前分层已完成逐层确认。继续前请先查看最终预览；只有最终预览会生成当前修订。也可以放弃修改后前往${pendingTransitionTarget}。`
                  : `当前分层仍有待确认事项，不能生成修订。请留在当前页继续确认，或放弃修改后前往${pendingTransitionTarget}。`}</p>
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" data-testid="stratification-stay" onClick={() => resolvePendingStratificationTransition('stay')}>留在当前页</button>
              <button type="button" className="toolbar-button danger" data-testid="stratification-discard-confirm" onClick={() => resolvePendingStratificationTransition('discard')}>{pendingStratificationTransition.kind === 'discard' ? '确认放弃' : `放弃并前往${pendingTransitionTarget}`}</button>
              {transitionCanOpenFinalPreview ? <button type="button" className="toolbar-button primary" data-testid="stratification-review-before-leave" onClick={() => resolvePendingStratificationTransition('commit')}>查看最终预览</button> : null}
            </div>
          </section>
        </div>
      ) : null}
      {pendingParameterEvidenceTransition ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="parameter-evidence-transition-title" data-testid="parameter-evidence-transition-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>证据尚未保存</span><h2 id="parameter-evidence-transition-title">前往{pendingParameterEvidenceTarget}前处理修改</h2></div>
              <button type="button" className="icon-button" aria-label="留在当前层" onClick={() => void resolvePendingParameterEvidenceTransition('stay')}><X /></button>
            </div>
            <p>当前方法与目标层的贯入速率、排水或材料证据有未保存修改。保存会创建新的不可变证据修订；放弃只撤销本次草稿。</p>
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" data-testid="parameter-evidence-stay" onClick={() => void resolvePendingParameterEvidenceTransition('stay')}>留在当前层</button>
              <button type="button" className="toolbar-button danger" data-testid="parameter-evidence-discard-transition" onClick={() => void resolvePendingParameterEvidenceTransition('discard')}>放弃并继续</button>
              <button type="button" className="toolbar-button primary" data-testid="parameter-evidence-save-transition" onClick={() => void resolvePendingParameterEvidenceTransition('save')}>保存新修订并继续</button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingCustomFormulaTransition ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-formula-transition-title" data-testid="custom-formula-transition-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>公式尚未提交</span><h2 id="custom-formula-transition-title">前往{pendingCustomFormulaTarget}前处理修改</h2></div>
              <button type="button" className="icon-button" aria-label="留在当前公式" onClick={() => void resolvePendingCustomFormulaTransition('stay')}><X /></button>
            </div>
            <p>当前公式定义有未提交修改。提交会创建不可变公式修订；放弃只撤销本次草稿。</p>
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" data-testid="custom-formula-stay" onClick={() => void resolvePendingCustomFormulaTransition('stay')}>留在当前公式</button>
              <button type="button" className="toolbar-button danger" data-testid="custom-formula-discard-transition" onClick={() => void resolvePendingCustomFormulaTransition('discard')}>放弃并继续</button>
              <button type="button" className="toolbar-button primary" data-testid="custom-formula-save-transition" onClick={() => void resolvePendingCustomFormulaTransition('save')}>提交修订并继续</button>
            </div>
          </section>
        </div>
      ) : null}
      {pointIdentityDialogOpen && (pendingPointIdentityImport || activePointNeedsIdentity) ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog point-identity-dialog" role="dialog" aria-modal="true" aria-labelledby="point-identity-title" data-testid="point-identity-dialog">
            <div className="confirmation-dialog-heading">
              <div>
                <span>1 / 3 · 确认点位</span>
                <h2 id="point-identity-title">这份数据属于哪个点位？</h2>
              </div>
              <button type="button" className="icon-button" aria-label="稍后确认点位" disabled={pointIdentitySubmitting} onClick={() => setPointIdentityDialogOpen(false)}><X /></button>
            </div>
            <p>点位名称会用于检查、分层、参数和成果。系统不会把“待导入点位”保存为工程点位。</p>
            <p className="short-note">确认点位 → 确认探头与孔压上下文 → 自动检查</p>
            <div className="point-identity-source" data-testid="point-identity-source">
              <span>文件</span>
              <strong>{pendingPointIdentityImport?.fileName ?? importDraft.fileName}</strong>
              <span>有效数据</span>
              <strong>{pendingPointIdentityImport?.parsedImport.pipeline.rows.length ?? importDraft.rows.length} 行</strong>
            </div>
            <label className="dialog-form-field">
              <span>点位名称</span>
              <input
                autoFocus
                value={pointIdentityDraft}
                disabled={pointIdentitySubmitting}
                placeholder="例如 CPT09"
                maxLength={80}
                onChange={(event) => { setPointIdentityDraft(event.target.value); setPointIdentityProblem(''); }}
                onKeyDown={(event) => { if (event.key === 'Enter' && !pointIdentitySubmitting) void confirmPointIdentityAndCheck(); }}
                data-testid="point-identity-name"
              />
            </label>
            {pointIdentityProblem ? <p className="dialog-field-problem" role="alert" data-testid="point-identity-problem">{pointIdentityProblem}</p> : null}
            {pointIdentitySaveFailed && storageFailure ? (
              <div className="dialog-save-diagnosis" role="alert" data-testid="point-identity-save-diagnosis" data-storage-failure={storageFailure.code}>
                <strong>保存失败：{storageFailure.title}</strong>
                <span>{storageFailure.summary}</span>
                {storageNotice?.context ? <span>{storageNotice.context}</span> : null}
                {storageHelpOpen ? <ol>{storageFailure.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
              </div>
            ) : null}
            <p className="short-note">暂不创建时，文件预览会保留在本页，可稍后继续。</p>
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" disabled={pointIdentitySubmitting} onClick={() => setPointIdentityDialogOpen(false)}>暂不创建点位</button>
              <button
                type="button"
                className="toolbar-button primary"
                disabled={pointIdentitySubmitting || !pointIdentityDraft.trim()}
                onClick={() => {
                  if (pointIdentitySaveFailed && storageFailure && !storageFailure.canRetry) {
                    setStorageHelpOpen((open) => !open);
                    return;
                  }
                  void confirmPointIdentityAndCheck();
                }}
                data-testid="confirm-point-identity-and-check"
              >
                {pointIdentitySaveFailed && storageFailure
                  ? storageFailure.canRetry ? '重试创建并保存' : storageHelpOpen ? '收起解决方法' : '查看解决方法'
                  : activePointNeedsIdentity && !pendingPointIdentityImport
                    ? pointIdentitySubmitting ? '正在确认点位…' : '确认点位名称并继续'
                    : pointIdentitySubmitting ? '正在建立点位…' : '创建点位并继续'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {pendingExcelSheetSelection ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="excel-sheet-selection-title" data-testid="excel-sheet-selection-dialog">
            <div className="confirmation-dialog-heading"><div><span>Excel 工作簿</span><h2 id="excel-sheet-selection-title">选择 CPT/CPTU 数据表</h2></div><button type="button" className="icon-button" aria-label="取消选择" onClick={() => setPendingExcelSheetSelection(null)}><X /></button></div>
            <p>工作簿中有多个可识别数据表。请选择本次要导入的 sheet；其他 sheet 不会被合并。</p>
            <div className="excel-sheet-choice-list">{pendingExcelSheetSelection.candidates.map((candidate) => <button type="button" className="toolbar-button" key={candidate.sheetName} onClick={() => void handleImportFile(pendingExcelSheetSelection.file, candidate.sheetName)} data-testid={`excel-sheet-choice-${candidate.sheetName}`}><strong>{candidate.sheetName}</strong><span>{candidate.rowCount} 行 / 表头第 {candidate.headerRow} 行</span></button>)}</div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function readInitialFlowSeed() {
  if (typeof window === 'undefined') {
    return '240709';
  }

  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  if (seed) {
    return seed;
  }

  const sessionSeed = window.sessionStorage.getItem('flow-1-random-seed');
  if (sessionSeed) {
    return sessionSeed;
  }

  const generatedSeed = String(Date.now() % 100000000);
  window.sessionStorage.setItem('flow-1-random-seed', generatedSeed);
  return generatedSeed;
}

function createImportProblem(problem: ImportDraftProblem): ImportDraftProblem {
  return problem;
}

function createBuiltInImportDraft(flowCase: SyntheticFlowCase): ImportDraft {
  return {
    sourceMode: 'built-in-random',
    fileName: `${flowCase.point.pointName}.csv`,
    fileType: '内置随机 CSV',
    status: 'ready',
    message: '内置随机数据已生成，可上传 CSV 替换为真实导入草稿。',
    version: createDraftVersion(),
    headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
    rawPreview: flowCase.rows.slice(0, 5).map((row) => [
      row.pointName,
      String(row.depthM),
      String(row.qcKpa),
      String(row.qtKpa),
      String(row.fsKpa),
      String(row.u2Kpa),
      String(row.frPercent),
      String(row.waterDepthM),
      String(row.finalDepthM),
    ]),
    rows: flowCase.rows,
    problems: [],
    pointName: flowCase.point.pointName,
    filePointNames: [flowCase.point.pointName],
    pointDecision: 'matches-current',
    waterDepthM: flowCase.point.waterDepthM,
    finalDepthM: flowCase.point.finalDepthM,
    generatedAt: flowCase.generatedAt,
  };
}

function createImportErrorDraft(
  flowCase: SyntheticFlowCase,
  fileName: string,
  message: string,
  options: Partial<ImportDraftProblem> & { fileType?: string; sourceMode?: ImportDraft['sourceMode'] } = {},
): ImportDraft {
  return {
    sourceMode: options.sourceMode ?? 'uploaded-csv',
    fileName,
    fileType: options.fileType ?? 'CSV',
    status: 'error',
    message,
    version: createDraftVersion(),
    headers: [],
    rawPreview: [],
    rows: [],
    problems: [
      createImportProblem({
        problemId: options.problemId ?? 'import-parse-error',
        eventId: options.eventId ?? 'DI-E04',
        severity: options.severity ?? 'issue',
        title: options.title ?? '导入文件无法解析',
        message,
        action: options.action ?? '重新上传，或下载模板后整理为 CSV。',
        fieldName: options.fieldName,
        rowIndex: options.rowIndex,
        evidence: options.evidence,
      }),
    ],
    pointName: flowCase.point.pointName,
    filePointNames: [flowCase.point.pointName],
    pointDecision: 'matches-current',
    waterDepthM: flowCase.point.waterDepthM,
    finalDepthM: flowCase.point.finalDepthM,
    generatedAt: new Date().toISOString(),
  };
}

async function parseCptuCsvImportDraft(
  flowCase: SyntheticFlowCase,
  fileName: string,
  text: string,
  options: { allowAnyPoint?: boolean; operationId?: string; baseWorkspaceRevision?: number; sourceAttachment?: RawImportDataBlockV2['sourceAttachment'] } = {},
): Promise<{ draft: ImportDraft; pipeline: CsvImportPipelineV2 }> {
  const now = new Date().toISOString();
  const operationId = options.operationId ?? `upload-${createDraftVersion()}`;
  const pipeline = await createCsvImportPipeline({
    batchId: `batch-${operationId}`,
    operationId,
    baseWorkspaceRevision: options.baseWorkspaceRevision,
    fileName,
    text,
    currentPointName: flowCase.point.pointName,
    defaultWaterDepthM: flowCase.point.waterDepthM,
    defaultFinalDepthM: flowCase.point.finalDepthM,
    allowAnyPoint: options.allowAnyPoint,
    sourceAttachment: options.sourceAttachment,
    now,
  });
  const draft: ImportDraft = {
    ...projectPipelineToLegacyDraft(pipeline, {
      currentPointName: flowCase.point.pointName,
      defaultWaterDepthM: flowCase.point.waterDepthM,
      defaultFinalDepthM: flowCase.point.finalDepthM,
    }),
    version: createDraftVersion(),
    generatedAt: now,
  };
  return { draft, pipeline };
}

async function createSourceAttachment(file: File): Promise<NonNullable<RawImportDataBlockV2['sourceAttachment']>> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: buffer.byteLength,
    sha256: [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''),
    bytes: [...new Uint8Array(buffer)],
  };
}

async function parseCptuExcelImportDraft(
  flowCase: SyntheticFlowCase,
  file: File,
  parsed: Extract<Awaited<ReturnType<typeof parseCptuExcelWorkbook>>, { kind: 'ready' }>,
  options: { allowAnyPoint?: boolean; operationId?: string; baseWorkspaceRevision?: number; sourceAttachment?: RawImportDataBlockV2['sourceAttachment'] } = {},
): Promise<{ draft: ImportDraft; pipeline: CsvImportPipelineV2 }> {
  const now = new Date().toISOString();
  const operationId = options.operationId ?? `upload-${createDraftVersion()}`;
  const sourceProblems: ImportDraftProblem[] = parsed.notices.map((message, index) => createImportProblem({
    problemId: `excel-source-notice-${index + 1}`,
    eventId: 'DI-N01',
    reasonCode: 'EXCEL_SOURCE_RECOGNIZED',
    severity: 'notice',
    title: index === 0 ? 'Excel 数据表已识别' : 'Excel 修正量已重建',
    message,
    action: '核对来源摘要和预览行；无须修改时可继续检查。',
    recoveryTarget: 'source-file',
  }));
  const pipeline = await createTabularImportPipeline({
    batchId: `batch-${operationId}`,
    operationId,
    baseWorkspaceRevision: options.baseWorkspaceRevision,
    fileName: file.name,
    sourceFingerprint: parsed.sourceFingerprint,
    sourceKind: 'excel',
    headers: parsed.headers,
    rows: parsed.rows,
    displayRowNumbers: parsed.displayRowNumbers,
    sourceProblems,
    sourceSheetName: parsed.metadata.sheetName,
    sourceHeaderRow: parsed.metadata.headerRow,
    sourceWorkbookSheets: parsed.metadata.workbookSheets.map((sheet) => ({ sheetName: sheet.sheetName, rowCount: sheet.rowCount, columnCount: sheet.columnCount, state: sheet.state })),
    sourceParseDurationMs: parsed.metadata.parseDurationMs,
    sourceOriginalFileSize: parsed.metadata.originalFileSize,
    sourceWorkbookExtraction: parsed.sourceWorkbookExtraction,
    sourceAttachment: options.sourceAttachment,
    sourceColumnOrigins: parsed.sourceColumnOrigins,
    currentPointName: flowCase.point.pointName,
    defaultWaterDepthM: parsed.metadata.waterDepthM || flowCase.point.waterDepthM,
    defaultFinalDepthM: parsed.metadata.finalDepthM || flowCase.point.finalDepthM,
    allowAnyPoint: options.allowAnyPoint,
    now,
  });
  const draft: ImportDraft = {
    ...projectPipelineToLegacyDraft(pipeline, {
      currentPointName: flowCase.point.pointName,
      defaultWaterDepthM: parsed.metadata.waterDepthM || flowCase.point.waterDepthM,
      defaultFinalDepthM: parsed.metadata.finalDepthM || flowCase.point.finalDepthM,
    }),
    version: createDraftVersion(),
    generatedAt: now,
  };
  return { draft, pipeline };
}

function importTargetFieldLabel(field: string) {
  const labels: Record<string, string> = {
    PointName: '点位编号',
    DepthM: '深度',
    QcKpa: '锥尖阻力 qc',
    QtKpa: '修正锥尖阻力 qt',
    FsKpa: '侧阻 fs',
    U2Kpa: '孔压 u2',
    FrPercent: '摩阻比 Fr',
    WaterDepthM: '水深',
    FinalDepthM: '最终孔深',
  };
  return labels[field] ?? field;
}

function importTargetFieldLabelV2(field: TargetFieldKey) {
  const labels: Record<TargetFieldKey, string> = {
    pointName: '点位编号',
    depthM: '深度',
    qc: '锥尖阻力 qc',
    qt: '修正锥尖阻力 qt',
    fs: '侧阻 fs',
    u2: '孔压 u2',
    fr: '摩阻比 Fr',
    waterDepth: '水深',
    finalDepth: '最终孔深',
  };
  return labels[field];
}

function getImportMappingRowsV2(pipeline: CsvImportPipelineV2) {
  return [...pipeline.sourceColumns]
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map((column) => {
      const mapping = pipeline.mappings.find((decision) => decision.sourceColumnId === column.columnId);
      const unit = mapping
        ? pipeline.unitDecisions.find((decision) =>
            decision.targetField === mapping.targetField && decision.sourceColumnId === column.columnId,
          )
        : null;
      return {
        column,
        mapping,
        unit,
        targetLabel: mapping ? importTargetFieldLabelV2(mapping.targetField) : '未映射',
        mappingLabel: mapping
          ? mapping.state === 'confirmed'
            ? '映射已确认'
            : mapping.state === 'candidate'
              ? '待确认'
              : '存在冲突'
          : '未映射',
        unitLabel: unit
          ? unit.state === 'confirmed' || unit.state === 'not-applicable'
            ? unit.selectedUnit ?? '不适用'
            : unit.state === 'conflict'
              ? '单位冲突'
              : '待确认'
          : '—',
      };
    });
}

function getSelectedImportSourceColumn(pipeline: CsvImportPipelineV2, selectedField: string) {
  return pipeline.sourceColumns.find((column) => column.header === selectedField || column.columnId === selectedField)
    ?? pipeline.sourceColumns.find((column) =>
      pipeline.mappings.some((mapping) =>
        mapping.sourceColumnId === column.columnId
        && (mapping.targetField === selectedField
          || IMPORT_TARGET_DEFINITIONS.find((definition) => definition.targetField === mapping.targetField)?.standardHeader === selectedField),
      ),
    )
    ?? pipeline.sourceColumns[0]
    ?? null;
}

function getImportProblemSourceColumn(pipeline: CsvImportPipelineV2, problemValue: ImportDraftProblem) {
  const targetField = IMPORT_TARGET_DEFINITIONS.find((definition) =>
    definition.label === problemValue.fieldName
    || definition.standardHeader === problemValue.fieldName
    || definition.targetField === problemValue.fieldName,
  )?.targetField;
  return pipeline.sourceColumns.find((column) => column.columnId === problemValue.sourceColumnId)
    ?? pipeline.sourceColumns.find((column) =>
      targetField && pipeline.mappings.some((mapping) =>
        mapping.targetField === targetField && mapping.sourceColumnId === column.columnId,
      ),
    )
    ?? pipeline.sourceColumns.find((column) =>
      targetField && column.mappingCandidates.some((candidate) => candidate.targetField === targetField),
    )
    ?? null;
}

function getActiveImportProblems(pipeline: CsvImportPipelineV2 | null | undefined, draft: ImportDraft) {
  if (!pipeline) return draft.problems;
  const relevantPipelineProblems = pipeline.problems.filter((problem) => {
    if (problem.eventId === 'DI-E11' && pipeline.pointPlan.strategy !== 'pending') return false;
    if (problem.eventId === 'DI-E10' && problem.detectedPointKey) {
      const decision = pipeline.pointPlan.targetDecisions?.find((candidate) => candidate.detectedPointKey === problem.detectedPointKey);
      if (decision?.state === 'confirmed' && decision.action !== 'pending') return false;
    }
    if (
      problem.detectedPointKey
      && ['split-all', 'split-selected'].includes(pipeline.pointPlan.strategy)
      && !pipeline.pointPlan.selectedPointKeys.includes(problem.detectedPointKey)
    ) return false;
    return true;
  });
  const draftProblems = draft.problems.filter((problem) => relevantPipelineProblems.some(
    (candidate) => importProblemIdentity(candidate) === importProblemIdentity(problem),
  ));
  const draftProblemKeys = new Set(draftProblems.map(importProblemIdentity));
  return [
    ...draftProblems,
    ...relevantPipelineProblems.filter((problem) => !draftProblemKeys.has(importProblemIdentity(problem))),
  ];
}

function getImportPointPlanRows(pipeline: CsvImportPipelineV2) {
  return pipeline.pointPlan.detectedPoints.map((point) => {
    const rows = pipeline.rows.filter((row) => normalizePointDisplayKey(row.pointName) === point.pointKey);
    const depths = rows.map((row) => row.depthM);
    const decision = pipeline.pointPlan.targetDecisions?.find((candidate) => candidate.detectedPointKey === point.pointKey);
    const execution = pipeline.pointPlan.executions.find((candidate) => candidate.detectedPointKey === point.pointKey);
    const problemCount = pipeline.problems.filter((problem) =>
      problem.severity === 'issue'
      && problem.detectedPointKey === point.pointKey
      && !['DI-E10', 'DI-E11'].includes(problem.eventId),
    ).length;
    return {
      ...point,
      selected: pipeline.pointPlan.selectedPointKeys.includes(point.pointKey),
      depthRange: depths.length ? `${Math.min(...depths).toFixed(2)}-${Math.max(...depths).toFixed(2)} m` : '无可用深度',
      decision,
      execution,
      problemCount,
    };
  });
}

function pointDecisionActionLabel(action: PointTargetDecisionV2['action'] | undefined) {
  return {
    'create-point': '新建点位',
    'append-draft': '追加新草稿',
    'replace-active-draft': '替换活动草稿',
    'rename-and-create': '重命名后新建',
    skip: '跳过',
    pending: '待决定',
  }[action ?? 'pending'];
}

function pointExecutionLabel(status: CsvImportPipelineV2['pointPlan']['executions'][number]['status'] | undefined) {
  return {
    pending: '待生成',
    generated: '已生成',
    skipped: '已跳过',
    problem: '存在问题',
    failed: '生成失败',
  }[status ?? 'pending'];
}

function pointDecisionReason(reason: PointTargetDecisionV2['reasonCode'] | undefined) {
  return {
    'POINT-TARGET-REQUIRED': '需要选择目标点位。',
    'POINT-TARGET-NOT-FOUND': '目标点位已经不存在，请重新选择。',
    'POINT-TARGET-DUPLICATE': '该目标点位已分配给本批次中的另一个源点位，请选择其他目标。',
    'POINT-NAME-REQUIRED': '请输入新的点位名称。',
    'POINT-NAME-CONFLICT': '点位名称或别名已被占用，请更换名称。',
    'POINT-ACTIVE-DRAFT-CHANGED': '目标点位的活动草稿已经变化，请重新确认。',
  }[reason ?? 'POINT-TARGET-REQUIRED'];
}

function normalizePointDisplayKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function importProblemIdentity(problem: ImportDraftProblem) {
  return [
    problem.eventId,
    problem.fieldName ?? '',
    problem.sourceRowId ?? '',
    problem.detectedPointKey ?? '',
  ].join('|');
}

function getImportFieldPreviewRows(
  pipeline: CsvImportPipelineV2,
  targetField: TargetFieldKey | null,
  focusSourceRowId?: string | null,
  focusDisplayRow?: number | null,
) {
  if (!targetField) return [];
  const focusedRow = pipeline.normalizedRows.find((row) => row.sourceRowId === focusSourceRowId)
    ?? pipeline.normalizedRows.find((row) => row.displayRowNumber === focusDisplayRow);
  const visibleRows = focusedRow && !pipeline.normalizedRows.slice(0, 12).includes(focusedRow)
    ? [...pipeline.normalizedRows.slice(0, 11), focusedRow]
    : pipeline.normalizedRows.slice(0, 12);
  return visibleRows.map((row) => ({
    sourceRowId: row.sourceRowId,
    displayRowNumber: row.displayRowNumber,
    value: row.values[targetField] ?? null,
    hasProblem: row.problems.some((problem) => problem.fieldName === IMPORT_TARGET_DEFINITIONS.find((definition) => definition.targetField === targetField)?.label),
  }));
}

function formatImportNormalizedValue(value: string | number | null | undefined, targetField?: TargetFieldKey | '') {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (targetField === 'depthM' || targetField === 'waterDepth' || targetField === 'finalDepth') return value.toFixed(3);
    if (targetField === 'qc' || targetField === 'qt' || targetField === 'fs' || targetField === 'u2') return value.toFixed(2);
    if (targetField === 'fr') return value.toFixed(3);
    return Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
  }
  return value;
}

function importValueOriginLabel(value: CsvImportPipelineV2['normalizedRows'][number]['values'][TargetFieldKey] | null | undefined) {
  if (value?.origin === 'defaulted') return `默认补齐：${value.defaultReason ?? '未提供源字段'}`;
  if (value?.origin === 'derived') return `派生：${value.derivedFrom?.map(importTargetFieldLabelV2).join('、') || '其他字段'}`;
  return {
    'assistant-cleanup': 'AI 整理草稿',
    source: '源字段',
    missing: '缺失',
  }[value?.origin ?? 'missing'];
}

function getImportDraftProjectPointSummary(flowCase: SyntheticFlowCase, draft: ImportDraft): ProjectPointSummary {
  const base = getSyntheticProjectPointSummary(flowCase);
  if (!draft.rows.length) {
    return {
      ...base,
      pointName: draft.pointName,
      sourceFiles: [draft.fileName],
      sourceType: draft.fileType,
      sourceRecordCount: '0',
      previewRecordCount: 0,
      sourceDepthRange: '待解析',
      previewDepthRange: '待解析',
      availablePoints: [
        {
          pointId: draft.pointName,
          pointName: draft.pointName,
          alias: draft.status === 'needs-parser' ? '待解析文件' : '导入草稿',
          status: '需处理',
          recordCount: '0',
          depthRange: '待解析',
        },
        ...base.availablePoints.slice(1),
      ],
    };
  }

  const depths = draft.rows.map((row) => row.depthM);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  return {
    ...base,
    pointName: draft.pointName,
    pointAlias: isUploadedImportDraft(draft) ? '上传点位' : base.pointAlias,
    pointScope: pointScope(draft.pointName),
    sourceFiles: [draft.fileName],
    sourceType: draft.fileType,
    sourceRecordCount: String(draft.rows.length),
    previewRecordCount: Math.min(12, draft.rows.length),
    sourceDepthRange: `${minDepth.toFixed(2)}-${draft.finalDepthM.toFixed(1)} m`,
    previewDepthRange: `${minDepth.toFixed(2)}-${maxDepth.toFixed(2)} m`,
    waterDepthM: draft.waterDepthM,
    finalDepthM: draft.finalDepthM,
    availablePoints: [
      {
        pointId: draft.pointName,
        pointName: draft.pointName,
        alias: isUploadedImportDraft(draft) ? '上传点位' : base.pointAlias,
        status: '已选择',
        recordCount: String(draft.rows.length),
        depthRange: `${minDepth.toFixed(2)}-${maxDepth.toFixed(2)} m`,
      },
      ...base.availablePoints.slice(1),
    ],
  };
}

function isUploadedImportDraft(draft: ImportDraft) {
  return draft.sourceMode === 'uploaded-csv' || draft.sourceMode === 'uploaded-excel';
}

function getImportDraftFieldMappings(draft: ImportDraft) {
  const matches = getImportHeaderMatches(draft.headers);
  if (draft.headers.length) {
    const rows = [
      { key: 'pointName', fallback: 'PointName', targetField: '点位编号', note: `${draft.pointName} 已绑定为当前导入草稿点位。` },
      { key: 'depthM', fallback: 'DepthM', targetField: '深度', note: '深度标准单位为 m，检查页会验证逐点递增和最终孔深。' },
      { key: 'qc', fallback: 'QcKpa', targetField: '锥尖阻力 qc', note: 'qc 标准单位为 kPa，用于后续数据检查和证据预览。' },
      { key: 'qt', fallback: 'QtKpa', targetField: '修正锥尖阻力 qt', note: '缺失时由 qc 派生，并在标准化来源中标记。' },
      { key: 'fs', fallback: 'FsKpa', targetField: '侧阻 fs', note: '缺失时保留提示，并在标准化来源中标记。' },
      { key: 'u2', fallback: 'U2Kpa', targetField: '孔压 u2', note: '缺失时保留提示，并在标准化来源中标记。' },
      { key: 'fr', fallback: 'FrPercent', targetField: '摩阻比 Fr', note: '缺失时由 Fs/Qt 派生，并在标准化来源中标记。' },
      { key: 'waterDepth', fallback: 'WaterDepthM', targetField: '水深', note: '水深来自上传字段或当前点位，并保留来源。' },
      { key: 'finalDepth', fallback: 'FinalDepthM', targetField: '最终孔深', note: '最终孔深用于逐点判断深度范围是否可继续。' },
    ];
    return rows.map((row) => {
      const sourceField = matches[row.key as keyof typeof matches] || row.fallback;
      const missingProblem = draft.problems.find((problem) => problem.fieldName === row.fallback && problem.severity === 'issue');
      const optionalNotice = draft.problems.find((problem) => problem.fieldName === row.fallback && problem.severity === 'notice');
      return {
        sourceField,
        targetField: row.targetField,
        status: matches[row.key as keyof typeof matches] && !missingProblem ? 'matched' : 'warning',
        note: missingProblem?.message ?? optionalNotice?.message ?? row.note,
      };
    }) satisfies ReturnType<typeof getImportFieldMappings>;
  }

  if (draft.status !== 'ready') {
    return STANDARD_IMPORT_TEMPLATE_FIELDS.map((field) => ({
      sourceField: field,
      targetField: importTargetFieldLabel(field),
      status: 'warning',
      note: draft.message,
    })) satisfies ReturnType<typeof getImportFieldMappings>;
  }

  return [
    { sourceField: 'PointName', targetField: '点位编号', status: 'matched', note: `${draft.pointName} 已绑定为当前导入草稿点位。` },
    { sourceField: 'DepthM', targetField: '深度', status: 'matched', note: '深度单位按 m 读取，检查页会验证递增和最终孔深。' },
    { sourceField: 'Qc / Qt', targetField: '锥尖阻力', status: 'matched', note: 'qc 和 qt 按 kPa 读取，用于后续数据检查和证据预览。' },
    { sourceField: 'Fs / Fr', targetField: '侧阻与摩阻比', status: 'matched', note: 'Fs 按 kPa 读取，Fr 按 % 读取或由 Fs/Qt 派生。' },
    { sourceField: 'U2', targetField: '孔压', status: 'matched', note: 'U2 按 kPa 读取，并保留来源用于数据检查。' },
    { sourceField: 'WaterDepthM', targetField: '水深', status: 'warning', note: '水深来自上传文件或随机草稿，进入后续成果前仍需复核来源。' },
    { sourceField: 'FinalDepthM', targetField: '最终孔深', status: 'matched', note: '最终孔深用于判断深度范围是否可继续。' },
  ] satisfies ReturnType<typeof getImportFieldMappings>;
}

function getImportDraftPreviewRows(draft: ImportDraft): ImportPreviewRow[] {
  return draft.rows.slice(0, 12).map((row) => ({
    depthM: row.depthM,
    qcKpa: row.qcKpa,
    qtKpa: row.qtKpa,
    fsKpa: row.fsKpa,
    u2Kpa: row.u2Kpa,
    frPercent: row.frPercent,
  }));
}

function Explorer({
  activeRoute,
  summary,
  project,
  projects,
  onOpenRoute,
  onOpenProjectHub,
  onOpenProject,
  checkHandoffState,
  stratificationHandoffState,
  workspaceProject,
  onPointLifecycle,
}: {
  activeRoute: RouteId;
  summary: ProjectPointSummary;
  project: ProjectWorkspace;
  projects: ProjectWorkspace[];
  onOpenRoute: (route: RouteId) => void;
  onOpenProjectHub: () => void;
  onOpenProject: (projectId: string) => void;
  checkHandoffState: 'allow' | 'warn' | 'deny';
  stratificationHandoffState: 'allow' | 'warn' | 'deny';
  workspaceProject?: ProjectWorkspaceV2;
  onPointLifecycle?: (command: PointLifecycleCommand) => PointLifecycleResult;
}) {
  const groups: Array<{ title: string; routeIds: RouteId[] }> = [
    { title: '数据准备区', routeIds: ['project', 'import'] },
    { title: '数据检查区', routeIds: ['check'] },
    { title: '地层分层区', routeIds: ['stratification'] },
    { title: '参数解译区', routeIds: ['parameters'] },
    { title: '成果输出区', routeIds: ['output'] },
  ];
  const feedbackPageLabel = workflowItems.find((item) => item.id === activeRoute)?.label ?? '工程工作台';

  return (
    <aside className="explorer" data-testid="explorer-pane">
      <button type="button" className="workspace-switcher workspace-switcher-button" data-testid="workspace-project-switcher" onClick={onOpenProjectHub}>
        <span className="mixpanel-mark" aria-hidden="true">C</span>
        <strong>SIGS-OGLab</strong>
        <span>{project.projectName || summary.projectName}</span>
        <ChevronDown className="tree-chevron" />
      </button>
      {projects.length > 1 ? (
        <div className="project-switch-list" data-testid="project-switch-list">
          {projects.slice(0, 4).map((candidate) => (
            <button
              type="button"
              key={candidate.projectId}
              className={candidate.projectId === project.projectId ? 'active' : ''}
              onClick={() => onOpenProject(candidate.projectId)}
              data-testid={`switch-project-${candidate.projectId}`}
            >
              {candidate.projectName}
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="sidebar-create-button" data-testid="sidebar-create-analysis" onClick={onOpenProjectHub}>
        新建项目
      </button>
      <div className="sidebar-search" aria-label="查找点位或方案">
        <Search className="button-icon" />
        <span>查找点位或方案</span>
        <kbd>⌘ K</kbd>
      </div>
      <div className="tree">
        {workspaceProject ? (
          <div className="workflow-group point-tree-group" data-testid="workspace-point-tree">
            <div className="pane-title">项目点位</div>
            <div className="workflow-tree">
              <button
                type="button"
                className={`tree-node project-tree-root ${activeRoute === 'project' ? 'selected' : ''}`}
                onClick={() => onOpenRoute('project')}
                data-testid="point-tree-project"
              >
                <FolderOpen className="node-icon" />
                <span className="node-label">{workspaceProject.projectName}</span>
                <span className="tree-count">{workspaceProject.points.length}</span>
              </button>
              {workspaceProject.points.length ? workspaceProject.points.map((point) => {
                const active = point.pointId === workspaceProject.activePointId;
                const hasDraft = Boolean(point.activeImportDraftId);
                return (
                  <div className={`point-tree-branch ${active ? 'expanded' : ''}`} key={point.pointId}>
                    <button
                      type="button"
                      className={`tree-node point-tree-node ${active ? 'selected' : ''}`}
                      onClick={() => onPointLifecycle?.({ kind: 'select', pointId: point.pointId })}
                      data-testid={`point-tree-${point.pointId}`}
                    >
                      <ChevronDown className={`tree-chevron ${active ? '' : 'collapsed'}`} />
                      <Database className="node-icon" />
                      <span className="node-label">{point.pointName}</span>
                      <span className={`point-tree-state ${hasDraft ? 'ready' : 'empty'}`}>{hasDraft ? '有数据' : '待导入'}</span>
                    </button>
                    {active ? (
                      <div className="point-route-children" data-testid="active-point-routes">
                        {groups.flatMap((group) => group.routeIds.map((routeId) => ({ routeId, group: group.title }))).map(({ routeId, group }, index, rows) => {
                          const item = workflowItems.find((candidate) => candidate.id === routeId);
                          if (!item) return null;
                          const Icon = item.icon;
                          const showGroup = index === 0 || rows[index - 1].group !== group;
                          return (
                            <div key={routeId}>
                              {showGroup ? <span className="point-route-group-label">{group}</span> : null}
                              <button
                                type="button"
                                className={`tree-node point-route-node ${activeRoute === routeId ? 'selected' : ''}`}
                                onClick={() => onOpenRoute(routeId)}
                                data-testid={`explorer-${routeId}`}
                                data-handoff-state={routeId === 'stratification' ? checkHandoffState : routeId === 'parameters' ? stratificationHandoffState : undefined}
                              >
                                <Icon className="node-icon" />
                                <span className="node-label">{item.label}</span>
                                {routeId === 'stratification' && checkHandoffState !== 'allow' ? <span className={`nav-dot ${checkHandoffState === 'deny' ? 'issue' : 'review'}`} /> : null}
                                {routeId === 'parameters' && stratificationHandoffState !== 'allow' ? <span className={`nav-dot ${stratificationHandoffState === 'deny' ? 'issue' : 'review'}`} /> : null}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }) : (
                <div>
                  <div className="point-tree-empty" data-testid="point-tree-empty">暂无点位，可从右侧“点位工具”新建，或先进入数据导入识别点名。</div>
                  <div className="point-route-children empty-project-routes">
                    {groups.flatMap((group) => group.routeIds).map((routeId) => {
                      const item = workflowItems.find((candidate) => candidate.id === routeId);
                      if (!item) return null;
                      const Icon = item.icon;
                      return (
                        <button type="button" key={routeId} className={`tree-node point-route-node ${activeRoute === routeId ? 'selected' : ''}`} onClick={() => onOpenRoute(routeId)} data-testid={`explorer-${routeId}`} data-handoff-state={routeId === 'stratification' ? checkHandoffState : routeId === 'parameters' ? stratificationHandoffState : undefined}>
                          <Icon className="node-icon" /><span className="node-label">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : groups.map((group) => (
          <div className="workflow-group" key={group.title}>
            <div className="pane-title">{group.title}</div>
            <div className="workflow-tree">
              {group.routeIds.map((routeId) => {
                const item = workflowItems.find((workflowItem) => workflowItem.id === routeId);
                if (!item) {
                  return null;
                }
                const Icon = item.icon;
                const hasAttention = routeId === 'stratification' || routeId === 'parameters' || routeId === 'output';
                const attentionKind = routeId === 'stratification'
                  ? checkHandoffState === 'deny' ? 'issue' : checkHandoffState === 'warn' ? 'review' : null
                  : routeId === 'parameters'
                    ? stratificationHandoffState === 'deny' ? 'issue' : stratificationHandoffState === 'warn' ? 'review' : null
                  : 'issue';
                return (
                  <button
                    type="button"
                    className={`tree-node ${activeRoute === item.id ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => onOpenRoute(item.id)}
                    data-testid={`explorer-${item.id}`}
                    data-handoff-state={routeId === 'stratification'
                      ? checkHandoffState
                      : routeId === 'parameters'
                        ? stratificationHandoffState
                        : undefined}
                    aria-current={activeRoute === item.id ? 'page' : undefined}
                  >
                    <Icon className="node-icon" />
                    <span className="node-label">{item.label}</span>
                    {routeId === 'stratification' && checkHandoffState !== 'allow' ? (
                      <span className={`nav-gate-label ${checkHandoffState}`}>
                        {checkHandoffState === 'deny' ? '需检查' : '有提示'}
                      </span>
                    ) : null}
                    {routeId === 'parameters' && stratificationHandoffState !== 'allow' ? (
                      <span className={`nav-gate-label ${stratificationHandoffState}`}>
                        {stratificationHandoffState === 'deny' ? '需分层' : '有提示'}
                      </span>
                    ) : null}
                    {hasAttention && attentionKind ? (
                      <span
                        className={`nav-dot ${attentionKind}`}
                        aria-label={routeId === 'output'
                          ? '成果清单需确认'
                          : routeId === 'parameters'
                            ? stratificationHandoffState === 'deny' ? '地层分层尚未满足' : '分层提示需留意'
                            : checkHandoffState === 'deny' ? '数据检查尚未满足' : '检查提示需留意'}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="explorer-footer">
        <div>
          <strong>{summary.pointName}</strong>
          <span>{summary.pointAlias} / 本机工作区</span>
        </div>
        <div className="sidebar-utility-row" aria-label="工具">
          <ProjectFeedbackLauncher pageLabel={feedbackPageLabel} placement="sidebar" />
        </div>
      </div>
    </aside>
  );
}

function RightPanelShell({
  title,
  eyebrow = '检查器',
  showTabs = true,
  children,
}: {
  title: string;
  eyebrow?: string;
  showTabs?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="panel-content query-panel-content">
      <div className="right-title">
        <span>{eyebrow}</span>
        <strong data-testid="right-panel-title">{title}</strong>
      </div>
      {showTabs ? (
        <div className="right-tabs" role="tablist" aria-label="右侧面板" data-testid="right-tabs">
          <button type="button" className="active" role="tab" aria-selected="true">检查</button>
          <button type="button" role="tab" aria-selected="false">图表</button>
          <button type="button" role="tab" aria-selected="false">注释</button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

type PreparationGuideState = 'done' | 'current' | 'problem' | 'pending';

function PreparationGuide({
  currentStep,
  probeConfirmed,
  importReady,
  waterConfirmed,
  checkReady,
}: {
  currentStep: number;
  probeConfirmed: boolean;
  importReady: boolean;
  waterConfirmed: boolean;
  checkReady: boolean;
}) {
  const states: PreparationGuideState[] = [
    probeConfirmed ? 'done' : currentStep === 1 ? 'problem' : 'pending',
    importReady ? 'done' : currentStep === 2 ? 'current' : 'pending',
    waterConfirmed ? 'done' : currentStep === 3 ? 'problem' : 'pending',
    checkReady ? 'done' : currentStep === 4 ? 'current' : 'pending',
    checkReady && currentStep >= 5 ? 'current' : 'pending',
  ];
  const labels = [
    ['确认探头', probeConfirmed ? '已确认' : '需要选择'],
    ['导入数据', importReady ? '已完成' : '等待文件'],
    ['确认水与孔压', waterConfirmed ? '已确认' : '需要选择'],
    ['数据检查', checkReady ? '已通过' : '尚未完成'],
    ['地层分层', checkReady ? '可以进入' : '等待检查'],
  ];
  return (
    <nav className="preparation-guide" aria-label="数据准备指南" data-testid="preparation-guide">
      {labels.map(([label, meta], index) => (
        <div className={`preparation-guide-step ${states[index]}`} data-state={states[index]} key={label}>
          <span>{states[index] === 'done' ? '✓' : index + 1}</span>
          <div><strong>{label}</strong><small>{meta}</small></div>
        </div>
      ))}
    </nav>
  );
}

function ProjectPointDocument({
  flowCase,
  summary,
  selectedPointId,
  onOpenRoute,
  onSelectPoint,
  isPersistentWorkspace,
  workspaceProject,
  onPointLifecycle,
  checkReady,
}: {
  flowCase: SyntheticFlowCase;
  summary: ProjectPointSummary;
  selectedPointId: string;
  onOpenRoute: (route: RouteId) => void;
  onSelectPoint: (pointId: string) => void;
  isPersistentWorkspace: boolean;
  workspaceProject?: ProjectWorkspaceV2;
  onPointLifecycle?: (command: PointLifecycleCommand) => PointLifecycleResult;
  checkReady: boolean;
}) {
  const activePoint = workspaceProject?.points.find((point) => point.pointId === workspaceProject.activePointId) ?? null;
  const guideRequired = Boolean(workspaceProject && workspaceProject.mode !== 'demo');
  const probeConfirmed = !activePoint || Boolean(activePoint.probeContext.confirmedAt) || !guideRequired;
  const waterConfirmed = !activePoint || Boolean(activePoint.waterContext.confirmedAt && !['unknown', 'partial'].includes(activePoint.waterContext.channelState)) || !guideRequired;
  const [probeGuideDismissed, setProbeGuideDismissed] = useState(false);
  const [probeGuideProblem, setProbeGuideProblem] = useState('');
  const [probeGuideChoice, setProbeGuideChoice] = useState<'recommended' | 'manual'>('recommended');
  useEffect(() => {
    setProbeGuideDismissed(false);
    setProbeGuideProblem('');
    setProbeGuideChoice('recommended');
  }, [activePoint?.pointId]);
  const hasProjectData = summary.sourceRecordCount !== '0' && summary.sourceDepthRange !== '待解析';
  const firstLookState = checkReady ? '已检查' : hasProjectData ? '待核对导入' : '暂无数据';
  const firstLookTitle = checkReady
    ? '数据检查已通过，可进入地层分层'
    : hasProjectData
      ? '当前点位已准备好数据草稿'
      : '当前项目还没有 CPT/CPTU 数据';
  const firstLookBody = checkReady
    ? '当前点位的导入与检查依据已确认。下一步进入地层分层。'
    : hasProjectData
      ? '下一步先核对导入草稿的字段、单位和预览范围，再进入数据检查。'
      : '下一步先进入数据导入，上传 CPT/CPTU CSV 或 Excel 后再进行数据检查。';
  const firstLookAction = checkReady ? '进入地层分层' : hasProjectData ? '核对导入' : '导入 CPT/CPTU 数据';
  return (
    <div
      className="project-document analysis-page mixpanel-report"
      data-testid="document-project"
      data-flow={flowCase.flowId}
      data-case-id={flowCase.caseId}
      data-flow-step="select-point"
    >
      <FlowCaseBanner flowCase={flowCase} route="project" />
      <PreparationGuide
        currentStep={checkReady ? 5 : probeConfirmed ? (hasProjectData ? (waterConfirmed ? 4 : 3) : 2) : 1}
        probeConfirmed={probeConfirmed}
        importReady={hasProjectData}
        waterConfirmed={waterConfirmed}
        checkReady={checkReady}
      />
      <header className="analysis-header mixpanel-report-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">{isPersistentWorkspace ? '点位工作区 / 项目与点位' : '随机 CPTU 案例 / 项目与点位'}</div>
          <div className="analysis-title-row">
            <h1>项目/点位数据</h1>
            <span className={`status-pill ${hasProjectData ? 'status-success' : 'status-warning'}`}>
              {hasProjectData ? '已选择点位' : '待导入数据'}
            </span>
          </div>
          <div className="analysis-subtitle">
            <strong>{summary.projectName}</strong>
            <span data-testid="project-current-point">{summary.pointName}</span>
            {!isPersistentWorkspace ? <span>{summary.caseId}</span> : null}
            {hasProjectData ? (
              <>
                <span>水深 {summary.waterDepthM.toFixed(1)} m</span>
                <span>最终孔深 {summary.finalDepthM.toFixed(1)} m</span>
              </>
            ) : (
              <span>数据待导入</span>
            )}
          </div>
        </div>
      </header>

      <PageDecisionBand
        testId="project-first-look"
        tone={checkReady || hasProjectData ? 'primary' : 'issue'}
        className={`project-first-look ${checkReady || hasProjectData ? 'ready' : 'empty'}`}
        title={firstLookTitle}
        description={firstLookBody}
        primaryAction={(
          <button
            type="button"
            className="toolbar-button primary project-first-action"
            data-testid="project-primary-next"
            onClick={() => probeConfirmed ? onOpenRoute(checkReady ? 'stratification' : 'import') : setProbeGuideDismissed(false)}
          >
            {probeConfirmed ? firstLookAction : '先确认探头'}
          </button>
        )}
        stateLabel={firstLookState}
        stateMeta={checkReady ? '下一步：地层分层' : '当前点位'}
      />

      <section className="mixpanel-metrics-row project-metrics secondary-summary" aria-label="项目与点位摘要">
        <MetricInline label={isPersistentWorkspace ? '项目点位' : '随机点位'} value={`${summary.totalPointCount} 个`} />
        <MetricInline label="生成行数" value={`${summary.sourceRecordCount} 行`} />
        <MetricInline label="深度范围" value={summary.sourceDepthRange} />
        <MetricInline label="来源类型" value={summary.sourceType} tone="warn" />
      </section>

      <section className="project-workspace-grid">
        <div className="project-main-panel pro-panel">
          <div className="section-header">
            <div>
              <h2>点位列表</h2>
              <span>{isPersistentWorkspace ? '选择点位后，工作流会读取该点位的独立状态。' : '当前随机点位用于 Flow 1 验收；其他点位只作为干扰项。'}</span>
            </div>
          </div>
          <div className="point-table-wrap">
            <table className="point-table">
              <thead>
                <tr>
                  <th>点位</th>
                  <th>记录数</th>
                  <th>深度范围</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {summary.availablePoints.map((point) => (
                  <tr
                    key={point.pointId}
                    className={point.pointId === selectedPointId ? 'selected' : ''}
                    data-testid={`project-point-${point.pointId}`}
                    onClick={() => onSelectPoint(point.pointId)}
                  >
                    <td>{point.pointName}</td>
                    <td>{point.recordCount}</td>
                    <td>{point.depthRange}</td>
                    <td>
                      <span className={`inline-state ${point.status === '已检查' || point.pointId === selectedPointId ? 'ok' : point.status === '存在问题' || point.status === '需重新检查' ? 'warn' : 'muted'}`}>
                        {point.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="project-side-stack">
          <section className="project-main-panel pro-panel">
            <div className="section-header">
              <div>
              <h2>数据覆盖</h2>
                <span>{isPersistentWorkspace ? '显示当前点位的数据来源和深度覆盖。' : '随机数据用于验证 Flow，不依赖固定历史样例。'}</span>
              </div>
            </div>
            <div className="readiness-list" data-testid="project-coverage-summary">
              <div className="readiness-row">
                <span>{isPersistentWorkspace ? '数据来源' : '随机来源'}</span>
                <strong>{summary.sourceFiles.join(' / ')}</strong>
              </div>
              <div className="readiness-row">
                <span>源档案深度</span>
                <strong>{summary.sourceDepthRange}</strong>
              </div>
              <div className="readiness-row">
                <span>预览深度</span>
                <strong>{summary.previewDepthRange}</strong>
              </div>
              <div className="readiness-row">
                <span>当前交接物</span>
                <strong>{checkReady ? '数据检查已通过' : '待核对导入'}</strong>
              </div>
            </div>
          </section>

          <section className="project-main-panel pro-panel">
            <div className="section-header">
              <div>
              <h2>使用边界</h2>
                <span>{isPersistentWorkspace ? '当前点位拥有独立导入与检查状态。' : '随机案例只服务原型验收，不写入工程数据。'}</span>
              </div>
            </div>
            <div className="checklist compact-checklist">
              <span><CheckCircle2 className="mini-icon" />{isPersistentWorkspace ? '项目工作区已读取' : '随机工程已生成'}</span>
              <span>{activePoint ? <CheckCircle2 className="mini-icon" /> : <ClipboardList className="mini-icon" />}{activePoint ? '当前点位已选择' : '尚未选择点位'}</span>
              <span><CheckCircle2 className="mini-icon" />{checkReady ? '下一步进入地层分层' : '下一步核对字段映射'}</span>
            </div>
          </section>
        </div>
      </section>
      {activePoint && !probeConfirmed && !probeGuideDismissed ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog preparation-dialog" role="dialog" aria-modal="true" aria-labelledby="probe-guide-title" data-testid="probe-guide-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>数据准备 · 第 1 步</span><h2 id="probe-guide-title">本点位使用哪种探头？</h2></div>
              <button type="button" className="icon-button" aria-label="暂不确认" onClick={() => setProbeGuideDismissed(true)}><X /></button>
            </div>
            <p>探头规格会影响孔压修正。大多数 JTS 数据可直接使用推荐配置。</p>
            <div className="guided-choice-list">
              <button
                type="button"
                className={`guided-choice recommended ${probeGuideChoice === 'recommended' ? 'selected' : ''}`}
                aria-pressed={probeGuideChoice === 'recommended'}
                data-testid="probe-guide-choice-recommended"
                onClick={() => setProbeGuideChoice('recommended')}
              >
                <span>推荐</span><strong>JTS 标准 10 cm² 探头</strong><em>使用预设锥底面积、有效面积比与 u2 位置。</em>
              </button>
              <button type="button" className={`guided-choice ${probeGuideChoice === 'manual' ? 'selected' : ''}`} aria-pressed={probeGuideChoice === 'manual'} data-testid="probe-guide-manual" onClick={() => setProbeGuideChoice('manual')}>
                <span>高级手动</span><strong>使用其他探头</strong><em>关闭向导，在右侧“探头配置”中选择或维护规格。</em>
              </button>
            </div>
            {probeGuideProblem ? <p className="field-error" role="alert">{probeGuideProblem}</p> : null}
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setProbeGuideDismissed(true)}>暂不确认</button>
              <button type="button" className="toolbar-button primary" data-testid="probe-guide-recommended" onClick={() => {
                if (probeGuideChoice === 'manual') {
                  setProbeGuideDismissed(true);
                  window.setTimeout(() => {
                    const target = document.querySelector<HTMLElement>('[data-testid="confirm-jts-probe"]');
                    target?.scrollIntoView({ block: 'center' });
                    target?.focus();
                  }, 0);
                  return;
                }
                const profile = workspaceProject?.probeProfiles[0];
                if (!profile || !onPointLifecycle) return;
                const result = onPointLifecycle({ kind: 'confirm-probe', pointId: activePoint.pointId, profileId: profile.profileId });
                if (!result.ok) setProbeGuideProblem(result.problem);
                else {
                  setProbeGuideProblem('');
                  setProbeGuideDismissed(true);
                  onOpenRoute('import');
                }
              }}>{probeGuideChoice === 'recommended' ? '使用此探头并继续' : '转到右侧探头配置'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ImportDocument({
  flowCase,
  draft,
  pipeline,
  mappings,
  previewRows,
  pointSummary,
  needsRecheck,
  selectedMappingField,
  focusField,
  focusSourceRowId,
  focusDisplayRow,
  onSelectMappingField,
  onOpenRoute,
  onImportFile,
  onRunDataCheck,
  onDownloadTemplate,
  onCopyTemplateHeader,
  onResolvePointDecision,
  onCancelImportDraft,
  selectedPointKey,
  pointPlanFeedback,
  pointPlanStale,
  onSelectPointKey,
  onApplyPointSplitStrategy,
  onGeneratePointPlan,
  actionPending,
  excelParsing,
  additionalProblem,
  pendingPointIdentity,
  assistantDraftPending,
  saveFailure,
  onOpenPointIdentity,
  workspaceProject,
  onPointLifecycle,
  checkReady,
}: {
  flowCase: SyntheticFlowCase;
  draft: ImportDraft;
  pipeline?: CsvImportPipelineV2 | null;
  mappings: ReturnType<typeof getImportFieldMappings>;
  previewRows: ImportPreviewRow[];
  pointSummary: ProjectPointSummary;
  needsRecheck: boolean;
  selectedMappingField: string;
  focusField: string | null;
  focusSourceRowId: string | null;
  focusDisplayRow: number | null;
  onSelectMappingField: (field: string) => void;
  onOpenRoute: (route: RouteId) => void;
  onImportFile: (file: File | null) => void;
  onRunDataCheck: () => void;
  onDownloadTemplate: (kind: TemplateKind, format?: 'csv' | 'xlsx') => void;
  onCopyTemplateHeader: () => void;
  onResolvePointDecision: (decision: 'new-point' | 'replace-current') => void;
  onCancelImportDraft: () => void;
  selectedPointKey: string | null;
  pointPlanFeedback: string;
  pointPlanStale: boolean;
  onSelectPointKey: (pointKey: string | null) => void;
  onApplyPointSplitStrategy: (
    strategy: 'split-all' | 'split-selected' | 'cancelled',
    selectedPointKeys: string[],
  ) => Promise<boolean>;
  onGeneratePointPlan: () => Promise<boolean>;
  actionPending: boolean;
  excelParsing: boolean;
  additionalProblem: ImportDraftProblem | null;
  pendingPointIdentity: { fileName: string; rowCount: number } | null;
  assistantDraftPending: boolean;
  saveFailure: WorkspaceStorageFailureDiagnosis | null;
  onOpenPointIdentity: () => void;
  workspaceProject?: ProjectWorkspaceV2;
  onPointLifecycle?: (command: PointLifecycleCommand) => PointLifecycleResult;
  checkReady: boolean;
}) {
  const activePoint = workspaceProject?.points.find((point) => point.pointId === workspaceProject.activePointId) ?? null;
  const guideRequired = Boolean(workspaceProject && workspaceProject.mode !== 'demo');
  const probeConfirmed = Boolean(activePoint?.probeContext.confirmedAt) || !guideRequired;
  const waterConfirmed = Boolean(activePoint?.waterContext.confirmedAt && !['unknown', 'partial'].includes(activePoint.waterContext.channelState)) || !guideRequired;
  const detectedU2 = draft.valueProvenance
    ? draft.valueProvenance.u2?.origin === 'source'
    : draft.rows.some((row) => Number.isFinite(row.u2Kpa));
  const [waterGuideDismissed, setWaterGuideDismissed] = useState(false);
  const [importProbeGuideDismissed, setImportProbeGuideDismissed] = useState(false);
  const [importProbeGuideProblem, setImportProbeGuideProblem] = useState('');
  const [importProbeGuideChoice, setImportProbeGuideChoice] = useState<'recommended' | 'manual'>('recommended');
  const [waterGuideChannel, setWaterGuideChannel] = useState<'present' | 'absent'>(detectedU2 ? 'present' : 'absent');
  const [waterGuideDepth, setWaterGuideDepth] = useState(String(draft.waterDepthM ?? 0));
  const [waterGuideDatum, setWaterGuideDatum] = useState<PointWaterContextV3['u2HydrostaticDatum']>('total');
  const [waterGuideProblem, setWaterGuideProblem] = useState('');
  const [runCheckAfterWater, setRunCheckAfterWater] = useState(false);
  const [demoReplacePending, setDemoReplacePending] = useState(false);
  const mappingRowsV2 = pipeline ? getImportMappingRowsV2(pipeline) : [];
  const selectedSourceColumn = pipeline ? getSelectedImportSourceColumn(pipeline, selectedMappingField) : null;
  const selectedMappingDecision = selectedSourceColumn
    ? pipeline?.mappings.find((mapping) => mapping.sourceColumnId === selectedSourceColumn.columnId) ?? null
    : null;
  const fieldPreviewRows = pipeline
    ? getImportFieldPreviewRows(
        pipeline,
        selectedMappingDecision?.targetField ?? null,
        focusSourceRowId,
        focusDisplayRow,
      )
    : [];
  const pendingMappingCount = pipeline
    ? pipeline.mappings.filter((mapping) => ['candidate', 'conflict'].includes(mapping.state)).length
    : mappings.filter((mapping) => mapping.status === 'warning').length;
  const pendingUnitCount = pipeline
    ? pipeline.unitDecisions.filter((unit) => ['needs-confirmation', 'conflict'].includes(unit.state)).length
    : 0;
  const advancedMappingNeeded = Boolean(
    pipeline
    && (
      pendingMappingCount
      || pendingUnitCount
      || pipeline.readiness.reasons.some((reason) => reason.recovery === 'mapping' || reason.recovery === 'unit')
    ),
  );
  const canRunCheck = !pendingPointIdentity && (pipeline ? pipeline.readiness.canRunCheck : isImportDraftCheckable(draft));
  const pointPlanRows = pipeline ? getImportPointPlanRows(pipeline) : [];
  const hasMultiPointPlan = pointPlanRows.length > 1;
  const pendingPointCount = pointPlanRows.filter((row) => row.selected && row.execution?.status !== 'generated' && row.decision?.action !== 'skip').length;
  const unresolvedPointCount = pointPlanRows.filter((row) => row.selected && row.decision?.state !== 'confirmed').length;
  const canGeneratePointPlan = Boolean(
    pipeline
    && hasMultiPointPlan
    && pipeline.readiness.canGenerateDrafts
    && pendingPointCount > 0
    && unresolvedPointCount === 0,
  );
  const pointPlanCancelled = pipeline?.pointPlan.state === 'cancelled';
  const generatedPointCount = pointPlanRows.filter((row) => row.execution?.status === 'generated').length;
  const remainingBatchPointCount = pointPlanRows.filter((row) =>
    row.execution?.status !== 'generated'
    && (row.execution?.status === 'problem' || row.decision?.action !== 'skip'),
  ).length;
  const pointPlanPartiallyGenerated = hasMultiPointPlan && generatedPointCount > 0 && remainingBatchPointCount > 0;
  const pointPlanNeedsAction = hasMultiPointPlan
    && pipeline?.pointPlan.state !== 'cancelled'
    && (pipeline?.pointPlan.strategy === 'pending' || pendingPointCount > 0);

  useEffect(() => {
    setWaterGuideChannel(detectedU2 ? 'present' : 'absent');
    setWaterGuideDepth(String(draft.waterDepthM ?? 0));
    setWaterGuideProblem('');
    setWaterGuideDismissed(false);
    setImportProbeGuideDismissed(false);
    setImportProbeGuideProblem('');
    setImportProbeGuideChoice('recommended');
  }, [draft.version, draft.fileName, detectedU2, activePoint?.pointId]);

  useEffect(() => {
    if (!runCheckAfterWater || !waterConfirmed) return;
    setRunCheckAfterWater(false);
    onRunDataCheck();
  }, [runCheckAfterWater, waterConfirmed]);

  useEffect(() => {
    if (!focusSourceRowId && !focusDisplayRow) return;
    const selector = focusSourceRowId
      ? `[data-source-row-id="${CSS.escape(focusSourceRowId)}"]`
      : `[data-display-row="${focusDisplayRow}"]`;
    requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ block: 'center' }));
  }, [focusDisplayRow, focusSourceRowId, selectedSourceColumn?.columnId]);
  const activeProblems = [
    ...getActiveImportProblems(pipeline, draft),
    ...(additionalProblem ? [additionalProblem] : []),
  ];
  const issueCount = activeProblems.filter((problem) => problem.severity === 'issue').length;
  const noticeCount = activeProblems.filter((problem) => problem.severity === 'notice').length;
  const importStateLabel = assistantDraftPending
    ? 'AI 草稿待确认'
    : pendingPointIdentity
    ? '待确认点位'
    : additionalProblem
    ? draft.sourceMode === 'project-empty' ? '文件未导入' : '有效草稿已保留'
    : pointPlanStale
    ? '计划已失效'
    : pointPlanCancelled
    ? '已取消'
    : pointPlanPartiallyGenerated
      ? '部分生成'
    : pointPlanNeedsAction
      ? canGeneratePointPlan ? '可生成点位' : '点位计划待处理'
      : needsRecheck && canRunCheck ? '需重新检查' : canRunCheck ? '可检查' : '需处理';
  const hasPointDecision = hasPointDecisionProblem(draft);
  const firstProblem = activeProblems.find((problem) => problem.severity === 'issue') ?? activeProblems[0] ?? null;
  const recoverySourceColumn = pipeline && firstProblem
    ? getImportProblemSourceColumn(pipeline, firstProblem)
      ?? pipeline.sourceColumns.find((column) => !pipeline.mappings.some((mapping) => mapping.sourceColumnId === column.columnId))
      ?? null
    : null;
  const firstLookState = assistantDraftPending && saveFailure?.code === 'conflict'
    ? 'assistant-save-conflict'
    : assistantDraftPending
    ? 'assistant-pending'
    : pendingPointIdentity
    ? 'point-identity'
    : additionalProblem
    ? 'upload-error'
    : draft.sourceMode === 'project-empty'
    ? 'empty'
    : pointPlanStale
      ? 'point-plan-stale'
    : pointPlanCancelled
      ? 'cancelled'
      : pointPlanPartiallyGenerated
        ? 'partial'
      : pointPlanNeedsAction
        ? 'point-plan'
        : needsRecheck && canRunCheck ? 'stale' : canRunCheck ? 'ready' : 'issue';
  const firstLookCopy = {
    'assistant-save-conflict': {
      headline: '先处理保存冲突',
      body: '文件和 AI 整理草稿已保留。解决其他标签页的更新后，再继续确认导入。',
      state: '草稿已保留',
    },
    'assistant-pending': {
      headline: 'AI 新草稿等待确认',
      body: `当前草稿仍保留${issueCount ? `，有 ${issueCount} 条问题` : ''}；确认右侧 AI 新草稿后才会替换。`,
      state: '确认右侧新草稿',
    },
    'point-identity': {
      headline: '文件已读取，请确认点位',
      body: `${pendingPointIdentity?.rowCount ?? 0} 行数据尚未写入项目。确认点位后，系统会建立点位并直接运行检查。`,
      state: '需要你的选择',
    },
    empty: {
      headline: '当前项目还没有导入草稿',
      body: '先上传 CPT/CPTU CSV 或 Excel，系统会识别字段、单位和来源行。',
      state: '尚未导入',
    },
    ready: {
      headline: '导入草稿已生成，可进入数据检查',
      body: '最小测量列和来源行已经确认；可直接进入数据检查，额外列仍作为原始附件保留。',
      state: '可检查',
    },
    issue: {
      headline: '导入草稿存在问题，暂不能检查',
      body: firstProblem ? `${firstProblem.title}：${firstProblem.action}` : '先处理导入草稿问题，再进入数据检查。',
      state: '存在问题',
    },
    'upload-error': {
      headline: draft.sourceMode === 'project-empty' ? '文件未导入' : '文件未导入，当前有效草稿已保留',
      body: firstProblem ? `${firstProblem.evidence ? `本次文件 ${firstProblem.evidence}。` : ''}${firstProblem.title}：${firstProblem.action}` : '重新选择受支持的数据文件。',
      state: '存在问题',
    },
    stale: {
      headline: '导入草稿已更新，需要重新检查',
      body: '当前草稿版本已变化，旧检查结论不能继续用于地层分层。',
      state: '需重新检查',
    },
    'point-plan-stale': {
      headline: '点位计划已失效，需要刷新后重新确认',
      body: '项目已在其他位置更新，本页计划不能继续编辑或生成；刷新后将按最新项目状态重新计算。',
      state: '计划已失效',
    },
    partial: {
      headline: `已生成 ${generatedPointCount} 个点位，另有 ${remainingBatchPointCount} 个点位待处理`,
      body: '已生成草稿保持不变；继续查看剩余点位的问题和目标动作。',
      state: '部分生成',
    },
    'point-plan': {
      headline: canGeneratePointPlan
        ? `点位计划已就绪，可生成 ${pendingPointCount} 个草稿`
        : `已识别 ${pointPlanRows.length} 个点位，需要完成拆分计划`,
      body: unresolvedPointCount
        ? `还有 ${unresolvedPointCount} 个点位需要确认目标动作。`
        : '核对逐点行数和目标动作后一次生成。',
      state: canGeneratePointPlan ? '可生成点位' : '需处理点位计划',
    },
    cancelled: {
      headline: '本批次点位生成已取消',
      body: '字段、单位与点位计划已冻结；既有点位和检查状态没有改变，可重新打开后继续编辑。',
      state: '已取消',
    },
  }[firstLookState];
  return (
    <div
      className="import-document analysis-page mixpanel-report"
      data-testid="document-import"
      data-flow={flowCase.flowId}
      data-case-id={flowCase.caseId}
      data-flow-step="review-import"
    >
      <FlowCaseBanner flowCase={flowCase} route="import" />
      <PreparationGuide
        currentStep={!probeConfirmed ? 1 : draft.sourceMode === 'project-empty' ? 2 : !waterConfirmed ? 3 : 4}
        probeConfirmed={probeConfirmed}
        importReady={draft.sourceMode !== 'project-empty' && canRunCheck}
        waterConfirmed={waterConfirmed}
        checkReady={checkReady}
      />
      <header className="analysis-header mixpanel-report-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">当前点位 / 来源证据 / 标准化预览</div>
          <div className="analysis-title-row">
            <h1>数据导入</h1>
            <span className={`status-pill ${canRunCheck ? 'status-success' : 'status-warning'}`}>
              {importStateLabel}
            </span>
            <span className={issueCount || pointPlanPartiallyGenerated ? 'status-pill status-warning' : 'status-pill status-success'}>
              {pointPlanPartiallyGenerated ? `剩余点位 ${remainingBatchPointCount} 个` : issueCount ? `存在问题 ${issueCount} 条` : '无问题'}
            </span>
            {pendingMappingCount ? (
              <span className="status-pill status-info">待确认映射 {pendingMappingCount} 项</span>
            ) : null}
            {pendingUnitCount ? (
              <span className="status-pill status-info">待确认单位 {pendingUnitCount} 项</span>
            ) : null}
            {noticeCount ? (
              <span className="status-pill status-info">数据提示 {noticeCount} 条</span>
            ) : null}
          </div>
          <div className="analysis-subtitle">
            <strong data-testid="import-active-batch-name">{pendingPointIdentity?.fileName ?? draft.fileName}</strong>
            <span data-testid="import-draft-status">{pendingPointIdentity ? '文件已解析，等待点位确认。' : draft.message}</span>
            <span>预览 {pendingPointIdentity?.rowCount ?? previewRows.length} 行</span>
            <span>{pendingPointIdentity ? 'Excel / CSV' : draft.fileType}</span>
          </div>
        </div>
      </header>

      <PageDecisionBand
        testId="import-first-look"
        tone={firstLookState === 'ready' || firstLookState === 'point-plan' || firstLookState === 'point-identity' ? 'primary' : firstLookState === 'stale' || firstLookState === 'point-plan-stale' || firstLookState === 'assistant-pending' || firstLookState === 'assistant-save-conflict' ? 'stale' : 'issue'}
        className={`import-first-look ${firstLookState}`}
        title={firstLookCopy.headline}
        description={firstLookCopy.body}
        primaryAction={(
          <>
            {firstLookState === 'assistant-pending' || firstLookState === 'assistant-save-conflict' ? null : firstLookState === 'point-identity' ? (
              <button type="button" className="toolbar-button primary" data-testid="open-point-identity" onClick={onOpenPointIdentity}>
                填写点位名称
              </button>
            ) : firstLookState === 'point-plan-stale' ? (
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="refresh-point-plan"
                onClick={() => window.location.reload()}
              >
                刷新并重新确认点位计划
              </button>
            ) : firstLookState === 'partial' ? (
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="open-remaining-point"
                onClick={() => onSelectPointKey(pointPlanRows.find((row) =>
                  row.execution?.status !== 'generated'
                  && (row.execution?.status === 'problem' || row.decision?.action !== 'skip'),
                )?.pointKey ?? null)}
              >
                处理剩余点位问题
              </button>
            ) : firstLookState === 'point-plan' ? (
              canGeneratePointPlan ? (
                <button
                  type="button"
                  className="toolbar-button primary"
                  data-testid="generate-point-drafts-primary"
                  disabled={actionPending}
                  onClick={() => void onGeneratePointPlan()}
                >
                  {actionPending ? '正在生成点位草稿…' : `生成 ${pendingPointCount} 个点位草稿`}
                </button>
              ) : (
                <button
                  type="button"
                  className="toolbar-button primary"
                  data-testid="open-point-plan-primary"
                  onClick={() => onSelectPointKey(pointPlanRows.find((row) => row.decision?.state !== 'confirmed')?.pointKey ?? pointPlanRows[0]?.pointKey ?? null)}
                >
                  处理点位计划
                </button>
              )
            ) : firstLookState === 'cancelled' ? (
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="reopen-point-plan"
                onClick={() => void onApplyPointSplitStrategy('split-all', [])}
              >
                重新打开点位计划
              </button>
            ) : firstLookState === 'issue' && recoverySourceColumn ? (
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="import-primary-fix-field"
                onClick={() => onSelectMappingField(recoverySourceColumn.header)}
              >
                处理字段问题
              </button>
            ) : firstLookState === 'empty' || firstLookState === 'issue' || firstLookState === 'upload-error' ? (
              <label className="toolbar-button primary import-file-action" htmlFor="import-file-input" data-testid="import-primary-upload">
                {excelParsing ? '正在解析 Excel' : firstLookState === 'empty' ? '选择数据文件' : '重新选择数据文件'}
              </label>
            ) : (
              <button
                type="button"
                className="toolbar-button primary"
                data-testid="run-data-check"
                data-draft-checkable={String(isImportDraftCheckable(draft))}
                onClick={() => waterConfirmed ? onRunDataCheck() : setWaterGuideDismissed(false)}
                disabled={actionPending}
              >
                {actionPending ? '正在生成点位草稿' : firstLookState === 'stale' ? '重新运行数据检查' : '运行数据检查'}
              </button>
            )}
            {hasPointDecision && !hasMultiPointPlan ? (
              <button type="button" className="toolbar-button" data-testid="import-primary-point-decision-new" onClick={() => onResolvePointDecision('new-point')}>
                确认作为新点位
              </button>
            ) : null}
          </>
        )}
        stateLabel={firstLookCopy.state}
        stateMeta={pendingPointIdentity?.fileName ?? draft.fileName}
      />

      <section className="mixpanel-metrics-row import-metrics secondary-summary" aria-label="导入摘要" data-testid="import-readiness-summary">
        <MetricInline label="导入草稿" value={pendingPointIdentity?.fileName ?? draft.fileName} />
        <MetricInline label="项目点位" value={`${pointSummary.totalPointCount} 个`} />
        <MetricInline label="测量字段" value={`${pipeline ? pipeline.mappings.filter((mapping) => ['depthM', 'qc', 'fs', 'u2'].includes(mapping.targetField) && mapping.state === 'confirmed').length : 0} 项`} />
        <MetricInline label={hasMultiPointPlan ? '当前范围待处理' : '待处理'} value={issueCount ? `${issueCount} 项` : '无'} tone={issueCount ? 'warn' : 'ok'} />
        <MetricInline
          label="待确认"
          value={pendingMappingCount || pendingUnitCount
            ? `映射 ${pendingMappingCount} / 单位 ${pendingUnitCount}`
            : '无'}
        />
        <MetricInline label="数据提示" value={noticeCount ? `${noticeCount} 条` : '无'} />
        <MetricInline label="预览行" value={`${previewRows.length} 行`} />
        <MetricInline label="源数据" value={`${pointSummary.sourceRecordCount} 行`} />
        {hasMultiPointPlan ? <MetricInline label="识别点位" value={`${pointPlanRows.length} 个`} /> : null}
      </section>

      {pipeline && hasMultiPointPlan ? (
        <ImportPointPlanPanel
          pipeline={pipeline}
          rows={pointPlanRows}
          selectedPointKey={selectedPointKey}
          feedback={pointPlanFeedback}
          disabled={pointPlanStale || pointPlanCancelled}
          stale={pointPlanStale}
          onSelectPointKey={onSelectPointKey}
          onApplySplitStrategy={onApplyPointSplitStrategy}
        />
      ) : null}

      <section className="import-workspace-grid">
        <div className="project-main-panel pro-panel import-upload-panel" data-testid="import-upload-summary">
          <div className="section-header">
            <div>
              <h2>上传与导入草稿</h2>
              <span>上传 CSV 或 .xlsx 后生成导入草稿；Excel 会保留 sheet、表头行和原始行号。</span>
            </div>
          </div>
          <label className="file-drop-zone" htmlFor="import-file-input">
            <FileInput className="drop-icon" />
            <span>{excelParsing ? '正在解析工作簿…' : '选择 CSV 或 Excel 文件'}</span>
            <strong>{draft.fileName}</strong>
            <input
              id="import-file-input"
              data-testid="import-file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = '';
                onImportFile(file);
              }}
            />
          </label>
          <div className="template-action-row" data-testid="import-template-actions">
            <button
              type="button"
              className="toolbar-button"
              data-testid="import-use-demo-data"
              disabled={excelParsing}
              onClick={() => {
                if (draft.rows.length > 0 && draft.sourceMode !== 'project-empty') {
                  setDemoReplacePending(true);
                  return;
                }
                onImportFile(createSyntheticCptuDemoFile());
              }}
            >
              试用演示数据
            </button>
            <button type="button" className="toolbar-button" data-testid="detail-download-blank-xlsx" onClick={() => onDownloadTemplate('blank', 'xlsx')}>
              下载空模板（Excel）
            </button>
            <button
              type="button"
              className="toolbar-button"
              data-testid="detail-download-example-xlsx"
              onClick={() => onDownloadTemplate('example', 'xlsx')}
            >
              下载示例模板（Excel）
            </button>
            <button type="button" className="toolbar-button" data-testid="detail-download-blank-template" onClick={() => onDownloadTemplate('blank', 'csv')}>
              下载空模板（CSV）
            </button>
            <button type="button" className="toolbar-button" data-testid="detail-download-example-template" onClick={() => onDownloadTemplate('example', 'csv')}>
              下载示例模板（CSV）
            </button>
            <button type="button" className="toolbar-button" data-testid="detail-copy-template-header" onClick={onCopyTemplateHeader}>
              复制标准表头
            </button>
          </div>
          {demoReplacePending ? (
            <div className="inline-confirmation" data-testid="import-demo-replace-confirmation">
              <span>将用系统生成演示数据替换当前导入草稿；已保存的项目数据不会立即修改。</span>
              <button type="button" className="toolbar-button" onClick={() => setDemoReplacePending(false)}>取消</button>
              <button type="button" className="toolbar-button primary" onClick={() => {
                setDemoReplacePending(false);
                onImportFile(createSyntheticCptuDemoFile());
              }} data-testid="import-confirm-demo-data">确认载入</button>
            </div>
          ) : null}
          <div className="readiness-list" data-testid="parsed-import-result">
            <div className="readiness-row">
              <span>草稿状态</span>
              <strong>{importStateLabel}</strong>
            </div>
            <div className="readiness-row">
              <span>解析行数</span>
              <strong>{draft.rows.length} 行</strong>
            </div>
            <div className="readiness-row">
              <span>当前点位</span>
              <strong>{draft.pointName}</strong>
            </div>
            <div className="readiness-row">
              <span>说明</span>
              <strong>{draft.message}</strong>
            </div>
            {draft.excelSource ? <><div className="readiness-row" data-testid="excel-source-sheet"><span>Excel 来源</span><strong>{draft.excelSource.sheetName} / 表头第 {draft.excelSource.headerRow} 行</strong></div><div className="readiness-row"><span>工作簿</span><strong>{draft.excelSource.workbookSheets.length} sheets / {formatBytes(draft.excelSource.originalFileSize)}</strong></div><div className="readiness-row" data-testid="excel-parse-duration"><span>解析耗时</span><strong>{draft.excelSource.parseDurationMs.toFixed(1)} ms</strong></div></> : null}
          </div>
        </div>

        {advancedMappingNeeded ? <div className="project-main-panel pro-panel" data-testid="advanced-import-mapping">
          <div className="section-header">
            <div>
              <h2>字段映射</h2>
              <span>点击字段后右侧显示字段详情、单位契约和影响范围。</span>
            </div>
          </div>
          <div className="point-table-wrap" data-testid="import-field-mapping">
            <table className="point-table mapping-table">
              <thead>
                <tr>
                  <th>源字段</th>
                  <th>样例值</th>
                  <th>目标字段</th>
                  <th>映射</th>
                  <th>源单位</th>
                </tr>
              </thead>
              <tbody>
                {pipeline ? mappingRowsV2.map(({ column, mapping, unit, targetLabel, mappingLabel, unitLabel }) => (
                  <tr
                    key={column.columnId}
                    className={
                      selectedSourceColumn?.columnId === column.columnId || focusField === column.header ? 'selected' : ''
                    }
                    data-testid={`mapping-row-${column.header.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
                    onClick={() => onSelectMappingField(column.header)}
                  >
                    <td><strong>{column.header || `第 ${column.sourceIndex + 1} 列`}</strong></td>
                    <td className="mapping-sample-cell">{column.sampleValues.slice(0, 2).join(' / ') || '空列'}</td>
                    <td>{targetLabel}</td>
                    <td>
                      <span className={`inline-state ${mapping?.state === 'confirmed' ? 'ok' : mapping ? 'warn' : 'muted'}`}>
                        {mappingLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-state ${unit && ['confirmed', 'not-applicable'].includes(unit.state) ? 'ok' : unit ? 'warn' : 'muted'}`}>
                        {unitLabel}
                      </span>
                    </td>
                  </tr>
                )) : mappings.map((mapping) => (
                  <tr
                    key={`${mapping.sourceField || 'unmapped'}:${mapping.targetField}`}
                    className={selectedMappingField === mapping.sourceField || focusField === mapping.sourceField ? 'selected' : ''}
                    data-testid={`mapping-row-${mapping.sourceField.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
                    onClick={() => onSelectMappingField(mapping.sourceField)}
                  >
                    <td>{mapping.sourceField}</td>
                    <td>—</td>
                    <td>{mapping.targetField}</td>
                    <td><span className={`inline-state ${mapping.status === 'matched' ? 'ok' : 'warn'}`}>{mapping.status === 'matched' ? '映射已确认' : '仅提示'}</span></td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div> : (
          <div className="project-main-panel pro-panel minimal-import-contract" data-testid="minimal-import-contract">
            <div className="section-header"><div><h2>最小测量输入</h2><span>普通路径只读取当前点位的实测列；其余列作为原始附件保留。</span></div></div>
            <div className="minimal-field-strip">
              <span data-testid="mapping-row-depthm" className={selectedMappingDecision?.targetField === 'depthM' || focusField?.toLowerCase().includes('depth') ? 'selected' : ''}><strong>Depth</strong><em>m · 必需</em></span>
              <span data-testid="mapping-row-qckpa" className={selectedMappingDecision?.targetField === 'qc' || focusField?.toLowerCase().includes('qc') ? 'selected' : ''}><strong>qc</strong><em>MPa / kPa · 必需</em></span>
              <span data-testid="mapping-row-fskpa" className={selectedMappingDecision?.targetField === 'fs' || focusField?.toLowerCase().includes('fs') ? 'selected' : ''}><strong>fs</strong><em>kPa / MPa · 必需</em></span>
              <span data-testid="mapping-row-u2kpa" className={selectedMappingDecision?.targetField === 'u2' || focusField?.toLowerCase().includes('u2') ? 'selected' : ''}><strong>u2</strong><em>kPa / MPa · 可选</em></span>
            </div>
            <p className="short-note">点位：{draft.pointName}。最终孔深由最大有效深度派生；水深与探头在点位上下文中确认。</p>
            <details className="minimal-source-fields"><summary>来源字段（原始附件）</summary><div data-testid="import-field-mapping">{draft.headers.join(' / ')}</div></details>
          </div>
        )}

        <div className="project-main-panel pro-panel">
          <div className="section-header">
            <div>
              <h2>原始/标准化预览</h2>
              <span>当前预览 {previewRows.length} 行，用于核对字段、单位和深度范围。</span>
            </div>
          </div>
          {draft.rawPreview.length ? (
            <div className="raw-preview-strip" data-testid="import-raw-preview">
              <strong>原始表头</strong>
              <span>{draft.headers.join(' / ')}</span>
            </div>
          ) : null}
          {pipeline && selectedSourceColumn ? (
            <div className="standardization-focus" data-testid="import-selected-field-preview">
              <div className="standardization-focus-heading">
                <div>
                  <strong>{selectedSourceColumn.header}</strong>
                  <span>
                    {selectedMappingDecision
                      ? `→ ${importTargetFieldLabelV2(selectedMappingDecision.targetField)}`
                      : '尚未映射到目标字段'}
                  </span>
                </div>
                <span className="inline-state muted">源行与标准值</span>
              </div>
              {fieldPreviewRows.length ? (
                <div className="point-table-wrap">
                  <table className="point-table field-preview-table">
                    <thead>
                      <tr>
                        <th>源行</th>
                        <th>源值</th>
                        <th>源单位</th>
                        <th>标准值</th>
                        <th>标准单位</th>
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldPreviewRows.map((row) => {
                        const focused = focusSourceRowId === row.sourceRowId
                          || (!focusSourceRowId && focusDisplayRow === row.displayRowNumber);
                        return (
                        <tr
                          key={row.sourceRowId}
                          className={focused ? 'selected source-row-focus' : row.hasProblem ? 'problem-row' : ''}
                          data-source-row-id={row.sourceRowId}
                          data-display-row={row.displayRowNumber}
                          data-testid={`import-field-source-row-${row.displayRowNumber}`}
                        >
                          <td>第 {row.displayRowNumber} 行</td>
                          <td>{formatImportNormalizedValue(row.value?.rawValue)}</td>
                          <td>{row.value?.sourceUnit ?? '—'}</td>
                          <td>{formatImportNormalizedValue(row.value?.normalizedValue, selectedMappingDecision?.targetField)}</td>
                          <td>{row.value?.standardUnit ?? '—'}</td>
                          <td>{importValueOriginLabel(row.value)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="standardization-empty" data-testid="import-selected-field-preview-empty">
                  完成必要映射和单位确认后显示标准化值。
                </div>
              )}
            </div>
          ) : null}
          <div className="point-table-wrap" data-testid="import-normalized-preview">
            <table className="point-table preview-table">
              <thead>
                <tr>
                  <th>深度 (m)</th>
                  <th>qc (kPa)</th>
                  <th>qt (kPa)</th>
                  <th>fs (kPa)</th>
                  <th>u2 (kPa)</th>
                  <th>Fr (%)</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={`${row.depthM}-${rowIndex}`} className={focusSourceRowId === draft.sourceRowIds?.[rowIndex] || (!focusSourceRowId && focusDisplayRow === rowIndex + 2) ? 'selected source-row-focus' : ''}>
                    <td>{row.depthM.toFixed(3)} m</td>
                    <td>{row.qcKpa.toFixed(2)} kPa</td>
                    <td>{row.qtKpa.toFixed(2)} kPa</td>
                    <td>{row.fsKpa.toFixed(2)} kPa</td>
                    <td>{row.u2Kpa.toFixed(2)} kPa</td>
                    <td>{row.frPercent.toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-note-row">
            <span>源档案范围：{pointSummary.sourceDepthRange}</span>
            <span>预览范围：{pointSummary.previewDepthRange}</span>
            <span>单位：m / kPa / %</span>
          </div>
        </div>
        <div className="project-main-panel pro-panel import-problems-panel">
          <ImportProblemList
            problems={activeProblems}
            hasPointDecision={hasPointDecision && !hasMultiPointPlan}
            heading={hasMultiPointPlan ? '当前生成范围' : undefined}
            emptyMessage={hasMultiPointPlan
              ? remainingBatchPointCount > 0
                ? `已选生成范围无问题；批次另有 ${remainingBatchPointCount} 个未处理点位，保留在点位计划中。`
                : '当前生成范围无问题。'
              : undefined}
            onResolvePointDecision={onResolvePointDecision}
            onCancelImportDraft={onCancelImportDraft}
            onLocateProblem={(problemValue) => {
              const column = pipeline ? getImportProblemSourceColumn(pipeline, problemValue) : null;
              if (column) onSelectMappingField(column.header);
            }}
          />
        </div>
      </section>
      {activePoint && canRunCheck && !probeConfirmed && !importProbeGuideDismissed ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog preparation-dialog" role="dialog" aria-modal="true" aria-labelledby="import-probe-guide-title" data-testid="probe-guide-dialog">
            <div className="confirmation-dialog-heading"><div><span>数据准备 · 第 1 步</span><h2 id="import-probe-guide-title">先确认本点位的探头</h2></div><button type="button" className="icon-button" aria-label="暂不确认" onClick={() => setImportProbeGuideDismissed(true)}><X /></button></div>
            <p>探头规格会影响孔压修正。大多数 JTS 数据可直接使用推荐配置。</p>
            <div className="guided-choice-list"><button type="button" className={`guided-choice recommended ${importProbeGuideChoice === 'recommended' ? 'selected' : ''}`} aria-pressed={importProbeGuideChoice === 'recommended'} data-testid="probe-guide-choice-recommended" onClick={() => setImportProbeGuideChoice('recommended')}><span>推荐</span><strong>JTS 标准 10 cm² 探头</strong><em>使用预设锥底面积、有效面积比与 u2 位置。</em></button><button type="button" className={`guided-choice ${importProbeGuideChoice === 'manual' ? 'selected' : ''}`} aria-pressed={importProbeGuideChoice === 'manual'} data-testid="probe-guide-manual" onClick={() => setImportProbeGuideChoice('manual')}><span>高级手动</span><strong>使用其他探头</strong><em>在右侧点位工具中配置后再继续。</em></button></div>
            {importProbeGuideProblem ? <p className="field-error" role="alert">{importProbeGuideProblem}</p> : null}
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setImportProbeGuideDismissed(true)}>暂不确认</button>
              <button type="button" className="toolbar-button primary" data-testid="probe-guide-recommended" onClick={() => {
                if (importProbeGuideChoice === 'manual') {
                  setImportProbeGuideDismissed(true);
                  onOpenRoute('project');
                  window.setTimeout(() => {
                    const target = document.querySelector<HTMLElement>('[data-testid="confirm-jts-probe"]');
                    target?.scrollIntoView({ block: 'center' });
                    target?.focus();
                  }, 0);
                  return;
                }
                const profile = workspaceProject?.probeProfiles[0];
                if (!profile || !onPointLifecycle) return;
                const result = onPointLifecycle({ kind: 'confirm-probe', pointId: activePoint.pointId, profileId: profile.profileId });
                if (!result.ok) setImportProbeGuideProblem(result.problem);
                else { setImportProbeGuideProblem(''); setImportProbeGuideDismissed(true); }
              }}>{importProbeGuideChoice === 'recommended' ? '使用此探头并继续' : '转到右侧探头配置'}</button>
            </div>
          </section>
        </div>
      ) : null}
      {activePoint && canRunCheck && probeConfirmed && !waterConfirmed && !waterGuideDismissed ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog preparation-dialog" role="dialog" aria-modal="true" aria-labelledby="water-guide-title" data-testid="water-guide-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>数据准备 · 第 3 步</span><h2 id="water-guide-title">确认水深与孔压</h2></div>
              <button type="button" className="icon-button" aria-label="暂不确认" onClick={() => setWaterGuideDismissed(true)}><X /></button>
            </div>
            <p>{detectedU2 ? '文件中检测到 u2。请确认按完整 CPTU 处理，并核对水深。' : '文件中没有可靠的 u2 通道。建议按 CPT 近似路线继续，无需填写水深。'}</p>
            <div className="guided-choice-list">
              <button type="button" className={`guided-choice ${waterGuideChannel === 'present' ? 'recommended selected' : ''}`} aria-pressed={waterGuideChannel === 'present'} onClick={() => setWaterGuideChannel('present')} data-testid="water-guide-present">
                <span>{detectedU2 ? '推荐' : '可选'}</span><strong>完整 CPTU（含 u2）</strong><em>需要确认水深和 u2 压力基准。</em>
              </button>
              <button type="button" className={`guided-choice ${waterGuideChannel === 'absent' ? 'recommended selected' : ''}`} aria-pressed={waterGuideChannel === 'absent'} onClick={() => setWaterGuideChannel('absent')} data-testid="water-guide-absent">
                <span>{detectedU2 ? '其他' : '推荐'}</span><strong>无可靠 u2，按 CPT 近似</strong><em>不要求水深；后续结果会明确标记为近似路线。</em>
              </button>
            </div>
            {waterGuideChannel === 'present' ? (
              <div className="preparation-form-grid">
                <label className="dock-form-field"><span>水深（m）</span><input type="number" min="0" step="0.1" value={waterGuideDepth} onChange={(event) => setWaterGuideDepth(event.target.value)} data-testid="water-guide-depth" /></label>
                <label className="dock-form-field"><span>u2 压力基准</span><select value={waterGuideDatum} onChange={(event) => setWaterGuideDatum(event.target.value as PointWaterContextV3['u2HydrostaticDatum'])} data-testid="water-guide-datum"><option value="total">总孔压（含静水压力）</option><option value="u2_mudline_relative">泥面相对孔压</option></select></label>
              </div>
            ) : null}
            {waterGuideProblem ? <p className="field-error" role="alert">{waterGuideProblem}</p> : null}
            <div className="confirmation-dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setWaterGuideDismissed(true)}>暂不确认</button>
              <button type="button" className="toolbar-button primary" data-testid="water-guide-confirm" onClick={() => {
                if (!onPointLifecycle) return;
                const waterDepthM = waterGuideChannel === 'present' ? Number(waterGuideDepth) : null;
                if (waterGuideChannel === 'present' && (!Number.isFinite(waterDepthM) || (waterDepthM as number) < 0)) {
                  setWaterGuideProblem('请输入大于或等于 0 的水深。');
                  return;
                }
                const result = onPointLifecycle({
                  kind: 'confirm-water',
                  pointId: activePoint.pointId,
                  water: {
                    channelState: waterGuideChannel,
                    waterDepthM,
                    u2HydrostaticDatum: waterGuideDatum,
                    testZeroDatum: 'mudline',
                    boreholeBottomDepthM: null,
                    waterUnitWeightKnM3: 10,
                  },
                });
                if (!result.ok) setWaterGuideProblem(result.problem);
                else { setWaterGuideProblem(''); setRunCheckAfterWater(true); }
              }}>确认并运行数据检查</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ImportPointPlanPanel({
  pipeline,
  rows,
  selectedPointKey,
  feedback,
  disabled,
  stale,
  onSelectPointKey,
  onApplySplitStrategy,
}: {
  pipeline: CsvImportPipelineV2;
  rows: ReturnType<typeof getImportPointPlanRows>;
  selectedPointKey: string | null;
  feedback: string;
  disabled: boolean;
  stale: boolean;
  onSelectPointKey: (pointKey: string | null) => void;
  onApplySplitStrategy: (
    strategy: 'split-all' | 'split-selected' | 'cancelled',
    selectedPointKeys: string[],
  ) => Promise<boolean>;
}) {
  const [cancelPending, setCancelPending] = useState(false);
  const selectedCount = rows.filter((row) => row.selected).length;
  const readyCount = rows.filter((row) =>
    row.selected
    && row.decision?.state === 'confirmed'
    && row.decision.action !== 'skip'
    && row.problemCount === 0
    && row.execution?.status !== 'generated',
  ).length;
  const problemCount = rows.filter((row) => row.problemCount > 0 || (row.selected && row.decision?.state !== 'confirmed')).length;
  const generatedCount = rows.filter((row) => row.execution?.status === 'generated').length;
  const reconfirmCount = rows.filter((row) =>
    row.selected
    && row.execution?.status !== 'generated'
    && row.decision?.action !== 'skip',
  ).length;

  function togglePoint(pointKey: string) {
    const nextSelection = pipeline.pointPlan.selectedPointKeys.includes(pointKey)
      ? pipeline.pointPlan.selectedPointKeys.filter((key) => key !== pointKey)
      : [...pipeline.pointPlan.selectedPointKeys, pointKey];
    if (!nextSelection.length) return;
    void onApplySplitStrategy('split-selected', nextSelection);
  }

  return (
    <div className="project-main-panel pro-panel import-point-plan-panel" data-testid="import-point-plan">
      <div className="section-header point-plan-header">
        <div>
          <h2>点位计划</h2>
          <span>逐点确认生成范围和目标动作；生成前不会改变项目点位。</span>
        </div>
        <div className="point-plan-mode" role="group" aria-label="点位拆分范围">
          <button
            type="button"
            className={pipeline.pointPlan.strategy === 'split-all' ? 'active' : ''}
            data-testid="point-plan-split-all"
            disabled={disabled}
            onClick={() => void onApplySplitStrategy('split-all', [])}
          >
            生成全部点位
          </button>
          <button
            type="button"
            className={pipeline.pointPlan.strategy === 'split-selected' ? 'active' : ''}
            data-testid="point-plan-split-selected"
            disabled={disabled}
            onClick={() => void onApplySplitStrategy(
              'split-selected',
              pipeline.pointPlan.selectedPointKeys.length
                ? pipeline.pointPlan.selectedPointKeys
                : rows.filter((row) => row.problemCount === 0).map((row) => row.pointKey),
            )}
          >
            仅生成选中点位
          </button>
        </div>
      </div>

      <div className="point-plan-summary" data-testid="point-plan-summary">
        <MetricInline label="已识别" value={`${rows.length} 个`} />
        <MetricInline label="已选择" value={`${selectedCount} 个`} />
        <MetricInline
          label={stale ? '待重新确认' : '可生成'}
          value={`${stale ? reconfirmCount : readyCount} 个`}
          tone={!stale && readyCount ? 'ok' : stale && reconfirmCount ? 'warn' : undefined}
        />
        <MetricInline label="需处理" value={problemCount ? `${problemCount} 个` : '无'} tone={problemCount ? 'warn' : 'ok'} />
        <MetricInline label="已生成" value={`${generatedCount} 个`} />
      </div>

      <div className="point-table-wrap">
        <table className="point-table point-plan-table">
          <thead>
            <tr>
              <th aria-label="选择点位" />
              <th>源点位</th>
              <th>源行</th>
              <th>深度范围</th>
              <th>目标动作</th>
              <th>目标名称</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.pointKey}
                className={selectedPointKey === row.pointKey ? 'selected' : row.problemCount ? 'problem-row' : ''}
                data-testid={`point-plan-row-${safeTestId(row.pointKey)}`}
                onClick={() => onSelectPointKey(row.pointKey)}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`选择点位 ${row.pointName}`}
                    checked={row.selected}
                    disabled={disabled || row.execution?.status === 'generated'}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => togglePoint(row.pointKey)}
                    data-testid={`point-plan-select-${safeTestId(row.pointKey)}`}
                  />
                </td>
                <td><strong>{row.pointName}</strong></td>
                <td>{row.rowCount} 行</td>
                <td>{row.depthRange}</td>
                <td>{pointDecisionActionLabel(row.decision?.action)}</td>
                <td>{row.decision?.proposedPointName ?? row.pointName}</td>
                <td>
                  <span className={`inline-state ${row.execution?.status === 'generated' ? 'ok' : row.problemCount || row.decision?.state !== 'confirmed' ? 'warn' : 'muted'}`}>
                    {row.problemCount
                      ? `${row.problemCount} 个问题`
                      : stale && row.selected && row.execution?.status !== 'generated'
                        ? '待重新确认'
                      : row.decision?.state !== 'confirmed'
                        ? '待决定'
                        : pointExecutionLabel(row.execution?.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {feedback ? <p className="point-plan-feedback" data-testid="point-plan-feedback">{feedback}</p> : null}
      <div className="point-plan-actions">
        {pipeline.pointPlan.state === 'cancelled' ? (
          <span className="point-plan-complete-note">本批次生成已取消；如需继续，请使用页面顶部的“重新打开点位计划”。</span>
        ) : generatedCount ? (
          <span className="point-plan-complete-note">已生成的草稿不会通过取消批次删除。</span>
        ) : cancelPending ? (
          <div className="inline-confirmation" data-testid="cancel-point-plan-confirmation">
            <span>取消只影响本批次，既有点位保持不变。</span>
            <button type="button" className="toolbar-button danger-text" data-testid="confirm-cancel-point-plan" onClick={() => { void onApplySplitStrategy('cancelled', []); setCancelPending(false); }}>确认取消</button>
            <button type="button" className="toolbar-button" data-testid="keep-point-plan" onClick={() => setCancelPending(false)}>继续处理</button>
          </div>
        ) : (
          <button type="button" className="toolbar-button" data-testid="cancel-point-plan" disabled={disabled} onClick={() => setCancelPending(true)}>取消本批次生成</button>
        )}
      </div>
    </div>
  );
}

function safeTestId(value: string) {
  const normalized = value.toLocaleLowerCase();
  const ascii = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (ascii) return ascii;
  return `u-${Array.from(normalized, (character) => character.codePointAt(0)?.toString(36) ?? '0').join('-')}`;
}

function ImportProblemList({
  problems,
  hasPointDecision,
  heading,
  emptyMessage,
  onResolvePointDecision,
  onCancelImportDraft,
  onLocateProblem,
}: {
  problems: ImportDraftProblem[];
  hasPointDecision: boolean;
  heading?: string;
  emptyMessage?: string;
  onResolvePointDecision: (decision: 'new-point' | 'replace-current') => void;
  onCancelImportDraft: () => void;
  onLocateProblem?: (problem: ImportDraftProblem) => void;
}) {
  return (
    <div className="import-problem-list" data-testid="import-problem-list">
      <div className="section-mini-heading">
        <strong>{heading ?? '导入问题'}</strong>
        <span>{problems.length ? `${problems.length} 条` : '无问题'}</span>
      </div>
      {problems.length ? (
        <div className="import-problem-stack">
          {problems.map((problem) => (
            <div
              key={problem.problemId}
              className={`import-problem-card ${problem.severity === 'issue' ? 'issue' : 'notice'}`}
              data-testid={`import-problem-${problem.problemId}`}
            >
              <div>
                <span className="problem-event-id">{problem.eventId}</span>
                <strong>{problem.title}</strong>
              </div>
              <p>{problem.message}</p>
              <div className="problem-meta">
                {problem.fieldName ? <span>字段 {problem.fieldName}</span> : null}
                {problem.rowIndex ? <span>第 {problem.rowIndex} 行</span> : null}
                {problem.evidence ? <span>{problem.evidence}</span> : null}
              </div>
              <small>{problem.action}</small>
              {onLocateProblem && (problem.fieldName || problem.sourceRowId) ? (
                <button
                  type="button"
                  className="problem-locate-button"
                  onClick={() => onLocateProblem(problem)}
                  data-testid={`locate-import-problem-${problem.problemId}`}
                >
                  定位字段或源行
                </button>
              ) : null}
            </div>
          ))}
          {hasPointDecision ? (
            <div className="point-decision-actions" data-testid="point-decision-actions">
              <button
                type="button"
                className="toolbar-button"
                data-testid="point-decision-new"
                onClick={() => onResolvePointDecision('new-point')}
              >
                作为新点位草稿
              </button>
              <button
                type="button"
                className="toolbar-button"
                data-testid="point-decision-replace"
                onClick={() => onResolvePointDecision('replace-current')}
              >
                替换当前点位
              </button>
              <button type="button" className="toolbar-button" data-testid="point-decision-cancel" onClick={onCancelImportDraft}>
                取消导入
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="short-note">{emptyMessage ?? '当前导入草稿无问题，可用于数据检查。'}</p>
      )}
    </div>
  );
}

type OutputRuntimeSummary = {
  projectName: string;
  pointName: string;
  checkReady: boolean;
  checkedRowCount: number;
  stratificationReady: boolean;
  layerCount: number;
  parametersReady: boolean;
  parameterAuthorityCurrent: boolean;
  parameterRowCount: number;
  parameterInvalidInputCount: number;
  parameterUndefinedCount: number;
  parameterProblemCount: number;
  parameterScopeConfirmed: boolean;
  parameterScopeIncludedMethodLabels: string[];
  parameterScopeExcludedMethodLabels: string[];
  customFormulaCount: number;
  customFormulaReady: boolean;
  customFormulaValidCount: number;
  customFormulaMissingInputCount: number;
  customFormulaProblemCount: number;
  customFormulaNonTargetCount: number;
};

function OutputDocument({
  items,
  selectedItem,
  runtime,
  revisions,
  onSelectItem,
  onOpenRoute,
}: {
  items: OutputItem[];
  selectedItem: OutputItem | null;
  runtime: OutputRuntimeSummary;
  revisions: JtsOutputRevisionV7[];
  onSelectItem: (itemId: string) => void;
  onOpenRoute: (route: RouteId) => void;
}) {
  const ready = runtime.checkReady && runtime.stratificationReady && runtime.parametersReady && runtime.customFormulaReady;
  const partialScope = runtime.parameterScopeConfirmed && runtime.parameterScopeExcludedMethodLabels.length > 0;
  const currentPdf = [...revisions].reverse().find((revision) => revision.status === 'current' && revision.kind !== 'excel-workbook') ?? null;
  const currentExcel = [...revisions].reverse().find((revision) => revision.status === 'current' && revision.kind === 'excel-workbook') ?? null;
  const preflight = [
    { key: 'checked-data', state: runtime.checkReady ? 'Ready' : 'NeedsConfirmation' },
    { key: 'adopted-layer-scheme', state: runtime.stratificationReady ? 'Ready' : 'NeedsConfirmation' },
    { key: 'adopted-parameter-scheme', state: runtime.parametersReady ? 'Ready' : 'NeedsConfirmation' },
  ];
  return (
    <div className="output-document analysis-page mixpanel-report" data-testid="document-output">
      <header className="analysis-header mixpanel-report-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">工程工作台 / 成果输出</div>
          <div className="analysis-title-row">
            <h1>成果输出</h1>
            <span className={`status-pill ${ready ? 'status-success' : 'status-warning'}`} data-testid="output-readiness-status">{ready ? partialScope ? '可生成部分成果' : '可生成' : '待补全'}</span>
          </div>
          <div className="analysis-subtitle">
            <strong>{runtime.projectName} / {runtime.pointName}</strong>
            <span>必备条件 {preflight.length} 项</span>
          </div>
        </div>
        {!ready ? <div className="toolbar-actions analysis-actions"><button type="button" className="toolbar-button primary" onClick={() => onOpenRoute('parameters')} data-testid="output-primary-action">回到参数解译核对</button></div> : null}
      </header>

      <section className="output-workspace-grid">
        <div className="project-main-panel pro-panel">
          <div className="section-header">
            <div>
              <h2>生成依据</h2>
              <span>只展示本次生成所使用的当前权威对象。</span>
            </div>
          </div>
          <div className="point-table-wrap">
            <table className="point-table output-table">
              <thead>
                <tr>
                  <th>生成依据</th>
                  <th>状态</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.itemId}
                    className={selectedItem?.itemId === item.itemId ? 'selected' : ''}
                    onClick={() => onSelectItem(item.itemId)}
                    data-testid={`output-item-${item.itemId}`}
                  >
                    <td>{item.label}</td>
                    <td>
                      <span className={`inline-state ${item.status === 'NotConfigured' ? 'muted' : ['Completed', 'Current', 'Excluded', 'ScopeConfirmed'].includes(item.status) ? 'ok' : 'warn'}`}>{outputStatusLabel(item.status)}</span>
                    </td>
                    <td>{outputItemNote(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentPdf && currentExcel ? <div className="output-current-summary" data-testid="output-current-summary">
            <div><span>当前成果</span><strong>PDF 与 Excel 已生成</strong><small>{currentPdf.createdAt.replace('T', ' ').slice(0, 19)}</small></div>
            <div><span>PDF</span><strong>{currentPdf.fileName}</strong><small>图册、分类、分层与参数结果</small></div>
            <div><span>Excel</span><strong>{currentExcel.fileName}</strong><small>测量、分类、分层、参数与公式明细</small></div>
          </div> : <p className="output-empty-summary">完成上述依据后，在右侧生成一份 PDF 和一份 Excel。</p>}
        </div>

      </section>
    </div>
  );
}

type JtsLinkedEvidenceRow = { sourceRowId: string; depthM: number; qcKpa: number; fsKpa: number; u2Kpa?: number | null };

function JtsLinkedEvidence({
  rows,
  intervals = [],
  compact = false,
  ignored = false,
  aligned = false,
  selectedInterval,
  displayDepthFromM,
  displayDepthToM,
}: {
  rows: JtsLinkedEvidenceRow[];
  intervals?: JtsGuidanceInterval[];
  compact?: boolean;
  ignored?: boolean;
  aligned?: boolean;
  selectedInterval?: { depthFromM: number; depthToM: number };
  displayDepthFromM?: number;
  displayDepthToM?: number;
}) {
  const prepared = useMemo(() => {
    let rowDepthFromM = Number.POSITIVE_INFINITY;
    let rowDepthToM = Number.NEGATIVE_INFINITY;
    rows.forEach((row) => {
      rowDepthFromM = Math.min(rowDepthFromM, row.depthM);
      rowDepthToM = Math.max(rowDepthToM, row.depthM);
    });
    const depthFromM = typeof displayDepthFromM === 'number' && Number.isFinite(displayDepthFromM) ? displayDepthFromM : Number.isFinite(rowDepthFromM) ? rowDepthFromM : 0;
    const depthToM = typeof displayDepthToM === 'number' && Number.isFinite(displayDepthToM) ? displayDepthToM : Number.isFinite(rowDepthToM) ? rowDepthToM : depthFromM + 1;
    const depthSpan = Math.max(0.001, depthToM - depthFromM);
    const sampleEvery = Math.max(1, Math.ceil(rows.length / (compact ? 220 : 900)));
    const sampledRows = rows.filter((_, index) => index % sampleEvery === 0);
    const anomalyRows = intervals.length
      ? sampledRows.filter((row) => intervals.some((interval) => row.depthM >= interval.depthFromM && row.depthM <= interval.depthToM))
      : [];
    const y = (depthM: number) => aligned
      ? ((depthM - depthFromM) / depthSpan) * 600
      : 18 + ((depthM - depthFromM) / depthSpan) * 564;
    const channelDefinitions = [
      { key: 'qc', label: 'qc', unit: 'kPa', read: (row: JtsLinkedEvidenceRow) => row.qcKpa },
      { key: 'fs', label: 'fs', unit: 'kPa', read: (row: JtsLinkedEvidenceRow) => row.fsKpa },
      { key: 'u2', label: 'u2', unit: 'kPa', read: (row: JtsLinkedEvidenceRow) => row.u2Kpa ?? Number.NaN },
    ];
    const channels = channelDefinitions.map((channel) => {
      let valueMin = 0;
      let valueMax = Number.NEGATIVE_INFINITY;
      let validCount = 0;
      rows.forEach((row) => {
        const value = channel.read(row);
        if (!Number.isFinite(value)) return;
        validCount += 1;
        valueMin = Math.min(valueMin, value);
        valueMax = Math.max(valueMax, value);
      });
      if (!validCount) return { ...channel, validCount, valueMin: 0, valueMax: 0, points: '', anomalyPoints: [] as Array<{ id: string; x: number; y: number }> };
      const valueSpan = Math.max(0.001, valueMax - valueMin);
      const x = (value: number) => 10 + ((value - valueMin) / valueSpan) * 120;
      const points = sampledRows.filter((row) => Number.isFinite(channel.read(row))).map((row) => `${x(channel.read(row)).toFixed(2)},${y(row.depthM).toFixed(2)}`).join(' ');
      const anomalyPoints = anomalyRows.filter((row) => Number.isFinite(channel.read(row))).map((row) => ({ id: row.sourceRowId, x: x(channel.read(row)), y: y(row.depthM) }));
      return { ...channel, validCount, valueMin, valueMax, points, anomalyPoints };
    });
    return {
      depthFromM,
      depthToM,
      channels,
      intervalBands: intervals.map((interval) => ({ id: interval.intervalId, y: y(interval.depthFromM), height: Math.max(2, y(interval.depthToM) - y(interval.depthFromM)) })),
      selectedBand: selectedInterval
        ? { y: y(selectedInterval.depthFromM), height: Math.max(0, y(selectedInterval.depthToM) - y(selectedInterval.depthFromM)) }
        : null,
      selectedLocator: selectedInterval
        ? { y: Math.min(aligned ? 598 : 580, Math.max(aligned ? 2 : 20, (y(selectedInterval.depthFromM) + y(selectedInterval.depthToM)) / 2)) }
        : null,
    };
  }, [aligned, compact, displayDepthFromM, displayDepthToM, intervals, rows, selectedInterval]);
  return (
    <div className={`jts-linked-evidence ${compact ? 'compact' : ''} ${ignored ? 'ignored' : ''} ${aligned ? 'aligned' : ''}`} data-testid="jts-linked-evidence">
      <div className="jts-linked-depth-axis" aria-hidden="true">
        <strong>深度</strong>
        <span>{prepared.depthFromM.toFixed(2)} m</span>
        <span>{((prepared.depthFromM + prepared.depthToM) / 2).toFixed(2)} m</span>
        <span>{prepared.depthToM.toFixed(2)} m</span>
      </div>
      {prepared.channels.map((channel) => {
        if (!channel.validCount) return <div className="jts-linked-track missing" key={channel.key}><div><strong>{channel.label}</strong><span>无 {channel.label}</span></div><p>未作为 0 绘制</p></div>;
        return (
          <div className="jts-linked-track" key={channel.key} data-channel={channel.key}>
            <div><strong>{channel.label}</strong><span>{channel.unit}</span></div>
            <svg viewBox="0 0 140 600" preserveAspectRatio="none" role="img" aria-label={`${channel.label} 曲线，共 ${channel.validCount} 个有效点`}>
              <g className="linked-grid" aria-hidden="true">{[45, 80, 115].map((gridX) => <line key={gridX} x1={gridX} y1={aligned ? 0 : 18} x2={gridX} y2={aligned ? 600 : 582} />)}</g>
              {prepared.selectedBand ? <rect className="jts-selected-layer-band" x="0" width="140" y={prepared.selectedBand.y} height={prepared.selectedBand.height} /> : null}
              {prepared.selectedLocator ? <line className="jts-selected-layer-locator" data-testid="jts-selected-layer-locator" x1="0" x2="12" y1={prepared.selectedLocator.y} y2={prepared.selectedLocator.y} /> : null}
              {prepared.intervalBands.map((band) => <rect key={band.id} className="jts-anomaly-band" x="0" width="140" y={band.y} height={band.height} />)}
              <polyline points={channel.points} />
              {channel.anomalyPoints.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="2.4" />)}
            </svg>
            <footer><span>{Math.round(channel.valueMin)}</span><span>{Math.round(channel.valueMax)}</span></footer>
          </div>
        );
      })}
    </div>
  );
}

const STRATIFICATION_GUIDE_STEPS = ['确认依据', '选择方法', '生成候选', '整理分层', '逐层确认', '生成修订'] as const;

function StratificationWorkflowGuide({
  dataReady,
  scheme,
  dirty,
  thinLayerReviewed,
  problemCount,
  noticeCount,
  gate,
  decisionTitle,
  decisionDescription,
  onAction,
  actionLabel,
  canRollback,
  onRollback,
}: {
  dataReady: boolean;
  scheme: StratificationSchemeV2 | null;
  dirty: boolean;
  thinLayerReviewed: boolean;
  problemCount: number;
  noticeCount: number;
  gate: StratificationGate;
  decisionTitle: string;
  decisionDescription: string;
  onAction: () => void;
  actionLabel: string;
  canRollback: boolean;
  onRollback: () => void;
}) {
  type StepState = 'complete' | 'current' | 'problem' | 'warning' | 'pending';
  const candidateReady = Boolean(scheme);
  const reviewComplete = candidateReady && thinLayerReviewed && problemCount === 0;
  const revisionComplete = Boolean(scheme?.status === 'current' && !dirty && gate.state !== 'deny');
  const steps: Array<{ label: string; state: StepState; meta: string }> = [
    { label: STRATIFICATION_GUIDE_STEPS[0], state: dataReady ? 'complete' : 'problem', meta: dataReady ? '数据已检查' : '需要检查数据' },
    { label: STRATIFICATION_GUIDE_STEPS[1], state: !dataReady ? 'pending' : candidateReady ? 'complete' : 'current', meta: candidateReady ? '方法已选择' : '等待选择' },
    { label: STRATIFICATION_GUIDE_STEPS[2], state: !candidateReady ? 'pending' : 'complete', meta: candidateReady ? '候选已生成' : '尚未生成' },
    { label: STRATIFICATION_GUIDE_STEPS[3], state: !candidateReady ? 'pending' : thinLayerReviewed ? 'complete' : 'current', meta: !candidateReady ? '尚未开始' : thinLayerReviewed ? '已检查薄层' : '等待整理' },
    { label: STRATIFICATION_GUIDE_STEPS[4], state: !candidateReady || !thinLayerReviewed ? 'pending' : problemCount ? 'problem' : 'complete', meta: !candidateReady || !thinLayerReviewed ? '尚未开始' : problemCount ? `${problemCount} 个问题待处理` : noticeCount ? `${scheme?.layers.length ?? 0} 层已确认 · ${noticeCount} 项提示` : `${scheme?.layers.length ?? 0} 层已确认` },
    { label: STRATIFICATION_GUIDE_STEPS[5], state: revisionComplete ? 'complete' : reviewComplete ? 'current' : 'pending', meta: revisionComplete ? '已完成' : dirty ? '等待最终预览' : '尚未开始' },
  ];
  const icon = (state: StepState) => state === 'complete' ? '✓' : state === 'problem' ? '!' : state === 'warning' ? '△' : state === 'current' ? '●' : '○';
  return (
    <section className="stratification-workflow-guide" data-testid="stratification-first-look" aria-label="地层分层流程">
      <div className="workflow-step-row">
        {steps.map((step, index) => (
          <div className={`workflow-step ${step.state}`} key={step.label}>
            <span>{icon(step.state)}</span>
            <div><strong>{index + 1}. {step.label}</strong><em>{step.meta}</em></div>
          </div>
        ))}
      </div>
      <div className="workflow-current-action">
        <div className="workflow-current-copy"><span>当前判断</span><strong>{decisionTitle}</strong><p>{decisionDescription}</p></div>
        <div className="workflow-current-actions">
          {canRollback ? <button type="button" className="toolbar-button" data-testid="stratification-guide-back" onClick={onRollback}><ChevronLeft />返回上一步</button> : null}
          {actionLabel ? <button type="button" className="toolbar-button primary" data-testid={actionLabel.includes('设为当前') ? 'stratification-save' : 'stratification-primary-action'} onClick={onAction}>{actionLabel}</button> : <span className="workflow-inline-status">请在下方图中确认当前层</span>}
        </div>
      </div>
    </section>
  );
}

function StratificationGuideProgress({ current }: { current: 1 | 2 | 3 | 4 | 5 | 6 }) {
  return <div className="stratification-guide-dialog-progress" aria-label={`地层分层指南，第 ${current} 步，共 6 步`}>{STRATIFICATION_GUIDE_STEPS.map((label, index) => <div key={label} className={index + 1 < current ? 'complete' : index + 1 === current ? 'current' : ''}><span>{index + 1 < current ? '✓' : index + 1}</span><strong>{label}</strong></div>)}</div>;
}

function ThinLayerGuideProgress({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['设置筛选厚度', '确认处理', '预览应用'] as const;
  return <div className="stratification-guide-dialog-progress thin-layer-subprogress" aria-label={`候选薄层检查，第 ${current} 步，共 3 步`}>{labels.map((label, index) => <div key={label} className={index + 1 < current ? 'complete' : index + 1 === current ? 'current' : ''}><span>{index + 1 < current ? '✓' : index + 1}</span><strong>{label}</strong></div>)}</div>;
}

function LayerCleanupGuideDialog({
  scheme,
  rows,
  onClose,
  onKeepCurrent,
  onApplyThin,
  onApplySimplification,
}: {
  scheme: StratificationSchemeV2;
  rows: ThinLayerEvidenceRow[];
  onClose: () => void;
  onKeepCurrent: () => boolean;
  onApplyThin: (analysis: ThinLayerAnalysis, decisions: ThinLayerPlanDecision[]) => boolean;
  onApplySimplification: (analysis: MajorGroupMergeAnalysis) => boolean;
}) {
  const [method, setMethod] = useState<'major-group' | 'thin' | null>(null);
  if (method === 'thin') {
    return <ThinLayerGuideDialog scheme={scheme} rows={rows} onClose={onClose} onBack={() => setMethod(null)} onApply={onApplyThin} />;
  }
  if (method === 'major-group') {
    return <MajorGroupMergeDialog scheme={scheme} rows={rows} onClose={onClose} onBack={() => setMethod(null)} onApply={onApplySimplification} />;
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirmation-dialog layer-cleanup-method-dialog" role="dialog" aria-modal="true" aria-labelledby="layer-cleanup-method-title" data-testid="layer-cleanup-method-dialog">
        <div className="confirmation-dialog-heading">
          <div><span>地层分层 · 整理方法</span><h2 id="layer-cleanup-method-title">想怎样整理当前 {scheme.layers.length} 层？</h2></div>
          <button type="button" className="icon-button" aria-label="关闭整理分层" onClick={onClose}><X /></button>
        </div>
        <p>只选择一种方法。系统先生成预览；应用后可撤销。原始 qc、fs、u2 不变。</p>
        <div className="layer-cleanup-method-list" role="group" aria-label="整理分层方法">
          <button type="button" className="guided-choice recommended" onClick={() => setMethod('major-group')} data-testid="layer-cleanup-major-group-method">
            <span>推荐</span><strong>按土类大类合并</strong><em>只合并相邻的同类层：砂性土、混合土和黏性土分别归并；工程师保留边界不动。</em>
          </button>
          <button type="button" className="guided-choice" onClick={() => setMethod('thin')} data-testid="layer-cleanup-thin-method">
            <span>逐项复核</span><strong>按薄层厚度筛选</strong><em>填写厚度阈值，再逐项判断薄层是否保留、向上合并或向下合并。</em>
          </button>
        </div>
        <div className="confirmation-dialog-actions">
          <button type="button" className="toolbar-button" onClick={onClose}>取消</button>
          <button type="button" className="toolbar-button" onClick={() => { if (onKeepCurrent()) onClose(); }} data-testid="layer-cleanup-keep-current">使用当前分层</button>
        </div>
      </section>
    </div>
  );
}

function MajorGroupMergeDialog({
  scheme,
  rows,
  onClose,
  onBack,
  onApply,
}: {
  scheme: StratificationSchemeV2;
  rows: ThinLayerEvidenceRow[];
  onClose: () => void;
  onBack: () => void;
  onApply: (analysis: MajorGroupMergeAnalysis) => boolean;
}) {
  const [analysis, setAnalysis] = useState<MajorGroupMergeAnalysis | null>(null);
  const [activeLayerId, setActiveLayerId] = useState('');
  const [generating, setGenerating] = useState(true);
  const [applying, setApplying] = useState(false);
  const [problem, setProblem] = useState('');
  const resultListRef = useRef<HTMLDivElement | null>(null);
  const activeResult = analysis?.resultLayers.find((layer) => layer.layerId === activeLayerId)
    ?? analysis?.resultLayers.find((layer) => layer.mergedBoundaryCount > 0)
    ?? analysis?.resultLayers[0]
    ?? null;
  const linkedRows = useMemo<JtsLinkedEvidenceRow[]>(() => rows.map((row, index) => ({
    sourceRowId: `major-group-guide-${index}-${row.depthM}`,
    depthM: row.depthM,
    qcKpa: row.qcKpa,
    fsKpa: row.fsKpa,
    u2Kpa: Number.isFinite(row.u2Kpa) ? row.u2Kpa : null,
  })), [rows]);

  function revealActiveResult() {
    window.requestAnimationFrame(() => {
      resultListRef.current?.querySelector<HTMLElement>('article[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
    });
  }

  useEffect(() => {
    revealActiveResult();
  }, [activeResult?.layerId]);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    setProblem('');
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const next = analyzeMajorGroupMerge(scheme, rows);
        setAnalysis(next);
        setActiveLayerId(next.resultLayers.find((layer) => layer.mergedBoundaryCount > 0)?.layerId ?? next.resultLayers[0]?.layerId ?? '');
      } catch (error) {
        setProblem(error instanceof Error ? error.message : '当前方案无法生成大类合并预览，请返回分层图检查。');
      } finally {
        setGenerating(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rows, scheme]);

  function applyPlan() {
    if (!analysis || applying || !analysis.steps.length) return;
    setApplying(true);
    setProblem('');
    const accepted = onApply(analysis);
    if (accepted) onClose();
    else setProblem('当前分层已经变化或保存暂不可用。页面中的编辑仍保留，请关闭后重新生成大类合并预览。');
    setApplying(false);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirmation-dialog target-layer-guide-dialog preview major-group-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="major-group-guide-title" aria-busy={generating || applying} data-testid="major-group-guide-dialog">
        <div className="confirmation-dialog-heading">
          <div><span>整理分层 · 按土类大类合并</span><h2 id="major-group-guide-title">确认相邻同类层的合并结果</h2></div>
          <button type="button" className="icon-button" aria-label="关闭大类合并" disabled={applying} onClick={onClose}><X /></button>
        </div>
        {generating ? <div className="guided-generation-running" role="status" aria-live="polite" data-testid="major-group-generating"><strong>正在按土类大类整理预览…</strong><span>只合并相邻同类层；曲线差异提示（规则阈值）不阻止归并，但会保留给工程师复核。</span></div> : analysis ? <div className="target-layer-preview-step" data-testid="major-group-preview-step">
          <div className="thin-layer-preview-summary target-layer-preview-summary">
            <div><span>整理前</span><strong>{analysis.currentLayerCount} 层</strong></div>
            <div><span>合并后</span><strong data-testid="major-group-planned-count">{analysis.plannedLayerCount} 层</strong></div>
            <div><span>合并边界</span><strong>{analysis.mergedBoundaryCount} 处</strong></div>
            <div><span>保留边界</span><strong>{analysis.protectedBoundaries.length} 处</strong></div>
          </div>
          <div className="major-group-rule-note" role="status"><strong>合并规则</strong><span>砂性土、混合土、黏性土各自合并相邻层；不同大类和工程师保留边界不动。</span></div>
          {analysis.steps.length ? <>
            <div className="target-layer-current-evidence"><span>当前结果层</span><strong>{activeResult ? `${activeResult.depthFromM.toFixed(2)}–${activeResult.depthToM.toFixed(2)} m · ${activeResult.displayLabel}` : '请选择结果层'}</strong></div>
            <JtsLinkedEvidence rows={linkedRows} selectedInterval={activeResult ? { depthFromM: activeResult.depthFromM, depthToM: activeResult.depthToM } : undefined} />
            <div className="target-layer-plan-summary"><strong>合并结果层（{analysis.resultLayers.length}）</strong><span>细分类按深度顺序保留，仅作组成说明。</span></div>
            <div ref={resultListRef} className="target-layer-plan-list major-group-result-list" data-testid="major-group-result-list">
              {analysis.resultLayers.map((item, index) => {
                const selected = activeResult?.layerId === item.layerId;
                return <article key={item.layerId} className={`${item.mergedBoundaryCount ? 'safe' : 'notice'} ${selected ? 'active' : ''}`} role="button" tabIndex={0} aria-current={selected ? 'true' : undefined} onClick={() => setActiveLayerId(item.layerId)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveLayerId(item.layerId); } }} data-testid={`major-group-result-${index + 1}`}>
                  <div><strong>{index + 1}. {item.depthFromM.toFixed(2)}–{item.depthToM.toFixed(2)} m</strong><em>{item.mergedBoundaryCount ? `合并 ${item.mergedBoundaryCount} 处边界` : '原边界保留'}{item.requiresReview ? ` · ${majorGroupReviewSummary(item.reviewReasons)}` : ''}</em></div>
                  <p>{item.displayLabel}</p>
                </article>;
              })}
            </div>
          </> : <div className="thin-layer-empty" data-testid="major-group-no-op"><strong>当前无需按大类合并</strong><span>没有发现相邻且同属一个大类的土层；现有边界不会改变。</span></div>}
          {analysis.protectedBoundaries.length ? <details className="target-layer-protected" data-testid="major-group-protected"><summary>查看保留边界（{analysis.protectedBoundaries.length} 处）</summary><div>{analysis.protectedBoundaries.map((item) => <span key={item.boundaryId}><strong>{item.depthM.toFixed(2)} m</strong><em>{item.reason}</em></span>)}</div><p>大类不同、未确认土类或工程师标记保留的边界不会自动跨越。</p></details> : null}
          {activeResult?.requiresReview ? <details className="target-layer-protected" data-testid="major-group-review-reasons" onToggle={(event) => { if (event.currentTarget.open) revealActiveResult(); }}><summary>{majorGroupReviewSummary(activeResult.reviewReasons)} · 查看依据</summary><div>{activeResult.reviewReasons.map((reason) => <MajorGroupReviewReason key={majorGroupReviewReasonKey(reason)} reason={reason} scheme={scheme} />)}</div></details> : null}
          {problem ? <div className="guided-generation-problem" role="alert"><strong>暂时无法应用</strong><span>{problem}</span></div> : <p className="short-note">应用后可整体撤销；以上复核提示不会被自动接受。</p>}
        </div> : <div className="guided-generation-problem" role="alert"><strong>暂时无法生成预览</strong><span>{problem}</span></div>}
        <div className="confirmation-dialog-actions">
          <button type="button" className="toolbar-button" disabled={applying} onClick={onBack}>返回方法选择</button>
          <button type="button" className="toolbar-button primary" disabled={generating || applying || !analysis?.steps.length} onClick={applyPlan} data-testid="major-group-apply-plan">{applying ? '正在应用…' : analysis ? `应用大类合并（${analysis.plannedLayerCount} 层）` : '应用大类合并'}</button>
        </div>
      </section>
    </div>
  );
}

function majorGroupReviewSummary(reasons: MajorGroupReviewReasonV2[]) {
  const labels: string[] = [];
  if (reasons.some((reason) => reason.kind === 'source-soil-confirmation')) labels.push('来源土类待确认');
  if (reasons.some((reason) => reason.kind === 'source-evidence')) labels.push('来源证据需复核');
  const curveCount = reasons.filter((reason) => reason.kind === 'curve-difference').length;
  if (curveCount) labels.push(`${curveCount} 处曲线差异提示`);
  if (reasons.some((reason) => reason.kind === 'legacy-untyped')) labels.push('历史复核原因未分型');
  return labels.length ? labels.join(' / ') : '无需复核';
}

function majorGroupReviewReasonKey(reason: MajorGroupReviewReasonV2) {
  return reason.kind === 'curve-difference'
    ? `${reason.kind}:${reason.boundaryId}:${reason.boundaryDepthM}`
    : `${reason.kind}:${reason.sourceLayerIds.join('|')}`;
}

function majorGroupSourceRangeSummary(reason: Extract<MajorGroupReviewReasonV2, { kind: 'source-soil-confirmation' | 'source-evidence' }>, scheme: StratificationSchemeV2) {
  const ranges = reason.sourceLayerIds
    .map((layerId) => scheme.layers.find((layer) => layer.layerId === layerId))
    .filter((layer): layer is StratificationLayerV2 => Boolean(layer))
    .sort((left, right) => left.depthFromM - right.depthFromM)
    .map((layer) => `${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)} m`);
  if (!ranges.length) return `${reason.sourceLayerIds.length} 个来源层（旧记录未保存深度）`;
  const shown = ranges.slice(0, 2).join('、');
  return ranges.length > 2 ? `来源层 ${shown}，另 ${ranges.length - 2} 层` : `来源层 ${shown}`;
}

function MajorGroupReviewReason({ reason, scheme }: { reason: MajorGroupReviewReasonV2; scheme: StratificationSchemeV2 }) {
  if (reason.kind === 'source-soil-confirmation') return <span><strong>来源土类待确认</strong><em>{majorGroupSourceRangeSummary(reason, scheme)} 的土类尚待确认。</em></span>;
  if (reason.kind === 'source-evidence') return <span><strong>来源证据需复核</strong><em>{majorGroupSourceRangeSummary(reason, scheme)} 保留分类证据提示，请结合 qc、fs、u2 复核。</em></span>;
  if (reason.kind === 'curve-difference') return <span><strong>{reason.boundaryDepthM.toFixed(2)} m · 曲线差异提示（规则阈值）</strong><em>{reason.channels.join('、')} 的上下层差异超过当前提示阈值；这不是正式工程判据，归并后仍需复核。</em></span>;
  return <span><strong>历史复核原因未分型</strong><em>旧方案只保存了汇总状态，系统不会猜测或自动清除，请工程师确认。</em></span>;
}

function ThinLayerGuideDialog({
  scheme,
  rows,
  onClose,
  onBack,
  onApply,
}: {
  scheme: StratificationSchemeV2;
  rows: ThinLayerEvidenceRow[];
  onClose: () => void;
  onBack?: () => void;
  onApply: (analysis: ThinLayerAnalysis, decisions: ThinLayerPlanDecision[]) => boolean;
}) {
  const defaultThresholdM = Math.min(DEFAULT_THIN_LAYER_THRESHOLD_M, Math.max(0.01, (scheme.depthToM - scheme.depthFromM) / 2));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [thresholdText, setThresholdText] = useState(defaultThresholdM.toFixed(2));
  const [analysis, setAnalysis] = useState<ThinLayerAnalysis | null>(null);
  const [decisions, setDecisions] = useState<Record<string, ThinLayerDecision>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState('');
  const threshold = Number(thresholdText);
  const thresholdProblem = !Number.isFinite(threshold) || threshold <= 0
    ? '请输入大于 0 的厚度。'
    : threshold >= scheme.depthToM - scheme.depthFromM
      ? '薄层筛选厚度必须小于当前有效深度范围。'
      : '';
  const linkedRows = useMemo<JtsLinkedEvidenceRow[]>(() => rows.map((row, index) => ({
    sourceRowId: `thin-guide-${index}-${row.depthM}`,
    depthM: row.depthM,
    qcKpa: row.qcKpa,
    fsKpa: row.fsKpa,
    u2Kpa: Number.isFinite(row.u2Kpa) ? row.u2Kpa : null,
  })), [rows]);
  const activeCandidate = analysis?.candidates[activeIndex] ?? null;
  const plan = useMemo<ThinLayerPlanDecision[]>(() => analysis?.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    layerId: candidate.layerId,
    decision: decisions[candidate.candidateId] ?? candidate.defaultDecision,
    reason: candidate.reason,
  })) ?? [], [analysis, decisions]);
  const conflict = useMemo(() => thinLayerPlanConflict(analysis, plan), [analysis, plan]);
  const removedLayerCount = plan.reduce((sum, item) => sum + (item.decision === 'merge-surrounding' ? 2 : item.decision === 'preserve' ? 0 : 1), 0);

  function beginReview() {
    if (thresholdProblem) return;
    try {
      const next = analyzeThinLayers(scheme, rows, threshold);
      setAnalysis(next);
      setDecisions(Object.fromEntries(next.candidates.map((candidate) => [candidate.candidateId, candidate.defaultDecision])));
      setActiveIndex(0);
      setProblem('');
      setStep(next.candidates.length ? 2 : 3);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : '当前候选无法分析，请返回分层图检查。');
    }
  }

  function applyPlan() {
    if (!analysis || running || conflict) return;
    setRunning(true);
    setProblem('');
    const accepted = onApply(analysis, plan);
    if (accepted) onClose();
    else setProblem('当前分层已经变化或保存暂不可用。页面中的编辑仍保留，请重新分析后再试。');
    setRunning(false);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`confirmation-dialog thin-layer-guide-dialog ${step === 2 ? 'review' : 'compact'}`} role="dialog" aria-modal="true" aria-labelledby="thin-layer-guide-title" aria-busy={running} data-testid="thin-layer-guide-dialog">
        <div className="confirmation-dialog-heading">
          <div><span>属于总流程第 4 步 · 候选薄层检查</span><h2 id="thin-layer-guide-title">检查候选薄层</h2></div>
          <button type="button" className="icon-button" aria-label="关闭薄层整理" disabled={running} onClick={onClose}><X /></button>
        </div>
        <ThinLayerGuideProgress current={step} />

        {step === 1 ? <div className="thin-layer-guide-step" data-testid="thin-layer-guide-threshold-step">
          <div className="thin-layer-guide-callout"><strong>检查多薄的候选层？</strong><span>系统检查厚度小于该值的候选层并给出建议；是否合并仍由你确认，原始 qc、fs、u2 不会改变。</span></div>
          <label className="thin-layer-threshold-field"><span>薄层筛选厚度</span><div><input type="number" min="0.01" step="0.05" value={thresholdText} onChange={(event) => { setThresholdText(event.target.value); setProblem(''); }} data-testid="thin-layer-threshold-input" /><strong>m</strong></div><small>{defaultThresholdM === DEFAULT_THIN_LAYER_THRESHOLD_M ? '默认 0.50 m' : `当前孔段较短，已调整为 ${defaultThresholdM.toFixed(2)} m`}，只用于找出待判断的候选层，可按项目需要修改。约 {THIN_LAYER_RELIABILITY_REFERENCE_M.toFixed(2)} m 仅为标准探头识别可靠性参考，不是强制合并标准。</small></label>
          {thresholdProblem || problem ? <div className="guided-generation-problem" role="alert"><strong>暂时无法继续</strong><span>{thresholdProblem || problem}</span></div> : null}
        </div> : step === 2 && analysis && activeCandidate ? <div className="thin-layer-guide-step thin-layer-review-step" data-testid="thin-layer-guide-review-step">
          <div className="thin-layer-review-heading"><div><span>候选 {activeIndex + 1} / {analysis.candidates.length}</span><strong>{activeCandidate.depthFromM.toFixed(2)}–{activeCandidate.depthToM.toFixed(2)} m · 厚 {activeCandidate.thicknessM.toFixed(2)} m</strong></div><em className={activeCandidate.recommendation}>{activeCandidate.recommendation === 'safe-auto' ? '已预选系统建议（待确认）' : activeCandidate.recommendation === 'preserve' ? '建议保留' : '需要你的选择'}</em></div>
          <JtsLinkedEvidence rows={linkedRows} selectedInterval={{ depthFromM: activeCandidate.depthFromM, depthToM: activeCandidate.depthToM }} />
          <div className="thin-layer-reason"><strong>{activeCandidate.reason}</strong><span>当前建议土组：{thinLayerSoilGroupLabel(activeCandidate.suggestedGroup)}{activeCandidate.neighborGroup ? `；上下邻层：${thinLayerSoilGroupLabel(activeCandidate.neighborGroup)}` : ''}</span></div>
          <div className="thin-layer-choice-list" role="group" aria-label="薄层处理选择">
            {activeCandidate.allowedDecisions.map((decision) => <button type="button" key={decision} className={(decisions[activeCandidate.candidateId] ?? activeCandidate.defaultDecision) === decision ? 'selected' : ''} aria-pressed={(decisions[activeCandidate.candidateId] ?? activeCandidate.defaultDecision) === decision} onClick={() => setDecisions((current) => ({ ...current, [activeCandidate.candidateId]: decision }))} data-testid={`thin-layer-decision-${decision}`}><strong>{thinLayerDecisionLabel(decision)}</strong><span>{decision === activeCandidate.defaultDecision ? '系统建议' : decision === 'preserve' ? '保持当前边界不变' : '合并后仍需逐层确认土类'}</span></button>)}
          </div>
          <details className="thin-layer-advanced"><summary>查看 qc / fs / u2 比较</summary><div>{activeCandidate.channels.map((channel) => <span key={channel.key}><strong>{channel.key}</strong><em>{channel.valid ? `上/薄/下中值 ${channel.upperMedian?.toFixed(2)} / ${channel.thinMedian?.toFixed(2)} / ${channel.lowerMedian?.toFixed(2)}` : '当前通道证据不足，不按 0 处理'}</em><small>{channel.conflicting ? '任一方向差异明显' : channel.valid ? '三方比较未见明显冲突' : '未参与自动判断'}</small></span>)}</div></details>
        </div> : analysis ? <div className="thin-layer-guide-step" data-testid="thin-layer-guide-preview-step">
          <div className="thin-layer-preview-summary"><div><span>整理前</span><strong>{scheme.layers.length} 层</strong></div><div><span>预计整理后</span><strong>{Math.max(1, scheme.layers.length - removedLayerCount)} 层</strong></div><div><span>合并决定</span><strong>{plan.filter((item) => item.decision !== 'preserve').length} 项</strong></div><div><span>保留薄层</span><strong>{plan.filter((item) => item.decision === 'preserve').length} 项</strong></div></div>
          {analysis.candidates.length ? <div className="thin-layer-preview-list">{analysis.candidates.map((candidate) => { const decision = plan.find((item) => item.candidateId === candidate.candidateId)?.decision ?? 'preserve'; return <span key={candidate.candidateId}><strong>{candidate.depthFromM.toFixed(2)}–{candidate.depthToM.toFixed(2)} m</strong><em>{thinLayerDecisionLabel(decision)}</em><small>{candidate.reason}</small></span>; })}</div> : <div className="thin-layer-empty"><strong>当前阈值下没有需要整理的薄层</strong><span>确认后直接进入逐层土类判断。</span></div>}
          {conflict || problem ? <div className="guided-generation-problem" role="alert"><strong>暂时无法应用</strong><span>{conflict || problem}</span></div> : <p className="short-note">一次应用会形成一个撤销步骤；原始测量、上传附件和行级分类证据保持不变。</p>}
        </div> : null}

        <div className="confirmation-dialog-actions">
          <button type="button" className="toolbar-button" disabled={running} onClick={step === 1 ? onBack ?? onClose : () => { setProblem(''); setStep(step === 3 && analysis?.candidates.length ? 2 : 1); }}>{step === 1 ? onBack ? '返回方法选择' : '暂不整理' : step === 2 ? '返回厚度设置' : analysis?.candidates.length ? '返回候选确认' : '返回厚度设置'}</button>
          {step === 1 ? <button type="button" className="toolbar-button primary" disabled={Boolean(thresholdProblem)} onClick={beginReview} data-testid="thin-layer-start-review">检查薄层</button> : step === 2 && analysis ? <><button type="button" className="toolbar-button" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>上一候选层</button>{activeIndex < analysis.candidates.length - 1 ? <button type="button" className="toolbar-button primary" onClick={() => setActiveIndex((index) => Math.min(analysis.candidates.length - 1, index + 1))} data-testid="thin-layer-next-candidate">下一候选层</button> : <button type="button" className="toolbar-button primary" onClick={() => setStep(3)} data-testid="thin-layer-open-preview">预览整理结果</button>}</> : <button type="button" className="toolbar-button primary" disabled={Boolean(conflict) || running || !analysis} onClick={applyPlan} data-testid="thin-layer-apply-plan">{running ? '正在应用…' : analysis?.candidates.length ? '应用并继续逐层确认' : '确认并继续'}</button>}
        </div>
      </section>
    </div>
  );
}

function thinLayerPlanConflict(analysis: ThinLayerAnalysis | null, plan: ThinLayerPlanDecision[]) {
  if (!analysis) return '';
  const candidateById = new Map(analysis.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const used = new Set<string>();
  for (const item of plan) {
    if (item.decision === 'preserve') continue;
    const candidate = candidateById.get(item.candidateId);
    if (!candidate) return '整理项已经变化，请重新分析。';
    const affected = item.decision === 'merge-surrounding'
      ? [candidate.upperLayerId, candidate.layerId, candidate.lowerLayerId]
      : item.decision === 'merge-above'
        ? [candidate.upperLayerId, candidate.layerId]
        : [candidate.layerId, candidate.lowerLayerId];
    const ids = affected.filter(Boolean) as string[];
    if (ids.some((layerId) => used.has(layerId))) return '两个合并决定使用了同一个相邻层，请返回上一步保留其中一项。';
    ids.forEach((layerId) => used.add(layerId));
  }
  return '';
}

function StratificationLayerDecisionPanel({
  scheme,
  selectedLayer,
  issues,
  jtsRuns,
  stale,
  onSelectLayer,
  onSelectBoundary,
  onCommand,
}: {
  scheme: StratificationSchemeV2;
  selectedLayer: StratificationLayerV2 | null;
  issues: StratificationIssue[];
  jtsRuns: JtsClassificationRunV4[];
  stale: boolean;
  onSelectLayer: (layerId: string) => void;
  onSelectBoundary: (boundaryId: string) => void;
  onCommand: (command: StratificationCommand) => StratificationSchemeV2 | null;
}) {
  const [mode, setMode] = useState<'summary' | 'soil' | 'defer'>('summary');
  const [soilType, setSoilType] = useState('');
  const [deferReason, setDeferReason] = useState<StratificationDeferReason>('insufficient-evidence');
  const [deferNote, setDeferNote] = useState('');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitDepth, setSplitDepth] = useState('');
  const queues = useMemo(() => getStratificationLayerReviewQueues(scheme), [scheme]);
  const activeLayer = selectedLayer ?? queues.pending[0] ?? queues.deferred[0] ?? scheme.layers[0] ?? null;
  const activeIndex = activeLayer ? scheme.layers.findIndex((layer) => layer.layerId === activeLayer.layerId) : -1;
  const jtsRun = activeLayer
    ? resolveJtsClassificationRunForLayer(jtsRuns, scheme, activeLayer)
    : null;
  const touchingBoundaryIds = new Set(activeLayer ? scheme.boundaries.filter((boundary) => boundary.upperLayerId === activeLayer.layerId || boundary.lowerLayerId === activeLayer.layerId).map((boundary) => boundary.boundaryId) : []);
  const activeIssues = activeLayer ? issues.filter((issue) => issue.layerId === activeLayer.layerId || Boolean(issue.boundaryId && touchingBoundaryIds.has(issue.boundaryId))) : [];
  const primaryActiveIssue = activeLayer?.soilDecision?.reviewStatus === 'deferred'
    ? activeIssues.find((issue) => issue.title === '土层暂时保留') ?? activeIssues[0]
    : activeIssues.find((issue) => issue.severity === 'problem' && issue.title === '土类待确认')
    ?? activeIssues.find((issue) => issue.severity === 'problem')
    ?? activeIssues[0];
  const layerEvidenceRows = activeLayer && jtsRun
    ? jtsRun.rows.filter((row) => row.depthM >= activeLayer.depthFromM && (row.depthM < activeLayer.depthToM || (activeIndex === scheme.layers.length - 1 && row.depthM <= activeLayer.depthToM)))
    : [];
  const exceptionalEvidenceRows = layerEvidenceRows.filter((row) => row.confidence === 'problem' || row.issues.length > 0 || !row.selectedClass);
  const displayedEvidenceRows = [
    ...exceptionalEvidenceRows,
    ...layerEvidenceRows.filter((row) => !exceptionalEvidenceRows.includes(row)),
  ].slice(0, 12);
  const evidenceMethodId = jtsRun ? classificationMethodId(jtsRun) : null;
  const evidenceMethod = evidenceMethodId ? classificationMethodMeta(evidenceMethodId) : null;
  const jtsDualPathEvidence = evidenceMethodId === 'jts-t242-2020';
  const restoreAvailability = activeLayer ? getMergedLayerRestoreAvailability(activeLayer) : null;
  const numericSplitDepth = Number(splitDepth);
  const splitDepthProblem = !splitDepth.trim() || !Number.isFinite(numericSplitDepth)
    ? '请输入有效深度。'
    : activeLayer && (numericSplitDepth - activeLayer.depthFromM < 0.05 || activeLayer.depthToM - numericSplitDepth < 0.05)
      ? `拆分深度需位于 ${(activeLayer.depthFromM + 0.05).toFixed(2)}–${(activeLayer.depthToM - 0.05).toFixed(2)} m。`
      : '';

  useEffect(() => {
    setMode('summary');
    setSoilType(activeLayer?.soilDecision?.finalDetailedType ?? activeLayer?.soilDecision?.suggestedDetailedType ?? '');
    setDeferReason((activeLayer?.soilDecision?.decisionReason as StratificationDeferReason | undefined) ?? 'insufficient-evidence');
    setDeferNote(activeLayer?.soilDecision?.decisionNote ?? '');
    setSplitOpen(false);
    setSplitDepth(activeLayer ? ((activeLayer.depthFromM + activeLayer.depthToM) / 2).toFixed(2) : '');
  }, [activeLayer?.layerId]);

  if (!activeLayer) return <aside className="stratification-decision-panel"><p className="short-note">当前方案没有可选择的土层。</p></aside>;

  const status = activeLayer.soilDecision?.reviewStatus === 'deferred'
    ? '暂时保留'
    : queues.pending.some((layer) => layer.layerId === activeLayer.layerId)
      ? '待确认'
      : '已确认';
  const suggestedType = activeLayer.soilDecision?.suggestedDetailedType ?? activeLayer.soilDecision?.finalDetailedType;
  const suggestionAvailable = activeLayer.engineeringSoilGroup !== 'unclassified' && Boolean(suggestedType);

  function selectNext(nextScheme: StratificationSchemeV2, currentLayerId: string) {
    const nextQueues = getStratificationLayerReviewQueues(nextScheme);
    const next = nextQueues.pending.find((layer) => layer.layerId !== currentLayerId)
      ?? nextQueues.pending[0]
      ?? nextQueues.deferred.find((layer) => layer.layerId !== currentLayerId)
      ?? nextQueues.deferred[0];
    if (next) onSelectLayer(next.layerId);
  }

  function applyAndContinue(command: StratificationCommand) {
    const nextScheme = onCommand(command);
    if (nextScheme) selectNext(nextScheme, activeLayer.layerId);
  }

  function applySoil() {
    const entry = STRATIFICATION_SOIL_TYPE_CATALOG.find((candidate) => candidate.label === soilType);
    if (!entry) return;
    applyAndContinue({ kind: 'set-layer-soil-classification', layerId: activeLayer.layerId, engineeringSoilGroup: entry.group, detailedSoilType: entry.label });
  }

  function merge(direction: 'above' | 'below') {
    const nextScheme = onCommand({ kind: 'merge-layer', layerId: activeLayer.layerId, direction, reason: 'engineering-judgement' });
    if (!nextScheme) return;
    const merged = nextScheme.layers.find((layer) => layer.depthFromM <= activeLayer.depthFromM && layer.depthToM >= activeLayer.depthToM);
    if (merged) onSelectLayer(merged.layerId);
  }

  function restoreMergedLayer() {
    const nextScheme = onCommand({ kind: 'restore-merged-layer', layerId: activeLayer.layerId });
    if (!nextScheme) return;
    const restored = nextScheme.layers.find((layer) => layer.layerId === activeLayer.layerId)
      ?? nextScheme.layers.find((layer) => Math.abs(layer.depthFromM - activeLayer.depthFromM) < 0.001);
    if (restored) onSelectLayer(restored.layerId);
    setSplitOpen(false);
  }

  function splitAtSpecifiedDepth() {
    if (splitDepthProblem) return;
    const nextScheme = onCommand({ kind: 'split-layer', layerId: activeLayer.layerId, depthM: numericSplitDepth });
    if (!nextScheme) return;
    const upper = nextScheme.layers.find((layer) => layer.layerId === activeLayer.layerId);
    if (upper) onSelectLayer(upper.layerId);
    setSplitOpen(false);
  }

  return (
    <aside className="stratification-decision-panel" data-testid="stratification-layer-decision-panel">
      <div className="layer-decision-heading">
        <div><span>L{activeIndex + 1} · {activeLayer.depthFromM.toFixed(2)}–{activeLayer.depthToM.toFixed(2)} m</span><h2>{activeLayer.name}</h2></div>
        <strong className={`layer-review-state ${status === '已确认' ? 'accepted' : status === '暂时保留' ? 'deferred' : 'pending'}`}>{status}</strong>
      </div>

      <div className="layer-decision-summary">
        <span>建议土类</span>
        <strong>{suggestedType ?? '当前没有可直接采用的建议'}</strong>
        <p>{activeLayer.soilDecision?.reviewAction === 'merged-inherited' || activeLayer.soilDecision?.reviewAction === 'split-inherited'
          ? '本层土类继承自原土层；请结合曲线重新确认。'
          : activeLayer.soilDecision?.methodClassification
            ? `依据 ${stratificationMethodClassificationLabel(activeLayer)}，并结合本层 qc、fs、u2 变化。`
            : '请结合左侧三条曲线和上下边界作出工程判断。'}</p>
      </div>

      {primaryActiveIssue ? <div className="layer-inline-issues" data-testid="stratification-selected-layer-issues"><button type="button" onClick={() => primaryActiveIssue.boundaryId ? onSelectBoundary(primaryActiveIssue.boundaryId) : undefined}><span>{primaryActiveIssue.severity === 'problem' ? '需要判断' : '仅提示'}</span><strong>{primaryActiveIssue.title}</strong><small>{primaryActiveIssue.message}{activeIssues.length > 1 ? ` · 另有 ${activeIssues.length - 1} 条依据已收进高级信息` : ''}</small></button></div> : null}

      {mode === 'soil' ? <div className="layer-decision-form" data-testid="stratification-inline-soil-form">
        <label><span>选择土类</span><select value={soilType} onChange={(event) => setSoilType(event.target.value)} data-testid="stratification-inline-soil-select"><option value="">请选择</option>{(['clay', 'mixed', 'sand'] as const).map((group) => <optgroup key={group} label={stratificationSoilGroupLabel(group)}>{STRATIFICATION_SOIL_TYPE_CATALOG.filter((entry) => entry.group === group).map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}</optgroup>)}</select></label>
        <div><button type="button" className="toolbar-button" onClick={() => setMode('summary')}>取消</button><button type="button" className="toolbar-button primary" disabled={!soilType || stale} onClick={applySoil} data-testid="stratification-inline-save-soil">保存并查看下一层</button></div>
      </div> : mode === 'defer' ? <div className="layer-decision-form" data-testid="stratification-inline-defer-form">
        <label><span>暂时保留原因</span><select value={deferReason} onChange={(event) => setDeferReason(event.target.value as StratificationDeferReason)}>{STRATIFICATION_DEFER_REASONS.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}</select></label>
        <label><span>备注（可选）</span><input value={deferNote} onChange={(event) => setDeferNote(event.target.value)} placeholder="例如：等待室内试验" /></label>
        <div><button type="button" className="toolbar-button" onClick={() => setMode('summary')}>取消</button><button type="button" className="toolbar-button primary" disabled={stale} onClick={() => applyAndContinue({ kind: 'defer-layer-candidate', layerId: activeLayer.layerId, reason: deferReason, note: deferNote })} data-testid="stratification-inline-confirm-defer">暂时保留并查看下一层</button></div>
      </div> : <>
        {queues.pending.some((layer) => layer.layerId === activeLayer.layerId) && suggestionAvailable ? <button type="button" className="toolbar-button primary layer-primary-action" disabled={stale} onClick={() => applyAndContinue({ kind: 'accept-layer-candidate', layerId: activeLayer.layerId })} data-testid="stratification-inline-accept-layer">采用建议并查看下一层</button> : queues.pending.some((layer) => layer.layerId === activeLayer.layerId) ? <button type="button" className="toolbar-button primary layer-primary-action" disabled={stale} onClick={() => setMode('soil')} data-testid="stratification-inline-select-soil">选择土类</button> : queues.pending.length ? <button type="button" className="toolbar-button primary layer-primary-action" onClick={() => onSelectLayer(queues.pending[0].layerId)} data-testid="stratification-next-pending-layer">定位下一待确认层</button> : queues.deferred.length ? <button type="button" className="toolbar-button primary layer-primary-action" onClick={() => onSelectLayer(queues.deferred[0].layerId)}>处理暂时保留层</button> : null}
        <div className="layer-secondary-actions">
          {suggestionAvailable || status === '已确认' ? <button type="button" className="toolbar-button" onClick={() => setMode('soil')}>{suggestionAvailable && status !== '已确认' ? '修改建议' : '修改土类'}</button> : null}
          {status !== '已确认' ? <button type="button" className="toolbar-button" onClick={() => setMode('defer')}>暂时保留</button> : null}
        </div>
      </>}

      <details className="layer-structure-actions">
        <summary>调整层结构</summary>
        <div className="layer-structure-button-grid">
          <button type="button" className="toolbar-button" disabled={stale || activeIndex <= 0} onClick={() => merge('above')}>与上一层合并</button>
          <button type="button" className="toolbar-button" disabled={stale || activeIndex >= scheme.layers.length - 1} onClick={() => merge('below')}>与下一层合并</button>
          <button type="button" className="toolbar-button" disabled={stale || activeLayer.depthToM - activeLayer.depthFromM < 0.11} onClick={() => setSplitOpen((open) => !open)} data-testid="stratification-inline-open-split">拆分当前层</button>
        </div>
        {splitOpen ? <div className="layer-inline-split-form" data-testid="stratification-inline-split-form">
          <div className="layer-split-choice">
            <button type="button" className="toolbar-button layer-split-restore" disabled={stale || !restoreAvailability?.available} onClick={restoreMergedLayer} data-testid="stratification-restore-merged-layer"><strong>恢复合并前结构</strong><span>{restoreAvailability?.available ? `推荐 · 恢复为 ${restoreAvailability.sourceCount} 层` : '当前不可用'}</span></button>
            <small>{restoreAvailability?.available ? '按已记录的来源深度和土类展开，恢复后的层仍需逐层确认。' : restoreAvailability?.reason}</small>
          </div>
          <div className="layer-split-choice">
            <label><span>按指定深度拆分</span><div><input type="number" step="0.01" min={(activeLayer.depthFromM + 0.05).toFixed(2)} max={(activeLayer.depthToM - 0.05).toFixed(2)} value={splitDepth} onChange={(event) => setSplitDepth(event.target.value)} data-testid="stratification-split-depth-input" /><strong>m</strong></div></label>
            {splitDepthProblem ? <small className="problem">{splitDepthProblem}</small> : <small>拆分后上下两层继承当前土类，并进入待确认。</small>}
            <button type="button" className="toolbar-button primary" disabled={stale || Boolean(splitDepthProblem)} onClick={splitAtSpecifiedDepth} data-testid="stratification-split-at-depth">按此深度拆分</button>
          </div>
          <button type="button" className="text-button layer-split-cancel" onClick={() => setSplitOpen(false)}>取消拆分</button>
        </div> : <p>边界可直接在左图拖动；拆分时可恢复合并前结构，或输入一个明确深度。</p>}
      </details>

      <details className="layer-advanced-evidence"><summary>查看高级分类依据</summary>
        <p>{activeLayer.soilDecision?.methodClassification ? stratificationMethodClassificationLabel(activeLayer) : '本层没有方法分类记录。'} 原始行级分类仅作审计依据，不会覆盖工程师确认的最终土类。</p>
        {jtsRun ? <div className="layer-evidence-audit" data-testid="stratification-layer-evidence-audit">
          <span><strong>分类方法</strong>{jtsDualPathEvidence
            ? jtsRun.route === 'full_cptu' ? 'JTS/T 242—2020 · Ic 与孔压双路径' : 'JTS/T 242—2020 · Ic 近似路径'
            : `${evidenceMethod?.label ?? '当前方法'} · 单方法分类`}</span>
          <span><strong>来源运行</strong>{jtsRun.runId}</span>
          <span><strong>公式包</strong>{jtsRun.formulaPackageId} / v{jtsRun.formulaPackageVersion}</span>
          <span><strong>本层证据</strong>{layerEvidenceRows.length} 行 · {exceptionalEvidenceRows.length} 行需要复核/无法分类</span>
          {layerEvidenceRows.length ? <span><strong>源行范围</strong>{layerEvidenceRows[0].sourceRowId} – {layerEvidenceRows[layerEvidenceRows.length - 1].sourceRowId}</span> : null}
          <details><summary>查看行级证据（需复核项优先）</summary><div className="layer-evidence-row-list">{displayedEvidenceRows.map((row) => <span key={row.sourceRowId}><code>{row.sourceRowId}</code><em>{row.depthM.toFixed(2)} m</em><strong>{row.selectedClass?.label ?? '无法分类'}</strong><small>{jtsDualPathEvidence
            ? row.comparison.state === 'same' ? '双路径一致' : row.comparison.state === 'adjacent' ? '相邻分类' : row.comparison.state === 'unresolved' ? '路径冲突' : '路径不可用'
            : row.confidence === 'high' ? '已分类' : row.confidence === 'review' ? '需要复核' : '无法分类'}{row.issues.length ? ` · ${row.issues.join('；')}` : ''}</small></span>)}</div>{layerEvidenceRows.length > 12 ? <p className="short-note">需要复核的行优先显示；本层共 {layerEvidenceRows.length} 行。</p> : null}</details>
        </div> : <p className="short-note">当前层没有关联的分类来源运行。</p>}
      </details>

      <div className="layer-review-progress"><span>{queues.pending.length} 层待确认</span><span>{queues.deferred.length} 层暂时保留</span></div>
      <div className="layer-navigator-heading"><strong>定位土层（点击即放大）</strong><span>点击任一层，左图会切换到该层局部视图。</span></div>
      <div className="stratification-layer-navigator" data-testid="stratification-layer-navigator" aria-label="定位土层，点击即放大"><div data-testid="stratification-layer-table">{scheme.layers.map((layer, index) => {
        const layerStatus = layer.soilDecision?.reviewStatus === 'deferred' ? 'deferred' : stratificationLayerNeedsDecision(layer) ? 'pending' : 'accepted';
        return <button type="button" key={layer.layerId} data-testid={`stratification-layer-row-${index + 1}`} className={`${layer.layerId === activeLayer.layerId ? 'selected' : ''} ${layerStatus}`} onClick={() => onSelectLayer(layer.layerId)}><span>L{index + 1}</span><strong>{layer.depthFromM.toFixed(2)}–{layer.depthToM.toFixed(2)} m</strong><em>{stratificationLayerDisplayLabel(layer)}</em></button>;
      })}</div></div>
    </aside>
  );
}

type StratificationViewMode = 'overview' | 'focus' | 'expanded';

function stratificationFocusRange(
  scheme: StratificationSchemeV2,
  layer: StratificationLayerV2 | null,
  minimumSpanM = 6,
) {
  if (!layer) return { depthFromM: scheme.depthFromM, depthToM: scheme.depthToM };
  const fullSpan = Math.max(0.001, scheme.depthToM - scheme.depthFromM);
  const layerSpan = Math.max(0.001, layer.depthToM - layer.depthFromM);
  const targetSpan = Math.min(fullSpan, Math.max(minimumSpanM, layerSpan * 1.4));
  const center = (layer.depthFromM + layer.depthToM) / 2;
  let depthFromM = center - targetSpan / 2;
  let depthToM = center + targetSpan / 2;
  if (depthFromM < scheme.depthFromM) {
    depthToM += scheme.depthFromM - depthFromM;
    depthFromM = scheme.depthFromM;
  }
  if (depthToM > scheme.depthToM) {
    depthFromM -= depthToM - scheme.depthToM;
    depthToM = scheme.depthToM;
  }
  return {
    depthFromM: Math.max(scheme.depthFromM, depthFromM),
    depthToM: Math.min(scheme.depthToM, depthToM),
  };
}

function StratificationWorkbenchDocument({
  pointName,
  draft,
  workspace,
  currentCheckInput,
  scheme,
  selectedLayer,
  selectedBoundary,
  issues,
  gate,
  activeRuleRun,
  activeJtsRun,
  selectedRuleCandidateId,
  ruleOverlayVisible,
  onCreateScheme,
  onCommit,
  onDiscard,
  onUndo,
  onRedo,
  onRollbackGuide,
  onDuplicate,
  onSelectLayer,
  onSelectBoundary,
  onSelectScheme,
  onCommand,
  onOpenRoute,
  onOpenGuidedGeneration,
  onOpenThinLayerGuide,
  onOpenFinalizeGuide,
  onAcceptAllClear,
  onOpenJtsDecision,
  onFocusGuidedIssue,
  onSelectRuleCandidate,
  onApplyRule,
}: {
  pointName: string;
  draft: ImportDraft;
  workspace: StratificationWorkspaceV2;
  currentCheckInput: StratificationInputDependencyV2 | null;
  scheme: StratificationSchemeV2 | null;
  selectedLayer: StratificationLayerV2 | null;
  selectedBoundary: StratificationBoundaryV2 | null;
  issues: StratificationIssue[];
  gate: StratificationGate;
  activeRuleRun: StratificationRuleRunV1 | null;
  activeJtsRun: JtsClassificationRunV4 | null;
  selectedRuleCandidateId: string;
  ruleOverlayVisible: boolean;
  onCreateScheme: () => void;
  onCommit: () => void;
  onDiscard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRollbackGuide: () => Promise<boolean>;
  onDuplicate: () => void;
  onSelectLayer: (layerId: string) => void;
  onSelectBoundary: (boundaryId: string) => void;
  onSelectScheme: (scheme: StratificationSchemeV2) => void;
  onCommand: (command: StratificationCommand) => StratificationSchemeV2 | null;
  onOpenRoute: (route: RouteId) => void;
  onOpenGuidedGeneration: () => void;
  onOpenThinLayerGuide: () => void;
  onOpenFinalizeGuide: () => void;
  onAcceptAllClear: () => void;
  onOpenJtsDecision: () => void;
  onFocusGuidedIssue: (issue: StratificationIssue) => void;
  onSelectRuleCandidate: (candidateId: string) => void;
  onApplyRule: () => void;
}) {
  const [viewMode, setViewMode] = useState<StratificationViewMode>('overview');
  const [focusLayerId, setFocusLayerId] = useState('');
  const [guideRollbackOpen, setGuideRollbackOpen] = useState(false);
  const [guideRollbackPending, setGuideRollbackPending] = useState(false);
  const [guideRollbackProblem, setGuideRollbackProblem] = useState('');
  const publishLayerSelectionTimerRef = useRef<number | null>(null);
  const sharedPlotRef = useRef<HTMLDivElement>(null);
  const sharedBoundaryOverlayRef = useRef<HTMLDivElement>(null);
  const session = workspace.editSession?.schemeId === scheme?.schemeId ? workspace.editSession : null;
  const hasWorkflowReviewHistory = Boolean(session && (
    session.working.layerStructureReviewHistory?.length
    || session.working.thinLayerCleanupHistory?.length
    || session.working.layerSimplificationHistory?.length
  ));
  const discardsNewCandidateOnRollback = Boolean(session?.isNew && !hasWorkflowReviewHistory);
  const dirty = Boolean(session?.dirty);
  const thinLayerReviewed = Boolean(scheme && (scheme.status !== 'working' || scheme.origin?.kind === 'manual' || scheme.layerStructureReviewHistory?.length || scheme.thinLayerCleanupHistory?.length || scheme.layerSimplificationHistory?.length));
  const problem = issues.find((issue) => issue.severity === 'problem');
  const noticeCount = issues.filter((issue) => issue.severity === 'notice').length;
  const stale = Boolean(session?.staleReason) || scheme?.status === 'stale' || Boolean(scheme && !sameStratificationInput(scheme.input, currentCheckInput)) || gate.label === '方案需更新';
  const viewingOtherScheme = Boolean(scheme && workspace.currentSchemeId && scheme.schemeId !== workspace.currentSchemeId && !dirty);
  const currentRuleRun = activeRuleRun && currentCheckInput && sameStratificationInput(activeRuleRun.input, currentCheckInput)
    ? activeRuleRun
    : null;
  const ruleCandidates = currentRuleRun?.status === 'completed' ? currentRuleRun.candidates : [];
  const displayedRuleCandidates = scheme && !ruleOverlayVisible ? [] : ruleCandidates;
  const currentJtsGuidance = activeJtsRun?.status === 'completed' ? getJtsClassificationGuidance(activeJtsRun) : null;
  const latestJtsRun = activeJtsRun ?? workspace.jtsClassificationRuns?.at(-1) ?? null;
  const sbtRunState: 'current' | 'stale' | 'empty' = activeJtsRun?.status === 'completed' && Boolean(currentCheckInput) && sameStratificationInput(activeJtsRun.input, currentCheckInput)
      ? 'current'
      : latestJtsRun ? 'stale' : 'empty';
  const jtsAnomalyIntervals = useMemo(
    () => currentJtsGuidance?.intervals.filter((interval) => interval.kind === 'unclassifiable') ?? [],
    [currentJtsGuidance],
  );
  const jtsAnomaliesAccepted = Boolean(
    scheme?.origin?.kind === 'jts-classification'
    && scheme.origin.classificationRunId === activeJtsRun?.runId
    && (scheme.origin.selection?.acceptedUnclassifiableRows ?? 0) > 0,
  );
  const acceptedJtsGapCount = scheme?.origin?.kind === 'jts-classification'
    ? scheme.origin.selection?.acceptedUnclassifiableRows ?? 0
    : 0;
  const guideProblemIssues = stratificationActionableProblems(issues);
  const guidePendingLayers = (scheme?.layers ?? []).filter((layer) => layer.soilConfirmationRequired || layer.engineeringSoilGroup === 'unclassified' || layer.soilDecision?.reviewStatus === 'pending' || layer.soilDecision?.reviewStatus === 'needs-review');
  const guideClearPendingLayers = guidePendingLayers.filter((layer) => {
    return layer.engineeringSoilGroup !== 'unclassified' && !layer.soilConfirmationRequired && !layer.reviewRequired && !layer.evidenceReviewRequired && layer.soilDecision?.reviewStatus === 'pending' && layer.soilDecision?.reviewAction !== 'merged-inherited' && layer.soilDecision?.reviewAction !== 'split-inherited';
  });
  const onlyClearPendingProblems = guideProblemIssues.length > 0
    && guideProblemIssues.every((issue) => Boolean(issue.layerId && guideClearPendingLayers.some((layer) => layer.layerId === issue.layerId)));
  const onlyLayerDecisionProblems = guideProblemIssues.length > 0
    && guideProblemIssues.every((issue) => Boolean(issue.layerId) && ['土类待确认', '土层候选待确认', '土层暂时保留'].includes(issue.title));
  useEffect(() => {
    setViewMode('overview');
    setFocusLayerId('');
  }, [scheme?.schemeId]);
  useEffect(() => () => {
    if (publishLayerSelectionTimerRef.current !== null) window.clearTimeout(publishLayerSelectionTimerRef.current);
  }, []);
  const displayedSelectedLayer = scheme?.layers.find((layer) => layer.layerId === focusLayerId) ?? selectedLayer;
  const displayedDepthRange = useMemo(() => {
    if (!scheme || viewMode !== 'focus') return scheme ? { depthFromM: scheme.depthFromM, depthToM: scheme.depthToM } : null;
    const focusLayer = scheme.layers.find((layer) => layer.layerId === focusLayerId) ?? displayedSelectedLayer;
    return stratificationFocusRange(scheme, focusLayer);
  }, [displayedSelectedLayer, focusLayerId, scheme, viewMode]);
  const renderableBoundaries = useMemo(() => scheme ? getRenderableStratificationBoundaries(scheme) : [], [scheme]);
  const previewSharedBoundary = (boundaryId: string, previewDepthM: number | null) => {
    if (!scheme || !displayedDepthRange) return;
    const line = Array.from(sharedBoundaryOverlayRef.current?.querySelectorAll<HTMLElement>('.shared-boundary-line') ?? [])
      .find((candidate) => candidate.dataset.boundaryId === boundaryId);
    const boundary = renderableBoundaries.find((candidate) => candidate.boundaryId === boundaryId);
    if (!line || !boundary) return;
    const depthM = previewDepthM ?? boundary.depthM;
    const span = Math.max(0.001, displayedDepthRange.depthToM - displayedDepthRange.depthFromM);
    line.style.top = `${((depthM - displayedDepthRange.depthFromM) / span) * 100}%`;
    line.dataset.depth = String(depthM);
    line.classList.toggle('previewing', previewDepthM !== null);
    const upper = scheme.layers.find((layer) => layer.layerId === boundary.upperLayerId);
    const lower = scheme.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
    if (!upper || !lower) return;
    const previewUpper = { ...upper, depthToM: depthM };
    const previewLower = { ...lower, depthFromM: depthM };
    for (const layer of [previewUpper, previewLower]) {
      const block = Array.from(sharedPlotRef.current?.querySelectorAll<HTMLElement>('.editable-layer-block') ?? [])
        .find((candidate) => candidate.dataset.layerId === layer.layerId);
      if (!block) continue;
      const visibleFromM = Math.max(displayedDepthRange.depthFromM, layer.depthFromM);
      const visibleToM = Math.min(displayedDepthRange.depthToM, layer.depthToM);
      block.style.top = `${((visibleFromM - displayedDepthRange.depthFromM) / span) * 100}%`;
      block.style.height = `${Math.max(0, ((visibleToM - visibleFromM) / span) * 100)}%`;
    }
    const previewSelectedLayer = displayedSelectedLayer?.layerId === upper.layerId
      ? previewUpper
      : displayedSelectedLayer?.layerId === lower.layerId ? previewLower : null;
    if (previewSelectedLayer) {
      const selectedFromM = Math.max(displayedDepthRange.depthFromM, previewSelectedLayer.depthFromM);
      const selectedToM = Math.min(displayedDepthRange.depthToM, previewSelectedLayer.depthToM);
      const yRatio = (selectedFromM - displayedDepthRange.depthFromM) / span;
      const heightRatio = Math.max(0, (selectedToM - selectedFromM) / span);
      sharedPlotRef.current?.querySelectorAll<SVGRectElement>('.jts-selected-layer-band').forEach((band) => {
        const svgHeight = band.ownerSVGElement?.viewBox.baseVal.height || 600;
        band.setAttribute('y', String(yRatio * svgHeight));
        band.setAttribute('height', String(heightRatio * svgHeight));
      });
      sharedPlotRef.current?.querySelectorAll<SVGLineElement>('.jts-selected-layer-locator').forEach((locator) => {
        const svgHeight = locator.ownerSVGElement?.viewBox.baseVal.height || 600;
        const centerY = (yRatio + heightRatio / 2) * svgHeight;
        locator.setAttribute('y1', String(centerY));
        locator.setAttribute('y2', String(centerY));
      });
      const callout = sharedPlotRef.current?.querySelector<HTMLElement>('[data-testid="stratification-selected-layer-callout"]');
      if (callout) {
        const centerM = (previewSelectedLayer.depthFromM + previewSelectedLayer.depthToM) / 2;
        callout.style.top = `${Math.min(96, Math.max(4, ((centerM - displayedDepthRange.depthFromM) / span) * 100))}%`;
        const range = callout.querySelector('span');
        if (range) range.textContent = `${previewSelectedLayer.depthFromM.toFixed(2)}–${previewSelectedLayer.depthToM.toFixed(2)} m`;
      }
    }
  };
  const selectLayerAndFocus = (layerId: string) => {
    setFocusLayerId(layerId);
    setViewMode('focus');
    if (publishLayerSelectionTimerRef.current !== null) window.clearTimeout(publishLayerSelectionTimerRef.current);
    requestAnimationFrame(() => {
      publishLayerSelectionTimerRef.current = window.setTimeout(() => {
        publishLayerSelectionTimerRef.current = null;
        onSelectLayer(layerId);
      }, 0);
    });
  };
  const focusIssueInView = (issue: StratificationIssue) => {
    const boundary = issue.boundaryId ? scheme?.boundaries.find((candidate) => candidate.boundaryId === issue.boundaryId) : null;
    const layerId = issue.layerId ?? boundary?.upperLayerId ?? boundary?.lowerLayerId ?? '';
    if (layerId) {
      setFocusLayerId(layerId);
      setViewMode('focus');
    }
    onFocusGuidedIssue(issue);
  };
  const decision = !scheme && activeJtsRun?.status === 'completed'
    ? {
        tone: 'primary' as const,
        title: '分类建议已生成，等待你的选择',
        description: '按推荐可生成可编辑地层方案；如果不采用分类建议，也可以改用手动方式。',
        state: '待选择',
        action: onCreateScheme,
        actionLabel: '改用手动建方案',
      }
    : !scheme && ruleCandidates.length
    ? {
        tone: 'primary' as const,
        title: `已生成 ${ruleCandidates.length} 条规则候选边界`,
        description: '这些位置只表示曲线变化，不会判断砂土或黏性土。可先建立边界候选，再用 JTS 填写建议土类。',
        state: '候选待人工复核',
        action: onApplyRule,
        actionLabel: `用这 ${ruleCandidates.length} 条边界建立候选`,
      }
    : !scheme
    ? {
        tone: 'primary' as const,
        title: '当前点位尚未建立分层方案',
        description: '从有效数据深度范围创建一层基础方案，再通过边界拆分形成土层。',
        state: '尚无方案',
        action: onCreateScheme,
        actionLabel: '新建基础方案',
      }
    : session?.staleReason
      ? {
          tone: 'stale' as const,
          title: '上游检查已变化，当前编辑已保留',
          description: '这份修改不会被静默丢弃，但已不能继续编辑或提交。放弃后可基于最新检查创建修订方案。',
          state: '编辑依据已变化',
          action: onDiscard,
          actionLabel: '放弃失效编辑',
        }
      : dirty
        ? acceptedJtsGapCount > 0 && !problem
          ? {
              tone: 'primary' as const,
              title: '已建立新的可编辑候选',
              description: `原有方案未修改；本候选保留原始测量，并接受 ${acceptedJtsGapCount} 个分类空缺。提交前仍可调整。`,
              state: '候选待复核',
              action: onCommit,
              actionLabel: '提交本次编辑',
            }
          : {
            tone: problem ? 'issue' as const : 'primary' as const,
            title: problem ? '当前编辑存在结构问题' : '当前方案有未提交修改',
            description: problem?.message || '提交后，本方案才会成为参数解译的当前输入。',
            state: problem ? '存在问题' : '工作中',
            action: problem ? () => focusIssueInView(problem) : onCommit,
            actionLabel: problem ? '定位当前问题' : '提交本次编辑',
            }
        : stale
          ? {
              tone: 'stale' as const,
              title: '上游检查已变化，当前方案需要更新',
              description: '旧方案保留为只读历史；基于最新检查复制生成修订方案。',
              state: '方案需更新',
              action: onDuplicate,
              actionLabel: '创建修订方案',
            }
          : viewingOtherScheme
            ? {
                tone: 'stale' as const,
                title: '正在查看其他方案',
                description: '参数解译仍引用当前工作方案。切回当前方案，或打开编辑并提交这份方案。',
                state: '未作为当前输入',
                action: () => {
                  const current = workspace.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
                  if (current) onSelectScheme(current);
                },
                actionLabel: '切回当前工作方案',
              }
        : gate.state === 'deny'
          ? {
              tone: 'issue' as const,
              title: '当前方案暂不能进入参数解译',
              description: gate.reason,
              state: gate.label,
              action: problem ? () => focusIssueInView(problem) : onDuplicate,
              actionLabel: problem ? '定位当前问题' : '创建修订方案',
            }
          : {
              tone: 'success' as const,
              title: gate.state === 'warn' ? '方案可进入参数解译' : '分层方案已就绪',
              description: gate.reason,
              state: gate.state === 'warn' ? '有复核提示' : gate.label,
              action: () => onOpenRoute('parameters'),
              actionLabel: '进入参数解译',
            };

  return (
    <div className="stratification-document analysis-page mixpanel-report stratification-workbench" data-testid="stratification-document">
      <header className="analysis-header mixpanel-report-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">当前点位 / 最新检查 / 分层工作方案</div>
          <div className="analysis-title-row">
            <h1>地层分层</h1>
          </div>
          <div className="analysis-subtitle">
            <strong>{pointName}</strong>
            <span>{scheme?.name ?? '尚未建立方案'}</span>
            <span>{draft.rows.length ? `数据 ${draft.rows.length} 行 / ${formatDraftDepthRange(draft)}` : '无有效深度数据'}</span>
          </div>
        </div>
      </header>

      <StratificationWorkflowGuide
        dataReady={Boolean(currentCheckInput)}
        scheme={scheme}
        dirty={dirty}
        thinLayerReviewed={thinLayerReviewed}
        problemCount={guideProblemIssues.length}
        noticeCount={noticeCount}
        gate={gate}
        decisionTitle={!currentCheckInput
          ? '先处理数据问题，再生成分层候选'
          : scheme && !thinLayerReviewed && !stale
          ? '先整理分层，再逐层确认土类'
          : guideProblemIssues.length && !stale
          ? onlyClearPendingProblems
            ? `候选已生成，${guideClearPendingLayers.length} 个无问题层可以直接接受`
            : onlyLayerDecisionProblems ? '请从右侧逐层确认土类' : `还有 ${guideProblemIssues.length} 个问题需要处理`
          : decision.title}
        decisionDescription={!currentCheckInput
          ? '当前分层没有可用的最新检查依据。返回数据检查后，系统会保留本页位置；完成检查再继续选择方法。'
          : scheme && !thinLayerReviewed && !stale
          ? '选择按土类大类合并，或按厚度逐项复核；系统先生成预览，应用前不会修改当前分层。'
          : guideProblemIssues.length && !stale
          ? onlyClearPendingProblems
            ? `全部 ${scheme?.layers.length ?? 0} 个候选层已显示在下方；批量操作不会处理异常、冲突或待复核层。`
            : onlyLayerDecisionProblems
              ? '逐层查看 qc、fs、u2、上下边界、具体土类和一级工程分组，再接受、合并或调整。'
              : `${guideProblemIssues[0].message} 系统会定位到对应土层或边界。`
          : decision.description}
        onAction={!currentCheckInput
          ? () => onOpenRoute('check')
          : !scheme
            ? currentJtsGuidance?.unclassifiableRows
              ? onOpenJtsDecision
              : onOpenGuidedGeneration
            : stale
              ? decision.action
            : !thinLayerReviewed
              ? onOpenThinLayerGuide
            : guideProblemIssues.length
              ? onlyClearPendingProblems ? onAcceptAllClear : () => focusIssueInView(guideProblemIssues[0])
              : dirty
                ? onOpenFinalizeGuide
                : gate.state === 'deny'
                  ? () => issues[0] && focusIssueInView(issues[0])
                  : () => onOpenRoute('parameters')}
        actionLabel={!currentCheckInput
          ? '前往数据检查'
          : !scheme
            ? currentJtsGuidance?.unclassifiableRows
              ? `处理 ${currentJtsGuidance.isolatedAnomalyIntervalCount} 个待确认区间`
              : '选择地层生成方式'
            : stale
              ? decision.actionLabel
            : !thinLayerReviewed
              ? '选择整理方式'
            : guideProblemIssues.length
              ? onlyClearPendingProblems ? `接受 ${guideClearPendingLayers.length} 个无问题层` : onlyLayerDecisionProblems ? `处理 ${guideProblemIssues.length} 个待确认层` : `处理 ${guideProblemIssues.length} 个问题`
              : dirty
                ? noticeCount ? '确认提示并设为当前修订' : '设为当前分层修订'
                : gate.state === 'deny'
                  ? '定位并修改当前问题'
                  : '进入参数解译'}
        canRollback={Boolean(dirty && session && !session.staleReason && (hasWorkflowReviewHistory || session.isNew))}
        onRollback={() => { setGuideRollbackProblem(''); setGuideRollbackOpen(true); }}
      />

      {guideRollbackOpen ? <div className="modal-backdrop stratification-rollback-backdrop" role="presentation" data-testid="stratification-rollback-confirmation">
        <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="stratification-rollback-title">
          <div className="confirmation-dialog-heading"><div><span>地层分层 · 返回上一步</span><h2 id="stratification-rollback-title">{discardsNewCandidateOnRollback ? '放弃本次候选并返回生成方式？' : '恢复上一分层快照？'}</h2></div><button type="button" className="icon-button" aria-label="取消返回上一步" disabled={guideRollbackPending} onClick={() => setGuideRollbackOpen(false)}><X /></button></div>
          <p>{discardsNewCandidateOnRollback ? '本次新候选将被放弃；原始 qc、fs、u2 不变。' : '恢复上一分层快照，并撤销其后的整理与逐层确认。原始 qc、fs、u2 不变。'}</p>
          {guideRollbackProblem ? <div className="guided-generation-problem" role="alert"><strong>返回尚未保存</strong><span>{guideRollbackProblem}</span></div> : null}
          <div className="confirmation-dialog-actions"><button type="button" className="toolbar-button" data-testid="stratification-rollback-cancel" disabled={guideRollbackPending} onClick={() => setGuideRollbackOpen(false)}>取消</button><button type="button" className="toolbar-button primary" data-testid="stratification-rollback-confirm" disabled={guideRollbackPending || Boolean(guideRollbackProblem)} onClick={async () => { setGuideRollbackPending(true); setGuideRollbackProblem(''); const saved = await onRollbackGuide(); setGuideRollbackPending(false); if (saved) setGuideRollbackOpen(false); else setGuideRollbackProblem('当前页面没有显示返回成功。请保留本页并查看上方保存原因。'); }}>{guideRollbackPending ? '正在保存…' : discardsNewCandidateOnRollback ? '放弃候选' : '恢复上一快照'}</button></div>
        </section>
      </div> : null}

      {workspace.schemes.length ? <section className="stratification-scheme-toolbar" aria-label="方案与编辑工具">
        <div className="scheme-tabs" data-testid="stratification-scheme-list">
          {workspace.schemes.map((candidate) => (
            <button
              type="button"
              key={candidate.schemeId}
              className={candidate.schemeId === scheme?.schemeId ? 'selected' : ''}
              onClick={() => onSelectScheme(candidate)}
              data-testid={`stratification-scheme-${candidate.schemeId}`}
            >
              <strong>{candidate.name}</strong>
              <span>{stratificationSchemeStatusLabel(candidate.status)}</span>
            </button>
          ))}
        </div>
        <div className="stratification-edit-actions">
          <button type="button" className="icon-button" title="撤销" aria-label="撤销" data-testid="stratification-undo" disabled={Boolean(session?.staleReason) || !session?.undoStack.length} onClick={onUndo}><Undo2 /></button>
          <button type="button" className="icon-button" title="重做" aria-label="重做" data-testid="stratification-redo" disabled={Boolean(session?.staleReason) || !session?.redoStack.length} onClick={onRedo}><Redo2 /></button>
          {dirty && !session?.staleReason ? <button type="button" className="icon-text-button" data-testid="stratification-discard" onClick={onDiscard}><RotateCcw className="button-icon" />放弃编辑</button> : null}
        </div>
      </section> : null}

      {scheme ? (
        <>
          <section className="stratification-editor-grid" data-testid="stratification-editor">
            <div className="stratification-curve-pane">
              <div className="section-header">
                <div><h2>CPT 曲线与分层边界</h2><span>选择土层或拖动边界；深度向下增加。</span></div>
                <div className="stratification-edit-tools">
                  {thinLayerReviewed ? <button type="button" className="icon-text-button" data-testid="stratification-open-thin-layer-guide" disabled={stale} onClick={onOpenThinLayerGuide}>整理分层</button> : null}
                  <button
                    type="button"
                    className="icon-text-button"
                    data-testid="stratification-add-boundary"
                    disabled={stale}
                    onClick={() => onCommand({ kind: 'add-boundary', depthM: displayedSelectedLayer ? (displayedSelectedLayer.depthFromM + displayedSelectedLayer.depthToM) / 2 : (scheme.depthFromM + scheme.depthToM) / 2 })}
                  >
                    <Plus className="button-icon" />添加边界
                  </button>
                </div>
              </div>
              <div className="stratification-display-toolbar">
                <div className="stratification-view-modes" role="group" aria-label="图表显示范围" data-testid="stratification-view-modes">
                  <button type="button" aria-pressed={viewMode === 'overview'} className={viewMode === 'overview' ? 'selected' : ''} onClick={() => setViewMode('overview')} data-testid="stratification-view-overview">全孔概览</button>
                  <button type="button" aria-pressed={viewMode === 'focus'} className={viewMode === 'focus' ? 'selected' : ''} onClick={() => { setFocusLayerId(displayedSelectedLayer?.layerId ?? ''); setViewMode('focus'); }} disabled={!displayedSelectedLayer} data-testid="stratification-view-focus">放大当前层</button>
                  <button type="button" aria-pressed={viewMode === 'expanded'} className={viewMode === 'expanded' ? 'selected' : ''} onClick={() => setViewMode('expanded')} data-testid="stratification-view-expanded">全孔展开</button>
                </div>
                <div className="stratification-view-summary" data-testid="stratification-view-summary">
                  <strong>{displayedDepthRange!.depthFromM.toFixed(2)}–{displayedDepthRange!.depthToM.toFixed(2)} m</strong>
                  <em>{viewMode === 'overview' ? '全孔只看曲线、层厚和边界；层名在右侧查看。' : viewMode === 'focus' ? '当前层局部范围，显示黑色层名并保持同一深度轴。' : '完整深度纵向展开，不在图内堆叠层名。'}</em>
                </div>
              </div>
              {displayedRuleCandidates.length ? <div className="stratification-plot-legend" aria-label="边界图例"><span className="candidate">规则候选</span><span className="current">当前方案边界</span></div> : null}
              <div ref={sharedPlotRef} className={`stratification-plot with-shared-boundaries view-${viewMode}`} data-testid="stratification-shared-plot">
                <CptCurveTrack
                  draft={draft}
                  depthFromM={displayedDepthRange!.depthFromM}
                  depthToM={displayedDepthRange!.depthToM}
                  candidates={displayedRuleCandidates}
                  selectedCandidateId={selectedRuleCandidateId}
                  onSelectCandidate={onSelectRuleCandidate}
                  anomalyIntervals={jtsAnomalyIntervals}
                  ignoredAnomalies={jtsAnomaliesAccepted}
                  selectedInterval={displayedSelectedLayer ? { depthFromM: displayedSelectedLayer.depthFromM, depthToM: displayedSelectedLayer.depthToM } : undefined}
                />
                <EditableStratificationTrack
                  scheme={scheme}
                  boundaries={renderableBoundaries}
                  depthFromM={displayedDepthRange!.depthFromM}
                  depthToM={displayedDepthRange!.depthToM}
                  viewMode={viewMode}
                  selectedLayerId={displayedSelectedLayer?.layerId ?? ''}
                  selectedBoundaryId={selectedBoundary?.boundaryId ?? ''}
                  onSelectLayer={onSelectLayer}
                  onSelectBoundary={onSelectBoundary}
                  onMoveBoundary={(boundaryId, depthM) => Boolean(onCommand({ kind: 'move-boundary', boundaryId, depthM }))}
                  readOnly={stale}
                  candidates={displayedRuleCandidates}
                  selectedCandidateId={selectedRuleCandidateId}
                  onSelectCandidate={onSelectRuleCandidate}
                  onPreviewBoundary={previewSharedBoundary}
                />
                <SharedBoundaryOverlay
                  boundaries={renderableBoundaries}
                  depthFromM={displayedDepthRange!.depthFromM}
                  depthToM={displayedDepthRange!.depthToM}
                  selectedBoundaryId={selectedBoundary?.boundaryId ?? ''}
                  overlayRef={sharedBoundaryOverlayRef}
                />
              </div>
              <JtsSbtChart
                run={sbtRunState === 'current' ? activeJtsRun : null}
                runState={sbtRunState}
                selectedLayer={displayedSelectedLayer}
                includeSelectedBottom={Boolean(displayedSelectedLayer && scheme.layers.at(-1)?.layerId === displayedSelectedLayer.layerId)}
              />
            </div>

            <StratificationLayerDecisionPanel
              scheme={scheme}
              selectedLayer={displayedSelectedLayer}
              issues={issues}
              jtsRuns={workspace.jtsClassificationRuns ?? []}
              stale={stale}
              onSelectLayer={selectLayerAndFocus}
              onSelectBoundary={onSelectBoundary}
              onCommand={onCommand}
            />
          </section>
        </>
      ) : currentRuleRun?.status === 'completed' ? (
        <section className="stratification-editor-grid rule-preview-grid" data-testid="stratification-rule-preview">
          <div className="stratification-curve-pane">
            <div className="section-header"><div><h2>分层边界候选预览</h2><span>只找边界，不判断土类；候选尚未形成方案。</span></div></div>
            <div className="stratification-plot">
              <CptCurveTrack
                draft={draft}
                depthFromM={Math.min(...currentRuleRun.inputRowsSnapshot.map((row) => row.depthM))}
                depthToM={Math.max(...currentRuleRun.inputRowsSnapshot.map((row) => row.depthM))}
                candidates={ruleCandidates}
                selectedCandidateId={selectedRuleCandidateId}
                onSelectCandidate={onSelectRuleCandidate}
              />
              <RuleCandidatePreviewTrack
                run={currentRuleRun}
                selectedCandidateId={selectedRuleCandidateId}
                onSelectCandidate={onSelectRuleCandidate}
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CptCurveTrack({
  draft,
  depthFromM,
  depthToM,
  candidates = [],
  selectedCandidateId = '',
  onSelectCandidate = () => undefined,
  anomalyIntervals = [],
  ignoredAnomalies = false,
  selectedInterval,
}: {
  draft: ImportDraft;
  depthFromM: number;
  depthToM: number;
  candidates?: StratificationRuleCandidateV1[];
  selectedCandidateId?: string;
  onSelectCandidate?: (candidateId: string) => void;
  anomalyIntervals?: JtsGuidanceInterval[];
  ignoredAnomalies?: boolean;
  selectedInterval?: { depthFromM: number; depthToM: number };
}) {
  const chartRows = useMemo(
    () => draft.rows.filter((row) => row.depthM >= depthFromM && row.depthM <= depthToM).map((row, index) => ({ sourceRowId: `draft-${index}-${row.depthM}`, depthM: row.depthM, qcKpa: row.qcKpa, fsKpa: row.fsKpa, u2Kpa: Number.isFinite(row.u2Kpa) ? row.u2Kpa : null })),
    [depthFromM, depthToM, draft.rows],
  );
  const span = Math.max(0.001, depthToM - depthFromM);
  return (
    <div className="cpt-curve-track linked" data-testid="stratification-qc-curve">
      <JtsLinkedEvidence
        rows={chartRows}
        intervals={anomalyIntervals}
        ignored={ignoredAnomalies}
        aligned
        selectedInterval={selectedInterval}
        displayDepthFromM={depthFromM}
        displayDepthToM={depthToM}
      />
      <div className="stratification-curve-overlay" aria-hidden={!candidates.length}>
      {candidates.filter((candidate) => candidate.depthM > depthFromM && candidate.depthM < depthToM).map((candidate) => (
        <button
          type="button"
          key={candidate.candidateId}
          className={`rule-candidate-marker ${candidate.candidateId === selectedCandidateId ? 'selected' : ''}`}
          style={{ top: `${((candidate.depthM - depthFromM) / span) * 100}%` }}
          onClick={() => onSelectCandidate(candidate.candidateId)}
          aria-label={`候选边界 ${candidate.depthM.toFixed(2)} m，评分 ${candidate.score.toFixed(3)}`}
          data-testid={`stratification-rule-curve-candidate-${candidate.candidateId}`}
        ><span>{candidate.score.toFixed(3)}</span></button>
      ))}
      </div>
    </div>
  );
}

function EditableStratificationTrack({
  scheme,
  boundaries,
  depthFromM,
  depthToM,
  viewMode,
  selectedLayerId,
  selectedBoundaryId,
  onSelectLayer,
  onSelectBoundary,
  onMoveBoundary,
  readOnly,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onPreviewBoundary,
}: {
  scheme: StratificationSchemeV2;
  boundaries: StratificationBoundaryV2[];
  depthFromM: number;
  depthToM: number;
  viewMode: StratificationViewMode;
  selectedLayerId: string;
  selectedBoundaryId: string;
  onSelectLayer: (layerId: string) => void;
  onSelectBoundary: (boundaryId: string) => void;
  onMoveBoundary: (boundaryId: string, depthM: number) => boolean;
  readOnly: boolean;
  candidates: StratificationRuleCandidateV1[];
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
  onPreviewBoundary: (boundaryId: string, depthM: number | null) => void;
}) {
  const span = Math.max(0.001, depthToM - depthFromM);
  const selectedLayer = scheme.layers.find((layer) => layer.layerId === selectedLayerId) ?? null;
  const selectedLayerCenter = selectedLayer ? Math.min(depthToM, Math.max(depthFromM, (selectedLayer.depthFromM + selectedLayer.depthToM) / 2)) : null;
  const labelThresholdPercent = 8;
  return (
    <div className={`editable-layer-track view-${viewMode}`} data-testid="stratification-layer-track" data-depth-from={depthFromM} data-depth-to={depthToM}>
      <div className="stratification-depth-scale">
        {Array.from({ length: 6 }, (_, index) => depthFromM + (span * index) / 5).map((depth) => <span key={depth} style={{ top: `${((depth - depthFromM) / span) * 100}%` }}>{depth.toFixed(2)} m</span>)}
      </div>
      <div className="editable-layer-column">
        {scheme.layers.map((layer, index) => ({ layer, index })).filter(({ layer }) => layer.depthToM > depthFromM && layer.depthFromM < depthToM).map(({ layer, index }) => {
          const visibleFromM = Math.max(depthFromM, layer.depthFromM);
          const visibleToM = Math.min(depthToM, layer.depthToM);
          const visiblePercent = ((visibleToM - visibleFromM) / span) * 100;
          const showLabel = viewMode === 'focus' && visiblePercent >= labelThresholdPercent && layer.layerId !== selectedLayerId;
          return (
          <button
            type="button"
            key={layer.layerId}
            className={`editable-layer-block soil-${layer.engineeringSoilGroup} ${showLabel ? 'has-label' : 'compact'} ${layer.layerId === selectedLayerId ? 'selected' : ''} ${layer.soilDecision?.reviewStatus === 'deferred' ? 'deferred' : stratificationLayerNeedsDecision(layer) ? 'pending' : 'accepted'}`}
            style={{ top: `${((visibleFromM - depthFromM) / span) * 100}%`, height: `${visiblePercent}%` }}
            onClick={() => onSelectLayer(layer.layerId)}
            data-layer-id={layer.layerId}
            data-testid={`stratification-layer-block-${index + 1}`}
            aria-label={`L${index + 1}，${layer.depthFromM.toFixed(2)} 至 ${layer.depthToM.toFixed(2)} 米，${stratificationLayerDisplayLabel(layer)}`}
          >
            {showLabel ? <><strong>L{index + 1}</strong><span>{stratificationLayerDisplayLabel(layer)}</span></> : null}
          </button>
        ); })}
        {viewMode === 'focus' && selectedLayer && selectedLayerCenter !== null && selectedLayer.depthToM > depthFromM && selectedLayer.depthFromM < depthToM ? <div className="selected-layer-callout" style={{ top: `${Math.min(96, Math.max(4, ((selectedLayerCenter - depthFromM) / span) * 100))}%` }} data-testid="stratification-selected-layer-callout"><strong>L{scheme.layers.findIndex((layer) => layer.layerId === selectedLayer.layerId) + 1}</strong><span>{selectedLayer.depthFromM.toFixed(2)}–{selectedLayer.depthToM.toFixed(2)} m</span><em>{stratificationLayerDisplayLabel(selectedLayer)}</em></div> : null}
        {boundaries.map((boundary, index) => ({ boundary, index })).filter(({ boundary }) => boundary.depthM > depthFromM && boundary.depthM < depthToM).map(({ boundary, index }) => (
          <EditableBoundaryMarker
            key={boundary.boundaryId}
            boundary={boundary}
            index={index}
            scheme={scheme}
            depthFromM={depthFromM}
            depthToM={depthToM}
            selected={boundary.boundaryId === selectedBoundaryId}
            showLabel={boundary.boundaryId === selectedBoundaryId}
            readOnly={readOnly}
            onSelect={() => onSelectBoundary(boundary.boundaryId)}
            onMove={(depthM) => onMoveBoundary(boundary.boundaryId, depthM)}
            onPreview={(depthM) => onPreviewBoundary(boundary.boundaryId, depthM)}
          />
        ))}
        {candidates.filter((candidate) => candidate.depthM > depthFromM && candidate.depthM < depthToM).map((candidate) => (
          <button
            type="button"
            key={candidate.candidateId}
            className={`rule-candidate-layer-marker ${candidate.candidateId === selectedCandidateId ? 'selected' : ''}`}
            style={{ top: `${((candidate.depthM - depthFromM) / span) * 100}%` }}
            onClick={() => onSelectCandidate(candidate.candidateId)}
            aria-label={`规则候选 ${candidate.depthM.toFixed(2)} m`}
          ><span>{candidate.depthM.toFixed(2)} m</span></button>
        ))}
      </div>
    </div>
  );
}

function SharedBoundaryOverlay({ boundaries, depthFromM, depthToM, selectedBoundaryId, overlayRef }: {
  boundaries: StratificationBoundaryV2[];
  depthFromM: number;
  depthToM: number;
  selectedBoundaryId: string;
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const span = Math.max(0.001, depthToM - depthFromM);
  return (
    <div ref={overlayRef} className="shared-boundary-overlay" aria-hidden="true" data-testid="stratification-shared-boundary-overlay">
      {boundaries.map((boundary, index) => {
        const depthM = boundary.depthM;
        if (depthM <= depthFromM || depthM >= depthToM) return null;
        return <span
          key={boundary.boundaryId}
          className={`shared-boundary-line ${boundary.boundaryId === selectedBoundaryId ? 'selected' : ''} ${boundary.reviewRequired ? 'review' : ''}`}
          style={{ top: `${((depthM - depthFromM) / span) * 100}%` }}
          data-testid={`stratification-shared-boundary-${index + 1}`}
          data-boundary-id={boundary.boundaryId}
          data-depth={depthM}
        />;
      })}
    </div>
  );
}

function RuleCandidatePreviewTrack({ run, selectedCandidateId, onSelectCandidate }: {
  run: StratificationRuleRunV1;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const depthFromM = Math.min(...run.inputRowsSnapshot.map((row) => row.depthM));
  const depthToM = Math.max(...run.inputRowsSnapshot.map((row) => row.depthM));
  const span = Math.max(0.001, depthToM - depthFromM);
  return (
    <div className="editable-layer-track rule-candidate-preview-track" data-testid="stratification-rule-candidate-track">
      <div className="stratification-depth-scale">
        {Array.from({ length: 6 }, (_, index) => depthFromM + (span * index) / 5).map((depth) => <span key={depth} style={{ top: `${((depth - depthFromM) / span) * 100}%` }}>{depth.toFixed(2)} m</span>)}
      </div>
      <div className="editable-layer-column">
        <div className="rule-candidate-empty-layer"><span>尚未形成方案</span></div>
        {run.candidates.map((candidate) => (
          <button
            type="button"
            key={candidate.candidateId}
            className={`rule-candidate-layer-marker ${candidate.candidateId === selectedCandidateId ? 'selected' : ''}`}
            style={{ top: `${((candidate.depthM - depthFromM) / span) * 100}%` }}
            onClick={() => onSelectCandidate(candidate.candidateId)}
            data-testid={`stratification-rule-candidate-${candidate.candidateId}`}
          ><span>{candidate.depthM.toFixed(2)} m · {candidate.score.toFixed(3)}</span></button>
        ))}
      </div>
    </div>
  );
}

function RuleCandidateList({ run, selectedCandidateId, onSelectCandidate }: {
  run: StratificationRuleRunV1;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
}) {
  if (!run.candidates.length) return <p className="short-note">当前设置下没有候选边界。</p>;
  return (
    <div className="rule-candidate-list" data-testid="stratification-rule-candidate-list">
      {run.candidates.map((candidate, index) => (
        <button type="button" key={candidate.candidateId} className={candidate.candidateId === selectedCandidateId ? 'selected' : ''} onClick={() => onSelectCandidate(candidate.candidateId)}>
          <span>B{index + 1}</span><strong>{candidate.depthM.toFixed(2)} m</strong><em>{candidate.score.toFixed(3)}</em>
        </button>
      ))}
    </div>
  );
}

function EditableBoundaryMarker({ boundary, index, scheme, depthFromM, depthToM, selected, showLabel, readOnly, onSelect, onMove, onPreview }: {
  boundary: StratificationBoundaryV2;
  index: number;
  scheme: StratificationSchemeV2;
  depthFromM?: number;
  depthToM?: number;
  selected: boolean;
  showLabel?: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onMove: (depthM: number) => boolean;
  onPreview: (depthM: number | null) => void;
}) {
  const displayDepthFromM = depthFromM ?? scheme.depthFromM;
  const displayDepthToM = depthToM ?? scheme.depthToM;
  const span = Math.max(0.001, displayDepthToM - displayDepthFromM);
  const [previewDepth, setPreviewDepth] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragMoved = useRef(false);
  const commitPending = useRef(false);
  const depth = previewDepth ?? boundary.depthM;
  useEffect(() => {
    if (!commitPending.current) return;
    commitPending.current = false;
    setPreviewDepth(null);
    onPreview(null);
  }, [boundary.depthM]);
  function depthFromPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const track = event.currentTarget.closest('.editable-layer-column');
    const rect = track?.getBoundingClientRect();
    if (!rect) return boundary.depthM;
    const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const rawDepth = displayDepthFromM + ratio * span;
    const upper = scheme.layers.find((layer) => layer.layerId === boundary.upperLayerId);
    const lower = scheme.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
    const minimum = upper ? upper.depthFromM + PROTOTYPE_EDIT_SPACING_M : displayDepthFromM;
    const maximum = lower ? lower.depthToM - PROTOTYPE_EDIT_SPACING_M : displayDepthToM;
    return Number(Math.min(maximum, Math.max(minimum, rawDepth)).toFixed(3));
  }
  return (
    <button
      type="button"
      className={`editable-boundary-marker ${selected ? 'selected' : ''} ${boundary.reviewRequired ? 'review' : ''} ${readOnly ? 'read-only' : ''}`}
      style={{ top: `${((depth - displayDepthFromM) / span) * 100}%` }}
      data-testid={`stratification-boundary-${index + 1}`}
      aria-label={`边界 B${index + 1}，深度 ${depth.toFixed(2)} 米${boundary.reviewRequired ? '，待复核' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      onPointerDown={(event) => {
        if (readOnly) {
          onSelect();
          return;
        }
        dragStartY.current = event.clientY;
        dragMoved.current = false;
        commitPending.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect();
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        if (Math.abs(event.clientY - dragStartY.current) < 3) return;
        dragMoved.current = true;
        const nextDepth = depthFromPointer(event);
        setPreviewDepth(nextDepth);
        onPreview(nextDepth);
      }}
      onPointerUp={(event) => {
        if (readOnly || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const nextDepth = depthFromPointer(event);
        if (dragMoved.current) {
          setPreviewDepth(nextDepth);
          onPreview(nextDepth);
          commitPending.current = true;
          const accepted = onMove(nextDepth);
          if (!accepted || Math.abs(nextDepth - boundary.depthM) < 0.0005) {
            commitPending.current = false;
            setPreviewDepth(null);
            onPreview(null);
          }
        } else {
          setPreviewDepth(null);
          onPreview(null);
        }
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setPreviewDepth(null);
        dragMoved.current = false;
        commitPending.current = false;
        onPreview(null);
      }}
      onLostPointerCapture={() => {
        if (commitPending.current) return;
        setPreviewDepth(null);
        onPreview(null);
      }}
    >
      {showLabel ? <span>{depth.toFixed(2)} m</span> : null}
    </button>
  );
}

function StratificationWorkbenchRightPanel({
  workspace,
  currentCheckInput,
  scheme,
  selectedLayer,
  selectedBoundary,
  commandProblem,
  recoveryIssue,
  autoRecovery,
  mode,
  activeRuleRun,
  activeJtsRun,
  selectedRuleCandidateId,
  advancedToolsOpen,
  onAdvancedToolsOpenChange,
  onModeChange,
  onSelectRuleCandidate,
  onRunRule,
  onApplyRule,
  onRunJts,
  onApplyJts,
  onReviewJtsDecision,
  onExecuteRecovery,
  onRenameScheme,
  onDuplicateScheme,
  onDeleteScheme,
  onCommand,
}: {
  workspace: StratificationWorkspaceV2;
  currentCheckInput: StratificationInputDependencyV2 | null;
  scheme: StratificationSchemeV2 | null;
  selectedLayer: StratificationLayerV2 | null;
  selectedBoundary: StratificationBoundaryV2 | null;
  commandProblem: string;
  recoveryIssue: JtsClassificationRecoveryIssue | null;
  autoRecovery: JtsAutoRecoveryState | null;
  mode: 'manual' | 'rule' | 'jts';
  activeRuleRun: StratificationRuleRunV1 | null;
  activeJtsRun: JtsClassificationRunV4 | null;
  selectedRuleCandidateId: string;
  advancedToolsOpen: boolean;
  onAdvancedToolsOpenChange: (open: boolean) => void;
  onModeChange: (mode: 'manual' | 'rule' | 'jts') => void;
  onSelectRuleCandidate: (candidateId: string) => void;
  onRunRule: (settings: StratificationRuleSettingsV1) => void;
  onApplyRule: () => void;
  onRunJts: () => void;
  onApplyJts: (candidateMode?: 'stable' | 'all', acceptedUnclassifiableRows?: number) => void;
  onReviewJtsDecision: () => void;
  onExecuteRecovery: (optionId: JtsRecoveryOptionId) => void;
  onRenameScheme: (name: string) => void;
  onDuplicateScheme: () => void;
  onDeleteScheme: (replacementSchemeId?: string) => void;
  onCommand: (command: StratificationCommand) => void;
}) {
  const [schemeName, setSchemeName] = useState(scheme?.name ?? '');
  const [layerName, setLayerName] = useState(selectedLayer?.name ?? '');
  const [layerDescription, setLayerDescription] = useState(selectedLayer?.description ?? '');
  const [boundaryDepth, setBoundaryDepth] = useState(selectedBoundary?.depthM.toFixed(3) ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeIntent, setMergeIntent] = useState<
    | { kind: 'boundary'; boundaryId: string }
    | { kind: 'layer'; layerId: string; direction: 'above' | 'below' }
    | null
  >(null);
  const [mergeReason, setMergeReason] = useState<ManualMergeReason>('curve-evidence');
  const readOnly = scheme?.status === 'stale'
    || Boolean(scheme && !sameStratificationInput(scheme.input, currentCheckInput))
    || Boolean(workspace.editSession?.schemeId === scheme?.schemeId && workspace.editSession?.staleReason);
  const replacementSchemes = scheme ? workspace.schemes.filter((candidate) =>
    candidate.schemeId !== scheme.schemeId && isEligibleStratificationReplacement(candidate, currentCheckInput),
  ) : [];
  const [replacementSchemeId, setReplacementSchemeId] = useState(replacementSchemes[0]?.schemeId ?? '');
  useEffect(() => setSchemeName(scheme?.name ?? ''), [scheme?.name, scheme?.schemeId]);
  useEffect(() => { setLayerName(selectedLayer?.name ?? ''); setLayerDescription(selectedLayer?.description ?? ''); }, [selectedLayer?.description, selectedLayer?.layerId, selectedLayer?.name]);
  useEffect(() => setBoundaryDepth(selectedBoundary?.depthM.toFixed(3) ?? ''), [selectedBoundary?.boundaryId, selectedBoundary?.depthM]);
  useEffect(() => setReplacementSchemeId(replacementSchemes[0]?.schemeId ?? ''), [scheme?.schemeId, workspace.schemes.length]);
  useEffect(() => setDeleteOpen(false), [scheme?.schemeId]);
  useEffect(() => setMergeIntent(null), [scheme?.schemeId, selectedBoundary?.boundaryId, selectedLayer?.layerId]);

  const mergeImpact = useMemo(() => {
    if (!scheme || !mergeIntent) return null;
    const boundary = mergeIntent.kind === 'boundary'
      ? scheme.boundaries.find((item) => item.boundaryId === mergeIntent.boundaryId)
      : mergeIntent.direction === 'above'
        ? scheme.boundaries.find((item) => item.lowerLayerId === mergeIntent.layerId)
        : scheme.boundaries.find((item) => item.upperLayerId === mergeIntent.layerId);
    if (!boundary) return null;
    const upper = scheme.layers.find((layer) => layer.layerId === boundary.upperLayerId);
    const lower = scheme.layers.find((layer) => layer.layerId === boundary.lowerLayerId);
    return upper && lower ? { boundary, upper, lower } : null;
  }, [mergeIntent, scheme]);

  function confirmManualMerge() {
    if (!mergeIntent || !mergeImpact) return;
    if (mergeIntent.kind === 'boundary') onCommand({ kind: 'remove-boundary', boundaryId: mergeIntent.boundaryId, reason: mergeReason });
    else onCommand({ kind: 'merge-layer', layerId: mergeIntent.layerId, direction: mergeIntent.direction, reason: mergeReason });
    setMergeIntent(null);
  }

  return (
    <RightPanelShell
      title={mode === 'rule' ? '只找分层边界' : readOnly ? '只读方案' : selectedBoundary ? '边界工具' : selectedLayer ? '土层工具' : '方案管理'}
      eyebrow={mode === 'rule' ? '公式 / 规则分层' : readOnly ? '当前方案' : selectedBoundary ? '当前边界' : selectedLayer ? '当前土层' : '当前方案'}
      showTabs={false}
    >
      <details className="stratification-advanced-tools" open={advancedToolsOpen} onToggle={(event) => onAdvancedToolsOpenChange(event.currentTarget.open)} data-testid="stratification-advanced-tools">
        <summary data-testid="stratification-advanced-tools-toggle">高级手动工具</summary>
        <p className="short-note">仅在需要重新运行方法或精细调整时使用；打开和关闭都不会丢失指南进度。</p>
      <div className="dock-segmented-control" role="group" aria-label="分层工具模式" data-testid="stratification-tool-mode">
        <button type="button" className={mode === 'manual' ? 'selected' : ''} onClick={() => onModeChange('manual')}>高级手动调整</button>
        <button type="button" className={mode === 'rule' ? 'selected' : ''} onClick={() => onModeChange('rule')}>仅生成边界候选</button>
      </div>
      <button type="button" className={`toolbar-button dock-action ${mode === 'jts' ? 'primary' : ''}`} onClick={() => onModeChange('jts')} data-testid="stratification-mode-jts">选择分类方法</button>
      {mode === 'jts' ? (
        <>
          {recoveryIssue ? (
            <JtsRecoveryPanel issue={recoveryIssue} recovery={autoRecovery} onExecute={onExecuteRecovery} />
          ) : (
            <>
              {autoRecovery?.phase === 'completed' ? <JtsRecoverySuccess recovery={autoRecovery} /> : null}
              <JtsClassificationTool
                run={activeJtsRun}
                currentCheckInput={currentCheckInput}
                recovery={autoRecovery}
                onRun={onRunJts}
                onApply={onApplyJts}
                onReviewDecision={onReviewJtsDecision}
                onOpenCheck={() => onExecuteRecovery('open-check')}
                onOpenPointContext={() => onExecuteRecovery('open-point-context')}
                onQuickSmoothing={() => onExecuteRecovery('standard-smoothing')}
              />
            </>
          )}
          {commandProblem ? <section className="query-card" data-testid="stratification-problem-tool"><div className="query-card-heading"><h2>本次操作未执行</h2></div><p className="short-note problem-text">{commandProblem}</p></section> : null}
        </>
      ) : mode === 'rule' ? (
        <StratificationRuleTool
          run={activeRuleRun}
          currentCheckInput={currentCheckInput}
          selectedCandidateId={selectedRuleCandidateId}
          onSelectCandidate={onSelectRuleCandidate}
          onRun={onRunRule}
          onApply={onApplyRule}
        />
      ) : !scheme ? (
        <section className="query-card inspector-primary"><h2>尚无方案</h2><p className="short-note">请从页面顶部的新建入口建立一层基础方案。</p></section>
      ) : (
        <>
          <section className="query-card inspector-primary" data-testid="stratification-scheme-tool">
            <div className="query-card-heading"><h2>方案</h2></div>
            {readOnly ? (
              <>
                <PropertyRow label="名称" value={scheme.name} />
                <PropertyRow label="版本" value={`v${scheme.version}`} />
                <PropertyRow label="旧检查依据" value={compactWorkspaceIdentifier(scheme.input.checkRunId)} />
                <PropertyRow label="提交记录" value={`${workspace.revisions?.filter((revision) => revision.schemeId === scheme.schemeId).length ?? 0} 个`} />
                <p className="short-note">{workspace.editSession?.staleReason ? '未提交修改已保留为只读内容。放弃后可基于最新检查创建修订方案。' : '该方案仅保留为只读历史。请使用页面顶部的“创建修订方案”继续。'}</p>
              </>
            ) : (
              <>
                <label className="dock-field"><span>名称</span><input value={schemeName} onChange={(event) => setSchemeName(event.target.value)} data-testid="stratification-scheme-name" /></label>
                <div className="dock-action-grid">
                  <button type="button" className="toolbar-button" onClick={() => onRenameScheme(schemeName)}><Pencil className="button-icon" />重命名</button>
                  <button type="button" className="toolbar-button" data-testid="stratification-duplicate" onClick={onDuplicateScheme}><Copy className="button-icon" />复制</button>
                  <button
                    type="button"
                    className="toolbar-button danger"
                    onClick={() => setDeleteOpen(true)}
                  ><Trash2 className="button-icon" />删除</button>
                </div>
                {deleteOpen ? (
                  <div className="dock-confirmation" data-testid="stratification-delete-confirmation">
                    <strong>确认删除“{scheme.name}”</strong>
                    {workspace.currentSchemeId === scheme.schemeId ? (
                      replacementSchemes.length ? (
                        <label className="dock-field"><span>删除后作为当前工作方案</span><select value={replacementSchemeId} onChange={(event) => setReplacementSchemeId(event.target.value)} data-testid="stratification-replacement-scheme">{replacementSchemes.map((candidate) => <option key={candidate.schemeId} value={candidate.schemeId}>{candidate.name}</option>)}</select></label>
                      ) : <p className="short-note problem-text">没有符合条件的替代方案，当前工作方案不能删除。</p>
                    ) : <p className="short-note">删除后仍保留其他方案及其提交记录。</p>}
                    <div className="dock-action-grid">
                      <button type="button" className="toolbar-button" onClick={() => setDeleteOpen(false)}>取消</button>
                      <button type="button" className="toolbar-button danger" disabled={workspace.currentSchemeId === scheme.schemeId && !replacementSchemeId} data-testid="stratification-delete-confirm" onClick={() => onDeleteScheme(workspace.currentSchemeId === scheme.schemeId ? replacementSchemeId || undefined : undefined)}>确认删除</button>
                    </div>
                  </div>
                ) : null}
                <PropertyRow label="版本" value={`v${scheme.version}`} />
                <PropertyRow label="提交记录" value={`${workspace.revisions?.filter((revision) => revision.schemeId === scheme.schemeId).length ?? 0} 个`} />
                <PropertyRow label="依赖检查" value={compactWorkspaceIdentifier(scheme.input.checkRunId)} />
                <PropertyRow label="编辑" value={workspace.editSession?.schemeId === scheme.schemeId && workspace.editSession.dirty ? '有未提交修改' : '无未提交修改'} />
              </>
            )}
          </section>

          {!readOnly && selectedBoundary ? (
            <section className="query-card" data-testid="stratification-boundary-tool">
              <div className="query-card-heading"><h2>边界</h2><span>B{scheme.boundaries.findIndex((item) => item.boundaryId === selectedBoundary.boundaryId) + 1}</span></div>
              <label className="dock-field"><span>深度 (m)</span><input type="number" step="0.01" value={boundaryDepth} onChange={(event) => setBoundaryDepth(event.target.value)} data-testid="stratification-boundary-depth" /></label>
              <div className="boundary-stepper">
                <button type="button" className="icon-button" aria-label="边界上移 0.01 m" onClick={() => onCommand({ kind: 'move-boundary', boundaryId: selectedBoundary.boundaryId, depthM: selectedBoundary.depthM - 0.01 })}>−</button>
                <button type="button" className="toolbar-button" data-testid="stratification-apply-boundary-depth" onClick={() => onCommand({ kind: 'move-boundary', boundaryId: selectedBoundary.boundaryId, depthM: Number(boundaryDepth) })}>应用深度</button>
                <button type="button" className="icon-button" aria-label="边界下移 0.01 m" onClick={() => onCommand({ kind: 'move-boundary', boundaryId: selectedBoundary.boundaryId, depthM: selectedBoundary.depthM + 0.01 })}>+</button>
              </div>
              <label className="dock-check"><input type="checkbox" checked={selectedBoundary.reviewRequired} onChange={(event) => onCommand({ kind: 'set-boundary-review', boundaryId: selectedBoundary.boundaryId, reviewRequired: event.target.checked })} />标记为需复核</label>
              <label className="dock-check"><input type="checkbox" checked={Boolean(selectedBoundary.majorGroupMergeLocked)} onChange={(event) => onCommand({ kind: 'set-boundary-major-group-lock', boundaryId: selectedBoundary.boundaryId, locked: event.target.checked })} />按大类合并时保留此边界</label>
              <button type="button" className="toolbar-button danger dock-action" data-testid="stratification-delete-boundary" onClick={() => setMergeIntent({ kind: 'boundary', boundaryId: selectedBoundary.boundaryId })}><Trash2 className="button-icon" />删除并合并相邻层</button>
              {mergeIntent?.kind === 'boundary' ? <ManualMergeConfirmation impact={mergeImpact} reason={mergeReason} onReason={setMergeReason} onCancel={() => setMergeIntent(null)} onConfirm={confirmManualMerge} /> : null}
            </section>
          ) : !readOnly && selectedLayer ? (
            <section className="query-card" data-testid="stratification-layer-tool">
              <div className="query-card-heading"><h2>土层</h2><span>{(selectedLayer.depthToM - selectedLayer.depthFromM).toFixed(2)} m</span></div>
              <label className="dock-field"><span>显示名称（可重复）</span><input value={layerName} onChange={(event) => setLayerName(event.target.value)} data-testid="stratification-layer-name" /></label>
              <button type="button" className="toolbar-button dock-action" onClick={() => onCommand({ kind: 'rename-layer', layerId: selectedLayer.layerId, name: layerName })}>更新显示名称</button>
              <label className="dock-field"><span>土类</span><select value={selectedLayer.engineeringSoilGroup} onChange={(event) => onCommand({ kind: 'set-layer-soil-group', layerId: selectedLayer.layerId, engineeringSoilGroup: event.target.value })}><option value="unclassified">未分类</option><option value="sand">砂土</option><option value="mixed">混合土</option><option value="clay">黏性土</option></select></label>
              {selectedLayer.engineeringSoilGroup !== 'unclassified' ? <label className="dock-field"><span>代表细分类（可选）</span><select value={selectedLayer.soilDecision?.finalDetailedType ?? ''} onChange={(event) => { if (event.target.value) onCommand({ kind: 'set-layer-soil-classification', layerId: selectedLayer.layerId, engineeringSoilGroup: selectedLayer.engineeringSoilGroup, detailedSoilType: event.target.value }); }} data-testid="stratification-layer-detailed-soil"><option value="">未指定</option>{STRATIFICATION_SOIL_TYPE_CATALOG.filter((entry) => entry.group === selectedLayer.engineeringSoilGroup).map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}</select></label> : null}
              {selectedLayer.soilConfirmationRequired && selectedLayer.engineeringSoilGroup !== 'unclassified' ? (
                <button type="button" className="toolbar-button primary dock-action" data-testid="stratification-accept-suggested-soil" onClick={() => onCommand({ kind: 'confirm-layer-soil-group', layerId: selectedLayer.layerId })}>接受建议：{stratificationSoilGroupLabel(selectedLayer.engineeringSoilGroup)}</button>
              ) : null}
              <label className="dock-field"><span>描述</span><textarea value={layerDescription} onChange={(event) => setLayerDescription(event.target.value)} rows={3} /></label>
              <button type="button" className="toolbar-button dock-action" onClick={() => onCommand({ kind: 'describe-layer', layerId: selectedLayer.layerId, description: layerDescription })}>更新描述</button>
              <div className="dock-action-grid">
                <button type="button" className="toolbar-button" data-testid="stratification-split-layer" onClick={() => onCommand({ kind: 'split-layer', layerId: selectedLayer.layerId })}>拆分</button>
                <button type="button" className="toolbar-button" onClick={() => setMergeIntent({ kind: 'layer', layerId: selectedLayer.layerId, direction: 'above' })}>向上合并</button>
                <button type="button" className="toolbar-button" onClick={() => setMergeIntent({ kind: 'layer', layerId: selectedLayer.layerId, direction: 'below' })}>向下合并</button>
              </div>
              {mergeIntent?.kind === 'layer' ? <ManualMergeConfirmation impact={mergeImpact} reason={mergeReason} onReason={setMergeReason} onCancel={() => setMergeIntent(null)} onConfirm={confirmManualMerge} /> : null}
            </section>
          ) : null}

          {commandProblem ? (
            <section className="query-card" data-testid="stratification-problem-tool"><div className="query-card-heading"><h2>本次操作未执行</h2></div><p className="short-note problem-text">{commandProblem}</p></section>
          ) : null}
        </>
      )}
      </details>
    </RightPanelShell>
  );
}

function ManualMergeConfirmation({
  impact,
  reason,
  onReason,
  onCancel,
  onConfirm,
}: {
  impact: { boundary: StratificationBoundaryV2; upper: StratificationLayerV2; lower: StratificationLayerV2 } | null;
  reason: ManualMergeReason;
  onReason: (reason: ManualMergeReason) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <div className="dock-confirmation manual-merge-confirmation" data-testid="stratification-manual-merge-confirmation">
    <strong>确认合并相邻层</strong>
    {impact ? <p className="short-note">将删除 {impact.boundary.depthM.toFixed(2)} m 边界，合并为 {impact.upper.depthFromM.toFixed(2)}–{impact.lower.depthToM.toFixed(2)} m；土类继承较厚层。</p> : <p className="short-note problem-text">相邻层已经变化，请取消后重新选择。</p>}
    <label className="dock-field"><span>本次理由</span><select value={reason} onChange={(event) => onReason(event.target.value as ManualMergeReason)} data-testid="stratification-manual-merge-reason"><option value="curve-evidence">已复核当前可用曲线证据（缺失通道不计）</option><option value="classification-equivalent">工程土类可视为同一层</option><option value="engineering-judgement">工程师综合判断后合并</option></select></label>
    <p className="short-note">该操作会进入撤销记录；原始测量不修改。</p>
    <div className="dock-action-grid">
      <button type="button" className="toolbar-button" onClick={onCancel}>取消</button>
      <button type="button" className="toolbar-button danger" disabled={!impact} onClick={onConfirm} data-testid="stratification-manual-merge-confirm">确认合并</button>
    </div>
  </div>;
}

function JtsClassificationTool({
  run,
  currentCheckInput,
  recovery,
  onRun,
  onApply,
  onReviewDecision,
  onOpenCheck,
  onOpenPointContext,
  onQuickSmoothing,
}: {
  run: JtsClassificationRunV4 | null;
  currentCheckInput: StratificationInputDependencyV2 | null;
  recovery: JtsAutoRecoveryState | null;
  onRun: () => void;
  onApply: (candidateMode?: 'stable' | 'all', acceptedUnclassifiableRows?: number) => void;
  onReviewDecision: () => void;
  onOpenCheck: () => void;
  onOpenPointContext: () => void;
  onQuickSmoothing: () => void;
}) {
  const current = Boolean(run && currentCheckInput && run.status === 'completed' && sameStratificationInput(run.input, currentCheckInput));
  const guidance = run ? getJtsClassificationGuidance(run) : null;
  const methodId = run ? classificationMethodId(run) : 'jts-t242-2020';
  const method = classificationMethodMeta(methodId);
  const isJtsMethod = methodId === 'jts-t242-2020';
  const classifiedRows = run?.rows.filter((row) => row.selectedClass).length ?? 0;
  const reviewRows = run?.rows.filter((row) => row.confidence === 'review').length ?? 0;
  const problemRows = run?.rows.filter((row) => row.confidence === 'problem').length ?? 0;
  const pending = Boolean(recovery && ['awaiting-governance', 'awaiting-check', 'running-classification'].includes(recovery.phase));
  const repairAttempted = recovery?.phase === 'completed' && recovery.optionId === 'standard-smoothing';
  if (!run) return (
    <section className="query-card inspector-primary" data-testid="jts-classification-tool">
      <div className="query-card-heading"><h2>分类方法</h2><span>待运行</span></div>
      <p className="short-note">先选择一种分类方法。分类只生成候选，不会自动成为已确认地层。</p>
      <button type="button" className="toolbar-button primary dock-action" onClick={onRun} data-testid="run-jts-classification">选择方法并生成候选</button>
    </section>
  );
  const mustRepair = Boolean(guidance?.unclassifiableRows);
  const requiresRepair = mustRepair && !guidance?.canIgnoreIsolatedAnomalies;
  const primaryLabel = !current
      ? '更新分类'
      : mustRepair
      ? `处理 ${guidance?.isolatedAnomalyIntervalCount ?? 0} 个待确认区间`
      : isJtsMethod && guidance?.canUseIcFallback
        ? '使用 Ic 结果生成地层'
        : '生成可编辑地层方案';
  const primaryAction = !current
      ? onRun
      : mustRepair
        ? onReviewDecision
        : () => onApply('stable');
  return (
    <section className="jts-guidance-panel" data-testid="jts-classification-tool">
      <div className="jts-guidance-heading">
        <span className={requiresRepair ? 'problem' : 'ready'}>{mustRepair ? '需要你的选择' : '分类可以继续'}</span>
        <em>{method.label} · {run.route === 'full_cptu' ? '完整 CPTU 路线' : 'CPT 近似路线'}</em>
      </div>
      <h2>{!current ? '当前分类需要更新' : mustRepair ? `${guidance?.isolatedAnomalyIntervalCount ?? 0} 个区间尚未识别土类` : isJtsMethod ? guidance?.recommendedTitle : `${method.label} 分类已生成`}</h2>
      <p>{!current
          ? '上游数据或上下文已经变化，请先重新运行分类。'
          : mustRepair
            ? `${guidance?.unclassifiableRows ?? 0} 个点已合并为 ${guidance?.isolatedAnomalyIntervalCount ?? 0} 个区间。当前分层方案没有改变。`
            : isJtsMethod
              ? guidance?.recommendedReason
              : `${classifiedRows} 行已有原生类别；${reviewRows} 行需要工程师复核。`}</p>
      {guidance ? <div className="jts-guidance-quick-stats" data-testid="jts-guidance-summary">
        {isJtsMethod ? <>
          <span><strong>{guidance.agreementRows}</strong>双路径一致</span>
          <span><strong>{guidance.icFallbackRows}</strong>仅 Ic 可用</span>
          <span><strong>{guidance.reviewIntervals.length}</strong>区间需确认</span>
        </> : <>
          <span><strong>{classifiedRows}</strong>已分类</span>
          <span><strong>{reviewRows}</strong>需要复核</span>
          <span><strong>{problemRows}</strong>无法分类</span>
        </>}
      </div> : null}
      {guidance && (!mustRepair || guidance.canIgnoreIsolatedAnomalies) ? <div className="jts-guidance-recommendation">
        <strong>为什么推荐</strong>
        <p>{mustRepair
          ? `${guidance.ignoreReason} 忽略只作用于新候选，原始测量保留。`
          : isJtsMethod && guidance.canUseIcFallback
          ? '孔压没有分类结果不等于孔压数据错误。只在受影响区间使用 Ic，其他区间仍保留双路径结果。'
          : isJtsMethod
            ? `检测到 ${guidance.rawCandidateCount} 条边界变化，建议保留 ${guidance.stableCandidates.length} 条；原始证据不变。`
            : `按 ${method.label} 的原生类别变化生成候选边界；工程大类映射已记录，最终土类仍由工程师确认。`}</p>
      </div> : null}
      {recovery ? <p className={`jts-recovery-progress ${recovery.phase}`} data-testid="jts-guided-progress">{recovery.message}</p> : null}
      <button
        type="button"
        className="toolbar-button primary dock-action"
        disabled={pending}
        onClick={primaryAction}
        data-testid={mustRepair ? 'jts-open-exception-decision' : 'apply-jts-classification'}
      >{pending ? '正在处理…' : mustRepair ? '查看当前分类处理' : primaryLabel}</button>
      <p className="jts-guidance-safety">执行前不会修改数据。生成的仍是候选方案，提交前可以调整。</p>
      {guidance && isJtsMethod && run.route === 'full_cptu' ? <details className="jts-guidance-details" data-testid="jts-pore-guidance">
        <summary>检查孔压问题{guidance.icFallbackRows + guidance.poreFallbackRows + guidance.unclassifiableRows ? `（${guidance.icFallbackRows + guidance.poreFallbackRows + guidance.unclassifiableRows} 行）` : ''}</summary>
        <div className="jts-guidance-detail-body">
          {guidance.intervals.filter((interval) => ['ic-fallback', 'pore-fallback', 'unclassifiable'].includes(interval.kind)).slice(0, 6).map((interval) => <JtsGuidanceIntervalRow interval={interval} key={interval.intervalId} />)}
          {guidance.icFallbackRows ? <p className="short-note">图域外区间不能靠修改原始孔压“修复”，使用 Ic 即可继续。</p> : null}
          <button type="button" className="toolbar-button dock-action" onClick={onOpenPointContext} data-testid="jts-guided-open-context">检查水深与压力基准</button>
          <button type="button" className="toolbar-button dock-action" onClick={onOpenCheck} data-testid="jts-guided-open-check">查看完整数据证据</button>
          {guidance.repairableRows && !mustRepair && !repairAttempted ? <button type="button" className="toolbar-button dock-action" disabled={pending} onClick={onQuickSmoothing} data-testid="jts-guided-smoothing">标准平滑后重新分类</button> : null}
        </div>
      </details> : null}
      {guidance ? <details className="jts-guidance-details" data-testid="jts-guidance-advanced">
        <summary>高级手动控制</summary>
        <div className="jts-guidance-detail-body">
          <PropertyRow label="测量行" value={`${guidance.rowCount} 行`} />
          <PropertyRow label={isJtsMethod ? '相邻 / 重大冲突' : '待复核 / 无法分类'} value={isJtsMethod ? `${guidance.adjacentRows} / ${guidance.conflictRows} 行` : `${reviewRows} / ${problemRows} 行`} />
          <PropertyRow label="检测到 / 建议保留" value={`${guidance.rawCandidateCount} / ${guidance.stableCandidates.length} 条`} />
          <button type="button" className="toolbar-button dock-action" onClick={onRun} data-testid="run-jts-classification">重新运行分类</button>
          <button type="button" className="toolbar-button dock-action" disabled={!current || pending || mustRepair} onClick={() => onApply('all')} data-testid="apply-all-jts-classification">保留全部 {guidance.rawCandidateCount} 条原始候选</button>
          <p className="short-note">高级方式不会自动整理短距离反复变化，适合需要逐条控制的用户。</p>
        </div>
      </details> : null}
    </section>
  );
}

function JtsGuidanceIntervalRow({ interval, accepted = false }: { interval: JtsGuidanceInterval; accepted?: boolean }) {
  const label = accepted
    ? '候选保留'
    : interval.kind === 'ic-fallback'
    ? '使用 Ic'
    : interval.kind === 'pore-fallback'
      ? '检查 Ic 输入'
      : interval.kind === 'unclassifiable'
        ? '需要修复'
        : interval.kind === 'conflict'
          ? '必须确认'
          : '需要确认';
  return <div className={`jts-guidance-interval ${interval.kind}`}>
    <span><strong>{interval.depthFromM.toFixed(2)}-{interval.depthToM.toFixed(2)} m</strong><em>{label}</em></span>
    <p>{interval.reason} · {interval.rowCount} 行</p>
    <small>{interval.userMeaning}</small>
  </div>;
}

function JtsRecoveryPanel({ issue, recovery, onExecute }: {
  issue: JtsClassificationRecoveryIssue;
  recovery: JtsAutoRecoveryState | null;
  onExecute: (optionId: JtsRecoveryOptionId) => void;
}) {
  const automaticOptions = issue.options.filter((option) => option.kind === 'automatic');
  const recommended = automaticOptions.find((option) => option.enabled && option.recommended)
    ?? automaticOptions.find((option) => option.enabled)
    ?? null;
  const directNavigation = automaticOptions.length === 0
    ? issue.options.find((option) => option.kind === 'navigate' && option.enabled) ?? null
    : null;
  const alternativeOptions = issue.options.filter((option) => option.optionId !== recommended?.optionId);
  const initialOptionId = recommended?.optionId ?? null;
  const [selectedOptionId, setSelectedOptionId] = useState<JtsRecoveryOptionId | null>(initialOptionId);
  useEffect(() => setSelectedOptionId(initialOptionId), [initialOptionId, issue.code]);
  const selected = issue.options.find((option) => option.optionId === selectedOptionId) ?? null;
  const pending = Boolean(recovery && ['awaiting-governance', 'awaiting-check', 'running-classification'].includes(recovery.phase));
  const evidenceDepth = issue.invalidRows[0]?.depthM;
  const actionLabel = selected?.optionId === 'standard-smoothing'
    ? '标准平滑并继续'
    : selected?.optionId === 'exclude-invalid-rows'
      ? `忽略 ${issue.invalidRows.length} 行并继续`
      : selected?.optionId === 'rerun-check'
        ? '重新检查并继续'
        : '执行处理';
  return (
    <section className="jts-recovery-panel" data-testid="jts-recovery-panel">
      <div className="jts-recovery-heading">
        <span>需要处理</span>
      </div>
      <h2>{issue.title}</h2>
      <p>{issue.summary}</p>
      <p className="jts-recovery-consequence">{issue.consequence}</p>
      {issue.evidence.length ? (
        <details data-testid="jts-recovery-evidence">
          <summary>查看证据 · {issue.invalidRows.length} 行{evidenceDepth == null ? '' : ` · 首行 ${evidenceDepth.toFixed(2)} m`}</summary>
          <div className="jts-recovery-evidence-list">{issue.evidence.map((item) => <span key={item}>{item}</span>)}</div>
        </details>
      ) : null}
      {recommended ? (
        <fieldset className="jts-recovery-options" data-testid="jts-recovery-options">
          <legend className="sr-only">处理方案</legend>
          <label
            className={selectedOptionId === recommended.optionId ? 'selected recommended' : 'recommended'}
            data-testid={`jts-recovery-option-${recommended.optionId}`}
          >
            <input
              type="radio"
              name={`jts-recovery-${issue.code}`}
              value={recommended.optionId}
              checked={selectedOptionId === recommended.optionId}
              disabled={pending}
              onChange={() => setSelectedOptionId(recommended.optionId)}
            />
            <span><strong>{recommended.label}</strong><em>推荐</em></span>
            {recommended.recommendationReason ? <small className="jts-recovery-reason">{recommended.recommendationReason}</small> : null}
            <small>{recommended.description}</small>
          </label>
          {alternativeOptions.length ? (
            <details className="jts-recovery-alternatives" data-testid="jts-recovery-alternatives">
              <summary>其他处理方式（{alternativeOptions.length}）</summary>
              <div className="jts-recovery-alternative-list">
                {alternativeOptions.map((option) => option.kind === 'navigate' ? (
                  <button
                    type="button"
                    className="jts-recovery-navigation"
                    key={option.optionId}
                    disabled={!option.enabled || pending}
                    onClick={() => onExecute(option.optionId)}
                    data-testid={`jts-recovery-option-${option.optionId}`}
                  >
                    <span><strong>{option.label}</strong><em>前往</em></span>
                    <small>{option.description}</small>
                  </button>
                ) : (
                  <label
                    className={selectedOptionId === option.optionId ? 'selected' : ''}
                    aria-disabled={!option.enabled || pending}
                    key={option.optionId}
                    data-testid={`jts-recovery-option-${option.optionId}`}
                  >
                    <input
                      type="radio"
                      name={`jts-recovery-${issue.code}`}
                      value={option.optionId}
                      checked={selectedOptionId === option.optionId}
                      disabled={!option.enabled || pending}
                      onChange={() => setSelectedOptionId(option.optionId)}
                    />
                    <span><strong>{option.label}</strong><em>可自动处理</em></span>
                    <small>{option.description}</small>
                    {!option.enabled && option.unavailableReason ? <small className="problem-text">{option.unavailableReason}</small> : null}
                  </label>
                ))}
              </div>
            </details>
          ) : null}
        </fieldset>
      ) : null}
      {selected ? <div className="jts-recovery-preview" data-testid="jts-recovery-preview"><span>执行后</span><p>{selected.impact}</p></div> : null}
      {recovery ? <p className={`jts-recovery-progress ${recovery.phase}`} data-testid="jts-recovery-progress">{recovery.message}</p> : null}
      {selected ? (
        <>
          <p className="jts-recovery-selection-note">选择方案不会修改数据，执行时才会创建修订。</p>
          <button
            type="button"
            className="toolbar-button primary dock-action jts-recovery-primary"
            disabled={!selected.enabled || pending}
            onClick={() => onExecute(selected.optionId)}
            data-testid="execute-jts-recovery"
          >{pending ? '正在处理…' : actionLabel}</button>
        </>
      ) : directNavigation ? (
        <button
          type="button"
          className="toolbar-button primary dock-action jts-recovery-primary"
          disabled={pending}
          onClick={() => onExecute(directNavigation.optionId)}
          data-testid="execute-jts-recovery"
        >{directNavigation.label}</button>
      ) : null}
      {!automaticOptions.length ? <p className="short-note">工程上下文必须由用户确认，系统不会代填。</p> : null}
      <details className="jts-recovery-technical" data-testid="jts-recovery-technical">
        <summary>技术信息</summary>
        <code>{issue.code}</code>
      </details>
    </section>
  );
}

function JtsRecoverySuccess({ recovery }: { recovery: JtsAutoRecoveryState }) {
  const result = recovery.optionId === 'standard-smoothing'
    ? '已创建标准平滑修订并重新分类。'
    : recovery.optionId === 'exclude-invalid-rows'
      ? '已创建无效行排除修订并重新分类。'
      : '已重新检查并完成分类。';
  const title = recovery.optionId === 'standard-smoothing'
    ? '已完成自动平滑'
    : recovery.optionId === 'exclude-invalid-rows'
      ? '已完成无效行排除'
      : '已完成重新检查';
  return (
    <section className="jts-recovery-success" data-testid="jts-recovery-success" role="status">
      <strong>{title}</strong>
      <p>{result}原始测量数据未修改。</p>
    </section>
  );
}

function StratificationRuleTool({
  run,
  currentCheckInput,
  selectedCandidateId,
  onSelectCandidate,
  onRun,
  onApply,
}: {
  run: StratificationRuleRunV1 | null;
  currentCheckInput: StratificationInputDependencyV2 | null;
  selectedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
  onRun: (settings: StratificationRuleSettingsV1) => void;
  onApply: () => void;
}) {
  const [settings, setSettings] = useState<StratificationRuleSettingsV1>({ ...DEFAULT_STRATIFICATION_RULE_SETTINGS_V1 });
  const selected = run?.candidates.find((candidate) => candidate.candidateId === selectedCandidateId) ?? run?.candidates[0] ?? null;
  const current = Boolean(run && currentCheckInput && sameStratificationInput(run.input, currentCheckInput));
  const hasProblem = Boolean(run?.issues.some((issue) => issue.severity === 'problem'));
  const rerunning = Boolean(current && run?.status === 'completed');
  return (
    <>
      <section className="query-card inspector-primary" data-testid="stratification-rule-tool">
        <div className="query-card-heading"><h2>{STRATIFICATION_CHANGE_POINT_SPEC_V1.label}</h2><span>v{STRATIFICATION_CHANGE_POINT_SPEC_V1.version}</span></div>
        <div className="rule-formula-line"><span>评分</span><code>0.7 × Δqc + 0.3 × ΔFr</code></div>
        <div className="rule-settings-grid">
          <label className="dock-field"><span>前后窗口（行）</span><input type="number" min="2" max="12" step="1" value={settings.windowRows} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, windowRows: Number(event.target.value) }))} data-testid="stratification-rule-window" /></label>
          <label className="dock-field"><span>变化阈值</span><input type="number" min="0.05" max="0.95" step="0.01" value={settings.scoreThreshold} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, scoreThreshold: Number(event.target.value) }))} data-testid="stratification-rule-threshold" /></label>
          <label className="dock-field"><span>最小间距 (m)</span><input type="number" min="0.05" max="20" step="0.05" value={settings.minSpacingM} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, minSpacingM: Number(event.target.value) }))} data-testid="stratification-rule-spacing" /></label>
          <label className="dock-field"><span>边界上限</span><input type="number" min="1" max="30" step="1" value={settings.maxBoundaries} onChange={(event) => setSettings((currentSettings) => ({ ...currentSettings, maxBoundaries: Number(event.target.value) }))} data-testid="stratification-rule-limit" /></label>
        </div>
        <button type="button" className={`toolbar-button dock-action ${rerunning ? '' : 'primary'}`} disabled={!currentCheckInput} onClick={() => onRun(settings)} data-testid="stratification-rule-run"><Play className="button-icon" />{rerunning ? '重新运行候选' : '运行候选'}</button>
      </section>

      {run ? (
        <section className="query-card" data-testid="stratification-rule-result">
          <div className="query-card-heading"><h2>运行结果</h2><span>{current ? ruleRunStatusLabel(run.status) : '已过期'}</span></div>
          <div className="rule-run-summary">
            <PropertyRow label="输入" value={`${run.summary?.inputRowCount ?? run.inputRowsSnapshot.length} 行`} />
            <PropertyRow label="候选" value={`${run.candidates.length} 条`} />
            <PropertyRow label="阈值命中" value={`${run.summary?.thresholdMatchCount ?? 0} 处`} />
          </div>
          {run.issues.length ? <div className="rule-issue-list">{run.issues.map((issue) => <div key={`${issue.code}-${issue.sourceRowIds.join('-')}`} className={issue.severity}><strong>{issue.severity === 'problem' ? '存在问题' : '保留提示'}</strong><span>{issue.message}</span></div>)}</div> : null}
          <RuleCandidateList run={run} selectedCandidateId={selectedCandidateId} onSelectCandidate={onSelectCandidate} />
          <button type="button" className="toolbar-button primary dock-action" disabled={!current || run.status !== 'completed' || hasProblem || !run.candidates.length} onClick={onApply} data-testid="stratification-rule-apply">用这 {run.candidates.length} 条边界建立候选</button>
        </section>
      ) : null}

      {selected ? (
        <section className="query-card" data-testid="stratification-rule-candidate-detail">
          <div className="query-card-heading"><h2>{selected.depthM.toFixed(2)} m</h2><span>{selected.score.toFixed(3)}</span></div>
          <PropertyRow label="qc 变化" value={selected.qcComponent.toFixed(3)} />
          <PropertyRow label="Fr 变化" value={selected.frComponent === null ? '本次未使用' : selected.frComponent.toFixed(3)} />
          <PropertyRow label="qc 中位数" value={`${Math.round(selected.qcMedianAboveKpa)} -> ${Math.round(selected.qcMedianBelowKpa)} kPa`} />
          <PropertyRow label="来源窗口" value={`${selected.sourceRowIds.length} 行`} />
        </section>
      ) : null}
    </>
  );
}

function ruleRunStatusLabel(status: StratificationRuleRunV1['status']) {
  return {
    queued: '排队中',
    running: '运行中',
    'cancel-requested': '正在取消',
    completed: '已完成',
    cancelled: '已取消',
    failed: '运行失败',
    invalidated: '已失效',
  }[status];
}

function focusStratificationIssue(issue: StratificationIssue, onSelectLayer: (layerId: string) => void, onSelectBoundary: (boundaryId: string) => void) {
  if (issue.boundaryId) onSelectBoundary(issue.boundaryId);
  else if (issue.layerId) onSelectLayer(issue.layerId);
}

function stratificationActionableProblems(issues: StratificationIssue[]) {
  const unique = new Map<string, StratificationIssue>();
  for (const issue of issues) {
    if (issue.severity !== 'problem') continue;
    const sameLayerDecision = Boolean(issue.layerId) && ['土类待确认', '土层候选待确认'].includes(issue.title);
    const key = sameLayerDecision ? `layer-decision:${issue.layerId}` : issue.issueId;
    if (!unique.has(key)) unique.set(key, issue);
  }
  return [...unique.values()];
}

function stratificationIssueLocationLabel(issue: StratificationIssue, scheme: StratificationSchemeV2) {
  if (issue.layerId) {
    const index = scheme.layers.findIndex((layer) => layer.layerId === issue.layerId);
    const layer = scheme.layers[index];
    if (layer) return `L${index + 1} · ${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)} m`;
  }
  if (issue.boundaryId) {
    const index = scheme.boundaries.findIndex((boundary) => boundary.boundaryId === issue.boundaryId);
    const boundary = scheme.boundaries[index];
    if (boundary) return `B${index + 1} · ${boundary.depthM.toFixed(2)} m`;
  }
  return '整个分层方案';
}

function stratificationSchemeStatusLabel(status: StratificationSchemeV2['status']) {
  return { working: '工作中', current: '当前工作方案', history: '历史', stale: '需更新' }[status];
}

function compactWorkspaceIdentifier(value: string) {
  return value.length <= 24 ? value : `${value.slice(0, 10)}...${value.slice(-10)}`;
}

function fallbackWorkspaceStorageDiagnosis(message: string) {
  if (message.includes('另一个标签页') || message.includes('已停止自动保存')) {
    return diagnoseWorkspaceStorageFailure({ reason: 'conflict', detail: message });
  }
  if (message.includes('不允许保存') || message.includes('不允许读取')) {
    return diagnoseWorkspaceStorageFailure({ reason: 'unavailable', detail: message });
  }
  if (message.includes('状态已经变化') || message.includes('迟到结果')) {
    return diagnoseWorkspaceStorageFailure({ reason: 'conflict', detail: message });
  }
  return diagnoseWorkspaceStorageFailure({ reason: 'write-failed', detail: message });
}

function stratificationSoilGroupLabel(group: string) {
  return { unclassified: '未分类', sand: '砂土', mixed: '混合土', clay: '黏性土' }[group] ?? group;
}

function stratificationLayerDisplayLabel(layer: StratificationLayerV2) {
  if (layer.majorGroupComposition) {
    return majorGroupCompositionLabel(layer.majorGroupComposition.engineeringSoilGroup, layer.majorGroupComposition.detailedSoilTypes);
  }
  return layer.soilDecision?.finalDetailedType ?? layer.soilDecision?.suggestedDetailedType ?? layer.name;
}

function stratificationBoundarySourceLabel(scheme: StratificationSchemeV2) {
  if (scheme.origin?.kind === 'rule-candidate') return '规则候选';
  if (scheme.origin?.kind === 'jts-classification') return scheme.origin.selection?.boundarySource === 'rule' ? '规则候选' : '分类候选';
  return '手动建立';
}

function stratificationSoilDecisionLabel(layer: StratificationLayerV2) {
  if (layer.majorGroupComposition) return '按大类整理，细类组成已保留';
  if (layer.soilDecision?.reviewAction === 'merged-inherited') return '合并后继承土类';
  if (layer.soilDecision?.reviewAction === 'split-inherited') return '拆分后继承原层';
  if (layer.soilDecision?.reviewAction === 'batch-accepted') return layer.soilDecision.methodClassification ? `工程师批量接受 · ${layer.soilDecision.methodClassification.classCode}` : '工程师批量接受';
  switch (layer.soilDecision?.source) {
    case 'jts-accepted': return layer.soilDecision.methodClassification ? `${layer.soilDecision.methodClassification.classCode} 建议已接受` : '分类建议已接受';
    case 'jts-suggested': return layer.soilDecision.methodClassification ? `${layer.soilDecision.methodClassification.classCode} 方法建议` : '分类建议';
    case 'engineer-overrode-jts': return layer.soilDecision.methodClassification ? `工程师覆盖 ${layer.soilDecision.methodClassification.classCode}` : '工程师覆盖分类建议';
    case 'engineer-selected': return '无系统建议，工程师选择';
    case 'manual': return '手动建立';
    default: return layer.engineeringSoilGroup === 'unclassified' ? '待确认' : '工程师选择';
  }
}

function stratificationMethodClassificationLabel(layer: StratificationLayerV2) {
  const classification = layer.soilDecision?.methodClassification;
  if (!classification) return '无方法原始分类';
  return `${classification.methodId} · ${classification.classCode} · ${classification.classLabel}`;
}

function stratificationSoilSourceSummary(layers: StratificationLayerV2[]) {
  const counts = new Map<string, number>();
  layers.forEach((layer) => {
    const label = stratificationSoilDecisionLabel(layer);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => `${label} ${count} 层`).join('；');
}

function formatDraftDepthRange(draft: ImportDraft) {
  if (!draft.rows.length) return '未定位';
  return `${Math.min(...draft.rows.map((row) => row.depthM)).toFixed(2)}-${Math.max(...draft.rows.map((row) => row.depthM)).toFixed(2)} m`;
}

function ProjectRightPanel({
  summary,
  flowCase,
  workspaceProject,
  onPointLifecycle,
}: {
  summary: ProjectPointSummary;
  flowCase: SyntheticFlowCase;
  workspaceProject?: ProjectWorkspaceV2;
  onPointLifecycle?: (command: PointLifecycleCommand) => PointLifecycleResult;
}) {
  const activePoint = workspaceProject?.points.find((point) => point.pointId === workspaceProject.activePointId) ?? null;
  const [dialog, setDialog] = useState<'create' | 'rename' | 'duplicate' | 'delete' | null>(null);
  const [pointNameDraft, setPointNameDraft] = useState('');
  const [commandProblem, setCommandProblem] = useState('');
  const [channelState, setChannelState] = useState<'present' | 'absent'>(activePoint?.waterContext.channelState === 'absent' ? 'absent' : 'present');
  const [waterDepthDraft, setWaterDepthDraft] = useState(String(activePoint?.waterContext.waterDepthM ?? 0));
  const [u2Datum, setU2Datum] = useState<PointWaterContextV3['u2HydrostaticDatum']>(activePoint?.waterContext.u2HydrostaticDatum ?? 'total');
  const [contextsExpanded, setContextsExpanded] = useState(false);

  useEffect(() => {
    setChannelState(activePoint?.waterContext.channelState === 'absent' ? 'absent' : 'present');
    setWaterDepthDraft(String(activePoint?.waterContext.waterDepthM ?? 0));
    setU2Datum(activePoint?.waterContext.u2HydrostaticDatum ?? 'total');
    setCommandProblem('');
    setContextsExpanded(false);
  }, [activePoint?.pointId, activePoint?.waterContext.revisionId]);

  function openDialog(kind: NonNullable<typeof dialog>) {
    setDialog(kind);
    setCommandProblem('');
    setPointNameDraft(kind === 'rename'
      ? activePoint?.pointName ?? ''
      : kind === 'duplicate'
        ? `${activePoint?.pointName ?? '点位'}-副本`
        : '');
  }

  function runCommand(command: PointLifecycleCommand) {
    const result = onPointLifecycle?.(command);
    if (!result) return;
    if (!result.ok) {
      setCommandProblem(result.problem);
      return;
    }
    setDialog(null);
    setCommandProblem('');
  }

  function confirmDialog() {
    if (!onPointLifecycle) return;
    if (dialog === 'create') runCommand({ kind: 'create', pointName: pointNameDraft });
    if (dialog === 'rename' && activePoint) runCommand({ kind: 'rename', pointId: activePoint.pointId, pointName: pointNameDraft });
    if (dialog === 'duplicate' && activePoint) runCommand({ kind: 'duplicate', pointId: activePoint.pointId, pointName: pointNameDraft });
    if (dialog === 'delete' && activePoint) runCommand({ kind: 'delete', pointId: activePoint.pointId });
  }

  if (workspaceProject && onPointLifecycle) {
    const activeProfile = workspaceProject.probeProfiles.find((profile) => profile.profileId === activePoint?.probeContext.activeProfileId) ?? null;
    const contextsConfirmed = Boolean(activePoint?.probeContext.confirmedAt && activePoint?.waterContext.confirmedAt);
    return (
      <RightPanelShell title="点位工具" eyebrow="当前项目" showTabs={false}>
        <section className="query-card inspector-primary" data-testid="project-dock-point-tools">
          <div className="query-card-heading">
            <h2>点位生命周期</h2>
            <button type="button" data-testid="create-point" aria-label="新建点位" onClick={() => openDialog('create')}><Plus className="button-icon" /></button>
          </div>
          <div className="field-tool-context">
            <span>{workspaceProject.projectName}</span>
            <strong>{activePoint?.pointName ?? '尚未选择点位'}</strong>
          </div>
          {activePoint ? (
            <div className="dock-editor-actions point-action-row">
              <button type="button" className="toolbar-button" data-testid="rename-point" onClick={() => openDialog('rename')}><Pencil className="button-icon" /> 重命名</button>
              <button type="button" className="toolbar-button" data-testid="duplicate-point" onClick={() => openDialog('duplicate')}><Copy className="button-icon" /> 复制</button>
              <button type="button" className="toolbar-button danger-text" data-testid="delete-point" onClick={() => openDialog('delete')}><Trash2 className="button-icon" /> 删除</button>
            </div>
          ) : (
            <p className="short-note">先新建一个点位；点位名称可在没有测量文件时独立保存。</p>
          )}
        </section>

        {workspaceProject.deletedPoints.length ? (
          <section className="query-card" data-testid="deleted-point-records">
            <div className="query-card-heading"><h2>回收记录</h2><span>{workspaceProject.deletedPoints.length}</span></div>
            {workspaceProject.deletedPoints.map((record) => (
              <div className="deleted-point-row" key={record.deletionId}>
                <div><strong>{record.pointName}</strong><span>{new Date(record.deletedAt).toLocaleString('zh-CN')}</span></div>
                <button type="button" className="toolbar-button" data-testid={`restore-point-${record.pointId}`} onClick={() => runCommand({ kind: 'restore', deletionId: record.deletionId })}>恢复</button>
              </div>
            ))}
          </section>
        ) : null}

        {activePoint && contextsConfirmed && !contextsExpanded ? (
          <section className="query-card" data-testid="point-context-summary">
            <div className="query-card-heading"><h2>点位基准</h2><span className="inline-state ok">已确认</span></div>
            <PropertyRow label="探头" value={activeProfile?.name ?? '已确认'} />
            <PropertyRow label="孔压路线" value={activePoint.waterContext.channelState === 'absent' ? '无 u2（CPT 近似）' : `完整 CPTU / 水深 ${activePoint.waterContext.waterDepthM?.toFixed(1) ?? '—'} m`} />
            <button type="button" className="toolbar-button dock-action" data-testid="confirm-jts-probe" onClick={() => setContextsExpanded(true)}>修改点位基准</button>
          </section>
        ) : activePoint ? (
          <>
            <section className="query-card" data-testid="probe-context-card">
              <div className="query-card-heading"><h2>探头配置</h2><span className={`inline-state ${activePoint.probeContext.confirmedAt ? 'ok' : 'warn'}`}>{activePoint.probeContext.confirmedAt ? '已确认' : '待确认'}</span></div>
              <PropertyRow label="当前配置" value={activeProfile?.name ?? '尚未确认'} />
              <PropertyRow label="锥底面积" value={activeProfile ? `${activeProfile.coneBaseAreaCm2} cm²` : '—'} />
              <PropertyRow label="有效面积比" value={activeProfile ? activeProfile.effectiveAreaRatio.toFixed(3) : '—'} />
              <button
                type="button"
                className="toolbar-button dock-action"
                data-testid="confirm-jts-probe"
                onClick={() => runCommand({ kind: 'confirm-probe', pointId: activePoint.pointId, profileId: workspaceProject.probeProfiles[0].profileId })}
              >
                确认 JTS 标准探头
              </button>
            </section>

            <section className="query-card" data-testid="water-context-card">
              <div className="query-card-heading"><h2>水深与孔压基准</h2><span className={`inline-state ${activePoint.waterContext.confirmedAt ? 'ok' : 'warn'}`}>{activePoint.waterContext.confirmedAt ? '已确认' : '待确认'}</span></div>
              <label className="dock-form-field">
                <span>u2 通道</span>
                <select data-testid="water-channel-state" value={channelState} onChange={(event) => setChannelState(event.target.value as 'present' | 'absent')}>
                  <option value="present">完整 CPTU u2</option>
                  <option value="absent">无 u2（CPT 近似）</option>
                </select>
              </label>
              {channelState === 'present' ? (
                <>
                  <label className="dock-form-field"><span>水深（m）</span><input data-testid="water-depth-input" type="number" min="0" step="0.1" value={waterDepthDraft} onChange={(event) => setWaterDepthDraft(event.target.value)} /></label>
                  <label className="dock-form-field">
                    <span>u2 压力基准</span>
                    <select data-testid="u2-datum-select" value={u2Datum} onChange={(event) => setU2Datum(event.target.value as PointWaterContextV3['u2HydrostaticDatum'])}>
                      <option value="total">总孔压（含静水压力）</option>
                      <option value="u2_mudline_relative">泥面相对孔压</option>
                    </select>
                  </label>
                  <PropertyRow label="测试零点" value="泥面（当前唯一允许）" />
                </>
              ) : <p className="short-note">无 u2 时不要求水深，后续结果明确标记为 CPT 近似路线。</p>}
              <button
                type="button"
                className="toolbar-button primary dock-action"
                data-testid="confirm-water-context"
                onClick={() => runCommand({
                  kind: 'confirm-water',
                  pointId: activePoint.pointId,
                  water: {
                    channelState,
                    waterDepthM: channelState === 'present' ? Number(waterDepthDraft) : null,
                    u2HydrostaticDatum: u2Datum,
                    testZeroDatum: 'mudline',
                    boreholeBottomDepthM: null,
                    waterUnitWeightKnM3: 10,
                  },
                })}
              >
                确认点位基准
              </button>
            </section>
          </>
        ) : null}

        {dialog ? (
          <div className="dock-dialog-backdrop" data-testid="point-lifecycle-dialog">
            <div className="dock-dialog" role="dialog" aria-modal="true" aria-label="点位操作确认">
              <div className="query-card-heading">
                <h2>{dialog === 'create' ? '新建点位' : dialog === 'rename' ? '重命名点位' : dialog === 'duplicate' ? '复制点位' : '删除点位'}</h2>
                <button type="button" aria-label="关闭" onClick={() => setDialog(null)}><X className="button-icon" /></button>
              </div>
              {dialog === 'delete' ? (
                <p>将“{activePoint?.pointName}”移入项目回收记录。测量草稿与上下文会随快照保留，可恢复。</p>
              ) : (
                <label className="dock-form-field"><span>点位名称</span><input autoFocus data-testid="point-name-input" value={pointNameDraft} onChange={(event) => setPointNameDraft(event.target.value)} /></label>
              )}
              {dialog === 'duplicate' ? <p className="dock-warning">仅复制探头、水深和孔压基准；源文件、检查、分层、参数及成果不会复制。</p> : null}
              {commandProblem ? <p className="field-error" data-testid="point-command-problem">{commandProblem}</p> : null}
              <div className="dock-editor-actions">
                <button type="button" className={`toolbar-button ${dialog === 'delete' ? 'danger' : 'primary'}`} data-testid="confirm-point-command" onClick={confirmDialog}>{dialog === 'delete' ? '确认删除' : '确认'}</button>
                <button type="button" className="toolbar-button" data-testid="cancel-point-command" onClick={() => { setDialog(null); setCommandProblem(''); }}>取消</button>
              </div>
            </div>
          </div>
        ) : null}
      </RightPanelShell>
    );
  }

  return (
    <RightPanelShell title="项目/点位数据">
      <section className="query-card inspector-primary" data-testid="project-dock-point-tools">
        <div className="query-card-heading">
          <h2>点位工具</h2>
          <button type="button" aria-label="选择点位">+</button>
        </div>
        <div className="query-filter-chip">
          <span>随机工程</span>
          <strong>{summary.projectName}</strong>
        </div>
        <div className="query-filter-chip">
          <span>点位</span>
          <strong>{summary.pointName}</strong>
        </div>
        <div className="query-filter-chip">
          <span>seed</span>
          <strong>{flowCase.seed}</strong>
        </div>
      </section>

      <section className="query-card">
        <div className="query-card-heading">
          <h2>覆盖筛选</h2>
        </div>
        <PropertyRow label="源档案" value={`${summary.sourceRecordCount} 行`} />
        <PropertyRow label="源深度" value={summary.sourceDepthRange} />
        <PropertyRow label="预览行" value={`${summary.previewRecordCount} 行`} />
        <PropertyRow label="预览深度" value={summary.previewDepthRange} />
        <PropertyRow label="字段覆盖" value="必需字段完整" />
      </section>

    </RightPanelShell>
  );
}

function ImportRightPanel({
  draft,
  pipeline,
  mappings,
  needsRecheck,
  selectedMappingField,
  onSelectMappingField,
  onDownloadTemplate,
  onCopyTemplateHeader,
  onRestartImport,
  onApplyMapping,
  onConfirmMapping,
  onClearMapping,
  onResetMappings,
  onApplyUnit,
  selectedPointKey,
  existingPoints,
  onSelectPointKey,
  onApplyPointTarget,
  pointPlanStale,
  pendingPointIdentity,
  aiSourceAvailable,
  aiSourceProblem,
  onOpenAssistant,
}: {
  draft: ImportDraft;
  pipeline?: CsvImportPipelineV2 | null;
  mappings: ReturnType<typeof getImportFieldMappings>;
  needsRecheck: boolean;
  selectedMappingField: string;
  onSelectMappingField: (field: string) => void;
  onDownloadTemplate: (kind: TemplateKind, format?: 'csv' | 'xlsx') => void;
  onCopyTemplateHeader: () => void;
  onRestartImport: () => void;
  onApplyMapping: (sourceColumnId: string, targetField: TargetFieldKey) => Promise<boolean>;
  onConfirmMapping: (targetField: TargetFieldKey) => Promise<boolean>;
  onClearMapping: (targetField: TargetFieldKey) => Promise<boolean>;
  onResetMappings: () => Promise<boolean>;
  onApplyUnit: (targetField: TargetFieldKey, unit: string) => Promise<boolean>;
  selectedPointKey: string | null;
  existingPoints: NonNullable<PipelineContext['existingPoints']>;
  onSelectPointKey: (pointKey: string | null) => void;
  onApplyPointTarget: (
    detectedPointKey: string,
    action: Exclude<PointTargetDecisionV2['action'], 'pending'>,
    options?: { targetPointId?: string; proposedPointName?: string },
  ) => Promise<boolean>;
  pointPlanStale: boolean;
  pendingPointIdentity: { fileName: string; rowCount: number } | null;
  aiSourceAvailable: boolean;
  aiSourceProblem: string;
  onOpenAssistant: () => void;
}) {
  const mappingRowsV2 = pipeline ? getImportMappingRowsV2(pipeline) : [];
  const selectedColumn = pipeline ? getSelectedImportSourceColumn(pipeline, selectedMappingField) : null;
  const selectedDecision = selectedColumn
    ? pipeline?.mappings.find((mapping) => mapping.sourceColumnId === selectedColumn.columnId) ?? null
    : null;
  const suggestedTarget = selectedColumn?.mappingCandidates[0]?.targetField ?? null;
  const initialTarget = selectedDecision?.targetField ?? suggestedTarget;
  const initialUnitDecision = selectedColumn && initialTarget
    ? pipeline?.unitDecisions.find((unit) =>
      unit.sourceColumnId === selectedColumn.columnId && unit.targetField === initialTarget,
    ) ?? null
    : null;
  const [mappingEditing, setMappingEditing] = useState(false);
  const [forceAdvanced, setForceAdvanced] = useState(false);
  const [targetDraft, setTargetDraft] = useState<TargetFieldKey | ''>(initialTarget ?? '');
  const [unitDraft, setUnitDraft] = useState(initialUnitDecision?.selectedUnit ?? initialUnitDecision?.detectedUnit ?? '');
  const [saving, setSaving] = useState(false);
  const selectedUnitDecision = selectedColumn && targetDraft
    ? pipeline?.unitDecisions.find((unit) =>
      unit.sourceColumnId === selectedColumn.columnId && unit.targetField === targetDraft,
    ) ?? null
    : null;
  useEffect(() => {
    setMappingEditing(false);
    setTargetDraft(initialTarget ?? '');
    setUnitDraft(initialUnitDecision?.selectedUnit ?? initialUnitDecision?.detectedUnit ?? '');
  }, [initialTarget, initialUnitDecision?.detectedUnit, initialUnitDecision?.selectedUnit, selectedColumn?.columnId]);
  const selectedMapping = mappings.find((mapping) => mapping.sourceField === selectedMappingField) ?? mappings[0];
  const canRunCheck = pipeline ? pipeline.readiness.canRunCheck : isImportDraftCheckable(draft);
  const importStateLabel = pipeline?.pointPlan.state === 'cancelled'
    ? '已冻结'
    : pointPlanStale
      ? '计划已失效'
      : needsRecheck && canRunCheck ? '需重新检查' : canRunCheck ? '可检查' : '需处理';
  const supportedUnits = targetDraft ? getSupportedSourceUnits(targetDraft) : [];
  const sampleValue = selectedColumn?.sampleValues[0] ?? '';
  const conversionPreview = targetDraft && unitDraft
    ? previewSourceUnitConversion(targetDraft, sampleValue, unitDraft)
    : null;
  const standardUnit = targetDraft
    ? IMPORT_TARGET_DEFINITIONS.find((definition) => definition.targetField === targetDraft)?.standardUnit ?? 'text'
    : 'text';
  const unitConfirmedUnchanged = selectedUnitDecision?.state === 'confirmed'
    && selectedUnitDecision.selectedUnit === unitDraft;
  const pipelineFrozen = pointPlanStale || pipeline?.pointPlan.state === 'cancelled';
  const restartActions = (
    <section className="query-card import-restart-actions" data-testid="import-restart-actions">
      <div className="query-card-heading"><h2>重新处理</h2><span className="inline-state">保留历史</span></div>
      <p className="short-note">选错文件时可直接换文件；清空本页不会删除已保存的上一版来源。</p>
      <div className="dock-editor-actions">
        <label className="toolbar-button import-file-action" htmlFor="import-file-input" data-testid="import-replace-file">换一个文件</label>
        <button type="button" className="toolbar-button" data-testid="import-restart-page" onClick={onRestartImport}>清空本页</button>
      </div>
    </section>
  );

  if (pendingPointIdentity) {
    return (
      <RightPanelShell title="导入确认" eyebrow="当前文件" showTabs={false}>
        <section className="query-card inspector-primary" data-testid="point-identity-dock">
          <div className="query-card-heading"><h2>等待点位名称</h2><span className="inline-state warn">需要你的选择</span></div>
          <PropertyRow label="文件" value={pendingPointIdentity.fileName} />
          <PropertyRow label="有效数据" value={`${pendingPointIdentity.rowCount} 行`} />
          <p className="short-note">此文件尚未写入项目。</p>
        </section>
        {restartActions}
      </RightPanelShell>
    );
  }

  async function applyMappingEdit() {
    if (!pipeline || !selectedColumn || !targetDraft || pipelineFrozen) return;
    setSaving(true);
    const accepted = selectedDecision?.targetField === targetDraft
      ? await onConfirmMapping(targetDraft)
      : await onApplyMapping(selectedColumn.columnId, targetDraft);
    setSaving(false);
    if (accepted) setMappingEditing(false);
  }

  async function applyUnitEdit() {
    if (!targetDraft || !unitDraft || pipelineFrozen) return;
    setSaving(true);
    await onApplyUnit(targetDraft, unitDraft);
    setSaving(false);
  }

  const selectedPointPlanRow = pipeline && selectedPointKey
    ? getImportPointPlanRows(pipeline).find((row) => row.pointKey === selectedPointKey) ?? null
    : null;
  const selectedPointProblems = pipeline && selectedPointPlanRow
    ? pipeline.problems.filter((problemValue) =>
      problemValue.severity === 'issue'
      && problemValue.detectedPointKey === selectedPointPlanRow.pointKey
      && !['DI-E10', 'DI-E11'].includes(problemValue.eventId),
    )
    : [];
  if (pipeline && selectedPointPlanRow) {
    return (
      <ImportPointDecisionRightPanel
        pipeline={pipeline}
        row={selectedPointPlanRow}
        existingPoints={existingPoints}
        onClose={() => onSelectPointKey(null)}
        onApplyPointTarget={onApplyPointTarget}
        disabled={pointPlanStale || pipeline.pointPlan.state === 'cancelled'}
        problems={selectedPointProblems}
        onLocateProblem={(problemValue) => {
          const column = getImportProblemSourceColumn(pipeline, problemValue);
          if (!column) return;
          onSelectPointKey(null);
          onSelectMappingField(column.header);
        }}
      />
    );
  }

  const advancedNeeded = forceAdvanced || Boolean(pipeline && pipeline.readiness.reasons.some((reason) => reason.recovery === 'mapping' || reason.recovery === 'unit'));
  const sourceIssue = pipeline?.problems.find((problemValue) => problemValue.severity === 'issue' && problemValue.recoveryTarget === 'source-file') ?? null;
  if (pipeline && !advancedNeeded && sourceIssue) {
    return (
      <RightPanelShell title="来源修复" eyebrow="当前文件" showTabs={false}>
        <section className="query-card inspector-primary" data-testid="import-source-problem-dock">
          <div className="query-card-heading"><h2>{sourceIssue.title}</h2><span className="inline-state warn">存在问题</span></div>
          <PropertyRow label="文件" value={draft.fileName} />
          <PropertyRow label="字段" value={sourceIssue.fieldName ?? '源文件'} />
          <PropertyRow label="源行" value={sourceIssue.rowIndex ? `第 ${sourceIssue.rowIndex} 行` : '—'} />
          <p className="short-note">{sourceIssue.message}</p>
          <label className="toolbar-button primary dock-action import-file-action" htmlFor="import-file-input" data-testid="retry-import-source">上传修正文件</label>
        </section>
        {aiSourceAvailable || aiSourceProblem ? <section className="query-card" data-testid="import-ai-entry"><div className="query-card-heading"><h2>AI 整理数据</h2><span className="inline-state">可选</span></div><p className="short-note">{aiSourceProblem || '让 AI 识别表头、字段和单位，完成后仍由你确认导入。'}</p><button type="button" className="toolbar-button dock-action" disabled={!aiSourceAvailable} onClick={onOpenAssistant}><Bot className="button-icon" />AI 整理数据</button></section> : null}
        <section className="query-card"><div className="query-card-heading"><h2>当前权威</h2></div><p className="short-note">本次问题文件不会覆盖已保存的活动草稿；取消或返回后仍可继续查看原来源。</p></section>
        {restartActions}
      </RightPanelShell>
    );
  }
  if (pipeline && !advancedNeeded) {
    const u2Available = pipeline.mappings.some((mapping) => mapping.targetField === 'u2' && mapping.state === 'confirmed');
    const measuredTargets = new Set(['depthM', 'qc', 'fs', 'u2']);
    const attachmentColumnCount = pipeline.sourceColumns.filter((column) => !pipeline.mappings.some((mapping) => mapping.sourceColumnId === column.columnId && measuredTargets.has(mapping.targetField))).length;
    return (
      <RightPanelShell title="导入确认" eyebrow="当前文件" showTabs={false}>
        <section className="query-card inspector-primary" data-testid="import-readiness-dock">
          <div className="field-tool-context"><span>{draft.fileName}</span><strong>{importStateLabel}</strong></div>
          <PropertyRow label="当前点位" value={draft.pointName} />
          <PropertyRow label="测量路线" value={u2Available ? 'CPTU（含 u2）' : 'CPT 近似（无 u2）'} />
          <PropertyRow label="有效数据" value={`${pipeline.rows.length} 行`} />
          <PropertyRow label="来源附件列" value={`${attachmentColumnCount} 列`} />
          <PropertyRow label="原始附件" value={pipeline.sourceAttachment ? `已保留 ${formatBytes(pipeline.sourceAttachment.sizeBytes)}` : '未附加'} />
          <PropertyRow label="SHA-256" value={pipeline.sourceAttachment ? `${pipeline.sourceAttachment.sha256.slice(0, 12)}…` : '—'} />
        </section>
        <section className="query-card" data-testid="minimal-import-dock">
          <div className="query-card-heading"><h2>最小输入已识别</h2><span className="inline-state ok">无问题</span></div>
          <p className="short-note">Depth、qc、fs 已确认；{u2Available ? 'u2 将进入完整 CPTU 路线。' : '未使用孔压证据，水深无需确认。'}</p>
          <button type="button" className="toolbar-button dock-action" data-testid="open-advanced-import" onClick={() => setForceAdvanced(true)}>高级字段 / 单位</button>
        </section>
        {aiSourceAvailable ? <section className="query-card" data-testid="import-ai-entry"><div className="query-card-heading"><h2>AI 整理数据</h2><span className="inline-state">可选</span></div><p className="short-note">当前文件已能导入；如需自动核对工作表、表头和单位，可让 AI 再整理。</p><button type="button" className="toolbar-button dock-action" onClick={onOpenAssistant}><Bot className="button-icon" />AI 整理数据</button></section> : null}
        <section className="query-card">
          <div className="query-card-heading"><h2>最小模板</h2></div>
          <div className="dock-editor-actions">
            <button type="button" className="toolbar-button" onClick={() => onDownloadTemplate('blank', 'xlsx')}>Excel</button>
            <button type="button" className="toolbar-button" onClick={() => onDownloadTemplate('blank', 'csv')}>CSV</button>
            <button type="button" className="toolbar-button" onClick={onCopyTemplateHeader}>复制表头</button>
          </div>
        </section>
        {restartActions}
      </RightPanelShell>
    );
  }

  return (
    <RightPanelShell title="当前字段" eyebrow="当前文件" showTabs={false}>
      <section className="query-card inspector-primary" data-testid="import-readiness-dock">
        <div className="field-tool-context">
          <span>{draft.fileName}</span>
          <strong>{importStateLabel}</strong>
        </div>
      </section>
      {aiSourceAvailable || aiSourceProblem ? <section className="query-card" data-testid="import-ai-entry"><div className="query-card-heading"><h2>AI 整理数据</h2><span className="inline-state">可选</span></div><p className="short-note">{aiSourceProblem || 'AI 可识别字段和单位，并生成一份新的待确认导入草稿。'}</p><button type="button" className="toolbar-button dock-action" disabled={!aiSourceAvailable} onClick={onOpenAssistant}><Bot className="button-icon" />AI 整理数据</button></section> : null}
      {restartActions}
      <section className="query-card" data-testid="import-mapping-editor-dock">
        <div className="query-card-heading">
          <h2>字段映射</h2>
          {pipeline ? (
            <button type="button" disabled={pipelineFrozen} onClick={() => void onResetMappings()} aria-label="重置字段映射" title="重置字段映射"><RotateCcw className="button-icon" /></button>
          ) : null}
        </div>
        <div className="dock-chip-list" data-testid="import-field-picker">
          {(pipeline
            ? mappingRowsV2.map((row) => ({ sourceField: row.column.header, active: row.column.columnId === selectedColumn?.columnId }))
            : mappings.filter((mapping) => mapping.sourceField).map((mapping) => ({ sourceField: mapping.sourceField, active: selectedMapping?.sourceField === mapping.sourceField }))
          ).map((item, index) => (
            <button
              type="button"
              key={`${item.sourceField}:${index}`}
              className={item.active ? 'active' : ''}
              disabled={pipelineFrozen}
              onClick={() => onSelectMappingField(item.sourceField)}
            >
              {item.sourceField}
            </button>
          ))}
        </div>
        {pipeline && selectedColumn ? (
          <div className="field-editor" data-testid="import-selected-field-dock">
            <div className="field-editor-source">
              <span>源字段</span>
              <strong>{selectedColumn.header}</strong>
              <small>{selectedColumn.sampleValues.slice(0, 3).join(' / ') || '空列'}</small>
              {selectedColumn.extractionOrigin ? <small>抽取来源：{excelExtractionOriginLabel(selectedColumn.extractionOrigin)}</small> : null}
            </div>
            <label className="dock-form-field">
              <span>目标字段</span>
              <select
                value={targetDraft}
                onChange={(event) => {
                  setTargetDraft(event.target.value as TargetFieldKey | '');
                  setUnitDraft('');
                  setMappingEditing(true);
                }}
                data-testid="import-target-field-select"
                disabled={pipelineFrozen || (!mappingEditing && selectedDecision?.state === 'confirmed')}
              >
                <option value="">选择目标字段</option>
                {IMPORT_TARGET_DEFINITIONS.map((definition) => (
                  <option key={definition.targetField} value={definition.targetField}>
                    {importTargetFieldLabelV2(definition.targetField)} · {definition.standardHeader}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-editor-status">
              <span className={`inline-state ${selectedDecision?.state === 'confirmed' ? 'ok' : selectedDecision ? 'warn' : 'muted'}`}>
                {selectedDecision?.state === 'confirmed' ? '映射已确认' : selectedDecision?.state === 'candidate' ? '候选待确认' : selectedDecision?.state === 'conflict' ? '映射冲突' : '未映射'}
              </span>
              <span>{selectedColumn.header}</span>
            </div>
            <div className="dock-editor-actions">
              {mappingEditing || selectedDecision?.state !== 'confirmed' ? (
                <>
                  <button type="button" className="toolbar-button primary" onClick={() => void applyMappingEdit()} disabled={pipelineFrozen || !targetDraft || saving} data-testid="apply-import-mapping">
                    {selectedDecision?.state === 'candidate' && targetDraft === selectedDecision.targetField ? '确认映射' : '应用映射'}
                  </button>
                  <button
                    type="button"
                    className="toolbar-button"
                    data-testid="cancel-import-mapping-edit"
                    disabled={pipelineFrozen}
                    onClick={() => {
                      setTargetDraft(initialTarget ?? '');
                      setMappingEditing(false);
                    }}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button type="button" className="toolbar-button" disabled={pipelineFrozen} onClick={() => setMappingEditing(true)} data-testid="edit-import-mapping">修改映射</button>
              )}
              {selectedDecision?.sourceColumnId ? (
                <button type="button" className="toolbar-button danger-text" disabled={pipelineFrozen} onClick={() => void onClearMapping(selectedDecision.targetField)} data-testid="clear-import-mapping">清除映射</button>
              ) : null}
            </div>
          </div>
        ) : selectedMapping ? (
          <div className="field-editor" data-testid="import-selected-field-dock">
            <PropertyRow label="源字段" value={selectedMapping.sourceField} />
            <PropertyRow label="目标字段" value={selectedMapping.targetField} />
            <PropertyRow label="状态" value={selectedMapping.status === 'matched' ? '映射已确认' : '仅提示'} />
          </div>
        ) : (
          <p className="short-note">选择字段后查看映射详情。</p>
        )}
      </section>

      {pipeline && selectedColumn && targetDraft && targetDraft !== 'pointName' && selectedDecision?.targetField === targetDraft ? (
        <section className="query-card" data-testid="import-unit-editor-dock">
          <div className="query-card-heading"><h2>单位与换算</h2></div>
          <label className="dock-form-field">
            <span>源单位</span>
            <select value={unitDraft} onChange={(event) => setUnitDraft(event.target.value)} data-testid="import-source-unit-select" disabled={pipelineFrozen || selectedUnitDecision?.state === 'conflict'}>
              <option value="">选择源单位</option>
              {supportedUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <PropertyRow label="标准单位" value={standardUnit} />
          <PropertyRow label="单位状态" value={selectedUnitDecision?.state === 'confirmed' ? '已确认' : selectedUnitDecision?.state === 'conflict' ? '存在冲突，需修正源文件' : '待确认'} />
          <PropertyRow label="换算样例" value={conversionPreview === null ? '选择单位后显示' : `${sampleValue} ${unitDraft} → ${formatImportNormalizedValue(conversionPreview, targetDraft)} ${standardUnit}`} />
          {unitConfirmedUnchanged ? (
            <span className="inline-state ok dock-confirmed-state" data-testid="import-unit-confirmed">源单位已确认</span>
          ) : (
            <button type="button" className="toolbar-button primary dock-action" data-testid="apply-import-unit" onClick={() => void applyUnitEdit()} disabled={pipelineFrozen || !unitDraft || saving || selectedUnitDecision?.state === 'conflict'}>
              确认源单位
            </button>
          )}
          {selectedUnitDecision?.state === 'conflict' ? <p className="short-note">混合或不支持单位不能在页面内直接覆盖，请修正源文件后重新上传。</p> : null}
        </section>
      ) : null}

    </RightPanelShell>
  );
}

function ImportPointDecisionRightPanel({
  pipeline,
  row,
  existingPoints,
  onClose,
  onApplyPointTarget,
  disabled,
  problems,
  onLocateProblem,
}: {
  pipeline: CsvImportPipelineV2;
  row: ReturnType<typeof getImportPointPlanRows>[number];
  existingPoints: NonNullable<PipelineContext['existingPoints']>;
  onClose: () => void;
  onApplyPointTarget: (
    detectedPointKey: string,
    action: Exclude<PointTargetDecisionV2['action'], 'pending'>,
    options?: { targetPointId?: string; proposedPointName?: string },
  ) => Promise<boolean>;
  disabled: boolean;
  problems: ImportDraftProblem[];
  onLocateProblem: (problem: ImportDraftProblem) => void;
}) {
  const committedAction = row.decision?.action === 'pending' ? '' : row.decision?.action ?? '';
  const [actionDraft, setActionDraft] = useState<Exclude<PointTargetDecisionV2['action'], 'pending'> | ''>(committedAction);
  const [nameDraft, setNameDraft] = useState(row.decision?.proposedPointName ?? row.pointName);
  const [replaceConfirmation, setReplaceConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const conflict = pipeline.pointPlan.conflicts.find((candidate) => candidate.detectedPointKey === row.pointKey);
  const targetPoint = existingPoints.find((point) => point.pointId === (row.decision?.targetPointId ?? conflict?.existingPointId));
  const generated = row.execution?.status === 'generated';
  const normalizedDraftName = nameDraft.trim();
  const normalizedCommittedName = (row.decision?.proposedPointName ?? row.pointName).trim();
  const nameChanged = ['create-point', 'rename-and-create'].includes(actionDraft)
    && normalizedDraftName !== normalizedCommittedName;
  const decisionUnchanged = row.decision?.state === 'confirmed'
    && committedAction === actionDraft
    && !nameChanged;

  useEffect(() => {
    setActionDraft(committedAction);
    setNameDraft(row.decision?.proposedPointName ?? row.pointName);
    setReplaceConfirmation(false);
  }, [committedAction, row.decision?.proposedPointName, row.pointKey, row.pointName]);

  async function commitDecision() {
    if (!actionDraft || generated || disabled) return;
    if (actionDraft === 'replace-active-draft' && !replaceConfirmation) {
      setReplaceConfirmation(true);
      return;
    }
    setSaving(true);
    await onApplyPointTarget(row.pointKey, actionDraft, {
      targetPointId: ['append-draft', 'replace-active-draft'].includes(actionDraft)
        ? targetPoint?.pointId ?? conflict?.existingPointId
        : undefined,
      proposedPointName: ['create-point', 'rename-and-create'].includes(actionDraft) ? nameDraft : undefined,
    });
    setSaving(false);
    setReplaceConfirmation(false);
  }

  return (
    <RightPanelShell title="当前点位" eyebrow="点位计划" showTabs={false}>
      <section className="query-card inspector-primary" data-testid="point-decision-dock">
        <div className="query-card-heading">
          <h2>{row.pointName}</h2>
          <button type="button" className="icon-command" aria-label="返回字段工具" title="返回字段工具" onClick={onClose}>
            <TableProperties className="button-icon" />
          </button>
        </div>
        <PropertyRow label="源行" value={`${row.rowCount} 行`} />
        <PropertyRow label="深度范围" value={row.depthRange} />
        <PropertyRow label="逐点问题" value={row.problemCount ? `${row.problemCount} 个` : '无'} />
        <PropertyRow label="执行状态" value={pointExecutionLabel(row.execution?.status)} />
      </section>

      <section className="query-card" data-testid="point-target-editor">
        <div className="query-card-heading"><h2>目标动作</h2></div>
        {targetPoint ? (
          <div className="point-conflict-context" data-testid="point-conflict-context">
            <span>{conflict?.reason === 'alias' ? '命中已有点位别名' : '命中已有点位名称'}</span>
            <strong>{targetPoint.pointName}</strong>
          </div>
        ) : null}
        <label className="dock-form-field">
          <span>处理方式</span>
          <select
            value={actionDraft}
            disabled={generated || disabled}
            data-testid="point-target-action"
            onChange={(event) => {
              setActionDraft(event.target.value as Exclude<PointTargetDecisionV2['action'], 'pending'> | '');
              setReplaceConfirmation(false);
            }}
          >
            <option value="">选择处理方式</option>
            {!targetPoint ? <option value="create-point">新建点位</option> : null}
            {targetPoint ? <option value="append-draft">保留为该点位的新草稿</option> : null}
            {targetPoint ? <option value="replace-active-draft">替换该点位的活动草稿</option> : null}
            <option value="rename-and-create">重命名后新建点位</option>
            <option value="skip">跳过本点位</option>
          </select>
        </label>
        {['create-point', 'rename-and-create'].includes(actionDraft) ? (
          <label className="dock-form-field">
            <span>目标点位名称</span>
            <input
              type="text"
              value={nameDraft}
              disabled={generated || disabled}
              data-testid="point-target-name"
              onChange={(event) => setNameDraft(event.target.value)}
            />
          </label>
        ) : null}
        {row.decision?.reasonCode ? (
          <p className="point-target-error" data-testid="point-target-error">{pointDecisionReason(row.decision.reasonCode)}</p>
        ) : null}
        {disabled ? (
          <p className="short-note" data-testid="point-target-frozen">项目状态已经变化，刷新并重新确认计划后才能继续编辑。</p>
        ) : replaceConfirmation ? (
          <div className="dock-confirmation" data-testid="replace-draft-confirmation">
            <p>将切换 {targetPoint?.pointName} 的活动草稿；旧检查记录保留为历史，当前草稿需要重新检查。</p>
            <div className="dock-editor-actions">
              <button type="button" className="toolbar-button danger-text" data-testid="confirm-replace-active-draft" onClick={() => void commitDecision()}>确认替换</button>
              <button type="button" className="toolbar-button" data-testid="cancel-replace-active-draft" onClick={() => setReplaceConfirmation(false)}>取消</button>
            </div>
          </div>
        ) : generated ? (
          <span className="inline-state ok dock-confirmed-state" data-testid="point-target-generated">点位草稿已生成</span>
        ) : decisionUnchanged ? (
          <span className="inline-state ok dock-confirmed-state" data-testid="point-target-confirmed">目标动作已确认</span>
        ) : (
          <button
            type="button"
            className="toolbar-button primary dock-action"
            data-testid="confirm-point-target"
            disabled={!actionDraft || saving || (['create-point', 'rename-and-create'].includes(actionDraft) && !nameDraft.trim())}
            onClick={() => void commitDecision()}
          >
            {row.decision?.state === 'confirmed' ? '更新目标动作' : '确认目标动作'}
          </button>
        )}
      </section>

      {problems.length ? (
        <section className="query-card point-problem-dock" data-testid="point-problem-dock">
          <div className="query-card-heading"><h2>当前点位问题</h2></div>
          {problems.map((problemValue) => (
            <div className="dock-problem-detail" key={problemValue.problemId}>
              <div className="dock-problem-title">
                <span className="inline-state warn">存在问题</span>
                <strong>{problemValue.title}</strong>
              </div>
              <p>{problemValue.message}</p>
              <div className="problem-meta">
                {problemValue.fieldName ? <span>字段 {problemValue.fieldName}</span> : null}
                {problemValue.rowIndex ? <span>第 {problemValue.rowIndex} 行</span> : null}
                {problemValue.evidence ? <span>{problemValue.evidence}</span> : null}
              </div>
              <small>{problemValue.action}</small>
              {(problemValue.fieldName || problemValue.sourceRowId) ? (
                <button
                  type="button"
                  className="toolbar-button dock-action"
                  data-testid={`dock-locate-point-problem-${safeTestId(problemValue.problemId)}`}
                  onClick={() => onLocateProblem(problemValue)}
                >
                  定位字段或源行
                </button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </RightPanelShell>
  );
}

function CheckRightPanel({
  selectedIssue,
  governedRows,
  governance,
  onDataGovernance,
  artifactStatus,
}: {
  selectedIssue: CheckIssue | null;
  artifactStatus?: CheckArtifactStatus;
  governance: ProjectWorkspaceV2['points'][number]['dataGovernance'] | null;
  governedRows: GovernedInputRow[];
  onDataGovernance?: (command: DataGovernanceCommand) => DataGovernanceCommandResult;
}) {
  const [pendingReview, setPendingReview] = useState<'keep-row' | 'exclude-row' | 'exclude-range' | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [commandProblem, setCommandProblem] = useState('');
  const selectedSourceRowId = selectedIssue?.sourceRowId
    ?? (selectedIssue?.rowIndexFrom ? governedRows[selectedIssue.rowIndexFrom - 1]?.sourceRowId : null)
    ?? null;
  const exclusion = governance ? currentExclusion(governance) : null;
  const smoothing = governance ? activeSmoothing(governance) : null;

  const submitReview = () => {
    if (!pendingReview || !onDataGovernance) return;
    const command: ExclusionCommand = pendingReview === 'exclude-range'
      ? {
          kind: 'exclude-range',
          depthFromM: selectedIssue?.depthFromM ?? 0,
          depthToM: selectedIssue?.depthToM ?? selectedIssue?.depthFromM ?? 0,
          reason: reviewReason,
        }
      : { kind: pendingReview, sourceRowId: selectedSourceRowId ?? '', reason: reviewReason };
    const result = onDataGovernance({ kind: 'review', command });
    if (!result.ok) setCommandProblem(result.problem);
    else {
      setPendingReview(null);
      setReviewReason('');
      setCommandProblem('');
    }
  };

  const runSmoothing = (preset: Exclude<DataSmoothingSettingsV3['preset'], 'custom'>) => {
    const result = onDataGovernance?.({ kind: 'run-smoothing', settings: { preset, depthWindowM: SMOOTHING_PRESETS[preset] } });
    if (result) setCommandProblem(result.ok ? '' : result.problem);
  };

  return (
    <RightPanelShell title="当前检查项" eyebrow="数据检查" showTabs={false}>
      <section className="query-card inspector-primary" data-testid="check-issue-detail-dock">
        <div className="query-card-heading"><h2>{selectedIssue?.title ?? '检查项详情'}</h2></div>
        {selectedIssue ? (
          <>
            <PropertyRow label="状态" value={artifactStatus === 'stale' ? '需要重新检查' : issueSeverityLabel(selectedIssue.severity)} />
            <PropertyRow label="定位" value={formatIssueEvidence(selectedIssue)} />
            <PropertyRow label="建议" value={selectedIssue.nextAction} />
            <p className="short-note">{selectedIssue.detail}</p>
          </>
        ) : <p className="short-note">选择检查项后查看定位证据。</p>}
      </section>

      <details className="query-card check-advanced-governance" data-testid="check-advanced-governance">
        <summary>高级数据治理</summary>
        <div className="check-advanced-governance-body">
      <section className="query-card" data-testid="check-governance-dock">
        <div className="query-card-heading"><h2>证据视图</h2><span>{governedRows.length} 行</span></div>
        <div className="segmented-control" role="tablist" aria-label="数据证据视图">
          {(['raw', 'smoothed', 'overlay'] as const).map((mode) => (
            <button
              type="button"
              role="tab"
              aria-selected={governance?.viewMode === mode}
              className={governance?.viewMode === mode ? 'active' : ''}
              key={mode}
              data-testid={`check-view-${mode}`}
              disabled={!governance || (mode !== 'raw' && !smoothing)}
              onClick={() => onDataGovernance?.({ kind: 'set-view', viewMode: mode })}
            >{mode === 'raw' ? '原始' : mode === 'smoothed' ? '平滑' : '对照'}</button>
          ))}
        </div>
        <PropertyRow label="排除修订" value={exclusion ? `v${exclusion.version} / ${exclusion.excludedSourceRowIds.length} 行` : '尚未创建'} />
        <PropertyRow label="平滑试算" value={smoothing ? `${smoothing.settings.depthWindowM.toFixed(2)} m / ${smoothing.rows.length} 行` : '尚未运行'} />
      </section>

      <section className="query-card" data-testid="check-review-actions">
        <div className="query-card-heading"><h2>异常复核</h2><span>写入修订</span></div>
        <p className="short-note">保留或排除只写入治理修订；原始附件和原始测量行保持不变。</p>
        <div className="dock-button-row">
          <button type="button" className="toolbar-button" disabled={!selectedSourceRowId || !onDataGovernance} onClick={() => setPendingReview('keep-row')} data-testid="check-keep-row">保留此异常</button>
          <button type="button" className="toolbar-button danger" disabled={!selectedSourceRowId || !onDataGovernance} onClick={() => setPendingReview('exclude-row')} data-testid="check-exclude-row">排除此行</button>
        </div>
        <button
          type="button"
          className="toolbar-button dock-action"
          disabled={selectedIssue?.depthFromM === undefined || selectedIssue.depthToM === undefined || !onDataGovernance}
          onClick={() => setPendingReview('exclude-range')}
          data-testid="check-exclude-range"
        >排除定位深度范围</button>
        {pendingReview ? (
          <div className="dock-confirmation" data-testid="check-review-confirmation">
            <strong>{pendingReview === 'keep-row' ? '确认保留此异常？' : pendingReview === 'exclude-row' ? '确认排除此源行？' : '确认排除此深度范围？'}</strong>
            <label className="field-stack compact-field"><span>复核原因</span><textarea value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} rows={3} data-testid="check-review-reason" /></label>
            <div className="dock-button-row">
              <button type="button" className="toolbar-button" onClick={() => { setPendingReview(null); setReviewReason(''); }} data-testid="check-review-cancel">取消</button>
              <button type="button" className="toolbar-button primary" onClick={submitReview} data-testid="check-review-confirm">确认写入修订</button>
            </div>
          </div>
        ) : null}
        {exclusion && governance && governance.exclusionRevisions.length > 1 ? (
          <button
            type="button"
            className="toolbar-button dock-action"
            data-testid="check-restore-exclusion"
            onClick={() => {
              const previous = governance.exclusionRevisions.at(-2)?.revisionId ?? null;
              const result = onDataGovernance?.({ kind: 'restore-exclusion', revisionId: previous });
              if (result && !result.ok) setCommandProblem(result.problem);
            }}
          >恢复上一排除修订</button>
        ) : null}
      </section>

      <section className="query-card" data-testid="check-smoothing-controls">
        <div className="query-card-heading"><h2>深度窗口平滑</h2><span>中位数</span></div>
        <p className="short-note">长缺口自动分段，不跨缺口借用相邻值。运行后需重新检查。</p>
        <div className="dock-button-row">
          <button type="button" className="toolbar-button" onClick={() => runSmoothing('conservative')} disabled={!governedRows.length} data-testid="check-smooth-conservative">保守 0.25 m</button>
          <button type="button" className="toolbar-button" onClick={() => runSmoothing('standard')} disabled={!governedRows.length} data-testid="check-smooth-standard">标准 0.50 m</button>
        </div>
        <button type="button" className="toolbar-button dock-action" onClick={() => runSmoothing('strong')} disabled={!governedRows.length} data-testid="check-smooth-strong">强平滑 1.00 m</button>
        {commandProblem ? <p className="dock-command-problem" data-testid="check-governance-problem">{commandProblem}</p> : null}
      </section>

        </div>
      </details>
    </RightPanelShell>
  );
}

function ParameterToolModeSwitch({ mode, onChange }: { mode: 'builtin' | 'custom'; onChange: (mode: 'builtin' | 'custom') => void }) {
  return <section className="parameter-tool-mode" data-testid="parameter-tool-mode"><div className="segmented-control" role="tablist" aria-label="参数工具模式"><button type="button" role="tab" aria-selected={mode === 'builtin'} className={mode === 'builtin' ? 'active' : ''} onClick={() => onChange('builtin')} data-testid="parameter-mode-builtin">内置方法</button><button type="button" role="tab" aria-selected={mode === 'custom'} className={mode === 'custom' ? 'active' : ''} onClick={() => onChange('custom')} data-testid="parameter-mode-custom">自定义公式</button></div></section>;
}

function CustomFormulaRightPanel({
  workspace,
  formula,
  revision,
  revisions,
  sampleRow,
  run,
  runs,
  validation,
  stale,
  sourceReady,
  stratificationRevision,
  openRun,
  commandProblem,
  onToolModeChange,
  onCreate,
  onSelect,
  onUpdate,
  onDiscard,
  onBeginEdit,
  onDuplicate,
  onDelete,
  onRestore,
  onCancel,
  onSelectRun,
  onLocateSourceRow,
}: {
  workspace: ParameterWorkspaceV2;
  formula: CustomFormulaDefinitionV1 | null;
  revision: ReturnType<typeof selectCustomFormulaRevision>;
  revisions: CustomFormulaRevisionV1[];
  sampleRow: ParameterDerivedInputRowV2 | null;
  run: CustomFormulaRunV1 | null;
  runs: CustomFormulaRunV1[];
  validation: ReturnType<typeof validateCustomFormulaDraft> | null;
  stale: boolean;
  sourceReady: boolean;
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  openRun: CustomFormulaRunV1 | null;
  commandProblem: string;
  onToolModeChange: (mode: 'builtin' | 'custom') => void;
  onCreate: () => void;
  onSelect: (formulaId: string) => void;
  onUpdate: (patch: CustomFormulaDraftPatch) => void;
  onDiscard: () => void;
  onBeginEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRestore: (formulaId: string) => void;
  onCancel: () => void;
  onSelectRun: (runId: string) => void;
  onLocateSourceRow: () => void;
}) {
  const editing = Boolean(workspace.customFormulaEditSession);
  const displayedFormula = !editing && revision ? revision.snapshot : formula;
  const expressionRef = useRef<HTMLTextAreaElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => setDeleteOpen(false), [formula?.formulaId]);
  const sampleEvaluation = validation?.expression.ok && sampleRow
    ? evaluateCustomFormulaExpression(validation.expression.ast, { depthM: sampleRow.depthM, qc: sampleRow.qcKpa, qt: sampleRow.qtKpa, qnet: sampleRow.qnetKpa, fs: sampleRow.fsKpa, u2: sampleRow.u2Kpa, Qtn: sampleRow.qtn, IcRW: sampleRow.ic })
    : null;
  const appendExpression = (token: string) => {
    if (!formula) return;
    const input = expressionRef.current;
    const start = input?.selectionStart ?? formula.expression.length;
    const end = input?.selectionEnd ?? start;
    const before = formula.expression.slice(0, start);
    const after = formula.expression.slice(end);
    const prefix = before && !/\s$/.test(before) ? ' ' : '';
    const suffix = after && !/^\s/.test(after) ? ' ' : '';
    const nextExpression = `${before}${prefix}${token}${suffix}${after}`;
    const nextCursor = before.length + prefix.length + token.length;
    onUpdate({ expression: nextExpression });
    globalThis.setTimeout(() => { expressionRef.current?.focus(); expressionRef.current?.setSelectionRange(nextCursor, nextCursor); }, 0);
  };
  return (
    <RightPanelShell title="参数工具" eyebrow="曲线与公式" showTabs={false}>
      <ParameterToolModeSwitch mode="custom" onChange={onToolModeChange} />
      <section className="query-card inspector-primary" data-testid="custom-formula-collection">
        <div className="query-card-heading"><h2>自定义公式</h2>{!formula ? <button type="button" aria-label="新建自定义公式" onClick={onCreate}><Plus size={15} /></button> : null}</div>
        {formula ? <>
          <label className="field-stack compact-field"><span>当前公式</span><select value={formula.formulaId} onChange={(event) => onSelect(event.target.value)} data-testid="custom-formula-select">{(workspace.customFormulas ?? []).filter((candidate) => candidate.status !== 'deleted').map((candidate) => <option key={candidate.formulaId} value={candidate.formulaId}>{candidate.name} / {customFormulaStatusLabel(candidate.status)}</option>)}</select></label>
          <PropertyRow label="版本" value={formula.version ? `v${formula.version}` : '尚未提交'} />
          <PropertyRow label="状态" value={editing ? '编辑中' : customFormulaStatusLabel(formula.status)} />
          <div className="dock-button-row">
            {stale ? <button type="button" className="toolbar-button" onClick={onDuplicate} disabled={!sourceReady} data-testid="custom-formula-rebuild"><Copy size={14} />基于最新来源复制</button> : editing ? <button type="button" className="toolbar-button danger" onClick={onDiscard} data-testid="custom-formula-discard">放弃修改</button> : <button type="button" className="toolbar-button" onClick={onBeginEdit} data-testid="custom-formula-edit"><Pencil size={14} />编辑公式</button>}
          </div>
          {!editing ? <div className="dock-button-row"><button type="button" className="toolbar-button" onClick={onCreate} data-testid="custom-formula-new"><Plus size={14} />新建</button><button type="button" className="toolbar-button" onClick={onDuplicate} data-testid="custom-formula-duplicate"><Copy size={14} />复制</button><button type="button" className="toolbar-button" onClick={() => setDeleteOpen(true)} data-testid="custom-formula-delete"><Trash2 size={14} />删除</button></div> : null}
          {deleteOpen ? <div className="dock-confirmation" data-testid="custom-formula-delete-confirmation"><strong>删除“{formula.name}”？</strong><p className="short-note">公式将移入已删除列表；历史修订和运行继续保留。</p><div className="dock-button-row"><button type="button" className="toolbar-button" onClick={() => setDeleteOpen(false)}>取消</button><button type="button" className="toolbar-button danger" onClick={() => { setDeleteOpen(false); onDelete(); }} data-testid="custom-formula-delete-confirm">确认删除</button></div></div> : null}
          {(workspace.customFormulas ?? []).some((candidate) => candidate.status === 'deleted') ? <details><summary>已删除公式</summary>{(workspace.customFormulas ?? []).filter((candidate) => candidate.status === 'deleted').map((candidate) => <button type="button" className="toolbar-button dock-action" key={candidate.formulaId} onClick={() => onRestore(candidate.formulaId)} data-testid={`custom-formula-restore-${candidate.formulaId}`}>恢复 {candidate.name}</button>)}</details> : null}
        </> : <><p className="short-note">当前参数推导完成后，可建立额外的受限公式曲线。</p><button type="button" className="toolbar-button dock-action" onClick={onCreate} disabled={!sourceReady} data-testid="custom-formula-create">新建自定义公式</button></>}
      </section>

      {formula && editing ? <section className="query-card custom-formula-editor" data-testid="custom-formula-editor">
        <div className="query-card-heading"><h2>公式定义</h2><span className={`inline-state ${validation?.ok ? 'ok' : 'warn'}`}>{validation?.ok ? '验证通过' : '存在问题'}</span></div>
        <label className="field-stack compact-field"><span>名称</span><input value={formula.name} onChange={(event) => onUpdate({ name: event.target.value })} data-testid="custom-formula-name" /></label>
        <div className="custom-formula-meta-grid"><label className="field-stack compact-field"><span>结果符号</span><input value={formula.symbol} onChange={(event) => onUpdate({ symbol: event.target.value })} data-testid="custom-formula-symbol" /></label><label className="field-stack compact-field"><span>用户声明单位</span><input value={formula.unit} onChange={(event) => onUpdate({ unit: event.target.value })} data-testid="custom-formula-unit" /></label></div>
        <label className="field-stack compact-field"><span>说明</span><input value={formula.description} onChange={(event) => onUpdate({ description: event.target.value })} data-testid="custom-formula-description" /></label>
        <label className="field-stack compact-field"><span>表达式</span><textarea ref={expressionRef} value={formula.expression} onChange={(event) => onUpdate({ expression: event.target.value })} rows={4} spellCheck={false} data-testid="custom-formula-expression" /></label>
        <div className="custom-formula-token-group" data-testid="custom-formula-variables"><span>变量</span><div>{Object.entries(CUSTOM_FORMULA_VARIABLES).map(([name, spec]) => <button type="button" key={name} title={`${spec.label} / ${spec.unit}`} onClick={() => appendExpression(name)}>{name}</button>)}</div></div>
        <div className="custom-formula-token-group" data-testid="custom-formula-functions"><span>函数</span><div>{Object.entries(CUSTOM_FORMULA_FUNCTIONS).map(([name, spec]) => <button type="button" key={name} title={spec.example} onClick={() => appendExpression(spec.example)}>{name}</button>)}</div></div>
        <div className="custom-formula-layer-list" data-testid="custom-formula-target-layers"><span>目标层</span>{stratificationRevision?.snapshot.layers.map((layer) => <label key={layer.layerId}><input type="checkbox" checked={formula.targetLayerIds.includes(layer.layerId)} onChange={(event) => onUpdate({ targetLayerIds: event.target.checked ? [...formula.targetLayerIds, layer.layerId] : formula.targetLayerIds.filter((layerId) => layerId !== layer.layerId) })} />{layer.name} · {layer.depthFromM.toFixed(2)}-{layer.depthToM.toFixed(2)} m</label>)}</div>
        <div className="custom-formula-meta-grid"><NullableNumberField label="结果下限" value={formula.resultMinimum} onChange={(value) => onUpdate({ resultMinimum: value })} testId="custom-formula-min" /><NullableNumberField label="结果上限" value={formula.resultMaximum} onChange={(value) => onUpdate({ resultMaximum: value })} testId="custom-formula-max" /></div>
        {sampleRow ? <div className="custom-formula-sample" data-testid="custom-formula-sample"><span>样例行 · 深度 {sampleRow.depthM.toFixed(2)} m</span><strong>{sampleEvaluation?.kind === 'value' ? `${sampleEvaluation.value.toFixed(4)} ${formula.unit}` : sampleEvaluation?.kind === 'missing' ? `缺少 ${sampleEvaluation.variable}` : sampleEvaluation?.kind === 'problem' ? sampleEvaluation.message : '表达式通过后显示结果'}</strong><small>qnet {sampleRow.qnetKpa?.toFixed(2) ?? '—'} · Qtn {sampleRow.qtn?.toFixed(2) ?? '—'} · IcRW {sampleRow.ic?.toFixed(2) ?? '—'}</small></div> : null}
        {!validation?.ok ? <div className="custom-formula-problems" data-testid="custom-formula-validation-problems">{validation?.problems.map((problem) => <p key={problem}>{problem}</p>)}</div> : <p className="short-note" data-testid="custom-formula-validation-ok">表达式仅包含允许的变量、函数和算术结构。</p>}
      </section> : displayedFormula ? <section className="query-card" data-testid="custom-formula-definition"><div className="query-card-heading"><h2>公式定义</h2><span>v{revision?.version ?? displayedFormula.version}</span></div>{revision && formula && revision.version !== formula.version ? <p className="short-note" data-testid="custom-formula-historical-definition">正在查看历史运行绑定的公式修订；新运行仍使用当前公式。</p> : null}<PropertyRow label="符号 / 单位" value={`${displayedFormula.symbol} / ${displayedFormula.unit}`} /><PropertyRow label="单位校验" value="用户声明，系统未验证量纲" /><PropertyRow label="表达式" value={displayedFormula.expression} /><PropertyRow label="目标层" value={`${displayedFormula.targetLayerIds.length} 层`} /><PropertyRow label="结果范围" value={`${displayedFormula.resultMinimum ?? '未设'} - ${displayedFormula.resultMaximum ?? '未设'}`} /><details><summary>公式安全边界</summary><p className="short-note">只执行白名单 AST；不执行 JavaScript、属性访问或动态调用。</p><code>{revision?.astHash ?? '尚未提交'}</code></details></section> : null}

      {formula && !editing ? <section className="query-card" data-testid="custom-formula-revisions"><div className="query-card-heading"><h2>公式修订</h2><span>{revisions.length}</span></div>{revisions.map((candidate) => <details key={candidate.revisionId} data-testid={`custom-formula-revision-${candidate.version}`}><summary>v{candidate.version} · {candidate.committedAt}</summary><PropertyRow label="表达式" value={candidate.snapshot.expression} /><PropertyRow label="符号 / 单位" value={`${candidate.snapshot.symbol} / ${candidate.snapshot.unit}`} /><PropertyRow label="目标层" value={`${candidate.snapshot.targetLayerIds.length} 层`} /><code>{candidate.contentHash}</code></details>)}</section> : null}

      {formula && !editing ? <section className="query-card" data-testid="custom-formula-run-history"><div className="query-card-heading"><h2>运行记录</h2><span>{runs.length}</span></div>{openRun ? <button type="button" className="toolbar-button dock-action" onClick={onCancel} data-testid="custom-formula-cancel"><X size={14} />取消运行</button> : null}<div className="parameter-run-history-list">{runs.map((candidate) => <button type="button" key={candidate.runId} className={candidate.runId === run?.runId ? 'selected' : ''} onClick={() => onSelectRun(candidate.runId)} data-testid={`custom-formula-run-${candidate.runId}`}><span><strong>{candidate.symbolSnapshot} / v{candidate.formulaVersion}</strong><em>{parameterRunStatusLabel(candidate.status)}</em></span><small>{candidate.completedAt ?? candidate.createdAt}</small></button>)}{!runs.length ? <p className="short-note">当前公式还没有运行历史。</p> : null}</div></section> : null}

      {run ? <section className="query-card" data-testid="custom-formula-run-authority"><div className="query-card-heading"><h2>选中运行依据</h2><span>只读快照</span></div><PropertyRow label="公式修订" value={`v${run.formulaVersion}`} /><PropertyRow label="表达式" value={run.expressionSnapshot} /><PropertyRow label="符号 / 单位" value={`${run.symbolSnapshot} / ${run.unitSnapshot}`} /><PropertyRow label="目标层" value={`${run.targetLayerIdsSnapshot.length} 层`} /><PropertyRow label="输入行" value={`${run.inputRowsSnapshot.length} 行`} /><div className="dock-button-row"><button type="button" className="toolbar-button" onClick={onLocateSourceRow}><FileInput size={14} />定位来源行</button></div><details><summary>技术标识</summary><code>{run.formulaRevisionId}</code><code>{run.astHash}</code><code>{run.inputHash}</code></details></section> : null}
      {commandProblem ? <section className="query-card parameter-command-problem" data-testid="parameter-command-problem"><div className="query-card-heading"><h2>当前问题</h2></div><p>{commandProblem}</p></section> : null}
    </RightPanelShell>
  );
}

function NullableNumberField({ label, value, onChange, testId }: { label: string; value: number | null; onChange: (value: number | null) => void; testId: string }) {
  return <label className="field-stack compact-field"><span>{label}</span><input type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} data-testid={testId} /></label>;
}

function JtsParameterPackageTool({ run, settings, setSettings, onRun }: {
  run: JtsParameterPackageRunV5 | null;
  settings: JtsParameterPackageSettingsV5;
  setSettings: React.Dispatch<React.SetStateAction<JtsParameterPackageSettingsV5>>;
  onRun: (settings: JtsParameterPackageSettingsV5) => void;
}) {
  const selectNkt = (testType: string) => {
    const selected = testType ? jtsTableNktSetting(testType) : null;
    setSettings((current) => ({
      ...current,
      nktTargetTestType: selected?.nktTargetTestType ?? null,
      nktValue: selected?.nktValue ?? null,
      nktSourceType: selected?.nktSourceType ?? null,
      nktSourceRevisionId: selected?.nktSourceRevisionId ?? null,
      nktConfirmedAt: selected?.nktConfirmedAt ?? null,
    }));
  };
  const toggleOptional = (methodId: JtsParameterPackageSettingsV5['selectedOptionalMethodIds'][number]) => setSettings((current) => ({
    ...current,
    selectedOptionalMethodIds: current.selectedOptionalMethodIds.includes(methodId)
      ? current.selectedOptionalMethodIds.filter((candidate) => candidate !== methodId)
      : [...current.selectedOptionalMethodIds, methodId],
  }));
  const pendingMethods = run?.checklist.filter((item) => item.status === 'pending' || item.status === 'problem') ?? [];
  return (
    <section className="query-card jts-parameter-package-tool" data-testid="jts-parameter-package-tool">
      <div className="query-card-heading"><h2>试算设置</h2><span>{run ? run.status === 'completed' ? '当前' : '需要更新' : '待运行'}</span></div>
      {!run ? <p className="short-note">依据当前分层修订选择参数方法；行级分类仅作审计依据。</p> : null}
      {pendingMethods.length ? <div className="jts-package-pending-methods" data-testid="jts-package-pending-methods">
        <strong>{pendingMethods.length} 项尚未完成</strong>
        <p className="short-note">可逐项处理，也可在确认范围时设为本阶段不纳入。</p>
      </div> : null}
      <details open={!run}>
        <summary>运行设置与确认</summary>
        <label className="field-stack compact-field"><span>Nkt 目标试验 / JTS 表 7.2.4</span><select value={settings.nktTargetTestType ?? ''} onChange={(event) => selectNkt(event.target.value)} data-testid="jts-package-nkt"><option value="">尚未确认</option><option value="direct_shear_quick">直剪快剪 / 20</option><option value="consolidated_direct_shear_quick">固结快剪 / 17.9</option><option value="triaxial_uu">三轴 UU / 23.8</option><option value="triaxial_cu">三轴 CU / 13</option><option value="triaxial_ck0u">三轴 CK0U / 10</option><option value="unconfined_compression">无侧限 / 30</option><option value="field_vane">现场十字板 / 15.5</option></select></label>
        <label className="field-stack compact-field"><span>粉土排水判断</span><select value={settings.siltDrainageDecision} onChange={(event) => setSettings((current) => ({ ...current, siltDrainageDecision: event.target.value as JtsParameterPackageSettingsV5['siltDrainageDecision'] }))} data-testid="jts-package-silt-drainage"><option value="pending">待确认</option><option value="drained">排水</option><option value="undrained">不排水</option></select></label>
        {settings.siltDrainageDecision !== 'pending' ? <>
          <label className="field-stack compact-field"><span>{settings.siltDrainageDecision === 'drained' ? '粉土人工 φ′ (°)' : '粉土人工 Su (kPa)'}</span><input type="number" min="0" step="0.1" value={settings.siltManualValue ?? ''} onChange={(event) => setSettings((current) => ({ ...current, siltManualValue: event.target.value === '' ? null : Number(event.target.value) }))} data-testid="jts-package-silt-manual-value" /></label>
          <label className="field-stack compact-field"><span>人工值来源</span><input value={settings.siltManualSource} onChange={(event) => setSettings((current) => ({ ...current, siltManualSource: event.target.value }))} placeholder="试验、项目经验或审查记录" data-testid="jts-package-silt-manual-source" /></label>
          <p className="short-note">人工粉土参数与 JTS 相关式结果分开标识，并冻结在本次参数包修订中。</p>
        </> : null}
        <label className="field-stack compact-field"><span>砂土材料范围</span><select value={settings.materialScope} onChange={(event) => setSettings((current) => ({ ...current, materialScope: event.target.value as JtsParameterPackageSettingsV5['materialScope'] }))} data-testid="jts-package-material-scope"><option value="unknown">尚未确认</option><option value="within_source">在标准来源范围内</option><option value="calcareous_sand">钙质砂</option><option value="carbonaceous_sand">碳质砂</option></select></label>
        <label className="dock-check"><input type="checkbox" checked={settings.ocrCoefficientConfirmed} onChange={(event) => setSettings((current) => ({ ...current, ocrCoefficientConfirmed: event.target.checked }))} data-testid="jts-package-confirm-ocr" />确认 kOCR=0.16 来源</label>
        <label className="dock-check"><input type="checkbox" checked={settings.sensitivityCoefficientConfirmed} onChange={(event) => setSettings((current) => ({ ...current, sensitivityCoefficientConfirmed: event.target.checked }))} data-testid="jts-package-confirm-sensitivity" />确认 Ns=6.3 来源</label>
        <label className="dock-check"><input type="checkbox" checked={settings.selectedOptionalMethodIds.includes('jts_spt_n')} onChange={() => toggleOptional('jts_spt_n')} data-testid="jts-package-select-spt" />选择 SPT N 可选方法</label>
        <label className="dock-check"><input type="checkbox" checked={settings.selectedOptionalMethodIds.includes('jts_dissipation_ch_kh')} onChange={() => toggleOptional('jts_dissipation_ch_kh')} data-testid="jts-package-select-dissipation" />选择 Ch/kh（需要消散试验）</label>
      </details>
      <button type="button" className="toolbar-button dock-action" onClick={() => onRun(settings)} data-testid="run-jts-parameter-package">{run ? '应用高级设置并重新试算' : '应用高级设置并试算'}</button>
    </section>
  );
}

function JtsDissipationTool({
  workspace,
  test,
  t50,
  result,
  layers,
  onCommand,
}: {
  workspace: ParameterWorkspaceV2;
  test: JtsDissipationTestRevisionV6 | null;
  t50: JtsDissipationT50RevisionV6 | null;
  result: JtsDissipationResultRevisionV6 | null;
  layers: StratificationLayerV2[];
  onCommand: (command: JtsDissipationCommand) => void;
}) {
  const [depthM, setDepthM] = useState('');
  const [u0Kpa, setU0Kpa] = useState('');
  const [layerId, setLayerId] = useState('');
  const [mode, setMode] = useState<'auto-intersection' | 'manual-alternative'>('auto-intersection');
  const [manualT50, setManualT50] = useState('');
  const [problem, setProblem] = useState('');
  const cohesiveLayers = layers.filter((layer) => layer.engineeringSoilGroup === 'clay');
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const depth = Number(depthM);
    const u0 = Number(u0Kpa);
    const targetLayerId = layerId || cohesiveLayers[0]?.layerId || '';
    if (!Number.isFinite(depth) || depth < 0 || !Number.isFinite(u0) || !targetLayerId) {
      setProblem('上传前请填写试验深度、静水孔压并选择黏性土层。');
      return;
    }
    const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
    const headers = (lines[0] ?? '').split(',').map((item) => item.trim().toLowerCase());
    const timeIndex = headers.findIndex((item) => ['time(s)', 'time_seconds', 'time'].includes(item));
    const pressureIndex = headers.findIndex((item) => ['u2(kpa)', 'u2_kpa', 'u2'].includes(item));
    if (timeIndex < 0 || pressureIndex < 0) {
      setProblem('CSV 必须包含明确的 Time(s) 与 u2(kPa) 列。');
      return;
    }
    const rows = lines.slice(1).map((line, index) => {
      const cells = line.split(',').map((item) => item.trim());
      return { sourceRowNumber: index + 2, timeSeconds: Number(cells[timeIndex]), u2Kpa: Number(cells[pressureIndex]) };
    });
    setProblem('');
    onCommand({ kind: 'append-test', input: { fileName: file.name, depthM: depth, layerId: targetLayerId, u0Kpa: u0, rows } });
  };
  return (
    <section className="query-card jts-dissipation-tool" data-testid="jts-dissipation-tool">
      <div className="query-card-heading"><h2>孔压消散试验</h2><span>{result?.status === 'completed' ? 'Ch/kh 当前' : t50 ? 't50 已确认' : test ? test.status === 'ready' ? '待确认 t50' : '存在问题' : '待导入'}</span></div>
      <p className="short-note">原始时间序列、t50 确认与 Ch/kh 计算分别形成不可变修订。</p>
      {(workspace.jtsDissipationTests?.length ?? 0) > 0 ? <label className="field-stack compact-field"><span>试验修订</span><select value={test?.revisionId ?? ''} onChange={(event) => onCommand({ kind: 'select-test', testRevisionId: event.target.value })} data-testid="dissipation-test-select">{workspace.jtsDissipationTests?.map((item) => <option key={item.revisionId} value={item.revisionId}>{item.fileName} · {item.depthM} m · {item.status === 'ready' ? '可用' : item.status === 'stale' ? '需要更新' : '存在问题'}</option>)}</select></label> : null}
      <details open={!test}>
        <summary>导入时间序列</summary>
        <label className="field-stack compact-field"><span>试验深度（m）</span><input type="number" min="0" step="0.01" value={depthM} onChange={(event) => setDepthM(event.target.value)} data-testid="dissipation-depth" /></label>
        <label className="field-stack compact-field"><span>静水孔压 u0（kPa）</span><input type="number" step="0.1" value={u0Kpa} onChange={(event) => setU0Kpa(event.target.value)} data-testid="dissipation-u0" /></label>
        <label className="field-stack compact-field"><span>关联黏性土层</span><select value={layerId} onChange={(event) => setLayerId(event.target.value)} data-testid="dissipation-layer"><option value="">请选择</option>{cohesiveLayers.map((layer) => <option key={layer.layerId} value={layer.layerId}>{layer.name} · {layer.depthFromM}–{layer.depthToM} m</option>)}</select></label>
        <label className="toolbar-button dock-action dissipation-file-label">上传 CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void importFile(event.target.files?.[0])} data-testid="dissipation-file-input" /></label>
      </details>
      {test ? <div className="jts-package-summary"><PropertyRow label="来源" value={test.fileName} /><PropertyRow label="序列" value={`${test.rows.length} 行`} /><PropertyRow label="深度 / 地层" value={`${test.depthM} m / ${layers.find((layer) => layer.layerId === test.layerId)?.name ?? test.layerId}`} />{test.problem ? <p className="inline-problem">{test.problem}</p> : null}</div> : null}
      {test?.status === 'ready' ? <>
        <label className="field-stack compact-field"><span>t50 来源</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} data-testid="dissipation-t50-mode"><option value="auto-intersection">自动 50% 交点</option><option value="manual-alternative">手工备选</option></select></label>
        {mode === 'manual-alternative' ? <label className="field-stack compact-field"><span>手工 t50（s）</span><input type="number" min="0" step="0.1" value={manualT50} onChange={(event) => setManualT50(event.target.value)} data-testid="dissipation-manual-t50" /></label> : null}
        <button type="button" className="toolbar-button dock-action" onClick={() => onCommand({ kind: 'confirm-t50', mode, manualT50Seconds: mode === 'manual-alternative' ? Number(manualT50) : null })} data-testid="confirm-dissipation-t50">确认 t50</button>
      </> : null}
      {t50 ? <><PropertyRow label="当前 t50" value={`${t50.t50Seconds.toFixed(2)} s · ${t50.origin === 'auto-intersection' ? '自动交点' : '手工备选'}`} /><button type="button" className="toolbar-button primary dock-action" onClick={() => onCommand({ kind: 'calculate' })} data-testid="calculate-dissipation">计算 Ch/kh</button></> : null}
      {result ? <div className="jts-package-summary" data-testid="dissipation-result-summary"><PropertyRow label="Ch" value={`${result.chM2PerSecond.toExponential(4)} m²/s`} /><PropertyRow label="kh" value={`${result.khMPerSecond.toExponential(4)} m/s`} /></div> : null}
      {problem ? <p className="inline-problem">{problem}</p> : null}
    </section>
  );
}

function ParameterRightPanel({
  toolMode,
  onToolModeChange,
  workspace,
  guidedMode,
  jtsPackage,
  onRunJtsPackage,
  dissipationTest,
  dissipationT50,
  dissipationResult,
  dissipationLayers,
  onDissipationCommand,
  scheme,
  schemeRevision,
  schemeStale,
  viewingHistoricalRevision,
  slot,
  runs,
  selectedRun,
  inspectedRow,
  inspectedValue,
  inspectedLayer,
  evidenceReady,
  evidenceConflict,
  allEvidenceReady,
  evidenceDirty,
  evidenceProblem,
  evidenceDraft,
  selectedLayerId,
  stratificationRevision,
  nktMode,
  commandProblem,
  openRun,
  onCreateScheme,
  onSelectScheme,
  onBeginEdit,
  onCommitScheme,
  onDiscardEdit,
  onRenameScheme,
  onDuplicateScheme,
  onDeleteScheme,
  onRestoreScheme,
  onUpdateSettings,
  onSelectSlot,
  onSelectLayer,
  onUpdateEvidence,
  onSetNktMode,
  onConfirmEvidence,
  onCancelRun,
  onSelectRun,
  onLocateSourceRow,
  onShowIssues,
}: {
  toolMode: 'builtin' | 'custom';
  onToolModeChange: (mode: 'builtin' | 'custom') => void;
  workspace: ParameterWorkspaceV2;
  guidedMode: boolean;
  jtsPackage: JtsParameterPackageRunV5 | null;
  onRunJtsPackage: (settings: JtsParameterPackageSettingsV5) => void;
  dissipationTest: JtsDissipationTestRevisionV6 | null;
  dissipationT50: JtsDissipationT50RevisionV6 | null;
  dissipationResult: JtsDissipationResultRevisionV6 | null;
  dissipationLayers: StratificationLayerV2[];
  onDissipationCommand: (command: JtsDissipationCommand) => void;
  scheme: ReturnType<typeof selectActiveParameterSchemeV2>;
  schemeRevision: ParameterSchemeRevisionV2 | null;
  schemeStale: boolean;
  viewingHistoricalRevision: boolean;
  slot: ParameterSlotV2 | null;
  runs: ParameterRunV2[];
  selectedRun: ParameterRunV2 | null;
  inspectedRow: ParameterDerivedInputRowV2 | null;
  inspectedValue: ParameterValueV2 | null;
  inspectedLayer: StratificationLayerV2 | null;
  evidenceReady: boolean;
  evidenceConflict: boolean;
  allEvidenceReady: boolean;
  evidenceDirty: boolean;
  evidenceProblem: string;
  evidenceDraft: ParameterEvidenceDraft;
  selectedLayerId: string | null;
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  nktMode: ParameterWorkbenchNktMode;
  commandProblem: string;
  openRun: { runId: string; status: string } | null;
  onCreateScheme: () => void;
  onSelectScheme: (schemeId: string) => void;
  onBeginEdit: () => void;
  onCommitScheme: () => void;
  onDiscardEdit: () => void;
  onRenameScheme: (name: string) => void;
  onDuplicateScheme: () => void;
  onDeleteScheme: () => void;
  onRestoreScheme: (schemeId: string) => void;
  onUpdateSettings: (patch: Partial<ParameterInputSettingsV2>) => void;
  onSelectSlot: (slotId: string) => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateEvidence: (updater: ParameterEvidenceDraft | ((current: ParameterEvidenceDraft) => ParameterEvidenceDraft)) => void;
  onSetNktMode: (mode: ParameterWorkbenchNktMode) => void;
  onConfirmEvidence: () => void;
  onCancelRun: () => void;
  onSelectRun: (runId: string) => void;
  onLocateSourceRow: () => void;
  onShowIssues: () => void;
}) {
  const editing = Boolean(workspace.editSession);
  const settings = editing ? scheme?.inputSettings : schemeRevision?.snapshot.inputSettings ?? scheme?.inputSettings;
  const [packageSettings, setPackageSettings] = useState<JtsParameterPackageSettingsV5>({ ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS });
  useEffect(() => {
    if (jtsPackage) setPackageSettings(structuredClone(jtsPackage.settingsSnapshot));
  }, [jtsPackage?.runId]);
  const dissipationSelected = packageSettings.selectedOptionalMethodIds.includes('jts_dissipation_ch_kh')
    || Boolean(dissipationTest || dissipationT50 || dissipationResult);
  if (guidedMode) {
    return (
      <RightPanelShell title="参数工具" eyebrow="向导与高级" showTabs={false}>
        <ParameterToolModeSwitch mode={toolMode} onChange={onToolModeChange} />
        <JtsParameterPackageTool run={jtsPackage} settings={packageSettings} setSettings={setPackageSettings} onRun={onRunJtsPackage} />
        {dissipationSelected
          ? <JtsDissipationTool workspace={workspace} test={dissipationTest} t50={dissipationT50} result={dissipationResult} layers={dissipationLayers} onCommand={onDissipationCommand} />
          : <section className="query-card" data-testid="jts-dissipation-not-selected"><div className="query-card-heading"><h2>孔压消散参数</h2><span>本次未纳入</span></div></section>}
        {commandProblem ? <section className="query-card parameter-command-problem" data-testid="parameter-command-problem"><div className="query-card-heading"><h2>当前问题</h2></div><p>{commandProblem}</p></section> : null}
      </RightPanelShell>
    );
  }
  return (
    <RightPanelShell title="参数工具" eyebrow="曲线与方法" showTabs={false}>
      <ParameterToolModeSwitch mode={toolMode} onChange={onToolModeChange} />
      <JtsParameterPackageTool run={jtsPackage} settings={packageSettings} setSettings={setPackageSettings} onRun={onRunJtsPackage} />
      <JtsDissipationTool workspace={workspace} test={dissipationTest} t50={dissipationT50} result={dissipationResult} layers={dissipationLayers} onCommand={onDissipationCommand} />
      <section className="query-card inspector-primary" data-testid="parameter-scheme-dock">
        <div className="query-card-heading">
          <h2>当前方案</h2>
          {!scheme ? <button type="button" aria-label="建立参数方案" onClick={onCreateScheme}><Plus size={15} /></button> : null}
        </div>
        {scheme ? (
          <>
            <label className="field-stack compact-field"><span>方案</span><select value={scheme.schemeId} onChange={(event) => onSelectScheme(event.target.value)} disabled={editing} data-testid="parameter-scheme-select">{workspace.schemes.filter((candidate) => candidate.status !== 'deleted').map((candidate) => <option key={candidate.schemeId} value={candidate.schemeId}>{candidate.name} / {parameterWorkspaceStatusLabel(candidate.status)}</option>)}</select></label>
            {editing ? <label className="field-stack compact-field"><span>方案名称</span><input value={scheme.name} onChange={(event) => onRenameScheme(event.target.value)} data-testid="parameter-scheme-name" /></label> : null}
            <PropertyRow label="版本" value={scheme.version ? `v${scheme.version}` : '尚未提交'} />
            <PropertyRow label="状态" value={editing ? '编辑中' : parameterWorkspaceStatusLabel(scheme.status)} />
            <div className="dock-button-row">
              {schemeStale ? (
                <button type="button" className="toolbar-button" onClick={onCreateScheme} data-testid="rebuild-parameter-scheme"><Plus size={14} />基于最新分层新建</button>
              ) : editing ? (
                <><button type="button" className="toolbar-button primary" onClick={onCommitScheme} data-testid="commit-parameter-scheme">提交方案</button><button type="button" className="toolbar-button" onClick={onDiscardEdit} data-testid="discard-parameter-scheme">放弃修改</button></>
              ) : (
                <button type="button" className="toolbar-button" onClick={onBeginEdit} disabled={evidenceDirty} data-testid="edit-parameter-scheme"><Pencil size={14} />编辑设置</button>
              )}
            </div>
            {!editing ? <div className="dock-button-row"><button type="button" className="toolbar-button" onClick={onCreateScheme} disabled={evidenceDirty} title="新建参数方案" data-testid="parameter-new-scheme"><Plus size={14} />新建</button><button type="button" className="toolbar-button" onClick={onDuplicateScheme} disabled={evidenceDirty} title="复制参数方案" data-testid="parameter-duplicate-scheme"><Copy size={14} />复制</button><button type="button" className="toolbar-button" onClick={onDeleteScheme} disabled={evidenceDirty} title="删除参数方案" data-testid="parameter-delete-scheme"><Trash2 size={14} />删除</button></div> : null}
            {workspace.schemes.some((candidate) => candidate.status === 'deleted') ? <details className="parameter-deleted-schemes"><summary>已删除方案</summary>{workspace.schemes.filter((candidate) => candidate.status === 'deleted').map((candidate) => <button key={candidate.schemeId} type="button" className="toolbar-button dock-action" disabled={evidenceDirty} data-testid={`parameter-restore-scheme-${candidate.schemeId}`} onClick={() => onRestoreScheme(candidate.schemeId)}>恢复 {candidate.name}</button>)}</details> : null}
          </>
        ) : (
          <>
            <p className="short-note">按当前已提交分层中的砂土/黏土层建立方法槽。</p>
            <label className="field-stack compact-field">
              <span>suc 的 Nkt 来源</span>
              <select value={nktMode} onChange={(event) => onSetNktMode(event.target.value as ParameterWorkbenchNktMode)} data-testid="parameter-nkt-mode-before-create">
                <option value="literature">文献起始假设 Nkt=12</option>
                <option value="site-calibrated">场地标定</option>
              </select>
            </label>
            {nktMode === 'site-calibrated' ? <p className="inline-problem">当前没有 CAUC/CIUC 试验修订与匹配对，不能建立场地标定 Nkt。</p> : null}
            <button type="button" className="toolbar-button primary dock-action" onClick={onCreateScheme} data-testid="create-parameter-scheme">建立参数方案</button>
          </>
        )}
      </section>

      {scheme ? <section className="query-card" data-testid="parameter-method-dock">
        <div className="query-card-heading">
          <h2>方法</h2>
        </div>
        <div className="segmented-control parameter-method-segments" role="tablist" aria-label="参数方法">
          {scheme.slots.map((candidate) => (
            <button
              type="button"
              role="tab"
              aria-selected={candidate.slotId === slot?.slotId}
              className={candidate.slotId === slot?.slotId ? 'active' : ''}
              key={candidate.slotId}
              onClick={() => onSelectSlot(candidate.slotId)}
              data-testid={`parameter-method-${candidate.parameterKey === 'PhiDeg' ? 'phi' : 'suc'}`}
            >
              {candidate.symbol}
            </button>
          ))}
        </div>
        {slot ? (
          <>
            <PropertyRow label="方法" value={slot.parameterKey === 'PhiDeg' ? 'Qtn 砂土法' : 'qnet / Nkt'} />
            <PropertyRow label="目标层" value={`${slot.targetScope.layerIds.length} 层 / ${slot.targetScope.depthFromM.toFixed(2)}-${slot.targetScope.depthToM.toFixed(2)} m`} />
            <PropertyRow label="单位" value={slot.unit} />
            <details className="parameter-method-authority" data-testid="parameter-method-authority">
              <summary>方法依据</summary>
              <PropertyRow label="公式" value={slot.parameterKey === 'PhiDeg' ? "φ′p = 17.6 + 11 log10(Qtn)" : 'suc = qnet / Nkt'} />
              <PropertyRow label="来源" value={slot.parameterKey === 'PhiDeg' ? 'ConeTec CPT 参数手册 Rev 1.1，p82，式 (5.6)' : 'ConeTec CPT 参数手册 Rev 1.1，p113，式 (6.7)'} />
              <PropertyRow label="方法版本" value={selectedRun?.methodVersion ?? slot.selectedMethodVersion ?? '尚未冻结'} />
              {slot.parameterKey === 'SuKpa' && slot.settings.kind === 'suc_qnet_nkt_v1' ? <PropertyRow label="Nkt 来源" value={slot.settings.nktByLayer.every((item) => item.setting.origin === 'literature_starting_assumption') ? '文献起始假设 / 按层冻结' : '场地标定 / 按层冻结'} /> : null}
              <PropertyRow label="证据快照" value={selectedRun ? `${selectedRun.evidenceSnapshot.length} 个层级快照` : '运行时冻结'} />
              <details><summary>技术标识</summary><code>{selectedRun?.formulaReference ?? (slot.parameterKey === 'PhiDeg' ? 'Mayne-Cargill-Greig-2023-Rev1.1-p82-Eq5.6' : 'Mayne-Cargill-Greig-2023-Rev1.1-p113-Eq6.7')}</code><code>{slot.selectedMethodId ?? '—'}</code></details>
            </details>
          </>
        ) : (
          <p className="short-note">当前分层没有与此方法匹配的目标层。</p>
        )}
      </section> : null}

      {selectedRun ? <section className="query-card parameter-run-authority" data-testid="parameter-run-authority-snapshot">
        <div className="query-card-heading"><h2>选中运行依据</h2><span>只读快照</span></div>
        <PropertyRow label="参数修订" value={`v${schemeRevision?.version ?? '?'}`} />
        <PropertyRow label="公式来源" value={selectedRun.methodId.includes('Phi') ? 'ConeTec CPT 参数手册 Rev 1.1，p82，式 (5.6)' : 'ConeTec CPT 参数手册 Rev 1.1，p113，式 (6.7)'} />
        <PropertyRow label="方法版本" value={selectedRun.methodVersion} />
        {selectedRun.settingsSnapshot.kind === 'suc_qnet_nkt_v1' ? selectedRun.settingsSnapshot.nktByLayer.map((item, index) => <PropertyRow key={item.layerRevisionRef} label={`第 ${index + 1} 层 Nkt`} value={`${item.setting.value ?? '—'} / ${item.setting.origin === 'site_calibrated' ? '场地标定' : '文献起始假设'}`} />) : null}
        <div className="parameter-authority-evidence-list">
          {selectedRun.evidenceSnapshot.map((item, index) => (
            <details key={item.layerRevisionRef} data-testid={`parameter-run-evidence-${index + 1}`}>
              <summary>第 {index + 1} 层 · {item.depthFromM.toFixed(2)}-{item.depthToM.toFixed(2)} m</summary>
              <PropertyRow label="贯入速率" value={`${parameterRateEvidenceLabel(item.rate.status)}${item.rate.nominalRateMmPerSec === null ? '' : ` / ${item.rate.nominalRateMmPerSec} mm/s`}`} />
              <PropertyRow label="排水条件" value={parameterDrainageEvidenceLabel(item.drainage.status, item.drainage.resolvedAs)} />
              <PropertyRow label="材料适用性" value={`${parameterMaterialEvidenceLabel(item.material.status)} / ${parameterMaterialClassLabel(item.material.materialClass)}`} />
              <details><summary>证据修订</summary><code>{item.evidenceRevisionRefs.rate}</code><code>{item.evidenceRevisionRefs.drainage}</code><code>{item.evidenceRevisionRefs.material}</code>{item.evidenceRevisionRefs.conflictContext ? <code>{item.evidenceRevisionRefs.conflictContext}</code> : null}</details>
            </details>
          ))}
        </div>
        <details><summary>技术标识</summary><code>{selectedRun.formulaReference}</code><code>{selectedRun.formulaSpecHash}</code></details>
      </section> : null}

      {scheme && settings ? <section className="query-card" data-testid="parameter-input-settings-dock">
        <div className="query-card-heading">
          <h2>{selectedRun && !editing ? '选中运行的前置推导设置' : '前置推导设置'}</h2>
        </div>
        {editing ? (
          <div className="parameter-settings-grid">
            <NumericDockField label="净面积比 a_net" value={settings.netAreaRatio} step={0.01} onChange={(value) => onUpdateSettings({ netAreaRatio: value })} testId="parameter-setting-anet" />
            <NumericDockField label="土总重度 kN/m³" value={settings.soilTotalUnitWeightKnM3} step={0.1} onChange={(value) => onUpdateSettings({ soilTotalUnitWeightKnM3: value })} testId="parameter-setting-gamma" />
            <NumericDockField label="水重度 kN/m³" value={settings.waterUnitWeightKnM3} step={0.01} onChange={(value) => onUpdateSettings({ waterUnitWeightKnM3: value })} testId="parameter-setting-water-gamma" />
            <NumericDockField label="大气压 kPa" value={settings.atmosphericPressureKpa} step={1} onChange={(value) => onUpdateSettings({ atmosphericPressureKpa: value })} testId="parameter-setting-pa" />
            <NumericDockField label="有效应力下限 kPa" value={settings.minEffectiveStressKpa} step={0.5} onChange={(value) => onUpdateSettings({ minEffectiveStressKpa: value })} testId="parameter-setting-floor" />
            <NumericDockField label="迭代次数" value={settings.iterationCount} step={1} onChange={(value) => onUpdateSettings({ iterationCount: value })} testId="parameter-setting-iterations" />
          </div>
        ) : (
          <>
            <PropertyRow label="a_net / γt" value={`${settings.netAreaRatio.toFixed(2)} / ${settings.soilTotalUnitWeightKnM3.toFixed(1)}`} />
            <PropertyRow label="γw / pa" value={`${settings.waterUnitWeightKnM3.toFixed(2)} / ${settings.atmosphericPressureKpa.toFixed(0)}`} />
            <PropertyRow label="应力下限 / 迭代" value={`${settings.minEffectiveStressKpa.toFixed(1)} kPa / ${settings.iterationCount} 次`} />
          </>
        )}
      </section> : null}

      {slot && !editing && !schemeStale && !viewingHistoricalRevision && scheme?.status === 'current' ? <section className="query-card" data-testid="parameter-evidence-dock">
        <div className="query-card-heading"><h2>用于新运行的证据（按层）</h2><span className={`inline-state ${evidenceReady && !evidenceDirty ? 'ok' : 'warn'}`}>{evidenceDirty ? '有未保存修改' : evidenceConflict ? '冲突待解决' : evidenceReady ? '证据修订齐全' : '待确认'}</span></div>
        <label className="field-stack compact-field"><span>当前目标层</span><select value={selectedLayerId ?? ''} onChange={(event) => onSelectLayer(event.target.value)} data-testid="parameter-evidence-layer">{stratificationRevision?.snapshot.layers.filter((layer) => slot.targetScope.layerIds.includes(layer.layerId)).map((layer) => <option key={layer.layerId} value={layer.layerId}>{layer.name} / {layer.depthFromM.toFixed(2)}-{layer.depthToM.toFixed(2)} m</option>)}</select></label>
        <label className="field-stack compact-field"><span>贯入速率</span><select value={evidenceDraft.rateStatus} onChange={(event) => onUpdateEvidence((current) => ({ ...current, rateStatus: event.target.value as ParameterEvidenceDraft['rateStatus'] }))} data-testid="parameter-evidence-rate"><option value="standard_confirmed">标准 20 mm/s</option><option value="known_nonstandard">已知非标准</option><option value="missing">缺失</option></select></label>
        {evidenceDraft.rateStatus !== 'missing' ? <NumericDockField label="名义速率 mm/s" value={evidenceDraft.nominalRateMmPerSec ?? 20} step={1} onChange={(value) => onUpdateEvidence((current) => ({ ...current, nominalRateMmPerSec: value }))} testId="parameter-evidence-rate-value" /> : null}
        <label className="field-stack compact-field"><span>排水条件</span><select value={evidenceDraft.drainageStatus} onChange={(event) => onUpdateEvidence((current) => ({ ...current, drainageStatus: event.target.value as ParameterEvidenceDraft['drainageStatus'] }))} data-testid="parameter-evidence-drainage"><option value="confirmed_drained">已确认排水</option><option value="confirmed_undrained">已确认不排水</option><option value="unknown">未知</option><option value="conflict">冲突</option></select></label>
        <label className="field-stack compact-field"><span>材料适用性</span><select value={evidenceDraft.materialStatus} onChange={(event) => onUpdateEvidence((current) => ({ ...current, materialStatus: event.target.value as ParameterEvidenceDraft['materialStatus'] }))} data-testid="parameter-evidence-material"><option value="within_source_scope">在来源范围内</option><option value="scope_unknown">范围未知</option><option value="known_extrapolation">已知外推</option><option value="outside_scope">超出范围</option></select></label>
        {evidenceDraft.materialStatus !== 'scope_unknown' ? <label className="field-stack compact-field"><span>材料类别（显式证据）</span><select value={evidenceDraft.materialClass} onChange={(event) => onUpdateEvidence((current) => ({ ...current, materialClass: event.target.value }))} data-testid="parameter-evidence-material-class"><option value="unknown">请选择</option>{slot.parameterKey === 'PhiDeg' ? <option value="quartz_silica_uncemented_sand">未胶结石英质/硅质砂</option> : <option value="soft_firm_nc_loc_intact_clay">软至中等强度、NC-LOC 原状黏土</option>}</select></label> : null}
        {slot.parameterKey === 'SuKpa' ? (
          <>
            <PropertyRow label="Nkt 来源" value={slot.settings.kind === 'suc_qnet_nkt_v1' && slot.settings.nktByLayer.every((item) => item.setting.origin === 'literature_starting_assumption') ? '文献起始假设 / 方案修订已冻结' : '场地标定 / 方案修订已冻结'} />
            <PropertyRow label="当前 Nkt" value={slot.settings.kind === 'suc_qnet_nkt_v1' ? [...new Set(slot.settings.nktByLayer.map((item) => item.setting.value))].join(', ') : '—'} />
          </>
        ) : null}
        {evidenceConflict ? <p className="inline-problem" data-testid="parameter-evidence-conflict-problem">当前排水证据存在冲突。请选择明确的排水结论并保存新修订后，才能运行方法。</p> : !evidenceReady && evidenceProblem ? <p className="short-note">{evidenceProblem}</p> : null}
        <button type="button" className="toolbar-button dock-action" onClick={onConfirmEvidence} data-testid="confirm-parameter-evidence"><CheckCircle2 size={14} />{evidenceConflict ? '保存冲突解决修订' : evidenceReady ? '保存为新修订' : '确认证据'}</button>
      </section> : null}

      {slot && !editing ? <section className="query-card" data-testid="parameter-run-dock">
        <div className="query-card-heading"><h2>运行记录</h2><span>{runs.length}</span></div>
        {viewingHistoricalRevision ? <p className="short-note" data-testid="parameter-history-revision-note">正在只读查看旧方案修订；曲线、分层和证据均来自该次运行快照。</p> : null}
        {!allEvidenceReady ? <p className="short-note">全部目标层证据修订齐全后，页头会提供运行方法动作。</p> : evidenceDirty ? <p className="short-note">请先保存当前证据修改，再运行方法。</p> : null}
        {openRun ? <button type="button" className="toolbar-button dock-action" onClick={onCancelRun} data-testid="cancel-parameter-run"><X size={14} />取消运行</button> : null}
        <div className="parameter-run-history-list">
          {runs.map((run) => {
            const revision = workspace.revisions.find((candidate) => candidate.revisionId === run.schemeRevisionId);
            return <button type="button" key={run.runId} className={run.runId === selectedRun?.runId ? 'selected' : ''} onClick={() => onSelectRun(run.runId)} data-testid={`parameter-run-history-${run.runId}`}><span><strong>{run.methodId.includes('Phi') ? 'φ′p' : 'suc'} / v{revision?.version ?? '?'}</strong><em>{parameterRunStatusLabel(run.status)}</em></span><small>{run.completedAt ?? run.createdAt}</small></button>;
          })}
          {!runs.length ? <p className="short-note">当前方法还没有运行历史。</p> : null}
        </div>
      </section> : null}

      {inspectedRow ? <section className="query-card" data-testid="parameter-row-inspector">
        <div className="query-card-heading"><h2>选中数据行</h2><span>{inspectedRow.depthM.toFixed(2)} m</span></div>
        <PropertyRow label="地层" value={inspectedLayer?.name ?? '未归层'} />
        <PropertyRow label="Qtn / IcRW" value={`${inspectedRow.qtn?.toFixed(2) ?? '—'} / ${inspectedRow.ic?.toFixed(2) ?? '—'}`} />
        <PropertyRow label="结果状态" value={inspectedValue ? parameterValueStatusLabel(inspectedValue.status) : slot?.targetScope.layerIds.includes(inspectedLayer?.layerId ?? '') ? '目标层无结果' : '非目标层'} />
        {inspectedValue?.reasonCodes.length ? <p className="short-note">{inspectedValue.reasonCodes.map((code) => parameterReasonSummary(code)).join('；')}</p> : null}
        <div className="dock-button-row"><button type="button" className="toolbar-button" onClick={onShowIssues}><ListChecks size={14} />查看问题详情</button><button type="button" className="toolbar-button" onClick={onLocateSourceRow}><FileInput size={14} />定位来源行</button></div>
        <details><summary>技术标识</summary><code>{inspectedRow.sourceRowId}</code>{inspectedValue?.reasonCodes.map((code) => <code key={code}>{code}</code>)}</details>
      </section> : null}

      {commandProblem ? <section className="query-card parameter-command-problem" data-testid="parameter-command-problem"><div className="query-card-heading"><h2>当前问题</h2></div><p>{commandProblem}</p></section> : null}
    </RightPanelShell>
  );
}

function NumericDockField({ label, value, step, onChange, testId }: { label: string; value: number; step: number; onChange: (value: number) => void; testId: string }) {
  return <label className="field-stack compact-field"><span>{label}</span><input type="number" value={value} step={step} onChange={(event) => onChange(Number(event.target.value))} data-testid={testId} /></label>;
}

function OutputRightPanel({ runtime, ready, sourceLabel, classificationLabel, revisions, generationKind, onGenerate, onDownload }: { selectedItem: OutputItem | null; runtime: OutputRuntimeSummary; ready: boolean; sourceLabel: string; classificationLabel: string; revisions: JtsOutputRevisionV7[]; generationKind: JtsOutputRevisionV7['kind'] | null; onGenerate: (kind: JtsOutputRevisionV7['kind']) => void; onDownload: (revision: JtsOutputRevisionV7) => void }) {
  const [kind, setKind] = useState<JtsOutputRevisionV7['kind']>('a3-atlas-pdf');
  const currentRevisions = revisions.filter((revision) => revision.status === 'current');
  const current = [...revisions].reverse().find((revision) => revision.kind === kind && revision.status === 'current') ?? null;
  const latestCurrent = [...currentRevisions].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
  const historyHeading = currentRevisions.length === 0 && revisions.length > 0 ? '历史成果文件' : currentRevisions.length === revisions.length ? '当前成果文件' : '成果文件';
  const generating = generationKind !== null;
  const partialScope = runtime.parameterScopeConfirmed && runtime.parameterScopeExcludedMethodLabels.length > 0;
  return (
    <RightPanelShell title="成果工具" eyebrow="生成与下载" showTabs={false}>
      <section className="query-card inspector-primary" data-testid="output-generation-tool">
        <div className="query-card-heading">
          <h2>生成当前成果包</h2>
          <span data-testid="output-generation-status">{ready ? partialScope ? '部分成果条件已满足' : '条件已满足' : '待补全'}</span>
        </div>
        <label className="field-stack compact-field"><span>PDF 版式</span><select value={kind} disabled={generating} onChange={(event) => setKind(event.target.value as JtsOutputRevisionV7['kind'])} data-testid="output-kind"><option value="a3-atlas-pdf">A3 横版专业图册（推荐）</option><option value="a4-report-pdf">A4 竖版简报</option><option value="excel-workbook" hidden>Excel 优先下载</option></select></label>
        <PropertyRow label="一次生成" value="PDF + Excel" />
        <div data-testid="output-source-scheme"><PropertyRow label="报告来源方案" value={sourceLabel} /><p className="short-note">当前参数试算只对应这一份已确认分层。</p></div>
        <PropertyRow label="分类方法" value={classificationLabel} />
        {runtime.parameterScopeConfirmed ? <PropertyRow label="参数范围" value={`纳入 ${runtime.parameterScopeIncludedMethodLabels.length} 项${partialScope ? `；${runtime.parameterScopeExcludedMethodLabels.length} 项本阶段不纳入` : '；无排除项'}`} /> : null}
        <PropertyRow label="声明" value="原型成果 / 非设计值" />
        <PropertyRow label="当前成果" value={latestCurrent ? latestCurrent.createdAt.replace('T', ' ').slice(0, 19) : revisions.length ? '需要重新生成' : '尚未生成'} />
        <button type="button" className={`toolbar-button dock-action${current ? '' : ' primary'}`} disabled={!ready || generating} onClick={() => onGenerate(kind)} data-testid="generate-output">{generating ? generationKind === 'excel-workbook' ? '正在生成参数表和地层图…' : '正在生成 PDF 和 Excel…' : current ? '重新生成并覆盖当前成果' : '生成 PDF 和 Excel'}</button>
      </section>

      <section className="query-card" data-testid="output-history">
        <div className="query-card-heading">
          <h2>{historyHeading}</h2><span>{revisions.length} 个</span>
        </div>
        {revisions.length ? revisions.map((revision) => <button type="button" className="output-history-item" key={revision.revisionId} disabled={generating} aria-label={`下载 ${revision.fileName}`} onClick={() => onDownload(revision)} data-testid={`download-output-${revision.kind}`}><span>{revision.kind === 'a4-report-pdf' ? 'A4 PDF' : revision.kind === 'a3-atlas-pdf' ? 'A3 PDF' : 'Excel'}</span><strong>{revision.status === 'current' ? '当前 · 下载' : '历史 · 下载'}</strong><small>{revision.fileName}</small><small>{revision.status === 'current' ? '生成于' : '需要更新 · 原生成于'} {revision.createdAt.replace('T', ' ').slice(0, 19)}</small></button>) : <p className="short-note">生成后显示一份 PDF 和一份 Excel；再次生成会直接覆盖。</p>}
      </section>
    </RightPanelShell>
  );
}

function GenericRightPanel({ route, pointName }: { route: RouteId; pointName: string }) {
  const content: Record<RouteId, Array<[string, string]>> = {
    project: [
      ['点位', pointScope(pointName)],
      ['点位数量', '5'],
      ['CPTU 记录', '16,653'],
      ['导入核对', '字段映射'],
    ],
    import: [
      ['导入源', '通用合成 CPTU 样例表'],
      ['字段映射', '已读取'],
      ['预览行数', '4,282'],
      ['检查动作', '运行数据检查'],
    ],
    check: [
      ['检查状态', '无问题'],
      ['问题', '0'],
      ['提示', '2'],
      ['分层对象', '地层分层'],
    ],
    stratification: [],
    parameters: [
      ['输入状态', '分层需确认'],
      ['解译试算', '可以'],
      ['成果整理', '需确认'],
      ['复核对象', '地层分层'],
    ],
    output: [
      ['生成条件', '待补全'],
      ['缺失项', '分层 / 参数方案确认'],
      ['生成状态', '需确认'],
      ['核对对象', '参数解译'],
    ],
  };

  return (
    <RightPanelShell title={routeTitle[route]} eyebrow="属性">
      <section className="property-group">
        <h2>对象</h2>
        {content[route].map(([label, value]) => (
          <PropertyRow key={label} label={label} value={value} />
        ))}
      </section>
    </RightPanelShell>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="property-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SupportingDocument({ route }: { route: RouteId }) {
  const view = {
    project: {
      title: '项目/点位数据',
      lead: `${projectName} / ${pointScope(projectContext.pointName)} 已有 CPTU 样例数据，可核对导入和数据检查。`,
      icon: Database,
      rows: [
        ['测点', '5'],
        ['CPTU 记录', '16,653'],
        ['深度范围', '0.01-60.76 m'],
        ['阶段', '3 / 6'],
      ],
      checklist: ['工程范围已选定', '点位数据可读取', '字段映射待核对'],
    },
    import: {
      title: '数据导入',
      lead: '可解析 CSV/XLSX，核对字段、单位与点位归属后生成待检查草稿。',
      icon: FileInput,
      rows: [
        ['导入批次', '通用合成 CPTU 样例表'],
        ['字段映射', '已读取'],
        ['预览', '4,282 行'],
        ['检查动作', '数据检查'],
      ],
      checklist: ['源文件保持不变', '字段与单位需要确认', '确认后进入数据检查'],
    },
    check: {
      title: '数据检查',
      lead: '当前样例无问题，保留 2 条提示供底部面板查看。',
      icon: CheckCircle2,
      rows: [
        ['问题', '0'],
        ['提示', '2'],
        ['状态', '无问题'],
        ['分层对象', '地层分层'],
      ],
      checklist: ['数据检查无问题', '提示保留待复核', '可继续到分层工作台'],
    },
    stratification: {
      title: '地层分层',
      lead: '',
      icon: Layers,
      rows: [],
      checklist: [],
    },
    parameters: {
      title: '参数解译',
      lead: '参数解译试算可用于检查输入和方法条件；成果整理前需要核对。',
      icon: TableProperties,
      rows: [
        ['分层输入', '只读样例'],
        ['解译试算', '可查看'],
        ['成果整理', '需确认'],
        ['复核对象', '地层分层'],
      ],
      checklist: ['可检查试算入口', '成果整理前需确认', '输出前需要核对参数方案'],
    },
    output: {
      title: '成果输出',
      lead: '成果输出用于核对成果清单、前置事项和生成条件。',
      icon: PackageCheck,
      rows: [
        ['分层成果', '需确认'],
        ['参数成果', '需确认'],
        ['清单状态', '待补全'],
        ['生成状态', '需确认'],
      ],
      checklist: ['成果清单需补全', '候选和草案不直接进入成果', '生成前需确认'],
    },
  }[route];
  const Icon = view.icon;

  return (
    <div className="supporting-document pro-page" data-testid={`document-${route}`}>
      <header className="pro-page-header">
        <div className="pro-breadcrumb">工程工作台 / {view.title}</div>
        <div className="supporting-title-row">
          <div className="supporting-icon">
            <Icon className="icon" />
          </div>
          <div className="supporting-header">
            <h1>{view.title}</h1>
            <p>{view.lead}</p>
          </div>
        </div>
      </header>
      <div className="facts-grid">
        {view.rows.map(([label, value]) => (
          <div className="fact-cell" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="plain-section pro-panel">
        <div className="section-header">
          <div>
            <h2>工作台边界</h2>
            <span>用于核对阶段状态、前置关系和原型边界</span>
          </div>
        </div>
        <div className="checklist">
          {view.checklist.map((item) => (
            <span key={item}>
              <CheckCircle2 className="mini-icon" />
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function createUiIdentifier() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parameterWorkspaceStatusLabel(status: string) {
  return ({ working: '编辑中', current: '当前', history: '历史', stale: '已失效', deleted: '已删除' } as Record<string, string>)[status] ?? status;
}

function customFormulaStatusLabel(status: string) {
  return ({ working: '编辑中', current: '当前', stale: '已失效', deleted: '已删除' } as Record<string, string>)[status] ?? status;
}

function customFormulaDisplaySlot(formula: CustomFormulaDefinitionV1 | null, run: CustomFormulaRunV1 | null) {
  if (!formula && !run) return null;
  return {
    symbol: run?.symbolSnapshot ?? formula?.symbol ?? '自定义值',
    unit: run?.unitSnapshot ?? formula?.unit ?? '用户声明',
    methodLabel: '受限自定义公式',
    targetLayerIds: [...(run?.targetLayerIdsSnapshot ?? formula?.targetLayerIds ?? [])],
    resultColor: '#2abf9a',
    previousResultColor: '#bdadff',
  };
}

function customFormulaDisplayRun(run: CustomFormulaRunV1 | null) {
  if (!run) return null;
  return {
    runId: run.runId,
    status: run.status,
    values: run.values.map((value) => ({
      sourceRowId: value.sourceRowId,
      depthM: value.depthM,
      value: value.value,
      eligibleForCurrentResult: value.eligibleForCurrentResult,
      statusLabel: ({ valid: '当前可用', missing_input: '输入缺失', not_target: '非目标层', numeric_problem: '数值问题', out_of_range: '超出声明范围' } as Record<string, string>)[value.status] ?? value.status,
      tone: value.status === 'valid' ? 'ok' as const : value.status === 'not_target' ? 'neutral' as const : 'warn' as const,
    })),
    layerSummaries: run.layerSummaries,
    summary: run.summary ? { rowCount: run.summary.rowCount, eligibleValueCount: run.summary.validCount, trialOnlyValueCount: 0, problemValueCount: run.summary.missingInputCount + run.summary.numericProblemCount + run.summary.outOfRangeCount } : null,
    issues: run.issues,
    targetLayerIds: [...run.targetLayerIdsSnapshot],
  };
}

function customFormulaWorkbenchStatus(formula: CustomFormulaDefinitionV1 | null, run: CustomFormulaRunV1 | null, hasDerivation: boolean, stale: boolean, editing: boolean, historical: boolean) {
  if (!hasDerivation) return { label: '待推导', tone: 'status-warning', title: '先完成参数前置推导', detail: '自定义公式只读取已经冻结的参数前置推导行。' };
  if (!formula) return { label: '待建立', tone: 'status-muted', title: '新建受限自定义公式', detail: '定义表达式、用户声明单位和目标层后提交不可变修订。' };
  if (stale) return { label: '已失效', tone: 'status-warning', title: '当前公式仅供历史查看', detail: '参数或分层来源已经变化，请基于最新来源复制公式。' };
  if (editing) return { label: '编辑中', tone: 'status-warning', title: '公式草稿尚未提交', detail: '完成表达式验证、目标层和结果范围后提交公式修订。' };
  if (historical && run) return { label: '历史运行', tone: 'status-muted', title: `正在查看公式 v${run.formulaVersion} 的冻结运行`, detail: '曲线、表达式和输入来自该次只读快照；页头动作会运行当前公式。' };
  if (!run) return { label: '待运行', tone: 'status-muted', title: '公式修订已提交', detail: '运行后将在共享深度轴生成自定义结果曲线。' };
  if (run.status !== 'completed') return { label: parameterRunStatusLabel(run.status), tone: 'status-warning', title: `公式运行${parameterRunStatusLabel(run.status)}`, detail: ['cancelled', 'failed', 'invalidated'].includes(run.status) ? '终态记录已保留，可从当前有效公式重新运行。' : '运行处理中，可在右侧取消。' };
  const missingInputCount = run.summary?.missingInputCount ?? 0;
  const numericProblemCount = (run.summary?.numericProblemCount ?? 0) + (run.summary?.outOfRangeCount ?? 0);
  const problemCount = missingInputCount + numericProblemCount;
  return { label: problemCount ? '存在问题' : '已完成', tone: problemCount ? 'status-warning' : 'status-success', title: `${run.symbolSnapshot} 曲线已生成`, detail: `${run.summary?.validCount ?? 0} 个当前可用值，${missingInputCount} 个缺失输入，${numericProblemCount} 个数值或范围问题。` };
}

function parameterRunStatusLabel(status: string) {
  return ({ queued: '等待', running: '计算中', 'cancel-requested': '取消中', completed: '已完成', failed: '失败', cancelled: '已取消', invalidated: '已失效' } as Record<string, string>)[status] ?? status;
}

function parameterValueStatusLabel(status: string) {
  return ({ Valid: '当前方法可用', ValidWithNotice: '可用，有提示', ApplicabilityUnconfirmed: '适用性未确认', NotApplicable: '不适用', InvalidInput: '输入无效', InvalidMethodParameter: '方法参数无效' } as Record<string, string>)[status] ?? status;
}

function parameterReasonSummary(code: string) {
  if (code.includes('Valid')) return '当前行满足方法条件';
  if (code.includes('Missing')) return '缺少必要输入或证据';
  if (code.includes('Conflict')) return '土组、行为筛选或排水证据存在冲突';
  if (code.includes('Outside') || code.includes('Extrapolation')) return '超出或外推至方法来源范围';
  if (code.includes('Invalid') || code.includes('NonFinite') || code.includes('NonPositive')) return '当前行包含无效方法输入';
  return '请在问题详情中查看具体条件';
}

function parameterRateEvidenceLabel(status: string) {
  return ({ standard_confirmed: '标准速率已确认', known_nonstandard: '已知非标准速率', missing: '速率缺失' } as Record<string, string>)[status] ?? status;
}

function parameterDrainageEvidenceLabel(status: string, resolvedAs?: string) {
  if (status === 'resolved_conflict') return `冲突已解决为${resolvedAs === 'confirmed_undrained' ? '不排水' : '排水'}`;
  return ({ confirmed_drained: '已确认排水', confirmed_undrained: '已确认不排水', unknown: '未知', conflict: '存在冲突' } as Record<string, string>)[status] ?? status;
}

function parameterMaterialEvidenceLabel(status: string) {
  return ({ within_source_scope: '在来源范围内', scope_unknown: '范围未知', known_extrapolation: '已知外推', engineer_confirmed_extrapolation: '工程师已确认外推', outside_scope: '超出来源范围' } as Record<string, string>)[status] ?? status;
}

function parameterMaterialClassLabel(materialClass: string) {
  return ({ quartz_silica_uncemented_sand: '未胶结石英质/硅质砂', soft_firm_nc_loc_intact_clay: '软至中等强度、NC-LOC 原状黏土', unknown: '材料类别未知' } as Record<string, string>)[materialClass] ?? materialClass;
}

function classificationNativeCode(soilClassId: string, zone: number) {
  if (soilClassId.startsWith('fuzzy-')) return soilClassId.slice('fuzzy-'.length).toUpperCase();
  if (soilClassId.startsWith('robertson-2016-')) return soilClassId.slice('robertson-2016-'.length).toUpperCase();
  if (soilClassId.startsWith('schneider-2008-')) return soilClassId.slice('schneider-2008-'.length);
  return `Zone ${zone}`;
}

function classificationMethodReference(methodId: ClassificationMethodIdV1) {
  const references: Record<ClassificationMethodIdV1, string> = {
    'jts-t242-2020': 'JTS/T 242—2020《水运工程静力触探技术规程》',
    'fuzzy-zhang-tumay-1999': 'Zhang & Tumay (1999), Statistical to Fuzzy Approach Toward CPT Soil Classification',
    'modified-robertson-2016': 'Robertson (2016), Cone penetration test (CPT)-based soil behaviour type (SBT) classification system',
    'schneider-2008': 'Schneider et al. (2008), Analysis of factors influencing soil classification using normalized piezocone tip resistance and pore pressure parameters',
  };
  return references[methodId];
}

function parameterFormulaReference(
  methodId: JtsParameterMethodIdV5,
  settings: JtsParameterPackageSettingsV5,
  dissipation?: JtsOutputSnapshotV7['dissipation'],
) {
  const meta = JTS_PARAMETER_METHOD_META[methodId];
  const formulas: Record<JtsParameterMethodIdV5, [string, string]> = {
    jts_gamma_sat: ['γsat=17.71·[qt(MPa)]^0.066；qt>30 MPa 时取 22 kN/m³', 'JTS/T 242—2020 7.2.2；适用 Zone 1–9'],
    jts_su_nkt: [`Su=qnet/Nkt；本次 Nkt=${settings.nktValue ?? '未确认'}`, `JTS/T 242—2020 7.2.4；目标试验=${settings.nktTargetTestType ?? '未确认'}；来源=${settings.nktSourceType ?? '未确认'}；来源修订=${settings.nktSourceRevisionId ?? '未确认'}；确认时间=${settings.nktConfirmedAt ?? '未确认'}`],
    jts_phi_fine: ['φ′=3.65·ln[qnet(MPa)]+27.1', 'JTS/T 242—2020 7.2.5；适用 Zone 7'],
    jts_phi_coarse: ['φ′=3.3·ln[qnet(MPa)]+29.5', 'JTS/T 242—2020 7.2.5；适用 Zone 8–9'],
    jts_relative_density: ['Dr={31.78·ln[qt(MPa)]-13.98}/100', 'JTS/T 242—2020 7.2.3；适用 Zone 7–9'],
    jts_ocr: [`OCR=kOCR·Qt(-)；本次 kOCR=${settings.ocrCoefficient}`, 'JTS/T 242—2020 7.2.6；适用 Zone 1–5'],
    jts_sensitivity: [`St=Ns/Fr(%)；本次 Ns=${settings.sensitivityCoefficient}`, 'JTS/T 242—2020 7.2.7；适用 Zone 1–5'],
    jts_compression_modulus: ['Es(MPa)=3.61·[qnet(MPa)]^0.56（qnet≤3.4 MPa）；Es(MPa)=0.47·[qnet(MPa)]^2.23（3.4<qnet≤5 MPa）', 'JTS/T 242—2020 7.2.8；适用 Zone 1–5'],
    jts_compression_index: ['Cc=1.05·[Qt(-)]^-0.4', 'JTS/T 242—2020 7.2.9；适用 Zone 1–5'],
    jts_shear_wave_velocity: ['Vs(m/s)=157.39·[qt(MPa)]^0.39（Zone 1–6）；Vs(m/s)=208.83·[qt(MPa)]^0.13（Zone 7–9）', 'JTS/T 242—2020 7.2.10'],
    jts_spt_n: ['N=0.075·qt(kPa)·[Ic(-)]²/pa(kPa)，pa=100 kPa', 'JTS/T 242—2020 7.2.13；适用 Zone 1–9'],
    jts_dissipation_ch_kh: [
      dissipation
        ? `G0=γsat·Vs²/9.81；Ir=G0/Su=${dissipation.rigidityIndex?.toFixed(3) ?? '—'}；Ch=[0.245·1.785²·√Ir/t50]×10^-4 m²/s；kh=[(25·Ir·t50)^-1.25]×10^-2 m/s；t50=${dissipation.t50Seconds}s`
        : 'G0=γsat·Vs²/9.81；Ir=G0/Su；Ch=[0.245·1.785²·√Ir/t50]×10^-4 m²/s；kh=[(25·Ir·t50)^-1.25]×10^-2 m/s',
      dissipation ? `消散试验修订 ${dissipation.testRevisionId}；t50 来源 ${dissipation.t50Origin}` : '当前孔压消散试验修订',
    ],
    manual_silt_phi: [`φ′=${settings.siltManualValue ?? '未录入'}°`, settings.siltManualSource || '工程师人工输入'],
    manual_silt_su: [`Su=${settings.siltManualValue ?? '未录入'} kPa`, settings.siltManualSource || '工程师人工输入'],
  };
  const [formula, reference] = formulas[methodId];
  return {
    methodId,
    symbol: meta.symbol,
    formula,
    reference: methodId.startsWith('jts_')
      ? `JTS/T 242—2020《水运工程静力触探技术规程》；${reference}`
      : reference,
  };
}

function excelExtractionOriginLabel(origin: NonNullable<SourceColumnV2['extractionOrigin']>) {
  return {
    'source-cell': '工作表原始单元格',
    'workbook-calculated-cell': '工作簿计算缓存值',
    'application-derived': '应用重建值',
    mixed: '工作簿值与应用重建值混合',
    metadata: '工作簿元数据',
    missing: '缺失',
  }[origin];
}

function outputStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Adopted: '只读引用',
    Completed: '已完成',
    Preview: '预览',
    PreviewOnly: '仅预览',
    NeedsConfirmation: '需确认',
    Current: '当前',
    NotConfigured: '可选 · 未配置',
    Excluded: '已排除',
    Problem: '存在问题',
    ScopeConfirmed: '范围已确认',
  };
  return labels[status] ?? status;
}

function outputItemNote(item: OutputItem) {
  if (item.note) return item.note;
  const labels: Record<string, string> = {
    成果包结构预览: '成果包结构预览，仅用于检查页面展示。',
    成果包索引: '成果包结构引用，用于清单核对。',
    分层成果引用: '分层结果进入成果清单前需要确认。',
    参数成果引用: '参数结果进入成果清单前需要确认。',
    数据检查记录: '数据检查记录用于说明输入数据状态。',
    排除项: '候选、调试和中间对象不直接进入成果清单。',
  };
  return labels[item.label] ?? '当前项用于成果清单核对。';
}

export default App;
