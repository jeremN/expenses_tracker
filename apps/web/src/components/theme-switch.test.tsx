// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setTheme = vi.fn()
let theme = 'system'
vi.mock('~/components/theme-provider', () => ({
  useTheme: () => ({ theme, setTheme }),
}))
vi.mock('~/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

import { ThemeSwitch } from './theme-switch'

beforeEach(() => {
  setTheme.mockClear()
  theme = 'system'
})

describe('ThemeSwitch', () => {
  it('marks the active mode with aria-pressed', () => {
    render(<ThemeSwitch />)
    expect(
      screen.getByRole('button', { name: /settings.appearance.system/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: /settings.appearance.dark/ }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls setTheme with the chosen mode on click', async () => {
    render(<ThemeSwitch />)
    await userEvent.click(
      screen.getByRole('button', { name: /settings.appearance.dark/ }),
    )
    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
