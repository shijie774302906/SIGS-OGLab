import { completePreparationGuide } from './fixtures/guidedPreparation';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';

const milestoneDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'import-mapping-ui');
const process133EvidenceEnabled = process.env.PROCESS133_EVIDENCE === '1';
const process133EvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process133-professional-recovery');

test('FLOW-IMPORT-01 confirms an alias mapping and an ambiguous MPa unit', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `映射单位项目 ${seed}`;
  const pointName = `CPT-MPA-${seed}`;
  const csv = [
    'PointName,DepthM,ConeResistance,FsKpa,FinalDepthM',
    `${pointName},0.5,1.25,12,3`,
    `${pointName},1.0,1.50,13,3`,
  ].join('\n');
  const fileName = `alias-mpa-${seed}.csv`;
  const inputPath = writeInput(testInfo, fileName, csv);
  const errors = captureErrors(page);

  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-first-look')).toContainText('暂不能检查');
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'ConeResistance' }).click();
  await expect(page.getByTestId('import-target-field-select')).toHaveValue('qc');

  const before = await readImportState(page, projectName);
  expect(before?.mapping.qc).toMatchObject({ state: 'confirmed', sourceHeader: 'ConeResistance' });
  expect(before?.unit.qc).toMatchObject({ detectedUnit: 'MPa', selectedUnit: null, state: 'needs-confirmation' });
  await captureMilestoneState(page, 'flow-import-01', 'candidate-mapping');

  await expect(page.getByTestId('import-source-unit-select')).toHaveValue('MPa');
  await expect(page.getByText(/1.25 MPa → 1250.00 kPa/)).toBeVisible();
  await page.getByTestId('apply-import-unit').click();

  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect(page.getByTestId('minimal-import-contract')).toBeVisible();
  const ready = await readImportState(page, projectName);
  expect(ready).toMatchObject({
    sourceFingerprint: sha256(csv),
    revisions: { mapping: before?.revisions.mapping, unit: (before?.revisions.unit ?? 0) + 1 },
    unit: { qc: { selectedUnit: 'MPa', state: 'confirmed' } },
    firstRow: { qcKpa: 1250 },
    pointName,
  });

  await completePreparationGuide(page);
  await expect.poll(() => readImportState(page, projectName)).toMatchObject({ check: { status: 'current', runCount: 1 } });
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const checked = await readImportState(page, projectName);
  expect(checked).toMatchObject({ check: { status: 'current', runCount: 1 } });
  await writeFlowEvidence(page, testInfo, 'flow-import-01', { seed, projectName, pointName, fileName, csv, before, ready, checked }, errors);
});

test('FLOW-IMPORT-02 maps an unknown depth column, cancels safely, then confirms m', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `缺字段恢复项目 ${seed}`;
  const pointName = `CPT-DEPTH-${seed}`;
  const csv = [
    'PointName,BoringLevel,QcKpa,FsKpa,FinalDepthM',
    `${pointName},0.5,900,12,3`,
    `${pointName},1.0,980,13,3`,
  ].join('\n');
  const fileName = `unknown-depth-${seed}.csv`;
  const inputPath = writeInput(testInfo, fileName, csv);
  const errors = captureErrors(page);

  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-problem-list')).toContainText('缺少必需字段 DepthM');
  const before = await readImportState(page, projectName);
  await captureMilestoneState(page, 'flow-import-02', 'missing-depth');

  await page.getByTestId('import-primary-fix-field').click();
  await expect(page.getByTestId('import-target-field-select')).toHaveValue('depthM');
  await page.getByTestId('import-target-field-select').selectOption('waterDepth');
  await page.getByTestId('cancel-import-mapping-edit').click();
  await expect(page.getByTestId('import-target-field-select')).toHaveValue('depthM');
  expect((await readImportState(page, projectName))?.revisions.mapping).toBe(before?.revisions.mapping);

  await page.getByTestId('apply-import-mapping').click();
  await expect.poll(() => readImportState(page, projectName)).toMatchObject({ mapping: { depthM: { state: 'confirmed', sourceHeader: 'BoringLevel' } } });
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'BoringLevel' }).click();
  await expect(page.getByTestId('import-source-unit-select')).toHaveValue('m');
  await page.getByTestId('apply-import-unit').click();

  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  const ready = await readImportState(page, projectName);
  expect(ready).toMatchObject({
    mapping: { depthM: { state: 'confirmed', sourceHeader: 'BoringLevel' } },
    unit: { depthM: { selectedUnit: 'm', state: 'confirmed' } },
    firstRow: { depthM: 0.5 },
    pointName,
  });
  expect(ready?.revisions.mapping).toBe((before?.revisions.mapping ?? 0) + 1);
  expect(ready?.revisions.unit).toBe((before?.revisions.unit ?? 0) + 1);
  await captureMilestoneState(page, 'flow-import-02', 'mapping-recovered');
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const checked = await readImportState(page, projectName);
  expect(checked).toMatchObject({ check: { status: 'current', runCount: 1 } });
  await writeFlowEvidence(page, testInfo, 'flow-import-02', { seed, projectName, pointName, fileName, csv, before, ready, checked }, errors);
});

