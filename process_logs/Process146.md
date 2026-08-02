# Process146 - 快捷出图输入与图册首次使用指引

Date: 2026-08-02

Status: `closed / implemented / verified / deployed`

## Goal

为快捷出图的数据输入页和图册页分别提供一次性的三步新手指引，让首次使用者无需猜测即可理解怎样生成图册，以及怎样查看、导出和询问图册。

## Result

- 数据输入页按“先放入数据 → 再确认图册信息 → 最后生成图册”解释现有工作面；图册页按“查看图册 → 导出结果 → 询问图册”解释结果工作面。
- 两段指引拥有独立、版本化的已读记录；完成、跳过、关闭或 Escape 后不重复打扰，左下角“新手指引”可按当前页面直接重播。
- 指引只解释、不代替用户操作，也不改变输入行、图册设置、修订、当前页、导出状态或 AI 权限。
- 空数据、完整 CPTU 与无 u2 场景使用不同的最短文案，不介绍当前页面不存在的字段。
- 桌面说明卡贴近目标；移动端使用底部说明卡并自动滚动目标进入可视区。localStorage 不可用时依次降级到 sessionStorage 和当前会话内存。
- 首页指引、反馈入口、快捷出图及图册 AI 的既有行为保持不变。

## Verification

- `npm.cmd run build`：通过。
- `npx.cmd playwright test tests/e2e/quick-onboarding.spec.ts --workers=1`：3/3 通过。
- 相关完整回归：41/41 通过，覆盖快捷输入/图册、AI、反馈入口和首页指引。
- 390×844、1440×900、1920×1080：目标聚焦、卡片位置、自动滚动与水平溢出检查通过。
- 浏览器 page errors 与 console errors：0。
- Known Problem Gate：6 个重要问题已处置，1 个提示已记录。
- 生产环境：输入页首次显示“先放入数据”，图册页独立显示“查看图册”；0 浏览器错误、无水平溢出。

## Evidence

- `process_logs/playwright-mcp/process146-quick-onboarding/evidence-manifest.json`
- `process_logs/playwright-mcp/process146-quick-onboarding/verification.json`
- `process_logs/playwright-mcp/process146-quick-onboarding/desktop-check.json`
- `process_logs/playwright-mcp/process146-quick-onboarding/mobile-check.json`
- `process_logs/playwright-mcp/process146-quick-onboarding/input-step1-1440x900.png`
- `process_logs/playwright-mcp/process146-quick-onboarding/report-step3-1920x1080.png`
- `process_logs/playwright-mcp/process146-quick-onboarding/input-step3-390x844.png`
- `process_logs/playwright-mcp/process146-quick-onboarding/report-step2-390x844.png`
- `process_logs/knowledge-reviews/Process146.json`

## Boundaries

- 本切片没有改变数据导入、图册计算、导出或 AI 读写权限。
- 指引状态属于浏览器界面偏好，不进入项目工程数据。
- 指引完成不等于用户已经生成或审阅工程成果。

## Release

- Commit: `6d78d48`
- Production: `https://sigs-oglab.com`
