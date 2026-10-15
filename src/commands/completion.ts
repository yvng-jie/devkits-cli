import { exitWithError } from '../errors.js'
import { createHelp } from '../help-builder.js'
import type { Command } from './types.js'

const SHELLS = ['bash', 'zsh', 'fish'] as const
type Shell = (typeof SHELLS)[number]

/** The primary binary name, plus the short alias we register completion for. */
const BIN = 'devkits-cli'
const ALIAS = 'dt'

interface FlagSpec {
  /** Canonical long flag, without leading dashes. */
  name: string
  /** Single-letter alias, if any. */
  short?: string
  /** Set for flags that take a value. */
  value?: boolean
  /** Fixed set of accepted values (offered to the shell). */
  values?: string[]
  desc: string
}

/**
 * Per-command flag metadata used to build completion scripts.
 *
 * Command *names* are derived from the registry below, so adding a command
 * automatically extends completion. Only flags need to be declared here.
 */
const FLAGS: Record<string, FlagSpec[]> = {
  jwt: [
    { name: 'verify', short: 'k', value: true, desc: 'Verify HMAC signature' },
    { name: 'secret', short: 's', value: true, desc: 'HMAC secret for encode' },
    { name: 'algo', short: 'a', value: true, values: ['HS256', 'HS384', 'HS512'], desc: 'Encode algorithm' },
    { name: 'exp', value: true, desc: 'Add exp claim N seconds from now' },
    { name: 'no-sign', desc: 'Create an unsigned token' },
  ],
  hash: [
    { name: 'algo', short: 'a', value: true, values: ['sha1', 'sha256', 'sha384', 'sha512'], desc: 'Hash algorithm' },
    { name: 'format', value: true, values: ['hex', 'base64', 'base64url'], desc: 'Output format' },
    { name: 'file', value: true, desc: 'Hash file contents' },
    { name: 'key', short: 'k', value: true, desc: 'HMAC key' },
  ],
  base64: [
    { name: 'url', desc: 'URL-safe base64 (no padding)' },
    { name: 'json', desc: 'Output as JSON' },
  ],
  url: [{ name: 'json', desc: 'Output as JSON' }],
  color: [
    {
      name: 'palette',
      value: true,
      values: ['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic'],
      desc: 'Generate palette',
    },
    { name: 'count', value: true, desc: 'Number of palette colors' },
    { name: 'lower', desc: 'Output lowercase hex' },
    { name: 'json', desc: 'Output as JSON' },
  ],
  timestamp: [
    { name: 'utc', desc: 'Show time in UTC' },
    { name: 'iso', desc: 'Show time in ISO 8601 format' },
    { name: 'timezone', value: true, desc: 'Show time in an IANA timezone' },
    { name: 'json', desc: 'Output as JSON' },
  ],
  cron: [
    { name: 'next', value: true, desc: 'Show next N execution times' },
    { name: 'validate', desc: 'Validate cron expression only' },
    { name: 'json', desc: 'Output as JSON' },
  ],
  completion: [],
}

/** Commands that take positional sub-actions, e.g. `base64 encode`. */
const POSITIONAL_ACTIONS: Record<string, string[]> = {
  base64: ['encode', 'decode'],
  url: ['encode', 'decode', 'parse'],
  jwt: ['encode'],
  completion: ['bash', 'zsh', 'fish'],
}

// ── Derived data ───────────────────────────────────────────────

const allNames = (cmds: Command[]): string[] => cmds.map((c) => c.name)

const firstAliases = (cmds: Command[]): string[] => cmds.filter((c) => c.aliases.length > 0).map((c) => c.aliases[0])

/** Every word accepted in the first argument position. */
const firstPositionWords = (cmds: Command[]): string[] => [
  ...allNames(cmds),
  ...firstAliases(cmds),
  'help',
  '--help',
  '-h',
  '--version',
  '-v',
]

/** All flag tokens for a command, e.g. `--algo -a`. */
const flagTokens = (cmdName: string): string[] => {
  const specs = FLAGS[cmdName] ?? []
  const tokens: string[] = []
  for (const f of specs) {
    tokens.push(`--${f.name}`)
    if (f.short) tokens.push(`-${f.short}`)
  }
  // `--json` and `--help` are supported by every command.
  if (!specs.some((s) => s.name === 'json')) tokens.push('--json')
  tokens.push('--help', '-h')
  return tokens
}

