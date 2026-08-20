import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from './fixtures/isolatedTest';

const inputKey = 'sigs-oglab:quick-input-guide:v1';
const reportKey = 'sigs-oglab:quick-report-guide:v1';
const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process146-quick-onboarding');
const evidenceEnabled = process.env.PROCESS146_EVIDENCE === '1' || process.env.MILESTONE_EVIDENCE === '1';

async function clearQuickGuideRecords(page: Page) {
  await page.evaluate(([input, report]) => {
    for (const key of [input, report]) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(`${key}:session`);
    }
  }, [inputKey, reportKey]);
}

async function createQuickProject(page: Page, name: string) {
  await page.getByTestId('new-project-name').fill(name);
  await page.getByTestId('project-mode-quick').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('quick-input-workspace')).toBeVisible();
}

async function readGuideLayout(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('[data-testid="quick-onboarding-card"]');
    const spotlight = document.querySelector<HTMLElement>('[data-testid="quick-onboarding-spotlight"]');
    const targetId = card?.dataset.target ?? '';
    const target = targetId ? document.querySelector<HTMLElement>(`[data-testid="${targetId}"]`) : null;
    const cardRect = card?.getBoundingClientRect();
    const spotlightRect = spotlight?.getBoundingClientRect();
    const targetRect = target?.getBoundingClientRect();
    return {
      placement: card?.dataset.placement ?? '',
      targetId,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      card: cardRect ? { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom } : null,
      spotlight: spotlightRect ? { left: spotlightRect.left, top: spotlightRect.top, right: spotlightRect.right, bottom: spotlightRect.bottom } : null,
      target: targetRect ? { left: targetRect.left, top: targetRect.top, right: targetRect.right, bottom: targetRect.bottom } : null,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });
}

function expectGuideWithinViewport(layout: Awaited<ReturnType<typeof readGuideLayout>>) {
  expect(layout.card).not.toBeNull();
  expect(layout.card!.left).toBeGreaterThanOrEqual(0);
  expect(layout.card!.top).toBeGreaterThanOrEqual(0);
  expect(layout.card!.right).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.card!.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.target).not.toBeNull();
  expect(layout.spotlight).not.toBeNull();
  expect(layout.spotlight!.left).toBeLessThanOrEqual(Math.max(8, layout.target!.left));
  expect(layout.spotlight!.right).toBeGreaterThanOrEqual(Math.min(layout.viewport.width - 8, layout.target!.right));
}

test('PROCESS146 desktop input and report guides are independent, contextual and replayable', async ({ page }) => {
  test.setTimeout(90_000);
  if (evidenceEnabled) mkdirSync(evidenceDir, { recursive: true });
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearQuickGuideRecords(page);
  await createQuickProject(page, '快捷教程桌面验收');

  const inputGuide = page.getByTestId('quick-input-onboarding');
  const card = page.getByTestId('quick-onboarding-card');
  await expect(inputGuide).toHaveAttribute('data-step', '1');
  await expect(card).toHaveAttribute('data-target', 'quick-data-card');
  await expect(card).toContainText('先放入数据');
  await expect(card).toContainText('文件看不懂时，再用 AI 整理');
  await expect(page.getByTestId('quick-onboarding-next')).toBeFocused();
  expectGuideWithinViewport(await readGuideLayout(page));
  await page.waitForTimeout(220);
  if (evidenceEnabled) await page.screenshot({ path: path.join(evidenceDir, 'input-step1-1440x900.png') });

  await page.getByTestId('quick-onboarding-next').click();
  await expect(card).toHaveAttribute('data-target', 'quick-settings-card');
  await expect(card).toContainText('再确认图册信息');
  await expect(card).toContainText('导入数据后，需要确认的内容会显示在这里');
  await expect(card).not.toContainText('水深');
  await page.getByTestId('quick-onboarding-next').click();
  await expect(card).toHaveAttribute('data-target', 'quick-ready-bar');
  await expect(card).toContainText('最后生成图册');
  await expect(page.getByTestId('quick-generate-report')).toBeDisabled();
  await page.getByTestId('quick-onboarding-back').click();
  await expect(card).toContainText('再确认图册信息');
  await page.getByTestId('quick-onboarding-next').click();
  await page.getByTestId('quick-onboarding-next').click();
  await expect(inputGuide).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), inputKey)).toContain('complete');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), reportKey)).toBeNull();

  await page.reload();
  await expect(page.getByTestId('quick-input-onboarding')).toHaveCount(0);
  await page.getByTestId('open-project-onboarding').click();
  await expect(page.getByTestId('quick-input-onboarding')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('quick-input-onboarding')).toHaveCount(0);

  await page.getByTestId('quick-use-demo-data').click();
  await expect(page.getByText('121 行 · 系统生成演示数据')).toBeVisible();
  await page.getByTestId('open-project-onboarding').click();
  await page.getByTestId('quick-onboarding-next').click();
  await expect(card).toContainText('确认孔位名称、水深和 u2 的使用方式');
  await page.getByTestId('quick-onboarding-close').click();
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-workspace')).toBeVisible({ timeout: 45_000 });

  const reportGuide = page.getByTestId('quick-report-onboarding');
  await expect(reportGuide).toHaveAttribute('data-step', '1');
  await expect(card).toHaveAttribute('data-target', 'quick-report-viewer');
  await expect(card).toContainText('查看图册');
  await page.getByTestId('quick-onboarding-next').click();
  await expect(card).toHaveAttribute('data-target', 'quick-report-export-actions');
  await expect(card).toContainText('导出结果');
  await page.getByTestId('quick-onboarding-next').click();
  await expect(card).toHaveAttribute('data-target', 'quick-ai-toggle');
  await expect(card).toContainText('AI 可以阅读当前页和跨页证据，但不会修改图册');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => {
    const layout = await readGuideLayout(page);
    return layout.spotlight?.right ?? 0;
  }).toBeGreaterThan(1800);
  expectGuideWithinViewport(await readGuideLayout(page));
  if (evidenceEnabled) await page.screenshot({ path: path.join(evidenceDir, 'report-step3-1920x1080.png') });
  await page.getByTestId('quick-onboarding-next').click();
  await expect(reportGuide).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), reportKey)).toContain('complete');
  await expect(page.getByLabel('图册页面').locator('button')).toHaveCount(15);
  expect(browserErrors).toEqual([]);

  if (evidenceEnabled) {
    writeFileSync(path.join(evidenceDir, 'desktop-check.json'), JSON.stringify({
      processId: 'Process146',
      inputSteps: 3,
      reportSteps: 3,
      inputAndReportRecordsIndependent: true,
      rowsAfterGuide: 121,
      atlasPagesAfterGuide: 15,
      browserErrors,
    }, null, 2));
  }
});

