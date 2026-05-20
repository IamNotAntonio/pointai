'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import UpgradeModal from '../components/UpgradeModal'
import * as db from '../lib/db'
import { getPlanInfo, fetchPlano } from '../lib/plano'
import { ClipboardList, Clock, CheckCircle, XCircle, RotateCcw, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'

/* ── Pro gate helpers ─────────────────────────────────────── */
function getSemanaKey() {
  const d = new Date()
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  return start.toISOString().split('T')[0]
}

function getUsoSemana() {
  try {
    const data = JSON.parse(localStorage.getItem('pointai_simulados_semana') || '{}')
    return data.semana === getSemanaKey() ? (data.count || 0) : 0
  } catch { return 0 }
}

function incrementarUso() {
  const semana = getSemanaKey()
  const data = JSON.parse(localStorage.getItem('pointai_simulados_semana') || '{}')
  const count = (data.semana === semana ? (data.count || 0) : 0) + 1
  localStorage.setItem('pointai_simulados_semana', JSON.stringify({ semana, count }))
}

/* ── Helpers ──────────────────────────────────────────────── */
function formatTempo(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0')
  const s = (segundos % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const DIFICULDADES = [
  { id: 'facil',  label: 'Fácil',  cor: '#22c55e', desc: 'Conceitos básicos e definições' },
  { id: 'medio',  label: 'Médio',  cor: '#f59e0b', desc: 'Aplicação prática e resolução de problemas' },
  { id: 'dificil',label: 'Difícil',cor: '#ef4444', desc: 'Análise crítica e raciocínio avançado' },
]

const NUM_QUESTOES = [5, 10, 15]
const TIMER_OPCOES = [10, 15, 20, 30]

const LETRAS = ['A', 'B', 'C', 'D']

function notaBadgeCls(nota) {
  const v = parseFloat(nota)
  if (v >= 7) return 'badge badge-green'
  if (v >= 5) return 'badge badge-yellow'
  return 'badge badge-red'
}

/* ── Component ────────────────────────────────────────────── */
export default function Simulado() {
  const [tela, setTela]           = useState('config')
  const [perfil, setPerfil]       = useState(null)
  const [materias, setMaterias]   = useState([])
  const [ehPro, setEhPro]         = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const [config, setConfig] = useState({
    materia: '',
    dificuldade: 'medio',
    numQuestoes: 10,
    timerAtivo: false,
    timerMinutos: 15,
  })

  const [questoes, setQuestoes]       = useState([])
  const [respostas, setRespostas]     = useState({})
  const [questaoAtual, setQuestaoAtual] = useState(0)
  const [tempo, setTempo]             = useState(0)
  const [inicioTempo, setInicioTempo] = useState(null)
  const [erro, setErro]               = useState(null)
  const [historico, setHistorico]     = useState([])

  const [acertos, setAcertos]         = useState(0)
  const [nota, setNota]               = useState('0.0')
  const [topicosEstudar, setTopicosEstudar] = useState([])
  const [tempoDecorrido, setTempoDecorrido] = useState(0)

  const timerRef = useRef(null)

  /* ── Init ── */
  useEffect(() => {
    async function init() {
      const [p] = await Promise.all([db.getPerfil()])
      if (p) {
        setPerfil(p)
        const lista = p.materias.split(',').map(m => m.trim()).filter(Boolean)
        setMaterias(lista)
        setConfig(c => ({ ...c, materia: lista[0] || '' }))
      }
      fetchPlano().then(pl => setEhPro(pl === 'pro'))
      try {
        const hist = JSON.parse(localStorage.getItem('pointai_simulados_hist') || '[]')
        setHistorico(hist.slice(0, 5))
      } catch {}
    }
    init()
  }, [])

  /* ── Timer ── */
  useEffect(() => {
    if (tela !== 'quiz' || !config.timerAtivo) return
    if (tempo <= 0) {
      finalizarSimulado()
      return
    }
    timerRef.current = setInterval(() => {
      setTempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [tela, config.timerAtivo, tempo === 0])

  /* ── Actions ── */
  async function gerarSimulado() {
    if (!ehPro && getUsoSemana() >= 2) { setShowUpgrade(true); return }
    setTela('carregando')
    setErro(null)
    setRespostas({})
    setQuestaoAtual(0)
    try {
      const resp = await fetch('/api/simulado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          materia: config.materia,
          dificuldade: config.dificuldade,
          numQuestoes: config.numQuestoes,
        }),
      })
      const data = await resp.json()
      if (data.erro || !data.questoes?.length) throw new Error(data.erro || 'Sem questões')
      setQuestoes(data.questoes)
      const agora = Date.now()
      setInicioTempo(agora)
      if (config.timerAtivo) setTempo(config.timerMinutos * 60)
      setTela('quiz')
      if (!ehPro) incrementarUso()
    } catch (e) {
      setErro(e.message || 'Erro ao gerar simulado')
      setTela('config')
    }
  }

  function finalizarSimulado() {
    clearInterval(timerRef.current)
    const decorrido = inicioTempo ? Math.floor((Date.now() - inicioTempo) / 1000) : 0
    setTempoDecorrido(decorrido)
    const ac = questoes.filter((q, i) => respostas[i] === q.resposta_correta).length
    const n = ((ac / questoes.length) * 10).toFixed(1)
    const topicosFiltro = questoes
      .filter((q, i) => respostas[i] !== q.resposta_correta)
      .map(q => q.enunciado.slice(0, 60))
    setAcertos(ac)
    setNota(n)
    setTopicosEstudar(topicosFiltro)
    try {
      const hist = JSON.parse(localStorage.getItem('pointai_simulados_hist') || '[]')
      hist.unshift({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        materia: config.materia,
        dificuldade: config.dificuldade,
        numQuestoes: questoes.length,
        acertos: ac,
        nota: n,
      })
      localStorage.setItem('pointai_simulados_hist', JSON.stringify(hist.slice(0, 20)))
      setHistorico(hist.slice(0, 5))
    } catch {}
    setTela('resultado')
  }

  function responder(letra) {
    setRespostas(r => ({ ...r, [questaoAtual]: letra }))
  }

  function voltarConfig() {
    clearInterval(timerRef.current)
    setTela('config')
    setQuestoes([])
    setRespostas({})
    setQuestaoAtual(0)
    setTempo(0)
  }

  const usoSemana = typeof window !== 'undefined' ? getUsoSemana() : 0
  const restantes = 2 - usoSemana

  if (!perfil) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point.AI</span>
          <span className="page-breadcrumb-sep">›</span>
          <span className="page-breadcrumb-current">Simulado Inteligente</span>
        </nav>

        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Simulado Inteligente</h1>
          <p className="page-subtitle">Teste seus conhecimentos com questões geradas por IA</p>
        </div>

        <div className="page-scroll">

          {/* ── Tela: config ── */}
          {tela === 'config' && (
            <>
              {/* Uso semanal — apenas free */}
              {!ehPro && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid',
                    fontSize: 13.5,
                    marginBottom: 20,
                    ...(restantes > 0
                      ? { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }
                      : { background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }),
                  }}
                >
                  <ClipboardList size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span>
                    {restantes > 0
                      ? <><strong>{restantes}/2</strong> simulados restantes esta semana</>
                      : <><strong>0/2</strong> simulados restantes — limite semanal atingido. Assine o Pro para ilimitados.</>
                    }
                  </span>
                </div>
              )}

              {/* Form card */}
              <div className="card" style={{ marginBottom: 20 }}>
                {/* Matéria */}
                <div style={{ marginBottom: 20 }}>
                  <label className="label">Matéria</label>
                  <select
                    className="input"
                    value={config.materia}
                    onChange={e => setConfig(c => ({ ...c, materia: e.target.value }))}
                  >
                    {materias.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Dificuldade */}
                <div style={{ marginBottom: 20 }}>
                  <label className="label">Dificuldade</label>
                  <div className="grid-3" style={{ gap: 10 }}>
                    {DIFICULDADES.map(d => {
                      const sel = config.dificuldade === d.id
                      return (
                        <button
                          key={d.id}
                          onClick={() => setConfig(c => ({ ...c, dificuldade: d.id }))}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 'var(--radius)',
                            border: `2px solid ${sel ? d.cor : 'var(--border)'}`,
                            background: sel ? `${d.cor}14` : 'var(--surface-2)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all .15s',
                            fontFamily: 'inherit',
                          }}
                        >
                          <p style={{ fontSize: 14, fontWeight: 700, color: d.cor, marginBottom: 3 }}>{d.label}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4 }}>{d.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Nº questões */}
                <div style={{ marginBottom: 20 }}>
                  <label className="label">Número de questões</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {NUM_QUESTOES.map(n => {
                      const sel = config.numQuestoes === n
                      return (
                        <button
                          key={n}
                          onClick={() => setConfig(c => ({ ...c, numQuestoes: n }))}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            borderRadius: 'var(--radius)',
                            border: `2px solid ${sel ? 'var(--brand)' : 'var(--border)'}`,
                            background: sel ? 'var(--brand-light)' : 'var(--surface-2)',
                            cursor: 'pointer',
                            fontSize: 15,
                            fontWeight: 700,
                            color: sel ? 'var(--brand)' : 'var(--text-2)',
                            transition: 'all .15s',
                            fontFamily: 'inherit',
                          }}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Timer toggle */}
                <style>{`
                  @keyframes timerTick {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  .timer-btn { transition: background .2s, border-color .2s, color .2s; }
                  .timer-btn:hover { filter: brightness(1.08); }
                `}</style>
                <div style={{ marginBottom: 24 }}>
                  <label className="label">Timer</label>
                  <button
                    className="timer-btn"
                    onClick={() => setConfig(c => ({ ...c, timerAtivo: !c.timerAtivo }))}
                    title="Ativar cronômetro"
                    aria-label="Ativar cronômetro"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${config.timerAtivo ? 'var(--brand)' : 'var(--border)'}`,
                      background: config.timerAtivo ? 'var(--brand)' : 'var(--surface-2)',
                      color: config.timerAtivo ? '#fff' : 'var(--text-2)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Clock
                      size={16}
                      strokeWidth={1.8}
                      style={config.timerAtivo
                        ? { animation: 'timerTick 3s linear infinite', flexShrink: 0 }
                        : { flexShrink: 0 }
                      }
                    />
                    Timer
                    {config.timerAtivo && (
                      <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.88 }}>· Ativo</span>
                    )}
                  </button>

                  {config.timerAtivo && (
                    <div>
                      <label className="label">Duração (minutos)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {TIMER_OPCOES.map(min => {
                          const sel = config.timerMinutos === min
                          return (
                            <button
                              key={min}
                              onClick={() => setConfig(c => ({ ...c, timerMinutos: min }))}
                              style={{
                                flex: 1,
                                padding: '9px 0',
                                borderRadius: 'var(--radius)',
                                border: `2px solid ${sel ? 'var(--brand)' : 'var(--border)'}`,
                                background: sel ? 'var(--brand-light)' : 'var(--surface-2)',
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 700,
                                color: sel ? 'var(--brand)' : 'var(--text-2)',
                                transition: 'all .15s',
                                fontFamily: 'inherit',
                              }}
                            >
                              {min}min
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Erro */}
                {erro && (
                  <div className="alert alert-red" style={{ marginBottom: 16 }}>
                    <XCircle size={16} strokeWidth={1.8} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <p>{erro}</p>
                  </div>
                )}

                {/* CTA */}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={gerarSimulado}
                  disabled={!config.materia}
                >
                  <ClipboardList size={16} strokeWidth={1.8} />
                  Gerar simulado
                </button>
              </div>

              {/* Histórico */}
              {historico.length > 0 && (
                <div className="card">
                  <p className="card-title">Últimos simulados</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {historico.map((h, i) => (
                      <div
                        key={h.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '11px 0',
                          borderBottom: i < historico.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{h.materia}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2 }}>
                            {h.data} · {h.dificuldade} · {h.acertos}/{h.numQuestoes} acertos
                          </p>
                        </div>
                        <span className={notaBadgeCls(h.nota)}>{h.nota}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tela: carregando ── */}
          {tela === 'carregando' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 340,
              gap: 20,
            }}>
              <svg
                style={{ animation: 'spin .9s linear infinite', width: 40, height: 40, color: 'var(--brand)' }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".2" />
                <path fill="currentColor" opacity=".8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p style={{ fontSize: 15, color: 'var(--text-3)', fontWeight: 500 }}>
                Gerando simulado personalizado...
              </p>
            </div>
          )}

          {/* ── Tela: quiz ── */}
          {tela === 'quiz' && questoes.length > 0 && (
            <>
              {/* Progresso + timer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
                      Questão {questaoAtual + 1} de {questoes.length}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
                      {Object.keys(respostas).length} respondidas
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill progress-green"
                      style={{ width: `${((questaoAtual + 1) / questoes.length) * 100}%`, transition: 'width .3s' }}
                    />
                  </div>
                </div>

                {config.timerAtivo && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius)',
                    background: tempo < 60 ? '#fef2f2' : 'var(--surface)',
                    border: `1px solid ${tempo < 60 ? '#fecaca' : 'var(--border)'}`,
                    flexShrink: 0,
                  }}>
                    <Clock size={14} strokeWidth={1.8} style={{ color: tempo < 60 ? '#dc2626' : 'var(--text-3)' }} />
                    <span style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: tempo < 60 ? '#dc2626' : 'var(--text-1)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatTempo(tempo)}
                    </span>
                  </div>
                )}
              </div>

              {/* Questão card */}
              <div className="card" style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-4)', marginBottom: 10 }}>
                  Questão {questaoAtual + 1}
                </p>
                <p style={{ fontSize: 15.5, color: 'var(--text-1)', lineHeight: 1.65, marginBottom: 22, fontWeight: 500 }}>
                  {questoes[questaoAtual]?.enunciado}
                </p>

                {/* Alternativas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {LETRAS.map(letra => {
                    const texto = questoes[questaoAtual]?.alternativas?.[letra]
                    const selecionada = respostas[questaoAtual] === letra
                    if (!texto) return null
                    return (
                      <button
                        key={letra}
                        onClick={() => responder(letra)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '13px 16px',
                          borderRadius: 'var(--radius)',
                          border: `2px solid ${selecionada ? 'var(--brand)' : 'var(--border)'}`,
                          background: selecionada ? 'var(--brand-light)' : 'var(--surface-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'border-color .12s, background .12s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => {
                          if (!selecionada) e.currentTarget.style.background = 'var(--surface-3)'
                        }}
                        onMouseLeave={e => {
                          if (!selecionada) e.currentTarget.style.background = 'var(--surface-2)'
                        }}
                      >
                        <span style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: selecionada ? 'var(--brand)' : 'var(--surface)',
                          border: `1.5px solid ${selecionada ? 'var(--brand)' : 'var(--border-2)'}`,
                          color: selecionada ? '#fff' : 'var(--text-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11.5,
                          fontWeight: 700,
                          flexShrink: 0,
                          transition: 'all .12s',
                        }}>
                          {letra}
                        </span>
                        <span style={{ fontSize: 14.5, color: 'var(--text-1)', lineHeight: 1.6, paddingTop: 1 }}>
                          {texto}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navegação */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setQuestaoAtual(q => Math.max(0, q - 1))}
                  disabled={questaoAtual === 0}
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                  Anterior
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={finalizarSimulado}
                  disabled={Object.keys(respostas).length === 0}
                >
                  Entregar simulado
                </button>

                {questaoAtual < questoes.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setQuestaoAtual(q => Math.min(questoes.length - 1, q + 1))}
                  >
                    Próxima
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={finalizarSimulado}
                    disabled={Object.keys(respostas).length === 0}
                  >
                    Finalizar
                    <CheckCircle size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── Tela: resultado ── */}
          {tela === 'resultado' && (
            <>
              {/* Stat cards */}
              <div className="grid-3" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <p className="stat-value" style={{ color: acertos / questoes.length >= 0.6 ? 'var(--brand)' : '#ef4444' }}>
                    {acertos}/{questoes.length}
                  </p>
                  <p className="stat-label">Acertos</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value" style={{
                    color: parseFloat(nota) >= 7 ? 'var(--brand)'
                      : parseFloat(nota) >= 5 ? '#f59e0b'
                      : '#ef4444',
                  }}>
                    {nota}
                  </p>
                  <p className="stat-label">Nota</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value" style={{ color: 'var(--text-2)', fontSize: 22 }}>
                    {formatTempo(tempoDecorrido)}
                  </p>
                  <p className="stat-label">Tempo</p>
                </div>
              </div>

              {/* Alerta de tópicos */}
              {topicosEstudar.length > 0 && (
                <div className="alert alert-yellow" style={{ marginBottom: 20 }}>
                  <Trophy size={18} strokeWidth={1.8} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 6 }}>Tópicos para revisar:</p>
                    <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {topicosEstudar.map((t, i) => (
                        <li key={i} style={{ fontSize: 13 }}>{t}…</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Gabarito */}
              <div className="card" style={{ marginBottom: 20 }}>
                <p className="card-title">Gabarito comentado</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {questoes.map((q, i) => {
                    const acertou = respostas[i] === q.resposta_correta
                    const naoRespondeu = respostas[i] === undefined
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '16px 0',
                          borderBottom: i < questoes.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          {acertou
                            ? <CheckCircle size={18} strokeWidth={1.8} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                            : <XCircle size={18} strokeWidth={1.8} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                          }
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, lineHeight: 1.55 }}>
                              {q.enunciado.slice(0, 80)}{q.enunciado.length > 80 ? '…' : ''}
                            </p>
                            {!acertou && (
                              <p style={{ fontSize: 12.5, color: '#ef4444', marginTop: 5 }}>
                                Sua resposta: <strong>{naoRespondeu ? '—' : respostas[i]}</strong>
                                {' '}·{' '}
                                Correta: <strong style={{ color: '#22c55e' }}>{q.resposta_correta}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                        <div style={{
                          marginLeft: 28,
                          padding: '10px 14px',
                          background: 'var(--surface-2)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: `3px solid ${acertou ? '#22c55e' : '#ef4444'}`,
                        }}>
                          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--text-2)' }}>Explicação:</strong> {q.explicacao}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={voltarConfig} style={{ flex: 1, justifyContent: 'center' }}>
                  <RotateCcw size={15} strokeWidth={1.8} />
                  Voltar para configuração
                </button>
                <button
                  className="btn btn-primary"
                  onClick={gerarSimulado}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <ClipboardList size={15} strokeWidth={1.8} />
                  Novo simulado
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
