# 参数解译 G1B 公式来源与方法合同

日期：2026-07-10  
状态：`来源已冻结 / 生产实现完成 / 独立复查完成`  
适用范围：`Stage G1B / φ′ 与 Su 首批参数方法`

## 1. 结论

本轮已找到能定位到版本、页码和公式编号的来源，因此 `φ′/Su` 不再停留于桌面代码注释。但是，核验也修正了原 G0 候选中的四个过度简化：

1. `φ′ = 17.6 + 11 log10(Qtn)` 的直接出处是 ConeTec 2023 手册第 82 页公式 (5.6)；Uzielli & Mayne (2019) 原文直接列出的同系确定性公式 (10) 使用 `qt1`，不能把论文中的 `qt1` 公式转录成 `Qtn` 后仍声称是论文原式。
2. 公式 (5.6) 的输出是砂土与粉砂质砂土的峰值有效摩擦角 `φ′p`，不是不带条件的通用 `φ′`。
3. `Su = qnet/Nkt` 的数值含义取决于 `Nkt` 对应的剪切模式。`Nkt≈12` 只可作为正常固结至轻度超固结、软至中等强度原状黏土的三轴压缩参考强度 `suc` 文献起始假设，不是通用默认值，也不是场地校准值。
4. 来源将 `IcRW < 2.60` 与砂类排水行为关联，但未授权反向推导“所有 `IcRW >= 2.60` 都是不排水黏土”。Mayne & Peuchen (2018) 的黏土数据库实际包含约 `2.3 <= Ic <= 3.7`。因此 `Ic` 对 `Su` 只能作为冲突证据，不能作为硬计算门槛。

因此，G1B 首版方法的真实输出定义为：

```text
PhiDeg -> peak effective friction angle, φ′p, degrees
SuKpa  -> triaxial-compression reference undrained strength, suc, kPa
```

通用简称 `φ′` 和 `Su` 只允许作为导航类别。任何紧邻数值的曲线轴、表头、tooltip、统计、比较、运行快照和交接字段都必须显示 `φ′p（峰值有效摩擦角）` 或 `suc（三轴压缩参考不排水强度）`，不得退化成无条件参数。

## 2. 来源证据

### 2.1 主规格来源

Mayne, P. W., Cargill, E., and Greig, J. (2023), *The Cone Penetration Test: Better Information, Better Decisions - A CPT Design Parameter Manual*, First Edition, Revision 1.1, ConeTec Group, February 2023.

- `φ′p`：第 82 页，公式 (5.6)。
- `φ′p` 适用筛选：第 84 页，公式 (5.6)/(5.7) 适用于 `IcRW < 2.6` 的排水行为区。
- `suc`：第 113 页，公式 (6.7)。
- `Nkt` 语义：第 113 页；软原状黏土常见 `10-20`，软至中等强度海相黏土三轴压缩模式建议起始值约 `12`，其他剪切模式和裂隙超固结黏土使用不同范围。
- 官方下载页：<https://www.conetec.com/download_file/view/1108>
- Revision 1.1 PDF 镜像：<https://lankelma.com/img/ConeTec_CPT_Design_Manual-2023_First_Edition-2023-04-24_rev1.1_EN.pdf>

本地逐段核对材料：

- `D:\CPT-UIQA\Mayne著作翻译.md`，公式 (5.6) 位于约第 1946 行，公式 (6.7) 位于约第 2404 行。
- `D:\CPT-UIQA\Mayne_formula_index_initial.md`，公式索引 `F108` 和对应第六章条目。
- 这些本地文件用于逐字核对，不替代上方可定位出版物。

### 2.2 交叉核验来源

Uzielli, M. and Mayne, P. W. (2019), “Probabilistic assignment of effective friction angles of sands and silty sands from CPT using quantile regression”, *Georisk*, DOI `10.1080/17499518.2019.1663388`.

