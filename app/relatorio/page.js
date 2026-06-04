'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import UpgradeModal from '../components/UpgradeModal'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { fetchPlano } from '../lib/plano'
import {
  ClipboardList, Rocket, Sparkles, RefreshCw, Download, AlertTriangle,
  TrendingUp, CalendarDays, AlertCircle, Trophy, Target, MessageSquare,
  FileText, Brain, PenLine, ArrowRight, Lock,
} from 'lucide-react'

/* ── Ferramenta → ação (mesmo plumbing do /plano) ─────────────── */
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

function abrirChat(router, materia, texto) {
  const m = materia && materia !== 'geral' ? materia : 'geral'
  try { localStorage.setItem('pointai_chat_prefill', JSON.stringify({ materia: m, texto })) } catch {}
  router.push(m !== 'geral' ? `/dashboard?materia=${encodeURIComponent(m)}` : '/dashboard')
}

/* ── Tipo de seção → identidade visual ────────────────────────── */
// Cada tipo tem cor, ícone e rótulo. A cor segue os mesmos tokens já usados
// em outras telas (verde brand pra positivo, âmbar pra atenção, roxo pra
// próxima semana). Bem distintos pra que o aluno pegue o "tom" da seção
// só de bater o olho.
const TIPO_SECAO = {
  destaque: {
    Icon: Trophy,
    label: 'Destaque',
    cor: '#22c55e',
    bg: 'rgba(34,197,94,.10)',
    bgSoft: 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(34,197,94,.02))',
    borda: 'rgba(34,197,94,.28)',
  },
  atencao: {
    Icon: AlertTriangle,
    label: 'Atenção',
    cor: '#f59e0b',
    bg: 'rgba(245,158,11,.10)',
    bgSoft: 'linear-gradient(135deg, rgba(245,158,11,.08), rgba(245,158,11,.02))',
    borda: 'rgba(245,158,11,.28)',
  },
  proxima_semana: {
    Icon: Target,
    label: 'Próxima semana',
    cor: '#a855f7',
    bg: 'rgba(168,85,247,.10)',
    bgSoft: 'linear-gradient(135deg, rgba(168,85,247,.08), rgba(168,85,247,.02))',
    borda: 'rgba(168,85,247,.28)',
  },
}

/* ── Markdown derivado pro PDF (mantém compatibilidade) ───────── */
// gerarPDFChat espera uma string. O JSON novo é serializado num markdown
// equivalente ao que a IA antiga retornava, pra que o PDF continue legível
// sem precisarmos tocar em pdfExport.js.
function relatorioParaMarkdown(rel) {
  if (!rel) return ''
  const linhas = []
  if (rel.periodo) linhas.push(`Período: ${rel.periodo}`, '')
  const ind = rel.indicadores || {}
  if (ind.media_geral != null || ind.provas_proximas != null || ind.materias_em_risco != null) {
    linhas.push('## Indicadores da semana')
    if (ind.media_geral != null) linhas.push(`- Média geral: ${ind.media_geral.toFixed(1)}`)
    if (ind.provas_proximas != null) linhas.push(`- Provas/eventos nos próximos 7 dias: ${ind.provas_proximas}`)
    if (ind.materias_em_risco != null) linhas.push(`- Matérias em risco: ${ind.materias_em_risco}`)
    linhas.push('')
  }
  for (const s of rel.secoes || []) {
    linhas.push(`## ${s.titulo}`)
    linhas.push(s.texto, '')
  }
  if (rel.recomendacoes?.length) {
    linhas.push('## Recomendações')
    for (const r of rel.recomendacoes) {
      linhas.push(`- ${r.texto} (${r.rotulo_acao})`)
    }
  }
  return linhas.join('\n')
}

