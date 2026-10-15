import { describe, it, expect, vi, beforeEach } from 'vitest'
import { color } from '../color.js'
import { ExitError } from '../../errors.js'

const mockReadStdinSync = vi.hoisted(() => vi.fn())
vi.mock('../../utils.js', () => ({
  readStdinSync: mockReadStdinSync,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  mockReadStdinSync.mockReset()
})

describe('color', () => {
  it('should parse HEX input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['#ff7f50'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
    expect(output).toContain('rgb(255, 127, 80)')
    expect(output).toContain('hsl(16, 100%, 66%)')
  })

  it('should parse 3-digit HEX', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['#fff'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FFFFFF')
  })

  it('should parse HEX without hash', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['ff7f50'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
  })

  it('should parse RGB input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['rgb(255, 127, 80)'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
    expect(output).toContain('rgb(255, 127, 80)')
  })

  it('should parse RGB with extra whitespace', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['rgb( 255 , 127 , 80 )'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
  })

  it('should parse HSL input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['hsl(16, 100%, 66%)'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('hsl(16, 100%, 66%)')
    expect(output).toContain('rgb(255, ')
  })

  it('should parse named colors', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['coral'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
  })

  it('should exit on unparseable input', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => color(['this-is-not-a-color'])).toThrow(ExitError)
  })

  it('should exit on RGB values out of range', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => color(['rgb(256, 0, 0)'])).toThrow(ExitError)
  })

  it('should exit on HSL values out of range', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => color(['hsl(361, 100%, 50%)'])).toThrow(ExitError)
  })

  it('should parse 8-digit HEX with alpha', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['#ff7f5080'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#FF7F50')
    expect(output).toContain('rgba(255, 127, 80, 0.5)')
    expect(output).toContain('hsla(16, 100%, 66%, 0.5)')
  })

  it('should parse 4-digit HEX with alpha', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['#ff88'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('rgba(255, 255, 136, 0.53)')
  })

  it('should parse RGBA input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['rgba(255, 127, 80, 0.5)'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('rgba(255, 127, 80, 0.5)')
    expect(output).toContain('hsla(16, 100%, 66%, 0.5)')
  })

  it('should parse HSLA input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['hsla(16, 100%, 66%, 0.5)'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('rgba(255, 128, 82, 0.5)')
    expect(output).toContain('hsla(16, 100%, 66%, 0.5)')
  })

  it('should clamp alpha value to 0-1 range', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['rgba(255, 0, 0, 1.5)'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('1')
  })

  it('should output lowercase hex with --lower', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['coral', '--lower'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    expect(output).toContain('#ff7f50')
    expect(output).not.toContain('#FF7F50')
  })

  it('should output lowercase hex with --lower --json', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    color(['coral', '--lower', '--json'])
    const output = spy.mock.calls.flatMap((c) => c).join(' ')
    const parsed = JSON.parse(output)
    expect(parsed.hex).toBe('#ff7f50')
  })

  describe('stdin', () => {
    it('should read a color value from stdin', () => {
      mockReadStdinSync.mockReturnValue('coral')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      color([])
      expect(spy.mock.calls.flatMap((c) => c).join(' ')).toContain('FF7F50')
    })

    it('should prefer an argument over stdin', () => {
      mockReadStdinSync.mockReturnValue('coral')
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      color(['#000000'])
      const out = spy.mock.calls.flatMap((c) => c).join(' ')
      expect(out).toContain('000000')
      expect(mockReadStdinSync).not.toHaveBeenCalled()
    })

    it('should still fail when both argument and stdin are empty', () => {
      mockReadStdinSync.mockReturnValue('')
      expect(() => color([])).toThrow(ExitError)
    })
  })
})
