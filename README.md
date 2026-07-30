# SIGS-OGLab Web

面向 CPT/CPTU 数据的浏览器解译工作台，包含项目与点位管理、数据导入、数据检查、地层分层、参数解译、成果输出、快捷图册和受控 AI 助手。

当前仓库仍处于公开前质量审查阶段。工程结果用于辅助判断，不替代岩土工程师复核，也不代表正式工程采纳。

## 运行方式

环境要求：

- Windows 10/11
- Node.js 20 或更高版本
- Chrome 或 Edge 最新版

安装并启动完整本地服务：

```powershell
npm install
npm run dev
```

网页默认地址为 `http://127.0.0.1:5173/`，AI 转发服务默认监听 `http://127.0.0.1:8787/`。`npm run dev:web` 只启动网页，`npm run dev:assistant` 只启动 AI 转发服务。

构建静态网页：

```powershell
npm run build
npm run preview
```

`npm run preview` 只预览构建后的静态网页，不会代理 AI 接口。静态部署默认不含 AI；专业解译、快捷图册和本地导出仍可使用。

公网启用 AI 时，必须把 Node 转发服务通过 HTTPS 反向代理到网页同源的 `/api/assistant`，并配置明确的允许来源、请求体限制、超时、限流和运行日志。不能把 DeepSeek Key 写入 Vite 环境变量或浏览器构建产物。

## 数据与隐私

- 项目、点位和解译状态保存在当前浏览器的 IndexedDB/localStorage 中。
- 不会自动上传工程数据，也没有云端账户或云端项目库。
- 更换浏览器、清理站点数据或更换设备后，原浏览器数据不会自动恢复。
- DeepSeek API Key 只保存在当前页面内存中；刷新、关闭或断开后清除。
- AI 请求必须由用户连接自己的 Key，并确认相应的数据发送范围。
- API Key 不应写入源码、截图、日志或版本库。

可参考 `.env.example` 配置本地开发端口和模型。不要创建 `VITE_*` 密钥变量，因为这会把密钥打包进浏览器代码。

## 主要工作流

专业解译：

```text
项目/点位 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

快捷出图：

```text
粘贴或导入数据 -> 确认必要设置 -> 生成图册 -> 导出 PDF/Excel
```

AI 分为三个受控角色：

- 导入整理：读取用户指定文件，生成待确认的结构化导入建议；原文件不变。
- 专业解译助手：读取当前工程状态，可生成待确认的土类或边界修改提案；只有工程师确认后才进入工作草稿，原始测量不变。
- 图册解读：只读当前图册页面及允许的图表事实，不修改项目。

## 质量检查

常用命令：

```powershell
npm run build
npm run release:audit
npm run test:assistant-server
npm run test:domain-fast
npm run test:ui-isolated
npm run test:real-serial
npm run test:compatibility
```

测试分为三层：

- `domain-fast`：公式、状态机、哈希、导入与持久化规则。
- `ui-isolated`：每项测试使用隔离的浏览器本地数据库。
- `real-serial`：营口真实数据、持久化、性能和完整工作流，单 worker 串行。

正式支持目标为 Windows 最新 Chrome/Edge，验收分辨率为 1440×900 和 1920×1080。Firefox/WebKit 仅做兼容性冒烟。

## 仓库边界

- `D:\CPT-UIQA` 是独立的桌面参考仓库，本项目不会修改它。
- `docs/`、`sample_data/` 和 `public/reference-screenshots/` 是设计、方法和测试参考。
- 当前实现不应被描述为官方标准软件或未经复核的正式工程成果。
- `sample_data/source/yingkou` 的真实样本在公开发布前必须补齐数据所有者许可和脱敏记录；未完成前不得随公开仓库分发。
- 仓库公开前必须由维护者选择并加入明确的开源许可证。`private: true` 只用于防止误发布 npm 包，不能替代许可证。

公网托管层应至少设置：

- `Content-Security-Policy`：仅允许本项目所需来源，并禁止未授权脚本。
- `Referrer-Policy: no-referrer`。
- 限制摄像头、麦克风、定位等能力的 `Permissions-Policy`。
- HTTPS、同源 AI 反向代理、允许来源和请求限流。

开发流程、证据和已知问题门禁见 `AGENTS.md`、`docs/process/` 与 `docs/knowledge/`。

## 反馈与安全问题

普通建议可使用页面左下角“反馈与建议”，也可发送邮件至 `sigsoglab@163.com`。

安全问题请先阅读 [SECURITY.md](SECURITY.md)。请勿在反馈中附带真实 API Key、未脱敏工程数据或其他敏感信息。
