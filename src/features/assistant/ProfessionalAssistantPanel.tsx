import {
  Bot,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Unplug,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAssistantConnection } from './AssistantConnectionProvider';
import { AssistantPublicQuotaNote, publicAssistantQuotaReady } from './AssistantPublicQuotaNote';
import { assistantSessionReducer, initialAssistantSessionState } from './assistantState';
import {
  executeAssistantReadTool,
  isAssistantMutationTool,
  isAssistantReadTool,
  proposalFromAssistantTool,
} from './assistantToolRegistry';
import type {
  AssistantProposal,
  AssistantUiMessage,
  AssistantWireTurn,
  AssistantWorkspacePort,
} from './assistantTypes';

function messageId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}:${crypto.randomUUID()}`
    : `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

const BASE_QUICK_PROMPTS = ['现在做到哪一步？', '当前有哪些问题需要处理？'];

export function ProfessionalAssistantPanel({ port }: { port: AssistantWorkspacePort }) {
  const connection = useAssistantConnection();
  const capability = connection.capability;
  const [input, setInput] = useState('');
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionDialogMode, setConnectionDialogMode] = useState<'connect' | 'replace'>('connect');
  const [connectionProblem, setConnectionProblem] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [state, dispatch] = useReducer(assistantSessionReducer, initialAssistantSessionState);
  const requestAbortRef = useRef<AbortController | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const connectionGenerationRef = useRef(connection.generation);
  const context = port.getContext();
  const contextKey = `${context.scope.projectId}:${context.scope.pointId}:${context.scope.route}:${context.scope.authorityHash}`;
  const outboundConsent = connection.hasOutboundConsent('engineering', context.scope.authorityHash);
  const currentContextKeyRef = useRef(contextKey);
  const previousContextScopeRef = useRef({
    projectId: context.scope.projectId,
    pointId: context.scope.pointId,
    route: context.scope.route,
  });
  const visibleScopeResetPendingRef = useRef(false);

  useEffect(() => {
    connection.ensureService();
  }, [connection.ensureService]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.messages.length, state.proposal, state.status]);

  useEffect(() => {
    if (connectionGenerationRef.current === connection.generation) return;
    connectionGenerationRef.current = connection.generation;
    requestAbortRef.current?.abort('assistant-connection-changed');
    if (connection.connected && !state.turns.length && !state.proposal) return;
    dispatch({
      type: 'context-changed',
      message: {
        id: messageId('assistant-connection'),
        role: 'system',
        content: connection.connected
          ? '密钥已更换，之后的提问将使用新密钥。'
          : 'DeepSeek 已断开；旧对话已结束，项目未发生修改。',
      },
    });
  }, [connection.connected, connection.generation, state.proposal, state.turns.length]);

  useEffect(() => {
    if (currentContextKeyRef.current === contextKey) return;
    const previousScope = previousContextScopeRef.current;
    const sameVisibleScope = previousScope.projectId === context.scope.projectId
      && previousScope.pointId === context.scope.pointId
      && previousScope.route === context.scope.route;
    if (!sameVisibleScope) visibleScopeResetPendingRef.current = true;
    currentContextKeyRef.current = contextKey;
    previousContextScopeRef.current = {
      projectId: context.scope.projectId,
      pointId: context.scope.pointId,
      route: context.scope.route,
    };
    requestAbortRef.current?.abort('context-changed');
    dispatch({
      type: 'context-changed',
      preserveAppliedReceipt: sameVisibleScope,
      message: {
        id: messageId('assistant-context'),
        role: 'system',
        content: visibleScopeResetPendingRef.current
          ? '当前项目、点位或页面已变化；旧对话已结束，不会带入当前请求。'
          : '工作区已更新；后续提问将读取新状态。',
      },
    });
  }, [contextKey]);

  const providerLabel = useMemo(() => {
    if (!capability || connection.status === 'checking-service') return '正在检测 AI 服务…';
    if (!capability.serviceAvailable) return 'AI 服务暂不可用';
    if (!connection.connected) return 'DeepSeek · 尚未连接';
    if (capability.provider === 'deepseek') {
      const access = connection.usingPersonalKey ? '自己的 Key' : '公共额度';
      return outboundConsent ? `DeepSeek · ${access}` : `DeepSeek · ${access}待启用`;
    }
    return '测试模型 · 已连接';
  }, [capability, connection.connected, connection.status, connection.usingPersonalKey, outboundConsent]);
  const assistantEnabled = Boolean(
    capability?.serviceAvailable
    && connection.connected
    && (capability.provider === 'mock' || outboundConsent)
    && publicAssistantQuotaReady({
      provider: capability?.provider,
      usingPersonalKey: connection.usingPersonalKey,
      quota: connection.publicQuota,
    }),
  );
  const quickPrompts = useMemo(
    () => context.selectedLayer
      ? [...BASE_QUICK_PROMPTS, '解释当前选中的土层']
      : BASE_QUICK_PROMPTS,
    [context.selectedLayer],
  );

  async function advance(turns: AssistantWireTurn[]) {
    if (!capability?.serviceAvailable || !assistantEnabled) {
      dispatch({
        type: 'fail',
        problem: capability && !capability.serviceAvailable ? capability.reason : '请先连接并启用本次助手。',
      });
      return;
    }
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const requestContextKey = currentContextKeyRef.current;
    let nextTurns = turns;
    try {
      for (let step = 0; step < 4; step += 1) {
        const response = await connection.requestTurn({
          turns: nextTurns,
          context: port.getContext(),
          signal: controller.signal,
        });
        if (requestContextKey !== currentContextKeyRef.current) return;
        if (response.kind === 'message') {
          const content = response.content.trim() || '本次没有可显示的回答，请换一种说法。';
          dispatch({
            type: 'append',
            turns: [{ role: 'assistant', content }],
            messages: [{ id: messageId('assistant'), role: 'assistant', content }],
          });
          return;
        }
        const assistantTurn: AssistantWireTurn = {
          role: 'assistant',
          content: response.content,
          toolCalls: response.calls,
          reasoningContent: response.reasoningContent,
        };
        const mutationCalls = response.calls.filter((call) => isAssistantMutationTool(call.name));
        const readCalls = response.calls.filter((call) => isAssistantReadTool(call.name));
        const unknownCalls = response.calls.filter((call) =>
          !isAssistantMutationTool(call.name) && !isAssistantReadTool(call.name));
        if (unknownCalls.length) {
          throw new Error(`助手请求了未允许的工具：${unknownCalls.map((call) => call.name).join('、')}。`);
        }
        if (mutationCalls.length) {
          if (mutationCalls.length !== 1 || readCalls.length) {
            throw new Error('一次只能提出一项修改；本次没有执行任何修改。');
          }
          if (requestContextKey !== currentContextKeyRef.current) return;
          const proposalResult = proposalFromAssistantTool(mutationCalls[0], port.getContext());
          if (!proposalResult.ok) throw new Error(proposalResult.problem);
          const message: AssistantUiMessage = {
            id: messageId('assistant-proposal'),
            role: 'assistant',
            content: '我整理了一项修改建议。请先查看变化和影响，再决定是否执行。',
          };
          dispatch({ type: 'propose', proposal: proposalResult.proposal, assistantTurn, message });
          return;
        }
        if (!readCalls.length) throw new Error('助手没有给出可处理的回答。');
        const toolTurns: AssistantWireTurn[] = [];
        const evidenceMessages: AssistantUiMessage[] = [];
        for (const call of readCalls) {
          if (requestContextKey !== currentContextKeyRef.current) return;
          const result = executeAssistantReadTool(call, port);
          toolTurns.push({
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify(result.ok ? result.result : { error: result.problem }),
          });
          evidenceMessages.push({
            id: messageId('assistant-evidence'),
            role: 'system',
            content: result.ok ? result.detail : result.problem,
          });
        }
        dispatch({ type: 'append', turns: [assistantTurn, ...toolTurns], messages: evidenceMessages });
        nextTurns = [...nextTurns, assistantTurn, ...toolTurns];
      }
      throw new Error('助手连续读取次数过多，请缩小问题范围后重试。');
    } catch (error) {
      if (requestContextKey !== currentContextKeyRef.current) return;
      if (
        controller.signal.aborted
        || (error instanceof DOMException && error.name === 'AbortError')
      ) {
        dispatch({
          type: 'cancel-request',
          message: {
            id: messageId('assistant-request-cancelled'),
            role: 'system',
            content: '已停止本轮回答，项目未发生修改。',
          },
        });
      }
      else dispatch({ type: 'fail', problem: error instanceof Error ? error.message : 'AI 服务暂时不可用。' });
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
    }
  }

  function openConnectionDialog() {
    setConnectionDialogMode(connection.connected ? 'replace' : 'connect');
    setConnectionProblem(null);
    setShowKey(false);
    setConnectionDialogOpen(true);
    window.setTimeout(() => keyInputRef.current?.focus(), 0);
  }

  function closeConnectionDialog() {
    if (connection.status === 'validating') connection.cancelConnection();
    if (keyInputRef.current) keyInputRef.current.value = '';
    setConnectionProblem(null);
    setShowKey(false);
    setConnectionDialogOpen(false);
  }

  async function submitConnection() {
    const apiKey = keyInputRef.current?.value ?? '';
    setConnectionProblem(null);
    const result = await connection.connect(apiKey);
    if (!result.ok) {
      if (result.problem !== '已取消连接验证。') setConnectionProblem(result.problem);
      return;
    }
    if (keyInputRef.current) keyInputRef.current.value = '';
    setShowKey(false);
    setConnectionDialogOpen(false);
  }

  function sendMessage(content: string) {
    const normalized = content.trim();
    if (!normalized || state.status === 'loading' || state.status === 'applying' || state.proposal) return;
    const turn: AssistantWireTurn = { role: 'user', content: normalized };
    const message: AssistantUiMessage = { id: messageId('user'), role: 'user', content: normalized };
    const nextTurns = [...state.turns, turn];
    visibleScopeResetPendingRef.current = false;
    dispatch({ type: 'send', message, turn });
    setInput('');
    void advance(nextTurns);
  }

  function cancelProposal(proposal: AssistantProposal) {
    dispatch({
      type: 'proposal-clear',
      turn: { role: 'tool', toolCallId: proposal.toolCallId, content: JSON.stringify({ status: 'rejected-by-user' }) },
      message: { id: messageId('assistant-cancel'), role: 'system', content: '已取消，没有修改项目。' },
    });
  }

  async function confirmProposal(proposal: AssistantProposal) {
    const validation = port.validateProposal(proposal);
    if (!validation.ok) {
      dispatch({
        type: 'proposal-clear',
        turn: {
          role: 'tool',
          toolCallId: proposal.toolCallId,
          content: JSON.stringify({ status: validation.reason }),
        },
        message: { id: messageId('assistant-rejected'), role: 'system', content: validation.problem },
      });
      return;
    }
    dispatch({ type: 'apply-start' });
    const result = await port.executeProposal(validation.proposal);
    if (!result.ok) {
      dispatch({
        type: 'proposal-clear',
        turn: {
          role: 'tool',
          toolCallId: proposal.toolCallId,
          content: JSON.stringify({ status: 'not-applied' }),
        },
        message: {
          id: messageId('assistant-not-applied'),
          role: 'system',
          content: `${result.problem} 没有执行本次修改，请重新生成建议。`,
        },
      });
      return;
    }
    const proposalContextKey = `${proposal.scope.projectId}:${proposal.scope.pointId}:${proposal.scope.route}:${proposal.scope.authorityHash}`;
    const contextChangedAfterApply = currentContextKeyRef.current !== proposalContextKey;
    dispatch({
      type: 'proposal-clear',
      turn: contextChangedAfterApply ? undefined : {
          role: 'tool',
          toolCallId: proposal.toolCallId,
          content: JSON.stringify({ status: 'applied', message: result.message, authorityHash: result.authorityHash }),
        },
      message: {
        id: messageId('assistant-applied'),
        role: 'system',
        content: result.message,
        detail: '请在中心区复核后选择“设为当前分层修订”；提交前可撤销。',
      },
    });
  }

  return (
    <section className="assistant-dock" data-testid="professional-assistant-panel">
      <header className="assistant-dock-context">
        <div className="assistant-dock-icon"><Bot aria-hidden="true" /></div>
        <div><strong>当前范围</strong><span>{context.scope.pointName} · {context.scope.routeLabel}</span></div>
      </header>
      <div className="assistant-safety-note">
        <ShieldCheck aria-hidden="true" />
        <div><strong>建议，不代表工程采纳</strong><span>启用后，助手可按你的提问读取当前范围；任何修改都先预览并由你确认。</span></div>
      </div>
      {!capability || capability.serviceAvailable ? (
        <div className={`assistant-provider ${connection.connected ? 'available' : ''}`} data-testid="assistant-provider-status">
          <span title={connection.connected && capability?.serviceAvailable ? capability.model : undefined}>{providerLabel}</span>
          {connection.connected ? (
            <div className="assistant-provider-actions">
              <Check aria-label="已连接" />
              {capability?.provider === 'deepseek' ? (
                <>
                  <button type="button" onClick={openConnectionDialog}>
                    {connection.usingPersonalKey ? '更换密钥' : '使用自己的 Key'}
                  </button>
                  {connection.usingPersonalKey && capability.publicAccess ? (
                    <button type="button" onClick={() => connection.usePublicAccess()}><Unplug aria-hidden="true" />改用公共额度</button>
                  ) : connection.usingPersonalKey ? (
                    <button type="button" onClick={() => connection.disconnect()}><Unplug aria-hidden="true" />断开</button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <AssistantPublicQuotaNote quota={connection.publicQuota} usingPersonalKey={connection.usingPersonalKey} />
      {capability && !capability.serviceAvailable ? (
        <div className="assistant-consent assistant-disconnected" data-testid="assistant-disconnected">
          <strong>AI 服务暂不可用</strong>
          <p>{capability.reason} 启动后选择“重新检测”。</p>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => connection.retryService()}
          >
            重新检测
          </button>
        </div>
      ) : null}
      {capability?.serviceAvailable && capability.provider === 'deepseek' && !connection.connected ? (
        <div className="assistant-consent assistant-connect-card" data-testid="assistant-connect-card">
          <strong>连接你自己的 DeepSeek</strong>
          <p>目前仅支持 DeepSeek。API Key 仅本次打开有效，刷新、关闭或断开后自动清除。</p>
          <button type="button" className="toolbar-button primary" onClick={openConnectionDialog} data-testid="assistant-open-key-dialog">
            <KeyRound aria-hidden="true" />连接 DeepSeek
          </button>
        </div>
      ) : null}
      {capability?.serviceAvailable && capability.provider === 'deepseek' && connection.connected && !outboundConsent ? (
        <div className="assistant-consent" data-testid="assistant-outbound-consent">
          <strong>发送哪些数据？</strong>
          <p>提问时会发送当前项目/点位的工程摘要。不会发送上传文件或整孔数据。</p>
          <details className="assistant-consent-details">
            <summary>查看发送范围</summary>
            <p>包括项目/点位名称、当前页面、流程状态、土层编号与深度、土类、待复核状态及当前选中对象，最多 80 层。只有查看曲线时，才会额外发送不超过 20 m、最多 120 行的 qc、fs、u2 数据窗口。切换项目、点位或修订会结束当前对话。</p>
          </details>
          <button type="button" className="toolbar-button primary" onClick={() => connection.grantOutboundConsent('engineering', context.scope.authorityHash)}>
            同意上述发送范围并启用
          </button>
        </div>
      ) : null}
      <div className="assistant-messages" aria-live="polite" data-testid="assistant-messages">
        {state.messages.map((message) => (
          <article key={message.id} className={`assistant-message ${message.role}`}>
            <p>{message.content}</p>{message.detail ? <small>{message.detail}</small> : null}
          </article>
        ))}
        {state.status === 'loading' ? (
          <div className="assistant-running" data-testid="assistant-running"><LoaderCircle aria-hidden="true" />正在读取当前证据…</div>
        ) : null}
        {state.proposal ? (
          <article className="assistant-proposal" data-testid="assistant-proposal">
            <span>{state.proposal.scope.stratificationRevisionId
              ? state.proposal.draftAction === 'create'
                ? '已确认分层：将创建工作草稿'
                : '已确认分层：将更新工作草稿'
              : '未提交分层：将更新工作草稿'}</span>
            <h3>{state.proposal.title}</h3><p>{state.proposal.reason}</p>
            {state.proposal.scope.stratificationRevisionId ? (
              <small title={state.proposal.scope.stratificationRevisionId}>
                来源：当前已确认分层（{state.proposal.scope.stratificationRevisionId.slice(0, 8)}…）
              </small>
            ) : null}
            <dl>
              <div><dt>修改前</dt><dd>{state.proposal.before}</dd></div>
              <div><dt>修改后</dt><dd>{state.proposal.after}</dd></div>
            </dl>
            <small><strong>影响：</strong>{state.proposal.impact}</small>
            <div className="assistant-proposal-actions">
              <button type="button" className="toolbar-button" disabled={state.status === 'applying'} onClick={() => cancelProposal(state.proposal!)} data-testid="assistant-cancel-proposal">取消</button>
              <button type="button" className="toolbar-button primary" disabled={state.status === 'applying'} onClick={() => void confirmProposal(state.proposal!)} data-testid="assistant-confirm-proposal">
                {state.status === 'applying'
                  ? '正在执行…'
                  : state.proposal.draftAction === 'create'
                    ? '创建工作草稿并应用'
                    : '更新工作草稿'}
              </button>
            </div>
          </article>
        ) : null}
        {state.error ? (
          <article className="assistant-error" data-testid="assistant-error">
            <strong>AI 回答未完成</strong><p>{state.error}</p>
            <button type="button" className="toolbar-button" disabled={!connection.connected} onClick={() => { dispatch({ type: 'retry' }); void advance(state.turns); }}><RotateCcw aria-hidden="true" />重试</button>
          </article>
        ) : null}
        <div ref={messageEndRef} />
      </div>
      {!state.turns.length && !state.proposal ? (
        <div className="assistant-quick-prompts" data-testid="assistant-quick-prompts">
          {quickPrompts.map((prompt) => (
            <button type="button" key={prompt} disabled={!assistantEnabled} onClick={() => sendMessage(prompt)}>
              <span>{prompt}</span><ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={assistantEnabled
            ? '描述你想查看或调整的内容'
            : !capability?.serviceAvailable
              ? '请先启动本机 AI 服务'
              : !connection.connected
                ? '请先连接 DeepSeek'
                : '请先确认本次工程数据发送范围'}
          rows={3}
          disabled={!assistantEnabled || Boolean(state.proposal) || state.status === 'applying'}
          data-testid="assistant-input"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage(input);
            }
          }}
        />
        {state.status === 'loading' ? (
          <button type="button" className="assistant-send cancel" onClick={() => requestAbortRef.current?.abort()} aria-label="取消本轮" data-testid="assistant-cancel-request"><X /></button>
        ) : (
          <button type="submit" className="assistant-send" disabled={!input.trim() || !assistantEnabled || Boolean(state.proposal)} aria-label="发送" data-testid="assistant-send"><Send /></button>
        )}
      </form>
      {connectionDialogOpen ? (
        <div className="assistant-key-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && connection.status !== 'validating') closeConnectionDialog();
        }}>
          <section
            className="assistant-key-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-key-dialog-title"
            aria-busy={connection.status === 'validating'}
            data-testid="assistant-key-dialog"
          >
            <div className="assistant-key-dialog-heading">
              <div>
                <span>AI 助手 · 目前仅支持 DeepSeek</span>
                <h2 id="assistant-key-dialog-title">{connectionDialogMode === 'replace' ? '更换 DeepSeek 密钥' : '连接 DeepSeek'}</h2>
              </div>
              <button type="button" className="icon-button" aria-label="关闭连接窗口" onClick={closeConnectionDialog}><X /></button>
            </div>
            <p>{connectionDialogMode === 'replace'
              ? '验证成功后才会替换当前密钥；失败或取消仍使用原连接。'
              : '粘贴 DeepSeek API Key。仅本次打开有效，不会保存到项目或浏览器存储。'}</p>
            <label className="assistant-key-field">
              <span>DeepSeek API Key</span>
              <div>
                <input
                  ref={keyInputRef}
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-…"
                  disabled={connection.status === 'validating'}
                  data-testid="assistant-api-key-input"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void submitConnection();
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                  disabled={connection.status === 'validating'}
                  onClick={() => setShowKey((visible) => !visible)}
                >
                  {showKey ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            <a
              className="assistant-key-help"
              href="https://platform.deepseek.com/"
              target="_blank"
              rel="noreferrer"
            >
              没有 API Key？前往 DeepSeek 开放平台创建
            </a>
            <small className="assistant-key-safety"><ShieldCheck aria-hidden="true" />连接验证不会发送任何项目数据。</small>
            {connectionProblem ? <div className="assistant-key-problem" role="alert" data-testid="assistant-key-problem">{connectionProblem}</div> : null}
            <div className="assistant-key-dialog-actions">
              <button type="button" className="toolbar-button" onClick={closeConnectionDialog}>
                {connection.status === 'validating' ? '取消验证' : '取消'}
              </button>
              <button
                type="button"
                className="toolbar-button primary"
                disabled={connection.status === 'validating'}
                onClick={() => void submitConnection()}
                data-testid="assistant-connect-submit"
              >
                {connection.status === 'validating'
                  ? <><LoaderCircle className="assistant-inline-spinner" />正在验证…</>
                  : connectionDialogMode === 'replace' ? '验证并更换' : '连接并验证'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
