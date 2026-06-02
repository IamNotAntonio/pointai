'use client'
import { useSearchParams } from 'next/navigation'

/* ─── Materia hook (URL → localStorage → 'geral') ──────────────── */
export function useCurrentMateria() {
  const sp = useSearchParams()
  const urlMateria = sp.get('materia')
  if (urlMateria) return urlMateria
  if (typeof window === 'undefined') return 'geral'
  try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
}

/* ─── Notas helpers ─────────────────────────────────────────────── */
// Modelo NOVO (Parte 3) — fonte de verdade — vindo de db.getMaterias():
//   [{ id, nome, faltas, total_aulas, media_aprovacao, avaliacoes:[{id,nome,nota,peso}] }]
// As views da Bento (NotasCard/Fullscreen, EvolucaoCard) esperam uma lista
// achatada de avaliações { materia, titulo, nota, peso, data, faltas, maxFaltas, meta }.
// Esta função traduz pra essa lista, ignorando avaliações sem nota.
//
// Compat: ainda aceita o modelo ANTIGO em objeto { [materia]: { notas:[...],
// faltas, totalAulas } } caso algum caller legado o passe.
//
// Tolerante a whitespace/acento na comparação da chave.
function normalizeKey(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Modelo NOVO: uma linha de matéria (materias_aluno + avaliacoes embutidas).
function recordsFromMateriaRow(row) {
  if (!row || !Array.isArray(row.avaliacoes)) return []
  const faltas = Number(row.faltas) || 0
  // Limite REAL de faltas = coluna limite_faltas (nullable). NULL = não
  // configurado → maxFaltas null (não inventamos teto via total_aulas*0.25).
  const maxFaltas = row.limite_faltas == null ? null : Number(row.limite_faltas)
  const meta = Number(row.media_aprovacao) || 7
  const out = []
  for (const a of row.avaliacoes) {
    if (!a || a.nota === '' || a.nota == null) continue
    const n = Number(a.nota)
    if (Number.isNaN(n)) continue
    out.push({
      materia: row.nome,
      titulo: (a.nome && String(a.nome).trim()) || 'Avaliação',
      nota: n,
      peso: Number(a.peso ?? 1) || 1,
      data: null,
      faltas,
      maxFaltas,
      meta,
    })
  }
  return out
}

// Modelo ANTIGO (3 slots) — mantido só por compatibilidade. O modelo antigo
// não tem limite de faltas explícito, então maxFaltas fica null (não
// inventamos teto via total*0.25).
function recordsFromEntry(materia, entry) {
  if (!entry || !Array.isArray(entry.notas)) return []
  const faltas = Number(entry.faltas) || 0
  const maxFaltas = null
  const out = []
  entry.notas.forEach((raw, i) => {
    if (raw === '' || raw == null) return
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return
    out.push({
      materia,
      titulo: `Avaliação ${i + 1}`,
      nota: n,
      peso: 1,
      data: null,
      faltas,
      maxFaltas,
      meta: 7,
    })
  })
  return out
}

export function notasDaMateria(notas, materia) {
  if (!notas || !materia) return []

  // Modelo NOVO (Parte 3): array de matérias com avaliações embutidas.
  if (Array.isArray(notas) && notas.some(x => x && Array.isArray(x.avaliacoes))) {
    const rows = notas.filter(x => x && Array.isArray(x.avaliacoes))
    if (materia === 'geral') return rows.flatMap(recordsFromMateriaRow)
    const target = normalizeKey(materia)
    const row = rows.find(r => normalizeKey(r.nome) === target)
    return row ? recordsFromMateriaRow(row) : []
  }

  // Modelo ANTIGO em objeto: { [materia]: { notas:[...], faltas, totalAulas } }
  if (!Array.isArray(notas) && typeof notas === 'object') {
    if (materia === 'geral') {
      return Object.entries(notas).flatMap(([mat, entry]) => recordsFromEntry(mat, entry))
    }
    const target = normalizeKey(materia)
    const matched = Object.keys(notas).find(k => normalizeKey(k) === target)
    return recordsFromEntry(matched || materia, matched ? notas[matched] : null)
  }

  // Legacy flat-array model — kept for safety if any caller still passes one.
  if (!Array.isArray(notas)) return []
  if (materia === 'geral') return notas
  return notas.filter(n => n.materia === materia || n.disciplina === materia)
}

export function mediaPonderada(items) {
  if (!items?.length) return null
  let soma = 0, pesoTotal = 0
  for (const it of items) {
    const nota = Number(it.nota)
    const peso = Number(it.peso ?? 1) || 1
    if (!Number.isNaN(nota)) { soma += nota * peso; pesoTotal += peso }
  }
  return pesoTotal > 0 ? soma / pesoTotal : null
}

export function sortByDate(items, dir = 'desc') {
  return [...(items || [])].sort((a, b) => {
    const ta = new Date(a.data || a.criado_em || 0).getTime() || 0
    const tb = new Date(b.data || b.criado_em || 0).getTime() || 0
    return dir === 'desc' ? tb - ta : ta - tb
  })
}

export function corNota(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return '#71717a'
  if (v >= 7) return '#22c55e'
  if (v >= 5) return '#fbbf24'
  return '#f87171'
}

// Cor pela MESMA regra da tela /notas: verde se média >= meta de aprovação,
// vermelho se abaixo, cinza ("—") sem nota. meta default 7.
export function corNotaMeta(media, meta = 7) {
  if (media == null || Number.isNaN(Number(media))) return '#71717a'
  return Number(media) >= Number(meta ?? 7) ? '#22c55e' : '#dc2626'
}

/* ─── Eventos helpers ───────────────────────────────────────────── */
export function eventosDaMateria(eventos, materia) {
  const all = Array.isArray(eventos) ? eventos : []
  if (materia === 'geral') return all
  return all.filter(e => e.materia === materia || e.disciplina === materia)
}

export function proximosEventos(eventos) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const ts = todayStart.getTime()
  return (eventos || [])
    .map(e => ({ ...e, _ts: new Date(e.data).getTime() }))
    .filter(e => !Number.isNaN(e._ts) && e._ts >= ts)
    .sort((a, b) => a._ts - b._ts)
}

