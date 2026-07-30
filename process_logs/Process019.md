# Process019 - Agent P1 IA Copy And Professional Cleanup

Date: 2026-07-09

Status: `closed / verified`

## Trigger

The user asked to proceed after the three reusable review agents rereviewed the current Mixpanel-inspired workbench. The accepted focus was the P1 set: duplicated boundary copy, competing `参数解译/试算` naming, right-panel responsibility, disabled controls, professional stratification wording, and bottom-panel redundancy.

## Scope

- Reduced repeated `只读样例，不写入正式工程` copy to short badges and one detailed explanation.
- Standardized `参数解译` as the workflow name and `试算` as the current mode/status.
- Reworked the right panel into a single `检查器` instead of decorative tabs plus mixed responsibilities.
- Removed disabled placeholder controls from the main toolbar and table toolbar.
- Renamed `数据检查` metric to `分层复核`, and `复核深度` to `复核边界/区间`.
- Changed layer status logic so adjacent review-required boundaries affect row status.
- Renamed layer parameter column to `试算候选项`.
- Marked the SBTn view as schematic/non-official evidence and dimmed non-selected evidence points.
- Converted bottom `复核项` from summary repetition into boundary issue details.
- Increased the evidence panel height on taller screens to reduce wide-screen empty space.
- Unified review-count wording around review boundaries rather than warning-message count.
- Replaced permission copy `边界：只读样例` with `原型限制` / `使用限制` to avoid conflict with stratigraphic boundaries.
- Localized fixture/source wording such as `Yingkou_CPTU.xlsx` and English boundary summaries.

## Files Changed

- `src/App.tsx`
- `src/styles.css`
- `tests/e2e/workbench.spec.ts`
- `plan.md`
- `Process.md`
- `process_logs/Process019.md`

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests passed.
- Playwright MCP browser walkthrough completed:
  - opened `http://127.0.0.1:5173/`
  - captured default stratification page
  - selected `自动分层候选 A`
  - selected `L2`
  - captured 1440x900 and 1920x1080 screenshots
  - checked visible text, disabled buttons, SBTn schematic label, boundary intervals, right inspector state, and console output

## Agent Rereview

The three reusable review agents were run again after implementation:

- Visual Layout Taste Auditor: no P0/P1; safe to close. Remaining P2: future SBTn numeric ticks, optional boundary-summary chip wrapping, and further wide-screen detail depth.
- Geotechnical Domain Reviewer: no P0/P1; safe to close. Remaining P2: SBTn axis/unit precision and future wording for official-flow branches.
- Copy IA Mobbin Challenger: initially found two P1 issues, both fixed in this slice:
  - review count conflicted between `1 条复核项` and `2 个复核边界`
  - `边界：只读样例` conflicted with stratigraphic boundary wording

After the targeted fixes, Copy IA Mobbin Challenger confirmed:

- P0: none
- P1: none
- Safe to close: yes

## Evidence

- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-initial-1440x900.png`
- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-interaction-1440x900.png`
- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-interaction-1920x1080.png`
- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-browser-check.json`
- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-console-warnings.md`
- `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-console-errors.md`

Final browser check summary:

```json
{
  "forbiddenFound": [],
  "disabledButtons": [],
  "hasInspectorLabel": true,
  "hasBoundaryIntervals": true,
  "hasConsistentReviewCount": true,
  "hasPrototypeBoundaryLabel": true,
  "hasTrialInterpretation": true,
  "hasSbtnSchematic": true,
  "hasCompleteSbtnUnits": true
}
```

Console summary:

- Warnings: 0
- Errors: 0

## Boundaries

- No desktop repository files were changed.
- No desktop `app_data`, SQLite schema, persistence, official algorithm, or export implementation was touched.
- No new dependency was installed.
- SBTn remains schematic evidence only, not an official classification implementation.

## Residual Risks

- The SBTn chart now communicates schematic status better, but it still does not implement real scaled SBTn axes or validated classification regions.
- The 1920 layout uses more vertical space than before, but a future slice can still deepen the lower detail surface if more engineering evidence becomes available.

## Next

- Decide whether the next slice should improve real CPT/CPTU curve evidence, formalize parameter interpretation screens, or extend the same IA cleanup to supporting pages.
