import fs from 'node:fs';
import path from 'node:path';

function loadLocalEnvironment() {
  const filePath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Z0-9_]+$/.test(key) || process.env[key] !== undefined) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnvironment();

function unquote(value) {
  const normalized = String(value ?? '').trim();
  return (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) ? normalized.slice(1, -1) : normalized;
}

export function resolveAssistantSecret({
  environment = process.env,
  cwd = process.cwd(),
  readFile = fs.readFileSync,
  statFile = fs.statSync,
} = {}) {
  const direct = unquote(environment.DEEPSEEK_API_KEY);
  if (direct) return { value: direct, source: 'environment', problem: null };

  const configuredPath = unquote(environment.DEEPSEEK_API_KEY_FILE);
  if (!configuredPath) {
    return {
      value: '',
      source: 'none',
      problem: '服务端尚未设置 DeepSeek 密钥。',
    };
  }

  const absolutePath = path.resolve(cwd, configuredPath);
  try {
    const stat = statFile(absolutePath);
    if (!stat.isFile() || stat.size > 4 * 1024) {
      return {
        value: '',
        source: 'file',
        problem: 'DeepSeek 密钥文件不可读取或内容过大。',
      };
    }
    const text = String(readFile(absolutePath, 'utf8'));
    const assignment = text.match(/(?:^|\n)\s*DEEPSEEK_API_KEY\s*=\s*["']?([^"'\r\n\s]+)["']?\s*(?:$|\n)/);
    const token = (assignment?.[1] ?? text.match(/\bsk-[A-Za-z0-9_-]{16,}\b/)?.[0] ?? '').trim();
    if (!token) {
      return {
        value: '',
        source: 'file',
        problem: 'DeepSeek 密钥文件中没有可用密钥。',
      };
    }
    return { value: token, source: 'file', problem: null };
  } catch {
    return {
      value: '',
      source: 'file',
      problem: 'DeepSeek 密钥文件不存在或无法读取。',
    };
  }
}

export function createAssistantServerConfig(environment = process.env) {
  const secret = resolveAssistantSecret({ environment });
  const mockEnabled = environment.ASSISTANT_PROVIDER === 'mock'
    || /^(1|true|yes)$/i.test(String(environment.ASSISTANT_MOCK ?? ''));
  // Vercel's current Upstash Marketplace integration injects KV_REST_API_*.
  // Keep the native Upstash names as an explicit self-hosted/config-file option.
  const upstashRedisRestUrl = unquote(environment.UPSTASH_REDIS_REST_URL || environment.KV_REST_API_URL);
  const upstashRedisRestToken = unquote(environment.UPSTASH_REDIS_REST_TOKEN || environment.KV_REST_API_TOKEN);
  const cloudbaseEnvId = unquote(environment.CLOUDBASE_ENV_ID || environment.TCB_ENV || environment.TCB_ENV_ID);
  const cloudbaseApiKey = unquote(environment.CLOUDBASE_API_KEY || environment.CLOUDBASE_APIKEY);
  const cloudbasePostgresRestUrl = unquote(environment.CLOUDBASE_RDB_REST_URL);
  const managedDeployment = Boolean(
    environment.VERCEL
    || environment.CLOUDBASE_ENV_ID
    || environment.TCB_ENV
    || environment.NODE_ENV === 'production',
  );
  const publicQuotaStorage = cloudbaseEnvId && cloudbaseApiKey
    ? 'cloudbase-postgres'
    : upstashRedisRestUrl && upstashRedisRestToken
      ? 'upstash'
    : managedDeployment
      ? 'unavailable'
      : 'memory';
  return Object.freeze({
    host: environment.HOST || (environment.PORT ? '0.0.0.0' : '127.0.0.1'),
    port: Number(environment.PORT || environment.ASSISTANT_PORT || 8787),
    provider: mockEnabled ? 'mock' : 'deepseek',
    deepseekApiKey: secret.value,
    deepseekApiKeySource: secret.source,
    deepseekApiKeyProblem: secret.problem,
    deepseekBaseUrl: (environment.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    deepseekModel: environment.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    // File import only needs sheet/header/unit recognition. Use the faster
    // model while keeping the professional/report assistant on the main model.
    deepseekImportModel: environment.DEEPSEEK_IMPORT_MODEL || 'deepseek-v4-flash',
    // CloudBase Run gives an HTTP request about 60 seconds. Keep two seconds for
    // the service to turn an upstream timeout into controlled, retryable JSON.
    requestTimeoutMs: Math.min(Math.max(Number(environment.ASSISTANT_TIMEOUT_MS || 58_000), 5_000), 58_000),
    maxBodyBytes: 512 * 1024,
    maxConcurrentRequests: 2,
    publicQuotaLimit: 100,
    publicQuotaStorage,
    cloudbaseEnvId,
    cloudbaseApiKey,
    cloudbasePostgresRestUrl,
    upstashRedisRestUrl,
    upstashRedisRestToken,
    assistantVisitorSecret: unquote(environment.ASSISTANT_VISITOR_SECRET) || secret.value || 'sigs-oglab-local-visitor',
    secureCookies: managedDeployment,
  });
}

export const assistantServerConfig = createAssistantServerConfig();
