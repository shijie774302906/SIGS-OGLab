import { BarChart3, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { loadVisitorAnalytics, type VisitorAnalyticsSnapshot } from './visitorAnalytics';

export function VisitorAnalyticsLauncher({ placement }: { placement: 'floating' | 'sidebar' }) {
  const [snapshot, setSnapshot] = useState<VisitorAnalyticsSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    void loadVisitorAnalytics().then((next) => { if (active && next) setSnapshot(next); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOutside);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOutside);
    };
  }, [open]);

  if (!snapshot) return null;
  return <div className={`visitor-analytics ${placement}`}>
    <button
      ref={triggerRef}
      type="button"
      className="visitor-analytics-trigger"
      onClick={() => setOpen((current) => !current)}
      aria-expanded={open}
      data-testid="visitor-analytics-trigger"
    >
      <BarChart3 />
      <span>累计访客 {snapshot.totals.visitors.toLocaleString('zh-CN')} · 覆盖 {snapshot.totals.coveredRegions} 个地区</span>
    </button>
    {open ? <section ref={panelRef} className="visitor-analytics-popover" aria-label="访问统计" data-testid="visitor-analytics-popover">
      <header><div><span>访问统计</span><strong>累计访客 {snapshot.totals.visitors.toLocaleString('zh-CN')}</strong></div><button type="button" aria-label="关闭访问统计" onClick={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }}><X /></button></header>
      <dl><div><dt>访问</dt><dd>{snapshot.totals.visits.toLocaleString('zh-CN')} 次</dd></div><div><dt>覆盖</dt><dd>{snapshot.totals.coveredRegions} 个地区</dd></div></dl>
      <div className="visitor-region-heading"><strong>地区分布</strong><span>按访问网络出口估算</span></div>
      <ul>{snapshot.regions.map((region) => <li key={region.key}><span>{region.label}</span><strong>{region.visits.toLocaleString('zh-CN')}</strong></li>)}</ul>
    </section> : null}
  </div>;
}
