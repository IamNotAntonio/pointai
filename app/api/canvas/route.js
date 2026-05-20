// Canvas LMS API proxy — avoids CORS issues from the browser
// POST { token, dominio, tipo: 'notas'|'calendario' }
import { canvasGet, fetchNotas, fetchCalendario } from './_lib'

export async function POST(req) {
  try {
    const { token, dominio, tipo } = await req.json()

    if (!token?.trim() || !dominio?.trim()) {
      return Response.json({ erro: 'Preencha o domínio e o token de acesso.' }, { status: 400 })
    }

    const base    = `https://${dominio.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    const headers = {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept':        'application/json',
    }

    if (tipo === 'notas') {
      const dados = await fetchNotas(base, headers)
      if (!dados) return Response.json({ erro: 'Nenhuma matéria ativa encontrada.' }, { status: 404 })
      return Response.json({ dados })
    }

    const dados = await fetchCalendario(base, headers)
    if (!dados) return Response.json({ erro: 'Nenhum evento futuro encontrado.' }, { status: 404 })
    return Response.json({ dados })

  } catch (err) {
    console.error('[canvas]', err.message)
    return Response.json({ erro: err.message || 'Erro ao conectar com o Canvas.' }, { status: 502 })
  }
}
