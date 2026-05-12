function stripMarkdown(md) {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '[fórmula]')
    .replace(/\$[^$]+\$/g, '[fórmula]')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cabecalho(doc, { titulo, subtitulo, perfil }) {
  doc.setFillColor(26, 122, 74)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('Point.AI', 14, 18)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), 196, 18, { align: 'right' })

  doc.setTextColor(20, 20, 20)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 14, 42)

  let y = 50
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  if (perfil) {
    doc.text(`${perfil.nome} · ${perfil.curso} · ${perfil.semestre}`, 14, y)
    y += 8
  }
  if (subtitulo) {
    doc.text(subtitulo, 14, y)
    y += 8
  }

  doc.setTextColor(40, 40, 40)
  return y + 4
}

function rodape(doc) {
  const n = doc.internal.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(170, 170, 170)
    doc.text(`Point.AI · Exportado em ${new Date().toLocaleDateString('pt-BR')} · ${i}/${n}`, 105, 290, { align: 'center' })
  }
}

function renderTexto(doc, texto, startY) {
  const linhas = doc.splitTextToSize(texto, 182)
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  let y = startY
  for (const linha of linhas) {
    if (y > 276) {
      doc.addPage()
      y = 18
    }
    doc.text(linha, 14, y)
    y += 5.8
  }
}

export async function gerarPDFChat({ conteudo, perfil, materia }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const startY = cabecalho(doc, {
    titulo: materia,
    subtitulo: 'Assistente Point.AI — Resposta do chat',
    perfil,
  })

  renderTexto(doc, stripMarkdown(conteudo), startY)
  rodape(doc)

  doc.save(`pointai_${materia.replace(/\s+/g, '_')}.pdf`)
}

export async function gerarPDFFeedback({ resultado, tipo, materia, perfil }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const startY = cabecalho(doc, {
    titulo: `Feedback: ${materia}`,
    subtitulo: `Tipo de trabalho: ${tipo}`,
    perfil,
  })

  // Extract grade
  const notaMatch = resultado.match(/\b(\d{1,2}[,.]?\d*)\s*\/\s*10\b/i)
    || resultado.match(/(?:nota|grade)[:\s]+(\d{1,2}[,.]?\d*)/i)

  let contentY = startY
  if (notaMatch) {
    const nota = parseFloat(notaMatch[1].replace(',', '.'))
    const [r, g, b] = nota >= 7 ? [26, 122, 74] : nota >= 5 ? [217, 119, 6] : [220, 38, 38]
    doc.setFillColor(r, g, b)
    doc.roundedRect(14, startY, 56, 22, 4, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`${nota.toFixed(1)}/10`, 42, startY + 14, { align: 'center' })
    doc.setTextColor(40, 40, 40)
    contentY = startY + 30
  }

  renderTexto(doc, stripMarkdown(resultado), contentY)
  rodape(doc)

  doc.save(`feedback_${materia.replace(/\s+/g, '_')}.pdf`)
}
