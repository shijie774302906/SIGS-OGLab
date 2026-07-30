# Process103 - 分层确认与修订门禁一致性

Date: 2026-07-16

Status: `closed / implemented / verified`

## Goal

修复大类合并后土层已经确认，但最终预览仍显示问题且无法生成当前修订的死循环；让层号承担唯一身份，并统一顶部指南、最终预览和提交按钮的问题来源。

## Root Cause

- 领域层把土层显示名称当作唯一结构身份；大类合并后，不同深度层可能具有相同土类描述，因此被误判为“土层名称重复”。
- 顶部指南只统计“土类待确认/候选待确认”，最终预览却统计所有 problem，造成“19 层已确认”和“问题 1”同时出现。
- 同一未确认层还会产生两条内部问题记录，直接计数会把 2 层显示成 4 个问题。
- 有问题时仍可打开最终预览，但唯一生成按钮被禁用，页面没有明确原因和定位动作。

## Implemented Result

- 删除显示名称唯一性结构门禁和重命名冲突限制；稳定 layerId 与顺序 `L1…Ln` 继续承担唯一身份。
- 高级工具明确标注“显示名称（可重复）”。
- 顶部指南和最终预览共用同一可执行问题集合；同一层的“土类待确认/候选待确认”合并为一个用户任务。
- 有问题时顶部显示“处理 N 个问题/待确认层”，点击定位对应层或边界；无问题时才显示“设为当前分层修订”。
- 最终预览把“待确认”改为“问题”，问题状态显示原因、层号/边界、深度、影响和定位动作，不再保留禁用的生成按钮。
- 最终层表第一列固定显示 `L1、L2…`，第二行保留可重复的土类描述。
- notice-only 状态继续允许提交，不增加重复工程确认。

## Engineering Boundaries

- 本切片没有改变大类合并、边界、层数、JTS 分类或参数适用性。
- 相同土类描述表示不同深度层可以具有相同工程描述，不代表这些层被合并为同一对象。
- 重复 layerId、边界引用错误、空隙、重叠和小于 0.05 m 的结构问题仍会禁止提交。
- 原始 qc、fs、u2 和已有修订历史未修改。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `172/172` passed。
- UI-isolated: `70/70` passed。
- 分层工作流文件: `12/12` passed。
- 真实营口目标流程: `1/1` passed（real-serial 配置）。
- 双视口 1440×900、1920×1080：横向溢出 `0`，最终弹窗完整可见。
- 证据方案提交：问题 `0`，层号 `L1–L4`，两个相同“重复土类描述”成功写入 current revision。
- Browser console/page errors: `0`。
- Knowledge gate: 7 个重要问题全部处置。

## Evidence

- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/problem-to-locate-1440x900.png`
- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/problem-to-locate-1920x1080.png`
- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/duplicate-descriptions-ready-1440x900.png`
- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/duplicate-descriptions-ready-1920x1080.png`
- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/browser-check.json`
- `process_logs/playwright-mcp/process103-stratification-confirmation-gate/evidence-manifest.json`
- `process_logs/verification/Process103-final.json`
- `process_logs/knowledge-reviews/Process103.json`
- `process_logs/closure-drafts/Process103.json`

## Known Problems

- Covered: KPB-004, KPB-006, KPB-007, KPB-008, KPB-011, KPB-012, KPB-015。

## Closure Checklist

- [x] 重复土类描述不再产生结构问题。
- [x] 顶部、最终预览和提交门禁使用统一问题集合。
- [x] 真实问题显示原因和定位动作，无问题时才允许生成修订。
- [x] Build、领域、UI、真实营口和双视口证据通过。
- [x] 知识门禁、更新库、最终 manifest 和关闭 doctor 通过。
