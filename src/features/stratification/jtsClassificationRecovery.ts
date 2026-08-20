import { calculateJtsCorrectedQtKpa, evaluateGammaSat, type JtsMeasuredRow, type JtsSeriesContext } from '../jts/jtsT242Domain';

export type JtsRecoveryOptionId =
  | 'rerun-check'
  | 'standard-smoothing'
  | 'exclude-invalid-rows'
  | 'open-check'
  | 'open-point-context';

export type JtsRecoveryOption = {
  optionId: JtsRecoveryOptionId;
  kind: 'automatic' | 'navigate';
  label: string;
  description: string;
  impact: string;
  enabled: boolean;
  recommended?: boolean;
  recommendationReason?: string;
  unavailableReason?: string;
};

export type JtsInvalidMeasuredRow = {
  sourceRowId: string;
  depthM: number;
  qtKpa: number | null;
  reason: 'missing-u2' | 'invalid-qt' | 'invalid-unit-weight';
};

export type JtsClassificationRecoveryIssue = {
  code: 'JTS-CHECK-REQUIRED' | 'JTS-PROBE-REQUIRED' | 'JTS-WATER-CONTEXT-REQUIRED' | 'JTS-NUMERIC-DOMAIN' | 'JTS-NO-ROWS' | 'JTS-UNKNOWN';
  title: string;
  summary: string;
  consequence: string;
  evidence: string[];
  invalidRows: JtsInvalidMeasuredRow[];
  totalRowCount: number;
  options: JtsRecoveryOption[];
};

export type JtsRecoveryDiagnosticInput = {
  checkCurrentAndClear: boolean;
  checkCanRerun: boolean;
  checkStale: boolean;
  probeConfirmed: boolean;
  waterContextConfirmed: boolean;
  rows: JtsMeasuredRow[];
  context: JtsSeriesContext | null;
  activeSmoothingDepthWindowM: number | null;
  fallbackProblem?: string;
};

export function inspectJtsNumericDomain(rows: JtsMeasuredRow[], context: JtsSeriesContext) {
  const invalidRows = rows.flatMap((row): JtsInvalidMeasuredRow[] => {
    if (context.route === 'full_cptu' && !Number.isFinite(row.u2Kpa)) {
      return [{ sourceRowId: row.sourceRowId, depthM: row.depthM, qtKpa: null, reason: 'missing-u2' }];
    }
    const qtKpa = calculateJtsCorrectedQtKpa(row, context);
    if (!Number.isFinite(qtKpa) || qtKpa <= 0) {
      return [{ sourceRowId: row.sourceRowId, depthM: row.depthM, qtKpa: Number.isFinite(qtKpa) ? qtKpa : null, reason: 'invalid-qt' }];
    }
    const gamma = evaluateGammaSat({ route: context.route }, qtKpa / 1000);
    return gamma.status === 'value'
      ? []
      : [{ sourceRowId: row.sourceRowId, depthM: row.depthM, qtKpa, reason: 'invalid-unit-weight' }];
  });
  return { invalidRows, totalRowCount: rows.length };
}

