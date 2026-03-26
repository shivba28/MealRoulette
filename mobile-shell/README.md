# MealRoulette iOS shell (Capacitor)

This folder wraps the production web build from `../apps/frontend/dist` in a native Xcode project. The React app itself is unchanged; rebuild the frontend, then sync here.

To use the app **from any network** (not only your home Wi‑Fi), deploy **api-gateway** and point `VITE_GRAPHQL_URL` at your public `https://…` URL — see **[`DEPLOY.md`](../DEPLOY.md)** in the repo root.

## Prerequisites (on your Mac)

1. **Xcode** from the App Store (not only Command Line Tools). After install, point the active developer directory at Xcode:

   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

2. **CocoaPods** (for native dependencies):

   ```bash
   sudo gem install cocoapods
   ```

3. **Apple ID** — In Xcode → Settings → Accounts, add your Apple ID. For a personal device, use **Signing & Capabilities** → Team: **Personal Team**.

4. **API reachable from the phone** — Start `api-gateway` so your iPhone can reach it (same Wi‑Fi, server bound to all interfaces; Node’s default `listen(port)` is fine). The app must call **absolute** URLs (see below); relative `/graphql` does not work in the WebView.

## One-time: install pods

From the repo root, after dependencies are installed:

```bash
cd mobile-shell/ios/App && pod install && cd ../../..
```

If `cap add ios` never completed `pod install` on your machine, run the command above before opening Xcode.

## Configure API URLs (required on device)

Vite bakes env at **build** time. Set URLs that work from the phone (LAN IP, tunnel, or HTTPS host), then build the web app:

```bash
# Example: gateway on your Mac at 192.168.1.10:4000
export VITE_GRAPHQL_URL='http://192.168.1.10:4000/graphql'
# Optional, if you use analytics:
# export VITE_ANALYTICS_URL='http://192.168.1.10:4000/api/analytics/swipes'

pnpm --filter frontend run build
```

See [`env.example`](env.example). You can store values in `apps/frontend/.env.production.local` (gitignored) instead of exporting.

`Info.plist` enables **NSAllowsLocalNetworking** so HTTP to local IPs is allowed by App Transport Security.

## Refresh web assets into the iOS app

`cap copy ios` only updates the bundled web assets (no CocoaPods). Use this after most frontend changes.

From the repo root:

```bash
pnpm --filter mealroulette-mobile-shell run build:sync
```

Or use the script:

```bash
./mobile-shell/scripts/build-and-sync.sh
```

After you add or upgrade **Capacitor plugins**, or on a **fresh clone** before first Xcode open, run a full sync (requires Xcode + CocoaPods):

```bash
cd mobile-shell && pnpm exec cap sync ios
```

## Open in Xcode and run on device

```bash
cd mobile-shell && pnpm exec cap open ios
```

Open **`mobile-shell/ios/App/App.xcworkspace`** (not the `.xcodeproj` if you use CocoaPods). Select your iPhone, your Personal Team, then **Run**.

## Scripts (this package)

| Script        | What it does                                      |
| ------------- | ------------------------------------------------- |
| `build:web`   | `pnpm --filter frontend run build`                |
| `build:sync`  | Build web + `cap copy ios` (refresh www in app)   |
| `build:copy`  | Same as `build:sync`                              |
| `cap:copy`    | `cap copy ios` only (web already built)           |
| `cap:sync`    | Full `cap sync ios` (pods + plugins; needs Xcode) |
| `cap:open`    | Opens the iOS project in Xcode                    |

## Security note

Anything prefixed with `VITE_*` is embedded in the JS bundle. Do not put secrets you would not ship to a browser; prefer proxying through `api-gateway` when possible.
