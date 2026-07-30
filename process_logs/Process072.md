# Process072 - Stratification Inline Diagnosis And Safe Auto-Recovery

Date: 2026-07-12

Status: `closed / implemented / verified`

## Objective

Replace the non-actionable JTS stratification error shown in the Yingkou workflow with an exact diagnosis, contextual choices, impact preview, and safe in-place recovery where the product can act without guessing engineering meaning.

## Product Changes

1. Added stable JTS recovery codes for stale/missing checks, unconfirmed probe context, unconfirmed water/pressure context, missing governed rows, numeric-domain failures, and unknown failures.
2. Numeric-domain diagnosis now enumerates the affected source rows, depth, corrected cone resistance when available, affected count, total count, and percentage.
3. Added a compact right-dock decision panel ordered as: reason, consequence, evidence, treatment choices, impact preview, execution, and provenance boundary.
4. Added safe automatic choices:
   - Create a 0.50 m standard median-smoothing revision, rerun Data Check, and rerun JTS classification.
   - Exclude an explicitly enumerated invalid-row set in one append-only review revision, rerun Data Check, and rerun classification. This option is enabled only for at most 50 rows and at most 1% of the point.
   - Rerun a stale check against already confirmed mapping and governance authority.
5. Merely selecting or switching a treatment does not mutate state. Execution is explicit and shows the exact authority impact first.
6. Automatic recovery preserves raw rows, creates governance/check/classification revisions in order, returns to stratification, and leaves the prior current state intact on a rejected command.
7. Probe and water/pressure problems expose only navigation actions. The UI explicitly says that engineering context must be confirmed by the user and will not be filled automatically.
8. Added a bounded multi-row exclusion command that creates one immutable decision and preserves all source rows.
9. Fixed a full-scale candidate conversion precision defect: automatic candidates use a 0.051 m safety spacing so values rounded to three decimals always satisfy the editor's 0.05 m constraint.

## Safety Boundaries

- No unit guessing, column remapping, missing-value imputation, water-depth inference, pressure-datum inference, probe-geometry inference, soil-class selection, or parameter adoption is automatic.
- Bulk exclusion is disabled outside the small, explicit safety threshold and explains why.
- Automatic smoothing changes only a derived smoothing revision; original measured values remain immutable.
- Manual navigation never changes data or current results.

## Verification

- `npm.cmd run build`: passed. The existing Vite large-chunk advisory remains non-blocking.
- Full Chromium Playwright regression: `194/194` passed in 4.0 minutes with no exclusions.
- Real Yingkou current workflow: passed in 3.4 minutes, including 322-candidate conversion, downstream parameters, A4/A3/Excel generation, persistence, and refresh.
- Corrupt `.xlsx` / legacy `.xls` recovery: passed in 14.4 seconds.
- Focused recovery suite: diagnosis, selection-without-mutation, automatic smoothing, bounded exclusion, stale-check policy, probe/water navigation, refresh, and source preservation all passed.
- Source-term scan: no user-facing `阻塞` or `测试解译` in `src`.
- Curated flow record: zero console/page errors and no body, workbench, or right-dock horizontal overflow at `1440x900` and `1920x1080`.
- Visual closure: `P0=0 / P1=0`.

## Evidence

- Machine record: `process_logs/playwright-mcp/jts-inline-recovery/flow-run.json`
- `process_logs/playwright-mcp/jts-inline-recovery/numeric-domain-options-1440x900.png`
- `process_logs/playwright-mcp/jts-inline-recovery/numeric-domain-options-1920x1080.png`

## Boundaries

This feature does not replace Data Check as the full evidence workspace. It brings only safe, contextual recovery into stratification and retains a direct route to the owning page for complete review.
