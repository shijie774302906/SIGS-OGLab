# 参数解译 G1D 受限自定义公式合同

日期：2026-07-11  
状态：`用户已确认 / 安全与交互合同冻结 / 实现中`

## 1. 用户任务

```text
当前参数方案精确修订 + 已完成前置推导 + 已提交分层修订
-> 新建公式草稿
-> 定义名称 / 符号 / 单位 / 结果范围 / 目标层
-> 从白名单变量和函数构造表达式
-> 验证 AST、变量、单位声明和样例行
-> 提交不可变公式修订
-> 运行 / 取消 / 重跑
-> 在 G2 共享深度轴查看曲线、行、层统计、问题和历史
```

自定义公式不会覆盖或伪装为内置 `φ′p/suc`，也不自动成为正式采用结果。

## 2. 表达式安全合同

解析器：`jsep@1.4.0` 只生成 AST；本项目使用自己的白名单解释器，不调用 `eval`、`Function` 或 jsep 求值插件。

允许节点：

- `Literal`：仅有限数值。
- `Identifier`：仅合同变量或常量。
- `UnaryExpression`：`+`、`-`。
- `BinaryExpression`：`+`、`-`、`*`、`/`、`%`、`^`。
- `CallExpression`：callee 必须是直接白名单函数标识符。

明确拒绝成员/属性访问、可选链、数组、对象、字符串、模板、正则、赋值、更新、序列、条件、逻辑、比较、位运算、方法调用、动态函数名、用户函数、循环、递归及任何浏览器/网络/存储 API。

复杂度上限：表达式长度 `<= 512`，AST 节点 `<= 128`，嵌套深度 `<= 24`，函数参数按定义精确校验。

## 3. 白名单

| 变量 | 含义 | 单位 | 空值规则 |
| --- | --- | --- | --- |
| `depthM` | 深度 | m | 不为空 |
| `qc` | 原始锥阻 | kPa | 空值传播 |
| `qt` | 修正锥阻 | kPa | 空值传播 |
| `qnet` | 净锥阻 | kPa | 空值传播 |
| `fs` | 侧摩阻 | kPa | 空值传播 |
| `u2` | 孔压 | kPa | 空值传播 |
| `Qtn` | 归一化锥阻 | 无量纲 | 空值传播 |
| `IcRW` | 软件筛选行为指数 | 无量纲 | 空值传播 |

常量：`pi`、`e`。

函数：单参数 `abs/sqrt/ln/log10/exp/floor/ceil/round`；双参数 `min/max/pow`；三参数 `clamp(value,min,max)`。

任一变量为空时该行结果为空，reason 为 `输入缺失`；不做零填充。除零、负数开方、非正数对数、溢出和非有限结果均为行级问题，不中断其他行。

## 4. 对象生命周期

```text
CustomFormula: working -> current -> history/stale/deleted
CustomFormulaRevision: immutable, exact parameterSchemeRevisionId + derivationRunId + stratificationRevisionId
CustomFormulaRun: queued -> running -> completed/failed/cancelled/invalidated
```

公式集合支持新建、选择、编辑、提交、复制、重命名、软删除、恢复和查看旧修订。终态运行追加保留；切换公式、修订、页面或来源行前必须处理 dirty 草稿。

## 5. 验证与结果合同

- 提交前必须通过结构验证；结构错误不会创建公式修订。
- 结果单位由用户显式声明并显示“用户声明单位”，不做未经证明的自动量纲推导。
- 结果范围可选；超范围值保留为问题值，不进入当前可用曲线和层均值。
- 目标层之外状态为 `非目标层`，不绘制结果曲线。
- 运行冻结公式 AST/文本、变量、目标层、范围、单位、来源修订和输入行快照。
- 同一命令与输入幂等；取消不保留部分结果；旧终态不会被重跑覆盖。

## 6. 页面合同

- 右侧顶部分段：`内置方法 / 自定义公式`。
- 公式模式依次承接公式集合、定义编辑、变量/函数插入、验证、运行记录和选中运行依据。
- 中心沿用 G2 的曲线、数据行、层统计和问题详情，不创建第二套图表系统。
- 自定义结果使用蓝色 `#35b0f5`；内置有效结果继续使用绿色 `#2abf9a`；紫色 `#bdadff` 保留选中和主动作；问题使用 `#fe92a1`。
- 页面只出现一个紫色主动作。

## 7. Event Matrix

```text
Event: 表达式结构不允许
Detection: AST 白名单 / 长度 / 节点 / 深度 / 参数个数失败
User-facing state: 公式存在问题，显示具体原因
Available actions: 编辑表达式、插入允许变量或函数
Disabled actions: 提交公式、运行
Recovery path: 右侧公式编辑器
Acceptance evidence: 未知变量、属性访问、字符串和错误参数数目均被 UI 拒绝
```

```text
Event: 行级数值问题
Detection: 缺值、除零、域错误、非有限或超出声明范围
User-facing state: 曲线断开；数据行和问题详情保留原因
Available actions: 检查公式、目标层或来源行
Disabled actions: 把问题值显示为当前可用结果
Recovery path: 公式编辑器或数据导入来源行
Acceptance evidence: 正常行继续计算，问题行不被补零或连线
```

```text
Event: 上游参数或分层修订变化
Detection: exact revision lineage mismatch
User-facing state: 旧公式和运行只读保留，当前运行禁止
Available actions: 查看历史、基于最新来源复制公式
Disabled actions: 用旧公式修订创建当前运行
Recovery path: 基于最新来源创建新公式草稿并重新提交
Acceptance evidence: stale Flow 保留旧曲线并生成新修订
```

## 8. 验收

1. 独立 oracle 验证优先级、函数、空值传播和异常数值；不调用生产解释器生成期望值。
2. 安全测试拒绝属性访问、动态调用、数组、字符串、未知函数/变量和超复杂表达式。
3. 随机 CSV 真实上传 Flow 完成公式新建、验证、提交、运行、曲线、行、层统计和刷新。
4. 独立 Flow 覆盖错误、取消、dirty、历史修订、stale、删除恢复和来源行定位。
5. 保存公式文本、随机输入、run JSON、`1440x900` / `1920x1080` 截图、console/page error 与溢出检查。
6. 最终视觉、公式/领域、信息架构三轨均为 `P0=0 / P1=0`。
