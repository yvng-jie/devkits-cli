import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { exitWithError } from '../errors.js'
import { readStdinSync } from '../utils.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

const SPECIAL: Record<string, string> = {
  '@yearly': 'At midnight on January 1',
  '@annually': 'At midnight on January 1',
  '@monthly': 'At midnight on the first day of every month',
  '@weekly': 'At midnight on Sunday',
  '@daily': 'At midnight every day',
  '@hourly': 'At minute 0 of every hour',
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
  '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
  'SUN': 'Sunday', 'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday',
  'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday',
}

const MONTH_NAMES: Record<string, string> = {
  '1': 'January', '2': 'February', '3': 'March', '4': 'April',
  '5': 'May', '6': 'June', '7': 'July', '8': 'August',
  '9': 'September', '10': 'October', '11': 'November', '12': 'December',
  'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
  'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
  'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December',
}

function describeField(value: string, field: string, _min: number, _max: number): string {
  if (value === '*') return ''
  if (value === '?') return ''

  // Handle step: */15, 1-10/2
  let baseValue = value
  if (baseValue.includes('/')) {
    const parts = baseValue.split('/')
    baseValue = parts[0]!
    const step = parts[1]
    if (baseValue === '*') {
      return `every ${step} ${field}`
    }
    return `every ${step} ${field} starting from ${baseValue}`
  }

  // Handle ranges: 1-5
  const rangeMatch = baseValue.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    if (field === 'day-of-week') {
      return `${DAY_NAMES[rangeMatch[1]!] ?? rangeMatch[1]} through ${DAY_NAMES[rangeMatch[2]!] ?? rangeMatch[2]}`
    }
    if (field === 'month') {
      return `${MONTH_NAMES[rangeMatch[1]!] ?? rangeMatch[1]} through ${MONTH_NAMES[rangeMatch[2]!] ?? rangeMatch[2]}`
    }
    return `${rangeMatch[1]} through ${rangeMatch[2]}`
  }

  // Handle lists: 1,3,5
  if (baseValue.includes(',')) {
    const parts = baseValue.split(',').map((p) => {
      if (field === 'day-of-week') return DAY_NAMES[p] ?? p
      if (field === 'month') return MONTH_NAMES[p] ?? p
      return p
    })
    return parts.join(', ')
  }

  // Handle day-of-week names
  if (field === 'day-of-week' && /^[A-Z]{3}$/.test(baseValue)) {
    return DAY_NAMES[baseValue.toUpperCase()] ?? baseValue
  }
  if (field === 'month' && /^[A-Z]{3}$/i.test(baseValue)) {
    return MONTH_NAMES[baseValue.toUpperCase()] ?? baseValue
  }

  if (field === 'day-of-week') return DAY_NAMES[baseValue] ?? baseValue
  if (field === 'month') return MONTH_NAMES[baseValue] ?? baseValue
  return baseValue
}

function describe(expr: string): string {
  // Check special strings
  if (SPECIAL[expr.toLowerCase()]) return SPECIAL[expr.toLowerCase()]!

  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) {
    exitWithError(`invalid cron expression — expected 5 fields, got ${parts.length}`)
  }

  const descriptions: string[] = []
  const hasSpecificDom = parts[2] !== '*'
  const hasSpecificMonth = parts[3] !== '*'
  const hasSpecificDow = parts[4] !== '*'

  // Build human-readable description
  if (parts[0] === '*' && parts[1] === '*') {
    descriptions.push('Every minute')
  } else if (parts[0] === '*' && parts[1] !== '*') {
    const hDesc = describeField(parts[1]!, 'hour', 0, 23)
    descriptions.push(`At minute 0 of every hour${hDesc ? ` (${hDesc})` : ''}`)
  } else if (parts[0] !== '*' && parts[1] === '*') {
    const mDesc = describeField(parts[0]!, 'minute', 0, 59)
    descriptions.push(`At minute ${mDesc} of every hour`)
  } else {
    const mDesc = describeField(parts[0]!, 'minute', 0, 59)
    const hDesc = describeField(parts[1]!, 'hour', 0, 23)
    descriptions.push(`At ${hDesc}:${mDesc.padStart(2, '0')}`)
  }

  if (hasSpecificDom && parts[2] !== '*') {
    descriptions.push(`on day ${describeField(parts[2]!, 'day-of-month', 1, 31)} of the month`)
  }

  if (hasSpecificMonth && parts[3] !== '*') {
    const mDesc = describeField(parts[3]!, 'month', 1, 12)
    descriptions.push(`in ${mDesc}`)
  }

  if (hasSpecificDow && parts[4] !== '*') {
    const dDesc = describeField(parts[4]!, 'day-of-week', 0, 7)
    descriptions.push(`on ${dDesc}`)
  }

  return descriptions.join(', ')
}

