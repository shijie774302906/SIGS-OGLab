import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assistantServerConfig, createAssistantServerConfig, resolveAssistantSecret } from './config.mjs';
import { createAssistantCore } from './core.mjs';
import { validateAssistantRequest, normalizeProviderToolCalls } from './policy.mjs';
import { requestDeepSeekTurn, requestMockTurn } from './providers.mjs';
import { createNodeAssistantServer } from './server.mjs';
import { buildDevCommands, developmentServiceCompatibilityProblem } from '../../scripts/dev-full.mjs';
import { assistantToolsForContext } from './tools.mjs';
import { ASSISTANT_BUILD_ID } from './protocol.mjs';
import {
  createAssistantQuotaService,
  createAssistantVisitor,
  createMemoryQuotaStore,
  publicQuotaWindow,
} from './quota.mjs';

function context() {
  return {
    assistantProfile: 'professional-governed',
    scope: {
      projectId: 'project-1',
      projectName: '测试项目',
      pointId: 'point-1',
      pointName: 'CPT-01',
      route: 'stratification',
      routeLabel: '地层分层',
      workspaceRevision: 2,
      checkRunId: 'check-1',
      classificationRunId: 'class-1',
      stratificationRevisionId: null,
      hasWorkingDraft: false,
      parameterRunId: null,
      authorityHash: 'assistant-test',
    },
    status: {
      check: 'current',
      classification: 'completed',
      stratification: 'working',
      parameters: 'not-started',
      output: 'not-started',
    },
    counts: {
      measuredRows: 100,
      layers: 1,
      boundaries: 0,
      pendingLayers: 1,
      parameterProblems: 0,
      outputs: 0,
    },
    selectedLayer: {
      layerId: 'layer-1',
      name: 'L1',
      depthFromM: 0,
      depthToM: 5,
      engineeringSoilGroup: 'mixed',
      reviewRequired: true,
    },
    selectedBoundary: null,
    layers: [],
    boundaries: [],
    notices: [],
  };
}

function importContext() {
  return {
    ...context(),
    scope: {
      ...context().scope,
      route: 'import',
      routeLabel: '数据导入',
    },
    importSource: {
      operationId: 'import-1',
      sourceFingerprint: 'a'.repeat(64),
      fileName: 'messy.csv',
      fileType: 'CSV',
      sizeBytes: 128,
      allowMeasurementEdits: false,
      sheets: [{
        sheetName: 'CSV',
        rowCount: 4,
        columnCount: 4,
        firstNonEmptyRows: [{
          displayRowNumber: 2,
          preview: ['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)'],
        }],
      }],
    },
  };
}

function quickInputContext() {
  return {
    ...importContext(),
    assistantProfile: 'quick-import-governed',
    scope: {
      ...importContext().scope,
      route: 'quick-input',
      routeLabel: '快捷出图数据输入',
    },
  };
}

function quickReportContext() {
  return {
    ...context(),
    assistantProfile: 'report-reader',
    scope: {
      ...context().scope,
      route: 'quick-report',
      routeLabel: '快捷出图图册',
    },
    quickPlotReport: {
      revisionId: 'quick-revision-1',
      authorityHash: 'quick-report-authority-1',
      pageNumber: 6,
      pageCount: 15,
      pageTitle: 'CPT 解译参考地层',
      methodIds: ['R06'],
      chartTypes: ['qt-depth', 'jts-layer-depth'],
      route: 'full_cptu',
      measuredRows: 100,
      depthFromM: 0,
      depthToM: 60,
      sourceName: 'source.csv',
      notices: ['只解释当前页'],
      pages: [{
        pageNumber: 6,
        title: 'CPT 解译参考地层',
        methodIds: ['R06'],
        chartTypes: ['qt-depth', 'jts-layer-depth'],
        referencePage: 6,
        orientation: 'landscape',
      }],
    },
  };
}

