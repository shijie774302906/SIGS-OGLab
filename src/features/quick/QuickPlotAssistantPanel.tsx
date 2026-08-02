import {
  Bot,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  Unplug,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAssistantConnection } from '../assistant/AssistantConnectionProvider';
import { AssistantPublicQuotaNote, publicAssistantQuotaReady } from '../assistant/AssistantPublicQuotaNote';
import { AssistantRequestError } from '../assistant/assistantClient';
import type {
  AssistantContextSnapshot,
  AssistantToolCall,
  AssistantUiMessage,
  AssistantWireTurn,
} from '../assistant/assistantTypes';
import {
  readBoundedAssistantDepthWindow,
} from '../assistant/assistantContext';
import {
  extractImportAssistantSource,
  readImportAssistantSource,
  summarizeImportAssistantSource,
  type ImportAssistantSource,
} from '../import/importAssistantDomain';
import type { ProjectWorkspaceV2 } from '../workspace/workspaceV2';
import {
  quickPlotAssistantPageEvidence,
  quickPlotInputHash,
  quickPlotRoute,
  type QuickPlotPage,
  type QuickPlotWorkspaceV1,
} from './quickPlotDomain';
import {
  buildQuickPlotRowsFromProposal,
  QUICK_PLOT_IMPORT_PROTOCOL,
  quickPlotFieldLabel,
  quickPlotDecisionFromTool,
  quickPlotQuestionOptionLabel,
  quickPlotStandardUnit,
  sourceHeader,
  type QuickPlotAmbiguityConfirmation,
  type QuickPlotAssistantQuestion,
  type QuickPlotImportBuildResult,
  type QuickPlotImportProposal,
} from './quickPlotAssistantDomain';
import { QuickReportMarkdown } from './QuickReportMarkdown';

type Props = {
  open: boolean;
  mode: 'input' | 'report';
  project: ProjectWorkspaceV2;
  workspace: QuickPlotWorkspaceV1;
  pages: QuickPlotPage[];
  selectedPage: number;
  onClose: () => void;
  onImport: (
    result: QuickPlotImportBuildResult,
    sourceName: string,
    expectedWorkspaceRevision: number,
    commitKey: string,
  ) => Promise<{ ok: true } | { ok: false; problem: string }>;
};

type PendingQuestion = {
  call: AssistantToolCall;
  question: QuickPlotAssistantQuestion;
};

type PendingProposal = {
  call: AssistantToolCall;
  proposal: QuickPlotImportProposal;
  result: QuickPlotImportBuildResult;
};

export type QuickReportEvidence = {
  toolName: string;
  payload: Record<string, unknown>;
};

const QUICK_REPORT_READ_TOOLS = new Set([
  'list_quick_plot_pages',
  'read_quick_plot_page',
  'read_quick_plot_chart',
  'read_quick_plot_method',
  'read_quick_plot_depth_window',
]);

export const QUICK_REPORT_TOTAL_BUDGET_MS = 120_000;
export const QUICK_REPORT_HISTORY_ANSWER_LIMIT = 1_200;
const QUICK_REPORT_OLDER_ANSWER_LIMIT = 700;

function compactQuickReportHistoryAnswer(content: string, limit: number) {
  if (content.length <= limit) return content;
  const tailLength = 300;
  const marker = '\n…[历史回答已压缩]…\n';
  const headLength = limit - tailLength - marker.length;
  return `${content.slice(0, headLength)}${marker}${content.slice(-tailLength)}`;
}

export function trimQuickReportTurns(
  turns: AssistantWireTurn[],
  maxTurns = 12,
): AssistantWireTurn[] {
  const exchanges: AssistantWireTurn[][] = [];
  let current: AssistantWireTurn[] = [];
  for (const turn of turns) {
    if (turn.role === 'user') {
      if (current.length) exchanges.push(current);
      current = [turn];
    } else if (current.length) {
      current.push(turn);
    }
  }
  if (current.length) exchanges.push(current);
  if (!exchanges.length) return [];

  const reducedExchanges = exchanges.map((exchange, index) => {
    if (index === exchanges.length - 1) return exchange;
    const finalAnswer = [...exchange].reverse().find((turn) =>
      turn.role === 'assistant'
      && !turn.toolCalls?.length
      && typeof turn.content === 'string'
      && turn.content.trim(),
    );
    return finalAnswer
      ? [exchange[0], {
          role: 'assistant' as const,
          content: compactQuickReportHistoryAnswer(
            finalAnswer.content as string,
            index === exchanges.length - 2
              ? QUICK_REPORT_HISTORY_ANSWER_LIMIT
              : QUICK_REPORT_OLDER_ANSWER_LIMIT,
          ),
        }]
      : exchange;
  });

  const compactExchange = (exchange: AssistantWireTurn[]) => {
    const userTurn = exchange[0];
    const blocks: AssistantWireTurn[][] = [];
    for (let index = 1; index < exchange.length;) {
      const turn = exchange[index];
      if (turn.role !== 'assistant') {
        index += 1;
        continue;
      }
      const block: AssistantWireTurn[] = [turn];
      const expectedToolIds = new Set(turn.toolCalls?.map((call) => call.id) ?? []);
      index += 1;
      while (
        expectedToolIds.size
        && index < exchange.length
        && exchange[index].role === 'tool'
      ) {
        const toolTurn = exchange[index];
        if (toolTurn.role === 'tool' && expectedToolIds.has(toolTurn.toolCallId)) {
          block.push(toolTurn);
        }
        index += 1;
      }
      blocks.push(block);
    }

    const keptBlocks: AssistantWireTurn[][] = [];
    let count = 1;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (count + block.length > maxTurns) break;
      keptBlocks.unshift(block);
      count += block.length;
    }
    return [userTurn, ...keptBlocks.flat()];
  };

  const kept: AssistantWireTurn[][] = [];
  let keptTurnCount = 0;
  for (let index = reducedExchanges.length - 1; index >= 0; index -= 1) {
    const exchange = kept.length ? reducedExchanges[index] : compactExchange(reducedExchanges[index]);
    if (kept.length && keptTurnCount + exchange.length > maxTurns) break;
    kept.unshift(exchange);
    keptTurnCount += exchange.length;
  }
  return kept.flat();
}

function messageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function QuickPlotAssistantPanel({
  open,
  mode,
  project,
  workspace,
  pages,
  selectedPage,
  onClose,
  onImport,
}: Props) {
  const connection = useAssistantConnection();
  const [source, setSource] = useState<ImportAssistantSource | null>(null);
  const [turns, setTurns] = useState<AssistantWireTurn[]>([]);
  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'reading' | 'saving' | 'success'>('idle');
  const [problem, setProblem] = useState('');
  const [input, setInput] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionCategory, setCorrectionCategory] = useState('字段对应不对');
  const [correctionText, setCorrectionText] = useState('');
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionProblem, setConnectionProblem] = useState('');
  const [showKey, setShowKey] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const fileGenerationRef = useRef(0);
  const correctionCountRef = useRef(0);
  const decisionHistoryRef = useRef<string[]>([]);
  const ambiguityConfirmationsRef = useRef<QuickPlotAmbiguityConfirmation[]>([]);
  const commitLockRef = useRef(false);
  const contextKeyRef = useRef('');
  const lastReportQuestionRef = useRef('');
  const sourceIdentityRef = useRef('none');
  const activePage = pages[selectedPage] ?? null;
  const consentScope = mode === 'input' ? 'import' : 'engineering';
  const context = useMemo(
    () => buildContext(project, workspace, mode, source, activePage, selectedPage, pages),
    [activePage, mode, pages, project, selectedPage, source, workspace],
  );
  const outboundConsent = connection.hasOutboundConsent(consentScope, context.scope.authorityHash);
  const reportPageKey = mode === 'report'
    ? `${selectedPage + 1}:${activePage?.title ?? 'none'}`
    : 'not-report';
  const contextKey = `${context.scope.route}:${context.scope.authorityHash}:${reportPageKey}:${source?.operationId ?? 'none'}:${connection.generation}`;
  const assistantSessionKey = mode === 'report'
    ? `${project.projectId}:${context.scope.route}:${context.scope.authorityHash}:${connection.generation}`
    : `${context.scope.route}:${source?.operationId ?? 'none'}:${connection.generation}`;
  contextKeyRef.current = contextKey;
  sourceIdentityRef.current = source
    ? `${source.operationId}:${source.sourceFingerprint}`
    : 'none';

  useEffect(() => {
    connection.ensureService();
  }, [connection.ensureService]);

  useEffect(() => () => requestAbortRef.current?.abort('quick-assistant-unmounted'), []);

  useEffect(() => {
    if (open) return;
    requestAbortRef.current?.abort('quick-assistant-closed');
    if (status === 'reading') setStatus('idle');
  }, [open, status]);

  useEffect(() => {
    requestAbortRef.current?.abort('quick-assistant-context-changed');
    setTurns([]);
    setMessages([]);
    setQuestion(null);
    setProposal(null);
    correctionCountRef.current = 0;
    decisionHistoryRef.current = [];
    ambiguityConfirmationsRef.current = [];
    setCorrectionOpen(false);
    setCorrectionText('');
    setProblem('');
    setStatus('idle');
    lastReportQuestionRef.current = '';
  }, [assistantSessionKey]);

  async function selectFile(file: File | null) {
    if (!file || commitLockRef.current || status === 'saving') return;
    const fileGeneration = fileGenerationRef.current + 1;
    fileGenerationRef.current = fileGeneration;
    requestAbortRef.current?.abort('quick-source-changed');
    correctionCountRef.current = 0;
    decisionHistoryRef.current = [];
    ambiguityConfirmationsRef.current = [];
    setTurns([]);
    setQuestion(null);
    setProposal(null);
    setMessages([]);
    setProblem('');
    setStatus('parsing');
    try {
      const next = await extractImportAssistantSource(file, `quick-ai-${crypto.randomUUID()}`);
      if (fileGeneration !== fileGenerationRef.current) return;
      setSource(next);
      setMessages([{
        id: messageId('source'),
        role: 'system',
        content: `已读取 ${file.name}，原文件未修改。`,
        detail: `${next.sheets.length} 个工作表`,
      }]);
    } catch (error) {
      if (fileGeneration !== fileGenerationRef.current) return;
      setSource(null);
      setProblem(error instanceof Error ? error.message : '当前文件无法读取。');
    } finally {
      if (fileGeneration === fileGenerationRef.current) setStatus('idle');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function resetInputSession(note?: string) {
    requestAbortRef.current?.abort('quick-session-reset');
    correctionCountRef.current = 0;
    decisionHistoryRef.current = [];
    ambiguityConfirmationsRef.current = [];
    setTurns([]);
    setQuestion(null);
    setProposal(null);
    setCorrectionOpen(false);
    setCorrectionText('');
    setProblem('');
    setStatus('idle');
    setMessages(note ? [{ id: messageId('reset'), role: 'system', content: note }] : []);
  }

  async function startOrganizing() {
    if (!source || status !== 'idle') return;
    correctionCountRef.current = 0;
    decisionHistoryRef.current = [];
    setQuestion(null);
    setProposal(null);
    setCorrectionOpen(false);
    setProblem('');
    const userTurn: AssistantWireTurn = {
      role: 'user',
      content: '请判断当前文件用于快速出图的数据表、是否有表头、数据起止行，以及 depth、qc、可选 fs、可选 u2 的列和单位。请优先给出一份完整最佳判断；只有无法形成完整判断时才问一个问题。不要修改任何测量值。',
    };
    setTurns([userTurn]);
    setMessages((current) => [...current, {
      id: messageId('user'),
      role: 'user',
      content: '请帮我整理这个文件，用于快速出图。',
    }]);
    await advanceInput([userTurn]);
  }

  async function advanceInput(nextTurns: AssistantWireTurn[]) {
    if (!source) return;
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    const requestContextKey = contextKeyRef.current;
    const requestId = crypto.randomUUID();
    const requestContext: AssistantContextSnapshot = {
      ...context,
      importSource: context.importSource
        ? {
            ...context.importSource,
            protocolVersion: QUICK_PLOT_IMPORT_PROTOCOL,
            requestId,
            contextHash: context.scope.authorityHash,
          }
        : undefined,
    };
    setStatus('reading');
    setProblem('');
    try {
      let activeTurns = nextTurns;
      for (let step = 0; step < 6; step += 1) {
        const response = await connection.requestTurn({
          turns: activeTurns,
          context: requestContext,
          consentScope: 'import',
          signal: controller.signal,
        });
        if (requestContextKey !== contextKeyRef.current) return;
        if (response.kind === 'message') throw new Error('AI 这次没有形成可确认的文件判断，请重新判断。');
        if (response.calls.length !== 1) throw new Error('一次只能处理一项文件整理操作。');
        const call = response.calls[0];
        const assistantTurn: AssistantWireTurn = {
          role: 'assistant',
          content: response.content,
          toolCalls: response.calls,
          reasoningContent: response.reasoningContent,
        };
        if (call.name === 'read_quick_plot_source') {
          const result = readImportAssistantSource(source, parseArguments(call) ?? {});
          const toolTurn: AssistantWireTurn = {
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify(result.ok ? result.result : { problem: result.problem }),
          };
          activeTurns = [...activeTurns, assistantTurn, toolTurn];
          setTurns(activeTurns);
          if (!result.ok) throw new Error(result.problem);
          setMessages((current) => [...current, {
            id: messageId('read'),
            role: 'system',
            content: result.detail,
          }]);
          continue;
        }
        if (call.name === 'submit_quick_plot_import_decision') {
          const validation = quickPlotDecisionFromTool(call, source, {
            requestId,
            contextHash: context.scope.authorityHash,
          }, ambiguityConfirmationsRef.current);
          if (!validation.ok) throw new Error(validation.problem);
          const fingerprint = validation.decision.kind === 'question'
            ? `q:${validation.decision.question.questionId}:${JSON.stringify(validation.decision.question.options)}`
            : `p:${validation.decision.proposal.proposalHash}`;
          const repeated = decisionHistoryRef.current.at(-1) === fingerprint;
          decisionHistoryRef.current = [...decisionHistoryRef.current.slice(-3), fingerprint];
          if (repeated) {
            throw new Error('AI 连续给出了相同判断。文件没有改变，请重新开始或改用手动粘贴。');
          }
          setTurns([...activeTurns, assistantTurn]);
          if (validation.decision.kind === 'question') {
            setQuestion({ call, question: validation.decision.question });
            return;
          }
          const proposalDecision = validation.decision.proposal;
          const built = buildQuickPlotRowsFromProposal(proposalDecision, source);
          if ('problem' in built) throw new Error(built.problem);
          setProposal({ call, proposal: proposalDecision, result: built });
          setMessages((current) => [...current, {
            id: messageId('proposal'),
            role: 'assistant',
            content: proposalDecision.summary,
          }]);
          return;
        }
        throw new Error('AI 请求了不属于快速出图的操作。');
      }
      throw new Error('AI 读取步骤过多，仍未形成判断。文件没有改变，请重新判断。');
    } catch (error) {
      if (controller.signal.aborted) return;
      setProblem(error instanceof Error ? error.message : 'AI 整理暂时不可用，请稍后重试。');
    } finally {
      if (!controller.signal.aborted) setStatus('idle');
    }
  }

  async function answerQuestion(option: QuickPlotAssistantQuestion['options'][number]) {
    if (!question) return;
    if (option.decisionPatch.decisionType === 'cannot-determine') {
      setQuestion(null);
      setProblem('当前信息不足以可靠判断必需字段。文件没有改变；可以换文件、重新判断或使用手动粘贴。');
      return;
    }
    const patch = option.decisionPatch;
    if (
      patch.decisionType === 'map-column'
      && patch.sheetName
      && Number.isInteger(patch.headerRow)
      && Number.isInteger(patch.sourceColumnIndex)
      && patch.targetField
      && patch.sourceUnit
    ) {
      const confirmation: QuickPlotAmbiguityConfirmation = {
        sheetName: patch.sheetName,
        headerRow: Number(patch.headerRow),
        sourceColumnIndex: Number(patch.sourceColumnIndex),
        targetField: patch.targetField,
        sourceUnit: patch.sourceUnit,
      };
      ambiguityConfirmationsRef.current = [
        ...ambiguityConfirmationsRef.current.filter((candidate) => !(
          candidate.sheetName === confirmation.sheetName
          && candidate.headerRow === confirmation.headerRow
          && candidate.sourceColumnIndex === confirmation.sourceColumnIndex
        )),
        confirmation,
      ];
    }
    const toolTurn: AssistantWireTurn = {
      role: 'tool',
      toolCallId: question.call.id,
      content: JSON.stringify({
        questionId: question.question.questionId,
        selectedOptionId: option.optionId,
        decisionPatch: option.decisionPatch,
      }),
    };
    const next = [...turns, toolTurn];
    setTurns(next);
    setMessages((current) => [...current, {
      id: messageId('choice'),
      role: 'user',
      content: quickPlotQuestionOptionLabel(option.decisionPatch, source!),
    }]);
    setQuestion(null);
    await advanceInput(next);
  }

  async function submitCorrection() {
    if (!proposal || !source || status !== 'idle') return;
    const detail = correctionText.trim();
    if (correctionCountRef.current >= 3) {
      setProblem('已经连续修正 3 次，AI 仍未形成合适判断。文件没有改变，请重新开始或使用手动粘贴。');
      return;
    }
    correctionCountRef.current += 1;
    const rejectedTurn: AssistantWireTurn = {
      role: 'tool',
      toolCallId: proposal.call.id,
      content: JSON.stringify({
        status: 'proposal-rejected-by-user',
        category: correctionCategory,
        detail,
        proposalId: proposal.proposal.proposalId,
        proposalHash: proposal.proposal.proposalHash,
      }),
    };
    const userTurn: AssistantWireTurn = {
      role: 'user',
      content: `上一份判断不对。需要修正：${correctionCategory}${detail ? `。补充说明：${detail}` : ''}。请重新读取必要证据并提交一份完整新判断。`,
    };
    const next = [...turns, rejectedTurn, userTurn];
    setTurns(next);
    setMessages((current) => [...current, {
      id: messageId('correction'),
      role: 'user',
      content: `请修正：${correctionCategory}${detail ? `（${detail}）` : ''}`,
    }]);
    setProposal(null);
    setCorrectionOpen(false);
    setCorrectionText('');
    await advanceInput(next);
  }

  function stopRequest() {
    requestAbortRef.current?.abort('stopped-by-user');
    setStatus('idle');
    setProblem('已停止判断，当前文件仍在这里。');
  }

  function stopReportRequest() {
    requestAbortRef.current?.abort('stopped-by-user');
    setStatus('idle');
    setProblem('已停止本次解读。你的问题已保留，可以直接重新解读；图册和数据没有改变。');
  }

  async function retryCurrentJudgement() {
    setProblem('');
    if (!source) return;
    resetInputSession();
    await Promise.resolve();
    await startOrganizingFromSource(source);
  }

  async function startOrganizingFromSource(currentSource: ImportAssistantSource) {
    if (status === 'reading' || status === 'saving') return;
    correctionCountRef.current = 0;
    decisionHistoryRef.current = [];
    const userTurn: AssistantWireTurn = {
      role: 'user',
      content: `请重新判断当前文件 ${currentSource.fileName}，并严格提交一份结构化问题或完整判断。不要修改测量值。`,
    };
    setTurns([userTurn]);
    setMessages((current) => [...current, {
      id: messageId('retry'),
      role: 'user',
      content: '请重新判断当前文件。',
    }]);
    await advanceInput([userTurn]);
  }

  async function confirmImport() {
    if (!proposal || !source || commitLockRef.current) return;
    commitLockRef.current = true;
    const commitContextKey = contextKeyRef.current;
    const commitSourceIdentity = `${source.operationId}:${source.sourceFingerprint}`;
    setStatus('saving');
    setProblem('');
    try {
      const latest = buildQuickPlotRowsFromProposal(proposal.proposal, source);
      if ('problem' in latest) throw new Error(latest.problem);
      const commitKey = [
        QUICK_PLOT_IMPORT_PROTOCOL,
        project.projectId,
        project.workspaceRevision,
        source.operationId,
        source.sourceFingerprint,
        proposal.proposal.proposalHash,
      ].join(':');
      const committed = await onImport(latest, source.fileName, project.workspaceRevision, commitKey);
      if (!committed.ok) throw new Error(committed.problem);
      if (
        commitContextKey !== contextKeyRef.current
        || commitSourceIdentity !== sourceIdentityRef.current
      ) return;
      setProposal({ call: proposal.call, proposal: proposal.proposal, result: latest });
      setStatus('success');
      setMessages((current) => [...current, {
        id: messageId('success'),
        role: 'system',
        content: `已导入 ${latest.rows.length.toLocaleString('zh-CN')} 行，原文件未修改。`,
      }]);
    } catch (error) {
      setStatus('idle');
      setProblem(error instanceof Error ? error.message : '本次导入没有完成；文件和整理草稿仍在。');
    } finally {
      commitLockRef.current = false;
    }
  }

  async function askReport(questionText: string, retry = false) {
    const content = questionText.trim();
    if (!content || !activePage || status !== 'idle') return;
    const requestReport = context.quickPlotReport;
    if (!requestReport) return;
    const userTurn: AssistantWireTurn = {
      role: 'user',
      content: `[提问时页面：第 ${requestReport.pageNumber} 页「${requestReport.pageTitle}」]\n${content}`,
    };
    const nextTurns = trimQuickReportTurns(retry ? turns : [...turns, userTurn]);
    if (!retry) {
      setTurns(nextTurns);
      setMessages((current) => [...current, { id: messageId('user'), role: 'user', content }]);
    }
    lastReportQuestionRef.current = content;
    setInput('');
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    let totalTimedOut = false;
    const totalBudget = globalThis.setTimeout(() => {
      totalTimedOut = true;
      controller.abort('quick-report-total-timeout');
    }, QUICK_REPORT_TOTAL_BUDGET_MS);
    const evidence: QuickReportEvidence[] = [];
    setStatus('reading');
    setProblem('');
    try {
      let activeTurns = nextTurns;
      let transientRetryUsed = false;
      const requestReportTurn = async (
        requestTurns: AssistantWireTurn[],
        requestContext: AssistantContextSnapshot = context,
      ) => {
        try {
          return await connection.requestTurn({
            turns: requestTurns,
            context: requestContext,
            consentScope: 'engineering',
            signal: controller.signal,
          });
        } catch (error) {
          const transient = error instanceof AssistantRequestError
            && (error.code === 'CLIENT_TIMEOUT' || error.code === 'UPSTREAM_TIMEOUT');
          if (!transient || transientRetryUsed || controller.signal.aborted) throw error;
          transientRetryUsed = true;
          return connection.requestTurn({
            turns: requestTurns,
            context: requestContext,
            consentScope: 'engineering',
            signal: controller.signal,
          });
        }
      };
      for (let step = 0; step < 5; step += 1) {
        activeTurns = trimQuickReportTurns(activeTurns);
        let response;
        try {
          response = await requestReportTurn(activeTurns);
        } catch (error) {
          if (!(error instanceof AssistantRequestError) || error.code !== 'MODEL_TOOL_FORMAT') throw error;
          const repairCall: AssistantToolCall = {
            id: `repair-read-page-${requestReport.pageNumber}-${step}`,
            name: 'read_quick_plot_page',
            arguments: JSON.stringify({ pageNumber: requestReport.pageNumber }),
          };
          const repairResult = executeQuickReportReadTool(repairCall, context, workspace);
          evidence.push({ toolName: repairCall.name, payload: repairResult.payload });
          const boundedEvidence = JSON.stringify(repairResult.payload).slice(0, 3_200);
          response = await requestReportTurn(trimQuickReportTurns([
            ...activeTurns,
            {
              role: 'user',
              content: `[系统只读证据]\n${boundedEvidence}\n请直接回答原问题，不再调用工具。`,
            },
          ]), {
            ...context,
            quickPlotReport: {
              ...requestReport,
              evidenceOnly: true,
            },
          });
        }
        if (response.kind === 'message') {
          const answer = buildQuickReportExplanation(
            requestReport,
            content,
            response.content,
            evidence,
          );
          setTurns(trimQuickReportTurns([...activeTurns, { role: 'assistant', content: answer }]));
          setMessages((current) => [...current, {
            id: messageId('assistant'),
            role: 'assistant',
            content: answer,
            detail: quickReportSourceDetail(requestReport, evidence),
          }]);
          return;
        }
        if (
          response.calls.length < 1
          || response.calls.length > 4
          || response.calls.some((call) => !QUICK_REPORT_READ_TOOLS.has(call.name))
        ) {
          throw new Error('图册解读只能读取，不能执行导入或修改。');
        }
        const assistantTurn: AssistantWireTurn = {
          role: 'assistant',
          content: response.content,
          toolCalls: response.calls,
          reasoningContent: response.reasoningContent,
        };
        const toolTurns = response.calls.map((call): AssistantWireTurn => {
          const toolResult = executeQuickReportReadTool(call, context, workspace);
          evidence.push({ toolName: call.name, payload: toolResult.payload });
          return {
            role: 'tool',
            toolCallId: call.id,
            content: JSON.stringify(toolResult.payload),
          };
        });
        activeTurns = trimQuickReportTurns([...activeTurns, assistantTurn, ...toolTurns]);
        setTurns(activeTurns);
      }
      throw new Error('图册解读没有生成完整，请重试。');
    } catch (error) {
      if (totalTimedOut) {
        setProblem('本次图册解读已等待 2 分钟。你的问题已保留，可以直接重新解读；图册和数据没有改变。');
      } else if (!controller.signal.aborted) {
        setProblem(error instanceof Error ? error.message : 'AI 图册解读暂时不可用。');
      }
    } finally {
      globalThis.clearTimeout(totalBudget);
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
        setStatus('idle');
      }
    }
  }

  async function connect() {
    setConnectionProblem('');
    const result = await connection.connect(keyInputRef.current?.value ?? '');
    if (!result.ok) {
      setConnectionProblem(result.problem);
      return;
    }
    if (keyInputRef.current) keyInputRef.current.value = '';
    setConnectionDialogOpen(false);
  }

  const providerLabel = connection.capability?.provider === 'mock'
    ? '测试模型 · 已连接'
    : `DeepSeek · ${connection.usingPersonalKey ? '自己的 Key' : '公共额度'}`;
  const canUseAi = Boolean(
    connection.connected
    && outboundConsent
    && connection.capability?.serviceAvailable
    && publicAssistantQuotaReady({
      provider: connection.capability?.provider,
      usingPersonalKey: connection.usingPersonalKey,
      quota: connection.publicQuota,
    }),
  );

  return (
    <>
      <aside className={`quick-assistant-drawer${open ? ' open' : ''}`} hidden={!open} data-testid="quick-ai-assistant">
        <header className="quick-assistant-heading">
          <div><span>{mode === 'input' ? '快速出图 · 文件整理' : '快捷图册'}</span><h2>{mode === 'input' ? 'AI 整理数据' : '图册解读'}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={mode === 'input' ? '关闭 AI 整理数据' : '关闭图册解读'}><X /></button>
        </header>
        <div className="assistant-safety-note">
          <ShieldCheck />
          <div><strong>{mode === 'input' ? '原文件不变' : '只读，不改图册'}</strong><span>{mode === 'input' ? '确认后才导入；AI 不修改测量值。' : '可按问题读取页面、方法和有限深度数据；不能导入、修改或重算。回答仅用于理解图册，不代替工程复核。'}</span></div>
        </div>

        {connection.capability && !connection.capability.serviceAvailable ? (
          <div className="assistant-consent assistant-disconnected">
            <strong>AI 服务暂不可用</strong><p>{connection.capability.reason}</p>
            <button type="button" className="toolbar-button" onClick={() => connection.retryService()}>重新检测</button>
          </div>
        ) : null}
        {connection.capability?.serviceAvailable && !connection.connected ? (
          <div className="assistant-consent">
            <strong>先连接 DeepSeek</strong><p>API Key 仅本次打开有效。</p>
            <button type="button" className="toolbar-button primary" onClick={() => setConnectionDialogOpen(true)}><KeyRound />连接 DeepSeek</button>
          </div>
        ) : null}
        {connection.connected ? (
          <div className="assistant-provider available">
            <span>{providerLabel}</span>
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
        <AssistantPublicQuotaNote quota={connection.publicQuota} usingPersonalKey={connection.usingPersonalKey} />
        {connection.connected && !outboundConsent ? (
          <div className="assistant-consent" data-testid="quick-ai-consent">
            <strong>发送哪些内容？</strong>
            <p>{mode === 'input' ? '只发送工作表名称、表头和有限预览行，不发送原文件。' : '发送本图册目录、当前页和本次有限对话；问题需要时，额外发送最多 20 m、120 个源测点。空值保留，不插值。'}</p>
            <button type="button" className="toolbar-button primary" onClick={() => connection.grantOutboundConsent(consentScope, context.scope.authorityHash)}>同意发送</button>
          </div>
        ) : null}

        {mode === 'input' ? (
          <>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" hidden disabled={status === 'saving'} onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
            <button type="button" className="quick-ai-file-button" disabled={status === 'saving'} onClick={() => fileRef.current?.click()} data-testid="quick-ai-upload">
              <Upload /><span><strong>{status === 'saving' ? '正在保存' : source ? '更换文件' : '上传 CSV 或 Excel'}</strong><small>{status === 'saving' ? '完成后可更换文件' : source ? source.fileName : '支持非标准表头和额外列'}</small></span>
            </button>
            {source ? <div className="import-assistant-source"><span>当前文件</span><strong>{source.fileName}</strong><small>{source.sheets.length} 个工作表</small></div> : null}
          </>
        ) : (
          <div className="import-assistant-source" data-testid="quick-ai-current-page">
            <span>正在查看 · 当前页</span><strong>{activePage ? `${selectedPage + 1}. ${activePage.title}` : '图册尚未生成'}</strong>
            <small>{activePage?.chartTypes.map(quickPlotChartLabel).join(' · ')}</small>
          </div>
        )}

        <div className="assistant-messages" aria-live="polite">
          {!messages.length ? <article className="assistant-message system"><p>{mode === 'input' ? '上传文件后，我会识别中文或英文表头，并列出未使用的列。' : '可询问当前页、其他页面、方法或某个深度范围。'}</p></article> : null}
          {!proposal ? messages.map((message) => <article key={message.id} className={`assistant-message ${message.role}`}>{mode === 'report' && message.role === 'assistant' ? <QuickReportMarkdown content={message.content} /> : <p>{message.content}</p>}{message.detail ? <small>{message.detail}</small> : null}</article>) : null}
          {status === 'parsing' ? <div className="assistant-running"><LoaderCircle />正在读取文件…</div> : null}
          {status === 'reading' ? <div className="assistant-running"><LoaderCircle />{mode === 'input' ? 'AI 正在判断工作表、字段和单位…' : '正在回答（最多 2 分钟）…'}{mode === 'input' ? <button type="button" className="toolbar-button" onClick={stopRequest}><Square />停止判断</button> : <button type="button" className="toolbar-button" onClick={stopReportRequest}><Square />停止</button>}</div> : null}
          {question ? (
            <article className="import-assistant-question" data-testid="quick-ai-question">
              <strong>{question.question.prompt}</strong><p>{question.question.reason}</p>
              <div>{question.question.options.map((option) => (
                <button type="button" key={option.optionId} onClick={() => void answerQuestion(option)}>
                  <span>{quickPlotQuestionOptionLabel(option.decisionPatch, source!)}{option.recommended ? <em>推荐</em> : null}</span>
                </button>
              ))}</div>
              <button type="button" className="toolbar-button" onClick={() => resetInputSession('本次没有采用 AI 选择，文件保持不变。')}>暂不使用 AI</button>
            </article>
          ) : null}
          {proposal ? (
            <article className="quick-ai-proposal" data-testid="quick-ai-proposal">
              <span>{status === 'success' ? `已导入 ${proposal.result.rows.length.toLocaleString('zh-CN')} 行并保存` : 'AI 判断，请你确认'}</span>
              <h3>{proposal.proposal.sheetName} · {proposal.proposal.headerMode === 'present' ? `表头第 ${proposal.proposal.headerRow} 行` : '没有表头'}</h3>
              <p>读取第 {proposal.proposal.dataStartRow}–{proposal.proposal.dataEndRow} 行。确认后只读取这些列并换算单位。</p>
              {proposal.proposal.warnings.length ? <div className="quick-ai-proposal-warning">{proposal.proposal.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
              <div className="quick-ai-mapping">
                {proposal.proposal.columns.map((column) => {
                  const sample = proposal.result.samples.find((candidate) => candidate.targetField === column.targetField);
                  const evidence = column.evidenceKind === 'source-explicit'
                    ? '文件写明'
                    : column.evidenceKind === 'user-corrected'
                      ? '按你的修正'
                      : 'AI 推测，请重点确认';
                  return <div key={column.targetField}>
                    <span>{sourceHeader(source, proposal.proposal, column.sourceColumnIndex)}</span>
                    <strong>{quickPlotFieldLabel(column.targetField)}　{column.sourceUnit} → {quickPlotStandardUnit(column.targetField)}</strong>
                    <small>{evidence}{sample ? ` · 样例 ${sample.sourceValues.join('、')} → ${sample.normalizedValues.join('、')}` : ''}</small>
                  </div>;
                })}
              </div>
              <dl>
                <div><dt>可导入</dt><dd>{proposal.result.rows.length} 行</dd></div>
                <div><dt>不能读取</dt><dd>{proposal.result.ledger.rejectedRows.length} 行</dd></div>
                <div><dt>未使用列</dt><dd>{proposal.result.ignoredColumns.length} 项</dd></div>
              </dl>
              {(proposal.result.ledger.rejectedRows.length || proposal.result.ledger.duplicateDepthRows.length || proposal.result.ledger.nonMonotonicRows.length) ? <details><summary>查看需要注意的行</summary><ul>
                {proposal.result.ledger.rejectedRows.slice(0, 20).map((row) => <li key={`rejected-${row.displayRowNumber}`}><b>第 {row.displayRowNumber} 行</b><span>{row.reason}</span></li>)}
                {proposal.result.ledger.duplicateDepthRows.length ? <li><b>重复深度</b><span>第 {proposal.result.ledger.duplicateDepthRows.slice(0, 12).join('、')} 行</span></li> : null}
                {proposal.result.ledger.nonMonotonicRows.length ? <li><b>深度回退</b><span>第 {proposal.result.ledger.nonMonotonicRows.slice(0, 12).join('、')} 行；导入顺序不改动。</span></li> : null}
              </ul></details> : null}
              {proposal.result.ignoredColumns.length ? <details><summary>查看未使用的列</summary><ul>{proposal.result.ignoredColumns.map((column) => <li key={column.sourceColumnIndex}><b>{column.headerLabel}</b><span>{column.reason}</span></li>)}</ul></details> : null}
              {workspace.rows.length && status !== 'success' ? <p className="quick-ai-replace-note">确认后将用 {proposal.result.rows.length} 行新数据替换当前 {workspace.rows.length} 行；已有图册需要重新生成。</p> : null}
            </article>
          ) : null}
          {problem ? <article className="assistant-error" data-testid="quick-ai-error"><strong>{mode === 'input' ? '本次判断未完成' : '本次解读未完成'}</strong><p>{problem}</p>{mode === 'input' && source ? <div><button type="button" className="toolbar-button" onClick={() => void retryCurrentJudgement()}><RotateCcw />重新判断当前文件</button><button type="button" className="toolbar-button" onClick={() => resetInputSession('已保留文件，可以重新开始。')}>保留文件，暂不判断</button></div> : <div><button type="button" className="toolbar-button primary" data-testid="quick-ai-retry-report" disabled={!lastReportQuestionRef.current} onClick={() => void askReport(lastReportQuestionRef.current, true)}><RotateCcw />重新解读</button><button type="button" className="toolbar-button" onClick={() => setProblem('')}>关闭</button></div>}</article> : null}
        </div>

        {proposal && status !== 'success' ? <div className="quick-ai-sticky-actions">
          {correctionOpen ? <div className="quick-ai-correction" data-testid="quick-ai-correction">
            <label><span>哪里不对？</span><select value={correctionCategory} onChange={(event) => setCorrectionCategory(event.target.value)}><option>工作表不对</option><option>表头或数据范围不对</option><option>字段对应不对</option><option>单位不对</option><option>fs 或 u2 不需要</option><option>其他</option></select></label>
            <textarea rows={2} value={correctionText} onChange={(event) => setCorrectionText(event.target.value)} placeholder="可补充：例如“第 3 列才是 fs”" />
            <div><button type="button" className="toolbar-button" onClick={() => setCorrectionOpen(false)}>返回判断</button><button type="button" className="toolbar-button primary" onClick={() => void submitCorrection()}>让 AI 重新判断</button></div>
          </div> : <><button type="button" className="toolbar-button" disabled={status === 'saving'} onClick={() => setCorrectionOpen(true)}>判断不对</button><button type="button" className="toolbar-button primary" disabled={status === 'saving'} onClick={() => void confirmImport()} data-testid="quick-ai-confirm-import">{status === 'saving' ? '正在保存…' : workspace.rows.length ? `确认并替换为 ${proposal.result.rows.length} 行` : `确认并导入 ${proposal.result.rows.length} 行`}</button></>}
        </div> : null}

        {mode === 'input' && !proposal && !question && source ? (
          <button type="button" className="toolbar-button primary import-assistant-start" disabled={!canUseAi || status !== 'idle'} onClick={() => void startOrganizing()} data-testid="quick-ai-start"><Bot />让 AI 判断</button>
        ) : null}
        {mode === 'report' ? (
          <>
            <div className="quick-ai-prompts">
              <button type="button" disabled={!canUseAi || status !== 'idle' || !activePage} onClick={() => void askReport('请用简单语言解释当前页在看什么。')}>解释当前页</button>
              <button type="button" disabled={!canUseAi || status !== 'idle' || !activePage} onClick={() => void askReport('请解释本页各图表分别表示什么。')}>解释本页图表</button>
            </div>
            <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); void askReport(input); }}>
              <textarea rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder="询问图册内容…" disabled={!canUseAi || status !== 'idle' || !activePage} />
              <button type="submit" className="assistant-send" disabled={!input.trim() || !canUseAi || status !== 'idle'} aria-label="发送"><Send /></button>
            </form>
          </>
        ) : null}
      </aside>
      {connectionDialogOpen ? (
        <div className="assistant-key-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && connection.status !== 'validating') setConnectionDialogOpen(false); }}>
          <section className="assistant-key-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-assistant-key-title">
            <div className="assistant-key-dialog-heading"><div><span>目前仅支持 DeepSeek</span><h2 id="quick-assistant-key-title">连接 DeepSeek</h2></div><button type="button" className="icon-button" onClick={() => setConnectionDialogOpen(false)}><X /></button></div>
            <p>API Key 仅本次打开有效，不会写入项目或浏览器存储。</p>
            <label className="assistant-key-field"><span>DeepSeek API Key</span><div><input ref={keyInputRef} type={showKey ? 'text' : 'password'} placeholder="sk-…" autoComplete="off" disabled={connection.status === 'validating'} /><button type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff /> : <Eye />}</button></div></label>
            {connectionProblem ? <div className="assistant-key-problem">{connectionProblem}</div> : null}
            <div className="assistant-key-dialog-actions"><button type="button" className="toolbar-button" onClick={() => setConnectionDialogOpen(false)}>取消</button><button type="button" className="toolbar-button primary" disabled={connection.status === 'validating'} onClick={() => void connect()}>{connection.status === 'validating' ? <><LoaderCircle />正在验证…</> : '连接并验证'}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function buildContext(
  project: ProjectWorkspaceV2,
  workspace: QuickPlotWorkspaceV1,
  mode: 'input' | 'report',
  source: ImportAssistantSource | null,
  page: QuickPlotPage | null,
  selectedPage: number,
  pages: QuickPlotPage[],
): AssistantContextSnapshot {
  const depths = workspace.rows.map((row) => row.depthM).filter(Number.isFinite);
  const revisionId = workspace.activeRevisionId ?? 'none';
  const authorityHash = mode === 'input'
    ? `${project.workspaceRevision}:${source?.operationId ?? 'none'}:${source?.sourceFingerprint ?? 'none'}`
    : `${quickPlotInputHash(workspace)}:${revisionId}`;
  return {
    assistantProfile: mode === 'input' ? 'quick-import-governed' : 'report-reader',
    scope: {
      projectId: project.projectId,
      projectName: project.projectName,
      pointId: 'quick-plot',
      pointName: workspace.settings.pointName,
      route: mode === 'input' ? 'quick-input' : 'quick-report',
      routeLabel: mode === 'input' ? '快捷出图数据输入' : '快捷出图图册',
      workspaceRevision: project.workspaceRevision,
      checkRunId: null,
      classificationRunId: null,
      stratificationRevisionId: null,
      hasWorkingDraft: Boolean(source),
      parameterRunId: null,
      authorityHash,
    },
    status: {
      check: '不适用',
      classification: '由快捷图册确定性计算',
      stratification: '由快捷图册展示',
      parameters: workspace.activeRevisionId ? '已生成' : '尚未生成',
      output: workspace.activeRevisionId ? '图册已生成' : '尚未生成',
    },
    counts: {
      measuredRows: workspace.rows.length,
      layers: 0,
      boundaries: 0,
      pendingLayers: 0,
      parameterProblems: 0,
      outputs: workspace.activeRevisionId ? pages.length : 0,
    },
    selectedLayer: null,
    selectedBoundary: null,
    layers: [],
    boundaries: [],
    notices: ['AI 不修改快速出图测量值。'],
    ...(mode === 'input' && source ? { importSource: summarizeImportAssistantSource(source, false) } : {}),
    ...(mode === 'report' && page ? {
      quickPlotReport: {
        revisionId,
        authorityHash,
        pageNumber: selectedPage + 1,
        pageCount: pages.length,
        pageTitle: page.title,
        methodIds: [...page.methodIds],
        chartTypes: [...page.chartTypes],
        route: quickPlotRoute(workspace.rows, workspace.settings),
        measuredRows: workspace.rows.length,
        depthFromM: depths.length ? Math.min(...depths) : null,
        depthToM: depths.length ? Math.max(...depths) : null,
        sourceName: workspace.sourceName,
        currentPageEvidenceJson: JSON.stringify(quickPlotAssistantPageEvidence(workspace, selectedPage + 1)),
        notices: [
          '当前页来自已冻结的快捷图册修订。',
          '参数按既有快捷方法包确定性计算。',
        ],
        pages: pages.map((candidate, index) => ({
          pageNumber: index + 1,
          title: candidate.title,
          methodIds: [...candidate.methodIds],
          chartTypes: [...candidate.chartTypes],
          referencePage: candidate.referencePage,
          orientation: candidate.orientation,
        })),
      },
    } : {}),
  };
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

function quickPlotChartLabel(chartType: string) {
  const labels: Record<string, string> = {
    'qc-depth': '锥尖阻力',
    'qt-depth': '修正锥尖阻力',
    'fs-depth': '侧摩阻力',
    'rf-depth': '摩阻比',
    'fr-depth': '归一化摩阻比',
    'u2-depth': '孔隙水压力',
    'ic-depth': '土体行为类型指数 Ic',
    'jts-layer-depth': 'JTS 地层分类',
    'sbt-depth': '土体行为类型',
    'fuzzy-depth': 'Fuzzy 分类',
    'non-normalized-sbt': 'SBT 分类图',
    'bq-sbt': 'Bq 分类图',
    'normalized-sbtn': '归一化 SBTn 分类图',
    'normalized-bq': '归一化 Bq 分类图',
    'schneider-semiloq': 'Schneider 2008 分类图',
    'schneider-2008-depth': 'Schneider 2008 深度分类',
    'fuzzy-majority-layers': 'Fuzzy 最高概率分层',
    'fuzzy-window-composition': 'Fuzzy 深度窗口组成',
    'robertson-2016-depth': 'Modified Robertson 2016 深度分类',
    'robertson-2016-layer-depth': 'Modified Robertson 2016 分层',
    'schneider-2008-layer-depth': 'Schneider 2008 分层',
  };
  return labels[chartType] ?? chartType.replaceAll('-', ' ');
}

export function executeQuickReportReadTool(
  call: AssistantToolCall,
  context: AssistantContextSnapshot,
  workspace: QuickPlotWorkspaceV1,
): {
  payload: Record<string, unknown>;
  establishesRevisionRead: boolean;
  establishesCurrentPageRead: boolean;
} {
  const report = context.quickPlotReport;
  const args = parseArguments(call);
  const failed = (problem: string) => ({
    payload: { ok: false, problem },
    establishesRevisionRead: false,
    establishesCurrentPageRead: false,
  });
  if (!report || !args) return failed('当前图册读取上下文已失效。');
  const base = {
    ok: true,
    readOnly: true,
    authorityHash: report.authorityHash,
    revisionId: report.revisionId,
    sourceName: report.sourceName,
  };
  if (call.name === 'list_quick_plot_pages') {
    return {
      payload: {
        ...base,
        currentPageNumber: report.pageNumber,
        pageCount: report.pageCount,
        pages: report.pages,
      },
      establishesRevisionRead: false,
      establishesCurrentPageRead: false,
    };
  }
  if (call.name === 'read_quick_plot_page') {
    const requested = args.pageNumber === undefined ? report.pageNumber : Number(args.pageNumber);
    const page = report.pages.find((candidate) => candidate.pageNumber === requested);
    if (!page) return failed(`图册中没有第 ${Number.isFinite(requested) ? requested : '指定'} 页。`);
    const isCurrent = page.pageNumber === report.pageNumber;
    return {
      payload: {
        ...base,
        ...page,
        isCurrentPage: isCurrent,
        route: report.route,
        measuredRows: report.measuredRows,
        depthFromM: report.depthFromM,
        depthToM: report.depthToM,
        notices: report.notices,
        engineeringEvidence: quickPlotAssistantPageEvidence(workspace, page.pageNumber),
      },
      establishesRevisionRead: true,
      establishesCurrentPageRead: isCurrent,
    };
  }
  if (call.name === 'read_quick_plot_chart') {
    const requested = args.pageNumber === undefined ? report.pageNumber : Number(args.pageNumber);
    const chartType = typeof args.chartType === 'string' ? args.chartType : '';
    const page = report.pages.find((candidate) => candidate.pageNumber === requested);
    if (!page || !chartType || !page.chartTypes.includes(chartType)) {
      return failed('指定图表不在该图册页中；可先读取页面列表或当前页。');
    }
    const isCurrent = page.pageNumber === report.pageNumber;
    return {
      payload: {
        ...base,
        pageNumber: page.pageNumber,
        pageTitle: page.title,
        chartType,
        chartLabel: quickPlotChartLabel(chartType),
        methodIds: page.methodIds,
        depthFromM: report.depthFromM,
        depthToM: report.depthToM,
        isCurrentPage: isCurrent,
        engineeringEvidence: quickPlotAssistantPageEvidence(workspace, page.pageNumber),
      },
      establishesRevisionRead: true,
      establishesCurrentPageRead: isCurrent,
    };
  }
  if (call.name === 'read_quick_plot_method') {
    const requested = typeof args.methodId === 'string' ? args.methodId.trim() : '';
    const pages = report.pages.filter((page) =>
      page.methodIds.some((methodId) => methodId.toLocaleLowerCase() === requested.toLocaleLowerCase()),
    );
    if (!requested || !pages.length) return failed('当前图册没有这个方法标识；可先读取页面列表。');
    const currentPageIncluded = pages.some((page) => page.pageNumber === report.pageNumber);
    return {
      payload: {
        ...base,
        methodId: requested,
        pages: pages.map((page) => ({
          pageNumber: page.pageNumber,
          title: page.title,
          chartTypes: page.chartTypes,
          engineeringEvidence: quickPlotAssistantPageEvidence(workspace, page.pageNumber),
        })),
        currentPageIncluded,
      },
      establishesRevisionRead: true,
      establishesCurrentPageRead: currentPageIncluded,
    };
  }
  if (call.name === 'read_quick_plot_depth_window') {
    const fields = Array.isArray(args.fields)
      ? args.fields.filter((field): field is 'qc' | 'fs' | 'u2' =>
          field === 'qc' || field === 'fs' || field === 'u2',
        )
      : [];
    const result = readBoundedAssistantDepthWindow(
      workspace.rows.map((row) => ({
        sourceRowId: row.rowId,
        depthM: row.depthM,
        qcKpa: row.qcMpa * 1_000,
        fsKpa: row.fsKpa,
        u2Kpa: row.u2Kpa,
      })),
      {
        depthFromM: Number(args.depthFromM),
        depthToM: Number(args.depthToM),
        fields,
      },
    );
    if (!result.ok) return failed(result.problem);
    return {
      payload: {
        ...base,
        ...result,
        dataBasis: 'frozen-quick-plot-source',
      },
      establishesRevisionRead: true,
      establishesCurrentPageRead: false,
    };
  }
  return failed('图册解读没有这个只读工具。');
}

export function buildQuickReportExplanation(
  report: AssistantContextSnapshot['quickPlotReport'],
  _question: string,
  modelResponse: string,
  _evidence: QuickReportEvidence[] = [],
) {
  if (!report) return '当前图册页信息已经失效，请重新选择页面。';
  const answer = modelResponse.trim();
  return answer || '本次没有生成可显示的回答，请重试。';
}

export function quickReportSourceDetail(
  report: NonNullable<AssistantContextSnapshot['quickPlotReport']>,
  evidence: QuickReportEvidence[],
) {
  const extraPages = new Map<number, string>();
  for (const item of evidence) {
    const pageNumber = typeof item.payload.pageNumber === 'number'
      ? item.payload.pageNumber
      : null;
    const pageTitle = typeof item.payload.pageTitle === 'string'
      ? item.payload.pageTitle
      : typeof item.payload.title === 'string'
        ? item.payload.title
        : '';
    if (pageNumber && pageNumber !== report.pageNumber) extraPages.set(pageNumber, pageTitle);
    if (item.toolName === 'read_quick_plot_method' && Array.isArray(item.payload.pages)) {
      for (const candidate of item.payload.pages) {
        if (!candidate || typeof candidate !== 'object') continue;
        const page = candidate as { pageNumber?: unknown; title?: unknown };
        if (typeof page.pageNumber === 'number' && page.pageNumber !== report.pageNumber) {
          extraPages.set(page.pageNumber, typeof page.title === 'string' ? page.title : '');
        }
      }
    }
  }
  const extra = [...extraPages.entries()].sort((left, right) => left[0] - right[0]);
  const extraLabel = extra.length
    ? `；另读取第 ${extra.slice(0, 4).map(([pageNumber]) => pageNumber).join('、')} 页${extra.length > 4 ? `等 ${extra.length} 页` : ''}`
    : '';
  return `来源：提问时第 ${report.pageNumber} 页 · ${report.pageTitle}${extraLabel}`;
}

export function hasQuickReportEvidenceForQuestion(
  report: NonNullable<AssistantContextSnapshot['quickPlotReport']>,
  question: string,
  evidence: QuickReportEvidence[],
) {
  return Boolean(selectQuickReportEvidenceForQuestion(report, question, evidence));
}

function selectQuickReportEvidenceForQuestion(
  report: NonNullable<AssistantContextSnapshot['quickPlotReport']>,
  question: string,
  evidence: QuickReportEvidence[],
) {
  const normalized = question.toLocaleLowerCase();
  const pageMatch = normalized.match(/第\s*(\d{1,3})\s*页/);
  const targetPageNumber = pageMatch ? Number(pageMatch[1]) : report.pageNumber;
  const depthRangeMatch = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*(?:m|米)?\s*(?:-|–|—|~|～|至|到)\s*(-?\d+(?:\.\d+)?)\s*(?:m|米)/i,
  );
  const singleDepthMatch = depthRangeMatch
    ? null
    : normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:m|米)/i);
  const asksForDirectory = /目录|全部页面|所有页面|有哪些页|有几页|多少页/.test(normalized);
  const asksForMethodAcrossPages = (
    /\br\d{2}\b|jts|schneider|robertson|fuzzy|sbtn?/i.test(normalized)
    || /方法/.test(normalized)
  ) && /哪些页|哪几页|在哪些页|出现在哪|分布在哪/.test(normalized);
  const requestedMethodId = quickReportRequestedMethodId(normalized);
  const requestedChartTypes = quickReportRequestedChartTypes(normalized);
  const asksForFrictionRatio = /\brf\b|\bfr\b|摩阻比|归一化摩阻比/i.test(normalized);
  const requestedFields = [
    ...(/\bqc\b|锥尖|锥阻/i.test(normalized) ? ['qc'] as const : []),
    ...(!asksForFrictionRatio && /\bfs\b|侧摩|侧壁摩阻|套筒摩阻|套管摩阻|摩阻力/i.test(normalized) ? ['fs'] as const : []),
    ...(/\bu2\b|孔压|孔隙水压力/i.test(normalized) ? ['u2'] as const : []),
  ];
  const currentRevisionEvidence = [...evidence].reverse().filter((item) =>
    item.payload.ok === true
    && item.payload.authorityHash === report.authorityHash
    && item.payload.revisionId === report.revisionId,
  );
  if ((depthRangeMatch || singleDepthMatch) && !asksForFrictionRatio) {
    const requestedFrom = depthRangeMatch ? Number(depthRangeMatch[1]) : Number(singleDepthMatch?.[1]);
    const requestedTo = depthRangeMatch ? Number(depthRangeMatch[2]) : requestedFrom;
    return currentRevisionEvidence.find((item) => {
      if (item.toolName !== 'read_quick_plot_depth_window') return false;
      const evidenceFrom = typeof item.payload.depthFromM === 'number' ? item.payload.depthFromM : Number.NaN;
      const evidenceTo = typeof item.payload.depthToM === 'number' ? item.payload.depthToM : Number.NaN;
      const evidenceFields = Array.isArray(item.payload.requestedFields)
        ? item.payload.requestedFields.filter((field): field is string => typeof field === 'string')
        : [];
      const rangeMatches = depthRangeMatch
        ? Math.abs(evidenceFrom - requestedFrom) < 1e-6 && Math.abs(evidenceTo - requestedTo) < 1e-6
        : evidenceFrom <= requestedFrom
          && evidenceTo >= requestedTo
          && evidenceTo - evidenceFrom <= 0.2;
      return rangeMatches && requestedFields.every((field) => evidenceFields.includes(field));
    });
  }
  if (depthRangeMatch || singleDepthMatch) return undefined;
  if (asksForDirectory) {
    return currentRevisionEvidence.find((item) => item.toolName === 'list_quick_plot_pages');
  }
  if (asksForMethodAcrossPages) {
    return currentRevisionEvidence.find((item) =>
      item.toolName === 'read_quick_plot_method'
      && (
        !requestedMethodId
        || (
          typeof item.payload.methodId === 'string'
          && item.payload.methodId.toLocaleLowerCase() === requestedMethodId.toLocaleLowerCase()
        )
      ),
    );
  }
  if (requestedChartTypes.length) {
    const chartEvidence = currentRevisionEvidence.find((item) =>
      item.toolName === 'read_quick_plot_chart'
      && item.payload.pageNumber === targetPageNumber
      && typeof item.payload.chartType === 'string'
      && requestedChartTypes.includes(item.payload.chartType),
    );
    if (chartEvidence) return chartEvidence;
  }
  return currentRevisionEvidence.find((item) =>
    item.toolName === 'read_quick_plot_page'
    && item.payload.pageNumber === targetPageNumber,
  );
}

function quickReportRequestedMethodId(question: string) {
  const explicit = question.match(/\b(r\d{2})\b/i);
  if (explicit) return explicit[1].toLocaleUpperCase();
  if (/schneider/i.test(question)) return 'R09';
  if (/jts|242[—-]?2020/i.test(question)) return 'R06';
  if (/fuzzy|模糊分类/i.test(question)) return 'R08';
  if (/modified\s*robertson|robertson\s*2016|2016\s*分类/i.test(question)) return 'R10';
  return null;
}

function quickReportRequestedChartTypes(question: string) {
  const chartTypes = new Set<string>();
  const asksForRf = /\brf\b/i.test(question);
  const asksForFr = /\bfr\b|归一化摩阻比/i.test(question);
  const asksForAmbiguousFrictionRatio = !asksForRf && !asksForFr && /摩阻比/i.test(question);
  const frictionRatio = asksForRf || asksForFr || asksForAmbiguousFrictionRatio;
  if (/\bqt\b|修正锥尖|修正锥阻/i.test(question)) chartTypes.add('qt-depth');
  else if (/\bqc\b|锥尖阻力|锥阻/i.test(question)) chartTypes.add('qc-depth');
  if (!frictionRatio && /\bfs\b|侧摩|侧壁摩阻|套筒摩阻|套管摩阻|摩阻力/i.test(question)) chartTypes.add('fs-depth');
  if (/\bu2\b|孔压|孔隙水压力/i.test(question)) chartTypes.add('u2-depth');
  if (/\bic\b|土体行为类型指数/i.test(question)) {
    chartTypes.add('ic-depth');
    chartTypes.add('robertson-ic-depth');
    chartTypes.add('jts-ic-depth');
  }
  if (/\bbq\b/i.test(question)) {
    chartTypes.add('bq-sbt');
    chartTypes.add('normalized-bq');
    chartTypes.add('bq-depth');
  }
  if (/\bqtn\b/i.test(question)) chartTypes.add('qtn-depth');
  if (asksForRf || asksForAmbiguousFrictionRatio) chartTypes.add('rf-depth');
  if (asksForFr || asksForAmbiguousFrictionRatio) chartTypes.add('fr-depth');
  return [...chartTypes];
}
