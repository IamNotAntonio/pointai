'use client'
import 'react-day-picker/style.css'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'
import { format, isSameDay } from 'date-fns'
import {
  Calendar, CalendarPlus, AlertCircle, ClipboardList, BookOpen,
} from 'lucide-react'
import * as db from '../../../lib/db'
import {
  useCurrentMateria,
  eventosDaMateria, proximosEventos, deltaLabel,
  sharedItemCss, fullscreenCss,
} from './_shared'

const TYPE_STYLES = {
  prova:        { Icon: AlertCircle,   color: '#f87171', label: 'Prova' },
  trabalho:     { Icon: ClipboardList, color: '#fbbf24', label: 'Trabalho' },
  apresentacao: { Icon: ClipboardList, color: '#fbbf24', label: 'Apresentação' },
  aula:         { Icon: BookOpen,      color: '#22c55e', label: 'Aula' },
}

function typeOf(ev) {
  const t = (ev.tipo || '').toLowerCase()
  return TYPE_STYLES[t] || TYPE_STYLES.aula
}

/* ─── Bento card ────────────────────────────────────────────────── */
export function CalendarioCard({ materia, eventos, onClick }) {
  const lista = proximosEventos(eventosDaMateria(eventos, materia))
  const prox = lista[0]
  const proxType = prox ? typeOf(prox) : null

  return (
    <motion.button
      type="button"
      layoutId="panel-calendario"
      onClick={onClick}
      className="bento-card"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Abrir Calendário"
    >
      <div className="bento-card-icon-wrap">
        <Calendar size={20} strokeWidth={1.7} />
      </div>
      <p className="bento-card-title">Calendário</p>
      {prox ? (
        <>
          <p className="bento-card-strong" style={{ color: proxType.color }}>
            {prox.titulo}
          </p>
          <p className="bento-card-sub">{proxType.label} · {deltaLabel(prox._ts)}</p>
        </>
      ) : (
        <p className="bento-card-sub" style={{ marginTop: 6 }}>Sem eventos próximos</p>
      )}
    </motion.button>
  )
}

/* ─── Fullscreen ────────────────────────────────────────────────── */
export function CalendarioFullscreen() {
  return (
    <Suspense fallback={<div className="lousa-fs-container">Carregando…</div>}>
      <CalendarioFullscreenInner />
    </Suspense>
  )
}

