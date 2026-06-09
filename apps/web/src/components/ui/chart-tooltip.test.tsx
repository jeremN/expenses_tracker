// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartTooltip } from './chart-tooltip'

describe('ChartTooltip', () => {
  it('renders children with position when visible', () => {
    render(<ChartTooltip visible x={40} y={20}>Hello</ChartTooltip>)
    const tip = screen.getByText('Hello')
    expect(tip).toBeVisible()
    expect(tip).toHaveStyle({ left: '40px', top: '20px' })
  })

  it('is hidden (not rendered) when not visible', () => {
    render(<ChartTooltip visible={false} x={0} y={0}>Hidden</ChartTooltip>)
    expect(screen.queryByText('Hidden')).toBeNull()
  })
})
