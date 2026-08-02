# Process143 - 桌面端首次使用三步指引

Date: 2026-08-02

Status: `closed / implemented / verified`

## Goal

让第一次进入项目首页的桌面端用户在三步内知道“选模式、填项目名、开始使用”，同时不打断已有项目用户或移动端用户。

## Result

- 空工作区的首次桌面访问自动显示三步聚焦指引：快捷/专业模式、项目名称、开始按钮。
- 指引打开时底层操作被遮罩拦截；支持上一步、下一步、开始使用、跳过全部、关闭和 `Escape`。
- 完成或跳过记录保存在当前浏览器；本地存储不可用时降级到当前会话，不影响项目创建。
- 已有项目不会被自动打断；移动端不显示指引或重播按钮。
- 项目首页左下角新增“新手指引”重播入口，结束后焦点返回入口。
- 本轮没有修改 CPT/CPTU 测量数据、工程公式、分层、参数、持久化权威对象或后续工作流。

## Verification

- `process_logs/verification/Process143-closure.json`：closure，78 个 spec，10 次成功运行。
- Build、测试分层审计、流程工具 13/13、知识库校验与 Known Problem Gate 通过。
- domain-fast：263/263。
- ui-isolated：133/133。
- real-serial：32 passed；2 个依赖外部样本的可选用例按预期跳过。
- Process143 专项：4/4；帮助与项目首页定向回归：18/18。
- 1440×900、1920×1080：聚焦框与目标同位，说明卡在视口内，无意外溢出，console/page error 为 0。

## Evidence

- `process_logs/playwright-mcp/process143-project-onboarding/first-step-1440x900.png`
- `process_logs/playwright-mcp/process143-project-onboarding/final-step-1920x1080.png`
- `process_logs/playwright-mcp/process143-project-onboarding/browser-check.json`
- `process_logs/playwright-mcp/process143-project-onboarding/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process143.json`

## Boundaries

- 指引只在宽度不小于 1024 px 的桌面视口自动运行；移动端不展示。
- 完成记录是浏览器偏好，不属于工作区权威数据，不跨浏览器或设备同步。
- 自动触发只适用于没有项目、没有完成记录的工作区；手动重播只在项目首页提供。
- KPB-006 不适用：本轮不保存或清理权威工程存储；仅验证轻量偏好存储失败降级。
- KPB-011 不适用：本轮没有工程问题修复任务或测量数据改写；完整真实串行回归证明现有工程流程不受影响。

## Known Problems

- KPB-002
- KPB-004
- KPB-006
- KPB-011
- KPB-012
- KPB-013
- KPB-016
- KPB-019
