import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategoryById, updateCategory, deleteCategory } from '@tracker/db'
import { updateCategorySchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/categories/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid category ID', 400, 'INVALID_ID')
          }

          const db = getDB()
          const category = await getCategoryById(db, id)

          if (!category) {
            return errorResponse('Category not found', 404, 'NOT_FOUND')
          }

          return jsonResponse(category)
        } catch {
          return errorResponse('Failed to fetch category', 500, 'INTERNAL')
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid category ID', 400, 'INVALID_ID')
          }

          const body = await request.json()
          const parsed = updateCategorySchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
          }

          const db = getDB()
          const existing = await getCategoryById(db, id)
          if (!existing) {
            return errorResponse('Category not found', 404, 'NOT_FOUND')
          }

          const category = await updateCategory(db, id, parsed.data)
          return jsonResponse(category)
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE')) {
            return errorResponse('A category with this name already exists', 409, 'DUPLICATE_NAME')
          }
          return errorResponse('Failed to update category', 500, 'INTERNAL')
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid category ID', 400, 'INVALID_ID')
          }

          const db = getDB()
          const existing = await getCategoryById(db, id)
          if (!existing) {
            return errorResponse('Category not found', 404, 'NOT_FOUND')
          }

          await deleteCategory(db, id)
          return jsonResponse({ success: true })
        } catch {
          return errorResponse('Failed to delete category', 500, 'INTERNAL')
        }
      },
    },
  },
})