// ── Bash ───────────────────────────────────────────────────────

function generateBash(cmds: Command[]): string {
  const cases = cmds
    .map((cmd) => {
      const actions = POSITIONAL_ACTIONS[cmd.name]
      const flagCase = `        *) COMPREPLY=($(compgen -W "${flagTokens(cmd.name).join(' ')}" -- "$cur")) ;;`
      const valueCases = (FLAGS[cmd.name] ?? [])
        .filter((f) => f.values && f.values.length > 0)
        .map((f) => {
          const prevPattern = f.short ? `--${f.name}|-${f.short}` : `--${f.name}`
          return `        ${prevPattern}) COMPREPLY=($(compgen -W "${f.values!.join(' ')}" -- "$cur")) ;;`
        })

      if (actions) {
        // Sub-action commands: offer actions first, then that action's flags.
        return [
          `    ${cmd.name}${cmd.aliases.length ? '|' + cmd.aliases.join('|') : ''})`,
          `      if [[ $COMP_CWORD -eq 2 ]]; then`,
          `        COMPREPLY=($(compgen -W "${actions.join(' ')} ${flagTokens(cmd.name).join(' ')}" -- "$cur"))`,
          `      else`,
          `        case $prev in`,
          ...valueCases,
          flagCase,
          `        esac`,
          `      fi`,
          `      ;;`,
        ].join('\n')
      }

      return [
        `    ${cmd.name}${cmd.aliases.length ? '|' + cmd.aliases.join('|') : ''})`,
        `      case $prev in`,
        ...valueCases,
        flagCase,
        `      esac`,
        `      ;;`,
      ].join('\n')
    })
    .join('\n')

  return `# ${BIN} bash completion — generated, do not edit by hand
_devkits_cli_completions() {
  local cur=\${COMP_WORDS[COMP_CWORD]}
  local prev=\${COMP_WORDS[COMP_CWORD-1]}

  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W "${firstPositionWords(cmds).join(' ')}" -- "$cur"))
    return 0
  fi

  local cmd=\${COMP_WORDS[1]}
  case $cmd in
    help)
      COMPREPLY=($(compgen -W "${[...allNames(cmds), ...firstAliases(cmds)].join(' ')}" -- "$cur"))
      ;;
${cases}
    *)
      COMPREPLY=($(compgen -W "--json --help -h" -- "$cur"))
      ;;
  esac
}

complete -F _devkits_cli_completions ${BIN}
complete -F _devkits_cli_completions ${ALIAS}
`
}

// ── Zsh ────────────────────────────────────────────────────────

function generateZsh(cmds: Command[]): string {
  const cmdEntries = cmds.map((c) => `    '${c.name}:${c.description.replace(/'/g, "'\\''")}'`).join('\n')

  const argCases = cmds
    .map((cmd) => {
      const specs = FLAGS[cmd.name] ?? []
      const lines: string[] = []

      const actions = POSITIONAL_ACTIONS[cmd.name]
      if (actions) lines.push(`          '1:action:(${actions.join(' ')})'`)

      for (const f of specs) {
        const valuePart = f.value ? (f.values ? `:${f.name}:(${f.values.join(' ')})` : `:${f.name}:`) : ''
        lines.push(`          '--${f.name}[${f.desc}]${valuePart}'`)
        if (f.short) lines.push(`          '-${f.short}[${f.desc}]${valuePart}'`)
      }

      return `        ${cmd.name}${cmd.aliases.length ? '|' + cmd.aliases.join('|') : ''})\n          _arguments -s \\\n${lines.join(' \\\n')}`
    })
    .join('\n          ;;\n')

  return `#compdef ${BIN} ${ALIAS}
# ${BIN} zsh completion — generated, do not edit by hand

_devkits_cli_commands() {
  local -a cmds
  cmds=(
${cmdEntries}
  )
  _describe 'command' cmds
}

_devkits_cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \\
    '--json[Output as JSON]' \\
    '--help[Show help]' \\
    '-h[Show help]' \\
    '--version[Show version]' \\
    '-v[Show version]' \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      _devkits_cli_commands
      ;;
    args)
      case $words[1] in
        help) _devkits_cli_commands ;;
${argCases}
      esac
      ;;
  esac
}

_devkits_cli "$@"
`
}

// ── Fish ───────────────────────────────────────────────────────

