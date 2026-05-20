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
    const { perfil, materia, dificuldade, numQuestoes } = await request.json();

    const nivelDescricao = {
      facil: 'fácil — foque em conceitos básicos e definições fundamentais',
      medio: 'médio — foque em aplicação prática e resolução de problemas',
      dificil: 'difícil — foque em análise crítica, síntese e raciocínio avançado',
    }[dificuldade] || 'médio — foque em aplicação prática e resolução de problemas';

    const prompt = `Gere um simulado universitário brasileiro para o seguinte perfil:
- Universidade: ${perfil.universidade}
- Curso: ${perfil.curso}
- Matéria: ${materia}
- Nível de dificuldade: ${nivelDescricao}
- Número de questões: ${numQuestoes}

Crie exatamente ${numQuestoes} questões de múltipla escolha com 4 alternativas cada (A, B, C, D), no estilo de provas universitárias brasileiras da ${perfil.universidade}.

Responda APENAS com JSON puro, sem markdown, sem explicações fora do JSON, neste formato exato:
{"questoes":[{"numero":1,"enunciado":"...","alternativas":{"A":"...","B":"...","C":"...","D":"..."},"resposta_correta":"A","explicacao":"..."}]}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const data = extractJSON(message.content[0].text);
    return Response.json(data);
  } catch (error) {
    return Response.json({ erro: error.message || 'Erro ao gerar simulado' }, { status: 500 });
  }
}
