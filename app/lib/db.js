import { createBrowserClient } from '@supabase/ssr'

// Lazy singleton — avoids SSR instantiation
let _client = null
function getClient() {
  if (typeof window === 'undefined') return null
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _client
}

// ── User identity ──────────────────────────────────────────────
// Legacy fallback UUID — kept for backward-compat (onboarding calls it)
export function getUserId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('pointai_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('pointai_user_id', id)
  }
  return id
}

// Returns the authenticated user's ID; falls back to the local UUID
async function resolveUserId() {
  try {
    const { data: { user } } = await getClient().auth.getUser()
    if (user?.id) return user.id
  } catch {}
  return getUserId()
}

// ── Auth helpers ───────────────────────────────────────────────
export async function getSession() {
  try {
    const { data: { session } } = await getClient().auth.getSession()
    return session
  } catch {
    return null
  }
}

export async function getUser() {
  try {
    const { data: { user } } = await getClient().auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function signOut() {
  // Race Supabase signOut against a 3s timeout — never block the UI if the
  // network call hangs. We always run the local cleanup below regardless.
  try {
    const client = getClient()
    if (client) {
      await Promise.race([
        client.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ])
    }
  } catch (e) {
    console.warn('Supabase signOut failed:', e)
  }

  if (typeof window !== 'undefined') {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
      keys.forEach(k => localStorage.removeItem(k))
      sessionStorage.clear()
      // Wipe Supabase auth cookies (sb-*-auth-token). On signOut failure these
      // can linger and resurrect a stale session on the next login.
      document.cookie.split(';').forEach(c => {
        const name = c.trim().split('=')[0]
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      })
    } catch {}
  }
}

// ── Perfil ─────────────────────────────────────────────────────
export async function savePerfil(perfil) {
  localStorage.setItem('pointai_perfil', JSON.stringify(perfil))
  try {
    const userId = await resolveUserId()
    const { error } = await getClient()
      .from('perfis')
      .upsert({ user_id: userId, ...perfil }, { onConflict: 'user_id' })
    if (error) console.warn('[db] savePerfil:', error.message)
  } catch (e) {
    console.warn('[db] savePerfil offline:', e.message)
  }
}

export async function getPerfil() {
  try {
    const userId = await resolveUserId()
    const { data, error } = await getClient()
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
    const userId = await resolveUserId()
    const { error } = await getClient()
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
    const userId = await resolveUserId()
    const { data, error } = await getClient()
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
    const userId = await resolveUserId()
    const { error } = await getClient()
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
    const userId = await resolveUserId()
    const { data, error } = await getClient()
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
    const userId = await resolveUserId()
    const { data, error } = await getClient()
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
  return evento
}

export async function getEventos() {
  try {
    const userId = await resolveUserId()
    const { data, error } = await getClient()
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
    const userId = await resolveUserId()
    const { error } = await getClient()
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

// ── Plano ──────────────────────────────────────────────────────
export async function getPlanoFromDB() {
  try {
    const userId = await resolveUserId()
    const { data, error } = await getClient()
      .from('perfis')
      .select('plano,plano_expira')
      .eq('user_id', userId)
      .maybeSingle()
    if (!error && data?.plano) return data
  } catch (e) {
    console.warn('[db] getPlano offline:', e.message)
  }
  return null
}

export async function updatePlano(plano, planoExpira = null) {
  try {
    const userId = await resolveUserId()
    const { error } = await getClient()
      .from('perfis')
      .update({ plano, plano_expira: planoExpira })
      .eq('user_id', userId)
    if (error) console.warn('[db] updatePlano:', error.message)
  } catch (e) {
    console.warn('[db] updatePlano offline:', e.message)
  }
}

// ── Resumo do aluno (cross-material memory) ────────────────────
export function getResumoAluno() {
  if (typeof window === 'undefined') return null
  try {
    const perfil = JSON.parse(localStorage.getItem('pointai_perfil') || '{}')
    const materias = (perfil.materias || '').split(',').map(m => m.trim()).filter(Boolean)
    if (!materias.length) return null

    const ultimosTemas = []
    for (const m of materias) {
      try {
        const raw = localStorage.getItem(`chat_${m}`)
        if (!raw) continue
        const msgs = JSON.parse(raw)
        if (!Array.isArray(msgs) || msgs.length < 2) continue
        msgs.filter(msg => msg.role === 'user').slice(-4).forEach(msg => {
          if (msg.content?.length > 5)
            ultimosTemas.push({ materia: m, tema: msg.content.slice(0, 120) })
        })
      } catch {}
    }

    return {
      materias,
      ultimosTemas: ultimosTemas.slice(-15),
      temDados: ultimosTemas.length > 0,
    }
  } catch { return null }
}

// ── Resumo (long memory) ────────────────────────────────────────
export async function saveResumo(chatKey, resumo) {
  localStorage.setItem(`resumo_${chatKey}`, resumo)
  try {
    const userId = await resolveUserId()
    const { error } = await getClient().from('chats').upsert(
      { user_id: userId, materia: chatKey, resumo, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id,materia' }
    )
    if (error) console.warn('[db] saveResumo:', error.message)
  } catch (e) {
    console.warn('[db] saveResumo offline:', e.message)
  }
}

export async function getResumo(chatKey) {
  try {
    const userId = await resolveUserId()
    const { data, error } = await getClient()
      .from('chats')
      .select('resumo')
      .eq('user_id', userId)
      .eq('materia', chatKey)
      .maybeSingle()
    if (!error && data?.resumo) {
      localStorage.setItem(`resumo_${chatKey}`, data.resumo)
      return data.resumo
    }
  } catch (e) {
    console.warn('[db] getResumo offline:', e.message)
  }
  return localStorage.getItem(`resumo_${chatKey}`) || null
}
