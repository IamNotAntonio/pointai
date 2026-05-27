import { NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/supabase-server'

export async function GET(req, { params }) {
  const { id } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: conceito } = await supabase
    .from('conceitos')
    .select('id, nome, descricao_curta, peso, is_seed, materia')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle()

  if (!conceito) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  const { count: conexoesCount } = await supabase
    .from('conexoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or(`conceito_a_id.eq.${id},conceito_b_id.eq.${id}`)

  // Mensagens relacionadas: leitura via localStorage no client (server não vê).
  // O cliente faz o match local — apenas devolve o conceito + count.
  return NextResponse.json({
    ...conceito,
    conexoes_count: conexoesCount ?? 0,
  })
}

export async function DELETE(req, { params }) {
  const { id } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Cascade removes conexões via FK ON DELETE CASCADE.
  const { error } = await supabase
    .from('conceitos')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
