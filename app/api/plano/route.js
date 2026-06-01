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
      supabase.from('materias_aluno').select('nome,faltas,total_aulas,media_aprovacao,avaliacoes(nota,peso)').eq('user_id', user.id).order('nome', { ascending: true }),
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
      // Sinaliza para a IA priorizar matérias abaixo da meta de aprovação.
      const aviso = media != null && media < meta ? ' ⚠ ABAIXO DA META — priorizar' : '';
      return `- ${m.nome}: média ${mediaTxt} (meta ${meta}), faltas ${m.faltas || 0}/${m.total_aulas || 0}${aviso}`;
    }).join('\n');

    const eventosFormatados = (eventos || [])
      .slice(0, 8)
      .map((e) => `- ${e.titulo} | ${e.data} | ${e.tipo} | ${e.materia}`)
      .join('\n');

    const historico = historicoChat
      ? `\nDificuldades relatadas pelo aluno:\n${historicoChat}`
      : '';

    const instrucoesPro = ehPro
      ? `Inclui campo "alerta" (string ou null) com alertas críticos sobre notas baixas ou faltas excessivas.
Cada sessão de estudo deve ter o campo "motivo" explicando por que aquela matéria foi priorizada naquele dia.
Adicione motivações personalizadas baseadas no objetivo do aluno.`
      : `O campo "alerta" deve ser null.
Não inclua o campo "motivo" nas sessões.
Mantenha o plano objetivo e direto.`;

    const prompt = `Você é um assistente de planejamento acadêmico para estudantes universitários brasileiros.

Perfil do aluno:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso}
- Universidade: ${perfil.universidade}
- Semestre: ${perfil.semestre}
- Objetivo: ${perfil.objetivo}

Situação acadêmica atual:
${notasFormatadas || 'Nenhuma nota registrada ainda.'}

Próximos eventos (até 8):
${eventosFormatados || 'Nenhum evento cadastrado.'}
${historico}

Data atual: ${dataAtual}

Gere um plano de estudos semanal personalizado cobrindo todos os 7 dias (Segunda a Domingo). Finais de semana devem ter carga horária menor. Distribua as matérias com base nas notas e nos eventos próximos.

${instrucoesPro}

Responda APENAS com JSON puro, sem markdown, neste formato exato:
{"semana":"19–25 de maio","resumo":"...","alerta":"..." ,"dias":[{"dia":"Segunda-feira","data":"19/05","sessoes":[{"materia":"...","horas":2,"topicos":["..."],"prioridade":"alta","motivo":"..."}]}],"sugestoes":["dica 1","dica 2","dica 3"]}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const data = extractJSON(message.content[0].text);
    return Response.json(data);
  } catch (error) {
    return Response.json({ erro: error.message || 'Erro ao gerar plano de estudos' }, { status: 500 });
  }
}
