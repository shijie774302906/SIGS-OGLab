import { assistantServerConfig } from './config.mjs';
import { validateAssistantRequest } from './policy.mjs';
import {
  requestDeepSeekTurn,
  requestMockTurn,
  validateDeepSeekConnection,
} from './providers.mjs';
import { assistantServiceIdentity } from './protocol.mjs';
import { createAssistantQuotaService } from './quota.mjs';

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return String(headers.get(name) ?? '');
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : '';
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

function temporaryApiKey(headers) {
  const value = headerValue(headers, 'x-deepseek-api-key').trim();
  if (!value || value.length > 256 || /[\r\n]/.test(value)) return '';
  return value;
}

function response(status, body) {
  return { status, body };
}

function safeProblem(error, aborted = false, route = null) {
  const status = Number(error?.status) || (aborted ? 504 : 500);
  const safeStatus = [400, 401, 402, 413, 422, 429, 500, 502, 503, 504].includes(status)
    ? status
    : 500;
  const isFileRoute = route === 'import' || route === 'quick-input';
  const problem = aborted
    ? route === 'quick-report'
      ? '模型读取图册超过 55 秒。你的问题已保留，可以直接重新解读；图册和数据没有改变。'
      : isFileRoute
        ? '模型整理文件超过 55 秒。可以直接重试；原文件没有改变。'
        : '模型响应超过 55 秒。可以直接重试；没有执行任何修改。'
    : error?.code === 'MODEL_OUTPUT_TRUNCATED'
      ? route === 'quick-report'
        ? '这次图册回答没有生成完整。你的问题已保留，可以直接重新解读；图册和数据没有改变。'
        : 'DeepSeek 整理内容未生成完整，请重试；原文件未修改。'
    : error?.code === 'MODEL_TOOL_FORMAT'
        ? route === 'quick-report'
          ? '这次没有读出有效的图册信息。你的问题已保留，可以直接重新解读；图册和数据没有改变。'
          : 'DeepSeek 返回的整理格式不完整，请重试；原文件未修改。'
      : ['MODEL_TOOL_COUNT', 'MODEL_DECISION_REQUIRED'].includes(error?.code)
        ? 'DeepSeek 这次没有形成唯一可确认的文件判断，请重试；原文件未修改。'
    : safeStatus === 401
      ? 'DeepSeek API Key 无效，请检查后重试。'
      : safeStatus === 402
        ? 'DeepSeek 额度不足，请充值或更换 API Key。'
        : safeStatus === 429
          ? 'DeepSeek 请求较多，请稍后重试。'
          : safeStatus >= 500
            ? 'DeepSeek 服务暂时不可用，请稍后重试。'
            : '请求无法处理；没有执行任何修改。';
  return {
    status: safeStatus,
    problem,
    ...(aborted
      ? { code: 'UPSTREAM_TIMEOUT' }
      : typeof error?.code === 'string'
        ? { code: error.code }
        : {}),
  };
}

export function createAssistantCore({
  config = assistantServerConfig,
  fetchImpl = fetch,
  quotaService = createAssistantQuotaService({ config, fetchImpl }),
} = {}) {
  return async function handleAssistantRequest({
    method,
    pathname,
    headers,
    body,
    signal,
    quotaSubject = 'direct-core',
  }) {
    if (method === 'GET' && pathname === '/api/assistant/capabilities') {
      const publicConfigured = config.provider !== 'mock' && Boolean(config.deepseekApiKey);
      const publicQuota = publicConfigured ? await quotaService.status(quotaSubject) : null;
      const publicAccess = publicConfigured && publicQuota?.status !== 'unavailable';
      return response(200, {
        ...assistantServiceIdentity(),
        serviceAvailable: true,
        provider: config.provider,
        model: config.provider === 'mock' ? 'deterministic-mock' : config.deepseekModel,
        requiresApiKey: config.provider !== 'mock' && !publicAccess,
        publicAccess,
        ...(publicQuota ? { publicQuota } : {}),
      });
    }

    if (method === 'POST' && pathname === '/api/assistant/connect') {
      if (config.provider === 'mock') {
        return response(200, {
          connected: true,
          provider: 'mock',
          model: 'deterministic-mock',
        });
      }
      const apiKey = temporaryApiKey(headers);
      if (!apiKey) return response(401, { problem: '请输入有效的 DeepSeek API Key。' });
      try {
        const result = await validateDeepSeekConnection({
          apiKey,
          signal,
          fetchImpl,
          config,
        });
        return response(200, result);
      } catch (error) {
        const safe = safeProblem(error, signal?.aborted);
        return response(safe.status, {
          problem: safe.problem,
          ...(safe.code ? { code: safe.code } : {}),
        });
      }
    }

    if (method !== 'POST' || pathname !== '/api/assistant/turn') {
      return response(404, { problem: '接口不存在。' });
    }

    const personalApiKey = config.provider === 'mock' ? '' : temporaryApiKey(headers);
    const apiKey = config.provider === 'mock' ? '' : personalApiKey || config.deepseekApiKey;
    if (config.provider !== 'mock' && !apiKey) {
      return response(401, { problem: '公共 AI 暂不可用，请输入自己的 DeepSeek API Key 后重试。' });
    }
    const validated = validateAssistantRequest(body);
    if (!validated.ok) return response(400, { problem: validated.problem });
    let reservedPublicQuota = null;
    if (config.provider !== 'mock' && !personalApiKey) {
      const reservation = await quotaService.reserve(quotaSubject);
      if (!reservation.accepted) {
        const unavailable = reservation.reason === 'unavailable';
        return response(unavailable ? 503 : 429, {
          problem: unavailable
            ? '公共 AI 次数服务暂不可用，请稍后重试或使用自己的 DeepSeek Key。'
            : '今日公共 AI 额度已用完，可明日再试或使用自己的 DeepSeek Key。',
          code: unavailable ? 'PUBLIC_QUOTA_UNAVAILABLE' : 'PUBLIC_QUOTA_EXHAUSTED',
          publicQuota: reservation.quota,
        });
      }
      reservedPublicQuota = reservation.quota;
    }
    try {
      const turn = config.provider === 'mock'
        ? await requestMockTurn({ turns: validated.turns, context: validated.context })
        : await requestDeepSeekTurn({
            apiKey,
            turns: validated.turns,
            context: validated.context,
            signal,
            fetchImpl,
            config,
          });
      return response(200, {
        ...turn,
        serviceInstanceId: assistantServiceIdentity().instanceId,
        protocolVersions: assistantServiceIdentity().protocolVersions,
        ...(reservedPublicQuota ? { publicQuota: reservedPublicQuota } : {}),
      });
    } catch (error) {
      const publicQuota = reservedPublicQuota ? await quotaService.release(quotaSubject) : null;
      const safe = safeProblem(error, signal?.aborted, validated.context.scope.route);
      return response(safe.status, {
        problem: safe.problem,
        ...(safe.code ? { code: safe.code } : {}),
        ...(publicQuota ? { publicQuota } : {}),
      });
    }
  };
}

export const handleAssistantRequest = createAssistantCore();
