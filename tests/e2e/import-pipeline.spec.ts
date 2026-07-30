import { expect, test } from '@playwright/test';
import {
  clearFieldMapping,
  confirmFieldMapping,
  acceptImportOperationResult,
  createCsvImportPipeline,
  isCurrentImportOperation,
  projectPipelineToLegacyDraft,
  replaceCsvImportSource,
  resetFieldMappings,
  setFieldMapping,
  setPointAttributionDecision,
  setPointSplitPlan,
  setPointTargetDecision,
  setUnitDecision,
  type CsvImportPipelineV2,
  type PipelineContext,
} from '../../src/features/import/importPipeline';
import {
  createEditableImportPipeline,
  importPipelineContextIdentity,
} from '../../src/features/import/editableImportPipeline';
import type {
  ImportBatchDraftV2,
  ProjectWorkspaceV2,
  RawImportDataBlockV2,
} from '../../src/features/workspace/workspaceV2';

const context: PipelineContext = {
  currentPointName: 'CPT-01',
  defaultWaterDepthM: 12.4,
  defaultFinalDepthM: 30,
};

test('standard CSV creates stable source objects and a checkable per-point result', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '920', '1010', '12.5', '62', '1.238', '12.4', '3'],
    ['CPT-01', '1.0', '980', '1074', '13.8', '67', '1.285', '12.4', '3'],
  ]));
  const sourcePrefix = `batch-test:source:1:${pipeline.sourceFingerprint.slice(0, 12)}`;

  expect(pipeline.sourceRows.map((row) => row.rowId)).toEqual([
    `${sourcePrefix}:row:0`,
    `${sourcePrefix}:row:1`,
  ]);
  expect(pipeline.sourceColumns[2]).toMatchObject({
    columnId: `${sourcePrefix}:column:2`,
    header: 'QcKpa',
    inferredValueType: 'number',
    mappingCandidates: [{ targetField: 'qc', confidence: 'high' }],
  });
  expect(pipeline.mappings.filter((mapping) => mapping.requiredLevel === 'required').every((mapping) => mapping.state === 'confirmed')).toBe(true);
  expect(pipeline.mappings.filter((mapping) => ['qt', 'fr', 'waterDepth', 'finalDepth'].includes(mapping.targetField)).every((mapping) => mapping.state === 'missing')).toBe(true);
  expect(pipeline.unitDecisions.find((unit) => unit.targetField === 'qc')).toMatchObject({
    selectedUnit: 'kPa',
    standardUnit: 'kPa',
    conversion: { scale: 1, offset: 0 },
    state: 'confirmed',
  });
  expect(pipeline.pointPlan.detectedPoints).toEqual([{ pointKey: 'cpt-01', pointName: 'CPT-01', rowCount: 2 }]);
  expect(pipeline.pointPlan.executions[0]).toMatchObject({
    sourceFingerprint: pipeline.sourceFingerprint,
    idempotencyKey: `${pipeline.sourceFingerprint}:cpt-01`,
  });
  expect(pipeline.readiness).toMatchObject({ canNormalize: true, canGenerateDrafts: true, canRunCheck: true });
  expect(pipeline.problems).toEqual([]);
});

test('common aliases auto-confirm and cm, MPa, and kPa convert exactly', async () => {
  const pipeline = await createPipeline([
    'Point,DepthCM,QcMPa,FsKpa,FinalDepthMM',
    'CPT-01,100,1.25,12,3000',
    'CPT-01,200,1.50,13,3000',
  ].join('\n'));

  expect(pipeline.readiness.canNormalize).toBe(true);
  expect(pipeline.mappings.filter((mapping) => mapping.requiredLevel === 'required').map((mapping) => mapping.state)).toEqual(['confirmed', 'confirmed', 'confirmed']);
  expect(pipeline.rows).toHaveLength(2);
  expect(pipeline.rows[0]).toMatchObject({ depthM: 1, qcKpa: 1250, fsKpa: 12, qtKpa: 1250, finalDepthM: 2 });
  expect(pipeline.rows[1]).toMatchObject({ depthM: 2, qcKpa: 1500, finalDepthM: 2 });
  expect(pipeline.normalizedRows[0].values).toMatchObject({
    depthM: { rawValue: '100', normalizedValue: 1, sourceUnit: 'cm', origin: 'source' },
    qc: { rawValue: '1.25', normalizedValue: 1250, sourceUnit: 'MPa', origin: 'source' },
    qt: { normalizedValue: 1250, origin: 'derived' },
    fs: { normalizedValue: 12, origin: 'source' },
  });
  expect(pipeline.readiness.canRunCheck).toBe(true);
  expect(pipeline.problems.filter((problem) => problem.severity === 'notice').length).toBeGreaterThan(0);
});

