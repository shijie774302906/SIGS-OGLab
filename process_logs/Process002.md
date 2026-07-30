# Process002 - Web-P1 Workflow Definition

Date: 2026-07-08

## Intent

Define a clear workflow for `Web-P1：搭建 Vite + React + TypeScript 工作台壳层`, including deliverables, implementation sequence, checks, browser-operation QA, closure criteria, and stop conditions.

## Confirmed Requirement

- Goal: create a browser-based VSCode-like workbench prototype for `SIGS-OGLab | 海上风电岩土勘察解译`.
- Scope: Vite + React + TypeScript scaffold, workbench shell, six workflow Explorer nodes, tab/status synchronization, right/bottom panels, and a default `地层分层` page backed by `sample_data/stratification`.
- Non-goals: no desktop repo edits, no desktop runtime data access, no SQLite schema changes, no official algorithm implementation, no official persistence, no PDF/DXF/export commitment, and no backend persistence beyond prototype needs.
- Acceptance criteria: local browser opens the workbench; first screen is not a landing page; default document is `地层分层`; Explorer workflow nodes can be clicked; Tab/Status/Panel state syncs; sample stratification data is visible; build passes; browser-operation QA is recorded.
- Verification: environment preflight, `npm run build`, browser walkthrough, Playwright-style automated checks when available, screenshots if visual acceptance is needed.
- Closure review: update `plan.md`, `Process.md`, and the active process log with verification results, residual risks, and next slice.
- Stop conditions: pause if implementation needs to touch `D:\CPT-UIQA`, read/write desktop `app_data`, fake official data, fake CPT/CPTU curves without data, or claim official save/adoption/export behavior.

Open questions: None.

Implementation may start: yes, after Node.js/npm are available in PATH.

## Workflow Written To `plan.md`

The active `plan.md` now defines:

- Product workflow to preserve.
- Design gate and token baseline.
- Environment preflight.
- Scaffold deliverables.
- Workbench shell deliverables.
- Workflow navigation behavior.
- `地层分层` default document scope.
- Supporting lightweight documents.
- Browser-operation QA.
- Local verification and closure.
- Delivery checklist.
- Web-P2 candidate slices.

## Browser Operation / MCP Note

The current toolset does not expose a dedicated local browser MCP for interacting with the prototype UI.

Preferred approach for Web-P1 closure:

- Use Playwright as a project dev dependency.
- Add `npm run test:e2e`.
- Let Playwright launch the Vite dev server and simulate a human workflow.

Minimum human-like flow to test:

- Open the local app.
- Confirm default active document is `地层分层`.
- Click all six Explorer workflow nodes.
- Check active Tab, Right Panel, and Status Bar after each navigation.
- Return to `地层分层`.
- Select schemes and layer rows.
- Switch Bottom Panel tabs.
- Use Activity Bar entries for Problems, Output, and Artifacts.
- Fail on console errors or runtime exceptions.

Fallback if Playwright cannot run:

- Record the blocker.
- Perform a manual browser walkthrough.
- Capture screenshots and write the operated path and discovered bugs into `process_logs/`.

This fallback is a temporary risk record, not a replacement for later automated browser QA.

## Environment Preflight Result

Commands checked from `D:\CPT-UIQA-WebPrototype`:

- `node --version`
- `npm --version`
- `npx playwright --version`

Result:

- `node` is not recognized in the current PowerShell PATH.
- `npm` is not recognized in the current PowerShell PATH.
- `npx` is not recognized in the current PowerShell PATH.

Impact:

- Vite scaffold cannot be initialized from the current shell yet.
- `npm run build` cannot run yet.
- Playwright-style browser QA cannot run yet.

Next requirement before implementation:

- Install Node.js/npm or expose the existing Node.js installation in PATH.
- Re-run the preflight commands.

## Files Changed

- `plan.md`
- `Process.md`
- `process_logs/Process002.md`

## Closure Notes

This slice only clarified the Web-P1 workflow. It did not start frontend implementation and did not touch the desktop app workspace.
