'use client'
import { Calendar, CalendarPlus, AlertCircle, ClipboardList, BookOpen } from 'lucide-react'
import { DrawerCard, FullscreenSkeleton, sharedItemCss } from './_shared'

function eventosDaMateria(eventos, materia) {
  const all = Array.isArray(eventos) ? eventos : []
  if (materia === 'geral') return all
  return all.filter(e => e.materia === materia || e.disciplina === materia)
}

function proximos(eventos) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const ts = todayStart.getTime()
  return eventos
    .map(e => ({ ...e, _ts: new Date(e.data).getTime() }))
    .filter(e => !Number.isNaN(e._ts) && e._ts >= ts)
    .sort((a, b) => a._ts - b._ts)
}

function deltaLabel(ev) {
  const ms = ev._ts - Date.now()
  const days = Math.floor(ms / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'amanhã'
  if (days < 14) return `em ${days} dias`
  return new Date(ev._ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const TYPE_STYLES = {
  prova:      { Icon: AlertCircle,    color: '#f87171', label: 'Prova' },
  trabalho:   { Icon: ClipboardList,  color: '#fbbf24', label: 'Trabalho' },
  apresentacao: { Icon: ClipboardList, color: '#fbbf24', label: 'Apresentação' },
  aula:       { Icon: BookOpen,       color: '#22c55e', label: 'Aula' },
}

function typeOf(ev) {
  const t = (ev.tipo || '').toLowerCase()
  return TYPE_STYLES[t] || TYPE_STYLES.aula
}

export function getCalendarioBadge({ materia, eventos }) {
  const lista = proximos(eventosDaMateria(eventos, materia))
  if (!lista.length) return null
  const ev = lista[0]
  const ts = typeOf(ev)
  return `${ts.label} · ${deltaLabel(ev)}`
}

export function CalendarioDrawer({ materia, eventos }) {
  const lista = proximos(eventosDaMateria(eventos, materia)).slice(0, 5)

  if (!lista.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
        <Calendar size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
        <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
          Nenhum evento próximo {materia !== 'geral' ? <>em <strong style={{ color: '#e4e4e7' }}>{materia}</strong></> : null}.
        </p>
        <button className="lousa-cta-btn">
          <CalendarPlus size={14} strokeWidth={2} /> Novo evento
        </button>
        <style>{sharedItemCss}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <DrawerCard label="Próximos eventos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map((ev, i) => {
            const ts = typeOf(ev)
            return (
              <div key={ev.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', background: '#0d0d0d',
                border: `1px solid ${ts.color}26`,
                borderRadius: 10,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${ts.color}1a`, color: ts.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ts.Icon size={14} strokeWidth={1.8} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.titulo}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>
                    {ts.label} · {deltaLabel(ev)}{ev.materia && materia === 'geral' ? ` · ${ev.materia}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </DrawerCard>

      <button className="lousa-cta-btn" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
        <CalendarPlus size={14} strokeWidth={2} /> Novo evento
      </button>

      <style>{sharedItemCss}</style>
    </div>
  )
}

export function CalendarioFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={Calendar}
      title="Calendário completo — em construção"
      bullets={[
        'Visão mensal com todos os eventos das matérias ativas',
        'Filtros por tipo (prova, trabalho, aula, apresentação)',
        'Integração com Google Calendar e Outlook',
        'Notificações push de eventos próximos',
      ]}
    />
  )
}
