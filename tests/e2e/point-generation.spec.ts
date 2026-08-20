import { expect, test } from '@playwright/test';
import {
  createCsvImportPipeline,
  setPointAttributionDecision,
  setPointSplitPlan,
  setPointTargetDecision,
  type PipelineContext,
} from '../../src/features/import/importPipeline';
import { generatePointDrafts } from '../../src/features/import/pointGeneration';
import {
  commitParameterSchemeEdit,
  createParameterScheme,
  emptyParameterWorkspace,
} from '../../src/features/parameters/parameterDomain';
import {
  emptyArtifactState,
  type ImportBatchDraftV2,
  type ImportDataBlockV2,
  type PointWorkspaceV2,
  type ProjectWorkspaceV2,
} from '../../src/features/workspace/workspaceV2';

test('multi-point generation creates independent drafts in one project transition', async () => {
  const pointA = existingPointA();
  const parameterSource = {
    pointId: pointA.pointId,
    draftId: pointA.activeImportDraftId!,
    batchId: pointA.importDrafts[0].batchId,
    revisions: { ...pointA.importDrafts[0].revisions },
    checkRunId: 'check-a-current',
    stratificationSchemeId: 'stratification-a-current',
    stratificationRevisionId: 'stratification-a-current:revision:1',
    stratificationVersion: 1,
  };
  const createdParameter = createParameterScheme(
    emptyParameterWorkspace(),
    parameterSource,
    'A 点参数方案',
    '2026-07-10T13:15:00.000Z',
    'parameter-a-current',
  );
  if (!createdParameter.ok) throw new Error(createdParameter.problem);
  const committedParameter = commitParameterSchemeEdit(
    createdParameter.workspace,
    parameterSource,
    '2026-07-10T13:16:00.000Z',
    'parameter-a-current:revision:1',
  );
  if (!committedParameter.ok) throw new Error(committedParameter.problem);
  pointA.parameterWorkspace = committedParameter.workspace;
  const context: PipelineContext = {
    currentPointName: pointA.pointName,
    defaultWaterDepthM: 12.4,
    defaultFinalDepthM: 3,
    allowAnyPoint: true,
    existingPoints: [{
      pointId: pointA.pointId,
      pointName: pointA.pointName,
      aliases: [...pointA.aliases],
      activeImportDraftId: pointA.activeImportDraftId,
    }],
  };
  let pipeline = await createCsvImportPipeline({
    batchId: 'batch-multi-generate',
    operationId: 'operation-multi-generate',
    baseWorkspaceRevision: 7,
    fileName: 'three-points.csv',
    text: threePointCsv(),
    ...context,
    now: '2026-07-10T14:00:00.000Z',
  });
  pipeline = setPointAttributionDecision(pipeline, { source: 'source-column', sourceColumnId: pipeline.sourceColumns.find((column) => column.header === 'PointName')!.columnId }, context);
  pipeline = setPointSplitPlan(pipeline, 'split-all', [], context);
  pipeline = setPointTargetDecision(pipeline, 'a-01', 'append-draft', { targetPointId: pointA.pointId }, context);
  expect(pipeline.pointPlan.state, JSON.stringify({ conflicts: pipeline.pointPlan.conflicts, decisions: pipeline.pointPlan.targetDecisions }, null, 2)).toBe('ready');
  expect(pipeline.readiness.canGenerateDrafts).toBe(true);

  const normalizedDataBlockId = `${pipeline.batchId}:normalized:${pipeline.revisions.normalization}`;
  const batch = batchFromPipeline(pipeline, normalizedDataBlockId);
  const project: ProjectWorkspaceV2 = {
    projectId: 'project-multi-generate',
    projectName: '多点生成领域测试',
    mode: 'user',
    workspaceRevision: 7,
    points: [pointA],
    activePointId: pointA.pointId,
    importBatches: [batch],
    activeImportBatchId: batch.batchId,
    activeRoute: 'import',
    activeBottomTab: 'issues',
    flowFeedback: '',
    createdAt: '2026-07-10T13:00:00.000Z',
    updatedAt: '2026-07-10T13:00:00.000Z',
  };
  const blocks: ImportDataBlockV2[] = [{
    kind: 'normalized',
    dataBlockId: normalizedDataBlockId,
    batchId: batch.batchId,
    sourceFingerprint: pipeline.sourceFingerprint,
    rows: pipeline.rows.map((row) => ({ ...row })),
  }];

  const duplicateTargetPipeline = structuredClone(pipeline);
  const duplicateTargetDecision = duplicateTargetPipeline.pointPlan.targetDecisions?.find((decision) => decision.detectedPointKey === 'b-01');
  if (!duplicateTargetDecision) throw new Error('B-01 decision is required.');
  duplicateTargetDecision.action = 'append-draft';
  duplicateTargetDecision.state = 'confirmed';
  duplicateTargetDecision.targetPointId = pointA.pointId;
  duplicateTargetDecision.proposedPointName = undefined;
  expect(generatePointDrafts(project, duplicateTargetPipeline, blocks, '2026-07-10T14:04:00.000Z')).toMatchObject({
    ok: false,
    code: 'POINT-TARGET-DUPLICATE',
  });

  const result = generatePointDrafts(project, pipeline, blocks, '2026-07-10T14:05:00.000Z');
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.generated).toHaveLength(3);
  expect(result.project.points).toHaveLength(3);
  expect(result.project.activePointId).toBe(pointA.pointId);
  expect(result.project.workspaceRevision).toBe(8);
  const generatedA = result.project.points.find((point) => point.pointName === 'A-01')!;
  const generatedB = result.project.points.find((point) => point.pointName === 'B-01')!;
  const generatedC = result.project.points.find((point) => point.pointName === 'C-01')!;
  expect(generatedA.importDrafts).toHaveLength(2);
  expect(generatedA.activeImportDraftId).not.toBe('draft-a-current');
  expect(generatedA.checkState.runs).toHaveLength(1);
  expect(generatedA.checkState.activeRunId).toBeNull();
  expect(generatedA.checkState.artifact.status).toBe('empty');
  expect(generatedA.parameterWorkspace?.schemes[0].status).toBe('stale');
  expect(generatedA.parameterWorkspace?.currentResultSelectionRef).toBeNull();
  expect(generatedB.importDrafts[0].sourceRowIds).toHaveLength(2);
  expect(generatedC.importDrafts[0].sourceRowIds).toHaveLength(2);
  expect(generatedB.checkState.runs).toEqual([]);
  expect(generatedC.checkState.runs).toEqual([]);
  const generatedBatch = result.project.importBatches[0];
  expect(generatedBatch.kind).toBe('draft');
  if (generatedBatch.kind !== 'draft') return;
  expect(generatedBatch.workflowState).toBe('generated');
  expect(generatedBatch.generatedDraftIds).toHaveLength(3);
  expect(generatedBatch.pointPlan.executions.map((execution) => execution.status)).toEqual(['generated', 'generated', 'generated']);
  expect(new Set(generatedBatch.generatedDraftIds).size).toBe(3);

  const repeated = generatePointDrafts(result.project, pipeline, blocks, '2026-07-10T14:06:00.000Z');
  expect(repeated).toMatchObject({ ok: false, code: 'WORKSPACE-REVISION-CHANGED' });
  expect(result.project.points.map((point) => point.pointId)).toHaveLength(3);
});

