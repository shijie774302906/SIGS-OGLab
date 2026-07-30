# Process078 - Attio 式参数解译逐项向导

Date: 2026-07-12

Status: `closed / implemented / verified / independently reviewed`

## Goal

把参数解译从高自由度工作台改成机械化的逐项判断流程：系统按当前 JTS 分类证据预选范围和方法，工程师只回答当前一个问题；默认路径只有一个下一步，高级手动设置保留为明确独立的次级路径。

## Implemented

- 地层修订与 JTS 分类就绪后首次进入参数页自动打开向导；已完成运行不重复打扰。
- 向导草稿绑定点位、分类结果哈希和精确分层修订；关闭后保存，刷新或重进恢复到准确参数，上游变化不能沿用旧依据。
- 左侧显示步骤与参数状态，右侧一次只配置一个参数；未来步骤、最终确认和最终运行均有状态门禁及运行时复验。
- 选择页按“默认纳入 / 建议纳入 / 按需纳入”预选；默认纳入项不能静默取消，可选参数通过次级按钮按需展开，不适用项灰显并说明 JTS 分类依据。
- 每个参数使用固定方法、固定选择和受限输入；当前只有一种验证方法时不展示伪选择。
- Su 的 Nkt 无默认值，展示 JTS 表 7.2.4 全部 7 类目标试验、统计平均值和适用前提，并冻结独立确认时间。
- 砂土 φ′ 与 Dr 均要求工程师明确确认材料范围；未知、钙质砂或碳质砂不能静默使用相关式。
- 粉土改为“强度参数采用路径”，动态显示 φ′(°) / Su(kPa)，要求固定来源类别与具体编号；UI 和领域层共同限制 60° / 500kPa 上限与正值。
- 异常处理固定为暂缓、本次不计算或返回检查；暂缓阻止运行，不计算必须选择原因并冻结真实决定时间。
- 取消已暂缓参数会清理隐藏决定；重新加入后必须重新确认，灰色未选项返回选择页而不会跳到错误参数。
- skip、deferred、ready 使用一致的灰色减号、琥珀时钟和绿色勾；最终列表可返回配置、恢复或重新加入。
- 已选建议方法 pending/problem 会阻止输出，不允许静默缺失。
- 参数摘要拆分为已计算、明确不计算和待处理；任意排除均显示“可生成带排除声明的部分成果”。
- 排除项冻结到成果快照；Excel 增加“参数排除”页，A4 增加排除声明页，A3/元数据写入部分成果提示；不适用方法不会形成冗余排除。
- 右侧原 JTS 参数包运行降级为“高级手动设置并运行”，向导内明确说明其为独立设置，不暗示继承当前向导值。
- 保留原 JTS 公式、方法适用范围和高级公式编辑能力，没有新增公式或改变标准阈值。

## Verification

- `npm.cmd run build`: passed。
- 单次完整 Chromium Playwright：`207/207` passed，约 `3.6 min`。
- 真实 Yingkou：`2/2` passed；三点位、真实 Excel、JTS 分类、地层、参数、A4/A3/Excel、刷新与异常文件均完成。
- 参数向导覆盖：自动打开、默认范围、默认纳入项锁定、逐项门禁、Nkt 无默认、关闭续做、暂缓禁用、取消暂缓、重新加入、明确不计算、灰色项回选和最终运行。
- 参数/成果覆盖：61°、501kPa、空来源类别、空编号均被拒绝；建议项未完成阻止输出；排除项写入 Excel 与三页 A4 报告。
- `1440x900`、`1920x1080` 均无 body、dialog、步骤栏或主区水平溢出；固定页脚未出视口。
- console errors `0`；page errors `0`。
- Visual、Geotechnical、Copy/IA 三个只读代理经多轮核销后均为 `P0=0 / P1=0 / safe-to-close=yes`。

## Evidence

- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-selection-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-selection-1920x1080.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-su-nkt-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-sand-scope-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-sand-scope-1920x1080.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-deferred-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-skip-reason-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-review-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/parameter-guide-review-1920x1080.png`
- `process_logs/playwright-mcp/parameter-guided-workflow/flow-run.json`

## Boundaries And Residuals

- 仍是浏览器原型；参数运行和成果不代表设计值、正式工程采纳或生产持久化。
- 高级手动设置与向导草稿明确为独立配置，不自动互相覆盖；后续若要互通，需要单独设计参数定位与合并规则。
- 选择页核心列表在 1440 视口内使用主区纵向滚动；页脚固定且可见，可后续增加轻量滚动提示。
- 少量辅助文本仍为 9–10px，可在统一视觉精修切片中提升；主工程判断与错误文本已保持可读。
- 主 bundle 仍大于 500kB，后续可按路由或功能拆包。
