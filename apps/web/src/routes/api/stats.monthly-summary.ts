import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getMonthlySummary } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/stats/monthly-summary')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const year = url.searchParams.get('year')

          if (!year) {
            return errorResponse('year query parameter is required')
          }

          const db = getDB()
          const result = await getMonthlySummary(db, year)
          return jsonResponse(result.results ?? [])
        } catch {
          return errorResponse('Failed to fetch monthly summary', 500)
        }
      },
    },
  },
})
