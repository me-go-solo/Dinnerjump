import type { CourseType } from '@/lib/types'

/* ── Status Colors ── */

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  registration_open: 'bg-green-50 text-green-700',
  confirmed: 'bg-blue-50 text-blue-700',
  closed: 'bg-yellow-50 text-yellow-700',
  active: 'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-700',
}

export function statusToKey(status: string): string {
  return (
    'status' +
    status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  )
}

/* ── Course Colors ── */

export const COURSE_COLORS: Record<CourseType, { border: string; bg: string; header: string }> = {
  appetizer: { border: 'border-orange-200', bg: 'bg-orange-50/60', header: 'bg-orange-100 text-orange-800' },
  main: { border: 'border-red-200', bg: 'bg-red-50/60', header: 'bg-red-100 text-red-800' },
  dessert: { border: 'border-purple-200', bg: 'bg-purple-50/60', header: 'bg-purple-100 text-purple-800' },
}

/* ── Button Classes ── */

export const btn = {
  /** Primary CTA — black background, premium feel */
  primary:
    'inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
  /** Secondary — bordered, subtle */
  secondary:
    'inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-50',
  /** Small action — compact */
  small:
    'inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-40',
  /** Inline save — compact primary */
  save:
    'inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50',
  /** Ghost — borderless subtle */
  ghost:
    'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-[0.98]',
  /** Link-style text button */
  link: 'text-sm text-gray-500 hover:text-gray-900 underline-offset-4 hover:underline',
} as const

/* ── Card Classes ── */

export const card = {
  /** Standard card container */
  base: 'rounded-xl border border-gray-200 p-5',
  /** Accent card with thick border */
  accent: 'rounded-xl border-2 border-black p-5',
  /** Interactive card with hover */
  interactive: 'rounded-xl border border-gray-200 p-5 transition-all hover:border-gray-400 hover:shadow-sm',
} as const

/* ── Input Classes ── */

export const input = {
  base: 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black',
  small: 'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black',
} as const

/* ── Feedback Classes ── */

export const feedback = {
  error: 'rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700',
  warning: 'rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-700',
  success: 'rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700',
} as const

/* ── Badge Classes ── */

export const badge = {
  base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
} as const

/* ── Layout Classes ── */

export const layout = {
  /** Page container — consistent max-width and padding */
  page: 'mx-auto w-full max-w-3xl px-4 py-8',
  /** Section heading */
  heading: 'text-2xl font-semibold tracking-tight',
  /** Section subheading */
  subheading: 'text-sm text-gray-500',
  /** Divider */
  divider: 'border-t border-gray-100',
} as const
