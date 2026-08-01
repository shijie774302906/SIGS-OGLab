import { expect, test } from '@playwright/test';
import {
  createAssistantContextSnapshot,
  readBoundedAssistantDepthWindow,
} from '../../src/features/assistant/assistantContext';
import { getAssistantTurnAccessProblem } from '../../src/features/assistant/AssistantConnectionProvider';
import { assistantSessionReducer, initialAssistantSessionState } from '../../src/features/assistant/assistantState';
import {
  executeAssistantReadTool,
  proposalFromAssistantTool,
} from '../../src/features/assistant/assistantToolRegistry';
import type {
  AssistantContextSnapshot,
  AssistantProposal,
  AssistantWorkspacePort,
} from '../../src/features/assistant/assistantTypes';

function context(overrides: Partial<Parameters<typeof createAssistantContextSnapshot>[0]> = {}) {
  return createAssistantContextSnapshot({
    projectId: 'project-1',
    projectName: '测试项目',
    pointId: 'point-1',
    pointName: 'CPT-01',
    route: 'stratification',
    workspaceRevision: 4,
    checkRunId: 'check-1',
    classificationRunId: 'class-1',
    stratificationRevisionId: null,
    hasWorkingDraft: true,
    parameterRunId: null,
    statuses: {
      check: 'current',
      classification: 'completed',
      stratification: 'working',
      parameters: 'not-started',
      output: 'not-started',
    },
    counts: {
      measuredRows: 4282,
      pendingLayers: 1,
      parameterProblems: 0,
      outputs: 0,
    },
    layers: [{
      layerId: 'layer-1',
      name: 'L1',
      depthFromM: 0.01,
      depthToM: 4.5,
      engineeringSoilGroup: 'mixed',
      reviewRequired: true,
    }],
    boundaries: [{
      boundaryId: 'boundary-1',
      depthM: 4.5,
      reviewRequired: false,
    }],
    selectedLayerId: 'layer-1',
    selectedBoundaryId: 'boundary-1',
    notices: ['当前为工作草稿。'],
    ...overrides,
  });
}

function port(snapshot: AssistantContextSnapshot): AssistantWorkspacePort {
  return {
    getContext: () => snapshot,
    readDepthWindow: (request) => readBoundedAssistantDepthWindow([], request),
    validateProposal: (proposal) => ({ ok: true, proposal }),
    executeProposal: async () => ({ ok: true, message: '完成', authorityHash: snapshot.scope.authorityHash }),
    locateLayer: () => undefined,
    locateBoundary: () => undefined,
  };
}

test('assistant authority hash changes with route, revision and engineering state', () => {
  const base = context();
  expect(context().scope.authorityHash).toBe(base.scope.authorityHash);
  expect(context({ route: 'parameters' }).scope.authorityHash).not.toBe(base.scope.authorityHash);
  expect(context({ workspaceRevision: 5 }).scope.authorityHash).not.toBe(base.scope.authorityHash);
  expect(context({ hasWorkingDraft: false }).scope.authorityHash).not.toBe(base.scope.authorityHash);
  expect(context({
    layers: [{ ...base.layers[0], engineeringSoilGroup: 'clay' }],
  }).scope.authorityHash).not.toBe(base.scope.authorityHash);
});

test('DeepSeek turn access is denied until outbound engineering-data consent is granted', () => {
  const capability = {
    serviceAvailable: true as const,
    provider: 'deepseek' as const,
    model: 'deepseek-chat',
    requiresApiKey: true as const,
  };
  expect(getAssistantTurnAccessProblem({
    capability,
    status: 'connected',
    outboundConsent: false,
    hasApiKey: true,
  })).toBe('请先确认本次工程数据发送范围。');
  expect(getAssistantTurnAccessProblem({
    capability,
    status: 'connected',
    outboundConsent: true,
    hasApiKey: true,
  })).toBeNull();
});

test('PROCESS140 exhausted public quota stops public turns while a personal key remains usable', () => {
  const capability = {
    serviceAvailable: true as const,
    provider: 'deepseek' as const,
    model: 'deepseek-v4-pro',
    requiresApiKey: false,
    publicAccess: true,
    publicQuota: { status: 'exhausted' as const, limit: 100, used: 100, remaining: 0, resetAt: '2026-08-01T16:00:00.000Z' },
    serviceId: 'sigs-oglab-assistant',
    buildId: 'test',
    instanceId: 'test-instance',
    protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
  };
  expect(getAssistantTurnAccessProblem({
    capability,
    status: 'connected',
    outboundConsent: true,
    hasApiKey: false,
    requiresApiKey: false,
    usingPersonalKey: false,
    publicQuota: capability.publicQuota,
  })).toContain('今日公共 AI 额度已用完');
  expect(getAssistantTurnAccessProblem({
    capability,
    status: 'connected',
    outboundConsent: true,
    hasApiKey: true,
    requiresApiKey: false,
    usingPersonalKey: true,
    publicQuota: capability.publicQuota,
  })).toBeNull();
});

