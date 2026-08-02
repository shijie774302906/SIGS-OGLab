import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures/isolatedTest';
import { projectHelpLinks } from '../../src/components/ProjectFeedbackLauncher';

const feedbackEndpoint = 'https://formsubmit.co/ajax/sigsoglab@163.com';

test('help links map each product shell to one stable manual location', () => {
  expect(projectHelpLinks('项目集合')).toEqual({
    manual: 'https://docs.sigs-oglab.com/',
    page: 'https://docs.sigs-oglab.com/start/',
  });
  expect(projectHelpLinks('数据检查').page).toBe('https://docs.sigs-oglab.com/professional/check#current-problem');
  expect(projectHelpLinks('快捷出图 · 数据输入').page).toBe('https://docs.sigs-oglab.com/quick/import');
  expect(projectHelpLinks('快捷出图 · 图册').page).toBe('https://docs.sigs-oglab.com/quick/generate-export#read');
  expect(projectHelpLinks('未知页面').page).toBe('https://docs.sigs-oglab.com/start/');
});

test('global feedback form submits only the explicit feedback fields and returns to the same page', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let submittedBody = '';
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await context.route('**/api/visits', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) });
  });
  await context.route('**/favicon.ico', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route(feedbackEndpoint, async (route) => {
    submittedBody = route.request().postDataBuffer()?.toString('utf8') ?? '';
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Email sent successfully!' }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?flow=1&case=random&seed=123456');
  await expect(page.getByTestId('document-project')).toBeVisible();

  const feedbackTrigger = page.getByTestId('open-project-feedback');
  await expect(page.getByTestId('open-project-manual')).toHaveAttribute('href', 'https://docs.sigs-oglab.com/');
  await expect(page.getByTestId('open-current-page-help')).toHaveAttribute('href', 'https://docs.sigs-oglab.com/professional/import#project');
  await expect(page.getByTestId('open-project-manual')).toHaveAttribute('target', '_blank');
  await expect(feedbackTrigger).toBeVisible();
  await expect(feedbackTrigger).toHaveText('反馈与建议');
  await feedbackTrigger.click();

  const dialog = page.getByTestId('project-feedback-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '反馈与建议' })).toBeVisible();
  await expect(dialog).toContainText('有问题或建议，欢迎告诉我们。');
  await expect(dialog.getByLabel('使用问题')).toBeChecked();
  await expect(dialog.getByLabel('功能建议')).toBeVisible();
  await expect(dialog.getByLabel('其他')).toBeVisible();
  await expect(page.getByTestId('feedback-content')).toHaveJSProperty('required', true);

  await page.getByTestId('submit-project-feedback').click();
  expect(await page.getByTestId('feedback-content').evaluate((element: HTMLTextAreaElement) => element.validity.valueMissing)).toBe(true);

  await dialog.getByText('功能建议', { exact: true }).click();
  await page.getByTestId('feedback-content').fill('希望增加更清楚的导入提示。');
  await page.getByTestId('feedback-contact').fill('user@example.com');
  await page.getByTestId('feedback-screenshot').setInputFiles({
    name: 'feedback.png',
    mimeType: 'image/png',
    buffer: Buffer.from('valid-image-placeholder'),
  });
  await page.getByTestId('submit-project-feedback').click();
  await expect(page.getByTestId('submit-project-feedback')).toBeDisabled();
  await expect(page.getByTestId('submit-project-feedback')).toHaveText('正在提交…');
  await expect(page.getByTestId('feedback-submit-success')).toContainText('已收到，谢谢你的反馈。');

  expect(submittedBody).toContain('功能建议');
  expect(submittedBody).toContain('希望增加更清楚的导入提示。');
  expect(submittedBody).toContain('user@example.com');
  expect(submittedBody).toContain('feedback.png');
  expect(submittedBody).toContain('SIGS-OGLab');
  expect(submittedBody).toContain('项目/点位数据');
  expect(submittedBody).not.toContain('seed=123456');
  expect(submittedBody).not.toContain('测量值');

  await page.getByRole('button', { name: '完成' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('document-project')).toBeVisible();
  await expect(feedbackTrigger).toBeFocused();

  await feedbackTrigger.click();
  await expect(page.getByTestId('feedback-content')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('failed feedback submission keeps input and can retry successfully', async ({ page }) => {
  let attempts = 0;
  await page.route(feedbackEndpoint, async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '服务暂时不可用' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Email sent successfully!' }),
    });
  });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?flow=1&case=random&seed=654321');
  await page.getByTestId('open-project-feedback').click();
  await page.getByTestId('feedback-content').fill('提交失败后不要丢失这段内容。');
  await page.getByTestId('submit-project-feedback').click();

  await expect(page.getByTestId('feedback-submit-error')).toContainText('提交失败');
  await expect(page.getByTestId('feedback-submit-error')).toContainText('已填写内容仍在');
  await expect(page.getByTestId('feedback-content')).toHaveValue('提交失败后不要丢失这段内容。');
  await expect(page.getByTestId('submit-project-feedback')).toHaveText('重新提交');

  await page.getByTestId('submit-project-feedback').click();
  await expect(page.getByTestId('feedback-submit-success')).toBeVisible();
  expect(attempts).toBe(2);
});

test('first-use activation response explains the single required email step', async ({ page }) => {
  await page.route(feedbackEndpoint, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: 'false',
        message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link.",
      }),
    });
  });
  await page.goto('/?flow=1&case=random&seed=97531');
  await page.getByTestId('open-project-feedback').click();
  await page.getByTestId('feedback-content').fill('首次启用测试');
  await page.getByTestId('submit-project-feedback').click();

  const activation = page.getByTestId('feedback-submit-activation');
  await expect(activation).toContainText('还差一步');
  await expect(activation).toContainText('请到项目邮箱完成首次确认');
  await expect(activation.getByRole('link', { name: 'sigsoglab@163.com' })).toBeVisible();
  await expect(page.getByTestId('feedback-content')).toHaveValue('首次启用测试');
  await expect(page.getByTestId('submit-project-feedback')).toHaveText('已确认，重新提交');
});