export function deltaDias(ts) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(ts).getTime() - today.getTime()) / 86400000)
}

export function deltaLabel(ts) {
  const d = deltaDias(ts)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d < 14) return `em ${d} dias`
  try {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

/* ─── Fullscreen skeleton ───────────────────────────────────────── */
export function FullscreenSkeleton({ Icon, title, bullets }) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto 0' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: 'rgba(34,197,94,.08)',
        border: '1px solid rgba(34,197,94,.18)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 22,
      }}>
        <Icon size={36} strokeWidth={1.4} style={{ color: '#22c55e' }} />
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.025em', marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 26 }}>
        Detalhamento completo em breve. O que está no roadmap:
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: '#d4d4d8', lineHeight: 1.6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginTop: 9, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProPaywall({ Icon, title, description, bullets, onSeePlans }) {
  return (
    <div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(26,122,74,.14)',
        border: '1px solid rgba(34,197,94,.3)',
        color: '#86efac',
        fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em',
        padding: '4px 10px', borderRadius: 99,
        marginBottom: 14,
      }}>
        PRO
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.02em', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.65, marginBottom: 22 }}>{description}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#d4d4d8', lineHeight: 1.6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', marginTop: 8, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>
      <button onClick={onSeePlans} className="lousa-primary-btn">
        Ver planos
      </button>
    </div>
  )
}

export function openPlansModal() {
  try {
    window.dispatchEvent(new CustomEvent('open-plans-modal'))
  } catch {}
}

