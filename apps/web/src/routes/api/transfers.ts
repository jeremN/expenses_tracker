import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getTransfers, createTransfer } from '@tracker/db'
import { createTransferSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/transfers')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/transfers', async ({ request }) => {
        const url = new URL(request.url)
        const rawLimit = url.searchParams.get('limit')
        const limit = rawLimit ? Number(rawLimit) : undefined
        if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
          return errorResponse('limit must be a positive integer', 400, 'BAD_QUERY')
        }
        const db = getDB()
        return jsonResponse(await getTransfers(db, limit))
      }),
      POST: withAuthApiHandler('api:POST /api/transfers', async ({ request }) => {
        const body = await request.json()
        const parsed = createTransferSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const result = await createTransfer(db, {
          amount: parsed.data.amount,
          date: parsed.data.date ?? new Date().toISOString().slice(0, 10),
          fromAccountId: parsed.data.fromAccountId,
          toAccountId: parsed.data.toAccountId,
          note: parsed.data.note,
        })
        if (!result.ok) {
          if (result.reason === 'not_found') {
            return errorResponse(`Account ${result.accountId} not found`, 404, 'NOT_FOUND')
          }
          if (result.reason === 'tracked_leg') {
            return errorResponse('Transfers are only allowed on manually-valued accounts', 400, 'VALIDATION')
          }
          return errorResponse('A transfer needs at least one account', 400, 'VALIDATION')
        }
        return jsonResponse(result.transfer, 201)
      }),
    },
  },
})
