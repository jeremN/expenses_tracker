import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { createTransaction, createBankImport } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { transactions, filename } = body

          if (!Array.isArray(transactions) || transactions.length === 0) {
            return errorResponse('No transactions provided')
          }
          if (!filename || typeof filename !== 'string') {
            return errorResponse('Filename is required')
          }

          const db = getDB()
          let imported = 0

          for (const tx of transactions) {
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

          // Record the import
          await createBankImport(db, {
            filename,
            rowCount: imported,
            status: imported === transactions.length ? 'completed' : 'partial',
          })

          return jsonResponse({ imported, total: transactions.length }, 201)
        } catch (error) {
          console.error('Import error:', error)
          return errorResponse('Failed to import transactions', 500)
        }
      },
    },
  },
})
