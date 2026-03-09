import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/stats')({
  component: () => <div className="text-2xl font-bold">Stats</div>,
})
