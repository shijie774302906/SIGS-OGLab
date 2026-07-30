# Process003 - Browser Automation Tooling Setup

Date: 2026-07-08

## Intent

Install and verify browser automation tooling for Web-P1 so completed UI work can be checked by simulated human browser operations, not only by static build output.

## Confirmed Requirement

- Goal: add relevant MCP/browser-operation tooling and Playwright functionality now.
- Scope: install Node.js/npm if needed, configure official Playwright MCP for Codex, install project-level Playwright E2E tooling, install Chromium, and verify a browser smoke test.
- Non-goals: no Web-P1 UI implementation in this slice, no desktop repo edits, no desktop runtime data access, no official algorithm/export/persistence behavior.
- Acceptance criteria: Playwright CLI works; Chromium browser automation runs; Codex config contains a Playwright MCP server; project has `npm run test:e2e`; smoke test passes.
- Verification: command outputs from Node/npm/Playwright/MCP wrapper and `npm run test:e2e`.
- Closure review: `Process.md` points to this log and `plan.md` no longer treats Node/npm as blocking.
- Stop conditions: if installing or configuring a tool would require changing `D:\CPT-UIQA` or accessing desktop runtime data, pause.

Implementation may start: yes.

## Official Tooling Basis

Primary references checked:

- Playwright documentation confirms browser automation for testing and agent workflows.
- Playwright MCP documentation identifies the official MCP package as `@playwright/mcp@latest`.
- Playwright installation documentation supports project installation with `@playwright/test` and browser installation through `npx playwright install`.

## Installed System Tooling

Installed Node.js LTS:

```powershell
winget install OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
```

Verified with direct install-path commands:

```text
C:\Program Files\nodejs\node.exe --version -> v24.18.0
C:\Program Files\nodejs\npm.cmd --version  -> 11.16.0
C:\Program Files\nodejs\npx.cmd --version  -> 11.16.0
```

Note:

- The current PowerShell process did not immediately refresh PATH after installation.
- Commands in this session use a temporary PATH prefix or direct `C:\Program Files\nodejs\*.cmd` calls.
- New terminals or new Codex sessions should normally inherit the installed PATH.

## Playwright MCP Setup

Updated:

- `C:\Users\ShiJie\.codex\config.toml`
- `C:\Users\ShiJie\.codex\playwright-mcp.cmd`

Codex MCP config:

```toml
[mcp_servers.playwright]
command = "C:\\Users\\ShiJie\\.codex\\playwright-mcp.cmd"
args = []
```

Wrapper:

```cmd
@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
"C:\Program Files\nodejs\npx.cmd" --yes @playwright/mcp@latest --headless --output-dir "D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp" %*
```

Verification:

```powershell
& 'C:\Users\ShiJie\.codex\playwright-mcp.cmd' --help
```

Result:

- The official Playwright MCP CLI help printed successfully.
- MCP tools may require a new Codex session or MCP reload before becoming visible in the available tool list.

## Project Playwright Setup

Initialized npm metadata:

```powershell
npm init -y
```

Installed Playwright test package:

```powershell
npm install --save-dev @playwright/test
```

Installed Chromium:

```powershell
npx playwright install chromium
```

Added project files:

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `tests/e2e/tooling.spec.ts`

Updated:

- `.gitignore`
- `plan.md`
- `Process.md`

## Scripts

Current scripts:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:ui": "playwright test --ui",
  "playwright:version": "playwright --version"
}
```

## Verification Result

Playwright CLI:

```text
npm run playwright:version -> Version 1.61.1
```

E2E smoke test:

```text
npm run test:e2e
Running 1 test using 1 worker
ok 1 [chromium] › tests\e2e\tooling.spec.ts › Playwright browser tooling is available
1 passed
```

## Residual Risk

- The Playwright MCP server is configured and executable, but its tools are not available inside this already-running Codex tool list. A new Codex session or MCP reload is likely required.
- The current Playwright test is only a tooling smoke test because the Vite/React app does not exist yet.
- After Web-P1 implementation, replace or extend `tests/e2e/tooling.spec.ts` with workflow-level tests that click Explorer nodes, verify active Tab/Status/Right Panel sync, select stratification schemes/layers, and inspect console errors.

## Closure Notes

Browser automation is now ready for Web-P1 implementation. Future UI work should not close on `npm run build` alone; it must also pass Playwright browser-operation QA or record a concrete blocker.