/** Value range for each of the five fields, in order. */
const FIELD_RANGES: readonly [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0 and 7 are both Sunday)
]

/**
 * Validate a single cron field.
 *
 * Accepts every form real cron accepts:
 *   *           any value
 *   *\/15        every 15th value (step on a wildcard)
 *   5           exact value
 *   5/10        step from an explicit start
 *   1-10        range
 *   1-10/2      range with step
 *   MON-FRI     named ranges (months / days)
 *   MON,WED,FRI comma-separated lists of any of the above
 */
function isValidField(val: string, index: number): boolean {
  const [min, max] = FIELD_RANGES[index] ?? [0, 59]

  for (const item of val.split(',')) {
    if (item === '') return false

    const [base, step, ...rest] = item.split('/')
    if (rest.length > 0) return false // at most one step
    if (step !== undefined && !/^\d+$/.test(step)) return false
    if (base === undefined) return false

    if (base === '*') continue // wildcard, optionally stepped

    if (/^\d+$/.test(base)) {
      const n = Number(base)
      if (n < min || n > max) return false
      continue
    }

    if (/^\d+-\d+$/.test(base)) {
      const [from, to] = base.split('-').map(Number) as [number, number]
      if (from < min || from > max || to < min || to > max) return false
      continue
    }

    // Named months (field 3) and weekdays (field 4)
    if (index === 3 || index === 4) {
      const names = index === 3 ? MONTH_NAMES : DAY_NAMES
      const [from, to] = base.toUpperCase().split('-')
      if (from && names[from] && (to === undefined || names[to])) continue
    }

    return false
  }
  return true
}

function validateExpr(expr: string): boolean {
  if (SPECIAL[expr.toLowerCase()]) return true
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  return parts.every((val, i) => isValidField(val, i))
}

function computeNext(expr: string, count: number): string[] {
  const results: string[] = []
  const now = new Date()
  let found = 0

  for (let d = 0; d < 366 * 5 && found < count; d++) {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    const parts = expr.trim().split(/\s+/)

    // Check month
    if (parts[3] !== '*') {
      const month = date.getMonth() + 1
      if (!fieldMatches(parts[3]!, month, 1, 12)) continue
    }
    // Check day-of-week
    if (parts[4] !== '*') {
      const dow = date.getDay()
      if (!fieldMatches(parts[4]!, dow, 0, 7)) continue
    }
    // Check day-of-month
    if (parts[2] !== '*') {
      const dom = date.getDate()
      if (!fieldMatches(parts[2]!, dom, 1, 31)) continue
    }

    // For each hour of the day
    const startHour = d === 0 ? now.getHours() : 0
    for (let h = startHour; h < 24 && found < count; h++) {
      if (parts[1] !== '*') {
        if (!fieldMatches(parts[1]!, h, 0, 23)) continue
      }
      // For each minute
      const startMin = (d === 0 && h === startHour) ? now.getMinutes() + 1 : 0
      for (let m = startMin; m < 60 && found < count; m++) {
        if (parts[0] !== '*') {
          if (!fieldMatches(parts[0]!, m, 0, 59)) continue
        }
        date.setHours(h, m, 0, 0)
        results.push(date.toISOString().replace('T', ' ').slice(0, 19))
        found++
      }
    }
  }
  return results
}