test('editable pipeline cache invalidates when point depth defaults change and preserves cached row references otherwise', async () => {
  const initial = await createPipeline([
    'DepthM,QcKpa,FsKpa',
    '0.5,1250,12',
    '1.0,1500,13',
  ].join('\n'), {
    ...context,
    defaultWaterDepthM: 8,
    defaultFinalDepthM: 30,
  });
  const batch = batchFromPipeline(initial);
  const rawBlock: RawImportDataBlockV2 = {
    kind: 'raw',
    dataBlockId: batch.rawDataBlockId!,
    batchId: batch.batchId,
    sourceFingerprint: batch.sourceFingerprint,
    rows: initial.sourceRows.map((row) => [...row.cells]),
    rowReferences: initial.sourceRows.map((row) => ({
      sourceRowId: row.rowId,
      sourceIndex: row.sourceIndex,
      displayRowNumber: row.displayRowNumber,
    })),
    completeness: 'full',
  };
  const project = projectWithImportBatch(batch);

  const first = createEditableImportPipeline(project, [rawBlock], {
    ...context,
    defaultWaterDepthM: 8,
    defaultFinalDepthM: 30,
  });
  expect(first?.rows[0]).toMatchObject({ waterDepthM: 8, finalDepthM: 1 });

  const sameContext = createEditableImportPipeline(
    { ...project, workspaceRevision: 2 },
    [rawBlock],
    { ...context, defaultWaterDepthM: 8, defaultFinalDepthM: 30 },
  );
  expect(sameContext?.baseWorkspaceRevision).toBe(2);
  expect(sameContext?.rows).toBe(first?.rows);
  expect(sameContext?.normalizedRows).toBe(first?.normalizedRows);

  const changedFinalDepth = createEditableImportPipeline(
    { ...project, workspaceRevision: 3 },
    [rawBlock],
    { ...context, defaultWaterDepthM: 8, defaultFinalDepthM: 40 },
  );
  expect(changedFinalDepth?.rows[0]).toMatchObject({ waterDepthM: 8, finalDepthM: 1 });
  expect(changedFinalDepth?.rows).toBe(first?.rows);
  expect(importPipelineContextIdentity({ ...context, defaultWaterDepthM: 8, defaultFinalDepthM: 30 }))
    .not.toBe(importPipelineContextIdentity({ ...context, defaultWaterDepthM: 8, defaultFinalDepthM: 40 }));

  const changedWaterDepth = createEditableImportPipeline(
    { ...project, workspaceRevision: 4 },
    [rawBlock],
    { ...context, defaultWaterDepthM: 22.5, defaultFinalDepthM: 40 },
  );
  expect(changedWaterDepth?.rows[0]).toMatchObject({ waterDepthM: 22.5, finalDepthM: 1 });
  expect(changedWaterDepth?.rows).not.toBe(changedFinalDepth?.rows);
  expect(changedWaterDepth?.mappings).toBe(changedFinalDepth?.mappings);
  expect(changedWaterDepth?.pointPlan).toBe(changedFinalDepth?.pointPlan);
});

test('value-range unit suggestion never becomes an automatic unit decision', async () => {
  let pipeline = await createPipeline([
    'PointName,DepthM,Qc,FsKpa,FinalDepthM',
    'CPT-01,0.5,1.2,12,3',
    'CPT-01,1.0,1.4,13,3',
  ].join('\n'));
  pipeline = confirmFieldMapping(pipeline, 'qc', context);

  expect(pipeline.unitDecisions.find((unit) => unit.targetField === 'qc')).toMatchObject({
    detectedUnit: 'MPa',
    selectedUnit: null,
    decisionSource: 'value-range',
    state: 'needs-confirmation',
  });
  expect(pipeline.readiness.canRunCheck).toBe(false);
  expect(pipeline.problems.some((problem) => problem.eventId === 'DI-E15')).toBe(true);

  pipeline = setUnitDecision(pipeline, 'qc', 'MPa', context);
  expect(pipeline.rows[0].qcKpa).toBe(1200);
  expect(pipeline.readiness.canRunCheck).toBe(true);
});

