# Process133 - 专业解译性能与回退重置

Date: 2026-07-27

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 定位并修复专业解译在真实规模数据下的高频卡顿。
- 补全导入清空/替换、并行新建分层方案、重新选择方法、参数重启和上游返工。
- 上游变化后保留历史结果，但不得让旧参数或成果继续冒充当前结果。

## Result

- 将可编辑导入派生管线从 `App.tsx` 拆出，并建立包含字段、单位、水深和终孔深度的缓存身份。
- 同一上下文直接复用派生数组；只改变深度默认值时做受限增量更新，结构性变化才完整重算。
- 检查提交只保存 manifest 和检查历史，不再重复写入未变化的原始/标准化大数据块；引用、哈希、CAS 和事务校验继续执行。
- 标准化数据哈希由 App 与保存校验共享同一缓存，避免同一 7,832 行数据在一次动作中重复计算。
- 检查页在没有值覆盖修订时直接使用治理行，避免无意义的逐行克隆。
- 点位探头、水深或上游检查变化会令相关分层、参数和成果失效；历史修订继续保留，活动指针清空。
- 错误导入可先取消再确认清空；已保存来源仍保留。替换文件以新批次和新草稿原子写入，不覆盖历史来源。
- 已有分层方案可再次选择方法或复制当前方案；参数页可预览影响后重新开始。
- 成果区只把 `status === 'current'` 的文件称为当前成果；旧文件显示“需要重新生成”和“历史成果文件”。

## Performance

营口真实工作簿使用分动作计时，不把多个交互合并为一个数字：

| 点位 | 行数 | 水深确认到检查完成 | 调整窗口打开 | 高级曲线打开 | 最长任务 |
| --- | ---: | ---: | ---: | ---: | ---: |
| CPT09 | 4,282 | 367.3 ms | 121.6 ms | 144.1 ms | 59 ms |
| CPT19 | 4,489 | 525.1 ms | 92.6 ms | 116.2 ms | 86 ms |
| SCPT1 | 7,832 | 658.4 ms | 85.1 ms | 118.9 ms | 138 ms |

三个点位均满足检查完成 `< 1,200 ms`、局部交互 `< 350 ms`；控制台错误和页面错误为 0。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- `npm.cmd run test:domain-fast`：247/247 通过。
- `npm.cmd run test:ui-isolated -- --workers=2`：111/111 通过。
- `npm.cmd run test:real-serial`：32/32 通过；含营口三点完整检查、刷新、切换、分层、参数和成果流程。
- 输出权威目标复测：1/1 通过；上游替换后当前成果数为 0，历史成果数为 2，页面明确要求重新生成。
- 1440×900、1920×1080 下的导入清空、重新处理、新建方案和参数重启均无横向溢出或对话框越界。
- Visual/Performance、Geotechnical/Data、Copy/IA/Recovery 三类只读复查均 `PASS`，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process133-professional-recovery/import-reprocess-1440x900.png`
- `process_logs/playwright-mcp/process133-professional-recovery/import-reprocess-1920x1080.png`
- `process_logs/playwright-mcp/process133-professional-recovery/import-clear-confirmation-1440x900.png`
- `process_logs/playwright-mcp/process133-professional-recovery/import-clear-confirmation-1920x1080.png`
- `process_logs/playwright-mcp/process133-professional-recovery/new-scheme-choice-1440x900.png`
- `process_logs/playwright-mcp/process133-professional-recovery/new-scheme-choice-1920x1080.png`
- `process_logs/playwright-mcp/process133-professional-recovery/parameter-restart-confirmation-1440x900.png`
- `process_logs/playwright-mcp/process133-professional-recovery/parameter-restart-confirmation-1920x1080.png`
- `process_logs/playwright-mcp/process133-professional-recovery/real-yingkou-performance.json`
- `process_logs/playwright-mcp/process133-professional-recovery/browser-check.json`
- `process_logs/playwright-mcp/process133-professional-recovery/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process133.json`
- `process_logs/reviews/Process133.md`

## Known Problems

- KPB-003：探头、水深、检查或分层修订变化会精确失效下游；旧成果保留但活动指针清空。
- KPB-004：清空、替换、重置、新建方案和参数重启均提供影响说明、取消及原位恢复。
- KPB-006：清空与替换作用于 IndexedDB 权威对象；刷新恢复和真实工作簿全流程通过。
- KPB-007：CPT09、CPT19、SCPT1 的真实规模计时、最长任务和完整流程均通过。
- KPB-008：新建方案只保留一个当前判断动作，并可取消或再次进入方法指南。
- KPB-011：导入、分层、参数和成果的返工入口均回到拥有该状态的页面。
- KPB-012：状态、真实数据、工程谱系、双分辨率和三类只读复查共同验收。
- KPB-013：默认界面只显示当前动作；历史、影响和高级证据按需展开。
- KPB-015：连续保存仍经序列队列与 CAS；旧异步结果不能覆盖新工作区修订。
- KPB-026：缓存身份纳入水深与终孔深度，并验证增量失效和相同上下文引用复用。
- KPB-027：manifest-only 检查提交不重写 data block，同时保留完整权威校验。
- KPB-028：局部更新保持无关点位、批次和数据块引用稳定，UI-only 导航不进入工程保存队列。
- KPB-029：性能证据按单个用户动作分段计时并说明范围。

## Boundaries

- 未改变工程公式、分类方法或参数采用规则。
- 未删除原始文件、数据块、冻结分层、参数或成果历史。
- 未增加云端存储；浏览器 IndexedDB 仍是权威存储。
