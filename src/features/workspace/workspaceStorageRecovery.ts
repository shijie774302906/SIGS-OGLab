import type { WorkspaceDatabaseWriteResult } from './workspaceDatabase';

export type WorkspaceStorageFailureCode = 'quota' | 'unavailable' | 'conflict' | 'invalid-data' | 'temporary';

export type BrowserStorageStatus = {
  usageBytes: number | null;
  quotaBytes: number | null;
  usageRatio: number | null;
  persisted: boolean | null;
};

export type WorkspaceStorageFailureDiagnosis = {
  code: WorkspaceStorageFailureCode;
  title: string;
  summary: string;
  actionLabel: string;
  canRetry: boolean;
  steps: string[];
  technicalDetail: string;
  storage: BrowserStorageStatus | null;
};

type FailedWorkspaceWrite = Extract<WorkspaceDatabaseWriteResult, { ok: false }>;

export function diagnoseWorkspaceStorageFailure(
  failure: Pick<FailedWorkspaceWrite, 'reason' | 'detail'>,
  storage: BrowserStorageStatus | null = null,
): WorkspaceStorageFailureDiagnosis {
  const detail = failure.detail || 'No browser storage detail was returned.';
  const quotaByError = /quota|QuotaExceeded|disk full|storage full|空间不足|配额/i.test(detail);
  const quotaByEstimate = storage?.usageRatio !== null && storage?.usageRatio !== undefined && storage.usageRatio >= 0.95;
  if (failure.reason === 'write-failed' && (quotaByError || quotaByEstimate)) {
    return {
      code: 'quota',
      title: '浏览器存储空间不足',
      summary: '当前更改仍保留在本页，但尚未写入本机。释放浏览器空间后再重试。',
      actionLabel: '重试保存',
      canRetry: true,
      steps: ['不要刷新或关闭当前页面。', '释放设备磁盘空间，或在本应用删除不需要的项目；未备份前不要清除此站点数据。', '返回本页后点击“重试保存”。'],
      technicalDetail: detail,
      storage,
    };
  }
  if (failure.reason === 'unavailable' || failure.reason === 'open-failed') {
    return {
      code: 'unavailable',
      title: '当前浏览器不允许本机保存',
      summary: '当前更改只保留在本页。隐私窗口、浏览器策略或站点权限可能限制了本机数据库。',
      actionLabel: '重试保存',
      canRetry: true,
      steps: ['不要刷新或关闭当前页面。', '确认当前不是隐私/无痕窗口，并允许该站点使用本机存储。', '权限恢复后点击“重试保存”；仍失败时请在普通浏览器窗口重新打开系统。'],
      technicalDetail: detail,
      storage,
    };
  }
  if (failure.reason === 'conflict') {
    return {
      code: 'conflict',
      title: '其他标签页已有更新',
      summary: '另一个标签页已更新项目，当前标签已停止自动保存，避免覆盖较新的内容。',
      actionLabel: '查看解决方法',
      canRetry: false,
      steps: ['保留当前页面，先确认另一个标签页中的项目是否已经保存。', '关闭重复标签页后刷新当前页，载入最新本机版本。', '刷新会放弃当前标签中尚未保存的修改，请先记录必要判断。'],
      technicalDetail: detail,
      storage,
    };
  }
  if (failure.reason === 'invalid-bundle') {
    const explanation = explainInvalidBundle(detail);
    return {
      code: 'invalid-data',
      title: explanation.title,
      summary: explanation.summary,
      actionLabel: '查看解决方法',
      canRetry: false,
      steps: explanation.steps,
      technicalDetail: detail,
      storage,
    };
  }
  return {
    code: 'temporary',
    title: '本机数据库暂时无法写入',
    summary: '当前更改仍保留在本页，系统已经自动重试过一次。',
    actionLabel: '重试保存',
    canRetry: true,
    steps: ['不要刷新或关闭当前页面。', '关闭其他占用较多资源的标签页，等待片刻。', '点击“重试保存”；如果重复失败，请检查浏览器存储空间和站点权限。'],
    technicalDetail: detail,
    storage,
  };
}

function explainInvalidBundle(detail: string) {
  if (/invalid deleted-point record/i.test(detail)) {
    return {
      title: '点位记录没有对上，尚未保存',
      summary: '这不是 qc、fs、u2 的数值问题。新点位与一条已删除记录使用了同一个系统内部编号，系统为避免覆盖旧记录而停止保存。',
      steps: [
        '不要刷新或关闭当前页面，原文件和 AI 整理结果仍在。',
        '再次确认导入；系统会为重新导入的同名点位建立新的系统内部编号。',
        '如果仍然出现此提示，请保留当前页面并联系维护人员。',
      ],
    };
  }
  if (/missing data block|does not reference|data block/i.test(detail)) {
    return {
      title: '导入数据与点位没有对上，尚未保存',
      summary: '这不是测量数值超限。点位或导入草稿引用的数据表没有随本次操作一起生成，系统没有写入半份结果。',
      steps: ['不要刷新或关闭当前页面。', '返回当前导入草稿，重新确认一次导入。', '仍失败时改用手动字段映射，并保留技术详情。'],
    };
  }
  if (/duplicate .*id|shared by/i.test(detail)) {
    return {
      title: '项目中有重复记录，尚未保存',
      summary: '两条项目记录使用了同一个系统内部编号。系统为避免互相覆盖，没有写入本次更改。',
      steps: ['不要刷新或关闭当前页面。', '取消最近一次新建、复制或导入操作后重新执行。', '仍失败时保留技术详情并联系维护人员。'],
    };
  }
  return {
    title: '项目内部记录没有对上，尚未保存',
    summary: '这不是 qc、fs、u2 的工程数值检查。系统发现点位、导入草稿或数据表之间有一项引用不完整，因此没有写入半份结果。',
    steps: ['不要刷新或关闭当前页面。', '返回刚才的操作并重新确认一次。', '仍失败时保留技术详情并联系维护人员。'],
  };
}

export async function inspectBrowserStorage(storageManager?: StorageManager | null): Promise<BrowserStorageStatus | null> {
  const manager = storageManager ?? (typeof navigator === 'undefined' ? null : navigator.storage);
  if (!manager?.estimate) return null;
  try {
    const [estimate, persisted] = await Promise.all([
      manager.estimate(),
      typeof manager.persisted === 'function' ? manager.persisted().catch(() => null) : Promise.resolve(null),
    ]);
    const usageBytes = finiteOrNull(estimate.usage);
    const quotaBytes = finiteOrNull(estimate.quota);
    return {
      usageBytes,
      quotaBytes,
      usageRatio: usageBytes !== null && quotaBytes !== null && quotaBytes > 0 ? usageBytes / quotaBytes : null,
      persisted,
    };
  } catch {
    return null;
  }
}

export function formatBrowserStorageStatus(status: BrowserStorageStatus | null) {
  if (!status || status.usageBytes === null || status.quotaBytes === null) return null;
  const percent = status.usageRatio === null ? null : Math.min(100, Math.max(0, Math.round(status.usageRatio * 100)));
  return `本站已用 ${formatBytes(status.usageBytes)} / 可用配额 ${formatBytes(status.quotaBytes)}${percent === null ? '' : `（${percent}%）`}`;
}

function finiteOrNull(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function formatBytes(value: number) {
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}