test('duplicate source mappings stop normalization and recover without a hidden overwrite', async () => {
  let pipeline = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
  ]));
  const qcColumn = pipeline.mappings.find((mapping) => mapping.targetField === 'qc')!.sourceColumnId!;

  pipeline = setFieldMapping(pipeline, 'qt', qcColumn, context);
  expect(pipeline.mappings.filter((mapping) => ['qc', 'qt'].includes(mapping.targetField)).map((mapping) => mapping.state)).toEqual(['conflict', 'conflict']);
  expect(pipeline.rows).toEqual([]);
  expect(pipeline.revisions.mapping).toBe(2);

  const qtColumn = pipeline.sourceColumns.find((column) => column.header === 'QtKpa')!;
  const rebound = setFieldMapping(pipeline, 'qt', qtColumn.columnId, context);
  expect(rebound.mappings.filter((mapping) => ['qc', 'qt'].includes(mapping.targetField)).map((mapping) => mapping.state)).toEqual(['confirmed', 'confirmed']);
  expect(rebound.readiness.canRunCheck).toBe(true);

  pipeline = clearFieldMapping(pipeline, 'qt', context);
  expect(pipeline.mappings.find((mapping) => mapping.targetField === 'qc')?.state).toBe('confirmed');
  expect(pipeline.mappings.find((mapping) => mapping.targetField === 'qt')).toMatchObject({ sourceColumnId: null, state: 'missing' });
  expect(pipeline.readiness.canRunCheck).toBe(true);
  expect(pipeline.revisions.mapping).toBe(3);

  pipeline = resetFieldMappings(pipeline, context, '2026-07-10T11:00:00.000Z');
  expect(pipeline.mappings.find((mapping) => mapping.targetField === 'qt')?.state).toBe('missing');
  expect(pipeline.revisions.mapping).toBe(3);
  const unchanged = resetFieldMappings(pipeline, context, '2026-07-10T12:00:00.000Z');
  expect(unchanged).toBe(pipeline);
  expect(unchanged.revisions.mapping).toBe(3);
});

test('interleaved multi-point rows are checked inside each point only', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['A-01', '1.0', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['B-01', '0.5', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
    ['A-01', '2.0', '1100', '1180', '14', '70', '1.2', '12.4', '3'],
    ['B-01', '1.0', '1200', '1280', '15', '75', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: 'A-01' });

  expect(pipeline.pointPlan.detectedPoints).toEqual([
    { pointKey: 'a-01', pointName: 'A-01', rowCount: 2 },
    { pointKey: 'b-01', pointName: 'B-01', rowCount: 2 },
  ]);
  expect(pipeline.problems.some((problem) => problem.eventId === 'DI-E13')).toBe(false);
  expect(pipeline.problems.find((problem) => problem.eventId === 'DI-E11')).toMatchObject({ problemId: 'multi-point-file' });
  expect(pipeline.pointPlan.state).toBe('needs-decision');
  expect(pipeline.pointPlan.executions.map((execution) => execution.status)).toEqual(['pending', 'pending']);

  const split = setPointSplitPlan(pipeline, 'split-all', [], { ...context, currentPointName: 'A-01' });
  expect(split.pointPlan).toMatchObject({
    strategy: 'split-all',
    state: 'ready',
    selectedPointKeys: ['a-01', 'b-01'],
  });
  expect(split.pointPlan.executions.map((execution) => execution.status)).toEqual(['pending', 'pending']);
  expect(split.readiness.canGenerateDrafts).toBe(true);
  expect(split.revisions.pointPlan).toBe(2);
  const cancelled = setPointSplitPlan(split, 'cancelled', [], { ...context, currentPointName: 'A-01' });
  expect(cancelled.pointPlan).toMatchObject({
    strategy: 'cancelled',
    state: 'cancelled',
    selectedPointKeys: split.pointPlan.selectedPointKeys,
    targetDecisions: split.pointPlan.targetDecisions,
    executions: split.pointPlan.executions,
  });
  expect(cancelled.revisions.pointPlan).toBe(split.revisions.pointPlan);
  expect(cancelled.readiness.canGenerateDrafts).toBe(false);
  const projected = projectPipelineToLegacyDraft(split, {
    currentPointName: 'A-01',
    defaultWaterDepthM: context.defaultWaterDepthM,
    defaultFinalDepthM: context.defaultFinalDepthM,
  });
  expect(projected.status).toBe('ready');
  expect(new Set(projected.rows.map((row) => row.pointName))).toEqual(new Set(['A-01', 'B-01']));
  expect(projected.problems.some((problem) => problem.eventId === 'DI-E11')).toBe(false);
});

