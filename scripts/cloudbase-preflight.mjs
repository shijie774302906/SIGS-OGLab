import fs from 'node:fs';
import path from 'node:path';
import { createAssistantServerConfig } from '../server/assistant/config.mjs';

const root = process.cwd();
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const compliance = read('src/components/SiteComplianceLink.tsx');
const dockerfile = read('Dockerfile');
const dockerignore = read('.dockerignore');
const migration = read('cloudbase/migrations/20260814132000_public_usage.sql');
const failClosed = createAssistantServerConfig({
  NODE_ENV: 'production',
  PORT: '8787',
  DEEPSEEK_API_KEY: 'preflight-placeholder-not-a-real-key',
  CLOUDBASE_ENV_ID: 'sigs-oglabx-prod-example',
});
const configured = createAssistantServerConfig({
  NODE_ENV: 'production',
  PORT: '8787',
  CLOUDBASE_ENV_ID: 'sigs-oglabx-prod-example',
  CLOUDBASE_API_KEY: 'service-role-placeholder-not-a-real-key',
  ASSISTANT_VISITOR_SECRET: 'visitor-placeholder-not-a-real-key',
});

check('备案号唯一来源', compliance.includes("SITE_ICP_RECORD = '闽ICP备2026030723号'"), '备案号来自共享组件。');
check('备案链接', compliance.includes("SITE_ICP_URL = 'https://beian.miit.gov.cn/'"), '只链接工信部备案系统。');
check('云托管监听地址', configured.host === '0.0.0.0' && configured.port === 8787, `${configured.host}:${configured.port}`);
check('生产入口不包含实验室路由', !read('src/main.tsx').includes('/agent-lab'), '独立实验功能不进入正式前端。');
check('数据库未授权时公共额度关闭', failClosed.publicQuotaStorage === 'unavailable', `storage=${failClosed.publicQuotaStorage}`);
check('CloudBase PostgreSQL 优先', configured.publicQuotaStorage === 'cloudbase-postgres', `storage=${configured.publicQuotaStorage}`);
check('生产 Cookie 使用 Secure', configured.secureCookies === true, `secureCookies=${configured.secureCookies}`);
check('数据库函数显式校验 service_role', migration.includes("claims->>'role', '') <> 'service_role'"), '不能依赖 RPC 可达性作为权限边界。');
check('数据库不存原始 IP 或工程字段', !/\b(raw_ip|ip_address|qc|fs|u2|project_data|file_content)\b/i.test(migration), '仅保存摘要和汇总计数。');
check('容器只复制服务端', dockerfile.includes('COPY server ./server') && !dockerfile.includes('COPY . .'), '不把项目数据或前端源码复制进 API 容器。');
check('容器上下文默认拒绝', dockerignore.trimStart().startsWith('*') && dockerignore.includes('!server/**'), '仅放行 Dockerfile 和 server。');

const distPath = path.join(root, 'dist');
if (fs.existsSync(distPath)) {
  const unsafePattern = /(DEEPSEEK_API_KEY\s*=|CLOUDBASE_API_KEY\s*=|CLOUDBASE_APIKEY\s*=|UPSTASH_REDIS_REST_TOKEN\s*=|\bsk-[A-Za-z0-9_-]{16,}\b|622114083529169e897a598f8907ca75)/;
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(?:html|js|css|json|txt|map)$/i.test(entry.name)) files.push(full);
    }
  };
  visit(distPath);
  const unsafe = files.find((file) => unsafePattern.test(fs.readFileSync(file, 'utf8')));
  check('构建产物无密钥或公安数据码', !unsafe, unsafe ? path.relative(root, unsafe) : `扫描 ${files.length} 个文本产物。`);
  const releaseManifestPath = path.join(distPath, 'release-manifest.json');
  const releaseManifest = fs.existsSync(releaseManifestPath)
    ? JSON.parse(fs.readFileSync(releaseManifestPath, 'utf8'))
    : null;
  check('构建清单存在', Boolean(releaseManifest), 'dist/release-manifest.json');
  check('构建清单指向国内正式站', releaseManifest?.process === 'Process162' && releaseManifest?.canonicalSite === 'https://sigs-oglabx.com', releaseManifest ? `${releaseManifest.process} / ${releaseManifest.canonicalSite}` : 'missing');
  check('构建清单排除实验智能体', releaseManifest?.capabilities?.standaloneAgentLab === false, `standaloneAgentLab=${releaseManifest?.capabilities?.standaloneAgentLab}`);
  check('构建内含国内手册', fs.existsSync(path.join(distPath, 'help/index.html')), 'dist/help/index.html');
} else {
  check('构建产物待生成', true, '先运行 npm run build，随后重新运行本检查。');
}

const result = { status: checks.every((item) => item.ok) ? 'pass' : 'fail', checks };
if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else {
  for (const item of checks) process.stdout.write(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}：${item.detail}\n`);
  process.stdout.write(`CloudBase preflight: ${result.status}\n`);
}
if (result.status !== 'pass') process.exitCode = 1;
