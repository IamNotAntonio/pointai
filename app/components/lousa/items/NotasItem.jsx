'use client'
import { FileText, FileX, Plus } from 'lucide-react'
import { DrawerCard, FullscreenSkeleton, sharedItemCss } from './_shared'

function notasDaMateria(notas, materia) {
  if (!Array.isArray(notas) || !materia || materia === 'geral') return []
  return notas.filter(n => n.materia === materia || n.disciplina === materia)
}

function mediaPonderada(items) {
  if (!items.length) return null
  let soma = 0, pesoTotal = 0
  for (const it of items) {
    const nota = Number(it.nota)
    const peso = Number(it.peso ?? 1) || 1
    if (!Number.isNaN(nota)) {
      soma += nota * peso
      pesoTotal += peso
    }
  }
  return pesoTotal > 0 ? soma / pesoTotal : null
}

function tempoRelativo(iso) {
  if (!iso) return ''
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const d = Math.floor(ms / 86400000)
    if (d <= 0) return 'hoje'
    if (d === 1) return 'ontem'
    if (d < 30) return `há ${d} dias`
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

export function getNotasBadge({ materia, notas }) {
  const lista = notasDaMateria(notas, materia)
  if (!lista.length) return null
  const m = mediaPonderada(lista)
  return m == null ? null : `Média ${m.toFixed(1)}`
}

export function NotasDrawer({ materia, notas }) {
  const lista = notasDaMateria(notas, materia)
  const media = mediaPonderada(lista)
  const ultima = lista[0]
  const faltas = ultima?.faltas ?? null
  const maxFaltas = ultima?.maxFaltas ?? 15
  const pctFaltas = faltas != null ? Math.min((faltas / maxFaltas) * 100, 100) : 0
  const corFaltas = pctFaltas >= 80 ? '#f87171' : pctFaltas >= 60 ? '#fbbf24' : '#22c55e'

  if (materia === 'geral' || !lista.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
        <FileX size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
        <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
          {materia === 'geral'
            ? 'Selecione uma matéria na sidebar para ver suas notas.'
            : <>Você ainda não registrou notas em <strong style={{ color: '#e4e4e7' }}>{materia}</strong>.</>}
        </p>
        {materia !== 'geral' && (
          <button className="lousa-cta-btn">
            <Plus size={14} strokeWidth={2} /> Registrar primeira nota
          </button>
        )}
        <style>{sharedItemCss}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DrawerCard label="Média da matéria">
        <p style={{ fontSize: 36, fontWeight: 900, color: '#22c55e', letterSpacing: '-.02em', lineHeight: 1 }}>
          {media?.toFixed(1) ?? '—'}
        </p>
        {ultima && (
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 6 }}>
            Última: {ultima.titulo || 'Avaliação'} · {ultima.nota}
          </p>
        )}
      </DrawerCard>

      {ultima && (
        <DrawerCard label="Última nota">
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>
            {ultima.titulo || 'Avaliação'}
          </p>
          <p style={{ fontSize: 12, color: '#a1a1aa' }}>
            Nota <strong style={{ color: '#22c55e' }}>{ultima.nota}</strong> · {tempoRelativo(ultima.data || ultima.criado_em)}
          </p>
        </DrawerCard>
      )}

      <DrawerCard label="Faltas">
        <p style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 8 }}>
          {faltas ?? 0}/{maxFaltas} <span style={{ fontSize: 11.5, fontWeight: 600, color: '#71717a' }}>({Math.round(pctFaltas)}%)</span>
        </p>
        <div style={{ height: 6, borderRadius: 99, background: '#161616', overflow: 'hidden' }}>
          <div style={{ width: `${pctFaltas}%`, height: '100%', background: corFaltas, transition: 'width .4s ease', borderRadius: 99 }} />
        </div>
      </DrawerCard>

      <style>{sharedItemCss}</style>
    </div>
  )
}

export function NotasFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={FileText}
      title="Notas e Faltas — em construção"
      bullets={[
        'Tabela completa de avaliações com pesos por matéria',
        'Gráfico de evolução das notas ao longo do semestre',
        'Log detalhado de faltas com datas e justificativas',
        'Previsão de média final calculada pela IA',
      ]}
    />
  )
}
