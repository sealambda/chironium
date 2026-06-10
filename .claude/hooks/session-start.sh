#!/bin/bash
# SessionStart provisioning for Claude Code on the web (Chironium).
#
# Installs the mise-pinned toolchain (Erlang/Elixir/Node/pnpm) and project dependencies, then
# prepares the database, so the backend and frontend gates run: `mix compile|test|quality` and
# `pnpm --dir assets test|quality`. Idempotent and non-interactive. The FIRST run compiles
# Erlang/OTP and installs PostgreSQL 18 (slow); the web container caches both, so later sessions
# start fast.
#
# TLS interception: the Claude Code web sandbox routes egress through a gateway whose CA lives in
# the OS trust store (/etc/ssl/certs/ca-certificates.crt) but NOT in the private CA bundles that
# Hex and ex_cldr ship. We point both at the OS bundle (Hex cacerts_path + CLDR_CACERTFILE), else
# `mix deps.get` and the compile-time CLDR locale download fail with TLS "unknown CA".
#
# NETWORK POLICY — this hook needs outbound access to (allowlist these if the policy is restrictive):
#   - mise.run                toolchain installer (falls back to github.com release assets if blocked)
#   - github.com, codeload.github.com, objects.githubusercontent.com   Erlang/Elixir/CLDR sources
#   - repo.hex.pm, builds.hex.pm        Elixir packages — REQUIRED for `mix deps.get`
#   - nodejs.org, registry.npmjs.org    Node runtime + pnpm packages
#   - apt.postgresql.org                PostgreSQL 18 + pgvector (PGDG apt repo)
set -euo pipefail

# Web sessions only — local dev already has its own toolchain and database.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOGFILE=/tmp/chironium-session-start.log
: > "$LOGFILE"
log() { echo "[session-start] $*" >&2; }
# Strict step: abort the hook on failure (critical path).
run() {
  local label="$1"; shift
  log "$label"
  if ! "$@" >>"$LOGFILE" 2>&1; then
    log "FAILED: $label — tail of $LOGFILE:"; tail -n 30 "$LOGFILE" >&2; exit 1
  fi
}
# Best-effort step: log and continue on failure (non-critical; a gate may degrade).
try() {
  local label="$1"; shift
  log "$label"
  "$@" >>"$LOGFILE" 2>&1 || log "WARN: $label failed — see $LOGFILE (continuing)"
}
reachable() { curl -fsS -o /dev/null --max-time 8 "$1" >/dev/null 2>&1; }

CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
SUDO=""; { [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; } && SUDO="sudo"
as_postgres() { if [ "$(id -u)" -eq 0 ]; then runuser -u postgres -- "$@"; else $SUDO -u postgres "$@"; fi; }

# A UTF-8 locale is required for PostgreSQL initdb (otherwise the cluster defaults to SQL_ASCII and
# `ecto.create` fails with an encoding mismatch) and silences Elixir's latin1 name-encoding warning.
# C.UTF-8 is always available in glibc.
export LANG="${LANG:-C.UTF-8}" LC_ALL="${LC_ALL:-C.UTF-8}"

# Trust the OS CA bundle (which includes the sandbox egress gateway CA) for tools that otherwise
# ship their own private CA store and would reject the intercepting certificate.
[ -f "$CA_BUNDLE" ] && export HEX_CACERTS_PATH="$CA_BUNDLE" CLDR_CACERTFILE="$CA_BUNDLE"

# Preflight: backend provisioning needs Hex. If it's blocked, skip fast with guidance rather than
# spend ~20 min compiling Erlang/OTP only to fail at `mix deps.get`.
if ! reachable https://repo.hex.pm/; then
  log "Hex (repo.hex.pm) is blocked by this environment's network policy — skipping provisioning."
  log "Allowlist repo.hex.pm + builds.hex.pm (and mise.run, github.com, nodejs.org, registry.npmjs.org,"
  log "apt.postgresql.org) in the environment's network policy, then start a new session. See .claude/README.md."
  exit 0
fi

# Build dependencies for compiling Erlang/OTP (best-effort; skipped if apt/permissions absent).
if command -v apt-get >/dev/null 2>&1; then
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

# Persist PATH, locale, and CA overrides for the rest of the session's shells.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo 'export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"'
    echo 'eval "$(mise activate bash)" 2>/dev/null || true'
    echo "export LANG=$LANG LC_ALL=$LC_ALL"
    [ -f "$CA_BUNDLE" ] && echo "export HEX_CACERTS_PATH=$CA_BUNDLE CLDR_CACERTFILE=$CA_BUNDLE"
  } >> "$CLAUDE_ENV_FILE"
