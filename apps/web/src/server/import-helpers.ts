import { getDB } from '~/server/db'
import { transactions, createBankImport } from '@tracker/db'

export async function processImport(data: {
  transactions: Array<{
    date: string
    description?: string
    amount: number
    categoryId?: number
  }>
  filename: string
}) {
  const db = getDB()

  const rows = data.transactions
    .filter((tx) => tx.date && tx.amount !== undefined)
    .map((tx) => ({
      type: tx.amount > 0 ? 'income' as const : 'expense' as const,
      amount: Math.abs(tx.amount),
      description: tx.description ?? undefined,
      date: tx.date,
      categoryId: tx.categoryId ?? undefined,
    }))

  if (rows.length > 0) {
    await db.insert(transactions).values(rows)
  }

  await createBankImport(db, {
    filename: data.filename,
    rowCount: rows.length,
    status: rows.length === data.transactions.length ? 'completed' : 'partial',
  })

  return { imported: rows.length, total: data.transactions.length }
}
