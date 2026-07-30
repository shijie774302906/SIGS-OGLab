import { createAssistantServerConfig } from '../../server/assistant/config.mjs';
import { createAssistantCore } from '../../server/assistant/core.mjs';

const runtimeConfig = createAssistantServerConfig(process.env);
const handleAssistantRequest = createAssistantCore({ config: runtimeConfig, fetchImpl: fetch });

export const config = {
  maxDuration: 60,
};

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(status).json(payload);
}

function requestBody(request) {
  if (request.body == null || typeof request.body === 'object') return request.body ?? null;
  if (typeof request.body !== 'string') return null;
  return request.body.trim() ? JSON.parse(request.body) : null;
}

export default async function assistantFunction(request, response) {
  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > runtimeConfig.maxBodyBytes) {
    send(response, 413, { problem: '请求内容过大。' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), runtimeConfig.requestTimeoutMs);
  const abortFromClient = () => controller.abort('client-aborted');
  request.once?.('aborted', abortFromClient);

  try {
    const pathname = new URL(request.url || '/', 'https://sigs-oglab.invalid').pathname;
    const result = await handleAssistantRequest({
      method: request.method || 'GET',
      pathname,
      headers: request.headers,
      body: request.method === 'POST' ? requestBody(request) : null,
      signal: controller.signal,
    });
    send(response, result.status, result.body);
  } catch (error) {
    const badJson = error instanceof SyntaxError;
    send(response, badJson ? 400 : controller.signal.aborted ? 504 : 500, {
      problem: badJson
        ? '请求 JSON 无效。'
        : controller.signal.aborted
          ? '模型响应超时；没有执行任何修改。'
          : 'AI 服务暂时不可用；没有执行任何修改。',
    });
  } finally {
    clearTimeout(timeout);
    request.removeListener?.('aborted', abortFromClient);
  }
}