fi

# 3. Backend: Hex/Rebar + dependencies. Point Hex at the OS CA bundle so it trusts the egress proxy.
run "installing hex"   mix local.hex --force
run "installing rebar" mix local.rebar --force
[ -f "$CA_BUNDLE" ] && try "configuring Hex CA (cacerts_path)" mix hex.config cacerts_path "$CA_BUNDLE"
run "fetching backend deps" mix deps.get

# 4. Dummy dev/test secrets so runtime.exs (Dotenvy) can boot for `mix test`/`ash.setup`. Mirrors
#    CI's dummy Google OAuth creds. envs/.env is gitignored — never put real secrets here.
if [ ! -f envs/.env ]; then
  log "writing envs/.env (dummy dev secrets)"
  mkdir -p envs
  cat > envs/.env <<'ENVEOF'
# Auto-generated by .claude/hooks/session-start.sh for web sessions (gitignored).
GOOGLE_CLIENT_ID=ci-dummy-google-client-id
GOOGLE_CLIENT_SECRET=ci-dummy-google-client-secret
ENVEOF
fi

# 5. Compile the backend (warms _build; CLDR locale data downloads here via the CA configured above).
try "compiling backend" mix compile

# 6. Database for `mix test` (best-effort — non-DB gates still work without it). The app requires
#    PostgreSQL 18 (native uuidv7()) + pgvector; the base image often ships only PG16.
ensure_postgres() {
  command -v pg_lsclusters >/dev/null 2>&1 || { log "postgres tooling absent — skipping DB setup"; return 0; }
  if ! ls -d /usr/lib/postgresql/18 >/dev/null 2>&1; then
    log "installing PostgreSQL 18 + pgvector (PGDG)"
    $SUDO apt-get install -y postgresql-common >>"$LOGFILE" 2>&1 || true
    $SUDO /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >>"$LOGFILE" 2>&1 || true
    $SUDO apt-get update >>"$LOGFILE" 2>&1 || true
    $SUDO apt-get install -y postgresql-18 postgresql-18-pgvector >>"$LOGFILE" 2>&1 || true
  fi
  # Run a UTF-8 PG18 cluster on 5432 (free it from PG16 if needed). UTF-8 avoids a SQL_ASCII
  # template that would break `ecto.create`.
  if ! pg_lsclusters -h 2>/dev/null | grep -qE '^18[[:space:]]+main[[:space:]]+5432[[:space:]]+online'; then
    $SUDO pg_dropcluster --stop 16 main >>"$LOGFILE" 2>&1 || true
    $SUDO pg_dropcluster --stop 18 main >>"$LOGFILE" 2>&1 || true
    $SUDO pg_createcluster -p 5432 --locale C.UTF-8 -e UTF8 --start 18 main -- --auth-local=peer --auth-host=scram-sha-256 >>"$LOGFILE" 2>&1 || true
  fi
  # config/{dev,test}.exs connect over TCP as postgres/postgres.
  as_postgres psql -p 5432 -c "ALTER USER postgres PASSWORD 'postgres';" >>"$LOGFILE" 2>&1 || true
}
try "preparing PostgreSQL 18 + pgvector" ensure_postgres
try "database setup (ash.setup)" mix ash.setup --quiet

# 7. Frontend: dependencies + generated sources (gql.tada types, paraglide messages) the tests need.
run "installing frontend deps" pnpm --dir assets install --frozen-lockfile
try "frontend gql codegen" pnpm --dir assets gql:generate
try "frontend paraglide compile" pnpm --dir assets exec paraglide-js compile --emit-ts-declarations --strategy cookie preferredLanguage baseLocale

log "provisioning complete."
