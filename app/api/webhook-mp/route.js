import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type !== 'preapproval') {
      return NextResponse.json({ ok: true })
    }

    const preapprovalId = data?.id
    if (!preapprovalId) return NextResponse.json({ ok: true })

    const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    if (!mpResp.ok) {
      console.error('[webhook-mp] falha ao buscar preapproval', preapprovalId)
      return NextResponse.json({ erro: 'falha MP' }, { status: 500 })
    }

    const preapproval = await mpResp.json()
    const { status, external_reference, auto_recurring } = preapproval
    const userId = external_reference

    if (!userId || userId === 'anonymous') return NextResponse.json({ ok: true })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.warn('[webhook-mp] SUPABASE_SERVICE_ROLE_KEY não configurado — ignorando update')
      return NextResponse.json({ ok: true })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { persistSession: false } }
    )

    if (status === 'authorized') {
      const freq     = auto_recurring?.frequency     || 1
      const freqType = auto_recurring?.frequency_type || 'months'
      const expira   = new Date()
      if (freqType === 'months') expira.setMonth(expira.getMonth() + freq)

      const { error } = await supabase.from('perfis').update({
        plano: 'pro',
        plano_expira: expira.toISOString(),
      }).eq('user_id', userId)
      if (error) console.error('[webhook-mp] update pro:', error.message)

    } else if (['cancelled', 'paused'].includes(status)) {
      const { error } = await supabase.from('perfis').update({
        plano: 'gratis',
        plano_expira: null,
      }).eq('user_id', userId)
      if (error) console.error('[webhook-mp] update gratis:', error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook-mp]', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// MP pings GET to validate webhook URL during setup
export async function GET() {
  return NextResponse.json({ ok: true })
}
