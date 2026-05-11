'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function Trabalhos() {
  const [perfil, setPerfil] = useState(null)
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('artigo')
  const [materia, setMateria] = useState('')
  const [materias, setMaterias] = useState([])
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateria(lista[0])
    }
  }, [])

  async function corrigir() {
    if (!texto.trim()) return
    setCarregando(true)
    setResultado(null)

    try {
      const resposta = await fetch('/api/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, tipo, materia, perfil })
      })
      const dados = await resposta.json()
      setResultado(dados.resultado)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  if (!perfil) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>

  return (
    <div className="flex h-screen bg-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <Link href="/dashboard" className="text-green-600 font-extrabold text-xl">Point.AI</Link>
          <p className="text-gray-500 text-sm mt-1">{perfil.nome}</p>
          <p className="text-gray-400 text-xs">{perfil.curso} • {perfil.semestre}</p>
        </div>

        <div className="p-4 flex-1 border-t border-gray-100">
          <Link href="/dashboard" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">💬 Chat</Link>
          <Link href="/notas" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📊 Notas e Faltas</Link>
          <Link href="/calendario" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📅 Calendário</Link>
          <Link href="/evolucao" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📈 Minha Evolução</Link>
          <Link href="/trabalhos" className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition block">📝 Correção de Trabalhos</Link>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-3xl">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">📝 Correção de Trabalhos</h1>
          <p className="text-gray-400 text-sm mb-8">Cole seu texto e receba feedback detalhado com nota estimada</p>

          {/* Configuração */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Tipo de trabalho</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="artigo">Artigo científico</option>
                <option value="resenha">Resenha</option>
                <option value="relatorio">Relatório</option>
                <option value="tcc">TCC / Monografia</option>
                <option value="redacao">Redação</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Matéria</label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Texto */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 font-medium block mb-1">Cole seu texto aqui</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o texto do seu trabalho para receber feedback detalhado..."
              rows={12}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{texto.length} caracteres</p>
          </div>

          <button
            onClick={corrigir}
            disabled={carregando || !texto.trim()}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 mb-8"
          >
            {carregando ? '🔍 Analisando seu trabalho...' : '🔍 Corrigir trabalho'}
          </button>

          {/* Resultado */}
          {resultado && (
  <div className="bg-gray-50 rounded-2xl p-6 text-gray-800">
    <h2 className="font-bold text-gray-800 mb-4">📋 Feedback do Point.AI</h2>
    <div className="prose prose-gray max-w-none text-gray-800 [&>h2]:text-gray-900 [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>p]:text-gray-700 [&>ul]:text-gray-700 [&>ol]:text-gray-700 [&>strong]:text-gray-900">
      <ReactMarkdown>
        {resultado}
      </ReactMarkdown>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  )
}