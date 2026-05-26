import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const LIVE_KEY = Deno.env.get('REVOLUT_SECRET_KEY')
const REVOLUT_BASE = LIVE_KEY ? 'https://merchant.revolut.com' : 'https://sandbox-merchant.revolut.com'
const REVOLUT_API_VERSION = '2024-09-01'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claimsData.claims.sub

    const body = await req.json().catch(() => ({}))
    const orderId = body?.order_id
    const invoiceId = body?.invoice_id
    if (!orderId || !invoiceId) return json({ error: 'order_id and invoice_id required' }, 400)

    const secretKey = LIVE_KEY || Deno.env.get('REVOLUT_SANDBOX_SECRET_KEY')
    if (!secretKey) return json({ error: 'Payment provider not configured' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the invoice belongs to the requesting user
    const { data: invoice } = await admin
      .from('invoices')
      .select('id, client_id, revolut_order_id')
      .eq('id', invoiceId)
      .maybeSingle()
    if (!invoice) return json({ error: 'Invoice not found' }, 404)

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!profile || profile.id !== invoice.client_id) return json({ error: 'Forbidden' }, 403)

    if (invoice.revolut_order_id && invoice.revolut_order_id !== orderId) {
      return json({ error: 'Order does not match invoice' }, 400)
    }

    // Fetch authoritative state from Revolut
    const orderRes = await fetch(`${REVOLUT_BASE}/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    })
    const order = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok) {
      console.error('Order fetch failed', orderRes.status, order)
      return json({ error: 'Could not verify payment' }, 502)
    }

    const state = order?.state
    const metaInvoiceId = order?.metadata?.invoice_id
    if (metaInvoiceId && metaInvoiceId !== invoiceId) {
      return json({ error: 'Order metadata mismatch' }, 400)
    }

    const update: Record<string, unknown> = { revolut_state: state }
    if (state === 'completed') {
      update.status = 'paid'
      update.paid_at = new Date().toISOString()
    } else if (state === 'failed' || state === 'cancelled') {
      update.status = 'failed'
    }
    await admin.from('invoices').update(update).eq('id', invoiceId)

    if (state === 'completed') {
      await admin.rpc('notify_superadmins', {
        _type: 'invoice_paid',
        _title: 'Invoice paid online',
        _body: `Invoice ${invoiceId} was paid via Revolut`,
        _link_path: '/admin/billing',
        _metadata: { invoice_id: invoiceId, order_id: orderId, source: 'revolut' },
      }).catch((e) => console.error('notify error', e))
    }

    return json({ state, paid: state === 'completed' })
  } catch (e) {
    console.error('revolut-confirm-order error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
