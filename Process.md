# Web Prototype Process Index

This is the lightweight closure index for `D:\CPT-UIQA-WebPrototype`.

Detailed closure records live in `process_logs/ProcessNNN.md`. The complete former Process001-051 index is preserved in `process_logs/Process-index-archive-001-051.md`.

## Current - Process160 图册图例与版面可读性
- Date: 2026-08-18
- Status: `closed / implemented / verified / local only`
- Result: 快速与专业图册统一采用 11 pt 图例下限、完整换行和稳定留白；长层名表格动态增高，逐页视觉审阅与独立 Agent 复核均无 P0/P1/P2。
- Verification: build、目标 Playwright 4/4、15 页快捷图册、dense 极端页、专业 A4/A3、双分辨率、80% 预览、Known Problem Gate 与证据 manifest 均通过。
- Rollback: `94e7285` / `pre-report-layout-process160`
- Detail: `process_logs/Process160.md`

## Recent - Process159 快捷 AI 自由协商导入
- Date: 2026-08-18
- Status: `closed / implemented / verified`
- Result: 快捷 AI 支持自由只读探索、自然语言协商和最终结构化提交；多工作表由用户先选，AI 只读取所选工作表。
- Verification: build、assistant 36/36、domain 57/57、quick UI 29/29、真实 DeepSeek 1/1、双分辨率与 Known Problem Gate 均通过。
- Detail: `process_logs/Process159.md`

## Recent - Process158 双正式站安全发布
- Date: 2026-08-18
- Status: `closed / verified / deployed`
- Result: Process156/157 已由同一发布提交部署到国际站与国内站；国内 API 经灰度验证后切换到 v2，两个站点均完成快捷部分解译与 Excel 下载线上验收。
- Verification: release audit、build、release parity、CloudBase preflight、API v2、访问统计和双站双分辨率 Playwright 4/4 passed；无横向溢出和浏览器错误。
- Detail: `process_logs/Process158.md`

## Recent - Process157 快捷 AI 导入 v2 与分项解译
- Date: 2026-08-18
- Status: `closed / implemented / verified / ready for deployment`
- Result: 快捷 AI 导入支持共同/独立深度与最多 6 轮固定选择；缺失 fs/u2 只影响依赖方法，直接 qt 不重复修正，图册与 Excel 共用统一结果包。
- Verification: build、assistant 45/45、domain 57/57、quick UI 27/27、5000 行、真实工作簿只读、双分辨率、无溢出/浏览器错误和 Known Problem Gate 均通过。
- Detail: `process_logs/Process157.md`

## Recent - Process156 成果工具默认展开
- Date: 2026-08-18
- Status: `closed / implemented / verified / ready for deployment`
- Result: 专业解译进入成果输出时默认展开成果工具；其他专业页面默认隐藏，手动隐藏在当前成果页不会自动弹回，重新进入成果页会再次展开。
- Verification: build、成果专项 1/1、相关回归 19/19、双分辨率、无溢出、无浏览器错误和 Known Problem Gate 均通过。
- Detail: `process_logs/Process156.md`

## Recent - Process155 AI 文件整理等待与专业界面呈现优化
- Date: 2026-08-18
- Status: `closed / implemented / verified / ready for deployment`
- Result: 专业和快捷文件整理使用 Flash、专业问答保留 Pro；最长安全等待、停止/重试、5000 行 CSV/XLSX/无表头处理和专业六页人类可读呈现已经统一。
- Verification: build、assistant 45/45、domain 272/272、UI 151/151、real 26 passed / 2 optional skipped、规模 5/5、CloudBase 16/16、release parity 16/16、双分辨率与三类 Agent 复查通过。
- Detail: `process_logs/Process155.md`

## Recent - Process154 国内正式站版本统一与可追溯发布
- Date: 2026-08-18
- Status: `closed / implemented / verified / ready for deployment`
- Result: 国内站发布候选已统一主分支业务修复、专业六页首次指引、安全 Markdown、同源 `/help/` 手册和 CloudBase 发布门禁；独立 AI 实验室、私有数据、密钥与临时页面均被排除。
- Verification: build、domain 272/272、UI 144/144、real 26 passed / 2 optional skipped、CloudBase 16/16、release parity 16/16、双分辨率与知识门禁通过。
- Detail: `process_logs/Process154.md`

## Recent - Process153 私有数据与临时产物安全清理

- Date: 2026-08-04
- Status: `closed / verified / deployed`
- Result: 用完全合成样例替换私有派生样例，删除私有文件、密钥、本机临时产物和专属测试，并建立源码、路径、构建包和发布索引四层拦截。
- Verification: build、release audit、知识门禁、分层回归和正式域名资源扫描通过；线上构建不含私有标记。
- Detail: `process_logs/Process153.md`

## Recent - Process152 已验证更新安全生产发布

