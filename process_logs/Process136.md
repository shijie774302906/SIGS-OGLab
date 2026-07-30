# Process136 - 图册解读自由只读问答

Date: 2026-07-30

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 让 DeepSeek 自行决定是否调用图册只读工具，并保留针对用户当前问题生成的回答。
- 移除前端强制读取、内部补问和固定页面摘要覆盖，同时保持图册端完全只读。

## Result

- 图册解读支持零工具直接回答、一次或多轮只读工具调用；前端不再强迫模型读取当前页。
- 模型最终回答原样进入会话，不再被固定页面摘要替换；不同问题会得到对应的不同回答。
- 快捷操作改为“解释本页图表”，不会在无分类图页面诱导生成不存在的分类内容。
- 当前上下文使用“正在查看 · 当前页”，请求期间显示“正在回答”；安全提示明确说明回答不代替工程复核。
- 长对话按完整用户问答周期裁剪；单个问题的多轮工具调用按完整 `assistant tool-call + tool results` 子块裁剪，始终保留最近事实且不产生孤立工具结果。
- 页码、冻结修订或 authority 变化仍会清空旧会话并丢弃迟到响应；失败保留原问题，可原位重试。

## Verification

- `npm.cmd run verify:slice -- verify --process 136 --mode closure`：通过。
  - domain-fast：257/257。
  - ui-isolated：119/119。
  - real-serial：32/32。
  - 合计：408/408，74/74 个 spec。
- `npm.cmd run test:assistant-server`：24/24。
- `tests/e2e/quick-plot-domain.spec.ts`：41/41；包含单问 5 轮 × 4 工具的极端裁剪验证。
- `tests/e2e/quick-plot-ui.spec.ts`：17/17；包含零工具回答、三问三答、18 次连续追问、切页失效、运行态和重试。
- build、测试分层审计、Process 工具测试、知识库校验和知识门禁全部通过。
- Visual、Geotechnical/Data/Permission、Copy/IA/Recovery 三类只读复查均为 PASS，P0=0、P1=0。

## Evidence

- `process_logs/playwright-mcp/process136-free-report-agent/input-assistant-1440x900.png`
- `process_logs/playwright-mcp/process136-free-report-agent/input-assistant-1920x1080.png`
- `process_logs/playwright-mcp/process136-free-report-agent/report-reader-1440x900.png`
- `process_logs/playwright-mcp/process136-free-report-agent/report-reader-1920x1080.png`
- `process_logs/playwright-mcp/process136-free-report-agent/browser-check.json`
- `process_logs/playwright-mcp/process136-free-report-agent/evidence-manifest.json`
- `process_logs/verification/Process136-closure.json`
- `process_logs/knowledge-reviews/Process136.json`
- `process_logs/reviews/Process136.md`

## Known Problems

- KPB-001：三种不同问题的原始模型回答均真实显示，第一页不会虚构分类图。
- KPB-002：请求期间显示明确运行态并禁用重复发送。
- KPB-004：失败保留原问题，可原位重试且不会重复插入用户消息。
- KPB-011：图册解读只读，重试、切页和续问不会修改数据或图册。
- KPB-012：真实规模回归、双分辨率截图、机器断言及三类复查共同覆盖工程语义。
- KPB-013：抽屉默认只呈现当前页、简短边界、快捷问题和输入框。
- KPB-025：自主工具选择、第二轮协议、截断恢复和跨 profile 白名单由助手服务测试覆盖。

## Boundaries

- 图册解读没有 write、edit、delete、import、regenerate 或专业流程修改工具。
- 自由回答仅用于理解已生成图册，不代替工程复核，也不会成为正式土类、参数或设计结论。
- 本轮没有改变图册计算、分类、分层、参数公式、数据导入协议或原始测量。
- API Key 仍只存在当前标签页内存；浏览器本地项目数据仍是权威来源。

## Residual P2

- 自由文本回答仍具有模型固有的不确定性；后续可把真实失败问法持续加入回归样本。
- 1440px 下“导出完整 PDF”可能换到第二行，但完整可见且不遮挡内容。
