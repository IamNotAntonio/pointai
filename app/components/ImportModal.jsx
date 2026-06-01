'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Upload, FileText, Calendar, X, Loader2, Check, AlertTriangle,
  ChevronDown, Trash2, FileWarning, Plus, HelpCircle,
  Image as ImageIcon, FileText as FileTextIcon,
} from 'lucide-react'
import * as db from '../lib/db'
import { getSupabaseBrowser } from '../lib/supabase-browser'
import { useProfile } from '../lib/ProfileContext'

const EASE = [0.22, 1, 0.36, 1]
const MAX_STAGED = 10
const MAX_BYTES = 5 * 1024 * 1024
// Defaults ao criar uma matéria nova via import (modelo novo).
const TOTAL_AULAS_PADRAO = 60
const MEDIA_APROVACAO_PADRAO = 7

const ERROS = {
  'too-large': 'Cada arquivo precisa ter no máximo 5 MB. Tente recortar o print ou reduzir o PDF.',
  'too-many': 'Máximo de 10 arquivos por importação. Divida em importações menores.',
  'bad-type': 'Tipo de arquivo não suportado. Envie imagens (PNG/JPG/WEBP) ou PDF.',
  'no-grades': 'Não encontramos notas nestas imagens. Confira se a tela de notas está visível no print, ou tente um print mais nítido.',
  'parse-failed': 'Não conseguimos extrair os dados automaticamente. Tente prints mais nítidos ou divida em partes menores.',
  'ai-failed': 'Não conseguimos extrair os dados automaticamente. Tente outros arquivos ou insira manualmente.',
  'ics-invalid': 'Arquivo .ics inválido. Confira se baixou o arquivo correto do portal.',
  'ics-empty': 'Não encontramos eventos neste arquivo .ics.',
  'no-file': 'Nenhum arquivo selecionado.',
  'network': 'Falha de conexão. Tente novamente.',
  'no-session': 'Sua sessão expirou. Faça login novamente e tente importar de novo.',
  'save-failed': 'Não conseguimos salvar agora. Tente novamente em alguns segundos.',
}

const ACCEPT_BOLETIM = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf'
function validBoletimFile(f) {
  const t = (f.type || '').toLowerCase()
  if (t.startsWith('image/') || t === 'application/pdf') return true
  return /\.(png|jpe?g|webp|gif|pdf)$/i.test(f.name || '')
}

const TIPO_EVENTO = {
  prova:        { label: 'Prova',        cor: '#f87171', Icon: FileText },
  trabalho:     { label: 'Trabalho',     cor: '#60a5fa', Icon: FileText },
  apresentacao: { label: 'Apresentação', cor: '#c084fc', Icon: FileText },
}

