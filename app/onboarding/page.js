'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { savePerfil, getUserId } from '../lib/db'

const perguntas = [
  {
    id: 'nome',
    texto: 'Olá! Eu sou o Point, seu assistente acadêmico pessoal. Antes de começar, qual é o seu nome?',
    placeholder: 'Digite seu nome…',
  },
  {
    id: 'curso',
    texto: (r) => `Que ótimo te conhecer, ${r.nome}! Qual curso você faz?`,
    placeholder: 'Ex: Medicina, Engenharia, Direito…',
  },
  {
    id: 'universidade',
    texto: () => 'Incrível! E em qual universidade você estuda?',
    placeholder: 'Ex: USP, UNICAMP, UFMG…',
  },
  {
    id: 'semestre',
    texto: () => 'Legal! Você está em qual semestre?',
    placeholder: 'Ex: 3º semestre',
  },
  {
    id: 'materias',
    texto: () => 'Quais matérias você está tendo esse semestre? Separa por vírgula.',
    placeholder: 'Ex: Anatomia, Bioquímica, Fisiologia…',
  },
  {
    id: 'objetivo',
    texto: (r) => `Última pergunta, ${r.nome}. Qual é o seu principal objetivo agora?`,
    placeholder: 'Ex: Passar em todas, melhorar minha média, não reprovar em Cálculo…',
  },
]

