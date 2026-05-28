'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowUp, Paperclip, X,
  FileText, PenLine, Lightbulb, HelpCircle,
  Image as ImageIcon,
} from 'lucide-react'
import { useProfile } from '../lib/ProfileContext'
import * as db from '../lib/db'
import RichMessage from './RichMessage'

const EASE = [0.22, 1, 0.36, 1]

const CHIPS = [
  { id: 'resumo',     Icon: FileText,   label: 'Resumir conteúdo' },
  { id: 'exercicios', Icon: PenLine,    label: 'Criar exercícios' },
  { id: 'explicar',   Icon: Lightbulb,  label: 'Explicar conceito' },
  { id: 'duvida',     Icon: HelpCircle, label: 'Tirar dúvida' },
]

function chipTemplate(id, materia, isGeral) {
  switch (id) {
    case 'resumo':
      return isGeral
        ? 'Resuma os principais conceitos que estudei recentemente'
        : `Resuma os principais conceitos de ${materia}`
    case 'exercicios':
      return isGeral
        ? 'Crie 5 exercícios sobre o que estudei recentemente'
        : `Crie 5 exercícios de ${materia} de dificuldade média`
    case 'explicar':
      return 'Me explique sobre '
    case 'duvida':
      return 'Tenho uma dúvida sobre '
    default:
      return ''
  }
}

function truncateName(name, max = 24) {
  if (!name) return ''
  return name.length <= max ? name : name.slice(0, max - 3) + '…'
}

function detectKind(file) {
  if (file.type?.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  return 'file'
}

function useAutoResizeTextarea({ minHeight = 56, maxHeight = 200 } = {}) {
  const textareaRef = useRef(null)
  const adjustHeight = useCallback((reset) => {
    const el = textareaRef.current
    if (!el) return
    if (reset) {
      el.style.height = `${minHeight}px`
      return
    }
    el.style.height = `${minHeight}px`
    const next = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight))
    el.style.height = `${next}px`
  }, [minHeight, maxHeight])
  return { textareaRef, adjustHeight }
}

/**
 * Chat — adaptive (D.5).
 *   Empty state: gradient headline + glassy input centered + chips. Bento visible.
 *   Active state (≥1 user msg): chat becomes protagonist — history scrolls,
 *     a SINGLE persistent input card slides from center to the bottom dock via
 *     Motion layout, headline disappears, bento auto-collapses (window event).
 *   Adaptive widths handled in CSS: text in a 720px readable column, wide blocks
 *     (code/tables/charts/svg/images) break out to full canvas width.
 */
