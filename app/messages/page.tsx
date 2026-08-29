import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

const OwnerMessages = dynamic(() => import('@/app/(owner)/messages/_owner-page'))
const MemberMessages = dynamic(() => import('@/app/(member)/messages/_member-page'))

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'owner') {
    return <OwnerMessages />
  }
  return <MemberMessages />
}
