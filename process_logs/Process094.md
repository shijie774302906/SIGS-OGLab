# Process094 - 流程一致性与证据新鲜度门禁

Date: 2026-07-15

Status: `closed / implemented / verified`

## Goal

把计划、Process 索引、知识报告、精选证据与关闭状态之间的机械一致性变成可执行门禁。自动化只回答“有没有、是否最新、是否一致”，不替代工程结论、not-applicable 判断或人工评审。

## Implemented

- 新增 `npm.cmd run process:doctor -- --process NNN`，可自动识别指定 Process 的活动或历史关闭状态；`--phase closure` 提供严格关闭检查。
- 活动阶段把未完成待办、pending 知识门禁和缺少 final manifest 作为提示，但编号冲突、报告上下文失效和知识关系单向仍立即失败。
- 关闭阶段检查 plan、Process 当前/历史索引、归档状态、未完成待办、受管 Process070+ 漏入更新库、Process↔KPB 双向关系、知识报告上下文、证据路径和最终 manifest。
- 历史关闭 Process 可在新切片活动期间独立检查；历史报告保留关闭时的问题库哈希，后续知识库增长不会单独使历史失效。
- 新增 `evidence:manifest create/audit`：绑定归档上下文、实现与相关测试、精选证据、验证命令/退出码、Node/Playwright/Chromium 环境和确定性种子或真实来源。
- manifest 对输入和证据使用排序后的逐文件 SHA-256 与聚合哈希；新增、缺失或变化均报告准确路径。
- final manifest 要求至少一条验证命令且全部退出码为 0；所有验证完成后才原子替换 manifest，失败时保留旧文件。
- `process:doctor --output ... --json` 可生成机器可读诊断记录。
- 补齐遗漏的 Process091 更新条目，并与 KPB-001/002/004/005/006/007/009/011/012/013 建立双向关系。
- 刷新 Process093 双分辨率和真实营口精选证据，生成首份 final manifest；历史 Process093 doctor 已通过。
- 新增 KPB-016，后续计划提到流程状态漂移、plan/Process 一致性或证据哈希过期时会自动回流本轮检查。

## Verification

- `npm.cmd run process:test`: `13/13` passed，覆盖正常关闭、历史关闭、外部历史 manifest、活动提示、编号冲突、漏更新库、pending、stale、输入变化、证据增删改、失败命令和原子保留。
- `npm.cmd run knowledge:test`: `5/5` passed。
- `npm.cmd run build`: passed。
- `npm.cmd run knowledge:validate`: passed with 16 problems and 25 updates after closure registration。
- Process093 milestone evidence refreshed: synthesized 43-layer and real 4,282-row Yingkou tests both passed。
- Process093 final manifest audit: 14 bound inputs and 13 curated artifacts, all current；historical `process:doctor -- --process 093` passed while Process094 was active。
- Process094 active doctor passed with only expected pending/todo notices；strict closure doctor passed after final manifest generation。

## Evidence

- `process_logs/playwright-mcp/process094-process-tooling/doctor-active.json`
- `process_logs/playwright-mcp/process094-process-tooling/evidence-manifest.json`
- `process_logs/playwright-mcp/process093-dense-stratification-view/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process094.json`

## Boundaries And Next Work

- No product UI, engineering formula, measurement, local project authority or Playwright reset behavior changed。
- No evidence deletion, transient cleanup, verify:slice selection, automatic process:close or test-tier split was implemented。
- Recommended next sequence remains: unified Playwright reset fixture and domain-fast/ui-isolated/real-serial tiers, then verify:slice, evidence promotion/audit/clean, and finally process:close --dry-run。
