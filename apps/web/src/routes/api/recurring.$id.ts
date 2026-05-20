import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { updateRecurringRule, deleteRecurringRule } from '@tracker/db'
import { updateRecurringRuleSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/recurring/$id')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/recurring/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid recurring rule ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        const rule = await db.query.recurringRules.findFirst({
          where: (rules, { eq }) => eq(rules.id, id),
        })
        if (!rule) {
          return errorResponse('Recurring rule not found', 404, 'NOT_FOUND')
        }
        return jsonResponse(rule)
      }),
      PUT: withApiHandler('api:PUT /api/recurring/$id', async ({ request, params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid recurring rule ID', 400, 'INVALID_ID')
        }
        const body = await request.json()
        const parsed = updateRecurringRuleSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const rule = await updateRecurringRule(db, id, parsed.data)
        if (!rule) {
          return errorResponse('Recurring rule not found', 404, 'NOT_FOUND')
        }
        return jsonResponse(rule)
      }),
      DELETE: withApiHandler('api:DELETE /api/recurring/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid recurring rule ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        const rule = await deleteRecurringRule(db, id)
        if (!rule) {
          return errorResponse('Recurring rule not found', 404, 'NOT_FOUND')
        }
        return jsonResponse({ success: true })
      }),
    },
  },
})
