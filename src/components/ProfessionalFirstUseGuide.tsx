import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { RouteId } from '../workflowData';

export type ProfessionalGuideRoute = Extract<RouteId, 'project' | 'import' | 'check' | 'stratification' | 'parameters' | 'output'>;

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const STORAGE_PREFIX = 'sigs-oglab:professional-guide:v1';
const dismissedInMemory = new Set<ProfessionalGuideRoute>();

type GuideStep = {
  targetTestId: string;
  eyebrow: string;
  title: string;
  description: string;
};

const DOCUMENT_TARGETS: Record<ProfessionalGuideRoute, string> = {
  project: 'document-project',
  import: 'document-import',
  check: 'document-check',
  stratification: 'stratification-document',
  parameters: 'document-parameters',
  output: 'document-output',
};

const PAGE_COPY: Record<ProfessionalGuideRoute, { title: string; action: string; next: string }> = {
  project: { title: '先确认当前点位', action: '在中间确认探头、水深和孔压信息。', next: '完成后进入数据导入。' },
  import: { title: '先把数据导入', action: '上传文件，确认字段和单位；有问题时按页面提示处理。', next: '草稿可检查后，运行数据检查。' },
  check: { title: '一次只处理一个问题', action: '结合 qc、fs、u2 判断，并选择忽略、调整或删除。', next: '检查通过后进入地层分层。' },
  stratification: { title: '先生成，再确认分层', action: '选择方法生成候选；可使用当前分层、整理薄层并逐层确认。', next: '最终分层就绪后进入参数解译。' },
  parameters: { title: '只计算需要的参数', action: '选择参数并查看不能计算的原因；可明确不计算或处理问题。', next: '确认当前已选结果后进入成果输出。' },
  output: { title: '最后生成成果', action: '先看必备条件，再按需生成 PDF 和 Excel。', next: '生成后可直接下载，旧成果仍保留。' },
};

type TargetRect = { top: number; right: number; bottom: number; left: number; width: number; height: number };

function storageKey(route: ProfessionalGuideRoute) {
  return `${STORAGE_PREFIX}:${route}`;
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function hasDismissal(route: ProfessionalGuideRoute) {
  if (dismissedInMemory.has(route)) return true;
  try {
    if (window.localStorage.getItem(storageKey(route))) return true;
  } catch {
    // Session and memory fallbacks keep the guide non-blocking.
  }
  try {
    return Boolean(window.sessionStorage.getItem(`${storageKey(route)}:session`));
  } catch {
    return dismissedInMemory.has(route);
  }
}

function saveDismissal(route: ProfessionalGuideRoute, method: 'complete' | 'skip') {
  dismissedInMemory.add(route);
  const value = JSON.stringify({ version: 1, route, method, dismissedAt: new Date().toISOString() });
  try {
    window.localStorage.setItem(storageKey(route), value);
    return;
  } catch {
    // Fall back to this tab when durable storage is unavailable.
  }
  try {
    window.sessionStorage.setItem(`${storageKey(route)}:session`, value);
  } catch {
    // The in-memory record still prevents a loop in this session.
  }
}

function stepsFor(route: ProfessionalGuideRoute): GuideStep[] {
  const copy = PAGE_COPY[route];
  return [
    { targetTestId: `explorer-${route}`, eyebrow: '当前位置', title: copy.title, description: '左侧显示当前环节；需要返回其他环节时，可直接点击对应页面。' },
    { targetTestId: DOCUMENT_TARGETS[route], eyebrow: '主要工作区', title: copy.action, description: copy.next },
    { targetTestId: 'right-panel', eyebrow: '工具与帮助', title: '需要时看右侧', description: '右侧放本页操作和 AI 助手；左下角“新手指引”可随时重看本页说明。' },
  ];
}

function readTargetRect(testId: string): TargetRect | null {
  const target = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const padding = 8;
  const left = Math.max(8, rect.left - padding);
  const top = Math.max(8, rect.top - padding);
  const right = Math.min(window.innerWidth - 8, rect.right + padding);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);
  return { top, right, bottom, left, width: right - left, height: bottom - top };
}

