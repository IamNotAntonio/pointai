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

export async function POST(req) {
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

  // Body kept for forward-compat. Dados vêm da sessão (anti-spoof), não do body.
  await req.json().catch(() => null)

  const notasStr = materias.length
    ? materias.map((m) => {
        const media = mediaPonderada(m.avaliacoes)
        const meta = Number(m.media_aprovacao) || 7
        const mediaTxt = media != null ? media.toFixed(1) : '—'
        // Limite REAL de faltas (coluna limite_faltas). null = não configurado.
        const limiteFaltas = m.limite_faltas == null ? null : Number(m.limite_faltas)
        const faltasTxt = limiteFaltas == null
          ? `faltas ${m.faltas || 0} (limite não definido)`
          : `faltas ${m.faltas || 0}/${limiteFaltas} permitidas`
        const aviso = media != null && media < meta ? ' ⚠ abaixo da meta' : ''
        return `${m.nome}: média ${mediaTxt} (meta ${meta}), ${faltasTxt}${aviso}`
      }).join('\n')
    : 'Sem dados de notas cadastrados'

  const eventosStr = eventos?.length
    ? eventos.slice(0, 10).map(e => `${e.data}: ${e.titulo} (${e.tipo})`).join('\n')
    : 'Sem eventos cadastrados'

  const prompt = `Gere um relatório semanal acadêmico personalizado para ${perfil.nome}.

PERFIL:
- Curso: ${perfil.curso} — ${perfil.semestre}
- Universidade: ${perfil.universidade}
- Objetivo: ${perfil.objetivo}

NOTAS E FALTAS ATUAIS:
${notasStr}

PRÓXIMOS EVENTOS:
${eventosStr}

FORMATO DO RELATÓRIO:

## 📊 Panorama da Semana
[Visão geral honesta do desempenho, destaque o ponto mais positivo]

## 📚 Análise por Matéria
[Para cada matéria com dados: status (aprovado/atenção/risco), o que fazer]

## ⚠️ Pontos de Atenção
[Riscos reais: notas abaixo de 7, faltas próximas do limite, provas chegando]

## 🎯 Plano para a Próxima Semana
[5 ações concretas, priorizadas, com tempo estimado cada]

## 💬 Mensagem do Point AI
[Mensagem pessoal, motivadora, baseada no objetivo de ${perfil.nome}]

Fale diretamente com ${perfil.nome}. Seja específico com os dados. Seja honesto mas encorajador.`

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ relatorio: resposta.content[0].text })
}
