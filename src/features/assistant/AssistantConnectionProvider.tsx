import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  connectDeepSeek,
  AssistantRequestError,
  fetchAssistantCapability,
  requestAssistantTurn as requestAssistantTurnFromApi,
} from './assistantClient';
import type {
  AssistantCapability,
  AssistantConnectionResult,
  AssistantConnectionStatus,
  AssistantContextSnapshot,
  AssistantProviderTurn,
  AssistantPublicQuota,
  AssistantWireTurn,
} from './assistantTypes';

type TurnInput = {
  turns: AssistantWireTurn[];
  context: AssistantContextSnapshot;
  consentScope?: 'engineering' | 'import';
  signal?: AbortSignal;
};

type AssistantConnectionValue = {
  capability: AssistantCapability | null;
  status: AssistantConnectionStatus;
  connected: boolean;
  usingPersonalKey: boolean;
  publicQuota: AssistantPublicQuota | null;
  hasOutboundConsent: (scope: 'engineering' | 'import', authorityHash: string) => boolean;
  generation: number;
  serviceProblem: string | null;
  connect: (apiKey: string) => Promise<AssistantConnectionResult>;
  cancelConnection: () => void;
  disconnect: () => void;
  usePublicAccess: () => void;
  ensureService: () => void;
  retryService: () => void;
  grantOutboundConsent: (scope: 'engineering' | 'import', authorityHash: string) => void;
  requestTurn: (input: TurnInput) => Promise<AssistantProviderTurn>;
};

const AssistantConnectionContext = createContext<AssistantConnectionValue | null>(null);

export function getAssistantTurnAccessProblem(input: {
  capability: AssistantCapability | null;
  status: AssistantConnectionStatus;
  outboundConsent: boolean;
  hasApiKey: boolean;
  requiresApiKey: boolean;
  usingPersonalKey?: boolean;
  publicQuota?: AssistantPublicQuota | null;
}) {
  if (!input.capability?.serviceAvailable || input.status !== 'connected') {
    return '请先连接 DeepSeek。';
  }
  if (input.capability.provider === 'deepseek' && input.requiresApiKey && !input.hasApiKey) {
    return '请先连接 DeepSeek。';
  }
  if (input.capability.provider === 'deepseek' && !input.usingPersonalKey) {
    if (input.publicQuota?.status === 'exhausted') return '今日公共 AI 额度已用完，可明日再试或使用自己的 DeepSeek Key。';
    if (input.publicQuota?.status === 'unavailable') return '公共 AI 次数服务暂不可用，请稍后重试或使用自己的 DeepSeek Key。';
  }
  if (input.capability.provider === 'deepseek' && !input.outboundConsent) {
    return '请先确认本次工程数据发送范围。';
  }
  return null;
}

function localKeyProblem(apiKey: string) {
  const normalized = apiKey.trim();
  if (!normalized) return '请输入 DeepSeek API Key。';
  if (normalized.length < 20 || normalized.length > 256 || !normalized.startsWith('sk-')) {
    return '这不像有效的 DeepSeek API Key，请检查后重试。';
  }
  if (/\s/.test(normalized)) return 'API Key 中不能包含空格或换行。';
  return null;
}

