import { createInterface } from 'node:readline'
import chalk from 'chalk'
import { exitWithError } from '../errors.js'
import { readStdinSync } from '../utils.js'
import { createHelp } from '../help-builder.js'
import { parseCommonFlags } from '../parse-flags.js'
import { ask, isBack, pauseWithCopy, captureOutput } from '../interactive-utils.js'
import type { Command } from './types.js'
import { NAMED_COLORS } from '../data/named-colors.js'

interface Rgb {
  r: number
  g: number
  b: number
  a?: number
}
interface Hsl {
  h: number
  s: number
  l: number
  a?: number
}

type PaletteType = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'monochromatic'

const PALETTES: PaletteType[] = ['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic']

function hexToRgb(hex: string): Rgb | null {
  const h = hex.replace(/^#/, '')
  if (h.length === 3) {
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) }
  }
  if (h.length === 4) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: Math.round((parseInt(h[3] + h[3], 16) / 255) * 100) / 100,
    }
  }
  if (h.length === 6) {
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100,
    }
  }
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60
  else if (max === gg) h = ((bb - rr) / d + 2) * 60
  else h = ((rr - gg) / d + 4) * 60
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const ss = s / 100,
    ll = l / 100
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ll - c / 2
  let r = 0,
    g = 0,
    b = 0
  if (h < 60) {
    r = c; g = x
  } else if (h < 120) {
    r = x; g = c
  } else if (h < 180) {
    g = c; b = x
  } else if (h < 240) {
    g = x; b = c
  } else if (h < 300) {
    r = x; b = c
  } else {
    r = c; b = x
  }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

function parseRgb(str: string): Rgb | null {
  const m = str.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?/)
  if (!m) return null
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3])
  if (r > 255 || g > 255 || b > 255) return null
  const a = m[4] !== undefined ? clampAlpha(Number(m[4])) : undefined
  return { r, g, b, a }
}

function parseHsl(str: string): Hsl | null {
  const m = str.match(/hsla?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+))?/)
  if (!m) return null
  const h = Number(m[1]), s = Number(m[2]), l = Number(m[3])
  if (h > 360 || s > 100 || l > 100) return null
  const a = m[4] !== undefined ? clampAlpha(Number(m[4])) : undefined
  return { h, s, l, a }
}

function clampAlpha(v: number): number {
  return Math.max(0, Math.min(1, Math.round(v * 100) / 100))
}

function parseColor(raw: string): { hex: string; rgb: Rgb; hsl: Hsl } | null {
  let hex = '', rgb: Rgb | null = null, hsl: Hsl | null = null

  if (/^#?[0-9a-fA-F]{3,8}$/.test(raw)) {
    const r = hexToRgb(raw.startsWith('#') ? raw : '#' + raw)
    if (r) { rgb = r; hex = rgbToHex(r.r, r.g, r.b) }
  }
  if (!rgb) {
    rgb = parseRgb(raw)
    if (rgb) hex = rgbToHex(rgb.r, rgb.g, rgb.b)
  }
  if (!rgb) {
    hsl = parseHsl(raw)
    if (hsl) {
      rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
      if (hsl.a !== undefined) rgb.a = hsl.a
      hex = rgbToHex(rgb.r, rgb.g, rgb.b)
    }
  }
  if (!rgb) {
    const h = NAMED_COLORS[raw.toLowerCase()]
    if (h) {
      const r = hexToRgb(h)
      if (r) { rgb = r; hex = h.toUpperCase() }
    }
  }
  if (!rgb) return null
  hsl ??= rgbToHsl(rgb.r, rgb.g, rgb.b)
  if (rgb.a !== undefined) hsl.a = rgb.a
  return { hex, rgb, hsl }
}

