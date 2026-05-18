import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getInvestmentSnapshotById, deleteInvestmentSnapshot } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/investments/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try {
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
        } catch {
          return errorResponse('Failed to delete investment snapshot', 500, 'INTERNAL')
        }
      },
    },
  },
})
