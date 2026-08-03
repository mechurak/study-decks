#!/usr/bin/env node
/**
 * 개별 덱의 dev 서버를 띄운다.
 * 사용법: pnpm dev <deckName>   (예: pnpm dev supabase)
 */
import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DECKS_DIR = path.join(ROOT, 'decks')

const name = process.argv[2]
const entries = await readdir(DECKS_DIR, { withFileTypes: true })
const available = entries
  .filter(e => e.isDirectory() && existsSync(path.join(DECKS_DIR, e.name, 'slides.md')))
  .map(e => e.name)

if (!name || !available.includes(name)) {
  console.error(`사용법: pnpm dev <deckName>\n사용 가능한 덱: ${available.join(', ')}`)
  process.exit(1)
}

const child = spawn('pnpm', ['exec', 'slidev', ...process.argv.slice(3)], {
  cwd: path.join(DECKS_DIR, name),
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
child.on('exit', code => process.exit(code ?? 0))
