import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getCategories } from '@tracker/db'
import { withServerFn } from '~/server/logger'

export const getServerCategories = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getServerCategories', async () => {
    const db = getDB()
    return getCategories(db)
  }),
)
