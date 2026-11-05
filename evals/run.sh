#!/usr/bin/env bash
# evals/run.sh — thin dispatcher over the goal contract (.engineering/GOAL.md criteria).
# The ONLY writer of evals.json (Iron Law 2). A missing script/tool is a RED verdict with a
# note, never a silent skip (fail-closed). Checks land in the same milestone as their features.
#
# Usage:
#   evals/run.sh          # full contract: exit 0 only when every hard criterion is green
#   evals/run.sh --gate   # milestone gate: exit per the 'enforced' list in evals/thresholds.json
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

MODE=full
[ "${1:-}" = "--gate" ] && MODE=gate

RESULTS="$(mktemp)"
trap 'rm -f "$RESULTS"' EXIT

# --- helpers -----------------------------------------------------------------

# npm script runner: RED (rc 9) when the script does not exist yet — never a fake green
npms() {
  local script="$1"; shift
  [ -f package.json ] || { echo "not implemented: no package.json yet"; return 9; }
  node -e "const s=(require('./package.json').scripts||{})['$script'];process.exit(s?0:9)" 2>/dev/null \
    || { echo "not implemented: npm script '$script' missing"; return 9; }
  npm run --silent "$script" -- "$@"
}

# jest pattern runner: RED when jest is not installed yet
jestp() {
  [ -f package.json ] || { echo "not implemented: no package.json yet"; return 9; }
  [ -e node_modules/.bin/jest ] || { echo "not implemented: jest not installed"; return 9; }
  npx --no-install jest --testPathPattern "$1"
}
export -f npms jestp

# run_criterion <id> <type> <hard> <command string>
run_criterion() {
  local id="$1" type="$2" hard="$3" cmd="$4"
  local out rc note
  out="$(bash -c "$cmd" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then
    note="$(printf '%s' "$out" | tail -n 1 | tr '\t' ' ' | cut -c1-200)"
    printf '%s\t%s\t%s\tgreen\t%s\n' "$id" "$type" "$hard" "${note:-ok}" >> "$RESULTS"
    printf '  GREEN  %s\n' "$id"
  else
    note="$(printf '%s' "$out" | tail -n 3 | tr '\n\t' '  ' | cut -c1-220)"
    printf '%s\t%s\t%s\tred\t%s\n' "$id" "$type" "$hard" "${note:-failed rc=$rc}" >> "$RESULTS"
    printf '  RED    %s - %s\n' "$id" "$(printf '%s' "$note" | cut -c1-120)"
  fi
}

echo "evals/run.sh — mode: $MODE — $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# --- the contract ------------------------------------------------------------

run_criterion GC-01 code     yes 'npms content:validate'
run_criterion GC-02 code     yes 'npms content:stats --check'
run_criterion GC-03 e2e      yes 'jestp lesson-flow'
run_criterion GC-04 code     yes 'jestp engine'
run_criterion GC-05 e2e      yes 'jestp mock-exam'
run_criterion GC-06 e2e      yes 'npms test:sync'
run_criterion GC-07 security yes 'npms test:rls'
run_criterion GC-08 security yes 'bash evals/checks/secret-scan.sh'
run_criterion GC-09 security yes 'npms test:functions'
run_criterion GC-10 code     yes 'npms test:a11y && node evals/checks/contrast.mjs'
run_criterion GC-11 code     yes 'npms typecheck && npms lint'
run_criterion GC-12 e2e      yes 'npms test:auth'
run_criterion GC-13 code     yes 'node evals/checks/copy-lint.mjs && jestp notifications'
run_criterion GC-14 e2e      yes 'bash evals/checks/manual-status.sh GC-14'
run_criterion GC-15 e2e      yes 'jestp feynman-loop'
run_criterion sec-deps security yes 'bash evals/checks/deps-audit.sh'
run_criterion sec-sast security yes 'bash evals/checks/sast.sh'

# --- write evals.json + exit code ---------------------------------------------

GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
export MODE GIT_SHA
python3 - "$RESULTS" <<'PY'
import json, os, sys, datetime

rows = []
with open(sys.argv[1]) as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) >= 5:
            rows.append({"id": parts[0], "type": parts[1], "hard": parts[2] == "yes",
                         "status": parts[3], "measured": None, "threshold": "see GOAL.md",
                         "notes": parts[4]})

doc = {
    "project": "CCA Quest",
    "last_run": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "git_sha": os.environ.get("GIT_SHA", "unknown"),
    "written_by": "evals/run.sh ONLY — hand edits violate Iron Law 2",
    "mode": os.environ.get("MODE", "full"),
    "criteria": rows,
}
with open("evals.json", "w") as f:
    json.dump(doc, f, indent=2); f.write("\n")

green = sum(1 for r in rows if r["status"] == "green")
total = len(rows)
print(f"\n== {green}/{total} criteria green ==")

# keep .engineering/state.json's eval counters current for the status line
sf = ".engineering/state.json"
if os.path.exists(sf):
    try:
        s = json.load(open(sf))
        s["evals_green"], s["evals_total"] = green, total
        s["updated"] = doc["last_run"]
        json.dump(s, open(sf, "w"), indent=2); open(sf, "a").write("\n")
    except Exception as e:
        print(f"(state.json not updated: {e})")

mode = os.environ.get("MODE", "full")
if mode == "gate":
    try:
        enforced = set(json.load(open("evals/thresholds.json")).get("enforced", []))
    except Exception:
        enforced = set()
    red_enforced = [r["id"] for r in rows if r["id"] in enforced and r["status"] != "green"]
    if red_enforced:
        print(f"GATE RED: enforced criteria failing: {', '.join(red_enforced)}")
        sys.exit(1)
    print(f"GATE GREEN: all {len(enforced)} enforced criteria pass (ratchet: evals/thresholds.json)")
    sys.exit(0)
else:
    red_hard = [r["id"] for r in rows if r["hard"] and r["status"] != "green"]
    if red_hard:
        print(f"CONTRACT RED: {', '.join(red_hard)}")
        sys.exit(1)
    print("CONTRACT GREEN: every hard criterion passes")
    sys.exit(0)
PY
