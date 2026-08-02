import { describe, it, expect, vi, beforeEach } from 'vitest'
import { regex } from '../regex.js'
import { ExitError } from '../../errors.js'

const mockReadStdinSync = vi.hoisted(() => vi.fn())
vi.mock('../../utils.js', () => ({
  readStdinSync: mockReadStdinSync,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  mockReadStdinSync.mockReset()
})

function captureOutput(fn: () => void): string {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  fn()
  return spy.mock.calls.flatMap((c) => c).join(' ')
}

describe('regex', () => {
  it('should report a match', () => {
    const output = captureOutput(() => regex(['\\d+', 'order 42 item 7', '--flags', 'g']))
    expect(output).toContain('✓ matched')
    expect(output).toContain('Matches:')
    expect(output).toContain('2')
    expect(output).toContain('"42"')
    expect(output).toContain('"7"')
  })

  it('should show capture groups', () => {
    const output = captureOutput(() => regex(['(\\w+)@(\\w+)', 'a@b.com c@d.io']))
    expect(output).toContain('Group 1')
    expect(output).toContain('a')
    expect(output).toContain('b')
    expect(output).toContain('c')
    expect(output).toContain('d')
  })

  it('should report no match', () => {
    const output = captureOutput(() => regex(['^xyz$', 'hello']))
    expect(output).toContain('✗ no match')
    expect(output).toContain('Matches:')
    expect(output).toContain('0')
  })

  it('should accept flags', () => {
    const output = captureOutput(() => regex(['^hello', 'HELLO world', '--flags', 'i']))
    expect(output).toContain('✓ matched')
  })

  it('should exit on invalid pattern', () => {
    expect(() => regex(['([', 'text'])).toThrow(ExitError)
  })

  it('should exit on invalid flag', () => {
    expect(() => regex(['a', 'text', '--flags', 'x'])).toThrow(ExitError)
  })

  it('should exit on missing pattern', () => {
    expect(() => regex([])).toThrow(ExitError)
  })

  it('should preview replacement with --replace', () => {
    const output = captureOutput(() => regex(['\\s+', 'a  b   c', '--replace', '-']))
    expect(output).toContain('a-b-c')
  })

  it('should output JSON with --json', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    regex(['\\d+', 'a1b2', '--flags', 'g', '--json'])
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.pattern).toBe('/\\d+/g')
    expect(parsed.test).toBe(true)
    expect(parsed.matchCount).toBe(2)
    expect(parsed.matches[0].match).toBe('1')
    expect(parsed.matches[1].index).toBe(3)
  })

  it('should read input from stdin pipe', () => {
    mockReadStdinSync.mockReturnValue('hello 123')
    const output = captureOutput(() => regex(['\\d+']))
    expect(output).toContain('✓ matched')
    expect(output).toContain('"123"')
  })
})
