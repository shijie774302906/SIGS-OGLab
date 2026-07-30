# Test Artifact And Evidence Policy

## 1. Purpose

Keep ordinary automated-test output disposable while preserving concise, trustworthy milestone evidence. Existing evidence is retained; this policy governs future work.

## 2. Artifact Classes

| Class | Location | Retention | Examples |
| --- | --- | --- | --- |
| Transient runner output | `process_logs/playwright-results/`, `playwright-report/`, or a temporary run folder | Replaceable; keep failures only as needed | traces, videos, automatic failure screenshots |
| Generated test input | Temporary run folder during normal testing | Delete/replace after successful non-milestone runs | random CSV/Excel/TXT files |
| Curated milestone evidence | `process_logs/playwright-mcp/<slice-name>/` | Permanent | representative screenshots, final generated input, browser-check JSON |
| Closure record | `process_logs/ProcessNNN.md` | Permanent | scope, result, verification, evidence links, boundaries |

## 3. Curated Evidence Rules

Create or refresh curated milestone evidence only for closure runs, UI decisions, regressions, or user-requested review.

A curated UI closure should normally contain:

- `1440x900` screenshot.
- `1920x1080` screenshot when layout or density changed.
- At least one interaction/state screenshot when relevant.
- `browser-check.json` or `flow-run.json`.
- Console/page error counts.
- Overflow/layout result.
- Deterministic seed and representative generated input when files are part of the Flow.
- `evidence-manifest.json` binding the final context, implementation inputs, related tests, curated artifacts, verification commands, environment and seed/source note.

Do not retain every random rerun. Keep the representative final case and record its seed.

Create and audit the manifest after the final curated artifacts are refreshed:

```powershell
npm.cmd run evidence:manifest -- create --process 094 --evidence process_logs/playwright-mcp/process094-example --context process_logs/Process094.md --input scripts/example.mjs --input scripts/example.test.mjs --command "npm.cmd run build" --exit-code 0 --command "npm.cmd run process:test" --exit-code 0 --seed "deterministic-source" --final
npm.cmd run evidence:manifest -- audit --manifest process_logs/playwright-mcp/process094-example/evidence-manifest.json --require-final
```

The manifest is stale when its context, any bound implementation/test input, or any curated artifact is added, removed or changed. Regenerate the actual evidence first; do not merely rewrite the manifest after an unverified code change.

## 4. Naming

```text
process_logs/playwright-mcp/<slice-name>/
  <state>-1440x900.png
  <state>-1920x1080.png
  <interaction>-1440x900.png
  input/<representative-generated-file>
  flow-run.json
  browser-check.json
```

## 5. Test Design Guidance

- Unit tests cover parsing, normalization, state transitions, and readiness selectors.
- Component tests cover page states and action availability.
- Playwright covers representative cross-module human workflows.
- Use stable test IDs for product objects/actions, not implementation layout.
- Random data should be deterministic from a recorded seed.
- Normal CI/local runs should write to transient locations; closure runs may promote selected artifacts to curated evidence.

## 6. Cleanup Safety

- Never delete curated evidence or historical inputs as part of ordinary test execution.
- Cleanup commands must target a known transient directory only.
- Historical evidence cleanup requires explicit user approval and a manifest of files to remove.
- Manifest creation and audit never delete evidence. A failed final-manifest attempt must leave the prior manifest unchanged.

## 7. Lifecycle Commands

Promotion is explicit and source-preserving. It defaults to dry-run; add `--apply` only after inspecting the plan:

```powershell
npm.cmd run evidence:promote -- --process 097 --source process_logs/playwright-results --evidence process_logs/playwright-mcp/process097-example --select run/result.png
npm.cmd run evidence:promote -- --process 097 --source process_logs/playwright-results --evidence process_logs/playwright-mcp/process097-example --select run/result.png --apply
```

Promotion creates `promotion-manifest.json` with source and copied hashes. It does not delete the source and does not replace the final closure `evidence-manifest.json`.

Audit curated evidence and transient inventory:

```powershell
npm.cmd run evidence:audit -- --process 097 --output process_logs/evidence-audit.json
```

Changed historical implementation inputs are reported as expected warnings because later slices may modify the workspace. Changed/missing archived context, curated artifacts, current-process inputs, or promoted artifacts are errors.

Cleanup supports only the two known transient roots and defaults to dry-run. `--apply` is required for deletion:

```powershell
npm.cmd run evidence:clean -- --transient --root process_logs/playwright-results --older-than-hours 24
npm.cmd run evidence:clean -- --transient --root playwright-report --older-than-hours 24 --apply
```

Curated evidence, Process records, arbitrary roots, symlinks, and files changed after planning are refused. The transient root itself is retained.
