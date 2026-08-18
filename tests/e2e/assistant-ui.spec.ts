import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test, type Page, type TestInfo } from './fixtures/isolatedTest';
import { confirmPendingStratificationLayers } from './stratification-guide-helpers';

const process127EvidenceEnabled = process.env.PROCESS127_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';
const process127EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process127-assistant-connection');
const process140EvidenceDirectory = join(process.cwd(), 'process_logs', 'playwright-mcp', 'process140-public-quota-demo');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('PROCESS140 public quota shows remaining calls and disables public input when exhausted', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  let publicTurns = 0;
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-public-quota',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        requiresApiKey: false,
        publicAccess: true,
        publicQuota: { status: 'available', limit: 100, used: 99, remaining: 1, resetAt: '2026-08-01T16:00:00.000Z' },
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    publicTurns += 1;
    expect(route.request().headers()['x-deepseek-api-key']).toBeUndefined();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'message',
        model: 'deepseek-v4-pro',
        content: '当前项目尚未导入数据。',
        serviceInstanceId: 'playwright-public-quota',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        publicQuota: { status: 'exhausted', limit: 100, used: 100, remaining: 0, resetAt: '2026-08-01T16:00:00.000Z' },
      }),
    });
  });
  await page.getByTestId('new-project-name').fill(`公共额度 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await expect(page.getByTestId('assistant-public-quota')).toHaveText('今日剩余 1 次');
  await page.getByRole('button', { name: '同意上述发送范围并启用' }).click();
  await page.getByTestId('assistant-input').fill('当前状态？');
  await page.getByTestId('assistant-send').click();
  await expect(page.getByTestId('assistant-messages')).toContainText('当前项目尚未导入数据');
  await expect(page.getByTestId('assistant-public-quota')).toContainText('今日公共 AI 额度已用完');
  await expect(page.getByTestId('assistant-input')).toBeDisabled();
  await expect(page.getByTestId('assistant-provider-status').getByRole('button', { name: '使用自己的 Key' })).toBeVisible();
  expect(publicTurns).toBe(1);
  expect(browserErrors).toEqual([]);
  if (process.env.MILESTONE_EVIDENCE === '1') {
    mkdirSync(process140EvidenceDirectory, { recursive: true });
    await page.screenshot({ path: join(process140EvidenceDirectory, 'public-quota-exhausted-1440x900.png'), fullPage: true });
    writeFileSync(join(process140EvidenceDirectory, 'assistant-check.json'), JSON.stringify({
      viewport: await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      documentOverflowX: await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)),
      publicTurns,
      browserErrors,
    }, null, 2));
  }
});

test('professional assistant reads automatically, previews edits, cancels, then confirms once', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  const assistantMetrics = await installMockAssistant(page);
  await prepareManualStratification(page, testInfo);

  const before = await readCurrentLayerGroup(page);
  await openAssistant(page);
  await expect(page.getByTestId('assistant-provider-status')).toContainText('测试模型 · 已连接');
  await expect(page.getByTestId('assistant-outbound-consent')).toHaveCount(0);

  await page.getByRole('button', { name: '现在做到哪一步？' }).click();
  await expect(page.getByTestId('assistant-messages')).toContainText('已读取当前工作流摘要。');
  await expect(page.getByTestId('assistant-messages')).toContainText('当前是“地层分层”');

  await page.getByTestId('assistant-input').fill('把当前层改成砂土');
  await page.getByTestId('assistant-send').click();
  await expect(page.getByTestId('assistant-proposal')).toContainText('调整为砂土');
  await expect(page.getByTestId('assistant-proposal')).toContainText('未提交分层：将更新工作草稿');
  await expect(page.getByTestId('assistant-confirm-proposal')).toHaveText('更新工作草稿');
  expect(await readCurrentLayerGroup(page)).toBe(before);
  if (process127EvidenceEnabled) {
    mkdirSync(process127EvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-proposal-1440x900.png'),
      fullPage: true,
    });
  }

  await page.getByTestId('assistant-cancel-proposal').click();
  await expect(page.getByTestId('assistant-proposal')).toHaveCount(0);
  await expect(page.getByTestId('assistant-messages')).toContainText('已取消，没有修改项目');
  expect(await readCurrentLayerGroup(page)).toBe(before);

  await page.getByTestId('assistant-input').fill('把当前层改成砂土');
  await page.getByTestId('assistant-send').click();
  await expect(page.getByTestId('assistant-proposal')).toBeVisible();
  await page.getByTestId('assistant-confirm-proposal').click();
  await expect(page.getByTestId('assistant-proposal')).toHaveCount(0);
  await expect(page.getByTestId('assistant-messages')).toContainText('已应用到当前分层工作草稿');
  await expect.poll(() => readCurrentLayerGroup(page)).toBe('sand');
  expect(browserErrors).toEqual([]);
  if (process127EvidenceEnabled) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-applied-1920x1080.png'),
      fullPage: true,
    });
    const layout = await page.evaluate(() => {
      const rightPanel = document.querySelector<HTMLElement>('[data-testid="right-panel"]');
      const assistant = document.querySelector<HTMLElement>('[data-testid="professional-assistant-panel"]');
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        rightPanelInsideViewport: rightPanel
          ? rightPanel.getBoundingClientRect().right <= window.innerWidth + 1
          : false,
        assistantOverflowX: assistant
          ? Math.max(0, assistant.scrollWidth - assistant.clientWidth)
          : null,
      };
    });
    writeFileSync(join(process127EvidenceDirectory, 'browser-check.json'), JSON.stringify({
      process: 'Process127',
      route: 'stratification',
      provider: 'deterministic-mock',
      beforeEngineeringSoilGroup: before,
      unconfirmedWriteCount: 0,
      afterEngineeringSoilGroup: await readCurrentLayerGroup(page),
      toolCalls: assistantMetrics,
      consoleAndPageErrors: browserErrors,
      layout,
    }, null, 2), 'utf8');
  }
});

test('DeepSeek mode requires one-session outbound-data consent before sending', async ({ page }) => {
  const apiKey = 'sk-ui-connect-12345678901234567890';
  let connectBody: string | null = 'not-called';
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'deepseek',
        model: 'deepseek-chat',
        requiresApiKey: true,
      }),
    });
  });
  await page.route('**/api/assistant/connect', async (route) => {
    connectBody = route.request().postData();
    expect(route.request().headers()['x-deepseek-api-key']).toBe(apiKey);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: true, provider: 'deepseek', model: 'deepseek-chat' }),
    });
  });
  await page.getByTestId('new-project-name').fill(`DeepSeek consent ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await expect(page.getByTestId('assistant-connect-card')).toContainText('目前仅支持 DeepSeek');
  await expect(page.getByTestId('assistant-input')).toBeDisabled();
  await page.getByTestId('assistant-open-key-dialog').click();
  await expect(page.getByTestId('assistant-key-dialog')).toContainText('仅本次打开有效');
  if (process127EvidenceEnabled) {
    mkdirSync(process127EvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-connect-dialog-1440x900.png'),
      fullPage: true,
    });
  }
  await page.getByTestId('assistant-api-key-input').fill(apiKey);
  await page.getByTestId('assistant-connect-submit').click();
  await expect(page.getByTestId('assistant-key-dialog')).toHaveCount(0);
  expect(connectBody).toBeNull();
  expect(await page.evaluate((secret) =>
    localStorage.getItem('assistant-api-key') === secret
    || sessionStorage.getItem('assistant-api-key') === secret
    || document.body.textContent?.includes(secret) === true, apiKey)).toBe(false);
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key待启用');
  await expect(page.getByTestId('assistant-outbound-consent')).toContainText('不会发送上传文件或整孔数据');
  await expect(page.getByTestId('assistant-input')).toBeDisabled();
  await page.getByRole('button', { name: '同意上述发送范围并启用' }).click();
  await expect(page.getByTestId('assistant-outbound-consent')).toHaveCount(0);
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key');
  await expect(page.getByTestId('assistant-input')).toBeEnabled();
  if (process127EvidenceEnabled) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-connected-1920x1080.png'),
      fullPage: true,
    });
    const connectionCheck = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[data-testid="assistant-key-dialog"]');
      const panel = document.querySelector<HTMLElement>('[data-testid="professional-assistant-panel"]');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        assistantOverflowX: panel ? Math.max(0, panel.scrollWidth - panel.clientWidth) : null,
        keyDialogPresentAfterConnect: Boolean(dialog),
        persistedKeyMarkers: {
          localStorage: Object.keys(localStorage).filter((key) => /assistant|deepseek|api.?key/i.test(key)),
          sessionStorage: Object.keys(sessionStorage).filter((key) => /assistant|deepseek|api.?key/i.test(key)),
        },
      };
    });
    writeFileSync(
      join(process127EvidenceDirectory, 'connection-browser-check.json'),
      JSON.stringify(connectionCheck, null, 2),
      'utf8',
    );
  }
  await page.getByTestId('sidebar-create-analysis').click();
  await page.getByTestId('new-project-name').fill(`DeepSeek second scope ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key待启用');
  await expect(page.getByTestId('assistant-outbound-consent')).toBeVisible();
  await expect(page.getByTestId('assistant-input')).toBeDisabled();
  if (process127EvidenceEnabled) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-second-scope-consent-1440x900.png'),
      fullPage: true,
    });
  }
});

test('DeepSeek key stays in tab memory, survives dock switches, and clears on disconnect or reload', async ({ page }) => {
  const validKey = 'sk-memory-test-12345678901234567890';
  const rejectedKey = 'sk-rejected-test-12345678901234567';
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'deepseek',
        model: 'deepseek-chat',
        requiresApiKey: true,
      }),
    });
  });
  await page.route('**/api/assistant/connect', async (route) => {
    const key = route.request().headers()['x-deepseek-api-key'];
    await route.fulfill({
      status: key === validKey ? 200 : 401,
      contentType: 'application/json',
      body: key === validKey
        ? JSON.stringify({ connected: true, provider: 'deepseek', model: 'deepseek-chat' })
        : JSON.stringify({ problem: `上游错误包含 ${rejectedKey}` }),
    });
  });
  await page.getByTestId('new-project-name').fill(`连接生命周期 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await page.getByTestId('assistant-open-key-dialog').click();
  await page.getByTestId('assistant-api-key-input').fill(validKey);
  await page.getByTestId('assistant-connect-submit').click();
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key待启用');

  await page.getByTestId('right-panel-tools-tab').click();
  await page.getByTestId('right-panel-assistant-tab').click();
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key待启用');

  await page.getByTestId('assistant-provider-status').getByRole('button', { name: '更换密钥' }).click();
  await expect(page.getByTestId('assistant-key-dialog')).toContainText('失败或取消仍使用原连接');
  await page.getByTestId('assistant-api-key-input').fill(rejectedKey);
  await page.getByTestId('assistant-connect-submit').click();
  await expect(page.getByTestId('assistant-key-problem')).toContainText('上游错误包含 [已隐藏]');
  await expect(page.getByTestId('assistant-key-problem')).not.toContainText(rejectedKey);
  if (process127EvidenceEnabled) {
    mkdirSync(process127EvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-replace-failed-1440x900.png'),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: '关闭连接窗口' }).click();
  await expect(page.getByTestId('assistant-provider-status')).toContainText('DeepSeek · 自己的 Key待启用');

  await page.getByTestId('assistant-provider-status').getByRole('button', { name: '断开' }).click();
  await expect(page.getByTestId('assistant-connect-card')).toBeVisible();
  await page.reload();
  await openAssistant(page);
  await expect(page.getByTestId('assistant-connect-card')).toContainText('API Key 仅本次打开有效');
  expect(await browserStorageContainsSecret(page, [validKey, rejectedKey])).toBe(false);
});

test('cancelling a slow key validation does not reconnect from a late response', async ({ page }) => {
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'deepseek',
        model: 'deepseek-chat',
        requiresApiKey: true,
      }),
    });
  });
  await page.route('**/api/assistant/connect', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connected: true, provider: 'deepseek', model: 'deepseek-chat' }),
    });
  });
  await page.getByTestId('new-project-name').fill(`取消连接 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await page.getByTestId('assistant-open-key-dialog').click();
  await page.getByTestId('assistant-api-key-input').fill('sk-cancel-test-12345678901234567890');
  await page.getByTestId('assistant-connect-submit').click();
  await expect(page.getByTestId('assistant-connect-submit')).toContainText('正在验证');
  await page.getByRole('button', { name: '取消验证' }).click();
  await expect(page.getByTestId('assistant-key-dialog')).toHaveCount(0);
  await page.waitForTimeout(550);
  await expect(page.getByTestId('assistant-connect-card')).toBeVisible();
  await expect(page.getByTestId('assistant-provider-status')).not.toContainText('已连接');
});

test('provider failure leaves project unchanged and can recover through retry', async ({ page }) => {
  let failedOnce = false;
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as { turns: Array<{ role: string }> };
    if (!failedOnce) {
      failedOnce = true;
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ problem: '请求较多，请稍后重试；没有执行任何修改。' }),
      });
      return;
    }
    if (body.turns.at(-1)?.role === 'tool') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'message',
          model: 'deterministic-mock',
          content: '已恢复连接。当前仍在项目/点位数据。',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        content: null,
        calls: [{ id: 'retry-summary', name: 'read_workflow_summary', arguments: '{}' }],
      }),
    });
  });
  await page.getByTestId('new-project-name').fill(`助手恢复 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await page.getByRole('button', { name: '现在做到哪一步？' }).click();
  await expect(page.getByTestId('assistant-error')).toContainText('请求较多');
  await expect(page.getByTestId('assistant-proposal')).toHaveCount(0);
  await page.getByTestId('assistant-error').getByRole('button', { name: '重试' }).click();
  await expect(page.getByTestId('assistant-messages')).toContainText('已恢复连接');
  await expect(page.getByTestId('assistant-error')).toHaveCount(0);
});

