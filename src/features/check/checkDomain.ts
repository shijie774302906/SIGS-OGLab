import type { CheckIssue, SyntheticFlowCase } from '../../workflowData';
import { isImportDraftCheckable } from '../import/importDomain';
import type { CheckFilter, ImportDraft } from '../workflow/types';

export type CheckDecisionAction = 'return-import' | 'run-check' | 'continue';
export type CheckDecisionTone = 'primary' | 'success' | 'issue' | 'stale';

export type CheckDecision = {
  state: 'import-issue' | 'not-run' | 'stale' | 'issue' | 'notice' | 'clear';
  headline: string;
  body: string;
  stateLabel: string;
  action: CheckDecisionAction;
  actionLabel: string;
  tone: CheckDecisionTone;
};

export type CheckArtifactStatus = 'empty' | 'current' | 'problem' | 'stale';

export type CheckHandoffGate = {
  state: 'allow' | 'warn' | 'deny';
  label: string;
  reason: string;
  recovery: 'stratification' | 'check' | 'import';
};

export function getImportDraftCheckIssues(
  _flowCase: SyntheticFlowCase,
  draft: ImportDraft,
  _checkRunId: string,
  checkedDraftVersion: number | null,
  staleContext?: { reason?: string; field?: string; reasonCode?: string; stale?: boolean },
): CheckIssue[] {
  if (checkedDraftVersion === null) {
    return [
      {
        issueId: 'check-not-run',
        title: '尚未运行检查',
        severity: 'blocking',
        route: 'check',
        source: draft.fileName,
        detail: '当前导入草稿还没有运行数据检查，不能直接进入地层分层。',
        nextAction: isImportDraftCheckable(draft) ? '运行数据检查。' : '返回数据导入处理文件来源。',
        fieldName: 'CheckRun',
        workflowImpact: '未检查',
      },
    ];
  }

  if (staleContext?.stale || checkedDraftVersion !== draft.version) {
    const recoveryField = importRecoveryFieldLabel(staleContext?.field);
    return [
      {
        issueId: 'check-import-stale',
        title: '导入草稿已变更',
        severity: 'blocking',
        route: 'check',
        source: draft.fileName,
        detail: staleContext?.reason ?? '导入草稿在上次数据检查后已经更新，旧检查结论不能继续用于后续页面。',
        nextAction: recoveryField ? `返回数据导入定位 ${recoveryField}，确认后重新运行数据检查。` : '重新运行数据检查。',
        fieldName: recoveryField ?? 'ImportDraft',
        workflowImpact: '需重新检查',
      },
    ];
  }

  if (!isImportDraftCheckable(draft)) {
    const firstIssue = draft.problems.find((problem) => problem.severity === 'issue');
    return [
      {
        issueId: 'check-import-draft',
        title: '导入草稿',
        severity: 'blocking',
        route: 'check',
        source: draft.fileName,
        detail: firstIssue?.message ?? draft.message,
        nextAction: '返回数据导入处理文件来源。',
        fieldName: firstIssue?.fieldName ?? 'ImportDraft',
        rowIndexFrom: firstIssue?.rowIndex,
        rowIndexTo: firstIssue?.rowIndex,
        sourceRowId: firstIssue?.sourceRowId,
        workflowImpact: '存在问题',
      },
    ];
  }

  const depths = draft.rows.map((row) => row.depthM);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  const firstBadDepthIndex = draft.rows.findIndex(
    (row, index) => index > 0 && row.depthM <= draft.rows[index - 1].depthM,
  );
  const positiveDepthSteps = depths.slice(1).map((depth, index) => depth - depths[index]).filter((step) => step > 0).sort((left, right) => left - right);
  const medianDepthStep = positiveDepthSteps.length ? positiveDepthSteps[Math.floor(positiveDepthSteps.length / 2)] : 0;
  const depthGapThreshold = Math.max(0.1, medianDepthStep * 5);
  const depthGaps = draft.rows.slice(1).map((row, index) => ({
    index: index + 1,
    previousDepthM: draft.rows[index].depthM,
    depthM: row.depthM,
    gapM: row.depthM - draft.rows[index].depthM,
  })).filter((gap) => gap.gapM > depthGapThreshold);
  const firstDepthGap = depthGaps[0];
  const firstNonpositiveQcIndex = draft.rows.findIndex((row) => row.qcKpa <= 0);
  const anomalyRows = draft.rows.flatMap((row, index) => {
    const neighbors = draft.rows.slice(Math.max(0, index - 2), Math.min(draft.rows.length, index + 3));
    if (neighbors.length < 3) return [];
    const qcMedian = numericMedian(neighbors.map((candidate) => candidate.qcKpa));
    const qcMad = numericMedian(neighbors.map((candidate) => Math.abs(candidate.qcKpa - qcMedian)));
    return Math.abs(row.qcKpa - qcMedian) > Math.max(100, qcMad * 6)
      ? [{ row, index, qcMedian }]
      : [];
  });
  const firstAnomaly = anomalyRows[0];
  const exceedsFinalDepth = maxDepth > draft.finalDepthM;
  const noticeRow = draft.rows[Math.floor(draft.rows.length * 0.62)] ?? draft.rows[0];
  const optionalOrigins = ['qt', 'fs', 'u2', 'fr', 'waterDepth']
    .map((field) => describeProvenance(field, draft.valueProvenance?.[field]))
    .join('；');
  const waterDepthOrigin = describeProvenance('WaterDepthM', draft.valueProvenance?.waterDepth);
  const frOrigin = describeProvenance('Fr', draft.valueProvenance?.fr);
  const hasU2Channel = draft.valueProvenance?.u2?.origin === 'source';
  const issues: CheckIssue[] = [
    {
      issueId: 'check-required-fields',
      title: '必需字段',
      severity: 'passed',
      route: 'check',
      source: draft.fileName,
      detail: `必需字段 PointName、DepthM、Qc、FinalDepthM 已确认。建议字段来源：${optionalOrigins}。`,
      nextAction: '继续检查深度、单位和建议字段来源。',
      fieldName: 'Depth / qc / fs',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: 1,
      rowIndexTo: draft.rows.length,
      workflowImpact: '无问题',
    },
    {
      issueId: 'check-depth-monotonicity',
      title: '深度递增',
      severity: firstBadDepthIndex >= 0 || exceedsFinalDepth ? 'blocking' : 'passed',
      route: 'check',
      source: draft.pointName,
      detail:
        firstBadDepthIndex >= 0
          ? `第 ${firstBadDepthIndex + 1} 行附近深度未递增，需要返回导入预览核对。`
          : exceedsFinalDepth
            ? `最大深度 ${maxDepth.toFixed(2)} m 超过最终孔深 ${draft.finalDepthM.toFixed(1)} m。`
            : `导入草稿共 ${draft.rows.length} 行，深度严格递增，未超过最终孔深 ${draft.finalDepthM.toFixed(1)} m。`,
      nextAction: firstBadDepthIndex >= 0 || exceedsFinalDepth ? '返回数据导入修改深度字段。' : '可进入检查结论判断。',
      fieldName: 'DepthM',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: firstBadDepthIndex >= 0 ? firstBadDepthIndex + 1 : 1,
      rowIndexTo: firstBadDepthIndex >= 0 ? firstBadDepthIndex + 2 : draft.rows.length,
      sourceRowId: firstBadDepthIndex >= 0 ? draft.sourceRowIds?.[firstBadDepthIndex] : undefined,
      workflowImpact: firstBadDepthIndex >= 0 || exceedsFinalDepth ? '存在问题' : '无问题',
    },
    {
      issueId: 'check-qc-positive',
      title: 'qc 正值检查',
      severity: firstNonpositiveQcIndex >= 0 ? 'blocking' : 'passed',
      route: 'check',
      source: draft.fileName,
      detail:
        firstNonpositiveQcIndex >= 0
          ? `第 ${firstNonpositiveQcIndex + 1} 行 qc=${draft.rows[firstNonpositiveQcIndex].qcKpa.toFixed(1)} kPa，qc 必须大于 0。`
          : `共 ${draft.rows.length} 行 qc 均大于 0。`,
      nextAction: firstNonpositiveQcIndex >= 0 ? '返回数据导入定位 QcKpa，并上传修正后的文件。' : '继续检查提示项。',
      fieldName: 'QcKpa',
      depthFromM: firstNonpositiveQcIndex >= 0 ? draft.rows[firstNonpositiveQcIndex].depthM : minDepth,
      depthToM: firstNonpositiveQcIndex >= 0 ? draft.rows[firstNonpositiveQcIndex].depthM : maxDepth,
      rowIndexFrom: firstNonpositiveQcIndex >= 0 ? firstNonpositiveQcIndex + 1 : 1,
      rowIndexTo: firstNonpositiveQcIndex >= 0 ? firstNonpositiveQcIndex + 1 : draft.rows.length,
      sourceRowId: firstNonpositiveQcIndex >= 0 ? draft.sourceRowIds?.[firstNonpositiveQcIndex] : undefined,
      workflowImpact: firstNonpositiveQcIndex >= 0 ? '存在问题' : '无问题',
    },
    ...(firstAnomaly ? (anomalyRows.length <= 50 ? anomalyRows : [firstAnomaly]).map((anomaly, index) => ({
      issueId: index === 0 ? 'check-isolated-qc-anomaly' : `check-isolated-qc-anomaly:${draft.sourceRowIds?.[anomaly.index] ?? anomaly.index}`,
      title: 'qc 孤立异常',
      severity: 'warning' as const,
      route: 'check' as const,
      source: draft.fileName,
      detail: anomalyRows.length <= 50
        ? `第 ${anomaly.index + 1} 行 qc=${anomaly.row.qcKpa.toFixed(1)} kPa，与局部中位数 ${anomaly.qcMedian.toFixed(1)} kPa 显著偏离。`
        : `发现 ${anomalyRows.length} 行 qc 与局部中位数显著偏离；首行为第 ${firstAnomaly.index + 1} 行。`,
      nextAction: anomalyRows.length <= 50
        ? '可保留、手动修正或删除该测点；该提示本身不影响继续。'
        : '问题数量较多，请返回导入页核对单位或源数据。',
      fieldName: 'qc',
      depthFromM: anomaly.row.depthM,
      depthToM: anomaly.row.depthM,
      rowIndexFrom: anomaly.index + 1,
      rowIndexTo: anomaly.index + 1,
      sourceRowId: draft.sourceRowIds?.[anomaly.index],
      workflowImpact: '仅提示',
      evidenceScope: 'single-row' as const,
      evidenceGroupKey: 'isolated-qc-anomaly',
    })) : []),
    ...(firstDepthGap ? [{
      issueId: 'check-depth-gaps',
      title: '深度间断',
      severity: 'warning' as const,
      route: 'check' as const,
      source: draft.fileName,
      detail: `发现 ${depthGaps.length} 处深度间断；首处由 ${firstDepthGap.previousDepthM.toFixed(2)} m 跳至 ${firstDepthGap.depthM.toFixed(2)} m（间隔 ${firstDepthGap.gapM.toFixed(2)} m）。`,
      nextAction: '返回数据导入核对首个间断前后的 Excel 来源行；确认属于停测区间时可保留提示并继续。',
      fieldName: 'DepthM',
      depthFromM: firstDepthGap.previousDepthM,
      depthToM: firstDepthGap.depthM,
      rowIndexFrom: firstDepthGap.index,
      rowIndexTo: firstDepthGap.index + 1,
      sourceRowId: draft.sourceRowIds?.[firstDepthGap.index],
      workflowImpact: '仅提示',
      evidenceScope: 'depth-range' as const,
    }] : []),
    ...(hasU2Channel ? [{
      issueId: 'check-water-depth-source',
      title: '水深来源',
      severity: 'warning' as const,
      route: 'check' as const,
      source: draft.fileName,
      detail: `水深 ${draft.waterDepthM.toFixed(3)} m；${waterDepthOrigin}。`,
      nextAction: '复核点位水深来源；该提示影响整孔 CPTU 修正上下文，但不影响进入地层分层。',
      fieldName: 'WaterDepthM',
      workflowImpact: '仅提示',
      evidenceScope: 'point-context' as const,
    }] : []),
    {
      issueId: 'check-fr-range-notice',
      title: 'Fr 范围提示',
      severity: 'warning' as const,
      route: 'check' as const,
      source: frOrigin,
      detail: `第 ${Math.floor(draft.rows.length * 0.62) + 1} 行 Fr=${noticeRow.frPercent.toFixed(3)}%；${frOrigin}。`,
      nextAction: '作为提示保留，不影响进入地层分层。',
      fieldName: 'Fr',
      depthFromM: noticeRow.depthM,
      depthToM: noticeRow.depthM,
      rowIndexFrom: Math.floor(draft.rows.length * 0.62) + 1,
      rowIndexTo: Math.floor(draft.rows.length * 0.62) + 1,
      sourceRowId: draft.sourceRowIds?.[Math.floor(draft.rows.length * 0.62)],
      workflowImpact: '仅提示',
    },
  ];

  if (!issues.some((issue) => issue.severity === 'blocking')) {
    issues.push({
      issueId: 'check-continue-stratification',
      title: '进入地层分层判断',
      severity: 'passed',
      route: 'check',
      source: '当前检查',
      detail: '当前导入草稿没有存在问题项，仅保留提示记录，可进入地层分层。',
      nextAction: '进入地层分层。',
      fieldName: 'CheckRun',
      depthFromM: minDepth,
      depthToM: maxDepth,
      rowIndexFrom: 1,
      rowIndexTo: draft.rows.length,
      workflowImpact: '可进入地层分层',
    });
  }

  return issues;
}

