export interface ParsedRow {
  date: string // YYYY-MM-DD
  description: string
  amount: number // cents (positive for income, negative for expense)
  raw: Record<string, string> // original row data
}

export interface ParseResult {
  headers: string[]
  rows: ParsedRow[]
  rawRows: Record<string, string>[]
}

/**
 * Parse a CSV string into structured data.
 *
 * Handles:
 * - Comma and semicolon delimiters (auto-detected)
 * - Quoted fields (including quotes containing the delimiter)
 * - European number format (1.234,56)
 * - Multiple date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY)
 */
export function parseCSV(
  content: string,
  columnMapping?: Record<string, string>,
): ParseResult {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Records may span multiple physical lines when a field is quoted and
  // contains an embedded newline. Split into records using a quote-aware
  // scanner before parsing each one.
  const records = splitRecords(normalized).filter(
    (r) => r.trim().length > 0,
  )

  if (records.length === 0) {
    return { headers: [], rows: [], rawRows: [] }
  }

  // Detect delimiter by counting occurrences in the header record
  const delimiter = detectDelimiter(records[0])

  // Parse header row
  const headers = parseLine(records[0], delimiter)

  // Parse data rows
  const rawRows: Record<string, string>[] = []
  for (let i = 1; i < records.length; i++) {
    const values = parseLine(records[i], delimiter)
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rawRows.push(row)
  }

  // If no column mapping, return raw data only
  if (!columnMapping) {
    return { headers, rows: [], rawRows }
  }

  // Map columns to structured rows
  const rows: ParsedRow[] = []
  for (const raw of rawRows) {
    const dateCol = columnMapping.date
    const descCol = columnMapping.description
    const amountCol = columnMapping.amount
    const creditCol = columnMapping.credit
    const debitCol = columnMapping.debit

    if (!dateCol || (!amountCol && !(creditCol && debitCol))) continue

    const dateStr = raw[dateCol] ?? ''
    const descStr = descCol ? (raw[descCol] ?? '') : ''

    let amountCents: number
    if (creditCol && debitCol) {
      // Separate credit/debit columns
      const credit = parseAmount(raw[creditCol] ?? '')
      const debit = parseAmount(raw[debitCol] ?? '')
      amountCents = credit !== 0 ? credit : -Math.abs(debit)
    } else {
      amountCents = parseAmount(raw[amountCol] ?? '')
    }

    const date = parseDate(dateStr)
    if (!date) continue // Skip rows with unparseable dates

    rows.push({
      date,
      description: descStr.trim(),
      amount: amountCents,
      raw,
    })
  }

  return { headers, rows, rawRows }
}

/**
 * Auto-detect which columns are date, description, and amount
 * by matching common column names (case-insensitive).
 */
export function detectColumns(
  headers: string[],
): Record<string, string> {
  const mapping: Record<string, string> = {}
  const lower = headers.map((h) => h.toLowerCase().trim())

  // Date patterns
  const datePatterns = ['date', 'datum', 'fecha', 'data', 'booking date', 'transaction date', 'value date']
  for (let i = 0; i < lower.length; i++) {
    if (datePatterns.some((p) => lower[i].includes(p))) {
      mapping.date = headers[i]
      break
    }
  }

  // Description patterns
  const descPatterns = [
    'description', 'libellé', 'libelle', 'label', 'memo', 'reference',
    'narrative', 'details', 'payee', 'name', 'text', 'bezeichnung',
    'communication', 'remarks',
  ]
  for (let i = 0; i < lower.length; i++) {
    if (descPatterns.some((p) => lower[i].includes(p))) {
      mapping.description = headers[i]
      break
    }
  }

  // Amount patterns — check for separate debit/credit first
  const debitPatterns = ['debit', 'withdrawal', 'sortie', 'ausgabe']
  const creditPatterns = ['credit', 'deposit', 'entrée', 'entree', 'eingabe']
  let hasDebit = false
  let hasCredit = false

  for (let i = 0; i < lower.length; i++) {
    if (debitPatterns.some((p) => lower[i].includes(p))) {
      mapping.debit = headers[i]
      hasDebit = true
    }
    if (creditPatterns.some((p) => lower[i].includes(p))) {
      mapping.credit = headers[i]
      hasCredit = true
    }
  }

  // If we found both debit and credit, use them; otherwise look for a single amount column
  if (!(hasDebit && hasCredit)) {
    delete mapping.debit
    delete mapping.credit
    const amountPatterns = [
      'amount', 'montant', 'value', 'betrag', 'monto', 'sum', 'total',
      'debit', 'credit',
    ]
    for (let i = 0; i < lower.length; i++) {
      if (amountPatterns.some((p) => lower[i].includes(p))) {
        mapping.amount = headers[i]
        break
      }
    }
  }

  return mapping
}

// --- Internal helpers ---

/**
 * Split a CSV string into logical records, respecting quoted fields that
 * may contain embedded newlines. Newlines inside `"..."` do not terminate
 * the record; only unquoted newlines do.
 *
 * Lenient behavior: if the input ends while still inside a quoted field
 * (e.g. a truncated bank export missing its closing `"`), the partial
 * record is still emitted rather than throwing. A single `console.warn`
 * is logged so the gap is visible during debugging. Callers that need
 * strict validation should check for this warning in their pipeline.
 */
