import { expect, type Page } from '@playwright/test';

export async function completeThinLayerGuide(page: Page, mode: 'preserve' | 'recommended' = 'preserve', thresholdM?: number) {
  const methodDialog = page.getByTestId('layer-cleanup-method-dialog');
  if (!await methodDialog.count()) await methodDialog.waitFor({ state: 'visible', timeout: 750 }).catch(() => undefined);
  if (await methodDialog.count()) await page.getByTestId('layer-cleanup-thin-method').click();
  const dialog = page.getByTestId('thin-layer-guide-dialog');
  if (!await dialog.count()) {
    await dialog.waitFor({ state: 'visible', timeout: 750 }).catch(() => undefined);
    if (!await dialog.count()) return;
  }
  if (thresholdM !== undefined) await page.getByTestId('thin-layer-threshold-input').fill(thresholdM.toFixed(2));
  await page.getByTestId('thin-layer-start-review').click();
  for (let guard = 0; guard < 160; guard += 1) {
    if (await page.getByTestId('thin-layer-guide-preview-step').count()) break;
    if (!await page.getByTestId('thin-layer-guide-review-step').count()) {
      await page.waitForTimeout(20);
      continue;
    }
    if (mode === 'preserve') await page.getByTestId('thin-layer-decision-preserve').click();
    const next = page.getByTestId('thin-layer-next-candidate');
    if (await next.count()) await next.click();
    else {
      await page.getByTestId('thin-layer-open-preview').click();
      break;
    }
  }
  await expect(page.getByTestId('thin-layer-guide-preview-step')).toBeVisible();
  await page.getByTestId('thin-layer-apply-plan').click();
  await expect(dialog).toHaveCount(0);
}

export async function confirmPendingStratificationLayers(page: Page, detailedSoilType = '粉砂') {
  await completeThinLayerGuide(page);
  for (let guard = 0; guard < 120; guard += 1) {
    if (await page.getByTestId('stratification-save').count()) return;
    const panel = page.getByTestId('stratification-layer-decision-panel');
    if (await panel.count()) {
      const accept = page.getByTestId('stratification-inline-accept-layer');
      if (await accept.count() && await accept.isEnabled()) {
        await accept.click();
        continue;
      }
      const soilForm = page.getByTestId('stratification-inline-soil-form');
      if (!await soilForm.count()) {
        const chooseSoil = panel.getByRole('button', { name: '选择土类', exact: true });
        const modifySoil = panel.getByRole('button', { name: '修改土类', exact: true });
        if (await chooseSoil.count()) await chooseSoil.click();
        else if (await modifySoil.count()) await modifySoil.click();
      }
      if (await page.getByTestId('stratification-inline-soil-form').count()) {
        const selectedLayerClass = await page.locator('.editable-layer-block.selected').getAttribute('class', { timeout: 250 }).catch(() => '') ?? '';
        const compatibleDetailedType = selectedLayerClass.includes('soil-sand')
          ? '细砂'
          : selectedLayerClass.includes('soil-clay')
            ? '黏土'
            : selectedLayerClass.includes('soil-mixed')
              ? '粉土'
              : detailedSoilType;
        await page.getByTestId('stratification-inline-soil-select').selectOption(compatibleDetailedType);
        await page.getByTestId('stratification-inline-save-soil').click();
        continue;
      }
      const next = page.getByTestId('stratification-next-pending-layer');
      if (await next.count()) {
        await next.click();
        continue;
      }
    }
    const primary = page.getByTestId('stratification-primary-action');
    if (await primary.count()) {
      const label = await primary.textContent() ?? '';
      if (label.includes('确认') || label.includes('接受')) {
        await primary.click();
        continue;
      }
    }
    if (await page.getByTestId('stratification-save').count()) return;
    if (guard === 119) {
      throw new Error('Stratification candidates were not fully confirmed through the inline guide.');
    }
    await page.waitForTimeout(20);
  }
  throw new Error('Stratification candidates were not fully confirmed through the inline guide.');
}

export async function generateCurrentStratificationRevision(page: Page, detailedSoilType = '粉砂') {
  await confirmPendingStratificationLayers(page, detailedSoilType);
  await page.getByTestId('stratification-save').click();
  await expect(page.getByTestId('stratification-finalize-guide-dialog')).toBeVisible();
  await page.getByTestId('stratification-guide-generate-revision').click();
}
