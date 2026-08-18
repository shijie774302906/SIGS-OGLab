import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures/isolatedTest';

test('PROCESS160 professional output renders A4 and A3 pages with readable wrapped legends', async ({ page }) => {
  const rendering = await page.evaluate(async () => {
    const output = await import('/src/features/output/jtsOutputDomain.ts');
    const measuredRows = Array.from({ length: 121 }, (_, index) => {
      const depthM = index * 0.25;
      return {
        sourceRowId: `row-${index + 1}`,
        depthM,
        qcKpa: 900 + depthM * 155 + Math.sin(depthM * 1.7) * 350,
        fsKpa: 18 + depthM * 2.8 + Math.cos(depthM * 1.2) * 12,
        u2Kpa: 35 + depthM * 11 + Math.sin(depthM * 0.8) * 45,
      };
    });
    const layers = [
      { layerId: 'layer-1', name: '黏土层 1', depthFromM: 0, depthToM: 5, engineeringSoilGroup: 'clay' },
      { layerId: 'layer-2', name: '粉土—砂土过渡层（需要完整显示的长名称）2', depthFromM: 5, depthToM: 11, engineeringSoilGroup: 'mixed' },
      { layerId: 'layer-3', name: '砂土层 3', depthFromM: 11, depthToM: 22, engineeringSoilGroup: 'sand' },
      { layerId: 'layer-4', name: '黏性土层 4', depthFromM: 22, depthToM: 30, engineeringSoilGroup: 'clay' },
    ];
    const layerForDepth = (depthM: number) => layers.find((layer) => depthM >= layer.depthFromM && depthM <= layer.depthToM) ?? layers.at(-1)!;
    const snapshot = {
      projectId: 'process146-project',
      projectName: '字体可读性验收项目',
      pointId: 'process146-point',
      pointName: 'DEMO-CPTU-01',
      generatedAt: '2026-08-04T00:00:00.000Z',
      classificationMethod: {
        methodId: 'jts-t242-2020' as const,
        label: 'JTS/T 242—2020 九分区 SBT',
        version: 'v1',
        mappingVersion: 'v1',
        reference: 'JTS/T 242—2020《水运工程静力触探技术规程》',
      },
      reportSource: { schemeId: 'scheme-1', schemeName: '工程师确认方案 1', stratificationRevisionId: 'stratification-1' },
      authority: {
        checkRunId: 'check-1', classificationRunId: 'classification-1', classificationResultHash: 'classification-hash',
        stratificationRevisionId: 'stratification-1', parameterPackageRunId: 'parameter-1', parameterPackageResultHash: 'parameter-hash',
        dissipationResultRevisionId: null,
      },
      measuredRows,
      classificationRows: measuredRows.map((row) => {
        const layer = layerForDepth(row.depthM);
        const soilClassId = layer.engineeringSoilGroup === 'sand' ? 'medium_coarse_sand' : layer.engineeringSoilGroup === 'clay' ? 'clay' : 'silt';
        return {
          sourceRowId: row.sourceRowId,
          depthM: row.depthM,
          qtn: 20 + row.depthM * 1.5,
          ic: layer.engineeringSoilGroup === 'sand' ? 1.75 : layer.engineeringSoilGroup === 'clay' ? 3.1 : 2.55,
          soilClassId,
          label: layer.engineeringSoilGroup === 'sand' ? '中砂—粗砂' : layer.engineeringSoilGroup === 'clay' ? '黏土' : '粉土',
          approximate: false,
        };
      }),
      layers,
      parameterRows: measuredRows.map((row) => ({
        sourceRowId: row.sourceRowId,
        depthM: row.depthM,
        layerId: layerForDepth(row.depthM).layerId,
        methodId: 'unit-weight',
        label: '饱和重度',
        symbol: 'γsat',
        unit: 'kN/m³',
        status: 'value' as const,
        value: 16 + row.depthM * 0.12,
        reason: '演示值',
        notices: [],
        ignoreKind: null,
      })),
      parameterValues: layers.map((layer, index) => ({
        layerId: layer.layerId, methodId: 'unit-weight', symbol: 'γsat', unit: 'kN/m³', count: 30,
        median: 17 + index, minimum: 16.5 + index, maximum: 17.5 + index,
      })),
      dissipation: null,
      formulaReferences: [{ methodId: 'unit-weight', symbol: 'γsat', formula: 'γsat = f(qt, Rf)', reference: 'JTS/T 242—2020' }],
      notices: ['系统生成演示数据，仅用于字体和布局验收。'],
    };

    const fontSizes: number[] = [];
    const drawnTexts: string[] = [];
    const prototype = CanvasRenderingContext2D.prototype;
    const originalFillText = prototype.fillText;
    prototype.fillText = function capture(value: string, x: number, y: number, maxWidth?: number) {
      const size = Number(/([0-9.]+)px/.exec(this.font)?.[1]);
      if (Number.isFinite(size)) fontSizes.push(size);
      drawnTexts.push(value);
      if (maxWidth === undefined) return originalFillText.call(this, value, x, y);
      return originalFillText.call(this, value, x, y, maxWidth);
    };
    try {
      const a4 = output.renderJtsOutputPreviewDataUrls(snapshot, 'a4-report-pdf');
      const a4FontSizes = [...fontSizes];
      const a4DrawnText = drawnTexts.join('');
      fontSizes.length = 0;
      drawnTexts.length = 0;
      const a3 = output.renderJtsOutputPreviewDataUrls(snapshot, 'a3-atlas-pdf');
      return {
        a4,
        a3,
        a4MinimumFontPx: Math.min(...a4FontSizes),
        a3MinimumFontPx: Math.min(...fontSizes),
        a4DrawnText,
        a3DrawnText: drawnTexts.join(''),
      };
    } finally {
      prototype.fillText = originalFillText;
    }
  });

  expect(rendering.a4.length).toBeGreaterThanOrEqual(3);
  expect(rendering.a3.length).toBeGreaterThanOrEqual(5);
  expect(rendering.a4MinimumFontPx).toBeGreaterThanOrEqual(19);
  expect(rendering.a3MinimumFontPx).toBeGreaterThanOrEqual(17);
  const longLayerName = '粉土—砂土过渡层（需要完整显示的长名称）2';
  expect(rendering.a4DrawnText).toContain(longLayerName);
  expect(rendering.a3DrawnText).toContain(longLayerName);
  expect(rendering.a4DrawnText).not.toContain('粉土—砂土过渡层（需要完整显示的长名称…');
  expect(rendering.a3DrawnText).not.toContain('粉土—砂土过渡层（需要完整显示的长名称…');

  if (process.env.PROCESS160_EVIDENCE === '1') {
    const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process160-report-layout');
    mkdirSync(evidenceDirectory, { recursive: true });
    const saveDataUrl = (name: string, dataUrl: string) => writeFileSync(
      path.join(evidenceDirectory, name),
      Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'),
    );
    rendering.a4.forEach((dataUrl, index) => saveDataUrl(`professional-a4-page-${String(index + 1).padStart(2, '0')}.png`, dataUrl));
    rendering.a3.forEach((dataUrl, index) => saveDataUrl(`professional-a3-page-${String(index + 1).padStart(2, '0')}.png`, dataUrl));
    writeFileSync(path.join(evidenceDirectory, 'professional-font-check.json'), JSON.stringify({
      a4Pages: rendering.a4.length,
      a3Pages: rendering.a3.length,
      a4MinimumFontPx: rendering.a4MinimumFontPx,
      a3MinimumFontPx: rendering.a3MinimumFontPx,
      physicalFloorsPt: { source: 8, legend: 11, body: 10, title: 12 },
    }, null, 2));
  }
});
