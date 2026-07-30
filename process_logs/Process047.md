# Process047 - 新建项目与项目集合

Date: 2026-07-09

Status: `closed / implemented / verified`

## Scope

Current slice:

```text
新建项目与项目集合
```

Primary contract:

- `docs/prototype/新建项目与项目集合事件合同.md`

Covered events:

- PRJ-E01: 空项目集合。
- PRJ-E02: 新建项目名称为空。
- PRJ-E03: 新建项目成功。
- PRJ-E04: 多项目列表。
- PRJ-E05: 打开项目。
- PRJ-E06: 切换项目。
- PRJ-E07: 重命名为空。
- PRJ-E08: 重命名成功。
- PRJ-E09 / PRJ-E10 / PRJ-E11: 删除项目和删除最后项目。
- PRJ-E12: 每项目独立工作流状态。

## Implementation

- Added a project lifecycle contract at `docs/prototype/新建项目与项目集合事件合同.md`.
- Rewrote `plan.md` for the active project lifecycle slice.
- Added `ProjectWorkspace` as the container for each project's independent workflow state:
  - `flowCase`
  - `importDraft`
  - `selectedMappingField`
  - `importFocusField`
  - `checkRunId`
  - `checkedDraftVersion`
  - `flowFeedback`
  - `selection`
- Added a default project hub at the root path:
  - empty state
  - project creation
  - project list
  - open project
  - rename project
  - delete project with confirmation
  - project collection dock
- Kept existing Flow 1 verification compatibility by auto-opening a demo project when URL query includes `flow`, `case=random`, or `seed`.
- Added workspace switching:
  - click the current project switcher to return to the project hub
  - when multiple projects exist, the left rail exposes quick project switching
- New user projects start with no CPT/CPTU data and show an empty data state in the fixed workflow.
- Demo projects keep generated CPTU data for the existing upload/check Playwright flows.

## Verification

Commands:

```powershell
npm.cmd run test:e2e
npm.cmd run build
```

Results:

- `npm.cmd run test:e2e` passed: 5 tests.
- `npm.cmd run build` passed.

Playwright coverage:

- Empty project hub.
- Empty project name validation.
- Create first project and enter fixed workflow.
- Move first project to `数据导入`.
- Create second project and verify its default route is independent.
- Switch back to first project and verify it preserves `数据导入`.
- Switch to second project and verify it preserves `项目/点位数据`.
- Empty rename validation.
- Rename second project and verify workspace title.
- Delete first project.
- Delete last project and return to empty state.

Evidence:

- `process_logs/playwright-mcp/project-lifecycle/flow-run.json`
- `process_logs/playwright-mcp/project-lifecycle/project-hub-empty-1440x900.png`
- `process_logs/playwright-mcp/project-lifecycle/project-renamed-workflow-1440x900.png`
- `process_logs/playwright-mcp/project-lifecycle/project-hub-after-delete-1440x900.png`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Project collection is browser state only.
- Complex project metadata such as site, owner, coordinate system, and engineering phase remains out of scope.

## Next

- Decide whether project data should persist to localStorage for longer prototype sessions.
- Decide how imported point records should appear back in `项目/点位数据` after the first upload.
- Continue refining the first page as the current project's CPT/CPTU data situation overview.
