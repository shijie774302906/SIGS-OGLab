import crypto from 'node:crypto';
import { createCloudBasePostgresQuotaStore } from '../storage/cloudbase-postgres.mjs';

export const PUBLIC_ASSISTANT_DAILY_LIMIT = 100;
export const ASSISTANT_VISITOR_COOKIE = 'sigs_ai_visitor';

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function publicQuotaWindow(now = new Date()) {
  const chinaTime = new Date(now.getTime() + CHINA_OFFSET_MS);
  const date = chinaTime.toISOString().slice(0, 10);
  const nextChinaMidnightAsUtc = Date.UTC(
    chinaTime.getUTCFullYear(),
    chinaTime.getUTCMonth(),
    chinaTime.getUTCDate() + 1,
  ) - CHINA_OFFSET_MS;
  return {
    date,
    resetAt: new Date(nextChinaMidnightAsUtc).toISOString(),
    expiresAtSeconds: Math.floor((nextChinaMidnightAsUtc + ONE_DAY_MS) / 1000),
  };
}

function quotaView(used, window, limit = PUBLIC_ASSISTANT_DAILY_LIMIT) {
  const normalizedUsed = Math.min(Math.max(Number(used) || 0, 0), limit);
  return {
    status: normalizedUsed >= limit ? 'exhausted' : 'available',
    limit,
    used: normalizedUsed,
    remaining: Math.max(0, limit - normalizedUsed),
    resetAt: window.resetAt,
  };
}

function unavailableQuota(window, limit = PUBLIC_ASSISTANT_DAILY_LIMIT) {
  return {
    status: 'unavailable',
    limit,
    used: null,
    remaining: null,
    resetAt: window.resetAt,
  };
}

function quotaKey(subject, date) {
  return `sigs:assistant-quota:${date}:${subject}`;
}

export function createMemoryQuotaStore() {
  const counters = new Map();
  return {
    kind: 'memory',
    async read(key) {
      return Number(counters.get(key) ?? 0);
    },
    async reserve(key, limit) {
      const used = Number(counters.get(key) ?? 0);
      if (used >= limit) return { accepted: false, used };
      counters.set(key, used + 1);
      return { accepted: true, used: used + 1 };
    },
    async release(key) {
      const used = Number(counters.get(key) ?? 0);
      const next = Math.max(0, used - 1);
      if (next) counters.set(key, next);
      else counters.delete(key);
      return next;
    },
  };
}

export function createUpstashQuotaStore({ url, token, fetchImpl = fetch }) {
  const endpoint = String(url ?? '').replace(/\/+$/, '');
  const authorization = String(token ?? '').trim();
  if (!endpoint || !authorization) throw new Error('Upstash Redis 配置不完整。');

  async function command(body) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authorization}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.error) {
      const error = new Error('公共 AI 次数服务暂不可用。');
      error.code = 'PUBLIC_QUOTA_STORAGE';
      throw error;
    }
    return payload.result;
  }

  const reserveScript = `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    local limit = tonumber(ARGV[1])
    if current >= limit then return {0, current} end
    local next = redis.call('INCR', KEYS[1])
    if next == 1 then redis.call('EXPIREAT', KEYS[1], tonumber(ARGV[2])) end
    return {1, next}
  `;
  const releaseScript = `
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    if current <= 0 then return 0 end
    local next = redis.call('DECR', KEYS[1])
    if next <= 0 then redis.call('DEL', KEYS[1]); return 0 end
    return next
  `;

  return {
    kind: 'upstash',
    async read(key) {
      return Number(await command(['GET', key]) ?? 0);
    },
    async reserve(key, limit, expiresAtSeconds) {
      const result = await command(['EVAL', reserveScript, 1, key, limit, expiresAtSeconds]);
      return { accepted: Number(result?.[0]) === 1, used: Number(result?.[1]) || 0 };
    },
    async release(key) {
      return Number(await command(['EVAL', releaseScript, 1, key]) ?? 0);
    },
  };
}

