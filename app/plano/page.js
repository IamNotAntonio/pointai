'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import Sidebar from '../components/Sidebar'
import UpgradeModal from '../components/UpgradeModal'
import * as db from '../lib/db'
import { fetchPlano } from '../lib/plano'
import {
  Brain, RefreshCw, Download, AlertTriangle, Sparkles, Lock,
  Clock, Check, MessageSquare, FileText, PenLine, Target, ArrowRight,
} from 'lucide-react'

/* ── Constantes ──────────────────────────────────────────────────── */
const DIA_ABREV = {
  'Segunda-feira': 'Seg', 'Terça-feira': 'Ter', 'Quarta-feira': 'Qua',
  'Quinta-feira': 'Qui', 'Sexta-feira': 'Sex', 'Sábado': 'Sáb', 'Domingo': 'Dom',
}
const DIA_JS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Selo de prioridade: vermelho (alta) / âmbar (média) / neutro (baixa).
const PRIORIDADE = {
  alta:  { cor: '#ef4444', bg: 'rgba(239,68,68,.12)',  borda: 'rgba(239,68,68,.3)',  label: 'prioridade alta' },
  media: { cor: '#f59e0b', bg: 'rgba(245,158,11,.12)', borda: 'rgba(245,158,11,.3)', label: 'prioridade média' },
  baixa: { cor: '#a1a1aa', bg: 'rgba(161,161,170,.1)', borda: 'rgba(161,161,170,.25)', label: 'prioridade baixa' },
}

// Ferramentas do Point que uma recomendação pode abrir. `to(router, rec)`
// leva à ferramenta com o MÁXIMO de contexto que ela suporta hoje (ver
// relatório): chat/resumo pré-carregam a pergunta via pointai_chat_prefill;
// simulado pré-seleciona a matéria via pointai_simulado_materia; cérebro abre
// o dashboard na matéria; trabalhos abre a tela de correção.
const FERRAMENTA = {
  chat: {
    Icon: MessageSquare,
    to: (router, r) => {
      const texto = r.assunto ? `Tenho uma dúvida sobre ${r.assunto}` : ''
      abrirChat(router, r.materia_alvo, texto)
    },
  },
  resumo: {
    Icon: FileText,
    to: (router, r) => {
      const base = r.materia_alvo && r.materia_alvo !== 'geral'
        ? `Resuma os principais conceitos de ${r.materia_alvo}`
        : 'Resuma os principais conceitos que estudei recentemente'
      abrirChat(router, r.materia_alvo, r.assunto ? `${base}: ${r.assunto}` : base)
    },
  },
  simulado: {
    Icon: Target,
    to: (router, r) => {
      try {
        if (r.materia_alvo && r.materia_alvo !== 'geral') {
          localStorage.setItem('pointai_simulado_materia', r.materia_alvo)
        }
      } catch {}
      router.push('/simulado')
    },
  },
  cerebro: {
    Icon: Brain,
    to: (router, r) => {
      const m = r.materia_alvo && r.materia_alvo !== 'geral' ? r.materia_alvo : null
      router.push(m ? `/dashboard?materia=${encodeURIComponent(m)}` : '/dashboard')
    },
  },
  trabalhos: {
    Icon: PenLine,
    to: (router) => router.push('/trabalhos'),
  },
}

// Abre o chat da matéria (ou geral) deixando uma pergunta pré-carregada no
// input. O Chat lê pointai_chat_prefill uma única vez ao montar.
function abrirChat(router, materia, texto) {
  const m = materia && materia !== 'geral' ? materia : 'geral'
  try { localStorage.setItem('pointai_chat_prefill', JSON.stringify({ materia: m, texto })) } catch {}
  router.push(m !== 'geral' ? `/dashboard?materia=${encodeURIComponent(m)}` : '/dashboard')
}

const PROGRESSO_KEY = 'pointai_plano_progresso'
const sessaoId = (diaIdx, sIdx) => `${diaIdx}:${sIdx}`

