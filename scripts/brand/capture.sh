#!/usr/bin/env bash
set -euo pipefail
CHROME="${CHROME:-/opt/google/chrome/chrome}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HTML="file://${ROOT}/scripts/brand/capture.html"
OUT="${ROOT}/public"
FLAGS=(--headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1)

shot() {
  local page="$1" w="$2" h="$3" dest="$4"
  "${CHROME}" "${FLAGS[@]}" --window-size="${w},${h}" --screenshot="${dest}" "${HTML}?p=${page}"
}

shot og 1200 630 "${OUT}/og.png"
shot logo 1024 1024 "${OUT}/logo.png"
shot ico 512 512 "${OUT}/favicon.png"
echo "wrote ${OUT}/og.png ${OUT}/logo.png ${OUT}/favicon.png"
