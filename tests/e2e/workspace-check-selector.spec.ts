import { expect, test } from '@playwright/test';
import {
  emptyArtifactState,
  selectCheckCommitTarget,
  selectCurrentCheckResult,
  type ArtifactDependency,
  type PointWorkspaceV2,
  type ProjectWorkspaceV2,
} from '../../src/features/workspace/workspaceV2';

test('current check requires the active point, draft, batch, run, artifact, and complete revision vector', () => {
  const { point, dependency } = createCheckedPoint();
  expect(selectCurrentCheckResult(point)).toMatchObject({ isCurrent: true, artifactStatus: 'current' });

  const changedRevision = structuredClone(point);
  changedRevision.importDrafts[0].revisions.mapping += 1;
  expect(selectCurrentCheckResult(changedRevision)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });

  const mismatchedArtifact = structuredClone(point);
  if (mismatchedArtifact.checkState.artifact.input) mismatchedArtifact.checkState.artifact.input.draftId = 'another-draft';
  expect(selectCurrentCheckResult(mismatchedArtifact)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });

  const mismatchedConclusion = structuredClone(point);
  mismatchedConclusion.checkState.artifact.status = 'problem';
  expect(selectCurrentCheckResult(mismatchedConclusion)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });

  expect(dependency.revisions).toEqual({ source: 1, mapping: 2, unit: 3, normalization: 4, pointPlan: 5 });
});

test('a context-aware check is current only for the frozen probe and water revisions', () => {
  const { point } = createCheckedPoint();
  point.probeContext = {
    revisionId: 'probe-context-1', revision: 1, activeProfileId: 'probe-profile', activeProfileRevisionId: 'probe-profile-1', confirmedAt: '2026-07-10T09:30:00.000Z', updatedAt: '2026-07-10T09:30:00.000Z',
  };
  point.waterContext = {
    revisionId: 'water-context-1', revision: 1, channelState: 'present', waterDepthM: 20, u2HydrostaticDatum: 'total', testZeroDatum: 'mudline', boreholeBottomDepthM: null, waterUnitWeightKnM3: 10, confirmedAt: '2026-07-10T09:30:00.000Z', updatedAt: '2026-07-10T09:30:00.000Z',
  };
  Object.assign(point.checkState.runs[0], {
    probeContextRevisionId: 'probe-context-1',
    probeProfileRevisionId: 'probe-profile-1',
    waterContextRevisionId: 'water-context-1',
  });
  expect(selectCurrentCheckResult(point)).toMatchObject({ isCurrent: true, artifactStatus: 'current' });

  const changedProbe = structuredClone(point);
  changedProbe.probeContext.revisionId = 'probe-context-2';
  expect(selectCurrentCheckResult(changedProbe)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });

  const changedProfile = structuredClone(point);
  changedProfile.probeContext.activeProfileRevisionId = 'probe-profile-2';
  expect(selectCurrentCheckResult(changedProfile)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });

  const changedWater = structuredClone(point);
  changedWater.waterContext.revisionId = 'water-context-2';
  expect(selectCurrentCheckResult(changedWater)).toMatchObject({ isCurrent: false, artifactStatus: 'stale' });
});

test('check commit target freezes the clicked point and rejects point or draft changes before save', () => {
  const { point, dependency } = createCheckedPoint();
  const project = createProject(point);
  expect(selectCheckCommitTarget(project, dependency)?.pointId).toBe(point.pointId);

  const switchedPoint = structuredClone(project);
  switchedPoint.activePointId = 'point-b';
  expect(selectCheckCommitTarget(switchedPoint, dependency)).toBeNull();

  const switchedDraft = structuredClone(project);
  switchedDraft.points[0].activeImportDraftId = 'draft-b';
  expect(selectCheckCommitTarget(switchedDraft, dependency)).toBeNull();

  const changedRevision = structuredClone(project);
  changedRevision.points[0].importDrafts[0].revisions.unit += 1;
  expect(selectCheckCommitTarget(changedRevision, dependency)).toBeNull();
});

function createCheckedPoint() {
  const dependency: ArtifactDependency = {
    pointId: 'point-a',
    draftId: 'draft-a',
    batchId: 'batch-a',
    revisions: { source: 1, mapping: 2, unit: 3, normalization: 4, pointPlan: 5 },
  };
  const point: PointWorkspaceV2 = {
    pointId: dependency.pointId,
    pointName: 'CPT-A',
    aliases: [],
    waterDepthM: 20,
    finalDepthM: 30,
    importDrafts: [{
      draftId: dependency.draftId,
      batchId: dependency.batchId,
      pointId: dependency.pointId,
      sourcePointName: 'CPT-A',
      sourceRowIds: ['row-1'],
      dataBlockId: 'block-a',
      valueProvenance: {},
      revisions: { ...dependency.revisions },
      problems: [],
      status: 'ready',
    }],
    activeImportDraftId: dependency.draftId,
    checkState: {
      activeRunId: 'run-a',
      runs: [{
        runId: 'run-a',
        input: structuredClone(dependency),
        status: 'completed',
        counts: { issue: 0, notice: 1, passed: 4 },
        conclusion: '无问题',
        issueIds: ['check-water-depth-source'],
        createdAt: '2026-07-10T10:00:00.000Z',
        completedAt: '2026-07-10T10:00:00.000Z',
      }],
      legacyHistory: [],
      artifact: { status: 'current', input: structuredClone(dependency) },
    },
    stratificationState: emptyArtifactState(),
    parameterState: emptyArtifactState(),
    outputState: emptyArtifactState(),
    selection: {
      selectedImportBatchId: dependency.batchId,
      selectedCheckIssueId: 'check-water-depth-source',
      selectedSchemeId: '',
      selectedLayerId: '',
      selectedBoundaryId: '',
      selectedParameterSchemeId: '',
      selectedParameterSlotId: '',
      selectedOutputItemId: '',
      selectedMappingField: 'QcKpa',
      importFocusField: null,
      selectedCheckFilter: 'all',
    },
    createdAt: '2026-07-10T09:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  };
  return { point, dependency };
}

function createProject(point: PointWorkspaceV2): ProjectWorkspaceV2 {
  return {
    projectId: 'project-a',
    projectName: 'Selector Project',
    mode: 'user',
    workspaceRevision: 1,
    points: [point],
    activePointId: point.pointId,
    importBatches: [],
    activeImportBatchId: 'batch-a',
    activeRoute: 'check',
    activeBottomTab: 'issues',
    flowFeedback: '',
    createdAt: '2026-07-10T09:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  };
}
