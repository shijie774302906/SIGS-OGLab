import {
  Bot,
  Check,
  Download,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAssistantConnection } from '../assistant/AssistantConnectionProvider';
import type {
  AssistantContextSnapshot,
  AssistantToolCall,
  AssistantUiMessage,
  AssistantWireTurn,
} from '../assistant/assistantTypes';
import type { RawImportDataBlockV2 } from '../workspace/workspaceV2';
import type { WorkspaceStorageFailureDiagnosis } from '../workspace/workspaceStorageRecovery';
import {
  cleanupProposalFromImportTool,
  buildCleanedImportCsv,
  createPipelineFromImportCleanup,
  questionFromImportTool,
  readImportAssistantSource,
  summarizeImportAssistantSource,
  validateImportCleanupConfirmation,
  type ImportAssistantQuestion,
  type ImportAssistantSource,
  type ImportCleanupProposal,
} from './importAssistantDomain';
import type { CsvImportPipelineV2, PipelineContext } from './importPipeline';

type Props = {
  source: ImportAssistantSource | null;
  sourceAttachment: RawImportDataBlockV2['sourceAttachment'] | null;
  context: AssistantContextSnapshot;
  pipelineContext: PipelineContext | null;
  baseWorkspaceRevision: number | null;
  onClose: () => void;
  onConfirmPipeline: (pipeline: CsvImportPipelineV2) => Promise<boolean>;
  onPendingDraftChange?: (pending: boolean) => void;
  saveFailure?: WorkspaceStorageFailureDiagnosis | null;
  onOpenSaveFailureHelp?: () => void;
};

type PendingQuestion = {
  call: AssistantToolCall;
  question: ImportAssistantQuestion;
};

type PendingCleanup = {
  call: AssistantToolCall;
  proposal: ImportCleanupProposal;
  pipeline: CsvImportPipelineV2;
};

function messageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function ImportAssistantPanel({
  source,
  sourceAttachment,
  context,
  pipelineContext,
  baseWorkspaceRevision,
  onClose,
  onConfirmPipeline,
  onPendingDraftChange,
  saveFailure = null,
  onOpenSaveFailureHelp,
}: Props) {
  const connection = useAssistantConnection();
  const [turns, setTurns] = useState<AssistantWireTurn[]>([]);
  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [cleanup, setCleanup] = useState<PendingCleanup | null>(null);
  const [allowMeasurementEdits, setAllowMeasurementEdits] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'building' | 'saving' | 'success'>('idle');
  const [problem, setProblem] = useState('');
  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [cellEditsReviewed, setCellEditsReviewed] = useState(false);
  const [confirmationRetryAvailable, setConfirmationRetryAvailable] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionProblem, setConnectionProblem] = useState('');
  const [showKey, setShowKey] = useState(false);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const contextKeyRef = useRef('');
  const requestContext = useMemo<AssistantContextSnapshot>(() => ({
    ...context,
    assistantProfile: 'professional-governed',
    scope: {
      ...context.scope,
      route: 'import',
      routeLabel: '数据导入',
      authorityHash: `${context.scope.authorityHash}:${source?.operationId ?? 'none'}:${source?.sourceFingerprint ?? 'none'}:${allowMeasurementEdits ? 'edit' : 'format-only'}`,
    },
    importSource: source ? summarizeImportAssistantSource(source, allowMeasurementEdits) : undefined,
  }), [allowMeasurementEdits, context, source]);
  const importConsent = connection.hasOutboundConsent('import', requestContext.scope.authorityHash);
  const contextKey = `${requestContext.scope.projectId}:${requestContext.scope.pointId}:${requestContext.scope.authorityHash}:${connection.generation}`;
  contextKeyRef.current = contextKey;

  useEffect(() => {
    connection.ensureService();
  }, [connection.ensureService]);

  useEffect(() => {
    requestAbortRef.current?.abort('import-source-changed');
    setTurns([]);
    setMessages([]);
    setQuestion(null);
    setCleanup(null);
    setProblem('');
    setStatus('idle');
    setShowPreview(false);
    setCellEditsReviewed(false);
    setConfirmationRetryAvailable(false);
  }, [source?.operationId, source?.sourceFingerprint, connection.generation]);

  useEffect(() => () => requestAbortRef.current?.abort('import-assistant-unmounted'), []);
  useEffect(() => {
    onPendingDraftChange?.(Boolean(cleanup && status !== 'success'));
    return () => onPendingDraftChange?.(false);
  }, [cleanup, onPendingDraftChange, status]);

  function append(nextTurns: AssistantWireTurn[], nextMessages: AssistantUiMessage[]) {
    setTurns((current) => [...current, ...nextTurns]);
    setMessages((current) => [...current, ...nextMessages]);
  }

  async function advance(initialTurns: AssistantWireTurn[]) {
    if (!source || !sourceAttachment || !pipelineContext || baseWorkspaceRevision === null) {
      setProblem('请先上传可读取的 CSV 或 Excel 文件。');
      return;
    }
    const controller = new AbortController();
    requestAbortRef.current?.abort('new-import-assistant-turn');
    requestAbortRef.current = controller;
    const requestKey = contextKeyRef.current;
    setStatus('loading');
    setProblem('');
    let nextTurns = initialTurns;
    try {
      for (let step = 0; step < 5; step += 1) {
        const response = await connection.requestTurn({
          turns: nextTurns,
          context: requestContext,
          consentScope: 'import',
          signal: controller.signal,
        });
        if (controller.signal.aborted || requestKey !== contextKeyRef.current) return;
        if (response.kind === 'message') {
          setMessages((current) => [...current, {
            id: messageId('assistant'),
            role: 'assistant',
            content: response.content,
          }]);
          setProblem('AI 这次只给出了说明，没有生成可确认的字段整理草稿。原始文件未修改。你可以重试，或返回手动字段映射。');
          setStatus('idle');
          return;
        }
        const assistantTurn: AssistantWireTurn = {
          role: 'assistant',
          content: response.content,
          toolCalls: response.calls,
          reasoningContent: response.reasoningContent,
        };
        const readCalls = response.calls.filter((call) => call.name === 'read_import_source');
        const questionCalls = response.calls.filter((call) => call.name === 'ask_import_question');
        const cleanupCalls = response.calls.filter((call) => call.name === 'propose_import_cleanup');
        if (readCalls.length) {
          if (questionCalls.length || cleanupCalls.length || readCalls.length > 2) throw new Error('AI 一次请求了过多操作，请重试。');
          const toolTurns: AssistantWireTurn[] = [];
          const evidenceMessages: AssistantUiMessage[] = [];
          for (const call of readCalls) {
            const args = parseArguments(call);
            if (!args) throw new Error('AI 读取参数无效。');
            const result = readImportAssistantSource(source, args);
            toolTurns.push({
              role: 'tool',
              toolCallId: call.id,
              content: JSON.stringify(result.ok ? result.result : { error: result.problem }),
            });
            evidenceMessages.push({
              id: messageId('assistant-source'),
              role: 'system',
              content: result.ok ? result.detail : result.problem,
            });
          }
          append([assistantTurn, ...toolTurns], evidenceMessages);
          nextTurns = [...nextTurns, assistantTurn, ...toolTurns];
          continue;
        }
        if (questionCalls.length === 1 && !cleanupCalls.length && response.calls.length === 1) {
          const parsed = questionFromImportTool(questionCalls[0]);
          if (!parsed.ok) throw new Error(parsed.problem);
          append([assistantTurn], [{
            id: messageId('assistant-question'),
            role: 'assistant',
            content: parsed.question.prompt,
            detail: parsed.question.reason,
          }]);
          setQuestion({ call: questionCalls[0], question: parsed.question });
          setStatus('idle');
          return;
        }
        if (cleanupCalls.length === 1 && !questionCalls.length && response.calls.length === 1) {
          const parsed = cleanupProposalFromImportTool(cleanupCalls[0], source, allowMeasurementEdits);
          if (!parsed.ok) throw new Error(parsed.problem);
          setStatus('building');
          const pipeline = await createPipelineFromImportCleanup({
            proposal: parsed.proposal,
            source,
            sourceAttachment,
            context: pipelineContext,
            baseWorkspaceRevision,
            measurementAuthorization: {
              sourceFingerprint: source.sourceFingerprint,
              allowed: allowMeasurementEdits,
            },
          });
          if (requestKey !== contextKeyRef.current) return;
          if (!pipeline.readiness.canNormalize) {
            throw new Error(pipeline.readiness.reasons[0]?.message ?? '整理后的字段或单位仍不能形成导入草稿。');
          }
          append([assistantTurn], [{
            id: messageId('assistant-cleanup'),
            role: 'assistant',
            content: '整理草稿已生成。请查看识别结果和变更，再决定是否导入。',
          }]);
          setCleanup({ call: cleanupCalls[0], proposal: parsed.proposal, pipeline });
          setCellEditsReviewed(false);
          setConfirmationRetryAvailable(false);
          setStatus('idle');
          return;
        }
        throw new Error('AI 这次没有生成可确认的字段整理草稿。原始文件未修改；请重试，或返回手动字段映射。');
      }
      throw new Error('AI 连续读取次数过多，请缩小范围后重试。');
    } catch (error) {
      if (controller.signal.aborted) {
        if (requestKey === contextKeyRef.current) {
          setStatus('idle');
          setProblem('已停止本次整理。原始文件没有修改，可以重新开始或返回手动字段映射。');
        }
        return;
      }
      if (requestKey !== contextKeyRef.current) return;
      setProblem(error instanceof Error ? error.message : 'AI 整理未完成。');
      setStatus('idle');
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
    }
  }

  function sendMessage(content: string) {
    const normalized = content.trim();
    if (!normalized || status !== 'idle' || question || cleanup) return;
    const turn: AssistantWireTurn = { role: 'user', content: normalized };
    append([turn], [{ id: messageId('user'), role: 'user', content: normalized }]);
    setInput('');
    void advance([...turns, turn]);
  }

  function answerQuestion(option: ImportAssistantQuestion['options'][number]) {
    if (!question) return;
    const toolTurn: AssistantWireTurn = {
      role: 'tool',
      toolCallId: question.call.id,
      content: JSON.stringify({
        questionId: question.question.questionId,
        selectedOptionId: option.optionId,
        selectedLabel: option.label,
      }),
    };
    append([toolTurn], [{
      id: messageId('user-choice'),
      role: 'user',
      content: option.label,
      detail: option.description,
    }]);
    const nextTurns = [...turns, toolTurn];
    setQuestion(null);
    void advance(nextTurns);
  }

  function resetSession(message = '已取消本次整理，原始文件和当前项目没有变化。') {
    requestAbortRef.current?.abort('import-assistant-reset');
    setTurns([]);
    setMessages([{ id: messageId('assistant-reset'), role: 'system', content: message }]);
    setQuestion(null);
    setCleanup(null);
    setProblem('');
    setStatus('idle');
    setShowPreview(false);
    setCellEditsReviewed(false);
    setConfirmationRetryAvailable(false);
  }

  async function confirmImport() {
    if (!cleanup || !source || status !== 'idle') return;
    const confirmation = validateImportCleanupConfirmation(cleanup.proposal, source, {
      sourceFingerprint: source.sourceFingerprint,
      allowed: allowMeasurementEdits,
      cellEditsReviewed,
    });
    if (!confirmation.ok) {
      setProblem(confirmation.problem);
      return;
    }
    setStatus('saving');
    setProblem('');
    setConfirmationRetryAvailable(false);
    const accepted = await onConfirmPipeline(cleanup.pipeline);
    if (!accepted) {
      setStatus('idle');
      setConfirmationRetryAvailable(true);
      setProblem('本次导入没有保存。文件和 AI 整理结果仍保留，可以直接再次确认，不需要重新调用 AI。');
      return;
    }
    setTurns((current) => [...current, {
      role: 'tool',
      toolCallId: cleanup.call.id,
      content: JSON.stringify({ status: 'confirmed-and-imported', sourceFingerprint: cleanup.proposal.sourceFingerprint }),
    }]);
    setStatus('success');
    setMessages((current) => [...current, {
      id: messageId('assistant-imported'),
      role: 'system',
      content: '导入草稿已生成。下一步使用现有数据检查。',
    }]);
  }

  async function connect() {
    const key = keyInputRef.current?.value ?? '';
    setConnectionProblem('');
    const result = await connection.connect(key);
    if (!result.ok) {
      setConnectionProblem(result.problem);
      return;
    }
    if (keyInputRef.current) keyInputRef.current.value = '';
    setConnectionDialogOpen(false);
  }

  const canAsk = Boolean(source && sourceAttachment && pipelineContext && baseWorkspaceRevision !== null);
  const connectedLabel = connection.capability?.provider === 'mock'
    ? '测试模型 · 已连接'
    : `DeepSeek · ${connection.usingPersonalKey ? '自己的 Key' : '公共额度'}`;

  return (
    <section className="import-assistant-panel" data-testid="import-assistant-panel">
      <header className="import-assistant-heading">
        <div><span>数据导入</span><h2>AI 整理数据</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="返回导入工具"><X /></button>
      </header>
      <div className="assistant-safety-note">
        <ShieldCheck aria-hidden="true" />
        <div><strong>原文件不变</strong><span>AI 只生成新的导入草稿，确认后才进入现有导入流程。</span></div>
      </div>
      {connection.capability && !connection.capability.serviceAvailable ? (
        <div className="assistant-consent assistant-disconnected">
          <strong>AI 服务暂不可用</strong>
          <p>{connection.capability.reason}</p>
          <button type="button" className="toolbar-button" onClick={() => connection.retryService()}>重新检测</button>
        </div>
      ) : null}
      {connection.capability?.serviceAvailable && !connection.connected ? (
        <div className="assistant-consent" data-testid="import-assistant-connect">
          <strong>先连接 DeepSeek</strong>
          <p>API Key 只在本标签页内存中使用。</p>
          <button type="button" className="toolbar-button primary" onClick={() => setConnectionDialogOpen(true)}><KeyRound />连接 DeepSeek</button>
        </div>
      ) : null}
      {connection.connected ? (
        <div className="assistant-provider available" data-testid="import-assistant-provider">
          <span>{connectedLabel}</span>
          <div className="assistant-provider-actions">
            <Check />
            <button type="button" onClick={() => setConnectionDialogOpen(true)}>
              {connection.usingPersonalKey ? '更换 Key' : '使用自己的 Key'}
            </button>
            {connection.usingPersonalKey && connection.capability?.publicAccess ? (
              <button type="button" onClick={() => connection.usePublicAccess()}><Unplug />改用公共额度</button>
            ) : null}
          </div>
        </div>
      ) : null}
      {connection.connected && !importConsent ? (
        <div className="assistant-consent" data-testid="import-assistant-consent">
          <strong>发送哪些内容？</strong>
          <p>只发送工作表名称、表头和少量预览行，不发送原文件。</p>
          <details><summary>查看范围</summary><p>每次最多读取 40 行、20 列。项目、点位或来源变化后，旧建议立即失效。</p></details>
          <button type="button" className="toolbar-button primary" onClick={() => connection.grantOutboundConsent('import', requestContext.scope.authorityHash)}>同意发送</button>
        </div>
      ) : null}
      <div className="import-assistant-source" data-testid="import-assistant-source">
        <span>当前文件</span>
        <strong>{source?.fileName ?? '尚未上传文件'}</strong>
        {source ? <small>{source.sheets.length} 个工作表</small> : <small>请先在中心区上传 CSV 或 Excel</small>}
      </div>
      <details className="import-assistant-advanced">
        <summary>高级：允许提出测量值修改</summary>
        <label>
          <input
            type="checkbox"
            checked={allowMeasurementEdits}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setAllowMeasurementEdits(checked);
              if (cleanup || question || turns.length) resetSession('权限已变化，请重新整理当前文件。');
            }}
            data-testid="import-assistant-allow-value-edits"
          />
          <span>只适用于当前文件；导入前会列出每一项改动</span>
        </label>
      </details>
      <div className="assistant-messages" aria-live="polite" data-testid="import-assistant-messages">
        {!messages.length ? <article className="assistant-message system"><p>上传后直接说“帮我整理这个文件”。不清楚的地方我会给你选项。</p></article> : null}
        {messages.map((message) => (
          <article key={message.id} className={`assistant-message ${message.role}`}><p>{message.content}</p>{message.detail ? <small>{message.detail}</small> : null}</article>
        ))}
        {status === 'loading' || status === 'building' ? (
          <div className="assistant-running" data-testid="import-assistant-running"><LoaderCircle />{status === 'building' ? '正在生成导入草稿…' : '正在识别当前文件…'}</div>
        ) : null}
        {question ? (
          <article className="import-assistant-question" data-testid="import-assistant-question">
            <strong>{question.question.prompt}</strong><p>{question.question.reason}</p>
            <div>{question.question.options.map((option) => (
              <button type="button" key={option.optionId} onClick={() => answerQuestion(option)} data-testid={`import-assistant-option-${option.optionId}`}>
                <span>{option.label}{option.recommended ? <em>推荐</em> : null}</span><small>{option.description}</small>
              </button>
            ))}</div>
            <div className="import-assistant-question-fallbacks">
              <button type="button" onClick={() => resetSession('本次没有采用 AI 选择，当前文件保持不变。')}>
                <span>我不确定，先保留</span><small>不替你做决定，可稍后重新整理</small>
              </button>
              <button type="button" onClick={() => { resetSession('已返回手动导入工具，当前文件保持不变。'); onClose(); }}>
                <span>都不是，手动选择</span><small>返回原有字段和单位工具</small>
              </button>
            </div>
          </article>
        ) : null}
        {cleanup ? (
          <article className="import-assistant-cleanup" data-testid="import-assistant-cleanup">
            <span>{status === 'success' ? '已导入' : 'AI 草稿待确认'}</span>
            <h3>{cleanup.proposal.sheetName} · 表头第 {cleanup.proposal.headerRow} 行</h3>
            <p>{cleanup.proposal.cellEdits.length
              ? `${cleanup.proposal.cellEdits.length} 项测量值建议待复核；查看原值、新值和理由后才能导入。`
              : '原始单元格未修改；标准化时按下列单位换算。'}</p>
            <div className="import-assistant-mapping-summary" data-testid="import-assistant-mapping-summary">
              {cleanup.proposal.columns.map((column) => (
                <div key={`${column.targetField}:${column.sourceColumnIndex}`}>
                  <span>{sourceHeaderLabel(source, cleanup.proposal, column.sourceColumnIndex)}</span>
                  <strong>{targetLabel(column.targetField)} ({column.sourceUnit} → {standardUnit(column.targetField)})</strong>
                </div>
              ))}
            </div>
            <dl>
              <div><dt>识别字段</dt><dd>{cleanup.proposal.columns.length} 项</dd></div>
              <div><dt>可用数据</dt><dd>{cleanup.pipeline.rows.length} 行</dd></div>
              <div><dt>数据值</dt><dd>{cleanup.proposal.cellEdits.length ? `待复核 ${cleanup.proposal.cellEdits.length} 项` : '未修改'}</dd></div>
              {cleanup.pipeline.problems.some((item) => item.severity === 'issue')
                ? <div><dt>AI 整理问题</dt><dd>{cleanup.pipeline.problems.filter((item) => item.severity === 'issue').length} 项</dd></div>
                : null}
            </dl>
            <button type="button" className={cleanup.proposal.cellEdits.length && !cellEditsReviewed ? 'toolbar-button primary' : 'toolbar-button'} onClick={() => setShowPreview(true)}>
              {cleanup.proposal.cellEdits.length ? `查看并确认 ${cleanup.proposal.cellEdits.length} 项改动` : '查看字段与改动'}
            </button>
            {cleanup.proposal.cellEdits.length && cellEditsReviewed ? <small className="import-assistant-review-complete"><Check />已查看全部测量值改动</small> : null}
            {status !== 'success' && !confirmationRetryAvailable ? (
              <div className="assistant-proposal-actions">
                <button type="button" className="toolbar-button" disabled={status === 'saving'} onClick={() => resetSession()}>取消</button>
                <button type="button" className="toolbar-button primary" disabled={status === 'saving' || !cleanup.pipeline.readiness.canGenerateDrafts || (cleanup.proposal.cellEdits.length > 0 && !cellEditsReviewed)} onClick={() => void confirmImport()} data-testid="import-assistant-confirm-import">
                  {status === 'saving' ? '正在导入…' : cleanup.proposal.cellEdits.length && !cellEditsReviewed ? '先查看测量值改动' : '确认并导入'}
                </button>
              </div>
            ) : null}
          </article>
        ) : null}
        {problem ? (
          <article className="assistant-error" data-testid="import-assistant-error">
            <strong>{confirmationRetryAvailable
              ? saveFailure?.code === 'conflict' ? '先处理保存冲突' : '本次导入尚未保存'
              : '本次整理未完成'}</strong>
            <p>{confirmationRetryAvailable && saveFailure?.code === 'conflict'
              ? '文件和整理草稿已保留。请先解决其他标签页的保存冲突，再继续导入。'
              : confirmationRetryAvailable
                ? '文件和 AI 整理结果仍在，无需重新调用 AI。'
                : problem}</p>
            <div className="assistant-proposal-actions">
              {confirmationRetryAvailable ? (
                saveFailure?.code === 'conflict' ? (
                  <button type="button" className="toolbar-button" onClick={onOpenSaveFailureHelp} data-testid="import-assistant-open-save-help">打开保存冲突说明</button>
                ) : (
                  <button type="button" className="toolbar-button primary" disabled={status !== 'idle'} onClick={() => void confirmImport()} data-testid="import-assistant-retry-confirm"><RotateCcw />再次确认导入</button>
                )
              ) : (
                <>
                  <button type="button" className="toolbar-button" onClick={() => { resetSession('已返回手动字段映射，原始文件保持不变。'); onClose(); }} data-testid="import-assistant-manual-fallback">手动映射或换文件</button>
                  <button type="button" className="toolbar-button primary" disabled={!canAsk || !connection.connected || !importConsent} onClick={() => { setProblem(''); sendMessage('请重新整理当前文件。'); }}><RotateCcw />重试</button>
                </>
              )}
            </div>
          </article>
        ) : null}
      </div>
      {!cleanup && !question && status === 'idle' && !turns.length ? (
        <button
          type="button"
          className="toolbar-button primary import-assistant-start"
          disabled={!canAsk || !connection.connected || !importConsent}
          onClick={() => sendMessage('请帮我识别并整理这个文件，使其符合当前数据导入标准。')}
          data-testid="import-assistant-start"
        >
          <Bot />开始整理
        </button>
      ) : null}
      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}>
        <textarea
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={cleanup ? '请先确认或取消当前整理草稿' : '也可以说：帮我整理这个文件'}
          disabled={!canAsk || !connection.connected || !importConsent || status !== 'idle' || Boolean(question) || Boolean(cleanup)}
          data-testid="import-assistant-input"
        />
        {status === 'loading' ? (
          <button type="button" className="assistant-send cancel" onClick={() => requestAbortRef.current?.abort('cancelled-by-user')} aria-label="停止整理"><X /></button>
        ) : (
          <button type="submit" className="assistant-send" disabled={!input.trim()} aria-label="发送"><Send /></button>
        )}
      </form>
      {showPreview && cleanup ? (
        <div className="assistant-key-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPreview(false); }}>
          <section className="import-assistant-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="import-assistant-preview-title" data-testid="import-assistant-preview">
            <header><div><span>整理结果</span><h2 id="import-assistant-preview-title">{source?.fileName}</h2></div><button type="button" className="icon-button" onClick={() => setShowPreview(false)} aria-label="关闭预览"><X /></button></header>
            <div className="import-assistant-column-grid">{cleanup.proposal.columns.map((column) => (
              <article key={`${column.targetField}-${column.sourceColumnIndex}`}>
                <span>第 {column.sourceColumnIndex + 1} 列</span>
                <strong>{targetLabel(column.targetField)} · {column.sourceUnit}</strong>
                <p>{column.reason}</p>
              </article>
            ))}</div>
            {cleanup.proposal.cellEdits.length ? (
              <div className="point-table-wrap"><table className="point-table"><thead><tr><th>源行</th><th>字段列</th><th>原值</th><th>新值</th><th>理由</th></tr></thead><tbody>{cleanup.proposal.cellEdits.map((edit) => <tr key={`${edit.displayRowNumber}-${edit.sourceColumnIndex}`}><td>{edit.displayRowNumber}</td><td>{edit.sourceColumnIndex + 1}</td><td>{edit.originalValue}</td><td>{edit.newValue}</td><td>{edit.reason}</td></tr>)}</tbody></table></div>
            ) : <p className="short-note">测量值未修改。原始上传附件保持不变。</p>}
            <div className="import-assistant-preview-actions">
              <button type="button" className="toolbar-button" onClick={() => downloadCleanedCsv(cleanup.pipeline, source?.fileName ?? '整理后数据.csv')}><Download />下载整理后 CSV</button>
              <button type="button" className="toolbar-button primary" onClick={() => {
                if (cleanup.proposal.cellEdits.length) setCellEditsReviewed(true);
                setShowPreview(false);
              }}>返回确认</button>
            </div>
          </section>
        </div>
      ) : null}
      {connectionDialogOpen ? (
        <div className="assistant-key-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && connection.status !== 'validating') setConnectionDialogOpen(false); }}>
          <section className="assistant-key-dialog" role="dialog" aria-modal="true" aria-labelledby="import-assistant-key-title">
            <div className="assistant-key-dialog-heading"><div><span>目前仅支持 DeepSeek</span><h2 id="import-assistant-key-title">连接 DeepSeek</h2></div><button type="button" className="icon-button" onClick={() => setConnectionDialogOpen(false)}><X /></button></div>
            <p>API Key 仅本次打开有效，不会写入项目或浏览器存储。</p>
            <label className="assistant-key-field"><span>DeepSeek API Key</span><div><input ref={keyInputRef} type={showKey ? 'text' : 'password'} placeholder="sk-…" autoComplete="off" disabled={connection.status === 'validating'} /><button type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff /> : <Eye />}</button></div></label>
            {connectionProblem ? <div className="assistant-key-problem">{connectionProblem}</div> : null}
            <div className="assistant-key-dialog-actions"><button type="button" className="toolbar-button" onClick={() => setConnectionDialogOpen(false)}>取消</button><button type="button" className="toolbar-button primary" disabled={connection.status === 'validating'} onClick={() => void connect()}>{connection.status === 'validating' ? <><LoaderCircle />正在验证…</> : '连接并验证'}</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function parseArguments(call: AssistantToolCall) {
  try {
    const parsed = JSON.parse(call.arguments);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function targetLabel(target: string) {
  if (target === 'depthM') return 'Depth';
  if (target === 'pointName') return 'PointName';
  return target;
}

function standardUnit(target: string) {
  if (target === 'pointName') return '文本';
  if (target === 'depthM') return 'm';
  return 'kPa';
}

function sourceHeaderLabel(
  source: ImportAssistantSource | null,
  proposal: ImportCleanupProposal,
  columnIndex: number,
) {
  const sheet = source?.sheets.find((candidate) => candidate.sheetName === proposal.sheetName);
  const rawLabel = sheet?.rows[proposal.headerRow - 1]?.[columnIndex]?.trim() ?? '';
  return rawLabel.replace(/&#(?:10|x0*a);/gi, ' ').replace(/\s+/g, ' ').trim() || `第 ${columnIndex + 1} 列`;
}

function downloadCleanedCsv(pipeline: CsvImportPipelineV2, sourceName: string) {
  const csv = buildCleanedImportCsv(pipeline);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${sourceName.replace(/\.(csv|xlsx)$/i, '')}-AI整理.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
