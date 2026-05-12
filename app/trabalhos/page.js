'use client'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'

const TIPOS = [
  { value: 'artigo',    label: 'Artigo científico' },
  { value: 'resenha',   label: 'Resenha' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'tcc',       label: 'TCC / Monografia' },
  { value: 'redacao',   label: 'Redação' },
  { value: 'outro',     label: 'Outro' },
]

export default function Trabalhos() {
  const [perfil, setPerfil] = useState(null)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('artigo')
  const [materia, setMateria] = useState('')
  const [materias, setMaterias] = useState([])
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateria(lista[0])
    }
  }, [])

  async function corrigir() {
    if (!texto.trim()) return
    setCarregando(true)
    setResultado(null)
    try {
      const resp = await fetch('/api/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, tipo, materia, perfil })
      })
      const dados = await resp.json()
      setResultado(dados.resultado)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        <div className="page-header">
          <h1 className="page-title">Correção de Trabalhos</h1>
          <p className="page-subtitle">Cole seu texto e receba feedback detalhado com nota estimada</p>
        </div>

        <div className="page-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: resultado ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

            {/* Formulário */}
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <p className="card-title">Configuração</p>
                <div className="grid-2">
                  <div>
                    <label className="label">Tipo de trabalho</label>
                    <select
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                      className="input"
                    >
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Matéria</label>
                    <select
                      value={materia}
                      onChange={e => setMateria(e.target.value)}
                      className="input"
                    >
                      {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p className="card-title" style={{ margin: 0 }}>Seu texto</p>
                  <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{texto.length} caracteres</span>
                </div>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="Cole aqui o texto do seu trabalho para receber feedback detalhado..."
                  rows={16}
                  className="input"
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              <button
                onClick={corrigir}
                disabled={carregando || !texto.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 18px', fontSize: 15 }}
              >
                {carregando ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                    Analisando seu trabalho…
                  </>
                ) : (
                  '🔍 Corrigir trabalho'
                )}
              </button>
            </div>

            {/* Resultado */}
            {resultado && (
              <div className="card" style={{ position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--brand)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, flexShrink: 0
                  }}>P</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Feedback do Point.AI</p>
                    <p style={{ fontSize: 11, color: 'var(--text-4)' }}>
                      {TIPOS.find(t => t.value === tipo)?.label} · {materia}
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)',
                  maxHeight: '70vh', overflowY: 'auto', paddingRight: 4
                }}>
                  <ReactMarkdown
                    components={{
                      h2: ({children}) => (
                        <h2 style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--text-1)',
                          margin: '16px 0 6px', paddingBottom: 4,
                          borderBottom: '1px solid var(--border)'
                        }}>{children}</h2>
                      ),
                      p: ({children}) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                      ul: ({children}) => <ul style={{ margin: '4px 0 10px 18px' }}>{children}</ul>,
                      li: ({children}) => <li style={{ marginBottom: 4 }}>{children}</li>,
                      strong: ({children}) => <strong style={{ fontWeight: 700, color: 'var(--text-1)' }}>{children}</strong>,
                    }}
                  >
                    {resultado}
                  </ReactMarkdown>
                </div>
                <div className="divider" />
                <button
                  onClick={() => { setResultado(null); setTexto('') }}
                  className="btn btn-ghost"
                  style={{ width: '100%', fontSize: 13 }}
                >
                  Nova correção
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
