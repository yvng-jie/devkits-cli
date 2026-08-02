import { randomUUID, randomInt, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { exitWithError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

// ── Data pools ─────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
  'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tina',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zach', 'Nora', 'Ethan', 'Ava', 'Leo',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young',
]

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'fastmail.com', 'example.com', 'hey.com']

const COMPANIES = [
  'Acme Corp', 'Globex', 'Initech', 'Umbrella Corp', 'Stark Industries', 'Wayne Enterprises',
  'Hooli', 'Pied Piper', 'Vandelay Industries', 'Cyberdyne Systems', 'Tyrell Corp',
  'Wonka Industries', 'Aperture Science', 'Nakatomi Corp', 'Soylent Corp', 'Massive Dynamic',
]

const JOBS = [
  'Engineer', 'Designer', 'Manager', 'Analyst', 'Developer', 'Architect', 'Consultant',
  'Scientist', 'Writer', 'Teacher', 'Doctor', 'Lawyer', 'Accountant', 'Marketer',
  'Researcher', 'Product Manager', 'DevOps Engineer', 'Data Scientist',
]

const CITIES = [
  'Tokyo', 'New York', 'London', 'Paris', 'Berlin', 'Sydney', 'Singapore', 'Toronto',
  'Amsterdam', 'Seoul', 'Shanghai', 'Mumbai', 'Sao Paulo', 'Mexico City', 'Dubai',
  'Barcelona', 'Rome', 'Vienna', 'Zurich', 'Stockholm', 'Seattle', 'Austin', 'Oslo', 'Helsinki',
]

const COUNTRIES = [
  'Japan', 'USA', 'UK', 'France', 'Germany', 'Australia', 'Singapore', 'Canada',
  'Netherlands', 'South Korea', 'China', 'India', 'Brazil', 'Mexico', 'UAE',
  'Spain', 'Italy', 'Austria', 'Switzerland', 'Sweden', 'Norway', 'Finland', 'Ireland',
]

const TLDS = ['com', 'net', 'org', 'io', 'dev', 'me', 'co', 'app', 'ai', 'tech']

const PHONE_FORMATS = [
  '+1 (555) ###-####',
  '+1 (415) ###-####',
  '+44 7### ######',
  '+49 17# ########',
  '+33 6 ## ## ## ##',
  '+86 138 #### ####',
  '+81 90-####-####',
  '+61 4## ### ###',
  '+55 11 9####-####',
  '+65 8### ####',
]

const USERNAME_ADJECTIVES = ['swift', 'calm', 'bright', 'bold', 'clever', 'silent', 'rapid', 'sunny', 'lucky', 'happy']
const USERNAME_NOUNS = ['panda', 'falcon', 'otter', 'tiger', 'fox', 'wolf', 'koala', 'eagle', 'dolphin', 'dragon']

// ── Helpers ────────────────────────────────────────────────────────────────

const pick = <T>(arr: readonly T[]): T => arr[randomInt(arr.length)]!
const pickChar = (s: string): string => s[randomInt(s.length)]!

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

function randomFirstName(): string {
  return pick(FIRST_NAMES)
}

function randomLastName(): string {
  return pick(LAST_NAMES)
}

function randomEmail(): string {
  const first = pick(FIRST_NAMES).toLowerCase()
  const last = pick(LAST_NAMES).toLowerCase()
  const sep = pick(['', '.', '_'])
  const num = randomInt(2) === 0 ? String(randomInt(10, 999)) : ''
  return `${first}${sep}${last}${num}@${pick(EMAIL_DOMAINS)}`
}

function randomUsername(): string {
  const adj = pick(USERNAME_ADJECTIVES)
  const noun = pick(USERNAME_NOUNS)
  const sep = pick(['', '_', '.', '-'])
  const suffix = randomInt(2) === 0 ? String(randomInt(10, 9999)) : ''
  return `${adj}${sep}${noun}${suffix}`
}

function randomPhone(): string {
  const fmt = pick(PHONE_FORMATS)
  return fmt.replace(/#/g, () => String(randomInt(10)))
}

function randomIp(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`
}

function randomUrl(): string {
  const name = pick(['example', 'myblog', 'dev', 'project', 'app', 'shop', pick(USERNAME_NOUNS)])
  return `https://${name}.${pick(TLDS)}${randomInt(2) === 0 ? '/' + pick(['about', 'blog', 'docs', 'contact', 'pricing']) : ''}`
}

function randomCompany(): string {
  return pick(COMPANIES)
}

function randomJob(): string {
  return pick(JOBS)
}

function randomCity(): string {
  return pick(CITIES)
}

function randomCountry(): string {
  return pick(COUNTRIES)
}

function randomHexColor(): string {
  return `#${randomBytes(3).toString('hex').toUpperCase()}`
}

function randomDate(): string {
  const start = Date.parse('1970-01-01')
  const end = Date.now()
  return new Date(randomInt(start, end)).toISOString().split('T')[0]!
}

function randomSentence(): string {
  const subjects = ['The system', 'Our team', 'The client', 'This project', 'The analysis', 'The report']
  const verbs = ['improves', 'requires', 'delivers', 'analyzes', 'supports', 'optimizes']
  const objects = ['the workflow', 'performance', 'user experience', 'the data', 'productivity', 'the pipeline']
  return `${pick(subjects)} ${pick(verbs)} ${pick(objects)}.`
}

function randomPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const nums = '23456789'
  const syms = '!@#$%^&*'
  const all = upper + lower + nums + syms
  const parts = [pickChar(upper), pickChar(lower), pickChar(nums), pickChar(syms)]
  for (let i = 4; i < 16; i++) parts.push(pickChar(all))
  // Fisher-Yates shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[parts[i], parts[j]] = [parts[j]!, parts[i]!]
  }
  return parts.join('')
}

