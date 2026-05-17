import { NextResponse } from 'next/server'

const PLANOS = {
  mensal: {
    reason: 'Point.AI Pro — Plano Mensal',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 14.90,
      currency_id: 'BRL',
    },
  },
  semestral: {
    reason: 'Point.AI Pro — Plano Semestral',
    auto_recurring: {
      frequency: 6,
      frequency_type: 'months',
      transaction_amount: 59.90,
      currency_id: 'BRL',
    },
  },
}

export async function POST(request) {
  try {
    const { plano = 'mensal', userId, email, nome } = await request.json()

    const config = PLANOS[plano]
    if (!config) {
      return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ erro: 'E-mail obrigatório' }, { status: 400 })
    }

    const proto   = request.headers.get('x-forwarded-proto') || 'http'
    const host    = request.headers.get('host') || 'localhost:3001'
    const baseUrl = `${proto}://${host}`

    const body = {
      ...config,
      payer_email: email,
      external_reference: userId || 'anonymous',
      back_url: `${baseUrl}/assinar/sucesso`,
      notification_url: 'https://pointai-two.vercel.app/api/webhook-mp',
      status: 'pending',
    }

    const resp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    })

    const data = await resp.json()

    if (!resp.ok) {
      console.error('[assinar] MP error:', JSON.stringify(data))
      return NextResponse.json(
        { erro: data.message || 'Erro ao criar assinatura' },
        { status: 500 }
      )
    }

    return NextResponse.json({ init_point: data.init_point, id: data.id })
  } catch (e) {
    console.error('[assinar]', e)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
