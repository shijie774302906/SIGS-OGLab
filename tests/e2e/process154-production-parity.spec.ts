import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from './fixtures/isolatedTest';

const evidenceEnabled = process.env.MILESTONE_EVIDENCE === '1';
const evidenceDirectory = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process154-production-parity');

const professionalRoutes = [
  ['project', 'document-project'],
  ['import', 'document-import'],
  ['check', 'document-check'],
  ['stratification', 'stratification-document'],
  ['parameters', 'document-parameters'],
  ['output', 'document-output'],
] as const;

async function createProfessionalProject(page: Page) {
  await page.getByTestId('new-project-name').fill(`Process154 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workbench-root')).toBeVisible();
}

async function openPersistedProfessionalRoute(page: Page, route: string) {
  await page.evaluate(async (nextRoute) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const manifest = structuredClone(loaded.manifest);
    const project = manifest.state.projects.find((candidate) => candidate.projectId === manifest.state.activeProjectId);
    if (!project) throw new Error('Active project missing.');
    project.activeRoute = nextRoute as typeof project.activeRoute;
    const saved = await database.saveWorkspaceV2(manifest, loaded.dataBlocks, {
      expectedManifestRevision: loaded.manifest.manifestRevision,
    });
    if (!saved.ok) throw new Error(saved.detail);
  }, route);
  await page.reload();
}

test('PROCESS154 six professional pages keep independent first-use guides and support replay', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    for (const route of ['project', 'import', 'check', 'stratification', 'parameters', 'output']) {
      window.localStorage.removeItem(`sigs-oglab:professional-guide:v1:${route}`);
    }
  });
  await createProfessionalProject(page);

  for (const [route, document] of professionalRoutes) {
    if (route !== 'project') await openPersistedProfessionalRoute(page, route);
    await expect(page.getByTestId(document)).toBeVisible();
    const guide = page.getByTestId(`professional-${route}-onboarding`);
    await expect(guide).toBeVisible();
    await expect(guide).toHaveAttribute('data-step', '1');
    await page.getByTestId('professional-onboarding-skip').click();
    await expect(guide).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), `sigs-oglab:professional-guide:v1:${route}`)).toContain('skip');
  }

  await page.getByTestId('explorer-project').click();
  await expect(page.getByTestId('professional-project-onboarding')).toHaveCount(0);
  await page.getByTestId('open-project-onboarding').click();
  await expect(page.getByTestId('professional-project-onboarding')).toBeVisible();
  await expect(page.getByTestId('professional-onboarding-card')).toHaveAttribute('data-target', 'explorer-project');
  await page.getByTestId('professional-onboarding-next').click();
  await expect(page.getByTestId('professional-onboarding-card')).toHaveAttribute('data-target', 'document-project');
  const layouts: Array<{ viewport: string; bodyOverflowX: boolean; cardInsideViewport: boolean }> = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('[data-testid="professional-onboarding-card"]');
      const rect = card?.getBoundingClientRect();
      return {
        bodyOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        cardInsideViewport: Boolean(rect && rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight),
      };
    });
    layouts.push({ viewport: `${viewport.width}x${viewport.height}`, ...layout });
    expect(layout.bodyOverflowX).toBe(false);
    expect(layout.cardInsideViewport).toBe(true);
    if (evidenceEnabled) {
      mkdirSync(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `professional-project-guide-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
  }
  expect(browserErrors).toEqual([]);
  if (evidenceEnabled) {
    writeFileSync(path.join(evidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 154,
      routes: professionalRoutes.map(([route]) => route),
      layouts,
      browserErrors,
      helpRoot: '/help/',
      standaloneAgentLab: false,
    }, null, 2), 'utf8');
  }
  await page.getByTestId('professional-onboarding-close').click();
});

test('PROCESS155 six professional pages keep internal identifiers out of the daily UI', async ({ page }) => {
  await createProfessionalProject(page);
  const forbidden = [
    /公式包\s*(?:ID|标识)?/i,
    /来源运行/,
    /运行\s*ID/i,
    /方案\s*ID/i,
    /修订\s*ID/i,
    /原始哈希|结果哈希|输入哈希|指纹/,
    /内容哈希|技术标识|公式安全边界/,
    /sourceRowId|schemeId|runId|revisionId|formulaSpecHash|astHash/i,
  ];
  const reviewed: Array<{ route: string; document: string }> = [];

  for (const [route, document] of professionalRoutes) {
    if (route !== 'project') await openPersistedProfessionalRoute(page, route);
    await expect(page.getByTestId(document)).toBeVisible();
    const guide = page.getByTestId(`professional-${route}-onboarding`);
    if (await guide.isVisible().catch(() => false)) await page.getByTestId('professional-onboarding-skip').click();
    const visibleText = await page.getByTestId('workbench-root').innerText();
    for (const pattern of forbidden) expect(visibleText).not.toMatch(pattern);
    reviewed.push({ route, document });
  }

  expect(reviewed).toHaveLength(6);
});

test('PROCESS154 professional assistant renders readable Markdown and drops raw HTML', async ({ page }) => {
  await page.unroute('**/api/assistant/capabilities');
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process154-markdown',
        instanceId: 'process154-markdown',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/2'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'message',
        model: 'deterministic-mock',
        content: [
          '## 当前结论',
          '',
          '- **qc** 曲线可读',
          '- `u2` 暂未使用',
          '',
          '| 项目 | 状态 |',
          '| --- | --- |',
          '| 分层 | 待确认 |',
          '',
          '[查看说明](https://example.com/help)',
          '',
          '<script>window.__unsafeMarkdown = true</script>',
        ].join('\n'),
      }),
    });
  });
  await page.reload();

  await createProfessionalProject(page);
  await page.getByTestId('right-panel-assistant-tab').click();
  await page.getByTestId('assistant-input').fill('说明当前状态');
  await page.getByTestId('assistant-send').click();

  const markdown = page.getByTestId('professional-ai-markdown');
  await expect(markdown.getByRole('heading', { name: '当前结论' })).toBeVisible();
  await expect(markdown.getByRole('table')).toBeVisible();
  await expect(markdown.getByRole('link', { name: '查看说明' })).toHaveAttribute('target', '_blank');
  await expect(markdown.locator('script')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as Window & { __unsafeMarkdown?: boolean }).__unsafeMarkdown)).toBeUndefined();
});

test('PROCESS154 mainland manual root and deep links are served from the same origin', async ({ page }) => {
  await page.goto('/help/');
  await expect(page.locator('html')).toHaveAttribute('lang', /zh|en/);
  await expect(page.locator('body')).not.toBeEmpty();
  expect(new URL(page.url()).pathname).toBe('/help/');

  await page.goto('/help/professional/import.html');
  await expect(page.locator('body')).not.toBeEmpty();
  expect(new URL(page.url()).pathname).toBe('/help/professional/import.html');
  await expect(page.locator('a[href*="github.io"]')).toHaveCount(0);
});
