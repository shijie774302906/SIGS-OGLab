import { expect, test } from '@playwright/test';
import {
  REPORT_FONT_PT_FLOORS,
  reportLogicalPixelsForPoints,
  reportResolvedFontSize,
} from '../../src/features/output/reportTypography';
import {
  QUICK_REPORT_FONT_PT_FLOORS,
  quickReportLogicalPixelsForPoints,
  quickReportResolvedFontSize,
} from '../../src/features/quick/quickPlotDomain';

test('PROCESS160 report typography keeps one physical point-size contract across quick and professional pages', () => {
  expect(REPORT_FONT_PT_FLOORS).toEqual({ source: 8, legend: 11, body: 10, title: 12 });
  expect(QUICK_REPORT_FONT_PT_FLOORS).toEqual(REPORT_FONT_PT_FLOORS);

  expect({
    portraitLegend: quickReportLogicalPixelsForPoints('portrait', 11),
    portraitBody: quickReportLogicalPixelsForPoints('portrait', 10),
    portraitTitle: quickReportLogicalPixelsForPoints('portrait', 12),
    landscapeLegend: quickReportLogicalPixelsForPoints('landscape', 11),
    landscapeBody: quickReportLogicalPixelsForPoints('landscape', 10),
    landscapeTitle: quickReportLogicalPixelsForPoints('landscape', 12),
  }).toEqual({
    portraitLegend: 15,
    portraitBody: 13,
    portraitTitle: 16,
    landscapeLegend: 18,
    landscapeBody: 17,
    landscapeTitle: 20,
  });

  expect(quickReportResolvedFontSize('portrait', 6, 'legend')).toBe(15);
  expect(quickReportResolvedFontSize('landscape', 6, 'body')).toBe(17);
  expect(quickReportResolvedFontSize('landscape', 8, 'title')).toBe(20);

  expect({
    a4Legend: reportLogicalPixelsForPoints('portrait', 1400, 11, 595.28),
    a4Body: reportLogicalPixelsForPoints('portrait', 1400, 10, 595.28),
    a4Title: reportLogicalPixelsForPoints('portrait', 1400, 12, 595.28),
    a3Legend: reportLogicalPixelsForPoints('landscape', 2400, 11, 1190.55),
    a3Body: reportLogicalPixelsForPoints('landscape', 2400, 10, 1190.55),
    a3Title: reportLogicalPixelsForPoints('landscape', 2400, 12, 1190.55),
  }).toEqual({
    a4Legend: 26,
    a4Body: 24,
    a4Title: 29,
    a3Legend: 23,
    a3Body: 21,
    a3Title: 25,
  });

  expect(reportResolvedFontSize('portrait', 1400, 6, 'legend', 595.28)).toBe(26);
  expect(reportResolvedFontSize('landscape', 2400, 6, 'body', 1190.55)).toBe(21);
});
