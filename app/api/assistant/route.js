import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PAGINA_LABELS = {
  '/dashboard':       'Home — resumo do dia: continuar última conversa, próximos eventos, alertas, atalhos rápidos',
  '/dashboard/chat':  'Chat principal com IA acadêmica por matéria (suporta imagens, tabelas, LaTeX)',
  '/notas':           'Notas e Controle de Faltas — registra notas por prova e monitora frequência',
  '/calendario': 'Calendário de Provas e Trabalhos — agenda com urgência colorida',
  '/evolucao':   'Minha Evolução — dashboard de progresso com média geral e alertas',
  '/analise':    'Análise de Materiais — upload de foto de prova/caderno para diagnóstico por IA',
  '/relatorio':  'Relatório Semanal — relatório gerado por IA com plano de ação',
  '/trabalhos':  'Correção de Trabalhos — cole o texto e receba feedback acadêmico',
}

export async function POST(req) {
  const { mensagens, perfil, pagina } = await req.json()

  const paginaLabel = PAGINA_LABELS[pagina] || pagina

  const sistema = `Você é o Assistente Point, o coach pessoal e guia do app Point.

USUÁRIO: ${perfil?.nome || 'Estudante'} · ${perfil?.curso || ''} · ${perfil?.universidade || ''}
SEMESTRE: ${perfil?.semestre || ''} · Matérias: ${perfil?.materias || ''}
PÁGINA ATUAL: ${paginaLabel}

FUNÇÃO PRINCIPAL:
- Você é GUIA e COACH do app Point, não tutor acadêmico (para isso existe o chat principal)
- Ajude o usuário a tirar o máximo do app
- Seja empático, motivador, e breve (1-3 frases por resposta — não mais)
- Use linguagem informal e descontraída, como um amigo que conhece bem o app

FUNCIONALIDADES QUE VOCÊ CONHECE:
- Chat (/dashboard): IA acadêmica por matéria. Suporta foto de prova, tabelas, gráficos, LaTeX
- Notas (/notas): Registra notas e monitora faltas — alerta quando passa de 25%
- Calendário (/calendario): Agenda provas e trabalhos com cores de urgência
- Evolução (/evolucao): Dashboard com médias, progresso e alertas de risco
- Análise (/analise): Manda foto da prova → IA analisa erros e dá diagnóstico completo
- Relatório (/relatorio): IA gera um relatório semanal com plano de ação personalizado
- Correção (/trabalhos): Cola o texto do trabalho e recebe feedback estruturado

REGRAS DE RESPOSTA:
- Respostas curtas, diretas — no máximo 3 frases
- Se o usuário pedir ajuda acadêmica direta (explicar matéria, resolver exercício), diga: "Para isso é melhor ir no Chat principal — a IA vai te ajudar muito melhor com a matéria!"
- Dê exemplos práticos de prompts quando sugerir o chat: "Você pode perguntar 'Explica derivadas com exemplos práticos' ou 'Cria 5 questões de Cálculo para prova'"
- Celebre progresso e conquistas
- Se o usuário parecer estressado, seja empático antes de sugerir funcionalidades`

  const apiMessages = mensagens
    .filter(m => m.content?.trim())
    .map(m => ({ role: m.role, content: m.content }))

  const resposta = await cliente.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: sistema,
    messages: apiMessages,
  })

  return Response.json({ resposta: resposta.content[0].text })
}
