# Project AGENTS

## 1. Purpose

This file is the operating contract for the current workspace:

- Workspace: `D:\CPT-UIQA`
- Company: `SIGS-OGLab`
- Product: `海上风电岩土勘察解译`
- App: `OffshoreGeotechWorkbench`

It defines how future agents plan, design, implement, verify, review, and log work.

No major slice is complete until it has:

1. implementation or explicit documentation/planning change
2. local verification appropriate to the change
3. slice-level closure review
4. `Process.md` / `process_logs` update

## 2. Active Files

Before non-trivial work, read:

- `Process.md` for the active process log and current theme
- `plan.md` for the active execution slice
- `Plan-total.md` for the overall roadmap
- `design.md` for UI design workflow, Figma review rules, feature-entry/window closure rules, and design self-checks
- `FIXED_ROUTES.md` for recurring build, launch, screenshot, UIA, and encoding routes
- relevant design contracts under `docs/`

`plan.md` is only the current active slice. Do not append completed historical queues back into it.

Historical details belong in:

- `Process.md`
- `process_logs/`
- `Plan-total.md`
- task-specific design docs under `docs/`
- screenshot and QA artifacts
- Git history

All new or updated active `plan.md` content must be written in Chinese. Technical identifiers, code symbols, units, method names, and file names may remain in English where that is the actual engineering notation.

## 3. Current Product Baseline

Technical baseline:

- Windows desktop app
- C# + WinUI 3 + Windows App SDK
- unpackaged + self-contained local run
- local SQLite only
- runtime data under `D:\CPT-UIQA\app_data\`

Current product direction:

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

`测试解译` is a historical/current implementation label. Future planning should move toward the clearer business concept `地层分层`, with SBT/classification evidence and method comparison treated as part of the stratification workflow.

Current exclusions unless explicitly re-confirmed:

- MySQL / Oracle
- real online basemap
- real DXF generation
- formal PDF generation before report template/content/audit standard are confirmed
- advanced foundation-design modules outside the current MVP
- full installer and auto-update
- SPT, lab-test, attachment, and work-report management outside the current CPT/CPTU interpretation chain
- VSCode extension marketplace, terminal, debugger, command palette, Git integration, OS-level floating windows, and Tab tear-out

## 4. Planning Discipline

For any non-trivial development, design, or governance task:

1. update the session todo list
2. define one concrete major slice from `plan.md`
3. state scope, non-goals, verification, closure-review target, and stop conditions
4. implement the smallest useful version
5. verify locally
6. do one slice-level closure review
7. update `plan.md`, `Process.md`, and the active `process_logs/Process*.md`

Before starting a new development requirement, use the `grill-me` skill:

- inspect local plans, logs, screenshots, source files, and docs first
- ask the user only if a product-defining answer is not discoverable
- record the confirmed checklist in `plan.md` or the active process log before implementation

For UI, workflow, visual hierarchy, layout, or artifact-design work, use `artifact-design` and apply it to the current VSCode-like workbench direction rather than older custom visual systems.

For any UI/Figma/design discussion or implementation handoff, read and follow `design.md` before changing drawings, docs, or code. New visible entries must be classified as existing/new/future/simplified/not-do, and any new entry must have a target page, panel, menu, dialog, or an explicit decision to hide it.

UI/Figma work must obey the `design.md` hard gates before it can become implementation input:

- Work one page or one strongly related dialog group at a time; batch-generated screens are draft material only.
- New main-flow screens must copy an accepted `01 Workbench shell` or accepted same-type screen; a visually similar hand-drawn shell is not enough.
- Figma sync, PNG export, and self-check do not equal design approval.
- No `development-handoff` may be written or treated as authoritative until Planning, UI/layout, Chinese user critique, and Implementation/QA review gates are closed.
- If review agents are unavailable, the design status is `blocked for review`, not `pass`.
- `08 方法实验室` and `09 研究模式` are advanced-entry drafts unless a later reviewed slice promotes them; `10 全局状态集` is a QA/state-spec board, not a user workflow page.

## 4A. Multi-Agent Slice Loop

后续非平凡 slice 不允许由 main agent 单线规划、实现、口头通过。每个 slice 必须固定进入多 agent 循环，并在 `plan.md` 或 active process log 记录 handoff、owner、review 证据和关闭结论。

Required roles:

- Planning agent：只负责把用户目标、现有计划、当前日志、设计合同和风险整理成一个可执行 slice handoff；必须写清 scope、non-goals、verification、closure gate、stop conditions 和 reviewer assignments。
- Code-only agent：只按 Planning agent handoff 修改代码或文档；不得重新规划、扩大范围、偷偷改变产品边界或把 reviewer 意见改写成自己的新需求。
- Engineering critique agent：只做工程挑刺和集成审查；必须检查唯一 owner、实现边界、测试证据、回归风险、脚本/构建/数据合同一致性。
- UI Chinese user critique agent：只用中文真实用户/工程使用者视角挑刺；必须从 UI 是否精简、路径是否直接、冗余是否过多、是否像工程软件、结果是否直接可用、默认页面是否先给工程结论等角度批判。

Ownership rules:

- 每个 slice 必须有且只有一个 `slice owner`，负责推动该 slice 到 handoff-ready 或 closure-ready。
- 每个实现切片必须有且只有一个 `integration owner`，负责最终集成判断、冲突收敛、验证证据归档和关闭建议。
- 同一人可以在小切片中兼任 slice owner 与 integration owner，但文档必须显式写出。不得出现多个 integration owner 或无人负责的 closure。

Role boundaries:

- Code-only agent 只执行 handoff 中列出的变更和验证；发现 handoff 缺关键产品定义时必须停下记录问题，不能自行扩范围。
- Review agents 只评审，不直接改实现；如必须给修复建议，必须标成 finding / required fix / suggested fix。
- Planning agent 不把未验证的实现结果写成完成状态；Code-only agent 不把未审查的结果写成最终 pass。

Review finding severity is mandatory:

- `blocking`：阻止 slice 关闭，必须修复或明确改 scope 后重审。
- `risk`：可带风险关闭，但必须记录证据、影响面和后续检查。
- `nit`：不阻止关闭的小问题，必须说明为什么不阻塞。

Review pass evidence:

- review pass 必须引用具体证据，例如命令输出 token、`result.json` / `summary.md` 路径、截图路径与分辨率、文件/行级检查、或明确的 diff/document review 范围。
- 不允许只有 “looks good”、“pass”、“已审查” 这类口头 pass。

UI Chinese user critique blocked/risk rules:

- 如果默认界面看不到工程用户要用的结果、路径必须绕到方法调试页才能消费结果、页面像实验 demo 而不像工程软件、关键状态需要读长日志才能判断，必须标为 `blocking`。
- 如果 UI 可用但冗余明显、文案不够工程化、结果可用性需要更多证据、或可读性依赖过多 UIA token，至少标为 `risk`。
- UI 用户挑刺结论必须用中文写入 closure review 或 active process log。

Closure gate:

- 关闭前必须具备 Planning handoff、Code-only implementation record、Engineering critique findings、UI Chinese user critique findings、verification evidence、integration owner closure decision。
- 任何 `blocking` finding 未修复时，slice 不得标记 completed。

## 5. Plan Hierarchy

Use three levels:

```text
Plan-total.md
  Overall roadmap and module sequence.

docs/<topic>-plan.md
  Domain-specific design contract and plan-step decomposition.

plan.md
  Current executable slice only.
