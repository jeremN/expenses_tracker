import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategoryBreakdown } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/stats/category-breakdown')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/stats/category-breakdown', async ({ request }) => {
        const url = new URL(request.url)
        const month = url.searchParams.get('month')
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
          return errorResponse('month must be YYYY-MM format (e.g., 2026-01)', 400, 'BAD_QUERY')
        }
        const db = getDB()
        const result = await getCategoryBreakdown(db, month)
        return jsonResponse(result.results ?? [])
      }),
    },
  },
})
