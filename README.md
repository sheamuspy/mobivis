# Mobivis

```
████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     
╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     
   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     
   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     
   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                                                
██╗  ██╗██╗   ██╗███╗   ██╗ ██████╗ ███████╗██████╗ ██╗      █████╗ 
██║  ██║██║   ██║████╗  ██║██╔════╝ ██╔════╝██╔══██╗██║     ██╔══██╗
███████║██║   ██║██╔██╗ ██║██║  ███╗█████╗  ██████╔╝██║     ███████║
██╔══██║██║   ██║██║╚██╗██║██║   ██║██╔══╝  ██╔═══╝ ██║     ██╔══██║
██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████╗██║     ███████╗██║  ██║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
```

**Mobile-first code editor for agentic development**

Sync files from your computer to your phone in real-time. Review code, make edits, and stay productive on the go. Built for developers who want to keep building while away from their desk.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MOBIVIS ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
   │   COMPUTER    │         │   INTERNET   │         │    PHONE     │
   │              │         │              │         │              │
   │  ┌────────┐  │         │              │         │  ┌────────┐  │
   │  │ Server │◄─┼─────────┼──────────────┼─────────┼─►│  App   │  │
   │  │  (WS)  │  │  WebSocket              │         │  │(Expo)  │  │
   │  └────────┘  │         │              │         │  └────────┘  │
   │      │      │         │              │         │      │      │
   │      ▼      │         │              │         │      ▼      │
   │  ┌────────┐  │         │              │         │  ┌────────┐  │
   │  │chokidar│  │         │              │         │  │ File   │  │
   │  │(watch)│  │         │              │         │  │  Tree  │  │
   │  └────────┘  │         │              │         │  └────────┘  │
   │      │      │         │              │         │      │      │
   │      ▼      │         │              │         │      ▼      │
   │  ┌────────┐  │         │              │         │  ┌────────┐  │
   │  │  File  │  │         │              │         │  │Monaco  │  │
   │  │ System │  │         │              │         │  │ Editor │  │
   │  └────────┘  │         │              │         │  │(WebView)│  │
   └──────────────┘         │              │         └──────────────┘
                            └──────────────┘

   ┌─────────────────────┐         ┌─────────────────────┐
   │      SERVER         │         │      MOBILE         │
   │                     │         │                     │
   │  • File watching    │◄───────►│  • Real-time sync   │
   │  • WS broadcasting │         │  • Monaco editor    │
   │  • Read/write ops   │         │  • Resizable sidebar│
   │  • Tree building    │         │  • Tabbed files     │
   │                     │         │  • Syntax highlight │
   └─────────────────────┘         └─────────────────────┘
```

---

## Features

- **Real-time sync** - Files update live as you work
- **Monaco Editor** - Full-featured code editing with syntax highlighting
- **File tree** - Browse and navigate project structure
- **Multiple tabs** - Edit several files simultaneously
- **Resizable sidebar** - Drag to adjust layout
- **Settings panel** - Customize editor preferences
- **50+ languages** - JavaScript, TypeScript, Python, Go, Rust, and more

---

## Quick Start

### Prerequisites

- Node.js 18+
- Xcode (for iOS development) or Android Studio (for Android)
- Expo Go app on your phone (free from App Store / Play Store)

### 1. Start the server on your computer

```bash
cd mobivis/server
npm install  # first time only
node index.js
```

The server will start on `ws://localhost:8080` and begin watching your current directory.

To watch a specific project:

```bash
SYNC_DIR=/path/to/your/project node index.js
```

### 2. Run the mobile app

```bash
cd mobivis/mobile
npm install  # first time only
npx expo start
```

Scan the QR code with Expo Go on your phone.

### 3. Connect

1. Find your computer's IP address:
   - Mac: `ipconfig getifaddr en0`
   - Or check your network settings

2. In the app, enter your server URL:
   ```
   ws://192.168.1.100:8080
   ```
   (Replace with your actual IP address)

3. Tap **Connect**

You should see your files appear in the explorer!

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                      TYPICAL SETUP                            │
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
   │ │ chokidar│ │                   │  │  Monaco  │  │
   │ │ watches │ │                   │  │  Editor  │  │
   │ │  files  │ │                   │  └──────────┘  │
   │ └────────┘ │                   │                 │
   └─────────────┘                   └─────────────────┘

   Port: 8080                        Connect button
   Watches: cwd                      Enter: ws://IP:8080
```

### Server (your Mac)
- Uses `chokidar` to watch files for changes
- Broadcasts updates to all connected clients via WebSocket
- Handles file read/write requests

### App (your phone)
- Connects to server via WebSocket
- Receives file tree and syncs changes in real-time
- Monaco Editor runs in WebView for full code editing

---

## Usage Tips

### On Your Phone
- **Tap a file** to open it in the editor
- **Tap a folder** to expand/collapse
- **Drag the resize handle** (right edge of sidebar) to adjust width
- **Tap × on tab** to close a file
- **Tap ⚙️** for settings

### On Your Computer
- Server auto-syncs when you edit, create, or delete files
- Changes broadcast to all connected phones instantly
- Run `SYNC_DIR` env var to sync any directory

---

## Troubleshooting

**Can't connect?**
- Make sure your phone and computer are on the same WiFi network
- Check that port 8080 is not blocked by firewall
- Verify the IP address is correct

**Files not updating?**
- Restart the server
- Disconnect and reconnect in the app

**Editor not loading?**
- Check your internet connection (Monaco loads from CDN)
- Try refreshing the app

Or watch a specific directory:

```bash
SYNC_DIR=/path/to/project node index.js
```

### 2. Run the app

```bash
cd mobivis/mobile
npx expo start
```

Scan the QR code with Expo Go on your phone.

### 3. Connect

Enter your computer's IP address in the app (e.g., `ws://192.168.1.100:8080`) and tap **Connect**.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native, Expo |
| Editor | Monaco Editor (via WebView) |
| Sync | WebSocket, Chokidar |
| Server | Node.js, ws |

---

## Project Structure

```
mobivis/
├── server/                 # Desktop sync server
│   └── index.js           # WebSocket + file watcher
├── mobile/                 # React Native app
│   ├── App.js             # Main app component
│   └── src/
│       ├── components/
│       │   ├── MonacoEditor.tsx   # Monaco WebView wrapper
│       │   └── FileTree.tsx       # File tree component
│       ├── types/
│       │   └── index.ts           # TypeScript definitions
│       └── utils/
└── vscode_clone/          # Forked for UI inspiration
```

---

## WebSocket Protocol

### Server → Client

```json
{ "type": "tree", "files": [...] }           // Initial file tree
{ "type": "add", "path": "a/b.js" }          // New file added
{ "type": "change", "path": "a/b.js" }       // File changed
{ "type": "delete", "path": "a/b.js" }        // File deleted
```

### Client → Server

```json
{ "type": "read", "path": "a/b.js" }        // Request file content
{ "type": "write", "path": "a/b.js", "content": "..." }  // Save changes
```

---

## Security

- Never commit API keys or tokens
- Use environment variables for secrets
- The server runs locally on your network
- Files are synced over WebSocket only to connected clients

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT
