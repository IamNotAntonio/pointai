'use client'
import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Sidebar from '../components/Sidebar'

export default function Dashboard() {
  const [perfil, setPerfil] = useState(null)
  const [materias, setMaterias] = useState([])
  const [materiaAtiva, setMateriaAtiva] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimChat = useRef(null)
  const textareaRef = useRef(null)

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
    localStorage.setItem(`chat_${materiaAtiva}`, JSON.stringify(msgs))
  }

  async function enviar() {
    if (!input.trim() || carregando) return
    const novaMensagem = { role: 'user', content: input }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setCarregando(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novasMensagens, perfil, materia: materiaAtiva })
      })
      const dados = await resp.json()
      const finais = [...novasMensagens, { role: 'assistant', content: dados.resposta }]
      setMensagens(finais)
      salvarHistorico(finais)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function handleInput(e) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  function trocarMateria(m) {
    setMateriaAtiva(m)
    setMensagens([])
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  return (
    <div className="app-shell">
      <Sidebar
        perfil={perfil}
        materias={materias}
        materiaAtiva={materiaAtiva}
        onMateriaChange={trocarMateria}
      />

      {/* Chat pane */}
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
                <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
                  {isUser
                    ? msg.content
                    : <ReactMarkdown>{msg.content}</ReactMarkdown>
                  }
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
          <div className="chat-input-row">
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
              disabled={carregando || !input.trim()}
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
