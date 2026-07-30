export type CheckProfileField = 'qcKpa' | 'fsKpa' | 'u2Kpa';

export type CheckProfileRow = {
  sourceRowId: string;
  depthM: number;
  qcKpa: number;
  fsKpa: number;
  u2Kpa: number;
};

export type CheckProfileSample = CheckProfileRow & {
  sourceIndex: number;
  breakBefore?: Partial<Record<CheckProfileField, boolean>>;
  depthBreakBefore?: boolean;
};

export function sampleCheckProfileRows(
  rows: CheckProfileRow[],
  maxPoints = 540,
  preserveSourceRowIds: string[] = [],
) {
  const sorted = rows
    .map((row, sourceIndex) => ({ ...row, sourceIndex }))
    .filter((row) => Number.isFinite(row.depthM))
    .sort((left, right) => left.depthM - right.depthM || left.sourceIndex - right.sourceIndex);
  const hasU2 = sorted.some((row) => Number.isFinite(row.u2Kpa));
  const fields: CheckProfileField[] = hasU2 ? ['qcKpa', 'fsKpa', 'u2Kpa'] : ['qcKpa', 'fsKpa'];
  if (sorted.length <= maxPoints) {
    return {
      rows: annotateProfileBreaks(sorted.map((_, index) => index), sorted, fields),
      hasU2,
      totalRowCount: sorted.length,
    };
  }

  const preservedIds = new Set(preserveSourceRowIds);
  const preservedIndexes = new Set<number>(
    sorted.flatMap((row, index) => preservedIds.has(row.sourceRowId) ? [index] : []),
  );
  preservedIndexes.add(0);
  preservedIndexes.add(sorted.length - 1);
  for (const gapStartIndex of profileDepthGapStartIndexes(sorted)) {
    preservedIndexes.add(gapStartIndex - 1);
    preservedIndexes.add(gapStartIndex);
  }
  const pointsPerBucket = 2 + fields.length * 2;
  const bucketBudget = Math.max(0, maxPoints - preservedIndexes.size);
  const bucketCount = Math.floor(bucketBudget / pointsPerBucket);
  if (bucketCount < 1) {
    return {
      rows: annotateProfileBreaks(
        [...preservedIndexes].sort((left, right) => left - right).slice(0, maxPoints),
        sorted,
        fields,
      ),
      hasU2,
      totalRowCount: sorted.length,
    };
  }
  const bucketSize = Math.ceil(sorted.length / bucketCount);
  const selectedIndexes = new Set<number>(preservedIndexes);

  for (let start = 0; start < sorted.length; start += bucketSize) {
    const end = Math.min(sorted.length, start + bucketSize);
    selectedIndexes.add(start);
    selectedIndexes.add(end - 1);
    for (const field of fields) {
      let minIndex = -1;
      let maxIndex = -1;
      let minValue = Number.POSITIVE_INFINITY;
      let maxValue = Number.NEGATIVE_INFINITY;
      for (let index = start; index < end; index += 1) {
        const value = sorted[index][field];
        if (!Number.isFinite(value)) continue;
        if (value < minValue) {
          minValue = value;
          minIndex = index;
        }
        if (value > maxValue) {
          maxValue = value;
          maxIndex = index;
        }
      }
      if (minIndex >= 0) selectedIndexes.add(minIndex);
      if (maxIndex >= 0) selectedIndexes.add(maxIndex);
    }
  }

  return {
    rows: annotateProfileBreaks([...selectedIndexes].sort((left, right) => left - right), sorted, fields),
    hasU2,
    totalRowCount: sorted.length,
  };
}

function annotateProfileBreaks(
  selectedIndexes: number[],
  sorted: Array<CheckProfileRow & { sourceIndex: number }>,
  fields: CheckProfileField[],
) {
  const missingPrefixes = new Map(fields.map((field) => {
    const prefix = new Uint32Array(sorted.length + 1);
    for (let index = 0; index < sorted.length; index += 1) {
      prefix[index + 1] = prefix[index] + (Number.isFinite(sorted[index][field]) ? 0 : 1);
    }
    return [field, prefix] as const;
  }));
  const depthGapStartIndexes = new Set(profileDepthGapStartIndexes(sorted));
  const depthGapPrefix = new Uint32Array(sorted.length + 1);
  for (let index = 0; index < sorted.length; index += 1) {
    const startsAfterGap = depthGapStartIndexes.has(index);
    depthGapPrefix[index + 1] = depthGapPrefix[index] + (startsAfterGap ? 1 : 0);
  }
  return selectedIndexes.map((selectedIndex, outputIndex): CheckProfileSample => {
    if (outputIndex === 0) return sorted[selectedIndex];
    const previousIndex = selectedIndexes[outputIndex - 1];
    const crossesDepthGap = depthGapPrefix[selectedIndex + 1] - depthGapPrefix[previousIndex + 1] > 0;
    const breakBefore = Object.fromEntries(fields.flatMap((field) => {
      const prefix = missingPrefixes.get(field)!;
      const omittedMissing = prefix[selectedIndex] - prefix[previousIndex + 1];
      return omittedMissing > 0 || crossesDepthGap ? [[field, true]] : [];
    })) as Partial<Record<CheckProfileField, boolean>>;
    return Object.keys(breakBefore).length
      ? { ...sorted[selectedIndex], breakBefore, depthBreakBefore: crossesDepthGap || undefined }
      : sorted[selectedIndex];
  });
}

function profileDepthGapStartIndexes(sorted: Array<CheckProfileRow & { sourceIndex: number }>) {
  const positiveDepthSteps = sorted.slice(1)
    .map((row, index) => row.depthM - sorted[index].depthM)
    .filter((step) => step > 0)
    .sort((left, right) => left - right);
  const medianDepthStep = positiveDepthSteps.length
    ? positiveDepthSteps[Math.floor(positiveDepthSteps.length / 2)]
    : 0;
  const threshold = Math.max(0.1, medianDepthStep * 5);
  return sorted.flatMap((row, index) => index > 0 && row.depthM - sorted[index - 1].depthM > threshold ? [index] : []);
}

export function buildCheckProfilePath(
  rows: CheckProfileSample[],
  field: CheckProfileField,
  x: (value: number) => number,
  y: (depthM: number) => number,
) {
  let drawing = false;
  return rows.map((row) => {
    if (row.breakBefore?.[field]) drawing = false;
    const value = row[field];
    if (!Number.isFinite(value)) {
      drawing = false;
      return '';
    }
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${command} ${x(value).toFixed(2)} ${y(row.depthM).toFixed(2)}`;
  }).filter(Boolean).join(' ');
}