export const sharedItemCss = `
  .lousa-dcard{background:#101010;border:1px solid #1a1a1a;border-radius:12px;padding:14px 16px}
  .lousa-dcard-label{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#71717a;margin-bottom:8px}
  .lousa-cta-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(26,122,74,.14);border:1px solid rgba(34,197,94,.3);color:#86efac;font-size:13px;font-weight:600;padding:9px 16px;border-radius:10px;cursor:pointer;font-family:inherit;transition:background .15s}
  .lousa-cta-btn:hover{background:rgba(26,122,74,.22)}
  .lousa-cta-btn:disabled{opacity:.4;cursor:not-allowed}
  .lousa-cta-btn:disabled:hover{background:rgba(26,122,74,.14)}
  .lousa-primary-btn{display:inline-flex;align-items:center;gap:8px;background:#1a7a4a;color:#fff;font-size:14px;font-weight:700;padding:11px 22px;border-radius:10px;border:1px solid rgba(34,197,94,.3);cursor:pointer;font-family:inherit;transition:background .15s,transform .15s,box-shadow .15s;box-shadow:0 0 20px rgba(26,122,74,.18)}
  .lousa-primary-btn:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 28px rgba(26,122,74,.3)}
`

export const fullscreenCss = `
  .lousa-fs-container{padding:24px 32px 40px;max-width:1280px;margin:0 auto;width:100%}
  .lousa-fs-header{margin-bottom:24px}
  .lousa-fs-title{font-size:24px;font-weight:800;letter-spacing:-.025em;color:#f4f4f5;margin-bottom:4px}
  .lousa-fs-title-materia{color:#22c55e;font-weight:700}
  .lousa-fs-subtitle{font-size:13.5px;color:#a1a1aa;line-height:1.5}
  .lousa-fs-stats-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:28px}
  .lousa-fs-stat-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px 18px}
  .lousa-fs-stat-value{font-size:26px;font-weight:800;color:#22c55e;letter-spacing:-.02em;line-height:1;margin-bottom:6px}
  .lousa-fs-stat-value.neutral{color:#f4f4f5}
  .lousa-fs-stat-value.warn{color:#fbbf24}
  .lousa-fs-stat-value.danger{color:#f87171}
  .lousa-fs-stat-label{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a}
  .lousa-fs-stat-sub{font-size:11.5px;color:#71717a;margin-top:6px;line-height:1.4}
  .lousa-fs-tabs{display:flex;gap:2px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:22px;overflow-x:auto;scrollbar-width:none}
  .lousa-fs-tabs::-webkit-scrollbar{display:none}
  .lousa-fs-tab{padding:11px 18px;font-size:13px;font-weight:500;color:#71717a;cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;font-family:inherit;transition:color .15s,border-color .15s;white-space:nowrap}
  .lousa-fs-tab:hover{color:#d4d4d8}
  .lousa-fs-tab.active{color:#22c55e;border-bottom-color:#22c55e;font-weight:600}
  .lousa-fs-table{background:transparent}
  .lousa-fs-table-header{display:grid;grid-template-columns:2fr 1fr 1fr 1.5fr;gap:12px;padding:10px 14px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;border-bottom:1px solid rgba(255,255,255,.05)}
  .lousa-fs-table-row{display:grid;grid-template-columns:2fr 1fr 1fr 1.5fr;gap:12px;padding:14px;border-radius:10px;transition:background .15s;font-size:13.5px;color:#d4d4d8;align-items:center}
  .lousa-fs-table-row:hover{background:rgba(255,255,255,.02)}
  .lousa-fs-empty{text-align:center;padding:48px 20px;color:#71717a}
  .lousa-fs-empty-icon{width:48px;height:48px;margin:0 auto 14px;opacity:.4;color:#52525b}
  .lousa-fs-empty-title{font-size:14.5px;color:#a1a1aa;margin-bottom:6px;font-weight:500}
  .lousa-fs-empty-sub{font-size:12.5px;color:#71717a;line-height:1.5;max-width:320px;margin:0 auto}
  .lousa-fs-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px 22px;margin-bottom:16px}
  .lousa-fs-card-title{font-size:14px;font-weight:700;color:#f4f4f5;margin-bottom:10px;display:flex;align-items:center;gap:8px}
  .lousa-fs-card-body{font-size:13.5px;color:#a1a1aa;line-height:1.6}
  .lousa-fs-prediction{background:linear-gradient(135deg, rgba(34,197,94,.08), rgba(34,197,94,.02));border:1px solid rgba(34,197,94,.18);border-radius:14px;padding:20px 22px;margin-bottom:24px;display:flex;align-items:flex-start;gap:14px}
  .lousa-fs-prediction-icon{flex-shrink:0;color:#22c55e}
  .lousa-fs-prediction-text{font-size:14px;color:#e4e4e7;line-height:1.55}
  .lousa-fs-prediction-text strong{color:#22c55e;font-weight:700}
  .lousa-fs-bar-wrap{height:8px;background:rgba(255,255,255,.04);border-radius:99px;overflow:hidden;margin-top:10px}
  .lousa-fs-bar-fill{height:100%;border-radius:99px;transition:width .6s ease}
  .lousa-fs-disabled-hint{font-size:11px;color:#71717a;margin-top:8px}
  .lousa-fs-locked{background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.08);border-radius:14px;padding:24px;display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
  .lousa-fs-locked-icon{flex-shrink:0;width:42px;height:42px;border-radius:10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.18);display:inline-flex;align-items:center;justify-content:center;color:#22c55e}
  .lousa-fs-locked-title{font-size:14px;font-weight:700;color:#e4e4e7;margin-bottom:6px}
  .lousa-fs-locked-body{font-size:13px;color:#a1a1aa;line-height:1.55}
  .lousa-fs-locked-tag{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fbbf24;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.22);padding:3px 8px;border-radius:99px;margin-top:8px}
  .lousa-fs-chart-wrap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px 16px;margin-bottom:24px}
  .lousa-fs-chart-title{font-size:13px;font-weight:600;color:#d4d4d8;margin-bottom:14px;padding:0 6px}
  .lousa-fs-split{display:grid;grid-template-columns:1.4fr 1fr;gap:24px}
  .lousa-fs-cal-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px;display:flex;justify-content:center}
  .lousa-fs-evento-item{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.04);transition:background .15s;margin-bottom:8px}
  .lousa-fs-evento-item:hover{background:rgba(255,255,255,.03)}
  .lousa-fs-evento-icon{flex-shrink:0;width:32px;height:32px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center}
  .lousa-fs-evento-title{font-size:13.5px;font-weight:600;color:#e4e4e7;margin-bottom:3px}
  .lousa-fs-evento-meta{font-size:11.5px;color:#71717a}
  .lousa-acc-list{display:flex;flex-direction:column;gap:8px}
  .lousa-acc-item{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
  .lousa-acc-head{width:100%;display:grid;grid-template-columns:18px 1fr auto auto;align-items:center;gap:12px;padding:14px 16px;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left;transition:background .15s}
  .lousa-acc-head:hover:not(:disabled){background:rgba(255,255,255,.02)}
  .lousa-acc-head:disabled{cursor:default}
  .lousa-acc-chev{display:inline-flex;align-items:center;justify-content:center;color:#71717a;transition:transform .25s ease,color .15s}
  .lousa-acc-chev[data-open="true"]{transform:rotate(180deg);color:#22c55e}
  .lousa-acc-head:disabled .lousa-acc-chev{opacity:.25}
  .lousa-acc-nome{font-size:14px;font-weight:600;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .lousa-acc-meta-info{font-size:11.5px;color:#71717a;white-space:nowrap}
  .lousa-acc-media{font-size:17px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;min-width:36px;text-align:right}
  .lousa-acc-body{padding:4px 16px 16px}
  .lousa-acc-row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;padding:10px 0;font-size:13.5px;border-top:1px solid rgba(255,255,255,.04)}
  .lousa-acc-row-head{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;border-top:none;padding-top:6px}
  .lousa-acc-foot{font-size:11.5px;color:#71717a;margin-top:12px;line-height:1.5}
  @media (max-width:1023px){
    .lousa-fs-container{padding:18px 16px 32px}
    .lousa-fs-stats-grid{grid-template-columns:repeat(2, 1fr)}
    .lousa-fs-split{grid-template-columns:1fr;gap:18px}
    .lousa-fs-table-header,.lousa-fs-table-row{grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px}
    .lousa-fs-table-header{display:none}
    .lousa-fs-table-row{padding:12px;background:rgba(255,255,255,.02);margin-bottom:8px;border-radius:10px}
  }
`
