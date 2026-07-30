# Process124 - 全站共享反馈入口

Date: 2026-07-23

Status: `closed / implemented / verified`

## Goal

- 修复反馈入口只存在于标准工作台的问题。
- 让项目首页、快捷出图输入页、快捷图册和标准工作台使用同一反馈表单。

## Result

- 抽出共享 `ProjectFeedbackLauncher`，统一表单字段、附件限制、提交状态、邮箱兜底和当前页面标识。
- 标准工作台继续在左侧导航底部显示入口。
- 无左侧导航的项目首页、快捷出图输入页和快捷图册改用克制的左下角浮动入口。
- 每种顶层页面外壳只渲染一个入口；关闭弹窗后焦点返回原入口。
- 新增 KPB-019，防止“全局功能只接入一个页面外壳”的问题再次出现。

## Verification

- `npm.cmd run build`：通过。
- `npm.cmd run test:domain-fast`：223/223 通过。
- `npm.cmd run test:ui-isolated`：88/88 通过，其中反馈测试 6/6。
- `tests/e2e/quick-plot-real.spec.ts`：营口真实工作簿 1/1 通过。
- 完整 `real-serial` 曾两次因运行器长时间无输出超时；本切片相关的快捷出图真实规模用例已单独串行通过。
- 1440×900、1920×1080：入口可见且唯一，弹窗完整，横向溢出为 0。
- 浏览器 console error 0、page error 0。

## Evidence

- `process_logs/playwright-mcp/process124-global-feedback/process124-project-hub-1440x900.png`
- `process_logs/playwright-mcp/process124-global-feedback/process124-project-hub-1920x1080.png`
- `process_logs/playwright-mcp/process124-global-feedback/process124-quick-input-1440x900.png`
- `process_logs/playwright-mcp/process124-global-feedback/process124-feedback-dialog-1440x900.png`
- `process_logs/playwright-mcp/process124-global-feedback/browser-check.json`
- `process_logs/playwright-mcp/process124-global-feedback/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process124.json`

## Known Problems

- KPB-004：失败、重试、取消、关闭和焦点恢复由共享状态机及回归测试覆盖。
- KPB-007：营口真实工作簿完整生成 15 页图册，入口变更未增加工程计算负担。
- KPB-011：不适用；反馈表单不修改工程数据，也没有跨责任页修复。
- KPB-012：项目首页、标准工作台、快捷输入和快捷图册均从真实用户入口验证，包含双分辨率与真实营口快捷出图。
- KPB-019：四种顶层页面状态均断言入口数量恰好为一、可见、可打开，并带正确页面身份。

## Boundaries

- 继续使用 FormSubmit 和 `sigsoglab@163.com`，不新增后端或反馈数据库。
- 不改变反馈字段、附件限制或隐私边界。
- 不读取或修改 CPT/CPTU 测量、分层、参数和成果对象。
