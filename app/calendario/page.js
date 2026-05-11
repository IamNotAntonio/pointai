'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Calendario() {
  const [perfil, setPerfil] = useState(null)
  const [eventos, setEventos] = useState([])
  const [novoEvento, setNovoEvento] = useState({ titulo: '', data: '', tipo: 'prova', materia: '' })
  const [materias, setMaterias] = useState([])

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setNovoEvento(prev => ({ ...prev, materia: lista[0] }))
    }
    const e = localStorage.getItem('pointai_eventos')
    if (e) setEventos(JSON.parse(e))
  }, [])

  function salvarEvento() {
    if (!novoEvento.titulo || !novoEvento.data) return
    const novos = [...eventos, { ...novoEvento, id: Date.now() }]
      .sort((a, b) => new Date(a.data) - new Date(b.data))
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
    setNovoEvento({ titulo: '', data: '', tipo: 'prova', materia: materias[0] })
  }

  function removerEvento(id) {
    const novos = eventos.filter(e => e.id !== id)
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
  }

  function diasRestantes(data) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const evento = new Date(data + 'T00:00:00')
    const diff = Math.ceil((evento - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  function corTipo(tipo) {
    switch (tipo) {
      case 'prova': return 'bg-red-100 text-red-700'
      case 'trabalho': return 'bg-blue-100 text-blue-700'
      case 'apresentacao': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  function corUrgencia(dias) {
    if (dias < 0) return 'border-gray-200 opacity-50'
    if (dias <= 3) return 'border-red-300 bg-red-50'
    if (dias <= 7) return 'border-yellow-300 bg-yellow-50'
    return 'border-gray-200 bg-white'
  }

  const proximos = eventos.filter(e => diasRestantes(e.data) >= 0)
  const passados = eventos.filter(e => diasRestantes(e.data) < 0)

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
          <Link href="/calendario" className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition block px-3 py-2.5 rounded-xl mb-1">📅 Calendário</Link>
          <Link href="/evolucao" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📈 Minha Evolução</Link>
          <Link href="/trabalhos" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📝 Correção de Trabalhos</Link>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">📅 Calendário Acadêmico</h1>
          <p className="text-gray-400 text-sm mb-8">Suas provas, trabalhos e prazos em um só lugar</p>

          {/* Adicionar evento */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-gray-800 mb-4">+ Adicionar evento</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nome do evento"
                value={novoEvento.titulo}
                onChange={(e) => setNovoEvento({ ...novoEvento, titulo: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={novoEvento.data}
                onChange={(e) => setNovoEvento({ ...novoEvento, data: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={novoEvento.tipo}
                onChange={(e) => setNovoEvento({ ...novoEvento, tipo: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="prova">🔴 Prova</option>
                <option value="trabalho">🔵 Trabalho</option>
                <option value="apresentacao">🟣 Apresentação</option>
                <option value="outro">⚪ Outro</option>
              </select>
              <select
                value={novoEvento.materia}
                onChange={(e) => setNovoEvento({ ...novoEvento, materia: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
              </select>
            </div>
            <button
              onClick={salvarEvento}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition"
            >
              Salvar evento
            </button>
          </div>

          {/* Próximos eventos */}
          {proximos.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-gray-800 mb-4">📌 Próximos eventos</h2>
              <div className="space-y-3">
                {proximos.map((evento) => {
                  const dias = diasRestantes(evento.data)
                  return (
                    <div key={evento.id} className={`border rounded-2xl p-4 flex items-center justify-between ${corUrgencia(dias)}`}>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800 text-sm">{evento.titulo}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corTipo(evento.tipo)}`}>
                              {evento.tipo}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs">{evento.materia} • {new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {dias === 0 ? (
                            <span className="text-red-600 font-bold text-sm">Hoje!</span>
                          ) : dias === 1 ? (
                            <span className="text-red-600 font-bold text-sm">Amanhã!</span>
                          ) : (
                            <span className={`font-bold text-sm ${dias <= 7 ? 'text-yellow-600' : 'text-gray-600'}`}>{dias} dias</span>
                          )}
                        </div>
                        <button onClick={() => removerEvento(evento.id)} className="text-gray-300 hover:text-red-400 transition text-lg">×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {proximos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">Nenhum evento próximo</p>
              <p className="text-sm">Adicione suas provas e prazos acima</p>
            </div>
          )}

          {/* Passados */}
          {passados.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-400 mb-4 text-sm">Eventos passados</h2>
              <div className="space-y-2">
                {passados.reverse().map((evento) => (
                  <div key={evento.id} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between opacity-50">
                    <div>
                      <span className="text-sm text-gray-600">{evento.titulo}</span>
                      <span className="text-xs text-gray-400 ml-2">• {evento.materia}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <button onClick={() => removerEvento(evento.id)} className="text-gray-300 hover:text-red-400 transition">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}