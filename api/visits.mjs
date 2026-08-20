import { createAssistantServerConfig } from '../server/assistant/config.mjs';
import { createAssistantVisitor } from '../server/assistant/quota.mjs';
import { createVisitorAnalyticsService, resolveVisitorRegion } from '../server/analytics/visitor-analytics.mjs';

const runtimeConfig = createAssistantServerConfig(process.env);
const analytics = createVisitorAnalyticsService({ config: runtimeConfig, fetchImpl: fetch });

export default async function visitsFunction(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ status: 'unavailable', totals: null, regions: [] });
    return;
  }
  const visitor = createAssistantVisitor({
    cookieHeader: request.headers.cookie,
    secret: runtimeConfig.assistantVisitorSecret,
    secure: true,
  });
  if (visitor.setCookie) response.setHeader('Set-Cookie', visitor.setCookie);
  const snapshot = await analytics.record(visitor.subject, resolveVisitorRegion(request.headers));
  response.status(200).json(snapshot);
}
