import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getDB } from '~/server/db'
import { getTransactions, createTransaction } from '@tracker/db'
import { createTransactionSchema, transactionTypeSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

const transactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  category: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: transactionTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
})

export const Route = createFileRoute('/api/transactions')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/transactions', async ({ request }) => {
        const url = new URL(request.url)
        const parsed = transactionsQuerySchema.safeParse({
          month: url.searchParams.get('month') ?? undefined,
          category: url.searchParams.get('category') ?? undefined,
          type: url.searchParams.get('type') ?? undefined,
          search: url.searchParams.get('search') ?? undefined,
          limit: url.searchParams.get('limit') ?? undefined,
          offset: url.searchParams.get('offset') ?? undefined,
        })
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const rows = await getTransactions(db, {
          month: parsed.data.month,
          categoryId: parsed.data.category,
          type: parsed.data.type,
          search: parsed.data.search,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        })
        const transactions = rows.map((row) => ({
          ...row.transactions,
          category: row.categories,
        }))
        return jsonResponse(transactions)
      }),
      POST: withAuthApiHandler('api:POST /api/transactions', async ({ request }) => {
        const body = await request.json()
        const parsed = createTransactionSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const transaction = await createTransaction(db, parsed.data)
        return jsonResponse(transaction, 201)
      }),
    },
  },
})
