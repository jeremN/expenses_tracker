import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getCategories } from '@tracker/db'

export const getServerCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDB()
  return getCategories(db)
})
