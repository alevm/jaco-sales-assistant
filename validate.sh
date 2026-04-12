#!/usr/bin/env bash
set -euo pipefail

echo "=== validate.sh: jaco-sales-assistant ==="

echo "[1/4] Type-check..."
npx tsc --noEmit

echo "[2/4] Lint..."
npm run lint

echo "[3/4] Test..."
npm test

echo "[4/4] Build..."
npm run build

echo "=== All checks passed ==="
