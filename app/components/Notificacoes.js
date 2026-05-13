'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ── Icons ───────────────────────────────────────────────────── */
function IcBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

/* ── Notification data ───────────────────────────────────────── */
function gerarNotificacoes(perfil, notas, eventos, lastAccess) {
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
        emoji: '📅',
      })
    })
  }

  // 2. Limite de faltas (≤ 3 restantes)
  if (notas && typeof notas === 'object') {
    Object.entries(notas).forEach(([materia, dados]) => {
      if (!dados) return
      const totalAulas = Number(dados.totalAulas) || 0
      const faltas    = Number(dados.faltas)      || 0
      if (totalAulas <= 0) return
      const limite    = Math.floor(totalAulas * 0.25)
      const restantes = limite - faltas
      if (restantes < 0 || restantes > 3) return
      notifs.push({
        id: `faltas_${materia}`,
        tipo: 'falta',
        titulo: restantes === 0 ? 'Limite de faltas atingido!' : `${restantes} falta${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}`,
        mensagem: materia,
        urgencia: restantes === 0 ? 'alta' : 'media',
        link: '/notas',
        emoji: '⚠️',
      })
    })
  }

  // 3. Média baixa (< 7.0)
  if (notas && typeof notas === 'object') {
    Object.entries(notas).forEach(([materia, dados]) => {
      const vals = (dados?.notas || []).filter(n => n !== '' && n !== null && n !== undefined)
      if (!vals.length) return
      const media = vals.reduce((s, n) => s + Number(n), 0) / vals.length
      if (media >= 7) return
      notifs.push({
        id: `media_${materia}`,
        tipo: 'media',
        titulo: `Média ${media.toFixed(1)} em ${materia}`,
        mensagem: 'Abaixo do mínimo de aprovação (7,0)',
        urgencia: media < 5 ? 'alta' : 'baixa',
        link: '/notas',
        emoji: '📊',
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
      link: '/dashboard',
      materia,
      emoji: '📚',
    })
  })

  return notifs
}

function lerDados() {
  try {
    const perfil     = JSON.parse(localStorage.getItem('pointai_perfil')         || 'null')
    const notas      = JSON.parse(localStorage.getItem('pointai_notas')          || 'null')
    const eventos    = JSON.parse(localStorage.getItem('pointai_eventos')        || '[]')
    const lastAccess = JSON.parse(localStorage.getItem('pointai_last_access')    || '{}')
    const lidas      = JSON.parse(localStorage.getItem('pointai_notifs_lidas')   || '[]')
    return { perfil, notas, eventos, lastAccess, lidas }
  } catch {
    return { perfil: null, notas: null, eventos: [], lastAccess: {}, lidas: [] }
  }
}

/* ── Component ───────────────────────────────────────────────── */
export default function Notificacoes() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [lidas,  setLidas]  = useState([])

  const abrir = useCallback(() => {
    const { perfil, notas, eventos, lastAccess, lidas: lidasSalvas } = lerDados()
    setLidas(lidasSalvas)
    setNotifs(gerarNotificacoes(perfil, notas, eventos, lastAccess))
    setAberto(true)
  }, [])

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

  // Count using persisted lidas (from localStorage) to avoid stale count before panel opens
  const [lidasCache] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pointai_notifs_lidas') || '[]') } catch { return [] }
  })
  const [notifsCache] = useState(() => {
    const { perfil, notas, eventos, lastAccess } = lerDados()
    return gerarNotificacoes(perfil, notas, eventos, lastAccess)
  })
  const badge = notifsCache.filter(n => !lidasCache.includes(n.id)).length

  const naoLidas = notifs.filter(n => !lidas.includes(n.id)).length

  return (
    <>
      {/* Bell trigger */}
      <button className="sb-bell-btn" onClick={abrir} aria-label="Notificações" title="Notificações">
        <IcBell />
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
                  <p>🎉</p>
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
                        {notif.emoji}
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