test('multi-point planning detects existing point names and aliases before generation', async () => {
  const conflictContext: PipelineContext = {
    ...context,
    currentPointName: 'CURRENT-01',
    existingPoints: [
      { pointId: 'point-a', pointName: 'A-01', aliases: [] },
      { pointId: 'point-b', pointName: 'CANONICAL-B', aliases: ['B-01'] },
    ],
  };
  const pipeline = await createPipeline(standardCsv([
    ['A-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['B-01', '0.5', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
  ]), conflictContext);

  expect(pipeline.pointPlan.conflicts).toEqual([
    { detectedPointKey: 'a-01', existingPointId: 'point-a', reason: 'name' },
    { detectedPointKey: 'b-01', existingPointId: 'point-b', reason: 'alias' },
  ]);
  expect(pipeline.problems.filter((problem) => problem.title === '点位已存在')).toHaveLength(2);

  const split = setPointSplitPlan(pipeline, 'split-all', [], conflictContext);
  expect(split.pointPlan.state).toBe('conflict');
  expect(split.pointPlan.targetDecisions).toMatchObject([
    { detectedPointKey: 'a-01', action: 'pending', state: 'conflict', targetPointId: 'point-a' },
    { detectedPointKey: 'b-01', action: 'pending', state: 'conflict', targetPointId: 'point-b' },
  ]);
  expect(split.readiness.canGenerateDrafts).toBe(false);

  const appendA = setPointTargetDecision(split, 'a-01', 'append-draft', { targetPointId: 'point-a' }, {
    ...conflictContext,
    existingPoints: conflictContext.existingPoints?.map((point) => ({
      ...point,
      activeImportDraftId: point.pointId === 'point-a' ? 'draft-a-current' : null,
    })),
  });
  expect(appendA.pointPlan.targetDecisions).toMatchObject([
    { detectedPointKey: 'a-01', action: 'append-draft', state: 'confirmed', targetPointId: 'point-a' },
    { detectedPointKey: 'b-01', action: 'pending', state: 'conflict', targetPointId: 'point-b' },
  ]);
  expect(appendA.revisions.pointPlan).toBe(3);

  const renamedB = setPointTargetDecision(appendA, 'b-01', 'rename-and-create', { proposedPointName: 'B-02' }, conflictContext);
  expect(renamedB.pointPlan).toMatchObject({
    state: 'ready',
    targetDecisions: [
      { detectedPointKey: 'a-01', action: 'append-draft', state: 'confirmed' },
      { detectedPointKey: 'b-01', action: 'rename-and-create', state: 'confirmed', proposedPointName: 'B-02' },
    ],
  });
  expect(renamedB.readiness.canGenerateDrafts).toBe(true);
  expect(renamedB.problems.filter((problem) => problem.title === '点位已存在')).toHaveLength(2);
  expect(projectPipelineToLegacyDraft(renamedB, {
    currentPointName: 'CURRENT-01',
    defaultWaterDepthM: context.defaultWaterDepthM,
    defaultFinalDepthM: context.defaultFinalDepthM,
  }).problems.some((problem) => problem.title === '点位已存在')).toBe(false);

  const duplicateName = setPointTargetDecision(appendA, 'b-01', 'rename-and-create', { proposedPointName: 'A-01' }, conflictContext);
  expect(duplicateName.pointPlan.targetDecisions?.find((decision) => decision.detectedPointKey === 'b-01')).toMatchObject({
    state: 'conflict',
    reasonCode: 'POINT-NAME-CONFLICT',
  });
  expect(duplicateName.readiness.canGenerateDrafts).toBe(false);

  const duplicateTarget = setPointTargetDecision(appendA, 'b-01', 'append-draft', { targetPointId: 'point-a' }, conflictContext);
  expect(duplicateTarget.pointPlan.targetDecisions?.find((decision) => decision.detectedPointKey === 'b-01')).toMatchObject({
    state: 'conflict',
    reasonCode: 'POINT-TARGET-DUPLICATE',
    targetPointId: 'point-a',
  });
  expect(duplicateTarget.pointPlan.state).toBe('conflict');
  expect(duplicateTarget.readiness.canGenerateDrafts).toBe(false);
});

test('a split-selected projection contains only the selected point', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['A-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['B-01', '0.5', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: 'A-01' });
  const selected = setPointSplitPlan(pipeline, 'split-selected', ['a-01'], { ...context, currentPointName: 'A-01' });
  const projected = projectPipelineToLegacyDraft(selected, {
    currentPointName: 'A-01',
    defaultWaterDepthM: context.defaultWaterDepthM,
    defaultFinalDepthM: context.defaultFinalDepthM,
  });

  expect(projected.status).toBe('ready');
  expect(projected.rows.map((row) => row.pointName)).toEqual(['A-01']);
  expect(projected.filePointNames).toEqual(['A-01']);
});

test('a depth problem is isolated to the affected point', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['A-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['B-01', '1.0', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
    ['A-01', '1.0', '1100', '1180', '14', '70', '1.2', '12.4', '3'],
    ['B-01', '0.8', '1200', '1280', '15', '75', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: 'A-01' });

  const depthProblems = pipeline.problems.filter((problem) => problem.eventId === 'DI-E13');
  expect(depthProblems).toHaveLength(1);
  expect(depthProblems[0]).toMatchObject({ problemId: 'nonmonotonic-depth-b-01', rowIndex: 5 });
  expect(depthProblems[0].message).toContain('B-01');
});

