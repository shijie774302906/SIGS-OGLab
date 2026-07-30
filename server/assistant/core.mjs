import { assistantServerConfig } from './config.mjs';
import { validateAssistantRequest } from './policy.mjs';
import {
  requestDeepSeekTurn,
  requestMockTurn,
  validateDeepSeekConnection,
} from './providers.mjs';
import { assistantServiceIdentity } from './protocol.mjs';

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

function safeProblem(error, aborted = false) {
  const status = Number(error?.status) || (aborted ? 504 : 500);
  const safeStatus = [400, 401, 402, 413, 422, 429, 500, 502, 503, 504].includes(status)
    ? status
    : 500;
  const problem = aborted
    ? '模型响应超时；没有执行任何修改。'
    : error?.code === 'MODEL_OUTPUT_TRUNCATED'
      ? 'DeepSeek 整理内容未生成完整，请重试；原文件未修改。'
    : error?.code === 'MODEL_TOOL_FORMAT'
        ? 'DeepSeek 返回的整理格式不完整，请重试；原文件未修改。'
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
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
  };
}

export function createAssistantCore({
  config = assistantServerConfig,
  fetchImpl = fetch,
} = {}) {
  return async function handleAssistantRequest({
    method,
    pathname,
    headers,
    body,
    signal,
  }) {
    if (method === 'GET' && pathname === '/api/assistant/capabilities') {
      const publicAccess = config.provider !== 'mock' && Boolean(config.deepseekApiKey);
      return response(200, {
        ...assistantServiceIdentity(),
        serviceAvailable: true,
        provider: config.provider,
        model: config.provider === 'mock' ? 'deterministic-mock' : config.deepseekModel,
        requiresApiKey: config.provider !== 'mock' && !publicAccess,
        publicAccess,
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

    const apiKey = config.provider === 'mock'
      ? ''
      : temporaryApiKey(headers) || config.deepseekApiKey;
    if (config.provider !== 'mock' && !apiKey) {
      return response(401, { problem: '公共 AI 暂不可用，请输入自己的 DeepSeek API Key 后重试。' });
    }
    const validated = validateAssistantRequest(body);
    if (!validated.ok) return response(400, { problem: validated.problem });
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
      });
    } catch (error) {
      const safe = safeProblem(error, signal?.aborted);
      return response(safe.status, {
        problem: safe.problem,
        ...(safe.code ? { code: safe.code } : {}),
      });
    }
  };
}

export const handleAssistantRequest = createAssistantCore();
