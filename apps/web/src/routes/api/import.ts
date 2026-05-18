import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { processImport } from '~/server/import-helpers'
import { errorResponse, jsonResponse } from '~/server/api-helpers'

const importTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  amount: z.number().int(),
  categoryId: z.number().int().positive().optional(),
})

const importPayloadSchema = z.object({
  transactions: z.array(importTransactionSchema).min(1),
  filename: z.string().min(1),
})

export const Route = createFileRoute('/api/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const parsed = importPayloadSchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
          }

          const result = await processImport(parsed.data)
          return jsonResponse(result, 201)
        } catch (error) {
          console.error('Import error:', error)
          return errorResponse('Failed to import transactions', 500, 'IMPORT_FAILED')
        }
      },
    },
  },
})
