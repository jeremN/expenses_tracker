import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategories, createCategory } from '@tracker/db'
import { createCategorySchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDB()
          const categories = await getCategories(db)
          return jsonResponse(categories)
        } catch {
          return errorResponse('Failed to fetch categories', 500, 'INTERNAL')
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const parsed = createCategorySchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
          }

          const db = getDB()
          const category = await createCategory(db, parsed.data)
          return jsonResponse(category, 201)
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE')) {
            return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
          }
          return errorResponse('Failed to create category', 500, 'INTERNAL')
        }
      },
    },
  },
})
