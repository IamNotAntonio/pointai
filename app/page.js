'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── SVG Icons ─────────────────────────────────────────────────── */
const Ic = {
  Chat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  FileCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Target: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Star: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#22c55e" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
}

/* ─── Data ──────────────────────────────────────────────────────── */
const TYPED_PHRASES = [
  'Evolua todo dia.',
  'Supere suas metas.',
  'Domine suas matérias.',
  'Alcance aprovação.',
]

const FEATURES = [
  {
    Icon: Ic.Chat,
    title: 'Chat por matéria',
    desc: 'Contexto persistente por disciplina. A IA retém o histórico das suas dúvidas, calibra a complexidade das respostas e antecipa lacunas antes da prova.',
  },
  {
    Icon: Ic.BarChart,
    title: 'Notas e frequência',
    desc: 'Média ponderada automática, projeção da nota necessária na próxima avaliação e alerta antecipado de limite de faltas por disciplina.',
  },
  {
    Icon: Ic.Calendar,
    title: 'Calendário acadêmico',
    desc: 'Mapeie provas, entregas e apresentações. O sistema calcula distância entre eventos e distribui carga de revisão com base no prazo real.',
  },
  {
    Icon: Ic.FileCheck,
    title: 'Correção de trabalhos',
    desc: 'Avaliação estruturada do seu rascunho: nota estimada, análise de argumentação, coesão textual e sugestões de reescrita por parágrafo.',
  },
  {
    Icon: Ic.TrendUp,
    title: 'Dashboard de evolução',
    desc: 'Médias por disciplina, frequência consolidada, alertas de risco e projeção de aprovação — atualizados em tempo real a cada entrada de dados.',
  },
  {
    Icon: Ic.Target,
    title: 'Personalização profunda',
    desc: 'O Point.AI ingere seu curso, universidade, semestre e objetivos para entregar respostas contextualmente precisas — nada genérico.',
  },
]

/* ─── Chat demo data ─────────────────────────────────────────────── */
const CHAT_MESSAGES = [
  {
    role: 'user',
    content: 'Derivadas sempre me confundem. Como pensar nisso de forma intuitiva?',
  },
  {
    role: 'assistant',
    jsx: (
      <div>
        <p>Pensa na derivada como a <strong>taxa de variação instantânea</strong> — quão rápido uma grandeza muda num ponto específico.</p>
        <p style={{marginTop:7}}>Regra fundamental: se <code>f(x) = xⁿ</code>, então <code>f′(x) = n·xⁿ⁻¹</code></p>
        <p style={{marginTop:7}}><strong>Aplicado à Engenharia:</strong></p>
        <ul style={{marginTop:4,paddingLeft:16,display:'flex',flexDirection:'column',gap:2}}>
          <li>Posição: <code>s(t) = 3t²</code></li>
          <li>Velocidade: <code>s′(t) = 6t</code></li>
          <li>Em t = 2 s → v = 12 m/s</li>
        </ul>
        <p style={{marginTop:7}}>Quer que eu monte um exercício no nível da sua prova?</p>
      </div>
    ),
  },
  {
    role: 'user',
    content: 'Sim, parecido com o estilo da Profª Carla.',
  },
  {
    role: 'assistant',
    jsx: (
      <div>
        <p>Com base na sua ementa de <strong>Cálculo I</strong>:</p>
        <div style={{margin:'8px 0',background:'rgba(26,122,74,.09)',border:'1px solid rgba(26,122,74,.18)',borderRadius:6,padding:'8px 12px',fontFamily:'monospace',fontSize:12,color:'#c4c4c4',lineHeight:1.5}}>
          {'Calcule f′(x) para f(x) = 4x³ − 2x + 7'}
        </div>
        <p>Aplique <code>n·xⁿ⁻¹</code> a cada termo separadamente. Qual resultado você obtém?</p>
      </div>
    ),
  },
]