- Date: 2026-08-04
- Status: `closed / verified / deployed`
- Result: Process147、148、150、151 已发布至正式域名；机器可读上线索引明确排除 Process149、私有数据、密钥和本机产物。
- Verification: 分层测试、发布审计、正式域名双分辨率、AI/统计接口与浏览器错误检查通过。
- Detail: `process_logs/Process152.md`

## Recent - Process151 专业成果物理字号统一

- Date: 2026-08-04
- Status: `closed / implemented / verified`
- Result: 专业成果 A3/A4 与快捷图册采用一致的物理字号下限；A4 紧凑标题和图例避免放大后的重叠与截断。
- Verification: build、专业成果相关回归、A3/A4 Canvas 字号、双分辨率和 Known Problem Gate 通过。
- Detail: `process_logs/Process151.md`

## Recent - Process150 分层来源一致性与安全回退

- Date: 2026-08-03
- Status: `closed / implemented / verified`
- Result: JTS 候选从第一条编辑快照起冻结同一分类来源；向导回退不再误用普通撤销，零整理直接返回也能安全保存；来源冲突显示专项原因。
- Verification: build、相关回归 33 passed / 1 conditional skipped、双分辨率、IndexedDB 权威状态、零保存/浏览器错误和 Known Problem Gate 通过。
- Detail: `process_logs/Process150.md`

## Recent - Process148 使用当前分层

- Date: 2026-08-03
- Status: `closed / implemented / verified`
- Result: 地层整理方法增加“使用当前分层”；层和边界保持原样并进入逐层确认，取消不推进，返回可撤销，刷新可恢复。
- Verification: build、相关回归 35 passed / 1 private-sample skipped、双分辨率、Known Problem Gate 和工程结构不变断言通过。
- Detail: `process_logs/Process148.md`

## Recent - Process147 图册可读性与专业向导安全回退

- Date: 2026-08-03
- Status: `closed / implemented / verified / independently reviewed`
- Result: 15 页图册按 A3 物理点值统一排版并支持真实 80% 页面缩放；专业地层分层与参数向导可确认式回退、失效下游结果并安全恢复。
- Verification: build、相关回归 96/96、全量 Chromium 435 passed / 11 external-or-private-sample skipped、600 DPI、双分辨率、Known Problem Gate 和三类 Agent 复查均通过。
- Detail: `process_logs/Process147.md`

## Recent - Process146 快捷出图输入与图册首次使用指引

- Date: 2026-08-02
- Status: `closed / implemented / verified / deployed`
- Result: 快捷输入页和图册页各提供一次性的三步聚焦指引；桌面贴近目标，移动端底部卡自动滚动，独立记录且可按当前页重播。
- Verification: build、专项 3/3、相关回归 41/41、三种分辨率、线上输入/图册双指引、Known Problem Gate、evidence manifest 和 process doctor 均通过。
- Detail: `process_logs/Process146.md`

## Recent - Process145 图册解读持续会话与精确证据

- Date: 2026-08-02
- Status: `closed / verified / deployed`
- Result: 同一图册跨页保留一段只读对话；当前页随问题附带有界同源证据，跨页与精确深度由 DeepSeek 自主调用只读工具；10 轮生产问答和跨页来源专项复核完成。
- Verification: build、assistant-server 41/41、quick domain/UI 75/75、生产 10 轮 10/10、双分辨率、Known Problem Gate、evidence manifest 和 process doctor 均通过。
- Detail: `process_logs/Process145.md`

## Recent - Process144 安全生产发布

- Date: 2026-08-02
- Status: `closed / verified / deployed`
- Result: Process126-143 已从干净发布工作树推送到私有 GitHub 发布分支并部署至 Vercel production；私有营口数据、密钥、本机凭据和临时产物未进入发布版本，线上双分辨率与接口检查通过。
- Verification: build、domain-fast 262/262、ui-isolated 130 passed / 3 private-sample skipped、real-serial 26 passed / 8 external-or-private-sample skipped、assistant-server 36/36、release audit 0 errors、线上浏览器 0 errors。
- Detail: `process_logs/Process144.md`

## Recent - Process143 桌面端首次使用指引

- Date: 2026-08-02
- Status: `closed / implemented / verified`
- Result: 首次空工作区桌面访问提供“选模式、填项目名、开始使用”三步聚焦指引；完成或跳过后记住，已有项目和移动端不被打断，项目首页可手动重播。
- Verification: build、domain-fast 263/263、ui-isolated 133/133、real-serial 32 passed（2 个可选外部样本跳过）、双分辨率证据和 Known Problem Gate 通过。
- Detail: `process_logs/Process143.md`

## Recent - Process142 独立中文使用手册与上下文帮助

- Date: 2026-08-01
- Status: `closed / implemented / verified / deployed`
- Result: 独立中文手册、GoG 6 双路径说明、主站上下文帮助和生产恢复已上线；`docs.sigs-oglab.com` 已启用有效证书与强制 HTTPS。
- Verification: closure 77 specs、目标测试 67/67、真实 GoG 6 2/2、文档 Playwright 9/9、线上首页/深链/帮助入口/HTTPS 和 Known Problem Gate 均通过。
- Detail: `process_logs/Process142.md`

