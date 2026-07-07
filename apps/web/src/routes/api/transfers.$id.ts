import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { deleteTransfer } from '@tracker/db'
import { assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/transfers/$id')({
  server: {
    handlers: {
      DELETE: withAuthApiHandler('api:DELETE /api/transfers/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid transfer ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteTransfer(db, id), 'Transfer not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
