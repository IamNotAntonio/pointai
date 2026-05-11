'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Notas() {
  const [perfil, setPerfil] = useState(null)
  const [materias, setMaterias] = useState([])
  const [dados, setDados] = useState({})
  const [materiaAtiva, setMateriaAtiva] = useState(null)

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateriaAtiva(lista[0])

      const dadosSalvos = localStorage.getItem('pointai_notas')
      if (dadosSalvos) {
        setDados(JSON.parse(dadosSalvos))
      } else {
        const inicial = {}
        lista.forEach(m => {
          inicial[m] = { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
        })
        setDados(inicial)
      }
    }
  }, [])

  function salvar(novosDados) {
    setDados(novosDados)
    localStorage.setItem('pointai_notas', JSON.stringify(novosDados))
  }

  function atualizarNota(materia, index, valor) {
    const novo = { ...dados }
    novo[materia].notas[index] = valor
    salvar(novo)
  }

  function atualizarFaltas(materia, valor) {
    const novo = { ...dados }
    novo[materia].faltas = parseInt(valor) || 0
    salvar(novo)
  }

  function atualizarTotalAulas(materia, valor) {
    const novo = { ...dados }
    novo[materia].totalAulas = parseInt(valor) || 60
    salvar(novo)
  }

  function calcularMedia(notas) {
    const validas = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
    if (validas.length === 0) return null
    const soma = validas.reduce((acc, n) => acc + parseFloat(n), 0)
    return (soma / validas.length).toFixed(1)
  }

  function calcularFaltasRestantes(materia) {
    const d = dados[materia]
    if (!d) return 0
    const maxFaltas = Math.floor(d.totalAulas * 0.25)
    return maxFaltas - d.faltas
  }

  function statusMedia(media) {
    if (media === null) return null
    if (media >= 7) return { texto: 'Aprovado', cor: 'text-green-600 bg-green-50' }
    if (media >= 5) return { texto: 'Recuperação', cor: 'text-yellow-600 bg-yellow-50' }
    return { texto: 'Reprovado', cor: 'text-red-600 bg-red-50' }
  }

  function statusFaltas(materia) {
    const restantes = calcularFaltasRestantes(materia)
    if (restantes > 5) return { texto: `${restantes} faltas restantes`, cor: 'text-green-600' }
    if (restantes > 0) return { texto: `⚠️ Apenas ${restantes} faltas restantes!`, cor: 'text-yellow-600' }
    return { texto: '🚨 Limite de faltas atingido!', cor: 'text-red-600' }
  }

  if (!perfil) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>

  const dadosMateria = dados[materiaAtiva] || { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
  const media = calcularMedia(dadosMateria.notas)
  const status = statusMedia(media)
  const statusF = materiaAtiva ? statusFaltas(materiaAtiva) : null

  return (
    <div className="flex h-screen bg-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <Link href="/dashboard" className="text-green-600 font-extrabold text-xl">Point.AI</Link>
          <p className="text-gray-500 text-sm mt-1">{perfil.nome}</p>
          <p className="text-gray-400 text-xs">{perfil.curso} • {perfil.semestre}</p>
        </div>

        <div className="p-4 flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Minhas Matérias</p>
          {materias.map((m, i) => {
            const d = dados[m] || { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
            const med = calcularMedia(d.notas)
            return (
              <button
                key={i}
                onClick={() => setMateriaAtiva(m)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition ${
                  materiaAtiva === m ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>📁 {m}</span>
                  {med && <span className={`text-xs font-bold ${materiaAtiva === m ? 'text-white' : med >= 7 ? 'text-green-600' : med >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>{med}</span>}
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-100">
          <Link href="/dashboard" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            💬 Chat
          </Link>
          <Link href="/calendario" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📅 Calendário
          </Link>
          <Link href="/evolucao" className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-200 transition block">
            📈 Minha Evolução
          </Link>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">📊 Notas e Faltas</h1>
          <p className="text-gray-400 text-sm mb-8">Acompanhe seu desempenho em {materiaAtiva}</p>

          {/* Status cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900">{media || '—'}</p>
              <p className="text-gray-400 text-xs mt-1">Média atual</p>
              {status && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${status.cor}`}>{status.texto}</span>}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900">{dadosMateria.faltas}</p>
              <p className="text-gray-400 text-xs mt-1">Faltas usadas</p>
              {statusF && <p className={`text-xs font-semibold mt-2 ${statusF.cor}`}>{statusF.texto}</p>}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900">{Math.floor(dadosMateria.totalAulas * 0.25)}</p>
              <p className="text-gray-400 text-xs mt-1">Máximo de faltas</p>
              <p className="text-gray-400 text-xs">25% de {dadosMateria.totalAulas} aulas</p>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-4">
            <h2 className="font-bold text-gray-800 mb-4">📝 Suas notas</h2>
            <div className="grid grid-cols-3 gap-4">
              {dadosMateria.notas.map((nota, i) => (
                <div key={i}>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Avaliação {i + 1}</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={nota}
                    onChange={(e) => atualizarNota(materiaAtiva, i, e.target.value)}
                    placeholder="0.0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Faltas */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-4">
            <h2 className="font-bold text-gray-800 mb-4">📅 Controle de faltas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Total de aulas no semestre</label>
                <input
                  type="number"
                  value={dadosMateria.totalAulas}
                  onChange={(e) => atualizarTotalAulas(materiaAtiva, e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Faltas até agora</label>
                <input
                  type="number"
                  value={dadosMateria.faltas}
                  onChange={(e) => atualizarFaltas(materiaAtiva, e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* O que precisa na próxima prova */}
          {media && parseFloat(media) < 7 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h2 className="font-bold text-yellow-800 mb-2">🎯 O que você precisa</h2>
              <p className="text-yellow-700 text-sm">
                Para atingir média 7.0, você precisa tirar pelo menos{' '}
                <strong>{Math.max(0, (7 * dadosMateria.notas.length - dadosMateria.notas.filter(n => n !== '').reduce((a, b) => a + parseFloat(b || 0), 0))).toFixed(1)}</strong>{' '}
                na próxima avaliação.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}