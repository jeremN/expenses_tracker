import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { getTableColumns } from 'drizzle-orm'
import * as schema from '@tracker/db'

// Mock the db module so vitest doesn't try to resolve `cloudflare:workers`.
vi.mock('~/server/db', () => ({
  getDB: () => ({}),
}))

vi.mock('@tracker/db', async () => {
  const actual = await vi.importActual<typeof import('@tracker/db')>('@tracker/db')
  return {
    ...actual,
    getTransactions: vi.fn(),
    getCategories: vi.fn(),
    getRecurringRules: vi.fn(),
    getInvestmentSnapshots: vi.fn(),
    getBankImports: vi.fn(),
  }
})

import { buildExportZip } from './export'
import {
  getTransactions,
  getCategories,
  getRecurringRules,
  getInvestmentSnapshots,
  getBankImports,
} from '@tracker/db'

const mockGetTransactions = vi.mocked(getTransactions)
const mockGetCategories = vi.mocked(getCategories)
const mockGetRecurringRules = vi.mocked(getRecurringRules)
const mockGetInvestmentSnapshots = vi.mocked(getInvestmentSnapshots)
const mockGetBankImports = vi.mocked(getBankImports)

describe('buildExportZip', () => {
  it('produces a zip with the five expected CSV files at the root', async () => {
    mockGetTransactions.mockResolvedValue([
      {
        transactions: {
          id: 1, type: 'expense', amount: 1234, description: 'Coffee',
          date: '2026-05-15', categoryId: 1, recurringId: null,
          createdAt: '2026-05-15 10:00:00', updatedAt: '2026-05-15 10:00:00',
        },
        categories: null,
      },
    ] as any)
    mockGetCategories.mockResolvedValue([
      { id: 1, name: 'Groceries', color: '#22c55e', icon: null, createdAt: '2026-05-15 10:00:00' },
    ] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)

    const zip = await JSZip.loadAsync(bytes)
    const names = Object.keys(zip.files).sort()
    expect(names).toEqual([
      'bank_imports.csv',
      'categories.csv',
      'investment_snapshots.csv',
      'recurring_rules.csv',
      'transactions.csv',
    ])
  })

  it('writes the transaction row and category row into their CSVs', async () => {
    mockGetTransactions.mockResolvedValue([
      {
        transactions: {
          id: 1, type: 'expense', amount: 1234, description: 'Coffee',
          date: '2026-05-15', categoryId: 1, recurringId: null,
          createdAt: '2026-05-15 10:00:00', updatedAt: '2026-05-15 10:00:00',
        },
        categories: null,
      },
    ] as any)
    mockGetCategories.mockResolvedValue([
      { id: 1, name: 'Groceries', color: '#22c55e', icon: null, createdAt: '2026-05-15 10:00:00' },
    ] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)
    const zip = await JSZip.loadAsync(bytes)
    const txCSV = await zip.file('transactions.csv')!.async('string')
    expect(txCSV).toContain('id,type,amount,description,date,category_id,recurring_id,created_at,updated_at')
    expect(txCSV).toContain('1,expense,1234,Coffee,2026-05-15,1,,2026-05-15 10:00:00,2026-05-15 10:00:00')

    const catCSV = await zip.file('categories.csv')!.async('string')
    expect(catCSV).toContain('id,name,color,icon,created_at')
    expect(catCSV).toContain('1,Groceries,#22c55e,,2026-05-15 10:00:00')
  })

  it('writes header-only CSVs for empty tables', async () => {
    mockGetTransactions.mockResolvedValue([] as any)
    mockGetCategories.mockResolvedValue([] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)
    const zip = await JSZip.loadAsync(bytes)

    for (const name of ['transactions.csv', 'categories.csv', 'recurring_rules.csv', 'investment_snapshots.csv', 'bank_imports.csv']) {
      const content = await zip.file(name)!.async('string')
      expect(content.startsWith('﻿')).toBe(true)
      expect(content.split('\n').filter((l) => l.length > 0)).toHaveLength(1)
    }
  })

  it('header lists exactly match the Drizzle schema (no silent column drops)', async () => {
    mockGetTransactions.mockResolvedValue([] as any)
    mockGetCategories.mockResolvedValue([] as any)
    mockGetRecurringRules.mockResolvedValue([] as any)
    mockGetInvestmentSnapshots.mockResolvedValue([] as any)
    mockGetBankImports.mockResolvedValue([] as any)

    const bytes = await buildExportZip({} as any)
    const zip = await JSZip.loadAsync(bytes)

    function schemaColumns(table: Parameters<typeof getTableColumns>[0]): string[] {
      // Drizzle's table objects have a getSQL or _.columns shape; the
      // simplest portable way to enumerate columns is via getTableColumns
      // from drizzle-orm.
      return Object.values(getTableColumns(table)).map((c) => c.name).sort()
    }

    function csvHeaders(content: string): string[] {
      // Strip BOM then take first line
      return content.replace(/^﻿/, '').split('\n')[0].split(',').sort()
    }

    const transactionsCSV = await zip.file('transactions.csv')!.async('string')
    expect(csvHeaders(transactionsCSV)).toEqual(schemaColumns(schema.transactions))

    const categoriesCSV = await zip.file('categories.csv')!.async('string')
    expect(csvHeaders(categoriesCSV)).toEqual(schemaColumns(schema.categories))

    const recurringCSV = await zip.file('recurring_rules.csv')!.async('string')
    expect(csvHeaders(recurringCSV)).toEqual(schemaColumns(schema.recurringRules))

    const snapshotsCSV = await zip.file('investment_snapshots.csv')!.async('string')
    expect(csvHeaders(snapshotsCSV)).toEqual(schemaColumns(schema.investmentSnapshots))

    const importsCSV = await zip.file('bank_imports.csv')!.async('string')
    expect(csvHeaders(importsCSV)).toEqual(schemaColumns(schema.bankImports))
  })
})
