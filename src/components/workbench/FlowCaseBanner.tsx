import type { RouteId, SyntheticFlowCase } from '../../workflowData';

const flowStepMeta: Record<RouteId, { step: string; label: string; handoff: string }> = {
  project: {
    step: '步骤 1/3',
    label: '确认项目与点位',
    handoff: '当前交接物：随机点位 / 待核对导入',
  },
  import: {
    step: '步骤 2/3',
    label: '核对导入数据',
    handoff: '当前交接物：导入批次 / 可检查',
  },
  check: {
    step: '步骤 3/3',
    label: '运行数据检查',
    handoff: '当前交接物：检查结论 / 可进入地层分层',
  },
  stratification: {
    step: 'Flow 1 终点',
    label: '进入地层分层',
    handoff: '已完成数据准备到数据检查闭环',
  },
  parameters: {
    step: '后续流程',
    label: '参数解译',
    handoff: '等待后续 Flow 定义',
  },
  output: {
    step: '后续流程',
    label: '成果输出',
    handoff: '等待后续 Flow 定义',
  },
};

export function FlowCaseBanner({ flowCase, route }: { flowCase: SyntheticFlowCase; route: RouteId }) {
  const step = flowStepMeta[route];
  return (
    <section className="flow-case-banner" data-testid="flow-case-banner">
      <div className="flow-case-main">
        <span className="flow-badge">Flow 1</span>
        <strong>随机 CPTU 数据准备 - 数据检查</strong>
        <span>{flowCase.caseId}</span>
      </div>
      <div className="flow-case-detail">
        <span
          data-testid={`flow-step-${
            route === 'project'
              ? 'select-point'
              : route === 'import'
                ? 'review-import'
                : route === 'check'
                  ? 'run-check'
                  : 'continue-stratification'
          }`}
        >
          {step.step} {step.label}
        </span>
        <span>seed {flowCase.seed}</span>
        <span data-testid="flow-handoff-summary">{step.handoff}</span>
      </div>
    </section>
  );
}