/* ── Component ────────────────────────────────────────────────── */
export default function Relatorio() {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [perfil, setPerfil]           = useState(null)
  const [materias, setMaterias]       = useState([])
  const [relatorio, setRelatorio]     = useState(null)
  const [carregando, setCarregando]   = useState(false)
  const [pro, setPro]                 = useState(false)
  const [erro, setErro]               = useState(null)
  const [dataGeracao, setDataGeracao] = useState(null)
  const [aba, setAba]                 = useState('semana')
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        setMaterias((p.materias || '').split(',').map(m => m.trim()).filter(Boolean))
      }
      const plano = await fetchPlano()
      setPro(plano === 'pro')
    }
    carregar()
  }, [])

  function handlePerfilUpdate(novoPerf) {
    setPerfil(novoPerf)
    setMaterias((novoPerf.materias || '').split(',').map(m => m.trim()).filter(Boolean))
  }

  async function gerarRelatorio() {
    if (!perfil || carregando) return
    setCarregando(true)
    setErro(null)
    setRelatorio(null)
    try {
      // Notas (modelo novo: materias_aluno + avaliacoes), faltas e eventos
      // são lidos do Supabase pela sessão DENTRO da rota (fonte de verdade
      // server-side, anti-spoof) — o cliente não envia esses dados.
      const resp = await fetch('/api/relatorio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({}),
      })
      const dados = await resp.json()
      if (dados.error || dados.erro) throw new Error(dados.erro || dados.error)
      setRelatorio(dados.relatorio)
      setDataGeracao(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))
    } catch (e) {
      setErro(e?.message || 'Não foi possível gerar o relatório.')
    } finally {
      setCarregando(false)
    }
  }

  function exportarPDF() {
    if (!relatorio) return
    gerarPDFChat({
      conteudo: relatorioParaMarkdown(relatorio),
      perfil,
      materia: 'Relatório Semanal',
    })
  }

  if (!perfil) return (
    <div className="app-shell">
      <div className="page-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <style>{RELATORIO_CSS}</style>

      <Sidebar perfil={perfil} materias={materias} onPerfilUpdate={handlePerfilUpdate} />

      <div className="page-area">
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point</span>
          <span className="page-breadcrumb-sep">/</span>
          <span className="page-breadcrumb-current">Relatório</span>
        </nav>

        <div className="page-header">
          <div>
            <h1 className="page-title">Relatório</h1>
            <p className="page-subtitle">Análise do seu desempenho com plano de ação</p>
          </div>
          {pro && relatorio && !carregando && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={gerarRelatorio} disabled={carregando}>
                <RefreshCw size={14} /> Regenerar
              </button>
              <button className="btn btn-ghost" onClick={exportarPDF}>
                <Download size={14} /> Exportar PDF
              </button>
            </div>
          )}
        </div>

        <div className="page-scroll">
          {/* Abas Semana | Mês (Mês desabilitado por enquanto) */}
          <div className="rel-tabs" role="tablist" aria-label="Período do relatório">
            <button
              role="tab"
              aria-selected={aba === 'semana'}
              className={`rel-tab ${aba === 'semana' ? 'active' : ''}`}
              onClick={() => setAba('semana')}
            >
              Semana
            </button>
            <button
              role="tab"
              aria-selected={false}
              className="rel-tab"
              disabled
              title="Disponível em breve"
            >
              Mês <span className="rel-tab-soon">em breve</span>
            </button>
          </div>

          {/* ── Pro gate (UpgradeModal global) ─────────────────────── */}
          {!pro && (
            <ProGate onAssinar={() => setShowUpgrade(true)} reduce={reduce} />
          )}

          {/* ── Generate state ─────────────────────────────────────── */}
          {pro && !relatorio && !carregando && !erro && (
            <GenerateState onGerar={gerarRelatorio} reduce={reduce} />
          )}

          {/* ── Loading ────────────────────────────────────────────── */}
          {pro && carregando && <LoadingSkeleton reduce={reduce} />}

          {/* ── Erro ───────────────────────────────────────────────── */}
          {erro && !carregando && (
            <div className="rel-erro" role="alert">
              <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ flex: 1 }}>{erro}</p>
              <button className="btn btn-primary" onClick={gerarRelatorio}>
                <RefreshCw size={14} /> Tentar novamente
              </button>
            </div>
          )}

          {/* ── Resultado ──────────────────────────────────────────── */}
          {pro && relatorio && !carregando && (
            <Resultado
              relatorio={relatorio}
              dataGeracao={dataGeracao}
              router={router}
              reduce={reduce}
            />
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}

/* ── Pro gate (usa UpgradeModal — sem hard-code de preço) ─────── */
function ProGate({ onAssinar, reduce }) {
  return (
    <motion.div
      className="rel-gate"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rel-gate-icon">
        <Lock size={22} strokeWidth={1.7} />
      </div>
      <h2 className="rel-gate-title">Relatório Semanal Pro</h2>
      <p className="rel-gate-sub">
        Toda semana, a IA cruza suas notas, faltas e próximas provas pra te entregar uma
        análise completa com indicadores, alertas e plano de ação.
      </p>

      <div className="rel-gate-bullets">
        {[
          { Icon: TrendingUp, txt: 'Indicadores chave: média geral, provas próximas, matérias em risco' },
          { Icon: AlertTriangle, txt: 'Alertas reais sobre notas baixas e faltas no limite' },
          { Icon: Target, txt: 'Plano de ação personalizado pra próxima semana' },
          { Icon: Sparkles, txt: 'Recomendações que puxam pras ferramentas do Point' },
        ].map(({ Icon, txt }, i) => (
          <motion.div
            key={i}
            className="rel-gate-bullet"
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : 0.08 + i * 0.06 }}
          >
            <Icon size={14} strokeWidth={1.8} style={{ color: '#22c55e', flexShrink: 0 }} />
            <span>{txt}</span>
          </motion.div>
        ))}
      </div>

      <button className="btn btn-primary rel-gate-cta" onClick={onAssinar}>
        <Sparkles size={14} /> Ver planos Pro
      </button>
    </motion.div>
  )
}

