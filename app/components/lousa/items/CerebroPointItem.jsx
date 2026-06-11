'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from 'motion/react'
import { Brain, Lock, Trash2, Maximize, RefreshCw } from 'lucide-react'
import { useCurrentMateria, openPlansModal, sharedItemCss, fullscreenCss } from './_shared'
import { fetchPlano } from '../../../lib/plano'
import { corMateriaRgb, rgbStr, rgbaStr, tonePorPeso, raioNo } from './cerebroGraphTheme'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const CONNECTION_LIMIT_FREE = 500

/* ─── Grafo: layout/estilo ───────────────────────────────────── */
const PERF_THRESHOLD = 120     // acima: sem glow, menos labels, simulação mais curta
const MAX_RENDER_NODES = 250   // teto de nós renderizados (top peso); resto vira contador
const LABEL_ZOOM = 1.4         // zoom a partir do qual todos os labels aparecem
const LABEL_ZOOM_PERF = 2.2
const LABEL_TOP_N = 8          // labels sempre visíveis nos N nós de maior peso
const LABEL_TOP_N_PERF = 5
const ANIM_THRESHOLD = 250     // respiração/poeira animam até aqui (== teto de render)
const RESPIRO_PX = 3.5         // amplitude base da flutuação ("respiração") dos nós
const NASCIMENTO_MS = 800      // duração do "brotar" de um conceito novo
const PULSO_PERIODO_MS = 3600  // ciclo do pulso de glow dos nós top
const PULSO_AMP = 6            // amplitude do pulso (blur 7±6)
const PULSO_TOP_N = 15         // quantos nós (por peso) pulsam
const POEIRA_QTD = 78          // pontos de poeira estelar no fundo

// source/target viram refs de objeto depois que o d3 inicia — normaliza.
const idOf = v => (typeof v === 'object' && v !== null ? v.id : v)

// Hash determinístico (djb2) de qualquer id — ruído estável entre renders.
function hashId(s) {
  const str = String(s)
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}
// Fator 1±amp determinístico por chave (ex.: ruido(id, 0.45) → 0.55–1.45).
const ruido = (chave, amp) => 1 + amp * (((hashId(chave) % 1000) / 1000) * 2 - 1)

// Gravidade suave: puxa cada nó pro SEU alvo (gx, gy) — um offset
// determinístico perto do centro. Segura o grafo na viewport (drag não
// "expulsa" os vizinhos) e, como cada alvo é diferente, torna o próprio
// equilíbrio assimétrico. Força custom no contrato do d3 (sem import extra).
const GRAVIDADE = 0.08
function criarGravidade(strength) {
  let nodos = []
  function force(alpha) {
    for (const n of nodos) {
      n.vx += ((n.gx || 0) - n.x) * strength * alpha
      n.vy += ((n.gy || 0) - n.y) * strength * alpha
    }
  }
  force.initialize = ns => { nodos = ns }
  return force
}

// Poeira estelar: pontos minúsculos em ESPAÇO DO GRAFO (ganham paralaxe no
// zoom/pan), opacidade baixíssima — clima de profundidade, não céu estrelado.
function criarPoeira() {
  return Array.from({ length: POEIRA_QTD }, () => {
    const ang = Math.random() * Math.PI * 2
    const rad = 650 * Math.sqrt(Math.random())
    return {
      x: Math.cos(ang) * rad,
      y: Math.sin(ang) * rad,
      r: 0.5 + Math.random() * 0.7,    // px de TELA (divide pelo zoom ao desenhar)
      alpha: 0.10 + Math.random() * 0.12,
      fase: Math.random() * Math.PI * 2,
    }
  })
}

// Jitter inicial + alvo de gravidade por nó. Sem o jitter o d3 parte de um
// arranjo determinístico e, com forças uniformes, grafos pequenos
// estabilizam em polígonos regulares ("pentagrama").
function prepararGrafo(data) {
  const nodes = data?.nodes || []
  const espalhe = 30 * Math.sqrt(nodes.length + 1)
  return {
    nodes: nodes.map(n => {
      const ang = Math.random() * Math.PI * 2
      const rad = espalhe * Math.sqrt(Math.random())
      const h = hashId(n.id)
      const angAlvo = ((h % 360) / 360) * Math.PI * 2
      const radAlvo = 18 + ((h >> 9) % 53) // 18–70px do centro; bits distintos do ângulo
      return {
        ...n,
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad,
        gx: Math.cos(angAlvo) * radAlvo,
        gy: Math.sin(angAlvo) * radAlvo,
      }
    }),
    links: (data?.links || []).map(l => ({ ...l })),
  }
}

/* ─── Mini neurons SVG (card teaser) ─────────────────────────── */
export const NEURONS = [
  { cx: 60,  cy: 50,  r: 6, delay: 0.0 },
  { cx: 130, cy: 30,  r: 8, delay: 0.3 },
  { cx: 200, cy: 60,  r: 5, delay: 0.6 },
  { cx: 280, cy: 40,  r: 7, delay: 0.9 },
  { cx: 90,  cy: 110, r: 5, delay: 0.4 },
  { cx: 170, cy: 130, r: 9, delay: 0.7 },
  { cx: 250, cy: 110, r: 6, delay: 1.0 },
  { cx: 310, cy: 140, r: 5, delay: 1.3 },
]
export const SYNAPSES = [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[1,5],[3,6]]