- 数据来自 27 种未老化、未胶结的石英-硅质砂与不同细粒含量的粉砂质砂。
- CPT/CPTU 以标准 `20 mm/s` 速率推进。
- 文中 `Qtn` 模型只应在 `20 < Qtn < 400` 内使用，避免超出数据库范围。
- 文中确定性公式 (10) 是 `φ′ = 11 log10(qt1) + 17.6`；ConeTec 手册随后把同系关系替换为 `Qtn` 并编号为 (5.6)。
- DOI：<https://doi.org/10.1080/17499518.2019.1663388>

Mayne, P. W. and Peuchen, J. (2022), “Undrained shear strength of clays from piezocone tests: a database approach”, CPT'22, Paper 1107, pp. 546-551.

- 第 1 页明确 `su = qnet/Nkt`，并强调强度受剪切模式、加载速率、方向、应力状态和破坏准则影响。
- 第 2 页定义 `qnet = qt - sigma_v0`，并给出基于 `Bq` 的另一种 `Nkt` 方法。
- 数据库覆盖 70 个黏土场地；有机土和胶结黏土不在数据库适用范围内。
- 作者公开 PDF：<https://geosystems.ce.gatech.edu/files/2024/04/Mayne-Peuchen-2022-Undrained-shear-strength-of-clays-from-piezocone-test-database-7f358a95690ad386.pdf>

Mayne, P. W. and Peuchen, J. (2018), “Evaluation of CPTU Nkt cone factor for undrained strength of clays”, *Cone Penetration Testing 2018*, pp. 423-429.

- 第 1 页公式 (1) 给出 `suc = qnet/Nkt`，并明确场地专项校准优于通用取值。
- 表 1/图 4 给出 NC-LOC 软至中等强度黏土的类别均值：陆相约 `12.0`，海相约 `12.3`；敏感黏土、OC 原状黏土和 OC 裂隙黏土具有不同典型值和不确定性。
- 数据库中的黏土 `Ic` 范围约为 `2.3-3.7`，证明 `Ic=2.6` 不能作为 `suc` 的单一硬门槛。
- 作者公开 PDF：<https://bpb-us-e1.wpmucdn.com/sites.gatech.edu/dist/e/4245/files/2024/04/Mayne-Peuchen-2018-CPTu-Nkt-for-su-in-clays-cdcb53f2ffbf69d4.pdf>

证据等级：ConeTec 2023 手册是本首版两条确定性实现的主规格；2019 与 2022 论文用于核对数据库范围、变量定义和不确定性边界。任何二手网页或桌面代码都不能覆盖这些限制。

## 3. 共同前置合同

两个方法只消费已完成且仍为当前来源的 `ParameterInputDerivationRunV2`。运行前必须满足：

- 当前点位、检查运行、分层方案和精确分层修订仍匹配。
- 每个方法实际消费的 `qnet/Qtn/Ic` 必须来自同一个不可变推导运行和同一组标准化源行；不得因为 `suc` 不需要 `Qtn/Ic` 就虚构这两个值。
- `qt/qnet/sigma_v0` 使用 `kPa`，`Qtn/IcRW` 无量纲。
- 分层范围采用当前 `ParameterSchemeRevisionV2` 的层引用，不按数组位置猜测。
- 方法运行冻结方法版本、公式规格哈希、适用性确认、设置和源行快照。
- 任一上游来源改变时旧结果可查看，但不得进入当前参数工作结果。

当前软件字段 `Ic` 对应本地前置推导中使用 `Qtn/Fr` 的材料指数。G1B 运行快照必须同时保存其算法 ID 与版本，用户文案显示 `IcRW 软件筛选值`，避免把它当成工程土类或排水试验结论。

### 3.1 速率、排水和材料证据对象

两种方法都必须冻结结构化 `PenetrationRateEvidenceV1`：

```text
status = standard_confirmed | known_nonstandard | missing
nominalRateMmPerSec
unit = mm/s
sourceType = point_metadata | test_report | user_confirmation
sourceRevisionId
confirmedAt
```

