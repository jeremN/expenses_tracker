import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { updateHolding, deleteHolding } from '@tracker/db'
import { updateHoldingSchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/holdings/$id')({
  server: {
    handlers: {
      PUT: withAuthApiHandler('api:PUT /api/holdings/$id', async ({ request, params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid holding ID', 400, 'INVALID_ID')
        }
        const body = await request.json()
        const parsed = updateHoldingSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const holding = assertFound(await updateHolding(db, id, parsed.data), 'Holding not found')
        return jsonResponse(holding)
      }),
      DELETE: withAuthApiHandler('api:DELETE /api/holdings/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid holding ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteHolding(db, id), 'Holding not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
