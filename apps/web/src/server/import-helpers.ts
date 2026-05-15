import { getDB } from '~/server/db'
import { transactions, createBankImport, updateBankImportStatus } from '@tracker/db'

// Cap to keep D1 insert under the ~100-param-per-statement / ~1MB SQL-text
// limit. We batch in chunks of CHUNK below to stay well clear.
export const MAX_IMPORT_ROWS = 5000
const CHUNK = 250

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

  if (data.transactions.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `Import exceeds ${MAX_IMPORT_ROWS}-row limit (got ${data.transactions.length}). Split the file and try again.`,
    )
  }

  const rows = data.transactions
    .filter((tx) => tx.date && tx.amount !== undefined)
    .map((tx) => ({
      type: tx.amount > 0 ? 'income' as const : 'expense' as const,
      amount: Math.abs(tx.amount),
      description: tx.description ?? undefined,
      date: tx.date,
      categoryId: tx.categoryId ?? undefined,
    }))

  // Write the bank_imports row first as 'pending' so partial failures
  // leave a tombstone instead of a phantom success.
  const importRecord = await createBankImport(db, {
    filename: data.filename,
    rowCount: 0,
    status: 'pending',
  })

  let inserted = 0
  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK)
      if (batch.length > 0) {
        await db.insert(transactions).values(batch)
        inserted += batch.length
      }
    }
  } finally {
    if (importRecord) {
      await updateBankImportStatus(db, importRecord.id, {
        rowCount: inserted,
        status: inserted === data.transactions.length ? 'completed' : 'partial',
      })
    }
  }

  return { imported: inserted, total: data.transactions.length }
}