首版方法只接受 `standard_confirmed + nominalRateMmPerSec=20`。来源没有给出可自行扩展的速率容差，因此软件不得把 18、19 或 21 mm/s 自动视作等价。`missing` 和 `known_nonstandard` 使用不同 reason code，均不生成当前方法数值。

两种方法都必须冻结独立的 `DrainageApplicabilityEvidenceV1`：

```text
status = confirmed_drained | confirmed_undrained | unknown | conflict | resolved_conflict
evidenceType = cptu_pore_pressure_response | site_characterization | laboratory_or_field_assessment | user_confirmation
sourceRevisionId
conflictRevisionId (conflict 时必需)
confirmedAt
note
resolvedAs = confirmed_drained | confirmed_undrained (resolved_conflict 时必需)
supersedesConflictRevisionId (resolved_conflict 时必需)
resolutionRevisionId (resolved_conflict 时必需)
```

`IcRW` 只产生软件筛选建议，不能创建上述确认状态。运行上下文冻结 `currentConflictRevisionId`。`unknown` 或未解决的 `conflict` 不生成当前有效值。`resolved_conflict` 的 `supersedesConflictRevisionId` 必须精确等于当前冲突 ID；缺失、引用旧冲突或引用其他冲突均为 `DrainageEvidenceSupersessionMismatch`。`φ′p` 只接受 `resolvedAs=confirmed_drained` 且仍满足 `IcRW < 2.60`，`suc` 只接受 `resolvedAs=confirmed_undrained`。如果确认记录早于新冲突，或没有覆盖当前冲突修订，该记录已失效，不能放行。

`φ′p` 另需 `MaterialApplicabilityEvidenceV1`：

```text
status = within_source_scope | scope_unknown | known_extrapolation | engineer_confirmed_extrapolation | outside_scope
materialClass
sourceRevisionId
confirmedAt
note
```

`scope_unknown` 或 `known_extrapolation` 可保留试算数值，但状态必须为 `ApplicabilityUnconfirmed`，不能进入当前参数工作结果。显式工程确认会创建新的 `engineer_confirmed_extrapolation` 修订并保留提示；`outside_scope` 在本方法版本中不能覆盖。

`IcRW` 的共同解释规则固定为：

```text
IcRW < 2.60  -> 支持砂类排水筛选，但不能推翻独立的黏土/不排水证据
IcRW = 2.60  -> 对 φ′p 是来源边界；对 suc 仅为筛选冲突证据
IcRW > 2.60  -> 可支持黏性行为筛选，但不能单独证明不排水贯入
```

`φ′p` 仍严格要求 `IcRW < 2.60`。`suc` 是否可运行由工程土类和独立的不排水贯入依据决定；`IcRW <= 2.60` 时不会删除已有独立依据，但会先形成联合冲突并停止当前有效值。只有产生覆盖当前冲突、且解决方向为不排水的 `resolved_conflict` 修订后，才允许计算并保留 `SucIcScreenConflict` 提示。浮点比较使用计算结果原值，不对显示到两位小数后的值做判断。

## 4. 方法一：峰值有效摩擦角 φ′p

### 4.1 身份与公式

```text
methodId: CPTU-Param-PhiSand-Qtn-Mayne
methodVersion: v1
parameterKey: PhiDeg
resultDefinition: peak_effective_friction_angle
formulaRef: Mayne-Cargill-Greig-2023-Rev1.1-p82-Eq5.6
formula: phiPeakDeg = 17.6 + 11.0 * log10(Qtn)
outputUnit: degree
```

禁止使用自然对数，禁止对输出做隐藏截断、裁剪或“合理化”修正。

### 4.2 数值与适用性门槛

必须同时满足：

1. `Qtn` 为有限无量纲数。
2. `20 < Qtn < 400`；等于边界也视为超出来源范围。
3. `IcRW < 2.60`。
4. 目标层工程土类为 `sand`；`mixed/unknown/clay` 不由该方法自动解释。
5. `PenetrationRateEvidenceV1` 为 `standard_confirmed` 且名义速率为 `20 mm/s`。
6. `DrainageApplicabilityEvidenceV1` 为 `confirmed_drained`，或已按合同解决且仍满足 `IcRW < 2.60`。
7. 材料适用性证据满足上方合同；已知为高钙质、胶结或不属于砂/粉砂质砂的材料时不适用。

