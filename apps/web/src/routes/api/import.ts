import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AppError } from '@tracker/shared'
import { processImport } from '~/server/import-helpers'
import { errorResponse, jsonResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

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
      POST: withAuthApiHandler('api:POST /api/import', async ({ request }) => {
        const body = await request.json()
        const parsed = importPayloadSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        try {
          const result = await processImport(parsed.data)
          return jsonResponse(result, 201)
        } catch (e) {
          // Re-throw as the specific code so the wrapper preserves the
          // IMPORT_FAILED contract (logger picks up the message text).
          if (e instanceof AppError) throw e
          throw new AppError(
            'IMPORT_FAILED',
            e instanceof Error ? `Import failed: ${e.message}` : 'Failed to import transactions',
          )
        }
      }),
    },
  },
})