/* ─── Animated Chat ──────────────────────────────────────────────── */
function AnimatedChat() {
  const [msgCount, setMsgCount]   = useState(0)
  const [showTyping, setTyping]   = useState(false)
  const [fade, setFade]           = useState(false)
  const alive    = useRef(true)
  const timerRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    alive.current = true

    // Each entry: [action, delayBeforeNext(ms)]
    const SEQ = [
      [() => setMsgCount(1),                             1400],
      [() => setTyping(true),                            2100],
      [() => { setTyping(false); setMsgCount(2) },       2800],
      [() => setMsgCount(3),                             1300],
      [() => setTyping(true),                            2000],
      [() => { setTyping(false); setMsgCount(4) },       4200],
      [() => setFade(true),                               700],
      [() => { setMsgCount(0); setFade(false) },          600],
    ]

    let idx = 0
    function step() {
      if (!alive.current) return
      const [fn, delay] = SEQ[idx]
      fn()
      idx = (idx + 1) % SEQ.length
      timerRef.current = setTimeout(step, delay)
    }
    timerRef.current = setTimeout(step, 900)

    return () => { alive.current = false; clearTimeout(timerRef.current) }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgCount, showTyping])

  const visible = CHAT_MESSAGES.slice(0, msgCount)

  return (
    <div className="lp-win" style={{ opacity: fade ? 0 : 1, transition: 'opacity .6s ease' }}>
      {/* Title bar */}
      <div className="lp-win-bar">
        <div className="lp-dots">
          <div className="lp-dot" style={{ background:'#ff5f57' }} />
          <div className="lp-dot" style={{ background:'#febc2e' }} />
          <div className="lp-dot" style={{ background:'#28c840' }} />
        </div>
        <span className="lp-win-title">Point.AI</span>
        <span className="lp-tag">Cálculo I</span>
      </div>

      {/* Messages */}
      <div className="lp-msgs-scroll" ref={scrollRef}>
        {visible.map((msg, i) => (
          <div key={i} className={`lp-msg ${msg.role}`} style={{ animation: 'lpMsgIn .32s cubic-bezier(.16,1,.3,1) both' }}>
            <div className={`lp-av ${msg.role}`}>{msg.role === 'assistant' ? 'P' : 'V'}</div>
            <div className={`lp-bubble ${msg.role}`}>
              {msg.jsx ?? <span>{msg.content}</span>}
            </div>
          </div>
        ))}

        {showTyping && (
          <div className="lp-msg assistant" style={{ animation: 'lpMsgIn .28s ease both' }}>
            <div className="lp-av">P</div>
            <div className="lp-bubble assistant lp-typing-bubble">
              <span className="lp-tdot" style={{ animationDelay:'0ms' }} />
              <span className="lp-tdot" style={{ animationDelay:'160ms' }} />
              <span className="lp-tdot" style={{ animationDelay:'320ms' }} />
            </div>
          </div>
        )}
        <div style={{ height: 4 }} />
      </div>
    </div>
  )
}