/* ── Estado "gerar" ───────────────────────────────────────────── */
function GenerateState({ onGerar, reduce }) {
  const bullets = [
    'Panorama do seu desempenho',
    'Indicadores chave da semana',
    'Alertas de risco em tempo real',
    'Plano de ação pra próxima semana',
    'Atalhos pras ferramentas do Point',
  ]
  return (
    <motion.div
      className="rel-gen"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rel-gen-icon">
        <ClipboardList size={36} strokeWidth={1.4} />
      </div>
      <h2 className="rel-gen-title">Gerar relatório da semana</h2>
      <p className="rel-gen-sub">
        A IA analisa suas notas, faltas e próximas provas pra montar um plano personalizado.
      </p>
      <div className="rel-gen-bullets">
        {bullets.map((b, i) => (
          <motion.div
            key={b}
            className="rel-gen-bullet"
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, delay: reduce ? 0 : 0.05 + i * 0.05 }}
          >
            <span className="rel-gen-dot" />
            <span>{b}</span>
          </motion.div>
        ))}
      </div>
      <button className="btn btn-primary rel-gen-cta" onClick={onGerar}>
        <Rocket size={15} strokeWidth={2} /> Gerar relatório
      </button>
    </motion.div>
  )
}

/* ── Loading skeleton ─────────────────────────────────────────── */
function LoadingSkeleton({ reduce }) {
  return (
    <div className="rel-skel-wrap">
      <div className="rel-skel-head">
        <Sparkles size={36} style={{ color: 'var(--brand)', animation: reduce ? 'none' : 'pulse 2s infinite' }} />
        <p style={{ fontWeight: 700, color: 'var(--text-1)', marginTop: 12 }}>Analisando sua semana...</p>
        <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', maxWidth: 320, marginTop: 4 }}>
          A IA está cruzando suas notas, eventos e progresso pra montar o relatório
        </p>
      </div>
      <div className="rel-skel-ind">
        {[0, 1, 2].map(i => <div key={i} className="rel-skel-card" />)}
      </div>
      <div className="rel-skel-list">
        {[0, 1, 2].map(i => <div key={i} className="rel-skel-section" />)}
      </div>
    </div>
  )
}

