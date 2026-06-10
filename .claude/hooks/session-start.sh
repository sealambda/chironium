#!/bin/bash
# SessionStart provisioning for Claude Code on the web (Chironium).
#
# Installs the mise-pinned toolchain (Erlang/Elixir/Node/pnpm) and project dependencies so the
# backend and frontend gates run: `mix compile|test|quality` and `pnpm --dir assets test|quality`.
# Idempotent and non-interactive. The FIRST run compiles Erlang/OTP and is slow; the web
# container caches the result, so subsequent sessions start fast.
#
# NETWORK POLICY — this hook needs outbound access to (allowlist these in the environment's
# network policy if it is restrictive; configured when the environment is created):
#   - mise.run            toolchain installer (falls back to github.com release assets if blocked)
#   - github.com, codeload.github.com, objects.githubusercontent.com   Erlang/Elixir sources
#   - builds.hex.pm, repo.hex.pm   Elixir packages — REQUIRED for `mix deps.get`
#   - nodejs.org           Node runtime;   registry.npmjs.org   pnpm packages
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
reachable() { curl -fsS -o /dev/null --max-time 8 "$1" >/dev/null 2>&1; }

# Preflight: surface a clear message if the network policy blocks a required registry.
reachable https://repo.hex.pm/installs/ || \
  log "WARNING: hex.pm appears blocked by the network policy; 'mix deps.get' will fail until repo.hex.pm and builds.hex.pm are allowed."

# Build dependencies for compiling Erlang/OTP (best-effort; skipped if apt/permissions absent).
if command -v apt-get >/dev/null 2>&1; then
  SUDO=""; { [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; } && SUDO="sudo"
  $SUDO apt-get update -y >>"$LOGFILE" 2>&1 || true
  $SUDO apt-get install -y build-essential autoconf m4 libncurses-dev libssl-dev unzip >>"$LOGFILE" 2>&1 || true
fi

# Install mise from a GitHub release (used when mise.run is blocked but github.com is reachable).
install_mise_from_github() {
  local os arch tag asset bin
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$(uname -m)" in x86_64|amd64) arch=x64;; aarch64|arm64) arch=arm64;; *) arch="$(uname -m)";; esac
  tag="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/jdx/mise/releases/latest 2>/dev/null | sed 's#.*/tag/##')"
  [ -n "$tag" ] || return 1
  asset="mise-${tag}-${os}-${arch}.tar.gz"
  mkdir -p "$HOME/.local/bin" /tmp/mise-dl
  curl -fsSL "https://github.com/jdx/mise/releases/download/${tag}/${asset}" -o /tmp/mise-dl/mise.tgz 2>>"$LOGFILE" || return 1
  tar -xzf /tmp/mise-dl/mise.tgz -C /tmp/mise-dl 2>>"$LOGFILE" || return 1
  bin="$(find /tmp/mise-dl -name mise -type f | head -1)"
  [ -n "$bin" ] && install -m 0755 "$bin" "$HOME/.local/bin/mise"
}

# 1. Install mise if absent (official installer, then GitHub fallback). No pipe-masking of failures.
if [ ! -x "$HOME/.local/bin/mise" ] && ! command -v mise >/dev/null 2>&1; then
  log "installing mise"
  if curl -fsSL https://mise.run -o /tmp/mise-install.sh 2>>"$LOGFILE"; then
    sh /tmp/mise-install.sh >>"$LOGFILE" 2>&1 || true
  fi
  if [ ! -x "$HOME/.local/bin/mise" ] && ! command -v mise >/dev/null 2>&1; then
    log "mise.run unavailable; trying GitHub release"
    install_mise_from_github || true
  fi
fi
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"
if ! command -v mise >/dev/null 2>&1; then
  log "FAILED: could not install mise. Allow https://mise.run (or github.com release assets) in the network policy."
  exit 1
fi

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

# 3. Backend: Hex/Rebar + dependencies (requires hex.pm).
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
