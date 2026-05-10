# Mobivis

```
 ███▄    █  ██▓  ▄████▄   ██▓     ██▓     ▒█████   ██▀███ ▓██   ██▓
 ██ ▀█   █  ▓██▒ ▒██▀ ▀█  ▓██▒    ▓██▒    ▒██▒  ██▒▓██ ▒ ██▒▒██  ██▒
▓██  ▀█ ██▒▒██▒  ▒▓█    ▄ ▒██░    ▒██░    ▒██░  ██▒▓██ ░▄█ ▒ ▒██ ██░
▓██▒  ▐▌██▒░██░  ▒▓▓▄ ▄██▒▒██░    ▒██░    ▒██   ██░▒██▀▀█▄   ░ ▐██▓░
▒██░   ▓██░░██░  ▒ ▓███▀ ░░██████▒░██████▒░ ████▓▒░░██▓ ▒██▒ ░ ██▒▓░
```

**Mobile-first code editor for agentic development**

Sync files from your computer to your phone in real-time. Review code, make edits, and stay productive on the go.

---

## Architecture

![Mobivis Architecture](./docs/architecture.excalidraw.png)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Mobile | React Native, Expo | UI and Monaco WebView |
| Editor | Monaco Editor | Code editing with syntax highlighting |
| Sync | WebSocket, Chokidar | Real-time file sync |
| Server | Node.js, ws | File watching and broadcasting |

---

## Features

- **Real-time sync** - Files update live as you work
- **Monaco Editor** - Full-featured code editing with syntax highlighting
- **File tree drawer** - Browse files via hamburger menu
- **Multiple tabs** - Edit several files simultaneously
- **Settings panel** - Customize theme, font size, word wrap, and more
- **50+ languages** - JavaScript, TypeScript, Python, Go, Rust, and more

---

## Quick Start

### 1. Start the server

```bash
cd server
npm install
node index.js
```

The server watches your current directory. To watch a specific folder:

```bash
SYNC_DIR=/path/to/project node index.js
```

### 2. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### 3. Connect

1. Find your computer's IP: `ipconfig getifaddr en0` (Mac)
2. Enter in the app: `ws://192.168.1.100:8080`
3. Tap **Connect**

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                      TYPICAL SETUP                           │
└──────────────────────────────────────────────────────────────┘

   YOUR MAC                           YOUR PHONE
   ┌─────────────┐                   ┌─────────────────┐
   │  Terminal   │                   │                 │
   │  ┌───────┐  │                   │   ┌─────────┐   │
   │  │Server │◄─┼──── WiFi ────────┼─► │  Mobivis │   │
   │  │       │  │                   │   │   App   │   │
   │  └───────┘  │                   │   └─────────┘   │
   │      │     │                   │        │        │
   │      ▼     │                   │        ▼        │
   │ ┌────────┐ │                   │  ┌──────────┐  │
   │ │chokidar│ │                   │  │  Monaco  │  │
   │ │watches │ │                   │  │  Editor  │  │
   │ │ files  │ │                   │  └──────────┘  │
   │ └────────┘ │                   │                 │
   └─────────────┘                   └─────────────────┘
```

---

## Usage

- **☰** - Open file tree drawer
- **Tap file** - Open in editor
- **Tap breadcrumb** - Jump to file in tree
- **× on tab** - Close file
- **⚙️** - Settings (theme, font size, etc.)

---

## Troubleshooting

**Can't connect?**
- Phone and computer on same WiFi
- Check firewall allows port 8080
- Verify IP address is correct

**Files not updating?**
- Restart server
- Disconnect and reconnect

**Editor not loading?**
- Requires internet (Monaco loads from CDN)

---

## Project Structure

```
mobivis/
├── server/                 # Desktop sync server
│   └── index.js           # WebSocket + file watcher
├── mobile/                 # React Native app
│   ├── App.js             # Main app
│   ├── src/
│   │   ├── components/
│   │   │   ├── MonacoEditor.tsx
│   │   │   └── FileTree.tsx
│   │   └── types/
│   │       └── index.ts
├── docs/                   # Architecture diagrams
└── AGENTS.md              # Agent guidelines
```

---

## WebSocket Protocol

**Server → Client:**
```json
{ "type": "tree", "files": [...] }
{ "type": "add", "path": "a/b.js", "content": "..." }
{ "type": "change", "path": "a/b.js" }
{ "type": "delete", "path": "a/b.js" }
```

**Client → Server:**
```json
{ "type": "read", "path": "a/b.js" }
{ "type": "write", "path": "a/b.js", "content": "..." }
```

---

## Security

- Never commit API keys or tokens
- Use environment variables for secrets
- Server runs locally on your network
- Files synced over WebSocket only

---

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes
4. Push to your fork
5. Open a Pull Request

---

## License

MIT