import { showHelp, showVersion } from './help.js'
import { commands, findCommand } from './commands/index.js'
import { interactive } from './interactive.js'
import { ExitError } from './errors.js'

async function main() {
  const rawArgs = process.argv.slice(2)
  const cmd = rawArgs[0]
  const args = rawArgs.slice(1)

  // No args → interactive mode
  if (cmd === undefined) {
    await interactive()
    return
  }

  // Global help / version
  if (cmd === '--help' || cmd === '-h') {
    showHelp(commands)
    return
  }
  if (cmd === '--version' || cmd === '-v') {
    showVersion()
    return
  }

  // Handle `help` subcommand: dt help <cmd> or dt help
  if (cmd === 'help') {
    if (args[0]) {
      const found = findCommand(args[0])
      if (found) {
        found.help()
        return
      }
    }
    showHelp(commands)
    return
  }

  // Find and run the command
  const found = findCommand(cmd)
  if (found) {
    // Intercept --help/-h and show command-specific help
    if (args.includes('--help') || args.includes('-h')) {
      found.help()
      return
    }
    await found.run(args)
    return
  }

  throw new ExitError(`Unknown command: ${cmd}\n  Run 'dt help' for available commands.`)
}

main().catch((err) => {
  if (err instanceof ExitError) {
    // Command-level errors already printed their own message via exitWithError();
    // the router-level error (unknown command) still needs to be shown here.
    if (!/^Error:/.test(err.message)) {
      console.log(`\n  ${err.message}\n`)
    }
    process.exit(1)
  }
  console.error('Fatal error:', err)
  process.exit(1)
})
