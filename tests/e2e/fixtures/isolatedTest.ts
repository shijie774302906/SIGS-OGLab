import { expect, test as base, type Page, type TestInfo } from '@playwright/test';

type IsolationFixtures = {
  workspaceIsolation: void;
};

/**
 * Clears the browser-local workspace authority for the current Playwright
 * context. Tests that deliberately exercise reset, migration or recovery may
 * call this helper at the exact scenario step; ordinary test startup is owned
 * by the automatic fixture below.
 */
export async function resetWorkspaceAuthority(page: Page, options: { reload?: boolean } = {}) {
  if (page.url() === 'about:blank') await page.goto('/');
  let lastProblem: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate(async () => {
        const database = await import('/src/features/workspace/workspaceDatabase.ts');
        await database.deleteWorkspaceDatabase();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      lastProblem = null;
      break;
    } catch (problem) {
      lastProblem = problem;
      if (!String(problem).includes('Failed to fetch dynamically imported module') || attempt === 2) throw problem;
      await page.reload();
      await page.waitForTimeout(100 * (attempt + 1));
    }
  }
  if (lastProblem) throw lastProblem;
  if (options.reload !== false) await page.reload();
}

export const test = base.extend<IsolationFixtures>({
  workspaceIsolation: [async ({ page }, use) => {
    await resetWorkspaceAuthority(page);
    await use();
  }, { auto: true }],
});

export { expect };
export type { Page, TestInfo };
