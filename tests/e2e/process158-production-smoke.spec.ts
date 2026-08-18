import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const siteLabel = process.env.PRODUCTION_SITE_LABEL ?? 'production';
const expectedCommit = process.env.RELEASE_EXPECTED_COMMIT ?? '';
const viewport = {
  width: Number(process.env.PRODUCTION_VIEWPORT_WIDTH ?? 1440),
  height: Number(process.env.PRODUCTION_VIEWPORT_HEIGHT ?? 900),
};
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process158-dual-production-deployment');

async function pasteGrid(page: import('@playwright/test').Page, text: string) {
  await page.getByTestId('quick-paste-grid').evaluate((element, value) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', value);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, text);
}

test('PROCESS158 production site exposes the release and completes the partial quick workflow', async ({ page, request }) => {
  test.setTimeout(90_000);
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  await page.setViewportSize(viewport);

  const releaseResponse = await request.get(`/release-manifest.json?probe=${Date.now()}`);
  expect(releaseResponse.ok()).toBe(true);
  const release = await releaseResponse.json();
  expect(release.process).toBe('Process158');
  if (expectedCommit) expect(release.source.commit).toBe(expectedCommit);
  expect(release.capabilities.standaloneAgentLab).toBe(false);

  const capabilityResponse = await request.get(`/api/assistant/capabilities?probe=${Date.now()}`);
  expect(capabilityResponse.ok()).toBe(true);
  const capabilities = await capabilityResponse.json();
  expect(capabilities.protocolVersions).toContain('sigs.ai-import/2');

  const visitsResponse = await request.get(`/api/visits?probe=${Date.now()}`);
  expect(visitsResponse.ok()).toBe(true);
  expect((await visitsResponse.json()).status).toBe('ready');

  await page.goto('/');
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    await Promise.all(databases.flatMap((database) => database.name ? [new Promise<void>((resolve) => {
      const deletion = indexedDB.deleteDatabase(database.name!);
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => resolve();
      deletion.onblocked = () => resolve();
    })] : []));
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('sigs-oglab:project-hub-guide:v1', JSON.stringify({ version: 1, method: 'complete', dismissedAt: new Date().toISOString(), source: 'production-smoke' }));
    for (const key of ['sigs-oglab:quick-input-guide:v1', 'sigs-oglab:quick-report-guide:v1']) {
      localStorage.setItem(key, JSON.stringify({ version: 1, method: 'complete', dismissedAt: new Date().toISOString(), source: 'production-smoke' }));
    }
  });
  await page.reload();

  await page.getByTestId('new-project-name').fill(`Process158 ${siteLabel}`);
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await pasteGrid(page, '深度\tqc\tfs\n1\t2.0\t20\n2\t2.2\t\n3\t2.4\t24');
  const fsAtTwoMetres = page.getByLabel('fs 2 m');
  await expect(fsAtTwoMetres).toHaveValue('');
  await fsAtTwoMetres.fill('');
  await fsAtTwoMetres.blur();
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });

  const layout = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    viewport: { width: innerWidth, height: innerHeight },
  }));
  expect(layout.overflowX).toBe(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('quick-export-excel').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  expect(await download.failure()).toBeNull();
  expect(browserErrors).toEqual([]);

  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(evidenceDirectory, { recursive: true });
    const stem = `${siteLabel}-${viewport.width}x${viewport.height}`;
    await page.screenshot({ path: path.join(evidenceDirectory, `${stem}.png`), fullPage: true });
    writeFileSync(path.join(evidenceDirectory, `${stem}.json`), JSON.stringify({
      siteLabel,
      process: release.process,
      commit: release.source.commit,
      protocols: capabilities.protocolVersions,
      optionalFsBlankPreserved: true,
      reportGenerated: true,
      excelDownloaded: true,
      layout,
      browserErrors,
    }, null, 2));
  }
});
