// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AccountValuationEntry } from '@tracker/shared'
import { ValuationHistory } from './valuation-history'

vi.mock('~/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
vi.mock('~/lib/format', () => ({
  useFormat: () => ({ formatMoney: (c: number) => `$${(c / 100).toFixed(2)}` }),
}))

const val = (date: string, value: number, id = value): AccountValuationEntry => ({
  id, accountId: 1, date, value, createdAt: 'now',
})

describe('ValuationHistory', () => {
  it('shows an empty message when there are no valuations', () => {
    render(<ValuationHistory valuations={[]} />)
    expect(screen.getByText('accounts.history.empty')).toBeInTheDocument()
  })

  it('lists each recorded balance with a step change (oldest row has none)', () => {
    render(<ValuationHistory valuations={[val('2026-07-01', 31000000), val('2026-05-01', 30500000)]} />)
    expect(screen.getByText('2026-07-01')).toBeInTheDocument()
    expect(screen.getByText('$310000.00')).toBeInTheDocument()
    // +5000.00 step between the two
    expect(screen.getByText('+$5000.00')).toBeInTheDocument()
  })

  it('renders a falling balance with a minus sign', () => {
    render(<ValuationHistory valuations={[val('2026-07-01', 900), val('2026-06-01', 1000)]} />)
    expect(screen.getByText('−$1.00')).toBeInTheDocument() // U+2212
  })
})
