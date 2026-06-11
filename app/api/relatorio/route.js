import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

// Média ponderada Σ(nota×peso)/Σ(peso), ignorando avaliações sem nota.
// Mesma regra de db.calcularMedia, inline aqui para não acoplar a rota de
// servidor ao módulo do cliente Supabase (supabase-browser). Retorna número
// ou null se nenhuma avaliação tem nota.
function mediaPonderada(avaliacoes) {
  if (!Array.isArray(avaliacoes)) return null
  let soma = 0
  let pesoTotal = 0
  for (const a of avaliacoes) {
    if (!a || a.nota === null || a.nota === undefined || a.nota === '') continue
    const nota = Number(a.nota)
    if (Number.isNaN(nota)) continue
    const peso = a.peso === null || a.peso === undefined || a.peso === '' ? 1 : Number(a.peso)
    if (Number.isNaN(peso) || peso <= 0) continue
    soma += nota * peso
    pesoTotal += peso
  }
  return pesoTotal > 0 ? soma / pesoTotal : null
}

// Mesmo extractJSON do /api/plano: tolera respostas embrulhadas em ```json,
// ou texto antes/depois do bloco. Lança se nada parseável for encontrado.
function extractJSON(text) {
  let cleaned = text.replace(/```json[\s\S]*?```/g, (match) => {
    return match.replace(/```json\s*/, '').replace(/\s*```$/, '')
  })
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\s*/, '').replace(/\s*```$/, '')
  })
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON não encontrado na resposta')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function POST(req) {
  try {
    // SECURITY: perfil + matérias + eventos from authenticated session — never trust the body.
    const { supabase, user } = await requireUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    // Modo do relatório vem do query string (?periodo=semana|mes). Não usamos
    // o body porque ele é descartado por segurança (anti-spoof de dados do
    // usuário). O modo é só um seletor de UI — não é dado do usuário, então
    // query string é seguro e segue a convenção Next.js para read-params.
    const url = new URL(req.url)
    const modo = url.searchParams.get('periodo') === 'mes' ? 'mes' : 'semana'

    const [perfilRes, materiasRes, eventosRes] = await Promise.all([
      supabase.from('perfis').select('nome,curso,universidade,semestre,materias,objetivo').eq('user_id', user.id).maybeSingle(),
      // Modelo NOVO (N avaliações): materias_aluno + avaliacoes embutidas.
      supabase.from('materias_aluno').select('nome,faltas,limite_faltas,media_aprovacao,avaliacoes(nota,peso)').eq('user_id', user.id).order('nome', { ascending: true }),
      supabase.from('eventos').select('id,titulo,data,tipo,materia').eq('user_id', user.id).order('data', { ascending: true }),
    ])
    const perfil = perfilRes.data || EMPTY_PERFIL
    const materias = materiasRes.data || []
    const eventos = eventosRes.data || []

    // Body kept for forward-compat. Dados vêm da sessão (anti-spoof), não do body.
    await req.json().catch(() => null)

    /* ── Indicadores calculados SERVER-SIDE (ground truth) ───────── */
    // Calculamos os números aqui, com os dados reais do Supabase, em vez de
    // depender da IA — assim a tela mostra números corretos mesmo que o
    // texto da IA seja vago, e protege contra hallucination numérica.
    const materiasComDados = materias.map(m => {
      const media = mediaPonderada(m.avaliacoes)
      const meta = Number(m.media_aprovacao) || 7
      const faltas = Number(m.faltas) || 0
      const limiteFaltas = m.limite_faltas == null ? null : Number(m.limite_faltas)
      // Em risco = média abaixo da meta OU faltas no/perto do limite (>=80%).
      const mediaAbaixo = media != null && media < meta
      const pctFaltas = limiteFaltas != null && limiteFaltas > 0 ? (faltas / limiteFaltas) * 100 : 0
      const faltasNoLimite = limiteFaltas != null && pctFaltas >= 80
      return { nome: m.nome, media, meta, faltas, limiteFaltas, pctFaltas, emRisco: mediaAbaixo || faltasNoLimite }
    })

    // Média geral do semestre = média simples das médias por matéria que tem nota.
    const comMedia = materiasComDados.filter(m => m.media != null)
    const mediaGeral = comMedia.length
      ? comMedia.reduce((acc, m) => acc + m.media, 0) / comMedia.length
      : null

    // Provas/trabalhos/apresentações nos próximos 7 dias.
    const agora = new Date()
    agora.setHours(0, 0, 0, 0)
    const limite7d = agora.getTime() + 7 * 86400000
    const provasProximas = eventos.filter(e => {
      const ts = new Date(e.data).getTime()
      return !Number.isNaN(ts) && ts >= agora.getTime() && ts <= limite7d
    }).length

    const materiasEmRisco = materiasComDados.filter(m => m.emRisco).length

    const indicadores = {
      media_geral: mediaGeral != null ? Number(mediaGeral.toFixed(2)) : null,
      provas_proximas: provasProximas,
      materias_em_risco: materiasEmRisco,
    }

    /* ── Resumo das notas em texto (usado pelo prompt de AMBOS os modos) ── */
    const notasStr = materias.length
      ? materias.map((m) => {
          const media = mediaPonderada(m.avaliacoes)
          const meta = Number(m.media_aprovacao) || 7
          const mediaTxt = media != null ? media.toFixed(1) : '—'
          const limiteFaltas = m.limite_faltas == null ? null : Number(m.limite_faltas)
          const faltasTxt = limiteFaltas == null
            ? `faltas ${m.faltas || 0} (limite não definido)`
            : `faltas ${m.faltas || 0}/${limiteFaltas} permitidas`
          const aviso = media != null && media < meta ? ' ABAIXO DA META' : ''
          return `- ${m.nome}: média ${mediaTxt} (meta ${meta}), ${faltasTxt}${aviso}`
        }).join('\n')
      : 'Sem dados de notas cadastrados'

    /* ── Modo MÊS: balanço consolidado, sem tendência temporal ────── */
    if (modo === 'mes') {
      // Rótulo "Junho 2026" (sem "de") — pt-BR retornaria "junho de 2026".
      const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      const hoje = new Date()
      const periodoMes = `${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`

      // Indicadores do mês: 2 cards (media_geral_mes, materias_em_risco).
      const indicadoresMes = {
        media_geral_mes: mediaGeral != null ? Number(mediaGeral.toFixed(2)) : null,
        materias_em_risco: materiasEmRisco,
      }

      // Lista de TODAS as matérias para a tela / PDF.
      const materiasOut = materiasComDados.map((m) => {
        const raw = materias.find(x => x.nome === m.nome)?.avaliacoes || []
        const nAvaliacoes = raw.filter(a => a && a.nota !== null && a.nota !== undefined && a.nota !== '' && !Number.isNaN(Number(a.nota))).length
        return {
          nome: m.nome,
          media: m.media != null ? Number(m.media.toFixed(2)) : null,
          meta: m.meta,
          n_avaliacoes: nAvaliacoes,
          faltas: m.faltas,
          limite_faltas: m.limiteFaltas,
          em_risco: m.emRisco,
        }
      })

      // Texto do balanço — única parte gerada pela IA. Cálculos numéricos
      // ficam server-side acima; aqui ela só interpreta.
      const promptMes = `Você é um analista acadêmico para universitários brasileiros. Escreva um BALANÇO DO MÊS de ${periodoMes} para o aluno.

Perfil do aluno:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso} (${perfil.semestre})
- Universidade: ${perfil.universidade}
- Objetivo: ${perfil.objetivo}

Situação acadêmica ATUAL (consolidada — você NÃO tem dados de meses anteriores):
${notasStr}

REGRAS CRÍTICAS:
- NÃO afirme tendências nem evolução temporal: nada de "subiu", "caiu", "melhorou", "piorou", "comparado a", "em relação a", "vem evoluindo". Você só tem o ESTADO ATUAL.
- Fale diretamente com ${perfil.nome || 'o aluno'}, tom honesto e encorajador (nunca punitivo).
- Foque em INTERPRETAR o panorama atual: quais matérias estão sólidas, quais merecem atenção, o que faz sentido priorizar daqui pra frente.
- NÃO repita os números crus (eles aparecem em cards e na lista à parte). Use linguagem qualitativa.
- 2 a 4 parágrafos curtos em markdown. Pode usar listas com "-" e **negrito**. NÃO use títulos (## etc).
- Se não houver matérias ou avaliações cadastradas, reconheça e oriente a começar.

Responda APENAS com JSON puro, sem markdown, neste formato exato:
{"texto":"...markdown do balanço..."}`

      const respostaMes = await cliente.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1400,
        messages: [{ role: 'user', content: promptMes }],
      })

      // Parse defensivo: se a IA não devolveu JSON puro, tenta o texto cru.
      let balancoTexto = ''
      try {
        const parsed = extractJSON(respostaMes.content[0].text)
        balancoTexto = String(parsed?.texto || '').trim()
      } catch {
        balancoTexto = String(respostaMes.content[0].text || '').trim()
      }
      if (!balancoTexto) throw new Error('A IA não retornou o balanço. Tente novamente.')

      return Response.json({
        relatorio_mes: {
          periodo: periodoMes,
          indicadores: indicadoresMes,
          materias: materiasOut,
          balanco: { texto: balancoTexto },
        },
      })
    }

    /* ── Prompt: pede APENAS texto/conclusões (números são nossos) ─ */
    const eventosStr = eventos?.length
      ? eventos.slice(0, 10).map(e => `- ${e.data}: ${e.titulo} (${e.tipo}${e.materia ? ' · ' + e.materia : ''})`).join('\n')
      : 'Sem eventos cadastrados'

    const nomesMaterias = materias.map(m => m.nome).filter(Boolean)
    const listaMateriasTxt = nomesMaterias.join(', ') || 'nenhuma cadastrada'

    const periodo = (() => {
      const fim = new Date(agora.getTime() + 7 * 86400000)
      const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      return `${fmt(agora)} – ${fmt(fim)}`
    })()

    const prompt = `Você é um analista acadêmico para universitários brasileiros. Gere um RELATÓRIO SEMANAL personalizado.

Perfil do aluno:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso} (${perfil.semestre})
- Universidade: ${perfil.universidade}
- Objetivo: ${perfil.objetivo}

Matérias do aluno (use EXATAMENTE estes nomes no campo "materia_alvo"): ${listaMateriasTxt}

Situação acadêmica (média ponderada, meta de aprovação e faltas por matéria):
${notasStr}

Próximos eventos:
${eventosStr}

Período do relatório: ${periodo}

REGRAS:
- Fale diretamente com ${perfil.nome || 'o aluno'}, tom honesto e encorajador (nunca punitivo).
- NÃO repita números nos textos (eles aparecem em cards à parte). Foque em interpretação e ações.
- Se não houver dados (sem notas, sem eventos), reconheça e oriente a começar.

SEÇÕES (campo "secoes", 3 a 4 itens, nesta ordem quando aplicável):
1) tipo "destaque": o ponto mais positivo da semana (matéria estável, progresso, hábito bom).
2) tipo "atencao": riscos REAIS (matérias abaixo da meta, faltas perto do limite, prova chegando).
3) tipo "proxima_semana": orientação concreta — o que o aluno deveria fazer nos próximos 7 dias.
4) (opcional) tipo "destaque": uma mensagem final personalizada baseada no objetivo, se fizer sentido.

