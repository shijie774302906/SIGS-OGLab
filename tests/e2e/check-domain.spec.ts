import { expect, test } from '@playwright/test';
import {
  canContinueFromCheck,
  filterCheckIssues,
  getCheckDecision,
  getCheckEvidenceRows,
  getCheckHandoffGate,
  getImportDraftCheckIssues,
  getIssueCounts,
} from '../../src/features/check/checkDomain';
import { isImportDraftCheckable } from '../../src/features/import/importDomain';
import type { ImportDraft } from '../../src/features/workflow/types';
import type { CheckIssue, SyntheticFlowCase } from '../../src/workflowData';

function createReadyDraft(seed = '53001'): { flowCase: SyntheticFlowCase; draft: ImportDraft } {
  const pointName = `AUTO-CPTU-${seed.slice(-5)}`;
  const rows = Array.from({ length: 10 }, (_, index) => {
    const depthM = (index + 1) * 0.5;
    const qcKpa = 900 + index * 55;
    const qtKpa = qcKpa + 80;
    const fsKpa = 12 + index;
    return {
      pointName,
      depthM,
      qcKpa,
      qtKpa,
      fsKpa,
      u2Kpa: 60 + index * 4,
      frPercent: (100 * fsKpa) / qtKpa,
      waterDepthM: 12.4,
      finalDepthM: 8,
    };
  });
  const flowCase: SyntheticFlowCase = {
    flowId: 'flow-1-data-prep-check',
    scenario: 'valid-with-notice',
    seed,
    caseId: `F1-RANDOM-${seed}`,
    generatedAt: '2026-07-10T00:00:00.000Z',
    sourceType: 'synthetic-csv',
    project: { projectId: `project-${seed}`, projectName: '测试工程' },
    point: {
      pointId: pointName,
      pointName,
      pointAlias: 'CPT9-19-S1',
      waterDepthM: 12.4,
      finalDepthM: 8,
    },
    importBatch: { batchId: `batch-${seed}`, batchName: `${pointName}.csv` },
    rows,
  };
  return {
    flowCase,
    draft: {
      sourceMode: 'uploaded-csv',
      fileName: `${flowCase.point.pointName}.csv`,
      fileType: 'CSV',
      status: 'ready',
      message: '导入草稿已生成。',
      version: 42,
      headers: ['PointName', 'DepthM', 'QcKpa', 'QtKpa', 'FsKpa', 'U2Kpa', 'FrPercent', 'WaterDepthM', 'FinalDepthM'],
      rawPreview: [],
      rows: flowCase.rows,
      problems: [],
      pointName: flowCase.point.pointName,
      filePointNames: [flowCase.point.pointName],
      pointDecision: 'matches-current',
      waterDepthM: flowCase.point.waterDepthM,
      finalDepthM: flowCase.point.finalDepthM,
      generatedAt: flowCase.generatedAt,
    },
  };
}

test('check domain derives not-run, stale, notice, and clear decisions', () => {
  const { flowCase, draft } = createReadyDraft();

  const notRunIssues = getImportDraftCheckIssues(flowCase, draft, 'CHECK-1', null);
  expect(getCheckDecision(draft, notRunIssues, null).state).toBe('not-run');
  expect(canContinueFromCheck(draft, notRunIssues, null)).toBe(false);
  expect(getCheckHandoffGate(draft, notRunIssues, null, 'empty')).toMatchObject({ state: 'deny', recovery: 'check' });

  const staleIssues = getImportDraftCheckIssues(flowCase, draft, 'CHECK-1', 41);
  expect(getCheckDecision(draft, staleIssues, 41).state).toBe('stale');
  expect(getCheckDecision(draft, noticeIssuesForForcedStale(draft, flowCase), 42, 'stale').state).toBe('stale');

  const importIssueDraft: ImportDraft = {
    ...draft,
    status: 'error',
    problems: [
      {
        problemId: 'missing-depth',
        eventId: 'DI-E06',
        severity: 'issue',
        title: '缺少深度字段',
        message: '未识别 DepthM。',
        action: '返回数据导入补充 DepthM。',
        fieldName: 'DepthM',
      },
    ],
  };
  expect(getCheckDecision(importIssueDraft, notRunIssues, null).state).toBe('import-issue');

  const noticeIssues = getImportDraftCheckIssues(flowCase, draft, 'CHECK-2', 42);
  expect(getCheckDecision(draft, noticeIssues, 42).state).toBe('notice');
  expect(canContinueFromCheck(draft, noticeIssues, 42)).toBe(true);
  expect(getCheckHandoffGate(draft, noticeIssues, 42, 'current')).toMatchObject({ state: 'warn', recovery: 'stratification' });

  const clearIssues: CheckIssue[] = [
    {
      issueId: 'clear',
      title: '检查完成',
      severity: 'passed',
      route: 'check',
      source: draft.fileName,
      detail: '无问题',
      nextAction: '进入地层分层。',
    },
  ];
  expect(getCheckDecision(draft, clearIssues, 42).state).toBe('clear');
  expect(getCheckHandoffGate(draft, clearIssues, 42, 'current')).toMatchObject({ state: 'allow', recovery: 'stratification' });
});

function noticeIssuesForForcedStale(draft: ImportDraft, flowCase: SyntheticFlowCase) {
  return getImportDraftCheckIssues(flowCase, draft, 'CHECK-FORCED-STALE', draft.version);
}

test('CHK-E11 is a check-stage qc problem with row evidence and recovery field', () => {
  const { flowCase, draft } = createReadyDraft('53002');
  const affectedIndex = 4;
  const rows = draft.rows.map((row, index) => (index === affectedIndex ? { ...row, qcKpa: -25 } : row));
  const issueDraft = { ...draft, rows };

  expect(isImportDraftCheckable(issueDraft)).toBe(true);
  const issues = getImportDraftCheckIssues(flowCase, issueDraft, 'CHECK-QC', issueDraft.version);
  const counts = getIssueCounts(issues);
  const qcIssue = filterCheckIssues(issues, 'issue').find((issue) => issue.issueId === 'check-qc-positive');

  expect(counts.blocking).toBe(1);
  expect(qcIssue?.fieldName).toBe('QcKpa');
  expect(qcIssue?.rowIndexFrom).toBe(affectedIndex + 1);
  expect(getCheckDecision(issueDraft, issues, issueDraft.version).state).toBe('issue');
  expect(canContinueFromCheck(issueDraft, issues, issueDraft.version)).toBe(false);
  expect(getCheckEvidenceRows(qcIssue!, issueDraft)[0]).toMatchObject({
    rowIndex: affectedIndex + 1,
    qcKpa: -25,
  });
});
