const QUOTA_KEY_PATTERN = /^sigs:assistant-quota:(\d{4}-\d{2}-\d{2}):([0-9a-f]{64})$/;

function storageError() {
  const error = new Error('CloudBase PostgreSQL storage is unavailable.');
  error.code = 'CLOUDBASE_POSTGRES_STORAGE';
  return error;
}

function normalizeRestBaseUrl({ envId, restUrl }) {
  const configured = String(restUrl ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const normalizedEnvId = String(envId ?? '').trim();
  if (!/^[a-zA-Z0-9-]{3,80}$/.test(normalizedEnvId)) throw storageError();
  return `https://${normalizedEnvId}.api.tcloudbasegateway.com/v1/rdb/rest`;
}

function parseQuotaKey(key) {
  const match = QUOTA_KEY_PATTERN.exec(String(key ?? ''));
  if (!match) throw storageError();
  return { date: match[1], subject: match[2] };
}

function normalizeRpcPayload(payload) {
  if (Array.isArray(payload) && payload.length === 1) return payload[0];
  return payload;
}

function numberValue(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw storageError();
  return normalized;
}

export function createCloudBasePostgresRpcClient({
  envId,
  apiKey,
  restUrl,
  fetchImpl = fetch,
} = {}) {
  const endpoint = normalizeRestBaseUrl({ envId, restUrl });
  const authorization = String(apiKey ?? '').trim();
  if (!authorization) throw storageError();

  return Object.freeze({
    async call(functionName, params = {}) {
      if (!/^sigs_[a-z0-9_]+$/.test(String(functionName ?? ''))) throw storageError();
      let response;
      try {
        response = await fetchImpl(`${endpoint}/rpc/${functionName}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authorization}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(params),
        });
      } catch {
        throw storageError();
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload === null || payload?.error || payload?.code) throw storageError();
      return normalizeRpcPayload(payload);
    },
  });
}

export function createCloudBasePostgresQuotaStore(options = {}) {
  const rpc = options.rpc ?? createCloudBasePostgresRpcClient(options);
  return {
    kind: 'cloudbase-postgres',
    async read(key) {
      const { subject, date } = parseQuotaKey(key);
      const result = await rpc.call('sigs_quota_read', {
        p_subject: subject,
        p_quota_date: date,
      });
      return numberValue(result?.used ?? result);
    },
    async reserve(key, limit) {
      const { subject, date } = parseQuotaKey(key);
      const result = await rpc.call('sigs_quota_reserve', {
        p_subject: subject,
        p_quota_date: date,
        p_limit: limit,
      });
      if (!result || typeof result.accepted !== 'boolean') throw storageError();
      return { accepted: result.accepted, used: numberValue(result.used) };
    },
    async release(key) {
      const { subject, date } = parseQuotaKey(key);
      const result = await rpc.call('sigs_quota_release', {
        p_subject: subject,
        p_quota_date: date,
      });
      return numberValue(result?.used ?? result);
    },
  };
}

export function createCloudBasePostgresVisitorAnalyticsStore(options = {}) {
  const rpc = options.rpc ?? createCloudBasePostgresRpcClient(options);
  return {
    kind: 'cloudbase-postgres',
    async record(subject, regionKey) {
      const result = await rpc.call('sigs_record_visit', {
        p_subject: subject,
        p_region_key: regionKey,
      });
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw storageError();
      return result;
    },
  };
}
