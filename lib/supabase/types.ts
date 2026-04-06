// Auto-generated types — run `supabase gen types typescript --local > lib/supabase/types.ts` after setting up local Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyTable = {
  Row: Record<string, any>
  Insert: Record<string, any>
  Update: Record<string, any>
  Relationships: any[]
}

export type Database = {
  public: {
    Tables: {
      gyms: AnyTable
      users: AnyTable
      style_examples: AnyTable
      workout_weeks: AnyTable
      class_slot_templates: AnyTable
      class_instances: AnyTable
      bookings: AnyTable
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
