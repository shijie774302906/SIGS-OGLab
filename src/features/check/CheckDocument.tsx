import { FlowCaseBanner } from '../../components/workbench/FlowCaseBanner';
import { MetricInline } from '../../components/workbench/MetricInline';
import { PageDecisionBand } from '../../components/workbench/PageDecisionBand';
import {
  canContinueFromCheck,
  checkFilterLabel,
  filterCheckIssues,
  formatIssueEvidence,
  getCheckDecision,
  getCheckEvidenceRows,
  getCheckHandoffGate,
  getCheckStateLabel,
  getIssueCounts,
  issueSeverityLabel,
} from './checkDomain';
import type { CheckArtifactStatus } from './checkDomain';
import { isImportDraftCheckable } from '../import/importDomain';
import type { CheckFilter, CheckRunRecord, ImportDraft } from '../workflow/types';
import type { CheckIssue, RouteId, SyntheticFlowCase } from '../../workflowData';
import {
  activeSmoothing,
  applyValueOverrides,
  currentExclusion,
  currentValueOverride,
  type GovernedInputRow,
  type DataAdjustmentBatch,
  type ValueOverrideCommand,
} from './dataGovernance';
import type { DataGovernanceWorkspaceV3 } from '../workspace/workspaceV2';
import { buildCheckProfilePath, sampleCheckProfileRows, type CheckProfileField } from './checkProfileChart';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type CheckDocumentProps = {
  flowCase: SyntheticFlowCase;
  draft: ImportDraft;
  issues: CheckIssue[];
  selectedIssue: CheckIssue | null;
  checkRunId: string;
  checkedDraftVersion: number | null;
  artifactStatus?: CheckArtifactStatus;
  checkRunHistory: CheckRunRecord[];
  selectedCheckFilter: CheckFilter;
  onSelectIssue: (issueId: string) => void;
  onSelectCheckFilter: (filter: CheckFilter) => void;
  onOpenRoute: (route: RouteId) => void;
  onReturnToImport: (issue: CheckIssue | null) => void;
  onRunDataCheck: () => void | Promise<boolean>;
  governance?: DataGovernanceWorkspaceV3 | null;
  governedRows?: GovernedInputRow[];
  guide?: ReactNode;
  onExcludeRow?: (sourceRowId: string, reason: string) => { ok: boolean; problem?: string };
  onKeepRow?: (sourceRowId: string, reason: string) => { ok: boolean; problem?: string };
  onOverrideValue?: (command: ValueOverrideCommand) => { ok: boolean; problem?: string };
  onApplyAdjustments?: (batch: DataAdjustmentBatch) => { ok: boolean; problem?: string };
};

