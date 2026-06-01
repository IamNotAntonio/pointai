'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  ArrowUp, Paperclip, X,
  FileText, PenLine, Lightbulb, HelpCircle,
  Image as ImageIcon,
  Maximize2, AlignLeft, Sparkles, Copy, Check, Pencil,
  File as FileIcon, ClipboardPaste,
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
  const [editingIndex, setEditingIndex] = useState(null)
  const [editText, setEditText] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const fimRef = useRef(null)
  const fileInputRef = useRef(null)
  const attachBtnRef = useRef(null)
  const loadIdRef = useRef(0)
  // Which chatKey is currently on screen. Updated synchronously whenever the
  // matéria changes (see load effect) so an in-flight turn can tell, when its
  // response arrives, whether the user has since switched away.
  const activeChatKeyRef = useRef(chatKey)
  // In-flight turns keyed by their ORIGIN chatKey. The value is the latest
  // optimistic message array for that chat (user msg now, full thread once the
  // answer lands). Presence in the map === "that chat is still loading", which
  // lets us show the spinner only in the chat that actually launched the turn
  // and restore its pending messages if the user switches back mid-stream.
  const inflightRef = useRef(new Map())
  const area = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 })

  const isEmpty = !mensagens.some(m => m.role === 'user')

  /* ── Load chat history when matéria changes ─────────────────── */
  // NOTE: `area` is intentionally NOT in deps — useAutoResizeTextarea returns a
  // fresh object every render, so including it would cause an endless re-fetch
  // loop that constantly clears input + mensagens.
  useEffect(() => {
    if (!perfil || !materia) return
    // Mark this chat as the one on screen *before* any await, so an in-flight
    // turn launched from another matéria knows it must not render here.
    activeChatKeyRef.current = chatKey
    const myLoad = ++loadIdRef.current
    let alive = true
    // If THIS chat has a turn in flight, its optimistic thread (and spinner)
    // win over whatever is in storage — the answer isn't saved there yet.
    const pendente = inflightRef.current.get(chatKey)
    setCarregando(inflightRef.current.has(chatKey))
    if (pendente) {
      setMensagens(pendente)
    } else {
      db.getChat(chatKey).then(historico => {
        // Ignore a late resolution if a newer matéria load — or a user send —
        // already superseded it. Without this, the async getChat on the default
        // (geral) chat could resolve *after* the first message was sent and reset
        // mensagens to [], snapping the UI back to the empty state mid-animation.
        if (!alive || myLoad !== loadIdRef.current) return
        // A turn for this chat may have started while getChat was resolving.
        const p = inflightRef.current.get(chatKey)
        setMensagens(p || (historico?.length ? historico : []))
      }).catch(() => {})
    }
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

  /* ── Import menu (D.5): file picker variants + paste-text ──── */
  function pickFiles(accept) {
    const el = fileInputRef.current
    if (!el) return
    el.accept = accept || ''
    el.click()
    setImportOpen(false)
  }
  function openPaste() {
    setImportOpen(false)
    setPasteText('')
    setPasteOpen(true)
  }
  function confirmPaste() {
    const t = pasteText.trim()
    if (!t) { setPasteOpen(false); return }
    setAttachments(prev => {
      if (prev.length >= 3) return prev
      return [...prev, { id: `${Date.now()}-texto`, name: 'Texto colado', kind: 'text', text: t }]
    })
    setPasteText('')
    setPasteOpen(false)
  }

  // Close the import menu / paste modal on Escape.
  useEffect(() => {
    if (!importOpen && !pasteOpen) return
    function onKey(e) {
      if (e.key === 'Escape') { setImportOpen(false); setPasteOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [importOpen, pasteOpen])

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

  /* ── Core send: streams one assistant turn appended to `base` ──────
     A turn is bound to the chatKey it was launched from (`originKey`). The
     user message and the AI answer are written ONLY to that chat — its React
     state if it's still on screen, otherwise just its storage + the in-flight
     map. This is what stops a turn from leaking into whatever chat happens to
     be active when its response arrives (the bug this hotfix targets). */
  async function sendTurn(texto, base) {
    if (!perfil) return
    // Origin chat: captured now, before any await, so a later matéria switch
    // can't move this turn to a different chat.
    const originKey = chatKey
    const renderIfActive = (msgs) => {
      if (activeChatKeyRef.current === originKey) setMensagens(msgs)
    }
    // Invalidate any in-flight history load so it can't clobber this turn.
    loadIdRef.current++
    const wasEmpty = !base.some(m => m.role === 'user')

    const novaMsg = {
      role: 'user',
      content: texto,
      timestamp: new Date().toISOString(),
    }
    const novas = [...base, novaMsg]
    inflightRef.current.set(originKey, novas)
    renderIfActive(novas)
    if (activeChatKeyRef.current === originKey) setCarregando(true)

    // On the very first user message, collapse the bento so the chat takes over.
    // Only when the origin chat is the one on screen — otherwise we'd collapse
    // the bento of a chat the user is currently looking at.
    if (wasEmpty && activeChatKeyRef.current === originKey) {
      try { window.dispatchEvent(new CustomEvent('bento-collapse')) } catch {}
    }

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body.perfil intentionally omitted — the server loads it from the
        // authenticated session (Supabase auth.getUser). Sending it from the
        // client would be ignored anyway and risks confusing future readers.
        body: JSON.stringify({ mensagens: novas, materia: originKey }),
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
      // Always persist to the origin chat; render only if it's still on screen.
      inflightRef.current.set(originKey, finais)
      db.saveChat(originKey, finais).catch(() => {})
      renderIfActive(finais)

      try {
        const preview = fullText.replace(/[#*`_>\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
        localStorage.setItem('pointai_last_chat', JSON.stringify({
          materia: originKey, ultimaMensagem: preview, timestamp: Date.now(),
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
            materia: originKey === '__geral__' ? 'geral' : originKey,
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
      const erro = {
        role: 'assistant',
        content: 'Desculpa, deu um erro ao responder. Tenta de novo em alguns segundos?',
        timestamp: new Date().toISOString(),
      }
      const comErro = [...novas, erro]
      inflightRef.current.set(originKey, comErro)
      renderIfActive(comErro)
    } finally {
      // Turn finished: drop the loading marker for the origin chat and clear
      // the spinner only if that chat is the one currently on screen.
      inflightRef.current.delete(originKey)
      if (activeChatKeyRef.current === originKey) setCarregando(false)
    }
  }

  /* ── Send from the input box ───────────────────────────────── */
  async function enviar() {
    const texto = input.trim()
    if ((!texto && attachments.length === 0) || carregando || !perfil) return

    // Pasted-text attachments flow into the message; file/image/PDF are still
    // UI stubs until the multimodal API lands (TODO D.5).
    const pastes = attachments.filter(a => a.kind === 'text' && a.text).map(a => a.text)
    const finalTexto = [texto, ...pastes].filter(Boolean).join('\n\n')

    setInput('')
    setAttachments([])
    area.adjustHeight(true)

    await sendTurn(finalTexto || '(anexo)', mensagens)
  }

  /* ── Per-message quick actions (auto-send a new turn) ──────── */
  function quickAction(prompt) {
    if (carregando || !perfil || editingIndex != null) return
    sendTurn(prompt, mensagens)
  }

  /* ── Edit & resend a user message (truncate + regenerate) ──── */
  function startEdit(index, content) {
    setEditingIndex(index)
    setEditText(content)
  }
  function cancelEdit() {
    setEditingIndex(null)
    setEditText('')
  }
  async function confirmEdit(index) {
    const texto = editText.trim()
    if (!texto || carregando) return
    const base = mensagens.slice(0, index)
    setEditingIndex(null)
    setEditText('')
    await sendTurn(texto, base)
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
              <Message
                key={i}
                msg={m}
                index={i}
                reduce={reduce}
                carregando={carregando}
                onQuick={quickAction}
                editing={editingIndex === i}
                editText={editText}
                onEditChange={e => setEditText(e.target.value)}
                onEditConfirm={() => confirmEdit(i)}
                onEditCancel={cancelEdit}
                onStartEdit={startEdit}
              />
            ))}
            {carregando && <ThinkingDots />}
            <div ref={fimRef} />
          </div>
        )}
      </div>

      {/* Input card — single persistent element; slides center→dock via layout */}
      <div className="v0-input-shell">
        <motion.div
          layout={reduce ? false : 'position'}
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
            attachBtnRef={attachBtnRef}
            importOpen={importOpen}
            onToggleImport={() => setImportOpen(o => !o)}
            onSubmit={enviar}
            carregando={carregando}
            canSend={canSend}
            attachLocked={attachments.length >= 3}
          />
        </motion.div>
      </div>

      {/* Import menu (portal) + paste-text modal */}
      <ImportMenu
        open={importOpen}
        anchorRef={attachBtnRef}
        reduce={reduce}
        onClose={() => setImportOpen(false)}
        onPickFile={() => pickFiles('')}
        onPickImage={() => pickFiles('image/*')}
        onPickPdf={() => pickFiles('application/pdf')}
        onPasteText={openPaste}
      />
      <PasteModal
        open={pasteOpen}
        value={pasteText}
        reduce={reduce}
        onChange={e => setPasteText(e.target.value)}
        onConfirm={confirmPaste}
        onClose={() => setPasteOpen(false)}
      />

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
                : a.kind === 'text'
                  ? <ClipboardPaste size={12} strokeWidth={1.8} />
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

function InputFooter({ attachBtnRef, importOpen, onToggleImport, onSubmit, carregando, canSend, attachLocked }) {
  return (
    <div className="v0-input-footer">
      <button
        ref={attachBtnRef}
        type="button"
        onClick={onToggleImport}
        className={`v0-attach-btn ${importOpen ? 'is-open' : ''}`}
        aria-label="Adicionar conteúdo"
        aria-haspopup="menu"
        aria-expanded={importOpen}
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

/* ─── Import menu (popover ↑ desktop / bottom-sheet ↓ mobile) ──── */
function ImportMenu({ open, anchorRef, reduce, onClose, onPickFile, onPickImage, onPickPdf, onPasteText }) {
  const [mounted, setMounted] = useState(false)
  // undefined ⇒ not measured yet · null ⇒ bottom-sheet · {…} ⇒ desktop popover
  const [pos, setPos] = useState(undefined)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) { setPos(undefined); return }
    function place() {
      const sheet = window.innerWidth <= 767
      const el = anchorRef?.current
      if (sheet || !el) { setPos(null); return }
      const r = el.getBoundingClientRect()
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 10 })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, anchorRef])

  if (!mounted) return null

  const measured = pos !== undefined
  const isSheet = pos === null
  const items = [
    { Icon: FileIcon,       label: 'Arquivo do computador', sub: 'Documentos, .txt e outros', onClick: onPickFile },
    { Icon: ImageIcon,      label: 'Foto / Imagem',         sub: 'Galeria ou câmera',          onClick: onPickImage },
    { Icon: FileText,       label: 'PDF',                   sub: 'Anexar um arquivo PDF',      onClick: onPickPdf },
    { Icon: ClipboardPaste, label: 'Colar texto',           sub: 'Cole um conteúdo longo',     onClick: onPasteText },
  ]

  return createPortal(
    <AnimatePresence>
      {open && measured && (
        <>
          <motion.div
            key="import-backdrop"
            className={`v0-import-backdrop ${isSheet ? 'is-sheet' : ''}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            key="import-menu"
            className={`v0-import-menu ${isSheet ? 'is-sheet' : ''}`}
            role="menu"
            aria-label="Adicionar conteúdo"
            style={pos ? { left: pos.left, bottom: pos.bottom } : undefined}
            initial={reduce ? { opacity: 0 } : (isSheet ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.9, y: 8 })}
            animate={reduce ? { opacity: 1 } : (isSheet ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 })}
            exit={reduce ? { opacity: 0 } : (isSheet ? { opacity: 0, y: '100%', transition: { duration: 0.2 } } : { opacity: 0, scale: 0.95, y: 6, transition: { duration: 0.12 } })}
            transition={isSheet ? { type: 'spring', stiffness: 380, damping: 36 } : { type: 'spring', stiffness: 420, damping: 30, mass: 0.6 }}
          >
            {isSheet && <div className="v0-import-grip" aria-hidden />}
            {items.map((it, i) => (
              <ImportItem key={it.label} {...it} index={i} reduce={reduce} />
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ImportItem({ Icon, label, sub, onClick, index, reduce }) {
  return (
    <motion.button
      type="button"
      role="menuitem"
      className="v0-import-item"
      onClick={onClick}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 + index * 0.05, duration: 0.2, ease: EASE }}
    >
      <span className="v0-import-icon"><Icon size={17} strokeWidth={1.8} /></span>
      <span className="v0-import-text">
        <span className="v0-import-label">{label}</span>
        <span className="v0-import-sub">{sub}</span>
      </span>
    </motion.button>
  )
}

/* ─── Paste-text modal ─────────────────────────────────────────── */
function PasteModal({ open, value, reduce, onChange, onConfirm, onClose }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="paste-backdrop"
          className="v0-paste-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="v0-paste-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Colar texto"
            onClick={e => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
          >
            <div className="v0-paste-head">
              <span className="v0-paste-title"><ClipboardPaste size={15} strokeWidth={1.9} /> Colar texto</span>
              <button type="button" className="v0-paste-close" onClick={onClose} aria-label="Fechar">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <textarea
              className="v0-paste-textarea"
              value={value}
              onChange={onChange}
              autoFocus
              placeholder="Cole aqui o conteúdo que quer anexar à conversa…"
              aria-label="Conteúdo para colar"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onConfirm() }
              }}
            />
            <div className="v0-paste-foot">
              <span className="v0-paste-hint">{value.trim().length} caracteres</span>
              <div className="v0-paste-actions">
                <button type="button" className="v0-edit-cancel" onClick={onClose}>Cancelar</button>
                <button type="button" className="v0-edit-save" onClick={onConfirm} disabled={!value.trim()}>Anexar</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Message({
  msg, index, reduce, carregando, onQuick,
  editing, editText, onEditChange, onEditConfirm, onEditCancel, onStartEdit,
}) {
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
        {isAi ? (
          <>
            <div className="v0-bubble ai">
              <RichMessage content={msg.content} />
            </div>
            <div className="v0-actions" role="group" aria-label="Ações da resposta">
              <ActionBtn Icon={Maximize2} label="Aprofundar" disabled={carregando}
                onClick={() => onQuick('Aprofunde a resposta anterior.')} />
              <ActionBtn Icon={AlignLeft} label="Resumir" disabled={carregando}
                onClick={() => onQuick('Resuma a resposta anterior em tópicos.')} />
              <ActionBtn Icon={Sparkles} label="Explicar mais simples" disabled={carregando}
                onClick={() => onQuick('Explique de forma mais simples.')} />
              <CopyBtn text={msg.content} />
            </div>
          </>
        ) : editing ? (
          <div className="v0-edit-box">
            <textarea
              className="v0-edit-textarea"
              value={editText}
              onChange={onEditChange}
              autoFocus
              rows={2}
              aria-label="Editar mensagem"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditConfirm() }
                if (e.key === 'Escape') { e.preventDefault(); onEditCancel() }
              }}
            />
            <div className="v0-edit-bar">
              <button type="button" className="v0-edit-cancel" onClick={onEditCancel}>Cancelar</button>
              <button type="button" className="v0-edit-save" onClick={onEditConfirm} disabled={!editText.trim()}>
                Reenviar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="v0-bubble user">{msg.content}</div>
            <div className="v0-actions" role="group" aria-label="Ações da mensagem">
              <ActionBtn Icon={Pencil} label="Editar e reenviar" disabled={carregando}
                onClick={() => onStartEdit(index, msg.content)} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

function ActionBtn({ Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      className="v0-action-btn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon size={14} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copiar() {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }
  return (
    <button
      type="button"
      className={`v0-action-btn ${copied ? 'is-copied' : ''}`}
      onClick={copiar}
      title="Copiar"
      aria-label="Copiar resposta"
    >
      {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={1.9} />}
      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
    </button>
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
  .v0-history{flex:1;overflow-y:auto;padding:24px 24px 8px;display:flex;flex-direction:column;gap:16px;min-height:0;max-width:1280px;width:100%;margin:0 auto}
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
  /* AI message is borderless (ChatGPT/Claude style) so wide blocks can fill the
     whole canvas column without leaving an empty card to the right of short text. */
  .v0-bubble.ai{background:none;border:none;border-radius:0;padding:0;color:#e4e4e7;width:100%}
  .v0-bubble.user{background:#1a7a4a;color:#fff;border-radius:14px 14px 4px 14px;white-space:pre-wrap;max-width:min(640px,82%)}

  /* ── Adaptive widths ──────────────────────────────────────────────
     Text stays in a ~720px reading column; blocks that need room break out
     to the full width of the conversation canvas (up to .v0-history's cap).
     Lists are normally text-width, but a list that CONTAINS a code block
     (e.g. programming exercises) breaks out together with its snippets. */
  .v0-bubble.ai > *{max-width:720px}
  .v0-bubble.ai > .chat-code-block,
  .v0-bubble.ai > .chat-table-wrap,
  .v0-bubble.ai > .chat-chart-block,
  .v0-bubble.ai > .svg-block,
  .v0-bubble.ai > pre,
  .v0-bubble.ai > img,
  .v0-bubble.ai > ul:has(.chat-code-block),
  .v0-bubble.ai > ol:has(.chat-code-block),
  .v0-bubble.ai > ul:has(pre),
  .v0-bubble.ai > ol:has(pre),
  .v0-bubble.ai > ul:has(.chat-table-wrap),
  .v0-bubble.ai > ol:has(.chat-table-wrap){max-width:100%;width:100%}

  /* ── Per-message actions ── */
  .v0-actions{display:flex;flex-wrap:wrap;align-items:center;gap:2px;margin-top:5px;min-height:26px}
  .v0-msg.user .v0-actions{justify-content:flex-end}
  .v0-action-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;background:none;border:none;border-radius:7px;font-family:inherit;font-size:11.5px;font-weight:500;color:rgba(255,255,255,.38);cursor:pointer;opacity:0;transform:translateY(3px);transition:opacity .22s ease,transform .22s ease,color .15s,background .15s}
  .v0-msg:hover .v0-action-btn,.v0-msg:focus-within .v0-action-btn{opacity:1;transform:none}
  .v0-msg:hover .v0-action-btn:nth-child(2){transition-delay:.04s}
  .v0-msg:hover .v0-action-btn:nth-child(3){transition-delay:.08s}
  .v0-msg:hover .v0-action-btn:nth-child(4){transition-delay:.12s}
  .v0-action-btn:hover:not(:disabled){color:#22c55e;background:rgba(34,197,94,.08)}
  .v0-action-btn svg{flex-shrink:0}
  .v0-msg:hover .v0-action-btn:disabled{opacity:.4;cursor:not-allowed;color:rgba(255,255,255,.3)}
  .v0-action-btn.is-copied{opacity:1;transform:none;color:#22c55e}

  /* ── Edit & resend ── */
  .v0-edit-box{width:min(560px,92%);display:flex;flex-direction:column;gap:8px}
  .v0-edit-textarea{width:100%;background:rgba(26,122,74,.14);border:1px solid rgba(34,197,94,.4);border-radius:14px;color:#fff;font-family:inherit;font-size:13.5px;line-height:1.55;padding:10px 14px;resize:vertical;outline:none}
  .v0-edit-textarea:focus{border-color:rgba(34,197,94,.7);box-shadow:0 0 0 3px rgba(34,197,94,.1)}
  .v0-edit-bar{display:flex;gap:8px;justify-content:flex-end}
  .v0-edit-cancel,.v0-edit-save{font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;border-radius:9px;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
  .v0-edit-cancel{background:none;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.55)}
  .v0-edit-cancel:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.9)}
  .v0-edit-save{background:#1a7a4a;border:1px solid #1a7a4a;color:#fff}
  .v0-edit-save:hover:not(:disabled){background:#155f3a}
  .v0-edit-save:disabled{opacity:.5;cursor:not-allowed}

  /* ── Attach button open state ── */
  .v0-attach-btn.is-open{color:#22c55e;background:rgba(34,197,94,.10)}

  /* ── Import menu (popover / sheet) ── */
  .v0-import-backdrop{position:fixed;inset:0;z-index:150;background:transparent}
  .v0-import-backdrop.is-sheet{background:rgba(0,0,0,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
  .v0-import-menu{position:fixed;z-index:160;width:268px;background:#121212;border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:6px;box-shadow:0 24px 60px rgba(0,0,0,.55);transform-origin:bottom left;display:flex;flex-direction:column;gap:2px}
  .v0-import-menu.is-sheet{left:0 !important;right:0 !important;bottom:0 !important;width:auto;border-radius:18px 18px 0 0;padding:8px 10px calc(14px + env(safe-area-inset-bottom, 0px));box-shadow:0 -20px 60px rgba(0,0,0,.5)}
  .v0-import-grip{width:38px;height:4px;border-radius:99px;background:rgba(255,255,255,.18);margin:4px auto 8px}
  .v0-import-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px;background:none;border:none;border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;transition:background .14s}
  .v0-import-item:hover{background:rgba(34,197,94,.10)}
  .v0-import-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.6);flex-shrink:0;transition:color .14s,background .14s,border-color .14s}
  .v0-import-item:hover .v0-import-icon{color:#22c55e;background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.3)}
  .v0-import-text{display:flex;flex-direction:column;gap:1px;min-width:0}
  .v0-import-label{font-size:13px;font-weight:600;color:#e4e4e7;letter-spacing:-.01em}
  .v0-import-sub{font-size:11px;color:rgba(255,255,255,.4);line-height:1.3}

  /* ── Paste-text modal ── */
  .v0-paste-backdrop{position:fixed;inset:0;z-index:170;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px}
  .v0-paste-modal{width:100%;max-width:540px;background:#101010;border:1px solid rgba(255,255,255,.1);border-radius:18px;box-shadow:0 40px 100px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
  .v0-paste-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06)}
  .v0-paste-title{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:#f4f4f5}
  .v0-paste-title svg{color:#22c55e}
  .v0-paste-close{background:none;border:none;color:rgba(255,255,255,.45);cursor:pointer;display:inline-flex;padding:4px;border-radius:7px;transition:color .15s,background .15s}
  .v0-paste-close:hover{color:#fff;background:rgba(255,255,255,.06)}
  .v0-paste-textarea{width:100%;min-height:200px;max-height:50vh;background:transparent;border:none;outline:none;resize:vertical;font-family:inherit;font-size:14px;line-height:1.6;color:rgba(255,255,255,.9);padding:16px}
  .v0-paste-textarea::placeholder{color:rgba(255,255,255,.25)}
  .v0-paste-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.06)}
  .v0-paste-hint{font-size:11.5px;color:rgba(255,255,255,.35)}
  .v0-paste-actions{display:flex;gap:8px}

  /* ── Thinking + spinner ── */
  .v0-thinking{display:inline-flex;gap:4px;padding:14px;align-items:center}
  .v0-thinking span{display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.4);animation:v0Dot 1.1s ease-in-out infinite both}
  .v0-thinking span:nth-child(2){animation-delay:.16s}
  .v0-thinking span:nth-child(3){animation-delay:.32s}
  @keyframes v0Dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
  .v0-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:v0Spin .8s linear infinite}
  @keyframes v0Spin{to{transform:rotate(360deg)}}

  /* ── Reduced motion: actions always visible, no movement ── */
  @media (prefers-reduced-motion: reduce){
    .v0-action-btn{opacity:1;transform:none;transition:color .15s,background .15s;transition-delay:0s !important}
  }

  /* ── Touch devices: no hover, so keep actions always visible ── */
  @media (hover: none){
    .v0-action-btn{opacity:1;transform:none;transition-delay:0s !important}
  }

  /* ── Responsive: full-width messages, always-visible actions ── */
  @media (max-width: 1023px){
    .v0-bubble.ai > *{max-width:100%}
    .v0-action-btn{opacity:1;transform:none;transition-delay:0s !important}
  }
  @media (max-width: 768px){
    .is-empty .v0-canvas{padding:8px 16px 0}
    .v0-headline-gradient{font-size:clamp(22px, 5vw, 28px)}
    .is-empty .v0-input-shell,.v0-chips-shell{padding:0 16px}
    .is-active .v0-input-shell{padding:8px 14px calc(14px + env(safe-area-inset-bottom, 0px))}
    .v0-history{padding:16px 16px 8px}
    .v0-import-item{padding:13px 12px}
    .v0-import-icon{width:38px;height:38px}
    .v0-import-label{font-size:14px}
    .v0-paste-backdrop{padding:0;align-items:flex-end}
    .v0-paste-modal{max-width:none;border-radius:18px 18px 0 0;border-bottom:none}
    .v0-paste-textarea{min-height:160px}
  }
`