function normalize(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Tokens used for fuzzy matching ("Banco de Dados" vs "Banco de Dados e SQL",
// "Cálculo" vs "Cálculo Diferencial e Integral I"). Stopwords stripped so e.g.
// "Cálculo I" and "Física I" don't false-match on the "I".
const STOPWORDS = new Set(['de','da','do','das','dos','e','ou','com','em','a','o','i','ii','iii','iv','v','vi'])
function tokens(s) {
  return normalize(s).split(/\s+/).filter(t => t && !STOPWORDS.has(t))
}

function bestMatch(impName, cadastradas) {
  if (!impName || !cadastradas?.length) return null
  const n = normalize(impName)
  const impTokens = tokens(impName)
  let best = null
  for (const cad of cadastradas) {
    const c = normalize(cad)
    if (c === n) return { nome: cad, confianca: 'alta', score: 1 }
    if (c.includes(n) || n.includes(c)) {
      if (!best || best.score < 0.95) best = { nome: cad, confianca: 'alta', score: 0.95 }
      continue
    }
    const cadTokens = tokens(cad)
    if (impTokens.length === 0 || cadTokens.length === 0) continue
    const shorter = impTokens.length <= cadTokens.length ? impTokens : cadTokens
    const longer  = shorter === impTokens ? cadTokens : impTokens
    const longerSet = new Set(longer)
    const common = shorter.filter(t => longerSet.has(t)).length
    const ratio  = common / shorter.length
    if (ratio >= 1) {
      if (!best || best.score < 0.9) best = { nome: cad, confianca: 'alta', score: 0.9 }
    } else if (ratio >= 0.6) {
      if (!best || best.score < ratio) best = { nome: cad, confianca: 'media', score: ratio }
    }
  }
  return best
}

function formatData(d) {
  if (!d) return ''
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

/**
 * ImportModal — upload boletim (PDF) or calendário (.ics), preview, resolve
 * conflicts, and save. `context` highlights the relevant card:
 *   'all' (TopBar) · 'notas' (página de Notas) · 'calendario' (página de Calendário)
 */
export default function ImportModal({ open, onClose, context = 'all' }) {
  const reduce = useReducedMotion()
  const { perfil, refreshPerfil } = useProfile()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('pick')        // pick | staging | processing | preview | error | success
  const [mode, setMode] = useState(null)          // boletim | calendario
  const [errorCode, setErrorCode] = useState(null)
  const [live, setLive] = useState('')

  // Boletim only: files staged before sending (thumbnail list).
  const [staged, setStaged] = useState([])        // [{ id, file, url? }]
  const [helpOpen, setHelpOpen] = useState(false)

  // boletim preview state
  const [materias, setMaterias] = useState([])
  const [resolucao, setResolucao] = useState({})  // chave -> manter|substituir|adicionar
  const [expanded, setExpanded] = useState({})
  const [existingNotas, setExistingNotas] = useState({})
  const [vinculos, setVinculos] = useState({})    // impNome -> targetMateria | '__new__'
  const [autoMatches, setAutoMatches] = useState({}) // impNome -> {nome, confianca} | null
  const [cadastradas, setCadastradas] = useState([])

  // calendario preview state
  const [eventos, setEventos] = useState([])      // [{...ev, include}]
  const [existingEventos, setExistingEventos] = useState([])

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const boletimInputRef = useRef(null)
  const icsInputRef = useRef(null)
  const modalRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  // Reset to a clean state each time the modal opens; revoke URLs & restore focus on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = typeof document !== 'undefined' ? document.activeElement : null
      setStep('pick'); setMode(null); setErrorCode(null)
      setMaterias([]); setResolucao({}); setExpanded({}); setExistingNotas({})
      setVinculos({}); setAutoMatches({}); setCadastradas([])
      setEventos([]); setExistingEventos([]); setSaving(false); setSuccessMsg(''); setLive('')
      setStaged(prev => { prev.forEach(s => s.url && URL.revokeObjectURL(s.url)); return [] })
      setHelpOpen(false)
    } else {
      setStaged(prev => { prev.forEach(s => s.url && URL.revokeObjectURL(s.url)); return [] })
      triggerRef.current?.focus?.()
    }
  }, [open])

  // Esc to close + focus the modal on open.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => modalRef.current?.focus(), 30)
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  // ── Staging (boletim, multi-file) ─────────────────────────────
  const adicionarBoletimArquivos = useCallback((arquivos) => {
    const validos = []
    let rejeitouTipo = false, rejeitouTamanho = false
    for (const f of arquivos) {
      if (!validBoletimFile(f)) { rejeitouTipo = true; continue }
      if (f.size > MAX_BYTES)   { rejeitouTamanho = true; continue }
      validos.push(f)
    }
    setStaged(prev => {
      const room = Math.max(0, MAX_STAGED - prev.length)
      const adicionados = validos.slice(0, room).map(f => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        url: f.type?.startsWith('image/') ? URL.createObjectURL(f) : null,
      }))
      return [...prev, ...adicionados]
    })
    setMode('boletim')
    setStep('staging')
    if (rejeitouTamanho) { setErrorCode('too-large'); setStep('error') }
    else if (rejeitouTipo && validos.length === 0) { setErrorCode('bad-type'); setStep('error') }
  }, [])

  const removerStaged = useCallback((id) => {
    setStaged(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx < 0) return prev
      if (prev[idx].url) URL.revokeObjectURL(prev[idx].url)
      return prev.filter(s => s.id !== id)
    })
  }, [])

  // ── Send (boletim N files / calendario 1 file) ────────────────
  const analisarBoletim = useCallback(async () => {
    if (staged.length === 0) return
    setStep('processing')
    setLive(`Analisando ${staged.length} ${staged.length === 1 ? 'arquivo' : 'arquivos'}`)

    const fd = new FormData()
    staged.forEach(s => fd.append('file', s.file))

    let data
    try {
      const resp = await fetch('/api/importar/boletim', { method: 'POST', body: fd })
      data = await resp.json().catch(() => ({ error: 'parse-failed' }))
      if (!resp.ok || data?.error) {
        setErrorCode(data?.error || 'network'); setStep('error'); setLive('Erro ao importar')
        return
      }
    } catch {
      setErrorCode('network'); setStep('error'); setLive('Erro de conexão')
      return
    }

    // Modelo NOVO: matérias existentes (com avaliações embutidas) por nome.
    const existingMaterias = (await db.getMaterias().catch(() => [])) || []
    const existing = {}
    for (const m of existingMaterias) existing[m.nome] = m
    setExistingNotas(existing)

    // Authoritative list of cadastradas matérias = perfil.materias (+ qualquer
    // matéria já existente no modelo novo que não esteja no perfil, por segurança).
    const fromPerfil = (perfil?.materias || '').split(',').map(s => s.trim()).filter(Boolean)
    const fromNotas = existingMaterias.map(m => m.nome)
    const cadSet = new Map()
    for (const m of fromPerfil) cadSet.set(normalize(m), m)
    for (const m of fromNotas) if (!cadSet.has(normalize(m))) cadSet.set(normalize(m), m)
    const cad = [...cadSet.values()]
    setCadastradas(cad)

    const vincIniciais = {}
    const autosIniciais = {}
    const res = {}
    ;(data.materias || []).forEach(m => {
      const bm = bestMatch(m.nome, cad)
      autosIniciais[m.nome] = bm
      // Pre-link when we have any plausible match (alta OR media). User can
      // always override in the preview — saves a click when we're right.
      const target = bm ? bm.nome : '__new__'
      vincIniciais[m.nome] = target
      if (target !== '__new__' && existing[target] && temNotas(existing[target])) {
        res[m.nome] = 'manter'
      }
    })
    setVinculos(vincIniciais)
    setAutoMatches(autosIniciais)
    setResolucao(res)
    setMaterias((data.materias || []).map(m => ({ ...m, _removed: false })))
    setStep('preview')
    setLive('Pronto para revisar')
  }, [staged, perfil])

  const enviarCalendario = useCallback(async (file) => {
    if (!file) return
    setMode('calendario')
    setStep('processing')
    setLive('Lendo o calendário')

    const fd = new FormData()
    fd.append('file', file)
    let data
    try {
      const resp = await fetch('/api/importar/calendario', { method: 'POST', body: fd })
      data = await resp.json().catch(() => ({ error: 'parse-failed' }))
      if (!resp.ok || data?.error) {
        setErrorCode(data?.error || 'network'); setStep('error'); setLive('Erro ao importar')
        return
      }
    } catch {
      setErrorCode('network'); setStep('error'); setLive('Erro de conexão')
      return
    }
    const existing = (await db.getEventos().catch(() => [])) || []
    setExistingEventos(existing)
    setEventos((data.eventos || []).map(ev => {
      const conflito = existing.some(e => e.data === ev.data && normalize(e.titulo) === normalize(ev.titulo))
      return { ...ev, include: !conflito, conflito }
    }))
    setStep('preview')
    setLive('Pronto para revisar')
  }, [])

  function onPickBoletim(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) adicionarBoletimArquivos(files)
  }
  function onPickCalendario(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) enviarCalendario(file)
  }

  // ── Save ──────────────────────────────────────────────────────
  // We do the auth check + Supabase write EXPLICITLY here instead of going
  // through db.saveNotas/db.saveEvento. Those helpers fall back to console.warn
  // and swallow errors silently, which would let the user see "Importado!" even
  // when the upsert failed (NOT NULL on user_id when auth.getUser returns null
  // post-f3ff171, or RLS rejection). Surface all failures with a visible code
  // and console.error so future regressions don't disappear into the void.
  async function confirmar() {
    if (saving) return
    setSaving(true)
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) {
        console.error('[import] supabase client unavailable (SSR or env missing)')
        setErrorCode('no-session'); setStep('error'); setSaving(false); return
      }
      // Resolve user explicitly: try getUser (network-validated) then fall back
      // to getSession (cookie-local) before declaring no session.
      let userId = null
      try {
        const { data } = await supabase.auth.getUser()
        userId = data?.user?.id || null
      } catch (e) { console.error('[import] auth.getUser threw', e) }
      if (!userId) {
        try {
          const { data } = await supabase.auth.getSession()
          userId = data?.session?.user?.id || null
        } catch (e) { console.error('[import] auth.getSession threw', e) }
      }
      if (!userId) {
        console.error('[import] no auth session — cannot save')
        setErrorCode('no-session'); setStep('error'); setSaving(false); return
      }

      if (mode === 'boletim') {
        // MODELO NOVO (Parte 3): pra cada matéria, upsertMateria() + uma
        // addAvaliacao() por avaliação lida. Conflito por matéria:
        //   manter     → não mexe nas existentes (pula a matéria)
        //   substituir → apaga as avaliações atuais e insere as importadas
        //   adicionar  → mantém as existentes e acrescenta as importadas
        // Erros das chamadas de db propagam (throw) → caem no catch externo
        // e viram 'save-failed' visível (nada é engolido).
        //
        // A sincronização de matéria nova → perfil.materias acontece DENTRO de
        // db.upsertMateria (matéria oficial), então não precisa ser feita aqui.
        let nNotas = 0, nFaltas = 0

        for (const m of materias) {
          if (m._removed) continue
          const targetVal = vinculos[m.nome] || '__new__'
          const target = targetVal === '__new__' ? m.nome : targetVal

          const existingRow = existingNotas[target]
          const conflito = !!existingRow && temNotas(existingRow)
          const res = resolucao[m.nome] || 'manter'
          if (conflito && res === 'manter') continue

          const faltas = Number(m.faltas) || 0

          // 1) Garante a linha da matéria. Em matéria nova, semeia defaults;
          //    em substituir, atualiza faltas; em adicionar, preserva o que já existe.
          const matPatch = { nome: target }
          if (!existingRow) {
            matPatch.faltas = faltas
            matPatch.total_aulas = TOTAL_AULAS_PADRAO
            matPatch.media_aprovacao = MEDIA_APROVACAO_PADRAO
          } else if (res === 'substituir') {
            matPatch.faltas = faltas
          }
          const matRow = await db.upsertMateria(matPatch)

          // 2) Substituir: remove as avaliações atuais antes de inserir.
          if (conflito && res === 'substituir' && Array.isArray(existingRow.avaliacoes)) {
            for (const a of existingRow.avaliacoes) {
              if (a?.id) await db.deleteAvaliacao(a.id)
            }
          }

          // 3) Insere as avaliações importadas (só as com nota válida).
          const importadas = (m.avaliacoes || [])
            .filter(a => a && a.nota != null && a.nota !== '' && !Number.isNaN(Number(a.nota)))
          let idx = 0
          for (const a of importadas) {
            idx++
            await db.addAvaliacao(matRow.id, {
              nome: (a.nome && String(a.nome).trim()) || `Avaliação ${idx}`,
              nota: Number(a.nota),
              peso: a.peso != null && a.peso !== '' && !Number.isNaN(Number(a.peso)) ? Number(a.peso) : 1,
            })
          }
          nNotas += importadas.length
          nFaltas += faltas
        }

        // db.upsertMateria já sincronizou matérias novas em perfil.materias
        // (Supabase + espelho local). Recarrega o contexto de perfil pra
        // dashboard/sidebar refletirem na hora (no-op fora do ProfileProvider,
        // ex.: /notas, que se atualiza pelo evento pointai-import-done).
        try { await refreshPerfil?.() } catch {}

        try { window.dispatchEvent(new CustomEvent('pointai-import-done', { detail: { kind: 'notas' } })) } catch {}
        setSuccessMsg(`${nNotas} ${nNotas === 1 ? 'nota' : 'notas'} e ${nFaltas} ${nFaltas === 1 ? 'falta' : 'faltas'} importadas`)
      } else {
        const marcados = eventos.filter(e => e.include)
        if (marcados.length > 0) {
          const rows = marcados.map(ev => ({
            user_id: userId,
            titulo: ev.titulo,
            data: ev.data,
            tipo: ev.tipo,
            materia: '',
          }))
          const { error: insertErr } = await supabase.from('eventos').insert(rows)
          if (insertErr) {
            console.error('[import] saveEventos insert failed:', insertErr)
            setErrorCode('save-failed'); setStep('error'); setSaving(false); return
          }
        }
        try { window.dispatchEvent(new CustomEvent('pointai-import-done', { detail: { kind: 'eventos' } })) } catch {}
        setSuccessMsg(`${marcados.length} ${marcados.length === 1 ? 'evento importado' : 'eventos importados'}`)
      }
      setStep('success')
      setLive('Importado com sucesso')
      setTimeout(() => onClose?.(), 1600)
    } catch (e) {
      console.error('[import] failed to save', e)
      setErrorCode('save-failed'); setStep('error')
    }
    setSaving(false)
  }

  // ── Derived counts ────────────────────────────────────────────
  const boletimResumo = useMemo(() => {
    const mats = materias.filter(m => !m._removed)
    const avals = mats.reduce((s, m) => s + (m.avaliacoes?.length || 0), 0)
    const faltas = mats.reduce((s, m) => s + (Number(m.faltas) || 0), 0)
    return { mats: mats.length, avals, faltas }
  }, [materias])

  const itensASalvar = useMemo(() => {
    if (mode === 'boletim') {
      return materias.filter(m => {
        if (m._removed) return false
        const targetVal = vinculos[m.nome] || '__new__'
        const target = targetVal === '__new__' ? m.nome : targetVal
        const conflito = !!existingNotas[target] && temNotas(existingNotas[target])
        return !(conflito && (resolucao[m.nome] || 'manter') === 'manter')
      }).length
    }
    return eventos.filter(e => e.include).length
  }, [mode, materias, eventos, resolucao, existingNotas, vinculos])

  if (!mounted) return null

  const showBoletimCard = context !== 'calendario'
  const showCalendarioCard = context !== 'notas'
  const dimBoletim = context === 'calendario'
  const dimCalendario = context === 'notas'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="im-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            ref={modalRef}
            className="im-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Importar dados acadêmicos"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: EASE }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && step === 'preview' && (e.metaKey || e.ctrlKey)) confirmar()
            }}
          >
            <style>{IM_CSS}</style>

            <button className="im-close" onClick={onClose} aria-label="Fechar">
              <X size={18} strokeWidth={2} />
            </button>

            <input ref={boletimInputRef} type="file" accept={ACCEPT_BOLETIM} multiple hidden onChange={onPickBoletim} />
            <input ref={icsInputRef} type="file" accept="text/calendar,.ics" hidden onChange={onPickCalendario} />

            <div className="im-sr" aria-live="polite" role="status">{live}</div>

            {/* ── PICK ── */}
            {step === 'pick' && (
              <div className="im-body">
                <h2 className="im-title">Importar seus dados acadêmicos</h2>
                <p className="im-sub">Suba o boletim ou o calendário do seu portal e nós organizamos tudo pra você.</p>
                <div className="im-cards">
                  {showBoletimCard && (
                    <UploadCard
                      Icon={FileText}
                      titulo="Boletim acadêmico"
                      desc="PDF ou prints da tela de notas. Pode mandar vários prints de uma vez (ex.: uma matéria por tela)."
                      botao="Escolher arquivos"
                      dim={dimBoletim}
                      multi
                      onChoose={() => boletimInputRef.current?.click()}
                      onDropFiles={(fs) => adicionarBoletimArquivos(fs)}
                      validate={validBoletimFile}
                      extra={<ComoFaco open={helpOpen} onToggle={() => setHelpOpen(v => !v)} reduce={reduce} />}
                    />
                  )}
                  {showCalendarioCard && (
                    <UploadCard
                      Icon={Calendar}
                      titulo="Calendário do portal"
                      desc="Arquivo .ics do seu portal acadêmico. Eventos e prazos viram lembretes."
                      botao="Escolher .ics"
                      dim={dimCalendario}
                      onChoose={() => icsInputRef.current?.click()}
                      onDropFiles={(fs) => fs[0] && enviarCalendario(fs[0])}
                      validate={(f) => f.name.toLowerCase().endsWith('.ics') || f.type === 'text/calendar'}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── STAGING (boletim) ── */}
            {step === 'staging' && mode === 'boletim' && (
              <StagingPanel
                staged={staged}
                onAddMore={() => boletimInputRef.current?.click()}
                onRemove={removerStaged}
                onBack={() => { setStep('pick'); setStaged(prev => { prev.forEach(s => s.url && URL.revokeObjectURL(s.url)); return [] }) }}
                onAnalisar={analisarBoletim}
                onDropFiles={(fs) => adicionarBoletimArquivos(fs)}
              />
            )}

            {/* ── PROCESSING ── */}
            {step === 'processing' && (
              <div className="im-state">
                <Loader2 size={34} className="im-spin" />
                <p className="im-state-title">
                  {mode === 'boletim'
                    ? `Analisando ${staged.length || 1} ${(staged.length || 1) === 1 ? 'arquivo' : 'arquivos'}…`
                    : 'Lendo o calendário…'}
                </p>
                <p className="im-state-sub">{mode === 'boletim' ? 'A IA está lendo as imagens e consolidando as notas.' : 'Organizando os eventos.'}</p>
              </div>
            )}

            {/* ── ERROR ── */}
            {step === 'error' && (
              <div className="im-state">
                <div className="im-err-ico"><FileWarning size={30} strokeWidth={1.6} /></div>
                <p className="im-state-title">Algo deu errado</p>
                <p className="im-state-sub">{ERROS[errorCode] || ERROS.network}</p>
                <button className="im-btn im-btn-ghost" onClick={() => {
                  setStaged(prev => { prev.forEach(s => s.url && URL.revokeObjectURL(s.url)); return [] })
                  setStep('pick'); setErrorCode(null)
                }}>
                  Tentar outro arquivo
                </button>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {step === 'success' && (
              <div className="im-state">
                <motion.div className="im-ok-ico"
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
                  <Check size={32} strokeWidth={2.4} />
                </motion.div>
                <p className="im-state-title">Importado!</p>
                <p className="im-state-sub">✓ {successMsg}</p>
              </div>
            )}

            {/* ── PREVIEW ── */}
            {step === 'preview' && (
              <div className="im-preview">
                <div className="im-preview-head">
                  <h2 className="im-title">Confira antes de importar</h2>
                  <p className="im-sub">
                    {mode === 'boletim'
                      ? `${boletimResumo.mats} ${boletimResumo.mats === 1 ? 'matéria' : 'matérias'}, ${boletimResumo.avals} ${boletimResumo.avals === 1 ? 'avaliação' : 'avaliações'} e ${boletimResumo.faltas} ${boletimResumo.faltas === 1 ? 'falta' : 'faltas'} detectadas`
                      : `${eventos.length} ${eventos.length === 1 ? 'evento detectado' : 'eventos detectados'}`}
                  </p>
                </div>

                <div className="im-preview-body">
                  {mode === 'boletim'
                    ? materias.map((m, i) => (
                        <MateriaCard
                          key={i} idx={i} materia={m}
                          existing={existingNotas}
                          cadastradas={cadastradas}
                          vinculo={vinculos[m.nome] || '__new__'}
                          autoMatch={autoMatches[m.nome]}
                          expanded={!!expanded[i]}
                          resolucao={resolucao[m.nome] || 'manter'}
                          onToggle={() => setExpanded(s => ({ ...s, [i]: !s[i] }))}
                          onChange={(patch) => setMaterias(ms => ms.map((x, j) => j === i ? { ...x, ...patch } : x))}
                          onChangeAval={(k, patch) => setMaterias(ms => ms.map((x, j) => j === i
                            ? { ...x, avaliacoes: x.avaliacoes.map((a, ai) => ai === k ? { ...a, ...patch } : a) } : x))}
                          onRemoveAval={(k) => setMaterias(ms => ms.map((x, j) => j === i
                            ? { ...x, avaliacoes: x.avaliacoes.filter((_, ai) => ai !== k) } : x))}
                          onRemove={() => setMaterias(ms => ms.map((x, j) => j === i ? { ...x, _removed: !x._removed } : x))}
                          onResolucao={(v) => setResolucao(r => ({ ...r, [m.nome]: v }))}
                          onVinculo={(v) => setVinculos(vs => ({ ...vs, [m.nome]: v }))}
                        />
                      ))
                    : eventos.map((ev, i) => (
                        <EventoRow key={i} ev={ev}
                          onToggle={() => setEventos(es => es.map((x, j) => j === i ? { ...x, include: !x.include } : x))} />
                      ))}
                </div>

                <div className="im-footer">
                  <button className="im-btn im-btn-ghost" onClick={onClose}>Cancelar</button>
                  <button className="im-btn im-btn-primary" onClick={confirmar} disabled={saving || itensASalvar === 0}>
                    {saving ? 'Importando…' : `Importar ${itensASalvar} ${itensASalvar === 1 ? 'item' : 'itens'}`}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ── Helpers ─────────────────────────────────────────────────── */
// `entry` é uma linha de matéria do modelo novo (db.getMaterias): tem
// avaliações embutidas. Há conflito quando já existe ao menos uma avaliação
// com nota lançada.
function temNotas(entry) {
  return !!entry && Array.isArray(entry.avaliacoes) &&
    entry.avaliacoes.some(a => a && a.nota !== '' && a.nota != null)
}

/* ── Upload card with drag & drop ────────────────────────────── */
function UploadCard({ Icon, titulo, desc, botao, dim, multi, onChoose, onDropFiles, validate, extra }) {
  const [drag, setDrag] = useState(false)
  return (
    <div className={`im-card${dim ? ' im-card-dim' : ''}${drag ? ' im-card-drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false)
        const arr = Array.from(e.dataTransfer.files || [])
        const ok = arr.filter(f => !validate || validate(f))
        if (ok.length) onDropFiles(multi ? ok : [ok[0]])
      }}
    >
      <div className="im-card-ico"><Icon size={22} strokeWidth={1.7} /></div>
      <p className="im-card-title">{titulo}</p>
      <p className="im-card-desc">{desc}</p>
      <div className="im-drop">
        <span className="im-drop-hint">{multi ? 'Arraste os arquivos aqui ou' : 'Arraste o arquivo aqui ou'}</span>
        <button className="im-btn im-btn-soft" onClick={onChoose}>{botao}</button>
      </div>
      {extra}
    </div>
  )
}

/* ── "Como faço?" help (expandable) ──────────────────────────── */
function ComoFaco({ open, onToggle, reduce }) {
  return (
    <div className="im-help">
      <button type="button" className="im-help-toggle" onClick={onToggle} aria-expanded={open}>
        <HelpCircle size={12} strokeWidth={2} /> Como faço?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="im-help-panel"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <ol className="im-help-list">
              <li>Abra a tela de notas no seu portal (Canvas, TOTVS, SIGA…).</li>
              <li>Tire um print: <strong>Cmd+Shift+4</strong> (Mac), <strong>Win+Shift+S</strong> (Windows), ou o botão de captura do celular.</li>
              <li>Se as notas estão em telas separadas (uma por matéria), tire um print de cada e mande todos juntos.</li>
              <li>Suba aqui — a gente lê e organiza tudo.</li>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Staged-files panel (boletim only) ───────────────────────── */
function StagingPanel({ staged, onAddMore, onRemove, onBack, onAnalisar, onDropFiles }) {
  const [drag, setDrag] = useState(false)
  return (
    <div className="im-staging">
      <div className="im-preview-head">
        <h2 className="im-title">Arquivos para analisar</h2>
        <p className="im-sub">
          {staged.length} {staged.length === 1 ? 'arquivo' : 'arquivos'} · máximo 10. Adicione mais prints ou clique em Analisar.
        </p>
      </div>
      <div className={`im-stage-list${drag ? ' im-stage-list-drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false)
          const arr = Array.from(e.dataTransfer.files || []).filter(validBoletimFile)
          if (arr.length) onDropFiles(arr)
        }}
      >
        {staged.map(s => (
          <div className="im-stage-row" key={s.id}>
            <div className="im-stage-thumb">
              {s.url
                ? <img src={s.url} alt="" />
                : <FileTextIcon size={20} strokeWidth={1.6} />}
            </div>
            <div className="im-stage-meta">
              <span className="im-stage-name" title={s.file.name}>{s.file.name}</span>
              <span className="im-stage-size">{fmtBytes(s.file.size)}</span>
            </div>
            <button className="im-stage-x" onClick={() => onRemove(s.id)} aria-label={`Remover ${s.file.name}`}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
        {staged.length < MAX_STAGED && (
          <button className="im-stage-add" onClick={onAddMore}>
            <Plus size={14} strokeWidth={2} /> Adicionar mais
          </button>
        )}
      </div>
      <div className="im-footer">
        <button className="im-btn im-btn-ghost" onClick={onBack}>Voltar</button>
        <button className="im-btn im-btn-primary" onClick={onAnalisar} disabled={staged.length === 0}>
          Analisar {staged.length} {staged.length === 1 ? 'arquivo' : 'arquivos'}
        </button>
      </div>
    </div>
  )
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/* ── Matéria card (boletim preview) ──────────────────────────── */
function MateriaCard({
  materia, existing, cadastradas, vinculo, autoMatch,
  expanded, resolucao, onToggle, onChange, onChangeAval, onRemoveAval, onRemove, onResolucao, onVinculo,
}) {
  const target = vinculo === '__new__' ? materia.nome : vinculo
  const conflito = !!existing[target] && temNotas(existing[target])
  const qtdAtual = conflito
    ? existing[target].avaliacoes.filter(a => a && a.nota !== '' && a.nota != null).length
    : 0
  const nAval = materia.avaliacoes?.length || 0
  const isNew = vinculo === '__new__'
  const isAuto = !isNew && autoMatch?.nome === vinculo

  return (
    <div className={`im-mat${materia._removed ? ' im-mat-removed' : ''}`}>
      <div className="im-mat-head">
        <button className="im-mat-toggle" onClick={onToggle} aria-expanded={expanded}>
          <ChevronDown size={15} strokeWidth={2} style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .18s' }} />
          <span className="im-mat-nome">{materia.nome}</span>
        </button>
        <span className="im-mat-resumo">{nAval} {nAval === 1 ? 'nota' : 'notas'} · {Number(materia.faltas) || 0} faltas</span>
        <button className="im-mat-x" onClick={onRemove} title={materia._removed ? 'Restaurar' : 'Remover'}>
          <Trash2 size={14} strokeWidth={1.8} />
        </button>
      </div>

      {!materia._removed && (
        <div className="im-vinculo">
          <span className="im-vinc-label">Vincular a:</span>
          <select
            className="im-select im-vinc-select"
            value={vinculo}
            onChange={(e) => onVinculo(e.target.value)}
            aria-label={`Vincular ${materia.nome} a uma matéria existente ou criar nova`}
          >
            {cadastradas.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">{`+ Criar nova: "${materia.nome}"`}</option>
          </select>
          {isNew && <span className="im-vinc-tag im-vinc-new"><Plus size={10} strokeWidth={2.4} /> Nova</span>}
          {isAuto && autoMatch.confianca === 'alta'  && <span className="im-vinc-tag im-vinc-auto"><Check size={10} strokeWidth={2.6} /> Auto-detectado</span>}
          {isAuto && autoMatch.confianca === 'media' && <span className="im-vinc-tag im-vinc-sug"><AlertTriangle size={10} strokeWidth={2.4} /> Sugerido — confira</span>}
        </div>
      )}

      {conflito && !materia._removed && (
        <div className="im-conflito">
          <span className="im-badge"><AlertTriangle size={11} strokeWidth={2} /> Já existe — você tem {qtdAtual} {qtdAtual === 1 ? 'nota' : 'notas'} em {target}</span>
          <select className="im-select" value={resolucao} onChange={(e) => onResolucao(e.target.value)}>
            <option value="manter">Manter atual</option>
            <option value="substituir">Substituir pela importada</option>
            <option value="adicionar">Adicionar às existentes</option>
          </select>
        </div>
      )}

      {expanded && !materia._removed && (
        <div className="im-mat-body">
          {nAval > 0 ? (
            <div className="im-aval-table">
              <div className="im-aval-row im-aval-head">
                <span>Avaliação</span><span>Peso</span><span>Nota</span><span>Data</span><span />
              </div>
              {materia.avaliacoes.map((a, k) => (
                <div className="im-aval-row" key={k}>
                  <input className="im-inp" value={a.nome || ''} onChange={(e) => onChangeAval(k, { nome: e.target.value })} />
                  <input className="im-inp im-inp-num" value={a.peso ?? 1} onChange={(e) => onChangeAval(k, { peso: e.target.value })} inputMode="decimal" />
                  <input className="im-inp im-inp-num" value={a.nota ?? ''} onChange={(e) => onChangeAval(k, { nota: e.target.value })} inputMode="decimal" />
                  <input className="im-inp" type="date" value={a.data || ''} onChange={(e) => onChangeAval(k, { data: e.target.value })} />
                  <button className="im-aval-x" onClick={() => onRemoveAval(k)} aria-label="Remover avaliação"><X size={13} strokeWidth={2} /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="im-aval-empty">Sem avaliações detectadas — você pode adicionar depois na página de Notas.</p>
          )}
          <label className="im-faltas">
            Faltas
            <input className="im-inp im-inp-num" value={materia.faltas ?? 0} onChange={(e) => onChange({ faltas: e.target.value })} inputMode="numeric" />
          </label>
          {materia.escala_original && (
            <p className="im-escala">Convertido de: {materia.escala_original}</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Evento row (calendário preview) ─────────────────────────── */
function EventoRow({ ev, onToggle }) {
  const cfg = TIPO_EVENTO[ev.tipo] || TIPO_EVENTO.prova
  return (
    <label className={`im-ev${ev.conflito ? ' im-ev-conflito' : ''}`}>
      <input type="checkbox" checked={ev.include} onChange={onToggle} className="im-ev-check" />
      <span className="im-ev-ico" style={{ color: cfg.cor }}><cfg.Icon size={15} strokeWidth={1.8} /></span>
      <span className="im-ev-titulo">{ev.titulo}</span>
      {ev.conflito && <span className="im-badge im-badge-sm"><AlertTriangle size={10} strokeWidth={2} /> já existe</span>}
      <span className="im-ev-data">{formatData(ev.data)}</span>
    </label>
  )
}

const IM_CSS = `
  .im-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px}
  .im-modal{position:relative;width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;background:#0e0e0e;border:1px solid rgba(255,255,255,.09);border-radius:20px;box-shadow:0 40px 100px rgba(0,0,0,.65);outline:none;overflow:hidden}
  .im-close{position:absolute;top:14px;right:14px;z-index:3;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#a1a1aa;width:32px;height:32px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
  .im-close:hover{background:rgba(255,255,255,.09);color:#f4f4f5}
  .im-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}

  .im-body{padding:30px 28px 28px;overflow-y:auto}
  .im-title{font-size:19px;font-weight:800;color:#f4f4f5;letter-spacing:-.02em;margin:0 0 6px}
  .im-sub{font-size:13px;color:#a1a1aa;line-height:1.5;margin:0 0 22px}

  .im-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .im-card{background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.14);border-radius:16px;padding:20px 18px;display:flex;flex-direction:column;transition:border-color .15s,background .15s,opacity .15s}
  .im-card-drag{border-style:solid;border-color:#22c55e;background:rgba(34,197,94,.06)}
  .im-card-dim{opacity:.45}
  .im-card-ico{width:40px;height:40px;border-radius:11px;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.22);color:#22c55e;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px}
  .im-card-title{font-size:14.5px;font-weight:700;color:#f4f4f5;margin:0 0 6px}
  .im-card-desc{font-size:12px;color:#71717a;line-height:1.5;margin:0 0 16px;flex:1}
  .im-drop{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
  .im-drop-hint{font-size:11.5px;color:#52525b}

  /* ── "Como faço?" help ── */
  .im-help{margin-top:14px}
  .im-help-toggle{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:11.5px;font-weight:600;color:#71717a;background:none;border:none;cursor:pointer;padding:0;transition:color .15s}
  .im-help-toggle:hover{color:#22c55e}
  .im-help-panel{margin-top:8px}
  .im-help-list{margin:0;padding-left:18px;font-size:11.5px;color:#a1a1aa;line-height:1.55;display:flex;flex-direction:column;gap:5px}
  .im-help-list strong{color:#e4e4e7;font-weight:700}

  /* ── Staging list ── */
  .im-staging{display:flex;flex-direction:column;min-height:0;max-height:88vh}
  .im-stage-list{flex:1;overflow-y:auto;padding:0 28px 4px;display:flex;flex-direction:column;gap:8px;border-radius:0;transition:background .15s}
  .im-stage-list-drag{background:rgba(34,197,94,.05)}
  .im-stage-row{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:11px;padding:8px 10px}
  .im-stage-thumb{width:44px;height:44px;border-radius:8px;background:#0d0d0d;border:1px solid rgba(255,255,255,.06);display:inline-flex;align-items:center;justify-content:center;color:#71717a;flex-shrink:0;overflow:hidden}
  .im-stage-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .im-stage-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .im-stage-name{font-size:13px;color:#e4e4e7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .im-stage-size{font-size:11px;color:#71717a}
  .im-stage-x{background:none;border:none;color:#71717a;cursor:pointer;padding:6px;border-radius:7px;display:inline-flex;transition:color .15s,background .15s}
  .im-stage-x:hover{color:#f87171;background:rgba(248,113,113,.08)}
  .im-stage-add{display:inline-flex;align-items:center;gap:6px;background:none;border:1px dashed rgba(255,255,255,.14);color:#a1a1aa;border-radius:11px;padding:10px 14px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;align-self:flex-start;transition:border-color .15s,color .15s,background .15s}
  .im-stage-add:hover{border-color:rgba(34,197,94,.4);color:#86efac;background:rgba(34,197,94,.05)}

  .im-btn{font-family:inherit;font-size:13px;font-weight:600;border-radius:10px;cursor:pointer;border:none;transition:background .15s,color .15s,border-color .15s,opacity .15s;padding:9px 16px}
  .im-btn-soft{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#86efac}
  .im-btn-soft:hover{background:rgba(34,197,94,.2)}
  .im-btn-ghost{background:none;border:1px solid rgba(255,255,255,.12);color:#a1a1aa}
  .im-btn-ghost:hover{background:rgba(255,255,255,.05);color:#e4e4e7}
  .im-btn-primary{background:#1a7a4a;color:#fff}
  .im-btn-primary:hover:not(:disabled){background:#155f3a}
  .im-btn-primary:disabled{opacity:.5;cursor:not-allowed}

  .im-state{padding:56px 32px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
  .im-spin{color:#22c55e;animation:imSpin 1s linear infinite}
  @keyframes imSpin{to{transform:rotate(360deg)}}
  .im-state-title{font-size:16px;font-weight:700;color:#f4f4f5;margin:6px 0 0}
  .im-state-sub{font-size:13px;color:#a1a1aa;line-height:1.55;max-width:380px}
  .im-err-ico{width:56px;height:56px;border-radius:14px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);color:#fbbf24;display:inline-flex;align-items:center;justify-content:center}
  .im-ok-ico{width:60px;height:60px;border-radius:50%;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);color:#22c55e;display:inline-flex;align-items:center;justify-content:center}

  .im-preview{display:flex;flex-direction:column;min-height:0;max-height:88vh}
  .im-preview-head{padding:26px 28px 14px;flex-shrink:0}
  .im-preview-body{flex:1;overflow-y:auto;padding:0 28px;display:flex;flex-direction:column;gap:10px}
  .im-preview-body::-webkit-scrollbar{width:6px}
  .im-preview-body::-webkit-scrollbar-thumb{background:#222;border-radius:8px}
  .im-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 28px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}

  .im-mat{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
  .im-mat-removed{opacity:.4}
  .im-mat-head{display:flex;align-items:center;gap:8px;padding:12px 14px}
  .im-mat-toggle{display:inline-flex;align-items:center;gap:8px;background:none;border:none;color:#f4f4f5;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:600;flex:1;text-align:left;min-width:0}
  .im-mat-toggle svg{color:#71717a;flex-shrink:0}
  .im-mat-nome{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .im-mat-resumo{font-size:11.5px;color:#71717a;white-space:nowrap;flex-shrink:0}
  .im-mat-x{background:none;border:none;color:#71717a;cursor:pointer;padding:5px;border-radius:7px;display:inline-flex;transition:color .15s,background .15s}
  .im-mat-x:hover{color:#f87171;background:rgba(248,113,113,.08)}

  .im-vinculo{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 14px 10px}
  .im-vinc-label{font-size:11px;font-weight:600;color:#71717a;letter-spacing:.02em}
  .im-vinc-select{flex:1;min-width:160px}
  .im-vinc-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:3px 8px;border-radius:99px}
  .im-vinc-auto{color:#22c55e;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.28)}
  .im-vinc-sug{color:#fbbf24;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25)}
  .im-vinc-new{color:#a1a1aa;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10)}

  .im-conflito{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 14px 12px}
  .im-badge{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#fbbf24;background:rgba(251,191,36,.10);border:1px solid rgba(251,191,36,.28);padding:3px 8px;border-radius:99px}
  .im-badge-sm{font-size:9.5px;padding:2px 7px}
  .im-select{background:#161616;border:1px solid #2a2a2a;color:#d4d4d8;font-family:inherit;font-size:12px;padding:5px 8px;border-radius:8px;cursor:pointer}

  .im-mat-body{padding:0 14px 14px;border-top:1px solid rgba(255,255,255,.05);margin-top:2px}
  .im-aval-table{display:flex;flex-direction:column;gap:5px;margin:12px 0}
  .im-aval-row{display:grid;grid-template-columns:1fr 56px 56px 130px 26px;gap:6px;align-items:center}
  .im-aval-head{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#52525b;padding:0 2px}
  .im-inp{background:#0d0d0d;border:1px solid #262626;border-radius:8px;color:#e4e4e7;font-family:inherit;font-size:12.5px;padding:7px 8px;outline:none;width:100%;min-width:0}
  .im-inp:focus{border-color:rgba(34,197,94,.5)}
  .im-inp-num{text-align:center}
  .im-aval-x{background:none;border:none;color:#52525b;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:4px;border-radius:6px}
  .im-aval-x:hover{color:#f87171;background:rgba(248,113,113,.08)}
  .im-aval-empty{font-size:12px;color:#71717a;font-style:italic;margin:12px 0}
  .im-faltas{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#a1a1aa;margin-top:4px}
  .im-faltas .im-inp{width:70px}
  .im-escala{font-size:11px;color:#71717a;margin:8px 0 0;font-style:italic}

  .im-ev{display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;cursor:pointer}
  .im-ev-conflito{background:rgba(251,191,36,.05);border-color:rgba(251,191,36,.22)}
  .im-ev-check{width:16px;height:16px;accent-color:#22c55e;cursor:pointer;flex-shrink:0}
  .im-ev-ico{flex-shrink:0;display:inline-flex}
  .im-ev-titulo{flex:1;min-width:0;font-size:13px;color:#e4e4e7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .im-ev-data{font-size:11.5px;color:#71717a;flex-shrink:0}

  @media (max-width:768px){
    .im-overlay{padding:0;align-items:flex-end}
    .im-modal{max-width:none;max-height:90vh;border-radius:18px 18px 0 0}
    .im-cards{grid-template-columns:1fr}
    .im-card-dim{display:none}
    .im-drop-hint{display:none}
    .im-aval-row{grid-template-columns:1fr 48px 48px;gap:5px}
    .im-aval-row .im-inp[type="date"]{grid-column:1 / -1}
    .im-aval-head{display:none}
    .im-stage-list{padding:0 14px 4px}
    .im-footer{padding:14px 16px}
    .im-preview-head{padding:18px 16px 10px}
  }
`
