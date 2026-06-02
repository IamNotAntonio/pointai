import Anthropic from '@anthropic-ai/sdk';
import { requireUser } from '../../lib/supabase-server';

const anthropic = new Anthropic();

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

function extractJSON(text) {
  let cleaned = text.replace(/```json[\s\S]*?```/g, (match) => {
    return match.replace(/```json\s*/, '').replace(/\s*```$/, '');
  });
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\s*/, '').replace(/\s*```$/, '');
  });
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON não encontrado na resposta');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request) {
  try {
    // SECURITY: perfil + matérias + eventos from authenticated session — never trust the body.
    const { supabase, user } = await requireUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const [perfilRes, materiasRes, eventosRes] = await Promise.all([
      supabase.from('perfis').select('nome,curso,universidade,semestre,materias,objetivo').eq('user_id', user.id).maybeSingle(),
      // Modelo NOVO (N avaliações): materias_aluno + avaliacoes embutidas.
      supabase.from('materias_aluno').select('nome,faltas,limite_faltas,media_aprovacao,avaliacoes(nota,peso)').eq('user_id', user.id).order('nome', { ascending: true }),
      supabase.from('eventos').select('id,titulo,data,tipo,materia').eq('user_id', user.id).order('data', { ascending: true }),
    ])
    const perfil = perfilRes.data || EMPTY_PERFIL
    const materias = materiasRes.data || []
    const eventos = eventosRes.data || []

    const { historicoChat, ehPro } = await request.json();

    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const notasFormatadas = materias.map((m) => {
      const media = mediaPonderada(m.avaliacoes);
      const meta = Number(m.media_aprovacao) || 7;
      const mediaTxt = media != null ? media.toFixed(1) : 'sem notas';
      // Limite REAL de faltas (coluna limite_faltas). null = não configurado.
      const limiteFaltas = m.limite_faltas == null ? null : Number(m.limite_faltas);
      const faltasTxt = limiteFaltas == null
        ? `faltas ${m.faltas || 0} (limite não definido)`
        : `faltas ${m.faltas || 0}/${limiteFaltas}`;
      // Sinaliza para a IA priorizar matérias abaixo da meta de aprovação.
      const aviso = media != null && media < meta ? ' ⚠ ABAIXO DA META — priorizar' : '';
      return `- ${m.nome}: média ${mediaTxt} (meta ${meta}), ${faltasTxt}${aviso}`;
    }).join('\n');

    const eventosFormatados = (eventos || [])
      .slice(0, 8)
      .map((e) => `- ${e.titulo} | ${e.data} | ${e.tipo} | ${e.materia}`)
      .join('\n');

    const historico = historicoChat
      ? `\nDificuldades relatadas pelo aluno:\n${historicoChat}`
      : '';

    const nomesMaterias = materias.map((m) => m.nome).filter(Boolean);
    const listaMateriasTxt = nomesMaterias.join(', ') || 'nenhuma cadastrada';

    const instrucoesPro = ehPro
      ? `Inclua o campo "alerta": uma frase com o risco mais crítico (nota muito abaixo da meta ou faltas perto do limite). Se não houver risco real, use null.`
      : `O campo "alerta" deve ser sempre null.`;

    const prompt = `Você é um planejador de estudos para universitários brasileiros. Gere um plano semanal ACIONÁVEL e motivacional.

Perfil do aluno:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso}
- Universidade: ${perfil.universidade}
- Semestre: ${perfil.semestre}
- Objetivo: ${perfil.objetivo}

Matérias do aluno (use EXATAMENTE estes nomes nos campos "materia" e "materia_alvo"): ${listaMateriasTxt}

Situação acadêmica (média ponderada, meta de aprovação e faltas por matéria):
${notasFormatadas || 'Nenhuma nota registrada ainda.'}

Próximos eventos (provas, trabalhos, apresentações):
${eventosFormatados || 'Nenhum evento cadastrado.'}
${historico}

Data atual: ${dataAtual}

