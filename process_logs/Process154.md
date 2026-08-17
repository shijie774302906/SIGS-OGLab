# Process154 - 国内正式站版本统一与可追溯发布

Date: 2026-08-18

Status: `closed / implemented / verified / ready for deployment`

## Goal

以 `sigs-oglabx.com` 为国内正式入口，将主分支中已经验证的专业解译、快捷出图、CloudBase 服务、首次使用指引和中文手册统一为一份可追溯发布候选，同时排除独立 AI 实验室、私有工程数据、密钥和临时产物。

## Result

- 国内发布候选保留“使用当前分层”、安全回退、快捷输入/图册等既有流程；没有修改 CPT/CPTU 工程公式、分类算法、原始测量或既有计算结果。
- 专业解译的项目、导入、检查、地层、参数和成果六页分别具有桌面端首次指引；每页状态独立，可跳过、关闭并从侧栏重播。
- 专业助手与快捷图册助手共用安全 Markdown 渲染器；标题、列表、表格、代码和链接可读，原始 HTML 与脚本不执行。
- 中文使用手册已镜像到同源 `/help/`，首页和专业导入深链可直接刷新，不依赖 GitHub Pages。
- CloudBase 发布结构包含静态站、API、PostgreSQL 配额/访问统计和备案信息；正式构建明确排除独立 AI 实验室。
- 增加发布 manifest、国内站一致性门禁、手册镜像校验、CloudBase 预检和脏工作树拦截。
- 回归中发现并修复两个兼容问题：旧帮助测试仍写死境外手册地址；移动端快捷出图的浮动备案入口造成按钮遮挡。

## Verification

- `npm.cmd run build:release`: passed；正式构建包含 `dist/release-manifest.json` 和 `dist/help/`。
- `npm.cmd run test:assistant-server`: 45/45 passed。
- `npm.cmd run test:domain-fast`: 272/272 passed。
- `npm.cmd run test:ui-isolated`: 144/144 passed。
- `npm.cmd run test:real-serial`: 26 passed；2 个可选公开 GoG 6 外部样本测试因本机未提供样本而 skipped。
- Process154 专项：3/3 passed；专业六页独立指引、安全 Markdown、同源手册深链通过。
- “使用当前分层”与安全回退专项：4/4 passed；参数问题说明与局部忽略：2/2 passed。
- `npm.cmd run cloudbase:preflight`: 16/16 passed。
- `npm.cmd run release:parity -- --allow-dirty`: 16/16 passed。
- Release audit：0 errors；4 个非本轮阻断警告为 package private、尚未选择开源许可证及超大源文件维护成本。
- 双分辨率：1440x900、1920x1080 均无横向溢出，指引卡位于视口内，浏览器错误为 0。

## Boundaries

- 本切片未发布独立 AI 实验室，也未改变专业 AI 的只读/受控写入权限。
- 本切片未加入营口或其他私有工程数据、DeepSeek/API 密钥、`.env`、Process149 临时页面或本机测试产物。
- 当前状态为“已验证、可部署”；CloudBase 正式流量切换和线上运行时复核需在发布候选提交后执行。
- 开源许可证与 Git 历史清洗仍属于公开源码前的独立决策，不在本切片内擅自处理。

## Evidence

- `process_logs/playwright-mcp/process154-production-parity/evidence-manifest.json`
- `process_logs/playwright-mcp/process154-production-parity/browser-check.json`
- `process_logs/playwright-mcp/process154-production-parity/professional-project-guide-1440x900.png`
- `process_logs/playwright-mcp/process154-production-parity/professional-project-guide-1920x1080.png`
- `process_logs/knowledge-reviews/Process154.json`
- `process_logs/release-readiness/Process154-final.json`

## Known Problems Covered

- KPB-002, KPB-003, KPB-004, KPB-006, KPB-011, KPB-012
- KPB-016, KPB-020, KPB-023, KPB-033, KPB-034, KPB-037
