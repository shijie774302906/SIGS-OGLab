import {
  restoreCsvImportPipeline,
  type CsvImportPipelineV2,
  type PipelineContext,
} from './importPipeline';
import type {
  ImportBatchDraftV2,
  ImportDataBlockV2,
  ProjectWorkspaceV2,
} from '../workspace/workspaceV2';

const editableImportPipelineCache = new WeakMap<
  ImportBatchDraftV2,
  {
    rawBlock: Extract<ImportDataBlockV2, { kind: 'raw' }>;
    contextIdentity: string;
    structuralContextIdentity: string;
    defaultWaterDepthM: number;
    defaultFinalDepthM: number;
    pipeline: CsvImportPipelineV2 | null;
  }
>();

export function importPipelineContextIdentity(context: PipelineContext) {
  return JSON.stringify({
    currentPointName: context.currentPointName,
    defaultWaterDepthM: context.defaultWaterDepthM,
    defaultFinalDepthM: context.defaultFinalDepthM,
    allowAnyPoint: Boolean(context.allowAnyPoint),
    existingPoints: (context.existingPoints ?? []).map((point) => ({
      pointId: point.pointId,
      pointName: point.pointName,
      aliases: point.aliases ?? [],
      activeImportDraftId: point.activeImportDraftId ?? null,
    })),
  });
}

function importPipelineStructuralContextIdentity(context: PipelineContext) {
  return JSON.stringify({
    currentPointName: context.currentPointName,
    allowAnyPoint: Boolean(context.allowAnyPoint),
    existingPoints: (context.existingPoints ?? []).map((point) => ({
      pointId: point.pointId,
      pointName: point.pointName,
      aliases: point.aliases ?? [],
      activeImportDraftId: point.activeImportDraftId ?? null,
    })),
  });
}

export function createEditableImportPipeline(
  project: ProjectWorkspaceV2,
  dataBlocks: ImportDataBlockV2[],
  context: PipelineContext,
) {
  const batch = project.importBatches.find((record) => record.batchId === project.activeImportBatchId) ?? null;
  if (!batch || batch.kind !== 'draft' || !batch.rawDataBlockId) return null;
  const rawBlock = dataBlocks.find((block) => block.dataBlockId === batch.rawDataBlockId && block.kind === 'raw');
  if (!rawBlock || rawBlock.kind !== 'raw') return null;
  const contextIdentity = importPipelineContextIdentity(context);
  const structuralContextIdentity = importPipelineStructuralContextIdentity(context);
  const cached = editableImportPipelineCache.get(batch);
  if (cached && cached.rawBlock === rawBlock && cached.contextIdentity === contextIdentity) {
    return cached.pipeline
      ? { ...cached.pipeline, baseWorkspaceRevision: project.workspaceRevision }
      : null;
  }
  if (
    cached
    && cached.rawBlock === rawBlock
    && cached.pipeline
    && cached.structuralContextIdentity === structuralContextIdentity
    && !hasConfirmedWaterDepthMapping(cached.pipeline)
  ) {
    const pipeline = recontextualizeDefaultDepths(
      cached.pipeline,
      context,
      project.workspaceRevision,
      cached.defaultWaterDepthM,
    );
    editableImportPipelineCache.set(batch, {
      rawBlock,
      contextIdentity,
      structuralContextIdentity,
      defaultWaterDepthM: context.defaultWaterDepthM,
      defaultFinalDepthM: context.defaultFinalDepthM,
      pipeline,
    });
    return pipeline;
  }
  const pipeline = restoreCsvImportPipeline({
    batch,
    rawBlock,
    context,
    baseWorkspaceRevision: project.workspaceRevision,
  });
  editableImportPipelineCache.set(batch, {
    rawBlock,
    contextIdentity,
    structuralContextIdentity,
    defaultWaterDepthM: context.defaultWaterDepthM,
    defaultFinalDepthM: context.defaultFinalDepthM,
    pipeline,
  });
  return pipeline;
}

function hasConfirmedWaterDepthMapping(pipeline: CsvImportPipelineV2) {
  return pipeline.mappings.some((mapping) =>
    mapping.targetField === 'waterDepth' && mapping.state === 'confirmed',
  );
}

function recontextualizeDefaultDepths(
  pipeline: CsvImportPipelineV2,
  context: PipelineContext,
  baseWorkspaceRevision: number,
  previousWaterDepthM: number,
): CsvImportPipelineV2 {
  if (context.defaultWaterDepthM === previousWaterDepthM) {
    return { ...pipeline, baseWorkspaceRevision };
  }
  return {
    ...pipeline,
    baseWorkspaceRevision,
    rows: pipeline.rows.map((row) => row.waterDepthM === context.defaultWaterDepthM
      ? row
      : { ...row, waterDepthM: context.defaultWaterDepthM }),
    normalizedRows: pipeline.normalizedRows.map((row) => {
      const waterDepth = row.values.waterDepth;
      if (!waterDepth || waterDepth.origin !== 'defaulted') return row;
      return {
        ...row,
        values: {
          ...row.values,
          waterDepth: {
            ...waterDepth,
            normalizedValue: context.defaultWaterDepthM,
          },
        },
      };
    }),
  };
}
