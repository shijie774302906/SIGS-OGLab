import { Check, ChevronLeft, ChevronRight, Circle, Clock3, Minus, Settings2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { JtsClassificationRunV4, StratificationSchemeRevisionV2 } from '../workspace/workspaceV2';
import { JTS_NKT_OPTIONS } from '../jts/jtsT242Domain';
import { DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, finalStratificationApplicabilityClasses, jtsTableNktSetting } from './jtsParameterPackageDomain';
import type {
  GuidedParameterDecisionV1,
  GuidedParameterDraftV1,
  JtsParameterMethodIdV5,
  JtsParameterPackageRunV5,
  JtsParameterPackageSettingsV5,
} from './parameterTypes';
import { guidedParameterIdForMethod } from './parameterIssueDiagnosis';

type GuideParameter = {
  parameterId: string;
  label: string;
  symbol: string;
  level: 'required' | 'recommended' | 'optional';
  methodIds: JtsParameterMethodIdV5[];
  applies: (classes: Set<string>) => boolean;
  method: string;
  reason: string;
};

const COHESIVE = ['flow_mud', 'mud', 'muddy_soil', 'clay', 'silty_clay'];
const SAND = ['silty_fine_sand', 'medium_coarse_sand', 'gravelly_sand'];

const PARAMETERS: GuideParameter[] = [
  { parameterId: 'gamma-sat', label: '饱和重度', symbol: 'γsat', level: 'required', methodIds: ['jts_gamma_sat'], applies: (classes) => classes.size > 0, method: 'JTS 饱和重度相关式', reason: '当前分类中存在可用土类，属于参数包的基础参数。' },
  { parameterId: 'su', label: '不排水抗剪强度', symbol: 'Su', level: 'required', methodIds: ['jts_su_nkt'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: 'qnet / Nkt', reason: '当前存在黏性土层，系统按土类批量应用。' },
  { parameterId: 'phi', label: '有效内摩擦角', symbol: 'φ′', level: 'required', methodIds: ['jts_phi_fine', 'jts_phi_coarse'], applies: (classes) => SAND.some((item) => classes.has(item)), method: 'JTS 砂土 φ′ 相关式', reason: '当前存在砂土层，细砂和中粗砂由系统分别使用适用方法。' },
  { parameterId: 'silt-strength', label: '粉土强度参数', symbol: 'φ′ / Su', level: 'required', methodIds: ['manual_silt_phi', 'manual_silt_su'], applies: (classes) => classes.has('silt'), method: '工程师确认排水条件后录入项目值', reason: 'JTS 没有将粉土纳入砂土或黏性土相关式，必须明确选择排水条件。' },
  { parameterId: 'relative-density', label: '相对密实度', symbol: 'Dr', level: 'recommended', methodIds: ['jts_relative_density'], applies: (classes) => SAND.some((item) => classes.has(item)), method: 'JTS 相对密实度相关式', reason: '适用于当前砂土层，系统建议纳入。' },
  { parameterId: 'ocr', label: '超固结比', symbol: 'OCR', level: 'recommended', methodIds: ['jts_ocr'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: 'JTS OCR 相关式，kOCR=0.16', reason: '适用于当前黏性土层，需要确认推荐系数来源。' },
  { parameterId: 'sensitivity', label: '灵敏度', symbol: 'St', level: 'recommended', methodIds: ['jts_sensitivity'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: 'JTS 灵敏度相关式，Ns=6.3', reason: '适用于当前黏性土层，需要确认推荐系数来源。' },
  { parameterId: 'compression-modulus', label: '压缩模量', symbol: 'Es', level: 'recommended', methodIds: ['jts_compression_modulus'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: 'JTS 压缩模量相关式', reason: '适用于当前黏性土层。' },
  { parameterId: 'compression-index', label: '压缩指数', symbol: 'Cc', level: 'recommended', methodIds: ['jts_compression_index'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: 'JTS 压缩指数相关式', reason: '适用于当前黏性土层。' },
  { parameterId: 'shear-wave', label: '剪切波速', symbol: 'Vs', level: 'recommended', methodIds: ['jts_shear_wave_velocity'], applies: (classes) => classes.size > 0, method: 'JTS 剪切波速相关式', reason: '系统按黏性与非黏性土类分别应用。' },
  { parameterId: 'spt', label: '标准贯入击数', symbol: 'N', level: 'optional', methodIds: ['jts_spt_n'], applies: (classes) => classes.size > 0, method: 'JTS SPT N 相关式', reason: '属于可选参数，默认不计算。' },
  { parameterId: 'dissipation', label: '固结 / 渗透参数', symbol: 'Ch / kh', level: 'optional', methodIds: ['jts_dissipation_ch_kh'], applies: (classes) => COHESIVE.some((item) => classes.has(item)), method: '孔压消散试验', reason: '需要单独的孔压消散序列和 t50 确认。' },
];

type Props = {
  open: boolean;
  pointId: string;
  classificationRun: JtsClassificationRunV4;
  stratificationRevision: StratificationSchemeRevisionV2;
  completedRun: JtsParameterPackageRunV5 | null;
  persistedDraft: GuidedParameterDraftV1 | null;
  onSave: (draft: GuidedParameterDraftV1) => { ok: true } | { ok: false; problem: string };
  onClear: () => void;
  onRun: (settings: JtsParameterPackageSettingsV5) => { ok: true } | { ok: false; problem: string };
  onClose: () => void;
  onOpenAdvanced: () => void;
  onOpenRoute: (route: 'check' | 'stratification') => void;
  focusMethodId?: JtsParameterMethodIdV5 | null;
};

function createDraft(props: Pick<Props, 'pointId' | 'classificationRun' | 'stratificationRevision'>, available: GuideParameter[], completedRun: JtsParameterPackageRunV5 | null): GuidedParameterDraftV1 {
  const now = new Date().toISOString();
  if (completedRun
    && completedRun.status === 'completed'
    && completedRun.pointId === props.pointId
    && completedRun.classificationRunId === props.classificationRun.runId
    && completedRun.classificationResultHash === props.classificationRun.resultHash
    && completedRun.stratificationRevisionId === props.stratificationRevision.revisionId) {
    const skipped = new Map((completedRun.settingsSnapshot.skippedMethodDecisions ?? []).map((item) => [item.methodId, item]));
    const selectedMethodIds = new Set(completedRun.settingsSnapshot.selectedMethodIds
      ?? completedRun.checklist.filter((item) => item.status !== 'not-selected').map((item) => item.methodId));
    const selectedParameterIds = available.filter((item) => item.methodIds.some((methodId) => selectedMethodIds.has(methodId) || skipped.has(methodId))).map((item) => item.parameterId);
    const decisions = selectedParameterIds.map((parameterId): GuidedParameterDecisionV1 => {
      const parameter = available.find((item) => item.parameterId === parameterId)!;
      const skippedDecision = parameter.methodIds.map((methodId) => skipped.get(methodId)).find((item) => item !== undefined);
      return skippedDecision
        ? { parameterId, choice: 'skipped', skipReason: skippedDecision.reason, ...(skippedDecision.decidedAt ? { decidedAt: skippedDecision.decidedAt } : {}) }
        : { parameterId, choice: 'recommended' };
    });
    return {
      draftId: `parameter-guide-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      pointId: props.pointId,
      classificationRunId: props.classificationRun.runId,
      classificationResultHash: props.classificationRun.resultHash,
      stratificationRevisionId: props.stratificationRevision.revisionId,
      stage: 'review',
      selectedParameterIds,
      currentParameterId: selectedParameterIds[0] ?? null,
      completedParameterIds: [...selectedParameterIds],
      decisions,
      settings: structuredClone(completedRun.settingsSnapshot),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
  }
  const selectedParameterIds = available.filter((item) => item.level !== 'optional').map((item) => item.parameterId);
  return {
    draftId: `parameter-guide-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    pointId: props.pointId,
    classificationRunId: props.classificationRun.runId,
    classificationResultHash: props.classificationRun.resultHash,
    stratificationRevisionId: props.stratificationRevision.revisionId,
    stage: 'select',
    selectedParameterIds,
    currentParameterId: selectedParameterIds[0] ?? null,
    completedParameterIds: [],
    decisions: [],
    settings: { ...DEFAULT_JTS_PARAMETER_PACKAGE_SETTINGS, selectedOptionalMethodIds: [], selectedMethodIds: [] },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function matchesSource(draft: GuidedParameterDraftV1 | null, props: Pick<Props, 'pointId' | 'classificationRun' | 'stratificationRevision'>) {
  return Boolean(draft
    && draft.status === 'active'
    && draft.pointId === props.pointId
    && draft.classificationRunId === props.classificationRun.runId
    && draft.classificationResultHash === props.classificationRun.resultHash
    && draft.stratificationRevisionId === props.stratificationRevision.revisionId);
}

export function ParameterGuidedWizard(props: Props) {
  const classes = useMemo(
    () => finalStratificationApplicabilityClasses(props.stratificationRevision),
    [props.stratificationRevision],
  );
  const available = useMemo(() => PARAMETERS.filter((item) => item.applies(classes)), [classes]);
  const [draft, setDraft] = useState<GuidedParameterDraftV1>(() => matchesSource(props.persistedDraft, props) ? structuredClone(props.persistedDraft as GuidedParameterDraftV1) : createDraft(props, available, props.completedRun));
  const [problem, setProblem] = useState('');
  const [rollbackTarget, setRollbackTarget] = useState<{ stage: 'select' | 'configure'; parameterId: string | null; affectedParameterIds: string[]; targetLabel: string } | null>(null);
  const modifyingExisting = Boolean(props.completedRun);

  useEffect(() => {
    setDraft(matchesSource(props.persistedDraft, props) ? structuredClone(props.persistedDraft as GuidedParameterDraftV1) : createDraft(props, available, props.completedRun));
    setProblem('');
    setRollbackTarget(null);
  }, [props.classificationRun.runId, props.completedRun?.runId, props.persistedDraft?.draftId, props.stratificationRevision.revisionId]);

  useEffect(() => {
    if (!props.open || !props.focusMethodId) return;
    const parameterId = guidedParameterIdForMethod(props.focusMethodId);
    if (!available.some((item) => item.parameterId === parameterId)) return;
    setDraft((current) => ({
      ...current,
      stage: 'configure',
      currentParameterId: parameterId,
      selectedParameterIds: current.selectedParameterIds.includes(parameterId) ? current.selectedParameterIds : [...current.selectedParameterIds, parameterId],
      updatedAt: new Date().toISOString(),
    }));
    setProblem('');
  }, [available, props.focusMethodId, props.open]);

  if (!props.open) return null;

  const selected = available.filter((item) => draft.selectedParameterIds.includes(item.parameterId));
  const currentIndex = Math.max(0, selected.findIndex((item) => item.parameterId === draft.currentParameterId));
  const current = selected[currentIndex] ?? selected[0] ?? null;
  const decision = current ? draft.decisions.find((item) => item.parameterId === current.parameterId) : undefined;
  const deferred = draft.decisions.filter((item) => item.choice === 'deferred' && draft.selectedParameterIds.includes(item.parameterId));
  const unfinished = selected.filter((item) => !draft.completedParameterIds.includes(item.parameterId));
  const firstUnfinishedIndex = selected.findIndex((item) => !draft.completedParameterIds.includes(item.parameterId));
  const update = (updater: (current: GuidedParameterDraftV1) => GuidedParameterDraftV1, save = false) => {
    const next = updater(draft);
    next.updatedAt = new Date().toISOString();
    setDraft(next);
    if (save) {
      const result = props.onSave(next);
      if (!result.ok) setProblem(result.problem);
    }
  };
  const requestRollback = (targetStage: 'select' | 'configure', targetParameterId: string | null, affectedParameterIds: string[], targetLabel: string) => {
    setRollbackTarget({ stage: targetStage, parameterId: targetParameterId, affectedParameterIds: [...new Set(affectedParameterIds)], targetLabel });
    setProblem('');
  };
  const requestPreviousStep = () => {
    if (draft.stage === 'review') {
      const previous = selected.at(-1);
      if (previous) requestRollback('configure', previous.parameterId, [previous.parameterId], `${previous.symbol} · ${previous.label}`);
      return;
    }
    if (draft.stage !== 'configure') return;
    if (currentIndex === 0) {
      requestRollback('select', null, selected.map((item) => item.parameterId), '选择参数');
      return;
    }
    const previous = selected[currentIndex - 1];
    requestRollback('configure', previous.parameterId, selected.slice(currentIndex).map((item) => item.parameterId), `${previous.symbol} · ${previous.label}`);
  };
  const requestParameterStep = (parameterId: string) => {
    const targetIndex = selected.findIndex((item) => item.parameterId === parameterId);
    if (targetIndex < 0) return;
    if (draft.stage === 'configure' && targetIndex === currentIndex) return;
    const navigatingBackward = draft.stage === 'review' || (draft.stage === 'configure' && targetIndex < currentIndex);
    if (!navigatingBackward) {
      update((currentDraft) => ({ ...currentDraft, stage: 'configure', currentParameterId: parameterId }));
      return;
    }
    const target = selected[targetIndex];
    requestRollback('configure', parameterId, selected.slice(targetIndex).map((item) => item.parameterId), `${target.symbol} · ${target.label}`);
  };
  const confirmRollback = () => {
    if (!rollbackTarget) return;
    const affected = new Set(rollbackTarget.affectedParameterIds);
    const next: GuidedParameterDraftV1 = {
      ...draft,
      stage: rollbackTarget.stage,
      currentParameterId: rollbackTarget.parameterId,
      decisions: draft.decisions.filter((item) => !affected.has(item.parameterId)),
      completedParameterIds: draft.completedParameterIds.filter((parameterId) => !affected.has(parameterId)),
      updatedAt: new Date().toISOString(),
    };
    const result = props.onSave(next);
    if (!result.ok) {
      setProblem(result.problem);
      setRollbackTarget(null);
      return;
    }
    setDraft(next);
    setRollbackTarget(null);
    setProblem('');
  };
  const setDecision = (choice: GuidedParameterDecisionV1['choice'], reason?: GuidedParameterDecisionV1['skipReason']) => update((currentDraft) => {
    const previous = currentDraft.decisions.find((item) => item.parameterId === current?.parameterId);
    return {
      ...currentDraft,
      decisions: [...currentDraft.decisions.filter((item) => item.parameterId !== current?.parameterId), ...(current ? [{ parameterId: current.parameterId, choice, ...(reason ? { skipReason: reason } : {}), ...(choice === 'skipped' ? { decidedAt: previous?.decidedAt ?? new Date().toISOString() } : {}) }] : [])],
    };
  });
  const configureRecommendedSettings = (parameter: GuideParameter, settings: JtsParameterPackageSettingsV5) => {
    if (parameter.parameterId === 'ocr') return { ...settings, ocrCoefficientConfirmed: true };
    if (parameter.parameterId === 'sensitivity') return { ...settings, sensitivityCoefficientConfirmed: true };
    return settings;
  };
  const goFromSelection = () => {
    if (!draft.selectedParameterIds.length) return setProblem('请至少选择一个可以计算的参数。');
    const first = available.find((item) => draft.selectedParameterIds.includes(item.parameterId));
    update((currentDraft) => ({ ...currentDraft, stage: 'configure', currentParameterId: first?.parameterId ?? null }), true);
    setProblem('');
  };
  const completeCurrent = () => {
    if (!current) return;
    const activeDecision = decision?.choice ?? 'recommended';
    if (current.parameterId === 'su' && activeDecision === 'recommended' && !draft.settings.nktSourceType) {
      setProblem('请选择 Su 对应的目标试验；JTS 表统计值仅在缺乏地区资料时参考。');
      return;
    }
    if ((current.parameterId === 'phi' || current.parameterId === 'relative-density') && activeDecision === 'recommended' && draft.settings.materialScope === 'unknown') {
      setProblem('请确认砂土材料是否在公式来源范围内；CPT/CPTU 数据本身不能代替这项判断。');
      return;
    }
    if ((current.parameterId === 'phi' || current.parameterId === 'relative-density') && activeDecision === 'recommended' && draft.settings.materialScope !== 'within_source') {
      setProblem('当前材料不适用该相关式，请展开“其他处理方式”并明确选择本次不计算。');
      return;
    }
    if (current.parameterId === 'silt-strength' && activeDecision === 'recommended') {
      const sourceParts = draft.settings.siltManualSource.split(' · ');
      const valueOutOfRange = draft.settings.siltManualValue != null && (draft.settings.siltManualValue <= 0 || (draft.settings.siltDrainageDecision === 'drained' ? draft.settings.siltManualValue > 60 : draft.settings.siltManualValue > 500));
      if (valueOutOfRange) {
        setProblem(draft.settings.siltDrainageDecision === 'drained' ? '项目 φ′ 必须大于 0° 且不超过 60°。' : '项目 Su 必须大于 0kPa 且不超过 500kPa。');
        return;
      }
      if (draft.settings.siltDrainageDecision === 'pending' || !draft.settings.siltManualValue || valueOutOfRange || !['项目试验', '项目经验', '审查记录'].includes(sourceParts[0]) || !sourceParts[1]?.trim()) {
        setProblem('请选择粉土强度参数路径，并填写项目值及报告、试验或审查编号。');
        return;
      }
    }
    const nextIndex = currentIndex + 1;
    update((currentDraft) => ({
      ...currentDraft,
      settings: configureRecommendedSettings(current, currentDraft.settings),
      decisions: currentDraft.decisions.some((item) => item.parameterId === current.parameterId)
        ? currentDraft.decisions
        : [...currentDraft.decisions, { parameterId: current.parameterId, choice: 'recommended' }],
      completedParameterIds: [...new Set([...currentDraft.completedParameterIds, current.parameterId])],
      currentParameterId: selected[nextIndex]?.parameterId ?? current.parameterId,
      stage: nextIndex < selected.length ? 'configure' : 'review',
    }), true);
    setProblem('');
  };
  const finalizedSettings = (): JtsParameterPackageSettingsV5 => {
    const skippedIds = new Set(draft.decisions.filter((item) => item.choice === 'skipped').map((item) => item.parameterId));
    const selectedActual = selected.filter((item) => !skippedIds.has(item.parameterId)).flatMap((item) => {
      if (item.parameterId === 'silt-strength') return [draft.settings.siltDrainageDecision === 'drained' ? 'manual_silt_phi' : 'manual_silt_su'] as JtsParameterMethodIdV5[];
      return item.methodIds;
    });
    const skippedMethodDecisions = selected.filter((item) => skippedIds.has(item.parameterId)).flatMap((item) => {
      const skippedDecision = draft.decisions.find((decisionItem) => decisionItem.parameterId === item.parameterId);
      return item.methodIds.map((methodId) => ({ methodId, reason: skippedDecision?.skipReason ?? 'not-needed-this-stage' as const, decidedAt: skippedDecision?.decidedAt ?? draft.updatedAt }));
    });
    const optional = selectedActual.filter((methodId) => ['jts_spt_n', 'jts_dissipation_ch_kh'].includes(methodId));
    return { ...draft.settings, selectedMethodIds: selectedActual, selectedOptionalMethodIds: optional, skippedMethodDecisions };
  };
  const run = () => {
    if (unfinished.length) return setProblem(`还有 ${unfinished.length} 个参数未确认，请逐项完成后再运行。`);
    if (deferred.length) return setProblem(`还有 ${deferred.length} 个参数选择了“稍后处理”，请先处理或明确本次不计算。`);
    const settings = finalizedSettings();
    const result = props.onRun(settings);
    if (!result.ok) return setProblem(result.problem);
    props.onClear();
    props.onClose();
  };
  const close = () => {
    props.onSave(draft);
    props.onClose();
  };

  return <div className="parameter-guide-backdrop" role="presentation" data-testid="parameter-guide-backdrop">
    <section className="parameter-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="parameter-guide-title" data-testid="parameter-guide-dialog">
      <header className="parameter-guide-header">
        <div><span>{modifyingExisting ? '修改已有参数配置' : '本次参数试算'}</span><h2 id="parameter-guide-title">{modifyingExisting ? '修改参数配置' : '参数解译向导'}</h2><p>{modifyingExisting && draft.stage === 'review' ? '已回填当前运行；确认后将生成新的参数运行。' : draft.stage === 'select' ? '先选择本次范围，再逐项确认。' : draft.stage === 'configure' ? `${currentIndex + 1} / ${selected.length} · 当前确认 ${current?.symbol ?? ''}` : `${selected.length - draft.decisions.filter((item) => item.choice === 'skipped').length} 项将运行`}</p></div>
        <button type="button" className="icon-button" aria-label="保存并关闭参数向导" data-testid="parameter-guide-close" onClick={close}><X /></button>
      </header>
      <div className="parameter-guide-progress"><i style={{ width: `${draft.stage === 'select' ? 8 : draft.stage === 'review' ? 100 : Math.max(12, ((currentIndex + 1) / Math.max(1, selected.length)) * 88)}%` }} /></div>
      <div className="parameter-guide-layout">
        <nav className="parameter-guide-list" aria-label="参数步骤">
          <button type="button" className={draft.stage === 'select' ? 'current' : 'complete'} onClick={() => draft.stage === 'select' ? undefined : requestRollback('select', null, selected.map((item) => item.parameterId), '选择参数')}><span>{draft.stage === 'select' ? '1' : <Check />}</span><strong>选择参数</strong><em>{draft.selectedParameterIds.length} 项</em></button>
          {selected.map((item, index) => {
            const itemDecision = draft.decisions.find((candidate) => candidate.parameterId === item.parameterId);
            const complete = draft.completedParameterIds.includes(item.parameterId);
            const stateClass = itemDecision?.choice === 'skipped' ? 'skipped' : itemDecision?.choice === 'deferred' ? 'deferred' : complete ? 'complete' : '';
            const futureStep = !complete && firstUnfinishedIndex >= 0 && index > firstUnfinishedIndex;
            return <button type="button" key={item.parameterId} className={`${draft.stage === 'configure' && current?.parameterId === item.parameterId ? 'current' : ''} ${stateClass}`} disabled={futureStep} onClick={() => requestParameterStep(item.parameterId)}><span>{itemDecision?.choice === 'skipped' ? <Minus /> : itemDecision?.choice === 'deferred' ? <Clock3 /> : complete ? <Check /> : index + 2}</span><strong>{item.symbol} · {item.label}</strong><em>{itemDecision?.choice === 'skipped' ? '本次不计算' : itemDecision?.choice === 'deferred' ? '稍后处理' : complete ? '已确认' : item.level === 'required' ? '默认纳入' : item.level === 'recommended' ? '建议纳入' : '按需纳入'}</em></button>;
          })}
          <button type="button" data-testid="parameter-guide-final-step" className={draft.stage === 'review' ? 'current' : ''} onClick={() => update((item) => ({ ...item, stage: 'review' }))} disabled={draft.stage === 'select' || unfinished.length > 0}><span>{selected.length + 2}</span><strong>最终确认</strong><em>{unfinished.length ? `${unfinished.length} 项未确认` : deferred.length ? `${deferred.length} 项需处理` : `${selected.length - draft.decisions.filter((item) => item.choice === 'skipped').length} 项运行`}</em></button>
        </nav>
        <main className="parameter-guide-main">
          {draft.stage === 'select' ? <ParameterSelection available={available} draft={draft} onToggle={(parameterId) => update((currentDraft) => {
            const removing = currentDraft.selectedParameterIds.includes(parameterId);
            return {
              ...currentDraft,
              selectedParameterIds: removing ? currentDraft.selectedParameterIds.filter((item) => item !== parameterId) : [...currentDraft.selectedParameterIds, parameterId],
              decisions: removing ? currentDraft.decisions.filter((item) => item.parameterId !== parameterId) : currentDraft.decisions,
              completedParameterIds: removing ? currentDraft.completedParameterIds.filter((item) => item !== parameterId) : currentDraft.completedParameterIds,
            };
          })} /> : draft.stage === 'configure' && current ? <ParameterConfiguration parameter={current} decision={decision} draft={draft} skipReason={decision?.skipReason ?? 'not-needed-this-stage'} onDecision={setDecision} onSettings={(settings) => update((currentDraft) => ({ ...currentDraft, settings }))} onAdvanced={() => { update((item) => ({ ...item, decisions: [...item.decisions.filter((entry) => entry.parameterId !== current.parameterId), { ...(decision ?? { parameterId: current.parameterId, choice: 'recommended' as const }), parameterId: current.parameterId, manuallyAdjusted: true }] }), true); props.onOpenAdvanced(); }} onOpenRoute={props.onOpenRoute} /> : <ParameterReview available={available} selected={selected} draft={draft} onSelect={(parameterId, isSelected) => update((currentDraft) => ({ ...currentDraft, stage: isSelected ? 'configure' : 'select', currentParameterId: isSelected ? parameterId : currentDraft.currentParameterId }))} />}
          {problem ? <p className="parameter-guide-problem" data-testid="parameter-guide-problem">{problem}</p> : null}
        </main>
      </div>
      <footer className="parameter-guide-footer">
        <button type="button" className="toolbar-button" data-testid="parameter-guide-back" onClick={draft.stage === 'select' ? close : requestPreviousStep}><ChevronLeft />{draft.stage === 'select' ? '保存并关闭' : '返回上一步'}</button>
        <div><span>{draft.stage === 'review' && (unfinished.length || deferred.length) ? `还有 ${unfinished.length + deferred.length} 项需要处理` : '完成每一项后自动保存'}</span><button type="button" className="toolbar-button primary" data-testid="parameter-guide-next" disabled={draft.stage === 'review' && (unfinished.length > 0 || deferred.length > 0)} onClick={draft.stage === 'select' ? goFromSelection : draft.stage === 'review' ? run : completeCurrent}>{draft.stage === 'select' ? `开始逐项确认（${selected.length} 项）` : draft.stage === 'review' ? unfinished.length ? `先确认剩余 ${unfinished.length} 项` : deferred.length ? `先处理暂缓 ${deferred.length} 项` : modifyingExisting ? `保存修改并重新运行 ${selected.length - draft.decisions.filter((item) => item.choice === 'skipped').length} 项` : `确认并运行 ${selected.length - draft.decisions.filter((item) => item.choice === 'skipped').length} 项` : <>确认 {current?.symbol}，继续<ChevronRight /></>}</button></div>
      </footer>
    </section>
    {rollbackTarget ? <div className="modal-backdrop parameter-rollback-backdrop" role="presentation" data-testid="parameter-rollback-confirmation">
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="parameter-rollback-title">
        <div className="confirmation-dialog-heading"><div><span>参数解译 · 返回上一步</span><h2 id="parameter-rollback-title">返回“{rollbackTarget.targetLabel}”？</h2></div><button type="button" className="icon-button" aria-label="取消返回上一步" onClick={() => setRollbackTarget(null)}><X /></button></div>
        <p>将回到“{rollbackTarget.targetLabel}”，并清除从该步骤起已保存的设置（如有）。原始数据和更早步骤不变；重新确认后才会生成新试算。</p>
        <div className="confirmation-dialog-actions"><button type="button" className="toolbar-button" data-testid="parameter-rollback-cancel" onClick={() => setRollbackTarget(null)}>取消</button><button type="button" className="toolbar-button primary" data-testid="parameter-rollback-confirm" onClick={confirmRollback}>返回并清除</button></div>
      </section>
    </div> : null}
  </div>;
}

function ParameterSelection({ available, draft, onToggle }: { available: GuideParameter[]; draft: GuidedParameterDraftV1; onToggle: (parameterId: string) => void }) {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const renderChoice = (item: GuideParameter) => {
    const applicable = available.some((candidate) => candidate.parameterId === item.parameterId);
    const checked = draft.selectedParameterIds.includes(item.parameterId);
    return <label key={item.parameterId} className={`${applicable ? '' : 'unavailable'} ${checked ? 'selected' : ''}`}><input type="checkbox" checked={checked} disabled={!applicable || item.level === 'required'} onChange={() => onToggle(item.parameterId)} data-testid={`parameter-guide-select-${item.parameterId}`} /><span><strong>{item.symbol} · {item.label}</strong><em>{!applicable ? '不适用于当前地层' : item.level === 'required' ? '默认纳入' : item.level === 'recommended' ? '建议纳入' : '按需纳入'}</em><small>{!applicable ? '工程师最终确认的分层土类中没有适用层。' : item.level === 'required' ? `${item.reason} 如不计算，请在下一步选择原因。` : item.reason}</small></span></label>;
  };
  const core = PARAMETERS.filter((item) => item.level !== 'optional');
  const optional = PARAMETERS.filter((item) => item.level === 'optional');
  return <div className="parameter-guide-selection" data-testid="parameter-guide-selection"><div className="parameter-guide-section-heading"><div><span>第 1 步</span><h3>选择本次计算项</h3><p>已按工程师最终确认的分层土类选好常用参数，可按需调整。</p><small>“默认/建议/按需”是本原型参数包的范围设置，不是 JTS 规范强制清单。</small></div><div className="parameter-selection-actions"><strong>{draft.selectedParameterIds.length} 项已选择</strong><button type="button" className="toolbar-button" data-testid="parameter-guide-optional-group" aria-expanded={optionalOpen} onClick={() => setOptionalOpen((current) => !current)}>可选参数（{optional.length}）</button></div></div>{optionalOpen ? <div className="parameter-choice-list parameter-optional-list">{optional.map(renderChoice)}</div> : null}<div className="parameter-choice-list">{core.map(renderChoice)}</div></div>;
}

function ParameterConfiguration({ parameter, decision, draft, skipReason, onDecision, onSettings, onAdvanced, onOpenRoute }: { parameter: GuideParameter; decision?: GuidedParameterDecisionV1; draft: GuidedParameterDraftV1; skipReason: GuidedParameterDecisionV1['skipReason']; onDecision: (choice: GuidedParameterDecisionV1['choice'], reason?: GuidedParameterDecisionV1['skipReason']) => void; onSettings: (settings: JtsParameterPackageSettingsV5) => void; onAdvanced: () => void; onOpenRoute: (route: 'check' | 'stratification') => void }) {
  const choice = decision?.choice ?? 'recommended';
  const fixedSources = ['项目试验', '项目经验', '审查记录'];
  return <div className="parameter-guide-config" data-testid={`parameter-guide-config-${parameter.parameterId}`}>
    <div className="parameter-guide-section-heading"><div><span>{parameter.level === 'required' ? '本次默认纳入' : parameter.level === 'recommended' ? '建议纳入' : '按需纳入'}</span><h3>{parameter.symbol} · {parameter.label}</h3><p>{parameter.reason}</p></div><button type="button" className="toolbar-button" onClick={onAdvanced}><Settings2 />退出向导，打开独立高级设置</button></div>
    <div className="parameter-method-choice"><button type="button" className={choice === 'recommended' ? 'selected' : ''} onClick={() => onDecision('recommended')} data-testid="parameter-guide-use-recommended"><span><Circle /></span><div><strong>采用当前验证方法（当前唯一）</strong><em>{parameter.method}</em><small>系统按适用土类批量配置，只对例外层单独提示。</small></div></button></div>
    {parameter.parameterId === 'su' && choice === 'recommended' ? <label className="parameter-guide-field"><span>Nkt 对应的目标试验</span><select value={draft.settings.nktTargetTestType ?? ''} onChange={(event) => { const selectedNkt = jtsTableNktSetting(event.target.value); onSettings({ ...draft.settings, nktTargetTestType: selectedNkt?.nktTargetTestType ?? null, nktValue: selectedNkt?.nktValue ?? null, nktSourceType: selectedNkt?.nktSourceType ?? null, nktSourceRevisionId: selectedNkt?.nktSourceRevisionId ?? null, nktConfirmedAt: selectedNkt?.nktConfirmedAt ?? null }); }} data-testid="parameter-guide-nkt"><option value="">请选择目标试验</option>{JTS_NKT_OPTIONS.map((option) => <option key={option.testType} value={option.testType}>{option.label} · JTS 表统计平均值 {option.mean}</option>)}</select><small>JTS 7.2.4 要求结合土工试验和地区经验确定；表中统计值仅在缺乏地区资料时参考。</small></label> : null}
    {(parameter.parameterId === 'phi' || parameter.parameterId === 'relative-density') && choice === 'recommended' ? <label className="parameter-guide-field"><span>砂土材料适用范围</span><select value={draft.settings.materialScope} onChange={(event) => onSettings({ ...draft.settings, materialScope: event.target.value as JtsParameterPackageSettingsV5['materialScope'] })} data-testid="parameter-guide-material-scope"><option value="unknown">请选择材料范围</option><option value="within_source">已确认材料在公式来源范围内</option><option value="calcareous_sand">钙质砂 · 不套用相关式</option><option value="carbonaceous_sand">碳质砂 · 不套用相关式</option></select><small>CPT/CPTU 数据本身不能确认材料范围；钙质砂、碳质砂不套用 φ′ 与 Dr 相关式。</small></label> : null}
    {parameter.parameterId === 'silt-strength' && choice === 'recommended' ? <div className="parameter-guide-field-grid"><label className="parameter-guide-field"><span>本次粉土强度采用路径</span><select value={draft.settings.siltDrainageDecision} onChange={(event) => onSettings({ ...draft.settings, siltDrainageDecision: event.target.value as JtsParameterPackageSettingsV5['siltDrainageDecision'] })}><option value="pending">部分排水 / 暂不确定 · 先暂存</option><option value="drained">采用排水参数 φ′（需项目依据）</option><option value="undrained">采用不排水参数 Su（需项目依据）</option></select></label><label className="parameter-guide-field"><span>{draft.settings.siltDrainageDecision === 'drained' ? '项目 φ′ (°)' : '项目 Su (kPa)'}</span><input type="number" min="0.1" max={draft.settings.siltDrainageDecision === 'drained' ? '60' : '500'} step="0.1" value={draft.settings.siltManualValue ?? ''} onChange={(event) => onSettings({ ...draft.settings, siltManualValue: event.target.value ? Number(event.target.value) : null })} /></label><label className="parameter-guide-field"><span>依据类别</span><select value={draft.settings.siltManualSource.split(' · ')[0] ?? ''} onChange={(event) => onSettings({ ...draft.settings, siltManualSource: `${event.target.value} · ${draft.settings.siltManualSource.split(' · ')[1] ?? ''}` })}><option value="">请选择</option>{fixedSources.map((source) => <option value={source} key={source}>{source}</option>)}</select></label><label className="parameter-guide-field parameter-guide-source-ref"><span>报告 / 试验 / 审查编号</span><input value={draft.settings.siltManualSource.split(' · ')[1] ?? ''} onChange={(event) => onSettings({ ...draft.settings, siltManualSource: `${draft.settings.siltManualSource.split(' · ')[0] ?? ''} · ${event.target.value}` })} placeholder="例如：室内试验 R03" /></label></div> : null}
    {(parameter.parameterId === 'ocr' || parameter.parameterId === 'sensitivity') && choice === 'recommended' ? <div className="parameter-recommended-value"><span>推荐值</span><strong>{parameter.parameterId === 'ocr' ? `kOCR = ${draft.settings.ocrCoefficient}` : `Ns = ${draft.settings.sensitivityCoefficient}`}</strong><small>点击“确认并继续”即确认本次使用推荐值及标准来源。</small></div> : null}
    <details className="parameter-guide-exception"><summary>其他处理方式</summary><div><button type="button" data-testid="parameter-guide-defer" className={choice === 'deferred' ? 'selected' : ''} onClick={() => onDecision('deferred')}><strong>暂存，稍后确认</strong><small>保存进度，但暂不能运行全部参数。</small></button><button type="button" data-testid="parameter-guide-skip" className={choice === 'skipped' ? 'selected' : ''} onClick={() => onDecision('skipped', skipReason)}><strong>本次不计算</strong><small>继续下一项，并在结果与成果中保留原因。</small></button><button type="button" data-testid="parameter-guide-return-check" onClick={() => onOpenRoute('check')}><strong>返回检查数据</strong><small>处理后回到当前参数。</small></button></div>{choice === 'skipped' ? <label className="parameter-guide-field"><span>不计算原因</span><select data-testid="parameter-guide-skip-reason" value={skipReason} onChange={(event) => onDecision('skipped', event.target.value as GuidedParameterDecisionV1['skipReason'])}><option value="not-needed-this-stage">本阶段不需要</option><option value="insufficient-data">数据不足</option><option value="provided-by-other-test">由其他试验提供</option></select></label> : null}</details>
  </div>;
}

function ParameterReview({ available, selected, draft, onSelect }: { available: GuideParameter[]; selected: GuideParameter[]; draft: GuidedParameterDraftV1; onSelect: (parameterId: string, isSelected: boolean) => void }) {
  const rows = available.map((item) => {
    const isSelected = selected.some((candidate) => candidate.parameterId === item.parameterId);
    const decision = draft.decisions.find((candidate) => candidate.parameterId === item.parameterId);
    return { item, decision, state: !isSelected || decision?.choice === 'skipped' ? 'skipped' : decision?.choice === 'deferred' || !draft.completedParameterIds.includes(item.parameterId) ? 'needs-action' : 'ready' } as const;
  });
  return <div className="parameter-guide-review" data-testid="parameter-guide-review"><div className="parameter-guide-section-heading"><div><span>最终确认</span><h3>运行哪些参数？</h3><p>可以计算的参数已选中；灰色项可返回修改选择或原因。</p></div><strong>{rows.filter((row) => row.state === 'ready').length} 项可运行</strong></div><div className="parameter-review-list">{rows.map(({ item, decision, state }) => {
    const isSelected = selected.some((candidate) => candidate.parameterId === item.parameterId);
    return <button type="button" key={item.parameterId} data-testid={`parameter-guide-review-${item.parameterId}`} className={state} onClick={() => onSelect(item.parameterId, isSelected)}><span>{state === 'ready' ? <Check /> : <Circle />}</span><strong>{item.symbol} · {item.label}</strong><em>{state === 'ready' ? item.method : state === 'skipped' ? isSelected ? `本次不计算 · ${decision?.skipReason === 'insufficient-data' ? '数据不足' : decision?.skipReason === 'provided-by-other-test' ? '由其他试验提供' : '本阶段不需要'}` : '本次未选择' : '需要处理后才能运行'}</em><small>{state === 'ready' ? '点击查看配置' : isSelected ? '点击查看原因和恢复选项' : '点击返回选择参数'}</small></button>;
  })}</div></div>;
}
