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

Install dependencies using Expo's resolver (this ensures all packages match SDK 52):

```bash
cd mobivis/mobile
node_modules/.bin/expo install   # first time only — after npm install
```

Or from a fresh clone:

```bash
cd mobivis/mobile
npm install --legacy-peer-deps
```

### Start the app

```bash
npx expo start
```

A QR code will appear in the terminal.

1. **iOS** — open the Camera app and scan the QR code
2. **Android** — open Expo Go, tap **Scan QR code**, and scan

The MobiVis app will open on your phone.

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
