import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../lib/supabase-server'

const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMPTY_PERFIL = { nome: '', curso: '', universidade: '', semestre: '', materias: '', objetivo: '' }

const PROMPT_NOTAS = (materias) => `Você é um sistema de extração de dados acadêmicos. Analise o conteúdo fornecido (imagem ou texto de um portal universitário) e extraia as informações de notas e frequência.

Matérias cadastradas pelo aluno: ${materias}

Retorne APENAS um JSON válido, sem markdown, sem texto adicional, no formato exato abaixo:
{
  "materias": [
    {
      "nome": "Nome igual ou mais próximo das matérias cadastradas acima",
      "notas": [8.5, 7.0, null],
      "faltas": 3,
      "totalAulas": 60
    }
  ]
}

Regras:
- Use null para notas ainda não lançadas
- Se não encontrar total de aulas, use 60
- Se não encontrar faltas, use 0
- Case os nomes o mais próximo possível das matérias cadastradas
- Inclua somente matérias que encontrou no conteúdo`

const PROMPT_CALENDARIO = (materias, hoje) => `Você é um sistema de extração de eventos acadêmicos. Analise o conteúdo e extraia todos os eventos do calendário (provas, trabalhos, apresentações, prazos).

Matérias cadastradas: ${materias}
Data de hoje: ${hoje}

Retorne APENAS um JSON válido, sem markdown, sem texto adicional, no formato exato:
{
  "eventos": [
    {
      "titulo": "Nome do evento",
      "data": "YYYY-MM-DD",
      "tipo": "prova",
      "materia": "Nome da matéria ou string vazia"
    }
  ]
}

Tipos válidos: "prova", "trabalho", "apresentacao", "outro"
- Converta todas as datas para YYYY-MM-DD
- Se o ano não estiver claro, assuma o ano corrente ou próximo
- Inclua eventos futuros e próximos; pule eventos claramente passados`

export async function POST(req) {
  try {
    // SECURITY: perfil from authenticated session — never trust body.perfil.
    const { supabase, user } = await requireUser()
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const { data: perfilDb } = await supabase
      .from('perfis')
      .select('nome,curso,universidade,semestre,materias,objetivo')
      .eq('user_id', user.id)
      .maybeSingle()
    const perfil = perfilDb || EMPTY_PERFIL

    const { imagemBase64, imagemTipo, texto, tipo } = await req.json()

    if (!imagemBase64 && !texto?.trim()) {
      return Response.json({ erro: 'Envie uma imagem ou cole um texto para importar.' }, { status: 400 })
    }

    const materias = perfil?.materias || ''
    const hoje = new Date().toISOString().split('T')[0]
    const prompt = tipo === 'notas' ? PROMPT_NOTAS(materias) : PROMPT_CALENDARIO(materias, hoje)

    let msgContent
    if (imagemBase64) {
      msgContent = [
        { type: 'image', source: { type: 'base64', media_type: imagemTipo || 'image/jpeg', data: imagemBase64 } },
        { type: 'text', text: prompt },
      ]
    } else {
      msgContent = `${prompt}\n\nConteúdo para analisar:\n${texto}`
    }

    const resposta = await cliente.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: msgContent }],
    })

    const raw = resposta.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return Response.json(
        { erro: 'Não foi possível interpretar o conteúdo. Tente uma imagem mais nítida ou cole o texto diretamente.' },
        { status: 422 }
      )
    }

    const dados = JSON.parse(jsonMatch[0])
    return Response.json({ dados })
  } catch (e) {
    console.error(e)
    return Response.json({ erro: 'Erro ao processar. Tente novamente.' }, { status: 500 })
  }
}
