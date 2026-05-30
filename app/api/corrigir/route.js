import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

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

  const { texto, tipo, materia } = await req.json()

  const prompt = `Você é um professor universitário especialista em ${materia} corrigindo um trabalho de ${tipo} de um estudante de ${perfil.curso}.

TRABALHO PARA CORRIGIR:
${texto}

Forneça um feedback completo e construtivo com:

## Nota Estimada
Dê uma nota de 0 a 10 com justificativa clara.

## Pontos Fortes
Liste o que está bem feito no trabalho.

## Pontos a Melhorar
Liste o que precisa ser melhorado com explicações específicas.

## Problemas de Escrita
Aponte erros gramaticais, de coesão ou clareza encontrados.

## Sugestões Específicas
Dê sugestões concretas de como melhorar cada ponto fraco.

## Próximos Passos
O que o aluno deve fazer agora para melhorar o trabalho.

Seja específico, construtivo e encorajador.`

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  return Response.json({ resultado: resposta.content[0].text })
}