export default function PlanoEstudos() {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [tela, setTela] = useState('carregando')
  const [perfil, setPerfil] = useState(null)
  const [eventos, setEventos] = useState([])
  const [plano, setPlano] = useState(null)
  const [ehPro, setEhPro] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const [diaSel, setDiaSel] = useState(0)
  const [feitas, setFeitas] = useState({}) // { "diaIdx:sIdx": true }

  const hojeAbrev = DIA_JS_ABREV[new Date().getDay()]
  const abrevDoDia = (dia) => DIA_ABREV[dia?.dia] || (dia?.dia || '').slice(0, 3)

  useEffect(() => {
    async function init() {
      // Notas NÃO são lidas aqui: a rota /api/plano lê matérias/avaliações do
      // Supabase pela sessão (fonte de verdade) e ignora qualquer nota do body.
      const [p, evs, pl] = await Promise.all([db.getPerfil(), db.getEventos(), fetchPlano()])
      setPerfil(p)
      setEventos(evs)
      const isPro = pl === 'pro'
      setEhPro(isPro)

      try {
        const cached = JSON.parse(localStorage.getItem('pointai_plano_estudos') || 'null')
        if (cached?.plano && Date.now() - cached.timestamp < 7 * 24 * 3600 * 1000) {
          aplicarPlano(cached.plano)
          setTela('plano')
          return
        }
      } catch {}

      if (p) await gerarPlano(p, evs, isPro)
      else setTela('erro')
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Define o plano, seleciona o dia de hoje e restaura o progresso da semana.
  function aplicarPlano(novo) {
    setPlano(novo)
    const idxHoje = (novo.dias || []).findIndex(d => abrevDoDia(d) === hojeAbrev)
    setDiaSel(idxHoje >= 0 ? idxHoje : 0)
    try {
      const salvo = JSON.parse(localStorage.getItem(PROGRESSO_KEY) || 'null')
      setFeitas(salvo?.semana === novo.semana ? (salvo.feitas || {}) : {})
    } catch { setFeitas({}) }
  }

  function persistirProgresso(novasFeitas) {
    setFeitas(novasFeitas)
    try {
      localStorage.setItem(PROGRESSO_KEY, JSON.stringify({ semana: plano?.semana, feitas: novasFeitas }))
    } catch {}
  }

  function toggleSessao(diaIdx, sIdx) {
    const id = sessaoId(diaIdx, sIdx)
    const next = { ...feitas }
    if (next[id]) delete next[id]
    else next[id] = true
    persistirProgresso(next)
  }

  async function gerarPlano(p, evs, isPro) {
    setGerando(true)
    setErro(null)
    setTela('carregando')
    try {
      let historicoChat = null
      try {
        const materias = (p?.materias || '').split(',').map(m => m.trim()).filter(Boolean)
        const temas = []
        for (const m of materias.slice(0, 5)) {
          const raw = localStorage.getItem(`chat_${m}`)
          if (!raw) continue
          const msgs = JSON.parse(raw)
          msgs.filter(msg => msg.role === 'user').slice(-3).forEach(msg => {
            if (msg.content?.length > 10) temas.push(`${m}: ${msg.content.slice(0, 80)}`)
          })
        }
        if (temas.length) historicoChat = temas.join('\n')
      } catch {}

      const resp = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historicoChat, ehPro: isPro }),
      })
      const data = await resp.json()
      if (data.erro || !Array.isArray(data.dias) || !data.dias.length) {
        throw new Error(data.erro || 'A IA não retornou um plano válido.')
      }

      aplicarPlano(data)
      localStorage.setItem('pointai_plano_estudos', JSON.stringify({ plano: data, timestamp: Date.now() }))
      setTela('plano')
    } catch (e) {
      setErro(e.message || 'Erro ao gerar plano')
      setTela('erro')
    }
    setGerando(false)
  }

  function atualizarPlano() {
    localStorage.removeItem('pointai_plano_estudos')
    localStorage.removeItem(PROGRESSO_KEY)
    gerarPlano(perfil, eventos, ehPro)
  }

  /* ── Métricas da semana ────────────────────────────────────────── */
  const dias = plano?.dias || []
  const totalSessoes = dias.reduce((acc, d) => acc + (d.sessoes?.length || 0), 0)
  const totalFeitas = dias.reduce((acc, d, di) =>
    acc + (d.sessoes || []).filter((_, si) => feitas[sessaoId(di, si)]).length, 0)
  const pct = totalSessoes ? Math.round((totalFeitas / totalSessoes) * 100) : 0

  const diaConcluido = (d, di) =>
    (d.sessoes?.length || 0) > 0 && d.sessoes.every((_, si) => feitas[sessaoId(di, si)])

  const diaAtual = dias[diaSel]
  const sessoesDia = diaAtual?.sessoes || []
  const feitasDia = sessoesDia.filter((_, si) => feitas[sessaoId(diaSel, si)]).length
  const ehHoje = abrevDoDia(diaAtual) === hojeAbrev

  return (
    <div className="app-shell">
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @media print {
          .sidebar,.page-breadcrumb,.page-header .btn,button,.plano-days{display:none!important}
          .page-area{padding:0!important}
          .card,.plano-card,.plano-sessao{break-inside:avoid}
        }
        .plano-card{background:var(--surface);border:1px solid var(--border);border-radius:16px}
        /* Resumo da semana */
        .plano-week{padding:20px 22px;margin-bottom:16px;background:linear-gradient(135deg,rgba(26,122,74,.10),rgba(34,197,94,.03));border:1px solid rgba(34,197,94,.22)}
        .plano-week-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
        .plano-week-msg{font-size:14px;color:var(--text-2);line-height:1.55;margin-bottom:16px;max-width:620px}
        .plano-week-count{font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-.02em}
        .plano-week-count b{color:var(--brand)}
        .plano-week-pct{font-size:13px;color:var(--text-4);font-weight:600;margin-left:8px}
        .plano-bar{height:10px;border-radius:99px;background:var(--surface-3,rgba(255,255,255,.06));overflow:hidden;margin:10px 0 18px}
        .plano-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#1a7a4a,#22c55e)}
        /* Padding generoso pra não cortar o glow do "hoje" no overflow-x. */
        .plano-days{display:flex;gap:8px;overflow-x:auto;padding:6px 4px 8px}
        /* Borda uniforme em todos os estados: nunca muda de espessura, só de
           cor; rings extras usam box-shadow (que respeita o border-radius).
           Evita o outline+outline-offset, que renderizava quebrado nos cantos
           arredondados em zoom não-inteiro. */
        .plano-day{flex:0 0 auto;min-width:74px;border-radius:12px;padding:9px 10px;text-align:center;cursor:pointer;border:1px solid var(--border);background:var(--surface-2);box-sizing:border-box;transition:transform .12s,border-color .15s,background .15s,box-shadow .15s;font-family:inherit}
        .plano-day:hover{transform:translateY(-1px)}
        .plano-day[data-state="done"]{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.4)}
        .plano-day[data-state="today"]{border-color:var(--brand);box-shadow:0 0 18px rgba(34,197,94,.18)}
        .plano-day[data-sel="true"]{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)}
        .plano-day[data-state="today"][data-sel="true"]{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand),0 0 18px rgba(34,197,94,.18)}
        .plano-day-abrev{font-size:13px;font-weight:700;color:var(--text-1)}
        .plano-day-data{font-size:10.5px;color:var(--text-4);margin-top:1px}
        .plano-day-dot{display:inline-flex;align-items:center;justify-content:center;margin-top:5px;height:14px}
        /* Timeline */
        .plano-tl-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:22px 0 14px}
        .plano-tl-day{font-size:18px;font-weight:800;color:var(--text-1);letter-spacing:-.02em}
        .plano-tl-meta{font-size:13px;color:var(--text-4)}
        .plano-tl-today{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--brand);background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);padding:2px 8px;border-radius:99px}
        .plano-tl{position:relative;padding-left:26px}
        .plano-tl::before{content:'';position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--border)}
        .plano-sessao{position:relative;margin-bottom:12px}
        .plano-sessao-dot{position:absolute;left:-26px;top:16px;width:16px;height:16px;border-radius:50%;border:2px solid var(--brand);background:var(--surface);display:flex;align-items:center;justify-content:center}
        .plano-sessao-dot[data-done="true"]{background:var(--brand)}
        .plano-sessao-card{border-radius:14px;border:1px solid var(--border);background:var(--surface);padding:14px 16px;transition:opacity .2s}
        .plano-sessao-card[data-done="true"]{opacity:.55}
        .plano-selo{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;margin-bottom:8px}
        .plano-selo-dot{width:7px;height:7px;border-radius:50%}
        .plano-sessao-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .plano-sessao-mat{font-size:15px;font-weight:700;color:var(--text-1)}
        .plano-sessao-mat[data-done="true"]{text-decoration:line-through}
        .plano-sessao-when{font-size:12.5px;color:var(--text-4);margin-top:2px;display:flex;align-items:center;gap:5px}
        .plano-sessao-est{font-size:13.5px;color:var(--text-2);margin-top:10px;line-height:1.5}
        .plano-sessao-est[data-done="true"]{text-decoration:line-through;color:var(--text-4)}
        .plano-sessao-pq{font-size:12.5px;color:var(--text-4);margin-top:5px;line-height:1.5;font-style:italic}
        .plano-check{flex-shrink:0;width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-4);transition:all .15s}
        .plano-check:hover{border-color:var(--brand);color:var(--brand)}
        .plano-check[data-done="true"]{background:var(--brand);border-color:var(--brand);color:#fff}
        .plano-rest{text-align:center;padding:26px 0;color:var(--text-4);font-size:13.5px}
        /* Recomendações */
        .plano-rec{padding:16px 18px;margin-bottom:10px}
        .plano-rec-txt{font-size:14px;color:var(--text-2);line-height:1.55;margin-bottom:12px}
        .plano-rec-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(26,122,74,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;font-size:13px;font-weight:600;padding:9px 15px;border-radius:10px;cursor:pointer;font-family:inherit;transition:background .15s,transform .12s}
        .plano-rec-btn:hover{background:rgba(26,122,74,.2);transform:translateY(-1px)}
      `}</style>

      <Sidebar perfil={perfil} />

      <div className="page-area">
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point</span>
          <span className="page-breadcrumb-sep">/</span>
          <span className="page-breadcrumb-current">Plano de Estudos</span>
        </nav>

        {tela === 'carregando' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
            <Brain size={40} style={{ color: 'var(--brand)', animation: reduce ? 'none' : 'pulse 2s infinite' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-1)' }}>Montando sua semana...</p>
            <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', maxWidth: 320 }}>
              A IA está cruzando suas notas, metas e eventos para priorizar o que mais importa
            </p>
          </div>
        )}

        {tela === 'erro' && (
          <div style={{ padding: '24px 0' }}>
            <div className="alert alert-red" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ flex: 1 }}>{erro || 'Não foi possível gerar o plano de estudos.'}</p>
            </div>
            <button className="btn btn-primary" onClick={() => gerarPlano(perfil, eventos, ehPro)} disabled={gerando}>
              <RefreshCw size={14} /> Tentar novamente
            </button>
          </div>
        )}

        {tela === 'plano' && plano && (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Plano de Estudos</h1>
                <p className="page-subtitle">Semana {plano.semana} · gerado por IA</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={atualizarPlano} disabled={gerando}>
                  <RefreshCw size={14} style={gerando && !reduce ? { animation: 'spin 1s linear infinite' } : {}} />
                  Atualizar plano
                </button>
                <button className="btn btn-ghost" onClick={() => window.print()}>
                  <Download size={14} /> Exportar PDF
                </button>
              </div>
            </div>

            <div className="page-scroll">
              {/* 1 · RESUMO DA SEMANA */}
              <div className="plano-card plano-week">
                <div className="plano-week-head">
                  <div className="plano-week-count">
                    <b>{totalFeitas}</b> de {totalSessoes} sessões
                    <span className="plano-week-pct">{pct}% concluído</span>
                  </div>
                  <span className={ehPro ? 'badge badge-green' : 'badge badge-gray'}>{ehPro ? 'Pro' : 'Grátis'}</span>
                </div>

                <div className="plano-bar">
                  <motion.div
                    className="plano-bar-fill"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                {plano.resumo && (
                  <p className="plano-week-msg">
                    <Sparkles size={14} style={{ color: 'var(--brand)', verticalAlign: -2, marginRight: 6 }} />
                    {plano.resumo}
                  </p>
                )}

                <div className="plano-days">
                  {dias.map((d, di) => {
                    const concl = diaConcluido(d, di)
                    const hoje = abrevDoDia(d) === hojeAbrev
                    const state = concl ? 'done' : hoje ? 'today' : 'neutral'
                    return (
                      <button
                        key={di}
                        className="plano-day"
                        data-state={state}
                        data-sel={di === diaSel}
                        onClick={() => setDiaSel(di)}
                        aria-label={`Ver ${d.dia}`}
                      >
                        <div className="plano-day-abrev">{abrevDoDia(d)}</div>
                        <div className="plano-day-data">{d.data}</div>
                        <div className="plano-day-dot">
                          {concl
                            ? <Check size={13} strokeWidth={3} style={{ color: 'var(--brand)' }} />
                            : (d.sessoes?.length || 0) > 0
                              ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-4)', display: 'inline-block' }} />
                              : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Alerta crítico (Pro) */}
              {plano.alerta && ehPro && (
                <div className="alert alert-yellow" style={{ marginBottom: 12 }}>
                  <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <p>{plano.alerta}</p>
                </div>
              )}

              {/* 2 · TIMELINE DO DIA */}
              <div className="plano-tl-head">
                <span className="plano-tl-day">{diaAtual?.dia || '—'}</span>
                {ehHoje && <span className="plano-tl-today">hoje</span>}
                <span className="plano-tl-meta">
                  {sessoesDia.length ? `${feitasDia} de ${sessoesDia.length} sessões` : 'sem sessões'}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={diaSel}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                >
                  {sessoesDia.length === 0 ? (
                    <div className="plano-card plano-rest">Dia de descanso — recarregue as energias.</div>
                  ) : (
                    <div className="plano-tl">
                      {sessoesDia.map((s, si) => {
                        const done = !!feitas[sessaoId(diaSel, si)]
                        const pr = PRIORIDADE[s.prioridade] || PRIORIDADE.media
                        return (
                          <motion.div
                            key={si}
                            className="plano-sessao"
                            initial={reduce ? false : { opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : si * 0.05 }}
                          >
                            <span className="plano-sessao-dot" data-done={done}>
                              {done && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
                            </span>
                            <div className="plano-sessao-card" data-done={done}>
                              <div className="plano-sessao-top">
                                <div style={{ minWidth: 0 }}>
                                  <span className="plano-selo" style={{ color: pr.cor, background: pr.bg, border: `1px solid ${pr.borda}` }}>
                                    <span className="plano-selo-dot" style={{ background: pr.cor }} />
                                    {pr.label}
                                  </span>
                                  <p className="plano-sessao-mat" data-done={done}>{s.materia}</p>
                                  <p className="plano-sessao-when">
                                    <Clock size={12} strokeWidth={2} />
                                    {[s.horario, s.duracao].filter(Boolean).join(' · ') || 'horário livre'}
                                  </p>
                                </div>
                                <button
                                  className="plano-check"
                                  data-done={done}
                                  onClick={() => toggleSessao(diaSel, si)}
                                  aria-label={done ? 'Marcar como não concluída' : 'Marcar como concluída'}
                                >
                                  <Check size={16} strokeWidth={2.5} />
                                </button>
                              </div>
                              {s.o_que_estudar && (
                                <p className="plano-sessao-est" data-done={done}>{s.o_que_estudar}</p>
                              )}
                              {s.porque && <p className="plano-sessao-pq">{s.porque}</p>}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Paywall não-Pro */}
              {!ehPro && (
                <div className="plano-card" style={{ padding: '16px 18px', margin: '16px 0 12px', border: '1px solid rgba(245,158,11,.3)', background: 'rgba(245,158,11,.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Lock size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Alertas de risco no Pro</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Assine para receber alertas críticos sobre notas e faltas direto no seu plano.</p>
                    </div>
                    <button onClick={() => setShowUpgrade(true)} className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      <Sparkles size={12} /> Ver planos
                    </button>
                  </div>
                </div>
              )}

              {/* 3 · RECOMENDAÇÕES (puxam pro Point) */}
              {plano.recomendacoes?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p className="card-title" style={{ marginBottom: 12 }}>Recomendações pra você</p>
                  {plano.recomendacoes.map((r, i) => {
                    const tool = FERRAMENTA[r.ferramenta] || FERRAMENTA.chat
                    const Icon = tool.Icon
                    return (
                      <motion.div
                        key={i}
                        className="plano-card plano-rec"
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.06 }}
                      >
                        <p className="plano-rec-txt">{r.texto}</p>
                        <button className="plano-rec-btn" onClick={() => tool.to(router, r)}>
                          <Icon size={15} strokeWidth={2} />
                          {r.rotulo_acao}
                          <ArrowRight size={14} strokeWidth={2} />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '20px 0 24px' }}>
                Plano gerado com base nas suas notas, metas e calendário atuais.
              </p>
            </div>
          </>
        )}
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
