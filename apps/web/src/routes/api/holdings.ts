import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getHoldings, createHolding } from '@tracker/db'
import { createHoldingSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/holdings')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/holdings', async ({ request }) => {
        const url = new URL(request.url)
        const accountId = Number(url.searchParams.get('accountId'))
        if (!Number.isInteger(accountId) || accountId <= 0) {
          return errorResponse('accountId query param is required', 400, 'BAD_QUERY')
        }
        const db = getDB()
        return jsonResponse(await getHoldings(db, accountId))
      }),
      POST: withAuthApiHandler('api:POST /api/holdings', async ({ request }) => {
        const body = await request.json()
        const parsed = createHoldingSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const holding = await createHolding(db, parsed.data)
        return jsonResponse(holding, 201)
      }),
    },
  },
})
