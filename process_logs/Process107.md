# Process107 - 参数问题诊断、局部忽略与分层一致工作台

Date: 2026-07-16

Status: `closed / implemented / verified / independently reviewed`

## Scope

- 将参数列表中的“待处理 / 存在问题”改为可点击诊断入口，显示具体原因、影响范围、责任位置和固定处理选项。
- 少量相关式适用域异常可在参数试算阶段局部忽略，不再强制返回数据检查并重做分类、分层。
- 参数曲线和层代表值严格引用当前最终分层修订，统一砂性土、混合土、黏性土颜色。
- 收紧中央结果布局，折叠高级设置，未选择 Ch/kh 时隐藏孔压消散导入表单。

## Engineering Rules

- 局部忽略仅作用于本次参数试算，不修改原始测量、检查、JTS 分类或最终分层。
- 领域层强制复验累计忽略：适用值不少于 50、累计比例不超过 2%、每层比例不超过 5%、每个受影响层至少保留 5 个有效值、连续不超过 3 行且连续跨度不超过 0.10 m。
- 不满足门槛时禁止局部忽略；用户仍可选择本次整项不计算或取消后检查参数条件。
- 原始文件、列映射、单位、解析和非有限输入问题返回数据检查；qnet、Fr、Ic 等相关式适用域问题留在参数阶段处理。
- 被忽略的参数值在曲线中形成真实断点，不补零、不跨缺口连线。

## Implementation

- `src/features/parameters/parameterIssueDiagnosis.ts`
  - 结构化诊断、动态标题、责任位置和领域安全评估。
- `src/features/parameters/jtsParameterPackageDomain.ts`
  - 冻结行级忽略决定并在运行领域层强制复验。
- `src/features/parameters/ParameterWorkbenchDocument.tsx`
  - 问题弹窗、局部忽略、整项不计算、曲线断点、审计记录和分层三色。
- `src/features/stratification/layerSimplificationDomain.ts`
- `src/features/stratification/stratificationDomain.ts`
  - 修正大类合并及后续土类确认时名称、工程大类、组成和颜色状态漂移。
- `src/App.tsx`
  - 原位重跑、参数向导入口、默认折叠高级设置和孔压消散渐进披露。

## Verification

- `npm.cmd run build` - passed.
- `npm.cmd run test:e2e -- tests/e2e/jts-parameter-package.spec.ts tests/e2e/parameter-guided-workflow-ui.spec.ts tests/e2e/jts-parameter-package-ui.spec.ts tests/e2e/stage8-no-u2-output.spec.ts tests/e2e/jts-dissipation-ui.spec.ts --project=chromium --reporter=line` - 17/17 passed.
- `npm.cmd run test:e2e -- tests/e2e/layer-simplification-domain.spec.ts --project=chromium --reporter=line` - 16/16 passed.
- `npm.cmd run test:e2e -- tests/e2e/stratification-workflow-ui.spec.ts --project=chromium --reporter=line -g "PROCESS105"` - 1/1 passed.
- `PROCESS107_EVIDENCE=1 ... parameter-guided-workflow-ui.spec.ts` - 3/3 passed, 1440x900 and 1920x1080 evidence refreshed.
- `PROCESS107_EVIDENCE=1 ... yingkou-real-workflow.spec.ts -g "FLOW-G5-01"` - 1/1 passed with real Yingkou workflow, output and reload.
- `npm.cmd run test:e2e -- --project=chromium --reporter=line` - 283/283 passed.

## Review

- Visual Layout Taste Auditor: PASS, no P0/P1.
- Geotechnical Domain Reviewer: PASS after safety-gate hardening, no P0/P1.
- Copy / IA Mobbin Challenger: PASS after title, consequence, progressive-disclosure and duplication fixes, no P0/P1.

## Evidence

- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-issue-1440x900.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-issue-1920x1080.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-local-ignore-1440x900.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-local-ignore-1920x1080.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-local-result-1440x900.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/parameter-local-result-1920x1080.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/yingkou-parameter-multilayer-1440x900.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/yingkou-parameter-multilayer-1920x1080.png`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/browser-check.json`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/yingkou-parameter-check.json`
- `process_logs/playwright-mcp/process107-parameter-diagnosis/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process107.json`

## Boundaries

- 结果仍为参数试算，不代表正式工程采纳。
- 未新增或修改 JTS 公式、正式持久化后端或正式成果采纳。
- 砂性土层内部按行级细分类选择相关式的高级说明留待后续独立切片。
