import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getRecurringRules, createRecurringRule } from '@tracker/db'
import { createRecurringRuleSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/recurring')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDB()
          const rules = await getRecurringRules(db)
          return jsonResponse(rules)
        } catch {
          return errorResponse('Failed to fetch recurring rules', 500, 'INTERNAL')
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const parsed = createRecurringRuleSchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
          }

          const db = getDB()
          const rule = await createRecurringRule(db, parsed.data)
          return jsonResponse(rule, 201)
        } catch {
          return errorResponse('Failed to create recurring rule', 500, 'INTERNAL')
        }
      },
    },
  },
})