材料矿物组成未知或已知偏离数据库时可保留试算值，但状态为 `ApplicabilityUnconfirmed`，不得进入当前结果。用户补充材料证据或形成显式工程适用性确认修订后才可继续。已知高钙质或胶结材料不生成值。

### 4.3 状态和恢复

| Reason code | 用户状态 | 数值 | 恢复动作 |
| --- | --- | --- | --- |
| `PhiValid` | 有效 | 有 | 查看来源或结果 |
| `PhiMissingQtn` / `PhiNonFiniteQtn` / `PhiNonPositiveQtn` | 输入存在问题 | 无 | 返回前置输入或数据导入 |
| `PhiMissingIc` / `PhiNonFiniteIc` | 缺少排水筛选输入 | 无 | 返回前置输入或数据导入 |
| `PhiOutsideSourceQtnRange` | 超出方法来源范围 | 无 | 更换方法或排除范围 |
| `PhiTransitionIc` | 位于排水过渡边界 | 无 | 复核土层、排水条件或更换方法 |
| `PhiLayerGroupMismatch` | 工程土类与方法不一致 | 无 | 返回地层分层或调整槽范围 |
| `PhiRateBasisMissing` | 缺少标准速率依据 | 无 | 补充点位元数据或显式确认 |
| `PhiKnownNonstandardRate` | 已知为非标准速率 | 无 | 更换方法版本或重新评估试验 |
| `PhiDrainageBasisMissing` | 缺少排水依据 | 无 | 补充 CPTU/场地证据 |
| `PhiDrainageResolutionMismatch` | 冲突解决方向不是排水 | 无 | 重新核验并形成正确方向的解决修订 |
| `DrainageEvidenceSupersessionMismatch` | 解决记录未覆盖当前冲突 | 无 | 基于当前冲突创建新解决修订 |
| `PhiMaterialOutsideSource` | 材料不在来源范围 | 无 | 更换方法 |
| `PhiMaterialScopeUnknown` / `PhiKnownExtrapolation` | 材料适用性待确认 | 仅保留试算值 | 补材料证据或创建工程确认修订 |
| `PhiMaterialSourceDeviation` | 工程确认后仍偏离来源数据库 | 有，带提示 | 查看确认修订或改用其他方法 |

## 5. 方法二：三轴压缩参考不排水强度 suc

### 5.1 身份与公式

```text
methodId: CPTU-Param-Su-Nkt-MayneLunne
methodVersion: v1
parameterKey: SuKpa
resultDefinition: undrained_shear_strength_triaxial_compression_reference
formulaRef: Mayne-Cargill-Greig-2023-Rev1.1-p113-Eq6.7
qnetKpa = qtKpa - sigmaV0Kpa
sucKpa = qnetKpa / Nkt
outputUnit: kPa
```

首版只支持 `triaxial_compression` 参考模式。直接剪切、三轴伸长、现场十字板和多模式平均值需要独立方法版本，不能只换一个显示名称。

### 5.2 Nkt 设置合同

`Nkt` 设置不是一个裸数字，至少包含：

```text
value
origin = literature_starting_assumption | user_defined_assumption | site_calibrated
targetStrengthMode = triaxial_compression
assumptionRationale
calibrationEvidence
confirmedAt
```

材料、速率和排水证据由参数槽/运行的共享 `evidenceRefs` 唯一持有，`Nkt` 设置不得复制当前实际值。文献起始假设只声明自己的 `eligibleMaterialClass/eligibleEnvironments` 规则，运行时用唯一材料证据对象和 `environment` 与该规则比对。

规则：

