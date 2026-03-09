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
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] }
  }

  // Detect delimiter by counting occurrences in the first line
  const delimiter = detectDelimiter(lines[0])

  // Parse header row
  const headers = parseLine(lines[0], delimiter)

  // Parse data rows
  const rawRows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter)
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
 * Parse a date string into YYYY-MM-DD format.
 * Tries multiple common formats.
 */
function parseDate(str: string): string | null {
  const s = str.trim()
  if (!s) return null

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const year = dmy[3]
    // Heuristic: if first number > 12, it's definitely the day (DD/MM/YYYY)
    // If second number > 12, it's definitely the month position (MM/DD/YYYY)
    const d = parseInt(day, 10)
    const m = parseInt(month, 10)
    if (d > 12 && m <= 12) {
      // DD/MM/YYYY
      return `${year}-${month}-${day}`
    }
    if (m > 12 && d <= 12) {
      // MM/DD/YYYY
      return `${year}-${day}-${month}`
    }
    // Ambiguous — default to DD/MM/YYYY (more common in bank statements)
    return `${year}-${month}-${day}`
  }

  // MM/DD/YYYY or similar with 2-digit year
  const short = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (short) {
    const a = short[1].padStart(2, '0')
    const b = short[2].padStart(2, '0')
    const yr = parseInt(short[3], 10)
    const year = yr >= 50 ? `19${short[3]}` : `20${short[3]}`
    return `${year}-${b}-${a}` // default DD/MM/YY
  }

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
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
