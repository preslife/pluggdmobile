import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'GBP', locale = 'en-GB') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount ?? 0);
  } catch {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount ?? 0);
  }
}
