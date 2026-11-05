#!/usr/bin/env bash
# GC-08 — no secrets in worktree, full git history, or export/bundle output.
# CANARY-FIRST: a scanner that cannot detect a planted key is itself RED (never silently green).
# Surfaces: (1) canary self-test, (2) git history, (3) worktree incl. untracked, (4) binary
# strings pass over export/content artifacts, (5) JWT payload decode — any committed JWT with
# role=service_role fails (the anon-role JWT is allowed by contract).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
CFG="evals/checks/gitleaks.toml"

command -v gitleaks >/dev/null || { echo "FAIL: gitleaks not installed (required for GC-08)"; exit 2; }

# --- 1) canary self-test ------------------------------------------------------
# The canary key is assembled from parts so this file itself never contains a
# string matching the secret patterns (a literal here would poison git history).
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
canary="sk-ant""-api03-CANARY0123456789012345678901234567890AA"
printf 'export const oops = "%s";\n' "$canary" > "$tmp/leak.ts"
gitleaks detect --no-git --source "$tmp" --config "$CFG" --no-banner --exit-code 7 >/dev/null 2>&1
rc=$?
if [ "$rc" -ne 7 ]; then
  echo "CANARY FAIL: planted sk-ant- key was NOT detected (rc=$rc) — scanner is broken, refusing green"
  exit 2
fi

# --- 2) full git history -------------------------------------------------------
if ! gitleaks detect --source . --config "$CFG" --no-banner --redact --exit-code 7 >"$tmp/hist.log" 2>&1; then
  echo "FAIL: secrets found in git history:"; tail -n 20 "$tmp/hist.log"; exit 1
fi

# --- 3) worktree: exactly the committable fileset (tracked + untracked-not-ignored)
# Scope to what git would actually commit — this respects .gitignore, so generated,
# never-committed native build dirs (ios/, android/, .expo/) don't produce false
# positives from their Apple code-signing manifests. A secret that CAN be committed is
# still caught here; the shippable export bundle is scanned separately in pass 4, and
# committed history in pass 2, so real coverage is unchanged.
stage="$tmp/worktree"; mkdir -p "$stage"
git ls-files -z --cached --others --exclude-standard \
  | rsync -0 -a --files-from=- --exclude='.git' . "$stage/" 2>/dev/null
if ! gitleaks detect --no-git --source "$stage" --config "$CFG" --no-banner --redact --exit-code 7 >"$tmp/tree.log" 2>&1; then
  echo "FAIL: secrets found in worktree (committable files):"
  # rewrite the temp path back to a repo-relative path in the report
  sed "s#$stage/##g" "$tmp/tree.log" | tail -n 20; exit 1
fi

# --- 4) binary strings pass over export/build artifacts -------------------------
# gitleaks skips binaries; grep -a does not. Covers content/dist/*.db, dist/, assets binaries.
for d in dist content/dist .expo-export; do
  [ -d "$d" ] || continue
  if grep -R -a -n -E 'sk-ant-[A-Za-z0-9_\-]{16,}|sb_secret_[A-Za-z0-9_\-]{16,}' "$d" 2>/dev/null | head -5 | grep -q .; then
    echo "FAIL: secret pattern found in binary/export artifact under $d"; exit 1
  fi
done

# --- 5) JWT payload decode: fail on any service_role JWT in the worktree --------
python3 - <<'PY'
import base64, json, os, re, sys

jwt_re = re.compile(rb'eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}')
skip_dirs = {".git", "node_modules", ".expo", "ios", "android", "Pods"}
bad = []
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for name in files:
        p = os.path.join(root, name)
        try:
            if os.path.getsize(p) > 5_000_000: continue
            with open(p, "rb") as f: data = f.read()
        except OSError:
            continue
        for m in jwt_re.finditer(data):
            payload = m.group(0).split(b".")[1]
            payload += b"=" * (-len(payload) % 4)
            try:
                claims = json.loads(base64.urlsafe_b64decode(payload))
            except Exception:
                continue
            if claims.get("role") == "service_role":
                bad.append(p)
if bad:
    print("FAIL: service_role JWT found in: " + ", ".join(sorted(set(bad))[:5]))
    sys.exit(1)
PY
[ $? -eq 0 ] || exit 1

echo "secret-scan clean (canary verified, history + worktree + artifacts + JWT-role decode)"
