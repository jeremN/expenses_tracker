import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function parseToCents(value: string): number {
  return Math.round(parseFloat(value) * 100)
}
