import stratificationBundleJson from '../sample_data/stratification/yingkou-cpt09-layer-scheme-bundle.v1.json';
import parameterBundleJson from '../sample_data/parameters/yingkou-cpt09-parameter-scheme-bundle.v1.json';
import outputPackageJson from '../sample_data/output/adopted-output-package.v1.json';
import methodInputJson from '../sample_data/method-lab/yingkou-cpt09-method-input.v1.json';
import badMissingColumnsJson from '../sample_data/method-lab/bad-missing-columns.v1.json';
import badNonmonotonicDepthJson from '../sample_data/method-lab/bad-nonmonotonic-depth.v1.json';
import badNonpositiveLogInputsJson from '../sample_data/method-lab/bad-nonpositive-log-inputs.v1.json';

export type RouteId =
  | 'project'
  | 'import'
  | 'check'
  | 'stratification'
  | 'parameters'
  | 'output';

export type BottomTab = 'issues' | 'log' | 'exports';

export type Layer = {
  layerId: string;
  layerNo: number;
  depthFromM: number;
  depthToM: number;
  thicknessM: number;
  engineeringSoilGroup: string;
  soilClassLabel: string;
  soilClassConfidence?: string;
  sourceType: string;
  uncertaintyKind: string;
  parameterApplicability: string[];
};

export type Boundary = {
  boundaryId: string;
  depthM: number;
  boundaryType: string;
  upperLayerId?: string | null;
  lowerLayerId?: string | null;
  reviewRequired: boolean;
  evidenceRefs?: string[];
};

export type EvidenceRef = {
  evidenceRefId: string;
  evidenceType: string;
  depthFromM: number;
  depthToM: number;
  summary: string;
};

export type ClassificationEvidencePoint = {
  pointEvidenceId: string;
  depthM: number;
  label: string;
  x: number;
  y: number;
  engineeringSoilGroup: string;
  linkedLayerIds: string[];
};

export type ClassificationEvidence = {
  axisDefinition: {
    x: string;
    y: string;
  };
  units: {
    x: string;
    y: string;
  };
  points: ClassificationEvidencePoint[];
};

export type Scheme = {
  schemeId: string;
  name: string;
  status: string;
  sourceType: string;
  projectionOnly: boolean;
  modifiedAt: string;
  layers: Layer[];
  boundaries: Boundary[];
  preflight: {
    coverageStatus: string;
    canUseForTrialParameterRun: boolean;
    canUseForOfficialParameterRun: boolean;
    blockingMessages: string[];
    warningMessages: string[];
    reviewRequiredDepths: string[];
  };
};

export type PointContext = {
  projectId: string;
  projectName: string;
  pointId: string;
  pointName: string;
  dataVersion: string;
  depthUnit: string;
  createdAt: string;
};

export type StratificationBundle = {
  schemaVersion: string;
  projectionOnly: boolean;
  pointContext: PointContext;
  sourceData: {
    officialWriteAllowed: boolean;
  };
  layerSchemes: Scheme[];
  classificationEvidence: ClassificationEvidence[];
  evidenceRefs: EvidenceRef[];
};

export type ParameterSlot = {
  slotId: string;
  parameterKey: string;
  parameterSymbol: string;
  unit: string;
  validationState: string;
  runState: string;
  selectedMethodId: string;
  blockingReasons: string[];
  warningReasons: string[];
  targetLayerFilter?: {
    engineeringSoilGroups?: string[];
    layerIds?: string[];
    requiresReview?: boolean;
  };
};

export type ParameterScheme = {
  parameterSchemeId: string;
  name: string;
  status: string;
  mode: string;
  projectionOnly: boolean;
  sourceLayerSchemeId: string;
  sourceLayerSchemeStatus: string;
  parameterSlots: ParameterSlot[];
  resultSeries: Array<{
    seriesId: string;
    slotId: string;
    parameterKey: string;
    unit: string;
    points: Array<{ depthM: number; value: number; status: string; sourceLayerId?: string }>;
    invalidIntervals?: Array<{ depthFromM: number; depthToM: number; status: string; message: string }>;
  }>;
  preflight: {
    canRunTrial: boolean;
    canSaveOfficial: boolean;
    canExport: boolean;
    blockingMessages: string[];
    warningMessages: string[];
  };
};

