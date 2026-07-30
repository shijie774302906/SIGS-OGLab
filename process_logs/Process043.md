# Process043 - Flow 1 Functional Research And Random Case Acceptance

Date: 2026-07-09

Theme: Flow 1 feature modules, random synthetic case, and Playwright acceptance evidence

Status: closed / documented

## Context

The user challenged the previous Flow 1 draft because it did not define acceptance evidence clearly, did not ask whether the intended effect was acceptable, and used the fixed Yingkou/CPT09 sample instead of generated random data.

The user requested a read-only investigation of `D:\CPT-UIQA` to understand the earlier functional planning and module definitions.

## Research Sources

- `D:\CPT-UIQA\docs\workbench-functional-design-spec.md`
- `D:\CPT-UIQA\docs\ui-03-data-import-development-handoff.md`
- `D:\CPT-UIQA\docs\ui-04-data-check-development-handoff.md`
- `D:\CPT-UIQA\docs\ui-02-10-mainflow-development-handoff.md`
- `D:\CPT-UIQA\tools\first-user-flow\README.md`
- `D:\CPT-UIQA\tools\first-user-flow\Program.cs`
- `D:\CPT-UIQA\sample_data\manual_walkthrough\README.md`

## Result

Created:

- `docs/prototype/flow-1-functional-research-random-case-2026-07-09.md`

The research concludes that Flow 1 should be reframed as:

```text
随机生成 CPTU 点位数据
  -> 确认随机案例
  -> 核对导入批次、字段和预览
  -> 运行数据检查
  -> 查看一个提示或问题
  -> 确认是否可进入地层分层
```

It also defines required feature modules, missing modules in the current web prototype, random data generation rules, flow handoff objects, and acceptance evidence including screenshots and `flow-run.json`.

## Boundary

- Documentation-only update.
- Desktop repository was read only.
- No desktop files were modified.
- No UI implementation files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.

## Next

Ask the user to confirm whether the first random scenario should be `valid-with-notice` before implementation.
