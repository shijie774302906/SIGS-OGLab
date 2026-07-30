# Process089 - 可复用问题库与关闭门禁

Date: 2026-07-14

Status: `closed / implemented / verified`

## Goal

把多轮修改中反复出现的问题、根因、修复和验收经验沉淀为可自动查询的问题库与更新库，并采用已确认的 A 规则：开工自动提示相似问题；关闭时重要命中没有验收证据则不能关闭。

## Implemented

- 建立 `docs/knowledge/problem-library.json`，首批包含 13 个可复用问题模式；每项具有确定性匹配组、症状、根因、预防规则、必做检查、更新记录和测试关系。
- 建立 `docs/knowledge/update-library.json`，索引 Process070-089 与问题 ID 的双向关系；详细历史继续由原 `process_logs/ProcessNNN.md` 承担。
- 新增 `knowledge:query`，可用一句问题描述直接查找相似问题、历史更新和检查要求。
- 新增 `knowledge:check`，根据一个或多个上下文文件生成切片报告，并绑定上下文与知识库哈希。
- 新增 `knowledge:resolve`，记录 `covered` 证据或有具体理由的 `not-applicable` 决定。
- 新增 `knowledge:gate`：重要命中仍待处理、证据为空、报告失效、匹配集合变化或关系断裂时返回失败。
- 新增结构校验和 Node 测试，覆盖正常匹配、无匹配、缺文件、未处置、处置后重试和 stale 报告。
- 把 Known Problem Gate 接入 `AGENTS.md` 与 `docs/process/feature-slice-template.md`，以后每个切片在实现前检查、关闭前门禁。
- 新增 `docs/knowledge/README.md`，明确问题新增、更新关联、查询、处置、关闭和退役规则。

## Current Slice Matches

- `KPB-004`：CLI 失败必须给出原因和恢复动作；由 missing、pending、stale、resolve 后重试测试覆盖。
- `KPB-010`：知识必须自动回流；由 13 个问题 / 20 条更新的结构校验、查询和完整门禁状态机覆盖。
- `KPB-012`：本轮不修改产品 UI、工程计算或可视化结果，因此真实工程数据与截图验收不适用；结构化对象和 CLI 语义由专项测试覆盖。

## Verification

- `npm.cmd run knowledge:validate`：passed，13 个问题、20 条更新、双向关系和文件引用有效。
- `npm.cmd run knowledge:test`：`5/5` passed。
- 实际查询“地层分层按钮点击没有反应”：命中 `KPB-002` 和 `Process086`。
- 当前 `plan.md` 自动检查：命中 3 个重要问题；补齐处置后 `knowledge:gate` passed。
- `npm.cmd run build`：passed；保留既有主 chunk 大于 500 kB 的 advisory。

## Evidence

- `process_logs/knowledge-reviews/Process089.json`
- `scripts/knowledge-check.test.mjs`
- `docs/knowledge/problem-library.json`
- `docs/knowledge/update-library.json`

## Boundary

- 本轮不修改产品 UI、工程公式、业务数据或浏览器持久化。
- 匹配采用可解释关键词组，不使用隐藏的语义相似度服务；误检必须说明不适用原因，漏检通过扩充匹配组和测试修正。
- 问题库保存可复用模式，更新库只保存关系索引，Process 日志仍是详细变更历史的唯一来源。
