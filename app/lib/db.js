import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── User identity ──────────────────────────────────────────────
export function getUserId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('pointai_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pointai_user_id', id)
  }
  return id
}

// ── Perfil ─────────────────────────────────────────────────────
export async function savePerfil(perfil) {
  localStorage.setItem('pointai_perfil', JSON.stringify(perfil))
  try {
    const userId = getUserId()
    const { error } = await supabase
      .from('perfis')
      .upsert(
        { user_id: userId, ...perfil },
        { onConflict: 'user_id' }
      )
    if (error) console.warn('[db] savePerfil:', error.message)
  } catch (e) {
    console.warn('[db] savePerfil offline:', e.message)
  }
}

export async function getPerfil() {
  try {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('perfis')
      .select('nome,curso,universidade,semestre,materias,objetivo,tema')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data) {
      localStorage.setItem('pointai_perfil', JSON.stringify(data))
      return data
    }
  } catch (e) {
    console.warn('[db] getPerfil offline:', e.message)
  }
  const local = localStorage.getItem('pointai_perfil')
  return local ? JSON.parse(local) : null
}

// ── Chat ───────────────────────────────────────────────────────
export async function saveChat(materia, mensagens) {
  const paraSalvar = mensagens.map(({ image, hasPdfBtn, pdfRequest, ...m }) => m)
  localStorage.setItem(`chat_${materia}`, JSON.stringify(paraSalvar))
  try {
    const userId = getUserId()
    const { error } = await supabase
      .from('chats')
      .upsert(
        { user_id: userId, materia, mensagens: paraSalvar, atualizado_em: new Date().toISOString() },
        { onConflict: 'user_id,materia' }
      )
    if (error) console.warn('[db] saveChat:', error.message)
  } catch (e) {
    console.warn('[db] saveChat offline:', e.message)
  }
}

export async function getChat(materia) {
  try {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('chats')
      .select('mensagens')
      .eq('user_id', userId)
      .eq('materia', materia)
      .maybeSingle()
    if (!error && data?.mensagens?.length) {
      localStorage.setItem(`chat_${materia}`, JSON.stringify(data.mensagens))
      return data.mensagens
    }
  } catch (e) {
    console.warn('[db] getChat offline:', e.message)
  }
  const local = localStorage.getItem(`chat_${materia}`)
  return local ? JSON.parse(local) : null
}

// ── Notas ──────────────────────────────────────────────────────
export async function saveNotas(dados) {
  localStorage.setItem('pointai_notas', JSON.stringify(dados))
  try {
    const userId = getUserId()
    const { error } = await supabase
      .from('notas')
      .upsert(
        { user_id: userId, dados, atualizado_em: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.warn('[db] saveNotas:', error.message)
  } catch (e) {
    console.warn('[db] saveNotas offline:', e.message)
  }
}

export async function getNotas() {
  try {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('notas')
      .select('dados')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data?.dados) {
      localStorage.setItem('pointai_notas', JSON.stringify(data.dados))
      return data.dados
    }
  } catch (e) {
    console.warn('[db] getNotas offline:', e.message)
  }
  const local = localStorage.getItem('pointai_notas')
  return local ? JSON.parse(local) : null
}

// ── Eventos ────────────────────────────────────────────────────
export async function saveEvento(evento) {
  try {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        user_id: userId,
        titulo: evento.titulo,
        data: evento.data,
        tipo: evento.tipo,
        materia: evento.materia,
      })
      .select('id,titulo,data,tipo,materia')
      .single()
    if (!error && data) return data
  } catch (e) {
    console.warn('[db] saveEvento offline:', e.message)
  }
  // Fallback: return with local id
  return evento
}

export async function getEventos() {
  try {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('eventos')
      .select('id,titulo,data,tipo,materia')
      .eq('user_id', userId)
      .order('data', { ascending: true })
    if (!error && data) {
      localStorage.setItem('pointai_eventos', JSON.stringify(data))
      return data
    }
  } catch (e) {
    console.warn('[db] getEventos offline:', e.message)
  }
  const local = localStorage.getItem('pointai_eventos')
  return local ? JSON.parse(local) : []
}

export async function deleteEvento(id) {
  try {
    const userId = getUserId()
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.warn('[db] deleteEvento:', error.message)
  } catch (e) {
    console.warn('[db] deleteEvento offline:', e.message)
  }
}

// ── Tópicos ─────────────────────────────────────────────────────
export function getTopicos() {
  if (typeof window === 'undefined') return {}
  const local = localStorage.getItem('pointai_topicos')
  return local ? JSON.parse(local) : {}
}

export function saveTopicos(topicos) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pointai_topicos', JSON.stringify(topicos))
}

export function addTopico(materia, topico) {
  const topicos = getTopicos()
  if (!topicos[materia]) topicos[materia] = []
  if (!topicos[materia].includes(topico)) topicos[materia].push(topico)
  saveTopicos(topicos)
  return { ...topicos }
}

export function removeTopico(materia, topico) {
  const topicos = getTopicos()
  if (!topicos[materia]) return topicos
  topicos[materia] = topicos[materia].filter(t => t !== topico)
  saveTopicos(topicos)
  return { ...topicos }
}

export function getChatKey(materia, topico) {
  return topico ? `${materia}__${topico}` : materia
}
