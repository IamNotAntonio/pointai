'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/* ─── Icons ──────────────────────────────────────────────────────── */
const Icons = {
  Chat: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Scan: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  FileCheck: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
}

/* ─── Chat conversations (4 cursos em loop) ──────────────────────── */
const CHAT_CONVERSATIONS = [
  {
    label: 'Medicina · UNIFESP',
    course: 'Bioquímica II',
    init: 'AM',
    messages: [
      { role: 'user', text: 'Explica o ciclo de Krebs para minha prova de Bioquímica' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>O Ciclo de Krebs ocorre na <strong>matriz mitocondrial</strong> e é o centro do metabolismo aeróbico.</p>
            <p style={{marginTop:8}}>Por glicose oxidada, o ciclo gera:</p>
            <div style={{margin:'8px 0',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.15)',borderRadius:8,padding:'8px 12px',fontFamily:'monospace',fontSize:12,color:'#86efac',lineHeight:1.7}}>
              {'3 NADH  →  27 ATP\n1 FADH₂ →   2 ATP\n→ ~30 ATP por ciclo ✓'}
            </div>
            <p>Quer o mapa das 8 reações com as enzimas da UNIFESP?</p>
          </div>
        ),
      },
      { role: 'user', text: 'Sim, com as enzimas que a prof mais cobra!' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>Baseado nas provas da <strong>Profª Beatriz — UNIFESP/2025</strong>:</p>
            {['Citrato sintase (etapa 1)', 'Isocitrato desidrogenase (etapa 3 — regulatória)', 'α-cetoglutarato desidrogenase (etapa 4)'].map((e, i) => (
              <div key={i} style={{margin:'5px 0',background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.12)',borderRadius:6,padding:'6px 10px',fontSize:12,color:'#c4c4c4'}}>
                ▸ {e}
              </div>
            ))}
            <p style={{marginTop:8}}>Quer simulado com questões no estilo Paulista?</p>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Direito · PUC-SP',
    course: 'Direito Penal',
    init: 'RF',
    messages: [
      { role: 'user', text: 'Qual a diferença entre dolo e culpa no Código Penal?' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>Diferença central no <strong>art. 18 do CP</strong>:</p>
            <div style={{margin:'8px 0',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.15)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#c4c4c4',lineHeight:1.75}}>
              <p><strong style={{color:'#86efac'}}>Dolo</strong> — vontade consciente de praticar o crime</p>
              <p><strong style={{color:'#86efac'}}>Culpa</strong> — resultado não querido por negligência, imprudência ou imperícia</p>
            </div>
            <p>O caso clássico da OAB: motorista bêbado que mata — dolo eventual ou culpa consciente?</p>
          </div>
        ),
      },
      { role: 'user', text: 'Explica dolo eventual vs culpa consciente então' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>Esse é o tema que mais cai na <strong>OAB e no TJSP</strong>:</p>
            {[
              'Dolo eventual: "pode acontecer, e daí?" — assume o risco conscientemente',
              'Culpa consciente: "pode acontecer, mas não vai" — acredita que evita o resultado',
            ].map((e, i) => (
              <div key={i} style={{margin:'5px 0',background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.12)',borderRadius:6,padding:'7px 10px',fontSize:12,color:'#c4c4c4'}}>
                {e}
              </div>
            ))}
            <p style={{marginTop:8}}>Quer os casos paradigmáticos do STJ para fixar?</p>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Administração · FGV',
    course: 'Estratégia Empresarial',
    init: 'JS',
    messages: [
      { role: 'user', text: 'Me ajuda a entender análise SWOT para minha apresentação' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>SWOT é uma ferramenta de <strong>diagnóstico estratégico</strong> — 2 internas + 2 externas:</p>
            <div style={{margin:'8px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {[['S — Forças','Interno +'],['W — Fraquezas','Interno −'],['O — Oportunidades','Externo +'],['T — Ameaças','Externo −']].map(([t,s],i)=>(
                <div key={i} style={{background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.12)',borderRadius:6,padding:'6px 8px',fontSize:11.5,color:'#c4c4c4'}}>
                  <strong style={{color:'#86efac'}}>{t}</strong><br/>{s}
                </div>
              ))}
            </div>
            <p style={{marginTop:4}}>Quer aplicar no case da sua apresentação?</p>
          </div>
        ),
      },
      { role: 'user', text: 'Sim! É sobre a Magazine Luiza' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>SWOT da <strong>Magazine Luiza (2024-2025)</strong>:</p>
            {[
              'Forca: ecossistema digital Magalu + logística própria',
              'Fraqueza: endividamento e margem comprimida no varejo',
              'Oportunidade: expansão do marketplace e fintech',
              'Ameaça: concorrência de Mercado Livre e Shopee',
            ].map((e,i)=>(
              <div key={i} style={{margin:'4px 0',background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.1)',borderRadius:5,padding:'5px 9px',fontSize:11.5,color:'#c4c4c4'}}>
                {e}
              </div>
            ))}
            <p style={{marginTop:8}}>Posso montar a estrutura dos slides também?</p>
          </div>
        ),
      },
    ],
  },
  {
    label: 'Engenharia · USP',
    course: 'Cálculo II',
    init: 'LP',
    messages: [
      { role: 'user', text: 'Como resolver integral por partes? Ex: ∫ x·eˣ dx' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>Integração por partes: <code>∫ u dv = uv − ∫ v du</code></p>
            <p style={{marginTop:8}}>Para <strong>∫ x·eˣ dx</strong>, escolha:</p>
            <div style={{margin:'8px 0',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.15)',borderRadius:8,padding:'8px 12px',fontFamily:'monospace',fontSize:12,color:'#86efac',lineHeight:1.75}}>
              {'u = x    →  du = dx\ndv = eˣdx →  v = eˣ\n\n∫ x·eˣ dx = x·eˣ − eˣ + C\n          = eˣ(x − 1) + C ✓'}
            </div>
          </div>
        ),
      },
      { role: 'user', text: 'E se for ∫ x² · cos(x) dx?' },
      {
        role: 'ai',
        jsx: (
          <div>
            <p>Aqui usa-se <strong>por partes 2× (método tabular)</strong>:</p>
            <div style={{margin:'8px 0',background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.15)',borderRadius:8,padding:'8px 12px',fontFamily:'monospace',fontSize:12,color:'#86efac',lineHeight:1.75}}>
              {'Derivar  x²:  x² → 2x → 2 → 0\nIntegrar cos: sin → -cos → -sin\n\n= x²sin(x) + 2x·cos(x) − 2sin(x) + C'}
            </div>
            <p style={{marginTop:6}}>Quer exercícios no nível P2 da Prof. Ana?</p>
          </div>
        ),
      },
    ],
  },
]

/* ─── Features data ──────────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: Icons.Chat,
    color: '#1a7a4a',
    title: 'Chat por matéria com IA',
    desc: 'Seu tutor pessoal que conhece seu curso, sua faculdade e seu histórico de dificuldades.',
  },
  {
    Icon: Icons.Scan,
    color: '#0e6b3e',
    title: 'Análise de provas e tarefas',
    desc: 'Mande a foto da sua prova. A IA identifica seus erros e cria um plano de recuperação personalizado.',
  },
  {
    Icon: Icons.BarChart,
    color: '#155f3a',
    title: 'Controle de notas e faltas',
    desc: 'Saiba exatamente o que precisa tirar para passar e quantas faltas ainda pode ter em cada matéria.',
  },
  {
    Icon: Icons.Calendar,
    color: '#1a7a4a',
    title: 'Calendário inteligente',
    desc: 'Importe automaticamente do seu portal. Nunca mais perca uma prova ou entrega importante.',
  },
  {
    Icon: Icons.FileCheck,
    color: '#0e6b3e',
    title: 'Correção de trabalhos',
    desc: 'Feedback detalhado com nota estimada antes de entregar. Melhore antes de submeter.',
  },
  {
    Icon: Icons.TrendUp,
    color: '#155f3a',
    title: 'Relatório semanal Pro',
    desc: 'Toda semana um plano de estudos personalizado baseado no seu desempenho real.',
  },
]

/* ─── Testimonials ───────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    text: 'Passei de 4,8 para 8,2 em Cálculo II em um mês. As explicações com contexto de Engenharia fizeram diferença que monitoria nenhuma conseguiu.',
    name: 'Lucas Mendonça',
    course: 'Engenharia Elétrica',
    uni: 'USP',
    init: 'LM',
  },
  {
    text: 'Carreguei minha ementa de Anatomia e em segundos tinha um plano de estudos por tópico, na ordem exata da professora. Revolucionou meu semestre.',
    name: 'Mariana Silva',
    course: 'Medicina',
    uni: 'UNIFESP',
    init: 'MS',
  },
  {
    text: 'Estava com 23 faltas numa disciplina de 32 aulas. O alerta automático me salvou antes de cruzar o limite. Não sabia que estava nessa situação.',
    name: 'Rafael Torres',
    course: 'Direito',
    uni: 'PUC-SP',
    init: 'RT',
  },
]

/* ─── Course names for typewriter ────────────────────────────────── */
const COURSE_NAMES = ['Medicina', 'Direito', 'Engenharia', 'Psicologia', 'Administração', 'Computação', 'Arquitetura', 'Enfermagem']

/* ─── Course typewriter effect ───────────────────────────────────── */
function CourseTypewriter() {
  const [text, setText] = useState('')
  const charIdx = useRef(0)
  const courseIdx = useRef(0)
  const isDeleting = useRef(false)
  const timer = useRef(null)

  useEffect(() => {
    function tick() {
      const course = COURSE_NAMES[courseIdx.current]
      if (!isDeleting.current) {
        charIdx.current++
        setText(course.slice(0, charIdx.current))
        if (charIdx.current === course.length) {
          timer.current = setTimeout(() => { isDeleting.current = true; tick() }, 2200)
          return
        }
        timer.current = setTimeout(tick, 68)
      } else {
        charIdx.current--
        setText(course.slice(0, charIdx.current))
        if (charIdx.current === 0) {
          isDeleting.current = false
          courseIdx.current = (courseIdx.current + 1) % COURSE_NAMES.length
          timer.current = setTimeout(tick, 320)
          return
        }
        timer.current = setTimeout(tick, 32)
      }
    }
    timer.current = setTimeout(tick, 700)
    return () => clearTimeout(timer.current)
  }, [])

  return (
    <span style={{ color: '#22c55e', fontWeight: 700 }}>
      {text}<span style={{ display: 'inline-block', width: 2, height: '1em', background: '#22c55e', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .85s step-end infinite' }} />
    </span>
  )
}

/* ─── Animated Chat — cycles through 4 course conversations ─────── */
function AnimatedChat() {
  const [convIdx, setConvIdx] = useState(0)
  const [msgCount, setMsgCount] = useState(0)
  const [typing, setTyping] = useState(false)
  const [fade, setFade] = useState(false)
  const alive = useRef(true)
  const timer = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    alive.current = true
    setMsgCount(0)
    setTyping(false)
    setFade(false)

    const SEQ = [
      [() => setMsgCount(1),                              1000],
      [() => setTyping(true),                             1800],
      [() => { setTyping(false); setMsgCount(2) },        2400],
      [() => setMsgCount(3),                              1300],
      [() => setTyping(true),                             2100],
      [() => { setTyping(false); setMsgCount(4) },        4600],
      [() => setFade(true),                                650],
      [() => {
        setMsgCount(0)
        setFade(false)
        setConvIdx(c => (c + 1) % CHAT_CONVERSATIONS.length)
      }, 400],
    ]

    let idx = 0
    function step() {
      if (!alive.current) return
      const [fn, delay] = SEQ[idx]
      fn()
      idx++
      if (idx < SEQ.length) timer.current = setTimeout(step, delay)
    }
    timer.current = setTimeout(step, 650)
    return () => { alive.current = false; clearTimeout(timer.current) }
  }, [convIdx])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgCount, typing])

  const conv = CHAT_CONVERSATIONS[convIdx]
  const visible = conv.messages.slice(0, msgCount)

  return (
    <div>
      {/* Course label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, opacity: fade ? 0 : 1, transition: 'opacity .5s ease' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2.2s ease infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a', letterSpacing: '.02em' }}>{conv.label}</span>
        <span style={{ fontSize: 11, color: '#333', background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.15)', padding: '2px 8px', borderRadius: 99, color: '#4ade80', fontWeight: 600 }}>{conv.course}</span>
      </div>

      {/* Chat window */}
      <div style={{ opacity: fade ? 0 : 1, transition: 'opacity .5s ease', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.8), 0 0 0 1px #1a1a1a, 0 0 60px rgba(26,122,74,.08)' }}>
        {/* Title bar */}
        <div style={{ background: '#111', borderBottom: '1px solid #1a1a1a', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#71717a', fontWeight: 500 }}>Point</span>
          <span style={{ background: 'rgba(26,122,74,.12)', border: '1px solid rgba(26,122,74,.22)', color: '#22c55e', fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>{conv.course}</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {visible.map((msg, i) => (
            <div key={`${convIdx}-${i}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-end', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', animation: 'chatMsgIn .35s cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: msg.role === 'ai' ? '#1a7a4a' : '#1c1c1c', color: msg.role === 'ai' ? '#fff' : '#666', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.role === 'ai' ? 'P' : conv.init}
              </div>
              <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 16, fontSize: 12.5, lineHeight: 1.6, background: msg.role === 'ai' ? '#161616' : '#1a7a4a', border: msg.role === 'ai' ? '1px solid #222' : 'none', color: msg.role === 'ai' ? '#c4c4c4' : '#fff', borderBottomLeftRadius: msg.role === 'ai' ? 4 : 16, borderBottomRightRadius: msg.role === 'user' ? 4 : 16 }}>
                {msg.jsx ?? <span>{msg.text}</span>}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end', animation: 'chatMsgIn .28s ease both' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a7a4a', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P</div>
              <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 16, borderBottomLeftRadius: 4, padding: '12px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 160, 320].map(d => (
                  <span key={d} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#444', animation: `typDot 1.1s ease-in-out ${d}ms infinite both` }} />
                ))}
              </div>
            </div>
          )}
          <div style={{ height: 4 }} />
        </div>
      </div>
    </div>
  )
}

/* ─── Counter animation ──────────────────────────────────────────── */
function CountUp({ target, suffix = '', prefix = '', duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const numTarget = parseFloat(target.replace(/[^0-9.]/g, ''))
        function frame(now) {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(eased * numTarget * 10) / 10)
          if (p < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }
    }, { threshold: 0.5 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [target, duration])

  const display = typeof target === 'string' && target.includes('.') ? val.toFixed(1) : Math.round(val)

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

/* ─── Scroll Reveal Hook ─────────────────────────────────────────── */
function useScrollReveal(selector = '.reveal') {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target) } }),
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )
    const timeout = setTimeout(() => {
      document.querySelectorAll(selector).forEach(el => io.observe(el))
    }, 100)
    return () => { clearTimeout(timeout); io.disconnect() }
  }, [selector])
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [supportOpen, setSupportOpen] = useState(false)
  useScrollReveal('.reveal')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#0c0c0c;color:#fff;font-family:var(--font-geist-sans,system-ui,-apple-system,sans-serif);-webkit-font-smoothing:antialiased;overflow-x:hidden}

        /* ── Reveal animations ── */
        .reveal{opacity:0;transform:translateY(32px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
        .reveal.revealed{opacity:1;transform:none}
        .reveal.d1{transition-delay:.1s}.reveal.d2{transition-delay:.2s}.reveal.d3{transition-delay:.3s}
        .reveal.d4{transition-delay:.4s}.reveal.d5{transition-delay:.5s}.reveal.d6{transition-delay:.6s}

        /* ── Nav ── */
        .nav{position:fixed;top:0;left:0;right:0;z-index:300;height:66px;padding:0 48px;display:flex;align-items:center;justify-content:space-between;transition:background .4s,border-color .4s,backdrop-filter .4s;border-bottom:1px solid transparent}
        .nav.solid{background:rgba(12,12,12,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-color:#1a1a1a}
        .nav-logo{display:inline-flex;align-items:center;gap:10px;font-size:18px;font-weight:900;color:#22c55e;letter-spacing:-.4px;text-decoration:none}
        .nav-links{display:flex;align-items:center;gap:4px}
        .nav-link{color:#71717a;font-size:14px;font-weight:500;text-decoration:none;padding:7px 14px;border-radius:8px;transition:color .15s,background .15s}
        .nav-link:hover{color:#e4e4e7;background:#ffffff08}
        .nav-cta{background:#1a7a4a;color:#fff;font-size:14px;font-weight:700;padding:9px 20px;border-radius:10px;text-decoration:none;border:1px solid rgba(34,197,94,.25);transition:all .2s;box-shadow:0 0 20px rgba(26,122,74,.3);margin-left:6px}
        .nav-cta:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 32px rgba(26,122,74,.5)}

        /* ── Hero ── */
        .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:60px;padding:130px 80px 100px;max-width:1280px;margin:0 auto;position:relative}
        .hero-bg{position:fixed;inset:0;pointer-events:none;z-index:0}
        .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(26,122,74,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(26,122,74,.055) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 90% 80% at 30% 50%,black 20%,transparent 85%);-webkit-mask-image:radial-gradient(ellipse 90% 80% at 30% 50%,black 20%,transparent 85%);animation:gridDrift 30s linear infinite}
        .hero-glow{position:absolute;top:-10%;left:-5%;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(26,122,74,.22) 0%,rgba(26,122,74,.06) 50%,transparent 70%);filter:blur(6px);pointer-events:none}
        .hero-left{position:relative;z-index:2}
        .hero-right{position:relative;z-index:2}

        .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(26,122,74,.1);border:1px solid rgba(26,122,74,.24);color:#86efac;font-size:12px;font-weight:600;padding:6px 16px;border-radius:99px;margin-bottom:28px;letter-spacing:.02em}
        .badge-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;animation:pulse 2.2s ease infinite}

        .hero-h1{font-size:clamp(40px,4.8vw,68px);font-weight:900;line-height:1.06;letter-spacing:-2.5px;color:#fff;margin-bottom:12px}
        .hero-h1 em{color:#22c55e;font-style:normal}
        .hero-sub{font-size:clamp(16px,1.6vw,19px);color:#a1a1aa;line-height:1.7;margin-bottom:36px;max-width:480px}

        .btn-primary{display:inline-flex;align-items:center;gap:8px;background:#1a7a4a;color:#fff;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;border:1px solid rgba(34,197,94,.28);transition:all .22s;animation:ctaGlow 2.8s ease-in-out infinite}
        .btn-primary:hover{background:#155f3a;transform:translateY(-2px)}
        .btn-outline{display:inline-flex;align-items:center;gap:8px;color:#a1a1aa;font-size:15px;font-weight:500;padding:14px 22px;border-radius:12px;text-decoration:none;border:1px solid #242424;transition:all .22s}
        .btn-outline:hover{border-color:#333;color:#ccc;background:#ffffff06}

        .hero-btns{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:56px}

        .metrics{display:flex;align-items:center;gap:0}
        .metric{padding:0 32px;text-align:center;border-right:1px solid #1e1e1e}
        .metric:first-child{padding-left:0}
        .metric:last-child{border:none}
        .metric-n{font-size:32px;font-weight:900;color:#fff;letter-spacing:-1.5px;line-height:1}
        .metric-n em{color:#22c55e;font-style:normal}
        .metric-l{font-size:11.5px;color:#71717a;margin-top:5px;font-weight:500}

        /* ── Section shared ── */
        .section{padding:110px 24px}
        .wrap{max-width:1200px;margin:0 auto}
        .sec-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#22c55e;margin-bottom:12px}
        .sec-title{font-size:clamp(30px,4vw,50px);font-weight:900;color:#fff;letter-spacing:-1.5px;line-height:1.14;margin-bottom:16px}
        .sec-sub{font-size:16px;color:#c4c4c4;line-height:1.72;max-width:460px}

        /* ── Features ── */
        .features-header{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:end;margin-bottom:64px}
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#151515;border-radius:24px;overflow:hidden;border:1px solid #151515}
        .feat-card{background:#0c0c0c;padding:32px;position:relative;overflow:hidden;cursor:default;transition:background .3s}
        .feat-card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 0 0,rgba(26,122,74,.12) 0%,transparent 60%);opacity:0;transition:opacity .35s}
        .feat-card:hover{background:#0f0f0f}
        .feat-card:hover::before{opacity:1}
        .feat-card:hover .feat-top-line{opacity:1}
        .feat-top-line{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(34,197,94,.5),transparent);opacity:0;transition:opacity .35s}
        .feat-icon-wrap{width:56px;height:56px;border-radius:16px;background:rgba(26,122,74,.08);border:1px solid rgba(26,122,74,.16);display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:#22c55e;position:relative;z-index:1;transition:background .3s,border-color .3s}
        .feat-card:hover .feat-icon-wrap{background:rgba(26,122,74,.14);border-color:rgba(34,197,94,.28)}
        .feat-title{font-size:15px;font-weight:700;color:#e4e4e7;margin-bottom:10px;position:relative;z-index:1}
        .feat-desc{font-size:13.5px;color:#b0b0b0;line-height:1.7;position:relative;z-index:1}

        /* ── How it works ── */
        .how-bg{background:#070707;border-top:1px solid #111;border-bottom:1px solid #111}
        .how-layout{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;max-width:1200px;margin:0 auto;padding:110px 24px}
        .steps{display:flex;flex-direction:column;gap:0;margin-top:44px}
        .step{display:flex;gap:24px;padding:28px 0;border-bottom:1px solid #0f0f0f;position:relative}
        .step:last-child{border:none}
        .step-num{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:rgba(26,122,74,.08);border:1px solid rgba(26,122,74,.2);color:#22c55e;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center}
        .step-title{font-size:16px;font-weight:700;color:#e4e4e7;margin-bottom:6px}
        .step-desc{font-size:14px;color:#c4c4c4;line-height:1.65}

        /* ── Preview tabs ── */
        .preview-bg{background:#0c0c0c}
        .preview-wrap{max-width:1200px;margin:0 auto;padding:110px 24px}
        .preview-header{text-align:center;margin-bottom:52px}
        .tab-bar{display:flex;gap:4px;justify-content:center;margin-bottom:40px;background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;padding:4px;width:fit-content;margin-left:auto;margin-right:auto}
        .tab-btn{padding:9px 24px;border-radius:9px;font-size:14px;font-weight:600;color:#555;cursor:pointer;border:none;background:transparent;transition:all .2s}
        .tab-btn.active{background:#1a7a4a;color:#fff;box-shadow:0 0 16px rgba(26,122,74,.35)}
        .tab-btn:not(.active):hover{color:#aaa;background:#ffffff06}
        .preview-panel{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:24px;overflow:hidden;max-width:860px;margin:0 auto;box-shadow:0 40px 100px rgba(0,0,0,.6)}
        .preview-bar{background:#111;border-bottom:1px solid #1a1a1a;padding:14px 20px;display:flex;align-items:center;gap:10px}

        /* Stats bar inside preview */
        .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#151515}
        .stat-cell{background:#0d0d0d;padding:20px;text-align:center}
        .stat-val{font-size:26px;font-weight:900;color:#22c55e;letter-spacing:-1px}
        .stat-key{font-size:11px;color:#71717a;margin-top:3px;font-weight:500}

        /* ── Testimonials ── */
        .testi-bg{background:#060606;border-top:1px solid #0f0f0f;border-bottom:1px solid #0f0f0f}
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px}
        .tcard{background:#0c0c0c;border:1px solid #181818;border-radius:20px;padding:28px;display:flex;flex-direction:column;transition:border-color .25s,transform .25s,box-shadow .25s}
        .tcard:hover{border-color:rgba(26,122,74,.3);transform:translateY(-4px);box-shadow:0 24px 60px rgba(0,0,0,.4),0 0 0 1px rgba(26,122,74,.1)}
        .tcard-stars{display:flex;gap:3px;margin-bottom:16px}
        .tcard-quote{font-size:14px;color:#c4c4c4;line-height:1.76;font-style:italic;flex:1;margin-bottom:24px}
        .tcard-author{display:flex;align-items:center;gap:12px}
        .tcard-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:rgba(26,122,74,.1);border:1px solid rgba(26,122,74,.2);color:#22c55e;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .tcard-name{font-size:14px;font-weight:700;color:#e4e4e7}
        .tcard-info{font-size:11.5px;color:#71717a;margin-top:2px}

        /* ── Final CTA ── */
        .fcta{padding:130px 24px;text-align:center;background:linear-gradient(180deg,rgba(26,122,74,.06) 0%,rgba(12,12,12,0) 40%),radial-gradient(ellipse 70% 60% at 50% 0%,rgba(26,122,74,.14) 0%,transparent 70%);border-top:1px solid #111;position:relative;overflow:hidden}
        .fcta-glow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:400px;background:radial-gradient(ellipse,rgba(26,122,74,.1) 0%,transparent 70%);pointer-events:none}
        .fcta-title{font-size:clamp(34px,5.5vw,66px);font-weight:900;color:#fff;letter-spacing:-2.5px;line-height:1.08;margin-bottom:20px}
        .fcta-sub{font-size:18px;color:#c4c4c4;margin-bottom:40px}
        .fcta-note{font-size:13px;color:#71717a;margin-top:20px;display:flex;align-items:center;justify-content:center;gap:16px}
        .fcta-note-item{display:flex;align-items:center;gap:6px}

        /* ── Footer ── */
        .footer{padding:32px 48px;border-top:1px solid #111;display:flex;align-items:center;justify-content:space-between;background:#0c0c0c}
        .footer-copy{font-size:12px;color:#71717a}
        .footer-links{display:flex;gap:24px}
        .footer-a{font-size:12px;color:#71717a;text-decoration:none;transition:color .15s}
        .footer-a:hover{color:#a1a1aa}

        /* ── Courses section ── */
        .courses-sec{padding:72px 24px;background:#070707;border-top:1px solid #111;border-bottom:1px solid #111}
        .courses-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:36px;max-width:760px;margin-left:auto;margin-right:auto}
        .chip{display:inline-flex;align-items:center;padding:9px 18px;border-radius:99px;font-size:13px;font-weight:600;background:rgba(26,122,74,.08);border:1px solid rgba(34,197,94,.18);color:#86efac;cursor:default;transition:transform .2s,box-shadow .2s}
        .chip:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(26,122,74,.15)}

        /* ── Keyframes ── */
        @keyframes gridDrift{from{background-position:0 0,0 0}to{background-position:60px 60px,60px 60px}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}60%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
        @keyframes ctaGlow{0%,100%{box-shadow:0 0 24px rgba(26,122,74,.38),0 0 60px rgba(26,122,74,.1)}50%{box-shadow:0 0 44px rgba(26,122,74,.65),0 0 90px rgba(26,122,74,.2)}}
        @keyframes chatMsgIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes typDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

        /* ── Responsive ── */
        @media(max-width:1024px){
          .hero{grid-template-columns:1fr;padding:120px 32px 80px;text-align:center;gap:48px}
          .hero-sub{margin-left:auto;margin-right:auto}
          .hero-btns{justify-content:center}
          .metrics{justify-content:center}
          .metric:first-child{padding-left:32px}
          .features-header{grid-template-columns:1fr}
          .how-layout{grid-template-columns:1fr;padding:80px 24px}
          .feat-grid{grid-template-columns:repeat(2,1fr)}
          .testi-grid{grid-template-columns:1fr}
        }
        @media(max-width:640px){
          .nav{padding:0 20px}
          .nav-links .nav-link{display:none}
          .feat-grid{grid-template-columns:1fr}
          .metrics{flex-direction:column;gap:20px}
          .metric{border:none;padding:0}
          .stat-row{grid-template-columns:repeat(2,1fr)}
        }
      `}</style>

      {/* ─── Support Modal ──────────────────────────────────────────── */}
      {supportOpen && (
        <div onClick={() => setSupportOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 24, padding: '40px 36px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 40px 100px rgba(0,0,0,.8)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(26,122,74,.1)', border: '1px solid rgba(34,197,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 21, fontWeight: 800, color: '#f4f4f5', marginBottom: 12, letterSpacing: '-0.5px' }}>Suporte em breve</h3>
            <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.75, marginBottom: 28 }}>
              Estamos preparando nosso canal de suporte dedicado. Enquanto isso, conte com o{' '}
              <strong style={{ color: '#e4e4e7' }}>Assistente Point</strong> dentro do app — ele responde dúvidas sobre o uso da plataforma.
            </p>
            <button onClick={() => setSupportOpen(false)} style={{ background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <nav className={`nav ${scrolled ? 'solid' : ''}`}>
        <span className="nav-logo">
          <Image src="/logo-mark.png" alt="" width={40} height={40} priority />
          Point
        </span>
        <div className="nav-links">
          <a href="#funcionalidades" className="nav-link">Funcionalidades</a>
          <a href="#como-funciona" className="nav-link">Como funciona</a>
          <button onClick={() => setSupportOpen(true)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Suporte</button>
          <Link href="/login" className="nav-link">Entrar</Link>
          <Link href="/onboarding" className="nav-cta">Começar grátis</Link>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
        <div className="hero-grid" />
        <div className="hero-glow" />

        <div className="hero" style={{ position: 'relative', zIndex: 2 }}>
          {/* Left */}
          <div className="hero-left">
            <div className="badge" style={{ animation: 'fadeUp .6s .1s both' }}>
              <span className="badge-dot" />
              Feito para universitários brasileiros
            </div>

            <h1 className="hero-h1" style={{ animation: 'fadeUp .7s .2s both' }}>
              Estude com <em>inteligência</em>,<br />
              não com esforço.
            </h1>

            <p style={{ fontSize: 15, color: '#c4c4c4', margin: '14px 0 0', animation: 'fadeUp .7s .28s both', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              Para <CourseTypewriter /> e muito mais.
            </p>

            <p className="hero-sub" style={{ animation: 'fadeUp .7s .36s both', marginTop: 18 }}>
              A plataforma que te leva ao melhor desempenho acadêmico — personalizada pro seu curso, sua faculdade e o seu jeito de aprender.
            </p>

            <div className="hero-btns" style={{ animation: 'fadeUp .7s .4s both' }}>
              <Link href="/onboarding" className="btn-primary">
                Começar grátis <Icons.ArrowRight />
              </Link>
              <a href="#como-funciona" className="btn-outline">
                <Icons.Play /> Ver como funciona
              </a>
            </div>

            <div className="metrics" style={{ animation: 'fadeUp .7s .55s both' }}>
              {[
                { n: '9', suf: 'M+', pre: '', label: 'universitários no Brasil' },
                { n: '24', suf: 'h', pre: '', label: 'disponível' },
                { n: '100', suf: '%', pre: '', label: 'personalizado' },
              ].map((m, i) => (
                <div key={i} className="metric">
                  <p className="metric-n">
                    <em><CountUp target={m.n} suffix={m.suf} prefix={m.pre} /></em>
                  </p>
                  <p className="metric-l">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live chat */}
          <div className="hero-right" style={{ animation: 'fadeUp .8s .3s both' }}>
            <AnimatedChat />
          </div>
        </div>
      </section>

      {/* ─── Courses ────────────────────────────────────────────────── */}
      <section className="courses-sec">
        <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <div className="reveal">
            <p className="sec-eyebrow">Compatibilidade</p>
            <h2 className="sec-title" style={{ textAlign: 'center' }}>
              Para qualquer curso,<br />em qualquer faculdade.
            </h2>
            <p className="sec-sub" style={{ textAlign: 'center', margin: '0 auto 0', maxWidth: 500 }}>
              O Point aprende o vocabulário, as cobranças e o estilo de cada área do conhecimento.
            </p>
          </div>

          <div className="courses-chips reveal d1">
            {['Medicina','Direito','Engenharia','Administração','Psicologia','Ciência da Computação','Arquitetura','Enfermagem','Economia','Nutrição','Farmácia','Veterinária','Educação Física','Jornalismo'].map((name, i) => (
              <span key={i} className="chip">{name}</span>
            ))}
          </div>

          <div className="reveal d2" style={{ marginTop: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#f4f4f5', marginBottom: 10 }}>
              e mais de{' '}
              <span style={{ color: '#22c55e', fontWeight: 700 }}>50</span>
              {' '}outros cursos reconhecidos automaticamente
            </p>
            <p style={{ fontSize: 13, color: '#c4c4c4' }}>
              Se o seu curso não aparecer, basta digitar — o Point aprende qualquer área.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────── */}
      <section className="section" id="funcionalidades" style={{ background: '#0a0a0a', borderTop: '1px solid #111' }}>
        <div className="wrap">
          <div className="features-header">
            <div className="reveal">
              <p className="sec-eyebrow">Funcionalidades</p>
              <h2 className="sec-title">Cada ferramenta resolve<br />um problema real.</h2>
            </div>
            <div className="reveal d1">
              <p className="sec-sub">Desenvolvidas para os gargalos que universitários brasileiros enfrentam semestre após semestre.</p>
            </div>
          </div>

          <div className="feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className={`feat-card reveal d${(i % 3) + 1}`}>
                <div className="feat-top-line" />
                <div className="feat-icon-wrap">
                  <f.Icon />
                </div>
                <p className="feat-title">{f.title}</p>
                <p className="feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────── */}
      <div className="how-bg" id="como-funciona">
        <div className="how-layout">
          <div>
            <div className="reveal">
              <p className="sec-eyebrow">Como funciona</p>
              <h2 className="sec-title">Três passos para mudar seu semestre.</h2>
            </div>
            <div className="steps">
              {[
                {
                  n: '1',
                  title: 'Crie sua conta em 2 minutos',
                  desc: 'Informe seu curso, faculdade e matérias. Sem formulários longos, sem complicação.',
                },
                {
                  n: '2',
                  title: 'A IA aprende com você',
                  desc: 'O Point personaliza tudo para o seu perfil acadêmico — respostas, exercícios e alertas feitos para você.',
                },
                {
                  n: '3',
                  title: 'Evolua toda semana',
                  desc: 'Acompanhe seu progresso, melhore suas notas e receba planos de estudo baseados no seu desempenho real.',
                },
              ].map((s, i) => (
                <div key={i} className={`step reveal d${i + 1}`}>
                  <div className="step-num">{s.n}</div>
                  <div>
                    <p className="step-title">{s.title}</p>
                    <p className="step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal d2">
            {/* Visual: chat live */}
            <AnimatedChat />
          </div>
        </div>
      </div>

      {/* ─── Preview ────────────────────────────────────────────────── */}
      <section className="preview-bg" id="preview" style={{ borderTop: '1px solid #111' }}>
        <div className="preview-wrap">
          <div className="preview-header reveal">
            <p className="sec-eyebrow" style={{ textAlign: 'center' }}>Preview real</p>
            <h2 className="sec-title" style={{ textAlign: 'center' }}>Veja o produto em ação.</h2>
            <p className="sec-sub" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 440 }}>Não é um protótipo. É o Point real, funcionando agora mesmo para milhares de estudantes.</p>
          </div>

          <div style={{ marginTop: 40 }} className="reveal d1">
            <div className="tab-bar">
              {[
                { id: 'chat', label: 'Chat IA' },
                { id: 'notas', label: 'Notas' },
                { id: 'calendario', label: 'Calendário' },
              ].map(t => (
                <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="preview-panel">
              <div className="preview-bar">
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
                    <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 12.5, color: '#71717a', fontWeight: 500 }}>
                  {activeTab === 'chat' && 'Point — Chat · Cálculo I'}
                  {activeTab === 'notas' && 'Point — Notas e Frequência'}
                  {activeTab === 'calendario' && 'Point — Calendário Acadêmico'}
                </span>
                <span style={{ background: 'rgba(26,122,74,.1)', border: '1px solid rgba(26,122,74,.2)', color: '#22c55e', fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                  Ao vivo
                </span>
              </div>

              {activeTab === 'chat' && (
                <div style={{ padding: '0' }}>
                  <AnimatedChat />
                </div>
              )}

              {activeTab === 'notas' && (
                <div>
                  <div className="stat-row">
                    {[
                      { val: '8.4', key: 'Média Geral' },
                      { val: '5', key: 'Matérias' },
                      { val: '3', key: 'Alertas' },
                      { val: '87%', key: 'Frequência' },
                    ].map((s, i) => (
                      <div key={i} className="stat-cell">
                        <p className="stat-val">{s.val}</p>
                        <p className="stat-key">{s.key}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { name: 'Cálculo I', avg: 8.2, abs: 4, maxAbs: 14, color: '#22c55e' },
                      { name: 'Física II', avg: 6.8, abs: 9, maxAbs: 14, color: '#f59e0b' },
                      { name: 'Programação', avg: 9.1, abs: 1, maxAbs: 14, color: '#22c55e' },
                      { name: 'Álgebra Linear', avg: 5.9, abs: 11, maxAbs: 14, color: '#ef4444' },
                    ].map((m, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{m.name}</span>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ fontSize: 12, color: m.color, fontWeight: 700 }}>Média: {m.avg}</span>
                            <span style={{ fontSize: 12, color: m.abs >= 10 ? '#ef4444' : '#71717a' }}>Faltas: {m.abs}/{m.maxAbs}</span>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: '#151515', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(m.avg / 10) * 100}%`, borderRadius: 99, background: m.color, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'calendario' && (
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#ccc' }}>Maio 2026</span>
                    <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>3 eventos próximos</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { date: 'Seg, 20 Mai', event: 'Prova P2 — Cálculo I', days: 0, color: '#ef4444', tag: 'HOJE' },
                      { date: 'Qua, 22 Mai', event: 'Entrega — Trabalho de Física', days: 2, color: '#f59e0b', tag: '2 dias' },
                      { date: 'Sex, 30 Mai', event: 'Prova P1 — Álgebra Linear', days: 10, color: '#22c55e', tag: '10 dias' },
                    ].map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#111', border: `1px solid ${ev.color}22`, borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ width: 3, height: 36, borderRadius: 99, background: ev.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{ev.event}</p>
                          <p style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>{ev.date}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ev.color, background: `${ev.color}15`, border: `1px solid ${ev.color}30`, padding: '3px 10px', borderRadius: 99 }}>{ev.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────── */}
      <section className="section testi-bg">
        <div className="wrap">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <p className="sec-eyebrow">Resultados reais</p>
            <h2 className="sec-title" style={{ textAlign: 'center' }}>O que universitários dizem.</h2>
          </div>

          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`tcard reveal d${i + 1}`}>
                <div className="tcard-stars">
                  {[...Array(5)].map((_, j) => <Icons.Star key={j} />)}
                </div>
                <p className="tcard-quote">&ldquo;{t.text}&rdquo;</p>
                <div className="tcard-author">
                  <div className="tcard-av">{t.init}</div>
                  <div>
                    <p className="tcard-name">{t.name}</p>
                    <p className="tcard-info">{t.course} · {t.uni}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────────── */}
      <section className="fcta">
        <div className="fcta-glow" />

        <div className="reveal" style={{ position: 'relative', zIndex: 1 }}>
          <p className="sec-eyebrow" style={{ marginBottom: 20 }}>Pronto?</p>
          <h2 className="fcta-title">
            Pronto para estudar<br />do jeito certo?
          </h2>
          <p className="fcta-sub">A plataforma que transforma esforço em resultado.</p>

          <Link href="/onboarding" className="btn-primary reveal d1" style={{ fontSize: 17, padding: '16px 36px', borderRadius: 14 }}>
            Criar minha conta grátis <Icons.ArrowRight />
          </Link>

          <div className="fcta-note reveal d2">
            {[
              'Sem cartão de crédito',
              'Cancele quando quiser',
              '100% gratuito para começar',
            ].map((note, i) => (
              <span key={i} className="fcta-note-item">
                <Icons.Check /> {note}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="footer">
        <span className="nav-logo">
          <Image src="/logo-mark.png" alt="" width={24} height={24} />
          Point
        </span>
        <p className="footer-copy">&copy; 2026 Point &mdash; Feito para universitários brasileiros</p>
        <div className="footer-links">
          <Link href="/privacidade" className="footer-a">Política de Privacidade</Link>
          <Link href="/termos" className="footer-a">Termos de Uso</Link>
          <button onClick={() => setSupportOpen(true)} className="footer-a" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>Suporte</button>
          <a href="mailto:contato@pointai.com.br" className="footer-a">Contato</a>
        </div>
      </footer>
    </>
  )
}
