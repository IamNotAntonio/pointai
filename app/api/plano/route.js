import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

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
    const { perfil, notas, eventos, historicoChat, ehPro } = await request.json();

    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const notasFormatadas = Object.entries(notas || {}).map(([materia, dados]) => {
      const listaNotas = dados.notas || [];
      const media = listaNotas.length > 0
        ? (listaNotas.reduce((acc, n) => acc + parseFloat(n || 0), 0) / listaNotas.length).toFixed(1)
        : 'sem notas';
      return `- ${materia}: média ${media}, faltas ${dados.faltas || 0}/${dados.totalAulas || 0}`;
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
