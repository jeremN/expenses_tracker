import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getDB } from '~/server/db'
import { getTransactions, createTransaction } from '@tracker/db'
import { createTransactionSchema, transactionTypeSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

const transactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  category: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: transactionTypeSchema.optional(),
})

export const Route = createFileRoute('/api/transactions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const parsed = transactionsQuerySchema.safeParse({
            month: url.searchParams.get('month') ?? undefined,
            category: url.searchParams.get('category') ?? undefined,
            type: url.searchParams.get('type') ?? undefined,
          })

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message)
          }

          const db = getDB()
          const rows = await getTransactions(db, {
            month: parsed.data.month,
            categoryId: parsed.data.category,
            type: parsed.data.type,
          })

          // Flatten the joined result into a cleaner shape
          const transactions = rows.map((row) => ({
            ...row.transactions,
            category: row.categories,
          }))

          return jsonResponse(transactions)
        } catch {
          return errorResponse('Failed to fetch transactions', 500)
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const parsed = createTransactionSchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message)
          }

          const db = getDB()
          const transaction = await createTransaction(db, parsed.data)
          return jsonResponse(transaction, 201)
        } catch {
          return errorResponse('Failed to create transaction', 500)
        }
      },
    },
  },
})
