import { AlertTriangle, BarChart3, FileInput, History, Layers3, ListChecks, TableProperties, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { MetricInline } from '../../components/workbench/MetricInline';
import type { StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import type {
  ParameterDerivedInputRowV2,
  JtsDissipationResultRevisionV6,
  JtsDissipationT50RevisionV6,
  JtsDissipationTestRevisionV6,
  JtsParameterMethodIdV5,
  JtsParameterPackageRunV5,
  ParameterInputDerivationRunV2,
  ParameterRunV2,
  ParameterSchemeRevisionV2,
  ParameterSchemeV2,
  ParameterSlotV2,
  ParameterValueV2,
} from './parameterTypes';
import { dissipationNormalizedRows } from './jtsDissipationDomain';
import { diagnoseJtsParameterIssue } from './parameterIssueDiagnosis';

export type ParameterWorkbenchDisplaySlot = {
  symbol: string;
  unit: string;
  methodLabel: string;
  targetLayerIds: string[];
  resultColor: string;
  previousResultColor: string;
};

export type ParameterWorkbenchDisplayValue = {
  sourceRowId: string;
  depthM: number;
  value: number | null;
  eligibleForCurrentResult: boolean;
  statusLabel: string;
  tone: 'ok' | 'warn' | 'neutral';
};

export type ParameterWorkbenchDisplayRun = {
  runId: string;
  status: ParameterRunV2['status'];
  values: ParameterWorkbenchDisplayValue[];
  layerSummaries: ParameterRunV2['layerSummaries'];
  summary: {
    rowCount: number;
    eligibleValueCount: number;
    trialOnlyValueCount: number;
    problemValueCount: number;
  } | null;
  issues: ParameterRunV2['issues'];
  targetLayerIds: string[];
};

export function builtinParameterDisplaySlot(slot: ParameterSlotV2 | null): ParameterWorkbenchDisplaySlot | null {
  return slot ? {
    symbol: slot.symbol,
    unit: slot.unit,
    methodLabel: methodLabel(slot),
    targetLayerIds: [...slot.targetScope.layerIds],
    resultColor: '#2abf9a',
    previousResultColor: '#35b0f5',
  } : null;
}

export function builtinParameterDisplayRun(run: ParameterRunV2 | null): ParameterWorkbenchDisplayRun | null {
  return run ? {
    runId: run.runId,
    status: run.status,
    values: run.values.map((value) => ({ sourceRowId: value.sourceRowId, depthM: value.depthM, value: value.value, eligibleForCurrentResult: value.eligibleForCurrentResult, statusLabel: methodResultStatusLabel(value.status), tone: value.status === 'Valid' || value.status === 'ValidWithNotice' ? 'ok' : 'warn' })),
    layerSummaries: run.layerSummaries,
    summary: run.summary,
    issues: run.issues,
    targetLayerIds: [...run.targetScopeSnapshot.layerIds],
  } : null;
}

export type ParameterWorkbenchView = 'curves' | 'rows' | 'layers' | 'issues';

export function guidedParameterHandoffCopy(readyForOutput: boolean, problemCount: number) {
  if (readyForOutput) return {
    title: '当前参数已可用于成果',
    detail: '请确认本次纳入范围；确认后进入成果输出。',
    action: '确认当前参数并进入成果输出',
  };
  if (problemCount > 0) return {
    title: '已完成的参数可先用于本次成果',
    detail: `${problemCount} 项未完成参数可在确认时标记为“本阶段不纳入”。`,
    action: '确认当前参数并进入成果输出',
  };
  return {
    title: '当前没有可用于成果的参数结果',
    detail: '当前配置没有形成可用结果，请调整参数选择或方法后重新试算。',
    action: '调整参数配置',
  };
}

export type ParameterWorkbenchDocumentProps = {
  projectName: string;
  pointName: string;
  jtsPackage?: JtsParameterPackageRunV5 | null;
  dissipationTest?: JtsDissipationTestRevisionV6 | null;
  dissipationT50?: JtsDissipationT50RevisionV6 | null;
  dissipationResult?: JtsDissipationResultRevisionV6 | null;
  sourceProblem: string | null;
  scheme: ParameterSchemeV2 | null;
  schemeRevision: ParameterSchemeRevisionV2 | null;
  historicalRevision: boolean;
  statusOverride?: { label: string; tone: string; title: string; detail: string };
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  derivationRun: ParameterInputDerivationRunV2 | null;
  slot: ParameterWorkbenchDisplaySlot | null;
  run: ParameterWorkbenchDisplayRun | null;
  previousRun: ParameterWorkbenchDisplayRun | null;
  view: ParameterWorkbenchView;
  selectedSourceRowId: string | null;
  selectedLayerId: string | null;
  guidedMode?: boolean;
  guidedDraftActive?: boolean;
  guidedOutputReady?: boolean;
  guidedProblemCount?: number;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryTone?: 'primary' | 'secondary';
  onPrimary: () => void;
  onOpenRoute: (route: 'check' | 'stratification' | 'output') => void;
  onChangeView: (view: ParameterWorkbenchView) => void;
  onSelectRow: (sourceRowId: string, layerId?: string) => void;
  onSelectLayer: (layerId: string) => void;
  onLocateIssueRow: (sourceRowId: string) => void;
  onConfigureJtsMethod?: (methodId: JtsParameterMethodIdV5) => void;
  onOpenJtsAdvanced?: () => void;
  onStartJtsDataRecovery?: (methodId: JtsParameterMethodIdV5) => void;
  onIgnoreJtsProblemPoints?: (methodId: JtsParameterMethodIdV5, sourceRowIds: string[], mode?: 'standard' | 'forced') => { ok: true } | { ok: false; problem: string };
  onSkipJtsMethod?: (methodId: JtsParameterMethodIdV5, reason: 'not-needed-this-stage' | 'insufficient-data' | 'provided-by-other-test') => { ok: true } | { ok: false; problem: string };
  onConfirmJtsOutputScope?: () => { ok: true } | { ok: false; problem: string };
};

function JtsParameterPackageEvidence({
  run,
  onConfigureMethod,
  onOpenAdvanced,
  onStartDataRecovery,
  onIgnoreProblemPoints,
  onSkipMethod,
}: {
  run: JtsParameterPackageRunV5;
  onConfigureMethod?: (methodId: JtsParameterMethodIdV5) => void;
  onOpenAdvanced?: () => void;
  onStartDataRecovery?: (methodId: JtsParameterMethodIdV5) => void;
  onIgnoreProblemPoints?: ParameterWorkbenchDocumentProps['onIgnoreJtsProblemPoints'];
  onSkipMethod?: ParameterWorkbenchDocumentProps['onSkipJtsMethod'];
}) {
  const required = run.checklist.filter((item) => item.level === 'required' && item.applicableLayerIds.length);
  const visible = run.checklist.filter((item) => item.status !== 'unavailable' || item.applicableLayerIds.length);
  const parameterIndex = useMemo(() => {
    const validValues = new Map<JtsParameterMethodIdV5, JtsParameterPackageRunV5['values']>();
    const representatives = new Map<JtsParameterMethodIdV5, JtsParameterPackageRunV5['representativeValues']>();
    run.values.forEach((value) => {
      if (value.status !== 'value' || !isFiniteNumber(value.value)) return;
      const entries = validValues.get(value.methodId) ?? [];
      entries.push(value);
      validValues.set(value.methodId, entries);
    });
    validValues.forEach((entries) => entries.sort((left, right) => left.depthM - right.depthM));
    run.representativeValues.forEach((value) => {
      const entries = representatives.get(value.methodId) ?? [];
      entries.push(value);
      representatives.set(value.methodId, entries);
    });
    return { validValues, representatives };
  }, [run]);
  const curveMethods = visible.filter((item) => item.status === 'complete' && item.valueCount > 0 && (parameterIndex.validValues.get(item.methodId)?.length ?? 0) > 0);
  const [selectedMethodId, setSelectedMethodId] = useState<JtsParameterMethodIdV5 | null>(() => curveMethods[0]?.methodId ?? null);
  const [selectedSourceRowId, setSelectedSourceRowId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [issueMethodId, setIssueMethodId] = useState<JtsParameterMethodIdV5 | null>(null);
  const [skipReason, setSkipReason] = useState<'' | 'not-needed-this-stage' | 'insufficient-data' | 'provided-by-other-test'>('');
  const [issueActionPending, setIssueActionPending] = useState(false);
  const [issueActionProblem, setIssueActionProblem] = useState('');
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const issueActionPendingRef = useRef(false);
  useEffect(() => {
    if (!curveMethods.some((item) => item.methodId === selectedMethodId)) setSelectedMethodId(curveMethods[0]?.methodId ?? null);
    setSelectedSourceRowId(null);
    setSelectedLayerId(null);
  }, [run.runId, selectedMethodId, curveMethods.map((item) => item.methodId).join('|')]);
  const selectedMethod = visible.find((item) => item.methodId === selectedMethodId) ?? curveMethods[0] ?? null;
  const diagnosis = issueMethodId ? diagnoseJtsParameterIssue(run, issueMethodId) : null;
  const selectedValues = selectedMethod ? parameterIndex.validValues.get(selectedMethod.methodId) ?? [] : [];
  const selectedCurvePoints = useMemo(() => selectedMethodId ? jtsParameterCurvePoints(run, selectedMethodId) : [], [run, selectedMethodId]);
  const selectedRepresentatives = selectedMethod ? parameterIndex.representatives.get(selectedMethod.methodId) ?? [] : [];
  const depthFromM = run.layerSnapshot.length ? Math.min(...run.layerSnapshot.map((layer) => layer.depthFromM)) : Math.min(...selectedValues.map((value) => value.depthM), 0);
  const depthToM = run.layerSnapshot.length ? Math.max(...run.layerSnapshot.map((layer) => layer.depthToM)) : Math.max(...selectedValues.map((value) => value.depthM), 1);
  const selectedDepth = selectedValues.find((value) => value.sourceRowId === selectedSourceRowId)?.depthM ?? null;
  const rowLayer = (depthM: number) => run.layerSnapshot.find((layer, index) => depthM >= layer.depthFromM && (depthM < layer.depthToM || (index === run.layerSnapshot.length - 1 && depthM <= layer.depthToM)));
  const curveTrack: CurveTrack | null = selectedMethod ? {
    key: `jts-${selectedMethod.methodId}`,
    title: `${selectedMethod.symbol} · ${selectedMethod.label}`,
    unit: selectedMethod.unit === '1' ? '' : selectedMethod.unit,
    includeZero: selectedMethod.methodId === 'jts_su_nkt' || selectedMethod.methodId === 'manual_silt_su',
    minimumDomain: 0,
    maxInteractivePoints: 120,
    series: [{
      key: 'current-result',
      label: '当前试算',
      color: '#35b0f5',
      values: selectedCurvePoints,
    }],
  } : null;
  const openMethod = (item: JtsParameterPackageRunV5['checklist'][number]) => {
    const curveAvailable = curveMethods.some((candidate) => candidate.methodId === item.methodId);
    if (curveAvailable) {
      setSelectedMethodId(item.methodId);
      return;
    }
    if (['problem', 'pending'].includes(item.status)) {
      setIssueMethodId(item.methodId);
      setSkipReason('');
      setIssueActionProblem('');
      setForceConfirmOpen(false);
    }
  };
  const closeIssue = () => {
    if (issueActionPending) return;
    setIssueMethodId(null);
    setIssueActionProblem('');
    setForceConfirmOpen(false);
  };
  const runIssueAction = async (action: 'recommended' | 'skip') => {
    if (!diagnosis) return;
    if (action === 'skip') {
      if (!onSkipMethod) return;
      if (issueActionPendingRef.current) return;
      if (!skipReason) {
        setIssueActionProblem('请先选择本次参数试算不计算的原因。');
        return;
      }
      issueActionPendingRef.current = true;
      setIssueActionPending(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const result = onSkipMethod(diagnosis.item.methodId, skipReason);
      issueActionPendingRef.current = false;
      setIssueActionPending(false);
      if (!result.ok) {
        setIssueActionProblem(result.problem);
        return;
      }
      closeIssue();
      return;
    }
    if (diagnosis.owner === 'parameter-local') {
      if (!diagnosis.pointIgnore?.available || !onIgnoreProblemPoints) return;
      if (issueActionPendingRef.current) return;
      issueActionPendingRef.current = true;
      setIssueActionPending(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const result = onIgnoreProblemPoints(diagnosis.item.methodId, diagnosis.pointIgnore.sourceRowIds);
      issueActionPendingRef.current = false;
      setIssueActionPending(false);
      if (!result.ok) {
        setIssueActionProblem(result.problem);
        return;
      }
    } else if (diagnosis.owner === 'data-check') onStartDataRecovery?.(diagnosis.item.methodId);
    else if (diagnosis.owner === 'advanced-parameter') onOpenAdvanced?.();
    else onConfigureMethod?.(diagnosis.item.methodId);
    closeIssue();
  };
  const runForcedIgnore = async () => {
    if (!diagnosis?.pointIgnore?.forceAllowed || diagnosis.pointIgnore.available || !onIgnoreProblemPoints) return;
    if (issueActionPendingRef.current) return;
    issueActionPendingRef.current = true;
    setIssueActionPending(true);
    setIssueActionProblem('');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const result = onIgnoreProblemPoints(diagnosis.item.methodId, diagnosis.pointIgnore.sourceRowIds, 'forced');
    issueActionPendingRef.current = false;
    setIssueActionPending(false);
    if (!result.ok) {
      setIssueActionProblem(result.problem);
      return;
    }
    closeIssue();
  };
  const startIssueDataRecovery = () => {
    if (!diagnosis) return;
    onStartDataRecovery?.(diagnosis.item.methodId);
    closeIssue();
  };
  const ignoredDecisionByKey = new Map((run.settingsSnapshot.ignoredPointDecisions ?? []).map((decision) => [`${decision.methodId}:${decision.sourceRowId}`, decision]));
  return (
    <section className="project-main-panel pro-panel jts-parameter-package-evidence" data-testid="jts-parameter-package-evidence">
      <div className="section-header">
        <div><h2>JTS 参数试算结果</h2><span>依据当前分类与已提交分层生成；结果不代表正式工程采纳。</span></div>
        <div className="check-chart-legend"><span className="smooth">默认项已计算 {run.summary.requiredComplete}</span><span className="raw">明确不计算 {run.summary.totalSkipped ?? run.summary.requiredSkipped ?? 0}</span><span className="anomaly">默认项待处理 {run.summary.requiredPending}</span><span className="raw">有效值 {run.summary.valueCount}</span>{run.summary.ignoredPointCount ? <span className={run.summary.forcedIgnoredPointCount ? 'anomaly' : 'raw'}>局部忽略 {run.summary.ignoredPointCount}{run.summary.forcedIgnoredPointCount ? `（强制 ${run.summary.forcedIgnoredPointCount}）` : ''}</span> : null}{run.summary.classificationConflictCount ? <span className="anomaly">行级分类差异 {run.summary.classificationConflictCount}</span> : null}</div>
      </div>
      <div className="jts-parameter-selector" data-testid="jts-parameter-selector" aria-label="选择参数曲线">
        {visible.map((item) => {
          const curveAvailable = curveMethods.some((candidate) => candidate.methodId === item.methodId);
          const stateLabel = curveAvailable ? `${item.valueCount} 个值` : item.status === 'pending' ? '待处理' : item.status === 'problem' ? '存在问题' : item.status === 'not-selected' ? (item.reason.startsWith('工程师已选择') ? '明确不计算' : '本次未选择') : '无可用曲线';
          const actionableIssue = ['problem', 'pending'].includes(item.status);
          return <button type="button" key={item.methodId} className={`${item.status} ${item.methodId === selectedMethod?.methodId ? 'selected' : ''}`} disabled={!curveAvailable && !actionableIssue} onClick={() => openMethod(item)} aria-haspopup={actionableIssue ? 'dialog' : undefined} data-testid={`jts-parameter-selector-${item.methodId}`} title={curveAvailable ? `查看 ${item.symbol} 深度曲线` : actionableIssue ? `查看 ${item.symbol} 不能计算的原因和处理方式` : item.reason}><strong>{item.symbol}</strong><span>{item.label}</span><em>{stateLabel}{actionableIssue ? ' · 点击处理' : ''}</em></button>;
        })}
      </div>
      <div className="jts-parameter-result-grid">
        <div className="jts-parameter-curve" data-testid="jts-parameter-curve" data-method-id={selectedMethod?.methodId ?? ''}>
          <div className="query-card-heading"><div><h3>{selectedMethod ? `${selectedMethod.symbol} 深度曲线` : '参数深度曲线'}</h3><span>{selectedMethod ? `${selectedValues.length} 个当前有效值 · ${selectedMethod.unit === '1' ? '无量纲' : selectedMethod.unit}` : '当前没有可绘制参数'}</span></div><div className="parameter-soil-legend" aria-label="工程土类大类颜色"><span><i className="soil-sand" />砂性土</span><span><i className="soil-mixed" />混合土</span><span><i className="soil-clay" />黏性土</span><em>底色来自当前分层修订</em></div></div>
          {curveTrack && selectedValues.length ? <div className="jts-parameter-single-curve">
            <DepthAxis depthFromM={depthFromM} depthToM={depthToM} selectedDepth={selectedDepth} />
            <CurveTrackView track={curveTrack} layers={run.layerSnapshot} depthFromM={depthFromM} depthToM={depthToM} selectedDepth={selectedDepth} selectedSourceRowId={selectedSourceRowId} selectedLayerId={selectedLayerId} rowLayer={rowLayer} onSelectRow={(sourceRowId, layerId) => { setSelectedSourceRowId(sourceRowId); if (layerId) setSelectedLayerId(layerId); }} onSelectLayer={setSelectedLayerId} />
          </div> : <div className="parameter-guided-empty"><h2>当前参数没有可用曲线</h2><p>{selectedMethod?.reason ?? '本次试算没有生成逐深度有效值。'}</p></div>}
        </div>
        <div className="jts-representative-table" data-testid="jts-package-representatives">
          <div className="query-card-heading"><div><h3>{selectedMethod?.symbol ?? '当前参数'} 层代表值</h3><span>点击层可在曲线中定位 · {selectedMethod?.unit === '1' ? '无量纲' : selectedMethod?.unit ?? '—'}</span></div><span>{selectedRepresentatives.length} 层</span></div>
          <table className="point-table"><thead><tr><th>当前分层修订</th><th>n</th><th>中位数</th><th>范围</th></tr></thead><tbody>{selectedRepresentatives.map((value) => {
            const layerIndex = run.layerSnapshot.findIndex((layer) => layer.layerId === value.layerId);
            const layer = run.layerSnapshot[layerIndex];
            return <tr key={`${value.layerId}:${value.methodId}`} className={`${value.layerId === selectedLayerId ? 'selected' : ''} ${parameterSoilGroupClass(layer?.engineeringSoilGroup)}`} onClick={() => setSelectedLayerId(value.layerId)} data-layer-id={value.layerId} data-layer-name={layer?.name ?? ''} data-depth-from={layer?.depthFromM} data-depth-to={layer?.depthToM} data-soil-group={layer?.engineeringSoilGroup}><td><span className="parameter-layer-cell"><i /><strong>L{layerIndex + 1}</strong><span title={layer?.name ?? value.layerId}>{layer?.name ?? value.layerId}</span></span></td><td>{value.validValueCount}</td><td>{value.median?.toFixed(3) ?? '—'}</td><td>{value.minimum?.toFixed(3) ?? '—'}–{value.maximum?.toFixed(3) ?? '—'}</td></tr>;
          })}</tbody></table>
        </div>
      </div>
      <details className="jts-package-audit"><summary>方法状态与审计依据（{visible.length}）</summary><div className="jts-package-checklist" data-testid="jts-package-checklist">{visible.map((item) => {
        const curveAvailable = curveMethods.some((candidate) => candidate.methodId === item.methodId);
        const actionableIssue = ['problem', 'pending'].includes(item.status);
        return <button type="button" disabled={!curveAvailable && !actionableIssue} onClick={() => openMethod(item)} className={`jts-package-item ${item.status}`} key={item.methodId} aria-haspopup={actionableIssue ? 'dialog' : undefined} data-testid={`jts-package-status-${item.methodId}`}><span>{item.level === 'required' ? '默认纳入' : item.level === 'recommended' ? '建议纳入' : '按需纳入'}</span><strong>{item.symbol} · {item.label}</strong><em>{item.status === 'complete' ? `${item.valueCount} 个值` : item.status === 'pending' ? '待处理 · 点击查看' : item.status === 'problem' ? '存在问题 · 点击查看' : item.status === 'not-selected' ? (item.reason.startsWith('工程师已选择') ? '明确不计算' : '本次未选择') : '不适用'}</em><small>{item.reason}</small></button>;
      })}</div>{run.values.some((value) => value.status === 'ignored') ? <details className="parameter-ignored-point-audit" data-testid="parameter-ignored-point-audit"><summary>查看本次试算忽略的点（{run.values.filter((value) => value.status === 'ignored').length}）</summary><div>{run.values.filter((value) => value.status === 'ignored').map((value) => {
        const decision = ignoredDecisionByKey.get(`${value.methodId}:${value.sourceRowId}`);
        const item = run.checklist.find((candidate) => candidate.methodId === value.methodId);
        return <div key={value.valueId} className={`ignored-point-row ${decision?.forced ? 'forced' : ''}`}><strong>{value.depthM.toFixed(2)} m</strong><span><b>{item?.symbol ?? value.methodId} · {decision?.forced ? `工程师强制忽略 · ${formatDecisionTime(decision.forcedConfirmedAt ?? decision.decidedAt)}` : '局部忽略'}</b>{value.reason}{decision?.forced ? <small>未满足的建议条件：{decision.thresholdViolations?.join('；')} · 仅限本次参数试算</small> : null}</span></div>;
      })}</div></details> : null}</details>
      <div className="check-governance-summary"><span>默认纳入方法 {required.length}</span><span>{run.summary.forcedIgnoredPointCount ? run.summary.eligibleForOutput ? '参数试算可继续；含工程师强制忽略项，成果使用前需复核' : '含工程师强制忽略项；仍有已选参数待处理' : run.summary.eligibleForOutput ? run.summary.totalSkipped ? '可生成带排除声明的部分成果' : '原型成果预检已满足' : '仍有已选参数待处理'}</span><span>运行 {run.status === 'completed' ? '当前' : '需要更新'}</span></div>
      {diagnosis ? <div className="modal-backdrop parameter-issue-backdrop" role="presentation">
        <section className="confirmation-dialog parameter-issue-dialog" role="dialog" aria-modal="true" aria-labelledby="parameter-issue-title" aria-busy={issueActionPending} data-testid="parameter-issue-dialog">
          <div className="confirmation-dialog-heading"><div><span>{forceConfirmOpen ? '参数问题 · 强制忽略确认' : `参数问题 · ${diagnosis.ownerLabel}`}</span><h2 id="parameter-issue-title">{forceConfirmOpen ? `仍要忽略 ${diagnosis.item.symbol} 的这些点吗？` : diagnosis.title}</h2></div><button type="button" className="icon-button" aria-label="关闭参数问题" onClick={closeIssue}><X /></button></div>
          {forceConfirmOpen && diagnosis.pointIgnore ? <>
            <div className="parameter-issue-summary forced"><AlertTriangle /><div><strong>这些点未满足系统建议的局部忽略条件</strong><span>将从 {diagnosis.item.symbol} 中强制忽略 {diagnosis.pointIgnore.sourceRowIds.length} 个点，影响 {diagnosis.affectedLayerIds.length} 个土层；原始测量、分类和分层不会改变。工程师需要确认剩余数据仍可用于本次试算。</span></div></div>
            <div className="parameter-force-violations" data-testid="parameter-force-violations"><strong>未满足的条件</strong>{diagnosis.pointIgnore.thresholdViolations.map((violation) => <p key={violation}>{violation}</p>)}</div>
            <div className="parameter-issue-recommendation"><strong>确认后的影响</strong><p>{diagnosis.consequence} 曲线会在相应深度保留断点，并在审计和成果声明中标记为“工程师强制忽略”。</p></div>
            {issueActionProblem ? <p className="parameter-guide-problem" role="alert" data-testid="parameter-issue-action-problem">{issueActionProblem}</p> : null}
            <div className="confirmation-dialog-actions parameter-issue-actions"><button type="button" className="toolbar-button" onClick={() => { setForceConfirmOpen(false); setIssueActionProblem(''); }} disabled={issueActionPending} data-testid="parameter-force-back">返回上一步</button><button type="button" className="toolbar-button" onClick={startIssueDataRecovery} disabled={issueActionPending} data-testid="parameter-force-return-check">返回数据检查处理原始问题</button><button type="button" className="toolbar-button danger" onClick={runForcedIgnore} disabled={issueActionPending} data-testid="parameter-force-confirm">{issueActionPending ? '正在重新试算…' : '确认强制忽略并重新试算'}</button></div>
          </> : <>
            <div className="parameter-issue-summary"><AlertTriangle /><div><strong>{diagnosis.cause}</strong><span>{diagnosis.consequence}</span></div></div>
            <div className="parameter-issue-facts"><div><span>影响数据</span><strong>{diagnosis.affectedRowCount || '—'} 行</strong></div><div><span>影响土层</span><strong>{diagnosis.affectedLayerIds.length} 层</strong></div><div><span>{diagnosis.owner === 'parameter-local' ? '处理位置' : '建议前往'}</span><strong>{diagnosis.owner === 'parameter-local' ? '当前页面' : diagnosis.ownerLabel}</strong></div></div>
            {diagnosis.reasons.length > 1 ? <div className="parameter-issue-reason-list"><strong>其他检测原因</strong>{diagnosis.reasons.map((entry) => <p key={entry.reason}><span>{entry.reason}</span><em>{entry.count} 行</em></p>)}</div> : null}
            <div className="parameter-issue-recommendation"><strong>建议怎么处理</strong><p>{diagnosis.recommendation}</p></div>
            {diagnosis.pointIgnore ? <div className={`parameter-point-ignore-safety ${diagnosis.pointIgnore.available ? 'available' : diagnosis.pointIgnore.forceAllowed ? 'forceable' : 'unavailable'}`} data-testid="parameter-point-ignore-safety"><strong>{diagnosis.pointIgnore.available ? '可在参数阶段就地处理' : diagnosis.pointIgnore.forceAllowed ? '未满足建议条件，可由工程师确认是否强制忽略' : '当前不能局部忽略'}</strong><span>{diagnosis.pointIgnore.detail}</span>{diagnosis.pointIgnore.forceAllowed && !diagnosis.pointIgnore.available ? <ul>{diagnosis.pointIgnore.thresholdViolations.map((violation) => <li key={violation}>{violation}</li>)}</ul> : null}</div> : null}
            <label className="parameter-issue-skip"><span>或者：本次整项不计算 {diagnosis.item.symbol}</span><small>将移除本次 {diagnosis.item.symbol} 的全部有效值、曲线和层代表值；不修改原始数据与分层。</small><select value={skipReason} onChange={(event) => { setSkipReason(event.target.value as typeof skipReason); setIssueActionProblem(''); }} data-testid="parameter-issue-skip-reason"><option value="">请选择原因</option><option value="insufficient-data">数据不足</option><option value="not-needed-this-stage">本次试算不需要</option><option value="provided-by-other-test">由其他试验提供</option></select></label>
            {issueActionProblem ? <p className="parameter-guide-problem" role="alert" data-testid="parameter-issue-action-problem">{issueActionProblem}</p> : null}
            <div className="confirmation-dialog-actions parameter-issue-actions"><button type="button" className="toolbar-button" onClick={closeIssue} disabled={issueActionPending}>取消</button><button type="button" className="toolbar-button" onClick={() => runIssueAction('skip')} disabled={issueActionPending || !skipReason} data-testid="parameter-issue-skip">{issueActionPending ? '正在重新试算…' : `整项不计算 ${diagnosis.item.symbol} 并重新试算`}</button>{diagnosis.owner === 'parameter-local' && diagnosis.pointIgnore && !diagnosis.pointIgnore.available ? <>{diagnosis.pointIgnore.forceAllowed ? <><button type="button" className="toolbar-button primary" onClick={startIssueDataRecovery} disabled={issueActionPending} data-testid="parameter-issue-return-check">返回数据检查</button><button type="button" className="toolbar-button danger" onClick={() => setForceConfirmOpen(true)} disabled={issueActionPending} data-testid="parameter-issue-force">查看风险并继续</button></> : <button type="button" className="toolbar-button primary" onClick={startIssueDataRecovery} disabled={issueActionPending} data-testid="parameter-issue-primary">去数据检查处理</button>}</> : <button type="button" className="toolbar-button primary" onClick={() => runIssueAction('recommended')} disabled={issueActionPending} data-testid="parameter-issue-primary">{issueActionPending ? '正在重新试算…' : diagnosis.owner === 'parameter-local' ? diagnosis.pointIgnore?.sourceRowIds.length === 1 ? '仅本次忽略此点并重新试算' : `仅本次忽略这 ${diagnosis.pointIgnore?.sourceRowIds.length ?? 0} 个同类点并重新试算` : diagnosis.owner === 'data-check' ? '去数据检查处理' : diagnosis.owner === 'advanced-parameter' ? '打开高级设置' : `去参数向导补充 ${diagnosis.item.symbol}`}</button>}</div>
          </>}
        </section>
      </div> : null}
    </section>
  );
}

function JtsDissipationEvidence({ test, t50, result }: { test: JtsDissipationTestRevisionV6; t50: JtsDissipationT50RevisionV6 | null; result: JtsDissipationResultRevisionV6 | null }) {
  const rows = dissipationNormalizedRows(test);
  const maxTime = Math.max(...rows.map((row) => row.timeSeconds), 1);
  const path = rows.filter((row) => row.normalized !== null).map((row, index) => `${index ? 'L' : 'M'} ${(row.timeSeconds / maxTime) * 620 + 36} ${210 - Math.max(-0.1, Math.min(1.1, row.normalized as number)) * 150}`).join(' ');
  const t50X = t50 ? (t50.t50Seconds / maxTime) * 620 + 36 : null;
  return (
    <section className="project-main-panel pro-panel jts-dissipation-evidence" data-testid="jts-dissipation-evidence">
      <div className="section-header"><div><h2>孔压消散证据</h2><span>{test.fileName} · {test.depthM} m · 原始序列 {test.rows.length} 行</span></div><div className="check-chart-legend"><span className="raw">归一化 U</span><span className="anomaly">50% 交点</span></div></div>
      <div className="dissipation-evidence-grid">
        <svg viewBox="0 0 700 240" role="img" aria-label="归一化孔压随时间消散曲线" data-testid="dissipation-curve">
          <line x1="36" y1="60" x2="656" y2="60" className="dissipation-half-line" />
          <line x1="36" y1="210" x2="656" y2="210" className="dissipation-axis" />
          <line x1="36" y1="30" x2="36" y2="210" className="dissipation-axis" />
          <path d={path} className="dissipation-path" />
          {t50X !== null ? <><line x1={t50X} y1="60" x2={t50X} y2="210" className="dissipation-t50-line" /><circle cx={t50X} cy="60" r="5" className="dissipation-t50-point" /></> : null}
          <text x="8" y="64">0.5</text><text x="620" y="232">时间（s）</text>
        </svg>
        <div className="dissipation-result-table">
          <div><span>试验状态</span><strong>{test.status === 'ready' ? '序列完整' : test.status === 'stale' ? '需要更新' : '存在问题'}</strong></div>
          <div><span>t50</span><strong>{t50 ? `${t50.t50Seconds.toFixed(2)} s` : '尚未确认'}</strong></div>
          <div><span>Ch</span><strong>{result?.status === 'completed' ? `${result.chM2PerSecond.toExponential(4)} m²/s` : '尚未计算'}</strong></div>
          <div><span>kh</span><strong>{result?.status === 'completed' ? `${result.khMPerSecond.toExponential(4)} m/s` : '尚未计算'}</strong></div>
          {test.problem ? <p>{test.problem}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function ParameterWorkbenchDocument(props: ParameterWorkbenchDocumentProps) {
  const runSummary = props.run?.summary;
  const selectedRow = props.derivationRun?.derivedRows.find((row) => row.sourceRowId === props.selectedSourceRowId) ?? null;
  const selectedValue = props.run?.values.find((value) => value.sourceRowId === props.selectedSourceRowId) ?? null;
  const currentStatus = props.statusOverride ?? parameterWorkbenchStatus(props);
  const [scopeConfirmOpen, setScopeConfirmOpen] = useState(false);
  const [scopeConfirmPending, setScopeConfirmPending] = useState(false);
  const [scopeConfirmProblem, setScopeConfirmProblem] = useState('');
  const scopeConfirmPendingRef = useRef(false);
  useEffect(() => {
    if (!scopeConfirmOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || scopeConfirmPendingRef.current) return;
      setScopeConfirmOpen(false);
      setScopeConfirmProblem('');
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [scopeConfirmOpen]);

  if (props.guidedMode) {
    const complete = Boolean(props.jtsPackage?.status === 'completed');
    const eligibleForOutput = complete && Boolean(props.guidedOutputReady);
    const guidedProblemCount = props.guidedProblemCount ?? props.jtsPackage?.summary.requiredPending ?? 0;
    const handoffCopy = guidedParameterHandoffCopy(eligibleForOutput, guidedProblemCount);
    const firstGuidedProblem = props.jtsPackage?.checklist.find((item) => item.applicableLayerIds.length > 0 && (item.status === 'pending' || item.status === 'problem')) ?? null;
    const applicableMethods = props.jtsPackage?.checklist.filter((item) => item.applicableLayerIds.length > 0) ?? [];
    const includedMethods = applicableMethods.filter((item) => item.status === 'complete');
    const skippedMethodIds = new Set(props.jtsPackage?.settingsSnapshot.skippedMethodDecisions?.map((item) => item.methodId) ?? []);
    const excludedMethods = applicableMethods.filter((item) => item.status === 'pending' || item.status === 'problem' || skippedMethodIds.has(item.methodId));
    const unselectedMethodCount = applicableMethods.filter((item) => item.status === 'not-selected' && !skippedMethodIds.has(item.methodId)).length;
    const scopeConfirmed = eligibleForOutput && Boolean(props.jtsPackage?.settingsSnapshot.outputScopeConfirmedAt);
    const readyForOutput = scopeConfirmed;
    const canConfirmScope = complete && includedMethods.length > 0;
    const representativeCount = props.jtsPackage?.representativeValues.length ?? 0;
    const representativeLayerCount = new Set(props.jtsPackage?.representativeValues.map((item) => item.layerId) ?? []).size;
    const closeScopeConfirm = () => {
      if (scopeConfirmPendingRef.current) return;
      setScopeConfirmOpen(false);
      setScopeConfirmProblem('');
    };
    const confirmScope = async () => {
      if (!props.onConfirmJtsOutputScope || scopeConfirmPendingRef.current) return;
      scopeConfirmPendingRef.current = true;
      setScopeConfirmPending(true);
      setScopeConfirmProblem('');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const result = props.onConfirmJtsOutputScope();
      scopeConfirmPendingRef.current = false;
      setScopeConfirmPending(false);
      if (!result.ok) {
        setScopeConfirmProblem(result.problem);
        return;
      }
      setScopeConfirmOpen(false);
      props.onOpenRoute('output');
    };
    return (
      <div className="parameter-document parameter-g2 analysis-page mixpanel-report" data-testid="document-parameters">
        <header className="analysis-header mixpanel-report-header parameter-g2-header">
          <div className="analysis-title-block">
            <div className="analysis-kicker">工程工作台 / 参数解译</div>
            <div className="analysis-title-row">
              <h1>参数解译</h1>
              <span className={`status-pill ${readyForOutput ? 'status-success' : 'status-warning'}`} data-testid="parameter-guided-status">{scopeConfirmed ? '本次参数范围已确认' : eligibleForOutput ? '试算已生成 · 待确认范围' : complete ? '试算已生成 · 待处理' : '待完成'}</span>
            </div>
            <div className="analysis-subtitle">
              <strong>{props.projectName} / {props.pointName}</strong>
              <span>JTS 参数试算</span>
              <span>{complete ? `${representativeLayerCount} 层 / ${representativeCount} 项参数` : props.guidedDraftActive ? '已保存向导进度' : '等待参数向导'}</span>
            </div>
          </div>
          <div className="toolbar-actions analysis-actions">
            <button type="button" className={`toolbar-button ${complete ? '' : 'primary'}`} onClick={props.onPrimary} disabled={props.primaryDisabled} data-testid="parameter-primary-action">
              {props.primaryLabel}
            </button>
          </div>
        </header>

        <section className={`page-decision-strip ${readyForOutput ? 'success' : ''}`} data-testid="parameter-first-look">
          <div>
            <strong>{scopeConfirmed ? '当前参数范围已确认' : complete && eligibleForOutput ? '确认当前参数范围' : complete ? handoffCopy.title : props.guidedDraftActive ? '继续完成参数配置' : '开始参数配置'}</strong>
            <span>{scopeConfirmed ? `已纳入 ${includedMethods.length} 项完成参数${excludedMethods.length ? `，${excludedMethods.length} 项本阶段不纳入` : ''}。` : complete ? handoffCopy.detail : '系统将按已确认地层逐项询问必要的工程判断。'}</span>
          </div>
          {complete ? <button type="button" className="toolbar-button primary" onClick={scopeConfirmed ? () => props.onOpenRoute('output') : canConfirmScope ? () => { setScopeConfirmProblem(''); setScopeConfirmOpen(true); } : () => {
            if (firstGuidedProblem && props.onConfigureJtsMethod) props.onConfigureJtsMethod(firstGuidedProblem.methodId);
            else props.onPrimary();
          }} data-testid={scopeConfirmed ? 'parameter-open-output' : canConfirmScope ? 'parameter-confirm-scope' : 'parameter-resolve-problems'}>
            {scopeConfirmed ? '进入成果输出' : canConfirmScope ? '确认当前参数并进入成果输出' : handoffCopy.action}
          </button> : null}
        </section>

        {props.jtsPackage ? <div data-testid="parameter-guided-result"><JtsParameterPackageEvidence run={props.jtsPackage} onConfigureMethod={props.onConfigureJtsMethod} onOpenAdvanced={props.onOpenJtsAdvanced} onStartDataRecovery={props.onStartJtsDataRecovery} onIgnoreProblemPoints={props.onIgnoreJtsProblemPoints} onSkipMethod={props.onSkipJtsMethod} /></div> : (
          <section className="project-main-panel pro-panel parameter-guided-empty" data-testid="parameter-guided-empty">
            <h2>尚未生成当前参数结果</h2>
            <p>完成参数向导后，这里将直接显示方法状态和层代表值。</p>
          </section>
        )}
        {props.dissipationTest ? <JtsDissipationEvidence test={props.dissipationTest} t50={props.dissipationT50 ?? null} result={props.dissipationResult ?? null} /> : null}
        {scopeConfirmOpen ? <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog parameter-scope-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="parameter-scope-confirm-title" aria-busy={scopeConfirmPending} data-testid="parameter-scope-confirm-dialog">
            <div className="confirmation-dialog-heading"><div><span>参数解译 · 最终范围</span><h2 id="parameter-scope-confirm-title">这些参数足够用于本次成果吗？</h2></div><button type="button" className="icon-button" aria-label="关闭参数范围确认" onClick={closeScopeConfirm} disabled={scopeConfirmPending}><X /></button></div>
            <p>确认后将按以下范围进入成果输出；未完成参数不会补算。</p>
            <p className="parameter-scope-muted">仅确定本次成果参数范围，不修改原始测量、分类依据或已确认地层。</p>
            <div className="parameter-scope-groups">
              <div className="included" data-testid="parameter-scope-included"><div><strong>本次纳入</strong><span>{includedMethods.length} 项</span></div><div className="parameter-scope-tags">{includedMethods.map((item) => <span key={item.methodId}><b>{item.symbol}</b>{item.label}</span>)}</div></div>
              <div className="excluded" data-testid="parameter-scope-excluded"><div><strong>本阶段不纳入</strong><span>{excludedMethods.length} 项</span></div>{excludedMethods.length ? <div className="parameter-scope-tags">{excludedMethods.map((item) => <span key={item.methodId}><b>{item.symbol}</b>{item.label}</span>)}</div> : <small>无</small>}</div>
            </div>
            {unselectedMethodCount ? <p className="parameter-scope-muted">另有 {unselectedMethodCount} 项本次未选择，不影响本次成果。</p> : null}
            {scopeConfirmProblem ? <p className="parameter-guide-problem" role="alert" data-testid="parameter-scope-confirm-problem">{scopeConfirmProblem}</p> : null}
            <div className="confirmation-dialog-actions"><button type="button" className="toolbar-button" onClick={closeScopeConfirm} disabled={scopeConfirmPending} autoFocus>暂不确认</button><button type="button" className="toolbar-button primary" onClick={confirmScope} disabled={scopeConfirmPending} data-testid="parameter-scope-confirm-submit">{scopeConfirmPending ? '正在确认…' : '确认并进入成果输出'}</button></div>
          </section>
        </div> : null}
      </div>
    );
  }

  return (
    <div className="parameter-document parameter-g2 analysis-page mixpanel-report" data-testid="document-parameters">
      <header className="analysis-header mixpanel-report-header parameter-g2-header">
        <div className="analysis-title-block">
          <div className="analysis-kicker">工程工作台 / 参数曲线</div>
          <div className="analysis-title-row">
            <h1>参数解译</h1>
            <span className={`status-pill ${currentStatus.tone}`}>{currentStatus.label}</span>
          </div>
          <div className="analysis-subtitle">
            <strong>{props.projectName} / {props.pointName}</strong>
            <span>{props.scheme?.name ?? '尚未建立参数方案'}</span>
            <span>{props.slot ? `${props.slot.symbol} / ${props.slot.methodLabel}` : '等待方法槽'}</span>
          </div>
        </div>
        <div className="toolbar-actions analysis-actions">
          <button
            type="button"
            className={`toolbar-button ${props.primaryTone === 'secondary' ? '' : 'primary'}`}
            onClick={props.onPrimary}
            disabled={props.primaryDisabled}
            data-testid="parameter-primary-action"
          >
            {props.primaryLabel}
          </button>
        </div>
      </header>

      {props.jtsPackage ? <JtsParameterPackageEvidence run={props.jtsPackage} onConfigureMethod={props.onConfigureJtsMethod} onOpenAdvanced={props.onOpenJtsAdvanced} onStartDataRecovery={props.onStartJtsDataRecovery} onIgnoreProblemPoints={props.onIgnoreJtsProblemPoints} onSkipMethod={props.onSkipJtsMethod} /> : null}
      {props.dissipationTest ? <JtsDissipationEvidence test={props.dissipationTest} t50={props.dissipationT50 ?? null} result={props.dissipationResult ?? null} /> : null}

      {props.sourceProblem ? (
        <section className="page-decision-strip problem" data-testid="parameter-source-problem">
          <div>
            <strong>当前来源不能建立参数运行</strong>
            <span>{props.sourceProblem}</span>
          </div>
          <button type="button" className="toolbar-button" onClick={() => props.onOpenRoute('stratification')}>
            返回地层分层
          </button>
        </section>
      ) : (
        <section className={`page-decision-strip ${currentStatus.tone === 'status-success' ? 'success' : ''}`} data-testid="parameter-first-look">
          <div>
            <strong>{currentStatus.title}</strong>
            <span>{currentStatus.detail}</span>
          </div>
          {selectedRow ? (
            <div className="parameter-selection-summary" data-testid="parameter-selected-row-summary">
              <span>深度 {formatNumber(selectedRow.depthM, 2)} m</span>
              <span>Qtn {formatNullable(selectedRow.qtn, 2)}</span>
              <span>IcRW 软件筛选值 {formatNullable(selectedRow.ic, 2)}</span>
              <strong style={{ color: props.slot?.resultColor }}>{props.slot?.symbol ?? '结果'} {formatNullable(selectedValue?.value ?? null, 2)} {props.slot?.unit ?? ''}</strong>
            </div>
          ) : null}
        </section>
      )}

      <section className="mixpanel-metrics-row parameter-metrics" aria-label="参数解译摘要">
        <MetricInline label={props.historicalRevision ? '查看修订' : '参数修订'} value={props.schemeRevision ? `v${props.schemeRevision.version}` : '未建立'} />
        <MetricInline label="推导行" value={`${props.derivationRun?.summary?.rowCount ?? 0} 行`} />
        <MetricInline label="当前可用值" value={`${runSummary?.eligibleValueCount ?? 0} 个`} tone={runSummary?.eligibleValueCount ? 'ok' : undefined} />
        <MetricInline label="试算值" value={`${runSummary?.trialOnlyValueCount ?? 0} 个`} tone={runSummary?.trialOnlyValueCount ? 'warn' : undefined} />
        <MetricInline label="问题" value={`${runSummary?.problemValueCount ?? props.run?.issues.filter((issue) => issue.severity === 'problem').length ?? 0} 项`} tone={(runSummary?.problemValueCount ?? 0) ? 'warn' : 'ok'} />
        <MetricInline label="查看运行" value={props.run ? runStatusLabel(props.run.status) : '无'} />
      </section>

      <div className="parameter-view-tabs" role="tablist" aria-label="参数工作台视图">
        <ViewButton active={props.view === 'curves'} icon={<BarChart3 size={15} />} label="曲线" onClick={() => props.onChangeView('curves')} />
        <ViewButton active={props.view === 'rows'} icon={<TableProperties size={15} />} label="数据行" onClick={() => props.onChangeView('rows')} />
        <ViewButton active={props.view === 'layers'} icon={<Layers3 size={15} />} label="层统计" onClick={() => props.onChangeView('layers')} />
        <ViewButton active={props.view === 'issues'} icon={<ListChecks size={15} />} label="问题详情" onClick={() => props.onChangeView('issues')} />
      </div>

      <section className="parameter-workbench-surface" data-testid={`parameter-view-${props.view}`}>
        {props.view === 'curves' ? (
          <ParameterCurveWorkbench
            stratificationRevision={props.stratificationRevision}
            derivationRun={props.derivationRun}
            slot={props.slot}
            run={props.run}
            previousRun={props.previousRun}
            selectedSourceRowId={props.selectedSourceRowId}
            selectedLayerId={props.selectedLayerId}
            onSelectRow={props.onSelectRow}
            onSelectLayer={props.onSelectLayer}
          />
        ) : props.view === 'rows' ? (
          <ParameterRowsTable
            stratificationRevision={props.stratificationRevision}
            derivationRun={props.derivationRun}
            slot={props.slot}
            run={props.run}
            selectedSourceRowId={props.selectedSourceRowId}
            onSelectRow={props.onSelectRow}
          />
        ) : props.view === 'layers' ? (
          <ParameterLayerSummary
            stratificationRevision={props.stratificationRevision}
            run={props.run}
            selectedLayerId={props.selectedLayerId}
            onSelectLayer={props.onSelectLayer}
          />
        ) : (
          <ParameterIssuesAndHistory run={props.run} derivationRun={props.derivationRun} onLocateIssueRow={props.onLocateIssueRow} />
        )}
      </section>
    </div>
  );
}

function ParameterCurveWorkbench({
  stratificationRevision,
  derivationRun,
  slot,
  run,
  previousRun,
  selectedSourceRowId,
  selectedLayerId,
  onSelectRow,
  onSelectLayer,
}: {
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  derivationRun: ParameterInputDerivationRunV2 | null;
  slot: ParameterWorkbenchDisplaySlot | null;
  run: ParameterWorkbenchDisplayRun | null;
  previousRun: ParameterWorkbenchDisplayRun | null;
  selectedSourceRowId: string | null;
  selectedLayerId: string | null;
  onSelectRow: (sourceRowId: string, layerId?: string) => void;
  onSelectLayer: (layerId: string) => void;
}) {
  const rows = derivationRun?.derivedRows ?? [];
  const layers = stratificationRevision?.snapshot.layers ?? [];
  const fullDepthFromM = stratificationRevision?.snapshot.depthFromM ?? Math.min(...rows.map((row) => row.depthM), 0);
  const fullDepthToM = stratificationRevision?.snapshot.depthToM ?? Math.max(...rows.map((row) => row.depthM), 1);
  const [depthRangeKey, setDepthRangeKey] = useState('full');
  useEffect(() => setDepthRangeKey('full'), [stratificationRevision?.revisionId]);
  if (!rows.length || !stratificationRevision) {
    return <EmptyWorkbench title="尚无曲线数据" detail="提交参数方案并完成前置推导后，这里会显示共享深度曲线。" />;
  }
  const focusedLayer = layers.find((layer) => layer.layerId === depthRangeKey) ?? null;
  const depthFromM = focusedLayer?.depthFromM ?? fullDepthFromM;
  const depthToM = focusedLayer?.depthToM ?? fullDepthToM;
  const visibleRows = rows.filter((row) => row.depthM >= depthFromM && row.depthM <= depthToM);

  const selectedDepthValue = rows.find((row) => row.sourceRowId === selectedSourceRowId)?.depthM ?? null;
  const selectedDepth = selectedDepthValue !== null && selectedDepthValue >= depthFromM && selectedDepthValue <= depthToM ? selectedDepthValue : null;
  const valuesByRow = new Map(run?.values.map((value) => [value.sourceRowId, value]) ?? []);
  const previousByRow = new Map(previousRun?.values.map((value) => [value.sourceRowId, value]) ?? []);
  const rowLayer = (depthM: number) => layers.find((layer, index) =>
    depthM >= layer.depthFromM && (depthM < layer.depthToM || (index === layers.length - 1 && depthM <= layer.depthToM)));
  const tracks: CurveTrack[] = [
    {
      key: 'qt-qnet',
      title: 'qt / qnet',
      unit: 'kPa',
      includeZero: true,
      series: [
        { key: 'qt', label: 'qt', color: '#35b0f5', values: visibleRows.map((row) => point(row, row.qtKpa)) },
        { key: 'qnet', label: 'qnet', color: '#bdadff', values: visibleRows.map((row) => point(row, row.qnetKpa)) },
      ],
    },
    { key: 'qtn', title: 'Qtn', unit: '', includeZero: false, series: [{ key: 'qtn', label: 'Qtn', color: '#35b0f5', values: visibleRows.map((row) => point(row, row.qtn)) }] },
    { key: 'ic', title: 'IcRW 软件筛选值', unit: '', includeZero: false, series: [{ key: 'ic', label: 'IcRW', color: '#bdadff', values: visibleRows.map((row) => point(row, row.ic)) }] },
    {
      key: 'result',
      title: slot?.symbol ?? '结果',
      unit: slot?.unit ?? '',
      includeZero: false,
      series: [
        ...(previousRun ? [{
          key: 'previous-result',
          label: '对比运行',
          color: slot?.previousResultColor ?? '#bdadff',
          dashed: true,
          showPoints: false,
          opacity: 0.56,
          values: visibleRows.map((row) => point(row, previousByRow.get(row.sourceRowId)?.value ?? null)),
        }] : []),
        {
          key: 'current-result',
          label: '当前运行',
          color: slot?.resultColor ?? '#2abf9a',
          values: visibleRows.map((row) => {
            const value = valuesByRow.get(row.sourceRowId);
            return point(row, value?.eligibleForCurrentResult ? value.value : null);
          }),
        },
      ],
    },
  ];

  return (
    <div className="parameter-curve-workbench" data-testid="parameter-curve-workbench" data-depth-from={depthFromM} data-depth-to={depthToM}>
      <div className="parameter-curve-range-control">
        <label><span>深度区间</span><select value={depthRangeKey} onChange={(event) => setDepthRangeKey(event.target.value)} data-testid="parameter-depth-range-select"><option value="full">全深度 · {formatNumber(fullDepthFromM, 2)}-{formatNumber(fullDepthToM, 2)} m</option>{layers.map((layer) => <option key={layer.layerId} value={layer.layerId}>{layer.name} · {formatNumber(layer.depthFromM, 2)}-{formatNumber(layer.depthToM, 2)} m</option>)}</select></label>
        <span>{visibleRows.length} / {rows.length} 行</span>
      </div>
      <div className="parameter-curve-legend">
        <span><i className="legend-line blue" />输入/对比</span>
        <span><i className="legend-line lavender" />推导量</span>
        <span><i className="legend-line" style={{ borderColor: slot?.resultColor ?? '#2abf9a' }} />当前结果</span>
        <span><i className="legend-line blue dotted" />当前深度</span>
        <span><i className="legend-line rose dotted" />问题或不可用</span>
        {previousRun ? <span data-testid="parameter-history-compare-legend"><i className="legend-line dashed" style={{ borderColor: slot?.previousResultColor ?? '#bdadff' }} />对比运行</span> : null}
      </div>
      <div className="parameter-curve-grid">
        <DepthAxis depthFromM={depthFromM} depthToM={depthToM} selectedDepth={selectedDepth} />
        {tracks.map((track) => (
          <CurveTrackView
            key={track.key}
            track={track}
            layers={layers}
            depthFromM={depthFromM}
            depthToM={depthToM}
            selectedDepth={selectedDepth}
            selectedSourceRowId={selectedSourceRowId}
            selectedLayerId={selectedLayerId}
            rowLayer={rowLayer}
            onSelectRow={onSelectRow}
            onSelectLayer={onSelectLayer}
          />
        ))}
      </div>
    </div>
  );
}

type CurvePoint = { sourceRowId: string; depthM: number; value: number | null };
type CurveSeries = { key: string; label: string; color: string; dashed?: boolean; showPoints?: boolean; opacity?: number; values: CurvePoint[] };
type CurveTrack = { key: string; title: string; unit: string; includeZero: boolean; minimumDomain?: number; maxInteractivePoints?: number; series: CurveSeries[] };
type CurveLayer = { layerId: string; name: string; depthFromM: number; depthToM: number; engineeringSoilGroup?: string };

function CurveTrackView({
  track,
  layers,
  depthFromM,
  depthToM,
  selectedDepth,
  selectedSourceRowId,
  selectedLayerId,
  rowLayer,
  onSelectRow,
  onSelectLayer,
}: {
  track: CurveTrack;
  layers: CurveLayer[];
  depthFromM: number;
  depthToM: number;
  selectedDepth: number | null;
  selectedSourceRowId: string | null;
  selectedLayerId: string | null;
  rowLayer: (depthM: number) => CurveLayer | undefined;
  onSelectRow: (sourceRowId: string, layerId?: string) => void;
  onSelectLayer: (layerId: string) => void;
}) {
  const width = 180;
  const height = 520;
  const top = 18;
  const bottom = 18;
  const left = 15;
  const right = 12;
  const allValues = track.series.flatMap((series) => series.values.map((pointValue) => pointValue.value).filter(isFiniteNumber));
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const paddedMinUnbounded = min === max
    ? min - 0.5
    : track.includeZero
      ? Math.min(0, min - (max - min) * 0.08)
      : min - (max - min) * 0.1;
  const paddedMin = track.minimumDomain === undefined ? paddedMinUnbounded : Math.max(track.minimumDomain, paddedMinUnbounded);
  const paddedMax = min === max ? max + 0.5 : max + (max - min) * 0.08;
  const xTicks = [0, 0.5, 1].map((ratio) => paddedMin + (paddedMax - paddedMin) * ratio);
  const xTickLabels = formatCompactTickSet(xTicks);
  const x = (value: number) => left + ((value - paddedMin) / Math.max(paddedMax - paddedMin, 1e-9)) * (width - left - right);
  const y = (depthM: number) => top + ((depthM - depthFromM) / Math.max(depthToM - depthFromM, 1e-9)) * (height - top - bottom);
  const segmentCount = track.series.reduce((count, series) => count + curveSegments(series.values).length, 0);
  const visibleLayers = layers.filter((layer) => layer.depthToM >= depthFromM && layer.depthFromM <= depthToM);
  const layerPixelHeight = (layer: CurveLayer) => y(Math.min(layer.depthToM, depthToM)) - y(Math.max(layer.depthFromM, depthFromM));
  const layerDetailThreshold = visibleLayers.length > 60 ? 10 : 5;
  const detailLayers = visibleLayers.filter((layer) => layer.layerId === selectedLayerId || layerPixelHeight(layer) >= layerDetailThreshold);
  const denseRanges = visibleLayers.reduce<Array<{ depthFromM: number; depthToM: number; count: number }>>((ranges, layer) => {
    if (layer.layerId === selectedLayerId || layerPixelHeight(layer) >= layerDetailThreshold) return ranges;
    const previous = ranges.at(-1);
    const layerFrom = Math.max(layer.depthFromM, depthFromM);
    const layerTo = Math.min(layer.depthToM, depthToM);
    if (previous && Math.abs(previous.depthToM - layerFrom) < 1e-6) {
      previous.depthToM = layerTo;
      previous.count += 1;
    } else ranges.push({ depthFromM: layerFrom, depthToM: layerTo, count: 1 });
    return ranges;
  }, []);

  return (
    <div className="parameter-curve-track" data-testid={`parameter-curve-track-${track.key}`} data-curve-segment-count={segmentCount} data-domain-min={paddedMin}>
      <div className="parameter-track-heading">
        <strong>{track.title}</strong>
        <span>{track.series.map((series) => series.label).join(' / ')} · {track.unit || '无量纲'}</span>
      </div>
      <div className="parameter-track-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${track.title} 深度曲线`}>
        {denseRanges.map((range) => <rect key={`dense-${range.depthFromM}`} x="0" y={y(range.depthFromM)} width={width} height={Math.max(y(range.depthToM) - y(range.depthFromM), 1)} fill="#edf1f4" opacity="0.72"><title>密集分层区 · {range.count} 层</title></rect>)}
        {detailLayers.map((layer) => {
          const layerY = y(Math.max(layer.depthFromM, depthFromM));
          const layerHeight = Math.max(y(Math.min(layer.depthToM, depthToM)) - layerY, 1);
          const selected = layer.layerId === selectedLayerId;
          return (
            <g key={layer.layerId} onClick={() => onSelectLayer(layer.layerId)} className={`parameter-layer-band ${soilGroupClass(layer.engineeringSoilGroup)} ${selected ? 'selected' : ''}`} data-layer-id={layer.layerId} data-layer-name={layer.name} data-depth-from={layer.depthFromM} data-depth-to={layer.depthToM} data-soil-group={layer.engineeringSoilGroup}>
              <rect
                x="0"
                y={layerY}
                width={width}
                height={layerHeight}
                className="parameter-layer-band-fill"
              />
              <line x1="0" y1={layerY} x2={width} y2={layerY} stroke="#9ba7b6" strokeWidth="0.7" />
              <title>{`L${layers.findIndex((candidate) => candidate.layerId === layer.layerId) + 1} · ${layer.name} · ${layer.depthFromM.toFixed(2)}–${layer.depthToM.toFixed(2)} m`}</title>
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={left + ratio * (width - left - right)} y1={top} x2={left + ratio * (width - left - right)} y2={height - bottom} stroke="#dce2e9" strokeWidth="0.6" />
        ))}
        {track.series.map((series) => (
          <g key={series.key}>
            {curveSegments(series.values).map((segment, index) => (
              <polyline
                key={`${series.key}-${index}`}
                fill="none"
                stroke={series.color}
                strokeWidth={series.key === 'current-result' ? 2.2 : series.key === 'previous-result' ? 3.6 : 1.65}
                strokeDasharray={series.dashed ? '5 4' : undefined}
                opacity={series.opacity ?? 1}
                vectorEffect="non-scaling-stroke"
                points={downsampleCurveExtrema(segment, 1200).map((entry) => `${x(entry.value!)},${y(entry.depthM)}`).join(' ')}
              />
            ))}
          </g>
        ))}
        {selectedDepth !== null ? (
          <line x1="0" y1={y(selectedDepth)} x2={width} y2={y(selectedDepth)} stroke="#217ba9" strokeWidth="1.3" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {track.series.flatMap((series) => series.showPoints === false ? [] : interactiveCurvePoints(series.values, selectedSourceRowId, track.maxInteractivePoints ?? 320)
        .map((entry) => {
          const layer = rowLayer(entry.depthM);
          const selected = entry.sourceRowId === selectedSourceRowId;
          return (
            <button
              type="button"
              key={`${series.key}-${entry.sourceRowId}`}
              className={`parameter-curve-point ${selected ? 'selected' : ''}`}
              style={{ left: `${(x(entry.value!) / width) * 100}%`, top: `${(y(entry.depthM) / height) * 100}%`, borderColor: series.color, background: selected ? '#ffffff' : series.color }}
              data-testid={`parameter-curve-point-${track.key}-${entry.sourceRowId}`}
              aria-label={`${series.label} 深度 ${entry.depthM.toFixed(2)} 米，值 ${entry.value!.toFixed(2)}`}
              onClick={() => onSelectRow(entry.sourceRowId, layer?.layerId)}
            />
          );
        }))}
      </div>
      <div className="parameter-track-range">
        {xTicks.map((tick, index) => <span key={tick}>{xTickLabels[index]}</span>)}
      </div>
    </div>
  );
}

function DepthAxis({ depthFromM, depthToM, selectedDepth }: { depthFromM: number; depthToM: number; selectedDepth: number | null }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => depthFromM + (depthToM - depthFromM) * ratio);
  const visibleTicks = selectedDepth === null
    ? ticks
    : ticks.filter((tick) => Math.abs(tick - selectedDepth) > Math.max((depthToM - depthFromM) * 0.035, 0.08));
  return (
    <div className="parameter-depth-axis" aria-label="共享深度轴">
      <div className="parameter-track-heading"><strong>深度</strong><span>m</span></div>
      <div className="parameter-depth-scale">
        {visibleTicks.map((tick) => <span key={tick} style={{ top: `${((tick - depthFromM) / Math.max(depthToM - depthFromM, 1e-9)) * 100}%` }}>{formatNumber(tick, 2)}</span>)}
        {selectedDepth !== null ? <strong style={{ top: `${((selectedDepth - depthFromM) / Math.max(depthToM - depthFromM, 1e-9)) * 100}%` }}>{formatNumber(selectedDepth, 2)}</strong> : null}
      </div>
      <div className="parameter-track-range"><span>{formatNumber(depthFromM, 1)}</span><span>{formatNumber(depthToM, 1)}</span></div>
    </div>
  );
}

function formatDecisionTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function ParameterRowsTable({
  stratificationRevision,
  derivationRun,
  slot,
  run,
  selectedSourceRowId,
  onSelectRow,
}: {
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  derivationRun: ParameterInputDerivationRunV2 | null;
  slot: ParameterWorkbenchDisplaySlot | null;
  run: ParameterWorkbenchDisplayRun | null;
  selectedSourceRowId: string | null;
  onSelectRow: (sourceRowId: string, layerId?: string) => void;
}) {
  if (!derivationRun) return <EmptyWorkbench title="尚无推导行" detail="完成前置推导后可逐行核对输入、中间量与方法结果。" />;
  const values = new Map(run?.values.map((value) => [value.sourceRowId, value]) ?? []);
  const layers = stratificationRevision?.snapshot.layers ?? [];
  return (
    <div className="point-table-wrap parameter-row-table-wrap">
      <table className="point-table parameter-result-table" data-testid="parameter-result-table">
        <thead><tr><th>深度 m</th><th>地层</th><th>qt kPa</th><th>qnet kPa</th><th>Qtn</th><th>IcRW 软件筛选值</th><th>{slot?.symbol ?? '结果'} {slot?.unit ?? ''}</th><th>状态</th></tr></thead>
        <tbody>
          {derivationRun.derivedRows.map((row) => {
            const value = values.get(row.sourceRowId);
            const layer = layerAtDepth(layers, row.depthM);
            return (
              <tr
                key={row.sourceRowId}
                className={row.sourceRowId === selectedSourceRowId ? 'selected' : ''}
                onClick={() => onSelectRow(row.sourceRowId, layer?.layerId)}
                data-testid={`parameter-result-row-${row.sourceRowId}`}
              >
                <td>{formatNumber(row.depthM, 2)}</td><td>{layer?.name ?? '未归层'}</td><td>{formatNullable(row.qtKpa, 1)}</td><td>{formatNullable(row.qnetKpa, 1)}</td><td>{formatNullable(row.qtn, 2)}</td><td>{formatNullable(row.ic, 2)}</td><td>{formatNullable(value?.value ?? null, 2)}</td><td><RunValueState value={value} derivation={row} target={Boolean(layer && slot?.targetLayerIds.includes(layer.layerId))} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ParameterLayerSummary({
  stratificationRevision,
  run,
  selectedLayerId,
  onSelectLayer,
}: {
  stratificationRevision: StratificationSchemeRevisionV2 | null;
  run: ParameterWorkbenchDisplayRun | null;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
}) {
  if (!stratificationRevision || !run) return <EmptyWorkbench title="尚无层统计" detail="完成所选方法运行后可按精确分层修订查看统计。" />;
  const summaries = new Map(run.layerSummaries.map((summary) => [summary.layerId, summary]));
  return (
    <div className="parameter-layer-summary-list" data-testid="parameter-layer-summary-list">
      {stratificationRevision.snapshot.layers.map((layer) => {
        const summary = summaries.get(layer.layerId);
        const isTarget = run.targetLayerIds.includes(layer.layerId);
        return (
          <button key={layer.layerId} type="button" className={`parameter-layer-summary-row ${selectedLayerId === layer.layerId ? 'selected' : ''}`} onClick={() => onSelectLayer(layer.layerId)} data-testid={`parameter-layer-summary-${layer.layerId}`}>
            <span><strong>{layer.name}</strong><em>{formatNumber(layer.depthFromM, 2)}-{formatNumber(layer.depthToM, 2)} m / {soilGroupLabel(layer.engineeringSoilGroup)}</em></span>
            <span><small>状态</small><strong>{isTarget ? '目标层' : '非目标层'}</strong></span>
            <span><small>当前可用</small><strong>{isTarget ? summary?.eligibleValueCount ?? 0 : '—'}</strong></span>
            <span><small>均值</small><strong>{isTarget ? formatNullable(summary?.eligibleMean ?? null, 2) : '—'}</strong></span>
            <span><small>范围</small><strong>{isTarget ? `${formatNullable(summary?.eligibleMinimum ?? null, 2)} - ${formatNullable(summary?.eligibleMaximum ?? null, 2)}` : '—'}</strong></span>
          </button>
        );
      })}
    </div>
  );
}

function ParameterIssuesAndHistory({ run, derivationRun, onLocateIssueRow }: { run: ParameterWorkbenchDisplayRun | null; derivationRun: ParameterInputDerivationRunV2 | null; onLocateIssueRow: (sourceRowId: string) => void }) {
  const resultIssues = run?.issues ?? [];
  const upstreamIssues = derivationRun?.issues ?? [];
  const depthsBySourceRow = new Map(derivationRun?.derivedRows.map((row) => [row.sourceRowId, row.depthM]) ?? []);
  const renderIssues = (issues: typeof resultIssues) => issues.map((issue) => (
    <div className={`problem-item ${issue.severity === 'problem' ? 'critical' : 'notice'}`} key={issue.issueId}>
      <span><strong>{issue.severity === 'problem' ? '存在问题' : '提示'}</strong><small>{issue.sourceRowId && depthsBySourceRow.has(issue.sourceRowId) ? `深度 ${depthsBySourceRow.get(issue.sourceRowId)!.toFixed(2)} m` : '全局'}</small></span>
      <p>{issue.message}</p>
      {issue.sourceRowId ? <button type="button" className="toolbar-button" onClick={() => onLocateIssueRow(issue.sourceRowId!)} data-testid={`parameter-issue-locate-${issue.sourceRowId}`}><FileInput size={13} />定位来源行</button> : null}
    </div>
  ));
  return (
    <div className="parameter-issues-history">
      <div className="section-header"><div><h2>问题详情</h2><span>问题保留来源行；终态运行不会被重跑覆盖。</span></div></div>
      <div className="parameter-run-strip" data-testid="parameter-run-summary">
        <History size={16} />
        <span>前置推导 <strong>{derivationRun ? runStatusLabel(derivationRun.status) : '无'}</strong></span>
        <span>结果运行 <strong>{run ? runStatusLabel(run.status) : '无'}</strong></span>
      </div>
      <div className="problem-list compact">
        <section className="parameter-result-issues" data-testid="parameter-current-result-issues">
          <h3>当前结果问题 <span>{resultIssues.length}</span></h3>
          {resultIssues.length ? renderIssues(resultIssues) : <p className="short-note">当前结果运行没有记录问题。</p>}
        </section>
        {upstreamIssues.length ? (
          <details className="parameter-upstream-issues" data-testid="parameter-upstream-issues">
            <summary>前置推导提示 <span>{upstreamIssues.length}</span></summary>
            <div>{renderIssues(upstreamIssues)}</div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function RunValueState({ value, derivation, target }: { value?: ParameterWorkbenchDisplayValue; derivation: ParameterDerivedInputRowV2; target: boolean }) {
  if (derivation.status !== 'valid') return <span className="inline-state warn">推导无效</span>;
  if (!target) return <span className="inline-state">非目标层</span>;
  if (!value) return <span className="inline-state warn">目标层无结果</span>;
  return <span className={`inline-state ${value.tone === 'ok' ? 'ok' : value.tone === 'warn' ? 'warn' : ''}`}>{value.statusLabel}</span>;
}

function EmptyWorkbench({ title, detail }: { title: string; detail: string }) {
  return <div className="parameter-empty-state"><BarChart3 size={22} /><strong>{title}</strong><span>{detail}</span></div>;
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function parameterWorkbenchStatus(props: ParameterWorkbenchDocumentProps) {
  if (props.sourceProblem) return { label: '存在问题', tone: 'status-warning', title: '上游来源需要处理', detail: props.sourceProblem };
  if (!props.scheme) return { label: '待建立', tone: 'status-muted', title: '先建立参数方案', detail: '方法槽将按已提交地层的工程土组生成。' };
  if (props.scheme.status === 'stale') return { label: '已失效', tone: 'status-warning', title: '当前参数方案仅供历史查看', detail: '上游精确分层已变化，请基于最新分层新建参数方案。' };
  if (props.scheme.status === 'history') return { label: '历史', tone: 'status-muted', title: '正在查看历史参数方案', detail: '历史运行使用它自身的方案修订和前置推导，不作为新运行输入。' };
  if (props.historicalRevision) return { label: '历史修订', tone: 'status-muted', title: `正在查看参数方案 v${props.schemeRevision?.version ?? '?'}`, detail: '该运行使用自身冻结的方案、分层与证据；重新运行将基于当前修订创建新记录。' };
  if (props.scheme.version === 0 || !props.schemeRevision) return { label: '编辑中', tone: 'status-warning', title: '参数方案尚未提交', detail: '确认方法目标层和输入设置后提交修订。' };
  if (!props.derivationRun) return { label: '待推导', tone: 'status-warning', title: '参数方案已提交', detail: '下一步运行 qt / qnet / Qtn / Ic 前置推导。' };
  if (!props.run) return { label: '待运行', tone: 'status-warning', title: '前置推导已完成', detail: '确认层级方法证据后运行所选解译方法。' };
  if (props.run.status !== 'completed') {
    const terminal = ['failed', 'cancelled', 'invalidated'].includes(props.run.status);
    return {
      label: runStatusLabel(props.run.status),
      tone: terminal ? 'status-warning' : 'status-muted',
      title: terminal ? `方法运行${runStatusLabel(props.run.status)}` : '方法运行处理中',
      detail: terminal ? '可查看该次运行记录；如需结果，请从当前有效方案重新运行。' : `当前运行状态：${runStatusLabel(props.run.status)}。`,
    };
  }
  const problems = props.run.summary?.problemValueCount ?? 0;
  const eligible = props.run.summary?.eligibleValueCount ?? 0;
  const trial = props.run.summary?.trialOnlyValueCount ?? 0;
  if (!eligible) {
    return {
      label: trial ? '仅有试算值' : '无适用结果',
      tone: 'status-warning',
      title: `${props.slot?.symbol ?? '参数'} 运行已完成`,
      detail: trial ? `${trial} 个值仅可作为试算查看，当前没有方法可用值。` : '当前范围没有可用于本方法的结果。',
    };
  }
  return {
    label: problems ? '存在问题' : '已完成',
    tone: problems ? 'status-warning' : 'status-success',
    title: `${props.slot?.symbol ?? '参数'} 曲线已生成`,
    detail: `${eligible} 个当前方法可用值，${trial} 个试算值，${problems} 个问题。`,
  };
}

function point(row: ParameterDerivedInputRowV2, value: number | null): CurvePoint {
  return { sourceRowId: row.sourceRowId, depthM: row.depthM, value: isFiniteNumber(value) ? value : null };
}

export function curveSegments(values: CurvePoint[]) {
  const segments: CurvePoint[][] = [];
  let current: CurvePoint[] = [];
  const positiveSteps = values.slice(1)
    .map((entry, index) => entry.depthM - values[index].depthM)
    .filter((step) => Number.isFinite(step) && step > 0)
    .sort((left, right) => left - right);
  const medianStep = positiveSteps.length ? positiveSteps[Math.floor(positiveSteps.length / 2)] : 0;
  const gapThreshold = Math.max(0.1, medianStep * 5);
  values.forEach((entry) => {
    const previous = current.at(-1);
    if (!isFiniteNumber(entry.value) || (previous && entry.depthM - previous.depthM > gapThreshold)) {
      if (current.length) segments.push(current);
      current = [];
      if (!isFiniteNumber(entry.value)) return;
    }
    current.push(entry);
  });
  if (current.length) segments.push(current);
  return segments;
}

export function jtsParameterCurvePoints(
  run: Pick<JtsParameterPackageRunV5, 'classificationRowsSnapshot' | 'values'>,
  methodId: JtsParameterMethodIdV5,
): CurvePoint[] {
  const valuesByRow = new Map(run.values.filter((value) => value.methodId === methodId).map((value) => [value.sourceRowId, value]));
  return [...run.classificationRowsSnapshot]
    .sort((left, right) => left.depthM - right.depthM)
    .map((row) => {
      const value = valuesByRow.get(row.sourceRowId);
      return { sourceRowId: row.sourceRowId, depthM: row.depthM, value: value?.status === 'value' && isFiniteNumber(value.value) ? value.value : null };
    });
}

function downsampleCurveExtrema(values: CurvePoint[], maximumPoints: number) {
  if (values.length <= maximumPoints || maximumPoints < 4) return values;
  const interior = values.slice(1, -1);
  const bucketCount = Math.max(1, Math.floor((maximumPoints - 2) / 2));
  const bucketSize = interior.length / bucketCount;
  const sampled = [values[0]];
  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const start = Math.floor(bucketIndex * bucketSize);
    const end = Math.min(interior.length, Math.ceil((bucketIndex + 1) * bucketSize));
    const bucket = interior.slice(start, end);
    if (!bucket.length) continue;
    let minimumIndex = 0;
    let maximumIndex = 0;
    for (let index = 1; index < bucket.length; index += 1) {
      if (bucket[index].value! < bucket[minimumIndex].value!) minimumIndex = index;
      if (bucket[index].value! > bucket[maximumIndex].value!) maximumIndex = index;
    }
    if (minimumIndex === maximumIndex) sampled.push(bucket[minimumIndex]);
    else if (minimumIndex < maximumIndex) sampled.push(bucket[minimumIndex], bucket[maximumIndex]);
    else sampled.push(bucket[maximumIndex], bucket[minimumIndex]);
  }
  sampled.push(values[values.length - 1]);
  return sampled;
}

function interactiveCurvePoints(values: CurvePoint[], selectedSourceRowId: string | null, maximumPoints: number) {
  const finiteValues = values.filter((entry) => isFiniteNumber(entry.value));
  if (finiteValues.length <= maximumPoints) return finiteValues;
  const step = (finiteValues.length - 1) / (maximumPoints - 1);
  const sampled = Array.from({ length: maximumPoints }, (_, index) => finiteValues[Math.round(index * step)]);
  const selected = selectedSourceRowId ? finiteValues.find((entry) => entry.sourceRowId === selectedSourceRowId) : null;
  if (selected && !sampled.some((entry) => entry.sourceRowId === selected.sourceRowId)) sampled.push(selected);
  return sampled;
}

function layerAtDepth(layers: StratificationSchemeRevisionV2['snapshot']['layers'], depthM: number) {
  return layers.find((layer, index) => depthM >= layer.depthFromM && (depthM < layer.depthToM || (index === layers.length - 1 && depthM <= layer.depthToM)));
}

function methodLabel(slot: ParameterSlotV2) {
  return slot.parameterKey === 'PhiDeg' ? 'Qtn 砂土法' : 'qnet / Nkt';
}

function soilGroupLabel(group: string) {
  return ({ sand: '砂土', clay: '黏土', silt: '粉土', organic: '有机土', unclassified: '未分类' } as Record<string, string>)[group] ?? group;
}

function methodResultStatusLabel(status: ParameterValueV2['status']) {
  return ({ Valid: '有效', ValidWithNotice: '有效有提示', ApplicabilityUnconfirmed: '适用性未确认', NotApplicable: '不适用', InvalidInput: '输入无效', InvalidMethodParameter: '方法参数无效' } as Record<string, string>)[status] ?? status;
}

function runStatusLabel(status: ParameterRunV2['status']) {
  return ({ queued: '等待', running: '计算中', 'cancel-requested': '取消中', completed: '已完成', failed: '失败', cancelled: '已取消', invalidated: '已失效' } as Record<string, string>)[status] ?? status;
}

function formatNullable(value: number | null | undefined, digits: number) {
  return isFiniteNumber(value) ? value.toFixed(digits) : '—';
}

function soilGroupClass(group: string | undefined) {
  return group === 'sand' ? 'soil-sand' : group === 'mixed' ? 'soil-mixed' : group === 'clay' ? 'soil-clay' : 'soil-unclassified';
}

function parameterSoilGroupClass(group: string | undefined) {
  return `parameter-${soilGroupClass(group)}`;
}

function formatNumber(value: number, digits: number) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function formatCompactTickSet(values: number[]) {
  if (!values.length) return [];
  const scaled = values.map((value) => Math.abs(value) >= 1000 ? value / 1000 : value);
  const suffix = values.every((value) => Math.abs(value) >= 1000) ? 'k' : '';
  const span = Math.max(...scaled) - Math.min(...scaled);
  const initialDigits = span < 0.1 ? 3 : span < 1 ? 2 : span < 10 ? 1 : 0;
  for (let digits = initialDigits; digits <= 5; digits += 1) {
    const labels = scaled.map((value) => `${value.toFixed(digits)}${suffix}`);
    if (new Set(labels).size === labels.length) return labels;
  }
  return scaled.map((value) => `${value.toPrecision(6)}${suffix}`);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
