import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategoryBreakdown } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/stats/category-breakdown')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const month = url.searchParams.get('month')

          if (!month) {
            return errorResponse('month query parameter is required')
          }

          const db = getDB()
          const result = await getCategoryBreakdown(db, month)
          return jsonResponse(result.results ?? [])
        } catch {
          return errorResponse('Failed to fetch category breakdown', 500)
        }
      },
    },
  },
})
