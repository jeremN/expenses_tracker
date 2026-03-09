import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/transactions')({
  component: () => <div className="text-2xl font-bold">Transactions</div>,
})
