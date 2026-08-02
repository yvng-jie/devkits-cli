import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fake } from '../fake.js'
import { ExitError } from '../../errors.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

function captureOutput(fn: () => void): string {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  fn()
  return spy.mock.calls.flatMap((c) => c).join(' ')
}

describe('fake', () => {
  it('should generate a name by default', () => {
    const output = captureOutput(() => fake([]))
    expect(output.trim().split(/\s+/)).toHaveLength(2)
  })

  it('should generate an email', () => {
    const output = captureOutput(() => fake(['email']))
    expect(output).toMatch(/@/)
  })

  it('should generate a UUID', () => {
    const output = captureOutput(() => fake(['uuid']))
    expect(output.trim()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('should generate count values with -c', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    fake(['name', '-c', '3'])
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('should generate integers within min/max', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    fake(['integer', '--min', '5', '--max', '5'])
    const values = spy.mock.calls.map((c) => Number(c[0]))
    expect(values).toEqual([5])
  })

  it('should output JSON with --json', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    fake(['email', '--json'])
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.type).toBe('email')
    expect(parsed.values).toHaveLength(1)
    expect(parsed.values[0]).toMatch(/@/)
  })

  it('should exit on unknown type', () => {
    expect(() => fake(['nonsense'])).toThrow(ExitError)
  })

  it('should exit on invalid count', () => {
    expect(() => fake(['name', '--count', '0'])).toThrow(ExitError)
  })
})
