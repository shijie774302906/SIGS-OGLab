# Process158 - 双正式站安全发布与线上验收

Date: 2026-08-18

Status: `closed / verified / deployed`

## Goal

把已验证的 Process156/157 安全发布到国际站 `sigs-oglab.com` 与国内站 `sigs-oglabx.com`，保持相同前端版本、同一 AI 导入 v2 协议，并用线上真实操作证明快捷输入、部分解译和 Excel 下载可用。

## Result

- 国际站 Vercel 与国内站 CloudBase 前端均发布 `Process158 / 60e6fa135f8ae038de5ba0d66272ce5e22dc87b3`。
- 国内 `sigs-oglab-api-008` 在旧版继续承载流量时构建；先灰度验证 `sigs.ai-import/2`，再完成流量切换。
- 两站 `/api/assistant/capabilities` 均返回 `sigs.ai-import/2`，`/api/visits` 均为 `ready`。
- 两站分别在 1440×900 与 1920×1080 完成合成数据快捷流程：可选 fs 留空、图册生成、Excel 下载、无横向溢出、浏览器错误为 0。
- Vercel 首次版本清单构建因托管环境没有常规 Git 工作树失败；脚本已改为优先读取托管平台提交环境变量，后续构建成功。CloudBase 云端构建同样未覆盖旧站，最终使用本地已验收的 `dist` 上传 101/101 文件。

## Verification

- `npm.cmd run build:release`: passed。
- `npm.cmd run release:audit`: 0 errors；既有许可证、package private 和超大源文件警告不影响本次部署。
- `npm.cmd run release:parity`: 16/16 passed。
- `npm.cmd run cloudbase:preflight`: 16/16 passed。
- `npm.cmd run test:assistant-server`: 45/45 passed。
- Process157 快捷 domain：57/57 passed；快捷 UI：27/27 passed；选择性核心线上回归：3/3 passed。
- Process158 双站双分辨率线上 Playwright：4/4 passed。
- Known Problem Gate：KPB-002、KPB-004、KPB-011、KPB-013 均有线上或部署恢复证据。

## Deployment

- Release source: `60e6fa135f8ae038de5ba0d66272ce5e22dc87b3`。
- International: `https://sigs-oglab.com`，Vercel production Ready。
- Mainland: `https://sigs-oglabx.com`，CloudBase static hosting；API version `sigs-oglab-api-008`。
- Rollback safety: Vercel 失败部署未替换上一 Ready 版本；CloudBase 008 在 0%/灰度阶段完成验证后才 promote。

## Boundaries

- 未发布私有工作簿、营口数据、API 密钥、`.env`、独立 AI 实验室、Process149 临时领导页或本机临时测试产物。
- 未修改 CPT/CPTU 工程公式、分类方法、分层方法、数据库结构、域名、DNS、SSL 或生产配额。
- 本次线上功能测试只使用 3 行合成数据，不含用户工程数据。

## Evidence

- `process_logs/playwright-mcp/process158-dual-production-deployment/evidence-manifest.json`
- `process_logs/playwright-mcp/process158-dual-production-deployment/browser-check.json`
- `process_logs/playwright-mcp/process158-dual-production-deployment/international-1440x900.png`
- `process_logs/playwright-mcp/process158-dual-production-deployment/international-1920x1080.png`
- `process_logs/playwright-mcp/process158-dual-production-deployment/mainland-1440x900.png`
- `process_logs/playwright-mcp/process158-dual-production-deployment/mainland-1920x1080.png`
- `process_logs/knowledge-reviews/Process158.json`

## Known Problems Covered

- KPB-002, KPB-004, KPB-011, KPB-013
