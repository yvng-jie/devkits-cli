import { createHmac } from 'node:crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jwt } from '../jwt.js'
import { ExitError } from '../../errors.js'

const mockReadStdinSync = vi.hoisted(() => vi.fn())
vi.mock('../../utils.js', () => ({
  readStdinSync: mockReadStdinSync,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  mockReadStdinSync.mockReset()
})

describe('jwt', () => {
  it('should decode a valid JWT', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    jwt(['eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('HS256')
    expect(output).toContain('John')
  })

  it('should exit on invalid JWT format', () => {
    expect(() => jwt(['invalid.token'])).toThrow(ExitError)
  })

  it('should exit on missing token', () => {
    expect(() => jwt([])).toThrow(ExitError)
  })

  it('should exit on single-part token', () => {
    expect(() => jwt(['justonepart'])).toThrow(ExitError)
  })

  it('should exit on two-part token', () => {
    expect(() => jwt(['header.payload'])).toThrow(ExitError)
  })

  it('should detect expired tokens', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // JWT with exp in the past (epoch 100000 = Jan 2, 1970)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ name: 'John', exp: 100000 })).toString('base64url')
    jwt([`${header}.${payload}.xxx`])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('EXPIRED')
  })

  it('should handle non-numeric exp without crashing', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ name: 'John', exp: 'not-a-number' })).toString('base64url')
    // Should not throw — just skip expiry display
    expect(() => jwt([`${header}.${payload}.xxx`])).not.toThrow()
  })

  it('should verify valid HMAC signature with --verify', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const secret = 'mysecret'
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ name: 'John' })).toString('base64url')
    const signingInput = `${header}.${payload}`
    const sig = createHmac('sha256', secret).update(signingInput).digest('base64url')
    const token = `${signingInput}.${sig}`

    jwt([token, '--verify', secret])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('Signature valid')
  })

  it('should detect invalid HMAC signature with --verify', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ name: 'John' })).toString('base64url')
    const token = `${header}.${payload}.invalidsignature`

    jwt([token, '--verify', 'wrongsecret'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('Signature invalid')
  })

  it('should verify with -k alias', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const secret = 'key'
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: '123' })).toString('base64url')
    const signingInput = `${header}.${payload}`
    const sig = createHmac('sha256', secret).update(signingInput).digest('base64url')
    const token = `${signingInput}.${sig}`

    jwt([token, '-k', secret])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('Signature valid')
  })

  // ── encode subcommand ────────────────────────────────────────────────

  it('should encode an unsigned token from JSON payload', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    jwt(['encode', '{"name":"John"}', '--no-sign'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    const token = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./)?.[0]
    expect(token).toBeDefined()
    const parts = (token ?? '').split('.')
    expect(JSON.parse(Buffer.from(parts[1]!, 'base64url').toString())).toEqual({ name: 'John' })
    expect(parts[2]).toBe('')
  })

  it('should encode a signed token with --secret', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    jwt(['encode', '{"sub":"123"}', '--secret', 'mysecret'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    const token = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]
    expect(token).toBeDefined()
    const tokenStr = token!
    const parts = tokenStr.split('.')
    // Signature must be non-empty and verifiable
    const sig = createHmac('sha256', 'mysecret').update(`${parts[0]}.${parts[1]}`).digest('base64url')
    expect(parts[2]).toBe(sig)
  })

  it('should encode from key=value pairs', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    jwt(['encode', 'name=John', 'role=admin', '--no-sign'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    const token = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./)?.[0]
    const payload = JSON.parse(Buffer.from((token ?? '').split('.')[1]!, 'base64url').toString())
    expect(payload).toEqual({ name: 'John', role: 'admin' })
  })

  it('should add exp claim with --exp', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const before = Math.floor(Date.now() / 1000)
    jwt(['encode', '{"sub":"1"}', '--exp', '3600', '--no-sign'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    const token = output.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./)?.[0]
    const payload = JSON.parse(Buffer.from((token ?? '').split('.')[1]!, 'base64url').toString())
    expect(payload.exp).toBeGreaterThanOrEqual(before + 3600)
    expect(payload.exp).toBeLessThanOrEqual(before + 3601)
  })

  it('should support --json output for encode', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    jwt(['encode', '{"name":"John"}', '--secret', 's', '--json'])
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.signed).toBe(true)
    expect(parsed.algorithm).toBe('HS256')
    expect(parsed.token.split('.')).toHaveLength(3)
    expect(parsed.payload).toEqual({ name: 'John' })
  })

  it('should exit on empty payload for encode', () => {
    expect(() => jwt(['encode'])).toThrow(ExitError)
  })

  it('should exit on unsupported encode algorithm', () => {
    expect(() => jwt(['encode', '{"a":1}', '--secret', 's', '--algo', 'HS999'])).toThrow(ExitError)
  })

  describe('stdin', () => {
    it('should decode a token piped through stdin', () => {
      mockReadStdinSync.mockReturnValue('eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      jwt([])
      const out = spy.mock.calls.flatMap((c) => c).join(' ')
      expect(out).toContain('John')
    })

    it('should still fail when both argument and stdin are empty', () => {
      mockReadStdinSync.mockReturnValue('')
      expect(() => jwt([])).toThrow(ExitError)
    })
  })
})
