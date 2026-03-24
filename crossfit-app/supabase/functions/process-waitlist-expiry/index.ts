import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { promoteNextWaitlistMember } from '../_shared/waitlist.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { data: expired } = await supabase.from('bookings')
    .select('id, instance_id, class_instances(starts_at, id)')
    .eq('status', 'pending_confirmation')
    .lt('confirmation_expires_at', new Date().toISOString())

  for (const booking of expired ?? []) {
    await supabase.from('bookings').update({
      status: 'waitlisted',
      confirmation_token: null,
      confirmation_expires_at: null,
    }).eq('id', booking.id)

    const instance = (booking as any).class_instances
    const appUrl = Deno.env.get('APP_URL') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    await promoteNextWaitlistMember(supabase, instance.id, instance.starts_at, appUrl, resendApiKey)
  }

  return new Response('Done', { status: 200 })
})
