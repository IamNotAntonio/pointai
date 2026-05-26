'use client'
import { useState, useEffect, useRef } from 'react'
import { useProfile } from '../lib/ProfileContext'
import * as db from '../lib/db'
import RichMessage from './RichMessage'
import { Send } from 'lucide-react'

/**
 * Chat motor — bare conversational loop. Receives a `materia` prop
 * ('geral' for Chat Geral, or any matéria name). Loads/saves history by
 * materia, calls /api/chat with streaming, renders bubbles + textarea.
 *
 * Voice / image upload / quiz / TTS / PDF export / resumo flows from the
 * legacy /dashboard/chat page were intentionally left out for D.2 — they
 * return in D.3+.
 */
export default function Chat({ materia = 'geral', className }) {
  const { perfil } = useProfile()
  const isGeral = materia === 'geral'
  const chatKey = isGeral ? '__geral__' : materia
  const materiaKey = chatKey

  const [mensagens, setMensagens] = useState([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef(null)
  const textareaRef = useRef(null)

  // Load chat history for current matéria
  useEffect(() => {
    if (!perfil || !materia) return
    let alive = true
    db.getChat(chatKey).then(historico => {
      if (!alive) return
      if (historico?.length) {
        setMensagens(historico)
      } else {
        const greeting = isGeral
          ? `Olá, **${perfil.nome}**! 👋 Aqui é o Chat Geral — pode me perguntar qualquer coisa sobre seus estudos. Dúvidas, técnicas de estudo, planejamento... estou aqui.`
          : `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${materia}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações.`
        setMensagens([{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }])
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [chatKey, perfil, isGeral, materia])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function enviar() {
    const texto = input.trim()
    if (!texto || carregando || !perfil) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const novaMsg = { role: 'user', content: texto, timestamp: new Date().toISOString() }
    const novas = [...mensagens, novaMsg]
    setMensagens(novas)
    setCarregando(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: novas,
          perfil,
          materia: materiaKey,
        }),
      })
      if (!resp.ok || !resp.body) throw new Error('stream failed')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }

      const final = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() }
      const finais = [...novas, final]
      setMensagens(finais)
      db.saveChat(chatKey, finais).catch(() => {})

      try {
        const preview = fullText.replace(/[#*`_>\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
        localStorage.setItem('pointai_last_chat', JSON.stringify({
          materia: materiaKey, ultimaMensagem: preview, timestamp: Date.now(),
        }))
      } catch {}
    } catch {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpa, deu um erro ao responder. Tenta de novo em alguns segundos?',
        timestamp: new Date().toISOString(),
      }])
    }
    setCarregando(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function onInputChange(e) {
    setInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    }
  }

  return (
    <div className={`chat-motor ${className || ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        .cm-history{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:12px;min-height:0}
        .cm-history::-webkit-scrollbar{width:6px}
        .cm-history::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:8px}
        .cm-msg{display:flex;gap:10px;align-items:flex-end;max-width:100%}
        .cm-msg.user{flex-direction:row-reverse}
        .cm-bubble{padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.6;max-width:82%;word-break:break-word}
        .cm-bubble.ai{background:#161616;border:1px solid #222;color:#d4d4d8;border-bottom-left-radius:4px}
        .cm-bubble.user{background:#1a7a4a;color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}
        .cm-avatar{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#1a7a4a;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .cm-thinking{display:inline-flex;gap:4px;padding:14px}
        .cm-thinking span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#52525b;animation:cmDot 1.1s ease-in-out infinite both}
        .cm-thinking span:nth-child(2){animation-delay:.16s}
        .cm-thinking span:nth-child(3){animation-delay:.32s}
        @keyframes cmDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
        .cm-input-bar{border-top:1px solid #161616;padding:12px 16px;display:flex;gap:8px;align-items:flex-end;background:#0a0a0a;flex-shrink:0}
        .cm-textarea{flex:1;background:#101010;border:1px solid #1a1a1a;border-radius:10px;padding:10px 14px;color:#f4f4f5;font-size:13.5px;line-height:1.5;resize:none;outline:none;font-family:inherit;min-height:40px;max-height:140px;transition:border-color .15s,box-shadow .15s}
        .cm-textarea:focus{border-color:rgba(34,197,94,.4);box-shadow:0 0 0 3px rgba(34,197,94,.08)}
        .cm-send-btn{background:#1a7a4a;color:#fff;border:none;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;flex-shrink:0}
        .cm-send-btn:hover:not(:disabled){background:#155f3a}
        .cm-send-btn:disabled{opacity:.4;cursor:not-allowed}
      `}</style>

      <div className="cm-history" role="log" aria-live="polite">
        {mensagens.map((m, i) => (
          <div key={i} className={`cm-msg ${m.role}`}>
            {m.role === 'assistant' && <div className="cm-avatar">P</div>}
            <div className={`cm-bubble ${m.role === 'assistant' ? 'ai' : 'user'}`}>
              {m.role === 'assistant' ? <RichMessage content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {carregando && (
          <div className="cm-msg assistant">
            <div className="cm-avatar">P</div>
            <div className="cm-bubble ai" style={{ padding: 0 }}>
              <div className="cm-thinking" aria-label="Pensando"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <div className="cm-input-bar">
        <textarea
          ref={textareaRef}
          className="cm-textarea"
          placeholder={isGeral ? 'Pergunte qualquer coisa…' : `Pergunte sobre ${materia}…`}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Mensagem"
        />
        <button
          className="cm-send-btn"
          onClick={enviar}
          disabled={!input.trim() || carregando}
          aria-label="Enviar"
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
