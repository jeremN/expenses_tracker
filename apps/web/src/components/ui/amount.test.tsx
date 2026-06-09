// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Amount } from './amount'

// Deterministic money formatter so assertions don't depend on Intl/locale.
vi.mock('~/lib/format', () => ({
  useFormat: () => ({ formatMoney: (c: number) => `$${(c / 100).toFixed(2)}` }),
}))

describe('Amount', () => {
  it('income tone: leading + and income color', () => {
    render(<Amount cents={1234} tone="income" />)
    const el = screen.getByText('+$12.34')
    expect(el).toHaveClass('text-income')
  })

  it('expense tone: leading − (U+2212) and expense color', () => {
    render(<Amount cents={500} tone="expense" />)
    const el = screen.getByText('−$5.00')
    expect(el).toHaveClass('text-expense')
  })

  it('signed tone derives sign and color from the value', () => {
    const { rerender } = render(<Amount cents={100} tone="signed" />)
    expect(screen.getByText('+$1.00')).toHaveClass('text-income')
    rerender(<Amount cents={-100} tone="signed" />)
    expect(screen.getByText('−$1.00')).toHaveClass('text-expense')
  })

  it('neutral tone shows no sign and no tone color', () => {
    render(<Amount cents={1000} tone="neutral" />)
    const el = screen.getByText('$10.00')
    expect(el).not.toHaveClass('text-income')
    expect(el).not.toHaveClass('text-expense')
  })

  it('explicit sign=false suppresses the sign but keeps the tone color', () => {
    render(<Amount cents={1000} tone="income" sign={false} />)
    // No leading '+', but income color still applies — sign controls only the prefix.
    const el = screen.getByText('$10.00')
    expect(el).toHaveClass('text-income')
  })
})
