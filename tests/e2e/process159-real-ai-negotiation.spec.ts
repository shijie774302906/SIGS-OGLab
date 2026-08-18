import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { resetWorkspaceAuthority } from './fixtures/isolatedTest';

const workbookPath = process.env.PROCESS159_PRIVATE_WORKBOOK ?? '';
const assistantBaseUrl = (process.env.PROCESS159_ASSISTANT_BASE_URL ?? '').replace(/\/$/, '');
const liveEnabled = process.env.PROCESS159_REAL_AI === '1'
  && Boolean(workbookPath)
  && existsSync(workbookPath)
  && Boolean(assistantBaseUrl);

test.describe('PROCESS159 real DeepSeek negotiation', () => {
  test.skip(!liveEnabled, 'Requires an explicitly supplied local-only workbook and live DeepSeek access.');

  test('discovers the user-selected sheet without injected row, column, unit, or proposal answers', async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await page.route('**/api/assistant/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname.replace(/^\/api\/assistant/, '');
      const target = `${assistantBaseUrl}${pathname}`;
      const headers = await request.allHeaders();
      delete headers.host;
      headers.origin = new URL(assistantBaseUrl).origin;
      const response = await route.fetch({ url: target, headers });
      await route.fulfill({ response });
    });
    await resetWorkspaceAuthority(page);
    const trace: Array<{ kind: string; tools: string[]; elapsedMs: number }> = [];
    const startedRequests = new Map<string, number>();
    page.on('request', (request) => {
      if (request.url().endsWith('/api/assistant/turn')) startedRequests.set(request.url(), Date.now());
    });
    page.on('response', async (response) => {
      if (!response.url().endsWith('/api/assistant/turn')) return;
      const payload = await response.json().catch(() => null) as null | {
        kind?: string;
        calls?: Array<{ name?: string }>;
      };
      trace.push({
        kind: payload?.kind ?? `http-${response.status()}`,
        tools: payload?.calls?.map((call) => call.name ?? 'unknown') ?? [],
        elapsedMs: Date.now() - (startedRequests.get(response.url()) ?? Date.now()),
      });
    });

    await page.getByTestId('new-project-name').fill('本地真实 AI 自主识别');
    await page.getByTestId('project-mode-quick').click();
    await page.getByTestId('create-project-submit').click();
    await page.getByTestId('quick-ai-toggle').click();
    const assistant = page.getByTestId('quick-ai-assistant');
    await assistant.locator('input[type="file"]').setInputFiles(workbookPath);
    const sheetSelection = page.getByTestId('quick-ai-sheet-selection');
    await expect(sheetSelection).toBeVisible();
    await sheetSelection.locator('select').selectOption('Raw Data');
    const consent = page.getByTestId('quick-ai-consent');
    await expect(consent).toBeVisible({ timeout: 15_000 });
    await consent.getByRole('button', { name: '同意发送' }).click();
    await expect(page.getByTestId('quick-ai-start')).toBeEnabled({ timeout: 15_000 });
    await page.getByTestId('quick-ai-start').click();

    for (let round = 0; round < 6; round += 1) {
      const outcome = await Promise.race([
        page.getByTestId('quick-ai-proposal').waitFor({ state: 'visible', timeout: 120_000 }).then(() => 'proposal' as const),
        page.getByTestId('quick-ai-clarification').waitFor({ state: 'visible', timeout: 120_000 }).then(() => 'clarification' as const),
        page.getByTestId('quick-ai-error').waitFor({ state: 'visible', timeout: 120_000 }).then(() => 'error' as const),
      ]);
      if (outcome === 'proposal') break;
      if (outcome === 'error') {
        throw new Error(`Live model did not finish: ${await page.getByTestId('quick-ai-error').innerText()}`);
      }
      const clarification = page.getByTestId('quick-ai-clarification');
      await clarification.locator('textarea').fill('请继续根据文件中的表头、单位和数值变化选择最合理的完整数据范围；无法可靠识别的可选字段可以不导入。');
      await clarification.getByRole('button', { name: '发送回答' }).click();
    }

    await expect(page.getByTestId('quick-ai-proposal')).toBeVisible();
    await expect(page.getByTestId('quick-ai-error')).toHaveCount(0);
    expect(trace.some((entry) => entry.tools.includes('read_quick_plot_source'))).toBe(true);
    expect(trace.at(-1)?.tools).toContain('submit_quick_plot_import_decision');
    console.info(JSON.stringify({
      process: 159,
      liveModel: true,
      requestCount: trace.length,
      trace,
      injectedStructureAnswers: false,
      userSelectedSheetBeforeAi: true,
      rawWorkbookArchived: false,
    }));
  });
});
