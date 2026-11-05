#!/usr/bin/env bash
# sec-sast — no ERROR-severity static-analysis findings (semgrep).
# Local machine without semgrep: SKIP-with-warning (recorded in GOAL.md; CI enforces fail-closed).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if ! command -v semgrep >/dev/null; then
  if [ "${CI:-}" = "true" ]; then
    echo "FAIL: semgrep missing in CI — fail-closed"; exit 2
  fi
  echo "SKIP-with-warning: semgrep not installed locally (enforced in CI)"; exit 0
fi

semgrep scan --quiet --metrics=off --error --severity ERROR --config p/default \
  --exclude node_modules --exclude ios --exclude android . \
  && echo "semgrep: no ERROR-severity findings"
