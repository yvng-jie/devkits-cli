import { uuidCommand } from './uuid.js'
import { base64Command } from './base64.js'
import { colorCommand } from './color.js'
import { jwtCommand } from './jwt.js'
import { hashCommand } from './hash.js'
import { timestampCommand } from './timestamp.js'
import { jsonCommand } from './json.js'
import { qrcodeCommand } from './qrcode.js'
import { randomCommand } from './random.js'
import { urlCommand } from './url.js'
import { cidrCommand } from './cidr.js'
import { mathCommand } from './math.js'
import { macCommand } from './mac.js'
import { diffCommand } from './diff.js'
import { csvCommand } from './csv.js'
import { imageCommand } from './image.js'
import { ipCommand } from './ip.js'
import { caseCmd } from './case.js'
import { bytesCommand } from './bytes.js'
import { numberCommand } from './number.js'
import { asciiCommand } from './ascii.js'
import { loremCommand } from './lorem.js'
import { cronCommand } from './cron.js'
import { completionCommand } from './completion.js'
import { semverCommand } from './semver.js'
import { regexCommand } from './regex.js'
import { fakeCommand } from './fake.js'
import { textCommand } from './text.js'
import type { Command } from './types.js'

export const commands: Command[] = [
  uuidCommand,
  base64Command,
  colorCommand,
  jwtCommand,
  hashCommand,
  timestampCommand,
  jsonCommand,
  qrcodeCommand,
  randomCommand,
  urlCommand,
  cidrCommand,
  mathCommand,
  macCommand,
  diffCommand,
  csvCommand,
  imageCommand,
  ipCommand,
  caseCmd,
  bytesCommand,
  numberCommand,
  asciiCommand,
  loremCommand,
  cronCommand,
  completionCommand,
  semverCommand,
  regexCommand,
  fakeCommand,
  textCommand,
]

// export function findCommand(name: string): Command | undefined {
//   return commands.find((cmd) => cmd.name === name || cmd.aliases.includes(name))
// }

export const findCommand = (name: string): Command | undefined => {
  return commands.find((cmd) => cmd.name === name || cmd.aliases.includes(name))
}
