# Process097 - Evidence Lifecycle

Date: 2026-07-15

Status: `closed / implemented / verified`

## Goal

Automate safe promotion, audit and transient cleanup planning without deleting historical/curated evidence or fabricating final closure proof.

## Implemented

- Added explicit, source-preserving promotion from allowed transient roots to a new curated directory. Promotion defaults to dry-run; `--apply` stages, hash-verifies and atomically publishes selected files plus `promotion-manifest.json`.
- Added evidence audit across final manifests, promotion manifests, legacy curated directories and transient inventory.
- Historical implementation drift is a warning; missing/changed archived context, curated artifacts, promoted artifacts or current-process inputs are errors.
- Added transient-only cleanup planning for `process_logs/playwright-results` and `playwright-report`. It defaults to 24-hour dry-run and requires both `--transient` and `--apply` for deletion.
- Cleanup revalidates size, mtime and SHA-256, refuses symlinks/arbitrary roots, removes only planned files and retains the transient root.
- Added lifecycle documentation, npm commands and 7 safety/behavior tests.

## Verification

- Evidence lifecycle tests: `7/7` passed.
- Existing process/evidence tests: `13/13` passed.
- Real repository audit: 4 final manifests, 0 promoted manifests, 61 legacy curated directories, 0 errors, 8 warnings (7 expected historical input drifts plus legacy inventory).
- Real cleanup dry-run: 2 files / 4,607,800 bytes older than 24 hours under Playwright results; 0 files under Playwright report. No deletion was applied.
- Real promotion dry-run: selected `.last-run.json`, planned one source-retaining copy, and created no destination.
- Build and knowledge gate passed.

## Evidence

- `process_logs/playwright-mcp/process097-evidence-lifecycle/evidence-audit.json`
- `process_logs/playwright-mcp/process097-evidence-lifecycle/cleanup-playwright-results-dry-run.json`
- `process_logs/playwright-mcp/process097-evidence-lifecycle/cleanup-playwright-report-dry-run.json`
- `process_logs/playwright-mcp/process097-evidence-lifecycle/promotion-dry-run.json`
- `process_logs/playwright-mcp/process097-evidence-lifecycle/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process097.json`

## Closure Checklist

- [x] Promotion is bounded, hash-verified, atomic and source-preserving.
- [x] Audit distinguishes historical drift from evidence corruption.
- [x] Cleanup is transient-only and defaults to dry-run.
- [x] Traversal, collision, symlink, stale source and stale cleanup targets fail safely.
- [x] Real audit and cleanup preview ran without deletion.
- [x] Tests, build, knowledge and process gates pass.

## Next

Process098 will implement `process:close --dry-run`: aggregate existing gates, produce a closure plan/draft and only mutate archive/index/library after explicit apply.