test('FLOW-IMPORT-03 changing MPa to kPa invalidates the old check and rerun restores it', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `单位失效项目 ${seed}`;
  const pointName = `CPT-STALE-${seed}`;
  const csv = [
    'PointName,DepthM,ConeResistance,FsKpa,FinalDepthM',
    `${pointName},0.5,1.25,12,3`,
    `${pointName},1.0,1.50,13,3`,
  ].join('\n');
  const fileName = `unit-stale-${seed}.csv`;
  const inputPath = writeInput(testInfo, fileName, csv);
  const replacementCsv = [
    'PointName,DepthM,qc(kPa),FsKpa,FinalDepthM',
    `${pointName},0.5,1.25,12,3`,
    `${pointName},1.0,1.50,13,3`,
  ].join('\n');
  const replacementPath = writeInput(testInfo, `unit-stale-replacement-${seed}.csv`, replacementCsv);
  const errors = captureErrors(page);

  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'ConeResistance' }).click();
  await page.getByTestId('apply-import-unit').click();
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const checked = await readImportState(page, projectName);
  await seedCurrentDownstreamArtifacts(page, projectName);
  const siblingName = `${pointName}-SIBLING`;
  await seedSiblingPointOnActiveBatch(page, projectName, siblingName);
  await page.reload();
  const seeded = await readImportState(page, projectName);
  expect(seeded?.downstream).toEqual({ stratification: 'current', parameters: 'current', output: 'current' });
  const siblingBefore = await readSharedBatchArtifactStates(page, projectName);
  expect(siblingBefore).toEqual([
    { pointName, check: 'current', stratification: 'current', parameters: 'current', output: 'current' },
    { pointName: siblingName, check: 'current', stratification: 'current', parameters: 'current', output: 'current' },
  ]);

  await page.getByTestId('explorer-import').click();
  await page.getByTestId('import-file-input').setInputFiles(replacementPath);
  await expect(page.getByTestId('import-first-look')).toContainText('需要重新检查');
  await captureMilestoneState(page, 'flow-import-03', 'unit-stale-import');

  const stale = await readImportState(page, projectName);
  expect(stale).toMatchObject({
    unit: { qc: { selectedUnit: 'kPa', state: 'confirmed' } },
    firstRow: { qcKpa: 1.25 },
    check: {
      status: 'stale',
      runCount: 1,
      staleReason: '导入源文件已变化，需要重新运行数据检查。',
      recoveryField: null,
      recoveryReasonCode: 'IMPORT-SOURCE-CHANGED',
    },
    downstream: { stratification: 'stale', parameters: 'stale', output: 'stale' },
  });
  const siblingStale = await readSharedBatchArtifactStates(page, projectName);
  expect(siblingStale).toEqual([
    { pointName, check: 'stale', stratification: 'stale', parameters: 'stale', output: 'stale' },
    { pointName: siblingName, check: 'current', stratification: 'current', parameters: 'current', output: 'current' },
  ]);

  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('check-first-look')).toContainText('需要重新检查');
  await expect(page.getByTestId('flow-continue-stratification')).toHaveCount(0);
  await captureMilestoneState(page, 'flow-import-03', 'unit-stale-check');
  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const rerun = await readImportState(page, projectName);
  expect(rerun).toMatchObject({ check: { status: 'current', runCount: 2 } });
  await writeFlowEvidence(page, testInfo, 'flow-import-03', { seed, projectName, pointName, siblingName, fileName, csv, replacementCsv, checked, seeded, siblingBefore, stale, siblingStale, rerun }, errors);
});

