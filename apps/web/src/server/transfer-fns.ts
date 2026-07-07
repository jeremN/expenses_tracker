import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import { createTransfer, deleteTransfer } from '@tracker/db'
import { createTransferSchema, assertFound, AppError } from '@tracker/shared'
import { withServerFn } from '~/server/logger'

// Shared by the /accounts panel and the dedicated /transfers page.
export const createServerTransfer = createServerFn({ method: 'POST' })
  .inputValidator(createTransferSchema)
  .handler(withServerFn('server-fn:createServerTransfer', async ({ data }) => {
    const result = await createTransfer(getDB(), {
      amount: data.amount,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      note: data.note,
      countAsCashFlow: data.countAsCashFlow,
    })
    if (!result.ok) {
      if (result.reason === 'not_found') throw new AppError('NOT_FOUND', 'Account not found')
      if (result.reason === 'tracked_leg') throw new AppError('VALIDATION', 'Transfers are only allowed on manually-valued accounts')
      throw new AppError('VALIDATION', 'A transfer needs at least one account')
    }
    return result.transfer
  }))

export const deleteServerTransfer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerTransfer', async ({ data }) => {
    assertFound(await deleteTransfer(getDB(), data.id), 'Transfer not found')
    return { success: true }
  }))