export default function Onboarding() {
  const router  = useRouter()
  const [etapa, setEtapa]           = useState(0)
  const [respostas, setRespostas]   = useState({})
  const [historico, setHistorico]   = useState([])
  const [input, setInput]           = useState('')
  const [typing, setTyping]         = useState(false)
  const [saindo, setSaindo]         = useState(false)

  const inputRef = useRef(null)
  const fimRef   = useRef(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico, typing])

  useEffect(() => {
    if (!typing && !saindo) inputRef.current?.focus()
  }, [etapa, typing, saindo])

  const pergAtual = perguntas[etapa]
  const textoAtual = typeof pergAtual.texto === 'function'
    ? pergAtual.texto(respostas)
    : pergAtual.texto

  const nomeLetra = historico[0]?.resposta?.charAt(0).toUpperCase() || '?'
  const progresso  = Math.round(((etapa + (typing ? 0.5 : 0)) / perguntas.length) * 100)

  async function avancar() {
    if (!input.trim() || typing || saindo) return
    const resposta      = input.trim()
    const novasResp     = { ...respostas, [pergAtual.id]: resposta }
    setRespostas(novasResp)
    setInput('')

    const novoHistorico = [...historico, { pergunta: textoAtual, resposta }]
    setHistorico(novoHistorico)
    setTyping(true)

    if (etapa < perguntas.length - 1) {
      setTimeout(() => {
        setTyping(false)
        setEtapa(etapa + 1)
      }, 650)
    } else {
      getUserId()
      await savePerfil(novasResp)
      setTimeout(() => {
        setTyping(false)
        setSaindo(true)
        setTimeout(() => router.push('/dashboard'), 700)
      }, 900)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') avancar()
  }

  return (
    <>
      <style>{`
        /* ── Root ── */
        .ob{background:#0a0a0a;color:#f4f4f5;font-family:var(--font-geist-sans,system-ui,sans-serif);
          -webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column;
          position:relative;overflow:hidden;
          transition:opacity .6s ease}

        /* ── Grid bg (same as landing) ── */
        .ob-grid{position:fixed;inset:0;pointer-events:none;z-index:0;
          background-image:linear-gradient(rgba(26,122,74,.07) 1px,transparent 1px),
            linear-gradient(90deg,rgba(26,122,74,.07) 1px,transparent 1px);
          background-size:56px 56px;
          mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);
          -webkit-mask-image:radial-gradient(ellipse 85% 75% at 50% 50%,black 30%,transparent 100%);
          animation:obGridDrift 28s linear infinite}
        .ob-scan{position:fixed;inset:0;pointer-events:none;z-index:0;
          background:linear-gradient(180deg,transparent 0%,rgba(26,122,74,.03) 50%,transparent 100%);
          animation:obScan 10s ease-in-out infinite}
        .ob-orb{position:fixed;top:-10%;left:50%;transform:translateX(-50%);
          width:600px;height:600px;border-radius:50%;pointer-events:none;z-index:0;
          background:radial-gradient(circle,rgba(26,122,74,.16) 0%,rgba(26,122,74,.05) 50%,transparent 70%);
          filter:blur(4px)}

        /* ── Header ── */
        .ob-header{position:fixed;top:0;left:0;right:0;z-index:100;
          padding:18px 28px 16px;
          background:linear-gradient(180deg,rgba(10,10,10,.95) 0%,transparent 100%);
          display:flex;align-items:center;gap:16px}
        .ob-logo{font-size:16px;font-weight:800;color:#22c55e;letter-spacing:-.3px;white-space:nowrap}
        .ob-prog-track{flex:1;height:3px;background:#1a1a1a;border-radius:99px;overflow:hidden}
        .ob-prog-fill{height:100%;background:linear-gradient(90deg,#1a7a4a,#22c55e);
          border-radius:99px;transition:width .5s cubic-bezier(.4,0,.2,1)}
        .ob-step-lbl{font-size:11px;font-weight:600;color:#52525b;white-space:nowrap}

        /* ── Chat scroll area ── */
        .ob-chat{flex:1;overflow-y:auto;padding:96px 0 140px;
          display:flex;flex-direction:column;
          scrollbar-width:none;position:relative;z-index:1}
        .ob-chat::-webkit-scrollbar{width:0}
        .ob-inner{width:100%;max-width:640px;margin:0 auto;padding:0 24px;
          display:flex;flex-direction:column;gap:6px}

        /* ── Messages ── */
        .ob-row{display:flex;align-items:flex-end;gap:10px}
        .ob-row.user{flex-direction:row-reverse}

        .ob-av{width:30px;height:30px;border-radius:50%;flex-shrink:0;
          background:#1a7a4a;color:#fff;font-size:11px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 1px rgba(26,122,74,.35)}
        .ob-av.user{background:#1c1c1c;color:#71717a;box-shadow:0 0 0 1px #2a2a2a}

        .ob-bubble{max-width:78%;padding:11px 15px;border-radius:18px;
          font-size:14.5px;line-height:1.62;word-break:break-word}
        .ob-bubble.ai{background:#141414;border:1px solid #1f1f1f;color:#e4e4e7;
          border-bottom-left-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
        .ob-bubble.user{background:#1a7a4a;color:#fff;
          border-bottom-right-radius:4px;box-shadow:0 2px 8px rgba(26,122,74,.25)}

        /* Typing dots */
        .ob-typing-wrap{display:flex;align-items:center;gap:5px;padding:4px 2px}
        .ob-dot{width:7px;height:7px;border-radius:50%;background:#3f3f46;
          animation:obDot 1.1s ease-in-out infinite both}

        /* ── Input area ── */
        .ob-footer{position:fixed;bottom:0;left:0;right:0;z-index:100;
          padding:16px 24px 24px;
          background:linear-gradient(0deg,rgba(10,10,10,1) 0%,rgba(10,10,10,.9) 80%,transparent 100%)}
        .ob-input-wrap{max-width:640px;margin:0 auto;
          display:flex;align-items:flex-end;gap:10px;
          background:#141414;border:1px solid #1f1f1f;border-radius:16px;
          padding:8px 8px 8px 16px;
          transition:border-color .15s,box-shadow .15s}
        .ob-input-wrap:focus-within{border-color:rgba(26,122,74,.5);
          box-shadow:0 0 0 3px rgba(26,122,74,.10)}
        .ob-input{flex:1;background:transparent;border:none;outline:none;
          font-size:14.5px;color:#f4f4f5;line-height:1.5;
          font-family:inherit;resize:none;padding:6px 0;max-height:120px}
        .ob-input::placeholder{color:#3f3f46}
        .ob-input:disabled{opacity:.5;cursor:not-allowed}
        .ob-send{width:38px;height:38px;border-radius:11px;flex-shrink:0;
          background:#1a7a4a;color:#fff;border:none;cursor:pointer;
          font-size:18px;display:flex;align-items:center;justify-content:center;
          transition:background .15s,transform .12s,box-shadow .15s;
          box-shadow:0 0 16px rgba(26,122,74,.3)}
        .ob-send:hover:not(:disabled){background:#155f3a;transform:translateY(-1px);
          box-shadow:0 0 24px rgba(26,122,74,.5)}
        .ob-send:active:not(:disabled){transform:scale(.93)}
        .ob-send:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}
        .ob-hint{text-align:center;font-size:11.5px;color:#3f3f46;margin-top:8px}

        /* ── Keyframes ── */
        @keyframes obMsgIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes obDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-6px);opacity:1}}
        @keyframes obGridDrift{from{background-position:0 0,0 0}to{background-position:56px 56px,56px 56px}}
        @keyframes obScan{0%,100%{transform:translateY(-120%);opacity:0}20%{opacity:1}80%{opacity:1}95%{opacity:0}}
      `}</style>

      <div className="ob" style={{ opacity: saindo ? 0 : 1 }}>
        <div className="ob-grid" aria-hidden />
        <div className="ob-scan"  aria-hidden />
        <div className="ob-orb"   aria-hidden />

        {/* ── Header ── */}
        <header className="ob-header">
          <span className="ob-logo">Point.AI</span>
          <div className="ob-prog-track">
            <div className="ob-prog-fill" style={{ width: `${progresso}%` }} />
          </div>
          <span className="ob-step-lbl">{etapa + 1} / {perguntas.length}</span>
        </header>

        {/* ── Chat ── */}
        <div className="ob-chat">
          <div className="ob-inner">

            {/* Previous exchanges */}
            {historico.map((item, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className="ob-row">
                  <div className="ob-av">P</div>
                  <div className="ob-bubble ai">{item.pergunta}</div>
                </div>
                <div className="ob-row user" style={{ animation: 'obMsgIn .32s cubic-bezier(.16,1,.3,1) both' }}>
                  <div className="ob-av user">{nomeLetra}</div>
                  <div className="ob-bubble user">{item.resposta}</div>
                </div>
              </div>
            ))}

            {/* Current question */}
            {!typing && !saindo && (
              <div
                className="ob-row"
                style={{ animation: 'obMsgIn .35s cubic-bezier(.16,1,.3,1) both' }}
              >
                <div className="ob-av">P</div>
                <div className="ob-bubble ai">{textoAtual}</div>
              </div>
            )}

            {/* Typing / completion indicator */}
            {typing && !saindo && (
              <div className="ob-row" style={{ animation: 'obMsgIn .28s ease both' }}>
                <div className="ob-av">P</div>
                <div className="ob-bubble ai">
                  <div className="ob-typing-wrap">
                    <span className="ob-dot" style={{ animationDelay: '0ms' }} />
                    <span className="ob-dot" style={{ animationDelay: '160ms' }} />
                    <span className="ob-dot" style={{ animationDelay: '320ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Completion message */}
            {saindo && (
              <div className="ob-row" style={{ animation: 'obMsgIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                <div className="ob-av">P</div>
                <div className="ob-bubble ai">
                  Perfeito! Preparando seu painel personalizado…
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>
        </div>

        {/* ── Input ── */}
        <div className="ob-footer">
          <div className="ob-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pergAtual.placeholder}
              disabled={typing || saindo}
              className="ob-input"
              autoFocus
            />
            <button
              onClick={avancar}
              disabled={!input.trim() || typing || saindo}
              className="ob-send"
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>
          <p className="ob-hint">Enter para continuar</p>
        </div>
      </div>
    </>
  )
}
