#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-4173}"
HOST="${HOST:-127.0.0.1}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_CLOUDFLARED="$ROOT_DIR/.tools/cloudflared"
USE_TUNNEL=0

for arg in "$@"; do
  case "$arg" in
    --tunnel)
      USE_TUNNEL=1
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./dev-preview.sh [--tunnel]" >&2
      exit 1
      ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found." >&2
  exit 1
fi

CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-}"
if [[ -z "$CLOUDFLARED_BIN" ]]; then
  if command -v cloudflared >/dev/null 2>&1; then
    CLOUDFLARED_BIN="$(command -v cloudflared)"
  elif [[ -x "$LOCAL_CLOUDFLARED" ]]; then
    CLOUDFLARED_BIN="$LOCAL_CLOUDFLARED"
  fi
fi

echo "Starting local preview for Game Vault"
echo "Project root: $ROOT_DIR"
echo "Local URL: http://$HOST:$PORT"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${TUNNEL_PID:-}" ]]; then
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
python3 -m http.server "$PORT" --bind "$HOST" >/tmp/game-vault-preview.log 2>&1 &
SERVER_PID=$!

sleep 1
if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  echo "Local server failed to start. Check /tmp/game-vault-preview.log" >&2
  exit 1
fi

echo "Local preview is running."
echo "Open on this Mac: http://localhost:$PORT"

if [[ "$USE_TUNNEL" -eq 1 ]]; then
  if [[ -z "${CLOUDFLARED_BIN:-}" ]]; then
    echo
    echo "Tunnel requested, but cloudflared is not installed."
    echo "Expected binary locations:"
    echo "  - on PATH as cloudflared"
    echo "  - $LOCAL_CLOUDFLARED"
    echo "Install it, then rerun: ./dev-preview.sh --tunnel"
    echo "Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    wait "$SERVER_PID"
    exit 0
  fi

  echo
  echo "Starting HTTPS tunnel for iPhone/PWA testing..."
  "$CLOUDFLARED_BIN" tunnel --protocol http2 --url "http://$HOST:$PORT" >/tmp/game-vault-tunnel.log 2>&1 &
  TUNNEL_PID=$!

  HTTPS_URL=""
  for _ in $(seq 1 20); do
    sleep 1
    if [[ -f /tmp/game-vault-tunnel.log ]]; then
      HTTPS_URL="$(grep -Eo 'https://[-a-zA-Z0-9.]+trycloudflare.com' /tmp/game-vault-tunnel.log | head -n 1 || true)"
      if [[ -n "$HTTPS_URL" ]]; then
        break
      fi
    fi
  done

  if [[ -n "$HTTPS_URL" ]]; then
    echo "HTTPS tunnel is ready:"
    echo "$HTTPS_URL"
    echo "Open that URL in Safari on your iPhone to test service worker and Add to Home Screen."
  else
    echo "Tunnel started, but the HTTPS URL was not detected yet."
    echo "Check /tmp/game-vault-tunnel.log for details."
  fi
fi

echo
echo "Press Ctrl+C to stop."
wait "$SERVER_PID"
