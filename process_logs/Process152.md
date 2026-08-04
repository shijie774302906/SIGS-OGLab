# Process152 - 已验证更新的安全生产发布

Date: 2026-08-04

Status: `closed / verified / deployed`

## Goal

把 Process147、Process148、Process150、Process151 的已验证主产品更新发布到 GitHub 私有仓库与 Vercel Production，并明确排除临时展示页、私有工程数据、密钥和本机产物。

## Result

- 建立机器可读的 `docs/process/release-index.json`，明确本次上线、排除项、禁入文件和生产目标。
- 发布图册可读性与向导安全回退、使用当前分层、分层来源一致性修复和专业成果物理字号。
- Process149 临时领导展示页、营口私有数据、密钥、`.env` 与本机临时产物均未进入发布提交。
- GitHub `main` 更新至 `f5ffc53`，Vercel Production 已绑定 `https://sigs-oglab.com`。
- 修正发布验收误复用其他工作区 5173 服务的问题，最终回归全部使用发布候选独立端口。

## Verification

- `npm.cmd run build`：通过。
- `npm.cmd run test:assistant-server`：41/41 通过。
- `npm.cmd run test:domain-fast`：272/272 通过。
- `npm.cmd run test:ui-isolated -- --workers=3`：141 通过，3 个外部/私有样本跳过。
- `npm.cmd run test:real-serial`：26 通过，8 个外部/私有样本跳过。
- `npm.cmd run release:audit -- --mode local`：0 errors；仓库保持私有且尚未选择许可证，因此公开发布类提示保留为 warning。
- 正式域名、AI 能力接口和访问统计接口均返回 200。
- 1440×900、1920×1080 线上检查无横向溢出、无 console/page error。

## Evidence

- `process_logs/playwright-mcp/process152-production-release/browser-check.json`
- `process_logs/playwright-mcp/process152-production-release/home-1440x900.png`
- `process_logs/playwright-mcp/process152-production-release/home-1920x1080.png`
- `process_logs/playwright-mcp/process152-production-release/evidence-manifest.json`
- `process_logs/release-audit-Process152.json`
- `process_logs/knowledge-reviews/Process152.json`

## Boundaries

- GitHub 仓库保持私有；本次不选择开源许可证。
- 不发布营口或其他私有工程源数据。
- 不发布 Process149 `/leadership/` 临时展示页。
- 不在发布切片中修改工程算法。
