'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Typing effect ─────────────────────────────────────────────── */
function TypingEffect({ phrases, speed = 58, pause = 2400 }) {
  const [text, setText] = useState('')
  const phraseIdx = useRef(0)
  const charIdx   = useRef(0)
  const deleting  = useRef(false)
  const timer     = useRef(null)

  useEffect(() => {
    function tick() {
      const phrase = phrases[phraseIdx.current]
      const ci     = charIdx.current
      const del    = deleting.current

      if (!del && ci === phrase.length) {
        timer.current = setTimeout(() => { deleting.current = true; tick() }, pause)
        return
      }
      if (del && ci === 0) {
        deleting.current  = false
        phraseIdx.current = (phraseIdx.current + 1) % phrases.length
        timer.current = setTimeout(tick, 320)
        return
      }
      const next = del ? ci - 1 : ci + 1
      charIdx.current = next
      setText(phrases[phraseIdx.current].slice(0, next))
      timer.current = setTimeout(tick, del ? speed * 0.45 : speed)
    }
    timer.current = setTimeout(tick, 600)
    return () => clearTimeout(timer.current)
  }, [phrases, speed, pause])

  return (
    <span>
      {text}
      <span className="lp-cursor">|</span>
    </span>
  )
}

/* ─── Data ──────────────────────────────────────────────────────── */
const TYPED_PHRASES = [
  'Evolua todo dia.',
  'Tire melhores notas.',
  'Seja aprovado em tudo.',
  'Domine suas matérias.',
]

const FEATURES = [
  { icon: '💬', title: 'Chat por matéria',        desc: 'Cada matéria tem seu próprio contexto. A IA lembra tudo que você perguntou e fica cada vez mais alinhada com seu jeito de aprender.' },
  { icon: '📊', title: 'Notas e faltas',           desc: 'Calcule sua média, veja quantas faltas ainda pode ter e descubra o que precisa tirar na próxima prova — tudo automático.' },
  { icon: '📅', title: 'Calendário acadêmico',     desc: 'Cadastre provas e prazos. Receba alertas inteligentes e sugestões de revisão no momento certo.' },
  { icon: '📝', title: 'Correção de trabalhos',    desc: 'Cole seu texto e receba feedback detalhado: nota estimada, pontos fortes, o que melhorar e sugestões específicas.' },
  { icon: '📈', title: 'Minha evolução',           desc: 'Visão geral do seu desempenho em todas as matérias. Alertas de risco e progresso consolidado.' },
  { icon: '🎯', title: '100% personalizado',       desc: 'O Point.AI aprende seu curso, sua universidade e seus objetivos para te ajudar como nenhum tutor genérico consegue.' },
]

const CHAT_DEMO = [
  {
    role: 'user',
    lines: ['Não estou entendendo derivadas. Pode me explicar do zero?'],
  },
  {
    role: 'assistant',
    lines: [
      ['bold', 'Derivada = taxa de variação 🎯'],
      '',
      'Pensa assim: se você está num carro e quer saber ',
      ['italic', 'quão rápido'],
      ' sua posição muda — isso é a derivada da posição.',
      '',
      ['bold', 'Regra básica:'],
      '',
      'Se f(x) = xⁿ, então f\'(x) = n · xⁿ⁻¹',
      '',
      ['bold', 'Exemplo (Engenharia):'],
      '',
      's(t) = 3t²  →  s\'(t) = 6t',
      '',
      'Em t = 2s → velocidade = 12 m/s ✅',
      '',
      'Quer tentar um exercício agora?',
    ],
  },
  {
    role: 'user',
    lines: ['Sim! Me dá um parecido com o da prova.'],
  },
  {
    role: 'assistant',
    lines: [
      'Baseado na sua ementa de Cálculo I: 📋',
      '',
      ['bold', 'Calcule:'],
      ' f(x) = 4x³ − 2x + 7',
      '',
      'Dica: aplica a regra xⁿ → nxⁿ⁻¹ em cada termo. 💪',
    ],
  },
]

