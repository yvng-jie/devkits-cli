import { describe, it, expect } from 'vitest'
import { showHelp, showVersion } from '../help.js'
// NOTE: `../index.js` is the CLI entry point (it calls main()), not a barrel —
// the registry must be imported from its own module.
import { commands } from '../registry.js'

/**
 * Naming convention guard.
 *
 * The package is `devkits-cli`, but the command users are taught to type is
 * `dt`. Documentation and help output must teach exactly one form, otherwise
 * every reader has to work out which of the two names is "the real one".
 *
 * These tests fail if someone reintroduces `devkits-cli` as a *command* in
 * usage/examples, or drops `dt` from the surfaces where it is the primary name.
 */
function capture(fn: () => void): string {
  const calls: string[] = []
  const orig = console.log
  console.log = (...args: unknown[]) => {
    calls.push(args.join(' '))
  }
  try {
    fn()
  } finally {
    console.log = orig
  }
  return calls.join('\n')
}

/** Strip ANSI so assertions are not confused by colour codes. */
// eslint-disable-next-line no-control-regex
const plain = (s: string) => s.replace(/\u001B\[[0-9;]*m/g, '')

describe('naming convention', () => {
  it('help output teaches `dt` as the command', () => {
    const out = plain(capture(() => showHelp(commands)))
    expect(out).toContain('dt <command>')
    expect(out).toContain('(full name: devkits-cli)')
  })

  it('help examples use `dt`, never the package name, as the command', () => {
    const out = plain(capture(() => showHelp(commands)))
    // A command invocation would look like `devkits-cli <verb>`; the package name
    // is only allowed in prose, the version line and the repository URL.
    expect(out).not.toMatch(/^\s*devkits-cli [a-z]/m)
    expect(out).not.toMatch(/\| devkits-cli [a-z]/)
  })

  it('help output still identifies the package', () => {
    const out = plain(capture(() => showHelp(commands)))
    expect(out).toContain('devkits-cli')
    expect(out).toContain('github.com/yvng-jie/devkits-cli')
  })

  it('version output carries both names', () => {
    const out = plain(capture(() => showVersion()))
    expect(out).toMatch(/^devkits-cli v\d+\.\d+\.\d+ \(dt\)$/)
  })

  it('every command help uses `dt`, never `devkits-cli`, as the command', () => {
    for (const cmd of commands) {
      const out = plain(capture(() => cmd.help()))
      expect(out, `"${cmd.name}" help should use dt`).toContain('dt ')
      expect(out, `"${cmd.name}" help should not invoke devkits-cli`).not.toMatch(/devkits-cli [a-z]/)
    }
  })
})
