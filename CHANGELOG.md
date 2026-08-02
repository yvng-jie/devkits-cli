# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.2] - 2026-07-16

### Added
- README: document 8 previously undocumented commands (ascii, bytes, case, completion, cron, lorem, number, semver)

### Changed
- README: remove emoji for cleaner rendering
- IP geolocation API: switched from ip-api.com to ipinfo.io (better reliability)
- CI: typecheck and lint steps now use continue-on-error (non-blocking)
- .gitignore: add .DS_Store

### Fixed
- `ip` command: add `Accept: application/json` header for Node.js fetch compatibility

## [0.7.0] - 2026-08-02

### Added
- `dt regex` — regex tester with capture groups, named groups, flags, replacement preview, and `--json` output
- `dt fake` — fake data generator (names, emails, phones, IPs, UUIDs, companies, jobs & more) with `--count`, `--min`/`--max`, `--json`
- `dt text` — text statistics (words/chars/lines/bytes/unique words) & transformations (`--reverse`, `--truncate`, `--sort`, `--unique`, `--shuffle`, `--wrap`, `--slug`, `--freq`)
- `dt hash`: added md5, sha3-256/384/512, blake2b512, blake2s256, ripemd160, crc32 algorithms
- `dt hash --format` — hex (default), base64, base64url output formats
- `dt jwt encode` — create signed (HS256/384/512) or unsigned tokens from JSON or key=value payloads, with `--exp` expiry claim
- `dt bytes` — byte size converter (B, KB, MB, GB, TB, PB) with `--si` and `--to` flags (#8)
- `dt number` — number base converter between decimal, hex, binary, octal (#9)
- `dt ascii` — ASCII / character lookup table with `--range` and `--extended` flags (#10)
- `dt lorem` — Lorem ipsum placeholder text generator with `--paragraphs`, `--sentences`, `--words`, `--start` (#19)
- `dt cron` — cron expression parser & explainer with `--next` and `--validate` flags (#11)
- `dt completion` — shell auto-completion scripts for bash, zsh, fish (#12)
- `dt qrcode --ecc` — configurable error correction level (L/M/Q/H) (#13)
- `dt qrcode --size` — module size scaling (1-4) (#13)
- `dt qrcode --invert` — invert QR code colors for dark backgrounds (#13)
- `dt color --palette` — color palette generation (complementary, analogous, triadic, tetradic, monochromatic) (#15)
- `dt color --palette --count` — configurable palette color count (#15)
- `dt json query` — jq-like JSON path query with dot notation and array index support (#17)
- `dt csv select` — select specific columns by name (#18)
- `dt csv filter` — filter rows with comparison operators (>, <, >=, <=, ==, !=, contains, startswith) (#18)
- `dt csv sort` — sort rows by column with `--desc` flag (#18)
- `dt csv head` — show first N rows (#18)
- `dt csv stats` — per-column statistics (count, min, max, mean, sum, unique) (#18)
- Code coverage reporting with Codecov and `@vitest/coverage-v8` (#16)

### Changed
- Version bumped from 0.5.0 to 0.6.0

### Fixed
- `url` command: fixed stdin pipe support for single-action mode
- `url` command: added validation for invalid actions
- `math` command: `^` is now treated as exponentiation operator (`**`)
- `math` command: math functions (sqrt, abs, etc.) now correctly evaluate (#17)
- All 8 previously failing tests are now passing

## [0.5.0] - 2026-05-28

### Added
- `dt case` command — string case conversion (camel, pascal, snake, kebab, upper, lower, title)
- `dt case --to` flag for specific output format
- `dt color --lower` flag for lowercase hex output

### Changed
- Interactive mode: commands displayed in categorized groups with visual separators

## [0.4.0] - 2026-04-20

### Added
- `dt ip` command — IP geolocation lookup
- `dt image` command — image metadata reader (PNG, JPEG, GIF, WebP)
- `dt csv` command — CSV table formatter
- `dt diff` command — string/file comparison
- `dt mac` command — MAC address formatter/validator
- `dt math` command — expression evaluator
- `dt cidr` command — CIDR/IP calculator
- `dt url` command — URL encode/decode/parse
- `dt random` command — password generator & random numbers
- `dt qrcode` command — generate QR codes in the terminal
- `dt json` command — format, validate, and highlight JSON
- Interactive mode with categorized menu
- Search mode (s, /) in interactive mode
- Clipboard copy (C key) in interactive mode
- `--json` flag for machine-readable output
- Pipe support for all commands

### Changed
- Migrated from `yargs` to custom argument parser
- All commands now have interactive mode handlers
- Color command: RGBA/HSLA alpha support added
- Hash command: `--file` and `--key` (HMAC) support added
- JWT command: `--verify` for HMAC signature verification
- Timestamp command: `--timezone` flag added
- UUID command: `--version` flag for v1/v4/v7 support

## [0.3.1] - 2026-03-15

### Fixed
- Node 22+ compatibility (removed Node 20 from CI)

### Changed
- Renamed package to `devkits`
- Optimized project setup and build configuration

## [0.3.0] - 2026-03-10

### Added
- `--json` output flag for machine-readable results
- `dt help <cmd>` for command-specific help
- Interactive mode: number shortcuts, back navigation, expanded named colors
- Named color support in `dt color` (coral, steelblue, etc.)

## [0.2.0] - 2026-02-20

### Added
- `dt uuid` — UUID generation (v4)
- `dt hash` — SHA hash generation
- `dt base64` — Base64 encode/decode
- `dt color` — color converter (HEX/RGB/HSL)
- `dt jwt` — JWT token decoder
- `dt timestamp` — timestamp conversion

## [0.1.0] - 2026-02-01

### Added
- Initial CLI skeleton with help system
- Project setup with TypeScript, tsup, eslint
