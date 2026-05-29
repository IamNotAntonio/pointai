import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'

// PDF parsing needs the Node runtime (pdfjs), not edge.
export const runtime = 'nodejs'
export const maxDuration = 60

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const MIN_TEXT_CHARS = 40          // below this, treat as a scanned/image PDF

const SISTEMA = `Você extrai dados acadêmicos de boletins/históricos universitários brasileiros. Retorne JSON estrito no formato:
{
  "materias": [
    {
      "nome": "string (nome da disciplina)",
      "avaliacoes": [{ "nome": "string", "nota": number, "peso": number, "data": "YYYY-MM-DD" }],
      "faltas": number,
      "carga_horaria": number,
      "situacao": "aprovado" | "reprovado" | "cursando",
      "escala_original": "string (apenas se a nota não estava em 0-10)"
    }
  ]
}
Regras:
- "peso" default 1 quando não informado.
- Campos opcionais ("data", "carga_horaria", "situacao", "escala_original"): omita se não existir no documento.
- NÃO invente dados. Se o boletim não traz avaliações individuais, devolva "avaliacoes": [] e use a média/nota final como uma única avaliação chamada "Média".
- Notas SEMPRE em escala 0-10. Se o documento usar outra escala (0-100, conceitos A-F etc.), converta para 0-10 e registre a escala em "escala_original".
- "faltas" é o total de faltas da disciplina (0 se não informado).
- Responda APENAS com o JSON, sem texto antes ou depois, sem markdown.`

function jsonError(code, status = 400) {
  return Response.json({ error: code }, { status })
}

export async function POST(req) {
  let file
  try {
    const form = await req.formData()
    file = form.get('file')
  } catch {
    return jsonError('bad-request', 400)
  }

  if (!file || typeof file.arrayBuffer !== 'function') return jsonError('no-file', 400)
  if (file.size > MAX_BYTES) return jsonError('too-large', 413)

  // 1) Extract text from the PDF.
  let texto = ''
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy().catch(() => {})
    texto = (result?.text || '').trim()
  } catch {
    return jsonError('pdf-read-failed', 422)
  }

  if (texto.replace(/\s/g, '').length < MIN_TEXT_CHARS) return jsonError('no-text', 422)

  // Trim very long PDFs so we stay within a sane token budget.
  const trecho = texto.slice(0, 24000)

  // 2) Ask Haiku for structured data.
  let raw = ''
  try {
    const resp = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SISTEMA,
      messages: [{ role: 'user', content: `Extraia dados deste boletim:\n\n${trecho}` }],
    })
    raw = resp.content?.[0]?.text || ''
  } catch {
    return jsonError('ai-failed', 502)
  }

  // 3) Parse the JSON (tolerate stray prose / code fences around it).
  const parsed = safeParse(raw)
  if (!parsed || !Array.isArray(parsed.materias)) return jsonError('parse-failed', 422)

  // Light normalisation so the client preview is predictable.
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
      carga_horaria: m.carga_horaria != null ? Number(m.carga_horaria) : undefined,
      situacao: ['aprovado', 'reprovado', 'cursando'].includes(m.situacao) ? m.situacao : undefined,
      escala_original: typeof m.escala_original === 'string' ? m.escala_original : undefined,
    }))

  if (materias.length === 0) return jsonError('parse-failed', 422)

  return Response.json({ materias })
}

function clampNota(n) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(10, Math.round(n * 100) / 100))
}

function safeParse(raw) {
  if (!raw) return null
  let s = raw.trim()
  // Strip ```json fences if present.
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  // Fallback: grab the outermost {...} block.
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)) } catch {}
  }
  return null
}
