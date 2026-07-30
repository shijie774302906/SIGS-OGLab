# Process108 - 参数异常点强制忽略与硬完整性门禁

Date: 2026-07-17

Status: `closed / implemented / verified / independently reviewed`

## Scope

- 保留参数局部忽略的建议门槛，用于告诉工程师本次决定是否处于系统推荐范围。
- 对超过建议门槛、但仍保有工程有效性的参数点，提供“查看风险并继续”和二次确认后的强制忽略。
- 强制忽略仅作用于当前参数方法试算，不修改原始测量、数据检查、JTS 分类或最终地层分层。
- 在摘要、方法审计和完成提示中明确标识强制忽略，保留超限原因、原始失败原因、来源行、深度和确认时间。

## Engineering Rules

- 适用值数量、累计比例、层内比例、层内保留值、连续行数和连续深度跨度属于建议门槛，可由工程师在明确风险后强制绕过。
- 任一受影响层没有其他有效值、来源行无法对应、深度或原始失败原因变化属于硬完整性错误，普通和强制忽略均不可绕过。
- 领域层根据当前权威数据重新计算超限条件，不信任界面或调用方传入的风险说明。
- 被忽略值形成真实曲线断点，并从该方法的层代表值中排除；其他有效值继续计算和绘制。
- 快速重复确认只生成一个参数包。

## Implementation

- `src/features/parameters/parameterTypes.ts`
  - 为忽略决定增加强制标记、权威超限条件和强制确认时间。
- `src/features/parameters/parameterIssueDiagnosis.ts`
  - 分离建议门槛与硬完整性约束，并返回可强制状态、具体超限项和不可绕过原因。
- `src/features/parameters/jtsParameterPackageDomain.ts`
  - 普通忽略继续执行建议门槛；强制忽略仅绕过建议门槛，并由领域层重新生成审计条件。
- `src/features/parameters/ParameterWorkbenchDocument.tsx`
  - 增加简短的风险查看、返回、数据检查入口和二次确认；结果摘要与审计区明确区分强制忽略。
- `src/App.tsx`
  - 原位生成新的参数试算包和成果声明，不重跑分类或分层。
- `tests/e2e/jts-parameter-package.spec.ts`
  - 覆盖门槛内、门槛外、连续区间、整层零有效值、跨层硬约束和伪造审计条件。
- `tests/e2e/parameter-guided-workflow-ui.spec.ts`
  - 覆盖取消、关闭、返回、双击防重、强制确认、曲线断点、刷新持久化和上游权威不变。

## Verification

- `npm.cmd run build` - passed.
- `npm.cmd run test:tiers:audit` - 62 个 spec 全部归入固定测试层。
- `npm.cmd run test:domain-fast` - 183/183 passed.
- `npm.cmd run test:ui-isolated` - 75/75 passed.
- `npm.cmd run test:real-serial` - 29/29 passed，包含营口真实数据完整流程。
- Process108 目标领域与 UI 用例 - 5/5 passed.
- `1440x900` 与 `1920x1080` 风险确认、结果和审计截图通过；`browser-check.json` 无页面错误、控制台错误或横向溢出。

## Review

- Visual Layout Taste Auditor: PASS，无 P0/P1。
- Geotechnical Domain Reviewer: PASS，无 P0/P1；完成提示已补充强制忽略复核声明。
- Copy / IA Mobbin Challenger: PASS，无 P0/P1/P2。

## Evidence

- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-confirm-1440x900.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-confirm-1920x1080.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-result-1440x900.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-result-1920x1080.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-audit-1440x900.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/forced-ignore-audit-1920x1080.png`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/browser-check.json`
- `process_logs/playwright-mcp/process108-forced-parameter-ignore/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process108.json`

## Boundaries

- 强制忽略不是数据修复，也不代表正式工程采纳。
- 本轮不新增批量强制忽略、批量删除、正式后端或正式成果保存。
- 原始上传、检查记录、JTS 分类和最终分层保持不变。
