# Process011 - Color And Typography Direction Research

Date: 2026-07-08

Status: `proposal / awaiting user decision`

## Trigger

User said the remaining issue is color and typography, and asked to look at the open-source references mentioned earlier, list matching options, capture screenshots, and decide before implementation.

## Skill Used

Used `artifact-design` to frame the visual review:

- Treat this as dense product UI, not a marketing surface.
- Let typography, spacing, and semantic state carry the product feel.
- Prefer a deliberate token system over inherited grays and generic blue.

## Research Scope

Looked for open-source or open-source-adjacent React design systems / admin starters that match:

- Chinese or enterprise middle/background products.
- Data-heavy screens.
- Table/list/form workbench needs.
- Customizable theme and typography tokens.
- Low migration risk for the current Vite + React prototype.

## Screenshots Captured

Folder:

`process_logs/playwright-mcp/theme-research/`

Screenshots:

- `00-current-baseline.png`
- `01-ant-design-table.png`
- `01b-ant-design-table-demo.png`
- `02-arco-design-pro.png`
- `02b-arco-react-pro-preview.png`
- `02c-arco-react-pro-after-login.png`
- `03-tdesign-starter-react.png`
- `04-carbon-data-table.png`
- `04b-carbon-data-table-demo.png`
- `05-semi-table.png`
- `05b-semi-table-demo.png`
- `06-fluent-table.png`

## Candidate Summary

Shortlist:

1. TDesign Starter inspired
   - Best domestic enterprise-product match.
   - Strong fit for Chinese middle/background UI.
   - Needs less blue/KPI dominance than its demo.

2. Ant Design Pro inspired
   - Safest implementation path.
   - Good future fit for ProTable, ProDescriptions, form filters, and enterprise workflows.
   - Needs denser table and less doc-like visual rhythm.

3. Carbon inspired
   - Best engineering/data credibility.
   - Strong table density and typography discipline.
   - Should borrow data/typography, not the full heavy black shell.

4. Arco Design Pro inspired
   - Clean modern product feel.
   - Good themes and templates.
   - Slightly less serious for geotechnical engineering unless customized.

5. Semi Design reference
   - Useful for table/tag/details and theme tokens.
   - Not recommended as the main workbench shell direction.

Fluent UI was captured as a low-priority reference for Segoe/system typography and accessibility, but not shortlisted as a primary style direction.

## Deliverable

Created:

`docs/prototype/ui-theme-options-2026-07-08.md`

The document includes:

- Current baseline issue.
- Screenshots.
- Fit assessment.
- Suggested color and font tokens.
- Adjustment notes.
- Recommended shortlist.

## Recommendation

Best direction to decide from:

`TDesign shell discipline + Ant/Pro component semantics + Carbon data density`

This keeps the product recognizable as a Chinese enterprise workbench while making the data/evidence surfaces more serious and engineered.

## Boundary

- No production UI code changed in this research slice.
- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.

## Next

Wait for the user to pick one direction:

- TDesign-first
- Ant-first
- Carbon-first
- Hybrid recommendation

Then implement the chosen theme as a scoped CSS/token refactor and verify with `npm run build`, `npm run test:e2e`, and Playwright MCP screenshots.
