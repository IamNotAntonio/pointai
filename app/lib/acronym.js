/**
 * Build a short acronym from a matéria name for the orbital widget center.
 *
 * Examples:
 *   "Trabalho de Conclusão de Curso" → "TCC"
 *   "Educação Inclusiva"              → "EI"
 *   "Direito Penal"                   → "DP"
 *   "Cálculo"                         → "CAL"
 *   "geral" / "Chat Geral"            → "CG"
 */
const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos',
  'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'a', 'o', 'as', 'os',
])

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Chave canônica de comparação de nomes de matéria: sem acento, minúscula,
// sem espaços nas pontas. Usar para dedupe case/acento-insensível
// (perfil.materias ↔ materias_aluno).
export function normalizeNome(s) {
  return stripAccents(String(s ?? '')).toLowerCase().trim()
}

export function acronym(nome) {
  if (!nome || nome === 'geral' || nome === 'Chat Geral') return 'CG'

  const palavras = String(nome)
    .split(/\s+/)
    .filter(p => p.length > 0 && !STOP_WORDS.has(p.toLowerCase()))

  if (palavras.length === 0) return stripAccents(String(nome)).slice(0, 2).toUpperCase()
  if (palavras.length === 1) return stripAccents(palavras[0]).slice(0, 3).toUpperCase()
  return stripAccents(palavras.slice(0, 3).map(p => p[0]).join('')).toUpperCase()
}
