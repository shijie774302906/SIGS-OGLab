# Process135 - 快捷图册只读 Agent 与助手权限隔离

Date: 2026-07-29

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 将快捷输入的受控数据整理助手与快捷图册的只读解读 Agent 明确分开。
- 导入助手继续使用 Process134 的结构化建议、人工确认和原子导入合同。
- 图册助手可自行规划读取当前图册的页面、图表、方法和有限深度数据，但没有任何写入、修改、删除、重生成或导入能力。

## Result

- 建立 `professional-governed`、`quick-import-governed` 和 `report-reader` 三个显式 profile；服务端按 profile 注册工具并拒绝跨 profile 调用。
- 快捷输入页统一显示“AI 整理数据”，继续保留不可变来源、结构化确认和人工提交；快捷图册页显示“图册解读”，只说明当前页和只读来源。
- 图册 Agent 可读取图册目录、指定页面、图表、方法及最多 20 m、120 个源测点的 qc、fs、u₂ 等有限深度窗口；空值保留，不插值、不补造、不修改测量值。
- 每个问题的证据绑定 `authorityHash + revisionId`，并继续绑定页码、方法、图表、深度范围和字段。同页追问可复用当前有效事实；切页、重生成或查询对象变化后必须重新读取对应事实。
- 方法别名覆盖 Schneider、JTS、Fuzzy、Modified Robertson 2016；分类页共享 SBT/SBTn、Schneider、Fuzzy、Ic/JTS 和 Robertson 2016 语义识别。
- 图表字段区分 qc、qt、fs、u2、Ic、Bq、Qtn、Rf 和 Fr；可信输出只从结构化工具载荷生成，模型自行声称的数值不会成为页面事实。
- 服务失败保留原问题和对话，提供真正的“重新解读”；恢复不会重复插入用户消息，也不会改变图册或工作数据。

## Verification

- `npm.cmd run verify:slice -- verify --process 135 --mode closure`：通过。
  - domain-fast：255/255。
  - ui-isolated：117/117。
  - real-serial：32/32；包含 7,832 行、3 工作表真实规模来源和完整营口流程。
  - 合计：404/404。
- `npm.cmd run test:assistant-server`：22/22。
- build、测试分层审计、Process 工具测试、知识库校验与知识门禁全部通过。
- 同页连续追问、切页失效、真实重试、方法/图表/深度证据绑定、跨 profile 工具拒绝均有自动化断言。
- 1440×900 与 1920×1080：输入助手与图册助手角色可辨、抽屉在视口内、无横向溢出、没有浏览器错误。
- Visual、Geotechnical/Data/Permission、Copy/IA/Recovery 三类只读复查均为 PASS，P0=0、P1=0。

## Evidence

- `process_logs/playwright-mcp/process135-report-reader/input-assistant-1440x900.png`
- `process_logs/playwright-mcp/process135-report-reader/input-assistant-1920x1080.png`
- `process_logs/playwright-mcp/process135-report-reader/report-reader-1440x900.png`
- `process_logs/playwright-mcp/process135-report-reader/report-reader-1920x1080.png`
- `process_logs/playwright-mcp/process135-report-reader/browser-check.json`
- `process_logs/playwright-mcp/process135-report-reader/evidence-manifest.json`
- `process_logs/verification/Process135-closure.json`
- `process_logs/knowledge-reviews/Process135.json`
- `process_logs/reviews/Process135.md`

## Known Problems

- KPB-003：页、修订、方法、图表、深度范围和字段共同绑定证据；切页和重生成会令旧证据失效。
- KPB-004：服务失败说明当前动作未完成，保留原问题并提供可执行的“重新解读”。
- KPB-011：图册解读全程只读，重试和恢复不会静默改写原始测量或工作结果。
- KPB-012：真实规模流程、失败恢复、工程字段和单位、双分辨率及三类独立复查共同证明用户可见语义。
- KPB-013：两个助手的默认首屏不铺陈过多信息，只显示当前角色、必要来源和一个主要动作。
- KPB-020：`not-applicable`；本切片不修改或重算分类来源，也不生成新成果，只读取冻结图册的现有页面元数据。
- KPB-025：DeepSeek 协议与工具调用、第二轮回执、输出长度异常处理及跨 profile 白名单由助手服务套件覆盖。

## Boundaries

- 图册 Agent 不是工程审批者，回答不构成正式土类、设计参数或工程采用结论。
- 本轮没有改变分类公式、参数公式、图册确定性计算、专业解译流程或 Process134 原子导入协议。
- 图册 Agent 无 write/edit/delete/regenerate/import 工具；导入助手也不能绕过结构化确认直接写入。
- API Key 仍只存在于当前标签页内存；浏览器本地项目数据仍是权威。
- 当前 Process135 精选证据 manifest 单独审计通过。历史证据总表仍报告部分旧 Process 输入漂移及无 manifest 的遗留目录；未删除或改写历史证据，本问题不影响本轮最终证据的新鲜性。

## Residual P2

- 1440px 下“完整 PDF”主按钮可能换到第二行，但完整可见且不遮挡内容。
- 少量未覆盖的图表类型仍会退回英文 slug；后续可将完整中文名称并入共享页面元数据。
