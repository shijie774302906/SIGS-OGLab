# Process091 - 引导式数据调整与测点永久移除

Date: 2026-07-14

Status: `closed / implemented / verified / independently reviewed`

## Goal

将数据检查中的异常处理收敛为“当前问题摘要 + 专用调整向导”，让工程师在完整 qc、fs、u2 曲线旁以固定选项处理单点或同类问题，并在不改写上传原始证据的前提下安全移除工作测点。

## Implemented

- 数据检查默认页面只保留当前问题、影响和一个主操作“处理这个问题”；规则、历史、表格与旧快捷工具默认收进高级详情。
- 新增接近全屏的数据调整向导，提供完整三联曲线、当前深度定位、问题进度、数字分页和固定决定。
- 单点固定选项为：从工作数据移除、手动调整 qc/fs/u2、保留原值；关闭或取消整场会话不产生任何修改。
- 同类问题按孔位、规则原因、字段和严重程度精确分组，可批量保留并接受提示，或在安全范围内批量移除。
- 批量移除仅允许非相邻孤立点且不超过全孔有效行的 1%；超限时禁用并要求逐点复核或返回导入页。
- 永久移除写入不可恢复的工作数据排除修订，原始上传、源行和附件哈希保持不变；界面恢复只能重新导入原文件。
- 最终提交采用一次原子调整批次，并要求选择移除原因、填写工程师说明；审计理由包含检查项、深度、当前 qc/fs/u2 与说明。
- 提交后自动重跑数据检查，并使旧分层、JTS、参数与成果依据正确失效。
- 修复旧状态桥接误把同一导入草稿当作新草稿的问题；快速土层确认先同步写入轻量恢复日志，再合并大型 IndexedDB 写入，刷新后可恢复且真实大数据交互无长任务。

## Verification

- `npm.cmd run build`: passed.
- Process091 targeted Playwright: adjustment guide `2/2` passed；相关检查、治理、导入与分层回归 `22/22` passed after persistence-aware assertions.
- General Chromium regression: `240/240` passed with normal parallel workers.
- Real Yingkou Chromium regression: `2/2` passed with one isolated worker; the full three-point flow, reload/switching, invalid workbook recovery and downstream interpretation all passed.
- Total final Playwright coverage: `242/242` passed. The real Yingkou suite is intentionally isolated so parallel CPU contention cannot contaminate its performance gates.
- Real profile performance evidence: CPT09 open `70.4 ms`, switch `31.0 ms`; CPT19 open `58.4 ms`, switch `67.7 ms`; SCPT1 open `51.0 ms`, switch `52.4 ms`; longest task `0 ms` for all three.
- 1440x900 and 1920x1080 evidence: horizontal overflow `0`, dialog inside viewport, curve minimum height `420 px`, console/page errors `[]`.
- Known Problem Gate: KPB-001/002/004/005/006/007/009/011/012/013 dispositioned; `knowledge:gate` passed.

## Independent Review

- Visual Layout Taste Auditor: PASS, P0=0, P1=0.
- Geotechnical Domain Reviewer: PASS, P0=0, P1=0; destructive bulk action is bounded and safe to close.
- Copy / IA / Performance Reviewer: PASS, P0=0, P1=0; default path remains compact and large-project performance passed.

## Evidence

- `process_logs/playwright-mcp/process091-data-adjustment-guide/default-problem-1440x900.png`
- `process_logs/playwright-mcp/process091-data-adjustment-guide/default-problem-1920x1080.png`
- `process_logs/playwright-mcp/process091-data-adjustment-guide/blocking-batch-delete-1440x900.png`
- `process_logs/playwright-mcp/process091-data-adjustment-guide/blocking-batch-delete-1920x1080.png`
- `process_logs/playwright-mcp/process091-data-adjustment-guide/delete-review-1440x900.png`
- `process_logs/playwright-mcp/process091-data-adjustment-guide/browser-check.json`
- `process_logs/playwright-mcp/process088-check-profile-curves/real-yingkou-performance.json`
- `process_logs/knowledge-reviews/Process091.json`

## Boundaries And Deferred Polish

- This remains a browser-local prototype; no backend, collaboration, formal engineering adoption, or official formula changes were added.
- Permanent removal means removal from current working and downstream calculation input, not erasure of the immutable uploaded evidence.
- Non-blocking P2: advanced details still retain the old immediate single-row tools, and the dialog header/footer repeat progress lightly.
