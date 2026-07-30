import { useMemo } from 'react';
import {
  JTS_SBT_IC_BOUNDARIES,
  JTS_SBT_DISPLAY_DOMAIN,
  JTS_SBT_ZONE_COLORS,
  JTS_SOIL_CLASSES,
  calculateJtsSbtBoundaryQtn,
  calculateJtsSbtRegionLabelPosition,
} from '../jts/jtsT242Domain';
import type { JtsClassificationEvidenceRowV4, JtsClassificationRunV4, StratificationLayerV2 } from '../workspace/workspaceV2';

const WIDTH = 820;
const HEIGHT = 330;
const PLOT = { left: 58, right: 20, top: 18, bottom: 46 } as const;
const MAX_BACKGROUND_POINTS = 660;
const MAX_SELECTED_POINTS = 240;

export { JTS_SBT_ZONE_COLORS };

const SBT_REGION_LABELS = ([4, 5, 6, 7, 8, 9] as const)
  .map(calculateJtsSbtRegionLabelPosition)
  .filter((label): label is NonNullable<typeof label> => label !== null);

export type JtsSbtPoint = {
  sourceRowId: string;
  depthM: number;
  frPercent: number;
  qtn: number;
  zone: number;
  label: string;
};

export function toJtsSbtPoint(row: JtsClassificationEvidenceRowV4): JtsSbtPoint | null {
  if (
    !row.selectedClass
    || row.qtn === null
    || row.frPercent === null
    || !Number.isFinite(row.qtn)
    || !Number.isFinite(row.frPercent)
    || row.qtn <= 0
    || row.frPercent <= 0
  ) return null;
  return {
    sourceRowId: row.sourceRowId,
    depthM: row.depthM,
    frPercent: row.frPercent,
    qtn: row.qtn,
    zone: row.selectedClass.zone,
    label: row.selectedClass.label,
  };
}

export function isJtsSbtPointInDisplayDomain(point: JtsSbtPoint) {
  return point.frPercent >= JTS_SBT_DISPLAY_DOMAIN.frMin
    && point.frPercent <= JTS_SBT_DISPLAY_DOMAIN.frMax
    && point.qtn >= JTS_SBT_DISPLAY_DOMAIN.qtnMin
    && point.qtn <= JTS_SBT_DISPLAY_DOMAIN.qtnMax;
}

export function jtsSbtLayerContainsDepth(layer: Pick<StratificationLayerV2, 'depthFromM' | 'depthToM'>, depthM: number, includeBottom: boolean) {
  return depthM >= layer.depthFromM && (depthM < layer.depthToM || (includeBottom && depthM === layer.depthToM));
}

export function isJtsSbtSampled(displayedCount: number, inDomainCount: number) {
  return displayedCount < inDomainCount;
}

function sampleEvenly<T>(items: T[], limit: number) {
  if (items.length <= limit) return items;
  return Array.from({ length: limit }, (_, index) => items[Math.floor(index * items.length / limit)]);
}

function sampleByZone(points: JtsSbtPoint[], limit: number) {
  if (points.length <= limit) return points;
  const groups = new Map<number, JtsSbtPoint[]>();
  points.forEach((point) => groups.set(point.zone, [...(groups.get(point.zone) ?? []), point]));
  const entries = [...groups.entries()].sort(([left], [right]) => left - right);
  const sampled = entries.flatMap(([, rows]) => {
    const proportionalLimit = Math.max(1, Math.round(limit * rows.length / points.length));
    return sampleEvenly(rows, proportionalLimit);
  });
  return sampleEvenly(sampled.sort((left, right) => left.depthM - right.depthM), limit);
}

function logTicks(minimum: number, maximum: number) {
  const ticks: number[] = [];
  for (let exponent = Math.floor(Math.log10(minimum)); exponent <= Math.ceil(Math.log10(maximum)); exponent += 1) {
    const value = 10 ** exponent;
    if (value >= minimum && value <= maximum) ticks.push(value);
  }
  return ticks;
}

function formatTick(value: number) {
  if (value >= 1000) return `${value / 1000}k`;
  if (value >= 1) return String(value);
  return value.toFixed(Math.max(1, Math.ceil(-Math.log10(value))));
}

