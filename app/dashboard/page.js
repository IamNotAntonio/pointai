'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import UpgradeModal from '../components/UpgradeModal'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { getPlanInfo, incrementarMensagem } from '../lib/plano'

const PDF_REGEX = /\b(pdf|baixar|exportar|download|quero\s+baixar|gera.*pdf|exporta.*pdf|salvar\s+isso|salvar\s+resposta)\b/i

const QUICK_CHIPS = [
  'Me explica o conteúdo desta matéria',
  'Cria um simulado com 5 questões',
  'Quais são os tópicos mais cobrados?',
  'Resumo dos principais conceitos',
]

function formatHora(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function IconCamera() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

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

  const fimChat      = useRef(null)
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)

  // Derived chat key — combines materia + topico
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
  }, [])

  // Track last access per materia
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
      const [historico, r] = await Promise.all([
        db.getChat(chatKey),
        db.getResumo(chatKey),
      ])
      setResumo(r)
      if (historico?.length) {
        setMensagens(historico)
      } else {
        const contexto = topicoAtivo ? `${materiaAtiva} → ${topicoAtivo}` : materiaAtiva
        setMensagens([{
          role: 'assistant',
          content: `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${contexto}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`
        }])
      }
    }
    carregarChat()
  }, [chatKey, perfil])

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function salvarHistorico(msgs) {
    await db.saveChat(chatKey, msgs)
  }

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagem({ dataUrl: ev.target.result, tipo: file.type })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function enviar(textoParam) {
    const textoFinal   = typeof textoParam === 'string' ? textoParam : input
    const temConteudo  = textoFinal.trim() || imagem
    if (!temConteudo || carregando) return

    // Enforce daily message limit
    const info = getPlanInfo()
    if (info.plano === 'gratis' && info.mensagensHoje >= info.limite) {
      setShowUpgrade(true)
      return
    }

    const pdfRequested = PDF_REGEX.test(textoFinal)

    const novaMensagem = {
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
      const body = { mensagens: novasMensagens, perfil, materia: materiaAtiva, topico: topicoAtivo, resumo }
      if (imagemParaEnviar) {
        body.imagemBase64 = imagemParaEnviar.dataUrl.split(',')[1]
        body.imagemTipo   = imagemParaEnviar.tipo
      }

      const resp  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const dados = await resp.json()
      const finais = [
        ...novasMensagens,
        { role: 'assistant', content: dados.resposta, hasPdfBtn: pdfRequested },
      ]
      setMensagens(finais)
      salvarHistorico(finais)

      // Update plan counter
      incrementarMensagem()
      setPlanInfo(getPlanInfo())

      // Every 10 user messages, generate a long-memory summary in the background
      const userCount = finais.filter(m => m.role === 'user').length
      if (userCount > 0 && userCount % 10 === 0) {
        fetch('/api/resumir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagens: finais.slice(-20), materia: materiaAtiva, perfil }),
        }).then(r => r.json()).then(d => {
          if (d.resumo) {
            setResumo(d.resumo)
            db.saveResumo(chatKey, d.resumo)
          }
        }).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
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
    setMateriaAtiva(m)
    setTopicoAtivo(null)
    setMensagens([])
    setImagem(null)
  }

  function trocarTopico(t) {
    setTopicoAtivo(t)
    setMensagens([])
    setImagem(null)
  }

  function handlePerfilUpdate(novoPerf) {
    setPerfil(novoPerf)
    const lista = novoPerf.materias.split(',').map(m => m.trim()).filter(Boolean)
    setMaterias(lista)
    if (!lista.includes(materiaAtiva)) {
      setMateriaAtiva(lista[0] || null)
      setTopicoAtivo(null)
      setMensagens([])
    }
  }

  function handleTopicosUpdate(novosTopicos) {
    setTopicos(novosTopicos)
  }

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

        {/* Mensagens */}
        <div className="chat-area">
          {mensagens.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={`chat-bubble-wrap ${isUser ? 'user' : ''}`}>
                {!isUser && <div className="chat-avatar">P</div>}
                <div>
                  <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
                    {isUser ? (
                      <>
                        {msg.image && (
                          <img src={msg.image} alt="Imagem enviada" className="chat-bubble-img" />
                        )}
                        {msg.content && <span>{msg.content}</span>}
                      </>
                    ) : (
                      <RichMessage content={msg.content} />
                    )}
                  </div>
                  {msg.timestamp && (
                    <p className={`chat-msg-time ${isUser ? 'user' : ''}`}>{formatHora(msg.timestamp)}</p>
                  )}
                  {!isUser && msg.hasPdfBtn && (
                    <button
                      className="pdf-btn"
                      onClick={() => gerarPDFChat({ conteudo: msg.content, perfil, materia: tituloChat })}
                    >
                      📄 Baixar em PDF
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {mensagens.length === 1 && !carregando && (
            <div className="chat-chips-wrap">
              <div className="chat-chips">
                {QUICK_CHIPS.map(c => (
                  <button key={c} className="chat-chip" onClick={() => enviar(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}

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

        {/* Input */}
        <div className="chat-input-bar">
          {imagem && (
            <div className="chat-img-preview">
              <img src={imagem.dataUrl} alt="Preview da imagem" />
              <button className="chat-img-remove" onClick={() => setImagem(null)} aria-label="Remover imagem">
                <IconX />
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
            <button
              className={`chat-attach-btn ${imagem ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              title="Enviar foto da prova ou tarefa"
              aria-label="Anexar imagem"
            >
              <IconCamera />
            </button>

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

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          mensagensHoje={planInfo.mensagensHoje}
          limite={planInfo.limite}
        />
      )}
    </div>
  )
}
