import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { reconcileAccount } from '@tracker/db'
import { reconcileAccountSchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/accounts/$id/reconcile')({
  server: {
    handlers: {
      POST: withAuthApiHandler('api:POST /api/accounts/$id/reconcile', async ({ request, params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid account ID', 400, 'INVALID_ID')
        }
        const body = await request.json()
        const parsed = reconcileAccountSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const result = await reconcileAccount(db, id, {
          value: parsed.data.value,
          date: parsed.data.date ?? new Date().toISOString().slice(0, 10),
          note: parsed.data.note,
        })
        assertFound(result, 'Account not found')
        return jsonResponse(result)
      }),
    },
  },
})
