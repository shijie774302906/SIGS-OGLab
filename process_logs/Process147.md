# Process147 - 图册可读性与专业向导安全回退

Date: 2026-08-03

Status: `closed / implemented / verified / independently reviewed`

## Goal

提高 15 页快捷图册在真实 80% 页面缩放下的文字、图例和来源可读性，并为专业地层分层、参数解译向导增加可恢复、可审计的相邻步骤回退。

## Result

- 快捷图册建立 A3 物理点值下限：来源 8 pt、图例 9 pt、正文 10 pt、标题 12 pt；15 页共享同一排版规则。
- 图册增加真实 80% 页面缩放。横版页面按 1920 × 80% = 1536 px 显示，仅图册舞台内部横向滚动，不再使用浏览器根节点缩放冒充页面比例。
- 进入新图册时工作区自动回到顶部，标题不会藏在固定顶栏下；第 15 页公式、条件和参考来源完整显示，Schneider 2008 的 R09 引文不再静默截断。
- 参数向导支持返回相邻上一步或点击较早步骤；取消时状态完全不变，确认后清除回退点及下游决定、失效旧成果，并要求工程师重新确认后才可再次输出。
- 地层分层向导支持恢复上一分层快照；新候选没有历史快照时可放弃候选并返回生成方式。原始 qc、fs、u2、归一化行和行引用不被修改。
- 回退保存失败时保留页面编辑和权威 IndexedDB 状态，用户重试后只提交一次，不产生半提交对象。
- 普通 Playwright 回归不再改写 Process146 的精选截图；历史截图已从其关闭提交重建并恢复到原 manifest 哈希。

## Verification

- `npm.cmd run build`：通过。
- 相关 Playwright 回归：96/96 通过。
- 全量 Chromium 串行回归：435 通过、11 个依赖未公开或未注入外部样本的用例按设计跳过、0 失败。
- PROCESS117：15 页混合方向图册与 A3 600 DPI PDF 通过。
- PROCESS147：15 页真实 80% 预览、1440×900 与 1920×1080、页面内部滚动、零浏览器错误通过。
- PROCESS111：参数连续回退、取消、刷新恢复、旧成果禁用、重新运行和成果输出通过。
- PROCESS092：完整 `normalized rows + rowReferences` SHA-256 在回退、保存失败、重试和刷新前后保持一致。
- Process146 指引回归：3/3 通过，非证据模式下历史精选目录保持不变。
- Known Problem Gate：5 个重要问题已处置，0 个提示待处理。
- 视觉、工程领域、文案/信息架构三类只读 Agent 最终均为 PASS，无 P0/P1。
- Evidence audit：0 errors；历史实现输入变化与旧目录无 manifest 仅作为预期 warning 记录。

## Evidence

- `process_logs/playwright-mcp/process147-atlas-rollback/evidence-manifest.json`
- `process_logs/playwright-mcp/process147-atlas-rollback/atlas-browser-check.json`
- `process_logs/playwright-mcp/process147-atlas-rollback/atlas-page-15.jpg`
- `process_logs/playwright-mcp/process147-atlas-rollback/atlas-80-percent-1440x900.png`
- `process_logs/playwright-mcp/process147-atlas-rollback/atlas-80-percent-1920x1080.png`
- `process_logs/playwright-mcp/process147-atlas-rollback/parameter-rollback-1440x900.png`
- `process_logs/playwright-mcp/process147-atlas-rollback/stratification-rollback-1440x900.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/browser-check.json`
- `process_logs/knowledge-reviews/Process147.json`
- `process_logs/evidence-audit-Process147.json`

## Boundaries

- 本切片没有修改工程公式、相关系数、单位换算、土类判定或原始测量值。
- 回退是当前专业工作流内的显式工程操作，不会自动恢复已经被新确认替代的旧决定。
- 私有营口数据和未注入的外部样本未进入代码或精选证据；相应用例在全量回归中按设计跳过。
- 本切片未执行生产部署。