test('PROCESS146 mobile guides use a bottom card, scroll targets into view and do not overflow', async ({ page }) => {
  test.setTimeout(90_000);
  if (evidenceEnabled) mkdirSync(evidenceDir, { recursive: true });
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await clearQuickGuideRecords(page);
  await createQuickProject(page, '快捷教程移动验收');
  const card = page.getByTestId('quick-onboarding-card');
  await expect(card).toHaveAttribute('data-placement', 'mobile');
  await expect(page.getByTestId('open-project-onboarding')).toBeVisible();
  await page.getByTestId('quick-onboarding-next').click();
  await page.getByTestId('quick-onboarding-next').click();
  await page.waitForTimeout(400);
  const inputLayout = await readGuideLayout(page);
  expect(inputLayout.placement).toBe('mobile');
  expect(inputLayout.targetId).toBe('quick-ready-bar');
  expectGuideWithinViewport(inputLayout);
  if (evidenceEnabled) await page.screenshot({ path: path.join(evidenceDir, 'input-step3-390x844.png') });
  await page.getByTestId('quick-onboarding-next').click();

  await page.getByTestId('quick-use-demo-data').click();
  await page.getByTestId('quick-pressure-basis-confirm').check();
  await page.getByTestId('quick-generate-report').click();
  await expect(page.getByTestId('quick-report-onboarding')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('quick-onboarding-next').click();
  await page.waitForTimeout(400);
  const reportLayout = await readGuideLayout(page);
  expect(reportLayout.placement).toBe('mobile');
  expect(reportLayout.targetId).toBe('quick-report-export-actions');
  expectGuideWithinViewport(reportLayout);
  if (evidenceEnabled) await page.screenshot({ path: path.join(evidenceDir, 'report-step2-390x844.png') });
  await page.getByTestId('quick-onboarding-skip').click();
  await expect(page.getByTestId('quick-report-onboarding')).toHaveCount(0);
  expect(browserErrors).toEqual([]);

  if (evidenceEnabled) {
    writeFileSync(path.join(evidenceDir, 'mobile-check.json'), JSON.stringify({
      processId: 'Process146',
      viewport: { width: 390, height: 844 },
      inputStep3: inputLayout,
      reportStep2: reportLayout,
      browserErrors,
    }, null, 2));
  }
});

test('PROCESS146 no-u2 copy stays minimal and storage failure falls back to the current session', async ({ page }) => {
  await clearQuickGuideRecords(page);
  await createQuickProject(page, '快捷教程降级验收');
  await page.getByTestId('quick-onboarding-skip').click();
  await page.getByTestId('quick-paste-grid').evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '深度\tqc\n0.1\t1.2\n0.2\t1.4');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
  await page.getByTestId('open-project-onboarding').click();
  await page.getByTestId('quick-onboarding-next').click();
  const card = page.getByTestId('quick-onboarding-card');
  await expect(card).toContainText('确认孔位名称即可');
  await expect(card).not.toContainText('水深');
  await expect(card).not.toContainText('u2 的使用方式');

  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreGuideStorage?: typeof original }).restoreGuideStorage = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, inputKey);
  await page.getByTestId('quick-onboarding-skip').click();
  await expect.poll(() => page.evaluate((key) => window.sessionStorage.getItem(`${key}:session`), inputKey)).toContain('skip');
  await page.evaluate(() => {
    const restore = (window as unknown as { restoreGuideStorage?: typeof Storage.prototype.setItem }).restoreGuideStorage;
    if (restore) Storage.prototype.setItem = restore;
  });
});
