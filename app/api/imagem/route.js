// POST { prompt, materia } → { url }  (DALL-E 3 + Stability AI fallback)

/* ── Sanitize ────────────────────────────────────────────────────── */
const SENSITIVE = [
  [/\bsuicíd\w*/gi,        ''],
  [/\bautolesã[oo]\w*/gi,  ''],
  [/\bautomutilação\w*/gi, ''],
  [/\bviolência\w*/gi,     'impact'],
  [/\barma\w*/gi,          'tool'],
  [/\bbomba\w*/gi,         'device'],
  [/\bnú\b|\bdesnud\w*/gi, 'anatomical model'],
]

function sanitize(text) {
  let s = text
  for (const [pat, rep] of SENSITIVE) s = s.replace(pat, rep)
  return s.replace(/\s{2,}/g, ' ').trim()
}

/* ── Prompt builders ─────────────────────────────────────────────── */
function buildDallePrompt(subject, materia) {
  const label = sanitize(subject).slice(0, 120) || 'academic topic'
  return [
    `Clean educational infographic diagram with central concept labeled "${label}",`,
    'interconnected labeled nodes, directional arrows, and geometric shapes.',
    materia ? `Academic subject area: ${materia}.` : '',
    'Style: flat design vector illustration, blue and green color palette,',
    'white background, minimal icons, clear sans-serif typography,',
    'professional educational poster layout.',
    'No photographs. No realistic human imagery. Purely schematic and diagrammatic.',
  ].filter(Boolean).join(' ')
}

function buildStabilityPrompt(subject) {
  const label = sanitize(subject).slice(0, 100) || 'academic topic'
  return (
    `colorful educational mind map diagram about ${label}, ` +
    'labeled nodes and connecting arrows, flat design infographic, ' +
    'white background, blue green color palette, clean minimal style, ' +
    'professional scientific illustration, no people'
  )
}

/* ── Content-policy detection ────────────────────────────────────── */
function isContentPolicyError(status, bodyText) {
  // OpenAI returns 400 for content_policy_violation specifically
  // (not all 400s are policy errors — 400 can also be malformed requests)
  if (status !== 400) return false
  try {
    const parsed = JSON.parse(bodyText)
    const code   = parsed?.error?.code || ''
    const msg    = (parsed?.error?.message || '').toLowerCase()
    return (
      code === 'content_policy_violation' ||
      msg.includes('safety system') ||
      msg.includes('content_policy') ||
      msg.includes('violat')
    )
  } catch {
    const low = bodyText.toLowerCase()
    return low.includes('safety') || low.includes('content_policy') || low.includes('violat')
  }
}

/* ── DALL-E 3 call ───────────────────────────────────────────────── */
async function callDallE(prompt) {
  const hasKey = !!process.env.OPENAI_API_KEY
  console.log('[imagem/dalle] key present:', hasKey, '| prompt length:', prompt.length)

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
    signal: AbortSignal.timeout(60000),
  })

  const bodyText = await resp.text()
  console.log('[imagem/dalle] status:', resp.status, '| body:', bodyText.slice(0, 300))
  return { status: resp.status, ok: resp.ok, bodyText }
}

/* ── Stability AI call (fallback) ────────────────────────────────── */
async function callStability(prompt) {
  const key = process.env.STABILITY_API_KEY
  console.log('[imagem/stability] key present:', !!key)
  if (!key) return null

  try {
    const form = new FormData()
    form.append('prompt', prompt)
    form.append('output_format', 'webp')
    form.append('model', 'sd3-medium')

    console.log('[imagem/stability] calling endpoint | prompt length:', prompt.length)

    const resp = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Accept': 'image/*',
      },
      body: form,
      signal: AbortSignal.timeout(60000),
    })

    const contentType = resp.headers.get('content-type') || ''
    console.log('[imagem/stability] status:', resp.status, '| content-type:', contentType)

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('[imagem/stability] error response:', resp.status, errText.slice(0, 400))
      return null
    }

    // Response is raw binary image — read as ArrayBuffer and convert to base64
    const buffer = await resp.arrayBuffer()
    console.log('[imagem/stability] received bytes:', buffer.byteLength)

    if (buffer.byteLength === 0) {
      console.error('[imagem/stability] empty response body')
      return null
    }

    const base64    = Buffer.from(buffer).toString('base64')
    const mimeType  = contentType.split(';')[0].trim() || 'image/webp'
    return `data:${mimeType};base64,${base64}`

  } catch (err) {
    console.error('[imagem/stability] exception:', err.message, err.stack?.split('\n')[1])
    return null
  }
}

/* ── Route handler ───────────────────────────────────────────────── */
export async function POST(req) {
  try {
    const { prompt, materia } = await req.json()
    if (!prompt?.trim()) return Response.json({ erro: 'Prompt vazio.' }, { status: 400 })

    console.log('[imagem] request — subject:', prompt.slice(0, 80), '| materia:', materia)

    // Attempt 1: DALL-E 3
    const attempt1 = await callDallE(buildDallePrompt(prompt, materia))

    if (attempt1.ok) {
      const data = JSON.parse(attempt1.bodyText)
      const url  = data.data?.[0]?.url
      if (url) {
        console.log('[imagem] DALL-E success')
        return Response.json({ url })
      }
    }

    // Any DALL-E failure → try Stability AI as fallback
    const isPolicy = isContentPolicyError(attempt1.status, attempt1.bodyText)
    console.warn('[imagem] DALL-E failed (status:', attempt1.status, ', policy:', isPolicy, ') — trying Stability AI')

    const stabilityUrl = await callStability(buildStabilityPrompt(prompt))
    if (stabilityUrl) {
      console.log('[imagem] Stability success')
      return Response.json({ url: stabilityUrl, source: 'stability' })
    }

    if (isPolicy) {
      console.warn('[imagem] both providers blocked by content policy')
      return Response.json({
        erro: 'conteudo',
        mensagem: 'Não foi possível gerar esta imagem por restrições de conteúdo. Tente pedir um diagrama diferente.',
      }, { status: 422 })
    }

    console.error('[imagem] all providers failed | DALL-E:', attempt1.status, attempt1.bodyText.slice(0, 300))
    return Response.json({
      erro: 'Erro ao gerar imagem.',
      debug: { status: attempt1.status, body: attempt1.bodyText.slice(0, 300) },
    }, { status: 502 })

  } catch (err) {
    console.error('[imagem] exception:', err.message)
    return Response.json({ erro: 'Erro interno.', debug: err.message }, { status: 500 })
  }
}
