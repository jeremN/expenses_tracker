import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getAccounts, createAccount } from '@tracker/db'
import { createAccountSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/accounts')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/accounts', async () => {
        const db = getDB()
        return jsonResponse(await getAccounts(db))
      }),
      POST: withAuthApiHandler('api:POST /api/accounts', async ({ request }) => {
        const body = await request.json()
        const parsed = createAccountSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const account = await createAccount(db, parsed.data)
        return jsonResponse(account, 201)
      }),
    },
  },
})
