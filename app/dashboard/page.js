'use client'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect, useRef } from 'react'

export default function Dashboard() {
  const [perfil, setPerfil] = useState(null)
  const [materias, setMaterias] = useState([])
  const [materiaAtiva, setMateriaAtiva] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimChat = useRef(null)

  useEffect(() => {
    const dados = localStorage.getItem('pointai_perfil')
    if (dados) {
      const perfil = JSON.parse(dados)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateriaAtiva(lista[0])
    }
  }, [])

  useEffect(() => {
    if (materiaAtiva && perfil) {
      const historico = localStorage.getItem(`chat_${materiaAtiva}`)
      if (historico) {
        setMensagens(JSON.parse(historico))
      } else {
        setMensagens([{
          role: 'assistant',
          content: `Olá ${perfil.nome}! 👋 Estou aqui para te ajudar com **${materiaAtiva}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`
        }])
      }
    }
  }, [materiaAtiva, perfil])

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  function salvarHistorico(msgs) {
    localStorage.setItem(`chat_${materiaAtiva}`, JSON.stringify(msgs))
  }

  async function enviar() {
    if (!input.trim() || carregando) return

    const novaMensagem = { role: 'user', content: input }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setInput('')
    setCarregando(true)

    try {
      const resposta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: novasMensagens,
          perfil,
          materia: materiaAtiva
        })
      })

      const dados = await resposta.json()
      const mensagensFinais = [...novasMensagens, { role: 'assistant', content: dados.resposta }]
      setMensagens(mensagensFinais)
      salvarHistorico(mensagensFinais)
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

  function trocarMateria(materia) {
    setMateriaAtiva(materia)
    setMensagens([])
  }

  if (!perfil) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  return (
    <div className="flex h-screen bg-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <span className="text-green-600 font-extrabold text-xl">Point.AI</span>
          <p className="text-gray-500 text-sm mt-1">{perfil.nome}</p>
          <p className="text-gray-400 text-xs">{perfil.curso} • {perfil.semestre}</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Minhas Matérias</p>
          {materias.map((m, i) => (
            <button
              key={i}
              onClick={() => trocarMateria(m)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition ${
                materiaAtiva === m
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              📁 {m}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <Link href="/notas" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📊 Notas e Faltas
          </Link>
          <Link href="/calendario" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📅 Calendário
          </Link>
          <Link href="/evolucao" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📈 Minha Evolução
          </Link>
          <Link href="/trabalhos" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📝 Correção de Trabalhos
          </Link>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">P</div>
          <div>
            <p className="font-semibold text-gray-800">{materiaAtiva}</p>
            <p className="text-xs text-gray-400">Point.AI • sempre disponível</p>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {mensagens.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">P</div>
              )}
<div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
  msg.role === 'user'
    ? 'bg-green-600 text-white rounded-tr-sm'
    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
}`}>
    {msg.role === 'user' ? msg.content : (
  <ReactMarkdown>
    {msg.content}
  </ReactMarkdown>
)}
</div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">P</div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={fimChat} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte sobre ${materiaAtiva}...`}
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <button
              onClick={enviar}
              disabled={carregando}
              className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Enter para enviar • Shift+Enter para nova linha</p>
        </div>

      </div>
    </div>
  )
}