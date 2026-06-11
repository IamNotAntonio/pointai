import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function safeParseSeeds(text) {
  if (!text) return null
  try {
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
    const obj = JSON.parse(cleaned)
    if (!obj || !Array.isArray(obj.conceitos)) return null
    return obj.conceitos
      .filter(c => c && typeof c.nome === 'string')
      .slice(0, 3)
      .map(c => ({
        nome: c.nome.trim().slice(0, 30),
        descricao_curta: typeof c.descricao_curta === 'string' ? c.descricao_curta.trim().slice(0, 120) : '',
      }))
      .filter(c => c.nome.length > 0)
  } catch {
    return null
  }
}

export async function POST(req) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad-json' }, { status: 400 }) }
  const materia = (body?.materia || '').trim()
  if (!materia) return NextResponse.json({ error: 'no-materia' }, { status: 400 })

  // 1. Bail if real concepts already exist for this user+matéria
  const { count: realCount } = await supabase
    .from('conceitos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('materia', materia)
    .eq('is_seed', false)
  if ((realCount ?? 0) > 0) {
    return NextResponse.json({ seeds: [] })
  }

  // 2. Return existing seeds if any
  const { data: existingSeeds } = await supabase
    .from('conceitos')
    .select('id, nome, descricao_curta, peso, is_seed')
    .eq('user_id', user.id)
    .eq('materia', materia)
    .eq('is_seed', true)
  if (existingSeeds && existingSeeds.length > 0) {
    return NextResponse.json({ seeds: existingSeeds })
  }

  // 3. Generate via Haiku
  let raw
  try {
    const resp = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'Você gera conceitos-semente para visualização inicial de mapa de conhecimento. Retorne JSON estrito {"conceitos": [...]} com EXATAMENTE 3 conceitos centrais da disciplina universitária fornecida. Cada conceito: nome (≤30 chars, capitalizado) e descricao_curta (≤120 chars). Não retorne texto fora do JSON.',
      messages: [{ role: 'user', content: `Disciplina: ${materia}` }],
    })
    raw = resp.content?.[0]?.text || ''
  } catch (e) {
    console.warn('[seed] Haiku failed:', e?.message)
    return NextResponse.json({ seeds: [] })
  }

  const seeds = safeParseSeeds(raw)
  if (!seeds || seeds.length < 2) {
    return NextResponse.json({ seeds: [] })
  }

  // 4. Insert seeds
  const rows = seeds.map(s => ({
    user_id: user.id,
    materia,
    nome: s.nome,
    descricao_curta: s.descricao_curta,
    peso: 1,
    is_seed: true,
  }))
  const { data: inserted, error: insErr } = await supabase
    .from('conceitos')
    .insert(rows)
    .select('id, nome, descricao_curta, peso, is_seed')
  if (insErr || !inserted) {
    return NextResponse.json({ seeds: [] })
  }

  // 5. Conexões A-B e B-C com forças DIFERENTES — o layout usa
  // distance ∝ 1/forca; forças iguais formavam um arranjo simétrico.
  if (inserted.length >= 3) {
    const [a, b, c] = inserted
    const pares = [
      { ids: [a.id, b.id].sort(), forca: 2 },
      { ids: [b.id, c.id].sort(), forca: 1 },
    ]
    await supabase.from('conexoes').insert(pares.map(p => ({
      user_id: user.id,
      conceito_a_id: p.ids[0],
      conceito_b_id: p.ids[1],
      forca: p.forca,
    })))
  }

  return NextResponse.json({ seeds: inserted })
}
