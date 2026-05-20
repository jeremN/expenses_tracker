import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getMonthlySummary } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/stats/monthly-summary')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/stats/monthly-summary', async ({ request }) => {
        const url = new URL(request.url)
        const year = url.searchParams.get('year')
        if (!year || !/^\d{4}$/.test(year)) {
          return errorResponse('year must be a 4-digit year (e.g., 2026)', 400, 'BAD_QUERY')
        }
        const db = getDB()
        const result = await getMonthlySummary(db, year)
        return jsonResponse(result.results ?? [])
      }),
    },
  },
})
