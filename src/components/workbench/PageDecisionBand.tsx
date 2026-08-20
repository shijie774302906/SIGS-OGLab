import type { ReactNode } from 'react';

type PageDecisionBandProps = {
  testId: string;
  tone: 'primary' | 'success' | 'issue' | 'stale';
  className?: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction: ReactNode;
  secondaryActions?: ReactNode;
  secondaryTestId?: string;
  stateLabel: string;
  stateMeta: string;
};

export function PageDecisionBand({
  testId,
  tone,
  className = '',
  eyebrow = '当前任务',
  title,
  description,
  primaryAction,
  secondaryActions,
  secondaryTestId,
  stateLabel,
  stateMeta,
}: PageDecisionBandProps) {
  return (
    <section className={`page-decision-band ${tone} ${className}`.trim()} data-testid={testId}>
      <div className="page-decision-main">
        <span className="first-look-label">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="page-decision-actions">{primaryAction}</div>
        {secondaryActions ? (
          <div className="page-decision-secondary" data-testid={secondaryTestId}>
            {secondaryActions}
          </div>
        ) : null}
      </div>
      <div className="page-decision-state">
        <span>当前状态</span>
        <strong>{stateLabel}</strong>
        <em>{stateMeta}</em>
      </div>
    </section>
  );
}