test('unsupported and mixed units stay as problems even after a field is manually mapped', async () => {
  let unsupported = await createPipeline([
    'PointName,DepthM,QcPsi,FinalDepthM',
    'CPT-01,0.5,145,3',
  ].join('\n'));
  const psiColumn = unsupported.sourceColumns.find((column) => column.header === 'QcPsi')!;
  unsupported = setFieldMapping(unsupported, 'qc', psiColumn.columnId, context);
  expect(unsupported.unitDecisions.find((unit) => unit.targetField === 'qc')?.state).toBe('conflict');
  expect(unsupported.problems.find((problem) => problem.problemId === 'unit-qc')).toMatchObject({ eventId: 'DI-E15' });

  const mixed = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '900 kPa', '980', '12', '60', '1.2', '12.4', '3'],
    ['CPT-01', '1.0', '1 MPa', '1080', '13', '65', '1.2', '12.4', '3'],
  ]));
  expect(mixed.unitDecisions.find((unit) => unit.targetField === 'qc')?.state).toBe('conflict');
  expect(mixed.readiness.canNormalize).toBe(false);
  expect(setUnitDecision(mixed, 'qc', 'kPa', context)).toBe(mixed);

  const headerCellConflict = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '1 MPa', '980', '12', '60', '1.2', '12.4', '3'],
  ]));
  expect(headerCellConflict.unitDecisions.find((unit) => unit.targetField === 'qc')?.state).toBe('conflict');
  expect(headerCellConflict.problems.find((problem) => problem.problemId === 'unit-qc')?.reasonCode).toBe('unit-qc');
});

test('unit conflicts are detected after the preview sample and conversion overflow stays invalid', async () => {
  const rows = Array.from({ length: 9 }, (_, index) => [
    'CPT-01',
    String((index + 1) * 0.1),
    index === 8 ? '1 MPa' : String(900 + index),
    String(980 + index),
    '12',
    '60',
    '1.2',
    '12.4',
    '3',
  ]);
  const lateConflict = await createPipeline(standardCsv(rows));
  expect(lateConflict.unitDecisions.find((unit) => unit.targetField === 'qc')?.state).toBe('conflict');

  const overflow = await createPipeline([
    'PointName,DepthM,QcMPa,FsKpa,FinalDepthM',
    'CPT-01,0.5,1e308,12,3',
  ].join('\n'));
  let confirmed = confirmFieldMapping(overflow, 'qc', context);
  expect(confirmed.problems.some((problem) => problem.message.includes('超过有效数值范围'))).toBe(true);
  expect(confirmed.readiness.canRunCheck).toBe(false);
});

test('a partially labeled unit column cannot silently apply one unit to unlabeled rows', async () => {
  let partial = await createPipeline([
    'PointName,DepthM,ConeResistance,FinalDepthM',
    'CPT-01,0.5,1 MPa,3',
    'CPT-01,1.0,900,3',
  ].join('\n'));
  partial = confirmFieldMapping(partial, 'qc', context);

  expect(partial.unitDecisions.find((unit) => unit.targetField === 'qc')).toMatchObject({
    detectedUnit: 'MPa',
    selectedUnit: null,
    state: 'conflict',
  });
  expect(partial.readiness.canNormalize).toBe(false);
  expect(partial.problems.find((problem) => problem.problemId === 'unit-qc')).toMatchObject({ eventId: 'DI-E15' });
  expect(setUnitDecision(partial, 'qc', 'MPa', context)).toBe(partial);
});

test('a blank value in a mapped PointName column cannot fall back to the current point', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
  ]));

  expect(pipeline.rows).toEqual([]);
  expect(pipeline.problems.find((problem) => problem.problemId === 'blank-point-2')).toMatchObject({
    eventId: 'DI-E10',
    rowIndex: 2,
    evidence: '空值',
  });
});

