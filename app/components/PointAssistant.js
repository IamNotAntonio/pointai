'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import RichMessage from './RichMessage'

const FIRST_MSG = {
  '/dashboard':       'Bem-vindo de volta! Posso te orientar pelos atalhos da home — me chama se quiser.',
  '/dashboard/chat':  'Quer dicas de como perguntar para a IA de forma mais eficiente? 💡',
  '/notas':           'Já cadastrou suas notas? Posso te explicar como funciona o controle de faltas!',
  '/calendario': 'Tem alguma prova chegando? Posso te ajudar a pensar num plano de revisão! 📅',
  '/evolucao':   'Como está indo o semestre? Veja seu progresso e me conta se precisar de ajuda!',
  '/analise':    'Sabia que você pode mandar foto da sua prova e eu analiso cada erro? 🔬',
  '/relatorio':  'Já gerou seu relatório semanal? É uma ótima forma de ver onde melhorar! 📊',
  '/trabalhos':  'Precisa de feedback no seu trabalho? Cola o texto aqui e a IA analisa tudo!',
}

const HIDE_ON = ['/', '/login', '/onboarding']

function IcX() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export default function PointAssistant() {
  const pathname = usePathname()

  const [mounted,    setMounted]    = useState(false)
  const [aberto,     setAberto]     = useState(false)
  const [perfil,     setPerfil]     = useState(null)
  const [mensagens,  setMensagens]  = useState([])
  const [input,      setInput]      = useState('')
  const [carregando, setCarregando] = useState(false)
  const [badge,      setBadge]      = useState(false)

  const fimRef   = useRef(null)
  const inputRef = useRef(null)

  const isDashboard = pathname === '/dashboard/chat'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('pointai_perfil') || 'null')
      if (p) setPerfil(p)
    } catch {}
  }, [])

  useEffect(() => {
    setBadge(false)
    if (aberto) return

    const key = `pa_hist_${pathname}`
    try {
      const hist = JSON.parse(localStorage.getItem(key) || 'null')
      if (hist?.length) { setMensagens(hist); return }
    } catch {}

    const msg = FIRST_MSG[pathname] || '👋 Olá! Sou o Assistente Point. Como posso ajudar?'
    setMensagens([{ role: 'assistant', content: msg }])

    const t = setTimeout(() => setBadge(true), 3000)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  useEffect(() => {
    if (aberto) {
      setBadge(false)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [aberto])

  function salvar(msgs) {
    try { localStorage.setItem(`pa_hist_${pathname}`, JSON.stringify(msgs)) } catch {}
  }

  async function enviar() {
    const texto = input.trim()
    if (!texto || carregando) return
    const userMsg = { role: 'user', content: texto }
    const novas   = [...mensagens, userMsg]
    setMensagens(novas)
    setInput('')
    setCarregando(true)
    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novas, perfil, pagina: pathname }),
      })
      const dados  = await resp.json()
      const finais = [...novas, { role: 'assistant', content: dados.resposta }]
      setMensagens(finais)
      salvar(finais)
    } catch {}
    setCarregando(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  if (!mounted || HIDE_ON.includes(pathname)) return null

  // No dashboard, sobe o botão acima do input bar (~110px de altura)
  const fabBottom    = isDashboard ? '124px' : '24px'
  const windowBottom = isDashboard ? '188px' : '88px'

  const fabStyle = {
    position: 'fixed',
    bottom: fabBottom,
    right: '24px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundImage: 'url(/logo-mark.png)',
    backgroundSize: '140%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    zIndex: 9999,
    boxShadow: '0 4px 18px rgba(26,122,74,.45)',
    transition: 'transform .15s, box-shadow .15s, bottom .3s',
  }

  const windowStyle = {
    position: 'fixed',
    bottom: windowBottom,
    right: '24px',
    width: '360px',
    height: '500px',
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,.18)',
    transition: 'bottom .3s',
  }

  const badgeStyle = {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    background: '#ef4444',
    border: '2px solid #0a0a0a',
  }

  return createPortal(
    <>
      {/* Floating button */}
      <button
        style={fabStyle}
        onClick={() => setAberto(o => !o)}
        aria-label="Assistente Point"
        title="Assistente Point — Coach do app"
        data-tour="pa-fab"
      >
        {badge && !aberto && <span style={badgeStyle} />}
      </button>

      {/* Chat window */}
      {aberto && (
        <div className="pa-window" style={windowStyle}>
          {/* Header */}
          <div className="pa-header">
            <div className="pa-header-left">
              <div className="pa-avatar" />
              <div>
                <p className="pa-title">Assistente Point</p>
                <p className="pa-subtitle">Coach do Point · Sempre aqui</p>
              </div>
            </div>
            <button className="pa-close" onClick={() => setAberto(false)} aria-label="Fechar">
              <IcX />
            </button>
          </div>

          {/* Messages */}
          <div className="pa-messages">
            {mensagens.map((msg, i) => (
              <div key={i} className={`pa-msg ${msg.role}`}>
                {msg.role === 'assistant' && <div className="pa-msg-avatar" />}
                <div className="pa-bubble">
                  <RichMessage content={msg.content} />
                </div>
              </div>
            ))}

            {carregando && (
              <div className="pa-msg assistant">
                <div className="pa-msg-avatar" />
                <div className="pa-bubble">
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div className="pa-input-area">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Mensagem…"
              className="pa-input"
              disabled={carregando}
            />
            <button
              className="pa-send"
              onClick={enviar}
              disabled={!input.trim() || carregando}
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
