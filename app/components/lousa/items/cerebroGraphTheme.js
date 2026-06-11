// Tema visual do grafo do Cérebro Point — funções puras (sem React).
// Cores por matéria (hash → paleta), tons por peso e raio dos nós.
// Usado pelo nodeCanvasObject e pela legenda em CerebroPointItem.jsx.

// Paleta categórica pensada pro dark: 10 matizes distintos e legíveis.
// O verde da marca (#22c55e) é o primeiro da lista.
export const MATERIA_PALETTE = [
  '#22c55e', // verde (marca)
  '#60a5fa', // azul
  '#f59e0b', // âmbar
  '#a78bfa', // violeta
  '#f472b6', // rosa
  '#2dd4bf', // turquesa
  '#fb923c', // laranja
  '#38bdf8', // céu
  '#e879f9', // fúcsia
  '#f87171', // coral
]

const BRANCO = { r: 255, g: 255, b: 255 }
const PRETO = { r: 9, g: 9, b: 11 } // zinc-950, fundo do app

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export const rgbStr = c => `rgb(${c.r},${c.g},${c.b})`
export const rgbaStr = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`

export function mixRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

// Hash determinístico (djb2) — mesma matéria → mesma cor, sempre.
export function hashMateria(nome) {
  const s = (nome || 'geral').toLowerCase().trim()
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Cor da matéria: paleta de 10 + 3 variantes de tom (30 combinações antes
// de repetir de fato). Variante 0 = base, 1 = mais clara, 2 = mais escura.
const N_VARIANTES = 3
export function corMateriaRgb(nome) {
  const h = hashMateria(nome)
  const base = hexToRgb(MATERIA_PALETTE[h % MATERIA_PALETTE.length])
  const variante = Math.floor(h / MATERIA_PALETTE.length) % N_VARIANTES
  if (variante === 1) return mixRgb(base, BRANCO, 0.16)
  if (variante === 2) return mixRgb(base, PRETO, 0.2)
  return base
}

// Tom por peso (vista de UMA matéria): t em [0,1] — nós fracos escurecem,
// fortes clareiam, sempre dentro do matiz da matéria.
export function tonePorPeso(base, t) {
  const escuro = mixRgb(base, PRETO, 0.45)
  const claro = mixRgb(base, BRANCO, 0.22)
  return mixRgb(escuro, claro, Math.max(0, Math.min(1, t)))
}

// Raio do nó: cresce com a RAIZ do peso (curva suave — nó muito mencionado
// não domina o canvas). Base 6 garante que peso 1 (~8.6px) seja visível e
// clicável confortavelmente. Clamp pra extremos.
export function raioNo(peso) {
  const p = Math.max(1, Math.min(Number(peso) || 1, 64))
  return 6 + 2.6 * Math.sqrt(p)
}
