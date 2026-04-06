import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

/**
 * getMondayOfCurrentWeek — returns the ISO date string (YYYY-MM-DD) for
 * the Monday of the current week. Duplicated in dashboard/page.tsx and
 * this-week/page.tsx; centralised here so page files can import it when ready.
 */
export function getMondayOfCurrentWeek(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

/**
 * BOOKING_ADVANCE_DAYS — number of days before a class that booking opens.
 * Used in app/api/bookings/route.ts (enforced server-side) and
 * components/booking/class-slot.tsx (UI feedback only).
 */
export const BOOKING_ADVANCE_DAYS = 2

/**
 * DAYS — full week ordered Monday–Sunday.
 * Used in schedule/page.tsx and prompts.ts.
 */
export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/**
 * TIMEZONES — supported timezone list, duplicated across signup and settings pages.
 * Page components can import from here when they are refactored.
 */
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Australia/Sydney',
] as const
