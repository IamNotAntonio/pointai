const KEY        = 'pointai_plano'
const CACHE_TS_KEY = 'pointai_plano_ts'
const CACHE_TTL  = 60 * 60 * 1000 // 1 hora

function ler() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function salvar(data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

function isDevPro() {
  try { return localStorage.getItem('pointai_dev_pro') === 'true' } catch { return false }
}

// Busca o plano do Supabase e atualiza o cache local
export async function fetchPlano() {
  if (typeof window === 'undefined') return 'gratis'
  if (isDevPro()) return 'pro'

  // Usa cache se ainda válido
  try {
    const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0)
    if (ts && Date.now() - ts < CACHE_TTL) {
      return ler().plano || 'gratis'
    }
  } catch {}

  try {
    const { getPlanoFromDB } = await import('./db')
    const resultado = await getPlanoFromDB()
    if (resultado?.plano) {
      salvar({ ...ler(), plano: resultado.plano })
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
      return resultado.plano
    }
  } catch (e) {
    console.warn('[plano] fetchPlano offline:', e.message)
  }

  return ler().plano || 'gratis'
}

// Marca Pro localmente (otimista — webhook/ativar confirma no Supabase)
export function setProLocal() {
  salvar({ ...ler(), plano: 'pro' })
  if (typeof window !== 'undefined') {
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
  }
}

// Invalida o cache para forçar refetch no próximo fetchPlano()
export function invalidarCachePlano() {
  if (typeof window !== 'undefined') localStorage.removeItem(CACHE_TS_KEY)
}

export function getPlanInfo() {
  const data  = ler()
  const hoje  = new Date().toDateString()
  const plano = isDevPro() ? 'pro' : (data.plano || 'gratis')
  const mensagensHoje = data.ultimoReset === hoje ? (data.mensagensHoje || 0) : 0
  const limite = plano === 'pro' ? Infinity : 20
  return { plano, mensagensHoje, limite }
}

export function incrementarMensagem() {
  const hoje = new Date().toDateString()
  const data = ler()
  const base = data.ultimoReset === hoje ? (data.mensagensHoje || 0) : 0
  const novo = { ...data, mensagensHoje: base + 1, ultimoReset: hoje }
  salvar(novo)
  return novo.mensagensHoje
}

export function isPro() {
  return isDevPro() || ler().plano === 'pro'
}

export function resetarContadorDiario() {
  const data = ler()
  const hoje = new Date().toDateString()
  if (data.ultimoReset !== hoje) salvar({ ...data, mensagensHoje: 0, ultimoReset: hoje })
}