function placeCard(target: TargetRect | null): { placement: string; style: CSSProperties } {
  const margin = 16;
  const gap = 16;
  const width = Math.min(360, window.innerWidth - margin * 2);
  const height = 250;
  if (!target) return { placement: 'center', style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width } };
  if (target.right + gap + width <= window.innerWidth - margin) return { placement: 'right', style: { left: target.right + gap, top: Math.max(margin, Math.min(target.top, window.innerHeight - height - margin)), width } };
  if (target.left - gap - width >= margin) return { placement: 'left', style: { left: target.left - gap - width, top: Math.max(margin, Math.min(target.top, window.innerHeight - height - margin)), width } };
  if (target.bottom + gap + height <= window.innerHeight - margin) return { placement: 'bottom', style: { left: Math.max(margin, Math.min(target.left, window.innerWidth - width - margin)), top: target.bottom + gap, width } };
  if (target.top - gap - height >= margin) return { placement: 'top', style: { left: Math.max(margin, Math.min(target.left, window.innerWidth - width - margin)), top: target.top - gap - height, width } };
  return { placement: 'center', style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width } };
}

export function ProfessionalFirstUseGuide({ route, replayToken }: { route: ProfessionalGuideRoute; replayToken: number }) {
  const steps = stepsFor(route);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const automaticRouteRef = useRef<ProfessionalGuideRoute | null>(null);
  const previousReplayToken = useRef(replayToken);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  function openGuide() {
    if (!isDesktopViewport()) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStepIndex(0);
    setOpen(true);
  }

  function closeGuide(method: 'complete' | 'skip') {
    saveDismissal(route, method);
    setOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.isConnected && returnFocusRef.current.focus());
  }

  useEffect(() => {
    if (automaticRouteRef.current === route) return;
    automaticRouteRef.current = route;
    setOpen(false);
    setStepIndex(0);
    if (!hasDismissal(route)) window.requestAnimationFrame(openGuide);
  }, [route]);

  useEffect(() => {
    if (replayToken === previousReplayToken.current) return;
    previousReplayToken.current = replayToken;
    openGuide();
  }, [replayToken]);

  useEffect(() => {
    if (!open) return undefined;
    const targetId = steps[stepIndex].targetTestId;
    const refresh = () => setTargetRect(readTargetRect(targetId));
    refresh();
    const frame = window.requestAnimationFrame(refresh);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const target = document.querySelector<HTMLElement>(`[data-testid="${targetId}"]`);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
    if (target) observer?.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      observer?.disconnect();
    };
  }, [open, route, stepIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, stepIndex]);

  if (!open || !isDesktopViewport()) return null;
  const step = steps[stepIndex];
  const card = placeCard(targetRect);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { event.preventDefault(); closeGuide('skip'); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href]'));
    if (!focusable.length) return;
    const [first] = focusable;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <div className="project-onboarding-root professional-onboarding-root" data-testid={`professional-${route}-onboarding`} data-step={stepIndex + 1}>
      <div className="project-onboarding-blocker" aria-hidden="true" />
      {targetRect ? <>
        <div className="project-onboarding-shade" style={{ left: 0, top: 0, width: window.innerWidth, height: targetRect.top }} />
        <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
        <div className="project-onboarding-shade" style={{ left: targetRect.right, top: targetRect.top, width: Math.max(0, window.innerWidth - targetRect.right), height: targetRect.height }} />
        <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.bottom, width: window.innerWidth, height: Math.max(0, window.innerHeight - targetRect.bottom) }} />
        <div className="project-onboarding-spotlight" style={{ left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height }} data-testid="professional-onboarding-spotlight" />
      </> : <div className="project-onboarding-shade project-onboarding-shade-full" />}
      <section ref={dialogRef} className="project-onboarding-card professional-onboarding-card" style={card.style} data-placement={card.placement} data-target={step.targetTestId} data-testid="professional-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="professional-onboarding-title" onKeyDown={handleKeyDown}>
        <header><div><span>{step.eyebrow}</span><small>{stepIndex + 1} / {steps.length}</small></div><button type="button" aria-label="关闭新手指引" onClick={() => closeGuide('skip')} data-testid="professional-onboarding-close"><X /></button></header>
        <h2 id="professional-onboarding-title">{step.title}</h2>
        <p>{step.description}</p>
        <footer>
          <button type="button" className="project-onboarding-skip" onClick={() => closeGuide('skip')} data-testid="professional-onboarding-skip">跳过本页</button>
          <div>
            {stepIndex > 0 ? <button type="button" className="toolbar-button" onClick={() => setStepIndex((current) => current - 1)} data-testid="professional-onboarding-back"><ChevronLeft />上一步</button> : null}
            <button ref={primaryActionRef} type="button" className="toolbar-button primary" onClick={() => stepIndex === steps.length - 1 ? closeGuide('complete') : setStepIndex((current) => current + 1)} data-testid="professional-onboarding-next">{stepIndex === steps.length - 1 ? '知道了' : '下一步'}{stepIndex < steps.length - 1 ? <ChevronRight /> : null}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
