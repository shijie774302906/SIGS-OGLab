import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export type QuickPlotGuideMode = 'input' | 'report';

export const QUICK_INPUT_GUIDE_STORAGE_KEY = 'sigs-oglab:quick-input-guide:v1';
export const QUICK_REPORT_GUIDE_STORAGE_KEY = 'sigs-oglab:quick-report-guide:v1';

const SESSION_SUFFIX = ':session';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const dismissedInMemory: Record<QuickPlotGuideMode, boolean> = { input: false, report: false };

type GuideStep = {
  targetTestId: string;
  eyebrow: string;
  title: string;
  description: string;
};

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type CardPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center' | 'mobile';

function storageKey(mode: QuickPlotGuideMode) {
  return mode === 'input' ? QUICK_INPUT_GUIDE_STORAGE_KEY : QUICK_REPORT_GUIDE_STORAGE_KEY;
}

function hasDismissalRecord(mode: QuickPlotGuideMode) {
  if (dismissedInMemory[mode]) return true;
  const key = storageKey(mode);
  try {
    if (window.localStorage.getItem(key)) return true;
  } catch {
    // Session and in-memory fallbacks keep the guide non-blocking.
  }
  try {
    return Boolean(window.sessionStorage.getItem(`${key}${SESSION_SUFFIX}`));
  } catch {
    return dismissedInMemory[mode];
  }
}

function saveDismissalRecord(mode: QuickPlotGuideMode, method: 'complete' | 'skip') {
  dismissedInMemory[mode] = true;
  const key = storageKey(mode);
  const value = JSON.stringify({ version: 1, page: mode, method, dismissedAt: new Date().toISOString() });
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch {
    // Fall back to this tab when durable storage is unavailable.
  }
  try {
    window.sessionStorage.setItem(`${key}${SESSION_SUFFIX}`, value);
  } catch {
    // The module-level record still prevents a loop in the current page session.
  }
}

function isDesktopViewport() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function readTargetRect(testId: string, mobile: boolean): TargetRect | null {
  const target = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const padding = 8;
  const safeBottom = mobile ? Math.max(180, window.innerHeight - 250) : window.innerHeight - 8;
  const left = Math.max(8, rect.left - padding);
  const top = Math.max(8, rect.top - padding);
  const right = Math.min(window.innerWidth - 8, rect.right + padding);
  const bottom = Math.min(safeBottom, rect.bottom + padding);
  if (right <= left || bottom <= top) return null;
  return { top, right, bottom, left, width: right - left, height: bottom - top };
}

function placeDesktopCard(target: TargetRect | null): { placement: CardPlacement; style: CSSProperties } {
  const margin = 16;
  const gap = 16;
  const cardWidth = Math.min(360, window.innerWidth - margin * 2);
  const cardHeight = 250;
  if (!target) return { placement: 'center', style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth } };
  if (target.right + gap + cardWidth <= window.innerWidth - margin) {
    return { placement: 'right', style: { left: target.right + gap, top: Math.max(margin, Math.min(target.top + target.height / 2 - cardHeight / 2, window.innerHeight - cardHeight - margin)), width: cardWidth } };
  }
  if (target.left - gap - cardWidth >= margin) {
    return { placement: 'left', style: { left: target.left - gap - cardWidth, top: Math.max(margin, Math.min(target.top + target.height / 2 - cardHeight / 2, window.innerHeight - cardHeight - margin)), width: cardWidth } };
  }
  if (target.bottom + gap + cardHeight <= window.innerHeight - margin) {
    return { placement: 'bottom', style: { left: Math.max(margin, Math.min(target.left, window.innerWidth - cardWidth - margin)), top: target.bottom + gap, width: cardWidth } };
  }
  if (target.top - gap - cardHeight >= margin) {
    return { placement: 'top', style: { left: Math.max(margin, Math.min(target.left, window.innerWidth - cardWidth - margin)), top: target.top - gap - cardHeight, width: cardWidth } };
  }
  return { placement: 'center', style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth } };
}

function inputSteps(hasRows: boolean, hasU2Data: boolean): GuideStep[] {
  const settingsDescription = !hasRows
    ? '填写孔位名称；导入数据后，需要确认的内容会显示在这里。'
    : hasU2Data
      ? '确认孔位名称、水深和 u2 的使用方式。'
      : '确认孔位名称即可。';
  return [
    { targetTestId: 'quick-data-card', eyebrow: '第 1 步', title: '先放入数据', description: '可直接粘贴，也可导入 Excel。文件看不懂时，再用 AI 整理。' },
    { targetTestId: 'quick-settings-card', eyebrow: '第 2 步', title: '再确认图册信息', description: settingsDescription },
    { targetTestId: 'quick-ready-bar', eyebrow: '第 3 步', title: '最后生成图册', description: '数据准备好后，按钮会亮起。点击即可生成完整图册。' },
  ];
}

const REPORT_STEPS: GuideStep[] = [
  { targetTestId: 'quick-report-viewer', eyebrow: '第 1 步', title: '查看图册', description: '点击右侧缩略图切换页面，在中间查看当前图。' },
  { targetTestId: 'quick-report-export-actions', eyebrow: '第 2 步', title: '导出结果', description: '需要结果文件时，可导出 Excel 或高清 PDF。' },
  { targetTestId: 'quick-ai-toggle', eyebrow: '第 3 步', title: '询问图册', description: 'AI 可以阅读当前页和跨页证据，但不会修改图册。' },
];

