export function createGeneratedCsv(pointName: string, seed: string) {
  const random = seededRandom(seed);
  const rowCount = 34 + Math.floor(random() * 18);
  const finalDepthM = round1(26 + random() * 20);
  const waterDepthM = round1(6 + random() * 18);
  const depthStep = finalDepthM / (rowCount + 2);
  const lines = ['PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM'];
  let firstDepthLabel = '';

  for (let index = 0; index < rowCount; index += 1) {
    const depthM = round3((index + 1) * depthStep);
    const trend = index / Math.max(1, rowCount - 1);
    const qcKpa = round1(850 + random() * 260 + trend * 1900 + Math.sin(index / 4) * 48);
    const u2Kpa = round1(45 + waterDepthM * 4.5 + depthM * 5.4 + random() * 9);
    const qtKpa = round1(qcKpa + u2Kpa * (0.14 + random() * 0.04));
    const fsKpa = round1(11 + trend * 34 + random() * 4.5);
    const frPercent = round3((100 * fsKpa) / Math.max(1, qtKpa));
    if (!firstDepthLabel) firstDepthLabel = `${depthM.toFixed(3)} m`;
    lines.push([pointName, depthM, qcKpa, qtKpa, fsKpa, u2Kpa, frPercent, waterDepthM, finalDepthM].join(','));
  }

  return {
    fileName: `${pointName}-upload-${seed}.csv`,
    csv: `${lines.join('\n')}\n`,
    rowCount,
    waterDepthM,
    finalDepthM,
    firstDepthLabel,
  };
}

export function createNonpositiveQcCsv(pointName: string, seed: string) {
  const generated = createGeneratedCsv(pointName, seed);
  const lines = generated.csv.trim().split('\n');
  const targetRow = Math.min(6, lines.length - 1);
  const cells = lines[targetRow].split(',');
  cells[2] = '-25.0';
  lines[targetRow] = cells.join(',');
  return {
    ...generated,
    fileName: `${pointName}-check-qc-${seed}.csv`,
    csv: `${lines.join('\n')}\n`,
    affectedRow: targetRow,
  };
}

export function createMissingDepthCsv(pointName: string) {
  return [
    'PointName,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    [pointName, 980, 1062, 12.4, 64, 1.168, 12.4, 32].join(','),
    [pointName, 1040, 1125, 13.1, 68, 1.164, 12.4, 32].join(','),
  ].join('\n') + '\n';
}

export function createNonmonotonicDepthCsv(pointName: string) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    [pointName, 0.5, 980, 1062, 12.4, 64, 1.168, 12.4, 32].join(','),
    [pointName, 1.0, 1040, 1125, 13.1, 68, 1.164, 12.4, 32].join(','),
    [pointName, 0.9, 1070, 1154, 14.2, 72, 1.23, 12.4, 32].join(','),
  ].join('\n') + '\n';
}

export function createDepthExceedsFinalCsv(pointName: string) {
  return [
    'PointName,DepthM,QcKpa,QtKpa,FsKpa,U2Kpa,FrPercent,WaterDepthM,FinalDepthM',
    [pointName, 0.5, 980, 1062, 12.4, 64, 1.168, 12.4, 1.2].join(','),
    [pointName, 1.0, 1040, 1125, 13.1, 68, 1.164, 12.4, 1.2].join(','),
    [pointName, 1.8, 1070, 1154, 14.2, 72, 1.23, 12.4, 1.2].join(','),
  ].join('\n') + '\n';
}

function seededRandom(seed: string) {
  let state = Number(seed) || 240709;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}
