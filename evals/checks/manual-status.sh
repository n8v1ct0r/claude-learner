#!/usr/bin/env bash
# Manual criterion status reader (e.g. GC-14 device verification).
# evals/manual/<ID>.status format: first word green|red, remainder is the note.
# Only a human-executed checklist (docs/device-verification.md) may flip these to green.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
f="evals/manual/$1.status"
[ -f "$f" ] || { echo "manual check $1: no status recorded yet"; exit 1; }
read -r verdict note < "$f" || true
if [ "${verdict:-}" = "green" ]; then
  echo "${note:-manual check passed}"; exit 0
fi
echo "${note:-manual check not passed}"; exit 1
