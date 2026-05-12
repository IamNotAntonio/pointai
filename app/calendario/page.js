'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const TIPO_CONFIG = {
  prova:        { label: 'Prova',        cls: 'badge badge-red',    emoji: '📝' },
  trabalho:     { label: 'Trabalho',     cls: 'badge badge-blue',   emoji: '📄' },
  apresentacao: { label: 'Apresentação', cls: 'badge badge-purple', emoji: '🎤' },
  outro:        { label: 'Outro',        cls: 'badge badge-gray',   emoji: '📌' },
}

function diasRestantes(data) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const evento = new Date(data + 'T00:00:00')
  return Math.ceil((evento - hoje) / (1000 * 60 * 60 * 24))
}

function urgencyClass(dias) {
  if (dias < 0)  return 'past'
  if (dias <= 3)  return 'urgent'
  if (dias <= 7)  return 'warning'
  return ''
}

function formatDate(data) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function DayChip({ dias }) {
  if (dias < 0) return <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Passado</span>
  if (dias === 0) return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Hoje!</span>
  if (dias === 1) return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Amanhã!</span>
  const cor = dias <= 7 ? '#d97706' : 'var(--text-3)'
  return <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{dias}d</span>
}

export default function Calendario() {
  const [perfil, setPerfil] = useState(null)
  const [eventos, setEventos] = useState([])
  const [materias, setMaterias] = useState([])
  const [form, setForm] = useState({ titulo: '', data: '', tipo: 'prova', materia: '' })

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setForm(prev => ({ ...prev, materia: lista[0] }))
    }
    const e = localStorage.getItem('pointai_eventos')
    if (e) setEventos(JSON.parse(e))
  }, [])

  function salvarEvento() {
    if (!form.titulo || !form.data) return
    const novos = [...eventos, { ...form, id: Date.now() }]
      .sort((a, b) => new Date(a.data) - new Date(b.data))
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
    setForm({ titulo: '', data: '', tipo: 'prova', materia: materias[0] })
  }

  function removerEvento(id) {
    const novos = eventos.filter(e => e.id !== id)
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const proximos = eventos.filter(e => diasRestantes(e.data) >= 0)
  const passados = eventos.filter(e => diasRestantes(e.data) < 0).reverse()

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        <div className="page-header">
          <h1 className="page-title">Calendário Acadêmico</h1>
          <p className="page-subtitle">Suas provas, trabalhos e prazos em um só lugar</p>
        </div>

        <div className="page-scroll">

          {/* Adicionar evento */}
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="card-title">Adicionar evento</p>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Nome do evento</label>
                <input
                  type="text"
                  placeholder="Ex: Prova de Cálculo II"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm({ ...form, data: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="input"
                >
                  <option value="prova">📝 Prova</option>
                  <option value="trabalho">📄 Trabalho</option>
                  <option value="apresentacao">🎤 Apresentação</option>
                  <option value="outro">📌 Outro</option>
                </select>
              </div>
              <div>
                <label className="label">Matéria</label>
                <select
                  value={form.materia}
                  onChange={e => setForm({ ...form, materia: e.target.value })}
                  className="input"
                >
                  {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={salvarEvento}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              + Salvar evento
            </button>
          </div>

          {/* Próximos eventos */}
          {proximos.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
                Próximos eventos — {proximos.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {proximos.map(evento => {
                  const dias = diasRestantes(evento.data)
                  const tipo = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.outro
                  return (
                    <div key={evento.id} className={`event-item ${urgencyClass(dias)}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'var(--surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, flexShrink: 0
                        }}>
                          {tipo.emoji}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>
                            {evento.titulo}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={tipo.cls}>{tipo.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{evento.materia}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatDate(evento.data)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <DayChip dias={dias} />
                        <button
                          onClick={() => removerEvento(evento.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-4)', fontSize: 18, lineHeight: 1,
                            padding: '2px 4px', borderRadius: 6,
                          }}
                          aria-label="Remover"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {proximos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-4)' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
              <p style={{ fontWeight: 600, color: 'var(--text-3)' }}>Nenhum evento próximo</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Adicione suas provas e prazos acima</p>
            </div>
          )}

          {/* Passados */}
          {passados.length > 0 && (
            <div>
              <div className="divider" />
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Eventos passados
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {passados.map(evento => {
                  const tipo = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.outro
                  return (
                    <div key={evento.id} className="event-item past">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 15 }}>{tipo.emoji}</span>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{evento.titulo}</p>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>· {evento.materia}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{formatDate(evento.data)}</span>
                        <button
                          onClick={() => removerEvento(evento.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16 }}
                        >×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
