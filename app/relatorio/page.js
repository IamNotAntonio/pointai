'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { fetchPlano } from '../lib/plano'
import { ClipboardList, Rocket, Sparkles } from 'lucide-react'

/* ── Icons ────────────────────────────────────────────────────── */
function IcBarChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function IcAlertTriangle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IcTarget() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}
function IcMessage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IcStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function IcRefresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
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

/* ── Constants ────────────────────────────────────────────────── */
const BENEFITS = [
  { Icon: IcBarChart,       name: 'Análise por matéria',    desc: 'Média, faltas e risco de reprovação' },
  { Icon: IcAlertTriangle,  name: 'Alertas de risco',       desc: 'Notas baixas e faltas no limite' },
  { Icon: IcTarget,         name: 'Plano de ação',          desc: '5 tarefas priorizadas para a semana' },
  { Icon: IcMessage,        name: 'Mensagem personalizada', desc: 'Motivação baseada no seu objetivo' },
]

const GEN_PREVIEW = [
  'Panorama geral do seu desempenho',
  'Análise individual de cada matéria',
  'Alertas de risco — notas e faltas',
  '5 ações priorizadas para a próxima semana',
  'Mensagem motivacional personalizada',
]

/* ── Section helpers ──────────────────────────────────────────── */
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
    .filter(Boolean)
    .filter(s => s.content)
}

// Full Tailwind class strings — scanner picks these up
const BAR = {
  green:  'bg-green-500',
  red:    'bg-red-500',
  amber:  'bg-amber-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
}

function barClass(title) {
  if (/erros?/i.test(title))                return BAR.red
  if (/atenção|alerta|risco/i.test(title))  return BAR.amber
  if (/próxima semana/i.test(title))        return BAR.purple
  if (/matéria/i.test(title))               return BAR.blue
  return BAR.green
}