/* ── Resultado completo ───────────────────────────────────────── */
function Resultado({ relatorio, dataGeracao, router, reduce }) {
  const ind = relatorio.indicadores || {}
  const secoes = Array.isArray(relatorio.secoes) ? relatorio.secoes : []
  const recs = Array.isArray(relatorio.recomendacoes) ? relatorio.recomendacoes : []

  return (
    <div>
      {/* Faixa "período" */}
      <motion.div
        className="rel-period"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
      >
        <CalendarDays size={14} strokeWidth={2} style={{ color: 'var(--brand)' }} />
        <span>{relatorio.periodo || 'Esta semana'}</span>
        {dataGeracao && <span className="rel-period-gen">· gerado em {dataGeracao}</span>}
      </motion.div>

      {/* Indicadores */}
      <div className="rel-indicadores">
        <Indicador
          delay={0.05}
          reduce={reduce}
          Icon={TrendingUp}
          label="Média geral"
          valor={ind.media_geral != null ? ind.media_geral.toFixed(1) : '—'}
          // Cor: verde se >= 7, âmbar 5-7, vermelho < 5, cinza sem dados.
          cor={ind.media_geral == null ? 'var(--text-4)' : ind.media_geral >= 7 ? '#22c55e' : ind.media_geral >= 5 ? '#f59e0b' : '#ef4444'}
        />
        <Indicador
          delay={0.1}
          reduce={reduce}
          Icon={CalendarDays}
          label="Provas / eventos (7 dias)"
          valor={ind.provas_proximas != null ? String(ind.provas_proximas) : '—'}
          // Cor: 0 neutro, 1-2 brand, 3+ âmbar (carga alta).
          cor={ind.provas_proximas == null ? 'var(--text-4)' : ind.provas_proximas === 0 ? 'var(--text-1)' : ind.provas_proximas <= 2 ? '#22c55e' : '#f59e0b'}
        />
        <Indicador
          delay={0.15}
          reduce={reduce}
          Icon={AlertTriangle}
          label="Matérias em risco"
          valor={ind.materias_em_risco != null ? String(ind.materias_em_risco) : '—'}
          // Cor: 0 verde (zero risco), 1-2 âmbar, 3+ vermelho.
          cor={ind.materias_em_risco == null ? 'var(--text-4)' : ind.materias_em_risco === 0 ? '#22c55e' : ind.materias_em_risco <= 2 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Seções */}
      <div className="rel-secoes">
        {secoes.map((s, i) => (
          <SecaoCard key={i} secao={s} index={i} reduce={reduce} />
        ))}
      </div>

      {/* Recomendações */}
      {recs.length > 0 && (
        <div className="rel-recs">
          <p className="rel-recs-title">Recomendações pra você</p>
          {recs.map((r, i) => {
            const tool = FERRAMENTA[r.ferramenta] || FERRAMENTA.chat
            const Icon = tool.Icon
            return (
              <motion.div
                key={i}
                className="rel-rec-card"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : i * 0.06 }}
              >
                <p className="rel-rec-txt">{r.texto}</p>
                <button className="rel-rec-btn" onClick={() => tool.to(router, r)}>
                  <Icon size={15} strokeWidth={2} />
                  {r.rotulo_acao}
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      <p className="rel-foot">
        Relatório gerado com base nas suas notas, faltas e calendário atuais.
      </p>
    </div>
  )
}

function Indicador({ Icon, label, valor, cor, reduce, delay = 0 }) {
  return (
    <motion.div
      className="rel-ind-card"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rel-ind-icon">
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <p className="rel-ind-valor" style={{ color: cor }}>{valor}</p>
      <p className="rel-ind-label">{label}</p>
    </motion.div>
  )
}

function SecaoCard({ secao, index, reduce }) {
  const meta = TIPO_SECAO[secao.tipo] || TIPO_SECAO.destaque
  const { Icon } = meta
  return (
    <motion.div
      className="rel-secao"
      style={{ borderColor: meta.borda, background: meta.bgSoft }}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.05 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rel-secao-head">
        <span className="rel-secao-badge" style={{ color: meta.cor, background: meta.bg, borderColor: meta.borda }}>
          <Icon size={13} strokeWidth={2} />
          {meta.label}
        </span>
        <h3 className="rel-secao-titulo">{secao.titulo}</h3>
      </div>
      <div className="rel-secao-body">
        <RichMessage content={secao.texto} />
      </div>
    </motion.div>
  )
}

/* ── Styles ───────────────────────────────────────────────────── */
const RELATORIO_CSS = `
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

/* Abas */
.rel-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:24px}
.rel-tab{padding:11px 22px;font-size:13px;font-weight:500;color:var(--text-4);cursor:pointer;border:none;border-bottom:2px solid transparent;background:none;font-family:inherit;transition:color .15s,border-color .15s;display:inline-flex;align-items:center;gap:8px}
.rel-tab:hover:not(:disabled){color:var(--text-1)}
.rel-tab.active{color:var(--brand);border-bottom-color:var(--brand);font-weight:600}
.rel-tab:disabled{cursor:not-allowed;opacity:.55}
.rel-tab-soon{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-4);background:var(--surface-3);border:1px solid var(--border);padding:2px 6px;border-radius:99px;line-height:1.4}

/* Período */
.rel-period{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-3);background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.22);padding:6px 12px;border-radius:99px;margin-bottom:18px;font-weight:600}
.rel-period-gen{color:var(--text-4);font-weight:500}

/* Indicadores (3 cards) */
.rel-indicadores{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.rel-ind-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;position:relative;overflow:hidden}
.rel-ind-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#1a7a4a,#22c55e);opacity:.6}
.rel-ind-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;background:rgba(34,197,94,.10);color:#22c55e;border:1px solid rgba(34,197,94,.18);margin-bottom:10px}
.rel-ind-valor{font-size:30px;font-weight:800;letter-spacing:-.025em;line-height:1;margin:2px 0 6px;font-variant-numeric:tabular-nums}
.rel-ind-label{font-size:11.5px;font-weight:600;letter-spacing:.04em;color:var(--text-4);text-transform:uppercase}

/* Seções */
.rel-secoes{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}
.rel-secao{border-radius:16px;border:1px solid var(--border);padding:18px 22px}
.rel-secao-head{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px}
.rel-secao-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 10px;border-radius:99px;border:1px solid}
.rel-secao-titulo{font-size:16px;font-weight:800;color:var(--text-1);letter-spacing:-.015em;line-height:1.3}
.rel-secao-body{font-size:14px;color:var(--text-2);line-height:1.6}
.rel-secao-body p{margin:0 0 10px}
.rel-secao-body p:last-child{margin-bottom:0}
.rel-secao-body ul,.rel-secao-body ol{margin:6px 0 10px;padding-left:20px}
.rel-secao-body li{margin-bottom:4px}
.rel-secao-body strong{color:var(--text-1)}

/* Recomendações */
.rel-recs{margin-top:6px}
.rel-recs-title{font-size:14px;font-weight:800;color:var(--text-1);margin-bottom:12px;letter-spacing:-.01em}
.rel-rec-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:10px}
.rel-rec-txt{font-size:14px;color:var(--text-2);line-height:1.55;margin-bottom:12px}
.rel-rec-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(26,122,74,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;font-size:13px;font-weight:600;padding:9px 15px;border-radius:10px;cursor:pointer;font-family:inherit;transition:background .15s,transform .12s}
.rel-rec-btn:hover{background:rgba(26,122,74,.2);transform:translateY(-1px)}

.rel-foot{font-size:12px;color:var(--text-4);text-align:center;padding:20px 0 24px}

/* Estado: gerar */
.rel-gen{max-width:520px;margin:24px auto 0;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:36px 40px;text-align:center}
.rel-gen-icon{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:18px;background:rgba(34,197,94,.10);color:#22c55e;border:1px solid rgba(34,197,94,.2);margin-bottom:18px}
.rel-gen-title{font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:8px}
.rel-gen-sub{font-size:13.5px;color:var(--text-3);line-height:1.55;margin-bottom:22px;max-width:380px;margin-left:auto;margin-right:auto}
.rel-gen-bullets{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;text-align:left}
.rel-gen-bullet{display:flex;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:13.5px;color:var(--text-2)}
.rel-gen-dot{width:6px;height:6px;border-radius:50%;background:var(--brand);flex-shrink:0}
.rel-gen-cta{width:100%;justify-content:center;padding:13px 20px;font-size:14.5px;background:linear-gradient(135deg,#1a7a4a,#22c55e)}

/* Estado: gate (Pro) */
.rel-gate{max-width:560px;margin:24px auto 0;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:36px 40px;text-align:center;position:relative;overflow:hidden}
.rel-gate::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1a7a4a,#22c55e,#86efac)}
.rel-gate-icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:rgba(34,197,94,.10);color:#22c55e;border:1px solid rgba(34,197,94,.2);margin-bottom:18px}
.rel-gate-title{font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:8px}
.rel-gate-sub{font-size:14px;color:var(--text-3);line-height:1.6;margin:0 auto 22px;max-width:420px}
.rel-gate-bullets{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;text-align:left}
.rel-gate-bullet{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text-2);line-height:1.5;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px}
.rel-gate-bullet span{margin-top:1px}
.rel-gate-cta{width:100%;justify-content:center;padding:13px 20px;font-size:14.5px;background:linear-gradient(135deg,#1a7a4a,#22c55e)}

/* Erro */
.rel-erro{display:flex;align-items:center;gap:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:14px 18px;color:var(--text-2);font-size:13.5px;margin-bottom:16px}

/* Skeleton */
.rel-skel-wrap{display:flex;flex-direction:column;gap:16px}
.rel-skel-head{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 0 16px}
.rel-skel-ind{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.rel-skel-card{height:108px;border-radius:16px;background:linear-gradient(90deg,var(--surface) 25%,var(--surface-3) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border:1px solid var(--border)}
.rel-skel-list{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.rel-skel-section{height:140px;border-radius:16px;background:linear-gradient(90deg,var(--surface) 25%,var(--surface-3) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border:1px solid var(--border)}

/* Responsive */
@media (max-width: 720px) {
  .rel-indicadores{grid-template-columns:1fr;gap:10px}
  .rel-skel-ind{grid-template-columns:1fr}
  .rel-gen,.rel-gate{padding:28px 20px}
  .rel-secao{padding:16px}
}

/* Print (PDF impressão direto pelo navegador): some com as abas e botões */
@media print {
  .sidebar,.page-breadcrumb,.rel-tabs,.rel-rec-btn,.btn{display:none!important}
  .page-area{padding:0!important}
  .rel-secao,.rel-ind-card,.rel-rec-card{break-inside:avoid}
}
`
