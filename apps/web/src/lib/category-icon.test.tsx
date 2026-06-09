// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CategoryIcon, CATEGORY_ICON_NAMES, isCategoryIconName } from './category-icon'

describe('CategoryIcon', () => {
  it('exposes a non-empty allowlist of names', () => {
    expect(CATEGORY_ICON_NAMES.length).toBeGreaterThan(10)
  })

  it('recognizes allowlisted names and rejects others', () => {
    expect(isCategoryIconName(CATEGORY_ICON_NAMES[0])).toBe(true)
    expect(isCategoryIconName('definitely-not-an-icon')).toBe(false)
    expect(isCategoryIconName('')).toBe(false)
    expect(isCategoryIconName(null)).toBe(false)
  })

  it('renders an svg for a known name and for the fallback', () => {
    const known = render(<CategoryIcon name={CATEGORY_ICON_NAMES[0]} />)
    expect(known.container.querySelector('svg')).not.toBeNull()
    const unknown = render(<CategoryIcon name="nope" />)
    expect(unknown.container.querySelector('svg')).not.toBeNull() // fallback icon
  })
})