test('user cancellation is a neutral stopped state rather than an error', async ({ page }) => {
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kind: 'message', model: 'deterministic-mock', content: '不应显示的迟到回答' }),
    });
  });
  await page.getByTestId('new-project-name').fill(`取消回答 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await page.getByRole('button', { name: '现在做到哪一步？' }).click();
  await expect(page.getByTestId('assistant-running')).toBeVisible();
  await page.getByTestId('assistant-cancel-request').click();
  await expect(page.getByTestId('assistant-messages')).toContainText('已停止本轮回答，项目未发生修改');
  await expect(page.getByTestId('assistant-error')).toHaveCount(0);
  await expect(page.getByTestId('assistant-input')).toBeEnabled();
});

test('route changes cancel late answers and do not resend the old conversation', async ({ page }) => {
  const requests: Array<{ route: string; userTexts: string[] }> = [];
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string; content?: string }>;
      context: { scope: { route: string } };
    };
    requests.push({
      route: body.context.scope.route,
      userTexts: body.turns.filter((turn) => turn.role === 'user').map((turn) => turn.content ?? ''),
    });
    if (body.context.scope.route === 'project' && body.turns.some((turn) => turn.content === '现在做到哪一步？')) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kind: 'message', model: 'deterministic-mock', content: '旧页面迟到回答' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kind: 'message', model: 'deterministic-mock', content: '这是重新打开后的新回答。' }),
    });
  });
  await page.getByTestId('new-project-name').fill(`上下文隔离 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await page.getByRole('button', { name: '现在做到哪一步？' }).click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('right-panel-assistant-tab')).toHaveCount(0);
  await expect(page.getByTestId('assistant-messages')).toHaveCount(0);
  await page.waitForTimeout(450);
  await expect(page.getByText('旧页面迟到回答')).toHaveCount(0);
  await page.getByTestId('explorer-project').click();
  await openAssistant(page);
  await page.getByTestId('assistant-input').fill('重新打开后现在做什么？');
  await page.getByTestId('assistant-send').click();
  await expect(page.getByTestId('assistant-messages')).toContainText('这是重新打开后的新回答');
  expect(requests.at(-1)).toEqual({ route: 'project', userTexts: ['重新打开后现在做什么？'] });
});

