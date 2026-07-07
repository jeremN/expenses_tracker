// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Account, AssetTransfer } from '@tracker/shared'
import { TransferList } from './transfer-list'

vi.mock('~/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
vi.mock('~/lib/format', () => ({
  useFormat: () => ({ formatMoney: (c: number) => `$${(c / 100).toFixed(2)}` }),
}))

const acct = (id: number, name: string): Account => ({
  id, name, kind: 'asset', type: 'checking', valuation: 'manual', currentValue: 0,
  institution: null, color: null, icon: null, isActive: true,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
})

const transfer = (over: Partial<AssetTransfer>): AssetTransfer => ({
  id: 1, date: '2026-07-01', fromAccountId: 1, toAccountId: 2, amount: 5000,
  note: null, transactionId: null, createdAt: '2026-07-01', ...over,
})

describe('TransferList', () => {
  it('resolves account names and labels a missing leg as external', () => {
    render(
      <TransferList
        transfers={[transfer({ id: 1, fromAccountId: 1, toAccountId: null })]}
        accounts={[acct(1, 'Alpha')]}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    // null leg -> external label
    expect(screen.getByText('transfers.external')).toBeInTheDocument()
  })

  it('labels an unknown account id as external', () => {
    render(
      <TransferList
        transfers={[transfer({ fromAccountId: 999, toAccountId: 1 })]}
        accounts={[acct(1, 'Alpha')]}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('transfers.external')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('shows the cash-flow tag only when the transfer booked a transaction', () => {
    const { rerender } = render(
      <TransferList transfers={[transfer({ transactionId: null })]} accounts={[acct(1, 'A'), acct(2, 'B')]} onDelete={() => {}} />,
    )
    expect(screen.queryByText('transfers.cashFlowTag')).not.toBeInTheDocument()
    rerender(
      <TransferList transfers={[transfer({ transactionId: 77 })]} accounts={[acct(1, 'A'), acct(2, 'B')]} onDelete={() => {}} />,
    )
    expect(screen.getByText('transfers.cashFlowTag')).toBeInTheDocument()
  })

  it('calls onDelete with the transfer id', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(
      <TransferList transfers={[transfer({ id: 42 })]} accounts={[acct(1, 'A'), acct(2, 'B')]} onDelete={onDelete} />,
    )
    await user.click(screen.getByRole('button', { name: 'transfers.delete' }))
    expect(onDelete).toHaveBeenCalledWith(42)
  })
})