## Recent - Process141 快捷页面滚动与匿名访问统计

- Date: 2026-08-01
- Status: `closed / implemented / verified / deployed`
- Result: 快捷页恢复独立纵向滚动；全局左下角显示匿名累计访客、访问次数、覆盖地区和紧凑地区分布；原始 IP 与工程数据不保存，统计故障不影响产品。
- Verification: build、assistant/analytics 36/36、domain-fast 262/262、ui-isolated 126/126、real-serial 32/32、双分辨率/在线滚动与生产统计接口、Known Problem Gate 通过。
- Detail: `process_logs/Process141.md`

## Recent - Process140 公共 AI 每日额度与合成演示数据

- Date: 2026-08-01
- Status: `closed / implemented / verified / deployed`
- Result: 官网公共 DeepSeek 按匿名浏览器访客每天 100 次、北京时间换日；个人 Key 旁路额度；专业导入与快捷出图均可一键载入明确标识的 121 行固定合成 CPTU 数据。
- Verification: build、assistant 31/31、domain-fast 262/262、ui-isolated 123/123、real-serial 32/32、双分辨率证据、线上公共/自有 Key 验收和 Known Problem Gate 通过。
- Detail: `process_logs/Process140.md`

## Recent - Process139 Vercel 私有预览与安全首发

- Date: 2026-07-31
- Status: `closed / implemented / verified / privately deployed`
- Result: 私有 GitHub、Vercel 生产预览、服务端公共 DeepSeek、自有 Key 会话模式与 GitHub 自动部署连接均已建立；营口真实数据和密钥未进入发布历史。
- Verification: build、assistant 25/25、domain-fast 260/260、ui-isolated 120/120、real-serial 32/32、双分辨率在线证据和 Known Problem Gate 通过。
- Detail: `process_logs/Process139.md`

## Recent - Process138 本地公开前全面质量审查与整改

- Date: 2026-07-30
- Status: `closed / implemented / verified / independently reviewed`
- Result: 本地技术与证据门禁通过；GitHub 公开仍等待许可证和营口数据授权/移除决策。
- Detail: `process_logs/Process138.md`

## Recent - Process137 A3 600 DPI 高清 PDF 导出

- Date: 2026-07-30
- Status: `closed / implemented / verified / independently reviewed`
- Result: 快捷图册导出改为逐页 A3 600 DPI 无损重绘，按钮显示页进度，失败可重试，实时数据变化会终止旧任务。
- Verification: build、domain-fast 259/259、ui-isolated 119/119、real-serial 32/32、营口真实 PDF 多倍率证据、知识门禁和三类只读复查全部通过。
- Detail: `process_logs/Process137.md`

## Recent - Process136 图册解读自由只读问答

- Date: 2026-07-30
- Status: `closed / implemented / verified / independently reviewed`
- Result: DeepSeek 可自主决定零次、一次或多轮调用图册只读工具；最终回答不再被固定摘要覆盖，长对话安全裁剪且保持工具关联完整。
- Verification: build、domain-fast 257/257、ui-isolated 119/119、real-serial 32/32、assistant server 24/24、双分辨率证据、知识门禁和三类只读复查全部通过。
- Detail: `process_logs/Process136.md`

## Recent - Process135 快捷图册只读 Agent 与助手权限隔离

- Date: 2026-07-29
- Status: `closed / implemented / verified / independently reviewed`
- Result: 快捷输入继续使用受控结构化整理与人工确认；快捷图册使用仅能按需读取页面、图表、方法和有限深度数据的只读 Agent，并按页、修订和查询对象绑定证据。
- Verification: build、domain-fast 255/255、ui-isolated 117/117、real-serial 32/32、assistant server 22/22、双分辨率证据、知识门禁和三类只读复查全部通过。
- Detail: `process_logs/Process135.md`

## Recent - Process134 快捷出图 AI 结构化判断与原子导入

- Date: 2026-07-27
- Status: `closed / implemented / verified / independently reviewed`
- Result: DeepSeek 负责判断非标准工作表、表头、数据范围、字段与单位；用户确认后，浏览器从不可变来源全文件校验并幂等原子导入，保存失败与来源切换均可安全恢复。
- Verification: build、domain-fast 253/253、ui-isolated 114/114、real-serial 32/32、真实 DeepSeek、三组随机高压、双分辨率证据、知识门禁和三类只读复查全部通过。
- Detail: `process_logs/Process134.md`

## Recent - Process133 专业解译性能与回退/重置