test('FLOW-IMPORT-04 routine exact mapping stays hidden while source evidence remains current', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `最小映射项目 ${seed}`;
  const pointName = `CPT-MAP-${seed}`;
  const csv = [
    'PointName,Depth(m),qc(MPa),fs(kPa),u2(kPa),QtKpa,FinalDepthM,OperatorNote',
    `${pointName},0.5,0.920,12,60,999,3,source-a`,
    `${pointName},1.0,1.010,13,65,999,3,source-b`,
  ].join('\n');
  const fileName = `minimal-mapping-${seed}.csv`;
  const inputPath = writeInput(testInfo, fileName, csv);
  const errors = captureErrors(page);

  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await expect(page.getByTestId('import-first-look')).toContainText('可进入数据检查');
  await expect(page.getByTestId('advanced-import-mapping')).toHaveCount(0);
  await expect(page.getByTestId('minimal-import-contract')).toBeVisible();
  const ready = await readImportState(page, projectName);
  expect(ready).toMatchObject({ mapping: { depthM: { state: 'confirmed' }, qc: { state: 'confirmed' }, fs: { state: 'confirmed' }, u2: { state: 'confirmed' } } });
  expect(ready?.mapping.qt).toMatchObject({ state: 'missing', sourceHeader: null });
  expect(ready?.firstRow).toMatchObject({ qcKpa: 920, qtKpa: 920, finalDepthM: 1 });
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  const checked = await readImportState(page, projectName);
  expect(checked).toMatchObject({ check: { status: 'current', runCount: 1 } });
  await writeFlowEvidence(page, testInfo, 'flow-import-04', { seed, projectName, pointName, fileName, csv, ready, checked }, errors);
});

