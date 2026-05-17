import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request) {
  try {
    const { preapprovalId } = await request.json()
    if (!preapprovalId) {
      return NextResponse.json({ erro: 'preapprovalId obrigatório' }, { status: 400 })
    }

    // Verify with Mercado Pago
    const mpResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    if (!mpResp.ok) {
      return NextResponse.json({ erro: 'Falha ao verificar pagamento' }, { status: 502 })
    }

    const preapproval = await mpResp.json()
    const { status, auto_recurring, external_reference } = preapproval

    if (status !== 'authorized') {
      return NextResponse.json({ status, autorizado: false })
    }

    // Calculate expiry from billing cycle
    const freq     = auto_recurring?.frequency     || 1
    const freqType = auto_recurring?.frequency_type || 'months'
    const expira   = new Date()
    if (freqType === 'months') expira.setMonth(expira.getMonth() + freq)

    // Try to update via authenticated user session (cookies)
    let atualizado = false
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll:  ()   => cookieStore.getAll(),
            setAll: (cs)  => cs.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
          },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { error } = await supabase.from('perfis').update({
          plano: 'pro',
          plano_expira: expira.toISOString(),
        }).eq('user_id', user.id)
        if (!error) atualizado = true
      }
    } catch (e) {
      console.warn('[ativar] session update failed:', e.message)
    }

    // Fallback: service role key + external_reference
    if (!atualizado && external_reference && external_reference !== 'anonymous') {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceKey,
            { auth: { persistSession: false } }
          )
          await admin.from('perfis').update({
            plano: 'pro',
            plano_expira: expira.toISOString(),
          }).eq('user_id', external_reference)
          atualizado = true
        } catch (e) {
          console.warn('[ativar] admin update failed:', e.message)
        }
      }
    }

    return NextResponse.json({ status, autorizado: true, atualizado })
  } catch (e) {
    console.error('[ativar]', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
