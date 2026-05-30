import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

export async function POST(req) {
  // SECURITY: perfil from authenticated session — never trust body.perfil.
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { data: perfilDb } = await supabase
    .from('perfis')
    .select('nome,curso,universidade,semestre,materias,objetivo')
    .eq('user_id', user.id)
    .maybeSingle()
  const perfil = perfilDb || EMPTY_PERFIL

  const { mensagens, materia } = await req.json()

  const historico = mensagens
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => `${m.role === 'user' ? 'Aluno' : 'Point'}: ${(m.content || '').slice(0, 200)}`)
    .join('\n')

  const prompt = `Crie um resumo MUITO BREVE (máximo 3 frases) desta conversa sobre ${materia} de ${perfil.nome}.
Foque em: principais dúvidas do aluno, conceitos discutidos, progresso demonstrado.
Use 3ª pessoa. Exemplo: "O aluno teve dificuldade com X. Discutimos Y. Demonstrou entender Z."

Conversa:
${historico}`

  const resposta = await cliente.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ resumo: resposta.content[0].text })
}
