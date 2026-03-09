import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/investments')({
  component: () => <div className="text-2xl font-bold">Investments</div>,
})
