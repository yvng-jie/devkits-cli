<p align="center">
  <img src="https://img.shields.io/npm/v/devkits-cli?color=blue&label=version" alt="npm version">
  <img src="https://img.shields.io/github/actions/workflow/status/yvng-jie/devkits-cli/ci.yml?branch=main" alt="CI">
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node version">
  <img src="https://img.shields.io/npm/l/devkits-cli" alt="License">
  <img src="https://img.shields.io/github/stars/yvng-jie/devkits-cli?style=flat" alt="Stars">
</p>

<h1 align="center">devkits-cli</h1>

<p align="center">
  <b>Developer tools that never leave your terminal.</b><br>
  Decode a JWT, compute a hash, convert Base64 or a color — without pasting production
  secrets, tokens or customer data into a random website.
</p>

<p align="center">
  <i>No network calls. No telemetry. No account. Pipe-friendly, <code>--json</code> everywhere.</i>
</p>

<p align="center">
  <img src="./assets/demo.gif" alt="devkits-cli demo" width="700">
</p>

---

## Why this exists

Most "swiss army knife" CLIs compete with `jq`, `uuidgen`, `date`, `shasum` and `openssl`
on features — and lose, because those tools ship with your OS.

`devkits-cli` competes on **where your data goes**. When you paste a production JWT into an
online decoder, you have just handed your auth payload to a stranger's server. Every command here
runs locally, reads from stdin, and writes machine-readable JSON.

| | Online tool | `devkits-cli` |
| --- | --- | --- |
| Your token leaves the machine | Yes | **Never** |
| Works on an air-gapped host | No | **Yes** |
| Scriptable / pipeable | No | **Yes** |
| Works with no internet | No | **Yes** |

## Install

```bash
npm install -g devkits-cli
```

The package is `devkits-cli`; the command you type is **`dt`**.

```bash
dt jwt "<token>"
dt hash "hello" --algo sha256
```

Both names are installed, so `devkits-cli jwt ...` works identically — `dt` is just shorter.
Without installing:

```bash
npx devkits-cli jwt "<token>"
```

### Shell completion

```bash
dt completion bash >> ~/.bashrc
dt completion zsh  > "${fpath[1]}/_devkits-cli"
dt completion fish > ~/.config/fish/completions/devkits-cli.fish
```

Completion covers both `dt` and `devkits-cli`.

## Commands

Run `dt` with no arguments for an interactive menu, or `dt help <command>`.

### 🔐 Security & Crypto

| Command | What it does |
| --- | --- |
| `jwt` | Decode, **verify** or encode JWT tokens — expiry detection, `alg:none` detection, HMAC signing |
| `hash` | Hashes & HMAC — SHA-1/256/384/512, SHA-3, MD5, BLAKE2, RIPEMD-160, CRC32 |

### 🔤 Encoding

| Command | What it does |
| --- | --- |
| `base64` | Encode/decode Base64, including URL-safe variant |
| `url` | Encode, decode or parse URLs and query strings |

### 🧰 Utilities

| Command | What it does |
| --- | --- |
| `color` | Convert HEX / RGB(A) / HSL(A) / named colors, generate palettes |
| `timestamp` (`ts`) | Convert between Unix timestamps and dates, with timezone support |
| `cron` | Parse and describe cron expressions, list next run times |
| `completion` | Generate shell completion scripts |

All commands support `--json`, read piped stdin, and work offline.

## Examples

```bash
# JWT — decode locally, verify a signature, create a token
dt jwt "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx"
dt jwt "<token>" --verify mysecret
dt jwt encode '{"name":"John"}' --secret mysecret
echo "<token>" | dt jwt --json | jq .payload

# Hash & HMAC
dt hash "hello" --algo sha256
dt hash --file config.json
dt hash "hello" --key mysecret
cat file.bin | dt hash --algo blake2b512

# Base64 & URL
dt base64 encode "hello world"
dt base64 encode "hello" --url
echo "hello%20world" | dt url decode

# Color
dt color coral
dt color "#ff7f50" --palette triadic --count 5

# Time & cron
dt ts 1716806400 --timezone Asia/Shanghai
dt ts now --iso
dt cron "*/15 * * * *" --next 5
dt cron "@daily"
```

## Migrating from `devkits`

`devkits` (≤ 0.7.1) has been renamed to **`devkits-cli`** and is now deprecated.

```bash
npm uninstall -g devkits
npm install -g devkits-cli
```

The `dt` command name is unchanged, so existing scripts keep working.

**1.0.0 removed 20 commands** that duplicated tools you already have (`jq`, `uuidgen`, `date`,
`shasum`, `bc`, `exiftool`, …). If you relied on one of them, the full 28-command version
remains available at the `legacy/v0.7.0-28cmds` git tag, and `devkits@0.7.1` is still installable.

## Development

```bash
git clone https://github.com/yvng-jie/devkits-cli.git
cd devkits-cli
pnpm install

pnpm dev <command>   # run in dev mode, e.g. pnpm dev jwt
pnpm test            # vitest
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm build           # production build → dist/
```

## Contributing

PRs and issues are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md), including the
[command admission checklist](CONTRIBUTING.md#command-admission-checklist).

## License

MIT © [yvng-jie](https://github.com/yvng-jie)
