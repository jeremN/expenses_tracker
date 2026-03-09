import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export function parseToCents(value: string): number {
  return Math.round(parseFloat(value) * 100)
}
