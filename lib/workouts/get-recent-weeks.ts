import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecentWeek } from '@/lib/types'

export async function getRecentWeeks(
  supabase: SupabaseClient,
  gymId: string,
  limit = 4
): Promise<RecentWeek[]> {
  const { data } = await supabase
    .from('workout_weeks')
    .select('week_start, workouts')
    .eq('gym_id', gymId)
    .eq('status', 'published')
    .is('archived_at', null)
    .order('week_start', { ascending: false })
    .limit(limit)
  return ((data || []) as RecentWeek[]).reverse() // oldest first
}
