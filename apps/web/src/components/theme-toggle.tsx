import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTheme } from '~/components/theme-provider'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  function toggle() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