test('default DeepSeek model is v4-pro and import route exposes only import tools', () => {
  const config = createAssistantServerConfig({});
  assert.equal(config.deepseekModel, 'deepseek-v4-pro');
  assert.equal(config.requestTimeoutMs, 55_000);
  assert.equal(createAssistantServerConfig({ ASSISTANT_TIMEOUT_MS: '60000' }).requestTimeoutMs, 55_000);
  assert.equal(assistantServerConfig.deepseekModel, 'deepseek-v4-pro');
  assert.deepEqual(
    assistantToolsForContext(importContext()).map((tool) => tool.function.name),
    ['read_import_source', 'ask_import_question', 'propose_import_cleanup'],
  );
  assert.deepEqual(
    assistantToolsForContext(context()).map((tool) => tool.function.name),
    ['read_workflow_summary', 'read_depth_window', 'propose_set_layer_soil_group', 'propose_move_boundary'],
  );
  assert.deepEqual(
    assistantToolsForContext(quickInputContext()).map((tool) => tool.function.name),
    ['read_quick_plot_source', 'submit_quick_plot_import_decision'],
  );
  assert.deepEqual(
    assistantToolsForContext(quickReportContext()).map((tool) => tool.function.name),
    [
      'list_quick_plot_pages',
      'read_quick_plot_page',
      'read_quick_plot_chart',
      'read_quick_plot_method',
      'read_quick_plot_depth_window',
    ],
  );
});

