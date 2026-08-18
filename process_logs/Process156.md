# Process156 - 成果工具默认展开

Date: 2026-08-18

Status: `closed / implemented / verified / ready for deployment`

## Goal

专业解译仅在进入“成果输出”时默认展开右侧“成果工具”；其他专业页面默认隐藏右栏，同时保留用户手动打开和隐藏的控制权。

## Result

- 进入成果输出时自动切换到“成果工具”并展开右栏。
- 用户在成果页手动隐藏后，当前停留期间不会因普通重渲染自动弹回。
- 离开成果输出后右栏自动隐藏；再次进入成果输出时重新展开。
- 项目、导入、检查、地层分层和参数解译页均保持默认隐藏；需要时仍可从右侧窄栏手动打开工具或 AI 助手。
- 未修改工程数据、成果生成、存储、公式或后端接口。

## Verification

- `npm.cmd run build`: passed。
- `tests/e2e/jts-output-ui.spec.ts`: 1/1 passed，覆盖成果页进入、隐藏、离开和重新进入。
- `workbench + release-compatibility + assistant-ui + preparation-guided-flow`: 19/19 passed。
- 1440×900 与 1920×1080 截图中成果工具均默认展开；横向溢出 0，浏览器错误 0。
- `git diff --check`: passed。
- Known Problem Gate: passed；KPB-002 covered，其余三个误命中均给出具体不适用原因。

## Evidence

- `process_logs/playwright-mcp/process156-output-dock/output-tools-open-1440x900.png`
- `process_logs/playwright-mcp/process156-output-dock/output-tools-reopened-1920x1080.png`
- `process_logs/playwright-mcp/process156-output-dock/browser-check.json`
- `process_logs/playwright-mcp/process156-output-dock/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process156.json`

## Boundary

- 本轮没有部署到国际站或国内站；进入正式发布需另行确认。
- 本轮不改变快捷出图，也不保存用户的临时右栏开合偏好。
