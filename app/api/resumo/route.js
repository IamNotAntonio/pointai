import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const { mensagens, perfil, materia } = await req.json()

  if (!mensagens?.length) {
    return Response.json({ erro: 'Sem mensagens para resumir.' }, { status: 400 })
  }

  const contexto = mensagens
    .filter(m => m.content && !m.tipo)
    .slice(-40)
    .map(m => `${m.role === 'user' ? 'Aluno' : 'Point AI'}: ${m.content.slice(0, 300)}`)
    .join('\n\n')

  if (!contexto.trim()) {
    return Response.json({ erro: 'Sem conteúdo relevante.' }, { status: 400 })
  }

  const msg = await cliente.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Analise esta conversa de estudos e gere um resumo estruturado em Markdown.

Matéria: ${materia || 'Chat Geral'}
${perfil ? `Aluno: ${perfil.nome} · ${perfil.curso}` : ''}

Conversa:
${contexto}

Gere um resumo com estas seções (omita seções sem conteúdo):

## Tópicos Discutidos
• liste os tópicos abordados

## Conceitos-Chave
• conceito e breve explicação

## Fórmulas e Definições
• fórmulas, definições ou termos técnicos importantes

## Pontos para Revisão
• dúvidas não resolvidas ou tópicos que merecem atenção

Seja conciso. Foque no que é mais relevante para o estudo.`,
    }],
  })

  return Response.json({ resumo: msg.content[0]?.text?.trim() || '' })
}