- `Nkt` 必须为有限正数；这只是数学条件，不证明方法适用。
- 页面不自动写入 `12`。只有用户选择“使用文献起始假设 12”后，`value=12` 才进入方案草稿和后续快照。
- `12` 只在 `soft_firm_nc_loc_intact_clay + triaxial_compression` 条件下可选；运行快照另存 `environment=onshore|offshore`，并始终带“未做场地校准”提示。海相依据来自 ConeTec 2023 p113 的建议值及 Mayne & Peuchen 2018 的类别均值约 `12.3`；陆相依据来自 Mayne & Peuchen 2018 Table 1/Figure 4 的类别均值 `12.0`。既有桌面默认只用于兼容性对照，不是来源权威。
- 用户输入其他未校准值时使用 `user_defined_assumption`，必须填写假设依据并生成未校准提示，不能冒充 `site_calibrated`。
- `site_calibrated` 必须引用 `NktCalibrationEvidenceV1`，至少包含 `projectId/siteId/pointId`、材料类别、适用层精确修订、校准修订、同高程匹配的 `qnet/suc` 数据对、输入推导运行、源行 ID、参考试验修订、匹配依据、深度、三轴压缩模式、破坏准则、Nkt 推导和统计方式。只有备注或试验名称时属于 `user_defined_assumption`。
- 每次运行另存 `projectId/siteId/pointId/targetLayerRevisionRef/inputDerivationRunId`，并读取 canonical 的当前推导运行源行目录与参考试验修订目录。项目、场地、点位、层、材料、推导运行、源行和试验修订逐项比对；跨范围、源行不属于冻结运行、试验修订不存在/被替换或其他来源失效均拒绝。
- 文献中的 `10-20`、敏感黏土较低值、裂隙超固结黏土 `20-30` 都是材料和模式相关信息，不作为软件隐藏 clamp。
- 敏感黏土、裂隙超固结黏土或任何不满足 `soft_firm_nc_loc_intact_clay` 的陆相/海相黏土不能使用文献起始假设 `12`，但允许使用有依据的用户假设或场地校准值。
- 有机黏土和胶结黏土不在本版来源范围，首版不生成值。

### 5.3 数值与适用性门槛

必须同时满足：

1. `qnetKpa` 为有限数且 `>0`。
2. 目标层工程土类为 `clay`。
3. `Nkt` 设置对象满足上方来源合同。
4. `PenetrationRateEvidenceV1` 为 `standard_confirmed + 20 mm/s`。
5. `DrainageApplicabilityEvidenceV1` 为 `confirmed_undrained` 或有修订的 `resolved_conflict`；仅有 `Ic` 不够。
6. 测试及材料证据支持黏土中的不排水贯入解释。
7. 材料不属于本版明确排除的有机或胶结黏土。

`IcRW <= 2.60` 不自动删除已有独立依据，但必须先形成联合冲突并停止当前有效值；产生覆盖当前冲突、且解决方向为不排水的 `resolved_conflict` 修订后，才允许计算并生成 `SucIcScreenConflict` 提示。`IcRW` 缺失时，若 `qnet` 与独立不排水依据完整，允许计算并生成 `SucIcScreenUnavailable` 提示。没有独立不排水依据时，无论 `IcRW` 多大，都以 `SucUndrainedBasisMissing` 停止运行。

### 5.4 状态和恢复

