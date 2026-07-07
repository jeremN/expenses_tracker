// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Account } from '@tracker/shared'
import { TransferForm } from './transfer-form'

vi.mock('~/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
vi.mock('~/i18n/use-zod-resolver', () => ({ useZodResolver: () => undefined }))

const acct = (id: number, name: string): Account => ({
  id, name, kind: 'asset', type: 'checking', valuation: 'manual', currentValue: 0,
  institution: null, color: null, icon: null, isActive: true,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
})

describe('TransferForm swap button', () => {
  it('swaps the from and to account selections', async () => {
    const user = userEvent.setup()
    render(<TransferForm accounts={[acct(1, 'Alpha'), acct(2, 'Beta')]} onSubmit={() => {}} />)

    // Defaults: from = first manual account, to = second.
    const combos = screen.getAllByRole('combobox')
    expect(combos[0]).toHaveTextContent('Alpha')
    expect(combos[1]).toHaveTextContent('Beta')

    await user.click(screen.getByRole('button', { name: 'transfers.swap' }))

    expect(combos[0]).toHaveTextContent('Beta')
    expect(combos[1]).toHaveTextContent('Alpha')
  })
})
