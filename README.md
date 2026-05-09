# MobiVis

Real-time code change visualiser for mobile. Watch file edits on your laptop appear instantly on your phone. 🚀

---

## Prerequisites

- **Laptop:** Node.js 18+ and npm
- **Phone:** [Expo Go](https://expo.dev/go) installed (iOS App Store or Google Play)
- Both devices on the **same Wi-Fi network**

---

## 1. Server (laptop)

The server watches a directory and streams file diffs to your phone over WebSocket.

```bash
cd mobivis/server
npm install
```

### Start watching a project

```bash
npm run dev /path/to/your/project
```

Or omit the path to watch the current directory:

```bash
npm run dev
```

On startup you'll see:

```
  ┌─────────────────────────────────────┐
  │         MobiVis Server ready         │
  ├─────────────────────────────────────┤
  │  Watching  /path/to/your/project     │
  │  Local IP  192.168.x.x               │
  │  WS URL    ws://192.168.x.x:4747     │
  └─────────────────────────────────────┘

  Enter this URL in Expo Go → MobiVis:
  ws://192.168.x.x:4747
```

Keep this terminal open. **Copy the `ws://` URL** — you'll need it in the next step.

---

## 2. Mobile app (phone)

Install dependencies:

```bash
cd mobivis/mobile
npm install --legacy-peer-deps
```

There are two ways to run the app on your phone:

---

### Option A — Expo Go (quickest, same Wi-Fi required)

```bash
npx expo start
```

A QR code will appear in the terminal.

1. **iOS** — open the Camera app and scan the QR code
2. **Android** — open Expo Go, tap **Scan QR code**, and scan

The MobiVis app will open inside Expo Go.

---

### Option B — Native build via Xcode (recommended, no Wi-Fi dependency)

This installs MobiVis as a standalone app directly on your iPhone, removing the need for Expo Go or a shared network.

**Prerequisites:** Xcode installed, iPhone connected via USB.

**1. Install a modern Ruby** (the macOS system Ruby 2.6 is too old for CocoaPods):

```bash
brew install ruby
/opt/homebrew/opt/ruby/bin/gem install cocoapods --no-document
```

**2. Build the native project:**

```bash
cd mobivis/mobile
PATH="/opt/homebrew/lib/ruby/gems/4.0.0/bin:/opt/homebrew/opt/ruby/bin:$PATH" \
  node_modules/.bin/expo run:ios --device "Your iPhone Name"
```

The device name is shown in Xcode's device picker or in **Settings → General → About → Name** on your iPhone.

**3. First-time code signing setup:**

If Xcode reports a signing error, open the generated project:

```bash
open /Volumes/T9/workspace/mobivis/mobile/ios/MobiVis.xcworkspace
```

Then in Xcode:
1. Click the **MobiVis** root project in the left navigator
2. Select the **MobiVis** target under TARGETS
3. Go to **Signing & Capabilities**
4. Check **Automatically manage signing**
5. Under **Team**, pick your Apple ID (add one via **Xcode → Settings → Accounts → +** if needed)
6. Press **⌘R** to build and install

**4. Trust the developer certificate on your iPhone:**

Go to **Settings → General → VPN & Device Management**, find your Apple ID under Developer App, and tap **Trust**.

> **Note for Xcode 26 users:** The project Podfile already includes a fix for a `fmt` / `consteval` incompatibility introduced in Xcode 26's Clang compiler. No extra steps needed.

After the first build, subsequent runs are fast — Metro hot-reload works over USB without needing Wi-Fi.

---

## 3. Connect

1. On the **Connect** screen, enter the `ws://` URL printed by the server
2. Tap **Connect**
3. The URL is saved automatically for next time

You'll land on the **Feed** screen. Now edit and save any file inside the watched directory on your laptop — changes appear on your phone in real time.

---

## Usage

| Screen | What it does |
|---|---|
| **Feed** | Live stream of file changes. Tap any card to inspect the full diff. |
| **Diff** | Full diff viewer. Toggle between *Changed only* and *Full file*. Tap **Share** to export. |
| **Connect** | Change the server URL. |

---

## Watched file types

`ts tsx js jsx py go rs java kt swift rb php cs json yaml toml html css scss md sql` and more. Binary files and directories (`node_modules`, `.git`, `dist`, `.next`, `.expo`, `coverage`) are ignored.

---

## Troubleshooting

**"Cannot connect" on the phone**
- Confirm both devices are on the same Wi-Fi network
- Check the server is still running (`npm run dev` in `server/`)
- Try pasting the `ws://` URL into a browser on your phone — if it fails, the IP is wrong

**No changes appearing**
- Make sure you're editing files inside the directory passed to `npm run dev`
- Confirm the file extension is in the watched list above

**Expo Go shows a blank screen or crashes**
- Run `node_modules/.bin/expo install --check` inside `mobile/` to verify dependency versions
- Delete `mobile/node_modules` and re-run `npm install --legacy-peer-deps`

---

## Next steps

### Diff view — show only changed hunks, not the whole file

Currently the diff viewer sends every line of a file (unchanged lines included), which makes large files noisy and slow to scroll. The improvement is to collapse unchanged lines into a collapsed hunk indicator (e.g. `··· 42 unchanged lines ···`) and only expand them on tap — the same pattern used by GitHub's diff view. This keeps the signal-to-noise ratio high and makes it obvious at a glance what actually changed.

Work needed:
- Server: group consecutive unchanged lines into `hunk` objects before broadcasting, reducing payload size
- Mobile `DiffScreen`: render collapsed hunk rows between changed blocks, with a tap-to-expand interaction
- Mobile `ChangeCard`: the 4-line preview already filters to changed lines only — no change needed there

### Cross-network support — connect without shared Wi-Fi

Currently the phone and laptop must be on the same local network. To remove that constraint the WebSocket traffic needs to be tunnelled over the internet. Two options in order of simplicity:

**Option A — ngrok tunnel (zero infrastructure)**
Run `ngrok http 4747` alongside the server. ngrok prints a public `wss://` URL that works from anywhere. The server needs no changes; the mobile app just uses the ngrok URL instead of the local IP. Downside: free ngrok sessions expire after a few hours and have bandwidth limits.

**Option B — self-hosted relay server**
Deploy a small WebSocket relay (e.g. a Node process on Railway, Fly.io, or a VPS) that the laptop connects to as a publisher and the phone connects to as a subscriber. This gives a stable permanent URL with no session limits. The server and mobile `useWebSocket` hook both need a mode switch to talk to the relay instead of directly to each other.
