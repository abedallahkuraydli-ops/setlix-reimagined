import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const REVOLUT_BASE = 'https://sandbox-merchant.revolut.com'
const REVOLUT_API_VERSION = '2024-09-01'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const rawBody = await req.text()
  const signatureHeader = req.headers.get('Revolut-Signature') || ''
  const timestamp = req.headers.get('Revolut-Request-Timestamp') || ''
  const signingSecret = Deno.env.get('REVOLUT_SANDBOX_WEBHOOK_SECRET')

  if (!signingSecret) {
    console.error('Webhook secret missing')
    return new Response('Server not configured', { status: 500, headers: corsHeaders })
  }

  // Revolut signs: v1.{timestamp}.{rawBody} with HMAC-SHA256, header format "v1=<hex>"
  const ok = await verifySignature(signingSecret, timestamp, rawBody, signatureHeader)
  if (!ok) {
    console.error('Invalid signature', { signatureHeader, timestamp })
    return new Response('Invalid signature', { status: 401, headers: corsHeaders })
  }

  let evt: any
  try { evt = JSON.parse(rawBody) } catch { return new Response('Bad JSON', { status: 400, headers: corsHeaders }) }

  const eventType = evt?.event
  const orderId = evt?.order_id || evt?.data?.id

  console.log('Revolut webhook', eventType, orderId)

  if (!orderId) return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch authoritative order state from Revolut
  const orderRes = await fetch(`${REVOLUT_BASE}/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${Deno.env.get('REVOLUT_SANDBOX_SECRET_KEY')}`,
      'Revolut-Api-Version': REVOLUT_API_VERSION,
    },
  })
  const order = await orderRes.json().catch(() => ({}))
  if (!orderRes.ok) {
    console.error('Order fetch failed', orderRes.status, order)
    return new Response('ok', { headers: corsHeaders })
  }

  const invoiceId = order?.metadata?.invoice_id
  const state = order?.state

  if (!invoiceId) {
    console.warn('No invoice_id in order metadata', orderId)
    return new Response('ok', { headers: corsHeaders })
  }

  const update: Record<string, unknown> = { revolut_state: state }
  if (state === 'completed') {
    update.status = 'paid'
    update.paid_at = new Date().toISOString()
  } else if (state === 'failed' || state === 'cancelled') {
    update.status = 'failed'
  }

  const { error: updErr } = await admin.from('invoices').update(update).eq('id', invoiceId)
  if (updErr) console.error('Invoice update error', updErr)

  // Notify superadmins on payment success
  if (state === 'completed') {
    await admin.rpc('notify_superadmins', {
      _type: 'invoice_paid',
      _title: 'Invoice paid online',
      _body: `Invoice ${invoiceId} was paid via Revolut`,
      _link_path: '/admin/billing',
      _metadata: { invoice_id: invoiceId, order_id: orderId, source: 'revolut' },
    }).catch((e) => console.error('notify error', e))
  }

  return new Response('ok', { headers: corsHeaders })
})

async function verifySignature(secret: string, timestamp: string, body: string, header: string): Promise<boolean> {
  if (!header || !timestamp) return false
  const payload = `v1.${timestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  // header may contain multiple values comma-separated, each "v1=<hex>"
  const provided = header.split(',').map((p) => p.trim().replace(/^v1=/, ''))
  return provided.some((p) => timingSafeEqual(p, hex))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let res = 0
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return res === 0
}
