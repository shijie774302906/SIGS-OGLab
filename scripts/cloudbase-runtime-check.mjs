const args = process.argv.slice(2);
const argumentValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const baseUrl = String(
  argumentValue('--base-url')
    ?? process.env.CLOUDBASE_SMOKE_URL
    ?? 'https://sigs-oglab-api-297086-11-1461183761.sh.run.tcloudbase.com',
).replace(/\/+$/, '');

const checks = [];
const record = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

async function readJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${pathname} 返回的不是 JSON（HTTP ${response.status}）。`);
  }
  return { status: response.status, body };
}

function containsSensitiveField(value) {
  if (!value || typeof value !== 'object') return false;
  const forbidden = /^(?:raw_?ip|ip_?address|visitor_?(?:id|key|digest|token)|cookie|api_?key|project|filename|file_?content)$/i;
  return Object.entries(value).some(([key, child]) => forbidden.test(key) || containsSensitiveField(child));
}

try {
  const health = await readJson('/healthz');
  record('API 健康检查', health.status === 200, `HTTP ${health.status}`);

  const capabilities = await readJson('/api/assistant/capabilities');
  const quota = capabilities.body?.publicQuota;
  record('公共 AI 已连接', capabilities.status === 200 && capabilities.body?.publicAccess === true, `publicAccess=${String(capabilities.body?.publicAccess)}`);
  record('公共额度来自共享存储', quota?.status === 'available' || quota?.status === 'exhausted', `quota=${String(quota?.status)}`);
  record('每日额度为 100 次', quota?.limit === 100, `limit=${String(quota?.limit)}`);
  record('能力响应无敏感字段', !containsSensitiveField(capabilities.body), '只检查字段名，不输出响应内容。');

  const visits = await readJson('/api/visits');
  record('访问统计已连接', visits.status === 200 && visits.body?.status === 'ready', `status=${String(visits.body?.status)}`);
  record('统计响应无访客身份', !containsSensitiveField(visits.body), '浏览器只接收汇总结果。');
} catch (error) {
  record('远程检查可完成', false, error instanceof Error ? error.message : '未知错误');
}

const result = {
  status: checks.every((item) => item.ok) ? 'pass' : 'fail',
  baseUrl,
  checks,
};

if (args.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else {
  for (const item of checks) process.stdout.write(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}：${item.detail}\n`);
  process.stdout.write(`CloudBase runtime check: ${result.status}\n`);
}

if (result.status !== 'pass') process.exitCode = 1;
