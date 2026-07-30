import { expect, test } from '@playwright/test';
import {
  DEFAULT_PARAMETER_EVIDENCE_DRAFT,
  commitConfiguredParameterScheme,
  confirmParameterMethodEvidence,
  createConfiguredParameterScheme,
  getCurrentParameterMethodEvidence,
  selectActiveParameterSchemeV2,
  selectCurrentParameterSchemeRevisionV2,
} from '../../src/features/parameters/parameterWorkbenchDomain';
import { emptyParameterWorkspace } from '../../src/features/parameters/parameterDomain';
import type { ParameterSourceLineageV2 } from '../../src/features/parameters/parameterTypes';
import type { StratificationSchemeRevisionV2 } from '../../src/features/workspace/workspaceV2';

const source: ParameterSourceLineageV2 = {
  pointId: 'point-g2-domain',
  siteId: null,
  draftId: 'draft-g2-domain',
  batchId: 'batch-g2-domain',
  revisions: { source: 1, mapping: 1, unit: 1, normalization: 1, pointPlan: 1 },
  checkRunId: 'check-g2-domain',
  stratificationSchemeId: 'strat-g2-domain',
  stratificationRevisionId: 'strat-g2-domain:rev:1',
  stratificationVersion: 1,
};

test('G2 creates exact phi and suc slots from classified layers and commits one current revision', () => {
  const stratificationRevision = createStratificationRevision();
  const created = createConfiguredParameterScheme({
    workspace: emptyParameterWorkspace(),
    source,
    stratificationRevision,
    name: 'G2 领域方案',
    now: '2026-07-11T01:00:00.000Z',
  });
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(created.scheme.slots).toHaveLength(2);
  expect(created.scheme.slots.map((slot) => slot.parameterKey)).toEqual(['PhiDeg', 'SuKpa']);
  expect(created.scheme.slots[0].targetScope.layerIds).toEqual(['layer-sand']);
  expect(created.scheme.slots[1].targetScope.layerIds).toEqual(['layer-clay']);
  expect(created.scheme.slots[1].settings).toMatchObject({
    kind: 'suc_qnet_nkt_v1',
    nktByLayer: [{ layerId: 'layer-clay', layerRevisionRef: 'strat-g2-domain:rev:1:layer-clay', setting: { value: 12, origin: 'literature_starting_assumption' } }],
  });

  const committed = commitConfiguredParameterScheme(created.workspace, source, '2026-07-11T01:01:00.000Z');
  expect(committed.ok).toBe(true);
  if (!committed.ok) return;
  expect(selectActiveParameterSchemeV2(committed.workspace)).toMatchObject({ status: 'current', version: 1 });
  expect(selectCurrentParameterSchemeRevisionV2(committed.workspace)).toMatchObject({ version: 1 });
});

test('G2 refuses an unclassified stratification and unavailable site-calibrated Nkt', () => {
  const unclassified = createStratificationRevision();
  unclassified.snapshot.layers.forEach((layer) => { layer.engineeringSoilGroup = 'unclassified'; });
  const missingTargets = createConfiguredParameterScheme({ workspace: emptyParameterWorkspace(), source, stratificationRevision: unclassified });
  expect(missingTargets).toMatchObject({ ok: false, recovery: 'stratification' });

  const siteCalibration = createConfiguredParameterScheme({
    workspace: emptyParameterWorkspace(),
    source,
    stratificationRevision: createStratificationRevision(),
    nktMode: 'site-calibrated',
  });
  expect(siteCalibration).toMatchObject({ ok: false, recovery: 'select-literature-or-register-tests' });
  if (!siteCalibration.ok) expect(siteCalibration.problem).toContain('CAUC/CIUC');
});

test('G2 evidence confirmation appends revisions and reconstructs only the current exact refs', () => {
  const stratificationRevision = createStratificationRevision();
  const created = createConfiguredParameterScheme({ workspace: emptyParameterWorkspace(), source, stratificationRevision });
  if (!created.ok) throw new Error(created.problem);
  const committed = commitConfiguredParameterScheme(created.workspace, source);
  if (!committed.ok) throw new Error(committed.problem);
  const phi = committed.scheme.slots.find((slot) => slot.parameterKey === 'PhiDeg');
  if (!phi) throw new Error('Phi slot is required.');

  const first = confirmParameterMethodEvidence({
    workspace: committed.workspace,
    slot: phi,
    stratificationRevision,
    draft: DEFAULT_PARAMETER_EVIDENCE_DRAFT,
    now: '2026-07-11T01:02:00.000Z',
  });
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.workspace.methodEvidenceRevisions).toHaveLength(3);
  expect(getCurrentParameterMethodEvidence({ workspace: first.workspace, slot: phi, stratificationRevision })).toMatchObject({ ok: true, evidence: [{ layerId: 'layer-sand' }] });

  const second = confirmParameterMethodEvidence({
    workspace: first.workspace,
    slot: phi,
    stratificationRevision,
    draft: { ...DEFAULT_PARAMETER_EVIDENCE_DRAFT, rateStatus: 'known_nonstandard', nominalRateMmPerSec: 15 },
    now: '2026-07-11T01:03:00.000Z',
  });
  expect(second.ok).toBe(true);
  if (!second.ok) return;
  expect(second.workspace.methodEvidenceRevisions).toHaveLength(6);
  expect(second.workspace.methodEvidenceRevisions?.filter((revision) => revision.kind === 'penetration_rate').map((revision) => revision.version)).toEqual([1, 2]);
  const currentRateRef = second.workspace.currentMethodEvidenceRefs?.[`${phi.slotId}:layer-sand:rate`];
  expect(currentRateRef).toContain(':rev:2');
});

