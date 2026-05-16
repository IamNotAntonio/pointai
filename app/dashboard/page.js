'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import UpgradeModal from '../components/UpgradeModal'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { getPlanInfo, incrementarMensagem } from '../lib/plano'

/* ── Constants ──────────────────────────────────────────────────── */
const PDF_REGEX = /\b(pdf|baixar|exportar|download|quero\s+baixar|gera.*pdf|exporta.*pdf|salvar\s+isso|salvar\s+resposta)\b/i

const QUICK_CHIPS = [
  'Me explica o conteúdo desta matéria',
  'Cria um simulado com 5 questões',
  'Quais são os tópicos mais cobrados?',
  'Resumo dos principais conceitos',
]

/* ── Helpers ────────────────────────────────────────────────────── */
function tempoRelativo(iso) {
  if (!iso) return ''
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 1)  return 'agora'
    if (min < 60) return `há ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24)   return `há ${h}h`
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

function dataDia(iso) {
  if (!iso) return null
  try {
    const d    = new Date(iso)
    const hoje = new Date()
    if (d.toDateString() === hoje.toDateString()) return 'Hoje'
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)
    if (d.toDateString() === ontem.toDateString()) return 'Ontem'
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  } catch { return null }
}

function mesmosDia(a, b) {
  if (!a || !b) return false
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/```[\w]*\n?/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\|[^\n]*\|/g, match => match.replace(/\|/g, ' ').trim())
    .replace(/^\s*[-*]\s/gm, '• ')
    .trim()
}

/* ── Icons ──────────────────────────────────────────────────────── */
function IcCamera() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
function IcMic() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}
function IcX() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IcRetry() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.76"/>
    </svg>
  )
}
function IcCopy() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}
function IcShare() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}
function IcExpand() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  )
}