test('confirmed stratification proposal explains and creates only a working draft', async ({ page }, testInfo) => {
  await installMockAssistant(page);
  await prepareManualStratification(page, testInfo);
  await confirmPendingStratificationLayers(page, '粉砂');
  await page.getByTestId('stratification-save').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await page.getByTestId('stratification-guide-generate-revision').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toHaveCount(0);
  await page.getByTestId('stratification-layer-row-1').click();
  const before = await readStratificationAuthority(page);
  await openAssistant(page);
  await page.getByTestId('assistant-input').fill('把当前层改成黏土');
  await page.getByTestId('assistant-send').click();
  const proposal = page.getByTestId('assistant-proposal');
  await expect(proposal).toContainText('已确认分层：将创建工作草稿');
  await expect(proposal).toContainText('旧确认修订和原始测量不变');
  await expect(page.getByTestId('assistant-confirm-proposal')).toHaveText('创建工作草稿并应用');
  if (process127EvidenceEnabled) {
    mkdirSync(process127EvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: join(process127EvidenceDirectory, 'assistant-confirmed-upstream-1440x900.png'),
      fullPage: true,
    });
  }
  await page.getByTestId('assistant-confirm-proposal').click();
  await expect.poll(() => readStratificationAuthority(page)).toMatchObject({
    currentGroup: before.currentGroup,
    workingGroup: 'clay',
    revisionCount: before.revisionCount,
  });

  await page.getByTestId('assistant-input').fill('把当前层改成砂土');
  await page.getByTestId('assistant-send').click();
  await expect(proposal).toContainText('已确认分层：将更新工作草稿');
  await expect(page.getByTestId('assistant-confirm-proposal')).toHaveText('更新工作草稿');
  await page.getByTestId('assistant-confirm-proposal').click();
  await expect.poll(() => readStratificationAuthority(page)).toMatchObject({
    currentGroup: before.currentGroup,
    workingGroup: 'sand',
    revisionCount: before.revisionCount,
  });
});

