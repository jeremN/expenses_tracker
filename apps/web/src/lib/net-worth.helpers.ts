import type { Account, NetWorthSnapshot } from '@tracker/shared'

export interface AccountGroups {
  assets: Account[]
  liabilities: Account[]
}

/** Split the active accounts into assets and liabilities, each biggest-first. */
export function groupAccountsByKind(accounts: Account[]): AccountGroups {
  const active = accounts.filter((a) => a.isActive)
  const byValueDesc = (a: Account, b: Account) => b.currentValue - a.currentValue
  return {
    assets: active.filter((a) => a.kind === 'asset').sort(byValueDesc),
    liabilities: active.filter((a) => a.kind === 'liability').sort(byValueDesc),
  }
}

/**
 * Change in net worth between the two most recent snapshots. Snapshots arrive
 * date-descending (index 0 newest), so this is snapshots[0] − snapshots[1].
 * Null when there aren't two snapshots to compare.
 */
export function latestNetWorthDelta(snapshots: NetWorthSnapshot[]): number | null {
  if (snapshots.length < 2) return null
  return snapshots[0].netWorth - snapshots[1].netWorth
}
