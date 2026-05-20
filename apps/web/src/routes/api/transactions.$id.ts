import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getTransactionById, updateTransaction, deleteTransaction } from '@tracker/db'
import { updateTransactionSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/transactions/$id')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/transactions/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid transaction ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        const row = await getTransactionById(db, id)
        if (!row) {
          return errorResponse('Transaction not found', 404, 'NOT_FOUND')
        }
        const transaction = { ...row.transactions, category: row.categories }
        return jsonResponse(transaction)
      }),
      PUT: withApiHandler('api:PUT /api/transactions/$id', async ({ request, params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid transaction ID', 400, 'INVALID_ID')
        }
        const body = await request.json()
        const parsed = updateTransactionSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const existing = await getTransactionById(db, id)
        if (!existing) {
          return errorResponse('Transaction not found', 404, 'NOT_FOUND')
        }
        const transaction = await updateTransaction(db, id, parsed.data)
        return jsonResponse(transaction)
      }),
      DELETE: withApiHandler('api:DELETE /api/transactions/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid transaction ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        const existing = await getTransactionById(db, id)
        if (!existing) {
          return errorResponse('Transaction not found', 404, 'NOT_FOUND')
        }
        await deleteTransaction(db, id)
        return jsonResponse({ success: true })
      }),
    },
  },
})
