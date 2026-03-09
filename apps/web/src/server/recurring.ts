import { getDB } from '~/server/db'
import { getActiveRecurringRules, getLastGeneratedTransaction, createTransaction } from '@tracker/db/queries'

/**
 * Formats a Date object as a YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
function today(): string {
  return formatDate(new Date())
}

/**
 * Advances a YYYY-MM-DD date string by one period according to the given frequency.
 *
 * Handles month-end clamping: if the original day exceeds the number of days
 * in the target month, it clamps to the last day of that month.
 * Example: 2026-01-31 + monthly -> 2026-02-28
 */
function addPeriod(dateStr: string, frequency: string): string {
  // Parse the YYYY-MM-DD string into its numeric parts.
  // m is 1-based (1 = January, 12 = December).
  const [y, m, d] = dateStr.split('-').map(Number)

  switch (frequency) {
    case 'weekly': {
      // Date constructor handles day overflow automatically
      return formatDate(new Date(y, m - 1, d + 7))
    }
    case 'monthly': {
      // Next month: if current is December (12), wrap to January of next year
      const targetYear = m === 12 ? y + 1 : y
      const targetMonth0 = m === 12 ? 0 : m // 0-based month for Date constructor

      // Clamp day to last day of target month (e.g., Jan 31 -> Feb 28)
      const lastDay = new Date(targetYear, targetMonth0 + 1, 0).getDate()
      return formatDate(new Date(targetYear, targetMonth0, Math.min(d, lastDay)))
    }
    case 'yearly': {
      // Clamp day for leap year edge case (e.g., Feb 29 -> Feb 28 in non-leap year)
      const lastDay = new Date(y + 1, m, 0).getDate() // last day of same month next year
      return formatDate(new Date(y + 1, m - 1, Math.min(d, lastDay)))
    }
    default:
      return dateStr
  }
}

/**
 * Generates all missing transactions from active recurring rules.
 *
 * For each active rule, determines the next date a transaction should exist,
 * then creates transactions for every missed occurrence up to (and including) today.
 *
 * Returns the total number of transactions that were generated.
 */
export async function generateMissingTransactions(): Promise<number> {
  const db = getDB()
  const rules = await getActiveRecurringRules(db)
  const todayStr = today()
  let totalGenerated = 0

  for (const rule of rules) {
    // Determine where to start generating from
    const lastTx = await getLastGeneratedTransaction(db, rule.id)

    let nextDate: string
    if (lastTx) {
      // Start one period after the last generated transaction
      nextDate = addPeriod(lastTx.date, rule.frequency)
    } else {
      // No transactions yet -- start from the rule's start date
      nextDate = rule.startDate
    }

    // Generate transactions for each missing occurrence up to today
    while (nextDate <= todayStr) {
      // Respect the rule's end date
      if (rule.endDate && nextDate > rule.endDate) {
        break
      }

      await createTransaction(db, {
        type: rule.type,
        amount: rule.amount,
        description: rule.description ?? undefined,
        date: nextDate,
        categoryId: rule.categoryId ?? undefined,
        recurringId: rule.id,
      })
      totalGenerated++

      nextDate = addPeriod(nextDate, rule.frequency)
    }
  }

  return totalGenerated
}
