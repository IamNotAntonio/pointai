'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const perguntas = [
  { id: 'nome', texto: 'Olá! Eu sou o Point, seu assistente acadêmico pessoal. Antes de começar, qual é o seu nome?', placeholder: 'Digite seu nome...' },
  { id: 'curso', texto: (r) => `Que ótimo te conhecer, ${r.nome}! Qual curso você faz?`, placeholder: 'Ex: Medicina, Engenharia, Direito...' },
  { id: 'universidade', texto: (r) => `Incrível! E em qual universidade você estuda?`, placeholder: 'Ex: USP, UNICAMP, UFMG...' },
  { id: 'semestre', texto: (r) => `Legal! Você está em qual semestre?`, placeholder: 'Ex: 3º semestre' },
  { id: 'materias', texto: (r) => `Quais matérias você está tendo esse semestre? Separa por vírgula.`, placeholder: 'Ex: Anatomia, Bioquímica, Fisiologia...' },
  { id: 'objetivo', texto: (r) => `E qual é o seu principal objetivo agora?`, placeholder: 'Ex: Passar em todas, melhorar minha média, não reprovar em Cálculo...' },
]

export default function Onboarding() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [input, setInput] = useState('')

  const perguntaAtual = perguntas[etapa]
  const texto = typeof perguntaAtual.texto === 'function' 
    ? perguntaAtual.texto(respostas) 
    : perguntaAtual.texto

  function avancar() {
    if (!input.trim()) return
    const novasRespostas = { ...respostas, [perguntaAtual.id]: input }
    setRespostas(novasRespostas)
    setInput('')

    if (etapa < perguntas.length - 1) {
      setEtapa(etapa + 1)
    } else {
      localStorage.setItem('pointai_perfil', JSON.stringify(novasRespostas))
      router.push('/dashboard')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') avancar()
  }

  const progresso = ((etapa) / perguntas.length) * 100

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        
        {/* Logo */}
        <div className="text-center mb-12">
          <span className="text-green-600 font-extrabold text-2xl">Point.AI</span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-10">
          <div 
            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Pergunta */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">
              P
            </div>
            <p className="text-gray-800 text-lg leading-relaxed">{texto}</p>
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={perguntaAtual.placeholder}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
          />
          <button
            onClick={avancar}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition"
          >
            →
          </button>
        </div>

        <p className="text-gray-400 text-sm mt-3 text-center">
          Pressione Enter para continuar
        </p>

      </div>
    </div>
  )
}