# Process130 - DeepSeek 导入多轮工具稳定性

Date: 2026-07-25

Status: `closed / implemented / verified`

## Goal

- 查明数据导入助手在成功读取来源后显示“DeepSeek 服务暂时不可用”的真实原因。
- 让 `deepseek-v4-pro` 稳定完成读取来源与生成整理草稿的多轮工具调用。
- 不扩大 AI 写权限，不改变原文件或测量值。

## Diagnosis

- 本地助手、API Key 和第一次读取请求均正常。
- 原故障发生在第二次请求：导入整理沿用 1,200 token 的短问答上限，上游返回 `finish_reason=length`，但服务端将它误报为服务不可用。
- `deepseek-v4-pro` 思考模式的工具调用响应包含 `reasoning_content`；原无状态中继没有带回该协议字段，部分后续请求会被上游以 400 拒绝。

## Result

- 数据导入整理使用 8,000 token；普通专业问答继续使用 1,200 token。
- 第一轮工具调用的 `reasoning_content` 作为不显示、受长度限制的协议字段随第二轮请求带回；`tool_call_id` 继续由请求校验层转换。
- 导入请求前端和本地中继超时提高到 60 秒，普通问答保持 25 秒。
- `finish_reason=length` 显示“整理内容未生成完整”，工具格式问题显示“返回的整理格式不完整”；401、402、429、超时和真实 5xx 保持独立原因。
- 右侧助手仍只有重试和手动映射恢复；没有自动提交、静默修改或旁路写入。
- 新增 KPB-025，后续涉及思考模型、多轮工具调用或 token 上限的切片会自动命中相同检查。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- Assistant server：18/18 通过。
- 导入助手目标测试：12/12 通过。
- Domain fast：238/238 通过。
- UI isolated：105/105 通过。
- Real serial：31/31 通过。
- 真实 DeepSeek 两轮调用：第一轮读取来源 HTTP 200；第二轮 HTTP 200，正常返回 `ask_import_question`，没有服务错误。
- 本地能力接口：`serviceAvailable=true`、`provider=deepseek`、`model=deepseek-v4-pro`。

## Evidence

- `process_logs/playwright-mcp/process130-deepseek-import/browser-check.json`
- `process_logs/playwright-mcp/process130-deepseek-import/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process130.json`

## Known Problems

- KPB-003：来源或工作区修订变化会取消旧请求，旧响应不能覆盖新来源。
- KPB-004：截断、格式、Key、额度、限流、超时和服务故障使用不同原因并保留恢复入口。
- KPB-008：确认并导入仍是唯一最终写入动作。
- KPB-011：失败留在数据导入责任页，允许重试或手动映射。
- KPB-012：真实 SCPT1、多类生成 CSV、真实模型两轮调用和三层回归共同验证。
- KPB-023：缺失 `u2` 继续保持为空，不补造 0。
- KPB-025：思考模型协议字段、输出预算和错误分类已形成固定回归。

## Boundaries

- `reasoning_content` 只用于满足模型提供方的多轮调用协议，不显示、不持久化为工程证据，也不参与工程判断。
- AI 整理仍只生成待确认草稿；原始上传文件和现有工作数据保持不变。
- 当前仍只实现 DeepSeek，不扩展其他模型供应商。