- Date: 2026-07-27
- Status: `closed / implemented / verified / independently reviewed`
- Result: 真实规模检查提交不再重复写入未变化数据块；导入清空/替换、并行分层方案、参数重启及上游返工形成一致恢复合同，旧成果保留但不会冒充当前结果。
- Verification: build、domain-fast 247/247、ui-isolated 111/111、real-serial 32/32、营口三点性能证据、双分辨率证据、知识门禁和三类只读复查通过。
- Detail: `process_logs/Process133.md`

## Recent Closures

### Process132 快捷出图 AI 文件整理与图册解读

- Date: 2026-07-27
- Status: `closed / implemented / verified / independently reviewed`
- Result: 快捷出图可受控整理非标准 CSV/XLSX、识别中英文同义字段与单位并排除额外列；用户确认后才导入，图册页解释仅来自冻结的当前页事实。
- Verification: build、assistant server 19/19、domain-fast 245/245、ui-isolated 109/109、real-serial 32/32、双分辨率证据、知识门禁和三类只读复查通过。
- Detail: `process_logs/Process132.md`

### Process131 AI 导入保存检查与同名重导恢复

- Date: 2026-07-26
- Status: `closed / implemented / verified / independently reviewed`
- Result: 同名重导使用新的系统内部编号并保留删除历史；保存失败以普通语言说明内部记录问题，AI 草稿可恢复且多标签冲突不会盲目重试。
- Verification: build、domain-fast 239/239、ui-isolated 106/106、real-serial 32/32、真实 SCPT1 IndexedDB 重载、双分辨率证据、知识门禁和三类只读复查通过。
- Detail: `process_logs/Process131.md`

### Process130 DeepSeek 导入多轮工具稳定性

- Date: 2026-07-25
- Status: `closed / implemented / verified`
- Result: 修复 `deepseek-v4-pro` 读取来源后的第二轮工具调用；导入使用 8,000 token，完整往返思考模式协议字段，并准确区分截断、格式与真实服务故障。
- Verification: build、assistant server 18/18、导入目标 12/12、真实 DeepSeek 两轮调用、domain-fast 238/238、ui-isolated 105/105、real-serial 31/31 通过。
- Detail: `process_logs/Process130.md`

### Process129 AI 导入 CSV 鲁棒性与 V4-Pro
- Date: 2026-07-25
- Status: `closed / implemented / verified`
- Result: 五类固定种子的 100 行 CSV 均可由普通导入和 AI 整理识别；源值不变，错误可恢复，实际运行模型为 `deepseek-v4-pro`。
- Detail: `process_logs/Process129.md`

### Process128 DeepSeek 辅助数据整理与受控导入

- Date: 2026-07-25
- Status: `closed / implemented / verified / independently reviewed`
- Result: DeepSeek 可在专业导入页受控整理不规范 CSV/Excel，结构化确认工作表、表头、字段、单位与可选测量值修改；原始证据不变，用户唯一确认后复用既有管线原子导入。
- Verification: build、assistant server 14/14、domain-fast 237/237、ui-isolated 103/103、real-serial 31/31、营口真实 4,282 行、双分辨率证据及三类只读复查通过。
- Detail: `process_logs/Process128.md`

### Process127 DeepSeek 会话连接入口

- Date: 2026-07-25
- Status: `closed / implemented / verified / independently reviewed`
- Result: 普通用户可在专业 AI 助手内临时验证自己的 DeepSeek API Key；密钥仅存在于当前标签页内存，每次请求经无状态同源中继临时转发，并受工程数据外发同意与人工修改确认双重门禁约束。
- Verification: build、domain-fast 234/234、ui-isolated 98/98、real-serial 30/30、assistant server 12/12、双分辨率证据及三类只读复查通过。
- Detail: `process_logs/Process127.md`

### Process126 受控 DeepSeek 专业解译助手

- Date: 2026-07-24
- Status: `closed / implemented / verified / independently reviewed`
- Result: 专业右侧助手可受控读取工作流摘要和有限深度窗口，形成需人工确认的分层草稿修改；DeepSeek 密钥仅由本机代理持有。
- Verification: closure 69/69 个测试文件、domain-fast 233/233、ui-isolated 95/95、real-serial 30/30、双分辨率证据及三类只读复查通过。
- Detail: `process_logs/Process126.md`

### Process125 专业分类方案与动态成果输出

- Date: 2026-07-24
- Status: `closed / implemented / verified / independently reviewed`
- Result: 专业分层可单选 JTS、Fuzzy、Modified Robertson 或 Schneider，保留同源分层与参数谱系，并从同一冻结快照生成覆盖式 PDF+Excel 成果；连续导入保存竞态已修复。
- Verification: build、知识门禁、domain-fast 226/226、ui-isolated 88/88、real-serial 等价 30/30、双分辨率证据及三类只读评审通过。
- Detail: `process_logs/Process125.md`

### Process124 全站共享反馈入口

- Date: 2026-07-23
- Status: `closed / implemented / verified`
- Detail: `process_logs/Process124.md`

### Process123 全局反馈入口与 FormSubmit 中文表单

- Date: 2026-07-23
- Status: `closed / implemented / verified`
- Detail: `process_logs/Process123.md`

