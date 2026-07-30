# Process121 - 快捷图册一键清空

Date: 2026-07-23

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 让误粘贴或误导入快捷图册数据的用户可以在当前页一次清空，并立即重新输入。
- 清除当前数据时同步失效由它生成的旧图册，保留孔位名称、高级设置、项目及外部源文件。

## Result

- 数据区右上角提供唯一的“清空数据”入口；空态禁用，有数据时启用，不增加确认弹窗。
- 点击后清空当前行、来源名称、内存页面、图册修订与活动修订，重置数据相关的 u2 使用确认。
- 成功反馈明确说明“数据和已生成图册已清空”，避免用户误以为旧图册仍然有效。
- 清空后焦点回到粘贴区且不滚动页面，用户可以直接再次按 `Ctrl + V`。
- 孔位名称和有效面积比在清空及刷新后保留；外部 Excel、其他项目和其他点位不受影响。

## Verification

- `npm.cmd run build`：通过。
- `process_logs/verification/Process121-targeted.json`：通过；domain 3/3、UI 11/11、real 5/5。
- Process121 主路径：粘贴 3 行 -> 生成 -> 清空 -> 刷新仍为空 -> 重新粘贴 3 行 -> 再次生成，通过。
- 营口真实快捷图册用例通过；清空文案、15 页结果和重新生成链路保持一致。
- 1440×900：无水平溢出、无浏览器错误。
- 全量关闭回归曾多次运行；本功能持续通过。全量 UI 的非相关既有用例出现不同的异步/亚像素波动，已保留原始失败附件；对应失败用例单独复跑通过，未将其伪记为一次全量通过。
- Visual、Geotechnical、Copy/IA 三类只读 Agent 最终均为 `PASS / P0=0 / P1=0`。

## Evidence

- `process_logs/playwright-mcp/process121-quick-clear/before-clear-1440x900.png`
- `process_logs/playwright-mcp/process121-quick-clear/after-clear-1440x900.png`
- `process_logs/playwright-mcp/process121-quick-clear/browser-check.json`
- `process_logs/playwright-mcp/process121-quick-clear/evidence-manifest.json`
- `process_logs/verification/Process121-targeted.json`
- `process_logs/knowledge-reviews/Process121.json`

## Known Problems Covered

- KPB-004：完成反馈明确说明实际清除范围，并把恢复入口原位放回粘贴区。
- KPB-006：清空写入当前项目权威工作区，刷新后旧输入和旧图册不回流。
- KPB-011：恢复动作留在当前输入页并自动定位粘贴区，不修改外部源文件。
- KPB-012：验收从真实点击出发，断言行数、修订、刷新、恢复生成、截图、溢出和浏览器错误。

## Boundaries

- 本轮不提供撤销；误清空后可从外部文件重新导入。
- 本轮主需求是误粘贴恢复。Excel 导入与粘贴共用同一清空函数，但没有新增一条独立的 Excel 清空 UI 用例。
- 清空只作用于当前快捷图册输入和派生结果，不是“清空全部本机项目”。