export type ParameterBundle = {
  schemaVersion: string;
  projectionOnly: boolean;
  pointContext: PointContext;
  parameterSchemes: ParameterScheme[];
  preflight: {
    sourceLayerSchemeCanTrial: boolean;
    sourceLayerSchemeCanOfficial: boolean;
    canRunTrial: boolean;
    canSaveOfficial: boolean;
    canExport: boolean;
    blockingMessages: string[];
    warningMessages: string[];
  };
};

export type OutputPreflightItem = {
  key: string;
  state: string;
  severity: string;
  evidence: string;
  nextAction: string;
};

export type OutputPackage = {
  schemaVersion: string;
  packageId: string;
  status: string;
  officialUseAllowed: boolean;
  exportAllowed: boolean;
  preflight: OutputPreflightItem[];
  reportManifestProjection: {
    exportInputs: Array<{ objectType: string; objectId: string; status?: string }>;
    blockedDirectInputs: string[];
  };
};

export type MethodInput = {
  projectId: string;
  projectName: string;
  testPointId: string;
  testPointName: string;
  createdAt: string;
  waterDepthM: number;
  sourceImportFiles: Array<{ fileName: string }>;
  rows: Array<{
    depthM: number;
    qcKpa: number;
    qtKpa: number;
    sleeveKpa: number;
    u2Kpa: number;
    frPercent: number;
    qtn: number;
  }>;
};

export type WorkflowRouteMeta = {
  id: RouteId;
  label: string;
  stage: number;
  status: string;
  shortGoal: string;
  nextRoute?: RouteId;
};

export type WorkflowSelectionState = {
  activeRoute: RouteId;
  activeBottomTab: BottomTab;
  selectedProjectId: string;
  selectedPointId: string;
  selectedImportBatchId: string;
  selectedCheckIssueId: string;
  selectedSchemeId: string;
  selectedLayerId: string;
  selectedBoundaryId: string;
  selectedParameterSchemeId: string;
  selectedParameterSlotId: string;
  selectedOutputItemId: string;
};

export type CheckIssue = {
  issueId: string;
  title: string;
  severity: 'blocking' | 'warning' | 'passed';
  route: RouteId;
  source: string;
  detail: string;
  nextAction: string;
  fieldName?: string;
  depthFromM?: number;
  depthToM?: number;
  rowIndexFrom?: number;
  rowIndexTo?: number;
  sourceRowId?: string;
  workflowImpact?: string;
  evidenceScope?: 'single-row' | 'depth-range' | 'profile-wide' | 'point-context';
  evidenceGroupKey?: string;
};

export type ImportFieldMapping = {
  sourceField: string;
  targetField: string;
  status: 'matched' | 'warning';
  note: string;
};

export type OutputItem = {
  itemId: string;
  label: string;
  status: string;
  note: string;
};

export type ImportPreviewRow = {
  depthM: number;
  qcKpa: number;
  qtKpa: number;
  fsKpa: number;
  u2Kpa: number;
  frPercent: number;
};

export type ProjectPointSummary = {
  projectName: string;
  projectId: string;
  pointName: string;
  pointAlias: string;
  pointScope: string;
  dataVersion: string;
  createdAt: string;
  sourceDepthRange: string;
  previewDepthRange: string;
  previewRecordCount: number;
  sourceRecordCount: string;
  totalPointCount: number;
  waterDepthM: number;
  finalDepthM: number;
  sourceFiles: string[];
  sourceType: string;
  caseId?: string;
  seed?: string;
  generatedAt?: string;
  availablePoints: Array<{
    pointId: string;
    pointName: string;
    alias: string;
    status: string;
    recordCount: string;
    depthRange: string;
  }>;
};

export type SyntheticCptuRow = ImportPreviewRow & {
  pointName: string;
  waterDepthM: number;
  finalDepthM: number;
};

export type SyntheticFlowCase = {
  flowId: 'flow-1-data-prep-check';
  scenario: 'valid-with-notice';
  seed: string;
  caseId: string;
  generatedAt: string;
  sourceType: 'synthetic-csv' | 'synthetic-excel' | 'synthetic-paste';
  project: {
    projectId: string;
    projectName: string;
  };
  point: {
    pointId: string;
    pointName: string;
    pointAlias: string;
    waterDepthM: number;
    finalDepthM: number;
  };
  importBatch: {
    batchId: string;
    batchName: string;
  };
  rows: SyntheticCptuRow[];
};