export function JtsSbtChart({
  run,
  runState,
  selectedLayer,
  includeSelectedBottom,
}: {
  run: JtsClassificationRunV4 | null;
  runState: 'current' | 'stale' | 'empty';
  selectedLayer: StratificationLayerV2 | null;
  includeSelectedBottom: boolean;
}) {
  const prepared = useMemo(() => {
    if (!run || runState !== 'current') return null;
    const valid = run.rows.map(toJtsSbtPoint).filter((point): point is JtsSbtPoint => point !== null);
    const inDomain = valid.filter(isJtsSbtPointInDisplayDomain);
    const selected = selectedLayer
      ? inDomain.filter((point) => jtsSbtLayerContainsDepth(selectedLayer, point.depthM, includeSelectedBottom))
      : [];
    const selectedIds = new Set(selected.map((point) => point.sourceRowId));
    const background = inDomain.filter((point) => !selectedIds.has(point.sourceRowId));
    const displayedSelected = sampleEvenly(selected, MAX_SELECTED_POINTS);
    const displayedBackground = sampleByZone(background, MAX_BACKGROUND_POINTS);
    const { frMin: xMin, frMax: xMax, qtnMin: yMin, qtnMax: yMax } = JTS_SBT_DISPLAY_DOMAIN;
    const xSpan = Math.log10(xMax) - Math.log10(xMin);
    const ySpan = Math.log10(yMax) - Math.log10(yMin);
    const x = (value: number) => PLOT.left + ((Math.log10(value) - Math.log10(xMin)) / xSpan) * (WIDTH - PLOT.left - PLOT.right);
    const y = (value: number) => PLOT.top + (1 - (Math.log10(value) - Math.log10(yMin)) / ySpan) * (HEIGHT - PLOT.top - PLOT.bottom);
    const backgroundPaths = Array.from({ length: 9 }, (_, index) => index + 1).map((zone) => ({
      zone,
      path: displayedBackground.filter((point) => point.zone === zone).map((point) => `M${x(point.frPercent).toFixed(1)} ${y(point.qtn).toFixed(1)}h0.01`).join(''),
    }));
    const boundaryPaths = JTS_SBT_IC_BOUNDARIES.map((ic) => {
      const points: string[] = [];
      for (let index = 0; index <= 120; index += 1) {
        const fr = 10 ** (Math.log10(xMin) + xSpan * index / 120);
        const qtn = calculateJtsSbtBoundaryQtn(ic, fr);
        if (qtn !== null && qtn >= yMin && qtn <= yMax) points.push(`${x(fr).toFixed(1)},${y(qtn).toFixed(1)}`);
      }
      return { ic, points: points.join(' ') };
    });
    const selectedZoneCounts = new Map<number, number>();
    selected.forEach((point) => selectedZoneCounts.set(point.zone, (selectedZoneCounts.get(point.zone) ?? 0) + 1));
    return {
      valid,
      inDomain,
      selected,
      displayedSelected,
      displayedBackground,
      backgroundPaths,
      boundaryPaths,
      selectedZoneCounts,
      x,
      y,
      xTicks: logTicks(xMin, xMax),
      yTicks: logTicks(yMin, yMax),
      xMin,
      xMax,
      yMin,
      yMax,
      invalidCount: run.rows.length - valid.length,
      outOfRangeCount: valid.length - inDomain.length,
      displayedCount: displayedBackground.length + displayedSelected.length,
    };
  }, [includeSelectedBottom, run, runState, selectedLayer]);

  if (runState !== 'current' || !run || !prepared) {
    return (
      <section className="jts-sbt-panel empty" data-testid="jts-sbt-panel" data-state={runState}>
        <div><span>次级分类证据</span><h3>JTS/T 242-2020 九分区 SBT</h3></div>
        <p>{runState === 'stale'
          ? '分类结果已失效，SBT 暂不作为当前证据；在右侧重新运行 JTS 分类后恢复。'
          : '暂无当前 JTS 分类结果。先在右侧运行 JTS 分类，完成后将在这里显示证据。'}</p>
      </section>
    );
  }

  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  return (
    <section className="jts-sbt-panel" data-testid="jts-sbt-panel" data-state="current">
      <header className="jts-sbt-heading">
        <div><span>次级分类证据</span><h3>JTS/T 242-2020 九分区 SBT</h3></div>
        <div className="jts-sbt-counts" data-testid="jts-sbt-counts">
          <span>本次分类 <strong>{run.rows.length}</strong> 行</span>
          <span>有效坐标 <strong>{prepared.valid.length}</strong> 行</span>
          <span>标准图内 <strong>{prepared.inDomain.length}</strong> 行（图外 {prepared.outOfRangeCount}）</span>
          <span>图中显示 <strong>{prepared.displayedCount}</strong> 点{isJtsSbtSampled(prepared.displayedCount, prepared.inDomain.length) ? '（按 Zone 等距抽样）' : ''}</span>
          <span>无效 <strong>{prepared.invalidCount}</strong> 行</span>
        </div>
      </header>
      <p className="jts-sbt-note">点的颜色沿用当前 JTS 分类；Zone 1–3 还依赖 qnet，本图不会仅按二维位置重新分类。</p>
      {run.route === 'approximate_cpt' ? <p className="jts-sbt-route" data-testid="jts-sbt-approximate">无 u2，当前为 CPT 近似分类。</p> : null}
      <div className="jts-sbt-chart-wrap">
        <svg
          className="jts-sbt-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby="jts-sbt-title jts-sbt-description"
          data-testid="jts-sbt-chart"
          data-total-rows={run.rows.length}
          data-valid-points={prepared.valid.length}
          data-in-domain-points={prepared.inDomain.length}
          data-out-of-range-points={prepared.outOfRangeCount}
          data-displayed-points={prepared.displayedCount}
          data-invalid-points={prepared.invalidCount}
        >
          <title id="jts-sbt-title">JTS/T 242-2020 Qtn*–Fr 九分区 SBT 证据图</title>
          <desc id="jts-sbt-description">横轴 Fr 百分比，标准范围 0.1 至 10；纵轴 Qtn*，标准范围 1 至 1000；均为十进制对数轴。当前层点使用黑色描边突出。</desc>
          <rect className="jts-sbt-plot-bg" x={PLOT.left} y={PLOT.top} width={plotWidth} height={plotHeight} />
          {prepared.xTicks.map((tick) => <g key={`x-${tick}`}><line className="jts-sbt-grid" x1={prepared.x(tick)} x2={prepared.x(tick)} y1={PLOT.top} y2={PLOT.top + plotHeight} /><text className="jts-sbt-tick" x={prepared.x(tick)} y={HEIGHT - 23} textAnchor="middle">{formatTick(tick)}</text></g>)}
          {prepared.yTicks.map((tick) => <g key={`y-${tick}`}><line className="jts-sbt-grid" x1={PLOT.left} x2={PLOT.left + plotWidth} y1={prepared.y(tick)} y2={prepared.y(tick)} /><text className="jts-sbt-tick" x={PLOT.left - 9} y={prepared.y(tick) + 4} textAnchor="end">{formatTick(tick)}</text></g>)}
          {prepared.boundaryPaths.map((boundary) => boundary.points ? <polyline key={boundary.ic} className="jts-sbt-ic-boundary" points={boundary.points} /> : null)}
          {prepared.boundaryPaths.map((boundary) => {
            const labelFr = Math.max(prepared.xMin, Math.min(prepared.xMax, 0.24));
            const labelQtn = calculateJtsSbtBoundaryQtn(boundary.ic, labelFr);
            return labelQtn && labelQtn >= prepared.yMin && labelQtn <= prepared.yMax
              ? <text key={`label-${boundary.ic}`} className="jts-sbt-ic-label" x={prepared.x(labelFr) + 5} y={prepared.y(labelQtn) - 4}>Ic {boundary.ic.toFixed(2)}</text>
              : null;
          })}
          {prepared.backgroundPaths.map((group) => group.path ? <path key={group.zone} className="jts-sbt-points" d={group.path} stroke={JTS_SBT_ZONE_COLORS[group.zone]} /> : null)}
          {SBT_REGION_LABELS.map((label) => (
            <text
              key={label.zone}
              className="jts-sbt-region-label"
              data-testid="jts-sbt-region-label"
              data-zone={label.zone}
              data-fr-percent={label.frPercent}
              data-qtn={label.qtn}
              x={prepared.x(label.frPercent)}
              y={prepared.y(label.qtn)}
              style={{ fill: JTS_SBT_ZONE_COLORS[label.zone] }}
            >Zone {label.zone}</text>
          ))}
          {prepared.displayedSelected.map((point) => <circle key={point.sourceRowId} className="jts-sbt-selected-point" data-zone={point.zone} cx={prepared.x(point.frPercent)} cy={prepared.y(point.qtn)} r="3" fill={JTS_SBT_ZONE_COLORS[point.zone]} />)}
          <text className="jts-sbt-zone-hint" x={PLOT.left + 12} y={PLOT.top + plotHeight - 12}>Zone 1–3：结合 qnet 判定</text>
          <text className="jts-sbt-axis-label" x={PLOT.left + plotWidth / 2} y={HEIGHT - 4} textAnchor="middle">Fr (%) · log10</text>
          <text className="jts-sbt-axis-label" transform={`translate(15 ${PLOT.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">Qtn* · log10</text>
        </svg>
      </div>
      <div className="jts-sbt-footer">
        <div className="jts-sbt-legend" aria-label="九分区土类图例">
          {JTS_SOIL_CLASSES.map((soil) => <span key={soil.zone} data-zone={soil.zone}><i style={{ background: JTS_SBT_ZONE_COLORS[soil.zone] }} />Zone {soil.zone} · {soil.label}</span>)}
        </div>
        <p data-testid="jts-sbt-selected-summary">{selectedLayer
          ? `当前层 ${selectedLayer.depthFromM.toFixed(2)}–${selectedLayer.depthToM.toFixed(2)} m：标准图内 ${prepared.selected.length} 个点${prepared.displayedSelected.length < prepared.selected.length ? `，显示 ${prepared.displayedSelected.length} 个` : ''}${prepared.selectedZoneCounts.size ? `；${[...prepared.selectedZoneCounts.entries()].sort(([left], [right]) => left - right).map(([zone, count]) => `Zone ${zone} ${count} 点`).join('、')}` : ''}。`
          : '选择土层后，将用黑色描边突出该层证据点。'}</p>
      </div>
    </section>
  );
}