/* ── Component ────────────────────────────────────────────────── */
export default function Relatorio() {
  const [perfil, setPerfil]           = useState(null)
  const [materias, setMaterias]       = useState([])
  const [relatorio, setRelatorio]     = useState(null)
  const [carregando, setCarregando]   = useState(false)
  const [pro, setPro]                 = useState(false)
  const [dataGeracao, setDataGeracao] = useState(null)

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        setMaterias(p.materias.split(',').map(m => m.trim()).filter(Boolean))
      }
      const plano = await fetchPlano()
      setPro(plano === 'pro')
    }
    carregar()
  }, [])

  function handlePerfilUpdate(novoPerf) {
    setPerfil(novoPerf)
    setMaterias(novoPerf.materias.split(',').map(m => m.trim()).filter(Boolean))
  }

  async function gerarRelatorio() {
    if (!perfil || carregando) return
    setCarregando(true)
    setRelatorio(null)
    try {
      const notas   = JSON.parse(localStorage.getItem('pointai_notas')  || 'null')
      const eventos = JSON.parse(localStorage.getItem('pointai_eventos') || '[]')
      const resp = await fetch('/api/relatorio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ perfil, notas, eventos }),
      })
      const dados = await resp.json()
      setRelatorio(dados.relatorio)
      setDataGeracao(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))
    } catch (e) { console.error(e) }
    finally { setCarregando(false) }
  }

  if (!perfil) return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-zinc-500">Carregando...</p>
    </div>
  )

  const sections = parseSections(relatorio)

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} materias={materias} onPerfilUpdate={handlePerfilUpdate} />

      <div className="page-area">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point.AI</span>
          <span className="page-breadcrumb-sep">›</span>
          <span className="page-breadcrumb-current">Relatório Semanal</span>
        </nav>

        <div className="page-header">
          <h1 className="page-title">Relatório Semanal</h1>
          <p className="page-subtitle">Análise completa do seu desempenho com plano de ação</p>
        </div>

        <div className="page-scroll">

          {/* ── Pro gate ────────────────────────────────────────────── */}
          {!pro && (
            <div className="max-w-[560px] mx-auto">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl dark:shadow-black/40">

                {/* Gradient top bar */}
                <div className="h-1 bg-gradient-to-r from-green-700 via-green-500 to-emerald-400" />

                <div className="px-10 pt-10 pb-9 text-center">
                  {/* Crown icon */}
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 mb-5">
                    <IcStar />
                  </div>

                  <h2 className="text-[22px] font-bold text-gray-900 dark:text-zinc-100 mb-2">
                    Relatório Semanal Pro
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mb-7 max-w-[380px] mx-auto">
                    Receba toda semana uma análise completa do seu desempenho com plano de ação personalizado pela IA.
                  </p>

                  {/* Benefits 2×2 grid */}
                  <div className="grid grid-cols-2 gap-2.5 mb-7">
                    {BENEFITS.map(({ Icon, name, desc }) => (
                      <div
                        key={name}
                        className="bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-3.5 flex gap-3 items-start text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900 text-green-700 dark:text-green-400">
                          <Icon />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 mb-0.5">{name}</p>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-snug">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <span className="text-5xl font-black text-gray-900 dark:text-zinc-100">R$14</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100">,90</span>
                    <span className="text-sm text-gray-400 dark:text-zinc-500 ml-1.5">/mês</span>
                  </div>

                  {/* CTA button */}
                  <button className="w-full max-w-xs mx-auto py-3.5 bg-gradient-to-br from-green-700 to-green-500 text-white text-[15px] font-semibold rounded-xl border-0 cursor-pointer transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5 active:scale-[.98] mb-3 flex items-center justify-center gap-2">
                    <Sparkles size={16} strokeWidth={1.8} /> Assinar Pro agora
                  </button>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">
                    Cancele quando quiser · Pagamento integrado em breve
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Generate state ───────────────────────────────────────── */}
          {pro && !relatorio && !carregando && (
            <div className="max-w-[500px] mx-auto">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl px-10 py-12 text-center">
                <div className="flex justify-center mb-4 text-gray-300 dark:text-zinc-600">
                  <ClipboardList size={52} strokeWidth={1.2} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2.5">
                  Gerar relatório da semana
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mb-6">
                  A IA analisa suas notas, faltas e próximas provas para montar um plano personalizado.
                </p>

                {/* Preview list */}
                <div className="flex flex-col gap-2 mb-7 text-left">
                  {GEN_PREVIEW.map(item => (
                    <div
                      key={item}
                      className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-zinc-400">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={gerarRelatorio}
                  className="w-full py-3.5 bg-gradient-to-br from-green-700 to-green-500 text-white text-[15px] font-semibold rounded-xl border-0 cursor-pointer transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5 active:scale-[.98] flex items-center justify-center gap-2"
                >
                  <Rocket size={16} strokeWidth={1.8} /> Gerar relatório
                </button>
              </div>
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────────── */}
          {carregando && (
            <div className="flex flex-col gap-3.5">
              {[[45, 3], [35, 4], [40, 3], [50, 5], [30, 2]].map(([w, lines], i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
                >
                  <div className="h-0.5 bg-green-500 opacity-20" />
                  <div className="p-5">
                    <div className="skeleton mb-4 h-3.5 rounded" style={{ width: `${w}%` }} />
                    {Array.from({ length: lines }).map((_, j) => (
                      <div
                        key={j}
                        className="skeleton mb-2 h-3 rounded"
                        style={{ width: j === lines - 1 ? '60%' : '100%' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Result ──────────────────────────────────────────────── */}
          {relatorio && !carregando && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">Relatório Semanal</p>
                  {dataGeracao && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Gerado em {dataGeracao}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={gerarRelatorio}
                    className="btn btn-ghost flex items-center gap-1.5 text-xs"
                  >
                    <IcRefresh /> Regenerar
                  </button>
                  <button
                    onClick={() => gerarPDFChat({ conteudo: relatorio, perfil, materia: 'Relatório Semanal' })}
                    className="btn btn-ghost flex items-center gap-1.5 text-xs"
                  >
                    <IcDownload /> PDF
                  </button>
                </div>
              </div>

              {/* Section cards */}
              <div className="flex flex-col gap-3.5">
                {sections.map((sec, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
                  >
                    <div className={`h-0.5 ${barClass(sec.title)}`} />
                    <div className="p-5">
                      {sec.title && (
                        <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3">
                          {sec.title}
                        </p>
                      )}
                      <div className="text-sm text-gray-700 dark:text-zinc-300">
                        <RichMessage content={sec.content} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
