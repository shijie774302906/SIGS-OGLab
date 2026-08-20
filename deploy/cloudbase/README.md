# SIGS-OGLab CloudBase 部署说明

正式备案域名为 `sigs-oglabx.com`。原 Cloudflare 域名 `sigs-oglab.com` 保持不变，只有默认测试域名全部通过后才切换 DNS。

## 部署结构

```text
sigs-oglabx.com /
  -> CloudBase 静态托管（Vite dist）
sigs-oglabx.com /api
  -> CloudBase 云托管 sigs-oglab-api（Node 服务）
CloudBase PostgreSQL
  -> 公共 AI 每日配额 + 匿名访问汇总
```

浏览器继续使用同源的 `/api/assistant` 和 `/api/visits`，不直接持有数据库或 DeepSeek 密钥。

## PostgreSQL 初始化

执行一次幂等迁移：

```powershell
npm.cmd exec --yes --package=@cloudbase/cli@3.7.3 -- tcb db pg migration up `
  -e sigs-oglabx-prod-d8exjjk8103d9ad --json
```

迁移只创建以下内容：

- HMAC 匿名访客摘要、北京日期和公共 AI 计数；
- 匿名访客总数、访问次数和地区汇总；
- 原子预留、失败释放和访问计数 RPC。

不会保存原始 IP、上传文件、CPT/CPTU 测量或项目内容。

## 云托管环境变量

在 `sigs-oglab-api` 的新版本中配置：

- `NODE_ENV=production`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL=deepseek-v4-pro`
- `CLOUDBASE_ENV_ID=sigs-oglabx-prod-d8exjjk8103d9ad`
- `CLOUDBASE_API_KEY`：控制台生成的后端 API Key（`service_role`），禁止放入前端或仓库
- `ASSISTANT_VISITOR_SECRET`：独立、稳定的随机密钥

兼容旧 Vercel 部署的 Upstash 变量仍被支持，但 CloudBase 环境同时具备环境 ID 和 API Key 时优先使用 PostgreSQL。

环境变量绑定云托管的具体版本，不会在 CLI 发布新版本时自动继承。安全发布顺序固定为：

1. CLI 先发布 0% 流量的新版本；
2. 控制台进入 `云托管 → sigs-oglab-api → 服务设置 → 版本管理`；
3. 为新版本逐项填写上述变量，变量值只保存在控制台；
4. 发布后先运行远程检查，通过后才把流量切到新版本；
5. 检查不通过时保留旧版本 100% 流量，不删除新版本。

`CLOUDBASE_API_KEY` 必须使用 PostgreSQL 的后端 API Key（`service_role`），不能使用可公开的 Publishable Key。`ASSISTANT_VISITOR_SECRET` 必须是独立随机值，不能复用 DeepSeek Key 或 CloudBase API Key。

## 本地检查

```powershell
npm.cmd run build
npm.cmd run test:assistant-server
npm.cmd run cloudbase:preflight
npm.cmd run cloudbase:runtime-check
```

## 部署

```powershell
npm.cmd exec --yes --package=@cloudbase/cli@3.7.3 -- tcb cloudrun deploy `
  -e sigs-oglabx-prod-d8exjjk8103d9ad `
  -s sigs-oglab-api --port 8787 --source . --wait --json

npm.cmd exec --yes --package=@cloudbase/cli@3.7.3 -- tcb deploy sigs-oglab-web `
  -e sigs-oglabx-prod-d8exjjk8103d9ad `
  --framework vite --install-command "npm ci" --build-command "npm run build" `
  --output-dir dist --deploy-path / --enable-git-ignore --json
```

## DNS 切换前门禁

- `/healthz`、`/api/assistant/capabilities`、`/api/visits` 可用；
- 公共 AI 第 1～100 次允许，第 101 次拒绝；个人 Key 不消耗公共额度；
- 数据库故障时公共 AI 明确不可用，访问统计隐藏，不回退到内存；
- 浏览器响应不包含访客摘要、原始 IP、API Key 或工程数据；
- 项目首页、专业工作台、快捷输入和快捷图册各只有一个备案链接；
- 生产源码与构建均不包含 `/agent-lab`、私有工程数据或本地测试产物。
