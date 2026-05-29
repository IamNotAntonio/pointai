// .ics parsing is pure text work — no node-ical dependency needed. This is a
// server port of the client parser already used in /calendario, so imports from
// the global modal and the page behave identically.
export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB — .ics files are tiny

function jsonError(code, status = 400) {
  return Response.json({ error: code }, { status })
}

// Default tipo is 'prova' (not 'aula') to match the existing calendário, whose
// badge config only knows prova/trabalho/apresentacao.
function detectarTipo(titulo = '', descricao = '') {
  const txt = (titulo + ' ' + descricao).toLowerCase()
  if (/prova|avalia[cç][aã]o|exame|teste/.test(txt)) return 'prova'
  if (/trabalho|entrega|tcc|relat[oó]rio/.test(txt)) return 'trabalho'
  if (/apresenta[cç][aã]o|semin[aá]rio|defesa/.test(txt)) return 'apresentacao'
  return 'prova'
}

function parseICSDate(raw = '') {
  const val = raw.includes(':') ? raw.split(':').pop() : raw
  const clean = val.replace(/Z$/, '').replace(/[^0-9T]/g, '').trim()
  const d = clean.replace('T', '').slice(0, 8)
  if (d.length < 8) return null
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

function parseICS(text) {
  const eventos = []
  const unfolded = text.replace(/\r?\n[ \t]/g, '') // RFC 5545 line unfolding
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of blocks) {
    const endIdx = block.search(/END:VEVENT/i)
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block
    const lines = body.split(/\r?\n/).filter(Boolean)

    const props = {}
    for (const line of lines) {
      const sep = line.indexOf(':')
      if (sep < 0) continue
      const key = line.slice(0, sep).split(';')[0].toUpperCase()
      const value = line.slice(sep + 1).replace(/\\n/g, ' ').replace(/\\,/g, ',').trim()
      props[key] = value
    }

    if (!props.DTSTART) continue
    const data = parseICSDate(props.DTSTART)
    if (!data) continue

    eventos.push({
      titulo: (props.SUMMARY || 'Evento sem título').slice(0, 120),
      data,
      data_fim: props.DTEND ? parseICSDate(props.DTEND) : undefined,
      descricao: (props.DESCRIPTION || '').slice(0, 280),
      tipo: detectarTipo(props.SUMMARY || '', props.DESCRIPTION || ''),
    })
  }

  // Keep past events too — the preview lets the user decide what to import.
  return eventos.sort((a, b) => a.data.localeCompare(b.data))
}

export async function POST(req) {
  let file
  try {
    const form = await req.formData()
    file = form.get('file')
  } catch {
    return jsonError('bad-request', 400)
  }

  if (!file || typeof file.text !== 'function') return jsonError('no-file', 400)
  if (file.size > MAX_BYTES) return jsonError('too-large', 413)

  let text = ''
  try {
    text = await file.text()
  } catch {
    return jsonError('ics-invalid', 422)
  }

  if (!/BEGIN:VEVENT/i.test(text)) return jsonError('ics-invalid', 422)

  const eventos = parseICS(text)
  if (eventos.length === 0) return jsonError('ics-empty', 422)

  return Response.json({ eventos })
}
