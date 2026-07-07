import type { Account, NetWorthSnapshot, AccountValuationEntry } from '@tracker/shared'

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

export interface ValuationWithChange extends AccountValuationEntry {
  change: number | null
}

/**
 * Annotate each valuation with its change from the chronologically previous
 * (older) one. Rows arrive newest-first, so row i is compared to row i+1; the
 * oldest row has no predecessor and gets null.
 */
export function withValuationDeltas(valuations: AccountValuationEntry[]): ValuationWithChange[] {
  return valuations.map((v, i) => ({
    ...v,
    change: i < valuations.length - 1 ? v.value - valuations[i + 1].value : null,
  }))
}
