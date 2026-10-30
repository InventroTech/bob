// In order of preference; Praja exports call the praja id "user_id".
const PRAJA_ID_HEADERS = ["praja_id", "prajaid", "user_id", "userid"];
const RECORD_ID_HEADERS = new Set(["id", "record_id", "lead_id", "recordid", "leadid"]);
const PRAJA_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type ParsedPrajaIds = {
  ids: string[];
  error?: string;
};

export function parsePrajaIds(text: string): ParsedPrajaIds {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { ids: [] };

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerCells = splitRow(lines[0]).map((cell) => normalizeHeader(cell));
  const prajaIdColumn = PRAJA_ID_HEADERS.map((header) => headerCells.indexOf(header)).find(
    (index) => index >= 0
  ) ?? -1;

  if (prajaIdColumn === -1 && headerCells.some((cell) => RECORD_ID_HEADERS.has(cell))) {
    return {
      ids: [],
      error: "This file has lead record ids. Use the praja_id or user_id column.",
    };
  }

  const hasHeaderLine = lines.length > 1 && !/\d/.test(lines[0]);
  const bodyText = hasHeaderLine ? lines.slice(1).join("\n") : trimmed;
  const tokens =
    prajaIdColumn >= 0
      ? lines.slice(1).map((line) => splitRow(line)[prajaIdColumn] ?? "")
      : bodyText.split(/[\s,;]+/);

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const id = parsePrajaId(token);
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return { ids };
}

export function mergePrajaIds(current: string[], incoming: string[]): string[] {
  const seen = new Set(current);
  const ids = [...current];
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += size) {
    chunks.push(ids.slice(start, start + size));
  }
  return chunks;
}

function parsePrajaId(token: string): string | null {
  const value = token.trim().replace(/^"(.*)"$/, "$1").trim();
  // A word with no digits is a header or label, never a praja id.
  return PRAJA_ID_PATTERN.test(value) && /\d/.test(value) ? value : null;
}

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/^\uFEFF/, "").replace(/\s+/g, "_");
}

function splitRow(line: string): string[] {
  if (line.includes("\t") && !line.includes(",")) return line.split("\t");
  return splitCsvLine(line);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}
