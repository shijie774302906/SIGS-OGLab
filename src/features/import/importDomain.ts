import type { ImportDraft, ImportDraftProblem, ImportDraftStatus } from '../workflow/types';

export function hasImportDraftIssue(draft: ImportDraft) {
  return draft.problems.some((problem) => problem.severity === 'issue');
}

export function hasPointDecisionProblem(draft: ImportDraft) {
  return draft.problems.some(
    (problem) => problem.severity === 'issue' && ['DI-E10', 'DI-E11'].includes(problem.eventId),
  );
}

export function isImportDraftCheckable(draft: ImportDraft) {
  return draft.status === 'ready' && draft.rows.length > 0 && !hasImportDraftIssue(draft);
}

export function getImportDraftStatusFromProblems(
  problems: ImportDraftProblem[],
  rows: ImportDraft['rows'],
): ImportDraftStatus {
  if (
    problems.some(
      (problem) => problem.severity === 'issue' && ['DI-E10', 'DI-E11'].includes(problem.eventId),
    )
  ) {
    return 'needs-decision';
  }
  if (problems.some((problem) => problem.severity === 'issue') || !rows.length) {
    return 'error';
  }
  return 'ready';
}