```

Every significant plan must define:

- goal
- user problem
- scope
- non-goals
- affected workflow
- data objects
- page/region layout
- components
- interactions
- verification route
- closure review target
- stop conditions
- agent/reviewer assignments

Do not use one-line tasks such as "做地层分层页" or "完善方法对比". Break them into plan-steps that define concrete layout, data, interaction, and evidence.

## 6. Universal Method Workflow Principles

Future method work must be designed around generic tasks and outputs, not around hard-coded method names.

The system should recognize capabilities such as:

```text
LayerScheme              -> 分层方案
ClassificationEvidence   -> SBT/SBTn/分类证据
ParameterSeries          -> 参数曲线
ParameterScheme          -> 参数解译方案
MethodRun                -> 方法运行记录
AdoptedScheme            -> 已采纳方案
```

Method names such as pyCPT, Groundhog, Ic/SBT, or custom formulas are implementations that fill capability slots. Do not create a separate primary workflow page for each method.

Generic routing rule:

```text
method outputs LayerScheme            -> 地层分层页
method outputs ClassificationEvidence -> SBT/分类证据视图
method outputs ParameterSeries        -> 参数解译页
method metadata/logs/debug output     -> 方法实验室
adopted schemes                       -> 成果输出
```

Every method-related UI decision must pass four questions:

1. 是否通用：can it support future built-in, imported, and user-defined methods?
2. 是否必要：does it belong in the default screen, or should it be in details/advanced/logs?
3. 科研与工程是否需要：does it serve research comparison, engineering adoption, or both?
4. 是否直接且不复杂：does the user see the result first and details only on demand?

## 7. Stratification And Parameter Workflow

`地层分层` is the primary consumer of methods that produce layer schemes and classification evidence.

The stratification page should be planned as:

```text
Top: current point, current scheme, run/save/adopt actions
Left: LayerScheme list
Center: CPT/CPTU curves + layer track + SBT/classification evidence
Right: selected layer/boundary details
Bottom: method comparison, logs, preflight; collapsed by default
```

Default screen content should answer:

- 当前点位有哪些分层方案？
- 当前方案如何分层？
- 每层深度、土类、来源、不确定性是什么？
- 这套方案能否作为参数解译输入？

Advanced or bottom-panel content may answer:

- 多方法边界差异
- 土类一致率
- 不确定区间
- 方法日志
- input/output artifacts
- provenance

`参数解译` must consume a selected `LayerScheme` before method selection.

Parameter planning should follow:

```text
select LayerScheme
  -> configure parameter slots by soil behavior/type
  -> run methods
  -> produce ParameterScheme
  -> visualize curves and layer statistics
```

Parameter method pickers must be filtered by capability:

- output parameter, such as `φ'`, `Su`, `γ`, `OCR`, `Dr`
- applicable soil type or behavior type
- required input fields
- current data availability

Do not show all methods in every picker.

## 8. Method Lab Boundary

`方法实验室` is a method registration, testing, and debugging center.

It may show:

- method registry
- capability declarations
- input requirements
- install/runtime state
- test run controls
- result preview
- logs, warnings, artifacts, and provenance

It is not the primary result-consumption page.

Primary result consumption belongs to:

- `地层分层` for `LayerScheme` and `ClassificationEvidence`
- `参数解译` for `ParameterSeries` and `ParameterScheme`
- `成果输出` for adopted schemes

## 9. UI Direction

The current UI direction is locked to:

```text
VSCode-like 工作台
```

Current UI work must follow `docs/ux-v5-vscode-like-workbench-contract.md`. Do not interpret "VSCode-like" freely.

Accepted anatomy:

- VSCode-style top app/menu/command chrome
- dark Activity Bar
- light Explorer / engineering tree
- central Editor Tabs / document area
- right Side Panel / object details
- bottom Panel for issues/logs/preflight/comparison
- blue Status Bar
- compact density, tree rows, tab rows, borders, selected states, hover/focus feedback
- useful Explorer nodes that open or activate matching documents

Current VSCode-like color baseline:

- `VSCodeActivityBar`: `#333333`
- `VSCodeTitleBar`: `#DDDDDD`
- `VSCodeSideBar`: `#F3F3F3`
- `VSCodeEditor`: `#FFFFFF`
- `VSCodeLine`: `#E5E5E5`
- `VSCodeAccent`: `#007ACC`

Semantic colors remain separate:

- green for complete/success
- orange for warning/pending
- red for blocking/error

Do not revive older custom visual directions or older palette rules when they conflict with the VSCode-like contract.

## 10. Agent Review Policy

For each major design plan or implementation slice, define reviewer roles before closure.

Default reviewer roles for method-workflow planning:

- Product architecture reviewer: checks workflow generality, object model, and whether the plan avoids hard-coding one method.
- Geotechnical domain reviewer: checks CPT/CPTU, stratification, SBT evidence, and parameter-interpretation logic.
- UI/layout reviewer: checks VSCode-like layout, density, readability, alignment, and directness.
- Implementation/QA reviewer: checks WinUI feasibility, data contracts, verification route, and regression risk.

Use independent subagents when they are available, authorized, and useful for the slice. If no subagent can be used, perform a written self-review and record why.

