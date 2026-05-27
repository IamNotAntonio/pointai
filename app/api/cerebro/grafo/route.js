import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/supabase-server'

export async function GET(req) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const materia = searchParams.get('materia') || 'geral'

  let conceitosQ = supabase
    .from('conceitos')
    .select('id, nome, descricao_curta, peso, is_seed, materia')
    .eq('user_id', user.id)
  if (materia !== 'geral') conceitosQ = conceitosQ.eq('materia', materia)

  const { data: conceitos } = await conceitosQ
  const nodes = (conceitos || []).map(c => ({
    id: c.id,
    nome: c.nome,
    descricao_curta: c.descricao_curta,
    peso: c.peso || 1,
    is_seed: !!c.is_seed,
    materia: c.materia,
  }))

  if (nodes.length === 0) {
    return NextResponse.json({ nodes: [], links: [] })
  }

  const idSet = new Set(nodes.map(n => n.id))
  const ids = Array.from(idSet)

  const { data: conexoes } = await supabase
    .from('conexoes')
    .select('conceito_a_id, conceito_b_id, forca')
    .eq('user_id', user.id)
    .in('conceito_a_id', ids)

  const links = (conexoes || [])
    .filter(c => idSet.has(c.conceito_b_id))
    .map(c => ({
      source: c.conceito_a_id,
      target: c.conceito_b_id,
      forca: c.forca || 1,
    }))

  return NextResponse.json({ nodes, links })
}