test('PROCESS133 clears the import page without deleting the saved source and accepts a replacement file', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const errors = captureErrors(page);
  const projectName = `重导恢复 ${seed}`;
  const firstPoint = `FIRST-${seed}`;
  const secondPoint = firstPoint;
  const firstCsv = [
    'PointName,DepthM,QcKpa,FsKpa',
    `${firstPoint},0.5,900,12`,
    `${firstPoint},1.0,980,13`,
  ].join('\n');
  const secondCsv = [
    'PointName,DepthM,QcKpa,FsKpa',
    `${secondPoint},0.5,1100,16`,
    `${secondPoint},1.0,1200,17`,
  ].join('\n');
  const firstPath = writeInput(testInfo, `first-${seed}.csv`, firstCsv);
  const secondPath = writeInput(testInfo, `second-${seed}.csv`, secondCsv);

  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(firstPath);
  await expect(page.getByTestId('import-active-batch-name')).toContainText(`first-${seed}.csv`);
  if (await page.getByTestId('probe-guide-dialog').isVisible().catch(() => false)) {
    await page.getByTestId('probe-guide-dialog').getByRole('button', { name: '暂不确认' }).last().click();
  }
  const savedBefore = await readImportState(page, projectName);
  if (process133EvidenceEnabled) {
    mkdirSync(process133EvidenceDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-reprocess-1440x900.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-reprocess-1920x1080.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.getByTestId('import-restart-page').click();
  await expect(page.getByTestId('restart-confirmation-dialog')).toContainText('不会删除已保存来源、检查记录和历史结果');
  if (process133EvidenceEnabled) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-clear-confirmation-1440x900.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-clear-confirmation-1920x1080.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByTestId('restart-confirmation-dialog').getByRole('button', { name: '取消' }).click();
  await expect(page.getByTestId('import-active-batch-name')).toContainText(`first-${seed}.csv`);
  await page.getByTestId('import-restart-page').click();
  await page.getByTestId('restart-confirmation-submit').click();
  await expect(page.getByTestId('import-first-look')).toContainText('当前项目还没有导入草稿');
  await expect(page.getByTestId('flow-toast')).toContainText('已保存的上一版来源仍保留');
  const savedAfterClear = await readImportState(page, projectName);
  expect(savedAfterClear).toMatchObject({
    sourceFingerprint: savedBefore?.sourceFingerprint,
    pointName: firstPoint,
    batchIds: savedBefore?.batchIds,
    draftIds: savedBefore?.draftIds,
    dataBlockIds: savedBefore?.dataBlockIds,
  });
  if (process133EvidenceEnabled) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-cleared-current-view-1440x900.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(process133EvidenceDir, 'import-cleared-current-view-1920x1080.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await page.reload();
  await expect(page.getByTestId('import-active-batch-name')).toContainText(`first-${seed}.csv`);
  await page.getByTestId('import-file-input').setInputFiles(secondPath);
  await expect(page.getByTestId('import-active-batch-name')).toContainText(`second-${seed}.csv`);
  await expect.poll(() => readImportState(page, projectName)).toMatchObject({
    sourceFingerprint: sha256(secondCsv),
    pointName: secondPoint,
    firstRow: { qcKpa: 1100 },
  });
  const savedAfterReplacement = await readImportState(page, projectName);
  expect(savedAfterReplacement).not.toBeNull();
  if (!savedAfterReplacement) throw new Error('replacement import state was not persisted');
  expect(savedAfterReplacement.batchIds).toEqual(expect.arrayContaining(savedBefore?.batchIds ?? []));
  expect(savedAfterReplacement.draftIds).toEqual(expect.arrayContaining(savedBefore?.draftIds ?? []));
  expect(savedAfterReplacement.dataBlockIds).toEqual(expect.arrayContaining(savedBefore?.dataBlockIds ?? []));
  expect(savedAfterReplacement.batchIds.length).toBe((savedBefore?.batchIds.length ?? 0) + 1);
  expect(savedAfterReplacement.draftIds.length).toBe((savedBefore?.draftIds.length ?? 0) + 1);
  if (process133EvidenceEnabled) {
    const layouts = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const layout = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('[data-testid="active-document"]');
        const dock = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
        return {
          viewport: { width: innerWidth, height: innerHeight },
          documentHorizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          mainHorizontalOverflowPx: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
          dockHorizontalOverflowPx: dock ? Math.max(0, dock.scrollWidth - dock.clientWidth) : 0,
        };
      });
      expect(layout.documentHorizontalOverflowPx).toBeLessThanOrEqual(1);
      expect(layout.mainHorizontalOverflowPx).toBeLessThanOrEqual(1);
      expect(layout.dockHorizontalOverflowPx).toBeLessThanOrEqual(1);
      layouts.push(layout);
    }
    writeFileSync(path.join(process133EvidenceDir, 'browser-check.json'), JSON.stringify({
      process: 133,
      seed,
      layouts,
      savedSourcePreservedAfterClear: savedBefore?.sourceFingerprint,
      replacementSourceFingerprint: sha256(secondCsv),
      immutableHistory: {
        before: {
          batchIds: savedBefore?.batchIds,
          draftIds: savedBefore?.draftIds,
          dataBlockIds: savedBefore?.dataBlockIds,
        },
        after: {
          batchIds: savedAfterReplacement.batchIds,
          draftIds: savedAfterReplacement.draftIds,
          dataBlockIds: savedAfterReplacement.dataBlockIds,
        },
      },
      browserErrors: errors,
    }, null, 2), 'utf8');
  }
});

test('PROCESS133 keeps route-only navigation out of the engineering save queue', async ({ page }, testInfo) => {
  const seed = randomSeed();
  const projectName = `导航性能 ${seed}`;
  const pointName = `NAV-${seed}`;
  const csv = [
    'PointName,DepthM,QcKpa,FsKpa',
    `${pointName},0.5,900,12`,
    `${pointName},1.0,980,13`,
  ].join('\n');
  const inputPath = writeInput(testInfo, `navigation-${seed}.csv`, csv);
  await createProjectAndOpenImport(page, projectName);
  await page.getByTestId('import-file-input').setInputFiles(inputPath);
  await dismissPreparationDialogs(page);
  await page.waitForTimeout(900);
  await dismissPreparationDialogs(page);
  const beforeRevision = await readManifestRevision(page);
  const timings: number[] = [];
  for (const target of [
    { button: 'explorer-project', document: 'document-project' },
    { button: 'explorer-import', document: 'document-import' },
    { button: 'explorer-project', document: 'document-project' },
    { button: 'explorer-import', document: 'document-import' },
  ]) {
    const startedAt = await page.evaluate(() => performance.now());
    await page.getByTestId(target.button).click();
    await expect(page.getByTestId(target.document)).toBeVisible();
    timings.push((await page.evaluate(() => performance.now())) - startedAt);
    await dismissPreparationDialogs(page);
  }
  await page.waitForTimeout(900);
  const afterRevision = await readManifestRevision(page);
  expect(afterRevision).toBe(beforeRevision);
  expect(Math.max(...timings)).toBeLessThan(500);
});