Reviewer output must state:

- pass / risk / blocked
- blocking findings
- residual risks
- missing checks
- required fixes

## 11. Implementation Rules

Preserve current repo decisions unless explicitly changed:

- keep runtime data under `app_data/`
- keep product naming fixed to `SIGS-OGLab | 海上风电岩土勘察解译`
- prefer native WinUI controls
- keep the Yingkou/sample regression data as current regression coverage unless a slice explicitly changes fixture strategy
- keep formula work traceable to `Mayne著作翻译.md` and `公式规格说明.md`
- keep exports and helper tools inside the workspace

Do not change these without explicit scope confirmation:

- SQLite schema
- CPTU import parsing or commit semantics
- data-check rules
- interpretation formulas or source-backed engineering logic
- parameter algorithms
- export file content contracts
- packaging/runtime environment behavior

## 12. Launch Discipline

Use the known launch route when the desktop app must be opened:

```powershell
Start-Process -FilePath ".\Launch-OffshoreGeotechWorkbench.cmd" -WorkingDirectory "D:\CPT-UIQA"
```

Required flow:

1. Close stale `OffshoreGeotechWorkbench` processes only when they were started for verification or are locking build output.
2. Build first when code changed.
3. Launch once through `Launch-OffshoreGeotechWorkbench.cmd`.
4. Wait for a main window handle and verify title `SIGS-OGLab | 海上风电岩土勘察解译`.
5. If no window appears, inspect process state, app/event logs, and recent build output. Do not cycle through random launch methods.
6. If the app is already running and only screenshots are needed, reuse that window.

Before any rebuild, stop the running app instance if it was launched for verification.

## 13. Verification

For substantial code or workflow changes, run the local QA gate unless the change is documentation-only or the user explicitly asks for a faster partial check:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-qa\run-local-quality-gate.ps1 -CaptureScreen
```

Preferred handoff evidence:

- `LOCAL_QA_RESULT=PASS`
- `result.json`
- `summary.md`
- relevant 1920x1080 full physical screenshots

For documentation-only governance changes, at minimum run:

```powershell
git diff --check -- <changed docs>
```

Use focused checks before full QA when iterating on one failure.

## 14. Screenshot Acceptance

For layout, design, interaction, typography, chart, or page-review work, UIA and source review are not enough.

Acceptance screenshot rules:

- Use full physical desktop screenshots.
- Current host baseline is `1920x1080` at Windows `125%` scaling.
- Screenshots must show the intended foreground app, window title, and target page.
- Cropped/window-only screenshots are debugging artifacts unless the user explicitly accepts them.
- Record screenshot paths and physical resolution in the process log.
- If the screenshot captures the wrong app/page or wrong resolution, it is invalid evidence.

For current UI work, closure review must explicitly judge whether the screen reads as VSCode-like and whether the primary engineering evidence is readable.

## 15. Closure Review

Run one closure review after a major slice is ready to close, not after every small edit.

Closure review must include:

- reviewed item
- files reviewed
- verification executed
- findings
- residual risks
- required fixes
- follow-up checks

For UI-facing work, also review:

- VSCode-like layout resemblance
- density and spacing
- tree/Tab/status selected-state consistency
- text clipping, truncation, overlap
- whether interactive elements visibly look interactive
- whether primary evidence remains readable

If blocking issues are found, the slice remains open.

## 16. Repeated Failure Handling

If the same concrete verification problem fails after three fix attempts:

1. stop repeating the same approach
2. record the failed attempts and symptoms in the active process log
3. search for credible guidance or known framework/tool issues
4. choose at most two evidence-backed approaches
5. try those approaches
6. if both fail, document unresolved status and decide whether the slice is blocked

Do not hide blockers by logging them as residual risks when they prevent the completion gate.

## 17. Process Logs

`Process.md` is the lightweight process index. Do not turn it into a monolithic execution log.

Detailed progress belongs in `process_logs/`.

After each major slice or governance change, update the active process log with:

- date
- item name
- intent
- files changed
- verification run
- closure-review summary
- problems and resolutions
- open risks
- next step

Update `Process.md` when:

- the active theme changes
- the active process log changes
- a new process file is created
- a durable lesson should be visible without reading every historical log
