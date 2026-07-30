# Process086 - 地层生成方式可见反馈与单点恢复

Date: 2026-07-13

Status: `closed / implemented / verified / independently reviewed`

## Goal

修复地层分层向导第 2 步点击 JTS 生成方式后看似没有反应的问题，并让真实营口大数据首次运行能够清楚经历“选择 → 运行 → 发现问题 → 处理 → 回到候选决策”。

## Root Cause

- 方式卡同时承担推荐、选择和立即执行，推荐外观容易被误读为已经选中。
- 首次 JTS 分类在点击事件内同步运行，React 来不及绘制运行反馈。
- 失败原因原先离开当前弹窗，用户不知道点击是否生效以及下一步在哪里。
- 原有测试多在打开向导前预先完成分类，且使用小数据，没有覆盖 CPT09 的 4282 行首次运行。

## Implemented

- 方式卡只负责选择；底部唯一主按钮负责执行，推荐态与已选择态分离。
- JTS 首次运行前先绘制独立运行状态、行数、`aria-busy`，关闭、选项和提交同时禁用。
- 使用同步 ref 锁阻止同一动作被快速触发两次；非诊断异常保留唯一“重新尝试”。
- 前置条件与数值域失败留在当前弹窗，显示原因、首个问题深度/qt、未写入后果和具体恢复动作。
- 首次路线说明以当前有效输入为准；CPT09 正确显示完整 CPTU 与 Ic/孔压双路径，不读取失效旧结果。
- 对 CPT09 的 1/4282 个无效 qt 点，默认只创建一条可追溯的单行忽略修订；原始测量保留，其余 4281 行不平滑。
- 0.50 m 全剖面平滑降为其他处理方式，并明确可能弱化薄层响应。
- 在诊断前保存用户的生成意图；治理、复检和 JTS 重分类完成后自动继续候选生成或进入异常区间决策。

## Verification

- `npm.cmd run build`: passed。
- JTS 恢复、分类、分层工作流相关回归：`20/20` passed。
- 真实 CPT09 首次向导专项：passed；验证运行反馈、双触发防护、单行忽略和恢复至 `decision-required`。
- 全量 Chromium Playwright：`219/219` passed，包含 5.1 分钟营口三点位真实 Excel 工作流。
- `1440x900` 与 `1920x1080` 均覆盖方法选择、失败恢复和恢复终态；无横向溢出、弹窗裁切或主动作竞争。
- 三个只读 review agents 最终均为 P0=0、P1=0、`Safe to close: Yes`。

## Evidence

- `process_logs/playwright-mcp/process086-guided-generation/method-selected-1440x900.png`
- `process_logs/playwright-mcp/process086-guided-generation/method-selected-1920x1080.png`
- `process_logs/playwright-mcp/process086-guided-generation/generation-problem-1440x900.png`
- `process_logs/playwright-mcp/process086-guided-generation/generation-problem-1920x1080.png`
- `process_logs/playwright-mcp/process086-guided-generation/recovery-decision-required-1440x900.png`
- `process_logs/playwright-mcp/process086-guided-generation/recovery-decision-required-1920x1080.png`
- `process_logs/playwright-mcp/process086-guided-generation/flow-run.json`

## Boundary

- 本轮没有修改 JTS 分类公式、候选算法或原始测量。
- 单行忽略是可追溯的数据治理修订，不是删除源数据。
- 恢复后仍有 9 个异常区间需要工程师选择；系统不会替工程师猜测这些区间的土类。
- 数据检查页的完整指南化治理属于后续独立切片。
