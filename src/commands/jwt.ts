import { createHmac, timingSafeEqual } from 'node:crypto'
import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { exitWithError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64url')
}

function verifySignature(token: string, algo: string, secret: string): boolean {
  const algoMap: Record<string, string> = {
    HS256: 'sha256',
    HS384: 'sha384',
    HS512: 'sha512',
  }
  const hashAlgo = algoMap[algo]
  if (!hashAlgo) return false

  const lastDot = token.lastIndexOf('.')
  const signingInput = token.slice(0, lastDot)

  const expectedSig = base64urlEncode(createHmac(hashAlgo, secret).update(signingInput).digest())
  const actualSig = token.slice(lastDot + 1)

  if (expectedSig.length !== actualSig.length) return false

  return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig))
}

const HS_ALGOS = ['HS256', 'HS384', 'HS512'] as const

/** Build a JWT payload from a JSON string or key=value pairs. */
function buildPayload(payloadParts: string[]): Record<string, unknown> {
  const raw = payloadParts.join(' ')
  if (!raw) exitWithError('provide a payload (JSON string or key=value pairs)')

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      exitWithError('payload must be a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch {
    // Fall back to key=value pairs
    const payload: Record<string, unknown> = {}
    for (const part of payloadParts) {
      const eq = part.indexOf('=')
      if (eq === -1) {
        exitWithError(`invalid payload item "${part}" — expected key=value or a JSON object`)
      }
      const key = part.slice(0, eq).trim()
      const value = part.slice(eq + 1).trim()
      if (!key) exitWithError(`invalid payload item "${part}" — missing key`)
      // Parse numeric/boolean values heuristically
      payload[key] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value
    }
    return payload
  }
}

/** Encode a new JWT: dt jwt encode <payload> [--secret s] [--algo HS256] [--exp N] */
function jwtEncode(args: string[], jsonMode: boolean): void {
  let secret: string | null = null
  let algo: string = 'HS256'
  let exp: number | null = null
  const payloadParts: string[] = []

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--secret' || a === '-s') {
      secret = args[i + 1] ?? ''
      i++
    } else if (a === '--algo' || a === '-a') {
      algo = args[i + 1] ?? 'HS256'
      i++
    } else if (a === '--exp') {
      const raw = args[i + 1]
      const parsed = Number(raw)
      if (raw === undefined || !Number.isInteger(parsed) || parsed < 1) {
        exitWithError('--exp must be a positive number of seconds')
      }
      exp = parsed
      i++
    } else if (a === '--no-sign') {
      secret = ''
    } else {
      payloadParts.push(a)
    }
  }

  const payload = buildPayload(payloadParts)
  if (exp !== null) {
    payload.exp = Math.floor(Date.now() / 1000) + exp
  }

  const header = { alg: algo, typ: 'JWT' }
  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  let token: string
  let signed = false
  if (secret) {
    const hashAlgo = ({
      HS256: 'sha256',
      HS384: 'sha384',
      HS512: 'sha512',
    } as Record<string, string>)[algo]
    if (!hashAlgo) {
      exitWithError(`unsupported algorithm "${algo}" (supported: ${HS_ALGOS.join(', ')})`)
    }
    const sig = base64urlEncode(createHmac(hashAlgo, secret).update(signingInput).digest())
    token = `${signingInput}.${sig}`
    signed = true
  } else {
    token = `${signingInput}.` // unsigned token
  }

  if (jsonMode) {
    console.log(JSON.stringify({ algorithm: algo, signed, token, payload }))
    return
  }

  console.log('')
  console.log(`  ${chalk.dim('Algorithm:')} ${chalk.yellow(algo)}${signed ? '' : chalk.dim(' (unsigned)')}`)
  console.log(`  ${chalk.dim('Payload:')}   ${chalk.white(JSON.stringify(payload).slice(0, 60))}${JSON.stringify(payload).length > 60 ? '...' : ''}`)
  console.log(`  ${chalk.dim('Token:')}     ${chalk.green(token)}`)
  console.log('')
}

