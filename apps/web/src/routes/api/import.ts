import { createFileRoute } from '@tanstack/react-router'
import { processImport } from '~/server/import-helpers'
import { errorResponse, jsonResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { transactions, filename } = body

          if (!Array.isArray(transactions) || transactions.length === 0) {
            return errorResponse('No transactions provided')
          }
          if (!filename || typeof filename !== 'string') {
            return errorResponse('Filename is required')
          }

          const result = await processImport({ transactions, filename })
          return jsonResponse(result, 201)
        } catch (error) {
          console.error('Import error:', error)
          return errorResponse('Failed to import transactions', 500)
        }
      },
    },
  },
})