export const SAMPLE_POINT_ALIAS = 'CPT9-19-S1';

export const stratificationData = stratificationBundleJson as StratificationBundle;
export const parameterData = parameterBundleJson as ParameterBundle;
export const outputData = outputPackageJson as OutputPackage;
export const methodInputData = methodInputJson as MethodInput;

export const projectContext = stratificationData.pointContext;
export const projectName = projectContext.projectName;
export const evidenceRefs = stratificationData.evidenceRefs;

export const workflowRoutes: WorkflowRouteMeta[] = [
  {
    id: 'project',
    label: '项目/点位数据',
    stage: 1,
    status: '就绪',
    shortGoal: '确认工程、点位和数据覆盖',
    nextRoute: 'import',
  },
  {
    id: 'import',
    label: '数据导入',
    stage: 2,
    status: '已读取',
    shortGoal: '核对样例导入批次和字段映射',
    nextRoute: 'check',
  },
  {
    id: 'check',
    label: '数据检查',
    stage: 3,
    status: '无问题',
    shortGoal: '区分问题、提示和可继续项',
    nextRoute: 'stratification',
  },
  {
    id: 'stratification',
    label: '地层分层',
    stage: 4,
    status: '只读样例',
    shortGoal: '复核层位、边界和 SBTn 示意证据',
    nextRoute: 'parameters',
  },
  {
    id: 'parameters',
    label: '参数解译',
    stage: 5,
    status: '试算边界',
    shortGoal: '检查参数试算候选和输入状态',
    nextRoute: 'output',
  },
  {
    id: 'output',
    label: '成果输出',
    stage: 6,
    status: '待补全',
    shortGoal: '查看成果清单和生成条件',
  },
];

export const routeTitle = Object.fromEntries(workflowRoutes.map((item) => [item.id, item.label])) as Record<
  RouteId,
  string
>;

export const layerSchemes = stratificationData.layerSchemes;
export const parameterSchemes = parameterData.parameterSchemes;

export function pointScope(pointName: string) {
  return `${pointName}（${SAMPLE_POINT_ALIAS}）`;
}

export function getDefaultWorkflowSelection(): WorkflowSelectionState {
  const selectedScheme = layerSchemes[0];
  const selectedParameterScheme = parameterSchemes[0];
  return {
    activeRoute: 'stratification',
    activeBottomTab: 'issues',
    selectedProjectId: projectContext.projectId,
    selectedPointId: projectContext.pointId,
    selectedImportBatchId: 'yingkou-cptu-sample-table',
    selectedCheckIssueId: getCheckIssues()[0]?.issueId ?? '',
    selectedSchemeId: selectedScheme?.schemeId ?? '',
    selectedLayerId: selectedScheme?.layers[0]?.layerId ?? '',
    selectedBoundaryId: selectedScheme?.boundaries.find((boundary) => boundary.reviewRequired)?.boundaryId ?? '',
    selectedParameterSchemeId: selectedParameterScheme?.parameterSchemeId ?? '',
    selectedParameterSlotId: selectedParameterScheme?.parameterSlots[0]?.slotId ?? '',
    selectedOutputItemId: getOutputItems()[0]?.itemId ?? '',
  };
}

export function selectLayerScheme(schemeId: string) {
  return layerSchemes.find((scheme) => scheme.schemeId === schemeId) ?? layerSchemes[0];
}

export function selectLayer(scheme: Scheme | undefined, layerId: string) {
  return scheme?.layers.find((layer) => layer.layerId === layerId) ?? scheme?.layers[0] ?? null;
}

export function selectBoundary(scheme: Scheme | undefined, boundaryId: string) {
  return scheme?.boundaries.find((boundary) => boundary.boundaryId === boundaryId) ?? null;
}

export function selectParameterScheme(parameterSchemeId: string) {
  return parameterSchemes.find((scheme) => scheme.parameterSchemeId === parameterSchemeId) ?? parameterSchemes[0];
}