export function diagnoseJtsClassificationRecovery(input: JtsRecoveryDiagnosticInput): JtsClassificationRecoveryIssue | null {
  if (!input.checkCurrentAndClear) {
    const canAutoRerun = input.checkCanRerun && input.checkStale;
    return {
      code: 'JTS-CHECK-REQUIRED',
      title: input.checkStale ? '数据检查需要更新' : '数据检查尚未满足分类条件',
      summary: input.checkStale ? '当前检查没有绑定最新的数据治理修订。' : '当前检查仍有问题，或尚未形成“无问题”的当前记录。',
      consequence: 'JTS 分类不会使用旧检查或存在问题的检查结果。',
      evidence: [], invalidRows: [], totalRowCount: input.rows.length,
      options: [
        {
          optionId: 'rerun-check', kind: 'automatic', label: '重新检查并继续分类',
          description: '使用已经确认的映射、单位与治理修订重新检查，通过后继续 JTS 分类。',
          impact: '新增一条检查记录；不修改源数据。', enabled: canAutoRerun, recommended: canAutoRerun,
          recommendationReason: canAutoRerun ? '数据没有变化，只需更新检查依据。' : undefined,
          unavailableReason: canAutoRerun ? undefined : '当前不是单纯的检查过期，需要先查看具体检查问题。',
        },
        navigationOption('open-check', '查看数据检查问题', '打开完整检查证据与逐行处理工具。'),
      ],
    };
  }
  if (!input.probeConfirmed) return contextIssue('JTS-PROBE-REQUIRED', '探头配置尚未确认', 'JTS 修正需要已确认的锥头面积与有效面积比。', '前往点位配置确认探头');
  if (!input.waterContextConfirmed) return contextIssue('JTS-WATER-CONTEXT-REQUIRED', '水与压力上下文尚未确认', '完整 CPTU 需要明确 u2 通道、水深与压力基准；这些工程条件不能自动猜测。', '前往点位配置确认水与压力');
  if (!input.rows.length) {
    return {
      code: 'JTS-NO-ROWS', title: '没有可用于分类的测量行', summary: '当前排除修订没有留下可用的 Depth、qc 与 fs 行。', consequence: '无法建立 JTS 深度序列。',
      evidence: [], invalidRows: [], totalRowCount: 0,
      options: [navigationOption('open-check', '查看数据治理', '检查排除修订并恢复需要的测量行。')],
    };
  }
  if (input.context) {
    const inspection = inspectJtsNumericDomain(input.rows, input.context);
    if (inspection.invalidRows.length) {
      const ratio = inspection.invalidRows.length / Math.max(inspection.totalRowCount, 1);
      const exclusionEligible = inspection.invalidRows.length <= 50 && ratio <= 0.01 && inspection.invalidRows.length < inspection.totalRowCount;
      const sample = inspection.invalidRows.slice(0, 4).map((row) => `${row.depthM.toFixed(2)} m · ${invalidReasonLabel(row.reason)}${row.qtKpa == null ? '' : ` · qt ${row.qtKpa.toFixed(2)} kPa`}`);
      return {
        code: 'JTS-NUMERIC-DOMAIN',
        title: '部分测量行不能进入 JTS 数值域',
        summary: `${inspection.invalidRows.length} / ${inspection.totalRowCount} 行${numericProblemSummary(inspection.invalidRows)}。`,
        consequence: '为避免整条剖面被错误推导，本次分类没有写入任何结果。',
        evidence: sample,
        invalidRows: inspection.invalidRows,
        totalRowCount: inspection.totalRowCount,
        options: [
          {
            optionId: 'standard-smoothing', kind: 'automatic', label: '标准平滑并继续分类',
            description: `对全部 ${inspection.totalRowCount} 行使用 0.50 m 深度窗口中位数，通过复检后继续分类。`,
            impact: `会重新计算整条剖面的 qc、fs、u2 派生输入，可能弱化薄层响应；原始值保持不变。`,
            enabled: true,
          },
          {
            optionId: 'exclude-invalid-rows', kind: 'automatic', label: `忽略 ${inspection.invalidRows.length} 行并继续分类`,
            description: '仅从本次分类中忽略上面列出的明确无效行，保留原始行和忽略原因。',
            impact: `新增一条可追溯的单行忽略修订，影响 ${(ratio * 100).toFixed(2)}%；其余 ${inspection.totalRowCount - inspection.invalidRows.length} 行不做平滑。`, enabled: exclusionEligible,
            recommended: exclusionEligible,
            recommendationReason: exclusionEligible ? `仅影响 ${(ratio * 100).toFixed(2)}% 的测量行，避免改变整条剖面。` : undefined,
            unavailableReason: exclusionEligible ? undefined : '无效行超过 50 行或占比超过 1%，不允许在分层页批量排除。',
          },
          navigationOption('open-check', '打开数据检查查看全部证据', '查看原始/平滑曲线、源行和完整治理历史。'),
        ],
      };
    }
  }
  if (input.fallbackProblem) {
    return {
      code: 'JTS-UNKNOWN', title: 'JTS 分类未执行', summary: input.fallbackProblem, consequence: '当前状态未发生改变。',
      evidence: [], invalidRows: [], totalRowCount: input.rows.length,
      options: [navigationOption('open-check', '返回数据检查核对', '查看当前检查、来源和治理修订。')],
    };
  }
  return null;
}

function contextIssue(code: 'JTS-PROBE-REQUIRED' | 'JTS-WATER-CONTEXT-REQUIRED', title: string, summary: string, label: string): JtsClassificationRecoveryIssue {
  return {
    code, title, summary, consequence: '确认工程上下文后可直接返回并重新运行 JTS 分类。', evidence: [], invalidRows: [], totalRowCount: 0,
    options: [navigationOption('open-point-context', label, '打开当前点位的探头、水与压力配置。')],
  };
}

function navigationOption(optionId: 'open-check' | 'open-point-context', label: string, description: string): JtsRecoveryOption {
  return { optionId, kind: 'navigate', label, description, impact: '仅导航，不修改当前数据或结果。', enabled: true };
}

function invalidReasonLabel(reason: JtsInvalidMeasuredRow['reason']) {
  if (reason === 'missing-u2') return 'u2 缺失';
  if (reason === 'invalid-qt') return '修正锥尖阻力无效';
  return '饱和重度公式域无效';
}

function numericProblemSummary(rows: JtsInvalidMeasuredRow[]) {
  const reasons = new Set(rows.map((row) => row.reason));
  if (reasons.size > 1) return '存在多种数值问题';
  const reason = rows[0]?.reason;
  if (reason === 'missing-u2') return '的 u2 缺失';
  if (reason === 'invalid-qt') return '的修正锥尖阻力无效';
  return '的饱和重度公式域无效';
}
