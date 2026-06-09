import { describe, it, expect, vi } from 'vitest'
import { deleteCategory, transactions, recurringRules, categories, budgets } from '@tracker/db'

/**
 * Build a fluent fake-db that records every call into a flat list of
 * { op, table } entries so tests can assert the right tables were touched
 * in the right order. Each chain method returns the same recorder.
 */
function makeRecordingDb() {
  const log: Array<{ op: 'update' | 'delete'; table: unknown; setArgs?: unknown }> = []
  const setSpy = vi.fn()
  const whereSpy = vi.fn().mockResolvedValue(undefined)

  return {
    db: {
      update: (table: unknown) => {
        const entry: { op: 'update'; table: unknown; setArgs?: unknown } = { op: 'update', table }
        log.push(entry)
        return {
          set: (args: unknown) => {
            setSpy(args)
            entry.setArgs = args
            return { where: whereSpy }
          },
        }
      },
      delete: (table: unknown) => {
        log.push({ op: 'delete', table })
        // deleteCategory now uses .where(...).returning().get() so the
        // caller can detect a no-match. Return a chain that resolves
        // to undefined (simulating "row not found") — the existing
        // assertions don't depend on the return value.
        return {
          where: (...args: unknown[]) => {
            whereSpy(...args)
            return {
              returning: () => ({ get: () => undefined }),
            }
          },
        }
      },
    } as any,
    log,
    setSpy,
    whereSpy,
  }
}

describe('deleteCategory (I1 regression)', () => {
  it('nulls categoryId on transactions AND recurring_rules before deleting the category', async () => {
    const { db, log, setSpy } = makeRecordingDb()

    await deleteCategory(db, 42)

    // Four operations in this exact order:
    //   1. update transactions     set categoryId = null
    //   2. update recurring_rules   set categoryId = null  ← the I1 fix
    //   3. delete from budgets      (the category's monthly budget)
    //   4. delete from categories
    expect(log).toHaveLength(4)
    expect(log[0]).toMatchObject({ op: 'update', table: transactions })
    expect(log[1]).toMatchObject({ op: 'update', table: recurringRules })
    expect(log[2]).toMatchObject({ op: 'delete', table: budgets })
    expect(log[3]).toMatchObject({ op: 'delete', table: categories })

    // Both update calls set categoryId to null (not some other field).
    expect(setSpy).toHaveBeenCalledTimes(2)
    expect(setSpy).toHaveBeenNthCalledWith(1, { categoryId: null })
    expect(setSpy).toHaveBeenNthCalledWith(2, { categoryId: null })
  })

  it('does not delete the category before clearing the FKs (avoids FK violation)', async () => {
    // Even if D1 had FKs enforced, the updates must come first.
    const { db, log } = makeRecordingDb()

    await deleteCategory(db, 1)

    const deleteIndex = log.findIndex((e) => e.op === 'delete')
    const updateIndexes = log
      .map((e, i) => (e.op === 'update' ? i : -1))
      .filter((i) => i >= 0)

    for (const ui of updateIndexes) {
      expect(ui).toBeLessThan(deleteIndex)
    }
  })
})