export function CheckDocument({
  flowCase,
  draft,
  issues,
  selectedIssue,
  checkRunId,
  checkedDraftVersion,
  artifactStatus,
  checkRunHistory,
  selectedCheckFilter,
  onSelectIssue,
  onSelectCheckFilter,
  onOpenRoute,
  onReturnToImport,
  onRunDataCheck,
  governance,
  governedRows = [],
  guide,
  onExcludeRow,
  onKeepRow,
  onOverrideValue,
  onApplyAdjustments,
}: CheckDocumentProps) {
  const counts = getIssueCounts(issues);
  const canContinue = canContinueFromCheck(draft, issues, checkedDraftVersion, artifactStatus);
  const checkState = getCheckStateLabel(draft, issues, checkedDraftVersion, artifactStatus);
  const decision = getCheckDecision(draft, issues, checkedDraftVersion, artifactStatus);
  const handoffGate = getCheckHandoffGate(draft, issues, checkedDraftVersion, artifactStatus);
  const filteredIssues = filterCheckIssues(issues, selectedCheckFilter);
  const displayedIssue =
    filteredIssues.find((issue) => issue.issueId === selectedIssue?.issueId) ??
    filteredIssues[0] ??
    selectedIssue;
  const firstBlockingIssue = issues.find((issue) => issue.severity === 'blocking') ?? null;
  const statusOnlyIssue = displayedIssue?.issueId === 'check-not-run' || displayedIssue?.issueId === 'check-import-stale';
  const pointContextIssue = displayedIssue?.evidenceScope === 'point-context';
  const evidenceRows = displayedIssue && !statusOnlyIssue ? getCheckEvidenceRows(displayedIssue, draft) : [];
  const activeRun = checkRunHistory.find((record) => record.runId === checkRunId) ?? null;
  const staleArtifact = artifactStatus === 'stale';
  const emptyArtifact = checkedDraftVersion === null || artifactStatus === 'empty';
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualField, setManualField] = useState<'depthM' | 'qcKpa' | 'fsKpa' | 'u2Kpa'>('qcKpa');
  const [manualValue, setManualValue] = useState('');
  const [manualReasonCode, setManualReasonCode] = useState<'source-entry-error' | 'unit-conversion-error' | 'instrument-anomaly' | 'neighbor-supported-correction' | 'other-reviewed'>('neighbor-supported-correction');
  const [manualReason, setManualReason] = useState('');
  const [manualProblem, setManualProblem] = useState('');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [adjustmentProblem, setAdjustmentProblem] = useState('');
  const [pendingRerunRevisionId, setPendingRerunRevisionId] = useState<string | null>(null);
  const currentOverrideRevisionId = governance ? currentValueOverride(governance)?.revisionId ?? null : null;
  const currentGovernanceRevisionKey = `${currentOverrideRevisionId ?? 'none'}:${governance ? currentExclusion(governance)?.revisionId ?? 'none' : 'none'}`;
  const effectiveRows = useMemo(
    () => governance && currentOverrideRevisionId
      ? applyValueOverrides(governance, governedRows)
      : governedRows,
    [currentOverrideRevisionId, governance, governedRows],
  );
  const profileEvidenceRows = useMemo<GovernedInputRow[]>(() => effectiveRows.length ? effectiveRows : draft.rows.map((row, index) => ({
    sourceRowId: draft.sourceRowIds?.[index] ?? `draft-row-${index + 1}`,
    row,
  })), [draft.rows, draft.sourceRowIds, effectiveRows]);
  const profileHasU2 = draft.valueProvenance
    ? draft.valueProvenance.u2?.origin === 'source'
    : draft.headers.some((header) => /(^|[^a-z])u2([^a-z]|$)/i.test(header));
  const selectedRawRow = governedRows.find((row) => row.sourceRowId === displayedIssue?.sourceRowId) ?? null;
  const selectedEffectiveRow = effectiveRows.find((row) => row.sourceRowId === displayedIssue?.sourceRowId) ?? null;
  const parsedManualValue = Number(manualValue);
  const currentManualValue = selectedEffectiveRow?.row[manualField];
  const manualFieldOptions = useMemo(() => {
    const fieldName = displayedIssue?.fieldName?.toLowerCase() ?? '';
    const candidates: Array<{ value: typeof manualField; label: string; token: string }> = [
      { value: 'depthM', label: 'Depth（m）', token: 'depth' },
      { value: 'qcKpa', label: 'qc（kPa）', token: 'qc' },
      { value: 'fsKpa', label: 'fs（kPa）', token: 'fs' },
      { value: 'u2Kpa', label: 'u2（kPa）', token: 'u2' },
    ];
    const relevant = candidates.filter((candidate) => fieldName.includes(candidate.token));
    return relevant.length ? relevant : candidates.filter((candidate) => candidate.value === manualField);
  }, [displayedIssue?.fieldName, manualField]);
  const manualEditReady = Number.isFinite(parsedManualValue)
    && (!Number.isFinite(currentManualValue) || parsedManualValue !== currentManualValue)
    && manualReason.trim().length > 0;

  useEffect(() => {
    if (pendingRerunRevisionId === null || currentGovernanceRevisionKey === pendingRerunRevisionId) return;
    setPendingRerunRevisionId(null);
    void Promise.resolve(onRunDataCheck()).then((ok) => {
      if (ok === false) {
        setAdjustmentProblem('数据调整已保留，但重新检查未能提交。请重试。');
        return;
      }
      setAdjustmentOpen(false);
      setAdjustmentProblem('');
    }).finally(() => setAdjustmentSubmitting(false));
  }, [currentGovernanceRevisionKey, pendingRerunRevisionId]);

  function submitAdjustmentBatch(batch: DataAdjustmentBatch) {
    if (!onApplyAdjustments) {
      setAdjustmentProblem('当前项目不能提交数据调整。');
      return;
    }
    const beforeRevisionId = currentGovernanceRevisionKey;
    setAdjustmentProblem('');
    setAdjustmentSubmitting(true);
    const result = onApplyAdjustments(batch);
    if (!result.ok) {
      setAdjustmentSubmitting(false);
      setAdjustmentProblem(result.problem ?? '本次数据调整未提交。');
      return;
    }
    setPendingRerunRevisionId(beforeRevisionId);
  }

  function openManualEdit() {
    if (!selectedEffectiveRow) return;
    const preferred = displayedIssue?.fieldName?.toLowerCase().includes('qc') ? 'qcKpa'
      : displayedIssue?.fieldName?.toLowerCase().includes('u2') ? 'u2Kpa'
      : displayedIssue?.fieldName?.toLowerCase().includes('fs') ? 'fsKpa'
      : displayedIssue?.fieldName?.toLowerCase().includes('depth') ? 'depthM'
      : 'qcKpa';
    setManualField(preferred);
    setManualValue(String(selectedEffectiveRow.row[preferred]));
    setManualReason('');
    setManualProblem('');
    setManualEditOpen(true);
  }

  function submitManualEdit() {
    if (!displayedIssue?.sourceRowId || !onOverrideValue) return;
    const effectiveValue = Number(manualValue);
    const beforeRevisionId = currentGovernanceRevisionKey;
    const result = onOverrideValue({
      kind: 'set-value',
      sourceRowId: displayedIssue.sourceRowId,
      field: manualField,
      effectiveValue,
      reasonCode: manualReasonCode,
      reason: manualReason,
    });
    if (!result.ok) {
      setManualProblem(result.problem ?? '本次调整未保存。');
      return;
    }
    setPendingRerunRevisionId(beforeRevisionId);
    setManualEditOpen(false);
  }

  return (
    <div
      className={`check-document analysis-page mixpanel-report ${advancedOpen ? 'advanced-open' : 'guided-view'}`}
      data-testid="document-check"
      data-flow={flowCase.flowId}
      data-case-id={flowCase.caseId}
      data-flow-step="run-check"
    >
      <FlowCaseBanner flowCase={flowCase} route="check" />
      {guide}
      <header className="analysis-header mixpanel-report-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">导入草稿 / 数据检查 / 问题定位</div>
          <div className="analysis-title-row">
            <h1>数据检查</h1>
            <span className={`status-pill ${checkStateStatusClass(checkState)}`}>
              {checkState}
            </span>
          </div>
          <div className="analysis-subtitle">
            <strong>{draft.pointName} / {draft.fileName}</strong>
            <span>{staleArtifact ? '待重新运行检查' : emptyArtifact ? '待运行检查' : `检查规则 ${issues.length} 项`}</span>
            <span>检查记录 {checkRunHistory.length} 次</span>
            <span>草稿版本 {draft.version}</span>
          </div>
        </div>
      </header>

      <PageDecisionBand
        testId="check-first-look"
        tone={decision.tone}
        className={`check-first-look ${decision.state}`}
        title={decision.headline}
        description={decision.body}
        primaryAction={
          decision.action === 'run-check' ? (
            <button
              type="button"
              className="toolbar-button primary"
              data-testid="check-rerun"
              onClick={onRunDataCheck}
              disabled={!isImportDraftCheckable(draft)}
            >
              {decision.actionLabel}
            </button>
          ) : decision.action === 'continue' ? (
            <button
              type="button"
              className="toolbar-button primary"
              data-testid="flow-continue-stratification"
              onClick={() => onOpenRoute('stratification')}
            >
              {decision.actionLabel}
            </button>
          ) : firstBlockingIssue?.sourceRowId && displayedIssue?.issueId !== firstBlockingIssue.issueId ? (
            <button
              type="button"
              className="toolbar-button primary"
              data-testid="check-primary-focus-problem"
              onClick={() => onSelectIssue(firstBlockingIssue.issueId)}
            >
              处理第 1 项问题
            </button>
          ) : displayedIssue?.sourceRowId ? null : (
            <button
              type="button"
              className={`toolbar-button ${displayedIssue?.sourceRowId ? '' : 'primary'}`}
              data-testid="check-primary-return-import"
              onClick={() => onReturnToImport(displayedIssue)}
            >
              {decision.actionLabel}
            </button>
          )
        }
        secondaryActions={(
          <>
            {checkedDraftVersion !== null && decision.action !== 'run-check' ? (
              <button type="button" className="toolbar-button" data-testid="check-rerun-secondary" onClick={onRunDataCheck}>
                重新运行数据检查
              </button>
            ) : null}
            {decision.action !== 'continue' ? <span className="check-next-state">处理完问题后可进入地层分层</span> : null}
          </>
        )}
        stateLabel={decision.stateLabel}
        stateMeta={checkedDraftVersion === null ? draft.fileName : `检查记录 ${checkRunHistory.length} 次`}
      />

      {displayedIssue?.sourceRowId && displayedIssue.severity !== 'passed' ? (
        <section className="check-adjustment-entry" data-testid="check-adjustment-entry">
          <div>
            <span>{displayedIssue.severity === 'blocking' ? '需要处理' : '可选处理'}</span>
            <strong>{displayedIssue.title}</strong>
            <p>{formatIssueEvidence(displayedIssue)} · {displayedIssue.detail}</p>
          </div>
          <button type="button" className="toolbar-button primary" onClick={() => { setAdjustmentProblem(''); setAdjustmentOpen(true); }} data-testid="check-open-adjustment-dialog">处理这个问题</button>
        </section>
      ) : null}

      {advancedOpen ? <>
      <section className="mixpanel-metrics-row check-metrics secondary-summary" aria-label="数据检查摘要" data-testid="check-summary">
        <MetricInline label="检查状态" value={checkState} tone={emptyArtifact || staleArtifact ? 'info' : canContinue ? 'ok' : 'warn'} />
        <MetricInline label={staleArtifact ? '失效原因' : emptyArtifact ? '待检查原因' : '问题'} value={`${counts.blocking} 项`} tone={emptyArtifact || staleArtifact ? 'info' : counts.blocking ? 'warn' : 'ok'} />
        <MetricInline label={staleArtifact ? '旧结果问题' : '仅提示'} value={`${staleArtifact ? activeRun?.counts.issue ?? 0 : counts.warning} 项`} />
        <MetricInline label={staleArtifact ? '旧结果提示' : '通过'} value={`${staleArtifact ? activeRun?.counts.notice ?? 0 : counts.passed} 项`} tone="ok" />
        <MetricInline label="选中规则" value={displayedIssue?.title ?? '未选择'} />
        <MetricInline label="进入分层" value={handoffGate.label} tone={canContinue ? 'ok' : 'warn'} />
      </section>

      {issues.some((issue) => issue.severity !== 'passed') ? (
        <section className="check-action-queue" aria-label={counts.blocking ? '问题与提示' : '可选复核提示'} data-testid="check-action-queue">
          <div>
            <strong>{counts.blocking ? '先处理影响下一步的问题' : '可选复核提示'}</strong>
            <span>{counts.blocking ? `${counts.blocking} 项问题需处理${counts.warning ? `，另有 ${counts.warning} 项提示` : ''}；处理后自动定位下一项。` : `${counts.warning} 项提示，不影响进入地层分层。`}</span>
          </div>
          <div>{issues.filter((issue) => issue.severity !== 'passed').map((issue, index) => <button type="button" className={`${displayedIssue?.issueId === issue.issueId ? 'active' : ''} ${issue.severity}`} onClick={() => onSelectIssue(issue.issueId)} key={issue.issueId} title={issue.severity === 'blocking' ? '需处理' : '仅提示'}><span>{index + 1}</span>{issue.title}</button>)}</div>
        </section>
      ) : null}

      {advancedOpen ? <CheckDataEvidence governance={governance ?? null} rows={governedRows} /> : null}

      <section className="check-workspace-grid">
        <div className="project-main-panel pro-panel">
          <div className="section-header">
            <div>
              <h2>检查规则组</h2>
              <span>点击检查项查看字段、深度范围、行号和建议动作。</span>
            </div>
          </div>
          <div className="rule-chip-row" data-testid="check-rule-groups">
            {(['all', 'issue', 'notice', 'passed'] as CheckFilter[]).map((filter) => (
              <button
                type="button"
                key={filter}
                className={selectedCheckFilter === filter ? 'active' : ''}
                data-testid={`check-filter-${filter}`}
                onClick={() => onSelectCheckFilter(filter)}
              >
                {checkFilterLabel(filter)}
              </button>
            ))}
          </div>
          <div className="point-table-wrap" data-testid="check-issue-list">
            <table className="point-table check-table">
              <thead>
                <tr>
                  <th>规则</th>
                  <th>级别</th>
                  <th>来源</th>
                  <th>定位</th>
                  <th>建议动作</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length ? (
                  filteredIssues.map((issue) => (
                    <tr
                      key={issue.issueId}
                      className={displayedIssue?.issueId === issue.issueId ? 'selected' : ''}
                      onClick={() => onSelectIssue(issue.issueId)}
                      data-testid={`check-issue-${issue.issueId}`}
                    >
                      <td>{issue.title}</td>
                      <td>
                        <span className={`inline-state ${issueVisualClass(issue, staleArtifact)}`}>
                          {issueDisplayLabel(issue, staleArtifact)}
                        </span>
                      </td>
                      <td>{issue.source}</td>
                      <td>{formatIssueEvidence(issue)}</td>
                      <td>{issue.nextAction}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>当前筛选下没有检查项。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="project-main-panel pro-panel" data-testid="check-selected-issue">
          <div className="section-header">
            <div>
              <h2>{statusOnlyIssue ? '状态说明' : '检查证据'}</h2>
              <span>{statusOnlyIssue ? '此状态不对应具体数据行。' : displayedIssue ? `${displayedIssue.title} / ${displayedIssue.fieldName ?? '未指定字段'}` : '选择规则后查看对应数据行。'}</span>
            </div>
          </div>
          {displayedIssue ? (
            <div className="selected-issue-evidence">
              <div className="evidence-context-line">
                <span className={`status-pill ${issueStatusClass(displayedIssue, staleArtifact)}`}>
                  {issueDisplayLabel(displayedIssue, staleArtifact)}
                </span>
                <span>{formatIssueEvidence(displayedIssue)}</span>
              </div>
              {statusOnlyIssue ? (
                <p className="short-note" data-testid="check-status-explanation">{displayedIssue.detail}</p>
              ) : (
              <>
              {pointContextIssue ? <p className="short-note check-context-explanation" data-testid="check-context-explanation">{displayedIssue.detail} 这是点位上下文，不对应局部测量行。</p> : null}
              <CheckProfileCurves rows={profileEvidenceRows} issue={displayedIssue} u2Available={profileHasU2} />
              {displayedIssue.sourceRowId && displayedIssue.severity !== 'passed' ? (
                <div className="check-guided-actions" data-testid="check-guided-actions">
                  <div><strong>这一个问题怎么处理？</strong><span>{displayedIssue.severity === 'warning' ? '可选处理，不影响进入地层分层；原始上传文件不会被改写。' : '选择只作用于当前定位行，原始上传文件不会被改写。'}</span></div>
                  <button type="button" className="toolbar-button" data-testid="check-ignore-current-row" onClick={() => {
                    const beforeRevisionId = currentGovernanceRevisionKey;
                    const result = onExcludeRow?.(displayedIssue.sourceRowId as string, `数据检查：${displayedIssue.title}，工程师确认忽略当前行`);
                    if (result && !result.ok) setManualProblem(result.problem ?? '当前行未忽略。');
                    else setPendingRerunRevisionId(beforeRevisionId);
                  }}>不使用此行并复检</button>
                  <button type="button" className={`toolbar-button ${displayedIssue.severity === 'blocking' ? 'primary' : ''}`} data-testid="check-open-manual-edit" onClick={openManualEdit}>修改此行数值</button>
                  <button type="button" className="toolbar-button" data-testid="check-keep-original" onClick={() => {
                    const beforeRevisionId = currentGovernanceRevisionKey;
                    const acceptedWarning = displayedIssue.severity === 'warning';
                    const result = onKeepRow?.(
                      displayedIssue.sourceRowId as string,
                      `数据检查：${displayedIssue.title}，工程师确认保留原值${acceptedWarning ? '并接受提示' : '，暂不用于后续分类'}`,
                    );
                    if (result && !result.ok) setManualProblem(result.problem ?? '当前保留决定未记录。');
                    else {
                      setManualProblem(acceptedWarning ? '已记录：保留原值并接受此提示。' : '已记录：保留原值；此问题仍需解决，暂不能进入地层分层。');
                      setPendingRerunRevisionId(beforeRevisionId);
                    }
                  }}>{displayedIssue.severity === 'warning' ? '保留并接受提示' : '保留原值，暂不分类'}</button>
                </div>
              ) : null}
              {!pointContextIssue ? <div className="point-table-wrap evidence-table-wrap" data-testid="check-evidence-rows">
                <table className="point-table evidence-table">
                  <thead>
                    <tr>
                      <th>行</th>
                      <th>深度</th>
                      <th>qc (kPa)</th>
                      <th>JTS qt (kPa)</th>
                      <th>qnet (kPa)</th>
                      <th>fs (kPa)</th>
                      {profileHasU2 ? <th>u2 (kPa)</th> : null}
                      <th className="jts-fr-heading" title="JTS Fr（%，fs/qnet × 100）"><span>JTS Fr（%）</span><small>fs/qnet × 100</small></th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceRows.length ? (
                      evidenceRows.map((row) => (
                        <tr key={`${row.rowIndex}-${row.depthM}`}>
                          <td>第 {row.rowIndex} 行</td>
                          <td>{row.depthM.toFixed(2)} m</td>
                          <td>{row.qcKpa.toFixed(0)}</td>
                          <td>{Number.isFinite(row.qtKpa) ? row.qtKpa.toFixed(0) : '—'}</td>
                          <td>{Number.isFinite(row.qnetKpa) ? row.qnetKpa.toFixed(0) : '—'}</td>
                          <td>{row.fsKpa.toFixed(1)}</td>
                          {profileHasU2 ? <td>{row.u2Kpa.toFixed(1)}</td> : null}
                          <td>{Number.isFinite(row.frPercent) ? `${row.frPercent.toFixed(3)}%` : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={profileHasU2 ? 8 : 7}>当前检查项没有可定位的数据行。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div> : null}
              </>
              )}
              {!statusOnlyIssue && !pointContextIssue && displayedIssue.severity !== 'passed' ? (
                <div className="check-source-recovery" data-testid="check-locate-guidance">
                  <span>{displayedIssue.sourceRowId ? '需要核对上传来源？' : '这个问题没有对应单行来源。'}</span>
                  <button type="button" className="text-button" data-testid="check-locate-in-import" onClick={() => onReturnToImport(displayedIssue)}>{displayedIssue.sourceRowId ? '在来源中查看' : '返回数据导入查看'}</button>
                </div>
              ) : null}
              {manualProblem ? <p className="field-error" role="alert" data-testid="check-action-feedback">{manualProblem}</p> : null}
            </div>
          ) : (
            <p className="short-note">选择左侧检查规则查看详情。</p>
          )}
        </div>

        <div className="project-main-panel pro-panel" data-testid="check-scope">
          <div className="section-header">
            <div>
              <h2>检查范围</h2>
              <span>当前检查结论绑定导入草稿版本和字段范围。</span>
            </div>
          </div>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>检查状态</span>
              <strong>{checkState}</strong>
            </div>
            <div className="readiness-row">
              <span>最近检查</span>
              <strong>{activeRun ? formatDateTime(activeRun.createdAt) : checkedDraftVersion === null ? '未运行' : '历史记录'}</strong>
            </div>
            <div className="readiness-row">
              <span>{artifactStatus === 'stale' ? '失效依据' : '当前依据'}</span>
              <strong data-testid="check-current-input">
                {activeRun?.input ? '当前点位 / 当前导入数据' : '尚未形成当前检查依据'}
              </strong>
            </div>
            <div className="readiness-row">
              <span>数据一致性</span>
              <strong data-testid="check-current-revisions">{activeRun?.input ? artifactStatus === 'stale' ? '数据已变化，需要重新检查' : '与当前导入数据一致' : '未检查'}</strong>
            </div>
            <div className="readiness-row">
              <span>工作数据</span>
              <strong>{draft.rows.length} 行</strong>
            </div>
            <div className="readiness-row">
              <span>字段范围</span>
              <strong>Depth / qc / fs（必需）· u2（可选）· 点位与水深来自工作区上下文</strong>
            </div>
            <div className="readiness-row">
              <span>深度范围</span>
              <strong>
                {draft.rows.length
                  ? `${Math.min(...draft.rows.map((row) => row.depthM)).toFixed(2)}-${Math.max(...draft.rows.map((row) => row.depthM)).toFixed(2)} m`
                  : '未定位'}
              </strong>
            </div>
          </div>
        </div>

        <div className="project-main-panel pro-panel" data-testid="check-run-history">
          <div className="section-header">
            <div>
              <h2>检查记录</h2>
              <span>按时间查看当前点位的检查记录；只有“当前依据”可用于交接。</span>
            </div>
          </div>
          <div className="point-table-wrap">
            <table className="point-table check-history-table">
              <thead>
                <tr>
                  <th>运行</th>
                  <th>结论</th>
                  <th>用途</th>
                  <th>问题</th>
                  <th>提示</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {checkRunHistory.length ? (
                  checkRunHistory.map((record, index) => {
                    const useState = record.runId === checkRunId
                      ? artifactStatus === 'stale' ? '失效依据' : '当前依据'
                      : sameCheckInput(record.input, activeRun?.input)
                        ? '同输入历史'
                        : '历史';
                    return (
                    <tr key={record.runId} data-testid={`check-history-row-${index}`} data-run-use={useState}>
                      <td>第 {checkRunHistory.length - index} 次</td>
                      <td>{record.conclusion}</td>
                      <td><span className={`inline-state ${useState === '当前依据' ? 'ok' : useState === '失效依据' ? 'notice' : 'muted'}`}>{useState}</span></td>
                      <td>{record.counts.issue}</td>
                      <td>{record.counts.notice}</td>
                      <td title={formatDateTime(record.createdAt)}>{formatDateTime(record.createdAt)}</td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>暂无检查记录。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </> : null}
      <div className="check-advanced-toggle"><button type="button" className="toolbar-button" data-testid="check-toggle-advanced" onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? '收起高级详情' : '查看高级详情'}</button><span>规则、历史、全量曲线与治理工具</span></div>
      {adjustmentOpen ? <DataAdjustmentDialog
        issues={issues}
        initialIssueId={displayedIssue?.issueId ?? ''}
        rows={profileEvidenceRows}
        u2Available={profileHasU2}
        submitting={adjustmentSubmitting}
        problem={adjustmentProblem}
        onClose={() => { if (!adjustmentSubmitting) { setAdjustmentOpen(false); setAdjustmentProblem(''); } }}
        onSubmit={submitAdjustmentBatch}
      /> : null}
      {manualEditOpen && selectedRawRow && selectedEffectiveRow && displayedIssue?.sourceRowId ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog check-manual-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-edit-title" data-testid="check-manual-edit-dialog">
            <div className="confirmation-dialog-heading">
              <div><span>数据检查 · 单元格修订</span><h2 id="manual-edit-title">调整 {selectedRawRow.row.depthM.toFixed(2)} m 的一个输入值</h2></div>
              <button type="button" className="icon-button" aria-label="取消调整" onClick={() => setManualEditOpen(false)}>×</button>
            </div>
            <p>只能调整当前定位行的原始输入字段。qt、Ic、Fr 等派生值会自动重算，不能直接填写。</p>
            <div className="manual-edit-comparison">
              <div><span>原始上传值</span><strong>{Number.isFinite(selectedRawRow.row[manualField]) ? selectedRawRow.row[manualField].toFixed(3) : '无有效值'}</strong></div>
              <div><span>当前有效值</span><strong>{Number.isFinite(selectedEffectiveRow.row[manualField]) ? selectedEffectiveRow.row[manualField].toFixed(3) : '无有效值'}</strong></div>
            </div>
            <div className="preparation-form-grid">
              <label className="dock-form-field"><span>字段</span>{manualFieldOptions.length === 1 ? <input readOnly value={manualFieldOptions[0].label} data-testid="manual-edit-field-label" /> : <select value={manualField} onChange={(event) => {
                const field = event.target.value as typeof manualField;
                setManualField(field);
                setManualValue(String(selectedEffectiveRow.row[field]));
              }} data-testid="manual-edit-field">{manualFieldOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}<small>{manualFieldOptions.length === 1 ? '当前问题只涉及此字段。' : '只显示当前问题相关字段。'}</small></label>
              <label className="dock-form-field"><span>新的有效值</span><input type="number" step="any" value={manualValue} onChange={(event) => setManualValue(event.target.value)} data-testid="manual-edit-value" /></label>
              <label className="dock-form-field"><span>原因</span><select value={manualReasonCode} onChange={(event) => setManualReasonCode(event.target.value as typeof manualReasonCode)} data-testid="manual-edit-reason-code"><option value="neighbor-supported-correction">相邻深度支持修订</option><option value="source-entry-error">源记录录入错误</option><option value="unit-conversion-error">单位换算错误</option><option value="instrument-anomaly">仪器异常</option><option value="other-reviewed">其他已复核原因</option></select></label>
              <label className="dock-form-field"><span>复核说明</span><input value={manualReason} onChange={(event) => setManualReason(event.target.value)} placeholder="简要说明判断依据" data-testid="manual-edit-reason" /></label>
            </div>
            <p className={`manual-edit-readiness ${manualEditReady ? 'ready' : ''}`} data-testid="manual-edit-readiness">{manualEditReady ? '已填写新的有效值和复核说明，可以保存并重新检查。' : '请输入不同的新值，并补充复核说明。'}</p>
            {manualProblem ? <p className="field-error" role="alert">{manualProblem}</p> : null}
            <div className="confirmation-dialog-actions"><button type="button" className="toolbar-button" onClick={() => setManualEditOpen(false)}>取消</button><button type="button" className="toolbar-button primary" onClick={submitManualEdit} data-testid="manual-edit-confirm" disabled={!manualEditReady}>保存并重新检查</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type StagedAdjustmentDecision =
  | { kind: 'delete' }
  | { kind: 'keep' }
  | { kind: 'override'; command: Extract<ValueOverrideCommand, { kind: 'set-value' }> };

function DataAdjustmentDialog({ issues, initialIssueId, rows, u2Available, submitting, problem, onClose, onSubmit }: {
  issues: CheckIssue[];
  initialIssueId: string;
  rows: GovernedInputRow[];
  u2Available: boolean;
  submitting: boolean;
  problem: string;
  onClose: () => void;
  onSubmit: (batch: DataAdjustmentBatch) => void;
}) {
  const actionableIssues = useMemo(() => issues.filter((issue) => issue.severity !== 'passed' && issue.sourceRowId && issue.evidenceScope !== 'point-context'), [issues]);
  const initialIndex = Math.max(0, actionableIssues.findIndex((issue) => issue.issueId === initialIssueId));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [decisions, setDecisions] = useState<Record<string, StagedAdjustmentDecision>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualField, setManualField] = useState<'depthM' | 'qcKpa' | 'fsKpa' | 'u2Kpa'>('qcKpa');
  const [manualValue, setManualValue] = useState('');
  const [manualReasonCode, setManualReasonCode] = useState<'source-entry-error' | 'unit-conversion-error' | 'instrument-anomaly' | 'neighbor-supported-correction' | 'other-reviewed'>('neighbor-supported-correction');
  const [manualReason, setManualReason] = useState('');
  const [deleteReasonCode, setDeleteReasonCode] = useState<'instrument-anomaly' | 'source-record-error' | 'invalid-measurement' | 'other-reviewed'>('instrument-anomaly');
  const [deleteReason, setDeleteReason] = useState('');
  const currentIssue = actionableIssues[Math.min(currentIndex, Math.max(0, actionableIssues.length - 1))] ?? null;
  const currentRow = currentIssue?.sourceRowId ? rows.find((row) => row.sourceRowId === currentIssue.sourceRowId) ?? null : null;
  const currentGroupKey = currentIssue?.evidenceGroupKey ?? `${currentIssue?.title ?? ''}|${currentIssue?.fieldName ?? ''}|${currentIssue?.severity ?? ''}`;
  const currentGroup = currentIssue ? actionableIssues.filter((issue) => (issue.evidenceGroupKey ?? `${issue.title}|${issue.fieldName ?? ''}|${issue.severity}`) === currentGroupKey) : [];
  const handledCount = actionableIssues.filter((issue) => decisions[issue.issueId]).length;
  const deletedSourceRowIds = [...new Set(actionableIssues.filter((issue) => decisions[issue.issueId]?.kind === 'delete').map((issue) => issue.sourceRowId!))];
  const keptSourceRowIds = [...new Set(actionableIssues.filter((issue) => decisions[issue.issueId]?.kind === 'keep').map((issue) => issue.sourceRowId!))];
  const overrideCommands = Object.values(decisions).filter((decision): decision is Extract<StagedAdjustmentDecision, { kind: 'override' }> => decision.kind === 'override').map((decision) => decision.command);
  const uniqueOverrides = [...new Map(overrideCommands.map((command) => [`${command.sourceRowId}:${command.field}`, command])).values()];
  const currentGroupPositions = currentGroup.map((issue) => rows.findIndex((row) => row.sourceRowId === issue.sourceRowId)).filter((index) => index >= 0).sort((left, right) => left - right);
  const currentGroupIsSparse = currentGroupPositions.every((position, index) => index === 0 || position - currentGroupPositions[index - 1] > 1);
  const currentGroupRatio = rows.length ? currentGroup.length / rows.length : 1;
  const batchDeleteSafe = currentGroup.length > 1 && currentGroupRatio <= 0.01 && currentGroupIsSparse;
  const deletedIssues = actionableIssues.filter((issue) => issue.sourceRowId && deletedSourceRowIds.includes(issue.sourceRowId));
  const deleteReady = !deletedSourceRowIds.length || deleteReason.trim().length >= 4;

  function preferredField(issue: CheckIssue) {
    const field = issue.fieldName?.toLowerCase() ?? '';
    if (field.includes('u2')) return 'u2Kpa' as const;
    if (field.includes('fs')) return 'fsKpa' as const;
    if (field.includes('depth')) return 'depthM' as const;
    return 'qcKpa' as const;
  }

  function moveAfterStage(nextDecisions: Record<string, StagedAdjustmentDecision>) {
    const nextIndex = actionableIssues.findIndex((issue, index) => index > currentIndex && !nextDecisions[issue.issueId]);
    const wrappedIndex = actionableIssues.findIndex((issue) => !nextDecisions[issue.issueId]);
    const target = nextIndex >= 0 ? nextIndex : wrappedIndex;
    if (target >= 0) setCurrentIndex(target);
    else setReviewMode(true);
  }

  function stageRows(sourceRowIds: string[], decision: StagedAdjustmentDecision) {
    const targetIds = new Set(sourceRowIds);
    const next = { ...decisions };
    actionableIssues.forEach((issue) => {
      if (issue.sourceRowId && targetIds.has(issue.sourceRowId)) next[issue.issueId] = decision;
    });
    setDecisions(next);
    setManualMode(false);
    moveAfterStage(next);
  }

  function openManual() {
    if (!currentIssue || !currentRow) return;
    const field = preferredField(currentIssue);
    setManualField(field);
    setManualValue(String(currentRow.row[field]));
    setManualReason('');
    setManualMode(true);
  }

  function stageManual() {
    if (!currentIssue?.sourceRowId || !currentRow || !manualReason.trim()) return;
    const value = Number(manualValue);
    if (!Number.isFinite(value) || value === currentRow.row[manualField]) return;
    stageRows([currentIssue.sourceRowId], {
      kind: 'override',
      command: { kind: 'set-value', sourceRowId: currentIssue.sourceRowId, field: manualField, effectiveValue: value, reasonCode: manualReasonCode, reason: manualReason.trim() },
    });
  }

  function submit() {
    if (!deleteReady) return;
    const deleteEvidence = deletedIssues.map((issue) => {
      const row = rows.find((candidate) => candidate.sourceRowId === issue.sourceRowId);
      return `${issue.title}@${(row?.row.depthM ?? issue.depthFromM ?? 0).toFixed(2)}m(qc=${formatProfileValue(row?.row.qcKpa ?? Number.NaN)},fs=${formatProfileValue(row?.row.fsKpa ?? Number.NaN)},u2=${formatProfileValue(row?.row.u2Kpa ?? Number.NaN)})`;
    }).join('；');
    onSubmit({
      deleteSourceRowIds: deletedSourceRowIds,
      keepSourceRowIds: keptSourceRowIds,
      overrides: uniqueOverrides,
      reason: `数据调整向导：移除 ${deletedSourceRowIds.length} 个测点，保留 ${keptSourceRowIds.length} 个测点，修改 ${uniqueOverrides.length} 个数值。${deletedSourceRowIds.length ? ` 删除原因=${deleteReasonCode}；工程师说明=${deleteReason.trim()}；检查证据=${deleteEvidence}。` : ''}`,
    });
  }

  if (!currentIssue) return null;
  const currentDepth = currentRow?.row.depthM ?? currentIssue.depthFromM ?? 0;
  const currentValue = currentRow?.row[manualField];
  const manualReady = Number.isFinite(Number(manualValue)) && Number(manualValue) !== currentValue && manualReason.trim().length > 0;

  return <div className="modal-backdrop data-adjustment-backdrop" role="presentation">
    <section className="data-adjustment-dialog" role="dialog" aria-modal="true" aria-labelledby="data-adjustment-title" data-testid="data-adjustment-dialog">
      <header className="data-adjustment-header">
        <div><span>数据检查 · 调整工作台</span><h2 id="data-adjustment-title">处理异常测点</h2><p data-testid="adjustment-progress">{reviewMode ? '确认本次调整后，系统会重新检查并使旧解译结果失效。' : `第 ${currentIndex + 1}/${actionableIssues.length} 个问题 · 已处理 ${handledCount} 个`}</p></div>
        <button type="button" className="icon-button" aria-label="取消本次数据调整" onClick={onClose} disabled={submitting}>×</button>
      </header>
      {!reviewMode ? <>
        <div className="data-adjustment-context">
          <div><span>{currentIssue.severity === 'blocking' ? '需要处理' : '可选处理'}</span><strong>{currentIssue.title}</strong><p>{currentDepth.toFixed(2)} m · {currentIssue.fieldName ?? '测量值'} · {currentIssue.detail}</p></div>
          <div><strong>{currentGroup.length}</strong><span>个同类检查项</span><small>{currentGroup.length > 1 ? `${Math.min(...currentGroup.map((issue) => issue.depthFromM ?? currentDepth)).toFixed(2)}–${Math.max(...currentGroup.map((issue) => issue.depthToM ?? currentDepth)).toFixed(2)} m` : '仅当前测点'}</small></div>
        </div>
        <div className="data-adjustment-body">
          <div className="data-adjustment-chart"><CheckProfileCurves rows={rows} issue={currentIssue} u2Available={u2Available} large deletedSourceRowIds={deletedSourceRowIds} /></div>
          <aside className="data-adjustment-actions" data-testid="data-adjustment-actions">
            <div className="data-adjustment-row-values">
              <span>当前测点</span><strong>{currentDepth.toFixed(2)} m</strong>
              <dl><div><dt>qc</dt><dd>{currentRow ? formatProfileValue(currentRow.row.qcKpa) : '—'} kPa</dd></div><div><dt>fs</dt><dd>{currentRow ? formatProfileValue(currentRow.row.fsKpa) : '—'} kPa</dd></div>{u2Available ? <div><dt>u2</dt><dd>{currentRow ? formatProfileValue(currentRow.row.u2Kpa) : '—'} kPa</dd></div> : null}</dl>
            </div>
            {currentGroup.length > 1 ? <div className="same-issue-actions" data-testid="same-issue-actions"><span>这 {currentGroup.length} 个同类检查项，可以一次处理</span><button type="button" data-testid="adjustment-keep-all-same" disabled={currentIssue.severity === 'blocking'} onClick={() => stageRows(currentGroup.map((issue) => issue.sourceRowId!), { kind: 'keep' })}>批量保留原值并接受提示</button><button type="button" data-testid="adjustment-delete-all-same" className="danger" disabled={!batchDeleteSafe} onClick={() => stageRows(currentGroup.map((issue) => issue.sourceRowId!), { kind: 'delete' })}>批量从工作数据移除</button><small>{currentIssue.severity === 'blocking' ? '必须修复的问题不能批量接受提示。' : '也可使用下方选项逐个判断。'} {!batchDeleteSafe ? `批量移除仅适用于不连续且不超过全孔 1% 的孤立点；当前 ${currentGroup.length}/${rows.length}，请逐点判断或返回导入页核对单位、字段和工程上下文。` : '原始上传保持不变。'}</small></div> : null}
            {!manualMode ? <div className="single-point-actions"><span>这个测点怎么处理？</span><button type="button" className="danger" onClick={() => stageRows([currentIssue.sourceRowId!], { kind: 'delete' })} data-testid="adjustment-delete-current"><strong>从工作数据移除这个测点</strong><small>原始上传保持不变；界面内不可撤回</small></button><button type="button" onClick={openManual} data-testid="adjustment-edit-current"><strong>手动调整数值</strong><small>填写新值和判断依据</small></button><button type="button" onClick={() => stageRows([currentIssue.sourceRowId!], { kind: 'keep' })} data-testid="adjustment-keep-current"><strong>保留原值</strong><small>{currentIssue.severity === 'warning' ? '接受提示并继续' : '问题仍会阻止后续解译'}</small></button></div> : <div className="data-adjustment-manual" data-testid="data-adjustment-manual"><label><span>字段</span><select value={manualField} onChange={(event) => { const field = event.target.value as typeof manualField; setManualField(field); setManualValue(String(currentRow?.row[field] ?? '')); }}><option value="depthM">Depth (m)</option><option value="qcKpa">qc (kPa)</option><option value="fsKpa">fs (kPa)</option>{u2Available ? <option value="u2Kpa">u2 (kPa)</option> : null}</select></label><label><span>新的有效值</span><input type="number" step="any" value={manualValue} onChange={(event) => setManualValue(event.target.value)} /></label><label><span>原因</span><select value={manualReasonCode} onChange={(event) => setManualReasonCode(event.target.value as typeof manualReasonCode)}><option value="neighbor-supported-correction">相邻深度支持修订</option><option value="source-entry-error">源记录录入错误</option><option value="unit-conversion-error">单位换算错误</option><option value="instrument-anomaly">仪器异常</option><option value="other-reviewed">其他已复核原因</option></select></label><label><span>复核说明</span><input value={manualReason} onChange={(event) => setManualReason(event.target.value)} placeholder="简要说明判断依据" /></label><div><button type="button" className="toolbar-button" onClick={() => setManualMode(false)}>取消</button><button type="button" className="toolbar-button primary" disabled={!manualReady} onClick={stageManual}>采用此修改并继续</button></div></div>}
          </aside>
        </div>
      </> : <div className="data-adjustment-review" data-testid="data-adjustment-review"><span>提交预览</span><h3>确认本次数据调整</h3><p>提交后会重新运行数据检查。移除仅作用于当前工作数据，原始上传保持不变；界面内不可撤回，重新导入原文件可恢复。旧分层、JTS、参数和成果将需要更新。</p><div><strong>{deletedSourceRowIds.length}<small>从工作数据移除</small></strong><strong>{uniqueOverrides.length}<small>数值修改</small></strong><strong>{keptSourceRowIds.length}<small>保留原值</small></strong></div>{deletedSourceRowIds.length ? <section className="data-adjustment-delete-reason" data-testid="adjustment-delete-reason"><label><span>移除原因</span><select value={deleteReasonCode} onChange={(event) => setDeleteReasonCode(event.target.value as typeof deleteReasonCode)}><option value="instrument-anomaly">仪器孤立异常</option><option value="source-record-error">源记录错误</option><option value="invalid-measurement">无效测量值</option><option value="other-reviewed">其他已复核原因</option></select></label><label><span>工程师说明</span><input value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="至少 4 个字，说明为何移除" /></label><small>修订会记录检查项、深度、当前工作值和本说明；上传原值始终保留。</small></section> : null}<button type="button" className="toolbar-button" onClick={() => setReviewMode(false)} disabled={submitting}>返回检查</button><button type="button" className="toolbar-button primary" onClick={submit} disabled={submitting || !deleteReady} data-testid="adjustment-submit">{submitting ? '正在保存并重新检查…' : '确认调整并重新检查'}</button></div>}
      {problem ? <p className="field-error data-adjustment-problem" role="alert">{problem}</p> : null}
      {!reviewMode ? <footer className="data-adjustment-footer"><button type="button" className="toolbar-button" disabled={currentIndex <= 0 || submitting} onClick={() => { setReviewMode(false); setCurrentIndex((index) => Math.max(0, index - 1)); }}>上一项</button><div><strong>第 {currentIndex + 1} 项，共 {actionableIssues.length} 项</strong><span>已处理 {handledCount} 项</span></div>{handledCount >= actionableIssues.length ? <button type="button" className="toolbar-button primary" disabled={submitting} onClick={() => setReviewMode(true)}>查看并确认本次调整</button> : <button type="button" className="toolbar-button" data-testid="adjustment-next" disabled={currentIndex >= actionableIssues.length - 1 || submitting} onClick={() => setCurrentIndex((index) => Math.min(actionableIssues.length - 1, index + 1))}>下一项</button>}</footer> : null}
    </section>
  </div>;
}

function CheckProfileCurves({ rows, issue, u2Available, large = false, deletedSourceRowIds = [] }: { rows: GovernedInputRow[]; issue: CheckIssue; u2Available: boolean; large?: boolean; deletedSourceRowIds?: string[] }) {
  const profileRows = useMemo(() => rows.map((item) => ({
    sourceRowId: item.sourceRowId,
    depthM: item.row.depthM,
    qcKpa: item.row.qcKpa,
    fsKpa: item.row.fsKpa,
    u2Kpa: u2Available ? item.row.u2Kpa : Number.NaN,
  })), [rows, u2Available]);
  const baseSampled = useMemo(() => {
    const startedAt = performance.now();
    const result = sampleCheckProfileRows(profileRows, large ? 900 : 539);
    return { ...result, samplingMs: performance.now() - startedAt };
  }, [large, profileRows]);
  const sampled = useMemo(() => {
    if (!issue.sourceRowId || baseSampled.rows.some((row) => row.sourceRowId === issue.sourceRowId)) return baseSampled;
    const issueRow = profileRows.find((row) => row.sourceRowId === issue.sourceRowId);
    if (!issueRow) return baseSampled;
    const rowsWithIssue = [...baseSampled.rows, { ...issueRow, sourceIndex: profileRows.indexOf(issueRow) }]
      .sort((left, right) => left.depthM - right.depthM || left.sourceIndex - right.sourceIndex);
    return { ...baseSampled, rows: rowsWithIssue };
  }, [baseSampled, issue.sourceRowId, profileRows]);
  if (!profileRows.length) return <p className="short-note">当前点位没有可显示的整孔曲线。</p>;

  const tracks: Array<{ field: CheckProfileField; label: string; unit: string; className: string }> = [
    { field: 'qcKpa', label: 'qc', unit: 'kPa', className: 'qc' },
    { field: 'fsKpa', label: 'fs', unit: 'kPa', className: 'fs' },
    ...(sampled.hasU2 ? [{ field: 'u2Kpa' as const, label: 'u2', unit: 'kPa', className: 'u2' }] : []),
  ];
  const width = large ? 1200 : 960;
  const height = large ? 500 : 162;
  const plot = { left: 58, right: 12, top: 30, bottom: 26, gap: 10 };
  const plotBottom = height - plot.bottom;
  const trackWidth = (width - plot.left - plot.right - plot.gap * (tracks.length - 1)) / tracks.length;
  const depths = profileRows.map((row) => row.depthM).filter(Number.isFinite);
  const depthMin = Math.min(...depths);
  const depthMax = Math.max(...depths);
  const depthSpan = Math.max(0.001, depthMax - depthMin);
  const y = (depthM: number) => plot.top + ((depthM - depthMin) / depthSpan) * (plotBottom - plot.top);
  const issueRow = issue.sourceRowId ? profileRows.find((row) => row.sourceRowId === issue.sourceRowId) ?? null : null;
  const hasDepthHighlight = issue.evidenceScope !== 'point-context' && issue.evidenceScope !== 'profile-wide' && Boolean(issueRow || (typeof issue.depthFromM === 'number' && typeof issue.depthToM === 'number'));
  const problemFields = profileProblemFields(issue);
  const hasExplicitDepthRange = typeof issue.depthFromM === 'number' && typeof issue.depthToM === 'number';
  const issueFrom = clampProfileDepth(hasExplicitDepthRange ? issue.depthFromM as number : issueRow?.depthM ?? depthMin, depthMin, depthMax);
  const issueTo = clampProfileDepth(hasExplicitDepthRange ? issue.depthToM as number : issueRow?.depthM ?? issueFrom, depthMin, depthMax);
  const issueBandTop = Math.min(y(issueFrom), y(issueTo));
  const issueBandHeight = Math.max(4, Math.abs(y(issueTo) - y(issueFrom)));

  const domains = new Map(tracks.map((track) => {
    const values = profileRows.map((row) => row[track.field]).filter(Number.isFinite);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (track.field !== 'u2Kpa' && min >= 0) min = 0;
    if (min === max) {
      const padding = Math.max(1, Math.abs(min) * 0.05);
      min -= padding;
      max += padding;
    }
    return [track.field, { min, max }] as const;
  }));

  return (
    <section
      className={`check-profile-evidence ${large ? 'large' : ''}`}
      data-testid="check-profile-curves"
      data-total-row-count={sampled.totalRowCount}
      data-sampled-row-count={sampled.rows.length}
      data-sampling-ms={sampled.samplingMs.toFixed(2)}
      data-depth-gap-count={sampled.rows.filter((row) => row.depthBreakBefore).length}
      data-has-u2={sampled.hasU2 ? 'true' : 'false'}
    >
      <div className="check-profile-heading">
        <div><strong>整孔曲线</strong><span>沿同一深度查看 qc、fs{sampled.hasU2 ? '、u2' : ''} 的共同变化。</span></div>
        <span className="check-profile-current-key">{hasDepthHighlight ? `当前问题 ${formatProfileDepth(issueFrom, issueTo)}` : '点位上下文 · 影响整孔'}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`整孔 qc、fs${sampled.hasU2 ? '、u2' : ''} 曲线；${hasDepthHighlight ? `当前问题 ${formatProfileDepth(issueFrom, issueTo)}` : '当前项为点位上下文，不对应局部深度'}`}
        data-testid="check-profile-curves-svg"
      >
        <defs>
          {tracks.map((track, index) => {
            const left = plot.left + index * (trackWidth + plot.gap);
            return <clipPath id={`check-profile-clip-${track.field}`} key={track.field}><rect x={left} y={plot.top} width={trackWidth} height={plotBottom - plot.top} /></clipPath>;
          })}
        </defs>
        {tracks.map((track, index) => {
          const left = plot.left + index * (trackWidth + plot.gap);
          return <rect key={track.field} x={left} y={plot.top} width={trackWidth} height={plotBottom - plot.top} className="check-profile-track-background" />;
        })}
        {hasDepthHighlight ? <rect
          x={plot.left}
          y={Math.min(plotBottom - 4, issueBandTop - (issueBandHeight === 4 ? 2 : 0))}
          width={width - plot.left - plot.right}
          height={issueBandHeight}
          className="check-profile-issue-band"
          data-testid="check-profile-issue-band"
          data-depth-from={issueFrom.toFixed(3)}
          data-depth-to={issueTo.toFixed(3)}
        /> : null}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const depth = depthMin + ratio * depthSpan;
          const lineY = y(depth);
          return <g key={ratio}><line x1={plot.left} x2={width - plot.right} y1={lineY} y2={lineY} className="check-profile-grid-line" /><text x={plot.left - 8} y={lineY + 4} textAnchor="end" className="check-profile-depth-label">{depth.toFixed(depthSpan < 5 ? 2 : 1)} m</text></g>;
        })}
        {tracks.map((track, index) => {
          const left = plot.left + index * (trackWidth + plot.gap);
          const domain = domains.get(track.field)!;
          const x = (value: number) => left + ((value - domain.min) / (domain.max - domain.min)) * trackWidth;
          const path = buildCheckProfilePath(sampled.rows, track.field, x, y);
          const issueValue = issueRow?.[track.field];
          return (
            <g key={track.field} data-testid={`check-profile-track-${track.label}`}>
              <text x={left + 6} y={18} className={`check-profile-track-title ${track.className}`}>{track.label}</text>
              <text x={left + trackWidth - 4} y={18} textAnchor="end" className="check-profile-unit">{track.unit}</text>
              <path d={path} className={`check-profile-curve ${track.className}`} clipPath={`url(#check-profile-clip-${track.field})`} />
              <text x={left} y={height - 8} className="check-profile-range-label">{formatProfileValue(domain.min)}</text>
              <text x={left + trackWidth} y={height - 8} textAnchor="end" className="check-profile-range-label">{formatProfileValue(domain.max)}</text>
              {hasDepthHighlight && issueRow && Number.isFinite(issueValue) ? (
                <circle cx={x(issueValue as number)} cy={y(issueRow.depthM)} r={problemFields.has(track.label) ? 4.5 : 3.5} className={`check-profile-issue-point ${track.className} ${problemFields.has(track.label) ? 'problem' : 'reference'}`} data-marker-kind={problemFields.has(track.label) ? 'problem' : 'reference'} data-testid={`check-profile-issue-point-${track.label}`}>
                  <title>{`${track.label} ${formatProfileValue(issueValue as number)} ${track.unit} / ${issueRow.depthM.toFixed(2)} m`}</title>
                </circle>
              ) : null}
              {deletedSourceRowIds.map((sourceRowId) => profileRows.find((row) => row.sourceRowId === sourceRowId)).filter((row): row is typeof profileRows[number] => Boolean(row && Number.isFinite(row[track.field]))).map((row) => <circle key={`${track.field}-${row.sourceRowId}`} cx={x(row[track.field])} cy={y(row.depthM)} r={5} className="check-profile-staged-delete" data-testid="check-profile-staged-delete"><title>{`${row.depthM.toFixed(2)} m 待永久删除`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      <div className="check-profile-footer">
        {hasDepthHighlight ? <span><i className="check-profile-key issue" />粉色带：当前深度问题</span> : <span>当前项不对应局部深度</span>}
        {hasDepthHighlight && issueRow ? <><span>实心点：问题字段</span><span>空心点：同深度参考</span></> : null}
        <span>{sampled.totalRowCount > sampled.rows.length ? `显示 ${sampled.rows.length}/${sampled.totalRowCount} 个保极值采样点` : `显示全部 ${sampled.totalRowCount} 行`}</span>
        {!sampled.hasU2 ? <span data-testid="check-profile-no-u2">无 u2，本页不绘制空曲线</span> : null}
      </div>
    </section>
  );
}

function clampProfileDepth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatProfileDepth(from: number, to: number) {
  return Math.abs(to - from) < 0.0005 ? `${from.toFixed(2)} m` : `${Math.min(from, to).toFixed(2)}-${Math.max(from, to).toFixed(2)} m`;
}

function formatProfileValue(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(Math.abs(value) >= 10000 ? 0 : 1)}k`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function profileProblemFields(issue: CheckIssue) {
  const fieldName = (issue.fieldName ?? '').toLowerCase();
  return new Set(['qc', 'fs', 'u2'].filter((field) => fieldName.includes(field)));
}

function CheckDataEvidence({ governance, rows }: { governance: DataGovernanceWorkspaceV3 | null; rows: GovernedInputRow[] }) {
  const smoothing = governance ? activeSmoothing(governance) : null;
  const exclusion = governance ? currentExclusion(governance) : null;
  const excluded = new Set(exclusion?.excludedSourceRowIds ?? []);
  const viewMode = governance?.viewMode ?? 'raw';
  if (!rows.length) {
    return (
      <section className="project-main-panel pro-panel check-data-evidence" data-testid="check-data-evidence">
        <div className="section-header"><div><h2>测量曲线证据</h2><span>导入有效测量行后显示原始与平滑对照。</span></div></div>
        <p className="short-note">当前点位没有可显示的测量行。</p>
      </section>
    );
  }

  const width = 820;
  const height = 290;
  const plot = { left: 54, right: 20, top: 18, bottom: 28 };
  const depthMin = Math.min(...rows.map((item) => item.row.depthM));
  const depthMax = Math.max(...rows.map((item) => item.row.depthM));
  const qcValues = [
    ...rows.map((item) => item.row.qcKpa),
    ...(smoothing?.rows.map((item) => item.smoothedQcKpa) ?? []),
  ].filter(Number.isFinite);
  const qcMax = Math.max(1, ...qcValues);
  const x = (value: number) => plot.left + (Math.max(0, value) / qcMax) * (width - plot.left - plot.right);
  const y = (depth: number) => plot.top + ((depth - depthMin) / Math.max(0.001, depthMax - depthMin)) * (height - plot.top - plot.bottom);
  const rawPath = rows.filter((item) => !excluded.has(item.sourceRowId)).map((item, index) => `${index ? 'L' : 'M'} ${x(item.row.qcKpa).toFixed(2)} ${y(item.row.depthM).toFixed(2)}`).join(' ');
  const smoothPath = smoothing?.rows.map((item, index) => `${index ? 'L' : 'M'} ${x(item.smoothedQcKpa).toFixed(2)} ${y(item.depthM).toFixed(2)}`).join(' ') ?? '';
  const anomalies = smoothing?.rows.filter((item) => item.anomaly) ?? [];
  const showRaw = viewMode === 'raw' || viewMode === 'overlay' || !smoothing;
  const showSmooth = Boolean(smoothing && (viewMode === 'smoothed' || viewMode === 'overlay'));

  return (
    <section className="project-main-panel pro-panel check-data-evidence" data-testid="check-data-evidence" data-view-mode={viewMode}>
      <div className="section-header">
        <div><h2>测量曲线证据</h2><span>qc 随深度变化；排除行不参与平滑，原始值始终保留。</span></div>
        <div className="check-chart-legend">
          {showRaw ? <span className="raw">原始 qc</span> : null}
          {showSmooth ? <span className="smooth">平滑 qc</span> : null}
          <span className="excluded">排除 {excluded.size}</span>
          <span className="anomaly">异常 {anomalies.length}</span>
        </div>
      </div>
      <div className="check-chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="qc 原始与平滑深度曲线" data-testid="check-governance-chart">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line x1={plot.left} x2={width - plot.right} y1={plot.top + ratio * (height - plot.top - plot.bottom)} y2={plot.top + ratio * (height - plot.top - plot.bottom)} className="grid-line" />
              <text x={8} y={plot.top + ratio * (height - plot.top - plot.bottom) + 4}>{(depthMin + ratio * (depthMax - depthMin)).toFixed(1)} m</text>
            </g>
          ))}
          {[0, 0.5, 1].map((ratio) => <text key={ratio} x={plot.left + ratio * (width - plot.left - plot.right)} y={height - 6} textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'}>{(ratio * qcMax / 1000).toFixed(1)} MPa</text>)}
          {showRaw ? <path d={rawPath} className="raw-curve" /> : null}
          {showSmooth ? <path d={smoothPath} className="smooth-curve" /> : null}
          {rows.filter((item) => excluded.has(item.sourceRowId)).map((item) => <circle key={item.sourceRowId} cx={x(item.row.qcKpa)} cy={y(item.row.depthM)} r={4} className="excluded-point"><title>{item.row.depthM.toFixed(2)} m 已排除</title></circle>)}
          {anomalies.map((item) => <circle key={item.sourceRowId} cx={x(item.rawQcKpa)} cy={y(item.depthM)} r={5} className="anomaly-point"><title>{item.depthM.toFixed(2)} m 平滑偏差提示</title></circle>)}
        </svg>
      </div>
      <div className="check-governance-summary">
        <span>原始 {rows.length} 行</span>
        <span>有效 {rows.length - excluded.size} 行</span>
        <span>{exclusion ? `排除修订 v${exclusion.version}` : '未创建排除修订'}</span>
        <span>{smoothing ? `窗口 ${smoothing.settings.depthWindowM.toFixed(2)} m` : '未运行平滑'}</span>
      </div>
    </section>
  );
}

function issueVisualClass(issue: CheckIssue, staleArtifact: boolean) {
  if (issue.issueId === 'check-not-run' || (staleArtifact && issue.issueId === 'check-import-stale')) return 'notice';
  return issue.severity === 'blocking' ? 'issue' : issue.severity === 'warning' ? 'notice' : 'ok';
}

function issueStatusClass(issue: CheckIssue, staleArtifact: boolean) {
  if (issue.issueId === 'check-not-run' || (staleArtifact && issue.issueId === 'check-import-stale')) return 'status-info';
  return issue.severity === 'blocking' ? 'status-warning' : issue.severity === 'warning' ? 'status-info' : 'status-success';
}

function issueDisplayLabel(issue: CheckIssue, staleArtifact: boolean) {
  if (issue.issueId === 'check-not-run') return '尚未检查';
  return staleArtifact && issue.issueId === 'check-import-stale' ? '需重新检查' : issueSeverityLabel(issue.severity);
}

function checkStateStatusClass(checkState: string) {
  if (checkState === '无问题') return 'status-success';
  if (checkState === '仅提示' || checkState === '需重新检查' || checkState === '未检查') return 'status-info';
  return 'status-warning';
}

function sameCheckInput(left: CheckRunRecord['input'], right: CheckRunRecord['input']) {
  if (!left || !right) return false;
  return left.pointId === right.pointId
    && left.draftId === right.draftId
    && left.batchId === right.batchId
    && left.revisions.source === right.revisions.source
    && left.revisions.mapping === right.revisions.mapping
    && left.revisions.unit === right.revisions.unit
    && left.revisions.normalization === right.revisions.normalization
    && left.revisions.pointPlan === right.revisions.pointPlan;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
