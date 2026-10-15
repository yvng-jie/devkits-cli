import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cron } from '../cron.js'
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

function captureJson(fn: () => void): unknown {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  fn()
  const raw = spy.mock.calls.flatMap((c) => c).join('')
  return JSON.parse(raw)
}

describe('cron', () => {
  describe('validation — step syntax', () => {
    // Regression: `*/15` used to be rejected even though it is the first
    // example in the command's own help text.
    it('should accept a wildcard with a step', () => {
      const output = captureOutput(() => cron(['*/15 * * * *', '--validate']))
      expect(output).toContain('Valid')
    })

    it('should accept a range with a step', () => {
      const output = captureOutput(() => cron(['1-10/2 * * * *', '--validate']))
      expect(output).toContain('Valid')
    })

    it('should accept a step from an explicit start', () => {
      const output = captureOutput(() => cron(['5/10 * * * *', '--validate']))
      expect(output).toContain('Valid')
    })

    it('should render next run times for a stepped expression', () => {
      const out = captureJson(() => cron(['*/15 * * * *', '--json', '--next', '3'])) as {
        next: string[]
      }
      expect(out.next).toHaveLength(3)
    })
  })

  describe('validation — formats', () => {
    it('should accept a plain five-field expression', () => {
      const output = captureOutput(() => cron(['0 9 * * 1-5', '--validate']))
      expect(output).toContain('Valid')
    })

    it('should accept special strings', () => {
      for (const expr of ['@daily', '@hourly', '@weekly', '@monthly', '@yearly']) {
        const output = captureOutput(() => cron([expr, '--validate']))
        expect(output).toContain('Valid')
      }
    })

    it('should accept named months and weekdays', () => {
      expect(captureOutput(() => cron(['0 0 1 JAN *', '--validate']))).toContain('Valid')
      expect(captureOutput(() => cron(['0 0 * * MON', '--validate']))).toContain('Valid')
      expect(captureOutput(() => cron(['0 0 * * MON-FRI', '--validate']))).toContain('Valid')
    })

    it('should accept comma-separated lists', () => {
      const output = captureOutput(() => cron(['0 0 * * MON,WED,FRI', '--validate']))
      expect(output).toContain('Valid')
    })

    it('should accept an hourly step on the hour field', () => {
      expect(captureOutput(() => cron(['0 */2 * * *', '--validate']))).toContain('Valid')
    })
  })

  describe('validation — rejections', () => {
    it('should reject an expression with the wrong number of fields', () => {
      expect(() => cron(['* * * *', '--validate'])).toThrow(ExitError)
    })

    it('should reject non-numeric garbage', () => {
      expect(() => cron(['not a cron', '--validate'])).toThrow(ExitError)
    })

    it('should reject out-of-range values', () => {
      expect(() => cron(['99 99 99 99 99', '--validate'])).toThrow(ExitError)
      expect(() => cron(['60 * * * *', '--validate'])).toThrow(ExitError)
      expect(() => cron(['0 24 * * *', '--validate'])).toThrow(ExitError)
    })

    it('should reject an invalid step', () => {
      expect(() => cron(['*/abc * * * *', '--validate'])).toThrow(ExitError)
    })

    it('should reject an unknown day name', () => {
      expect(() => cron(['0 0 * * XYZ', '--validate'])).toThrow(ExitError)
    })
  })

  describe('output', () => {
    it('should describe an expression', () => {
      const output = captureOutput(() => cron(['@daily']))
      expect(output).toContain('@daily')
      expect(output.toLowerCase()).toContain('midnight')
    })

    it('should emit JSON with expression, description and next runs', () => {
      const out = captureJson(() => cron(['*/15 * * * *', '--next', '5', '--json'])) as {
        expression: string
        description: string
        next: string[]
      }
      expect(out.expression).toBe('*/15 * * * *')
      expect(out.description).toBeTruthy()
      expect(out.next.length).toBeGreaterThan(0)
    })

    it('should not let --next swallow a following flag', () => {
      // Regression: `--next --json` used to consume `--json` as the value of
      // `--next`, silently dropping JSON output. The flag must still be honoured,
      // and `--next` falls back to its documented default of 5.
      const out = captureJson(() => cron(['*/15 * * * *', '--next', '--json'])) as {
        expression: string
        next: string[]
      }
      expect(out.expression).toBe('*/15 * * * *')
      expect(out.next).toHaveLength(5)
    })

    it('should default to 5 next runs for a bare --next', () => {
      const out = captureJson(() => cron(['0 9 * * *', '--next', '--json'])) as { next: string[] }
      expect(out.next).toHaveLength(5)
    })

    it('should respect an explicit --next count', () => {
      const out = captureJson(() => cron(['0 9 * * *', '--next', '2', '--json'])) as { next: string[] }
      expect(out.next).toHaveLength(2)
    })

    it('should exit on missing input', () => {
      expect(() => cron([])).toThrow(ExitError)
    })
  })

  describe('stdin', () => {
    it('should read an expression from stdin', () => {
      mockReadStdinSync.mockReturnValue('*/15 * * * *')
      const output = captureOutput(() => cron(['--validate']))
      expect(output).toContain('Valid')
    })

    it('should prefer an argument over stdin', () => {
      mockReadStdinSync.mockReturnValue('*/15 * * * *')
      const output = captureOutput(() => cron(['@daily', '--validate']))
      expect(output).toContain('Valid')
      expect(mockReadStdinSync).not.toHaveBeenCalled()
    })

    it('should still fail when both argument and stdin are empty', () => {
      mockReadStdinSync.mockReturnValue('')
      expect(() => cron([])).toThrow(ExitError)
    })
  })
})
