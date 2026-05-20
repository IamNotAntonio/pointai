import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { acao, mensagens, materia, historicoQuiz, respostaUsuario } = await req.json()

  const contextoChat = (mensagens || [])
    .filter(m => m.content && !m.tipo)
    .slice(-30)
    .map(m => `${m.role === 'user' ? 'Aluno' : 'IA'}: ${m.content.slice(0, 200)}`)
    .join('\n')

  if (acao === 'iniciar') {
    const msg = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Você é um professor criando um quiz sobre o conteúdo estudado.

Matéria: ${materia || 'Geral'}
Conversa de estudo:
${contextoChat}

Crie a primeira pergunta de um quiz de 5 questões baseada neste conteúdo.
Seja objetivo e claro. Pode ser discursiva curta ou múltipla escolha.
Responda APENAS com a pergunta, sem numeração nem introdução.`,
      }],
    })

    return Response.json({
      pergunta: msg.content[0]?.text?.trim() || '',
      numero: 1,
      total: 5,
    })
  }

  if (acao === 'responder') {
    const numero = historicoQuiz?.length || 1
    const encerrado = numero >= 5
    const passadas = (historicoQuiz || []).slice(0, -1)
    const atual = (historicoQuiz || [])[(historicoQuiz?.length || 1) - 1]

    const histStr = passadas.length
      ? passadas.map((q, i) =>
          `P${i + 1}: ${q.pergunta}\nResposta: ${q.resposta_usuario} [${q.correta ? '✓' : '✗'}]`
        ).join('\n\n')
      : ''

    const msg = await cliente.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Você é um professor avaliando a resposta de um aluno em um quiz.

Matéria: ${materia || 'Geral'}
${histStr ? `Perguntas anteriores:\n${histStr}\n\n` : ''}Pergunta ${numero}: ${atual?.pergunta || ''}
Resposta do aluno: ${respostaUsuario || atual?.resposta_usuario || ''}

${encerrado
  ? 'Esta é a última pergunta. Responda APENAS com este JSON: {"correta": bool, "feedback": "1-2 frases avaliando a resposta"}'
  : `Responda APENAS com este JSON: {"correta": bool, "feedback": "1-2 frases avaliando a resposta", "proxPergunta": "próxima pergunta diferente sobre o mesmo conteúdo"}`
}

Contexto do conteúdo estudado:
${contextoChat.slice(0, 800)}`,
      }],
    })

    try {
      const raw = msg.content[0]?.text || '{}'
      const match = raw.match(/\{[\s\S]*\}/)
      const data = JSON.parse(match?.[0] || '{}')
      const acertos = passadas.filter(q => q.correta).length + (data.correta ? 1 : 0)

      return Response.json({
        correta: !!data.correta,
        feedback: data.feedback || '',
        proxPergunta: encerrado ? null : (data.proxPergunta || null),
        encerrado,
        numero,
        resultado: encerrado ? { acertos, total: 5 } : null,
      })
    } catch {
      return Response.json({ erro: 'Erro ao processar resposta.' }, { status: 500 })
    }
  }

  return Response.json({ erro: 'Ação inválida.' }, { status: 400 })
}
