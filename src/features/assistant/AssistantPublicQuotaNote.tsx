import type { AssistantPublicQuota } from './assistantTypes';

export function publicAssistantQuotaReady(input: {
  provider?: 'deepseek' | 'mock';
  usingPersonalKey: boolean;
  quota: AssistantPublicQuota | null;
}) {
  return input.provider === 'mock'
    || input.usingPersonalKey
    || input.quota?.status === 'available';
}

export function AssistantPublicQuotaNote({ quota, usingPersonalKey }: {
  quota: AssistantPublicQuota | null;
  usingPersonalKey: boolean;
}) {
  if (usingPersonalKey || !quota) return null;
  if (quota.status === 'available') {
    return <div className="assistant-quota-note" data-testid="assistant-public-quota" role="status">今日剩余 {quota.remaining} 次</div>;
  }
  if (quota.status === 'exhausted') {
    return <div className="assistant-quota-note problem" data-testid="assistant-public-quota" role="status">今日公共 AI 额度已用完。明日恢复，或使用自己的 Key。</div>;
  }
  return <div className="assistant-quota-note problem" data-testid="assistant-public-quota" role="status">公共额度暂不可用，可使用自己的 Key。</div>;
}
