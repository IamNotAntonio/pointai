'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as db from '../lib/db'
import { Bell, Calendar, AlertTriangle, BarChart2, BookOpen, CheckCircle } from 'lucide-react'

/* ── Icons ───────────────────────────────────────────────────── */
function NotifIcon({ tipo }) {
  const IC = { size: 16, strokeWidth: 1.8 }
  if (tipo === 'prova')  return <Calendar {...IC} />
  if (tipo === 'falta')  return <AlertTriangle {...IC} />
  if (tipo === 'media')  return <BarChart2 {...IC} />
  if (tipo === 'estudo') return <BookOpen {...IC} />
  return <Bell {...IC} />
}

/* ── Notification data ───────────────────────────────────────── */
// `materias` é o modelo NOVO (db.getMaterias): array de
// {nome, faltas, total_aulas, limite_faltas, media_aprovacao, avaliacoes:[{nota,peso}]}.
function gerarNotificacoes(perfil, materias, eventos, lastAccess) {
  const notifs = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // 1. Provas próximas (≤ 7 dias)
  if (Array.isArray(eventos)) {
    eventos.forEach(e => {
      const tipo = (e.tipo || '').toLowerCase()
      if (tipo !== 'prova') return
      const dataEvento = new Date(e.data + 'T12:00:00')
      const diff = Math.ceil((dataEvento - hoje) / (1000 * 60 * 60 * 24))
      if (diff < 0 || diff > 7) return
      const materia = e.materia || e.titulo || ''
      const quando = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`
      notifs.push({
        id: `prova_${e.id || e.titulo}_${e.data}`,
        tipo: 'prova',
        titulo: `Prova ${quando}`,
        mensagem: materia + (materia ? ' · ' : '') + dataEvento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        urgencia: diff <= 2 ? 'alta' : 'media',
        link: '/calendario',
      })
    })
  }

  // 2. Limite de faltas (≤ 3 restantes) — usa o limite REAL configurado
  // (coluna limite_faltas). Sem limite definido (null) → não notifica.
  if (Array.isArray(materias)) {
    materias.forEach(m => {
      if (!m) return
      if (m.limite_faltas == null) return
      const limite    = Number(m.limite_faltas)
      const faltas    = Number(m.faltas) || 0
      const restantes = limite - faltas
      if (restantes < 0 || restantes > 3) return
      notifs.push({
        id: `faltas_${m.nome}`,
        tipo: 'falta',
        titulo: restantes === 0 ? 'Limite de faltas atingido!' : `${restantes} falta${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}`,
        mensagem: m.nome,
        urgencia: restantes === 0 ? 'alta' : 'media',
        link: '/notas',
      })
    })
  }

  // 3. Média abaixo da meta — média ponderada (calcularMedia) vs meta da matéria
  if (Array.isArray(materias)) {
    materias.forEach(m => {
      if (!m) return
      const media = db.calcularMedia(m.avaliacoes)
      if (media == null) return
      const meta = Number(m.media_aprovacao) || 7
      if (media >= meta) return
      notifs.push({
        id: `media_${m.nome}`,
        tipo: 'media',
        titulo: `Média ${media.toFixed(1)} em ${m.nome}`,
        mensagem: `Abaixo da meta de aprovação (${meta.toFixed(1).replace('.', ',')})`,
        urgencia: media < meta - 2 ? 'alta' : 'baixa',
        link: '/notas',
      })
    })
  }

  // 4. Sugestão de estudo (≥ 3 dias sem acessar)
  const lista = perfil?.materias?.split(',').map(m => m.trim()).filter(Boolean) || []
  lista.slice(0, 6).forEach(materia => {
    const ultimo = lastAccess?.[materia]
    if (!ultimo) return
    const dias = Math.floor((Date.now() - ultimo) / (1000 * 60 * 60 * 24))
    if (dias < 3) return
    notifs.push({
      id: `estudo_${materia}`,
      tipo: 'estudo',
      titulo: `Revisar ${materia}`,
      mensagem: `${dias} dia${dias !== 1 ? 's' : ''} sem acessar`,
      urgencia: 'baixa',
      link: `/dashboard/chat?materia=${encodeURIComponent(materia)}`,
      materia,
    })
  })

  return notifs
}

// Espelhos locais (perfil/eventos/lastAccess/lidas). Notas NÃO estão mais
// aqui: vêm do Supabase via db.getMaterias() (modelo novo), carregado async.
function lerLocal() {
  try {
    const perfil     = JSON.parse(localStorage.getItem('pointai_perfil')         || 'null')
    const eventos    = JSON.parse(localStorage.getItem('pointai_eventos')        || '[]')
    const lastAccess = JSON.parse(localStorage.getItem('pointai_last_access')    || '{}')
    const lidas      = JSON.parse(localStorage.getItem('pointai_notifs_lidas')   || '[]')
    return { perfil, eventos, lastAccess, lidas }
  } catch {
    return { perfil: null, eventos: [], lastAccess: {}, lidas: [] }
  }
}

/* ── Component ───────────────────────────────────────────────── */
export default function Notificacoes() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [lidas,  setLidas]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('pointai_notifs_lidas') || '[]') } catch { return [] }
  })

  // Carrega matérias (modelo novo) uma vez e recalcula as notificações.
  // getMaterias PROPAGA erro / exige sessão — se falhar (deslogado/offline),
  // seguimos sem os alertas de nota/falta (apenas provas/estudo).
  useEffect(() => {
    let vivo = true
    db.getMaterias()
      .then(ms => {
        if (!vivo) return
        const { perfil, eventos, lastAccess } = lerLocal()
        setNotifs(gerarNotificacoes(perfil, ms || [], eventos, lastAccess))
      })
      .catch(() => {
        if (!vivo) return
        const { perfil, eventos, lastAccess } = lerLocal()
        setNotifs(gerarNotificacoes(perfil, [], eventos, lastAccess))
      })
    return () => { vivo = false }
  }, [])

  const abrir = useCallback(() => setAberto(true), [])

  function marcarLida(id) {
    const novas = [...lidas, id]
    setLidas(novas)
    localStorage.setItem('pointai_notifs_lidas', JSON.stringify(novas))
  }

  function marcarTodasLidas() {
    const ids = notifs.map(n => n.id)
    setLidas(ids)
    localStorage.setItem('pointai_notifs_lidas', JSON.stringify(ids))
  }

  function clicar(notif) {
    marcarLida(notif.id)
    setAberto(false)
    router.push(notif.link)
  }

  // Badge e contador de não lidas derivam do mesmo estado (notifs carrega
  // async via getMaterias; provas/estudo não dependem de rede).
  const naoLidas = notifs.filter(n => !lidas.includes(n.id)).length
  const badge = naoLidas

  return (
    <>
      {/* Bell trigger */}
      <button className="sb-bell-btn" onClick={abrir} aria-label="Notificações" title="Notificações">
        <Bell size={16} strokeWidth={1.8} />
        {badge > 0 && (
          <span className="sb-bell-badge">{badge > 9 ? '9+' : badge}</span>
        )}
      </button>

      {/* Panel */}
      {aberto && (
        <>
          <div className="sb-notif-backdrop" onClick={() => setAberto(false)} />
          <div className="sb-notif-panel">
            {/* Header */}
            <div className="sb-notif-header">
              <div>
                <p className="sb-notif-title">Notificações</p>
                {naoLidas > 0 && (
                  <p className="sb-notif-sub">{naoLidas} não lida{naoLidas !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {naoLidas > 0 && (
                  <button className="sb-notif-readall" onClick={marcarTodasLidas}>
                    Marcar todas como lidas
                  </button>
                )}
                <button className="sb-notif-close" onClick={() => setAberto(false)}>×</button>
              </div>
            </div>

            {/* List */}
            <div className="sb-notif-list">
              {notifs.length === 0 ? (
                <div className="sb-notif-empty">
                  <CheckCircle size={32} strokeWidth={1.5} style={{ color: '#22c55e' }} />
                  <p>Tudo em dia! Nenhum alerta no momento.</p>
                </div>
              ) : (
                notifs.map(notif => {
                  const isLida = lidas.includes(notif.id)
                  return (
                    <button
                      key={notif.id}
                      className={`sb-notif-item urgencia-${notif.urgencia} ${isLida ? 'lida' : ''}`}
                      onClick={() => clicar(notif)}
                    >
                      <span className={`sb-notif-icon sb-notif-icon-${notif.tipo}`}>
                        <NotifIcon tipo={notif.tipo} />
                      </span>
                      <div className="sb-notif-content">
                        <p className="sb-notif-item-title">{notif.titulo}</p>
                        <p className="sb-notif-item-msg">{notif.mensagem}</p>
                      </div>
                      {!isLida && <span className="sb-notif-dot" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
