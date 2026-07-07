import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { getNetWorthTotals, getAccounts } from '@tracker/db'
import { jsonResponse } from '~/server/api-helpers'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/net-worth')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/net-worth', async () => {
        const db = getDB()
        const [totals, accounts] = await Promise.all([
          getNetWorthTotals(db),
          getAccounts(db),
        ])
        return jsonResponse({
          totalAssets: totals.totalAssets,
          totalLiabilities: totals.totalLiabilities,
          netWorth: totals.totalAssets - totals.totalLiabilities,
          accounts,
        })
      }),
    },
  },
})
