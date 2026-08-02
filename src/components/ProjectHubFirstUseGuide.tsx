import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react';

export const PROJECT_HUB_GUIDE_STORAGE_KEY = 'sigs-oglab:project-hub-guide:v1';
const PROJECT_HUB_GUIDE_SESSION_KEY = `${PROJECT_HUB_GUIDE_STORAGE_KEY}:session`;
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

let dismissedInMemory = false;

type GuideStep = {
  targetTestId: string;
  eyebrow: string;
  title: string;
  description: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    targetTestId: 'project-mode-choice',
    eyebrow: '先选一种方式',
    title: '快捷出图，还是专业解译？',
    description: '只想粘贴数据直接出图，选快捷出图；需要检查数据、调整分层和参数，选专业解译。',
  },
  {
    targetTestId: 'new-project-name',
    eyebrow: '再写一个名字',
    title: '输入项目名称',
    description: '写一个以后找得到的名字，例如“海风场 A”。',
  },
  {
    targetTestId: 'create-project-submit',
    eyebrow: '最后一步',
    title: '开始使用',
    description: '确认名称后，点击这里进入你选择的流程。',
  },
];

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type CardPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function hasDismissalRecord() {
  if (dismissedInMemory) return true;
  try {
    if (window.localStorage.getItem(PROJECT_HUB_GUIDE_STORAGE_KEY)) return true;
  } catch {
    // Session and in-memory fallbacks keep the guide non-blocking.
  }
  try {
    return Boolean(window.sessionStorage.getItem(PROJECT_HUB_GUIDE_SESSION_KEY));
  } catch {
    return dismissedInMemory;
  }
}

function saveDismissalRecord(method: 'complete' | 'skip') {
  dismissedInMemory = true;
  const value = JSON.stringify({ version: 1, method, dismissedAt: new Date().toISOString() });
  try {
    window.localStorage.setItem(PROJECT_HUB_GUIDE_STORAGE_KEY, value);
    return;
  } catch {
    // A session record is enough to avoid repeatedly interrupting this tab.
  }
  try {
    window.sessionStorage.setItem(PROJECT_HUB_GUIDE_SESSION_KEY, value);
  } catch {
    // The in-memory flag still closes the current session safely.
  }
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

function placeCard(target: TargetRect | null): { placement: CardPlacement; style: CSSProperties } {
  const margin = 16;
  const gap = 16;
  const cardWidth = Math.min(360, window.innerWidth - margin * 2);
  const cardHeight = 250;
  if (!target) {
    return {
      placement: 'center',
      style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth },
    };
  }

  if (target.right + gap + cardWidth <= window.innerWidth - margin) {
    return {
      placement: 'right',
      style: {
        left: target.right + gap,
        top: Math.max(margin, Math.min(target.top + target.height / 2 - cardHeight / 2, window.innerHeight - cardHeight - margin)),
        width: cardWidth,
      },
    };
  }
  if (target.left - gap - cardWidth >= margin) {
    return {
      placement: 'left',
      style: {
        left: target.left - gap - cardWidth,
        top: Math.max(margin, Math.min(target.top + target.height / 2 - cardHeight / 2, window.innerHeight - cardHeight - margin)),
        width: cardWidth,
      },
    };
  }
  if (target.bottom + gap + cardHeight <= window.innerHeight - margin) {
    return {
      placement: 'bottom',
      style: {
        left: Math.max(margin, Math.min(target.left, window.innerWidth - cardWidth - margin)),
        top: target.bottom + gap,
        width: cardWidth,
      },
    };
  }
  if (target.top - gap - cardHeight >= margin) {
    return {
      placement: 'top',
      style: {
        left: Math.max(margin, Math.min(target.left, window.innerWidth - cardWidth - margin)),
        top: target.top - gap - cardHeight,
        width: cardWidth,
      },
    };
  }
  return {
    placement: 'center',
    style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth },
  };
}

