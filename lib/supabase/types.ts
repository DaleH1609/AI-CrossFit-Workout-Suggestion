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
      // Core schema (001)
      gyms: AnyTable
      users: AnyTable
      style_examples: AnyTable
      workout_weeks: AnyTable
      class_slot_templates: AnyTable
      class_instances: AnyTable
      bookings: AnyTable
      // Schedule defaults (004)
      gym_schedule_defaults: AnyTable
      // Class types (012)
      class_types: AnyTable
      // Admin audit log (018)
      admin_audit_log: AnyTable
      // Workout scores (028)
      workout_scores: AnyTable
      // Member notes and skills (030)
      member_notes: AnyTable
      skills: AnyTable
      member_skills: AnyTable
      // Class feedback (031)
      class_feedback: AnyTable
      // Gym slug / WOD posts (032)
      wod_posts: AnyTable
      // Drop-in passes and membership pauses (033)
      dropin_passes: AnyTable
      membership_pauses: AnyTable
      // Badges and referrals (034)
      badge_definitions: AnyTable
      member_badges: AnyTable
      referrals: AnyTable
      // Workout edits (035)
      workout_edits: AnyTable
      // Benchmarks and goals (036)
      benchmarks: AnyTable
      benchmark_results: AnyTable
      personal_goals: AnyTable
      // Gym webhooks (037)
      gym_webhooks: AnyTable
      // Push subscriptions (038)
      push_subscriptions: AnyTable
      // Leads (040)
      leads: AnyTable
      // Measurements (042)
      measurements: AnyTable
      // Member onboarding (043)
      member_onboarding: AnyTable
      // Monthly challenges (044)
      monthly_challenges: AnyTable
      challenge_entries: AnyTable
      // Sub requests / coach substitutions (045)
      sub_requests: AnyTable
      // Deletion requests (047)
      deletion_requests: AnyTable
      // Gym owner audit log (048)
      gym_audit_log: AnyTable
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
