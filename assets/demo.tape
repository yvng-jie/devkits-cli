Output assets/demo.gif
Set Width 800
Set Height 560
Set FontSize 14
Set Theme Dracula
Set TypingSpeed 50ms
Set Framerate 12
Set PlaybackSpeed 1.5

# 1. Categorized help — the whole toolset on one screen
Type "dt help"
Sleep 300ms
Enter
Sleep 3s
Ctrl+l

# 2. JWT — the flagship: decode a token without pasting it into a website
Type "dt jwt eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx"
Sleep 200ms
Enter
Sleep 2.5s
Ctrl+l

# 3. Hash + HMAC
Type "dt hash hello --algo sha256"
Sleep 200ms
Enter
Sleep 1.5s
Type "dt hash hello --key mysecret"
Sleep 200ms
Enter
Sleep 1.5s
Ctrl+l

# 4. Base64 — argument and pipe
Type "dt base64 encode hello world"
Sleep 200ms
Enter
Sleep 1s
Type "echo hello | dt base64 encode"
Sleep 200ms
Enter
Sleep 1.5s
Ctrl+l

# 5. Color
Type "dt color coral"
Sleep 200ms
Enter
Sleep 1.5s
Type "dt color '#ff7f50' --palette triadic --count 5"
Sleep 200ms
Enter
Sleep 2s
Ctrl+l

# 6. Timestamp + cron
Type "dt ts now --iso"
Sleep 200ms
Enter
Sleep 1s
Type "dt cron '*/15 * * * *' --next 3"
Sleep 200ms
Enter
Sleep 2s
Ctrl+l

# 7. JSON output is pipeable
Type "dt jwt eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9obiJ9.xxx --json"
Sleep 200ms
Enter
Sleep 2.5s
Ctrl+l

# 8. Interactive mode with search (jwt asks for a token, so search cron and quit)
Type "dt"
Sleep 200ms
Enter
Sleep 2s
Type "s"
Sleep 200ms
Enter
Sleep 500ms
Type "cron"
Sleep 100ms
Enter
Sleep 1.5s
Type "0"
Sleep 100ms
Enter
Sleep 1s