test('raw cells, extra columns, and physical row numbers remain traceable', async () => {
  const pipeline = await createPipeline([
    'PointName,DepthM,QcKpa,FsKpa,FinalDepthM',
    '',
    ' CPT-01 , 0.5 , 900 , 12 , 3 , extra evidence ',
  ].join('\n'));

  expect(pipeline.sourceRows[0]).toMatchObject({
    displayRowNumber: 3,
    cells: [' CPT-01 ', ' 0.5 ', ' 900 ', ' 12 ', ' 3 ', ' extra evidence '],
  });
  expect(pipeline.rows[0]).toMatchObject({ pointName: 'CPT-01', depthM: 0.5, qcKpa: 900, fsKpa: 12, finalDepthM: 0.5 });
});

test('invalid optional source values retain their raw provenance instead of becoming defaults', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '900', '980', 'oops', '60', '1.2', '12.4', '3'],
  ]));
  const sourcePrefix = `batch-test:source:1:${pipeline.sourceFingerprint.slice(0, 12)}`;

  expect(pipeline.normalizedRows[0].values.fs).toMatchObject({
    rawValue: 'oops',
    normalizedValue: null,
    origin: 'missing',
    sourceColumnId: `${sourcePrefix}:column:4`,
  });
  expect(pipeline.problems.some((problem) => problem.problemId.startsWith('non-numeric-fskpa'))).toBe(true);
  expect(pipeline.readiness).toMatchObject({
    canNormalize: false,
    canGenerateDrafts: false,
    reasons: expect.arrayContaining([
      expect.objectContaining({ reasonCode: 'non-numeric-fskpa-2', recovery: 'source-file', targetField: 'fs' }),
    ]),
  });
  expect(pipeline.readiness.canRunCheck).toBe(false);
});

test('normalization revision changes when provenance changes even if numeric rows stay equal', async () => {
  let pipeline = await createPipeline([
    'PointName,DepthM,Qc,FsKpa,FinalDepthM',
    'CPT-01,0.5,0,12,3',
  ].join('\n'));
  pipeline = confirmFieldMapping(pipeline, 'qc', context);
  pipeline = setUnitDecision(pipeline, 'qc', 'kPa', context);
  const beforeRows = pipeline.rows;
  const beforeRevision = pipeline.revisions.normalization;
  pipeline = setUnitDecision(pipeline, 'qc', 'MPa', context);

  expect(pipeline.rows).toEqual(beforeRows);
  expect(pipeline.normalizedRows[0].values.qc?.sourceUnit).toBe('MPa');
  expect(pipeline.revisions.normalization).toBe(beforeRevision + 1);
});

test('Unicode point problem IDs remain unique and cannot be dropped by deduplication', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['点位甲', '1.0', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['点位乙', '1.0', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
    ['点位甲', '0.5', '1100', '1180', '14', '70', '1.2', '12.4', '3'],
    ['点位乙', '0.5', '1200', '1280', '15', '75', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: '点位甲' });
  const depthProblems = pipeline.problems.filter((problem) => problem.eventId === 'DI-E13');

  expect(depthProblems).toHaveLength(2);
  expect(new Set(depthProblems.map((problem) => problem.problemId)).size).toBe(2);
  const selected = setPointSplitPlan(pipeline, 'split-selected', ['点位乙'], { ...context, currentPointName: '点位甲' });
  expect(selected.pointPlan.state).toBe('conflict');
  expect(selected.readiness.canGenerateDrafts).toBe(false);
});

test('ASCII point names with different separators cannot collide after ID normalization', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['A/B', '1.0', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['A-B', '1.0', '1000', '1080', '13', '65', '1.2', '12.4', '3'],
    ['A/B', '0.5', '1100', '1180', '14', '70', '1.2', '12.4', '3'],
    ['A-B', '0.5', '1200', '1280', '15', '75', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: 'A/B' });
  const depthProblems = pipeline.problems.filter((problem) => problem.eventId === 'DI-E13');
  expect(depthProblems).toHaveLength(2);
  expect(new Set(depthProblems.map((problem) => problem.problemId)).size).toBe(2);
  const selected = setPointSplitPlan(pipeline, 'split-selected', ['a-b'], { ...context, currentPointName: 'A/B' });
  expect(selected.pointPlan.state).toBe('conflict');
});

test('derived Fr provenance records both Fs and Qt dependencies', async () => {
  const pipeline = await createPipeline([
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,WaterDepthM,FinalDepthM',
    'CPT-01,0.5,900,1000,10,60,12.4,3',
  ].join('\n'));
  expect(pipeline.normalizedRows[0].values.fr).toMatchObject({
    origin: 'derived',
    derivedFrom: ['fs', 'qt'],
  });
});

