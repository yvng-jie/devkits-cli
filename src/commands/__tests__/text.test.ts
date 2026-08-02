import { describe, it, expect, vi, beforeEach } from 'vitest'
import { text } from '../text.js'
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

describe('text', () => {
  it('should compute stats by default', () => {
    const output = captureOutput(() => text(['hello world']))
    expect(output).toContain('Words:')
    expect(output).toContain('2')
    expect(output).toContain('Characters:')
    expect(output).toContain('11')
  })

  it('should count multiple lines', () => {
    const output = captureOutput(() => text(['a\nb\nc']))
    expect(output).toContain('Lines:')
    expect(output).toContain('3')
  })

  it('should reverse text', () => {
    const output = captureOutput(() => text(['Hello', '--reverse']))
    expect(output).toContain('olleH')
  })

  it('should truncate text with ellipsis', () => {
    const output = captureOutput(() => text(['lorem ipsum dolor', '--truncate', '5']))
    expect(output).toContain('lorem…')
  })

  it('should generate a slug', () => {
    const output = captureOutput(() => text(['My Project Name!', '--slug']))
    expect(output).toContain('my-project-name')
  })

  it('should sort lines', () => {
    const output = captureOutput(() => text(['banana\napple\ncherry', '--sort']))
    expect(output).toContain('apple\nbanana\ncherry')
  })

  it('should dedupe lines with --unique', () => {
    const output = captureOutput(() => text(['a\na\nb', '--unique']))
    expect(output).toContain('a\nb')
  })

  it('should show word frequency with --freq', () => {
    const output = captureOutput(() => text(['foo bar foo baz foo', '--freq']))
    expect(output).toContain('Word Frequency')
    expect(output).toContain('foo')
  })

  it('should output JSON with --json', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    text(['hello world', '--json'])
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.words).toBe(2)
    expect(parsed.lines).toBe(1)
    expect(parsed.bytes).toBe(11)
  })

  it('should read input from stdin pipe', () => {
    mockReadStdinSync.mockReturnValue('piped input here')
    const output = captureOutput(() => text([]))
    expect(output).toContain('Words:')
    expect(output).toContain('3')
  })

  it('should exit on missing input', () => {
    mockReadStdinSync.mockReturnValue('')
    expect(() => text([])).toThrow(ExitError)
  })
})
