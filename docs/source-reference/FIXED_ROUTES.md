# Fixed Routes - Repeated Problem Playbook

Date: 2026-06-23

This file fixes the known routes for recurring development and verification problems in `D:\CPT-UIQA`.

Use this before retrying a problem that looks like app startup, screenshot capture, Python/script opening, PowerShell encoding, UIA focus, or build locking. The goal is to avoid rediscovering the same answer during product work.

## 1. App Launch And Build Route

Recurring symptoms:

- app process starts but no visible window appears
- direct `.exe`, `cmd start`, Explorer handoff, or hidden-window starts create confusing state
- rebuild fails because `OffshoreGeotechWorkbench.exe` is locked
- multiple startup methods are tried while the product task makes no progress

Fixed route:

1. If code changed, stop only verification-started `OffshoreGeotechWorkbench` instances before rebuilding.
2. Build with the local SDK, sequentially:

```powershell
app_data\tools\dotnet\dotnet.exe build OffshoreGeotechWorkbench\OffshoreGeotechWorkbench.csproj --no-restore -v:minimal -m:1 -p:BuildInParallel=false -p:UseSharedCompilation=false -p:NodeReuse=false
```

3. Launch once through the project launcher:

```powershell
Start-Process -FilePath ".\Launch-OffshoreGeotechWorkbench.cmd" -WorkingDirectory "D:\CPT-UIQA"
```

4. Wait for a main window handle and title `SIGS-OGLab | 海上风电岩土勘察解译`.
5. If the window does not appear, inspect process state, app logs, event logs, and recent build output. Do not keep trying alternate startup methods.
6. Reuse an already-running correct app window for screenshots instead of relaunching.

Stop condition:

- After one failed fixed-route launch, stop startup experimentation and record the blocker. Do not try random direct launches unless the user explicitly asks for startup-method debugging.

## 2. Screenshot And Visual QA Route

Recurring symptoms:

- screenshot captures VS Code, WPS, a file viewer, lock/security desktop, or the wrong app page
- logical window screenshots are mistaken for full physical screenshots on external monitors
- repeated screenshot resampling consumes time without improving the product
- audit passes UIA but misses visual layout mismatch

Fixed route for layout/design tasks:

1. Navigate directly to the target page and tab first. For the current work this usually means `测试解译`, not `项目概况`.
2. Capture only the full physical virtual desktop at `1920x1080` for acceptance and audit evidence on the current host. Use DPI-aware capture with `SM_XVIRTUALSCREEN`, `SM_YVIRTUALSCREEN`, `SM_CXVIRTUALSCREEN`, and `SM_CYVIRTUALSCREEN`.
3. Record the captured physical resolution in the process log and require it to be exactly `1920x1080` unless a future isolated VM baseline is explicitly recorded.
4. Reject screenshots that:
   - are not `1920x1080`
   - are cropped app-window captures, logical viewport captures, or partial desktop captures
   - show the wrong foreground app
   - show the wrong page or tab
   - miss the primary visual object being reviewed
5. Use `PrintWindow` or app-window capture only as a debugging artifact, never as acceptance or audit evidence.
6. For responsive checks, resize or reposition the app window, then capture the entire `1920x1080` desktop for each state. Do not save 1366/1240/760 window crops as accepted evidence.
7. For a page-specific task, capture the target page directly. Do not run broad multi-page screenshot sweeps unless the slice is cross-page QA.

Stop condition:

- If physical capture returns the wrong desktop/security screen once or cannot produce `1920x1080`, do not keep resampling smaller/cropped screenshots. Fix the capture/display setup or pause the screenshot-dependent slice and record the blocker.

## 3. UIA Verification Route

Recurring symptoms:

- UIA checks pass individually but fail when run together
- scripts steal focus from each other
- checks depend on Chinese visible strings and break under PowerShell encoding
- navigation by index becomes fragile after UI changes

Fixed route:

1. Run UIA scripts serially, not in parallel, when they manipulate the same app window.
2. Prefer stable ASCII `AutomationId` values over Chinese visible text in test scripts.
3. Keep Chinese text in the app UI, but make automation selectors ASCII and stable.
4. If a UIA script scrolls or switches tabs, reset the page state before the next UIA script.
5. If navigation order changes, update navigation AutomationIds or scripts in the same slice.

Stop condition:

- A UIA failure caused by focus stealing or stale page state should be rerun once serially after reset. Do not debug product code until the serial route fails too.

## 4. Python, PowerShell, And Script Opening Route

Recurring symptoms:

- `.py`, `.ps1`, or helper scripts are "opened" through shell association instead of executed
- the wrong editor/viewer opens and no useful output is produced
- ad hoc script execution hides the real interpreter, working directory, or encoding
- Chinese literals in PowerShell scripts cause parse or mojibake failures

Fixed route:

1. Do not open `.py` or `.ps1` by double-click, Explorer, file association, or `Start-Process` unless the task is explicitly to inspect it in an editor.
2. Inspect scripts as text with `Get-Content`, `rg`, or the editor already in use.
3. Execute PowerShell helpers explicitly from the repo root:

```powershell
& .\tools\uiregression\check_interpretation_tabs.ps1 -Width 1366 -Height 768
```

4. Execute Python helpers only through an explicit interpreter after checking availability:

```powershell
python --version
python .\path\to\script.py
```

If `python` is unavailable, check the launcher once:

```powershell
py -0p
py -3 .\path\to\script.py
```

5. Do not use Python to edit files when `apply_patch` or a simple shell read is enough.
6. For UIA/PowerShell checks, avoid Chinese expected-string literals. Use ASCII `AutomationId`, numeric bounds, or PASS markers.

Stop condition:

- If script execution fails because of interpreter/path association, fix the explicit command path once. Do not try opening the script through multiple apps.

## 5. Encoding And Document Edit Route

Recurring symptoms:

- Chinese markdown appears as mojibake in shell output
- patch matching fails because existing text is mojibake-rendered
- PowerShell append/rewrite introduces unexpected BOM or damages Chinese text
- process logs become unreliable after encoding repair attempts

Fixed route:

1. Prefer `apply_patch` for manual source and markdown edits.
2. When a mechanical rewrite is unavoidable, read and write with explicit UTF-8 no BOM.
3. Avoid matching large Chinese/mojibake blocks in patches. Anchor edits around ASCII headings where possible.
4. Keep new automation-facing identifiers ASCII.
5. Verify after edits with:

```powershell
git diff --check
```

6. If an edit damages Chinese text, restore the file from Git and redo the smallest possible patch. Do not keep layering fixes on corrupted text.

Stop condition:

- After one encoding-corruption incident in a file, stop bulk rewrite attempts for that file and switch to small `apply_patch` edits.

## 6. Build And Validation Sequencing

Recurring symptoms:

- XAML compiler `input.json` or build artifacts are locked
- `dotnet build` and helper `dotnet run` jobs interfere with each other
- verification fails differently in parallel than serially

Fixed route:

1. Build, workflow check, project-scope check, and UIA checks should run sequentially for WinUI slices.
2. Do not run multiple app-driving UIA scripts in parallel.
3. Do not run build and app-driving checks in parallel.
4. Stop verification-started app instances before rebuilds.
5. Treat a parallel-only failure as a process failure first; rerun serially before changing product code.

## 7. When To Pause

Pause and record the issue instead of continuing local retries when:

- the fixed route fails repeatedly
- the screenshot evidence cannot capture the physical target page
- the app cannot show a window after the fixed launch route
- the script cannot run through an explicit interpreter
- solving the tooling issue would consume more time than the current product slice

After three failed attempts on the same concrete issue, follow the repeated-failure rule in `AGENTS.md`: record attempts, search for external guidance, choose two credible approaches, try at most those two, then mark unresolved or pause for user confirmation if it blocks the slice.
