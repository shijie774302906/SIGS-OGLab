# Process088 - 数据检查整孔曲线证据

Date: 2026-07-14

Status: `closed / implemented / verified / independently reviewed`

## Goal

在数据检查的当前问题下直接展示整孔 qc、fs、u2 同深度证据，让工程师先看到三类测量随深度的共同变化，再从三个固定决定中选择；无 u2、点位上下文、单行异常和真实停测区间必须保持不同且正确的工程语义。

## Implemented

- 在当前检查证据中加入共享深度轴的 qc/fs/u2 整孔曲线；无可靠 u2 时只显示 qc/fs，不绘制零线或空轨。
- 单行或显式深度区间用粉色带定位；问题字段使用实心点，同深度伴随通道使用空心参考点。
- 水深来源明确为影响整孔的点位上下文，不再伪造局部深度带、定位点或精确行表。
- 深度间断使用实际起止深度高亮；抽样强制保留间断两侧，三通道在停测区间后重新起线，不跨未测区连接。
- 保留三个固定工程决定：`不使用此行并复检`、`修改此行数值`、`保留原值，暂不分类/保留并接受提示`；手动修改必须填写有效新值、原因和复核说明。
- 阻断问题和可选提示分开排队；选中提示时仍能一键返回首先需要处理的问题。
- 未检查或失效状态仅显示状态说明，不显示误导性的曲线、精确值表或处理决定。
- 对数千行数据使用多序列保极值抽样，保留当前问题、通道极值、缺失值断点和深度间断；绘图点数限制在 540 以内。
- 持久化复用已验证且未变化的数据块，避免每次状态更新重复写入整包；稳定序列化改为与旧哈希字节兼容的直接输出，减少中间对象。
- Playwright 可切换到 Vite 生产预览进行真实性能验收；开发服务器仍用于完整功能回归。

## Verification

- `npm.cmd run build`: passed。
- Chromium Playwright 全量：`233/233` passed，耗时 `8.7m`。
- 真实营口生产构建性能：
  - CPT09：4282 行，436 个绘图点，曲线抽样 `3.1 ms`，确认至检查页 `364.4 ms`，最长任务 `85 ms`，问题切换 `59.6 ms`。
  - CPT19：4489 行，426 个绘图点，曲线抽样 `2.3 ms`，确认至检查页 `468.3 ms`，最长任务 `167 ms`。
  - SCPT1：7832 行，453 个绘图点，曲线抽样 `4.2 ms`，确认至检查页 `781.8 ms`，最长任务 `300 ms`。
  - 三点均通过 `<1200 ms` 交接和 `<350 ms` 最长任务阈值。
- 真实 SCPT1 的 6 处深度间断均作为显式区间定位，并在 qc/fs/u2 路径中断线。
- `1440x900` 与 `1920x1080`：完整 CPTU、问题切换、无 u2 三类证据均无横向溢出或浏览器错误；三个决定在 1440 首屏内可见。
- 三个只读 review agents 最终均为 P0=0、P1=0、`Safe to close: Yes`。

## Evidence

- `process_logs/playwright-mcp/process088-check-profile-curves/full-cptu-current-problem-1440x900.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/full-cptu-current-problem-1920x1080.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/full-cptu-switched-problem-1440x900.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/full-cptu-switched-problem-1920x1080.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/no-u2-current-problem-1440x900.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/no-u2-current-problem-1920x1080.png`
- `process_logs/playwright-mcp/process088-check-profile-curves/full-cptu-browser-check.json`
- `process_logs/playwright-mcp/process088-check-profile-curves/no-u2-browser-check.json`
- `process_logs/playwright-mcp/process088-check-profile-curves/real-yingkou-performance.json`

## Boundary

- 本轮没有改写上传附件或原始测量值；排除、修改和保留仍通过可追溯修订表达。
- 本轮没有新增后端、云存储或多用户协作；部署仍为 Vite 静态网页，数据保存在各自浏览器本地工作区。
- 生产构建已达到本轮性能阈值；SCPT1 约 300 ms 的最长任务和 9px 图表辅助文字作为后续 P2 持续监控，不影响本轮关闭。