export function selectParameterSlot(scheme: ParameterScheme | undefined, slotId: string) {
  return scheme?.parameterSlots.find((slot) => slot.slotId === slotId) ?? scheme?.parameterSlots[0] ?? null;
}

export function selectOutputItem(outputItemId: string) {
  return getOutputItems().find((item) => item.itemId === outputItemId) ?? getOutputItems()[0] ?? null;
}

export function getProjectPointSummary(): ProjectPointSummary {
  const depths = methodInputData.rows.map((row) => row.depthM);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  return {
    projectName,
    projectId: projectContext.projectId,
    pointName: projectContext.pointName,
    pointAlias: SAMPLE_POINT_ALIAS,
    pointScope: pointScope(projectContext.pointName),
    dataVersion: projectContext.dataVersion,
    createdAt: projectContext.createdAt,
    sourceDepthRange: '0.01-60.76 m',
    previewDepthRange: `${minDepth.toFixed(2)}-${maxDepth.toFixed(2)} m`,
    previewRecordCount: methodInputData.rows.length,
    sourceRecordCount: '4,291',
    totalPointCount: 3,
    waterDepthM: methodInputData.waterDepthM,
    finalDepthM: 60.76,
    sourceType: 'copied-sample',
    sourceFiles: ['CPT09数据.xlsx', 'CPT09班报表.xlsx'],
    availablePoints: [
      {
        pointId: 'CPT09',
        pointName: 'CPT09',
        alias: SAMPLE_POINT_ALIAS,
        status: '本轮样例',
        recordCount: '4,291',
        depthRange: '0.01-60.76 m',
      },
      {
        pointId: 'CPT19',
        pointName: 'CPT19',
        alias: SAMPLE_POINT_ALIAS,
        status: '样例档案',
        recordCount: '4,498',
        depthRange: '源资料可查',
      },
      {
        pointId: 'SCPT1',
        pointName: 'SCPT1',
        alias: SAMPLE_POINT_ALIAS,
        status: '样例档案',
        recordCount: '7,841',
        depthRange: '源资料可查',
      },
    ],
  };
}

export function getImportFieldMappings(): ImportFieldMapping[] {
  return [
    { sourceField: 'DepthM', targetField: '深度', status: 'matched', note: '用于分层、检查和参数试算深度索引' },
    { sourceField: 'Qc / Qt', targetField: '锥尖阻力', status: 'matched', note: '样例预览用于输入完整性核对' },
    { sourceField: 'Fs / Fr', targetField: '侧阻与摩阻比', status: 'matched', note: '用于 SBT/SBTn 示意证据参考' },
    { sourceField: 'U2', targetField: '孔压', status: 'matched', note: '用于后续参数试算输入状态展示' },
    { sourceField: 'WaterDepthM', targetField: '水深', status: 'warning', note: '样例值可读，成果生成前需确认' },
  ];
}

export function getImportPreviewRows(): ImportPreviewRow[] {
  return methodInputData.rows.map((row) => ({
    depthM: row.depthM,
    qcKpa: row.qcKpa,
    qtKpa: row.qtKpa,
    fsKpa: row.sleeveKpa,
    u2Kpa: row.u2Kpa,
    frPercent: row.frPercent,
  }));
}

