import type {
  AssistantCapability,
  AssistantConnectionResult,
  AssistantContextSnapshot,
  AssistantProviderTurn,
  AssistantPublicQuota,
  AssistantWireTurn,
} from './assistantTypes';

export class AssistantRequestError extends Error {
  publicQuota?: AssistantPublicQuota;
  code?: string;

  constructor(message: string, options: { publicQuota?: AssistantPublicQuota; code?: string } = {}) {
    super(message);
    this.name = 'AssistantRequestError';
    this.publicQuota = options.publicQuota;
    this.code = options.code;
  }
}

const ASSISTANT_ENDPOINT = '/api/assistant';
const REQUIRED_ASSISTANT_SERVICE = 'sigs-oglab-assistant';
const REQUIRED_ASSISTANT_PROTOCOLS = ['sigs.assistant/1', 'sigs.ai-import/1'];
const ASSISTANT_TURN_TIMEOUT_MS = 65_000;

export function assistantTurnTimeoutMs() {
  return ASSISTANT_TURN_TIMEOUT_MS;
}

function clientTimeoutProblem(route: AssistantContextSnapshot['scope']['route']) {
  if (route === 'quick-report') {
    return '等待图册解读超过 65 秒。你的问题已保留，可直接重新解读；图册和数据没有改变。';
  }
  if (route === 'import' || route === 'quick-input') {
    return '等待文件整理超过 65 秒。可以直接重试；原文件没有改变。';
  }
  return '等待 AI 回答超过 65 秒。可以直接重试；没有执行任何修改。';
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) as unknown : null;
  } catch {
    throw new Error('助手接口返回了无法读取的内容。');
  }
}

export async function fetchAssistantCapability(signal?: AbortSignal): Promise<AssistantCapability> {
  try {
    const response = await fetch(`${ASSISTANT_ENDPOINT}/capabilities`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    const payload = await readJson(response) as Partial<AssistantCapability> | null;
    if (
      response.ok
      && payload
      && payload.serviceAvailable === false
      && typeof payload.reason === 'string'
    ) {
      return payload as AssistantCapability;
    }
    if (
      !response.ok
      || !payload
      || typeof payload.serviceAvailable !== 'boolean'
      || payload.serviceAvailable !== true
      || payload.serviceId !== REQUIRED_ASSISTANT_SERVICE
      || !REQUIRED_ASSISTANT_PROTOCOLS.every((version) => payload.protocolVersions?.includes(version))
    ) {
      return {
        serviceAvailable: false,
        provider: 'deepseek',
        model: null,
        requiresApiKey: true,
        publicAccess: false,
        reason: response.status === 404
          ? '本机 AI 服务尚未启动。'
          : payload?.serviceAvailable
            ? 'AI 服务版本较旧，请重启项目服务后再试。'
            : '无法读取本机 AI 服务状态。',
      };
    }
    return payload as AssistantCapability;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return {
      serviceAvailable: false,
      provider: 'deepseek',
      model: null,
      requiresApiKey: true,
      publicAccess: false,
      reason: '本机 AI 服务尚未启动；原专业流程仍可正常使用。',
    };
  }
}

function safeProblem(problem: unknown, apiKey: string, fallback: string) {
  const normalized = typeof problem === 'string' ? problem : fallback;
  return apiKey ? normalized.split(apiKey).join('[已隐藏]') : normalized;
}

export async function connectDeepSeek(input: {
  apiKey: string;
  signal?: AbortSignal;
}): Promise<AssistantConnectionResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, 15_000);
  const abort = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`${ASSISTANT_ENDPOINT}/connect`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-DeepSeek-Api-Key': input.apiKey,
      },
      signal: controller.signal,
    });
    const payload = await readJson(response) as { connected?: boolean; problem?: string } | null;
    if (!response.ok || payload?.connected !== true) {
      return {
        ok: false,
        problem: safeProblem(payload?.problem, input.apiKey, (
          response.status === 401 ? 'DeepSeek API Key 无效，请检查后重试。'
            : response.status === 402 ? 'DeepSeek 额度不足，请充值或更换 API Key。'
              : response.status === 429 ? 'DeepSeek 请求较多，请稍后重试。'
                : '无法连接 DeepSeek，请检查网络后重试。'
        )),
      };
    }
    return { ok: true };
  } catch (error) {
    if (timedOut) return { ok: false, problem: '连接验证超时，请检查网络后重试。' };
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return { ok: false, problem: '已取消连接验证。' };
    }
    return {
      ok: false,
      problem: safeProblem(
        error instanceof Error ? error.message : null,
        input.apiKey,
        '无法连接 DeepSeek，请检查网络后重试。',
      ),
    };
  } finally {
    globalThis.clearTimeout(timeout);
    input.signal?.removeEventListener('abort', abort);
  }
}

export async function requestAssistantTurn(input: {
  apiKey?: string;
  turns: AssistantWireTurn[];
  context: AssistantContextSnapshot;
  signal?: AbortSignal;
}): Promise<AssistantProviderTurn> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, assistantTurnTimeoutMs());
  const abort = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`${ASSISTANT_ENDPOINT}/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(input.apiKey ? { 'X-DeepSeek-Api-Key': input.apiKey } : {}),
      },
      body: JSON.stringify({ turns: input.turns, context: input.context }),
      signal: controller.signal,
    });
    const payload = await readJson(response) as (AssistantProviderTurn & {
      problem?: string;
      code?: string;
      publicQuota?: AssistantPublicQuota;
    }) | null;
    if (!response.ok) {
      throw new AssistantRequestError(safeProblem(payload?.problem, input.apiKey ?? '', (
        response.status === 401 ? 'DeepSeek API Key 无效，请更换后重试。'
          : response.status === 402 ? 'AI 服务额度不足；没有执行任何修改。'
            : response.status === 429 ? '请求较多，请稍后重试；没有执行任何修改。'
              : 'AI 服务暂时不可用；没有执行任何修改。'
      )), { publicQuota: payload?.publicQuota, code: payload?.code });
    }
    if (!payload || (payload.kind !== 'message' && payload.kind !== 'tool_calls')) {
      throw new Error('AI 服务返回格式无效；没有执行任何修改。');
    }
    return payload;
  } catch (error) {
    if (timedOut) {
      throw new AssistantRequestError(clientTimeoutProblem(input.context.scope.route), {
        code: 'CLIENT_TIMEOUT',
      });
    }
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new DOMException('AI 请求已取消。', 'AbortError');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    input.signal?.removeEventListener('abort', abort);
  }
}
