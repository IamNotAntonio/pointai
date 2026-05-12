'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import { gerarPDFChat } from '../lib/pdfExport'

const PDF_REGEX = /\b(pdf|baixar|exportar|download|quero\s+baixar|gera.*pdf|exporta.*pdf|salvar\s+isso|salvar\s+resposta)\b/i

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
  const [perfil, setPerfil]             = useState(null)
  const [materias, setMaterias]         = useState([])
  const [materiaAtiva, setMateriaAtiva] = useState(null)
  const [mensagens, setMensagens]       = useState([])
  const [input, setInput]               = useState('')
  const [carregando, setCarregando]     = useState(false)
  const [imagem, setImagem]             = useState(null)

  const fimChat      = useRef(null)
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const dados = localStorage.getItem('pointai_perfil')
    if (dados) {
      const p = JSON.parse(dados)
      setPerfil(p)
      const lista = p.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateriaAtiva(lista[0])
    }
  }, [])

  useEffect(() => {
    if (!materiaAtiva || !perfil) return
    const historico = localStorage.getItem(`chat_${materiaAtiva}`)
    if (historico) {
      setMensagens(JSON.parse(historico))
    } else {
      setMensagens([{
        role: 'assistant',
        content: `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${materiaAtiva}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`
      }])
    }
  }, [materiaAtiva, perfil])

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  function salvarHistorico(msgs) {
    const paraSalvar = msgs.map(({ image, ...m }) => m)
    localStorage.setItem(`chat_${materiaAtiva}`, JSON.stringify(paraSalvar))
  }

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagem({ dataUrl: ev.target.result, tipo: file.type })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function enviar() {
    const temConteudo = input.trim() || imagem
    if (!temConteudo || carregando) return

    const pdfRequested = PDF_REGEX.test(input)

    const novaMensagem = {
      role: 'user',
      content: input,
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
      const body = { mensagens: novasMensagens, perfil, materia: materiaAtiva }
      if (imagemParaEnviar) {
        body.imagemBase64 = imagemParaEnviar.dataUrl.split(',')[1]
        body.imagemTipo   = imagemParaEnviar.tipo
      }

      const resp = await fetch('/api/chat', {
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
    setMensagens([])
    setImagem(null)
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const podaEnviar = !carregando && (input.trim() || imagem)

  return (
    <div className="app-shell">
      <Sidebar
        perfil={perfil}
        materias={materias}
        materiaAtiva={materiaAtiva}
        onMateriaChange={trocarMateria}
      />

      <div className="page-area">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar">P</div>
          <div>
            <p className="chat-header-title">{materiaAtiva}</p>
            <p className="chat-header-sub">Point.AI · Assistente acadêmico</p>
          </div>
          <div className="online-dot" title="Online" />
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
                  {!isUser && msg.hasPdfBtn && (
                    <button
                      className="pdf-btn"
                      onClick={() => gerarPDFChat({ conteudo: msg.content, perfil, materia: materiaAtiva })}
                    >
                      📄 Baixar em PDF
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {carregando && (
            <div className="chat-bubble-wrap">
              <div className="chat-avatar">P</div>
              <div className="chat-bubble assistant" style={{ padding: '4px 6px' }}>
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
              style={{ display: 'none' }}
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
              placeholder={`Pergunte sobre ${materiaAtiva}…`}
              rows={1}
            />

            <button
              className="chat-send-btn"
              onClick={enviar}
              disabled={!podaEnviar}
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>
          <p className="chat-hint">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </div>
    </div>
  )
}
