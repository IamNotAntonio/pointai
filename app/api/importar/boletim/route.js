import Anthropic from '@anthropic-ai/sdk'

// Vision/document handling — Node runtime for base64 buffer work.
export const runtime = 'nodejs'
export const maxDuration = 60

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_FILES = 10
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024 // 5 MB
const IMG_MEDIA = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

const SISTEMA = `Você extrai dados acadêmicos de capturas de tela e documentos de portais universitários brasileiros (Canvas, TOTVS, SIGA, Moodle etc.).
Analise TODAS as imagens/documentos fornecidos — elas podem ser telas diferentes do mesmo portal (ex.: uma matéria por tela). Consolide tudo em uma única lista.

Retorne JSON estrito no formato:
{
  "materias": [
    {
      "nome": "string (nome da disciplina)",
      "avaliacoes": [{ "nome": "string", "nota": number, "peso": number, "data": "YYYY-MM-DD" }],
      "faltas": number,
      "situacao": "aprovado" | "reprovado" | "cursando"
    }
  ]
}

Regras:
- "peso" default 1 quando não informado. Omita "data" e "situacao" se não estiverem visíveis.
- NUNCA invente dados. Se um dado não estiver visível, omita o campo.
- Notas SEMPRE em escala 0-10 (converta de 0-100 ou conceitos quando necessário).
- "faltas" é o total de faltas (0 se não informado).
- Se nenhuma nota acadêmica estiver visível, retorne {"materias": []}.
- Responda APENAS com o JSON, sem texto antes/depois, sem code fences.`

function jsonError(code, status = 400) {
  return Response.json({ error: code }, { status })
}

function normMediaType(file) {
  const t = (file.type || '').toLowerCase()
  if (t === 'image/jpg') return 'image/jpeg'
  if (IMG_MEDIA.has(t)) return t
  if (t.startsWith('image/')) return t
  if (t === 'application/pdf') return 'application/pdf'
  // Fallback by extension.
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.pdf')) return 'application/pdf'
  return null
}

export async function POST(req) {
  let files
  try {
    const form = await req.formData()
    files = form.getAll('file').filter(f => f && typeof f.arrayBuffer === 'function')
  } catch {
    return jsonError('bad-request', 400)
  }

  if (files.length === 0) return jsonError('no-file', 400)
  if (files.length > MAX_FILES) return jsonError('too-many', 413)

  // Build the multimodal content array: one image/document block per file + final
  // text instruction. PDFs go in natively via document blocks — Claude reads them
  // visually, so we sidestep the unreliable text-extraction path.
  const content = []
  for (const f of files) {
    if (f.size > MAX_BYTES_PER_FILE) return jsonError('too-large', 413)
    const mediaType = normMediaType(f)
    if (!mediaType) return jsonError('bad-type', 415)
    const data = Buffer.from(await f.arrayBuffer()).toString('base64')
    if (mediaType === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } })
    } else {
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
    }
  }
  content.push({
    type: 'text',
    text: `Extraia e consolide todas as notas e faltas visíveis nestes ${files.length} ${files.length === 1 ? 'arquivo' : 'arquivos'}.`,
  })

  let raw = ''
  try {
    const resp = await cliente.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: SISTEMA,
      messages: [{ role: 'user', content }],
    })
    raw = resp.content?.[0]?.text || ''
  } catch {
    return jsonError('ai-failed', 502)
  }

  const parsed = safeParse(raw)
  if (!parsed || !Array.isArray(parsed.materias)) return jsonError('parse-failed', 422)

  const materias = parsed.materias
    .filter(m => m && m.nome)
    .map(m => ({
      nome: String(m.nome).trim(),
      avaliacoes: Array.isArray(m.avaliacoes)
        ? m.avaliacoes
            .filter(a => a && a.nota != null && !Number.isNaN(Number(a.nota)))
            .map(a => ({
              nome: String(a.nome || 'Avaliação').trim(),
              nota: clampNota(Number(a.nota)),
              peso: a.peso != null && !Number.isNaN(Number(a.peso)) ? Number(a.peso) : 1,
              data: typeof a.data === 'string' ? a.data : undefined,
            }))
        : [],
      faltas: m.faltas != null && !Number.isNaN(Number(m.faltas)) ? Math.max(0, Math.round(Number(m.faltas))) : 0,
      situacao: ['aprovado', 'reprovado', 'cursando'].includes(m.situacao) ? m.situacao : undefined,
    }))

  if (materias.length === 0) return jsonError('no-grades', 422)

  return Response.json({ materias })
}

function clampNota(n) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(10, Math.round(n * 100) / 100))
}

function safeParse(raw) {
  if (!raw) return null
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }
  return null
}