export function createSyntheticFlowCase(seedInput: string | number): SyntheticFlowCase {
  const seed = normalizeSeed(seedInput);
  const random = seededRandom(seed);
  const suffix = seed.slice(-5).toUpperCase();
  const sourceTypes: SyntheticFlowCase['sourceType'][] = ['synthetic-csv', 'synthetic-excel', 'synthetic-paste'];
  const sourceType = sourceTypes[Math.floor(random() * sourceTypes.length)] ?? 'synthetic-csv';
  const rowCount = 32 + Math.floor(random() * 29);
  const finalDepthM = round1(18 + random() * 34);
  const waterDepthM = round1(1.2 + random() * 28);
  const pointName = `AUTO-CPTU-${suffix}`;
  const projectName = `${['北海', '东海', '南海'][Math.floor(random() * 3)] ?? '北海'}合成场址 ${Math.floor(random() * 90 + 10)}`;
  const depthStep = finalDepthM / (rowCount + 2);
  const rows: SyntheticCptuRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const depthM = round3((index + 1) * depthStep);
    const trend = index / Math.max(1, rowCount - 1);
    const qcKpa = round1(900 + random() * 260 + trend * 2100 + Math.sin(index / 3) * 55);
    const u2Kpa = round1(55 + waterDepthM * 4.2 + depthM * 5.8 + random() * 12);
    const qtKpa = round1(qcKpa + u2Kpa * (0.14 + random() * 0.05));
    const fsKpa = round1(12 + trend * 38 + random() * 4.2);
    const frPercent = round3((100 * fsKpa) / Math.max(1, qtKpa));
    rows.push({ pointName, depthM, qcKpa, qtKpa, fsKpa, u2Kpa, frPercent, waterDepthM, finalDepthM });
  }

  return {
    flowId: 'flow-1-data-prep-check',
    scenario: 'valid-with-notice',
    seed,
    caseId: `F1-RANDOM-${seed}`,
    generatedAt: '2026-07-09T00:00:00+08:00',
    sourceType,
    project: {
      projectId: `synthetic-project-${seed}`,
      projectName,
    },
    point: {
      pointId: pointName,
      pointName,
      pointAlias: `合成点位-${suffix}`,
      waterDepthM,
      finalDepthM,
    },
    importBatch: {
      batchId: `synthetic-import-${seed}`,
      batchName: `${sourceTypeLabel(sourceType)} / ${pointName}`,
    },
    rows,
  };
}

export function getSyntheticProjectPointSummary(flowCase: SyntheticFlowCase): ProjectPointSummary {
  const depths = flowCase.rows.map((row) => row.depthM);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  const siblingA = `AUTO-CPTU-${flowCase.seed.slice(0, 3).toUpperCase()}A`;
  const siblingB = `AUTO-CPTU-${flowCase.seed.slice(0, 3).toUpperCase()}B`;

  return {
    projectName: flowCase.project.projectName,
    projectId: flowCase.project.projectId,
    pointName: flowCase.point.pointName,
    pointAlias: flowCase.point.pointAlias,
    pointScope: pointScope(flowCase.point.pointName),
    dataVersion: `synthetic-${flowCase.seed}`,
    createdAt: flowCase.generatedAt,
    sourceDepthRange: `${minDepth.toFixed(2)}-${flowCase.point.finalDepthM.toFixed(1)} m`,
    previewDepthRange: `${minDepth.toFixed(2)}-${maxDepth.toFixed(2)} m`,
    previewRecordCount: flowCase.rows.length,
    sourceRecordCount: String(flowCase.rows.length),
    totalPointCount: 3,
    waterDepthM: flowCase.point.waterDepthM,
    finalDepthM: flowCase.point.finalDepthM,
    sourceType: sourceTypeLabel(flowCase.sourceType),
    sourceFiles: [`${flowCase.point.pointName}.${flowCase.sourceType === 'synthetic-excel' ? 'xlsx' : 'csv'}`],
    caseId: flowCase.caseId,
    seed: flowCase.seed,
    generatedAt: flowCase.generatedAt,
    availablePoints: [
      {
        pointId: flowCase.point.pointId,
        pointName: flowCase.point.pointName,
        alias: flowCase.point.pointAlias,
        status: '已选择点位',
        recordCount: String(flowCase.rows.length),
        depthRange: `${minDepth.toFixed(2)}-${maxDepth.toFixed(2)} m`,
      },
      {
        pointId: siblingA,
        pointName: siblingA,
        alias: '干扰点位',
        status: '未选择',
        recordCount: String(24 + (Number(flowCase.seed.slice(-2)) % 20 || 7)),
        depthRange: '待核对',
      },
      {
        pointId: siblingB,
        pointName: siblingB,
        alias: '干扰点位',
        status: '未选择',
        recordCount: String(30 + (Number(flowCase.seed.slice(-3, -1)) % 18 || 9)),
        depthRange: '待核对',
      },
    ],
  };
}

