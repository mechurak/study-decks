#!/usr/bin/env node
/**
 * decks/ 하위의 모든 Slidev 덱을 빌드하고 dist/index.html 인덱스를 생성한다.
 *
 * 사용법:
 *   node scripts/build-all.mjs           # 전체 빌드 + 인덱스 생성
 *   node scripts/build-all.mjs supabase  # 해당 덱만 빌드 (인덱스는 전체 메타로 갱신)
 *
 * 슬라이드 번호 계산은 @slidev/parser의 분할 규칙을 그대로 따른다:
 *   - 코드 펜스(```) 밖에서 /^---+$/ 인 줄이 슬라이드 구분자
 *   - 구분자 바로 다음 줄이 비어 있지 않으면 프론트매터 블록으로 보고 닫는 --- 까지 스킵
 *   - 프론트매터에 src: 가 있으면 해당 파일을 따라가며 이어서 카운트
 */
import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DECKS_DIR = path.join(ROOT, 'decks')
const DIST_DIR = path.join(ROOT, 'dist')

// ---------------------------------------------------------------- 덱 스캔

async function scanDecks() {
  const entries = await readdir(DECKS_DIR, { withFileTypes: true })
  return entries
    .filter(e => e.isDirectory() && existsSync(path.join(DECKS_DIR, e.name, 'slides.md')))
    .map(e => e.name)
    .sort()
}

// ------------------------------------------------------- slides.md 파싱

