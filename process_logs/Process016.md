# Process016 - Multi-Agent UI Layout And Copy Audit

Date: 2026-07-08

Status: `closed / audit complete`

## Trigger

The user said the current UI still has many layout problems and Chinese/copy issues, and asked to arrange multiple agents to review and criticize the design.

## Agents

Four read-only audit agents were launched:

- Hubble: layout consistency, grid, spacing, density, responsive behavior.
- Nash: Mixpanel reference alignment.
- Gibbs: Chinese UX copy and domain language.
- Curie: information architecture and workflow coherence.

No agent modified files.

## Local Evidence

Used screenshots:

- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-interaction-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1920x1080.png`

Captured DOM metrics:

- `process_logs/playwright-mcp/mixpanel-top-nav/dom-layout-audit.json`

Referenced source files:

- `src/App.tsx`
- `src/styles.css`

## Deliverable

Created:

- `docs/prototype/multi-agent-ui-audit-2026-07-08.md`

The audit consolidates:

- P0 blocking inconsistencies
- P1 high-value layout fixes
- P2 polish items
- copy replacement table
- recommended refactor order

## Key Findings

P0:

- Navigation hierarchy is over-stacked: top columns, left workflow, and second-row tabs all compete.
- The right `Query` panel is semantically mismatched; it behaves more like an engineering inspector than a Mixpanel query builder.
- At `1440x900`, the core layer table is partially hidden by the fixed bottom panel and chart height behavior.
- Copy implies production save/adopt/export behavior that the prototype does not support.
- Project/point context is inconsistent: `营口样例`, `CPT09`, and `CPT9-19-S1` appear as separate anchors.

P1:

- The center report has too much content before the chart.
- Depth axis labels are clipped and not aligned with the grid model.
- The chart area is too empty on wide screens and too tall on shorter screens.
- Metrics row stretches unevenly.
- Right panel scheme rows are too tall.
- Action buttons have similar visual weight.

## Recommended Next Slice

Implement:

```text
IA + copy + 1440 layout safety
```

Do not start with another color-only polish pass. The next implementation should first fix hierarchy and wording:

- top bar = brand/scope/search/utilities
- left sidebar = only workflow navigation
- second row = current document tab or context bar, not duplicate workflow nav
- right panel = engineering context sections
- bottom panel = smaller/collapsible or route-aware
- chart/table = both visible at `1440x900`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- No production UI code was changed in this audit slice except documentation and process notes.
