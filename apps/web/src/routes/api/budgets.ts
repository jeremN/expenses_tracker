import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getBudgets, upsertBudget } from '@tracker/db'
import { upsertBudgetSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/budgets')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/budgets', async () => {
        const db = getDB()
        const budgets = await getBudgets(db)
        return jsonResponse(budgets)
      }),
      POST: withAuthApiHandler('api:POST /api/budgets', async ({ request }) => {
        const body = await request.json()
        const parsed = upsertBudgetSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        // Upsert (insert-or-update), so 200 rather than 201.
        const budget = await upsertBudget(db, parsed.data.categoryId, parsed.data.amount)
        return jsonResponse(budget)
      }),
    },
  },
})
