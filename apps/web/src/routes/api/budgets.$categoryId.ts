import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { deleteBudget } from '@tracker/db'
import { assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/budgets/$categoryId')({
  server: {
    handlers: {
      DELETE: withAuthApiHandler('api:DELETE /api/budgets/$categoryId', async ({ params }) => {
        const categoryId = Number(params.categoryId)
        if (Number.isNaN(categoryId)) {
          return errorResponse('Invalid category ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteBudget(db, categoryId), 'Budget not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
