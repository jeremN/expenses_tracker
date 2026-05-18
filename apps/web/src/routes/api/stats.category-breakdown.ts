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

          if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return errorResponse('month must be YYYY-MM format (e.g., 2026-01)', 400, 'BAD_QUERY')
          }

          const db = getDB()
          const result = await getCategoryBreakdown(db, month)
          return jsonResponse(result.results ?? [])
        } catch {
          return errorResponse('Failed to fetch category breakdown', 500, 'INTERNAL')
        }
      },
    },
  },
})
