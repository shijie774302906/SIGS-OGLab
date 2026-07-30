# Process012 - Theme Implementation Roadmap

Date: 2026-07-08

Status: `roadmap / awaiting implementation approval`

## Trigger

User accepted the recommended visual direction but asked for a concrete implementation path.

## Direction

Recommended path:

`TDesign shell discipline + Ant/Pro component semantics + Carbon data density`

Interpretation:

- TDesign-like Chinese enterprise workbench shell rhythm.
- Ant Design Pro-like page and component semantics.
- Carbon-like data density and typography for tables, metrics, evidence, and numeric values.

## Deliverable

Created:

`docs/prototype/ui-theme-implementation-roadmap-2026-07-08.md`

The roadmap defines:

- non-goals
- phase-by-phase execution
- target tokens
- file-level implementation scope
- dependency decision gate
- verification commands
- Playwright MCP acceptance path
- recommended next slice

## Recommended Next Slice

Implement only:

- Phase 1: token refactor
- Phase 2: typography and density pass

Do not yet:

- install `antd`
- install TDesign
- install Carbon
- rewrite layout behavior
- add new product features

Reason:

- Current pain is color and typography.
- Token and density changes are the highest-impact and lowest-risk move.
- Component-library adoption should wait until there is a real table/form interaction need.

## Boundary

- No production UI code changed in this roadmap slice.
- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.

## Next

Wait for user approval to start Phase 1 + Phase 2 implementation.
