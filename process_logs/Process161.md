# Process161 - 双站图册可读性发布

Date: 2026-08-18

Status: `closed / verified / deployed`

## Goal

把 Process159/160 已验证的快捷 AI 协商导入与图册可读性改进，以同一构建发布到国际站 `sigs-oglab.com` 与国内站 `sigs-oglabx.com`。

## Result

- 两站均发布 `Process161 / b630d7fc812439d6c24f01fd6dfc6232e01f4c76`，Release Manifest 功能清单一致。
- 国内 CloudBase 静态托管直接上传本地已验收 `dist`，101/101 文件成功；国际站通过 GitHub `main` 触发 Vercel 生产发布。
- Process159 自由协商导入和 Process160 图册 11 pt 图例、长图例换行、标题留白与长层名处理现已上线。
- 两站 capabilities 均包含 `sigs.ai-import/2`，访问统计接口均为 `ready`。

## Verification

- `npm.cmd run build:release`: passed。
- `npm.cmd run release:audit`: 0 errors；既有许可证、package private 和超大源文件警告不影响本次发布。
- `npm.cmd run release:parity`: 16/16 passed。
- `npm.cmd run cloudbase:preflight`: 16/16 passed。
- `npm.cmd run test:assistant-server`: 45/45 passed。
- 双站双分辨率线上 Playwright：4/4 passed；均完成快捷项目创建、合成数据粘贴、缺失 fs 保留、图册生成与 Excel 下载。
- 1440×900、1920×1080 的横向溢出为 0，浏览器错误为 0。
- 国际站首次 TLS/首页加载曾因跨境线路超时失败；重试后在同一流程恢复并通过，旧版和已发布产物均未受损。
- Process160 的 15 页快捷图册与专业 A4/A3 逐页视觉证据绑定同一源提交祖先，线上 manifest 绑定本次部署提交。
- Known Problem Gate: KPB-004、KPB-011、KPB-037 均 covered。

## Deployment

- Release source: `b630d7fc812439d6c24f01fd6dfc6232e01f4c76`。
- International: `https://sigs-oglab.com`，Vercel production。
- Mainland: `https://sigs-oglabx.com`，CloudBase static hosting。
- Rollback: Vercel 上一稳定部署、CloudBase 重新上传上一 `dist`，或源码标签 `pre-report-layout-process160`。

## Boundaries

- 未发布独立 AI 实验室、Process149、私有工程数据、营口派生数据、API 密钥、`.env` 或本机临时产物。
- 未修改工程公式、分类、分层、参数解译、数据库、域名、DNS、SSL 或生产配额。
- 线上操作只使用 3 行合成数据。

## Evidence

- `process_logs/playwright-mcp/process161-dual-production-deployment/evidence-manifest.json`
- `process_logs/playwright-mcp/process161-dual-production-deployment/browser-check.json`
- `process_logs/playwright-mcp/process161-dual-production-deployment/international-1440x900.png`
- `process_logs/playwright-mcp/process161-dual-production-deployment/international-1920x1080.png`
- `process_logs/playwright-mcp/process161-dual-production-deployment/mainland-1440x900.png`
- `process_logs/playwright-mcp/process161-dual-production-deployment/mainland-1920x1080.png`
- `process_logs/knowledge-reviews/Process161.json`

## Known Problems Covered

- KPB-004、KPB-011、KPB-037。
