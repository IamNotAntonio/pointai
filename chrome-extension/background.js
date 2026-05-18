// Point.AI — Background Service Worker
// Handles communication between content script and popup

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_IMPORT_DATA') {
    // Store extracted grade data for Point.AI to consume
    chrome.storage.local.set({
      pointai_pending_import: {
        dados: message.dados,
        fonte: message.fonte,
        timestamp: Date.now(),
      }
    }, () => {
      // Open Point.AI notas page in a new tab
      chrome.tabs.create({ url: 'https://pointai-two.vercel.app/notas' })
      // Notify content script
      chrome.tabs.sendMessage(sender.tab.id, { type: 'IMPORT_QUEUED' })
      sendResponse({ ok: true })
    })
    return true // keep channel open for async response
  }

  if (message.type === 'GET_IMPORT_DATA') {
    chrome.storage.local.get(['pointai_pending_import'], (result) => {
      sendResponse(result.pointai_pending_import || null)
      // Clear after reading
      if (result.pointai_pending_import) {
        chrome.storage.local.remove('pointai_pending_import')
      }
    })
    return true
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['pointai_pending_import'], (result) => {
      sendResponse({ pending: !!result.pointai_pending_import })
    })
    return true
  }
})
