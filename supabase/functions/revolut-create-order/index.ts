import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const REVOLUT_BASE = 'https://sandbox-merchant.revolut.com'
const REVOLUT_API_VERSION = '2024-09-01'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

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
    const invoiceId = body?.invoice_id
    if (!invoiceId || typeof invoiceId !== 'string') {
      return json({ error: 'invoice_id required' }, 400)
    }

    const secretKey = Deno.env.get('REVOLUT_SANDBOX_SECRET_KEY')
    if (!secretKey) return json({ error: 'Payment provider not configured' }, 500)

    // Service-role client to read invoice + verify ownership
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: invoice, error: invErr } = await admin
      .from('invoices')
      .select('id, client_id, amount_cents, currency, description, status, revolut_order_id, revolut_order_token, revolut_state')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invErr || !invoice) return json({ error: 'Invoice not found' }, 404)
    if (invoice.status === 'paid') return json({ error: 'Invoice already paid' }, 409)

    // Verify the invoice belongs to the requesting user
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!profile || profile.id !== invoice.client_id) {
      return json({ error: 'Forbidden' }, 403)
    }

    // Reuse existing pending order if still valid
    if (invoice.revolut_order_id && invoice.revolut_order_token &&
        invoice.revolut_state && ['pending', 'processing', 'authorised'].includes(invoice.revolut_state)) {
      return json({
        order_id: invoice.revolut_order_id,
        token: invoice.revolut_order_token,
        environment: 'sandbox',
      })
    }

    // Create new order
    const orderRes = await fetch(`${REVOLUT_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      body: JSON.stringify({
        amount: invoice.amount_cents,
        currency: invoice.currency || 'EUR',
        description: invoice.description?.slice(0, 1024) || `Invoice ${invoice.id}`,
        capture_mode: 'automatic',
        metadata: { invoice_id: invoice.id, client_id: invoice.client_id },
      }),
    })

    const orderJson = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok) {
      console.error('Revolut order error', orderRes.status, orderJson)
      return json({ error: 'Failed to create payment order', detail: orderJson }, 502)
    }

    const orderId = orderJson.id
    const token = orderJson.token
    const state = orderJson.state

    await admin
      .from('invoices')
      .update({
        revolut_order_id: orderId,
        revolut_order_token: token,
        revolut_environment: 'sandbox',
        revolut_state: state,
      })
      .eq('id', invoice.id)

    return json({ order_id: orderId, token, environment: 'sandbox' })
  } catch (e) {
    console.error('revolut-create-order error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
