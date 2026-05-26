'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowUp, Paperclip, X,
  FileText, PenLine, Lightbulb, HelpCircle, Calendar,
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
  { id: 'plano',      Icon: Calendar,   label: 'Plano de estudos' },
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
    case 'plano':
      return isGeral
        ? 'Monte um plano de estudos pra próxima semana'
        : `Monte um plano de estudos pra prova de ${materia}`
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

/**
 * Chat — v0-style. Two visual states:
 *   - empty: centered headline + large input + suggestion chips
 *   - messages: scrolling history + compact input docked at bottom
 *
 * Transition is driven by isEmpty (= no user message yet). The first
 * setMensagens([userMsg]) flips the state and AnimatePresence cross-fades.
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

  const fimRef = useRef(null)
  const textareaEmptyRef = useRef(null)
  const textareaMsgsRef = useRef(null)
  const fileInputRef = useRef(null)

  // Empty state: no user turn yet (history might have only an old greeting).
  const isEmpty = !mensagens.some(m => m.role === 'user')

  /* ── Load chat history when matéria changes ─────────────────── */
  useEffect(() => {
    if (!perfil || !materia) return
    let alive = true
    db.getChat(chatKey).then(historico => {
      if (!alive) return
      setMensagens(historico?.length ? historico : [])
    }).catch(() => {})
    setInput('')
    setAttachments([])
    return () => { alive = false }
  }, [chatKey, perfil, isGeral, materia])

  useEffect(() => {
    if (isEmpty) return
    fimRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }, [mensagens, carregando, isEmpty, reduce])

  /* ── Autosize textarea ──────────────────────────────────────── */
  function autosize(el, maxH) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
  }
  function onChangeEmpty(e)  { setInput(e.target.value); autosize(textareaEmptyRef.current, 220) }
  function onChangeMsgs(e)   { setInput(e.target.value); autosize(textareaMsgsRef.current, 160) }

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
      const el = textareaEmptyRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(template.length, template.length)
      autosize(el, 220)
    }, 10)
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

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

  /* ── Send ───────────────────────────────────────────────────── */
  async function enviar() {
    const texto = input.trim()
    if ((!texto && attachments.length === 0) || carregando || !perfil) return

    setInput('')
    // TODO D.5: process attachments through multimodal API. For now they
    // just clear visually on send.
    setAttachments([])

    if (textareaEmptyRef.current) textareaEmptyRef.current.style.height = 'auto'
    if (textareaMsgsRef.current)  textareaMsgsRef.current.style.height = 'auto'

    const novaMsg = {
      role: 'user',
      content: texto || '(anexo)',
      timestamp: new Date().toISOString(),
    }
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
          materia: chatKey,
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
          materia: chatKey, ultimaMensagem: preview, timestamp: Date.now(),
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

  const nome = perfil?.nome?.split(' ')[0] || ''
  const placeholder = isGeral ? 'Pergunte qualquer coisa…' : `Pergunte sobre ${materia}…`
  const canSend = !!input.trim() || attachments.length > 0

  return (
    <div className={`v0-chat ${className || ''}`}>
      <style>{V0_CSS}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={onFilesChosen}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isEmpty ? (
          <motion.div
            key="empty"
            className="v0-empty"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <Headline nome={nome} materia={materia} isGeral={isGeral} />
            <InputCard
              variant="large"
              textareaRef={textareaEmptyRef}
              value={input}
              onChange={onChangeEmpty}
              onKeyDown={onKeyDown}
              onSubmit={enviar}
              onFocusChange={onFocusChange}
              placeholder={placeholder}
              attachments={attachments}
              onAttachClick={openFilePicker}
              onRemoveAttach={removeAttachment}
              carregando={carregando}
              canSend={canSend}
            />
            <ChipBar onPick={aplicarChip} />
          </motion.div>
        ) : (
          <motion.div
            key="msgs"
            className="v0-msgs-state"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="v0-history" role="log" aria-live="polite">
              {mensagens.map((m, i) => <Message key={i} msg={m} />)}
              {carregando && <ThinkingDots />}
              <div ref={fimRef} />
            </div>
            <div className="v0-input-dock">
              <InputCard
                variant="small"
                textareaRef={textareaMsgsRef}
                value={input}
                onChange={onChangeMsgs}
                onKeyDown={onKeyDown}
                onSubmit={enviar}
                onFocusChange={onFocusChange}
                placeholder={placeholder}
                attachments={attachments}
                onAttachClick={openFilePicker}
                onRemoveAttach={removeAttachment}
                carregando={carregando}
                canSend={canSend}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Sub-components ───────────────────────────────────────────── */

function Headline({ nome, materia, isGeral }) {
  return (
    <div className="v0-headline">
      <p className="v0-headline-l1">
        Olá{nome ? <>, <strong>{nome}</strong></> : null}! 👋
      </p>
      <h1 className="v0-headline-l2">
        {isGeral
          ? <>O que vamos estudar hoje?</>
          : <>O que vamos ver de <strong>{materia}</strong> hoje?</>}
      </h1>
    </div>
  )
}

function ChipBar({ onPick }) {
  return (
    <div className="v0-chips">
      {CHIPS.map(c => (
        <button key={c.id} type="button" className="v0-chip" onClick={() => onPick(c.id)}>
          <c.Icon size={13} strokeWidth={1.8} />
          {c.label}
        </button>
      ))}
    </div>
  )
}

function InputCard({
  variant, textareaRef, value, onChange, onKeyDown, onSubmit, onFocusChange,
  placeholder, attachments, onAttachClick, onRemoveAttach,
  carregando, canSend,
}) {
  const isLarge = variant === 'large'
  return (
    <div className={`v0-input-card ${isLarge ? 'large' : 'small'}`}>
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
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        placeholder={placeholder}
        disabled={carregando}
        rows={1}
        aria-label="Mensagem"
      />
      <div className="v0-input-actions">
        <button
          type="button"
          onClick={onAttachClick}
          className="v0-attach-btn"
          aria-label="Anexar arquivo"
          disabled={carregando || attachments.length >= 3}
        >
          <Paperclip size={18} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend || carregando}
          className="v0-send-btn"
          aria-label="Enviar"
        >
          {carregando
            ? <span className="v0-spinner" />
            : <ArrowUp size={16} strokeWidth={2.4} />}
        </button>
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isAi = msg.role === 'assistant'
  return (
    <div className={`v0-msg ${isAi ? 'ai' : 'user'}`}>
      {isAi && <div className="v0-avatar">P</div>}
      <div className={`v0-bubble ${isAi ? 'ai' : 'user'}`}>
        {isAi ? <RichMessage content={msg.content} /> : msg.content}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="v0-msg ai">
      <div className="v0-avatar">P</div>
      <div className="v0-bubble ai" style={{ padding: 0 }}>
        <span className="v0-thinking" aria-label="Digitando">
          <span /><span /><span />
        </span>
      </div>
    </div>
  )
}

const V0_CSS = `
  .v0-chat{display:flex;flex-direction:column;height:100%;min-height:0;position:relative}

  /* ── Empty state ── */
  .v0-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px 40px;min-height:0;overflow-y:auto}
  .v0-empty::-webkit-scrollbar{width:6px}
  .v0-empty::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:8px}
  .v0-headline{text-align:center;margin-bottom:28px;max-width:560px}
  .v0-headline-l1{font-size:17px;color:#a1a1aa;margin-bottom:6px;font-weight:400}
  .v0-headline-l1 strong{color:#22c55e;font-weight:700}
  .v0-headline-l2{font-size:clamp(24px, 3vw, 32px);font-weight:800;color:#f4f4f5;letter-spacing:-.02em;line-height:1.2}
  .v0-headline-l2 strong{color:#22c55e;font-weight:800}

  /* ── Messages state ── */
  .v0-msgs-state{display:flex;flex-direction:column;height:100%;min-height:0}
  .v0-history{flex:1;overflow-y:auto;padding:18px 22px 8px;display:flex;flex-direction:column;gap:14px;min-height:0}
  .v0-history::-webkit-scrollbar{width:6px}
  .v0-history::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:8px}
  .v0-input-dock{padding:10px 16px 14px;flex-shrink:0;border-top:1px solid #161616;background:#0a0a0a}
  .v0-input-dock .v0-input-card{max-width:100%}

  /* ── Input card (shared) ── */
  .v0-input-card{position:relative;width:100%;max-width:580px;background:rgba(20,20,20,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;transition:border-color .15s,box-shadow .15s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  .v0-input-card:focus-within{border-color:rgba(34,197,94,.5);box-shadow:0 0 24px rgba(34,197,94,.08)}
  .v0-textarea{width:100%;background:transparent;border:none;outline:none;resize:none;font-family:inherit;font-size:14.5px;line-height:1.55;color:#e4e4e7;padding:14px 16px 52px 16px;display:block}
  .v0-textarea::placeholder{color:#52525b}
  .v0-textarea:disabled{opacity:.65}
  .v0-input-card.large .v0-textarea{min-height:92px;max-height:220px}
  .v0-input-card.small .v0-textarea{min-height:52px;max-height:160px;padding:14px 16px 48px 16px}

  .v0-input-actions{position:absolute;left:10px;right:10px;bottom:8px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
  .v0-input-actions > *{pointer-events:auto}
  .v0-attach-btn{background:none;border:none;color:#71717a;padding:6px;border-radius:8px;cursor:pointer;opacity:.7;transition:opacity .15s,background .15s,color .15s;display:inline-flex;align-items:center;justify-content:center}
  .v0-attach-btn:hover:not(:disabled){opacity:1;background:#ffffff05;color:#d4d4d8}
  .v0-attach-btn:disabled{opacity:.3;cursor:not-allowed}
  .v0-send-btn{background:#1a7a4a;border:none;width:34px;height:34px;border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,box-shadow .15s,transform .15s;flex-shrink:0}
  .v0-send-btn:hover:not(:disabled){background:#155f3a;box-shadow:0 0 16px rgba(26,122,74,.4)}
  .v0-send-btn:disabled{opacity:.5;cursor:not-allowed;background:#1f1f1f;box-shadow:none}

  /* ── Attachments row ── */
  .v0-attach-row{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 0}
  .v0-attach-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.22);color:#86efac;font-size:11.5px;font-weight:500;padding:4px 4px 4px 10px;border-radius:99px;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .v0-attach-chip button{background:none;border:none;color:#86efac;padding:3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;opacity:.7;transition:opacity .15s,background .15s}
  .v0-attach-chip button:hover{opacity:1;background:rgba(255,255,255,.06)}

  /* ── Chips ── */
  .v0-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:580px;margin-top:18px}
  .v0-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,20,.5);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:8px 14px;font-size:12.5px;color:#d4d4d8;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s,background .15s}
  .v0-chip:hover{border-color:rgba(34,197,94,.4);color:#22c55e;background:rgba(26,122,74,.06)}
  .v0-chip svg{color:#86efac}

  /* ── Messages ── */
  .v0-msg{display:flex;gap:10px;align-items:flex-end;max-width:100%}
  .v0-msg.user{flex-direction:row-reverse}
  .v0-avatar{width:26px;height:26px;border-radius:50%;background:#1a7a4a;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .v0-bubble{padding:10px 14px;font-size:13.5px;line-height:1.6;max-width:80%;word-break:break-word}
  .v0-bubble.ai{background:#0f0f0f;border:1px solid #1a1a1a;color:#e4e4e7;border-radius:14px 14px 14px 4px}
  .v0-bubble.user{background:#1a7a4a;color:#fff;border-radius:14px 14px 4px 14px;white-space:pre-wrap}

  /* ── Thinking + spinner ── */
  .v0-thinking{display:inline-flex;gap:4px;padding:14px;align-items:center}
  .v0-thinking span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#52525b;animation:v0Dot 1.1s ease-in-out infinite both}
  .v0-thinking span:nth-child(2){animation-delay:.16s}
  .v0-thinking span:nth-child(3){animation-delay:.32s}
  @keyframes v0Dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
  .v0-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:v0Spin .8s linear infinite}
  @keyframes v0Spin{to{transform:rotate(360deg)}}
`
