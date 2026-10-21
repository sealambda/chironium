#!/usr/bin/env bash
# Runs every Gate 1 check of task-cycle in order and prints one line per check. Full logs stay in
# tmp/checks/. A failing `mix test` is rerun once with --failed, so a flaky test is named instead
# of lost: tests that pass on the rerun print as FLAKY and don't fail the gate.
set -u
cd "$(git rev-parse --show-toplevel)"
mkdir -p tmp/checks
status=0

failed_tests() { grep -E '^\s+[0-9]+\) test ' "$1" || true; }
summary() { grep -E '[0-9]+ tests?, [0-9]+ failures?' "$1" | tail -1; }

run() {
  local name=$1
  shift
  if "$@" >"tmp/checks/$name.log" 2>&1; then
    echo "ok     $name"
  else
    echo "FAIL   $name (tmp/checks/$name.log)"
    tail -n 30 "tmp/checks/$name.log"
    status=1
  fi
}

run compile mix compile --warnings-as-errors

if mix test >tmp/checks/mix-test.log 2>&1; then
  echo "ok     mix-test: $(summary tmp/checks/mix-test.log)"
elif mix test --failed >tmp/checks/mix-test-rerun.log 2>&1; then
  echo "FLAKY  mix-test: $(summary tmp/checks/mix-test.log); these failed, then passed on rerun:"
  failed_tests tmp/checks/mix-test.log
else
  echo "FAIL   mix-test: $(summary tmp/checks/mix-test-rerun.log) (tmp/checks/mix-test-rerun.log)"
  failed_tests tmp/checks/mix-test-rerun.log
  status=1
fi

run assets-check pnpm assets:check
run assets-typecheck pnpm assets:typecheck
run assets-test pnpm assets:test
run messages-sync pnpm --filter chironium-assets messages:sync:check

exit $status
