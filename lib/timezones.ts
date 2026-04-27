// lib/timezones.ts
// Comprehensive IANA timezone list with friendly labels, grouped by region.
// Used in signup and gym settings so owners worldwide can pick their local time.

export interface TimezoneOption {
  value: string
  label: string
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // North America
  { value: 'America/New_York',      label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',       label: 'Central Time (CT)' },
  { value: 'America/Denver',        label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix',       label: 'Arizona (no DST)' },
  { value: 'America/Los_Angeles',   label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage',     label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu',      label: 'Hawaii (HST)' },
  { value: 'America/Halifax',       label: 'Atlantic Time (AT) — Canada' },
  { value: 'America/St_Johns',      label: 'Newfoundland (NT) — Canada' },
  { value: 'America/Toronto',       label: 'Toronto' },
  { value: 'America/Vancouver',     label: 'Vancouver' },
  { value: 'America/Winnipeg',      label: 'Winnipeg (CT)' },
  // Europe
  { value: 'Europe/London',         label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin',         label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Lisbon',         label: 'Lisbon (WET/WEST)' },
  { value: 'Europe/Paris',          label: 'Paris / Berlin / Madrid (CET)' },
  { value: 'Europe/Amsterdam',      label: 'Amsterdam' },
  { value: 'Europe/Rome',           label: 'Rome' },
  { value: 'Europe/Stockholm',      label: 'Stockholm' },
  { value: 'Europe/Zurich',         label: 'Zurich' },
  { value: 'Europe/Warsaw',         label: 'Warsaw' },
  { value: 'Europe/Vienna',         label: 'Vienna' },
  { value: 'Europe/Athens',         label: 'Athens (EET)' },
  { value: 'Europe/Helsinki',       label: 'Helsinki' },
  { value: 'Europe/Bucharest',      label: 'Bucharest' },
  { value: 'Europe/Kiev',           label: 'Kyiv' },
  { value: 'Europe/Moscow',         label: 'Moscow (MSK)' },
  // Middle East & Africa
  { value: 'Asia/Dubai',            label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh',           label: 'Riyadh (AST)' },
  { value: 'Asia/Jerusalem',        label: 'Tel Aviv / Jerusalem' },
  { value: 'Africa/Johannesburg',   label: 'Johannesburg (SAST)' },
  { value: 'Africa/Cairo',          label: 'Cairo (EET)' },
  { value: 'Africa/Nairobi',        label: 'Nairobi (EAT)' },
  { value: 'Africa/Lagos',          label: 'Lagos (WAT)' },
  // Asia-Pacific
  { value: 'Asia/Kolkata',          label: 'India (IST)' },
  { value: 'Asia/Colombo',          label: 'Sri Lanka (SLST)' },
  { value: 'Asia/Dhaka',            label: 'Dhaka (BST)' },
  { value: 'Asia/Bangkok',          label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore',        label: 'Singapore (SGT)' },
  { value: 'Asia/Kuala_Lumpur',     label: 'Kuala Lumpur' },
  { value: 'Asia/Jakarta',          label: 'Jakarta (WIB)' },
  { value: 'Asia/Hong_Kong',        label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai',         label: 'Beijing / Shanghai (CST)' },
  { value: 'Asia/Taipei',           label: 'Taipei' },
  { value: 'Asia/Seoul',            label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo',            label: 'Tokyo (JST)' },
  { value: 'Australia/Perth',       label: 'Perth (AWST)' },
  { value: 'Australia/Darwin',      label: 'Darwin (ACST)' },
  { value: 'Australia/Adelaide',    label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Brisbane',    label: 'Brisbane (AEST, no DST)' },
  { value: 'Australia/Sydney',      label: 'Sydney / Melbourne (AEST)' },
  { value: 'Pacific/Auckland',      label: 'Auckland (NZST)' },
  { value: 'Pacific/Fiji',          label: 'Fiji (FJT)' },
  // South America
  { value: 'America/Sao_Paulo',     label: 'São Paulo (BRT)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/Santiago',      label: 'Santiago (CLT)' },
  { value: 'America/Lima',          label: 'Lima (PET)' },
  { value: 'America/Bogota',        label: 'Bogotá (COT)' },
  { value: 'America/Caracas',       label: 'Caracas (VET)' },
  { value: 'America/Mexico_City',   label: 'Mexico City (CST/CDT)' },
]
