export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { WodCardClient } from './wod-card-client'
import type { WorkoutDay } from '@/lib/types'

interface UserRow { gym_id: string }
interface WeekData { workouts: WorkoutDay[] }
interface GymRow { name: string }

function getMondayOfCurrentWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default async function WodCardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userDataRaw } = await supabase.from('users').select('gym_id').eq('id', user.id).single()
  const userData = userDataRaw as unknown as UserRow | null
  if (!userData) return null

  const weekStart = getMondayOfCurrentWeek()
  const [{ data: weekData }, { data: gymRaw }] = await Promise.all([
    supabase.from('workout_weeks').select('workouts')
      .eq('gym_id', userData.gym_id).eq('status', 'published').is('archived_at', null)
      .eq('week_start', weekStart).maybeSingle(),
    supabase.from('gyms').select('name').eq('id', userData.gym_id).single(),
  ])

  const workouts: WorkoutDay[] = (weekData as unknown as WeekData | null)?.workouts ?? []
  const gymName = (gymRaw as unknown as GymRow | null)?.name ?? 'My Box'

  // Today's workout
  const todayIndex = new Date().getDay() // 0=Sun
  const dayMap = [6, 0, 1, 2, 3, 4, 5] // map JS day to Mon-based index
  const todayWorkout = workouts[dayMap[todayIndex]] ?? null

  return <WodCardClient workout={todayWorkout} gymName={gymName} />
}
