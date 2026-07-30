# Process006 - Web-P1 Visual Polish

Date: 2026-07-08

## Intent

Improve the Web-P1 workbench visual quality while preserving the VSCode-like shell contract and prototype boundaries.

## Trigger

User feedback:

- The UI is technically VSCode-like, but visually feels plain and unattractive.
- Explore whether modern large-product web app layout formulas can be borrowed.
- Try Mobbin research if available.

## Research Notes

Mobbin:

- Tried `mcp__mobbin.search_screens`.
- Result: Mobbin MCP requires a paid plan.
- Conclusion: no Mobbin screenshots were inspected in this slice; do not cite Mobbin as a visual source.

Public references used instead:

- Vercel dashboard redesign: navigation prioritization, consistent tabs, and common workflow ordering.
- Stripe Dashboard docs: resource navigation, filtering/search, details pages, and workbench/log concepts.
- Retool admin dashboard page: internal tools tend to share tables, search, buttons, forms, dropdowns, and containers.
- Stripe dashboard redesign case study: complex tables/filter controls/detail patterns need responsive information architecture and consistent component language.

## Design Direction

Keep:

- VSCode-like topology.
- Top Chrome / Activity Bar / Explorer / Editor / Right Panel / Bottom Panel / Status Bar.
- `地层分层` as default document.
- Sample-data-only behavior.
- No unsupported qc/fs/u2 curves.
- No official save/adoption/export promises.

Improve:

- Softer surfaces and borders.
- Better selected/hover states.
- Status pills and summary tiles with clearer semantic tone.
- Scheme list rows that read as selectable objects.
- Layer evidence panel with more deliberate grid and point styling.
- Table density and selected row polish.
- Right panel as concise property groups rather than raw rows.
- Disabled action affordance so unavailable actions do not look primary.

## Files Changed

- `src/styles.css`
- `Process.md`
- `process_logs/Process006.md`

## Verification

Build:

```text
npm run build
✓ built
```

E2E:

```text
npm run test:e2e
2 passed
```

MCP browser check:

```text
active title: 地层分层
right panel: 地层分层
forbidden terms: none
projection-only boundary visible: true
```

Screenshot:

- `D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp\web-p1-polish-mobbin-inspired.png`
  - Resolution: `1920 x 1080`
  - Page: polished `地层分层`

## Residual Risks

- This polish is still constrained by the locked VSCode-like shell direction, so it intentionally avoids a fully custom SaaS dashboard layout.
- Mobbin could not be used due to account plan limitations. Future design research can revisit Mobbin if access is upgraded.
- The page is more polished but still uses sample data and a simplified visualization.

## Closure Notes

The UI is visually improved without changing product scope, data boundary, or desktop isolation.