/* ── Component ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const [perfil,        setPerfil]        = useState(null)
  const [materias,      setMaterias]      = useState([])
  const [materiaAtiva,  setMateriaAtiva]  = useState(null)
  const [topicos,       setTopicos]       = useState({})
  const [topicoAtivo,   setTopicoAtivo]   = useState(null)
  const [mensagens,     setMensagens]     = useState([])
  const [input,         setInput]         = useState('')
  const [carregando,    setCarregando]    = useState(false)
  const [imagem,        setImagem]        = useState(null)
  const [planInfo,      setPlanInfo]      = useState({ plano: 'gratis', mensagensHoje: 0, limite: 20 })
  const [showUpgrade,   setShowUpgrade]   = useState(false)
  const [resumo,        setResumo]        = useState(null)
  const [copiedIdx,     setCopiedIdx]     = useState(null)
  const [shareContent,  setShareContent]  = useState(null)
  const [gravando,      setGravando]      = useState(false)
  const [vozDisp,       setVozDisp]       = useState(false)

  const fimChat       = useRef(null)
  const textareaRef   = useRef(null)
  const fileInputRef  = useRef(null)
  const recognitionRef = useRef(null)
  const resumoRef     = useRef(resumo)

  // Keep resumo ref in sync for use inside async stream function
  useEffect(() => { resumoRef.current = resumo }, [resumo])

  const chatKey = db.getChatKey(materiaAtiva, topicoAtivo)

  useEffect(() => {
    async function carregarPerfil() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        const lista = p.materias.split(',').map(m => m.trim()).filter(Boolean)
        setMaterias(lista)
        setMateriaAtiva(lista[0])
      }
    }
    carregarPerfil()
    setTopicos(db.getTopicos())
    setPlanInfo(getPlanInfo())
    setVozDisp(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  }, [])

  useEffect(() => {
    if (!materiaAtiva) return
    try {
      const acc = JSON.parse(localStorage.getItem('pointai_last_access') || '{}')
      acc[materiaAtiva] = Date.now()
      localStorage.setItem('pointai_last_access', JSON.stringify(acc))
    } catch {}
  }, [materiaAtiva])

  useEffect(() => {
    if (!chatKey || !perfil) return
    async function carregarChat() {
      const [historico, r] = await Promise.all([db.getChat(chatKey), db.getResumo(chatKey)])
      setResumo(r)
      if (historico?.length) {
        setMensagens(historico)
      } else {
        const contexto = topicoAtivo ? `${materiaAtiva} → ${topicoAtivo}` : materiaAtiva
        setMensagens([{
          role: 'assistant',
          content: `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${contexto}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`,
          timestamp: new Date().toISOString(),
        }])
      }
    }
    carregarChat()
  }, [chatKey, perfil])

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  /* ── Streaming core ─────────────────────────────────────────── */
  async function _stream(histMensagens, pdfRequested, imagemEnviada) {
    const body = {
      mensagens: histMensagens,
      perfil,
      materia: materiaAtiva,
      topico: topicoAtivo,
      resumo: resumoRef.current,
    }
    if (imagemEnviada) {
      body.imagemBase64 = imagemEnviada.dataUrl.split(',')[1]
      body.imagemTipo   = imagemEnviada.tipo
    }

    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok || !resp.body) throw new Error('stream failed')

    const reader  = resp.body.getReader()
    const decoder = new TextDecoder()

    // Switch from typing dots to streaming bubble
    setCarregando(false)
    setMensagens(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    let fullText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value, { stream: true })
      setMensagens(prev => {
        const last = prev[prev.length - 1]
        if (!last?.streaming) return prev
        return [...prev.slice(0, -1), { ...last, content: fullText }]
      })
      fimChat.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Replace streaming placeholder with final message
    const finalMsg = {
      role: 'assistant',
      content: fullText,
      hasPdfBtn: pdfRequested,
      timestamp: new Date().toISOString(),
    }
    const finais = [...histMensagens, finalMsg]
    setMensagens(finais)
    db.saveChat(chatKey, finais)

    incrementarMensagem()
    setPlanInfo(getPlanInfo())

    const userCount = finais.filter(m => m.role === 'user').length
    if (userCount > 0 && userCount % 10 === 0) {
      fetch('/api/resumir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: finais.slice(-20), materia: materiaAtiva, perfil }),
      }).then(r => r.json()).then(d => {
        if (d.resumo) { setResumo(d.resumo); db.saveResumo(chatKey, d.resumo) }
      }).catch(() => {})
    }
  }

  /* ── Send message ───────────────────────────────────────────── */
  async function enviar(textoParam) {
    const textoFinal  = typeof textoParam === 'string' ? textoParam : input
    const temConteudo = textoFinal.trim() || imagem
    if (!temConteudo || carregando) return

    const info = getPlanInfo()
    if (info.plano === 'gratis' && info.mensagensHoje >= info.limite) {
      setShowUpgrade(true)
      return
    }

    const pdfRequested  = PDF_REGEX.test(textoFinal)
    const novaMensagem  = {
      role: 'user',
      content: textoFinal,
      timestamp: new Date().toISOString(),
      ...(imagem && { image: imagem.dataUrl }),
    }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const imagemParaEnviar = imagem
    setImagem(null)
    setCarregando(true)

    try {
      await _stream(novasMensagens, pdfRequested, imagemParaEnviar)
    } catch {
      setCarregando(false)
      setMensagens(prev => prev.filter(m => !m.streaming))
    }
  }

  /* ── Retry user message ─────────────────────────────────────── */
  async function retry(msgIndex) {
    if (carregando) return
    const hist = mensagens.slice(0, msgIndex + 1)
    setMensagens(hist)
    setCarregando(true)
    try {
      await _stream(hist, PDF_REGEX.test(mensagens[msgIndex].content), null)
    } catch {
      setCarregando(false)
      setMensagens(prev => prev.filter(m => !m.streaming))
    }
  }

  /* ── Aprofundar ─────────────────────────────────────────────── */
  function aprofundar() {
    enviar('Pode aprofundar mais esse ponto?')
  }

  /* ── Copy response ──────────────────────────────────────────── */
  async function copiar(content, idx) {
    try {
      await navigator.clipboard.writeText(stripMarkdown(content))
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {}
  }

  /* ── Voice dictation ────────────────────────────────────────── */
  function toggleVoz() {
    if (!vozDisp) return
    if (gravando) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = e => {
      const texto = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' : '') + texto)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
      }
    }
    rec.onend  = () => setGravando(false)
    rec.onerror = () => setGravando(false)
    recognitionRef.current = rec
    rec.start()
    setGravando(true)
  }

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagem({ dataUrl: ev.target.result, tipo: file.type })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  function trocarMateria(m) {
    setMateriaAtiva(m); setTopicoAtivo(null); setMensagens([]); setImagem(null)
  }
  function trocarTopico(t) {
    setTopicoAtivo(t); setMensagens([]); setImagem(null)
  }
  function handlePerfilUpdate(novoPerf) {
    setPerfil(novoPerf)
    const lista = novoPerf.materias.split(',').map(m => m.trim()).filter(Boolean)
    setMaterias(lista)
    if (!lista.includes(materiaAtiva)) { setMateriaAtiva(lista[0] || null); setTopicoAtivo(null); setMensagens([]) }
  }
  function handleTopicosUpdate(novosTopicos) { setTopicos(novosTopicos) }

  if (!perfil) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const podeEnviar = !carregando && (input.trim() || imagem)
  const tituloChat = topicoAtivo ? `${materiaAtiva} / ${topicoAtivo}` : materiaAtiva

  return (
    <div className="app-shell">
      <Sidebar
        perfil={perfil}
        materias={materias}
        materiaAtiva={materiaAtiva}
        onMateriaChange={trocarMateria}
        topicos={topicos}
        topicoAtivo={topicoAtivo}
        onTopicoChange={trocarTopico}
        onTopicosUpdate={handleTopicosUpdate}
        onPerfilUpdate={handlePerfilUpdate}
      />

      <div className="page-area">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar">P</div>
          <div>
            <p className="chat-header-title">{tituloChat}</p>
            <p className="chat-header-sub">Point.AI · Assistente acadêmico</p>
          </div>
          <div className="chat-online-wrap">
            <div className="online-dot" />
            <span className="chat-online-label">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-area">
          {mensagens.map((msg, i) => {
            const isUser = msg.role === 'user'
            const prev   = mensagens[i - 1]
            const showDateSep = msg.timestamp && (!prev?.timestamp || !mesmosDia(msg.timestamp, prev.timestamp))

            return (
              <div key={i}>
                {showDateSep && (
                  <div className="date-sep">
                    <span className="date-sep-label">{dataDia(msg.timestamp)}</span>
                  </div>
                )}

                <div className={`chat-bubble-wrap msg-group ${isUser ? 'user' : ''}`}>
                  {!isUser && <div className="chat-avatar">P</div>}

                  <div>
                    {/* Bubble */}
                    <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
                      {isUser ? (
                        <>
                          {msg.image && <img src={msg.image} alt="Imagem enviada" className="chat-bubble-img" />}
                          {msg.content && <span>{msg.content}</span>}
                        </>
                      ) : msg.streaming ? (
                        // Plain text during streaming — avoid re-parsing incomplete markdown
                        <>
                          <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{msg.content}</span>
                          <span className="stream-cursor" aria-hidden="true" />
                        </>
                      ) : (
                        <RichMessage content={msg.content} />
                      )}
                    </div>

                    {/* Timestamp */}
                    {msg.timestamp && (
                      <p className={`chat-msg-time ${isUser ? 'user' : ''}`}>
                        {tempoRelativo(msg.timestamp)}
                      </p>
                    )}

                    {/* PDF button */}
                    {!isUser && msg.hasPdfBtn && !msg.streaming && (
                      <button
                        className="pdf-btn"
                        onClick={() => gerarPDFChat({ conteudo: msg.content, perfil, materia: tituloChat })}
                      >
                        📄 Baixar em PDF
                      </button>
                    )}

                    {/* Hover actions — user messages */}
                    {isUser && !carregando && (
                      <div className="msg-actions user-side">
                        <button
                          className="msg-action-btn"
                          onClick={() => retry(i)}
                          title="Reenviar mensagem"
                        >
                          <IcRetry /> Reenviar
                        </button>
                      </div>
                    )}

                    {/* Hover actions — AI messages */}
                    {!isUser && !msg.streaming && msg.content && (
                      <div className="msg-actions">
                        <button
                          className="msg-action-btn"
                          onClick={aprofundar}
                          title="Aprofundar resposta"
                          disabled={carregando}
                        >
                          <IcExpand /> Aprofundar
                        </button>
                        <button
                          className={`msg-action-btn ${copiedIdx === i ? 'copied' : ''}`}
                          onClick={() => copiar(msg.content, i)}
                          title="Copiar resposta"
                        >
                          <IcCopy />
                          {copiedIdx === i ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          className="msg-action-btn"
                          onClick={() => setShareContent(msg.content)}
                          title="Compartilhar resposta"
                        >
                          <IcShare /> Compartilhar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Quick chips */}
          {mensagens.length === 1 && !carregando && (
            <div className="chat-chips-wrap">
              <div className="chat-chips">
                {QUICK_CHIPS.map(c => (
                  <button key={c} className="chat-chip" onClick={() => enviar(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {carregando && (
            <div className="chat-bubble-wrap">
              <div className="chat-avatar">P</div>
              <div className="chat-bubble assistant" style={{ padding:'4px 6px' }}>
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={fimChat} />
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          {imagem && (
            <div className="chat-img-preview">
              <img src={imagem.dataUrl} alt="Preview" />
              <button className="chat-img-remove" onClick={() => setImagem(null)} aria-label="Remover imagem">
                <IcX />
              </button>
            </div>
          )}

          <div className="chat-input-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={selecionarImagem}
              style={{ display:'none' }}
            />

            {/* Camera */}
            <button
              className={`chat-attach-btn ${imagem ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              title="Enviar foto da prova ou tarefa"
              aria-label="Anexar imagem"
            >
              <IcCamera />
            </button>

            {/* Microphone */}
            {vozDisp && (
              <button
                className={`chat-mic-btn ${gravando ? 'recording' : ''}`}
                onClick={toggleVoz}
                title={gravando ? 'Parar gravação' : 'Ditado por voz'}
                aria-label={gravando ? 'Parar gravação' : 'Ditado por voz'}
              >
                <IcMic />
              </button>
            )}

            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte sobre ${topicoAtivo || materiaAtiva}…`}
              rows={1}
            />

            <button
              className="chat-send-btn"
              onClick={enviar}
              disabled={!podeEnviar}
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>

          <p className="chat-hint">
            Enter para enviar · Shift+Enter para nova linha
            {planInfo.plano === 'gratis' && (
              <span className={`plan-counter ${planInfo.mensagensHoje >= planInfo.limite - 4 ? 'warning' : ''} ${planInfo.mensagensHoje >= planInfo.limite ? 'danger' : ''}`}>
                {' '}· {planInfo.mensagensHoje}/{planInfo.limite} mensagens hoje
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          mensagensHoje={planInfo.mensagensHoje}
          limite={planInfo.limite}
        />
      )}

      {/* Share modal */}
      {shareContent && (
        <div className="share-overlay" onClick={() => setShareContent(null)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <p className="share-modal-title">Compartilhar resposta</p>
              <button className="share-modal-close" onClick={() => setShareContent(null)}>×</button>
            </div>
            <div className="share-modal-body">
              <pre className="share-modal-text">{stripMarkdown(shareContent)}</pre>
            </div>
            <div className="share-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShareContent(null)}>Fechar</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(stripMarkdown(shareContent))
                  setShareContent(null)
                }}
              >
                📋 Copiar para compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
