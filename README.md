<p align="center">
  <img src="https://img.shields.io/npm/v/devkits?color=blue&label=version" alt="npm version">
  <img src="https://img.shields.io/github/actions/workflow/status/yvng-jie/devtools-cli/ci.yml?branch=main" alt="CI">
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node version">
  <img src="https://codecov.io/gh/yvng-jie/devtools-cli/branch/main/graph/badge.svg" alt="codecov">
  <img src="https://img.shields.io/npm/l/devkits" alt="License">
  <img src="https://img.shields.io/github/stars/yvng-jie/devtools-cli?style=flat" alt="Stars">
</p>

<h1 align="center">dt — Developer Toolkit</h1>
<p align="center">
  <b>Terminal Swiss Army Knife</b><br>
  UUID · Base64 · Color Converter · JWT Decoder · SHA Hash · JSON · QR Code · Password Generator · CIDR · MAC · Image Metadata — all in one command.
</p>

<p align="center">
  <i>No more leaving your terminal to copy-paste into online tools.</i>
</p>

<p align="center">
  <img src="./assets/demo.gif" alt="dt demo" width="700">
</p>

---

## Features

<table>
<tr>
<td><b>Zero setup</b></td>
<td>Install once, use anywhere with the <code>dt</code> command</td>
</tr>
<tr>
<td><b>Interactive mode</b></td>
<td>Run <code>dt</code> with no args for a categorized menu — great for beginners</td>
</tr>
<tr>
<td><b>Search mode</b></td>
<td>Press <code>s</code> or <code>/</code> in interactive mode to search commands by name, alias, or description</td>
</tr>
<tr>
<td><b>Number shortcuts</b></td>
<td>Select commands by number in interactive mode; also supports command names and aliases directly</td>
</tr>
<tr>
<td><b>Pipe friendly</b></td>
<td><code>echo "hello" | dt base64 encode</code> — works with Unix pipelines</td>
</tr>
<tr>
<td><b>JSON output</b></td>
<td>Add <code>--json</code> for machine-readable output, pipeable to <code>jq</code></td>
</tr>
<tr>
<td><b>Clipboard copy</b></td>
<td>Press <code>C</code> in interactive mode to copy results to clipboard</td>
</tr>
<tr>
<td><b>Beautiful output</b></td>
<td>Colorful, well-formatted results with chalk and categorized display</td>
</tr>
<tr>
<td><b>Minimal deps</b></td>
<td>Only depends on <code>chalk</code> and <code>qrcode</code> — everything else uses Node.js built-in APIs</td>
</tr>
</table>

## Install

```bash
# Install globally
npm install -g devkits

# Or use directly without installing
npx devkits
```

## Usage

```
dt <command> [options]
```

Run without arguments for interactive mode:

```bash
dt
```

Get help for any command:

```bash
dt help               # Show main help (grouped by category)
dt help uuid          # Show help for a specific command
dt uuid --help        # Same as above
```

### Commands (by category)

#### Security & Crypto

| Command | Alias | Description                                                           |
| ------- | ----- | --------------------------------------------------------------------- |
| `jwt`   | —     | Decode or encode JWT tokens with expiry detection & HMAC verification |
| `hash`  | —     | Generate hashes (SHA family, MD5, BLAKE2, CRC32) & HMAC               |

#### Encoding

| Command  | Alias | Description                                   |
| -------- | ----- | --------------------------------------------- |
| `base64` | —     | Encode or decode Base64 (standard & URL-safe) |
| `url`    | —     | Encode, decode, or parse URLs & query strings |

#### Network

| Command | Alias | Description                                                      |
| ------- | ----- | ---------------------------------------------------------------- |
| `cidr`  | —     | CIDR/IP calculator (network, broadcast, subnet mask, host range) |
| `mac`   | —     | Format and validate MAC addresses (colon/hyphen/dot/cisco/unix)  |
| `ip`    | —     | Look up IP address information & geolocation                     |

#### Data Processing

| Command | Alias | Description                          |
| ------- | ----- | ------------------------------------ |
| `json`  | —     | Format, validate, and highlight JSON |
| `diff`  | —     | Compare two strings or files         |
| `csv`   | —     | Format and view CSV data             |
| `ascii` | —     | ASCII / character lookup table       |
| `case`  | —     | Convert strings between casing formats |
| `regex` | —     | Test regex patterns & show matches with capture groups |
| `text`  | —     | Text stats & transformations (wc, reverse, slug, word frequency) |

#### Utilities

| Command     | Alias  | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `uuid`      | —      | Generate UUIDs (v1/v4/v7)                      |
| `color`     | —      | Convert colors (HEX / RGB(A) / HSL(A) / named) |
| `timestamp` | `ts`   | Convert between Unix timestamps and dates      |
| `qrcode`    | `qr`   | Generate QR codes in the terminal              |
| `random`    | `rand` | Generate passwords & random numbers            |
| `bytes`     | —      | Convert byte sizes (B, KB, MB, GB, TB, PB)     |
| `completion`| —      | Generate shell auto-completion scripts         |
| `cron`      | —      | Parse and describe cron expressions            |
| `lorem`     | —      | Generate Lorem ipsum placeholder text          |
| `semver`    | `sv`   | Parse, validate, compare, and bump semver      |
| `fake`      | —      | Generate fake data (names, emails, IPs, companies & more) |

#### Mathematics

| Command  | Alias  | Description                                    |
| -------- | ------ | ---------------------------------------------- |
| `math`   | —      | Evaluate mathematical expressions              |
| `number` | `num`  | Convert between decimal, hex, binary, octal    |

#### Media