function splitRecords(content: string): string[] {
  const records: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      // Track quote state, but keep the character in `current` so parseLine
      // sees the same input it always has.
      if (inQuotes && content[i + 1] === '"') {
        current += '""'
        i++ // skip escaped quote
        continue
      }
      inQuotes = !inQuotes
      current += ch
    } else if (ch === '\n' && !inQuotes) {
      records.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (inQuotes) {
    console.warn('parseCSV: unterminated quoted field')
  }
  if (current.length > 0) records.push(current)
  return records
}

function detectDelimiter(line: string): string {
  // Count occurrences outside of quoted fields
  let commas = 0
  let semicolons = 0
  let tabs = 0
  let inQuotes = false

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes) {
      if (ch === ',') commas++
      else if (ch === ';') semicolons++
      else if (ch === '\t') tabs++
    }
  }

  if (tabs > commas && tabs > semicolons) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())

  return fields
}

/**
 * Validate a YYYY-MM-DD string by round-tripping through Date.UTC.
 * Rejects invalid months (e.g. 13), invalid days (e.g. Feb 30), and
 * other semantically broken inputs that pass the surface regex.
 */
function isValidIsoDate(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
  const utc = new Date(Date.UTC(y, mo - 1, d))
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() === mo - 1 &&
    utc.getUTCDate() === d
  )
}

/**
 * Disambiguate a (a, b, year) triple captured from a numeric date string
 * into a YYYY-MM-DD format. Uses the >12 heuristic to detect day vs month
 * position; defaults to DD/MM/YYYY for ambiguous cases (more common in
 * European bank statements). Returns null if the resulting date isn't real.
 */
function buildDate(a: string, b: string, year: string): string | null {
  const aPad = a.padStart(2, '0')
  const bPad = b.padStart(2, '0')
  const ai = parseInt(a, 10)
  const bi = parseInt(b, 10)

  let iso: string
  if (ai > 12 && bi <= 12) {
    iso = `${year}-${bPad}-${aPad}` // DD/MM/YYYY
  } else if (bi > 12 && ai <= 12) {
    iso = `${year}-${aPad}-${bPad}` // MM/DD/YYYY
  } else {
    iso = `${year}-${bPad}-${aPad}` // ambiguous: default DD/MM/YYYY
  }

  return isValidIsoDate(iso) ? iso : null
}

/**
 * Parse a date string into YYYY-MM-DD format.
 * Tries multiple common formats. Returns null if no format matches OR if
 * the parsed result is not a real calendar date.
 */
function parseDate(str: string): string | null {
  const s = str.trim()
  if (!s) return null

  // Already YYYY-MM-DD — still validate (e.g. reject 2026-13-40)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return isValidIsoDate(s) ? s : null
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (4-digit year)
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (dmy) {
    return buildDate(dmy[1], dmy[2], dmy[3])
  }

  // Same with 2-digit year (50-99 → 19xx, 00-49 → 20xx).
  // Previously this branch unconditionally treated `a` as day, which
  // mangled US-formatted dates like 01/15/26 into 2026-15-01.
  const short = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (short) {
    const yr = parseInt(short[3], 10)
    const year = yr >= 50 ? `19${short[3]}` : `20${short[3]}`
    return buildDate(short[1], short[2], year)
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
  if (ymd) {
    const iso = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
    return isValidIsoDate(iso) ? iso : null
  }

  return null
}

/**
 * Parse an amount string to cents.
 *
 * Handles:
 * - Standard format: 1234.56 -> 123456
 * - European format: 1.234,56 -> 123456
 * - Negative amounts: -100.00, (100.00)
 * - Currency symbols: $100.00, 100.00 EUR
 */
function parseAmount(str: string): number {
  let s = str.trim()
  if (!s) return 0

  // Detect if negative via parentheses: (100.00)
  const isParens = s.startsWith('(') && s.endsWith(')')
  if (isParens) {
    s = s.slice(1, -1).trim()
  }

  // Remove currency symbols and whitespace
  s = s.replace(/[^0-9,.\-+]/g, '')

  if (!s) return 0

  // Detect negative sign
  const isNegative = s.startsWith('-') || isParens
  s = s.replace(/^[+\-]/, '')

  // Determine decimal separator
  // European: 1.234,56 — commas as decimal, dots as thousands
  // Standard: 1,234.56 — dots as decimal, commas as thousands
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  let normalized: string

  if (lastComma > lastDot) {
    // European format: comma is the decimal separator
    // Remove thousand separators (dots), replace decimal comma with dot
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // Standard format: dot is the decimal separator
    // Remove thousand separators (commas)
    normalized = s.replace(/,/g, '')
  } else if (lastComma >= 0 && lastDot < 0) {
    // Only commas: could be decimal or thousands
    // If exactly 2 digits after comma, treat as decimal
    const afterComma = s.slice(lastComma + 1)
    if (afterComma.length <= 2) {
      normalized = s.replace(',', '.')
    } else {
      // Thousands separator
      normalized = s.replace(/,/g, '')
    }
  } else {
    // No comma or dot — whole number
    normalized = s
  }

  const value = parseFloat(normalized)
  if (isNaN(value)) return 0

  const cents = Math.round(value * 100)
  return isNegative ? -cents : cents
}