export default function Chat({ materia = 'geral', className, onFocusChange }) {
  const { perfil } = useProfile()
  const reduce = useReducedMotion()

  const isGeral = materia === 'geral'
  const chatKey = isGeral ? '__geral__' : materia

  const [mensagens, setMensagens] = useState([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [inputFocused, setInputFocused] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const fimRef = useRef(null)
  const fileInputRef = useRef(null)
  const area = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 })

  const isEmpty = !mensagens.some(m => m.role === 'user')

  /* ── Load chat history when matéria changes ─────────────────── */
  // NOTE: `area` is intentionally NOT in deps — useAutoResizeTextarea returns a
  // fresh object every render, so including it would cause an endless re-fetch
  // loop that constantly clears input + mensagens.
  useEffect(() => {
    if (!perfil || !materia) return
    let alive = true
    db.getChat(chatKey).then(historico => {
      if (!alive) return
      setMensagens(historico?.length ? historico : [])
    }).catch(() => {})
    setInput('')
    setAttachments([])
    area.adjustHeight(true)
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey, perfil, isGeral, materia])

  useEffect(() => {
    if (isEmpty) return
    fimRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }, [mensagens, carregando, isEmpty, reduce])

  /* ── Mouse follower (green orb while focused) ───────────────── */
  useEffect(() => {
    if (!inputFocused || reduce) return
    function handle(e) { setMouse({ x: e.clientX, y: e.clientY }) }
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [inputFocused, reduce])

  function handleFocus() {
    setInputFocused(true)
    onFocusChange?.(true)
  }
  function handleBlur() {
    setInputFocused(false)
    onFocusChange?.(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function aplicarChip(id) {
    const template = chipTemplate(id, materia, isGeral)
    setInput(template)
    setTimeout(() => {
      const el = area.textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(template.length, template.length)
      area.adjustHeight()
    }, 10)
  }

  function openFilePicker() { fileInputRef.current?.click() }

  function onFilesChosen(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setAttachments(prev => {
      const room = Math.max(0, 3 - prev.length)
      const incoming = files.slice(0, room).map(f => ({
        id: `${Date.now()}-${f.name}`,
        file: f,
        name: f.name,
        kind: detectKind(f),
      }))
      return [...prev, ...incoming]
    })
    e.target.value = ''
  }

  function removeAttachment(id) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  /* ── Core send: streams one assistant turn appended to `base` ── */
  async function sendTurn(texto, base) {
    if (!perfil) return
    const wasEmpty = !base.some(m => m.role === 'user')

    const novaMsg = {
      role: 'user',
      content: texto,
      timestamp: new Date().toISOString(),
    }
    const novas = [...base, novaMsg]
    setMensagens(novas)
    setCarregando(true)

    // On the very first user message, collapse the bento so the chat takes over.
    if (wasEmpty) {
      try { window.dispatchEvent(new CustomEvent('bento-collapse')) } catch {}
    }

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novas, perfil, materia: chatKey }),
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
          materia: chatKey, ultimaMensagem: preview, timestamp: Date.now(),
        }))
      } catch {}

      // Fire-and-forget concept extraction. Não bloqueia a UI; o card do
      // Cérebro Point escuta o evento 'cerebro-updated' pra recarregar stats.
      try {
        const contextoAnterior = base
          .slice(-2)
          .map(m => `${m.role === 'user' ? 'Aluno' : 'IA'}: ${(m.content || '').slice(0, 200)}`)
          .join('\n')
        fetch('/api/extrair-conceitos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: texto,
            aiResponse: fullText,
            materia: chatKey === '__geral__' ? 'geral' : chatKey,
            contextoAnterior,
          }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(stats => {
            if (stats) {
              try { window.dispatchEvent(new CustomEvent('cerebro-updated', { detail: stats })) } catch {}
            }
          })
          .catch(() => {})
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

  /* ── Send from the input box ───────────────────────────────── */
  async function enviar() {
    const texto = input.trim()
    if ((!texto && attachments.length === 0) || carregando || !perfil) return

    setInput('')
    // TODO D.5: process file attachments through multimodal API.
    setAttachments([])
    area.adjustHeight(true)

    await sendTurn(texto || '(anexo)', mensagens)
  }

  const nome = perfil?.nome?.split(' ')[0] || ''
  const placeholder = isGeral ? 'Pergunte qualquer coisa…' : `Pergunte sobre ${materia}…`
  const canSend = !!input.trim() || attachments.length > 0

  return (
    <div className={`v0-chat ${isEmpty ? 'is-empty' : 'is-active'} ${className || ''}`}>
      <style>{V0_CSS}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={onFilesChosen}
      />

      {/* Mouse follower — subtle green orb that tracks cursor when typing */}
      {inputFocused && !reduce && (
        <motion.div
          aria-hidden
          className="v0-mouse-orb"
          animate={{ x: mouse.x - 400, y: mouse.y - 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}

      {/* Canvas: hero (empty) or scrolling history (active) */}
      <div className="v0-canvas">
        {isEmpty ? (
          <motion.div
            key="hero"
            className="v0-hero"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="v0-headline-block">
              <p className="v0-headline-greeting">
                Olá{nome ? <>, <strong>{nome}</strong></> : null}! 👋
              </p>
              <h1 className="v0-headline-gradient">
                {isGeral
                  ? 'Como posso te ajudar hoje?'
                  : <>O que vamos ver de <span className="v0-headline-em">{materia}</span> hoje?</>}
              </h1>
              <motion.div
                className="v0-headline-line"
                initial={reduce ? false : { width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
              />
            </div>
            <p className="v0-headline-subtitle">
              Pergunte qualquer coisa, anexe materiais ou escolha um atalho abaixo
            </p>
          </motion.div>
        ) : (
          <div className="v0-history" role="log" aria-live="polite">
            {mensagens.map((m, i) => (
              <Message key={i} msg={m} reduce={reduce} />
            ))}
            {carregando && <ThinkingDots />}
            <div ref={fimRef} />
          </div>
        )}
      </div>

      {/* Input card — single persistent element; slides center→dock via layout */}
      <div className="v0-input-shell">
        <motion.div
          layout={!reduce}
          className="v0-input-card"
          transition={reduce ? { duration: 0 } : { layout: { duration: 0.5, ease: EASE } }}
        >
          <InputBody
            textareaRef={area.textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); area.adjustHeight() }}
            onKeyDown={onKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            carregando={carregando}
            attachments={attachments}
            onRemoveAttach={removeAttachment}
          />
          <InputFooter
            onAttachClick={openFilePicker}
            onSubmit={enviar}
            carregando={carregando}
            canSend={canSend}
            attachLocked={attachments.length >= 3}
          />
        </motion.div>
      </div>

      {/* Suggestion chips — empty state only */}
      <AnimatePresence initial={false}>
        {isEmpty && (
          <motion.div
            key="chips"
            className="v0-chips-shell"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.18 } }}
          >
            <div className="v0-chips">
              {CHIPS.map((c, i) => (
                <motion.button
                  key={c.id}
                  type="button"
                  className="v0-chip"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.3, ease: EASE }}
                  onClick={() => aplicarChip(c.id)}
                >
                  <c.Icon size={13} strokeWidth={1.8} />
                  <span>{c.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Sub-components ───────────────────────────────────────────── */

function InputBody({ textareaRef, value, onChange, onKeyDown, onFocus, onBlur, placeholder, carregando, attachments, onRemoveAttach }) {
  return (
    <>
      {attachments.length > 0 && (
        <div className="v0-attach-row">
          {attachments.map(a => (
            <span key={a.id} className="v0-attach-chip" title={a.name}>
              {a.kind === 'image'
                ? <ImageIcon size={12} strokeWidth={1.8} />
                : <FileText size={12} strokeWidth={1.8} />}
              {truncateName(a.name)}
              <button type="button" onClick={() => onRemoveAttach(a.id)} aria-label={`Remover ${a.name}`}>
                <X size={11} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="v0-textarea"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={carregando}
        rows={1}
        aria-label="Mensagem"
      />
    </>
  )
}

function InputFooter({ onAttachClick, onSubmit, carregando, canSend, attachLocked }) {
  return (
    <div className="v0-input-footer">
      <button
        type="button"
        onClick={onAttachClick}
        className="v0-attach-btn"
        aria-label="Anexar arquivo"
        disabled={carregando || attachLocked}
      >
        <Paperclip size={18} strokeWidth={1.8} />
      </button>
      <motion.button
        type="button"
        onClick={onSubmit}
        disabled={!canSend || carregando}
        className="v0-send-btn"
        aria-label="Enviar"
        whileHover={canSend && !carregando ? { scale: 1.04 } : {}}
        whileTap={canSend && !carregando ? { scale: 0.96 } : {}}
      >
        {carregando
          ? <span className="v0-spinner" />
          : <ArrowUp size={16} strokeWidth={2.4} />}
      </motion.button>
    </div>
  )
}

function Message({ msg, reduce }) {
  const isAi = msg.role === 'assistant'
  return (
    <motion.div
      className={`v0-msg ${isAi ? 'ai' : 'user'}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {isAi && <div className="v0-avatar">P</div>}
      <div className="v0-msg-col">
        <div className={`v0-bubble ${isAi ? 'ai' : 'user'}`}>
          {isAi ? <RichMessage content={msg.content} /> : msg.content}
        </div>
      </div>
    </motion.div>
  )
}

function ThinkingDots() {
  return (
    <div className="v0-msg ai">
      <div className="v0-avatar">P</div>
      <div className="v0-msg-col">
        <div className="v0-bubble ai" style={{ padding: 0 }}>
          <span className="v0-thinking" aria-label="Digitando">
            <span /><span /><span />
          </span>
        </div>
      </div>
    </div>
  )
}

const V0_CSS = `
  .v0-chat{position:relative;width:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden;flex:1}
  .v0-chat.is-empty{justify-content:center;gap:22px;overflow-y:auto}

  /* ── Mouse follower ── */
  .v0-mouse-orb{position:fixed;left:0;top:0;width:50rem;height:50rem;border-radius:50%;pointer-events:none;z-index:0;opacity:.025;background:radial-gradient(circle, #22c55e 0%, transparent 70%);filter:blur(96px);will-change:transform}

  /* ── Canvas ── */
  .v0-canvas{position:relative;z-index:1;display:flex;flex-direction:column;min-height:0}
  .is-empty .v0-canvas{flex:0 0 auto;align-items:center;justify-content:center;padding:8px 24px 0}
  .is-active .v0-canvas{flex:1 1 auto;overflow:hidden}

  /* ── Hero (empty) ── */
  .v0-hero{display:flex;flex-direction:column;align-items:center;gap:14px;max-width:580px;width:100%}
  .v0-headline-block{text-align:center;max-width:580px;width:100%}
  .v0-headline-greeting{font-size:14px;color:rgba(255,255,255,.5);margin-bottom:10px;font-weight:400}
  .v0-headline-greeting strong{color:#22c55e;font-weight:700}
  .v0-headline-gradient{font-size:clamp(26px, 3.4vw, 36px);font-weight:500;letter-spacing:-.025em;line-height:1.18;background:linear-gradient(to right, rgba(255,255,255,.95), rgba(255,255,255,.5));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:8px;margin-bottom:14px}
  .v0-headline-em{color:#22c55e;background:none;-webkit-text-fill-color:#22c55e;font-weight:600}
  .v0-headline-line{height:1px;background:linear-gradient(to right, transparent, rgba(34,197,94,.45), transparent);margin:0 auto}
  .v0-headline-subtitle{font-size:13.5px;color:rgba(255,255,255,.4);text-align:center;max-width:480px;line-height:1.55;margin-top:-2px}

  /* ── History (active) ── */
  .v0-history{flex:1;overflow-y:auto;padding:24px 24px 8px;display:flex;flex-direction:column;gap:16px;min-height:0;max-width:880px;width:100%;margin:0 auto}
  .v0-history::-webkit-scrollbar{width:6px}
  .v0-history::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:8px}

  /* ── Input card (only delimited surface) ── */
  .v0-input-shell{position:relative;z-index:2;flex:0 0 auto}
  .is-empty .v0-input-shell{padding:0 24px}
  .is-active .v0-input-shell{padding:8px 24px calc(18px + env(safe-area-inset-bottom, 0px))}
  .v0-input-card{position:relative;width:100%;margin:0 auto;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,.4);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);display:flex;flex-direction:column;transition:border-color .15s,box-shadow .15s}
  .is-empty .v0-input-card{max-width:600px}
  .is-active .v0-input-card{max-width:820px}
  .v0-input-card:focus-within{border-color:rgba(34,197,94,.4);box-shadow:0 0 0 3px rgba(34,197,94,.06), 0 24px 48px rgba(0,0,0,.4)}

  .v0-textarea{width:100%;background:transparent;border:none;outline:none;resize:none;font-family:inherit;font-size:14.5px;line-height:1.55;color:rgba(255,255,255,.9);padding:14px 16px 8px}
  .v0-textarea::placeholder{color:rgba(255,255,255,.22)}
  .v0-textarea:disabled{opacity:.6}

  .v0-input-footer{border-top:1px solid rgba(255,255,255,.05);padding:8px 10px;display:flex;align-items:center;justify-content:space-between;margin-top:auto}
  .v0-attach-btn{background:none;border:none;padding:8px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.4);transition:color .15s,background .15s;display:inline-flex;align-items:center;justify-content:center}
  .v0-attach-btn:hover:not(:disabled){color:rgba(255,255,255,.9);background:rgba(255,255,255,.05)}
  .v0-attach-btn:disabled{opacity:.3;cursor:not-allowed}
  .v0-send-btn{background:#1a7a4a;border:none;width:36px;height:36px;border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,box-shadow .15s;flex-shrink:0}
  .v0-send-btn:hover:not(:disabled){background:#155f3a;box-shadow:0 0 14px rgba(26,122,74,.35)}
  .v0-send-btn:disabled{opacity:.5;cursor:not-allowed;background:rgba(255,255,255,.05);color:rgba(255,255,255,.3);box-shadow:none}

  .v0-attach-row{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.05)}
  .v0-attach-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.7);font-size:11.5px;font-weight:500;padding:4px 4px 4px 10px;border-radius:8px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .v0-attach-chip button{background:none;border:none;color:rgba(255,255,255,.5);padding:3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;transition:color .15s,background .15s}
  .v0-attach-chip button:hover{color:rgba(255,255,255,.9);background:rgba(255,255,255,.05)}

  /* ── Chips ── */
  .v0-chips-shell{position:relative;z-index:1;flex:0 0 auto;padding:0 24px}
  .v0-chips{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;max-width:600px;width:100%;margin:0 auto}
  .v0-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:10px;font-size:13px;color:rgba(255,255,255,.6);cursor:pointer;font-family:inherit;transition:background .15s,color .15s,border-color .15s}
  .v0-chip:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.95);border-color:rgba(34,197,94,.32)}
  .v0-chip svg{color:rgba(255,255,255,.5);transition:color .15s}
  .v0-chip:hover svg{color:#22c55e}

  /* ── Messages ── */
  .v0-msg{display:flex;gap:10px;align-items:flex-start;max-width:100%}
  .v0-msg.user{flex-direction:row-reverse}
  .v0-msg-col{display:flex;flex-direction:column;min-width:0;flex:1}
  .v0-msg.user .v0-msg-col{align-items:flex-end}
  .v0-avatar{width:26px;height:26px;border-radius:50%;background:#1a7a4a;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
  .v0-bubble{padding:10px 14px;font-size:13.5px;line-height:1.6;word-break:break-word}
  .v0-bubble.ai{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);color:#e4e4e7;border-radius:14px 14px 14px 4px;width:100%}
  .v0-bubble.user{background:#1a7a4a;color:#fff;border-radius:14px 14px 4px 14px;white-space:pre-wrap;max-width:min(640px,82%)}

  /* ── Adaptive widths: readable text column + full-bleed wide blocks ── */
  .v0-bubble.ai > *{max-width:720px}
  .v0-bubble.ai > .chat-code-block,
  .v0-bubble.ai > .chat-table-wrap,
  .v0-bubble.ai > .chat-chart-block,
  .v0-bubble.ai > .svg-block,
  .v0-bubble.ai > pre,
  .v0-bubble.ai > img{max-width:100%;width:100%}

  /* ── Thinking + spinner ── */
  .v0-thinking{display:inline-flex;gap:4px;padding:14px;align-items:center}
  .v0-thinking span{display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.4);animation:v0Dot 1.1s ease-in-out infinite both}
  .v0-thinking span:nth-child(2){animation-delay:.16s}
  .v0-thinking span:nth-child(3){animation-delay:.32s}
  @keyframes v0Dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
  .v0-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:v0Spin .8s linear infinite}
  @keyframes v0Spin{to{transform:rotate(360deg)}}

  /* ── Responsive: full-width messages, tighter padding ── */
  @media (max-width: 1023px){
    .v0-bubble.ai > *{max-width:100%}
  }
  @media (max-width: 768px){
    .is-empty .v0-canvas{padding:8px 16px 0}
    .v0-headline-gradient{font-size:clamp(22px, 5vw, 28px)}
    .is-empty .v0-input-shell,.v0-chips-shell{padding:0 16px}
    .is-active .v0-input-shell{padding:8px 14px calc(14px + env(safe-area-inset-bottom, 0px))}
    .v0-history{padding:16px 16px 8px}
  }
`
