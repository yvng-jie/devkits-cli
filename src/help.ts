import chalk from 'chalk'
import { version } from '../package.json'
import type { Command, CommandCategory } from './commands/types.js'

const HEADER = `
${chalk.bold.cyan('  \u2588\u25C0\u2584 \u2588\u2580\u2580 \u2588\u2591\u2588 \u2588\u2591\u2588 \u2580\u2588\u2580 \u2580\u2580\u2588\u2580 \u2588\u2580\u2580')}
${chalk.bold.cyan('  \u2588\u25C0\u2584 \u2588\u2588\u2580 \u2580\u2584\u2580 \u2588\u25C0\u2588 \u2591\u2588\u2591 \u2591\u2591\u2588\u2591 \u2584\u2588 ')}
${chalk.dim('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500')}
`

// ── Category registry (reused from interactive.ts) ────────────
interface CategoryInfo {
  label: string
  icon: string
}

const CATEGORIES: Record<CommandCategory, CategoryInfo> = {
  crypto: { label: 'Security & Crypto', icon: '\u{1F6E1}\uFE0F' },
  encoding: { label: 'Encoding', icon: '\u{1F524}' },
  utility: { label: 'Utilities', icon: '\u{1F9F0}' },
}

const CATEGORY_ORDER: CommandCategory[] = ['crypto', 'encoding', 'utility']

export function showHelp(cmds?: Command[]) {
  console.log(HEADER)
  console.log(`  ${chalk.bold('Developer tools that never leave your terminal.')}`)
  console.log('')
  console.log(`  ${chalk.yellow('Usage:')}`)
  console.log(`    dt ${chalk.dim('<command>')} ${chalk.dim('[options]')}   ${chalk.dim('(full name: devkits-cli)')}`)
  console.log('')
  console.log(`  ${chalk.yellow('Commands:')}`)

  if (cmds) {
    // Group by category
    const grouped = new Map<CommandCategory, Command[]>()
    for (const cat of CATEGORY_ORDER) grouped.set(cat, [])
    for (const cmd of cmds) {
      const group = grouped.get(cmd.category)
      if (group) group.push(cmd)
    }

    for (const cat of CATEGORY_ORDER) {
      const groupCmds = grouped.get(cat)
      if (!groupCmds || groupCmds.length === 0) continue
      const info = CATEGORIES[cat]
      console.log(`  ${chalk.bold(info.icon + '  ' + info.label)}`)
      for (const cmd of groupCmds) {
        const nameStr = cmd.aliases.length > 0 ? `${cmd.name} / ${cmd.aliases[0]}` : cmd.name
        console.log(`    ${chalk.green(nameStr.padEnd(22))} ${chalk.dim(cmd.description)}`)
      }
      console.log('')
    }
  }

  console.log(`  ${chalk.green('help')}        ${chalk.dim('Show this help')}`)
  console.log('')
  console.log(`  ${chalk.yellow('Examples:')}`)
  console.log(`    dt jwt "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx"`)
  console.log(`    dt jwt <token> --verify mysecret`)
  console.log(`    dt hash "hello" --algo sha256`)
  console.log(`    dt base64 encode "hello world"`)
  console.log(`    dt color "#ff7f50"`)
  console.log(`    dt ts 1716806400 --timezone Asia/Shanghai`)
  console.log(`    dt cron "*/15 * * * *"`)
  console.log(`    echo "hello" | dt base64 encode`)
  console.log('')
  console.log(`  ${chalk.dim('All commands work offline, read stdin, and support --json.')}`)
  console.log(`  ${chalk.dim('MIT License \u00B7 github.com/yvng-jie/devkits-cli')}`)
  console.log(`  ${chalk.dim('Run')} ${chalk.cyan('devkits-cli')} ${chalk.dim('with no args for interactive mode.')}`)
  console.log('')
}

export function showVersion() {
  console.log(`devkits-cli ${chalk.green('v' + version)} ${chalk.dim('(dt)')}`)
}
