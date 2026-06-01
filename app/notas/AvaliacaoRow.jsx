'use client'
import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Check, Trash2, AlertCircle, Loader2, MoreHorizontal, Pencil } from 'lucide-react'

// Formatação PT-BR (vírgula decimal), sem zero forçado para caber na bolinha.
const fmtNota = n => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1).replace('.', ','))
const fmtPeso = n => {
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',')
}
// String digitada (vírgula/ponto) → número, ou null se vazia.
const parseNota = s => (s === '' || s === null ? null : Number(String(s).replace(',', '.')))

// Uma linha de avaliação. Modo normal: bolinha (nota) + nome editável +
// pill de peso + lápis (editar nota) + lixeira. Ao editar a nota, a linha
// "abre" com um slider (0–10, passo 0.5) + número digitável (precisão).
// Salva no fim da edição via onSave(patch). onSave/onDelete async e LANÇAM em erro.
export default function AvaliacaoRow({ avaliacao, onSave, onDelete }) {
  const reduce = useReducedMotion()
  const [nome, setNome] = useState(avaliacao.nome ?? '')
  const [nota, setNota] = useState(avaliacao.nota ?? '')
  const [peso, setPeso] = useState(avaliacao.peso ?? 1)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [editandoNota, setEditandoNota] = useState(false)
  const [editandoPeso, setEditandoPeso] = useState(false)
  const [confirmandoDel, setConfirmandoDel] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  // Sem effect de resync: key={av.id} no parent garante nova instância por avaliação.

  const notaSalva = avaliacao.nota ?? null   // bolinha reflete o valor persistido
  const temNota = notaSalva !== null && notaSalva !== ''
  const notaNum = parseNota(nota)
  const sliderVal = notaNum === null || Number.isNaN(notaNum) ? 0 : Math.max(0, Math.min(10, notaNum))

  // Retorna true se ficou consistente (salvou ou nada a salvar); false em erro.
  async function commit() {
    const nomeT = (nome || '').trim()
    const notaVal = parseNota(nota)
    const pesoVal = peso === '' || peso === null ? 1 : Number(peso)

    // Validação de boundary: nota 0–10. Marca erro e NÃO persiste.
    if (notaVal !== null && (Number.isNaN(notaVal) || notaVal < 0 || notaVal > 10)) {
      setStatus('error')
      return false
    }

    const patch = {}
    if (nomeT !== (avaliacao.nome || '')) patch.nome = nomeT
    if ((avaliacao.nota ?? null) !== notaVal) patch.nota = notaVal
    if (Number(avaliacao.peso ?? 1) !== pesoVal) patch.peso = pesoVal
    if (Object.keys(patch).length === 0) {
      if (status === 'error') setStatus('idle')
      return true
    }

    setStatus('saving')
    try {
      await onSave(patch)
      setStatus('saved')
      setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 1400)
      return true
    } catch {
      setStatus('error')
      return false
    }
  }

  async function fecharEdicaoNota() {
    const ok = await commit()
    if (ok) setEditandoNota(false)
  }

  async function onEdicaoBlur(e) {
    // Foco saiu da seção de edição (clicou fora) → salva e fecha.
    if (e.currentTarget.contains(e.relatedTarget)) return
    await fecharEdicaoNota()
  }

  async function confirmarRemover() {
    setRemovendo(true)
    try {
      await onDelete()
    } catch {
      setRemovendo(false)
      setConfirmandoDel(false)
      setStatus('error')
    }
  }

  const corBolha = temNota
    ? { background: 'rgba(34,197,94,.14)', color: '#16a34a', border: '1px solid rgba(34,197,94,.3)' }
    : { background: 'var(--surface-3)', color: 'var(--text-4)', border: '1px solid var(--border)' }

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8, height: 0 }}
      animate={reduce ? {} : { opacity: 1, y: 0, height: 'auto' }}
      exit={reduce ? {} : { opacity: 0, x: -12, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ padding: '7px 0', overflow: 'hidden' }}
    >
      {/* Linha principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Bolinha da nota — clicável p/ editar (pulsa ao salvar) */}
        <motion.button
          onClick={() => setEditandoNota(true)}
          aria-label={temNota ? `Nota ${fmtNota(notaSalva)} — editar` : 'Adicionar nota'}
          animate={status === 'saved' && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0, padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12.5, fontWeight: 700, ...corBolha,
          }}
        >
          {temNota ? fmtNota(notaSalva) : <MoreHorizontal size={14} strokeWidth={2} />}
        </motion.button>

        {/* Nome + hint de "aguardando nota" */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <input
            aria-label="Nome da avaliação"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            placeholder="Nome da avaliação"
            style={{ width: '100%', border: 'none', background: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
          />
          {!temNota && !editandoNota && (
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>· aguardando nota</span>
          )}
        </div>

        {/* Pill de peso (clicável → editável) */}
        {editandoPeso ? (
          <input
            aria-label="Peso"
            type="text" inputMode="decimal"
            value={peso}
            autoFocus
            onChange={e => setPeso(e.target.value)}
            onBlur={() => { setEditandoPeso(false); commit() }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="input"
            style={{ width: 50, textAlign: 'center', padding: '5px 4px', fontSize: 12 }}
          />
        ) : (
          <button
            onClick={() => setEditandoPeso(true)}
            aria-label={`Peso ${fmtPeso(peso)}, clique para editar`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0, background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            peso {fmtPeso(peso)}×
          </button>
        )}

        {/* Lápis — abrir edição da nota */}
        <button
          onClick={() => setEditandoNota(v => !v)}
          aria-label="Editar nota"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: editandoNota ? '#16a34a' : 'var(--text-4)', display: 'flex', padding: 5, borderRadius: 6, flexShrink: 0, transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#16a34a')}
          onMouseLeave={e => (e.currentTarget.style.color = editandoNota ? '#16a34a' : 'var(--text-4)')}
        >
          <Pencil size={14} strokeWidth={1.9} />
        </button>

        {/* Status (espaço reservado, sem layout shift) */}
        <span style={{ width: 18, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          {status === 'saving' && <Loader2 size={14} style={{ color: 'var(--text-4)', animation: 'spin 1s linear infinite' }} />}
          {status === 'saved' && (
            <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }}>
              <Check size={15} style={{ color: '#22c55e' }} strokeWidth={2.5} />
            </motion.span>
          )}
          {status === 'error' && <AlertCircle size={14} style={{ color: '#dc2626' }} title="Nota inválida (0–10) ou falha ao salvar" />}
        </span>

        {/* Remover com confirmação inline */}
        {!confirmandoDel ? (
          <button
            onClick={() => setConfirmandoDel(true)}
            aria-label="Remover avaliação"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 5, borderRadius: 6, flexShrink: 0, transition: 'color .15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
          >
            <Trash2 size={15} strokeWidth={1.8} />
          </button>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={confirmarRemover}
              disabled={removendo}
              aria-label="Confirmar remoção"
              style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,.12)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
            >
              {removendo ? '...' : 'Remover'}
            </button>
            <button
              onClick={() => setConfirmandoDel(false)}
              aria-label="Cancelar remoção"
              style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
            >
              Cancelar
            </button>
          </span>
        )}
      </div>

      {/* Modo de edição da nota: slider + número digitável */}
      <AnimatePresence>
        {editandoNota && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={reduce ? {} : { opacity: 1, height: 'auto' }}
            exit={reduce ? {} : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
            onBlur={onEdicaoBlur}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px 4px 42px' }}>
              <input
                aria-label="Ajustar nota com o slider"
                type="range" min="0" max="10" step="0.5"
                value={sliderVal}
                onChange={e => { setNota(e.target.value); if (status === 'error') setStatus('idle') }}
                style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer', minWidth: 0 }}
              />
              <input
                aria-label="Nota (0 a 10)"
                type="text" inputMode="decimal"
                value={nota}
                onChange={e => { setNota(e.target.value); if (status === 'error') setStatus('idle') }}
                onKeyDown={e => { if (e.key === 'Enter') fecharEdicaoNota() }}
                placeholder="—"
                style={{
                  width: 58, textAlign: 'center', padding: '8px 6px', fontSize: 18, fontWeight: 800,
                  borderRadius: 10, background: 'var(--surface-3)', color: 'var(--text-1)', fontFamily: 'inherit',
                  border: `1.5px solid ${status === 'error' ? '#dc2626' : 'var(--border)'}`, outline: 'none',
                }}
              />
              <button
                onClick={() => { setNota(''); if (status === 'error') setStatus('idle') }}
                aria-label="Limpar nota (deixar como aguardando)"
                style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', whiteSpace: 'nowrap' }}
              >
                limpar
              </button>
              <button
                onClick={fecharEdicaoNota}
                aria-label="Concluir edição da nota"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: 'rgba(34,197,94,.14)', color: '#16a34a', border: '1px solid rgba(34,197,94,.3)', cursor: 'pointer', flexShrink: 0 }}
              >
                <Check size={16} strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
