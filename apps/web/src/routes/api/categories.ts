import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getCategories, createCategory } from '@tracker/db'
import { createCategorySchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/categories', async () => {
        const db = getDB()
        const categories = await getCategories(db)
        return jsonResponse(categories)
      }),
      POST: withAuthApiHandler('api:POST /api/categories', async ({ request }) => {
        const body = await request.json()
        const parsed = createCategorySchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const category = await createCategory(db, parsed.data)
        return jsonResponse(category, 201)
      }),
    },
  },
})