function generatePalette(baseHsl: Hsl, type: PaletteType, count: number): Hsl[] {
  const results: Hsl[] = []
  const { h, s, l } = baseHsl

  switch (type) {
    case 'complementary': {
      // Base + opposite (180°)
      for (let i = 0; i < count; i++) {
        const offset = i === 0 ? 0 : 180 + (i - 1) * 10
        results.push({ h: (h + offset) % 360, s, l: l + (i > 0 ? (i % 2 === 1 ? -10 : 10) : 0) })
      }
      break
    }
    case 'analogous': {
      // Adjacent hues (±30°)
      const totalSpread = 60
      for (let i = 0; i < count; i++) {
        const offset = -totalSpread / 2 + (totalSpread / (count - 1 || 1)) * i
        results.push({ h: ((h + Math.round(offset)) % 360 + 360) % 360, s, l: l + (i === 0 ? 0 : i % 2 === 1 ? -5 : 5) })
      }
      break
    }
    case 'triadic': {
      // 3 evenly spaced (120°)
      for (let i = 0; i < count; i++) {
        const offset = i < 3 ? i * 120 : (i - 2) * 120 + 10
        results.push({ h: (h + offset) % 360, s, l: l + (i >= 3 ? -10 : 0) })
      }
      break
    }
    case 'tetradic': {
      // Rectangle (60°/120°)
      for (let i = 0; i < count; i++) {
        const offsets = [0, 60, 180, 240]
        const offset = offsets[i % offsets.length] ?? (offsets[i % offsets.length]! + (i - 3) * 5)
        results.push({ h: (h + offset) % 360, s, l: l + (i > 3 ? -10 : 0) })
      }
      break
    }
    case 'monochromatic': {
      // Vary lightness
      for (let i = 0; i < count; i++) {
        const lightness = Math.max(5, Math.min(95, l + (i - Math.floor(count / 2)) * (70 / count)))
        results.push({ h, s: Math.max(10, s - i * 5), l: Math.round(lightness) })
      }
      break
    }
  }

  return results
}

export function color(args: string[]) {
  const { flags, rest } = parseCommonFlags(args)

  let palette: PaletteType | null = null
  let paletteCount = 3
  const inputRest: string[] = []
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--palette') {
      const raw = rest[i + 1]?.toLowerCase()
      if (raw && PALETTES.includes(raw as PaletteType)) {
        palette = raw as PaletteType
        i++
      } else {
        exitWithError(`unsupported palette "${rest[i + 1]}" (supported: ${PALETTES.join(', ')})`)
      }
    } else if (a === '--count') {
      const raw = Number(rest[i + 1])
      if (Number.isInteger(raw) && raw >= 1 && raw <= 10) {
        paletteCount = raw
        i++
      } else {
        exitWithError('--count must be an integer between 1 and 10')
      }
    } else {
      inputRest.push(a)
    }
  }

  const raw = inputRest.join(' ').trim() || readStdinSync() || ''
  if (!raw) {
    exitWithError('provide a color value')
  }

  const parsed = parseColor(raw)
  if (!parsed) {
    exitWithError(
      'could not parse "' + raw + '" — supported: HEX (#ff7f50), RGB (rgb(255,127,80)), HSL (hsl(16,100%,66%)), named (coral)',
    )
    return
  }

  // Palette mode
  if (palette) {
    const paletteColors = generatePalette(parsed.hsl, palette, paletteCount)
    const colorData = paletteColors.map((c) => {
      const r = hslToRgb(c.h, c.s, c.l)
      const hx = rgbToHex(r.r, r.g, r.b)
      return { hex: hx, rgb: `rgb(${r.r},${r.g},${r.b})`, hsl: `hsl(${c.h},${c.s}%,${c.l}%)` }
    })

    if (flags.json) {
      const data = colorData.map((c) => ({ hex: c.hex, rgb: c.rgb, hsl: c.hsl }))
      console.log(JSON.stringify({ base: parsed.hex, palette: palette, colors: data }))
      return
    }

    console.log('')
    console.log(`  ${chalk.bold(`${palette.charAt(0).toUpperCase() + palette.slice(1)} Palette`)}`)
    console.log(`  ${chalk.dim('  Base:')} ${chalk.white(parsed.hex)}`)
    console.log('')

    for (const c of colorData) {
      const colorHex = chalk.hex(c.hex)
      console.log(`  ${colorHex('████████')}  ${colorHex.bold(c.hex)}  ${chalk.dim(c.hsl)}`)
    }
    console.log('')
    return
  }

  // Single color mode (existing behavior)
  let displayHex = parsed.hex
  const displayRgb = parsed.rgb
  const displayHsl = parsed.hsl

  if (flags.lower) {
    displayHex = displayHex.toLowerCase()
  }

  const hasAlpha = displayRgb.a !== undefined

  if (flags.json) {
    const result: Record<string, string> = {
      hex: displayHex,
      rgb: hasAlpha ? `rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, ${displayRgb.a})` : `rgb(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b})`,
      hsl: hasAlpha ? `hsla(${displayHsl.h}, ${displayHsl.s}%, ${displayHsl.l}%, ${displayHsl.a ?? 1})` : `hsl(${displayHsl.h}, ${displayHsl.s}%, ${displayHsl.l}%)`,
    }
    console.log(JSON.stringify(result))
    return
  }

  const colorHex = chalk.hex(displayHex)
  console.log('')
  console.log(`  ${colorHex('████████████')}  ${colorHex('████████')}`)
  console.log(`  ${colorHex('████████████')}  ${colorHex.bold('  PREVIEW')}`)
  console.log(`  ${colorHex('████████████')}  ${chalk.dim('  ───────')}`)
  console.log(`  ${colorHex('████████████')}`)
  console.log('')
  console.log(`  ${chalk.bold('HEX')}  ${chalk.green(displayHex)}`)
  if (hasAlpha) {
    console.log(`  ${chalk.bold('RGBA')} ${chalk.green(`rgba(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}, ${displayRgb.a})`)}`)
    console.log(`  ${chalk.bold('HSLA')} ${chalk.green(`hsla(${displayHsl.h}, ${displayHsl.s}%, ${displayHsl.l}%, ${displayHsl.a ?? 1})`)}`)
  } else {
    console.log(`  ${chalk.bold('RGB')}  ${chalk.green(`rgb(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b})`)}`)
    console.log(`  ${chalk.bold('HSL')}  ${chalk.green(`hsl(${displayHsl.h}, ${displayHsl.s}%, ${displayHsl.l}%)`)}`)
  }
  console.log('')
}

