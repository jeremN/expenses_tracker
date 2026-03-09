import { getDB } from '~/server/db'
import { createTransaction, createBankImport } from '@tracker/db'

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
  let imported = 0

  for (const tx of data.transactions) {
    if (!tx.date || tx.amount === undefined) continue

    const isIncome = tx.amount > 0
    await createTransaction(db, {
      type: isIncome ? 'income' : 'expense',
      amount: Math.abs(tx.amount),
      description: tx.description || undefined,
      date: tx.date,
      categoryId: tx.categoryId || undefined,
    })
    imported++
  }

  await createBankImport(db, {
    filename: data.filename,
    rowCount: imported,
    status: imported === data.transactions.length ? 'completed' : 'partial',
  })

  return { imported, total: data.transactions.length }
}
