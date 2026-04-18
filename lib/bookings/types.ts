// lib/bookings/types.ts
// Shared booking-related types used by multiple API route handlers and helpers.
// Keep this file free of Supabase-client imports so it can be consumed by
// server routes, client components, and tests without pulling in runtime deps.

/**
 * A booking row joined to its class instance. Used by endpoints that need to
 * inspect the start time of the class (e.g. to skip past bookings when
 * cancelling on behalf of a revoked / deleted member).
 */
export interface BookingWithInstance {
  id: string
  instance_id: string
  status: string
  class_instances: { starts_at: string }
}