| Reason code | 用户状态 | 数值 | 恢复动作 |
| --- | --- | --- | --- |
| `SucValid` | 有效 | 有 | 查看来源或结果 |
| `SucMissingQnet` / `SucNonFiniteQnet` / `SucNonPositiveQnet` | 输入存在问题 | 无 | 返回前置输入或数据导入 |
| `SucUndrainedBasisMissing` | 缺少不排水贯入依据 | 无 | 补充 CPTU/场地证据或带说明确认 |
| `SucDrainageResolutionMismatch` | 冲突解决方向不是不排水 | 无 | 重新核验并形成正确方向的解决修订 |
| `DrainageEvidenceSuperseded` | 排水确认早于当前冲突 | 无 | 基于当前冲突重新确认 |
| `SucIcScreenConflict` | Ic 筛选与不排水依据冲突 | 有，带提示 | 复核证据、土层或范围 |
| `SucIcScreenUnavailable` | Ic 筛选不可用 | 有，带提示 | 查看独立不排水依据或修复前置输入 |
| `SucLayerGroupMismatch` | 工程土类与方法不一致 | 无 | 返回地层分层或调整槽范围 |
| `SucRateBasisMissing` | 缺少标准速率依据 | 无 | 补充点位元数据或显式确认 |
| `SucKnownNonstandardRate` | 已知为非标准速率 | 无 | 更换方法版本或重新评估试验 |
| `SucInvalidNkt` | 方法参数存在问题 | 无 | 输入有限正数并补依据 |
| `SucNktBasisMissing` | Nkt 缺少依据 | 无 | 选择文献假设或记录校准证据 |
| `SucNktConfirmationMissing` | Nkt 确认记录不完整 | 无 | 补确认时间和来源修订 |
| `SucCalibrationEvidenceIncomplete` | 场地校准证据不完整 | 无 | 补齐匹配数据对、模式和统计修订 |
| `SucCalibrationScopeMismatch` | 校准范围与本次点位/层/材料不一致 | 无 | 选择匹配校准或重新校准 |
| `SucCalibrationSourceStale` | 校准引用的推导或试验修订已失效 | 无 | 基于当前来源重建校准修订 |
| `SucDefault12NotEligible` | 当前材料不能使用默认 12 | 无 | 提供场地校准值或换方法 |
| `SucUnsupportedStrengthMode` | 当前方法不支持该剪切模式 | 无 | 改用三轴压缩参考模式或其他方法版本 |
| `SucMaterialOutsideSource` | 材料不在来源范围 | 无 | 更换方法 |
| `SucLiteratureAssumptionUncalibrated` | 使用未校准文献假设 | 有 | 保留提示或补校准证据 |
| `SucUserDefinedAssumptionUncalibrated` | 使用用户未校准假设 | 有 | 保留依据或补场地校准 |

### 5.5 联合冲突先于方法推荐

以下情况先创建 `SoilClassBehaviorScreenConflict`，不得直接推荐另一个方法：

- 工程土类为 `sand`，但 `IcRW >= 2.60` 或独立排水证据冲突。
- 工程土类为 `clay`，但 `IcRW <= 2.60` 或独立不排水证据冲突。

未解决时两种方法都不产生当前有效值。恢复入口同时展示原始 CPTU/孔压、速率证据、材料分类、地层边界和槽范围。用户解决冲突会形成独立修订；只有解决方向与当前方法一致且明确覆盖当前冲突修订时才继续，`φ′p` 仍必须满足来源硬条件 `IcRW < 2.60`。

联合门采用正交验收：工程土类与 `Ic`、工程土类与独立排水证据、显式 `conflict` 状态分别单独触发；实现不能只检查其中任意一项。联合 reason code 优先于任何方法级“换方法”建议。

## 6. 页面需要新增的功能模块

G1B/G2 不应只增加两个公式函数。完整页面承接需要：

| 用户动作 | 功能模块 | 页面位置 |
| --- | --- | --- |
| 了解结果含义 | 结果定义、公式、版本、页码 | 右侧方法工具 |
| 确认适用范围 | 工程土类、IcRW、材料类别、测试速率 | 右侧适用性区 |
| 配置 Su | Nkt 值、来源、目标剪切模式、校准证据 | 右侧方法设置 |
| 发现问题 | 稳定 reason code、影响深度、责任对象 | 中间问题标签 + 右侧问题工具 |
| 修复问题 | 返回导入、分层、范围或设置 | 每个问题唯一恢复动作 |
| 查看结果 | 峰值/三轴压缩限定、逐行状态、提示 | 曲线、逐深度表、层统计 |
| 比较运行 | 方法版本、范围、Nkt 来源和适用性一致性 | 比较工具 |

任何参数运行都必须显示“当前公式输出的是什么”，不能只显示一个无上下文的 `φ′` 或 `Su` 数值。

## 7. 事件矩阵