export function AssistantConnectionProvider({ children }: { children: ReactNode }) {
  const apiKeyRef = useRef('');
  const capabilityAbortRef = useRef<AbortController | null>(null);
  const validationAbortRef = useRef<AbortController | null>(null);
  const turnAbortControllersRef = useRef(new Set<AbortController>());
  const generationRef = useRef(0);
  const [capability, setCapability] = useState<AssistantCapability | null>(null);
  const [status, setStatus] = useState<AssistantConnectionStatus>('checking-service');
  const [outboundConsentReceipts, setOutboundConsentReceipts] = useState<string[]>([]);
  const [usingPersonalKey, setUsingPersonalKey] = useState(false);
  const [generation, setGeneration] = useState(0);

  const abortTurns = useCallback(() => {
    for (const controller of turnAbortControllersRef.current) controller.abort('assistant-connection-changed');
    turnAbortControllersRef.current.clear();
  }, []);

  const bumpGeneration = useCallback(() => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
  }, []);

  const checkService = useCallback((force = false) => {
    if (!force && capability) return;
    const controller = new AbortController();
    capabilityAbortRef.current?.abort();
    capabilityAbortRef.current = controller;
    setCapability(null);
    setStatus('checking-service');
    void fetchAssistantCapability(controller.signal)
      .then((nextCapability) => {
        if (controller.signal.aborted) return;
        setCapability(nextCapability);
        if (!nextCapability.serviceAvailable) {
          setStatus('service-error');
          return;
        }
        if (!nextCapability.requiresApiKey) {
          apiKeyRef.current = '';
          setUsingPersonalKey(false);
          setOutboundConsentReceipts([]);
          setStatus('connected');
          bumpGeneration();
          return;
        }
        setStatus(apiKeyRef.current ? 'connected' : 'idle');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCapability({
          serviceAvailable: false,
          provider: 'deepseek',
          model: null,
          requiresApiKey: true,
          reason: '本机 AI 服务尚未启动；原专业流程仍可正常使用。',
        });
        setStatus('service-error');
      });
  }, [bumpGeneration, capability]);

  useEffect(() => () => {
    capabilityAbortRef.current?.abort();
    validationAbortRef.current?.abort();
    abortTurns();
    apiKeyRef.current = '';
  }, [abortTurns]);

  const connect = useCallback(async (apiKey: string): Promise<AssistantConnectionResult> => {
    const normalized = apiKey.trim();
    const problem = localKeyProblem(normalized);
    if (problem) return { ok: false, problem };
    if (!capability?.serviceAvailable || capability.provider !== 'deepseek') {
      return { ok: false, problem: 'DeepSeek 转发服务尚未就绪，请先重新检测。' };
    }
    validationAbortRef.current?.abort();
    abortTurns();
    const controller = new AbortController();
    validationAbortRef.current = controller;
    const previousKey = apiKeyRef.current;
    setStatus('validating');
    const result = await connectDeepSeek({ apiKey: normalized, signal: controller.signal });
    if (validationAbortRef.current !== controller) return { ok: false, problem: '已取消连接验证。' };
    validationAbortRef.current = null;
    if (!result.ok) {
      setStatus(previousKey ? 'connected' : 'idle');
      return result;
    }
    apiKeyRef.current = normalized;
    setUsingPersonalKey(true);
    setOutboundConsentReceipts([]);
    setStatus('connected');
    bumpGeneration();
    return { ok: true };
  }, [abortTurns, bumpGeneration, capability]);

  const cancelConnection = useCallback(() => {
    validationAbortRef.current?.abort('cancelled-by-user');
    validationAbortRef.current = null;
    setStatus(apiKeyRef.current ? 'connected' : 'idle');
  }, []);

  const disconnect = useCallback(() => {
    validationAbortRef.current?.abort('disconnected-by-user');
    validationAbortRef.current = null;
    abortTurns();
    apiKeyRef.current = '';
    setUsingPersonalKey(false);
    setOutboundConsentReceipts([]);
    setStatus(capability?.serviceAvailable
      ? capability.requiresApiKey ? 'idle' : 'connected'
      : 'service-error');
    bumpGeneration();
  }, [abortTurns, bumpGeneration, capability]);
  const usePublicAccess = useCallback(() => {
    if (!capability?.serviceAvailable || capability.requiresApiKey) return;
    disconnect();
  }, [capability, disconnect]);

  const retryService = useCallback(() => {
    checkService(true);
  }, [checkService]);
  const ensureService = useCallback(() => {
    checkService(false);
  }, [checkService]);

  const requestTurn = useCallback(async (input: TurnInput) => {
    const apiKey = capability?.provider === 'mock' || !usingPersonalKey
      ? undefined
      : apiKeyRef.current;
    const consentScope = input.consentScope ?? 'engineering';
    const consentReceipt = `${consentScope}:${input.context.scope.authorityHash}`;
    const accessProblem = getAssistantTurnAccessProblem({
      capability,
      status,
      outboundConsent: capability?.provider === 'mock' || outboundConsentReceipts.includes(consentReceipt),
      hasApiKey: capability?.provider === 'mock' || Boolean(apiKey),
      requiresApiKey: Boolean(capability?.requiresApiKey),
      usingPersonalKey,
      publicQuota: capability?.serviceAvailable ? capability.publicQuota ?? null : null,
    });
    if (accessProblem) throw new Error(accessProblem);
    const controller = new AbortController();
    const requestGeneration = generationRef.current;
    const abortFromCaller = () => controller.abort(input.signal?.reason);
    input.signal?.addEventListener('abort', abortFromCaller, { once: true });
    turnAbortControllersRef.current.add(controller);
    try {
      let result: AssistantProviderTurn;
      try {
        result = await requestAssistantTurnFromApi({
          apiKey,
          turns: input.turns,
          context: input.context,
          signal: controller.signal,
        });
      } catch (error) {
        if (!usingPersonalKey && error instanceof AssistantRequestError && error.publicQuota) {
          setCapability((current) => current?.serviceAvailable
            ? { ...current, publicQuota: error.publicQuota }
            : current);
        }
        throw error;
      }
      if (!usingPersonalKey && result.publicQuota) {
        setCapability((current) => current?.serviceAvailable
          ? { ...current, publicQuota: result.publicQuota }
          : current);
      }
      if (requestGeneration !== generationRef.current) {
        throw new DOMException('连接已变化。', 'AbortError');
      }
      if (
        capability?.instanceId
        && result.serviceInstanceId
        && result.serviceInstanceId !== capability.instanceId
      ) {
        throw new Error('AI 服务已重新启动，请重新检测后再判断当前文件。');
      }
      if (
        capability?.protocolVersions
        && result.protocolVersions
        && !capability.protocolVersions.every((version) => result.protocolVersions?.includes(version))
      ) {
        throw new Error('AI 服务协议已经变化，请重新检测后再试。');
      }
      return result;
    } finally {
      turnAbortControllersRef.current.delete(controller);
      input.signal?.removeEventListener('abort', abortFromCaller);
    }
  }, [capability, outboundConsentReceipts, status, usingPersonalKey]);

  const value = useMemo<AssistantConnectionValue>(() => ({
    capability,
    status,
    connected: status === 'connected',
    usingPersonalKey,
    publicQuota: capability?.serviceAvailable ? capability.publicQuota ?? null : null,
    hasOutboundConsent: (scope, authorityHash) => (
      capability?.provider === 'mock'
      || outboundConsentReceipts.includes(`${scope}:${authorityHash}`)
    ),
    generation,
    serviceProblem: capability && !capability.serviceAvailable ? capability.reason : null,
    connect,
    cancelConnection,
    disconnect,
    usePublicAccess,
    ensureService,
    retryService,
    grantOutboundConsent: (scope, authorityHash) => setOutboundConsentReceipts((current) => (
      current.includes(`${scope}:${authorityHash}`) ? current : [...current, `${scope}:${authorityHash}`]
    )),
    requestTurn,
  }), [
    capability,
    cancelConnection,
    ensureService,
    connect,
    disconnect,
    generation,
    outboundConsentReceipts,
    requestTurn,
    retryService,
    status,
    usingPersonalKey,
    usePublicAccess,
  ]);

  return (
    <AssistantConnectionContext.Provider value={value}>
      {children}
    </AssistantConnectionContext.Provider>
  );
}

export function useAssistantConnection() {
  const value = useContext(AssistantConnectionContext);
  if (!value) throw new Error('useAssistantConnection must be used inside AssistantConnectionProvider.');
  return value;
}
