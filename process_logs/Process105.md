# Process105 - 真实层间边界唯一显示与拖动共线

Date: 2026-07-16

Status: `closed / implemented / verified`

## Goal

确保贯穿 qc、fs、u2 与分层柱的共享虚线只表示真实层间边界；拖动时虚线、手柄、上层底边和下层顶边保持共线，完整土层内部不再出现幽灵虚线。

## Root Cause

- UI 直接遍历 `scheme.boundaries`，即使边界数量多于 N−1、引用失配或深度不等于相邻层接缝也会绘制。
- 共享虚线覆盖层按外部固定 plot 高度映射，而曲线和分层 track 因内容最小高度实际溢出；相同工程深度落到了不同像素坐标。
- 拖动预览只移动共享虚线和手柄，没有同步更新相邻两层的可见边缘与选中带。
- 旧验收只比较边界深度值、图表外框和曲线/分层两侧端点，没有比较虚线与真实层接缝的像素位置。
- 本切片按“深度轴必须对齐”验收共享虚线、相邻层接缝与拖动手柄，不再以外框等高代替工程共轴。

## Implemented Result

- 新增真实可绘制边界选择器：只有引用正确、深度等于上层底深/下层顶深的边界才能显示。
- 增加边界数量结构问题：N 层必须有 N−1 条边界。
- 每次新结构修订统一按相邻层接缝规范边界：复用可靠边界对象，删除多余对象，缺失时创建需复核的恢复边界。
- 曲线 track 和分层 track 强制占满同一个 plot 高度，消除覆盖层与实际绘图区的纵向尺寸差。
- 拖动预览同步更新共享虚线、手柄、上下层 block 边缘、选中层曲线带、定位线和层深度提示。
- 拖动深度限制在相邻层允许的最小 0.05 m 范围内；取消恢复，松手形成一个原子修订。
- 合并成一层后共享虚线数量为 0；历史失配边界不再作为工程事实绘制。

## Engineering Boundaries

- 虚线没有第二种含义：不是分类候选、问题提示、选中层中心线或深度网格。
- 历史方案缺少可靠边界对象时不猜测显示；结构问题继续可见，下一次结构修订才规范化。
- 本切片没有改变 JTS 分类、候选生成、大类合并规则、土类判断或参数公式。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `175/175` passed。
- UI-isolated: `72/72` passed。
- Process105 拖动/取消/提交/刷新/合并: `1/1` passed。
- Process093 密集 43 层回归: `1/1` passed。
- Process104 原位拆分回归: `1/1` passed。
- Real-serial 分层大数据性能: `1/1` passed。
- Real-serial 营口真实首次 JTS 指南: `1/1` passed。
- 静态接缝误差 `0.50–0.75 px`；拖动中共享线、层接缝与手柄最大误差 `0.94 px`。
- 合并为一层后可见共享虚线 `0`。
- 1440×900、1920×1080：横向溢出 `0`；console/page errors `0`。
- Knowledge gate: 6 个重要问题全部处置。

## Evidence

- `process_logs/playwright-mcp/process105-real-layer-seams/drag-preview-1440x900.png`
- `process_logs/playwright-mcp/process105-real-layer-seams/committed-real-seams-1440x900.png`
- `process_logs/playwright-mcp/process105-real-layer-seams/committed-real-seams-1920x1080.png`
- `process_logs/playwright-mcp/process105-real-layer-seams/merged-no-internal-boundary-1440x900.png`
- `process_logs/playwright-mcp/process105-real-layer-seams/browser-check.json`
- `process_logs/playwright-mcp/process105-real-layer-seams/evidence-manifest.json`
- `process_logs/verification/Process105-final.json`
- `process_logs/knowledge-reviews/Process105.json`

## Known Problems

- Covered: KPB-003, KPB-008, KPB-012, KPB-014, KPB-015, KPB-016。

## Closure Checklist

- [x] 仅真实相邻层接缝显示共享虚线。
- [x] N 层/N−1 边界结构校验与新修订规范化完成。
- [x] 拖动、取消、提交和刷新保持像素共线。
- [x] 合并后一层内部无虚线，拆分后每个真实接缝只有一条虚线。
- [x] Build、完整领域/UI、相关真实目标、双视口和知识门禁通过。
