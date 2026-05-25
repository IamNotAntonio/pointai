'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import UpgradeModal from '../components/UpgradeModal'
import * as db from '../lib/db'
import { getPlanInfo, fetchPlano } from '../lib/plano'
import { Brain, RefreshCw, Download, AlertTriangle, CheckCircle, Clock, BookOpen, Sparkles, Lock } from 'lucide-react'

const DIA_ABREV = {
  'Segunda-feira': 'Seg',
  'Terça-feira': 'Ter',
  'Quarta-feira': 'Qua',
  'Quinta-feira': 'Qui',
  'Sexta-feira': 'Sex',
  'Sábado': 'Sáb',
  'Domingo': 'Dom',
}

const DIA_JS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PRIOR_COR = { alta: '#ef4444', media: '#f59e0b', baixa: '#22c55e' }

export default function PlanoEstudos() {
  const [tela, setTela] = useState('carregando')
  const [perfil, setPerfil] = useState(null)
  const [notas, setNotas] = useState(null)
  const [eventos, setEventos] = useState([])
  const [plano, setPlano] = useState(null)
  const [ehPro, setEhPro] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    async function init() {
      const [p, n, evs, pl] = await Promise.all([
        db.getPerfil(),
        db.getNotas(),
        db.getEventos(),
        fetchPlano(),
      ])
      setPerfil(p)
      setNotas(n)
      setEventos(evs)
      const isPro = pl === 'pro'
      setEhPro(isPro)

      try {
        const cached = JSON.parse(localStorage.getItem('pointai_plano_estudos') || 'null')
        if (cached && Date.now() - cached.timestamp < 7 * 24 * 3600 * 1000) {
          setPlano(cached.plano)
          setTela('plano')
          return
        }
      } catch {}

      if (p) await gerarPlano(p, n, evs, isPro)
      else setTela('erro')
    }
    init()
  }, [])

  async function gerarPlano(p, n, evs, isPro) {
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

      const hoje = new Date().toISOString().split('T')[0]
      const eventosFuturos = (evs || []).filter(e => e.data >= hoje).slice(0, 10)

      const resp = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: p, notas: n, eventos: eventosFuturos, historicoChat, ehPro: isPro }),
      })
      const data = await resp.json()
      if (data.erro || !data.dias) throw new Error(data.erro || 'Resposta inválida')

      setPlano(data)
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
    gerarPlano(perfil, notas, eventos, ehPro)
  }

  function exportarPDF() {
    window.print()
  }

  const hojeAbrev = DIA_JS_ABREV[new Date().getDay()]

  return (
    <div className="app-shell">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        @media print {
          .sidebar, .page-breadcrumb, .page-header .btn, button { display: none !important; }
          .page-area { padding: 0 !important; }
          .card { break-inside: avoid; }
        }
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
            <Brain size={40} style={{ color: 'var(--brand)', animation: 'pulse 2s infinite' }} />
            <p style={{ fontWeight: 700, color: 'var(--text-1)' }}>Analisando seu semestre...</p>
            <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', maxWidth: 300 }}>
              A IA está cruzando suas notas, eventos e histórico de chat
            </p>
          </div>
        )}

        {tela === 'erro' && (
          <div style={{ padding: '24px 0' }}>
            <div className="alert alert-yellow" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ color: 'var(--text-1)', fontSize: 14, flex: 1 }}>{erro || 'Não foi possível gerar o plano de estudos.'}</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => gerarPlano(perfil, notas, eventos, ehPro)}
              disabled={gerando}
            >
              <RefreshCw size={14} />
              Tentar novamente
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
                <button
                  className="btn btn-ghost"
                  onClick={atualizarPlano}
                  disabled={gerando}
                >
                  <RefreshCw size={14} style={gerando ? { animation: 'spin 1s linear infinite' } : {}} />
                  Atualizar plano
                </button>
                <button className="btn btn-ghost" onClick={exportarPDF}>
                  <Download size={14} />
                  Exportar PDF
                </button>
              </div>
            </div>

            <div className="page-scroll">
              <div className="card" style={{ background: 'rgba(26,122,74,.06)', border: '1px solid rgba(34,197,94,.2)', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Sparkles size={18} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, flex: 1 }}>{plano.resumo}</p>
                  <span className={ehPro ? 'badge badge-green' : 'badge badge-gray'} style={{ flexShrink: 0 }}>
                    {ehPro ? 'Pro' : 'Grátis'}
                  </span>
                </div>
              </div>

              {plano.alerta && ehPro && (
                <div className="card" style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{plano.alerta}</p>
                  </div>
                </div>
              )}

              {!ehPro && (
                <div className="card" style={{ border: '1px solid rgba(245,158,11,.3)', background: 'rgba(245,158,11,.04)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Lock size={18} style={{ color: '#f59e0b' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Plano detalhado exclusivo do Pro</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Assine o Pro para ver motivações por matéria, alertas de risco e sugestões personalizadas.</p>
                    </div>
                    <button
                      onClick={() => setShowUpgrade(true)}
                      className="btn btn-primary"
                      style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                    >
                      <Sparkles size={12} /> Ver planos
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
                {(plano.dias || []).map((dia, i) => {
                  const abrev = DIA_ABREV[dia.dia] || dia.dia.slice(0, 3)
                  const isHoje = abrev === hojeAbrev
                  return (
                    <div key={i} style={{ flex: '0 0 148px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: isHoje ? 'var(--brand)' : 'var(--surface-2)',
                        textAlign: 'center',
                      }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: isHoje ? '#fff' : 'var(--text-1)' }}>{abrev}</p>
                        <p style={{ fontSize: 11, color: isHoje ? 'rgba(255,255,255,.75)' : 'var(--text-4)' }}>{dia.data}</p>
                      </div>

                      {(!dia.sessoes || dia.sessoes.length === 0) ? (
                        <div style={{
                          background: 'var(--surface-2)',
                          borderRadius: 8,
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: 12,
                          color: 'var(--text-4)',
                        }}>
                          Descanso
                        </div>
                      ) : dia.sessoes.map((s, j) => (
                        <div key={j} style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                              {(s.materia || '').slice(0, 20)}
                            </p>
                            <span className="badge badge-gray" style={{ fontSize: 10, padding: '1px 5px' }}>{s.horas}h</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: PRIOR_COR[s.prioridade] || 'var(--text-4)',
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'capitalize' }}>{s.prioridade}</span>
                          </div>
                          {(s.topicos || []).slice(0, 2).map((t, k) => (
                            <p key={k} style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.4, marginBottom: 1 }}>· {t}</p>
                          ))}
                          {ehPro && s.motivo && (
                            <p style={{ fontSize: 10.5, color: 'var(--text-4)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>{s.motivo}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {plano.sugestoes?.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <p className="card-title">Dicas para a semana</p>
                  {plano.sugestoes.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < plano.sugestoes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <CheckCircle size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{s}</p>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', paddingBottom: 24 }}>
                Plano gerado em {new Date().toLocaleDateString('pt-BR')}. Dados baseados nas suas notas e calendário atuais.
              </p>
            </div>
          </>
        )}
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