function generateFish(cmds: Command[]): string {
  const cmdList = cmds
    .map((c) => {
      const aliases = c.aliases.length > 0 ? ` -a '${c.aliases.join(' ')}'` : ''
      return `complete -c ${BIN} -f -n '__fish_devkits_cli_no_subcommand' -a '${c.name}'${aliases} -d '${c.description.replace(/'/g, "\\'")}'`
    })
    .join('\n')

  const flagLines = cmds
    .flatMap((cmd) =>
      (FLAGS[cmd.name] ?? []).map((f) => {
        const short = f.short ? ` -s ${f.short}` : ''
        const value = f.value ? (f.values ? ` -xa '${f.values.join(' ')}'` : ' -r') : ''
        return `complete -c ${BIN} -n '__fish_devkits_cli_using_subcommand ${cmd.name}' -l ${f.name}${short}${value} -d '${f.desc.replace(/'/g, "\\'")}'`
      }),
    )
    .join('\n')

  const actionLines = Object.entries(POSITIONAL_ACTIONS)
    .map(([cmd, actions]) => `complete -c ${BIN} -n '__fish_devkits_cli_using_subcommand ${cmd}' -a '${actions.join(' ')}'`)
    .join('\n')

  return `# ${BIN} fish completion — generated, do not edit by hand
function __fish_devkits_cli_no_subcommand
  set -l cmd (commandline -opc)
  if [ (count $cmd) -eq 1 ]
    return 0
  end
  return 1
end

function __fish_devkits_cli_using_subcommand
  set -l cmd (commandline -opc)
  if [ (count $cmd) -gt 1 ]
    set -l sub (string trim -- $cmd[2])
    if [ "$sub" = "$argv[1]" ]
      return 0
    end
  end
  return 1
end

${cmdList}

# Global flags
complete -c ${BIN} -n '__fish_devkits_cli_no_subcommand' -l json -d 'Output as JSON'
complete -c ${BIN} -n '__fish_devkits_cli_no_subcommand' -l help -s h -d 'Show help'
complete -c ${BIN} -n '__fish_devkits_cli_no_subcommand' -l version -s v -d 'Show version'

# Positional actions
${actionLines}

# Command-specific flags
${flagLines}
`
}

/**
 * Generate a completion script.
 *
 * NOTE: this function takes the command list as an argument and never imports
 * the registry. The registry imports this module (to register the `completion`
 * command), so importing it back would create a cycle that leaves the registry
 * array with a `null` entry for this very command.
 */
export function generate(shell: string, cmds: Command[]): string {
  switch (shell) {
    case 'bash':
      return generateBash(cmds).trim()
    case 'zsh':
      return generateZsh(cmds).trim()
    case 'fish':
      return generateFish(cmds).trim()
    default:
      return exitWithError(`unsupported shell "${shell}" (supported: ${SHELLS.join(', ')})`)
  }
}

export function completion(args: string[], cmds: Command[] = []) {
  const shell = args[0]?.toLowerCase()

  if (!shell || !SHELLS.includes(shell as Shell)) {
    exitWithError(`unsupported shell "${shell}" (supported: ${SHELLS.join(', ')})`)
  }

  console.log(generate(shell, cmds))
}

const completionHelp = createHelp({
  name: 'completion',
  description: 'Generate shell auto-completion scripts',
  // Examples teach `dt` (the primary command); the generated script registers
  // completion for both `dt` and `devkits-cli`.
  usage: `${ALIAS} completion <bash|zsh|fish>`,
  examples: [
    { cmd: `${ALIAS} completion bash >> ~/.bashrc`, desc: 'Bash' },
    { cmd: `${ALIAS} completion zsh > "\${fpath[1]}/_devkits-cli"`, desc: 'Zsh' },
    { cmd: `${ALIAS} completion fish > ~/.config/fish/completions/${BIN}.fish`, desc: 'Fish' },
  ],
  extra: ['  Completion is generated from the command registry — new commands appear automatically.'],
})

export const completionCommand: Command = {
  name: 'completion',
  aliases: [],
  category: 'utility',
  description: 'Generate shell auto-completion scripts',
  // The registry is imported dynamically, at call time, so that this module can
  // be loaded by the registry without a static cycle.
  run: async (args) => {
    const { commands } = await import('../registry.js')
    completion(args, commands)
  },
  help: completionHelp,
}
