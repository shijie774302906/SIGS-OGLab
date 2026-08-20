import type { JtsParameterMethodIdV5 } from './parameterTypes';

export type ParameterRecoveryIntent = {
  methodId: JtsParameterMethodIdV5;
  stage: 'check' | 'stratification';
  sourceCheckRunId: string | null;
  sourceStratificationRevisionId: string | null;
};

export type ParameterRecoverySnapshot = {
  checkRunId: string | null;
  checkAllowed: boolean;
  stratificationRevisionId: string | null;
  activeClassificationRunId: string | null;
  stratificationClassificationRunId: string | null;
};

export function evaluateParameterRecovery(intent: ParameterRecoveryIntent, snapshot: ParameterRecoverySnapshot) {
  if (intent.stage === 'check') {
    if (!snapshot.checkRunId || snapshot.checkRunId === intent.sourceCheckRunId || !snapshot.checkAllowed) return { state: 'waiting-check' as const };
    return { state: 'advance-to-stratification' as const, intent: { ...intent, stage: 'stratification' as const } };
  }
  const newRevision = Boolean(snapshot.stratificationRevisionId && snapshot.stratificationRevisionId !== intent.sourceStratificationRevisionId);
  const authorityMatches = Boolean(snapshot.activeClassificationRunId && snapshot.stratificationClassificationRunId === snapshot.activeClassificationRunId);
  return newRevision && authorityMatches ? { state: 'return-to-parameters' as const, methodId: intent.methodId } : { state: 'waiting-stratification' as const };
}
