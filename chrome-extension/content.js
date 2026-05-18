// Point.AI — Content Script
// Detecta portais acadêmicos (incluindo Canvas LMS) e oferece importação de notas/eventos

;(function () {
  'use strict'

  const POINT_AI_URL = 'https://pointai-two.vercel.app'

  // ── Detecção de Canvas LMS ───────────────────────────────────────
  function isCanvas() {
    const host = location.hostname
    const path = location.pathname

    // URL: qualquer subdomínio de instructure.com ou "canvas" no hostname
    if (/instructure\.com$/i.test(host)) return true
    if (/\bcanvas\b/i.test(host)) return true

    // Meta tags injetadas pelo Canvas
    if (document.querySelector('meta[name="canvas-"]') ||
        document.querySelector('meta[name^="canvas-"]')) return true

    // Elemento raiz com data-context do Canvas
    if (document.querySelector('[data-context="course"]') ||
        document.querySelector('[data-context-id]')) return true

    // JS global ENV que o Canvas injeta em todas as páginas
    if (typeof window.ENV !== 'undefined' && window.ENV?.DOMAIN_ROOT_ACCOUNT_ID) return true

    return false
  }

  // Página atual dentro do Canvas
  function canvasPageType() {
    const p = location.pathname
    if (/\/grades/.test(p))    return 'grades'
    if (/\/calendar/.test(p))  return 'calendar'
    if (/\/courses/.test(p) && /\/assignments/.test(p)) return 'assignments'
    if (/\/courses/.test(p) && /\/modules/.test(p))     return 'modules'
    if (/\/courses$|\/courses\/?$/.test(p))             return 'courses'
    return 'other'
  }

  // ── Extração Canvas: página /grades ─────────────────────────────
  function extrairCanvasGrades() {
    const linhas = ['=== Canvas LMS — Notas ===']
    linhas.push(`URL: ${location.href}`)
    linhas.push(`Página: ${document.title}`)
    linhas.push('')

    // Tabela principal de notas do Canvas
    const rows = document.querySelectorAll(
      '#grades_summary tr, .student_assignment, [class*="grade-summary"] tr, ' +
      '.gradebook-header, table.summary tr'
    )

    if (rows.length > 0) {
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th'))
          .map(c => c.innerText.replace(/\s+/g, ' ').trim())
          .filter(c => c.length > 0)
        if (cells.length >= 2) linhas.push(cells.join(' | '))
      })
    } else {
      // Fallback: capturar via seletores de nota conhecidos do Canvas
      const gradeEls = document.querySelectorAll(
        '.score, .grade, .points, .assignment-name, ' +
        '[class*="score"], [class*="grade_entry"], .assignment_score, ' +
        '.final_grade, .course_grade'
      )
      gradeEls.forEach(el => {
        const text = el.innerText.replace(/\s+/g, ' ').trim()
        if (text.length > 1 && text.length < 200) linhas.push(text)
      })
    }

    // Nota final / GPA
    const finalGrade = document.querySelector(
      '.final_grade .grade, .total_grade .grade, ' +
      '[class*="total-grade"], [data-testid="grade-summary-total"]'
    )
    if (finalGrade) {
      linhas.push('')
      linhas.push(`Nota final: ${finalGrade.innerText.trim()}`)
    }

    return linhas.join('\n')
  }

  // ── Extração Canvas: página /calendar ───────────────────────────
  function extrairCanvasCalendar() {
    const linhas = ['=== Canvas LMS — Calendário ===']
    linhas.push(`URL: ${location.href}`)
    linhas.push('')

    // Eventos no calendário do Canvas (FullCalendar)
    const eventEls = document.querySelectorAll(
      '.fc-event, .fc-event-title, [class*="event_title"], ' +
      '.calendar_event, .assignment_event, [data-event-id]'
    )

    if (eventEls.length > 0) {
      const vistos = new Set()
      eventEls.forEach(el => {
        const title = el.innerText.replace(/\s+/g, ' ').trim()
        if (title.length < 2 || vistos.has(title)) return
        vistos.add(title)

        // Tentar pegar a data do elemento pai ou atributo
        const wrapper  = el.closest('[data-date], [data-event-id], .fc-event-container, li')
        const dataAttr = wrapper?.getAttribute('data-date') ||
                         wrapper?.getAttribute('data-start-date') || ''

        linhas.push(dataAttr ? `${dataAttr}: ${title}` : title)
      })
    } else {
      // Fallback: agenda view ou lista de upcoming
      const agenda = document.querySelectorAll(
        '.agenda-event__item, .event-details, [class*="upcoming"], ' +
        '.scheduler-event, .planner-item'
      )
      agenda.forEach(el => {
        const text = el.innerText.replace(/\s+/g, ' ').trim()
        if (text.length > 2 && text.length < 400) linhas.push(text)
      })
    }

    if (linhas.length <= 3) {
      // Último recurso: main content
      const main = document.querySelector('#main, #content, [role="main"]') || document.body
      linhas.push(main.innerText.slice(0, 4000))
    }

    return linhas.join('\n')
  }

  // ── Extração Canvas: qualquer outra página ───────────────────────
  function extrairCanvasGenerico() {
    const linhas = [`=== Canvas LMS — ${document.title} ===`]
    linhas.push(`URL: ${location.href}`)
    linhas.push('')

    // Assignments/módulos
    const items = document.querySelectorAll(
      '.ig-row, .assignment, [class*="assignment"], ' +
      '.module_item, [class*="module-item"], ' +
      '.student_submission, [data-assignment-id]'
    )
    if (items.length > 0) {
      items.forEach(el => {
        const text = el.innerText.replace(/\s+/g, ' ').trim()
        if (text.length > 2 && text.length < 400) linhas.push(text)
      })
      return linhas.join('\n')
    }

    // Generic fallback
    const main = document.querySelector('#main, #content, [role="main"]') || document.body
    linhas.push(main.innerText.slice(0, 5000))
    return linhas.join('\n')
  }

  // ── Selector: qual extrator usar ─────────────────────────────────
  function extrairDados() {
    if (isCanvas()) {
      const pageType = canvasPageType()
      if (pageType === 'grades')   return extrairCanvasGrades()
      if (pageType === 'calendar') return extrairCanvasCalendar()
      return extrairCanvasGenerico()
    }
    return extrairTabelasGenericas()
  }

  // ── Extração genérica (portais não-Canvas) ───────────────────────
  function extrairTabelasGenericas() {
    const linhas = []
    const tables = Array.from(document.querySelectorAll('table'))

    const gradeWords   = ['nota', 'grade', 'avaliação', 'prova', 'pontos', 'conceito', 'média']
    const absenceWords = ['falta', 'frequência', 'presença', 'ausência']

    for (const table of tables) {
      const headerText = Array.from(table.querySelectorAll('th, thead td'))
        .map(el => el.innerText.trim().toLowerCase()).join(' ')

      if (!gradeWords.some(w => headerText.includes(w)) &&
          !absenceWords.some(w => headerText.includes(w))) continue

      for (const row of Array.from(table.rows)) {
        const cells = Array.from(row.cells)
          .map(c => c.innerText.replace(/\s+/g, ' ').trim())
          .filter(c => c.length > 0)
        if (cells.length >= 2) linhas.push(cells.join('\t'))
      }
    }

    if (linhas.length === 0) {
      const selectors = [
        '.disciplina', '.materia', '.subject', '.course',
        '[class*="grade"]', '[class*="nota"]', '[class*="disciplina"]',
        '[class*="subject"]', '[class*="course"]',
      ]
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel)
        if (els.length > 0) {
          els.forEach(el => {
            const text = el.innerText.replace(/\s+/g, ' ').trim()
            if (text.length > 5 && text.length < 500) linhas.push(text)
          })
          break
        }
      }
    }

    if (linhas.length === 0) {
      const main = document.querySelector(
        'main, [role="main"], #main-content, #content, .content, .container'
      ) || document.body
      return main.innerText.slice(0, 5000)
    }

    return linhas.join('\n')
  }

  // ── Detecção de portal acadêmico (genérico) ──────────────────────
  const URL_PATTERNS = [
    /siga[a]?\./i, /moodle\./i, /totvs\./i, /suagrade\./i,
    /sapiens\./i, /academico\./i, /siabi\./i, /sigac\./i,
    /aluno\..*\.edu/i, /portal\..*\.edu/i, /sistema\..*\.edu/i,
    /ava\./i, /intranet\..*edu/i, /sga\./i, /sgce\./i,
    /portal\.kroton/i, /portal\.anhanguera/i, /portal\.ampli/i,
    /graduacao\./i, /pos\./i,
  ]

  const CONTENT_KEYWORDS = [
    'nota final', 'média final', 'frequência', 'diário de classe',
    'avaliação parcial', 'conceito', 'aprovado', 'reprovado',
    'matrícula', 'disciplina cursada', 'grau',
  ]

  function isAcademicPortal() {
    if (location.hostname.includes('pointai-two')) return false
    if (!location.hostname) return false
    if (isCanvas()) return true
    if (URL_PATTERNS.some(p => p.test(location.hostname + location.pathname))) return true

    const bodyText = (document.body?.innerText || '').toLowerCase().slice(0, 3000)
    return CONTENT_KEYWORDS.filter(k => bodyText.includes(k)).length >= 2
  }

  // ── Label contextual do botão ─────────────────────────────────────
  function labelBotao() {
    if (!isCanvas()) return 'Importar para Point.AI'
    const t = canvasPageType()
    if (t === 'grades')   return 'Importar notas → Point.AI'
    if (t === 'calendar') return 'Importar eventos → Point.AI'
    return 'Importar → Point.AI'
  }

  // ── UI: Botão flutuante ──────────────────────────────────────────
  function injetarBotao() {
    if (document.getElementById('pointai-fab')) return

    const wrap = document.createElement('div')
    wrap.id = 'pointai-fab-wrap'
    Object.assign(wrap.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: '2147483647', display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: '10px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    })

    const toast = document.createElement('div')
    toast.id = 'pointai-toast'
    Object.assign(toast.style, {
      background: '#141414', color: '#f4f4f5',
      padding: '10px 14px', borderRadius: '10px',
      fontSize: '12px', lineHeight: '1.5',
      maxWidth: '280px', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
      border: '1px solid rgba(34,197,94,.35)',
      display: 'none', textAlign: 'left',
    })
    wrap.appendChild(toast)

    const btn = document.createElement('button')
    btn.id = 'pointai-fab'
    btn.setAttribute('title', 'Importar para Point.AI')
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span style="font-size:13px;font-weight:700;letter-spacing:-.2px">${labelBotao()}</span>
    `
    Object.assign(btn.style, {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '11px 18px',
      background: 'linear-gradient(135deg,#1a7a4a,#22c55e)',
      color: 'white', border: 'none', borderRadius: '50px',
      cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,122,74,.5)',
      transition: 'transform .15s, box-shadow .15s', whiteSpace: 'nowrap',
    })

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)'
      btn.style.boxShadow = '0 6px 28px rgba(26,122,74,.65)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)'
      btn.style.boxShadow = '0 4px 20px rgba(26,122,74,.5)'
    })

    btn.addEventListener('click', () => {
      const label = btn.querySelector('span')
      btn.disabled = true
      btn.style.opacity = '.7'
      label.textContent = 'Extraindo dados...'

      try {
        const dados = extrairDados()
        const fonte = { url: location.href, titulo: document.title }

        chrome.runtime.sendMessage(
          { type: 'SAVE_IMPORT_DATA', dados, fonte },
          (resp) => {
            btn.disabled = false
            btn.style.opacity = '1'
            label.textContent = labelBotao()

            if (resp?.ok) {
              mostrarToast(
                '✓ Dados capturados! O Point.AI foi aberto numa nova aba — clique em "Importar do portal" para confirmar.'
              )
            } else {
              mostrarToast('Erro ao capturar dados. Tente pela opção "Outros portais → Colar texto" no Point.AI.')
            }
          }
        )
      } catch {
        btn.disabled = false
        btn.style.opacity = '1'
        label.textContent = labelBotao()
        mostrarToast('Erro ao ler a página. Tente pela opção "Outros portais → Colar texto" no Point.AI.')
      }
    })

    wrap.appendChild(btn)
    document.body.appendChild(wrap)

    if (!document.getElementById('pointai-css')) {
      const style = document.createElement('style')
      style.id = 'pointai-css'
      style.textContent = `
        @keyframes pointai-fadein {
          from { opacity:0; transform:translateY(4px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `
      document.head.appendChild(style)
    }
  }

  function mostrarToast(msg, duracao = 5500) {
    const toast = document.getElementById('pointai-toast')
    if (!toast) return
    toast.textContent = msg
    toast.style.display = 'block'
    clearTimeout(toast._timer)
    toast._timer = setTimeout(() => { toast.style.display = 'none' }, duracao)
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'IMPORT_QUEUED') {
      mostrarToast('✓ Dados capturados! Abrindo Point.AI...')
    }
  })

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    if (!isAcademicPortal()) return
    injetarBotao()
    // Atualizar label do botão quando a URL muda dentro de SPAs (Canvas é SPA)
    const fab = document.getElementById('pointai-fab')
    if (fab) {
      const span = fab.querySelector('span')
      if (span) span.textContent = labelBotao()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Re-check em SPAs (Canvas usa pushState para navegar)
  let lastUrl = location.href
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      setTimeout(init, 800)
    }
  }).observe(document.body, { childList: true, subtree: true })
})()
