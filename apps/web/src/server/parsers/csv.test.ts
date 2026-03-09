import { describe, it, expect } from 'vitest'
import { parseCSV, detectColumns } from './csv'

describe('parseCSV', () => {
  it('parses a basic comma-delimited CSV', () => {
    const csv = `Date,Description,Amount
2026-01-15,Groceries,-45.50
2026-01-16,Salary,3000.00`

    const result = parseCSV(csv, {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    })

    expect(result.headers).toEqual(['Date', 'Description', 'Amount'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({
      date: '2026-01-15',
      description: 'Groceries',
      amount: -4550,
    })
    expect(result.rows[1]).toMatchObject({
      date: '2026-01-16',
      description: 'Salary',
      amount: 300000,
    })
  })

  it('returns only headers and rawRows when no mapping provided', () => {
    const csv = `Date,Amount
2026-01-01,100`

    const result = parseCSV(csv)
    expect(result.headers).toEqual(['Date', 'Amount'])
    expect(result.rows).toEqual([])
    expect(result.rawRows).toHaveLength(1)
    expect(result.rawRows[0]).toEqual({ Date: '2026-01-01', Amount: '100' })
  })

  it('handles semicolon-delimited CSV', () => {
    const csv = `Date;Description;Amount
15/01/2026;Groceries;-45,50`

    const result = parseCSV(csv, {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      date: '2026-01-15',
      description: 'Groceries',
      amount: -4550,
    })
  })

  it('handles European number format (comma as decimal)', () => {
    const csv = `Date;Montant
2026-01-15;1.234,56`

    const result = parseCSV(csv, {
      date: 'Date',
      amount: 'Montant',
    })

    expect(result.rows[0].amount).toBe(123456)
  })

  it('handles separate credit/debit columns', () => {
    const csv = `Date,Description,Debit,Credit
2026-01-15,Groceries,45.50,
2026-01-16,Salary,,3000.00`

    const result = parseCSV(csv, {
      date: 'Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
    })

    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].amount).toBe(-4550) // debit is negative
    expect(result.rows[1].amount).toBe(300000) // credit is positive
  })

  it('handles quoted fields with delimiters inside', () => {
    const csv = `Date,Description,Amount
2026-01-15,"Coffee, tea, etc",-5.00`

    const result = parseCSV(csv, {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    })

    expect(result.rows[0].description).toBe('Coffee, tea, etc')
  })

  it('handles DD/MM/YYYY date format', () => {
    const csv = `Date,Amount
15/01/2026,100`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].date).toBe('2026-01-15')
  })

  it('handles DD.MM.YYYY date format', () => {
    const csv = `Date,Amount
15.01.2026,100`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].date).toBe('2026-01-15')
  })

  it('skips rows with unparseable dates', () => {
    const csv = `Date,Amount
not-a-date,100
2026-01-15,200`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].date).toBe('2026-01-15')
  })

  it('handles negative amounts in parentheses', () => {
    const csv = `Date,Amount
2026-01-15,(45.50)`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].amount).toBe(-4550)
  })

  it('handles amounts with currency symbols', () => {
    const csv = `Date,Amount
2026-01-15,$1234.56`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].amount).toBe(123456)
  })

  it('handles empty CSV', () => {
    const result = parseCSV('')
    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.rawRows).toEqual([])
  })

  it('handles tab-delimited CSV', () => {
    const csv = `Date\tAmount
2026-01-15\t100.00`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].amount).toBe(10000)
  })

  it('handles 2-digit year dates', () => {
    const csv = `Date,Amount
15/01/26,100`

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows[0].date).toBe('2026-01-15')
  })

  it('handles Windows-style line endings (CRLF)', () => {
    const csv = "Date,Amount\r\n2026-01-15,100\r\n2026-01-16,200"

    const result = parseCSV(csv, { date: 'Date', amount: 'Amount' })
    expect(result.rows).toHaveLength(2)
  })
})

describe('detectColumns', () => {
  it('detects standard English column names', () => {
    const mapping = detectColumns(['Date', 'Description', 'Amount'])
    expect(mapping).toEqual({
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    })
  })

  it('detects French column names', () => {
    const mapping = detectColumns(['Date', 'Libellé', 'Montant'])
    expect(mapping).toEqual({
      date: 'Date',
      description: 'Libellé',
      amount: 'Montant',
    })
  })

  it('detects separate debit/credit columns', () => {
    const mapping = detectColumns(['Date', 'Description', 'Debit', 'Credit'])
    expect(mapping).toEqual({
      date: 'Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
    })
  })

  it('falls back to single amount when only debit exists', () => {
    const mapping = detectColumns(['Date', 'Description', 'Debit'])
    expect(mapping.amount).toBe('Debit')
    expect(mapping.debit).toBeUndefined()
    expect(mapping.credit).toBeUndefined()
  })

  it('detects case-insensitively', () => {
    const mapping = detectColumns(['DATE', 'DESCRIPTION', 'AMOUNT'])
    expect(mapping).toEqual({
      date: 'DATE',
      description: 'DESCRIPTION',
      amount: 'AMOUNT',
    })
  })

  it('detects booking date variant', () => {
    const mapping = detectColumns(['Booking Date', 'Narrative', 'Value'])
    expect(mapping.date).toBe('Booking Date')
    expect(mapping.description).toBe('Narrative')
    expect(mapping.amount).toBe('Value')
  })

  it('returns empty mapping for unrecognized headers', () => {
    const mapping = detectColumns(['Col1', 'Col2', 'Col3'])
    expect(mapping).toEqual({})
  })
})
