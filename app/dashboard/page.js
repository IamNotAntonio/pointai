'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import * as db from '../lib/db'
import {
  MessageSquare, Calendar, TrendingUp, AlertTriangle,
  FileText, ClipboardList, Brain, ArrowRight,
} from 'lucide-react'

/* ── Helpers ─────────────────────────────────────────────────── */
function saudacao(date = new Date()) {
  const h = date.getHours()
  if (h >= 5  && h <= 11) return 'Bom dia'
  if (h >= 12 && h <= 17) return 'Boa tarde'
  return 'Boa noite'
}

function dataLonga(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const raw = fmt.format(date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function tempoRelativo(ts) {
  if (!ts) return ''
  const diff = (ts - Date.now()) / 1000
  const abs  = Math.abs(diff)
  const rtf  = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  if (abs < 60)        return rtf.format(Math.round(diff), 'second')
  if (abs < 3600)      return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400)     return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return rtf.format(Math.round(diff / 86400 / 7), 'week')
}

function diasAte(dataIso) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataIso + 'T12:00:00')
  return Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24))
}

function rotuloRelativo(dias) {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  return `em ${dias} dias`
}

function corUrgencia(dias) {
  if (dias <= 3) return { fg: '#fca5a5', bg: 'rgba(239,68,68,.10)', border: 'rgba(239,68,68,.30)' }
  if (dias <= 7) return { fg: '#fcd34d', bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.32)' }
  return { fg: '#a1a1aa', bg: 'rgba(255,255,255,.02)', border: 'rgba(255,255,255,.08)' }
}

