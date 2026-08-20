import { expect, resetWorkspaceAuthority, test, type Page } from './fixtures/isolatedTest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PROJECT_STORAGE_KEY } from '../../src/features/projects/projectStorage';

const evidenceDir = path.join(process.cwd(), 'process_logs', 'playwright-mcp', 'project-local-persistence');

test('local projects survive refresh, preserve routes, isolate Flow, and clear with confirmation', async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const seed = String(Date.now() % 100000000);
  const projectA = `持久化项目 A ${seed}`;
  const projectB = `持久化项目 B ${seed}`;
  const renamedB = `持久化项目 B 已重命名 ${seed}`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const stepLog: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await resetWorkspaceAuthority(page, { reload: false });
  await page.reload();

  await createProject(page, projectA);
  await page.getByTestId('explorer-import').click();
  await waitForStoredProject(page, projectA, 'import');
  await page.getByTestId('workspace-project-switcher').click();
  await createProject(page, projectB);
  await waitForStoredProject(page, projectB, 'project');
  stepLog.push('created two projects with different active routes');

  await page.reload();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectB);
  await expect(page.getByTestId('document-project')).toBeVisible();
  await page.getByTestId('project-switch-list').getByRole('button', { name: projectA }).click();
  await expect(page.getByTestId('document-import')).toBeVisible();
  await waitForStoredProject(page, projectA, 'import');
  await page.screenshot({ path: path.join(evidenceDir, 'projects-restored-1440x900.png'), fullPage: true });
  stepLog.push('refresh restored active project and independent routes');

  const savedBeforeFlow = await readV2WorkspaceFingerprint(page);
  await page.goto(`/?flow=1&case=random&seed=${seed}`);
  await expect(page.getByTestId('workbench-root')).toBeVisible();
  await page.getByTestId('explorer-check').click();
  const savedAfterFlow = await readV2WorkspaceFingerprint(page);
  expect(savedAfterFlow).toBe(savedBeforeFlow);
  await page.goto('/');
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectA);
  await expect(page.getByTestId('document-import')).toBeVisible();
  stepLog.push('deterministic Flow did not read or overwrite saved user projects');

  await page.getByTestId('workspace-project-switcher').click();
  await expect(page.getByTestId('project-list').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('clear-local-projects')).toBeEnabled();
  await page.screenshot({ path: path.join(evidenceDir, 'project-hub-persisted-1440x900.png'), fullPage: true });
  const layout1440 = await readProjectHubLayout(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(evidenceDir, 'project-hub-persisted-1920x1080.png'), fullPage: true });
  const layout1920 = await readProjectHubLayout(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  writeFileSync(
    path.join(evidenceDir, 'browser-check.json'),
    JSON.stringify({ viewports: [layout1440, layout1920], consoleErrors, pageErrors }, null, 2),
    'utf8',
  );
  for (const layout of [layout1440, layout1920]) {
    expect(layout).toMatchObject({
      mainHorizontalOverflow: false,
      dockHorizontalOverflow: false,
      projectCount: 2,
      clearActionVisible: true,
    });
  }
  const projectBRow = page.getByTestId('project-list').locator('tbody tr').filter({ hasText: projectB });
  await projectBRow.getByRole('button', { name: /重命名/ }).click();
  await page.getByTestId('project-list').locator('input').fill(renamedB);
  await page.getByTestId('project-list').getByRole('button', { name: '确认' }).click();
  await expect(page.getByTestId('project-list')).toContainText(renamedB);
  await waitForStoredProject(page, renamedB, 'project');
  await page.reload();
  await expect(page.getByTestId('project-list')).toContainText(renamedB);
  stepLog.push('rename survived refresh');

  await page.getByTestId('clear-local-projects').click();
  await expect(page.getByTestId('clear-local-projects-confirmation')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'full-reset-confirmation-1440x900.png'), fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(evidenceDir, 'full-reset-confirmation-1920x1080.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('clear-local-projects-cancel').click();
  await expect(page.getByTestId('project-list')).toContainText(projectA);
  await page.getByTestId('clear-local-projects').click();
  await page.getByTestId('clear-local-projects-confirm').click();
  await expect(page.getByTestId('project-empty-state')).toContainText('暂无项目');
  await expect.poll(() => readLocalResetState(page)).toEqual({
    loadStatus: 'empty',
    bootPointer: null,
    legacySnapshot: null,
    storeCounts: { manifests: 0, dataBlocks: 0, migrations: 0, metadata: 0 },
  });
  await page.reload();
  await expect(page.getByTestId('project-empty-state')).toContainText('暂无项目');
  await expect.poll(() => readLocalResetState(page)).toMatchObject({ loadStatus: 'empty', bootPointer: null, legacySnapshot: null });
  await page.screenshot({ path: path.join(evidenceDir, 'projects-cleared-1440x900.png'), fullPage: true });
  stepLog.push('clear cancellation preserved projects; confirmation deleted every V3 store and related local pointers');

  writeFileSync(
    path.join(evidenceDir, 'flow-run.json'),
    JSON.stringify(
      {
        seed,
        projects: [projectA, projectB],
        renamedProject: renamedB,
        stepLog,
        screenshots: [
          'projects-restored-1440x900.png',
          'project-hub-persisted-1440x900.png',
          'project-hub-persisted-1920x1080.png',
          'full-reset-confirmation-1440x900.png',
          'full-reset-confirmation-1920x1080.png',
          'projects-cleared-1440x900.png',
        ],
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

test('damaged and unsupported V1 snapshots remain preserved while the new workspace starts clean', async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await resetWorkspaceAuthority(page, { reload: false });
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [PROJECT_STORAGE_KEY, '{broken']);
  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-storage-notice')).toContainText('发现旧版浏览器数据');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PROJECT_STORAGE_KEY)).toBe('{broken');
  await page.screenshot({ path: path.join(evidenceDir, 'damaged-storage-recovery-1440x900.png'), fullPage: true });

  const unsupported = JSON.stringify({
    schema: 'sigs-oglab.project-collection',
    version: 99,
    savedAt: '2026-07-10T00:00:00.000Z',
    state: { projects: [], activeProjectId: null },
  });
  await resetWorkspaceAuthority(page, { reload: false });
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [PROJECT_STORAGE_KEY, unsupported]);
  await page.reload();
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await expect(page.getByTestId('project-storage-notice')).toContainText('发现旧版浏览器数据');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PROJECT_STORAGE_KEY)).toBe(unsupported);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('damaged V2 manifest stops startup and remains stored until confirmed reset', async ({ page }) => {
  await page.goto('/');
  await resetWorkspaceAuthority(page, { reload: false });
  await page.reload();
  await createProject(page, 'V2 损坏恢复项目');
  await waitForStoredProject(page, 'V2 损坏恢复项目', 'project');

  const corruptedManifestId = await page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    return new Promise<string>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['metadata', 'manifests'], 'readwrite');
        const metadataRequest = transaction.objectStore('metadata').get('active-manifest-id');
        metadataRequest.onsuccess = () => {
          const manifestId = (metadataRequest.result as { value: string }).value;
          const manifestRequest = transaction.objectStore('manifests').get(manifestId);
          manifestRequest.onsuccess = () => {
            const manifest = manifestRequest.result as { state: { activeProjectId: string | null } };
            manifest.state.activeProjectId = 'missing-project-after-corruption';
            transaction.objectStore('manifests').put(manifest);
            transaction.oncomplete = () => {
              db.close();
              resolve(manifestId);
            };
          };
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  });

  await page.reload();
  await expect(page.getByTestId('workspace-v2-recovery')).toBeVisible();
  const preserved = await page.evaluate(async (manifestId) => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    return new Promise<boolean>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('manifests', 'readonly');
        const manifestRequest = transaction.objectStore('manifests').get(manifestId);
        manifestRequest.onsuccess = () => {
          db.close();
          resolve(Boolean(manifestRequest.result));
        };
        manifestRequest.onerror = () => reject(manifestRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, corruptedManifestId);
  expect(preserved).toBe(true);

  await page.getByTestId('workspace-v2-reset').click();
  await page.getByTestId('workspace-v2-reset-confirm').click();
  await expect(page.getByTestId('project-empty-state')).toBeVisible();
});

test('a stale tab freezes after conflict and cannot overwrite the newer manifest', async ({ page }) => {
  const originalName = '并发项目';
  const firstTabName = '并发项目 A 已更新';
  const staleTabName = '并发项目 B 旧更新';
  await page.goto('/');
  await resetWorkspaceAuthority(page, { reload: false });
  await page.reload();
  await createProject(page, originalName);
  await page.getByTestId('workspace-project-switcher').click();
  await waitForStoredProject(page, originalName, 'project');

  const stalePage = await page.context().newPage();
  await stalePage.goto('/');
  await expect(stalePage.getByTestId('project-hub')).toBeVisible();

  const firstRow = page.getByTestId('project-list').locator('tbody tr').filter({ hasText: originalName });
  await firstRow.getByRole('button', { name: /重命名/ }).click();
  await page.getByTestId('project-list').locator('input').fill(firstTabName);
  await page.getByTestId('project-list').getByRole('button', { name: '确认' }).click();
  await waitForStoredProject(page, firstTabName, 'project');

  const staleRow = stalePage.getByTestId('project-list').locator('tbody tr').filter({ hasText: originalName });
  await staleRow.getByRole('button', { name: /重命名/ }).click();
  await stalePage.getByTestId('project-list').locator('input').fill(staleTabName);
  await stalePage.getByTestId('project-list').getByRole('button', { name: '确认' }).click();
  await stalePage.getByTestId('new-project-name').fill('B 标签后续项目');
  await stalePage.getByTestId('project-mode-professional').click(); await stalePage.getByTestId('create-project-submit').click();
  await expect(stalePage.getByTestId('project-storage-workspace-notice')).toContainText('已停止自动保存');
  await expect.poll(() => readStoredProjectNames(page)).toEqual([firstTabName]);
  await stalePage.close();
});

async function createProject(page: Page, projectName: string) {
  await expect(page.getByTestId('project-hub')).toBeVisible();
  await page.getByTestId('new-project-name').fill(projectName);
  await page.getByTestId('project-mode-professional').click(); await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('workspace-project-switcher')).toContainText(projectName);
}

async function waitForStoredProject(page: Page, projectName: string, route: string) {
  await expect
    .poll(() =>
      page.evaluate(async (name) => {
        const database = await import('/src/features/workspace/workspaceDatabase.ts');
        const loaded = await database.loadActiveWorkspaceV2();
        if (!loaded.ok) return null;
        const project = loaded.manifest.state.projects.find((candidate) => candidate.projectName === name);
        if (!project) return null;
        const raw = localStorage.getItem(`sigs-oglab:legacy-ui-state:v1:${project.projectId}`);
        if (!raw) return project.activeRoute;
        try {
          const snapshot = JSON.parse(raw) as { pointId?: string; selection?: { activeRoute?: string } };
          return snapshot.pointId === (project.activePointId ?? '')
            ? snapshot.selection?.activeRoute ?? project.activeRoute
            : project.activeRoute;
        } catch {
          return project.activeRoute;
        }
      }, projectName),
    )
    .toBe(route);
}

async function readV2WorkspaceFingerprint(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    if (!loaded.ok) return null;
    return JSON.stringify({
      manifest: loaded.manifest,
      blocks: loaded.dataBlocks,
      migrationRecord: loaded.migrationRecord,
      bootPointer: localStorage.getItem(database.WORKSPACE_BOOT_POINTER_KEY),
      legacySnapshot: localStorage.getItem('sigs-oglab.project-collection.v1'),
    });
  });
}

