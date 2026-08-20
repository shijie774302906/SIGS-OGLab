import { randomUUID } from 'node:crypto';

export const ASSISTANT_SERVICE_ID = 'sigs-oglab-assistant';
export const ASSISTANT_BUILD_ID = 'process157-quick-ai-import-v2';
export const ASSISTANT_PROTOCOL_VERSIONS = Object.freeze([
  'sigs.assistant/1',
  'sigs.ai-import/2',
]);
export const ASSISTANT_INSTANCE_ID = randomUUID();

export function assistantServiceIdentity() {
  return {
    serviceId: ASSISTANT_SERVICE_ID,
    buildId: ASSISTANT_BUILD_ID,
    instanceId: ASSISTANT_INSTANCE_ID,
    protocolVersions: [...ASSISTANT_PROTOCOL_VERSIONS],
  };
}