test('point IDs remain distinct when normalized names share the same slug', async () => {
  const context: PipelineContext = {
    currentPointName: '',
    defaultWaterDepthM: 12.4,
    defaultFinalDepthM: 3,
    allowAnyPoint: true,
    existingPoints: [],
  };
  let pipeline = await createCsvImportPipeline({
    batchId: 'batch-slug-collision',
    operationId: 'operation-slug-collision',
    baseWorkspaceRevision: 1,
    fileName: 'slug-collision.csv',
    text: [
      'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
      'A/B,0.5,900,980,12,60,1.2,12.4,3',
      'A-B,0.5,1000,1080,13,65,1.2,12.4,3',
    ].join('\n'),
    ...context,
    now: '2026-07-10T15:00:00.000Z',
  });
  pipeline = setPointSplitPlan(pipeline, 'split-all', [], context);
  const normalizedDataBlockId = `${pipeline.batchId}:normalized:${pipeline.revisions.normalization}`;
  const project: ProjectWorkspaceV2 = {
    projectId: 'project-slug-collision',
    projectName: '相似点位 ID 测试',
    mode: 'user',
    workspaceRevision: 1,
    points: [],
    activePointId: null,
    importBatches: [batchFromPipeline(pipeline, normalizedDataBlockId)],
    activeImportBatchId: pipeline.batchId,
    activeRoute: 'import',
    activeBottomTab: 'issues',
    flowFeedback: '',
    createdAt: '2026-07-10T15:00:00.000Z',
    updatedAt: '2026-07-10T15:00:00.000Z',
  };
  const result = generatePointDrafts(project, pipeline, [{
    kind: 'normalized',
    dataBlockId: normalizedDataBlockId,
    batchId: pipeline.batchId,
    sourceFingerprint: pipeline.sourceFingerprint,
    rows: pipeline.rows.map((row) => ({ ...row })),
  }], '2026-07-10T15:01:00.000Z');

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.project.points.map((point) => point.pointName)).toEqual(['A/B', 'A-B']);
  expect(new Set(result.project.points.map((point) => point.pointId)).size).toBe(2);
  expect(new Set(result.generated.map((item) => item.draftId)).size).toBe(2);
});