const GENERATORS: Record<string, () => string> = {
  name: randomName,
  first: randomFirstName,
  last: randomLastName,
  email: randomEmail,
  username: randomUsername,
  phone: randomPhone,
  ip: randomIp,
  uuid: () => randomUUID(),
  url: randomUrl,
  company: randomCompany,
  job: randomJob,
  city: randomCity,
  country: randomCountry,
  hexcolor: randomHexColor,
  date: randomDate,
  sentence: randomSentence,
  password: randomPassword,
}

const TYPES = [...Object.keys(GENERATORS), 'integer', 'boolean']

// ── Command ────────────────────────────────────────────────────────────────

function parseFakeFlags(args: string[]): {
  json: boolean
  type: string
  count: number
  min: number
  max: number
  rest: string[]
} {
  const { flags, rest } = parseCommonFlags(args)
  let count = 1
  let min = 1
  let max = 100

  const filtered: string[] = []
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--count' || a === '-c') {
      const raw = rest[i + 1]
      const parsed = Number(raw)
      if (raw === undefined || !Number.isInteger(parsed) || parsed < 1) {
        exitWithError('--count must be a positive integer')
      }
      count = Math.min(parsed, 1000)
      i++
    } else if (a === '--min') {
      min = Number(rest[i + 1]) || 1
      i++
    } else if (a === '--max') {
      max = Number(rest[i + 1]) || 100
      i++
    } else {
      filtered.push(a)
    }
  }

  const type = (filtered[0] ?? 'name').toLowerCase()
  if (!TYPES.includes(type)) {
    exitWithError(`unknown fake data type "${filtered[0]}" (supported: ${TYPES.join(', ')})`)
  }

  return { json: flags.json, type, count, min, max, rest: filtered }
}

export function fake(args: string[]) {
  const { json: jsonMode, type, count, min, max } = parseFakeFlags(args)

  const values: string[] = []
  for (let i = 0; i < count; i++) {
    if (type === 'integer') {
      values.push(String(randomInt(min, max + 1)))
    } else if (type === 'boolean') {
      values.push(randomInt(2) === 0 ? 'true' : 'false')
    } else {
      values.push(GENERATORS[type]!())
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify({ type, count, values }))
    return
  }

  for (const v of values) {
    console.log(chalk.green(v))
  }
}

const fakeHelp = createHelp({
  name: 'fake',
  description: 'Generate fake data (names, emails, IPs, companies & more)',
  usage: 'dt fake <type> [options]',
  options: [
    { flags: '--count, -c <n>', desc: 'Number of values to generate (default: 1, max: 1000)' },
    { flags: '--min <n>', desc: 'Minimum value for `integer` (default: 1)' },
    { flags: '--max <n>', desc: 'Maximum value for `integer` (default: 100)' },
  ],
  extra: [
    `  ${chalk.yellow('Types:')}`,
    `    ${TYPES.join(', ')}, integer, boolean`,
    '',
  ],
  examples: [
    { cmd: 'dt fake email' },
    { cmd: 'dt fake name -c 5' },
    { cmd: 'dt fake integer --min 1 --max 10 -c 3' },
    { cmd: 'dt fake password --json' },
    { cmd: 'dt fake' },
  ],
})

async function fakeInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const type = (await ask(rl, `  ${chalk.yellow('?')} Type ${chalk.dim(`(${TYPES.slice(0, 6).join('/')}/...)`)} ${chalk.dim('[name]')}: `)).trim()
  if (isBack(type)) return
  const count = (await ask(rl, `  ${chalk.yellow('?')} How many? ${chalk.dim('(1)')}: `)).trim()
  if (isBack(count)) return
  const args: string[] = []
  if (type) args.push(type)
  if (count) args.push('--count', count)
  const output = captureOutput(() => fake(args))
  await pauseWithCopy(rl, output)
}

export const fakeCommand: Command = {
  name: 'fake',
  aliases: [],
  category: 'utility',
  description: 'Generate fake data (names, emails, IPs, companies & more)',
  run: fake,
  help: fakeHelp,
  interactive: fakeInteractive,
}
