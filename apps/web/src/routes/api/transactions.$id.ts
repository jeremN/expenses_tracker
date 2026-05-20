import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getTransactionById, updateTransaction, deleteTransaction } from '@tracker/db'
import { updateTransactionSchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/transactions/$id')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/transactions/$id', async ({ params }) => {
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
      PUT: withAuthApiHandler('api:PUT /api/transactions/$id', async ({ request, params }) => {
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
        const transaction = assertFound(await updateTransaction(db, id, parsed.data), 'Transaction not found')
        return jsonResponse(transaction)
      }),
      DELETE: withAuthApiHandler('api:DELETE /api/transactions/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid transaction ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteTransaction(db, id), 'Transaction not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