test('unavailable assistant can be detected again after the local service starts', async ({ page }) => {
  let serviceAvailable = false;
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(!serviceAvailable ? {
        serviceAvailable: false,
        provider: 'deepseek',
        model: null,
        requiresApiKey: true,
        reason: '本机 AI 服务尚未启动。',
      } : {
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.getByTestId('new-project-name').fill(`助手重连 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await openAssistant(page);
  await expect(page.getByTestId('assistant-disconnected')).toContainText('重新检测');
  await expect(page.getByTestId('professional-assistant-panel').getByText('AI 服务暂不可用', { exact: true })).toHaveCount(1);
  await expect(page.getByTestId('assistant-disconnected')).toContainText('本机 AI 服务尚未启动');
  serviceAvailable = true;
  await page.getByTestId('assistant-disconnected').getByRole('button', { name: '重新检测' }).click();
  await expect(page.getByTestId('assistant-provider-status')).toContainText('测试模型 · 已连接');
  await expect(page.getByTestId('assistant-input')).toBeEnabled();
});

test('collapsed right dock keeps a direct AI assistant launcher', async ({ page }) => {
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceAvailable: false,
        provider: 'deepseek',
        model: null,
        requiresApiKey: true,
        reason: '本机 AI 服务尚未启动；原专业流程仍可正常使用。',
      }),
    });
  });
  await page.getByTestId('new-project-name').fill(`助手入口 ${Date.now()}`);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByTestId('right-panel-assistant-shortcut')).toBeVisible();
  await page.getByTestId('right-panel-assistant-shortcut').click();
  await expect(page.getByTestId('professional-assistant-panel')).toBeVisible();
  await expect(page.getByTestId('assistant-disconnected')).toContainText('本机 AI 服务尚未启动');
});

async function installMockAssistant(page: Page) {
  const metrics = { turnRequests: 0, readToolCalls: 0, proposalCalls: 0 };
  await page.route('**/api/assistant/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        serviceId: 'sigs-oglab-assistant',
        buildId: 'process134-ai-import-v1',
        instanceId: 'playwright-mock-instance',
        protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
        serviceAvailable: true,
        provider: 'mock',
        model: 'deterministic-mock',
        requiresApiKey: false,
      }),
    });
  });
  await page.route('**/api/assistant/turn', async (route) => {
    metrics.turnRequests += 1;
    const body = route.request().postDataJSON() as {
      turns: Array<{ role: string; content?: string }>;
      context: {
        scope: { routeLabel: string; pointName: string };
        counts: { layers: number; pendingLayers: number; parameterProblems: number };
        selectedLayer: { layerId: string } | null;
      };
    };
    const last = body.turns.at(-1);
    if (last?.role === 'tool') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'message',
          model: 'deterministic-mock',
          content: `当前是“${body.context.scope.routeLabel}”，点位 ${body.context.scope.pointName}。分层 ${body.context.counts.layers} 层，其中 ${body.context.counts.pendingLayers} 层待处理；参数问题 ${body.context.counts.parameterProblems} 项。`,
        }),
      });
      return;
    }
    const latestUser = [...body.turns].reverse().find((turn) => turn.role === 'user')?.content ?? '';
    const requestedGroup = latestUser.includes('改成砂土')
      ? 'sand'
      : latestUser.includes('改成黏土')
        ? 'clay'
        : null;
    if (requestedGroup && body.context.selectedLayer) {
      metrics.proposalCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'tool_calls',
          model: 'deterministic-mock',
          content: null,
          calls: [{
            id: `ui-tool-${Date.now()}`,
            name: 'propose_set_layer_soil_group',
            arguments: JSON.stringify({
              layerId: body.context.selectedLayer.layerId,
              engineeringSoilGroup: requestedGroup,
              reason: '按用户对当前选中层的明确要求生成。',
            }),
          }],
        }),
      });
      return;
    }
    metrics.readToolCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'tool_calls',
        model: 'deterministic-mock',
        content: null,
        calls: [{
          id: `ui-tool-${Date.now()}`,
          name: 'read_workflow_summary',
          arguments: '{}',
        }],
      }),
    });
  });
  return metrics;
}

async function prepareManualStratification(page: Page, testInfo: TestInfo) {
  const projectName = `助手测试 ${Date.now()}`;
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await page.getByTestId('explorer-import').click();
  const filePath = testInfo.outputPath('assistant-point.csv');
  writeFileSync(filePath, [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    'CPT-AI,0.50,900,980,12,60,1.2,12.4,6.0',
    'CPT-AI,2.00,1140,1230,14,65,1.3,12.4,6.0',
    'CPT-AI,4.00,1380,1480,16,70,1.4,12.4,6.0',
    'CPT-AI,6.00,1620,1730,18,75,1.5,12.4,6.0',
  ].join('\n'), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(basename(filePath));
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成');
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await page.getByTestId('stratification-primary-action').click();
  await page.getByTestId('guided-use-manual').click();
  await page.getByTestId('guided-generation-confirm').click();
  await expect(page.getByTestId('stratification-layer-row-1')).toBeVisible();
  await page.getByTestId('stratification-layer-row-1').click();
}

async function openAssistant(page: Page) {
  const show = page.getByTestId('right-panel-show');
  if (await show.isVisible().catch(() => false)) await show.click();
  await page.getByTestId('right-panel-assistant-tab').click();
  await expect(page.getByTestId('professional-assistant-panel')).toBeVisible();
}

async function readCurrentLayerGroup(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const scheme = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
    return workspace?.editSession?.working.layers[0]?.engineeringSoilGroup
      ?? scheme?.layers[0]?.engineeringSoilGroup
      ?? null;
  });
}

async function readStratificationAuthority(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) throw new Error(loaded.detail);
    const project = loaded.manifest.state.projects.find((candidate) => candidate.projectId === loaded.manifest.state.activeProjectId);
    const point = project?.points.find((candidate) => candidate.pointId === project.activePointId);
    const workspace = point?.stratificationWorkspace;
    const current = workspace?.schemes.find((candidate) => candidate.schemeId === workspace.currentSchemeId);
    return {
      currentGroup: current?.layers[0]?.engineeringSoilGroup ?? null,
      workingGroup: workspace?.editSession?.working.layers[0]?.engineeringSoilGroup ?? null,
      revisionCount: workspace?.revisions.length ?? 0,
    };
  });
}

async function browserStorageContainsSecret(page: Page, secrets: string[]) {
  return page.evaluate(async (secretValues) => {
    const storageRecords = [
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ];
    let corpus = JSON.stringify(storageRecords);
    const databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    for (const descriptor of databases) {
      if (!descriptor.name) continue;
      const database = await new Promise<IDBDatabase | null>((resolve) => {
        const request = indexedDB.open(descriptor.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      if (!database) continue;
      try {
        const names = [...database.objectStoreNames];
        if (!names.length) continue;
        const transaction = database.transaction(names, 'readonly');
        for (const name of names) {
          const records = await new Promise<unknown[]>((resolve) => {
            const request = transaction.objectStore(name).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
          });
          corpus += JSON.stringify(records);
        }
      } finally {
        database.close();
      }
    }
    corpus += document.body.textContent ?? '';
    return secretValues.some((secret) => corpus.includes(secret));
  }, secrets);
}
