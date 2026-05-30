import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

const TIPO_LABEL = {
  Prova:    'prova/avaliação',
  Tarefa:   'tarefa/exercício',
  Trabalho: 'trabalho acadêmico',
  Anotação: 'anotação de aula',
}

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

  const { tipo, texto, imagemBase64, imagemTipo, materia } = await req.json()

  const tipoLabel = TIPO_LABEL[tipo] || tipo

  const sistema = `Você é um tutor acadêmico especializado analisando materiais de alunos brasileiros.

PERFIL DO ALUNO:
- Nome: ${perfil.nome}
- Curso: ${perfil.curso}
- Universidade: ${perfil.universidade}
- Semestre: ${perfil.semestre}
- Objetivo: ${perfil.objetivo}

TAREFA: Analise a ${tipoLabel} de ${materia} e forneça feedback estruturado.

FORMATO DA RESPOSTA — use exatamente estas seções:
## 📋 Diagnóstico
[Avaliação geral, nota estimada se aplicável, nível de domínio do conteúdo]

## ✅ Pontos Fortes
[O que o aluno demonstrou saber bem, com exemplos do material]

## ❌ Erros Encontrados
[Erros específicos, conceitos mal compreendidos, lacunas identificadas]

## 🗺️ Plano de Melhoria
[Ações concretas: o que revisar, como estudar, exercícios sugeridos]

Seja específico, didático e encorajador. Use exemplos práticos do contexto de ${perfil.curso}.`

  const content = []

  if (imagemBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imagemTipo || 'image/jpeg', data: imagemBase64 },
    })
  }

  content.push({
    type: 'text',
    text: texto?.trim() ? texto : `Analise este(a) ${tipoLabel} de ${materia}.`,
  })

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: sistema,
    messages: [{ role: 'user', content }],
  })

  return Response.json({ analise: resposta.content[0].text })
}
