# Process157 - 快捷 AI 导入 v2 与分项解译

Date: 2026-08-18

Status: `closed / implemented / verified / ready for deployment`

## Goal

让普通用户把共同深度或各曲线独立深度列的 CPT/CPTU 文件交给 AI 整理，经少量选择和预览后进入快捷出图；可选字段局部缺失时只停止依赖该字段的方法，并让图册与 Excel 使用同一份结果。

## Result

- AI 导入协议升级为 v2，支持共同深度和独立深度曲线，最多进行 6 轮固定选项协商，并允许一次无效提案自动修复。
- `qc` 作为工作深度主轴；独立 `fs/u2` 仅在实测覆盖内和短缺口内插值，不跨越大空档。直接提供的 `qt` 不再重复进行面积修正。
- 快捷输入表支持直接编辑。深度或 `qc` 无效时暂停生成；`fs/u2` 可留空。新 AI 结果先预览，用户再次确认后才替换已有数据。
- 缺失或负 `fs` 保持缺失，实测 0 保持为 0；依赖正摩阻的 `Rf/Ic/分类` 等结果留空并说明原因，`qc/qt/qnet/应力` 等可用结果继续计算。
- 图册和 Excel 共用统一结果包；Sheet2 区分“已解译、部分解译、未解译”并写出逐字段未计算原因。
- 私有 Hachirogata 工作簿仅作本机只读验证，没有复制进仓库、证据或构建产物。

## Verification

- `npm.cmd run build`: passed。
- Assistant server: 45/45 passed。
- Quick domain: 57/57 passed。
- Quick UI: 27/27 passed。
- 5000-row quick import: 1/1 passed。
- Private independent-depth workbook: 1/1 passed，验证前后 SHA-256 均为 `4E7606C52284ECDC32A3F55565F63D76C5B6876D5D3D48C79B5DADD75E914B1A`。
- 1440×900 与 1920×1080：必填字段恢复、可选 `fs` 空白、部分解译、无横向溢出、浏览器错误 0。
- `git diff --check`: passed。
- Known Problem Gate: passed。

## Evidence

- `process_logs/playwright-mcp/process157-quick-ai-import-v2/editable-input-1440x900.png`
- `process_logs/playwright-mcp/process157-quick-ai-import-v2/partial-result-1920x1080.png`
- `process_logs/playwright-mcp/process157-quick-ai-import-v2/browser-check.json`
- `process_logs/playwright-mcp/process157-quick-ai-import-v2/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process157.json`

## Boundary

- 未部署至国际站或国内站。
- 未把缺失 `fs/u2` 批量补 0；只保留来源中真实存在的 0。
- 未支持 OCR、加密/损坏工作簿、宏执行、多文件合并或未知单位猜测。
- 真实 DeepSeek 网络速度不是本地可重复门禁；模型协议、超时与恢复由确定性服务端和界面测试覆盖。
