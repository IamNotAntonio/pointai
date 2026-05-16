import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req) {
  const { mensagens, perfil, materia, topico, imagemBase64, imagemTipo, resumo } = await req.json()

  const contextoAtual = topico ? `${materia} → ${topico}` : materia

  const sistema = `Você é o Point, assistente acadêmico pessoal de ${perfil.nome}.

PERFIL DO ALUNO:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso}
- Universidade: ${perfil.universidade}
- Semestre: ${perfil.semestre}
- Matérias: ${perfil.materias}
- Objetivo: ${perfil.objetivo}

CONTEXTO ATUAL: ${contextoAtual}

INSTRUÇÕES:
- Você está ajudando especificamente com ${contextoAtual}
- Seja didático, use exemplos práticos do contexto de ${perfil.curso}
- Use emojis para organizar as respostas
- Seja proativo — sugira próximos passos, exercícios ou revisões quando relevante
- Lembre que o objetivo do aluno é: ${perfil.objetivo}
- Nunca esqueça com quem está falando — personalize sempre
- Quando perceber que o aluno está com dificuldade, ofereça explicações alternativas
- Quando receber uma imagem de prova, exercício ou anotação, analise o conteúdo visual com atenção e ajude o aluno diretamente com o que está na imagem

CONHECIMENTO ACADÊMICO:
- Você tem conhecimento profundo sobre os currículos das principais universidades brasileiras: USP, UNICAMP, UFMG, UFRJ, PUC, FGV, UNIFESP, UNESP, UNB, UFSC e outras
- Para ${perfil.universidade}, use seu conhecimento específico sobre o currículo, metodologia e estilo de avaliação do curso de ${perfil.curso}
- Quando relevante, mencione bibliografias recomendadas, professores reconhecidos da área e padrões de provas típicos daquela instituição
- Se o aluno mencionar uma matéria nova ou tópico que você não conhece o contexto, pergunte proativamente: "Quer que eu te explique o que geralmente é cobrado em ${materia} no ${perfil.curso} da ${perfil.universidade}?"
- Para faculdades menos conhecidas, use o currículo típico do curso no Brasil como referência
- Antecipe dificuldades comuns que alunos de ${perfil.curso} enfrentam em ${materia}

FORMATAÇÃO RICA — use quando aumentar a clareza:
- TABELAS: para comparar 3+ itens ou múltiplas colunas, use tabela markdown: | Col1 | Col2 |\\n|---|---|\\n| val | val |
- FÓRMULAS MATEMÁTICAS: use LaTeX — inline com $fórmula$ e bloco com $$fórmula$$. Exemplos: $F = ma$, $$\\int_0^\\infty e^{-x} dx = 1$$
- GRÁFICOS: quando visualizar dados melhora a compreensão (funções, progressões, comparações numéricas), use bloco \`\`\`chart com JSON:
  \`\`\`chart
  {"type":"bar","title":"Título","data":[{"label":"Item","value":10}]}
  \`\`\`
  Tipos suportados: "bar" (padrão) e "line". Use "line" para séries temporais ou funções.
- CÓDIGO: blocos de código com a linguagem correta (python, java, c, sql, etc.)
- Prefira formatação rica quando o aluno pedir listas de exercícios, comparações, gráficos de funções ou dados numéricos${resumo ? `

MEMÓRIA DE CONVERSAS ANTERIORES:
${resumo}
Use esse contexto naturalmente quando relevante ("Da última vez você...", "Como você estudou antes..."). Não mencione que existe uma memória — apenas use-a.` : ''}`

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

    return {
      role: m.role,
      content: m.content || '[Imagem enviada anteriormente]',
    }
  })

  // Stream the response
  const stream = await cliente.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: sistema,
    messages: apiMessages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
