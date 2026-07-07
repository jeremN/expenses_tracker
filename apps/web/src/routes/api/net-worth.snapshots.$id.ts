import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { deleteNetWorthSnapshot } from '@tracker/db'
import { assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/net-worth/snapshots/$id')({
  server: {
    handlers: {
      DELETE: withAuthApiHandler('api:DELETE /api/net-worth/snapshots/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid snapshot ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteNetWorthSnapshot(db, id), 'Snapshot not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
