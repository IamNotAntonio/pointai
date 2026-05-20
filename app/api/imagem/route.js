// POST { prompt, materia } → { url }  (DALL-E 3)

/* ── Sensitive term substitutions (PT → neutral EN) ── */
const SUBSTITUTIONS = [
  // Mental health — replace before anything else
  [/\bsuicíd[io]\w*/gi,            ''],
  [/\bautolesã[oo]\w*/gi,          ''],
  [/\bautomutilação\w*/gi,         ''],
  [/\bdepress[aã][oã]\w*/gi,       'mental health conditions'],
  [/\bansiedade\w*/gi,             'anxiety disorder'],
  [/\btranstorno\w*/gi,            'medical condition'],
  [/\besquizofrenia\w*/gi,         'psychiatric disorder'],
  [/\btranstorno\s+bipolar\w*/gi,  'bipolar spectrum disorder'],
  [/\bvício\w*/gi,                 'substance use disorder'],
  [/\bdepressed\w*/gi,             'mental health conditions'],
  // Violence / weapons
  [/\bviolência\w*/gi,             'public health impact'],
  [/\bguerra\w*/gi,                'conflict history'],
  [/\barma\w*/gi,                  'historical artifact'],
  [/\bbomba\w*/gi,                 'historical event'],
  // Anatomy — keep but make clinical
  [/\bnú\w*/gi,                    'anatomical model'],
  [/\bdesnud\w*/gi,                'anatomical model'],
]

function sanitize(raw) {
  let s = raw
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    s = s.replace(pattern, replacement)
  }
  // Collapse multiple spaces left by removals
  return s.replace(/\s{2,}/g, ' ').trim()
}

function buildPrompt(subject, materia, minimal = false) {
  const base = sanitize(subject).slice(0, 300) || 'academic concept'

  if (minimal) {
    // Maximally conservative fallback — no subject paraphrase, pure style
    return [
      `Scientific educational diagram for a university textbook: ${base}.`,
      'Style: schematic illustration, labeled in English, white background,',
      'neutral academic colors, no people, no faces, no body parts,',
      'purely diagrammatic, clinical, informative.',
    ].join(' ')
  }

  return [
    `Academic educational diagram/illustration: ${base}.`,
    materia ? `University subject: ${materia}.` : '',
    'Style: clean scientific diagram, labels in Brazilian Portuguese,',
    'white background, scientifically accurate colors,',
    'educational, clinical, neutral, academic textbook style,',
    'no people, no faces, diagrammatic representation only.',
  ].filter(Boolean).join(' ')
}

function isContentPolicyError(status, bodyText) {
  if (status === 400) return true
  const low = bodyText.toLowerCase()
  return low.includes('safety') || low.includes('content_policy') || low.includes('violated')
}

async function callDallE(prompt) {
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
      response_format: 'url',
    }),
    signal: AbortSignal.timeout(60000),
  })

  const bodyText = await resp.text()
  return { status: resp.status, ok: resp.ok, bodyText }
}

export async function POST(req) {
  try {
    const { prompt, materia } = await req.json()
    if (!prompt?.trim()) return Response.json({ erro: 'Prompt vazio.' }, { status: 400 })

    // First attempt — full academic prompt
    const prompt1 = buildPrompt(prompt, materia, false)
    const attempt1 = await callDallE(prompt1)

    if (attempt1.ok) {
      const data = JSON.parse(attempt1.bodyText)
      const url  = data.data?.[0]?.url
      if (url) return Response.json({ url })
    }

    // Second attempt — minimal fallback if content policy triggered
    if (isContentPolicyError(attempt1.status, attempt1.bodyText)) {
      console.warn('[imagem] content policy on attempt 1, retrying with minimal prompt')

      const prompt2   = buildPrompt(prompt, materia, true)
      const attempt2  = await callDallE(prompt2)

      if (attempt2.ok) {
        const data = JSON.parse(attempt2.bodyText)
        const url  = data.data?.[0]?.url
        if (url) return Response.json({ url })
      }

      if (isContentPolicyError(attempt2.status, attempt2.bodyText)) {
        console.warn('[imagem] content policy on attempt 2, giving up')
        return Response.json({
          erro: 'conteudo',
          mensagem: 'Não foi possível gerar esta imagem por restrições de conteúdo. Tente pedir um diagrama diferente.',
        }, { status: 422 })
      }
    }

    console.error('[imagem] OpenAI error', attempt1.status, attempt1.bodyText.slice(0, 200))
    return Response.json({ erro: 'Erro ao gerar imagem.' }, { status: 502 })

  } catch (err) {
    console.error('[imagem]', err.message)
    return Response.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
