# Process039 - Five Feature Zones Functional Blueprint

Date: 2026-07-09

Theme: five feature zones functional blueprint and agent review

Status: closed / documented / agent reviewed

## Scope

- Turn the active `plan.md` five-zone idea into a detailed functional blueprint.
- Use local product context and Mobbin/Mixpanel references as research input.
- Define five feature zones, module boundaries, handoff contracts, state wording, and coverage checks.
- Run the reusable read-only review agents after drafting.

## Outputs

- `docs/prototype/five-feature-zones-functional-blueprint-2026-07-09.md`
- `docs/prototype/five-feature-zones-agent-review-2026-07-09.md`
- Updated `plan.md` to point to the blueprint and review record.

## Mobbin / Mixpanel References

- Mixpanel creating report flow.
- Mixpanel report condition flow.
- Mixpanel saving report flow.
- Mixpanel report canvas screen.
- Mixpanel condition-control screen.
- Mixpanel date/condition popover screen.
- Mixpanel save/export feedback screen.

The references were translated as interaction grammar only: left navigation, center evidence/result canvas, right inspection/view settings, short-choice popovers, and lightweight feedback.

## Agent Review

Read-only review agents used:

- `visual-layout-taste-auditor`
- `geotechnical-domain-reviewer`
- `copy-ia-mobbin-challenger`

Result:

- No P0 findings.
- P1/P2 findings were integrated into the blueprint and `plan.md`.

Key integrated changes:

- Added per-zone first-screen layout contracts.
- Defined primary evidence surfaces and right-panel priority rules.
- Added state visual coding rules.
- Replaced formal-sounding parameter/output wording with preview/trial wording.
- Added CPT/CPTU unit, depth, water-depth, final-depth, and missing-channel contracts.
- Split parameter fallback paths by owning object.
- Removed implementation-facing analytics terminology from Mixpanel mapping.
- Renamed hard labels such as `准入判断`, `输出限制`, and `输出预览`.

## Verification

- Read back the created blueprint and review record with explicit UTF-8 handling.
- Ran keyword scans for old issue wording, formal-output implication, and unwanted analytics terminology.
- No `npm run build` was run because this was documentation and planning only.

## Boundary

- No UI implementation files were changed.
- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No new dependency was added.

## Next

- Recommended next implementation slice: `Slice A - IA And Wording Lock`.
- Confirm or proceed with the recommended sidebar decision: keep six workflow pages for now, visually grouped into five zones.
