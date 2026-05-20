// POST { texto } → audio/mpeg (OpenAI TTS)
export async function POST(req) {
  try {
    const { texto } = await req.json()
    if (!texto?.trim()) return new Response('Texto vazio.', { status: 400 })

    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'nova',
        input: texto.slice(0, 4096),
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[tts] OpenAI error', resp.status, err)
      return new Response('Erro ao gerar áudio.', { status: 502 })
    }

    const buffer = await resp.arrayBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[tts]', err.message)
    return new Response('Erro interno.', { status: 500 })
  }
}
