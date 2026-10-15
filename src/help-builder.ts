import chalk from 'chalk'

interface HelpOptions {
  name: string
  description: string
  usage: string
  options?: { flags: string; desc: string }[]
  examples?: { cmd: string; desc?: string }[]
  extra?: string[]
}

/**
 * Generate a standardized help text block for a command.
 * Reduces boilerplate across all command help functions.
 */
export function createHelp(opts: HelpOptions): () => void {
  return () => {
    console.log(chalk.bold(`\n  ${opts.name} — ${opts.description}`))
    console.log(`  ${chalk.dim('─'.repeat(opts.name.length + 2))}`)
    console.log('')
    console.log(`  ${chalk.yellow('Usage:')}`)
    // A usage string may contain several lines; indent each of them.
    for (const line of opts.usage.split('\n')) {
      console.log(`    ${line.trim()}`)
    }
    console.log('')

    if (opts.options && opts.options.length > 0) {
      console.log(`  ${chalk.yellow('Options:')}`)
      for (const opt of opts.options) {
        console.log(`    ${chalk.green(opt.flags.padEnd(28))} ${chalk.dim(opt.desc)}`)
      }
      console.log('')
    }

    if (opts.examples && opts.examples.length > 0) {
      console.log(`  ${chalk.yellow('Examples:')}`)
      for (const ex of opts.examples) {
        if (ex.desc) {
          console.log(`    ${chalk.dim(ex.desc)}`)
          console.log(`    ${ex.cmd}`)
        } else {
          console.log(`    ${ex.cmd}`)
        }
      }
      console.log('')
    }

    if (opts.extra) {
      for (const line of opts.extra) {
        console.log(line)
      }
    }
  }
}
