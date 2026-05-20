import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getRecurringRules, createRecurringRule } from '@tracker/db'
import { createRecurringRuleSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/recurring')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/recurring', async () => {
        const db = getDB()
        const rules = await getRecurringRules(db)
        return jsonResponse(rules)
      }),
      POST: withApiHandler('api:POST /api/recurring', async ({ request }) => {
        const body = await request.json()
        const parsed = createRecurringRuleSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const rule = await createRecurringRule(db, parsed.data)
        return jsonResponse(rule, 201)
      }),
    },
  },
})
