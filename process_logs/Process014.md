# Process014 - Mixpanel-Inspired Workbench Refactor

Date: 2026-07-08

Status: `closed / verified`

## Trigger

The user asked to fully reference Mixpanel's style, color, flow, and layout while adapting it to the offshore wind geotechnical interpretation workflow.

## Mobbin References

Screens:

- Mixpanel analytics workspace: https://mobbin.com/screens/10d76bb3-6f65-4805-ad42-30ee24ec78e2
- Mixpanel report workspace: https://mobbin.com/screens/55fc4611-f390-44c5-a722-30c74789c6d2
- Additional Mixpanel report screens downloaded under `process_logs/mobbin-research/2026-07-08/`.

Flows:

- Mixpanel filtering a report: https://mobbin.com/flows/119b245f-160d-4308-bbb4-04403ceaf5a7
- Mixpanel creating a report: https://mobbin.com/flows/46ced5e4-fdc6-4bd5-b3d2-558ae7861806
- Mixpanel insights: https://mobbin.com/flows/f6df1208-d264-4e97-8e20-6028e7b4a080

## Design Mapping

Mixpanel pattern:

```text
left product navigation -> report canvas with controls/chart/table -> right Query panel
```

Prototype mapping:

```text
workflow navigation -> 地层分层 report canvas with controls/evidence/table -> 分层 Query panel
```

Key choices:

- Use Mixpanel purple as the product accent.
- Keep the report canvas white and quiet.
- Move scheme selection into the right Query panel.
- Put `Metrics`, `Filter`, `Breakdown`, current layer, preflight, and annotations in the right panel.
- Keep bottom tabs for quality/log/output precheck, but reduce their visual weight.
- Do not copy Mixpanel product language, subscription UI, or irrelevant analytics objects.

## Implementation

Files changed:

- `src/App.tsx`
- `src/styles.css`
- `plan.md`
- `Process.md`
- `process_logs/Process014.md`

Main UI changes:

- Left Explorer restyled as a Mixpanel-like product sidebar with workspace switcher, purple primary action, search row, and workflow navigation.
- `地层分层` page restyled as a report workspace:
  - compact report header
  - Mixpanel-like control chips
  - warning notice
  - metric strip
  - chart/evidence canvas
  - view switch dots
  - dense breakdown table
- Right panel changed to Query/Chart/Annotations tabs.
- Scheme selection moved from the center canvas into the Query panel.
- Color system switched from blue engineering accent to Mixpanel-inspired purple.

## Verification

Commands:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run test:e2e
```

Results:

- `npm run build`: passed.
- `npm run test:e2e`: passed, 2 tests.

Playwright MCP:

- Opened `http://127.0.0.1:5173/`.
- Captured `1440x900` screenshot.
- Selected `自动分层候选 A` in the right Query panel.
- Selected layer `L2`.
- Switched bottom panel to `成果预检`.
- Captured interaction screenshot at `1440x900`.
- Captured `1920x1080` screenshot.
- Checked forbidden terms: none found.
- Checked `.top-chrome`, `.activity-bar`, `.status-bar`: not present.
- Console warnings/errors: 0 warnings, 0 errors.

Evidence:

- `process_logs/playwright-mcp/mixpanel-refactor/mixpanel-refactor-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-refactor/mixpanel-refactor-interaction-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-refactor/mixpanel-refactor-1920x1080.png`
- `process_logs/playwright-mcp/mixpanel-refactor/snapshot-1440x900.md`
- `process_logs/playwright-mcp/mixpanel-refactor/snapshot-1920x1080.md`
- `process_logs/playwright-mcp/mixpanel-refactor/console-warnings.md`
- `process_logs/playwright-mcp/mixpanel-refactor/console-errors.md`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- No new dependency was installed.
- No official save/adopt/export behavior was introduced.

## Next

The next useful slice is to make `数据导入` and `数据检查` follow Mixpanel-style report/filter flows:

- import mapping as a report configuration flow
- issue filtering through the right Query panel
- annotations as review comments on depth/layer evidence