const colorHelp = createHelp({
  name: 'color',
  description: 'Convert colors & generate palettes (HEX / RGB / HSL / named)',
  usage: 'dt color <value> [options]\n    echo coral | dt color',
  options: [
    { flags: '--json', desc: 'Output as JSON' },
    { flags: '--lower', desc: 'Output lowercase hex' },
    { flags: '--palette <type>', desc: 'Generate palette: complementary, analogous, triadic, tetradic, monochromatic' },
    { flags: '--count <n>', desc: 'Number of palette colors (default: 3, max: 10)' },
  ],
  extra: [
    `  ${chalk.yellow('Supported formats:')}`,
    '    HEX:   #FF7F50, ff7f50',
    '    HEXA:  #FF7F5080 (4 or 8 digits with alpha)',
    '    RGB:   rgb(255, 127, 80)',
    '    RGBA:  rgba(255, 127, 80, 0.5)',
    '    HSL:   hsl(16, 100%, 66%)',
    '    HSLA:  hsla(16, 100%, 66%, 0.5)',
    '    Name:  coral, steelblue, rebeccapurple',
    '',
  ],
  examples: [
    { cmd: 'dt color #ff7f50' },
    { cmd: 'dt color coral' },
    { cmd: 'echo coral | dt color --json' },
    { cmd: 'dt color "#ff7f50" --palette complementary' },
    { cmd: 'dt color "#ff7f50" --palette triadic' },
    { cmd: 'dt color "#ff7f50" --palette analogous --count 5' },
  ],
})

async function colorInteractive(rl: ReturnType<typeof createInterface>): Promise<void> {
  const input = await ask(rl, `  ${chalk.yellow('?')} Color value ${chalk.dim('(e.g. #ff7f50, coral, rgb(255,127,80))')}: `)
  if (isBack(input)) return
  const palette = (await ask(rl, `  ${chalk.yellow('?')} Palette? ${chalk.dim('(complementary/analogous/triadic/tetradic/monochromatic, empty=none)')}: `)).trim().toLowerCase()
  if (isBack(palette)) return
  const args = input ? [input] : []
  if (palette && PALETTES.includes(palette as PaletteType)) args.push('--palette', palette)
  const output = captureOutput(() => color(args))
  await pauseWithCopy(rl, output)
}

export const colorCommand: Command = {
  name: 'color',
  aliases: [],
  category: 'utility',
  description: 'Convert colors & generate palettes',
  run: color,
  help: colorHelp,
  interactive: colorInteractive,
}