async function readStoredProjectCount(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    return loaded.ok ? loaded.manifest.state.projects.length : null;
  });
}

async function readLocalResetState(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    const storeCounts = await new Promise<{ manifests: number; dataBlocks: number; migrations: number; metadata: number }>((resolve, reject) => {
      const request = indexedDB.open(database.WORKSPACE_DATABASE_NAME, database.WORKSPACE_DATABASE_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['manifests', 'data-blocks', 'migration-records', 'metadata'], 'readonly');
        const names = [
          ['manifests', 'manifests'],
          ['dataBlocks', 'data-blocks'],
          ['migrations', 'migration-records'],
          ['metadata', 'metadata'],
        ] as const;
        const counts = { manifests: 0, dataBlocks: 0, migrations: 0, metadata: 0 };
        let remaining = names.length;
        for (const [key, store] of names) {
          const countRequest = transaction.objectStore(store).count();
          countRequest.onerror = () => reject(countRequest.error);
          countRequest.onsuccess = () => {
            counts[key] = countRequest.result;
            remaining -= 1;
            if (!remaining) {
              db.close();
              resolve(counts);
            }
          };
        }
      };
    });
    return {
      loadStatus: loaded.ok ? 'ready' : loaded.reason,
      bootPointer: localStorage.getItem(database.WORKSPACE_BOOT_POINTER_KEY),
      legacySnapshot: localStorage.getItem('sigs-oglab.project-collection.v1'),
      storeCounts,
    };
  });
}

async function readStoredProjectNames(page: Page) {
  return page.evaluate(async () => {
    const database = await import('/src/features/workspace/workspaceDatabase.ts');
    const loaded = await database.loadActiveWorkspaceV2();
    return loaded.ok ? loaded.manifest.state.projects.map((project) => project.projectName) : [];
  });
}

async function readProjectHubLayout(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.project-hub-main');
    const dock = document.querySelector<HTMLElement>('[data-testid="project-hub-dock"]');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      mainHorizontalOverflow: main ? main.scrollWidth > main.clientWidth + 2 : true,
      dockHorizontalOverflow: dock ? dock.scrollWidth > dock.clientWidth + 2 : true,
      projectCount: document.querySelectorAll('[data-testid="project-list"] tbody tr').length,
      clearActionVisible: Boolean(
        document.querySelector<HTMLElement>('[data-testid="clear-local-projects"]')?.getBoundingClientRect().height,
      ),
    };
  });
}
