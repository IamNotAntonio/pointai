import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req) {
  const { mensagens, perfil, materia, imagemBase64, imagemTipo } = await req.json()

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
- Quando perceber que o aluno está com dificuldade, ofereça explicações alternativas
- Quando receber uma imagem de prova, exercício ou anotação, analise o conteúdo visual com atenção e ajude o aluno diretamente com o que está na imagem`

  // Build API messages — attach image to the last user message when present
  const apiMessages = mensagens.map((m, i) => {
    const isLastMsg = i === mensagens.length - 1

    if (isLastMsg && m.role === 'user' && imagemBase64) {
      const content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imagemTipo || 'image/jpeg',
            data: imagemBase64,
          },
        },
      ]
      if (m.content) {
        content.push({ type: 'text', text: m.content })
      }
      return { role: 'user', content }
    }

    // Historical messages: use text content only
    return {
      role: m.role,
      content: m.content || '[Imagem enviada anteriormente]',
    }
  })

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: sistema,
    messages: apiMessages,
  })

  return Response.json({ resposta: resposta.content[0].text })
}
