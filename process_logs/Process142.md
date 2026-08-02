# Process142 - 独立中文使用手册与线上帮助入口

Date: 2026-08-01

Status: `closed / implemented / verified / deployed`

## Goal

建立独立、公开、可搜索的 SIGS-OGLab 中文使用手册，并把主站的全局帮助与当前页面说明准确链接到手册。

## Result

- 建立公开的 VitePress 中文手册，覆盖快捷出图、专业解译、AI 助手、常见问题、方法边界和失败恢复。
- 使用 GoG 6 脱敏衍生证据复现快捷与专业两条路径；原始工作簿没有进入公开仓库或构建产物。
- 主站全局“使用帮助”与页面级“查看本页说明”已接入手册，并在未知页面回退到手册起始页。
- 修复生产版本未包含快捷页滚动、匿名访问统计和帮助链接的问题，并通过独立 PR 合并部署。
- `docs.sigs-oglab.com` 已正确绑定 GitHub Pages；首次证书任务卡住后按 GitHub 官方恢复路径重新绑定，证书已批准并启用强制 HTTPS。
- 本轮没有改变 CPT/CPTU 工程公式、正式采纳语义、工程对象保存逻辑或原始测量数据。

## Verification

- `process_logs/verification/Process142-closure.json`：closure，77 个选定 spec，10 次成功运行。
- 主站构建通过；目标测试 67/67；真实 GoG 6 双路径 2/2。
- 文档链接与隐私扫描通过；VitePress 构建通过；文档 Playwright 9/9。
- domain-fast 263/263；ui-isolated 129/129；real-serial 32 passed、2 个可选外部样本环境跳过。
- `1440x900`、`1920x1080` 和移动端截图通过，console/page error 为 0。
- 线上浏览器确认手册首页、`/quick/import`、主站帮助入口与 HTTP 到 HTTPS 跳转均正常。
- GitHub Pages DNS 健康检查：域名有效、CNAME 正确、未代理、无冲突 IP、CAA 无错误、HTTPS eligible。
- HTTPS 证书状态 `approved`，域名 `docs.sigs-oglab.com`，到期日 2026-10-30，`https_enforced=true`。

## Deployment

- Main site: `https://sigs-oglab.com`
- Manual: `https://docs.sigs-oglab.com`
- Documentation repository: `https://github.com/shijie774302906/SIGS-OGLab-Docs`
- Documentation commit: `a239627`
- Production recovery PR: `https://github.com/shijie774302906/SIGS-OGLab/pull/1`
- Production merge: `337ea1337c610752a41ad8bc918c841868652715`

## Evidence

- `process_logs/playwright-mcp/process142-manual/browser-check.json`
- `process_logs/playwright-mcp/process142-manual/docs-home-1440x900.png`
- `process_logs/playwright-mcp/process142-manual/docs-home-1920x1080.png`
- `process_logs/playwright-mcp/process142-manual/docs-professional-import-mobile.png`
- `process_logs/playwright-mcp/process142-manual/gog6-professional-import-1440x900.png`
- `process_logs/playwright-mcp/process142-manual/gog6-quick-ai-review.png`
- `process_logs/playwright-mcp/process142-manual/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process142.json`

## Boundaries

- GoG 6 原始 Excel 未公开；手册仅保留脱敏截图、结构说明和衍生结果。
- 手册说明候选、计算与确认步骤，不代表正式工程采纳或替代工程师判断。
- GitHub Pages 证书由 GitHub 自动续期；DNS 需继续保持为直接指向 `shijie774302906.github.io` 的 DNS-only CNAME。
- 本轮没有新增登录、评论、协作编辑或后端工程数据存储。

## Known Problems

- KPB-002
- KPB-004
- KPB-005
- KPB-011
- KPB-012
- KPB-015
- KPB-016
- KPB-019
- KPB-023