export function createAssistantQuotaService({
  config,
  fetchImpl = fetch,
  now = () => new Date(),
  store,
} = {}) {
  const limit = Number(config?.publicQuotaLimit) || PUBLIC_ASSISTANT_DAILY_LIMIT;
  let resolvedStore = store;
  if (!resolvedStore && config?.publicQuotaStorage === 'cloudbase-postgres') {
    resolvedStore = createCloudBasePostgresQuotaStore({
      envId: config.cloudbaseEnvId,
      apiKey: config.cloudbaseApiKey,
      restUrl: config.cloudbasePostgresRestUrl,
      fetchImpl,
    });
  }
  if (!resolvedStore && config?.publicQuotaStorage === 'upstash') {
    resolvedStore = createUpstashQuotaStore({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken,
      fetchImpl,
    });
  }
  if (!resolvedStore && (config?.publicQuotaStorage ?? 'memory') === 'memory') resolvedStore = createMemoryQuotaStore();

  async function status(subject) {
    const window = publicQuotaWindow(now());
    if (!resolvedStore || !subject) return unavailableQuota(window, limit);
    try {
      const used = await resolvedStore.read(quotaKey(subject, window.date));
      return quotaView(used, window, limit);
    } catch {
      return unavailableQuota(window, limit);
    }
  }

  async function reserve(subject) {
    const window = publicQuotaWindow(now());
    if (!resolvedStore || !subject) return { accepted: false, quota: unavailableQuota(window, limit), reason: 'unavailable' };
    try {
      const result = await resolvedStore.reserve(
        quotaKey(subject, window.date),
        limit,
        window.expiresAtSeconds,
      );
      return {
        accepted: result.accepted,
        quota: quotaView(result.used, window, limit),
        reason: result.accepted ? null : 'exhausted',
      };
    } catch {
      return { accepted: false, quota: unavailableQuota(window, limit), reason: 'unavailable' };
    }
  }

  async function release(subject) {
    const window = publicQuotaWindow(now());
    if (!resolvedStore || !subject) return unavailableQuota(window, limit);
    try {
      const used = await resolvedStore.release(quotaKey(subject, window.date));
      return quotaView(used, window, limit);
    } catch {
      return unavailableQuota(window, limit);
    }
  }

  return { status, reserve, release, storageKind: resolvedStore?.kind ?? 'unavailable' };
}

function parseCookies(cookieHeader) {
  const values = new Map();
  for (const part of String(cookieHeader ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) values.set(name, value);
  }
  return values;
}

function signature(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function validToken(token, secret) {
  const [visitorId, suppliedSignature, extra] = String(token ?? '').split('.');
  if (extra || !/^[0-9a-f-]{36}$/i.test(visitorId ?? '') || !suppliedSignature) return null;
  const expected = signature(visitorId, secret);
  const supplied = Buffer.from(suppliedSignature);
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length || !crypto.timingSafeEqual(supplied, wanted)) return null;
  return visitorId;
}

export function createAssistantVisitor({
  cookieHeader,
  secret,
  secure = false,
  randomUUID = crypto.randomUUID,
} = {}) {
  const normalizedSecret = String(secret ?? '').trim();
  if (!normalizedSecret) return { subject: '', setCookie: null };
  const currentToken = parseCookies(cookieHeader).get(ASSISTANT_VISITOR_COOKIE);
  let visitorId = validToken(currentToken, normalizedSecret);
  let setCookie = null;
  if (!visitorId) {
    visitorId = randomUUID();
    const token = `${visitorId}.${signature(visitorId, normalizedSecret)}`;
    setCookie = [
      `${ASSISTANT_VISITOR_COOKIE}=${token}`,
      'Path=/',
      'Max-Age=31536000',
      'HttpOnly',
      'SameSite=Lax',
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  }
  const subject = crypto.createHmac('sha256', normalizedSecret).update(visitorId).digest('hex');
  return { subject, setCookie };
}