function fieldMatches(pattern: string, value: number, min: number, max: number): boolean {
  if (pattern === '*') return true
  if (pattern.includes(',')) {
    return pattern.split(',').some((p) => fieldMatches(p.trim(), value, min, max))
  }
  let step = 1
  let base = pattern
  if (pattern.includes('/')) {
    const parts = pattern.split('/')
    base = parts[0]!
    step = Number(parts[1]) || 1
  }
  if (base === '*') return value >= min && value <= max && (step <= 1 || (value - min) % step === 0)
  let rangeStart: number
  let rangeEnd: number
  if (base.includes('-')) {
    const parts = base.split('-')
    rangeStart = Number(parts[0]) || min
    rangeEnd = Number(parts[1]) || max
  } else {
    rangeStart = Number(base)
    rangeEnd = Number(base)
  }
  if (value < rangeStart || value > rangeEnd) return false
  if (step > 1) {
    return (value - rangeStart) % step === 0
  }
  return value >= rangeStart && value <= rangeEnd
}

export function cron(args: string[]) {
  const { flags, rest } = parseCommonFlags(args)

  let nextCount = 0
  let validateOnly = false
  const inputArgs: string[] = []
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--next') {
      // Only consume the following token when it is actually a number, so that
      // `--next --json` does not swallow the flag.
      const candidate = rest[i + 1]
      if (candidate !== undefined && /^\d+$/.test(candidate)) {
        nextCount = Number(candidate)
        i++
      } else {
        nextCount = 5
      }
    } else if (rest[i] === '--validate') {
      validateOnly = true
    } else {
      inputArgs.push(rest[i])
    }
  }

  const expression = inputArgs.join(' ').trim() || readStdinSync() || ''
  if (!expression) {
    exitWithError('provide a cron expression (e.g. "*/15 * * * *")')
  }

  if (validateOnly) {
    if (validateExpr(expression)) {
      console.log(chalk.green('✓ Valid cron expression'))
    } else {
      exitWithError(`invalid cron expression "${expression}"`)
    }
    return
  }

  if (!validateExpr(expression)) {
    exitWithError(`invalid cron expression "${expression}"`)
  }

  const description = describe(expression)

  if (flags.json) {
    const jsonOut: Record<string, unknown> = { expression, description }
    if (nextCount > 0) {
      jsonOut.next = computeNext(expression, nextCount)
    }
    console.log(JSON.stringify(jsonOut))
    return
  }

  console.log('')
  console.log(`  ${chalk.bold('Cron Expression')}`)
  console.log(`  ${chalk.dim('────────────────')}`)
  console.log(`  ${chalk.dim('Expression:')}  ${chalk.white(expression)}`)
  console.log(`  ${chalk.dim('Description:')} ${chalk.green(description)}`)
  console.log('')

  if (nextCount > 0) {
    const next = computeNext(expression, nextCount)
    console.log(`  ${chalk.yellow('Next execution times:')}`)
    for (const t of next) {
      console.log(`    ${chalk.white(t)}`)
    }
    console.log('')
  }
}

const cronHelp = createHelp({
  name: 'cron',
  description: 'Parse and describe cron expressions',
  usage: 'dt cron <expression> [options]\n    echo "*/15 * * * *" | dt cron',
  options: [
    { flags: '--next <n>', desc: 'Show next N execution times (default: 5)' },
    { flags: '--validate', desc: 'Validate cron expression only' },
  ],
  extra: [
    `  ${chalk.yellow('Special strings:')}`,
    '    @yearly, @monthly, @weekly, @daily, @hourly',
    '',
    `  ${chalk.yellow('Fields:')}`,
    '    minute (0-59), hour (0-23), day-of-month (1-31)',
    '    month (1-12), day-of-week (0-7, 0=Sunday)',
    '',
  ],
  examples: [
    { cmd: 'dt cron "*/15 * * * *"' },
    { cmd: 'echo "*/15 * * * *" | dt cron --validate' },
    { cmd: 'dt cron "0 9 * * 1-5"' },
    { cmd: 'dt cron "30 4 1 * *"' },
    { cmd: 'dt cron "*/15 * * * *" --next 5' },
    { cmd: 'dt cron "@daily"' },
    { cmd: 'dt cron "0 0 * * *" --json' },
  ],
})

async function cronInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const expr = await ask(rl, `  ${chalk.yellow('?')} Cron expression (e.g. "*/15 * * * *"): `)
  if (isBack(expr)) return
  const output = captureOutput(() => cron(expr ? [expr] : []))
  await pauseWithCopy(rl, output)
}

export const cronCommand: Command = {
  name: 'cron',
  aliases: [],
  category: 'utility',
  description: 'Parse and describe cron expressions',
  run: cron,
  help: cronHelp,
  interactive: cronInteractive,
}