### Process122 快捷图册参数分类依据说明

- Date: 2026-07-23
- Status: `closed / implemented / verified / independently reviewed`
- Detail: `process_logs/Process122.md`

### Process121 快捷图册一键清空

- Date: 2026-07-23
- Status: `closed / implemented / verified / independently reviewed`
- Detail: `process_logs/Process121.md`

### Process120 真实网页与 PDF 图册视觉迁移

- Date: 2026-07-23
- Status: `closed / implemented / verified / independently reviewed`
- Detail: `process_logs/Process120.md`

### Process119 全图册 PNG 视觉迁移样张

- Date: 2026-07-22
- Status: `closed / concept accepted / verified`
- Result: 使用 4,282 行营口真实数据生成并确认 15 页 PNG 工程图册样张；统一曲线、九区分类、三方法分层对照和实际公式审计页。
- Verification: 目标测试 12/12；PNG/JSON 机器检查、知识门禁和最终证据 manifest 通过。
- Detail: `process_logs/Process119.md`

### Process118 第六页五联图视觉样张

- Date: 2026-07-22
- Status: `closed / concept accepted`
- Detail: `process_logs/Process118.md`

### Process117 CPeT-IT 对照图册与双分类方法

- Date: 2026-07-21
- Status: `closed / implemented / verified / independently reviewed`
- Detail: `process_logs/Process117.md`

### Process116 多方法分类对比与九区深度配色

- Date: 2026-07-21
- Status: `closed / implemented / verified / independently reviewed`
- Detail: `process_logs/Process116.md`

### Process115 快捷 PDF 工程制图式视觉统一

- Date: 2026-07-21
- Status: `closed / implemented / verified / independently reviewed`
- Result: 14 页快捷图册采用统一黑框、分级灰网格、居中粗体标题和工程表格；非分层色带、空白区与极端值显示语义保持明确。
- Verification: build passed；domain-fast 206/206；ui-isolated 76/78 并行且两条单 worker 复跑通过；real-serial 30/30；营口 4,282 行、双分辨率、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process115.md`

### Process114 快捷图册视觉整理与 Excel 数据导出
- Date: 2026-07-21
- Status: `closed / implemented / verified / independently reviewed`
- Result: 快捷图册采用白色工程页眉、自有标识、外置统一土类图例；粉土改为淡蓝色，并增加与当前图册修订绑定的三 Sheet 数据表导出。
- Verification: build passed；domain-fast 205/205；ui-isolated 等价 78/78；real-serial 30/30；营口 4,282 行、双分辨率、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process114.md`

### Process113 中文横版快捷出图与十四页工程图册
- Date: 2026-07-20
- Status: `closed / implemented / verified / independently reviewed`
- Result: 新手可从固定表格粘贴或 Excel 直接生成 14 页中文横版图册与 PDF；完整 CPTU/近似 CPT、局部不适用、stale 和浏览器持久化均有明确行为。
- Verification: build passed；关闭级 Playwright 310/310；营口 4,282 行真实数据、双分辨率证据、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process113.md`

### Process112 A3 图册 JTS 九色深度分类带
- Date: 2026-07-20
- Status: `closed / implemented / verified / independently reviewed`
- Result: 密集 JTS 测点改为真实深度九色分类带，缺失与间断留白；分类证据和最终地层明确分栏，薄层标签避让，并修复选层延迟重渲染。
- Verification: build passed；关闭级 Playwright 299/299；营口 A3 六页机器检查、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process112.md`

### Process111 工程师确认当前参数范围并进入成果输出
- Date: 2026-07-20
- Status: `closed / implemented / verified / independently reviewed`
- Result: 工程师可一次确认当前完成参数，未完成项以“本阶段不纳入”留痕；成果页明确显示部分成果范围。
- Verification: build passed；关闭级 Playwright 190/190；双分辨率证据、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process111.md`

### Process110 参数完成到成果输出的明确交接
- Date: 2026-07-20
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: 参数完成后不自动跳页；中央唯一主操作明确进入成果输出，问题态直达处理，参数页与成果页共用当前权威就绪条件。
- Verification: build passed；domain-fast 187/187；ui-isolated 等价 75/75；real-serial 等价 29/29；双分辨率证据、知识门禁和三类只读评审通过。
- Detail: `process_logs/Process110.md`

### Process109 按需 Excel 参数与地层工作簿
- Date: 2026-07-17
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: generates one immutable Excel parameter and stratigraphy workbook on demand, including per-depth parameters, layer statistics and a shared-depth qc/fs/u2/final-layer long chart.
- Verification: build passed; domain-fast `186/186`; ui-isolated `75/75`; real-serial `29/29`; Yingkou 7,832-row output, dual-resolution evidence, knowledge gate and three independent reviews passed.
- Detail: `process_logs/Process109.md`

### Process108 参数异常点强制忽略与硬完整性门禁

- Date: 2026-07-17
- Status: `closed / implemented / verified / independently reviewed`
- Result: retained recommended local-ignore thresholds while allowing an engineer to explicitly force-ignore an over-threshold parameter point without rerunning upstream workflows.
- Verification: build passed; domain-fast `183/183`; ui-isolated `75/75`; real-serial `29/29`; dual-resolution evidence and three independent reviews passed.
- Detail: `process_logs/Process108.md`

### Process106 JTS SBT 区间标注与九色辨识

- Date: 2026-07-16
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified`
- Result: Zone 4–9 labels are derived from authoritative Ic bands, while one high-distinction palette is shared by SBT points, selected points, labels and the nine-item legend.
- Verification: build passed; domain `176/176`; UI `72/72`; real `29/29`; closure `62/62` specs; dual-resolution Yingkou evidence passed.
- Detail: `process_logs/Process106.md`

