import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { updateRecurringRule, deleteRecurringRule } from '@tracker/db'
import { updateRecurringRuleSchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/recurring/$id')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/recurring/$id', async ({ params }) => {
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
      PUT: withAuthApiHandler('api:PUT /api/recurring/$id', async ({ request, params }) => {
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
        const rule = assertFound(await updateRecurringRule(db, id, parsed.data), 'Recurring rule not found')
        return jsonResponse(rule)
      }),
      DELETE: withAuthApiHandler('api:DELETE /api/recurring/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid recurring rule ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteRecurringRule(db, id), 'Recurring rule not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
