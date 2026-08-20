import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test, type Page } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createGeneratedCsv, createNonpositiveQcCsv } from './fixtures/generatedCptu';

const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'data-check-first-look');
const inputDir = path.join(evidenceDir, 'input');

test('Data Check First Look handles a true check-stage problem and recovery flow', async ({ page }) => {
  mkdirSync(inputDir, { recursive: true });
  const rawSeed = process.env.CHECK_FIRST_LOOK_SEED ?? String(Date.now() % 100000000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?flow=1&case=random&seed=${rawSeed}`);
  const bannerText = (await page.getByTestId('flow-case-banner').textContent()) ?? '';
  const seed = bannerText.match(/seed\s+(\d+)/)?.[1] ?? rawSeed;
  const pointName = (await page.getByTestId('project-current-point').innerText()).trim();
  await page.getByTestId(`project-point-${pointName}`).click();
  await page.getByRole('button', { name: '核对导入' }).click();

  const issueInput = createNonpositiveQcCsv(pointName, `${seed}1`);
  const issuePath = path.join(inputDir, issueInput.fileName);
  writeFileSync(issuePath, issueInput.csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(issuePath);
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿已生成，可进入数据检查');
  await completePreparationGuide(page);
  stepLog.push('upload schema-valid CSV with one nonpositive qc row and run check');

  await expect(page.getByTestId('check-first-look')).toContainText('检查发现问题，暂不能进入地层分层');
  await expect(page.getByTestId('document-check').locator('.toolbar-button.primary')).toHaveCount(1);
  await expect(page.getByTestId('check-issue-check-qc-positive')).toBeVisible();
  await expect(page.getByTestId('check-selected-issue')).toContainText('QcKpa');
  await expect(page.getByTestId('check-evidence-rows')).toContainText('-25');
  await expect(page.getByTestId('flow-continue-stratification')).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, 'check-problem-1440x900.png'), fullPage: true });
  const layout1440 = await readCheckLayout(page);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(evidenceDir, 'check-problem-1920x1080.png'), fullPage: true });
  const layout1920 = await readCheckLayout(page);
  const browserCheck = { viewports: [layout1440, layout1920], consoleErrors, pageErrors };
  writeFileSync(
    path.join(evidenceDir, 'browser-check.json'),
    JSON.stringify({ ...browserCheck, consoleErrors, pageErrors }, null, 2),
    'utf8',
  );
  for (const layout of browserCheck.viewports) {
    expect(layout).toMatchObject({
      documentHorizontalOverflow: false,
      decisionHorizontalOverflow: false,
      primaryCount: 1,
      decisionVisible: true,
    });
  }

  await page.getByTestId('check-primary-return-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.getByTestId('mapping-row-qckpa')).toHaveClass(/selected/);
  await expect(page.getByTestId('flow-toast')).toContainText('QcKpa');
  stepLog.push('return to data import and focus QcKpa');

  const correctedInput = createGeneratedCsv(pointName, `${seed}2`);
  const correctedPath = path.join(inputDir, correctedInput.fileName);
  writeFileSync(correctedPath, correctedInput.csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(correctedPath);
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成，可进入地层分层');
  await expect(page.getByTestId('document-check').locator('.toolbar-button.primary')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(evidenceDir, 'check-recovered-1440x900.png'), fullPage: true });
  stepLog.push('upload corrected CSV and rerun check');

  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  stepLog.push('continue to stratification from the central primary action');

  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toContain('阻塞');
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  writeFileSync(
    path.join(evidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        eventId: 'CHK-E11',
        seed,
        pointName,
        issueInput: issuePath,
        correctedInput: correctedPath,
        affectedRow: issueInput.affectedRow,
        stepLog,
        screenshots: [
          'check-problem-1440x900.png',
          'check-problem-1920x1080.png',
          'check-recovered-1440x900.png',
        ],
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
    'utf8',
  );
});

async function readCheckLayout(page: Page) {
  return page.evaluate(() => {
    const documentNode = document.querySelector<HTMLElement>('[data-testid="document-check"]');
    const decisionNode = document.querySelector<HTMLElement>('[data-testid="check-first-look"]');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentHorizontalOverflow: documentNode ? documentNode.scrollWidth > documentNode.clientWidth + 2 : true,
      decisionHorizontalOverflow: decisionNode ? decisionNode.scrollWidth > decisionNode.clientWidth + 2 : true,
      primaryCount: documentNode?.querySelectorAll('.toolbar-button.primary').length ?? -1,
      decisionVisible: Boolean(decisionNode && decisionNode.getBoundingClientRect().height > 0),
    };
  });
}
