import Anthropic from '@anthropic-ai/sdk'

const cliente = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req) {
  const { texto, tipo, materia, perfil } = await req.json()

  const prompt = `Você é um professor universitário especialista em ${materia} corrigindo um trabalho de ${tipo} de um estudante de ${perfil.curso}.

TRABALHO PARA CORRIGIR:
${texto}

Forneça um feedback completo e construtivo com:

## 📊 Nota Estimada
Dê uma nota de 0 a 10 com justificativa clara.

## ✅ Pontos Fortes
Liste o que está bem feito no trabalho.

## ⚠️ Pontos a Melhorar
Liste o que precisa ser melhorado com explicações específicas.

## 📝 Problemas de Escrita
Aponte erros gramaticais, de coesão ou clareza encontrados.

## 🎯 Sugestões Específicas
Dê sugestões concretas de como melhorar cada ponto fraco.

## 💡 Próximos Passos
O que o aluno deve fazer agora para melhorar o trabalho.

Seja específico, construtivo e encorajador. Use o contexto de ${perfil.curso} nas suas sugestões.`

  const resposta = await cliente.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  return Response.json({ resultado: resposta.content[0].text })
}