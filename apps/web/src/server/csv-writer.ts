/**
 * Serialize an array of row objects into a CSV string.
 *
 * Output format:
 * - UTF-8 BOM (﻿) at the start, so Excel detects UTF-8 correctly
 * - Comma delimiter, \n line endings
 * - First line: header row (the `headers` argument, in order)
 * - Each subsequent line: one row, with each field looked up by header key
 * - Fields are quoted only when they contain a comma, newline, carriage
 *   return, or double quote
 * - Embedded double quotes are escaped by doubling: " -> ""
 * - `null` and `undefined` render as empty fields, NOT the literal strings
 *   "null" / "undefined"
 * - Booleans render as 0 / 1 (matches D1's storage; re-imports cleanly)
 * - Missing keys on a row object render as empty fields
 *
 * This is the inverse of `parseCSV` for round-trip integrity, but simpler:
 * no format detection, no date heuristics — just write what it's given.
 */
export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeField).join(','))
  for (const row of rows) {
    const fields = headers.map((h) => formatValue(row[h]))
    lines.push(fields.join(','))
  }
  // UTF-8 BOM + body + trailing newline
  return '﻿' + lines.join('\n') + '\n'
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? '1' : '0'
  return escapeField(String(v))
}

function escapeField(s: string): string {
  // Quote only when needed; double up embedded quotes.
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
