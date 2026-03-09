import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getMonthlySummary, getCategoryBreakdown } from '@tracker/db'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const type = url.searchParams.get('type')

          if (type === 'monthly-summary') {
            const year = url.searchParams.get('year')
            if (!year) {
              return errorResponse('year query parameter is required')
            }
            const db = getDB()
            const result = await getMonthlySummary(db, year)
            return jsonResponse(result.results ?? [])
          }

          if (type === 'category-breakdown') {
            const month = url.searchParams.get('month')
            if (!month) {
              return errorResponse('month query parameter is required')
            }
            const db = getDB()
            const result = await getCategoryBreakdown(db, month)
            return jsonResponse(result.results ?? [])
          }

          return errorResponse(
            'Invalid type parameter. Use "monthly-summary" or "category-breakdown".',
          )
        } catch {
          return errorResponse('Failed to fetch stats', 500)
        }
      },
    },
  },
})
