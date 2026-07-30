# Process81 - Workflow Gate Repair and 05 Single-Page Loop

Date: 2026-07-08

## Objective

Repair the UI/Figma workflow so future design work proceeds one page at a time, with hard gates before any design becomes implementation input.

User-approved sequence:

```text
修 workflow 文档和 plan 状态
-> 把 02-10 降级为 draft
-> 从 05 地层分层默认页开始单页循环
-> 05B 方法选择器
-> 06 参数解译默认页
-> 06A 参数方法选择器
-> 07 成果输出
-> 再回头处理 02 项目/点位数据
```

Loop rule:

```text
每次只做一个页面或一个强相关弹窗；
通过 workflow gate 后再进入下一页；
blocking 停止并汇报；
risk 必须记录并说明是否可继续。
```

## Completed In This Slice

- Added hard UI/Figma gates to `design.md`:
  - Scope gate
  - Product gate
  - Template gate
  - Layout gate
  - Feature gate
  - User gate
  - Review gate
  - Handoff gate
- Added explicit UI/Figma cautions to `AGENTS.md`.
- Changed `plan.md` active slice from the 02-10 batch to `05 地层分层默认页` single-page loop preparation.
- Demoted `docs/ui-02-10-mainflow-development-handoff.md` to `draft reference / not implementation input`.
- Demoted `docs/figma-interface-02-10-batch-review.md` to `draft / blocked for review`.
- Updated `Process.md` with the new current override.
- Added `docs/ui-05-stratification-default-planning-gate.md` as the first single-page planning gate.

## 02-10 Status

The following Figma nodes are draft material only:

| Draft | Node |
| --- | --- |
| `02 项目/点位数据` | `52:2` |
| `05 地层分层默认页` | `52:137` |
| `05A 地层分层对比详情态` | `52:301` |
| `05B 地层分层方法选择器` | `52:1039` |
| `06 参数解译默认页` | `52:412` |
| `06A 参数方法选择器` | `52:1050` |
| `07 成果输出` | `52:548` |
| `08 方法实验室` | `52:680` |
| `09 研究模式` | `52:800` |
| `10 全局状态集` | `52:894` |

They must not be implemented directly. Each page must re-enter the single-page loop and close review gates before a page-level development handoff can be written.

## Active Slice

Next active slice:

```text
05 地层分层默认页 - planning/function/layout gate
```

Required first outputs:

- Page function definition: drafted in `docs/ui-05-stratification-default-planning-gate.md`.
- Template inheritance check against `01 Workbench shell`, accepted `03 数据导入`, and accepted `04 数据检查`: drafted in `docs/ui-05-stratification-default-planning-gate.md`.
- Entry closure table for `运行分层`, `保存草稿`, `采纳为当前分层`, `用于参数试算`, `进入参数解译`, and `方法对比/查看差异`: drafted and patched in `docs/ui-05-stratification-default-planning-gate.md`.
- Reviewer assignments for Planning, UI/layout, Chinese user critique, and Implementation/QA: executed and re-checked.

## Boundary

This slice changed documentation only.

No WinUI code, Figma drawing, SQLite schema, import parser, quality-check rules, formula, algorithm, method registry, or export contract changed in this slice.

## Closure Status

`workflow gate repair`: complete.

`05 地层分层默认页 single-page design loop`: planning gate risk-closed after reviewer re-check. Ready for 05 Figma drawing; not eligible for development handoff.

## 05 Planning Gate Summary

Document:

- `docs/ui-05-stratification-default-planning-gate.md`

Key decisions:

- `05` is a `LayerScheme` and `ClassificationEvidence` consumption page, not a method lab or research page.
- The default page must show scheme status, layer result, layer track, layer table, evidence summary, and next actions.
- `运行分层` routes to `05B` or a single default method run; successful output creates a candidate `LayerScheme`, not an adopted result.
- `保存草稿` saves a draft `LayerScheme`, but does not become formal parameter input.
- `采纳为当前分层` writes the current adopted `LayerScheme` and becomes the default input for parameter interpretation.
- `用于参数试算` opens the parameter page in trial context without changing the formal adopted scheme.
- `进入参数解译` is the formal next action for an adopted layer scheme.
- `方法对比/查看差异` belongs in the bottom panel or later `05A`; it must not directly write formal output.
- The page must inherit `01 Workbench shell`, accepted `03 数据导入`, and accepted `04 数据检查` geometry and density.

Next gate:

- Draw `05 地层分层默认页` in Figma using this planning gate.
- Do not write development handoff until the Figma node, screenshot, and design review close.

Reviewer re-check has closed the Round 1 blocking finding.

## 05 Reviewer Round 1

Reviewers:

| Reviewer | Role | Result | Key finding |
| --- | --- | --- | --- |
| Parfit | Planning/contract | risk | Reviewer owners were still `待安排`; quality gate states lacked explicit `数据未检查 / 检查通过 / 警告可继续`. |
| Lagrange | UI/layout | risk | Internal 05 grid was too coarse; BottomPanel default state and local rail boundary needed tighter definition. |
| Erdos | Chinese user critique | blocked | Adopted scheme only exposed `用于参数试算`; Chinese engineering users need a formal `进入参数解译` next step. |
| Dirac | Implementation/QA | risk | Current WinUI state is projection-only and official write disabled; planning gate needed capability mapping, verification path, testable predicates, and reuse list. |

Patch applied to `docs/ui-05-stratification-default-planning-gate.md`:

- Added formal `进入参数解译` action for adopted schemes.
- Restricted `用于参数试算` to candidate/draft/unadopted schemes.
- Added internal layout grid constraints for local scheme list, curve/layer track, layer table, SBT evidence, and BottomPanel.
- Added explicit quality gate states: `数据未检查`, `数据检查通过`, `警告可继续`, and `数据检查阻塞`.
- Added current WinUI capability mapping, including `ProjectionOnly=true` and `OfficialWriteAllowed=false`.
- Added reuse list for existing stratification, parameter projection, method capability, and route objects.
- Added testable predicates and Figma/WinUI verification path.

Reviewer re-check:

| Reviewer | Role | Re-check result | Figma drawing allowed |
| --- | --- | --- | --- |
| Parfit | Planning/contract | pass | no by itself; overall gate waited for Erdos |
| Lagrange | UI/layout | pass | yes from UI/layout angle |
| Erdos | Chinese user critique | risk, blocking closed | yes |
| Dirac | Implementation/QA | pass | yes |

Integration owner decision:

```text
05 planning gate: risk close / Figma drawing may start
```

Residual risks:

- This only permits Figma drawing for `05 地层分层默认页`; it does not permit a development handoff.
- The future Figma page must still prove 1920x1080 shell inheritance and result-first readability.
- Current WinUI remains projection-only / official-write disabled unless a later implementation slice changes that boundary.