export function QuickPlotFirstUseGuide({
  mode,
  hasRows,
  hasU2Data,
  replayToken,
}: {
  mode: QuickPlotGuideMode;
  hasRows: boolean;
  hasU2Data: boolean;
  replayToken: number;
}) {
  const steps = useMemo(() => mode === 'input' ? inputSteps(hasRows, hasU2Data) : REPORT_STEPS, [hasRows, hasU2Data, mode]);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && isDesktopViewport());
  const automaticCheckComplete = useRef(false);
  const previousReplayToken = useRef(replayToken);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  function openGuide() {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStepIndex(0);
    setOpen(true);
  }

  function closeGuide(method: 'complete' | 'skip') {
    saveDismissalRecord(mode, method);
    setOpen(false);
    window.requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected && returnFocusRef.current !== document.body) returnFocusRef.current.focus();
    });
  }

  useEffect(() => {
    if (automaticCheckComplete.current) return;
    automaticCheckComplete.current = true;
    if (!hasDismissalRecord(mode)) openGuide();
  }, [mode]);

  useEffect(() => {
    if (replayToken === previousReplayToken.current) return;
    previousReplayToken.current = replayToken;
    openGuide();
  }, [replayToken]);

  useEffect(() => {
    if (!open) return undefined;
    const step = steps[stepIndex];
    const target = document.querySelector<HTMLElement>(`[data-testid="${step.targetTestId}"]`);
    const mobile = !isDesktopViewport();
    const main = target?.closest<HTMLElement>('.quick-input-main, .quick-report-main') ?? null;
    const previousPaddingBottom = main?.style.paddingBottom ?? '';
    if (mobile && main) main.style.paddingBottom = '320px';
    setDesktop(!mobile);
    if (mobile) target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const refreshTarget = () => {
      const nextMobile = !isDesktopViewport();
      setDesktop(!nextMobile);
      setTargetRect(readTargetRect(step.targetTestId, nextMobile));
    };
    refreshTarget();
    const frame = window.requestAnimationFrame(refreshTarget);
    const settle = window.setTimeout(refreshTarget, mobile ? 320 : 0);
    window.addEventListener('resize', refreshTarget);
    window.addEventListener('scroll', refreshTarget, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshTarget);
    if (target) observer?.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('resize', refreshTarget);
      window.removeEventListener('scroll', refreshTarget, true);
      observer?.disconnect();
      if (main) main.style.paddingBottom = previousPaddingBottom;
    };
  }, [open, stepIndex, steps]);

  useEffect(() => {
    if (!open) return undefined;
    window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeGuide('skip');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mode, open, stepIndex]);

  if (!open) return null;

  const step = steps[stepIndex];
  const card = desktop
    ? placeDesktopCard(targetRect)
    : { placement: 'mobile' as const, style: { left: 12, right: 12, bottom: 12 } as CSSProperties };

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeGuide('skip');
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <div className="project-onboarding-root quick-onboarding-root" data-testid={`quick-${mode}-onboarding`} data-step={stepIndex + 1}>
      <div className="project-onboarding-blocker" aria-hidden="true" />
      {targetRect ? (
        <>
          <div className="project-onboarding-shade" style={{ left: 0, top: 0, width: window.innerWidth, height: targetRect.top }} />
          <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
          <div className="project-onboarding-shade" style={{ left: targetRect.right, top: targetRect.top, width: Math.max(0, window.innerWidth - targetRect.right), height: targetRect.height }} />
          <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.bottom, width: window.innerWidth, height: Math.max(0, window.innerHeight - targetRect.bottom) }} />
          <div className="project-onboarding-spotlight" style={{ left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height }} data-testid="quick-onboarding-spotlight" />
        </>
      ) : <div className="project-onboarding-shade project-onboarding-shade-full" />}
      <section
        ref={dialogRef}
        className="project-onboarding-card quick-onboarding-card"
        style={card.style}
        data-placement={card.placement}
        data-target={step.targetTestId}
        data-testid="quick-onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-onboarding-title"
        onKeyDown={handleDialogKeyDown}
      >
        <header><div><span>{step.eyebrow}</span><small>{stepIndex + 1} / {steps.length}</small></div><button type="button" aria-label="关闭新手指引" onClick={() => closeGuide('skip')} data-testid="quick-onboarding-close"><X /></button></header>
        <h2 id="quick-onboarding-title">{step.title}</h2>
        <p>{step.description}</p>
        <footer>
          <button type="button" className="project-onboarding-skip" onClick={() => closeGuide('skip')} data-testid="quick-onboarding-skip">跳过全部</button>
          <div>
            {stepIndex > 0 ? <button type="button" className="toolbar-button" onClick={() => setStepIndex((current) => current - 1)} data-testid="quick-onboarding-back"><ChevronLeft />上一步</button> : null}
            <button ref={primaryActionRef} type="button" className="toolbar-button primary" onClick={() => stepIndex === steps.length - 1 ? closeGuide('complete') : setStepIndex((current) => current + 1)} data-testid="quick-onboarding-next">
              {stepIndex === steps.length - 1 ? '开始使用' : '下一步'}{stepIndex < steps.length - 1 ? <ChevronRight /> : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
