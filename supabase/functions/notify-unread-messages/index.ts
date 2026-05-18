// Scheduled job: finds messages sent by Setlix admins to clients that are
// still unread after 2 days, sends the client a reminder email, and marks
// reminder_email_sent_at so we don't email them again.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PORTAL_URL = 'https://www.setlix.pt/portal/messages'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Fetch unread messages older than 2 days with no reminder yet
  const { data: messages, error: mErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('read', false)
    .is('reminder_email_sent_at', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(500)

  if (mErr) {
    console.error('Failed to load messages', mErr)
    return new Response(JSON.stringify({ error: mErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Load relevant conversations to find client_id + subject
  const convIds = Array.from(new Set(messages.map((m) => m.conversation_id)))
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, client_id, subject')
    .in('id', convIds)
  const convMap = new Map((conversations || []).map((c) => [c.id, c]))

  // Filter: only messages NOT sent by the client (i.e., sent by admin/Setlix)
  const adminMessages = messages.filter((m) => {
    const conv = convMap.get(m.conversation_id)
    return conv && m.sender_id !== conv.client_id
  })

  // 3. Group by client profile (client_id from conversation) — one email per client
  type Grouped = {
    clientProfileId: string
    messages: typeof messages
    latestSubject: string | null
    latestPreview: string
  }
  const byClient = new Map<string, Grouped>()
  for (const m of adminMessages) {
    const conv = convMap.get(m.conversation_id)!
    const existing = byClient.get(conv.client_id)
    if (existing) {
      existing.messages.push(m)
      // Keep the most recent message preview/subject
      if (new Date(m.created_at) > new Date(existing.messages[0].created_at)) {
        existing.latestSubject = conv.subject
        existing.latestPreview = m.body.slice(0, 200)
      }
    } else {
      byClient.set(conv.client_id, {
        clientProfileId: conv.client_id,
        messages: [m],
        latestSubject: conv.subject,
        latestPreview: m.body.slice(0, 200),
      })
    }
  }

  // 4. Load profiles + emails for each client
  const clientProfileIds = Array.from(byClient.keys())
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, full_name')
    .in('id', clientProfileIds)

  let sent = 0
  const sentMessageIds: string[] = []

  for (const profile of profiles || []) {
    const group = byClient.get(profile.id)
    if (!group) continue

    // Look up the user's email from auth
    const { data: userData, error: uErr } = await supabase.auth.admin.getUserById(profile.user_id)
    if (uErr || !userData?.user?.email) {
      console.error('No email for profile', profile.id, uErr)
      continue
    }
    const recipientEmail = userData.user.email
    const displayName = profile.first_name || profile.full_name || null

    // Use the earliest unread message id as idempotency anchor — stable per client batch
    const anchorId = group.messages.map((m) => m.id).sort()[0]

    const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'unread-message-reminder',
        recipientEmail,
        idempotencyKey: `unread-msg-reminder-${anchorId}`,
        templateData: {
          name: displayName,
          subject: group.latestSubject,
          preview: group.latestPreview,
          portalUrl: PORTAL_URL,
          unreadCount: group.messages.length,
        },
      },
    })

    if (sendErr) {
      console.error('Failed to send reminder to', recipientEmail, sendErr)
      continue
    }

    sent += 1
    for (const m of group.messages) sentMessageIds.push(m.id)
  }

  // 5. Mark messages as reminder-sent
  if (sentMessageIds.length > 0) {
    const { error: updErr } = await supabase
      .from('messages')
      .update({ reminder_email_sent_at: new Date().toISOString() })
      .in('id', sentMessageIds)
    if (updErr) console.error('Failed to mark reminder_email_sent_at', updErr)
  }

  return new Response(
    JSON.stringify({ processed: messages.length, clientsNotified: sent, messagesMarked: sentMessageIds.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