const TESTIMONIALS = [
  { text: 'Estava reprovando em Cálculo. O Point.AI me ajudou a entender derivadas do zero em uma semana.', author: 'Lucas M.', course: 'Engenharia Elétrica · USP', init: 'LM' },
  { text: 'Enviei a foto da minha ementa e ele montou o plano exato com os tópicos da minha professora.', author: 'Mariana S.', course: 'Medicina · UNIFESP', init: 'MS' },
  { text: 'O controle de faltas me salvou. Eu não sabia que estava quase reprovando por falta em duas matérias.', author: 'Rafael T.', course: 'Direito · PUC', init: 'RT' },
]

/* Renders mixed text/bold/italic tuples */
function BubbleLine({ parts }) {
  if (typeof parts === 'string') {
    if (parts === '') return <br />
    return <>{parts}</>
  }
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>
        if (p[0] === 'bold')   return <strong key={i}>{p[1]}</strong>
        if (p[0] === 'italic') return <em key={i}>{p[1]}</em>
        return null
      })}
    </>
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lp-in'); io.unobserve(e.target) }
      }),
      { threshold: 0.10, rootMargin: '0px 0px -30px 0px' }
    )
    setTimeout(() => {
      document.querySelectorAll('.lp-reveal').forEach(el => io.observe(el))
    }, 80)

    return () => { window.removeEventListener('scroll', onScroll); io.disconnect() }
  }, [])

  return (
    <>
      {/* ─ Styles ─────────────────────────────────────────────────── */}
      <style>{`
        .lp { background:#0a0a0a; color:#fff; font-family:var(--font-geist-sans,system-ui,sans-serif); -webkit-font-smoothing:antialiased; }

        /* ── Reveal ── */
        .lp-reveal { opacity:0; transform:translateY(22px); transition:opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1); }
        .lp-reveal.lp-in { opacity:1; transform:translateY(0); }
        .lp-d1{transition-delay:.10s} .lp-d2{transition-delay:.20s} .lp-d3{transition-delay:.30s} .lp-d4{transition-delay:.40s}

        /* ── Nav ── */
        .lp-nav {
          position:fixed; top:0; left:0; right:0; z-index:200;
          height:62px; padding:0 44px;
          display:flex; align-items:center; justify-content:space-between;
          transition:background .35s ease, border-color .35s ease, backdrop-filter .35s ease;
          border-bottom:1px solid transparent;
        }
        .lp-nav.solid {
          background:rgba(10,10,10,.88);
          backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
          border-color:#1c1c1c;
        }
        .lp-logo { font-size:17px; font-weight:800; color:#22c55e; letter-spacing:-.3px; text-decoration:none; }
        .lp-nav-links { display:flex; align-items:center; gap:6px; }
        .lp-navlink {
          color:#71717a; font-size:14px; font-weight:500; text-decoration:none;
          padding:7px 13px; border-radius:8px;
          transition:color .15s, background .15s;
        }
        .lp-navlink:hover { color:#d4d4d8; background:#ffffff09; }
        .lp-navbtn {
          background:#1a7a4a; color:#fff; font-size:14px; font-weight:600;
          padding:8px 18px; border-radius:8px; text-decoration:none; margin-left:4px;
          border:1px solid rgba(34,197,94,.28);
          transition:background .15s, transform .12s, box-shadow .15s;
          box-shadow:0 0 16px rgba(26,122,74,.25);
        }
        .lp-navbtn:hover { background:#155f3a; transform:translateY(-1px); box-shadow:0 0 24px rgba(26,122,74,.4); }

        /* ── Hero ── */
        .lp-hero {
          min-height:100vh; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          text-align:center; padding:130px 24px 90px;
          position:relative; overflow:hidden;
        }
        .lp-grid-bg {
          position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(26,122,74,.07) 1px,transparent 1px),
            linear-gradient(90deg,rgba(26,122,74,.07) 1px,transparent 1px);
          background-size:56px 56px;
          mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);
          -webkit-mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);
        }
        .lp-orb {
          position:absolute; top:8%; left:50%; transform:translateX(-50%);
          width:680px; height:680px; border-radius:50%; pointer-events:none;
          background:radial-gradient(circle,rgba(26,122,74,.22) 0%,rgba(26,122,74,.08) 45%,transparent 70%);
          filter:blur(2px);
        }
        .lp-badge {
          display:inline-flex; align-items:center; gap:7px;
          background:rgba(26,122,74,.13); border:1px solid rgba(26,122,74,.28);
          color:#22c55e; font-size:12.5px; font-weight:600;
          padding:6px 15px; border-radius:99px; margin-bottom:30px; position:relative;
        }
        .lp-pulse {
          width:7px; height:7px; border-radius:50%; background:#22c55e; flex-shrink:0;
          animation:lpPulse 2s ease infinite;
        }
        .lp-h1 {
          font-size:clamp(44px,7.5vw,88px); font-weight:900; line-height:1.08;
          letter-spacing:-2.5px; color:#fff; margin-bottom:0; position:relative;
        }
        .lp-h1-line2 {
          display:block; color:#22c55e;
          font-size:clamp(36px,6vw,72px); margin-top:4px; min-height:1.1em;
        }
        .lp-cursor {
          display:inline-block; color:#22c55e; font-weight:200;
          animation:lpBlink .85s step-end infinite; margin-left:2px;
        }
        .lp-sub {
          font-size:clamp(15px,1.8vw,19px); color:#52525b; max-width:520px;
          line-height:1.7; margin:22px auto 38px;
        }
        .lp-ctas { display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:center; }
        .lp-btn-primary {
          background:#1a7a4a; color:#fff; font-size:15px; font-weight:700;
          padding:14px 30px; border-radius:12px; text-decoration:none;
          border:1px solid rgba(34,197,94,.3);
          box-shadow:0 0 30px rgba(26,122,74,.38);
          transition:all .2s;
        }
        .lp-btn-primary:hover { background:#155f3a; transform:translateY(-2px); box-shadow:0 0 44px rgba(26,122,74,.55); }
        .lp-btn-outline {
          color:#71717a; font-size:15px; font-weight:500;
          padding:14px 24px; border-radius:12px; text-decoration:none;
          border:1px solid #262626; transition:all .2s;
        }
        .lp-btn-outline:hover { border-color:#3f3f46; color:#d4d4d8; background:#ffffff07; }
        .lp-stats {
          display:flex; align-items:center; gap:40px; margin-top:64px; position:relative;
        }
        .lp-stat { text-align:center; }
        .lp-stat-n { font-size:30px; font-weight:900; color:#fff; letter-spacing:-1px; }
        .lp-stat-n em { color:#22c55e; font-style:normal; }
        .lp-stat-l { font-size:12px; color:#3f3f46; margin-top:3px; }
        .lp-stat-div { width:1px; height:36px; background:#1c1c1c; }

        /* ── Section wrapper ── */
        .lp-wrap { max-width:1100px; margin:0 auto; padding:0 24px; }
        .lp-sec { padding:100px 24px; }
        .lp-sec-label { font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#22c55e; margin-bottom:10px; }
        .lp-sec-title { font-size:clamp(28px,4vw,44px); font-weight:900; color:#fff; letter-spacing:-1.2px; line-height:1.18; margin-bottom:14px; }
        .lp-sec-sub { font-size:16px; color:#52525b; line-height:1.65; max-width:460px; }

        /* ── Features ── */
        .lp-feat-grid {
          display:grid; grid-template-columns:repeat(3,1fr);
          gap:1px; background:#181818; border-radius:20px; overflow:hidden;
          border:1px solid #181818; margin-top:52px;
        }
        .lp-feat {
          background:#0d0d0d; padding:28px 28px 32px;
          position:relative; overflow:hidden;
          transition:background .25s;
        }
        .lp-feat::after {
          content:''; position:absolute; inset:0;
          background:radial-gradient(circle at 0% 0%,rgba(26,122,74,.14) 0%,transparent 65%);
          opacity:0; transition:opacity .3s;
        }
        .lp-feat:hover { background:#101010; }
        .lp-feat:hover::after { opacity:1; }
        .lp-feat:hover .lp-feat-top { opacity:1; }
        .lp-feat-top {
          position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,#1a7a4a,transparent);
          opacity:0; transition:opacity .3s;
        }
        .lp-feat-icon {
          width:42px; height:42px; border-radius:11px; margin-bottom:18px;
          background:rgba(26,122,74,.10); border:1px solid rgba(26,122,74,.18);
          display:flex; align-items:center; justify-content:center;
          font-size:19px; position:relative; z-index:1;
        }
        .lp-feat-title { font-size:14.5px; font-weight:700; color:#e4e4e7; margin-bottom:8px; position:relative; z-index:1; }
        .lp-feat-desc  { font-size:13px; color:#52525b; line-height:1.65; position:relative; z-index:1; }

        /* ── Chat preview ── */
        .lp-chat-bg { background:#080808; border-top:1px solid #141414; border-bottom:1px solid #141414; }
        .lp-chat-layout {
          display:grid; grid-template-columns:1fr 1fr; gap:72px; align-items:center;
          max-width:1100px; margin:0 auto; padding:100px 24px;
        }
        .lp-steps { margin-top:40px; display:flex; flex-direction:column; gap:0; }
        .lp-step { display:flex; gap:20px; padding:22px 0; border-bottom:1px solid #111; }
        .lp-step:last-child { border:none; }
        .lp-step-n {
          width:38px; height:38px; border-radius:50%; flex-shrink:0;
          background:rgba(26,122,74,.10); border:1px solid rgba(26,122,74,.22);
          color:#22c55e; font-size:14px; font-weight:800;
          display:flex; align-items:center; justify-content:center;
        }
        .lp-step-t { font-size:15px; font-weight:700; color:#e4e4e7; margin-bottom:5px; }
        .lp-step-d { font-size:13.5px; color:#52525b; line-height:1.6; }

        /* Chat window */
        .lp-win {
          background:#101010; border:1px solid #1c1c1c; border-radius:18px;
          overflow:hidden; box-shadow:0 32px 90px rgba(0,0,0,.7), 0 0 0 1px #1a1a1a;
        }
        .lp-win-bar {
          background:#141414; border-bottom:1px solid #1c1c1c;
          padding:12px 16px; display:flex; align-items:center; gap:10px;
        }
        .lp-dots { display:flex; gap:6px; }
        .lp-dot { width:10px; height:10px; border-radius:50%; }
        .lp-win-title { flex:1; text-align:center; font-size:12px; color:#3f3f46; font-weight:500; }
        .lp-tag {
          background:rgba(26,122,74,.12); border:1px solid rgba(26,122,74,.22);
          color:#22c55e; font-size:10.5px; font-weight:600;
          padding:3px 10px; border-radius:99px;
        }
        .lp-msgs { padding:18px 14px; display:flex; flex-direction:column; gap:12px; }
        .lp-msg { display:flex; gap:9px; align-items:flex-end; }
        .lp-msg.user { flex-direction:row-reverse; }
        .lp-av {
          width:24px; height:24px; border-radius:50%; flex-shrink:0;
          background:#1a7a4a; color:#fff; font-size:9.5px; font-weight:700;
          display:flex; align-items:center; justify-content:center;
        }
        .lp-av.user { background:#1c1c1c; color:#52525b; }
        .lp-bubble {
          max-width:80%; padding:9px 13px; border-radius:16px;
          font-size:12.5px; line-height:1.6;
        }
        .lp-bubble.assistant {
          background:#161616; border:1px solid #1e1e1e; color:#a1a1aa;
          border-bottom-left-radius:4px;
        }
        .lp-bubble.user {
          background:#1a7a4a; color:#fff; border-bottom-right-radius:4px;
        }
        .lp-bubble.assistant strong { color:#d4d4d8; font-weight:600; }
        .lp-bubble.assistant em { color:#71717a; font-style:italic; }

        /* ── Testimonials ── */
        .lp-testi-bg { background:#060606; border-top:1px solid #111; border-bottom:1px solid #111; }
        .lp-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:48px; }
        .lp-tcard {
          background:#0d0d0d; border:1px solid #1a1a1a; border-radius:18px; padding:24px;
          display:flex; flex-direction:column; gap:0;
          transition:border-color .22s, transform .22s;
        }
        .lp-tcard:hover { border-color:rgba(26,122,74,.3); transform:translateY(-3px); }
        .lp-stars { color:#22c55e; font-size:12px; margin-bottom:14px; letter-spacing:1px; }
        .lp-tquote { font-size:13.5px; color:#71717a; line-height:1.7; font-style:italic; flex:1; margin-bottom:20px; }
        .lp-tauthor { display:flex; align-items:center; gap:10px; }
        .lp-tav {
          width:34px; height:34px; border-radius:50%; flex-shrink:0;
          background:rgba(26,122,74,.12); border:1px solid rgba(26,122,74,.2);
          color:#22c55e; font-size:10px; font-weight:700;
          display:flex; align-items:center; justify-content:center;
        }
        .lp-tname { font-size:13px; font-weight:700; color:#e4e4e7; }
        .lp-tcourse { font-size:11px; color:#3f3f46; }

        /* ── Pricing ── */
        .lp-pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:56px; }
        .lp-pcard {
          background:#0d0d0d; border:1px solid #1a1a1a; border-radius:20px; padding:28px 24px;
          display:flex; flex-direction:column; position:relative;
          transition:border-color .2s;
        }
        .lp-pcard:hover:not(.lp-pcard-feat) { border-color:#2a2a2a; }
        .lp-pcard-feat {
          background:#0a140e; border-color:rgba(26,122,74,.45);
          box-shadow:0 0 50px rgba(26,122,74,.10), inset 0 1px 0 rgba(34,197,94,.08);
        }
        .lp-ptag {
          position:absolute; top:-13px; left:50%; transform:translateX(-50%);
          background:#1a7a4a; color:#fff; font-size:11px; font-weight:700;
          padding:4px 14px; border-radius:99px; white-space:nowrap;
          border:1px solid rgba(34,197,94,.35);
        }
        .lp-pname { font-size:12.5px; font-weight:600; color:#52525b; margin-bottom:8px; }
        .lp-pval {
          font-size:38px; font-weight:900; color:#fff; letter-spacing:-2px; margin-bottom:4px; line-height:1;
        }
        .lp-pval span { font-size:15px; font-weight:500; color:#3f3f46; letter-spacing:0; }
        .lp-pdesc { font-size:12.5px; color:#3f3f46; margin-bottom:24px; line-height:1.5; }
        .lp-pfeats { flex:1; display:flex; flex-direction:column; gap:10px; margin-bottom:24px; }
        .lp-pfeat { display:flex; align-items:center; gap:8px; font-size:13px; }
        .lp-pcheck { color:#22c55e; font-size:13px; flex-shrink:0; }
        .lp-pcross { color:#2a2a2a; font-size:13px; flex-shrink:0; }
        .lp-pfeat-label { color:#71717a; }
        .lp-pfeat-off   { color:#2a2a2a; }
        .lp-pbtn {
          display:block; width:100%; padding:11px; border-radius:10px;
          font-size:14px; font-weight:600; text-align:center; text-decoration:none;
          transition:all .15s;
        }
        .lp-pbtn-solid { background:#1a7a4a; color:#fff; border:1px solid rgba(34,197,94,.28); }
        .lp-pbtn-solid:hover { background:#155f3a; }
        .lp-pbtn-ghost { background:transparent; color:#3f3f46; border:1px solid #1c1c1c; }
        .lp-pbtn-ghost:hover { border-color:#2a2a2a; color:#71717a; }

        /* ── Final CTA ── */
        .lp-fcta {
          padding:120px 24px; text-align:center;
          background:radial-gradient(ellipse 60% 55% at 50% 0%,rgba(26,122,74,.13) 0%,transparent 70%);
          border-top:1px solid #141414;
        }
        .lp-fcta-t {
          font-size:clamp(32px,5.5vw,62px); font-weight:900; color:#fff;
          letter-spacing:-2px; line-height:1.1; margin-bottom:16px;
        }
        .lp-fcta-s { font-size:17px; color:#52525b; margin-bottom:36px; }

        /* ── Footer ── */
        .lp-footer {
          padding:28px 44px; border-top:1px solid #111;
          display:flex; align-items:center; justify-content:space-between;
          background:#0a0a0a;
        }
        .lp-footer-copy { font-size:12.5px; color:#27272a; }
        .lp-footer-links { display:flex; gap:20px; }
        .lp-footer-a { font-size:12.5px; color:#27272a; text-decoration:none; transition:color .15s; }
        .lp-footer-a:hover { color:#52525b; }

        /* ── Keyframes ── */
        @keyframes lpBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes lpPulse {
          0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.5)}
          60%{opacity:.7;box-shadow:0 0 0 6px rgba(34,197,94,0)}
        }
      `}</style>

      <div className="lp">

        {/* ─── Navbar ─────────────────────────────────────────── */}
        <nav className={`lp-nav ${scrolled ? 'solid' : ''}`}>
          <span className="lp-logo">Point.AI</span>
          <div className="lp-nav-links">
            <a href="#features"  className="lp-navlink">Funcionalidades</a>
            <a href="#precos"    className="lp-navlink">Preços</a>
            <Link href="/onboarding" className="lp-navlink">Entrar</Link>
            <Link href="/onboarding" className="lp-navbtn">Começar grátis</Link>
          </div>
        </nav>

        {/* ─── Hero ───────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-grid-bg" aria-hidden />
          <div className="lp-orb"     aria-hidden />

          <div className="lp-badge">
            <span className="lp-pulse" />
            O assistente acadêmico que faltava no Brasil
          </div>

          <h1 className="lp-h1">
            Estude mais inteligente.
            <span className="lp-h1-line2">
              <TypingEffect phrases={TYPED_PHRASES} />
            </span>
          </h1>

          <p className="lp-sub">
            O Point.AI aprende com você, lembra suas matérias e te ajuda como um tutor pessoal disponível 24h — especializado no seu curso universitário.
          </p>

          <div className="lp-ctas">
            <Link href="/onboarding" className="lp-btn-primary">
              Começar agora — é grátis →
            </Link>
            <a href="#preview" className="lp-btn-outline">
              Ver como funciona
            </a>
          </div>

          <div className="lp-stats">
            <div className="lp-stat">
              <p className="lp-stat-n">100<em>%</em></p>
              <p className="lp-stat-l">Personalizado</p>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <p className="lp-stat-n">24<em>h</em></p>
              <p className="lp-stat-l">Disponível</p>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <p className="lp-stat-n">5<em>+</em></p>
              <p className="lp-stat-l">Ferramentas</p>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <p className="lp-stat-n">R$<em>0</em></p>
              <p className="lp-stat-l">Para começar</p>
            </div>
          </div>
        </section>

        {/* ─── Features ───────────────────────────────────────── */}
        <section className="lp-sec" id="features">
          <div className="lp-wrap">
            <div className="lp-reveal">
              <p className="lp-sec-label">Funcionalidades</p>
              <h2 className="lp-sec-title">Tudo que você precisa,<br />em um lugar só.</h2>
              <p className="lp-sec-sub">Feito especialmente para universitários brasileiros que querem ir além do básico.</p>
            </div>

            <div className="lp-feat-grid lp-reveal lp-d2">
              {FEATURES.map((f, i) => (
                <div key={i} className="lp-feat">
                  <div className="lp-feat-top" />
                  <div className="lp-feat-icon">{f.icon}</div>
                  <p className="lp-feat-title">{f.title}</p>
                  <p className="lp-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Chat Preview ───────────────────────────────────── */}
        <div className="lp-chat-bg" id="preview">
          <div className="lp-chat-layout">

            {/* Left: description */}
            <div className="lp-reveal">
              <p className="lp-sec-label">Preview real</p>
              <h2 className="lp-sec-title">Veja o Point.AI em ação</h2>
              <p className="lp-sec-sub">Um tutor que entende o seu contexto, adapta as explicações ao seu curso e te desafia na medida certa.</p>

              <div className="lp-steps">
                {[
                  { n:'1', t:'Faça sua pergunta',                d:'Pergunte sobre qualquer conteúdo da sua matéria, do jeito que você fala.' },
                  { n:'2', t:'Receba uma explicação personalizada', d:'A IA usa exemplos do seu curso e adapta ao seu nível de conhecimento.' },
                  { n:'3', t:'Pratique com exercícios',          d:'O Point.AI propõe exercícios alinhados com a sua ementa real.' },
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

            {/* Right: chat window */}
            <div className="lp-reveal lp-d2">
              <div className="lp-win">
                <div className="lp-win-bar">
                  <div className="lp-dots">
                    <div className="lp-dot" style={{ background:'#ff5f57' }} />
                    <div className="lp-dot" style={{ background:'#febc2e' }} />
                    <div className="lp-dot" style={{ background:'#28c840' }} />
                  </div>
                  <span className="lp-win-title">Point.AI</span>
                  <span className="lp-tag">Cálculo I</span>
                </div>

                <div className="lp-msgs">
                  {CHAT_DEMO.map((msg, i) => (
                    <div key={i} className={`lp-msg ${msg.role}`}>
                      <div className={`lp-av ${msg.role}`}>
                        {msg.role === 'assistant' ? 'P' : 'V'}
                      </div>
                      <div className={`lp-bubble ${msg.role}`}>
                        {msg.lines.map((line, j) => (
                          <BubbleLine key={j} parts={line} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── Testimonials ───────────────────────────────────── */}
        <div className="lp-testi-bg lp-sec">
          <div className="lp-wrap">
            <div className="lp-reveal" style={{ textAlign:'center' }}>
              <p className="lp-sec-label">Depoimentos</p>
              <h2 className="lp-sec-title" style={{ textAlign:'center' }}>O que estudantes dizem</h2>
            </div>
            <div className="lp-testi-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`lp-tcard lp-reveal lp-d${i+1}`}>
                  <div className="lp-stars">★★★★★</div>
                  <p className="lp-tquote">{t.text}</p>
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

        {/* ─── Pricing ────────────────────────────────────────── */}
        <section className="lp-sec" id="precos">
          <div className="lp-wrap">
            <div className="lp-reveal" style={{ textAlign:'center', maxWidth:520, margin:'0 auto' }}>
              <p className="lp-sec-label">Preços</p>
              <h2 className="lp-sec-title">Planos simples e justos</h2>
              <p className="lp-sec-sub" style={{ margin:'0 auto' }}>Comece grátis, assine quando quiser.</p>
            </div>

            <div className="lp-pricing-grid">
              {/* Free */}
              <div className="lp-pcard lp-reveal lp-d1">
                <p className="lp-pname">Grátis</p>
                <p className="lp-pval">R$0</p>
                <p className="lp-pdesc">7 dias completos, sem cartão de crédito</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">7 dias completos</span></div>
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Todas as funcionalidades</span></div>
                  <div className="lp-pfeat"><span className="lp-pcross">×</span><span className="lp-pfeat-off">Sem limite após 7 dias</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-ghost">Começar grátis</Link>
              </div>

              {/* Mensal */}
              <div className="lp-pcard lp-pcard-feat lp-reveal lp-d2">
                <div className="lp-ptag">Mais popular</div>
                <p className="lp-pname" style={{ color:'#22c55e' }}>Mensal</p>
                <p className="lp-pval">R$14,90<span>/mês</span></p>
                <p className="lp-pdesc">Renovação mensal, cancele quando quiser</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Chat ilimitado</span></div>
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Todas as funcionalidades</span></div>
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Sem limite de matérias</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-solid">Assinar agora</Link>
              </div>

              {/* Semestral */}
              <div className="lp-pcard lp-reveal lp-d3">
                <p className="lp-pname">Semestral</p>
                <p className="lp-pval">R$59,90<span>/sem</span></p>
                <p className="lp-pdesc">Economia de 33% — ideal para um semestre completo</p>
                <div className="lp-pfeats">
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Tudo do mensal</span></div>
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Economia de 33%</span></div>
                  <div className="lp-pfeat"><span className="lp-pcheck">✓</span><span className="lp-pfeat-label">Ideal para um semestre</span></div>
                </div>
                <Link href="/onboarding" className="lp-pbtn lp-pbtn-ghost">Assinar semestral</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ──────────────────────────────────────── */}
        <div className="lp-fcta">
          <h2 className="lp-fcta-t lp-reveal">
            Pronto para estudar<br />do jeito certo?
          </h2>
          <p className="lp-fcta-s lp-reveal lp-d1">
            Junte-se a universitários que já estudam com inteligência.
          </p>
          <div className="lp-reveal lp-d2">
            <Link href="/onboarding" className="lp-btn-primary">
              Criar minha conta grátis →
            </Link>
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <footer className="lp-footer">
          <span className="lp-logo">Point.AI</span>
          <p className="lp-footer-copy">© 2026 Point.AI — Feito para universitários brasileiros</p>
          <div className="lp-footer-links">
            <a href="#" className="lp-footer-a">Privacidade</a>
            <a href="#" className="lp-footer-a">Termos</a>
          </div>
        </footer>

      </div>
    </>
  )
}
