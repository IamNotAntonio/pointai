// Point.AI — Popup Script

const statusDot    = document.getElementById('statusDot')
const statusLabel  = document.getElementById('statusLabel')
const pendingBanner = document.getElementById('pendingBanner')
const btnOpenApp   = document.getElementById('btnOpenApp')
const btnClear     = document.getElementById('btnClearPending')

// Open Point.AI notas page
btnOpenApp.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://pointai-two.vercel.app/notas' })
  window.close()
})

// Clear pending import data
btnClear.addEventListener('click', () => {
  chrome.storage.local.remove('pointai_pending_import', () => {
    pendingBanner.style.display = 'none'
    btnClear.style.display = 'none'
  })
})

// Check status of current tab and pending data
async function checkStatus() {
  // Check for pending import data
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
    if (resp?.pending) {
      pendingBanner.style.display = 'block'
      btnClear.style.display = 'flex'
    }
  })

  // Check if current tab is an academic portal
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (!tab) return

    const url = tab.url || ''
    const academicPatterns = [
      /siga/i, /moodle/i, /totvs/i, /suagrade/i, /sapiens/i,
      /academico/i, /aluno.*edu/i, /portal.*edu/i, /sistema.*edu/i,
      /ava\./i, /intranet.*edu/i, /sga\./i, /kroton/i, /anhanguera/i,
    ]

    const isAcademic = academicPatterns.some(p => p.test(url))
    const isPointAI  = url.includes('pointai-two.vercel.app')

    if (isPointAI) {
      statusDot.className = 'status-dot active'
      statusLabel.innerHTML = '<strong>Point.AI aberto!</strong> Você pode importar dados do portal da faculdade.'
    } else if (isAcademic) {
      statusDot.className = 'status-dot active'
      statusLabel.innerHTML = '<strong>Portal acadêmico detectado!</strong> Clique no botão verde na página para importar.'
    } else {
      statusDot.className = 'status-dot'
      statusLabel.innerHTML = 'Acesse o <strong>portal da sua faculdade</strong> e o botão de importação aparecerá automaticamente.'
    }
  })
}

checkStatus()