function batchFromPipeline(pipeline: Awaited<ReturnType<typeof createCsvImportPipeline>>, normalizedDataBlockId: string): ImportBatchDraftV2 {
  return {
    kind: 'draft',
    batchId: pipeline.batchId,
    operationId: pipeline.operationId,
    baseWorkspaceRevision: pipeline.baseWorkspaceRevision,
    sourceFingerprint: pipeline.sourceFingerprint,
    source: { mode: 'uploaded-csv', fileName: pipeline.fileName, fileType: 'CSV' },
    parseState: 'parsed',
    workflowState: 'ready-to-generate',
    sourceColumns: pipeline.sourceColumns.map((column) => ({ ...column, sampleValues: [...column.sampleValues], mappingCandidates: column.mappingCandidates.map((candidate) => ({ ...candidate })) })),
    rawDataBlockId: `${pipeline.batchId}:raw:${pipeline.revisions.source}`,
    mappings: pipeline.mappings.map((mapping) => ({ ...mapping })),
    unitDecisions: pipeline.unitDecisions.map((unit) => ({ ...unit, conversion: unit.conversion ? { ...unit.conversion } : null })),
    normalizedDataBlockId,
    pointAttribution: pipeline.pointAttribution ? { ...pipeline.pointAttribution } : null,
    pointPlan: {
      ...pipeline.pointPlan,
      detectedPoints: pipeline.pointPlan.detectedPoints.map((point) => ({ ...point })),
      selectedPointKeys: [...pipeline.pointPlan.selectedPointKeys],
      conflicts: pipeline.pointPlan.conflicts.map((conflict) => ({ ...conflict })),
      targetDecisions: pipeline.pointPlan.targetDecisions?.map((decision) => ({ ...decision })),
      executions: pipeline.pointPlan.executions.map((execution) => ({ ...execution })),
    },
    problems: pipeline.problems.map((problem) => ({ ...problem })),
    generatedDraftIds: [],
    revisions: { ...pipeline.revisions },
    createdAt: '2026-07-10T14:00:00.000Z',
    updatedAt: '2026-07-10T14:00:00.000Z',
  };
}

function existingPointA(): PointWorkspaceV2 {
  const dependency = {
    pointId: 'point-a',
    draftId: 'draft-a-current',
    batchId: 'batch-a-current',
    revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
  };
  return {
    pointId: 'point-a',
    pointName: 'A-01',
    aliases: ['A-ALIAS'],
    waterDepthM: 12.4,
    finalDepthM: 3,
    importDrafts: [{
      draftId: dependency.draftId,
      batchId: dependency.batchId,
      pointId: dependency.pointId,
      sourcePointName: 'A-01',
      sourceRowIds: ['old-row-a'],
      dataBlockId: 'old-normalized-a',
      valueProvenance: {},
      revisions: { ...dependency.revisions },
      problems: [],
      status: 'ready',
    }],
    activeImportDraftId: dependency.draftId,
    checkState: {
      activeRunId: 'check-a-current',
      runs: [{
        runId: 'check-a-current',
        input: dependency,
        status: 'completed',
        counts: { issue: 0, notice: 0, passed: 8 },
        conclusion: '无问题',
        issueIds: [],
        createdAt: '2026-07-10T13:10:00.000Z',
        completedAt: '2026-07-10T13:10:01.000Z',
      }],
      legacyHistory: [],
      artifact: { status: 'current', input: dependency },
    },
    stratificationState: emptyArtifactState(),
    parameterState: emptyArtifactState(),
    outputState: emptyArtifactState(),
    selection: {
      selectedImportBatchId: dependency.batchId,
      selectedCheckIssueId: '',
      selectedSchemeId: '',
      selectedLayerId: '',
      selectedBoundaryId: '',
      selectedParameterSchemeId: '',
      selectedParameterSlotId: '',
      selectedOutputItemId: '',
      selectedMappingField: 'PointName',
      importFocusField: null,
      selectedCheckFilter: 'all',
    },
    createdAt: '2026-07-10T13:00:00.000Z',
    updatedAt: '2026-07-10T13:10:01.000Z',
  };
}

function threePointCsv() {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    'A-01,0.5,900,980,12,60,1.2,12.4,3',
    'B-01,0.5,1000,1080,13,65,1.2,12.4,3',
    'C-01,0.5,1100,1180,14,70,1.2,12.4,3',
    'A-01,1.0,1200,1280,15,75,1.2,12.4,3',
    'B-01,1.0,1300,1380,16,80,1.2,12.4,3',
    'C-01,1.0,1400,1480,17,85,1.2,12.4,3',
  ].join('\n');
}
