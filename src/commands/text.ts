import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { readStdinSync } from '../utils.js'
import { exitWithError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

type Operation = 'stats' | 'reverse' | 'truncate' | 'sort' | 'unique' | 'shuffle' | 'wrap' | 'slug' | 'freq'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function wrapText(input: string, width: number): string {
  if (width < 1) return input
  const lines = input.split(/\r?\n/)
  const out: string[] = []
  for (const line of lines) {
    if (line.length <= width) {
      out.push(line)
      continue
    }
    const words = line.split(/\s+/)
    let current = ''
    for (const word of words) {
      if (current && current.length + 1 + word.length > width) {
        out.push(current)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    }
    if (current) out.push(current)
  }
  return out.join('\n')
}

function wordFrequency(input: string, top: number): [string, number][] {
  const freq = new Map<string, number>()
  const words = input.toLowerCase().match(/[a-z0-9']+/g) ?? []
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top)
}

export function text(args: string[]) {
  const { flags, rest } = parseCommonFlags(args)

  let operation: Operation = 'stats'
  let n = 0
  const inputParts: string[] = []

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    switch (a) {
      case '--reverse':
        operation = 'reverse'
        break
      case '--truncate':
        operation = 'truncate'
        n = Number(rest[i + 1]) || 0
        i++
        break
      case '--sort':
        operation = 'sort'
        break
      case '--unique':
        operation = 'unique'
        break
      case '--shuffle':
        operation = 'shuffle'
        break
      case '--wrap':
        operation = 'wrap'
        n = Number(rest[i + 1]) || 80
        i++
        break
      case '--slug':
        operation = 'slug'
        break
      case '--freq':
        operation = 'freq'
        n = Number(rest[i + 1]) || 10
        i++
        break
      default:
        inputParts.push(a)
    }
  }

  const input = inputParts.join(' ') || readStdinSync()
  if (!input) {
    exitWithError('no input provided')
  }

  // ── Stats (default) ────────────────────────────────────────────────────
  if (operation === 'stats') {
    const words = input.trim().split(/\s+/).filter(Boolean)
    const charsNoWs = input.replace(/\s+/g, '').length
    const lines = input.split(/\r?\n/)
    const paragraphs = input.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '')
    const avgLen = words.length > 0 ? (charsNoWs / words.length).toFixed(1) : '0'

    if (flags.json) {
      console.log(
        JSON.stringify({
          characters: input.length,
          charactersNoSpaces: charsNoWs,
          words: words.length,
          lines: lines.length,
          paragraphs,
          bytes: Buffer.byteLength(input),
          uniqueWords,
          longestWord: longest,
          avgWordLength: Number(avgLen),
        }),
      )
      return
    }

    console.log('')
    console.log(`  ${chalk.bold('Text Stats')}`)
    console.log(`  ${chalk.dim('────────────')}`)
    console.log(`  ${chalk.dim('Characters:')}     ${chalk.white(String(input.length))}`)
    console.log(`  ${chalk.dim('No whitespace:')}  ${chalk.white(String(charsNoWs))}`)
    console.log(`  ${chalk.dim('Words:')}          ${chalk.white(String(words.length))}`)
    console.log(`  ${chalk.dim('Lines:')}          ${chalk.white(String(lines.length))}`)
    console.log(`  ${chalk.dim('Paragraphs:')}     ${chalk.white(String(paragraphs))}`)
    console.log(`  ${chalk.dim('Bytes (UTF-8):')}  ${chalk.white(String(Buffer.byteLength(input)))}`)
    console.log(`  ${chalk.dim('Unique words:')}   ${chalk.white(String(uniqueWords))}`)
    if (longest) {
      console.log(`  ${chalk.dim('Longest word:')}    ${chalk.white(longest)} ${chalk.dim(`(${longest.length} chars)`)}`)
      console.log(`  ${chalk.dim('Avg word len:')}    ${chalk.white(avgLen)}`)
    }
    console.log('')
    return
  }

  // ── Transformations ────────────────────────────────────────────────────
  let result: string
  switch (operation) {
    case 'reverse':
      result = input.split('').reverse().join('')
      break
    case 'truncate':
      result = input.length > n ? input.slice(0, n).trimEnd() + '…' : input
      break
    case 'sort':
      result = input.split(/\r?\n/).sort().join('\n')
      break
    case 'unique':
      result = [...new Set(input.split(/\r?\n/))].join('\n')
      break
    case 'shuffle':
      result = [...input.split(/\r?\n/)]
        .map((line) => ({ line, key: Math.random() }))
        .sort((a, b) => a.key - b.key)
        .map((o) => o.line)
        .join('\n')
      break
    case 'wrap':
      result = wrapText(input, n)
      break
    case 'slug':
      result = slugify(input)
      break
    case 'freq': {
      const top = wordFrequency(input, n)
      if (flags.json) {
        console.log(JSON.stringify({ words: top.map(([w, c]) => ({ word: w, count: c })) }))
        return
      }
      console.log('')
      console.log(`  ${chalk.bold('Word Frequency')}`)
      console.log(`  ${chalk.dim('─────────────────')}`)
      const maxCount = top[0]?.[1] ?? 0
      const barWidth = 20
      for (const [word, count] of top) {
        const bar = '█'.repeat(Math.round((count / maxCount) * barWidth))
        console.log(`  ${chalk.white(word.padEnd(16))} ${chalk.yellow(String(count).padEnd(4))} ${chalk.dim(bar)}`)
      }
      console.log('')
      return
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({ operation, result }))
    return
  }

  console.log('')
  console.log(result)
  console.log('')
}

const textHelp = createHelp({
  name: 'text',
  description: 'Text statistics & transformations (wc, reverse, slug, freq & more)',
  usage: 'dt text <text> [options]',
  options: [
    { flags: '--reverse', desc: 'Reverse the text' },
    { flags: '--truncate <n>', desc: 'Truncate to n characters with ellipsis' },
    { flags: '--sort', desc: 'Sort lines alphabetically' },
    { flags: '--unique', desc: 'Remove duplicate lines' },
    { flags: '--shuffle', desc: 'Shuffle lines randomly' },
    { flags: '--wrap <n>', desc: 'Wrap text at n characters (default: 80)' },
    { flags: '--slug', desc: 'Convert to a URL-friendly slug' },
    { flags: '--freq <n>', desc: 'Top-n word frequency table (default: 10)' },
  ],
  extra: [`  ${chalk.yellow('Pipe input:')}`, '    cat file.txt | dt text', '    echo "hello world" | dt text --freq', ''],
  examples: [
    { cmd: 'dt text "hello world"' },
    { cmd: 'dt text "Hello, World!" --reverse' },
    { cmd: 'dt text "My Project Name" --slug' },
    { cmd: 'dt text "lorem ipsum dolor" --truncate 6' },
    { cmd: 'dt text "b\\na\\nc" --sort' },
    { cmd: 'dt text "foo bar foo baz" --freq' },
  ],
})

async function textInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const input = await ask(rl, `  ${chalk.yellow('?')} Text (or paste): `)
  if (isBack(input)) return
  const operation = (await ask(rl, `  ${chalk.yellow('?')} Operation ${chalk.dim('(stats/reverse/sort/unique/slug/truncate/freq)')} ${chalk.dim('[stats]')}: `)).trim()
  if (isBack(operation)) return
  const args: string[] = []
  if (input) args.push(input)
  switch (operation) {
    case 'reverse':
      args.push('--reverse')
      break
    case 'sort':
      args.push('--sort')
      break
    case 'unique':
      args.push('--unique')
      break
    case 'slug':
      args.push('--slug')
      break
    case 'truncate':
      args.push('--truncate', '50')
      break
    case 'freq':
      args.push('--freq', '10')
      break
  }
  const output = captureOutput(() => text(args))
  await pauseWithCopy(rl, output)
}

export const textCommand: Command = {
  name: 'text',
  aliases: [],
  category: 'data',
  description: 'Text statistics & transformations (wc, reverse, slug, freq & more)',
  run: text,
  help: textHelp,
  interactive: textInteractive,
}