Cada seção: {"tipo": "destaque"|"atencao"|"proxima_semana", "titulo": string curta (até 50 chars), "texto": 2 a 4 parágrafos curtos em markdown (pode usar listas com "-", **negrito**, sem títulos ##)}.

RECOMENDAÇÕES (campo "recomendacoes", 3 a 4 itens): cada uma deve puxar o aluno para uma FERRAMENTA do Point — evite conselhos genéricos. Escolha "ferramenta" entre:
- "chat": tirar dúvida ou estudar um assunto com o Point AI (nota baixa, dúvida conceitual). Use "assunto".
- "simulado": treinar com questões (prova chegando ou nota baixa).
- "resumo": consolidar/resumir um conteúdo no chat (antes de prova). Use "assunto".
- "cerebro": visualizar conexões entre conceitos da matéria (matéria com lacunas).
- "trabalhos": corrigir um trabalho/redação (quando há entrega prevista).
Cada recomendação: {"texto": frase explicando por que ajuda AGORA, "ferramenta": uma das acima, "materia_alvo": nome exato da matéria ou "geral", "assunto": tópico específico ou "", "rotulo_acao": texto curto do botão}.

Responda APENAS com JSON puro, sem markdown, neste formato exato:
{"periodo":"${periodo}","secoes":[{"tipo":"destaque","titulo":"...","texto":"..."}],"recomendacoes":[{"texto":"...","ferramenta":"chat","materia_alvo":"...","assunto":"...","rotulo_acao":"..."}]}`

    const resposta = await cliente.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2200,
      messages: [{ role: 'user', content: prompt }],
    })

    /* ── Parse defensivo + normalização do shape ─────────────────── */
    const data = extractJSON(resposta.content[0].text)

    const TIPOS_SECAO = ['destaque', 'atencao', 'proxima_semana']
    const FERRAMENTAS = ['chat', 'simulado', 'resumo', 'cerebro', 'trabalhos']
    const nomeCanonical = new Map(nomesMaterias.map(n => [n.toLowerCase().trim(), n]))

    const relatorio = {
      periodo: typeof data.periodo === 'string' && data.periodo.trim() ? data.periodo : periodo,
      indicadores,
      secoes: Array.isArray(data.secoes) ? data.secoes.slice(0, 6).map(s => ({
        tipo: TIPOS_SECAO.includes(s?.tipo) ? s.tipo : 'destaque',
        titulo: String(s?.titulo || '').slice(0, 80),
        texto: String(s?.texto || ''),
      })).filter(s => s.titulo && s.texto) : [],
      recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes.slice(0, 6).map(r => {
        const ferramenta = FERRAMENTAS.includes(r?.ferramenta) ? r.ferramenta : 'chat'
        const alvoRaw = String(r?.materia_alvo || '').toLowerCase().trim()
        const materia_alvo = nomeCanonical.get(alvoRaw) || 'geral'
        return {
          texto: String(r?.texto || ''),
          ferramenta,
          materia_alvo,
          assunto: String(r?.assunto || ''),
          rotulo_acao: String(r?.rotulo_acao || 'Abrir no Point'),
        }
      }).filter(r => r.texto) : [],
    }

    if (!relatorio.secoes.length) throw new Error('A IA não retornou seções válidas. Tente novamente.')

    return Response.json({ relatorio })
  } catch (error) {
    return Response.json({ erro: error.message || 'Erro ao gerar relatório' }, { status: 500 })
  }
}