function Sparkline({ valores, cor }) {
  if (!valores || valores.length < 2) return null
  const W = 200, H = 36, PAD = 2
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const span = max - min || 1
  const step = (W - PAD * 2) / (valores.length - 1)
  const pts = valores.map((v, i) => {
    const x = PAD + i * step
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="home-spark">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SparkPlaceholder() {
  return (
    <svg viewBox="0 0 200 40" className="home-spark">
      <path
        d="M0,30 Q50,20 100,25 T200,15"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
    </svg>
  )
}

const TIPO_LABEL = { prova: 'Prova', trabalho: 'Trabalho', apresentacao: 'Apresentação', outro: 'Evento' }

/* ── Component ───────────────────────────────────────────────── */
export default function DashboardHome() {
  const [perfil,   setPerfil]   = useState(null)
  const [lastChat, setLastChat] = useState(null)
  const [eventos,  setEventos]  = useState([])
  const [notas,    setNotas]    = useState({})
  const [ehPro,    setEhPro]    = useState(false)

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (p) setPerfil(p)
      const n = await db.getNotas()
      if (n && typeof n === 'object') setNotas(n)
      const ev = await db.getEventos()
      if (Array.isArray(ev)) setEventos(ev)
      try {
        const lc = JSON.parse(localStorage.getItem('pointai_last_chat') || 'null')
        if (lc?.materia) setLastChat(lc)
      } catch {}
      try {
        const plano = JSON.parse(localStorage.getItem('pointai_plano') || '{}')
        setEhPro(plano.plano === 'pro')
      } catch {}
    }
    carregar()
  }, [])

  const nome1     = perfil?.nome?.trim().split(' ')[0] || ''
  const materias  = perfil?.materias
    ? perfil.materias.split(',').map(m => m.trim()).filter(Boolean)
    : []

  // ── Próximos eventos ────────────────────────────────────────
  const hojeIso = new Date().toISOString().split('T')[0]
  const proximosEventos = eventos
    .filter(e => e.data >= hojeIso)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3)

  // ── Alertas (faltas próximas, médias baixas) ────────────────
  const alertas = []
  Object.entries(notas).forEach(([materia, dados]) => {
    if (!dados) return
    const totalAulas = Number(dados.totalAulas) || 0
    const faltas     = Number(dados.faltas)     || 0
    if (totalAulas > 0) {
      const limite    = Math.floor(totalAulas * 0.25)
      const restantes = limite - faltas
      const ratio     = faltas / totalAulas
      if (ratio > 0.20) {
        alertas.push({
          id: `f_${materia}`,
          tipo: 'falta',
          materia,
          texto: restantes <= 0
            ? `Limite de faltas atingido em ${materia}`
            : `Só ${restantes} falta${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''} em ${materia}`,
          severidade: restantes <= 0 ? 'alta' : 'media',
        })
      }
    }
    const vals = (dados.notas || []).filter(n => n !== '' && n !== null && n !== undefined && !isNaN(parseFloat(n))).map(parseFloat)
    if (vals.length > 0) {
      const media = vals.reduce((a, b) => a + b, 0) / vals.length
      if (media < 7) {
        alertas.push({
          id: `m_${materia}`,
          tipo: 'nota',
          materia,
          texto: `Média ${media.toFixed(1)} em ${materia}`,
          severidade: media < 5 ? 'alta' : 'media',
        })
      }
    }
  })
  alertas.sort((a, b) => (a.severidade === 'alta' ? -1 : 1) - (b.severidade === 'alta' ? -1 : 1))
  const alertasTop  = alertas.slice(0, 2)
  const temAlertas  = alertasTop.length > 0
  const piorSeveridade = alertasTop.some(a => a.severidade === 'alta') ? 'alta' : 'media'

  // ── Média geral + sparkline data ────────────────────────────
  const mediasPorMateria = Object.values(notas).map(d => {
    const v = (d?.notas || []).filter(n => n !== '' && n !== null && !isNaN(parseFloat(n))).map(parseFloat)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }).filter(m => m !== null)
  const mediaGeral = mediasPorMateria.length
    ? (mediasPorMateria.reduce((a, b) => a + b, 0) / mediasPorMateria.length).toFixed(1)
    : null
  const corMedia = mediaGeral === null ? '#a1a1aa'
    : parseFloat(mediaGeral) >= 7 ? '#22c55e'
    : parseFloat(mediaGeral) >= 5 ? '#d97706' : '#dc2626'
  const todasNotas = Object.values(notas).flatMap(d =>
    (d?.notas || []).filter(n => n !== '' && n !== null && !isNaN(parseFloat(n))).map(parseFloat)
  )

  // ── Continuar conversa ──────────────────────────────────────
  const continuarHref = lastChat
    ? (lastChat.materia === '__geral__'
        ? '/dashboard/chat'
        : `/dashboard/chat?materia=${encodeURIComponent(lastChat.materia)}`)
    : '/dashboard/chat'
  const continuarLabel = lastChat
    ? (lastChat.materia === '__geral__' ? 'Chat Geral' : lastChat.materia)
    : null

  function handlePerfilUpdate(novoPerf) { setPerfil(novoPerf) }

  if (!perfil) return (
    <div className="app-shell">
      <div className="page-area" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'var(--text-4)' }}>Carregando…</p>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      <Sidebar perfil={perfil} onPerfilUpdate={handlePerfilUpdate} />

      <div className="page-area home-area">
        <div className="home-scroll">
          <div className="home-container">

            {/* ── Greeting ────────────────────────────────────── */}
            <header className="home-greeting">
              <h1 className="home-greet-line">
                {saudacao()},{' '}
                {nome1 && <span className="home-greet-name">{nome1}</span>}
              </h1>
              <p className="home-greet-date">{dataLonga()}</p>
            </header>

            {/* ── Bento grid ──────────────────────────────────── */}
            <div className={`home-grid${temAlertas ? '' : ' home-grid--no-alerts'}`}>

              {/* ── Continuar (span 2) ───────────────────────── */}
              <article className="home-card home-card--continuar" style={{ animationDelay: '0ms' }}>
                <div className="home-card-head">
                  <span className="home-card-ico home-card-ico--emerald">
                    <MessageSquare size={16} strokeWidth={2} />
                  </span>
                  <p className="home-card-title">Continuar</p>
                </div>

                {lastChat ? (
                  <Link href={continuarHref} className="home-continuar-block">
                    <p className="home-continuar-pre">Você estava conversando sobre</p>
                    <p className="home-continuar-materia">{continuarLabel}</p>
                    <p className="home-continuar-quote">
                      &ldquo;{lastChat.ultimaMensagem || 'Sem mensagens recentes.'}&rdquo;
                    </p>
                    <p className="home-continuar-time">{tempoRelativo(lastChat.timestamp)}</p>
                    <span className="home-cta home-cta--strong">
                      Continuar <ArrowRight size={13} strokeWidth={2.2} />
                    </span>
                  </Link>
                ) : materias.length > 0 ? (
                  <>
                    <p className="home-continuar-prompt">Por onde quer começar hoje?</p>
                    <div className="home-pills">
                      {materias.map(m => (
                        <Link
                          key={m}
                          href={`/dashboard/chat?materia=${encodeURIComponent(m)}`}
                          className="home-pill"
                        >
                          {m}
                        </Link>
                      ))}
                      <Link href="/dashboard/chat" className="home-pill home-pill--ghost">
                        Chat Geral
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="home-continuar-prompt">Você ainda não tem matérias cadastradas.</p>
                    <p className="home-empty-hint">Adicione no menu lateral em <strong>+ Nova matéria</strong> para começar.</p>
                    <Link href="/dashboard/chat" className="home-cta home-cta--strong" style={{ marginTop: 12 }}>
                      Ir para Chat Geral <ArrowRight size={13} strokeWidth={2.2} />
                    </Link>
                  </>
                )}
              </article>

              {/* ── Próximos eventos (span 1) ────────────────── */}
              <article className="home-card" style={{ animationDelay: '60ms' }}>
                <div className="home-card-head">
                  <span className="home-card-ico home-card-ico--blue">
                    <Calendar size={16} strokeWidth={2} />
                  </span>
                  <p className="home-card-title">Próximos eventos</p>
                </div>

                {proximosEventos.length === 0 ? (
                  <div className="home-empty">
                    <Calendar size={36} strokeWidth={1.2} className="home-empty-ico" />
                    <p className="home-empty-text">Sem provas ou trabalhos próximos</p>
                    <Link href="/calendario" className="home-empty-link">
                      + Adicionar evento
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="home-event-list">
                      {proximosEventos.map(e => {
                        const d  = diasAte(e.data)
                        const cu = corUrgencia(d)
                        return (
                          <li key={e.id || `${e.titulo}-${e.data}`} className="home-event-row">
                            <span
                              className="home-event-pill"
                              style={{ color: cu.fg, background: cu.bg, borderColor: cu.border }}
                            >
                              {rotuloRelativo(d)}
                            </span>
                            <div className="home-event-body">
                              <p className="home-event-title">{e.titulo || e.materia || 'Evento'}</p>
                              <p className="home-event-sub">
                                {TIPO_LABEL[e.tipo] || 'Evento'}{e.materia ? ` · ${e.materia}` : ''}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <Link href="/calendario" className="home-cta">
                      Ver tudo <ArrowRight size={13} strokeWidth={2} />
                    </Link>
                  </>
                )}
              </article>

              {/* ── Evolução (span 2 with alerts, span 3 without) ── */}
              <article
                className={`home-card home-card--evolucao${temAlertas ? '' : ' home-card--wide'}`}
                style={{ animationDelay: '120ms' }}
              >
                <div className="home-card-head">
                  <span className="home-card-ico home-card-ico--violet">
                    <TrendingUp size={16} strokeWidth={2} />
                  </span>
                  <p className="home-card-title">Evolução</p>
                </div>

                {mediaGeral === null ? (
                  <div className="home-evo-body">
                    <div className="home-evo-stack">
                      <span className="home-evo-empty-value">—</span>
                      <p className="home-evo-empty-text">Lance suas avaliações pra ver evolução</p>
                    </div>
                    <SparkPlaceholder />
                    <Link href="/notas" className="home-cta home-cta--strong">
                      Lançar notas <ArrowRight size={13} strokeWidth={2.2} />
                    </Link>
                  </div>
                ) : (
                  <div className="home-evo-body">
                    <div className="home-evo-stack">
                      <span className="home-evo-value" style={{ color: corMedia }}>{mediaGeral}</span>
                      <p className="home-evo-label">
                        Média geral · {mediasPorMateria.length} matéria{mediasPorMateria.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {todasNotas.length >= 2 ? (
                      <Sparkline valores={todasNotas} cor={corMedia} />
                    ) : (
                      <SparkPlaceholder />
                    )}
                    <Link href="/evolucao" className="home-cta home-cta--strong">
                      Ver evolução <ArrowRight size={13} strokeWidth={2.2} />
                    </Link>
                  </div>
                )}
              </article>

              {/* ── Atenção (conditional, span 1) ────────────── */}
              {temAlertas && (
                <article
                  className={`home-card home-card--alert home-card--alert-${piorSeveridade}`}
                  style={{ animationDelay: '180ms' }}
                >
                  <div className="home-card-head">
                    <span className={`home-card-ico home-card-ico--${piorSeveridade === 'alta' ? 'red' : 'amber'}`}>
                      <AlertTriangle size={16} strokeWidth={2} />
                    </span>
                    <p className="home-card-title">Atenção</p>
                  </div>
                  <ul className="home-alert-list">
                    {alertasTop.map(a => (
                      <li key={a.id} className={`home-alert-row home-alert-row--${a.severidade}`}>
                        <span className="home-alert-dot" />
                        <span className="home-alert-text">{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/notas" className="home-cta">
                    Ver detalhes <ArrowRight size={13} strokeWidth={2} />
                  </Link>
                </article>
              )}

              {/* ── Ações rápidas (span 3) ───────────────────── */}
              <article
                className="home-card home-card--full"
                style={{ animationDelay: temAlertas ? '240ms' : '180ms' }}
              >
                <p className="home-card-title home-card-title--standalone">Ações rápidas</p>
                <div className="home-quick-grid">
                  <Link href="/dashboard/chat" className="home-quick-btn">
                    <span className="home-quick-ico"><MessageSquare size={18} strokeWidth={1.7} /></span>
                    <span className="home-quick-label">Novo chat</span>
                  </Link>
                  <Link href="/trabalhos" className="home-quick-btn">
                    <span className="home-quick-ico"><FileText size={18} strokeWidth={1.7} /></span>
                    <span className="home-quick-label">Corrigir trabalho</span>
                  </Link>
                  <Link href="/simulado" className="home-quick-btn">
                    <span className="home-quick-ico"><ClipboardList size={18} strokeWidth={1.7} /></span>
                    <span className="home-quick-label">Simulado</span>
                    {!ehPro && <span className="home-quick-pro">PRO</span>}
                  </Link>
                  <Link href="/plano" className="home-quick-btn">
                    <span className="home-quick-ico"><Brain size={18} strokeWidth={1.7} /></span>
                    <span className="home-quick-label">Plano de estudos</span>
                    {!ehPro && <span className="home-quick-pro">PRO</span>}
                  </Link>
                </div>
              </article>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CSS = `
  /* ── Layout shell ───────────────────────────────────────── */
  .home-area  { background: var(--surface-2); }
  .home-scroll {
    flex: 1; overflow-y: auto;
  }
  .home-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 32px 56px;
  }

  /* ── Greeting ───────────────────────────────────────────── */
  .home-greeting { margin-bottom: 32px; }
  .home-greet-line {
    font-size: 32px; font-weight: 600; letter-spacing: -.5px;
    color: var(--text-1); line-height: 1.15; margin: 0;
  }
  .home-greet-name {
    background: linear-gradient(90deg, #34d399 0%, #a7f3d0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }
  .home-greet-date {
    margin-top: 6px;
    font-size: 14px;
    color: #71717a;
    letter-spacing: .1px;
  }

  /* ── Bento grid ─────────────────────────────────────────── */
  .home-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: minmax(0, auto);
    gap: 16px;
  }
  .home-card--continuar { grid-column: span 2; }
  .home-card--evolucao  { grid-column: span 2; }
  .home-card--evolucao.home-card--wide { grid-column: span 3; }
  .home-card--alert     { grid-column: span 1; }
  .home-card--full      { grid-column: span 3; }
  .home-grid--no-alerts .home-card--evolucao { grid-column: span 3; }

  /* ── Card base ──────────────────────────────────────────── */
  .home-card {
    position: relative;
    background: linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,.01) 100%);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 18px;
    padding: 24px;
    color: var(--text-1);
    display: flex; flex-direction: column;
    transition: transform 200ms cubic-bezier(.16,1,.3,1), border-color 200ms cubic-bezier(.16,1,.3,1), box-shadow 200ms cubic-bezier(.16,1,.3,1);
    animation: homeStagger 400ms cubic-bezier(.16,1,.3,1) both;
  }
  .home-card:hover {
    transform: translateY(-2px);
    border-color: rgba(34,197,94,.18);
    box-shadow: 0 8px 32px -8px rgba(34,197,94,.12);
  }

  /* ── Card head ──────────────────────────────────────────── */
  .home-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .home-card-ico {
    width: 32px; height: 32px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .home-card-ico--emerald { background: rgba(34,197,94,.10);  color: #86efac; }
  .home-card-ico--blue    { background: rgba(59,130,246,.10); color: #93c5fd; }
  .home-card-ico--violet  { background: rgba(168,85,247,.10); color: #c4b5fd; }
  .home-card-ico--amber   { background: rgba(245,158,11,.12); color: #fcd34d; }
  .home-card-ico--red     { background: rgba(239,68,68,.12);  color: #fca5a5; }
  .home-card-title {
    font-size: 15px; font-weight: 600; color: var(--text-1); letter-spacing: -.2px;
  }
  .home-card-title--standalone { margin-bottom: 14px; }

  /* ── Continuar (empty: pills) ───────────────────────────── */
  .home-continuar-prompt {
    font-size: 14px; color: #d4d4d8; margin-bottom: 14px;
  }
  .home-pills {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
  }
  .home-pill {
    display: inline-flex; align-items: center;
    padding: 6px 14px; border-radius: 99px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.03);
    color: #e4e4e7; font-size: 13px; font-weight: 500;
    text-decoration: none;
    transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
  }
  .home-pill:hover {
    border-color: rgba(34,197,94,.40);
    background: rgba(34,197,94,.06);
    color: #bbf7d0;
  }
  .home-pill--ghost {
    border-style: dashed; color: #a1a1aa;
  }
  .home-empty-hint {
    font-size: 12.5px; color: #71717a; line-height: 1.55;
  }

  /* ── Continuar (with data) ──────────────────────────────── */
  .home-continuar-block {
    display: flex; flex-direction: column;
    text-decoration: none; color: inherit;
    flex: 1;
  }
  .home-continuar-pre {
    font-size: 12px; color: #71717a; letter-spacing: .2px;
    text-transform: uppercase; font-weight: 600;
  }
  .home-continuar-materia {
    font-size: 17px; font-weight: 600; color: #f4f4f5;
    margin-top: 4px;
  }
  .home-continuar-quote {
    margin-top: 10px;
    padding: 10px 14px;
    border-left: 2px solid rgba(34,197,94,.45);
    background: rgba(255,255,255,.02);
    border-radius: 0 6px 6px 0;
    font-size: 13px; font-style: italic; color: #a1a1aa;
    line-height: 1.5;
  }
  .home-continuar-time {
    font-size: 11.5px; color: #52525b; margin-top: 8px;
  }

  /* ── CTAs ───────────────────────────────────────────────── */
  .home-cta {
    display: inline-flex; align-items: center; gap: 5px;
    margin-top: 14px;
    font-size: 12.5px; font-weight: 600;
    color: #22c55e; text-decoration: none;
    transition: color 120ms ease, gap 150ms ease;
    align-self: flex-start;
  }
  .home-cta:hover { color: #4ade80; gap: 8px; }
  .home-cta--strong { font-size: 13px; font-weight: 600; }

  /* ── Eventos ────────────────────────────────────────────── */
  .home-event-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .home-event-row  { display: flex; align-items: center; gap: 10px; }
  .home-event-pill {
    font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px;
    border: 1px solid; white-space: nowrap; flex-shrink: 0;
    text-transform: lowercase;
  }
  .home-event-body { flex: 1; min-width: 0; }
  .home-event-title {
    font-size: 13.5px; font-weight: 500; color: #f4f4f5;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .home-event-sub { font-size: 11.5px; color: #71717a; }

  /* ── Empty state (eventos) ──────────────────────────────── */
  .home-empty {
    display: flex; flex-direction: column; align-items: flex-start;
    gap: 8px; padding: 6px 0;
  }
  .home-empty-ico { color: #3f3f46; }
  .home-empty-text { font-size: 13px; color: #a1a1aa; }
  .home-empty-link {
    font-size: 12px; font-weight: 500;
    color: rgba(34,197,94,.75);
    text-decoration: none;
    transition: color 120ms;
  }
  .home-empty-link:hover { color: #22c55e; }

  /* ── Alertas ────────────────────────────────────────────── */
  .home-card--alert-alta  { border-left: 4px solid rgba(239,68,68,.45);  border-radius: 6px 18px 18px 6px; }
  .home-card--alert-media { border-left: 4px solid rgba(245,158,11,.45); border-radius: 6px 18px 18px 6px; }
  .home-alert-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .home-alert-row  {
    display: flex; align-items: flex-start; gap: 9px;
    font-size: 13px; line-height: 1.45;
    padding: 9px 12px; border-radius: 9px;
  }
  .home-alert-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .home-alert-text { flex: 1; }
  .home-alert-row--alta  { color: #fca5a5; background: rgba(239,68,68,.07); }
  .home-alert-row--alta  .home-alert-dot { background: #ef4444; }
  .home-alert-row--media { color: #fcd34d; background: rgba(245,158,11,.07); }
  .home-alert-row--media .home-alert-dot { background: #f59e0b; }

  /* ── Evolução ───────────────────────────────────────────── */
  .home-evo-body  { display: flex; flex-direction: column; gap: 12px; }
  .home-evo-stack { display: flex; flex-direction: column; gap: 2px; }
  .home-evo-value {
    font-size: 40px; font-weight: 700; line-height: 1; letter-spacing: -1px;
  }
  .home-evo-label  { font-size: 12.5px; color: #71717a; }
  .home-evo-empty-value {
    font-size: 36px; font-weight: 700; color: #3f3f46; line-height: 1; letter-spacing: -1px;
  }
  .home-evo-empty-text { font-size: 13px; color: #a1a1aa; }
  .home-spark { width: 100%; max-width: 240px; height: 36px; display: block; }

  /* ── Ações rápidas ──────────────────────────────────────── */
  .home-quick-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .home-quick-btn {
    position: relative;
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    background: rgba(255,255,255,.025);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 12px;
    text-decoration: none;
    color: #e4e4e7;
    transition: transform 200ms cubic-bezier(.16,1,.3,1), background 150ms, border-color 150ms;
  }
  .home-quick-btn:hover {
    transform: translateY(-2px);
    background: rgba(34,197,94,.05);
    border-color: rgba(34,197,94,.22);
  }
  .home-quick-ico {
    width: 36px; height: 36px; border-radius: 9px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.04);
    color: #d4d4d8;
    flex-shrink: 0;
  }
  .home-quick-label {
    font-size: 13px; font-weight: 500; color: #e4e4e7;
  }
  .home-quick-pro {
    position: absolute; top: 8px; right: 10px;
    font-size: 9.5px; font-weight: 800; letter-spacing: .4px;
    color: #fcd34d; background: rgba(245,158,11,.10);
    border: 1px solid rgba(245,158,11,.32);
    padding: 1px 6px; border-radius: 5px;
  }

  /* ── Stagger entrance ───────────────────────────────────── */
  @keyframes homeStagger {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }

  /* ── Responsive ─────────────────────────────────────────── */
  @media (max-width: 880px) {
    .home-container { padding: 28px 18px 40px; }
    .home-greet-line { font-size: 26px; }
    .home-grid { grid-template-columns: 1fr; }
    .home-card--continuar,
    .home-card--evolucao,
    .home-card--evolucao.home-card--wide,
    .home-card--alert,
    .home-card--full { grid-column: span 1; }
    .home-quick-grid { grid-template-columns: 1fr 1fr; }
  }
`
