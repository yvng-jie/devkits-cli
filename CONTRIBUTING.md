# Contributing

Thanks for considering contributing to `devkits-cli`! 🎉

## Getting Started

```bash
git clone https://github.com/yvng-jie/devkits-cli.git
cd devkits-cli
pnpm install
pnpm build            # Build dist/ (required before running the CLI)
npm link              # Make `devkits-cli` available globally (optional)
```

## Development

```bash
pnpm dev <command>     # Run in dev mode (e.g. pnpm dev jwt)
pnpm build             # Build for production → dist/
pnpm test              # Run tests (vitest)
pnpm lint              # Check code style (ESLint)
pnpm typecheck         # TypeScript type check
```

## Project Structure

```
src/
  index.ts               — CLI entry point (router)
  interactive.ts         — Interactive mode
  help.ts                — Help & version output
  help-builder.ts        — Shared help-text template
  parse-flags.ts         — Flag parsing helpers
  interactive-utils.ts   — Interactive prompt helpers
  utils.ts               — Shared utilities (readStdinSync, copyToClipboard)
  errors.ts              — ExitError class & exit helpers
  data/
    named-colors.ts      — 148 CSS named colors
  commands/
    types.ts             — Command interface
    index.ts             — Command registry (single source of truth)
    jwt.ts               — JWT decode / verify / encode
    hash.ts              — Hashes & HMAC
    base64.ts            — Base64 encode/decode
    url.ts               — URL encode/decode/parse
    color.ts             — Color conversion & palettes
    timestamp.ts         — Unix timestamp conversion
    cron.ts              — Cron parsing & description
    completion.ts        — Shell completion generation
    __tests__/           — Unit tests
```

## Architecture — Command Registry Pattern

Every command is defined by a `Command` object:

```typescript
// src/commands/types.ts
export type CommandCategory = 'crypto' | 'encoding' | 'utility'

export interface Command {
  name: string
  aliases: string[] // e.g. ['ts'] for timestamp
  category: CommandCategory // groups the command in help & interactive mode
  description: string // Shown in `devkits-cli help`
  run: (args: string[]) => void | Promise<void>
  help: () => void
  interactive?: (rl: Interface) => Promise<void>
}
```

Commands are registered in `src/commands/index.ts`. The router (`src/index.ts`), help output,
interactive mode and **shell completion** all derive from that array — no switch-cases to edit.

## Command Admission Checklist

This project deliberately stays small. Adding a command is possible, but it must earn its place.
A command is only accepted if **all** of the following are true:

- [ ] **It works fully offline.** No network calls, ever. This is the project's entire premise.
- [ ] **It does not duplicate a tool that already ships with the OS** (`jq`, `uuidgen`, `date`,
      `shasum`, `bc`, `diff`, `base64`, `openssl`, …) unless it is meaningfully better *for a
      privacy-sensitive workflow*.
- [ ] **It reads piped stdin** when no positional argument is given (`readStdinSync()`).
- [ ] **It supports `--json`** with a stable, documented shape.
- [ ] **It ships with unit tests.**
- [ ] **The PR description explains why the existing alternatives are insufficient** — "it would
      be convenient" is not enough.

If a command does not clear this bar, it will be declined. Removed commands are not lost: the
pre-1.0.0 full set is preserved at the `legacy/v0.7.0-28cmds` git tag.

## How to Add a New Command

This step-by-step guide walks you through adding a hypothetical `echo` command.

### Step 1 — Create the command file

Create `src/commands/echo.ts`:

```typescript
import { createHelp } from '../help-builder.js'
import { exitWithError } from '../errors.js'
import { readStdinSync } from '../utils.js'
import type { Command } from './types.js'

export function echo(args: string[]) {
  const jsonMode = args.includes('--json')
  const filteredArgs = args.filter((a) => a !== '--json')

  const input = filteredArgs.join(' ') || readStdinSync()
  if (!input) {
    exitWithError('no input provided')
  }

  if (jsonMode) {
    console.log(JSON.stringify({ input }))
    return
  }

  console.log(input)
}

const echoHelp = createHelp({
  name: 'echo',
  description: 'Echo back the input text',
  usage: 'devkits-cli echo <text>',
  examples: [{ cmd: 'devkits-cli echo "hello world"' }, { cmd: 'echo "hello" | devkits-cli echo' }],
})

export const echoCommand: Command = {
  name: 'echo',
  aliases: [],
  category: 'utility',
  description: 'Echo back the input text',
  run: echo,
  help: echoHelp,
}
```

**Key rules:**

- Export both the run function (`echo`) and the command object (`echoCommand`)
- The run function is exported separately so tests can call it directly
- Use `createHelp()` from `help-builder.ts` instead of hand-writing help output
- Use `exitWithError()` for errors, never `process.exit()`
- Always use `.js` extension for imports (ESM)
- Use `chalk` for colored output, never raw ANSI codes

### Step 2 — Register in the registry

Open `src/commands/index.ts` and add your command to the array:

```typescript
import { echoCommand } from './echo.js'

export const commands: Command[] = [
  jwtCommand,
  hashCommand,
  base64Command,
  urlCommand,
  colorCommand,
  timestampCommand,
  cronCommand,
  completionCommand,
  echoCommand, // <-- add here
]
```

That's it! The command will now appear in:

- `devkits-cli help` — listed automatically under its category
- `devkits-cli echo` — runs the command
- `devkits-cli echo --help` — shows help
- Interactive mode — appears in the menu
- Shell completion — included in generated scripts

If your command has flags, add their metadata to the `FLAGS` map in `src/commands/completion.ts`
so they get completed too.

### Step 3 — Add tests

Create `src/commands/__tests__/echo.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { echo } from '../echo.js'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('echo', () => {
  it('should echo input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    echo(['hello world'])
    expect(spy).toHaveBeenCalledWith('hello world')
  })

  it('should support --json output', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    echo(['hello', '--json'])
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ input: 'hello' }))
  })
})
```

### Step 4 — Test and submit

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Submit a PR! 🎉

## Pull Request Checklist

- [ ] Command clears the [admission checklist](#command-admission-checklist) above
- [ ] Code compiles (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] TypeScript checks pass (`pnpm typecheck`)
- [ ] New functionality includes tests
- [ ] Command is registered in `src/commands/index.ts`
- [ ] Flag metadata added to `FLAGS` in `src/commands/completion.ts` (if it has flags)

## Code Style Notes

- **No new runtime dependencies** — only `chalk` is allowed. Everything else uses Node.js built-in APIs
- **Never add a network call** — offline operation is the product's core promise
- **ESM only** — all imports must use the `.js` extension (e.g. `import { foo } from './bar.js'`)
- **Error handling** — throw `ExitError` or use `exitWithError()`, never call `process.exit()`
- **`--json` support** — all commands must support `--json` for machine-readable output
- **Pipe support** — accept input from `stdin` via `readStdinSync()` when no argument is provided
- **Interactive mode** — if your command has custom prompts, add a handler in `src/interactive.ts`

## Reporting Issues

Open an issue at https://github.com/yvng-jie/devkits-cli/issues
