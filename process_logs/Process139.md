# Process139 - Vercel 私有预览与安全首发

Date: 2026-07-31

Status: `closed / implemented / verified / privately deployed`

## Goal

在不上传营口真实数据、历史密钥或本地临时产物的前提下，建立私有 GitHub 仓库、Vercel 生产预览和可自动部署的 GitHub 连接；公共 DeepSeek Key 仅保存在服务端，自有 Key 仅保存在当前浏览器会话。

## Result

- 创建私有仓库 `shijie774302906/SIGS-OGLab`，仅推送无父节点的干净发布历史。
- 发布历史不包含 `sample_data/source/yingkou/`、`mishi.md`、API Key、`.vercel/`、Playwright 临时结果或本地参考文件。
- 新增同源 Vercel Function：`/api/assistant/[...path]`。
- 公共 DeepSeek Key 只由 Vercel 环境变量持有；浏览器可选择公共额度或自己的 Key。
- 自有 Key 只保存在当前标签页内存，不进入项目、普通本地存储或 Git。
- 修复图册切页后 AI 对话沿用旧页面身份的问题。
- Vercel 项目已连接私有 GitHub 仓库；后续 `main` 推送将自动构建和部署。
- 当前生产地址：`https://sigs-oglab-web.vercel.app`。

## Verification

- `npm.cmd run build`：通过。
- assistant server：25/25。
- domain-fast：260/260。
- ui-isolated：120/120。
- real-serial：32/32；真实营口数据仅在本机运行。
- 在线 capability：HTTP 200，`deepseek-v4-pro`，`publicAccess=true`。
- 在线浏览器控制台：0 error / 0 warning。
- 浏览器构建产物密钥模式命中：0。
- 干净发布提交：500 个文件；禁用路径 0；密钥模式命中 0。
- 私有 GitHub 仓库默认分支：`main`。
- Vercel 生产部署：Ready。
- 实施计划 Knowledge Gate：KPB-002、KPB-004、KPB-007、KPB-011、KPB-012 全部 covered。
- 最终归档 Knowledge Gate：归档文本命中的 KPB-007 covered。

## Evidence

- `process_logs/playwright-mcp/process139-vercel-private-preview/public-ai-1440x900.png`
- `process_logs/playwright-mcp/process139-vercel-private-preview/public-ai-1920x1080.png`
- `process_logs/playwright-mcp/process139-vercel-private-preview/browser-check.json`
- `process_logs/playwright-mcp/process139-vercel-private-preview/evidence-manifest.json`
- GitHub release commit：`1e4c51e1f057acc5bab7ec750ab94e3272b1cd73`
- Vercel deployment：`dpl_ZP7Df6gNx92qfRKKJMRRhCEYiRSC`
- Knowledge report：`process_logs/knowledge-reviews/Process139.json`

## Deferred

- 正式公开仓库前仍需决定许可证；当前仓库保持 private。
- 营口真实样本不公开，也不会进入后续公开发布。
- Cloudflare 正式域名、访问次数和地区统计另开切片。
- `src/App.tsx`、`src/styles.css` 和主 JS 包的拆分作为后续性能维护工作。

## Known Problems

- KPB-002
- KPB-004
- KPB-007
- KPB-011
- KPB-012
