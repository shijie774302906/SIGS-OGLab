import { basename } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { extractImportAssistantSource } from '../../src/features/import/importAssistantDomain';
import {
  buildQuickPlotRowsFromProposal,
  QUICK_PLOT_IMPORT_PROTOCOL,
  type QuickPlotImportProposal,
} from '../../src/features/quick/quickPlotAssistantDomain';
import { createQuickPlotResultPackage, createQuickPlotWorkspace } from '../../src/features/quick/quickPlotDomain';

const privateWorkbook = process.env.PROCESS157_PRIVATE_WORKBOOK;

test('PROCESS157 private independent-depth workbook remains read-only and produces aligned results', async () => {
  test.skip(!privateWorkbook, 'Set PROCESS157_PRIVATE_WORKBOOK for the local, non-public acceptance run.');
  const bytes = readFileSync(privateWorkbook!);
  const before = Buffer.from(bytes);
  const file = new File([bytes], basename(privateWorkbook!), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const source = await extractImportAssistantSource(file, 'process157-private-readonly');
  const rawData = source.sheets.find((sheet) => sheet.sheetName === 'Raw Data');
  expect(rawData).toBeTruthy();
  const proposal: QuickPlotImportProposal = {
    protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
    requestId: 'process157-private-request',
    operationId: source.operationId,
    sourceFingerprint: source.sourceFingerprint,
    contextHash: 'process157-private-context',
    proposalId: 'process157-private-proposal',
    proposalHash: '',
    layout: 'independent-series',
    sheetName: 'Raw Data',
    headerMode: 'present',
    headerRow: 21,
    dataStartRow: 23,
    dataEndRow: rawData!.rowCount,
    summary: 'Cone qt、PWP u2、Sleeve fs 使用各自右侧的深度列。',
    columns: [
      { sourceColumnIndex: 0, targetField: 'qc', sourceUnit: 'kPa', depthSourceColumnIndex: 1, depthSourceUnit: 'm', tipResistanceKind: 'qt', reason: 'Cone qt 与右侧 Depth 配对。' },
      { sourceColumnIndex: 2, targetField: 'u2', sourceUnit: 'kPa', depthSourceColumnIndex: 3, depthSourceUnit: 'm', reason: 'PWP u2 与右侧 Depth 配对。' },
      { sourceColumnIndex: 4, targetField: 'fs', sourceUnit: 'kPa', depthSourceColumnIndex: 5, depthSourceUnit: 'm', reason: 'Sleeve fs 与右侧 Depth 配对。' },
    ],
    ignoredColumns: [],
    warnings: [],
    ambiguityConfirmations: [],
  };
  const built = buildQuickPlotRowsFromProposal(proposal, source);
  expect('problem' in built).toBe(false);
  if ('problem' in built) return;
  expect(built.rows.length).toBeGreaterThan(60);
  expect(built.rows.every((row) => row.tipResistanceKind === 'qt')).toBe(true);
  expect(built.ledger.duplicateDepthRows.length).toBeGreaterThan(0);
  expect(built.ledger.alignment.u2Aligned).toBeGreaterThan(0);
  expect(built.ledger.alignment.layout).toBe('independent-series');

  const workspace = createQuickPlotWorkspace('private-independent-depth');
  workspace.rows = built.rows;
  workspace.settings.pressureBasisConfirmed = true;
  workspace.settings.u2Usage = 'total';
  const result = createQuickPlotResultPackage(workspace);
  expect(result.sourceRows).toHaveLength(built.rows.length);
  expect(result.derivedRows).toHaveLength(built.rows.length);
  expect(result.rows.every((row) => row.status === 'complete')).toBe(true);
  expect(result.rows.some((row) => row.derived?.qnetKpa !== null)).toBe(true);
  expect(readFileSync(privateWorkbook!)).toEqual(before);
});