export function jwt(args: string[]) {
  const { flags, rest } = parseCommonFlags(args)

  // Encode subcommand: dt jwt encode <payload> [options]
  if (rest[0] === 'encode') {
    jwtEncode(rest.slice(1), flags.json)
    return
  }

  let verifySecret: string | null = null
  const filteredArgs: string[] = []
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--verify' || rest[i] === '-k') {
      verifySecret = rest[i + 1] ?? null
      i++
    } else {
      filteredArgs.push(rest[i])
    }
  }

  const input = filteredArgs.join(' ').trim()
  if (!input) {
    exitWithError('provide a JWT token')
  }

  const parts = input.split('.')
  if (parts.length !== 3) {
    exitWithError('invalid JWT (expected header.payload.signature)')
  }

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'))
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))

    let expired: boolean | null = null
    let expiresAt: string | null = null
    if (payload.exp != null) {
      const exp = new Date(Number(payload.exp) * 1000)
      if (!Number.isNaN(exp.getTime())) {
        expired = exp < new Date()
        expiresAt = exp.toISOString()
      }
    }

    let sigValid: boolean | null = null
    if (verifySecret) {
      sigValid = verifySignature(input, header.alg, verifySecret)
    }

    if (flags.json) {
      const result: Record<string, unknown> = { header, payload, signature: parts[2], expired, expiresAt }
      if (sigValid !== null) result.signatureValid = sigValid
      console.log(JSON.stringify(result))
      return
    }

    const headerStr = JSON.stringify(header, null, 2)
    const payloadStr = JSON.stringify(payload, null, 2)

    console.log('')
    console.log(`  ${chalk.bold.yellow('HEADER')}`)
    console.log(`  ${chalk.dim('──────')}`)
    for (const line of headerStr.split('\n')) {
      console.log(`  ${chalk.white(line)}`)
    }

    console.log('')
    console.log(`  ${chalk.bold.green('PAYLOAD')}`)
    console.log(`  ${chalk.dim('───────')}`)
    for (const line of payloadStr.split('\n')) {
      if (line.includes('"iat"') || line.includes('"exp"') || line.includes('"nbf"')) {
        console.log(`  ${chalk.yellow(line)}`)
      } else if (line.includes('"sub"') || line.includes('"iss"') || line.includes('"aud"')) {
        console.log(`  ${chalk.cyan(line)}`)
      } else {
        console.log(`  ${chalk.white(line)}`)
      }
    }

    console.log('')
    console.log(`  ${chalk.dim('SIGNATURE')}`)
    console.log(`  ${chalk.dim(parts[2].slice(0, 40))}...`)

    if (sigValid !== null) {
      if (sigValid) {
        console.log(`  ${chalk.green.bold('✓ Signature valid')}`)
      } else {
        console.log(`  ${chalk.red.bold('✗ Signature invalid')}`)
      }
    }
    console.log('')

    if (expired != null) {
      if (expired) {
        console.log(`  ${chalk.red.bold('⚠ EXPIRED')} ${chalk.dim(`at ${expiresAt}`)}`)
      } else {
        console.log(`  ${chalk.green('✓ Valid until')} ${chalk.dim(expiresAt)}`)
      }
      console.log('')
    }
  } catch {
    exitWithError('failed to decode JWT — parts may not be valid base64url')
  }
}

const jwtHelp = createHelp({
  name: 'jwt',
  description: 'Decode or encode JWT tokens with expiry detection',
  usage: 'dt jwt <token> | dt jwt encode <payload> [options]',
  options: [
    { flags: '--verify, -k <secret>', desc: 'Verify HMAC signature (HS256/384/512)' },
    { flags: 'encode <payload>', desc: 'Create a token from a JSON object or key=value pairs' },
    { flags: '--secret, -s <secret>', desc: 'HMAC secret for encode (omit for unsigned token)' },
    { flags: '--algo, -a <algo>', desc: 'Encode algorithm: HS256 (default), HS384, HS512' },
    { flags: '--exp <seconds>', desc: 'Add exp claim N seconds from now' },
    { flags: '--no-sign', desc: 'Explicitly create an unsigned token' },
  ],
  examples: [
    { cmd: 'dt jwt "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx"' },
    { cmd: 'dt jwt <token> --verify mysecret' },
    { cmd: 'dt jwt encode \'{"name":"John"}\' --secret mysecret' },
    { cmd: 'dt jwt encode name=John role=admin --exp 3600' },
    { cmd: 'dt jwt encode \'{"sub":"123"}\' --no-sign' },
  ],
})

async function jwtInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const mode = (await ask(rl, `  ${chalk.yellow('?')} Decode or encode? ${chalk.dim('(decode/encode)')}: `)).trim().toLowerCase()
  if (isBack(mode)) return
  if (mode === 'encode') {
    const payload = await ask(rl, `  ${chalk.yellow('?')} Payload (JSON or key=value): `)
    if (isBack(payload)) return
    const secret = await ask(rl, `  ${chalk.yellow('?')} Secret ${chalk.dim('(enter for unsigned)')}: `)
    if (isBack(secret)) return
    const args = ['encode', payload]
    if (secret.trim()) args.push('--secret', secret.trim())
    const output = captureOutput(() => jwt(args))
    await pauseWithCopy(rl, output)
    return
  }
  const token = await ask(rl, `  ${chalk.yellow('?')} JWT token: `)
  if (isBack(token)) return
  const output = captureOutput(() => jwt(token ? [token] : []))
  await pauseWithCopy(rl, output)
}

export const jwtCommand: Command = {
  name: 'jwt',
  aliases: [],
  category: 'crypto',
  description: 'Decode a JWT token with expiry detection',
  run: jwt,
  help: jwtHelp,
  interactive: jwtInteractive,
}
