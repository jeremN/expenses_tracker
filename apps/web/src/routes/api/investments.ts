import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getInvestmentSnapshots, createInvestmentSnapshot } from '@tracker/db'
import { createInvestmentSnapshotSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/investments')({
  server: {
    handlers: {
      GET: withApiHandler('api:GET /api/investments', async ({ request }) => {
        const url = new URL(request.url)
        const from = url.searchParams.get('from') ?? undefined
        const to = url.searchParams.get('to') ?? undefined
        const db = getDB()
        const snapshots = await getInvestmentSnapshots(db, { from, to })
        return jsonResponse(snapshots)
      }),
      POST: withApiHandler('api:POST /api/investments', async ({ request }) => {
        const body = await request.json()
        const parsed = createInvestmentSnapshotSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        const snapshot = await createInvestmentSnapshot(db, parsed.data)
        return jsonResponse(snapshot, 201)
      }),
    },
  },
})