test('bounded depth read limits range, rows and returned fields', () => {
  const rows = Array.from({ length: 300 }, (_, index) => ({
    sourceRowId: `row-${index}`,
    depthM: index / 10,
    qcKpa: index + 1000,
    fsKpa: index + 10,
    u2Kpa: index - 20,
  }));
  const result = readBoundedAssistantDepthWindow(rows, {
    depthFromM: 2,
    depthToM: 18,
    fields: ['qc'],
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.rows.length).toBeLessThanOrEqual(120);
  expect(result.clipped).toBe(true);
  expect(result.rows[0].depthM).toBe(2);
  expect(result.rows.at(-1)?.depthM).toBe(18);
  expect(result.returnedRowCount).toBe(result.rows.length);
  expect(result.depthReference).toBe('below-mudline-positive-down');
  expect(result.units).toEqual({ qc: 'kPa' });
  expect(result.dataBasis).toBe('current-governed-working-data');
  expect(result.samplingMethod).toBe('even-source-index');
  expect(result.gapSemantics).toBe('not-assessable-from-sample');
  expect(result.interpolated).toBe(false);
  expect(result.rows[0]).toHaveProperty('qcKpa');
  expect(result.rows[0]).not.toHaveProperty('fsKpa');
  expect(result.rows[0]).not.toHaveProperty('u2Kpa');

  expect(readBoundedAssistantDepthWindow(rows, {
    depthFromM: 0,
    depthToM: 21,
    fields: ['qc'],
  })).toEqual({ ok: false, problem: expect.stringContaining('不超过 20 m') });
});

test('unknown tools and foreign layer targets are rejected before a proposal exists', () => {
  const snapshot = context();
  expect(executeAssistantReadTool({
    id: 'tool-1',
    name: 'read_entire_file',
    arguments: '{}',
  }, port(snapshot))).toEqual({
    ok: false,
    problem: '助手请求了未允许的读取工具：read_entire_file。',
  });
  expect(proposalFromAssistantTool({
    id: 'tool-2',
    name: 'propose_set_layer_soil_group',
    arguments: JSON.stringify({
      layerId: 'foreign-layer',
      engineeringSoilGroup: 'sand',
      reason: 'test',
    }),
  }, snapshot)).toEqual({
    ok: false,
    problem: '建议指向的土层不属于当前分层方案。',
  });
});

test('proposal state never records an edit as applied before explicit confirmation', () => {
  const snapshot = context();
  const proposalResult = proposalFromAssistantTool({
    id: 'tool-3',
    name: 'propose_set_layer_soil_group',
    arguments: JSON.stringify({
      layerId: 'layer-1',
      engineeringSoilGroup: 'sand',
      reason: '工程师明确要求。',
    }),
  }, snapshot);
  expect(proposalResult.ok).toBe(true);
  if (!proposalResult.ok) return;
  const proposed = assistantSessionReducer(initialAssistantSessionState, {
    type: 'propose',
    proposal: proposalResult.proposal,
    assistantTurn: {
      role: 'assistant',
      content: null,
      toolCalls: [{
        id: 'tool-3',
        name: 'propose_set_layer_soil_group',
        arguments: '{}',
      }],
    },
    message: { id: 'message-1', role: 'assistant', content: '请确认。' },
  });
  expect(proposed.status).toBe('awaiting-confirmation');
  expect(proposed.proposal?.payload).toEqual({
    kind: 'set-layer-soil-group',
    layerId: 'layer-1',
    engineeringSoilGroup: 'sand',
  });

  const cancelled = assistantSessionReducer(proposed, {
    type: 'proposal-clear',
    turn: { role: 'tool', toolCallId: 'tool-3', content: '{"status":"rejected-by-user"}' },
  });
  expect(cancelled.proposal).toBeNull();
  expect(cancelled.status).toBe('idle');
  expect(snapshot.layers[0].engineeringSoilGroup).toBe('mixed');

  const changed = assistantSessionReducer(proposed, {
    type: 'context-changed',
    message: { id: 'context-2', role: 'system', content: '上下文已变化。' },
  });
  expect(changed.proposal).toBeNull();
  expect(changed.turns).toEqual([]);
  expect(changed.messages).toEqual([{ id: 'context-2', role: 'system', content: '上下文已变化。' }]);
});

test('depth window preserves missing u2 and real depth gaps without interpolation', () => {
  const result = readBoundedAssistantDepthWindow([
    { sourceRowId: 'row-1', depthM: 1, qcKpa: 1000, fsKpa: 10, u2Kpa: 20 },
    { sourceRowId: 'row-2', depthM: 1.1, qcKpa: 1010, fsKpa: 11, u2Kpa: null },
    { sourceRowId: 'row-3', depthM: 3.5, qcKpa: 1100, fsKpa: 12, u2Kpa: 25 },
  ], {
    depthFromM: 1,
    depthToM: 3.5,
    fields: ['qc', 'fs', 'u2'],
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.rows.map((row) => row.depthM)).toEqual([1, 1.1, 3.5]);
  expect(result.rows[1].u2Kpa).toBeNull();
  expect(result.missingCounts).toEqual({ qc: 0, fs: 0, u2: 1 });
  expect(result.interpolated).toBe(false);
  expect(result.samplingMethod).toBe('all-source-rows');
  expect(result.gapSemantics).toBe('all-source-depths-preserved');
});

test('sampled depth windows never imply that sampled spacing is a source-data gap', () => {
  const rows = Array.from({ length: 150 }, (_, index) => ({
    sourceRowId: `gap-row-${index}`,
    depthM: index < 75 ? index / 100 : 2 + index / 100,
    qcKpa: 1000 + index,
    fsKpa: 10 + index,
    u2Kpa: 20 + index,
  }));
  const result = readBoundedAssistantDepthWindow(rows, {
    depthFromM: 0,
    depthToM: 4,
    fields: ['qc', 'fs', 'u2'],
  });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.clipped).toBe(true);
  expect(result.rows).toHaveLength(120);
  expect(result.rows[0].sourceRowId).toBe('gap-row-0');
  expect(result.rows.at(-1)?.sourceRowId).toBe('gap-row-149');
  expect(result.gapSemantics).toBe('not-assessable-from-sample');
  expect(result.interpolated).toBe(false);
});

test('proposal distinguishes an unconfirmed draft, first edit of a confirmed revision and an existing draft', () => {
  const call = {
    id: 'tool-4',
    name: 'propose_move_boundary',
    arguments: JSON.stringify({
      boundaryId: 'boundary-1',
      depthM: 4.8,
      reason: '核对曲线后建议。',
    }),
  };
  const unconfirmed = context({ stratificationRevisionId: null, hasWorkingDraft: true });
  const unconfirmedResult = proposalFromAssistantTool(call, unconfirmed);
  expect(unconfirmedResult.ok).toBe(true);
  if (!unconfirmedResult.ok) return;
  expect(unconfirmedResult.proposal.draftAction).toBe('update');
  expect(unconfirmedResult.proposal.scope.stratificationRevisionId).toBeNull();
  expect(unconfirmedResult.proposal.impact).toContain('当前工作草稿');

  const confirmedWithoutDraft = context({
    stratificationRevisionId: 'strat-rev-1',
    hasWorkingDraft: false,
  });
  const createResult = proposalFromAssistantTool(call, confirmedWithoutDraft);
  expect(createResult.ok).toBe(true);
  if (!createResult.ok) return;
  expect(createResult.proposal.draftAction).toBe('create');
  expect(createResult.proposal.impact).toContain('创建工作草稿');

  const confirmedWithDraft = context({
    stratificationRevisionId: 'strat-rev-1',
    hasWorkingDraft: true,
  });
  const updateResult = proposalFromAssistantTool(call, confirmedWithDraft);
  expect(updateResult.ok).toBe(true);
  if (!updateResult.ok) return;
  const proposal: AssistantProposal = updateResult.proposal;
  expect(proposal.risk).toBe('upstream');
  expect(proposal.draftAction).toBe('update');
  expect(proposal.impact).toContain('更新当前工作草稿');
  expect(proposal.scope.authorityHash).toBe(confirmedWithDraft.scope.authorityHash);
  expect(proposal.commandId).toContain('assistant-command:');
});