function numericMedian(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function importRecoveryFieldLabel(field?: string) {
  return {
    pointName: 'PointName',
    depthM: 'DepthM',
    qc: 'QcKpa',
    qt: 'QtKpa',
    fs: 'FsKpa',
    u2: 'U2Kpa',
    fr: 'FrPercent',
    waterDepth: 'WaterDepthM',
    finalDepth: 'FinalDepthM',
  }[field ?? ''];
}

function describeProvenance(fieldLabel: string, provenance: NonNullable<ImportDraft['valueProvenance']>[string] | undefined) {
  if (!provenance || provenance.origin === 'missing') return `${fieldLabel} 缺失`;
  if (provenance.origin === 'source') return `${fieldLabel} 来自源字段`;
  if (provenance.origin === 'derived') {
    return `${fieldLabel} 由 ${(provenance.derivedFrom ?? []).join('、') || '其他字段'} 派生`;
  }
  return `${fieldLabel} 默认补齐${provenance.defaultReason ? `（${provenance.defaultReason}）` : ''}`;
}

export function getIssueCounts(issues: CheckIssue[]) {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { blocking: 0, warning: 0, passed: 0 },
  );
}

export function filterCheckIssues(issues: CheckIssue[], filter: CheckFilter) {
  if (filter === 'all') return issues;
  if (filter === 'issue') return issues.filter((issue) => issue.severity === 'blocking');
  if (filter === 'notice') return issues.filter((issue) => issue.severity === 'warning');
  return issues.filter((issue) => issue.severity === 'passed');
}

