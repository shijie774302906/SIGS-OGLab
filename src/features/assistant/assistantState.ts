import type { AssistantProposal, AssistantUiMessage, AssistantWireTurn } from './assistantTypes';

export type AssistantSessionState = {
  status: 'idle' | 'loading' | 'awaiting-confirmation' | 'applying' | 'error';
  messages: AssistantUiMessage[];
  turns: AssistantWireTurn[];
  proposal: AssistantProposal | null;
  error: string;
  requestVersion: number;
};

export type AssistantSessionAction =
  | { type: 'send'; message: AssistantUiMessage; turn: AssistantWireTurn }
  | { type: 'append'; messages?: AssistantUiMessage[]; turns?: AssistantWireTurn[] }
  | { type: 'propose'; proposal: AssistantProposal; assistantTurn: AssistantWireTurn; message: AssistantUiMessage }
  | { type: 'apply-start' }
  | { type: 'proposal-clear'; message?: AssistantUiMessage; turn?: AssistantWireTurn }
  | { type: 'cancel-request'; message: AssistantUiMessage }
  | { type: 'context-changed'; message: AssistantUiMessage; preserveAppliedReceipt?: boolean }
  | { type: 'fail'; problem: string }
  | { type: 'retry' }
  | { type: 'reset' };

export const initialAssistantSessionState: AssistantSessionState = {
  status: 'idle',
  messages: [{
    id: 'assistant-welcome',
    role: 'assistant',
    content: '可查看当前进度、问题和指定深度证据。需要修改时，我会先显示前后差异和影响。',
  }],
  turns: [],
  proposal: null,
  error: '',
  requestVersion: 0,
};

export function assistantSessionReducer(
  state: AssistantSessionState,
  action: AssistantSessionAction,
): AssistantSessionState {
  if (action.type === 'send') {
    return {
      ...state,
      status: 'loading',
      messages: [...state.messages, action.message],
      turns: [...state.turns, action.turn],
      proposal: null,
      error: '',
      requestVersion: state.requestVersion + 1,
    };
  }
  if (action.type === 'append') {
    return {
      ...state,
      status: 'idle',
      messages: [...state.messages, ...(action.messages ?? [])],
      turns: [...state.turns, ...(action.turns ?? [])],
      error: '',
    };
  }
  if (action.type === 'propose') {
    return {
      ...state,
      status: 'awaiting-confirmation',
      messages: state.messages,
      turns: [...state.turns, action.assistantTurn],
      proposal: action.proposal,
      error: '',
    };
  }
  if (action.type === 'apply-start') return { ...state, status: 'applying', error: '' };
  if (action.type === 'proposal-clear') {
    return {
      ...state,
      status: 'idle',
      proposal: null,
      messages: action.message ? [...state.messages, action.message] : state.messages,
      turns: action.turn ? [...state.turns, action.turn] : state.turns,
      error: '',
    };
  }
  if (action.type === 'cancel-request') {
    return {
      ...state,
      status: 'idle',
      messages: [...state.messages, action.message],
      error: '',
    };
  }
  if (action.type === 'context-changed') {
    const appliedReceipt = action.preserveAppliedReceipt
      ? [...state.messages].reverse().find((message) => message.id.startsWith('assistant-applied'))
      : undefined;
    return {
      ...state,
      status: 'idle',
      messages: appliedReceipt ? [appliedReceipt, action.message] : [action.message],
      turns: [],
      proposal: null,
      error: '',
    };
  }
  if (action.type === 'fail') return { ...state, status: 'error', error: action.problem };
  if (action.type === 'retry') {
    return { ...state, status: 'loading', error: '', requestVersion: state.requestVersion + 1 };
  }
  return structuredClone(initialAssistantSessionState);
}
