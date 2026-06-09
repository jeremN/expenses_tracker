import type { BudgetOverviewItem } from '@tracker/shared'

export interface BudgetConcern extends BudgetOverviewItem {
  budget: number // narrowed: concerns are always budgeted
  ratio: number
  over: boolean
}

export interface BudgetSummary {
  totalBudget: number
  totalSpent: number
  overallPct: number
  overallOver: boolean
  concerns: BudgetConcern[]
}

/** Aggregate the month's budget overview and pick the N categories most worth attention. */
export function summarizeBudgets(items: BudgetOverviewItem[], topN = 3): BudgetSummary {
  const budgeted = items.filter((i): i is BudgetOverviewItem & { budget: number } => i.budget != null)
  const totalBudget = budgeted.reduce((sum, i) => sum + i.budget, 0)
  const totalSpent = budgeted.reduce((sum, i) => sum + i.spent, 0)
  const concerns = budgeted
    .map((i) => ({ ...i, ratio: i.budget > 0 ? i.spent / i.budget : 0, over: i.spent > i.budget }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, topN)
  return {
    totalBudget,
    totalSpent,
    overallPct: totalBudget > 0 ? totalSpent / totalBudget : 0,
    overallOver: totalSpent > totalBudget,
    concerns,
  }
}