/* ─── Typing headline ────────────────────────────────────────────── */
function TypingEffect({ phrases, speed = 60, pause = 2600 }) {
  const [text, setText] = useState('')
  const pIdx = useRef(0), cIdx = useRef(0), del = useRef(false), t = useRef(null)

  useEffect(() => {
    function tick() {
      const phrase = phrases[pIdx.current], ci = cIdx.current, d = del.current
      if (!d && ci === phrase.length) { t.current = setTimeout(() => { del.current = true; tick() }, pause); return }
      if (d && ci === 0) { del.current = false; pIdx.current = (pIdx.current + 1) % phrases.length; t.current = setTimeout(tick, 340); return }
      const next = d ? ci - 1 : ci + 1
      cIdx.current = next
      setText(phrases[pIdx.current].slice(0, next))
      t.current = setTimeout(tick, d ? speed * 0.42 : speed)
    }
    t.current = setTimeout(tick, 700)
    return () => clearTimeout(t.current)
  }, [phrases, speed, pause])

  return <span>{text}<span className="lp-cursor">|</span></span>
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-in'); io.unobserve(e.target) } }),
      { threshold: 0.09, rootMargin: '0px 0px -24px 0px' }
    )
    setTimeout(() => document.querySelectorAll('.lp-reveal').forEach(el => io.observe(el)), 80)
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect() }
  }, [])

  return (
    <>
      <style>{`
        /* ── Base ── */
        .lp{background:#0a0a0a;color:#fff;font-family:var(--font-geist-sans,system-ui,sans-serif);-webkit-font-smoothing:antialiased}

        /* ── Reveal ── */
        .lp-reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
        .lp-reveal.lp-in{opacity:1;transform:none}
        .lp-d1{transition-delay:.12s}.lp-d2{transition-delay:.24s}.lp-d3{transition-delay:.36s}.lp-d4{transition-delay:.48s}.lp-d5{transition-delay:.60s}

        /* ── Nav ── */
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:62px;padding:0 44px;display:flex;align-items:center;justify-content:space-between;transition:background .4s,border-color .4s,backdrop-filter .4s;border-bottom:1px solid transparent}
        .lp-nav.solid{background:rgba(10,10,10,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-color:#1c1c1c}
        .lp-logo{font-size:17px;font-weight:800;color:#22c55e;letter-spacing:-.3px;text-decoration:none}
        .lp-nav-links{display:flex;align-items:center;gap:6px}
        .lp-navlink{color:#a1a1aa;font-size:14px;font-weight:500;text-decoration:none;padding:7px 13px;border-radius:8px;transition:color .15s,background .15s}
        .lp-navlink:hover{color:#f4f4f5;background:#ffffff09}
        .lp-navbtn{background:#1a7a4a;color:#fff;font-size:14px;font-weight:600;padding:8px 18px;border-radius:8px;text-decoration:none;margin-left:4px;border:1px solid rgba(34,197,94,.3);transition:background .15s,transform .12s,box-shadow .15s;box-shadow:0 0 18px rgba(26,122,74,.28)}
        .lp-navbtn:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 28px rgba(26,122,74,.45)}

        /* ── Hero ── */
        .lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:130px 24px 90px;position:relative;overflow:hidden}
        .lp-grid-bg{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(26,122,74,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(26,122,74,.07) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);animation:lpGridDrift 28s linear infinite}
        .lp-scan{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(26,122,74,.035) 50%,transparent 100%);animation:lpScan 9s ease-in-out infinite}
        .lp-orb{position:absolute;top:6%;left:50%;transform:translateX(-50%);width:720px;height:720px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(26,122,74,.20) 0%,rgba(26,122,74,.07) 45%,transparent 70%);filter:blur(3px)}
        .lp-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(26,122,74,.12);border:1px solid rgba(26,122,74,.26);color:#86efac;font-size:12.5px;font-weight:600;padding:6px 15px;border-radius:99px;margin-bottom:30px;position:relative}
        .lp-pulse{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;animation:lpPulse 2.2s ease infinite}
        .lp-h1{font-size:clamp(44px,7.5vw,88px);font-weight:900;line-height:1.08;letter-spacing:-2.5px;color:#fff;margin-bottom:0;position:relative}
        .lp-h1-line2{display:block;color:#22c55e;font-size:clamp(36px,6vw,72px);margin-top:4px;min-height:1.1em}
        .lp-cursor{display:inline-block;color:#22c55e;font-weight:200;animation:lpBlink .85s step-end infinite;margin-left:2px}
        .lp-sub{font-size:clamp(15px,1.8vw,18px);color:#a1a1aa;max-width:520px;line-height:1.72;margin:24px auto 38px}
        .lp-ctas{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center}
        .lp-btn-primary{background:#1a7a4a;color:#fff;font-size:15px;font-weight:700;padding:14px 30px;border-radius:12px;text-decoration:none;border:1px solid rgba(34,197,94,.32);animation:lpCtaGlow 2.6s ease-in-out infinite;transition:background .2s,transform .2s}
        .lp-btn-primary:hover{background:#155f3a;transform:translateY(-2px)}
        .lp-btn-outline{color:#a1a1aa;font-size:15px;font-weight:500;padding:14px 24px;border-radius:12px;text-decoration:none;border:1px solid #262626;transition:all .22s}
        .lp-btn-outline:hover{border-color:#3f3f46;color:#e4e4e7;background:#ffffff07}
        .lp-stats{display:flex;align-items:center;gap:40px;margin-top:64px;position:relative}
        .lp-stat{text-align:center}
        .lp-stat-n{font-size:30px;font-weight:900;color:#fff;letter-spacing:-1px}
        .lp-stat-n em{color:#22c55e;font-style:normal}
        .lp-stat-l{font-size:12px;color:#71717a;margin-top:3px}
        .lp-stat-div{width:1px;height:36px;background:#1c1c1c}

        /* ── Section ── */
        .lp-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
        .lp-sec{padding:100px 24px}
        .lp-sec-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px}
        .lp-sec-title{font-size:clamp(28px,4vw,44px);font-weight:900;color:#fff;letter-spacing:-1.2px;line-height:1.18;margin-bottom:14px}
        .lp-sec-sub{font-size:16px;color:#a1a1aa;line-height:1.68;max-width:460px}

        /* ── Features ── */
        .lp-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#181818;border-radius:20px;overflow:hidden;border:1px solid #181818;margin-top:52px}
        .lp-feat{background:#0d0d0d;padding:28px 28px 32px;position:relative;overflow:hidden;transition:background .28s}
        .lp-feat::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 0% 0%,rgba(26,122,74,.13) 0%,transparent 65%);opacity:0;transition:opacity .32s}
        .lp-feat:hover{background:#101010}
        .lp-feat:hover::after{opacity:1}
        .lp-feat:hover .lp-feat-top{opacity:1}
        .lp-feat-top{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#1a7a4a,transparent);opacity:0;transition:opacity .32s}
        .lp-feat-icon{width:42px;height:42px;border-radius:11px;margin-bottom:18px;background:rgba(26,122,74,.09);border:1px solid rgba(26,122,74,.18);display:flex;align-items:center;justify-content:center;position:relative;z-index:1}
        .lp-feat-title{font-size:14.5px;font-weight:700;color:#e4e4e7;margin-bottom:8px;position:relative;z-index:1}
        .lp-feat-desc{font-size:13px;color:#a1a1aa;line-height:1.68;position:relative;z-index:1}

        /* ── Chat preview ── */
        .lp-chat-bg{background:#070707;border-top:1px solid #141414;border-bottom:1px solid #141414}
        .lp-chat-layout{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;max-width:1100px;margin:0 auto;padding:100px 24px}
        .lp-steps{margin-top:40px;display:flex;flex-direction:column;gap:0}
        .lp-step{display:flex;gap:20px;padding:22px 0;border-bottom:1px solid #111}
        .lp-step:last-child{border:none}
        .lp-step-n{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:rgba(26,122,74,.09);border:1px solid rgba(26,122,74,.22);color:#22c55e;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .lp-step-t{font-size:15px;font-weight:700;color:#e4e4e7;margin-bottom:5px}
        .lp-step-d{font-size:13.5px;color:#a1a1aa;line-height:1.63}

        /* Chat window */
        .lp-win{background:#0d0d0d;border:1px solid #1c1c1c;border-radius:18px;overflow:hidden;box-shadow:0 32px 90px rgba(0,0,0,.7),0 0 0 1px #1a1a1a}
        .lp-win-bar{background:#111;border-bottom:1px solid #1c1c1c;padding:12px 16px;display:flex;align-items:center;gap:10px}
        .lp-dots{display:flex;gap:6px}
        .lp-dot{width:10px;height:10px;border-radius:50%}
        .lp-win-title{flex:1;text-align:center;font-size:12px;color:#71717a;font-weight:500}
        .lp-tag{background:rgba(26,122,74,.12);border:1px solid rgba(26,122,74,.22);color:#22c55e;font-size:10.5px;font-weight:600;padding:3px 10px;border-radius:99px}
        .lp-msgs-scroll{padding:16px 14px;display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto;scrollbar-width:none}
        .lp-msgs-scroll::-webkit-scrollbar{width:0}
        .lp-msg{display:flex;gap:9px;align-items:flex-end}
        .lp-msg.user{flex-direction:row-reverse}
        .lp-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;background:#1a7a4a;color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .lp-av.user{background:#1c1c1c;color:#71717a}
        .lp-bubble{max-width:82%;padding:9px 13px;border-radius:16px;font-size:12.5px;line-height:1.6}
        .lp-bubble.assistant{background:#161616;border:1px solid #222;color:#c4c4c4;border-bottom-left-radius:4px}
        .lp-bubble.user{background:#1a7a4a;color:#fff;border-bottom-right-radius:4px}
        .lp-bubble.assistant strong{color:#e4e4e7;font-weight:600}
        .lp-bubble.assistant code{background:rgba(26,122,74,.1);border:1px solid rgba(26,122,74,.15);color:#86efac;padding:1px 5px;border-radius:4px;font-size:11.5px;font-family:monospace}
        .lp-bubble.assistant li{list-style:disc;margin-bottom:2px}
        .lp-bubble.assistant code,.lp-bubble.assistant li code{display:inline}
        .lp-typing-bubble{display:flex;align-items:center;gap:4px;padding:11px 14px}
        .lp-tdot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#52525b;animation:lpTypDot 1.1s ease-in-out infinite both}

        /* ── Testimonials ── */
        .lp-testi-bg{background:#060606;border-top:1px solid #111;border-bottom:1px solid #111}
        .lp-testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:48px}
        .lp-tcard{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:18px;padding:24px;display:flex;flex-direction:column;transition:border-color .24s,transform .24s}
        .lp-tcard:hover{border-color:rgba(26,122,74,.28);transform:translateY(-3px)}
        .lp-stars{display:flex;gap:3px;margin-bottom:14px}
        .lp-tquote{font-size:13.5px;color:#a1a1aa;line-height:1.72;font-style:italic;flex:1;margin-bottom:20px}
        .lp-tauthor{display:flex;align-items:center;gap:10px}
        .lp-tav{width:34px;height:34px;border-radius:50%;flex-shrink:0;background:rgba(26,122,74,.11);border:1px solid rgba(26,122,74,.2);color:#22c55e;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .lp-tname{font-size:13px;font-weight:700;color:#e4e4e7}
        .lp-tcourse{font-size:11px;color:#71717a;margin-top:1px}

        /* ── Pricing ── */
        .lp-pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:56px}
        .lp-pcard{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:20px;padding:28px 24px;display:flex;flex-direction:column;position:relative;transition:border-color .22s}
        .lp-pcard:hover:not(.lp-pcard-feat){border-color:#2a2a2a}
        .lp-pcard-feat{background:#091109;border-color:rgba(26,122,74,.44);box-shadow:0 0 56px rgba(26,122,74,.09),inset 0 1px 0 rgba(34,197,94,.08)}
        .lp-ptag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#1a7a4a;color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:99px;white-space:nowrap;border:1px solid rgba(34,197,94,.34)}
        .lp-pname{font-size:12.5px;font-weight:600;color:#71717a;margin-bottom:8px}
        .lp-pval{font-size:38px;font-weight:900;color:#fff;letter-spacing:-2px;margin-bottom:4px;line-height:1}
        .lp-pval span{font-size:15px;font-weight:500;color:#52525b;letter-spacing:0}
        .lp-pdesc{font-size:12.5px;color:#71717a;margin-bottom:24px;line-height:1.55}
        .lp-pfeats{flex:1;display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
        .lp-pfeat{display:flex;align-items:center;gap:8px;font-size:13px}
        .lp-pfeat-on{color:#a1a1aa}
        .lp-pfeat-off{color:#2a2a2a}
        .lp-pbtn{display:block;width:100%;padding:11px;border-radius:10px;font-size:14px;font-weight:600;text-align:center;text-decoration:none;transition:all .16s}
        .lp-pbtn-solid{background:#1a7a4a;color:#fff;border:1px solid rgba(34,197,94,.28)}
        .lp-pbtn-solid:hover{background:#155f3a}
        .lp-pbtn-ghost{background:transparent;color:#52525b;border:1px solid #1c1c1c}
        .lp-pbtn-ghost:hover{border-color:#2a2a2a;color:#a1a1aa}

        /* ── Final CTA ── */
        .lp-fcta{padding:120px 24px;text-align:center;background:radial-gradient(ellipse 60% 55% at 50% 0%,rgba(26,122,74,.12) 0%,transparent 70%);border-top:1px solid #141414}
        .lp-fcta-t{font-size:clamp(32px,5.5vw,62px);font-weight:900;color:#fff;letter-spacing:-2px;line-height:1.1;margin-bottom:16px}
        .lp-fcta-s{font-size:17px;color:#a1a1aa;margin-bottom:36px}

        /* ── Footer ── */
        .lp-footer{padding:28px 44px;border-top:1px solid #111;display:flex;align-items:center;justify-content:space-between;background:#0a0a0a}
        .lp-footer-copy{font-size:12.5px;color:#3f3f46}
        .lp-footer-links{display:flex;gap:20px}
        .lp-footer-a{font-size:12.5px;color:#3f3f46;text-decoration:none;transition:color .15s}
        .lp-footer-a:hover{color:#71717a}

        /* ── Keyframes ── */
        @keyframes lpBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes lpPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}60%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
        @keyframes lpCtaGlow{0%,100%{box-shadow:0 0 22px rgba(26,122,74,.35),0 0 50px rgba(26,122,74,.08)}50%{box-shadow:0 0 40px rgba(26,122,74,.60),0 0 80px rgba(26,122,74,.18)}}
        @keyframes lpGridDrift{from{background-position:0px 0px,0px 0px}to{background-position:56px 56px,56px 56px}}
        @keyframes lpScan{0%,100%{transform:translateY(-120%);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(120%);opacity:0}}
        @keyframes lpMsgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes lpTypDot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
      `}</style>

      <div className="lp">

        {/* ─── Navbar ──────────────────────────────────────────── */}
        <nav className={`lp-nav ${scrolled ? 'solid' : ''}`}>
          <span className="lp-logo">Point.AI</span>
          <div className="lp-nav-links">
            <a href="#features"  className="lp-navlink">Funcionalidades</a>
            <a href="#precos"    className="lp-navlink">Preços</a>
            <Link href="/onboarding" className="lp-navlink">Entrar</Link>
            <Link href="/onboarding" className="lp-navbtn">Começar grátis</Link>
          </div>
        </nav>

        {/* ─── Hero ────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-grid-bg" aria-hidden />
          <div className="lp-scan"     aria-hidden />
          <div className="lp-orb"      aria-hidden />

          <div className="lp-badge">
            <span className="lp-pulse" />
            Construído para performance acadêmica real
          </div>

          <h1 className="lp-h1">
            Estude mais inteligente.
            <span className="lp-h1-line2">
              <TypingEffect phrases={TYPED_PHRASES} />
            </span>
          </h1>

          <p className="lp-sub">
            O Point.AI processa sua ementa, memoriza suas dificuldades e entrega explicações calibradas ao seu nível — contextualmente precisas, não respostas genéricas de chatbot.
          </p>

          <div className="lp-ctas">
            <Link href="/onboarding" className="lp-btn-primary">
              Começar agora — é grátis &rarr;
            </Link>
            <a href="#preview" className="lp-btn-outline">
              Ver funcionamento
            </a>
          </div>

          <div className="lp-stats">
            {[
              { n: '100', s: '%', l: 'Personalizado' },
              { n: '24',  s: 'h', l: 'Disponível' },
              { n: '5',   s: '+', l: 'Ferramentas' },
              { n: 'R$',  s: '0', l: 'Para começar' },
            ].map((st, i) => (
              <div key={i} style={{ display:'contents' }}>
                {i > 0 && <div className="lp-stat-div" />}
                <div className="lp-stat">
                  <p className="lp-stat-n">{st.n}<em>{st.s}</em></p>
                  <p className="lp-stat-l">{st.l}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features ────────────────────────────────────────── */}
        <section className="lp-sec" id="features">
          <div className="lp-wrap">
            <div className="lp-reveal">
              <p className="lp-sec-label">Funcionalidades</p>
              <h2 className="lp-sec-title">Cada ferramenta resolve<br />um problema real.</h2>
              <p className="lp-sec-sub">Desenvolvidas para os gargalos que universitários brasileiros enfrentam semestre após semestre.</p>
            </div>

            <div className="lp-feat-grid lp-reveal lp-d2">
              {FEATURES.map((f, i) => (
                <div key={i} className="lp-feat">
                  <div className="lp-feat-top" />
                  <div className="lp-feat-icon"><f.Icon /></div>
                  <p className="lp-feat-title">{f.title}</p>
                  <p className="lp-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Chat Preview ─────────────────────────────────────── */}
        <div className="lp-chat-bg" id="preview">
          <div className="lp-chat-layout">

            <div className="lp-reveal">
              <p className="lp-sec-label">Preview real</p>
              <h2 className="lp-sec-title">Não respostas genéricas.<br />Raciocínio contextual.</h2>
              <p className="lp-sec-sub">O Point.AI não recita definições. Ele raciocina com base no seu curso, na sua ementa e no seu histórico de dificuldades.</p>

              <div className="lp-steps">
                {[
                  { n:'1', t:'Descreva sua dúvida em linguagem natural', d:'Sem formatação especial. Fale como fala com um colega — o Point.AI interpreta o contexto acadêmico automaticamente.' },
                  { n:'2', t:'Receba explicações calibradas ao seu nível', d:'A IA usa exemplos do seu campo de formação, referências da sua ementa e analogias que fazem sentido para você.' },
                  { n:'3', t:'Pratique com exercícios do perfil da prova', d:'Com base nos padrões da sua banca, o Point.AI propõe exercícios com dificuldade progressiva e feedback imediato.' },
                ].map((s, i) => (
                  <div key={i} className="lp-step">
                    <div className="lp-step-n">{s.n}</div>
                    <div>
                      <p className="lp-step-t">{s.t}</p>
                      <p className="lp-step-d">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-reveal lp-d2">
              <AnimatedChat />
            </div>
          </div>
        </div>

        {/* ─── Testimonials ─────────────────────────────────────── */}
        <div className="lp-testi-bg lp-sec">
          <div className="lp-wrap">
            <div className="lp-reveal" style={{ textAlign:'center' }}>
              <p className="lp-sec-label">Resultados reais</p>
              <h2 className="lp-sec-title" style={{ textAlign:'center' }}>Aprovação não é sorte.<br />É método.</h2>
            </div>
            <div className="lp-testi-grid">
              {[
                {
                  text: 'Passei de 4,8 para 8,2 em Cálculo II em um mês. As explicações com contexto de Engenharia fizeram uma diferença que monitoria nenhuma conseguiu.',
                  author: 'Lucas M.', course: 'Engenharia Elétrica · USP', init: 'LM',
                },
                {
                  text: 'Carreguei minha ementa de Anatomia e em segundos tinha um plano de estudos por tópico, na ordem exata da professora. Nunca mais estudei fora de sequência.',
                  author: 'Mariana S.', course: 'Medicina · UNIFESP', init: 'MS',
                },
                {
                  text: 'Estava com 23 faltas numa disciplina de 32 aulas. O alerta automático me salvou antes de cruzar o limite de reprovação. Não sabia que estava nessa situação.',
                  author: 'Rafael T.', course: 'Direito · PUC-SP', init: 'RT',
                },
              ].map((t, i) => (
                <div key={i} className={`lp-tcard lp-reveal lp-d${i+1}`}>
                  <div className="lp-stars">
                    {[...Array(5)].map((_, j) => <Ic.Star key={j} />)}
                  </div>
                  <p className="lp-tquote">&ldquo;{t.text}&rdquo;</p>
                  <div className="lp-tauthor">
                    <div className="lp-tav">{t.init}</div>
                    <div>
                      <p className="lp-tname">{t.author}</p>
                      <p className="lp-tcourse">{t.course}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Pricing ──────────────────────────────────────────── */}
        <section className="lp-sec" id="precos">
          <div className="lp-wrap">
            <div className="lp-reveal" style={{ textAlign:'center', maxWidth:520, margin:'0 auto' }}>
              <p className="lp-sec-label">Preços</p>
              <h2 className="lp-sec-title">Acesso completo,<br />sem surpresas.</h2>
              <p className="lp-sec-sub" style={{ margin:'0 auto' }}>Experimente sem comprometimento. Assine quando tiver certeza.</p>
            </div>

            <div className="lp-pricing-grid">
              <div className="lp-pcard lp-reveal lp-d1">
                <p className="lp-pname">Experimental</p>
                <p className="lp-pval">R$0</p>
                <p className="lp-pdesc">Acesso total por 7 dias. Sem cartão, sem cobrança automática.</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">7 dias de acesso completo</span></div>
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Todas as funcionalidades</span></div>
                  <div className="lp-pfeat"><Ic.X /><span className="lp-pfeat-off">Acesso contínuo</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-ghost">Começar grátis</Link>
              </div>

              <div className="lp-pcard lp-pcard-feat lp-reveal lp-d2">
                <div className="lp-ptag">Mais escolhido</div>
                <p className="lp-pname" style={{ color:'#22c55e' }}>Mensal</p>
                <p className="lp-pval">R$14,90<span>/mês</span></p>
                <p className="lp-pdesc">Acesso ilimitado. Cancele a qualquer momento, sem burocracia.</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Chat ilimitado por matéria</span></div>
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Todas as funcionalidades</span></div>
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Sem limite de disciplinas</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-solid">Assinar agora</Link>
              </div>

              <div className="lp-pcard lp-reveal lp-d3">
                <p className="lp-pname">Semestral</p>
                <p className="lp-pval">R$59,90<span>/sem</span></p>
                <p className="lp-pdesc">O equivalente a R$10/mês. Um semestre inteiro de tutoria personalizada.</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Tudo do plano mensal</span></div>
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Economia de 33%</span></div>
                  <div className="lp-pfeat"><Ic.Check /><span className="lp-pfeat-on">Cobertura de um semestre</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-ghost">Assinar semestral</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ────────────────────────────────────────── */}
        <div className="lp-fcta">
          <h2 className="lp-fcta-t lp-reveal">
            Performance acadêmica<br />não é talento. É método.
          </h2>
          <p className="lp-fcta-s lp-reveal lp-d1">
            Os primeiros 7 dias são completamente gratuitos. Sem cartão de crédito.
          </p>
          <div className="lp-reveal lp-d2">
            <Link href="/onboarding" className="lp-btn-primary">
              Criar minha conta agora &rarr;
            </Link>
          </div>
        </div>

        {/* ─── Footer ───────────────────────────────────────────── */}
        <footer className="lp-footer">
          <span className="lp-logo">Point.AI</span>
          <p className="lp-footer-copy">&copy; 2026 Point.AI &mdash; Construído para universitários brasileiros</p>
          <div className="lp-footer-links">
            <a href="#" className="lp-footer-a">Privacidade</a>
            <a href="#" className="lp-footer-a">Termos</a>
          </div>
        </footer>

      </div>
    </>
  )
}