test('feedback screenshot rejects unsupported type and files over 10 MB before submission', async ({ page }) => {
  let requests = 0;
  await page.route(feedbackEndpoint, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto('/?flow=1&case=random&seed=24680');
  await page.getByTestId('open-project-feedback').click();

  const fileInput = page.getByTestId('feedback-screenshot');
  await fileInput.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });
  await expect(page.getByRole('alert')).toHaveText('仅支持 PNG 或 JPG 图片。');
  await expect(fileInput).toHaveJSProperty('files.length', 0);

  await fileInput.setInputFiles({
    name: 'too-large.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toHaveText('截图不能超过 10 MB。');
  await expect(fileInput).toHaveJSProperty('files.length', 0);
  expect(requests).toBe(0);
});

test('email fallback stays usable across routes and copy failure is recoverable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('clipboard unavailable')),
      },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: () => false,
    });
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/?flow=1&case=random&seed=13579');

  const feedbackTrigger = page.getByTestId('open-project-feedback');
  await feedbackTrigger.click();
  await page.getByText('也可以发送邮件').click();
  const mailHref = await page.getByTestId('send-feedback-email').getAttribute('href');
  expect(mailHref).toContain('mailto:sigsoglab@163.com');
  expect(decodeURIComponent(mailHref ?? '')).toContain('当前页面：项目/点位数据');
  await page.getByTestId('copy-feedback-email').click();
  await expect(page.getByTestId('feedback-copy-status')).toHaveText('无法自动复制，请手动复制上方邮箱。');
  await expect(page.getByRole('link', { name: 'sigsoglab@163.com' })).toBeVisible();

  await page.getByRole('button', { name: '关闭反馈窗口' }).click();
  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await feedbackTrigger.click();
  await page.getByText('也可以发送邮件').click();
  const importMailHref = await page.getByTestId('send-feedback-email').getAttribute('href');
  expect(decodeURIComponent(importMailHref ?? '')).toContain('当前页面：数据导入');
});

