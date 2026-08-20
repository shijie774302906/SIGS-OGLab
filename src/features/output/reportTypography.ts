export const REPORT_FONT_PT_FLOORS = Object.freeze({
  source: 8,
  legend: 11,
  body: 10,
  title: 12,
});

export type ReportTextRole = keyof typeof REPORT_FONT_PT_FLOORS;
export type ReportOrientation = 'portrait' | 'landscape';

const A3_PHYSICAL_WIDTH_PT: Readonly<Record<ReportOrientation, number>> = Object.freeze({
  portrait: 841.89,
  landscape: 1190.55,
});

export function reportOrientationForSize(width: number, height: number): ReportOrientation {
  return width > height ? 'landscape' : 'portrait';
}

export function reportLogicalPixelsForPoints(orientation: ReportOrientation, logicalWidth: number, points: number, physicalWidthPt = A3_PHYSICAL_WIDTH_PT[orientation]) {
  return Math.ceil(points * logicalWidth / physicalWidthPt);
}

function inferredRole(requestedSize: number): ReportTextRole {
  if (requestedSize <= 16) return 'legend';
  if (requestedSize <= 24) return 'body';
  return 'title';
}

export function reportResolvedFontSize(
  orientation: ReportOrientation,
  logicalWidth: number,
  requestedSize: number,
  role?: ReportTextRole,
  physicalWidthPt?: number,
) {
  const resolvedRole = role ?? inferredRole(requestedSize);
  return Math.max(requestedSize, reportLogicalPixelsForPoints(orientation, logicalWidth, REPORT_FONT_PT_FLOORS[resolvedRole], physicalWidthPt));
}

export function reportCanvasLogicalSize(ctx: CanvasRenderingContext2D) {
  const transform = ctx.getTransform();
  const widthScale = Math.abs(transform.a) || 1;
  const heightScale = Math.abs(transform.d) || 1;
  return {
    width: ctx.canvas.width / widthScale,
    height: ctx.canvas.height / heightScale,
  };
}

export function reportCanvasResolvedFontSize(ctx: CanvasRenderingContext2D, requestedSize: number, role?: ReportTextRole, physicalWidthPt?: number) {
  const logical = reportCanvasLogicalSize(ctx);
  return reportResolvedFontSize(reportOrientationForSize(logical.width, logical.height), logical.width, requestedSize, role, physicalWidthPt);
}