### Process105 真实层间边界唯一显示与拖动共线

- Date: 2026-07-16
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified`
- Result: dashed lines now represent only valid adjacent-layer seams; drag preview keeps the shared line, layer seam and handle within 1 px, and merged single layers show no internal line.
- Verification: build passed; domain `175/175`; UI `72/72`; relevant real targets `2/2`; dual-resolution evidence passed.
- Detail: `process_logs/Process105.md`

### Process104 分层边界拖动与原位拆分

- Date: 2026-07-16
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified`
- Result: the shared qc/fs/u2/layer boundary follows pointer drag in real time, and the selected-layer dock now restores reliable merge sources or splits at a constrained depth.
- Verification: build passed; domain `174/174`; UI `71/71`; relevant real targets `2/2`; dual-resolution evidence passed.
- Detail: `process_logs/Process104.md`

### Process103 分层确认与修订门禁一致性

- Date: 2026-07-16
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified`
- Result: repeated layer descriptions are valid, L numbers own identity, and guide/final submission use one actionable problem gate with visible location and recovery.
- Verification: build passed; domain `172/172`; UI `70/70`; real Yingkou target `1/1`; dual-resolution evidence passed.
- Detail: `process_logs/Process103.md`

### Process102 共轴分层边界与 JTS 九分区 SBT 证据图

- Date: 2026-07-16
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: one shared dashed boundary across qc/fs/u2/layers, focus-only black layer text, and an authoritative linked JTS/T 242-2020 nine-zone Qtn*–Fr SBT chart.
- Verification: domain `172/172`; UI `70/70`; real `29/29`; Yingkou 4,282 rows; three independent reviews PASS.
- Detail: `process_logs/Process102.md`

### Process101 分层归并复核语义与极端规模硬化

- Date: 2026-07-15
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: typed merge-review reasons, conservative legacy recovery, exact source-depth evidence, automatic active-row location, truthful 0.14 m locator and deterministic 200/500-layer receipts.
- Verification: domain `170/170`; UI `70/70`; real `29/29`; Yingkou 4,282 rows; three independent reviews PASS.
- Detail: `process_logs/Process101.md`

### Process100 按工程土类大类归并相邻层

- Date: 2026-07-15
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: target-count simplification was replaced by deterministic adjacent major-group merging with explicit engineer boundary locks, composition labels, retained review/audit state and atomic recovery.
- Verification: domain `165/165`; UI `70/70`; real `29/29`; targeted verifier `50/62` impacted specs; Yingkou `4,282` rows and three independent reviews passed.
- Detail: `process_logs/Process100.md`

### Process099 受约束的分层简化向导

- Date: 2026-07-15
- Active plan: `plan.md` (closed slice)
- Status: `closed / implemented / verified / independently reviewed`
- Result: soft target-layer simplification foundation with protected boundaries, deterministic reasons and reversible application; superseded in Process100 by the confirmed major-soil-group rule.
- Verification: final verifier `62/62` specs; domain `165/165`; UI `70/70`; real `29/29`; Yingkou 4,282-row evidence and three independent reviews passed.
- Detail: `process_logs/Process099.md`

### Process098 Closure Dry-Run

- Date: 2026-07-15
- Active plan: `plan.md` (no active slice)
- Status: `closed / implemented / verified`
- Result: deterministic closure preflight and human-editable draft with formal-file no-mutation proof; automatic apply remains unsupported.
- Verification: close `7/7`; selector `11/11`; two targeted receipts passed; real dry-run ready with `formalFilesUnchanged=true`; build and gates passed.
- Detail: `process_logs/Process098.md`

### Process097 Evidence Lifecycle

- Date: 2026-07-15
- Active plan: `plan.md` (no active slice)
- Status: `closed / implemented / verified`
- Result: dry-run-first promotion, curated audit, and transient-only cleanup with hash/path/symlink/collision guards.
- Verification: lifecycle `7/7`; process tooling `13/13`; real audit 0 errors; cleanup preview only; build and gates passed.
- Detail: `process_logs/Process097.md`

### Process096 Slice-Aware Verification

- Date: 2026-07-15
- Active plan: `plan.md` (no active slice)
- Status: `closed / implemented / verified`
- Result: deterministic baseline/delta selection, explicit impact reasons, fail-safe unknown handling, tier-aware targeted execution and full closure planning.
- Verification: selector tests `8/8`; targeted domain `2/2`; closure dry-run `61/61` specs; build and gates passed.
- Detail: `process_logs/Process096.md`

### Process095 Playwright Test Isolation And Tiers

- Date: 2026-07-15
- Active plan: `plan.md` (no active slice)
- Status: `closed / implemented / verified`
- Result:
  - Centralized UI startup reset in one automatic Playwright fixture.
  - Assigned all 61 specs and 251 tests exactly once to three executable tiers.
  - Preserved explicit persistence/recovery semantics and single-worker real-data validation.
- Verification: tier constraints `5/5`; domain `153/153`; UI `69/69`; real equivalent `29/29`; build and knowledge gate passed.
- Detail: `process_logs/Process095.md`

### Process094 Process Consistency And Evidence Freshness

- Date: 2026-07-15
- Active plan: `plan.md` (no active slice)
- Status: `closed / implemented / verified`
- Result:
  - Added deterministic active/closure process doctor and evidence manifest create/audit commands.
  - Restored Process091 bidirectional update-library linkage and added KPB-016 for future workflow-drift matching.
  - Refreshed and hash-bound Process093 final evidence.
- Verification:
  - Process tooling tests `13/13`, knowledge tests `5/5`, build and knowledge validation passed.
  - Historical Process093 doctor and final manifest audit passed.
  - Process094 strict closure doctor passed after final manifest generation.
- Detail: `process_logs/Process094.md`

| Process | Date | Theme | Status | Detail |
| --- | --- | --- | --- | --- |
| 137 | 2026-07-30 | A3 600 DPI high-resolution PDF export | implemented / verified / independently reviewed | `process_logs/Process137.md` |
| 100 | 2026-07-15 | Adjacent engineering-major-group merging | implemented / verified / independently reviewed | `process_logs/Process100.md` |
| 099 | 2026-07-15 | Constrained layer simplification guide | implemented / verified / independently reviewed | `process_logs/Process099.md` |
| 098 | 2026-07-15 | Closure dry-run | implemented / verified | `process_logs/Process098.md` |
| 097 | 2026-07-15 | Evidence lifecycle | implemented / verified | `process_logs/Process097.md` |
| 096 | 2026-07-15 | Slice-aware verification | implemented / verified | `process_logs/Process096.md` |
| 095 | 2026-07-15 | Playwright isolation and test tiers | implemented / verified | `process_logs/Process095.md` |
| 093 | 2026-07-15 | Dense stratification shared-axis viewing | implemented / verified / independently reviewed | `process_logs/Process093.md` |
| 092 | 2026-07-14 | Shared-axis stratification and thin-layer guide | implemented / verified / independently reviewed | `process_logs/Process092.md` |
| 091 | 2026-07-14 | Guided data adjustment and permanent point removal | implemented / verified / independently reviewed | `process_logs/Process091.md` |
| 090 | 2026-07-14 | Diagram-centered stratification review workbench | implemented / verified / independently reviewed | `process_logs/Process090.md` |
| 089 | 2026-07-14 | Reusable problem library and closure gate | implemented / verified | `process_logs/Process089.md` |
| 088 | 2026-07-14 | Data check full-profile curves | implemented / verified / independently reviewed | `process_logs/Process088.md` |
| 087 | 2026-07-14 | Data preparation and check guide | implemented / verified / independently reviewed | `process_logs/Process087.md` |
| 086 | 2026-07-13 | Guided stratification generation feedback | implemented / verified / independently reviewed | `process_logs/Process086.md` |
| 085 | 2026-07-13 | Complete local workspace reset | implemented / verified | `process_logs/Process085.md` |
| 084 | 2026-07-13 | New project point identity handoff | implemented / verified / independently reviewed | `process_logs/Process084.md` |
| 083 | 2026-07-13 | Browser storage save recovery | implemented / verified | `process_logs/Process083.md` |
| 082 | 2026-07-13 | Generic CPT/CPTU stratification guide | implemented / verified / independently reviewed | `process_logs/Process082.md` |
| 081 | 2026-07-13 | Guided stratification | implemented / verified / independently reviewed | `process_logs/Process081.md` |
| 080 | 2026-07-13 | JTS parameter depth curves | implemented / verified / independently reviewed | `process_logs/Process080.md` |
| 079 | 2026-07-13 | Single-path guided parameter result | implemented / verified / independently reviewed | `process_logs/Process079.md` |
| 078 | 2026-07-12 | Attio-style guided parameter interpretation | implemented / verified / independently reviewed | `process_logs/Process078.md` |
| 077 | 2026-07-12 | Guided engineering decisions and stratification workflow | implemented / verified / independently reviewed | `process_logs/Process077.md` |
| 076 | 2026-07-12 | Simple JTS exception decision | implemented / verified | `process_logs/Process076.md` |
| 075 | 2026-07-12 | JTS data-exception flow research | researched / confirmed | `process_logs/Process075.md` |
| 074 | 2026-07-12 | Guided JTS pore-path recovery | implemented / verified | `process_logs/Process074.md` |
| 073 | 2026-07-12 | JTS recovery UX simplification | implemented / verified | `process_logs/Process073.md` |
| 072 | 2026-07-12 | Stratification inline JTS diagnosis and safe auto-recovery | implemented / verified | `process_logs/Process072.md` |
| 071 | 2026-07-11 | JTS minimal-input CPT/CPTU interpretation workflow | implemented / verified | `process_logs/Process071.md` |
| 070 | 2026-07-11 | G5 Yingkou real-case workflow | implemented / verified / independently reviewed | `process_logs/Process070.md` |
| 069 | 2026-07-11 | G1D constrained custom formulas | implemented / verified / independently reviewed | `process_logs/Process069.md` |
| 068 | 2026-07-11 | G2 parameter curve workbench | implemented / verified / independently reviewed | `process_logs/Process068.md` |
| 067 | 2026-07-11 | F2 formula/rule stratification | implemented / verified / independently reviewed | `process_logs/Process067.md` |
| 066 | 2026-07-10 | G1B parameter method implementation | implemented / verified / independently reviewed | `process_logs/Process066.md` |
| 065 | 2026-07-10 | Parameter formula authority and method contract | researched / frozen / independently reviewed | `process_logs/Process065.md` |
| 064 | 2026-07-10 | Parameter input derivation and persistence foundation | implemented / verified / independently reviewed | `process_logs/Process064.md` |
| 063 | 2026-07-10 | Complete stratification workflow and parameter handoff | implemented / verified / independently reviewed | `process_logs/Process063.md` |
| 062 | 2026-07-10 | First-three-page closure and Check handoff | implemented / verified / independently reviewed | `process_logs/Process062.md` |
| 061 | 2026-07-10 | Multi-point generation and recovery | implemented / verified / independently reviewed | `process_logs/Process061.md` |
| 060 | 2026-07-10 | Editable mapping and units | implemented / verified / independently reviewed | `process_logs/Process060.md` |
| 059 | 2026-07-10 | Import domain pipeline | implemented / verified / independently reviewed | `process_logs/Process059.md` |
| 058 | 2026-07-10 | V2 point aggregate and IndexedDB runtime | implemented / verified / independently reviewed | `process_logs/Process058.md` |

## Product Status

- Five feature zones and the fixed point workflow are defined in `plan-total.md`.
- Browser-local V3 project/point authority now covers the complete JTS minimum-input interpretation lifecycle and immutable history.
- Full CPTU and no-u2 approximate routes, governance, JTS classification, editable stratification, parameters, dissipation, A4/A3 PDF, and Excel are functional prototype workflows.
- Stratification now explains JTS prerequisite, numeric, and pore-path outcomes; it uses a short exception decision, linked qc/fs/u2 evidence, candidate-scoped ignore, Ic-only fallback, and progressive advanced control.
- Parameter interpretation now defaults to a resumable Attio-style guide with fixed engineering choices, explicit material/Nkt/silt checks, deferred or excluded states, and partial-result declarations in generated outputs.
- Browser-local save failures now preserve in-page edits and distinguish quota, availability, temporary writes, invalid state, and multi-tab conflicts with reason-specific recovery.
- Stratification now uses a diagram-centered inline review flow with fixed decisions, deferred recovery, and exact evidence-source binding.
- Stratification now keeps qc/fs/u2 and the layer column on one depth axis and provides a conservative, configurable thin-layer guide with atomic preview, apply and undo.
- Dense stratification now provides full-hole overview, selected-layer focus and expanded full-hole viewing with collision-safe labels, explicit shared depth axes and list-to-drawing navigation.
- Dense stratification now also provides a constrained simplification guide with a soft target, a data-derived automatic lower recommendation, protected boundaries, explicit merge reasons and atomic undoable application.
- Stratification now replaces that superseded target-count path with adjacent major-group merging, explicit engineer boundary locks, ordered composition labels and retained review/audit state.
- Original real workbooks and deterministic generated cases cover normal, error, cancel, retry, stale, refresh, recovery, output, and cross-point states.
- No next active slice has been selected.
- Formal adoption/design-value status, backend persistence, collaboration, DXF, foundation calculations, other standards, and legacy migration remain outside confirmed scope.

## History

- Full former index, Process001-051: `process_logs/Process-index-archive-001-051.md`
- Individual closure records: `process_logs/Process001.md` onward.
- Browser evidence: `process_logs/playwright-mcp/`
- Evidence retention rules: `docs/process/evidence-policy.md`
