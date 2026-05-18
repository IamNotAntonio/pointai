#!/usr/bin/env node
// Empacota /chrome-extension → /public/point-extension.zip

const { execSync } = require('child_process')
const path = require('path')
const fs   = require('fs')

const root = path.join(__dirname, '..')
const src  = path.join(root, 'chrome-extension')
const dest = path.join(root, 'public', 'point-extension.zip')

if (!fs.existsSync(src)) {
  console.log('[pack-extension] pasta chrome-extension não encontrada — pulando')
  process.exit(0)
}

if (fs.existsSync(dest)) fs.unlinkSync(dest)

try {
  execSync(`zip -r "${dest}" .`, { cwd: src, stdio: 'pipe' })
  const kb = (fs.statSync(dest).size / 1024).toFixed(1)
  console.log(`[pack-extension] ✓ public/point-extension.zip criado (${kb} KB)`)
} catch (err) {
  console.error('[pack-extension] erro ao criar zip:', err.message)
  process.exit(1)
}
