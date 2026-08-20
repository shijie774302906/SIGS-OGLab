import { completePreparationGuide } from './fixtures/guidedPreparation';
import { expect, test, type Page } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  createDepthExceedsFinalCsv,
  createGeneratedCsv,
  createMissingDepthCsv,
  createNonmonotonicDepthCsv,
} from './fixtures/generatedCptu';

const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'flow-1-upload-action');
const inputDir = path.join(evidenceDir, 'input');
const exceptionEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'flow-1-import-exceptions');
const exceptionInputDir = path.join(exceptionEvidenceDir, 'input');
const staleEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'flow-1-import-stale-check');
const staleInputDir = path.join(staleEvidenceDir, 'input');
const projectEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'project-lifecycle');
const qualityGateEvidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'data-check-quality-gate');

test('Flow 1 uploads a generated CSV and supports the first three-page human action path', async ({ page }) => {
  mkdirSync(inputDir, { recursive: true });
  const rawSeed = process.env.FLOW_1_RANDOM_SEED ?? String(Date.now() % 100000000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?flow=1&case=random&seed=${rawSeed}`);
  stepLog.push('open random Flow 1 workspace');

  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await expect(page.getByTestId('activity-bar')).toHaveCount(0);
  await expect(page.getByTestId('status-bar')).toHaveCount(0);
  await expect(page.getByTestId('global-top-nav')).toHaveCount(0);
  await expect(page.getByTestId('editor-tabs')).toHaveCount(0);
  await expect(page.getByTestId('bottom-panel')).toHaveCount(0);

  await expect(page.getByTestId('flow-case-banner')).not.toBeVisible();
  await expect(page.getByTestId('flow-case-banner')).toContainText('Flow 1');
  await expect(page.getByTestId('flow-case-banner')).toContainText('步骤 1/3');
  await expect(page.getByTestId('document-project')).toHaveAttribute('data-flow', 'flow-1-data-prep-check');
  await expect(page.getByTestId('document-project')).toHaveAttribute('data-flow-step', 'select-point');
  await expect(page.getByTestId('document-project')).not.toContainText('CPT09');
  await expect(page.getByTestId('project-first-look')).toContainText('当前任务');
  await expect(page.getByTestId('project-first-look')).toContainText('待核对导入');
  await expect(page.getByTestId('project-primary-next')).toHaveText('核对导入');
  await expect(page.getByTestId('preparation-guide')).toContainText('确认探头');
  await expect(page.getByTestId('preparation-guide')).toContainText('导入数据');

  const bannerText = (await page.getByTestId('flow-case-banner').textContent()) ?? '';
  const normalizedSeed = bannerText.match(/seed\s+(\d+)/)?.[1] ?? rawSeed;
  const caseId = bannerText.match(/F1-RANDOM-\d+/)?.[0] ?? `F1-RANDOM-${normalizedSeed}`;
  const pointName = (await page.getByTestId('project-current-point').innerText()).trim();
  await page.getByTestId(`project-point-${pointName}`).click();
  await expect(page.getByTestId('flow-toast')).toContainText(`已选择点位 ${pointName}`);
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'collapsed');
  await expect(page.getByTestId('right-panel-show')).toBeVisible();
  await page.getByTestId('right-panel-show').click();
  await expect(page.getByTestId('right-panel')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('project-dock-point-tools')).toContainText(pointName);
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-project-1440x900.png'), fullPage: true });
  stepLog.push(`confirm point ${pointName}`);

  const generated = createGeneratedCsv(pointName, normalizedSeed);
  const csvPath = path.join(inputDir, generated.fileName);
  writeFileSync(csvPath, generated.csv, 'utf8');
  stepLog.push(`write generated csv ${generated.fileName}`);

  await page.getByRole('button', { name: '核对导入' }).click();
  await expect(page.getByTestId('document-import')).toHaveAttribute('data-flow-step', 'review-import');
  await expect(page.getByTestId('flow-case-banner')).toContainText('步骤 2/3');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿已生成，可进入数据检查');
  await expect(page.getByTestId('run-data-check')).toHaveText('运行数据检查');
  await expect(page.getByTestId('document-import').locator('.toolbar-button.primary')).toHaveCount(1);
  await page.getByTestId('import-file-input').setInputFiles(csvPath);
  await page.getByTestId('right-panel-show').click();

  await expect(page.getByTestId('flow-toast')).toContainText('导入草稿已生成');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿已生成，可进入数据检查');
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await expect(page.getByTestId('document-import').locator('.toolbar-button.primary')).toHaveCount(1);
  await expect(page.getByTestId('import-active-batch-name')).toHaveText(generated.fileName);
  await expect(page.getByTestId('parsed-import-result')).toContainText(`${generated.rowCount} 行`);
  await expect(page.getByTestId('parsed-import-result')).toContainText(pointName);
  await expect(page.getByTestId('import-field-mapping')).toContainText('PointName');
  await expect(page.getByTestId('import-field-mapping')).toContainText('DepthM');
  await expect(page.getByTestId('import-field-mapping')).toContainText('QcKpa');
  await expect(page.getByTestId('import-field-mapping')).toContainText('QtKpa');
  await expect(page.getByTestId('import-field-mapping')).toContainText('FsKpa');
  await expect(page.getByTestId('import-field-mapping')).toContainText('FrPercent');
  await expect(page.getByTestId('import-field-mapping')).toContainText('WaterDepthM');
  await expect(page.getByTestId('minimal-import-contract')).toContainText('普通路径只读取当前点位的实测列');
  await expect(page.getByTestId('import-problem-list')).toContainText('无问题');
  await expect(page.getByTestId('import-raw-preview')).toContainText('PointName');
  await expect(page.getByTestId('import-normalized-preview')).toContainText(generated.firstDepthLabel);
  await expect(page.getByTestId('import-readiness-dock')).toContainText('可检查');
  await page.getByTestId('import-field-picker').getByRole('button', { name: 'WaterDepthM' }).click();
  await expect(page.getByTestId('import-selected-field-dock')).toContainText('水深');
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-import-uploaded-1440x900.png'), fullPage: true });
  stepLog.push('upload csv and inspect mapping/preview');

  await completePreparationGuide(page);
  await page.getByTestId('right-panel-show').click();
  await expect(page.getByTestId('document-check')).toHaveAttribute('data-flow-step', 'run-check');
  await expect(page.getByTestId('flow-case-banner')).toContainText('步骤 3/3');
  await expect(page.getByTestId('check-summary')).toContainText('仅提示');
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成，可进入地层分层');
  await expect(page.getByTestId('check-summary')).toContainText('可继续，保留提示');
  await expect(page.getByTestId('check-issue-list')).toContainText('必需字段');
  await expect(page.getByTestId('check-issue-list')).toContainText('深度递增');
  await expect(page.getByTestId('check-issue-list')).toContainText('水深来源');
  await page.getByTestId('check-issue-check-water-depth-source').click();
  await expect(page.getByTestId('check-selected-issue')).toContainText('水深来源');
  await expect(page.getByTestId('check-selected-issue')).toContainText('仅提示');
  await expect(page.getByTestId('check-selected-issue')).toContainText('WaterDepthM');
  await expect(page.getByTestId('check-issue-detail-dock')).toContainText('WaterDepthM');
  await expect(page.getByTestId('check-issue-detail-dock')).toContainText('不影响进入地层分层');
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-check-selected-issue-1440x900.png'), fullPage: true });
  stepLog.push('inspect issue evidence and right dock');

  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.getByTestId('import-field-mapping')).toContainText('WaterDepthM');
  await expect(page.getByTestId('minimal-import-contract')).toContainText('水深与探头在点位上下文中确认');
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-return-import-waterdepth-1440x900.png'), fullPage: true });
  stepLog.push('return to import and locate field');

  await completePreparationGuide(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByTestId('flow-continue-stratification').click();
  await expect(page.getByTestId('right-panel-show')).toContainText('分层工具');
  await expect(page.getByTestId('stratification-document')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'flow-1-stratification-1920x1080.png'), fullPage: true });
  stepLog.push('rerun check and continue to stratification');

  const visibleText = await page.locator('body').innerText();
  for (const forbiddenTerm of [
    '测试解译',
    'runner',
    'registry',
    'stdout',
    'stderr',
    'Query',
    'Metrics',
    'Filter',
    'Breakdown',
    'Annotations',
    '无阻塞',
    '阻塞',
    '准入',
    '正式链路',
    '正式导出',
    '提交成果',
    '采纳成果',
    '最终报告',
    'CPT09',
    '营口',
  ]) {
    expect(visibleText).not.toContain(forbiddenTerm);
  }

  const overflowDetails = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('body *'));
    return candidates
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        const horizontalOverflow = element.scrollWidth > element.clientWidth + 2;
        const clippedVerticalContent = style.overflowY === 'hidden' && element.scrollHeight > element.clientHeight + 2;
        return horizontalOverflow || clippedVerticalContent;
      })
      .map((element) => ({
        tag: element.tagName,
        testId: element.dataset.testid ?? '',
        className: element.className,
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight],
      }));
  });

  const flowRun = {
    seed: normalizedSeed,
    rawSeed,
    caseId,
    pointName,
    generatedInput: {
      fileName: generated.fileName,
      path: csvPath,
      rowCount: generated.rowCount,
      waterDepthM: generated.waterDepthM,
      finalDepthM: generated.finalDepthM,
    },
    clickedIssue: 'check-water-depth-source',
    checkCounts: {
      issue: 0,
      notice: 2,
      passed: 3,
    },
    finalRoute: 'stratification',
    screenshots: [
      'flow-1-project-1440x900.png',
      'flow-1-import-uploaded-1440x900.png',
      'flow-1-check-selected-issue-1440x900.png',
      'flow-1-return-import-waterdepth-1440x900.png',
      'flow-1-stratification-1920x1080.png',
    ],
    stepLog,
    overflowCount: overflowDetails.length,
    overflowDetails,
    consoleErrors,
    pageErrors,
  };
  writeFileSync(path.join(evidenceDir, 'flow-run.json'), JSON.stringify(flowRun, null, 2), 'utf8');

  expect(overflowDetails).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('Project hub supports create, open, switch, rename, delete, and independent workflow state', async ({ page }) => {
  mkdirSync(projectEvidenceDir, { recursive: true });
  const rawSeed = String(Date.now() % 100000000);
  const projectA = `自动项目 A ${rawSeed}`;
  const projectB = `自动项目 B ${rawSeed}`;
  const renamedB = `自动项目 B 已重命名 ${rawSeed}`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-empty-state')).toContainText('暂无项目');
  await page.screenshot({ path: path.join(projectEvidenceDir, 'project-hub-empty-1440x900.png'), fullPage: true });
  stepLog.push('open empty project hub');

  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('create-project-error')).toContainText('请输入项目名称');
  stepLog.push('empty project name validation verified');

  await page.getByTestId('new-project-name').fill(projectA);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectA);
  await expect(page.getByTestId('document-project')).toBeVisible();
  await expect(page.getByTestId('project-current-point')).toContainText('待导入点位');
  await expect(page.getByTestId('project-first-look')).toContainText('暂无数据');
  await expect(page.getByTestId('project-primary-next')).toHaveText('导入 CPT/CPTU 数据');
  stepLog.push('create first project and enter fixed workflow');

  await page.getByTestId('explorer-import').click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await expect(page.getByTestId('import-first-look')).toContainText('当前项目还没有导入草稿');
  await expect(page.getByTestId('document-import').locator('.toolbar-button.primary')).toHaveCount(1);
  await expect(page.getByTestId('parsed-import-result')).toContainText('暂无 CPT/CPTU 数据');
  stepLog.push('first project route moved to import');

  await page.getByTestId('workspace-project-switcher').click();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await page.getByTestId('new-project-name').fill(projectB);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectB);
  await expect(page.getByTestId('document-project')).toBeVisible();
  stepLog.push('create second project and verify independent default route');

  await page.getByTestId('project-switch-list').getByRole('button', { name: projectA }).click();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectA);
  await expect(page.getByTestId('document-import')).toBeVisible();
  stepLog.push('switch back to first project and preserve import route');

  await page.getByTestId('project-switch-list').getByRole('button', { name: projectB }).click();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectB);
  await expect(page.getByTestId('document-project')).toBeVisible();
  stepLog.push('switch to second project and preserve its project route');

  await page.getByTestId('workspace-project-switcher').click();
  const projectBRow = page.getByTestId('project-list').locator('tbody tr').nth(1);
  await expect(projectBRow).toContainText(projectB);
  await projectBRow.getByRole('button', { name: /重命名/ }).click();
  await projectBRow.locator('input').fill('');
  await projectBRow.getByRole('button', { name: '确认' }).click();
  await expect(projectBRow).toContainText('请输入项目名称');
  stepLog.push('empty rename validation verified');
  await projectBRow.locator('input').fill(renamedB);
  await projectBRow.getByRole('button', { name: '确认' }).click();
  await expect(page.getByTestId('project-list')).toContainText(renamedB);
  await projectBRow.getByRole('button', { name: '打开' }).click();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(renamedB);
  await page.screenshot({ path: path.join(projectEvidenceDir, 'project-renamed-workflow-1440x900.png'), fullPage: true });
  stepLog.push('rename second project and verify workspace title');

  await page.getByTestId('workspace-project-switcher').click();
  const projectARow = page.getByTestId('project-list').locator('tbody tr').filter({ hasText: projectA });
  await projectARow.getByRole('button', { name: /删除/ }).click();
  await projectARow.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByTestId('project-list')).not.toContainText(projectA);
  stepLog.push('delete first project');

  const renamedBRow = page.getByTestId('project-list').locator('tbody tr').filter({ hasText: renamedB });
  await renamedBRow.getByRole('button', { name: /删除/ }).click();
  await renamedBRow.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByTestId('project-empty-state')).toContainText('暂无项目');
  await page.screenshot({ path: path.join(projectEvidenceDir, 'project-hub-after-delete-1440x900.png'), fullPage: true });
  stepLog.push('delete last project and return to empty state');

  writeFileSync(
    path.join(projectEvidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        seed: rawSeed,
        createdProjects: [projectA, projectB],
        renamedProject: renamedB,
        stepLog,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
    'utf8',
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('Data import contract handles templates and P0 exception states', async ({ page }) => {
  mkdirSync(exceptionInputDir, { recursive: true });
  const rawSeed = process.env.FLOW_1_RANDOM_SEED ?? String(Date.now() % 100000000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  const { pointName, seed } = await openImportPage(page, rawSeed);
  stepLog.push(`open import page for ${pointName}`);

  await expect(page.getByTestId('import-template-actions')).toContainText('下载空模板');
  await expect(page.getByTestId('import-template-actions')).toContainText('下载示例模板');
  await expect(page.getByTestId('import-template-actions')).toContainText('复制标准表头');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('detail-download-blank-template').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('jts-cpt-minimal-template.csv');
  stepLog.push('blank template download captured');

  const excelPath = path.join(exceptionInputDir, `${pointName}-pending-${seed}.xlsx`);
  writeFileSync(excelPath, 'placeholder excel payload', 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(excelPath);
  await expect(page.getByTestId('import-problem-import-parse-error')).toContainText('DI-E03');
  await expect(page.getByTestId('import-first-look')).toContainText('文件未导入，当前有效草稿已保留');
  await expect(page.getByTestId('import-primary-upload')).toBeVisible();
  await expect(page.getByTestId('document-import').locator('.toolbar-button.primary')).toHaveCount(1);
  stepLog.push('broken Excel recovery state verified');

  const txtPath = path.join(exceptionInputDir, `${pointName}-unsupported-${seed}.txt`);
  writeFileSync(txtPath, 'not a csv', 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(txtPath);
  await expect(page.getByTestId('import-problem-import-parse-error')).toContainText('DI-E02');
  await expect(page.getByTestId('import-first-look')).toContainText('文件未导入，当前有效草稿已保留');
  stepLog.push('unsupported file state verified');

  const missingDepthPath = path.join(exceptionInputDir, `${pointName}-missing-depth-${seed}.csv`);
  writeFileSync(missingDepthPath, createMissingDepthCsv(pointName), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(missingDepthPath);
  await expect(page.getByTestId('import-problem-missing-depthm')).toContainText('DI-E06');
  await expect(page.getByTestId('import-problem-list')).toContainText('缺少必需字段 DepthM');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿存在问题，暂不能检查');
  await expect(page.getByTestId('import-field-mapping')).toContainText('DepthM');
  await page.screenshot({ path: path.join(exceptionEvidenceDir, 'missing-depth-1440x900.png'), fullPage: true });
  stepLog.push('missing DepthM problem verified');

  const nonmonotonicPath = path.join(exceptionInputDir, `${pointName}-nonmonotonic-${seed}.csv`);
  writeFileSync(nonmonotonicPath, createNonmonotonicDepthCsv(pointName), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(nonmonotonicPath);
  await expect(page.getByTestId('import-problem-nonmonotonic-depth')).toContainText('DI-E13');
  await expect(page.getByTestId('import-problem-list')).toContainText('深度不递增');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿存在问题，暂不能检查');
  await page.screenshot({ path: path.join(exceptionEvidenceDir, 'nonmonotonic-depth-1440x900.png'), fullPage: true });
  stepLog.push('nonmonotonic depth problem verified');

  const depthExceedsPath = path.join(exceptionInputDir, `${pointName}-depth-exceeds-${seed}.csv`);
  writeFileSync(depthExceedsPath, createDepthExceedsFinalCsv(pointName), 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(depthExceedsPath);
  await expect(page.getByTestId('import-problem-depth-exceeds-final')).toHaveCount(0);
  await expect(page.getByTestId('import-field-mapping')).toContainText('FinalDepthM');
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  stepLog.push('final depth column retained only as an attachment');

  const mismatchPointName = `AUTO-MISMATCH-${seed}`;
  const mismatchPath = path.join(exceptionInputDir, `${mismatchPointName}-point-mismatch-${seed}.csv`);
  writeFileSync(mismatchPath, createGeneratedCsv(mismatchPointName, seed).csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(mismatchPath);
  await expect(page.getByTestId('import-problem-point-mismatch')).toContainText('DI-E10');
  await expect(page.getByTestId('point-decision-actions')).toContainText('作为新点位草稿');
  await page.getByTestId('point-decision-new').click();
  await expect(page.getByTestId('parsed-import-result')).toContainText('可检查');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿已生成，可进入数据检查');
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await page.screenshot({ path: path.join(exceptionEvidenceDir, 'point-mismatch-resolved-1440x900.png'), fullPage: true });
  stepLog.push('advanced point mismatch recovery verified');

  writeFileSync(
    path.join(exceptionEvidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        seed,
        pointName,
        cases: ['template-download', 'excel-pending', 'unsupported-file', 'missing-depth', 'nonmonotonic-depth', 'depth-exceeds-final', 'point-mismatch'],
        stepLog,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
    'utf8',
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('Data check becomes stale after a new import draft is uploaded', async ({ page }) => {
  mkdirSync(staleInputDir, { recursive: true });
  const rawSeed = process.env.FLOW_1_RANDOM_SEED ?? String(Date.now() % 100000000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  const { pointName, seed } = await openImportPage(page, rawSeed);
  const first = createGeneratedCsv(pointName, `${seed}1`);
  const firstPath = path.join(staleInputDir, first.fileName);
  writeFileSync(firstPath, first.csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(firstPath);
  await expect(page.getByTestId('run-data-check')).toBeEnabled();
  await completePreparationGuide(page);
  await expect(page.getByTestId('document-check')).toBeVisible();
  await expect(page.getByTestId('check-summary')).toContainText('仅提示');
  stepLog.push('initial check passed');

  await page.getByTestId('explorer-import').click();
  const second = createGeneratedCsv(pointName, `${seed}2`);
  const secondPath = path.join(staleInputDir, second.fileName);
  writeFileSync(secondPath, second.csv, 'utf8');
  await page.getByTestId('import-file-input').setInputFiles(secondPath);
  await expect(page.getByTestId('parsed-import-result')).toContainText('需重新检查');
  await expect(page.getByTestId('import-first-look')).toContainText('导入草稿已更新，需要重新检查');
  await expect(page.getByTestId('run-data-check')).toHaveText('重新运行数据检查');
  await expect(page.getByTestId('document-import').locator('.toolbar-button.primary')).toHaveCount(1);
  await page.screenshot({ path: path.join(staleEvidenceDir, 'import-needs-recheck-1440x900.png'), fullPage: true });
  stepLog.push('new draft marks previous check stale');

  await page.getByTestId('explorer-check').click();
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-issue-list')).toContainText('导入草稿已变更');
  await expect(page.getByTestId('check-summary')).toContainText('需重新检查');
  await expect(page.getByTestId('check-first-look')).toContainText('导入草稿已更新，需要重新检查');
  await expect(page.getByTestId('flow-continue-stratification')).toHaveCount(0);
  await page.screenshot({ path: path.join(staleEvidenceDir, 'check-stale-1440x900.png'), fullPage: true });
  stepLog.push('stale check blocks stratification');

  await page.getByTestId('explorer-import').click();
  await completePreparationGuide(page);
  await expect(page.getByTestId('check-summary')).toContainText('仅提示');
  await expect(page.getByTestId('flow-continue-stratification')).toBeEnabled();
  stepLog.push('rerun check restores continuation');

  writeFileSync(
    path.join(staleEvidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        seed,
        pointName,
        firstInput: firstPath,
        secondInput: secondPath,
        stepLog,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
    'utf8',
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('Data check quality gate handles not-run, filters, evidence, history, and rerun', async ({ page }) => {
  mkdirSync(qualityGateEvidenceDir, { recursive: true });
  const rawSeed = process.env.FLOW_1_RANDOM_SEED ?? String(Date.now() % 100000000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?flow=1&case=random&seed=${rawSeed}`);
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  const bannerText = (await page.getByTestId('flow-case-banner').textContent()) ?? '';
  const seed = bannerText.match(/seed\s+(\d+)/)?.[1] ?? rawSeed;
  const pointName = (await page.getByTestId('project-current-point').innerText()).trim();
  stepLog.push(`open random workspace ${seed} / ${pointName}`);

  await page.getByTestId('explorer-check').click();
  await expect(page.getByTestId('document-check')).toBeVisible();
  await page.getByTestId('check-toggle-advanced').click();
  await expect(page.getByTestId('check-summary')).toContainText('未检查');
  await expect(page.getByTestId('check-first-look')).toContainText('当前导入草稿尚未检查');
  await expect(page.getByTestId('document-check').locator('.toolbar-button.primary')).toHaveCount(1);
  await expect(page.getByTestId('check-issue-list')).toContainText('尚未运行检查');
  await expect(page.getByTestId('check-run-history')).toContainText('暂无检查记录');
  await expect(page.getByTestId('flow-continue-stratification')).toHaveCount(0);
  await expect(page.getByTestId('check-rerun')).toBeEnabled();
  await page.screenshot({ path: path.join(qualityGateEvidenceDir, 'check-not-run-1440x900.png'), fullPage: true });
  stepLog.push('direct check route shows not-run quality gate');

  await page.getByTestId('check-rerun').click();
  await expect(page.getByTestId('check-summary')).toContainText('仅提示');
  await expect(page.getByTestId('check-first-look')).toContainText('检查完成，可进入地层分层');
  await expect(page.getByTestId('check-run-history')).toContainText('第 1 次');
  await expect(page.getByTestId('check-scope')).toBeVisible();
  await expect(page.getByTestId('flow-continue-stratification')).toBeEnabled();
  stepLog.push('run data check from check page and create history');

  await page.getByTestId('check-filter-notice').click();
  const noticeRows = page.getByTestId('check-issue-list').locator('[data-testid^="check-issue-"]');
  await expect(noticeRows.first()).toBeVisible();
  await noticeRows.first().click();
  await expect(page.getByTestId('check-selected-issue')).toBeVisible();
  await page.screenshot({ path: path.join(qualityGateEvidenceDir, 'check-notice-evidence-1440x900.png'), fullPage: true });
  stepLog.push('filter notice and inspect water-depth evidence rows');

  await page.getByTestId('check-filter-passed').click();
  await expect(page.getByTestId('check-issue-check-required-fields')).toBeVisible();
  await expect(page.getByTestId('check-issue-check-continue-stratification')).toBeVisible();
  stepLog.push('filter passed rules');

  await page.getByTestId('check-filter-issue').click();
  await expect(page.getByTestId('check-issue-list').locator('[data-testid^="check-issue-"]')).toHaveCount(0);
  await expect(page.getByTestId('check-selected-issue')).toContainText('选择规则后查看对应数据行');
  stepLog.push('filter issue state with no current problems');

  await page.getByTestId('check-rerun-secondary').click();
  await expect(page.getByTestId('check-run-history').locator('tbody tr')).toHaveCount(2);
  await page.screenshot({ path: path.join(qualityGateEvidenceDir, 'check-rerun-history-1440x900.png'), fullPage: true });
  stepLog.push('rerun from right dock and append history record');

  writeFileSync(
    path.join(qualityGateEvidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        seed,
        pointName,
        stepLog,
        screenshots: ['check-not-run-1440x900.png', 'check-notice-evidence-1440x900.png', 'check-rerun-history-1440x900.png'],
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
    'utf8',
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

async function openImportPage(page: Page, rawSeed: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/?flow=1&case=random&seed=${rawSeed}`);
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  const bannerText = (await page.getByTestId('flow-case-banner').textContent()) ?? '';
  const seed = bannerText.match(/seed\s+(\d+)/)?.[1] ?? rawSeed;
  const pointName = (await page.getByTestId('project-current-point').innerText()).trim();
  await page.getByTestId(`project-point-${pointName}`).click();
  await page.getByRole('button', { name: '核对导入' }).click();
  await expect(page.getByTestId('document-import')).toHaveAttribute('data-flow-step', 'review-import');
  return { pointName, seed };
}
