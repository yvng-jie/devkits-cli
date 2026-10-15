import type { Interface } from 'node:readline'

export type CommandCategory = 'crypto' | 'encoding' | 'utility'

export interface Command {
  name: string
  aliases: string[]
  category: CommandCategory
  description: string
  run: (args: string[]) => void | Promise<void>
  help: () => void
  /** Interactive mode handler (optional). Receives a readline interface for prompts. */
  interactive?: (rl: Interface) => Promise<void>
}
