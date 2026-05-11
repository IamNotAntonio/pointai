'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Evolucao() {
  const [perfil, setPerfil] = useState(null)
  const [dados, setDados] = useState({})
  const [materias, setMaterias] = useState([])
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
    }
    const n = localStorage.getItem('pointai_notas')
    if (n) setDados(JSON.parse(n))
    const e = localStorage.getItem('pointai_eventos')
    if (e) setEventos(JSON.parse(e))
  }, [])

  function calcularMedia(notas) {
    const validas = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
    if (validas.length === 0) return null
    return (validas.reduce((a, b) => a + parseFloat(b), 0) / validas.length).toFixed(1)
  }

  function corMedia(media) {
    if (!media) return 'bg-gray-100 text-gray-400'
    if (media >= 7) return 'bg-green-100 text-green-700'
    if (media >= 5) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  function statusMedia(media) {
    if (!media) return '—'
    if (media >= 7) return 'Aprovado'
    if (media >= 5) return 'Recuperação'
    return 'Reprovado'
  }

  function calcularFaltasRestantes(materia) {
    const d = dados[materia]
    if (!d) return null
    const max = Math.floor(d.totalAulas * 0.25)
    return max - d.faltas
  }

  const proximosEventos = eventos
    .filter(e => {
      const dias = Math.ceil((new Date(e.data + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
      return dias >= 0 && dias <= 14
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const mediaGeral = () => {
    const medias = materias
      .map(m => dados[m] ? calcularMedia(dados[m].notas) : null)
      .filter(Boolean)
      .map(Number)
    if (medias.length === 0) return null
    return (medias.reduce((a, b) => a + b, 0) / medias.length).toFixed(1)
  }

  const materasEmRisco = materias.filter(m => {
    const faltas = calcularFaltasRestantes(m)
    return faltas !== null && faltas <= 3
  })

  const materiasAbaixo = materias.filter(m => {
    const med = dados[m] ? calcularMedia(dados[m].notas) : null
    return med && parseFloat(med) < 7
  })

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
          <Link href="/evolucao" className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition block">📈 Minha Evolução</Link>
          <Link href="/trabalhos" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">📝 Correção de Trabalhos</Link>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-3xl">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">📈 Minha Evolução</h1>
          <p className="text-gray-400 text-sm mb-8">Visão geral do seu desempenho acadêmico</p>

          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 rounded-2xl p-5 text-center">
              <p className="text-4xl font-extrabold text-green-600">{mediaGeral() || '—'}</p>
              <p className="text-green-700 text-sm font-medium mt-1">Média geral</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-5 text-center">
              <p className="text-4xl font-extrabold text-blue-600">{materias.length}</p>
              <p className="text-blue-700 text-sm font-medium mt-1">Matérias</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-5 text-center">
              <p className="text-4xl font-extrabold text-purple-600">{proximosEventos.length}</p>
              <p className="text-purple-700 text-sm font-medium mt-1">Eventos em 14 dias</p>
            </div>
          </div>

          {/* Alertas */}
          {(materasEmRisco.length > 0 || materiasAbaixo.length > 0) && (
            <div className="mb-8 space-y-3">
              {materasEmRisco.map(m => (
                <div key={m} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">🚨</span>
                  <p className="text-red-700 text-sm"><strong>{m}</strong> — Você está próximo do limite de faltas! Restam apenas {calcularFaltasRestantes(m)} faltas.</p>
                </div>
              ))}
              {materiasAbaixo.map(m => (
                <div key={m} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <p className="text-yellow-700 text-sm"><strong>{m}</strong> — Média {calcularMedia(dados[m].notas)} está abaixo de 7.0. Foque nessa matéria!</p>
                </div>
              ))}
            </div>
          )}

          {/* Desempenho por matéria */}
          <div className="mb-8">
            <h2 className="font-bold text-gray-800 mb-4">📚 Desempenho por matéria</h2>
            <div className="space-y-3">
              {materias.map((m, i) => {
                const d = dados[m] || { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
                const media = calcularMedia(d.notas)
                const faltasRestantes = calcularFaltasRestantes(m)
                const porcentagem = media ? (parseFloat(media) / 10) * 100 : 0

                return (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800 text-sm">{m}</span>
                      <div className="flex items-center gap-2">
                        {faltasRestantes !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${faltasRestantes <= 3 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                            {d.faltas} faltas
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${corMedia(media)}`}>
                          {media ? `${media} — ${statusMedia(media)}` : 'Sem notas'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          !media ? 'bg-gray-300' :
                          parseFloat(media) >= 7 ? 'bg-green-500' :
                          parseFloat(media) >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Próximos eventos */}
          {proximosEventos.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-800 mb-4">📅 Próximos 14 dias</h2>
              <div className="space-y-2">
                {proximosEventos.map((e) => {
                  const dias = Math.ceil((new Date(e.data + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <span className="font-medium text-gray-800 text-sm">{e.titulo}</span>
                        <span className="text-gray-400 text-xs ml-2">• {e.materia}</span>
                      </div>
                      <span className={`text-xs font-bold ${dias <= 3 ? 'text-red-600' : dias <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias} dias`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {proximosEventos.length === 0 && materias.every(m => !dados[m] || calcularMedia(dados[m].notas) === null) && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📈</p>
              <p className="font-medium">Nenhum dado ainda</p>
              <p className="text-sm">Adicione notas e eventos para ver sua evolução aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}