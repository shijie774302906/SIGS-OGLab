# Process153 私有数据与临时产物安全清理

- Date: 2026-08-04
- Status: implemented / verified / pending deployment
- Goal: 从公开发布候选中移除私有工程数据、派生样例、密钥、本机临时产物和 Process149 临时页面，并建立持续拦截。

## Result

- 删除营口派生分层、参数和方法输入样例，以及依赖私有文件的专属测试与参考说明。
- 新增完全合成的通用 CPTU 工作流样例，承接前端运行时、测试和方法实验输入。
- 删除原开发工作区中的 `mishi.md`、`.env.local`、原始营口工作簿与可再生成 Playwright/Vercel 产物；保留 `.env.example`、Vercel 项目绑定和精选历史证据。
- `.gitignore`、`.vercelignore` 与发布索引禁止私有原始文件、营口派生文件、Process149 页面/测试/证据和环境密钥进入发布候选。
- 发布审计新增正则路径拦截，并用测试证明私有派生文件即使位于其他样例目录也会失败。
- 删除已失效的私有测试引用，知识库新增 KPB-037，防止“原始文件已排除但派生数据仍进前端包”再次发生。

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run process:test`: 14/14 passed.
- `node --test scripts/release-readiness.test.mjs`: 7/7 passed.
- `npm.cmd run test:assistant-server`: 41/41 passed.
- `npm.cmd run test:domain-fast`: 272/272 passed.
- UI isolated suite: 140 passed；1 项并行时序失败随后在独立端口单独复跑 1/1 passed，属于既有并行隔离波动。
- Real serial suite: 26 passed；2 项公开 GoG6 条件测试因本机未提供公开参考文件而 skipped；不再包含私有工程案例。
- `git ls-files`、运行源码与 `dist` 私有名称/密钥扫描：passed；唯一保留的环境文件为 `.env.example`。
- Release audit: 0 errors；剩余警告为 package private、未选择开源许可证和超大源文件，与本切片删除目标无关。

## Git History Boundary

- 当前发布树和生产构建不再包含上述私有对象。
- 旧开发分支/提交历史仍可能包含曾经提交的原始或派生样例。Process153 未重写 Git 历史；公开仓库前必须单独确认是否执行历史清洗，避免在未经确认的情况下改变所有提交和远端引用。

## Evidence

- `process_logs/release-audit-Process153.json`
- `process_logs/knowledge-reviews/Process153.json`
- `process_logs/playwright-mcp/process153-private-data-cleanup/evidence-manifest.json`
- `process_logs/playwright-mcp/process153-private-data-cleanup/browser-check.json`
