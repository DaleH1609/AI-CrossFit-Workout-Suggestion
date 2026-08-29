import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

/**
 * Monday of the current week as YYYY-MM-DD, in the viewer's local timezone.
 *
 * The date is formatted from local components rather than via toISOString().
 * toISOString() converts to UTC first, so at any local time earlier than the
 * UTC offset it rolls the date back a day: in Ireland at 00:26 it returned
 * 2026-08-23 when the local Monday was 2026-08-24, and the owner was shown
 * last week's programme. The window is one hour per day at UTC+1 and grows
 * with the offset.
 */
export function getMondayOfCurrentWeek(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return toLocalISODate(monday)
}

/** YYYY-MM-DD from local date parts. Never use toISOString() for a calendar date. */
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
