import { describe, it, expect } from 'vitest'
import { summarizeBudgets } from './budget-summary.helpers'
import type { BudgetOverviewItem } from '@tracker/shared'

const item = (name: string, budget: number | null, spent: number): BudgetOverviewItem => ({
  categoryId: name.length, categoryName: name, categoryColor: null, budget, spent,
})

describe('summarizeBudgets', () => {
  it('totals only budgeted categories and flags overall over', () => {
    const s = summarizeBudgets([item('A', 10000, 12000), item('B', 20000, 5000), item('C', null, 9999)])
    expect(s.totalBudget).toBe(30000)
    expect(s.totalSpent).toBe(17000)
    expect(s.overallOver).toBe(false)
  })

  it('returns top-N concerns ordered by spend ratio, over-budget first', () => {
    const s = summarizeBudgets(
      [item('Under', 10000, 1000), item('Over', 10000, 15000), item('Near', 10000, 9000), item('NoBudget', null, 5000)],
      2,
    )
    expect(s.concerns.map((c) => c.categoryName)).toEqual(['Over', 'Near'])
  })

  it('has no concerns when nothing is budgeted', () => {
    const s = summarizeBudgets([item('X', null, 100)])
    expect(s.totalBudget).toBe(0)
    expect(s.concerns).toEqual([])
  })
})
