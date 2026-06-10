#!/usr/bin/env bash
# Project safety guard for Bash tool calls (wired as a PreToolUse hook for "Bash").
# Blocks a small, high-confidence set of catastrophic or policy-violating commands on this
# PHI repo. Exit 2 blocks the call and shows the reason to Claude; exit 0 allows it.
# This is a safety net, not a sandbox — keep patterns tight to avoid false positives.
set -u

input="$(cat)"

# Without jq we cannot reliably parse the tool input; fail open rather than block all Bash.
if ! command -v jq >/dev/null 2>&1; then
  echo "guard-bash: jq not found; skipping inspection." >&2
  exit 0
fi

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

block() { echo "Blocked by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }

# 1. Recursive force-delete (rm -rf / -fr / -r -f / --recursive --force) of a system or home root.
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]].*(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive|-r[[:space:]].*-f|-f[[:space:]].*-r)' \
  && printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])(/|/\*|~|\$HOME|/home|/etc|/usr|/var|/boot|/root)([[:space:]/*]|$)'; then
  block "recursive force-delete targeting a system or home root."
fi

# 2. Force-push to a protected branch.
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' \
  && printf '%s' "$cmd" | grep -Eq '(--force([[:space:]]|=|$)|(^|[[:space:]])-f([[:space:]]|$)|--force-with-lease)' \
  && printf '%s' "$cmd" | grep -Eq '(^|[[:space:]/:])(main|master)([[:space:]]|$)'; then
  block "force-push to a protected branch (main/master)."
fi

# 3. Bypassing commit/push quality gates.
if printf '%s' "$cmd" | grep -Eq -- '--no-verify'; then
  block "--no-verify bypasses commit/push quality gates."
fi

# 4. Piping a remote script straight into a shell (supply-chain risk).
if printf '%s' "$cmd" | grep -Eq '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(sh|bash|zsh)([[:space:]]|$)'; then
  block "piping a remote script directly into a shell."
fi

exit 0