test('an all-invalid point remains visible in the point plan with source-row evidence', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['A-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['B-01', '0.5', 'not-a-number', '1080', '13', '65', '1.2', '12.4', '3'],
  ]), { ...context, currentPointName: 'A-01' });
  const sourcePrefix = `batch-test:source:1:${pipeline.sourceFingerprint.slice(0, 12)}`;

  expect(pipeline.pointPlan.detectedPoints).toEqual([
    { pointKey: 'a-01', pointName: 'A-01', rowCount: 1 },
    { pointKey: 'b-01', pointName: 'B-01', rowCount: 1 },
  ]);
  expect(pipeline.problems.find((problem) => problem.problemId === 'point-no-readable-rows-b-01')).toMatchObject({
    eventId: 'DI-E12',
    detectedPointKey: 'b-01',
    recoveryTarget: 'source-file',
  });
  expect(pipeline.problems.find((problem) => problem.problemId.startsWith('non-numeric-qckpa'))).toMatchObject({
    sourceRowId: `${sourcePrefix}:row:1`,
    sourceColumnId: `${sourcePrefix}:column:2`,
  });

  const partial = setPointSplitPlan(pipeline, 'split-selected', ['a-01'], { ...context, currentPointName: 'A-01' });
  expect(partial.pointPlan).toMatchObject({ strategy: 'split-selected', state: 'ready', selectedPointKeys: ['a-01'] });
  expect(partial.pointPlan.executions).toEqual([
    expect.objectContaining({ detectedPointKey: 'a-01', status: 'pending' }),
    expect.objectContaining({ detectedPointKey: 'b-01', status: 'problem' }),
  ]);
  expect(partial.readiness.canGenerateDrafts).toBe(true);

  const all = setPointSplitPlan(pipeline, 'split-all', [], { ...context, currentPointName: 'A-01' });
  expect(all.pointPlan.state).toBe('conflict');
  expect(all.readiness.canGenerateDrafts).toBe(false);

  const cancelled = setPointSplitPlan(pipeline, 'cancelled', [], { ...context, currentPointName: 'A-01' });
  expect(cancelled.pointPlan).toMatchObject({ strategy: 'cancelled', state: 'cancelled', selectedPointKeys: [] });
  expect(cancelled.readiness.canGenerateDrafts).toBe(false);
});

test('final depth source columns remain attachments while final depth derives from max valid depth', async () => {
  const pipeline = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
    ['CPT-01', '1.0', '1000', '1080', '13', '65', '1.2', '12.4', '4'],
  ]));

  expect(pipeline.problems.find((problem) => problem.problemId === 'inconsistent-final-depth-cpt-01')).toBeUndefined();
  expect(pipeline.rows.map((row) => row.finalDepthM)).toEqual([1, 1]);
  expect(pipeline.readiness.canRunCheck).toBe(true);
});

test('constant point attribution allows a file without a PointName column', async () => {
  const undecided = await createCsvImportPipeline({
    batchId: 'batch-fixed-point',
    operationId: 'operation-fixed-point',
    fileName: 'fixed-point.csv',
    text: [
      'DepthM,QcKpa,FsKpa,FinalDepthM',
      '0.5,900,12,3',
      '1.0,980,13,3',
    ].join('\n'),
    ...context,
  });
  expect(undecided.readiness.canRunCheck).toBe(true);
  expect(undecided.pointAttribution).toEqual({ source: 'constant-name', pointName: 'CPT-01' });
  const pipeline = setPointAttributionDecision(
    undecided,
    { source: 'constant-name', pointName: 'FIXED-09' },
    context,
  );

  expect(pipeline.rows.map((row) => row.pointName)).toEqual(['FIXED-09', 'FIXED-09']);
  expect(pipeline.problems.some((problem) => problem.problemId === 'missing-pointname')).toBe(false);
  expect(pipeline.readiness.canRunCheck).toBe(true);
  expect(pipeline.revisions.pointPlan).toBe(2);
});

test('an existing-point attribution resolves its canonical name from project context', async () => {
  const existingContext: PipelineContext = {
    ...context,
    existingPoints: [{ pointId: 'point-existing-7', pointName: 'EXISTING-07' }],
  };
  const undecided = await createPipeline([
    'DepthM,QcKpa,FsKpa,FinalDepthM',
    '0.5,900,12,3',
  ].join('\n'), existingContext);
  const pipeline = setPointAttributionDecision(
    undecided,
    { source: 'existing-point', pointId: 'point-existing-7' },
    existingContext,
  );

  expect(pipeline.rows[0].pointName).toBe('EXISTING-07');
  expect(pipeline.pointAttribution).toEqual({ source: 'existing-point', pointId: 'point-existing-7' });
  expect(pipeline.readiness.canRunCheck).toBe(true);
});

