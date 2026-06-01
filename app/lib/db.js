import { createBrowserClient } from '@supabase/ssr'
import { normalizeNome } from './acronym'

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

// SECURITY: returns the authenticated user's ID, or null. The previous
// fallback to a legacy localStorage UUID (`pointai_user_id`) was removed
// because it could resolve to a stale id from a prior browser session and
// quietly read another account's rows when auth.getUser() returned null.
// Callers tolerate null: the Supabase query then yields no row and the read
// falls back to localStorage scoped to this browser.
async function resolveUserId() {
  try {
    const { data: { user } } = await getClient().auth.getUser()
    if (user?.id) return user.id
  } catch {}
  return null
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

// Decisão de produto: toda matéria com linha em materias_aluno (criada por
// importação ou manualmente em /notas) vira matéria OFICIAL do aluno — ou
// seja, entra em perfil.materias também. Assim aparece no dashboard, sidebar
// e chat (que leem perfil.materias), não só em /notas.
//
// Dedup case/acento-insensível via normalizeNome. Best-effort: erros são
// logados e não propagados — uma falha aqui não pode derrubar o salvamento
// da nota em si (a matéria já está persistida em materias_aluno).
export async function addMateriaToPerfil(nome) {
  const limpo = (nome || '').trim()
  if (!limpo) return
  const alvo = normalizeNome(limpo)
  const contem = (p) =>
    (p?.materias || '').split(',').map(s => s.trim()).filter(Boolean)
      .some(m => normalizeNome(m) === alvo)

  try {
    // Fast-path: espelho local evita ida à rede quando já está no perfil.
    if (typeof window !== 'undefined') {
      try {
        const local = JSON.parse(localStorage.getItem('pointai_perfil') || 'null')
        if (local && contem(local)) return
      } catch {}
    }

    // Lê o perfil autoritativo (Supabase) antes de escrever, pra não
    // sobrescrever a lista com uma versão local desatualizada.
    const perfil = await getPerfil()
    if (!perfil || contem(perfil)) return

    const lista = (perfil.materias || '').split(',').map(s => s.trim()).filter(Boolean)
    lista.push(limpo)
    await savePerfil({ ...perfil, materias: lista.join(', ') })
  } catch (e) {
    console.warn('[db] addMateriaToPerfil:', e?.message)
  }
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

// ── Notas v2 (N avaliações por matéria — Supabase) ─────────────
// Modelo atual: materias_aluno (1 linha por matéria) + avaliacoes
// (N linhas por matéria, cada uma nome/nota/peso). Substituiu o modelo
// antigo de 3 slots fixos em pointai_notas (saveNotas/getNotas + tabela
// 'notas'), removido na migração de notas (Parte 5).
//
// Diferente das funções legadas: aqui não há fallback para localStorage
// e os erros de escrita são PROPAGADOS (throw), não engolidos — assim a
// UI consegue avisar o usuário quando um salvamento falha.

const DEFAULT_PESO = 1

// SECURITY: id sempre da sessão, nunca do cliente. Lança se não há sessão
// válida — operações de notas exigem usuário autenticado.
async function requireUserId() {
  const userId = await resolveUserId()
  if (!userId) throw new Error('Sessão não encontrada. Faça login novamente.')
  return userId
}

// Lista as matérias do usuário com suas avaliações embutidas (join via FK
// materia_id → materias_aluno). Retorna [] se não houver matérias.
export async function getMaterias() {
  const userId = await requireUserId()
  const { data, error } = await getClient()
    .from('materias_aluno')
    .select('id,nome,faltas,total_aulas,media_aprovacao,avaliacoes(id,nome,nota,peso)')
    .eq('user_id', userId)
    .order('nome', { ascending: true })
  if (error) throw new Error(`Erro ao carregar matérias: ${error.message}`)
  return (data || []).map(m => ({
    id: m.id,
    nome: m.nome,
    faltas: m.faltas,
    total_aulas: m.total_aulas,
    media_aprovacao: m.media_aprovacao,
    avaliacoes: m.avaliacoes || [],
  }))
}

// Cria ou atualiza uma matéria (match por user_id + nome). Campos não
// informados ficam a cargo dos defaults da tabela no insert; no update,
// só sobrescreve o que vier definido.
export async function upsertMateria({ nome, faltas, total_aulas, media_aprovacao } = {}) {
  const userId = await requireUserId()
  if (!nome || !nome.trim()) throw new Error('Nome da matéria é obrigatório.')

  const row = { user_id: userId, nome: nome.trim() }
  if (faltas !== undefined) row.faltas = faltas
  if (total_aulas !== undefined) row.total_aulas = total_aulas
  if (media_aprovacao !== undefined) row.media_aprovacao = media_aprovacao

  const { data, error } = await getClient()
    .from('materias_aluno')
    .upsert(row, { onConflict: 'user_id,nome' })
    .select('id,nome,faltas,total_aulas,media_aprovacao')
    .single()
  if (error) throw new Error(`Erro ao salvar matéria: ${error.message}`)
  // Sincroniza o nome no perfil.materias (matéria oficial) — best-effort,
  // não derruba o salvamento da matéria se a sincronização falhar.
  await addMateriaToPerfil(data.nome)
  return data
}

// Insere uma avaliação na matéria. nota pode ser null (ainda não avaliada);
// peso default 1 quando não informado.
export async function addAvaliacao(materia_id, { nome, nota = null, peso } = {}) {
  const userId = await requireUserId()
  if (!materia_id) throw new Error('materia_id é obrigatório.')
  if (!nome || !nome.trim()) throw new Error('Nome da avaliação é obrigatório.')

  const { data, error } = await getClient()
    .from('avaliacoes')
    .insert({
      user_id: userId,
      materia_id,
      nome: nome.trim(),
      nota: nota === '' ? null : nota,
      peso: peso === undefined || peso === null || peso === '' ? DEFAULT_PESO : peso,
    })
    .select('id,nome,nota,peso')
    .single()
  if (error) throw new Error(`Erro ao adicionar avaliação: ${error.message}`)
  return data
}

// Atualiza uma avaliação. Só altera os campos informados.
export async function updateAvaliacao(id, { nome, nota, peso } = {}) {
  const userId = await requireUserId()
  if (!id) throw new Error('id da avaliação é obrigatório.')

  const patch = {}
  if (nome !== undefined) patch.nome = nome?.trim()
  if (nota !== undefined) patch.nota = nota === '' ? null : nota
  if (peso !== undefined) patch.peso = peso === '' || peso === null ? DEFAULT_PESO : peso
  patch.updated_at = new Date().toISOString()

  const { data, error } = await getClient()
    .from('avaliacoes')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id,nome,nota,peso')
    .single()
  if (error) throw new Error(`Erro ao atualizar avaliação: ${error.message}`)
  return data
}

// Remove uma avaliação.
export async function deleteAvaliacao(id) {
  const userId = await requireUserId()
  if (!id) throw new Error('id da avaliação é obrigatório.')

  const { error } = await getClient()
    .from('avaliacoes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`Erro ao remover avaliação: ${error.message}`)
}

// Helper puro (sem DB): média ponderada Σ(nota×peso)/Σ(peso), considerando
// SÓ avaliações com nota definida (null = ainda não avaliada → ignora).
// Retorna número, ou null se nenhuma avaliação tem nota.
export function calcularMedia(avaliacoes) {
  if (!Array.isArray(avaliacoes)) return null

  let somaPonderada = 0
  let somaPesos = 0
  for (const a of avaliacoes) {
    if (!a || a.nota === null || a.nota === undefined || a.nota === '') continue
    const nota = Number(a.nota)
    if (Number.isNaN(nota)) continue
    const pesoRaw = a.peso
    const peso = pesoRaw === null || pesoRaw === undefined || pesoRaw === ''
      ? DEFAULT_PESO
      : Number(pesoRaw)
    if (Number.isNaN(peso) || peso <= 0) continue
    somaPonderada += nota * peso
    somaPesos += peso
  }
  if (somaPesos === 0) return null
  return somaPonderada / somaPesos
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
