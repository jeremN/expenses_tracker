import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { updateRecurringRule, deleteRecurringRule } from '@tracker/db'
import { updateRecurringRuleSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/recurring/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid recurring rule ID')
          }

          const db = getDB()
          const rule = await db.query.recurringRules.findFirst({
            where: (rules, { eq }) => eq(rules.id, id),
          })

          if (!rule) {
            return errorResponse('Recurring rule not found', 404)
          }

          return jsonResponse(rule)
        } catch {
          return errorResponse('Failed to fetch recurring rule', 500)
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid recurring rule ID')
          }

          const body = await request.json()
          const parsed = updateRecurringRuleSchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message)
          }

          const db = getDB()
          const rule = await updateRecurringRule(db, id, parsed.data)

          if (!rule) {
            return errorResponse('Recurring rule not found', 404)
          }

          return jsonResponse(rule)
        } catch {
          return errorResponse('Failed to update recurring rule', 500)
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid recurring rule ID')
          }

          const db = getDB()
          const rule = await deleteRecurringRule(db, id)

          if (!rule) {
            return errorResponse('Recurring rule not found', 404)
          }

          return jsonResponse({ success: true })
        } catch {
          return errorResponse('Failed to delete recurring rule', 500)
        }
      },
    },
  },
})
