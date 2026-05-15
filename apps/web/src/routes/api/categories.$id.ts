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
            return errorResponse('Invalid category ID')
          }

          const db = getDB()
          const category = await getCategoryById(db, id)

          if (!category) {
            return errorResponse('Category not found', 404)
          }

          return jsonResponse(category)
        } catch {
          return errorResponse('Failed to fetch category', 500)
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid category ID')
          }

          const body = await request.json()
          const parsed = updateCategorySchema.safeParse(body)

          if (!parsed.success) {
            return errorResponse(parsed.error.issues[0].message)
          }

          const db = getDB()
          const existing = await getCategoryById(db, id)
          if (!existing) {
            return errorResponse('Category not found', 404)
          }

          const category = await updateCategory(db, id, parsed.data)
          return jsonResponse(category)
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE')) {
            return errorResponse('A category with this name already exists', 409)
          }
          return errorResponse('Failed to update category', 500)
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = Number(params.id)
          if (Number.isNaN(id)) {
            return errorResponse('Invalid category ID')
          }

          const db = getDB()
          const existing = await getCategoryById(db, id)
          if (!existing) {
            return errorResponse('Category not found', 404)
          }

          await deleteCategory(db, id)
          return jsonResponse({ success: true })
        } catch {
          return errorResponse('Failed to delete category', 500)
        }
      },
    },
  },
})