export function checkFilterLabel(filter: CheckFilter) {
  const labels: Record<CheckFilter, string> = {
    all: '全部',
    issue: '存在问题',
    notice: '仅提示',
    passed: '通过',
  };
  return labels[filter];
}

export function getCheckStateLabel(
  draft: ImportDraft,
  issues: CheckIssue[],
  checkedDraftVersion: number | null,
  artifactStatus?: CheckArtifactStatus,
) {
  if (checkedDraftVersion === null) return '未检查';
  if (artifactStatus === 'stale' || checkedDraftVersion !== draft.version) return '需重新检查';
  const counts = getIssueCounts(issues);
  if (counts.blocking) return '存在问题';
  if (counts.warning) return '仅提示';
  return '无问题';
}

export function canContinueFromCheck(
  draft: ImportDraft,
  issues: CheckIssue[],
  checkedDraftVersion: number | null,
  artifactStatus?: CheckArtifactStatus,
) {
  return (
    getIssueCounts(issues).blocking === 0 &&
    isImportDraftCheckable(draft) &&
    checkedDraftVersion !== null &&
    checkedDraftVersion === draft.version &&
    artifactStatus !== 'stale' &&
    artifactStatus !== 'empty'
  );
}

export function getCheckDecision(
  draft: ImportDraft,
  issues: CheckIssue[],
  checkedDraftVersion: number | null,
  artifactStatus?: CheckArtifactStatus,
): CheckDecision {
  if (!isImportDraftCheckable(draft)) {
    const problem = draft.problems.find((item) => item.severity === 'issue');
    return {
      state: 'import-issue',
      headline: '导入草稿存在问题，暂不能检查',
      body: problem ? `${problem.title}：${problem.action}` : '返回数据导入处理文件或字段后再运行检查。',
      stateLabel: '存在问题',
      action: 'return-import',
      actionLabel: '返回数据导入',
      tone: 'issue',
    };
  }
  if (checkedDraftVersion === null) {
    return {
      state: 'not-run',
      headline: '当前导入草稿尚未检查',
      body: '运行数据检查后，才能判断是否可以进入地层分层。',
      stateLabel: '未检查',
      action: 'run-check',
      actionLabel: '运行数据检查',
      tone: 'primary',
    };
  }
  if (artifactStatus === 'stale' || checkedDraftVersion !== draft.version) {
    return {
      state: 'stale',
      headline: '导入草稿已更新，需要重新检查',
      body: '当前草稿版本已变化，旧检查结论不能继续用于地层分层。',
      stateLabel: '需重新检查',
      action: 'run-check',
      actionLabel: '重新运行数据检查',
      tone: 'stale',
    };
  }
  const counts = getIssueCounts(issues);
  if (counts.blocking) {
    const problem = issues.find((issue) => issue.severity === 'blocking');
    const ownerLabel = problem?.route === 'project' ? '项目/点位数据' : '数据导入';
    return {
      state: 'issue',
      headline: '检查发现问题，暂不能进入地层分层',
      body: problem ? `${problem.title}：${problem.nextAction}` : '处理检查问题并重新运行数据检查。',
      stateLabel: `存在问题 ${counts.blocking} 项`,
      action: 'return-import',
      actionLabel: `返回${ownerLabel}处理问题`,
      tone: 'issue',
    };
  }
  if (counts.warning) {
    return {
      state: 'notice',
      headline: '检查完成，可进入地层分层',
      body: `当前没有问题，保留 ${counts.warning} 项提示供后续复核。`,
      stateLabel: `已通过 · ${counts.warning} 项提示`,
      action: 'continue',
      actionLabel: '进入地层分层',
      tone: 'success',
    };
  }
  return {
    state: 'clear',
    headline: '检查完成，无问题',
    body: '当前检查范围内未发现影响下一步的问题。',
    stateLabel: '无问题',
    action: 'continue',
    actionLabel: '进入地层分层',
    tone: 'success',
  };
}

