# Process138 - 本地公开前全面质量审查与整改

Date: 2026-07-30

Status: `closed / implemented / verified / independently reviewed`

## Goal

在上传 GitHub 或公网部署前，对 SIGS-OGLab 的完整本地产品做发布级质量审查；覆盖功能、前端、AI 代理、持久化、导出、集成、安全与冗余代码，修复 P0/P1 并建立可重复执行的发布门禁。

## Result

- 建立 `release:audit`，检查敏感文件、生产依赖图、TypeScript 未使用声明、公开元数据、许可证和真实样本公开依据。
- 删除 59 个经生产依赖图、TypeScript 和回归共同证明不可达的顶层声明；生产入口当前 68 个模块可达、0 个孤立模块。
- 启用 `noUnusedLocals` 与 `noUnusedParameters`，修复依赖漏洞并保持生产/全部依赖审计 0 漏洞。
- 将数据导入页收敛为唯一“AI 整理数据”入口；AI 外发同意绑定当前工程、点位、来源或图册的 authority hash。
- 参数向导和计算统一读取工程师最终确认分层；修正 N/N60、Es/M、JTS 标准名称、公式单位和外部方法来源。
- Fuzzy、Modified Robertson 2016、Schneider 2008 明确标为“研究性对照”，不冒充已完成独立工程复核的正式权威。
- 补齐 README、SECURITY、环境示例、静态部署与公网 AI 边界说明；浏览器标题及空项目状态与产品一致。
- 建立 Chrome/Edge 双分辨率、WebKit、真实 DeepSeek、真实营口/SCPT1 和最终证据闭环。

专业边界：

- 计算仍以确定性工程实现为权威；AI 只读取、整理或形成待确认提案。
- 参数适用性以工程师最终确认分层为准，逐行分类差异保留为审计证据。
- 三种替代分类方法当前仅用于研究性对照；后续仍需独立方法合同和外部黄金样例。
- 本地技术门禁通过不等于允许公开分发。

## Verification

- `npm.cmd run build`：通过。
- assistant server：24/24。
- 真实 DeepSeek `deepseek-v4-pro`：连接、专业只读工具和快捷导入结构化提案通过。
- domain-fast：260/260。
- ui-isolated：120/120。
- real-serial：32/32。
- 分层产品回归：412/412。
- closure verification：75/75 spec 文件；所有命令退出码为 0。
- Chrome、Edge：1440×900 与 1920×1080 通过。
- WebKit：1440×900 通过。
- Firefox：当前 Windows 主机在进入应用前发生 SWGL framebuffer 初始化失败；未形成产品失败或通过结论。
- npm production/all audit：0 vulnerabilities。
- Known Problem Gate：14 个重要问题均 covered，1 个提示已记录。
- Visual、professional domain、copy/security 三类只读 Agent：PASS。

机器结果：

- `process_logs/verification/Process138-closure.json`
- `process_logs/Process138-release-audit.json`
- `process_logs/Process138-quality-review.md`
- `process_logs/knowledge-reviews/Process138.json`

## Evidence

- Directory: `process_logs/playwright-mcp/process138-release-readiness`
- Final manifest: `process_logs/playwright-mcp/process138-release-readiness/evidence-manifest.json`
- `browser-check.json` 记录浏览器、溢出、错误、核心页面、AI 权限及 412 项回归总数。
- 最终代码绑定截图覆盖空项目、导入 AI 单入口、第二工程重新授权、AI 待确认提案。
- 核心页面截图覆盖数据检查、地层分层、参数解译、成果输出和快捷图册。

## Publication Hold

公开 GitHub 或公网部署前必须处理：

1. 由维护者选择许可证并加入 `LICENSE`；确认是否保留 `private: true`。
2. 移除 `sample_data/source/yingkou` 的真实 XLSX，或补齐数据所有者许可、脱敏记录及 `PUBLIC-DISTRIBUTION` 记录。
3. 若公开 AI 功能，部署同源 HTTPS `/api/assistant` 反向代理，并配置允许来源、限流、超时、日志和运维边界。

因此本 Process 的本地技术结论为 PASS，GitHub 公开状态为 HOLD。

## Known Problems

- KPB-001
- KPB-002
- KPB-004
- KPB-006
- KPB-007
- KPB-008
- KPB-009
- KPB-011
- KPB-012
- KPB-015
- KPB-016
- KPB-020
- KPB-021
- KPB-023

## Deferred P2

- 拆分 `App.tsx`、`styles.css` 和主 JS 包。
- 在可用的 Firefox 图形环境补跑兼容性冒烟。
- 为三种研究性对照分类方法建立独立合同和外部黄金样例。
- 优化 1440 宽度下的分层轨道空间及宽屏空状态留白。
