'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import Image from 'next/image'

/* ─── Subject content ────────────────────────────────────────────── */
const SUBJECTS = [
  {
    name: 'Álgebra Linear',
    studentText: 'Como calcular o determinante de uma matriz 3x3?',
    aiText: 'Pra 3x3 use a regra de Sarrus: copia as 2 primeiras colunas ao lado, soma as 3 diagonais principais e subtrai as 3 secundárias. Quer que eu mostre passo a passo com números?',
  },
  {
    name: 'Direito Penal',
    studentText: 'Diferença entre dolo eventual e culpa consciente?',
    aiText: 'Nos dois o agente prevê o resultado. No dolo eventual ele assume o risco — "que aconteça". Na culpa consciente confia que não acontecerá. É a teoria do consentimento (Welzel). Quer casos práticos?',
  },
  {
    name: 'Bioquímica',
    studentText: 'Me explica o ciclo de Krebs',
    aiText: 'Etapa central do metabolismo aeróbico. O acetil-CoA entra, sofre 8 reações enzimáticas, e gera 3 NADH + 1 FADH₂ + 1 GTP por volta. O CO₂ que você expira sai daqui. Quer detalhar cada enzima?',
  },
  {
    name: 'Marketing Estratégico',
    studentText: 'Como funciona o framework STP?',
    aiText: 'Segmentation → Targeting → Positioning. Divide o mercado em segmentos por critério (demografia, comportamento), escolhe quais atender, e posiciona a marca de forma única na mente do consumidor. Quer aplicado em um caso real?',
  },
]
const SUBJECT_NAMES = SUBJECTS.map(s => s.name)
const GREETING = (name) => `Olá, Paulo Henrique! 👋 Estou aqui para te ajudar com ${name}. Pode me perguntar qualquer coisa.`

/* ─── Inline icons (16px) ────────────────────────────────────────── */
const ic = {
  home: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
  globe: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  book: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  cal: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  trend: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>),
  doc: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>),
  scan: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>),
  zap: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  target: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  bookOpen: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  send: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="6 11 12 5 18 11"/></svg>),
  camera: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>),
  mic: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>),
  head: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>),
}

const MENU_FREE = [
  { id: 'home', label: 'Home', icon: ic.home },
  { id: 'chat', label: 'Chat Geral', icon: ic.globe },
  { id: 'notas', label: 'Notas e Faltas', icon: ic.book },
  { id: 'cal', label: 'Calendário', icon: ic.cal },
  { id: 'evolucao', label: 'Minha Evolução', icon: ic.trend },
  { id: 'trabalhos', label: 'Correção de Trabalhos', icon: ic.doc },
]
const MENU_PRO = [
  { id: 'analise', label: 'Análise de Materiais', icon: ic.scan },
  { id: 'relatorio', label: 'Relatório Semanal', icon: ic.zap },
  { id: 'simulado', label: 'Simulado Inteligente', icon: ic.target },
  { id: 'plano', label: 'Plano de Estudos', icon: ic.bookOpen },
]

const EASE = [0.22, 1, 0.36, 1]

