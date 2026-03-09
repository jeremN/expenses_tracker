import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { deleteInvestmentSnapshot } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/investments/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid snapshot ID')
          }

          const db = getDB()
          await deleteInvestmentSnapshot(db, id)
          return jsonResponse({ success: true })
        } catch {
          return errorResponse('Failed to delete investment snapshot', 500)
        }
      },
    },
  },
})
