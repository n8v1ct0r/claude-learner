#!/usr/bin/env bash
# sec-deps — no known-exploitable HIGH/CRITICAL dependency vulnerabilities.
# Primary: osv-scanner (parsed from a temp FILE — no pipe, so no SIGPIPE/broken-pipe).
# Fallback: npm audit --audit-level=high. If osv yields no parseable JSON we FALL BACK to
# npm audit rather than passing silently (never fail-open on a security gate).
# Severity gating uses the ecosystem HIGH/CRITICAL label (matches npm audit), not raw CVSS —
# a moderate advisory with a CVSS in the 7.x band does not block.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

[ -f package.json ] || { echo "no dependencies yet (no package.json) — vacuously clean"; exit 0; }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

npm_audit_gate() {
  npm audit --json > "$tmp/audit.json" 2>/dev/null || true
  python3 - "$tmp/audit.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("FAIL: npm audit produced no parseable output (cannot verify dependencies)")
    sys.exit(1)  # unverifiable = RED, never fail-open
m = (d.get("metadata") or {}).get("vulnerabilities") or {}
high, crit = int(m.get("high", 0)), int(m.get("critical", 0))
if high or crit:
    print(f"FAIL: npm audit found {crit} critical, {high} high advisories:")
    for name, info in (d.get("vulnerabilities") or {}).items():
        if info.get("severity") in ("high", "critical"):
            print(f"  {name}: {info.get('severity')}")
    sys.exit(1)
print(f"npm audit: 0 high/critical ({m.get('moderate',0)} moderate, {m.get('low',0)} low)")
sys.exit(0)
PY
}

# --- Primary: osv-scanner (parse from file) -----------------------------------
if command -v osv-scanner >/dev/null && [ -f package-lock.json ]; then
  osv-scanner scan source --lockfile package-lock.json --format json > "$tmp/osv.json" 2>/dev/null
  osv_rc=$?
  # osv exit: 0 = no vulns, 1 = vulns found, anything else = scanner error.
  if [ "$osv_rc" -le 1 ] && python3 -c "import json,sys; json.load(open('$tmp/osv.json'))" 2>/dev/null; then
    python3 - "$tmp/osv.json" evals/deps-allowlist.json <<'PY'
import datetime, json, os, sys
d = json.load(open(sys.argv[1]))
# Owner-approved exceptions (see evals/deps-allowlist.json and .engineering/DECISIONS.md).
# An exception covers one advisory ID in one package and lapses on its expiry date.
today = datetime.date.today().isoformat()
allowed = {}
if os.path.exists(sys.argv[2]):
    for e in json.load(open(sys.argv[2])).get("exceptions", []):
        if e.get("expires", "") >= today:
            allowed[(e["package"], e["id"])] = e["expires"]
bad, excused = [], []
for res in d.get("results", []):
    for pkg in res.get("packages", []):
        name = pkg.get("package", {}).get("name", "?")
        for v in pkg.get("vulnerabilities", []):
            label = ((v.get("database_specific") or {}).get("severity") or "").upper()
            if label in ("HIGH", "CRITICAL"):
                if (name, v.get("id")) in allowed:
                    excused.append(f"{name}: {v.get('id')} ({label}, excused until {allowed[(name, v.get('id'))]})")
                else:
                    bad.append(f"{name}: {v.get('id')} ({label})")
for line in sorted(set(excused)):
    print(f"allowlisted: {line}")
if bad:
    print(f"FAIL high/critical (osv-scanner, ecosystem severity): {len(set(bad))}")
    print("\n".join(sorted(set(bad))))
    sys.exit(1)
print("osv-scanner: no unexcused high/critical findings (ecosystem severity labels)")
PY
    exit $?
  fi
  echo "osv-scanner unavailable/unparseable (rc=$osv_rc) — falling back to npm audit"
fi

# --- Fallback: npm audit ------------------------------------------------------
npm_audit_gate
exit $?
