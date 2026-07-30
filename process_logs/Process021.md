# Process021 - Web-P2 Slice 1 Data And State Foundation

Date: 2026-07-09

Status: `closed / verified`

## User Goal

以营口 CPTU 样例数据为主线，完成 Web-P2 Slice 1-9。当前切片先完成 Slice 1：数据与状态底座，为后续六步功能页面提供统一 route metadata、样例数据 selector 和浏览器内选择状态。

## Scope

- Only modify `D:\CPT-UIQA-WebPrototype`.
- Use local sample data under `sample_data/`.
- Preserve current UI behavior while preparing reusable state/data selectors.
- Keep official formulas, desktop persistence, SQLite schema, real export, and desktop repo changes out of scope.

## Completed

- Added `src/workflowData.ts`.
- Centralized:
  - `RouteId`, `BottomTab`, layer/boundary/scheme types.
  - workflow route metadata and `routeTitle`.
  - Yingkou project/point context and `pointScope`.
  - default workflow selection state.
- Aggregated Yingkou sample data:
  - stratification bundle
  - parameter scheme bundle
  - output package
  - method-lab input
  - method-lab bad check scenarios
- Added selectors/helpers:
  - layer scheme, layer, boundary
  - parameter scheme and parameter slot
  - output item
  - project/point summary
  - import field mappings
  - import preview rows
  - check issues
  - route status
- Updated `src/App.tsx` to consume the shared data foundation instead of importing the stratification JSON directly.
- Updated `plan.md`.
- Updated `docs/prototype/web-p2-feature-development-plan-2026-07-09.md` and added Slice 9 completion audit.
- Updated `Process.md`.

## Verification

```powershell
npm.cmd run build
```

Result: passed.

```powershell
npm.cmd run test:e2e
```

Result: passed, 2 tests.

## Browser / Visual Notes

This slice is a data/state refactor and does not intentionally change page layout. Playwright MCP screenshot evidence remains required for later UI slices and final Slice 8/9 closure.

## Boundary

- No files under `D:\CPT-UIQA` were modified.
- No desktop `app_data` was read or written.
- No SQLite schema or persistence behavior was touched.
- No official CPT/CPTU formula or SBT/SBTn production classifier was implemented.
- No real export behavior was implemented.
- No new dependency was installed.

## Residual Risk

- `App.tsx` still contains most visual components. Slice 2 should start extracting richer route-specific page sections only after the shared selectors are used in visible page content.
- Playwright MCP screenshots are not attached to this slice because the layout did not materially change; they must resume for Slice 2 and later UI work.

## Next

Start Slice 2: replace the lightweight `项目/点位数据` placeholder with a usable project/point page using `getProjectPointSummary()` and route-aware bottom/right-panel details.
