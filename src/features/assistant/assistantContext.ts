import type {
  AssistantContextSnapshot,
  AssistantDepthField,
  AssistantDepthWindowRow,
  AssistantDepthWindowRequest,
  AssistantDepthWindowResult,
  AssistantRoute,
} from './assistantTypes';

const ROUTE_LABEL: Record<AssistantRoute, string> = {
  project: '项目/点位数据',
  import: '数据导入',
  check: '数据检查',
  stratification: '地层分层',
  parameters: '参数解译',
  output: '成果输出',
  'quick-input': '快捷出图数据输入',
  'quick-report': '快捷出图图册',
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function stableHash(value: unknown) {
  const input = JSON.stringify(stableValue(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `assistant-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createAssistantContextSnapshot(input: {
  projectId: string;
  projectName: string;
  pointId: string;
  pointName: string;
  route: AssistantRoute;
  workspaceRevision: number;
  checkRunId: string | null;
  classificationRunId: string | null;
  stratificationRevisionId: string | null;
  hasWorkingDraft: boolean;
  parameterRunId: string | null;
  statuses: AssistantContextSnapshot['status'];
  counts: Omit<AssistantContextSnapshot['counts'], 'layers' | 'boundaries'>;
  layers: AssistantContextSnapshot['layers'];
  boundaries: AssistantContextSnapshot['boundaries'];
  selectedLayerId: string | null;
  selectedBoundaryId: string | null;
  notices: string[];
}): AssistantContextSnapshot {
  const layers = input.layers.slice(0, 120);
  const boundaries = input.boundaries.slice(0, 120);
  const authorityInput = {
    projectId: input.projectId,
    pointId: input.pointId,
    route: input.route,
    workspaceRevision: input.workspaceRevision,
    checkRunId: input.checkRunId,
    classificationRunId: input.classificationRunId,
    stratificationRevisionId: input.stratificationRevisionId,
    hasWorkingDraft: input.hasWorkingDraft,
    parameterRunId: input.parameterRunId,
    layers: layers.map((layer) => [
      layer.layerId,
      layer.depthFromM,
      layer.depthToM,
      layer.engineeringSoilGroup,
      layer.reviewRequired,
    ]),
    boundaries: boundaries.map((boundary) => [
      boundary.boundaryId,
      boundary.depthM,
      boundary.reviewRequired,
    ]),
  };
  const scope = {
    projectId: input.projectId,
    projectName: input.projectName,
    pointId: input.pointId,
    pointName: input.pointName,
    route: input.route,
    routeLabel: ROUTE_LABEL[input.route],
    workspaceRevision: input.workspaceRevision,
    checkRunId: input.checkRunId,
    classificationRunId: input.classificationRunId,
    stratificationRevisionId: input.stratificationRevisionId,
    hasWorkingDraft: input.hasWorkingDraft,
    parameterRunId: input.parameterRunId,
    authorityHash: stableHash(authorityInput),
  };
  return {
    assistantProfile: 'professional-governed',
    scope,
    status: input.statuses,
    counts: {
      ...input.counts,
      layers: layers.length,
      boundaries: boundaries.length,
    },
    layers,
    boundaries,
    selectedLayer: layers.find((layer) => layer.layerId === input.selectedLayerId) ?? null,
    selectedBoundary: boundaries.find((boundary) => boundary.boundaryId === input.selectedBoundaryId) ?? null,
    notices: input.notices.slice(0, 12),
  };
}

export function readBoundedAssistantDepthWindow(
  rows: AssistantDepthWindowRow[],
  request: AssistantDepthWindowRequest,
  limit = 120,
): AssistantDepthWindowResult {
  const fromM = Number(request.depthFromM);
  const toM = Number(request.depthToM);
  const fields = [...new Set(request.fields)].filter((field): field is AssistantDepthField =>
    field === 'qc' || field === 'fs' || field === 'u2',
  );
  if (
    !Number.isFinite(fromM)
    || !Number.isFinite(toM)
    || fromM < 0
    || toM <= fromM
    || toM - fromM > 20
    || !fields.length
  ) {
    return { ok: false, problem: '深度终点须大于起点，窗口跨度不超过 20 m，并至少选择 qc、fs、u2 中的一项。' };
  }
  const matching = rows.filter((row) => row.depthM >= fromM && row.depthM <= toM);
  const sampled = matching.length <= limit
    ? matching
    : Array.from({ length: limit }, (_, index) => matching[
        Math.round(index * (matching.length - 1) / (limit - 1))
      ]);
  const missingCounts = Object.fromEntries(fields.map((field) => {
    const sourceKey = field === 'qc' ? 'qcKpa' : field === 'fs' ? 'fsKpa' : 'u2Kpa';
    return [field, matching.filter((row) => !Number.isFinite(row[sourceKey])).length];
  })) as Partial<Record<AssistantDepthField, number>>;
  return {
    ok: true,
    depthFromM: fromM,
    depthToM: toM,
    depthReference: 'below-mudline-positive-down',
    depthUnit: 'm',
    units: Object.fromEntries(fields.map((field) => [field, 'kPa'])) as Partial<Record<AssistantDepthField, 'kPa'>>,
    dataBasis: 'current-governed-working-data',
    requestedFields: fields,
    totalMatchingRows: matching.length,
    returnedRowCount: sampled.length,
    clipped: sampled.length < matching.length,
    samplingMethod: sampled.length < matching.length ? 'even-source-index' : 'all-source-rows',
    gapSemantics: sampled.length < matching.length
      ? 'not-assessable-from-sample'
      : 'all-source-depths-preserved',
    missingCounts,
    interpolated: false,
    rows: sampled.map((row) => ({
      sourceRowId: row.sourceRowId,
      depthM: row.depthM,
      ...(fields.includes('qc') ? { qcKpa: Number.isFinite(row.qcKpa) ? row.qcKpa : null } : {}),
      ...(fields.includes('fs') ? { fsKpa: Number.isFinite(row.fsKpa) ? row.fsKpa : null } : {}),
      ...(fields.includes('u2') ? { u2Kpa: Number.isFinite(row.u2Kpa) ? row.u2Kpa : null } : {}),
    })),
  };
}