test('feedback entry is visible exactly once on the project hub and both quick plot views', async ({ page }) => {
  test.setTimeout(90_000);

  await page.route('**/api/visits', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ready',
      totals: { visitors: 12, visits: 18, coveredRegions: 2 },
      regions: [
        { key: 'CN-44', label: '广东', visits: 15 },
        { key: 'UNKNOWN', label: '未知', visits: 3 },
      ],
    }),
  }));
  await page.reload();

  await expect(page.getByTestId('project-hub')).toBeVisible();
  const feedbackTrigger = page.getByTestId('open-project-feedback');
  const analyticsTrigger = page.getByTestId('visitor-analytics-trigger');
  await expect(feedbackTrigger).toHaveCount(1);
  await expect(analyticsTrigger).toHaveCount(1);
  await expect(feedbackTrigger).toBeVisible();
  await feedbackTrigger.click();
  await page.getByText('也可以发送邮件').click();
  let mailHref = await page.getByTestId('send-feedback-email').getAttribute('href');
  expect(decodeURIComponent(mailHref ?? '')).toContain('当前页面：项目集合');
  await page.getByRole('button', { name: '关闭反馈窗口' }).click();
  await expect(feedbackTrigger).toBeFocused();

  await page.getByTestId('new-project-name').fill('反馈入口覆盖项目');
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('quick-input-workspace')).toBeVisible();
  await expect(feedbackTrigger).toHaveCount(1);
  await expect(analyticsTrigger).toHaveCount(1);
  await feedbackTrigger.click();
  await page.getByText('也可以发送邮件').click();
  mailHref = await page.getByTestId('send-feedback-email').getAttribute('href');
  expect(decodeURIComponent(mailHref ?? '')).toContain('当前页面：快捷出图 · 数据输入');
  await page.getByRole('button', { name: '关闭反馈窗口' }).click();

  await page.getByTestId('quick-paste-grid').evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '深度\tqc\tfs\n0.01\t1.2\t12\n0.02\t1.4\t13\n0.03\t1.6\t14');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
  await expect(page.getByTestId('quick-generate-report')).toBeEnabled();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });
  await expect(feedbackTrigger).toHaveCount(1);
  await expect(analyticsTrigger).toHaveCount(1);
  await feedbackTrigger.click();
  await page.getByText('也可以发送邮件').click();
  mailHref = await page.getByTestId('send-feedback-email').getAttribute('href');
  expect(decodeURIComponent(mailHref ?? '')).toContain('当前页面：快捷出图 · 图册');
});

test('PROCESS141 anonymous visit summary and region distribution appear once across global shells', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => window.localStorage.setItem('sigs-oglab:project-hub-guide:v1', '{"version":1,"source":"playwright"}'));
  await context.route('**/api/visits', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ready',
      totals: { visitors: 128, visits: 356, coveredRegions: 3 },
      regions: [
        { key: 'CN-44', label: '广东', visits: 220 },
        { key: 'CN-11', label: '北京', visits: 91 },
        { key: 'UNKNOWN', label: '未知', visits: 45 },
      ],
    }),
  }));
  const page = await context.newPage();
  await page.goto('/');

  const analyticsTrigger = page.getByTestId('visitor-analytics-trigger');
  await expect(analyticsTrigger).toHaveCount(1);
  await expect(analyticsTrigger).toContainText('累计访客 128 · 覆盖 3 个地区');
  await analyticsTrigger.click();
  const popover = page.getByTestId('visitor-analytics-popover');
  await expect(popover).toContainText('访问356 次');
  await expect(popover).toContainText('地区分布');
  await expect(popover).toContainText('广东220');
  await expect(popover).toContainText('未知45');
  if (process.env.MILESTONE_EVIDENCE === '1') {
    const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process141-scroll-visitor-analytics');
    mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'visitor-regions-1440x900.png') });
  }
  await page.getByRole('button', { name: '关闭访问统计' }).click();
  await expect(analyticsTrigger).toBeFocused();

  await page.getByTestId('new-project-name').fill('访问统计专业工作台');
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await expect(analyticsTrigger).toHaveCount(1);
  await expect(analyticsTrigger).toContainText('累计访客 128');
  await context.close();
});

test('PROCESS141 unavailable visit service stays invisible and never stops the project page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(() => window.localStorage.setItem('sigs-oglab:project-hub-guide:v1', '{"version":1,"source":"playwright"}'));
  let serviceAvailable = false;
  await context.route('**/api/visits', (route) => route.fulfill(serviceAvailable
    ? {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ready',
          totals: { visitors: 9, visits: 14, coveredRegions: 1 },
          regions: [{ key: 'CN-44', label: '广东', visits: 14 }],
        }),
      }
    : {
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'unavailable', totals: null, regions: [] }),
      }));
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('visitor-analytics-trigger')).toHaveCount(0);
  await expect(page.getByTestId('open-project-feedback')).toBeVisible();
  serviceAvailable = true;
  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('visitor-analytics-trigger')).toContainText('累计访客 9');
  await context.close();
});
