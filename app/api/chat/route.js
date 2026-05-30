import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

export async function POST(req) {
  // SECURITY: perfil is loaded SERVER-SIDE from the authenticated session,
  // never from the request body. A stale/forged body.perfil could otherwise
  // leak another user's curso/matérias/objetivo into the system prompt
  // (confirmed cross-account leak fixed in this commit).
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { data: perfilDb } = await supabase
    .from('perfis')
    .select('nome,curso,universidade,semestre,materias,objetivo')
    .eq('user_id', user.id)
    .maybeSingle()
  const perfil = perfilDb || EMPTY_PERFIL

  const {
    mensagens, materia, topico,
    imagemBase64, imagemTipo, resumo,
    historicoMaterias,
  } = await req.json()

  const isGeral      = !materia || materia === '__geral__'
  const contextoAtual = topico ? `${materia} → ${topico}` : (isGeral ? 'Chat Geral' : materia)

  // Monta bloco de contexto cross-matéria para o Chat Geral
  const contextoCross = isGeral && historicoMaterias
    ? Object.entries(historicoMaterias)
        .filter(([, msgs]) => msgs?.length)
        .map(([mat, msgs]) => {
          const ultimas = msgs.slice(-4).map(m => `  ${m.role === 'user' ? 'Aluno' : 'IA'}: ${m.content?.slice(0, 120)}`).join('\n')
          return `Matéria: ${mat}\n${ultimas}`
        })
        .join('\n\n')
    : null

  // ── Regras de estilo de resposta (compartilhadas) ─────────────
  const estiloResposta = `
ESTILO DE RESPOSTA — MUITO IMPORTANTE:
Escreva como um professor explicando pessoalmente, de forma natural e fluida.

O que FAZER:
- Parágrafos curtos separados por linha em branco
- Títulos simples quando necessário: escreva apenas o título em uma linha, sem asteriscos nem traços
- Listas com • ou números simples (1. 2. 3.)
- Fórmulas simples em texto: "f(x) = x²" ou "E = mc²", não LaTeX
- Use LaTeX ($...$) APENAS para fórmulas complexas que ficam ilegíveis em texto plano
- Blocos de código (\`\`\`python) apenas para código real de programação
- Tabelas markdown apenas quando comparar 3+ itens lado a lado

O que EVITAR:
- NÃO use **negrito** excessivo ou ***itálico*** decorativo
- NÃO use traços --- ou === como separadores
- NÃO use $$LaTeX$$ para fórmulas simples que cabem em texto
- NÃO comece cada parágrafo com emoji
- NÃO use subtítulos em negrito para cada ponto
- NÃO liste itens que poderiam ser explicados em texto corrido

SOBRE PEDIDOS VISUAIS (desenha, ilustra, diagrama, esquema, mapa mental, fluxograma):
Quando o aluno pedir qualquer representação visual, gere um SVG completo dentro de um bloco \`\`\`svg.
O SVG será renderizado diretamente no chat como diagrama interativo.

REGRAS DO SVG:
- viewBox="0 0 800 600" (sempre este tamanho)
- Fundo branco: <rect width="800" height="600" fill="white"/>
- Cores do app: verde escuro #1a7a4a, verde claro #e8f5ee, cinza #6b7280, cinza claro #f3f4f6
- Texto legível em português, font-family="system-ui, sans-serif"
- Formas: retângulos com rx="8" para bordas arredondadas, círculos, setas com marcadores
- Setas: use <defs><marker> com ID único e <line> ou <path> com marker-end
- Sempre inclua um título no topo do diagrama
- Conteúdo bem distribuído, sem sobreposições de texto

PARA MAPAS MENTAIS: nó central grande no meio, ramos saindo para os lados com linhas curvas
PARA FLUXOGRAMAS: retângulos de cima para baixo com setas, losangos para decisões
PARA ESQUEMAS COMPARATIVOS: colunas lado a lado com títulos

NÃO use ASCII art. NÃO use caracteres de diagrama (─ │ ┌ └ → ↓) fora de SVG.
Se o pedido for muito simples para SVG, responda em texto normal.

Exemplo de estrutura SVG correta:
\`\`\`svg
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="800" height="600" fill="white"/>
  <text x="400" y="40" text-anchor="middle" font-size="20" font-weight="bold" fill="#1a7a4a">Título</text>
  <!-- formas e conexões aqui -->
</svg>
\`\`\``

  // ── Chat Geral ────────────────────────────────────────────────
  const sistemaGeral = `Você é o Point AI, assistente acadêmico pessoal do Point de ${perfil.nome}.

Perfil: ${perfil.curso} · ${perfil.universidade} · ${perfil.semestre}º semestre
Matérias: ${perfil.materias}
Objetivo: ${perfil.objetivo}

Você está no Chat Geral — o aluno pode perguntar qualquer coisa sobre estudos, sem matéria específica. Seja abrangente, cubra desde dúvidas de conteúdo até técnicas de estudo, planejamento, ENEM, vestibulares e carreira.
${contextoCross ? `
O aluno já estudou os seguintes tópicos recentemente nas suas matérias:

${contextoCross}

Use esse contexto quando relevar — referencie, aprofunde e conecte conteúdos quando o aluno perguntar algo relacionado.` : ''}
${resumo ? `\nMemória desta conversa: ${resumo}` : ''}
${estiloResposta}`

  // ── Chat por matéria ──────────────────────────────────────────
  const sistemaMateria = `Você é o Point AI, assistente acadêmico pessoal do Point de ${perfil.nome}.

Perfil: ${perfil.curso} · ${perfil.universidade} · ${perfil.semestre}º semestre
Objetivo: ${perfil.objetivo}

Matéria atual: ${contextoAtual}

Você está ajudando especificamente com ${contextoAtual}. Seja didático, use exemplos práticos do contexto de ${perfil.curso}. Quando o aluno tiver dificuldade, ofereça explicações alternativas. Sugira próximos passos, exercícios ou revisões quando relevante. Quando receber imagem de prova, exercício ou anotação, analise diretamente o conteúdo visual.

Conhecimento institucional: para ${perfil.universidade}, use seu conhecimento sobre o currículo, metodologia e estilo de avaliação do curso de ${perfil.curso}. Antecipe dificuldades comuns que alunos de ${perfil.curso} enfrentam em ${materia}.
${resumo ? `
Memória desta conversa: ${resumo}
Use naturalmente quando relevante ("Da última vez você...", "Como você estudou antes...").` : ''}

Para tabelas comparativas use markdown: | Col1 | Col2 |\\n|---|---|\\n| val | val |
Para código real use blocos \`\`\`linguagem.
${estiloResposta}`

  const sistema = isGeral ? sistemaGeral : sistemaMateria

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
