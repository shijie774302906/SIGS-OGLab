# Process020 - Web-P2 Full Workflow Feature Development Plan

Date: 2026-07-09

Status: `planned / awaiting implementation`

## Trigger

The user asked to write all functions into the development plan and start development, beginning with a clear plan and workflow.

## Requirement Summary

Goal:

- Move the web prototype from a stratification-centered prototype to a six-step usable workflow prototype.

Workflow:

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

Scope:

- Web prototype only.
- Local sample data only.
- Browser state and mock interactions.
- Build usable workbench screens, inspectors, bottom details, and status gates.

Non-goals:

- No desktop repo edits.
- No desktop `app_data`.
- No SQLite schema changes.
- No official algorithm implementation.
- No real export.
- No backend persistence.

Implementation may start: yes, with Slice 1.

## Deliverables

- Updated `plan.md` with Web-P2 current addendum, confirmed requirement, workflow, execution checklist, and stop conditions.
- Added `docs/prototype/web-p2-feature-development-plan-2026-07-09.md`.
- Updated `Process.md`.
- Added this process log.

## Planned Slices

1. App state and data foundation.
2. `项目/点位数据` page.
3. `数据导入` page.
4. `数据检查` page.
5. `地层分层` deepening.
6. `参数解译` page.
7. `成果输出` page.
8. Cross-flow QA and three-agent rereview.

## Verification Plan

For every implementation slice:

- `npm.cmd run build`
- `npm.cmd run test:e2e`
- Playwright MCP screenshots and console checks when UI/workflow changes materially
- Update `Process.md` and `process_logs/`

For major UI slices:

- Run `Visual Layout Taste Auditor`
- Run `Geotechnical Domain Reviewer`
- Run `Copy IA Mobbin Challenger`
- Fix P0/P1 before closure.

## Boundaries

- No files under `D:\CPT-UIQA` were changed.
- No runtime desktop data was read.
- No new dependency was installed.
- This is a planning slice only; feature implementation has not yet started.

## Next

Start Slice 1:

- centralize route metadata
- add local sample-data selectors
- add browser-level selected object state
- add reusable status helpers
- keep current UI behavior intact while preparing for the six workflow pages
