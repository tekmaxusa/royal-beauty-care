#!/usr/bin/env bash
set -euo pipefail

# Deploy helper for cPanel over SSH/rsync.
# Defaults (Royal Beauty Care on tekmaxhosting):
# - Frontend dist -> public_html/bookings/royalbeautycare
# - API tree      -> public_html/bookings/royalbeautycare/_api  (matches VITE_API_URL .../_api/public)
#
# Local api/.env is NEVER rsynced (excluded below). Configure production secrets only on the server.
#
# Optional: CPANEL_SSH_IDENTITY_FILE=/path/to/key (ed25519/rsa private key for non-interactive deploy)
#
# Usage examples:
#   CPANEL_SSH_HOST=example.com CPANEL_SSH_USER=myuser ./scripts/deploy-cpanel.sh frontend
#   CPANEL_SSH_HOST=example.com CPANEL_SSH_USER=myuser ./scripts/deploy-cpanel.sh api
#   CPANEL_SSH_HOST=example.com CPANEL_SSH_USER=myuser ./scripts/deploy-cpanel.sh all --build

TARGET="${1:-all}"
shift || true

DO_BUILD=0
DRY_RUN=0

while (($#)); do
  case "$1" in
    --build) DO_BUILD=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: deploy-cpanel.sh [frontend|api|all] [--build] [--dry-run]

Required env:
  CPANEL_SSH_HOST   SSH host
  CPANEL_SSH_USER   SSH user

Optional env:
  CPANEL_SSH_PORT           SSH port (default: 22)
  CPANEL_SSH_IDENTITY_FILE  Path to SSH private key (recommended; avoids password prompts)
  FRONTEND_REMOTE_PATH      Frontend destination (default: public_html/bookings/royalbeautycare)
  API_REMOTE_PATH           API destination (default: public_html/bookings/royalbeautycare/_api)
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

case "$TARGET" in
  frontend|api|all) ;;
  *)
    echo "Invalid target '$TARGET'. Use: frontend, api, or all." >&2
    exit 1
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Another project’s shell exports (e.g. FRONTEND_REMOTE_PATH for changehair) can otherwise override defaults below.
if [[ -z "${CHB_DEPLOY_INHERIT_REMOTE_PATHS:-}" ]]; then
  unset FRONTEND_REMOTE_PATH API_REMOTE_PATH
fi

if [[ -f "$ROOT_DIR/.cpanel-deploy.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.cpanel-deploy.env"
  set +a
fi

: "${CPANEL_SSH_HOST:?Set CPANEL_SSH_HOST}"
: "${CPANEL_SSH_USER:?Set CPANEL_SSH_USER}"

CPANEL_SSH_PORT="${CPANEL_SSH_PORT:-22}"
FRONTEND_REMOTE_PATH="${FRONTEND_REMOTE_PATH:-public_html/bookings/royalbeautycare}"
API_REMOTE_PATH="${API_REMOTE_PATH:-public_html/bookings/royalbeautycare/_api}"

if [[ "$DO_BUILD" -eq 1 ]] && [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  echo "==> Building frontend"
  npm run build
fi

if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  if [[ ! -d "$ROOT_DIR/dist" ]]; then
    echo "Missing dist/. Run 'npm run build' first or use --build." >&2
    exit 1
  fi
fi

# Build ssh/rsync transport (optional identity file for key-based auth)
SSH_EXTRA=()
if [[ -n "${CPANEL_SSH_IDENTITY_FILE:-}" ]]; then
  if [[ ! -f "$CPANEL_SSH_IDENTITY_FILE" ]]; then
    echo "CPANEL_SSH_IDENTITY_FILE not found: $CPANEL_SSH_IDENTITY_FILE" >&2
    exit 1
  fi
  SSH_EXTRA+=(-i "$CPANEL_SSH_IDENTITY_FILE" -o IdentitiesOnly=yes -o PreferredAuthentications=publickey)
fi
SSH_CMD=(ssh -p "$CPANEL_SSH_PORT" "${SSH_EXTRA[@]}")
if [[ -n "${CPANEL_SSH_IDENTITY_FILE:-}" ]]; then
  RSYNC_SSH=(-e "ssh -p ${CPANEL_SSH_PORT} -i ${CPANEL_SSH_IDENTITY_FILE} -o IdentitiesOnly=yes -o PreferredAuthentications=publickey")
else
  RSYNC_SSH=(-e "ssh -p ${CPANEL_SSH_PORT}")
fi
RSYNC_COMMON=(-az)
if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_COMMON+=(--dry-run)
fi

echo "==> Ensuring remote directories exist"
"${SSH_CMD[@]}" "${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}" \
  "mkdir -p '$FRONTEND_REMOTE_PATH' '$API_REMOTE_PATH'"

if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  echo "==> Syncing frontend dist/ -> ${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}:$FRONTEND_REMOTE_PATH/"
  rsync "${RSYNC_COMMON[@]}" "${RSYNC_SSH[@]}" \
    "$ROOT_DIR/dist/" "${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}:$FRONTEND_REMOTE_PATH/"
fi

if [[ "$TARGET" == "api" || "$TARGET" == "all" ]]; then
  echo "==> Syncing api/ -> ${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}:$API_REMOTE_PATH/"
  rsync "${RSYNC_COMMON[@]}" "${RSYNC_SSH[@]}" \
    --exclude "sql/" \
    --exclude ".env" \
    --exclude ".env.local" \
    --exclude ".env.*.local" \
    --exclude ".dockerignore" \
    "$ROOT_DIR/api/" "${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}:$API_REMOTE_PATH/"
fi

cat <<EOF
Done.

Frontend path: $FRONTEND_REMOTE_PATH
API path:      $API_REMOTE_PATH

Note:
- API webroot must point to: $API_REMOTE_PATH/public
- api/.env and common local env files are excluded from rsync; create or edit .env only on the server
EOF
