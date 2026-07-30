# Five Feature Zones Agent Review

Date: 2026-07-09

Target document:

- `docs/prototype/five-feature-zones-functional-blueprint-2026-07-09.md`

Review mode:

- Read-only review.
- No implementation changes requested from agents.
- Main Codex agent integrated accepted findings into the blueprint and `plan.md`.

## Result

No P0 findings were reported by any review agent.

| Agent | Focus | Result |
| --- | --- | --- |
| `visual-layout-taste-auditor` | Layout density, Mixpanel-like workbench structure, visual acceptance risks | P1/P2 accepted and integrated |
| `geotechnical-domain-reviewer` | CPT/CPTU workflow safety, parameter/output wording, engineering handoffs | P1/P2 accepted and integrated |
| `copy-ia-mobbin-challenger` | Copy, IA, Mobbin/Mixpanel mapping, redundancy risk | P1/P2 accepted and integrated |

## Integrated Findings

### Visual Layout Review

Accepted findings:

- Add first-screen layout contract for each zone.
- Make right-panel responsibility stricter: selected object, state reason, next dependency, relevant view setting or note.
- Define each zone's primary evidence surface.
- Avoid repeated card layouts; prefer dense tables, matrices, trees, and compact lists.
- Add visual acceptance hooks for `1440x900` and `1920x1080`.

Integrated changes:

- Added `Layout Contract By Zone`.
- Added `Right Panel Priority Rules`.
- Added `State Visual Coding Rules`.
- Replaced package `map/cards` language with manifest tree and readiness matrix.

### Geotechnical Domain Review

Accepted findings:

- Parameter/output wording must not imply formal deliverable approval.
- Parameter problems should return to the owning object, not always to stratification.
- Data preparation needs CPT/CPTU field, unit, depth, water-depth, and final-depth contracts.
- Evidence charts need unit, axis, and non-official-formula safety checks.

Integrated changes:

- Replaced `可进入成果`, `可引用`, `已完成`, and approval-like wording with `可进入成果预览`, `可作为预览引用`, and `已试算`.
- Split parameter fallback paths by object ownership:
  - field/unit gaps -> `数据准备区`
  - depth or data-quality issues -> `数据检查区`
  - layer/boundary review -> `地层分层区`
  - method applicability -> `参数解译区`
- Added `必要字段与单位契约` and `深度基准与范围`.
- Added chart-safety acceptance checks for depth axis, units, Qtn, Fr, and SBTn cues.

### Copy / IA / Mobbin Review

Accepted findings:

- Remove analytics-domain terms from implementation-facing module rows.
- Rename hard or bureaucratic terms such as `准入判断`.
- Reduce repeated `输出` labels inside the output zone.
- Clarify duplicated surfaces:
  - `导入提示` is a preparation hint.
  - `问题清单` is a check result.
  - `证据图表模式` is a chart mode, not a second canvas.
  - parameter scheme switching belongs in the right panel, with center reserved for result evidence.

Integrated changes:

- Replaced implementation-facing `query`, `filter`, `breakdown`, and `Right configuration` language with domain terms such as condition, view setting, and evidence detail.
- Renamed `准入判断` to `进入分层判断`.
- Renamed `输出预检`, `输出限制`, and `输出预览` to `成果预检`, `使用限制`, and `成果预览`.
- Renamed `导入问题提示` to `导入提示`.
- Renamed `证据视图` to `证据图表模式`.

## Remaining Follow-Ups

These are not P0/P1 issues for the planning document, but should be checked during implementation:

- Capture `1440x900` and `1920x1080` screenshots for each UI slice where visual acceptance matters.
- Verify the primary evidence surface stays visible in the first viewport.
- Verify right-panel content does not duplicate full center tables.
- Verify status chips use `问题` language and do not imply formal save, formal adoption, production persistence, or formal export.
- Decide whether the left navigation should remain six workflow pages grouped into five zones, or become exactly five top-level pages after Slice A proves the grouping.
