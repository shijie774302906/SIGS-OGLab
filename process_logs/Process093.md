# Process093 - 密集分层共轴查看与稳定持久化

Date: 2026-07-15

Status: `closed / implemented / verified / independently reviewed`

## Goal

让 40–70 层的真实整孔方案仍能作为工程师的主工作图使用：保持 qc、fs、u2 与分层柱的真实深度关系，在不改变任何工程数据的前提下提供概览、当前层放大和全孔展开，并保证层选择、边界编辑、参数配置与浏览器持久化稳定可靠。

## Implemented

- 图纸主工作面提供三个互斥显示方式：`全孔概览`、`放大当前层`、`全孔展开`。显示方式只属于页面会话，不写入地层方案、不进入撤销历史，也不使参数或成果失效。
- 全孔概览保持每层的真实比例；薄层空间不足时隐藏层内文字，但保留真实边界、待确认侧标和选中状态，不再为文字制造假高度。
- 点击右侧土层列表、下一待确认层或暂时保留层，会自动进入至少 6 m 的当前层窗口。厚层完整显示并带上下文，孔顶与孔底自动夹紧。
- 全孔展开使用 1120 px 的共享绘图区；qc、fs、u2、深度刻度、选中带、边界和分层柱一起变高并随页面滚动。
- 选中层使用独立的避碰标注；普通薄层不再堆叠层号和深度标签。普通边界深度按空间收敛，当前边界与当前层始终可见。
- 曲线与分层柱显式消费同一个 `displayDepthFromM/displayDepthToM`，从数值到像素保证深度轴对齐。局部窗口不再从过滤后首末有效测点推导纵轴；无测点窗口保持固定工程轴并显示缺失通道。
- 当前层与聚焦层状态分离：图内点选只更新当前层，不强制改变用户已选显示方式；从列表或问题导航定位时才切到当前层放大。
- 分层页旧的外围高级工具默认折叠，当前层判断面板成为主要右侧工作区；显示工具与工程编辑工具分组，不再让“查看”看起来像“修改方案”。
- 修正 JTS 来源选择校验：冻结的候选选择记录按来源运行、候选 ID、深度和来源行验证，不再要求它的选择数量等于后续可编辑方案的当前边界数。
- 参数配置采用本地乐观状态和串行持久化队列；待保存或脏编辑期间，旧的 IndexedDB 快照不会覆盖快速连续输入。

## Verification

- `npm.cmd run build`: passed.
- Final Chromium suite: `251/251` passed, exit code `0`, including the full real Yingkou workflow and broken/legacy Excel recovery.
- Targeted parameter persistence, parameter workbench and Yingkou suite: `12/12` passed.
- Dense-view UI regression covers 43 synthesized layers and 67 real Yingkou layers: overview/focus/expanded geometry, first/middle/last/thick layers, local boundary drag, refresh reset, immutable raw row count, no label overlap and no horizontal overflow.
- Real Yingkou view-switch performance: P95 `34.5 ms`, max `34.5 ms`, long tasks `0`, workbench DOM nodes `799`.
- Shared-axis assertions: overview and expanded numeric axis endpoints match exactly; selected-layer band top/bottom pixel error is at most `1 px`; recorded real Yingkou outer alignment error is `0 px`.
- 1440x900 and 1920x1080 evidence captured for all three modes on both synthesized and real Yingkou schemes; browser errors are empty.
- CPU-bound 7,832-row classification passed five isolated concurrent repetitions; full-suite ceiling includes scheduler headroom while repeated user-facing guidance remains capped at 25 ms.

## Independent Review

- Visual Layout Reviewer: PASS, P0=0, P1=0.
- Geotechnical Flow Reviewer: initial FAIL identified the independently derived curve depth axis; after the explicit shared-range fix, final PASS with P0=0, P1=0, P2=0.
- Copy / IA / Performance Reviewer: PASS, P0=0, P1=0.

## Evidence

- `process_logs/playwright-mcp/process093-dense-stratification-view/overview-43-layers-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/overview-43-layers-1920x1080.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/focus-layer-30-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/focus-layer-30-1920x1080.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/expanded-43-layers-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/expanded-43-layers-1920x1080.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/real-yingkou-overview-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/real-yingkou-focus-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/real-yingkou-expanded-1440x900.png`
- `process_logs/playwright-mcp/process093-dense-stratification-view/browser-check.json`
- `process_logs/playwright-mcp/process093-dense-stratification-view/evidence-manifest.json`
- `process_logs/playwright-mcp/process086-guided-generation/flow-run.json`
- `process_logs/knowledge-reviews/Process093.json`

## Knowledge And Recurrence Prevention

- Added KPB-014: outer container alignment is not proof of a shared engineering depth axis; exact axis endpoints and representative boundary pixels are now mandatory checks.
- Added KPB-015: older asynchronous persistence results must not overwrite rapid optimistic edits; rapid input plus reload is now a required regression.
- Recorded that immutable generation selections and mutable current schemes have different lifecycles and cannot be validated through current boundary-count equality.

## Boundaries

- No automatic layer merge, deletion, classification change, parameter adoption, backend persistence or collaboration was introduced.
- Dense display does not change raw measurements, JTS evidence, layer decisions, boundary revisions or downstream lineage.
- Browser-local persistence remains the confirmed deployment model; cross-device shared projects still require a server-side repository.
