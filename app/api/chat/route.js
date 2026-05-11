import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req) {
  const { mensagens, perfil, materia } = await req.json()

  const sistema = `Você é o Point, assistente acadêmico pessoal de ${perfil.nome}.

PERFIL DO ALUNO:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso}
- Universidade: ${perfil.universidade}
- Semestre: ${perfil.semestre}
- Matérias: ${perfil.materias}
- Objetivo: ${perfil.objetivo}

MATÉRIA ATUAL: ${materia}

INSTRUÇÕES:
- Você está ajudando especificamente com ${materia}
- Seja didático, use exemplos práticos do contexto de ${perfil.curso}
- Use emojis para organizar as respostas
- Seja proativo — sugira próximos passos, exercícios ou revisões quando relevante
- Lembre que o objetivo do aluno é: ${perfil.objetivo}
- Nunca esqueça com quem está falando — personalize sempre
- Quando perceber que o aluno está com dificuldade, ofereça explicações alternativas`

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: sistema,
    messages: mensagens.map(m => ({
      role: m.role,
      content: m.content
    }))
  })

  return Response.json({ resposta: resposta.content[0].text })
}