test('import conversations reject engineering write tools and keep a bounded source summary', () => {
  const result = validateAssistantRequest({
    turns: [{
      role: 'assistant',
      content: null,
      toolCalls: [{
        id: 'tool-foreign',
        name: 'propose_move_boundary',
        arguments: JSON.stringify({ boundaryId: 'b1', depthM: 2, reason: 'test' }),
      }],
    }],
    context: importContext(),
  });
  assert.equal(result.ok, false);
  assert.match(result.problem, /当前页面|褰撳墠椤甸潰/);

  const valid = validateAssistantRequest({
    turns: [{ role: 'user', content: '请整理并导入' }],
    context: importContext(),
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.context.importSource.sheets[0].firstNonEmptyRows.length, 1);
  assert.equal(valid.context.importSource.allowMeasurementEdits, false);
});

test('quick routes isolate file-mapping tools from read-only atlas explanation', () => {
  const input = validateAssistantRequest({
    turns: [{ role: 'user', content: '请整理并导入' }],
    context: quickInputContext(),
  });
  assert.equal(input.ok, true);
  assert.equal(input.context.importSource.fileName, 'messy.csv');

  const foreignWrite = validateAssistantRequest({
    turns: [{
      role: 'assistant',
      content: null,
      toolCalls: [{
        id: 'quick-foreign',
        name: 'submit_quick_plot_import_decision',
        arguments: '{}',
      }],
    }],
    context: quickReportContext(),
  });
  assert.equal(foreignWrite.ok, false);

  const report = validateAssistantRequest({
    turns: [{ role: 'user', content: '解释当前页' }],
    context: quickReportContext(),
  });
  assert.equal(report.ok, true);
  assert.equal(report.context.quickPlotReport.pageNumber, 6);
  assert.equal(report.context.quickPlotReport.pageTitle, 'CPT 解译参考地层');
  assert.equal(report.context.assistantProfile, 'report-reader');
});

test('assistant profiles reject cross-profile tools even when conversation history contains them', () => {
  const reportWrite = validateAssistantRequest({
    turns: [{
      role: 'assistant',
      content: null,
      toolCalls: [{
        id: 'report-write',
        name: 'propose_move_boundary',
        arguments: JSON.stringify({ boundaryId: 'b1', depthM: 2, reason: 'test' }),
      }],
    }],
    context: quickReportContext(),
  });
  assert.equal(reportWrite.ok, false);

  const mismatchedProfile = validateAssistantRequest({
    turns: [{ role: 'user', content: '解释当前页' }],
    context: { ...quickReportContext(), assistantProfile: 'quick-import-governed' },
  });
  assert.equal(mismatchedProfile.ok, false);
  assert.match(mismatchedProfile.problem, /上下文无效/);
});

test('request policy rejects unknown tools and oversized conversations', () => {
  const unknown = validateAssistantRequest({
    turns: [{
      role: 'assistant',
      content: null,
      toolCalls: [{ id: 'tool-1', name: 'run_code', arguments: '{}' }],
    }],
    context: context(),
  });
  assert.equal(unknown.ok, false);
  assert.match(unknown.problem, /未允许/);

  const oversized = validateAssistantRequest({
    turns: Array.from({ length: 31 }, (_, index) => ({ role: 'user', content: `问题 ${index}` })),
    context: context(),
  });
  assert.deepEqual(oversized, { ok: false, problem: '对话轮数超出允许范围。' });
});

test('request policy truncates untrusted labels and never expands the layer payload', () => {
  const result = validateAssistantRequest({
    turns: [{ role: 'user', content: '当前到哪一步？' }],
    context: {
      ...context(),
      scope: { ...context().scope, projectName: 'x'.repeat(400) },
      layers: Array.from({ length: 100 }, (_, index) => ({
        layerId: `layer-${index}`,
        name: `L${index}`,
        depthFromM: index,
        depthToM: index + 1,
        engineeringSoilGroup: 'sand',
      })),
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.context.scope.projectName.length, 120);
  assert.equal(result.context.layers.length, 80);
});

test('provider tool normalization rejects malformed JSON and arbitrary names', () => {
  assert.throws(() => normalizeProviderToolCalls([{
    id: 'tool-1',
    function: { name: 'read_depth_window', arguments: '{bad' },
  }]), /有效 JSON/);
  assert.throws(() => normalizeProviderToolCalls([{
    id: 'tool-2',
    function: { name: 'delete_project', arguments: '{}' },
  }]), /未允许/);
});

test('DeepSeek import turns reject a wrong-page tool as a safe user-facing explanation', async () => {
  const result = await requestDeepSeekTurn({
    apiKey: 'sk-import-test-12345678901234567890',
    turns: [{ role: 'user', content: '请整理这个文件' }],
    context: importContext(),
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.model, 'deepseek-v4-pro');
      assert.deepEqual(
        request.tools.map((tool) => tool.function.name),
        ['read_import_source', 'ask_import_question', 'propose_import_cleanup'],
      );
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'wrong-page-tool',
              function: { name: 'read_workflow_summary', arguments: '{}' },
            }],
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(result.kind, 'message');
  assert.match(result.content, /没有形成可用的字段整理建议/);
  assert.match(result.content, /原文件未修改/);
});

test('DeepSeek quick import enforces one versioned decision even though thinking mode requires automatic tool choice', async () => {
  const base = {
    apiKey: 'sk-quick-test-12345678901234567890',
    turns: [{ role: 'user', content: '请判断这个文件' }],
    context: {
      ...quickInputContext(),
      importSource: {
        ...quickInputContext().importSource,
        protocolVersion: 'sigs.ai-import/1',
        requestId: 'request-quick-1',
        contextHash: 'quick-authority',
      },
    },
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
  };
  await assert.rejects(requestDeepSeekTurn({
    ...base,
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.tool_choice, 'auto');
      assert.equal(request.max_tokens, 3_000);
      assert.deepEqual(
        request.tools.map((tool) => tool.function.name),
        ['read_quick_plot_source', 'submit_quick_plot_import_decision'],
      );
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{ finish_reason: 'stop', message: { content: '我觉得第二列是 qc。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  }), /没有形成可确认的文件判断/);

  await assert.rejects(requestDeepSeekTurn({
    ...base,
    fetchImpl: async () => new Response(JSON.stringify({
      model: 'deepseek-v4-pro',
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          content: null,
          tool_calls: [
            { id: 'decision-1', function: { name: 'submit_quick_plot_import_decision', arguments: '{}' } },
            { id: 'decision-2', function: { name: 'submit_quick_plot_import_decision', arguments: '{}' } },
          ],
        },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  }), /唯一的文件判断/);
});

test('DeepSeek import turns use a large output budget and preserve thinking-mode tool state', async () => {
  const reasoningContent = 'internal thinking state required by the provider';
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.max_tokens, 8_000);
      const assistantTurn = request.messages.find((message) => message.role === 'assistant');
      const toolTurn = request.messages.find((message) => message.role === 'tool');
      assert.equal(assistantTurn.reasoning_content, reasoningContent);
      assert.equal(toolTurn.tool_call_id, 'read-import-1');
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{
          finish_reason: 'tool_calls',
          message: {
            content: null,
            reasoning_content: 'next private provider state',
            tool_calls: [{
              id: 'cleanup-1',
              function: {
                name: 'propose_import_cleanup',
                arguments: JSON.stringify({
                  sourceFingerprint: 'a'.repeat(64),
                  sheetName: 'CSV',
                  headerRow: 2,
                  summary: '识别完成。',
                  columns: [
                    { sourceColumnIndex: 0, targetField: 'depthM', sourceUnit: 'm', reason: '深度列。' },
                    { sourceColumnIndex: 1, targetField: 'qc', sourceUnit: 'MPa', reason: 'qc 列。' },
                    { sourceColumnIndex: 2, targetField: 'fs', sourceUnit: 'kPa', reason: 'fs 列。' },
                  ],
                  cellEdits: [],
                }),
              },
            }],
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const result = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': 'sk-import-test-12345678901234567890' },
    body: {
      turns: [
        { role: 'user', content: '请整理这个文件。' },
        {
          role: 'assistant',
          content: null,
          reasoningContent,
          toolCalls: [{
            id: 'read-import-1',
            name: 'read_import_source',
            arguments: JSON.stringify({ sheetName: 'CSV', rowStart: 1, rowCount: 4 }),
          }],
        },
        {
          role: 'tool',
          toolCallId: 'read-import-1',
          content: JSON.stringify({ sheetName: 'CSV', returnedRows: 4, rows: [] }),
        },
      ],
      context: importContext(),
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.kind, 'tool_calls');
  assert.equal(result.body.reasoningContent, 'next private provider state');
  assert.deepEqual(result.body.calls.map((call) => call.name), ['propose_import_cleanup']);
});

test('truncated DeepSeek import output reports the real recoverable reason', async () => {
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.max_tokens, 8_000);
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{
          finish_reason: 'length',
          message: { content: '', reasoning_content: 'unfinished' },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const result = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': 'sk-import-test-12345678901234567890' },
    body: {
      turns: [{ role: 'user', content: '请整理这个文件。' }],
      context: importContext(),
    },
  });
  assert.deepEqual(result, {
    status: 422,
    body: {
      problem: 'DeepSeek 整理内容未生成完整，请重试；原文件未修改。',
      code: 'MODEL_OUTPUT_TRUNCATED',
    },
  });
});

test('PROCESS145 quick report timeout explains the reason and preserves a direct retry path', async () => {
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      await new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    },
  });
  const controller = new AbortController();
  const pending = core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': 'sk-report-timeout-test-1234567890' },
    body: {
      turns: [{ role: 'user', content: '为什么这里缺了一部分土体分层？' }],
      context: quickReportContext(),
    },
    signal: controller.signal,
  });
  controller.abort('timeout');
  const result = await pending;
  assert.deepEqual(result, {
    status: 504,
    body: {
      problem: '模型读取图册超过 55 秒。你的问题已保留，可以直接重新解读；图册和数据没有改变。',
      code: 'UPSTREAM_TIMEOUT',
    },
  });
});

test('PROCESS145 quick report truncation uses report wording instead of import wording', async () => {
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async () => new Response(JSON.stringify({
      model: 'deepseek-v4-pro',
      choices: [{ finish_reason: 'length', message: { content: '', reasoning_content: 'unfinished' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  const result = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': 'sk-report-truncated-test-1234567890' },
    body: {
      turns: [{ role: 'user', content: '解释当前页。' }],
      context: quickReportContext(),
    },
  });
  assert.deepEqual(result, {
    status: 422,
    body: {
      problem: '这次图册回答没有生成完整。你的问题已保留，可以直接重新解读；图册和数据没有改变。',
      code: 'MODEL_OUTPUT_TRUNCATED',
    },
  });
});

test('ordinary professional assistant turns keep the smaller output budget', async () => {
  await requestDeepSeekTurn({
    apiKey: 'sk-regular-test-12345678901234567890',
    turns: [{ role: 'user', content: '当前状态？' }],
    context: context(),
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.max_tokens, 1_200);
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{ finish_reason: 'stop', message: { content: '当前状态正常。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
});

test('mock provider deterministically reads first and only proposes the selected layer', async () => {
  const summary = await requestMockTurn({
    turns: [{ role: 'user', content: '现在做到哪一步？' }],
    context: context(),
  });
  assert.equal(summary.kind, 'tool_calls');
  assert.equal(summary.calls[0].name, 'read_workflow_summary');

  const proposal = await requestMockTurn({
    turns: [{ role: 'user', content: '把当前层改成砂土' }],
    context: context(),
  });
  assert.equal(proposal.kind, 'tool_calls');
  assert.equal(proposal.calls[0].name, 'propose_set_layer_soil_group');
  assert.equal(JSON.parse(proposal.calls[0].arguments).layerId, 'layer-1');
});

test('PROCESS136 report mock can answer a concept directly without a forced tool call', async () => {
  const response = await requestMockTurn({
    turns: [{ role: 'user', content: '什么是 SBT？' }],
    context: quickReportContext(),
  });
  assert.equal(response.kind, 'message');
  assert.match(response.content, /土体行为类型/);
});

test('PROCESS136 DeepSeek report turns keep automatic tool choice and preserve a direct answer', async () => {
  const response = await requestDeepSeekTurn({
    apiKey: 'sk-test-deepseek-report-key-123456',
    turns: [{ role: 'user', content: '什么是 SBT？' }],
    context: quickReportContext(),
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.tool_choice, 'auto');
      assert.equal(request.max_tokens, 3_000);
      assert.deepEqual(
        request.tools.map((tool) => tool.function.name),
        [
          'list_quick_plot_pages',
          'read_quick_plot_page',
          'read_quick_plot_chart',
          'read_quick_plot_method',
          'read_quick_plot_depth_window',
        ],
      );
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{
          finish_reason: 'stop',
          message: { content: 'SBT 是土体行为类型分类。' },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(response.kind, 'message');
  assert.equal(response.content, 'SBT 是土体行为类型分类。');
});

test('PROCESS145 DeepSeek report synthesizes after one read batch instead of looping tools', async () => {
  const response = await requestDeepSeekTurn({
    apiKey: 'sk-test-deepseek-report-key-123456',
    turns: [
      { role: 'user', content: '请说明本页砂土参数。' },
      {
        role: 'assistant',
        content: null,
        toolCalls: [{ id: 'read-page-10', name: 'read_quick_plot_page', arguments: '{"pageNumber":10}' }],
      },
      { role: 'tool', toolCallId: 'read-page-10', content: '{"ok":true,"pageNumber":10}' },
    ],
    context: quickReportContext(),
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.tool_choice, undefined);
      assert.equal(request.tools, undefined);
      return new Response(JSON.stringify({
        model: 'deepseek-v4-pro',
        choices: [{ finish_reason: 'stop', message: { content: '已根据读取证据回答。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.equal(response.kind, 'message');
  assert.match(response.content, /读取证据/);
});

test('PROCESS145 DeepSeek report rejects DSML tool markup returned as visible prose', async () => {
  await assert.rejects(requestDeepSeekTurn({
    apiKey: 'sk-test-deepseek-report-key-123456',
    turns: [{ role: 'user', content: '请比较分类结果。' }],
    context: quickReportContext(),
    config: {
      deepseekModel: 'deepseek-v4-pro',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async () => new Response(JSON.stringify({
      model: 'deepseek-v4-pro',
      choices: [{
        finish_reason: 'stop',
        message: { content: '<｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="read_quick_plot_page">' },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  }), (error) => error?.code === 'MODEL_TOOL_FORMAT');
});

test('mock quick provider uses the same versioned decision contract for headerless rows', async () => {
  const quickContext = {
    ...quickInputContext(),
    importSource: {
      ...quickInputContext().importSource,
      protocolVersion: 'sigs.ai-import/1',
      requestId: 'mock-quick-request',
      contextHash: 'mock-quick-context',
    },
  };
  const first = await requestMockTurn({
    turns: [{ role: 'user', content: '请判断文件' }],
    context: quickContext,
  });
  assert.equal(first.kind, 'tool_calls');
  assert.equal(first.calls[0].name, 'read_quick_plot_source');
  const second = await requestMockTurn({
    turns: [
      { role: 'user', content: '请判断文件' },
      {
        role: 'tool',
        tool_call_id: first.calls[0].id,
        content: JSON.stringify({
          sheetName: 'CSV',
          totalRows: 3,
          rows: [
            { displayRowNumber: 1, cells: ['0.01', '1.2', '12', '3'] },
            { displayRowNumber: 2, cells: ['0.02', '1.4', '14', '4'] },
            { displayRowNumber: 3, cells: ['0.03', '1.6', '16', '5'] },
          ],
        }),
      },
    ],
    context: quickContext,
  });
  assert.equal(second.kind, 'tool_calls');
  assert.equal(second.calls.length, 1);
  assert.equal(second.calls[0].name, 'submit_quick_plot_import_decision');
  const decision = JSON.parse(second.calls[0].arguments);
  assert.deepEqual({
    protocolVersion: decision.protocolVersion,
    requestId: decision.requestId,
    operationId: decision.operationId,
    sourceFingerprint: decision.sourceFingerprint,
    contextHash: decision.contextHash,
    kind: decision.kind,
    headerMode: decision.proposal.headerMode,
    headerRow: decision.proposal.headerRow,
    dataStartRow: decision.proposal.dataStartRow,
  }, {
    protocolVersion: 'sigs.ai-import/1',
    requestId: 'mock-quick-request',
    operationId: quickContext.importSource.operationId,
    sourceFingerprint: quickContext.importSource.sourceFingerprint,
    contextHash: 'mock-quick-context',
    kind: 'proposal',
    headerMode: 'absent',
    headerRow: null,
    dataStartRow: 1,
  });
});

test('mock provider output does not expose environment secrets', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-secret-that-must-not-appear';
  const response = await requestMockTurn({
    turns: [{ role: 'user', content: '当前状态' }],
    context: context(),
  });
  assert.doesNotMatch(JSON.stringify(response), /test-secret-that-must-not-appear/);
});

test('assistant config reads an ignored key file without exposing its value', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'sigs-assistant-'));
  try {
    const secret = 'sk-test-file-secret-1234567890';
    writeFileSync(path.join(directory, 'private-key.md'), `${secret}\n`, 'utf8');
    const result = resolveAssistantSecret({
      environment: { DEEPSEEK_API_KEY_FILE: 'private-key.md' },
      cwd: directory,
    });
    assert.equal(result.value, secret);
    assert.equal(result.source, 'file');
    assert.equal(result.problem, null);
    assert.doesNotMatch(JSON.stringify({ source: result.source, problem: result.problem }), /sk-test-file/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('full development launcher starts Vite and the assistant with forwarded Vite options', () => {
  const commands = buildDevCommands(['--port', '5173'], 'D:\\workspace');
  assert.equal(commands.length, 2);
  assert.match(commands[0].arguments[0], /vite[\\/]bin[\\/]vite\.js$/);
  assert.deepEqual(commands[0].arguments.slice(-2), ['--port', '5173']);
  assert.match(commands[1].arguments[0], /server[\\/]assistant[\\/]server\.mjs$/);
  assert.match(developmentServiceCompatibilityProblem({
    assistantReachable: true,
    assistant: false,
    assistantPort: 8787,
  }), /旧版或不兼容/);
  assert.equal(developmentServiceCompatibilityProblem({
    assistantReachable: true,
    assistant: true,
    assistantPort: 8787,
  }), null);
});

test('capability only reports the stateless relay and never creates a server session', async () => {
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async () => {
      throw new Error('capability must not contact DeepSeek');
    },
  });
  const result = await core({
    method: 'GET',
    pathname: '/api/assistant/capabilities',
    headers: {},
    body: null,
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    serviceId: 'sigs-oglab-assistant',
    buildId: ASSISTANT_BUILD_ID,
    instanceId: result.body.instanceId,
    protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
    serviceAvailable: true,
    provider: 'deepseek',
    model: 'deepseek-chat',
    requiresApiKey: true,
    publicAccess: false,
  });
  assert.match(result.body.instanceId, /^[0-9a-f-]{20,}$/i);
  assert.doesNotMatch(JSON.stringify(result), /nonce|session/i);
});

test('connection validation sends only the temporary key and no project data', async () => {
  const secret = 'sk-connect-test-12345678901234567890';
  const requests = [];
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ object: 'list', data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const result = await core({
    method: 'POST',
    pathname: '/api/assistant/connect',
    headers: { 'x-deepseek-api-key': secret },
    body: null,
  });
  assert.deepEqual(result, {
    status: 200,
    body: { connected: true, provider: 'deepseek', model: 'deepseek-chat' },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.deepseek.com/models');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.body, undefined);
  assert.equal(requests[0].init.headers.Authorization, `Bearer ${secret}`);
  assert.doesNotMatch(JSON.stringify(result), /sk-connect-test/);
});

test('turns require a temporary key on every request and never reuse a validated key', async () => {
  const seenAuthorizations = [];
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (url, init) => {
      seenAuthorizations.push(init.headers.Authorization);
      if (url.endsWith('/models')) {
        return new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        model: 'deepseek-chat',
        choices: [{ message: { content: '只读回答。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const firstKey = 'sk-first-test-12345678901234567890';
  const secondKey = 'sk-second-test-1234567890123456789';
  await core({
    method: 'POST',
    pathname: '/api/assistant/connect',
    headers: { 'X-DeepSeek-Api-Key': firstKey },
    body: null,
  });
  const missing = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: {},
    body: { turns: [{ role: 'user', content: '状态？' }], context: context() },
  });
  assert.equal(missing.status, 401);
  const turn = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': secondKey },
    body: { turns: [{ role: 'user', content: '状态？' }], context: context() },
  });
  assert.equal(turn.status, 200);
  assert.deepEqual(seenAuthorizations, [`Bearer ${firstKey}`, `Bearer ${secondKey}`]);
  assert.doesNotMatch(JSON.stringify(turn), /sk-(first|second)-test/);
});

test('public access uses the server key while a personal key can override it per request', async () => {
  const serverKey = 'sk-server-test-12345678901234567890';
  const personalKey = 'sk-personal-test-123456789012345678';
  const seenAuthorizations = [];
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekApiKey: serverKey,
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async (_url, init) => {
      seenAuthorizations.push(init.headers.Authorization);
      return new Response(JSON.stringify({
        model: 'deepseek-chat',
        choices: [{ message: { content: '只读回答。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  const capability = await core({
    method: 'GET',
    pathname: '/api/assistant/capabilities',
    headers: {},
    body: null,
  });
  assert.equal(capability.body.publicAccess, true);
  assert.equal(capability.body.requiresApiKey, false);
  assert.deepEqual(capability.body.publicQuota, {
    status: 'available',
    limit: 100,
    used: 0,
    remaining: 100,
    resetAt: capability.body.publicQuota.resetAt,
  });
  assert.doesNotMatch(JSON.stringify(capability), /sk-server-test/);

  const publicTurn = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: {},
    body: { turns: [{ role: 'user', content: '状态？' }], context: context() },
  });
  const personalTurn = await core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers: { 'x-deepseek-api-key': personalKey },
    body: { turns: [{ role: 'user', content: '状态？' }], context: context() },
  });

  assert.equal(publicTurn.status, 200);
  assert.equal(publicTurn.body.publicQuota.remaining, 99);
  assert.equal(personalTurn.status, 200);
  assert.equal(personalTurn.body.publicQuota, undefined);
  assert.deepEqual(seenAuthorizations, [`Bearer ${serverKey}`, `Bearer ${personalKey}`]);
  assert.doesNotMatch(JSON.stringify([publicTurn, personalTurn]), /sk-(server|personal)-test/);
});

test('public quota uses Beijing date buckets and allows exactly 100 successful reservations', async () => {
  let now = new Date('2026-08-01T15:59:59.000Z');
  const quota = createAssistantQuotaService({
    config: { publicQuotaLimit: 100, publicQuotaStorage: 'memory' },
    now: () => now,
  });
  const beforeMidnight = publicQuotaWindow(now);
  assert.equal(beforeMidnight.date, '2026-08-01');
  assert.equal(beforeMidnight.resetAt, '2026-08-01T16:00:00.000Z');
  for (let index = 1; index <= 100; index += 1) {
    const result = await quota.reserve('visitor-a');
    assert.equal(result.accepted, true);
    assert.equal(result.quota.remaining, 100 - index);
  }
  const exhausted = await quota.reserve('visitor-a');
  assert.equal(exhausted.accepted, false);
  assert.equal(exhausted.reason, 'exhausted');
  assert.equal(exhausted.quota.remaining, 0);

  const otherVisitor = await quota.status('visitor-b');
  assert.equal(otherVisitor.remaining, 100);
  now = new Date('2026-08-01T16:00:01.000Z');
  const nextDay = await quota.status('visitor-a');
  assert.equal(nextDay.remaining, 100);
  assert.equal(publicQuotaWindow(now).date, '2026-08-02');
});

test('public quota accepts at most 100 concurrent reservations for one visitor', async () => {
  const quota = createAssistantQuotaService({
    config: { publicQuotaLimit: 100, publicQuotaStorage: 'memory' },
    now: () => new Date('2026-08-01T08:00:00.000Z'),
  });
  const results = await Promise.all(
    Array.from({ length: 140 }, () => quota.reserve('visitor-concurrent')),
  );

  assert.equal(results.filter((result) => result.accepted).length, 100);
  assert.equal(results.filter((result) => !result.accepted && result.reason === 'exhausted').length, 40);
  assert.equal((await quota.status('visitor-concurrent')).remaining, 0);
});

test('public quota releases a failed model call and personal keys bypass the counter', async () => {
  const serverKey = 'sk-server-quota-test-123456789012345';
  const personalKey = 'sk-personal-quota-test-1234567890123';
  let failNext = true;
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekApiKey: serverKey,
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
      publicQuotaLimit: 2,
      publicQuotaStorage: 'memory',
    },
    fetchImpl: async () => {
      if (failNext) {
        failNext = false;
        return new Response('{"error":{"message":"temporary"}}', { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        model: 'deepseek-chat',
        choices: [{ message: { content: '完成。' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const request = (headers = {}) => core({
    method: 'POST',
    pathname: '/api/assistant/turn',
    headers,
    quotaSubject: 'visitor-quota',
    body: { turns: [{ role: 'user', content: '状态？' }], context: context() },
  });

  const failed = await request();
  assert.equal(failed.status, 503);
  assert.equal(failed.body.publicQuota.remaining, 2);
  assert.equal((await request()).body.publicQuota.remaining, 1);
  assert.equal((await request()).body.publicQuota.remaining, 0);
  const exhausted = await request();
  assert.equal(exhausted.status, 429);
  assert.equal(exhausted.body.code, 'PUBLIC_QUOTA_EXHAUSTED');
  assert.match(exhausted.body.problem, /明日|自己的 DeepSeek Key/);

  const personal = await request({ 'x-deepseek-api-key': personalKey });
  assert.equal(personal.status, 200);
  assert.equal(personal.body.publicQuota, undefined);
});

test('assistant visitor cookie is signed, stable and stores only a derived subject', () => {
  const first = createAssistantVisitor({
    cookieHeader: '',
    secret: 'visitor-secret-test',
    randomUUID: () => '11111111-2222-4333-8444-555555555555',
  });
  assert.match(first.setCookie, /^sigs_ai_visitor=/);
  assert.match(first.setCookie, /HttpOnly/);
  assert.doesNotMatch(first.subject, /11111111/);
  const cookie = first.setCookie.split(';')[0];
  const second = createAssistantVisitor({ cookieHeader: cookie, secret: 'visitor-secret-test' });
  assert.equal(second.subject, first.subject);
  assert.equal(second.setCookie, null);
  const tampered = createAssistantVisitor({
    cookieHeader: `${cookie}x`,
    secret: 'visitor-secret-test',
    randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  });
  assert.notEqual(tampered.subject, first.subject);
  assert.match(tampered.setCookie, /^sigs_ai_visitor=/);
});

test('production config fails closed when public quota storage is not connected', async () => {
  const config = createAssistantServerConfig({
    VERCEL: '1',
    DEEPSEEK_API_KEY: 'sk-production-test-1234567890123456',
  });
  assert.equal(config.publicQuotaStorage, 'unavailable');
  const core = createAssistantCore({ config, fetchImpl: async () => { throw new Error('must not call provider'); } });
  const capability = await core({
    method: 'GET',
    pathname: '/api/assistant/capabilities',
    headers: {},
    quotaSubject: 'visitor-production',
  });
  assert.equal(capability.body.publicAccess, false);
  assert.equal(capability.body.requiresApiKey, true);
  assert.equal(capability.body.publicQuota.status, 'unavailable');
});

test('Vercel Marketplace KV aliases activate the shared Upstash quota store', () => {
  const config = createAssistantServerConfig({
    VERCEL: '1',
    DEEPSEEK_API_KEY: 'sk-server-marketplace-alias-test-123456',
    KV_REST_API_URL: 'https://example.upstash.io',
    KV_REST_API_TOKEN: 'marketplace-token',
  });

  assert.equal(config.publicQuotaStorage, 'upstash');
  assert.equal(config.upstashRedisRestUrl, 'https://example.upstash.io');
  assert.equal(config.upstashRedisRestToken, 'marketplace-token');
});

test('provider failures map to fixed copy without forwarding upstream content or the key', async () => {
  const secret = 'sk-error-test-12345678901234567890';
  const core = createAssistantCore({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
    },
    fetchImpl: async () => new Response(JSON.stringify({
      error: { message: `upstream echoed ${secret} with account metadata` },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
  });
  const result = await core({
    method: 'POST',
    pathname: '/api/assistant/connect',
    headers: { 'x-deepseek-api-key': secret },
    body: null,
  });
  assert.deepEqual(result, {
    status: 401,
    body: { problem: 'DeepSeek API Key 无效，请检查后重试。' },
  });
  assert.doesNotMatch(JSON.stringify(result), /sk-error-test|account metadata/);
});

test('Node adapter exposes the same stateless capability and connection contract', async () => {
  const server = createNodeAssistantServer({
    config: {
      provider: 'deepseek',
      deepseekModel: 'deepseek-chat',
      deepseekBaseUrl: 'https://api.deepseek.com',
      maxBodyBytes: 128 * 1024,
      maxConcurrentRequests: 2,
      requestTimeoutMs: 5_000,
    },
    fetchImpl: async () => new Response('{"data":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const capability = await fetch(`${baseUrl}/api/assistant/capabilities`).then((response) => response.json());
    assert.deepEqual(capability, {
      serviceId: 'sigs-oglab-assistant',
      buildId: ASSISTANT_BUILD_ID,
      instanceId: capability.instanceId,
      protocolVersions: ['sigs.assistant/1', 'sigs.ai-import/1'],
      serviceAvailable: true,
      provider: 'deepseek',
      model: 'deepseek-chat',
      requiresApiKey: true,
      publicAccess: false,
    });
    const connected = await fetch(`${baseUrl}/api/assistant/connect`, {
      method: 'POST',
      headers: { 'X-DeepSeek-Api-Key': 'sk-node-test-12345678901234567890' },
    }).then((response) => response.json());
    assert.deepEqual(connected, {
      connected: true,
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
