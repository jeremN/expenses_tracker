import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getNetWorthSnapshots, getNetWorthTotals, upsertNetWorthSnapshot } from '@tracker/db'
import { createNetWorthSnapshotSchema } from '@tracker/shared'
import { jsonResponse, errorResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/net-worth/snapshots')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/net-worth/snapshots', async ({ request }) => {
        const url = new URL(request.url)
        const from = url.searchParams.get('from') ?? undefined
        const to = url.searchParams.get('to') ?? undefined
        const db = getDB()
        return jsonResponse(await getNetWorthSnapshots(db, { from, to }))
      }),
      POST: withAuthApiHandler('api:POST /api/net-worth/snapshots', async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        const parsed = createNetWorthSnapshotSchema.safeParse(body)
        if (!parsed.success) {
          return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION')
        }
        const db = getDB()
        // Totals are computed server-side from the current accounts — the client
        // never supplies them, so a snapshot always reflects real state.
        const totals = await getNetWorthTotals(db)
        const netWorth = totals.totalAssets - totals.totalLiabilities
        const snapshot = await upsertNetWorthSnapshot(db, {
          date: parsed.data.date ?? new Date().toISOString().slice(0, 10),
          totalAssets: totals.totalAssets,
          totalLiabilities: totals.totalLiabilities,
          netWorth,
          note: parsed.data.note,
        })
        // Upsert (per-day), so 200 rather than 201.
        return jsonResponse(snapshot)
      }),
    },
  },
})
