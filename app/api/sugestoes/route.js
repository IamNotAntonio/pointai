import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { curso, universidade, semestre } = await req.json()

  const prompt = `Você é um especialista em currículos universitários brasileiros.

Liste as matérias mais típicas do ${semestre} do curso de ${curso} na ${universidade} no Brasil.

Retorne APENAS um JSON válido, sem explicações, no formato:
{"materias": ["Nome Curto 1", "Nome Curto 2", ...]}

Use nomes curtos e diretos (ex: "Cálculo I" em vez de "Cálculo Diferencial e Integral I").
Liste entre 5 e 8 matérias relevantes para esse semestre específico.`

  try {
    const resp = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const texto = resp.content[0].text
    const match = texto.match(/\{[\s\S]*\}/)
    if (match) {
      const json = JSON.parse(match[0])
      return Response.json(json)
    }
  } catch (e) {
    console.error('[sugestoes]', e)
  }
  return Response.json({ materias: [] })
}
