if (process.env.RUN_DEEPSEEK_SMOKE !== '1') {
  process.stdout.write('DeepSeek smoke skipped: set RUN_DEEPSEEK_SMOKE=1 explicitly.\n');
  process.exit(0);
}

const { assistantServerConfig } = await import('./config.mjs');

if (!assistantServerConfig.deepseekApiKey) {
  process.stderr.write('DeepSeek smoke skipped: no readable server-side key is configured.\n');
  process.exit(2);
}

const { requestDeepSeekTurn, validateDeepSeekConnection } = await import('./providers.mjs');

const context = {
  scope: {
    projectId: 'smoke-project',
    projectName: '联调项目',
    pointId: 'smoke-point',
    pointName: 'CPT-SMOKE',
    route: 'stratification',
    routeLabel: '地层分层',
    workspaceRevision: 1,
    checkRunId: 'smoke-check',
    classificationRunId: null,
    stratificationRevisionId: null,
    hasWorkingDraft: false,
    parameterRunId: null,
    authorityHash: 'assistant-smoke',
  },
  status: {
    check: 'current',
    classification: 'not-started',
    stratification: 'not-started',
    parameters: 'not-started',
    output: 'not-started',
  },
  counts: {
    measuredRows: 4,
    layers: 0,
    boundaries: 0,
    pendingLayers: 0,
    parameterProblems: 0,
    outputs: 0,
  },
  selectedLayer: null,
  selectedBoundary: null,
  layers: [],
  boundaries: [],
  notices: [],
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 90_000);
try {
  const connection = await validateDeepSeekConnection({
    apiKey: assistantServerConfig.deepseekApiKey,
    signal: controller.signal,
  });
  const result = await requestDeepSeekTurn({
    apiKey: assistantServerConfig.deepseekApiKey,
    turns: [{ role: 'user', content: '请先读取当前工作流摘要，再简短说明现在做到哪一步。' }],
    context,
    signal: controller.signal,
  });
  if (!result || !['message', 'tool_calls'].includes(result.kind)) {
    throw new Error('DeepSeek returned an unsupported response kind.');
  }
  const quickContext = {
    ...context,
    scope: {
      ...context.scope,
      route: 'quick-input',
      routeLabel: '快捷出图数据输入',
      authorityHash: 'quick-smoke-authority',
    },
    importSource: {
      operationId: 'quick-smoke-operation',
      protocolVersion: 'sigs.ai-import/2',
      requestId: 'quick-smoke-request',
      contextHash: 'quick-smoke-authority',
      sourceFingerprint: '7'.repeat(64),
      fileName: 'quick-smoke-headerless.csv',
      fileType: 'CSV',
      sizeBytes: 128,
      allowMeasurementEdits: false,
      sheets: [{
        sheetName: 'CSV',
        rowCount: 4,
        columnCount: 4,
        firstNonEmptyRows: [
          { displayRowNumber: 1, preview: ['0.01', '1.2', '12', '3'] },
          { displayRowNumber: 2, preview: ['0.02', '1.4', '14', '4'] },
        ],
      }],
    },
  };
  const quickTurns = [{
    role: 'user',
    content: '请判断当前无表头文件的数据范围，以及 depth、qc、可选 fs、可选 u2 的列和单位；形成结构化判断。',
  }];
  let quickResult = await requestDeepSeekTurn({
    apiKey: assistantServerConfig.deepseekApiKey,
    turns: quickTurns,
    context: quickContext,
    signal: controller.signal,
  });
  if (quickResult.kind === 'tool_calls' && quickResult.calls[0]?.name === 'read_quick_plot_source') {
    const readCall = quickResult.calls[0];
    quickResult = await requestDeepSeekTurn({
      apiKey: assistantServerConfig.deepseekApiKey,
      turns: [
        ...quickTurns,
        {
          role: 'assistant',
          content: quickResult.content,
          tool_calls: quickResult.calls.map((call) => ({
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: call.arguments },
          })),
          ...(quickResult.reasoningContent ? { reasoning_content: quickResult.reasoningContent } : {}),
        },
        {
          role: 'tool',
          tool_call_id: readCall.id,
          content: JSON.stringify({
            ok: true,
            sheetName: 'CSV',
            totalRows: 4,
            returnedRows: 4,
            rows: [
              { displayRowNumber: 1, cells: ['0.01', '1.2', '12', '3'] },
              { displayRowNumber: 2, cells: ['0.02', '1.4', '14', '4'] },
              { displayRowNumber: 3, cells: ['0.03', '1.6', '16', '5'] },
              { displayRowNumber: 4, cells: ['0.04', '1.8', '18', '6'] },
            ],
          }),
        },
      ],
      context: quickContext,
      signal: controller.signal,
    });
  }
  if (
    quickResult.kind !== 'tool_calls'
    || quickResult.calls.length !== 1
    || quickResult.calls[0].name !== 'submit_quick_plot_import_decision'
  ) {
    throw new Error('DeepSeek did not return one versioned quick-import decision.');
  }
  const quickDecision = JSON.parse(quickResult.calls[0].arguments);
  if (
    quickDecision.protocolVersion !== 'sigs.ai-import/2'
    || quickDecision.requestId !== quickContext.importSource.requestId
    || quickDecision.operationId !== quickContext.importSource.operationId
    || !['question', 'proposal'].includes(quickDecision.kind)
  ) {
    throw new Error('DeepSeek quick-import decision identity is incomplete.');
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    connected: connection.connected === true,
    kind: result.kind,
    model: result.model,
    toolNames: result.kind === 'tool_calls' ? result.calls.map((call) => call.name) : [],
    quickImport: {
      kind: quickDecision.kind,
      toolName: quickResult.calls[0].name,
      identityMatched: true,
    },
  })}\n`);
} finally {
  clearTimeout(timeout);
}
