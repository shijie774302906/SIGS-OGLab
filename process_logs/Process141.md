# Process141 - 快捷页面滚动与匿名访问统计

Date: 2026-08-01

Status: `closed / implemented / verified / deployed`

## Goal

修复 Vercel 快捷出图长内容无法向下滚动，并提供不保存原始 IP 或工程数据的累计访客、访问次数、覆盖地区和地区分布。

## Result

- 快捷输入页现在拥有独立的全视口纵向滚动容器；121 行数据在 AI 面板打开或关闭时都可滚动到最终生成操作。
- 左下角“反馈与建议”旁新增低干扰统计摘要，显示累计匿名访客和覆盖地区；点击后查看访问次数与按访问量排序的地区分布。
- 统计入口复用同一全局启动器，覆盖项目首页、专业工作台、快捷输入和快捷图册，每个页面外壳恰好一个。
- 服务端使用签名匿名 Cookie 的 HMAC 派生标识去重，Redis 不保存原始 IP、Cookie、文件名、项目名或测量数据。
- Vercel 国家/行政区请求头只用于当次地区归类；缺失信息归入“未知”，VPN/代理按出口所在地估算。
- Upstash 通过单个 Lua 脚本原子更新访客、访问次数和地区计数；服务不可用时统计入口静默隐藏，不影响出图和 AI。
- 新增 KPB-031 与 KPB-032，防止以后独立页面被全局 overflow 裁剪，或访问统计退化为原始身份/非原子实例计数。

## Verification

- `npm.cmd run build`：通过。
- assistant/analytics server：36/36。
- domain-fast：262/262。
- ui-isolated：126/126。
- real-serial：32/32。
- Process141 定向 Playwright：3/3；包含失败后刷新恢复。
- 1440×900、1920×1080 和 1440×700：纵向滚动正常、水平溢出 0、浏览器错误 0。
- 生产站 API：HTTP 200、`ready`；同一 Cookie 连续请求访客数不增加，访问次数准确 +1。
- 生产站 Chromium：统计摘要可见；快捷页 `overflowY=auto`、`scrollTop=300`、生成按钮可见、AI 面板打开、浏览器错误 0。
- Known Problem Gate：活动计划阶段 9 个重要问题已处置；关闭归档阶段 3 个重要问题和 1 个提示已记录。

## Deployment

- Vercel deployment：`dpl_4AEqvsoJ751scf6hfenFHkGiwvNh`
- Production：`https://sigs-oglab.com`
- Shared analytics store：Vercel Marketplace / Upstash Redis

## Evidence

- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/quick-input-1440x900.png`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/quick-input-1920x1080.png`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/quick-scroll-bottom-ai-open-1440x700.png`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/visitor-regions-1440x900.png`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/browser-check.json`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/online-check.json`
- `process_logs/playwright-mcp/process141-scroll-visitor-analytics/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process141.json`

## Boundaries

- 地理位置由网络出口推断，只适合统计使用量，不代表用户常住地或工程所在地。
- 浏览器清除 Cookie 后会被视为新的匿名访客；本功能不是登录账号或强身份识别系统。
- 本轮没有运营后台、地图、个人访问记录或历史访问回填。
- 中国大陆直连 Vercel 的可达性问题不属于本切片；统计仅在页面实际到达服务器时发生。

## Known Problems

- KPB-002
- KPB-004
- KPB-008
- KPB-011
- KPB-012
- KPB-013
- KPB-015
- KPB-019
- KPB-031
- KPB-032
