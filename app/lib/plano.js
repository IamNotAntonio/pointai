const KEY = 'pointai_plano'

function ler() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function salvar(data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function getPlanInfo() {
  const data  = ler()
  const hoje  = new Date().toDateString()
  const plano = data.plano || 'gratis'
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
  return ler().plano === 'pro'
}

export function resetarContadorDiario() {
  const data = ler()
  const hoje = new Date().toDateString()
  if (data.ultimoReset !== hoje) salvar({ ...data, mensagensHoje: 0, ultimoReset: hoje })
}
