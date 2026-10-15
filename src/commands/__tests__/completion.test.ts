import { describe, it, expect, vi, beforeEach } from 'vitest'
import { completionCommand } from '../completion.js'
import { commands } from '../index.js'
import { ExitError } from '../../errors.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

/** `run` is async (it resolves the registry lazily), so capture after awaiting. */
async function run(shell: string): Promise<string> {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  await completionCommand.run([shell])
  return spy.mock.calls.flatMap((c) => c).join('\n')
}

const SHELLS = ['bash', 'zsh', 'fish'] as const

describe('completion', () => {
  it('should generate a script for every supported shell', async () => {
    for (const shell of SHELLS) {
      const output = await run(shell)
      expect(output.length).toBeGreaterThan(0)
      expect(output).toContain('devkits-cli')
    }
  })

  it('should register completion for both the primary name and the dt alias', async () => {
    const bash = await run('bash')
    expect(bash).toContain('complete -F _devkits_cli_completions devkits-cli')
    expect(bash).toContain('complete -F _devkits_cli_completions dt')
  })

  it('should mention every registered command', async () => {
    // Guards against the completion script drifting from the registry.
    for (const shell of SHELLS) {
      const output = await run(shell)
      for (const cmd of commands) {
        expect(output, `${shell} completion is missing "${cmd.name}"`).toContain(cmd.name)
      }
    }
  })

  it('should not mention commands that were removed in 1.0.0', async () => {
    const removed = ['uuid', 'qrcode', 'lorem', 'semver', 'cidr']
    for (const shell of SHELLS) {
      const output = await run(shell)
      for (const name of removed) {
        expect(output, `${shell} completion still references "${name}"`).not.toContain(name)
      }
    }
  })

  it('should include command aliases', async () => {
    expect(await run('bash')).toContain('ts')
  })

  it('should include flags declared for a command', async () => {
    const output = await run('bash')
    expect(output).toContain('--algo')
    expect(output).toContain('--palette')
    expect(output).toContain('--timezone')
  })

  it('should emit syntactically valid bash', async () => {
    const { execFileSync } = await import('node:child_process')
    const { writeFileSync, rmSync } = await import('node:fs')
    const file = '/tmp/devkits-cli-completion-test.bash'
    // `bash -n` parses without executing, so a syntax error fails the test.
    try {
      writeFileSync(file, await run('bash'))
      execFileSync('bash', ['-n', file])
    } finally {
      rmSync(file, { force: true })
    }
  })

  it('should reject an unsupported shell', async () => {
    await expect(completionCommand.run(['powershell'])).rejects.toThrow(ExitError)
  })

  it('should reject a missing shell argument', async () => {
    await expect(completionCommand.run([])).rejects.toThrow(ExitError)
  })

  it('should be case-insensitive about the shell name', async () => {
    expect(await run('BASH')).toContain('devkits-cli')
  })
})
