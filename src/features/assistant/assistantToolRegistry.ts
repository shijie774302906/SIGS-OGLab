import type {
  AssistantContextSnapshot,
  AssistantDepthField,
  AssistantProposal,
  AssistantToolCall,
  AssistantWorkspacePort,
} from './assistantTypes';

function parseArguments(call: AssistantToolCall): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(call.arguments) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function newId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}:${crypto.randomUUID()}`
    : `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function groupLabel(value: string) {
  return value === 'sand' ? '砂土'
    : value === 'mixed' ? '粉土/混合土'
      : value === 'clay' ? '黏性土'
        : value === 'unclassified' ? '未分类'
          : value;
}

function proposalDraftAction(context: AssistantContextSnapshot): AssistantProposal['draftAction'] {
  return context.scope.stratificationRevisionId && !context.scope.hasWorkingDraft ? 'create' : 'update';
}

function proposalImpact(context: AssistantContextSnapshot, change: 'soil-group' | 'boundary') {
  const action = proposalDraftAction(context);
  const changeText = change === 'boundary' ? '并调整相邻两层厚度' : '并应用此修改';
  if (context.scope.stratificationRevisionId && action === 'create') {
    return `将基于当前已确认分层创建工作草稿${changeText}；旧确认修订和原始测量不变。提交草稿后才形成新分层修订，并由现有流程更新参数与成果状态。`;
  }
  if (context.scope.stratificationRevisionId) {
    return `将更新当前工作草稿${changeText}；旧确认修订和原始测量不变。提交草稿后才形成新分层修订，并由现有流程更新参数与成果状态。`;
  }
  return change === 'boundary'
    ? '改变当前工作草稿中相邻两层厚度；设为当前分层修订后，参数和成果状态再由现有流程更新。'
    : '更新当前分层工作草稿，不修改原始测量；设为当前分层修订前仍可撤销或继续调整。';
}

export function isAssistantReadTool(name: string) {
  return name === 'read_workflow_summary' || name === 'read_depth_window';
}

export function isAssistantMutationTool(name: string) {
  return name === 'propose_set_layer_soil_group' || name === 'propose_move_boundary';
}

export function executeAssistantReadTool(call: AssistantToolCall, port: AssistantWorkspacePort) {
  if (call.name === 'read_workflow_summary') {
    return { ok: true as const, result: port.getContext(), detail: '已读取当前工作流摘要。' };
  }
  if (call.name === 'read_depth_window') {
    const args = parseArguments(call);
    const fields = Array.isArray(args?.fields)
      ? args.fields.filter((field): field is AssistantDepthField => field === 'qc' || field === 'fs' || field === 'u2')
      : [];
    const result = port.readDepthWindow({
      depthFromM: Number(args?.depthFromM),
      depthToM: Number(args?.depthToM),
      fields,
    });
    return result.ok
      ? {
          ok: true as const,
          result,
          detail: result.clipped
            ? `已读取泥面以下 ${result.depthFromM.toFixed(2)}–${result.depthToM.toFixed(2)} m 的当前有效工作数据：${result.requestedFields.join('/')}（kPa）。窗口含 ${result.totalMatchingRows} 个源行，本轮按源行序号抽样返回 ${result.returnedRowCount} 行；抽样点间距不能用于判断原始深度间断，空值保留且未插值。`
            : `已读取泥面以下 ${result.depthFromM.toFixed(2)}–${result.depthToM.toFixed(2)} m 的当前有效工作数据：${result.requestedFields.join('/')}（kPa）。窗口含 ${result.totalMatchingRows} 个源行并全部返回；原始深度与空值保留，未插值。`,
        }
      : { ok: false as const, problem: result.problem };
  }
  return { ok: false as const, problem: `助手请求了未允许的读取工具：${call.name}。` };
}

export function proposalFromAssistantTool(
  call: AssistantToolCall,
  context: AssistantContextSnapshot,
): { ok: true; proposal: AssistantProposal } | { ok: false; problem: string } {
  const args = parseArguments(call);
  if (!args) return { ok: false, problem: '助手返回的修改参数不是有效 JSON。' };
  const reason = typeof args.reason === 'string' && args.reason.trim()
    ? args.reason.trim().slice(0, 240)
    : '根据当前工作流证据提出。';
  if (call.name === 'propose_set_layer_soil_group') {
    const layerId = String(args.layerId ?? '');
    const engineeringSoilGroup = args.engineeringSoilGroup;
    if (!['sand', 'mixed', 'clay'].includes(String(engineeringSoilGroup))) {
      return { ok: false, problem: '建议土类不在允许范围内。' };
    }
    const layer = context.layers.find((candidate) => candidate.layerId === layerId);
    if (!layer) return { ok: false, problem: '建议指向的土层不属于当前分层方案。' };
    const nextGroup = engineeringSoilGroup as 'sand' | 'mixed' | 'clay';
    return {
      ok: true,
      proposal: {
        proposalId: newId('assistant-proposal'),
        commandId: newId('assistant-command'),
        toolCallId: call.id,
        kind: 'set-layer-soil-group',
        title: `将 ${layer.name} 调整为${groupLabel(nextGroup)}`,
        reason,
        before: `${layer.name}：${groupLabel(layer.engineeringSoilGroup)}`,
        after: `${layer.name}：${groupLabel(nextGroup)}`,
        impact: proposalImpact(context, 'soil-group'),
        risk: context.scope.stratificationRevisionId ? 'upstream' : 'normal',
        draftAction: proposalDraftAction(context),
        scope: context.scope,
        payload: { kind: 'set-layer-soil-group', layerId, engineeringSoilGroup: nextGroup },
      },
    };
  }
  if (call.name === 'propose_move_boundary') {
    const boundaryId = String(args.boundaryId ?? '');
    const depthM = Number(args.depthM);
    const boundary = context.selectedBoundary?.boundaryId === boundaryId
      ? context.selectedBoundary
      : null;
    if (!boundary) return { ok: false, problem: '首版只允许调整工程师当前选中的边界。' };
    if (!Number.isFinite(depthM) || depthM < 0) return { ok: false, problem: '建议边界深度无效。' };
    return {
      ok: true,
      proposal: {
        proposalId: newId('assistant-proposal'),
        commandId: newId('assistant-command'),
        toolCallId: call.id,
        kind: 'move-boundary',
        title: `将当前边界调整到 ${depthM.toFixed(2)} m`,
        reason,
        before: `边界深度：${boundary.depthM.toFixed(2)} m`,
        after: `边界深度：${depthM.toFixed(2)} m`,
        impact: proposalImpact(context, 'boundary'),
        risk: 'upstream',
        draftAction: proposalDraftAction(context),
        scope: context.scope,
        payload: { kind: 'move-boundary', boundaryId, depthM },
      },
    };
  }
  return { ok: false, problem: `助手请求了未允许的修改工具：${call.name}。` };
}
