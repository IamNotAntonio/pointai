import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireUser, getUserPlano } from '../../lib/supabase-server'

const CONNECTION_LIMIT_FREE = 500
const SEED_CLEANUP_THRESHOLD = 3

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_STATS = {
  conceitos_criados: 0,
  conceitos_atualizados: 0,
  conexoes_criadas: 0,
  conexoes_atualizadas: 0,
  seeds_removidas: 0,
  limite_pro_atingido: false,
}

function safeParseConceitos(text) {
  if (!text) return null
  try {
    // Sometimes the model wraps in fences; try plain parse first then strip.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
    const obj = JSON.parse(cleaned)
    if (!obj || !Array.isArray(obj.conceitos)) return null
    return obj.conceitos
      .filter(c => c && typeof c.nome === 'string')
      .slice(0, 5)
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
  const stats = { ...EMPTY_STATS }

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad-json', stats }, { status: 400 }) }
  const { userMessage = '', aiResponse = '', materia = 'geral', contextoAnterior = '' } = body || {}

  if (!materia) return NextResponse.json({ error: 'no-materia', stats }, { status: 400 })

  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', stats }, { status: 401 })

  // 1. Extract conceitos via Haiku
  let raw
  try {
    const resp = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'Você extrai conceitos educacionais de turnos de conversação acadêmica. Analise tanto a pergunta do usuário quanto a resposta do assistente. Retorne JSON estrito com array de 1 a 5 conceitos. Cada conceito tem "nome" (curto, ≤30 chars, sem artigo, capitalizado) e "descricao_curta" (≤120 chars). Não retorne texto fora do JSON. Se o turno não contém conceitos educacionais claros, retorne {"conceitos": []}.',
      messages: [{
        role: 'user',
        content: `Matéria: ${materia}\n\nTurno da conversa:\nUsuário: ${userMessage}\n\nAssistente: ${aiResponse}\n\nContexto anterior: ${contextoAnterior}`,
      }],
    })
    raw = resp.content?.[0]?.text || ''
  } catch (e) {
    console.warn('[extrair-conceitos] Haiku failed:', e?.message)
    return NextResponse.json({ error: 'haiku-failed', stats }, { status: 200 })
  }

  const conceitos = safeParseConceitos(raw)
  if (!conceitos) {
    console.warn('[extrair-conceitos] invalid JSON from Haiku:', raw?.slice(0, 200))
    return NextResponse.json({ error: 'invalid-json', stats }, { status: 200 })
  }
  if (conceitos.length === 0) {
    return NextResponse.json({ ...stats }, { status: 200 })
  }

  const processedIds = []

  // 2. Upsert each conceito (lookup case-insensitive by nome+materia)
  for (const c of conceitos) {
    const { data: existing } = await supabase
      .from('conceitos')
      .select('id, peso')
      .eq('user_id', user.id)
      .eq('materia', materia)
      .ilike('nome', c.nome)
      .maybeSingle()

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('conceitos')
        .update({ peso: (existing.peso || 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (!updErr) {
        stats.conceitos_atualizados += 1
        processedIds.push(existing.id)
      }
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('conceitos')
        .insert({
          user_id: user.id,
          materia,
          nome: c.nome,
          descricao_curta: c.descricao_curta,
          peso: 1,
          is_seed: false,
        })
        .select('id')
        .single()
      if (!insErr && inserted?.id) {
        stats.conceitos_criados += 1
        processedIds.push(inserted.id)
      }
    }
  }

  // 3. Connections between all pairs (if 2+ concepts processed)
  if (processedIds.length >= 2) {
    // Plano lookup for PRO gating on new connections
    const plano = await getUserPlano(supabase, user.id)
    const isPro = plano === 'pro'

    let totalConexoesUser = null
    if (!isPro) {
      const { count } = await supabase
        .from('conexoes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      totalConexoesUser = count ?? 0
    }

    for (let i = 0; i < processedIds.length; i++) {
      for (let j = i + 1; j < processedIds.length; j++) {
        // Canonical order so UNIQUE catches reverse pairs
        const [aId, bId] = [processedIds[i], processedIds[j]].sort()

        const { data: existingConx } = await supabase
          .from('conexoes')
          .select('id, forca')
          .eq('user_id', user.id)
          .eq('conceito_a_id', aId)
          .eq('conceito_b_id', bId)
          .maybeSingle()

        if (existingConx?.id) {
          const { error: updErr } = await supabase
            .from('conexoes')
            .update({ forca: (existingConx.forca || 1) + 1 })
            .eq('id', existingConx.id)
          if (!updErr) stats.conexoes_atualizadas += 1
        } else {
          if (!isPro && totalConexoesUser != null && totalConexoesUser >= CONNECTION_LIMIT_FREE) {
            stats.limite_pro_atingido = true
            continue
          }
          const { error: insErr } = await supabase
            .from('conexoes')
            .insert({
              user_id: user.id,
              conceito_a_id: aId,
              conceito_b_id: bId,
              forca: 1,
            })
          if (!insErr) {
            stats.conexoes_criadas += 1
            if (totalConexoesUser != null) totalConexoesUser += 1
          }
        }
      }
    }
  }

  // 4. Seed cleanup once enough real concepts exist for this matéria
  try {
    const { count: realCount } = await supabase
      .from('conceitos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('materia', materia)
      .eq('is_seed', false)

    if ((realCount ?? 0) >= SEED_CLEANUP_THRESHOLD) {
      const { data: removed } = await supabase
        .from('conceitos')
        .delete()
        .eq('user_id', user.id)
        .eq('materia', materia)
        .eq('is_seed', true)
        .select('id')
      stats.seeds_removidas = removed?.length ?? 0
    }
  } catch {}

  return NextResponse.json(stats)
}