async function createProjectAndOpenImport(page: Page, projectName: string) {
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
}

async function readImportState(page: Page, projectName: string) {
  return page.evaluate(async (projectNameValue) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    if (!project || batch?.kind !== 'draft') return null;
    const point = project.points.find((candidate) => candidate.pointId === project.activePointId) ?? project.points[0] ?? null;
    const draft = point?.importDrafts.find((candidate) => candidate.draftId === point.activeImportDraftId) ?? null;
    const normalized = batch.normalizedDataBlockId
      ? loaded.dataBlocks.find((block) => block.dataBlockId === batch.normalizedDataBlockId)
      : null;
    const mapping = Object.fromEntries(batch.mappings.map((decision) => {
      const column = batch.sourceColumns.find((candidate) => candidate.columnId === decision.sourceColumnId);
      return [decision.targetField, { state: decision.state, sourceHeader: column?.header ?? null }];
    }));
    const unit = Object.fromEntries(batch.unitDecisions.map((decision) => [decision.targetField, {
      state: decision.state,
      detectedUnit: decision.detectedUnit,
      selectedUnit: decision.selectedUnit,
    }]));
    return {
      batchId: batch.batchId,
      batchIds: project.importBatches.map((candidate) => candidate.batchId),
      sourceFingerprint: batch.sourceFingerprint,
      revisions: batch.revisions,
      mapping,
      unit,
      mappingDecisions: batch.mappings,
      unitDecisions: batch.unitDecisions,
      pointPlan: batch.pointPlan,
      firstRow: normalized?.kind === 'normalized' ? normalized.rows[0] ?? null : null,
      pointName: point?.pointName ?? null,
      activeDraftId: draft?.draftId ?? null,
      draftIds: project.points.flatMap((candidate) => candidate.importDrafts.map((item) => item.draftId)),
      dataBlockIds: loaded.dataBlocks
        .filter((block) => project.importBatches.some((candidate) => candidate.batchId === block.batchId))
        .map((block) => block.dataBlockId),
      draftRevisions: draft?.revisions ?? null,
      valueProvenance: draft?.valueProvenance ?? null,
      check: {
        status: point?.checkState.artifact.status ?? 'empty',
        runCount: point?.checkState.runs.length ?? 0,
        staleReason: point?.checkState.artifact.staleReason ?? null,
        recoveryField: point?.checkState.artifact.recoveryTarget?.field ?? null,
        recoveryReasonCode: point?.checkState.artifact.recoveryTarget?.reasonCode ?? null,
        input: point?.checkState.artifact.input ?? null,
      },
      downstream: {
        stratification: point?.stratificationState.status ?? 'empty',
        parameters: point?.parameterState.status ?? 'empty',
        output: point?.outputState.status ?? 'empty',
      },
    };
  }, projectName);
}

async function readManifestRevision(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    return loaded.manifest.manifestRevision;
  });
}

async function dismissPreparationDialogs(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const probe = page.getByTestId('probe-guide-dialog');
    if (await probe.isVisible().catch(() => false)) {
      await probe.getByRole('button', { name: '暂不确认' }).last().click();
      continue;
    }
    const water = page.getByTestId('water-guide-dialog');
    if (await water.isVisible().catch(() => false)) {
      await water.getByRole('button', { name: '暂不确认' }).last().click();
      continue;
    }
    break;
  }
}

function writeInput(testInfo: TestInfo, fileName: string, csv: string) {
  const inputPath = testInfo.outputPath(fileName);
  writeFileSync(inputPath, csv, 'utf8');
  return inputPath;
}

function captureErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function writeFlowEvidence(
  page: Page,
  testInfo: TestInfo,
  flowName: string,
  evidence: Record<string, unknown>,
  errors: { consoleErrors: string[]; pageErrors: string[] },
) {
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
  const layouts: Awaited<ReturnType<typeof inspectLayout>>[] = [];
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const layout = await inspectLayout(page);
    expect(layout, JSON.stringify(layout, null, 2)).toMatchObject({
      bodyHorizontalOverflow: false,
      documentHorizontalOverflow: false,
      dockHorizontalOverflow: false,
    });
    if (layout.activeDocument === 'document-check') expect(layout.dockScrollTop).toBe(0);
    if (layout.activeDocument === 'document-import') expect(layout.mappingTableFullyVisible).toBe(true);
    layouts.push(layout);
    if (process.env.MILESTONE_EVIDENCE === '1' && viewport.width >= 1440) {
      mkdirSync(milestoneDir, { recursive: true });
      await page.screenshot({
        path: path.join(milestoneDir, `${flowName}-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }
  const payload = { flowName, ...evidence, layouts, errors, sourceSha256: sha256(String(evidence.csv ?? '')) };
  writeFileSync(testInfo.outputPath(`${flowName}-run.json`), JSON.stringify(payload, null, 2), 'utf8');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(milestoneDir, { recursive: true });
    writeFileSync(path.join(milestoneDir, `${flowName}-run.json`), JSON.stringify(payload, null, 2), 'utf8');
    writeFileSync(path.join(milestoneDir, String(evidence.fileName)), String(evidence.csv ?? ''), 'utf8');
  }
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    activeDocument: document.querySelector<HTMLElement>('[data-testid="active-document"] > *')?.dataset.testid ?? null,
    bodyHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    documentHorizontalOverflow: (() => {
      const element = document.querySelector<HTMLElement>('[data-testid="active-document"]');
      return element ? element.scrollWidth > element.clientWidth + 2 : true;
    })(),
    dockHorizontalOverflow: (() => {
      const element = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      return element ? element.scrollWidth > element.clientWidth + 2 : true;
    })(),
    dockScrollTop: document.querySelector<HTMLElement>('[data-testid="right-panel"]')?.scrollTop ?? -1,
    mappingTableFullyVisible: (() => {
      const element = document.querySelector<HTMLElement>('[data-testid="import-field-mapping"]');
      return element ? element.scrollWidth <= element.clientWidth + 2 : true;
    })(),
    overflowingElements: Array.from(document.querySelectorAll<HTMLElement>('[data-testid="active-document"] *'))
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        testId: element.dataset.testid ?? null,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      })),
  }));
}

async function captureMilestoneState(page: Page, flowName: string, stateName: string) {
  if (process.env.MILESTONE_EVIDENCE !== '1') return;
  mkdirSync(milestoneDir, { recursive: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="active-document"]')?.scrollTo({ top: 0, left: 0 });
      document.querySelector<HTMLElement>('[data-testid="right-panel"]')?.scrollTo({ top: 0, left: 0 });
    });
    const layout = await inspectLayout(page);
    expect(layout.bodyHorizontalOverflow).toBe(false);
    expect(layout.documentHorizontalOverflow).toBe(false);
    expect(layout.dockHorizontalOverflow).toBe(false);
    if (layout.activeDocument === 'document-import') expect(layout.mappingTableFullyVisible).toBe(true);
    await page.screenshot({
      path: path.join(milestoneDir, `${flowName}-${stateName}-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function seedCurrentDownstreamArtifacts(page: Page, projectName: string) {
  await page.evaluate(async (projectNameValue) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const domain = await import('/src/features/stratification/stratificationDomain.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const input = point?.checkState.artifact.input;
    const checkRunId = point?.checkState.activeRunId;
    if (!project || !point || !input || !checkRunId) throw new Error('Current check dependency is required.');
    const stratificationInput = domain.createStratificationInput(input, checkRunId);
    const created = domain.createBaseStratificationScheme(
      domain.emptyStratificationWorkspace(),
      stratificationInput,
      0.5,
      Math.max(1, point.finalDepthM),
      '单位失效测试方案',
    );
    if (!created.ok) throw new Error(created.problem);
    const layerId = created.workspace.editSession?.working.layers[0]?.layerId;
    if (!layerId) throw new Error('Stratification layer is required.');
    const confirmed = domain.applyStratificationCommand(created.workspace, { kind: 'set-layer-soil-classification', layerId, engineeringSoilGroup: 'sand', detailedSoilType: '粉砂' });
    if (!confirmed.ok) throw new Error(confirmed.problem);
    const committed = domain.commitStratificationEdit(confirmed.workspace, stratificationInput);
    if (!committed.ok) throw new Error(committed.problem);
    const revision = committed.workspace.revisions?.find((candidate) => candidate.schemeId === committed.scheme.schemeId && candidate.version === committed.scheme.version);
    if (!revision) throw new Error('Committed stratification revision is required.');
    point.stratificationWorkspace = committed.workspace;
    const artifact = {
      status: 'current' as const,
      input: structuredClone(input),
      sourceCheckRunId: checkRunId,
      sourceStratificationSchemeId: committed.scheme.schemeId,
      sourceStratificationRevisionId: revision.revisionId,
    };
    point.stratificationState = structuredClone(artifact);
    point.parameterState = structuredClone(artifact);
    point.outputState = structuredClone(artifact);
    project.workspaceRevision += 1;
    project.updatedAt = new Date().toISOString();
    const previousRevision = loaded.manifest.manifestRevision;
    loaded.manifest.manifestRevision += 1;
    loaded.manifest.savedAt = new Date().toISOString();
    const saved = await database.saveWorkspaceV2(loaded.manifest, loaded.dataBlocks, {
      expectedManifestRevision: previousRevision,
    });
    if (!saved.ok) throw new Error(saved.detail);
  }, projectName);
}

async function seedSiblingPointOnActiveBatch(page: Page, projectName: string, siblingName: string) {
  await page.evaluate(async ({ projectNameValue, siblingNameValue }) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const batch = project?.importBatches.find((candidate) => candidate.batchId === project.activeImportBatchId);
    if (!project || !point || !batch || batch.kind !== 'draft') throw new Error('Active point and draft batch are required.');
    const sibling = structuredClone(point);
    sibling.pointId = `${point.pointId}-sibling`;
    sibling.pointName = siblingNameValue;
    sibling.aliases = [];
    const draftIdMap = new Map<string, string>();
    sibling.importDrafts = sibling.importDrafts.map((draft) => {
      const draftId = `${draft.draftId}-sibling`;
      draftIdMap.set(draft.draftId, draftId);
      // The project point is a renamed target; keep the original source identity so
      // its row references remain traceable to the shared import batch.
      return { ...draft, draftId, pointId: sibling.pointId };
    });
    sibling.activeImportDraftId = draftIdMap.get(point.activeImportDraftId ?? '') ?? sibling.importDrafts[0]?.draftId ?? null;
    const rebind = (input: NonNullable<typeof point.checkState.artifact.input>) => ({
      ...structuredClone(input),
      pointId: sibling.pointId,
      draftId: draftIdMap.get(input.draftId) ?? input.draftId,
    });
    sibling.checkState.runs = sibling.checkState.runs.map((run) => ({ ...run, input: rebind(run.input) }));
    if (sibling.checkState.artifact.input) sibling.checkState.artifact.input = rebind(sibling.checkState.artifact.input);
    if (sibling.stratificationState.input) sibling.stratificationState.input = rebind(sibling.stratificationState.input);
    if (sibling.parameterState.input) sibling.parameterState.input = rebind(sibling.parameterState.input);
    if (sibling.outputState.input) sibling.outputState.input = rebind(sibling.outputState.input);
    if (sibling.stratificationWorkspace) {
      sibling.stratificationWorkspace.schemes = sibling.stratificationWorkspace.schemes.map((scheme) => ({
        ...scheme,
        input: rebind(scheme.input),
      }));
      sibling.stratificationWorkspace.revisions = sibling.stratificationWorkspace.revisions?.map((revision) => ({
        ...revision,
        snapshot: { ...revision.snapshot, input: rebind(revision.snapshot.input) },
      }));
    }
    project.points.push(sibling);
    batch.generatedDraftIds.push(...sibling.importDrafts.map((draft) => draft.draftId));
    project.workspaceRevision += 1;
    project.updatedAt = new Date().toISOString();
    const previousRevision = loaded.manifest.manifestRevision;
    loaded.manifest.manifestRevision += 1;
    loaded.manifest.savedAt = new Date().toISOString();
    const saved = await database.saveWorkspaceV2(loaded.manifest, loaded.dataBlocks, { expectedManifestRevision: previousRevision });
    if (!saved.ok) throw new Error(saved.detail);
  }, { projectNameValue: projectName, siblingNameValue: siblingName });
}

async function readSharedBatchArtifactStates(page: Page, projectName: string) {
  return page.evaluate(async (projectNameValue) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === projectNameValue);
    return project?.points.map((point) => ({
      pointName: point.pointName,
      check: point.checkState.artifact.status,
      stratification: point.stratificationState.status,
      parameters: point.parameterState.status,
      output: point.outputState.status,
    })).sort((left, right) => left.pointName.localeCompare(right.pointName)) ?? null;
  }, projectName);
}

function randomSeed() {
  return `${Date.now() % 100000000}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