export function ProjectHubFirstUseGuide({
  hasProjects,
  replayToken,
}: {
  hasProjects: boolean;
  replayToken: number;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const automaticCheckComplete = useRef(false);
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
    saveDismissalRecord(method);
    setOpen(false);
    window.requestAnimationFrame(() => {
      const fallback = document.querySelector<HTMLElement>('[data-testid="project-mode-quick"]');
      const returnTarget = returnFocusRef.current?.isConnected && returnFocusRef.current !== document.body
        ? returnFocusRef.current
        : fallback;
      returnTarget?.focus();
    });
  }

  useEffect(() => {
    if (automaticCheckComplete.current) return;
    automaticCheckComplete.current = true;
    if (!hasProjects && isDesktopViewport() && !hasDismissalRecord()) openGuide();
  }, [hasProjects]);

  useEffect(() => {
    if (replayToken === previousReplayToken.current) return;
    previousReplayToken.current = replayToken;
    openGuide();
  }, [replayToken]);

  useEffect(() => {
    if (!open) return undefined;
    const refreshTarget = () => setTargetRect(readTargetRect(GUIDE_STEPS[stepIndex].targetTestId));
    refreshTarget();
    const frame = window.requestAnimationFrame(refreshTarget);
    window.addEventListener('resize', refreshTarget);
    window.addEventListener('scroll', refreshTarget, true);
    const target = document.querySelector<HTMLElement>(`[data-testid="${GUIDE_STEPS[stepIndex].targetTestId}"]`);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshTarget);
    if (target) observer?.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', refreshTarget);
      window.removeEventListener('scroll', refreshTarget, true);
      observer?.disconnect();
    };
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, stepIndex]);

  if (!open || !isDesktopViewport()) return null;

  const step = GUIDE_STEPS[stepIndex];
  const card = placeCard(targetRect);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGuide('skip');
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="project-onboarding-root" data-testid="project-onboarding" data-step={stepIndex + 1}>
      <div className="project-onboarding-blocker" aria-hidden="true" />
      {targetRect ? (
        <>
          <div className="project-onboarding-shade" style={{ left: 0, top: 0, width: viewportWidth, height: targetRect.top }} />
          <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
          <div className="project-onboarding-shade" style={{ left: targetRect.right, top: targetRect.top, width: Math.max(0, viewportWidth - targetRect.right), height: targetRect.height }} />
          <div className="project-onboarding-shade" style={{ left: 0, top: targetRect.bottom, width: viewportWidth, height: Math.max(0, viewportHeight - targetRect.bottom) }} />
          <div
            className="project-onboarding-spotlight"
            style={{ left: targetRect.left, top: targetRect.top, width: targetRect.width, height: targetRect.height }}
            data-testid="project-onboarding-spotlight"
          />
        </>
      ) : <div className="project-onboarding-shade project-onboarding-shade-full" />}
      <section
        ref={dialogRef}
        className="project-onboarding-card"
        style={card.style}
        data-placement={card.placement}
        data-target={step.targetTestId}
        data-testid="project-onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-onboarding-title"
        onKeyDown={handleDialogKeyDown}
      >
        <header>
          <div>
            <span>{step.eyebrow}</span>
            <small>{stepIndex + 1} / {GUIDE_STEPS.length}</small>
          </div>
          <button type="button" aria-label="关闭新手指引" onClick={() => closeGuide('skip')} data-testid="project-onboarding-close">
            <X />
          </button>
        </header>
        <h2 id="project-onboarding-title">{step.title}</h2>
        <p>{step.description}</p>
        <footer>
          <button type="button" className="project-onboarding-skip" onClick={() => closeGuide('skip')} data-testid="project-onboarding-skip">
            跳过全部
          </button>
          <div>
            {stepIndex > 0 ? (
              <button type="button" className="toolbar-button" onClick={() => setStepIndex((current) => current - 1)} data-testid="project-onboarding-back">
                <ChevronLeft />上一步
              </button>
            ) : null}
            <button
              ref={primaryActionRef}
              type="button"
              className="toolbar-button primary"
              onClick={() => {
                if (stepIndex === GUIDE_STEPS.length - 1) closeGuide('complete');
                else setStepIndex((current) => current + 1);
              }}
              data-testid="project-onboarding-next"
            >
              {stepIndex === GUIDE_STEPS.length - 1 ? '开始使用' : '下一步'}
              {stepIndex < GUIDE_STEPS.length - 1 ? <ChevronRight /> : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
