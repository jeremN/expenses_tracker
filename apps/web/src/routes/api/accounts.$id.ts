import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { updateAccount, deleteAccount } from '@tracker/db'
import { updateAccountSchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/accounts/$id')({
  server: {
    handlers: {
      PUT: withAuthApiHandler('api:PUT /api/accounts/$id', async ({ request, params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid account ID', 400, 'INVALID_ID')
        }
        const body = await request.json()
        const parsed = updateAccountSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const account = assertFound(await updateAccount(db, id, parsed.data), 'Account not found')
        return jsonResponse(account)
      }),
      DELETE: withAuthApiHandler('api:DELETE /api/accounts/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid account ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteAccount(db, id), 'Account not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