test('quoted CSV parsing is deterministic and an obsolete operation is rejected', async () => {
  const csv = standardCsv([
    ['"CPT,01"', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
  ]);
  const first = await createPipeline(csv);
  const second = await createPipeline(csv);

  expect(first.sourceFingerprint).toBe(second.sourceFingerprint);
  expect(first.sourceRows).toEqual(second.sourceRows);
  expect(first.rows[0].pointName).toBe('CPT,01');
  expect(isCurrentImportOperation('operation-b', 'operation-a')).toBe(false);
  expect(isCurrentImportOperation('operation-b', 'operation-b')).toBe(true);
  expect(acceptImportOperationResult(first, { activeOperationId: 'operation-b' })).toEqual({
    accepted: false,
    reason: 'obsolete-operation',
  });
  expect(acceptImportOperationResult(first, { activeOperationId: 'operation-test' })).toMatchObject({ accepted: true });
});

test('replacing a source in the same batch advances revisions and cannot reuse row IDs', async () => {
  const first = await createPipeline(standardCsv([
    ['CPT-01', '0.5', '900', '980', '12', '60', '1.2', '12.4', '3'],
  ]));
  const second = await replaceCsvImportSource(first, {
    operationId: 'operation-replace',
    fileName: 'replacement.csv',
    text: standardCsv([
      ['CPT-01', '0.5', '1200', '1280', '15', '75', '1.2', '12.4', '3'],
    ]),
    ...context,
    now: '2026-07-10T15:00:00.000Z',
  });

  expect(second.batchId).toBe(first.batchId);
  expect(second.revisions).toEqual({ source: 2, mapping: 2, unit: 2, normalization: 2, pointPlan: 2 });
  expect(second.sourceRows[0].rowId).not.toBe(first.sourceRows[0].rowId);
  expect(second.sourceRows[0].rowId).toContain(':source:2:');
  expect(second.rows[0].qcKpa).toBe(1200);
  expect(acceptImportOperationResult(second, {
    activeOperationId: 'operation-replace',
    workspaceRevision: 999,
  })).toMatchObject({ accepted: true });

  const versioned = { ...second, baseWorkspaceRevision: 8 };
  expect(acceptImportOperationResult(versioned, {
    activeOperationId: 'operation-replace',
    workspaceRevision: 9,
  })).toEqual({ accepted: false, reason: 'workspace-revision-changed' });
});

function createPipeline(text: string, pipelineContext: PipelineContext = context): Promise<CsvImportPipelineV2> {
  return createCsvImportPipeline({
    batchId: 'batch-test',
    operationId: 'operation-test',
    fileName: 'generated.csv',
    text,
    ...pipelineContext,
    now: '2026-07-10T09:00:00.000Z',
  });
}

function standardCsv(rows: string[][]) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    ...rows.map((row) => row.join(',')),
  ].join('\n');
}

function batchFromPipeline(pipeline: CsvImportPipelineV2): ImportBatchDraftV2 {
  return {
    kind: 'draft',
    batchId: pipeline.batchId,
    operationId: pipeline.operationId,
    baseWorkspaceRevision: pipeline.baseWorkspaceRevision,
    sourceFingerprint: pipeline.sourceFingerprint,
    source: { mode: 'uploaded-csv', fileName: pipeline.fileName, fileType: 'CSV' },
    parseState: 'parsed',
    workflowState: 'ready-to-generate',
    sourceColumns: pipeline.sourceColumns,
    rawDataBlockId: `${pipeline.batchId}:raw:${pipeline.revisions.source}`,
    mappings: pipeline.mappings,
    unitDecisions: pipeline.unitDecisions,
    normalizedDataBlockId: null,
    pointAttribution: pipeline.pointAttribution,
    pointPlan: pipeline.pointPlan,
    problems: pipeline.problems,
    generatedDraftIds: [],
    revisions: pipeline.revisions,
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  };
}

function projectWithImportBatch(batch: ImportBatchDraftV2): ProjectWorkspaceV2 {
  return {
    projectId: 'project-cache-test',
    projectName: 'Cache test',
    mode: 'user',
    workspaceRevision: 1,
    points: [],
    activePointId: null,
    importBatches: [batch],
    activeImportBatchId: batch.batchId,
    activeRoute: 'import',
    activeBottomTab: 'issues',
    flowFeedback: '',
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  };
}
