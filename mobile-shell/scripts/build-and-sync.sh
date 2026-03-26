#!/usr/bin/env bash
set -euo pipefail

# Repo root = parent of mobile-shell/
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

pnpm --filter frontend run build

cd "$REPO_ROOT/mobile-shell"
pnpm exec cap copy ios

echo "Done. Open Xcode with: pnpm exec cap open ios (from mobile-shell)"
echo "After adding Capacitor plugins or cloning fresh, run: cd ios/App && pod install && cd ../.. && pnpm exec cap sync ios"