const DIVIDER_RE = /^---+$/
const FENCE_RE = /^```/

/** 헤드매터(파일 첫 블록)에서 key: value 를 정규식으로 최소 추출한다. */
function parseHeadmatter(lines) {
  const meta = {}
  if (lines[0]?.trimEnd() !== '---')
    return { meta, bodyStart: 0 }
  let end = lines.length
  for (let i = 1; i < lines.length; i++) {
    if (DIVIDER_RE.test(lines[i].trimEnd())) {
      end = i
      break
    }
  }
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^(title|description):\s*(.*)\s*$/)
    if (m)
      meta[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return { meta, bodyStart: end + 1 }
}

/**
 * 본문을 스캔하며 ## 헤딩을 (텍스트, 슬라이드 번호)로 수집한다.
 * counter는 { n } 형태의 공유 카운터 — src: 재귀 시에도 번호가 이어진다.
 */
function collectFromLines(lines, startIndex, counter, headings, baseDir) {
  let inFence = false
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trimEnd()

    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence)
      continue

    if (DIVIDER_RE.test(line)) {
      counter.n += 1
      // 구분자 다음 줄이 비어 있지 않으면 슬라이드별 프론트매터 (Slidev 규칙)
      if (lines[i + 1]?.trim()) {
        const fmLines = []
        let j = i + 1
        for (; j < lines.length; j++) {
          if (/^---$/.test(lines[j].trimEnd()))
            break
          fmLines.push(lines[j])
        }
        i = j // 닫는 --- 까지 소비
        const srcLine = fmLines.map(l => l.match(/^src:\s*(.+?)\s*$/)).find(Boolean)
        if (srcLine) {
          const srcPath = path.resolve(baseDir, srcLine[1].replace(/^(['"])(.*)\1$/, '$2'))
          collectFromFile(srcPath, counter, headings)
        }
      }
      continue
    }

    const h = line.match(/^##\s+(.+?)\s*#*\s*$/)
    if (h)
      headings.push({ text: h[1], slide: counter.n })
  }
}

/** src: 로 포함된 외부 파일. 파일 선두의 프론트매터는 현재 슬라이드에 병합되므로 번호를 올리지 않는다. */
function collectFromFile(filePath, counter, headings) {
  if (!existsSync(filePath)) {
    console.warn(`  ⚠ src 파일을 찾을 수 없음: ${filePath}`)
    return
  }
  const raw = readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)
  const { bodyStart } = parseHeadmatter(lines)
  collectFromLines(lines, bodyStart, counter, headings, path.dirname(filePath))
}

async function parseDeck(name) {
  const deckDir = path.join(DECKS_DIR, name)
  const raw = await readFile(path.join(deckDir, 'slides.md'), 'utf8')
  const lines = raw.split(/\r?\n/)
  const { meta, bodyStart } = parseHeadmatter(lines)
  const headings = []
  const counter = { n: 1 }
  collectFromLines(lines, bodyStart, counter, headings, deckDir)
  return {
    name,
    title: meta.title || name,
    description: meta.description || '',
    toc: headings,
    slideCount: counter.n,
  }
}

// ---------------------------------------------------------------- 빌드

function buildDeck(name) {
  const deckDir = path.join(DECKS_DIR, name)
  return new Promise((resolve, reject) => {
    console.log(`\n▶ building deck: ${name}`)
    const child = spawn(
      'pnpm',
      ['exec', 'slidev', 'build', '--base', `/${name}/`, '--out', `../../dist/${name}`],
      { cwd: deckDir, stdio: 'inherit', shell: process.platform === 'win32' },
    )
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0)
        resolve()
      else
        reject(new Error(`deck "${name}" 빌드 실패 (exit ${code})`))
    })
  })
}

// ---------------------------------------------------------- 인덱스 생성

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderCard(deck) {
  const { name, title, description, toc, slideCount } = deck
  const summaryItems = toc.slice(0, 3).map(h => esc(h.text)).join(' · ')
  const more = toc.length > 3 ? ` <span class="more">+${toc.length - 3}</span>` : ''
  const tocList = toc
    .map(h => `<li><a href="/${name}/#/${h.slide}"><span class="no">${h.slide}</span>${esc(h.text)}</a></li>`)
    .join('\n          ')
  return `
    <article class="card">
      <a class="card-link" href="/${name}/">
        <h2>${esc(title)}</h2>
        <p class="desc">${esc(description) || '&nbsp;'}</p>
      </a>
      <p class="summary">${summaryItems ? summaryItems + more : '<span class="more">목차 없음</span>'}</p>
      <div class="card-foot">
        ${toc.length
          ? `<details>
          <summary>목차</summary>
          <ol class="toc">
          ${tocList}
          </ol>
        </details>`
          : ''}
        <span class="count">${slideCount} slides</span>
      </div>
    </article>`
}

function renderIndex(decks) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Study Decks</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>">
<style>
  :root {
    --bg: #faf9f7;
    --fg: #1c1917;
    --muted: #78716c;
    --line: #e7e5e4;
    --card: #ffffff;
    --accent: #0d9488;
    --accent-soft: #ccfbf1;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14120f;
      --fg: #e7e5e4;
      --muted: #a8a29e;
      --line: #292524;
      --card: #1c1917;
      --accent: #2dd4bf;
      --accent-soft: #134e4a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 1040px; margin: 0 auto; padding: 64px 24px 96px; }
  .eyebrow {
    font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
    color: var(--accent); font-weight: 600; margin: 0 0 8px;
  }
  h1 { font-size: clamp(28px, 5vw, 40px); margin: 0 0 6px; letter-spacing: -.02em; }
  .lede { color: var(--muted); margin: 0 0 48px; font-size: 15px; }
  .grid {
    display: grid; gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 24px 24px 18px;
    display: flex; flex-direction: column;
    transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
  }
  .card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgb(0 0 0 / .06);
  }
  .card-link { text-decoration: none; color: inherit; display: block; }
  .card h2 { font-size: 19px; margin: 0 0 6px; letter-spacing: -.01em; }
  .card-link:hover h2 { color: var(--accent); }
  .desc {
    color: var(--muted); font-size: 14px; margin: 0 0 14px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; min-height: calc(1.55em * 2);
  }
  .summary {
    font-size: 13px; color: var(--muted); margin: 0 0 14px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    border-top: 1px solid var(--line); padding-top: 12px;
  }
  .more {
    color: var(--accent); background: var(--accent-soft);
    border-radius: 999px; padding: 1px 7px; font-size: 11px; font-weight: 600;
  }
  .card-foot {
    margin-top: auto; display: flex; align-items: flex-start;
    justify-content: space-between; gap: 12px;
  }
  .count { font-size: 12px; color: var(--muted); white-space: nowrap; padding-top: 6px; }
  details { flex: 1; min-width: 0; }
  summary {
    display: inline-block; cursor: pointer; user-select: none;
    font-size: 13px; font-weight: 600; color: var(--fg);
    border: 1px solid var(--line); border-radius: 8px; padding: 5px 14px;
    transition: border-color .15s ease, background .15s ease;
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { border-color: var(--accent); }
  details[open] summary { background: var(--accent-soft); border-color: var(--accent); }
  .toc { margin: 12px 0 4px; padding: 0; list-style: none; }
  .toc li + li { margin-top: 2px; }
  .toc a {
    display: flex; gap: 10px; align-items: baseline;
    padding: 5px 8px; border-radius: 6px;
    font-size: 13.5px; color: var(--fg); text-decoration: none;
  }
  .toc a:hover { background: var(--accent-soft); color: var(--accent); }
  .toc .no {
    font-variant-numeric: tabular-nums; color: var(--muted);
    font-size: 11px; min-width: 18px; text-align: right; flex-shrink: 0;
  }
  footer { margin-top: 64px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <p class="eyebrow">Study Decks</p>
  <h1>스터디 자료</h1>
  <p class="lede">주제별 슬라이드 덱 모음 — 카드를 클릭하면 슬라이드로 이동합니다.</p>
  <div class="grid">
${decks.map(renderCard).join('\n')}
  </div>
  <footer>Built with Slidev · ${decks.length} deck${decks.length === 1 ? '' : 's'}</footer>
</main>
</body>
</html>
`
}

// ---------------------------------------------------------------- main

async function main() {
  const target = process.argv[2]
  const allNames = await scanDecks()

  if (allNames.length === 0) {
    console.error('decks/ 아래에 slides.md를 가진 덱이 없습니다.')
    process.exit(1)
  }
  if (target && !allNames.includes(target)) {
    console.error(`덱 "${target}" 을 찾을 수 없습니다. 사용 가능: ${allNames.join(', ')}`)
    process.exit(1)
  }

  const toBuild = target ? [target] : allNames

  if (!target)
    await rm(DIST_DIR, { recursive: true, force: true })
  await mkdir(DIST_DIR, { recursive: true })

  // 하나라도 실패하면 즉시 중단 (부분 배포 방지)
  for (const name of toBuild)
    await buildDeck(name)

  // 인덱스는 항상 전체 덱 메타데이터로 갱신
  const decks = []
  for (const name of allNames)
    decks.push(await parseDeck(name))

  await writeFile(path.join(DIST_DIR, 'index.html'), renderIndex(decks))
  console.log(`\n✔ ${toBuild.length}개 덱 빌드 완료, dist/index.html 생성 (${decks.length}개 덱 등록)`)
}

main().catch((err) => {
  console.error(`\n✘ ${err.message}`)
  process.exit(1)
})
