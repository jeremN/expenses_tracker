import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategoryById, updateCategory, deleteCategory } from '@tracker/db'
import { updateCategorySchema, assertFound } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/categories/$id')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/categories/$id', async ({ params }) => {
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
      }),
      PUT: withAuthApiHandler('api:PUT /api/categories/$id', async ({ request, params }) => {
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
        const category = assertFound(await updateCategory(db, id, parsed.data), 'Category not found')
        return jsonResponse(category)
      }),
      DELETE: withAuthApiHandler('api:DELETE /api/categories/$id', async ({ params }) => {
        const id = Number(params.id)
        if (Number.isNaN(id)) {
          return errorResponse('Invalid category ID', 400, 'INVALID_ID')
        }
        const db = getDB()
        assertFound(await deleteCategory(db, id), 'Category not found')
        return jsonResponse({ success: true })
      }),
    },
  },
})
