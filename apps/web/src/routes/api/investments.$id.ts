import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getInvestmentSnapshotById, deleteInvestmentSnapshot } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/investments/$id')({
  server: {
    handlers: {
      DELETE: withApiHandler('api:DELETE /api/investments/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid snapshot ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        const snapshot = await getInvestmentSnapshotById(db, id)
        if (!snapshot) {
          return errorResponse('Investment snapshot not found', 404, 'NOT_FOUND')
        }
        await deleteInvestmentSnapshot(db, id)
        return jsonResponse({ success: true })
      }),
    },
  },
})
