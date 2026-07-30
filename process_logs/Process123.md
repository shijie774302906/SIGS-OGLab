# Process123 - 全局反馈入口与 FormSubmit 中文表单

Date: 2026-07-23

Status: `closed / implemented / verified`

## Goal

- 让普通用户在任意工作流页面左下角直接提交问题或建议。
- 不要求访客注册、登录或使用 GitHub，并保留项目邮箱兜底。

## Result

- 左导航底部增加唯一的“反馈与建议”入口，不占用工程主工作面或右侧工具栏。
- 项目内直接完成中文反馈：`使用问题 / 功能建议 / 其他`、必填内容、选填截图和联系方式。
- 截图只接受 PNG/JPG，最大 10 MB；无效文件在浏览器内拦截，不发送请求。
- FormSubmit 已通过 `sigsoglab@163.com` 激活；真实验收请求返回 HTTP 200、`success: true`。
- 提交中按钮即时禁用；成功后明确完成；失败时保留全部输入并可原位重试。
- 首次未激活响应转换为简短中文说明，并保留已填内容供确认后重试。
- 邮件入口默认折叠为次操作，支持预填当前功能页、发送邮件、复制邮箱和手动复制兜底。
- 请求只包含用户主动填写的反馈、附件、`SIGS-OGLab` 来源和当前功能页名称，不附带项目、点位或测量数据。
- 已移除 Tally 运行依赖、失效授权连接和相关界面文案。

## Verification

- `npm.cmd run build`：通过；仅保留既有的大包体积提示。
- `tests/e2e/project-feedback.spec.ts`：5/5，通过成功、失败重试、首次激活、附件限制、路由与邮件兜底。
- `process_logs/verification/Process123-closure.json`：67/67 specs；domain-fast 223/223、ui-isolated 87/87、real-serial 30/30。
- 1440×900 与 1920×1080：弹窗完整可见，横纵溢出均为 0。
- 浏览器 console error 0、page error 0。
- FormSubmit 真实验收：HTTP 200、`The form was submitted successfully.`。
- Known Problem Gate：KPB-002、004、008、011、012 均已处置并通过。

## Evidence

- `process_logs/playwright-mcp/process123-global-feedback/feedback-form-1440x900.png`
- `process_logs/playwright-mcp/process123-global-feedback/feedback-form-1920x1080.png`
- `process_logs/playwright-mcp/process123-global-feedback/browser-check.json`
- `process_logs/playwright-mcp/process123-global-feedback/evidence-manifest.json`
- `process_logs/verification/Process123-closure.json`
- `process_logs/knowledge-reviews/Process123.json`

## Review

- 视觉：入口克制，弹窗保持单一主操作；两个分辨率下层级、留白、字段密度和可读性正常。
- 交互：必填、提交中、成功、失败、重试、取消、首次激活和复制失败均有明确反馈与恢复路径。
- 隐私：未发现项目名、点位名、测量值或 URL seed 进入提交载荷。
- 工程边界：本功能不读取或修改任何 CPT/CPTU 数据、分层、参数或成果对象。

## Known Problems

- KPB-002：提交中状态和按钮禁用顺序有自动化断言。
- KPB-004：失败原因、影响、保留输入、重试和邮件兜底均有覆盖。
- KPB-008：提交反馈是唯一主操作；邮件默认折叠为次操作。
- KPB-011：不适用；本切片没有跨责任页修复或工程数据修改。
- KPB-012：真实外部投递、字段语义、隐私边界、双分辨率和完整回归均有证据。

## Boundaries

- 反馈由第三方 FormSubmit 投递到项目邮箱，项目本身不建设反馈数据库或服务端。
- 附件遵循 FormSubmit 的 10 MB 总限制；本界面进一步限定为单张 PNG/JPG。
- 本轮不自动收集浏览器、项目、点位、测量或工程结果信息。
- 邮件是否进入收件箱仍受 163 邮箱自身的垃圾邮件规则影响。