function CalendarioFullscreenInner() {
  const materia = useCurrentMateria()
  const reduce = useReducedMotion()
  const [eventos, setEventos] = useState([])
  const [filter, setFilter] = useState('todos')
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    let alive = true
    db.getEventos().then(d => { if (alive) setEventos(d || []) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const lista = useMemo(() => {
    const mateFiltered = eventosDaMateria(eventos, materia)
    return mateFiltered
      .map(e => ({ ...e, _ts: new Date(e.data).getTime() }))
      .filter(e => !Number.isNaN(e._ts))
  }, [eventos, materia])

  const provaDays    = useMemo(() => lista.filter(e => (e.tipo || '').toLowerCase() === 'prova').map(e => new Date(e._ts)), [lista])
  const trabalhoDays = useMemo(() => lista.filter(e => ['trabalho', 'apresentacao'].includes((e.tipo || '').toLowerCase())).map(e => new Date(e._ts)), [lista])
  const aulaDays     = useMemo(() => lista.filter(e => { const t = (e.tipo || '').toLowerCase(); return t === 'aula' || t === '' }).map(e => new Date(e._ts)), [lista])

  const filtered = useMemo(() => {
    const sorted = [...lista].sort((a, b) => a._ts - b._ts)
    let f = sorted
    if (filter === 'provas') f = sorted.filter(e => (e.tipo || '').toLowerCase() === 'prova')
    else if (filter === 'trabalhos') f = sorted.filter(e => ['trabalho', 'apresentacao'].includes((e.tipo || '').toLowerCase()))
    else if (filter === 'aulas') f = sorted.filter(e => {
      const t = (e.tipo || '').toLowerCase()
      return t === 'aula' || t === ''
    })
    if (selectedDay) f = f.filter(e => isSameDay(new Date(e._ts), selectedDay))
    return f
  }, [lista, filter, selectedDay])

  const isGeral = materia === 'geral'

  return (
    <motion.div
      className="lousa-fs-container"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>{fullscreenCss}</style>
      <style>{DAYPICKER_CSS}</style>

      <header className="lousa-fs-header">
        <h1 className="lousa-fs-title">
          Calendário {!isGeral && <>· <span className="lousa-fs-title-materia">{materia}</span></>}
        </h1>
        <p className="lousa-fs-subtitle">
          Provas, trabalhos e aulas {isGeral ? 'de todas as matérias' : `de ${materia}`}.
        </p>
      </header>

      <div className="lousa-fs-split">
        <div className="lousa-fs-cal-card">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            locale={ptBR}
            modifiers={{
              prova: provaDays,
              trabalho: trabalhoDays,
              aula: aulaDays,
            }}
            modifiersClassNames={{
              prova: 'rdp-has-prova',
              trabalho: 'rdp-has-trabalho',
              aula: 'rdp-has-aula',
            }}
            classNames={{ root: 'rdp-point' }}
          />
        </div>

        <div>
          <div className="lousa-fs-tabs" role="tablist" style={{ marginBottom: 16 }}>
            {[
              { id: 'todos',     label: 'Todos' },
              { id: 'provas',    label: 'Provas' },
              { id: 'trabalhos', label: 'Trabalhos' },
              { id: 'aulas',     label: 'Aulas' },
            ].map(t => (
              <button
                key={t.id}
                className={`lousa-fs-tab ${filter === t.id ? 'active' : ''}`}
                onClick={() => setFilter(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {selectedDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontSize: 12, color: '#a1a1aa' }}>
              <span>Filtrando por <strong style={{ color: '#22c55e' }}>{format(selectedDay, "d 'de' MMMM", { locale: ptBR })}</strong></span>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', color: '#a1a1aa', fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                Limpar
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${filter}-${selectedDay?.getTime() || 'all'}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {filtered.length === 0 ? (
                <div className="lousa-fs-empty" style={{ paddingTop: 24 }}>
                  <Calendar className="lousa-fs-empty-icon" />
                  <p className="lousa-fs-empty-title">Nenhum evento {filter !== 'todos' ? `(${filter})` : ''}</p>
                  <p className="lousa-fs-empty-sub">
                    {selectedDay ? 'Nesse dia.' : isGeral ? 'Sem registros ainda.' : 'Pra essa matéria.'}
                  </p>
                </div>
              ) : (
                <div>
                  {filtered.map((ev, i) => {
                    const ts = typeOf(ev)
                    return (
                      <motion.div
                        key={ev.id || i}
                        className="lousa-fs-evento-item"
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                      >
                        <span className="lousa-fs-evento-icon" style={{ background: `${ts.color}1a`, color: ts.color }}>
                          <ts.Icon size={14} strokeWidth={1.8} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="lousa-fs-evento-title">{ev.titulo}</p>
                          <p className="lousa-fs-evento-meta">
                            {ts.label} · {format(new Date(ev._ts), "EEE, d 'de' MMM", { locale: ptBR })} · <span style={{ color: ts.color, fontWeight: 600 }}>{deltaLabel(ev._ts)}</span>
                            {isGeral && ev.materia ? ` · ${ev.materia}` : ''}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div style={{ marginTop: 18 }}>
            <button className="lousa-cta-btn" disabled title="Disponível em breve">
              <CalendarPlus size={14} strokeWidth={2} /> Novo evento
            </button>
            <p className="lousa-fs-disabled-hint">Criação direta chega na próxima onda.</p>
          </div>
        </div>
      </div>

      <style>{sharedItemCss}</style>
    </motion.div>
  )
}

const DAYPICKER_CSS = `
  .rdp-point{
    --rdp-accent-color: #22c55e;
    --rdp-accent-background-color: rgba(34,197,94,.18);
    --rdp-day-height: 38px;
    --rdp-day-width: 38px;
    --rdp-day_button-height: 32px;
    --rdp-day_button-width: 32px;
    --rdp-day_button-border-radius: 10px;
    --rdp-font-family: inherit;
    --rdp-nav-height: 36px;
    --rdp-shadow_focus-color: rgba(34,197,94,.35);
    color:#d4d4d8;
    font-size:13px;
  }
  .rdp-point .rdp-month_caption{font-weight:700;color:#f4f4f5;font-size:13.5px;text-transform:capitalize;padding:4px 0 8px}
  .rdp-point .rdp-nav button{color:#a1a1aa;background:none;border-radius:8px;transition:background .15s,color .15s}
  .rdp-point .rdp-nav button:hover:not(:disabled){background:rgba(255,255,255,.05);color:#e4e4e7}
  .rdp-point .rdp-weekday{color:#52525b;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
  .rdp-point .rdp-day_button{color:#d4d4d8;font-weight:500;background:none;border:1px solid transparent;transition:background .15s,border-color .15s,color .15s}
  .rdp-point .rdp-day_button:hover:not([disabled]){background:rgba(255,255,255,.04);color:#f4f4f5}
  .rdp-point .rdp-day.rdp-today .rdp-day_button{color:#22c55e;border-color:rgba(34,197,94,.35);font-weight:700}
  .rdp-point .rdp-day.rdp-selected .rdp-day_button{background:#22c55e;color:#0a0a0a;font-weight:700;border-color:#22c55e}
  .rdp-point .rdp-day.rdp-outside .rdp-day_button{color:#3f3f46}
  .rdp-point .rdp-day.rdp-disabled .rdp-day_button{color:#27272a}
  .rdp-point .rdp-day.rdp-has-prova .rdp-day_button{position:relative}
  .rdp-point .rdp-day.rdp-has-prova .rdp-day_button::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#f87171}
  .rdp-point .rdp-day.rdp-has-trabalho .rdp-day_button::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#fbbf24}
  .rdp-point .rdp-day.rdp-has-aula .rdp-day_button::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#22c55e}
`