| Command | Alias | Description                                     |
| ------- | ----- | ----------------------------------------------- |
| `image` | —     | Show image file metadata (PNG, JPEG, GIF, WebP) |

> All commands support `--json` for structured JSON output.

### Examples

#### Base64

```bash
dt base64 encode "hello world"
dt base64 decode "aGVsbG8gd29ybGQ="
echo "hello" | dt base64 encode
dt base64 encode "hello" --json # → {"action":"encode","input":"hello","output":"aGVsbG8="}
dt base64 encode "hello" --url  # URL-safe (no padding)
```

#### Color Converter

```bash
dt color "#ff7f50"
dt color "rgb(255, 127, 80)"
dt color "hsl(16, 100%, 66%)"
dt color coral
dt color coral --json           # → {"hex":"#FF7F50","rgb":"rgb(255,127,80)","hsl":"hsl(16,100%,66%)"}
dt color "#ff7f5080"             # RGBA with alpha
```

#### JWT

```bash
dt jwt "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx"
dt jwt <token> --json           # → {"header":{...},"payload":{...},"expired":true/false}
dt jwt <token> --verify secret  # Verify HMAC signature
dt jwt encode '{"name":"John"}' --secret mysecret   # Create a signed token
dt jwt encode name=John role=admin --exp 3600         # key=value payload + expiry
dt jwt encode '{"sub":"123"}' --no-sign             # Unsigned token
```

#### Hash

```bash
dt hash "hello"
dt hash "hello" --algo sha512
dt hash "hello" -a sha512       # Same as --algo sha512
dt hash "hello" --algo md5
dt hash "hello" --algo crc32
dt hash "hello" --algo sha3-256 --format base64
echo "hello" | dt hash
dt hash "hello" --json          # → {"algorithm":"SHA256","input":"hello","hash":"2cf2..."}
dt hash --file config.json       # Hash file contents
dt hash "hello" --key secret     # HMAC-SHA256
```

#### Timestamp / ts

```bash
dt ts                         # Current timestamp
dt ts 1716806400              # Timestamp → readable date
dt ts "2026-05-28"            # Date → timestamp
dt ts 1716806400 --utc        # UTC time
dt ts 1716806400 --iso        # ISO 8601 format
dt ts now --json              # → {"unix":...,"iso":"...","local":"...","utc":"..."}
echo 1716806400 | dt ts       # Pipe input
dt ts now --timezone Asia/Shanghai  # Show time in specific timezone
```

#### JSON

```bash
dt json '{"a":1,"b":{"c":2}}'
echo '{"a":1}' | dt json
dt json '{"a":1}' --minify   # {"a":1}
dt json "invalid" --validate # Check validity
```

#### QR Code

```bash
dt qrcode "https://example.com"
echo "hello" | dt qrcode
```

#### Random

```bash
dt random password                    # 16-char password
dt random password -l 32 --no-symbols # 32-char alphanumeric
dt random number --min 1 --max 10     # Random integer
dt random password -c 5               # 5 passwords at once
```

#### Regex

```bash
dt regex "\\d+" "order 42 item 7" --flags g   # Show all matches
dt regex "(\\w+)@(\\w+)" "a@b.com c@d.io"   # Capture groups
dt regex "\\s+" "a  b   c" --replace "-"     # Preview replacement
echo "abc123" | dt regex "[a-z]+" --flags g --json
```

#### Text

```bash
dt text "hello world"              # Stats: words, chars, lines, bytes…
cat file.txt | dt text             # wc-style counting via pipe
dt text "My Project Name" --slug   # → my-project-name
dt text "hello world" --reverse    # → dlrow olleh
dt text "foo bar foo" --freq       # Word frequency table
dt text "b\na\nc" --sort --unique   # Line operations
```

#### Fake Data

```bash
dt fake name                        # Random full name
dt fake email                       # Random email address
dt fake -c 5 ip                     # 5 random IPs
dt fake integer --min 1 --max 10    # Random integer
dt fake password --json             # JSON output
```

#### URL

```bash
dt url encode "hello world"           # → hello%20world
dt url decode "hello%20world"         # → hello world
dt url parse "?foo=1&bar=2"           # Parse query string
echo "hello world" | dt url encode
```

#### CIDR

```bash
dt cidr 192.168.1.0/24          # Show network info
dt cidr 10.0.0.0/8             # Class A network
```

#### Math

```bash
dt math "sqrt(16) * 3"          # 12
dt math "2^10"                  # 1024
dt math "sin(PI/2)"             # 1
dt math "100 / 3" --precision 4 # 33.3333
```

#### MAC Address

```bash
dt mac aa:bb:cc:dd:ee:ff
dt mac AA-BB-CC-DD-EE-FF        # Auto-detects format
dt mac aabb.ccdd.eeff            # Also valid
```

#### Diff

```bash
dt diff "abc" "abd"
dt diff --file old.txt new.txt
```

#### CSV

```bash
echo "a,b,c\n1,2,3" | dt csv
dt csv "name,age\nAlice,30"
```

#### Image

```bash
dt image screenshot.png          # Show PNG metadata
dt image photo.jpg               # Show JPEG metadata
```

#### IP

```bash
dt ip                           # Your public IP & location
dt ip 8.8.8.8                   # Look up a specific IP
```

## Development

```bash
git clone https://github.com/yvng-jie/devtools-cli.git
cd devtools-cli
pnpm install

pnpm dev <command>   # Run in dev mode (e.g. pnpm dev uuid)
pnpm build           # Production build → dist/
pnpm test            # Run tests (vitest)
pnpm lint            # Check code style
pnpm typecheck       # TypeScript type check
```

## Contributing

PRs and issues are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [yvng-jie](https://github.com/yvng-jie)
