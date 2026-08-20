import type { QuickPlotRowV1 } from '../quick/quickPlotDomain';

export const SYNTHETIC_CPTU_DEMO_NAME = '系统生成演示数据';
export const SYNTHETIC_CPTU_DEMO_FILE_NAME = 'SIGS-OGLab-系统生成演示数据.csv';
export const SYNTHETIC_CPTU_DEMO_POINT_NAME = '演示-CPTU-01';
export const SYNTHETIC_CPTU_DEMO_WATER_DEPTH_M = 20;

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function createSyntheticCptuDemoRows(): QuickPlotRowV1[] {
  return Array.from({ length: 121 }, (_, index) => {
    const depthM = round(index * 0.25, 2);
    const ripple = Math.sin(index * 0.47) * 0.12 + Math.cos(index * 0.19) * 0.08;
    let qcMpa: number;
    let fsKpa: number;
    let excessU2Kpa: number;
    if (depthM < 3) {
      qcMpa = 1.15 + depthM * 0.12 + ripple;
      fsKpa = 44 + depthM * 5 + ripple * 18;
      excessU2Kpa = 72 + depthM * 4;
    } else if (depthM < 8) {
      qcMpa = 8.5 + (depthM - 3) * 0.8 + ripple * 5;
      fsKpa = 86 + (depthM - 3) * 7 + ripple * 22;
      excessU2Kpa = 24 + ripple * 8;
    } else if (depthM < 12) {
      qcMpa = 3.4 + (depthM - 8) * 0.3 + ripple * 2;
      fsKpa = 98 + (depthM - 8) * 9 + ripple * 20;
      excessU2Kpa = 64 + (depthM - 8) * 5;
    } else if (depthM < 20) {
      qcMpa = 13.5 + (depthM - 12) * 0.55 + ripple * 7;
      fsKpa = 142 + (depthM - 12) * 8 + ripple * 28;
      excessU2Kpa = 18 + ripple * 8;
    } else if (depthM < 26) {
      qcMpa = 1.8 + (depthM - 20) * 0.16 + ripple * 1.2;
      fsKpa = 112 + (depthM - 20) * 11 + ripple * 24;
      excessU2Kpa = 105 + (depthM - 20) * 7;
    } else {
      qcMpa = 5.6 + (depthM - 26) * 0.65 + ripple * 3;
      fsKpa = 126 + (depthM - 26) * 9 + ripple * 22;
      excessU2Kpa = 52 + ripple * 10;
    }
    const hydrostaticKpa = (SYNTHETIC_CPTU_DEMO_WATER_DEPTH_M + depthM) * 10;
    return {
      rowId: `synthetic-cptu-${String(index + 1).padStart(3, '0')}`,
      depthM,
      qcMpa: round(Math.max(0.2, qcMpa), 3),
      fsKpa: round(Math.max(1, fsKpa), 1),
      u2Kpa: round(hydrostaticKpa + excessU2Kpa, 1),
    };
  });
}

export function createSyntheticCptuDemoCsv() {
  const header = ['Depth(m)', 'qc(MPa)', 'fs(kPa)', 'u2(kPa)'];
  const rows = createSyntheticCptuDemoRows().map((row) => [
    row.depthM.toFixed(2),
    row.qcMpa.toFixed(3),
    row.fsKpa?.toFixed(1) ?? '',
    row.u2Kpa?.toFixed(1) ?? '',
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.join(',')).join('\r\n')}\r\n`;
}

export function createSyntheticCptuDemoFile() {
  return new File([createSyntheticCptuDemoCsv()], SYNTHETIC_CPTU_DEMO_FILE_NAME, {
    type: 'text/csv;charset=utf-8',
    lastModified: 0,
  });
}
