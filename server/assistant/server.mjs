import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { assistantServerConfig } from './config.mjs';
import { createAssistantCore } from './core.mjs';
import { createAssistantQuotaService, createAssistantVisitor } from './quota.mjs';
import { createVisitorAnalyticsService, resolveVisitorRegion } from '../analytics/visitor-analytics.mjs';

function writeJson(response, status, payload, origin) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  });
  response.end(JSON.stringify(payload));
}

function allowedOrigin(origin, headers = {}) {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const forwardedHost = String(headers['x-forwarded-host'] ?? '').split(',')[0].trim().toLowerCase();
    const requestHost = String(forwardedHost || headers.host || '').trim().toLowerCase();
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) && parsed.host.toLowerCase() !== requestHost) return null;
    return origin;
  } catch {
    return null;
  }
}

function readBody(request, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('请求内容过大。'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(Object.assign(new Error('请求 JSON 无效。'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

export function createNodeAssistantServer({
  config = assistantServerConfig,
  fetchImpl = fetch,
} = {}) {
  const quotaService = createAssistantQuotaService({ config, fetchImpl });
  const core = createAssistantCore({ config, fetchImpl, quotaService });
  const analytics = createVisitorAnalyticsService({ config, fetchImpl });
  let concurrentRequests = 0;

  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/healthz') {
      writeJson(response, 200, { status: 'ready' });
      return;
    }
    const visitor = createAssistantVisitor({
      cookieHeader: request.headers.cookie,
      secret: config.assistantVisitorSecret,
      secure: config.secureCookies,
    });
    if (visitor.setCookie) response.setHeader('Set-Cookie', visitor.setCookie);
    const origin = allowedOrigin(request.headers.origin, request.headers);
    if (request.headers.origin && !origin) {
      writeJson(response, 403, { problem: '不允许的请求来源。' });
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
        'Access-Control-Allow-Headers': 'Content-Type, X-DeepSeek-Api-Key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '300',
      });
      response.end();
      return;
    }
    if (url.pathname === '/api/visits') {
      if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        writeJson(response, 405, { status: 'unavailable', totals: null, regions: [] }, origin);
        return;
      }
      const snapshot = await analytics.record(visitor.subject, resolveVisitorRegion(request.headers));
      writeJson(response, 200, snapshot, origin);
      return;
    }
    if (concurrentRequests >= config.maxConcurrentRequests) {
      writeJson(response, 429, { problem: '当前已有 AI 请求正在处理，请稍后重试。' }, origin);
      return;
    }

    concurrentRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), config.requestTimeoutMs);
    const abortFromClient = () => controller.abort('client-aborted');
    request.once('aborted', abortFromClient);
    try {
      const body = request.method === 'POST'
        ? await readBody(request, config.maxBodyBytes)
        : null;
      const result = await core({
        method: request.method || 'GET',
        pathname: url.pathname,
        headers: request.headers,
        body,
        signal: controller.signal,
        quotaSubject: visitor.subject,
      });
      writeJson(response, result.status, result.body, origin);
    } catch (error) {
      const status = Number(error?.status) || (controller.signal.aborted ? 504 : 500);
      writeJson(response, status, {
        problem: status === 413
          ? '请求内容过大。'
          : status === 400
            ? '请求 JSON 无效。'
            : controller.signal.aborted
              ? '模型响应超时；没有执行任何修改。'
              : 'AI 服务暂时不可用；没有执行任何修改。',
      }, origin);
    } finally {
      clearTimeout(timeout);
      request.removeListener('aborted', abortFromClient);
      concurrentRequests -= 1;
    }
  });
}

export function startAssistantServer(config = assistantServerConfig) {
  const server = createNodeAssistantServer({ config });
  server.listen(config.port, config.host, () => {
    const provider = config.provider === 'mock' ? 'mock' : 'deepseek（等待用户连接）';
    process.stdout.write(`SIGS-OGLab assistant BFF: http://${config.host}:${config.port} · ${provider}\n`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = startAssistantServer();
  const close = () => server.close(() => process.exit(0));
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}