export function getCheckHandoffGate(
  draft: ImportDraft,
  issues: CheckIssue[],
  checkedDraftVersion: number | null,
  artifactStatus?: CheckArtifactStatus,
): CheckHandoffGate {
  const decision = getCheckDecision(draft, issues, checkedDraftVersion, artifactStatus);
  if (decision.state === 'clear') {
    return { state: 'allow', label: '可进入地层分层', reason: decision.body, recovery: 'stratification' };
  }
  if (decision.state === 'notice') {
    return { state: 'warn', label: '可继续，保留提示', reason: decision.body, recovery: 'stratification' };
  }
  return {
    state: 'deny',
    label: decision.state === 'stale' ? '需重新检查' : decision.state === 'not-run' ? '尚未检查' : '暂不可进入',
    reason: decision.body,
    recovery: decision.state === 'not-run' || decision.state === 'stale' ? 'check' : 'import',
  };
}

export function issueSeverityLabel(severity: CheckIssue['severity']) {
  return { blocking: '存在问题', warning: '仅提示', passed: '通过' }[severity];
}

export function formatIssueEvidence(issue: CheckIssue) {
  if (issue.evidenceScope === 'point-context') return `${issue.fieldName ?? '字段'} / 点位上下文 / 影响整孔`;
  if (issue.evidenceScope === 'profile-wide') return `${issue.fieldName ?? '字段'} / 整孔范围`;
  const depth =
    typeof issue.depthFromM === 'number' && typeof issue.depthToM === 'number'
      ? issue.depthFromM === issue.depthToM
        ? `${issue.depthFromM.toFixed(2)} m`
        : `${issue.depthFromM.toFixed(2)}-${issue.depthToM.toFixed(2)} m`
      : '未定位';
  const rows =
    typeof issue.rowIndexFrom === 'number' && typeof issue.rowIndexTo === 'number'
      ? issue.rowIndexFrom === issue.rowIndexTo
        ? `第 ${issue.rowIndexFrom} 行`
        : `第 ${issue.rowIndexFrom}-${issue.rowIndexTo} 行`
      : '';
  return rows ? `${issue.fieldName ?? '字段'} / ${depth} / ${rows}` : `${issue.fieldName ?? '字段'} / ${depth}`;
}

export function getCheckEvidenceRows(issue: CheckIssue, draft: ImportDraft) {
  if (!draft.rows.length) return [];
  const from = Math.max(1, issue.rowIndexFrom ?? 1);
  const to = Math.max(from, issue.rowIndexTo ?? from);
  return draft.rows
    .slice(from - 1, to)
    .slice(0, 6)
    .map((row, index) => ({
      rowIndex: from + index,
      depthM: row.depthM,
      qcKpa: row.qcKpa,
      qtKpa: row.qtKpa,
      qnetKpa: Number.isFinite(row.frPercent) && row.frPercent > 0
        ? row.fsKpa / (row.frPercent / 100)
        : Number.NaN,
      fsKpa: row.fsKpa,
      u2Kpa: row.u2Kpa,
      frPercent: row.frPercent,
    }));
}
