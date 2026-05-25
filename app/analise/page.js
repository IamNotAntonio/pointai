'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { FileText, ClipboardList, File, BookOpen, Search } from 'lucide-react'

/* ── Icons ── */
function IcUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function IcX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IcDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IcStar() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

/* ── Constants ── */
const ABAS = [
  { key: 'Prova',    Icon: FileText,      label: 'Prova',    desc: 'Diagnóstico completo com nota estimada e pontos a revisar' },
  { key: 'Tarefa',   Icon: ClipboardList, label: 'Tarefa',   desc: 'Feedback detalhado sobre acertos, erros e conceitos falhos' },
  { key: 'Trabalho', Icon: File,          label: 'Trabalho', desc: 'Análise acadêmica com sugestões de melhoria estruturadas' },
  { key: 'Anotação', Icon: BookOpen,      label: 'Anotação', desc: 'Verifique se suas anotações estão corretas e completas' },
]

const BAR = {
  green: 'bg-green-500',
  red:   'bg-red-500',
  amber: 'bg-amber-500',
  blue:  'bg-blue-500',
}

/* ── Helpers ── */
function tempoAtras(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function parseSections(text) {
  if (!text) return []
  const raw = text.split(/\n(?=## )/)
  if (raw.length === 1 && !raw[0].startsWith('## ')) return [{ title: '', content: text }]
  return raw
    .map(chunk => {
      if (!chunk.startsWith('## ')) return null
      const nl = chunk.indexOf('\n')
      return {
        title:   nl === -1 ? chunk.slice(3).trim() : chunk.slice(3, nl).trim(),
        content: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
      }
    })
    .filter(s => s && s.content)
}

function barColor(title) {
  if (title.includes('❌') || /erros?/i.test(title))               return BAR.red
  if (title.includes('⚠️') || /atenção|alerta|risco/i.test(title)) return BAR.amber
  if (title.includes('🗺️') || /plano|melhori/i.test(title))        return BAR.blue
  if (title.includes('✅') || /forte/i.test(title))                 return BAR.green
  return BAR.green
}

/* ── Component ── */
export default function Analise() {
  const [perfil, setPerfil]         = useState(null)
  const [materias, setMaterias]     = useState([])
  const [abaAtiva, setAbaAtiva]     = useState('Prova')
  const [texto, setTexto]           = useState('')
  const [imagem, setImagem]         = useState(null)
  const [materia, setMateria]       = useState('')
  const [resultado, setResultado]   = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]             = useState(null)
  const [analises, setAnalises]     = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function carregarPerfil() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        const lista = p.materias.split(',').map(m => m.trim()).filter(Boolean)
        setMaterias(lista)
        setMateria(lista[0] || '')
      }
    }
    carregarPerfil()
    try {
      const saved = JSON.parse(localStorage.getItem('pointai_analises') || '[]')
      setAnalises(saved)
    } catch {}
  }, [])

  function handlePerfilUpdate(novoPerf) {
    setPerfil(novoPerf)
    const lista = novoPerf.materias.split(',').map(m => m.trim()).filter(Boolean)
    setMaterias(lista)
  }

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagem({ dataUrl: ev.target.result, tipo: file.type, nome: file.name })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function trocarAba(aba) {
    setAbaAtiva(aba)
    setResultado(null)
    setErro(null)
  }

  async function analisar() {
    if (!perfil || carregando) return
    if (!texto.trim() && !imagem) { setErro('Envie uma imagem ou cole o texto para análise.'); return }
    setCarregando(true)
    setErro(null)
    setResultado(null)
    try {
      const body = { tipo: abaAtiva, texto, materia, perfil }
      if (imagem) { body.imagemBase64 = imagem.dataUrl.split(',')[1]; body.imagemTipo = imagem.tipo }
      const resp  = await fetch('/api/analisar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const dados = await resp.json()
      setResultado(dados.analise)
      if (dados.analise) {
        const novaAnalise = {
          tipo: abaAtiva,
          materia,
          preview: dados.analise.replace(/#{1,6}\s/g, '').replace(/\*+/g, '').slice(0, 140),
          timestamp: new Date().toISOString(),
        }
        setAnalises(prev => {
          const nova = [novaAnalise, ...prev].slice(0, 10)
          try { localStorage.setItem('pointai_analises', JSON.stringify(nova)) } catch {}
          return nova
        })
      }
    } catch {
      setErro('Erro ao analisar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  if (!perfil) return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-gray-400 dark:text-zinc-500">Carregando...</p>
    </div>
  )

  const abaConfig = ABAS.find(a => a.key === abaAtiva) || ABAS[0]
  const hasResult = resultado && !carregando
  const sections  = parseSections(resultado)

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} materias={materias} onPerfilUpdate={handlePerfilUpdate} />

      <div className="page-area">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point</span>
          <span className="page-breadcrumb-sep">›</span>
          <span className="page-breadcrumb-current">Análise de Materiais</span>
        </nav>

        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-2.5 flex-wrap" style={{ marginBottom: 0 }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Análise de Materiais</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
              <IcStar /> Pro
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            IA analisa sua prova ou tarefa com diagnóstico, erros e plano de melhoria
          </p>
        </div>

        <div className="page-scroll">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-fit mb-3">
            {ABAS.map(aba => (
              <button
                key={aba.key}
                onClick={() => trocarAba(aba.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer transition-all duration-150 ${
                  abaAtiva === aba.key
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm'
                    : 'bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                }`}
              >
                <aba.Icon size={14} strokeWidth={1.8} />
                {aba.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">{abaConfig.desc}</p>

          {/* Layout: always 2-col */}
          <div className="grid grid-cols-2 gap-5 items-start">

            {/* Left: input form */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={selecionarImagem}
                className="hidden"
              />

              {/* Upload zone or image preview */}
              {imagem ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 mb-4">
                  <img src={imagem.dataUrl} alt="Material" className="w-full max-h-52 object-contain bg-gray-50 dark:bg-zinc-800" />
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700">
                    <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">{imagem.nome}</span>
                    <button
                      onClick={() => setImagem(null)}
                      aria-label="Remover imagem"
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 border-0 cursor-pointer transition-colors"
                    >
                      <IcX />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-7 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors mb-4 bg-transparent group"
                >
                  <div className="flex justify-center mb-2.5 text-gray-400 dark:text-zinc-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    <IcUpload />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1">Arraste ou clique para enviar</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">Foto de prova, caderno ou lousa · JPG, PNG</p>
                </button>
              )}

              {/* OR divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
                <span className="text-xs text-gray-400 dark:text-zinc-500">ou cole o texto abaixo</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
              </div>

              {/* Textarea */}
              <textarea
                placeholder={`Cole aqui o conteúdo da ${abaAtiva.toLowerCase()}…`}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={6}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 resize-none outline-none focus:border-green-500 dark:focus:border-green-600 transition-colors"
              />

              {/* Matéria select */}
              <div className="flex items-center gap-3 mt-3">
                <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">Matéria</label>
                <select
                  value={materia}
                  onChange={e => setMateria(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:border-green-500 dark:focus:border-green-600 transition-colors"
                >
                  {materias.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Error */}
              {erro && (
                <p className="mt-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={analisar}
                disabled={carregando || (!texto.trim() && !imagem)}
                className="w-full mt-3.5 py-3 bg-gradient-to-br from-green-700 to-green-500 text-white text-sm font-semibold rounded-xl border-0 cursor-pointer transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analisando…
                  </>
                ) : (
                  <><Search size={14} strokeWidth={1.8} /> Analisar {abaAtiva}</>
                )}
              </button>
            </div>

            {/* Right: results */}
            {hasResult && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <abaConfig.Icon size={14} strokeWidth={1.8} /> Análise — {materia}
                  </span>
                  <button
                    onClick={() => gerarPDFChat({ conteudo: resultado, perfil, materia: `Análise de ${abaAtiva} — ${materia}` })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border-0 cursor-pointer transition-colors"
                  >
                    <IcDownload /> PDF
                  </button>
                </div>
                {sections.map((sec, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className={`h-0.5 ${barColor(sec.title)}`} />
                    <div className="p-5">
                      {sec.title && (
                        <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3">{sec.title}</p>
                      )}
                      <div className="text-sm text-gray-700 dark:text-zinc-300">
                        <RichMessage content={sec.content} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Right: loading skeleton */}
            {carregando && (
              <div className="flex flex-col gap-3">
                {[
                  { w: '40%', lines: 3 },
                  { w: '35%', lines: 2 },
                  { w: '45%', lines: 4 },
                  { w: '38%', lines: 3 },
                ].map((s, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="h-0.5 bg-gray-200 dark:bg-zinc-700 opacity-50" />
                    <div className="p-5">
                      <div className="skeleton h-3.5 rounded mb-3.5" style={{ width: s.w }} />
                      {Array.from({ length: s.lines }).map((_, j) => (
                        <div key={j} className="skeleton h-3 rounded mb-2" style={{ width: j === s.lines - 1 ? '70%' : '100%' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Right: "Como funciona" — shown when idle (no result, not loading) */}
            {!hasResult && !carregando && (
              <div className="flex flex-col gap-3">
                {/* Como funciona */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="h-0.5 bg-green-500" />
                  <div className="p-5">
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-4">Como funciona</p>
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          n: '1',
                          label: 'Escolha o tipo',
                          desc: 'Prova, tarefa, trabalho ou anotação',
                          icon: (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                            </svg>
                          ),
                        },
                        {
                          n: '2',
                          label: 'Envie o material',
                          desc: 'Foto ou texto colado diretamente',
                          icon: (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                          ),
                        },
                        {
                          n: '3',
                          label: 'IA analisa',
                          desc: 'Leitura profunda do conteúdo acadêmico',
                          icon: (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                          ),
                        },
                        {
                          n: '4',
                          label: 'Receba feedback',
                          desc: 'Diagnóstico estruturado e plano de ação',
                          icon: (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                          ),
                        },
                      ].map(({ n, label, desc, icon }) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, background: 'rgba(26,122,74,.1)', border: '1px solid rgba(26,122,74,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                            {icon}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{label}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* O que a IA identifica */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5">
                  <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3">O que a IA identifica</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { color: '#4ade80', label: 'Pontos fortes e acertos' },
                      { color: '#f87171', label: 'Erros e conceitos falhos' },
                      { color: '#fbbf24', label: 'Nota estimada com justificativa' },
                      { color: '#60a5fa', label: 'Plano de melhoria personalizado' },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Análises recentes ── */}
          {analises.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-4)', marginBottom: 10 }}>
                Análises recentes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analises.slice(0, 3).map((a, i) => {
                  const AbaIcon = ABAS.find(ab => ab.key === a.tipo)?.Icon || FileText
                  return (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                        <AbaIcon size={14} strokeWidth={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{a.tipo}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{a.materia}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>{tempoAtras(a.timestamp)}</span>
                        </div>
                        <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {a.preview}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Dicas de uso ── */}
          <div style={{ marginTop: 32, marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-4)', marginBottom: 12 }}>
              Dicas de uso
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { Icon: FileText,      title: 'Foto de prova',    desc: 'Tire uma foto da sua prova corrigida para um diagnóstico completo com nota estimada e pontos a revisar.' },
                { Icon: ClipboardList, title: 'Cole uma tarefa',   desc: 'Copie o enunciado e sua resposta para receber feedback detalhado sobre erros conceituais.' },
                { Icon: BookOpen,      title: 'Analise anotações', desc: 'Verifique se suas anotações de aula estão corretas e completas antes da próxima prova.' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', marginBottom: 10 }}>
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 5 }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
