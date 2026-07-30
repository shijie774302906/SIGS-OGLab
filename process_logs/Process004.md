# Process004 - Web-P1 Workflow Reset After MCP Availability

Date: 2026-07-08

## Intent

Reset the active Web-P1 workflow now that Playwright MCP is callable in the current Codex session. The workflow must require both human-like MCP browser exploration and repeatable Playwright E2E regression before Web-P1 can close.

## Confirmed Requirement

- Goal: redefine the Web-P1 workflow around an implementation-and-browser-QA loop rather than a build-only loop.
- Scope: update active planning and process index; make MCP exploratory QA and Playwright regression mandatory; preserve the VSCode-like workbench, `地层分层` default page, data-boundary, and no-desktop-edit requirements.
- Non-goals: no UI implementation in this slice, no desktop repo edits, no desktop runtime data access, no official algorithm/export/persistence behavior.
- Acceptance criteria: `plan.md` clearly states gates, deliverables, checks, MCP operation path, E2E requirements, stop conditions, and closure evidence.
- Verification: read back updated docs and confirm Playwright MCP is callable.
- Closure review: `Process.md` points to this log.
- Stop conditions: pause if a future implementation step needs to touch `D:\CPT-UIQA`, desktop `app_data`, or fake official save/adoption/export behavior.

Open questions: None.

Implementation may start: yes.

## Workflow Reset

The active `plan.md` now uses these gates:

1. Gate 0 - Tooling And MCP Readiness
2. Gate 1 - Scaffold
3. Gate 2 - VSCode-like Workbench Shell
4. Gate 3 - Workflow Navigation
5. Gate 4 - Stratification Default Document
6. Gate 5 - Supporting Documents
7. Gate 6 - MCP Exploratory Browser QA
8. Gate 7 - Playwright Regression QA

Main rule:

- Web-P1 cannot close on `npm run build` alone.
- Web-P1 must run MCP browser exploration first, fix blocking findings, then encode the stable path in `npm run test:e2e`.

## MCP Availability Check

Called:

```text
mcp__playwright.browser_tabs({ "action": "list" })
```

Result:

```text
0: (current) about:blank
```

Conclusion:

- Playwright MCP is callable in the current Codex session.
- Future Web-P1 UI work should use MCP directly for exploratory browser operation after starting the local Vite dev server.

## Required MCP Walkthrough For Web-P1

After implementation:

- Open the local app with MCP.
- Resize viewport to `1920x1080`.
- Capture accessibility snapshot.
- Capture first-screen screenshot.
- Confirm default active document is `地层分层`.
- Click all six Explorer workflow nodes.
- Verify active Explorer node, active Tab, Right Panel title/context, and Status Bar current document.
- Return to `地层分层`.
- Select stratification schemes and layer rows.
- Switch Bottom Panel tabs.
- Use Activity Bar entries for Problems, Output, and Artifacts.
- Check console/runtime errors through browser evaluation or Playwright E2E hooks.
- Record screenshot paths and resolution.

## Required Playwright Regression

After MCP exploration is stable:

- Add or update `tests/e2e/workbench.spec.ts`.
- Add Vite `webServer` config to `playwright.config.ts`.
- Run `npm run test:e2e`.
- Keep the existing tooling smoke only if useful; otherwise replace it with workflow-level tests.

## Files Changed

- `plan.md`
- `Process.md`
- `process_logs/Process004.md`

## Closure Notes

The workflow is now reset around build plus browser operation evidence. Web-P1 implementation can start from Gate 1.
