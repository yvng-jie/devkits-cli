import { createHash, createHmac } from 'node:crypto'
import { crc32 } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { readStdinSync } from '../utils.js'
import { exitWithError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

const ALGOS = [
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'sha3-256',
  'sha3-384',
  'sha3-512',
  'blake2b512',
  'blake2s256',
  'ripemd160',
  'crc32',
] as const
type Algo = (typeof ALGOS)[number]

const FORMATS = ['hex', 'base64', 'base64url'] as const
type Format = (typeof FORMATS)[number]

/** Compute a hash digest in the requested format. crc32 is handled separately. */
function computeDigest(algo: string, input: string, format: Format): string {
  if (algo === 'crc32') {
    const n = crc32(input) >>> 0
    if (format === 'hex') return n.toString(16).padStart(8, '0')
    const buf = Buffer.allocUnsafe(4)
    buf.writeUInt32BE(n)
    return format === 'base64' ? buf.toString('base64') : buf.toString('base64url')
  }
  const digest = createHash(algo).update(input).digest()
  if (format === 'base64') return digest.toString('base64')
  if (format === 'base64url') return digest.toString('base64url')
  return digest.toString('hex')
}

function parseFlags(args: string[]): {
  json: boolean
  algo: Algo
  file: string | null
  key: string | null
  format: Format
  rest: string[]
} {
  const { flags, rest } = parseCommonFlags(args)
  const result = {
    json: flags.json,
    algo: 'sha256' as Algo,
    file: null as string | null,
    key: null as string | null,
    format: 'hex' as Format,
    rest: [] as string[],
  }

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--algo' || a === '-a') {
      const raw = rest[i + 1]?.toLowerCase()
      if (raw && ALGOS.includes(raw as Algo)) {
        result.algo = raw as Algo
        i++
      } else {
        exitWithError(`unsupported algorithm "${raw}" (supported: ${ALGOS.join(', ')})`)
      }
    } else if (a === '--file' || a === '-f') {
      result.file = rest[i + 1] ?? null
      i++
    } else if (a === '--key' || a === '-k') {
      result.key = rest[i + 1] ?? null
      i++
    } else if (a === '--format') {
      const raw = rest[i + 1]?.toLowerCase()
      if (raw && FORMATS.includes(raw as Format)) {
        result.format = raw as Format
        i++
      } else {
        exitWithError(`unsupported format "${raw}" (supported: ${FORMATS.join(', ')})`)
      }
    } else {
      result.rest.push(a)
    }
  }

  return result
}

export function hash(args: string[]) {
  const { json: jsonMode, algo, file, key, format, rest } = parseFlags(args)

  let finalInput = ''
  if (file) {
    try {
      finalInput = readFileSync(file, 'utf-8')
    } catch {
      exitWithError(`cannot read file "${file}"`)
    }
  } else {
    finalInput = rest.join(' ') || readStdinSync()
  }

  if (!finalInput) {
    exitWithError('no input provided')
  }

  let digest: string
  if (key) {
    if (algo === 'crc32') {
      exitWithError('crc32 does not support HMAC — use a keyed hash algorithm')
    }
    digest = createHmac(algo, key).update(finalInput).digest(format === 'base64' ? 'base64' : format === 'base64url' ? 'base64url' : 'hex')
    if (jsonMode) {
      console.log(JSON.stringify({ algorithm: 'HMAC-' + algo.toUpperCase(), format, input: finalInput, hash: digest, key: '[REDACTED]' }))
      return
    }
    console.log('')
    console.log(`  ${chalk.dim('Algorithm:')} ${chalk.yellow('HMAC-' + algo.toUpperCase())}`)
    console.log(`  ${chalk.dim('Key:')}       ${chalk.yellow('[REDACTED]')}`)
    console.log(`  ${chalk.dim('Format:')}    ${chalk.white(format)}`)
    console.log(`  ${chalk.dim('Input:')}     ${chalk.white(finalInput.slice(0, 60))}${finalInput.length > 60 ? '...' : ''}`)
    console.log(`  ${chalk.dim('Hash:')}      ${chalk.green(digest)}`)
    console.log('')
    return
  }

  digest = computeDigest(algo, finalInput, format)

  if (jsonMode) {
    console.log(JSON.stringify({ algorithm: algo.toUpperCase(), format, input: finalInput, hash: digest }))
    return
  }

  console.log('')
  console.log(`  ${chalk.dim('Algorithm:')} ${chalk.yellow(algo.toUpperCase())}`)
  if (file) {
    console.log(`  ${chalk.dim('File:')}      ${chalk.white(file)}`)
  }
  console.log(`  ${chalk.dim('Format:')}    ${chalk.white(format)}`)
  console.log(`  ${chalk.dim('Input:')}     ${chalk.white(finalInput.slice(0, 60))}${finalInput.length > 60 ? '...' : ''}`)
  console.log(`  ${chalk.dim('Hash:')}      ${chalk.green(digest)}`)
  console.log('')
}

const hashHelp = createHelp({
  name: 'hash',
  description: 'Generate hashes (SHA family, MD5, BLAKE2, CRC32 & more)',
  usage: 'dt hash <text> [options]',
  options: [
    { flags: '--algo, -a <algo>', desc: 'Hash algorithm (default: sha256)' },
    { flags: '--format <fmt>', desc: 'Output format: hex (default), base64, base64url' },
    { flags: '--file <path>', desc: 'Hash file contents' },
    { flags: '--key, -k <secret>', desc: 'HMAC key (enables keyed-hash authentication)' },
  ],
  extra: [`  ${chalk.yellow('Algorithms:')}`, '    md5, sha1, sha256 (default), sha384, sha512', '    sha3-256, sha3-384, sha3-512, blake2b512', '    blake2s256, ripemd160, crc32', ''],
  examples: [
    { cmd: 'dt hash "hello"' },
    { cmd: 'dt hash "hello" --algo md5' },
    { cmd: 'dt hash "hello" --algo crc32' },
    { cmd: 'dt hash "hello" --algo sha3-256 --format base64' },
    { cmd: 'dt hash --file config.json' },
    { cmd: 'dt hash "hello" --key mysecret' },
    { cmd: 'echo "hello" | dt hash' },
  ],
})

async function hashInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const input = await ask(rl, `  ${chalk.yellow('?')} Text to hash: `)
  if (isBack(input)) return
  const algo = (
    await ask(
      rl,
      `  ${chalk.yellow('?')} Algorithm ${chalk.dim('(sha256/md5/sha1/sha512/crc32/...)')} ${chalk.dim('[sha256]')}: `,
    )
  ).trim()
  if (isBack(algo)) return
  const output = captureOutput(() => hash(input ? (algo ? [input, '--algo', algo] : [input]) : []))
  await pauseWithCopy(rl, output)
}

export const hashCommand: Command = {
  name: 'hash',
  aliases: [],
  category: 'crypto',
  description: 'Generate SHA hashes (sha1/256/384/512)',
  run: hash,
  help: hashHelp,
  interactive: hashInteractive,
}