export function getSyntheticImportFieldMappings(): ImportFieldMapping[] {
  return [
    { sourceField: 'PointName', targetField: '点位编号', status: 'matched', note: '用于绑定随机案例的当前点位' },
    { sourceField: 'DepthM', targetField: '深度', status: 'matched', note: '深度严格递增，可用于数据检查和后续分层' },
    { sourceField: 'Qc / Qt', targetField: '锥尖阻力', status: 'matched', note: '单位为 kPa，已进入预检' },
    { sourceField: 'Fs / Fr', targetField: '侧阻与摩阻比', status: 'matched', note: 'Fr 由 Fs 和 Qt 派生，用于检查提示' },
    { sourceField: 'U2', targetField: '孔压', status: 'matched', note: '单位为 kPa，可进入检查' },
    { sourceField: 'WaterDepthM', targetField: '水深', status: 'warning', note: '随机案例保留水深来源提示，检查后可继续' },
    { sourceField: 'FinalDepthM', targetField: '最终孔深', status: 'matched', note: '用于判断深度范围是否超出孔深' },
  ];
}

export function getSyntheticImportPreviewRows(flowCase: SyntheticFlowCase): ImportPreviewRow[] {
  return flowCase.rows.slice(0, 12).map((row) => ({
    depthM: row.depthM,
    qcKpa: row.qcKpa,
    qtKpa: row.qtKpa,
    fsKpa: row.fsKpa,
    u2Kpa: row.u2Kpa,
    frPercent: row.frPercent,
  }));
}

export function getSyntheticCheckIssues(flowCase: SyntheticFlowCase): CheckIssue[] {
  const depths = flowCase.rows.map((row) => row.depthM);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  const noticeRow = flowCase.rows[Math.floor(flowCase.rows.length * 0.62)] ?? flowCase.rows[0];

  return [
    {
      issueId: 'check-required-fields',
      title: '必需字段',
      severity: 'passed',
      route: 'check',
      source: flowCase.importBatch.batchName,
      detail: 'PointName、DepthM、Qc、Qt、Fs、U2、Fr、WaterDepthM、FinalDepthM 均已映射。',
      nextAction: '继续检查深度和单位。',
      fieldName: 'PointName / DepthM / Qc / Qt / Fs / U2 / Fr',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: 1,
      rowIndexTo: flowCase.rows.length,
      workflowImpact: '无问题',
    },
    {
      issueId: 'check-depth-monotonicity',
      title: '深度递增',
      severity: 'passed',
      route: 'check',
      source: flowCase.point.pointName,
      detail: `随机数据共 ${flowCase.rows.length} 行，深度严格递增，未超过最终孔深 ${flowCase.point.finalDepthM.toFixed(1)} m。`,
      nextAction: '可进入检查结论判断。',
      fieldName: 'DepthM',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: 1,
      rowIndexTo: flowCase.rows.length,
      workflowImpact: '无问题',
    },
    {
      issueId: 'check-water-depth-source',
      title: '水深来源',
      severity: 'warning',
      route: 'check',
      source: flowCase.sourceType,
      detail: `水深 ${flowCase.point.waterDepthM.toFixed(1)} m 来自随机案例生成器，原型中只作为预览条件。`,
      nextAction: '复核点位水深来源；该提示影响整孔 CPTU 修正上下文，但不影响进入地层分层。',
      fieldName: 'WaterDepthM',
      workflowImpact: '仅提示',
      evidenceScope: 'point-context',
    },
    {
      issueId: 'check-fr-range-notice',
      title: 'Fr 范围提示',
      severity: 'warning',
      route: 'check',
      source: 'Fs / Qt 派生',
      detail: `第 ${Math.floor(flowCase.rows.length * 0.62) + 1} 行 Fr=${noticeRow.frPercent.toFixed(3)}%，用于验证提示定位和右侧建议。`,
      nextAction: '作为提示保留，不影响进入地层分层。',
      fieldName: 'Fr',
      depthFromM: noticeRow.depthM,
      depthToM: noticeRow.depthM,
      rowIndexFrom: Math.floor(flowCase.rows.length * 0.62) + 1,
      rowIndexTo: Math.floor(flowCase.rows.length * 0.62) + 1,
      workflowImpact: '仅提示',
    },
    {
      issueId: 'check-continue-stratification',
      title: '进入地层分层判断',
      severity: 'passed',
      route: 'check',
      source: 'Flow 1 检查结论',
      detail: '当前随机案例没有存在问题项，仅保留提示记录，可进入地层分层。',
      nextAction: '进入地层分层。',
      fieldName: 'CheckRun',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: 1,
      rowIndexTo: flowCase.rows.length,
      workflowImpact: '可进入地层分层',
    },
  ];
}

