import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/supabase-server'

export async function GET(req) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const materia = searchParams.get('materia') || 'geral'

  let conceitosQ = supabase.from('conceitos').select('id, is_seed', { count: 'exact' }).eq('user_id', user.id)
  if (materia !== 'geral') conceitosQ = conceitosQ.eq('materia', materia)
  const { data: conceitos } = await conceitosQ

  const conceitos_count = conceitos?.length || 0
  const has_real_data = (conceitos || []).some(c => !c.is_seed)

  let conexoes_count = 0
  if (conceitos_count > 0) {
    const ids = (conceitos || []).map(c => c.id)
    const { count } = await supabase
      .from('conexoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or(`conceito_a_id.in.(${ids.join(',')}),conceito_b_id.in.(${ids.join(',')})`)
    conexoes_count = count ?? 0
  }

  // Total connections (across all matérias) — used by paywall progress
  const { count: totalConexoes } = await supabase
    .from('conexoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return NextResponse.json({
    conceitos_count,
    conexoes_count,
    has_real_data,
    total_conexoes_user: totalConexoes ?? 0,
  })
}