/* ─── Main component ─────────────────────────────────────────────── */
export default function DashboardLiveDemo() {
  const reduce = useReducedMotion()
  const [subjectIdx, setSubjectIdx] = useState(0)
  const [phase, setPhase] = useState('greet')
  const [studentTyped, setStudentTyped] = useState(0)
  const [aiWordCount, setAiWordCount] = useState(0)
  const [inView, setInView] = useState(false)
  const rootRef = useRef(null)
  const timersRef = useRef([])

  const subject = SUBJECTS[subjectIdx]
  const aiWords = subject.aiText.split(' ')

  // IntersectionObserver — only animate when visible
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Phase machine
  useEffect(() => {
    if (reduce) {
      setPhase('done')
      setStudentTyped(subject.studentText.length)
      setAiWordCount(aiWords.length)
      return
    }
    if (!inView) return

    function clearAll() {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    function tt(delay, fn) {
      const t = setTimeout(fn, delay)
      timersRef.current.push(t)
    }

    setPhase('greet')
    setStudentTyped(0)
    setAiWordCount(0)

    const studentLen = subject.studentText.length
    const aiLen = aiWords.length

    tt(1500, () => setPhase('studentTyping'))
    for (let i = 1; i <= studentLen; i++) {
      tt(1500 + i * 38, () => setStudentTyped(i))
    }
    const afterStudent = 1500 + studentLen * 38 + 400
    tt(afterStudent, () => setPhase('aiThinking'))
    tt(afterStudent + 1300, () => setPhase('aiReplying'))
    for (let i = 1; i <= aiLen; i++) {
      tt(afterStudent + 1300 + i * 55, () => setAiWordCount(i))
    }
    const afterAi = afterStudent + 1300 + aiLen * 55 + 2600
    tt(afterAi, () => setSubjectIdx(idx => (idx + 1) % SUBJECTS.length))

    return clearAll
  }, [subjectIdx, inView, reduce, subject.studentText, subject.aiText, aiWords.length])

  return (
    <div
      ref={rootRef}
      style={{
        background: '#0a0a0a',
        display: 'grid',
        gridTemplateColumns: '270px 1fr',
        aspectRatio: '16 / 10',
        width: '100%',
        color: '#e4e4e7',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Sidebar activeName={subject.name} />
      <Main
        subject={subject}
        phase={phase}
        studentTyped={studentTyped}
        aiWordCount={aiWordCount}
        aiWords={aiWords}
      />
    </div>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
function Sidebar({ activeName }) {
  return (
    <aside style={{
      borderRight: '1px solid #161616',
      padding: '18px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflow: 'hidden',
      background: '#080808',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '2px 8px' }}>
        <Image src="/logo-mark.png" alt="" width={30} height={30} />
        <span style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', letterSpacing: '-.03em' }}>Point</span>
      </div>

      <div style={{
        background: '#101010', border: '1px solid #1a1a1a', borderRadius: 12,
        padding: 11, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e 0%, #0e6b3e 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 12.5, flexShrink: 0,
        }}>PH</div>
        <div style={{ overflow: 'hidden', minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Paulo Henrique</p>
          <p style={{ fontSize: 10.5, color: '#71717a', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ciência de Dados · 2º sem</p>
        </div>
      </div>

      <SectionLabel>MENU</SectionLabel>
      {MENU_FREE.map(m => (
        <SidebarItem key={m.id} icon={m.icon}>{m.label}</SidebarItem>
      ))}
      {MENU_PRO.map(m => (
        <SidebarItem key={m.id} icon={m.icon} pro>{m.label}</SidebarItem>
      ))}

      <SectionLabel style={{ marginTop: 14 }}>MINHAS MATÉRIAS</SectionLabel>
      {SUBJECT_NAMES.map(name => (
        <SubjectItem key={name} name={name} active={name === activeName} />
      ))}
    </aside>
  )
}

function SectionLabel({ children, style }) {
  return (
    <p style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
      color: '#52525b', padding: '0 8px', marginTop: 12, marginBottom: 6, ...style,
    }}>
      {children}
    </p>
  )
}

function SidebarItem({ icon, children, pro }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px', borderRadius: 8,
      color: '#a1a1aa', fontSize: 12, fontWeight: 500, cursor: 'default',
    }}>
      <span style={{ flexShrink: 0, color: '#71717a', display: 'inline-flex' }}>{icon}</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      {pro && (
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '.06em',
          color: '#22c55e', background: 'rgba(26,122,74,.12)',
          border: '1px solid rgba(34,197,94,.25)',
          padding: '1px 5px', borderRadius: 4,
        }}>PRO</span>
      )}
    </div>
  )
}

function SubjectItem({ name, active }) {
  return (
    <motion.div
      animate={{ background: active ? 'rgba(26,122,74,.10)' : 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px 7px 11px', borderRadius: 8, cursor: 'default',
        borderLeft: active ? '2px solid #22c55e' : '2px solid transparent',
        willChange: 'background',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: active ? '#22c55e' : '#3a3a3a',
        boxShadow: active ? '0 0 0 3px rgba(34,197,94,.18)' : 'none',
        transition: 'background .3s, box-shadow .3s',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12, fontWeight: active ? 700 : 500,
        color: active ? '#e4e4e7' : '#a1a1aa',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}
      </span>
    </motion.div>
  )
}

/* ─── Main area ──────────────────────────────────────────────────── */
function Main({ subject, phase, studentTyped, aiWordCount, aiWords }) {
  const studentText = subject.studentText.slice(0, studentTyped)
  const aiVisible = aiWords.slice(0, aiWordCount).join(' ')
  const showGreet = phase !== 'enter'
  const showStudent = phase === 'studentTyping' || phase === 'aiThinking' || phase === 'aiReplying' || phase === 'done'
  const showThinking = phase === 'aiThinking'
  const showReply = phase === 'aiReplying' || phase === 'done'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 22px', borderBottom: '1px solid #151515',
        height: 64, flexShrink: 0, background: '#0a0a0a',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
          boxShadow: '0 0 0 2px rgba(34,197,94,.18)',
        }}>P</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={subject.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{
                fontSize: 15, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {subject.name}
            </motion.p>
          </AnimatePresence>
          <p style={{ fontSize: 11.5, color: '#71717a', marginTop: 1 }}>Point AI · Especialista acadêmico</p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(26,122,74,.10)', border: '1px solid rgba(34,197,94,.22)',
          color: '#86efac', fontSize: 10.5, fontWeight: 600,
          padding: '4px 10px', borderRadius: 99,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2.2s ease infinite', display: 'inline-block' }} />
          Online
        </span>
      </div>

      {/* "Hoje" divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px 4px' }}>
        <div style={{ flex: 1, height: 1, background: '#161616' }} />
        <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '.14em', fontWeight: 700 }}>HOJE</span>
        <div style={{ flex: 1, height: 1, background: '#161616' }} />
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflow: 'hidden',
        padding: '14px 32px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={subject.name + '-chat'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {showGreet && (
              <ChatBubble role="ai">{GREETING(subject.name)}</ChatBubble>
            )}
            {showStudent && (
              <ChatBubble role="user">
                {studentText}
                {phase === 'studentTyping' && studentTyped < subject.studentText.length && (
                  <span style={{
                    display: 'inline-block', width: 2, height: '0.95em',
                    verticalAlign: 'text-bottom', marginLeft: 1,
                    background: '#fff', animation: 'blink .85s step-end infinite',
                  }} />
                )}
              </ChatBubble>
            )}
            {showThinking && (
              <ChatBubble role="ai" key="thinking">
                <ThinkingDots />
              </ChatBubble>
            )}
            {showReply && (
              <ChatBubble role="ai" key="reply">
                {aiVisible}
              </ChatBubble>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: '1px solid #151515', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, background: '#080808',
      }}>
        <div style={{ display: 'flex', gap: 2, color: '#71717a' }}>
          <span style={{ display: 'inline-flex', padding: 6 }}>{ic.camera}</span>
          <span style={{ display: 'inline-flex', padding: 6 }}>{ic.mic}</span>
          <span style={{ display: 'inline-flex', padding: 6 }}>{ic.head}</span>
        </div>
        <div style={{
          flex: 1, background: '#101010', border: '1px solid #1a1a1a',
          borderRadius: 10, padding: '9px 14px',
          color: '#52525b', fontSize: 12.5,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={subject.name + '-input'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Pergunte sobre {subject.name}…
            </motion.span>
          </AnimatePresence>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 10,
          background: '#1a7a4a', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'default', flexShrink: 0,
          boxShadow: '0 0 16px rgba(26,122,74,.35)',
        }} aria-hidden tabIndex={-1}>
          {ic.send}
        </button>
      </div>
    </div>
  )
}

function ChatBubble({ role, children }) {
  const ai = role === 'ai'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-end',
        flexDirection: ai ? 'row' : 'row-reverse',
        willChange: 'transform',
      }}
    >
      {ai && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#1a7a4a', color: '#fff', fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>P</div>
      )}
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: 14,
        fontSize: 12.5, lineHeight: 1.6,
        background: ai ? '#161616' : '#1a7a4a',
        border: ai ? '1px solid #222' : 'none',
        color: ai ? '#c4c4c4' : '#fff',
        borderBottomLeftRadius: ai ? 4 : 14,
        borderBottomRightRadius: ai ? 14 : 4,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {children}
      </div>
    </motion.div>
  )
}

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', height: 14, padding: '0 2px' }}>
      {[0, 160, 320].map(d => (
        <span key={d} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          background: '#52525b',
          animation: `typDot 1.1s ease-in-out ${d}ms infinite both`,
        }} />
      ))}
    </span>
  )
}
