import { expect, type Page } from '@playwright/test';

export async function completePreparationGuide(page: Page) {
  for (let step = 0; step < 10; step += 1) {
    const probeDialog = page.getByTestId('probe-guide-dialog');
    if (await probeDialog.isVisible().catch(() => false)) {
      await page.getByTestId('probe-guide-recommended').click();
      await expect(probeDialog).toBeHidden();
      await page.waitForTimeout(100);
      continue;
    }
    const waterDialog = page.getByTestId('water-guide-dialog');
    if (await waterDialog.isVisible().catch(() => false)) {
      await page.getByTestId('water-guide-confirm').click();
      await expect(page.getByTestId('document-check')).toBeVisible();
      break;
    }
    if (await page.getByTestId('document-check').isVisible().catch(() => false)) break;
    if (await page.locator('.modal-backdrop').isVisible().catch(() => false)) {
      await page.waitForTimeout(100);
      continue;
    }
    if (await page.getByTestId('run-data-check').isVisible().catch(() => false)) {
      await page.waitForTimeout(100);
      if (await page.locator('.modal-backdrop').isVisible().catch(() => false)) continue;
      await page.getByTestId('run-data-check').click();
      await expect(page.getByTestId('document-check')).toBeVisible();
      break;
    }
    await page.waitForTimeout(50);
  }
  const advanced = page.getByTestId('check-toggle-advanced');
  if (await advanced.isVisible().catch(() => false)) await advanced.click();
}

export async function openStratificationTools(page: Page) {
  if (await page.getByTestId('document-check').isVisible().catch(() => false)) {
    let continueButton = page.locator('[data-testid="flow-continue-stratification"]:not([disabled])').first();
    if (!await continueButton.isVisible().catch(() => false)) {
      const rerun = page.getByTestId('check-rerun');
      if (await rerun.isVisible().catch(() => false)) {
        await rerun.click();
        await expect(page.getByTestId('check-first-look')).toContainText('可进入地层分层');
      }
      continueButton = page.locator('[data-testid="flow-continue-stratification"]:not([disabled])').first();
    }
    await continueButton.click();
    await expect(page.getByTestId('stratification-document')).toBeVisible();
  }
  const show = page.getByTestId('right-panel-show');
  if (await show.isVisible().catch(() => false)) await show.click();
  const tools = page.getByTestId('stratification-advanced-tools');
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute('open')) === null) {
    await page.getByTestId('stratification-advanced-tools-toggle').click();
  }
  await page.getByTestId('stratification-mode-jts').click();
}
