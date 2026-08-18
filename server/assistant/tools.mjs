export const ASSISTANT_TOOLS = Object.freeze([
  {
    type: 'function',
    function: {
      name: 'read_workflow_summary',
      description: '读取当前项目、点位、页面、修订、分层和参数状态摘要。回答当前进度或问题前优先调用。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_depth_window',
      description: '读取当前点位一个有限深度窗口的当前有效工作数据。深度为泥面以下、向下为正，单位 m；qc、fs、u2 均以 kPa 返回。最多 20 m、120 行；超过 120 行时按源行序号均匀抽样，此时抽样点间距不能用于判断原始深度间断。空值保留且不插值，不能读取整孔。',
      parameters: {
        type: 'object',
        required: ['depthFromM', 'depthToM', 'fields'],
        additionalProperties: false,
        properties: {
          depthFromM: { type: 'number', minimum: 0, description: '窗口起点，泥面以下深度，向下为正，单位 m。' },
          depthToM: { type: 'number', exclusiveMinimum: 0, description: '窗口终点，泥面以下深度，向下为正，单位 m；必须大于起点且跨度不超过 20 m。' },
          fields: {
            type: 'array',
            description: '需要读取的当前有效工作数据字段；qc、fs、u2 的返回单位均为 kPa。',
            minItems: 1,
            maxItems: 3,
            uniqueItems: true,
            items: { type: 'string', enum: ['qc', 'fs', 'u2'] },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_set_layer_soil_group',
      description: '提出修改当前方案某一层工程土类大类的建议。只生成待确认建议，绝不直接执行。',
      parameters: {
        type: 'object',
        required: ['layerId', 'engineeringSoilGroup', 'reason'],
        additionalProperties: false,
        properties: {
          layerId: { type: 'string', minLength: 1 },
          engineeringSoilGroup: { type: 'string', enum: ['sand', 'mixed', 'clay'] },
          reason: { type: 'string', minLength: 1, maxLength: 240 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_move_boundary',
      description: '提出调整工程师当前选中边界深度的建议。只生成待确认建议，绝不直接执行。',
      parameters: {
        type: 'object',
        required: ['boundaryId', 'depthM', 'reason'],
        additionalProperties: false,
        properties: {
          boundaryId: { type: 'string', minLength: 1 },
          depthM: { type: 'number', minimum: 0 },
          reason: { type: 'string', minLength: 1, maxLength: 240 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_import_source',
      description: '只在数据导入页读取当前上传来源的有限工作表窗口。先读来源再判断表头、字段和单位；每次最多 40 行、20 列，不读取文件二进制。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sheetName: { type: 'string', maxLength: 120 },
          rowStart: { type: 'integer', minimum: 1 },
          rowCount: { type: 'integer', minimum: 1, maximum: 40 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_import_question',
      description: '当工作表、表头、字段或单位无法可靠确定时，向用户提出一个结构化问题。一次只问一个问题，给 2–4 个固定选项，最多一个推荐项。',
      parameters: {
        type: 'object',
        required: ['questionId', 'prompt', 'reason', 'options'],
        additionalProperties: false,
        properties: {
          questionId: { type: 'string', minLength: 1, maxLength: 80 },
          prompt: { type: 'string', minLength: 1, maxLength: 240 },
          reason: { type: 'string', minLength: 1, maxLength: 240 },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              required: ['optionId', 'label', 'description', 'recommended'],
              additionalProperties: false,
              properties: {
                optionId: { type: 'string', minLength: 1, maxLength: 80 },
                label: { type: 'string', minLength: 1, maxLength: 80 },
                description: { type: 'string', maxLength: 160 },
                recommended: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_import_cleanup',
      description: '为当前来源提出一个待确认的导入整理草稿。声明工作表、表头、数据起止行、字段、单位和已授权的有限单元格修正；绝不直接导入、补值、插值、平滑或删除测量行。',
      parameters: {
        type: 'object',
        required: ['sourceFingerprint', 'sheetName', 'headerRow', 'summary', 'columns', 'cellEdits'],
        additionalProperties: false,
        properties: {
          sourceFingerprint: { type: 'string', minLength: 32, maxLength: 96 },
          sheetName: { type: 'string', minLength: 1, maxLength: 120 },
          headerRow: { type: ['integer', 'null'], minimum: 1 },
          dataStartRow: { type: 'integer', minimum: 1 },
          dataEndRow: { type: 'integer', minimum: 1 },
          summary: { type: 'string', minLength: 1, maxLength: 320 },
          columns: {
            type: 'array',
            minItems: 3,
            maxItems: 8,
            items: {
              type: 'object',
              required: ['sourceColumnIndex', 'targetField', 'sourceUnit', 'reason'],
              additionalProperties: false,
              properties: {
                sourceColumnIndex: { type: 'integer', minimum: 0 },
                targetField: { type: 'string', enum: ['pointName', 'depthM', 'qc', 'fs', 'u2'] },
                sourceUnit: { type: 'string', enum: ['text', 'm', 'cm', 'mm', 'kPa', 'MPa'] },
                headerLabel: { type: 'string', maxLength: 80 },
                reason: { type: 'string', minLength: 1, maxLength: 240 },
              },
            },
          },
          cellEdits: {
            type: 'array',
            maxItems: 50,
            items: {
              type: 'object',
              required: ['displayRowNumber', 'sourceColumnIndex', 'originalValue', 'newValue', 'reason'],
              additionalProperties: false,
              properties: {
                displayRowNumber: { type: 'integer', minimum: 1 },
                sourceColumnIndex: { type: 'integer', minimum: 0 },
                originalValue: { type: 'string', minLength: 1, maxLength: 160 },
                newValue: { type: 'string', minLength: 1, maxLength: 160 },
                reason: { type: 'string', minLength: 1, maxLength: 240 },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_quick_plot_source',
      description: '只在快捷出图输入页读取当前上传文件的有限工作表窗口。先读取再判断表头、同义字段、单位和额外列；每次最多 40 行、20 列。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sheetName: { type: 'string', maxLength: 120 },
          rowStart: { type: 'integer', minimum: 1 },
          rowCount: { type: 'integer', minimum: 1, maximum: 40 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_quick_plot_question',
      description: '快捷出图字段、工作表或单位存在歧义时，向用户提出一个固定选项问题。一次只问一个问题，给 2–4 个选项，最多一个推荐项。',
      parameters: {
        type: 'object',
        required: ['questionId', 'prompt', 'reason', 'options'],
        additionalProperties: false,
        properties: {
          questionId: { type: 'string', minLength: 1, maxLength: 80 },
          prompt: { type: 'string', minLength: 1, maxLength: 240 },
          reason: { type: 'string', minLength: 1, maxLength: 240 },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              required: ['optionId', 'label', 'description', 'recommended'],
              additionalProperties: false,
              properties: {
                optionId: { type: 'string', minLength: 1, maxLength: 80 },
                label: { type: 'string', minLength: 1, maxLength: 80 },
                description: { type: 'string', maxLength: 160 },
                recommended: { type: 'boolean' },
                confirmations: {
                  type: 'array',
                  maxItems: 4,
                  items: {
                    type: 'object',
                    required: ['sheetName', 'headerRow', 'sourceColumnIndex', 'targetField', 'sourceUnit'],
                    additionalProperties: false,
                    properties: {
                      sheetName: { type: 'string', minLength: 1, maxLength: 120 },
                      headerRow: { type: 'integer', minimum: 1 },
                      sourceColumnIndex: { type: 'integer', minimum: 0 },
                      targetField: { type: 'string', enum: ['depthM', 'qc', 'fs', 'u2'] },
                      sourceUnit: { type: 'string', enum: ['m', 'cm', 'mm', 'kPa', 'MPa'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_quick_plot_import',
      description: '为快捷出图提出待确认的字段整理草稿。深度和 qc 必须唯一；fs、u2 可选；列名可以是中文同义词。只映射和换算单位，不得修改、补造、插值或平滑测量值。',
      parameters: {
        type: 'object',
        required: ['sourceFingerprint', 'sheetName', 'headerRow', 'summary', 'columns', 'ignoredColumns'],
        additionalProperties: false,
        properties: {
          sourceFingerprint: { type: 'string', minLength: 32, maxLength: 96 },
          sheetName: { type: 'string', minLength: 1, maxLength: 120 },
          headerRow: { type: 'integer', minimum: 1 },
          summary: { type: 'string', minLength: 1, maxLength: 320 },
          columns: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              required: ['sourceColumnIndex', 'targetField', 'sourceUnit', 'reason'],
              additionalProperties: false,
              properties: {
                sourceColumnIndex: { type: 'integer', minimum: 0 },
                targetField: { type: 'string', enum: ['depthM', 'qc', 'fs', 'u2'] },
                sourceUnit: { type: 'string', enum: ['m', 'cm', 'mm', 'kPa', 'MPa'] },
                headerLabel: { type: 'string', maxLength: 80 },
                reason: { type: 'string', minLength: 1, maxLength: 240 },
              },
            },
          },
          ignoredColumns: {
            type: 'array',
            maxItems: 20,
            items: {
              type: 'object',
              required: ['sourceColumnIndex', 'headerLabel', 'reason'],
              additionalProperties: false,
              properties: {
                sourceColumnIndex: { type: 'integer', minimum: 0 },
                headerLabel: { type: 'string', maxLength: 80 },
                reason: { type: 'string', minLength: 1, maxLength: 240 },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_quick_plot_import_decision',
      description: '提交快捷出图当前文件的唯一结构化终态：需要用户回答的一个问题，或一份完整待确认判断。不能同时返回问题和判断，不能返回自由文本替代本工具。',
      parameters: {
        type: 'object',
        required: [
          'protocolVersion',
          'requestId',
          'operationId',
          'sourceFingerprint',
          'contextHash',
          'kind',
        ],
        additionalProperties: false,
        properties: {
          protocolVersion: { type: 'string', enum: ['sigs.ai-import/2'] },
          requestId: { type: 'string', minLength: 1, maxLength: 160 },
          operationId: { type: 'string', minLength: 1, maxLength: 160 },
          sourceFingerprint: { type: 'string', minLength: 32, maxLength: 96 },
          contextHash: { type: 'string', minLength: 1, maxLength: 160 },
          kind: { type: 'string', enum: ['question', 'proposal'] },
          question: {
            type: 'object',
            additionalProperties: false,
            required: ['questionId', 'prompt', 'reason', 'options'],
            properties: {
              questionId: { type: 'string', minLength: 1, maxLength: 120 },
              prompt: { type: 'string', minLength: 1, maxLength: 240 },
              reason: { type: 'string', minLength: 1, maxLength: 240 },
              options: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['optionId', 'recommended', 'decisionPatch'],
                  properties: {
                    optionId: { type: 'string', minLength: 1, maxLength: 120 },
                    recommended: { type: 'boolean' },
                    decisionPatch: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['decisionType'],
                      properties: {
                        decisionType: {
                          type: 'string',
                          enum: ['select-sheet', 'select-table', 'map-column', 'omit-optional', 'cannot-determine'],
                        },
                        sheetName: { type: 'string', maxLength: 120 },
                        headerMode: { type: 'string', enum: ['present', 'absent'] },
                        headerRow: { type: ['integer', 'null'] },
                        dataStartRow: { type: 'integer', minimum: 1 },
                        dataEndRow: { type: 'integer', minimum: 1 },
                        sourceColumnIndex: { type: 'integer', minimum: 0 },
                        targetField: { type: 'string', enum: ['depthM', 'qc', 'fs', 'u2'] },
                        sourceUnit: { type: 'string', enum: ['m', 'cm', 'mm', 'kPa', 'MPa'] },
                      },
                    },
                  },
                },
              },
            },
          },
          proposal: {
            type: 'object',
            additionalProperties: false,
            required: [
              'proposalId',
              'layout',
              'sheetName',
              'headerMode',
              'headerRow',
              'dataStartRow',
              'dataEndRow',
              'summary',
              'columns',
              'ignoredColumns',
              'warnings',
            ],
            properties: {
              proposalId: { type: 'string', minLength: 1, maxLength: 120 },
              layout: { type: 'string', enum: ['shared-depth', 'independent-series'] },
              sheetName: { type: 'string', minLength: 1, maxLength: 120 },
              headerMode: { type: 'string', enum: ['present', 'absent'] },
              headerRow: { type: ['integer', 'null'] },
              dataStartRow: { type: 'integer', minimum: 1 },
              dataEndRow: { type: 'integer', minimum: 1 },
              summary: { type: 'string', minLength: 1, maxLength: 320 },
              columns: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['sourceColumnIndex', 'targetField', 'sourceUnit', 'reason', 'evidenceKind'],
                  properties: {
                    sourceColumnIndex: { type: 'integer', minimum: 0 },
                    targetField: { type: 'string', enum: ['depthM', 'qc', 'fs', 'u2'] },
                    sourceUnit: { type: 'string', enum: ['m', 'cm', 'mm', 'kPa', 'MPa'] },
                    depthSourceColumnIndex: { type: 'integer', minimum: 0 },
                    depthSourceUnit: { type: 'string', enum: ['m', 'cm', 'mm'] },
                    tipResistanceKind: { type: 'string', enum: ['qc', 'qt'] },
                    headerLabel: { type: 'string', maxLength: 80 },
                    reason: { type: 'string', minLength: 1, maxLength: 240 },
                    evidenceKind: {
                      type: 'string',
                      enum: ['source-explicit', 'model-inferred', 'user-corrected'],
                    },
                  },
                },
              },
              ignoredColumns: {
                type: 'array',
                maxItems: 40,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['sourceColumnIndex', 'headerLabel', 'reason'],
                  properties: {
                    sourceColumnIndex: { type: 'integer', minimum: 0 },
                    headerLabel: { type: 'string', maxLength: 80 },
                    reason: { type: 'string', minLength: 1, maxLength: 240 },
                  },
                },
              },
              warnings: {
                type: 'array',
                maxItems: 12,
                items: { type: 'string', minLength: 1, maxLength: 240 },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_quick_plot_pages',
      description: '列出当前冻结图册的全部页面、页码、标题、图表类型和方法标识。仅用于导航和选择需要继续读取的页面。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_quick_plot_page',
      description: '读取当前冻结图册的当前页或指定页，包括标题、图表类型、方法、数据范围，以及与图中同源的分层、统计或不可计算原因。只读，不生成或修改结果。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pageNumber: { type: 'integer', minimum: 1, maximum: 60, description: '可选；不填时读取用户当前正在看的页面。' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_quick_plot_chart',
      description: '读取指定图册页的一项图表及其同源工程证据，包括名称、方法、深度范围、分层或统计；不读取图片像素，也不重新计算。',
      parameters: {
        type: 'object',
        required: ['chartType'],
        additionalProperties: false,
        properties: {
          pageNumber: { type: 'integer', minimum: 1, maximum: 60 },
          chartType: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_quick_plot_method',
      description: '读取当前图册中一个方法标识出现在哪些页面、配套图表及各页同源工程证据。只解释已生成图册。',
      parameters: {
        type: 'object',
        required: ['methodId'],
        additionalProperties: false,
        properties: {
          methodId: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_quick_plot_depth_window',
      description: '读取当前冻结图册来源数据中一个有限深度窗口的 qc、fs、u2。最大跨度 20 m、最多返回 120 个源测点；空值保留，不插值，不修改。',
      parameters: {
        type: 'object',
        required: ['depthFromM', 'depthToM', 'fields'],
        additionalProperties: false,
        properties: {
          depthFromM: { type: 'number', minimum: 0 },
          depthToM: { type: 'number', exclusiveMinimum: 0 },
          fields: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            uniqueItems: true,
            items: { type: 'string', enum: ['qc', 'fs', 'u2'] },
          },
        },
      },
    },
  },
]);

export const ASSISTANT_TOOL_NAMES = new Set(ASSISTANT_TOOLS.map((tool) => tool.function.name));

const IMPORT_TOOL_NAMES = new Set(['read_import_source', 'ask_import_question', 'propose_import_cleanup']);
const QUICK_INPUT_TOOL_NAMES = new Set(['read_quick_plot_source', 'submit_quick_plot_import_decision']);
const QUICK_REPORT_TOOL_NAMES = new Set([
  'list_quick_plot_pages',
  'read_quick_plot_page',
  'read_quick_plot_chart',
  'read_quick_plot_method',
  'read_quick_plot_depth_window',
]);
const ENGINEERING_TOOL_NAMES = new Set(['read_workflow_summary', 'read_depth_window', 'propose_set_layer_soil_group', 'propose_move_boundary']);

export function assistantToolsForContext(context) {
  const route = context?.scope?.route;
  const profile = context?.assistantProfile;
  const allowed = profile === 'quick-import-governed' || route === 'quick-input'
    ? QUICK_INPUT_TOOL_NAMES
    : profile === 'report-reader' || route === 'quick-report'
      ? QUICK_REPORT_TOOL_NAMES
      : route === 'import'
    ? IMPORT_TOOL_NAMES
      : ENGINEERING_TOOL_NAMES;
  return ASSISTANT_TOOLS.filter((tool) => allowed.has(tool.function.name));
}
