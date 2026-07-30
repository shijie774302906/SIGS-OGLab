# Process032 - Strict Mobbin Mixpanel Visual Audit

Date: 2026-07-09

Status: closed / audit documented

## Trigger

User confirmed that the prototype should visually move closer to Mixpanel, not merely borrow general structure. The requested first step was to write the prompt and workflow into the latest `plan.md`, refine them, then start the audit.

## Boundary

- No UI implementation in this slice.
- No component-library migration.
- No formal save/create/export behavior is promised.
- No desktop repo files are changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior is touched.

## Plan Update

Updated `plan.md` with:

- User goal.
- Strict audit prompt.
- Six-phase workflow.
- Scope, non-goals, verification, and stop conditions.
- Current evidence and audit closure checklist.

## Evidence Collected

Current UI:

- `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1920x1080.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-stratification-interaction-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-browser-check.json`

Mobbin Mixpanel:

- `process_logs/playwright-mcp/strict-mixpanel-audit/mobbin-mixpanel-references.json`
- Downloaded Mixpanel screen and flow images under `process_logs/playwright-mcp/strict-mixpanel-audit/`.

Browser check:

- Console errors: `0`
- Page errors: `0`
- Current flags: `hasGlobalTopNav=true`, `hasEditorTabs=true`, `hasBottomPanel=true`

## Report

Created:

- `docs/prototype/strict-mixpanel-visual-audit-2026-07-09.md`

Main judgment:

- The current UI is functionally coherent for the geotechnical workflow.
- Visually, it is still a hybrid of VSCode-like workbench, enterprise admin page, and Mixpanel-inspired report canvas.
- Current Mixpanel closeness score: `2.4 / 5`.
- The largest gap is structural: full-width top nav, editor tab row, and permanent bottom panel prevent the shell from reading as a Mixpanel-style report builder.

## P0 Summary

- `P0-1`: Shell structure blocks the Mixpanel target.
- `P0-2`: Center still reads as tool chrome around a document, not report canvas.

## Next Recommended Slice

```text
Strict Mixpanel Shell Refactor
1. Convert root grid to sidebar / center canvas / right panel.
2. Remove default editor tabs and bottom panel.
3. Move current route title and primary action into center document header.
4. Add sidebar + 新建分析 and grouped nav.
5. Add right-panel tabs: 检查 / 图表 / 注释.
6. Recalibrate neutral/purple selected tokens.
7. Verify at 1440x900 and 1920x1080.
```

## Verification

- Evidence screenshots captured through local Playwright.
- Mobbin MCP connection worked and returned Mixpanel screens/flows.
- Downloaded Mobbin reference images were inspected locally.
- No `npm.cmd run build` was required because this was documentation and audit-only; UI code was not modified.

## Residual Risk

- Some Mixpanel references include a purple top product bar and others use a white top edge. The next implementation should focus on product-shell coherence, not mechanically keeping or removing a top bar.
- Geotechnical evidence visualization must preserve engineering semantics while adopting Mixpanel surface discipline.
