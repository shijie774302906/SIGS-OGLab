# Process162 - AI 侧栏双滚动隔离

Date: 2026-08-20

Status: `active / confirmed / local only`

## Confirmation Card

- 本轮目标：修复 AI 侧栏长内容没有独立滚动、底部操作不可见，以及侧栏滚动带动主页面的问题。
- 用户真实动作：上传或更换文件、选择工作表、开始 AI 整理、回答问题、查看长结果、停止/重试、确认导入、关闭并重新打开侧栏；在主页面和侧栏分别滚动。
- 需要做的功能模块：统一 AI 侧栏壳层、固定头部、独立滚动内容区、固定底部操作区、语义状态自动定位、滚动链隔离。
- 页面承接方式：快捷数据整理、快捷图册解读、专业数据导入与专业 AI 助手共用同一滚动责任；不改变中心工作区和右栏工具的既有结构。
- 输入数据方式：确定性生成的 15 工作表 XLSX、长消息与长整理结果；不使用私有工程数据。
- 验收成果：1440×900、1920×1080 的 Playwright 人类流程、滚轮隔离断言、长内容/15 工作表/失败重试证据、无横向溢出和浏览器错误。
- 不做什么：不修改 AI 模型、Harness、协议、工程公式、导入规则或线上部署；本轮只部署本地供用户验收。
- 关键风险：错误的 `scrollIntoView` 滚动外部页面；固定底部遮挡内容；滚动到底发生 scroll chaining；流式消息反复抢走用户滚动位置；不同 AI 入口行为漂移。
- 是否开始实现：用户已确认。

## Feature Coverage Gate

| User Action | Object Created/Read/Updated/Consumed | Events And States | Page Surface | Missing Function | Acceptance Case |
| --- | --- | --- | --- | --- | --- |
| 打开 AI 侧栏 | 当前助手会话 | open / close / reopen | AI 侧栏 | 稳定的三段式壳层 | 头部与底部在视口内，关闭重开状态正常 |
| 上传或更换文件 | 导入来源与工作表目录 | empty / parsed / replaced / stale | 滚动内容区 | 更换来源重置内部滚动 | 新文件回到内容顶部，不改变主页面位置 |
| 选择工作表 | 选中工作表 | required / selected / changed | 滚动内容区 + 固定底部 | 状态变化后定位当前动作 | 15 个工作表可滚动选择，开始整理始终可见 |
| 开始或停止整理 | AI 请求 | idle / loading / cancelled | 固定底部 | 当前主要操作不被长内容推走 | 运行时停止可见，取消后可恢复 |
| 回答 AI 问题 | 协商问题与选项 | question / answer / next question | 滚动内容区 | 问题出现时内部定位 | 定位问题和选项，主页面 scrollTop 不变 |
| 查看并确认建议 | 整理草稿 | proposal / review / confirm / save error | 内容区 + 固定底部 | 建议定位与确认操作分离 | 长建议可到底，确认按钮不被遮挡，保存失败可重试 |
| 阅读/提问图册 | 图册对话 | empty / loading / long answer / retry | 快捷 AI 侧栏 | 长对话独立滚动 | 输入区固定，历史回答可滚动且不抢主页面 |
| 在两个区域滚轮 | 主页面与 AI 滚动位置 | middle / edge / bottom | 主页面 + AI 侧栏 | 阻止滚动链 | 指针所在区域独立滚动；侧栏到底不带动页面 |
| 调整窗口尺寸 | 侧栏可用高度 | 1440×900 / 1920×1080 | 整体页面 | 可视高度与底部安全区 | 侧栏滚动条可见，底部操作不越界，无横向溢出 |

## Event Matrix

| ID | Event | Detection | User-Facing State | Available Actions | Disabled Actions | Recovery Path | Acceptance Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P162-E01 | 文件更换 | source identity changes | 新文件与工作表列表 | 选择工作表 | 旧建议确认 | 内部滚动回顶部并清除旧定位 | Playwright scrollTop 断言 |
| P162-E02 | 工作表选定 | selected sheet changes | 当前工作表明确 | 开始整理 | 未满足条件的发送 | 底部主操作持续可见 | 15-sheet flow |
| P162-E03 | AI 提问 | question becomes available | 问题与固定选项 | 选择答案/手动返回 | 确认旧建议 | 只在侧栏内定位 | outer scroll invariant |
| P162-E04 | 建议生成 | proposal becomes available | 建议详情 | 检查、纠正、确认 | 再次开始整理 | 定位建议开头，固定确认区 | long proposal flow |
| P162-E05 | 请求运行/取消 | loading/building | 处理中与停止 | 停止 | 重复提交 | 停止后回到可重试状态 | cancel/retry flow |
| P162-E06 | AI 失败 | error available | 原因与重试 | 重试/手动处理 | 确认不存在的建议 | 重新请求不丢文件 | failure recovery flow |
| P162-E07 | 侧栏滚动到底 | scrollTop reaches max | 无额外提示 | 继续查看/操作 | 无 | 阻止向主页面传递 | real wheel assertion |

## Implementation Plan