test('G2 records drainage conflict authority instead of treating the option as a normal confirmation', () => {
  const stratificationRevision = createStratificationRevision();
  const created = createConfiguredParameterScheme({ workspace: emptyParameterWorkspace(), source, stratificationRevision });
  if (!created.ok) throw new Error(created.problem);
  const committed = commitConfiguredParameterScheme(created.workspace, source);
  if (!committed.ok) throw new Error(committed.problem);
  const phi = committed.scheme.slots.find((slot) => slot.parameterKey === 'PhiDeg');
  if (!phi) throw new Error('Phi slot is required.');
  const conflict = confirmParameterMethodEvidence({
    workspace: committed.workspace,
    slot: phi,
    stratificationRevision,
    draft: { ...DEFAULT_PARAMETER_EVIDENCE_DRAFT, drainageStatus: 'conflict' },
    now: '2026-07-11T01:04:00.000Z',
  });
  expect(conflict.ok).toBe(true);
  if (!conflict.ok) return;
  expect(conflict.workspace.methodEvidenceRevisions).toHaveLength(4);
  const drainage = conflict.workspace.methodEvidenceRevisions?.find((revision) => revision.kind === 'drainage_applicability');
  const context = conflict.workspace.methodEvidenceRevisions?.find((revision) => revision.kind === 'conflict_context');
  expect(drainage).toMatchObject({ kind: 'drainage_applicability', payload: { status: 'conflict', conflictRevisionId: expect.any(String) } });
  expect(context).toMatchObject({ kind: 'conflict_context', payload: { currentConflictRevisionId: drainage?.kind === 'drainage_applicability' ? drainage.payload.conflictRevisionId : '' } });
  expect(getCurrentParameterMethodEvidence({ workspace: conflict.workspace, slot: phi, stratificationRevision })).toMatchObject({
    ok: true,
    evidence: [{ evidenceRevisionRefs: { conflictContext: context?.revisionId } }],
  });
  const resolved = confirmParameterMethodEvidence({
    workspace: conflict.workspace,
    slot: phi,
    stratificationRevision,
    draft: { ...DEFAULT_PARAMETER_EVIDENCE_DRAFT, drainageStatus: 'confirmed_drained' },
    now: '2026-07-11T01:05:00.000Z',
  });
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) return;
  const latestDrainage = resolved.workspace.methodEvidenceRevisions?.filter((revision) => revision.kind === 'drainage_applicability').at(-1);
  expect(latestDrainage).toMatchObject({
    kind: 'drainage_applicability',
    payload: {
      status: 'resolved_conflict',
      resolvedAs: 'confirmed_drained',
      supersedesConflictRevisionId: drainage?.kind === 'drainage_applicability' ? drainage.payload.conflictRevisionId : '',
      resolutionRevisionId: expect.any(String),
    },
  });
  expect(getCurrentParameterMethodEvidence({ workspace: resolved.workspace, slot: phi, stratificationRevision })).toMatchObject({
    ok: true,
    evidence: [{ evidenceRevisionRefs: { conflictContext: context?.revisionId } }],
  });
});

function createStratificationRevision(): StratificationSchemeRevisionV2 {
  return {
    revisionId: source.stratificationRevisionId,
    schemeId: source.stratificationSchemeId,
    version: 1,
    committedAt: '2026-07-11T00:59:00.000Z',
    snapshot: {
      schemeId: source.stratificationSchemeId,
      name: 'G2 分层',
      status: 'current',
      version: 1,
      input: {
        pointId: source.pointId,
        draftId: source.draftId,
        batchId: source.batchId,
        revisions: { ...source.revisions },
        checkRunId: source.checkRunId,
      },
      depthFromM: 0,
      depthToM: 10,
      layers: [
        { layerId: 'layer-sand', name: '砂层', description: '', engineeringSoilGroup: 'sand', reviewRequired: false, depthFromM: 0, depthToM: 5 },
        { layerId: 'layer-clay', name: '黏土层', description: '', engineeringSoilGroup: 'clay', reviewRequired: false, depthFromM: 5, depthToM: 10 },
      ],
      boundaries: [{ boundaryId: 'boundary-5', depthM: 5, upperLayerId: 'layer-sand', lowerLayerId: 'layer-clay', reviewRequired: false, note: '' }],
      createdAt: '2026-07-11T00:58:00.000Z',
      updatedAt: '2026-07-11T00:59:00.000Z',
    },
  };
}
