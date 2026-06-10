#!/bin/bash
# SessionStart provisioning for Claude Code on the web (Chironium).
#
# Installs the mise-pinned toolchain (Erlang/Elixir/Node/pnpm) and project dependencies so the
# backend and frontend gates run: `mix compile|test|quality` and `pnpm --dir assets test|quality`.
# Idempotent and non-interactive. The FIRST run compiles Erlang/OTP and is slow; the web
# container caches the result, so subsequent sessions start fast.
set -euo pipefail

# Web sessions only — local dev already has its own toolchain.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOGFILE=/tmp/chironium-session-start.log
: > "$LOGFILE"
log() { echo "[session-start] $*" >&2; }
run() {
  local label="$1"; shift
  log "$label"
  if ! "$@" >>"$LOGFILE" 2>&1; then
    log "FAILED: $label — tail of $LOGFILE:"; tail -n 30 "$LOGFILE" >&2; exit 1
  fi
}

# Build dependencies for compiling Erlang/OTP (best-effort; skipped if apt/permissions absent).
if command -v apt-get >/dev/null 2>&1; then
  SUDO=""; { [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; } && SUDO="sudo"
  $SUDO apt-get update -y >>"$LOGFILE" 2>&1 || true
  $SUDO apt-get install -y build-essential autoconf m4 libncurses-dev libssl-dev unzip >>"$LOGFILE" 2>&1 || true
fi

# 1. Install mise (toolchain manager) if absent.
if [ ! -x "$HOME/.local/bin/mise" ] && ! command -v mise >/dev/null 2>&1; then
  run "installing mise" sh -c 'curl -fsSL https://mise.run | sh'
fi
export PATH="$HOME/.local/bin:$PATH"

# 2. Install the pinned toolchain (Erlang/Elixir/Node/pnpm) from mise.toml.
mise trust >>"$LOGFILE" 2>&1 || true
run "installing toolchain via mise (first run compiles Erlang/OTP; cached afterward)" mise install
export PATH="$HOME/.local/share/mise/shims:$PATH"

# Persist the toolchain on PATH for the rest of the session.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo 'export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"'
    echo 'eval "$(mise activate bash)" 2>/dev/null || true'
  } >> "$CLAUDE_ENV_FILE"
fi

# 3. Backend: Hex/Rebar + dependencies.
run "installing hex"   mix local.hex --force
run "installing rebar" mix local.rebar --force
run "fetching backend deps" mix deps.get

# 4. Frontend dependencies.
run "installing frontend deps" pnpm --dir assets install --frozen-lockfile

# 5. Database for `mix test` (best-effort — non-DB gates still work without it).
log "preparing database (best-effort)"
{ command -v pg_ctlcluster >/dev/null 2>&1 && pg_ctlcluster "$(ls /etc/postgresql 2>/dev/null | head -1)" main start; } >>"$LOGFILE" 2>&1 \
  || service postgresql start >>"$LOGFILE" 2>&1 || true
mix ash.setup --quiet >>"$LOGFILE" 2>&1 || log "DB setup skipped — start Postgres and run 'mix ash.setup' to enable 'mix test'."

log "provisioning complete."
