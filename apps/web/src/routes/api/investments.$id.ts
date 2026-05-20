import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { deleteInvestmentSnapshot } from '@tracker/db'
import { assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/investments/$id')({
  server: {
    handlers: {
      DELETE: withAuthApiHandler('api:DELETE /api/investments/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid snapshot ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteInvestmentSnapshot(db, id), 'Investment snapshot not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
