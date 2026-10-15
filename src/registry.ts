import { jwtCommand } from './commands/jwt.js'
import { hashCommand } from './commands/hash.js'
import { base64Command } from './commands/base64.js'
import { urlCommand } from './commands/url.js'
import { colorCommand } from './commands/color.js'
import { timestampCommand } from './commands/timestamp.js'
import { cronCommand } from './commands/cron.js'
import { completionCommand } from './commands/completion.js'
import type { Command } from './commands/types.js'

/**
 * The command registry — the single source of truth.
 *
 * Help output, interactive mode and shell-completion scripts all derive from
 * this array.
 *
 * This module lives in `src/` rather than in `src/commands/` on purpose: it
 * imports every command module, and `commands/completion.ts` needs to read the
 * registry at run time. Keeping the registry outside the commands directory
 * avoids an import cycle that would leave the array partially initialised.
 *
 * Adding a command? Read the admission checklist in CONTRIBUTING.md first:
 * every command must work offline, support `--json` and ship with tests.
 */
export const commands: Command[] = [
  jwtCommand,
  hashCommand,
  base64Command,
  urlCommand,
  colorCommand,
  timestampCommand,
  cronCommand,
  completionCommand,
]

export const findCommand = (name: string): Command | undefined => {
  return commands.find((cmd) => cmd.name === name || cmd.aliases.includes(name))
}
