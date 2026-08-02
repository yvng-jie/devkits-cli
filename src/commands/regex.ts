import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { readStdinSync } from '../utils.js'
import { exitWithError, ExitError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

interface MatchResult {
  match: string
  index: number
  groups: (string | undefined)[]
  named: Record<string, string>
}

const VALID_FLAGS = 'gimsuy'

/** Compile a regex or exit with a friendly error. */
function compileRegex(pattern: string, flags: string): RegExp {
  try {
    return new RegExp(pattern, flags)
  } catch (e) {
    console.log(chalk.red(`Error: invalid regex — ${(e as Error).message}`))
    throw new ExitError(`invalid regex — ${(e as Error).message}`)
  }
}

export function regex(args: string[]) {
  const { flags, rest } = parseCommonFlags(args)

  let pattern: string | undefined
  let flagsStr = ''
  let replacement: string | undefined
  const inputParts: string[] = []

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--flags') {
      flagsStr = rest[i + 1] ?? ''
      i++
    } else if (a === '--replace') {
      replacement = rest[i + 1] ?? ''
      i++
    } else if (pattern === undefined) {
      pattern = a
    } else {
      inputParts.push(a)
    }
  }

  if (!pattern) {
    exitWithError('provide a regex pattern (e.g. "\\d+")')
  }

  const patternText = pattern!

  for (const f of flagsStr) {
    if (!VALID_FLAGS.includes(f)) {
      exitWithError(`invalid regex flag "${f}" (supported: ${VALID_FLAGS.split('').join(', ')})`)
    }
  }

  const re = compileRegex(patternText, flagsStr)

  const input = inputParts.join(' ') || readStdinSync()
  if (!input) {
    exitWithError('provide input text to match against (arg or pipe)')
  }

  const testResult = re.test(input)
  re.lastIndex = 0

  // Collect matches
  const matches: MatchResult[] = []
  if (flagsStr.includes('g')) {
    let m: RegExpExecArray | null
    while ((m = re.exec(input)) !== null) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1), named: m.groups ?? {} })
      if (m[0] === '') re.lastIndex++
    }
  } else {
    const m = re.exec(input)
    if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1), named: m.groups ?? {} })
  }

  // Compute replacement (forces global for full replacement preview)
  const replaced =
    replacement !== undefined
      ? input.replace(new RegExp(patternText, flagsStr.includes('g') ? flagsStr : `${flagsStr}g`), replacement)
      : undefined

  if (flags.json) {
    console.log(
      JSON.stringify({
        pattern: `/${patternText}/${flagsStr}`,
        test: testResult,
        matchCount: matches.length,
        matches: matches.map((m) => ({ match: m.match, index: m.index, groups: m.groups, named: m.named })),
        ...(replaced !== undefined ? { replaced } : {}),
      }),
    )
    return
  }

  console.log('')
  console.log(`  ${chalk.bold('Regex Match')}`)
  console.log(`  ${chalk.dim('────────────')}`)
  console.log(`  ${chalk.dim('Pattern:')}   ${chalk.white(`/${patternText}/${flagsStr}`)}`)
  console.log(`  ${chalk.dim('Test:')}      ${testResult ? chalk.green('✓ matched') : chalk.red('✗ no match')}`)
  console.log(`  ${chalk.dim('Matches:')}   ${chalk.yellow(String(matches.length))}`)
  console.log('')

  for (const [i, m] of matches.entries()) {
    console.log(
      `  ${chalk.yellow(`Match #${i + 1}`)}  ${chalk.green(`"${m.match}"`)} ${chalk.dim(`at ${m.index}-${m.index + m.match.length}`)}`,
    )
    if (m.groups.length > 0 || Object.keys(m.named).length > 0) {
      m.groups.forEach((g, gi) => {
        console.log(`    ${chalk.dim(`Group ${gi + 1}:`)}  ${g === undefined ? chalk.dim('(unmatched)') : chalk.cyan(`"${g}"`)}`)
      })
      for (const [name, value] of Object.entries(m.named)) {
        console.log(`    ${chalk.dim(`Group <${name}>:`)}  ${chalk.cyan(`"${value}"`)}`)
      }
    }
  }
  console.log('')

  if (replaced !== undefined) {
    console.log(`  ${chalk.yellow('Replacement:')}  ${chalk.white(replaced)}`)
    console.log('')
  }
}

const regexHelp = createHelp({
  name: 'regex',
  description: 'Test regex patterns & show matches with capture groups',
  usage: 'dt regex <pattern> [text] [options]',
  options: [
    { flags: '--flags <flags>', desc: 'Regex flags (g, i, m, s, u, y)' },
    { flags: '--replace <text>', desc: 'Preview a replacement using the pattern' },
  ],
  extra: [`  ${chalk.yellow('Pipe input:')}`, '    echo "hello 123" | dt regex "\\d+"', ''],
  examples: [
    { cmd: 'dt regex "\\d+" "order 42 item 7"' },
    { cmd: 'dt regex "(\\w+)@(\\w+)" "a@b.com c@d.io"' },
    { cmd: 'dt regex "^hello" "hello world" --flags i' },
    { cmd: 'dt regex "\\s+" "a  b   c" --replace "-"' },
    { cmd: 'echo "abc123" | dt regex "[a-z]+" --flags g --json' },
  ],
})

async function regexInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const pattern = await ask(rl, `  ${chalk.yellow('?')} Regex pattern (e.g. "\\d+"): `)
  if (isBack(pattern)) return
  const input = await ask(rl, `  ${chalk.yellow('?')} Text to match against: `)
  if (isBack(input)) return
  const output = captureOutput(() => regex(pattern ? [pattern, input] : []))
  await pauseWithCopy(rl, output)
}

export const regexCommand: Command = {
  name: 'regex',
  aliases: [],
  category: 'data',
  description: 'Test regex patterns & show matches with capture groups',
  run: regex,
  help: regexHelp,
  interactive: regexInteractive,
}
