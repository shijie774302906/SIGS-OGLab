# Process119 — DNV / ISO 地层分层要求调研

日期：2026-07-22

## 结论

DNV 和 ISO 的公开官方资料均没有给出一套可直接照搬的“按 CPT 曲线自动切层”算法，也没有规定固定窗口、最小层厚或目标层数。它们关注的是：调查与报告质量、场地与土体表征、土类识别与描述、设计土剖面的工程适用性，以及结果的可追溯与专业判断。

因此，本产品的自动结果应继续称为“候选分层”或“方法分类分层”，不能称为“DNV 分层”或“ISO 分层”。工程师确认、合并、拆分和调整边界后，才可形成项目采用的工程地层或设计土剖面。

## ISO

### ISO 19901-8:2023 — Marine soil investigations

- 适用于海洋土体调查，覆盖规划、钻探与编录、原位测试、取样、室内试验和报告。
- 标准区分 measured values、derived values 与设计阶段的 representative/design values；公开摘要明确表示它不规定设计值和代表值，只给出有限的数据解释指导。
- 这说明 CPT 自动分类可以提供派生证据，但不能独自替代工程地层确认。

官方来源：https://www.iso.org/standard/83302.html

### ISO 19901-4:2025 — Geotechnical design considerations

- 面向海上结构岩土设计，包含场地和土体表征、风险识别及基础设计。
- 公开摘要没有规定 CPT 自动切层方法；重点是形成适用于结构和设计问题的土体表征。

官方来源：https://www.iso.org/standard/79594.html

### ISO 22476-1:2022 — Electrical CPT/CPTU

- 规定电测 CPT/CPTU 的设备、试验过程和报告要求。
- 对海上 CPT，标准明确指向 ISO 19901-8。
- 它不是土层自动划分或土类判定标准。

官方来源：https://www.iso.org/standard/75661.html

### ISO 14688-1:2017 / ISO 14688-2:2017 — Soil identification and classification

- Part 1 规定土的识别与描述，并强调由有经验的人员使用灵活体系进行判断。
- Part 2 给出工程土分类原则：依据现场和室内试验，把组成和工程性质相近的土归组；项目和材料需要时可以进一步细分。
- 这套标准适合约束最终土类名称和描述，不提供 CPT 曲线边界自动检测算法。

官方来源：

- https://www.iso.org/standard/66345.html
- https://www.iso.org/standard/66346.html

## DNV

### DNV-RP-C212 — Offshore soil mechanics and geotechnical engineering

- DNV 官方页面说明该推荐实践覆盖土体调查的规划与执行，以及海上基础的建模、分析和承载力预测。
- 公开页面未提供一套固定的 CPT 自动分层阈值或算法；完整条款需要通过 DNV Rules and Standards Explorer 查阅。

官方来源：https://www.dnv.com/energy/standards-guidelines/dnv-rp-c212-offshore-soil-mechanics-and-geotechnical-engineering/

### DNV GIFT JIP

- DNV 在 2025 年说明行业仍需要更明确的海上风电场地调查指导，并启动项目研究如何形成可靠的 design soil profile。
- 官方表述强调结合地球物理、岩土调查和 ground modelling，而不是仅依据单孔 CPT 自动分类。
- 据此可推断：DNV 当前方向是多源证据和工程适用的设计土剖面，而不是统一的单曲线自动切层算法。此句是依据官方项目说明作出的工程推断。

官方来源：https://www.dnv.com/news/2025/dnv-launches-joint-industry-project-on-ground-investigations-for-offshore-wind-turbines/

## 对本产品的直接要求

1. 自动方法输出“候选分层”，并记录方法、窗口、合并规则和数据覆盖率。
2. 最终层需由工程师确认，可合并、拆分和调整边界。
3. 土类名称与描述可映射到 ISO 14688 原则，但 JTS、SBT、Schneider、Robertson 的方法分类不能直接冒充 ISO 土类。
4. 设计土剖面应允许结合 CPT/CPTU、钻孔编录、室内试验和地球物理证据。
5. 当前 Fig5 的 1.0 m 窗口与“相邻同类合并”属于本产品的透明候选规则，不应标注为 DNV/ISO 规定。
