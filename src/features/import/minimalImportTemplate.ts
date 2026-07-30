import { strToU8, zipSync } from 'fflate';
import type { TemplateKind } from '../workflow/types';
import { STANDARD_IMPORT_TEMPLATE_FIELDS } from './importPipeline';

const exampleRows = [
  ['0.50', '0.920', '12.5', '62'],
  ['1.00', '0.980', '13.8', '67'],
  ['1.50', '1.060', '15.1', '74'],
] as const;

export function createMinimalTemplateCsv(kind: TemplateKind) {
  const rows = kind === 'example' ? exampleRows : [];
  return `\uFEFF${[STANDARD_IMPORT_TEMPLATE_FIELDS, ...rows].map((row) => row.join(',')).join('\r\n')}\r\n`;
}

export function createMinimalTemplateXlsx(kind: TemplateKind) {
  const rows = kind === 'example' ? exampleRows : [];
  const worksheetRows = [STANDARD_IMPORT_TEMPLATE_FIELDS, ...rows]
    .map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cellXml(rowIndex + 1, columnIndex + 1, value, rowIndex === 0)).join('')}</row>`)
    .join('');
  const lastRow = rows.length + 1;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': xml(`
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
        <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      </Types>`),
    '_rels/.rels': xml(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      </Relationships>`),
    'xl/workbook.xml': xml(`
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets><sheet name="CPT数据" sheetId="1" r:id="rId1"/></sheets>
      </workbook>`),
    'xl/_rels/workbook.xml.rels': xml(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      </Relationships>`),
    'xl/styles.xml': xml(`
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font></fonts>
        <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF285F8F"/><bgColor indexed="64"/></patternFill></fill></fills>
        <borders count="2"><border/><border><left style="thin"><color rgb="FFD7DCE2"/></left><right style="thin"><color rgb="FFD7DCE2"/></right><top style="thin"><color rgb="FFD7DCE2"/></top><bottom style="thin"><color rgb="FFD7DCE2"/></bottom></border></borders>
        <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
        <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs>
        <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
      </styleSheet>`),
    'xl/worksheets/sheet1.xml': xml(`
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
        <cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="4" width="16" customWidth="1"/></cols>
        <sheetData>${worksheetRows}</sheetData>
        <autoFilter ref="A1:D${lastRow}"/>
      </worksheet>`),
  };
  return zipSync(files, { level: 6 });
}

function cellXml(row: number, column: number, value: string, header: boolean) {
  const reference = `${columnName(column)}${row}`;
  if (header) return `<c r="${reference}" s="1" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  return `<c r="${reference}" s="0" t="n"><v>${value}</v></c>`;
}

function columnName(column: number) {
  let current = column;
  let name = '';
  while (current > 0) {
    current -= 1;
    name = String.fromCharCode(65 + (current % 26)) + name;
    current = Math.floor(current / 26);
  }
  return name;
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function xml(value: string) {
  return strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value.replace(/>\s+</g, '><').trim()}`);
}
