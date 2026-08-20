import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from './fixtures/isolatedTest';

const storageKey = 'sigs-oglab:project-hub-guide:v1';
const sessionKey = `${storageKey}:session`;
const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'process143-project-onboarding');

async function openAsFirstVisit(page: Page) {
  await page.evaluate(([localKey, fallbackKey]) => {
    window.localStorage.removeItem(localKey);
    window.sessionStorage.removeItem(fallbackKey);
  }, [storageKey, sessionKey]);
  await page.reload();
  await expect(page.getByTestId('project-onboarding')).toBeVisible();
}

async function readLayout(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('[data-testid="project-onboarding-card"]');
    const spotlight = document.querySelector<HTMLElement>('[data-testid="project-onboarding-spotlight"]');
    const targetTestId = card?.dataset.target ?? '';
    const target = targetTestId ? document.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`) : null;
    const cardRect = card?.getBoundingClientRect();
    const spotlightRect = spotlight?.getBoundingClientRect();
    const targetRect = target?.getBoundingClientRect();
    const centerElement = targetRect
      ? document.elementFromPoint(targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2)
      : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      targetTestId,
      card: cardRect ? { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom } : null,
      spotlight: spotlightRect ? { left: spotlightRect.left, top: spotlightRect.top, right: spotlightRect.right, bottom: spotlightRect.bottom } : null,
      target: targetRect ? { left: targetRect.left, top: targetRect.top, right: targetRect.right, bottom: targetRect.bottom } : null,
      centerElementClass: centerElement instanceof HTMLElement ? centerElement.className : '',
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      verticalOverflow: document.documentElement.scrollHeight > window.innerHeight + 2,
    };
  });
}

function expectSpotlightContainsTarget(layout: Awaited<ReturnType<typeof readLayout>>) {
  expect(layout.card).not.toBeNull();
  expect(layout.spotlight).not.toBeNull();
  expect(layout.target).not.toBeNull();
  expect(layout.spotlight!.left).toBeLessThanOrEqual(layout.target!.left);
  expect(layout.spotlight!.top).toBeLessThanOrEqual(layout.target!.top);
  expect(layout.spotlight!.right).toBeGreaterThanOrEqual(layout.target!.right);
  expect(layout.spotlight!.bottom).toBeGreaterThanOrEqual(layout.target!.bottom);
  expect(layout.card!.left).toBeGreaterThanOrEqual(0);
  expect(layout.card!.top).toBeGreaterThanOrEqual(0);
  expect(layout.card!.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.card!.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.centerElementClass).toContain('project-onboarding-blocker');
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.verticalOverflow).toBe(false);
}

test('PROCESS143 first desktop visit walks through three focused steps and then permits project creation', async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });

  await page.setViewportSize({ width: 1440, height: 900 });
  await openAsFirstVisit(page);
  const guide = page.getByTestId('project-onboarding');
  const card = page.getByTestId('project-onboarding-card');
  await expect(guide).toHaveAttribute('data-step', '1');
  await expect(card).toHaveAttribute('data-target', 'project-mode-choice');
  await expect(card).toContainText('快捷出图，还是专业解译？');
  await expect(page.getByTestId('project-onboarding-next')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('project-onboarding-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('project-onboarding-next')).toBeFocused();
  const step1Layout = await readLayout(page);
  expectSpotlightContainsTarget(step1Layout);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(evidenceDir, 'first-step-1440x900.png') });

  await page.getByTestId('project-onboarding-next').click();
  await expect(guide).toHaveAttribute('data-step', '2');
  await expect(card).toHaveAttribute('data-target', 'new-project-name');
  await expect(card).toContainText('输入项目名称');
  expectSpotlightContainsTarget(await readLayout(page));

  await page.getByTestId('project-onboarding-back').click();
  await expect(guide).toHaveAttribute('data-step', '1');
  await page.getByTestId('project-onboarding-next').click();
  await page.getByTestId('project-onboarding-next').click();
  await expect(guide).toHaveAttribute('data-step', '3');
  await expect(card).toHaveAttribute('data-target', 'create-project-submit');
  await expect(page.getByTestId('project-onboarding-next')).toHaveText('开始使用');
  expectSpotlightContainsTarget(await readLayout(page));

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(card).toBeVisible();
  await expect.poll(async () => {
    const layout = await readLayout(page);
    return Boolean(layout.spotlight && layout.target && layout.spotlight.right >= layout.target.right);
  }).toBe(true);
  const step3Layout = await readLayout(page);
  expectSpotlightContainsTarget(step3Layout);
  await page.screenshot({ path: path.join(evidenceDir, 'final-step-1920x1080.png') });

  await page.getByTestId('project-onboarding-next').click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByTestId('project-mode-quick')).toBeFocused();
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain('complete');

  await page.getByTestId('new-project-name').fill('首次指引验收项目');
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('quick-input-workspace')).toBeVisible();
  expect(browserErrors).toEqual([]);

  writeFileSync(path.join(evidenceDir, 'browser-check.json'), JSON.stringify({
    process: 143,
    browserErrors,
    step1Layout,
    step3Layout,
    completionStored: true,
    projectCreatedAfterCompletion: true,
  }, null, 2), 'utf8');
});

test('PROCESS143 skip, Escape and manual replay share one durable exit path', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAsFirstVisit(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain('skip');

  await page.reload();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  const replay = page.getByTestId('open-project-onboarding');
  await replay.click();
  await expect(page.getByTestId('project-onboarding')).toHaveAttribute('data-step', '1');
  await page.getByTestId('project-onboarding-next').click();
  await page.getByTestId('project-onboarding-skip').click();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  await expect(replay).toBeFocused();

  await replay.click();
  await page.getByTestId('project-onboarding-close').click();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  await expect(replay).toBeFocused();
});

test('PROCESS143 existing projects and mobile view are never interrupted', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('new-project-name').fill('已有项目');
  await page.getByTestId('project-mode-professional').click();
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await page.evaluate(([localKey, fallbackKey]) => {
    window.localStorage.removeItem(localKey);
    window.sessionStorage.removeItem(fallbackKey);
  }, [storageKey, sessionKey]);
  await page.getByTestId('workspace-project-switcher').click();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);

  await page.setViewportSize({ width: 900, height: 800 });
  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  await expect(page.getByTestId('open-project-onboarding')).toBeHidden();
});

test('PROCESS143 localStorage failure falls back to the current browser session', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(([localKey, fallbackKey]) => {
    window.localStorage.removeItem(localKey);
    window.sessionStorage.removeItem(fallbackKey);
  }, [storageKey, sessionKey]);
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(name: string, value: string) {
      if (this === window.localStorage && name === key) throw new DOMException('storage unavailable', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, storageKey);
  await page.reload();
  await expect(page.getByTestId('project-onboarding')).toBeVisible();
  await page.getByTestId('project-onboarding-skip').click();
  await expect.poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), sessionKey)).toContain('skip');
  await page.reload();
  await expect(page.getByTestId('project-onboarding')).toHaveCount(0);
  await expect(page.getByTestId('new-project-name')).toBeEnabled();
});
