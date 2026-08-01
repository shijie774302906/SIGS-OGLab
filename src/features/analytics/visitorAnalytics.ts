export type VisitorAnalyticsSnapshot = {
  status: 'ready';
  totals: { visitors: number; visits: number; coveredRegions: number };
  regions: Array<{ key: string; label: string; visits: number }>;
};

let currentRequest: Promise<VisitorAnalyticsSnapshot | null> | null = null;
let readySnapshot: VisitorAnalyticsSnapshot | null = null;

function validSnapshot(value: unknown): value is VisitorAnalyticsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<VisitorAnalyticsSnapshot>;
  return candidate.status === 'ready'
    && Boolean(candidate.totals)
    && Number.isFinite(candidate.totals?.visitors)
    && Number.isFinite(candidate.totals?.visits)
    && Number.isFinite(candidate.totals?.coveredRegions)
    && Array.isArray(candidate.regions);
}

export function loadVisitorAnalytics() {
  if (readySnapshot) return Promise.resolve(readySnapshot);
  if (currentRequest) return currentRequest;
  currentRequest = fetch('/api/visits', { method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => response.ok ? response.json() : null)
    .then((value) => {
      if (!validSnapshot(value)) return null;
      readySnapshot = value;
      return value;
    })
    .catch(() => null)
    .finally(() => { currentRequest = null; });
  return currentRequest;
}
