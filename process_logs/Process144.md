# Process144 - 安全生产发布

Date: 2026-08-02

Status: `closed / verified / deployed`

## Goal

将 Process126-143 的已验证成果从私有 GitHub 仓库安全发布到 Vercel 正式站点，同时排除私有营口数据、密钥、本机环境文件和临时测试产物。

## Result

- 从 `origin/main` 创建独立干净发布工作树，只纳入经核对的产品、测试和 Process126-143 收尾变更。
- 私有 GitHub 仓库保持私有；营口源文件、`.env`、本机 Vercel 凭据和临时浏览器产物未进入发布提交。
- 修复发布审计将公开的 `.env.example` 误判为密钥文件的问题；文件内容仍接受真实密钥扫描。
- 缺少未获公开授权的营口样本时，相关真实数据测试明确跳过；存在本地授权样本的开发环境仍会执行这些测试。
- 发布候选 `b6dc8d0e0685b0d9e301cdf02c3ebd6901768327` 已部署为 Vercel production，部署 `dpl_2JmRWvJFbCgPLTdpZYf2Z5uDH13r` 为 Ready。
- `https://sigs-oglab.com/`、帮助站、AI 能力接口和匿名访问统计接口均通过线上检查。

## Verification

- `npm.cmd run build`：通过。
- `npm.cmd run test:domain-fast`：262/262 通过。
- `npm.cmd run test:ui-isolated`：130 通过、3 个未公开营口样本用例跳过、0 失败。
- `npm.cmd run test:real-serial`：26 通过、8 个未随发布仓库提供的外部/私有样本用例跳过、0 失败。
- `npm.cmd run test:assistant-server`：36/36 通过。
- `npm.cmd run release:audit:test`：5/5 通过。
- `npm.cmd run release:audit -- --mode local`：0 errors；仓库私有/许可证未定和超大源文件为已知提示。
- 1440×900：首次指引三步完成、可重播、无横向溢出。
- 1920×1080：快捷演示数据加载后工作区可滚动、无横向溢出。
- 专业模式：新建项目后进入固定指南，下一步明确指向数据导入。
- 线上浏览器：0 page errors、0 console errors、0 console warnings。
- Known Problem Check/Gate：0 个相似问题，门禁通过。

## Evidence

- `process_logs/playwright-mcp/process144-production-release/evidence-manifest.json`
- `process_logs/playwright-mcp/process144-production-release/browser-check.json`
- `process_logs/playwright-mcp/process144-production-release/onboarding-1440x900.png`
- `process_logs/playwright-mcp/process144-production-release/quick-demo-1920x1080.png`
- `process_logs/knowledge-reviews/Process144.json`

## Boundaries

- GitHub 仓库未改为公开。
- 营口及其他私有工程源数据未发布。
- 本轮未改变工程公式、分类、分层或参数解译逻辑。
- 当前未选择开源许可证；正式公开源码前需单独确认。
