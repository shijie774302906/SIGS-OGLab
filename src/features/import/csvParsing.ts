export type ParsedDelimitedRow = {
  cells: string[];
  lineNumber: number;
};

export type ParsedDelimitedText = {
  rows: ParsedDelimitedRow[];
  delimiter: ',' | '\t' | ';';
  unclosedQuotes: boolean;
};

const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

export function decodeDelimitedText(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return stripBom(new TextDecoder('utf-16le').decode(buffer));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return stripBom(new TextDecoder('utf-16be').decode(buffer));
  }
  try {
    return stripBom(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch {
    return stripBom(new TextDecoder('gb18030').decode(buffer));
  }
}

export function parseDelimitedText(text: string): ParsedDelimitedText {
  const normalizedText = stripBom(text);
  const delimiter = detectDelimiter(normalizedText);
  const parsed = parseWithDelimiter(normalizedText, delimiter);
  return { ...parsed, delimiter };
}

export function delimiterLabel(delimiter: ParsedDelimitedText['delimiter']) {
  if (delimiter === '\t') return '制表符';
  if (delimiter === ';') return '分号';
  return '逗号';
}

function detectDelimiter(text: string): ParsedDelimitedText['delimiter'] {
  let winner: ParsedDelimitedText['delimiter'] = ',';
  let winnerScore = Number.NEGATIVE_INFINITY;
  for (const candidate of DELIMITER_CANDIDATES) {
    const parsed = parseWithDelimiter(text, candidate);
    const score = delimiterScore(parsed.rows);
    if (score > winnerScore) {
      winner = candidate;
      winnerScore = score;
    }
  }
  return winner;
}

function delimiterScore(rows: ParsedDelimitedRow[]) {
  const nonEmpty = rows
    .filter((row) => row.cells.some((cell) => cell.trim()))
    .slice(0, 160);
  const widths = nonEmpty.map((row) => row.cells.length);
  const multiColumnWidths = widths.filter((width) => width > 1);
  if (multiColumnWidths.length < 2) return Number.NEGATIVE_INFINITY;

  const frequencies = new Map<number, number>();
  for (const width of multiColumnWidths) frequencies.set(width, (frequencies.get(width) ?? 0) + 1);
  const [modalWidth, modalCount] = [...frequencies.entries()]
    .sort((left, right) => right[1] - left[1] || right[0] - left[0])[0];
  const headerEvidence = nonEmpty.some((row) => hasCptHeaderEvidence(row.cells));
  const inconsistent = multiColumnWidths.length - modalCount;
  return (headerEvidence ? 1_000_000 : 0)
    + modalCount * 1_000
    + modalWidth * 10
    - inconsistent * 50;
}

function hasCptHeaderEvidence(cells: string[]) {
  const normalized = cells.map((cell) => cell.toLocaleLowerCase().replace(/\s+/g, ''));
  const hasDepth = normalized.some((cell) => /depth|深度/.test(cell));
  const hasQc = normalized.some((cell) => /(?:^|[^a-z])qc(?:[^a-z]|$)|coneresistance|锥尖|锥阻/.test(cell));
  const hasFs = normalized.some((cell) => /(?:^|[^a-z])fs(?:[^a-z]|$)|sleevefriction|侧摩|摩阻/.test(cell));
  return hasDepth && hasQc && hasFs;
}

function parseWithDelimiter(
  text: string,
  delimiter: ParsedDelimitedText['delimiter'],
): Omit<ParsedDelimitedText, 'delimiter'> {
  const rows: ParsedDelimitedRow[] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let physicalLine = 1;
  let rowStartLine = 1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push({ cells: row, lineNumber: rowStartLine });
      row = [];
      cell = '';
      physicalLine += 1;
      rowStartLine = physicalLine;
    } else {
      cell += char;
      if (char === '\n' || char === '\r') physicalLine += 1;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push({ cells: row, lineNumber: rowStartLine });
  return { rows, unclosedQuotes: inQuotes };
}

function stripBom(text: string) {
  return text.replace(/^\uFEFF/, '');
}
