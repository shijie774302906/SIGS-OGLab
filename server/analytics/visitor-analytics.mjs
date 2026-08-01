const TOTALS_KEY = 'sigs:analytics:v1:totals';
const REGIONS_KEY = 'sigs:analytics:v1:regions';
const VISITOR_KEY_PREFIX = 'sigs:analytics:v1:visitor:';

const CHINA_REGION_LABELS = Object.freeze({
  '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
  '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
  '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
  '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
  '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
  '54': '西藏', '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏',
  '65': '新疆', '71': '台湾', '91': '香港', '92': '澳门',
});

const COUNTRY_LABELS = Object.freeze({
  CN: '中国大陆', HK: '中国香港', MO: '中国澳门', TW: '中国台湾',
  US: '美国', SG: '新加坡', JP: '日本', KR: '韩国', GB: '英国',
  CA: '加拿大', AU: '澳大利亚', DE: '德国', FR: '法国', NL: '荷兰',
});

function headerValue(headers, name) {
  if (headers?.get) return headers.get(name) ?? '';
  const value = headers?.[name] ?? headers?.[name.toLowerCase()] ?? '';
  return Array.isArray(value) ? value[0] ?? '' : String(value ?? '');
}

function safeCode(value, maximumLength) {
  const decoded = (() => {
    try { return decodeURIComponent(String(value ?? '').trim()); } catch { return ''; }
  })();
  return /^[A-Za-z0-9-]+$/.test(decoded) && decoded.length <= maximumLength
    ? decoded.toUpperCase()
    : '';
}

export function resolveVisitorRegion(headers) {
  const country = safeCode(headerValue(headers, 'x-vercel-ip-country'), 2);
  const subdivision = safeCode(headerValue(headers, 'x-vercel-ip-country-region'), 3);
  if (!country) return { key: 'UNKNOWN', label: '未知' };
  if (country === 'CN') {
    const label = CHINA_REGION_LABELS[subdivision];
    return label
      ? { key: `CN-${subdivision}`, label }
      : { key: 'CN', label: COUNTRY_LABELS.CN };
  }
  return { key: country, label: COUNTRY_LABELS[country] ?? country };
}

function regionLabel(key) {
  if (key === 'UNKNOWN') return '未知';
  const [country, subdivision] = key.split('-');
  if (country === 'CN' && subdivision && CHINA_REGION_LABELS[subdivision]) return CHINA_REGION_LABELS[subdivision];
  return COUNTRY_LABELS[country] ?? country;
}

function normalizeSnapshot(raw) {
  const regions = Object.entries(raw.regions ?? {})
    .map(([key, visits]) => ({ key, label: regionLabel(key), visits: Math.max(0, Number(visits) || 0) }))
    .filter((region) => region.visits > 0)
    .sort((left, right) => right.visits - left.visits || left.label.localeCompare(right.label, 'zh-CN'));
  return {
    status: 'ready',
    totals: {
      visitors: Math.max(0, Number(raw.visitors) || 0),
      visits: Math.max(0, Number(raw.visits) || 0),
      coveredRegions: regions.length,
    },
    regions,
  };
}

export function createMemoryVisitorAnalyticsStore() {
  const seen = new Set();
  const regions = new Map();
  let visitors = 0;
  let visits = 0;
  return {
    kind: 'memory',
    async record(subject, regionKey) {
      visits += 1;
      if (!seen.has(subject)) {
        seen.add(subject);
        visitors += 1;
      }
      regions.set(regionKey, (regions.get(regionKey) ?? 0) + 1);
      return normalizeSnapshot({ visitors, visits, regions: Object.fromEntries(regions) });
    },
  };
}

export function createUpstashVisitorAnalyticsStore({ url, token, fetchImpl = fetch }) {
  const endpoint = String(url ?? '').replace(/\/+$/, '');
  const authorization = String(token ?? '').trim();
  if (!endpoint || !authorization) throw new Error('Upstash Redis 配置不完整。');

  async function command(body) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.error) throw new Error('访问统计暂不可用。');
    return payload.result;
  }

  const recordScript = `
    local is_new = redis.call('SETNX', KEYS[1], '1')
    if is_new == 1 then redis.call('EXPIRE', KEYS[1], 31536000) end
    local visits = redis.call('HINCRBY', KEYS[2], 'visits', 1)
    local visitors = tonumber(redis.call('HGET', KEYS[2], 'visitors') or '0')
    if is_new == 1 then visitors = redis.call('HINCRBY', KEYS[2], 'visitors', 1) end
    redis.call('HINCRBY', KEYS[3], ARGV[1], 1)
    local region_values = redis.call('HGETALL', KEYS[3])
    return { visitors, visits, region_values }
  `;

  return {
    kind: 'upstash',
    async record(subject, regionKey) {
      const result = await command([
        'EVAL', recordScript, 3, `${VISITOR_KEY_PREFIX}${subject}`, TOTALS_KEY, REGIONS_KEY, regionKey,
      ]);
      const flatRegions = Array.isArray(result?.[2]) ? result[2] : [];
      const regions = {};
      for (let index = 0; index < flatRegions.length; index += 2) {
        regions[String(flatRegions[index])] = Number(flatRegions[index + 1]) || 0;
      }
      return normalizeSnapshot({ visitors: result?.[0], visits: result?.[1], regions });
    },
  };
}

export function createVisitorAnalyticsService({ config, fetchImpl = fetch, store } = {}) {
  let resolvedStore = store;
  if (!resolvedStore && config?.publicQuotaStorage === 'upstash') {
    resolvedStore = createUpstashVisitorAnalyticsStore({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken,
      fetchImpl,
    });
  }
  if (!resolvedStore && (config?.publicQuotaStorage ?? 'memory') === 'memory') {
    resolvedStore = createMemoryVisitorAnalyticsStore();
  }

  return {
    storageKind: resolvedStore?.kind ?? 'unavailable',
    async record(subject, region) {
      if (!resolvedStore || !subject) return { status: 'unavailable', totals: null, regions: [] };
      try {
        return await resolvedStore.record(subject, region?.key || 'UNKNOWN');
      } catch {
        return { status: 'unavailable', totals: null, regions: [] };
      }
    },
  };
}
