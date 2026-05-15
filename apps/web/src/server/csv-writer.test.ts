import { describe, it, expect } from 'vitest'
import { toCSV } from './csv-writer'
import { parseCSV } from './parsers/csv'

describe('toCSV', () => {
  it('writes a header-only CSV when given no rows', () => {
    const out = toCSV(['a', 'b', 'c'], [])
    // BOM (0xEF 0xBB 0xBF as UTF-16 codepoint 0xFEFF) + header + trailing \n
    expect(out).toBe('﻿a,b,c\n')
  })

  it('writes basic rows', () => {
    const out = toCSV(
      ['id', 'name'],
      [
        { id: 1, name: 'Groceries' },
        { id: 2, name: 'Rent' },
      ],
    )
    expect(out).toBe('﻿id,name\n1,Groceries\n2,Rent\n')
  })

  it('starts with a UTF-8 BOM', () => {
    const out = toCSV(['x'], [{ x: 1 }])
    expect(out.charCodeAt(0)).toBe(0xfeff)
  })

  it('renders null and undefined as empty fields, not "null"/"undefined"', () => {
    const out = toCSV(
      ['a', 'b', 'c'],
      [{ a: 1, b: null, c: undefined }],
    )
    expect(out).toBe('﻿a,b,c\n1,,\n')
  })

  it('renders booleans as 0/1', () => {
    const out = toCSV(['flag'], [{ flag: true }, { flag: false }])
    expect(out).toBe('﻿flag\n1\n0\n')
  })

  it('quotes fields containing commas', () => {
    const out = toCSV(
      ['desc'],
      [{ desc: 'Coffee, tea, etc' }],
    )
    expect(out).toBe('﻿desc\n"Coffee, tea, etc"\n')
  })

  it('quotes fields containing newlines', () => {
    const out = toCSV(['note'], [{ note: 'line1\nline2' }])
    expect(out).toBe('﻿note\n"line1\nline2"\n')
  })

  it('escapes embedded double quotes by doubling them', () => {
    const out = toCSV(['q'], [{ q: 'she said "hi"' }])
    expect(out).toBe('﻿q\n"she said ""hi"""\n')
  })

  it('does not quote fields that do not need it', () => {
    const out = toCSV(['x'], [{ x: 'plain text 123' }])
    expect(out).toBe('﻿x\nplain text 123\n')
  })

  it('round-trips through parseCSV for strings with special chars', () => {
    const rows = [
      { id: 1, description: 'Coffee, tea', amount: 1234 },
      { id: 2, description: 'She said "hi"', amount: -500 },
      { id: 3, description: 'line1\nline2', amount: 0 },
    ]
    const csv = toCSV(['id', 'description', 'amount'], rows)
    // parseCSV with explicit mapping returns ParsedRow shape; verify rawRows.
    // We strip the BOM since parseCSV doesn't expect it; production CSVs from
    // toCSV are meant for spreadsheets, not for round-trip through our parser.
    const stripped = csv.replace(/^﻿/, '')
    const parsed = parseCSV(stripped)
    expect(parsed.headers).toEqual(['id', 'description', 'amount'])
    expect(parsed.rawRows).toEqual([
      { id: '1', description: 'Coffee, tea', amount: '1234' },
      { id: '2', description: 'She said "hi"', amount: '-500' },
      { id: '3', description: 'line1\nline2', amount: '0' },
    ])
  })

  it('uses missing keys as empty fields', () => {
    const out = toCSV(['a', 'b', 'c'], [{ a: 1 }])
    expect(out).toBe('﻿a,b,c\n1,,\n')
  })
})
