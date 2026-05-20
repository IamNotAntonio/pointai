'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import RichMessage from '../components/RichMessage'
import UpgradeModal from '../components/UpgradeModal'
import TutorialOverlay from '../components/TutorialOverlay'
import { gerarPDFChat } from '../lib/pdfExport'
import * as db from '../lib/db'
import { getPlanInfo, incrementarMensagem, fetchPlano } from '../lib/plano'
import Link from 'next/link'
import { FileText, Copy, Globe, BookOpen, Calendar, RotateCcw } from 'lucide-react'

/* ── Constants ──────────────────────────────────────────────────── */
const PDF_REGEX = /\b(pdf|baixar|exportar|download|quero\s+baixar|gera.*pdf|exporta.*pdf|salvar\s+isso|salvar\s+resposta)\b/i

const QUICK_CHIPS = [
  'Me explica o conteúdo desta matéria',
  'Cria um simulado com 5 questões',
  'Quais são os tópicos mais cobrados?',
  'Resumo dos principais conceitos',
]

const QUICK_CHIPS_GERAL = [
  'O que estudei recentemente?',
  'Me ajuda a organizar meus estudos',
  'Cria um plano de estudos para a semana',
  'Explica um conceito que estou com dúvida',
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

function formatarData(dataStr) {
  try {
    const [y, m, d] = dataStr.split('-')
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  } catch { return dataStr }
}

function corMedia(nota) {
  const n = parseFloat(nota)
  if (n >= 8.5) return '#4ade80'
  if (n >= 7.0) return '#fbbf24'
  return '#f87171'
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
function IcHeadphone() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  )
}
function IcStop() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
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
  const [vozAtiva,      setVozAtiva]      = useState(false)
  const [falando,       setFalando]       = useState(false)
  const [ehPro,         setEhPro]         = useState(false)
  const [showTutorial,  setShowTutorial]  = useState(false)
  const [resumoMateria,  setResumoMateria]  = useState({ mediaNotas: null, proximoEvento: null })
  const [novoChatConfirm, setNovoChatConfirm] = useState(null)

  const fimChat        = useRef(null)
  const textareaRef    = useRef(null)
  const fileInputRef   = useRef(null)
  const recognitionRef = useRef(null)
  const resumoRef      = useRef(resumo)
  const audioRef       = useRef(null)
  const vozAtivaRef    = useRef(false)

  // Keep refs in sync for use inside async functions
  useEffect(() => { resumoRef.current = resumo }, [resumo])
  useEffect(() => { vozAtivaRef.current = vozAtiva }, [vozAtiva])

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
    fetchPlano().then(plano => setEhPro(plano === 'pro'))

    // Mostrar tutorial na primeira visita
    try {
      if (!localStorage.getItem('pointai_tutorial_done')) {
        setTimeout(() => setShowTutorial(true), 1200)
      }
    } catch {}
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
      const isGeral = materiaAtiva === '__geral__'
      const [historico, r] = await Promise.all([db.getChat(chatKey), db.getResumo(chatKey)])
      setResumo(r)
      if (historico?.length) {
        setMensagens(historico)
      } else {
        const contexto = topicoAtivo ? `${materiaAtiva} → ${topicoAtivo}` : materiaAtiva
        const msg = isGeral
          ? `Olá, **${perfil.nome}**! 👋 Aqui é o Chat Geral — pode me perguntar qualquer coisa sobre seus estudos, sem focar em uma matéria específica. Dúvidas, técnicas de estudo, planejamento... estou aqui!`
          : `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${contexto}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`
        setMensagens([{ role: 'assistant', content: msg, timestamp: new Date().toISOString() }])
      }
    }
    carregarChat()
  }, [chatKey, perfil])

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  /* ── Cross-memory para Chat Geral ──────────────────────────── */
  function buscarHistoricoMaterias(lista) {
    const historico = {}
    for (const m of lista) {
      try {
        const raw = localStorage.getItem(`chat_${m}`)
        if (!raw) continue
        const msgs = JSON.parse(raw)
        if (msgs?.length > 1) {
          // Pega as últimas 6 mensagens (user + assistant) excluindo a boas-vindas
          historico[m] = msgs.slice(1).slice(-6)
        }
      } catch {}
    }
    return Object.keys(historico).length ? historico : null
  }

  /* ── TTS ────────────────────────────────────────────────────── */
  function limparParaTTS(text) {
    return stripMarkdown(text)
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/•\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  function pararAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setFalando(false)
  }

  async function lerTexto(texto) {
    pararAudio()
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: limparParaTTS(texto) }),
      })
      if (!resp.ok) return
      const blob = await resp.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setFalando(true)
      audio.onended = () => { setFalando(false); URL.revokeObjectURL(url); audioRef.current = null }
      audio.onerror = () => { setFalando(false); URL.revokeObjectURL(url); audioRef.current = null }
      audio.play()
    } catch { setFalando(false) }
  }

  /* ── Streaming core ─────────────────────────────────────────── */
  async function _stream(histMensagens, pdfRequested, imagemEnviada) {
    const body = {
      mensagens: histMensagens,
      perfil,
      materia: materiaAtiva,
      topico: topicoAtivo,
      resumo: resumoRef.current,
    }
    // No Chat Geral, incluir histórico das matérias para memória cruzada
    if (isGeralChat && materias.length) {
      body.historicoMaterias = buscarHistoricoMaterias(materias)
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

    // Accumulate silently — typing indicator stays visible throughout
    let fullText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value, { stream: true })
    }

    // Message arrives complete — triggers fade+slide via CSS animation
    setCarregando(false)
    const finalMsg = {
      role: 'assistant',
      content: fullText,
      hasPdfBtn: pdfRequested,
      timestamp: new Date().toISOString(),
    }
    const finais = [...histMensagens, finalMsg]
    setMensagens(finais)
    db.saveChat(chatKey, finais)

    // Auto-read aloud if TTS is active
    if (vozAtivaRef.current) lerTexto(fullText)

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
      // no streaming messages to clean up
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
      // no streaming messages to clean up
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
    setMensagens([])
    setImagem(null)
    setTopicoAtivo(null)
    setMateriaAtiva(m)
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

  function carregarResumoMateria(materia) {
    if (!materia || materia === '__geral__') {
      setResumoMateria({ mediaNotas: null, proximoEvento: null })
      return
    }
    const norm = s => s?.toLowerCase().trim() || ''
    // Notas
    let mediaNotas = null
    try {
      const notas = JSON.parse(localStorage.getItem('pointai_notas') || '[]')
      const mat = notas.find(n =>
        norm(n.nome) === norm(materia) ||
        norm(materia).includes(norm(n.nome)) ||
        norm(n.nome).includes(norm(materia))
      )
      if (mat) {
        const vals = (mat.notas || []).filter(n => n !== '' && !isNaN(parseFloat(n))).map(parseFloat)
        if (vals.length > 0) mediaNotas = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      }
    } catch {}
    // Próximo evento
    let proximoEvento = null
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const eventos = JSON.parse(localStorage.getItem('pointai_eventos') || '[]')
      proximoEvento = eventos
        .filter(e => e.data >= hoje && (
          norm(e.materia) === norm(materia) ||
          norm(materia).includes(norm(e.materia)) ||
          norm(e.materia).includes(norm(materia))
        ))
        .sort((a, b) => a.data.localeCompare(b.data))[0] || null
    } catch {}
    setResumoMateria({ mediaNotas, proximoEvento })
  }

  useEffect(() => { carregarResumoMateria(materiaAtiva) }, [materiaAtiva])

  function novoChat(materia) {
    if (!materia || !perfil) return
    try { localStorage.removeItem(`chat_${materia}`) } catch {}
    if (materia === materiaAtiva && !topicoAtivo) {
      const isGeral = materia === '__geral__'
      const msg = isGeral
        ? `Olá, **${perfil.nome}**! 👋 Aqui é o Chat Geral — pode me perguntar qualquer coisa sobre seus estudos, sem focar em uma matéria específica. Dúvidas, técnicas de estudo, planejamento... estou aqui!`
        : `Olá, **${perfil.nome}**! 👋 Estou aqui para te ajudar com **${materia}**. Pode me perguntar qualquer coisa — dúvidas, exercícios, resumos ou explicações. Por onde quer começar?`
      setMensagens([{ role: 'assistant', content: msg, timestamp: new Date().toISOString() }])
      setResumo(null)
    }
  }

  if (!perfil) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const podeEnviar  = !carregando && (input.trim() || imagem)
  const isGeralChat = materiaAtiva === '__geral__'
  const tituloChat  = isGeralChat
    ? 'Chat Geral'
    : (topicoAtivo ? `${materiaAtiva} / ${topicoAtivo}` : materiaAtiva)

  return (
    <div className="app-shell">
      <style>{`
        @keyframes speakPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.5), 0 2px 8px rgba(34,197,94,.3); }
          50%      { box-shadow: 0 0 0 7px rgba(34,197,94,.0), 0 2px 16px rgba(34,197,94,.5); }
        }
        @keyframes speakRing {
          0%,100% { box-shadow: 0 0 0 2px rgba(34,197,94,.4); }
          50%      { box-shadow: 0 0 0 5px rgba(34,197,94,.0); }
        }
        .avatar-speaking {
          animation: speakPulse 1.1s ease-in-out infinite !important;
        }
        .tts-btn-speaking {
          color: #f87171 !important;
          background: rgba(239,68,68,.12) !important;
          animation: speakRing 1.1s ease-in-out infinite;
        }
        .tts-btn-active {
          color: #22c55e !important;
          background: rgba(34,197,94,.1) !important;
        }
      `}</style>

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
        onNovoChat={m => setNovoChatConfirm(m)}
      />

      <div className="page-area">
        {/* Header */}
        <div className="chat-header">
          <div
            className="chat-header-avatar"
            style={isGeralChat
              ? { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 2px 10px rgba(59,130,246,.32), 0 0 0 1px rgba(96,165,250,.2)' }
              : {}
            }
          >
            {isGeralChat ? <Globe size={16} strokeWidth={2} /> : 'P'}
          </div>
          <div>
            <p className="chat-header-title">{tituloChat}</p>
            <p className="chat-header-sub">Point.AI · {isGeralChat ? 'Chat livre' : 'Especialista acadêmico'}</p>
          </div>
          <div className="chat-header-right">
            {isGeralChat && (
              <button
                className="chat-header-action"
                onClick={() => setNovoChatConfirm('__geral__')}
                title="Novo Chat Geral"
              >
                <RotateCcw size={14} strokeWidth={1.8} />
              </button>
            )}
            {!isGeralChat && (
              <>
                <Link href="/notas" className="chat-header-action" title="Notas desta matéria">
                  <BookOpen size={15} strokeWidth={1.8} />
                </Link>
                <Link href="/calendario" className="chat-header-action" title="Calendário">
                  <Calendar size={15} strokeWidth={1.8} />
                </Link>
              </>
            )}
            <div className="chat-header-sep" />
            <div className="chat-online-wrap">
              <div className="online-dot" />
              <span className="chat-online-label">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-area" data-tour="chat-area">
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

                <div className={`chat-bubble-wrap msg-group ${isUser ? 'user' : ''}`} {...(!isUser && i === 0 ? { 'data-tour': 'msg-bubble-first' } : {})}>
                  {!isUser && (
                    <div className={`chat-avatar${falando && i === mensagens.length - 1 ? ' avatar-speaking' : ''}`}>P</div>
                  )}

                  <div>
                    {/* Bubble */}
                    <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
                      {isUser ? (
                        <>
                          {msg.image && <img src={msg.image} alt="Imagem enviada" className="chat-bubble-img" />}
                          {msg.content && <span>{msg.content}</span>}
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
                        <FileText size={13} strokeWidth={1.8} /> Baixar em PDF
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
                      <div className="msg-actions" {...(i === 0 ? { 'data-tour': 'msg-first' } : {})}>
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

          {/* Welcome panel — cards + chips, shown only with welcome message */}
          {mensagens.length === 1 && !carregando && (
            <div className="chat-welcome-panel">
              {!isGeralChat && (
                <div className="chat-welcome-cards">
                  {/* Card: Média */}
                  <div className="chat-summary-card">
                    <div className="chat-summary-card-icon">
                      <BookOpen size={15} strokeWidth={2} />
                    </div>
                    <div className="chat-summary-card-body">
                      <p className="chat-summary-card-label">Média atual</p>
                      {resumoMateria.mediaNotas != null ? (
                        <p className="chat-summary-card-value" style={{ color: corMedia(resumoMateria.mediaNotas) }}>
                          {resumoMateria.mediaNotas}
                        </p>
                      ) : (
                        <Link href="/notas" className="chat-summary-card-empty">Adicionar notas →</Link>
                      )}
                    </div>
                  </div>
                  {/* Card: Próximo evento */}
                  <div className="chat-summary-card">
                    <div className="chat-summary-card-icon calendar">
                      <Calendar size={15} strokeWidth={2} />
                    </div>
                    <div className="chat-summary-card-body">
                      <p className="chat-summary-card-label">Próximo evento</p>
                      {resumoMateria.proximoEvento ? (
                        <>
                          <p className="chat-summary-card-value sm" title={resumoMateria.proximoEvento.titulo}>
                            {resumoMateria.proximoEvento.titulo}
                          </p>
                          <p className="chat-summary-card-sub">{formatarData(resumoMateria.proximoEvento.data)}</p>
                        </>
                      ) : (
                        <Link href="/calendario" className="chat-summary-card-empty">Ver calendário →</Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="chat-chips-wrap" style={{ padding: '0 0 4px' }}>
                <div className="chat-chips">
                  {(isGeralChat ? QUICK_CHIPS_GERAL : QUICK_CHIPS).map(c => (
                    <button key={c} className="chat-chip" onClick={() => enviar(c)}>{c}</button>
                  ))}
                </div>
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
              data-tour="camera-btn"
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

            {/* TTS toggle / stop — Pro only */}
            {ehPro ? (
              <button
                className={`chat-mic-btn ${falando ? 'tts-btn-speaking' : vozAtiva ? 'tts-btn-active' : ''}`}
                onClick={() => { falando ? pararAudio() : setVozAtiva(v => !v) }}
                title={falando ? 'Parar áudio' : vozAtiva ? 'Desativar leitura em voz alta' : 'Ativar leitura em voz alta'}
                aria-label={falando ? 'Parar áudio' : 'Leitura em voz alta'}
              >
                {falando ? <IcStop /> : <IcHeadphone />}
              </button>
            ) : (
              <button
                className="chat-mic-btn"
                onClick={() => setShowUpgrade(true)}
                title="Funcionalidade exclusiva do plano Pro"
                aria-label="Leitura em voz alta — exclusivo Pro"
                style={{ position: 'relative' }}
              >
                <IcHeadphone />
                <span style={{
                  position: 'absolute', top: 1, right: 1,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="5" height="5" viewBox="0 0 24 24" fill="white">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
            )}

            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isGeralChat ? 'Pergunte qualquer coisa…' : `Pergunte sobre ${topicoAtivo || materiaAtiva}…`}
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

      {/* Tutorial interativo */}
      {showTutorial && (
        <TutorialOverlay onDone={() => setShowTutorial(false)} />
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          mensagensHoje={planInfo.mensagensHoje}
          limite={planInfo.limite}
        />
      )}

      {/* Novo chat confirmation modal */}
      {novoChatConfirm && (
        <div className="sb-overlay" onClick={() => setNovoChatConfirm(null)}>
          <div className="sb-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="sb-modal-header">
              <p className="sb-modal-title">Iniciar novo chat?</p>
              <button className="sb-modal-close" onClick={() => setNovoChatConfirm(null)}>×</button>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 20 }}>
              {novoChatConfirm === '__geral__'
                ? 'O histórico visual do Chat Geral será apagado. As matérias são mantidas para memória da IA.'
                : `Iniciar novo chat em "${novoChatConfirm}"? O histórico atual será apagado.`}
            </p>
            <div className="sb-modal-footer">
              <button className="btn btn-ghost" onClick={() => setNovoChatConfirm(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => { novoChat(novoChatConfirm); setNovoChatConfirm(null) }}
              >
                Iniciar novo chat
              </button>
            </div>
          </div>
        </div>
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
                <Copy size={13} strokeWidth={1.8} /> Copiar para compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
