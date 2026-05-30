import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

export async function POST(req) {
  // SECURITY: perfil + notas + eventos from authenticated session — never trust the body.
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const [perfilRes, notasRes, eventosRes] = await Promise.all([
    supabase.from('perfis').select('nome,curso,universidade,semestre,materias,objetivo').eq('user_id', user.id).maybeSingle(),
    supabase.from('notas').select('dados').eq('user_id', user.id).maybeSingle(),
    supabase.from('eventos').select('id,titulo,data,tipo,materia').eq('user_id', user.id).order('data', { ascending: true }),
  ])
  const perfil = perfilRes.data || EMPTY_PERFIL
  const notas = notasRes.data?.dados || {}
  const eventos = eventosRes.data || []

  // Body kept for forward-compat (currently no fields besides perfil/notas/eventos).
  await req.json().catch(() => null)

  const notasStr = notas
    ? Object.entries(notas).map(([mat, d]) => {
        const vals = (d?.notas || []).filter(n => n !== '' && n !== null)
        const media = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '—'
        return `${mat}: média ${media}, faltas ${d?.faltas || 0}/${Math.floor((d?.totalAulas || 60) * 0.25)} permitidas`
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
