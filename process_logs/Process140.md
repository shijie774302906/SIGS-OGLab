# Process140 - 公共 AI 每日额度与合成演示数据

Date: 2026-08-01

Status: `closed / implemented / verified / deployed`

## Goal

为官网提供按匿名浏览器访客计算的公共 AI 每日额度，并让没有自有数据的用户在专业导入和快捷出图中一键试用明确标识的合成 CPTU 数据。

## Result

- 每个匿名浏览器访客每天可使用公共 DeepSeek 100 次；北京时间 00:00 自动进入新日期桶；全站不设每日总次数上限。
- 访客身份由签名的 `HttpOnly + Secure + SameSite=Lax` Cookie 提供；Redis 只记录不可逆访客摘要、日期和次数。
- Vercel 生产计数使用 Upstash Redis 原子 `EVAL`；未连接共享存储或存储异常时公共 AI 明确不可用，不会退化成实例内计数。
- 上游调用失败会回退保留的次数；个人 DeepSeek Key 完全旁路公共额度。
- 专业导入新增“试用演示数据”，生成标准 CSV 并进入既有解析、映射、检查与原始附件管线。
- 快捷出图新增“试用演示数据”，把 121 行固定种子 CPTU 数据填入现有表格；已有输入必须确认替换，载入后不会自动生成图册。
- 演示来源统一标记为“系统生成演示数据”，不包含营口、CPT09 或真实工程身份。
- 新增知识问题 KPB-030，防止以后在无服务器环境误用进程内存进行公共额度计数。

## Verification

- `npm.cmd run build`：通过。
- assistant server：31/31。
- domain-fast：262/262。
- ui-isolated：123/123。
- real-serial：32/32；真实规模数据仅在本机验收。
- Process140 定向 Playwright：5/5；最终证据运行：3/3。
- 公共额度服务端覆盖：100/101、140 并发、北京时间跨日、访客隔离、上游失败回退、自有 Key 旁路、生产存储缺失 fail closed。
- 1440×900 与 1920×1080：横向溢出 0、浏览器错误 0；标签、单位、禁用态和主操作层级通过人工复核。
- 线上 capability：HTTP 200，`deepseek-v4-pro`，初始剩余 100；公共调用后为 99，同一 Cookie 复读仍为 99。
- 线上个人 Key 调用成功，公共剩余次数不变。
- 线上 Chromium public-readiness smoke：1/1。
- Known Problem Gate：KPB-004、005、006、011、012、030 全部 covered。

## Deployment

- GitHub release commit：`6b803d509a4e16a068d01db427b7b46439368000`
- Vercel deployment：`dpl_2vJfe8SSSSp6caei3pGrznsctybR`
- Production：`https://sigs-oglab-web.vercel.app`
- Shared quota store：Vercel Marketplace / Upstash Redis

## Evidence

- `process_logs/playwright-mcp/process140-public-quota-demo/public-quota-exhausted-1440x900.png`
- `process_logs/playwright-mcp/process140-public-quota-demo/professional-demo-import-1440x900.png`
- `process_logs/playwright-mcp/process140-public-quota-demo/quick-demo-input-1920x1080.png`
- `process_logs/playwright-mcp/process140-public-quota-demo/browser-check.json`
- `process_logs/playwright-mcp/process140-public-quota-demo/online-check.json`
- `process_logs/playwright-mcp/process140-public-quota-demo/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process140.json`

## Boundaries

- 清除浏览器 Cookie 会获得新的匿名访客身份；该限制用于控制一般用量，不作为登录账号或强身份防滥用系统。
- 公共 AI 的实际可用性仍受 DeepSeek 账号余额和上游服务影响。
- 合成数据只用于体验流程，不代表现场数据、正式设计输入或工程采纳。

## Known Problems

- KPB-004
- KPB-005
- KPB-006
- KPB-011
- KPB-012
- KPB-030