- [完成] 1. 建立 Process162 并完成 Known Problem Check。
- [完成] 2. 为快捷与专业 AI 入口建立固定头部、内部滚动区、固定底部的共享结构约定。
- [完成] 3. 增加问题、建议、失败和文件更换的侧栏内部自动定位，取消会影响外层的定位方式。
- [完成] 4. 隔离滚动链，处理双分辨率、窗口缩放及关闭重开。
- [进行中] 5. 完成 build、相关测试、Playwright 双分辨率与本地部署验收。

## Acceptance Contract

- 快捷和专业 AI 入口的页头、滚动内容和底部操作责任一致。
- AI 侧栏中间区 `overflow-y` 可滚动，并保留稳定滚动条空间。
- 侧栏滚动到底继续滚轮时，主页面滚动位置不变。
- 主页面滚动时，侧栏滚动位置不变。
- 自动定位只在语义状态变化时发生，不在每个流式消息更新时抢夺位置。
- 15 工作表和长 AI 内容均可访问到底；底部主操作在两个目标分辨率中始终可见。
- 上传、更换、关闭重开、停止、失败重试和确认导入均正常。
- 覆盖失败、取消、返回、连续失败与恢复成功；恢复入口定位到侧栏中的准确问题或操作，而不是页面顶部。
- 保存临时失败与重试不丢失当前文件或 AI 草稿；本轮不改变权威存储和清理语义。
- 返回手动导入、取消 AI 处理和恢复 AI 处理均回到责任位置，且原始测量不被静默改写。
- 至少包含一个失败恢复和一个 15 工作表长内容流程；截图同时检查标签、选中态、禁用态、溢出和错误日志。
- 1440×900 首屏能看到当前 AI 状态和唯一最强主要动作，非当前操作收进滚动内容区。
- Process162 的计划、证据 manifest、知识报告与归档状态保持一致；证据输入变更后 manifest 审计必须识别为过期。
- `npm.cmd run build`、相关 Playwright 通过；控制台错误、页面错误与横向溢出为 0。
- 原始范围只允许本地验收；其后的“Process162 双站正式发布”确认项已明确授权同一验收版本上线。

## Design Read

保留现有高密度工程工作台和紫色单一强调色；设计变动仅服务滚动责任、操作可见性与状态反馈。设计参数：variance 3 / motion 2 / density 8。

## Confirmed Addendum - AI 入口即授权并自动整理

- Goal: 删除独立“同意发送”步骤；用户点击带有 AI 含义的入口、选择 AI 文件或发送 AI 问题时，即授权本次限定范围的数据发送。
- Scope: 快捷文件整理、专业文件整理、快捷图册解读与专业 AI 助手；普通上传、粘贴和手动导入继续只在本地处理。
- Single-sheet flow: 选择文件并完成本地解析后，自动开始 AI 判断。
- Multi-sheet flow: 先由用户选择工作表；选定后自动开始 AI 判断，仅发送选中工作表的限定窗口。
- Existing rows: AI 整理草稿经用户确认后直接整体替换当前表格数据，不追加；写入前明确显示替换影响。
- Chat flow: 用户点击发送即授权该次有界上下文，不再出现单独授权卡。
- Failure flow: 文件、工作表选择和现有数据保持不变；重试不再次请求授权。
- Non-goals: 不改变 DeepSeek 模型、AI Harness、工具协议、字段判断规则或确认导入这一唯一写入动作。
- Verification: Playwright 必须从真实上传/点击开始，覆盖单表自动运行、多表选择后自动运行、已有数据替换、本地导入不调用 API、失败重试、停止与双分辨率。
- Implementation may start: yes，用户已确认。

### Addendum Todos

- [完成] A1. 将授权收据绑定到明确的 AI 用户动作，并移除独立授权卡。
- [完成] A2. 实现单工作表自动判断与多工作表选择后自动判断。
- [完成] A3. 保留确认导入并验证已有数据整体替换。
- [进行中] A4. 完成 build、Playwright、知识门禁与本地部署。

## Confirmed Addendum - Process162 双站正式发布

- Authorization: 用户已于 2026-08-20 明确确认部署到线上。
- Release scope: 仅发布本轮已验收的 AI 侧栏双滚动隔离、AI 入口即授权与单表/选表后自动整理。
- Targets: 国内站 `https://sigs-oglabx.com` 与国际站 `https://sigs-oglab.com` 使用同一构建和同一 Git 提交。
- Safety boundary: 不发布独立 AI 实验室、Process149、私有工程数据、营口数据、API 密钥、`.env`、过程日志、Playwright 产物或本机临时文件。
- Release proof: 发布前构建、安全审计、release parity、CloudBase preflight；发布后核对 release manifest、capabilities、visits、首页和 AI 入口流程。
- Rollback: 保留当前线上 Process161 构建与提交 `b630d7fc812439d6c24f01fd6dfc6232e01f4c76`，任一站失败时单站回滚，不让两个正式站长期版本漂移。

### Production Todos

- [进行中] P1. 绑定 Process162 release manifest，并完成产物敏感信息审计。
- [待办] P2. 将同一提交发布到 Vercel 国际站与 CloudBase 国内站。
- [待办] P3. 完成双站 release manifest、API 和关键页面线上冒烟验证。
- [待办] P4. 更新上线索引与关闭证据。