```text
Event: exact IcRW boundary 2.60 for φ′p
Detection: computed IcRW === 2.60 before display rounding
User-facing state: 位于排水过渡边界
Available actions: inspect evidence, revise layer/range, choose another method
Disabled actions: produce φ′p for the row
Recovery path: stratification or parameter scope
Acceptance evidence: φ′p exact-boundary golden vector and visible reason code; suc conflict vector remains calculable only with independent undrained evidence
```

```text
Event: Nkt=12 requested outside eligible material/mode
Detection: materialClass or targetStrengthMode does not match the source condition
User-facing state: 当前材料不能使用文献起始假设 12
Available actions: provide site calibration, change method, exclude scope
Disabled actions: run with hidden or automatic 12
Recovery path: method settings
Acceptance evidence: invalid golden vector and unchanged canonical scheme
```

```text
Event: mathematically valid but outside source range
Detection: finite Qtn <=20 or >=400, or material outside source scope
User-facing state: 超出方法来源范围
Available actions: inspect source, change method, exclude scope
Disabled actions: create a numeric result for the row
Recovery path: method or scope
Acceptance evidence: boundary vectors and zero result value
```

```text
Event: engineering soil class conflicts with Ic/drainage evidence
Detection: joint applicability gate before either method
User-facing state: 工程土类与行为筛选存在冲突
Available actions: inspect CPTU/pore pressure/rate/material/layer boundary/scope; record resolution
Disabled actions: run either method while unresolved; directly recommend the opposite method
Recovery path: evidence review, stratification, or parameter scope
Acceptance evidence: sand-direction and clay-direction conflict vectors plus immutable resolution revision
```

## 8. Golden vectors

机器可读向量位于：

`sample_data/parameters/parameter-methods-g1b-golden.v1.json`

JSON 使用 `non-finite-number.v1` 编码非有限输入：

```json
{
  "encodedNonFinite": {
    "field": "qtn",
    "kind": "NaN"
  }
}
```

- `kind` 只允许 `NaN | PositiveInfinity | NegativeInfinity`。
- 被标记的数值字段必须完全缺席，不能同时写 `null` 或普通数值。
- 测试 oracle 先解码 marker，再进入领域判断；字段缺席仍表示 missing，二者不可混同。
- 未知 marker、重复字段或非白名单 kind 使 golden 文件校验失败。

要求：

- `φ′p` 数值由 PowerShell `System.Math.Log10` 独立生成，不调用未来生产实现。
- `suc` 使用独立除法向量。
- 覆盖来源区间内值、两端邻近值、精确边界、`IcRW=2.60`、联合冲突、错误土类、速率缺失/非标准、排水证据缺失、材料范围未知、场地校准证据不完整、无 Nkt 依据、默认 12 不合格、零值和非有限语义。
- 数值 oracle 容差固定为 `1e-12`；状态和 reason code 必须精确匹配。
- JSON 本身只提供可复算 oracle；生产实现授权来自用户对 G1B 实现确认卡的明确确认，并已记录在本合同状态与 Process066 中。

## 9. 实现闭环

G1B 已获用户明确确认，并依据本合同进入生产领域代码并完成门禁：

1. 公式复查核对了页码、变量、单位、对数底数、输出定义和来源范围。
2. 领域复查核对了排水边界、材料范围、`Nkt` 模式、作用域、不可变历史和恢复规则。
3. 测试复查独立检查了 74 条 golden vectors、42 个稳定 reason codes 和 17 个数值 oracle。
4. 参数领域、持久化、构建和全量 Playwright 回归通过，最终 P0/P1 全部关闭。

实现仍只代表可追溯的参数试算领域，不代表正式工程采用、成果批准或正式导出。

本地完整性威胁模型：所有正常产品写入必须经过 CAS 与 append-only 保存门，加载会拒绝 manifest 单侧损坏、摘要缺失或不匹配。由于 manifest 与摘要均位于浏览器同源存储，本原型不声称能抵抗可同时改写两者的同源恶意代码；该能力需要浏览器之外的可信锚点或服务端签名。