function NeuronsSvg({ height = 60, reduce, intense = false }) {
  return (
    <svg viewBox="0 0 360 180" height={height} width="auto" style={{ display: 'block', maxWidth: '100%' }} aria-hidden>
      {SYNAPSES.map(([a, b], i) => {
        const A = NEURONS[a]; const B = NEURONS[b]
        return <line key={i} x1={A.cx} y1={A.cy} x2={B.cx} y2={B.cy} stroke="rgba(34,197,94,.22)" strokeWidth="1" strokeDasharray="3 4" />
      })}
      {NEURONS.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.cx} cy={n.cy} r={n.r}
          fill="#22c55e"
          initial={reduce ? false : { opacity: 0.4, scale: 1 }}
          animate={reduce ? { opacity: 0.85 } : { opacity: intense ? [0.6, 1, 0.6] : [0.4, 1, 0.4], scale: intense ? [1, 1.25, 1] : [1, 1.15, 1] }}
          transition={reduce ? { duration: 0 } : { duration: intense ? 1.6 : 2.5, repeat: Infinity, delay: n.delay, ease: 'easeInOut' }}
          style={{ transformOrigin: `${n.cx}px ${n.cy}px`, transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  )
}

/* ─── Count-up motion value ──────────────────────────────────── */
function useCountUp(target, reduce) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, v => Math.round(v))
  useEffect(() => {
    if (reduce) { mv.set(target); return }
    const ctrl = animate(mv, target, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    return () => ctrl.stop()
  }, [target, reduce, mv])
  return rounded
}

/* ─── Card ───────────────────────────────────────────────────── */
export function CerebroCard({ materia, onClick }) {
  const reduce = useReducedMotion()
  const [stats, setStats] = useState({ conceitos_count: 0, conexoes_count: 0, has_real_data: false })
  const [processing, setProcessing] = useState(false)

  const loadStats = useCallback(() => {
    const q = encodeURIComponent(materia || 'geral')
    fetch(`/api/cerebro/stats?materia=${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s) setStats(s) })
      .catch(() => {})
  }, [materia])

  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => {
    function onUpdate() {
      setProcessing(true)
      loadStats()
      const t = setTimeout(() => setProcessing(false), 800)
      return () => clearTimeout(t)
    }
    window.addEventListener('cerebro-updated', onUpdate)
    return () => window.removeEventListener('cerebro-updated', onUpdate)
  }, [loadStats])

  const conceitosDisplay = useCountUp(stats.conceitos_count, reduce)
  const conexoesDisplay = useCountUp(stats.conexoes_count, reduce)

  return (
    <motion.button
      type="button"
      layoutId="panel-cerebro"
      onClick={onClick}
      className="bento-card bento-card-large"
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      aria-label="Abrir Cérebro Point"
    >
      {processing && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontWeight: 600, color: '#86efac', opacity: 0.85,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
            animation: 'cerebroPulse 1.1s ease-in-out infinite',
          }} />
          processando
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bento-card-icon-wrap">
            <Brain size={22} strokeWidth={1.7} />
          </div>
          <p className="bento-card-title">Cérebro Point</p>
          <p className="bento-card-stat">
            <motion.span style={{ fontWeight: 700, color: '#e4e4e7' }}>{conceitosDisplay}</motion.span> conceitos · <motion.span style={{ fontWeight: 700, color: '#e4e4e7' }}>{conexoesDisplay}</motion.span> conexões
          </p>
        </div>
        <div className="bento-card-viz">
          <NeuronsSvg height={64} reduce={reduce} intense={processing} />
        </div>
      </div>
      <style>{`@keyframes cerebroPulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </motion.button>
  )
}

/* ─── Fullscreen ─────────────────────────────────────────────── */
export function CerebroFullscreen() {
  return (
    <Suspense fallback={<div className="lousa-fs-container">Carregando…</div>}>
      <CerebroFullscreenInner />
    </Suspense>
  )
}

function CerebroFullscreenInner() {
  const materia = useCurrentMateria()
  const isGeral = materia === 'geral'
  const reduce = useReducedMotion()
  const [grafo, setGrafo] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  // next/font gera um family-name hasheado — lê o computado pro canvas.
  const fontRef = useRef('ui-sans-serif, system-ui, sans-serif')
  const [conceitoDetail, setConceitoDetail] = useState(null)
  const [mensagensRelacionadas, setMensagensRelacionadas] = useState([])
  const [isPro, setIsPro] = useState(false)
  const [totalConexoes, setTotalConexoes] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reseeding, setReseeding] = useState(false)
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  // Plano (pra paywall)
  useEffect(() => {
    fetchPlano().then(p => setIsPro(p === 'pro')).catch(() => {})
  }, [])

  // Carrega grafo (com seed bootstrap se vazio)
  const loadGrafo = useCallback(async () => {
    setLoading(true)
    try {
      const q = encodeURIComponent(materia || 'geral')
      const [grafoResp, statsResp] = await Promise.all([
        fetch(`/api/cerebro/grafo?materia=${q}`),
        fetch(`/api/cerebro/stats?materia=${q}`),
      ])
      const grafoData = grafoResp.ok ? await grafoResp.json() : { nodes: [], links: [] }
      const statsData = statsResp.ok ? await statsResp.json() : { conceitos_count: 0, total_conexoes_user: 0 }
      setTotalConexoes(statsData.total_conexoes_user || 0)

      if ((grafoData.nodes?.length || 0) === 0 && materia && materia !== 'geral') {
        // Seed automático na primeira visita
        const seedResp = await fetch('/api/cerebro/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materia }),
        })
        if (seedResp.ok) {
          const seedData = await seedResp.json().catch(() => ({ seeds: [] }))
          if (seedData?.seeds?.length > 0) {
            try { window.dispatchEvent(new CustomEvent('cerebro-updated', { detail: { seeded: seedData.seeds.length } })) } catch {}
          }
          const refresh = await fetch(`/api/cerebro/grafo?materia=${q}`)
          if (refresh.ok) setGrafo(prepararGrafo(await refresh.json()))
        } else {
          setGrafo(prepararGrafo(grafoData))
        }
      } else {
        setGrafo(prepararGrafo(grafoData))
      }
    } catch {
      setGrafo({ nodes: [], links: [] })
    }
    setLoading(false)
  }, [materia])

  useEffect(() => { loadGrafo() }, [loadGrafo])

  // Listen pra atualizações de extração
  useEffect(() => {
    function onUpdate() { loadGrafo() }
    window.addEventListener('cerebro-updated', onUpdate)
    return () => window.removeEventListener('cerebro-updated', onUpdate)
  }, [loadGrafo])

  // Container resize observer → graph dims + re-fit. Uses clientWidth/Height
  // (layout box, unaffected by the fullscreen open-scale animation) and rAF to
  // dodge the "ResizeObserver loop" warning. zoomToFit is debounced so the graph
  // re-frames into the new area instead of shrinking into a corner after resize.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = 0
    let zoomTimer = 0
    function measure() {
      setDims({ w: Math.max(320, el.clientWidth), h: Math.max(280, el.clientHeight) })
      clearTimeout(zoomTimer)
      zoomTimer = setTimeout(() => {
        try { graphRef.current?.zoomToFit?.(400, 40) } catch {}
      }, 250)
    }
    measure()
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    })
    ro.observe(el)
    return () => { ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(zoomTimer) }
  }, [])

  // Carrega detalhes ao selecionar
  useEffect(() => {
    if (!selectedId) {
      setConceitoDetail(null)
      setMensagensRelacionadas([])
      setConfirmDelete(false)
      return
    }
    fetch(`/api/cerebro/conceito/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConceitoDetail(d) })
      .catch(() => {})

    // Mensagens relacionadas: leitura client-side do localStorage
    try {
      const conceito = grafo.nodes.find(n => n.id === selectedId)
      const nome = conceito?.nome?.toLowerCase() || ''
      if (!nome) { setMensagensRelacionadas([]); return }
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('chat_')) keys.push(k)
      }
      const hits = []
      for (const k of keys) {
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]')
          for (const m of arr) {
            if (!m?.content) continue
            if (m.content.toLowerCase().includes(nome)) {
              hits.push({
                texto: m.content.slice(0, 200),
                role: m.role,
                timestamp: m.timestamp,
              })
            }
          }
        } catch {}
        if (hits.length >= 5) break
      }
      setMensagensRelacionadas(hits.slice(0, 5))
    } catch {
      setMensagensRelacionadas([])
    }
  }, [selectedId, grafo.nodes])

  async function handleDelete() {
    if (!selectedId) return
    const resp = await fetch(`/api/cerebro/conceito/${selectedId}`, { method: 'DELETE' })
    if (resp.ok) {
      setSelectedId(null)
      loadGrafo()
    }
  }

  function centralizar() {
    try { graphRef.current?.zoomToFit?.(400, 40) } catch {}
  }

  // Top conceitos por peso
  const topConceitos = useMemo(() => {
    return [...(grafo.nodes || [])].sort((a, b) => (b.peso || 0) - (a.peso || 0)).slice(0, 5)
  }, [grafo.nodes])

  const hasNodes = (grafo.nodes?.length || 0) > 0
  const limitReached = !isPro && totalConexoes >= CONNECTION_LIMIT_FREE

  // ── Grafo: derivações de render ─────────────────────────────
  // Fonte computada do body (next/font usa family hasheado) pros labels.
  useEffect(() => {
    try { fontRef.current = getComputedStyle(document.body).fontFamily || fontRef.current } catch {}
  }, [])

  // Teto de nós (vista geral densa): mantém os MAX_RENDER_NODES de maior peso.
  const renderGrafo = useMemo(() => {
    const nodes = grafo.nodes || []
    if (nodes.length <= MAX_RENDER_NODES) return grafo
    const top = [...nodes].sort((a, b) => (b.peso || 1) - (a.peso || 1)).slice(0, MAX_RENDER_NODES)
    const keep = new Set(top.map(n => n.id))
    return {
      nodes: top,
      links: (grafo.links || []).filter(l => keep.has(idOf(l.source)) && keep.has(idOf(l.target))),
    }
  }, [grafo])
  const ocultos = (grafo.nodes?.length || 0) - (renderGrafo.nodes?.length || 0)
  const perfMode = (renderGrafo.nodes?.length || 0) > PERF_THRESHOLD
  // Vida (respiração/poeira) é barata — senos + arcs — e fica ligada até o
  // teto de render (250). O caro é o shadowBlur, que o perfMode corta em 120:
  // a vista geral degrada o glow ANTES de perder a respiração.
  const vivo = (renderGrafo.nodes?.length || 0) <= ANIM_THRESHOLD

  // Estilo pré-computado por nó: cor por matéria (vista geral) ou tom por
  // peso dentro da cor da matéria (vista de uma matéria) + raio + glow.
  const styleMap = useMemo(() => {
    const nodes = renderGrafo.nodes || []
    const maxPeso = nodes.reduce((m, n) => Math.max(m, n.peso || 1), 1)
    const corPorMateria = new Map()
    const m = new Map()
    for (const n of nodes) {
      const chave = isGeral ? (n.materia || 'geral') : materia
      if (!corPorMateria.has(chave)) corPorMateria.set(chave, corMateriaRgb(chave))
      const base = corPorMateria.get(chave)
      const rgb = isGeral ? base : tonePorPeso(base, Math.sqrt((n.peso || 1) / maxPeso))
      m.set(n.id, {
        fill: rgbStr(rgb),
        glow: rgbaStr(rgb, 0.55),
        link: rgbaStr(rgb, 0.45),
        r: raioNo(n.peso),
        fase: (hashId(n.id) % 628) / 100, // 0–2π: respiração/pulso dessincronizados
      })
    }
    return m
  }, [renderGrafo, isGeral, materia])

  // Vizinhança direta (pro foco de hover/seleção).
  const vizinhos = useMemo(() => {
    const m = new Map()
    for (const n of renderGrafo.nodes || []) m.set(n.id, new Set([n.id]))
    for (const l of renderGrafo.links || []) {
      const a = idOf(l.source); const b = idOf(l.target)
      m.get(a)?.add(b); m.get(b)?.add(a)
    }
    return m
  }, [renderGrafo])

  const focusId = hoverId || selectedId
  const focusSet = focusId ? (vizinhos.get(focusId) || null) : null
  const focusLink = focusSet ? (styleMap.get(focusId)?.link || 'rgba(255,255,255,0.4)') : null

  // Labels sempre visíveis: top N por peso (menos em perf mode).
  const topLabelIds = useMemo(() => {
    const n = perfMode ? LABEL_TOP_N_PERF : LABEL_TOP_N
    return new Set(
      [...(renderGrafo.nodes || [])]
        .sort((a, b) => (b.peso || 1) - (a.peso || 1))
        .slice(0, n)
        .map(x => x.id)
    )
  }, [renderGrafo, perfMode])

  // Nós que pulsam o glow: top PULSO_TOP_N por peso (mais amplo que os labels).
  const pulsoIds = useMemo(() => {
    return new Set(
      [...(renderGrafo.nodes || [])]
        .sort((a, b) => (b.peso || 1) - (a.peso || 1))
        .slice(0, PULSO_TOP_N)
        .map(x => x.id)
    )
  }, [renderGrafo])

  // Legenda (vista geral): matérias presentes, mais conceitos primeiro.
  const legendaMaterias = useMemo(() => {
    if (!isGeral) return []
    const cont = new Map()
    for (const n of renderGrafo.nodes || []) {
      const k = n.materia || 'geral'
      cont.set(k, (cont.get(k) || 0) + 1)
    }
    return [...cont.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [isGeral, renderGrafo])

  // ── Vida: nascimento de conceitos + camadas de ambiente ─────
  const conhecidosRef = useRef(null)        // Set de ids; null = primeira carga (não anima)
  const nascimentosRef = useRef(new Map())  // id → timestamp do "brotar"
  const poeiraRef = useRef(null)            // poeira estelar (gerada 1x por mount)
  const vinhetaRef = useRef(null)           // gradiente da vinheta (cache por dims)

  // Troca de matéria = grafo novo inteiro: re-baseline, ninguém brota.
  useEffect(() => {
    conhecidosRef.current = null
    nascimentosRef.current.clear()
  }, [materia])

  // Diff de ids a cada carga (cerebro-updated → loadGrafo → renderGrafo):
  // só ids inéditos ganham animação de nascimento; existentes não re-animam.
  useEffect(() => {
    const ids = new Set((renderGrafo.nodes || []).map(n => n.id))
    if (conhecidosRef.current === null || reduce) {
      conhecidosRef.current = ids
      return
    }
    const agora = performance.now()
    for (const id of ids) {
      if (!conhecidosRef.current.has(id)) nascimentosRef.current.set(id, agora)
    }
    conhecidosRef.current = ids
  }, [renderGrafo, reduce])

  // Forças heterogêneas: o EQUILÍBRIO precisa ser torto (não só a partida —
  // jitter inicial sozinho apenas gira o polígono). Três mecanismos:
  // 1. distance ∝ 1/forca com ±45% de ruído FIXO por id do link;
  // 2. repulsão por peso com ±30% de ruído FIXO por id do nó;
  // 3. gravidade por nó (alvos offset) no lugar do forceCenter — o center
  //    transladava o grafo inteiro durante o drag ("todos fugiam").
  const aplicarForcas = useCallback(fg => {
    if (!fg) return
    const link = fg.d3Force('link')
    if (link?.distance) {
      link.distance(l => {
        const f = Math.max(1, Math.min(Number(l.forca) || 1, 8))
        const chave = `${idOf(l.source)}|${idOf(l.target)}`
        return (36 + 84 / f) * ruido(chave, 0.45)
      })
    }
    const charge = fg.d3Force('charge')
    if (charge?.strength) {
      // Repulsão menor que antes (equilibra com a gravidade) e ruidosa por nó.
      charge.strength(n => -(40 + 22 * Math.sqrt(n.peso || 1)) * ruido(n.id, 0.3))
    }
    fg.d3Force('center', null)
    fg.d3Force('gravidade', criarGravidade(GRAVIDADE))
  }, [])

  // Ref callback: o componente é dynamic(ssr:false) — configura as forças
  // assim que a instância monta (um effect com ref.current perderia o timing).
  const setGraphRef = useCallback(inst => {
    graphRef.current = inst
    aplicarForcas(inst)
  }, [aplicarForcas])

  useEffect(() => {
    if (renderGrafo.nodes?.length) {
      aplicarForcas(graphRef.current)
      graphRef.current?.d3ReheatSimulation?.()
    }
  }, [renderGrafo, aplicarForcas])

  // Desenho custom dos nós: cor + glow + respiração + nascimento + label.
  // Animações vivem SÓ no loop de desenho (offsets por tempo) — a simulação
  // do d3 nunca é reaquecida por elas.
  const paintNode = useCallback((node, ctx, scale) => {
    const sty = styleMap.get(node.id)
    if (!sty) return
    const t = performance.now()
    const anima = !reduce && vivo
    const dim = focusSet ? !focusSet.has(node.id) : false

    // Respiração: drift senoidal com fase própria por nó; amplitude cresce
    // de leve com o raio (nó grande respira proporcionalmente, não fica tímido).
    let x = node.x
    let y = node.y
    if (anima) {
      const amp = RESPIRO_PX * (1 + sty.r / 50)
      x += Math.sin(t / 1600 + sty.fase) * amp
      y += Math.cos(t / 1900 + sty.fase * 1.7) * amp
    }

    // Nascimento: brota de 25% → 100% do raio com glow extra decrescente.
    let r = sty.r
    let glowExtra = 0
    const nasc = nascimentosRef.current.get(node.id)
    if (nasc != null) {
      const prog = (t - nasc) / NASCIMENTO_MS
      if (prog >= 1) {
        nascimentosRef.current.delete(node.id)
      } else {
        const e = 1 - Math.pow(1 - prog, 3) // easeOutCubic
        r = sty.r * (0.25 + 0.75 * e)
        glowExtra = 14 * (1 - prog)
      }
    }

    ctx.globalAlpha = dim ? 0.12 : node.is_seed ? 0.55 : 1
    if (!dim && !perfMode) {
      // Pulso lento de glow nos nós top (fase própria); os demais ficam fixos.
      const pulso = anima && pulsoIds.has(node.id)
        ? PULSO_AMP * Math.sin((t / PULSO_PERIODO_MS) * 2 * Math.PI + sty.fase)
        : 0
      ctx.shadowColor = sty.glow
      ctx.shadowBlur = Math.max(1, 7 + pulso) + glowExtra
    }
    ctx.fillStyle = sty.fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fill()
    ctx.shadowBlur = 0

    if (node.id === selectedId && !dim) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'
      ctx.lineWidth = 1.6 / scale
      ctx.beginPath()
      ctx.arc(x, y, r + 3 / scale, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // Label por demanda: zoom alto, top peso, hover ou selecionado — nunca todos.
    const zoomLabel = perfMode ? LABEL_ZOOM_PERF : LABEL_ZOOM
    const mostra = !dim && (scale >= zoomLabel || topLabelIds.has(node.id) || node.id === hoverId || node.id === selectedId)
    if (mostra) {
      const fs = Math.max(3, 11 / scale)
      ctx.font = `600 ${fs}px ${fontRef.current}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.globalAlpha = 0.92
      ctx.fillStyle = '#e4e4e7'
      ctx.fillText(node.nome, x, y + r + 3 / scale)
    }
    ctx.globalAlpha = 1
  }, [styleMap, focusSet, selectedId, hoverId, topLabelIds, pulsoIds, perfMode, vivo, reduce])

  // Área clicável/hover coerente com o raio custom.
  const paintPointer = useCallback((node, color, ctx) => {
    const r = (styleMap.get(node.id)?.r || 6) + 4
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fill()
  }, [styleMap])

  // Camada de ambiente, desenhada ANTES dos nós a cada frame:
  // vinheta em espaço de tela + poeira estelar em espaço do grafo.
  const paintPre = useCallback((ctx, scale) => {
    const t = performance.now()

    // Vinheta radial (espaço de TELA — independe de zoom/pan).
    ctx.save()
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const { w, h } = dims
    const v = vinhetaRef.current
    if (!v || v.w !== w || v.h !== h || v.ctx !== ctx) {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.72)
      g.addColorStop(0, 'rgba(244,244,245,0.05)')  // centro perceptivelmente mais claro
      g.addColorStop(0.4, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.55)')        // bordas bem mais escuras
      vinhetaRef.current = { w, h, ctx, g }
    }
    ctx.fillStyle = vinhetaRef.current.g
    ctx.fillRect(0, 0, w, h)
    ctx.restore()

    // Poeira: estática em reduce; drift lento no resto (barato — 78 arcs).
    if (!poeiraRef.current) poeiraRef.current = criarPoeira()
    const anima = !reduce && vivo
    ctx.fillStyle = '#e4e4e7'
    for (const p of poeiraRef.current) {
      const dx = anima ? Math.sin(t / 9000 + p.fase) * 3 : 0
      const dy = anima ? Math.cos(t / 11000 + p.fase) * 3 : 0
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x + dx, p.y + dy, p.r / scale, 0, 2 * Math.PI)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [dims, reduce, vivo])

  const linkCor = useCallback(l => {
    if (!focusSet) return 'rgba(255,255,255,0.14)'
    const toca = idOf(l.source) === focusId || idOf(l.target) === focusId
    return toca ? focusLink : 'rgba(255,255,255,0.03)'
  }, [focusSet, focusId, focusLink])

  const linkLargura = useCallback(l => {
    const base = Math.min(l.forca || 1, 4)
    if (!focusSet) return base
    const toca = idOf(l.source) === focusId || idOf(l.target) === focusId
    return toca ? base + 0.6 : 0.5
  }, [focusSet, focusId])

  const onHover = useCallback(n => {
    setHoverId(n?.id || null)
    if (typeof document !== 'undefined') document.body.style.cursor = n ? 'pointer' : ''
  }, [])

  return (
    <div className="lousa-fs-container cerebro-fs">
      <style>{fullscreenCss}</style>
      <style>{CEREBRO_FS_CSS}</style>

      <header className="lousa-fs-header" style={{ marginBottom: 16 }}>
        <h1 className="lousa-fs-title">
          Cérebro Point {!isGeral && <>· <span className="lousa-fs-title-materia">{materia}</span></>}
        </h1>
        <p className="lousa-fs-subtitle">
          Cada conversa no chat acrescenta conceitos e ligações no seu mapa.
        </p>
      </header>

      <div className="cerebro-split">
        <div ref={containerRef} className="cerebro-graph">
          {loading ? (
            <div className="cerebro-graph-empty">
              <RefreshCw size={20} className="cerebro-spin" />
              <p>Carregando seu mapa…</p>
            </div>
          ) : hasNodes ? (
            <>
              <ForceGraph2D
                ref={setGraphRef}
                width={dims.w}
                height={dims.h}
                graphData={renderGrafo}
                onRenderFramePre={paintPre}
                nodeCanvasObjectMode={() => 'replace'}
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={paintPointer}
                linkColor={linkCor}
                linkWidth={linkLargura}
                backgroundColor="rgba(0,0,0,0)"
                autoPauseRedraw={false}
                onNodeClick={n => setSelectedId(n.id)}
                onNodeHover={onHover}
                enableNodeDrag={true}
                d3AlphaDecay={perfMode ? 0.06 : 0.035}
                d3VelocityDecay={0.4}
                warmupTicks={reduce ? 200 : 0}
                cooldownTime={reduce ? 0 : perfMode ? 2200 : 4000}
                onEngineStop={() => { try { graphRef.current?.zoomToFit?.(reduce ? 0 : 400, 40) } catch {} }}
              />
              <button onClick={centralizar} className="cerebro-recenter" type="button">
                <Maximize size={13} strokeWidth={2} />
                Centralizar
              </button>
              {isGeral && legendaMaterias.length > 0 && (
                <div className="cerebro-legend">
                  {legendaMaterias.slice(0, 8).map(m => (
                    <span key={m} className="cerebro-legend-item">
                      <i style={{ background: rgbStr(corMateriaRgb(m)) }} />
                      {m}
                    </span>
                  ))}
                  {legendaMaterias.length > 8 && (
                    <span className="cerebro-legend-item cerebro-legend-more">+{legendaMaterias.length - 8} matérias</span>
                  )}
                </div>
              )}
              {ocultos > 0 && (
                <div className="cerebro-trim-badge">
                  Mostrando os {MAX_RENDER_NODES} conceitos mais relevantes · +{ocultos} ocultos — filtre por matéria pra ver todos
                </div>
              )}
            </>
          ) : (
            <div className="cerebro-graph-empty">
              <Brain size={42} strokeWidth={1.5} style={{ opacity: 0.4 }} />
              <p style={{ marginTop: 14, fontWeight: 600, color: '#a1a1aa' }}>Seu mapa começa aqui</p>
              <p style={{ marginTop: 6, fontSize: 12.5, color: '#71717a', maxWidth: 280, textAlign: 'center', lineHeight: 1.55 }}>
                {isGeral
                  ? 'Selecione uma matéria pra ver o mapa de conhecimento dela.'
                  : 'Converse com a IA no chat — conceitos e conexões aparecem aqui sozinhos.'}
              </p>
            </div>
          )}
        </div>

        <div className="cerebro-panel">
          {limitReached && (
            <div className="cerebro-paywall">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} strokeWidth={1.8} style={{ color: '#fbbf24' }} />
                Limite gratuito atingido
              </span>
              <p>Você atingiu <strong>{CONNECTION_LIMIT_FREE} conexões</strong>. PRO desbloqueia ilimitadas.</p>
              <button onClick={openPlansModal} className="cerebro-paywall-btn" type="button">
                Ver planos
              </button>
            </div>
          )}

          {!selectedId ? (
            <div>
              <p className="cerebro-panel-summary">
                <strong>{grafo.nodes?.length || 0}</strong> conceitos · <strong>{grafo.links?.length || 0}</strong> conexões
              </p>
              {!isPro && !limitReached && (
                <div className="cerebro-progress">
                  <div className="cerebro-progress-track">
                    <div className="cerebro-progress-fill" style={{ width: `${Math.min(100, (totalConexoes / CONNECTION_LIMIT_FREE) * 100)}%` }} />
                  </div>
                  <p className="cerebro-progress-label">{totalConexoes}/{CONNECTION_LIMIT_FREE} conexões grátis</p>
                </div>
              )}
              <p className="cerebro-panel-hint">
                Clique num conceito pra ver detalhes e onde apareceu no chat.
              </p>
              {topConceitos.length > 0 && (
                <>
                  <p className="cerebro-panel-section">Mais relevantes</p>
                  <div className="cerebro-top-list">
                    {topConceitos.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="cerebro-top-chip"
                        onClick={() => setSelectedId(c.id)}
                      >
                        <span>{c.nome}</span>
                        <span className="cerebro-top-peso">×{c.peso || 1}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <ConceitoDetail
              conceito={conceitoDetail}
              mensagens={mensagensRelacionadas}
              onClose={() => setSelectedId(null)}
              onDelete={handleDelete}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              reduce={reduce}
            />
          )}
        </div>
      </div>

      <style>{sharedItemCss}</style>
    </div>
  )
}

function ConceitoDetail({ conceito, mensagens, onClose, onDelete, confirmDelete, setConfirmDelete }) {
  if (!conceito) {
    return <p style={{ fontSize: 13, color: '#71717a' }}>Carregando…</p>
  }
  return (
    <div>
      <button type="button" onClick={onClose} className="cerebro-back">← Voltar</button>
      <h2 className="cerebro-conceito-nome">{conceito.nome}</h2>
      {conceito.is_seed && (
        <div className="cerebro-seed-tag">
          Exemplo · vai sumir quando você começar a povoar
        </div>
      )}
      {conceito.descricao_curta && (
        <p className="cerebro-conceito-desc">{conceito.descricao_curta}</p>
      )}
      <p className="cerebro-conceito-stats">
        <strong>{conceito.peso || 1}</strong> {(conceito.peso || 1) === 1 ? 'menção' : 'menções'} · <strong>{conceito.conexoes_count || 0}</strong> {(conceito.conexoes_count || 0) === 1 ? 'conexão' : 'conexões'}
      </p>

      <p className="cerebro-panel-section">Mensagens onde apareceu</p>
      {mensagens.length === 0 ? (
        <p className="cerebro-conceito-empty">Sem aparições no histórico local.</p>
      ) : (
        <div className="cerebro-msg-list">
          {mensagens.map((m, i) => (
            <div key={i} className="cerebro-msg-item">
              <span className={`cerebro-msg-tag ${m.role === 'user' ? 'user' : 'ai'}`}>
                {m.role === 'user' ? 'Você' : 'IA'}
              </span>
              <p className="cerebro-msg-text">{m.texto}{m.texto.length >= 200 ? '…' : ''}</p>
              {m.timestamp && (
                <p className="cerebro-msg-time">{new Date(m.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="cerebro-delete-zone">
        {confirmDelete ? (
          <>
            <p className="cerebro-delete-confirm">Tem certeza? Esta ação remove o conceito e suas conexões.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(false)} className="cerebro-cancel-btn">Cancelar</button>
              <button type="button" onClick={onDelete} className="cerebro-delete-btn-confirm">Deletar</button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="cerebro-delete-btn">
            <Trash2 size={13} strokeWidth={1.8} /> Deletar conceito
          </button>
        )}
      </div>
    </div>
  )
}

const CEREBRO_FS_CSS = `
  /* Fill the fullscreen body: header on top, split takes the rest of the height. */
  .cerebro-fs{padding-bottom:24px;box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0}
  .cerebro-split{flex:1;min-height:0;display:grid;grid-template-columns:1.4fr 1fr;grid-template-rows:minmax(0,1fr);gap:20px}
  .cerebro-graph{position:relative;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;min-height:0}
  .cerebro-graph-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#71717a;font-size:13px}
  .cerebro-spin{animation:cerebroSpin 1s linear infinite;color:#22c55e}
  @keyframes cerebroSpin{to{transform:rotate(360deg)}}
  .cerebro-recenter{position:absolute;left:14px;bottom:14px;display:inline-flex;align-items:center;gap:6px;background:rgba(15,15,15,.85);border:1px solid rgba(255,255,255,.08);color:#d4d4d8;font-size:11.5px;font-weight:600;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:inherit;backdrop-filter:blur(8px);transition:background .15s,border-color .15s}
  .cerebro-recenter:hover{background:rgba(20,20,20,.95);border-color:rgba(34,197,94,.3);color:#22c55e}
  .cerebro-legend{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:5px;background:rgba(10,10,10,.72);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:9px 12px;backdrop-filter:blur(8px);max-width:200px}
  .cerebro-legend-item{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:#d4d4d8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cerebro-legend-item i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .cerebro-legend-more{color:#71717a}
  .cerebro-trim-badge{position:absolute;right:14px;bottom:14px;font-size:11px;font-weight:600;color:#a1a1aa;background:rgba(10,10,10,.78);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:6px 10px;backdrop-filter:blur(8px);max-width:300px;line-height:1.45}

  .cerebro-panel{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px 20px;overflow-y:auto;min-height:0;display:flex;flex-direction:column}
  .cerebro-paywall{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.22);border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#fbbf24;display:flex;flex-direction:column;gap:8px}
  .cerebro-paywall p{color:#a1a1aa;line-height:1.5}
  .cerebro-paywall-btn{background:#1a7a4a;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;align-self:flex-start}
  .cerebro-paywall-btn:hover{background:#155f3a}

  .cerebro-panel-summary{font-size:14px;color:#e4e4e7;margin-bottom:14px}
  .cerebro-progress{margin-bottom:14px}
  .cerebro-progress-track{height:5px;background:rgba(255,255,255,.04);border-radius:99px;overflow:hidden}
  .cerebro-progress-fill{height:100%;background:#22c55e;border-radius:99px;transition:width .4s ease}
  .cerebro-progress-label{font-size:10.5px;color:#71717a;margin-top:5px;font-weight:600;letter-spacing:.04em}
  .cerebro-panel-hint{font-size:12.5px;color:#71717a;line-height:1.55;margin-bottom:18px}
  .cerebro-panel-section{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;margin:14px 0 8px}
  .cerebro-top-list{display:flex;flex-direction:column;gap:6px}
  .cerebro-top-chip{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:8px 12px;font-size:13px;color:#d4d4d8;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s,color .15s}
  .cerebro-top-chip:hover{background:rgba(255,255,255,.05);border-color:rgba(34,197,94,.3);color:#f4f4f5}
  .cerebro-top-peso{font-size:11px;color:#71717a;font-weight:600}

  .cerebro-back{background:none;border:none;color:#86efac;font-size:12.5px;font-weight:600;cursor:pointer;padding:0;margin-bottom:14px;font-family:inherit}
  .cerebro-back:hover{color:#22c55e}
  .cerebro-conceito-nome{font-size:22px;font-weight:800;color:#f4f4f5;letter-spacing:-.02em;margin-bottom:6px}
  .cerebro-seed-tag{display:inline-block;font-size:10.5px;font-weight:600;color:#fbbf24;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.22);padding:3px 8px;border-radius:99px;margin-bottom:10px}
  .cerebro-conceito-desc{font-size:13px;color:#a1a1aa;line-height:1.6;margin-bottom:14px}
  .cerebro-conceito-stats{font-size:12.5px;color:#71717a;margin-bottom:16px}
  .cerebro-conceito-stats strong{color:#22c55e;font-weight:700}
  .cerebro-conceito-empty{font-size:12px;color:#71717a;font-style:italic;padding:10px 0}
  .cerebro-msg-list{display:flex;flex-direction:column;gap:8px}
  .cerebro-msg-item{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:10px 12px}
  .cerebro-msg-tag{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;margin-bottom:6px}
  .cerebro-msg-tag.user{color:#86efac;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.22)}
  .cerebro-msg-tag.ai{color:#d4d4d8;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
  .cerebro-msg-text{font-size:12.5px;color:#d4d4d8;line-height:1.55;word-break:break-word}
  .cerebro-msg-time{font-size:10.5px;color:#52525b;margin-top:5px}

  .cerebro-delete-zone{margin-top:auto;padding-top:16px;border-top:1px solid rgba(255,255,255,.05)}
  .cerebro-delete-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid rgba(248,113,113,.2);color:#f87171;font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s}
  .cerebro-delete-btn:hover{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.35)}
  .cerebro-delete-confirm{font-size:12.5px;color:#fca5a5;margin-bottom:10px;line-height:1.5}
  .cerebro-cancel-btn{background:none;border:1px solid rgba(255,255,255,.08);color:#a1a1aa;font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;cursor:pointer;font-family:inherit}
  .cerebro-delete-btn-confirm{background:#f87171;color:#0a0a0a;border:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:8px;cursor:pointer;font-family:inherit}
  .cerebro-delete-btn-confirm:hover{background:#fca5a5}

  @media (max-width:1023px){
    /* Stack vertically and return to normal document flow so the body scrolls. */
    .cerebro-fs{display:block;height:auto}
    .cerebro-split{flex:initial;min-height:auto;grid-template-columns:1fr;grid-template-rows:none;gap:14px}
    .cerebro-panel{min-height:auto}
    .cerebro-graph{height:380px;min-height:380px}
  }
`