export function getCheckIssues(): CheckIssue[] {
  const missing = badMissingColumnsJson as { error?: { message?: string } };
  const nonmonotonic = badNonmonotonicDepthJson as { error?: { message?: string } };
  const nonpositive = badNonpositiveLogInputsJson as { error?: { message?: string } };
  return [
    {
      issueId: 'check-depth-monotonicity',
      title: '深度连续性',
      severity: 'passed',
      route: 'check',
      source: '营口 CPTU 样例表',
      detail: '当前营口样例预览深度单调递增；保留反例用于检查规则说明。',
      nextAction: nonmonotonic.error?.message ?? '可查看地层分层。',
    },
    {
      issueId: 'check-required-fields',
      title: '必需字段',
      severity: 'passed',
      route: 'check',
      source: '字段映射',
      detail: 'Depth、Qc/Qt、Fs/Fr、U2 等样例字段已映射。',
      nextAction: missing.error?.message ?? '继续检查输入完整性。',
    },
    {
      issueId: 'check-log-inputs',
      title: 'SBT/SBTn 输入',
      severity: 'warning',
      route: 'check',
      source: '样例输入',
      detail: '保留非正值反例，用于说明分类或参数方法接入前的检查门槛。',
      nextAction: nonpositive.error?.message ?? '本页只展示检查边界。',
    },
    {
      issueId: 'check-prototype-boundary',
      title: '使用边界',
      severity: 'warning',
      route: 'check',
      source: '只读样例',
      detail: '浏览器内状态不写入工程数据，也不替代桌面端审定流程。',
      nextAction: '可继续查看候选分层和参数试算。',
    },
  ];
}

export function getOutputItems(): OutputItem[] {
  return [
    ...outputData.reportManifestProjection.exportInputs.map((input) => ({
      itemId: `${input.objectType}-${input.objectId}`,
      label: outputObjectLabel(input.objectType),
      status: input.status ?? 'Preview',
      note: `样例包引用 ${input.objectId}；生成前需确认。`,
    })),
    {
      itemId: 'blocked-direct-inputs',
      label: '排除项',
      status: 'PreviewOnly',
      note: `${outputData.reportManifestProjection.blockedDirectInputs.length} 类候选或调试对象不直接进入成果。`,
    },
  ];
}

export function getRouteStatus(route: RouteId) {
  const issueCounts = getCheckIssues().reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { blocking: 0, warning: 0, passed: 0 },
  );
  const reviewCount = layerSchemes[0]?.boundaries.filter((boundary) => boundary.reviewRequired).length ?? 0;
  const statuses: Record<RouteId, string> = {
    project: '就绪',
    import: '已读取',
    check: issueCounts.blocking ? `${issueCounts.blocking} 个问题` : '无问题',
    stratification: reviewCount ? '只读样例' : '可试算',
    parameters: parameterData.preflight.canRunTrial ? '试算边界' : '不可用',
    output: '待补全',
  };
  return statuses[route];
}

function outputObjectLabel(objectType: string) {
  const labels: Record<string, string> = {
    OutputPackagePreview: '成果包结构预览',
    AdoptedOutputPackage: '成果包索引',
    LayerScheme: '分层成果引用',
    ParameterScheme: '参数成果引用',
    DataCheckRun: '数据检查记录',
  };
  return labels[objectType] ?? objectType;
}

function normalizeSeed(seedInput: string | number) {
  const raw = String(seedInput || '240709').replace(/[^a-zA-Z0-9]/g, '');
  const hash = hashSeed(raw || '240709');
  return String(hash).padStart(8, '0').slice(-8);
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededRandom(seed: string) {
  let state = Number(seed) || 240709;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function sourceTypeLabel(sourceType: SyntheticFlowCase['sourceType']) {
  const labels: Record<SyntheticFlowCase['sourceType'], string> = {
    'synthetic-csv': '随机 CSV',
    'synthetic-excel': '随机 Excel',
    'synthetic-paste': '随机粘贴文本',
  };
  return labels[sourceType];
}