PRIORIDADE de cada sessão:
- "alta": matéria ABAIXO DA META, ou com prova/trabalho nos próximos 7 dias.
- "media": matéria na meta com avaliação se aproximando, ou conteúdo acumulando.
- "baixa": matéria estável, sem urgência.
No campo "porque" de cada sessão, explique em 1 frase curta a razão, citando a nota/meta ou o evento próximo quando fizer sentido (ex.: "Sua média está abaixo da meta nesta matéria" ou "Prova em 4 dias").

RECOMENDAÇÕES (campo "recomendacoes", 3 a 4 itens): cada uma deve puxar o aluno para uma FERRAMENTA do Point — evite conselhos genéricos. Escolha "ferramenta" entre:
- "chat": tirar dúvida ou estudar um assunto com o Point AI (nota baixa, dúvida conceitual). Use "assunto".
- "simulado": treinar com questões (prova chegando ou nota baixa).
- "resumo": consolidar/resumir um conteúdo no chat (antes de prova). Use "assunto".
- "cerebro": visualizar conexões entre conceitos da matéria (matéria com lacunas).
- "trabalhos": corrigir um trabalho/redação (quando há entrega prevista).
Cada recomendação: {"texto": frase explicando por que ajuda AGORA, "ferramenta": uma das acima, "materia_alvo": nome exato da matéria ou "geral", "assunto": tópico específico ou "", "rotulo_acao": texto curto do botão}.

${instrucoesPro}

Cubra os 7 dias (Segunda a Domingo); fim de semana com carga menor; pode haver dia de descanso ("sessoes": []). O campo "resumo" é 1 frase motivacional sobre a semana.

Responda APENAS com JSON puro, sem markdown, neste formato exato:
{"semana":"2–8 de junho","resumo":"...","alerta":null,"dias":[{"dia":"Segunda-feira","data":"02/06","sessoes":[{"materia":"...","horario":"14:00","duracao":"2h","prioridade":"alta","o_que_estudar":"...","porque":"..."}]}],"recomendacoes":[{"texto":"...","ferramenta":"simulado","materia_alvo":"...","assunto":"...","rotulo_acao":"..."}]}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse defensivo: extractJSON lança se não houver JSON; normalizamos a
    // saída para o shape exato que a tela renderiza (a IA pode variar campos).
    const data = extractJSON(message.content[0].text);

    const FERRAMENTAS = ['chat', 'simulado', 'resumo', 'cerebro', 'trabalhos'];
    const PRIORIDADES = ['alta', 'media', 'baixa'];
    const nomeCanonical = new Map(nomesMaterias.map((n) => [n.toLowerCase().trim(), n]));

    const plano = {
      semana: typeof data.semana === 'string' ? data.semana : '',
      resumo: typeof data.resumo === 'string' ? data.resumo : '',
      alerta: ehPro && typeof data.alerta === 'string' && data.alerta.trim() ? data.alerta : null,
      dias: Array.isArray(data.dias) ? data.dias.map((d) => ({
        dia: String(d?.dia || ''),
        data: String(d?.data || ''),
        sessoes: Array.isArray(d?.sessoes) ? d.sessoes.map((s) => ({
          materia: String(s?.materia || ''),
          horario: String(s?.horario || ''),
          duracao: String(s?.duracao || ''),
          prioridade: PRIORIDADES.includes(s?.prioridade) ? s.prioridade : 'media',
          o_que_estudar: String(s?.o_que_estudar || ''),
          porque: String(s?.porque || ''),
        })) : [],
      })) : [],
      recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes.slice(0, 6).map((r) => {
        const ferramenta = FERRAMENTAS.includes(r?.ferramenta) ? r.ferramenta : 'chat';
        const alvoRaw = String(r?.materia_alvo || '').toLowerCase().trim();
        const materia_alvo = nomeCanonical.get(alvoRaw) || 'geral';
        return {
          texto: String(r?.texto || ''),
          ferramenta,
          materia_alvo,
          assunto: String(r?.assunto || ''),
          rotulo_acao: String(r?.rotulo_acao || 'Abrir no Point'),
        };
      }) : [],
    };

    if (!plano.dias.length) throw new Error('A IA não retornou os dias do plano. Tente novamente.');

    return Response.json(plano);
  } catch (error) {
    return Response.json({ erro: error.message || 'Erro ao gerar plano de estudos' }, { status: 500 });
  }
}
